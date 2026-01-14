import axios from 'axios';

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

        // 401 에러 발생 시 (Access Token 만료)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // 토큰 재발급 요청 (Refresh Token은 Cookie에 있으므로 withCredentials=true로 자동 전송)
                await axios.post(`${API_BASE_URL}/auth/reissue`, {}, { withCredentials: true });

                // 재발급 성공 시 원래 요청 재시도
                return api(originalRequest);
            } catch (reissueError) {
                // 재발급 실패 시 (Refresh Token 만료 등)
                console.error('Session expired. Please login again.');
                // 여기서 로그아웃 처리를 하거나 에러를 전파하여 UI에서 처리
                return Promise.reject(reissueError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
