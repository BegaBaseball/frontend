// api/home.ts
import { Game, Ranking } from '../types/home';
import { formatDateForAPI } from '../utils/date';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * 특정 날짜의 경기 일정 조회
 */
export async function fetchGames(date: Date): Promise<Game[]> {
  const apiDate = formatDateForAPI(date);

  try {
    const response = await fetch(`${API_BASE_URL}/api/kbo/schedule?date=${apiDate}`);

    if (!response.ok) {
      console.error(`[경기] API 요청 실패: ${response.status} ${response.statusText}`);
      return [];
    }

    const games: Game[] = await response.json();
    return games;
  } catch (error) {
    console.error('[경기] 데이터 로드 중 오류 발생:', error);
    return [];
  }
}

/**
 * 특정 시즌의 팀 순위 조회
 */
export async function fetchRankings(seasonYear: number): Promise<Ranking[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/kbo/rankings/${seasonYear}`);

    if (!response.ok) {
      console.error(`[순위] API 요청 실패: ${response.status} ${response.statusText}`);
      return [];
    }

    const rankings: Ranking[] = await response.json();
    return rankings;
  } catch (error) {
    console.error('[순위] 데이터 로드 중 오류 발생:', error);
    return [];
  }
}