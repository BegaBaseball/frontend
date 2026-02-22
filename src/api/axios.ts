import axios from 'axios';
import { parseError } from '../utils/errorUtils';
import { getApiBaseUrl } from './apiBase';

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Cookie 전송을 위해 필수
    headers: {
        'Content-Type': 'application/json',
    },
});

let reissueInFlight: Promise<void> | null = null;
let hasSessionExpired = false;

const skipReissueRequestPaths = [
    '/auth/login',
    '/auth/signup',
    '/auth/mypage',
    '/auth/reissue',
    '/auth/logout',
];

// Response Interceptor
api.interceptors.response.use(
    (response) => {
        const requestUrl = response.config?.url || '';
        if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/reissue') || requestUrl.includes('/auth/mypage')) {
            hasSessionExpired = false;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const responseCode = error.response?.data?.code;
        const errorMessage = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
        const isCancelError = axios.isCancel(error)
            || error?.code === 'ERR_CANCELED'
            || error?.name === 'AbortError'
            || error?.name === 'CanceledError'
            || errorMessage.includes('canceled');

        if (isCancelError) {
            return Promise.reject(error);
        }

        if (hasSessionExpired) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (responseCode === 'INVALID_AUTHOR') {
                console.error('Session invalid due to missing/invalid author user.');
                const parsedError = parseError(error);
                if (!error.config?.skipGlobalErrorHandler) {
                    window.dispatchEvent(new CustomEvent('global-api-error', { detail: parsedError }));
                }
                return Promise.reject(error);
            }

            if (skipReissueRequestPaths.some((path) => originalRequest.url?.includes(path))) {
                hasSessionExpired = false;
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            if (!reissueInFlight) {
                reissueInFlight = axios.post(`${API_BASE_URL}/auth/reissue`, {}, { withCredentials: true, skipGlobalErrorHandler: true })
                    .then(() => {
                        hasSessionExpired = false;
                    })
                    .finally(() => {
                        reissueInFlight = null;
                    });
            }

            try {
                await reissueInFlight;

                // 재발급 성공 시 원래 요청 재시도
                return api(originalRequest);
            } catch (reissueError) {
                // 재발급 실패 시 (Refresh Token 만료 등)
                if (!hasSessionExpired) {
                    hasSessionExpired = true;
                    console.error('Session expired. Please login again.');
                    window.dispatchEvent(new CustomEvent('auth-session-expired'));
                }

                return Promise.reject(reissueError);
            }
        } else if (error.response?.status === 401) {
            if (responseCode === 'INVALID_AUTHOR') {
                console.error('Session invalid due to missing/invalid author user.');
                const parsedError = parseError(error);
                if (!error.config?.skipGlobalErrorHandler) {
                    window.dispatchEvent(new CustomEvent('global-api-error', { detail: parsedError }));
                }
                return Promise.reject(error);
            }

            // 재발급 후에도 401이 남는 경우: 토큰은 만료되었거나 계정이 유효하지 않아 세션이 복구 불가
            if (!hasSessionExpired) {
                hasSessionExpired = true;
                console.error('Session invalid. Please login again.');
                window.dispatchEvent(new CustomEvent('auth-session-expired'));
            }
        }

        // Global Error Handling
        if (!error.config?.skipGlobalErrorHandler) {
            const parsedError = parseError(error);
            // 401 is handled above, so we skip it here unless it fell through (e.g. reissue failed)
            if (parsedError.statusCode !== 401) {
                window.dispatchEvent(new CustomEvent('global-api-error', { detail: parsedError }));
            }
        }

        return Promise.reject(error);
    }
);

export default api;
