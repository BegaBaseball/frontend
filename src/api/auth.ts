// api/auth.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ========== 타입 정의 ==========
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

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  favoriteTeam: string | null;
}

export interface SignUpResponse {
  success: boolean;
  message: string;
  data?: {
    userId: number;
    email: string;
  };
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetConfirmResponse {
  success: boolean;
  message: string;
}

// ========== API 함수 ==========

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
 * 회원가입 API 호출
 */
export const signupUser = async (data: SignUpRequest): Promise<SignUpResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.message || 
                        (typeof errorData === 'string' ? errorData : `회원가입 실패: ${response.statusText}`);
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

/**
 * 로그아웃 API 호출
 */
export const logoutUser = async (): Promise<void> => {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

/**
 * 비밀번호 재설정 요청 API 호출
 */
export const requestPasswordReset = async (email: string): Promise<PasswordResetResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/password/reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    let errorMessage = '이메일 발송에 실패했습니다.';
    try {
      const data = await response.json();
      errorMessage = data.message || errorMessage;
    } catch {
      errorMessage = `서버 오류 (${response.status})`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 비밀번호 재설정 확인 API 호출
 */
export const confirmPasswordReset = async (
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<PasswordResetConfirmResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/password/reset/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      newPassword,
      confirmPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || '비밀번호 변경에 실패했습니다.');
  }

  return data;
}