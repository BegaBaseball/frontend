import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  showWelcome: boolean;
  isNotificationOpen: boolean;
}

interface UIActions {
  setShowWelcome: (show: boolean) => void;
  setIsNotificationOpen: (open: boolean) => void;
  reset: () => void;
}

type UIStore = UIState & UIActions;

const getInitialState = (): UIState => ({
  showWelcome: true,
  isNotificationOpen: false,
});

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...getInitialState(),

      setShowWelcome: (show) => set({ showWelcome: show }),
      setIsNotificationOpen: (open) => set({ isNotificationOpen: open }),
      reset: () => set(getInitialState()),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        showWelcome: state.showWelcome,
      }),
    }
  )
);
