import {
  createPost as createCheerPost,
  normalizeCheerPostType,
  type CheerPostType,
  type ShareMode,
} from '../api/cheerApi';
import { uploadMediaFiles } from '../api/media';
import { parseError } from './errorUtils';

export interface SubmitCheerPostPayload {
  teamId: string;
  content: string;
  files: File[];
  postType?: CheerPostType;
  shareMode?: ShareMode;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceAuthor?: string;
  sourceLicense?: string;
  sourceLicenseUrl?: string;
  sourceChangedNote?: string;
  sourceSnapshotType?: string;
  diaryId?: number;
  partyId?: number;
}

export async function submitCheerPost(payload: SubmitCheerPostPayload) {
  const postType = normalizeCheerPostType(payload.postType);
  let uploadedUrls: string[] = [];

  if (payload.files.length > 0) {
    try {
      const uploadedAssets = await uploadMediaFiles('CHEER', payload.files);
      uploadedUrls = uploadedAssets.map((asset) => asset.storagePath);
    } catch (error) {
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

  const created = await createCheerPost({
    teamId: payload.teamId,
    content: payload.content,
    images: uploadedUrls,
    postType,
    shareMode: payload.shareMode,
    sourceUrl: payload.sourceUrl,
    sourceTitle: payload.sourceTitle,
    sourceAuthor: payload.sourceAuthor,
    sourceLicense: payload.sourceLicense,
    sourceLicenseUrl: payload.sourceLicenseUrl,
    sourceChangedNote: payload.sourceChangedNote,
    sourceSnapshotType: payload.sourceSnapshotType,
    diaryId: payload.diaryId,
    partyId: payload.partyId,
  }, { skipAuthSessionHandling: true });

  return { created, uploadedUrls, uploadFailed: false };
}
