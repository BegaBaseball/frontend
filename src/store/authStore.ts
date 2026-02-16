import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

interface User {
  id: number;
  email: string;
  name?: string;
  handle?: string;
  favoriteTeam?: string;
  favoriteTeamColor?: string;
  isAdmin?: boolean;
  profileImageUrl?: string | null;
  role?: string;
  provider?: string;    // 'LOCAL', 'GOOGLE', 'KAKAO', 'NAVER'
  providerId?: string;
  bio?: string | null;
  cheerPoints?: number; // Added cheerPoints
  hasPassword?: boolean;
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
  setUserProfile: (profile: Partial<Omit<User, 'id'>> & { email: string; name: string }) => void;
  deductCheerPoints: (amount: number) => void; // Added action

  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setShowPassword: (show: boolean) => void;
  login: (email: string, name: string, profileImageUrl?: string | null, role?: string, favoriteTeam?: string, id?: number, cheerPoints?: number, handle?: string, provider?: string, hasPassword?: boolean) => void;
  logout: () => void;
  setFavoriteTeam: (team: string, color: string) => void;
  setShowLoginRequiredDialog: (show: boolean) => void;
  requireLogin: (callback?: () => void) => boolean;
}

const normalizeProfileImageUrl = (value?: string | null) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

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
                handle: profile.handle,
                favoriteTeam: profile.favoriteTeam,
                favoriteTeamColor: profile.favoriteTeamColor,
                isAdmin: isAdminUser,
                profileImageUrl: normalizeProfileImageUrl(profile.profileImageUrl),
                role: profile.role,
                bio: profile.bio,
                cheerPoints: profile.cheerPoints ?? profile['cheer_points'] ?? 0, // Map cheerPoints (defensive check)
                provider: profile.provider,
                providerId: profile.providerId,
                hasPassword: profile.hasPassword,
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
        set((state) => {
          const mergedProfile = state.user
            ? {
              ...state.user,
              ...profile,
            }
            : null;

          if (!mergedProfile || !('profileImageUrl' in profile)) {
            return { user: mergedProfile };
          }

          return {
            user: {
              ...mergedProfile,
              profileImageUrl: normalizeProfileImageUrl(profile.profileImageUrl),
            },
          };
        });
      },

      deductCheerPoints: (amount) => {
        set((state) => {
          if (!state.user) return {};
          const currentPoints = state.user.cheerPoints || 0;
          return {
            user: {
              ...state.user,
              cheerPoints: Math.max(0, currentPoints - amount)
            }
          };
        });
      },

      login: (email, name, profileImageUrl, role, favoriteTeam, id, cheerPoints, handle, provider, hasPassword) => {
        const isAdminUser = role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN';

        set({
          user: {
            id: id || 0,
            email: email,
            name: name,
            // ... (keep existing)
            isAdmin: isAdminUser,
            profileImageUrl: normalizeProfileImageUrl(profileImageUrl),
            role: role,
            favoriteTeam: favoriteTeam || '없음',
            cheerPoints: cheerPoints || 0,
            handle: handle,
            provider: provider,
            hasPassword,
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
