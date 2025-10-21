import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Bell, User, Calendar, Trophy, Home as HomeIcon, Heart, MapPin, TrendingUp, BookOpen } from 'lucide-react';
import ChatBot from './ChatBot';
import TeamLogo from './TeamLogo';
import { ViewName } from '../types';


interface HomeProps {
  onNavigateToLogin: () => void;
  onNavigate: (view: ViewName) => void;
}

export default function Home({ onNavigateToLogin, onNavigate }: HomeProps) {
  const todayGames = [
    {
      homeTeam: 'LG',
      homeTeamFull: 'LG 트윈스',
      awayTeam: '두산',
      awayTeamFull: '두산 베어스',
      time: '18:30',
      stadium: '잠실구장',
      isLive: false
    },
    {
      homeTeam: 'KT',
      homeTeamFull: 'KT 위즈',
      awayTeam: 'SSG',
      awayTeamFull: 'SSG 랜더스',
      time: '18:30',
      stadium: '수원구장',
      isLive: false
    },
    {
      homeTeam: 'NC',
      homeTeamFull: 'NC 다이노스',
      awayTeam: '기아',
      awayTeamFull: '기아 타이거즈',
      time: '18:30',
      stadium: '창원구장',
      isLive: false
    }
  ];

  const teamRankings = [
    { rank: 1, team: 'LG 트윈스', games: '82승 48패', winRate: '.631' },
    { rank: 2, team: 'KT 위즈', games: '79승 51패', winRate: '.608' },
    { rank: 3, team: 'SSG 랜더스', games: '76승 54패', winRate: '.585' },
    { rank: 4, team: 'NC 다이노스', games: '75승 55패', winRate: '.577' },
    { rank: 5, team: '두산 베어스', games: '74승 56패', winRate: '.569' },
    { rank: 6, team: '기아 타이거즈', games: '70승 60패', winRate: '.538' },
    { rank: 7, team: '롯데 자이언츠', games: '66승 64패', winRate: '.508' },
    { rank: 8, team: '삼성 라이온즈', games: '63승 67패', winRate: '.485' },
    { rank: 9, team: '한화 이글스', games: '58승 72패', winRate: '.446' },
    { rank: 10, team: '키움 히어로즈', games: '55승 75패', winRate: '.423' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
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
                className="hover:opacity-70"
                style={{ color: '#2d5f4f', fontWeight: 700 }}
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
                className="text-gray-700 hover:opacity-70"
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

      {/* Hero Section with Today's Games */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#2d5f4f' }}>
        {/* Grass decoration at bottom */}
        <img 
          src={grassDecor} 
          alt="" 
          className="absolute bottom-0 left-0 w-full h-24 object-cover object-top opacity-30"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex items-center gap-3 mb-6 text-white">
            <Calendar className="w-6 h-6" />
            <h2 className="text-white">2025년 11월 9일 (토)</h2>
          </div>
          
          <h2 className="text-white mb-8 text-3xl" style={{ fontWeight: 900 }}>오늘의 경기</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {todayGames.map((game, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white/20 text-white border-white/30">
                      {game.stadium}
                    </Badge>
                  </div>
                  <span className="text-white text-sm">{game.time}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="mx-auto mb-2 flex items-center justify-center">
                      <TeamLogo team={game.homeTeam} size={64} />
                    </div>
                    <p className="text-white text-sm">{game.homeTeamFull}</p>
                  </div>

                  <div className="text-white text-2xl mx-6" style={{ fontWeight: 900 }}>VS</div>

                  <div className="text-center flex-1">
                    <div className="mx-auto mb-2 flex items-center justify-center">
                      <TeamLogo team={game.awayTeam} size={64} />
                    </div>
                    <p className="text-white text-sm">{game.awayTeamFull}</p>
                  </div>
                </div>

                <Button 
                  className="w-full mt-6 bg-white text-gray-900 hover:bg-white/90"
                >
                  예매하기
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Rankings Section */}
      <section className="py-16 bg-gray-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="w-6 h-6" style={{ color: '#2d5f4f' }} />
            <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>2025 시즌 팀 순위</h2>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200" style={{ backgroundColor: '#f8f9fa' }}>
                    <th className="text-left py-4 px-6 text-gray-700">순위</th>
                    <th className="text-left py-4 px-6 text-gray-700">팀명</th>
                    <th className="text-right py-4 px-6 text-gray-700">경기</th>
                    <th className="text-right py-4 px-6 text-gray-700">승률</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRankings.map((team) => (
                    <tr 
                      key={team.rank} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                          style={{ 
                            backgroundColor: team.rank <= 5 ? '#2d5f4f' : '#9ca3af',
                            fontWeight: 900 
                          }}
                        >
                          {team.rank}
                        </div>
                      </td>
                      <td className="py-4 px-6" style={{ fontWeight: team.rank <= 5 ? 700 : 400 }}>
                        {team.team}
                      </td>
                      <td className="py-4 px-6 text-right text-gray-600">
                        {team.games}
                      </td>
                      <td className="py-4 px-6 text-right" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                        {team.winRate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
            <div>
              <h3 className="tracking-wider" style={{ fontWeight: 900 }}>BEGA</h3>
              <p className="text-xs text-gray-400">BASEBALL GUIDE</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="mb-4">서비스</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => onNavigate('home')} className="hover:text-white">홈</button></li>
                <li><button onClick={() => onNavigate('cheer')} className="hover:text-white">응원게시판</button></li>
                <li><button onClick={() => onNavigate('stadium')} className="hover:text-white">구장가이드</button></li>
                <li><button onClick={() => onNavigate('prediction')} className="hover:text-white">승부예측</button></li>
                <li><button onClick={() => onNavigate('diary')} className="hover:text-white">직관다이어리</button></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">정보</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">공지사항</a></li>
                <li><a href="#" className="hover:text-white">이용약관</a></li>
                <li><a href="#" className="hover:text-white">개인정보처리방침</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">고객센터</h4>
              <ul className="space-y-2 text-gray-400">
                <li>이메일: support@bega.com</li>
                <li>운영시간: 평일 09:00-18:00</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>© 2025 BEGA (BASEBALL GUIDE). All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}
