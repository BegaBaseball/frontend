import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Card } from '../ui/card';
import { usePrediction } from '../../hooks/usePrediction';
import { useAuthProfileSnapshot } from '../../store/authStore';
import { buildPredictionRecoveryPath, type PredictionLocationState } from '../../utils/predictionDeepLink';
import {
  PredictionCoinsIcon,
  PredictionGamepadIcon,
  PredictionLineChartIcon,
  PredictionLoaderIcon,
} from './PredictionShellIcons';

const PredictionErrorOverlay = lazy(() => import('./PredictionErrorOverlay'));
const PredictionLoadingView = lazy(() => import('./PredictionLoadingView'));
const PredictionMatchesErrorView = lazy(() => import('./PredictionMatchesErrorView'));
const PredictionMatchTab = lazy(() => import('./PredictionMatchTab'));
const PredictionRankingTab = lazy(() => import('./PredictionRankingTab'));
const PredictionTopNotice = lazy(() => import('./PredictionTopNotice'));
const PredictionAnimatedSections = lazy(() => import('../PredictionAnimatedSections'));

export default function PredictionRuntime() {
  const {
    activeTab,
    setActiveTab,
    currentGame,
    currentDateGames,
    currentDate,
    loading,
    currentDayNavigationMeta,
    votes,
    userVote,
    currentGameDetail,
    currentGameDetailLoading,
    currentGameDetailRefreshing,
    isAuthLoading,
    allDatesData,
    currentDateIndex,
    currentGameDetailError,
    deepLinkNotice,
    voteStatusError,
    voteStatusLoading,
    isCurrentVotePartial,
    currentVotePartialReason,
    handleVote,
    goToPreviousDate,
    goToNextDate,
    goToDate,
    reloadMatches,
    isLoggedIn,
    matchesLoadState,
    matchesLoadErrorMessage,
    pastRangeLoadState,
    pastRangeLoadErrorMessage,
    futureRangeLoadState,
    futureRangeLoadErrorMessage,
    canLoadMorePast,
    canLoadMoreFuture,
    matchBounds,
    reloadCurrentVoteStatus,
    reloadCurrentGameDetail,
    isRunInProgress,
    isRunBannerDismissed,
    retryLoadMoreFutureMatches,
    runProgressMessage,
    dismissRunProgressBanner,
    resumeRunProgressBanner,
    predictionErrorOverlay,
    handlePredictionErrorOverlayAction,
    closePredictionErrorOverlay,
    retryLoadMorePastMatches,
  } = usePrediction();

  const { userCheerPoints = 0 } = useAuthProfileSnapshot();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hasEnteredMatchDetail, setHasEnteredMatchDetail] = useState(false);
  const [hasVisitedRankingTab, setHasVisitedRankingTab] = useState(activeTab === 'ranking');
  const [rankingFeatureReady, setRankingFeatureReady] = useState(activeTab === 'ranking');
  const currentGameId = currentGame?.gameId;

  const locationState = location.state as PredictionLocationState;
  const deepLinkGameId = useMemo(() => {
    const queryGameId = searchParams.get('gameId')?.trim() || '';
    const stateGameId = (locationState?.gameId || '').trim();
    const stateSeedGameId = (locationState?.game?.gameId || '').trim();

    return queryGameId || stateGameId || stateSeedGameId;
  }, [locationState?.game?.gameId, locationState?.gameId, searchParams]);
  const isDeepLinkMatchSelection = useMemo(() => {
    if (!deepLinkGameId || !currentGameId) {
      return false;
    }

    return currentGameId === deepLinkGameId;
  }, [currentGameId, deepLinkGameId]);

  useEffect(() => {
    if (isDeepLinkMatchSelection) {
      setHasEnteredMatchDetail(true);
    }
  }, [isDeepLinkMatchSelection]);

  useEffect(() => {
    if (activeTab === 'ranking') {
      setHasVisitedRankingTab(true);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'ranking') {
      return;
    }

    if (rankingFeatureReady) {
      return;
    }

    let timeoutId: number | null = null;
    timeoutId = window.setTimeout(() => {
      setRankingFeatureReady(true);
    }, 180);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeTab, rankingFeatureReady]);

  const handleEnterMatchDetail = useCallback(() => {
    setHasEnteredMatchDetail(true);
  }, []);

  const shouldRenderMatchCard = (hasEnteredMatchDetail || isDeepLinkMatchSelection) && Boolean(currentGameId);
  const predictionRecoveryPath = buildPredictionRecoveryPath({
    currentDate,
    currentGameId,
  });

  const showRunProgressBanner = isRunInProgress && !isRunBannerDismissed;
  const canMovePrevDate = currentDateIndex > 0 || canLoadMorePast;
  const canMoveNextDate = currentDateIndex < allDatesData.length - 1 || canLoadMoreFuture;
  const nearestNavigationDate = useMemo(() => {
    if (!currentDayNavigationMeta) {
      return null;
    }

    const previousCandidate = currentDayNavigationMeta.prevDate
      ? allDatesData.find((entry) => entry.date === currentDayNavigationMeta.prevDate) || null
      : null;
    const nextCandidate = currentDayNavigationMeta.nextDate
      ? allDatesData.find((entry) => entry.date === currentDayNavigationMeta.nextDate) || null
      : null;

    if ((previousCandidate?.games.length || 0) > 0) {
      return { date: previousCandidate!.date, isPast: true };
    }

    if ((nextCandidate?.games.length || 0) > 0) {
      return { date: nextCandidate!.date, isPast: false };
    }

    const previousKnownEmpty = previousCandidate !== null && previousCandidate.games.length === 0;
    const nextKnownEmpty = nextCandidate !== null && nextCandidate.games.length === 0;

    if (previousKnownEmpty && currentDayNavigationMeta.nextDate) {
      return { date: currentDayNavigationMeta.nextDate, isPast: false };
    }

    if (nextKnownEmpty && currentDayNavigationMeta.prevDate) {
      return { date: currentDayNavigationMeta.prevDate, isPast: true };
    }

    if (currentDayNavigationMeta.prevDate) {
      return { date: currentDayNavigationMeta.prevDate, isPast: true };
    }

    if (currentDayNavigationMeta.nextDate) {
      return { date: currentDayNavigationMeta.nextDate, isPast: false };
    }

    return null;
  }, [allDatesData, currentDayNavigationMeta]);
  const handleNearestNavigation = useCallback(() => {
    if (!nearestNavigationDate) {
      return;
    }

    void goToDate(nearestNavigationDate.date);
  }, [goToDate, nearestNavigationDate]);
  const normalizeBoundaryDate = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 10) : null;
  };
  const earliestBoundaryDate = normalizeBoundaryDate(matchBounds?.earliestGameDate);
  const hasAdditionalPastMatches = Boolean(
    matchBounds?.hasData
    && earliestBoundaryDate
    && allDatesData[0]?.date
    && normalizeBoundaryDate(allDatesData[0].date)
    && normalizeBoundaryDate(allDatesData[0].date)! > earliestBoundaryDate
  );
  const hasPastNavigation = canMovePrevDate || hasAdditionalPastMatches;
  type TopNoticeKind = 'RUN' | 'FUTURE' | 'ERROR' | 'END' | 'INFO';
  type TopNotice = { kind: TopNoticeKind; content: JSX.Element };
  const isFutureRangeLoading = futureRangeLoadState === 'loading';
  const isFutureRangeError = futureRangeLoadState === 'error';
  const topNoticeKind = useMemo<TopNoticeKind | null>(() => {
    if (showRunProgressBanner) {
      return 'RUN';
    }

    if (isFutureRangeLoading || isFutureRangeError) {
      return 'FUTURE';
    }

    if (currentDateIndex === 0 && pastRangeLoadState === 'loading') {
      return 'INFO';
    }

    if (isCurrentVotePartial) {
      return 'INFO';
    }

    if (voteStatusError) {
      return 'ERROR';
    }

    if (currentDateIndex === 0 && pastRangeLoadState === 'error') {
      return 'ERROR';
    }

    if (currentDateIndex === 0 && !canLoadMorePast && pastRangeLoadState === 'end') {
      return 'END';
    }

    if (
      currentDateIndex === allDatesData.length - 1
      && !canLoadMoreFuture
      && !hasPastNavigation
      && futureRangeLoadState === 'end'
    ) {
      return 'END';
    }

    if (deepLinkNotice) {
      return 'INFO';
    }

    return null;
  }, [
    allDatesData.length,
    canLoadMoreFuture,
    canLoadMorePast,
    currentDateIndex,
    deepLinkNotice,
    futureRangeLoadState,
    hasPastNavigation,
    isCurrentVotePartial,
    isFutureRangeError,
    isFutureRangeLoading,
    pastRangeLoadState,
    showRunProgressBanner,
    voteStatusError,
  ]);
  const sharedTopNotice: TopNotice | null = topNoticeKind ? {
    kind: topNoticeKind,
    content: (
      <Suspense fallback={null}>
        <PredictionTopNotice
          kind={topNoticeKind}
          currentDateIndex={currentDateIndex}
          pastRangeLoadState={pastRangeLoadState}
          pastRangeLoadErrorMessage={pastRangeLoadErrorMessage}
          futureRangeLoadState={futureRangeLoadState}
          futureRangeLoadErrorMessage={futureRangeLoadErrorMessage}
          canLoadMorePast={canLoadMorePast}
          canLoadMoreFuture={canLoadMoreFuture}
          hasPastNavigation={hasPastNavigation}
          isCurrentVotePartial={isCurrentVotePartial}
          currentVotePartialReason={currentVotePartialReason}
          voteStatusError={voteStatusError}
          isVoteRetryLoading={voteStatusLoading}
          isRunInProgress={isRunInProgress}
          isRunBannerDismissed={isRunBannerDismissed}
          runProgressMessage={runProgressMessage}
          deepLinkNotice={deepLinkNotice}
          predictionRecoveryPath={predictionRecoveryPath}
          onRetryLoadMorePastMatches={retryLoadMorePastMatches}
          onRetryLoadMoreFutureMatches={retryLoadMoreFutureMatches}
          onRetryVoteStatus={() => {
            reloadCurrentVoteStatus();
          }}
          onRetryPartialVoteStatus={() => {
            reloadCurrentVoteStatus({ source: 'manual' });
          }}
          onDismissRunProgressBanner={dismissRunProgressBanner}
          onResumeRunProgressBanner={resumeRunProgressBanner}
        />
      </Suspense>
    ),
  } : null;

  if (predictionErrorOverlay?.isOpen) {
    return (
      <Suspense fallback={null}>
        <PredictionErrorOverlay
          isOpen
          title={predictionErrorOverlay.title}
          message={predictionErrorOverlay.message}
          errorCode={predictionErrorOverlay.errorCode}
          copyKey={predictionErrorOverlay.copyKey}
          actionPriorityOrder={predictionErrorOverlay.recoveryState.actionPriorityOrder}
          onAction={handlePredictionErrorOverlayAction}
          onClose={closePredictionErrorOverlay}
        />
      </Suspense>
    );
  }

  if (isAuthLoading || loading) {
    return (
      <Suspense fallback={null}>
        <PredictionLoadingView topNotice={sharedTopNotice?.content ?? null} />
      </Suspense>
    );
  }

  if (matchesLoadState === 'error') {
    return (
      <Suspense fallback={null}>
        <PredictionMatchesErrorView
          matchesLoadErrorMessage={matchesLoadErrorMessage}
          predictionRecoveryPath={predictionRecoveryPath}
          onReloadMatches={reloadMatches}
        />
      </Suspense>
    );
  }

  const topNotice = activeTab === 'match' ? sharedTopNotice : null;
  const shouldRenderAnimatedSections = activeTab === 'ranking' || hasVisitedRankingTab;
  const matchChildren = (
    <Suspense
      fallback={(
        <Card className="relative p-4 mb-4 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md rounded-2xl">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-gray-300">
            <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
            경기 화면을 준비하고 있습니다.
          </div>
        </Card>
      )}
    >
      <PredictionMatchTab
        currentDateGames={currentDateGames}
        currentDate={currentDate}
        currentGame={currentGame}
        currentGameId={currentGameId}
        currentGameDetail={currentGameDetail}
        currentGameDetailLoading={currentGameDetailLoading}
        currentGameDetailRefreshing={currentGameDetailRefreshing}
        currentGameDetailError={currentGameDetailError}
        userVote={userVote}
        votes={votes}
        isLoggedIn={isLoggedIn}
        isAuthLoading={isAuthLoading}
        shouldRenderMatchCard={shouldRenderMatchCard}
        predictionRecoveryPath={predictionRecoveryPath}
        canMovePrevDate={canMovePrevDate}
        canMoveNextDate={canMoveNextDate}
        isDetailRetryLoading={currentGameDetailLoading || currentGameDetailRefreshing}
        nearestNavigationDate={nearestNavigationDate}
        isToday={new Date(currentDate).toDateString() === new Date().toDateString()}
        onEnterMatchDetail={handleEnterMatchDetail}
        onVote={handleVote}
        onPrevDate={goToPreviousDate}
        onNextDate={goToNextDate}
        onNearestNavigation={handleNearestNavigation}
        reloadCurrentGameDetail={reloadCurrentGameDetail}
      />
    </Suspense>
  );
  const rankingChildren = (
    rankingFeatureReady ? (
      <Suspense
        fallback={(
          <Card className="p-6 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md text-center rounded-2xl">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-gray-300">
              <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
              순위 예측 화면을 준비하고 있습니다.
            </div>
          </Card>
        )}
      >
        <PredictionRankingTab isLoggedIn={isLoggedIn} />
      </Suspense>
    ) : (
      <Card className="p-6 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md text-center rounded-2xl">
        <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-gray-300">
          <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
          순위 예측 화면을 준비하고 있습니다.
        </div>
      </Card>
    )
  );

  const panelContent = (
    shouldRenderAnimatedSections ? (
      <Suspense fallback={activeTab === 'match' ? matchChildren : rankingChildren}>
        <PredictionAnimatedSections
          activeTab={activeTab}
          topNotice={topNotice}
          matchChildren={matchChildren}
          rankingChildren={rankingChildren}
        />
      </Suspense>
    ) : (
      <div className="relative">
        {topNotice && (
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center sm:justify-end">
            {topNotice.content}
          </div>
        )}
        {activeTab === 'match' ? matchChildren : rankingChildren}
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-200/70 shadow-[0_0_12px_rgba(16,185,129,0.2)] dark:bg-emerald-400/15 dark:border-emerald-400/30 dark:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <PredictionLineChartIcon className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-gray-100">전력분석실</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/leaderboard"
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition-colors hover:border-emerald-400/60 group dark:bg-card dark:border-border dark:hover:border-emerald-400/70 dark:shadow-md sm:px-3"
            >
              <PredictionGamepadIcon className="w-4 h-4 text-slate-500 transition-colors group-hover:text-emerald-600 dark:text-gray-300 dark:group-hover:text-emerald-300" />
              <span className="text-sm font-semibold text-slate-600 dark:text-gray-200 hidden sm:inline">랭킹</span>
            </Link>
            {isLoggedIn && (
              <div className="flex md:hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 shadow-sm dark:bg-emerald-900/40 dark:border-emerald-800/40 dark:shadow-md sm:px-3">
                <PredictionCoinsIcon className="w-4 h-4 text-emerald-700 dark:text-emerald-200" />
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-100 tabular-nums sm:text-sm">
                  {userCheerPoints.toLocaleString()} P
                </span>
              </div>
            )}
          </div>
        </div>

        {isLoggedIn && (
          <div className="mb-2 flex justify-start sm:justify-end">
            <Link
              to="/mypage"
              className="inline-flex max-w-full items-center gap-1 text-[11px] leading-relaxed text-emerald-600 hover:underline dark:text-emerald-400 sm:text-xs"
            >
              📸 다이어리 시야 사진 공유 → 리더보드 +50P
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-2.5 mb-4 md:mb-5 md:flex-row md:items-center">
          <div className="relative flex w-full max-w-sm overflow-hidden p-1 bg-white/80 border border-slate-200/70 rounded-xl shadow-sm dark:bg-card dark:border-border dark:shadow-md md:w-fit">
            <span
              className="pointer-events-none absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-emerald-900 shadow-sm dark:bg-emerald-700 z-0"
              style={{ transform: activeTab === 'match' ? 'translateX(0)' : 'translateX(100%)' }}
            />
            <button
              type="button"
              onClick={() => setActiveTab('match')}
              className={`relative z-10 w-1/2 px-3 min-h-10 rounded-lg transition-colors text-xs sm:text-sm font-bold ${activeTab === 'match'
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-gray-100'
            }`}
            >
              <span className="relative z-10">승부예측</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ranking')}
              className={`relative z-10 w-1/2 px-3 min-h-10 rounded-lg transition-colors text-xs sm:text-sm font-bold ${activeTab === 'ranking'
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-gray-100'
            }`}
            >
              <span className="relative z-10">순위예측</span>
            </button>
          </div>
        </div>

        {panelContent}
      </div>
    </div>
  );
}
