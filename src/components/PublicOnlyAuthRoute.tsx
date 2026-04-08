import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuthBootstrapUiState } from '../hooks/useAuthBootstrapUiState';
import { useAuthRedirectState } from '../store/authStore';
import { resolvePostLoginRedirect } from '../utils/loginRedirect';
import LoadingSpinner from './LoadingSpinner';

export default function PublicOnlyAuthRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authBootstrapMode, isAuthLoading, isLoggedIn } = useAuthBootstrapUiState();
  const { pendingLoginRedirect, clearPendingLoginRedirect } = useAuthRedirectState();
  const searchParams = new URLSearchParams(location.search);
  const queryRedirect = searchParams.get('redirect');
  const shouldBypassAuthenticatedRedirect = location.pathname === '/login' && Boolean(searchParams.get('error'));
  const redirectTarget = resolvePostLoginRedirect(queryRedirect, pendingLoginRedirect);
  const shouldShowAuthLoading = isAuthLoading && authBootstrapMode === 'immediate';

  useEffect(() => {
    if (shouldBypassAuthenticatedRedirect || isAuthLoading || !isLoggedIn) {
      return;
    }

    clearPendingLoginRedirect();
    navigate(redirectTarget, { replace: true });
  }, [
    clearPendingLoginRedirect,
    isAuthLoading,
    isLoggedIn,
    navigate,
    redirectTarget,
    shouldBypassAuthenticatedRedirect,
  ]);

  if (shouldShowAuthLoading || (isLoggedIn && !shouldBypassAuthenticatedRedirect)) {
    return (
      <LoadingSpinner
        variant="auth"
        message="로그인 상태를 확인하고 있습니다."
        subMessage="잠시만 기다려주세요."
        minDurationMs={120}
      />
    );
  }

  return <Outlet />;
}
