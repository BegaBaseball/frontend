import { useLayoutEffect, useRef } from 'react';
import type { Dispatch, ReactElement, SetStateAction } from 'react';

import { usePredictionVoteFlow } from '../../hooks/usePredictionVoteFlow';
import type {
  LoadVoteStatusOptions,
  PredictionFlowEmitter,
  PredictionOverlayController,
  UserVoteRecord,
} from '../../hooks/predictionHookShared';
import type { Game, VoteTeam } from '../../types/prediction';

export type PredictionPendingVoteAction = {
  requestId: number;
  team: VoteTeam;
  game: Game;
  isVoteOpen: boolean;
};

export type PredictionMatchVoteControllerRenderState = Pick<
  ReturnType<typeof usePredictionVoteFlow>,
  | 'handleVote'
  | 'isRunInProgress'
  | 'isRunBannerDismissed'
  | 'runProgressMessage'
  | 'dismissRunProgressBanner'
  | 'resumeRunProgressBanner'
>;

type PredictionMatchVoteControllerProps = {
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  currentGameId: string | null;
  userVote: UserVoteRecord;
  setUserVote: Dispatch<SetStateAction<UserVoteRecord>>;
  loadVoteStatus: (gameId: string, options?: LoadVoteStatusOptions) => Promise<boolean>;
  reloadVoteStatus: (gameId: string, options?: LoadVoteStatusOptions) => Promise<boolean>;
  emitFlowEvent: PredictionFlowEmitter;
  showPredictionErrorOverlay: PredictionOverlayController['showPredictionErrorOverlay'];
  confirm: (options: { title: string; description?: string }) => Promise<boolean>;
  pendingVoteAction: PredictionPendingVoteAction | null;
  onPendingVoteHandled: (requestId: number) => void;
  children: (state: PredictionMatchVoteControllerRenderState) => ReactElement;
};

export default function PredictionMatchVoteController({
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
