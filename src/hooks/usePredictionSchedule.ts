import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMatchesByDay,
  fetchMatchesByRangeWithMeta,
  fetchMatchBounds,
  type MatchDayResult,
} from '../api/prediction';
import { getTodayString, getTomorrowString, formatDate } from '../utils/prediction';
import { parseError, type ParsedError } from '../utils/errorUtils';
import {
  buildPredictionRangeWindow,
  findAdjacentLoadedDateIndex,
  getNextPredictionRangeAnchor,
  mergePredictionDateBuckets,
} from '../utils/predictionRangeLoader';
import {
  normalizePredictionDate,
  resolveInitialPredictionDateIndex,
} from '../utils/predictionHomeLogic';
import {
  buildDeepLinkNotFoundMessage,
  buildPredictionNavigationSeedGame,
  buildSeedGameDetail,
  extractPredictionLocationSeed,
  resolvePredictionDeepLinkSelection,
  sanitizePredictionDeepLinkParams,
  toPredictionGameId,
  type PredictionLocationState,
} from '../utils/predictionDeepLink';
import type { DateGames, Game, MatchBounds, MatchDayNavigation } from '../types/prediction';
import {
  DEEP_LINK_RESOLVE_MAX_ATTEMPTS,
  MATCH_FETCH_SIZE,
  MATCH_WINDOW_EXTEND_DAYS,
  getCurrentGame,
  isCancelLikeError,
  isDateAfter,
  isDateBefore,
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
  primeGameDetail: (gameId: string, detail: ReturnType<typeof buildSeedGameDetail>) => void;
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

const normalizeFutureRangeErrorMessage = (message?: string) => {
  const normalized = (message || '').trim();
  if (!normalized) {
    return '미래 구간 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }
  return normalized;
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
      message: error?.message || '로그인이 필요한 서비스입니다.',
      statusCode: normalizedStatus,
    };
  }
  if (normalizedStatus === 403) {
    return {
      type: 'PERMISSION',
      responseCode: error?.code,
      message: error?.message || '접근 권한이 없습니다.',
      statusCode: normalizedStatus,
    };
  }
  if (normalizedStatus === 404) {
    return {
      type: 'NOT_FOUND',
      responseCode: error?.code,
      message: error?.message || '요청한 정보를 찾을 수 없습니다.',
      statusCode: normalizedStatus,
    };
  }
  if (normalizedStatus !== null && normalizedStatus >= 500) {
    return {
      type: 'SERVER',
      responseCode: error?.code,
      message: error?.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      statusCode: normalizedStatus,
    };
  }
  return {
    type: 'UNKNOWN',
    responseCode: error?.code,
    message: error?.message || '예측 경기 목록 조회에 실패했습니다.',
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
  const navigationSeedAppliedRef = useRef(false);
  const allDatesDataRef = useRef<DateGames[]>([]);
  const currentDateIndexRef = useRef(0);
  const dayNavigationByDateRef = useRef<Record<string, MatchDayNavigationMeta>>({});
  const dayRequestInFlightRef = useRef<Map<string, Promise<MatchDayResult>>>(new Map());

  useEffect(() => {
    allDatesDataRef.current = allDatesData;
  }, [allDatesData]);

  useEffect(() => {
    currentDateIndexRef.current = currentDateIndex;
  }, [currentDateIndex]);

  const {
    stateGame,
    stateGameId,
    stateDate,
    stateSeedDate,
  } = extractPredictionLocationSeed(locationState);
  const rawDeepLinkGameId = ((searchParams.get('gameId') || stateGameId) || '').trim();
  const rawDeepLinkDate = ((searchParams.get('date') || stateDate || stateSeedDate) || '').trim();
  const deepLinkGameId = rawDeepLinkGameId ? toPredictionGameId(rawDeepLinkGameId) || '' : '';
  const deepLinkDate = rawDeepLinkDate ? normalizePredictionDate(rawDeepLinkDate) || '' : '';
  const navigationSeedGame = buildPredictionNavigationSeedGame(stateGame, deepLinkGameId, deepLinkDate);
  const hasNavigationSeedGame = Boolean(navigationSeedGame?.gameId && navigationSeedGame?.gameDate);

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

    const result = await fetchMatchBounds();
    if (!result.ok) {
      return;
    }

    matchBoundsRef.current = {
      hasData: Boolean(result.data?.hasData),
      earliestGameDate: normalizeMatchBoundsDate(result.data?.earliestGameDate),
      latestGameDate: normalizeMatchBoundsDate(result.data?.latestGameDate),
    };
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
    if (!meta) {
      return null;
    }

    return {
      ok: true,
      data: {
        date: normalizedDate,
        games: allDatesDataRef.current.find((entry) => entry.date === normalizedDate)?.games || [],
        prevDate: meta.prevDate,
        nextDate: meta.nextDate,
        hasPrev: meta.hasPrev,
        hasNext: meta.hasNext,
      },
    };
  }, []);

  const mergeDayIntoState = useCallback((
    dayData: MatchDayNavigation,
    options: Pick<LoadPredictionDayOptions, 'moveToLoadedDate' | 'preserveVisibleDate' | 'replaceExistingDates'>
  ) => {
    persistDayNavigationMeta(dayData);
    const baseDates = options.replaceExistingDates ? [] : allDatesDataRef.current;
    const currentVisibleDate = options.replaceExistingDates
      ? dayData.date
      : (allDatesDataRef.current[currentDateIndexRef.current]?.date || dayData.date);
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
        mergeDayIntoState(cachedResult.data, {
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

    const normalizedDates = mergeDayIntoState(result.data, {
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

  const fetchMatchRangeWindow = useCallback(async (request: MatchRangeLoadRequest) => {
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

  const setPastRangeError = useCallback((message: string) => {
    setCanLoadMorePastState(false);
    setPastRangeLoadErrorMessage(message);
    setPastRangeLoadState('error');
  }, [setCanLoadMorePastState]);

  const loadMoreFutureMatches = useCallback(async (
    forceRetry: boolean = false,
    moveToLoadedFuture: boolean = false,
    reason: MatchRangeLoadReason = 'navigation'
  ) => {
    if (futureLoadActiveRef.current || isFetchingAllGamesRef.current) {
      return;
    }
    if (!forceRetry && !canLoadMoreFutureRef.current) {
      return;
    }

    const navigationAnchorDate = allDatesDataRef.current[currentDateIndexRef.current]?.date || getTodayString();
    if (reason !== 'deepLink' || deepLinkDate) {
      setFutureRangeLoadState('loading');
      setFutureRangeLoadErrorMessage(null);
      futureLoadActiveRef.current = true;
      const requestId = ++futureRangeRequestRef.current;

      try {
        let anchorMeta = dayNavigationByDateRef.current[navigationAnchorDate];
        if (!anchorMeta) {
          const anchorResult = await loadPredictionDay(navigationAnchorDate, {
            preserveVisibleDate: true,
            requestKeySuffix: `future:anchor:${navigationAnchorDate}`,
            requestGuard: () => futureRangeRequestRef.current !== requestId,
          });
          if (requestId !== futureRangeRequestRef.current) {
            return;
          }
          if (!anchorResult.ok) {
            if (isRangeResultCanceled(anchorResult.error)) {
              restoreFutureRangeLoadState();
              return;
            }

            const normalizedMessage = normalizeFutureRangeErrorMessage(anchorResult.error.message);
            setCanLoadMoreFutureState(false);
            setFutureRangeLoadErrorMessage(normalizedMessage);
            setFutureRangeLoadState('error');
            return;
          }
          anchorMeta = dayNavigationByDateRef.current[navigationAnchorDate];
        }

        if (!anchorMeta?.hasNext || !anchorMeta.nextDate) {
          setFutureRangeEnd();
          return;
        }

        const result = await loadPredictionDay(anchorMeta.nextDate, {
          moveToLoadedDate: moveToLoadedFuture,
          preserveVisibleDate: !moveToLoadedFuture,
          requestKeySuffix: `future:day:${anchorMeta.nextDate}`,
          requestGuard: () => futureRangeRequestRef.current !== requestId,
        });
        if (requestId !== futureRangeRequestRef.current) {
          return;
        }

        if (!result.ok) {
          if (isRangeResultCanceled(result.error)) {
            restoreFutureRangeLoadState();
            return;
          }

          const normalizedMessage = normalizeFutureRangeErrorMessage(result.error.message);
          setCanLoadMoreFutureState(false);
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
              void loadMoreFutureMatches(true, true, reason);
            },
            onGoList: () => {
              window.location.href = '/';
            },
          });
          return;
        }

        const visibleDate = moveToLoadedFuture ? (result.data.date || anchorMeta.nextDate) : navigationAnchorDate;
        syncRangeStateFromDates(allDatesDataRef.current, visibleDate);
        prefetchAdjacentDays(visibleDate);
        console.info('[prediction.day.load]', {
          direction: 'future',
          result: 'success',
          targetDate: result.data.date,
          hasNext: dayNavigationByDateRef.current[result.data.date]?.hasNext,
        });
        return;
      } catch (error) {
        if (isRangeResultCanceled({
          message: error instanceof Error ? error.message : '',
          code: typeof error === 'object' ? (error as { code?: string }).code : undefined,
        })) {
          restoreFutureRangeLoadState();
          return;
        }
        if (!isCancelLikeError(error)) {
          const normalizedMessage = normalizeFutureRangeErrorMessage('미래 경기 조회에 실패했습니다.');
          setCanLoadMoreFutureState(false);
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
              void loadMoreFutureMatches(true, true, reason);
            },
            onGoList: () => {
              window.location.href = '/';
            },
          });
        }
      } finally {
        futureLoadActiveRef.current = false;
      }
      return;
    }

    const latestBoundDate = getLatestBoundDate();
    const currentAllDates = allDatesDataRef.current;
    const anchorDate = currentAllDates[currentAllDates.length - 1]?.date || navigationAnchorDate;
    if (latestBoundDate && !isDateBefore(anchorDate, latestBoundDate, false)) {
      setFutureRangeEnd();
      return;
    }

    setFutureRangeLoadState('loading');
    setFutureRangeLoadErrorMessage(null);
    futureLoadActiveRef.current = true;
    const requestId = ++futureRangeRequestRef.current;
    let windowShiftCount = 0;
    let requestAnchorDate = anchorDate;

    try {
      while (true) {
        const rangeWindow = buildPredictionRangeWindow({
          anchorDate: requestAnchorDate,
          direction: 'future',
          windowDays: MATCH_WINDOW_EXTEND_DAYS,
        });

        if (latestBoundDate && isDateAfter(rangeWindow.startDate, latestBoundDate, false)) {
          setFutureRangeEnd();
          return;
        }

        const { result } = await fetchMatchRangeWindow({
          anchorDate: requestAnchorDate,
          direction: 'future',
          windowDays: MATCH_WINDOW_EXTEND_DAYS,
          reason,
        });
        if (requestId !== futureRangeRequestRef.current) {
          return;
        }

        if (!result.ok) {
          if (isRangeResultCanceled(result.error)) {
            restoreFutureRangeLoadState();
            return;
          }

          const normalizedMessage = normalizeFutureRangeErrorMessage(result.error.message);
          setCanLoadMoreFutureState(false);
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
              void loadMoreFutureMatches(true, true, reason);
            },
            onGoList: () => {
              window.location.href = '/';
            },
          });
          return;
        }

        const nextMatches = result.data.content;
        if (!nextMatches.length) {
          const reachedLatestBound = latestBoundDate
            ? !isDateBefore(rangeWindow.endDate, latestBoundDate, false)
            : false;

          if (reachedLatestBound) {
            setFutureRangeEnd();
            return;
          }
          if (!latestBoundDate && windowShiftCount >= 26) {
            setFutureRangeEnd('탐색 가능한 예정 경기가 없습니다.');
            return;
          }

          windowShiftCount += 1;
          requestAnchorDate = getNextPredictionRangeAnchor(rangeWindow, 'future');
          continue;
        }

        const baseDates = allDatesDataRef.current;
        const normalized = mergePredictionDateBuckets(baseDates, nextMatches, mergeMatchLists);
        setAllDatesData(normalized);
        allDatesDataRef.current = normalized;
        const currentVisibleDate = baseDates[currentDateIndexRef.current]?.date || anchorDate;
        if (moveToLoadedFuture) {
          const targetDateIndex = findAdjacentLoadedDateIndex(normalized, anchorDate, 'future');
          const anchorIndex = normalized.findIndex((entry) => entry.date === anchorDate);
          const nextDateIndex = targetDateIndex !== -1 ? targetDateIndex : anchorIndex;
          if (nextDateIndex !== -1 && normalized[nextDateIndex]?.date !== currentVisibleDate) {
            setCurrentDateIndex(nextDateIndex);
          }
        } else {
          const restoredDateIndex = normalized.findIndex((entry) => entry.date === anchorDate);
          if (restoredDateIndex !== -1 && normalized[restoredDateIndex]?.date !== currentVisibleDate) {
            setCurrentDateIndex(restoredDateIndex);
          }
        }

        const interactiveFutureGames = nextMatches.filter((game) => game.homeScore === null && game.awayScore === null);
        if (isLoggedIn && interactiveFutureGames.length > 0) {
          await fetchAndCacheUserVotes(
            interactiveFutureGames.map((game) => game.gameId).filter(Boolean),
            `future:${rangeWindow.startDate}`,
            () => futureRangeRequestRef.current !== requestId
          );
        }

        syncRangeStateFromDates(normalized, anchorDate);
        console.info('[prediction.range.load]', {
          direction: 'future',
          result: 'success',
          loadedCount: nextMatches.length,
          canLoadMore: canLoadMoreFutureRef.current,
        });
        return;
      }
    } catch (error) {
      if (isRangeResultCanceled({
        message: error instanceof Error ? error.message : '',
        code: typeof error === 'object' ? (error as { code?: string }).code : undefined,
      })) {
        restoreFutureRangeLoadState();
        return;
      }
      if (!isCancelLikeError(error)) {
        const normalizedMessage = normalizeFutureRangeErrorMessage('미래 경기 조회에 실패했습니다.');
        setCanLoadMoreFutureState(false);
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
            void loadMoreFutureMatches(true, true, reason);
          },
          onGoList: () => {
            window.location.href = '/';
          },
        });
      }
    } finally {
      futureLoadActiveRef.current = false;
    }
  }, [
    deepLinkDate,
    fetchAndCacheUserVotes,
    fetchMatchRangeWindow,
    getLatestBoundDate,
    isLoggedIn,
    loadPredictionDay,
    prefetchAdjacentDays,
    restoreFutureRangeLoadState,
    setCanLoadMoreFutureState,
    setFutureRangeEnd,
    showPredictionErrorOverlay,
    syncRangeStateFromDates,
  ]);

  const loadMorePastMatches = useCallback(async (
    forceRetry: boolean = false,
    moveToLoadedPast: boolean = false,
    reason: MatchRangeLoadReason = 'navigation'
  ) => {
    if (pastLoadActiveRef.current || isFetchingAllGamesRef.current) {
      return;
    }
    if (!forceRetry && !canLoadMorePastRef.current) {
      return;
    }

    const navigationAnchorDate = allDatesDataRef.current[currentDateIndexRef.current]?.date || getTodayString();
    if (reason !== 'deepLink' || deepLinkDate) {
      setPastRangeLoadState('loading');
      setPastRangeLoadErrorMessage(null);
      pastLoadActiveRef.current = true;
      const requestId = ++pastRangeRequestRef.current;

      try {
        let anchorMeta = dayNavigationByDateRef.current[navigationAnchorDate];
        if (!anchorMeta) {
          const anchorResult = await loadPredictionDay(navigationAnchorDate, {
            preserveVisibleDate: true,
            requestKeySuffix: `past:anchor:${navigationAnchorDate}`,
            requestGuard: () => pastRangeRequestRef.current !== requestId,
          });
          if (requestId !== pastRangeRequestRef.current) {
            return;
          }
          if (!anchorResult.ok) {
            if (isRangeResultCanceled(anchorResult.error)) {
              restorePastRangeLoadState();
              return;
            }
            setPastRangeError(anchorResult.error.message || '과거 경기 조회에 실패했습니다.');
            return;
          }
          anchorMeta = dayNavigationByDateRef.current[navigationAnchorDate];
        }

        if (!anchorMeta?.hasPrev || !anchorMeta.prevDate) {
          setPastRangeEnd();
          return;
        }

        const result = await loadPredictionDay(anchorMeta.prevDate, {
          moveToLoadedDate: moveToLoadedPast,
          preserveVisibleDate: !moveToLoadedPast,
          requestKeySuffix: `past:day:${anchorMeta.prevDate}`,
          requestGuard: () => pastRangeRequestRef.current !== requestId,
        });
        if (requestId !== pastRangeRequestRef.current) {
          return;
        }

        if (!result.ok) {
          if (isRangeResultCanceled(result.error)) {
            restorePastRangeLoadState();
            return;
          }
          setPastRangeError(result.error.message || '과거 경기 조회에 실패했습니다.');
          return;
        }

        const visibleDate = moveToLoadedPast ? (result.data.date || anchorMeta.prevDate) : navigationAnchorDate;
        syncRangeStateFromDates(allDatesDataRef.current, visibleDate);
        prefetchAdjacentDays(visibleDate);
        console.info('[prediction.day.load]', {
          direction: 'past',
          result: 'success',
          targetDate: result.data.date,
          hasPrev: dayNavigationByDateRef.current[result.data.date]?.hasPrev,
        });
        return;
      } catch (error) {
        if (isRangeResultCanceled({
          message: error instanceof Error ? error.message : '',
          code: typeof error === 'object' ? (error as { code?: string }).code : undefined,
        })) {
          restorePastRangeLoadState();
          return;
        }
        if (!isCancelLikeError(error)) {
          setPastRangeError('과거 경기 조회에 실패했습니다.');
        }
      } finally {
        pastLoadActiveRef.current = false;
      }
      return;
    }

    const earliestBoundDate = getEarliestBoundDate();
    const currentAllDates = allDatesDataRef.current;
    const anchorDate = currentAllDates[0]?.date || navigationAnchorDate;
    if (earliestBoundDate && !isDateAfter(anchorDate, earliestBoundDate, false)) {
      setPastRangeEnd();
      return;
    }

    setPastRangeLoadState('loading');
    setPastRangeLoadErrorMessage(null);
    pastLoadActiveRef.current = true;
    const requestId = ++pastRangeRequestRef.current;
    let windowShiftCount = 0;
    let requestAnchorDate = anchorDate;

    try {
      while (true) {
        const rangeWindow = buildPredictionRangeWindow({
          anchorDate: requestAnchorDate,
          direction: 'past',
          windowDays: MATCH_WINDOW_EXTEND_DAYS,
        });

        if (earliestBoundDate && isDateBefore(rangeWindow.endDate, earliestBoundDate, false)) {
          setPastRangeEnd();
          return;
        }

        const { result } = await fetchMatchRangeWindow({
          anchorDate: requestAnchorDate,
          direction: 'past',
          windowDays: MATCH_WINDOW_EXTEND_DAYS,
          reason,
        });
        if (requestId !== pastRangeRequestRef.current) {
          return;
        }

        if (!result.ok) {
          if (isRangeResultCanceled(result.error)) {
            restorePastRangeLoadState();
            return;
          }
          setPastRangeError(result.error.message);
          return;
        }

        const nextMatches = result.data.content;
        if (!nextMatches.length) {
          const reachedEarliestBound = earliestBoundDate
            ? !isDateAfter(rangeWindow.startDate, earliestBoundDate, false)
            : false;

          if (reachedEarliestBound) {
            setPastRangeEnd();
            return;
          }
          if (!earliestBoundDate && windowShiftCount >= 26) {
            setPastRangeEnd('탐색 가능한 이전 경기가 없습니다.');
            return;
          }

          windowShiftCount += 1;
          requestAnchorDate = getNextPredictionRangeAnchor(rangeWindow, 'past');
          continue;
        }

        const baseDates = allDatesDataRef.current;
        const normalized = mergePredictionDateBuckets(baseDates, nextMatches, mergeMatchLists);
        setAllDatesData(normalized);
        allDatesDataRef.current = normalized;
        const currentVisibleDate = baseDates[currentDateIndexRef.current]?.date || anchorDate;
        if (moveToLoadedPast) {
          const targetDateIndex = findAdjacentLoadedDateIndex(normalized, anchorDate, 'past');
          const anchorIndex = normalized.findIndex((entry) => entry.date === anchorDate);
          const nextDateIndex = targetDateIndex !== -1 ? targetDateIndex : anchorIndex;
          if (nextDateIndex !== -1 && normalized[nextDateIndex]?.date !== currentVisibleDate) {
            setCurrentDateIndex(nextDateIndex);
          }
        } else {
          const restoredDateIndex = normalized.findIndex((entry) => entry.date === anchorDate);
          if (restoredDateIndex !== -1 && normalized[restoredDateIndex]?.date !== currentVisibleDate) {
            setCurrentDateIndex(restoredDateIndex);
          }
        }

        const interactivePastGames = nextMatches.filter((game) => game.homeScore === null && game.awayScore === null);
        if (isLoggedIn && interactivePastGames.length > 0) {
          await fetchAndCacheUserVotes(
            interactivePastGames.map((game) => game.gameId).filter(Boolean),
            `past:${rangeWindow.startDate}`,
            () => pastRangeRequestRef.current !== requestId
          );
        }

        syncRangeStateFromDates(normalized, anchorDate);
        console.info('[prediction.range.load]', {
          direction: 'past',
          result: 'success',
          loadedCount: nextMatches.length,
          canLoadMore: canLoadMorePastRef.current,
        });
        return;
      }
    } catch (error) {
      if (isRangeResultCanceled({
        message: error instanceof Error ? error.message : '',
        code: typeof error === 'object' ? (error as { code?: string }).code : undefined,
      })) {
        restorePastRangeLoadState();
        return;
      }
      if (!isCancelLikeError(error)) {
        setPastRangeError('과거 경기 조회에 실패했습니다.');
      }
    } finally {
      pastLoadActiveRef.current = false;
    }
  }, [
    deepLinkDate,
    fetchAndCacheUserVotes,
    fetchMatchRangeWindow,
    getEarliestBoundDate,
    isLoggedIn,
    loadPredictionDay,
    prefetchAdjacentDays,
    restorePastRangeLoadState,
    setPastRangeEnd,
    setPastRangeError,
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
    dayNavigationByDateRef.current = {};
    if (!silent) {
      setLoading(true);
    }

    try {
      const today = getTodayString();
      const hasDeepLinkSeed = Boolean(deepLinkGameId || deepLinkDate);
      const initialAnchorDate = deepLinkDate || today;
      await hydrateMatchBounds();

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
      prefetchAdjacentDays(initialAnchorDate);
    } catch (error) {
      if (isCancelLikeError(error)) {
        return;
      }
      const fallbackDate = deepLinkDate || getTodayString();
      setMatchesLoadState('error');
      setMatchesLoadErrorMessage('예측 경기 목록 조회에 실패했습니다.');
      const fallbackDates = [{ date: fallbackDate, games: [] }];
      setAllDatesData(fallbackDates);
      allDatesDataRef.current = fallbackDates;
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
    prefetchAdjacentDays,
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
    if (!hasNavigationSeedGame || !navigationSeedGame || navigationSeedAppliedRef.current) {
      return;
    }

    const normalizedSeedDate = normalizePredictionDate(
      navigationSeedGame.gameDate || deepLinkDate || getTodayString()
    ) || getTodayString();
    const seededGame: Game = {
      ...navigationSeedGame,
      gameDate: normalizedSeedDate,
    };

    const nextAllDatesData = [{ date: normalizedSeedDate, games: [seededGame] }];
    setAllDatesData(nextAllDatesData);
    allDatesDataRef.current = nextAllDatesData;
    setCurrentDateIndex(0);
    setSelectedGame(0);
    matchBoundsRef.current = null;
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
    primeGameDetail(seededGame.gameId, buildSeedGameDetail({
      ...stateGame,
      gameId: seededGame.gameId,
      homeTeam: seededGame.homeTeam,
      awayTeam: seededGame.awayTeam,
      stadium: seededGame.stadium,
      homeScore: seededGame.homeScore,
      awayScore: seededGame.awayScore,
      winner: seededGame.winner,
      leagueType: seededGame.leagueType,
      gameDate: normalizedSeedDate,
    }));
    navigationSeedAppliedRef.current = true;
  }, [
    deepLinkDate,
    hasNavigationSeedGame,
    navigationSeedGame,
    primeGameDetail,
    setCanLoadMoreFutureState,
    setCanLoadMorePastState,
    stateGame,
  ]);

  useEffect(() => {
    const {
      nextSearchParams,
      hasChange,
      invalidNotice,
    } = sanitizePredictionDeepLinkParams(searchParams, rawDeepLinkGameId, rawDeepLinkDate);

    if (hasChange && nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams, { replace: true });
    }

    setDeepLinkParamValidationNotice(invalidNotice);
  }, [rawDeepLinkDate, rawDeepLinkGameId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isAuthLoading) {
      setMatchesLoadState('idle');
      void fetchAllGames(false, { silent: hasNavigationSeedGame });
    }
  }, [
    fetchAllGames,
    hasNavigationSeedGame,
    isAuthLoading,
    isLoggedIn,
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
        prefetchAdjacentDays(visibleDate);
      }
    });
  }, [allDatesData, currentDateIndex, loadPredictionDay, prefetchAdjacentDays]);

  const visibleDateKey = allDatesData[currentDateIndex]?.date || '';
  useEffect(() => {
    if (skipDateResetRef.current) {
      skipDateResetRef.current = false;
      return;
    }
    setSelectedGame(0);
  }, [visibleDateKey]);

  useEffect(() => {
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

    const currentDateGames = allDatesData[currentDateIndex]?.games || [];
    const canResolveMorePast = canLoadMorePastRef.current;
    const canResolveMoreFuture = canLoadMoreFutureRef.current;

    const markDeepLinkResolved = () => {
      deepLinkResolutionPendingRef.current = false;
      deepLinkResolutionAttemptRef.current = 0;
    };

    const fallbackDeepLink = () => {
      markDeepLinkResolved();
      setDeepLinkNotice(buildDeepLinkNotFoundMessage(
        deepLinkGameId,
        deepLinkDate,
        deepLinkParamValidationNotice
      ));
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
    };

    if (!deepLinkGameId && !deepLinkDate) {
      markDeepLinkResolved();
      if (deepLinkParamValidationNotice) {
        setDeepLinkNotice(`${deepLinkParamValidationNotice} 기본 화면으로 이동합니다.`);
      } else {
        setDeepLinkNotice(null);
      }
      return;
    }

    activateMatchTab();
    const selection = resolvePredictionDeepLinkSelection(allDatesData, deepLinkGameId, deepLinkDate);
    if (selection) {
      markDeepLinkResolved();
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

    if (deepLinkDate) {
      const isTargetDateLoaded = allDatesData.some((entry) => entry.date === deepLinkDate);
      if (!isTargetDateLoaded) {
        if (deepLinkResolutionAttemptRef.current < 2) {
          deepLinkResolutionAttemptRef.current += 1;
          void loadSingleDateForDeepLink(deepLinkDate);
          return;
        }
        fallbackDeepLink();
        return;
      }

      if (deepLinkGameId) {
        fallbackDeepLink();
        return;
      }

      fallbackDeepLink();
      return;
    }

    if (!deepLinkDate && (canResolveMorePast || canResolveMoreFuture) && deepLinkResolutionAttemptRef.current < DEEP_LINK_RESOLVE_MAX_ATTEMPTS) {
      deepLinkResolutionAttemptRef.current += 1;
      const nextDirection = deepLinkResolutionDirectionRef.current;
      deepLinkResolutionDirectionRef.current = nextDirection === 'future' ? 'past' : 'future';
      if (nextDirection === 'future' && canResolveMoreFuture) {
        void loadMoreFutureMatches(true, true, 'deepLink');
      } else {
        void loadMorePastMatches(true, true, 'deepLink');
      }
      return;
    }

    if (deepLinkResolutionAttemptRef.current >= DEEP_LINK_RESOLVE_MAX_ATTEMPTS || (!canResolveMorePast && !canResolveMoreFuture)) {
      fallbackDeepLink();
    }
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
    matchBounds: matchBoundsRef.current,
    loadMoreFutureMatches,
    retryLoadMoreFutureMatches,
    retryLoadMorePastMatches,
    reloadMatches,
    goToPreviousDate,
    goToNextDate,
    formatDate,
    getTomorrowString,
  };
};
