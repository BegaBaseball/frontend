import type { InfiniteData } from '@tanstack/react-query';
import {
  createPost as createCheerPost,
  normalizeCheerPostTarget,
  type CheerPost,
  type PageResponse,
  type ShareMode,
} from '../api/cheerApi';
import { uploadMediaFiles } from '../api/media';
import { parseError } from './errorUtils';

interface SubmitCheerPostBase {
  teamId: string;
  content: string;
  files: File[];
  shareMode?: ShareMode;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceAuthor?: string;
  sourceLicense?: string;
  sourceLicenseUrl?: string;
  sourceChangedNote?: string;
  sourceSnapshotType?: string;
}

export type SubmitCheerPostPayload =
  | (SubmitCheerPostBase & { postType?: 'NORMAL'; diaryId?: never; partyId?: never })
  | (SubmitCheerPostBase & { postType: 'NOTICE'; diaryId?: never; partyId?: never })
  | (SubmitCheerPostBase & { postType: 'CHECKIN'; diaryId: number; partyId?: never })
  | (SubmitCheerPostBase & { postType: 'RECRUITMENT'; diaryId?: never; partyId: number });

export function removeOptimisticCheerPostFromFeed(
  data: InfiniteData<PageResponse<CheerPost>> | undefined,
  optimisticId: number,
): InfiniteData<PageResponse<CheerPost>> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      content: (page.content ?? []).filter((post) => post.id !== optimisticId),
    })),
  };
}

export async function submitCheerPost(payload: SubmitCheerPostPayload) {
  if (!payload.content.trim()) {
    throw new Error('CHEER_POST_CONTENT_REQUIRED');
  }
  const target = normalizeCheerPostTarget(payload.postType, payload.diaryId, payload.partyId);
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
    ...target,
    shareMode: payload.shareMode,
    sourceUrl: payload.sourceUrl,
    sourceTitle: payload.sourceTitle,
    sourceAuthor: payload.sourceAuthor,
    sourceLicense: payload.sourceLicense,
    sourceLicenseUrl: payload.sourceLicenseUrl,
    sourceChangedNote: payload.sourceChangedNote,
    sourceSnapshotType: payload.sourceSnapshotType,
  }, { skipAuthSessionHandling: true });

  return { created, uploadedUrls, uploadFailed: false };
}
