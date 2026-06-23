import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MateListViewMode = 'grid' | 'list' | 'compact';

interface UIState {
  showWelcome: boolean;
  isNotificationOpen: boolean;
  mateListViewMode: MateListViewMode;
}

interface UIActions {
  setShowWelcome: (show: boolean) => void;
  setIsNotificationOpen: (open: boolean) => void;
  setMateListViewMode: (mode: MateListViewMode) => void;
  reset: () => void;
}

type UIStore = UIState & UIActions;

const getInitialState = (): UIState => ({
  showWelcome: true,
  isNotificationOpen: false,
  mateListViewMode: 'grid',
});

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...getInitialState(),

      setShowWelcome: (show) => set({ showWelcome: show }),
      setIsNotificationOpen: (open) => set({ isNotificationOpen: open }),
      setMateListViewMode: (mode) => set({ mateListViewMode: mode }),
      reset: () => set(getInitialState()),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        showWelcome: state.showWelcome,
        mateListViewMode: state.mateListViewMode,
      }),
    }
  )
);
