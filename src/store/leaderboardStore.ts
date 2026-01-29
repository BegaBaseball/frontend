import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LeaderboardEntry, UserLeaderboardStats, PowerupInventory } from '../api/leaderboard';

interface LeaderboardState {
  // User stats
  userStats: UserLeaderboardStats | null;
  currentStreak: number;
  level: number;
  totalScore: number;

  // Powerups
  powerups: PowerupInventory;
  activePowerups: string[];

  // UI state
  showComboAnimation: boolean;
  comboStreak: number;
  comboScore: number;

  // Cache
  leaderboardCache: {
    season?: LeaderboardEntry[];
    monthly?: LeaderboardEntry[];
    weekly?: LeaderboardEntry[];
  };

  // Actions
  setUserStats: (stats: UserLeaderboardStats) => void;
  updateStreak: (streak: number) => void;
  setPowerups: (powerups: PowerupInventory) => void;
  setActivePowerups: (active: string[]) => void;
  usePowerup: (type: keyof PowerupInventory) => void;
  triggerCombo: (streak: number, score?: number) => void;
  hideCombo: () => void;
  cacheLeaderboard: (type: 'season' | 'monthly' | 'weekly', data: LeaderboardEntry[]) => void;
  clearCache: () => void;
  reset: () => void;
}

const initialPowerups: PowerupInventory = {
  MAGIC_BAT: 0,
  GOLDEN_GLOVE: 0,
  SCOUTER: 0,
};

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set, get) => ({
      // Initial state
      userStats: null,
      currentStreak: 0,
      level: 1,
      totalScore: 0,
      powerups: initialPowerups,
      activePowerups: [],
      showComboAnimation: false,
      comboStreak: 0,
      comboScore: 0,
      leaderboardCache: {},

      // Actions
      setUserStats: (stats) =>
        set({
          userStats: stats,
          currentStreak: stats.currentStreak,
          level: stats.level,
          totalScore: stats.totalScore,
        }),

      updateStreak: (streak) =>
        set({ currentStreak: streak }),

      setPowerups: (powerups) =>
        set({ powerups }),

      setActivePowerups: (active) =>
        set({ activePowerups: active }),

      usePowerup: (type) =>
        set((state) => ({
          powerups: {
            ...state.powerups,
            [type]: Math.max(0, state.powerups[type] - 1),
          },
          activePowerups: [...state.activePowerups, type],
        })),

      triggerCombo: (streak, score) => {
        set({
          showComboAnimation: true,
          comboStreak: streak,
          comboScore: score || 0,
        });

        // Also dispatch global event for ComboAnimation component
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('combo-animation', {
              detail: { streak, score },
            })
          );
        }

        // Auto-hide after delay
        setTimeout(() => {
          set({ showComboAnimation: false });
        }, 2500);
      },

      hideCombo: () =>
        set({ showComboAnimation: false }),

      cacheLeaderboard: (type, data) =>
        set((state) => ({
          leaderboardCache: {
            ...state.leaderboardCache,
            [type]: data,
          },
        })),

      clearCache: () =>
        set({ leaderboardCache: {} }),

      reset: () =>
        set({
          userStats: null,
          currentStreak: 0,
          level: 1,
          totalScore: 0,
          powerups: initialPowerups,
          activePowerups: [],
          showComboAnimation: false,
          comboStreak: 0,
          comboScore: 0,
          leaderboardCache: {},
        }),
    }),
    {
      name: 'kbo-leaderboard-storage',
      partialize: (state) => ({
        // Only persist essential data, not cache or animation state
        currentStreak: state.currentStreak,
        level: state.level,
        totalScore: state.totalScore,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useUserStats = () => useLeaderboardStore((state) => state.userStats);
export const useCurrentStreak = () => useLeaderboardStore((state) => state.currentStreak);
export const useLevel = () => useLeaderboardStore((state) => state.level);
export const usePowerups = () => useLeaderboardStore((state) => state.powerups);
export const useActivePowerups = () => useLeaderboardStore((state) => state.activePowerups);
