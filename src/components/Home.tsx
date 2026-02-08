import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar as CalendarIcon, Trophy, ChevronLeft, ChevronRight,
    CalendarDays, Loader2, Flame
} from 'lucide-react';

// UI Components
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Skeleton } from './ui/skeleton';
import TeamLogo from './TeamLogo';
import GameCard from './GameCard';
import WelcomeGuide from './WelcomeGuide';

// Constants
import { CURRENT_SEASON_YEAR } from '../constants/home';

// --- Types ---
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

// --- Helpers ---
const GameCardSkeleton = () => (
    <Card className="overflow-hidden h-full border-none shadow-sm bg-white dark:bg-gray-800">
        <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-4 w-1/3 rounded-full" />
                <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <div className="flex justify-between items-center py-2">
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-14 w-14 rounded-full" />
            </div>
        </CardContent>
    </Card>
);

export default function Home({ onNavigate }: HomeProps) {
    const navigate = useNavigate();

    // State
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        return now;
    });
    const [showCalendar, setShowCalendar] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [leagueStartDates, setLeagueStartDates] = useState<LeagueStartDates | null>(null);

    // Navigation State (Optimistic defaults: true)
    const [navInfo, setNavInfo] = useState<{ prev: string | null; next: string | null; hasPrev: boolean; hasNext: boolean }>({
        prev: null, next: null, hasPrev: true, hasNext: true
    });

    // Loading States
    const [isLoading, setIsLoading] = useState(true);
    const [isRankingsLoading, setIsRankingsLoading] = useState(true);

    const [activeLeagueTab, setActiveLeagueTab] = useState('regular');

    // --- Helpers ---
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

    const changeDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setHours(12, 0, 0, 0);

        if (direction === 'prev') {
            if (navInfo.prev) {
                // Smart nav
                setSelectedDate(new Date(navInfo.prev));
            } else {
                // Fallback: -1 day
                newDate.setDate(newDate.getDate() - 1);
                setSelectedDate(newDate);
            }
        } else if (direction === 'next') {
            if (navInfo.next) {
                // Smart nav
                setSelectedDate(new Date(navInfo.next));
            } else {
                // Fallback: +1 day
                newDate.setDate(newDate.getDate() + 1);
                setSelectedDate(newDate);
            }
        }
    };

    // --- Data Fetching ---
    const loadNavigationData = async (date: Date) => {
        const apiDate = formatDateForAPI(date);
        try {
            const response = await fetch(`${API_BASE_URL}/api/kbo/schedule/navigation?date=${apiDate}`);
            if (response.ok) {
                const data = await response.json();
                setNavInfo({
                    prev: data.prevGameDate,
                    next: data.nextGameDate,
                    hasPrev: data.hasPrev,
                    hasNext: data.hasNext
                });
            } else {
                // If API fails (e.g. 500 or 404), keep buttons enabled for fallback
                setNavInfo(prev => ({ ...prev, hasPrev: true, hasNext: true }));
            }
        } catch (error) {
            console.error('[Nav] Error:', error);
            // Fallback: keep enabled
            setNavInfo(prev => ({ ...prev, hasPrev: true, hasNext: true }));
        }
    };

    // --- Data Fetching ---
    const loadLeagueStartDates = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/kbo/league-start-dates`);
            let data: LeagueStartDates;
            if (!response.ok) {
                // Fallback
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

    const handleTabChange = (value: string) => {
        setActiveLeagueTab(value);
        if (!leagueStartDates) return;

        let targetDate = null;
        if (value === 'regular') targetDate = new Date(leagueStartDates.regularSeasonStart);
        else if (value === 'postseason') targetDate = new Date(leagueStartDates.postseasonStart);
        else if (value === 'koreanseries') targetDate = new Date(leagueStartDates.koreanSeriesStart);

        if (targetDate) {
            targetDate.setHours(12, 0, 0, 0);
            setSelectedDate(targetDate);
        }
    };

    useEffect(() => { loadLeagueStartDates(); loadRankingsData(); }, []);
    useEffect(() => {
        loadGamesData(selectedDate);
        loadNavigationData(selectedDate);
    }, [selectedDate]);

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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 pb-20">
            <WelcomeGuide />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Header (Green Accent Included) */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6 border-gray-100 dark:border-gray-800">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-1.5 h-8 bg-[#2d5f4f] rounded-full" />
                            <h1 className="text-3xl font-black tracking-tight text-[#2d5f4f] dark:text-emerald-400">
                                KBO LEAGUE
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium pl-4">
                            {CURRENT_SEASON_YEAR} 시즌 경기 일정 및 순위
                        </p>
                    </div>
                    <div>
                        <Button variant="outline" onClick={() => navigate('/offseason')} className="border-emerald-600/20 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-900/20">
                            <Flame className="w-4 h-4 mr-2 text-orange-500" /> 스토브리그
                        </Button>
                    </div>
                </div>

                {/* Date Navigation (Green Accent Included) */}
                <div className="flex items-center justify-center gap-6 bg-white dark:bg-gray-900 py-3 px-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 w-full md:w-fit mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
                    <Button variant="ghost" size="icon" onClick={() => changeDate('prev')} disabled={!navInfo.hasPrev} className="hover:text-[#2d5f4f] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-30">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>

                    <div className="flex flex-col items-center min-w-[140px]">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">
                            {formatDate(selectedDate)}
                        </h2>
                        <Button variant="link" size="sm" onClick={() => setShowCalendar(true)} className="text-xs text-[#2d5f4f] dark:text-emerald-400 h-auto p-0 font-bold hover:underline opacity-80 hover:opacity-100 transition-opacity">
                            <CalendarDays className="w-3 h-3 mr-1" /> 날짜 변경
                        </Button>
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => changeDate('next')} disabled={!navInfo.hasNext} className="hover:text-[#2d5f4f] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-30">
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                </div>

                {/* Filters (Green Accent Included) */}
                <Tabs value={activeLeagueTab} onValueChange={handleTabChange} className="w-full">
                    <div className="flex justify-center mb-6">
                        <TabsList className="grid w-full max-w-md grid-cols-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                            <TabsTrigger value="regular" className="rounded-lg data-[state=active]:bg-[#2d5f4f] data-[state=active]:text-white data-[state=active]:shadow-md transition-all">정규시즌</TabsTrigger>
                            <TabsTrigger value="postseason" className="rounded-lg data-[state=active]:bg-[#2d5f4f] data-[state=active]:text-white data-[state=active]:shadow-md transition-all">포스트시즌</TabsTrigger>
                            <TabsTrigger value="koreanseries" className="rounded-lg data-[state=active]:bg-[#2d5f4f] data-[state=active]:text-white data-[state=active]:shadow-md transition-all">한국시리즈</TabsTrigger>
                        </TabsList>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => <GameCardSkeleton key={i} />)}
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-500">
                            {['regular', 'postseason', 'koreanseries'].map(tab => {
                                const currentGames = tab === 'regular' ? regularSeasonGames
                                    : tab === 'postseason' ? postSeasonGames
                                        : koreanSeriesGames;

                                return (
                                    <TabsContent key={tab} value={tab} className="mt-0">
                                        {currentGames.length === 0 ? (
                                            <div className="text-center py-16 text-gray-500">
                                                경기도, 야구도 없는 날입니다.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {currentGames.map((game, index) => (
                                                    <GameCard key={`${game.gameId}-${index}`} game={game} />
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>
                                );
                            })}
                        </div>
                    )}
                </Tabs>

                {/* Rankings Table */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-[#2d5f4f]" />
                        <h2 className="text-xl font-bold">팀 순위</h2>
                    </div>

                    <Card className="overflow-hidden border-0 shadow-sm">
                        {isRankingsLoading ? (
                            <div className="p-8 space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-3">순위</th>
                                            <th className="px-6 py-3">팀</th>
                                            <th className="px-6 py-3 text-right">경기수</th>
                                            <th className="px-6 py-3 text-right">승</th>
                                            <th className="px-6 py-3 text-right">패</th>
                                            <th className="px-6 py-3 text-right">무</th>
                                            <th className="px-6 py-3 text-right">승률</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {rankings.map(team => (
                                            <tr key={team.teamId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 font-bold">{team.rank}</td>
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                    <TeamLogo team={team.shortName || team.teamName} teamId={team.teamId} size={24} />
                                                    {team.teamName}
                                                </td>
                                                <td className="px-6 py-4 text-right">{team.games}</td>
                                                <td className="px-6 py-4 text-right text-red-500 font-medium">{team.wins}</td>
                                                <td className="px-6 py-4 text-right text-blue-500">{team.losses}</td>
                                                <td className="px-6 py-4 text-right text-gray-400">{team.draws}</td>
                                                <td className="px-6 py-4 text-right font-bold">{team.winRate}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </section>

                <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>날짜 선택</DialogTitle>
                        </DialogHeader>
                        <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                                if (date) {
                                    const d = new Date(date);
                                    d.setHours(12, 0, 0, 0);
                                    setSelectedDate(d);
                                    setShowCalendar(false);
                                }
                            }}
                            className="rounded-md border mx-auto"
                        />
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}