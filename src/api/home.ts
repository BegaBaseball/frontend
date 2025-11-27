// api/home.ts
import { useQuery } from '@tanstack/react-query';
import { Game, Ranking, LeagueStartDates } from '../types/home';
import { DEFAULT_LEAGUE_START_DATES } from '../constants/home';
import { formatDateForAPI } from '../utils/home';

const API_BASE_URL = import.meta.env.VITE_NO_API_BASE_URL || 'http://localhost:8080';

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

// ✅ React Query 훅 추가
export const useLeagueStartDates = () => {
    return useQuery({
        queryKey: ['leagueStartDates'],
        queryFn: fetchLeagueStartDates,
        staleTime: 60 * 60 * 1000, // 1시간 (리그 날짜는 자주 안 바뀜)
        gcTime: 24 * 60 * 60 * 1000, // 24시간
    });
};

export const useGamesData = (date: Date) => {
    const formattedDate = formatDateForAPI(date);
    
    return useQuery({
        queryKey: ['games', formattedDate], // 날짜별로 캐싱
        queryFn: () => fetchGamesData(date),
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 10 * 60 * 1000, // 10분
        enabled: !!date, // date가 있을 때만 실행
    });
};

export const useRankingsData = (year: number) => {
    return useQuery({
        queryKey: ['rankings', year], // 연도별로 캐싱
        queryFn: () => fetchRankingsData(year),
        staleTime: 30 * 60 * 1000, // 30분 (순위는 자주 안 바뀜)
        gcTime: 60 * 60 * 1000, // 1시간
    });
};