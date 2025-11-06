import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = 'https://zyofzvnkputevakepbdm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b2Z6dm5rcHV0ZXZha2VwYmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0OTI5NTUsImV4cCI6MjA3NjA2ODk1NX0.fCLS2bvh73YvYb9Q2uFS-ZNadRsrrM9ZEm6sLL6kn3c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
// ============================================
// 🔥 기존 게시글 이미지 업로드 (Edge Function 사용)
// ============================================
const SIGN_FUNCTION_URL =
  import.meta.env.VITE_SUPABASE_SIGN_FUNCTION_URL ??
  'https://project-ref.functions.supabase.co/sign-images/sign';

type SignedUploadResponse = {
  uploadUrl: string;
  publicUrl: string;
  headers?: Record<string, string>;
};

async function requestSignedUpload(postId: number, file: File): Promise<SignedUploadResponse> {
  const response = await fetch(SIGN_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      postId,
      fileName: file.name,
      contentType: file.type,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '이미지 업로드에 필요한 서명을 가져오지 못했습니다.');
  }

  return response.json();
}

async function uploadSingleImage(
  postId: number,
  file: File
): Promise<string> {
  const { uploadUrl, publicUrl, headers } = await requestSignedUpload(postId, file);

  const putResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      ...(headers ?? {}),
    },
    body: file,
  });

  if (!putResponse.ok) {
    const message = await putResponse.text();
    throw new Error(message || '이미지 업로드에 실패했습니다.');
  }

  return publicUrl;
}

export async function uploadPostImages(postId: number, files: File[]): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  const uploaded: string[] = [];
  for (const file of files) {
    const publicUrl = await uploadSingleImage(postId, file);
    uploaded.push(publicUrl);
  }
  return uploaded;
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