const AUTH_BOOTSTRAP_HINT_KEY = 'auth-bootstrap-hint';

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
]);

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type AuthBootstrapMode = 'skip' | 'public-home' | 'defer' | 'immediate';

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

export const resolveAuthBootstrapMode = (
  pathname: string,
  options: {
    isLoggedIn: boolean;
    hasPersistedAuthHint: boolean;
  },
): AuthBootstrapMode => {
  const normalizedPathname = normalizeAuthBootstrapPathname(pathname);

  if (AUTH_BOOTSTRAP_SKIPPED_PATHS.has(normalizedPathname)) {
    return 'skip';
  }

  if (AUTH_BOOTSTRAP_PUBLIC_HOME_PATHS.has(normalizedPathname)) {
    return options.isLoggedIn || options.hasPersistedAuthHint ? 'defer' : 'public-home';
  }

  return 'immediate';
};
