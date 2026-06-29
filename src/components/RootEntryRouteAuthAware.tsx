import { lazy, Suspense, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthBootstrapUiState } from '../hooks/useAuthBootstrapUiState';
import { requestLoadTrace } from '../utils/requestLoadTrace';
import LoadingSpinner from './LoadingSpinner';

const Landing = lazy(() => import('./Landing'));

export default function RootEntryRouteAuthAware() {
  const { isAuthBootstrapPending, isAuthLoading, isLoggedIn } = useAuthBootstrapUiState();
  const shouldShowAuthLoading = isAuthLoading || isAuthBootstrapPending;

  useEffect(() => {
    if (shouldShowAuthLoading) {
      requestLoadTrace(isAuthBootstrapPending ? 'RootEntryRoute:authBootstrapPending' : 'RootEntryRoute:authLoading');
      return;
    }

    if (isLoggedIn) {
      requestLoadTrace('RootEntryRoute:redirectHome');
      return;
    }

    requestLoadTrace('RootEntryRoute:landing');
  }, [isAuthBootstrapPending, isAuthLoading, isLoggedIn, shouldShowAuthLoading]);

  if (shouldShowAuthLoading) {
    return (
      <LoadingSpinner
        variant="app"
        message="첫 화면을 준비하고 있습니다."
        subMessage={isAuthBootstrapPending ? '로그인 상태를 복구하는 중입니다.' : '사용자 상태를 확인하는 중입니다.'}
        minDurationMs={120}
      />
    );
  }

  if (isLoggedIn) {
    return <Navigate to="/home" replace />;
  }

  return (
    <Suspense
      fallback={
        <LoadingSpinner
          variant="app"
          message="첫 화면을 준비하고 있습니다."
          subMessage="랜딩 페이지를 불러오는 중입니다."
          minDurationMs={80}
        />
      }
    >
      <Landing />
    </Suspense>
  );
}
