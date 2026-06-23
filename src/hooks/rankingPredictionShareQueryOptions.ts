import { fetchSharedPrediction } from '../api/rankingPublic';

export const getRankingPredictionShareQueryOptions = (
  shareId?: string,
  seasonYear?: string,
) => ({
  queryKey: ['ranking-prediction-share', shareId ?? null, seasonYear ?? null] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchSharedPrediction(
    shareId ?? '',
    seasonYear ?? '',
    { signal },
  ),
  enabled: Boolean(shareId && seasonYear),
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  retry: false,
} as const);
