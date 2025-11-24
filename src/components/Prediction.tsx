import { Card } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import ChatBot from './ChatBot';
import { useState, useEffect } from 'react';
import TeamLogo from './TeamLogo';
import RankingPrediction from './RankingPrediction';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

// KBO 팀 색상 매핑 (DB 팀 ID 기준)
const teamColors: { [key: string]: string } = {
  'LG': '#C8102E',
  'OB': '#131230',
  'HT': '#EA0029',
  'NC': '#1D467C',
  'SS': '#074CA1',
  'SK': '#CE0E2D',
  'LT': '#041E42',
  'WO': '#570514',
  'KT': '#000000',
  'HH': '#FF6600'
};

// 백엔드 API 기본 URL
const API_BASE_URL = 'http://localhost:8080/api';

// 타입 정의
interface Game {
  gameId: string;
  gameDate: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  homeScore?: number;
  awayScore?: number;
  winner?: string | null;
}

interface DateGames {
  date: string;
  games: Game[];
}

export default function Prediction() {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);

  const [activeTab, setActiveTab] = useState<'match' | 'ranking'>('match');
  const [selectedGame, setSelectedGame] = useState(0);
  
  // 날짜별 경기 데이터
  const [allDatesData, setAllDatesData] = useState<DateGames[]>([]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // 투표 현황
  const [votes, setVotes] = useState<{ [key: string]: { home: number; away: number } }>({});
  
  // 사용자 투표
  const [userVote, setUserVote] = useState<{ [key: string]: 'home' | 'away' | null }>({});

  // 다이얼로그 상태
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // 로그인 필요 알럿 다이얼로그 
  const [showLoginRequiredDialog, setShowLoginRequiredDialog] = useState(false);

  // 로그인 체크 
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      setLoading(false); // 로딩 상태 해제
      setShowLoginRequiredDialog(true); // 다이얼로그 표시
    } else if (!isAuthLoading && isLoggedIn) {
      // 인증 로딩 완료 & 로그인 상태일 경우에만 데이터 로드 시작
      fetchAllGames();
    }
  }, [isLoggedIn, isAuthLoading]);

  // 로그인 페이지로 이동 핸들러
  const handleGoToLogin = () => {
    setShowLoginRequiredDialog(false);
    navigate('/login');
  };


  // 인증 헤더 생성 함수
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
    };
  };

  // 날짜별로 그룹화 (오래된 날짜부터 최신 날짜 순)
  const groupByDate = (games: Game[]): DateGames[] => {
    const grouped: { [key: string]: Game[] } = {};
    
    games.forEach(game => {
      if (!grouped[game.gameDate]) {
        grouped[game.gameDate] = [];
      }
      grouped[game.gameDate].push(game);
    });

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map(date => ({ date, games: grouped[date] }));
  };

  // 모든 경기 데이터 가져오기 
  const fetchAllGames = async () => {
    try {
      setLoading(true);

      const pastRes = await fetch(`${API_BASE_URL}/games/past`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const pastData: Game[] = await pastRes.json();

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      // 오늘 날짜로 더미 데이터 가져오기
      const todayRes = await fetch(`${API_BASE_URL}/matches?date=${today}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const todayData: Game[] = await todayRes.json();

      const groupedPastGames = groupByDate(pastData);
      
      // 오늘 날짜는 항상 경기 없음으로 추가
      const todayGroup: DateGames = { date: today, games: [] };
      
      // 오늘 API에서 가져온 더미 데이터를 내일 날짜로 표시
      const allDates = [...groupedPastGames, todayGroup];
      if (todayData.length > 0) {
        const tomorrowGroup: DateGames = { date: tomorrow, games: todayData };
        allDates.push(tomorrowGroup);
      }
      
      setAllDatesData(allDates);
      
      // 오늘 날짜의 인덱스 찾기
      const todayIndex = allDates.findIndex(d => d.date === today);
      setCurrentDateIndex(todayIndex !== -1 ? todayIndex : 0);

      await fetchAllUserVotes([...pastData, ...todayData]);

    } catch (error) {
      console.error('경기 데이터를 불러오는데 실패했습니다:', error);
    } finally {
      setLoading(false);
    }
  };

  // 모든 경기의 사용자 투표 불러오기
  const fetchAllUserVotes = async (games: Game[]) => {
    const votes: { [key: string]: 'home' | 'away' | null } = {};
    
    for (const game of games) {
      try {
        const response = await fetch(`${API_BASE_URL}/predictions/my-vote/${game.gameId}`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          votes[game.gameId] = data.votedTeam || null;
        }
      } catch (error) {
        console.error(`투표 기록 불러오기 실패 (${game.gameId}):`, error);
      }
    }
    
    setUserVote(votes);
  };

  // 현재 날짜의 경기 목록
  const currentDateGames = allDatesData[currentDateIndex]?.games || [];
  const currentDate = allDatesData[currentDateIndex]?.date || new Date().toISOString().split('T')[0];

  // 경기 타입 확인
  const isPastGame = currentDateGames.length > 0 && currentDateGames[0].homeScore != null;
  const today = new Date().toISOString().split('T')[0];
  const isFutureGame = currentDate > today;
  const isToday = currentDate === today;

  // 날짜가 변경될 때마다 첫 번째 경기로 리셋
  useEffect(() => {
    setSelectedGame(0);
  }, [currentDateIndex]);

  // 경기가 변경될 때마다 투표 현황 가져오기
  useEffect(() => {
    if (currentDateGames.length > 0) {
      const currentGameId = currentDateGames[selectedGame]?.gameId;
      if (currentGameId) {
        fetchVoteStatus(currentGameId);
      }
    }
  }, [selectedGame, currentDateGames]);

  // 투표 현황 가져오기
  const fetchVoteStatus = async (gameId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/predictions/status/${gameId}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const data = await response.json();
      setVotes(prev => ({
        ...prev,
        [gameId]: { home: data.homeVotes, away: data.awayVotes }
      }));
    } catch (error) {
      console.error('투표 현황을 불러오는데 실패했습니다:', error);
      setVotes(prev => ({
        ...prev,
        [gameId]: { home: 0, away: 0 }
      }));
    }
  };

  // 투표하기
  const handleVote = async (team: 'home' | 'away') => {
    const currentGameId = currentDateGames[selectedGame]?.gameId;
    if (!currentGameId) return;

    if (isPastGame) {
      toast.error('이미 종료된 경기는 투표할 수 없습니다.');
      return;
    }

    // 이미 투표했는데 다른 팀 클릭 시 확인
    if (userVote[currentGameId] && userVote[currentGameId] !== team) {
      const currentTeamName = userVote[currentGameId] === 'home' 
        ? getFullTeamName(currentGame!.homeTeam) 
        : getFullTeamName(currentGame!.awayTeam);
      const newTeamName = team === 'home' 
        ? getFullTeamName(currentGame!.homeTeam) 
        : getFullTeamName(currentGame!.awayTeam);
      
      setConfirmDialogData({
        title: '투표 변경',
        description: `현재 ${currentTeamName} 승리로 투표하셨습니다.\n${newTeamName}(으)로 변경하시겠습니까?`,
        onConfirm: () => {
          setShowConfirmDialog(false);
          executeVote(currentGameId, team);
        },
      });
      setShowConfirmDialog(true);
      return;
    }

    // 같은 팀 두 번 클릭 시 취소 확인
    if (userVote[currentGameId] === team) {
      setConfirmDialogData({
        title: '투표 취소',
        description: '투표를 취소하시겠습니까?',
        onConfirm: () => {
          setShowConfirmDialog(false);
          executeCancelVote(currentGameId);
        },
      });
      setShowConfirmDialog(true);
      return;
    }

    // 새로운 투표
    executeVote(currentGameId, team);
  };

  // 투표 실행
  const executeVote = async (gameId: string, team: 'home' | 'away') => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/predictions/vote`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ gameId, votedTeam: team })
        }
      );
      if (response.ok) {
        setUserVote(prev => ({ ...prev, [gameId]: team }));
        fetchVoteStatus(gameId);
        
        const game = currentDateGames.find(g => g.gameId === gameId);
        if (game) {
          const teamName = team === 'home' 
            ? getFullTeamName(game.homeTeam) 
            : getFullTeamName(game.awayTeam);
          toast.success(`${teamName} 승리 예측이 저장되었습니다! ⚾`);
        }
      } else {
        const errorText = await response.text();
        toast.error(errorText || '투표에 실패했습니다.');
      }
    } catch (error) {
      console.error('투표 실패:', error);
      toast.error('투표에 실패했습니다.');
    }
  };

  // 투표 취소 실행
  const executeCancelVote = async (gameId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/predictions/${gameId}`,
        { 
          method: 'DELETE',
          headers: getAuthHeaders(),
          credentials: 'include'
        }
      );
      if (response.ok) {
        setUserVote(prev => ({ ...prev, [gameId]: null }));
        fetchVoteStatus(gameId);
        toast.success('투표가 취소되었습니다.');
      }
    } catch (error) {
      console.error('투표 취소 실패:', error);
      toast.error('투표 취소에 실패했습니다.');
    }
  };

  // 팀명 매핑
  const getFullTeamName = (shortName: string) => {
    const teamNames: { [key: string]: string } = {
      'LG': 'LG 트윈스',
      'OB': '두산 베어스',
      'KT': 'KT 위즈',
      'SK': 'SSG 랜더스',
      'NC': 'NC 다이노스',
      'HT': '기아 타이거즈',
      'SS': '삼성 라이온즈',
      'HH': '한화 이글스',
      'LT': '롯데 자이언츠',
      'WO': '키움 히어로즈'
    };
    return teamNames[shortName] || shortName;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}요일`;
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

  // 현재 경기 정보
  const currentGame = currentDateGames.length > 0 ? currentDateGames[selectedGame] : null;
  const currentGameId = currentGame?.gameId;
  const currentVotes = currentGameId ? votes[currentGameId] || { home: 0, away: 0 } : { home: 0, away: 0 };
  const totalVotes = currentVotes.home + currentVotes.away;
  const homePercentage = totalVotes > 0 ? Math.round((currentVotes.home / totalVotes) * 100) : 0;
  const awayPercentage = totalVotes > 0 ? Math.round((currentVotes.away / totalVotes) * 100) : 0;

  // 투표 정확도 계산
  const getVoteAccuracy = () => {
    if (!isPastGame || !currentGame?.winner || currentGame.winner === 'draw') return null;
    const winningTeam = currentGame.winner;
    const winningVotes = winningTeam === 'home' ? currentVotes.home : currentVotes.away;
    return totalVotes > 0 ? Math.round((winningVotes / totalVotes) * 100) : 0;
  };

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5f4f] mx-auto mb-4"></div>
          <p style={{ color: '#2d5f4f' }}>
            {isAuthLoading ? '로그인 확인 중...' : '경기 데이터를 불러오는 중...'}
          </p>
        </div>
      </div>
    );
  }

  // 로그인 안 되어 있으면 다이얼로그만 표시
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white">
        <AlertDialog open={showLoginRequiredDialog} onOpenChange={setShowLoginRequiredDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color: '#2d5f4f' }}>
                로그인 필요
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                로그인이 필요한 서비스입니다.<br />
                로그인 페이지로 이동하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => navigate('/')}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleGoToLogin}
                className="text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                로그인하러 가기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-white">
      {/* 컨펌 다이얼로그 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#2d5f4f' }}>
              {confirmDialogData.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base whitespace-pre-line">
              {confirmDialogData.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialogData.onConfirm}
              className="text-white"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-7 h-7" style={{ color: '#2d5f4f' }} />
          <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>KBO 예측</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab('match')}
            className="px-6 py-3 rounded-xl transition-all"
            style={{
              backgroundColor: activeTab === 'match' ? '#2d5f4f' : '#f3f4f6',
              color: activeTab === 'match' ? 'white' : '#6b7280',
              fontWeight: activeTab === 'match' ? 700 : 400
            }}
          >
            승부예측
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className="px-6 py-3 rounded-xl transition-all"
            style={{
              backgroundColor: activeTab === 'ranking' ? '#2d5f4f' : '#f3f4f6',
              color: activeTab === 'ranking' ? 'white' : '#6b7280',
              fontWeight: activeTab === 'ranking' ? 700 : 400
            }}
          >
            순위예측
          </button>
        </div>

        {activeTab === 'match' ? (
          <>
            {/* Date Navigation */}
            <Card className="p-6 mb-6" style={{ backgroundColor: '#f0f9f6' }}>
              <div className="flex items-center justify-between">
                <button
                  onClick={goToPreviousDate}
                  disabled={currentDateIndex === 0}
                  className="p-2 hover:bg-white/50 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: '#2d5f4f' }}
                >
                  <ChevronLeft size={28} />
                </button>

                <div className="flex-1 text-center">
                  <p className="mb-2" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                    {formatDate(currentDate)}
                  </p>
                  <p className="text-gray-600">
                    {isPastGame 
                      ? '과거 경기 결과와 투표 결과를 확인해보세요!' 
                      : isFutureGame
                      ? '여러분의 예측에 투표해주세요!'
                      : isToday && currentDateGames.length === 0
                      ? '오늘은 예정된 경기가 없습니다.'
                      : '여러분의 예측에 투표해주세요!'}
                  </p>
                </div>

                <button
                  onClick={goToNextDate}
                  disabled={currentDateIndex === allDatesData.length - 1}
                  className="p-2 hover:bg-white/50 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: '#2d5f4f' }}
                >
                  <ChevronRight size={28} />
                </button>
              </div>
            </Card>

            {currentDateGames.length > 0 ? (
              <>
                {/* Game Selection Tabs */}
                <div className="flex gap-3 mb-8 flex-wrap">
                  {currentDateGames.map((_, index) => (
                    <Button
                      key={index}
                      onClick={() => setSelectedGame(index)}
                      className={`rounded-lg px-6 py-2 ${
                        selectedGame === index 
                          ? 'text-white' 
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                      style={selectedGame === index ? { backgroundColor: '#2d5f4f' } : {}}
                    >
                      {index + 1}경기
                    </Button>
                  ))}
                </div>

                {/* Game Card */}
                {currentGame && (
                  <Card className="p-8 mb-6">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col items-center">
                        <div className="mb-3">
                          <TeamLogo team={currentGame.awayTeam} size={96} />
                        </div>
                        <p style={{ fontWeight: 700 }}>{getFullTeamName(currentGame.awayTeam)}</p>
                      </div>

                      {isPastGame ? (
                        <div className="flex items-center gap-8">
                          <span className="text-6xl font-bold" style={{ color: teamColors[currentGame.awayTeam] }}>
                            {currentGame.awayScore}
                          </span>
                          <span style={{ fontSize: '2rem', fontWeight: 900, color: '#2d5f4f' }}>VS</span>
                          <span className="text-6xl font-bold" style={{ color: teamColors[currentGame.homeTeam] }}>
                            {currentGame.homeScore}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <span style={{ fontSize: '2rem', fontWeight: 900, color: '#2d5f4f' }}>VS</span>
                          <div 
                            className="px-4 py-2 rounded-full text-white"
                            style={{ backgroundColor: '#2d5f4f' }}
                          >
                            18:30
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col items-center">
                        <div className="mb-3">
                          <TeamLogo team={currentGame.homeTeam} size={96} />
                        </div>
                        <p style={{ fontWeight: 700 }}>{getFullTeamName(currentGame.homeTeam)}</p>
                      </div>
                    </div>

                    {isFutureGame && !isToday && (
                      <div className="flex gap-4 mb-6">
                        <Button
                          onClick={() => handleVote('away')}
                          className="flex-1 py-6 text-white text-lg rounded-lg hover:opacity-90 transition-opacity"
                          style={{ 
                            backgroundColor: teamColors[currentGame.awayTeam],
                            fontWeight: 700,
                            opacity: userVote[currentGameId!] === 'away' ? 1 : userVote[currentGameId!] === 'home' ? 0.5 : 1
                          }}
                        >
                          {getFullTeamName(currentGame.awayTeam)} {userVote[currentGameId!] === 'away' && '✓'}
                        </Button>
                        <Button
                          onClick={() => handleVote('home')}
                          className="flex-1 py-6 text-white text-lg rounded-lg hover:opacity-90 transition-opacity"
                          style={{ 
                            backgroundColor: teamColors[currentGame.homeTeam],
                            fontWeight: 700,
                            opacity: userVote[currentGameId!] === 'home' ? 1 : userVote[currentGameId!] === 'away' ? 0.5 : 1
                          }}
                        >
                          {getFullTeamName(currentGame.homeTeam)} {userVote[currentGameId!] === 'home' && '✓'}
                        </Button>
                      </div>
                    )}

                    <div className="rounded-lg p-6" style={{ backgroundColor: '#f0f9f6' }}>
                      <div className="flex items-center justify-between mb-4">
                        <span style={{ color: '#2d5f4f', fontWeight: 700 }}>
                          {isPastGame ? '투표 결과 현황' : '실시간 투표 현황'}
                        </span>
                        <span className="text-sm text-gray-600">
                          총 {totalVotes}명 참여
                        </span>
                      </div>
                      
                      {isPastGame && currentGame.winner !== 'draw' && getVoteAccuracy() !== null && (
                        <div className="mb-3 text-center text-sm" style={{ color: '#2d5f4f' }}>
                          <span className="font-bold">{getVoteAccuracy()}%</span>의 팬들이 승리팀을 정확히 예측했습니다!
                        </div>
                      )}

                      {isPastGame && currentGame.winner === 'draw' && (
                        <div className="mb-3 text-center text-sm font-bold" style={{ color: '#f59e0b' }}>
                          무승부 경기입니다
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <span style={{ fontWeight: 700, color: '#333' }}>
                          {getFullTeamName(currentGame.awayTeam)}
                        </span>
                        <span style={{ fontWeight: 700, color: '#333' }}>
                          {getFullTeamName(currentGame.homeTeam)}
                        </span>
                      </div>

                      <div className="relative w-full h-12 rounded-lg overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
                        <div className="absolute inset-0 flex">
                          <div
                            className="flex items-center justify-center text-white transition-all duration-500"
                            style={{ 
                              width: `${awayPercentage}%`,
                              backgroundColor: teamColors[currentGame.awayTeam],
                              fontWeight: 700,
                              fontSize: '1.125rem',
                              opacity: isPastGame && currentGame.winner === 'away' ? 1 : isPastGame ? 0.6 : 1
                            }}
                          >
                            {totalVotes > 0 && awayPercentage > 0 && `${awayPercentage}%`}
                          </div>
                          <div
                            className="flex items-center justify-center text-white transition-all duration-500"
                            style={{ 
                              width: `${homePercentage}%`,
                              backgroundColor: teamColors[currentGame.homeTeam],
                              fontWeight: 700,
                              fontSize: '1.125rem',
                              opacity: isPastGame && currentGame.winner === 'home' ? 1 : isPastGame ? 0.6 : 1
                            }}
                          >
                            {totalVotes > 0 && homePercentage > 0 && `${homePercentage}%`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {currentGameId && userVote[currentGameId] && currentGame && (
                  <div className="text-center mb-6">
                    <p style={{ color: '#2d5f4f', fontWeight: 700 }}>
                       {userVote[currentGameId] === 'home' 
                        ? getFullTeamName(currentGame.homeTeam) 
                        : getFullTeamName(currentGame.awayTeam)}에 투표하셨습니다!
                      {isPastGame && userVote[currentGameId] === currentGame.winner && ' 정확한 예측이었습니다! ⚾'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <Card className="p-16 text-center" style={{ 
                backgroundColor: '#f0f9f6',
                height: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <h3 className="text-xl font-bold" style={{ color: '#2d5f4f' }}>
                  {isToday ? '오늘은 예정된 경기가 없습니다.' : '예정된 경기 일정이 없습니다.'}
                </h3>
              </Card>
            )}
          </>
        ) : (
          <>
            <Card className="p-6 mb-6" style={{ backgroundColor: '#f0f9f6' }}>
              <p className="text-center mb-2" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                2026 시즌 순위 예측
              </p>
              <p className="text-center text-gray-600">
                팀을 드래그해서 내년 시즌 순위를 예측해보세요
              </p>
            </Card>
            <RankingPrediction />
          </>
        )}
      </div>

      <ChatBot />
    </div>
  );
}