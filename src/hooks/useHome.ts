// hooks/useHome.ts
import { useState, useEffect } from 'react';
import { Game, Ranking, LeagueStartDates } from '../types/home';
import { fetchGamesData, fetchRankingsData, fetchLeagueStartDates } from '../api/home';
import { changeDate as changeDateUtil } from '../utils/home';
import { CURRENT_SEASON_YEAR, DEFAULT_LEAGUE_START_DATES } from '../constants/home';

export const useHome = () => {
    // ✅ 수정: 초기값을 바로 설정 (null 제거!)
    const [selectedDate, setSelectedDate] = useState<Date>(
        new Date(DEFAULT_LEAGUE_START_DATES.koreanSeriesStart)
    );
    const [showCalendar, setShowCalendar] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [leagueStartDates, setLeagueStartDates] = useState<LeagueStartDates | null>(null); 
    const [isLoading, setIsLoading] = useState(true);
    const [isRankingsLoading, setIsRankingsLoading] = useState(false);
    const [activeLeagueTab, setActiveLeagueTab] = useState('koreanseries');

    // 경기 데이터 로드
    const loadGamesData = async (date: Date) => {
        setIsLoading(true);
        const data = await fetchGamesData(date);
        setGames(data);
        setIsLoading(false);
    };

    // 순위 데이터 로드
    const loadRankingsData = async () => {
        setIsRankingsLoading(true);
        const data = await fetchRankingsData(CURRENT_SEASON_YEAR);
        setRankings(data);
        setIsRankingsLoading(false);
    };

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

    // 날짜 변경 (null 체크 제거)
    const changeDate = (days: number) => {
        const newDate = changeDateUtil(selectedDate, days);
        setSelectedDate(newDate);
    };

    // 초기화
    useEffect(() => {
        const initializeHome = async () => {
            // DB 날짜 로드
            const dates = await fetchLeagueStartDates();
            setLeagueStartDates(dates);
            
            // 초기 날짜 업데이트
            setSelectedDate(new Date(dates.koreanSeriesStart));
        };
        
        initializeHome();
    }, []);

    // 날짜 변경 시 경기 데이터 로드
    useEffect(() => {
        loadGamesData(selectedDate);
    }, [selectedDate]);

    // 순위 데이터 로드
    useEffect(() => {
        loadRankingsData();
    }, []);

    return {
        // State
        selectedDate, // ✅ 타입: Date (null 없음!)
        setSelectedDate,
        showCalendar,
        setShowCalendar,
        games,
        rankings,
        leagueStartDates, 
        isLoading,
        isRankingsLoading,
        activeLeagueTab,
        
        // Handlers
        handleTabChange,
        changeDate,
    };
};