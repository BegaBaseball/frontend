const API_BASE_URL = '/api/profile';

export interface ProfileImageDto {
  userId: number;
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  bytes: number;
}

/**
 * 프로필 이미지 업로드
 */
export async function uploadProfileImage(file: File): Promise<ProfileImageDto> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/image`, {
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