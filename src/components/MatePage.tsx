import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthBootstrapUiState } from '../hooks/useAuthBootstrapUiState';
import { buildLoginPath } from '../utils/loginRedirect';
import { Button } from './ui/button';

const MateRuntime = lazy(() => import('./Mate'));
const MateGuestSampleList = lazy(() => import('./MateGuestSampleList'));

const MateFallback = () => (
  <div className="min-h-screen bg-white py-8 dark:bg-background">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-body text-muted-foreground shadow-sm">
        메이트 목록을 준비하고 있습니다.
      </div>
    </div>
  </div>
);

function MateLoggedOutEntry() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-200 dark:bg-background">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <section
          data-testid="mate-logged-out-entry"
          className="w-full rounded-2xl border border-gray-200/80 bg-white px-5 py-8 text-center shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface-raised))] sm:px-8 sm:py-10"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <span className="text-lg font-black" aria-hidden="true">M</span>
          </div>
          <p className="mb-2 text-13 font-semibold leading-snug text-gray-500 dark:text-white/70">
            Mate Flow
          </p>
          <h1 className="text-2xl font-native font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            로그인하고 직관 메이트를 찾아보세요
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-body font-bold leading-relaxed text-gray-500 dark:text-white">
            경기 날짜, 좌석, 팀 기준으로 파티를 찾고 신청하려면 계정 확인이 필요합니다.
          </p>
          <Suspense fallback={null}>
            <MateGuestSampleList />
          </Suspense>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              data-testid="mate-login-cta"
              size="touchLg"
              onClick={() => navigate(buildLoginPath('/mate'))}
              className="w-full rounded-full bg-primary font-black text-primary-foreground hover:bg-primary-hover sm:w-auto"
            >
              로그인하고 같이가요 시작
            </Button>
            <Button
              variant="outline"
              size="touchLg"
              onClick={() => navigate('/home')}
              className="w-full rounded-full border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-[hsl(var(--surface-raised))] dark:text-white dark:hover:bg-white/5 sm:w-auto"
            >
              홈에서 경기 보기
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function MatePage() {
  const {
    authBootstrapMode,
    isAuthBootstrapPending,
    isAuthLoading,
    isLoggedIn,
  } = useAuthBootstrapUiState();
  const shouldShowAuthLoading = !isLoggedIn
    && authBootstrapMode !== 'public-home'
    && authBootstrapMode !== 'skip'
    && (isAuthLoading || isAuthBootstrapPending);

  if (shouldShowAuthLoading) {
    return <MateFallback />;
  }

  if (!isLoggedIn) {
    return <MateLoggedOutEntry />;
  }

  return (
    <Suspense fallback={<MateFallback />}>
      <MateRuntime />
    </Suspense>
  );
}
