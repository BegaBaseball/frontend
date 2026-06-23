import { publicGet } from './publicClient';
import type { OpenApiResponseBody } from './openapiTypes';
import type { SavedPredictionResponse } from '../types/ranking';

type SharedPredictionResponseWire = OpenApiResponseBody<'/api/predictions/ranking/share/{shareId}/{seasonYear}', 'get'>;

interface RankingPublicRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export const fetchSharedPrediction = async (
  shareId: string,
  seasonYear: string,
  requestOptions: RankingPublicRequestOptions = {},
): Promise<SavedPredictionResponse> => (
  publicGet<SharedPredictionResponseWire>(
    `/predictions/ranking/share/${shareId}/${seasonYear}`,
    requestOptions,
  )
);
