import api from './axios';
import { Game, SaveDiaryRequest, DiaryStatistics, DiaryEntry } from '../types/diary';

/**
 * 특정 날짜의 경기 목록 조회
 */
export async function fetchGames(date: string): Promise<Game[]> {
  const response = await api.get<Game[]>(`/diary/games?date=${date}`);
  return response.data;
}

/**
 * 다이어리 목록 조회
 */
export async function fetchDiaries(): Promise<DiaryEntry[]> {
  const response = await api.get<DiaryEntry[]>('/diary/entries');
  return response.data;
}

/**
 * 다이어리 저장
 */
export async function saveDiary(data: SaveDiaryRequest) {
  const response = await api.post('/diary/save', data);
  return response.data;
}

/**
 * 다이어리 수정
 */
export async function updateDiary({ id, data }: { id: number; data: SaveDiaryRequest; }) {
  const response = await api.post(`/diary/${id}/modify`, data);
  return response.data;
}

/**
 * 다이어리 삭제
 */
export async function deleteDiary(id: number): Promise<void> {
  await api.post(`/diary/${id}/delete`, { id });
}

/**
 * 다이어리 이미지 업로드
 */
export async function uploadDiaryImages(
  diaryId: number,
  files: File[]
): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await api.post(`/diary/${diaryId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const result = response.data;
  const photos = result.photos || result.data?.photos || [];
  return photos;
}

/**
 * 다이어리 통계 조회
 */
export async function fetchDiaryStatistics(): Promise<DiaryStatistics> {
  const response = await api.get<DiaryStatistics>('/diary/statistics');
  return response.data;
}