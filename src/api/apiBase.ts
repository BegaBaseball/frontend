const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0:0:0:0:0:0:0:1',
]);

const normalizeHost = (host: string): string =>
  host
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim()
    .toLowerCase();

const normalizePath = (value: string): string => {
  const withLeadingSlash = value.trim().startsWith('/') ? value.trim() : `/${value.trim()}`;
  return withLeadingSlash.replace(/\/+/g, '/');
};

const normalizeRelativePath = (value: string): string => {
  const normalized = normalizePath(value).replace(/\/+$/, '');
  return normalized || '/api';
};

const ensureApiPath = (url: string): string => {
  if (url === '') {
    return '/api';
  }

  const normalized = normalizePath(url).replace(/\/+$/, '');
  const withApiPath = normalized.endsWith('/api') ? normalized : `${normalized}/api`;
  if (withApiPath === '/api') {
    return '/api';
  }

  return withApiPath;
};

const isLoopbackHost = (host: string): boolean => LOOPBACK_HOSTS.has(host);

const isLoopbackHostName = (host: string): boolean => isLoopbackHost(host);

const shouldUseRelativeApiBase = (
  pageHost: string,
  targetHost: string,
): boolean => {
  if (!pageHost) {
    return isLoopbackHostName(targetHost);
  }

  if (pageHost === targetHost) {
    return true;
  }

  // Both loopback hosts should keep same-origin semantics with Vite proxy/CORS-safe paths.
  return isLoopbackHostName(pageHost) && isLoopbackHostName(targetHost);
};

export const getApiBaseUrl = (value = import.meta.env.VITE_API_BASE_URL): string => {
  // Cypress should always use same-origin path for stable stubs
  if (typeof window !== 'undefined' && (window as Window & { Cypress?: unknown }).Cypress) {
    return '/api';
  }

  const fallback = '/api';
  const raw = (value ?? '').trim();

  if (!raw) {
    return fallback;
  }

  const isAbsolute = /^https?:\/\//i.test(raw);
  if (!isAbsolute) {
    return normalizeRelativePath(ensureApiPath(raw));
  }

  try {
    const target = new URL(raw);
    const pageHost = typeof window !== 'undefined' ? normalizeHost(window.location.hostname) : '';
    const targetHost = normalizeHost(target.hostname);

    if (shouldUseRelativeApiBase(pageHost, targetHost)) {
      return fallback;
    }

    const path = target.pathname ? target.pathname.replace(/\/+$/, '') : '';
    const base = `${target.protocol}//${target.host}`;
    return ensureApiPath(`${base}${path || '/api'}`);
  } catch {
    return fallback;
  }
};
