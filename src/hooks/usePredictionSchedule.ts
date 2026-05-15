import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMatchesByDay,
  type MatchDayResult,
} from '../api/predictionMatchDay';
import { getTodayString } from '../utils/predictionDates';
import { getApiErrorMessage, parseError, type ParsedError } from '../utils/errorUtils';
import {
  normalizePredictionDate,
  resolveDeepLinkSelection,
  resolveInitialPredictionDateIndex,
} from '../utils/predictionHomeLogic';
import {
  buildDeepLinkNotFoundMessage,
  buildPredictionRecoveryPath,
  type PredictionLocationState,
} from '../utils/predictionDeepLink';
import {
  schedulePredictionPostPaintIdleWork,
  type PredictionDeferredWorkCancel,
} from '../utils/predictionDeferredWork';
import type { DateGames, Game, GameDetail, MatchBounds, MatchDayNavigation } from '../types/prediction';
import {
  MATCH_FETCH_SIZE,
  getCurrentGame,
  isCancelLikeError,
  isRangeResultCanceled,
  mapPredictionErrorCode,
  mergeMatchLists,
  normalizeDateKey,
  type MatchRangeLoadReason,
  type MatchRangeLoadRequest,
  type PredictionFlowEmitter,
  type PredictionOverlayController,
  type RangeLoadState,
} from './predictionHookShared';

let predictionRangeApiModulePromise: Promise<typeof import('../api/predictionRange')> | null = null;
let predictionRangeWindowModulePromise: Promise<typeof import('../utils/predictionRangeWindow')> | null = null;
let predictionScheduleBoundaryLoadersModulePromise:
  Promise<typeof import('./predictionScheduleBoundaryLoaders')> | null = null;
let predictionScheduleDeepLinkRuntimeModulePromise:
  Promise<typeof import('./predictionScheduleDeepLinkRuntime')> | null = null;
let predictionScheduleAdjacentPrefetchModulePromise:
  Promise<typeof import('./predictionScheduleAdjacentPrefetch')> | null = null;
let predictionRangeLoaderModulePromise:
  Promise<typeof import('../utils/predictionRangeLoader')> | null = null;

const PREDICTION_GAME_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const loadPredictionRangeApiModule = () => {
  if (!predictionRangeApiModulePromise) {
    predictionRangeApiModulePromise = import('../api/predictionRange');
  }
  return predictionRangeApiModulePromise;
};

const loadPredictionRangeWindowModule = () => {
  if (!predictionRangeWindowModulePromise) {
    predictionRangeWindowModulePromise = import('../utils/predictionRangeWindow');
  }
  return predictionRangeWindowModulePromise;
};

const loadPredictionScheduleBoundaryLoadersModule = () => {
  if (!predictionScheduleBoundaryLoadersModulePromise) {
    predictionScheduleBoundaryLoadersModulePromise = import('./predictionScheduleBoundaryLoaders');
  }
  return predictionScheduleBoundaryLoadersModulePromise;
};

const loadPredictionScheduleDeepLinkRuntimeModule = () => {
  if (!predictionScheduleDeepLinkRuntimeModulePromise) {
    predictionScheduleDeepLinkRuntimeModulePromise = import('./predictionScheduleDeepLinkRuntime');
  }
  return predictionScheduleDeepLinkRuntimeModulePromise;
};

const loadPredictionScheduleAdjacentPrefetchModule = () => {
  if (!predictionScheduleAdjacentPrefetchModulePromise) {
    predictionScheduleAdjacentPrefetchModulePromise = import('./predictionScheduleAdjacentPrefetch');
  }
  return predictionScheduleAdjacentPrefetchModulePromise;
};

const loadPredictionRangeLoaderModule = () => {
  if (!predictionRangeLoaderModulePromise) {
    predictionRangeLoaderModulePromise = import('../utils/predictionRangeLoader');
  }
  return predictionRangeLoaderModulePromise;
};

const toPredictionGameId = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return PREDICTION_GAME_ID_PATTERN.test(normalized) ? normalized : null;
};

type UsePredictionScheduleParams = {
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

type MatchDayNavigationMeta = {
  prevDate: string | null;
  nextDate: string | null;
  hasPrev: boolean;
  hasNext: boolean;
};

type LoadPredictionDayOptions = {
  moveToLoadedDate?: boolean;
  preserveVisibleDate?: boolean;
  replaceExistingDates?: boolean;
  requestKeySuffix: string;
  requestGuard?: () => boolean;
};

const noopEmitFlowEvent: PredictionFlowEmitter = () => {};
const noopShowPredictionErrorOverlay: PredictionOverlayController['showPredictionErrorOverlay'] = () => {};
const noopFetchAndCacheUserVotes = async () => {};
const noopPrimeGameDetail = () => {};
const noopActivateMatchTab = () => {};
const CANCELED_MATCH_DAY_RESULT: MatchDayResult = {
  ok: false,
  error: {
    message: 'canceled',
    code: 'ERR_CANCELED',
    status: 0,
  },
};
const normalizeMatchBoundsDate = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return normalizePredictionDate(value);
};

const getPredictionRangeErrorMessage = (
  error: {
    message?: string;
    status?: number | null;
    code?: string;
  } | undefined,
  fallback: string,
) => {
  const normalizedStatus = typeof error?.status === 'number' ? error.status : null;
  const normalizedMessage = typeof error?.message === 'string' ? error.message.trim() : '';
  const resolvedMessage = normalizedMessage || fallback;

  return getApiErrorMessage(normalizedStatus !== null
    ? {
      status: normalizedStatus,
      data: {
        message: normalizedMessage || undefined,
        code: error?.code,
      },
      message: resolvedMessage,
    }
    : new Error(resolvedMessage), fallback);
};

const getMatchRangeErrorType = (status: number | null): ParsedError['type'] => {
  if (status === 401) {
    return 'AUTH';
  }
  if (status === 403) {
    return 'PERMISSION';
  }
  if (status === 404) {
    return 'NOT_FOUND';
  }
  if (status !== null && status >= 500) {
    return 'SERVER';
  }
  return 'UNKNOWN';
};

const getMatchRangeErrorFallback = (type: ParsedError['type']) => {
  if (type === 'AUTH') {
    return '로그인 정보를 다시 확인해주세요.';
  }
  if (type === 'PERMISSION') {
    return '접근 권한이 없습니다.';
  }
  if (type === 'NOT_FOUND') {
    return '요청한 정보를 찾을 수 없습니다.';
  }
  if (type === 'SERVER') {
    return '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.';
  }
  return '예측 경기 목록 조회에 실패했습니다.';
};

const normalizeMatchRangeError = (error?: {
  message?: string;
  status?: number | null;
  code?: string;
}): ParsedError => {
  const statusCode = error?.status ?? null;
  const normalizedStatus = typeof statusCode === 'number' ? statusCode : null;
  const type = getMatchRangeErrorType(normalizedStatus);

  return {
    type,
    responseCode: error?.code,
    message: getPredictionRangeErrorMessage(error, getMatchRangeErrorFallback(type)),
    statusCode: normalizedStatus,
  };
};

export const usePredictionSchedule = ({
  isLoggedIn,
  isAuthLoading,
  searchParams,
  setSearchParams,
  locationState,
  emitFlowEvent = noopEmitFlowEvent,
  showPredictionErrorOverlay = noopShowPredictionErrorOverlay,
  fetchAndCacheUserVotes = noopFetchAndCacheUserVotes,
  primeGameDetail = noopPrimeGameDetail,
  activateMatchTab = noopActivateMatchTab,
}: UsePredictionScheduleParams) => {
  const [selectedGame, setSelectedGame] = useState(0);
  const [allDatesData, setAllDatesData] = useState<DateGames[]>([]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [matchBoundsState, setMatchBoundsState] = useState<MatchBounds | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchesLoadState, setMatchesLoadState] = useState<'idle' | 'ready' | 'error'>('idle');
  const [matchesLoadErrorMessage, setMatchesLoadErrorMessage] = useState<string | null>(null);
  const [matchesLoadErrorCode, setMatchesLoadErrorCode] = useState<string | null>(null);
  const [pastRangeLoadState, setPastRangeLoadState] = useState<RangeLoadState>('idle');
  const [pastRangeLoadErrorMessage, setPastRangeLoadErrorMessage] = useState<string | null>(null);
  const [futureRangeLoadState, setFutureRangeLoadState] = useState<RangeLoadState>('idle');
  const [futureRangeLoadErrorMessage, setFutureRangeLoadErrorMessage] = useState<string | null>(null);
  const [canLoadMorePast, setCanLoadMorePast] = useState(true);
  const [canLoadMoreFuture, setCanLoadMoreFuture] = useState(true);
  const [deepLinkNotice, setDeepLinkNotice] = useState<string | null>(null);
  const [deepLinkParamValidationNotice, setDeepLinkParamValidationNotice] = useState<string | null>(null);
  const [navigationSeedGame, setNavigationSeedGame] = useState<Game | null>(null);
  const [isNavigationSeedResolving, setIsNavigationSeedResolving] = useState(false);

  const isFetchingAllGamesRef = useRef(false);
  const futureLoadActiveRef = useRef(false);
  const pastLoadActiveRef = useRef(false);
  const canLoadMoreFutureRef = useRef(true);
  const canLoadMorePastRef = useRef(true);
  const deepLinkResolutionPendingRef = useRef(false);
  const deepLinkResolutionAttemptRef = useRef(0);
  const deepLinkResolutionDirectionRef = useRef<'past' | 'future'>('future');
  const deepLinkDateLoadRequestRef = useRef(0);
  const deepLinkDateLoadInFlightRef = useRef('');
  const previousDeepLinkSignatureRef = useRef('');
  const skipDateResetRef = useRef(false);
  const initialListRequestRef = useRef(0);
  const pastRangeRequestRef = useRef(0);
  const futureRangeRequestRef = useRef(0);
  const matchBoundsRef = useRef<MatchBounds | null>(null);
  const matchBoundsHydrationPromiseRef = useRef<Promise<void> | null>(null);
  const navigationSeedAppliedRef = useRef(false);
  const allDatesDataRef = useRef<DateGames[]>([]);
  const currentDateIndexRef = useRef(0);
  const dayNavigationByDateRef = useRef<Record<string, MatchDayNavigationMeta>>({});
  const dayRequestInFlightRef = useRef<Map<string, Promise<MatchDayResult>>>(new Map());
  const adjacentPrefetchCancelRef = useRef<PredictionDeferredWorkCancel | null>(null);
  const adjacentPrefetchPendingAnchorRef = useRef<string | null>(null);
  const adjacentPrefetchCompletedAnchorsRef = useRef<Set<string>>(new Set());
  const matchBoundsHydrationCancelRef = useRef<PredictionDeferredWorkCancel | null>(null);
  const scheduleMatchBoundsAfterInitialLoadRef = useRef(false);
  const programmaticSearchSignatureRef = useRef('');
  const suppressNextProgrammaticSearchLoadRef = useRef(false);

  const goToPredictionRecovery = (options?: {
    currentDate?: string | null;
    currentGameId?: string | null;
  }) => {
    if (typeof window === 'undefined') {
      return;
    }

    const visibleDate = allDatesDataRef.current[currentDateIndexRef.current]?.date || null;
    const visibleGameId = allDatesDataRef.current[currentDateIndexRef.current]?.games[selectedGame]?.gameId || null;

    window.location.href = buildPredictionRecoveryPath({
      currentDate: options?.currentDate ?? visibleDate,
      currentGameId: options?.currentGameId ?? visibleGameId,
      searchParams,
    });
  };

  useEffect(() => {
    allDatesDataRef.current = allDatesData;
  }, [allDatesData]);

  useEffect(() => {
    currentDateIndexRef.current = currentDateIndex;
  }, [currentDateIndex]);

  const stateGame = locationState?.game;
  const stateGameId = typeof locationState?.gameId === 'string'
    ? locationState.gameId.trim()
    : '';
  const stateDate = typeof locationState?.date === 'string'
    ? locationState.date.trim()
    : '';
  const stateSeedDate = typeof stateGame?.sourceDate === 'string'
    ? stateGame.sourceDate.trim()
    : '';
  const rawDeepLinkGameId = ((searchParams.get('gameId') || stateGameId) || '').trim();
  const rawDeepLinkDate = ((searchParams.get('date') || stateDate || stateSeedDate) || '').trim();
  const deepLinkGameId = rawDeepLinkGameId ? toPredictionGameId(rawDeepLinkGameId) || '' : '';
  const deepLinkDate = rawDeepLinkDate ? normalizePredictionDate(rawDeepLinkDate) || '' : '';
  const hasStateNavigationSeed = Boolean(stateGame);
  const hasNavigationSeedGame = Boolean(navigationSeedGame?.gameId && navigationSeedGame?.gameDate);

  const setProgrammaticSearchParams = useCallback((
    nextSearchParams: URLSearchParams,
    navigateOptions?: { replace?: boolean },
  ) => {
    const nextGameId = toPredictionGameId(nextSearchParams.get('gameId')?.trim() || '') || '';
    const nextDate = normalizePredictionDate(nextSearchParams.get('date')?.trim() || '') || '';

    programmaticSearchSignatureRef.current = `${nextGameId}|${nextDate}`;
    suppressNextProgrammaticSearchLoadRef.current = true;
    setSearchParams(nextSearchParams, navigateOptions);
  }, [setSearchParams]);

  useEffect(() => {
    if (!stateGame) {
      setNavigationSeedGame(null);
      setIsNavigationSeedResolving(false);
      return;
    }

    let cancelled = false;
    setIsNavigationSeedResolving(true);

    void loadPredictionScheduleDeepLinkRuntimeModule()
      .then(({ resolvePredictionNavigationSeedGame }) => {
        if (cancelled) {
          return;
        }

        setNavigationSeedGame(resolvePredictionNavigationSeedGame({
          stateGame,
          deepLinkGameId,
          deepLinkDate,
        }));
      })
      .finally(() => {
        if (!cancelled) {
          setIsNavigationSeedResolving(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deepLinkDate, deepLinkGameId, stateGame]);

  const setCanLoadMoreFutureState = useCallback((next: boolean) => {
    canLoadMoreFutureRef.current = next;
    setCanLoadMoreFuture(next);
  }, []);

  const setCanLoadMorePastState = useCallback((next: boolean) => {
    canLoadMorePastRef.current = next;
    setCanLoadMorePast(next);
  }, []);

  const getEarliestBoundDate = () => normalizeMatchBoundsDate(matchBoundsRef.current?.earliestGameDate);

  const getLatestBoundDate = () => normalizeMatchBoundsDate(matchBoundsRef.current?.latestGameDate);

  const hydrateMatchBounds = useCallback(async () => {
    const currentBounds = matchBoundsRef.current;
    if (currentBounds !== null) {
      return;
    }

    if (matchBoundsHydrationPromiseRef.current) {
      await matchBoundsHydrationPromiseRef.current;
      return;
    }

    const nextHydration = (async () => {
      const { fetchMatchBounds } = await loadPredictionRangeApiModule();
      const result = await fetchMatchBounds();
      if (!result.ok) {
        return;
      }

      const nextBounds = {
        hasData: Boolean(result.data?.hasData),
        earliestGameDate: normalizeMatchBoundsDate(result.data?.earliestGameDate),
        latestGameDate: normalizeMatchBoundsDate(result.data?.latestGameDate),
      };

      matchBoundsRef.current = nextBounds;
      setMatchBoundsState(nextBounds);
    })().finally(() => {
      matchBoundsHydrationPromiseRef.current = null;
    });

    matchBoundsHydrationPromiseRef.current = nextHydration;
    await nextHydration;
  }, []);

  const setPastRangeEnd = useCallback((message: string = '더 이상 이전 경기가 없습니다.') => {
    setCanLoadMorePastState(false);
    setPastRangeLoadErrorMessage(message);
    setPastRangeLoadState('end');
  }, [setCanLoadMorePastState]);

  const setFutureRangeEnd = useCallback((message: string = '더 이상 예정 경기가 없습니다.') => {
    setCanLoadMoreFutureState(false);
    setFutureRangeLoadErrorMessage(message);
    setFutureRangeLoadState('end');
  }, [setCanLoadMoreFutureState]);

  const restorePastRangeLoadState = useCallback(() => {
    setPastRangeLoadState(canLoadMorePastRef.current ? 'ready' : 'end');
    setPastRangeLoadErrorMessage(canLoadMorePastRef.current ? null : '더 이상 이전 경기가 없습니다.');
  }, []);

  const restoreFutureRangeLoadState = useCallback(() => {
    setFutureRangeLoadState(canLoadMoreFutureRef.current ? 'ready' : 'end');
    setFutureRangeLoadErrorMessage(canLoadMoreFutureRef.current ? null : '더 이상 예정 경기가 없습니다.');
  }, []);

  const persistDayNavigationMeta = useCallback((dayData: MatchDayNavigation) => {
    const normalizedDate = normalizeDateKey(dayData.date) || dayData.date;
    dayNavigationByDateRef.current[normalizedDate] = {
      prevDate: normalizeDateKey(dayData.prevDate || '') || null,
      nextDate: normalizeDateKey(dayData.nextDate || '') || null,
      hasPrev: Boolean(dayData.hasPrev && dayData.prevDate),
      hasNext: Boolean(dayData.hasNext && dayData.nextDate),
    };
  }, []);

  const syncRangeStateFromDates = useCallback((normalizedDates: DateGames[], fallbackDate: string) => {
    const currentVisibleDate = normalizedDates[currentDateIndexRef.current]?.date
      || normalizedDates.find((entry) => entry.date === fallbackDate)?.date
      || fallbackDate;
    const meta = dayNavigationByDateRef.current[currentVisibleDate];

    if (!meta) {
      return;
    }

    setCanLoadMorePastState(meta.hasPrev);
    setCanLoadMoreFutureState(meta.hasNext);
    setPastRangeLoadState(meta.hasPrev ? 'ready' : 'end');
    setFutureRangeLoadState(meta.hasNext ? 'ready' : 'end');
    setPastRangeLoadErrorMessage(meta.hasPrev ? null : '더 이상 이전 경기가 없습니다.');
    setFutureRangeLoadErrorMessage(meta.hasNext ? null : '더 이상 예정 경기가 없습니다.');
  }, [setCanLoadMoreFutureState, setCanLoadMorePastState]);

  const buildCachedDayResult = useCallback((targetDate: string): MatchDayResult | null => {
    const normalizedDate = normalizeDateKey(targetDate) || targetDate;
    const meta = dayNavigationByDateRef.current[normalizedDate];
    const cachedEntry = allDatesDataRef.current.find((entry) => entry.date === normalizedDate);
    if (!meta || !cachedEntry) {
      return null;
    }

    return {
      ok: true,
      data: {
        date: normalizedDate,
        games: cachedEntry.games || [],
        prevDate: meta.prevDate,
        nextDate: meta.nextDate,
        hasPrev: meta.hasPrev,
        hasNext: meta.hasNext,
      },
    };
  }, []);

  const mergeDayIntoState = useCallback(async (
    dayData: MatchDayNavigation,
    options: Pick<LoadPredictionDayOptions, 'moveToLoadedDate' | 'preserveVisibleDate' | 'replaceExistingDates'>
  ) => {
    persistDayNavigationMeta(dayData);
    const baseDates = options.replaceExistingDates ? [] : allDatesDataRef.current;
    const currentVisibleDate = options.replaceExistingDates
      ? dayData.date
      : (allDatesDataRef.current[currentDateIndexRef.current]?.date || dayData.date);
    const { mergePredictionDateBuckets } = await loadPredictionRangeLoaderModule();
    const normalizedDates = mergePredictionDateBuckets(
      baseDates,
      Array.isArray(dayData.games) ? dayData.games : [],
      mergeMatchLists,
      dayData.date
    );

    setAllDatesData(normalizedDates);
    allDatesDataRef.current = normalizedDates;

    const targetDate = options.moveToLoadedDate
      ? dayData.date
      : (options.preserveVisibleDate === false ? dayData.date : currentVisibleDate);
    const targetIndex = normalizedDates.findIndex((entry) => entry.date === targetDate);
    if (targetIndex !== -1 && targetIndex !== currentDateIndexRef.current) {
      setCurrentDateIndex(targetIndex);
    }

    return normalizedDates;
  }, [persistDayNavigationMeta]);

  const requestPredictionDay = useCallback((targetDate: string): Promise<MatchDayResult> => {
    const normalizedDate = normalizePredictionDate(targetDate);
    if (!normalizedDate) {
      return Promise.resolve({
        ok: false,
        error: {
          message: '유효한 날짜가 아닙니다.',
          code: 'INVALID_DATE',
          status: 400,
        },
      });
    }

    const existingRequest = dayRequestInFlightRef.current.get(normalizedDate);
    if (existingRequest) {
      return existingRequest;
    }

    const nextRequest = fetchMatchesByDay(normalizedDate).finally(() => {
      if (dayRequestInFlightRef.current.get(normalizedDate) === nextRequest) {
        dayRequestInFlightRef.current.delete(normalizedDate);
      }
    });

    dayRequestInFlightRef.current.set(normalizedDate, nextRequest);
    return nextRequest;
  }, []);

  const loadPredictionDay = useCallback(async (
    targetDate: string,
    options: LoadPredictionDayOptions
  ): Promise<MatchDayResult> => {
    const normalizedDate = normalizePredictionDate(targetDate);
    if (!normalizedDate) {
      return {
        ok: false,
        error: {
          message: '유효한 날짜가 아닙니다.',
          code: 'INVALID_DATE',
          status: 400,
        },
      };
    }

    const isStale = options.requestGuard ?? (() => false);
    const cachedResult = buildCachedDayResult(normalizedDate);
    if (cachedResult?.ok) {
      const cachedIndex = allDatesDataRef.current.findIndex((entry) => entry.date === normalizedDate);
      if (cachedIndex === -1) {
        await mergeDayIntoState(cachedResult.data, {
          moveToLoadedDate: options.moveToLoadedDate,
          preserveVisibleDate: options.preserveVisibleDate,
          replaceExistingDates: options.replaceExistingDates,
        });
      } else if (options.moveToLoadedDate && cachedIndex !== currentDateIndexRef.current) {
        setCurrentDateIndex(cachedIndex);
      }
      return cachedResult;
    }

    const result = await requestPredictionDay(normalizedDate);
    if (isStale()) {
      return CANCELED_MATCH_DAY_RESULT;
    }
    if (!result.ok) {
      return result;
    }

    const normalizedDates = await mergeDayIntoState(result.data, {
      moveToLoadedDate: options.moveToLoadedDate,
      preserveVisibleDate: options.preserveVisibleDate,
      replaceExistingDates: options.replaceExistingDates,
    });
    const resultGames = Array.isArray(result.data.games) ? result.data.games : [];
    const interactiveGames = resultGames.filter((game) => game.homeScore == null && game.awayScore == null);
    if (isLoggedIn && interactiveGames.length > 0) {
      await fetchAndCacheUserVotes(
        interactiveGames.map((game) => game.gameId).filter(Boolean),
        options.requestKeySuffix,
        isStale
      );
    }

    if (!isStale()) {
      syncRangeStateFromDates(normalizedDates, normalizedDate);
    }

    return result;
  }, [
    buildCachedDayResult,
    fetchAndCacheUserVotes,
    isLoggedIn,
    mergeDayIntoState,
    requestPredictionDay,
    syncRangeStateFromDates,
  ]);

  const clearScheduledAdjacentPrefetch = useCallback(() => {
    adjacentPrefetchCancelRef.current?.();
    adjacentPrefetchCancelRef.current = null;
    adjacentPrefetchPendingAnchorRef.current = null;
  }, []);

  const clearScheduledMatchBoundsHydration = useCallback(() => {
    matchBoundsHydrationCancelRef.current?.();
    matchBoundsHydrationCancelRef.current = null;
  }, []);

  const scheduleMatchBoundsHydration = useCallback(() => {
    clearScheduledMatchBoundsHydration();
    matchBoundsHydrationCancelRef.current = schedulePredictionPostPaintIdleWork(() => {
      matchBoundsHydrationCancelRef.current = null;
      void hydrateMatchBounds();
    });
  }, [clearScheduledMatchBoundsHydration, hydrateMatchBounds]);

  const scheduleAdjacentPrefetch = useCallback((anchorDate: string) => {
    const normalizedDate = normalizeDateKey(anchorDate) || anchorDate;
    if (!normalizedDate) {
      return;
    }

    void loadPredictionScheduleAdjacentPrefetchModule().then((module) => {
      module.schedulePredictionAdjacentPrefetch({
        anchorDate: normalizedDate,
        pendingAnchorDateRef: adjacentPrefetchPendingAnchorRef,
        completedAnchorDatesRef: adjacentPrefetchCompletedAnchorsRef,
        adjacentPrefetchCancelRef,
        clearScheduledAdjacentPrefetch,
        dayNavigationByDateRef,
        loadPredictionDay,
      });
    });
  }, [clearScheduledAdjacentPrefetch, loadPredictionDay]);

  const fetchMatchRangeWindow = useCallback(async (request: MatchRangeLoadRequest) => {
    const [{ fetchMatchesByRangeWithMeta }, { buildPredictionRangeWindow }] = await Promise.all([
      loadPredictionRangeApiModule(),
      loadPredictionRangeWindowModule(),
    ]);
    const rangeWindow = buildPredictionRangeWindow({
      anchorDate: request.anchorDate,
      direction: request.direction,
      windowDays: request.windowDays,
    });

    console.info('[prediction.range.load]', {
      reason: request.reason,
      direction: request.direction,
      window: `${rangeWindow.startDate}~${rangeWindow.endDate}`,
      page: 0,
    });

    const result = await fetchMatchesByRangeWithMeta({
      startDate: rangeWindow.startDate,
      endDate: rangeWindow.endDate,
      includePast: true,
      page: 0,
      size: MATCH_FETCH_SIZE,
    });

    return { rangeWindow, result };
  }, []);

  const loadSingleDateForDeepLink = useCallback(async (targetDate: string) => {
    const normalizedDate = normalizePredictionDate(targetDate);
    if (!normalizedDate || deepLinkDateLoadInFlightRef.current === normalizedDate) {
      return;
    }

    const requestId = ++deepLinkDateLoadRequestRef.current;
    deepLinkDateLoadInFlightRef.current = normalizedDate;

    try {
      const result = await loadPredictionDay(normalizedDate, {
        preserveVisibleDate: true,
        requestKeySuffix: `deepLink:date:${normalizedDate}`,
        requestGuard: () => (
          requestId !== deepLinkDateLoadRequestRef.current || !deepLinkResolutionPendingRef.current
        ),
      });

      if (!result.ok) {
        if (!isRangeResultCanceled(result.error)) {
          console.warn('[prediction.deepLink.date_load_fail]', {
            date: normalizedDate,
            message: result.error.message,
          });
        }
        return;
      }
    } catch (error) {
      if (!isCancelLikeError(error) && !isRangeResultCanceled({
        message: error instanceof Error ? error.message : `${error}`,
      })) {
        console.warn('[prediction.deepLink.date_load_fail]', {
          date: normalizedDate,
          message: error instanceof Error ? error.message : '딥링크 대상 날짜 조회 실패',
        });
      }
    } finally {
      if (requestId === deepLinkDateLoadRequestRef.current) {
        deepLinkDateLoadInFlightRef.current = '';
      }
    }
  }, [loadPredictionDay]);

  const loadMoreFutureMatches = useCallback(async (
    forceRetry: boolean = false,
    moveToLoadedFuture: boolean = false,
    reason: MatchRangeLoadReason = 'navigation'
  ) => {
    const { runLoadMoreFutureMatches } = await loadPredictionScheduleBoundaryLoadersModule();
    await runLoadMoreFutureMatches({
      forceRetry,
      moveToLoadedFuture,
      reason,
      allDatesDataRef,
      canLoadMoreFutureRef,
      currentDateIndexRef,
      dayNavigationByDateRef,
      deepLinkDate,
      fetchAndCacheUserVotes,
      fetchMatchRangeWindow,
      futureLoadActiveRef,
      futureRangeRequestRef,
      getLatestBoundDate,
      goToPredictionRecovery,
      isFetchingAllGamesRef,
      isLoggedIn,
      loadPredictionDay,
      restoreFutureRangeLoadState,
      scheduleAdjacentPrefetch,
      setAllDatesData,
      setCanLoadMoreFutureState,
      setCurrentDateIndex,
      setFutureRangeEnd,
      setFutureRangeLoadErrorMessage,
      setFutureRangeLoadState,
      showPredictionErrorOverlay,
      syncRangeStateFromDates,
    });
  }, [
    deepLinkDate,
    fetchAndCacheUserVotes,
    fetchMatchRangeWindow,
    getLatestBoundDate,
    isLoggedIn,
    loadPredictionDay,
    scheduleAdjacentPrefetch,
    restoreFutureRangeLoadState,
    setCanLoadMoreFutureState,
    setFutureRangeEnd,
    goToPredictionRecovery,
    showPredictionErrorOverlay,
    syncRangeStateFromDates,
  ]);

  const loadMorePastMatches = useCallback(async (
    forceRetry: boolean = false,
    moveToLoadedPast: boolean = false,
    reason: MatchRangeLoadReason = 'navigation'
  ) => {
    const { runLoadMorePastMatches } = await loadPredictionScheduleBoundaryLoadersModule();
    await runLoadMorePastMatches({
      forceRetry,
      moveToLoadedPast,
      reason,
      allDatesDataRef,
      canLoadMorePastRef,
      currentDateIndexRef,
      dayNavigationByDateRef,
      deepLinkDate,
      fetchAndCacheUserVotes,
      fetchMatchRangeWindow,
      getEarliestBoundDate,
      isFetchingAllGamesRef,
      isLoggedIn,
      loadPredictionDay,
      pastLoadActiveRef,
      pastRangeRequestRef,
      restorePastRangeLoadState,
      scheduleAdjacentPrefetch,
      setAllDatesData,
      setCanLoadMorePastState,
      setCurrentDateIndex,
      setPastRangeEnd,
      setPastRangeLoadErrorMessage,
      setPastRangeLoadState,
      syncRangeStateFromDates,
    });
  }, [
    deepLinkDate,
    fetchAndCacheUserVotes,
    fetchMatchRangeWindow,
    getEarliestBoundDate,
    isLoggedIn,
    loadPredictionDay,
    scheduleAdjacentPrefetch,
    restorePastRangeLoadState,
    setPastRangeEnd,
    syncRangeStateFromDates,
  ]);

  const fetchAllGames = useCallback(async (forced: boolean = false, options: { silent?: boolean } = {}) => {
    const { silent = false } = options;
    if (isFetchingAllGamesRef.current && !forced) {
      return;
    }

    const requestId = ++initialListRequestRef.current;
    pastRangeRequestRef.current += 1;
    futureRangeRequestRef.current += 1;
    isFetchingAllGamesRef.current = true;
    futureLoadActiveRef.current = false;
    pastLoadActiveRef.current = false;
    setCanLoadMoreFutureState(true);
    setCanLoadMorePastState(true);
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
    setMatchesLoadErrorCode(null);
    setPastRangeLoadErrorMessage(null);
    setFutureRangeLoadErrorMessage(null);
    const hasDeepLinkSeed = Boolean(deepLinkGameId || deepLinkDate);
    if (hasDeepLinkSeed) {
      deepLinkResolutionPendingRef.current = true;
      deepLinkResolutionAttemptRef.current = 0;
      deepLinkResolutionDirectionRef.current = 'future';
    }
    setDeepLinkNotice(null);
    clearScheduledAdjacentPrefetch();
    clearScheduledMatchBoundsHydration();
    scheduleMatchBoundsAfterInitialLoadRef.current = false;
    adjacentPrefetchCompletedAnchorsRef.current.clear();
    matchBoundsRef.current = null;
    matchBoundsHydrationPromiseRef.current = null;
    setMatchBoundsState(null);
    dayNavigationByDateRef.current = {};
    if (!silent) {
      setLoading(true);
    }

    try {
      const today = getTodayString();
      const initialAnchorDate = deepLinkDate || today;

      const firstDayResult = await loadPredictionDay(initialAnchorDate, {
        moveToLoadedDate: true,
        preserveVisibleDate: false,
        replaceExistingDates: true,
        requestKeySuffix: hasDeepLinkSeed ? `deepLink:initial:${initialAnchorDate}` : 'initial',
        requestGuard: () => initialListRequestRef.current !== requestId,
      });
      if (initialListRequestRef.current !== requestId) {
        return;
      }

      if (!firstDayResult.ok) {
        const parsedError = normalizeMatchRangeError(firstDayResult.error);
        setMatchesLoadState('error');
        setMatchesLoadErrorMessage(parsedError.message || '예측 경기 목록 조회에 실패했습니다.');
        setMatchesLoadErrorCode(parsedError.responseCode ?? null);
        const fallbackDates = [{ date: initialAnchorDate, games: [] }];
        setAllDatesData(fallbackDates);
        allDatesDataRef.current = fallbackDates;
        setCurrentDateIndex(0);
        emitFlowEvent('onListLoadFail', 'LIST', {
          errorCode: mapPredictionErrorCode(parsedError.type, parsedError.responseCode),
          recoverable: true,
          copyKey: 'network_error_message',
          stage: 'LIST_LOAD',
          retryConfig: {
            errorCode: mapPredictionErrorCode(parsedError.type, parsedError.responseCode),
            recoverable: true,
            retryEnabled: true,
            keepDraft: true,
            actionPriorityOrder: ['RETRY', 'GO_LIST'],
          },
        });
        return;
      }

      setMatchesLoadState('ready');
      setMatchesLoadErrorMessage(null);
      setMatchesLoadErrorCode(null);
      emitFlowEvent('onListLoad', 'LIST', {
        toastKey: 'list_load_success',
        stage: 'LIST_LOAD',
      });
      const normalizedDates = allDatesDataRef.current;
      if (normalizedDates.length > 0) {
        const deepLinkSelection = deepLinkGameId
          ? resolveDeepLinkSelection(normalizedDates, deepLinkGameId, deepLinkDate, {
            allowDateFallback: false,
          })
          : null;

        if (deepLinkSelection) {
          skipDateResetRef.current = true;
          setCurrentDateIndex(deepLinkSelection.dateIndex);
          setSelectedGame(deepLinkSelection.gameIndex);
          deepLinkResolutionPendingRef.current = false;
          deepLinkResolutionAttemptRef.current = 0;
        } else {
          setCurrentDateIndex(resolveInitialPredictionDateIndex(normalizedDates, initialAnchorDate));
          if (deepLinkGameId && deepLinkDate && normalizedDates.some((entry) => entry.date === deepLinkDate)) {
            deepLinkResolutionPendingRef.current = false;
            deepLinkResolutionAttemptRef.current = 0;
            setDeepLinkNotice(buildDeepLinkNotFoundMessage(
              deepLinkGameId,
              deepLinkDate,
              deepLinkParamValidationNotice,
            ));
            emitFlowEvent('onErrorOverlayFallback', 'ERROR', {
              gameId: normalizedDates[0]?.games[0]?.gameId,
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
          }
        }
        syncRangeStateFromDates(normalizedDates, initialAnchorDate);
      }
      scheduleMatchBoundsAfterInitialLoadRef.current = true;
    } catch (error) {
      if (isCancelLikeError(error)) {
        return;
      }
      const fallbackDate = deepLinkDate || getTodayString();
      const parsedError = parseError(error);
      setMatchesLoadState('error');
      setMatchesLoadErrorMessage(parsedError.message || '예측 경기 목록 조회에 실패했습니다.');
      setMatchesLoadErrorCode(parsedError.responseCode ?? null);
      const fallbackDates = [{ date: fallbackDate, games: [] }];
      setAllDatesData(fallbackDates);
      allDatesDataRef.current = fallbackDates;
      setCurrentDateIndex(0);
      emitFlowEvent('onListLoadFail', 'LIST', {
        errorCode: mapPredictionErrorCode(parsedError.type, parsedError.responseCode),
        recoverable: true,
        copyKey: 'network_error_message',
        stage: 'LIST_LOAD',
        retryConfig: {
          errorCode: mapPredictionErrorCode(parsedError.type, parsedError.responseCode),
          recoverable: true,
          retryEnabled: true,
          keepDraft: true,
          actionPriorityOrder: ['RETRY', 'GO_LIST'],
        },
      });
    } finally {
      if (!silent) {
        setLoading(false);
      }
      if (scheduleMatchBoundsAfterInitialLoadRef.current) {
        scheduleMatchBoundsAfterInitialLoadRef.current = false;
        scheduleMatchBoundsHydration();
      }
      isFetchingAllGamesRef.current = false;
    }
  }, [
    clearScheduledAdjacentPrefetch,
    clearScheduledMatchBoundsHydration,
    deepLinkDate,
    deepLinkGameId,
    deepLinkParamValidationNotice,
    emitFlowEvent,
    loadPredictionDay,
    scheduleMatchBoundsHydration,
    setCanLoadMoreFutureState,
    setCanLoadMorePastState,
    syncRangeStateFromDates,
  ]);

  const reloadMatches = useCallback(() => {
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
    void fetchAllGames(true);
  }, [emitFlowEvent, fetchAllGames]);

  const retryLoadMoreFutureMatches = useCallback(() => {
    setFutureRangeLoadState('idle');
    setFutureRangeLoadErrorMessage(null);
    setCanLoadMoreFutureState(true);
    void loadMoreFutureMatches(true, true);
  }, [loadMoreFutureMatches, setCanLoadMoreFutureState]);

  const retryLoadMorePastMatches = useCallback(() => {
    setPastRangeLoadState('idle');
    setPastRangeLoadErrorMessage(null);
    setCanLoadMorePastState(true);
    void loadMorePastMatches(true, true);
  }, [loadMorePastMatches, setCanLoadMorePastState]);

  useEffect(() => {
    const nextSignature = `${deepLinkGameId}|${deepLinkDate}`;
    if (previousDeepLinkSignatureRef.current === nextSignature) {
      return;
    }

    previousDeepLinkSignatureRef.current = nextSignature;
    if (programmaticSearchSignatureRef.current === nextSignature) {
      deepLinkResolutionPendingRef.current = false;
      deepLinkResolutionAttemptRef.current = 0;
      deepLinkResolutionDirectionRef.current = 'future';
      setDeepLinkNotice(null);
      return;
    }

    deepLinkResolutionPendingRef.current = Boolean(deepLinkGameId || deepLinkDate);
    navigationSeedAppliedRef.current = false;
    deepLinkResolutionAttemptRef.current = 0;
    deepLinkResolutionDirectionRef.current = 'future';
    setDeepLinkNotice(null);
  }, [deepLinkDate, deepLinkGameId]);

  useEffect(() => {
    if (!hasNavigationSeedGame || !navigationSeedGame || navigationSeedAppliedRef.current) {
      return;
    }

    let cancelled = false;

    void loadPredictionScheduleDeepLinkRuntimeModule()
      .then(({ buildPredictionNavigationSeedRuntimeResult }) => {
        if (cancelled) {
          return;
        }

        const seedRuntimeResult = buildPredictionNavigationSeedRuntimeResult({
          navigationSeedGame,
          deepLinkDate,
          stateGame,
        });
        if (!seedRuntimeResult) {
          return;
        }

        const {
          seededGame,
          seededGameDetail,
          nextAllDatesData,
        } = seedRuntimeResult;

        setAllDatesData(nextAllDatesData);
        allDatesDataRef.current = nextAllDatesData;
        setCurrentDateIndex(0);
        setSelectedGame(0);
        matchBoundsRef.current = null;
        matchBoundsHydrationPromiseRef.current = null;
        setMatchBoundsState(null);
        setLoading(false);
        setMatchesLoadState('ready');
        setMatchesLoadErrorMessage(null);
        setMatchesLoadErrorCode(null);
        setPastRangeLoadState('ready');
        setFutureRangeLoadState('ready');
        setCanLoadMorePastState(true);
        setCanLoadMoreFutureState(true);
        setPastRangeLoadErrorMessage(null);
        setFutureRangeLoadErrorMessage(null);
        navigationSeedAppliedRef.current = true;
        primeGameDetail(seededGame.gameId, seededGameDetail);
        scheduleMatchBoundsHydration();
      });

    return () => {
      cancelled = true;
    };
  }, [
    deepLinkDate,
    hasNavigationSeedGame,
    navigationSeedGame,
    primeGameDetail,
    setCanLoadMoreFutureState,
    setCanLoadMorePastState,
    stateGame,
    scheduleMatchBoundsHydration,
  ]);

  useEffect(() => {
    if (!rawDeepLinkGameId && !rawDeepLinkDate) {
      setDeepLinkParamValidationNotice(null);
      return;
    }

    let cancelled = false;

    void loadPredictionScheduleDeepLinkRuntimeModule().then(({
      sanitizePredictionDeepLinkParams: sanitizeDeepLinkParams,
    }) => {
      if (cancelled) {
        return;
      }

      const {
        nextSearchParams,
        hasChange,
        invalidNotice,
      } = sanitizeDeepLinkParams(searchParams, rawDeepLinkGameId, rawDeepLinkDate);

      if (hasChange && nextSearchParams.toString() !== searchParams.toString()) {
        setSearchParams(nextSearchParams, { replace: true });
      }

      setDeepLinkParamValidationNotice(invalidNotice);
    });

    return () => {
      cancelled = true;
    };
  }, [rawDeepLinkDate, rawDeepLinkGameId, searchParams, setSearchParams]);

  useEffect(() => {
    if (hasStateNavigationSeed && isNavigationSeedResolving) {
      return;
    }
    if (!isAuthLoading) {
      if (suppressNextProgrammaticSearchLoadRef.current) {
        suppressNextProgrammaticSearchLoadRef.current = false;
        return;
      }

      setMatchesLoadState('idle');
      void fetchAllGames(false, { silent: hasNavigationSeedGame });
    }
  }, [
    fetchAllGames,
    hasStateNavigationSeed,
    hasNavigationSeedGame,
    isAuthLoading,
    isLoggedIn,
    isNavigationSeedResolving,
    setCanLoadMoreFutureState,
    setCanLoadMorePastState,
  ]);

  useEffect(() => {
    const visibleDate = allDatesData[currentDateIndex]?.date;
    if (!visibleDate) {
      return;
    }
    syncRangeStateFromDates(allDatesData, visibleDate);
  }, [allDatesData, currentDateIndex, syncRangeStateFromDates]);

  useEffect(() => {
    const visibleDate = allDatesData[currentDateIndex]?.date;
    if (!visibleDate || dayNavigationByDateRef.current[visibleDate] || isFetchingAllGamesRef.current) {
      return;
    }

    void loadPredictionDay(visibleDate, {
      preserveVisibleDate: true,
      requestKeySuffix: `hydrate:current:${visibleDate}`,
    });
  }, [allDatesData, currentDateIndex, loadPredictionDay]);

  useEffect(() => {
    if (matchesLoadState !== 'ready') {
      return;
    }

    const visibleDate = allDatesData[currentDateIndex]?.date;
    if (!visibleDate || !dayNavigationByDateRef.current[visibleDate]) {
      return;
    }

    scheduleAdjacentPrefetch(visibleDate);
  }, [allDatesData, currentDateIndex, matchesLoadState, scheduleAdjacentPrefetch]);

  useEffect(() => clearScheduledAdjacentPrefetch, [clearScheduledAdjacentPrefetch]);

  const visibleDateKey = allDatesData[currentDateIndex]?.date || '';
  useEffect(() => {
    if (skipDateResetRef.current) {
      skipDateResetRef.current = false;
      return;
    }
    setSelectedGame(0);
  }, [visibleDateKey]);

  useEffect(() => {
    let canceled = false;

    if (
      hasNavigationSeedGame
      && navigationSeedAppliedRef.current
      && (isAuthLoading || isFetchingAllGamesRef.current)
    ) {
      return;
    }

    if (!deepLinkResolutionPendingRef.current) {
      if (!deepLinkGameId && !deepLinkDate) {
        if (deepLinkParamValidationNotice) {
          setDeepLinkNotice(`${deepLinkParamValidationNotice} 기본 화면으로 이동합니다.`);
        } else {
          setDeepLinkNotice(null);
        }
      }
      return;
    }
    if (allDatesData.length === 0) {
      return;
    }
    void loadPredictionScheduleDeepLinkRuntimeModule().then(({
      runPredictionScheduleDeepLinkResolution,
    }) => {
      if (canceled) {
        return;
      }

      const markDeepLinkResolved = () => {
        deepLinkResolutionPendingRef.current = false;
        deepLinkResolutionAttemptRef.current = 0;
      };

      runPredictionScheduleDeepLinkResolution({
        allDatesData,
        currentDateIndex,
        deepLinkGameId,
        deepLinkDate,
        deepLinkParamValidationNotice,
        allowDateFallback: !deepLinkGameId,
        canResolveMorePast: canLoadMorePastRef.current,
        canResolveMoreFuture: canLoadMoreFutureRef.current,
        deepLinkResolutionAttempt: deepLinkResolutionAttemptRef.current,
        deepLinkResolutionDirection: deepLinkResolutionDirectionRef.current,
        onMarkDeepLinkResolved: markDeepLinkResolved,
        onSetDeepLinkNotice: setDeepLinkNotice,
        onSelectResolvedDeepLink: (selection) => {
          activateMatchTab();
          if (selection.dateIndex !== currentDateIndex) {
            skipDateResetRef.current = true;
            setCurrentDateIndex(selection.dateIndex);
          }
          setSelectedGame(selection.gameIndex);
        },
        onEmitSelectionResolved: (selectedDeepLinkGameId) => {
          emitFlowEvent('onInputValid', 'DETAIL_EDIT', {
            gameId: selectedDeepLinkGameId,
            validation: [{
              fieldId: 'deep_link_match_id',
              severity: 'info',
              messageCode: 'detail_validate_success',
            }],
            recoveryAction: 'GO_BACK',
          });
        },
        onLoadSingleDate: (targetDate, nextAttempt) => {
          deepLinkResolutionAttemptRef.current = nextAttempt;
          void loadSingleDateForDeepLink(targetDate);
        },
        onLoadMore: (direction, nextAttempt, nextDirection) => {
          deepLinkResolutionAttemptRef.current = nextAttempt;
          deepLinkResolutionDirectionRef.current = nextDirection;
          if (direction === 'future') {
            void loadMoreFutureMatches(true, true, 'deepLink');
          } else {
            void loadMorePastMatches(true, true, 'deepLink');
          }
        },
        onFallback: (_notice, currentGameId) => {
          emitFlowEvent('onErrorOverlayFallback', 'ERROR', {
            gameId: currentGameId,
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
        },
      });
    });

    return () => {
      canceled = true;
    };
  }, [
    activateMatchTab,
    allDatesData,
    currentDateIndex,
    deepLinkDate,
    deepLinkGameId,
    deepLinkParamValidationNotice,
    emitFlowEvent,
    hasNavigationSeedGame,
    isAuthLoading,
    loadMoreFutureMatches,
    loadMorePastMatches,
    loadSingleDateForDeepLink,
  ]);

  const resetNavigationDeepLinkResolution = useCallback(() => {
    deepLinkResolutionPendingRef.current = false;
    deepLinkResolutionAttemptRef.current = 0;
    deepLinkResolutionDirectionRef.current = 'future';
  }, []);

  const goToPreviousDate = useCallback(() => {
    if (currentDateIndex > 0) {
      const previousIndex = currentDateIndex - 1;
      resetNavigationDeepLinkResolution();
      setCurrentDateIndex(previousIndex);
      return;
    }

    if (canLoadMorePastRef.current) {
      resetNavigationDeepLinkResolution();
      void loadMorePastMatches(false, true);
    }
  }, [currentDateIndex, loadMorePastMatches, resetNavigationDeepLinkResolution]);

  const goToNextDate = useCallback(() => {
    if (currentDateIndex < allDatesData.length - 1) {
      const nextIndex = currentDateIndex + 1;
      resetNavigationDeepLinkResolution();
      setCurrentDateIndex(nextIndex);
      return;
    }

    if (canLoadMoreFutureRef.current) {
      resetNavigationDeepLinkResolution();
      void loadMoreFutureMatches(false, true);
    }
  }, [allDatesData.length, currentDateIndex, loadMoreFutureMatches, resetNavigationDeepLinkResolution]);

  const goToDate = useCallback((targetDate: string) => {
    const normalizedDate = normalizePredictionDate(targetDate);
    if (!normalizedDate) {
      return;
    }

    const loadedIndex = allDatesDataRef.current.findIndex((entry) => entry.date === normalizedDate);
    if (loadedIndex !== -1) {
      resetNavigationDeepLinkResolution();
      setCurrentDateIndex(loadedIndex);
      return;
    }

    resetNavigationDeepLinkResolution();
    void loadPredictionDay(normalizedDate, {
      moveToLoadedDate: true,
      preserveVisibleDate: false,
      requestKeySuffix: `jump:${normalizedDate}`,
    });
  }, [loadPredictionDay, resetNavigationDeepLinkResolution]);

  useEffect(() => () => {
    clearScheduledAdjacentPrefetch();
    clearScheduledMatchBoundsHydration();
  }, [clearScheduledAdjacentPrefetch, clearScheduledMatchBoundsHydration]);

  const currentDateGames = allDatesData[currentDateIndex]?.games || [];
  const currentDate = allDatesData[currentDateIndex]?.date || getTodayString();
  const currentGame = getCurrentGame(allDatesData, currentDateIndex, selectedGame);
  const currentDayNavigationMeta = dayNavigationByDateRef.current[currentDate] || null;

  return {
    selectedGame,
    setSelectedGame,
    allDatesData,
    currentDateIndex,
    currentDateGames,
    currentDate,
    currentGame,
    currentDayNavigationMeta,
    loading,
    matchesLoadState,
    matchesLoadErrorMessage,
    matchesLoadErrorCode,
    pastRangeLoadState,
    pastRangeLoadErrorMessage,
    futureRangeLoadState,
    futureRangeLoadErrorMessage,
    canLoadMorePast,
    canLoadMoreFuture,
    deepLinkNotice,
    matchBounds: matchBoundsState,
    loadMoreFutureMatches,
    retryLoadMoreFutureMatches,
    retryLoadMorePastMatches,
    reloadMatches,
    goToPreviousDate,
    goToNextDate,
    goToDate,
    setProgrammaticSearchParams,
  };
};
