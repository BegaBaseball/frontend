import {
  AchievementDto,
  DiaryEntry,
  DiaryPhotoFile,
  DiaryStatistics,
  Game,
  SaveDiaryRequest,
  SeatViewCandidate,
} from '../types/diary';
import { uploadMediaFiles } from './media';
import { privateGet, privatePost } from './privateClient';
import { publicGet } from './publicClient';

/**
 * 특정 날짜의 경기 목록 조회
 */
export async function fetchGames(date: string): Promise<Game[]> {
  return privateGet<Game[]>('/diary/games', {
    params: { date },
  });
}

/**
 * 다이어리 목록 조회
 */
export async function fetchDiaries(): Promise<DiaryEntry[]> {
  return privateGet<DiaryEntry[]>('/diary/entries');
}

export interface SaveDiaryResponse {
  id: number;
  ticketVerified?: boolean;
  unlockedAchievements?: AchievementDto[];
  [key: string]: unknown;
}

/**
 * 다이어리 저장
 */
export async function saveDiary(data: SaveDiaryRequest): Promise<SaveDiaryResponse> {
  return privatePost<SaveDiaryResponse, SaveDiaryRequest>('/diary/save', data);
}

/**
 * 다이어리 수정
 */
export async function updateDiary({ id, data }: { id: number; data: SaveDiaryRequest }) {
  return privatePost<unknown, SaveDiaryRequest>(`/diary/${id}/modify`, data);
}

/**
 * 다이어리 삭제
 */
export async function deleteDiary(id: number): Promise<void> {
  await privatePost<void, { id: number }>(`/diary/${id}/delete`, { id });
}

/**
 * 다이어리 이미지 업로드
 */
export interface UploadDiaryImagesResponse {
  photos: string[];
  candidates: SeatViewCandidate[];
}

interface UploadDiaryImagesApiResponse {
  photos?: string[];
  candidates?: SeatViewCandidate[];
  data?: {
    photos?: string[];
    candidates?: SeatViewCandidate[];
  };
}

interface CreateSeatViewCandidatesRequest {
  storagePaths: string[];
  sourceTypes: string[];
}

export async function uploadDiaryImages(
  diaryId: number,
  files: DiaryPhotoFile[],
): Promise<UploadDiaryImagesResponse> {
  const uploads = await uploadMediaFiles(
    'DIARY',
    files.map(({ file }) => file),
  );
  const storagePaths = uploads.map((upload) => upload.storagePath);
  if (storagePaths.length === 0) {
    return {
      photos: [],
      candidates: [],
    };
  }

  const result = await privatePost<UploadDiaryImagesApiResponse, CreateSeatViewCandidatesRequest>(
    `/diary/${diaryId}/seat-view-candidates`,
    {
      storagePaths,
      sourceTypes: files.map(({ sourceType }) => sourceType),
    },
  );

  return {
    photos: storagePaths,
    candidates: result.candidates || result.data?.candidates || [],
  };
}

export async function submitSeatViewSelections(
  diaryId: number,
  candidateIds: number[],
): Promise<SeatViewCandidate[]> {
  const response = await privatePost<{ candidates?: SeatViewCandidate[]; data?: { candidates?: SeatViewCandidate[] } }, { candidateIds: number[] }>(
    `/diary/${diaryId}/seat-view-selections`,
    { candidateIds },
  );

  return response.candidates || response.data?.candidates || [];
}

/**
 * 다이어리 통계 조회
 */
export async function fetchDiaryStatistics(): Promise<DiaryStatistics> {
  return privateGet<DiaryStatistics>('/diary/statistics');
}

export interface SeatViewPhoto {
  photoUrl: string;
  stadium: string;
  section: string | null;
  block: string | null;
  diaryDate: string;
}

/**
 * 좌석 시야 사진 목록 조회 (공개 API)
 */
export async function fetchSeatViews(
  stadium: string,
  section?: string,
  limit = 9,
): Promise<SeatViewPhoto[]> {
  return publicGet<SeatViewPhoto[]>('/diary/seat-views', {
    params: { stadium, section, limit },
  });
}
