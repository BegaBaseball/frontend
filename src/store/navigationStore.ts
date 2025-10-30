import { create } from 'zustand';

export type ViewType = 'home' | 'login' | 'signup' | 'stadium' | 'diary' | 'prediction' | 'cheer' | 'cheerWrite' | 'cheerDetail' | 'cheerEdit' | 'mate' | 'mateCreate' | 'mateDetail' | 'mateApply' | 'mateCheckIn' | 'mateChat' | 'mateManage' | 'mypage';

interface NavigationState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  navigateToLogin: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),
  navigateToLogin: () => set({ currentView: 'login' }),
}));
