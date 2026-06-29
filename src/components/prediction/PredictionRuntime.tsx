import { lazy, Suspense, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Card } from '../ui/card';
import { Toaster } from '../ui/sonner';
import { useAuthProfileSnapshot, useAuthSession } from '../../store/authStore';
import {
  PredictionChevronLeftIcon,
  PredictionCoinsIcon,
  PredictionGamepadIcon,
  PredictionLineChartIcon,
  PredictionLoaderIcon,
} from './PredictionShellIcons';
import { buildPredictionListPath } from '../../utils/predictionDeepLink';
import PredictionMatchRuntime from './PredictionMatchRuntime';

const PredictionRankingTab = lazy(() => import('./PredictionRankingTab'));
const PredictionAnimatedSections = lazy(() => import('../PredictionAnimatedSections'));

export function getPredictionTabActivationState(
  nextTab: 'match' | 'ranking',
  previousVisitedRankingTab: boolean,
  previousRankingFeatureReady: boolean,
) {
  const activateRanking = nextTab === 'ranking';
  return {
    hasVisitedRankingTab: previousVisitedRankingTab || activateRanking,
    rankingFeatureReady: previousRankingFeatureReady || activateRanking,
  };
}

export function getPredictionOtherGamesLinkState(dateParam: string | null) {
  const date = dateParam?.trim() || '';
  return {
    date,
    path: buildPredictionListPath({ date }),
  };
}

export default function PredictionRuntime() {
  const [activeTab, setActiveTab] = useState<'match' | 'ranking'>('match');
  const [hasVisitedRankingTab, setHasVisitedRankingTab] = useState(false);
  const [rankingFeatureReady, setRankingFeatureReady] = useState(false);
  const { isLoggedIn } = useAuthSession();
  const { userCheerPoints = 0 } = useAuthProfileSnapshot();
  const [searchParams] = useSearchParams();
  const { date: otherGamesDate, path: otherGamesPath } = getPredictionOtherGamesLinkState(
    searchParams.get('date')
  );

  const handleTabChange = (nextTab: 'match' | 'ranking') => {
    setActiveTab(nextTab);

    const nextState = getPredictionTabActivationState(
      nextTab,
      hasVisitedRankingTab,
      rankingFeatureReady,
    );

    if (nextState.hasVisitedRankingTab !== hasVisitedRankingTab) {
      setHasVisitedRankingTab(nextState.hasVisitedRankingTab);
    }
    if (nextState.rankingFeatureReady !== rankingFeatureReady) {
      setRankingFeatureReady(nextState.rankingFeatureReady);
    }
  };

  const matchChildren = (
    <Suspense
      fallback={(
        <Card className="relative mb-4 rounded-2xl border border-border bg-card p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
          <div className="inline-flex items-center gap-2 text-body font-bold text-muted-foreground">
            <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
            경기 화면을 준비하고 있습니다.
          </div>
          <div aria-hidden="true" className="mx-auto mt-3 h-2 w-32 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
        </Card>
      )}
    >
      <PredictionMatchRuntime />
    </Suspense>
  );

  const rankingChildren = rankingFeatureReady ? (
    <Suspense
      fallback={(
        <Card className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
          <div className="inline-flex items-center gap-2 text-body font-bold text-muted-foreground">
            <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
            순위 예측 화면을 준비하고 있습니다.
          </div>
          <div aria-hidden="true" className="mx-auto mt-3 h-2 w-36 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
        </Card>
      )}
    >
      <PredictionRankingTab isLoggedIn={isLoggedIn} />
    </Suspense>
  ) : (
    <Card className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
      <div className="inline-flex items-center gap-2 text-body font-bold text-muted-foreground">
        <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
        순위 예측 화면을 준비하고 있습니다.
      </div>
      <div aria-hidden="true" className="mx-auto mt-3 h-2 w-36 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
    </Card>
  );

  const shouldRenderAnimatedSections = activeTab === 'ranking' || hasVisitedRankingTab;

  return (
    <div className="min-h-screen bg-background font-sans transition-colors duration-200">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="rounded-xl border border-emerald-200/70 bg-emerald-100/70 p-2.5 shadow-[0_0_12px_rgba(16,185,129,0.2)] dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <PredictionLineChartIcon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div className="flex-1">
            <span className="block text-11 font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Analysis Lab
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">전력분석실</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/leaderboard"
              className="group flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-2 shadow-sm transition-colors hover:border-emerald-400/60 dark:shadow-md dark:hover:border-emerald-400/70 sm:px-3"
            >
              <PredictionGamepadIcon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-300" />
            <span className="hidden text-body font-bold text-muted-foreground sm:text-body">랭킹</span>
            </Link>
            {isLoggedIn ? (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 shadow-sm dark:border-emerald-800/40 dark:bg-emerald-900/40 dark:shadow-md md:hidden sm:px-3">
                <PredictionCoinsIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-200" />
                <span className="text-body font-bold tabular-nums text-emerald-800 dark:text-emerald-100 sm:text-body">
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
              className="inline-flex max-w-full items-center gap-1 text-body font-bold leading-relaxed text-emerald-600 hover:underline dark:text-emerald-400 sm:text-body"
            >
              📸 다이어리 시야 사진 공유 → 리더보드 +50P
            </Link>
          </div>
        ) : null}

        <div className="mb-4 flex flex-nowrap items-center gap-1 overflow-x-auto md:mb-5 md:overflow-visible">
          <Link
            to={otherGamesPath}
            data-testid="prediction-other-games-link"
            aria-label={`${otherGamesDate || '선택 날짜'} 다른 경기 조회`}
            className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1.5 text-body font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:ring-offset-0 dark:border-border dark:bg-secondary/70 dark:text-white dark:hover:bg-secondary md:w-fit"
          >
            <PredictionChevronLeftIcon className="h-3.5 w-3.5" />
            <span>다른 경기 조회</span>
          </Link>
          <div className="relative flex shrink-0 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-sm dark:shadow-md">
            <span
              className="pointer-events-none absolute bottom-1 left-1 top-1 z-0 w-[calc(50%-0.25rem)] rounded-lg bg-primary shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ transform: activeTab === 'match' ? 'translateX(0)' : 'translateX(100%)' }}
            />
            <button
              type="button"
              onClick={() => handleTabChange('match')}
              data-testid="prediction-tab-match"
              className={`relative z-10 min-h-11 flex-1 rounded-lg px-2 py-1.5 text-body font-bold transition-colors sm:text-body focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                activeTab === 'match'
                  ? 'text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="relative z-10">승부예측</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('ranking')}
              data-testid="prediction-tab-ranking"
              className={`relative z-10 min-h-11 flex-1 rounded-lg px-2 py-1.5 text-body font-bold transition-colors sm:text-body focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                activeTab === 'ranking'
                  ? 'text-white'
                  : 'text-muted-foreground hover:text-foreground'
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
