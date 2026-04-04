import type { MutableRefObject } from 'react';

import type { MatchDayResult } from '../api/prediction';
import { getApiErrorMessage } from '../utils/errorUtils';
import { getTodayString } from '../utils/predictionDates';
import { mergePredictionDateBuckets } from '../utils/predictionRangeLoader';
import type { DateGames, Game, MatchDayNavigation } from '../types/prediction';
import {
  MATCH_WINDOW_EXTEND_DAYS,
  isCancelLikeError,
  isDateAfter,
  isDateBefore,
  isRangeResultCanceled,
  mergeMatchLists,
  type MatchRangeLoadReason,
  type MatchRangeLoadRequest,
  type PredictionOverlayController,
  type RangeLoadState,
} from './predictionHookShared';

type LoadPredictionDayOptions = {
  moveToLoadedDate?: boolean;
  preserveVisibleDate?: boolean;
  replaceExistingDates?: boolean;
  requestKeySuffix: string;
  requestGuard?: () => boolean;
};

type MatchRangeErrorLike = {
  message?: string;
  status?: number | null;
  code?: string;
};

type MatchRangeApiResult = {
  ok: true;
  data: {
    content: Game[];
  };
} | {
  ok: false;
  error: MatchRangeErrorLike;
};

type MatchRangeWindowResult = {
  rangeWindow: {
    startDate: string;
    endDate: string;
  };
  result: MatchRangeApiResult;
};

type DayNavigationMeta = {
  prevDate: string | null;
  nextDate: string | null;
  hasPrev: boolean;
  hasNext: boolean;
};

type BaseBoundaryLoaderParams = {
  allDatesDataRef: MutableRefObject<DateGames[]>;
  currentDateIndexRef: MutableRefObject<number>;
  dayNavigationByDateRef: MutableRefObject<Record<string, DayNavigationMeta>>;
  isFetchingAllGamesRef: MutableRefObject<boolean>;
  isLoggedIn: boolean;
  loadPredictionDay: (
    targetDate: string,
    options: LoadPredictionDayOptions
  ) => Promise<MatchDayResult>;
  fetchMatchRangeWindow: (
    request: MatchRangeLoadRequest
  ) => Promise<MatchRangeWindowResult>;
  fetchAndCacheUserVotes: (
    gameIds: string[],
    requestKeySuffix: string,
    requestGuard?: () => boolean
  ) => Promise<void>;
  scheduleAdjacentPrefetch: (anchorDate: string) => void;
  syncRangeStateFromDates: (normalizedDates: DateGames[], fallbackDate: string) => void;
  setAllDatesData: (nextDates: DateGames[]) => void;
  setCurrentDateIndex: (nextIndex: number) => void;
};

type FutureBoundaryLoaderParams = BaseBoundaryLoaderParams & {
  deepLinkDate: string;
  canLoadMoreFutureRef: MutableRefObject<boolean>;
  futureLoadActiveRef: MutableRefObject<boolean>;
  futureRangeRequestRef: MutableRefObject<number>;
  setCanLoadMoreFutureState: (next: boolean) => void;
  setFutureRangeLoadState: (next: RangeLoadState) => void;
  setFutureRangeLoadErrorMessage: (next: string | null) => void;
  restoreFutureRangeLoadState: () => void;
  setFutureRangeEnd: (message?: string) => void;
  getLatestBoundDate: () => string | null;
  showPredictionErrorOverlay: PredictionOverlayController['showPredictionErrorOverlay'];
  goToPredictionRecovery: (options?: { currentDate?: string | null; currentGameId?: string | null }) => void;
};

type PastBoundaryLoaderParams = BaseBoundaryLoaderParams & {
  deepLinkDate: string;
  canLoadMorePastRef: MutableRefObject<boolean>;
  pastLoadActiveRef: MutableRefObject<boolean>;
  pastRangeRequestRef: MutableRefObject<number>;
  setPastRangeLoadState: (next: RangeLoadState) => void;
  setPastRangeLoadErrorMessage: (next: string | null) => void;
  setCanLoadMorePastState: (next: boolean) => void;
  restorePastRangeLoadState: () => void;
  setPastRangeEnd: (message?: string) => void;
  getEarliestBoundDate: () => string | null;
};

const getPredictionRangeErrorMessage = (
  error: MatchRangeErrorLike | undefined,
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

const normalizeFutureRangeErrorMessage = (error?: MatchRangeErrorLike) => (
  getPredictionRangeErrorMessage(error, '미래 구간 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.')
);

const normalizePastRangeErrorMessage = (error?: MatchRangeErrorLike) => (
  getPredictionRangeErrorMessage(error, '과거 경기 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.')
);

const setPastRangeError = (params: Pick<PastBoundaryLoaderParams, 'setCanLoadMorePastState' | 'setPastRangeLoadErrorMessage' | 'setPastRangeLoadState'>, message: string) => {
  params.setCanLoadMorePastState(false);
  params.setPastRangeLoadErrorMessage(message);
  params.setPastRangeLoadState('error');
};

const isCanceledLikeResult = (error: unknown) => isRangeResultCanceled({
  message: error instanceof Error ? error.message : '',
  code: typeof error === 'object' ? (error as { code?: string }).code : undefined,
});

export const runLoadMoreFutureMatches = async ({
  forceRetry = false,
  moveToLoadedFuture = false,
  reason = 'navigation',
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
}: FutureBoundaryLoaderParams & {
  forceRetry?: boolean;
  moveToLoadedFuture?: boolean;
  reason?: MatchRangeLoadReason;
}) => {
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

          const normalizedMessage = normalizeFutureRangeErrorMessage(anchorResult.error);
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

        const normalizedMessage = normalizeFutureRangeErrorMessage(result.error);
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
            void runLoadMoreFutureMatches({
              forceRetry: true,
              moveToLoadedFuture: true,
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
          },
          onGoList: () => {
            goToPredictionRecovery({ currentDate: navigationAnchorDate });
          },
        });
        return;
      }

      const visibleDate = moveToLoadedFuture ? (result.data.date || anchorMeta.nextDate) : navigationAnchorDate;
      syncRangeStateFromDates(allDatesDataRef.current, visibleDate);
      scheduleAdjacentPrefetch(visibleDate);
      return;
    } catch (error) {
      if (isCanceledLikeResult(error)) {
        restoreFutureRangeLoadState();
        return;
      }
      if (!isCancelLikeError(error)) {
        const normalizedMessage = normalizeFutureRangeErrorMessage({
          message: '미래 경기 조회에 실패했습니다.',
        });
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
            void runLoadMoreFutureMatches({
              forceRetry: true,
              moveToLoadedFuture: true,
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
          },
          onGoList: () => {
            goToPredictionRecovery({ currentDate: navigationAnchorDate });
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
    const [{ buildPredictionRangeWindow, getNextPredictionRangeAnchor }, { findAdjacentLoadedDateIndex }] = await Promise.all([
      import('../utils/predictionRangeWindow'),
      import('../utils/predictionRangeSearch'),
    ]);

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

        const normalizedMessage = normalizeFutureRangeErrorMessage(result.error);
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
            void runLoadMoreFutureMatches({
              forceRetry: true,
              moveToLoadedFuture: true,
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
          },
          onGoList: () => {
            goToPredictionRecovery({ currentDate: navigationAnchorDate });
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
      return;
    }
  } catch (error) {
    if (isCanceledLikeResult(error)) {
      restoreFutureRangeLoadState();
      return;
    }
    if (!isCancelLikeError(error)) {
      const normalizedMessage = normalizeFutureRangeErrorMessage({
        message: '미래 경기 조회에 실패했습니다.',
      });
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
          void runLoadMoreFutureMatches({
            forceRetry: true,
            moveToLoadedFuture: true,
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
        },
        onGoList: () => {
          goToPredictionRecovery({ currentDate: navigationAnchorDate });
        },
      });
    }
  } finally {
    futureLoadActiveRef.current = false;
  }
};

export const runLoadMorePastMatches = async ({
  forceRetry = false,
  moveToLoadedPast = false,
  reason = 'navigation',
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
}: PastBoundaryLoaderParams & {
  forceRetry?: boolean;
  moveToLoadedPast?: boolean;
  reason?: MatchRangeLoadReason;
}) => {
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
          setPastRangeError({
            setCanLoadMorePastState,
            setPastRangeLoadErrorMessage,
            setPastRangeLoadState,
          }, normalizePastRangeErrorMessage(anchorResult.error));
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
        setPastRangeError({
          setCanLoadMorePastState,
          setPastRangeLoadErrorMessage,
          setPastRangeLoadState,
        }, normalizePastRangeErrorMessage(result.error));
        return;
      }

      const visibleDate = moveToLoadedPast ? (result.data.date || anchorMeta.prevDate) : navigationAnchorDate;
      syncRangeStateFromDates(allDatesDataRef.current, visibleDate);
      scheduleAdjacentPrefetch(visibleDate);
      return;
    } catch (error) {
      if (isCanceledLikeResult(error)) {
        restorePastRangeLoadState();
        return;
      }
      if (!isCancelLikeError(error)) {
        setPastRangeError({
          setCanLoadMorePastState,
          setPastRangeLoadErrorMessage,
          setPastRangeLoadState,
        }, '과거 경기 조회에 실패했습니다.');
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
    const [{ buildPredictionRangeWindow, getNextPredictionRangeAnchor }, { findAdjacentLoadedDateIndex }] = await Promise.all([
      import('../utils/predictionRangeWindow'),
      import('../utils/predictionRangeSearch'),
    ]);

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
        setPastRangeError({
          setCanLoadMorePastState,
          setPastRangeLoadErrorMessage,
          setPastRangeLoadState,
        }, normalizePastRangeErrorMessage(result.error));
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
      return;
    }
  } catch (error) {
    if (isCanceledLikeResult(error)) {
      restorePastRangeLoadState();
      return;
    }
    if (!isCancelLikeError(error)) {
      setPastRangeError({
        setCanLoadMorePastState,
        setPastRangeLoadErrorMessage,
        setPastRangeLoadState,
      }, '과거 경기 조회에 실패했습니다.');
    }
  } finally {
    pastLoadActiveRef.current = false;
  }
};
