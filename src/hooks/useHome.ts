// hooks/useHome.ts
import { useState, useEffect } from 'react';
import { fetchGames, fetchRankings } from '../api/home';
import { Game, Ranking } from '../types/home';
import { isOffSeason, addDays } from '../utils/date';
import { filterGamesByLeague } from '../utils/home';
import { CURRENT_SEASON, DEFAULT_DATE } from '../constants/config';

export const useHome = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(DEFAULT_DATE);
  const [showCalendar, setShowCalendar] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRankingsLoading, setIsRankingsLoading] = useState(false);

  // ========== 경기 데이터 로드 ==========
  const loadGames = async (date: Date) => {
    if (isOffSeason(date)) {
      setGames([]);
      return;
    }

    setIsLoading(true);
    try {
      const gamesData = await fetchGames(date);
      setGames(gamesData);
    } finally {
      setIsLoading(false);
    }
  };

  // ========== 순위 데이터 로드 ==========
  const loadRankings = async () => {
    setIsRankingsLoading(true);
    try {
      const rankingsData = await fetchRankings(CURRENT_SEASON);
      setRankings(rankingsData);
    } finally {
      setIsRankingsLoading(false);
    }
  };

  // ========== 날짜 변경 ==========
  const changeDate = (days: number) => {
    const newDate = addDays(selectedDate, days);
    setSelectedDate(newDate);
  };

  // ========== 날짜 선택 시 경기 로드 ==========
  useEffect(() => {
    loadGames(selectedDate);
  }, [selectedDate]);

  // ========== 초기 순위 로드 ==========
  useEffect(() => {
    loadRankings();
  }, []);

  // ========== 경기 필터링 ==========
  const filteredGames = filterGamesByLeague(games);

  return {
    // State
    selectedDate,
    setSelectedDate,
    showCalendar,
    setShowCalendar,
    games,
    rankings,
    isLoading,
    isRankingsLoading,

    // Computed
    filteredGames,
    isOffSeasonDate: isOffSeason(selectedDate),
    currentSeason: CURRENT_SEASON,

    // Actions
    changeDate,
  };
};