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

        if (hasSessionExpired) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
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
