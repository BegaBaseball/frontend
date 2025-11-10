// 이미지 정보 타입
export interface PostImageInfo {
  id: number;
  storagePath: string;
  mimeType: string;
  bytes: number;
  isThumbnail: boolean;
}

const API_BASE = '/api';

// 백엔드 API로 이미지 업로드
export async function uploadPostImages(postId: number, files: File[]): Promise<void> {
  if (files.length === 0) {
    return;
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`${API_BASE}/posts/${postId}/images`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '이미지 업로드에 실패했습니다.');
  }
}

// 게시글의 이미지 목록 조회
export async function listPostImages(postId: number): Promise<PostImageInfo[]> {
  const response = await fetch(`${API_BASE}/posts/${postId}/images`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '이미지 목록 조회에 실패했습니다.');
  }

  return response.json();
}

// 이미지 삭제
export async function deleteImage(imageId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/images/${imageId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '이미지 삭제에 실패했습니다.');
  }
}

// 서명된 URL 갱신
export async function renewSignedUrl(imageId: number): Promise<{ signedUrl: string; expiresAt?: string }> {
  const response = await fetch(`${API_BASE}/images/${imageId}/signed-url`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '서명된 URL 생성에 실패했습니다.');
  }

  const json = await response.json();

  // signedUrl, signed_url, url 등 다양한 키 처리
  const raw = json.signedUrl ?? json.signed_url ?? json.url;
  if (!raw) {
    throw new Error('signed url 없음');
  }

  // 절대 URL 강제 (상대 경로인 경우 Supabase URL 붙이기)
  const base = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8080';
  const signedUrl = raw.startsWith('http') ? raw : `${base}${raw}`;

  return {
    signedUrl,
    expiresAt: json.expiresAt
  };
}

// ============================================
// 🔥 프로필 이미지 직접 업로드 (Edge Function 없이)
// ============================================
export async function uploadProfileImage(userId: string, file: File): Promise<string[]> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = fileName;
    //const filePath = `profiles/${fileName}`;

    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        upsert: true,
      });

    if (error) throw error;

    const { data: publicData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    return [publicData.publicUrl];
  } catch (error) {
    console.error('프로필 이미지 업로드 실패:', error);
    throw error;
  }
}