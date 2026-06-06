import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from './ui/button';
import {
    buildHomeLoadState,
    fetchHomeBootstrap,
    getHomeBootstrapQueryOptions,
    getHomeScopedNavigationQueryOptions,
    shouldShowHomeConnectionError,
    type HomeNavigationScope,
    type HomeLoadFailureReason,
    type HomeCoreLoadSuccessState,
    type HomeLoadState,
} from '../api/home';
import { fetchGameLiveSummaries } from '../api/prediction';
import {
    partitionScheduledGames,
    shouldAutoSwitchToScheduled,
    type LeagueTab,
} from '../utils/predictionHomeLogic';
import { buildPredictionMatchHandoff } from '../utils/predictionDeepLink';
import { cacheLeagueStartDates, formatDateForAPI, getFallbackLeagueStartDates } from '../utils/home';
import { groupGamesBySourceDate, partitionGamesByLeague } from '../utils/homeGameGrouping';
import {
    buildHomeRouteSearchParams,
    coerceHomeRouteTab,
    resolveHomeRouteState,
} from '../utils/homeRouteState';
import type { Game, HomeBootstrapLoadState, HomeProps, HomeScopedNavigationResponse, LeagueStartDates } from '../types/home';
import type { ManualBaseballDataRequest } from '../types/manualBaseballData';
import { queryClient } from '../lib/queryClient';
import {
    toLocalMiddayDate,
    formatHomeDate,
    isOffSeasonByDate,
} from '../utils/homeSeasonLogic';
import { resolveLeagueBadge } from '../utils/homeLeagueBadge';
import { buildHomeRequestErrorContext, buildHomeNavigationState } from '../utils/homeErrorContext';
import type { HomeNavigationState } from '../utils/homeErrorContext';
import {
    createHomeLiveSummaryTimeoutWarningState,
    LIVE_GAME_POLL_INTERVAL_MS,
    mergeHomeGamesWithLiveSummaries,
    recordHomeLiveSummaryTimeoutFailure,
    resetHomeLiveSummaryTimeoutWarningState,
    selectHomeLivePollingGameIds,
} from '../utils/liveGame';
import {
    isPublicApiTimeoutError,
    MANUAL_BASEBALL_DATA_REQUIRED_CODE,
    MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
} from '../utils/errorUtils';
import { GameCardSkeleton } from './home/GameCardSkeleton';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    FlameIcon,
    RefreshIcon,
    SpinnerIcon,
    WarningTriangleIcon,
} from './icons/PublicShellIcons';
import { isAdminRole, useAuthSession, useAuthProfileSnapshot } from '../store/authStore';
import AdSlot from './ads/AdSlot';

const homeMatchPanelModulePromise = import('./home/HomeMatchPanel');
const LazyHomeSecondaryPanels = lazy(() => import('./home/HomeSecondaryPanelsContainer'));
const LazyHomeMatchPanel = lazy(() => homeMatchPanelModulePromise);

const GAME_CARD_MIN_HEIGHT = 'min-h-[240px]';
const GAME_CARD_MIN_HEIGHT_PX = 240;
const MIN_LOADING_CARD_COUNT = 5;
const LOADING_CARD_COUNT_MAX = 9;
const HOME_BOOTSTRAP_SOFT_FALLBACK_DELAY_MS = 6000;
const HOME_BOOTSTRAP_CORE_SECTIONS = [
    'leagueStartDates',
    'navigation',
    'games',
    'scheduledGamesWindow',
] as const;
const HOME_LEAGUE_TABS: Array<{ value: LeagueTab; label: string }> = [
    { value: 'regular', label: '정규시즌' },
    { value: 'postseason', label: '포스트시즌' },
    { value: 'koreanseries', label: '한국시리즈' },
    { value: 'scheduled', label: '예정경기' },
];
const EMPTY_SCOPED_NAVIGATION: HomeScopedNavigationResponse = {
    resolvedDate: null,
    prevGameDate: null,
    nextGameDate: null,
    hasPrev: false,
    hasNext: false,
};

const getTodayMidday = () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
};

const getCalendarMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const normalizeSameSeasonNavigationDate = (value: string | null | undefined, seasonYear: number): string | null => {
    if (!value) {
        return null;
    }

    const parsedDate = toLocalMiddayDate(value);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.getFullYear() !== seasonYear) {
        return null;
    }

    return formatDateForAPI(parsedDate);
};

const isVisibleLeagueTab = (tabValue: LeagueTab, visibleLeagueTabs: typeof HOME_LEAGUE_TABS) => (
    visibleLeagueTabs.some((tab) => tab.value === tabValue)
);

const coerceVisibleLeagueTab = (tabValue: LeagueTab, visibleLeagueTabs: typeof HOME_LEAGUE_TABS): LeagueTab => (
    isVisibleLeagueTab(tabValue, visibleLeagueTabs) ? tabValue : 'regular'
);

const normalizeHomeBootstrapSectionList = (sections: string[] | null | undefined): string[] => (
    HOME_BOOTSTRAP_CORE_SECTIONS.filter((section) => sections?.includes(section))
);

const buildBootstrapSuccessState = (backendLoadState?: HomeBootstrapLoadState): HomeCoreLoadSuccessState => {
    const failedSections = new Set([
        ...normalizeHomeBootstrapSectionList(backendLoadState?.failedSections),
        ...normalizeHomeBootstrapSectionList(backendLoadState?.timedOutSections),
    ]);

    return {
        leagueStartDates: !failedSections.has('leagueStartDates'),
        navigation: !failedSections.has('navigation'),
        games: !failedSections.has('games'),
        scheduledGames: !failedSections.has('scheduledGamesWindow'),
    };
};

const buildBootstrapLoadState = (
    clientTimedOut: boolean,
    backendLoadState?: HomeBootstrapLoadState,
): HomeLoadState => {
    const timedOutSections = normalizeHomeBootstrapSectionList(backendLoadState?.timedOutSections);
    const failedSections = normalizeHomeBootstrapSectionList(backendLoadState?.failedSections);

    return buildHomeLoadState('bootstrap', {
        isFallback: backendLoadState?.isFallback === true || failedSections.length > 0,
        timedOut: clientTimedOut || backendLoadState?.timedOut === true || timedOutSections.length > 0,
        timedOutSections,
        failedSections,
    });
};

const isHomeBootstrapSectionTimedOut = (
    loadState: HomeLoadState,
    section: (typeof HOME_BOOTSTRAP_CORE_SECTIONS)[number],
): boolean => loadState.timedOutSections.includes(section);

const isSameOrAfterDateKey = (date: Date, startDateKey: string | null | undefined): boolean => {
    if (!startDateKey) {
        return false;
    }

    const startDate = toLocalMiddayDate(startDateKey);
    if (Number.isNaN(startDate.getTime())) {
        return false;
    }

    return formatDateForAPI(date) >= formatDateForAPI(startDate);
};

const normalizeComparableDateKey = (dateKey: string | null | undefined): string | null => {
    if (!dateKey) {
        return null;
    }

    const parsedDate = toLocalMiddayDate(dateKey);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return formatDateForAPI(parsedDate);
};

const hasValidPostseasonStart = (leagueStartDates: LeagueStartDates | null): boolean => {
    const regularStart = normalizeComparableDateKey(leagueStartDates?.regularSeasonStart);
    const postseasonStart = normalizeComparableDateKey(leagueStartDates?.postseasonStart);

    return Boolean(regularStart && postseasonStart && postseasonStart > regularStart);
};

const hasValidKoreanSeriesStart = (leagueStartDates: LeagueStartDates | null): boolean => {
    const regularStart = normalizeComparableDateKey(leagueStartDates?.regularSeasonStart);
    const postseasonStart = normalizeComparableDateKey(leagueStartDates?.postseasonStart);
    const koreanSeriesStart = normalizeComparableDateKey(leagueStartDates?.koreanSeriesStart);

    if (!regularStart || !koreanSeriesStart || koreanSeriesStart <= regularStart) {
        return false;
    }

    return !postseasonStart || koreanSeriesStart >= postseasonStart;
};

const buildVisibleLeagueTabs = (today: Date, leagueStartDates: LeagueStartDates | null) => (
    HOME_LEAGUE_TABS.filter((tab) => {
        if (tab.value === 'regular' || tab.value === 'scheduled') {
            return true;
        }
        if (tab.value === 'postseason') {
            return hasValidPostseasonStart(leagueStartDates)
                && isSameOrAfterDateKey(today, leagueStartDates?.postseasonStart);
        }
        if (tab.value === 'koreanseries') {
            return hasValidKoreanSeriesStart(leagueStartDates)
                && isSameOrAfterDateKey(today, leagueStartDates?.koreanSeriesStart);
        }
        return false;
    })
);

const resolveAutomaticLeagueTab = (
    games: Game[],
    scheduledGames: Game[],
    visibleLeagueTabs: typeof HOME_LEAGUE_TABS,
): LeagueTab | null => {
    if (games.length > 0) {
        const firstType = games[0].leagueType;
        if (firstType === 'POSTSEASON') return coerceVisibleLeagueTab('postseason', visibleLeagueTabs);
        if (firstType === 'KOREAN_SERIES') return coerceVisibleLeagueTab('koreanseries', visibleLeagueTabs);
        return 'regular';
    }

    const { primary: upcomingScheduled } = partitionScheduledGames(scheduledGames);
    if (upcomingScheduled.length > 0) {
        return 'scheduled';
    }

    return null;
};

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
    const [searchParams, setSearchParams] = useSearchParams();
    const { userId: authUserId, userRole } = useAuthProfileSnapshot();
    const { isLoggedIn } = useAuthSession();
    const isAdmin = isAdminRole(userRole);
    const fallbackLeagueStartDates = useMemo(() => getFallbackLeagueStartDates(), []);
    const calendarDialogTitleId = useId();
    const initialHomeRouteStateRef = useRef<ReturnType<typeof resolveHomeRouteState> | null>(null);
    if (initialHomeRouteStateRef.current === null) {
        initialHomeRouteStateRef.current = resolveHomeRouteState(searchParams, getTodayMidday());
    }
    const initialHomeRouteState = initialHomeRouteStateRef.current;

    const [selectedDate, setSelectedDate] = useState(() => initialHomeRouteState.date);
    const [calendarMonth, setCalendarMonth] = useState(() => getCalendarMonth(initialHomeRouteState.date));
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
    const [loadFailureReason, setLoadFailureReason] = useState<HomeLoadFailureReason | null>(null);
    const [manualDataRequest, setManualDataRequest] = useState<ManualBaseballDataRequest | null>(null);

    const [activeLeagueTab, setActiveLeagueTab] = useState<LeagueTab>(() => initialHomeRouteState.tab);
    const [scheduledGames, setScheduledGames] = useState<Game[]>([]);
    const [isScheduledLoading, setIsScheduledLoading] = useState(false);
    const [isScheduledError, setIsScheduledError] = useState(false);
    const [isSecondarySectionExpanded, setIsSecondarySectionExpanded] = useState(false);
    const [, setScopedNavInfo] = useState<HomeScopedNavigationResponse>(EMPTY_SCOPED_NAVIGATION);
    const [isScopedNavigationLoading, setIsScopedNavigationLoading] = useState(false);
    const hasUserChangedTabRef = useRef(initialHomeRouteState.hasExplicitTab);
    const shouldSyncHomeRouteQueryRef = useRef(initialHomeRouteState.hasRouteQuery);
    const searchParamsRef = useRef(searchParams);
    const bootstrapRequestIdRef = useRef(0);
    const scopedNavigationRequestIdRef = useRef(0);
    const lastBootstrapDateKeyRef = useRef<string | null>(null);
    const homeLiveSummaryInFlightRef = useRef(false);
    const homeLiveSummaryAbortRef = useRef<AbortController | null>(null);
    const homeLiveSummaryTimeoutWarningRef = useRef(createHomeLiveSummaryTimeoutWarningState());
    const lastObservedHomeRouteSearchRef = useRef(searchParams.toString());
    const pendingHomeRouteSearchRef = useRef<string | null>(null);
    const secondaryPanelsTimeoutRef = useRef<number | null>(null);
    const secondaryPanelsIdleCallbackRef = useRef<number | null>(null);
    const matchLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);
    const scheduledLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);
    const [shouldMountSecondaryPanels, setShouldMountSecondaryPanels] = useState(false);

    const clampLoadingCount = (value: number) => (
        Math.max(MIN_LOADING_CARD_COUNT, Math.min(LOADING_CARD_COUNT_MAX, value))
    );

    useEffect(() => {
        const searchString = searchParams.toString();
        const previousSearchString = lastObservedHomeRouteSearchRef.current;
        const pendingSearchString = pendingHomeRouteSearchRef.current;

        if (pendingSearchString && searchString !== pendingSearchString) {
            return;
        }

        searchParamsRef.current = searchParams;

        if (pendingSearchString === searchString) {
            pendingHomeRouteSearchRef.current = null;
        }

        lastObservedHomeRouteSearchRef.current = searchString;
        const routeState = resolveHomeRouteState(searchParams, getTodayMidday());
        if (routeState.hasRouteQuery) {
            shouldSyncHomeRouteQueryRef.current = true;
            hasUserChangedTabRef.current = routeState.hasExplicitTab;
            const routeDateKey = formatDateForAPI(routeState.date);
            if (routeDateKey !== formatDateForAPI(selectedDate)) {
                setSelectedDate(routeState.date);
            }
            if (routeState.tab !== activeLeagueTab) {
                setActiveLeagueTab(routeState.tab);
            }
            return;
        }

        const previousRouteState = previousSearchString
            ? resolveHomeRouteState(new URLSearchParams(previousSearchString), getTodayMidday())
            : null;
        if (!previousRouteState?.hasRouteQuery) {
            return;
        }

        shouldSyncHomeRouteQueryRef.current = false;
        hasUserChangedTabRef.current = false;
        const today = getTodayMidday();
        if (formatDateForAPI(today) !== formatDateForAPI(selectedDate)) {
            setSelectedDate(today);
        }
        if (activeLeagueTab !== 'regular') {
            setActiveLeagueTab('regular');
        }
    }, [activeLeagueTab, searchParams, selectedDate]);

    const replaceHomeRouteState = useCallback((nextDate: Date, nextTab: LeagueTab) => {
        shouldSyncHomeRouteQueryRef.current = true;
        const nextSearchParams = buildHomeRouteSearchParams({
            searchParams: searchParamsRef.current,
            date: nextDate,
            tab: nextTab,
        });
        if (nextSearchParams.toString() === searchParamsRef.current.toString()) {
            return;
        }

        pendingHomeRouteSearchRef.current = nextSearchParams.toString();
        searchParamsRef.current = nextSearchParams;
        setSearchParams(nextSearchParams, { replace: true });
    }, [setSearchParams]);

    const handleGameCardSelectPrediction = (game: Game) => {
        const handoff = buildPredictionMatchHandoff({
            sourcePage: 'home',
            game,
            fallbackDate: formatDateForAPI(selectedDate),
        });

        navigate(handoff.path, {
            state: handoff.state,
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

    const loadScopedNavigation = useCallback(async (
        scope: HomeNavigationScope,
        anchorDate: Date,
        options: { applyResolvedDate?: boolean } = {},
    ) => {
        const requestId = ++scopedNavigationRequestIdRef.current;
        setIsScopedNavigationLoading(true);

        try {
            const navigation = await queryClient.fetchQuery(
                getHomeScopedNavigationQueryOptions(anchorDate, scope, anchorDate.getFullYear()),
            );
            if (requestId !== scopedNavigationRequestIdRef.current) {
                return;
            }

            setScopedNavInfo(navigation);
            if (options.applyResolvedDate && navigation.resolvedDate) {
                const resolvedDate = toLocalMiddayDate(navigation.resolvedDate);
                if (!Number.isNaN(resolvedDate.getTime())) {
                    setSelectedDate(resolvedDate);
                    replaceHomeRouteState(resolvedDate, scope);
                }
            }
        } catch {
            if (requestId === scopedNavigationRequestIdRef.current) {
                setScopedNavInfo(EMPTY_SCOPED_NAVIGATION);
            }
        } finally {
            if (requestId === scopedNavigationRequestIdRef.current) {
                setIsScopedNavigationLoading(false);
            }
        }
    }, [replaceHomeRouteState]);

    const changeDate = (direction: 'prev' | 'next') => {
        const targetDateKey = normalizeSameSeasonNavigationDate(
            direction === 'prev' ? navInfo.prev : navInfo.next,
            selectedDate.getFullYear(),
        );
        if (!targetDateKey) {
            return;
        }

        const targetDate = toLocalMiddayDate(targetDateKey);
        if (Number.isNaN(targetDate.getTime())) {
            return;
        }

        hasUserChangedTabRef.current = true;
        setSelectedDate(targetDate);
        replaceHomeRouteState(targetDate, activeLeagueTab);
    };

    const applyHomeSnapshot = useCallback((date: Date, snapshot: HomeLoadSnapshot) => {
        const normalizedGames = snapshot.games.map((game) => ({
            ...game,
            sourceDate: game.sourceDate || game.gameDate || formatDateForAPI(date),
        }));
        const normalizedScheduledGames = snapshot.scheduledGames.map((game) => ({
            ...game,
            sourceDate: game.sourceDate || game.gameDate || formatDateForAPI(date),
            leagueBadge: game.leagueBadge || resolveLeagueBadge(game.leagueType),
        }));

        cacheLeagueStartDates(snapshot.leagueStartDates);
        setLeagueStartDates(snapshot.leagueStartDates);
        setNavInfo(snapshot.navigation);
        setGames(normalizedGames);

        if (!hasUserChangedTabRef.current) {
            const automaticTab = resolveAutomaticLeagueTab(
                normalizedGames,
                normalizedScheduledGames,
                buildVisibleLeagueTabs(getTodayMidday(), snapshot.leagueStartDates),
            );
            if (automaticTab) {
                setActiveLeagueTab(automaticTab);
            }
        }

        setScheduledGames(normalizedScheduledGames);
        const showConnectionError = shouldShowHomeConnectionError(snapshot.success);

        setIsLoading(false);
        setIsGamesError(!snapshot.success.games && !isHomeBootstrapSectionTimedOut(snapshot.loadState, 'games'));
        setIsScheduledLoading(false);
        setIsScheduledError(!snapshot.success.scheduledGames && !isHomeBootstrapSectionTimedOut(snapshot.loadState, 'scheduledGamesWindow'));
        setConnectionError(showConnectionError);
        setLoadFailureReason(snapshot.loadState.failureReason);
        setManualDataRequest(snapshot.loadState.manualDataRequest);

        const homeLoadLogContext = {
            selectedDate: formatDateForAPI(date),
            source: snapshot.loadState.source,
            isFallback: snapshot.loadState.isFallback,
            timedOut: snapshot.loadState.timedOut,
            timedOutSections: snapshot.loadState.timedOutSections,
            failedSections: snapshot.loadState.failedSections,
            failureReason: snapshot.loadState.failureReason,
            success: snapshot.success,
        };

        console.info('[HomeLoad]', {
            event: 'home_load_completed',
            ...homeLoadLogContext,
        });

        if (showConnectionError) {
            console.warn('[HomeLoad]', {
                event: snapshot.loadState.failureReason === 'manual-data-required'
                    ? 'home_load_manual_data_required'
                    : 'home_load_all_sections_failed',
                ...homeLoadLogContext,
                manualDataRequest: snapshot.loadState.manualDataRequest,
            });
        }
    }, []);

    const buildBootstrapHomeSnapshot = (date: Date, timedOut: boolean, data: Awaited<ReturnType<typeof fetchHomeBootstrap>>): HomeLoadSnapshot => {
        const loadState = buildBootstrapLoadState(timedOut, data.loadState);

        return {
            leagueStartDates: data.leagueStartDates,
            navigation: buildHomeNavigationState(data.navigation),
            games: data.games,
            scheduledGames: data.scheduledGamesWindow.map((game) => ({
                ...game,
                sourceDate: game.sourceDate || game.gameDate || formatDateForAPI(date),
                leagueBadge: game.leagueBadge || resolveLeagueBadge(game.leagueType),
            })),
            success: buildBootstrapSuccessState(data.loadState),
            loadState,
        };
    };

    const buildLegacyFailureSnapshot = (
        date: Date,
        timedOut: boolean,
        failureReason: HomeLoadFailureReason,
        manualDataRequest?: ManualBaseballDataRequest | null,
    ): HomeLoadSnapshot => {
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
            loadState: buildHomeLoadState('legacy-fallback', {
                timedOut,
                timedOutSections: timedOut ? [...HOME_BOOTSTRAP_CORE_SECTIONS] : [],
                failedSections: [...HOME_BOOTSTRAP_CORE_SECTIONS],
                failureReason,
                manualDataRequest,
            }),
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
        setLoadFailureReason(null);
        setManualDataRequest(null);
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
            applyTransientSnapshotIfCurrent(buildLegacyFailureSnapshot(date, timedOut, 'request-failed'));
        }, HOME_BOOTSTRAP_SOFT_FALLBACK_DELAY_MS);

        try {
            const data = await queryClient.fetchQuery(getHomeBootstrapQueryOptions(date));
            applySnapshotIfCurrent(buildBootstrapHomeSnapshot(date, timedOut, data));
        } catch (error) {
            if (requestId !== bootstrapRequestIdRef.current) {
                return;
            }

            const errorContext = buildHomeRequestErrorContext(error, '/home/bootstrap', date);
            if (errorContext.responseCode === MANUAL_BASEBALL_DATA_REQUIRED_CODE || errorContext.status === 409) {
                console.warn('[HomeBootstrap] Business conflict while loading bootstrap:', errorContext);
            } else {
                console.error('[HomeBootstrap] Error loading bootstrap:', errorContext, error);
            }
            const cachedSnapshot = getCachedBootstrapSnapshot(date, timedOut);
            if (cachedSnapshot) {
                applySnapshotIfCurrent(cachedSnapshot);
                return;
            }
            applySnapshotIfCurrent(buildLegacyFailureSnapshot(
                date,
                timedOut,
                errorContext.responseCode === MANUAL_BASEBALL_DATA_REQUIRED_CODE || errorContext.status === 409
                    ? 'manual-data-required'
                    : 'request-failed',
                errorContext.manualDataRequest,
            ));
        } finally {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        }
    }, [applyHomeSnapshot, buildLegacyFailureSnapshot, getCachedBootstrapSnapshot, leagueStartDates, fallbackLeagueStartDates]);

    const handleTabChange = (tabValue: LeagueTab) => {
        if (!isVisibleLeagueTab(tabValue, visibleLeagueTabs)) {
            return;
        }

        hasUserChangedTabRef.current = true;
        setActiveLeagueTab(tabValue);
        replaceHomeRouteState(selectedDate, tabValue);

        const today = getTodayMidday();
        void loadScopedNavigation(tabValue, today, { applyResolvedDate: true });
    };

    const selectedDateKey = useMemo(() => formatDateForAPI(selectedDate), [selectedDate]);
    const homeLivePollingGameIds = useMemo(
        () => selectHomeLivePollingGameIds(games, scheduledGames, selectedDateKey),
        [games, scheduledGames, selectedDateKey],
    );
    const homeLivePollingKey = homeLivePollingGameIds.join(',');
    const visibleLeagueTabs = useMemo(
        () => buildVisibleLeagueTabs(getTodayMidday(), leagueStartDates),
        [leagueStartDates],
    );
    const dateNavigation = useMemo(() => {
        const seasonYear = selectedDate.getFullYear();
        const prev = normalizeSameSeasonNavigationDate(navInfo.prev, seasonYear);
        const next = normalizeSameSeasonNavigationDate(navInfo.next, seasonYear);

        return {
            prev,
            next,
            hasPrev: Boolean(prev),
            hasNext: Boolean(next),
        };
    }, [navInfo.next, navInfo.prev, selectedDate]);
    const activeTabIsScheduled = activeLeagueTab === 'scheduled';
    const showConnectionRecoveryBanner = connectionError
        && (loadFailureReason !== 'manual-data-required' || isAdmin);
    const visibleLeagueTabGridClass = visibleLeagueTabs.length >= 4
        ? 'grid-cols-4'
        : visibleLeagueTabs.length === 3
            ? 'grid-cols-3'
            : 'grid-cols-2';
    const isTodayOffSeason = useMemo(() => {
        return isOffSeasonByDate(getTodayMidday(), leagueStartDates);
    }, [leagueStartDates]);

    const handleNavigateToTodayPrediction = () => {
        const today = getTodayMidday();
        const todayDateKey = formatDateForAPI(today);

        navigate(`/prediction?date=${todayDateKey}`, {
            state: {
                sourcePage: 'home',
                date: todayDateKey,
            },
        });
    };

    useEffect(() => {
        const dateKey = selectedDateKey;
        if (lastBootstrapDateKeyRef.current === dateKey) {
            return;
        }

        lastBootstrapDateKeyRef.current = dateKey;
        void loadHomeBootstrap(selectedDate);
    }, [loadHomeBootstrap, selectedDate, selectedDateKey]);

    useEffect(() => {
        const coercedTab = coerceHomeRouteTab(activeLeagueTab, visibleLeagueTabs);
        if (coercedTab === activeLeagueTab) {
            return;
        }

        setActiveLeagueTab(coercedTab);
        if (shouldSyncHomeRouteQueryRef.current) {
            replaceHomeRouteState(selectedDate, coercedTab);
        }
    }, [activeLeagueTab, replaceHomeRouteState, selectedDate, visibleLeagueTabs]);

    useEffect(() => {
        if (!shouldSyncHomeRouteQueryRef.current) {
            return;
        }

        const coercedTab = coerceHomeRouteTab(activeLeagueTab, visibleLeagueTabs);
        if (coercedTab !== activeLeagueTab) {
            return;
        }

        replaceHomeRouteState(selectedDate, activeLeagueTab);
    }, [activeLeagueTab, replaceHomeRouteState, selectedDate, visibleLeagueTabs]);

    useEffect(() => {
        if (!homeLivePollingKey) {
            return;
        }
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }

        const gameIds = homeLivePollingKey.split(',').filter(Boolean);
        resetHomeLiveSummaryTimeoutWarningState(homeLiveSummaryTimeoutWarningRef.current);
        let disposed = false;

        const refreshLiveSummaries = async () => {
            if (disposed || document.visibilityState === 'hidden' || homeLiveSummaryInFlightRef.current) {
                return;
            }

            const abortController = new AbortController();
            homeLiveSummaryInFlightRef.current = true;
            homeLiveSummaryAbortRef.current = abortController;

            try {
                const summaries = await fetchGameLiveSummaries(gameIds, { signal: abortController.signal });
                resetHomeLiveSummaryTimeoutWarningState(homeLiveSummaryTimeoutWarningRef.current);
                if (disposed || abortController.signal.aborted || summaries.length === 0) {
                    return;
                }
                setGames((prev) => mergeHomeGamesWithLiveSummaries(prev, summaries));
                setScheduledGames((prev) => mergeHomeGamesWithLiveSummaries(prev, summaries));
            } catch (error) {
                if (!abortController.signal.aborted) {
                    if (isPublicApiTimeoutError(error)) {
                        if (recordHomeLiveSummaryTimeoutFailure(homeLiveSummaryTimeoutWarningRef.current)) {
                            console.warn('[HomeLivePolling] Failed to refresh live summaries:', error);
                        }
                        return;
                    }
                    console.warn('[HomeLivePolling] Failed to refresh live summaries:', error);
                }
            } finally {
                if (homeLiveSummaryAbortRef.current === abortController) {
                    homeLiveSummaryAbortRef.current = null;
                }
                homeLiveSummaryInFlightRef.current = false;
            }
        };

        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'hidden') {
                homeLiveSummaryAbortRef.current?.abort();
                return;
            }
            void refreshLiveSummaries();
        };

        void refreshLiveSummaries();
        const intervalId = window.setInterval(() => {
            void refreshLiveSummaries();
        }, LIVE_GAME_POLL_INTERVAL_MS);

        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);

        return () => {
            disposed = true;
            homeLiveSummaryAbortRef.current?.abort();
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
        };
    }, [homeLivePollingKey]);

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
            secondaryPanelsTimeoutRef.current = globalThis.setTimeout(mountPanels, 1000) as unknown as number;
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
    const displayedHomeDate = selectedDate;
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

    const activeStandardGames = activeLeagueTab === 'postseason'
        ? postSeasonGames
        : activeLeagueTab === 'koreanseries'
            ? koreanSeriesGames
            : regularSeasonGames;
    const activeCardHeight = GAME_CARD_MIN_HEIGHT_PX;
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
    const matchPanelFallback = activeTabIsScheduled ? (
        <div
            className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm"
            style={matchSectionMinHeightStyle}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-0 items-stretch">
                {Array.from({ length: loadingMatchCardCount }, (_, index) => (
                    <GameCardSkeleton key={`lazy-scheduled-skeleton-${index}`} />
                ))}
            </div>
        </div>
    ) : (
        <div
            className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm"
            style={matchSectionMinHeightStyle}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-0 items-stretch">
                {Array.from({ length: loadingMatchCardCount }, (_, index) => <GameCardSkeleton key={`lazy-game-${index}`} />)}
            </div>
        </div>
    );

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
                <SpinnerIcon className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-300 pb-20">
            {showConnectionRecoveryBanner && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <div
                        data-testid="home-global-recovery"
                        className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm dark:border-amber-700/50 dark:bg-amber-950/40 sm:flex-row sm:items-center"
                    >
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                                <WarningTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[16px] text-amber-900 dark:text-amber-200 font-black">
                                    {loadFailureReason === 'manual-data-required'
                                        ? '운영자 데이터가 필요합니다'
                                        : '서비스 연결을 확인하지 못했습니다'}
                                </p>
                                <p className="mt-1 text-[16px] text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                                    {loadFailureReason === 'manual-data-required'
                                        ? MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE
                                        : '경기, 예정 경기, 홈 위젯을 한 번에 다시 불러올 수 있습니다.'}
                                </p>
                                {loadFailureReason === 'manual-data-required' && (
                                    <div className="mt-3 space-y-2">
                                        {manualDataRequest?.operatorMessage && (
                                            <p className="rounded-xl border border-amber-300 bg-white/70 px-3 py-2 text-[13px] font-bold leading-relaxed text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-100">
                                                {manualDataRequest.operatorMessage}
                                            </p>
                                        )}
                                        {manualDataRequest?.missingItems?.length ? (
                                            <div className="flex flex-wrap gap-2">
                                                {manualDataRequest.missingItems.slice(0, 4).map((item) => (
                                                    <span
                                                        key={`${item.key}:${item.label}`}
                                                        className="rounded-full border border-amber-300 bg-white/70 px-2 py-1 text-xs font-black text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-200"
                                                    >
                                                        {item.label}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                        <p className="inline-flex rounded-md border border-amber-300 bg-white/70 px-2 py-1 font-mono text-xs font-black text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-200">
                                            {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="touch"
                            onClick={() => { setConnectionError(false); setManualDataRequest(null); void loadHomeBootstrap(selectedDate); }}
                            className="w-full shrink-0 border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-900/40 sm:ml-auto sm:w-auto"
                        >
                            <RefreshIcon className="w-4 h-4 mr-1" /> 전체 다시 시도
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
                        <p className="text-gray-500 dark:text-gray-300 font-bold pl-4">
                            {selectedDate.getFullYear()} 시즌 경기 일정 및 순위
                        </p>
                    </div>
                    <div>
                        {isTodayOffSeason ? (
                            <Button
                                data-testid="home-offseason-cta"
                                variant="outline"
                                size="touch"
                                onClick={() => navigate('/offseason')}
                                className="border-emerald-600/20 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                            >
                                <FlameIcon className="w-4 h-4 mr-2 text-orange-500" /> 스토브리그
                            </Button>
                        ) : (
                            <Button
                                data-testid="home-primary-prediction-cta"
                                size="touch"
                                onClick={handleNavigateToTodayPrediction}
                                className="whitespace-nowrap rounded-xl bg-primary font-black text-primary-foreground hover:bg-primary-hover"
                            >
                                오늘 경기 예측하기
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100 dark:border-white/15 dark:bg-card/70 sm:flex-row sm:items-center sm:justify-center sm:px-6 md:w-fit md:mx-auto">
                  <div className="flex items-center justify-center gap-4 sm:gap-6">
                    <Button
                      data-testid="home-date-prev"
                      variant="ghost"
                      size="iconTouch"
                      onClick={() => changeDate('prev')}
                      disabled={isLoading || isScopedNavigationLoading || !dateNavigation.hasPrev}
                      aria-label="이전 날짜"
                      className="hover:text-primary hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-30"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </Button>

                    <div className="flex flex-col items-center min-w-[140px]">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">
                            {formatHomeDate(displayedHomeDate)}
                        </h2>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                                setCalendarMonth(getCalendarMonth(selectedDate));
                                setShouldMountSecondaryPanels(true);
                                setShowCalendar(true);
                            }}
                            className="text-[16px] text-primary dark:text-emerald-400 min-h-11 px-2 py-0 font-bold hover:underline opacity-80 hover:opacity-100 transition-opacity"
                        >
                            날짜 변경
                        </Button>
                    </div>

                    <Button
                      data-testid="home-date-next"
                      variant="ghost"
                      size="iconTouch"
                      onClick={() => changeDate('next')}
                      disabled={isLoading || isScopedNavigationLoading || !dateNavigation.hasNext}
                      aria-label="다음 날짜"
                      className="hover:text-primary hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-30"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-3">
                    <div className="w-full">
                        <div className="flex justify-center mb-6">
                            <div
                                role="tablist"
                                aria-label="경기 구분 선택"
                                className={`grid w-full max-w-xl ${visibleLeagueTabGridClass} bg-gray-100 dark:bg-card p-1 rounded-xl mx-auto`}
                            >
                                {visibleLeagueTabs.map((tab) => {
                                    const isActive = activeLeagueTab === tab.value;
                                    return (
                                        <button
                                            key={tab.value}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            aria-controls={`home-tabpanel-${tab.value}`}
                                            id={`home-tab-${tab.value}`}
                                            className={`min-h-11 rounded-lg px-2 py-2 text-[16px] font-bold transition-all ${
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
                            <Suspense fallback={matchPanelFallback}>
                                <LazyHomeMatchPanel
                                    activeLeagueTab={activeLeagueTab}
                                    isLoading={isLoading}
                                    isGamesError={isGamesError}
                                    loadFailureReason={loadFailureReason}
                                    isScheduledLoading={isScheduledLoading}
                                    isScheduledError={isScheduledError}
                                    suppressRecoveryActions={showConnectionRecoveryBanner}
                                    isSecondarySectionExpanded={isSecondarySectionExpanded}
                                    loadingMatchCardCount={loadingMatchCardCount}
                                    matchSectionMinHeightStyle={matchSectionMinHeightStyle}
                                    activeStandardGames={activeStandardGames}
                                    scheduledPrimaryGames={scheduledPrimaryGames}
                                    scheduledSecondaryGames={scheduledSecondaryGames}
                                    liveOrFinishedScheduledGames={liveOrFinishedScheduledGames}
                                    scheduledPrimaryGamesBySourceDate={scheduledPrimaryGamesBySourceDate}
                                    scheduledSecondaryGamesBySourceDate={scheduledSecondaryGamesBySourceDate}
                                    onRetry={() => void loadHomeBootstrap(selectedDate)}
                                    onSelectPrediction={handleGameCardSelectPrediction}
                                    onToggleSecondarySection={() => setIsSecondarySectionExpanded(prev => !prev)}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>

                <AdSlot
                    slotId="home_mid_1"
                    pageType="home"
                    contentId={selectedDateKey}
                    loggedIn={isLoggedIn}
                    userId={authUserId ? String(authUserId) : null}
                />

                {shouldMountSecondaryPanels ? (
                    <Suspense fallback={null}>
                        <LazyHomeSecondaryPanels
                            selectedDate={selectedDate}
                            selectedDateKey={selectedDateKey}
                            calendarMonth={calendarMonth}
                            showCalendar={showCalendar}
                            shouldMountWelcomeGuide={shouldMountWelcomeGuide}
                            calendarDialogTitleId={calendarDialogTitleId}
                            loggedIn={isLoggedIn}
                            userId={authUserId ? String(authUserId) : null}
                            suppressRecoveryActions={showConnectionRecoveryBanner}
                            onNavigateToCheer={() => navigate('/cheer')}
                            onNavigateToMate={() => navigate('/mate')}
                            onNavigateToCheerPost={(postId) => navigate(`/cheer?postId=${postId}`)}
                            onSelectFeaturedMate={(mate) => navigate(`/mate/${mate.id}`, {
                                state: { partySeed: mate },
                            })}
                            onCloseCalendar={() => setShowCalendar(false)}
                            onCalendarMonthChange={setCalendarMonth}
                            onSelectCalendarDate={(nextDate) => {
                                hasUserChangedTabRef.current = true;
                                setSelectedDate(nextDate);
                                setCalendarMonth(getCalendarMonth(nextDate));
                                replaceHomeRouteState(nextDate, activeLeagueTab);
                                setShowCalendar(false);
                            }}
                        />
                    </Suspense>
                ) : null}
            </main>
        </div>
    );
}
