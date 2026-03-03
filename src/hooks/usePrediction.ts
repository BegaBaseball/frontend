import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { useOptionalConfirmDialog } from '../components/contexts/ConfirmDialogContext';
import { Game, DateGames, VoteStatus, VoteTeam, PredictionTab, GameDetail, MatchBounds } from '../types/prediction';
import { parseError } from '../utils/errorUtils';
import {
  fetchMatchBounds,
  fetchMatchesByRange,
  fetchAllUserVotesBulk as fetchAllUserVotesBulkAPI,
  fetchMatchesByRangeWithMeta,
  fetchVoteStatus,
  submitVote,
  cancelVote,
  fetchGameDetail
} from '../api/prediction';
import {
  groupByDate,
  getTodayString,
  getTomorrowString,
  formatDate,
} from '../utils/prediction';
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
import {
  resolveDeepLinkSelection,
  resolveInitialPredictionDateIndex,
  normalizePredictionDate,
} from '../utils/predictionHomeLogic';
import { getFullTeamName } from '../constants/teams';
import {
  PredictionFlowState,
  PredictionErrorCode,
  PredictionFlowEventName,
  PredictionFlowStage,
  PredRecoveryAction,
  PredictionErrorState,
  type PredictionRecoveryState,
  type PredictionRunEvent,
} from '../types/predictionFlow';
import {
  emitPredictionFlowEvent,
} from '../utils/predictionFlowTelemetry';

type UserVoteRecord = {
  [key: string]: VoteTeam | null;
};

type VoteRequestState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
};

type GameDetailRequestState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: GameDetail | null;
  error?: string;
};

type RangeLoadState = 'idle' | 'ready' | 'loading' | 'end' | 'error';

type ErrorOverlayAction = () => Promise<void> | void;
type PredictionPartialReason = 'totalVotes_missing';
type VoteStatusLoadSource = 'auto' | 'manual' | 'overlay' | 'session-restore';

type LoadVoteStatusOptions = {
  source?: VoteStatusLoadSource;
  emitRetryEvent?: boolean;
  flowId?: string;
  restoredFromSession?: boolean;
};

type RunSessionRestoreTrigger = 'mount' | 'visibilitychange' | 'pageshow';

type PredictionErrorOverlayState = {
  isOpen: boolean;
  title?: string;
  message?: string;
  errorCode: PredictionErrorCode;
  copyKey: PredictionRunEvent['copyKey'];
  toastKey?: PredictionRunEvent['toastKey'];
  recoveryState: PredictionRecoveryState;
  onRetry?: ErrorOverlayAction;
  onFallback?: ErrorOverlayAction;
  onGoList?: ErrorOverlayAction;
  onGoBack?: ErrorOverlayAction;
};

const USER_VOTE_BATCH_TTL_MS = 30 * 1000;
const INITIAL_MATCH_WINDOW_PAST_DAYS = 3;
const INITIAL_MATCH_WINDOW_FUTURE_DAYS = 7;
const MATCH_WINDOW_EXTEND_DAYS = 7;
const MATCH_FETCH_SIZE = 150;
const PREDICTION_RUN_WARNING_TIMEOUT_MS = 15_000;
const PREDICTION_RUN_FATAL_TIMEOUT_MS = 45_000;
const PREDICTION_GAME_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const PREDICTION_OFFLINE_TOAST_MESSAGE = '오프라인 상태입니다. 네트워크 연결 후 자동으로 재시도합니다.';
const PREDICTION_PARTIAL_REASON_TOTAL_VOTES_MISSING: PredictionPartialReason = 'totalVotes_missing';

const toPredictionGameId = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return PREDICTION_GAME_ID_PATTERN.test(normalized) ? normalized : null;
};

const predictionUserVoteRequests = new Map<string, Promise<UserVoteRecord>>();
const predictionUserVoteCache = new Map<string, { votes: UserVoteRecord; fetchedAt: number }>();

const toDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (base: string, dayOffset: number): string => {
  const date = new Date(base);
  date.setDate(date.getDate() + dayOffset);
  return toDateString(date);
};

const mergeMatchLists = (base: Game[], incoming: Game[]): Game[] => {
  const seen = new Set(base.map((game) => game.gameId));
  const merged = [...base];

  incoming.forEach((game) => {
    if (!game?.gameId) {
      return;
    }
    if (seen.has(game.gameId)) {
      return;
    }
    seen.add(game.gameId);
    merged.push(game);
  });

  return merged;
};

export const usePrediction = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const optionalConfirmDialog = useOptionalConfirmDialog();
  const fallbackConfirm = (
    options: Parameters<NonNullable<typeof optionalConfirmDialog>['confirm']>[0]
  ) => new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    const message = options.description
      ? `${options.title}\n\n${options.description}`
      : options.title;
    resolve(window.confirm(message));
  });
  const confirm = optionalConfirmDialog?.confirm ?? fallbackConfirm;

  // 탭 관리
  const [activeTab, setActiveTab] = useState<PredictionTab>('match');
  const [selectedGame, setSelectedGame] = useState(0);

  // 날짜별 경기 데이터
  const [allDatesData, setAllDatesData] = useState<DateGames[]>([]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchesLoadState, setMatchesLoadState] = useState<'idle' | 'ready' | 'error'>('idle');
  const [matchesLoadErrorMessage, setMatchesLoadErrorMessage] = useState<string | null>(null);
  const [pastRangeLoadState, setPastRangeLoadState] = useState<RangeLoadState>('idle');
  const [pastRangeLoadErrorMessage, setPastRangeLoadErrorMessage] = useState<string | null>(null);
  const [futureRangeLoadState, setFutureRangeLoadState] = useState<RangeLoadState>('idle');
  const [futureRangeLoadErrorMessage, setFutureRangeLoadErrorMessage] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const [deepLinkNotice, setDeepLinkNotice] = useState<string | null>(null);
  const [deepLinkParamValidationNotice, setDeepLinkParamValidationNotice] = useState<string | null>(null);
  const [isRunInProgress, setIsRunInProgress] = useState(false);
  const [isRunBannerDismissed, setIsRunBannerDismissed] = useState(false);
  const [runProgressMessage, setRunProgressMessage] = useState('예측을 준비 중입니다.');
  const [partialReasonsByGameId, setPartialReasonsByGameId] = useState<Record<string, PredictionPartialReason | null>>({});

  // 투표 현황
  const [votes, setVotes] = useState<{ [key: string]: VoteStatus }>({});
  const [voteStatusState, setVoteStatusState] = useState<{ [key: string]: VoteRequestState }>({});

  // 사용자 투표
  const [userVote, setUserVote] = useState<{ [key: string]: VoteTeam | null }>({});

  // 경기 상세 정보
  const [gameDetails, setGameDetails] = useState<{ [key: string]: GameDetailRequestState }>({});
  const [predictionErrorOverlay, setPredictionErrorOverlay] = useState<PredictionErrorOverlayState | null>(null);
  const [runStartAt, setRunStartAt] = useState<number | null>(null);

  const isFetchingAllGamesRef = useRef(false);
  const futureLoadActiveRef = useRef(false);
  const pastLoadActiveRef = useRef(false);
  const canLoadMoreFutureRef = useRef(true);
  const canLoadMorePastRef = useRef(true);
  const futureWindowCursorRef = useRef<string>('');
  const futureWindowPageRef = useRef(0);
  const futureWindowStartRef = useRef('');
  const futureWindowEndRef = useRef('');
  const pastWindowCursorRef = useRef<string>('');
  const pastWindowPageRef = useRef(0);
  const pastWindowStartRef = useRef('');
  const pastWindowEndRef = useRef('');
  const hasAppliedDeepLinkRef = useRef(false);
  const previousDeepLinkSignatureRef = useRef('');
  const skipDateResetRef = useRef(false);
  const listRangeRequestRef = useRef(0);
  const initialListRequestRef = useRef(0);
  const pastRangeRequestRef = useRef(0);
  const futureRangeRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const voteStatusRequestRef = useRef(0);
  const voteStatusAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);
  const matchBoundsRef = useRef<MatchBounds | null>(null);
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
  const rawDeepLinkGameId = (searchParams.get('gameId') || '').trim();
  const rawDeepLinkDate = (searchParams.get('date') || '').trim();
  const deepLinkGameId = rawDeepLinkGameId ? toPredictionGameId(rawDeepLinkGameId) || '' : '';
  const deepLinkDate = rawDeepLinkDate ? normalizePredictionDate(rawDeepLinkDate) || '' : '';

  useEffect(() => {
    const nextSignature = `${deepLinkGameId}|${deepLinkDate}`;
    if (previousDeepLinkSignatureRef.current === nextSignature) {
      return;
    }

    previousDeepLinkSignatureRef.current = nextSignature;
    hasAppliedDeepLinkRef.current = false;
    setDeepLinkNotice(null);
  }, [deepLinkGameId, deepLinkDate]);

  useEffect(() => {
    runInProgressRef.current = isRunInProgress;
  }, [isRunInProgress]);

  useEffect(() => {
    patchRunSession({ bannerDismissed: isRunBannerDismissed });
  }, [isRunBannerDismissed]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(searchParams);
    let hasChange = false;
    let invalidNotice: string | null = null;

    if (rawDeepLinkGameId) {
      const normalizedGameId = toPredictionGameId(rawDeepLinkGameId);
      if (!normalizedGameId) {
        nextSearchParams.delete('gameId');
        hasChange = true;
        invalidNotice = '요청 경로의 gameId 형식이 유효하지 않아 링크를 무시했습니다.';
      } else if (normalizedGameId !== rawDeepLinkGameId) {
        nextSearchParams.set('gameId', normalizedGameId);
        hasChange = true;
      }
    }

    if (rawDeepLinkDate) {
      const normalizedDate = normalizePredictionDate(rawDeepLinkDate);
      if (!normalizedDate) {
        nextSearchParams.delete('date');
        hasChange = true;
        invalidNotice = invalidNotice
          ? `${invalidNotice} 날짜 파라미터도 함께 무효합니다.`
          : '요청 경로의 date 형식이 유효하지 않아 링크를 무시했습니다.';
      } else if (normalizedDate !== rawDeepLinkDate) {
        nextSearchParams.set('date', normalizedDate);
        hasChange = true;
      }
    }

    if (hasChange && nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams, { replace: true });
    }

    setDeepLinkParamValidationNotice(invalidNotice);
  }, [rawDeepLinkGameId, rawDeepLinkDate, searchParams.toString()]);

  const currentUserVoteKey = user?.id || 'anonymous';

  const fetchAndCacheUserVotes = async (
    gameIds: string[],
    requestKeySuffix: string,
    requestGuard?: number | (() => boolean)
  ) => {
    const isStale = () => {
      if (typeof requestGuard === 'function') {
        return requestGuard();
      }
      if (typeof requestGuard === 'number') {
        return listRangeRequestRef.current !== requestGuard;
      }
      return false;
    };

    const normalizedIds = Array.from(new Set(gameIds.filter(Boolean))).sort();
    if (!normalizedIds.length) {
      return;
    }

    const cacheKey = `${currentUserVoteKey}:${requestKeySuffix}:${normalizedIds.join('|')}`;
    const now = Date.now();
    const cachedBatch = predictionUserVoteCache.get(cacheKey);

    if (cachedBatch && now - cachedBatch.fetchedAt < USER_VOTE_BATCH_TTL_MS) {
      setUserVote((prev) => {
        const nextVotes = { ...prev };
        Object.entries(cachedBatch.votes).forEach(([key, value]) => {
          nextVotes[key] = value;
        });
        return nextVotes;
      });
      return;
    }

    const existingRequest = predictionUserVoteRequests.get(cacheKey);
    const inFlight = existingRequest || fetchAllUserVotesBulkAPI(normalizedIds).finally(() => {
      predictionUserVoteRequests.delete(cacheKey);
    });

    predictionUserVoteRequests.set(cacheKey, inFlight);

    try {
      const userVotes = await inFlight;
      if (isStale()) {
        return;
      }
      if (Object.keys(userVotes).length > 0) {
        predictionUserVoteCache.set(cacheKey, {
          votes: userVotes,
          fetchedAt: Date.now(),
        });
      }
      setUserVote((prev) => ({
        ...prev,
        ...userVotes,
      }));
    } catch (error) {
      if (isCancelLikeError(error)) {
        return;
      }
      const parsedError = parseError(error);
      console.error('[prediction] 내 투표 조회 실패', parsedError.message || error);
      if (isStale()) {
        return;
      }

      setUserVote((prev) => {
        const nextVotes = { ...prev };
        normalizedIds.forEach((id) => {
          if (nextVotes[id] === undefined) {
            nextVotes[id] = null;
          }
        });
        return nextVotes;
      });
    }
  };

  const getFlowPlatform = (): 'mobile' | 'desktop' => {
    if (typeof window === 'undefined') {
      return 'desktop';
    }
    return window.innerWidth < 768 ? 'mobile' : 'desktop';
  };

  const isCancelLikeError = (error: unknown): boolean => {
    if (error == null) {
      return false;
    }

    const normalizedMessage = error instanceof Error ? error.message.toLowerCase() : '';

    return (
      (error instanceof DOMException && error.name === 'AbortError')
      || (error instanceof Error && (
        error.name === 'AbortError'
        || error.name === 'CanceledError'
        || normalizedMessage === 'canceled'
        || normalizedMessage.includes('canceled')
      ))
      || (
        typeof error === 'object'
        && (error as { code?: string }).code === 'ERR_CANCELED'
      )
    );
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

  const resetNetworkRetryAttempt = (actionKey: PredictionRetryActionKey) => {
    resetPredictionRetryAttempt(retryAttemptRef.current, actionKey);
    offlineToastShownRef.current[actionKey] = false;
  };

  const showOfflineToastOnce = (actionKey: PredictionRetryActionKey) => {
    if (offlineToastShownRef.current[actionKey]) {
      return;
    }
    offlineToastShownRef.current[actionKey] = true;
    toast.error(PREDICTION_OFFLINE_TOAST_MESSAGE);
  };

  const nextNetworkRetryAttempt = (actionKey: PredictionRetryActionKey) => {
    return increasePredictionRetryAttempt(retryAttemptRef.current, actionKey);
  };

  const upsertRunSession = (session: PredictionRunSessionV1 | null) => {
    runSessionRef.current = session;

    if (typeof window === 'undefined') {
      return;
    }

    if (!session) {
      window.sessionStorage.removeItem(PREDICTION_RUN_SESSION_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(PREDICTION_RUN_SESSION_STORAGE_KEY, JSON.stringify(session));
  };

  const patchRunSession = (patch: Partial<PredictionRunSessionV1>) => {
    const current = runSessionRef.current;
    if (!current) {
      return;
    }

    upsertRunSession({
      ...current,
      ...patch,
    });
  };

  const clearRunSession = () => {
    upsertRunSession(null);
  };

  const beginRunSession = (params: {
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
  };

  const setRunTimeoutStage = (stage: PredictionRunTimeoutStage) => {
    runTimeoutStageRef.current = stage;
    patchRunSession({ timeoutStage: stage });
  };

  const getRunProgressMessageByStage = (stage: PredictionRunTimeoutStage) => {
    if (stage === 'warning') {
      return '예측 처리 지연: 백그라운드로 전환해 계속 진행합니다.';
    }
    if (stage === 'fatal') {
      return '예측 응답이 오래 지연돼 복구 액션을 제공합니다.';
    }
    return '예측 처리 결과를 동기화하는 중입니다.';
  };

  const resetRunProgressState = () => {
    runInProgressRef.current = false;
    runTimeoutStageRef.current = 'none';
    setIsRunInProgress(false);
    setRunStartAt(null);
    setIsRunBannerDismissed(false);
    clearRunSession();
  };

  const isRangeResultCanceled = (error?: {
    message?: string;
    status?: number | null;
    code?: string;
  }): boolean => {
    if (!error) {
      return false;
    }

    const normalizedMessage = (error.message || '').toLowerCase();

    return (
      error.code === 'ERR_CANCELED'
      || error.code === 'ECONNABORTED'
      || error.code === 'ERR_CONNECTION_CLOSED'
      || (error.status === 0
        && (normalizedMessage.includes('canceled') || normalizedMessage.includes('aborted')))
      || normalizedMessage === 'canceled'
      || normalizedMessage.includes('canceled')
      || normalizedMessage.includes('abort')
    );
  };

  const resolveFlowScreen = (state: PredictionFlowState): string => {
    const base = getFlowPlatform();
    if (state === 'LIST') {
      return `pred-list-${base}`;
    }
    if (state === 'DETAIL_EDIT') {
      return `pred-detail-${base}`;
    }
    if (state === 'RUNNING') {
      return `pred-run-loading`;
    }
    if (state === 'RESULT') {
      return `pred-result-${base}`;
    }
    return `pred-error-overlay`;
  };

  const mapPredictionErrorCode = (parsedType: ReturnType<typeof parseError>['type']): PredictionErrorCode => {
    if (parsedType === 'NETWORK') {
      return 'NETWORK';
    }
    if (parsedType === 'AUTH') {
      return 'AUTH_EXPIRED';
    }
    if (parsedType === 'PERMISSION') {
      return 'AUTH_EXPIRED';
    }
    if (parsedType === 'NOT_FOUND') {
      return 'PARTIAL_DATA';
    }
    if (parsedType === 'SERVER') {
      return 'SERVER';
    }
    return 'UNKNOWN';
  };

  const isGoListAllowed = (errorCode: PredictionErrorCode): boolean => {
    return (
      errorCode === 'NETWORK'
      || errorCode === 'SERVER'
      || errorCode === 'TIMEOUT'
      || errorCode === 'PARTIAL_DATA'
      || errorCode === 'RENDER_FAIL'
    );
  };

  const normalizeRecoveryActionOrder = (
    errorCode: PredictionErrorCode,
    recoveryState: PredictionRecoveryState,
    callbacks: {
      onRetry?: ErrorOverlayAction;
      onFallback?: ErrorOverlayAction;
      onGoList?: ErrorOverlayAction;
      onGoBack?: ErrorOverlayAction;
    }
  ): PredRecoveryAction[] => {
    const hasRetry = Boolean(callbacks.onRetry) && recoveryState.recoverable && recoveryState.retryEnabled;
    const hasFallback = Boolean(callbacks.onFallback) && errorCode !== 'VALIDATION';
    const hasGoList = Boolean(callbacks.onGoList) && isGoListAllowed(errorCode);
    const hasGoBack = Boolean(callbacks.onGoBack);

    const requestedOrder = recoveryState.actionPriorityOrder.filter((action) => {
      if (action === 'RETRY') {
        return hasRetry;
      }
      if (action === 'FALLBACK_SIMPLE') {
        return hasFallback;
      }
      if (action === 'GO_LIST') {
        return hasGoList;
      }
      if (action === 'GO_BACK') {
        return hasGoBack;
      }
      return false;
    });

    const fallbackOrder: PredRecoveryAction[] = ['RETRY', 'FALLBACK_SIMPLE', 'GO_LIST', 'GO_BACK'];
    const actionSet = new Set<PredRecoveryAction>(requestedOrder);

    if (hasRetry) {
      actionSet.add('RETRY');
    }
    if (hasFallback) {
      actionSet.add('FALLBACK_SIMPLE');
    }
    if (hasGoList) {
      actionSet.add('GO_LIST');
    }
    if (hasGoBack) {
      actionSet.add('GO_BACK');
    }

    const ordered = fallbackOrder.filter((action) => actionSet.has(action));
    const hasAny = ordered.length > 0;

    if (!hasAny) {
      return [];
    }

    if (ordered.length >= 2) {
      return ordered.slice(0, 4);
    }

    const fallbackPair: PredRecoveryAction[] = hasFallback ? ['FALLBACK_SIMPLE', 'GO_BACK'] : [];
    if (hasRetry && ordered.includes('RETRY')) {
      if (hasGoList) {
        return ['RETRY', 'GO_LIST'];
      }
      if (hasFallback) {
        return ['RETRY', 'FALLBACK_SIMPLE'];
      }
      if (hasGoBack) {
        return ['RETRY', 'GO_BACK'];
      }
    }

    if (hasFallback && hasGoBack) {
      return ['FALLBACK_SIMPLE', 'GO_BACK'];
    }

    if (hasGoBack) {
      return ['GO_BACK'];
    }

    return ordered;
  };

  const mapVoteStatusErrorCode = (status?: number | null): PredictionErrorCode => {
    if (!status) {
      return 'NETWORK';
    }
    if (status === 401) {
      return 'AUTH_EXPIRED';
    }
    if (status >= 500) {
      return 'SERVER';
    }
    if (status === 400 || status === 422) {
      return 'VALIDATION';
    }
    if (status === 404) {
      return 'PARTIAL_DATA';
    }
    return 'UNKNOWN';
  };

  const getPredictionCopyKey = (errorCode: PredictionErrorCode): PredictionRunEvent['copyKey'] => {
    if (errorCode === 'NETWORK') {
      return 'network_error_message';
    }
    if (errorCode === 'AUTH_EXPIRED') {
      return 'auth_expired_message';
    }
    if (errorCode === 'VALIDATION') {
      return 'validation_hint';
    }
    if (errorCode === 'TIMEOUT') {
      return 'timeout_hint';
    }
    if (errorCode === 'PARTIAL_DATA' || errorCode === 'RENDER_FAIL') {
      return 'render_fallback_message';
    }
    return 'network_error_message';
  };

  const getNextFlowId = (gameId: string, action: 'vote' | 'cancel') => {
    const next = ++flowRunCounterRef.current;
    return `${gameId}-${action}-${next}`;
  };

  const buildRecoveryState = (
    errorCode: PredictionErrorCode,
    overrides: {
      recoverable?: boolean;
      retryEnabled?: boolean;
      keepDraft?: boolean;
      actionPriorityOrder?: PredRecoveryAction[];
    } = {}
  ): PredictionRecoveryState => ({
    errorCode,
    recoverable: overrides.recoverable ?? true,
    retryEnabled: overrides.retryEnabled ?? true,
    keepDraft: overrides.keepDraft ?? true,
    actionPriorityOrder: overrides.actionPriorityOrder ?? ['RETRY'],
  });

  const closePredictionErrorOverlay = () => {
    setPredictionErrorOverlay((current) => {
      if (!current?.isOpen) {
        return current;
      }

      emitFlowEvent('onErrorOverlayExit', 'ERROR', {
        errorCode: current.errorCode,
        copyKey: current.copyKey,
        retryConfig: current.recoveryState,
      });

      return null;
    });
  };

  const getRunElapsedMs = () => {
    if (!runStartAt) {
      return undefined;
    }
    return Date.now() - runStartAt;
  };

  const showPredictionErrorOverlay = (
    errorCode: PredictionErrorCode,
    config: {
      title?: string;
      message?: string;
      copyKey?: PredictionRunEvent['copyKey'];
      toastKey?: PredictionRunEvent['toastKey'];
      recovery?: Partial<PredictionRecoveryState>;
      onRetry?: ErrorOverlayAction;
      onFallback?: ErrorOverlayAction;
      onGoList?: ErrorOverlayAction;
      onGoBack?: ErrorOverlayAction;
    }
  ) => {
    const normalizedOnRetry = config.onRetry ?? (() => {});
    const normalizedOnFallback = config.onFallback ?? (() => {});
    const normalizedOnGoList = config.onGoList ?? (() => {
      if (typeof window === 'undefined') {
        return;
      }
      window.location.href = '/';
    });
    const normalizedOnGoBack = config.onGoBack ?? (() => {
      if (typeof window === 'undefined') {
        return;
      }
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.href = '/';
    });
    const recoveryState = buildRecoveryState(errorCode, config.recovery);
    const actionPriorityOrder = normalizeRecoveryActionOrder(errorCode, recoveryState, {
      onRetry: normalizedOnRetry,
      onFallback: normalizedOnFallback,
      onGoList: normalizedOnGoList,
      onGoBack: normalizedOnGoBack,
    });
    const normalizedRecoveryState: PredictionRecoveryState = {
      ...recoveryState,
      actionPriorityOrder,
    };

    setPredictionErrorOverlay({
      isOpen: true,
      title: config.title,
      message: config.message,
      errorCode,
      copyKey: config.copyKey ?? getPredictionCopyKey(errorCode),
      toastKey: config.toastKey,
      recoveryState: normalizedRecoveryState,
      onRetry: normalizedOnRetry,
      onFallback: normalizedOnFallback,
      onGoList: normalizedOnGoList,
      onGoBack: normalizedOnGoBack,
    });

    emitFlowEvent('onErrorOverlayFallback', 'ERROR', {
      errorCode,
      copyKey: config.copyKey ?? getPredictionCopyKey(errorCode),
      toastKey: config.toastKey,
      retryConfig: {
        ...normalizedRecoveryState,
      },
    });
  };

  const handlePredictionErrorOverlayAction = async (action: PredRecoveryAction) => {
    const overlayState = predictionErrorOverlay;
    if (!overlayState?.isOpen) {
      return;
    }

    if (action === 'RETRY' && overlayState.onRetry) {
      emitFlowEvent('onErrorOverlayRetry', 'ERROR', {
        errorCode: overlayState.errorCode,
        recoveryAction: 'RETRY',
        copyKey: overlayState.copyKey,
        retryConfig: {
          ...overlayState.recoveryState,
        },
      });
      setPredictionErrorOverlay((current) => (current ? { ...current, isOpen: false } : current));
      await overlayState.onRetry();
      return;
    }

    if (action === 'FALLBACK_SIMPLE' && overlayState.onFallback) {
      emitFlowEvent('onErrorOverlayFallback', 'ERROR', {
        errorCode: overlayState.errorCode,
        recoveryAction: 'FALLBACK_SIMPLE',
        copyKey: overlayState.copyKey,
        retryConfig: {
          ...overlayState.recoveryState,
        },
      });
      setPredictionErrorOverlay((current) => (current ? { ...current, isOpen: false } : current));
      await overlayState.onFallback();
      return;
    }

    if (action === 'GO_LIST' && overlayState.onGoList) {
      emitFlowEvent('onErrorOverlayFallback', 'ERROR', {
        errorCode: overlayState.errorCode,
        recoveryAction: 'GO_LIST',
        copyKey: overlayState.copyKey,
        retryConfig: {
          ...overlayState.recoveryState,
        },
      });
      setPredictionErrorOverlay((current) => (current ? { ...current, isOpen: false } : current));
      await overlayState.onGoList();
      return;
    }

    if (action === 'GO_BACK' && overlayState.onGoBack) {
      emitFlowEvent('onErrorOverlayFallback', 'ERROR', {
        errorCode: overlayState.errorCode,
        recoveryAction: 'GO_BACK',
        copyKey: overlayState.copyKey,
        retryConfig: {
          ...overlayState.recoveryState,
        },
      });
      setPredictionErrorOverlay((current) => (current ? { ...current, isOpen: false } : current));
      await overlayState.onGoBack();
      return;
    }

    setPredictionErrorOverlay((current) => (current ? { ...current, isOpen: false } : current));
  };

  const emitFlowEvent = (
    eventName: PredictionFlowEventName,
    eventState: PredictionFlowState,
    overrides: {
      errorCode?: PredictionErrorCode;
      stage?: PredictionFlowStage;
      elapsedMs?: number;
      keepDraft?: boolean;
      gameId?: string;
      errorState?: PredictionErrorState;
      recoveryState?: PredictionRecoveryState;
      tab?: 'match' | 'ranking';
      flowId?: string;
      predictionTabIndex?: number;
      recoverable?: boolean;
      retryable?: boolean;
      recoveryAction?: PredictionRunEvent['recoveryAction'];
      validation?: PredictionRunEvent['validation'];
      meta?: PredictionRunEvent['meta'];
      toastKey?: PredictionRunEvent['toastKey'];
      copyKey?: PredictionRunEvent['copyKey'];
      retryConfig?: PredictionRunEvent['retryConfig'];
      runProgressBannerAction?: PredictionRunEvent['runProgressBannerAction'];
    } = {}
  ) => {
    emitPredictionFlowEvent(eventName, {
      state: eventState,
      timestamp: new Date().toISOString(),
      platform: getFlowPlatform(),
      screenId: resolveFlowScreen(eventState),
      source: 'prediction-page',
      tab: activeTab,
      gameId: overrides.gameId ?? currentGameId ?? undefined,
      flowId: overrides.flowId,
      predictionTabIndex: activeTab === 'match' ? 0 : 1,
      recoverable: overrides.recoverable,
      retryable: overrides.retryable ?? overrides.recoverable,
      errorCode: overrides.errorCode,
      stage: overrides.stage,
      elapsedMs: overrides.elapsedMs,
      keepDraft: overrides.keepDraft,
      errorState: overrides.errorState,
      recoveryState: overrides.recoveryState,
      copyKey: overrides.copyKey,
      toastKey: overrides.toastKey,
      validation: overrides.validation,
      meta: overrides.meta,
      retryConfig: overrides.retryConfig,
      recoveryAction: overrides.recoveryAction,
      runProgressBannerAction: overrides.runProgressBannerAction,
    });
  };

  const emitRunProgressBannerAction = (action: 'bg' | 'foreground') => {
    if (!isRunInProgress) {
      return;
    }

    const currentGameIdValue = currentGameId;
    if (!currentGameIdValue) {
      return;
    }

    emitFlowEvent('onRunProgress', 'RUNNING', {
      gameId: currentGameIdValue,
      stage: 'RUN_POLL',
      keepDraft: true,
      copyKey: 'run_timeout',
      toastKey: action === 'bg' ? 'run_timeout' : 'run_started',
      runProgressBannerAction: action,
      meta: {
        action,
      },
    });
  };

  const dismissRunProgressBanner = () => {
    setIsRunBannerDismissed(true);
    patchRunSession({ bannerDismissed: true });
    emitRunProgressBannerAction('bg');
  };

  const resumeRunProgressBanner = () => {
    setIsRunBannerDismissed(false);
    patchRunSession({ bannerDismissed: false });
    emitRunProgressBannerAction('foreground');
  };

  const getWindowBounds = (baseDate: Date) => {
    const pastDate = addDays(toDateString(baseDate), -INITIAL_MATCH_WINDOW_PAST_DAYS);
    const futureDate = addDays(toDateString(baseDate), INITIAL_MATCH_WINDOW_FUTURE_DAYS);
    return { startDate: pastDate, endDate: futureDate };
  };

  const getEarliestBoundDate = () => {
    const bounds = matchBoundsRef.current;
    if (!bounds?.hasData) {
      return null;
    }
    return bounds.earliestGameDate;
  };

  const getLatestBoundDate = () => {
    const bounds = matchBoundsRef.current;
    if (!bounds?.hasData) {
      return null;
    }
    return bounds.latestGameDate;
  };

  const resetPastWindowState = () => {
    pastWindowPageRef.current = 0;
    pastWindowStartRef.current = '';
    pastWindowEndRef.current = '';
  };

  const resetFutureWindowState = () => {
    futureWindowPageRef.current = 0;
    futureWindowStartRef.current = '';
    futureWindowEndRef.current = '';
  };

  const setPastRangeEnd = (message: string = '더 이상 이전 경기가 없습니다.') => {
    canLoadMorePastRef.current = false;
    resetPastWindowState();
    setPastRangeLoadErrorMessage(message);
    setPastRangeLoadState('end');
  };

  const setFutureRangeEnd = (message: string = '더 이상 예정 경기가 없습니다.') => {
    canLoadMoreFutureRef.current = false;
    resetFutureWindowState();
    setFutureRangeLoadErrorMessage(message);
    setFutureRangeLoadState('end');
  };

  const setPastRangeError = (message: string) => {
    canLoadMorePastRef.current = false;
    resetPastWindowState();
    setPastRangeLoadErrorMessage(message);
    setPastRangeLoadState('error');
  };

  const normalizeFutureRangeErrorMessage = (message?: string) => {
    const normalized = (message || '').trim();
    if (!normalized) {
      return '미래 구간 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.';
    }
    return normalized;
  };

  const setFutureRangeError = (message: string) => {
    const normalizedMessage = normalizeFutureRangeErrorMessage(message);
    canLoadMoreFutureRef.current = false;
    resetFutureWindowState();
    setFutureRangeLoadErrorMessage(normalizedMessage);
    setFutureRangeLoadState('error');
    showPredictionErrorOverlay('NETWORK', {
      message: normalizedMessage,
      copyKey: 'network_error_message',
      recovery: {
        errorCode: 'NETWORK',
        recoverable: true,
        retryEnabled: true,
        keepDraft: true,
        actionPriorityOrder: ['RETRY', 'GO_LIST'],
      },
      onRetry: () => {
        retryLoadMoreFutureMatches();
      },
      onGoList: () => {
        window.location.href = '/';
      },
    });
  };

  const restorePastRangeLoadState = () => {
    setPastRangeLoadState(canLoadMorePastRef.current ? 'ready' : 'end');
    setPastRangeLoadErrorMessage(canLoadMorePastRef.current ? null : '더 이상 이전 경기가 없습니다.');
  };

  const restoreFutureRangeLoadState = () => {
    setFutureRangeLoadState(canLoadMoreFutureRef.current ? 'ready' : 'end');
    setFutureRangeLoadErrorMessage(canLoadMoreFutureRef.current ? null : '더 이상 예정 경기가 없습니다.');
  };

  const getCurrentGame = () => {
    const currentDateGames = allDatesData[currentDateIndex]?.games || [];
    return currentDateGames[selectedGame] || null;
  };

  const getCurrentGameId = () => getCurrentGame()?.gameId || null;

  const loadGameDetail = async (
    gameId: string,
    requestId: number,
    signal?: AbortSignal
  ) => {
    emitFlowEvent('onRunProgress', 'RUNNING', {
      gameId,
      meta: { requestType: 'gameDetail', requestId },
      stage: 'RUN_POLL',
    });

    setGameDetails((prev) => ({
      ...prev,
      [gameId]: {
        status: 'loading',
        data: prev[gameId]?.data ?? null,
        error: undefined,
      },
    }));

    try {
      const detail = await fetchGameDetail(gameId, { signal });
      if (requestId !== detailRequestRef.current) {
        return;
      }
      setGameDetails((prev) => ({
        ...prev,
        [gameId]: {
          status: 'ready',
          data: detail,
          error: undefined,
        },
      }));
      emitFlowEvent('onResultSuccess', 'RESULT', {
        gameId,
      });
    } catch (error: unknown) {
      if (requestId !== detailRequestRef.current) {
        return;
      }
      if (isCancelLikeError(error)) {
        return;
      }

      const parsedError = parseError(error);
      const mappedErrorCode = mapPredictionErrorCode(parsedError.type);
      setGameDetails((prev) => ({
        ...prev,
        [gameId]: {
          status: 'error',
          data: prev[gameId]?.data ?? null,
          error: parsedError.message || '경기 상세를 불러오지 못했습니다.',
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
      toast.error(parsedError.message || '경기 상세를 불러오지 못했습니다.');
    }
  };

  const reloadMatches = () => {
    emitFlowEvent('onListRetry', 'LIST', {
      recoverable: true,
      copyKey: 'network_error_message',
      stage: 'LIST_RETRY',
      retryConfig: {
        errorCode: 'NETWORK',
        recoverable: true,
        retryEnabled: true,
        keepDraft: true,
        actionPriorityOrder: ['RETRY', 'GO_LIST'],
      },
    });
    fetchAllGames(true);
  };

  const setNoMatchesInWindowState = () => {
    const fallbackDate = getTodayString();
    const bounds = matchBoundsRef.current;
    const hasBoundsData = Boolean(bounds?.hasData && bounds.earliestGameDate && bounds.latestGameDate);
    const boundsUnavailable = !bounds;
    const earliestBoundDate = hasBoundsData ? bounds?.earliestGameDate : null;
    const latestBoundDate = hasBoundsData ? bounds?.latestGameDate : null;
    const canLoadPast = hasBoundsData
      ? Boolean(earliestBoundDate && earliestBoundDate < fallbackDate)
      : boundsUnavailable;
    const canLoadFuture = hasBoundsData
      ? Boolean(latestBoundDate && latestBoundDate > fallbackDate)
      : boundsUnavailable;

    setMatchesLoadState('ready');
    setAllDatesData([{ date: fallbackDate, games: [] }]);
    setCurrentDateIndex(0);
    setMatchesLoadErrorMessage(null);
    setPastRangeLoadState(canLoadPast ? 'ready' : 'end');
    setFutureRangeLoadState(canLoadFuture ? 'ready' : 'end');
    setPastRangeLoadErrorMessage(canLoadPast ? null : '더 이상 이전 경기가 없습니다.');
    setFutureRangeLoadErrorMessage(canLoadFuture ? null : '더 이상 예정 경기가 없습니다.');
    futureWindowCursorRef.current = '';
    resetFutureWindowState();
    canLoadMoreFutureRef.current = canLoadFuture;
    futureLoadActiveRef.current = false;
    pastWindowCursorRef.current = '';
    resetPastWindowState();
    canLoadMorePastRef.current = canLoadPast;
    pastLoadActiveRef.current = false;
  };

  const fetchAllGames = async (forced: boolean = false) => {
    if (isFetchingAllGamesRef.current && !forced) {
      return;
    }

    const requestId = ++initialListRequestRef.current;
    listRangeRequestRef.current = requestId;
    pastRangeRequestRef.current += 1;
    futureRangeRequestRef.current += 1;

    isFetchingAllGamesRef.current = true;
    futureLoadActiveRef.current = false;
    canLoadMoreFutureRef.current = true;
    pastLoadActiveRef.current = false;
    canLoadMorePastRef.current = true;
    pastWindowCursorRef.current = '';
    pastWindowPageRef.current = 0;
    pastWindowStartRef.current = '';
    pastWindowEndRef.current = '';
    futureWindowCursorRef.current = '';
    futureWindowPageRef.current = 0;
    futureWindowStartRef.current = '';
    futureWindowEndRef.current = '';
    emitFlowEvent('onListLoad', 'LIST', {
      recoverable: true,
      meta: { forced },
      toastKey: 'list_load_success',
      stage: forced ? 'LIST_RETRY' : 'LIST_LOAD',
    });
    setMatchesLoadState('idle');
    setPastRangeLoadState('idle');
    setFutureRangeLoadState('idle');
    setMatchesLoadErrorMessage(null);
    setPastRangeLoadErrorMessage(null);
    setFutureRangeLoadErrorMessage(null);
    setDeepLinkNotice(null);

    try {
      setLoading(true);

      const boundsResult = await fetchMatchBounds();
      if (initialListRequestRef.current !== requestId) {
        return;
      }
      matchBoundsRef.current = boundsResult.ok ? boundsResult.data : null;

      const today = getTodayString();
      const { startDate, endDate } = getWindowBounds(new Date());

      const firstPage = await fetchMatchesByRange({
        startDate,
        endDate,
        page: 0,
        size: MATCH_FETCH_SIZE,
        includePast: true,
      });

      if (initialListRequestRef.current !== requestId) {
        return;
      }

      if (!firstPage.length) {
        setNoMatchesInWindowState();
        return;
      }

      if (initialListRequestRef.current !== requestId) {
        return;
      }

      let allMatches = [...firstPage];
      const allDates = groupByDate(allMatches);

      if (allDates.length === 0) {
        setNoMatchesInWindowState();
        return;
      }

      if (initialListRequestRef.current !== requestId) {
        return;
      }

      if (!allDates.some((d) => d.date >= today && d.games.length > 0)) {
        allDates.push({ date: addDays(today, 1), games: [] });
      }

      let normalizedDates = allDates;
      normalizedDates.sort((a, b) => a.date.localeCompare(b.date));

      const todayExists = normalizedDates.some((entry) => entry.date === today);
      if (!todayExists) {
        normalizedDates.push({ date: today, games: [] });
        normalizedDates.sort((a, b) => a.date.localeCompare(b.date));
      }

      if (initialListRequestRef.current !== requestId) {
        return;
      }

      setAllDatesData(normalizedDates);
      setCurrentDateIndex(resolveInitialPredictionDateIndex(normalizedDates, today));
      setMatchesLoadState('ready');
      emitFlowEvent('onListLoad', 'LIST', {
        toastKey: 'list_load_success',
        stage: 'LIST_LOAD',
      });

      const earliestDate = normalizedDates[0]?.date || today;
      const latestDate = normalizedDates[normalizedDates.length - 1]?.date || today;
      const earliestBoundDate = getEarliestBoundDate();
      const latestBoundDate = getLatestBoundDate();

      canLoadMorePastRef.current = earliestBoundDate ? earliestDate > earliestBoundDate : true;
      canLoadMoreFutureRef.current = latestBoundDate ? latestDate < latestBoundDate : true;
      setPastRangeLoadState(canLoadMorePastRef.current ? 'ready' : 'end');
      setFutureRangeLoadState(canLoadMoreFutureRef.current ? 'ready' : 'end');
      setPastRangeLoadErrorMessage(canLoadMorePastRef.current ? null : '더 이상 이전 경기가 없습니다.');
      setFutureRangeLoadErrorMessage(canLoadMoreFutureRef.current ? null : '더 이상 예정 경기가 없습니다.');

      pastWindowCursorRef.current = earliestDate;
      futureWindowCursorRef.current = latestDate;
      resetPastWindowState();
      resetFutureWindowState();

      if (initialListRequestRef.current !== requestId) {
        return;
      }

      const interactiveGames = allMatches.filter((game) => game.homeScore === null && game.awayScore === null);
      if (interactiveGames.length > 0) {
        await fetchAndCacheUserVotes(
          interactiveGames
            .map((game) => game.gameId)
            .filter((gameId) => !!gameId),
          'initial',
          () => initialListRequestRef.current !== requestId
        );
      }
    } catch (error) {
      if (isCancelLikeError(error)) {
        return;
      }
      const fallbackDate = getTodayString();
      setMatchesLoadState('error');
      setMatchesLoadErrorMessage('예측 경기 목록 조회에 실패했습니다.');
      setAllDatesData([{ date: fallbackDate, games: [] }]);
      setCurrentDateIndex(0);
      const parsedError = parseError(error);
      emitFlowEvent('onListLoadFail', 'LIST', {
        errorCode: mapPredictionErrorCode(parsedError.type),
        recoverable: true,
        copyKey: 'network_error_message',
        stage: 'LIST_LOAD',
        retryConfig: {
          errorCode: mapPredictionErrorCode(parsedError.type),
          recoverable: true,
          retryEnabled: true,
          keepDraft: true,
          actionPriorityOrder: ['RETRY', 'GO_LIST'],
        },
      });
      showPredictionErrorOverlay(mapPredictionErrorCode(parsedError.type), {
        message: parsedError.message || '예측 경기 목록 조회에 실패했습니다.',
        copyKey: 'network_error_message',
        recovery: {
          recoverable: true,
          retryEnabled: true,
          keepDraft: true,
          actionPriorityOrder: ['RETRY', 'GO_LIST'],
        },
        onRetry: () => {
          reloadMatches();
        },
        onGoList: () => {
          window.location.href = '/';
        },
      });
    } finally {
      setLoading(false);
      isFetchingAllGamesRef.current = false;
    }
  };

  const loadMoreFutureMatches = async (forceRetry: boolean = false, moveToLoadedFuture: boolean = false) => {
    if (futureLoadActiveRef.current || isFetchingAllGamesRef.current) {
      return;
    }

    if (!forceRetry && !canLoadMoreFutureRef.current) {
      return;
    }

    const latestBoundDate = getLatestBoundDate();
    const anchor = futureWindowCursorRef.current || getTodayString();
    const isContinueCurrentWindow = futureWindowPageRef.current > 0
      && Boolean(futureWindowStartRef.current)
      && Boolean(futureWindowEndRef.current);
    let nextStartDate = isContinueCurrentWindow
      ? futureWindowStartRef.current
      : addDays(anchor, 1);
    let nextEndDate = isContinueCurrentWindow
      ? futureWindowEndRef.current
      : addDays(anchor, MATCH_WINDOW_EXTEND_DAYS);
    let nextPage = isContinueCurrentWindow
      ? futureWindowPageRef.current
      : 0;

    if (latestBoundDate && nextStartDate > latestBoundDate) {
      setFutureRangeEnd();
      return;
    }

    if (!nextStartDate || !nextEndDate || nextStartDate > nextEndDate) {
      setFutureRangeEnd('탐색 가능한 예정 경기 구간이 없습니다.');
      return;
    }

    setFutureRangeLoadState('loading');
    setFutureRangeLoadErrorMessage(null);

    futureLoadActiveRef.current = true;
    const requestId = ++futureRangeRequestRef.current;
    const anchorDate = allDatesData[currentDateIndex]?.date || getTodayString();

    const maxEmptyPageRetries = 5;
    let emptyPageRetryCount = 0;
    let windowShiftCount = 0;
    const seenRequestKeys = new Set<string>();

    try {
      while (true) {
        if (latestBoundDate && nextStartDate > latestBoundDate) {
          setFutureRangeEnd();
          return;
        }

        const requestKey = `${nextStartDate}|${nextEndDate}|${nextPage}`;
        if (seenRequestKeys.has(requestKey)) {
          setFutureRangeEnd('같은 예정 경기 구간이 반복되어 탐색을 종료했습니다.');
          console.info('[prediction.range.end_reached]', {
            direction: 'future',
            reason: 'duplicate-window-page',
            requestKey,
          });
          return;
        }
        seenRequestKeys.add(requestKey);
        console.info('[prediction.range.load]', {
          direction: 'future',
          window: `${nextStartDate}~${nextEndDate}`,
          page: nextPage,
        });

        const result = await fetchMatchesByRangeWithMeta({
          startDate: nextStartDate,
          endDate: nextEndDate,
          includePast: true,
          page: nextPage,
          size: MATCH_FETCH_SIZE,
        });
        if (requestId !== futureRangeRequestRef.current) {
          return;
        }

        if (!result.ok) {
          if (isRangeResultCanceled(result.error)) {
            restoreFutureRangeLoadState();
            return;
          }
          console.warn('[prediction.range.error]', {
            direction: 'future',
            window: `${nextStartDate}~${nextEndDate}`,
            page: nextPage,
            message: result.error.message,
            status: result.error.status,
          });
          setFutureRangeError(result.error.message);
          return;
        }

        const nextMatches = result.data.content;
        const hasNext = result.data.hasNext;

        futureWindowStartRef.current = nextStartDate;
        futureWindowEndRef.current = nextEndDate;
        futureWindowPageRef.current = result.data.page;

        if (!nextMatches.length) {
          if (hasNext) {
            if (emptyPageRetryCount >= maxEmptyPageRetries) {
              setFutureRangeEnd('예정 경기 탐색을 종료했습니다. 다음 구간으로 이동해 주세요.');
              console.info('[prediction.range.end_reached]', {
                direction: 'future',
                reason: 'empty-page-retry-limit',
                window: `${nextStartDate}~${nextEndDate}`,
              });
              return;
            }

            emptyPageRetryCount += 1;
            nextPage = futureWindowPageRef.current + 1;
            futureWindowPageRef.current = nextPage;
            continue;
          }

          if (!latestBoundDate) {
            if (windowShiftCount >= 26) {
              setFutureRangeEnd('탐색 가능한 예정 경기가 없습니다.');
              return;
            }
            windowShiftCount += 1;
          }

          const candidateStartDate = addDays(nextEndDate, 1);
          const candidateEndDate = addDays(candidateStartDate, MATCH_WINDOW_EXTEND_DAYS);
          if (latestBoundDate && candidateStartDate > latestBoundDate) {
            setFutureRangeEnd();
            return;
          }

          nextStartDate = candidateStartDate;
          nextEndDate = candidateEndDate;
          nextPage = 0;
          resetFutureWindowState();
          emptyPageRetryCount = 0;
          continue;

        }

        const currentSortedGames = allDatesData.flatMap((item) => item.games);
        const merged = mergeMatchLists(currentSortedGames, nextMatches);
        const grouped = groupByDate(merged);
        const normalized = grouped.map((entry) => ({ ...entry, games: entry.games }));
        normalized.sort((a, b) => a.date.localeCompare(b.date));
        setAllDatesData(normalized);
        if (moveToLoadedFuture) {
          let targetDateIndex = normalized.findIndex((entry) => entry.date > anchorDate);

          if (targetDateIndex === -1) {
            const anchorIndex = normalized.findIndex((entry) => entry.date === anchorDate);
            targetDateIndex = anchorIndex !== -1 ? anchorIndex : currentDateIndex;
          }

          if (targetDateIndex !== currentDateIndex) {
            setCurrentDateIndex(targetDateIndex);
          }
        } else {
          const restoredDateIndex = normalized.findIndex((entry) => entry.date === anchorDate);
          if (restoredDateIndex !== -1 && restoredDateIndex !== currentDateIndex) {
            setCurrentDateIndex(restoredDateIndex);
          }
        }
        const interactiveFutureGames = nextMatches.filter((game) => game.homeScore === null && game.awayScore === null);
        if (interactiveFutureGames.length > 0) {
          await fetchAndCacheUserVotes(
            interactiveFutureGames
              .map((game) => game.gameId)
              .filter((gameId) => !!gameId),
            `future:${nextStartDate}`,
            () => futureRangeRequestRef.current !== requestId
          );
        }

        if (hasNext) {
          futureWindowPageRef.current = futureWindowPageRef.current + 1;
        } else {
          futureWindowCursorRef.current = nextEndDate;
          resetFutureWindowState();
        }

        const latestLoadedDate = normalized[normalized.length - 1]?.date || nextEndDate;
        canLoadMoreFutureRef.current = latestBoundDate ? latestLoadedDate < latestBoundDate : true;
        setFutureRangeLoadState(canLoadMoreFutureRef.current ? 'ready' : 'end');
        setFutureRangeLoadErrorMessage(canLoadMoreFutureRef.current ? null : '더 이상 예정 경기가 없습니다.');
        console.info('[prediction.range.load]', {
          direction: 'future',
          result: 'success',
          loadedCount: nextMatches.length,
          hasNext,
          canLoadMore: canLoadMoreFutureRef.current,
        });
        return;
      }
    } catch (error: unknown) {
      const castedError = error as { message?: string; code?: string; status?: number | null };
      if (isRangeResultCanceled({
        message: castedError?.message || '',
        status: castedError?.status,
        code: castedError?.code,
      })) {
        restoreFutureRangeLoadState();
        return;
      }
      if (isCancelLikeError(error)) {
        return;
      }
      console.error('[prediction.range.error]', {
        direction: 'future',
        message: '미래 경기 조회에 실패했습니다.',
      });
      setFutureRangeError('미래 경기 조회에 실패했습니다.');
    } finally {
      futureLoadActiveRef.current = false;
    }
  };

  const loadMorePastMatches = async (forceRetry: boolean = false, moveToLoadedPast: boolean = false) => {
    if (pastLoadActiveRef.current || isFetchingAllGamesRef.current) {
      return;
    }

    if (!forceRetry && !canLoadMorePastRef.current) {
      return;
    }

    const earliestLoadedDate = allDatesData[0]?.date || getTodayString();
    const earliestBoundDate = getEarliestBoundDate();
    const anchor = pastWindowCursorRef.current || earliestLoadedDate;
    const isContinueCurrentWindow = pastWindowPageRef.current > 0
      && Boolean(pastWindowStartRef.current)
      && Boolean(pastWindowEndRef.current);
    let nextEndDate = isContinueCurrentWindow
      ? pastWindowEndRef.current
      : addDays(anchor, -1);
    let nextStartDate = isContinueCurrentWindow
      ? pastWindowStartRef.current
      : addDays(nextEndDate, -(MATCH_WINDOW_EXTEND_DAYS - 1));
    let nextPage = isContinueCurrentWindow
      ? pastWindowPageRef.current
      : 0;

    if (earliestBoundDate && nextEndDate < earliestBoundDate) {
      setPastRangeEnd();
      return;
    }

    if (!nextStartDate || !nextEndDate || nextStartDate > nextEndDate) {
      setPastRangeEnd('탐색 가능한 이전 경기 구간이 없습니다.');
      return;
    }

    setPastRangeLoadState('loading');
    setPastRangeLoadErrorMessage(null);

    pastLoadActiveRef.current = true;
    const requestId = ++pastRangeRequestRef.current;

    const maxEmptyPageRetries = 5;
    let emptyPageRetryCount = 0;
    let windowShiftCount = 0;
    const anchorDate = allDatesData[currentDateIndex]?.date || getTodayString();
    const seenRequestKeys = new Set<string>();

    try {
      while (true) {
        if (earliestBoundDate && nextEndDate < earliestBoundDate) {
          setPastRangeEnd();
          return;
        }

        const requestKey = `${nextStartDate}|${nextEndDate}|${nextPage}`;
        if (seenRequestKeys.has(requestKey)) {
          setPastRangeEnd('같은 이전 경기 구간이 반복되어 탐색을 종료했습니다.');
          console.info('[prediction.range.end_reached]', {
            direction: 'past',
            reason: 'duplicate-window-page',
            requestKey,
          });
          return;
        }
        seenRequestKeys.add(requestKey);
        console.info('[prediction.range.load]', {
          direction: 'past',
          window: `${nextStartDate}~${nextEndDate}`,
          page: nextPage,
        });

        const result = await fetchMatchesByRangeWithMeta({
          startDate: nextStartDate,
          endDate: nextEndDate,
          includePast: true,
          page: nextPage,
          size: MATCH_FETCH_SIZE,
        });
        if (requestId !== pastRangeRequestRef.current) {
          return;
        }

        if (!result.ok) {
          if (isRangeResultCanceled(result.error)) {
            restorePastRangeLoadState();
            return;
          }
          console.warn('[prediction.range.error]', {
            direction: 'past',
            window: `${nextStartDate}~${nextEndDate}`,
            page: nextPage,
            message: result.error.message,
            status: result.error.status,
          });
          setPastRangeError(result.error.message);
          return;
        }

        const nextMatches = result.data.content;
        const hasNext = result.data.hasNext;

        pastWindowStartRef.current = nextStartDate;
        pastWindowEndRef.current = nextEndDate;
        pastWindowPageRef.current = result.data.page;

        if (!nextMatches.length) {
          if (hasNext) {
            if (emptyPageRetryCount >= maxEmptyPageRetries) {
              setPastRangeEnd('이전 경기 탐색을 종료했습니다. 다른 날짜를 확인해 주세요.');
              console.info('[prediction.range.end_reached]', {
                direction: 'past',
                reason: 'empty-page-retry-limit',
                window: `${nextStartDate}~${nextEndDate}`,
              });
              return;
            }

            emptyPageRetryCount += 1;
            nextPage = pastWindowPageRef.current + 1;
            pastWindowPageRef.current = nextPage;
            continue;
          }

          if (!earliestBoundDate) {
            if (windowShiftCount >= 26) {
              setPastRangeEnd('탐색 가능한 이전 경기가 없습니다.');
              return;
            }
            windowShiftCount += 1;
          }

          const candidateEndDate = addDays(nextStartDate, -1);
          const candidateStartDate = addDays(candidateEndDate, -(MATCH_WINDOW_EXTEND_DAYS - 1));
          if (earliestBoundDate && candidateEndDate < earliestBoundDate) {
            setPastRangeEnd();
            return;
          }

          nextEndDate = candidateEndDate;
          nextStartDate = candidateStartDate;
          nextPage = 0;
          resetPastWindowState();
          emptyPageRetryCount = 0;
          continue;
        }

        const currentSortedGames = allDatesData.flatMap((item) => item.games);
        const merged = mergeMatchLists(currentSortedGames, nextMatches);
        const grouped = groupByDate(merged);
        const normalized = grouped.map((entry) => ({ ...entry, games: entry.games }));
        normalized.sort((a, b) => a.date.localeCompare(b.date));
        setAllDatesData(normalized);
        if (moveToLoadedPast) {
          let targetDateIndex = -1;
          for (let i = normalized.length - 1; i >= 0; i -= 1) {
            if (normalized[i].date < anchorDate) {
              targetDateIndex = i;
              break;
            }
          }

          if (targetDateIndex === -1) {
            const anchorIndex = normalized.findIndex((entry) => entry.date === anchorDate);
            targetDateIndex = anchorIndex !== -1 ? anchorIndex : currentDateIndex;
          }

          if (targetDateIndex !== currentDateIndex) {
            setCurrentDateIndex(targetDateIndex);
          }
        } else {
          const restoredDateIndex = normalized.findIndex((entry) => entry.date === anchorDate);
          if (restoredDateIndex !== -1 && restoredDateIndex !== currentDateIndex) {
            setCurrentDateIndex(restoredDateIndex);
          }
        }

        const interactivePastGames = nextMatches.filter((game) => game.homeScore === null && game.awayScore === null);
        if (interactivePastGames.length > 0) {
          await fetchAndCacheUserVotes(
            interactivePastGames
              .map((game) => game.gameId)
              .filter((gameId) => !!gameId),
            `past:${nextStartDate}`,
            () => pastRangeRequestRef.current !== requestId
          );
        }

        if (hasNext) {
          pastWindowPageRef.current = pastWindowPageRef.current + 1;
        } else {
          pastWindowCursorRef.current = nextStartDate;
          resetPastWindowState();
        }

        const nextEarliestLoadedDate = normalized[0]?.date || nextStartDate;
        canLoadMorePastRef.current = earliestBoundDate ? nextEarliestLoadedDate > earliestBoundDate : true;
        setPastRangeLoadState(canLoadMorePastRef.current ? 'ready' : 'end');
        setPastRangeLoadErrorMessage(canLoadMorePastRef.current ? null : '더 이상 이전 경기가 없습니다.');
        console.info('[prediction.range.load]', {
          direction: 'past',
          result: 'success',
          loadedCount: nextMatches.length,
          hasNext,
          canLoadMore: canLoadMorePastRef.current,
        });
        return;
      }
    } catch (error: unknown) {
      const castedError = error as { message?: string; code?: string; status?: number | null };
      if (isRangeResultCanceled({
        message: castedError?.message || '',
        status: castedError?.status,
        code: castedError?.code,
      })) {
        restorePastRangeLoadState();
        return;
      }
      if (isCancelLikeError(error)) {
        return;
      }
      console.error('[prediction.range.error]', {
        direction: 'past',
        message: '과거 경기 조회에 실패했습니다.',
      });
      setPastRangeError('과거 경기 조회에 실패했습니다.');
    } finally {
      pastLoadActiveRef.current = false;
    }
  };

  const retryLoadMoreFutureMatches = () => {
    setFutureRangeLoadState('idle');
    setFutureRangeLoadErrorMessage(null);
    canLoadMoreFutureRef.current = true;
    void loadMoreFutureMatches(true, true);
  };

  const retryLoadMorePastMatches = () => {
    setPastRangeLoadState('idle');
    setPastRangeLoadErrorMessage(null);
    canLoadMorePastRef.current = true;
    void loadMorePastMatches(true, true);
  };

  // 로그인 체크
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      setLoading(false);
      setMatchesLoadState('idle');
      setMatchesLoadErrorMessage(null);
    } else if (!isAuthLoading && isLoggedIn) {
      setMatchesLoadState('idle');
      fetchAllGames();
    }
  }, [isLoggedIn, isAuthLoading]);

  // 날짜가 변경될 때마다 첫 번째 경기로 리셋
  useEffect(() => {
    if (skipDateResetRef.current) {
      skipDateResetRef.current = false;
      return;
    }
    setSelectedGame(0);
  }, [currentDateIndex]);

  // 홈에서 전달된 딥링크(gameId/date)를 최초 1회 반영
  useEffect(() => {
    if (hasAppliedDeepLinkRef.current) return;
    if (allDatesData.length === 0) return;

    hasAppliedDeepLinkRef.current = true;

    if (!deepLinkGameId && !deepLinkDate) {
      if (deepLinkParamValidationNotice) {
        setDeepLinkNotice(`${deepLinkParamValidationNotice} 기본 화면으로 이동합니다.`);
      } else {
        setDeepLinkNotice(null);
      }
      return;
    }

    setActiveTab('match');

    const selection = resolveDeepLinkSelection(allDatesData, deepLinkGameId, deepLinkDate);
    if (selection) {
      setDeepLinkNotice(deepLinkParamValidationNotice);
      if (selection.dateIndex !== currentDateIndex) {
        skipDateResetRef.current = true;
        setCurrentDateIndex(selection.dateIndex);
      }
      setSelectedGame(selection.gameIndex);
      const selectedDeepLinkGameId = allDatesData[selection.dateIndex]?.games[selection.gameIndex]?.gameId;
      emitFlowEvent('onInputValid', 'DETAIL_EDIT', {
        gameId: selectedDeepLinkGameId,
        validation: [{
          fieldId: 'deep_link_match_id',
          severity: 'info',
          messageCode: 'detail_validate_success',
        }],
        recoveryAction: 'GO_BACK',
      });
      return;
    }

    const currentDateGames = allDatesData[currentDateIndex]?.games || [];
    const messages: string[] = [];
    if (deepLinkParamValidationNotice) {
      messages.push(deepLinkParamValidationNotice);
    }
    if (deepLinkGameId) messages.push(`게임 ID(${deepLinkGameId})`);
    if (deepLinkDate) messages.push(`날짜(${deepLinkDate})`);
    const combinedMessage = messages.length
      ? `요청하신 ${messages.join(', ')} 경기는 현재 목록에서 찾을 수 없습니다. 기본 화면으로 이동합니다.`
      : '요청한 경기를 현재 목록에서 찾을 수 없어 기본 화면으로 이동합니다.';
    setDeepLinkNotice(combinedMessage);
    emitFlowEvent('onErrorOverlayFallback', 'ERROR', {
      gameId: currentDateGames[0]?.gameId,
      errorCode: 'PARTIAL_DATA',
      recoverable: true,
      copyKey: 'network_error_message',
      recoveryAction: 'GO_LIST',
      retryConfig: {
        errorCode: 'PARTIAL_DATA',
        recoverable: true,
        retryEnabled: true,
        keepDraft: true,
        actionPriorityOrder: ['GO_LIST'],
      },
    });
  }, [allDatesData, currentDateIndex, deepLinkGameId, deepLinkDate, deepLinkParamValidationNotice]);

  useEffect(() => {
    const currentDateGames = allDatesData[currentDateIndex]?.games || [];
    const selectedGameId = currentDateGames[selectedGame]?.gameId;
    if (!selectedGameId) {
      return;
    }

    emitFlowEvent('onDetailOpen', 'DETAIL_EDIT', {
      gameId: selectedGameId,
      meta: {
        selectedGame,
        currentDateIndex,
        listLength: currentDateGames.length,
      },
    });
  }, [allDatesData, currentDateIndex, selectedGame]);

  // 화면에 없는 미래 구간으로 이동하면 다음 구간을 추가로 로드
  useEffect(() => {
    if (allDatesData.length === 0 || matchesLoadState !== 'ready') {
      return;
    }

    const currentDateGames = allDatesData[currentDateIndex]?.games || [];
    const hasAnyGames = currentDateGames.length > 0;
    if (currentDateIndex === 0 && canLoadMorePastRef.current) {
      void loadMorePastMatches(false, true);
      return;
    }

    if (!hasAnyGames) {
      if (currentDateIndex === allDatesData.length - 1 && canLoadMoreFutureRef.current) {
        void loadMoreFutureMatches();
      }
      return;
    }

    if (currentDateIndex !== allDatesData.length - 1) {
      return;
    }

    const lastDate = allDatesData[currentDateIndex]?.date;
    const lastGameDate = lastDate ? new Date(lastDate) : null;
    if (!lastGameDate) {
      return;
    }

    const now = new Date();
    const isFutureWindow = lastDate > toDateString(now);
    if (isFutureWindow) {
      void loadMoreFutureMatches();
    }
  }, [allDatesData, currentDateIndex, matchesLoadState]);

  // 경기별 상태 조회
  useEffect(() => {
    const currentDateGames = allDatesData[currentDateIndex]?.games || [];
    const currentGameId = currentDateGames[selectedGame]?.gameId;
    if (!currentGameId) {
      return;
    }

    const activeState = voteStatusState[currentGameId];
    if (!activeState || activeState.status === 'idle') {
      void loadVoteStatus(currentGameId);
    }
  }, [selectedGame, allDatesData, currentDateIndex]);

  // 경기 상세 정보 조회 (요청 경쟁/중복 응답 방지)
  useEffect(() => {
    const currentDateGames = allDatesData[currentDateIndex]?.games || [];
    const currentGameId = currentDateGames[selectedGame]?.gameId;
    if (!currentGameId) {
      return;
    }

    const detailState = gameDetails[currentGameId];
    if (detailState && detailState.status === 'ready') {
      return;
    }

    const requestId = ++detailRequestRef.current;
    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
    }
    const abortController = new AbortController();
    detailAbortRef.current = abortController;
    void loadGameDetail(currentGameId, requestId, abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [selectedGame, allDatesData, currentDateIndex]);

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
    };
  }, []);

  const currentDateGames = allDatesData[currentDateIndex]?.games || [];
  const currentDate = allDatesData[currentDateIndex]?.date || getTodayString();
  const currentGameId = currentDateGames[selectedGame]?.gameId;
  const currentGame = currentDateGames[selectedGame] || null;
  const currentGameDetailState = currentGameId ? gameDetails[currentGameId] : null;
  const currentGameDetail = currentGameDetailState?.data ?? null;
  const currentGameDetailLoading = currentGameDetailState?.status === 'loading';
  const currentGameDetailError = currentGameDetailState?.error || null;

  // 투표 상태 가져오기
  const loadVoteStatus = async (
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
      elapsedMs: getRunElapsedMs(),
    });

    while (true) {
      if (requestId !== voteStatusRequestRef.current || abortController.signal.aborted) {
        return false;
      }

      const offline = isOfflineNow();
      if (offline) {
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
          const retryDelayMs = getPredictionRetryDelayMs(retryAttempt);
          setRunProgressMessage(`오프라인 감지: 투표 집계를 ${retryAttempt}/${PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS}회 재시도합니다.`);
          emitFlowEvent('onRunProgress', 'RUNNING', {
            gameId,
            flowId: options.flowId,
            stage: 'RUN_POLL',
            elapsedMs: getRunElapsedMs(),
            meta: retryMeta,
          });
          await waitForRetryDelay(retryDelayMs);
          continue;
        }

        const networkErrorCode: PredictionErrorCode = 'NETWORK';
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
          errorCode: networkErrorCode,
          recoverable: true,
          copyKey: getPredictionCopyKey(networkErrorCode),
          stage: 'RUN_POLL',
          retryConfig: {
            errorCode: networkErrorCode,
            recoverable: true,
            retryEnabled: true,
            keepDraft: true,
            actionPriorityOrder: ['RETRY', 'GO_LIST'],
          },
          recoveryAction: 'RETRY',
          meta: retryMeta,
        });
        showPredictionErrorOverlay(networkErrorCode, {
          message: errorMessage,
          copyKey: getPredictionCopyKey(networkErrorCode),
          recovery: {
            recoverable: true,
            retryEnabled: true,
            keepDraft: true,
            actionPriorityOrder: ['RETRY', 'GO_LIST'],
          },
          onRetry: () => {
            reloadCurrentVoteStatus({ emitRetryEvent: false, source: 'overlay' });
          },
          onGoList: () => {
            window.location.href = '/';
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
            const retryDelayMs = getPredictionRetryDelayMs(retryAttempt);
            emitFlowEvent('onRunProgress', 'RUNNING', {
              gameId,
              flowId: options.flowId,
              stage: 'RUN_POLL',
              elapsedMs: getRunElapsedMs(),
              meta: retryMeta,
            });
            await waitForRetryDelay(retryDelayMs);
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
            reloadCurrentVoteStatus({ emitRetryEvent: false, source: 'overlay' });
          },
          onGoList: () => {
            window.location.href = '/';
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
            const retryDelayMs = getPredictionRetryDelayMs(retryAttempt);
            emitFlowEvent('onRunProgress', 'RUNNING', {
              gameId,
              flowId: options.flowId,
              stage: 'RUN_POLL',
              elapsedMs: getRunElapsedMs(),
              meta: retryMeta,
            });
            await waitForRetryDelay(retryDelayMs);
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
              reloadCurrentVoteStatus({ emitRetryEvent: false, source: 'overlay' });
            },
            onGoList: () => {
              window.location.href = '/';
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
            reloadCurrentVoteStatus({ emitRetryEvent: false, source: 'overlay' });
          },
          onGoList: () => {
            window.location.href = '/';
          },
        });
        return false;
      }
    }
  };

  const reloadVoteStatus = async (gameId: string, options: LoadVoteStatusOptions = {}) => {
    return loadVoteStatus(gameId, {
      source: options.source ?? 'manual',
      emitRetryEvent: options.emitRetryEvent,
      flowId: options.flowId,
      restoredFromSession: options.restoredFromSession,
    });
  };

  const reloadCurrentVoteStatus = (
    options: {
      emitRetryEvent?: boolean;
      source?: VoteStatusLoadSource;
      flowId?: string;
      restoredFromSession?: boolean;
    } = {}
  ) => {
    const currentGameId = getCurrentGameId();
    if (!currentGameId) {
      return;
    }

    if (options.emitRetryEvent !== false) {
      emitFlowEvent('onErrorOverlayRetry', 'ERROR', {
        gameId: currentGameId,
        recoveryAction: 'RETRY',
      });
    }
    setVoteStatusState((prev) => ({
      ...prev,
      [currentGameId]: { status: 'idle' },
    }));
    void loadVoteStatus(currentGameId, {
      source: options.source ?? 'manual',
      flowId: options.flowId,
      restoredFromSession: options.restoredFromSession,
    });
  };

  const reloadCurrentGameDetail = (
    options: {
      emitRetryEvent?: boolean;
    } = {}
  ) => {
    const currentGameId = getCurrentGameId();
    if (!currentGameId) {
      return;
    }

    if (options.emitRetryEvent !== false) {
      emitFlowEvent('onErrorOverlayRetry', 'ERROR', {
        gameId: currentGameId,
        recoveryAction: 'RETRY',
        toastKey: 'run_retry_started',
      });
    }
    setGameDetails((prev) => ({
      ...prev,
      [currentGameId]: {
        status: 'idle',
        data: prev[currentGameId]?.data ?? null,
        error: undefined,
      },
    }));
    const requestId = ++detailRequestRef.current;
    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
    }
    const abortController = new AbortController();
    detailAbortRef.current = abortController;
    void loadGameDetail(currentGameId, requestId, abortController.signal);
  };

  // 투표하기
  const handleVote = async (team: VoteTeam, game: Game, isVoteOpen: boolean) => {
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
        executeVote(gameId, team, game);
      }
      return;
    }

    if (userVote[gameId] === team) {
      const confirmed = await confirm({
        title: '투표 취소',
        description: '투표를 취소하시겠습니까?\n\n(❗️ 주의: 사용된 포인트는 반환되지 않습니다)',
      });
      if (confirmed) {
        executeCancelVote(gameId);
      }
      return;
    }

    executeVote(gameId, team, game);
  };

  // 투표 실행
  const executeVote = async (gameId: string, team: VoteTeam, game: Game) => {
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
    let warningTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let fatalTimeoutId: ReturnType<typeof setTimeout> | null = null;

    warningTimeoutId = setTimeout(() => {
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

    fatalTimeoutId = setTimeout(() => {
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
        const offline = isOfflineNow();
        if (offline) {
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
            const retryDelayMs = getPredictionRetryDelayMs(retryAttempt);
            emitFlowEvent('onRunProgress', 'RUNNING', {
              gameId,
              flowId,
              stage: 'RUN_SUBMIT',
              elapsedMs: getRunElapsedMs(),
              meta: retryMeta,
            });
            await waitForRetryDelay(retryDelayMs);
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
              const retryDelayMs = getPredictionRetryDelayMs(retryAttempt);
              emitFlowEvent('onRunProgress', 'RUNNING', {
                gameId,
                flowId,
                stage: 'RUN_SUBMIT',
                elapsedMs: getRunElapsedMs(),
                meta: retryMeta,
              });
              await waitForRetryDelay(retryDelayMs);
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
          if (mappedErrorCode === 'AUTH_EXPIRED') {
            emitFlowEvent('onErrorOverlayFallback', 'ERROR', {
              gameId,
              flowId,
              errorCode: mappedErrorCode,
              recoverable: true,
              copyKey: getPredictionCopyKey(mappedErrorCode),
              recoveryAction: 'GO_LIST',
            });
          }
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
      if (warningTimeoutId) {
        clearTimeout(warningTimeoutId);
      }
      if (fatalTimeoutId) {
        clearTimeout(fatalTimeoutId);
      }
      resetNetworkRetryAttempt('submitVote');
      resetRunProgressState();
    }
  };

  // 투표 취소 실행
  const executeCancelVote = async (gameId: string) => {
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
        const offline = isOfflineNow();
        if (offline) {
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
            const retryDelayMs = getPredictionRetryDelayMs(retryAttempt);
            emitFlowEvent('onRunProgress', 'RUNNING', {
              gameId,
              flowId,
              stage: 'RUN_SUBMIT',
              elapsedMs: getRunElapsedMs(),
              meta: retryMeta,
            });
            await waitForRetryDelay(retryDelayMs);
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
              const retryDelayMs = getPredictionRetryDelayMs(retryAttempt);
              emitFlowEvent('onRunProgress', 'RUNNING', {
                gameId,
                flowId,
                stage: 'RUN_SUBMIT',
                elapsedMs: getRunElapsedMs(),
                meta: retryMeta,
              });
              await waitForRetryDelay(retryDelayMs);
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
  };

  const restoreRunSession = async (trigger: RunSessionRestoreTrigger) => {
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
          void reloadVoteStatus(parsedSession.gameId, {
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
  };

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
  }, [isAuthLoading, isLoggedIn]);

  // 이전/다음 날짜로 이동
  const goToPreviousDate = () => {
    if (currentDateIndex > 0) {
      setCurrentDateIndex(currentDateIndex - 1);
      return;
    }

    if (canLoadMorePastRef.current) {
      void loadMorePastMatches(false, true);
    }
  };

  const goToNextDate = () => {
    if (currentDateIndex < allDatesData.length - 1) {
      setCurrentDateIndex(currentDateIndex + 1);
      return;
    }

    if (canLoadMoreFutureRef.current) {
      void loadMoreFutureMatches(false, true);
    }
  };

  const currentDateVoteState = currentGameId ? voteStatusState[currentGameId] : null;
  const currentDateVoteError = currentDateVoteState?.error || null;
  const currentDateVoteLoading = currentDateVoteState?.status === 'loading';
  const currentVotePartialReason = currentGameId ? partialReasonsByGameId[currentGameId] ?? null : null;
  const isCurrentVotePartial = Boolean(currentVotePartialReason);

  return {
    activeTab,
    setActiveTab,
    selectedGame,
    setSelectedGame,
    allDatesData,
    currentDateIndex,
    currentDateGames,
    currentDate,
    loading,
    currentGame,
    matchesLoadState,
    matchesLoadErrorMessage,
    deepLinkNotice,
    reloadMatches,
    pastRangeLoadState,
    pastRangeLoadErrorMessage,
    futureRangeLoadState,
    futureRangeLoadErrorMessage,
    votes,
    voteStatusState,
    voteStatusError: currentDateVoteError,
    voteStatusLoading: currentDateVoteLoading,
    isCurrentVotePartial,
    currentVotePartialReason,
    userVote,
    currentGameDetail,
    currentGameDetailLoading,
    currentGameDetailError,
    reloadCurrentVoteStatus,
    reloadCurrentGameDetail,
    predictionErrorOverlay,
    handlePredictionErrorOverlayAction,
    closePredictionErrorOverlay,
    isAuthLoading,
    isLoggedIn,

    loadMoreFutureMatches,
    retryLoadMoreFutureMatches,
    retryLoadMorePastMatches,
    handleVote,
    goToPreviousDate,
    goToNextDate,
    isRunInProgress,
    isRunBannerDismissed,
    runProgressMessage,
    runStartAt,
    dismissRunProgressBanner,
    resumeRunProgressBanner,
    formatDate,
    getTomorrowString,
  };
};
