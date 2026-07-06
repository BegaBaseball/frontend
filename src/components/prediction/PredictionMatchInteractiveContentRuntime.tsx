import { lazy, Suspense, useCallback, useMemo, type ReactElement } from 'react';

import type { Game, VoteTeam } from '../../types/prediction';
import { useTodayKey } from '../../hooks/useTodayKey';
import { buildPredictionRecoveryPath } from '../../utils/predictionDeepLink';
import {
  hasPredictionAdditionalPastMatches,
  resolvePredictionNearestNavigationDate,
} from '../../utils/predictionMatchNavigation';
import { formatDateKey, parseLocalDate } from '../../utils/currentDate';
import { Card } from '../ui/card';
import type { PredictionMatchVoteControllerRenderState } from './PredictionMatchVoteController';
import { PredictionLoaderIcon } from './PredictionShellIcons';
import type { PredictionMatchInteractiveViewProps } from './PredictionMatchInteractiveView';

const PredictionErrorOverlay = lazy(() => import('./PredictionErrorOverlay'));
const PredictionLoadingView = lazy(() => import('./PredictionLoadingView'));
const PredictionMatchesErrorView = lazy(() => import('./PredictionMatchesErrorView'));
const PredictionMatchTab = lazy(() => import('./PredictionMatchTab'));
const PredictionTopNotice = lazy(() => import('./PredictionTopNotice'));

type TopNoticeKind = 'RUN' | 'FUTURE' | 'ERROR' | 'END' | 'INFO';
type TopNotice = { kind: TopNoticeKind; content: ReactElement };

type PredictionMatchInteractiveContentRuntimeProps = Omit<
  PredictionMatchInteractiveViewProps,
  'onQueueVoteAction'
> & {
  effectiveVoteActionLocked: boolean;
  onVote: (team: VoteTeam, game: Game, isVoteOpen: boolean) => void;
};

export default function PredictionMatchInteractiveContentRuntime({
  currentGame,
  currentDateGames,
  currentDate,
  currentDayNavigationMeta,
  votes,
  userVote,
  currentUserVoteResolutionState,
  currentGameDetail,
  currentGameDetailLoading,
  currentGameDetailRefreshing,
  isAuthLoading,
  allDatesData,
  currentDateIndex,
  currentGameDetailError,
  currentGameDetailErrorCode,
  deepLinkNotice,
  voteStatusError,
  voteStatusLoading,
  isCurrentVotePartial,
  currentVotePartialReason,
  goToPreviousDate,
  goToNextDate,
  goToDate,
  reloadMatches,
  isLoggedIn,
  matchesLoadState,
  matchesLoadErrorMessage,
  matchesLoadErrorCode,
  pastRangeLoadState,
  pastRangeLoadErrorMessage,
  futureRangeLoadState,
  futureRangeLoadErrorMessage,
  canLoadMorePast,
  canLoadMoreFuture,
  matchBounds,
  reloadCurrentVoteStatus,
  reloadCurrentGameDetail,
  predictionErrorOverlay,
  handlePredictionErrorOverlayAction,
  closePredictionErrorOverlay,
  retryLoadMorePastMatches,
  retryLoadMoreFutureMatches,
  pendingVoteAction,
  loading,
  currentGameId,
  voteControllerState,
  effectiveVoteActionLocked,
  onVote,
}: PredictionMatchInteractiveContentRuntimeProps) {
  const todayKey = useTodayKey();
  const predictionRecoveryPath = buildPredictionRecoveryPath({
    currentDate,
    currentGameId,
  });

  const canMovePrevDate = currentDateIndex > 0 || canLoadMorePast;
  const canMoveNextDate = currentDateIndex < allDatesData.length - 1 || canLoadMoreFuture;

  const nearestNavigationDate = useMemo(
    () => resolvePredictionNearestNavigationDate(allDatesData, currentDayNavigationMeta),
    [allDatesData, currentDayNavigationMeta],
  );

  const handleNearestNavigation = useCallback(() => {
    if (!nearestNavigationDate) {
      return;
    }

    void goToDate(nearestNavigationDate.date);
  }, [goToDate, nearestNavigationDate]);

  const hasAdditionalPastMatches = hasPredictionAdditionalPastMatches(matchBounds, allDatesData);
  const hasPastNavigation = canMovePrevDate || hasAdditionalPastMatches;
  const isFutureRangeLoading = futureRangeLoadState === 'loading';
  const isFutureRangeError = futureRangeLoadState === 'error';
  const isRunInProgress = voteControllerState?.isRunInProgress ?? false;
  const isRunBannerDismissed = voteControllerState?.isRunBannerDismissed ?? false;
  const runProgressMessage = voteControllerState?.runProgressMessage ?? null;
  const showRunProgressBanner = isRunInProgress && !isRunBannerDismissed;

  const topNoticeKind = (() => {
    if (showRunProgressBanner) {
      return 'RUN';
    }

    if (deepLinkNotice) {
      return 'INFO';
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

    return null;
  })();

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
              onDismissRunProgressBanner={() => {
                voteControllerState?.dismissRunProgressBanner();
              }}
              onResumeRunProgressBanner={() => {
                voteControllerState?.resumeRunProgressBanner();
              }}
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
          matchesLoadErrorCode={matchesLoadErrorCode}
          predictionRecoveryPath={predictionRecoveryPath}
          onReloadMatches={reloadMatches}
        />
      </Suspense>
    );
  }

  return (
    <div className="relative font-sans">
      {sharedTopNotice ? (
        <div className="mb-3 flex min-w-0 justify-center overflow-hidden px-4 sm:justify-end sm:px-0">
          {sharedTopNotice.content}
        </div>
      ) : null}
      <Suspense
        fallback={(
          <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
            <div className="inline-flex items-center gap-2 text-body text-slate-500 dark:text-white">
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
          currentGameDetailErrorCode={currentGameDetailErrorCode}
          userVote={userVote}
          currentUserVoteResolutionState={currentUserVoteResolutionState}
          votes={votes}
          isLoggedIn={isLoggedIn}
          isAuthLoading={isAuthLoading}
          shouldRenderMatchCard={Boolean(currentGameId)}
          isVoteActionLocked={effectiveVoteActionLocked}
          predictionRecoveryPath={predictionRecoveryPath}
          canMovePrevDate={canMovePrevDate}
          canMoveNextDate={canMoveNextDate}
          isDetailRetryLoading={currentGameDetailLoading || currentGameDetailRefreshing}
          nearestNavigationDate={nearestNavigationDate}
          isToday={formatDateKey(parseLocalDate(currentDate)) === todayKey}
          onVote={(team, game, isVoteOpen) => {
            onVote(team, game, isVoteOpen);
          }}
          onPrevDate={goToPreviousDate}
          onNextDate={goToNextDate}
          onNearestNavigation={handleNearestNavigation}
          reloadCurrentGameDetail={reloadCurrentGameDetail}
        />
      </Suspense>
    </div>
  );
}
