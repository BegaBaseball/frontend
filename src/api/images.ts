// 이미지 정보 타입
export interface PostImageInfo {
  id: number;
  storagePath: string;
  mimeType: string;
  bytes: number;
  isThumbnail: boolean;
}

// Edge Function 응답 타입
export interface EdgeFunctionImageResponse {
  success: boolean;
  data: {
    path: string;
    publicUrl: string;
    size: number;
    originalSize: number;
    compressionRatio: number;
  };
}

const API_BASE = '/api';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1`;

// Edge Function을 사용한 이미지 업로드 (새로운 방식)
export async function uploadPostImagesEdge(postId: number, files: File[], userId: string): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  const uploadPromises = files.map(async (file) => {
    // 1. 파일 유효성 검사 (Edge Function)
    const validationFormData = new FormData();
    validationFormData.append('file', file);
    
    const validationResponse = await fetch(`${EDGE_FUNCTION_URL}/image-processor?action=validate`, {
      method: 'POST',
      body: validationFormData,
    });

    const validation = await validationResponse.json();
    if (!validation.valid) {
      throw new Error(`${file.name}: ${validation.error}`);
    }

    // 2. 이미지 업로드 및 최적화 (Edge Function)
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('bucket', 'cheer-images');
    uploadFormData.append('postId', postId.toString());
    uploadFormData.append('userId', userId);
    
    const uploadResponse = await fetch(`${EDGE_FUNCTION_URL}/image-processor?action=upload`, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
    }

    const result: EdgeFunctionImageResponse = await uploadResponse.json();
    return result.data.publicUrl;
  });

  return Promise.all(uploadPromises);
}

// 백엔드 API로 이미지 업로드 (기존 방식 - 호환성 유지)
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

