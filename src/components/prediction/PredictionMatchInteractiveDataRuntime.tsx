import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { usePredictionInteractiveData } from '../../hooks/usePredictionInteractiveData';
import {
  PREDICTION_RUN_SESSION_EVENT,
  hasPredictionRunSession,
} from '../../utils/predictionRecovery';
import type { Game, VoteTeam } from '../../types/prediction';
import type {
  PredictionMatchVoteControllerRenderState,
  PredictionPendingVoteAction,
} from './PredictionMatchVoteController';

const PredictionMatchInteractiveView = lazy(() => import('./PredictionMatchInteractiveView'));
const PredictionMatchVoteController = lazy(() => import('./PredictionMatchVoteController'));

export default function PredictionMatchInteractiveDataRuntime() {
  const {
    currentGame,
    currentDateGames,
    currentDate,
    loading,
    currentDayNavigationMeta,
    votes,
    userVote,
    setUserVote,
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
    loadVoteStatus,
    reloadVoteStatus,
    reloadCurrentVoteStatus,
    reloadCurrentGameDetail,
    predictionErrorOverlay,
    handlePredictionErrorOverlayAction,
    closePredictionErrorOverlay,
    retryLoadMorePastMatches,
    retryLoadMoreFutureMatches,
    emitFlowEvent,
    showPredictionErrorOverlay,
    confirm,
  } = usePredictionInteractiveData();

  const pendingVoteActionIdRef = useRef(0);
  const pendingVoteQueueLockRef = useRef(false);
  const [isVoteControllerEnabled, setIsVoteControllerEnabled] = useState(() => hasPredictionRunSession());
  const [isPendingVoteQueueLocked, setIsPendingVoteQueueLocked] = useState(false);
  const [pendingVoteAction, setPendingVoteAction] = useState<PredictionPendingVoteAction | null>(null);

  useEffect(() => {
    const enableVoteControllerIfRunSessionExists = () => {
      if (hasPredictionRunSession()) {
        setIsVoteControllerEnabled(true);
      }
    };

    enableVoteControllerIfRunSessionExists();

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handlePageShow = () => {
      enableVoteControllerIfRunSessionExists();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        enableVoteControllerIfRunSessionExists();
      }
    };
    const handleRunSessionUpdated = () => {
      enableVoteControllerIfRunSessionExists();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener(PREDICTION_RUN_SESSION_EVENT, handleRunSessionUpdated);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener(PREDICTION_RUN_SESSION_EVENT, handleRunSessionUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const currentGameId = currentGame?.gameId;

  const queueVoteAction = useCallback((team: VoteTeam, game: Game, isVoteOpen: boolean) => {
    if (pendingVoteQueueLockRef.current) {
      return;
    }

    pendingVoteQueueLockRef.current = true;
    setIsPendingVoteQueueLocked(true);
    setIsVoteControllerEnabled(true);
    pendingVoteActionIdRef.current += 1;
    setPendingVoteAction({
      requestId: pendingVoteActionIdRef.current,
      team,
      game,
      isVoteOpen,
    });
  }, []);

  const handlePendingVoteHandled = useCallback((requestId: number) => {
    pendingVoteQueueLockRef.current = false;
    setIsPendingVoteQueueLocked(false);
    setPendingVoteAction((current) => (current?.requestId === requestId ? null : current));
  }, []);

  const renderInteractiveMatchContent = useCallback((
    voteControllerState?: PredictionMatchVoteControllerRenderState,
  ) => (
    <Suspense fallback={null}>
      <PredictionMatchInteractiveView
        currentGame={currentGame}
        currentDateGames={currentDateGames}
        currentDate={currentDate}
        currentDayNavigationMeta={currentDayNavigationMeta}
        votes={votes}
        userVote={userVote}
        currentGameDetail={currentGameDetail}
        currentGameDetailLoading={currentGameDetailLoading}
        currentGameDetailRefreshing={currentGameDetailRefreshing}
        isAuthLoading={isAuthLoading}
        allDatesData={allDatesData}
        currentDateIndex={currentDateIndex}
        currentGameDetailError={currentGameDetailError}
        deepLinkNotice={deepLinkNotice}
        voteStatusError={voteStatusError}
        voteStatusLoading={voteStatusLoading}
        isCurrentVotePartial={isCurrentVotePartial}
        currentVotePartialReason={currentVotePartialReason}
        goToPreviousDate={goToPreviousDate}
        goToNextDate={goToNextDate}
        goToDate={goToDate}
        reloadMatches={reloadMatches}
        isLoggedIn={isLoggedIn}
        matchesLoadState={matchesLoadState}
        matchesLoadErrorMessage={matchesLoadErrorMessage}
        pastRangeLoadState={pastRangeLoadState}
        pastRangeLoadErrorMessage={pastRangeLoadErrorMessage}
        futureRangeLoadState={futureRangeLoadState}
        futureRangeLoadErrorMessage={futureRangeLoadErrorMessage}
        canLoadMorePast={canLoadMorePast}
        canLoadMoreFuture={canLoadMoreFuture}
        matchBounds={matchBounds}
        reloadCurrentVoteStatus={reloadCurrentVoteStatus}
        reloadCurrentGameDetail={reloadCurrentGameDetail}
        predictionErrorOverlay={predictionErrorOverlay}
        handlePredictionErrorOverlayAction={handlePredictionErrorOverlayAction}
        closePredictionErrorOverlay={closePredictionErrorOverlay}
        retryLoadMorePastMatches={retryLoadMorePastMatches}
        retryLoadMoreFutureMatches={retryLoadMoreFutureMatches}
        pendingVoteAction={pendingVoteAction}
        isQueueVoteLocked={isPendingVoteQueueLocked}
        loading={loading}
        currentGameId={currentGameId}
        voteControllerState={voteControllerState}
        onQueueVoteAction={queueVoteAction}
      />
    </Suspense>
  ), [
    allDatesData,
    canLoadMoreFuture,
    canLoadMorePast,
    closePredictionErrorOverlay,
    currentDate,
    currentDateGames,
    currentDateIndex,
    currentDayNavigationMeta,
    currentGame,
    currentGameDetail,
    currentGameDetailError,
    currentGameDetailLoading,
    currentGameDetailRefreshing,
    currentGameId,
    currentVotePartialReason,
    deepLinkNotice,
    futureRangeLoadErrorMessage,
    futureRangeLoadState,
    goToDate,
    goToNextDate,
    goToPreviousDate,
    handlePredictionErrorOverlayAction,
    isAuthLoading,
    isCurrentVotePartial,
    isLoggedIn,
    loading,
    matchBounds,
    matchesLoadErrorMessage,
    matchesLoadState,
    pastRangeLoadErrorMessage,
    pastRangeLoadState,
    pendingVoteAction,
    isPendingVoteQueueLocked,
    predictionErrorOverlay,
    queueVoteAction,
    reloadCurrentGameDetail,
    reloadCurrentVoteStatus,
    reloadMatches,
    retryLoadMoreFutureMatches,
    retryLoadMorePastMatches,
    userVote,
    voteStatusError,
    voteStatusLoading,
    votes,
  ]);

  if (!isVoteControllerEnabled) {
    return (
      <div className="font-sans">
        {renderInteractiveMatchContent()}
      </div>
    );
  }

  return (
    <div className="font-sans">
      <Suspense fallback={renderInteractiveMatchContent()}>
        <PredictionMatchVoteController
          isAuthLoading={isAuthLoading}
          isLoggedIn={isLoggedIn}
          currentGameId={currentGameId || null}
          userVote={userVote}
          setUserVote={setUserVote}
          loadVoteStatus={loadVoteStatus}
          reloadVoteStatus={reloadVoteStatus}
          emitFlowEvent={emitFlowEvent}
          showPredictionErrorOverlay={showPredictionErrorOverlay}
          confirm={confirm}
          pendingVoteAction={pendingVoteAction}
          onPendingVoteHandled={handlePendingVoteHandled}
        >
          {(voteControllerState) => renderInteractiveMatchContent(voteControllerState)}
        </PredictionMatchVoteController>
      </Suspense>
    </div>
  );
}
