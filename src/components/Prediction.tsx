import { lazy, Suspense, useCallback, useEffect, useMemo, type ReactNode, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, Coins, LineChart, Gamepad2, Loader2 } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import PredictionErrorOverlay from './prediction/PredictionErrorOverlay';
import { usePrediction } from '../hooks/usePrediction';
import { useAuthProfileSnapshot } from '../store/authStore';
import { buildPredictionRecoveryPath, type PredictionLocationState } from '../utils/predictionDeepLink';

const PredictionMatchTab = lazy(() => import('./prediction/PredictionMatchTab'));
const PredictionRankingTab = lazy(() => import('./prediction/PredictionRankingTab'));
const PredictionAnimatedSections = lazy(() => import('./PredictionAnimatedSections'));

export default function Prediction() {
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
  type TopNotice = { kind: TopNoticeKind; content: ReactNode };
  const noticeCardBaseClass = 'w-full max-w-[22rem] p-3 gap-2 pointer-events-auto';
  const isPastRetryLoading = pastRangeLoadState === 'loading';
  const isFutureRetryLoading = futureRangeLoadState === 'loading';
  const isVoteRetryLoading = voteStatusLoading;

  const renderRetryLabel = (isLoading: boolean, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {label}
    </span>
  );

  const renderFutureRangeNotice = (): ReactNode | null => {
    const isFutureRangeLoading = futureRangeLoadState === 'loading';
    const isFutureRangeError = futureRangeLoadState === 'error';
    if (!isFutureRangeLoading && !isFutureRangeError) {
      return null;
    }

    if (isFutureRangeLoading) {
      return (
        <Card className={`${noticeCardBaseClass} border border-sky-200 text-sky-900 bg-sky-50 dark:bg-sky-900/30 dark:border-sky-700/40 dark:text-sky-100`}>
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {futureRangeLoadErrorMessage || '다음 경기 탐색 중입니다.'}
          </div>
        </Card>
      );
    }

    return (
      <Card className={`${noticeCardBaseClass} border border-rose-200 text-rose-900 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-700/40 dark:text-rose-100`}>
        <p className="text-sm font-medium mb-2">
          {futureRangeLoadErrorMessage || '미래 구간 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            disabled={isFutureRetryLoading}
            className="min-h-11 bg-rose-900 hover:bg-rose-800 text-white dark:bg-rose-400 dark:hover:bg-rose-300 dark:text-rose-950"
            onClick={retryLoadMoreFutureMatches}
          >
            {renderRetryLabel(isFutureRetryLoading, '예정 경기 다시 불러오기')}
          </Button>
          <Link
            to={predictionRecoveryPath}
            className="min-h-11 px-3 inline-flex items-center justify-center rounded-md border border-rose-300/70 text-rose-900 hover:bg-rose-100 dark:border-rose-300/60 dark:text-rose-100 dark:hover:bg-rose-800/30"
          >
            예측으로 돌아가기
          </Link>
        </div>
      </Card>
    );
  };

  const getTopNotice = (futureRangeNotice: ReactNode | null): TopNotice | null => {
    if (showRunProgressBanner) {
      return {
        kind: 'RUN',
        content: (
          <Card className={`${noticeCardBaseClass} bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-700/50 dark:text-emerald-100`}>
            <div className="flex flex-wrap items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm font-medium">
                {runProgressMessage}
              </p>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11 border-emerald-300/70 hover:bg-emerald-100 dark:border-emerald-600/70 dark:hover:bg-emerald-900/40"
                  onClick={() => {
                    dismissRunProgressBanner();
                  }}
                >
                  백그라운드로 계산
                </Button>
                <Button
                  size="sm"
                  className="min-h-11 bg-emerald-900 hover:bg-emerald-800 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-emerald-950"
                  onClick={() => {
                    resumeRunProgressBanner();
                  }}
                >
                  지금 계속
                </Button>
              </div>
            </div>
          </Card>
        ),
      };
    }

    if (futureRangeNotice) {
      return {
        kind: 'FUTURE',
        content: futureRangeNotice,
      };
    }

    if (currentDateIndex === 0 && pastRangeLoadState === 'loading') {
      return {
        kind: 'INFO',
        content: (
          <Card className={`${noticeCardBaseClass} border border-sky-200 text-sky-900 bg-sky-50 dark:bg-sky-900/30 dark:border-sky-700/40 dark:text-sky-100`}>
            <div className="inline-flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              이전 경기 탐색 중입니다.
            </div>
          </Card>
        ),
      };
    }

    if (isCurrentVotePartial) {
      return {
        kind: 'INFO',
        content: (
          <Card
            data-testid="prediction-partial-result-notice"
            className={`${noticeCardBaseClass} border border-amber-200 text-amber-900 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700/40 dark:text-amber-100`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-800/70 dark:text-amber-100">
                부분 결과
              </span>
              <p className="text-sm font-medium">투표 집계가 일부만 도착했습니다.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                disabled={isVoteRetryLoading}
                data-testid="prediction-partial-retry-btn"
                className="min-h-11 bg-amber-800 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-amber-950"
                onClick={() => {
                  reloadCurrentVoteStatus({ source: 'manual' });
                }}
              >
                {renderRetryLabel(isVoteRetryLoading, '투표 집계 다시 시도')}
              </Button>
              <span className="inline-flex items-center text-xs text-amber-800/80 dark:text-amber-100/80">
                사유: {currentVotePartialReason || 'unknown'}
              </span>
            </div>
          </Card>
        ),
      };
    }

    if (voteStatusError) {
      return {
        kind: 'ERROR',
        content: (
          <Card className={`${noticeCardBaseClass} border border-rose-200 text-rose-900 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-700/40 dark:text-rose-100`}>
            <p className="text-sm font-medium mb-2">투표 집계 조회 실패: {voteStatusError}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                disabled={isVoteRetryLoading}
                className="min-h-11 bg-rose-900 hover:bg-rose-800 text-white dark:bg-rose-400 dark:hover:bg-rose-300 dark:text-rose-950"
                onClick={() => {
                  reloadCurrentVoteStatus();
                }}
              >
                {renderRetryLabel(isVoteRetryLoading, '투표 집계 다시 시도')}
              </Button>
              <Link
                to={predictionRecoveryPath}
                className="min-h-11 px-3 inline-flex items-center justify-center rounded-md border border-rose-200 text-rose-900 hover:bg-rose-100 dark:border-rose-300/70 dark:text-rose-100 dark:hover:bg-rose-900/40"
              >
                예측으로 돌아가기
              </Link>
            </div>
          </Card>
        ),
      };
    }

    if (currentDateIndex === 0 && pastRangeLoadState === 'error') {
      return {
        kind: 'ERROR',
        content: (
          <Card className={`${noticeCardBaseClass} border border-rose-200 text-rose-900 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-700/40 dark:text-rose-100`}>
            <p className="text-sm font-medium mb-2">
              이전 경기 조회 실패: {pastRangeLoadErrorMessage || '잠시 후 다시 시도해 주세요.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                disabled={isPastRetryLoading}
                className="min-h-11 bg-rose-900 hover:bg-rose-800 text-white dark:bg-rose-400 dark:hover:bg-rose-300 dark:text-rose-950"
                onClick={retryLoadMorePastMatches}
              >
                {renderRetryLabel(isPastRetryLoading, '이전 경기 다시 불러오기')}
              </Button>
              <Link
                to={predictionRecoveryPath}
                className="min-h-11 px-3 inline-flex items-center justify-center rounded-md border border-rose-300/70 text-rose-900 hover:bg-rose-100 dark:border-rose-300/60 dark:text-rose-100 dark:hover:bg-rose-800/30"
              >
                예측으로 돌아가기
              </Link>
            </div>
          </Card>
        ),
      };
    }

    if (currentDateIndex === 0 && !canLoadMorePast && pastRangeLoadState === 'end') {
      return {
        kind: 'END',
        content: (
          <Card className={`${noticeCardBaseClass} border border-slate-200 text-slate-700 bg-slate-50 dark:bg-card dark:border-border dark:text-gray-200`}>
            <p className="text-sm font-medium">
              {pastRangeLoadErrorMessage || '더 이상 이전 경기가 없습니다.'}
            </p>
          </Card>
        ),
      };
    }

    if (
      currentDateIndex === allDatesData.length - 1
      && !canLoadMoreFuture
      && !hasPastNavigation
      && futureRangeLoadState === 'end'
    ) {
      return {
        kind: 'END',
        content: (
          <Card className={`${noticeCardBaseClass} border border-slate-200 text-slate-700 bg-slate-50 dark:bg-card dark:border-border dark:text-gray-200`}>
            <p className="text-sm font-medium">
              {futureRangeLoadErrorMessage || '더 이상 예정 경기가 없습니다.'}
            </p>
          </Card>
        ),
      };
    }

    if (deepLinkNotice) {
      return {
        kind: 'INFO',
        content: (
          <Card className={`${noticeCardBaseClass} bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-900/30 dark:border-amber-700/40 dark:text-amber-100`}>
            <div className="text-sm">
              {deepLinkNotice}
            </div>
          </Card>
        ),
      };
    }

    return null;
  };

  const futureRangeNotice = renderFutureRangeNotice();
  const sharedTopNotice = getTopNotice(futureRangeNotice);

  // 로딩 중 - 스켈레톤 UI
  if (predictionErrorOverlay?.isOpen) {
    return (
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
    );
  }

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          {/* Title skeleton */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-200 dark:bg-card p-2 rounded-lg w-10 h-10 animate-pulse" />
            <div className="h-8 w-32 bg-slate-200 dark:bg-card rounded animate-pulse" />
          </div>

          {/* Tab skeleton */}
          <div className="flex p-1 bg-slate-200 dark:bg-card rounded-xl md:rounded-2xl mb-4 w-fit animate-pulse">
            <div className="w-20 h-10 bg-slate-300 dark:bg-card rounded-lg" />
            <div className="w-20 h-10 bg-slate-300 dark:bg-card rounded-lg ml-1" />
          </div>

          {sharedTopNotice && (
            <div className="mb-4 flex justify-center sm:justify-end">
              {sharedTopNotice.content}
            </div>
          )}

          {/* Match card skeleton */}
          <Card className="p-4 mb-4 bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-slate-200 dark:bg-card rounded-full" />
              <div className="flex-1 text-center space-y-2 px-4">
                <div className="h-5 w-32 bg-slate-200 dark:bg-card rounded mx-auto" />
                <div className="h-4 w-48 bg-slate-200 dark:bg-card rounded mx-auto" />
              </div>
              <div className="w-10 h-10 bg-slate-200 dark:bg-card rounded-full" />
            </div>
          </Card>

          <Card className="overflow-hidden border border-slate-200/70 shadow-sm bg-white/90 dark:border-border dark:bg-card dark:shadow-md animate-pulse">
            <div className="h-11 bg-slate-200 dark:bg-card" />
            <div className="p-5 space-y-4">
              <div className="flex justify-between">
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-card rounded-full" />
                  <div className="h-4 w-20 bg-slate-200 dark:bg-card rounded" />
                  <div className="h-3 w-16 bg-slate-200 dark:bg-card rounded" />
                </div>
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="h-8 w-12 bg-slate-200 dark:bg-card rounded" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-card rounded" />
                </div>
                <div className="flex flex-col items-center w-1/3 space-y-2">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-card rounded-full" />
                  <div className="h-4 w-20 bg-slate-200 dark:bg-card rounded" />
                  <div className="h-3 w-16 bg-slate-200 dark:bg-card rounded" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (matchesLoadState === 'error') {
    return (
      <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <Card className="relative p-4 sm:p-5 text-center bg-white/90 border border-rose-200/70 shadow-sm dark:bg-card dark:border-rose-900/40 dark:shadow-md flex flex-col items-center justify-center min-h-[120px] sm:min-h-[170px] md:min-h-[190px] rounded-2xl">
            <div className="bg-rose-100 dark:bg-card p-4 rounded-full mb-4">
              <TrendingUp className="w-8 h-8 text-rose-500 dark:text-rose-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-gray-100 mb-2">
              예측 경기 데이터를 불러오지 못했습니다.
            </h3>
            <p className="text-slate-500 dark:text-gray-300">
              {matchesLoadErrorMessage || '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.'}
            </p>
            <p className="mt-2 text-sm text-slate-400 dark:text-gray-400">
              잠시 후 다시 시도하거나 새로고침해 주세요.
            </p>
            <Button
              size="sm"
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600"
              onClick={reloadMatches}
            >
              목록 다시 불러오기
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 bg-white text-rose-600 dark:text-rose-300 border-rose-300/70"
              onClick={() => {
                window.location.href = predictionRecoveryPath;
              }}
            >
              예측으로 돌아가기
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const topNotice = activeTab === 'match' ? getTopNotice(futureRangeNotice) : null;
  const shouldRenderAnimatedSections = activeTab === 'ranking' || hasVisitedRankingTab;
  const matchChildren = (
    <Suspense
      fallback={(
        <Card className="relative p-4 mb-4 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md rounded-2xl">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin" />
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
              <Loader2 className="h-4 w-4 animate-spin" />
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
          <Loader2 className="h-4 w-4 animate-spin" />
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
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-200/70 shadow-[0_0_12px_rgba(16,185,129,0.2)] dark:bg-emerald-400/15 dark:border-emerald-400/30 dark:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <LineChart className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-gray-100">전력분석실</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Leaderboard Link */}
            <Link
              to="/leaderboard"
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition-colors hover:border-emerald-400/60 group dark:bg-card dark:border-border dark:hover:border-emerald-400/70 dark:shadow-md sm:px-3"
            >
              <Gamepad2 className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 dark:text-gray-300 dark:group-hover:text-emerald-300 transition-colors" />
              <span className="text-sm font-semibold text-slate-600 dark:text-gray-200 hidden sm:inline">랭킹</span>
            </Link>
            {isLoggedIn && (
              <div className="flex md:hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 shadow-sm dark:bg-emerald-900/40 dark:border-emerald-800/40 dark:shadow-md sm:px-3">
                <Coins className="w-4 h-4 text-emerald-700 fill-emerald-700 dark:text-emerald-200 dark:fill-emerald-200" />
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-100 tabular-nums sm:text-sm">
                  {userCheerPoints.toLocaleString()} P
                </span>
              </div>
            )}
          </div>
        </div>

        {/* AI Briefing moved into match card section */}

        {/* Seat View CTA */}
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

        {/* Tabs and Game Selection Container */}
        <div className="flex flex-col gap-2.5 mb-4 md:mb-5 md:flex-row md:items-center">
          {/* Mode Tabs (Left) */}
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
    </div >
  );
}
