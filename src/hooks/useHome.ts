// hooks/useHome.ts
import { useState, useEffect } from 'react';
import { useLeagueStartDates, useGamesData, useRankingsData } from '../api/home';
import { changeDate as changeDateUtil } from '../utils/home';
import { CURRENT_SEASON_YEAR, DEFAULT_LEAGUE_START_DATES } from '../constants/home';

export const useHome = () => {
    // ✅ 날짜 상태
    const [selectedDate, setSelectedDate] = useState<Date>(
        new Date(DEFAULT_LEAGUE_START_DATES.koreanSeriesStart)
    );
    const [showCalendar, setShowCalendar] = useState(false);
    const [activeLeagueTab, setActiveLeagueTab] = useState('koreanseries');

    // ✅ React Query 사용 (캐싱 자동 적용!)
    const { 
        data: leagueStartDates,
        isLoading: isDatesLoading 
    } = useLeagueStartDates();

    const { 
        data: games = [], 
        isLoading: isGamesLoading 
    } = useGamesData(selectedDate);

    const { 
        data: rankings = [], 
        isLoading: isRankingsLoading 
    } = useRankingsData(CURRENT_SEASON_YEAR);

    // ✅ DB에서 로드한 날짜로 초기화
    useEffect(() => {
        if (leagueStartDates) {
            setSelectedDate(new Date(leagueStartDates.koreanSeriesStart));
        }
    }, [leagueStartDates]);

    // 탭 변경 핸들러
    const handleTabChange = (value: string) => {
        setActiveLeagueTab(value);
        
        const dates = leagueStartDates || DEFAULT_LEAGUE_START_DATES;
        
        if (value === 'regular') {
            setSelectedDate(new Date(dates.regularSeasonStart));
        } else if (value === 'postseason') {
            setSelectedDate(new Date(dates.postseasonStart));
        } else if (value === 'koreanseries') {
            setSelectedDate(new Date(dates.koreanSeriesStart));
        }
    };

    // 날짜 변경
    const changeDate = (days: number) => {
        const newDate = changeDateUtil(selectedDate, days);
        setSelectedDate(newDate);
    };

    return {
        // State
        selectedDate,
        setSelectedDate,
        showCalendar,
        setShowCalendar,
        games,
        rankings,
        leagueStartDates,
        isLoading: isGamesLoading, // ✅ 게임 로딩 상태
        isRankingsLoading,
        activeLeagueTab,
        
        // Handlers
        handleTabChange,
        changeDate,
    };
};