import type { ComponentProps, ComponentType } from 'react';

import { usePredictionSchedule } from '../../hooks/usePredictionSchedule';
import { usePredictionUserVotes } from '../../hooks/usePredictionUserVotes';
import type { PredictionLocationState } from '../../utils/predictionDeepLink';
import {
  PredictionScheduleProvider,
  PredictionUserVotesProvider,
} from './PredictionScheduleContext';

type PredictionLoadingViewComponent = ComponentType<ComponentProps<typeof import('./PredictionLoadingView').default>>;
type PredictionMatchesErrorViewComponent = ComponentType<ComponentProps<typeof import('./PredictionMatchesErrorView').default>>;
type PredictionMatchScheduleReadyViewComponent = ComponentType<ComponentProps<typeof import('./PredictionMatchScheduleReadyView').default>>;

interface PredictionMatchScheduleResolvedDataRuntimeProps {
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  userId?: number | string | null;
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
  userId,
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
  const userVotes = usePredictionUserVotes({
    userId,
  });
  const schedule = usePredictionSchedule({
    isLoggedIn,
    isAuthLoading,
    searchParams,
    setSearchParams,
    locationState,
    fetchAndCacheUserVotes: userVotes.fetchAndCacheUserVotes,
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
    matchesLoadErrorCode,
    pastRangeLoadState,
    pastRangeLoadErrorMessage,
    futureRangeLoadState,
    futureRangeLoadErrorMessage,
    canLoadMorePast,
    canLoadMoreFuture,
    matchBounds,
    retryLoadMoreFutureMatches,
    retryLoadMorePastMatches,
    setProgrammaticSearchParams,
  } = schedule;

  if (loading) {
    return <LoadingView topNotice={null} />;
  }

  if (matchesLoadState === 'error') {
    return (
      <MatchesErrorView
        matchesLoadErrorMessage={matchesLoadErrorMessage}
        matchesLoadErrorCode={matchesLoadErrorCode}
        predictionRecoveryPath="/prediction"
        onReloadMatches={reloadMatches}
      />
    );
  }

  return (
    <PredictionScheduleProvider schedule={schedule}>
      <PredictionUserVotesProvider userVotes={userVotes}>
        <MatchScheduleReadyView
          locationState={locationState}
          searchParams={searchParams}
          setSearchParams={setProgrammaticSearchParams}
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
      </PredictionUserVotesProvider>
    </PredictionScheduleProvider>
  );
}
