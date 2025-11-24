// api/home.ts
import { Game, Ranking, LeagueStartDates } from '../types/home';
import { DEFAULT_LEAGUE_START_DATES } from '../constants/home';
import { formatDateForAPI } from '../utils/home';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * 특정 날짜의 경기 데이터 조회
 */
export const fetchGamesData = async (date: Date): Promise<Game[]> => {
    const apiDate = formatDateForAPI(date);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/kbo/schedule?date=${apiDate}`);

        if (!response.ok) {
            console.error(`[경기] API 요청 실패: ${response.status} ${response.statusText}`);
            return [];
        }

        const gamesData: Game[] = await response.json();
        return gamesData;

    } catch (error) {
        console.error('[경기] 데이터 로드 중 오류 발생:', error);
        return [];
    }
};

/**
 * 시즌 순위 데이터 조회
 */
export const fetchRankingsData = async (year: number): Promise<Ranking[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/kbo/rankings/${year}`);

        if (!response.ok) {
            console.error(`[순위] API 요청 실패: ${response.status} ${response.statusText}`);
            return [];
        }

        const rankingsData: Ranking[] = await response.json();
        return rankingsData;

    } catch (error) {
        console.error('[순위] 데이터 로드 중 오류 발생:', error);
        return [];
    }
};

/**
 * 리그 시작 날짜 조회 
 */
export const fetchLeagueStartDates = async (): Promise<LeagueStartDates> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/kbo/league-start-dates`);

        if (!response.ok) {
            console.error(`[리그 시작 날짜] API 요청 실패: ${response.status}`);
            return DEFAULT_LEAGUE_START_DATES;
        }

        const data: LeagueStartDates = await response.json();
        console.log('[리그 시작 날짜] 로드 성공:', data);
        return data;

    } catch (error) {
        console.error('[리그 시작 날짜] 로드 중 오류:', error);
        return DEFAULT_LEAGUE_START_DATES;
    }
};