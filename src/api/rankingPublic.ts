import { publicGet } from './publicClient';
import type { SavedPredictionResponse } from '../types/ranking';

export const fetchSharedPrediction = async (
  shareId: string,
  seasonYear: string,
): Promise<SavedPredictionResponse> => (
  publicGet<SavedPredictionResponse>(`/predictions/ranking/share/${shareId}/${seasonYear}`)
);
