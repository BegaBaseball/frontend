import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import {
  fetchLeaderboard,
  fetchHotStreaks,
  fetchRecentScores,
  formatScoreEvent,
  type LeaderboardType,
} from '../api/leaderboardPublic';
import type { TickerMessage } from '../components/retro/NewsTicker';

export function useLeaderboard(
  type: LeaderboardType = 'season',
  page: number = 0,
  size: number = 20,
) {
  const queryClient = useQueryClient();

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', type, page, size],
    queryFn: () => fetchLeaderboard(type, page, size),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const hotStreaksQuery = useQuery({
    queryKey: ['leaderboard', 'hot-streaks'],
    queryFn: () => fetchHotStreaks(10),
    staleTime: 30000,
  });

  const recentScoresQuery = useQuery({
    queryKey: ['leaderboard', 'recent-scores'],
    queryFn: () => fetchRecentScores(20),
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const tickerMessages: TickerMessage[] = useMemo(() => {
    if (!recentScoresQuery.data) return [];
    return recentScoresQuery.data.map(formatScoreEvent);
  }, [recentScoresQuery.data]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  }, [queryClient]);

  return {
    leaderboard: leaderboardQuery.data?.content ?? [],
    totalPages: leaderboardQuery.data?.totalPages ?? 0,
    totalElements: leaderboardQuery.data?.totalElements ?? 0,
    hotStreaks: hotStreaksQuery.data ?? [],
    recentScores: recentScoresQuery.data ?? [],
    tickerMessages,
    isLoading: leaderboardQuery.isLoading,
    isLoadingHotStreaks: hotStreaksQuery.isLoading,
    error: leaderboardQuery.error,
    refetch: leaderboardQuery.refetch,
    invalidateAll,
  };
}

export function useHotStreaks(limit: number = 10) {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', 'hot-streaks', limit],
    queryFn: () => fetchHotStreaks(limit),
    staleTime: 30000,
  });

  return {
    hotStreaks: data ?? [],
    isLoading,
  };
}

export function useRecentScores(limit: number = 20, autoRefresh: boolean = true) {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', 'recent-scores', limit],
    queryFn: () => fetchRecentScores(limit),
    staleTime: 10000,
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const tickerMessages: TickerMessage[] = useMemo(() => {
    if (!data) return [];
    return data.map(formatScoreEvent);
  }, [data]);

  return {
    recentScores: data ?? [],
    tickerMessages,
    isLoading,
  };
}
