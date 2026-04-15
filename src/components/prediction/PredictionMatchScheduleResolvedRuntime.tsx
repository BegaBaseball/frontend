import { lazy, Suspense } from 'react';
import type { PredictionLocationState } from '../../utils/predictionDeepLink';

const PredictionLoadingView = lazy(() => import('./PredictionLoadingView'));
const PredictionMatchesErrorView = lazy(() => import('./PredictionMatchesErrorView'));
const PredictionMatchScheduleReadyView = lazy(() => import('./PredictionMatchScheduleReadyView'));
const PredictionMatchScheduleResolvedDataRuntime = lazy(() => import('./PredictionMatchScheduleResolvedDataRuntime'));

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
  return (
    <Suspense fallback={null}>
      <PredictionMatchScheduleResolvedDataRuntime
        isAuthLoading={isAuthLoading}
        isLoggedIn={isLoggedIn}
        locationState={locationState}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        PredictionLoadingViewComponent={PredictionLoadingView}
        PredictionMatchesErrorViewComponent={PredictionMatchesErrorView}
        PredictionMatchScheduleReadyViewComponent={PredictionMatchScheduleReadyView}
      />
    </Suspense>
  );
}
