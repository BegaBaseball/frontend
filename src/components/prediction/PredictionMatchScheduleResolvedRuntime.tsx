import type { PredictionLocationState, PredictionNavigationOptions } from '../../utils/predictionDeepLink';
import PredictionLoadingView from './PredictionLoadingView';
import PredictionMatchesErrorView from './PredictionMatchesErrorView';
import PredictionMatchScheduleReadyView from './PredictionMatchScheduleReadyView';
import PredictionMatchScheduleResolvedDataRuntime from './PredictionMatchScheduleResolvedDataRuntime';

interface PredictionMatchScheduleResolvedRuntimeProps {
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  userId?: number | string | null;
  locationState: PredictionLocationState;
  searchParams: URLSearchParams;
  setSearchParams: (nextInit: URLSearchParams, navigateOptions?: PredictionNavigationOptions) => void;
}

export default function PredictionMatchScheduleResolvedRuntime({
  isAuthLoading,
  isLoggedIn,
  userId,
  locationState,
  searchParams,
  setSearchParams,
}: PredictionMatchScheduleResolvedRuntimeProps) {
  return (
    <PredictionMatchScheduleResolvedDataRuntime
      isAuthLoading={isAuthLoading}
      isLoggedIn={isLoggedIn}
      userId={userId}
      locationState={locationState}
      searchParams={searchParams}
      setSearchParams={setSearchParams}
      PredictionLoadingViewComponent={PredictionLoadingView}
      PredictionMatchesErrorViewComponent={PredictionMatchesErrorView}
      PredictionMatchScheduleReadyViewComponent={PredictionMatchScheduleReadyView}
    />
  );
}
