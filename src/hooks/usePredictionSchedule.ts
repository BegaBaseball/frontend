import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMatchesByDay,
  type MatchDayResult,
} from '../api/prediction';
import { getTodayString } from '../utils/predictionDates';
import { getApiErrorMessage, parseError, type ParsedError } from '../utils/errorUtils';
import {
  normalizePredictionDate,
  resolveInitialPredictionDateIndex,
} from '../utils/predictionHomeLogic';
import {
  type PredictionLocationState,
} from '../utils/predictionDeepLink';
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
  emitFlowEvent: PredictionFlowEmitter;
  showPredictionErrorOverlay: PredictionOverlayController['showPredictionErrorOverlay'];
  fetchAndCacheUserVotes: (
    gameIds: string[],
    requestKeySuffix: string,
    requestGuard?: () => boolean
  ) => Promise<void>;
  primeGameDetail: (gameId: string, detail: GameDetail) => void;
  activateMatchTab: () => void;
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

  if (normalizedStatus !== null) {
    return getApiErrorMessage({
      status: normalizedStatus,
      data: {
        message: normalizedMessage || undefined,
        code: error?.code,
      },
      message: normalizedMessage || fallback,
    }, fallback);
  }

  return getApiErrorMessage(new Error(normalizedMessage || fallback), fallback);
};

const normalizeMatchRangeError = (error?: {
  message?: string;
  status?: number | null;
  code?: string;
}): ParsedError => {
  const statusCode = error?.status ?? null;
  const normalizedStatus = typeof statusCode === 'number' ? statusCode : null;

  if (normalizedStatus === 401) {
    return {
      type: 'AUTH',
      responseCode: error?.code,
      message: getPredictionRangeErrorMessage(error, '로그인 정보를 다시 확인해주세요.'),
      statusCode: normalizedStatus,
    };
  }
  if (normalizedStatus === 403) {
    return {
      type: 'PERMISSION',
      responseCode: error?.code,
      message: getPredictionRangeErrorMessage(error, '접근 권한이 없습니다.'),
      statusCode: normalizedStatus,
    };
  }
  if (normalizedStatus === 404) {
    return {
      type: 'NOT_FOUND',
      responseCode: error?.code,
      message: getPredictionRangeErrorMessage(error, '요청한 정보를 찾을 수 없습니다.'),
      statusCode: normalizedStatus,
    };
  }
  if (normalizedStatus !== null && normalizedStatus >= 500) {
    return {
      type: 'SERVER',
      responseCode: error?.code,
      message: getPredictionRangeErrorMessage(error, '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.'),
      statusCode: normalizedStatus,
    };
  }
  return {
    type: 'UNKNOWN',
    responseCode: error?.code,
    message: getPredictionRangeErrorMessage(error, '예측 경기 목록 조회에 실패했습니다.'),
    statusCode: normalizedStatus,
  };
};

export const usePredictionSchedule = ({
  isLoggedIn,
  isAuthLoading,
  searchParams,
  setSearchParams,
  locationState,
  emitFlowEvent,
  showPredictionErrorOverlay,
  fetchAndCacheUserVotes,
  primeGameDetail,
  activateMatchTab,
}: UsePredictionScheduleParams) => {
  const [selectedGame, setSelectedGame] = useState(0);
  const [allDatesData, setAllDatesData] = useState<DateGames[]>([]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [matchBoundsState, setMatchBoundsState] = useState<MatchBounds | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchesLoadState, setMatchesLoadState] = useState<'idle' | 'ready' | 'error'>('idle');
  const [matchesLoadErrorMessage, setMatchesLoadErrorMessage] = useState<string | null>(null);
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
  const adjacentPrefetchTimeoutRef = useRef<number | null>(null);
  const adjacentPrefetchIdleCallbackRef = useRef<number | null>(null);

  const goToPredictionRecovery = useCallback((options?: {
    currentDate?: string | null;
    currentGameId?: string | null;
  }) => {
    if (typeof window === 'undefined') {
      return;
    }

    const visibleDate = allDatesDataRef.current[currentDateIndexRef.current]?.date || null;
    const visibleGameId = allDatesDataRef.current[currentDateIndexRef.current]?.games[selectedGame]?.gameId || null;

    void loadPredictionScheduleDeepLinkRuntimeModule().then(({ buildPredictionRecoveryPath }) => {
      window.location.href = buildPredictionRecoveryPath({
        currentDate: options?.currentDate ?? visibleDate,
        currentGameId: options?.currentGameId ?? visibleGameId,
        searchParams,
      });
    });
  }, [searchParams, selectedGame]);

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

  useEffect(() => {
    let canceled = false;

    if (!stateGame) {
      setNavigationSeedGame(null);
      setIsNavigationSeedResolving(false);
      return () => {
        canceled = true;
      };
    }

    setIsNavigationSeedResolving(true);
    void loadPredictionScheduleDeepLinkRuntimeModule().then(({ buildPredictionNavigationSeedPreview }) => {
      if (canceled) {
        return;
      }

      setNavigationSeedGame(buildPredictionNavigationSeedPreview(stateGame, deepLinkGameId, deepLinkDate));
      setIsNavigationSeedResolving(false);
    }).catch(() => {
      if (canceled) {
        return;
      }

      setNavigationSeedGame(null);
      setIsNavigationSeedResolving(false);
    });

    return () => {
      canceled = true;
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

  const normalizeMatchBoundsDate = useCallback((value: string | null | undefined): string | null => {
    if (!value) {
      return null;
    }

    return normalizePredictionDate(value);
  }, []);

  const getEarliestBoundDate = useCallback(() => normalizeMatchBoundsDate(
    matchBoundsRef.current?.earliestGameDate
  ), [normalizeMatchBoundsDate]);

  const getLatestBoundDate = useCallback(() => normalizeMatchBoundsDate(
    matchBoundsRef.current?.latestGameDate
  ), [normalizeMatchBoundsDate]);

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
  }, [normalizeMatchBoundsDate]);

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

  const buildCanceledDayResult = useCallback((): MatchDayResult => ({
    ok: false,
    error: {
      message: 'canceled',
      code: 'ERR_CANCELED',
      status: 0,
    },
  }), []);

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
      return buildCanceledDayResult();
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
    const interactiveGames = resultGames.filter((game) => game.homeScore === null && game.awayScore === null);
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
    buildCanceledDayResult,
    fetchAndCacheUserVotes,
    isLoggedIn,
    mergeDayIntoState,
    requestPredictionDay,
    syncRangeStateFromDates,
  ]);

  const prefetchAdjacentDays = useCallback((anchorDate: string) => {
    const normalizedDate = normalizeDateKey(anchorDate) || anchorDate;
    const meta = dayNavigationByDateRef.current[normalizedDate];
    if (!meta) {
      return;
    }

    if (meta.prevDate) {
      void loadPredictionDay(meta.prevDate, {
        preserveVisibleDate: true,
        requestKeySuffix: `prefetch:past:${normalizedDate}`,
      });
    }

    if (meta.nextDate) {
      void loadPredictionDay(meta.nextDate, {
        preserveVisibleDate: true,
        requestKeySuffix: `prefetch:future:${normalizedDate}`,
      });
    }
  }, [loadPredictionDay]);

  const clearScheduledAdjacentPrefetch = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (adjacentPrefetchIdleCallbackRef.current !== null && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(adjacentPrefetchIdleCallbackRef.current);
      adjacentPrefetchIdleCallbackRef.current = null;
    }
    if (adjacentPrefetchTimeoutRef.current !== null) {
      globalThis.clearTimeout(adjacentPrefetchTimeoutRef.current);
      adjacentPrefetchTimeoutRef.current = null;
    }
  }, []);

  const scheduleAdjacentPrefetch = useCallback((anchorDate: string) => {
    if (typeof window === 'undefined') {
      prefetchAdjacentDays(anchorDate);
      return;
    }

    clearScheduledAdjacentPrefetch();
    let hasRun = false;
    const run = () => {
      if (hasRun) {
        return;
      }
      hasRun = true;
      adjacentPrefetchIdleCallbackRef.current = null;
      adjacentPrefetchTimeoutRef.current = null;
      prefetchAdjacentDays(anchorDate);
    };

    if ('requestIdleCallback' in window) {
      adjacentPrefetchIdleCallbackRef.current = window.requestIdleCallback(run, {
        timeout: 1200,
      });
    }

    adjacentPrefetchTimeoutRef.current = globalThis.setTimeout(run, 650) as unknown as number;
  }, [clearScheduledAdjacentPrefetch, prefetchAdjacentDays]);

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
    setPastRangeLoadErrorMessage(null);
    setFutureRangeLoadErrorMessage(null);
    setDeepLinkNotice(null);
    matchBoundsRef.current = null;
    matchBoundsHydrationPromiseRef.current = null;
    setMatchBoundsState(null);
    dayNavigationByDateRef.current = {};
    if (!silent) {
      setLoading(true);
    }

    try {
      const today = getTodayString();
      const hasDeepLinkSeed = Boolean(deepLinkGameId || deepLinkDate);
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
        const fallbackDates = [{ date: initialAnchorDate, games: [] }];
        setAllDatesData(fallbackDates);
        allDatesDataRef.current = fallbackDates;
        setCurrentDateIndex(0);
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
        return;
      }

      setMatchesLoadState('ready');
      setMatchesLoadErrorMessage(null);
      emitFlowEvent('onListLoad', 'LIST', {
        toastKey: 'list_load_success',
        stage: 'LIST_LOAD',
      });
      const normalizedDates = allDatesDataRef.current;
      if (normalizedDates.length > 0) {
        setCurrentDateIndex(resolveInitialPredictionDateIndex(normalizedDates, initialAnchorDate));
        syncRangeStateFromDates(normalizedDates, initialAnchorDate);
      }
      scheduleAdjacentPrefetch(initialAnchorDate);
      void hydrateMatchBounds();
    } catch (error) {
      if (isCancelLikeError(error)) {
        return;
      }
      const fallbackDate = deepLinkDate || getTodayString();
      const parsedError = parseError(error);
      setMatchesLoadState('error');
      setMatchesLoadErrorMessage(parsedError.message || '예측 경기 목록 조회에 실패했습니다.');
      const fallbackDates = [{ date: fallbackDate, games: [] }];
      setAllDatesData(fallbackDates);
      allDatesDataRef.current = fallbackDates;
      setCurrentDateIndex(0);
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
    } finally {
      if (!silent) {
        setLoading(false);
      }
      isFetchingAllGamesRef.current = false;
    }
  }, [
    deepLinkDate,
    deepLinkGameId,
    emitFlowEvent,
    hydrateMatchBounds,
    loadPredictionDay,
    scheduleAdjacentPrefetch,
    setCanLoadMoreFutureState,
    setCanLoadMorePastState,
    showPredictionErrorOverlay,
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
    deepLinkResolutionPendingRef.current = Boolean(nextSignature);
    navigationSeedAppliedRef.current = false;
    deepLinkResolutionAttemptRef.current = 0;
    deepLinkResolutionDirectionRef.current = 'future';
    setDeepLinkNotice(null);
  }, [deepLinkDate, deepLinkGameId]);

  useEffect(() => {
    let canceled = false;

    if (!hasNavigationSeedGame || !navigationSeedGame || navigationSeedAppliedRef.current) {
      return () => {
        canceled = true;
      };
    }

    void loadPredictionScheduleDeepLinkRuntimeModule().then(({ buildPredictionNavigationSeedRuntimeResult }) => {
      if (canceled) {
        return;
      }

      const runtimeResult = buildPredictionNavigationSeedRuntimeResult({
        navigationSeedGame,
        deepLinkDate,
        stateGame,
      });

      if (!runtimeResult) {
        return;
      }

      setAllDatesData(runtimeResult.nextAllDatesData);
      allDatesDataRef.current = runtimeResult.nextAllDatesData;
      setCurrentDateIndex(0);
      setSelectedGame(0);
      matchBoundsRef.current = null;
      matchBoundsHydrationPromiseRef.current = null;
      setMatchBoundsState(null);
      setLoading(false);
      setMatchesLoadState('ready');
      setPastRangeLoadState('ready');
      setFutureRangeLoadState('ready');
      setCanLoadMorePastState(true);
      setCanLoadMoreFutureState(true);
      deepLinkResolutionPendingRef.current = false;
      deepLinkResolutionAttemptRef.current = 0;
      setPastRangeLoadErrorMessage(null);
      setFutureRangeLoadErrorMessage(null);
      navigationSeedAppliedRef.current = true;
      primeGameDetail(runtimeResult.seededGame.gameId, runtimeResult.seededGameDetail);
      void hydrateMatchBounds();
    });
    return () => {
      canceled = true;
    };
  }, [
    deepLinkDate,
    hasNavigationSeedGame,
    navigationSeedGame,
    primeGameDetail,
    setCanLoadMoreFutureState,
    setCanLoadMorePastState,
    stateGame,
    hydrateMatchBounds,
  ]);

  useEffect(() => {
    let canceled = false;

    if (!rawDeepLinkGameId && !rawDeepLinkDate) {
      setDeepLinkParamValidationNotice(null);
      return () => {
        canceled = true;
      };
    }

    void loadPredictionScheduleDeepLinkRuntimeModule().then(({ sanitizePredictionDeepLinkParams }) => {
      if (canceled) {
        return;
      }

      const {
        nextSearchParams,
        hasChange,
        invalidNotice,
      } = sanitizePredictionDeepLinkParams(searchParams, rawDeepLinkGameId, rawDeepLinkDate);

      if (hasChange && nextSearchParams.toString() !== searchParams.toString()) {
        setSearchParams(nextSearchParams, { replace: true });
      }

      setDeepLinkParamValidationNotice(invalidNotice);
    });

    return () => {
      canceled = true;
    };
  }, [rawDeepLinkDate, rawDeepLinkGameId, searchParams, setSearchParams]);

  useEffect(() => {
    if (hasStateNavigationSeed && isNavigationSeedResolving) {
      return;
    }
    if (!isAuthLoading) {
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
    }).then((result) => {
      if (result.ok) {
        scheduleAdjacentPrefetch(visibleDate);
      }
    });
  }, [allDatesData, currentDateIndex, loadPredictionDay, scheduleAdjacentPrefetch]);

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

    if (hasNavigationSeedGame && navigationSeedAppliedRef.current) {
      if (deepLinkResolutionPendingRef.current) {
        deepLinkResolutionPendingRef.current = false;
        deepLinkResolutionAttemptRef.current = 0;
        deepLinkResolutionDirectionRef.current = 'future';
      }
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
    loadMoreFutureMatches,
    loadMorePastMatches,
    loadSingleDateForDeepLink,
  ]);

  const goToPreviousDate = useCallback(() => {
    if (currentDateIndex > 0) {
      setCurrentDateIndex(currentDateIndex - 1);
      return;
    }

    if (canLoadMorePastRef.current) {
      void loadMorePastMatches(false, true);
    }
  }, [allDatesData.length, currentDateIndex, loadMorePastMatches]);

  const goToNextDate = useCallback(() => {
    if (currentDateIndex < allDatesData.length - 1) {
      setCurrentDateIndex(currentDateIndex + 1);
      return;
    }

    if (canLoadMoreFutureRef.current) {
      void loadMoreFutureMatches(false, true);
    }
  }, [allDatesData.length, currentDateIndex, loadMoreFutureMatches]);

  const goToDate = useCallback((targetDate: string) => {
    const normalizedDate = normalizePredictionDate(targetDate);
    if (!normalizedDate) {
      return;
    }

    const loadedIndex = allDatesDataRef.current.findIndex((entry) => entry.date === normalizedDate);
    if (loadedIndex !== -1) {
      setCurrentDateIndex(loadedIndex);
      return;
    }

    void loadPredictionDay(normalizedDate, {
      moveToLoadedDate: true,
      preserveVisibleDate: false,
      requestKeySuffix: `jump:${normalizedDate}`,
    });
  }, [loadPredictionDay]);

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
  };
};
