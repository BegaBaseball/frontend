import { useLayoutEffect, useRef } from 'react';

import { usePredictionVoteFlow } from '../../hooks/usePredictionVoteFlow';
import type { PredictionMatchVoteControllerProps } from './PredictionMatchVoteController';

export default function PredictionMatchVoteControllerRuntime({
  isAuthLoading,
  isLoggedIn,
  currentGameId,
  userVote,
  setUserVote,
  loadVoteStatus,
  reloadVoteStatus,
  emitFlowEvent,
  showPredictionErrorOverlay,
  confirm,
  pendingVoteAction,
  onPendingVoteHandled,
  children,
}: PredictionMatchVoteControllerProps) {
  const handledPendingVoteActionRef = useRef<number | null>(null);
  const voteFlow = usePredictionVoteFlow({
    isAuthLoading,
    isLoggedIn,
    currentGameId,
    userVote,
    setUserVote,
    loadVoteStatus,
    reloadVoteStatus,
    emitFlowEvent,
    showPredictionErrorOverlay,
    confirm,
  });

  useLayoutEffect(() => {
    if (!pendingVoteAction) {
      return;
    }

    if (handledPendingVoteActionRef.current === pendingVoteAction.requestId) {
      return;
    }

    handledPendingVoteActionRef.current = pendingVoteAction.requestId;
    onPendingVoteHandled(pendingVoteAction.requestId);
    void voteFlow.handleVote(
      pendingVoteAction.team,
      pendingVoteAction.game,
      pendingVoteAction.isVoteOpen,
    );
  }, [onPendingVoteHandled, pendingVoteAction, voteFlow]);

  return children(voteFlow);
}
