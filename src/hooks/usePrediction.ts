// hooks/usePrediction.ts
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { Game, DateGames, VoteStatus, ConfirmDialogData, VoteTeam, PredictionTab, GameDetail } from '../types/prediction';
import {
  fetchMatchesByDate,
  fetchMatchesByRange,
  fetchAllUserVotes as fetchAllUserVotesAPI,
  fetchVoteStatus,
  submitVote,
  cancelVote,
  fetchGameDetail
} from '../api/prediction';
import {
  groupByDate,
  getTodayString,
  getTomorrowString,
  getFullTeamName,
  formatDate,
  generateDateRange
} from '../utils/prediction';

export const usePrediction = () => {
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

  // 경기 상세 정보
  const [gameDetails, setGameDetails] = useState<{ [key: string]: GameDetail | null }>({});
  const [gameDetailLoading, setGameDetailLoading] = useState<{ [key: string]: boolean }>({});

  // 다이얼로그 상태
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<ConfirmDialogData>({
    title: '',
    description: '',
    onConfirm: () => { },
  });
  // 로그인 체크
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      setLoading(false);
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

  // 경기 상세 정보 가져오기
  useEffect(() => {
    const currentDateGames = allDatesData[currentDateIndex]?.games || [];
    if (currentDateGames.length === 0) return;

    const currentGameId = currentDateGames[selectedGame]?.gameId;
    if (!currentGameId || gameDetails[currentGameId] !== undefined) return;

    const loadGameDetail = async () => {
      try {
        setGameDetailLoading((prev) => ({ ...prev, [currentGameId]: true }));
        const detail = await fetchGameDetail(currentGameId);
        setGameDetails((prev) => ({ ...prev, [currentGameId]: detail }));
      } catch {
        setGameDetails((prev) => ({ ...prev, [currentGameId]: null }));
      } finally {
        setGameDetailLoading((prev) => ({ ...prev, [currentGameId]: false }));
      }
    };

    loadGameDetail();
  }, [selectedGame, allDatesData, currentDateIndex, gameDetails]);

  // 모든 경기 데이터 가져오기
  const fetchAllGames = async () => {
    try {
      setLoading(true);

      const today = getTodayString();
      const currentYear = new Date().getFullYear();

      // 이전 연도부터 올해 말까지 전체 데이터 조회 (2025-2026) -> 연도 간 네비게이션 지원
      const startDate = `${currentYear - 1}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const allMatches = await fetchMatchesByRange(startDate, endDate);

      // 1. 실제 경기가 있는 날짜들만 그룹화 (빈 날짜 자동 스킵)
      let allDates = groupByDate(allMatches);

      // 데이터가 아예 없으면 "오늘"만 표시 (빈 화면)
      if (allDates.length === 0) {
        allDates = [{ date: today, games: [] }];
        setAllDatesData(allDates);
        setCurrentDateIndex(0);
        setLoading(false);
        return;
      }

      // 날짜순 정렬
      allDates.sort((a, b) => a.date.localeCompare(b.date));

      // 마지막 날짜에 경기가 있다면, 그 다음 날(빈 날짜)을 하나 추가하여
      // "다음" 버튼을 눌렀을 때 "예정된 경기가 없습니다" 화면을 볼 수 있게 함
      const lastEntry = allDates[allDates.length - 1];
      if (lastEntry.games.length > 0) {
        const lastDateObj = new Date(lastEntry.date);
        const nextDateObj = new Date(lastDateObj);
        nextDateObj.setDate(nextDateObj.getDate() + 1);
        const nextDateString = nextDateObj.toISOString().split('T')[0];

        allDates.push({ date: nextDateString, games: [] });
      }

      setAllDatesData(allDates);

      // 오늘 날짜가 목록에 없으면 추가 (네비게이션 기준점 역할)
      // 단, 이미 위에서 빈 날짜를 추가했으므로 중복 체크 필요
      const todayExists = allDates.some(d => d.date === today);
      if (!todayExists) {
        // 오늘이 목록 범위 내에 있는지 확인, 없으면 삽입하고 다시 정렬
        allDates.push({ date: today, games: [] });
        allDates.sort((a, b) => a.date.localeCompare(b.date));
      }

      setAllDatesData(allDates);

      // 3. 네비게이션 초기 위치 선정 (Smart Default)
      // 오늘 또는 오늘 이후 중 '경기가 있고 아직 종료되지 않은' 가장 가까운 날짜 찾기
      let activeIndex = allDates.findIndex(d =>
        d.date >= today && d.games.some(game => game.homeScore === null)
      );

      // 만약 오늘 이후에 '종료되지 않은' 경기가 없다면 (이미 오늘 다 끝났거나 시즌 말)
      if (activeIndex === -1) {
        // 오늘 날짜가 목록에 있으면 오늘이라도 보여줌
        activeIndex = allDates.findIndex(d => d.date === today);

        // 오늘조차 없으면 가장 마지막(최신) 데이터
        if (activeIndex === -1) {
          activeIndex = allDates.length - 1;
        }
      }

      setCurrentDateIndex(activeIndex !== -1 ? activeIndex : 0);

      // 종료되지 않은 전 경기 사용자 투표 조회 (투표 가능 게임들)
      const interactiveGames = allMatches.filter(game => game.homeScore === null);
      if (interactiveGames.length > 0) {
        const userVotes = await fetchAllUserVotesAPI(interactiveGames);
        setUserVote(userVotes);
      }

    } catch (error) {
      // Global handler catches this for major fetch errors (games list).
      // We just need to stop loading.
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
  const handleVote = async (team: VoteTeam, game: Game, isVoteOpen: boolean) => {
    const gameId = game.gameId;

    if (!isVoteOpen) {
      toast.error('현재는 투표할 수 없습니다.');
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
        description: '투표를 취소하시겠습니까?\n\n(❗️ 주의: 사용된 포인트는 반환되지 않습니다)',
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

      const hadExistingVote = userVote[gameId] != null;
      if (!hadExistingVote) {
        // 포인트 즉시 차감 (UI 업데이트)
        const { deductCheerPoints } = useAuthStore.getState();
        deductCheerPoints(1);
      }

      setUserVote(prev => ({ ...prev, [gameId]: team }));
      loadVoteStatus(gameId);

      const teamName = team === 'home'
        ? getFullTeamName(game.homeTeam)
        : getFullTeamName(game.awayTeam);
      toast.success(`${teamName} 승리 예측이 저장되었습니다! ⚾`);

      // 콤보 애니메이션 트리거 (현재 연승 표시)
      const { currentStreak, triggerCombo } = useLeaderboardStore.getState();
      if (currentStreak > 0) {
        triggerCombo(currentStreak);
      }
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

  // 현재 날짜의 경기 정보
  const currentDateGames = allDatesData[currentDateIndex]?.games || [];
  const currentDate = allDatesData[currentDateIndex]?.date || getTodayString();
  const currentGameId = currentDateGames[selectedGame]?.gameId;
  const currentGameDetail = currentGameId ? gameDetails[currentGameId] ?? null : null;
  const currentGameDetailLoading = currentGameId ? !!gameDetailLoading[currentGameId] : false;

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
    currentGameDetail,
    currentGameDetailLoading,
    isAuthLoading,
    isLoggedIn,

    // Dialog
    showConfirmDialog,
    setShowConfirmDialog,
    confirmDialogData,
    // Handlers
    handleVote,
    goToPreviousDate,
    goToNextDate,
  };
};
