// utils/home.ts
import { DAYS_OF_WEEK, DEFAULT_LEAGUE_START_DATES } from '../constants/home';
import { Game, LeagueStartDates } from '../types/home';

const LEAGUE_START_DATES_STORAGE_KEY = 'kbo:leagueStartDates';

const isValidDateString = (value: unknown): value is string => {
    if (typeof value !== 'string' || value.length === 0) {
        return false;
    }
    return !Number.isNaN(new Date(value).getTime());
};

const isValidLeagueStartDates = (value: unknown): value is LeagueStartDates => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value as Record<string, unknown>;
    return isValidDateString(candidate.regularSeasonStart)
        && isValidDateString(candidate.postseasonStart)
        && isValidDateString(candidate.koreanSeriesStart);
};

export const cacheLeagueStartDates = (dates: LeagueStartDates): void => {
    if (typeof window === 'undefined' || !isValidLeagueStartDates(dates)) {
        return;
    }

    try {
        window.localStorage.setItem(LEAGUE_START_DATES_STORAGE_KEY, JSON.stringify(dates));
    } catch {
        // no-op
    }
};

/**
 * Date를 API 요청 형식으로 변환 (YYYY-MM-DD)
 */
export const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Date를 한글 형식으로 변환 (YYYY.MM.DD(요일))
 */
export const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
    return `${year}.${month}.${day}(${dayOfWeek})`;
};

/**
 * 리그 시작 날짜 fallback 반환
 */
export const getFallbackLeagueStartDates = (): LeagueStartDates => {
    if (typeof window !== 'undefined') {
        try {
            const cached = window.localStorage.getItem(LEAGUE_START_DATES_STORAGE_KEY);
            if (cached) {
                const parsed: unknown = JSON.parse(cached);
                if (isValidLeagueStartDates(parsed)) {
                    return parsed;
                }
            }
        } catch {
            // no-op
        }
    }

    return {
        ...DEFAULT_LEAGUE_START_DATES,
    };
};

/**
 * 날짜 변경 (일 단위)
 */
export const changeDate = (currentDate: Date, days: number): Date => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};

/**
 * 비시즌 여부 확인 (11월 15일 ~ 3월 21일)
 */
export const isOffSeasonForUI = (date: Date): boolean => {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 11월 15일 ~ 3월 21일은 비시즌
    if (month >= 11 || month <= 2 || (month === 3 && day < 22)) {
        return true;
    }
    return false;
};

/**
 * 리그별로 경기 필터링
 */
export const filterGamesByLeague = (games: Game[]) => {
    return {
        regular: games.filter(g => g.leagueType === 'REGULAR'),
        postseason: games.filter(g => g.leagueType === 'POSTSEASON'),
        koreanseries: games.filter(g => g.leagueType === 'KOREAN_SERIES')
    };
};
