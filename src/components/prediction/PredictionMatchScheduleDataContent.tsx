import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useAuthSession } from '../../store/authStore';
import type { PredictionLocationState, PredictionNavigationOptions } from '../../utils/predictionDeepLink';
import {
  buildPredictionEffectiveSearchParams,
  buildPredictionRouteNavigationPath,
} from '../../utils/predictionRouteNavigation';
import PredictionLoadingView from './PredictionLoadingView';
import PredictionMatchScheduleResolvedRuntime from './PredictionMatchScheduleResolvedRuntime';

export default function PredictionMatchScheduleDataContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { gameId: routeGameId } = useParams<{ gameId?: string }>();
  const [searchParams] = useSearchParams();
  const { isLoggedIn, isAuthLoading, userId } = useAuthSession();
  const locationState = location.state as PredictionLocationState;
  const effectiveSearchParams = useMemo(
    () => buildPredictionEffectiveSearchParams(searchParams, routeGameId),
    [routeGameId, searchParams],
  );
  const setRouteAwareSearchParams = useCallback((
    nextSearchParams: URLSearchParams,
    navigateOptions?: PredictionNavigationOptions,
  ) => {
    const nextPath = buildPredictionRouteNavigationPath(nextSearchParams);

    navigate(nextPath, {
      replace: navigateOptions?.replace,
      state: navigateOptions?.state,
    });
  }, [navigate]);

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
        searchParams={effectiveSearchParams}
        setSearchParams={setRouteAwareSearchParams}
      />
    </div>
  );
}
