import { SERVER_BASE_URL } from '../constants/config';
import { parseError } from '../utils/errorUtils';
import { sanitizeLoginRedirect } from '../utils/loginRedirect';
import { getApiBaseUrl } from './apiBase';
import {
  PublicApiError,
  publicGet,
  publicPost,
} from './publicClient';
import type {
  LoginRequest,
  LoginResponse,
  OAuth2StateData,
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  PolicyConsentPayloadItem,
  SignUpAvailabilityResponse,
  SignUpConflictField,
  SignUpRequest,
  SignUpResponse,
} from './auth';

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

interface PublicApiEnvelope {
  success?: boolean;
  message?: string | null;
  code?: string | null;
  data?: unknown;
  errors?: Record<string, unknown>;
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

const SIGNUP_SUBMIT_TIMEOUT_MS = 20_000;
const LOGIN_SUBMIT_TIMEOUT_MS = 20_000;
const SIGNUP_POLICY_TIMEOUT_MESSAGE = '필수 정책 정보를 불러오는 중 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
const SIGNUP_SUBMIT_TIMEOUT_MESSAGE = '회원가입 요청 처리에 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요. 같은 이메일이 이미 가입되었는지도 확인해주세요.';
const SIGNUP_HANDLE_CHECK_ERROR_MESSAGE = '핸들 중복 확인에 실패했습니다.';

export class SignUpSubmissionError extends Error {
  field?: SignUpConflictField;
  normalized?: string;
  code?: string;

  constructor(
    message: string,
    options: {
      field?: SignUpConflictField;
      normalized?: string;
      code?: string;
    } = {},
  ) {
    super(message);
    this.name = 'SignUpSubmissionError';
    this.field = options.field;
    this.normalized = options.normalized;
    this.code = options.code;
  }
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

const getFieldErrorMessage = (error: unknown): string | null => {
  if (!error || typeof error !== 'object' || !('data' in (error as Record<string, unknown>))) {
    return null;
  }

  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== 'object' || !('errors' in (data as Record<string, unknown>))) {
    return null;
  }

  const errors = (data as { errors?: unknown }).errors;
  if (!errors || typeof errors !== 'object') {
    return null;
  }

  return Object.values(errors as Record<string, unknown>).find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  ) ?? null;
};

const isPublicTimeoutError = (error: unknown): boolean =>
  error instanceof Error && /^Request timed out after \d+ms$/i.test(error.message);

const isSignUpAvailabilityResponse = (value: unknown): value is SignUpAvailabilityResponse => (
  typeof value === 'object'
  && value !== null
  && 'available' in value
  && typeof (value as { available: unknown }).available === 'boolean'
  && (!('normalized' in value) || typeof (value as { normalized?: unknown }).normalized === 'string' || (value as { normalized?: unknown }).normalized === undefined)
  && (!('message' in value) || typeof (value as { message?: unknown }).message === 'string' || (value as { message?: unknown }).message === undefined)
);

const getPublicErrorEnvelope = (error: PublicApiError): PublicApiEnvelope | null => {
  if (!error.data || typeof error.data !== 'object') {
    return null;
  }

  return error.data as PublicApiEnvelope;
};

const extractConflictNormalized = (
  payload: unknown,
  field: SignUpConflictField,
): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[field];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const resolveAvailabilityResponse = (
  payload: unknown,
  fallbackMessage: string,
): SignUpAvailabilityResponse => {
  if (isSignUpAvailabilityResponse(payload)) {
    return payload;
  }

  return {
    available: false,
    message: fallbackMessage,
  };
};

const fetchRequiredPolicyConsents = async (): Promise<PolicyConsentPayloadItem[]> => {
  const response = await publicGet<RequiredPoliciesApiResponse>('/auth/policies/required');
  const policies = response.data?.policies;

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

const resolvePolicyConsentsForSignup = async (
  policyConsents?: PolicyConsentPayloadItem[],
): Promise<PolicyConsentPayloadItem[]> => {
  if (policyConsents && policyConsents.length > 0) {
    return policyConsents;
  }

  try {
    return await fetchRequiredPolicyConsents();
  } catch (error) {
    if (isPublicTimeoutError(error)) {
      throw new Error(SIGNUP_POLICY_TIMEOUT_MESSAGE);
    }

    throw new Error(parseError(error).message || '필수 정책 정보를 불러오지 못했습니다.');
  }
};

const checkSignUpAvailability = async (
  endpoint: string,
  paramName: 'handle' | 'email',
  value: string,
  signal: AbortSignal | undefined,
  fallbackMessage: string,
): Promise<SignUpAvailabilityResponse> => {
  try {
    const response = await publicGet<PublicApiEnvelope>(endpoint, {
      params: { [paramName]: value },
      signal,
    });
    return resolveAvailabilityResponse(response.data, fallbackMessage);
  } catch (error) {
    if (error instanceof PublicApiError && (error.status === 400 || error.status === 409)) {
      const envelope = getPublicErrorEnvelope(error);
      const availability = resolveAvailabilityResponse(
        envelope?.data,
        envelope?.message || fallbackMessage,
      );

      return {
        ...availability,
        message: availability.message || envelope?.message || fallbackMessage,
      };
    }

    throw new Error(parseError(error).message || fallbackMessage);
  }
};

export const checkSignUpHandleAvailability = async (
  handle: string,
  signal?: AbortSignal,
): Promise<SignUpAvailabilityResponse> => checkSignUpAvailability(
  '/auth/check-handle',
  'handle',
  handle,
  signal,
  SIGNUP_HANDLE_CHECK_ERROR_MESSAGE,
);

// [Security Fix - Critical #3] User Enumeration 방지를 위해 /auth/check-email 엔드포인트가 제거되었다.
// 이메일 중복 여부는 회원가입 요청 시 백엔드의 DUPLICATE_EMAIL 응답으로만 확인한다.

export const loginUser = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await publicPost<RawLoginResponse, LoginRequest>(
      '/auth/login',
      credentials,
      {
        timeoutMs: LOGIN_SUBMIT_TIMEOUT_MS,
      },
    );
    return normalizeLoginResponse(response);
  } catch (error) {
    const parsed = parseError(error);

    if (parsed.statusCode === 401) {
      throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
    }

    if (parsed.statusCode === 403 && parsed.message) {
      throw new Error(parsed.message);
    }

    throw new Error(parsed.message || '로그인에 실패했습니다.');
  }
};

export const signupUser = async (data: SignUpRequest): Promise<SignUpResponse> => {
  const policyConsents = await resolvePolicyConsentsForSignup(data.policyConsents);

  try {
    return await publicPost<SignUpResponse, SignUpRequest>(
      '/auth/signup',
      {
        ...data,
        policyConsents,
      },
      {
        timeoutMs: SIGNUP_SUBMIT_TIMEOUT_MS,
      },
    );
  } catch (error) {
    if (isPublicTimeoutError(error)) {
      throw new Error(SIGNUP_SUBMIT_TIMEOUT_MESSAGE);
    }

    const fieldError = getFieldErrorMessage(error);
    if (fieldError) {
      throw new Error(fieldError);
    }

    if (error instanceof PublicApiError) {
      const parsed = parseError(error);
      const envelope = getPublicErrorEnvelope(error);

      if (parsed.responseCode === 'HANDLE_UNAVAILABLE') {
        throw new SignUpSubmissionError(
          parsed.message || '이미 사용 중인 아이디(@handle)입니다.',
          {
            code: parsed.responseCode,
            field: 'handle',
            normalized: extractConflictNormalized(envelope?.data, 'handle'),
          },
        );
      }

      if (parsed.responseCode === 'DUPLICATE_EMAIL') {
        throw new SignUpSubmissionError(
          parsed.message || '이미 사용 중인 이메일입니다.',
          {
            code: parsed.responseCode,
            field: 'email',
            normalized: extractConflictNormalized(envelope?.data, 'email'),
          },
        );
      }
    }

    const parsed = parseError(error);
    throw new Error(parsed.message || '회원가입에 실패했습니다. 입력 정보를 확인하거나 잠시 후 다시 시도해주세요.');
  }
};

type SocialLoginProvider = 'kakao' | 'google' | 'naver';

type SocialLoginParams = {
  mode?: 'link';
  linkToken?: string;
};

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const isAbsoluteHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export const resolveOAuthLoginBaseUrl = (
  apiBaseUrl = getApiBaseUrl(),
  serverBaseUrl = SERVER_BASE_URL,
): string => {
  const normalizedApiBaseUrl = normalizeBaseUrl(apiBaseUrl || '');

  if (isAbsoluteHttpUrl(normalizedApiBaseUrl)) {
    try {
      const parsed = new URL(normalizedApiBaseUrl);
      const servicePath = parsed.pathname
        .replace(/\/+$/, '')
        .replace(/\/api$/i, '');
      return normalizeBaseUrl(`${parsed.origin}${servicePath}`);
    } catch {
      // Fall back to the direct backend URL below.
    }
  }

  return normalizeBaseUrl(serverBaseUrl);
};

export const buildSocialLoginUrl = (
  provider: SocialLoginProvider,
  params?: SocialLoginParams,
  oauthLoginBaseUrl = resolveOAuthLoginBaseUrl(),
): string => {
  const url = `${normalizeBaseUrl(oauthLoginBaseUrl)}/oauth2/authorization/${provider}`;
  if (params) {
    const query = new URLSearchParams();
    if (params.mode) query.append('mode', params.mode);
    if (params.linkToken) query.append('linkToken', params.linkToken);
    return `${url}?${query.toString()}`;
  }
  return url;
};

export const getSocialLoginUrl = (
  provider: SocialLoginProvider,
  params?: SocialLoginParams,
): string => buildSocialLoginUrl(provider, params);

export const requestPasswordReset = async (
  email: string,
  redirectPath?: string | null,
): Promise<PasswordResetResponse> => {
  try {
    const redirect = sanitizeLoginRedirect(redirectPath);
    const payload: PasswordResetRequest = redirect ? { email, redirect } : { email };
    return await publicPost<PasswordResetResponse, PasswordResetRequest>(
      '/auth/password/reset/request',
      payload,
    );
  } catch (error) {
    throw new Error(parseError(error).message || '이메일 발송에 실패했습니다.');
  }
};

export const confirmPasswordReset = async (
  token: string,
  newPassword: string,
  confirmPassword: string,
): Promise<PasswordResetConfirmResponse> => {
  try {
    return await publicPost<PasswordResetConfirmResponse, PasswordResetConfirmRequest>(
      '/auth/password/reset/confirm',
      {
        token,
        newPassword,
        confirmPassword,
      },
    );
  } catch (error) {
    throw new Error(parseError(error).message || '비밀번호 변경에 실패했습니다.');
  }
};

export const consumeOAuth2State = async (stateId: string): Promise<OAuth2StateData> =>
  publicGet<OAuth2StateData>(`/auth/oauth2/state/${stateId}`);
