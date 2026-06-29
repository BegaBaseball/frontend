import type { ComponentProps, ComponentType } from 'react';

import { usePredictionSchedule } from '../../hooks/usePredictionSchedule';
import { usePredictionUserVotes } from '../../hooks/usePredictionUserVotes';
import type { PredictionLocationState, PredictionNavigationOptions } from '../../utils/predictionDeepLink';
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
  setSearchParams: (nextInit: URLSearchParams, navigateOptions?: PredictionNavigationOptions) => void;
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
    reloadMatches,
    matchesLoadState,
    matchesLoadErrorMessage,
    matchesLoadErrorCode,
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
        />
      </PredictionUserVotesProvider>
    </PredictionScheduleProvider>
  );
}
