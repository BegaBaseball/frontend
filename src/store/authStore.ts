import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  email: string;
  favoriteTeam?: string;
  favoriteTeamColor?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  email: string;
  password: string;
  showPassword: boolean;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setShowPassword: (show: boolean) => void;
  login: (email: string, password: string) => void;
  logout: () => void;
  setFavoriteTeam: (team: string, color: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      email: '',
      password: '',
      showPassword: false,
      setEmail: (email) => set({ email }),
      setPassword: (password) => set({ password }),
      setShowPassword: (show) => set({ showPassword: show }),
      login: (email, password) => {
        // 실제로는 API 호출
        set({
          user: { email },
          isAuthenticated: true,
          email: '',
          password: '',
        });
      },
      logout: () => set({ user: null, isAuthenticated: false }),
      setFavoriteTeam: (team, color) =>
        set((state) => ({
          user: state.user ? { ...state.user, favoriteTeam: team, favoriteTeamColor: color } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
