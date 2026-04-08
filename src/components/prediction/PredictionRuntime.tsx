import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '../ui/card';
import { useAuthProfileSnapshot, useAuthSession } from '../../store/authStore';
import { PredictionCoinsIcon, PredictionGamepadIcon, PredictionLineChartIcon, PredictionLoaderIcon } from './PredictionShellIcons';

const PredictionMatchRuntime = lazy(() => import('./PredictionMatchRuntime'));
const PredictionRankingTab = lazy(() => import('./PredictionRankingTab'));
const PredictionAnimatedSections = lazy(() => import('../PredictionAnimatedSections'));

export default function PredictionRuntime() {
  const [activeTab, setActiveTab] = useState<'match' | 'ranking'>('match');
  const [hasVisitedRankingTab, setHasVisitedRankingTab] = useState(false);
  const [rankingFeatureReady, setRankingFeatureReady] = useState(false);
  const { isLoggedIn } = useAuthSession();
  const { userCheerPoints = 0 } = useAuthProfileSnapshot();

  useEffect(() => {
    if (activeTab === 'ranking') {
      setHasVisitedRankingTab(true);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'ranking' || rankingFeatureReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRankingFeatureReady(true);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeTab, rankingFeatureReady]);

  const matchChildren = (
    <Suspense
              fallback={(
        <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
            <div className="inline-flex items-center gap-2 text-[16px] font-semibold text-slate-500 dark:text-gray-300">
            <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
            경기 화면을 준비하고 있습니다.
          </div>
        </Card>
      )}
    >
      <PredictionMatchRuntime />
    </Suspense>
  );

  const rankingChildren = rankingFeatureReady ? (
    <Suspense
      fallback={(
        <Card className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
                <div className="inline-flex items-center gap-2 text-[16px] font-semibold text-slate-500 dark:text-gray-300">
            <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
            순위 예측 화면을 준비하고 있습니다.
          </div>
        </Card>
      )}
    >
      <PredictionRankingTab isLoggedIn={isLoggedIn} />
    </Suspense>
  ) : (
    <Card className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
            <div className="inline-flex items-center gap-2 text-[16px] font-semibold text-slate-500 dark:text-gray-300">
        <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
        순위 예측 화면을 준비하고 있습니다.
      </div>
    </Card>
  );

  const shouldRenderAnimatedSections = activeTab === 'ranking' || hasVisitedRankingTab;

  return (
    <div className="min-h-screen bg-white font-sans transition-colors duration-200 dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl border border-emerald-200/70 bg-emerald-100/70 p-2.5 shadow-[0_0_12px_rgba(16,185,129,0.2)] dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <PredictionLineChartIcon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100 sm:text-2xl">전력분석실</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/leaderboard"
              className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition-colors hover:border-emerald-400/60 dark:border-border dark:bg-card dark:shadow-md dark:hover:border-emerald-400/70 sm:px-3"
            >
              <PredictionGamepadIcon className="h-4 w-4 text-slate-500 transition-colors group-hover:text-emerald-600 dark:text-gray-300 dark:group-hover:text-emerald-300" />
            <span className="hidden text-[16px] font-semibold text-slate-600 dark:text-gray-200 sm:text-[16px]">랭킹</span>
            </Link>
            {isLoggedIn ? (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 shadow-sm dark:border-emerald-800/40 dark:bg-emerald-900/40 dark:shadow-md md:hidden sm:px-3">
                <PredictionCoinsIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-200" />
                <span className="text-[16px] font-semibold tabular-nums text-emerald-800 dark:text-emerald-100 sm:text-[16px]">
                  {userCheerPoints.toLocaleString()} P
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {isLoggedIn ? (
          <div className="mb-2 flex justify-start sm:justify-end">
            <Link
              to="/mypage"
              className="inline-flex max-w-full items-center gap-1 text-[16px] font-semibold leading-relaxed text-emerald-600 hover:underline dark:text-emerald-400 sm:text-[16px]"
            >
              📸 다이어리 시야 사진 공유 → 리더보드 +50P
            </Link>
          </div>
        ) : null}

        <div className="mb-4 flex flex-col gap-2.5 md:mb-5 md:flex-row md:items-center">
          <div className="relative flex w-full max-w-sm overflow-hidden rounded-xl border border-slate-200/70 bg-white/80 p-1 shadow-sm dark:border-border dark:bg-card dark:shadow-md md:w-fit">
            <span
              className="pointer-events-none absolute bottom-1 left-1 top-1 z-0 w-[calc(50%-0.25rem)] rounded-lg bg-emerald-900 shadow-sm dark:bg-emerald-700"
              style={{ transform: activeTab === 'match' ? 'translateX(0)' : 'translateX(100%)' }}
            />
            <button
              type="button"
              onClick={() => setActiveTab('match')}
              className={`relative z-10 min-h-10 w-1/2 rounded-lg px-3 text-[16px] font-bold transition-colors sm:text-[16px] ${
                activeTab === 'match'
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-gray-100'
              }`}
            >
              <span className="relative z-10">승부예측</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ranking')}
              className={`relative z-10 min-h-10 w-1/2 rounded-lg px-3 text-[16px] font-bold transition-colors sm:text-[16px] ${
                activeTab === 'ranking'
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-gray-100'
              }`}
            >
              <span className="relative z-10">순위예측</span>
            </button>
          </div>
        </div>

        {shouldRenderAnimatedSections ? (
          <Suspense fallback={activeTab === 'match' ? matchChildren : rankingChildren}>
            <PredictionAnimatedSections
              activeTab={activeTab}
              topNotice={null}
              matchChildren={matchChildren}
              rankingChildren={rankingChildren}
            />
          </Suspense>
        ) : (
          activeTab === 'match' ? matchChildren : rankingChildren
        )}
      </div>
    </div>
  );
}
