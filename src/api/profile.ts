import {
  AccountDeletionScheduleResponse,
  DeviceSessionItem,
  ProfileImageDto,
  ProfileUpdateData,
  ProfileUpdateResponse,
  SecurityEventItem,
  TrustedDeviceItem,
  UserProfile,
  UserProfileApiResponse,
  UserProviderDto,
} from '../types/profile';
import { getApiErrorMessage } from '../utils/errorUtils';
import { uploadMediaFile } from './media';
import { getApiErrorStatus } from './errorStatus';
import {
  PrivateApiError,
  privateDelete,
  privateGet,
  privatePost,
  privatePut,
} from './privateClient';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NicknameCheckResponse {
  available: boolean;
  message?: string;
  normalized?: string;
}

const normalizeFavoriteTeam = (value?: string | null): string | null => {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' || trimmed === '없음' ? null : trimmed;
};

const normalizeUserProfile = (profile: UserProfile): UserProfile => ({
  ...profile,
  favoriteTeam: normalizeFavoriteTeam(profile.favoriteTeam),
});

const getPrivateEnvelope = (error: unknown): ApiEnvelope<unknown> | null => {
  if (!(error instanceof PrivateApiError) || !error.data || typeof error.data !== 'object') {
    return null;
  }

  return error.data as ApiEnvelope<unknown>;
};

const isNicknameCheckResponse = (value: unknown): value is NicknameCheckResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return 'available' in value && typeof (value as { available: unknown }).available === 'boolean';
};

/**
 * 사용자 프로필 조회
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  try {
    const response = await privateGet<UserProfileApiResponse>('/auth/mypage');

    if (!response.success || !response.data) {
      throw new Error(response.message || '프로필 데이터를 불러올 수 없습니다.');
    }

    return normalizeUserProfile(response.data);
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '프로필 조회 실패'));
  }
}

/**
 * 프로필 이미지 업로드
 */
export async function uploadProfileImage(file: File): Promise<ProfileImageDto> {
  try {
    const response = await uploadMediaFile('PROFILE', file);
    return {
      storagePath: response.storagePath,
      publicUrl: response.publicUrl,
    };
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '프로필 이미지 업로드에 실패했습니다.'));
  }
}

/**
 * 프로필 정보 업데이트
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ProfileUpdateResponse> {
  try {
    const response = await privatePut<ProfileUpdateResponse, ProfileUpdateData>('/auth/mypage', data);

    if (!response.success) {
      throw new Error(response.message || '프로필 저장에 실패했습니다.');
    }

    return {
      ...response,
      data: {
        ...response.data,
        favoriteTeam: normalizeFavoriteTeam(response.data?.favoriteTeam),
      },
    };
  } catch (error: unknown) {
    if (getApiErrorStatus(error) === 401) {
      throw new Error('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
    }

    throw new Error(getApiErrorMessage(error, '프로필 저장 실패'));
  }
}

/**
 * 비밀번호 변경
 */
export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  try {
    const response = await privatePut<ApiEnvelope<never>, ChangePasswordRequest>('/auth/password', data, {
      skipAuthSessionHandling: true,
    });

    if (!response.success) {
      throw new Error(response.message || '비밀번호 변경에 실패했습니다.');
    }
  } catch (error: unknown) {
    if (getApiErrorStatus(error) === 401) {
      throw new Error('현재 비밀번호가 일치하지 않습니다.');
    }

    throw new Error(getApiErrorMessage(error, '비밀번호 변경에 실패했습니다.'));
  }
}

/**
 * 계정 삭제 (회원탈퇴)
 */
export async function deleteAccount(password?: string): Promise<AccountDeletionScheduleResponse> {
  try {
    const response = await privateDelete<ApiEnvelope<AccountDeletionScheduleResponse>, { password: string }>(
      '/auth/account',
      {
        body: password ? { password } : undefined,
        skipAuthSessionHandling: true,
      },
    );

    if (!response.success) {
      throw new Error(response.message || '계정 삭제 예약에 실패했습니다.');
    }

    return response.data || { scheduledFor: '' };
  } catch (error: unknown) {
    if (getApiErrorStatus(error) === 401) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }

    throw new Error(getApiErrorMessage(error, '계정 삭제 예약에 실패했습니다.'));
  }
}

/**
 * 연동된 계정 목록 조회
 */
export async function getConnectedProviders(): Promise<UserProviderDto[]> {
  try {
    const response = await privateGet<ApiEnvelope<UserProviderDto[]>>('/auth/providers');

    if (!response.success || !response.data) {
      throw new Error(response.message || '연동 정보를 불러올 수 없습니다.');
    }

    return response.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '연동 정보 조회 실패'));
  }
}

/**
 * 계정 연동 해제
 */
export async function unlinkProvider(provider: string): Promise<void> {
  try {
    const response = await privateDelete<ApiEnvelope<never>>(`/auth/providers/${encodeURIComponent(provider)}`);

    if (!response.success) {
      throw new Error(response.message || '연동 해제에 실패했습니다.');
    }
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '연동 해제 실패'));
  }
}

/**
 * 로그인 기기 목록 조회
 */
export async function getDeviceSessions(): Promise<DeviceSessionItem[]> {
  try {
    const response = await privateGet<ApiEnvelope<DeviceSessionItem | DeviceSessionItem[]>>('/auth/sessions');

    if (!response.success) {
      return [];
    }

    const data = response.data;
    if (!data) {
      return [];
    }

    if (Array.isArray(data)) {
      return data;
    }

    return [data];
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '기기 목록 조회에 실패했습니다.'));
  }
}

/**
 * 특정 기기 세션 종료
 */
export async function deleteDeviceSession(sessionId: string): Promise<string> {
  try {
    const response = await privateDelete<ApiEnvelope<never>>(`/auth/sessions/${encodeURIComponent(sessionId)}`);

    if (!response.success) {
      throw new Error(response.message || '기기 세션을 종료하지 못했습니다.');
    }

    return response.message || '기기 세션이 종료되었습니다.';
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '기기 세션 종료에 실패했습니다.'));
  }
}

/**
 * 현재 기기 제외 전체 세션 종료
 */
export async function deleteOtherDeviceSessions(): Promise<string> {
  try {
    const response = await privateDelete<ApiEnvelope<never>>('/auth/sessions', {
      params: { allExceptCurrent: true },
    });

    if (!response.success) {
      throw new Error(response.message || '세션 종료에 실패했습니다.');
    }

    return response.message || '현재 기기 제외 다른 기기 로그아웃이 완료되었습니다.';
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '기기 세션 종료에 실패했습니다.'));
  }
}

export async function getSecurityEvents(): Promise<SecurityEventItem[]> {
  try {
    const response = await privateGet<ApiEnvelope<SecurityEventItem[]>>('/auth/security-events');

    if (!response.success) {
      throw new Error(response.message || '보안 활동을 불러오지 못했습니다.');
    }

    return response.data || [];
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '보안 활동 조회에 실패했습니다.'));
  }
}

export async function getTrustedDevices(): Promise<TrustedDeviceItem[]> {
  try {
    const response = await privateGet<ApiEnvelope<TrustedDeviceItem[]>>('/auth/trusted-devices');

    if (!response.success) {
      throw new Error(response.message || '신뢰 기기 정보를 불러오지 못했습니다.');
    }

    return response.data || [];
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '신뢰 기기 조회에 실패했습니다.'));
  }
}

export async function deleteTrustedDevice(deviceId: number): Promise<void> {
  try {
    const response = await privateDelete<ApiEnvelope<never>>(`/auth/trusted-devices/${deviceId}`);

    if (!response.success) {
      throw new Error(response.message || '신뢰 기기 해제에 실패했습니다.');
    }
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '신뢰 기기 해제에 실패했습니다.'));
  }
}

/**
 * 닉네임 중복/사용 가능 여부 체크
 */
export async function checkNicknameAvailability(name: string): Promise<NicknameCheckResponse> {
  try {
    const response = await privateGet<ApiEnvelope<unknown>>('/auth/check-name', {
      params: { name },
    });

    if (!response.success) {
      return {
        available: false,
        message: response.message || '현재 닉네임을 사용할 수 없습니다.',
      };
    }

    if (isNicknameCheckResponse(response.data)) {
      return response.data;
    }

    return {
      available: false,
      message: response.message || '사용 여부를 확인할 수 없습니다.',
    };
  } catch (error: unknown) {
    const status = getApiErrorStatus(error);
    if (status === 400 || status === 409) {
      const payload = getPrivateEnvelope(error);
      if (isNicknameCheckResponse(payload?.data)) {
        return payload.data;
      }

      return {
        available: false,
        message: payload?.message || '현재 닉네임을 사용할 수 없습니다.',
      };
    }

    throw new Error(getApiErrorMessage(error, '닉네임 중복 확인에 실패했습니다.'));
  }
}
