import { create } from 'zustand';

interface LeaderboardState {
  // UI state
  showComboAnimation: boolean;
  comboStreak: number;
  comboScore: number;
}

interface LeaderboardActions {
  triggerCombo: (streak: number, score?: number) => void;
  hideCombo: () => void;
  reset: () => void;
}

type LeaderboardStore = LeaderboardState & LeaderboardActions;

const getInitialState = (): LeaderboardState => ({
  showComboAnimation: false,
  comboStreak: 0,
  comboScore: 0,
});

export const useLeaderboardStore = create<LeaderboardStore>((set) => ({
  ...getInitialState(),

  triggerCombo: (streak, score) => {
    set({
      showComboAnimation: true,
      comboStreak: streak,
      comboScore: score || 0,
    });
  },

  hideCombo: () =>
    set({
      showComboAnimation: false,
      comboStreak: 0,
      comboScore: 0,
    }),

  reset: () =>
    set(getInitialState()),
}));
