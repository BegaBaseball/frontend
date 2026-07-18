import { lazy, Suspense, startTransition, useEffect, useState } from 'react';
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
import { scheduleAfterNextPaint } from '../../utils/afterNextPaint';
import { schedulePredictionPostPaintIdleWork } from '../../utils/predictionDeferredWork';
import PredictionLoadingView from './PredictionLoadingView';
import { PREDICTION_BRAND_GRADIENT_CLASS } from './predictionUiTokens';

const AppQueryProvider = lazy(() => import('../AppQueryProvider'));
const PredictionMatchRuntime = lazy(() => import('./PredictionMatchRuntime'));
const loadPredictionRankingTab = () => import('./PredictionRankingTab');
const loadPredictionAnimatedSections = () => import('../PredictionAnimatedSections');
const loadRankingPrediction = () => import('../RankingPrediction');
const loadPredictionStatsPanel = () => import('./PredictionStatsPanel');

const PredictionRankingTab = lazy(loadPredictionRankingTab);
const PredictionAnimatedSections = lazy(loadPredictionAnimatedSections);
const PREDICTION_RANKING_PRELOAD_DELAY_MS = 2500;

export function preloadPredictionRankingTabResources(includeUserStats: boolean) {
  void loadPredictionAnimatedSections();
  void loadPredictionRankingTab();
  void loadRankingPrediction();

  if (includeUserStats) {
    void loadPredictionStatsPanel();
  }
}

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
  const [contentTab, setContentTab] = useState<'match' | 'ranking'>('match');
  const [hasVisitedRankingTab, setHasVisitedRankingTab] = useState(false);
  const [rankingFeatureReady, setRankingFeatureReady] = useState(false);
  const { isLoggedIn } = useAuthSession();
  const { userCheerPoints = 0 } = useAuthProfileSnapshot();
  const [searchParams] = useSearchParams();
  const { date: otherGamesDate, path: otherGamesPath } = getPredictionOtherGamesLinkState(
    searchParams.get('date')
  );

  useEffect(() => {
    let cancelRankingPreload: (() => void) | undefined;
    const rankingPreloadTimeoutId = globalThis.setTimeout(() => {
      cancelRankingPreload = schedulePredictionPostPaintIdleWork(() => {
        preloadPredictionRankingTabResources(isLoggedIn);
      });
    }, PREDICTION_RANKING_PRELOAD_DELAY_MS);

    return () => {
      globalThis.clearTimeout(rankingPreloadTimeoutId);
      cancelRankingPreload?.();
    };
  }, [isLoggedIn]);

  const handleTabChange = (nextTab: 'match' | 'ranking') => {
    setActiveTab(nextTab);
  };

  useEffect(() => {
    if (activeTab === contentTab) {
      return undefined;
    }

    return scheduleAfterNextPaint(() => {
      startTransition(() => {
        setContentTab(activeTab);
        const nextState = getPredictionTabActivationState(
          activeTab,
          hasVisitedRankingTab,
          rankingFeatureReady,
        );

        if (nextState.hasVisitedRankingTab !== hasVisitedRankingTab) {
          setHasVisitedRankingTab(nextState.hasVisitedRankingTab);
        }
        if (nextState.rankingFeatureReady !== rankingFeatureReady) {
          setRankingFeatureReady(nextState.rankingFeatureReady);
        }
      });
    });
  }, [activeTab, contentTab, hasVisitedRankingTab, rankingFeatureReady]);

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

  const shouldRenderAnimatedSections = contentTab === 'ranking' || hasVisitedRankingTab;

  return (
    <div className="min-h-screen bg-secondary/40 font-sans transition-colors duration-200 dark:bg-background">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl px-0 pb-5 sm:px-6 sm:pt-5 lg:px-8">
        <div className={`${PREDICTION_BRAND_GRADIENT_CLASS} mb-4 overflow-hidden px-4 pb-4 pt-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.9)] sm:rounded-3xl sm:px-5 sm:pt-5 dark:shadow-none`}>
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="rounded-xl border border-white/20 bg-white/10 p-2.5 shadow-sm">
              <PredictionLineChartIcon className="h-5 w-5 text-emerald-200" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-13 font-semibold text-emerald-100/75">
                ANALYSIS LAB
              </span>
              <h2 className="truncate text-xl font-extrabold tracking-normal text-white sm:text-2xl">전력분석실</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/leaderboard"
                aria-label="랭킹 보기"
                className="group flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 text-emerald-100 transition-colors hover:bg-white/20 sm:px-3"
              >
                <PredictionGamepadIcon className="h-4 w-4" />
                <span className="hidden text-13 font-extrabold sm:inline">랭킹</span>
              </Link>
              {isLoggedIn ? (
                <div className="flex h-10 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 text-emerald-100">
                  <PredictionCoinsIcon className="h-4 w-4 text-emerald-200" />
                  <span className="text-13 font-extrabold tabular-nums">
                    {userCheerPoints.toLocaleString()} P
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {isLoggedIn ? (
            <div className="mt-3 flex items-center gap-2">
              <Link
                to="/mypage"
                className="min-w-0 flex-1 truncate text-12 font-bold leading-relaxed text-emerald-200 hover:text-white sm:text-13"
              >
                📸 다이어리 시야 사진 공유 → 리더보드 +50P
              </Link>
            </div>
          ) : null}

          <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto sm:overflow-visible">
            <div className="relative flex shrink-0 overflow-hidden rounded-xl border border-white/20 bg-slate-950/25 p-1">
              <span
                className="pointer-events-none absolute bottom-1 left-1 top-1 z-0 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                style={{ transform: activeTab === 'match' ? 'translateX(0)' : 'translateX(100%)' }}
              />
              <button
                type="button"
                onClick={() => handleTabChange('match')}
                data-testid="prediction-tab-match"
                className={`relative z-10 min-h-10 flex-1 rounded-lg px-4 py-1.5 text-13 font-extrabold transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 sm:text-body ${
                  activeTab === 'match'
                    ? 'text-primary-dark'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="relative z-10">승부예측</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('ranking')}
                data-testid="prediction-tab-ranking"
                className={`relative z-10 min-h-10 flex-1 rounded-lg px-4 py-1.5 text-13 font-extrabold transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 sm:text-body ${
                  activeTab === 'ranking'
                    ? 'text-primary-dark'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="relative z-10">순위예측</span>
              </button>
            </div>
            <span className="flex-1" />
            <Link
              to={otherGamesPath}
              data-testid="prediction-other-games-link"
              aria-label={`${otherGamesDate || '선택 날짜'} 다른 경기 조회`}
              className="inline-flex min-h-10 shrink-0 items-center gap-0.5 rounded-xl border border-white/20 bg-white px-3 py-1.5 text-13 font-extrabold text-primary-dark shadow-[0_8px_20px_-12px_rgba(0,0,0,0.5)] transition-colors hover:bg-emerald-50 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:ring-offset-0"
            >
              <PredictionChevronLeftIcon className="h-3.5 w-3.5" />
              <span>다른 경기 조회</span>
            </Link>
          </div>
        </div>

        <div className="px-4 sm:px-0">
          <Suspense fallback={<PredictionLoadingView topNotice={null} />}>
            <AppQueryProvider>
              {shouldRenderAnimatedSections ? (
                <Suspense fallback={contentTab === 'match' ? matchChildren : rankingChildren}>
                  <PredictionAnimatedSections
                    activeTab={contentTab}
                    topNotice={null}
                    matchChildren={matchChildren}
                    rankingChildren={rankingChildren}
                  />
                </Suspense>
              ) : (
                contentTab === 'match' ? matchChildren : rankingChildren
              )}
            </AppQueryProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
