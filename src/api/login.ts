const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    name: string;
    role: string;
  };
}

/**
 * 로그인 API 호출
 */
export const loginUser = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    let errorMessage = '로그인에 실패했습니다.';
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      if (response.status === 401) {
        errorMessage = '이메일 또는 비밀번호가 일치하지 않습니다.';
      } else if (response.status === 400) {
        errorMessage = '입력 정보를 확인해주세요.';
      } else {
        errorMessage = `서버 오류: ${response.status}`;
      }
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 소셜 로그인 URL 생성
 */
export const getSocialLoginUrl = (provider: 'kakao' | 'google'): string => {
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}/oauth2/authorization/${provider}`;
}