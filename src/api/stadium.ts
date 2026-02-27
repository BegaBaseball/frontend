import api from './axios';

/**
 * 즐겨찾기한 구장 ID 목록 조회
 */
export async function getMyFavoriteStadiumIds(): Promise<string[]> {
  const response = await api.get<{ stadiumIds: string[] }>('/stadiums/favorites');
  return response.data.stadiumIds ?? [];
}

/**
 * 구장 즐겨찾기 추가
 */
export async function addStadiumFavorite(stadiumId: string): Promise<void> {
  await api.post(`/stadiums/${stadiumId}/favorite`);
}

/**
 * 구장 즐겨찾기 해제
 */
export async function removeStadiumFavorite(stadiumId: string): Promise<void> {
  await api.delete(`/stadiums/${stadiumId}/favorite`);
}
