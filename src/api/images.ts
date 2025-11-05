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
