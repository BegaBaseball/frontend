import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback, useEffect } from 'react';
import {
  fetchLeaderboard,
  fetchMyRank,
  fetchHotStreaks,
  fetchRecentScores,
  fetchPowerups,
  fetchActivePowerups,
  usePowerup as usePowerupApi,
  formatScoreEvent,
  type LeaderboardType,
  type LeaderboardEntry,
  type RecentScore,
} from '../api/leaderboard';
import { useLeaderboardStore } from '../store/leaderboardStore';
import type { TickerMessage } from '../components/retro/NewsTicker';

// ============================================
// MAIN HOOK
// ============================================

export function useLeaderboard(
  type: LeaderboardType = 'season',
  page: number = 0,
  size: number = 20
) {
  const queryClient = useQueryClient();
  const { setUserStats, setPowerups, setActivePowerups, cacheLeaderboard } = useLeaderboardStore();

  // Fetch leaderboard
  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', type, page, size],
    queryFn: () => fetchLeaderboard(type, page, size),
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Cache leaderboard data in store
  useEffect(() => {
    if (leaderboardQuery.data?.content) {
      cacheLeaderboard(type, leaderboardQuery.data.content);
    }
  }, [leaderboardQuery.data, type, cacheLeaderboard]);

  // Fetch current user's stats
  const myRankQuery = useQuery({
    queryKey: ['leaderboard', 'me'],
    queryFn: fetchMyRank,
    staleTime: 60000, // 1 minute
  });

  // Update store with user stats
  useEffect(() => {
    if (myRankQuery.data) {
      setUserStats(myRankQuery.data);
    }
  }, [myRankQuery.data, setUserStats]);

  // Fetch hot streaks
  const hotStreaksQuery = useQuery({
    queryKey: ['leaderboard', 'hot-streaks'],
    queryFn: () => fetchHotStreaks(10),
    staleTime: 30000,
  });

  // Fetch recent scores for ticker (with auto-refresh)
  const recentScoresQuery = useQuery({
    queryKey: ['leaderboard', 'recent-scores'],
    queryFn: () => fetchRecentScores(20),
    staleTime: 10000, // 10 seconds
    refetchInterval: 15000, // Refresh every 15 seconds for live feed
  });

  // Transform recent scores to ticker messages
  const tickerMessages: TickerMessage[] = useMemo(() => {
    if (!recentScoresQuery.data) return [];
    return recentScoresQuery.data.map(formatScoreEvent);
  }, [recentScoresQuery.data]);

  // Invalidate related queries
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  }, [queryClient]);

  return {
    // Leaderboard data
    leaderboard: leaderboardQuery.data?.content ?? [],
    totalPages: leaderboardQuery.data?.totalPages ?? 0,
    totalElements: leaderboardQuery.data?.totalElements ?? 0,

    // User data
    myRank: myRankQuery.data ?? null,

    // Hot streaks
    hotStreaks: hotStreaksQuery.data ?? [],

    // Ticker
    recentScores: recentScoresQuery.data ?? [],
    tickerMessages,

    // Loading states
    isLoading: leaderboardQuery.isLoading,
    isLoadingMyRank: myRankQuery.isLoading,
    isLoadingHotStreaks: hotStreaksQuery.isLoading,

    // Error states
    error: leaderboardQuery.error,

    // Actions
    refetch: leaderboardQuery.refetch,
    invalidateAll,
  };
}

// ============================================
// POWERUPS HOOK
// ============================================

export function usePowerups() {
  const queryClient = useQueryClient();
  const { setPowerups, setActivePowerups, usePowerup: usePowerupInStore } = useLeaderboardStore();

  // Fetch powerup inventory
  const inventoryQuery = useQuery({
    queryKey: ['powerups', 'inventory'],
    queryFn: fetchPowerups,
    staleTime: 60000,
  });

  // Update store with powerups
  useEffect(() => {
    if (inventoryQuery.data) {
      setPowerups(inventoryQuery.data);
    }
  }, [inventoryQuery.data, setPowerups]);

  // Fetch active powerups
  const activeQuery = useQuery({
    queryKey: ['powerups', 'active'],
    queryFn: fetchActivePowerups,
    staleTime: 30000,
  });

  // Update store with active powerups
  useEffect(() => {
    if (activeQuery.data) {
      setActivePowerups(activeQuery.data.map((p) => p.type));
    }
  }, [activeQuery.data, setActivePowerups]);

  // Use powerup mutation
  const usePowerupMutation = useMutation({
    mutationFn: ({ type, gameId }: { type: string; gameId?: string }) =>
      usePowerupApi(type, gameId),
    onSuccess: (data, variables) => {
      // Update local store optimistically
      usePowerupInStore(variables.type as 'MAGIC_BAT' | 'GOLDEN_GLOVE' | 'SCOUTER');

      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['powerups'] });
    },
  });

  return {
    powerups: inventoryQuery.data ?? { MAGIC_BAT: 0, GOLDEN_GLOVE: 0, SCOUTER: 0 },
    activePowerups: activeQuery.data?.map((p) => p.type) ?? [],
    isLoading: inventoryQuery.isLoading,
    isUsingPowerup: usePowerupMutation.isPending,
    usePowerup: (type: string, gameId?: string) =>
      usePowerupMutation.mutateAsync({ type, gameId }),
  };
}

// ============================================
// COMBO EFFECT HOOK
// ============================================

export function useComboEffect() {
  const { triggerCombo, hideCombo, showComboAnimation, comboStreak, comboScore } =
    useLeaderboardStore();

  return {
    showCombo: showComboAnimation,
    streak: comboStreak,
    score: comboScore,
    trigger: triggerCombo,
    hide: hideCombo,
  };
}

// ============================================
// USER STATS HOOK
// ============================================

export function useUserLeaderboardStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard', 'me'],
    queryFn: fetchMyRank,
    staleTime: 60000,
  });

  return {
    stats: data ?? null,
    isLoading,
    error,
    refetch,
  };
}

// ============================================
// HOT STREAKS HOOK
// ============================================

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

// ============================================
// RECENT SCORES / TICKER HOOK
// ============================================

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
