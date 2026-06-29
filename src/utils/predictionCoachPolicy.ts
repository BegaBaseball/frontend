export type CoachRequestMode = 'auto_brief' | 'manual_detail';
export type CoachAnalysisType = 'game_review' | 'game_preview';

export interface CoachBriefingPolicyInput {
  hasSelectedGame?: boolean;
  canCallAI: boolean;
  isScheduledGame: boolean;
  isCompletedGame?: boolean;
  gameStatusBucket?: string | null;
  isPostseasonGame?: boolean;
  isMeaningfulGame?: boolean;
  isCoachStateEnabledForAuto?: boolean;
}

export interface CoachBriefingPolicy {
  autoEnabled: boolean;
  forceManual: boolean;
  requestMode: CoachRequestMode;
  analysisType: CoachAnalysisType;
}

export interface CoachAutoBriefingSourceReadyInput {
  game?: {
    gameId?: string | null;
    gameDate?: string | null;
    homeTeam?: string | null;
    awayTeam?: string | null;
  } | null;
  gameDetail?: {
    gameId?: string | null;
  } | null;
  analysisType: CoachAnalysisType;
}

const COMPLETED_STATUS_BUCKETS = new Set([
  'COMPLETED',
  'FINAL',
  'FINISHED',
  'DONE',
  'END',
  'DRAW',
  'TIE',
]);

export const resolveCoachAnalysisType = ({
  isCompletedGame = false,
  gameStatusBucket,
}: {
  isCompletedGame?: boolean;
  gameStatusBucket?: string | null;
}): CoachAnalysisType => {
  const normalizedStatus = String(gameStatusBucket || '').trim().toUpperCase();
  return isCompletedGame || COMPLETED_STATUS_BUCKETS.has(normalizedStatus)
    ? 'game_review'
    : 'game_preview';
};

export const resolveCoachBriefingPolicy = ({
  hasSelectedGame = true,
  canCallAI,
  isScheduledGame,
  isCompletedGame = false,
  gameStatusBucket,
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
    analysisType: resolveCoachAnalysisType({
      isCompletedGame,
      gameStatusBucket,
    }),
  };
};

const normalizeCoachAutoBriefingText = (value?: string | null): string => (
  typeof value === 'string' ? value.trim() : ''
);

export const isCoachAutoBriefingSourceReady = ({
  game,
  gameDetail,
  analysisType,
}: CoachAutoBriefingSourceReadyInput): boolean => {
  const gameId = normalizeCoachAutoBriefingText(game?.gameId);
  if (!gameId) {
    return false;
  }

  if (normalizeCoachAutoBriefingText(gameDetail?.gameId) === gameId) {
    return true;
  }

  if (analysisType !== 'game_preview') {
    return false;
  }

  return Boolean(
    normalizeCoachAutoBriefingText(game?.gameDate)
    && normalizeCoachAutoBriefingText(game?.homeTeam)
    && normalizeCoachAutoBriefingText(game?.awayTeam)
  );
};
