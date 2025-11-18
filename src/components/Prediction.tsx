import { Card } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import ChatBot from './ChatBot';
import { useState, useEffect } from 'react';
import TeamLogo from './TeamLogo';
import RankingPrediction from './RankingPrediction';

// KBO 팀 색상 매핑
const teamColors: { [key: string]: string } = {
  'LG': '#C8102E',
  '두산': '#131230',
  '기아': '#EA0029',
  'NC': '#1D467C',
  '삼성': '#074CA1',
  'SSG': '#CE0E2D',
  '롯데': '#041E42',
  '키움': '#570514',
  'KT': '#000000',
  '한화': '#FF6600'
};

// 백엔드 API 기본 URL
const API_BASE_URL = 'http://localhost:8080/api/predictions';

// 과거 경기 데이터 (일주일치) - 날짜별로 그룹화
const pastGamesData = [
  {
    date: '2024-10-27',
    games: [
      {
        gameId: 'game_20241027_1',
        homeTeam: 'LG',
        awayTeam: '두산',
        stadium: '잠실구장',
        homeScore: 5,
        awayScore: 3,
        winner: 'home'
      },
      {
        gameId: 'game_20241027_2',
        homeTeam: 'KT',
        awayTeam: 'SSG',
        stadium: '수원구장',
        homeScore: 2,
        awayScore: 4,
        winner: 'away'
      }
    ]
  },
  {
    date: '2024-10-28',
    games: [
      {
        gameId: 'game_20241028_1',
        homeTeam: 'NC',
        awayTeam: '기아',
        stadium: '창원구장',
        homeScore: 6,
        awayScore: 6,
        winner: 'draw'
      },
      {
        gameId: 'game_20241028_2',
        homeTeam: '삼성',
        awayTeam: '한화',
        stadium: '대구구장',
        homeScore: 8,
        awayScore: 3,
        winner: 'home'
      }
    ]
  },
  {
    date: '2024-10-29',
    games: [
      {
        gameId: 'game_20241029_1',
        homeTeam: '롯데',
        awayTeam: '키움',
        stadium: '사직구장',
        homeScore: 1,
        awayScore: 5,
        winner: 'away'
      },
      {
        gameId: 'game_20241029_2',
        homeTeam: 'LG',
        awayTeam: 'KT',
        stadium: '잠실구장',
        homeScore: 7,
        awayScore: 4,
        winner: 'home'
      }
    ]
  },
  {
    date: '2024-10-30',
    games: [
      {
        gameId: 'game_20241030_1',
        homeTeam: '두산',
        awayTeam: 'SSG',
        stadium: '잠실구장',
        homeScore: 3,
        awayScore: 3,
        winner: 'draw'
      },
      {
        gameId: 'game_20241030_2',
        homeTeam: '기아',
        awayTeam: 'NC',
        stadium: '광주구장',
        homeScore: 9,
        awayScore: 2,
        winner: 'home'
      }
    ]
  },
  {
    date: '2024-10-31',
    games: [
      {
        gameId: 'game_20241031_1',
        homeTeam: '한화',
        awayTeam: '삼성',
        stadium: '대전구장',
        homeScore: 2,
        awayScore: 6,
        winner: 'away'
      },
      {
        gameId: 'game_20241031_2',
        homeTeam: '키움',
        awayTeam: '롯데',
        stadium: '고척구장',
        homeScore: 5,
        awayScore: 5,
        winner: 'draw'
      }
    ]
  },
  {
    date: '2024-11-01',
    games: [
      {
        gameId: 'game_20241101_1',
        homeTeam: 'KT',
        awayTeam: 'LG',
        stadium: '수원구장',
        homeScore: 4,
        awayScore: 7,
        winner: 'away'
      },
      {
        gameId: 'game_20241101_2',
        homeTeam: 'SSG',
        awayTeam: '두산',
        stadium: '인천구장',
        homeScore: 8,
        awayScore: 1,
        winner: 'home'
      }
    ]
  },
  {
    date: '2024-11-02',
    games: [
      {
        gameId: 'game_20241102_1',
        homeTeam: 'NC',
        awayTeam: '한화',
        stadium: '창원구장',
        homeScore: 3,
        awayScore: 4,
        winner: 'away'
      },
      {
        gameId: 'game_20241102_2',
        homeTeam: '삼성',
        awayTeam: '기아',
        stadium: '대구구장',
        homeScore: 6,
        awayScore: 3,
        winner: 'home'
      }
    ]
  }
];

// 전체 날짜 배열 (과거 + 오늘 + 미래)
const allDatesData = [
  ...pastGamesData,
  // 오늘 (경기 없음)
  {
    date: new Date().toISOString().split('T')[0],
    games: []
  },
  // 내일 (예정 경기)
  {
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    games: [
      {
        gameId: 'game_future_1',
        homeTeam: 'LG',
        awayTeam: '두산',
        stadium: '잠실구장'
      },
      {
        gameId: 'game_future_2',
        homeTeam: 'KT',
        awayTeam: 'SSG',
        stadium: '수원구장'
      },
      {
        gameId: 'game_future_3',
        homeTeam: 'NC',
        awayTeam: '기아',
        stadium: '창원구장'
      },
      {
        gameId: 'game_future_4',
        homeTeam: '삼성',
        awayTeam: '한화',
        stadium: '대구구장'
      },
      {
        gameId: 'game_future_5',
        homeTeam: '롯데',
        awayTeam: '키움',
        stadium: '사직구장'
      }
    ]
  }
];

export default function Prediction() {
  const [activeTab, setActiveTab] = useState<'match' | 'ranking'>('match');
  const [selectedGame, setSelectedGame] = useState(0);
  
  // 현재 보고 있는 날짜 인덱스 (오늘은 pastGamesData.length)
  const [currentDateIndex, setCurrentDateIndex] = useState(pastGamesData.length);
  
  // 투표 현황
  const [votes, setVotes] = useState<{ [key: string]: { home: number; away: number } }>({});
  
  // 사용자 투표
  const [userVote, setUserVote] = useState<{ [key: string]: 'home' | 'away' | null }>({});
  
  const userId = 1;

  // 현재 날짜의 경기 목록
  const currentDateGames = allDatesData[currentDateIndex]?.games || [];

  // 현재 날짜
  const currentDate = allDatesData[currentDateIndex]?.date || new Date().toISOString().split('T')[0];

  // 경기 타입 확인 (과거/오늘/미래)
  const isPastGame = currentDateIndex < pastGamesData.length;
  const isFutureGame = currentDateIndex > pastGamesData.length;

  // 컴포넌트 마운트시 투표 현황 가져오기
  useEffect(() => {
    allDatesData.forEach((dateData) => {
      dateData.games.forEach((game) => {
        fetchVoteStatus(game.gameId);
      });
    });
  }, []);

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

  // 특정 경기의 투표 현황 가져오기
  const fetchVoteStatus = async (gameId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/status/${gameId}`);
      const data = await response.json();
      setVotes(prev => ({
        ...prev,
        [gameId]: { home: data.homeVotes, away: data.awayVotes }
      }));
    } catch (error) {
      console.error('투표 현황을 불러오는데 실패했습니다:', error);
      // 과거 경기는 더미 데이터, 미래 경기는 0으로 시작
      if (isPastGame) {
        setVotes(prev => ({
          ...prev,
          [gameId]: { home: Math.floor(Math.random() * 100) + 50, away: Math.floor(Math.random() * 100) + 50 }
        }));
      } else {
        setVotes(prev => ({
          ...prev,
          [gameId]: { home: 0, away: 0 }
        }));
      }
    }
  };

  // 투표하기
  const handleVote = async (team: 'home' | 'away') => {
    const currentGameId = currentDateGames[selectedGame]?.gameId;
    if (!currentGameId) return;

    // 이미 투표한 경우 취소
    if (userVote[currentGameId] === team) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/${currentGameId}?userId=${userId}`,
          { method: 'DELETE' }
        );
        if (response.ok) {
          setUserVote(prev => ({ ...prev, [currentGameId]: null }));
          fetchVoteStatus(currentGameId);
        }
      } catch (error) {
        console.error('투표 취소 실패:', error);
        setUserVote(prev => ({ ...prev, [currentGameId]: null }));
      }
      return;
    }

    // 다른 팀에 이미 투표한 경우
    if (userVote[currentGameId] && userVote[currentGameId] !== team) {
      alert('이미 다른 팀에 투표하셨습니다. 먼저 투표를 취소해주세요.');
      return;
    }

    // 새로운 투표
    try {
      const response = await fetch(
        `${API_BASE_URL}/vote?userId=${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gameId: currentGameId, votedTeam: team })
        }
      );
      if (response.ok) {
        setUserVote(prev => ({ ...prev, [currentGameId]: team }));
        fetchVoteStatus(currentGameId);
      } else {
        const errorText = await response.text();
        alert(errorText || '투표에 실패했습니다.');
      }
    } catch (error) {
      console.error('투표 실패:', error);
      setUserVote(prev => ({ ...prev, [currentGameId]: team }));
    }
  };

  // 팀명 매핑
  const getFullTeamName = (shortName: string) => {
    const teamNames: { [key: string]: string } = {
      'LG': 'LG 트윈스',
      '두산': '두산 베어스',
      'KT': 'KT 위즈',
      'SSG': 'SSG 랜더스',
      'NC': 'NC 다이노스',
      '기아': '기아 타이거즈',
      '삼성': '삼성 라이온즈',
      '한화': '한화 이글스',
      '롯데': '롯데 자이언츠',
      '키움': '키움 히어로즈'
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

  // 경기 결과 텍스트
  const getResultText = (team: 'home' | 'away') => {
    if (!isPastGame || !currentGame?.winner) return '';
    if (currentGame.winner === 'draw') return '무승부';
    return currentGame.winner === team ? '승리' : '패배';
  };

  // 투표 정확도 계산
  const getVoteAccuracy = () => {
    if (!isPastGame || !currentGame?.winner || currentGame.winner === 'draw') return null;
    const winningTeam = currentGame.winner;
    const winningVotes = winningTeam === 'home' ? currentVotes.home : currentVotes.away;
    return totalVotes > 0 ? Math.round((winningVotes / totalVotes) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-white">


      {/* Main Content */}
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
            {/* Date and Description */}
            <Card className="p-6 mb-6" style={{ backgroundColor: '#f0f9f6' }}>
              <div className="flex items-center justify-between">
                {/* 왼쪽 화살표 */}
                <button
                  onClick={goToPreviousDate}
                  disabled={currentDateIndex === 0}
                  className="p-2 hover:bg-white/50 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: '#2d5f4f' }}
                >
                  <ChevronLeft size={28} />
                </button>

                {/* 중앙 날짜 및 설명 */}
                <div className="flex-1 text-center">
                  <p className="mb-2" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                    {formatDate(currentDate)}
                  </p>
                  <p className="text-gray-600">
                    {isPastGame 
                      ? '과거 경기 결과와 투표 결과를 확인해보세요!' 
                      : isFutureGame
                      ? '여러분의 예측에 투표해주세요!'
                      : '여러분의 예측에 투표해주세요!'}
                  </p>
                </div>

                {/* 오른쪽 화살표 */}
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

            {/* 경기가 있는 경우 */}
            {currentDateGames.length > 0 ? (
              <>
                {/* Game Selection Tabs */}
                <div className="flex gap-3 mb-8">
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
                <Card className="p-8 mb-6">
                  {/* Teams Display */}
                  <div className="flex items-center justify-between mb-8">
                    {/* Away Team */}
                    <div className="flex flex-col items-center">
                      <div className="mb-3">
                        <TeamLogo team={currentGame.awayTeam} size={96} />
                      </div>
                      <p style={{ fontWeight: 700 }}>{getFullTeamName(currentGame.awayTeam)}</p>
                    </div>

                    {/* VS and Scores (과거 경기) 또는 VS and Time (미래 경기) */}
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

                    {/* Home Team */}
                    <div className="flex flex-col items-center">
                      <div className="mb-3">
                        <TeamLogo team={currentGame.homeTeam} size={96} />
                      </div>
                      <p style={{ fontWeight: 700 }}>{getFullTeamName(currentGame.homeTeam)}</p>
                    </div>
                  </div>

                  {/* Vote Buttons */}
                  <div className="flex gap-4 mb-6">
                    <Button
                      onClick={() => handleVote('away')}
                      className="flex-1 py-6 text-white text-lg rounded-lg hover:opacity-90 transition-opacity"
                      style={{ 
                        backgroundColor: teamColors[currentGame.awayTeam],
                        fontWeight: 700,
                        opacity: userVote[currentGameId] === 'away' ? 1 : userVote[currentGameId] === 'home' ? 0.5 : 1
                      }}
                    >
                      {currentGame.awayTeam} {isPastGame ? getResultText('away') : '승리'} {userVote[currentGameId] === 'away' && '✓'}
                    </Button>
                    <Button
                      onClick={() => handleVote('home')}
                      className="flex-1 py-6 text-white text-lg rounded-lg hover:opacity-90 transition-opacity"
                      style={{ 
                        backgroundColor: teamColors[currentGame.homeTeam],
                        fontWeight: 700,
                        opacity: userVote[currentGameId] === 'home' ? 1 : userVote[currentGameId] === 'away' ? 0.5 : 1
                      }}
                    >
                      {currentGame.homeTeam} {isPastGame ? getResultText('home') : '승리'} {userVote[currentGameId] === 'home' && '✓'}
                    </Button>
                  </div>

                  {/* Vote Results */}
                  <div className="rounded-lg p-6" style={{ backgroundColor: '#f0f9f6' }}>
                    <div className="flex items-center justify-between mb-4">
                      <span style={{ color: '#2d5f4f', fontWeight: 700 }}>
                        {isPastGame ? '투표 결과 현황' : '실시간 투표 현황'}
                      </span>
                      <span className="text-sm text-gray-600">
                        총 {totalVotes}명 참여
                      </span>
                    </div>
                    
                    {/* Vote Accuracy (과거 경기만) */}
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

                    {/* Team Names */}
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontWeight: 700, color: '#333' }}>
                        {getFullTeamName(currentGame.awayTeam)}
                      </span>
                      <span style={{ fontWeight: 700, color: '#333' }}>
                        {getFullTeamName(currentGame.homeTeam)}
                      </span>
                    </div>

                    {/* Combined Progress Bar */}
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

                {/* User Vote Status */}
                {userVote[currentGameId] && (
                  <div className="text-center mb-6">
                    <p style={{ color: '#2d5f4f', fontWeight: 700 }}>
                      ✅ {userVote[currentGameId] === 'home' 
                        ? getFullTeamName(currentGame.homeTeam) 
                        : getFullTeamName(currentGame.awayTeam)} {isPastGame ? getResultText(userVote[currentGameId]) : '승리'}에 투표하셨습니다!
                      {isPastGame && userVote[currentGameId] === currentGame.winner && ' 정확한 예측이었습니다! 🎉'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* 경기가 없는 경우 (오늘 날짜) */
              <Card className="p-16 text-center"  style={{ 
                    backgroundColor: '#f0f9f6',
                    height: '500px',
                    justifyContent: 'center'
                  }}>
                <h3 className="text-xl font-bold" style={{ color: '#2d5f4f' }}>
                  예정된 경기 일정이 없습니다.
                </h3>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Ranking Prediction Description */}
            <Card className="p-6 mb-6" style={{ backgroundColor: '#f0f9f6' }}>
              <p className="text-center mb-2" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                2026 시즌 순위 예측
              </p>
              <p className="text-center text-gray-600">
                팀을 드래그해서 내년 시즌 순위를 예측해보세요
              </p>
            </Card>

            {/* Ranking Prediction Component */}
            <RankingPrediction />
          </>
        )}
      </div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}