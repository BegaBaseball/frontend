type RealtimeAuthExpiredDetail = {
  cause: 'realtime_auth_failed';
  requestUrl: '/ws';
  requestStatus?: number;
  requestCode?: string;
};

type RealtimeAuthPreflightKey = 'default' | 'network';

interface EnsureRealtimeAuthSessionOptions {
  useInjectedProfile?: boolean;
}

const realtimeAuthPreflightRequests: Record<RealtimeAuthPreflightKey, Promise<boolean> | null> = {
  default: null,
  network: null,
};
let authModulePromise: Promise<typeof import('../api/auth')> | null = null;

const loadAuthModule = () => {
  if (!authModulePromise) {
    authModulePromise = import('../api/auth');
  }

  return authModulePromise;
};

const dispatchRealtimeAuthExpired = (detail: RealtimeAuthExpiredDetail): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const event = typeof CustomEvent === 'function'
    ? new CustomEvent('auth-session-expired', { detail })
    : Object.assign(new Event('auth-session-expired'), { detail });

  window.dispatchEvent(event);
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
};

const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return undefined;
  }

  const data = (error as { data?: { code?: unknown } }).data;
  return typeof data?.code === 'string' ? data.code : undefined;
};

const buildExpiredDetail = (error: unknown): RealtimeAuthExpiredDetail => {
  const responseCode = getErrorCode(error);

  return {
    cause: 'realtime_auth_failed',
    requestUrl: '/ws',
    requestStatus: getErrorStatus(error),
    requestCode: responseCode,
  };
};

export const ensureRealtimeAuthSession = async (
  options: EnsureRealtimeAuthSessionOptions = {},
): Promise<boolean> => {
  const useInjectedProfile = options.useInjectedProfile !== false;
  const preflightKey: RealtimeAuthPreflightKey = useInjectedProfile ? 'default' : 'network';

  if (!realtimeAuthPreflightRequests[preflightKey]) {
    realtimeAuthPreflightRequests[preflightKey] = loadAuthModule()
      .then(({ fetchCurrentUserProfile }) => fetchCurrentUserProfile({ useInjectedProfile }))
      .then(() => true)
      .catch((error: unknown) => {
        if (getErrorStatus(error) === 401) {
          dispatchRealtimeAuthExpired(buildExpiredDetail(error));
          return false;
        }

        return true;
      })
      .finally(() => {
        realtimeAuthPreflightRequests[preflightKey] = null;
      });
  }

  return realtimeAuthPreflightRequests[preflightKey];
};
