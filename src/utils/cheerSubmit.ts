import {
  createPost as createCheerPost,
  deletePost as deleteCheerPost,
  type ShareMode,
  uploadPostImages,
} from '../api/cheerApi';
import { parseError } from './errorUtils';
import { compressImages } from './imageCompression';

interface SubmitCheerPostPayload {
  teamId: string;
  content: string;
  files: File[];
  postType?: 'NORMAL' | 'NOTICE';
  shareMode?: ShareMode;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceAuthor?: string;
  sourceLicense?: string;
  sourceLicenseUrl?: string;
  sourceChangedNote?: string;
  sourceSnapshotType?: string;
}

export async function submitCheerPost(payload: SubmitCheerPostPayload) {
  const created = await createCheerPost({
    teamId: payload.teamId,
    content: payload.content,
    postType: payload.postType ?? 'NORMAL',
    shareMode: payload.shareMode,
    sourceUrl: payload.sourceUrl,
    sourceTitle: payload.sourceTitle,
    sourceAuthor: payload.sourceAuthor,
    sourceLicense: payload.sourceLicense,
    sourceLicenseUrl: payload.sourceLicenseUrl,
    sourceChangedNote: payload.sourceChangedNote,
    sourceSnapshotType: payload.sourceSnapshotType,
  }, { skipAuthSessionHandling: true });

  let uploadedUrls: string[] = [];

  if (created?.id && payload.files.length > 0) {
    let filesToUpload = payload.files;

    try {
      filesToUpload = await compressImages(payload.files, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        initialQuality: 0.82,
        useWebWorker: true,
      });
    } catch (compressionError) {
      console.warn('이미지 선압축에 실패하여 원본 업로드를 진행합니다.', compressionError);
      filesToUpload = payload.files;
    }

    try {
      uploadedUrls = await uploadPostImages(created.id, filesToUpload, { skipAuthSessionHandling: true });
    } catch (error) {
      console.error('Image upload failed, deleting post...', error);

      try {
        await deleteCheerPost(created.id);
      } catch (deleteError) {
        console.error('Failed to delete post after image upload failure', deleteError);
      }

      const parsedError = parseError(error);
      if (parsedError.type === 'AUTH' || parsedError.responseCode === 'INVALID_AUTHOR') {
        throw error;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('global-api-error', {
          detail: {
            ...parsedError,
            message: `이미지 업로드 실패: ${parsedError.message}`,
          },
        }));
      }

      throw new Error('IMAGE_UPLOAD_FAILED');
    }
  }

  return { created, uploadedUrls, uploadFailed: false };
}
