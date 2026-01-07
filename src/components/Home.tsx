import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, Trophy, ChevronLeft, ChevronRight, 
  CalendarDays, Loader2, Flame, MapPin, TrendingUp 
} from 'lucide-react';

// UI Components (Shadcn/UI & Custom)
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Skeleton } from './ui/skeleton';
import TeamLogo from './TeamLogo';
import GameCard from './GameCard';
import WelcomeGuide from './WelcomeGuide';

import { CURRENT_SEASON_YEAR } from '../constants/home';

// --- Types (Preserved) ---
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

interface Ranking {
    rank: number;
    teamId: string; 
    teamName: string; 
    wins: number;
    losses: number;
    draws: number;
    winRate: string;
    games: number;
    shortName: string; 
}

interface LeagueStartDates {
    regularSeasonStart: string;
    postseasonStart: string;
    koreanSeriesStart: string;
}

interface HomeProps {
    onNavigate?: (page: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_NO_API_BASE_URL || 'http://localhost:8080'; 

// --- Helper Components ---

// Game Card Skeleton for Loading State
const GameCardSkeleton = () => (
  <Card className="overflow-hidden h-full border-none shadow-sm bg-white dark:bg-gray-800">
    <CardHeader className="pb-2 space-y-2">
      <Skeleton className="h-4 w-1/3 rounded-full" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-1/4 rounded-md" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </CardHeader>
    <CardContent className="pt-4">
      <div className="flex justify-between items-center py-2">
        <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-md" />
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
        <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-10 w-full mt-6 rounded-lg" />
    </CardContent>
  </Card>
);

export default function Home({ onNavigate }: HomeProps) {
    const navigate = useNavigate();
    
    // State - Initialize with noon to avoid timezone issues
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        now.setHours(12, 0, 0, 0); 
        return now;
    });
    const [showCalendar, setShowCalendar] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [leagueStartDates, setLeagueStartDates] = useState<LeagueStartDates | null>(null);
    
    // Loading States
    const [isLoading, setIsLoading] = useState(true); // Initial load true
    const [isRankingsLoading, setIsRankingsLoading] = useState(true);
    
    const [activeLeagueTab, setActiveLeagueTab] = useState('regular');

    // --- Helpers (Preserved logic) ---
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
        return `${year}.${month}.${day} (${dayOfWeek})`;
    };

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        newDate.setHours(12, 0, 0, 0); // Keep time at noon
        setSelectedDate(newDate);
    };

    // --- Data Fetching ---
    const loadLeagueStartDates = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/kbo/league-start-dates`);
            let data: LeagueStartDates;
            
            if (!response.ok) {
                // Fallback Data
                data = {
                    regularSeasonStart: '2025-03-22',
                    postseasonStart: '2025-10-06',
                    koreanSeriesStart: '2025-10-26'
                };
            } else {
                data = await response.json();
            }
            setLeagueStartDates(data);
        } catch (error) {
            console.error('[System] Error loading league dates:', error);
            // Fallback on error
            setLeagueStartDates({
                regularSeasonStart: '2025-03-22',
                postseasonStart: '2025-10-06',
                koreanSeriesStart: '2025-10-26'
            });
        }
    };

    const loadGamesData = async (date: Date) => {
        const apiDate = formatDateForAPI(date);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/kbo/schedule?date=${apiDate}`);
            if (!response.ok) throw new Error('API Error');

            const gamesData: Game[] = await response.json();
            setGames(gamesData);

            // Auto-switch tab based on game type
            if (gamesData.length > 0) {
                const firstGameType = gamesData[0].leagueType;
                if (firstGameType === 'REGULAR') setActiveLeagueTab('regular');
                else if (firstGameType === 'POSTSEASON') setActiveLeagueTab('postseason');
                else if (firstGameType === 'KOREAN_SERIES') setActiveLeagueTab('koreanseries');
            }
        } catch (error) {
            console.error('[Game] Error loading games:', error);
            setGames([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadRankingsData = async () => {
        setIsRankingsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/kbo/rankings/${CURRENT_SEASON_YEAR}`);
            if (!response.ok) throw new Error('API Error');
            
            const rankingsData: Ranking[] = await response.json();
            setRankings(rankingsData);
        } catch (error) {
            console.error('[Rank] Error loading rankings:', error);
            setRankings([]);
        } finally {
            setIsRankingsLoading(false);
        }
    };

    // --- Tab Change Handler ---
    const handleTabChange = (value: string) => {
        setActiveLeagueTab(value);
        if (!leagueStartDates) return;
        
        let targetDate = null;
        if (value === 'regular') targetDate = new Date(leagueStartDates.regularSeasonStart);
        else if (value === 'postseason') targetDate = new Date(leagueStartDates.postseasonStart);
        else if (value === 'koreanseries') targetDate = new Date(leagueStartDates.koreanSeriesStart);
        
        if (targetDate) {
            targetDate.setHours(12, 0, 0, 0); // Set to noon
            setSelectedDate(targetDate);
        }
    };

    // --- Effects ---
    useEffect(() => { loadLeagueStartDates(); loadRankingsData(); }, []);
    useEffect(() => { loadGamesData(selectedDate); }, [selectedDate]);

    // Filtering
    const regularSeasonGames = games.filter(g => g.leagueType === 'REGULAR');
    const postSeasonGames = games.filter(g => g.leagueType === 'POSTSEASON');
    const koreanSeriesGames = games.filter(g => g.leagueType === 'KOREAN_SERIES');

    if (!leagueStartDates) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#2d5f4f]" />
            </div>
        );
    }

    return (
        <>
        <WelcomeGuide />

        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
            {/* --- Hero Section --- */}
            <section className="relative bg-gradient-to-br from-[#1a3c34] to-[#2d5f4f] pb-24 pt-10 px-4 sm:px-6 lg:px-8 shadow-lg">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <Badge variant="outline" className="text-white/80 border-white/30 px-3 py-1 mb-2">
                                {CURRENT_SEASON_YEAR} KBO LEAGUE
                            </Badge>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                                오늘의 야구 <span className="text-yellow-400">하이라이트</span>
                            </h1>
                            <p className="text-emerald-100 max-w-lg text-sm md:text-base">
                                실시간 스코어부터 상세 전력 분석까지, KBO의 모든 순간을 확인하세요.
                            </p>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex gap-3">
                            <Button
                                onClick={() => navigate('/offseason')}
                                className="shiny-button hover:bg-white/20 text-white border-none backdrop-blur-sm shadow-sm"
                            >
                                <Flame className="w-4 h-4 mr-2 text-orange-400" />
                                스토브리그
                            </Button>
                        </div>
                    </div>
                </div>
                
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            </section>

            {/* --- Main Content Area with Negative Margin for Overlap Effect --- */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-16 relative z-20 space-y-6 sm:space-y-8 pb-20">
                
                {/* Date Navigation & Filters Card */}
                <Card className="border-0 shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md sticky top-4 z-30 ring-1 ring-black/5 dark:ring-white/10">
                    <div className="p-2 sm:p-4 flex flex-row items-center justify-between gap-2">
                        {/* Date Controls */}
                        <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex-1 md:flex-none justify-between md:justify-start">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => changeDate(-1)} 
                                className="hover:bg-white dark:hover:bg-gray-700 rounded-lg h-8 w-8 sm:h-9 sm:w-9"
                            >
                                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
                            </Button>
                            
                            <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-4 py-1">
                                <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 text-[#2d5f4f] dark:text-[#4ade80]" />
                                <span className="text-xs sm:text-base font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                                    {formatDate(selectedDate)}
                                </span>
                            </div>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => changeDate(1)}
                                className="hover:bg-white dark:hover:bg-gray-700 rounded-lg h-8 w-8 sm:h-9 sm:w-9"
                            >
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
                            </Button>
                        </div>

                        {/* Right Side Tools */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowCalendar(true)}
                                className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm"
                            >
                                <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                <span className="hidden xs:inline">캘린더</span>
                                <span className="xs:hidden">달력</span>
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Tabs & Games Grid */}
                <Tabs value={activeLeagueTab} onValueChange={handleTabChange} className="w-full">
                    <div className="flex justify-center mb-4 sm:mb-6">
                        <TabsList className="bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-full h-auto flex-wrap justify-center gap-1">
                            <TabsTrigger value="regular" className="rounded-full px-3 sm:px-6 py-1.5 text-xs sm:text-sm data-[state=active]:bg-[#2d5f4f] data-[state=active]:text-white">정규시즌</TabsTrigger>
                            <TabsTrigger value="postseason" className="rounded-full px-3 sm:px-6 py-1.5 text-xs sm:text-sm data-[state=active]:bg-[#2d5f4f] data-[state=active]:text-white">포스트시즌</TabsTrigger>
                            <TabsTrigger value="koreanseries" className="rounded-full px-3 sm:px-6 py-1.5 text-xs sm:text-sm data-[state=active]:bg-[#2d5f4f] data-[state=active]:text-white">한국시리즈</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Games Grid Content */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {[1, 2, 3].map((i) => <GameCardSkeleton key={i} />)}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {['regular', 'postseason', 'koreanseries'].map(tab => {
                                const currentGames = tab === 'regular' ? regularSeasonGames 
                                    : tab === 'postseason' ? postSeasonGames 
                                    : koreanSeriesGames;
                                
                                return (
                                    <TabsContent key={tab} value={tab} className="mt-0">
                                        {currentGames.length === 0 ? (
                                            <Card className="border-dashed border-2 bg-transparent shadow-none py-10 sm:py-16">
                                                <div className="text-center space-y-2 px-4">
                                                    <p className="text-gray-500 dark:text-gray-400 font-medium">해당 기간에 예정된 경기가 없습니다.</p>
                                                    <p className="text-xs sm:text-sm">다른 날짜를 선택하거나 캘린더를 확인해보세요.</p>
                                                </div>
                                            </Card>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                                {currentGames.map((game, index) => (
                                                    <GameCard key={`${game.gameId}-${index}`} game={game} featured={tab !== 'regular'} />
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>
                                );
                            })}
                        </div>
                    )}
                </Tabs>

                {/* Rankings Section */}
                <section>
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-[#2d5f4f] p-1.5 sm:p-2 rounded-lg">
                                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                {CURRENT_SEASON_YEAR} 팀 순위
                            </h2>
                        </div>
                    </div>

                    <Card className="overflow-hidden border-0 shadow-lg dark:bg-gray-800">
                        {isRankingsLoading ? (
                            <div className="p-8 space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                                ))}
                            </div>
                        ) : rankings.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">순위 데이터를 불러올 수 없습니다.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                                        <tr>
                                            <th className="px-3 sm:px-6 py-4 font-medium whitespace-nowrap">순위</th>
                                            <th className="px-3 sm:px-6 py-4 font-medium w-full">팀</th>
                                            <th className="px-3 sm:px-6 py-4 font-medium text-right whitespace-nowrap">
                                                <span className="hidden sm:inline">경기</span>
                                                <span className="sm:hidden">G</span>
                                            </th>
                                            <th className="px-3 sm:px-6 py-4 font-medium text-right hidden sm:table-cell">승/패/무</th>
                                            <th className="px-3 sm:px-6 py-4 font-medium text-right sm:hidden">기록</th>
                                            <th className="px-3 sm:px-6 py-4 font-medium text-right whitespace-nowrap">
                                                <span className="hidden sm:inline">승률</span>
                                                <span className="sm:hidden">PCT</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {rankings.map((team) => (
                                            <tr 
                                                key={team.teamId} 
                                                className={`group hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors ${
                                                    team.rank <= 5 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/30'
                                                }`}
                                            >
                                                <td className="px-3 sm:px-6 py-4 font-bold text-gray-900 dark:text-white">
                                                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm ${
                                                        team.rank <= 3 
                                                            ? 'bg-[#2d5f4f] text-white shadow-md shadow-emerald-500/20' 
                                                            : team.rank <= 5 
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                                    }`}>
                                                        {team.rank}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4">
                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                        <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                                                            <TeamLogo team={team.shortName || team.teamName} size={32} className="w-full h-full object-contain" />
                                                        </div>
                                                        <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                                                            <span className="hidden sm:inline">{team.teamName}</span>
                                                            <span className="sm:hidden">{team.shortName || team.teamName}</span>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 text-right text-gray-600 dark:text-gray-400 text-xs sm:text-sm tabular-nums">
                                                    {team.games}
                                                </td>
                                                {/* Desktop View: Full Stats */}
                                                <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                                                    <div className="inline-flex items-center justify-end tabular-nums">
                                                        <span className="w-[3.2rem] text-right">
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{team.wins}</span>
                                                            <span className="text-[10px] ml-0.5 opacity-70">승</span>
                                                        </span>
                                                        <span className="mx-1 text-gray-300">/</span>
                                                        <span className="w-[3.2rem] text-right">
                                                            <span className="text-rose-600 dark:text-rose-400 font-bold">{team.losses}</span>
                                                            <span className="text-[10px] ml-0.5 opacity-70">패</span>
                                                        </span>
                                                        <span className="mx-1 text-gray-300">/</span>
                                                        <span className="w-[3.2rem] text-right">
                                                            <span className="font-bold">{team.draws}</span>
                                                            <span className="text-[10px] ml-0.5 opacity-70">무</span>
                                                        </span>
                                                    </div>
                                                </td>
                                                {/* Mobile View: Compact Stats */}
                                                <td className="px-3 py-4 text-right text-gray-600 dark:text-gray-400 text-[10px] sm:hidden">
                                                    <div className="flex flex-col items-end gap-0.5 tabular-nums">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{team.wins}</span>
                                                            <span className="opacity-70">승</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-rose-600 dark:text-rose-400 font-bold">{team.losses}</span>
                                                            <span className="opacity-70">패</span>
                                                        </div>
                                                        {team.draws > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-bold">{team.draws}</span>
                                                                <span className="opacity-70">무</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 text-right font-bold text-gray-900 dark:text-white text-xs sm:text-sm tabular-nums">
                                                    {parseFloat(team.winRate).toFixed(3)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </section>
            </main>

            {/* Calendar Dialog (Preserved) */}
            <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
                <DialogContent className="sm:max-w-[425px] dark:bg-gray-800 dark:border-gray-700">
                    <DialogHeader>
                        <DialogTitle>날짜 선택</DialogTitle>
                        <DialogDescription>경기를 보고 싶은 날짜를 선택하세요.</DialogDescription>
                    </DialogHeader>
                    <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => { 
                            if(date) { 
                                const newDate = new Date(date);
                                newDate.setHours(12, 0, 0, 0); // Force noon
                                setSelectedDate(newDate); 
                                setShowCalendar(false); 
                            }
                        }}
                        className="rounded-md border mx-auto dark:border-gray-700 dark:bg-gray-800"
                    />
                </DialogContent>
            </Dialog>
        </div>
        </>
    );
}