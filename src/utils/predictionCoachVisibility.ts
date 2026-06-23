export interface PredictionCoachBriefingVisibilityInput {
  gameDetailLoading?: boolean;
  isPostponedOrCancelled?: boolean;
  gameDetailErrorCode?: string | null;
}

export const shouldRenderPredictionCoachBriefing = ({
  gameDetailLoading = false,
  isPostponedOrCancelled = false,
}: PredictionCoachBriefingVisibilityInput): boolean => {
  return !gameDetailLoading && !isPostponedOrCancelled;
};
