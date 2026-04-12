import { lazy, Suspense } from 'react';
import type { PredictionLocationState } from '../../utils/predictionDeepLink';

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
    <div className="font-sans">
      <Suspense fallback={null}>
        <PredictionMatchScheduleResolvedDataRuntime
          isAuthLoading={isAuthLoading}
          isLoggedIn={isLoggedIn}
          locationState={locationState}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
        />
      </Suspense>
    </div>
  );
}
