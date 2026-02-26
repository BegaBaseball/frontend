import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar as CalendarIcon, Trophy, ChevronLeft, ChevronRight,
    CalendarDays, Loader2, Flame, AlertTriangle, RefreshCw, Clock3, ChevronDown
} from 'lucide-react';

// UI Components
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Skeleton } from './ui/skeleton';
import TeamLogo, { teamCodeToKoreanName } from './TeamLogo';
import GameCard from './GameCard';
import ScheduledGameCard from './ScheduledGameCard';
import WelcomeGuide from './WelcomeGuide';
import { getApiBaseUrl } from '../api/apiBase';
import {
    partitionScheduledGames,
    shouldAutoSwitchToScheduled,
    type LeagueTab,
} from '../utils/predictionHomeLogic';
import { cacheLeagueStartDates, getFallbackLeagueStartDates } from '../utils/home';

// --- Types ---
interface Game {
    gameId: string;
    time: string;
    stadium: string;
    gameStatus: string;
    gameStatusKr: string;
    gameInfo: string;
    leagueType: 'REGULAR' | 'POSTSEASON' | 'KOREAN_SERIES' | 'OFFSEASON' | 'PRE' | 'PRESEASON' | string;
    homeTeam: string;
    homeTeamFull: string;
    awayTeam: string;
    awayTeamFull: string;
    homeScore?: number;
    awayScore?: number;
    sourceDate?: string;
    leagueBadge?: string;
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


// --- Helpers ---
const GameCardSkeleton = () => (
    <Card className="overflow-hidden h-full border border-gray-100 dark:border-white/10 shadow-sm bg-white dark:bg-secondary/60">
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
    const API_BASE = getApiBaseUrl();
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
    const [rankingSeasonYear, setRankingSeasonYear] = useState(new Date().getFullYear());
    const [rankingsError, setRankingsError] = useState(false);
    const [rankingSourceMessage, setRankingSourceMessage] = useState('');

    // Navigation State (Optimistic defaults: true)
    const [navInfo, setNavInfo] = useState<{ prev: string | null; next: string | null; hasPrev: boolean; hasNext: boolean }>({
        prev: null, next: null, hasPrev: true, hasNext: true
    });

    // Loading States
    const [isLoading, setIsLoading] = useState(true);
    const [isGamesError, setIsGamesError] = useState(false);
    const [isRankingsLoading, setIsRankingsLoading] = useState(true);

    const [activeLeagueTab, setActiveLeagueTab] = useState<LeagueTab>('regular');
    const [scheduledGames, setScheduledGames] = useState<Game[]>([]);
    const [isScheduledLoading, setIsScheduledLoading] = useState(false);
    const [isScheduledError, setIsScheduledError] = useState(false);
    const [isSecondarySectionExpanded, setIsSecondarySectionExpanded] = useState(false);
    const hasUserChangedTabRef = useRef(false);
    const scheduledRequestIdRef = useRef(0);
    const navRequestIdRef = useRef(0);

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

    const getDateWindow = (baseDate: Date, length: number): Date[] => {
        return Array.from({ length }, (_, offset) => {
            const nextDate = new Date(baseDate);
            nextDate.setDate(nextDate.getDate() + offset);
            nextDate.setHours(12, 0, 0, 0);
            return nextDate;
        });
    };

    const toLocalMiddayDate = (value: string): Date => {
        const parsed = new Date(`${value}T12:00:00`);
        if (Number.isNaN(parsed.getTime())) {
            const fallback = new Date(value);
            fallback.setHours(12, 0, 0, 0);
            return fallback;
        }
        return parsed;
    };

    const isOffSeasonByDate = (baseDate = new Date(), startDates = leagueStartDates): boolean => {
        const targetDate = new Date(baseDate);
        targetDate.setHours(12, 0, 0, 0);

        if (Number.isNaN(targetDate.getTime())) {
            return false;
        }

        if (!startDates) {
            const month = targetDate.getMonth() + 1;
            const day = targetDate.getDate();
            return month >= 11 || month <= 2 || (month === 3 && day < 22);
        }

        const regularSeasonStart = new Date(startDates.regularSeasonStart);
        regularSeasonStart.setHours(12, 0, 0, 0);

        if (Number.isNaN(regularSeasonStart.getTime())) {
            const month = targetDate.getMonth() + 1;
            const day = targetDate.getDate();
            return month >= 11 || month <= 2 || (month === 3 && day < 22);
        }

        const seasonStartDateThisYear = new Date(regularSeasonStart);
        seasonStartDateThisYear.setFullYear(targetDate.getFullYear());
        seasonStartDateThisYear.setHours(12, 0, 0, 0);

        const month = targetDate.getMonth() + 1;
        const isBeforeRegularStart = targetDate < seasonStartDateThisYear;

        return month >= 11 || month <= 2 || isBeforeRegularStart;
    };

    const resolveRankingSeasonYear = (baseDate = new Date(), startDates = leagueStartDates): number => {
        const targetDate = new Date(baseDate);
        targetDate.setHours(12, 0, 0, 0);

        if (Number.isNaN(targetDate.getTime())) {
            return targetDate.getFullYear();
        }

        return isOffSeasonByDate(targetDate, startDates)
            ? targetDate.getFullYear() - 1
            : targetDate.getFullYear();
    };

    const getSeasonShortLabel = (year: number): string => String(year).slice(-2);

    const getRankingDisplayName = (teamId: string, teamName: string): string => {
        const normalizedTeamId = (teamId || '').trim().toUpperCase();
        const normalizedTeamName = (teamName || '').trim();

        const byCode = (teamCode: string): string | undefined => teamCodeToKoreanName[teamCode.toUpperCase()];

        if (normalizedTeamName) {
            const normalizedTeamNameUpper = normalizedTeamName.toUpperCase();
            const mappedByName = byCode(normalizedTeamNameUpper);
            if (mappedByName) {
                return mappedByName;
            }

            if (/[가-힣]/.test(normalizedTeamName)) {
                return normalizedTeamName;
            }
        }

        if (normalizedTeamId) {
            const mappedById = byCode(normalizedTeamId);
            if (mappedById) {
                return mappedById;
            }
        }

        const normalizedTeamNameForCode = normalizedTeamName.toUpperCase();
        const isAllCapsCode = /^[A-Z]{2,10}$/.test(normalizedTeamNameForCode);
        if (isAllCapsCode) {
            return normalizedTeamId || normalizedTeamName;
        }

        return normalizedTeamName || normalizedTeamId;
    };

    const resolveLeagueBadge = (leagueType?: string): string => {
        const normalized = (leagueType || '').toUpperCase();

        switch (normalized) {
            case 'REGULAR':
                return '정규시즌';
            case 'POSTSEASON':
                return '포스트시즌';
            case 'KOREAN_SERIES':
                return '한국시리즈';
            case 'PRE':
            case 'PRESEASON':
                return '프리시즌';
            case 'OFFSEASON':
                return '기타 일정';
            default:
                return '예정 일정';
        }
    };

    const formatSourceDateLabel = (sourceDate?: string): string => {
        if (!sourceDate) return '날짜 미정';
        const date = new Date(`${sourceDate}T12:00:00`);
        if (Number.isNaN(date.getTime())) return sourceDate;
        return formatDate(date);
    };

    const handleGameCardSelectPrediction = (game: Game) => {
        const targetDate = game.sourceDate || formatDateForAPI(selectedDate);
        const params = new URLSearchParams({
            gameId: game.gameId,
            date: targetDate,
        });
        navigate(`/prediction?${params.toString()}`);
    };

    const changeDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setHours(12, 0, 0, 0);

        if (direction === 'prev') {
            if (navInfo.prev) {
                // Smart nav
                setSelectedDate(toLocalMiddayDate(navInfo.prev));
            } else {
                // Fallback: -1 day
                newDate.setDate(newDate.getDate() - 1);
                newDate.setHours(12, 0, 0, 0);
                setSelectedDate(newDate);
            }
        } else if (direction === 'next') {
            if (navInfo.next) {
                // Smart nav
                setSelectedDate(toLocalMiddayDate(navInfo.next));
            } else {
                // Fallback: +1 day
                newDate.setDate(newDate.getDate() + 1);
                newDate.setHours(12, 0, 0, 0);
                setSelectedDate(newDate);
            }
        }
    };

    // --- Data Fetching ---
    const loadNavigationData = async (date: Date) => {
        const requestId = ++navRequestIdRef.current;
        const apiDate = formatDateForAPI(date);
        try {
            const response = await fetch(`${API_BASE}/kbo/schedule/navigation?date=${apiDate}`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                if (requestId !== navRequestIdRef.current) return;
                const prevGameDate = data.prevGameDate ?? null;
                const nextGameDate = data.nextGameDate ?? null;
                setNavInfo({
                    prev: prevGameDate,
                    next: nextGameDate,
                    hasPrev: Boolean(prevGameDate),
                    hasNext: Boolean(nextGameDate),
                });
            } else {
                // If API fails (e.g. 500 or 404), keep buttons enabled for fallback
                if (requestId !== navRequestIdRef.current) return;
                setNavInfo(prev => ({ ...prev, hasPrev: true, hasNext: true }));
            }
        } catch (error) {
            console.error('[Nav] Error:', error);
            // Fallback: keep enabled
            if (requestId !== navRequestIdRef.current) return;
            setNavInfo(prev => ({ ...prev, hasPrev: true, hasNext: true }));
        }
    };

    // --- Data Fetching ---
    const loadLeagueStartDates = async () => {
        const fallbackDates = getFallbackLeagueStartDates();

        try {
            const response = await fetch(`${API_BASE}/kbo/league-start-dates`, {
                credentials: 'include',
            });
            if (!response.ok) {
                setLeagueStartDates(fallbackDates);
            } else {
                const data = await response.json() as LeagueStartDates;
                cacheLeagueStartDates(data);
                setLeagueStartDates(data);
            }
        } catch (error) {
            console.error('[System] Error loading league dates:', error);
            setLeagueStartDates(fallbackDates);
        }
    };

    const loadGamesData = async (date: Date) => {
        const apiDate = formatDateForAPI(date);
        setIsLoading(true);
        setIsGamesError(false);

        try {
            const response = await fetch(`${API_BASE}/kbo/schedule?date=${apiDate}`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('API Error');

            const gamesData: Game[] = await response.json();
            setGames(gamesData);

            if (gamesData.length > 0 && !hasUserChangedTabRef.current) {
                const firstGameType = gamesData[0].leagueType;
                if (firstGameType === 'REGULAR') setActiveLeagueTab('regular');
                else if (firstGameType === 'POSTSEASON') setActiveLeagueTab('postseason');
                else if (firstGameType === 'KOREAN_SERIES') setActiveLeagueTab('koreanseries');
            }
        } catch (error) {
            console.error('[Game] Error loading games:', error);
            setGames([]);
            setIsGamesError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const loadScheduledGamesData = async (baseDate: Date) => {
        const requestId = ++scheduledRequestIdRef.current;
        setIsScheduledLoading(true);
        setIsScheduledError(false);

        try {
            const dates = getDateWindow(baseDate, 8);
            const responses = await Promise.all(
                dates.map(async (targetDate) => {
                    const apiDate = formatDateForAPI(targetDate);
                    const response = await fetch(`${API_BASE}/kbo/schedule?date=${apiDate}`, {
                        credentials: 'include',
                    });
                    if (!response.ok) return [] as Game[];

                    const dailyGames: Game[] = await response.json();
                    return dailyGames.map((game) => ({
                        ...game,
                        sourceDate: apiDate,
                        leagueBadge: resolveLeagueBadge(game.leagueType),
                    }));
                })
            );

            if (requestId !== scheduledRequestIdRef.current) return;

            const merged = responses
                .flat()
                .sort((a, b) => {
                    const dateCompare = (a.sourceDate || '').localeCompare(b.sourceDate || '');
                    if (dateCompare !== 0) return dateCompare;
                    const timeCompare = (a.time || '').localeCompare(b.time || '');
                    if (timeCompare !== 0) return timeCompare;
                    return a.gameId.localeCompare(b.gameId);
                });

            setScheduledGames(merged);
        } catch (error) {
            if (requestId !== scheduledRequestIdRef.current) return;
            console.error('[Scheduled] Error loading scheduled games:', error);
            setScheduledGames([]);
            setIsScheduledError(true);
        } finally {
            if (requestId === scheduledRequestIdRef.current) {
                setIsScheduledLoading(false);
            }
        }
    };

    const loadRankingsData = async (seasonYear: number) => {
        setIsRankingsLoading(true);
        setRankingsError(false);
        setRankingSourceMessage('');
        setRankingSeasonYear(seasonYear);

        const requestRankings = async (targetSeasonYear: number): Promise<Ranking[]> => {
            const response = await fetch(`${API_BASE}/kbo/rankings/${targetSeasonYear}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('API Error');
            }

            return await response.json();
        };

        try {
            const now = selectedDate;
            const shouldFallbackToPrevious = isOffSeasonByDate(now, leagueStartDates);

            const rankingsData = await requestRankings(seasonYear);

            if (rankingsData.length > 0) {
                setRankingSeasonYear(seasonYear);
                setRankingSourceMessage(`${seasonYear} 시즌 순위 데이터`);
                setRankings(rankingsData);
                return;
            }

            if (!shouldFallbackToPrevious) {
                setRankings([]);
                setRankingSourceMessage(`${seasonYear} 시즌 데이터가 아직 집계되지 않았습니다.`);
                return;
            }

            const previousSeasonYear = seasonYear - 1;
            setRankingSourceMessage(`전시즌(${getSeasonShortLabel(previousSeasonYear)}) 재조회 중`);

            try {
                const fallbackData = await requestRankings(previousSeasonYear);

                if (fallbackData.length > 0) {
                    setRankingSeasonYear(previousSeasonYear);
                    setRankingSourceMessage(`${previousSeasonYear} 시즌 순위 데이터`);
                    setRankings(fallbackData);
                    return;
                }

                setRankingSourceMessage('현재 시즌과 전시즌(전년도) 데이터가 없습니다.');
                setRankings([]);
                return;
                } catch (fallbackError) {
                    console.error(`[Rank] Error loading previous season rankings:`, fallbackError);
                    setRankings([]);
                    setRankingsError(true);
                    setRankingSourceMessage('순위 조회 중 문제가 발생했습니다.');
                    return;
                }
        } catch (error) {
            console.error('[Rank] Error loading rankings:', error);
            setRankings([]);
            setRankingsError(true);

            const now = selectedDate;
            const shouldFallbackToPrevious = isOffSeasonByDate(now, leagueStartDates);

            if (shouldFallbackToPrevious) {
                const previousSeasonYear = seasonYear - 1;
                setRankingSourceMessage(`전시즌(${getSeasonShortLabel(previousSeasonYear)}) 재조회 중`);

                try {
                    const fallbackData = await requestRankings(previousSeasonYear);

                    if (fallbackData.length > 0) {
                        setRankingSeasonYear(previousSeasonYear);
                        setRankingSourceMessage(`${previousSeasonYear} 시즌 순위 데이터`);
                        setRankings(fallbackData);
                        setRankingsError(false);
                        return;
                    }

                    setRankingSourceMessage('현재 시즌과 전시즌(전년도) 데이터가 없습니다.');
                    setRankings([]);
                    setRankingsError(false);
                    return;
                } catch (fallbackError) {
                    console.error('[Rank] Error loading fallback rankings:', fallbackError);
                    setRankings([]);
                    setRankingsError(true);
                    setRankingSourceMessage('순위 조회 중 문제가 발생했습니다.');
                }
            return;
        }

        setRankingSourceMessage('순위 조회 중 문제가 발생했습니다.');
        } finally {
            setIsRankingsLoading(false);
        }
    };

    const handleTabChange = (value: string) => {
        const tabValue = value as LeagueTab;
        hasUserChangedTabRef.current = true;
        setActiveLeagueTab(tabValue);

        if (tabValue === 'scheduled') return;
        if (!leagueStartDates) return;

        let targetDate = null;
        if (tabValue === 'regular') targetDate = new Date(leagueStartDates.regularSeasonStart);
        else if (tabValue === 'postseason') targetDate = new Date(leagueStartDates.postseasonStart);
        else if (tabValue === 'koreanseries') targetDate = new Date(leagueStartDates.koreanSeriesStart);

        if (targetDate) {
            targetDate.setFullYear(new Date().getFullYear());
            targetDate.setHours(12, 0, 0, 0);
            setSelectedDate(targetDate);
        }
    };

    useEffect(() => {
        loadLeagueStartDates();
    }, []);

    useEffect(() => {
        if (!leagueStartDates) {
            return;
        }

        const seasonYear = resolveRankingSeasonYear(selectedDate, leagueStartDates);
        setRankingSeasonYear((prev) => (prev === seasonYear ? prev : seasonYear));
        loadRankingsData(seasonYear);
    }, [leagueStartDates, selectedDate]);
    useEffect(() => {
        loadGamesData(selectedDate);
        loadNavigationData(selectedDate);
        loadScheduledGamesData(selectedDate);
    }, [selectedDate]);
    useEffect(() => {
        setIsSecondarySectionExpanded(false);
    }, [selectedDate]);

    const regularSeasonGames = games.filter(g => g.leagueType === 'REGULAR');
    const postSeasonGames = games.filter(g => g.leagueType === 'POSTSEASON');
    const koreanSeriesGames = games.filter(g => g.leagueType === 'KOREAN_SERIES');
    const {
        primary: scheduledPrimaryGames,
        secondary: scheduledSecondaryGames,
        excluded: liveOrFinishedScheduledGames,
    } = partitionScheduledGames(scheduledGames);
    const groupGamesBySourceDate = (targetGames: Game[]) => {
        const grouped = targetGames.reduce<Record<string, Game[]>>((acc, game) => {
            const key = game.sourceDate || formatDateForAPI(selectedDate);
            if (!acc[key]) acc[key] = [];
            acc[key].push(game);
            return acc;
        }, {});

        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    };

    const displayableRankings = rankings.reduce<Array<Ranking & { displayName: string }>>((acc, team) => {
        const teamId = (team.teamId || '').trim().toUpperCase();
        if (!teamId) {
            return acc;
        }

        if (acc.some((value) => value.teamId === teamId)) {
            return acc;
        }

        acc.push({
            ...team,
            teamId,
            displayName: getRankingDisplayName(teamId, team.teamName),
        });
        return acc;
    }, []);
    const rankingDataVisibilityMessage = displayableRankings.length === 0 && rankings.length > 0
        ? '순위 데이터에서 정규 팀이 아닌 항목이 감지되어 표시 가능한 팀 순위가 없습니다.'
        : (rankingSourceMessage || '현재 시즌의 팀 순위 집계 데이터가 없습니다.');
    const rankingStatusHintMessage = isOffSeasonByDate(selectedDate, leagueStartDates)
        ? '현재는 비시즌이므로 이전 시즌 순위를 표시하고 있습니다.'
        : '현재 시즌이 시작된 상태입니다. 시즌 순위는 경기 결과 집계 후 표시됩니다.';

    useEffect(() => {
        const shouldSwitch = shouldAutoSwitchToScheduled({
            activeLeagueTab,
            hasUserChangedTab: hasUserChangedTabRef.current,
            isLoading,
            isScheduledLoading,
            regularCount: regularSeasonGames.length,
            postseasonCount: postSeasonGames.length,
            koreanSeriesCount: koreanSeriesGames.length,
            scheduledPrimaryCount: scheduledPrimaryGames.length,
        });

        if (shouldSwitch) {
            setActiveLeagueTab('scheduled');
        }
    }, [
        activeLeagueTab,
        isLoading,
        isScheduledLoading,
        regularSeasonGames.length,
        postSeasonGames.length,
        koreanSeriesGames.length,
        scheduledPrimaryGames.length,
    ]);

    if (!leagueStartDates) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-300 pb-20">
            <WelcomeGuide />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Header (Green Accent Included) */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6 border-gray-100 dark:border-border">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-1.5 h-8 bg-primary rounded-full" />
                            <h1 className="text-3xl font-black tracking-tight text-primary dark:text-emerald-400">
                                KBO LEAGUE
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-300 font-medium pl-4">
                            {rankingSeasonYear} 시즌 경기 일정 및 순위
                        </p>
                    </div>
                    <div>
                        <Button variant="outline" onClick={() => navigate('/offseason')} className="border-emerald-600/20 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-900/20">
                            <Flame className="w-4 h-4 mr-2 text-orange-500" /> 스토브리그
                        </Button>
                    </div>
                </div>

                {/* Date Navigation (Green Accent Included) */}
                <div className="flex items-center justify-center gap-6 bg-white dark:bg-card/70 py-3 px-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/15 w-full md:w-fit mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
                    <Button data-testid="home-date-prev" variant="ghost" size="icon" onClick={() => changeDate('prev')} disabled={!navInfo.hasPrev} className="hover:text-primary hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-30">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>

                    <div className="flex flex-col items-center min-w-[140px]">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">
                            {formatDate(selectedDate)}
                        </h2>
                        <Button variant="link" size="sm" onClick={() => setShowCalendar(true)} className="text-xs text-primary dark:text-emerald-400 h-auto p-0 font-bold hover:underline opacity-80 hover:opacity-100 transition-opacity">
                            <CalendarDays className="w-3 h-3 mr-1" /> 날짜 변경
                        </Button>
                    </div>

                    <Button data-testid="home-date-next" variant="ghost" size="icon" onClick={() => changeDate('next')} disabled={!navInfo.hasNext} className="hover:text-primary hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-30">
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                </div>

                {/* Filters (Green Accent Included) */}
                <Tabs value={activeLeagueTab} onValueChange={handleTabChange} className="w-full">
                    <div className="flex justify-center mb-6">
                        <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-gray-100 dark:bg-card p-1 rounded-xl">
                            <TabsTrigger value="regular" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">정규시즌</TabsTrigger>
                            <TabsTrigger value="postseason" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">포스트시즌</TabsTrigger>
                            <TabsTrigger value="koreanseries" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">한국시리즈</TabsTrigger>
                            <TabsTrigger value="scheduled" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">예정경기</TabsTrigger>
                        </TabsList>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => <GameCardSkeleton key={i} />)}
                        </div>
                    ) : isGamesError ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-card rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm">
                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
                            </div>
                            <p className="text-gray-700 dark:text-gray-200 font-semibold mb-1">
                                경기 일정을 불러오지 못했습니다
                            </p>
                            <p className="text-gray-400 dark:text-gray-400 text-sm mb-4">
                                네트워크 연결을 확인하고 다시 시도해주세요
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadGamesData(selectedDate)}
                                className="border-primary/30 text-primary hover:bg-primary/5"
                            >
                                <RefreshCw className="w-4 h-4 mr-1.5" />
                                다시 시도
                            </Button>
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
                                            <div className="text-center py-16 text-gray-500 dark:text-gray-300">
                                                경기가 없는 날입니다.
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {currentGames.map((game, index) => (
                                                        <GameCard
                                                            key={`${game.gameId}-${index}`}
                                                            game={game}
                                                            onSelectPrediction={() => handleGameCardSelectPrediction(game)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>
                                );
                            })}

                            <TabsContent value="scheduled" className="mt-0">
                                {isScheduledLoading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {[1, 2, 3].map((i) => <GameCardSkeleton key={`scheduled-skeleton-${i}`} />)}
                                    </div>
                                ) : isScheduledError ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-card rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm">
                                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                                            <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-200 font-semibold mb-1">
                                            예정 경기 일정을 불러오지 못했습니다
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => loadScheduledGamesData(selectedDate)}
                                            className="border-primary/30 text-primary hover:bg-primary/5 mt-3"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-1.5" />
                                            다시 시도
                                        </Button>
                                    </div>
                                ) : (scheduledPrimaryGames.length === 0 && scheduledSecondaryGames.length === 0) ? (
                                    <div className="text-center py-16 text-gray-500 dark:text-gray-300">
                                        선택한 날짜부터 7일 내 예정 경기가 없습니다.
                                    </div>
                                ) : (
                                    <div className="space-y-8 rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm">
                                        {scheduledPrimaryGames.length > 0 && (
                                            <section className="space-y-4">
                                                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-100/90 px-3 py-2 dark:border-border dark:bg-secondary/80">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-100">
                                                        <Clock3 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                                                        곧 열리는 경기
                                                    </div>
                                                    <span className="inline-flex min-w-10 justify-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                        {scheduledPrimaryGames.length}건
                                                    </span>
                                                </div>
                                                {groupGamesBySourceDate(scheduledPrimaryGames).map(([sourceDate, groupedGames]) => (
                                                    <div key={`scheduled-primary-${sourceDate}`} className="space-y-3">
                                                        <h4 className="sticky top-2 z-10 rounded-lg border border-gray-200/80 bg-gray-100/90 px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-gray-100/80 dark:border-border dark:bg-secondary/90 dark:text-gray-200">
                                                            {formatSourceDateLabel(sourceDate)}
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {groupedGames.map((game, index) => (
                                                                <ScheduledGameCard
                                                                    key={`${game.gameId}-${sourceDate}-${index}`}
                                                                    game={game}
                                                                    onSelectPrediction={() => handleGameCardSelectPrediction(game)}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </section>
                                        )}

                                        {scheduledSecondaryGames.length > 0 && (
                                            <section className="space-y-4">
                                                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-100/90 px-3 py-2 dark:border-border dark:bg-secondary/80">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-300">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        연기/취소
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex min-w-10 justify-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-300">
                                                            {scheduledSecondaryGames.length}건
                                                        </span>
                                                        <button
                                                            type="button"
                                                            data-testid="home-scheduled-secondary-toggle"
                                                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-border dark:bg-secondary dark:text-gray-200 dark:hover:bg-secondary/70"
                                                            aria-expanded={isSecondarySectionExpanded}
                                                            onClick={() => setIsSecondarySectionExpanded(prev => !prev)}
                                                        >
                                                            {isSecondarySectionExpanded ? '접기' : '펼치기'}
                                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSecondarySectionExpanded ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {isSecondarySectionExpanded ? (
                                                    groupGamesBySourceDate(scheduledSecondaryGames).map(([sourceDate, groupedGames]) => (
                                                        <div key={`scheduled-secondary-${sourceDate}`} className="space-y-3">
                                                            <h4 className="sticky top-2 z-10 rounded-lg border border-gray-200/80 bg-gray-100/90 px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-gray-100/80 dark:border-border dark:bg-secondary/90 dark:text-gray-200">
                                                                {formatSourceDateLabel(sourceDate)}
                                                            </h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {groupedGames.map((game, index) => (
                                                                    <ScheduledGameCard
                                                                        key={`${game.gameId}-${sourceDate}-${index}`}
                                                                        game={game}
                                                                        onSelectPrediction={() => handleGameCardSelectPrediction(game)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-gray-500 dark:text-gray-300 px-1">
                                                        연기/취소 경기가 접혀 있습니다. 펼치기 버튼으로 확인하세요.
                                                    </p>
                                                )}
                                            </section>
                                        )}

                                        {liveOrFinishedScheduledGames.length > 0 && (
                                            <p className="text-xs text-gray-400 dark:text-gray-300 text-center">
                                                기타 상태 경기 {liveOrFinishedScheduledGames.length}건은 예정경기 탭에서 제외되었습니다.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    )}
                </Tabs>

                {/* Rankings Table */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-bold">팀 순위</h2>
                    </div>

                        <Card className="overflow-hidden shadow-sm border border-gray-200 dark:border-border bg-white dark:bg-card">
                            {isRankingsLoading ? (
                                <div className="p-8 space-y-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : rankingsError ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-card">
                                    <p className="text-gray-700 dark:text-gray-200 font-semibold mb-3">
                                        팀 순위를 불러오는 중 문제가 발생했습니다.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const seasonYear = resolveRankingSeasonYear(selectedDate, leagueStartDates);
                                            loadRankingsData(seasonYear);
                                        }}
                                        className="border-primary/30 text-primary hover:bg-primary/5"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-1.5" />
                                        다시 시도
                                    </Button>
                                </div>
                            ) : displayableRankings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                    <p className="text-gray-700 dark:text-gray-200 font-semibold mb-1">
                                        {rankingDataVisibilityMessage}
                                    </p>
                                    <p className="text-gray-400 dark:text-gray-400 text-sm">
                                        {rankingStatusHintMessage}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 dark:bg-secondary text-gray-600 dark:text-gray-200 uppercase border-b border-gray-200 dark:border-border">
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
                                    <tbody>
                                        {displayableRankings.map(team => (
                                            <tr
                                                key={team.teamId}
                                                className="border-b border-gray-100 dark:border-border/70 last:border-b-0 odd:bg-white even:bg-gray-50/70 dark:odd:bg-card dark:even:bg-secondary/40 hover:bg-emerald-50/50 dark:hover:bg-secondary/70 transition-colors dark:text-gray-100"
                                            >
                                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{team.rank}</td>
                                                <td className="px-6 py-4 flex items-center gap-3 font-medium text-gray-900 dark:text-gray-100">
                                                    <TeamLogo team={team.displayName} teamId={team.teamId} size={24} />
                                                    {team.displayName}
                                                </td>
                                                <td className="px-6 py-4 text-right">{team.games}</td>
                                                <td className="px-6 py-4 text-right text-red-500 dark:text-red-400 font-medium">{team.wins}</td>
                                                <td className="px-6 py-4 text-right text-blue-500 dark:text-blue-400">{team.losses}</td>
                                                <td className="px-6 py-4 text-right text-gray-400 dark:text-gray-300">{team.draws}</td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">{team.winRate}</td>
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
