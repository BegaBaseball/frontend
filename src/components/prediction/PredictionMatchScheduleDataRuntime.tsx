import { lazy, Suspense, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { usePredictionSchedule } from '../../hooks/usePredictionSchedule';
import { useAuthSession } from '../../store/authStore';
import type { PredictionLocationState } from '../../utils/predictionDeepLink';

const PredictionLoadingView = lazy(() => import('./PredictionLoadingView'));
const PredictionMatchesErrorView = lazy(() => import('./PredictionMatchesErrorView'));
const PredictionMatchScheduleReadyView = lazy(() => import('./PredictionMatchScheduleReadyView'));

export default function PredictionMatchScheduleDataRuntime() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoggedIn, isAuthLoading } = useAuthSession();
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
    locationState: location.state as PredictionLocationState,
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

  if (isAuthLoading || loading) {
    return (
      <Suspense fallback={null}>
        <PredictionLoadingView topNotice={null} />
      </Suspense>
    );
  }

  if (matchesLoadState === 'error') {
    return (
      <Suspense fallback={null}>
        <PredictionMatchesErrorView
          matchesLoadErrorMessage={matchesLoadErrorMessage}
          predictionRecoveryPath="/prediction"
          onReloadMatches={reloadMatches}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <PredictionMatchScheduleReadyView
        locationState={location.state as PredictionLocationState}
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
  );
}
