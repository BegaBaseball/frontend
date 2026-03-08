import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cancelVote, submitVote } from '../api/prediction';
import { useAuthStore } from '../store/authStore';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { getFullTeamName } from '../constants/teams';
import { parseError } from '../utils/errorUtils';
import {
  PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS,
  PREDICTION_RUN_SESSION_STORAGE_KEY,
  canSchedulePredictionRetry,
  createPredictionRetryAttemptState,
  getPredictionRetryDelayMs,
  increasePredictionRetryAttempt,
  isPredictionRunSessionStale,
  parsePredictionRunSession,
  resetPredictionRetryAttempt,
  type PredictionRetryActionKey,
  type PredictionRunAction,
  type PredictionRunSessionV1,
  type PredictionRunTimeoutStage,
} from '../utils/predictionRecovery';
import type { Game, VoteTeam } from '../types/prediction';
import {
  PREDICTION_OFFLINE_TOAST_MESSAGE,
  PREDICTION_RUN_FATAL_TIMEOUT_MS,
  PREDICTION_RUN_WARNING_TIMEOUT_MS,
  getPredictionCopyKey,
  isCancelLikeError,
  mapPredictionErrorCode,
  type LoadVoteStatusOptions,
  type PredictionFlowEmitter,
  type PredictionOverlayController,
  type RunSessionRestoreTrigger,
  type UserVoteRecord,
} from './predictionHookShared';

type UsePredictionVoteFlowParams = {
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  currentGameId: string | null;
  userVote: UserVoteRecord;
  setUserVote: React.Dispatch<React.SetStateAction<UserVoteRecord>>;
  loadVoteStatus: (gameId: string, options?: LoadVoteStatusOptions) => Promise<boolean>;
  reloadVoteStatus: (gameId: string, options?: LoadVoteStatusOptions) => Promise<boolean>;
  emitFlowEvent: PredictionFlowEmitter;
  showPredictionErrorOverlay: PredictionOverlayController['showPredictionErrorOverlay'];
  confirm: (options: { title: string; description?: string }) => Promise<boolean>;
};

const isOfflineNow = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return navigator.onLine === false;
};

const waitForRetryDelay = (ms: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const usePredictionVoteFlow = ({
  isAuthLoading,
  isLoggedIn,
  currentGameId,
  userVote,
  setUserVote,
  loadVoteStatus,
  reloadVoteStatus,
  emitFlowEvent,
  showPredictionErrorOverlay,
  confirm,
}: UsePredictionVoteFlowParams) => {
  const [isRunInProgress, setIsRunInProgress] = useState(false);
  const [isRunBannerDismissed, setIsRunBannerDismissed] = useState(false);
  const [runProgressMessage, setRunProgressMessage] = useState('예측을 준비 중입니다.');
  const [runStartAt, setRunStartAt] = useState<number | null>(null);

  const flowRunCounterRef = useRef(0);
  const runInProgressRef = useRef(false);
  const runTimeoutStageRef = useRef<PredictionRunTimeoutStage>('none');
  const runSessionRef = useRef<PredictionRunSessionV1 | null>(null);
  const runSessionRestoreInFlightRef = useRef(false);
  const retryAttemptRef = useRef(createPredictionRetryAttemptState());
  const offlineToastShownRef = useRef<Record<PredictionRetryActionKey, boolean>>({
    submitVote: false,
    cancelVote: false,
    voteStatus: false,
  });

  const resetNetworkRetryAttempt = useCallback((actionKey: PredictionRetryActionKey) => {
    resetPredictionRetryAttempt(retryAttemptRef.current, actionKey);
    offlineToastShownRef.current[actionKey] = false;
  }, []);

  const showOfflineToastOnce = useCallback((actionKey: PredictionRetryActionKey) => {
    if (offlineToastShownRef.current[actionKey]) {
      return;
    }
    offlineToastShownRef.current[actionKey] = true;
    toast.error(PREDICTION_OFFLINE_TOAST_MESSAGE);
  }, []);

  const nextNetworkRetryAttempt = useCallback((actionKey: PredictionRetryActionKey) => {
    return increasePredictionRetryAttempt(retryAttemptRef.current, actionKey);
  }, []);

  const upsertRunSession = useCallback((session: PredictionRunSessionV1 | null) => {
    runSessionRef.current = session;

    if (typeof window === 'undefined') {
      return;
    }

    if (!session) {
      window.sessionStorage.removeItem(PREDICTION_RUN_SESSION_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(PREDICTION_RUN_SESSION_STORAGE_KEY, JSON.stringify(session));
  }, []);

  const patchRunSession = useCallback((patch: Partial<PredictionRunSessionV1>) => {
    const current = runSessionRef.current;
    if (!current) {
      return;
    }

    upsertRunSession({
      ...current,
      ...patch,
    });
  }, [upsertRunSession]);

  const clearRunSession = useCallback(() => {
    upsertRunSession(null);
  }, [upsertRunSession]);

  const setRunTimeoutStage = useCallback((stage: PredictionRunTimeoutStage) => {
    runTimeoutStageRef.current = stage;
    patchRunSession({ timeoutStage: stage });
  }, [patchRunSession]);

  const getRunProgressMessageByStage = useCallback((stage: PredictionRunTimeoutStage) => {
    if (stage === 'warning') {
      return '예측 처리 지연: 백그라운드로 전환해 계속 진행합니다.';
    }
    if (stage === 'fatal') {
      return '예측 응답이 오래 지연돼 복구 액션을 제공합니다.';
    }
    return '예측 처리 결과를 동기화하는 중입니다.';
  }, []);

  const getRunElapsedMs = useCallback(() => {
    if (!runStartAt) {
      return undefined;
    }
    return Date.now() - runStartAt;
  }, [runStartAt]);

  const resetRunProgressState = useCallback(() => {
    runInProgressRef.current = false;
    runTimeoutStageRef.current = 'none';
    setIsRunInProgress(false);
    setRunStartAt(null);
    setIsRunBannerDismissed(false);
    clearRunSession();
  }, [clearRunSession]);

  const getNextFlowId = useCallback((gameId: string, action: 'vote' | 'cancel') => {
    const next = ++flowRunCounterRef.current;
    return `${gameId}-${action}-${next}`;
  }, []);

  const beginRunSession = useCallback((params: {
    flowId: string;
    gameId: string;
    action: PredictionRunAction;
    startedAt: number;
    team?: 'home' | 'away';
  }) => {
    runTimeoutStageRef.current = 'none';
    upsertRunSession({
      flowId: params.flowId,
      gameId: params.gameId,
      action: params.action,
      startedAt: params.startedAt,
      team: params.team,
      bannerDismissed: isRunBannerDismissed,
      timeoutStage: 'none',
    });
  }, [isRunBannerDismissed, upsertRunSession]);

  const emitRunProgressBannerAction = useCallback((action: 'bg' | 'foreground') => {
    if (!isRunInProgress || !currentGameId) {
      return;
    }

    emitFlowEvent('onRunProgress', 'RUNNING', {
      gameId: currentGameId,
      stage: 'RUN_POLL',
      keepDraft: true,
      copyKey: 'run_timeout',
      toastKey: action === 'bg' ? 'run_timeout' : 'run_started',
      runProgressBannerAction: action,
      meta: {
        action,
      },
    });
  }, [currentGameId, emitFlowEvent, isRunInProgress]);

  const dismissRunProgressBanner = useCallback(() => {
    setIsRunBannerDismissed(true);
    patchRunSession({ bannerDismissed: true });
    emitRunProgressBannerAction('bg');
  }, [emitRunProgressBannerAction, patchRunSession]);

  const resumeRunProgressBanner = useCallback(() => {
    setIsRunBannerDismissed(false);
    patchRunSession({ bannerDismissed: false });
    emitRunProgressBannerAction('foreground');
  }, [emitRunProgressBannerAction, patchRunSession]);

  const executeVote = useCallback(async (gameId: string, team: VoteTeam, game: Game) => {
    if (runInProgressRef.current) {
      emitFlowEvent('onRunCancel', 'RUNNING', {
        gameId,
        stage: 'RUN_SUBMIT',
        recoverable: false,
        retryable: false,
        copyKey: 'run_timeout',
        toastKey: 'run_retry_started',
        recoveryAction: 'GO_BACK',
      });
      toast.info('현재 예측 요청이 진행 중입니다.');
      return;
    }

    const flowId = getNextFlowId(gameId, 'vote');
    const startedAt = Date.now();
    setRunStartAt(startedAt);
    runInProgressRef.current = true;
    setIsRunInProgress(true);
    setIsRunBannerDismissed(false);
    setRunProgressMessage('투표(예측) 요청을 전송하는 중입니다.');
    beginRunSession({
      flowId,
      gameId,
      action: 'vote',
      startedAt,
      team,
    });
    emitFlowEvent('onRunStart', 'RUNNING', {
      gameId,
      flowId,
      stage: 'RUN_SUBMIT',
      recoverable: true,
      toastKey: 'run_started',
      meta: {
        team,
      },
    });

    let didTimeout = false;
    let didTimeoutFatal = false;
    const warningTimeoutId = setTimeout(() => {
      if (!runInProgressRef.current) {
        return;
      }
      didTimeout = true;
      setRunTimeoutStage('warning');
      setRunProgressMessage(getRunProgressMessageByStage('warning'));
      emitFlowEvent('onRunTimeout', 'RUNNING', {
        gameId,
        flowId,
        errorCode: 'TIMEOUT',
        recoverable: true,
        toastKey: 'run_timeout',
        copyKey: 'timeout_hint',
        stage: 'RUN_TIMEOUT',
        elapsedMs: getRunElapsedMs(),
        recoveryAction: 'FALLBACK_SIMPLE',
        retryConfig: {
          errorCode: 'TIMEOUT',
          recoverable: true,
          retryEnabled: true,
          keepDraft: true,
          actionPriorityOrder: ['FALLBACK_SIMPLE', 'GO_LIST'],
        },
        meta: {
          timeoutStage: 'warning',
        },
      });
    }, PREDICTION_RUN_WARNING_TIMEOUT_MS);

    const fatalTimeoutId = setTimeout(() => {
      if (!runInProgressRef.current || didTimeoutFatal) {
        return;
      }
      didTimeoutFatal = true;
      setRunTimeoutStage('fatal');
      setRunProgressMessage(getRunProgressMessageByStage('fatal'));
      showPredictionErrorOverlay('TIMEOUT', {
        message: '예측 요청이 지연되고 있습니다. 재시도 또는 목록 복귀로 이동할 수 있습니다.',
        copyKey: 'timeout_hint',
        toastKey: 'run_timeout',
        recovery: {
          recoverable: true,
          retryEnabled: true,
          keepDraft: true,
          actionPriorityOrder: ['RETRY', 'FALLBACK_SIMPLE', 'GO_LIST'],
        },
        onRetry: () => {
          void executeVote(gameId, team, game);
        },
        onFallback: () => {
          toast.info('간단 모드로 진행합니다.');
        },
        onGoList: () => {
          window.location.href = '/';
        },
      });
    }, PREDICTION_RUN_FATAL_TIMEOUT_MS);

    try {
      while (true) {
        if (isOfflineNow()) {
          showOfflineToastOnce('submitVote');
          const retryAttempt = nextNetworkRetryAttempt('submitVote');
          const canRetry = canSchedulePredictionRetry(retryAttempt);
          const retryMeta = {
            requestType: 'submitVote',
            retryAttempt,
            retryMax: PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS,
            offline: true,
          };

          if (canRetry) {
            emitFlowEvent('onRunProgress', 'RUNNING', {
              gameId,
              flowId,
              stage: 'RUN_SUBMIT',
              elapsedMs: getRunElapsedMs(),
              meta: retryMeta,
            });
            await waitForRetryDelay(getPredictionRetryDelayMs(retryAttempt));
            continue;
          }

          emitFlowEvent('onRunFail', 'RUNNING', {
            gameId,
            flowId,
            errorCode: 'NETWORK',
            recoverable: true,
            stage: didTimeout ? 'RUN_TIMEOUT' : 'RUN_SUBMIT',
            elapsedMs: getRunElapsedMs(),
            copyKey: getPredictionCopyKey('NETWORK'),
            toastKey: didTimeout ? 'run_timeout' : 'run_retry_started',
            recoveryAction: 'RETRY',
            retryConfig: {
              errorCode: 'NETWORK',
              recoverable: true,
              retryEnabled: true,
              keepDraft: true,
              actionPriorityOrder: ['RETRY', 'GO_LIST'],
            },
            meta: retryMeta,
          });
          toast.error('오프라인 상태로 투표에 실패했습니다.');
          setRunProgressMessage('예측 처리 중 오류가 발생했습니다.');
          showPredictionErrorOverlay('NETWORK', {
            message: '오프라인 상태로 투표 요청을 완료하지 못했습니다.',
            copyKey: getPredictionCopyKey('NETWORK'),
            toastKey: didTimeout ? 'run_timeout' : 'run_retry_started',
            recovery: {
              recoverable: true,
              retryEnabled: true,
              keepDraft: true,
              actionPriorityOrder: ['RETRY', 'GO_LIST'],
            },
            onRetry: () => {
              void executeVote(gameId, team, game);
            },
            onGoList: () => {
              window.location.href = '/';
            },
          });
          return;
        }

        emitFlowEvent('onRunProgress', 'RUNNING', {
          gameId,
          flowId,
          stage: 'RUN_SUBMIT',
          elapsedMs: getRunElapsedMs(),
          meta: { requestType: 'submitVote' },
        });

        try {
          await submitVote(gameId, team);
          resetNetworkRetryAttempt('submitVote');
          break;
        } catch (error: unknown) {
          if (isCancelLikeError(error)) {
            return;
          }

          const parsedError = parseError(error);
          const isNetworkFailure = (
            parsedError.type === 'NETWORK'
            || parsedError.statusCode === 0
            || isOfflineNow()
          );

          if (isNetworkFailure) {
            if (isOfflineNow()) {
              showOfflineToastOnce('submitVote');
            }
            const retryAttempt = nextNetworkRetryAttempt('submitVote');
            const canRetry = canSchedulePredictionRetry(retryAttempt);
            const retryMeta = {
              requestType: 'submitVote',
              retryAttempt,
              retryMax: PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS,
              offline: isOfflineNow(),
            };

            if (canRetry) {
              emitFlowEvent('onRunProgress', 'RUNNING', {
                gameId,
                flowId,
                stage: 'RUN_SUBMIT',
                elapsedMs: getRunElapsedMs(),
                meta: retryMeta,
              });
              await waitForRetryDelay(getPredictionRetryDelayMs(retryAttempt));
              continue;
            }

            emitFlowEvent('onRunFail', 'RUNNING', {
              gameId,
              flowId,
              errorCode: 'NETWORK',
              recoverable: true,
              stage: didTimeout ? 'RUN_TIMEOUT' : 'RUN_SUBMIT',
              elapsedMs: getRunElapsedMs(),
              copyKey: getPredictionCopyKey('NETWORK'),
              toastKey: didTimeout ? 'run_timeout' : 'run_retry_started',
              recoveryAction: 'RETRY',
              retryConfig: {
                errorCode: 'NETWORK',
                recoverable: true,
                retryEnabled: true,
                keepDraft: true,
                actionPriorityOrder: ['RETRY', 'GO_LIST'],
              },
              meta: retryMeta,
            });
            toast.error(parsedError.message || '투표에 실패했습니다.');
            setRunProgressMessage('예측 처리 중 오류가 발생했습니다.');
            showPredictionErrorOverlay('NETWORK', {
              message: parsedError.message || '네트워크 오류로 투표 요청에 실패했습니다.',
              copyKey: getPredictionCopyKey('NETWORK'),
              toastKey: didTimeout ? 'run_timeout' : 'run_retry_started',
              recovery: {
                recoverable: true,
                retryEnabled: true,
                keepDraft: true,
                actionPriorityOrder: ['RETRY', 'GO_LIST'],
              },
              onRetry: () => {
                void executeVote(gameId, team, game);
              },
              onGoList: () => {
                window.location.href = '/';
              },
            });
            return;
          }

          const mappedErrorCode = mapPredictionErrorCode(parsedError.type);
          emitFlowEvent('onRunFail', 'RUNNING', {
            gameId,
            flowId,
            errorCode: mappedErrorCode,
            recoverable: true,
            stage: didTimeout ? 'RUN_TIMEOUT' : 'RUN_SUBMIT',
            elapsedMs: getRunElapsedMs(),
            copyKey: getPredictionCopyKey(mappedErrorCode),
            toastKey: didTimeout ? 'run_timeout' : 'run_retry_started',
            recoveryAction: 'RETRY',
            retryConfig: {
              errorCode: mappedErrorCode,
              recoverable: true,
              retryEnabled: true,
              keepDraft: true,
              actionPriorityOrder: ['RETRY', 'GO_LIST'],
            },
          });
          toast.error(parsedError.message || '투표에 실패했습니다.');
          setRunProgressMessage('예측 처리 중 오류가 발생했습니다.');
          showPredictionErrorOverlay(mappedErrorCode, {
            message: parsedError.message || '예측 요청에 실패했습니다.',
            copyKey: getPredictionCopyKey(mappedErrorCode),
            toastKey: didTimeout ? 'run_timeout' : 'run_retry_started',
            recovery: {
              recoverable: true,
              retryEnabled: true,
              keepDraft: true,
              actionPriorityOrder: ['RETRY', 'GO_LIST'],
            },
            onRetry: () => {
              void executeVote(gameId, team, game);
            },
            onGoList: () => {
              window.location.href = '/';
            },
          });
          return;
        }
      }

      if (didTimeout) {
        emitFlowEvent('onRunProgress', 'RUNNING', {
          gameId,
          flowId,
          stage: 'RUN_SUCCESS',
          elapsedMs: getRunElapsedMs(),
          copyKey: 'run_complete',
          toastKey: 'run_complete',
          meta: { timeoutRecovered: true },
        });
      }

      emitFlowEvent('onRunSuccess', 'RUNNING', {
        gameId,
        flowId,
        toastKey: 'run_complete',
        stage: 'RUN_SUCCESS',
        elapsedMs: getRunElapsedMs(),
      });

      const hadExistingVote = userVote[gameId] != null;
      if (!hadExistingVote) {
        const { deductCheerPoints } = useAuthStore.getState();
        deductCheerPoints(1);
      }

      setUserVote((prev) => ({ ...prev, [gameId]: team }));
      await reloadVoteStatus(gameId, {
        source: 'manual',
        flowId,
      });

      const teamName = team === 'home'
        ? getFullTeamName(game.homeTeam)
        : getFullTeamName(game.awayTeam);
      toast.success(`${teamName} 승리 예측이 저장되었습니다! ⚾`);

      const { currentStreak, triggerCombo } = useLeaderboardStore.getState();
      if (currentStreak > 0) {
        triggerCombo(currentStreak);
      }
    } catch (error: unknown) {
      if (!isCancelLikeError(error)) {
        const parsedError = parseError(error);
        const mappedErrorCode = mapPredictionErrorCode(parsedError.type);
        emitFlowEvent('onRunFail', 'RUNNING', {
          gameId,
          flowId,
          errorCode: mappedErrorCode,
          recoverable: true,
          stage: didTimeout ? 'RUN_TIMEOUT' : 'RUN_SUBMIT',
          elapsedMs: getRunElapsedMs(),
          copyKey: getPredictionCopyKey(mappedErrorCode),
          toastKey: didTimeout ? 'run_timeout' : 'run_retry_started',
          recoveryAction: 'RETRY',
          retryConfig: {
            errorCode: mappedErrorCode,
            recoverable: true,
            retryEnabled: true,
            keepDraft: true,
            actionPriorityOrder: ['RETRY', 'GO_LIST'],
          },
        });
        toast.error(parsedError.message || '투표에 실패했습니다.');
        setRunProgressMessage('예측 처리 중 오류가 발생했습니다.');
      }
    } finally {
      clearTimeout(warningTimeoutId);
      clearTimeout(fatalTimeoutId);
      resetNetworkRetryAttempt('submitVote');
      resetRunProgressState();
    }
  }, [
    beginRunSession,
    emitFlowEvent,
    getNextFlowId,
    getRunElapsedMs,
    getRunProgressMessageByStage,
    nextNetworkRetryAttempt,
    reloadVoteStatus,
    resetNetworkRetryAttempt,
    resetRunProgressState,
    setRunTimeoutStage,
    setUserVote,
    showOfflineToastOnce,
    showPredictionErrorOverlay,
    userVote,
  ]);

  const executeCancelVote = useCallback(async (gameId: string) => {
    if (runInProgressRef.current) {
      emitFlowEvent('onRunCancel', 'RUNNING', {
        gameId,
        stage: 'RUN_SUBMIT',
        recoverable: false,
        retryable: false,
        copyKey: 'run_timeout',
        toastKey: 'run_retry_started',
        recoveryAction: 'GO_BACK',
      });
      toast.info('현재 예측 요청이 진행 중입니다.');
      return;
    }

    const flowId = getNextFlowId(gameId, 'cancel');
    const startedAt = Date.now();
    setRunStartAt(startedAt);
    runInProgressRef.current = true;
    setIsRunInProgress(true);
    setIsRunBannerDismissed(false);
    setRunProgressMessage('투표(예측) 취소 요청을 전송하는 중입니다.');
    beginRunSession({
      flowId,
      gameId,
      action: 'cancel',
      startedAt,
    });
    emitFlowEvent('onRunCancel', 'RUNNING', {
      gameId,
      flowId,
      stage: 'RUN_SUBMIT',
      recoverable: true,
      toastKey: 'run_started',
      meta: { action: 'cancel' },
    });
    emitFlowEvent('onRunProgress', 'RUNNING', {
      gameId,
      flowId,
      stage: 'RUN_SUBMIT',
      elapsedMs: getRunElapsedMs(),
      meta: { requestType: 'cancelVote' },
    });

    try {
      while (true) {
        if (isOfflineNow()) {
          showOfflineToastOnce('cancelVote');
          const retryAttempt = nextNetworkRetryAttempt('cancelVote');
          const canRetry = canSchedulePredictionRetry(retryAttempt);
          const retryMeta = {
            requestType: 'cancelVote',
            retryAttempt,
            retryMax: PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS,
            offline: true,
          };

          if (canRetry) {
            emitFlowEvent('onRunProgress', 'RUNNING', {
              gameId,
              flowId,
              stage: 'RUN_SUBMIT',
              elapsedMs: getRunElapsedMs(),
              meta: retryMeta,
            });
            await waitForRetryDelay(getPredictionRetryDelayMs(retryAttempt));
            continue;
          }

          emitFlowEvent('onRunFail', 'RUNNING', {
            gameId,
            flowId,
            errorCode: 'NETWORK',
            recoverable: true,
            stage: 'RUN_SUBMIT',
            elapsedMs: getRunElapsedMs(),
            copyKey: getPredictionCopyKey('NETWORK'),
            recoveryAction: 'RETRY',
            retryConfig: {
              errorCode: 'NETWORK',
              recoverable: true,
              retryEnabled: true,
              keepDraft: true,
              actionPriorityOrder: ['RETRY', 'GO_LIST'],
            },
            meta: retryMeta,
          });
          toast.error('오프라인 상태로 투표 취소에 실패했습니다.');
          setRunProgressMessage('예측 취소 처리 중 오류가 발생했습니다.');
          showPredictionErrorOverlay('NETWORK', {
            message: '오프라인 상태로 투표 취소 요청을 완료하지 못했습니다.',
            copyKey: getPredictionCopyKey('NETWORK'),
            recovery: {
              recoverable: true,
              retryEnabled: true,
              keepDraft: true,
              actionPriorityOrder: ['RETRY', 'GO_LIST'],
            },
            onRetry: () => {
              void executeCancelVote(gameId);
            },
            onGoList: () => {
              window.location.href = '/';
            },
          });
          return;
        }

        try {
          await cancelVote(gameId);
          resetNetworkRetryAttempt('cancelVote');
          break;
        } catch (error: unknown) {
          if (isCancelLikeError(error)) {
            return;
          }

          const parsedError = parseError(error);
          const isNetworkFailure = (
            parsedError.type === 'NETWORK'
            || parsedError.statusCode === 0
            || isOfflineNow()
          );

          if (isNetworkFailure) {
            if (isOfflineNow()) {
              showOfflineToastOnce('cancelVote');
            }
            const retryAttempt = nextNetworkRetryAttempt('cancelVote');
            const canRetry = canSchedulePredictionRetry(retryAttempt);
            const retryMeta = {
              requestType: 'cancelVote',
              retryAttempt,
              retryMax: PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS,
              offline: isOfflineNow(),
            };

            if (canRetry) {
              emitFlowEvent('onRunProgress', 'RUNNING', {
                gameId,
                flowId,
                stage: 'RUN_SUBMIT',
                elapsedMs: getRunElapsedMs(),
                meta: retryMeta,
              });
              await waitForRetryDelay(getPredictionRetryDelayMs(retryAttempt));
              continue;
            }

            emitFlowEvent('onRunFail', 'RUNNING', {
              gameId,
              flowId,
              errorCode: 'NETWORK',
              recoverable: true,
              stage: 'RUN_SUBMIT',
              elapsedMs: getRunElapsedMs(),
              copyKey: getPredictionCopyKey('NETWORK'),
              recoveryAction: 'RETRY',
              retryConfig: {
                errorCode: 'NETWORK',
                recoverable: true,
                retryEnabled: true,
                keepDraft: true,
                actionPriorityOrder: ['RETRY', 'GO_LIST'],
              },
              meta: retryMeta,
            });
            toast.error(parsedError.message || '투표 취소에 실패했습니다.');
            setRunProgressMessage('예측 취소 처리 중 오류가 발생했습니다.');
            showPredictionErrorOverlay('NETWORK', {
              message: parsedError.message || '네트워크 오류로 투표 취소에 실패했습니다.',
              copyKey: getPredictionCopyKey('NETWORK'),
              recovery: {
                recoverable: true,
                retryEnabled: true,
                keepDraft: true,
                actionPriorityOrder: ['RETRY', 'GO_LIST'],
              },
              onRetry: () => {
                void executeCancelVote(gameId);
              },
              onGoList: () => {
                window.location.href = '/';
              },
            });
            return;
          }

          const mappedErrorCode = mapPredictionErrorCode(parsedError.type);
          emitFlowEvent('onRunFail', 'RUNNING', {
            gameId,
            flowId,
            errorCode: mappedErrorCode,
            recoverable: true,
            stage: 'RUN_SUBMIT',
            elapsedMs: getRunElapsedMs(),
            copyKey: getPredictionCopyKey(mappedErrorCode),
            recoveryAction: 'RETRY',
            retryConfig: {
              errorCode: mappedErrorCode,
              recoverable: true,
              retryEnabled: true,
              keepDraft: true,
              actionPriorityOrder: ['RETRY', 'GO_LIST'],
            },
          });
          toast.error(parsedError.message || '투표 취소에 실패했습니다.');
          setRunProgressMessage('예측 취소 처리 중 오류가 발생했습니다.');
          showPredictionErrorOverlay(mappedErrorCode, {
            message: parsedError.message || '투표 취소에 실패했습니다.',
            copyKey: getPredictionCopyKey(mappedErrorCode),
            recovery: {
              recoverable: true,
              retryEnabled: true,
              keepDraft: true,
              actionPriorityOrder: ['RETRY', 'GO_LIST'],
            },
            onRetry: () => {
              void executeCancelVote(gameId);
            },
            onGoList: () => {
              window.location.href = '/';
            },
          });
          return;
        }
      }

      setUserVote((prev) => ({ ...prev, [gameId]: null }));
      await reloadVoteStatus(gameId, {
        source: 'manual',
        flowId,
      });
      emitFlowEvent('onRunSuccess', 'RUNNING', {
        gameId,
        flowId,
        toastKey: 'run_complete',
        stage: 'RUN_SUCCESS',
        elapsedMs: getRunElapsedMs(),
      });
      toast.success('투표가 취소되었습니다.');
    } catch (error) {
      if (!isCancelLikeError(error)) {
        const parsedError = parseError(error);
        toast.error(parsedError.message || '투표 취소에 실패했습니다.');
      }
    } finally {
      resetNetworkRetryAttempt('cancelVote');
      resetRunProgressState();
    }
  }, [
    beginRunSession,
    emitFlowEvent,
    getNextFlowId,
    getRunElapsedMs,
    nextNetworkRetryAttempt,
    reloadVoteStatus,
    resetNetworkRetryAttempt,
    resetRunProgressState,
    setUserVote,
    showOfflineToastOnce,
    showPredictionErrorOverlay,
  ]);

  const handleVote = useCallback(async (team: VoteTeam, game: Game, isVoteOpen: boolean) => {
    const gameId = game.gameId;
    emitFlowEvent('onPredictPress', 'DETAIL_EDIT', {
      gameId,
      stage: 'INPUT_VALIDATE',
      meta: {
        team,
      },
    });

    if (!isVoteOpen) {
      emitFlowEvent('onInputInvalid', 'DETAIL_EDIT', {
        gameId,
        errorCode: 'VALIDATION',
        stage: 'INPUT_VALIDATE',
        validation: [{
          fieldId: 'vote-open',
          severity: 'error',
          messageCode: 'validation_hint',
        }],
        copyKey: 'validation_hint',
        recoverable: false,
      });
      toast.error('현재는 투표할 수 없습니다.');
      return;
    }

    emitFlowEvent('onInputValid', 'DETAIL_EDIT', {
      gameId,
      stage: 'INPUT_VALIDATE',
      validation: [{
        fieldId: 'vote-open',
        severity: 'info',
        messageCode: 'detail_validate_success',
      }],
      toastKey: 'detail_validate_success',
    });

    if (userVote[gameId] && userVote[gameId] !== team) {
      const currentTeamName = userVote[gameId] === 'home'
        ? getFullTeamName(game.homeTeam)
        : getFullTeamName(game.awayTeam);
      const newTeamName = team === 'home'
        ? getFullTeamName(game.homeTeam)
        : getFullTeamName(game.awayTeam);

      const confirmed = await confirm({
        title: '투표 변경',
        description: `현재 ${currentTeamName} 승리로 투표하셨습니다.\n${newTeamName}(으)로 변경하시겠습니까?`,
      });
      if (confirmed) {
        void executeVote(gameId, team, game);
      }
      return;
    }

    if (userVote[gameId] === team) {
      const confirmed = await confirm({
        title: '투표 취소',
        description: '투표를 취소하시겠습니까?\n\n(❗️ 주의: 사용된 포인트는 반환되지 않습니다)',
      });
      if (confirmed) {
        void executeCancelVote(gameId);
      }
      return;
    }

    void executeVote(gameId, team, game);
  }, [confirm, emitFlowEvent, executeCancelVote, executeVote, userVote]);

  const restoreRunSession = useCallback(async (trigger: RunSessionRestoreTrigger) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (runInProgressRef.current || runSessionRestoreInFlightRef.current) {
      return;
    }

    const parsedSession = parsePredictionRunSession(
      window.sessionStorage.getItem(PREDICTION_RUN_SESSION_STORAGE_KEY)
    );

    if (!parsedSession) {
      clearRunSession();
      return;
    }

    if (isPredictionRunSessionStale(parsedSession.startedAt)) {
      clearRunSession();
      setRunProgressMessage('이전 예측 실행 세션이 만료되었습니다. 다시 시도해 주세요.');
      emitFlowEvent('onRunTimeout', 'RUNNING', {
        gameId: parsedSession.gameId,
        flowId: parsedSession.flowId,
        errorCode: 'TIMEOUT',
        recoverable: true,
        toastKey: 'run_timeout',
        copyKey: 'timeout_hint',
        stage: 'RUN_TIMEOUT',
        recoveryAction: 'RETRY',
        retryConfig: {
          errorCode: 'TIMEOUT',
          recoverable: true,
          retryEnabled: true,
          keepDraft: true,
          actionPriorityOrder: ['RETRY', 'GO_LIST'],
        },
        meta: {
          restoredFromSession: true,
          staleSession: true,
          trigger,
        },
      });
      showPredictionErrorOverlay('TIMEOUT', {
        message: '실행 세션이 만료되었습니다. 다시 시도하거나 목록으로 이동해 주세요.',
        copyKey: 'timeout_hint',
        recovery: {
          recoverable: true,
          retryEnabled: true,
          keepDraft: true,
          actionPriorityOrder: ['RETRY', 'GO_LIST'],
        },
        onRetry: () => {
          void loadVoteStatus(parsedSession.gameId, {
            source: 'session-restore',
            flowId: parsedSession.flowId,
            restoredFromSession: true,
          });
        },
        onGoList: () => {
          window.location.href = '/';
        },
      });
      return;
    }

    runSessionRestoreInFlightRef.current = true;
    try {
      upsertRunSession(parsedSession);
      setRunStartAt(parsedSession.startedAt);
      runInProgressRef.current = true;
      setIsRunInProgress(true);
      setIsRunBannerDismissed(parsedSession.bannerDismissed);
      setRunTimeoutStage(parsedSession.timeoutStage);
      setRunProgressMessage(
        parsedSession.action === 'cancel'
          ? '투표 취소 결과를 동기화하는 중입니다.'
          : getRunProgressMessageByStage(parsedSession.timeoutStage)
      );
      emitFlowEvent('onRunProgress', 'RUNNING', {
        gameId: parsedSession.gameId,
        flowId: parsedSession.flowId,
        stage: 'RUN_POLL',
        elapsedMs: Date.now() - parsedSession.startedAt,
        meta: {
          requestType: 'sessionRestore',
          restoredFromSession: true,
          trigger,
          timeoutStage: parsedSession.timeoutStage,
        },
      });
      await loadVoteStatus(parsedSession.gameId, {
        source: 'session-restore',
        flowId: parsedSession.flowId,
        restoredFromSession: true,
      });
    } finally {
      runSessionRestoreInFlightRef.current = false;
      resetRunProgressState();
    }
  }, [
    clearRunSession,
    emitFlowEvent,
    getRunProgressMessageByStage,
    loadVoteStatus,
    resetRunProgressState,
    setRunTimeoutStage,
    showPredictionErrorOverlay,
    upsertRunSession,
  ]);

  useEffect(() => {
    runInProgressRef.current = isRunInProgress;
  }, [isRunInProgress]);

  useEffect(() => {
    patchRunSession({ bannerDismissed: isRunBannerDismissed });
  }, [isRunBannerDismissed, patchRunSession]);

  useEffect(() => {
    if (isAuthLoading || !isLoggedIn) {
      return;
    }

    void restoreRunSession('mount');

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void restoreRunSession('visibilitychange');
    };
    const handlePageShow = () => {
      void restoreRunSession('pageshow');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isAuthLoading, isLoggedIn, restoreRunSession]);

  return {
    handleVote,
    isRunInProgress,
    isRunBannerDismissed,
    runProgressMessage,
    runStartAt,
    dismissRunProgressBanner,
    resumeRunProgressBanner,
  };
};
