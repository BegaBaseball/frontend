import axios from 'axios';
import { parseError } from '../utils/errorUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Cookie 전송을 위해 필수
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Log for excluded paths
            if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/signup')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                // 토큰 재발급 요청 (Refresh Token은 Cookie에 있으므로 withCredentials=true로 자동 전송)
                await axios.post(`${API_BASE_URL}/auth/reissue`, {}, { withCredentials: true });

                // 재발급 성공 시 원래 요청 재시도
                return api(originalRequest);
            } catch (reissueError) {
                // 재발급 실패 시 (Refresh Token 만료 등)
                console.error('Session expired. Please login again.');
                // window.location.href = '/login'; // Redirect to login caused infinite loop
                window.dispatchEvent(new CustomEvent('auth-session-expired'));

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
