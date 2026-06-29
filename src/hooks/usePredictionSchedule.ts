import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMatchesByDay,
  type MatchDayFailure,
  type MatchDayResult,
} from '../api/predictionMatchDay';
import { fetchGameLiveSummaries } from '../api/prediction';
import {
  PREDICTION_BOOTSTRAP_INVALIDATED_EVENT,
  fetchPredictionBootstrap,
  type PredictionBootstrapResponse,
} from '../api/predictionBootstrap';
import { getTodayString } from '../utils/predictionDates';
import { parseError } from '../utils/errorUtils';
import {
  normalizePredictionDate,
  resolveDeepLinkSelection,
  resolveInitialPredictionDateIndex,
} from '../utils/predictionHomeLogic';
import {
  buildDeepLinkNotFoundMessage,
  buildPredictionRecoveryPath,
} from '../utils/predictionDeepLink';
import {
  schedulePredictionPostPaintIdleWork,
  type PredictionDeferredWorkCancel,
} from '../utils/predictionDeferredWork';
import {
  LIVE_GAME_POLL_INTERVAL_MS,
  mergeHomeGamesWithLiveSummaries,
  shouldPollPredictionLiveGame,
} from '../utils/liveGame';
import type { DateGames, Game, GameLiveSummary, MatchBounds, MatchDayNavigation } from '../types/prediction';
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
} from './predictionHookShared';
import type {
  UsePredictionScheduleParams,
  MatchDayNavigationMeta,
  LoadPredictionDayOptions,
} from './predictionScheduleTypes';
import {
  toPredictionGameId,
  noopEmitFlowEvent,
  noopShowPredictionErrorOverlay,
  noopFetchAndCacheUserVotes,
  noopPrimeGameDetail,
  noopActivateMatchTab,
  CANCELED_MATCH_DAY_RESULT,
  normalizeMatchBoundsDate,
  normalizeMatchRangeError,
} from './predictionScheduleUtils';
import type { PredictionNavigationOptions } from '../utils/predictionDeepLink';
import { usePredictionRangeState } from './usePredictionRangeState';
import * as predictionRangeApi from '../api/predictionRange';
import * as predictionRangeWindow from '../utils/predictionRangeWindow';
import * as predictionScheduleBoundaryLoaders from './predictionScheduleBoundaryLoaders';
import * as predictionScheduleDeepLinkRuntime from './predictionScheduleDeepLinkRuntime';
import * as predictionScheduleAdjacentPrefetch from './predictionScheduleAdjacentPrefetch';
import * as predictionRangeLoader from '../utils/predictionRangeLoader';

export const usePredictionSchedule = ({
  isLoggedIn,
  isAuthLoading,
  searchParams,
  setSearchParams,
  locationState,
  emitFlowEvent = noopEmitFlowEvent,
  showPredictionErrorOverlay = noopShowPredictionErrorOverlay,
  disabled = false,
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
  const [deepLinkNotice, setDeepLinkNotice] = useState<string | null>(null);
  const [deepLinkParamValidationNotice, setDeepLinkParamValidationNotice] = useState<string | null>(null);
  const [navigationSeedGame, setNavigationSeedGame] = useState<Game | null>(null);
  const [isNavigationSeedResolving, setIsNavigationSeedResolving] = useState(false);
  const [bootstrapByGameId, setBootstrapByGameId] = useState<Record<string, PredictionBootstrapResponse>>({});

  const {
    pastRangeLoadState,
    setPastRangeLoadState,
    pastRangeLoadErrorMessage,
    setPastRangeLoadErrorMessage,
    futureRangeLoadState,
    setFutureRangeLoadState,
    futureRangeLoadErrorMessage,
    setFutureRangeLoadErrorMessage,
    canLoadMorePast,
    canLoadMoreFuture,
    canLoadMoreFutureRef,
    canLoadMorePastRef,
    pastLoadActiveRef,
    futureLoadActiveRef,
    setCanLoadMoreFutureState,
    setCanLoadMorePastState,
    setPastRangeEnd,
    setFutureRangeEnd,
    restorePastRangeLoadState,
    restoreFutureRangeLoadState,
  } = usePredictionRangeState();

  const isFetchingAllGamesRef = useRef(false);
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
  const scheduleLiveSummaryInFlightRef = useRef(false);
  const scheduleLiveSummaryAbortRef = useRef<AbortController | null>(null);
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleBootstrapInvalidated = (event: Event) => {
      const gameId = event instanceof CustomEvent && typeof event.detail?.gameId === 'string'
        ? event.detail.gameId
        : '';
      if (!gameId) {
        setBootstrapByGameId({});
        return;
      }
      setBootstrapByGameId((prev) => {
        if (!prev[gameId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[gameId];
        return next;
      });
    };

    window.addEventListener(PREDICTION_BOOTSTRAP_INVALIDATED_EVENT, handleBootstrapInvalidated);
    return () => {
      window.removeEventListener(PREDICTION_BOOTSTRAP_INVALIDATED_EVENT, handleBootstrapInvalidated);
    };
  }, []);

  const setProgrammaticSearchParams = useCallback((
    nextSearchParams: URLSearchParams,
    navigateOptions?: PredictionNavigationOptions,
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

    const { resolvePredictionNavigationSeedGame } = predictionScheduleDeepLinkRuntime;
    if (!cancelled) {
      setNavigationSeedGame(resolvePredictionNavigationSeedGame({
        stateGame,
        deepLinkGameId,
        deepLinkDate,
      }));
      setIsNavigationSeedResolving(false);
    }

    return () => {
      cancelled = true;
    };
  }, [deepLinkDate, deepLinkGameId, stateGame]);

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
      const { fetchMatchBounds } = predictionRangeApi;
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
    const { mergePredictionDateBuckets } = predictionRangeLoader;
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
      currentDateIndexRef.current = targetIndex;
      setCurrentDateIndex(targetIndex);
    }

    return normalizedDates;
  }, [persistDayNavigationMeta]);

  const mergeLiveSummariesIntoVisibleDate = useCallback((targetDate: string, summaries: GameLiveSummary[]) => {
    if (!targetDate || summaries.length === 0) {
      return;
    }

    setAllDatesData((prevDates) => {
      const targetDateIndex = prevDates.findIndex((entry) => entry.date === targetDate);
      if (targetDateIndex === -1) {
        return prevDates;
      }

      const targetDateGames = prevDates[targetDateIndex];
      const nextGames = mergeHomeGamesWithLiveSummaries(targetDateGames.games, summaries);
      if (nextGames === targetDateGames.games) {
        return prevDates;
      }

      const nextDates = [...prevDates];
      nextDates[targetDateIndex] = {
        ...targetDateGames,
        games: nextGames,
      };
      allDatesDataRef.current = nextDates;
      return nextDates;
    });
  }, []);

  const mergeInitialLiveSummariesIntoDay = useCallback(async (
    dayData: MatchDayNavigation,
    requestGuard?: () => boolean
  ): Promise<MatchDayNavigation> => {
    const games = Array.isArray(dayData.games) ? dayData.games : [];
    const gameIds = games
      .filter((game) => shouldPollPredictionLiveGame(game, null))
      .map((game) => game.gameId)
      .filter(Boolean);
    if (gameIds.length === 0 || requestGuard?.()) {
      return dayData;
    }

    try {
      const summaries = await fetchGameLiveSummaries(gameIds);
      if (requestGuard?.() || summaries.length === 0) {
        return dayData;
      }

      const nextGames = mergeHomeGamesWithLiveSummaries(games, summaries);
      if (nextGames === games) {
        return dayData;
      }

      return {
        ...dayData,
        games: nextGames,
      };
    } catch {
      return dayData;
    }
  }, []);

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

  const fetchAndCacheInteractiveUserVotes = useCallback(async (
    games: Game[],
    requestKeySuffix: string,
    requestGuard?: () => boolean
  ) => {
    if (!isLoggedIn) {
      return;
    }

    const interactiveGameIds = games
      .filter((game) => game.homeScore == null && game.awayScore == null)
      .map((game) => game.gameId)
      .filter(Boolean);
    if (interactiveGameIds.length === 0) {
      return;
    }

    await fetchAndCacheUserVotes(
      interactiveGameIds,
      requestKeySuffix,
      requestGuard
    );
  }, [
    fetchAndCacheUserVotes,
    isLoggedIn,
  ]);

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
      const liveMergedCachedData = await mergeInitialLiveSummariesIntoDay(cachedResult.data, isStale);
      if (isStale()) {
        return CANCELED_MATCH_DAY_RESULT;
      }
      if (cachedIndex === -1 || liveMergedCachedData !== cachedResult.data) {
        await mergeDayIntoState(liveMergedCachedData, {
          moveToLoadedDate: options.moveToLoadedDate,
          preserveVisibleDate: options.preserveVisibleDate,
          replaceExistingDates: options.replaceExistingDates,
        });
      } else if (options.moveToLoadedDate && cachedIndex !== currentDateIndexRef.current) {
        setCurrentDateIndex(cachedIndex);
      }
      await fetchAndCacheInteractiveUserVotes(
        Array.isArray(liveMergedCachedData.games) ? liveMergedCachedData.games : [],
        options.requestKeySuffix,
        isStale
      );
      return {
        ok: true,
        data: liveMergedCachedData,
      };
    }

    const result = await requestPredictionDay(normalizedDate);
    if (isStale()) {
      return CANCELED_MATCH_DAY_RESULT;
    }
    if (!result.ok) {
      return result;
    }

    const liveMergedDayData = await mergeInitialLiveSummariesIntoDay(result.data, isStale);
    if (isStale()) {
      return CANCELED_MATCH_DAY_RESULT;
    }

    const normalizedDates = await mergeDayIntoState(liveMergedDayData, {
      moveToLoadedDate: options.moveToLoadedDate,
      preserveVisibleDate: options.preserveVisibleDate,
      replaceExistingDates: options.replaceExistingDates,
    });
    await fetchAndCacheInteractiveUserVotes(
      Array.isArray(liveMergedDayData.games) ? liveMergedDayData.games : [],
      options.requestKeySuffix,
      isStale
    );

    if (!isStale()) {
      syncRangeStateFromDates(normalizedDates, normalizedDate);
    }

    return {
      ok: true,
      data: liveMergedDayData,
    };
  }, [
    buildCachedDayResult,
    fetchAndCacheInteractiveUserVotes,
    mergeInitialLiveSummariesIntoDay,
    mergeDayIntoState,
    requestPredictionDay,
    syncRangeStateFromDates,
  ]);

  const rememberPredictionBootstrap = useCallback((bootstrap: PredictionBootstrapResponse) => {
    const selectedGameId = bootstrap.selectedGameFound ? bootstrap.selectedGameId : null;
    if (!selectedGameId) {
      return;
    }
    setBootstrapByGameId((prev) => ({
      ...prev,
      [selectedGameId]: bootstrap,
    }));
  }, []);

  const loadPredictionBootstrap = useCallback(async (
    targetDate: string,
    targetGameId: string,
    options: LoadPredictionDayOptions
  ): Promise<MatchDayResult> => {
    const normalizedDate = normalizePredictionDate(targetDate);
    const normalizedGameId = toPredictionGameId(targetGameId) || targetGameId.trim();
    if (!normalizedDate || !normalizedGameId) {
      return {
        ok: false,
        error: {
          message: '유효한 경기 정보가 아닙니다.',
          code: 'INVALID_BOOTSTRAP_INPUT',
          status: 400,
        },
      };
    }

    const isStale = options.requestGuard ?? (() => false);
    const result = await fetchPredictionBootstrap(normalizedDate, normalizedGameId);
    if (isStale()) {
      return CANCELED_MATCH_DAY_RESULT;
    }
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
      };
    }

    const liveMergedSchedule = await mergeInitialLiveSummariesIntoDay(result.data.schedule, isStale);
    if (isStale()) {
      return CANCELED_MATCH_DAY_RESULT;
    }
    const bootstrapData = liveMergedSchedule === result.data.schedule
      ? result.data
      : {
        ...result.data,
        schedule: liveMergedSchedule,
      };
    if (bootstrapData.selectedGameFound) {
      rememberPredictionBootstrap(bootstrapData);
    } else {
      deepLinkResolutionPendingRef.current = false;
      deepLinkResolutionAttemptRef.current = 0;
      deepLinkResolutionDirectionRef.current = 'future';
    }
    const normalizedDates = await mergeDayIntoState(liveMergedSchedule, {
      moveToLoadedDate: options.moveToLoadedDate,
      preserveVisibleDate: options.preserveVisibleDate,
      replaceExistingDates: options.replaceExistingDates,
    });
    await fetchAndCacheInteractiveUserVotes(
      Array.isArray(liveMergedSchedule.games) ? liveMergedSchedule.games : [],
      options.requestKeySuffix,
      isStale
    );

    if (!isStale()) {
      syncRangeStateFromDates(normalizedDates, normalizedDate);
    }

    return {
      ok: true,
      data: liveMergedSchedule,
    };
  }, [
    fetchAndCacheInteractiveUserVotes,
    mergeInitialLiveSummariesIntoDay,
    mergeDayIntoState,
    rememberPredictionBootstrap,
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

    predictionScheduleAdjacentPrefetch.schedulePredictionAdjacentPrefetch({
      anchorDate: normalizedDate,
      pendingAnchorDateRef: adjacentPrefetchPendingAnchorRef,
      completedAnchorDatesRef: adjacentPrefetchCompletedAnchorsRef,
      adjacentPrefetchCancelRef,
      clearScheduledAdjacentPrefetch,
      dayNavigationByDateRef,
      loadPredictionDay,
    });
  }, [clearScheduledAdjacentPrefetch, loadPredictionDay]);

  const fetchMatchRangeWindow = useCallback(async (request: MatchRangeLoadRequest) => {
    const { fetchMatchesByRangeWithMeta } = predictionRangeApi;
    const { buildPredictionRangeWindow } = predictionRangeWindow;
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
    const { runLoadMoreFutureMatches } = predictionScheduleBoundaryLoaders;
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
    const { runLoadMorePastMatches } = predictionScheduleBoundaryLoaders;
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
    setBootstrapByGameId({});
    dayNavigationByDateRef.current = {};
    if (!silent) {
      setLoading(true);
    }

    try {
      const today = getTodayString();
      const initialAnchorDate = deepLinkDate || today;
      const shouldUseInitialBootstrap = Boolean(deepLinkGameId);

      const firstDayOptions = {
        moveToLoadedDate: true,
        preserveVisibleDate: false,
        replaceExistingDates: true,
        requestKeySuffix: hasDeepLinkSeed ? `deepLink:initial:${initialAnchorDate}` : 'initial',
        requestGuard: () => initialListRequestRef.current !== requestId,
      };
      const firstDayResult = shouldUseInitialBootstrap
        ? await loadPredictionBootstrap(initialAnchorDate, deepLinkGameId, firstDayOptions)
        : await loadPredictionDay(initialAnchorDate, firstDayOptions);
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
    loadPredictionBootstrap,
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

    const { buildPredictionNavigationSeedRuntimeResult } = predictionScheduleDeepLinkRuntime;
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
    if (disabled) {
      return;
    }
    if (!rawDeepLinkGameId && !rawDeepLinkDate) {
      setDeepLinkParamValidationNotice(null);
      return;
    }

    const { sanitizePredictionDeepLinkParams: sanitizeDeepLinkParams } = predictionScheduleDeepLinkRuntime;
    const {
      nextSearchParams,
      hasChange,
      invalidNotice,
    } = sanitizeDeepLinkParams(searchParams, rawDeepLinkGameId, rawDeepLinkDate);

    if (hasChange && nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams, { replace: true });
    }

    setDeepLinkParamValidationNotice(invalidNotice);
  }, [disabled, rawDeepLinkDate, rawDeepLinkGameId, searchParams, setSearchParams]);

  useEffect(() => {
    if (disabled) {
      return;
    }
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
    disabled,
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
    if (deepLinkGameId) {
      return;
    }

    const visibleDate = allDatesData[currentDateIndex]?.date;
    if (!visibleDate || !dayNavigationByDateRef.current[visibleDate]) {
      return;
    }

    scheduleAdjacentPrefetch(visibleDate);
  }, [allDatesData, currentDateIndex, deepLinkGameId, matchesLoadState, scheduleAdjacentPrefetch]);

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
    if (!canceled) {
      const { runPredictionScheduleDeepLinkResolution } = predictionScheduleDeepLinkRuntime;
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
    }

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

  const markDirectDateLoadError = useCallback((targetDate: string, error: MatchDayFailure['error']) => {
    const parsedError = normalizeMatchRangeError(error);
    const currentVisibleDate = allDatesDataRef.current[currentDateIndexRef.current]?.date || '';
    const errorMessage = parsedError.message || '요청 실패';

    if (!currentVisibleDate || targetDate >= currentVisibleDate) {
      setFutureRangeLoadState('error');
      setFutureRangeLoadErrorMessage(errorMessage);
      setCanLoadMoreFutureState(true);
      return;
    }

    setPastRangeLoadState('error');
    setPastRangeLoadErrorMessage(errorMessage);
    setCanLoadMorePastState(true);
  }, [
    setCanLoadMoreFutureState,
    setCanLoadMorePastState,
  ]);

  const goToDate = useCallback((targetDate: string) => {
    const normalizedDate = normalizePredictionDate(targetDate);
    if (!normalizedDate) {
      return;
    }

    const loadedIndex = allDatesDataRef.current.findIndex((entry) => entry.date === normalizedDate);
    if (loadedIndex !== -1) {
      resetNavigationDeepLinkResolution();
      currentDateIndexRef.current = loadedIndex;
      setCurrentDateIndex(loadedIndex);
      return;
    }

    resetNavigationDeepLinkResolution();
    void loadPredictionDay(normalizedDate, {
      moveToLoadedDate: true,
      preserveVisibleDate: false,
      requestKeySuffix: `jump:${normalizedDate}`,
    }).then((result) => {
      if (!result.ok && !isRangeResultCanceled(result.error)) {
        markDirectDateLoadError(normalizedDate, result.error);
      }
    });
  }, [
    loadPredictionDay,
    markDirectDateLoadError,
    resetNavigationDeepLinkResolution,
  ]);

  useEffect(() => () => {
    clearScheduledAdjacentPrefetch();
    clearScheduledMatchBoundsHydration();
    scheduleLiveSummaryAbortRef.current?.abort();
  }, [clearScheduledAdjacentPrefetch, clearScheduledMatchBoundsHydration]);

  const currentDateGames = allDatesData[currentDateIndex]?.games || [];
  const currentDate = allDatesData[currentDateIndex]?.date || getTodayString();
  const currentGame = getCurrentGame(allDatesData, currentDateIndex, selectedGame);
  const currentDayNavigationMeta = dayNavigationByDateRef.current[currentDate] || null;
  const scheduleLiveSummaryPollingKey = currentDateGames
    .filter((game) => shouldPollPredictionLiveGame(game, null))
    .map((game) => game.gameId)
    .filter(Boolean)
    .join(',');

  useEffect(() => {
    if (disabled || matchesLoadState !== 'ready' || !currentDate || !scheduleLiveSummaryPollingKey) {
      return;
    }
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const gameIds = scheduleLiveSummaryPollingKey.split(',').filter(Boolean);
    let disposed = false;

    const refreshLiveSummaries = async () => {
      if (disposed || document.visibilityState === 'hidden' || scheduleLiveSummaryInFlightRef.current) {
        return;
      }

      const abortController = new AbortController();
      scheduleLiveSummaryInFlightRef.current = true;
      scheduleLiveSummaryAbortRef.current = abortController;

      try {
        const summaries = await fetchGameLiveSummaries(gameIds, { signal: abortController.signal });
        if (disposed || abortController.signal.aborted || summaries.length === 0) {
          return;
        }
        mergeLiveSummariesIntoVisibleDate(currentDate, summaries);
      } catch {
        // Keep the existing schedule list; the next polling cycle can recover when internal data is ready.
      } finally {
        if (scheduleLiveSummaryAbortRef.current === abortController) {
          scheduleLiveSummaryAbortRef.current = null;
        }
        scheduleLiveSummaryInFlightRef.current = false;
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') {
        scheduleLiveSummaryAbortRef.current?.abort();
        return;
      }
      void refreshLiveSummaries();
    };

    void refreshLiveSummaries();
    const intervalId = window.setInterval(() => {
      void refreshLiveSummaries();
    }, LIVE_GAME_POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      disposed = true;
      scheduleLiveSummaryAbortRef.current?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [
    currentDate,
    disabled,
    matchesLoadState,
    mergeLiveSummariesIntoVisibleDate,
    scheduleLiveSummaryPollingKey,
  ]);

  return {
    searchParams,
    selectedGame,
    setSelectedGame,
    allDatesData,
    currentDateIndex,
    currentDateGames,
    currentDate,
    currentGame,
    currentDayNavigationMeta,
    bootstrapByGameId,
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
