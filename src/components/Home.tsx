import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import TeamLogo from './TeamLogo';
import GameCard from './GameCard';
import ScheduledGameCard from './ScheduledGameCard';
import WelcomeGuide from './WelcomeGuide';
import AdSlot from './ads/AdSlot';
import {
    buildHomeLoadState,
    fetchHomeBootstrap,
    getHomeBootstrapQueryOptions,
    getHomeRankingSnapshotQueryOptions,
    getHomeWidgetsQueryOptions,
    HOME_WIDGETS_QUERY_KEY,
    shouldShowHomeConnectionError,
    type HomeCoreLoadSuccessState,
    type HomeLoadState,
} from '../api/home';
import { seedMatePartyQueryData } from '../hooks/mateQueryCache';
import {
    partitionScheduledGames,
    shouldAutoSwitchToScheduled,
    type LeagueTab,
} from '../utils/predictionHomeLogic';
import { cacheLeagueStartDates, formatDateForAPI, getFallbackLeagueStartDates } from '../utils/home';
import { buildDisplayableRankings, groupGamesBySourceDate, partitionGamesByLeague } from '../utils/homeDashboard';
import type { CheerPost } from '../api/cheerApi';
import type { FeaturedMateCard, Game, HomeProps, HomeRankingSnapshot, HomeWidgetsResponse, LeagueStartDates, Ranking } from '../types/home';
import { formatTimeAgo } from '../utils/time';
import { queryClient } from '../lib/queryClient';
import {
    getInitialRankingSeasonYear,
    resolveRankingSeasonYear,
    toLocalMiddayDate,
    formatHomeDate,
    formatSourceDateLabel,
} from '../utils/homeSeasonLogic';
import { getRankingDisplayName, getMateTeamDisplayName, resolveLeagueBadge } from '../utils/homeTeamNameResolution';
import { buildHomeRequestErrorContext, buildHomeNavigationState } from '../utils/homeErrorContext';
import type { HomeNavigationState } from '../utils/homeErrorContext';
import { buildMateRouteLocationState } from '../utils/mate';
import { GameCardSkeleton, ScheduledGameCardSkeleton } from './home/GameCardSkeleton';

// Types are imported from '../types/home'


// --- Initial Values ---


// --- Helpers ---
const GAME_CARD_MIN_HEIGHT = 'min-h-[240px]';
const GAME_CARD_MIN_HEIGHT_PX = 240;
const SCHEDULED_GAME_CARD_MIN_HEIGHT = 'h-[224px]';
const SCHEDULED_GAME_CARD_MIN_HEIGHT_PX = 224;
const MIN_LOADING_CARD_COUNT = 5;
const LOADING_CARD_COUNT_MAX = 9;
const HOME_DASHBOARD_TEAM_COUNT = 10;
const HOME_DASHBOARD_RANKING_DIVIDER_COUNT = HOME_DASHBOARD_TEAM_COUNT - 1;
// Desktop ranking/cheer/mate cards are aligned to 10 rows:
// 52px(row) * 10 + 9px(dividers) = 529px
const HOME_DASHBOARD_MOBILE_CARD_HEIGHT_PX = 260;
const HOME_DASHBOARD_RANKING_ROW_HEIGHT_PX = 52;
const HOME_DASHBOARD_CARD_DESKTOP_HEIGHT_PX =
    HOME_DASHBOARD_RANKING_ROW_HEIGHT_PX * HOME_DASHBOARD_TEAM_COUNT + HOME_DASHBOARD_RANKING_DIVIDER_COUNT;
// Tailwind JIT scans source as text — dynamic template literals won't be detected.
// Use static strings so the classes are generated correctly.
const HOME_DASHBOARD_MOBILE_CARD_HEIGHT_CLASS = "h-[260px]";
const HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS = "lg:h-[529px]";
const HOME_DASHBOARD_RANKING_ROW_CLASS = "lg:h-[52px] lg:min-h-[52px]";
const HOME_DASHBOARD_CARD_HEIGHT_CLASS = `${HOME_DASHBOARD_MOBILE_CARD_HEIGHT_CLASS} ${HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS}`;
const TEAM_RANKING_CARD_HEIGHT_CLASS = HOME_DASHBOARD_DESKTOP_CARD_HEIGHT_CLASS;
const HOME_BOOTSTRAP_LEGACY_FALLBACK_DELAY_MS = 3000;

interface HomeLoadSnapshot {
    leagueStartDates: LeagueStartDates;
    navigation: HomeNavigationState;
    games: Game[];
    scheduledGames: Game[];
    success: HomeCoreLoadSuccessState;
    loadState: HomeLoadState;
}



export default function Home({ onNavigate }: HomeProps) {
    const navigate = useNavigate();
    const fallbackLeagueStartDates = useMemo(() => getFallbackLeagueStartDates(), []);

    // State
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        return now;
    });
    const [showCalendar, setShowCalendar] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [leagueStartDates, setLeagueStartDates] = useState<LeagueStartDates | null>(fallbackLeagueStartDates);
    const [rankingSeasonYear, setRankingSeasonYear] = useState(() => getInitialRankingSeasonYear(
        selectedDate,
        fallbackLeagueStartDates,
    ));
    const [isOffSeason, setIsOffSeason] = useState(() => selectedDate.getFullYear() !== getInitialRankingSeasonYear(
        selectedDate,
        fallbackLeagueStartDates,
    ));
    const [rankingsError, setRankingsError] = useState(false);
    const [rankingSourceMessage, setRankingSourceMessage] = useState('');

    // Navigation State (Optimistic defaults: true)
    const [navInfo, setNavInfo] = useState<{ prev: string | null; next: string | null; hasPrev: boolean; hasNext: boolean }>({
        prev: null, next: null, hasPrev: true, hasNext: true
    });

    // New Data States
    const [hotCheerPosts, setHotCheerPosts] = useState<CheerPost[]>([]);
    const [isHotCheerLoading, setIsHotCheerLoading] = useState(true);
    const [hotCheerError, setHotCheerError] = useState<string | null>(null);
    const [featuredMates, setFeaturedMates] = useState<FeaturedMateCard[]>([]);
    const [isFeaturedMatesLoading, setIsFeaturedMatesLoading] = useState(true);
    const [featuredMatesError, setFeaturedMatesError] = useState<string | null>(null);

    // Loading States
    const [isLoading, setIsLoading] = useState(true);
    const [isGamesError, setIsGamesError] = useState(false);
    const [isRankingsLoading, setIsRankingsLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(false);

    const [activeLeagueTab, setActiveLeagueTab] = useState<LeagueTab>('regular');
    const [scheduledGames, setScheduledGames] = useState<Game[]>([]);
    const [isScheduledLoading, setIsScheduledLoading] = useState(false);
    const [isScheduledError, setIsScheduledError] = useState(false);
    const [isSecondarySectionExpanded, setIsSecondarySectionExpanded] = useState(false);
    const hasUserChangedTabRef = useRef(false);
    const bootstrapRequestIdRef = useRef(0);
    const lastBootstrapDateKeyRef = useRef<string | null>(null);
    const widgetsRequestIdRef = useRef(0);
    const rankingRequestIdRef = useRef(0);
    const lastWidgetsDateKeyRef = useRef<string | null>(null);
    const rankingSeasonOverrideRef = useRef<number | null>(null);
    const widgetsTimeoutRef = useRef<number | null>(null);
    const widgetsIdleCallbackRef = useRef<number | null>(null);
    const matchLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);
    const scheduledLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);

    // --- Helpers ---

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

    const applyDefaultLeagueTab = (gamesData: Game[]) => {
        if (gamesData.length === 0 || hasUserChangedTabRef.current) {
            return;
        }

        const firstGameType = gamesData[0].leagueType;
        if (firstGameType === 'REGULAR') setActiveLeagueTab('regular');
        else if (firstGameType === 'POSTSEASON') setActiveLeagueTab('postseason');
        else if (firstGameType === 'KOREAN_SERIES') setActiveLeagueTab('koreanseries');
    };

    const clearScheduledWidgetLoad = () => {
        if (widgetsIdleCallbackRef.current !== null && 'cancelIdleCallback' in window) {
            window.cancelIdleCallback(widgetsIdleCallbackRef.current);
            widgetsIdleCallbackRef.current = null;
        }
        if (widgetsTimeoutRef.current !== null) {
            window.clearTimeout(widgetsTimeoutRef.current);
            widgetsTimeoutRef.current = null;
        }
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
                ...PUBLIC_HOME_REQUEST_CONFIG,
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
    const loadLeagueStartDates = useCallback(async (): Promise<LeagueStartDates> => {
        const fallbackDates = getFallbackLeagueStartDates();

        try {
            const { data } = await api.get<LeagueStartDates>('/kbo/league-start-dates', {
                ...PUBLIC_HOME_REQUEST_CONFIG,
            });
            cacheLeagueStartDates(data);
            setLeagueStartDates(data);
            return data;
        } catch (error) {
            console.error('[System] Error loading league dates:', error);
            setLeagueStartDates(fallbackDates);
            return fallbackDates;
        }
    }, []);

    const loadGamesData = async (date: Date) => {
        const apiDate = formatDateForAPI(date);
        setIsLoading(true);
        setIsGamesError(false);
        matchLoadingCardCountRef.current = LOADING_CARD_COUNT_MAX;

        try {
            const { data: gamesData } = await api.get<Game[]>('/kbo/schedule', {
                params: { date: apiDate },
                ...PUBLIC_HOME_REQUEST_CONFIG,
            });
            setGames(gamesData);
            applyDefaultLeagueTab(gamesData);
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
            const responses = await Promise.allSettled(dates.map(async (targetDate) => {
                const apiDate = formatDateForAPI(targetDate);
                const { data: dailyGames } = await api.get<Game[]>('/kbo/schedule', {
                    params: { date: apiDate },
                    ...PUBLIC_HOME_REQUEST_CONFIG,
                });
                return dailyGames.map((game) => ({
                    ...game,
                    sourceDate: apiDate,
                    leagueBadge: resolveLeagueBadge(game.leagueType),
                }));
            }));

            if (requestId !== scheduledRequestIdRef.current) return;

            responses.forEach((result) => {
                if (result.status === 'rejected') {
                    console.error('[Scheduled] Error loading day schedule:', result.reason);
                }
            });

            const merged: Game[] = [];
            let fulfilledCount = 0;
            let hasAnyFailure = false;

            responses.forEach((result) => {
                if (result.status === 'fulfilled') {
                    fulfilledCount += 1;
                    merged.push(...result.value);
                    return;
                }

                hasAnyFailure = true;
            });

            merged.sort((a, b) => {
                    const dateCompare = (a.sourceDate || '').localeCompare(b.sourceDate || '');
                    if (dateCompare !== 0) return dateCompare;
                    const timeCompare = (a.time || '').localeCompare(b.time || '');
                    if (timeCompare !== 0) return timeCompare;
                    return a.gameId.localeCompare(b.gameId);
                });

            setScheduledGames(merged);
            setIsScheduledError(fulfilledCount === 0 && hasAnyFailure);
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

    const applyHomeSnapshot = useCallback((date: Date, snapshot: HomeLoadSnapshot) => {
        const normalizedScheduledGames = snapshot.scheduledGames.map((game) => ({
            ...game,
            sourceDate: game.sourceDate || game.gameDate || formatDateForAPI(date),
            leagueBadge: game.leagueBadge || resolveLeagueBadge(game.leagueType),
        }));

        cacheLeagueStartDates(snapshot.leagueStartDates);
        setLeagueStartDates(snapshot.leagueStartDates);
        setNavInfo(snapshot.navigation);
        setGames(snapshot.games);

        if (!hasUserChangedTabRef.current) {
            const { primary: upcomingScheduled } = partitionScheduledGames(normalizedScheduledGames);
            if (snapshot.games.length > 0) {
                const firstType = snapshot.games[0].leagueType;
                if (firstType === 'POSTSEASON') setActiveLeagueTab('postseason');
                else if (firstType === 'KOREAN_SERIES') setActiveLeagueTab('koreanseries');
                else setActiveLeagueTab('regular');
            } else if (upcomingScheduled.length > 0) {
                setActiveLeagueTab('scheduled');
            }
        }

        setScheduledGames(normalizedScheduledGames);
        const showConnectionError = shouldShowHomeConnectionError(snapshot.success);

        setIsLoading(false);
        setIsGamesError(!snapshot.success.games);
        setIsScheduledLoading(false);
        setIsScheduledError(!snapshot.success.scheduledGames);
        setConnectionError(showConnectionError);

        console.info('[HomeLoad]', {
            event: 'home_load_completed',
            selectedDate: formatDateForAPI(date),
            source: snapshot.loadState.source,
            isFallback: snapshot.loadState.isFallback,
            timedOut: snapshot.loadState.timedOut,
            success: snapshot.success,
        });

        if (showConnectionError) {
            console.warn('[HomeLoad]', {
                event: 'home_load_all_sections_failed',
                selectedDate: formatDateForAPI(date),
                source: snapshot.loadState.source,
                timedOut: snapshot.loadState.timedOut,
                success: snapshot.success,
            });
        }
    }, []);

    const buildBootstrapHomeSnapshot = (date: Date, timedOut: boolean, data: Awaited<ReturnType<typeof fetchHomeBootstrap>>): HomeLoadSnapshot => ({
        leagueStartDates: data.leagueStartDates,
        navigation: buildHomeNavigationState(data.navigation),
        games: data.games,
        scheduledGames: data.scheduledGamesWindow.map((game) => ({
            ...game,
            sourceDate: game.sourceDate || game.gameDate || formatDateForAPI(date),
            leagueBadge: game.leagueBadge || resolveLeagueBadge(game.leagueType),
        })),
        success: {
            leagueStartDates: true,
            navigation: true,
            games: true,
            scheduledGames: true,
        },
        loadState: buildHomeLoadState('bootstrap', { timedOut }),
    });

    const buildLegacyFailureSnapshot = (date: Date, timedOut: boolean): HomeLoadSnapshot => {
        const fallbackDates = leagueStartDates ?? fallbackLeagueStartDates;
        return {
            leagueStartDates: fallbackDates,
            navigation: {
                prev: null,
                next: null,
                hasPrev: true,
                hasNext: true,
            },
            games: [],
            scheduledGames: [],
            success: {
                leagueStartDates: false,
                navigation: false,
                games: false,
                scheduledGames: false,
            },
            loadState: buildHomeLoadState('legacy-fallback', { timedOut }),
        };
    };

    const requestLegacyLeagueStartDates = async (date: Date): Promise<HomeRequestResult<LeagueStartDates>> => {
        const fallbackDates = getFallbackLeagueStartDates();

        try {
            const { data } = await api.get<LeagueStartDates>('/kbo/league-start-dates', {
                ...PUBLIC_HOME_REQUEST_CONFIG,
            });
            cacheLeagueStartDates(data);
            return {
                data,
                succeeded: true,
            };
        } catch (error) {
            console.error(
                '[HomeLegacy] Error loading league dates:',
                buildHomeRequestErrorContext(error, '/kbo/league-start-dates', date),
                error,
            );
            return {
                data: fallbackDates,
                succeeded: false,
            };
        }
    };

    const requestLegacyNavigationData = async (date: Date): Promise<HomeRequestResult<HomeNavigationState>> => {
        const apiDate = formatDateForAPI(date);

        try {
            const { data } = await api.get<{
                prevGameDate?: string | null;
                nextGameDate?: string | null;
                hasPrev?: boolean;
                hasNext?: boolean;
            }>('/kbo/schedule/navigation', {
                params: { date: apiDate },
                ...PUBLIC_HOME_REQUEST_CONFIG,
            });

            return {
                data: buildHomeNavigationState(data),
                succeeded: true,
            };
        } catch (error) {
            console.error(
                '[HomeLegacy] Error loading schedule navigation:',
                buildHomeRequestErrorContext(error, '/kbo/schedule/navigation', date),
                error,
            );
            return {
                data: {
                    prev: null,
                    next: null,
                    hasPrev: true,
                    hasNext: true,
                },
                succeeded: false,
            };
        }
    };

    const requestLegacyGamesData = async (date: Date): Promise<HomeRequestResult<Game[]>> => {
        const apiDate = formatDateForAPI(date);

        try {
            const { data } = await api.get<Game[]>('/kbo/schedule', {
                params: { date: apiDate },
                ...PUBLIC_HOME_REQUEST_CONFIG,
            });

            return {
                data,
                succeeded: true,
            };
        } catch (error) {
            console.error(
                '[HomeLegacy] Error loading games:',
                buildHomeRequestErrorContext(error, '/kbo/schedule', date),
                error,
            );
            return {
                data: [],
                succeeded: false,
            };
        }
    };

    const requestLegacyScheduledGamesData = async (baseDate: Date): Promise<HomeRequestResult<Game[]>> => {
        try {
            const dates = getDateWindow(baseDate, 8);
            const responses = await Promise.allSettled(dates.map(async (targetDate) => {
                const apiDate = formatDateForAPI(targetDate);
                const { data: dailyGames } = await api.get<Game[]>('/kbo/schedule', {
                    params: { date: apiDate },
                    ...PUBLIC_HOME_REQUEST_CONFIG,
                });

                return dailyGames.map((game) => ({
                    ...game,
                    sourceDate: apiDate,
                    leagueBadge: resolveLeagueBadge(game.leagueType),
                }));
            }));

            const merged: Game[] = [];
            let fulfilledCount = 0;

            responses.forEach((result) => {
                if (result.status === 'fulfilled') {
                    fulfilledCount += 1;
                    merged.push(...result.value);
                    return;
                }

                console.error('[HomeLegacy] Error loading scheduled day:', result.reason);
            });

            merged.sort((left, right) => {
                const dateCompare = (left.sourceDate || '').localeCompare(right.sourceDate || '');
                if (dateCompare !== 0) return dateCompare;
                const timeCompare = (left.time || '').localeCompare(right.time || '');
                if (timeCompare !== 0) return timeCompare;
                return left.gameId.localeCompare(right.gameId);
            });

            return {
                data: merged,
                succeeded: fulfilledCount > 0,
            };
        } catch (error) {
            console.error(
                '[HomeLegacy] Error loading scheduled games window:',
                buildHomeRequestErrorContext(error, '/kbo/schedule-window', baseDate),
                error,
            );
            return {
                data: [],
                succeeded: false,
            };
        }
    };

    const loadLegacyHomeData = useCallback(async (
        date: Date,
        options: { timedOut?: boolean } = {},
    ): Promise<HomeLoadSnapshot> => {
        const [leagueStartDatesResult, navigationResult, gamesResult, scheduledResult] = await Promise.all([
            requestLegacyLeagueStartDates(date),
            requestLegacyNavigationData(date),
            requestLegacyGamesData(date),
            requestLegacyScheduledGamesData(date),
        ]);

        return {
            leagueStartDates: leagueStartDatesResult.data,
            navigation: navigationResult.data,
            games: gamesResult.data,
            scheduledGames: scheduledResult.data,
            success: {
                leagueStartDates: leagueStartDatesResult.succeeded,
                navigation: navigationResult.succeeded,
                games: gamesResult.succeeded,
                scheduledGames: scheduledResult.succeeded,
            },
            loadState: buildHomeLoadState('legacy-fallback', { timedOut: options.timedOut }),
        };
    }, []);

    const loadHomeBootstrap = useCallback(async (date: Date) => {
        const requestId = ++bootstrapRequestIdRef.current;
        let timedOut = false;
        let didResolve = false;
        let timeoutId: number | null = null;
        let legacyPromise: Promise<HomeLoadSnapshot> | null = null;

        const applySnapshotIfCurrent = (snapshot: HomeLoadSnapshot) => {
            if (requestId !== bootstrapRequestIdRef.current || didResolve) {
                return false;
            }

            didResolve = true;
            applyHomeSnapshot(date, snapshot);
            return true;
        };

        const startLegacyLoad = () => {
            if (legacyPromise) {
                return legacyPromise;
            }

            legacyPromise = loadLegacyHomeData(date, { timedOut })
                .catch((legacyError) => {
                    console.error('[HomeLegacy] Legacy fallback also failed:', legacyError);
                    return buildLegacyFailureSnapshot(date, timedOut);
                })
                .then((snapshot) => {
                    applySnapshotIfCurrent(snapshot);
                    return snapshot;
                });

            return legacyPromise;
        };

        setIsLoading(true);
        setIsGamesError(false);
        setIsScheduledLoading(true);
        setIsScheduledError(false);
        setConnectionError(false);
        matchLoadingCardCountRef.current = LOADING_CARD_COUNT_MAX;
        scheduledLoadingCardCountRef.current = LOADING_CARD_COUNT_MAX;

        timeoutId = window.setTimeout(() => {
            if (requestId !== bootstrapRequestIdRef.current || didResolve) {
                return;
            }

            timedOut = true;
            void startLegacyLoad();
        }, HOME_BOOTSTRAP_LEGACY_FALLBACK_DELAY_MS);

        try {
            const data = await fetchHomeBootstrap(date);
            applySnapshotIfCurrent(buildBootstrapHomeSnapshot(date, timedOut, data));
        } catch (error) {
            if (requestId !== bootstrapRequestIdRef.current) {
                return;
            }

            console.error(
                '[HomeBootstrap] Error loading bootstrap:',
                buildHomeRequestErrorContext(error, '/home/bootstrap', date),
                error,
            );
            await startLegacyLoad();
        } finally {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        }
    }, [applyHomeSnapshot, buildLegacyFailureSnapshot, loadLegacyHomeData]);

    const applyHomeRankingSnapshot = useCallback((rankingSnapshot: HomeRankingSnapshot) => {
        setRankingSeasonYear(rankingSnapshot.rankingSeasonYear);
        setRankingSourceMessage(rankingSnapshot.rankingSourceMessage);
        setIsOffSeason(rankingSnapshot.isOffSeason);
        setRankings(rankingSnapshot.rankings);
        setIsRankingsLoading(false);
        setRankingsError(false);
    }, []);

    const applyHomeWidgetsData = useCallback((date: Date, data: HomeWidgetsResponse, options: { includeRanking?: boolean } = {}) => {
        setHotCheerPosts(data.hotCheerPosts);
        setFeaturedMates(data.featuredMates);
        setHotCheerError(null);
        setFeaturedMatesError(null);
        setIsHotCheerLoading(false);
        setIsFeaturedMatesLoading(false);
        queryClient.setQueryData(
            getHomeRankingSnapshotQueryOptions(date, data.rankingSnapshot.rankingSeasonYear).queryKey,
            data.rankingSnapshot,
        );
        if (options.includeRanking !== false) {
            applyHomeRankingSnapshot(data.rankingSnapshot);
        }
    }, [applyHomeRankingSnapshot, queryClient]);

    const loadHomeWidgets = useCallback(async (date: Date) => {
        const requestId = ++widgetsRequestIdRef.current;
        const rankingRequestId = ++rankingRequestIdRef.current;
        const autoRankingSeasonYear = resolveRankingSeasonYear(date, leagueStartDates ?? fallbackLeagueStartDates);
        rankingSeasonOverrideRef.current = null;
        setIsHotCheerLoading(true);
        setHotCheerError(null);
        setIsFeaturedMatesLoading(true);
        setFeaturedMatesError(null);
        setRankingSeasonYear(autoRankingSeasonYear);
        setRankingSourceMessage('');
        setIsRankingsLoading(true);
        setRankingsError(false);

        try {
            const data = await queryClient.fetchQuery(getHomeWidgetsQueryOptions(date));
            if (requestId !== widgetsRequestIdRef.current) {
                return;
            }

            applyHomeWidgetsData(date, data, {
                includeRanking: rankingRequestId === rankingRequestIdRef.current,
            });
        } catch (err) {
            if (requestId !== widgetsRequestIdRef.current) {
                return;
            }

            console.error(
                '[HomeWidgets] Error loading widgets:',
                buildHomeRequestErrorContext(err, '/home/widgets', date),
                err,
            );
            setHotCheerPosts([]);
            setFeaturedMates([]);
            setHotCheerError('인기 응원글을 불러오지 못했습니다.');
            setFeaturedMatesError('직관 메이트 목록을 불러오지 못했습니다.');
            setIsHotCheerLoading(false);
            setIsFeaturedMatesLoading(false);
            if (rankingRequestId === rankingRequestIdRef.current) {
                setRankings([]);
                setRankingSourceMessage('순위 조회 중 문제가 발생했습니다.');
                setIsRankingsLoading(false);
                setRankingsError(true);
            }
        }
    }, [applyHomeWidgetsData, fallbackLeagueStartDates, leagueStartDates]);

    const loadRankingSnapshot = useCallback(async (date: Date, seasonYear: number) => {
        const requestId = ++rankingRequestIdRef.current;
        rankingSeasonOverrideRef.current = seasonYear;
        setRankingSeasonYear(seasonYear);
        setRankingSourceMessage('');
        setIsOffSeason(false);
        setIsRankingsLoading(true);
        setRankingsError(false);

        try {
            const data = await queryClient.fetchQuery(getHomeRankingSnapshotQueryOptions(date, seasonYear));
            if (requestId !== rankingRequestIdRef.current) {
                return;
            }

            applyHomeRankingSnapshot(data);
        } catch (err) {
            if (requestId !== rankingRequestIdRef.current) {
                return;
            }

            console.error(
                '[HomeWidgets] Error loading ranking snapshot:',
                buildHomeRequestErrorContext(err, `/home/widgets?seasonYear=${seasonYear}`, date),
                err,
            );
            setRankings([]);
            setRankingSourceMessage('순위 조회 중 문제가 발생했습니다.');
            setIsOffSeason(false);
            setIsRankingsLoading(false);
            setRankingsError(true);
        }
    }, [applyHomeRankingSnapshot]);

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

    const selectedDateKey = useMemo(() => formatDateForAPI(selectedDate), [selectedDate]);

    useEffect(() => {
        const dateKey = selectedDateKey;
        if (lastBootstrapDateKeyRef.current === dateKey) {
            return;
        }

        lastBootstrapDateKeyRef.current = dateKey;
        void loadHomeBootstrap(selectedDate);
    }, [loadHomeBootstrap, selectedDate, selectedDateKey]);

    useEffect(() => {
        clearScheduledWidgetLoad();
        const dateKey = selectedDateKey;
        setIsHotCheerLoading(true);
        setHotCheerError(null);
        setIsFeaturedMatesLoading(true);
        setFeaturedMatesError(null);
        setIsRankingsLoading(true);
        setRankingsError(false);
        rankingSeasonOverrideRef.current = null;

        const cachedWidgets = queryClient.getQueryData<HomeWidgetsResponse>(HOME_WIDGETS_QUERY_KEY(dateKey));
        if (cachedWidgets) {
            rankingRequestIdRef.current += 1;
            lastWidgetsDateKeyRef.current = dateKey;
            applyHomeWidgetsData(selectedDate, cachedWidgets);
            return clearScheduledWidgetLoad;
        }

        const run = () => {
            if (lastWidgetsDateKeyRef.current === dateKey) {
                return;
            }

            lastWidgetsDateKeyRef.current = dateKey;
            void loadHomeWidgets(selectedDate);
        };

        if ('requestIdleCallback' in window) {
            widgetsIdleCallbackRef.current = window.requestIdleCallback(run, { timeout: 1500 });
        } else {
            widgetsTimeoutRef.current = window.setTimeout(run, 800);
        }

        return clearScheduledWidgetLoad;
    }, [applyHomeWidgetsData, loadHomeWidgets, selectedDate, selectedDateKey]);

    const reloadCurrentRankingSnapshot = () => {
        const seasonYear = rankingSeasonOverrideRef.current;
        if (seasonYear == null) {
            void loadHomeWidgets(selectedDate);
            return;
        }

        void loadRankingSnapshot(selectedDate, seasonYear);
    };

    useEffect(() => {
        setIsSecondarySectionExpanded(false);
    }, [selectedDate]);
    const { regularSeasonGames, postSeasonGames, koreanSeriesGames } = useMemo(
        () => partitionGamesByLeague(games),
        [games],
    );
    const {
        primary: scheduledPrimaryGames,
        secondary: scheduledSecondaryGames,
        excluded: liveOrFinishedScheduledGames,
    } = useMemo(
        () => partitionScheduledGames(scheduledGames),
        [scheduledGames],
    );
    const scheduledPrimaryGamesBySourceDate = useMemo(
        () => groupGamesBySourceDate(scheduledPrimaryGames, selectedDateKey),
        [scheduledPrimaryGames, selectedDateKey],
    );
    const scheduledSecondaryGamesBySourceDate = useMemo(
        () => groupGamesBySourceDate(scheduledSecondaryGames, selectedDateKey),
        [scheduledSecondaryGames, selectedDateKey],
    );
    const displayableRankings = useMemo(
        () => buildDisplayableRankings(rankings, getRankingDisplayName),
        [rankings],
    );
    const displayedRankings = displayableRankings.slice(0, HOME_DASHBOARD_TEAM_COUNT);
    const rankingDataVisibilityMessage = displayableRankings.length === 0 && rankings.length > 0
        ? '순위 데이터에서 정규 팀이 아닌 항목이 감지되어 표시 가능한 팀 순위가 없습니다.'
        : (rankingSourceMessage || '현재 시즌의 팀 순위 집계 데이터가 없습니다.');
    const rankingStatusHintMessage = isOffSeason
        ? '현재는 비시즌이므로 이전 시즌 순위를 표시하고 있습니다.'
        : '현재 시즌이 시작된 상태입니다. 시즌 순위는 경기 결과 집계 후 표시됩니다.';
    const rankingPlaceholderRows = Math.max(0, HOME_DASHBOARD_TEAM_COUNT - displayedRankings.length);
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

            {connectionError && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                            서버 연결에 문제가 있습니다. 백엔드 서비스 상태를 확인해주세요.
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setConnectionError(false); void loadHomeBootstrap(selectedDate); }}
                            className="ml-auto shrink-0 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                        >
                            <RefreshCw className="w-4 h-4 mr-1" /> 재시도
                        </Button>
                    </div>
                </div>
            )}

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
                    <Button
                      data-testid="home-date-prev"
                      variant="ghost"
                      size="icon"
                      onClick={() => changeDate('prev')}
                      disabled={!navInfo.hasPrev}
                      aria-label="이전 날짜"
                      className="hover:text-primary hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-30"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>

                    <div className="flex flex-col items-center min-w-[140px]">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">
                            {formatHomeDate(selectedDate)}
                        </h2>
                        <Button variant="link" size="sm" onClick={() => setShowCalendar(true)} className="text-xs text-primary dark:text-emerald-400 h-auto p-0 font-bold hover:underline opacity-80 hover:opacity-100 transition-opacity">
                            <CalendarDays className="w-3 h-3 mr-1" /> 날짜 변경
                        </Button>
                    </div>

                    <Button
                      data-testid="home-date-next"
                      variant="ghost"
                      size="icon"
                      onClick={() => changeDate('next')}
                      disabled={!navInfo.hasNext}
                      aria-label="다음 날짜"
                      className="hover:text-primary hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-30"
                    >
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
                                        onClick={() => void loadHomeBootstrap(selectedDate)}
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
                                                onClick={() => void loadHomeBootstrap(selectedDate)}
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
                                                    {scheduledPrimaryGamesBySourceDate.map(([sourceDate, groupedGames]) => (
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
                                                        scheduledSecondaryGamesBySourceDate.map(([sourceDate, groupedGames]) => (
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
                    contentId={selectedDateKey}
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
                                <Card className={`p-4 bg-white dark:bg-card border border-zinc-200 dark:border-zinc-800 shadow-sm ${HOME_DASHBOARD_CARD_HEIGHT_CLASS} overflow-y-auto relative`}>
                                    {isHotCheerLoading ? (
                                        <div className="space-y-4 flex flex-col justify-center h-full">
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                        </div>
                                    ) : hotCheerError ? (
                                        <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400">
                                            <p className="font-medium text-zinc-700 dark:text-zinc-200">{hotCheerError}</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => void loadHomeWidgets(selectedDate)}
                                                className="mt-4"
                                            >
                                                <RefreshCw className="mr-1.5 h-4 w-4" />
                                                다시 시도
                                            </Button>
                                        </div>
                                    ) : hotCheerPosts.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400">
                                            인기 응원글이 없습니다.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800/60">
                                            {hotCheerPosts.map(post => (
                                                <button
                                                    type="button"
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
                                <Card className={`p-4 bg-white dark:bg-card border border-zinc-200 dark:border-zinc-800 shadow-sm ${HOME_DASHBOARD_CARD_HEIGHT_CLASS} overflow-y-auto relative`}>
                                    {isFeaturedMatesLoading ? (
                                        <div className="space-y-4 flex flex-col justify-center h-full">
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                            <Skeleton className="h-16 w-full bg-zinc-200 dark:bg-zinc-800/50" />
                                        </div>
                                    ) : featuredMatesError ? (
                                        <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400">
                                            <p className="font-medium text-zinc-700 dark:text-zinc-200">{featuredMatesError}</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => void loadHomeWidgets(selectedDate)}
                                                className="mt-4"
                                            >
                                                <RefreshCw className="mr-1.5 h-4 w-4" />
                                                다시 시도
                                            </Button>
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
                                                        type="button"
                                                        key={mate.id}
                                                        onClick={() => {
                                                            seedMatePartyQueryData(queryClient, mate);
                                                            navigate(`/mate/${mate.id}`, {
                                                                state: buildMateRouteLocationState(mate),
                                                            });
                                                        }}
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
                            <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Trophy className="w-5 h-5 text-[#2ecc71]" />
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">팀 순위</h2>
                                </div>
                                <div className="flex items-center bg-slate-100 dark:bg-card border border-zinc-200 dark:border-zinc-800 rounded-full p-0.5 shadow-sm">
                                    <Button
                                        aria-label={`${rankingSeasonYear - 1}시즌 팀 순위 보기`}
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => void loadRankingSnapshot(selectedDate, rankingSeasonYear - 1)}
                                        className="h-7 w-7 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800/60"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-sm font-bold w-12 text-center text-zinc-900 dark:text-zinc-200">
                                        {rankingSeasonYear}
                                    </span>
                                    <Button
                                        aria-label={`${rankingSeasonYear + 1}시즌 팀 순위 보기`}
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => void loadRankingSnapshot(selectedDate, rankingSeasonYear + 1)}
                                        disabled={rankingSeasonYear >= new Date().getFullYear()}
                                        className="h-7 w-7 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800/60 disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <Card className={`overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-card rounded-2xl ${TEAM_RANKING_CARD_HEIGHT_CLASS} lg:overflow-y-auto`}>
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
                                            onClick={reloadCurrentRankingSnapshot}
                                            className="border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white bg-transparent"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            다시 시도
                                        </Button>
                                    </div>
                                ) : displayedRankings.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                                        <p className="text-zinc-900 dark:text-zinc-200 font-medium mb-2">
                                            {rankingDataVisibilityMessage}
                                        </p>
                                        <p className="text-zinc-500 dark:text-zinc-500 text-sm">
                                            {rankingStatusHintMessage}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full">
                                        {displayedRankings.map(team => {
                                            const isTopThree = team.rank <= 3;
                                            const rowKey = team.teamId;
                                                return (
                                                    <div
                                                        key={rowKey}
                                                        className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 last:border-b-0 hover:bg-slate-100 dark:hover:bg-zinc-800/40 transition-colors ${HOME_DASHBOARD_RANKING_ROW_CLASS} ${isTopThree ? 'border-l border-l-[#2ecc71]/40' : ''}`}
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
                                                        {team.gamesBehind != null && (
                                                            <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 tabular-nums w-7 text-center">
                                                                {team.rank === 1 ? '-' : team.gamesBehind % 1 === 0 ? team.gamesBehind.toFixed(0) : team.gamesBehind.toFixed(1)}
                                                            </span>
                                                        )}
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
                                        {Array.from({ length: rankingPlaceholderRows }).map((_, index) => (
                                            <div
                                                key={`team-rank-placeholder-${index}`}
                                                className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 last:border-b-0 ${HOME_DASHBOARD_RANKING_ROW_CLASS} opacity-45`}
                                            >
                                                <div className="min-w-0 flex items-center gap-1.5 sm:gap-2">
                                                    <span className="w-5 text-center text-[13px] sm:text-sm font-black flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                                                        {displayedRankings.length + index + 1}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="w-9 h-9 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/80 rounded-full p-1.25 shadow-sm flex-shrink-0">
                                                            <span className="block h-2 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                                        </div>
                                                        <span className="block h-4 w-20 rounded bg-zinc-100 dark:bg-zinc-700/80" />
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-2 sm:gap-3 whitespace-nowrap text-right">
                                                    <span className="block h-4 w-12 rounded bg-zinc-100 dark:bg-zinc-700/70" />
                                                    <span className="flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-zinc-400 dark:text-zinc-500 whitespace-nowrap tabular-nums">
                                                        <span className="block h-4 w-8 rounded bg-zinc-100 dark:bg-zinc-700/70" />
                                                        <span className="block h-4 w-3 rounded bg-zinc-100 dark:bg-zinc-700/70" />
                                                        <span className="block h-4 w-8 rounded bg-zinc-100 dark:bg-zinc-700/70" />
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
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
