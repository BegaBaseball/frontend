import { publicGet } from './publicClient';
import type { Place, Stadium } from '../types/stadium';

export async function fetchStadiums(): Promise<Stadium[]> {
  return publicGet<Stadium[]>('/stadiums');
}

export async function fetchStadiumPlaces(
  stadiumId: string,
  category: string,
): Promise<Place[]> {
  return publicGet<Place[]>(`/stadiums/${stadiumId}/places`, {
    params: { category },
  });
}
