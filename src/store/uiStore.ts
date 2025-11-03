import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  showWelcome: boolean;
  isChatBotOpen: boolean;
  isNotificationOpen: boolean;
  setShowWelcome: (show: boolean) => void;
  setIsChatBotOpen: (open: boolean) => void;
  setIsNotificationOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      showWelcome: true,
      isChatBotOpen: false,
      isNotificationOpen: false,
      setShowWelcome: (show) => set({ showWelcome: show }),
      setIsChatBotOpen: (open) => set({ isChatBotOpen: open }),
      setIsNotificationOpen: (open) => set({ isNotificationOpen: open }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        showWelcome: state.showWelcome,
      }),
    }
  )
);
