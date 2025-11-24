// hooks/useHome.ts
import { useState, useEffect } from 'react';
import { Game, Ranking, LeagueStartDates } from '../types/home';
import { fetchGamesData, fetchRankingsData, fetchLeagueStartDates } from '../api/home';
import { changeDate as changeDateUtil } from '../utils/home';
import { CURRENT_SEASON_YEAR, DEFAULT_LEAGUE_START_DATES } from '../constants/home';

export const useHome = () => {
    // 초기값을 null로 설정 (리그 날짜 로드 후 설정)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [leagueStartDates, setLeagueStartDates] = useState<LeagueStartDates | null>(null); 
    const [isLoading, setIsLoading] = useState(true);
    const [isRankingsLoading, setIsRankingsLoading] = useState(false);
    const [activeLeagueTab, setActiveLeagueTab] = useState('koreanseries');
    const [isInitialized, setIsInitialized] = useState(false);

    // 리그 시작 날짜 로드
    const loadLeagueStartDates = async () => {
        const dates = await fetchLeagueStartDates();
        setLeagueStartDates(dates);
    };

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

    // 탭 변경 핸들러 (DB 날짜 사용)
    const handleTabChange = (value: string) => {
        setActiveLeagueTab(value);
        
        // if (!leagueStartDates) return;
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
        if (!selectedDate) return;
        const newDate = changeDateUtil(selectedDate, days);
        setSelectedDate(newDate);
    };

    // 1. 컴포넌트 마운트 시 리그 시작 날짜 먼저 로드
    useEffect(() => {
        const initializeHome = async () => {
            const dates = await fetchLeagueStartDates();
            setLeagueStartDates(dates);
            
            // DB 날짜 로드 완료 후 초기 날짜 설정
            const initialDate = new Date(dates.koreanSeriesStart);
            setSelectedDate(initialDate);
            setIsInitialized(true);
        };
        
        initializeHome();
    }, []);

    // ✅ 2. 초기화 완료 후 경기 데이터 로드
    useEffect(() => {
        if (isInitialized && selectedDate) {
            loadGamesData(selectedDate);
        }
     }, [isInitialized, selectedDate]);

    // ✅ 3. 컴포넌트 마운트 시 순위 데이터 로드
    useEffect(() => {
        loadRankingsData();
    }, []);

    return {
        // State
        selectedDate,
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