export const CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY = 'cypress:skip-public-auth-bootstrap';

const isAuthTraceEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return import.meta.env.DEV || new URLSearchParams(window.location.search).get('traceAuth') === '1';
};

export const shouldSkipDeferredAuthBootstrapForCypress = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.sessionStorage.getItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY) === '1';
  } catch {
    return false;
  }
};

export const traceAuthEvent = (label: string) => {
  if (!isAuthTraceEnabled()) {
    return;
  }

  const now = performance.now().toFixed(2);
  console.debug(`[auth-trace][${now}ms] ${label}`);
};

export const describeAuthError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
};
