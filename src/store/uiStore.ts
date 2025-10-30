import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  showWelcome: boolean;
  isChatBotOpen: boolean;
  setShowWelcome: (show: boolean) => void;
  setIsChatBotOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      showWelcome: true,
      isChatBotOpen: false,
      setShowWelcome: (show) => set({ showWelcome: show }),
      setIsChatBotOpen: (open) => set({ isChatBotOpen: open }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        showWelcome: state.showWelcome,
      }),
    }
  )
);
