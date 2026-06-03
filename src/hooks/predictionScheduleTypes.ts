import type { GameDetail } from '../types/prediction';
import type { PredictionLocationState } from '../utils/predictionDeepLink';
import type { PredictionFlowEmitter, PredictionOverlayController } from './predictionHookShared';

// ---------------------------------------------------------------------------
// Hook parameter type (exported so callers can type their usage)
// ---------------------------------------------------------------------------

export type UsePredictionScheduleParams = {
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  searchParams: URLSearchParams;
  setSearchParams: (nextInit: URLSearchParams, navigateOptions?: { replace?: boolean }) => void;
  locationState: PredictionLocationState;
  emitFlowEvent?: PredictionFlowEmitter;
  showPredictionErrorOverlay?: PredictionOverlayController['showPredictionErrorOverlay'];
  fetchAndCacheUserVotes?: (
    gameIds: string[],
    requestKeySuffix: string,
    requestGuard?: () => boolean
  ) => Promise<void>;
  primeGameDetail?: (gameId: string, detail: GameDetail) => void;
  activateMatchTab?: () => void;
};

// ---------------------------------------------------------------------------
// Internal types used only within usePredictionSchedule
// ---------------------------------------------------------------------------

export type MatchDayNavigationMeta = {
  prevDate: string | null;
  nextDate: string | null;
  hasPrev: boolean;
  hasNext: boolean;
};

export type LoadPredictionDayOptions = {
  moveToLoadedDate?: boolean;
  preserveVisibleDate?: boolean;
  replaceExistingDates?: boolean;
  requestKeySuffix: string;
  requestGuard?: () => boolean;
};
