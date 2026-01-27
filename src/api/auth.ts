// api/auth.ts
import api from './axios';

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
    refreshToken?: string;
    id: number;
    name: string;
    role: string;
    handle?: string;
  };
}

export interface SignUpRequest {
  name: string;
  handle: string;
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
  try {
    const response = await api.post<LoginResponse>('/auth/login', credentials, {
      skipGlobalErrorHandler: true, // 로그인 실패 시 모달 대신 폼 에러 표시
    } as any);
    return response.data;
  } catch (error: any) {
    let errorMessage = '로그인에 실패했습니다.';

    if (error.response) {
      errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      if (error.response.status === 401) {
        errorMessage = '이메일 또는 비밀번호가 일치하지 않습니다.';
      }
    }

    throw new Error(errorMessage);
  }
};

/**
 * 회원가입 API 호출
 */
export const signupUser = async (data: SignUpRequest): Promise<SignUpResponse> => {
  try {
    const response = await api.post<SignUpResponse>('/auth/signup', data, {
      skipGlobalErrorHandler: true,
    } as any);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message ||
      (typeof error.response?.data === 'string' ? error.response.data : `회원가입 실패: ${error.message}`);
    throw new Error(errorMessage);
  }
};

/**
 * 소셜 로그인 URL 생성
 */
const NO_API_BASE_URL = (import.meta.env.VITE_NO_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
export const getSocialLoginUrl = (
  provider: 'kakao' | 'google' | 'naver',
  params?: { mode?: 'link'; userId?: number }
): string => {
  const url = `${NO_API_BASE_URL}/oauth2/authorization/${provider}`;
  if (params) {
    const query = new URLSearchParams();
    if (params.mode) query.append('mode', params.mode);
    if (params.userId) query.append('userId', params.userId.toString());
    return `${url}?${query.toString()}`;
  }
  return url;
};

/**
 * 로그아웃 API 호출
 */
export const logoutUser = async (): Promise<void> => {
  await api.post('/auth/logout');
};

/**
 * 비밀번호 재설정 요청 API 호출
 */
export const requestPasswordReset = async (email: string): Promise<PasswordResetResponse> => {
  try {
    const response = await api.post<PasswordResetResponse>('/auth/password/reset/request', { email }, {
      skipGlobalErrorHandler: true,
    } as any);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || '이메일 발송에 실패했습니다.';
    throw new Error(errorMessage);
  }
};

/**
 * 비밀번호 재설정 확인 API 호출
 */
export const confirmPasswordReset = async (
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<PasswordResetConfirmResponse> => {
  try {
    const response = await api.post<PasswordResetConfirmResponse>('/auth/password/reset/confirm', {
      token,
      newPassword,
      confirmPassword,
    }, {
      skipGlobalErrorHandler: true,
    } as any);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.response?.data?.error || '비밀번호 변경에 실패했습니다.');
  }
};

// ========== OAuth2 State ==========

export interface OAuth2StateData {
  email: string;
  name: string;
  role: string;
  profileImageUrl: string | null;
  favoriteTeam: string | null;
  handle: string | null;
}

/**
 * OAuth2 로그인 state에서 사용자 정보를 조회합니다 (일회성).
 */
export const consumeOAuth2State = async (stateId: string): Promise<OAuth2StateData> => {
  const response = await api.get<OAuth2StateData>(`/auth/oauth2/state/${stateId}`);
  return response.data;
};