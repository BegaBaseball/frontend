import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { clearSessionScopedQueries } from '../lib/queryClient';
import * as authApi from '../api/auth';
import { setPersistedAuthBootstrapHint } from '../utils/authBootstrap';
import {
  clearStoredLoginRedirect,
  getCurrentRelativeUrl,
  sanitizeLoginRedirect,
  setStoredLoginRedirect,
} from '../utils/loginRedirect';

const LEGACY_AUTH_TOKEN_KEY = 'authToken';

const clearLegacyAuthTokenStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  } catch {
    // 스토리지 접근 실패는 보안 정합성 검증에서 제외하고 진행합니다.
  }
};

clearLegacyAuthTokenStorage();

const extractHttpStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('response' in (error as Record<string, unknown>))) {
    return undefined;
  }

  const response = (error as { response?: { status?: number } }).response;
  return response && typeof response.status === 'number' ? response.status : undefined;
};

const shouldKeepBootstrapHintOnError = (error: unknown): boolean => {
  const status = extractHttpStatus(error);
  return status === undefined || status >= 500;
};

export const authStoreApi = {
  fetchCurrentUserProfile: authApi.fetchCurrentUserProfile,
  logoutUser: authApi.logoutUser,
  normalizeProfileImageUrl: authApi.normalizeProfileImageUrl,
};

interface User {
  id: number;
  email: string;
  name?: string;
  handle?: string;
  favoriteTeam?: string;
  favoriteTeamColor?: string;
  profileImageUrl?: string | null;
  role?: string;
  provider?: string;    // 'LOCAL', 'GOOGLE', 'KAKAO', 'NAVER'
  providerId?: string;
  bio?: string | null;
  cheerPoints?: number; // Added cheerPoints
  hasPassword?: boolean;
}

export const isAdminRole = (role?: string): boolean =>
  role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN';

export const isLoggedInUser = (user: User | null): boolean => Boolean(user);

interface AuthState {
  user: User | null;
  isAuthLoading: boolean;
  showLoginRequiredDialog: boolean;
  pendingLoginRedirect: string | null;
}

interface AuthActions {
  fetchProfileAndAuthenticate: () => Promise<boolean>;
  setUserProfile: (profile: Partial<Omit<User, 'id'>> & { email: string; name: string }) => void;
  deductCheerPoints: (amount: number) => void; // Added action
  login: (email: string, name: string, profileImageUrl?: string | null, role?: string, favoriteTeam?: string, id?: number, cheerPoints?: number, handle?: string, provider?: string, hasPassword?: boolean) => void;
  logout: (skipServerLogout?: boolean) => void;
  setFavoriteTeam: (team: string, color: string) => void;
  setShowLoginRequiredDialog: (show: boolean) => void;
  setPendingLoginRedirect: (redirectPath?: string | null) => void;
  clearPendingLoginRedirect: () => void;
  requireLogin: (redirectPath?: string | null) => boolean;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const getInitialState = (): AuthState => ({
  user: null,
  isAuthLoading: true,
  showLoginRequiredDialog: false,
  pendingLoginRedirect: null,
});

let pendingAuthProfileRequest: Promise<boolean> | null = null;
let pendingLogoutRequest: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      fetchProfileAndAuthenticate: async () => {
        if (pendingAuthProfileRequest) {
          return pendingAuthProfileRequest;
        }

        const request = (async (): Promise<boolean> => {
          set({ isAuthLoading: true });

          try {
            const profile = await authStoreApi.fetchCurrentUserProfile();
            setPersistedAuthBootstrapHint(true);
            set({
              user: profile,
              isAuthLoading: false,
            });
            return true;

          } catch (error) {
            // 401 errors are handled by interceptor (redirect to login)
            // For other errors during initial auth check, we just reset state silently to avoid modal on startup
            clearSessionScopedQueries();
            if (!shouldKeepBootstrapHintOnError(error)) {
              setPersistedAuthBootstrapHint(false);
            }
            set({
              user: null,
              isAuthLoading: false
            });
            return false;
          }
        })();

        pendingAuthProfileRequest = request;
        try {
          return await request;
        } finally {
          pendingAuthProfileRequest = null;
        }
      },

      setUserProfile: (profile: Partial<Omit<User, 'id'>> & { email: string; name: string }) => {
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
              profileImageUrl: authStoreApi.normalizeProfileImageUrl(profile.profileImageUrl),
            },
          };
        });
      },

      deductCheerPoints: (amount: number) => {
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

      login: (email: string, name: string, profileImageUrl?: string | null, role?: string, favoriteTeam?: string, id?: number, cheerPoints?: number, handle?: string, provider?: string, hasPassword?: boolean) => {
        const normalizedId = Number(id) || 0;
        setPersistedAuthBootstrapHint(true);

        set({
          user: {
            id: normalizedId,
            email: email,
            name: name,
            // ... (keep existing)
            profileImageUrl: authStoreApi.normalizeProfileImageUrl(profileImageUrl),
            role: role,
            favoriteTeam: favoriteTeam || '없음',
            cheerPoints: cheerPoints || 0,
            handle: handle,
            provider: provider,
            hasPassword,
          },
          isAuthLoading: false,
        });
      },

      logout: (skipServerLogout = false) => {
        clearStoredLoginRedirect();
        setPersistedAuthBootstrapHint(false);
        if (!get().user || skipServerLogout) {
          clearSessionScopedQueries();
          set(getInitialState());
          return;
        }

          clearSessionScopedQueries();
          if (!pendingLogoutRequest) {
            pendingLogoutRequest = authStoreApi.logoutUser()
              .then(() => {
                // ignore response
              })
              .catch(() => {
                // Ignore logout request failures (e.g., already expired token / invalid session).
                // Local auth state is already cleared above.
              })
              .finally(() => {
                pendingLogoutRequest = null;
              });
          }

        set({
          ...getInitialState(),
        });
      },
      reset: () =>
        {
          setPersistedAuthBootstrapHint(false);
          return set({
            ...getInitialState(),
          });
        },

      setFavoriteTeam: (team: string, color: string) =>
        set((state) => ({
          user: state.user ? { ...state.user, favoriteTeam: team, favoriteTeamColor: color } : null,
        })),

      setShowLoginRequiredDialog: (show: boolean) => {
        set({ showLoginRequiredDialog: show });
      },

      setPendingLoginRedirect: (redirectPath?: string | null) => {
        const sanitized = setStoredLoginRedirect(redirectPath);
        set({ pendingLoginRedirect: sanitized });
      },

      clearPendingLoginRedirect: () => {
        clearStoredLoginRedirect();
        set({ pendingLoginRedirect: null });
      },

      requireLogin: (redirectPath?: string | null) => {
        const currentUser = get().user;
        if (!currentUser) {
          const nextRedirect = sanitizeLoginRedirect(redirectPath) || getCurrentRelativeUrl();
          get().setPendingLoginRedirect(nextRedirect);
          get().setShowLoginRequiredDialog(true);
          return false;
        }
        return true;
      },

    }),
    {
      name: 'auth-storage',
      partialize: () => ({}),
    }
  )
);

export const useAuthSession = () =>
  useAuthStore(
    useShallow((state) => ({
      isLoggedIn: isLoggedInUser(state.user),
      isAuthLoading: state.isAuthLoading,
      userId: state.user?.id ?? null,
    })),
  );

export const useAuthProfileSnapshot = () =>
  useAuthStore(
    useShallow((state) => ({
      userId: state.user?.id ?? null,
      userEmail: state.user?.email,
      userName: state.user?.name,
      userHandle: state.user?.handle,
      userFavoriteTeam: state.user?.favoriteTeam,
      userFavoriteTeamColor: state.user?.favoriteTeamColor,
      userProfileImageUrl: state.user?.profileImageUrl,
      userRole: state.user?.role,
      userProvider: state.user?.provider,
      userBio: state.user?.bio,
      userCheerPoints: state.user?.cheerPoints,
      userHasPassword: state.user?.hasPassword,
    })),
  );

export const useAuthProfileActions = () =>
  useAuthStore(
    useShallow((state) => ({
      setUserProfile: state.setUserProfile,
      fetchProfileAndAuthenticate: state.fetchProfileAndAuthenticate,
    })),
  );

export const useAuthAccessActions = () =>
  useAuthStore(
    useShallow((state) => ({
      logout: state.logout,
      requireLogin: state.requireLogin,
    })),
  );

export const useAuthAuthenticationActions = () =>
  useAuthStore(
    useShallow((state) => ({
      login: state.login,
      fetchProfileAndAuthenticate: state.fetchProfileAndAuthenticate,
    })),
  );

export const useAuthRedirectState = () =>
  useAuthStore(
    useShallow((state) => ({
      pendingLoginRedirect: state.pendingLoginRedirect,
      setPendingLoginRedirect: state.setPendingLoginRedirect,
      clearPendingLoginRedirect: state.clearPendingLoginRedirect,
    })),
  );

export const useAuthCheerActions = () =>
  useAuthStore(
    useShallow((state) => ({
      deductCheerPoints: state.deductCheerPoints,
    })),
  );

export const useAuthDialogState = () =>
  useAuthStore(
    useShallow((state) => ({
      showLoginRequiredDialog: state.showLoginRequiredDialog,
      setShowLoginRequiredDialog: state.setShowLoginRequiredDialog,
    })),
  );
