import { getApiErrorMessage } from '../utils/errorUtils';
import { uploadMediaFile } from './media';
import { privateDelete, privatePost } from './privateClient';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export const SEAT_VIEW_UPLOAD_TAGS = [
  '탁 트임',
  '응원석 가까움',
  '그늘',
  '비/햇빛 가림',
  '통로 가까움',
  '화장실 가까움',
  '매점 가까움',
  '전광판 잘 보임',
  '포수 뒤',
  '외야 뷰',
  '가성비',
  '아이와 보기 좋음',
] as const;

export type SeatViewUploadTag = typeof SEAT_VIEW_UPLOAD_TAGS[number];

export interface DirectSeatViewUploadInput {
  file: File;
  stadium: string;
  section?: string | null;
  block?: string | null;
  seatRow?: string | null;
  seatNumber?: string | null;
  rating: number;
  comment?: string | null;
  tags?: SeatViewUploadTag[];
}

interface CreateSeatViewRequest {
  storagePath: string;
  stadium: string;
  section?: string;
  block?: string;
  seatRow?: string;
  seatNumber?: string;
  rating: number;
  comment?: string;
  tags: SeatViewUploadTag[];
}

export interface SeatViewSubmission {
  id: number;
  storagePath: string;
  photoUrl: string | null;
  sourceType: 'SEATMAP_UPLOAD' | string;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | string | null;
  aiSuggestedLabel: string | null;
  aiConfidence: number | null;
  stadium: string;
  section: string | null;
  block: string | null;
  seatRow: string | null;
  seatNumber: string | null;
  rating: number;
  comment: string | null;
  tags: SeatViewUploadTag[];
}

const cleanOptional = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

export async function submitDirectSeatViewUpload(input: DirectSeatViewUploadInput): Promise<SeatViewSubmission> {
  let uploadedAssetId: number | null = null;

  try {
    const uploaded = await uploadMediaFile('SEAT_VIEW', input.file);
    uploadedAssetId = uploaded.assetId;
    const payload: CreateSeatViewRequest = {
      storagePath: uploaded.storagePath,
      stadium: input.stadium.trim(),
      section: cleanOptional(input.section),
      block: cleanOptional(input.block),
      seatRow: cleanOptional(input.seatRow),
      seatNumber: cleanOptional(input.seatNumber),
      rating: input.rating,
      comment: cleanOptional(input.comment),
      tags: input.tags ?? [],
    };

    const response = await privatePost<ApiEnvelope<SeatViewSubmission>, CreateSeatViewRequest>(
      '/seat-views',
      payload,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || '시야뷰 저장에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    if (uploadedAssetId != null) {
      try {
        await privateDelete(`/media/uploads/${uploadedAssetId}`);
      } catch {
        // Best effort cleanup only. Backend orphan cleanup remains the fallback.
      }
    }
    throw new Error(getApiErrorMessage(error, '시야뷰 업로드에 실패했습니다.'));
  }
}
