import { Suspense, type ComponentType, type LazyExoticComponent } from 'react';

import { usePredictionSchedule } from '../../hooks/usePredictionSchedule';
import type { PredictionLocationState } from '../../utils/predictionDeepLink';

type LoadableComponent<T extends ComponentType<any>> = T | LazyExoticComponent<T>;
type PredictionLoadingViewComponent = LoadableComponent<typeof import('./PredictionLoadingView').default>;
type PredictionMatchesErrorViewComponent = LoadableComponent<typeof import('./PredictionMatchesErrorView').default>;
type PredictionMatchScheduleReadyViewComponent = LoadableComponent<typeof import('./PredictionMatchScheduleReadyView').default>;

interface PredictionMatchScheduleResolvedDataRuntimeProps {
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  locationState: PredictionLocationState;
  searchParams: URLSearchParams;
  setSearchParams: (nextInit: URLSearchParams, navigateOptions?: { replace?: boolean }) => void;
  PredictionLoadingViewComponent: PredictionLoadingViewComponent;
  PredictionMatchesErrorViewComponent: PredictionMatchesErrorViewComponent;
  PredictionMatchScheduleReadyViewComponent: PredictionMatchScheduleReadyViewComponent;
}

export default function PredictionMatchScheduleResolvedDataRuntime({
  isAuthLoading,
  isLoggedIn,
  locationState,
  searchParams,
  setSearchParams,
  PredictionLoadingViewComponent,
  PredictionMatchesErrorViewComponent,
  PredictionMatchScheduleReadyViewComponent,
}: PredictionMatchScheduleResolvedDataRuntimeProps) {
  const LoadingView = PredictionLoadingViewComponent;
  const MatchesErrorView = PredictionMatchesErrorViewComponent;
  const MatchScheduleReadyView = PredictionMatchScheduleReadyViewComponent;
  const schedule = usePredictionSchedule({
    isLoggedIn,
    isAuthLoading,
    searchParams,
    setSearchParams,
    locationState,
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

  return (
    <Suspense fallback={null}>
      {loading ? (
        <LoadingView topNotice={null} />
      ) : matchesLoadState === 'error' ? (
        <MatchesErrorView
          matchesLoadErrorMessage={matchesLoadErrorMessage}
          predictionRecoveryPath="/prediction"
          onReloadMatches={reloadMatches}
        />
      ) : (
        <MatchScheduleReadyView
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
      )}
    </Suspense>
  );
}
