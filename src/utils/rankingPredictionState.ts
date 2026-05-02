import { parseError } from './errorUtils';

export type RankingPredictionInitState = 'loading' | 'ready' | 'closed' | 'error';
export type RankingPredictionInitFailure = 'redirect-auth' | 'closed' | 'error';

export const resolveRankingPredictionInitFailure = (error: unknown): RankingPredictionInitFailure => {
  const parsed = parseError(error);

  if (parsed.type === 'AUTH') {
    return 'redirect-auth';
  }

  if (parsed.responseCode === 'RANKING_PREDICTION_CLOSED') {
    return 'closed';
  }

  return 'error';
};
