import {
  UserProfile,
  UserProfileApiResponse,
  ProfileImageDto,
  ProfileUpdateData,
  ProfileUpdateResponse,
  UserProviderDto,
  DeviceSessionItem,
  SecurityEventItem,
  TrustedDeviceItem,
  AccountDeletionScheduleResponse,
} from '../types/profile';
import api from './axios';
import { getApiErrorMessage } from '../utils/errorUtils';
import { AxiosError } from 'axios';
import { compressImage } from '../utils/imageCompression';

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

/**
 * 사용자 프로필 조회
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  try {
    const response = await api.get<UserProfileApiResponse>('/auth/mypage');

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '프로필 데이터를 불러올 수 없습니다.');
    }
    return normalizeUserProfile(response.data.data);
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '프로필 조회 실패'));
  }
}

/**
 * 프로필 이미지 업로드
 */
export async function uploadProfileImage(file: File): Promise<ProfileImageDto> {
  let fileToUpload = file;
  try {
    fileToUpload = await compressImage(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1536,
      initialQuality: 0.88,
      useWebWorker: true,
    });
  } catch (compressionError) {
    console.warn('프로필 이미지 선압축에 실패하여 원본 업로드를 진행합니다.', compressionError);
    fileToUpload = file;
  }

  const formData = new FormData();
  formData.append('file', fileToUpload);

  try {
    const response = await api.postForm('/profile/image', formData);

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || '프로필 이미지 업로드에 실패했습니다.');
    }
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '프로필 이미지 업로드에 실패했습니다.'));
  }
}

/**
 * 프로필 정보 업데이트
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ProfileUpdateResponse> {
  try {
    const response = await api.put<ProfileUpdateResponse>('/auth/mypage', data);

    if (!response.data.success) {
      throw new Error(response.data.message || '프로필 저장에 실패했습니다.');
    }

    return {
      ...response.data,
      data: {
        ...response.data.data,
        favoriteTeam: normalizeFavoriteTeam(response.data.data?.favoriteTeam),
      },
    };
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      throw new Error('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
    }
    throw new Error(getApiErrorMessage(error, '프로필 저장 실패'));
  }
}

/**
 * 비밀번호 변경
 */
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

const isNicknameCheckResponse = (value: unknown): value is NicknameCheckResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'available' in value &&
    typeof (value as { available: unknown }).available === 'boolean'
  );
};

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  try {
    const response = await api.put('/auth/password', data);

    if (!response.data.success) {
      throw new Error(response.data.message || '비밀번호 변경에 실패했습니다.');
    }
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status === 401) {
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
    const response = await api.delete<{ success: boolean; data?: AccountDeletionScheduleResponse; message?: string }>('/auth/account', {
      data: password ? { password } : undefined
    });

    if (!response.data.success) {
      throw new Error(response.data.message || '계정 삭제 예약에 실패했습니다.');
    }

    return response.data.data || { scheduledFor: '' };
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status === 401) {
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
    const response = await api.get<{ success: boolean; data: UserProviderDto[]; message?: string }>('/auth/providers');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '연동 정보를 불러올 수 없습니다.');
    }
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '연동 정보 조회 실패'));
  }
}

/**
 * 계정 연동 해제
 */
export async function unlinkProvider(provider: string): Promise<void> {
  try {
    const response = await api.delete(`/auth/providers/${provider}`);
    if (!response.data.success) {
      throw new Error(response.data.message || '연동 해제에 실패했습니다.');
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
    const response = await api.get<{ success: boolean; data: DeviceSessionItem | DeviceSessionItem[]; message?: string }>(`/auth/sessions`);
    if (!response.data.success) {
      return [];
    }

    const data = response.data.data;
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
    const response = await api.delete<{ success: boolean; message?: string; data?: never }>(`/auth/sessions/${sessionId}`);
    if (!response.data.success) {
      throw new Error(response.data.message || '기기 세션을 종료하지 못했습니다.');
    }

    return response.data.message || '기기 세션이 종료되었습니다.';
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '기기 세션 종료에 실패했습니다.'));
  }
}

/**
 * 현재 기기 제외 전체 세션 종료
 */
export async function deleteOtherDeviceSessions(): Promise<string> {
  try {
    const response = await api.delete<{ success: boolean; message?: string; data?: never }>('/auth/sessions', {
      params: { allExceptCurrent: true },
    });
    if (!response.data.success) {
      throw new Error(response.data.message || '세션 종료에 실패했습니다.');
    }

    return response.data.message || '현재 기기 제외 다른 기기 로그아웃이 완료되었습니다.';
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '기기 세션 종료에 실패했습니다.'));
  }
}

export async function getSecurityEvents(): Promise<SecurityEventItem[]> {
  try {
    const response = await api.get<{ success: boolean; data?: SecurityEventItem[]; message?: string }>('/auth/security-events');
    if (!response.data.success) {
      throw new Error(response.data.message || '보안 활동을 불러오지 못했습니다.');
    }

    return response.data.data || [];
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '보안 활동 조회에 실패했습니다.'));
  }
}

export async function getTrustedDevices(): Promise<TrustedDeviceItem[]> {
  try {
    const response = await api.get<{ success: boolean; data?: TrustedDeviceItem[]; message?: string }>('/auth/trusted-devices');
    if (!response.data.success) {
      throw new Error(response.data.message || '신뢰 기기 정보를 불러오지 못했습니다.');
    }

    return response.data.data || [];
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '신뢰 기기 조회에 실패했습니다.'));
  }
}

export async function deleteTrustedDevice(deviceId: number): Promise<void> {
  try {
    const response = await api.delete<{ success: boolean; message?: string }>(`/auth/trusted-devices/${deviceId}`);
    if (!response.data.success) {
      throw new Error(response.data.message || '신뢰 기기 해제에 실패했습니다.');
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
    const response = await api.get<{ success: boolean; message?: string; data?: unknown }>(`/auth/check-name`, {
      params: { name },
      skipGlobalErrorHandler: true,
    });

    if (!response.data.success) {
      return {
        available: false,
        message: response.data.message || '현재 닉네임을 사용할 수 없습니다.',
      };
    }

    const payload = response.data.data;
    if (isNicknameCheckResponse(payload)) {
      return payload;
    }

    return {
      available: false,
      message: response.data.message || '사용 여부를 확인할 수 없습니다.',
    };
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? null;
      const data = error.response?.data as { message?: string; data?: unknown } | undefined;
      if (status === 400 || status === 409) {
        const payload = data?.data;
        if (isNicknameCheckResponse(payload)) {
          return payload;
        }

        return {
          available: false,
          message: data?.message || '현재 닉네임을 사용할 수 없습니다.',
        };
      }
    }

    throw new Error(getApiErrorMessage(error, '닉네임 중복 확인에 실패했습니다.'));
  }
}
