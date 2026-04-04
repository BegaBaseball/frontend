import { privateDelete, privateGet, privatePost } from './privateClient';

interface StadiumFavoritesResponse {
  stadiumIds?: string[];
}

/**
 * 즐겨찾기한 구장 ID 목록 조회
 */
export async function getMyFavoriteStadiumIds(): Promise<string[]> {
  const response = await privateGet<StadiumFavoritesResponse>('/stadiums/favorites');
  return response.stadiumIds ?? [];
}

/**
 * 구장 즐겨찾기 추가
 */
export async function addStadiumFavorite(stadiumId: string): Promise<void> {
  await privatePost<void>(`/stadiums/${stadiumId}/favorite`);
}

/**
 * 구장 즐겨찾기 해제
 */
export async function removeStadiumFavorite(stadiumId: string): Promise<void> {
  await privateDelete<void>(`/stadiums/${stadiumId}/favorite`);
}
