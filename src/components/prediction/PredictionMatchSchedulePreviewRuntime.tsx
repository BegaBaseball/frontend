import { lazy, Suspense, useCallback, useMemo } from 'react';

import type { DateGames, Game, MatchBounds } from '../../types/prediction';
import type { RangeLoadState } from '../../hooks/predictionHookShared';
import type { PredictionTopNoticeKind } from './PredictionTopNotice';

const PredictionMatchPreviewTab = lazy(() => import('./PredictionMatchPreviewTab'));
const PredictionMatchScheduleTopNoticeRuntime = lazy(() => import('./PredictionMatchScheduleTopNoticeRuntime'));

type PredictionMatchSchedulePreviewRuntimeProps = {
  currentGame: Game | null;
  currentDateGames: DateGames['games'];
  currentDate: string;
  currentDayNavigationMeta: { prevDate: string | null; nextDate: string | null } | null;
  allDatesData: DateGames[];
  currentDateIndex: number;
  deepLinkNotice: string | null;
  goToPreviousDate: () => void;
  goToNextDate: () => void;
  goToDate: (date: string) => Promise<void> | void;
  currentGameId?: string;
  pastRangeLoadState: RangeLoadState;
  pastRangeLoadErrorMessage: string | null;
  futureRangeLoadState: RangeLoadState;
  futureRangeLoadErrorMessage: string | null;
  canLoadMorePast: boolean;
  canLoadMoreFuture: boolean;
  matchBounds: MatchBounds | null;
  retryLoadMorePastMatches: () => void;
  retryLoadMoreFutureMatches: () => void;
  onEnterMatchDetail: () => void;
};

export default function PredictionMatchSchedulePreviewRuntime({
  currentGame,
  currentDateGames,
  currentDate,
  currentDayNavigationMeta,
  allDatesData,
  currentDateIndex,
  deepLinkNotice,
  goToPreviousDate,
  goToNextDate,
  goToDate,
  currentGameId,
  pastRangeLoadState,
  pastRangeLoadErrorMessage,
  futureRangeLoadState,
  futureRangeLoadErrorMessage,
  canLoadMorePast,
  canLoadMoreFuture,
  matchBounds,
  retryLoadMorePastMatches,
  retryLoadMoreFutureMatches,
  onEnterMatchDetail,
}: PredictionMatchSchedulePreviewRuntimeProps) {
  const canMovePrevDate = currentDateIndex > 0 || canLoadMorePast;
  const canMoveNextDate = currentDateIndex < allDatesData.length - 1 || canLoadMoreFuture;

  const nearestNavigationDate = useMemo(() => {
    if (!currentDayNavigationMeta) {
      return null;
    }

    const previousCandidate = currentDayNavigationMeta.prevDate
      ? allDatesData.find((entry) => entry.date === currentDayNavigationMeta.prevDate) || null
      : null;
    const nextCandidate = currentDayNavigationMeta.nextDate
      ? allDatesData.find((entry) => entry.date === currentDayNavigationMeta.nextDate) || null
      : null;

    if (previousCandidate && previousCandidate.games.length > 0) {
      return { date: previousCandidate.date, isPast: true };
    }

    if (nextCandidate && nextCandidate.games.length > 0) {
      return { date: nextCandidate.date, isPast: false };
    }

    const previousKnownEmpty =
      previousCandidate !== null && previousCandidate.games.length === 0;
    const nextKnownEmpty = nextCandidate !== null && nextCandidate.games.length === 0;

    if (previousKnownEmpty && currentDayNavigationMeta.nextDate) {
      return { date: currentDayNavigationMeta.nextDate, isPast: false };
    }

    if (nextKnownEmpty && currentDayNavigationMeta.prevDate) {
      return { date: currentDayNavigationMeta.prevDate, isPast: true };
    }

    if (currentDayNavigationMeta.prevDate) {
      return { date: currentDayNavigationMeta.prevDate, isPast: true };
    }

    if (currentDayNavigationMeta.nextDate) {
      return { date: currentDayNavigationMeta.nextDate, isPast: false };
    }

    return null;
  }, [allDatesData, currentDayNavigationMeta]);

  const handleNearestNavigation = useCallback(() => {
    if (!nearestNavigationDate) {
      return;
    }

    void goToDate(nearestNavigationDate.date);
  }, [goToDate, nearestNavigationDate]);

  const normalizeBoundaryDate = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 10) : null;
  };

  const earliestBoundaryDate = normalizeBoundaryDate(matchBounds?.earliestGameDate);
  const hasAdditionalPastMatches = Boolean(
    matchBounds?.hasData
      && earliestBoundaryDate
      && allDatesData[0]?.date
      && normalizeBoundaryDate(allDatesData[0].date)
      && normalizeBoundaryDate(allDatesData[0].date)! > earliestBoundaryDate
  );
  const hasPastNavigation = canMovePrevDate || hasAdditionalPastMatches;
  const isFutureRangeLoading = futureRangeLoadState === 'loading';
  const isFutureRangeError = futureRangeLoadState === 'error';

  const topNoticeKind = useMemo<PredictionTopNoticeKind | null>(() => {
    if (isFutureRangeLoading || isFutureRangeError) {
      return 'FUTURE';
    }

    if (currentDateIndex === 0 && pastRangeLoadState === 'loading') {
      return 'INFO';
    }

    if (currentDateIndex === 0 && pastRangeLoadState === 'error') {
      return 'ERROR';
    }

    if (currentDateIndex === 0 && !canLoadMorePast && pastRangeLoadState === 'end') {
      return 'END';
    }

    if (
      currentDateIndex === allDatesData.length - 1
      && !canLoadMoreFuture
      && !hasPastNavigation
      && futureRangeLoadState === 'end'
    ) {
      return 'END';
    }

    if (deepLinkNotice) {
      return 'INFO';
    }

    return null;
  }, [
    allDatesData.length,
    canLoadMoreFuture,
    canLoadMorePast,
    currentDateIndex,
    deepLinkNotice,
    futureRangeLoadState,
    hasPastNavigation,
    isFutureRangeError,
    isFutureRangeLoading,
    pastRangeLoadState,
  ]);

  return (
    <div className="relative font-sans">
      {topNoticeKind ? (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center sm:justify-end">
          <Suspense fallback={null}>
            <PredictionMatchScheduleTopNoticeRuntime
              kind={topNoticeKind}
              currentDateIndex={currentDateIndex}
              currentDate={currentDate}
              currentGameId={currentGameId}
              pastRangeLoadState={pastRangeLoadState}
              pastRangeLoadErrorMessage={pastRangeLoadErrorMessage}
              futureRangeLoadState={futureRangeLoadState}
              futureRangeLoadErrorMessage={futureRangeLoadErrorMessage}
              canLoadMorePast={canLoadMorePast}
              canLoadMoreFuture={canLoadMoreFuture}
              hasPastNavigation={hasPastNavigation}
              deepLinkNotice={deepLinkNotice}
              onRetryLoadMorePastMatches={retryLoadMorePastMatches}
              onRetryLoadMoreFutureMatches={retryLoadMoreFutureMatches}
            />
          </Suspense>
        </div>
      ) : null}
      <PredictionMatchPreviewTab
        currentDateGames={currentDateGames}
        currentDate={currentDate}
        currentGame={currentGame}
        canMovePrevDate={canMovePrevDate}
        canMoveNextDate={canMoveNextDate}
        nearestNavigationDate={nearestNavigationDate}
        isToday={new Date(currentDate).toDateString() === new Date().toDateString()}
        onEnterMatchDetail={onEnterMatchDetail}
        onPrevDate={goToPreviousDate}
        onNextDate={goToNextDate}
        onNearestNavigation={handleNearestNavigation}
      />
    </div>
  );
}
