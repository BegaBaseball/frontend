import {
  PrivateApiError,
  privateGet,
  privatePost,
  requestPrivateReissue,
} from './privateClient';

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

const getInjectedAuthProfileResponse = (): RawAuthProfileResponse | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const injectedResponse = (window as Window & {
    __BEGA_TEST_AUTH_PROFILE__?: RawAuthProfileResponse;
  }).__BEGA_TEST_AUTH_PROFILE__;

  return injectedResponse && typeof injectedResponse === 'object'
    ? injectedResponse
    : null;
};

export interface AuthProfile {
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

export const normalizeProfileImageUrl = (value?: string | null): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (
    trimmedValue.startsWith('/assets/')
    || trimmedValue.startsWith('/src/assets/')
    || trimmedValue.startsWith('blob:')
    || trimmedValue.startsWith('data:')
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

const fetchCurrentUserProfileResponse = async (): Promise<RawAuthProfileResponse> => privateGet<RawAuthProfileResponse>('/auth/mypage', {
  skipAuthSessionHandling: true,
});

export interface FetchCurrentUserProfileOptions {
  retryOn401?: boolean;
}

export const fetchCurrentUserProfile = async (
  options: FetchCurrentUserProfileOptions = {},
): Promise<AuthProfile> => {
  const { retryOn401 = true } = options;
  const injectedResponse = getInjectedAuthProfileResponse();
  if (injectedResponse) {
    return normalizeAuthProfile(injectedResponse);
  }

  try {
    const response = await fetchCurrentUserProfileResponse();
    return normalizeAuthProfile(response);
  } catch (error) {
    if (!(error instanceof PrivateApiError) || error.status !== 401 || !retryOn401) {
      throw error;
    }

    try {
      await requestPrivateReissue();
    } catch {
      throw error;
    }

    const response = await fetchCurrentUserProfileResponse();
    return normalizeAuthProfile(response);
  }
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

export interface SignUpAvailabilityResponse {
  available: boolean;
  message?: string;
  normalized?: string;
}

export type SignUpConflictField = 'handle' | 'email';

export interface PolicyConsentPayloadItem {
  policyType: string;
  version: string;
  agreed: boolean;
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

export const logoutUser = async (): Promise<void> => {
  await privatePost<void, undefined>('/auth/logout', undefined, {
    skipAuthSessionHandling: true,
  });
};

export interface OAuth2StateData {
  email: string;
  name: string;
  role: string;
  profileImageUrl: string | null;
  favoriteTeam: string | null;
  handle: string | null;
}
