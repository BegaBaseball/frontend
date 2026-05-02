import { getApiErrorMessage } from '../utils/errorUtils';
import { compressImage } from '../utils/imageCompression';
import type {
  FinalizeMediaUploadResponse,
  InitMediaUploadRequest,
  InitMediaUploadResponse,
  MediaDomain,
} from '../types/media';
import { privateDelete, privatePost } from './privateClient';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof document === 'undefined') {
    throw new Error('이미지 업로드는 브라우저 환경에서만 지원됩니다.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('이미지 크기를 확인할 수 없습니다.'));
      nextImage.src = objectUrl;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadToPresignedUrl(
  uploadUrl: string,
  requiredHeaders: Record<string, string>,
  file: File,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: requiredHeaders,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`스토리지 업로드 실패 (${response.status})`);
  }
}

export async function uploadMediaFile(
  domain: MediaDomain,
  file: File,
): Promise<FinalizeMediaUploadResponse> {
  let assetId: number | null = null;
  try {
    const fileToUpload = await compressImage(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      initialQuality: 0.82,
      useWebWorker: true,
    });
    const dimensions = await getImageDimensions(fileToUpload);

    const initPayload: InitMediaUploadRequest = {
      domain,
      fileName: fileToUpload.name,
      contentType: fileToUpload.type || 'application/octet-stream',
      contentLength: fileToUpload.size,
      width: dimensions.width,
      height: dimensions.height,
    };

    const initResponse = await privatePost<ApiEnvelope<InitMediaUploadResponse>, InitMediaUploadRequest>(
      '/media/uploads/init',
      initPayload,
    );

    if (!initResponse.success || !initResponse.data) {
      throw new Error(initResponse.message || '미디어 업로드 준비에 실패했습니다.');
    }

    assetId = initResponse.data.assetId;
    await uploadToPresignedUrl(
      initResponse.data.uploadUrl,
      initResponse.data.requiredHeaders || {},
      fileToUpload,
    );

    const finalizeResponse = await privatePost<ApiEnvelope<FinalizeMediaUploadResponse>>(
      `/media/uploads/${assetId}/finalize`,
    );

    if (!finalizeResponse.success || !finalizeResponse.data) {
      throw new Error(finalizeResponse.message || '미디어 업로드 완료 처리에 실패했습니다.');
    }

    return finalizeResponse.data;
  } catch (error: unknown) {
    if (assetId != null) {
      try {
        await privateDelete(`/media/uploads/${assetId}`);
      } catch {
        // Best effort cleanup only.
      }
    }
    throw new Error(getApiErrorMessage(error, '미디어 업로드에 실패했습니다.'));
  }
}

export async function uploadMediaFiles(
  domain: MediaDomain,
  files: File[],
): Promise<FinalizeMediaUploadResponse[]> {
  return Promise.all(files.map((file) => uploadMediaFile(domain, file)));
}
