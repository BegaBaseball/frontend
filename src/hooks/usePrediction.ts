import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchVoteStatus, submitVote, cancelVote } from '../api/prediction';
import { VoteData, DateGames, PredictionTab } from '../types/prediction';
import { generateAllDatesData, PAST_GAMES_DATA } from '../constants/mockData';
import { toast } from 'sonner';

const USER_ID = 1; // TODO: 실제 로그인 유저 ID로 교체

export const usePrediction = () => {
  const [activeTab, setActiveTab] = useState<PredictionTab>('match');
  const [selectedGame, setSelectedGame] = useState(0);
  const [currentDateIndex, setCurrentDateIndex] = useState(PAST_GAMES_DATA.length);
  const [votes, setVotes] = useState<{ [key: string]: VoteData }>({});
  const [userVote, setUserVote] = useState<{ [key: string]: 'home' | 'away' | null }>({});

  const allDatesData = generateAllDatesData();
  const currentDateGames = allDatesData[currentDateIndex]?.games || [];
  const currentDate = allDatesData[currentDateIndex]?.date || new Date().toISOString().split('T')[0];
  const currentGame = currentDateGames[selectedGame] || null;
  const currentGameId = currentGame?.gameId;

  // 경기 타입 확인
  const isPastGame = currentDateIndex < PAST_GAMES_DATA.length;
  const isFutureGame = currentDateIndex > PAST_GAMES_DATA.length;

  // ========== Fetch Vote Status ==========
  const loadVoteStatus = async (gameId: string) => {
    try {
      const data = await fetchVoteStatus(gameId);
      setVotes(prev => ({
        ...prev,
        [gameId]: { home: data.homeVotes, away: data.awayVotes }
      }));
    } catch (error) {
      console.error('투표 현황 조회 실패:', error);
      // 과거 경기는 더미 데이터, 미래 경기는 0
      if (isPastGame) {
        setVotes(prev => ({
          ...prev,
          [gameId]: {
            home: Math.floor(Math.random() * 100) + 50,
            away: Math.floor(Math.random() * 100) + 50
          }
        }));
      } else {
        setVotes(prev => ({
          ...prev,
          [gameId]: { home: 0, away: 0 }
        }));
      }
    }
  };

  // ========== Vote Mutation ==========
  const voteMutation = useMutation({
    mutationFn: async ({ gameId, team }: { gameId: string; team: 'home' | 'away' }) => {
      await submitVote(USER_ID, { gameId, votedTeam: team });
    },
    onSuccess: (_, variables) => {
      setUserVote(prev => ({ ...prev, [variables.gameId]: variables.team }));
      loadVoteStatus(variables.gameId);
      toast.success('투표가 완료되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '투표에 실패했습니다.');
    },
  });

  // ========== Cancel Vote Mutation ==========
  const cancelVoteMutation = useMutation({
    mutationFn: async (gameId: string) => {
      await cancelVote(gameId, USER_ID);
    },
    onSuccess: (_, gameId) => {
      setUserVote(prev => ({ ...prev, [gameId]: null }));
      loadVoteStatus(gameId);
      toast.success('투표가 취소되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '투표 취소에 실패했습니다.');
    },
  });

  // ========== Vote Handler ==========
  const handleVote = (team: 'home' | 'away') => {
    if (!currentGameId) return;

    // 이미 투표한 팀을 다시 클릭하면 취소
    if (userVote[currentGameId] === team) {
      cancelVoteMutation.mutate(currentGameId);
      return;
    }

    // 다른 팀에 이미 투표한 경우
    if (userVote[currentGameId] && userVote[currentGameId] !== team) {
      toast.error('이미 다른 팀에 투표하셨습니다. 먼저 투표를 취소해주세요.');
      return;
    }

    // 새로운 투표
    voteMutation.mutate({ gameId: currentGameId, team });
  };

  // ========== Date Navigation ==========
  const goToPreviousDate = () => {
    if (currentDateIndex > 0) {
      setCurrentDateIndex(currentDateIndex - 1);
    }
  };

  const goToNextDate = () => {
    if (currentDateIndex < allDatesData.length - 1) {
      setCurrentDateIndex(currentDateIndex + 1);
    }
  };

  // ========== Effects ==========
  useEffect(() => {
    // 모든 경기의 투표 현황 로드
    allDatesData.forEach((dateData) => {
      dateData.games.forEach((game) => {
        loadVoteStatus(game.gameId);
      });
    });
  }, []);

  useEffect(() => {
    // 날짜 변경 시 첫 번째 경기로 리셋
    setSelectedGame(0);
  }, [currentDateIndex]);

  useEffect(() => {
    // 경기 변경 시 투표 현황 로드
    if (currentGameId) {
      loadVoteStatus(currentGameId);
    }
  }, [selectedGame, currentGameId]);

  // ========== Computed Values ==========
  const currentVotes = currentGameId ? votes[currentGameId] || { home: 0, away: 0 } : { home: 0, away: 0 };
  const totalVotes = currentVotes.home + currentVotes.away;
  const homePercentage = totalVotes > 0 ? Math.round((currentVotes.home / totalVotes) * 100) : 0;
  const awayPercentage = totalVotes > 0 ? Math.round((currentVotes.away / totalVotes) * 100) : 0;

  const getVoteAccuracy = () => {
    if (!isPastGame || !currentGame?.winner || currentGame.winner === 'draw') return null;
    const winningTeam = currentGame.winner;
    const winningVotes = winningTeam === 'home' ? currentVotes.home : currentVotes.away;
    return totalVotes > 0 ? Math.round((winningVotes / totalVotes) * 100) : 0;
  };

  return {
    // Tab
    activeTab,
    setActiveTab,

    // Game Selection
    selectedGame,
    setSelectedGame,
    currentDateGames,

    // Date Navigation
    currentDate,
    currentDateIndex,
    goToPreviousDate,
    goToNextDate,
    canGoPrevious: currentDateIndex > 0,
    canGoNext: currentDateIndex < allDatesData.length - 1,

    // Current Game
    currentGame,
    currentGameId,
    isPastGame,
    isFutureGame,

    // Votes
    votes,
    currentVotes,
    totalVotes,
    homePercentage,
    awayPercentage,
    userVote,
    getVoteAccuracy,

    // Actions
    handleVote,
    isVoting: voteMutation.isPending || cancelVoteMutation.isPending,
  };
};