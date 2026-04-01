import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight,
    Loader2, Flame, AlertTriangle, RefreshCw, Clock3, ChevronDown
} from 'lucide-react';

import { Button } from './ui/button';
import GameCard from './GameCard';
import ScheduledGameCard from './ScheduledGameCard';
import {
    buildHomeLoadState,
    fetchHomeBootstrap,
    getHomeBootstrapQueryOptions,
    shouldShowHomeConnectionError,
    type HomeCoreLoadSuccessState,
    type HomeLoadState,
} from '../api/home';
import {
    partitionScheduledGames,
    shouldAutoSwitchToScheduled,
    type LeagueTab,
} from '../utils/predictionHomeLogic';
import { cacheLeagueStartDates, formatDateForAPI, getFallbackLeagueStartDates } from '../utils/home';
import { groupGamesBySourceDate, partitionGamesByLeague } from '../utils/homeDashboard';
import type { Game, HomeProps, LeagueStartDates } from '../types/home';
import { queryClient } from '../lib/queryClient';
import {
    toLocalMiddayDate,
    formatHomeDate,
    formatSourceDateLabel,
} from '../utils/homeSeasonLogic';
import { resolveLeagueBadge } from '../utils/homeTeamNameResolution';
import { buildHomeRequestErrorContext, buildHomeNavigationState } from '../utils/homeErrorContext';
import type { HomeNavigationState } from '../utils/homeErrorContext';
import { buildMateRouteLocationState } from '../utils/mate';
import { GameCardSkeleton, ScheduledGameCardSkeleton } from './home/GameCardSkeleton';
import { useAuthSession, useAuthProfileSnapshot } from '../store/authStore';

const LazyHomeSecondaryPanels = lazy(() => import('./home/HomeSecondaryPanelsContainer'));

const GAME_CARD_MIN_HEIGHT = 'min-h-[240px]';
const GAME_CARD_MIN_HEIGHT_PX = 240;
const SCHEDULED_GAME_CARD_MIN_HEIGHT = 'h-[224px]';
const SCHEDULED_GAME_CARD_MIN_HEIGHT_PX = 224;
const MIN_LOADING_CARD_COUNT = 5;
const LOADING_CARD_COUNT_MAX = 9;
const HOME_BOOTSTRAP_LEGACY_FALLBACK_DELAY_MS = 3000;
const HOME_LEAGUE_TABS: Array<{ value: LeagueTab; label: string }> = [
    { value: 'regular', label: '정규시즌' },
    { value: 'postseason', label: '포스트시즌' },
    { value: 'koreanseries', label: '한국시리즈' },
    { value: 'scheduled', label: '예정경기' },
];
interface HomeLoadSnapshot {
    leagueStartDates: LeagueStartDates;
    navigation: HomeNavigationState;
    games: Game[];
    scheduledGames: Game[];
    success: HomeCoreLoadSuccessState;
    loadState: HomeLoadState;
}

export default function HomeRuntime({ onNavigate }: HomeProps) {
    const navigate = useNavigate();
    const { userId: authUserId } = useAuthProfileSnapshot();
    const { isLoggedIn } = useAuthSession();
    const fallbackLeagueStartDates = useMemo(() => getFallbackLeagueStartDates(), []);
    const calendarDialogTitleId = useId();

    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        return now;
    });
    const [showCalendar, setShowCalendar] = useState(false);
    const [shouldMountWelcomeGuide, setShouldMountWelcomeGuide] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [leagueStartDates, setLeagueStartDates] = useState<LeagueStartDates | null>(fallbackLeagueStartDates);

    const [navInfo, setNavInfo] = useState<{ prev: string | null; next: string | null; hasPrev: boolean; hasNext: boolean }>({
        prev: null, next: null, hasPrev: true, hasNext: true
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isGamesError, setIsGamesError] = useState(false);
    const [connectionError, setConnectionError] = useState(false);

    const [activeLeagueTab, setActiveLeagueTab] = useState<LeagueTab>('regular');
    const [scheduledGames, setScheduledGames] = useState<Game[]>([]);
    const [isScheduledLoading, setIsScheduledLoading] = useState(false);
    const [isScheduledError, setIsScheduledError] = useState(false);
    const [isSecondarySectionExpanded, setIsSecondarySectionExpanded] = useState(false);
    const hasUserChangedTabRef = useRef(false);
    const bootstrapRequestIdRef = useRef(0);
    const lastBootstrapDateKeyRef = useRef<string | null>(null);
    const secondaryPanelsTimeoutRef = useRef<number | null>(null);
    const secondaryPanelsIdleCallbackRef = useRef<number | null>(null);
    const matchLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);
    const scheduledLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);
    const [shouldMountSecondaryPanels, setShouldMountSecondaryPanels] = useState(false);

    const clampLoadingCount = (value: number) => (
        Math.max(MIN_LOADING_CARD_COUNT, Math.min(LOADING_CARD_COUNT_MAX, value))
    );

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

    const clearSecondaryPanelMount = useCallback(() => {
        if (secondaryPanelsIdleCallbackRef.current !== null && 'cancelIdleCallback' in window) {
            window.cancelIdleCallback(secondaryPanelsIdleCallbackRef.current);
            secondaryPanelsIdleCallbackRef.current = null;
        }
        if (secondaryPanelsTimeoutRef.current !== null) {
            window.clearTimeout(secondaryPanelsTimeoutRef.current);
            secondaryPanelsTimeoutRef.current = null;
        }
    }, []);

    const changeDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setHours(12, 0, 0, 0);

        if (direction === 'prev') {
            if (navInfo.prev) {
                setSelectedDate(toLocalMiddayDate(navInfo.prev));
            } else {
                newDate.setDate(newDate.getDate() - 1);
                newDate.setHours(12, 0, 0, 0);
                setSelectedDate(newDate);
            }
        } else if (direction === 'next') {
            if (navInfo.next) {
                setSelectedDate(toLocalMiddayDate(navInfo.next));
            } else {
                newDate.setDate(newDate.getDate() + 1);
                newDate.setHours(12, 0, 0, 0);
                setSelectedDate(newDate);
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

    const getCachedBootstrapSnapshot = useCallback((date: Date, timedOut: boolean): HomeLoadSnapshot | null => {
        const cachedBootstrap = queryClient.getQueryData<Awaited<ReturnType<typeof fetchHomeBootstrap>>>(
            getHomeBootstrapQueryOptions(date).queryKey,
        );

        if (!cachedBootstrap) {
            return null;
        }

        return buildBootstrapHomeSnapshot(date, timedOut, cachedBootstrap);
    }, []);

    const loadHomeBootstrap = useCallback(async (date: Date) => {
        const requestId = ++bootstrapRequestIdRef.current;
        let timedOut = false;
        let didResolve = false;
        let timeoutId: number | null = null;

        const applyTransientSnapshotIfCurrent = (snapshot: HomeLoadSnapshot) => {
            if (requestId !== bootstrapRequestIdRef.current) {
                return false;
            }

            applyHomeSnapshot(date, snapshot);
            return true;
        };

        const applySnapshotIfCurrent = (snapshot: HomeLoadSnapshot) => {
            if (requestId !== bootstrapRequestIdRef.current || didResolve) {
                return false;
            }

            didResolve = true;
            applyHomeSnapshot(date, snapshot);
            return true;
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
            const cachedSnapshot = getCachedBootstrapSnapshot(date, timedOut);
            if (cachedSnapshot) {
                applyTransientSnapshotIfCurrent(cachedSnapshot);
                return;
            }
            applyTransientSnapshotIfCurrent(buildLegacyFailureSnapshot(date, timedOut));
        }, HOME_BOOTSTRAP_LEGACY_FALLBACK_DELAY_MS);

        try {
            const data = await queryClient.fetchQuery(getHomeBootstrapQueryOptions(date));
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
            const cachedSnapshot = getCachedBootstrapSnapshot(date, timedOut);
            if (cachedSnapshot) {
                applySnapshotIfCurrent(cachedSnapshot);
                return;
            }
            applySnapshotIfCurrent(buildLegacyFailureSnapshot(date, timedOut));
        } finally {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        }
    }, [applyHomeSnapshot, buildLegacyFailureSnapshot, getCachedBootstrapSnapshot, leagueStartDates, fallbackLeagueStartDates]);

    const handleTabChange = (tabValue: LeagueTab) => {
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
        setIsSecondarySectionExpanded(false);
    }, [selectedDate]);

    useEffect(() => {
        if (shouldMountSecondaryPanels) {
            return clearSecondaryPanelMount;
        }

        const mountPanels = () => {
            setShouldMountSecondaryPanels(true);
            clearSecondaryPanelMount();
        };

        if ('requestIdleCallback' in window) {
            secondaryPanelsIdleCallbackRef.current = window.requestIdleCallback(mountPanels, { timeout: 1800 });
        } else {
            secondaryPanelsTimeoutRef.current = window.setTimeout(mountPanels, 1000);
        }

        return clearSecondaryPanelMount;
    }, [clearSecondaryPanelMount, shouldMountSecondaryPanels]);

    useEffect(() => {
        if (showCalendar || shouldMountWelcomeGuide) {
            clearSecondaryPanelMount();
            setShouldMountSecondaryPanels(true);
        }
    }, [clearSecondaryPanelMount, shouldMountWelcomeGuide, showCalendar]);

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
    const activeStandardGames = activeLeagueTab === 'postseason'
        ? postSeasonGames
        : activeLeagueTab === 'koreanseries'
            ? koreanSeriesGames
            : regularSeasonGames;
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
    const matchPanelContent = (() => {
        if (isLoading) {
            return (
                <div
                  className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm"
                  style={matchSectionMinHeightStyle}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-0 items-stretch">
                        {Array.from({ length: loadingMatchCardCount }, (_, index) => <GameCardSkeleton key={`loading-game-${index}`} />)}
                    </div>
                </div>
            );
        }

        if (isGamesError) {
            return (
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
            );
        }

        if (activeTabIsScheduled) {
            if (isScheduledLoading) {
                return (
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
                );
            }

            if (isScheduledError) {
                return (
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
                );
            }

            if (scheduledPrimaryGames.length === 0 && scheduledSecondaryGames.length === 0) {
                return (
                    <div className="text-center py-16 flex items-center justify-center text-gray-500 dark:text-gray-300" style={matchSectionMinHeightStyle}>
                        선택한 날짜부터 7일 내 예정 경기가 없습니다.
                    </div>
                );
            }

            return (
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
            );
        }

        if (activeStandardGames.length === 0) {
            return (
                <div
                    className="text-center py-16 flex items-center justify-center text-gray-500 dark:text-gray-300"
                    style={matchSectionMinHeightStyle}
                >
                    경기가 없는 날입니다.
                </div>
            );
        }

        return (
            <div className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {activeStandardGames.map((game, index) => (
                        <GameCard
                            key={`${game.gameId}-${index}`}
                            game={game}
                            onSelectPrediction={() => handleGameCardSelectPrediction(game)}
                        />
                    ))}
                </div>
            </div>
        );
    })();

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

    useEffect(() => {
        const dontShowAgain = localStorage.getItem('bega_dont_show_guide');
        const hasVisited = localStorage.getItem('bega_has_visited');

        if (!dontShowAgain && !hasVisited) {
            setShouldMountWelcomeGuide(true);
        }
    }, []);

    useEffect(() => {
        if (!showCalendar) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowCalendar(false);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleEscape);
        };
    }, [showCalendar]);

    if (!leagueStartDates) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-300 pb-20">
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6 border-gray-100 dark:border-border">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-1.5 h-8 bg-primary rounded-full" />
                            <h1 className="text-3xl font-black tracking-tight text-primary dark:text-emerald-400">
                                KBO LEAGUE
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-300 font-medium pl-4">
                            {selectedDate.getFullYear()} 시즌 경기 일정 및 순위
                        </p>
                    </div>
                    <div>
                        <Button variant="outline" onClick={() => navigate('/offseason')} className="border-emerald-600/20 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-900/20">
                            <Flame className="w-4 h-4 mr-2 text-orange-500" /> 스토브리그
                        </Button>
                    </div>
                </div>

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
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                                setShouldMountSecondaryPanels(true);
                                setShowCalendar(true);
                            }}
                            className="text-xs text-primary dark:text-emerald-400 h-auto p-0 font-bold hover:underline opacity-80 hover:opacity-100 transition-opacity"
                        >
                            날짜 변경
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

                <div className="flex flex-col gap-3 mt-3">
                    <div className="w-full">
                        <div className="flex justify-center mb-6">
                            <div
                                role="tablist"
                                aria-label="경기 구분 선택"
                                className="grid w-full max-w-xl grid-cols-4 bg-gray-100 dark:bg-card p-1 rounded-xl mx-auto"
                            >
                                {HOME_LEAGUE_TABS.map((tab) => {
                                    const isActive = activeLeagueTab === tab.value;
                                    return (
                                        <button
                                            key={tab.value}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            aria-controls={`home-tabpanel-${tab.value}`}
                                            id={`home-tab-${tab.value}`}
                                            className={`rounded-lg px-2 py-2 text-sm font-medium transition-all ${
                                                isActive
                                                    ? 'bg-primary text-white shadow-md'
                                                    : 'text-foreground dark:text-muted-foreground'
                                            }`}
                                            onClick={() => handleTabChange(tab.value)}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div
                            id={`home-tabpanel-${activeLeagueTab}`}
                            role="tabpanel"
                            aria-labelledby={`home-tab-${activeLeagueTab}`}
                            className="animate-in fade-in duration-150"
                            style={matchSectionMinHeightStyle}
                        >
                            {matchPanelContent}
                        </div>
                    </div>
                </div>

                {shouldMountSecondaryPanels ? (
                    <Suspense fallback={null}>
                        <LazyHomeSecondaryPanels
                            selectedDate={selectedDate}
                            selectedDateKey={selectedDateKey}
                            showCalendar={showCalendar}
                            shouldMountWelcomeGuide={shouldMountWelcomeGuide}
                            calendarDialogTitleId={calendarDialogTitleId}
                            loggedIn={isLoggedIn}
                            userId={authUserId ? String(authUserId) : null}
                            onNavigateToCheer={() => navigate('/cheer')}
                            onNavigateToMate={() => navigate('/mate')}
                            onNavigateToCheerPost={(postId) => navigate(`/cheer?postId=${postId}`)}
                            onSelectFeaturedMate={(mate) => navigate(`/mate/${mate.id}`, {
                                state: buildMateRouteLocationState(mate),
                            })}
                            onCloseCalendar={() => setShowCalendar(false)}
                            onSelectCalendarDate={(nextDate) => {
                                setSelectedDate(nextDate);
                                setShowCalendar(false);
                            }}
                        />
                    </Suspense>
                ) : null}
            </main>
        </div>
    );
}
