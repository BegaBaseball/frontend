import { lazy, Suspense, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { useAuthSession } from '../../store/authStore';
import type { PredictionLocationState } from '../../utils/predictionDeepLink';

const PredictionLoadingView = lazy(() => import('./PredictionLoadingView'));
const PredictionMatchScheduleResolvedRuntime = lazy(() => import('./PredictionMatchScheduleResolvedRuntime'));

export default function PredictionMatchScheduleDataContent() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoggedIn, isAuthLoading } = useAuthSession();
  const locationState = location.state as PredictionLocationState;
  const renderResolvedRuntime = useCallback(() => (
    <PredictionMatchScheduleResolvedRuntime
      isAuthLoading={isAuthLoading}
      isLoggedIn={isLoggedIn}
      locationState={locationState}
      searchParams={searchParams}
      setSearchParams={setSearchParams}
    />
  ), [isAuthLoading, isLoggedIn, locationState, searchParams, setSearchParams]);

  if (isAuthLoading) {
    return (
      <div className="font-sans">
        <Suspense fallback={null}>
          <PredictionLoadingView topNotice={null} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="font-sans">
      <Suspense fallback={null}>
        {renderResolvedRuntime()}
      </Suspense>
    </div>
  );
}
