import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  primeUserProfileQuery,
  runSessionScopedQueryCleanup,
} from '../lib/queryClientRegistry';
import {
  clearPersistedAuthBootstrapState,
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  markPersistedAuthBootstrapFailure,
  markPersistedAuthBootstrapSuccess,
  normalizeAuthBootstrapPathname,
  resolveAuthBootstrapMode,
} from '../utils/authBootstrap';
import {
  clearStoredLoginRedirect,
  getCurrentRelativeUrl,
  sanitizeLoginRedirect,
  setStoredLoginRedirect,
} from '../utils/loginRedirect';

const LEGACY_AUTH_TOKEN_KEY = 'authToken';
const PUBLIC_OPTIONAL_BOOTSTRAP_DEDUP_MS = 60_000;
let authApiModulePromise: Promise<typeof import('../api/auth')> | null = null;
let publicOptionalBootstrapAttemptByPath: Record<string, number> = {};

type AuthBootstrapRuntimeWindow = Window & {
  __begaPublicOptionalBootstrapAttemptByPath?: Record<string, number>;
};

const loadAuthApi = () => {
  if (!authApiModulePromise) {
    authApiModulePromise = import('../api/auth');
  }

  return authApiModulePromise;
};

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

const getPublicOptionalBootstrapAttemptStore = (): Record<string, number> => {
  if (typeof window === 'undefined') {
    return publicOptionalBootstrapAttemptByPath;
  }

  const typedWindow = window as AuthBootstrapRuntimeWindow;
  if (!typedWindow.__begaPublicOptionalBootstrapAttemptByPath) {
    typedWindow.__begaPublicOptionalBootstrapAttemptByPath = { ...publicOptionalBootstrapAttemptByPath };
  }

  publicOptionalBootstrapAttemptByPath = typedWindow.__begaPublicOptionalBootstrapAttemptByPath;
  return publicOptionalBootstrapAttemptByPath;
};

const resetPublicOptionalBootstrapAttemptStore = () => {
  publicOptionalBootstrapAttemptByPath = {};

  if (typeof window === 'undefined') {
    return;
  }

  const typedWindow = window as AuthBootstrapRuntimeWindow;
  delete typedWindow.__begaPublicOptionalBootstrapAttemptByPath;
};

clearLegacyAuthTokenStorage();

const extractHttpStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if ('status' in (error as Record<string, unknown>) && typeof (error as { status?: unknown }).status === 'number') {
    return (error as { status: number }).status;
  }

  if (!('response' in (error as Record<string, unknown>))) {
    return undefined;
  }

  const response = (error as { response?: { status?: number } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
};

const extractResponseCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if ('data' in (error as Record<string, unknown>)) {
    const data = (error as { data?: { code?: unknown } }).data;
    if (typeof data?.code === 'string') {
      return data.code;
    }
  }

  if (!('response' in (error as Record<string, unknown>))) {
    return undefined;
  }

  const response = (error as { response?: { data?: { code?: unknown } } }).response;
  return typeof response?.data?.code === 'string' ? response.data.code : undefined;
};

const shouldKeepBootstrapHintOnError = (error: unknown): boolean => {
  const status = extractHttpStatus(error);
  return status === undefined || status >= 500;
};

const shouldClearBootstrapSuccessOnError = (error: unknown): boolean => {
  const status = extractHttpStatus(error);
  const responseCode = extractResponseCode(error);
  return status === 401 || shouldLogBootstrapFailure(status, responseCode);
};

const shouldLogBootstrapFailure = (status?: number, responseCode?: string): boolean => (
  status === 401
  || responseCode === 'REFRESH_TOKEN_MISSING'
  || responseCode === 'REFRESH_TOKEN_EXPIRED'
  || responseCode === 'REFRESH_TOKEN_NOT_FOUND'
  || responseCode === 'INVALID_REFRESH_TOKEN'
  || responseCode === 'INVALID_REFRESH_TOKEN_TYPE'
);

const isAuthBootstrapTraceEnabled = (): boolean => {
  const isDev = Boolean(import.meta.env?.DEV);

  if (typeof window === 'undefined') {
    return isDev;
  }

  return isDev || new URLSearchParams(window.location?.search ?? '').get('traceAuth') === '1';
};

const logBootstrapFailure = (
  error: unknown,
  options: {
    mode?: 'default' | 'public-optional';
  } = {},
) => {
  const status = extractHttpStatus(error);
  const responseCode = extractResponseCode(error);
  if (!shouldLogBootstrapFailure(status, responseCode)) {
    return;
  }

  if (options.mode === 'public-optional') {
    if (isAuthBootstrapTraceEnabled()) {
      console.debug('[auth-bootstrap] optional public bootstrap failed', {
        status,
        responseCode,
        hadPersistedHint: hasPersistedAuthBootstrapHint(),
      });
    }
    return;
  }

  console.warn('[auth-bootstrap] session bootstrap failed', {
    status,
    responseCode,
    hadPersistedHint: hasPersistedAuthBootstrapHint(),
  });
};

const normalizeProfileImageUrl = (value?: string | null): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (
    trimmedValue.startsWith('/assets/')
    || trimmedValue.startsWith('/src/assets/')
    || trimmedValue.startsWith('blob:')
    || trimmedValue.startsWith('data:')
  ) {
    return null;
  }

  return trimmedValue.length > 0 ? trimmedValue : null;
};

export const authStoreApi = {
  fetchCurrentUserProfile: async (options?: { retryOn401?: boolean }) => {
    const authApi = await loadAuthApi();
    return authApi.fetchCurrentUserProfile(options);
  },
  logoutUser: async () => {
    const authApi = await loadAuthApi();
    return authApi.logoutUser();
  },
  normalizeProfileImageUrl,
};

const cacheAuthenticatedUserProfile = (profile: User) => {
  if (!profile.id) {
    return;
  }

  primeUserProfileQuery({
    ...profile,
    name: profile.name || '',
    favoriteTeam: profile.favoriteTeam || '없음',
    profileImageUrl: authStoreApi.normalizeProfileImageUrl(profile.profileImageUrl),
  });
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

export type PublicAuthBootstrapPhase = 'idle' | 'scheduled' | 'running';

interface AuthState {
  user: User | null;
  isAuthLoading: boolean;
  publicAuthBootstrapPhase: PublicAuthBootstrapPhase;
  showLoginRequiredDialog: boolean;
  pendingLoginRedirect: string | null;
}

interface AuthActions {
  fetchProfileAndAuthenticate: (options?: { mode?: 'default' | 'public-optional' }) => Promise<boolean>;
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
  publicAuthBootstrapPhase: 'idle',
  showLoginRequiredDialog: false,
  pendingLoginRedirect: null,
});

let pendingAuthProfileRequest: Promise<boolean> | null = null;
let pendingLogoutRequest: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      fetchProfileAndAuthenticate: async (options) => {
        const isPublicOptional = options?.mode === 'public-optional';
        if (pendingAuthProfileRequest) {
          return pendingAuthProfileRequest;
        }

        if (isPublicOptional) {
          const pathname = normalizeAuthBootstrapPathname(
            typeof window !== 'undefined' ? window.location.pathname : '/',
          );
          const hasInMemoryUser = isLoggedInUser(get().user);
          const authBootstrapMode = resolveAuthBootstrapMode(pathname, {
            isLoggedIn: hasInMemoryUser,
            hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
            authBootstrapMeta: getPersistedAuthBootstrapMeta(),
          });
          if (authBootstrapMode !== 'defer') {
            set({ publicAuthBootstrapPhase: 'idle' });
            return false;
          }

          const now = Date.now();
          const lastAttemptAt = getPublicOptionalBootstrapAttemptStore()[pathname] ?? 0;
          if (now - lastAttemptAt <= PUBLIC_OPTIONAL_BOOTSTRAP_DEDUP_MS) {
            return false;
          }
          getPublicOptionalBootstrapAttemptStore()[pathname] = now;
        }

        const request = (async (): Promise<boolean> => {
          if (isPublicOptional) {
            set({ publicAuthBootstrapPhase: 'running' });
          } else {
            set({
              isAuthLoading: true,
              publicAuthBootstrapPhase: 'idle',
            });
          }

          try {
            const profile = await authStoreApi.fetchCurrentUserProfile({
              retryOn401: !isPublicOptional,
            });
            markPersistedAuthBootstrapSuccess();
            cacheAuthenticatedUserProfile(profile);
            set({
              user: profile,
              isAuthLoading: false,
            });
            return true;

          } catch (error) {
            // 401 errors are handled by interceptor (redirect to login)
            // For other errors during initial auth check, we just reset state silently to avoid modal on startup
            logBootstrapFailure(error, { mode: isPublicOptional ? 'public-optional' : 'default' });
            markPersistedAuthBootstrapFailure({
              clearHint: !shouldKeepBootstrapHintOnError(error),
              clearSuccess: shouldClearBootstrapSuccessOnError(error),
            });

            if (!isPublicOptional) {
              runSessionScopedQueryCleanup();
              set({
                user: null,
                isAuthLoading: false,
                publicAuthBootstrapPhase: 'idle',
              });
            }
            return false;
          } finally {
            if (isPublicOptional) {
              set({ publicAuthBootstrapPhase: 'idle' });
            }
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
        markPersistedAuthBootstrapSuccess();

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
          publicAuthBootstrapPhase: 'idle',
        });
      },

      logout: (skipServerLogout = false) => {
        resetPublicOptionalBootstrapAttemptStore();
        clearStoredLoginRedirect();
        clearPersistedAuthBootstrapState();
        if (!get().user || skipServerLogout) {
          runSessionScopedQueryCleanup();
          set(getInitialState());
          return;
        }

          runSessionScopedQueryCleanup();
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
          resetPublicOptionalBootstrapAttemptStore();
          clearPersistedAuthBootstrapState();
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
      reset: state.reset,
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
