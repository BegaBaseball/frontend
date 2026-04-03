import axios from 'axios';
import type { GlobalApiErrorDetail } from '../types/error';
import { parseError } from '../utils/errorUtils';
import { hasPersistedAuthBootstrapHint } from '../utils/authBootstrap';
import { getApiBaseUrl } from './apiBase';

const API_BASE_URL = getApiBaseUrl();
let clientErrorReporterModulePromise: Promise<typeof import('../utils/clientErrorReporter')> | null = null;

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Cookie 전송을 위해 필수
    timeout: 10000, // 10초 타임아웃 추가
    headers: {
        'Content-Type': 'application/json',
    },
});

let reissueInFlight: Promise<void> | null = null;
let hasSessionExpired = false;
const getImportMetaEnv = (): Record<string, unknown> | undefined => {
    try {
        return (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
    } catch {
        return undefined;
    }
};

const isAuthTraceEnabled = (): boolean => Boolean(getImportMetaEnv()?.DEV);

const traceAuthEvent = (label: string) => {
    if (!isAuthTraceEnabled()) {
        return;
    }

    const now = performance.now().toFixed(2);
    console.debug(`[auth-axios][${now}ms] ${label}`);
};

const traceAuthRequestOrigin = (requestUrl?: string) => {
    if (!requestUrl || !requestUrl.includes('/auth/mypage')) {
        return;
    }

    const stack = new Error().stack
        ?.split('\n')
        .slice(2, 8)
        .map((line) => line.trim())
        .join(' | ');

    traceAuthEvent(`Auth profile request origin url=${requestUrl} stack=${stack ?? 'unavailable'}`);
};

const skipReissueRequestPaths = [
    '/auth/login',
    '/auth/signup',
    '/auth/reissue',
    '/auth/logout',
];

const normalizeRequestPath = (url?: string) => {
    if (!url) {
        return undefined;
    }

    if (typeof window === 'undefined') {
        return url;
    }

    try {
        const parsed = new URL(url, window.location.origin);
        return `${parsed.pathname}${parsed.search}`;
    } catch {
        return url;
    }
};

const shouldSkipErrorReporting = (error: any, responseCode?: string) => {
    const status = error.response?.status ?? null;
    const requestUrl = error.config?.url || '';

    if (error.config?.skipErrorReporting) {
        return true;
    }

    if (responseCode === 'INVALID_AUTHOR') {
        return true;
    }

    if (status === 401) {
        return true;
    }

    if (error.config?.skipGlobalErrorHandler && status !== null && status < 500) {
        return true;
    }

    if (skipReissueRequestPaths.some((path) => requestUrl.includes(path)) && status !== null && status < 500) {
        return true;
    }

    return false;
};

const isManualRetryAllowed = (error: any) => {
    const method = (error.config?.method || 'get').toUpperCase();
    return method === 'GET' || method === 'HEAD' || error.config?.allowManualRetry === true;
};

const shouldSkipAuthSessionHandling = (requestConfig: any): boolean =>
    requestConfig?.skipAuthSessionHandling === true;

const createManualRetryHandler = (requestConfig: any) => {
    return async () => {
        await api({
            ...requestConfig,
            headers: requestConfig?.headers ? { ...requestConfig.headers } : undefined,
            signal: undefined,
        });
    };
};

const buildGlobalErrorDetail = (error: any): GlobalApiErrorDetail => {
    const parsedError = parseError(error);
    const requestMethod = (error.config?.method || 'get').toUpperCase();
    const endpoint = normalizeRequestPath(error.config?.url);
    const eventId = createClientErrorEventId();
    const shouldReport = !shouldSkipErrorReporting(error, parsedError.responseCode);

    if (shouldReport) {
        void loadClientErrorReporter().then(({ reportApiError }) => {
            reportApiError({
                eventId,
                message: parsedError.message,
                statusCode: parsedError.statusCode,
                responseCode: parsedError.responseCode,
                method: requestMethod,
                endpoint,
                shouldReport,
            });
        });
    }

    return {
        ...parsedError,
        endpoint,
        errorId: eventId,
        source: 'api',
        onRetry: parsedError.statusCode === 401 || !isManualRetryAllowed(error)
            ? null
            : createManualRetryHandler(error.config),
    };
};

const extractErrorStatus = (error: any): number | undefined => {
    const status = error?.response?.status;
    return typeof status === 'number' ? status : undefined;
};

const extractErrorResponseCode = (error: any): string | undefined => {
    const code = error?.response?.data?.code;
    return typeof code === 'string' ? code : undefined;
};

const buildAuthSessionExpiredDetail = (
    cause: 'reissue_failed' | 'request_unauthorized',
    requestUrl: string,
    requestMethod: string,
    options: {
        requestStatus?: number;
        requestCode?: string;
        reissueError?: any;
    } = {},
) => ({
    cause,
    requestUrl,
    requestMethod,
    requestStatus: options.requestStatus,
    requestCode: options.requestCode,
    reissueStatus: extractErrorStatus(options.reissueError),
    reissueCode: extractErrorResponseCode(options.reissueError),
    hadBootstrapHint: hasPersistedAuthBootstrapHint(),
});

const dispatchAuthSessionExpired = (
    detail: ReturnType<typeof buildAuthSessionExpiredDetail>,
) => {
    window.dispatchEvent(new CustomEvent('auth-session-expired', { detail }));
};

const createClientErrorEventId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `client-error-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const loadClientErrorReporter = () => {
    if (!clientErrorReporterModulePromise) {
        clientErrorReporterModulePromise = import('../utils/clientErrorReporter');
    }

    return clientErrorReporterModulePromise;
};

// Response Interceptor
api.interceptors.request.use((config) => {
    traceAuthRequestOrigin(config.url);
    return config;
});

api.interceptors.response.use(
    (response) => {
        const requestUrl = response.config?.url || '';
        if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/reissue') || requestUrl.includes('/auth/mypage')) {
            hasSessionExpired = false;
            traceAuthEvent(`Session recovered by ${requestUrl}`);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url || '';
        const requestMethod = (originalRequest?.method || 'get').toUpperCase();
        const responseStatus = error.response?.status;
        const skipAuthSessionHandling = shouldSkipAuthSessionHandling(originalRequest);
        const responseCode = error.response?.data?.code;
        const errorMessage = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
        const isCancelError = axios.isCancel(error)
            || error?.code === 'ERR_CANCELED'
            || error?.name === 'AbortError'
            || error?.name === 'CanceledError'
            || errorMessage.includes('canceled');

        traceAuthEvent(
          `Interceptor error ${requestMethod} ${requestUrl} status=${responseStatus ?? 'n/a'} code=${responseCode ?? 'n/a'} retry=${Boolean(originalRequest?._retry)} skipAuthSessionHandling=${skipAuthSessionHandling}`,
        );

        if (isCancelError) {
            return Promise.reject(error);
        }

        if (hasSessionExpired) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (skipAuthSessionHandling) {
                traceAuthEvent(`Skip reissue for ${requestUrl} due skipAuthSessionHandling=true`);
                return Promise.reject(error);
            }

            if (responseCode === 'INVALID_AUTHOR') {
                console.error('Session invalid due to missing/invalid author user.');
                const parsedError = buildGlobalErrorDetail(error);
                if (!error.config?.skipGlobalErrorHandler) {
                    window.dispatchEvent(new CustomEvent('global-api-error', { detail: parsedError }));
                }
                return Promise.reject(error);
            }

            if (skipReissueRequestPaths.some((path) => originalRequest.url?.includes(path))) {
                hasSessionExpired = false;
                traceAuthEvent(`Skip reissue for ${requestUrl}`);
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            if (!reissueInFlight) {
                traceAuthEvent(`Start reissue for ${requestUrl}`);
                reissueInFlight = axios.post(`${API_BASE_URL}/auth/reissue`, {}, { withCredentials: true, skipGlobalErrorHandler: true, skipErrorReporting: true })
                    .then(() => {
                        hasSessionExpired = false;
                        traceAuthEvent('Reissue succeeded');
                    })
                    .finally(() => {
                        reissueInFlight = null;
                    });
            }

            try {
                await reissueInFlight;

                // 재발급 성공 시 원래 요청 재시도
                traceAuthEvent(`Reissue completed, retrying ${requestUrl}`);
                return api(originalRequest);
            } catch (reissueError) {
                // 재발급 실패 시 (Refresh Token 만료 등)
                const detail = buildAuthSessionExpiredDetail('reissue_failed', requestUrl, requestMethod, {
                    requestStatus: responseStatus,
                    requestCode: responseCode,
                    reissueError,
                });
                console.warn('[auth-axios] reissue failed', detail);
                if (skipAuthSessionHandling) {
                    traceAuthEvent(`Skip auth-session-expired for ${requestUrl} due skipAuthSessionHandling=true`);
                    return Promise.reject(reissueError);
                }

                if (!hasSessionExpired) {
                    hasSessionExpired = true;
                    console.error('Session expired. Please login again.');
                    dispatchAuthSessionExpired(detail);
                }

                return Promise.reject(reissueError);
            }
        } else if (error.response?.status === 401) {
            if (skipAuthSessionHandling) {
                traceAuthEvent(`Skip auth-session-expired for ${requestUrl} due skipAuthSessionHandling=true`);
                return Promise.reject(error);
            }

            if (responseCode === 'INVALID_AUTHOR') {
                console.error('Session invalid due to missing/invalid author user.');
                const parsedError = buildGlobalErrorDetail(error);
                if (!error.config?.skipGlobalErrorHandler) {
                    window.dispatchEvent(new CustomEvent('global-api-error', { detail: parsedError }));
                }
                return Promise.reject(error);
            }

            // 재발급 후에도 401이 남는 경우: 토큰은 만료되었거나 계정이 유효하지 않아 세션이 복구 불가
            if (!hasSessionExpired) {
                hasSessionExpired = true;
                const detail = buildAuthSessionExpiredDetail('request_unauthorized', requestUrl, requestMethod, {
                    requestStatus: responseStatus,
                    requestCode: responseCode,
                });
                console.warn('[auth-axios] session invalid after retry', detail);
                console.error('Session invalid. Please login again.');
                dispatchAuthSessionExpired(detail);
                traceAuthEvent(`auth-session-expired dispatched for ${requestUrl}`);
            }
        }

        // Global Error Handling
        const parsedError = buildGlobalErrorDetail(error);
        if (!error.config?.skipGlobalErrorHandler) {
            // 401 is handled above, so we skip it here unless it fell through (e.g. reissue failed)
            if (parsedError.statusCode !== 401) {
                window.dispatchEvent(new CustomEvent('global-api-error', { detail: parsedError }));
            }
        }

        return Promise.reject(error);
    }
);

export default api;
