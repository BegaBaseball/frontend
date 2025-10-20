import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Bell, User, TrendingUp, RotateCcw } from 'lucide-react';
import ChatBot from './ChatBot';
import { useState } from 'react';
import TeamLogo from './TeamLogo';

interface PredictionProps {
  onNavigateToLogin: () => void;
  onNavigate: (view: string) => void;
}

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

export default function Prediction({ onNavigateToLogin, onNavigate }: PredictionProps) {
  const [selectedGame, setSelectedGame] = useState(0);
  const [votes, setVotes] = useState<{ [key: number]: { home: number; away: number } }>({
    0: { home: 0, away: 0 },
    1: { home: 0, away: 0 },
    2: { home: 0, away: 0 }
  });
  const [userVote, setUserVote] = useState<{ [key: number]: 'home' | 'away' | null }>({
    0: null,
    1: null,
    2: null
  });

  const games = [
    {
      homeTeam: 'LG',
      homeTeamFull: 'LG 트윈스',
      awayTeam: '두산',
      awayTeamFull: '두산 베어스',
      time: '18:30',
      stadium: '잠실구장'
    },
    {
      homeTeam: 'KT',
      homeTeamFull: 'KT 위즈',
      awayTeam: 'SSG',
      awayTeamFull: 'SSG 랜더스',
      time: '18:30',
      stadium: '수원구장'
    },
    {
      homeTeam: 'NC',
      homeTeamFull: 'NC 다이노스',
      awayTeam: '기아',
      awayTeamFull: '기아 타이거즈',
      time: '18:30',
      stadium: '창원구장'
    }
  ];

  const handleVote = (team: 'home' | 'away') => {
    if (userVote[selectedGame]) return; // 이미 투표한 경우
    
    setVotes(prev => ({
      ...prev,
      [selectedGame]: {
        ...prev[selectedGame],
        [team]: prev[selectedGame][team] + 1
      }
    }));
    
    setUserVote(prev => ({
      ...prev,
      [selectedGame]: team
    }));
  };

  const handleReset = () => {
    setVotes({
      0: { home: 0, away: 0 },
      1: { home: 0, away: 0 },
      2: { home: 0, away: 0 }
    });
    setUserVote({
      0: null,
      1: null,
      2: null
    });
  };

  const currentGame = games[selectedGame];
  const currentVotes = votes[selectedGame];
  const totalVotes = currentVotes.home + currentVotes.away;
  const homePercentage = totalVotes > 0 ? Math.round((currentVotes.home / totalVotes) * 100) : 0;
  const awayPercentage = totalVotes > 0 ? Math.round((currentVotes.away / totalVotes) * 100) : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={() => onNavigate('home')} className="flex items-center gap-3">
              <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
              <div>
                <h1 className="tracking-wider" style={{ fontWeight: 900, color: '#2d5f4f' }}>BEGA</h1>
                <p className="text-xs" style={{ color: '#2d5f4f' }}>BASEBALL GUIDE</p>
              </div>
            </button>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => onNavigate('home')} 
                className="text-gray-700 hover:opacity-70"
              >
                홈
              </button>
              <button 
                onClick={() => onNavigate('cheer')}
                className="text-gray-700 hover:opacity-70"
              >
                응원
              </button>
              <button 
                onClick={() => onNavigate('stadium')} 
                className="text-gray-700 hover:opacity-70"
              >
                구장
              </button>
              <button 
                onClick={() => onNavigate('prediction')}
                className="hover:opacity-70"
                style={{ color: '#2d5f4f', fontWeight: 700 }}
              >
                예측
              </button>
              <button 
                onClick={() => onNavigate('diary')}
                className="text-gray-700 hover:opacity-70"
              >
                다이어리
              </button>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button className="text-gray-600 hover:text-gray-900 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button 
                onClick={() => onNavigate('mypage')}
                className="text-gray-600 hover:text-gray-900"
              >
                <User className="w-5 h-5" />
              </button>
              <Button
                onClick={onNavigateToLogin}
                className="rounded-full px-6"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                로그인
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-7 h-7" style={{ color: '#2d5f4f' }} />
          <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>KBO 오늘의 승부예측</h2>
        </div>

        {/* Date and Description */}
        <Card className="p-6 mb-6" style={{ backgroundColor: '#f0f9f6' }}>
          <p className="text-center mb-2" style={{ color: '#2d5f4f', fontWeight: 700 }}>
            {new Date().getFullYear()}년 {new Date().getMonth() + 1}월 {new Date().getDate()}일{' '}
            {['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()]}요일
          </p>
          <p className="text-center text-gray-600">
            여러분의 예측에 투표해주세요!
          </p>
        </Card>

        {/* Game Selection Tabs */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-3">
            {games.map((_, index) => (
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
          <Button
            onClick={handleReset}
            className="rounded-lg px-6 py-2 bg-red-500 text-white hover:bg-red-600"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            리셋
          </Button>
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
              <p style={{ fontWeight: 700 }}>{currentGame.awayTeamFull}</p>
            </div>

            {/* VS and Time */}
            <div className="flex flex-col items-center gap-2">
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#2d5f4f' }}>VS</span>
              <div 
                className="px-4 py-2 rounded-full text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                {currentGame.time}
              </div>
            </div>

            {/* Home Team */}
            <div className="flex flex-col items-center">
              <div className="mb-3">
                <TeamLogo team={currentGame.homeTeam} size={96} />
              </div>
              <p style={{ fontWeight: 700 }}>{currentGame.homeTeamFull}</p>
            </div>
          </div>

          {/* Vote Buttons */}
          <div className="flex gap-4 mb-6">
            <Button
              onClick={() => handleVote('away')}
              disabled={userVote[selectedGame] !== null}
              className="flex-1 py-6 text-white text-lg rounded-lg hover:opacity-90 transition-opacity disabled:opacity-70"
              style={{ 
                backgroundColor: teamColors[currentGame.awayTeam],
                fontWeight: 700
              }}
            >
              {currentGame.awayTeam} 승리
            </Button>
            <Button
              onClick={() => handleVote('home')}
              disabled={userVote[selectedGame] !== null}
              className="flex-1 py-6 text-white text-lg rounded-lg hover:opacity-90 transition-opacity disabled:opacity-70"
              style={{ 
                backgroundColor: teamColors[currentGame.homeTeam],
                fontWeight: 700
              }}
            >
              {currentGame.homeTeam} 승리
            </Button>
          </div>

          {/* Vote Results */}
          <div className="rounded-lg p-6" style={{ backgroundColor: '#f0f9f6' }}>
            <div className="flex items-center justify-between mb-4">
              <span style={{ color: '#2d5f4f', fontWeight: 700 }}>실시간 투표 현황</span>
              <span className="text-sm text-gray-600">
                총 {totalVotes}명 참여
              </span>
            </div>
            
            {/* Team Names */}
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontWeight: 700, color: '#333' }}>
                {currentGame.awayTeamFull}
              </span>
              <span style={{ fontWeight: 700, color: teamColors[currentGame.homeTeam] }}>
                {currentGame.homeTeamFull}
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
                    fontSize: '1.125rem'
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
                    fontSize: '1.125rem'
                  }}
                >
                  {totalVotes > 0 && homePercentage > 0 && `${homePercentage}%`}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* User Vote Status */}
        {userVote[selectedGame] && (
          <div className="text-center mb-6">
            <p style={{ color: '#2d5f4f', fontWeight: 700 }}>
              ✅ {userVote[selectedGame] === 'home' ? currentGame.homeTeamFull : currentGame.awayTeamFull} 승리에 투표하셨습니다!
            </p>
          </div>
        )}
      </div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}
