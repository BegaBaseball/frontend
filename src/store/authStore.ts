import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import api from '../api/axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
// const MYPAGE_API_URL = `${API_BASE_URL}/auth/mypage`; // Not needed if using api.get('/auth/mypage')
const AUTH_COOKIE_NAME = 'Authorization';

interface User {
  id: number;
  email: string;
  name?: string;
  favoriteTeam?: string;
  favoriteTeamColor?: string;
  isAdmin?: boolean;
  profileImageUrl?: string;
  role?: string;
  provider?: string;    // 'LOCAL', 'GOOGLE', 'KAKAO', 'NAVER'
  providerId?: string;
  bio?: string | null;  // Added bio
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isAuthLoading: boolean;
  email: string;
  password: string;
  showPassword: boolean;
  showLoginRequiredDialog: boolean;

  fetchProfileAndAuthenticate: () => Promise<void>;
  setUserProfile: (profile: Omit<User, 'email'> & { email: string, name: string }) => void;

  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setShowPassword: (show: boolean) => void;
  login: (email: string, name: string, profileImageUrl?: string, role?: string, favoriteTeam?: string, id?: number) => void;
  logout: () => void;
  setFavoriteTeam: (team: string, color: string) => void;
  setShowLoginRequiredDialog: (show: boolean) => void;
  requireLogin: (callback?: () => void) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      isAdmin: false,
      isAuthLoading: false,
      email: '',
      password: '',
      showPassword: false,
      showLoginRequiredDialog: false,

      fetchProfileAndAuthenticate: async () => {
        set({ isAuthLoading: true });

        try {
          // Using axios api instance to handle 401 interceptor
          const response = await api.get('/auth/mypage');

          if (response.status === 200) {
            const result = response.data;
            const profile = result.data;
            const isAdminUser = profile.role === 'ROLE_ADMIN' || profile.role === 'ROLE_SUPER_ADMIN';

            set({
              user: {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                favoriteTeam: profile.favoriteTeam,
                favoriteTeamColor: profile.favoriteTeamColor,
                isAdmin: isAdminUser,
                profileImageUrl: profile.profileImageUrl,
                role: profile.role,
                bio: profile.bio,
              },
              isLoggedIn: true,
              isAdmin: isAdminUser,
              isAuthLoading: false,
            });

          } else {
            // Should be handled by catch mainly, but if 200 logic fails
            set({ isAuthLoading: false });
          }
        } catch (error) {
          // 401 errors are handled by interceptor (redirect to login)
          // For other errors during initial auth check, we just reset state silently to avoid modal on startup
          set({
            user: null,
            isLoggedIn: false,
            isAdmin: false,
            isAuthLoading: false
          });
        }
      },

      setUserProfile: (profile) => {
        set((state) => ({
          user: state.user ? {
            ...state.user,
            ...profile,
            name: profile.name,
            profileImageUrl: profile.profileImageUrl || state.user.profileImageUrl
          } : null,
        }));
      },

      login: (email, name, profileImageUrl, role, favoriteTeam, id) => {
        const isAdminUser = role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN';

        set({
          user: {
            id: id || 0,
            email: email,
            name: name,
            isAdmin: isAdminUser,
            profileImageUrl: profileImageUrl || 'https://placehold.co/100x100/374151/ffffff?text=User',
            role: role,
            favoriteTeam: favoriteTeam || '없음',
          },
          isLoggedIn: true,
          isAdmin: isAdminUser,
          isAuthLoading: false,
          email: '',
          password: '',
        });
      },

      logout: () => {
        api.post('/auth/logout'); // Global handler will catch errors if any

        set({
          user: null,
          isLoggedIn: false,
          isAdmin: false,
          isAuthLoading: false,
          email: '',
          password: ''
        });
      },

      setEmail: (email) => set({ email }),
      setPassword: (password) => set({ password }),
      setShowPassword: (show) => set({ showPassword: show }),
      setFavoriteTeam: (team, color) =>
        set((state) => ({
          user: state.user ? { ...state.user, favoriteTeam: team, favoriteTeamColor: color } : null,
        })),

      setShowLoginRequiredDialog: (show) => set({ showLoginRequiredDialog: show }),

      requireLogin: (callback) => {
        const { isLoggedIn } = get();
        if (!isLoggedIn) {
          set({ showLoginRequiredDialog: true });
          return false;
        }
        callback?.();
        return true;
      },

    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        isAdmin: state.isAdmin,
      }),
      onRehydrateStorage: () => (state: AuthState | undefined, error: unknown) => {
        return () => {
          if (state?.isLoggedIn) {
            state.fetchProfileAndAuthenticate();
          } else if (state) {
            state.isAuthLoading = false;
          }
        };
      },
    }
  )
);