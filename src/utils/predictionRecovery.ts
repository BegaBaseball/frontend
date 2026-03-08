export const PREDICTION_NETWORK_RETRY_DELAYS_MS = [1000, 2000, 4000] as const;
export const PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS = PREDICTION_NETWORK_RETRY_DELAYS_MS.length;
export const PREDICTION_RUN_SESSION_TTL_MS = 120_000;
export const PREDICTION_RUN_SESSION_STORAGE_KEY = 'prediction:run-session:v1';

export type PredictionRetryActionKey = 'submitVote' | 'cancelVote' | 'voteStatus';
export type PredictionRunAction = 'vote' | 'cancel';
export type PredictionRunTimeoutStage = 'none' | 'warning' | 'fatal';
export type PredictionRetryAttemptState = Record<PredictionRetryActionKey, number>;

export interface PredictionRunSessionV1 {
  flowId: string;
  gameId: string;
  action: PredictionRunAction;
  startedAt: number;
  team?: 'home' | 'away';
  bannerDismissed: boolean;
  timeoutStage: PredictionRunTimeoutStage;
}

export const createPredictionRetryAttemptState = (): PredictionRetryAttemptState => ({
  submitVote: 0,
  cancelVote: 0,
  voteStatus: 0,
});

export const increasePredictionRetryAttempt = (
  state: PredictionRetryAttemptState,
  actionKey: PredictionRetryActionKey
): number => {
  const nextAttempt = state[actionKey] + 1;
  state[actionKey] = nextAttempt;
  return nextAttempt;
};

export const resetPredictionRetryAttempt = (
  state: PredictionRetryAttemptState,
  actionKey: PredictionRetryActionKey
) => {
  state[actionKey] = 0;
};

export const getPredictionRetryDelayMs = (attempt: number): number => {
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(1, Math.floor(attempt)) : 1;
  const index = Math.min(normalizedAttempt - 1, PREDICTION_NETWORK_RETRY_DELAYS_MS.length - 1);
  return PREDICTION_NETWORK_RETRY_DELAYS_MS[index];
};

export const canSchedulePredictionRetry = (
  nextRetryAttempt: number,
  maxAttempts: number = PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS
): boolean => {
  return nextRetryAttempt > 0 && nextRetryAttempt <= Math.max(1, maxAttempts);
};

export const hasExceededPredictionRetryLimit = (
  nextRetryAttempt: number,
  maxAttempts: number = PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS
): boolean => {
  return !canSchedulePredictionRetry(nextRetryAttempt, maxAttempts);
};

export const isPredictionRunSessionStale = (
  startedAt: number,
  nowMs: number = Date.now(),
  ttlMs: number = PREDICTION_RUN_SESSION_TTL_MS
): boolean => {
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return true;
  }
  const elapsed = nowMs - startedAt;
  if (!Number.isFinite(elapsed) || elapsed < 0) {
    return true;
  }
  return elapsed > ttlMs;
};

export const parsePredictionRunSession = (rawValue: string | null): PredictionRunSessionV1 | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PredictionRunSessionV1>;
    const hasValidAction = parsed.action === 'vote' || parsed.action === 'cancel';
    const hasValidTimeoutStage = parsed.timeoutStage === 'none'
      || parsed.timeoutStage === 'warning'
      || parsed.timeoutStage === 'fatal';
    const hasValidTeam = parsed.team == null || parsed.team === 'home' || parsed.team === 'away';

    if (
      typeof parsed.flowId !== 'string'
      || typeof parsed.gameId !== 'string'
      || !hasValidAction
      || typeof parsed.startedAt !== 'number'
      || typeof parsed.bannerDismissed !== 'boolean'
      || !hasValidTimeoutStage
      || !hasValidTeam
    ) {
      return null;
    }

    return {
      flowId: parsed.flowId,
      gameId: parsed.gameId,
      action: parsed.action,
      startedAt: parsed.startedAt,
      team: parsed.team,
      bannerDismissed: parsed.bannerDismissed,
      timeoutStage: parsed.timeoutStage,
    };
  } catch {
    return null;
  }
};
