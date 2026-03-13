import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
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
  type PowerupInventory,
} from '../api/leaderboard';
import { useLeaderboardStore } from '../store/leaderboardStore';
import type { TickerMessage } from '../components/retro/NewsTicker';

// ============================================
// MAIN HOOK
// ============================================

type UseLeaderboardOptions = {
  includeMyRank?: boolean;
};

export function useLeaderboard(
  type: LeaderboardType = 'season',
  page: number = 0,
  size: number = 20,
  options: UseLeaderboardOptions = {}
) {
  const { includeMyRank = true } = options;
  const queryClient = useQueryClient();

  // Fetch leaderboard
  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', type, page, size],
    queryFn: () => fetchLeaderboard(type, page, size),
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { stats: myRank } = useUserLeaderboardStats({ enabled: includeMyRank });

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
    myRank: myRank ?? null,

    // Hot streaks
    hotStreaks: hotStreaksQuery.data ?? [],

    // Ticker
    recentScores: recentScoresQuery.data ?? [],
    tickerMessages,

    // Loading states
    isLoading: leaderboardQuery.isLoading,
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
  const DEFAULT_POWERUPS: PowerupInventory = {
    MAGIC_BAT: 0,
    GOLDEN_GLOVE: 0,
    SCOUTER: 0,
  };

  // Fetch powerup inventory
  const inventoryQuery = useQuery({
    queryKey: ['powerups', 'inventory'],
    queryFn: fetchPowerups,
    staleTime: 60000,
  });

  // Fetch active powerups
  const activeQuery = useQuery({
    queryKey: ['powerups', 'active'],
    queryFn: fetchActivePowerups,
    staleTime: 30000,
  });

  // Use powerup mutation
  const usePowerupMutation = useMutation({
    mutationFn: ({ type, gameId }: { type: string; gameId?: string }) =>
      usePowerupApi(type, gameId),
    onSuccess: () => {
      // Keep server state as source of truth in React Query cache.
      queryClient.invalidateQueries({ queryKey: ['powerups'] });
    },
    onError: () => {
      // Refetch ensures local UI state returns to server truth on failure.
      queryClient.invalidateQueries({ queryKey: ['powerups'] });
    },
  });

  return {
    powerups: inventoryQuery.data ?? DEFAULT_POWERUPS,
    activePowerups: activeQuery.data?.map((p) => p.type) ?? [],
    isLoading: inventoryQuery.isLoading || activeQuery.isLoading,
    isUsingPowerup: usePowerupMutation.isPending,
    usePowerup: (type: string, gameId?: string) =>
      usePowerupMutation.mutateAsync({ type, gameId }),
  };
}

// ============================================
// COMBO EFFECT HOOK
// ============================================

export function useComboEffect() {
  const triggerCombo = useLeaderboardStore((state) => state.triggerCombo);
  const hideCombo = useLeaderboardStore((state) => state.hideCombo);
  const showComboAnimation = useLeaderboardStore((state) => state.showComboAnimation);
  const comboStreak = useLeaderboardStore((state) => state.comboStreak);
  const comboScore = useLeaderboardStore((state) => state.comboScore);

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

type UseUserLeaderboardStatsOptions = {
  enabled?: boolean;
};

export function useUserLeaderboardStats(options: UseUserLeaderboardStatsOptions = {}) {
  const { enabled = true } = options;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard', 'me'],
    queryFn: fetchMyRank,
    staleTime: 60000,
    enabled,
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
