import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Calendar, Trophy, Home as HomeIcon, Heart, MapPin, TrendingUp, BookOpen, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Calendar as CalendarComponent } from './ui/calendar';
import ChatBot from './ChatBot';
import TeamLogo from './TeamLogo';
import GameCard from './GameCard';
import OffSeasonHome from './OffSeasonHome';
import Navbar from './Navbar';
import { useState } from 'react';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date(2025, 9, 22)); // 2025년 10월 22일
  const [showCalendar, setShowCalendar] = useState(false);

  const formatDate = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];
    return `${year}.${month}.${day}(${dayOfWeek})`;
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // 시즌 체크: 11월 중순(11월 15일) 이후는 비시즌
  const isOffSeason = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    
    // 11월 15일 ~ 3월 21일은 비시즌
    if (month === 10 && day >= 15) return true; // 11월 15일 이후
    if (month === 11 || month === 0 || month === 1) return true; // 12월, 1월, 2월
    if (month === 2 && day < 22) return true; // 3월 22일 이전
    
    return false;
  };

  // 리그별 경기 데이터
  const regularSeasonGames = [
    {
      homeTeam: 'LG',
      homeTeamFull: 'LG 트윈스',
      awayTeam: '두산',
      awayTeamFull: '두산 베어스',
      time: '18:30',
      stadium: '잠실구장',
      status: '경기예정',
      gameInfo: ''
    },
    {
      homeTeam: 'KT',
      homeTeamFull: 'KT 위즈',
      awayTeam: 'SSG',
      awayTeamFull: 'SSG 랜더스',
      time: '18:30',
      stadium: '수원구장',
      status: '경기예정',
      gameInfo: ''
    }
  ];

  const postSeasonGames = [
    {
      homeTeam: '한화',
      homeTeamFull: '한화 이글스',
      awayTeam: '삼성',
      awayTeamFull: '삼성 라이온즈',
      time: '18:30',
      stadium: '대구구장',
      status: '경기예정',
      gameInfo: 'PO 4차전 S-T'
    }
  ];

  const fallLeagueGames = [
    {
      homeTeam: 'NC',
      homeTeamFull: 'NC 다이노스',
      awayTeam: '기아',
      awayTeamFull: '기아 타이거즈',
      time: '14:00',
      stadium: '창원구장',
      status: '경기예정',
      gameInfo: ''
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
      {/* Navbar */}
      <Navbar 
        currentPage="home" 
      />

      {isOffSeason() ? (
        // 비시즌 화면
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <OffSeasonHome selectedDate={selectedDate} />
          </div>
        </section>
      ) : (
        <>
          {/* Hero Banner */}
          <section className="relative overflow-hidden" style={{ backgroundColor: '#2d5f4f' }}>
            <img 
              src={grassDecor} 
              alt="" 
              className="absolute bottom-0 left-0 w-full h-20 object-cover object-top opacity-30"
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white text-3xl mb-2" style={{ fontWeight: 900 }}>오늘의 KBO 경기</h2>
                  <p className="text-white/80">실시간 경기 정보와 티켓 예매를 확인하세요</p>
                </div>
                <div className="text-white text-right">
                  <div className="text-sm text-white/80 mb-1">2025 시즌</div>
                  <div className="text-2xl" style={{ fontWeight: 900 }}>{formatDate(selectedDate)}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Today's Games Section */}
          <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1"></div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => changeDate(-1)}
                className="p-2 hover:opacity-70 rounded-lg transition-colors text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="min-w-[200px] text-center bg-white rounded-lg py-2 px-4 border-2" style={{ borderColor: '#2d5f4f' }}>
                <h2 style={{ fontWeight: 900, fontSize: '18px', color: '#2d5f4f' }}>{formatDate(selectedDate)}</h2>
              </div>
              <button 
                onClick={() => changeDate(1)}
                className="p-2 hover:opacity-70 rounded-lg transition-colors text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white hover:opacity-70"
                style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
                onClick={() => setShowCalendar(true)}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                캘린더
              </Button>
            </div>
          </div>

          {/* Calendar Dialog */}
          <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle style={{ color: '#2d5f4f', fontWeight: 900 }}>날짜 선택</DialogTitle>
                <DialogDescription>경기를 보고 싶은 날짜를 선택하세요.</DialogDescription>
              </DialogHeader>
              <style>{`
                .rdp-day_selected {
                  background-color: #2d5f4f !important;
                  color: white !important;
                }
                .rdp-day_today {
                  background-color: #f0f9f6;
                  color: #2d5f4f;
                  font-weight: 700;
                }
              `}</style>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }
                }}
                className="rounded-md border mx-auto"
              />
            </DialogContent>
          </Dialog>

          {/* League Tabs */}
          <Tabs defaultValue="postseason" className="w-full">
            <style>{`
              [data-state=active] {
                border-bottom: 3px solid #2d5f4f !important;
                color: #2d5f4f !important;
              }
            `}</style>
            <TabsList className="w-full justify-start border-b border-gray-200 rounded-none h-auto p-0 bg-transparent gap-0">
              <TabsTrigger 
                value="regular" 
                className="rounded-none border-b-3 border-transparent px-6 py-3 text-gray-600"
                style={{ fontWeight: 700 }}
              >
                KBO 정규시즌
              </TabsTrigger>
              <TabsTrigger 
                value="postseason" 
                className="rounded-none border-b-3 border-transparent px-6 py-3 text-gray-600"
                style={{ fontWeight: 700 }}
              >
                KBO 포스트시즌
              </TabsTrigger>
              <TabsTrigger 
                value="fall" 
                className="rounded-none border-b-3 border-transparent px-6 py-3 text-gray-600"
                style={{ fontWeight: 700 }}
              >
                KBO Fall League
              </TabsTrigger>
            </TabsList>

            <TabsContent value="regular" className="mt-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularSeasonGames.map((game, index) => (
                  <GameCard key={index} game={game} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="postseason" className="mt-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {postSeasonGames.map((game, index) => (
                  <GameCard key={index} game={game} featured={true} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="fall" className="mt-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fallLeagueGames.map((game, index) => (
                  <GameCard key={index} game={game} />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Notes */}
          <div className="mt-8 flex justify-between items-center text-sm text-gray-600">
            <p>*경기별 타켓 예매 날짜는 구 단별 판매처에서 확인하실 수 있습니다.</p>
            <p>* 각 시즌은 서비스 1일로 이동하면 근사치</p>
          </div>
        </div>
      </section>

      {/* Team Rankings Section - 시즌 중에만 표시 */}
      <section className="py-16 bg-white relative">
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
        </>
      )}

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
