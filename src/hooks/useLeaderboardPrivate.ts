import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  fetchMyRank,
  fetchPowerups,
  fetchActivePowerups,
  usePowerup as usePowerupApi,
  type PowerupInventory,
} from '../api/leaderboard';

export function usePowerups() {
  const queryClient = useQueryClient();
  const DEFAULT_POWERUPS: PowerupInventory = {
    MAGIC_BAT: 0,
    GOLDEN_GLOVE: 0,
    SCOUTER: 0,
  };

  const inventoryQuery = useQuery({
    queryKey: ['powerups', 'inventory'],
    queryFn: fetchPowerups,
    staleTime: 60000,
  });

  const activeQuery = useQuery({
    queryKey: ['powerups', 'active'],
    queryFn: fetchActivePowerups,
    staleTime: 30000,
  });

  const usePowerupMutation = useMutation({
    mutationFn: ({ type, gameId }: { type: string; gameId?: string }) =>
      usePowerupApi(type, gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['powerups'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['powerups'] });
    },
  });

  const usePowerup = useCallback((type: string, gameId?: string) => (
    usePowerupMutation.mutateAsync({ type, gameId })
  ), [usePowerupMutation]);

  return {
    powerups: inventoryQuery.data ?? DEFAULT_POWERUPS,
    activePowerups: activeQuery.data?.map((powerup) => powerup.type) ?? [],
    isLoading: inventoryQuery.isLoading || activeQuery.isLoading,
    isUsingPowerup: usePowerupMutation.isPending,
    usePowerup,
  };
}

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
