import type { LeagueStartDates } from '../types/home';

export const getInitialRankingSeasonYear = (date: Date, fallbackStartDates: LeagueStartDates): number => {
    const targetDate = new Date(date);
    targetDate.setHours(12, 0, 0, 0);

    if (Number.isNaN(targetDate.getTime())) {
        return targetDate.getFullYear();
    }

    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();

    const regularSeasonStartDate = new Date(fallbackStartDates.regularSeasonStart);

    if (Number.isNaN(regularSeasonStartDate.getTime())) {
        return month >= 11 || month <= 2 || (month === 3 && day < 22)
            ? targetDate.getFullYear() - 1
            : targetDate.getFullYear();
    }

    const regularSeasonStartThisYear = new Date(regularSeasonStartDate);
    regularSeasonStartThisYear.setFullYear(targetDate.getFullYear());
    regularSeasonStartThisYear.setHours(12, 0, 0, 0);

    const isBeforeRegularStart = targetDate < regularSeasonStartThisYear;

    return month >= 11 || month <= 2 || isBeforeRegularStart
        ? targetDate.getFullYear() - 1
        : targetDate.getFullYear();
};

export const isOffSeasonByDate = (baseDate: Date, startDates: LeagueStartDates | null): boolean => {
    const targetDate = new Date(baseDate);
    targetDate.setHours(12, 0, 0, 0);

    if (Number.isNaN(targetDate.getTime())) {
        return false;
    }

    if (!startDates) {
        const month = targetDate.getMonth() + 1;
        const day = targetDate.getDate();
        return month >= 11 || month <= 2 || (month === 3 && day < 22);
    }

    const regularSeasonStart = new Date(startDates.regularSeasonStart);
    regularSeasonStart.setHours(12, 0, 0, 0);

    if (Number.isNaN(regularSeasonStart.getTime())) {
        const month = targetDate.getMonth() + 1;
        const day = targetDate.getDate();
        return month >= 11 || month <= 2 || (month === 3 && day < 22);
    }

    const seasonStartDateThisYear = new Date(regularSeasonStart);
    seasonStartDateThisYear.setFullYear(targetDate.getFullYear());
    seasonStartDateThisYear.setHours(12, 0, 0, 0);

    const month = targetDate.getMonth() + 1;
    const isBeforeRegularStart = targetDate < seasonStartDateThisYear;

    return month >= 11 || month <= 2 || isBeforeRegularStart;
};

export const resolveRankingSeasonYear = (baseDate: Date, startDates: LeagueStartDates | null): number => {
    const targetDate = new Date(baseDate);
    targetDate.setHours(12, 0, 0, 0);

    if (Number.isNaN(targetDate.getTime())) {
        return targetDate.getFullYear();
    }

    return isOffSeasonByDate(targetDate, startDates)
        ? targetDate.getFullYear() - 1
        : targetDate.getFullYear();
};

export const getSeasonShortLabel = (year: number): string => String(year).slice(-2);

export const toLocalMiddayDate = (value: string): Date => {
    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        const fallback = new Date(value);
        fallback.setHours(12, 0, 0, 0);
        return fallback;
    }
    return parsed;
};

export const formatHomeDate = (date: Date): string => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];
    return `${year}.${month}.${day} (${dayOfWeek})`;
};

export const formatSourceDateLabel = (sourceDate?: string): string => {
    if (!sourceDate) return '날짜 미정';
    const date = new Date(`${sourceDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) return sourceDate;
    return formatHomeDate(date);
};
