import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Trophy, ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import { Calendar as CalendarComponent } from './ui/calendar';
import ChatBot from './ChatBot';
import GameCard from './GameCard';
import OffSeasonHome from './OffSeasonHome';
import { useHome } from '../hooks/useHome';
import { formatDate, isOffSeasonForUI, filterGamesByLeague } from '../utils/home';
import { CURRENT_SEASON_YEAR } from '../constants/home';
import { HomeProps } from '../types/home';

export default function Home({ onNavigate }: HomeProps) {
    const {
        selectedDate,
        setSelectedDate,
        showCalendar,
        setShowCalendar,
        games,
        rankings,
        leagueStartDates, 
        isLoading,
        isRankingsLoading,
        activeLeagueTab,
        handleTabChange,
        changeDate,
    } = useHome();

    // 리그별 경기 필터링
    const { regular, postseason, koreanseries } = filterGamesByLeague(games);

    // 리그 시작 날짜 로딩 중
    if (!leagueStartDates || !selectedDate) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#2d5f4f' }} />
                    <p className="text-gray-500">리그 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {isOffSeasonForUI(selectedDate) && games.length === 0 ? (
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
                                    <div className="text-sm text-white/80 mb-1">{CURRENT_SEASON_YEAR} 시즌</div>
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
                                            {regular.length === 0 ? (
                                                <p className="text-center py-8 text-gray-500">해당 날짜에 정규시즌 경기가 없습니다.</p>
                                            ) : (
                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {regular.map((game, index) => (
                                                        <GameCard key={index} game={game} />
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="postseason" className="mt-8">
                                            {postseason.length === 0 ? (
                                                <p className="text-center py-8 text-gray-500">해당 날짜에 포스트시즌 경기가 없습니다.</p>
                                            ) : (
                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {postseason.map((game, index) => (
                                                        <GameCard key={index} game={game} featured={true} />
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="koreanseries" className="mt-8">
                                            {koreanseries.length === 0 ? (
                                                <p className="text-center py-8 text-gray-500">해당 날짜에 한국시리즈 경기가 없습니다.</p>
                                            ) : (
                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {koreanseries.map((game, index) => (
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
                                <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>{CURRENT_SEASON_YEAR} 시즌 팀 순위</h2>
                                {isRankingsLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-500" />}
                            </div>

                            <Card className="overflow-hidden">
                                {rankings.length === 0 && !isRankingsLoading ? (
                                    <p className="text-center py-8 text-gray-500">{CURRENT_SEASON_YEAR} 시즌 순위 데이터를 불러올 수 없습니다.</p>
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
                                                {rankings.map((team) => (
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
            <ChatBot />
        </div>
    );
}