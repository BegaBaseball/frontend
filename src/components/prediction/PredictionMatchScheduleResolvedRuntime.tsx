import { lazy, Suspense, useCallback } from 'react';

import { usePredictionSchedule } from '../../hooks/usePredictionSchedule';
import type { PredictionLocationState } from '../../utils/predictionDeepLink';

const PredictionLoadingView = lazy(() => import('./PredictionLoadingView'));
const PredictionMatchesErrorView = lazy(() => import('./PredictionMatchesErrorView'));
const PredictionMatchScheduleReadyView = lazy(() => import('./PredictionMatchScheduleReadyView'));

interface PredictionMatchScheduleResolvedRuntimeProps {
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  locationState: PredictionLocationState;
  searchParams: URLSearchParams;
  setSearchParams: (nextInit: URLSearchParams, navigateOptions?: { replace?: boolean }) => void;
}

export default function PredictionMatchScheduleResolvedRuntime({
  isAuthLoading,
  isLoggedIn,
  locationState,
  searchParams,
  setSearchParams,
}: PredictionMatchScheduleResolvedRuntimeProps) {
  const emitFlowEvent = useCallback(() => {}, []);
  const showPredictionErrorOverlay = useCallback(() => {}, []);
  const fetchAndCacheUserVotes = useCallback(async () => {}, []);
  const primeGameDetail = useCallback(() => {}, []);
  const activateMatchTab = useCallback(() => {}, []);

  const schedule = usePredictionSchedule({
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
  });

  const {
    currentGame,
    currentDateGames,
    currentDate,
    loading,
    currentDayNavigationMeta,
    allDatesData,
    currentDateIndex,
    deepLinkNotice,
    goToPreviousDate,
    goToNextDate,
    goToDate,
    reloadMatches,
    matchesLoadState,
    matchesLoadErrorMessage,
    pastRangeLoadState,
    pastRangeLoadErrorMessage,
    futureRangeLoadState,
    futureRangeLoadErrorMessage,
    canLoadMorePast,
    canLoadMoreFuture,
    matchBounds,
    retryLoadMoreFutureMatches,
    retryLoadMorePastMatches,
  } = schedule;

  if (loading) {
    return (
      <div className="font-sans">
        <Suspense fallback={null}>
          <PredictionLoadingView topNotice={null} />
        </Suspense>
      </div>
    );
  }

  if (matchesLoadState === 'error') {
    return (
      <div className="font-sans">
        <Suspense fallback={null}>
          <PredictionMatchesErrorView
            matchesLoadErrorMessage={matchesLoadErrorMessage}
            predictionRecoveryPath="/prediction"
            onReloadMatches={reloadMatches}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="font-sans">
      <Suspense fallback={null}>
        <PredictionMatchScheduleReadyView
          locationState={locationState}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          currentGame={currentGame}
          currentDateGames={currentDateGames}
          currentDate={currentDate}
          currentDayNavigationMeta={currentDayNavigationMeta}
          allDatesData={allDatesData}
          currentDateIndex={currentDateIndex}
          deepLinkNotice={deepLinkNotice}
          goToPreviousDate={goToPreviousDate}
          goToNextDate={goToNextDate}
          goToDate={goToDate}
          currentGameId={currentGame?.gameId}
          pastRangeLoadState={pastRangeLoadState}
          pastRangeLoadErrorMessage={pastRangeLoadErrorMessage}
          futureRangeLoadState={futureRangeLoadState}
          futureRangeLoadErrorMessage={futureRangeLoadErrorMessage}
          canLoadMorePast={canLoadMorePast}
          canLoadMoreFuture={canLoadMoreFuture}
          matchBounds={matchBounds}
          retryLoadMorePastMatches={retryLoadMorePastMatches}
          retryLoadMoreFutureMatches={retryLoadMoreFutureMatches}
        />
      </Suspense>
    </div>
  );
}
