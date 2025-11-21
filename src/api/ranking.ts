// api/ranking.ts
import {
  CurrentSeasonResponse,
  RankingPredictionResponse,
  SaveRankingRequest,
} from '../types/ranking';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/predictions/ranking`
  : '/api/predictions/ranking';

/**
 * 현재 예측 가능한 시즌 조회
 */
export async function fetchCurrentSeason(): Promise<CurrentSeasonResponse> {
  const response = await fetch(`${API_BASE_URL}/current-season`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '시즌 정보 조회 실패');
  }

  return await response.json();
}

/**
 * 특정 시즌의 저장된 예측 조회
 */
export async function fetchSavedPrediction(seasonYear: number): Promise<RankingPredictionResponse | null> {
  const response = await fetch(`${API_BASE_URL}?seasonYear=${seasonYear}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null; // 저장된 예측 없음
    }
    throw new Error('저장된 예측 조회 실패');
  }

  return await response.json();
}

/**
 * 순위 예측 저장
 */
export async function saveRankingPrediction(seasonYear: number, teamIds: string[]): Promise<void> {
  const data: SaveRankingRequest = {
    seasonYear,
    teamIdsInOrder: teamIds,
  };

  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 409) {
      const errorData = await response.json();
      throw new Error(errorData.error || '이미 예측이 저장되었습니다.');
    }
    throw new Error('저장에 실패했습니다.');
  }
}