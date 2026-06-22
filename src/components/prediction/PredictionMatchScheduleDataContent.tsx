import { useLocation, useSearchParams } from 'react-router-dom';

import { useAuthSession } from '../../store/authStore';
import type { PredictionLocationState } from '../../utils/predictionDeepLink';
import PredictionLoadingView from './PredictionLoadingView';
import PredictionMatchScheduleResolvedRuntime from './PredictionMatchScheduleResolvedRuntime';

export default function PredictionMatchScheduleDataContent() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoggedIn, isAuthLoading, userId } = useAuthSession();
  const locationState = location.state as PredictionLocationState;

  if (isAuthLoading) {
    return (
      <div className="font-sans">
        <PredictionLoadingView topNotice={null} />
      </div>
    );
  }

  return (
    <div className="font-sans">
      <PredictionMatchScheduleResolvedRuntime
        isAuthLoading={isAuthLoading}
        isLoggedIn={isLoggedIn}
        userId={userId}
        locationState={locationState}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
      />
    </div>
  );
}
