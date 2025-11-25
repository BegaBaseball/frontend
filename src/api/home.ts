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
        const response = await fetch(`${API_BASE_URL}/api/kbo/schedule?date=${apiDate}`, {
        credentials: 'include' 
        });

        if (!response.ok) {
            return [];
        }

        const gamesData: Game[] = await response.json();
        return gamesData;

    } catch (error) {
        return [];
    }
};

/**
 * 시즌 순위 데이터 조회
 */
export const fetchRankingsData = async (year: number): Promise<Ranking[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/kbo/rankings/${year}`, {
        credentials: 'include' 
        });

        if (!response.ok) {
            return [];
        }

        const rankingsData: Ranking[] = await response.json();
        return rankingsData;

    } catch (error) {
        return [];
    }
};

/**
 * 리그 시작 날짜 조회 
 */
export const fetchLeagueStartDates = async (): Promise<LeagueStartDates> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/kbo/league-start-dates`, {
        credentials: 'include'
        });

        if (!response.ok) {
            return DEFAULT_LEAGUE_START_DATES;
        }

        const data: LeagueStartDates = await response.json();
        return data;

    } catch (error) {
        return DEFAULT_LEAGUE_START_DATES;
    }
};