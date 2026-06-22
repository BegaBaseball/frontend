import { publicGet } from './publicClient';
import type { Place, Stadium } from '../types/stadium';

interface StadiumGuideRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function fetchStadiums(
  requestOptions: StadiumGuideRequestOptions = {},
): Promise<Stadium[]> {
  return publicGet<Stadium[]>('/stadiums', requestOptions);
}

export async function fetchStadiumPlaces(
  stadiumId: string,
  category: string,
  requestOptions: StadiumGuideRequestOptions = {},
): Promise<Place[]> {
  return publicGet<Place[]>(`/stadiums/${stadiumId}/places`, {
    ...requestOptions,
    params: { category },
  });
}
