const AUTH_BOOTSTRAP_HINT_KEY = 'auth-bootstrap-hint';
const AUTH_BOOTSTRAP_META_KEY = 'auth-bootstrap-meta';
const AUTH_BOOTSTRAP_META_VERSION = 1;
const AUTH_BOOTSTRAP_SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const AUTH_BOOTSTRAP_FAILURE_COOLDOWN_MS = 60 * 1000;

const AUTH_BOOTSTRAP_SKIPPED_PATHS = new Set([
  '/login',
  '/signup',
  '/password/reset',
  '/password/reset/confirm',
  '/account/deletion/recovery',
]);
const AUTH_BOOTSTRAP_PUBLIC_HOME_PATHS = new Set([
  '/',
  '/home',
  '/prediction',
]);

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type AuthBootstrapMode = 'skip' | 'public-home' | 'defer' | 'immediate';
export interface AuthBootstrapMeta {
  version: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
}

const getBrowserStorage = (): StorageLike | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const normalizeAuthBootstrapPathname = (pathname: string): string => {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
};

export const hasPersistedAuthBootstrapHint = (): boolean => {
  const storage = getBrowserStorage();
  if (!storage) {
    return false;
  }

  return storage.getItem(AUTH_BOOTSTRAP_HINT_KEY) === '1';
};

export const setPersistedAuthBootstrapHint = (enabled: boolean): void => {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  if (enabled) {
    storage.setItem(AUTH_BOOTSTRAP_HINT_KEY, '1');
    return;
  }

  storage.removeItem(AUTH_BOOTSTRAP_HINT_KEY);
};

const normalizeTimestamp = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
);

export const getPersistedAuthBootstrapMeta = (): AuthBootstrapMeta | null => {
  const storage = getBrowserStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(AUTH_BOOTSTRAP_META_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthBootstrapMeta> | null;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      version: typeof parsed.version === 'number' ? parsed.version : AUTH_BOOTSTRAP_META_VERSION,
      lastSuccessAt: normalizeTimestamp(parsed.lastSuccessAt),
      lastFailureAt: normalizeTimestamp(parsed.lastFailureAt),
    };
  } catch {
    return null;
  }
};

export const setPersistedAuthBootstrapMeta = (meta: AuthBootstrapMeta | null): void => {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  if (!meta) {
    storage.removeItem(AUTH_BOOTSTRAP_META_KEY);
    return;
  }

  storage.setItem(
    AUTH_BOOTSTRAP_META_KEY,
    JSON.stringify({
      version: AUTH_BOOTSTRAP_META_VERSION,
      lastSuccessAt: normalizeTimestamp(meta.lastSuccessAt),
      lastFailureAt: normalizeTimestamp(meta.lastFailureAt),
    }),
  );
};

export const markPersistedAuthBootstrapSuccess = (now = Date.now()): void => {
  setPersistedAuthBootstrapHint(true);
  setPersistedAuthBootstrapMeta({
    version: AUTH_BOOTSTRAP_META_VERSION,
    lastSuccessAt: now,
    lastFailureAt: null,
  });
};

export const markPersistedAuthBootstrapFailure = (
  options: {
    now?: number;
    clearHint?: boolean;
    clearSuccess?: boolean;
  } = {},
): void => {
  const { now = Date.now(), clearHint = false, clearSuccess = false } = options;
  const currentMeta = getPersistedAuthBootstrapMeta();

  if (clearHint) {
    setPersistedAuthBootstrapHint(false);
  }

  setPersistedAuthBootstrapMeta({
    version: AUTH_BOOTSTRAP_META_VERSION,
    lastSuccessAt: clearSuccess ? null : currentMeta?.lastSuccessAt ?? null,
    lastFailureAt: now,
  });
};

export const clearPersistedAuthBootstrapState = (): void => {
  setPersistedAuthBootstrapHint(false);
  setPersistedAuthBootstrapMeta(null);
};

const hasFreshSuccess = (meta: AuthBootstrapMeta | null, now: number): boolean => {
  if (!meta?.lastSuccessAt) {
    return false;
  }

  return now - meta.lastSuccessAt <= AUTH_BOOTSTRAP_SUCCESS_TTL_MS;
};

const isFailureCooldownActive = (meta: AuthBootstrapMeta | null, now: number): boolean => {
  if (!meta?.lastFailureAt) {
    return false;
  }

  return now - meta.lastFailureAt <= AUTH_BOOTSTRAP_FAILURE_COOLDOWN_MS;
};

export const resolveAuthBootstrapMode = (
  pathname: string,
  options: {
    isLoggedIn: boolean;
    hasPersistedAuthHint: boolean;
    authBootstrapMeta?: AuthBootstrapMeta | null;
    now?: number;
  },
): AuthBootstrapMode => {
  const normalizedPathname = normalizeAuthBootstrapPathname(pathname);
  const now = options.now ?? Date.now();
  const authBootstrapMeta = options.authBootstrapMeta ?? null;

  if (AUTH_BOOTSTRAP_SKIPPED_PATHS.has(normalizedPathname)) {
    return 'skip';
  }

  if (AUTH_BOOTSTRAP_PUBLIC_HOME_PATHS.has(normalizedPathname)) {
    if (options.isLoggedIn) {
      return 'defer';
    }

    const hasBootstrapMarker = options.hasPersistedAuthHint || Boolean(authBootstrapMeta);
    if (!hasBootstrapMarker) {
      return 'public-home';
    }

    if (isFailureCooldownActive(authBootstrapMeta, now)) {
      return 'public-home';
    }

    if (hasFreshSuccess(authBootstrapMeta, now)) {
      return 'defer';
    }

    if (options.hasPersistedAuthHint && !authBootstrapMeta) {
      return 'defer';
    }

    return 'public-home';
  }

  return 'immediate';
};

export const shouldHoldAuthUiDuringBootstrap = (
  pathname: string,
  options: {
    isLoggedIn: boolean;
    hasPersistedAuthHint: boolean;
    authBootstrapMeta?: AuthBootstrapMeta | null;
    now?: number;
  },
): boolean => (
  !options.isLoggedIn
  && resolveAuthBootstrapMode(pathname, options) === 'defer'
);
