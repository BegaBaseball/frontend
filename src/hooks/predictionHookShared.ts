import type { ParsedError } from '../utils/errorUtils';
import { isManualBaseballDataRequiredCode } from '../utils/errorUtils';
import type { DateGames, Game, GameDetail, VoteTeam } from '../types/prediction';
import { hasRenderableInningScoreData } from '../utils/inningScoreParser';
import type {
  PredRecoveryAction,
  PredictionErrorCode,
  PredictionErrorState,
  PredictionFlowEventName,
  PredictionFlowStage,
  PredictionFlowState,
  PredictionRecoveryState,
  PredictionRunEvent,
} from '../types/predictionFlow';

export type UserVoteRecord = {
  [key: string]: VoteTeam | null;
};

export type PredictionUserVoteResolutionState = 'resolved' | 'unknown-auth';

export type PredictionUserVoteResolutionRecord = {
  [key: string]: PredictionUserVoteResolutionState;
};

export type VoteRequestState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
};

export type GameDetailRequestState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: GameDetail | null;
  error?: string;
  isSeeded?: boolean;
  isBackgroundRefreshing?: boolean;
  hasRenderableData?: boolean;
};

export type RangeLoadState = 'idle' | 'ready' | 'loading' | 'end' | 'error';
export type MatchRangeLoadReason = 'initial' | 'navigation' | 'deepLink';
export type MatchRangeLoadDirection = 'current' | 'past' | 'future';

export type MatchRangeLoadRequest = {
  anchorDate: string;
  direction: MatchRangeLoadDirection;
  windowDays: number;
  reason: MatchRangeLoadReason;
};

export type ErrorOverlayAction = () => Promise<void> | void;
export type PredictionPartialReason = 'totalVotes_missing';
export type VoteStatusLoadSource = 'auto' | 'manual' | 'overlay' | 'session-restore';

export type LoadVoteStatusOptions = {
  source?: VoteStatusLoadSource;
  emitRetryEvent?: boolean;
  flowId?: string;
  restoredFromSession?: boolean;
};

export type RunSessionRestoreTrigger = 'mount' | 'visibilitychange' | 'pageshow';

export type PredictionErrorOverlayConfig = {
  title?: string;
  message?: string;
  copyKey?: PredictionRunEvent['copyKey'];
  toastKey?: PredictionRunEvent['toastKey'];
  recovery?: Partial<PredictionRecoveryState>;
  onRetry?: ErrorOverlayAction;
  onFallback?: ErrorOverlayAction;
  onGoList?: ErrorOverlayAction;
  onGoBack?: ErrorOverlayAction;
};

export type PredictionErrorOverlayState = {
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

export type PredictionFlowEmitOverrides = {
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
};

export type PredictionFlowEmitter = (
  eventName: PredictionFlowEventName,
  eventState: PredictionFlowState,
  overrides?: PredictionFlowEmitOverrides
) => void;

export type PredictionOverlayController = {
  showPredictionErrorOverlay: (
    errorCode: PredictionErrorCode,
    config: PredictionErrorOverlayConfig
  ) => void;
};

export const MATCH_WINDOW_EXTEND_DAYS = 7;
export const MATCH_FETCH_SIZE = 150;
export const DEEP_LINK_RESOLVE_MAX_ATTEMPTS = 20;
export const PREDICTION_RUN_WARNING_TIMEOUT_MS = 15_000;
export const PREDICTION_RUN_FATAL_TIMEOUT_MS = 45_000;
export const PREDICTION_OFFLINE_TOAST_MESSAGE = '오프라인 상태입니다. 네트워크 연결 후 자동으로 재시도합니다.';
export const PREDICTION_PARTIAL_REASON_TOTAL_VOTES_MISSING: PredictionPartialReason = 'totalVotes_missing';

export const toDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (base: string, dayOffset: number): string => {
  const date = new Date(base);
  date.setDate(date.getDate() + dayOffset);
  return toDateString(date);
};

export const normalizeDateKey = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directMatch = trimmed.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:[T\s].*)?$/);
  if (directMatch) {
    const year = directMatch[1];
    const month = String(Number(directMatch[2])).padStart(2, '0');
    const day = String(Number(directMatch[3])).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toDateString(parsed);
};

export const compareDateKeys = (left: string | null, right: string | null): number | null => {
  const normalizedLeft = left ? normalizeDateKey(left) : null;
  const normalizedRight = right ? normalizeDateKey(right) : null;

  if (!normalizedLeft || !normalizedRight) {
    return null;
  }

  if (normalizedLeft < normalizedRight) {
    return -1;
  }
  if (normalizedLeft > normalizedRight) {
    return 1;
  }
  return 0;
};

export const isDateBefore = (
  left: string | null,
  right: string | null,
  fallback: boolean = true
): boolean => {
  const comparison = compareDateKeys(left, right);
  if (comparison === null) {
    return fallback;
  }
  return comparison < 0;
};

export const isDateAfter = (
  left: string | null,
  right: string | null,
  fallback: boolean = true
): boolean => {
  const comparison = compareDateKeys(left, right);
  if (comparison === null) {
    return fallback;
  }
  return comparison > 0;
};

export const mergeMatchLists = (base: Game[] = [], incoming?: Game[] | null): Game[] => {
  const safeBase = Array.isArray(base) ? base : [];
  const safeIncoming = Array.isArray(incoming) ? incoming : [];
  const seen = new Set(safeBase.map((game) => game.gameId));
  const merged = [...safeBase];

  safeIncoming.forEach((game) => {
    if (!game?.gameId || seen.has(game.gameId)) {
      return;
    }
    seen.add(game.gameId);
    merged.push(game);
  });

  return merged;
};

export const isCancelLikeError = (error: unknown): boolean => {
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

export const hasRenderableGameDetail = (
  state?: Pick<GameDetailRequestState, 'data' | 'hasRenderableData'> | null
): boolean => Boolean(state?.hasRenderableData || state?.data);

export const shouldShowPredictionDetailFallback = (options: {
  detailError?: string | null;
  hasRenderableData: boolean;
  hasCurrentGame: boolean;
}): boolean => Boolean(options.detailError && !options.hasRenderableData && !options.hasCurrentGame);

export const shouldPreserveUserVoteStateOnError = (
  parsedType: ParsedError['type']
): boolean => parsedType === 'AUTH' || parsedType === 'PERMISSION';

export const applyPredictionUserVoteResolution = (
  current: PredictionUserVoteResolutionRecord,
  gameIds: string[],
  nextState: PredictionUserVoteResolutionState,
): PredictionUserVoteResolutionRecord => {
  if (!gameIds.length) {
    return current;
  }

  const next = { ...current };
  gameIds.forEach((gameId) => {
    if (!gameId) {
      return;
    }
    next[gameId] = nextState;
  });
  return next;
};

export const resolvePredictionUserVoteResolutionState = (
  current: PredictionUserVoteResolutionRecord,
  gameId?: string | null,
): PredictionUserVoteResolutionState => {
  if (!gameId) {
    return 'resolved';
  }

  return current[gameId] ?? 'resolved';
};

export const isRangeResultCanceled = (error?: {
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

export const hasInningScoreData = (detail?: GameDetail | null): boolean => {
  if (!detail) {
    return false;
  }
  return hasRenderableInningScoreData(detail);
};

export const getFlowPlatform = (): 'mobile' | 'desktop' => {
  if (typeof window === 'undefined') {
    return 'desktop';
  }
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
};

export const resolveFlowScreen = (state: PredictionFlowState): string => {
  const base = getFlowPlatform();
  if (state === 'LIST') {
    return `pred-list-${base}`;
  }
  if (state === 'DETAIL_EDIT') {
    return `pred-detail-${base}`;
  }
  if (state === 'RUNNING') {
    return 'pred-run-loading';
  }
  if (state === 'RESULT') {
    return `pred-result-${base}`;
  }
  return 'pred-error-overlay';
};

export const mapPredictionErrorCode = (
  parsedType: ParsedError['type'],
  responseCode?: string
): PredictionErrorCode => {
  if (isManualBaseballDataRequiredCode(responseCode)) {
    return 'PARTIAL_DATA';
  }
  if (parsedType === 'NETWORK') {
    return 'NETWORK';
  }
  if (parsedType === 'AUTH' || parsedType === 'PERMISSION') {
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

export const mapVoteStatusErrorCode = (status?: number | null): PredictionErrorCode => {
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

export const getPredictionCopyKey = (
  errorCode: PredictionErrorCode
): PredictionRunEvent['copyKey'] => {
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

const isGoListAllowed = (errorCode: PredictionErrorCode): boolean => {
  return (
    errorCode === 'NETWORK'
    || errorCode === 'SERVER'
    || errorCode === 'TIMEOUT'
    || errorCode === 'PARTIAL_DATA'
    || errorCode === 'RENDER_FAIL'
  );
};

export const buildRecoveryState = (
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

export const normalizeRecoveryActionOrder = (
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
  if (ordered.length === 0) {
    return [];
  }
  if (ordered.length >= 2) {
    return ordered.slice(0, 4);
  }

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

export const getCurrentGame = (
  allDatesData: DateGames[],
  currentDateIndex: number,
  selectedGame: number
): Game | null => {
  const currentDateGames = allDatesData[currentDateIndex]?.games || [];
  return currentDateGames[selectedGame] || null;
};
