import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { useAuthAccessActions, useAuthProfileActions, useAuthSession } from '../store/authStore';
import { hasPersistedAuthBootstrapHint } from '../utils/authBootstrap';
import { traceAuthEvent } from '../utils/authTrace';

export default function ProtectedRoute() {
  const { isLoggedIn, isAuthLoading } = useAuthSession();
  const { requireLogin } = useAuthAccessActions();
  const { fetchProfileAndAuthenticate } = useAuthProfileActions();
  const location = useLocation();
  const shouldAttemptBootstrap = !isLoggedIn && hasPersistedAuthBootstrapHint();

  useEffect(() => {
    traceAuthEvent(`ProtectedRoute: pathname=${location.pathname}, isAuthLoading=${isAuthLoading}, isLoggedIn=${isLoggedIn}`);

    if (isAuthLoading || isLoggedIn) {
      return;
    }

    if (hasPersistedAuthBootstrapHint()) {
      traceAuthEvent(`ProtectedRoute: bootstrap retry for ${location.pathname}`);
      void fetchProfileAndAuthenticate();
      return;
    }

    if (!isLoggedIn) {
      traceAuthEvent(`ProtectedRoute: requireLogin triggered for ${location.pathname}`);
      requireLogin(`${location.pathname}${location.search}${location.hash}`);
    }
  }, [fetchProfileAndAuthenticate, isAuthLoading, isLoggedIn, location.hash, location.pathname, location.search, requireLogin]);

  if ((isAuthLoading || shouldAttemptBootstrap) && !isLoggedIn) {
    traceAuthEvent(`ProtectedRoute: show loading for ${location.pathname}`);
    return (
      <LoadingSpinner
        variant="auth"
        message="인증 상태를 확인하고 있습니다."
        subMessage="잠시만 기다려주세요."
        minDurationMs={250}
        className="transition-colors duration-200"
      />
    );
  }

  if (!isLoggedIn) {
    return <div className="min-h-screen bg-background transition-colors duration-200" />;
  }

  return <Outlet />;
}
