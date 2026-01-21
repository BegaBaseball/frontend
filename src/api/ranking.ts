// api/ranking.ts (기존 파일에 추가/업데이트)
import api from './axios';
import { SeasonResponse, SavedPredictionResponse, SaveRankingRequest } from '../types/ranking';

/**
 * 현재 예측 가능한 시즌 조회
 */
export const fetchCurrentSeason = async (): Promise<SeasonResponse> => {
  const response = await api.get('/predictions/ranking/current-season');
  return response.data;
};

/**
 * 저장된 순위 예측 조회
 * @returns 저장된 예측이 없으면 null 반환
 */
export const fetchSavedPrediction = async (seasonYear: number): Promise<SavedPredictionResponse | null> => {
  try {
    const response = await api.get(`/predictions/ranking`, {
      params: { seasonYear }
    });
    return response.data;
  } catch (error: any) {
    // 404: 저장된 예측이 없음 - 정상적인 상태이므로 null 반환
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * 순위 예측 저장
 */
export const saveRankingPrediction = async (data: SaveRankingRequest): Promise<void> => {
  await api.post('/predictions/ranking', data);
};

/**
 * 공유된 순위 예측 조회
 */
export const fetchSharedPrediction = async (
  userId: string,
  seasonYear: string
): Promise<SavedPredictionResponse> => {
  const response = await api.get(`/predictions/ranking/share/${userId}/${seasonYear}`);
  return response.data;
};