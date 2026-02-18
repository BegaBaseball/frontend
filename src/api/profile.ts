import {
  UserProfile,
  UserProfileApiResponse,
  ProfileImageDto,
  ProfileUpdateData,
  ProfileUpdateResponse,
  UserProviderDto,
  PublicUserProfile,
  DeviceSessionItem,
} from '../types/profile';
import api from './axios';
import { getApiErrorMessage } from '../utils/errorUtils';
import { AxiosError } from 'axios';

/**
 * 다른 사용자 프로필 조회 (공개 정보 - ID 기준)
 */
export async function fetchPublicUserProfile(userId: number): Promise<PublicUserProfile> {
  try {
    const response = await api.get<{ success: boolean; data: PublicUserProfile; message?: string }>(`/users/${userId}/profile`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '프로필 데이터를 불러올 수 없습니다.');
    }
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '프로필 조회 실패'));
  }
}

/**
 * 다른 사용자 프로필 조회 (공개 정보 - 핸들 기준)
 */
export async function fetchPublicUserProfileByHandle(handle: string): Promise<PublicUserProfile> {
  try {
    const response = await api.get<{ success: boolean; data: PublicUserProfile; message?: string }>(`/users/profile/${handle}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '프로필 데이터를 불러올 수 없습니다.');
    }
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '프로필 조회 실패'));
  }
}

/**
 * 사용자 프로필 조회
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  try {
    const response = await api.get<UserProfileApiResponse>('/auth/mypage');

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '프로필 데이터를 불러올 수 없습니다.');
    }
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '프로필 조회 실패'));
  }
}

/**
 * 프로필 이미지 업로드
 */
export async function uploadProfileImage(file: File): Promise<ProfileImageDto> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

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

    return response.data;
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
export async function deleteAccount(password?: string): Promise<void> {
  try {
    const response = await api.delete('/auth/account', {
      data: password ? { password } : undefined
    });

    if (!response.data.success) {
      throw new Error(response.data.message || '계정 삭제에 실패했습니다.');
    }
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }
    throw new Error(getApiErrorMessage(error, '계정 삭제에 실패했습니다.'));
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

/**
 * 닉네임 중복/사용 가능 여부 체크
 */
export async function checkNicknameAvailability(name: string): Promise<NicknameCheckResponse> {
  try {
    const response = await api.get<{ success: boolean; message?: string; data?: NicknameCheckResponse }>(`/auth/check-name`, {
      params: { name },
    });

    if (!response.data.success) {
      return {
        available: false,
        message: response.data.message || '현재 닉네임을 사용할 수 없습니다.',
      };
    }

    const payload = response.data.data || {};
    if (typeof payload.available === 'boolean') {
      return payload;
    }

    return {
      available: false,
      message: response.data.message || '사용 여부를 확인할 수 없습니다.',
    };
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, '닉네임 중복 확인에 실패했습니다.'));
  }
}
