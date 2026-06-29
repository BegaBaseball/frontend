import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { fetchGameDetail, fetchGameLiveRelaySnapshot, fetchGameLiveSnapshot, fetchVoteStatus } from '../api/prediction';
import { buildPredictionRecoveryPath } from '../utils/predictionDeepLink';
import {
  PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS,
  canSchedulePredictionRetry,
  createPredictionRetryAttemptState,
  getPredictionRetryDelayMs,
  increasePredictionRetryAttempt,
  resetPredictionRetryAttempt,
  type PredictionRetryActionKey,
} from '../utils/predictionRecovery';
import { parseError } from '../utils/errorUtils';
import type { DateGames, Game, GameDetail, VoteStatus } from '../types/prediction';
import {
  LIVE_GAME_EVENT_LIMIT,
  LIVE_GAME_POLL_INTERVAL_MS,
  LIVE_RELAY_EVENT_LIMIT,
  mergeGameDetailLiveStatusError,
  mergeGameDetailRelayError,
  mergeGameDetailWithRelaySnapshot,
  mergeGameDetailWithLiveSnapshot,
  shouldStartPredictionLivePolling,
} from '../utils/liveGame';
import { schedulePredictionPostPaintIdleWork } from '../utils/predictionDeferredWork';
import {
  PREDICTION_OFFLINE_TOAST_MESSAGE,
  PREDICTION_PARTIAL_REASON_TOTAL_VOTES_MISSING,
  getPredictionCopyKey,
  hasRenderableGameDetail,
  hasInningScoreData,
  isCancelLikeError,
  mapPredictionErrorCode,
  mapVoteStatusErrorCode,
  type GameDetailRequestState,
  type LoadVoteStatusOptions,
  type PredictionFlowEmitter,
  type PredictionOverlayController,
  type PredictionPartialReason,
  type VoteRequestState,
} from './predictionHookShared';

type UsePredictionGameDataParams = {
  allDatesData: DateGames[];
  currentDateIndex: number;
  selectedGame: number;
  emitFlowEvent: PredictionFlowEmitter;
  showPredictionErrorOverlay: PredictionOverlayController['showPredictionErrorOverlay'];
  shouldLoadCurrentGameData?: boolean;
};

const PREDICTION_DETAIL_LOADING_TOAST_ID = 'prediction-detail-loading';
const PREDICTION_DETAIL_LOADING_TOAST_DELAY_MS = 300;

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

export const usePredictionGameData = ({
  allDatesData,
  currentDateIndex,
  selectedGame,
  emitFlowEvent,
  showPredictionErrorOverlay,
  shouldLoadCurrentGameData = true,
}: UsePredictionGameDataParams) => {
  const [votes, setVotes] = useState<{ [key: string]: VoteStatus }>({});
  const [voteStatusState, setVoteStatusState] = useState<{ [key: string]: VoteRequestState }>({});
  const [partialReasonsByGameId, setPartialReasonsByGameId] = useState<Record<string, PredictionPartialReason | null>>({});
  const [gameDetails, setGameDetails] = useState<{ [key: string]: GameDetailRequestState }>({});

  const voteStatusRequestRef = useRef(0);
  const voteStatusAbortRef = useRef<AbortController | null>(null);
  const detailRequestRef = useRef(0);
  const detailAbortRef = useRef<AbortController | null>(null);
  const liveSnapshotInFlightRef = useRef(false);
  const liveSnapshotAbortRef = useRef<AbortController | null>(null);
  const liveRelayInFlightRef = useRef(false);
  const liveRelayAbortRef = useRef<AbortController | null>(null);
  const liveRelayManualDataSuppressedRef = useRef<Set<string>>(new Set());
  const retryAttemptRef = useRef(createPredictionRetryAttemptState());
  const gameDetailsRef = useRef(gameDetails);
  const detailLoadingToastTimerRef = useRef<number | null>(null);
  const detailLoadingToastVisibleRef = useRef(false);
  const detailLoadingToastRequestRef = useRef<number | null>(null);
  const offlineToastShownRef = useRef<Record<PredictionRetryActionKey, boolean>>({
    submitVote: false,
    cancelVote: false,
    voteStatus: false,
  });

  const currentGame = allDatesData[currentDateIndex]?.games[selectedGame] || null;
  const currentGameRef = useRef<Game | null>(currentGame);
  const currentGameId = currentGame?.gameId || null;
  const currentGameDetailState = currentGameId ? gameDetails[currentGameId] : null;
  const currentGameDetail = currentGameDetailState?.data ?? null;
  const currentGameDetailReady = currentGameDetailState?.status === 'ready';
  const shouldStartCurrentLivePolling = shouldStartPredictionLivePolling(
    currentGame,
    currentGameDetail,
    currentGameDetailReady,
  );
  const currentGameDetailLoading = currentGameDetailState?.status === 'loading';
  const currentGameDetailRefreshing = currentGameDetailState?.isBackgroundRefreshing === true;
  const currentGameDetailHasRenderableData = hasRenderableGameDetail(currentGameDetailState);
  const currentGameDetailError = currentGameDetailState?.error || null;
  const currentGameDetailErrorCode = currentGameDetailState?.errorCode || null;
  const currentDateVoteState = currentGameId ? voteStatusState[currentGameId] : null;
  const voteStatusError = currentDateVoteState?.error || null;
  const voteStatusLoading = currentDateVoteState?.status === 'loading';
  const currentVotePartialReason = currentGameId ? partialReasonsByGameId[currentGameId] ?? null : null;
  const isCurrentVotePartial = Boolean(currentVotePartialReason);

  const resolveLivePollingSuppressionKey = useCallback((gameId: string, fallbackGame?: Game | null) => {
    const detail = gameDetailsRef.current[gameId]?.data ?? null;
    const gameDate = detail?.gameDate || fallbackGame?.gameDate || 'unknown';
    return `${gameId}|${gameDate}`;
  }, []);

  const isLiveRelayPollingSuppressed = useCallback((gameId: string, fallbackGame?: Game | null) => (
    liveRelayManualDataSuppressedRef.current.has(resolveLivePollingSuppressionKey(gameId, fallbackGame))
  ), [resolveLivePollingSuppressionKey]);

  const suppressLiveRelayPollingForManualData = useCallback((gameId: string, fallbackGame?: Game | null) => {
    liveRelayManualDataSuppressedRef.current.add(resolveLivePollingSuppressionKey(gameId, fallbackGame));
  }, [resolveLivePollingSuppressionKey]);

  useEffect(() => {
    gameDetailsRef.current = gameDetails;
  }, [gameDetails]);

  useEffect(() => {
    currentGameRef.current = currentGame;
  }, [currentGame]);

  const getCurrentGameId = useCallback(() => {
    const nextDateGames = allDatesData[currentDateIndex]?.games || [];
    return nextDateGames[selectedGame]?.gameId || null;
  }, [allDatesData, currentDateIndex, selectedGame]);

  const goToPredictionRecovery = useCallback((options?: {
    currentDate?: string | null;
    currentGameId?: string | null;
  }) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.href = buildPredictionRecoveryPath({
      currentDate: options?.currentDate ?? allDatesData[currentDateIndex]?.date ?? null,
      currentGameId: options?.currentGameId ?? getCurrentGameId(),
    });
  }, [allDatesData, currentDateIndex, getCurrentGameId]);

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

  const clearPredictionDetailLoadingToastTimer = useCallback((requestId?: number) => {
    if (requestId != null && detailLoadingToastRequestRef.current !== requestId) {
      return;
    }
    if (detailLoadingToastTimerRef.current == null) {
      return;
    }
    window.clearTimeout(detailLoadingToastTimerRef.current);
    detailLoadingToastTimerRef.current = null;
  }, []);

  const dismissPredictionDetailLoadingToast = useCallback((requestId?: number) => {
    if (requestId != null && detailLoadingToastRequestRef.current !== requestId) {
      return;
    }
    clearPredictionDetailLoadingToastTimer(requestId);
    if (!detailLoadingToastVisibleRef.current) {
      detailLoadingToastRequestRef.current = null;
      return;
    }
    toast.dismiss(PREDICTION_DETAIL_LOADING_TOAST_ID);
    detailLoadingToastVisibleRef.current = false;
    detailLoadingToastRequestRef.current = null;
  }, [clearPredictionDetailLoadingToastTimer]);

  const schedulePredictionDetailLoadingToast = useCallback(() => {
    clearPredictionDetailLoadingToastTimer();
    if (detailLoadingToastVisibleRef.current) {
      toast.dismiss(PREDICTION_DETAIL_LOADING_TOAST_ID);
      detailLoadingToastVisibleRef.current = false;
    }
    const toastRequestId = detailRequestRef.current;
    detailLoadingToastRequestRef.current = toastRequestId;
    if (typeof window === 'undefined') {
      return;
    }
    detailLoadingToastTimerRef.current = window.setTimeout(() => {
      if (detailLoadingToastRequestRef.current !== toastRequestId) {
        return;
      }
      detailLoadingToastTimerRef.current = null;
      detailLoadingToastVisibleRef.current = true;
      toast.loading('경기 상세 정보를 불러오는 중입니다.', {
        id: PREDICTION_DETAIL_LOADING_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
        description: '카드는 그대로 두고 상세 영역만 준비합니다.',
      });
    }, PREDICTION_DETAIL_LOADING_TOAST_DELAY_MS);
  }, [clearPredictionDetailLoadingToastTimer]);

  useEffect(() => () => {
    clearPredictionDetailLoadingToastTimer();
    toast.dismiss(PREDICTION_DETAIL_LOADING_TOAST_ID);
  }, [clearPredictionDetailLoadingToastTimer]);

  const loadGameDetail = useCallback(async (
    gameId: string,
    requestId: number,
    signal?: AbortSignal,
    options: { backgroundRefresh?: boolean; showLoadingToast?: boolean } = {}
  ) => {
    const backgroundRefresh = options.backgroundRefresh === true;
    if (!backgroundRefresh) {
      schedulePredictionDetailLoadingToast();
    } else if (options.showLoadingToast === true) {
      schedulePredictionDetailLoadingToast();
    }
    emitFlowEvent('onRunProgress', 'RUNNING', {
      gameId,
      meta: { requestType: 'gameDetail', requestId },
      stage: 'RUN_POLL',
    });

    setGameDetails((prev) => {
      const previousState = prev[gameId];
      if (backgroundRefresh && previousState?.data != null) {
        return {
          ...prev,
          [gameId]: {
            ...previousState,
            status: 'ready',
            error: undefined,
            errorCode: undefined,
            isSeeded: false,
            isBackgroundRefreshing: true,
            hasRenderableData: true,
          },
        };
      }

      return {
        ...prev,
        [gameId]: {
          status: 'loading',
          data: previousState?.data ?? null,
          error: undefined,
          errorCode: undefined,
          isSeeded: false,
          isBackgroundRefreshing: false,
          hasRenderableData: hasRenderableGameDetail(previousState),
        },
      };
    });

    try {
      const detail = await fetchGameDetail(gameId, { signal });
      if (requestId !== detailRequestRef.current) {
        dismissPredictionDetailLoadingToast(requestId);
        return;
      }
      const fallbackGame = currentGameRef.current?.gameId === gameId ? currentGameRef.current : null;
      let detailForCommit = detail;
      if (shouldStartPredictionLivePolling(fallbackGame, detail, true)) {
        try {
          const snapshot = await fetchGameLiveSnapshot(gameId, {
            limit: LIVE_GAME_EVENT_LIMIT,
            signal,
          });
          detailForCommit = mergeGameDetailWithLiveSnapshot(detail, snapshot, fallbackGame);
        } catch (liveError) {
          if (isCancelLikeError(liveError)) {
            dismissPredictionDetailLoadingToast(requestId);
            return;
          }
          const parsedLiveError = parseError(liveError);
          const liveErrorMessage = parsedLiveError.responseCode === 'MANUAL_BASEBALL_DATA_REQUIRED'
            ? '실시간 점수 데이터 준비가 필요합니다.'
            : '실시간 점수 갱신에 실패했습니다.';
          detailForCommit = mergeGameDetailLiveStatusError(
            detail,
            liveErrorMessage,
            fallbackGame,
            parsedLiveError.responseCode ?? null,
          ) ?? detail;
        }
      }
      if (requestId !== detailRequestRef.current) {
        dismissPredictionDetailLoadingToast(requestId);
        return;
      }
      dismissPredictionDetailLoadingToast();
      setGameDetails((prev) => ({
        ...prev,
        [gameId]: {
          status: 'ready',
          data: detailForCommit,
          error: undefined,
          errorCode: undefined,
          isSeeded: false,
          isBackgroundRefreshing: false,
          hasRenderableData: true,
        },
      }));
      emitFlowEvent('onResultSuccess', 'RESULT', {
        gameId,
      });
    } catch (error: unknown) {
      if (requestId !== detailRequestRef.current || isCancelLikeError(error)) {
        dismissPredictionDetailLoadingToast(requestId);
        return;
      }

      const parsedError = parseError(error);
      const mappedErrorCode = mapPredictionErrorCode(parsedError.type, parsedError.responseCode);
      if (backgroundRefresh) {
        dismissPredictionDetailLoadingToast();
        setGameDetails((prev) => {
          const previousState = prev[gameId];
          if (previousState?.data != null) {
            return {
              ...prev,
              [gameId]: {
                ...previousState,
                status: 'ready',
                error: parsedError.message || '경기 상세를 불러오지 못했습니다.',
                errorCode: parsedError.responseCode,
                isSeeded: false,
                isBackgroundRefreshing: false,
                hasRenderableData: true,
              },
            };
          }

          return {
            ...prev,
            [gameId]: {
              ...previousState,
              status: 'error',
              data: previousState?.data ?? null,
              error: parsedError.message || '경기 상세를 불러오지 못했습니다.',
              errorCode: parsedError.responseCode,
              isSeeded: false,
              isBackgroundRefreshing: false,
              hasRenderableData: hasRenderableGameDetail(previousState),
            },
          };
        });
        return;
      }

      setGameDetails((prev) => ({
        ...prev,
        [gameId]: {
          status: 'error',
          data: prev[gameId]?.data ?? null,
          error: parsedError.message || '경기 상세를 불러오지 못했습니다.',
          errorCode: parsedError.responseCode,
          isBackgroundRefreshing: false,
          hasRenderableData: hasRenderableGameDetail(prev[gameId]),
        },
      }));
      emitFlowEvent('onResultRenderFail', 'ERROR', {
        gameId,
        errorCode: mappedErrorCode,
        recoverable: true,
        copyKey: getPredictionCopyKey(mappedErrorCode),
        stage: 'RENDER_FAIL',
        retryConfig: {
          errorCode: mappedErrorCode,
          recoverable: true,
          retryEnabled: true,
          keepDraft: true,
          actionPriorityOrder: ['RETRY', 'GO_LIST'],
        },
        meta: {
          requestType: 'gameDetail',
          requestId,
          fallbackShown: true,
        },
      });
      clearPredictionDetailLoadingToastTimer();
      detailLoadingToastVisibleRef.current = false;
      detailLoadingToastRequestRef.current = null;
      toast.error(parsedError.message || '경기 상세를 불러오지 못했습니다.', {
        id: PREDICTION_DETAIL_LOADING_TOAST_ID,
      });
    }
  }, [
    clearPredictionDetailLoadingToastTimer,
    dismissPredictionDetailLoadingToast,
    emitFlowEvent,
    schedulePredictionDetailLoadingToast,
  ]);

  const loadLiveSnapshot = useCallback(async (gameId: string, fallbackGame?: Game | null): Promise<boolean> => {
    if (liveSnapshotInFlightRef.current) {
      return true;
    }

    liveSnapshotInFlightRef.current = true;
    const abortController = new AbortController();
    liveSnapshotAbortRef.current = abortController;
    const previousDetail = gameDetailsRef.current[gameId]?.data ?? null;
    try {
      const snapshot = await fetchGameLiveSnapshot(gameId, {
        afterSeq: previousDetail?.liveLastEventSeq ?? null,
        limit: LIVE_GAME_EVENT_LIMIT,
        signal: abortController.signal,
      });
      setGameDetails((prev) => {
        const previousState = prev[gameId];
        const mergedDetail = mergeGameDetailWithLiveSnapshot(
          previousState?.data ?? null,
          snapshot,
          fallbackGame ?? currentGameRef.current,
        );
        const status = previousState?.status === 'loading' && previousState.data == null
          ? 'loading'
          : 'ready';
        return {
          ...prev,
          [gameId]: {
            status,
            data: mergedDetail,
            error: previousState?.error,
            errorCode: previousState?.errorCode,
            isSeeded: previousState?.isSeeded ?? false,
            isBackgroundRefreshing: previousState?.isBackgroundRefreshing ?? false,
            hasRenderableData: true,
          },
        };
      });
    } catch (error) {
      if (isCancelLikeError(error)) {
        return true;
      }
      const parsedError = parseError(error);
      const liveErrorMessage = parsedError.responseCode === 'MANUAL_BASEBALL_DATA_REQUIRED'
        ? '실시간 점수 데이터 준비가 필요합니다.'
        : '실시간 점수 갱신에 실패했습니다.';
      setGameDetails((prev) => {
        const previousState = prev[gameId];
        const mergedDetail = mergeGameDetailLiveStatusError(
          previousState?.data ?? null,
          liveErrorMessage,
          fallbackGame ?? currentGameRef.current,
          parsedError.responseCode ?? null,
        );
        if (!mergedDetail) {
          return prev;
        }
        return {
          ...prev,
          [gameId]: {
            status: previousState?.status ?? 'ready',
            data: mergedDetail,
            error: previousState?.error,
            errorCode: previousState?.errorCode,
            isSeeded: previousState?.isSeeded ?? false,
            isBackgroundRefreshing: previousState?.isBackgroundRefreshing ?? false,
            hasRenderableData: true,
          },
        };
      });
    } finally {
      if (liveSnapshotAbortRef.current === abortController) {
        liveSnapshotAbortRef.current = null;
      }
      liveSnapshotInFlightRef.current = false;
    }
    return true;
  }, []);

  const loadLiveRelaySnapshot = useCallback(async (gameId: string, fallbackGame?: Game | null): Promise<boolean> => {
    if (liveRelayInFlightRef.current) {
      return true;
    }

    liveRelayInFlightRef.current = true;
    const abortController = new AbortController();
    liveRelayAbortRef.current = abortController;
    const previousDetail = gameDetailsRef.current[gameId]?.data ?? null;
    let shouldContinuePolling = true;
    try {
      const snapshot = await fetchGameLiveRelaySnapshot(gameId, {
        afterId: previousDetail?.liveLastRelayId ?? null,
        limit: LIVE_RELAY_EVENT_LIMIT,
        signal: abortController.signal,
      });
      setGameDetails((prev) => {
        const previousState = prev[gameId];
        const mergedDetail = mergeGameDetailWithRelaySnapshot(
          previousState?.data ?? null,
          snapshot,
          fallbackGame ?? currentGameRef.current,
        );
        const status = previousState?.status === 'loading' && previousState.data == null
          ? 'loading'
          : 'ready';
        return {
          ...prev,
          [gameId]: {
            status,
            data: mergedDetail,
            error: previousState?.error,
            errorCode: previousState?.errorCode,
            isSeeded: previousState?.isSeeded ?? false,
            isBackgroundRefreshing: previousState?.isBackgroundRefreshing ?? false,
            hasRenderableData: true,
          },
        };
      });
    } catch (error) {
      if (isCancelLikeError(error)) {
        return true;
      }
      const parsedError = parseError(error);
      if (parsedError.responseCode === 'MANUAL_BASEBALL_DATA_REQUIRED') {
        suppressLiveRelayPollingForManualData(gameId, fallbackGame ?? currentGameRef.current);
        shouldContinuePolling = false;
      }
      const relayErrorMessage = parsedError.responseCode === 'MANUAL_BASEBALL_DATA_REQUIRED'
        ? '문자중계 데이터 준비가 필요합니다.'
        : '문자중계 갱신에 실패했습니다.';
      setGameDetails((prev) => {
        const previousState = prev[gameId];
        const mergedDetail = mergeGameDetailRelayError(
          previousState?.data ?? null,
          relayErrorMessage,
          fallbackGame ?? currentGameRef.current,
          parsedError.responseCode ?? null,
        );
        if (!mergedDetail) {
          return prev;
        }
        return {
          ...prev,
          [gameId]: {
            status: previousState?.status ?? 'ready',
            data: mergedDetail,
            error: previousState?.error,
            errorCode: previousState?.errorCode,
            isSeeded: previousState?.isSeeded ?? false,
            isBackgroundRefreshing: previousState?.isBackgroundRefreshing ?? false,
            hasRenderableData: true,
          },
        };
      });
    } finally {
      if (liveRelayAbortRef.current === abortController) {
        liveRelayAbortRef.current = null;
      }
      liveRelayInFlightRef.current = false;
    }
    return shouldContinuePolling;
  }, [suppressLiveRelayPollingForManualData]);

  const loadVoteStatus = useCallback(async (
    gameId: string,
    options: LoadVoteStatusOptions = {}
  ): Promise<boolean> => {
    const source = options.source ?? 'auto';
    const requestId = ++voteStatusRequestRef.current;

    if (voteStatusAbortRef.current) {
      voteStatusAbortRef.current.abort();
    }

    const abortController = new AbortController();
    voteStatusAbortRef.current = abortController;

    setVoteStatusState((prev) => ({
      ...prev,
      [gameId]: {
        status: 'loading',
      },
    }));
    emitFlowEvent('onRunProgress', 'RUNNING', {
      gameId,
      flowId: options.flowId,
      meta: {
        requestType: 'voteStatus',
        requestId,
        source,
        restoredFromSession: options.restoredFromSession === true,
      },
      stage: 'RUN_POLL',
    });

    while (true) {
      if (requestId !== voteStatusRequestRef.current || abortController.signal.aborted) {
        return false;
      }

      if (isOfflineNow()) {
        showOfflineToastOnce('voteStatus');
        const retryAttempt = nextNetworkRetryAttempt('voteStatus');
        const canRetry = canSchedulePredictionRetry(retryAttempt);
        const retryMeta = {
          requestType: 'voteStatus',
          requestId,
          source,
          retryAttempt,
          retryMax: PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS,
          offline: true,
          restoredFromSession: options.restoredFromSession === true,
        };

        if (canRetry) {
          await waitForRetryDelay(getPredictionRetryDelayMs(retryAttempt));
          emitFlowEvent('onRunProgress', 'RUNNING', {
            gameId,
            flowId: options.flowId,
            stage: 'RUN_POLL',
            meta: retryMeta,
          });
          continue;
        }

        const errorMessage = '오프라인 상태로 투표 집계 조회를 완료하지 못했습니다.';
        setVoteStatusState((prev) => ({
          ...prev,
          [gameId]: {
            status: 'error',
            error: errorMessage,
          },
        }));
        emitFlowEvent('onRunFail', 'RUNNING', {
          gameId,
          flowId: options.flowId,
          errorCode: 'NETWORK',
          recoverable: true,
          copyKey: getPredictionCopyKey('NETWORK'),
          stage: 'RUN_POLL',
          retryConfig: {
            errorCode: 'NETWORK',
            recoverable: true,
            retryEnabled: true,
            keepDraft: true,
            actionPriorityOrder: ['RETRY', 'GO_LIST'],
          },
          recoveryAction: 'RETRY',
          meta: retryMeta,
        });
        showPredictionErrorOverlay('NETWORK', {
          message: errorMessage,
          copyKey: getPredictionCopyKey('NETWORK'),
          recovery: {
            recoverable: true,
            retryEnabled: true,
            keepDraft: true,
            actionPriorityOrder: ['RETRY', 'GO_LIST'],
          },
          onRetry: () => {
            void loadVoteStatus(gameId, {
              source: 'overlay',
              flowId: options.flowId,
              restoredFromSession: options.restoredFromSession,
            });
          },
          onGoList: () => {
            goToPredictionRecovery({ currentGameId: gameId });
          },
        });
        return false;
      }

      try {
        const status = await fetchVoteStatus(gameId, { signal: abortController.signal });

        if (requestId !== voteStatusRequestRef.current || abortController.signal.aborted) {
          return false;
        }

        if (status.ok) {
          resetNetworkRetryAttempt('voteStatus');
          const partialReason = status.data.totalVotes == null
            ? PREDICTION_PARTIAL_REASON_TOTAL_VOTES_MISSING
            : null;
          setVotes((prev) => ({
            ...prev,
            [gameId]: {
              home: status.data.homeVotes,
              away: status.data.awayVotes,
            },
          }));
          setVoteStatusState((prev) => ({
            ...prev,
            [gameId]: { status: 'ready' },
          }));
          setPartialReasonsByGameId((prev) => ({
            ...prev,
            [gameId]: partialReason,
          }));
          emitFlowEvent('onResultSuccess', 'RESULT', {
            gameId,
            flowId: options.flowId,
            recoverable: true,
            toastKey: 'run_complete',
            stage: 'RESULT_SUCCESS',
            meta: {
              source,
              restoredFromSession: options.restoredFromSession === true,
            },
          });
          if (partialReason) {
            emitFlowEvent('onResultPartial', 'RESULT', {
              gameId,
              flowId: options.flowId,
              errorCode: 'PARTIAL_DATA',
              recoverable: true,
              copyKey: 'render_fallback_message',
              toastKey: 'result_partial',
              stage: 'RESULT_PARTIAL',
              retryConfig: {
                errorCode: 'PARTIAL_DATA',
                recoverable: true,
                retryEnabled: true,
                keepDraft: true,
                actionPriorityOrder: ['RETRY', 'GO_LIST'],
              },
              meta: {
                partialReason,
                source,
                restoredFromSession: options.restoredFromSession === true,
              },
            });
          }
          return true;
        }

        if (abortController.signal.aborted) {
          return false;
        }

        const errorCode = mapVoteStatusErrorCode(status.error.status);
        const errorMessage = status.error.message;
        const isNetworkFailure = (
          errorCode === 'NETWORK'
          || status.error.status === 0
          || isOfflineNow()
        );

        if (isNetworkFailure) {
          const retryAttempt = nextNetworkRetryAttempt('voteStatus');
          const canRetry = canSchedulePredictionRetry(retryAttempt);
          const retryMeta = {
            requestType: 'voteStatus',
            requestId,
            source,
            retryAttempt,
            retryMax: PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS,
            offline: isOfflineNow(),
            restoredFromSession: options.restoredFromSession === true,
          };

          if (canRetry) {
            await waitForRetryDelay(getPredictionRetryDelayMs(retryAttempt));
            emitFlowEvent('onRunProgress', 'RUNNING', {
              gameId,
              flowId: options.flowId,
              stage: 'RUN_POLL',
              meta: retryMeta,
            });
            continue;
          }
        }

        setVoteStatusState((prev) => ({
          ...prev,
          [gameId]: {
            status: 'error',
            error: errorMessage,
          },
        }));
        emitFlowEvent('onRunFail', 'RUNNING', {
          gameId,
          flowId: options.flowId,
          errorCode,
          recoverable: true,
          copyKey: getPredictionCopyKey(errorCode),
          stage: 'RUN_POLL',
          retryConfig: {
            errorCode,
            recoverable: true,
            retryEnabled: true,
            keepDraft: true,
            actionPriorityOrder: ['RETRY', 'GO_LIST'],
          },
          recoveryAction: 'RETRY',
        });
        showPredictionErrorOverlay(errorCode, {
          message: errorMessage,
          copyKey: getPredictionCopyKey(errorCode),
          recovery: {
            recoverable: true,
            retryEnabled: true,
            keepDraft: true,
            actionPriorityOrder: ['RETRY', 'GO_LIST'],
          },
          onRetry: () => {
            void loadVoteStatus(gameId, {
              source: 'overlay',
              flowId: options.flowId,
              restoredFromSession: options.restoredFromSession,
            });
          },
          onGoList: () => {
            goToPredictionRecovery({ currentGameId: gameId });
          },
        });
        return false;
      } catch (error: unknown) {
        if (requestId !== voteStatusRequestRef.current || abortController.signal.aborted) {
          return false;
        }
        if (isCancelLikeError(error)) {
          return false;
        }

        const parsedError = parseError(error);
        const errorCode = mapVoteStatusErrorCode(parsedError.statusCode);
        const isNetworkFailure = (
          parsedError.type === 'NETWORK'
          || parsedError.statusCode === 0
          || errorCode === 'NETWORK'
          || isOfflineNow()
        );
        const errorMessage = parsedError.message || '투표 집계 조회에 실패했습니다.';

        if (isNetworkFailure) {
          if (isOfflineNow()) {
            showOfflineToastOnce('voteStatus');
          }

          const retryAttempt = nextNetworkRetryAttempt('voteStatus');
          const canRetry = canSchedulePredictionRetry(retryAttempt);
          const retryMeta = {
            requestType: 'voteStatus',
            requestId,
            source,
            retryAttempt,
            retryMax: PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS,
            offline: isOfflineNow(),
            restoredFromSession: options.restoredFromSession === true,
          };

          if (canRetry) {
            await waitForRetryDelay(getPredictionRetryDelayMs(retryAttempt));
            emitFlowEvent('onRunProgress', 'RUNNING', {
              gameId,
              flowId: options.flowId,
              stage: 'RUN_POLL',
              meta: retryMeta,
            });
            continue;
          }

          setVoteStatusState((prev) => ({
            ...prev,
            [gameId]: {
              status: 'error',
              error: errorMessage,
            },
          }));
          emitFlowEvent('onRunFail', 'RUNNING', {
            gameId,
            flowId: options.flowId,
            errorCode: 'NETWORK',
            recoverable: true,
            copyKey: getPredictionCopyKey('NETWORK'),
            stage: 'RUN_POLL',
            retryConfig: {
              errorCode: 'NETWORK',
              recoverable: true,
              retryEnabled: true,
              keepDraft: true,
              actionPriorityOrder: ['RETRY', 'GO_LIST'],
            },
            recoveryAction: 'RETRY',
            meta: retryMeta,
          });
          showPredictionErrorOverlay('NETWORK', {
            message: errorMessage,
            copyKey: getPredictionCopyKey('NETWORK'),
            recovery: {
              recoverable: true,
              retryEnabled: true,
              keepDraft: true,
              actionPriorityOrder: ['RETRY', 'GO_LIST'],
            },
            onRetry: () => {
              void loadVoteStatus(gameId, {
                source: 'overlay',
                flowId: options.flowId,
                restoredFromSession: options.restoredFromSession,
              });
            },
            onGoList: () => {
              goToPredictionRecovery({ currentGameId: gameId });
            },
          });
          return false;
        }

        setVoteStatusState((prev) => ({
          ...prev,
          [gameId]: {
            status: 'error',
            error: errorMessage,
          },
        }));
        emitFlowEvent('onRunFail', 'RUNNING', {
          gameId,
          flowId: options.flowId,
          errorCode,
          recoverable: true,
          copyKey: getPredictionCopyKey(errorCode),
          stage: 'RUN_POLL',
          retryConfig: {
            errorCode,
            recoverable: true,
            retryEnabled: true,
            keepDraft: true,
            actionPriorityOrder: ['RETRY', 'GO_LIST'],
          },
          recoveryAction: 'RETRY',
        });
        showPredictionErrorOverlay(errorCode, {
          message: errorMessage,
          copyKey: getPredictionCopyKey(errorCode),
          recovery: {
            recoverable: true,
            retryEnabled: true,
            keepDraft: true,
            actionPriorityOrder: ['RETRY', 'GO_LIST'],
          },
          onRetry: () => {
            void loadVoteStatus(gameId, {
              source: 'overlay',
              flowId: options.flowId,
              restoredFromSession: options.restoredFromSession,
            });
          },
          onGoList: () => {
            goToPredictionRecovery({ currentGameId: gameId });
          },
        });
        return false;
      }
    }
  }, [
    emitFlowEvent,
    goToPredictionRecovery,
    nextNetworkRetryAttempt,
    resetNetworkRetryAttempt,
    showOfflineToastOnce,
    showPredictionErrorOverlay,
  ]);

  const reloadVoteStatus = useCallback(async (
    gameId: string,
    options: LoadVoteStatusOptions = {}
  ) => {
    return loadVoteStatus(gameId, {
      source: options.source ?? 'manual',
      emitRetryEvent: options.emitRetryEvent,
      flowId: options.flowId,
      restoredFromSession: options.restoredFromSession,
    });
  }, [loadVoteStatus]);

  const reloadCurrentVoteStatus = useCallback((
    options: {
      emitRetryEvent?: boolean;
      source?: LoadVoteStatusOptions['source'];
      flowId?: string;
      restoredFromSession?: boolean;
    } = {}
  ) => {
    const nextCurrentGameId = getCurrentGameId();
    if (!nextCurrentGameId) {
      return;
    }

    if (options.emitRetryEvent !== false) {
      emitFlowEvent('onErrorOverlayRetry', 'ERROR', {
        gameId: nextCurrentGameId,
        recoveryAction: 'RETRY',
      });
    }
    setVoteStatusState((prev) => ({
      ...prev,
      [nextCurrentGameId]: { status: 'idle' },
    }));
    void loadVoteStatus(nextCurrentGameId, {
      source: options.source ?? 'manual',
      flowId: options.flowId,
      restoredFromSession: options.restoredFromSession,
    });
  }, [emitFlowEvent, getCurrentGameId, loadVoteStatus]);

  const reloadCurrentGameDetail = useCallback((
    options: {
      emitRetryEvent?: boolean;
    } = {}
  ) => {
    const nextCurrentGameId = getCurrentGameId();
    if (!nextCurrentGameId) {
      return;
    }

    if (options.emitRetryEvent !== false) {
      emitFlowEvent('onErrorOverlayRetry', 'ERROR', {
        gameId: nextCurrentGameId,
        recoveryAction: 'RETRY',
        toastKey: 'run_retry_started',
      });
    }
    const hasExistingData = hasRenderableGameDetail(gameDetails[nextCurrentGameId]);
    setGameDetails((prev) => ({
      ...prev,
      [nextCurrentGameId]: {
        status: hasExistingData ? 'ready' : 'idle',
        data: prev[nextCurrentGameId]?.data ?? null,
        error: undefined,
        errorCode: undefined,
        isSeeded: false,
        isBackgroundRefreshing: hasExistingData,
        hasRenderableData: hasRenderableGameDetail(prev[nextCurrentGameId]),
      },
    }));
    const requestId = ++detailRequestRef.current;
    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
    }
    const abortController = new AbortController();
    detailAbortRef.current = abortController;
    void loadGameDetail(nextCurrentGameId, requestId, abortController.signal, {
      backgroundRefresh: hasExistingData,
      showLoadingToast: options.emitRetryEvent !== false,
    });
  }, [emitFlowEvent, gameDetails, getCurrentGameId, loadGameDetail]);

  const primeGameDetail = useCallback((
    gameId: string,
    detail: GameDetail,
    options: { isSeeded?: boolean } = {}
  ) => {
    setGameDetails((prev) => ({
      ...prev,
      [gameId]: {
        status: 'ready',
        data: detail,
        error: undefined,
        errorCode: undefined,
        isSeeded: options.isSeeded ?? true,
        isBackgroundRefreshing: false,
        hasRenderableData: true,
      },
    }));
  }, []);

  const primeGameDetailError = useCallback((gameId: string, message: string, errorCode?: string | null) => {
    setGameDetails((prev) => ({
      ...prev,
      [gameId]: {
        status: 'error',
        data: prev[gameId]?.data ?? null,
        error: message,
        errorCode: errorCode ?? undefined,
        isSeeded: false,
        isBackgroundRefreshing: false,
        hasRenderableData: hasRenderableGameDetail(prev[gameId]),
      },
    }));
  }, []);

  const primeVoteStatus = useCallback((
    gameId: string,
    status: { homeVotes?: number | null; awayVotes?: number | null; totalVotes?: number | null }
  ) => {
    const homeVotes = Math.max(0, Number(status.homeVotes ?? 0) || 0);
    const awayVotes = Math.max(0, Number(status.awayVotes ?? 0) || 0);
    const partialReason = status.totalVotes == null
      ? PREDICTION_PARTIAL_REASON_TOTAL_VOTES_MISSING
      : null;

    setVotes((prev) => ({
      ...prev,
      [gameId]: {
        home: homeVotes,
        away: awayVotes,
      },
    }));
    setVoteStatusState((prev) => ({
      ...prev,
      [gameId]: {
        status: 'ready',
      },
    }));
    setPartialReasonsByGameId((prev) => ({
      ...prev,
      [gameId]: partialReason,
    }));
  }, []);

  const primeVoteStatusError = useCallback((gameId: string, message: string) => {
    setVoteStatusState((prev) => ({
      ...prev,
      [gameId]: {
        status: 'error',
        error: message,
      },
    }));
  }, []);

  useEffect(() => {
    if (!currentGameId || !shouldLoadCurrentGameData) {
      return;
    }

    const activeState = voteStatusState[currentGameId];
    if (!activeState || activeState.status === 'idle') {
      void loadVoteStatus(currentGameId);
    }
  }, [currentGameId, loadVoteStatus, shouldLoadCurrentGameData, voteStatusState]);

  useEffect(() => {
    if (!currentGameId || !shouldLoadCurrentGameData) {
      return;
    }

    const detailState = gameDetails[currentGameId];
    if (detailState?.status === 'loading' || detailState?.status === 'error') {
      return;
    }

    const isSeededReady = detailState?.status === 'ready' && detailState.isSeeded === true;
    if (detailState?.status === 'ready' && (!isSeededReady || hasInningScoreData(detailState.data))) {
      return;
    }

    const requestId = ++detailRequestRef.current;
    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
    }
    const abortController = new AbortController();
    detailAbortRef.current = abortController;
    void loadGameDetail(currentGameId, requestId, abortController.signal, {
      backgroundRefresh: isSeededReady,
    });
  }, [currentGameId, gameDetails, loadGameDetail, shouldLoadCurrentGameData]);

  useEffect(() => {
    if (!currentGameId || !shouldLoadCurrentGameData) {
      return;
    }
    if (!shouldStartCurrentLivePolling) {
      return;
    }
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let disposed = false;
    let started = false;
    let intervalId: number | null = null;
    const tick = () => {
      if (disposed || document.visibilityState === 'hidden') {
        return;
      }
      void (async () => {
        const shouldContinue = await loadLiveSnapshot(currentGameId, currentGameRef.current);
        if (!shouldContinue || disposed) {
          return;
        }
        if (isLiveRelayPollingSuppressed(currentGameId, currentGameRef.current)) {
          return;
        }
        await loadLiveRelaySnapshot(currentGameId, currentGameRef.current);
      })();
    };
    const startPolling = () => {
      if (disposed || started) {
        return;
      }
      started = true;
      tick();
      intervalId = window.setInterval(tick, LIVE_GAME_POLL_INTERVAL_MS);
    };
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') {
        liveSnapshotAbortRef.current?.abort();
        liveRelayAbortRef.current?.abort();
        return;
      }
      if (started) {
        tick();
      }
    };

    const cancelDeferredStart = schedulePredictionPostPaintIdleWork(startPolling);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      disposed = true;
      cancelDeferredStart();
      liveSnapshotAbortRef.current?.abort();
      liveRelayAbortRef.current?.abort();
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [
    currentGameId,
    currentGame,
    isLiveRelayPollingSuppressed,
    loadLiveRelaySnapshot,
    loadLiveSnapshot,
    shouldLoadCurrentGameData,
    shouldStartCurrentLivePolling,
  ]);

  useEffect(() => {
    return () => {
      if (voteStatusAbortRef.current) {
        voteStatusAbortRef.current.abort();
        voteStatusAbortRef.current = null;
      }
      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
        detailAbortRef.current = null;
      }
      if (liveSnapshotAbortRef.current) {
        liveSnapshotAbortRef.current.abort();
        liveSnapshotAbortRef.current = null;
      }
      if (liveRelayAbortRef.current) {
        liveRelayAbortRef.current.abort();
        liveRelayAbortRef.current = null;
      }
    };
  }, []);

  return {
    votes,
    voteStatusState,
    voteStatusError,
    voteStatusLoading,
    isCurrentVotePartial,
    currentVotePartialReason,
    gameDetails,
    currentGameDetail,
    currentGameDetailLoading,
    currentGameDetailRefreshing,
    currentGameDetailHasRenderableData,
    currentGameDetailError,
    currentGameDetailErrorCode,
    loadVoteStatus,
    reloadVoteStatus,
    reloadCurrentVoteStatus,
    reloadCurrentGameDetail,
    setVoteStatusState,
    primeGameDetail,
    primeGameDetailError,
    primeVoteStatus,
    primeVoteStatusError,
  };
};
