import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar as CalendarIcon, Trophy, ChevronLeft, ChevronRight,
    CalendarDays, Loader2, Flame, AlertTriangle, RefreshCw, Clock3, ChevronDown, MessageSquare, Users, ExternalLink
} from 'lucide-react';

// UI Components
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Skeleton } from './ui/skeleton';
import TeamLogo, { resolveTeamDisplayName } from './TeamLogo';
import GameCard from './GameCard';
import ScheduledGameCard from './ScheduledGameCard';
import WelcomeGuide from './WelcomeGuide';
import AdSlot from './ads/AdSlot';
import api from '../api/axios';
import {
    partitionScheduledGames,
    shouldAutoSwitchToScheduled,
    type LeagueTab,
} from '../utils/predictionHomeLogic';
import { cacheLeagueStartDates, getFallbackLeagueStartDates } from '../utils/home';
import { fetchHotPosts, CheerPost } from '../api/cheerApi';
import { fetchAllParties } from '../api/mate';
import { Party } from '../types/mate';
import { formatTimeAgo } from '../utils/time';
import { getFullTeamName, TEAM_NAME_TO_ID, TEAM_ID_TO_CODE } from '../constants/teams';

// --- Types ---
interface Game {
    gameId: string;
    time: string;
    stadium: string;
    gameStatus: string;
    gameStatusKr: string;
    gameInfo: string;
    leagueType: 'REGULAR' | 'POSTSEASON' | 'KOREAN_SERIES' | 'OFFSEASON' | 'PRE' | 'PRESEASON' | string;
    winner?: string;
    homeTeam: string;
    homeTeamFull: string;
    awayTeam: string;
    awayTeamFull: string;
    gameDate?: string;
    homeScore?: number | string;
    awayScore?: number | string;
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
const GAME_CARD_MIN_HEIGHT = 'min-h-[240px]';
const GAME_CARD_MIN_HEIGHT_PX = 240;
const SCHEDULED_GAME_CARD_MIN_HEIGHT = 'h-[224px]';
const SCHEDULED_GAME_CARD_MIN_HEIGHT_PX = 224;
const MIN_LOADING_CARD_COUNT = 5;
const LOADING_CARD_COUNT_MAX = 9;

const GameCardSkeleton = () => (
    <Card
        className={`overflow-hidden ${GAME_CARD_MIN_HEIGHT} rounded-2xl border border-slate-200/90 dark:border-white/12 shadow-sm bg-gradient-to-b from-white via-white to-slate-50 dark:from-secondary/80 dark:via-secondary/70 dark:to-secondary/55`}
    >
        <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-4 w-1/3 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                <Skeleton className="h-6 w-12 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
            </div>
            <div className="flex justify-between items-center py-2">
                <Skeleton className="h-14 w-14 rounded-2xl bg-slate-200/80 dark:bg-slate-700/80" />
                <Skeleton className="h-8 w-16 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                <Skeleton className="h-14 w-14 rounded-2xl bg-slate-200/80 dark:bg-slate-700/80" />
            </div>
            <div className="pt-2">
                <Skeleton className="h-4 w-5/6 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
            </div>
        </CardContent>
    </Card>
);

const ScheduledGameCardSkeleton = () => (
    <Card
        className={`overflow-hidden ${SCHEDULED_GAME_CARD_MIN_HEIGHT} rounded-2xl border border-slate-200/90 dark:border-white/12 shadow-sm bg-gradient-to-b from-white via-white to-slate-50 dark:from-secondary/80 dark:via-secondary/70 dark:to-secondary/55`}
    >
        <CardContent className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-6 w-24 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                <Skeleton className="h-5 w-20 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
            </div>
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/90 px-3 py-2 dark:border-border/80 dark:bg-secondary/70">
                    <Skeleton className="h-8 w-24 rounded-xl bg-slate-200/80 dark:bg-slate-700/80" />
                    <Skeleton className="h-3.5 w-8 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                    <Skeleton className="h-8 w-24 rounded-xl bg-slate-200/80 dark:bg-slate-700/80" />
                </div>
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-16 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                    <Skeleton className="h-5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                    <Skeleton className="h-5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                </div>
            </div>
            <Skeleton className="h-9 w-full rounded-xl bg-slate-200/80 dark:bg-slate-700/80" />
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
    const [rankingSeasonYear, setRankingSeasonYear] = useState(new Date().getFullYear());
    const [rankingsError, setRankingsError] = useState(false);
    const [rankingSourceMessage, setRankingSourceMessage] = useState('');

    // Navigation State (Optimistic defaults: true)
    const [navInfo, setNavInfo] = useState<{ prev: string | null; next: string | null; hasPrev: boolean; hasNext: boolean }>({
        prev: null, next: null, hasPrev: true, hasNext: true
    });

    // New Data States
    const [hotCheerPosts, setHotCheerPosts] = useState<CheerPost[]>([]);
    const [isHotCheerLoading, setIsHotCheerLoading] = useState(true);
    const [featuredMates, setFeaturedMates] = useState<Party[]>([]);
    const [isFeaturedMatesLoading, setIsFeaturedMatesLoading] = useState(true);

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
    const matchLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);
    const scheduledLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);

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

    const clampLoadingCount = (value: number) => (
        Math.max(MIN_LOADING_CARD_COUNT, Math.min(LOADING_CARD_COUNT_MAX, value))
    );

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

        if (normalizedTeamId) {
            const mappedById = getFullTeamName(normalizedTeamId);
            if (mappedById) {
                return mappedById;
            }
        }

        if (normalizedTeamName) {
            const mappedTeamIdByName = TEAM_NAME_TO_ID[normalizedTeamName] || TEAM_NAME_TO_ID[normalizedTeamName.toUpperCase()];
            if (mappedTeamIdByName) {
                const mappedByName = getFullTeamName(mappedTeamIdByName);
                if (mappedByName) {
                    return mappedByName;
                }
            }

            const normalizedTeamNameUpper = normalizedTeamName.toUpperCase();
            const mappedByName = getFullTeamName(normalizedTeamNameUpper);
            if (mappedByName && normalizedTeamName !== mappedByName) {
                return mappedByName;
            }

            if (/[가-힣]/.test(normalizedTeamName)) {
                return normalizedTeamName;
            }
        }

        const normalizedTeamNameForCode = normalizedTeamName.toUpperCase();
        const isAllCapsCode = /^[A-Z]{2,10}$/.test(normalizedTeamNameForCode);
        if (isAllCapsCode) {
            const mappedByNameCode = getFullTeamName(normalizedTeamNameForCode);
            return mappedByNameCode || (normalizedTeamId || normalizedTeamName);
        }

        return normalizedTeamName || normalizedTeamId;
    };

    const getMateTeamDisplayName = (teamName: string): string => {
        const normalizedTeamName = (teamName || '').trim();
        if (!normalizedTeamName) return '';
        const normalizedTeamNameLower = normalizedTeamName.toLowerCase();

        const resolvedTeamName = resolveTeamDisplayName(normalizedTeamName);
        if (resolvedTeamName && resolvedTeamName !== normalizedTeamName) {
            return resolvedTeamName;
        }

        const directMapped = getFullTeamName(normalizedTeamName);
        if (directMapped && directMapped !== normalizedTeamName) {
            return directMapped;
        }

        const mappedTeamId = TEAM_NAME_TO_ID[normalizedTeamName] || TEAM_NAME_TO_ID[normalizedTeamName.toUpperCase()];
        if (mappedTeamId) {
            return getFullTeamName(mappedTeamId);
        }

        const mappedTeamIdByCode = TEAM_ID_TO_CODE[normalizedTeamName.toLowerCase()];
        if (mappedTeamIdByCode) {
            return getFullTeamName(mappedTeamIdByCode);
        }

        const normalizedWithoutSpace = normalizedTeamName.replace(/\s+/g, '');
        const mappedByNoSpace = getFullTeamName(normalizedWithoutSpace);
        if (mappedByNoSpace && mappedByNoSpace !== normalizedWithoutSpace) {
            return mappedByNoSpace;
        }

        const normalizedWithoutSpaceLower = normalizedWithoutSpace.toLowerCase();
        const mappedTeamIdByNoSpaceCode = TEAM_ID_TO_CODE[normalizedWithoutSpaceLower];
        if (mappedTeamIdByNoSpaceCode) {
            return getFullTeamName(mappedTeamIdByNoSpaceCode);
        }

        const normalizedByTokens = normalizedTeamName.toLowerCase().split(/[^a-z가-힣0-9]+/).filter(Boolean);
        const candidateTeamEntries = [
            ...normalizedByTokens,
            normalizedTeamNameLower,
            normalizedWithoutSpaceLower,
        ];

        for (const candidate of candidateTeamEntries) {
            for (const [alias, teamId] of Object.entries(TEAM_NAME_TO_ID)) {
                const aliasLower = alias.toLowerCase();
                if (candidate.includes(aliasLower) || aliasLower.includes(candidate)) {
                    const mapped = getFullTeamName(teamId);
                    if (mapped) {
                        return mapped;
                    }
                }
            }

            const mappedCodeByAlias = TEAM_ID_TO_CODE[candidate];
            if (mappedCodeByAlias) {
                return getFullTeamName(mappedCodeByAlias);
            }
        }

        const alphaOnly = normalizedTeamNameLower.replace(/[^a-z]/g, '');
        for (const [codeAlias, teamId] of Object.entries(TEAM_ID_TO_CODE)) {
            if (!codeAlias) continue;
            if (alphaOnly.includes(codeAlias)) {
                return getFullTeamName(teamId);
            }
        }

        return normalizedTeamName;
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

    const normalizePredictionDate = (value?: string): string => {
        const fallback = formatDateForAPI(selectedDate);
        if (!value) return fallback;

        const direct = new Date(`${value}T12:00:00`);
        if (!Number.isNaN(direct.getTime())) {
            direct.setHours(12, 0, 0, 0);
            return formatDateForAPI(direct);
        }

        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            parsed.setHours(12, 0, 0, 0);
            return formatDateForAPI(parsed);
        }

        return fallback;
    };

    const handleGameCardSelectPrediction = (game: Game) => {
        const targetDate = normalizePredictionDate(
            game.sourceDate || game.gameDate || formatDateForAPI(selectedDate),
        );
        navigate('/prediction', {
            state: {
                sourcePage: 'home',
                gameId: game.gameId,
                date: targetDate,
                game: {
                    gameId: game.gameId,
                    homeTeam: game.homeTeam,
                    homeTeamFull: game.homeTeamFull,
                    awayTeam: game.awayTeam,
                    awayTeamFull: game.awayTeamFull,
                    homeScore: game.homeScore,
                    awayScore: game.awayScore,
                    sourceDate: game.sourceDate,
                    date: targetDate,
                },
            },
        });
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
            const { data } = await api.get<{ prevGameDate?: string | null; nextGameDate?: string | null }>('/kbo/schedule/navigation', {
                params: { date: apiDate },
            });
            if (requestId !== navRequestIdRef.current) return;
            const prevGameDate = data?.prevGameDate ?? null;
            const nextGameDate = data?.nextGameDate ?? null;
            setNavInfo({
                prev: prevGameDate,
                next: nextGameDate,
                hasPrev: Boolean(prevGameDate),
                hasNext: Boolean(nextGameDate),
            });
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
            const { data } = await api.get<LeagueStartDates>('/kbo/league-start-dates');
            cacheLeagueStartDates(data);
            setLeagueStartDates(data);
        } catch (error) {
            console.error('[System] Error loading league dates:', error);
            setLeagueStartDates(fallbackDates);
        }
    };

  const loadGamesData = async (date: Date) => {
        const apiDate = formatDateForAPI(date);
        setIsLoading(true);
        setIsGamesError(false);
        matchLoadingCardCountRef.current = LOADING_CARD_COUNT_MAX;

        try {
            const { data: gamesData } = await api.get<Game[]>('/kbo/schedule', {
                params: { date: apiDate },
            });
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
        scheduledLoadingCardCountRef.current = LOADING_CARD_COUNT_MAX;

        try {
            const dates = getDateWindow(baseDate, 8);
            const responses = await Promise.all(dates.map(async (targetDate) => {
                try {
                    const apiDate = formatDateForAPI(targetDate);
                    const { data: dailyGames } = await api.get<Game[]>('/kbo/schedule', {
                        params: { date: apiDate },
                    });
                    return dailyGames.map((game) => ({
                        ...game,
                        sourceDate: apiDate,
                        leagueBadge: resolveLeagueBadge(game.leagueType),
                    }));
                } catch (error) {
                    console.error('[Scheduled] Error loading day schedule:', error);
                    return [];
                }
            }));

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
            const response = await api.get<Ranking[]>(`/kbo/rankings/${targetSeasonYear}`);
            return response.data;
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

    // Initial load for new Dashboard Widgets
    useEffect(() => {
        const loadDashboardWidgets = async () => {
            setIsHotCheerLoading(true);
            setIsFeaturedMatesLoading(true);
            try {
                // Fetch Hot Cheer Posts
                const cheerRes = await fetchHotPosts({ page: 0, size: 5, algorithm: 'HYBRID' });
                setHotCheerPosts(cheerRes.content.slice(0, 3)); // Taking top 3
            } catch (err) {
                console.error('[Widget] Error loading Hot Cheer:', err);
            } finally {
                setIsHotCheerLoading(false);
            }

            try {
                // Fetch Mate Parties (assuming fetchAllParties gets upcoming ones based on API defaults)
                const mateData = await fetchAllParties();
                // Filter for upcoming parties and take top 4
                const upcomingMates = mateData.filter(p => new Date(p.gameDate) >= new Date() && p.status === 'PENDING').slice(0, 4);
                setFeaturedMates(upcomingMates);
            } catch (err) {
                console.error('[Widget] Error loading Mates:', err);
            } finally {
                setIsFeaturedMatesLoading(false);
            }
        };

        loadDashboardWidgets();
    }, []);
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
    const matchSkeletonCount = clampLoadingCount(
        Math.max(regularSeasonGames.length, postSeasonGames.length, koreanSeriesGames.length),
    );
    const scheduledSkeletonCount = clampLoadingCount(
        Math.max(scheduledPrimaryGames.length + scheduledSecondaryGames.length, scheduledGames.length),
    );

    if (!isLoading) {
        matchLoadingCardCountRef.current = Math.max(
            matchLoadingCardCountRef.current,
            matchSkeletonCount
        );
    }

    if (!isScheduledLoading) {
        scheduledLoadingCardCountRef.current = Math.max(
            MIN_LOADING_CARD_COUNT,
            scheduledSkeletonCount,
            scheduledLoadingCardCountRef.current
        );
    }

    const activeTabIsScheduled = activeLeagueTab === 'scheduled';
    const activeCardHeight = activeTabIsScheduled ? SCHEDULED_GAME_CARD_MIN_HEIGHT_PX : GAME_CARD_MIN_HEIGHT_PX;
    const loadingMatchCardCount = activeTabIsScheduled
        ? scheduledLoadingCardCountRef.current
        : matchLoadingCardCountRef.current;
    const minLoadingCount = Math.max(MIN_LOADING_CARD_COUNT, loadingMatchCardCount);
  const desktopRows = Math.max(1, Math.ceil(Math.min(minLoadingCount, 4) / 2));
  const mobileRows = Math.max(1, Math.min(minLoadingCount, 2));
  const mobileHeight = (mobileRows * activeCardHeight) + ((mobileRows - 1) * 12);
  const desktopHeight = (desktopRows * activeCardHeight) + ((desktopRows - 1) * 12);
  const calculatedMatchSectionMinHeight = Math.min(Math.max(mobileHeight, desktopHeight) + 24, 100);
  const matchSectionMinHeightStyle = { minHeight: `${calculatedMatchSectionMinHeight}px` };

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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

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

                {/* Games Area (Full Width visually and structurally inside max-w-7xl) */}
                <div className="flex flex-col gap-3 mt-3">
                    {/* Filters (Green Accent Included) */}
                    <Tabs value={activeLeagueTab} onValueChange={handleTabChange} className="w-full">
                        <div className="flex justify-center mb-6">
                            <TabsList className="grid w-full max-w-xl grid-cols-4 bg-gray-100 dark:bg-card p-1 rounded-xl mx-auto">
                                <TabsTrigger value="regular" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">정규시즌</TabsTrigger>
                                <TabsTrigger value="postseason" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">포스트시즌</TabsTrigger>
                                <TabsTrigger value="koreanseries" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">한국시리즈</TabsTrigger>
                                <TabsTrigger value="scheduled" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">예정경기</TabsTrigger>
                            </TabsList>
                        </div>

                        {isLoading ? (
                            <div
                              className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm"
                              style={matchSectionMinHeightStyle}
                            >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-0 items-stretch">
                                    {Array.from({ length: loadingMatchCardCount }, (_, index) => <GameCardSkeleton key={`loading-game-${index}`} />)}
                                </div>
                            </div>
                        ) : isGamesError ? (
                            <div
                              className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-card rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm"
                              style={matchSectionMinHeightStyle}
                            >
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
                            <div className="animate-in fade-in duration-150" style={matchSectionMinHeightStyle}>
                                {['regular', 'postseason', 'koreanseries'].map(tab => {
                                    const currentGames = tab === 'regular' ? regularSeasonGames
                                        : tab === 'postseason' ? postSeasonGames
                                            : koreanSeriesGames;

                                    return (
                                        <TabsContent key={tab} value={tab} className="mt-0">
                                            {currentGames.length === 0 ? (
                                                <div
                                                    className="text-center py-16 flex items-center justify-center text-gray-500 dark:text-gray-300"
                                                    style={matchSectionMinHeightStyle}
                                                >
                                                    경기가 없는 날입니다.
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
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
                                        <div
                                          className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm"
                                          style={matchSectionMinHeightStyle}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-0 items-stretch">
                                                {Array.from({ length: loadingMatchCardCount }, (_, index) => (
                                                    <ScheduledGameCardSkeleton key={`scheduled-skeleton-${index}`} />
                                                ))}
                                            </div>
                                        </div>
                                    ) : isScheduledError ? (
                                            <div
                                              className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-card rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm"
                                              style={matchSectionMinHeightStyle}
                                            >
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
                                        <div className="text-center py-16 flex items-center justify-center text-gray-500 dark:text-gray-300" style={matchSectionMinHeightStyle}>
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
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
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
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
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
                </div>

                <AdSlot
                    slotId="home_mid_1"
                    pageType="home"
                    contentId={formatDateForAPI(selectedDate)}
                    creativeType="sponsor_card"
                    minHeight={164}
                />

                {/* Main Content & Sidebar Grid (Widgets & Rankings) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
                    {/* Left Content Area (Widgets) */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        {/* New Dashboard Widgets: Mate & Cheer Previews */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-0">
                            {/* Hot Cheer Posts Preview Section */}
                            <section className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                                        <Flame className="w-5 h-5 text-red-500" />
                                        실시간 인기 응원글
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/cheer')} className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/40">
                                        더보기 <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Card className="p-4 bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 shadow-sm h-[260px] overflow-hidden relative">
                                    {isHotCheerLoading ? (
                                        <div className="space-y-4 flex flex-col justify-center h-full">
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                        </div>
                                    ) : hotCheerPosts.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400">
                                            인기 응원글이 없습니다.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800/60">
                                            {hotCheerPosts.map(post => (
                                                <button
                                                    key={post.id}
                                                    onClick={() => navigate(`/cheer?postId=${post.id}`)}
                                                    className="text-left w-full px-2.5 py-2.5 rounded-md transition-colors group hover:bg-zinc-100 dark:hover:bg-zinc-800/45"
                                                >
                                                    <div className="flex gap-3">
                                                        <TeamLogo team={post.team} size={26} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-[11px] text-zinc-700 dark:text-zinc-500 font-medium">{post.author || '익명'}</span>
                                                                    <p className="text-sm text-gray-900 dark:text-zinc-100 font-medium leading-snug mt-0.5 line-clamp-2">
                                                                        {post.content}
                                                                    </p>
                                                                </div>
                                                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 shrink-0">{formatTimeAgo(post.createdAt)}</span>
                                                            </div>
                                                            <div className="flex gap-2.5 mt-1.5">
                                                                <span className="text-[10px] font-semibold text-rose-300 flex items-center gap-1.5"><Flame className="w-3 h-3 text-rose-400" /> {post.likeCount}</span>
                                                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"><MessageSquare className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> {post.commentCount}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            </section>

                            {/* Mate Preview Section */}
                            <section className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                                        <Users className="w-5 h-5 text-blue-500" />
                                        직관 메이트 찾기
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/mate')} className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/40">
                                        더보기 <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Card className="p-4 bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 shadow-sm h-[260px] overflow-hidden relative">
                                    {isFeaturedMatesLoading ? (
                                        <div className="space-y-4 flex flex-col justify-center h-full">
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                        </div>
                                    ) : featuredMates.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400">
                                            모집 중인 팟이 없습니다.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800/60">
                                            {featuredMates.map(mate => {
                                                const gameDate = new Date(`${mate.gameDate}T12:00:00`);
                                                const gameDateLabel = Number.isNaN(gameDate.getTime())
                                                    ? mate.gameDate
                                                    : gameDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
                                                const ticketLabel = mate.ticketPrice == null
                                                    ? '가격 협의'
                                                    : mate.ticketPrice === 0
                                                        ? '무료'
                                                        : `${mate.ticketPrice.toLocaleString()}원`;
                                                const homeTeamLabel = getMateTeamDisplayName(mate.homeTeam);
                                                const awayTeamLabel = getMateTeamDisplayName(mate.awayTeam);

                                                return (
                                                    <button
                                                        key={mate.id}
                                                        onClick={() => navigate(`/mate/${mate.id}`)}
                                                        className="text-left w-full px-2 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/35 last:pb-0 overflow-hidden"
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                        <p className="text-[9px] font-medium text-zinc-500 dark:text-zinc-500">
                                                            {gameDateLabel} {mate.gameTime}
                                                        </p>
                                                            <p className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 text-[10px] leading-none text-zinc-500 dark:text-zinc-400">
                                                                모집 <span className="ml-1 font-bold text-zinc-900 dark:text-zinc-100">{mate.currentParticipants || 0}/{mate.maxParticipants}명</span>
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                                                            {homeTeamLabel} vs {awayTeamLabel}
                                                        </p>
                                                        <p className={`inline-flex w-fit items-baseline rounded-full px-1.5 py-0.75 text-[11px] sm:text-xs font-black ring-1 ${mate.ticketPrice == null || mate.ticketPrice === undefined
                                                            ? 'text-zinc-700 dark:text-zinc-200 ring-zinc-200 dark:ring-zinc-600 bg-zinc-100/90 dark:bg-zinc-800/90'
                                                            : mate.ticketPrice === 0
                                                                ? 'text-emerald-700 dark:text-emerald-200 bg-gradient-to-r from-emerald-100/70 to-emerald-100/45 dark:from-emerald-500/15 dark:to-emerald-500/20 ring-emerald-300/70 dark:ring-emerald-400/35'
                                                                : 'text-amber-800 dark:text-amber-100 bg-gradient-to-r from-amber-100/80 to-amber-100/55 dark:from-amber-500/20 dark:to-amber-500/15 ring-amber-300/70 dark:ring-amber-400/35'
                                                        }`}>
                                                            {mate.ticketPrice == null || mate.ticketPrice === undefined ? '협의' : ticketLabel}
                                                        </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>
                            </section>
                        </div>
                    </div>

                    {/* Right Sidebar (Rankings) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                            <section className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2.5">
                                    <Trophy className="w-5 h-5 text-[#2ecc71]" />
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">팀 순위</h2>
                                </div>
                                <div className="flex items-center bg-slate-100 dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 rounded-full p-0.5 shadow-sm">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => loadRankingsData(rankingSeasonYear - 1)}
                                        className="h-7 w-7 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800/60"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-sm font-bold w-12 text-center text-zinc-900 dark:text-zinc-200">
                                        {rankingSeasonYear}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => loadRankingsData(rankingSeasonYear + 1)}
                                        disabled={rankingSeasonYear >= new Date().getFullYear()}
                                        className="h-7 w-7 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800/60 disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <Card className="overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121316] rounded-2xl">
                                {isRankingsLoading ? (
                                    <div className="p-8 space-y-4">
                                        <Skeleton className="h-12 w-full bg-zinc-200 dark:bg-zinc-800/50 rounded-lg" />
                                        <Skeleton className="h-12 w-full bg-zinc-200 dark:bg-zinc-800/50 rounded-lg" />
                                        <Skeleton className="h-12 w-full bg-zinc-200 dark:bg-zinc-800/50 rounded-lg" />
                                    </div>
                                ) : rankingsError ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-4">
                                            팀 순위를 불러오는 중 문제가 발생했습니다.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const seasonYear = resolveRankingSeasonYear(selectedDate, leagueStartDates);
                                                loadRankingsData(seasonYear);
                                            }}
                                            className="border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white bg-transparent"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            다시 시도
                                        </Button>
                                    </div>
                                ) : displayableRankings.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                                        <p className="text-zinc-900 dark:text-zinc-200 font-medium mb-2">
                                            {rankingDataVisibilityMessage}
                                        </p>
                                        <p className="text-zinc-500 dark:text-zinc-500 text-sm">
                                            {rankingStatusHintMessage}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        {displayableRankings.map(team => {
                                            const isTopThree = team.rank <= 3;
                                                return (
                                                    <div
                                                        key={team.teamId}
                                                        className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-2 border-b border-zinc-200/80 dark:border-zinc-800/80 last:border-b-0 hover:bg-slate-100 dark:hover:bg-zinc-800/40 transition-colors ${isTopThree ? 'border-l border-l-[#2ecc71]/40' : ''}`}
                                                    >
                                                    <div className="min-w-0 flex items-center gap-1.5 sm:gap-2">
                                                        <span className={`w-5 text-center text-[13px] sm:text-sm font-black flex-shrink-0 ${isTopThree ? 'text-[#2ecc71]' : 'text-zinc-500 dark:text-zinc-500'}`}>
                                                            {team.rank}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <div className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-white rounded-full p-1.25 shadow-sm flex-shrink-0">
                                                                <TeamLogo team={team.displayName} teamId={team.teamId} size={28} className="object-contain" />
                                                            </div>
                                                            <span className="font-bold text-sm sm:text-base leading-tight min-w-0 truncate text-gray-900 dark:text-zinc-100">
                                                                {team.displayName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 flex items-center gap-2 sm:gap-3 whitespace-nowrap text-right">
                                                        <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base leading-none tracking-tight tabular-nums">
                                                            {team.winRate}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap tabular-nums">
                                                            <span className="text-zinc-900 dark:text-zinc-200">{team.wins}승</span>
                                                            <span className="text-zinc-500 dark:text-zinc-300">·</span>
                                                            <span className="text-zinc-700 dark:text-zinc-300">{team.draws}무</span>
                                                            <span className="text-zinc-500 dark:text-zinc-300">·</span>
                                                            <span className="text-zinc-700 dark:text-zinc-300">{team.losses}패</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        </section>
                    </div >
                </div >

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
            </main >
        </div >
    );
}
