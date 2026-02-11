// api/auth.ts
import api from './axios';
import { getApiErrorMessage } from '../utils/errorUtils';
import { AxiosError } from 'axios';

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
    });
    return response.data;
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
    throw new Error(getApiErrorMessage(error, '로그인에 실패했습니다.'));
  }
};

/**
 * 회원가입 API 호출
 */
export const signupUser = async (data: SignUpRequest): Promise<SignUpResponse> => {
  try {
    const response = await api.post<SignUpResponse>('/auth/signup', data, {
      skipGlobalErrorHandler: true,
    });
    return response.data;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      const errorMessage = error.response?.data?.message ||
        (typeof error.response?.data === 'string' ? error.response.data : `회원가입 실패: ${error.message}`);
      throw new Error(errorMessage);
    }
    throw new Error(getApiErrorMessage(error, '회원가입에 실패했습니다.'));
  }
};

/**
 * 소셜 로그인 URL 생성
 */
import { SERVER_BASE_URL } from '../constants/config';
export const getSocialLoginUrl = (
  provider: 'kakao' | 'google' | 'naver',
  params?: { mode?: 'link'; linkToken?: string }
): string => {
  const url = `${SERVER_BASE_URL}/oauth2/authorization/${provider}`;
  if (params) {
    const query = new URLSearchParams();
    if (params.mode) query.append('mode', params.mode);
    if (params.linkToken) query.append('linkToken', params.linkToken);
    return `${url}?${query.toString()}`;
  }
  return url;
};

/**
 * OAuth2 계정 연동을 위한 Link Token 발급
 * - 로그인된 상태에서만 호출 가능
 * - 반환된 토큰을 OAuth2 리다이렉트 URL에 포함
 */
export interface LinkTokenResponse {
  linkToken: string;
  expiresIn: number;
}

export const getLinkToken = async (): Promise<LinkTokenResponse> => {
  try {
    const response = await api.get<LinkTokenResponse>('/auth/link-token', {
      skipGlobalErrorHandler: true,
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '연동 토큰 발급에 실패했습니다.'));
  }
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
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '이메일 발송에 실패했습니다.'));
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
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '비밀번호 변경에 실패했습니다.'));
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