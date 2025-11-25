// api/ranking.ts (기존 파일에 추가/업데이트)
import { SeasonResponse, SavedPredictionResponse, SaveRankingRequest } from '../types/ranking';

/**
 * 현재 예측 가능한 시즌 조회
 */
export const fetchCurrentSeason = async (): Promise<SeasonResponse> => {
  const response = await fetch('/api/predictions/ranking/current-season', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const errorData = await response.json();
    throw new Error(errorData.error || '시즌 정보를 불러올 수 없습니다.');
  }

  return await response.json();
};

/**
 * 저장된 순위 예측 조회
 */
export const fetchSavedPrediction = async (seasonYear: number): Promise<SavedPredictionResponse> => {
  const response = await fetch(
    `/api/predictions/ranking?seasonYear=${seasonYear}`, 
    { credentials: 'include' }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error('저장된 예측을 불러올 수 없습니다.');
  }

  return await response.json();
};

/**
 * 순위 예측 저장
 */
export const saveRankingPrediction = async (data: SaveRankingRequest): Promise<void> => {
  const response = await fetch('/api/predictions/ranking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    if (response.status === 409) {
      const errorData = await response.json();
      throw new Error(errorData.error || '이미 예측을 저장하셨습니다.');
    }
    throw new Error('저장에 실패했습니다.');
  }
};

/**
 * 공유된 순위 예측 조회
 */
export const fetchSharedPrediction = async (
  userId: string, 
  seasonYear: string
): Promise<SavedPredictionResponse> => {
  const response = await fetch(
    `/api/predictions/ranking/share/${userId}/${seasonYear}`
  );

  if (!response.ok) {
    throw new Error('예측을 찾을 수 없습니다.');
  }

  return await response.json();
};