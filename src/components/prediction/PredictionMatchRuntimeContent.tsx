import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { Card } from '../ui/card';
import { usePrediction } from '../../hooks/usePrediction';
import {
  buildPredictionRecoveryPath,
  type PredictionLocationState,
} from '../../utils/predictionDeepLink';
import { PredictionLoaderIcon } from './PredictionShellIcons';

const PredictionErrorOverlay = lazy(() => import('./PredictionErrorOverlay'));
const PredictionLoadingView = lazy(() => import('./PredictionLoadingView'));
const PredictionMatchesErrorView = lazy(() => import('./PredictionMatchesErrorView'));
const PredictionMatchTab = lazy(() => import('./PredictionMatchTab'));
const PredictionTopNotice = lazy(() => import('./PredictionTopNotice'));

type TopNoticeKind = 'RUN' | 'FUTURE' | 'ERROR' | 'END' | 'INFO';
type TopNotice = { kind: TopNoticeKind; content: JSX.Element };

export default function PredictionMatchRuntimeContent() {
  const {
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

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hasEnteredMatchDetail, setHasEnteredMatchDetail] = useState(false);
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

  const handleEnterMatchDetail = useCallback(() => {
    setHasEnteredMatchDetail(true);
  }, []);

  const shouldRenderMatchCard =
    (hasEnteredMatchDetail || isDeepLinkMatchSelection) && Boolean(currentGameId);
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
      return { date: previousCandidate.date, isPast: true };
    }

    if ((nextCandidate?.games.length || 0) > 0) {
      return { date: nextCandidate.date, isPast: false };
    }

    const previousKnownEmpty =
      previousCandidate !== null && previousCandidate.games.length === 0;
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
    matchBounds?.hasData &&
      earliestBoundaryDate &&
      allDatesData[0]?.date &&
      normalizeBoundaryDate(allDatesData[0].date) &&
      normalizeBoundaryDate(allDatesData[0].date)! > earliestBoundaryDate
  );
  const hasPastNavigation = canMovePrevDate || hasAdditionalPastMatches;
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
      currentDateIndex === allDatesData.length - 1 &&
      !canLoadMoreFuture &&
      !hasPastNavigation &&
      futureRangeLoadState === 'end'
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

  const sharedTopNotice: TopNotice | null = topNoticeKind
    ? {
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
      }
    : null;

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

  const matchChildren = (
    <Suspense
      fallback={
        <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-gray-300">
            <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
            경기 화면을 준비하고 있습니다.
          </div>
        </Card>
      }
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

  return (
    <div className="relative">
      {sharedTopNotice && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center sm:justify-end">
          {sharedTopNotice.content}
        </div>
      )}
      {matchChildren}
    </div>
  );
}
