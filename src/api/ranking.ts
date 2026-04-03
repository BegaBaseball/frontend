import { getApiErrorStatus } from './errorStatus';
import { privateGet, privatePost } from './privateClient';
import { publicGet } from './publicClient';
import { SeasonResponse, SavedPredictionResponse, SaveRankingRequest } from '../types/ranking';

/**
 * 현재 예측 가능한 시즌 조회
 */
export const fetchCurrentSeason = async (): Promise<SeasonResponse> => {
  return publicGet<SeasonResponse>('/predictions/ranking/current-season');
};

/**
 * 저장된 순위 예측 조회
 * @returns 저장된 예측이 없으면 null 반환
 */
export const fetchSavedPrediction = async (seasonYear: number): Promise<SavedPredictionResponse | null> => {
  try {
    return await privateGet<SavedPredictionResponse>('/predictions/ranking', {
      params: { seasonYear },
      skipAuthSessionHandling: true,
    });
  } catch (error: unknown) {
    // 404: 저장된 예측이 없음 - 정상적인 상태이므로 null 반환
    if (getApiErrorStatus(error) === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * 순위 예측 저장
 */
export const saveRankingPrediction = async (data: SaveRankingRequest): Promise<SavedPredictionResponse> => {
  return privatePost<SavedPredictionResponse, SaveRankingRequest>('/predictions/ranking', data, {
    skipAuthSessionHandling: true,
  });
};
