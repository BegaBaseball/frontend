import type { GlobalApiErrorDetail } from '../../types/error';

const HOME_MODAL_SUPPRESSED_PATH = '/home';
const HOME_MODAL_SUPPRESSED_EXACT_ENDPOINTS = new Set([
  '/home/bootstrap',
  '/home/widgets',
  '/kbo/schedule',
  '/kbo/schedule/navigation',
  '/kbo/league-start-dates',
]);
const HOME_MODAL_SUPPRESSED_PREFIXES = [
  '/kbo/rankings/',
  '/cheer/posts/hot',
];

const normalizePathname = (pathname: string): string => {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
};

const parseEndpoint = (endpoint?: string | null): URL | null => {
  if (!endpoint) {
    return null;
  }

  try {
    return new URL(endpoint, 'https://bega.local');
  } catch {
    return null;
  }
};

const isHomeModalSuppressedEndpoint = (endpoint?: string | null): boolean => {
  const parsedEndpoint = parseEndpoint(endpoint);
  if (!parsedEndpoint) {
    return false;
  }

  if (HOME_MODAL_SUPPRESSED_EXACT_ENDPOINTS.has(parsedEndpoint.pathname)) {
    return true;
  }

  if (HOME_MODAL_SUPPRESSED_PREFIXES.some((prefix) => parsedEndpoint.pathname.startsWith(prefix))) {
    return true;
  }

  return parsedEndpoint.pathname === '/parties'
    && parsedEndpoint.searchParams.get('page') === '0'
    && parsedEndpoint.searchParams.get('size') === '1000';
};

export const shouldIgnoreGlobalApiError = (
  errorData?: GlobalApiErrorDetail,
  currentPathname = '/',
): boolean => {
  if (errorData?.responseCode === 'INVALID_AUTHOR') {
    return true;
  }

  const message = (errorData?.message || '').toString().toLowerCase();
  const statusCode = errorData?.statusCode ?? null;

  if (statusCode === 0 && (
    message.includes('canceled')
    || message.includes('aborted')
    || message.includes('abort')
  )) {
    return true;
  }

  return normalizePathname(currentPathname) === HOME_MODAL_SUPPRESSED_PATH
    && isHomeModalSuppressedEndpoint(errorData?.endpoint);
};
