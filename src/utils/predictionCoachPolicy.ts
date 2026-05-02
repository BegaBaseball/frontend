export type CoachRequestMode = 'auto_brief' | 'manual_detail';

export interface CoachBriefingPolicyInput {
  hasSelectedGame?: boolean;
  canCallAI: boolean;
  isScheduledGame: boolean;
  isPostseasonGame?: boolean;
  isMeaningfulGame?: boolean;
  isCoachStateEnabledForAuto?: boolean;
}

export interface CoachBriefingPolicy {
  autoEnabled: boolean;
  forceManual: boolean;
  requestMode: CoachRequestMode;
}

export const resolveCoachBriefingPolicy = ({
  hasSelectedGame = true,
  canCallAI,
  isScheduledGame,
  isCoachStateEnabledForAuto = true,
}: CoachBriefingPolicyInput): CoachBriefingPolicy => {
  const autoEnabled = Boolean(
    hasSelectedGame
    && canCallAI
    && isCoachStateEnabledForAuto
  );

  return {
    autoEnabled,
    forceManual: Boolean(isScheduledGame && !autoEnabled),
    requestMode: autoEnabled ? 'auto_brief' : 'manual_detail',
  };
};
