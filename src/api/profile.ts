import { 
  UserProfile, 
  UserProfileApiResponse, 
  ProfileImageDto, 
  ProfileUpdateData, 
  ProfileUpdateResponse 
} from '../types/profile';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * 사용자 프로필 조회
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/mypage`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('프로필 조회 실패');
  }

  const apiResponse: UserProfileApiResponse = await response.json();

  if (!apiResponse.success || !apiResponse.data) {
    throw new Error(apiResponse.message || '프로필 데이터를 불러올 수 없습니다.');
  }

  return apiResponse.data;
}

/**
 * 프로필 이미지 업로드
 */
export async function uploadProfileImage(file: File): Promise<ProfileImageDto> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/profile/image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '프로필 이미지 업로드에 실패했습니다.');
  }

  const apiResponse = await response.json();

  if (apiResponse.success) {
    return apiResponse.data;
  } else {
    throw new Error(apiResponse.message || '프로필 이미지 업로드에 실패했습니다.');
  }
}

/**
 * 프로필 정보 업데이트
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ProfileUpdateResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/mypage`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
    }
    throw new Error(`프로필 저장 실패: ${response.statusText}`);
  }

  const apiResponse: ProfileUpdateResponse = await response.json();

  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '프로필 저장에 실패했습니다.');
  }

  return apiResponse;
}