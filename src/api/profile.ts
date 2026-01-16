import {
  UserProfile,
  UserProfileApiResponse,
  ProfileImageDto,
  ProfileUpdateData,
  ProfileUpdateResponse,
  UserProviderDto,
  PublicUserProfile
} from '../types/profile';
import api from './axios';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * 다른 사용자 프로필 조회 (공개 정보)
 */
export async function fetchPublicUserProfile(userId: number): Promise<PublicUserProfile> {
  try {
    const response = await api.get<{ success: boolean; data: PublicUserProfile; message?: string }>(`/users/${userId}/profile`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '프로필 데이터를 불러올 수 없습니다.');
    }
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || '프로필 조회 실패');
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
  } catch (error: any) {
    throw new Error(error.response?.data?.message || '프로필 조회 실패');
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
  } catch (error: any) {
    throw new Error(error.response?.data?.message || '프로필 이미지 업로드에 실패했습니다.');
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
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
    }
    throw new Error(error.response?.data?.message || `프로필 저장 실패`);
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

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  try {
    const response = await api.put('/auth/password', data);

    if (!response.data.success) {
      throw new Error(response.data.message || '비밀번호 변경에 실패했습니다.');
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('현재 비밀번호가 일치하지 않습니다.');
    }
    throw new Error(error.response?.data?.message || '비밀번호 변경에 실패했습니다.');
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
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }
    throw new Error(error.response?.data?.message || '계정 삭제에 실패했습니다.');
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
  } catch (error: any) {
    throw new Error(error.response?.data?.message || '연동 정보 조회 실패');
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
  } catch (error: any) {
    throw new Error(error.response?.data?.message || '연동 해제 실패');
  }
}