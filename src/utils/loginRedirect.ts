const LOGIN_REDIRECT_STORAGE_KEY = 'pendingLoginRedirect';

const DISALLOWED_LOGIN_REDIRECTS = ['/login', '/signup', '/oauth/callback'];

const isDisallowedPath = (pathname: string): boolean => (
  DISALLOWED_LOGIN_REDIRECTS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
);

const normalizeRedirectCandidate = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, 'http://localhost');
    if (parsed.origin !== 'http://localhost' || isDisallowedPath(parsed.pathname)) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const sanitizeLoginRedirect = (value?: string | null): string | null =>
  normalizeRedirectCandidate(value);

export const buildLoginPath = (redirectPath?: string | null): string => {
  const sanitized = sanitizeLoginRedirect(redirectPath);
  if (!sanitized) {
    return '/login';
  }

  return `/login?redirect=${encodeURIComponent(sanitized)}`;
};

export const buildSignUpPath = (redirectPath?: string | null): string => {
  const sanitized = sanitizeLoginRedirect(redirectPath);
  if (!sanitized) {
    return '/signup';
  }

  return `/signup?redirect=${encodeURIComponent(sanitized)}`;
};

export const buildPasswordResetPath = (redirectPath?: string | null): string => {
  const sanitized = sanitizeLoginRedirect(redirectPath);
  if (!sanitized) {
    return '/password/reset';
  }

  return `/password/reset?redirect=${encodeURIComponent(sanitized)}`;
};

export const buildLoginPathWithError = (
  errorCode?: string | null,
  redirectPath?: string | null,
): string => {
  const params = new URLSearchParams();
  const sanitized = sanitizeLoginRedirect(redirectPath);
  const normalizedErrorCode = typeof errorCode === 'string' ? errorCode.trim() : '';

  if (sanitized) {
    params.set('redirect', sanitized);
  }

  if (normalizedErrorCode) {
    params.set('error', normalizedErrorCode);
  }

  const query = params.toString();
  return query ? `/login?${query}` : '/login';
};

export const getCurrentRelativeUrl = (): string => {
  if (typeof window === 'undefined') {
    return '/home';
  }

  return sanitizeLoginRedirect(
    `${window.location.pathname || '/'}${window.location.search || ''}${window.location.hash || ''}`,
  ) || '/home';
};

export const getStoredLoginRedirect = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return sanitizeLoginRedirect(window.sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY));
  } catch {
    return null;
  }
};

export const setStoredLoginRedirect = (redirectPath?: string | null): string | null => {
  const sanitized = sanitizeLoginRedirect(redirectPath);
  if (typeof window === 'undefined') {
    return sanitized;
  }

  try {
    if (sanitized) {
      window.sessionStorage.setItem(LOGIN_REDIRECT_STORAGE_KEY, sanitized);
    } else {
      window.sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures and continue with in-memory state.
  }

  return sanitized;
};

export const clearStoredLoginRedirect = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);
  } catch {
    // Ignore storage failures and continue with in-memory state.
  }
};

export const resolvePostLoginRedirect = (
  queryRedirect?: string | null,
  pendingRedirect?: string | null,
  fallback = '/home',
): string => (
  sanitizeLoginRedirect(queryRedirect)
  || sanitizeLoginRedirect(getStoredLoginRedirect())
  || sanitizeLoginRedirect(pendingRedirect)
  || fallback
);
