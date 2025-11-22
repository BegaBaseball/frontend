import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Calendar, Trophy, Home as HomeIcon, Heart, MapPin, TrendingUp, BookOpen, ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import { Calendar as CalendarComponent } from './ui/calendar';
import ChatBot from './ChatBot';
import TeamLogo from './TeamLogo';
import GameCard from './GameCard';
import OffSeasonHome from './OffSeasonHome';
import { useState, useEffect } from 'react';

// Note: grassDecor와 baseballLogo 이미지는 CSS로 대체됨

// 백엔드 API 응답과 일치하는 타입 정의
interface Game {
    gameId: string;
    time: string;
    stadium: string;
    gameStatus: string; 
    gameStatusKr: string;
    gameInfo: string; 
    leagueType: 'REGULAR' | 'POSTSEASON' | 'KOREAN_SERIES' | 'OFFSEASON';
    homeTeam: string; 
    homeTeamFull: string; 
    awayTeam: string; 
    awayTeamFull: string; 
    homeScore?: number;  
    awayScore?: number;  
}

// 순위 데이터 타입
interface Ranking {
    rank: number;
    teamId: string; 
    teamName: string; 
    wins: number;
    losses: number;
    draws: number;
    winRate: string;
    games: number;
}

interface HomeProps {
    onNavigate: (page: string) => void;
}

export default function Home({ onNavigate }: HomeProps) {
    const [selectedDate, setSelectedDate] = useState(new Date(2025, 9, 26)); // 2025년 10월 26일 (한국시리즈 시작일)
    const [showCalendar, setShowCalendar] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRankingsLoading, setIsRankingsLoading] = useState(false);
    const [activeLeagueTab, setActiveLeagueTab] = useState('koreanseries'); // 활성 탭 상태 추가

    const currentSeasonYear = 2025;
    // 브라우저에서 접근: localhost 사용 (도커 호스트의 8080 포트로 매핑됨)
    const API_BASE_URL = "http://localhost:8080"; 

    // 각 리그별 시작 날짜 정의
    const leagueStartDates = {
        regular: new Date(2025, 2, 22),        // 2025년 3월 22일 (월은 0부터 시작)
        postseason: new Date(2025, 9, 6),      // 2025년 10월 6일
        koreanseries: new Date(2025, 9, 26)    // 2025년 10월 26일 ✅ 수정
    };

    // 탭 변경 핸들러
    const handleTabChange = (value: string) => {
        setActiveLeagueTab(value);
        
        // 해당 리그의 시작일로 날짜 변경
        if (value === 'regular') {
            setSelectedDate(leagueStartDates.regular);
        } else if (value === 'postseason') {
            setSelectedDate(leagueStartDates.postseason);
        } else if (value === 'koreanseries') {
            setSelectedDate(leagueStartDates.koreanseries);
        }
    };

    const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

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

    const isOffSeasonForUI = (date: Date) => {
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // 11월 15일 ~ 3월 21일은 비시즌
        if (month >= 11 || month <= 2 || (month === 3 && day < 22)) {
            return true;
        }
        return false;
    };

    const loadGamesData = async (date: Date) => {
        if (isOffSeasonForUI(date)) {
            setGames([]);
            return;
        }

        const apiDate = formatDateForAPI(date);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/kbo/schedule?date=${apiDate}`);

            if (!response.ok) {
                console.error(`[경기] API 요청 실패: ${response.status} ${response.statusText}`);
                setGames([]);
                return;
            }

            const gamesData: Game[] = await response.json();
            setGames(gamesData);

        } catch (error) {
            console.error('[경기] 데이터 로드 중 오류 발생:', error);
            setGames([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadRankingsData = async () => {
        setIsRankingsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/kbo/rankings/2025`);

            if (!response.ok) {
                console.error(`[순위] API 요청 실패: ${response.status} ${response.statusText}`);
                setRankings([]);
                return;
            }

            const rankingsData: Ranking[] = await response.json();
            setRankings(rankingsData);

        } catch (error) {
            console.error('[순위] 데이터 로드 중 오류 발생:', error);
            setRankings([]);
        } finally {
            setIsRankingsLoading(false);
        }
    };

    useEffect(() => {
        loadGamesData(selectedDate);
    }, [selectedDate]); 

    useEffect(() => {
        loadRankingsData();
    }, []); 

    // 3개 리그만 필터링
    const regularSeasonGames = games.filter(g => g.leagueType === 'REGULAR');
    const postSeasonGames = games.filter(g => g.leagueType === 'POSTSEASON');
    const koreanSeriesGames = games.filter(g => g.leagueType === 'KOREAN_SERIES');
    const teamRankings = rankings;

    return (
        <div className="min-h-screen bg-white">
            {isOffSeasonForUI(selectedDate) ? (
                <section className="py-12 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <OffSeasonHome selectedDate={selectedDate} />
                    </div>
                </section>
            ) : (
                <>
                    {/* Hero Banner */}
                    <section className="relative overflow-hidden" style={{ backgroundColor: '#2d5f4f' }}>
                        <div 
                            className="absolute bottom-0 left-0 w-full h-20 opacity-30"
                            style={{
                                background: 'linear-gradient(to top, rgba(34, 139, 34, 0.3) 0%, transparent 100%)'
                            }}
                        />
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-white text-3xl mb-2" style={{ fontWeight: 900 }}>오늘의 KBO 경기</h2>
                                    <p className="text-white/80">실시간 경기 정보와 티켓 예매를 확인하세요</p>
                                </div>
                                <div className="text-white text-right">
                                    <div className="text-sm text-white/80 mb-1">{currentSeasonYear} 시즌</div>
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

                            {/* League Tabs - 탭 변경 핸들러 추가 */}
                            <Tabs value={activeLeagueTab} onValueChange={handleTabChange} className="w-full">
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
                                        value="koreanseries" 
                                        className="rounded-none border-b-3 border-transparent px-6 py-3 text-gray-600"
                                        style={{ fontWeight: 700 }}
                                    >
                                        KBO 한국시리즈
                                    </TabsTrigger>
                                </TabsList>

                                {isLoading ? (
                                    <div className="flex justify-center items-center py-16">
                                        <Loader2 className="w-8 h-8 mr-2 animate-spin text-gray-500" />
                                        <p className="text-gray-500">경기 정보를 불러오는 중...</p>
                                    </div>
                                ) : (
                                    <>
                                        <TabsContent value="regular" className="mt-8">
                                            {regularSeasonGames.length === 0 ? (
                                                <p className="text-center py-8 text-gray-500">해당 날짜에 정규시즌 경기가 없습니다.</p>
                                            ) : (
                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {regularSeasonGames.map((game, index) => (
                                                        <GameCard key={index} game={game} />
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="postseason" className="mt-8">
                                            {postSeasonGames.length === 0 ? (
                                                <p className="text-center py-8 text-gray-500">해당 날짜에 포스트시즌 경기가 없습니다.</p>
                                            ) : (
                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {postSeasonGames.map((game, index) => (
                                                        <GameCard key={index} game={game} featured={true} />
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="koreanseries" className="mt-8">
                                            {koreanSeriesGames.length === 0 ? (
                                                <p className="text-center py-8 text-gray-500">해당 날짜에 한국시리즈 경기가 없습니다.</p>
                                            ) : (
                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {koreanSeriesGames.map((game, index) => (
                                                        <GameCard key={index} game={game} featured={true} />
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>
                                    </>
                                )}
                            </Tabs>

                            <div className="mt-8 flex justify-between items-center text-sm text-gray-600">
                                <p>*경기별 티켓 예매 날짜는 구단별 판매처에서 확인하실 수 있습니다.</p>
                            </div>
                        </div>
                    </section>

                    {/* Team Rankings Section */}
                    <section className="py-16 bg-white relative">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center gap-3 mb-8">
                                <Trophy className="w-6 h-6" style={{ color: '#2d5f4f' }} />
                                <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>{currentSeasonYear} 시즌 팀 순위</h2>
                                {isRankingsLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-500" />}
                            </div>

                            <Card className="overflow-hidden">
                                {teamRankings.length === 0 && !isRankingsLoading ? (
                                    <p className="text-center py-8 text-gray-500">{currentSeasonYear} 시즌 순위 데이터를 불러올 수 없습니다.</p>
                                ) : (
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
                                                        key={team.teamId} 
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
                                                            {team.teamName}
                                                        </td>
                                                        <td className="py-4 px-6 text-right text-gray-600">
                                                            {`${team.wins}승 ${team.losses}패 ${team.draws}무 (${team.games}경기)`}
                                                        </td>
                                                        <td className="py-4 px-6 text-right" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                                                            {parseFloat(team.winRate).toFixed(3)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </section>
                </>
            )}

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2d5f4f' }}>
                            <span className="text-white text-xl font-bold">⚾</span>
                        </div>
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