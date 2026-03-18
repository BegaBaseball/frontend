// api/auth.ts
import api from './axios';
import { getApiErrorMessage } from '../utils/errorUtils';
import { AxiosError } from 'axios';
import { SERVER_BASE_URL } from '../constants/config';
import { sanitizeLoginRedirect } from '../utils/loginRedirect';

// ========== 타입 정의 ==========
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string | null;
  data: {
    id?: number;
    name?: string;
    role?: string;
    handle?: string | null;
    cheerPoints?: number;
  };
}

interface RawLoginResponse {
  success?: boolean;
  message?: string | null;
  data?: {
    id?: number | string;
    name?: string;
    role?: string;
    handle?: string | null;
    cheerPoints?: number | string;
  } | null;
}

interface RawAuthProfileResponse {
  data?: {
    id?: number | string;
    email?: string;
    name?: string;
    handle?: string | null;
    favoriteTeam?: string;
    favoriteTeamColor?: string;
    role?: string;
    profileImageUrl?: string | null;
    provider?: string;
    providerId?: string;
    bio?: string | null;
    cheerPoints?: number | string;
    cheer_points?: number | string;
    hasPassword?: boolean;
  };
}

interface AuthProfile {
  id: number;
  email: string;
  name?: string;
  handle?: string;
  favoriteTeam?: string;
  favoriteTeamColor?: string;
  role?: string;
  profileImageUrl: string | null;
  provider?: string;
  providerId?: string;
  bio?: string | null;
  cheerPoints: number;
  hasPassword?: boolean;
}

const normalizeOptionalNumber = (value: number | string | undefined): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const normalizeLoginResponse = (payload: RawLoginResponse): LoginResponse => ({
  success: payload.success === true,
  message: typeof payload.message === 'string' ? payload.message : null,
  data: {
    id: normalizeOptionalNumber(payload.data?.id),
    name: typeof payload.data?.name === 'string' ? payload.data.name : undefined,
    role: typeof payload.data?.role === 'string' ? payload.data.role : undefined,
    handle:
      typeof payload.data?.handle === 'string'
        ? payload.data.handle
        : payload.data?.handle === null
          ? null
          : undefined,
    cheerPoints: normalizeOptionalNumber(payload.data?.cheerPoints),
  },
});

export const normalizeProfileImageUrl = (value?: string | null): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (
    trimmedValue.startsWith('/assets/') ||
    trimmedValue.startsWith('/src/assets/') ||
    trimmedValue.startsWith('blob:') ||
    trimmedValue.startsWith('data:')
  ) {
    return null;
  }

  return trimmedValue.length > 0 ? trimmedValue : null;
};

const normalizeAuthProfile = (payload: RawAuthProfileResponse): AuthProfile => {
  const profile = payload?.data;
  if (!profile || typeof profile.email !== 'string') {
    throw new Error('유효하지 않은 사용자 정보를 받았습니다.');
  }

  const cheerPoints = normalizeOptionalNumber(profile.cheerPoints)
    ?? normalizeOptionalNumber(profile.cheer_points)
    ?? 0;

  const rawId = normalizeOptionalNumber(profile.id);

  return {
    id: rawId ?? 0,
    email: profile.email,
    name: typeof profile.name === 'string' ? profile.name : undefined,
    handle: typeof profile.handle === 'string' ? profile.handle : undefined,
    favoriteTeam: typeof profile.favoriteTeam === 'string' ? profile.favoriteTeam : undefined,
    favoriteTeamColor: typeof profile.favoriteTeamColor === 'string' ? profile.favoriteTeamColor : undefined,
    role: typeof profile.role === 'string' ? profile.role : undefined,
    profileImageUrl: normalizeProfileImageUrl(profile.profileImageUrl),
    provider: typeof profile.provider === 'string' ? profile.provider : undefined,
    providerId: typeof profile.providerId === 'string' ? profile.providerId : undefined,
    bio: typeof profile.bio === 'string' ? profile.bio : null,
    cheerPoints,
    hasPassword: typeof profile.hasPassword === 'boolean' ? profile.hasPassword : undefined,
  };
};

export const fetchCurrentUserProfile = async (): Promise<AuthProfile> => {
  const response = await api.get<RawAuthProfileResponse>('/auth/mypage', {
    skipGlobalErrorHandler: true,
  });
  return normalizeAuthProfile(response.data);
};

export interface SignUpRequest {
  name: string;
  handle: string;
  email: string;
  password: string;
  confirmPassword: string;
  favoriteTeam: string | null;
  policyConsents?: PolicyConsentPayloadItem[];
}

export interface SignUpResponse {
  success: boolean;
  message: string;
  data?: {
    userId: number;
    email: string;
  };
}

export interface PolicyConsentPayloadItem {
  policyType: string;
  version: string;
  agreed: boolean;
}

interface RequiredPolicyItem {
  policyType?: string;
  version?: string;
  required?: boolean;
}

interface RequiredPoliciesApiResponse {
  success?: boolean;
  message?: string;
  data?: {
    policies?: RequiredPolicyItem[];
  };
}

export interface PasswordResetRequest {
  email: string;
  redirect?: string;
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

const SIGNUP_SUBMIT_TIMEOUT_MS = 20_000;
const SIGNUP_POLICY_TIMEOUT_MESSAGE = '필수 정책 정보를 불러오는 중 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
const SIGNUP_SUBMIT_TIMEOUT_MESSAGE = '회원가입 요청 처리에 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요. 같은 이메일이 이미 가입되었는지도 확인해주세요.';

const isAxiosTimeoutError = (error: unknown): error is AxiosError =>
  error instanceof AxiosError
  && (error.code === 'ECONNABORTED' || /timeout of \d+ms exceeded/i.test(error.message));

const resolvePolicyConsentsForSignup = async (
  policyConsents?: PolicyConsentPayloadItem[],
): Promise<PolicyConsentPayloadItem[]> => {
  if (policyConsents && policyConsents.length > 0) {
    return policyConsents;
  }

  try {
    return await fetchRequiredPolicyConsents();
  } catch (error: unknown) {
    if (isAxiosTimeoutError(error)) {
      throw new Error(SIGNUP_POLICY_TIMEOUT_MESSAGE);
    }

    if (error instanceof AxiosError) {
      throw new Error(getApiErrorMessage(error, '필수 정책 정보를 불러오지 못했습니다.'));
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(getApiErrorMessage(error, '필수 정책 정보를 불러오지 못했습니다.'));
  }
};

// ========== API 함수 ==========

/**
 * 로그인 API 호출
 */
export const loginUser = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await api.post<RawLoginResponse>('/auth/login', credentials, {
      skipGlobalErrorHandler: true, // 로그인 실패 시 모달 대신 폼 에러 표시
    });
    return normalizeLoginResponse(response.data);
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
    if (error instanceof AxiosError && error.response?.status === 403) {
      const responseData = error.response?.data as
        | { message?: string; error?: string }
        | string
        | null
        | undefined;
      const serverMessage =
        (typeof responseData === 'string' ? responseData : responseData?.message || responseData?.error);
      if (serverMessage) {
        throw new Error(serverMessage);
      }
    }
    throw new Error(getApiErrorMessage(error, '로그인에 실패했습니다.'));
  }
};

/**
 * 회원가입 API 호출
 */
export const signupUser = async (data: SignUpRequest): Promise<SignUpResponse> => {
  const policyConsents = await resolvePolicyConsentsForSignup(data.policyConsents);

  try {
    const response = await api.post<SignUpResponse>('/auth/signup', {
      ...data,
      policyConsents,
    }, {
      skipGlobalErrorHandler: true,
      timeout: SIGNUP_SUBMIT_TIMEOUT_MS,
    });
    return response.data;
  } catch (error: unknown) {
    if (isAxiosTimeoutError(error)) {
      throw new Error(SIGNUP_SUBMIT_TIMEOUT_MESSAGE);
    }

    if (error instanceof AxiosError) {
      throw new Error(getApiErrorMessage(error, '회원가입에 실패했습니다.'));
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(getApiErrorMessage(error, '회원가입에 실패했습니다.'));
  }
};

const fetchRequiredPolicyConsents = async (): Promise<PolicyConsentPayloadItem[]> => {
  const response = await api.get<RequiredPoliciesApiResponse>('/auth/policies/required', {
    skipGlobalErrorHandler: true,
  });

  const policies = response.data?.data?.policies;
  if (!Array.isArray(policies) || policies.length === 0) {
    throw new Error('필수 정책 정보를 불러오지 못했습니다.');
  }

  const requiredConsents = policies
    .filter((policy): policy is RequiredPolicyItem & { policyType: string; version: string; required: true } => (
      policy?.required === true
      && typeof policy.policyType === 'string'
      && policy.policyType.length > 0
      && typeof policy.version === 'string'
      && policy.version.length > 0
    ))
    .map((policy) => ({
      policyType: policy.policyType,
      version: policy.version,
      agreed: true,
    }));

  if (requiredConsents.length === 0) {
    throw new Error('필수 정책 동의 항목이 없습니다.');
  }

  return requiredConsents;
};

/**
 * 소셜 로그인 URL 생성
 */
const OAUTH_LOGIN_BASE_URL = SERVER_BASE_URL;

export const getSocialLoginUrl = (
  provider: 'kakao' | 'google' | 'naver',
  params?: { mode?: 'link'; linkToken?: string }
): string => {
  const url = `${OAUTH_LOGIN_BASE_URL}/oauth2/authorization/${provider}`;
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
export const requestPasswordReset = async (
  email: string,
  redirectPath?: string | null,
): Promise<PasswordResetResponse> => {
  try {
    const redirect = sanitizeLoginRedirect(redirectPath);
    const payload: PasswordResetRequest = redirect ? { email, redirect } : { email };
    const response = await api.post<PasswordResetResponse>('/auth/password/reset/request', payload, {
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
  const response = await api.get<OAuth2StateData>(`/auth/oauth2/state/${stateId}`, {
    skipGlobalErrorHandler: true,
    skipAuthSessionHandling: true,
  });
  return response.data;
};
