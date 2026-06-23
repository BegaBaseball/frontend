import { getApiErrorStatus } from './errorStatus';
import { privateGet, privatePost } from './privateClient';
import { publicGet } from './publicClient';
import type { OpenApiRequestBody, OpenApiResponseBody } from './openapiTypes';
import type { SeasonResponse, SavedPredictionResponse, SaveRankingRequest, RankingPredictionInitResponse } from '../types/ranking';

type SeasonResponseWire = OpenApiResponseBody<'/api/predictions/ranking/current-season', 'get'>;
type SavedPredictionResponseWire = OpenApiResponseBody<'/api/predictions/ranking', 'get'>;
type SaveRankingRequestWire = OpenApiRequestBody<'/api/predictions/ranking', 'post'>;
type SaveRankingResponseWire = OpenApiResponseBody<'/api/predictions/ranking', 'post'>;
type RankingPredictionInitResponseWire = OpenApiResponseBody<'/api/predictions/ranking/init', 'get'>;

/**
 * 현재 예측 가능한 시즌 조회
 */
export const fetchCurrentSeason = async (): Promise<SeasonResponse> => {
  return publicGet<SeasonResponseWire>('/predictions/ranking/current-season');
};

/**
 * 저장된 순위 예측 조회
 * @returns 저장된 예측이 없으면 null 반환
 */
export const fetchSavedPrediction = async (seasonYear: number): Promise<SavedPredictionResponse | null> => {
  try {
    return await privateGet<SavedPredictionResponseWire>('/predictions/ranking', {
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
 * 현재 시즌 + 저장된 예측을 단일 요청으로 조회
 */
export const fetchRankingPredictionInit = async (): Promise<RankingPredictionInitResponse> => {
  return privateGet<RankingPredictionInitResponseWire>('/predictions/ranking/init', {
    skipAuthSessionHandling: true,
  });
};

/**
 * 순위 예측 저장
 */
export const saveRankingPrediction = async (data: SaveRankingRequest): Promise<SavedPredictionResponse> => {
  const request: SaveRankingRequestWire = data;
  return privatePost<SaveRankingResponseWire, SaveRankingRequestWire>('/predictions/ranking', request, {
    skipAuthSessionHandling: true,
  });
};
