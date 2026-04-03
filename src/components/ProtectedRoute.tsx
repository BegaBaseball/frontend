import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { useAuthAccessActions, useAuthSession } from '../store/authStore';
import { traceAuthEvent } from '../utils/authTrace';

export default function ProtectedRoute() {
  const { isLoggedIn, isAuthLoading } = useAuthSession();
  const { requireLogin } = useAuthAccessActions();
  const location = useLocation();

  useEffect(() => {
    traceAuthEvent(`ProtectedRoute: pathname=${location.pathname}, isAuthLoading=${isAuthLoading}, isLoggedIn=${isLoggedIn}`);

    if (!isAuthLoading && !isLoggedIn) {
      traceAuthEvent(`ProtectedRoute: requireLogin triggered for ${location.pathname}`);
      requireLogin(`${location.pathname}${location.search}${location.hash}`);
    }
  }, [isAuthLoading, isLoggedIn, location.hash, location.pathname, location.search, requireLogin]);

  if (isAuthLoading) {
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
