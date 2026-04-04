import { usePredictionInteractiveData } from './usePredictionInteractiveData';
import { usePredictionVoteFlow } from './usePredictionVoteFlow';

export const usePrediction = () => {
  const interactiveData = usePredictionInteractiveData();
  const currentGameId = interactiveData.currentGame?.gameId || null;
  const voteFlow = usePredictionVoteFlow({
    isAuthLoading: interactiveData.isAuthLoading,
    isLoggedIn: interactiveData.isLoggedIn,
    currentGameId,
    userVote: interactiveData.userVote,
    setUserVote: interactiveData.setUserVote,
    loadVoteStatus: interactiveData.loadVoteStatus,
    reloadVoteStatus: interactiveData.reloadVoteStatus,
    emitFlowEvent: interactiveData.emitFlowEvent,
    showPredictionErrorOverlay: interactiveData.showPredictionErrorOverlay,
    confirm: interactiveData.confirm,
  });

  return {
    ...interactiveData,
    handleVote: voteFlow.handleVote,
    isRunInProgress: voteFlow.isRunInProgress,
    isRunBannerDismissed: voteFlow.isRunBannerDismissed,
    runProgressMessage: voteFlow.runProgressMessage,
    runStartAt: voteFlow.runStartAt,
    dismissRunProgressBanner: voteFlow.dismissRunProgressBanner,
    resumeRunProgressBanner: voteFlow.resumeRunProgressBanner,
  };
};
