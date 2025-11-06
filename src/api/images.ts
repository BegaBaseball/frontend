// 백엔드 API로 이미지 업로드
export async function uploadPostImages(postId: number, files: File[]): Promise<void> {
  if (files.length === 0) {
    return;
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const token = localStorage.getItem('accessToken');
  const response = await fetch(`/api/posts/${postId}/images`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '이미지 업로드에 실패했습니다.');
  }
}
