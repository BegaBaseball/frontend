// hooks/usePrediction.ts
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { Game, DateGames, VoteStatus, ConfirmDialogData, VoteTeam, PredictionTab } from '../types/prediction';
import { 
  fetchPastGames, 
  fetchMatchesByDate, 
  fetchAllUserVotes as fetchAllUserVotesAPI,
  fetchVoteStatus,
  submitVote,
  cancelVote 
} from '../api/prediction';
import { 
  groupByDate, 
  getTodayString, 
  getTomorrowString,
  getFullTeamName 
} from '../utils/prediction';

export const usePrediction = () => {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);

  // 탭 관리
  const [activeTab, setActiveTab] = useState<PredictionTab>('match');
  const [selectedGame, setSelectedGame] = useState(0);
  
  // 날짜별 경기 데이터
  const [allDatesData, setAllDatesData] = useState<DateGames[]>([]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // 투표 현황
  const [votes, setVotes] = useState<{ [key: string]: VoteStatus }>({});
  
  // 사용자 투표
  const [userVote, setUserVote] = useState<{ [key: string]: VoteTeam | null }>({});

  // 다이얼로그 상태
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<ConfirmDialogData>({
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const [showLoginRequiredDialog, setShowLoginRequiredDialog] = useState(false);

  // 로그인 체크
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      setLoading(false);
      setShowLoginRequiredDialog(true);
    } else if (!isAuthLoading && isLoggedIn) {
      fetchAllGames();
    }
  }, [isLoggedIn, isAuthLoading]);

  // 날짜가 변경될 때마다 첫 번째 경기로 리셋
  useEffect(() => {
    setSelectedGame(0);
  }, [currentDateIndex]);

  // 경기가 변경될 때마다 투표 현황 가져오기
  useEffect(() => {
    const currentDateGames = allDatesData[currentDateIndex]?.games || [];
    if (currentDateGames.length > 0) {
      const currentGameId = currentDateGames[selectedGame]?.gameId;
      if (currentGameId) {
        loadVoteStatus(currentGameId);
      }
    }
  }, [selectedGame, allDatesData, currentDateIndex]);

  // 모든 경기 데이터 가져오기
  const fetchAllGames = async () => {
    try {
      setLoading(true);

      const pastData = await fetchPastGames();
      const today = getTodayString();
      const tomorrow = getTomorrowString();
      
      const todayData = await fetchMatchesByDate(today);

      const groupedPastGames = groupByDate(pastData);
      const todayGroup: DateGames = { date: today, games: [] };
      
      const allDates = [...groupedPastGames, todayGroup];
      if (todayData.length > 0) {
        const tomorrowGroup: DateGames = { date: tomorrow, games: todayData };
        allDates.push(tomorrowGroup);
      }
      
      setAllDatesData(allDates);
      
      const todayIndex = allDates.findIndex(d => d.date === today);
      setCurrentDateIndex(todayIndex !== -1 ? todayIndex : 0);

      // 미래 경기만 사용자 투표 조회
      if (todayData.length > 0) {
        const userVotes = await fetchAllUserVotesAPI(todayData);
        setUserVote(userVotes);
      }

    } catch (error) {
      console.error('경기 데이터를 불러오는데 실패했습니다:', error);
    } finally {
      setLoading(false);
    }
  };

  // 투표 현황 가져오기
  const loadVoteStatus = async (gameId: string) => {
    const status = await fetchVoteStatus(gameId);
    setVotes(prev => ({
      ...prev,
      [gameId]: { home: status.homeVotes, away: status.awayVotes }
    }));
  };

  // 투표하기
  const handleVote = async (team: VoteTeam, game: Game, isPastGame: boolean) => {
    const gameId = game.gameId;

    if (isPastGame) {
      toast.error('이미 종료된 경기는 투표할 수 없습니다.');
      return;
    }

    // 이미 투표했는데 다른 팀 클릭 시 확인
    if (userVote[gameId] && userVote[gameId] !== team) {
      const currentTeamName = userVote[gameId] === 'home' 
        ? getFullTeamName(game.homeTeam) 
        : getFullTeamName(game.awayTeam);
      const newTeamName = team === 'home' 
        ? getFullTeamName(game.homeTeam) 
        : getFullTeamName(game.awayTeam);
      
      setConfirmDialogData({
        title: '투표 변경',
        description: `현재 ${currentTeamName} 승리로 투표하셨습니다.\n${newTeamName}(으)로 변경하시겠습니까?`,
        onConfirm: () => {
          setShowConfirmDialog(false);
          executeVote(gameId, team, game);
        },
      });
      setShowConfirmDialog(true);
      return;
    }

    // 같은 팀 두 번 클릭 시 취소 확인
    if (userVote[gameId] === team) {
      setConfirmDialogData({
        title: '투표 취소',
        description: '투표를 취소하시겠습니까?',
        onConfirm: () => {
          setShowConfirmDialog(false);
          executeCancelVote(gameId);
        },
      });
      setShowConfirmDialog(true);
      return;
    }

    // 새로운 투표
    executeVote(gameId, team, game);
  };

  // 투표 실행
  const executeVote = async (gameId: string, team: VoteTeam, game: Game) => {
    try {
      await submitVote(gameId, team);
      setUserVote(prev => ({ ...prev, [gameId]: team }));
      loadVoteStatus(gameId);
      
      const teamName = team === 'home' 
        ? getFullTeamName(game.homeTeam) 
        : getFullTeamName(game.awayTeam);
      toast.success(`${teamName} 승리 예측이 저장되었습니다! ⚾`);
    } catch (error: any) {
      toast.error(error.message || '투표에 실패했습니다.');
    }
  };

  // 투표 취소 실행
  const executeCancelVote = async (gameId: string) => {
    const success = await cancelVote(gameId);
    if (success) {
      setUserVote(prev => ({ ...prev, [gameId]: null }));
      loadVoteStatus(gameId);
      toast.success('투표가 취소되었습니다.');
    } else {
      toast.error('투표 취소에 실패했습니다.');
    }
  };

  // 이전/다음 날짜로 이동
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

  // 로그인 페이지로 이동
  const handleGoToLogin = () => {
    setShowLoginRequiredDialog(false);
    navigate('/login');
  };

  // 현재 날짜의 경기 정보
  const currentDateGames = allDatesData[currentDateIndex]?.games || [];
  const currentDate = allDatesData[currentDateIndex]?.date || getTodayString();

  return {
    // State
    activeTab,
    setActiveTab,
    selectedGame,
    setSelectedGame,
    allDatesData,
    currentDateIndex,
    currentDateGames,
    currentDate,
    loading,
    votes,
    userVote,
    isAuthLoading,
    isLoggedIn,
    
    // Dialog
    showConfirmDialog,
    setShowConfirmDialog,
    confirmDialogData,
    showLoginRequiredDialog,
    setShowLoginRequiredDialog,
    
    // Handlers
    handleVote,
    goToPreviousDate,
    goToNextDate,
    handleGoToLogin,
  };
};