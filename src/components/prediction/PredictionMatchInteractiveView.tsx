import { lazy, Suspense, useCallback, useMemo, type ReactElement } from 'react';

import type { Game, GameDetail, VoteStatus, VoteTeam } from '../../types/prediction';
import { buildPredictionRecoveryPath } from '../../utils/predictionDeepLink';
import { Card } from '../ui/card';
import type { PredictionMatchVoteControllerRenderState } from './PredictionMatchVoteController';
import { PredictionLoaderIcon } from './PredictionShellIcons';

const PredictionErrorOverlay = lazy(() => import('./PredictionErrorOverlay'));
const PredictionLoadingView = lazy(() => import('./PredictionLoadingView'));
const PredictionMatchesErrorView = lazy(() => import('./PredictionMatchesErrorView'));
const PredictionMatchTab = lazy(() => import('./PredictionMatchTab'));
const PredictionTopNotice = lazy(() => import('./PredictionTopNotice'));

type TopNoticeKind = 'RUN' | 'FUTURE' | 'ERROR' | 'END' | 'INFO';
type TopNotice = { kind: TopNoticeKind; content: ReactElement };

type PredictionMatchInteractiveViewProps = {
  currentGame: Game | null;
  currentDateGames: Game[];
  currentDate: string;
  currentDayNavigationMeta: { prevDate: string | null; nextDate: string | null } | null;
  votes: Record<string, VoteStatus>;
  userVote: Record<string, VoteTeam | null>;
  currentGameDetail: GameDetail | null;
  currentGameDetailLoading: boolean;
  currentGameDetailRefreshing: boolean;
  isAuthLoading: boolean;
  allDatesData: Array<{ date: string; games: Game[] }>;
  currentDateIndex: number;
  currentGameDetailError: string | null;
  deepLinkNotice: string | null;
  voteStatusError: string | null;
  voteStatusLoading: boolean;
  isCurrentVotePartial: boolean;
  currentVotePartialReason: string | null;
  goToPreviousDate: () => void;
  goToNextDate: () => void;
  goToDate: (date: string) => Promise<void> | void;
  reloadMatches: () => void;
  isLoggedIn: boolean;
  matchesLoadState: 'idle' | 'ready' | 'error';
  matchesLoadErrorMessage: string | null;
  pastRangeLoadState: 'idle' | 'loading' | 'ready' | 'error' | 'end';
  pastRangeLoadErrorMessage: string | null;
  futureRangeLoadState: 'idle' | 'loading' | 'ready' | 'error' | 'end';
  futureRangeLoadErrorMessage: string | null;
  canLoadMorePast: boolean;
  canLoadMoreFuture: boolean;
  matchBounds: { hasData?: boolean; earliestGameDate?: string | null } | null;
  reloadCurrentVoteStatus: (options?: { source?: 'manual' | 'run' }) => void;
  reloadCurrentGameDetail: () => void;
  predictionErrorOverlay: {
    isOpen: boolean;
    title: string;
    message: string;
    errorCode: string;
    copyKey?: string | null;
    recoveryState: { actionPriorityOrder: string[] };
  } | null;
  handlePredictionErrorOverlayAction: (action: string) => void;
  closePredictionErrorOverlay: () => void;
  retryLoadMorePastMatches: () => void;
  retryLoadMoreFutureMatches: () => void;
  pendingVoteAction: unknown;
  loading: boolean;
  currentGameId?: string;
  voteControllerState?: PredictionMatchVoteControllerRenderState;
  onQueueVoteAction: (team: VoteTeam, game: Game, isVoteOpen: boolean) => void;
};

export default function PredictionMatchInteractiveView({
  currentGame,
  currentDateGames,
  currentDate,
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
  predictionErrorOverlay,
  handlePredictionErrorOverlayAction,
  closePredictionErrorOverlay,
  retryLoadMorePastMatches,
  retryLoadMoreFutureMatches,
  pendingVoteAction,
  loading,
  currentGameId,
  voteControllerState,
  onQueueVoteAction,
}: PredictionMatchInteractiveViewProps) {
  const predictionRecoveryPath = buildPredictionRecoveryPath({
    currentDate,
    currentGameId,
  });

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

    if (previousCandidate && previousCandidate.games.length > 0) {
      return { date: previousCandidate.date, isPast: true };
    }

    if (nextCandidate && nextCandidate.games.length > 0) {
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
    matchBounds?.hasData
      && earliestBoundaryDate
      && allDatesData[0]?.date
      && normalizeBoundaryDate(allDatesData[0].date)
      && normalizeBoundaryDate(allDatesData[0].date)! > earliestBoundaryDate
  );
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
          predictionRecoveryPath={predictionRecoveryPath}
          onReloadMatches={reloadMatches}
        />
      </Suspense>
    );
  }

  return (
    <div className="relative">
      {sharedTopNotice ? (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center sm:justify-end">
          {sharedTopNotice.content}
        </div>
      ) : null}
      <Suspense
        fallback={(
          <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
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
          shouldRenderMatchCard={Boolean(currentGameId)}
          isVoteActionLocked={Boolean(pendingVoteAction) || isRunInProgress}
          predictionRecoveryPath={predictionRecoveryPath}
          canMovePrevDate={canMovePrevDate}
          canMoveNextDate={canMoveNextDate}
          isDetailRetryLoading={currentGameDetailLoading || currentGameDetailRefreshing}
          nearestNavigationDate={nearestNavigationDate}
          isToday={new Date(currentDate).toDateString() === new Date().toDateString()}
          onVote={(team, game, isVoteOpen) => {
            if (pendingVoteAction) {
              return;
            }

            if (voteControllerState) {
              void voteControllerState.handleVote(team, game, isVoteOpen);
              return;
            }

            onQueueVoteAction(team, game, isVoteOpen);
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
