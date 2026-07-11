import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
    buildHomeLoadState,
    fetchHomeBootstrap,
    fetchHomeScopedNavigation,
    shouldRetryHomeBootstrapQuery,
    shouldShowHomeConnectionError,
    type HomeNavigationScope,
    type HomeLoadFailureReason,
    type HomeCoreLoadSuccessState,
    type HomeLoadState,
} from '../api/homeCore';
import {
    hasPrimaryScheduledGame,
    partitionScheduledGames,
    shouldAutoSwitchToScheduled,
    type LeagueTab,
} from '../utils/homeScheduleClassification';
import { cacheLeagueStartDates, formatDateForAPI, getFallbackLeagueStartDates } from '../utils/home';
import { groupGamesBySourceDate, summarizeHomeLeagueGames } from '../utils/homeGameGrouping';
import {
    buildHomeRouteSearchParams,
    coerceHomeRouteTab,
    resolveHomeRouteState,
} from '../utils/homeRouteState';
import type { Game, HomeBootstrapLoadState, HomeScopedNavigationResponse, LeagueStartDates } from '../types/home';
import type { ManualBaseballDataRequest } from '../types/manualBaseballData';
import {
    toLocalMiddayDate,
    formatHomeDate,
    isOffSeasonByDate,
} from '../utils/homeSeasonLogic';
import { resolveLeagueBadge } from '../utils/homeLeagueBadge';
import { buildHomeRequestErrorContext, buildHomeNavigationState } from '../utils/homeErrorContext';
import type { HomeNavigationState } from '../utils/homeErrorContext';
import type { HomeAuthSnapshot } from './home/HomeAuthBridge';
import {
    MANUAL_BASEBALL_DATA_REQUIRED_CODE,
} from '../utils/manualBaseballDataContract';

const homeMatchPanelModulePromise = import('./home/HomeMatchPanel');
const LazyHomeRecoveryBanner = lazy(() => import('./home/HomeRecoveryBanner'));
const LazyHomeDeferredSurfaces = lazy(() => import('./home/HomeDeferredSurfaces'));
const LazyHomeMatchPanel = lazy(() => homeMatchPanelModulePromise);

const HOME_FIRST_CARD_READY_EVENT = 'bega:home-first-card-ready';
const HOME_BUTTON_BASE_CLASS = 'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-15 font-semibold transition-all outline-none focus-visible:border-ring focus-visible:ring focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0';
const HOME_BUTTON_OUTLINE_TOUCH_CLASS = `${HOME_BUTTON_BASE_CLASS} h-11 rounded-xl border bg-background px-4 text-15 text-foreground hover:bg-accent hover:text-accent-foreground has-[>svg]:px-3 dark:border-input dark:bg-input/30 dark:hover:bg-input/50`;
const HOME_BUTTON_GHOST_ICON_TOUCH_CLASS = `${HOME_BUTTON_BASE_CLASS} size-11 rounded-xl p-0 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50`;
const HOME_BUTTON_LINK_SM_CLASS = `${HOME_BUTTON_BASE_CLASS} h-8 rounded-md px-3 text-primary underline-offset-4 hover:underline has-[>svg]:px-2.5`;
const HOME_CSS_CHEVRON_LEFT_CLASS = 'block h-3.5 w-3.5 -rotate-45 border-l-2 border-t-2 border-current';
const HOME_CSS_CHEVRON_RIGHT_CLASS = 'block h-3.5 w-3.5 rotate-45 border-r-2 border-t-2 border-current';
const HOME_CSS_FLAME_CLASS = 'mr-2 inline-block h-4 w-3 rotate-45 rounded-bl-sm rounded-br-full rounded-t-full bg-orange-500';
const HOME_DEFERRED_SURFACES_DEFER_DELAY_MS = 1800;
const HOME_DEFERRED_SURFACES_IDLE_TIMEOUT_MS = 1200;
const HOME_LIVE_POLLING_DEFER_DELAY_MS = 1200;
const HOME_LIVE_POLLING_IDLE_TIMEOUT_MS = 1200;
const HOME_LOAD_TELEMETRY_IDLE_TIMEOUT_MS = 1800;

type HomeFirstCardReadyWindow = Window & {
    __begaHomeFirstCardReadyPathname?: string;
};

type HomeMatchPanelSuspenseFallbackProps = {
    loadingMatchCardCount: number;
    matchSectionMinHeightStyle: { minHeight: string };
};

type ScheduledGamePartitions = {
    primary: Game[];
    secondary: Game[];
    excluded: Game[];
};

const EMPTY_SCHEDULED_GAMES: Game[] = [];
const EMPTY_GROUPED_GAMES_BY_SOURCE_DATE: Array<[string, Game[]]> = [];
const EMPTY_SCHEDULED_GAME_PARTITIONS: ScheduledGamePartitions = {
    primary: EMPTY_SCHEDULED_GAMES,
    secondary: EMPTY_SCHEDULED_GAMES,
    excluded: EMPTY_SCHEDULED_GAMES,
};

function HomeMatchPanelFallbackCard() {
    return (
        <div className="min-h-[168px] animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-card">
            <div className="flex items-center justify-between gap-4">
                <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="h-5 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="h-6 w-10 rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="ml-auto h-5 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="mt-6 h-4 w-32 rounded-full bg-gray-200 dark:bg-white/10" />
        </div>
    );
}

function HomeMatchPanelSuspenseFallback({
    loadingMatchCardCount,
    matchSectionMinHeightStyle,
}: HomeMatchPanelSuspenseFallbackProps) {
    return (
        <div
            className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm"
            style={matchSectionMinHeightStyle}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-0 items-stretch">
                {Array.from({ length: loadingMatchCardCount }, (_, i) => (
                    <HomeMatchPanelFallbackCard key={`fallback-card-${i}`} />
                ))}
            </div>
        </div>
    );
}

const isPublicApiTimeoutError = (error: unknown): boolean => (
    error instanceof Error && /^Request timed out after \d+ms$/i.test(error.message)
);

const scheduleHomeLoadTelemetry = (payload: {
    selectedDate: string;
    loadState: HomeLoadState;
    success: HomeCoreLoadSuccessState;
    showConnectionError: boolean;
}) => {
    if (typeof window === 'undefined') {
        return;
    }

    const loadTelemetry = () => {
        void import('../utils/homeLoadTelemetry')
            .then(({ logHomeLoadTelemetry }) => logHomeLoadTelemetry(payload))
            .catch(() => undefined);
    };
    const setWindowTimeout = window.setTimeout.bind(window);

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadTelemetry, {
            timeout: HOME_LOAD_TELEMETRY_IDLE_TIMEOUT_MS,
        });
        return;
    }

    setWindowTimeout(loadTelemetry, 0);
};

const GAME_CARD_MIN_HEIGHT = 'min-h-[240px]';
const GAME_CARD_MIN_HEIGHT_PX = 240;
const MIN_LOADING_CARD_COUNT = 5;
const LOADING_CARD_COUNT_MAX = MIN_LOADING_CARD_COUNT;
const HOME_BOOTSTRAP_SOFT_FALLBACK_DELAY_MS = 6000;
const HOME_BOOTSTRAP_CACHE_STALE_MS = 60 * 1000;
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

const EMPTY_HOME_AUTH_SNAPSHOT: HomeAuthSnapshot = {
    userId: null,
    isLoggedIn: false,
    isAdmin: false,
};

type HomeLiveSummaryTimeoutWarningState = {
    consecutiveTimeoutCount: number;
    timeoutWarningLogged: boolean;
};
type HomeBootstrapData = Awaited<ReturnType<typeof fetchHomeBootstrap>>;
type HomeBootstrapCacheEntry = {
    data: HomeBootstrapData;
    updatedAt: number;
};

const homeBootstrapCache = new Map<string, HomeBootstrapCacheEntry>();

const getTodayMidday = () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
};

const readCachedHomeBootstrap = (date: Date): HomeBootstrapData | null => {
    const cacheEntry = homeBootstrapCache.get(formatDateForAPI(date));

    if (!cacheEntry || Date.now() - cacheEntry.updatedAt > HOME_BOOTSTRAP_CACHE_STALE_MS) {
        return null;
    }

    return cacheEntry.data;
};

const writeCachedHomeBootstrap = (date: Date, data: HomeBootstrapData) => {
    homeBootstrapCache.set(formatDateForAPI(date), {
        data,
        updatedAt: Date.now(),
    });
};

const fetchHomeBootstrapWithRetry = async (date: Date): Promise<HomeBootstrapData> => {
    try {
        const data = await fetchHomeBootstrap(date);
        writeCachedHomeBootstrap(date, data);
        return data;
    } catch (error) {
        if (!shouldRetryHomeBootstrapQuery(0, error)) {
            throw error;
        }

        const data = await fetchHomeBootstrap(date);
        writeCachedHomeBootstrap(date, data);
        return data;
    }
};

const createHomeLiveSummaryTimeoutWarningState = (): HomeLiveSummaryTimeoutWarningState => ({
    consecutiveTimeoutCount: 0,
    timeoutWarningLogged: false,
});

const buildHomeLivePollingCandidateKey = (
    games: Game[],
    scheduledGames: Game[],
    selectedDateKey: string,
): string => {
    let candidateKey = '';
    for (const game of games) {
        const segment = `${game.gameId ?? ''}:${game.gameStatus ?? ''}:${game.sourceDate || game.gameDate || selectedDateKey}`;
        candidateKey = candidateKey ? `${candidateKey}|${segment}` : segment;
    }

    for (const game of scheduledGames) {
        const segment = `${game.gameId ?? ''}:${game.gameStatus ?? ''}:${game.sourceDate || game.gameDate || selectedDateKey}`;
        candidateKey = candidateKey ? `${candidateKey}|${segment}` : segment;
    }

    return candidateKey;
};

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
        failureReason: backendLoadState?.failureReason
            ?? (failedSections.length > 0 ? 'request-failed' : null),
        manualDataRequest: backendLoadState?.manualDataRequest ?? null,
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

const hasValidPostseasonStart = (leagueStartDates: LeagueStartDates): boolean => {
    const regularStart = normalizeComparableDateKey(leagueStartDates.regularSeasonStart);
    const postseasonStart = normalizeComparableDateKey(leagueStartDates.postseasonStart);

    return Boolean(regularStart && postseasonStart && postseasonStart > regularStart);
};

const hasValidKoreanSeriesStart = (leagueStartDates: LeagueStartDates): boolean => {
    const regularStart = normalizeComparableDateKey(leagueStartDates.regularSeasonStart);
    const postseasonStart = normalizeComparableDateKey(leagueStartDates.postseasonStart);
    const koreanSeriesStart = normalizeComparableDateKey(leagueStartDates.koreanSeriesStart);

    if (!regularStart || !koreanSeriesStart || koreanSeriesStart <= regularStart) {
        return false;
    }

    return !postseasonStart || koreanSeriesStart >= postseasonStart;
};

const buildVisibleLeagueTabs = (today: Date, leagueStartDates: LeagueStartDates) => (
    HOME_LEAGUE_TABS.filter((tab) => {
        if (tab.value === 'regular' || tab.value === 'scheduled') {
            return true;
        }
        if (tab.value === 'postseason') {
            return hasValidPostseasonStart(leagueStartDates)
                && isSameOrAfterDateKey(today, leagueStartDates.postseasonStart);
        }
        if (tab.value === 'koreanseries') {
            return hasValidKoreanSeriesStart(leagueStartDates)
                && isSameOrAfterDateKey(today, leagueStartDates.koreanSeriesStart);
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

    if (hasPrimaryScheduledGame(scheduledGames)) {
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

export default function HomeRuntime() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialHomeRouteStateRef = useRef<ReturnType<typeof resolveHomeRouteState> | null>(null);
    if (initialHomeRouteStateRef.current === null) {
        initialHomeRouteStateRef.current = resolveHomeRouteState(searchParams, getTodayMidday());
    }
    const initialHomeRouteState = initialHomeRouteStateRef.current;

    const [selectedDate, setSelectedDate] = useState(() => initialHomeRouteState.date);
    const [showCalendar, setShowCalendar] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [leagueStartDates, setLeagueStartDates] = useState<LeagueStartDates>(() => getFallbackLeagueStartDates());

    const [navInfo, setNavInfo] = useState<{ prev: string | null; next: string | null; hasPrev: boolean; hasNext: boolean }>({
        prev: null, next: null, hasPrev: true, hasNext: true
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isGamesError, setIsGamesError] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    const [loadFailureReason, setLoadFailureReason] = useState<HomeLoadFailureReason | null>(null);
    const [manualDataRequest, setManualDataRequest] = useState<ManualBaseballDataRequest | null>(null);
    const [homeAuthSnapshot, setHomeAuthSnapshot] = useState<HomeAuthSnapshot>(EMPTY_HOME_AUTH_SNAPSHOT);

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
    const deferredSurfacesTimeoutRef = useRef<number | null>(null);
    const deferredSurfacesIdleCallbackRef = useRef<number | null>(null);
    const matchLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);
    const scheduledLoadingCardCountRef = useRef(MIN_LOADING_CARD_COUNT);
    const [shouldMountDeferredSurfaces, setShouldMountDeferredSurfaces] = useState(false);
    const [isHomeFirstCardReady, setIsHomeFirstCardReady] = useState(false);
    const [shouldMountHomeTeamLogos, setShouldMountHomeTeamLogos] = useState(false);
    const [shouldResolveHomeLivePollingCandidateKey, setShouldResolveHomeLivePollingCandidateKey] = useState(false);
    const authUserId = homeAuthSnapshot.userId;
    const isLoggedIn = homeAuthSnapshot.isLoggedIn;
    const isAdmin = homeAuthSnapshot.isAdmin;

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

    const handleGameCardSelectPrediction = async (game: Game) => {
        const fallbackDate = formatDateForAPI(selectedDate);
        const { buildPredictionMatchHandoff } = await import('../utils/predictionDeepLink')
            .catch(() => ({ buildPredictionMatchHandoff: null }));

        if (!buildPredictionMatchHandoff) {
            navigate(`/prediction?date=${encodeURIComponent(fallbackDate)}`);
            return;
        }

        const handoff = buildPredictionMatchHandoff({
            sourcePage: 'home',
            game,
            fallbackDate,
        });

        navigate(handoff.path, {
            state: handoff.state,
        });
    };

    const clearDeferredSurfacesMount = useCallback(() => {
        if (deferredSurfacesIdleCallbackRef.current !== null && 'cancelIdleCallback' in window) {
            window.cancelIdleCallback(deferredSurfacesIdleCallbackRef.current);
            deferredSurfacesIdleCallbackRef.current = null;
        }
        if (deferredSurfacesTimeoutRef.current !== null) {
            window.clearTimeout(deferredSurfacesTimeoutRef.current);
            deferredSurfacesTimeoutRef.current = null;
        }
    }, []);

    const handleHomeAuthSnapshotChange = useCallback((nextSnapshot: HomeAuthSnapshot) => {
        setHomeAuthSnapshot((currentSnapshot) => (
            currentSnapshot.userId === nextSnapshot.userId
            && currentSnapshot.isLoggedIn === nextSnapshot.isLoggedIn
            && currentSnapshot.isAdmin === nextSnapshot.isAdmin
                ? currentSnapshot
                : nextSnapshot
        ));
    }, []);

    const loadScopedNavigation = useCallback(async (
        scope: HomeNavigationScope,
        anchorDate: Date,
        options: { applyResolvedDate?: boolean } = {},
    ) => {
        const requestId = ++scopedNavigationRequestIdRef.current;
        setIsScopedNavigationLoading(true);

        try {
            const navigation = await fetchHomeScopedNavigation(anchorDate, scope, anchorDate.getFullYear());
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

        scheduleHomeLoadTelemetry({
            selectedDate: formatDateForAPI(date),
            loadState: snapshot.loadState,
            success: snapshot.success,
            showConnectionError,
        });
    }, []);

    const buildBootstrapHomeSnapshot = (date: Date, timedOut: boolean, data: HomeBootstrapData): HomeLoadSnapshot => {
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
        return {
            leagueStartDates,
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

    const getCachedBootstrapSnapshot = (date: Date, timedOut: boolean): HomeLoadSnapshot | null => {
        const cachedBootstrap = readCachedHomeBootstrap(date);

        if (!cachedBootstrap) {
            return null;
        }

        return buildBootstrapHomeSnapshot(date, timedOut, cachedBootstrap);
    };

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
        setIsHomeFirstCardReady(false);
        setShouldMountHomeTeamLogos(false);
        setShouldResolveHomeLivePollingCandidateKey(false);
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
            const data = await fetchHomeBootstrapWithRetry(date);
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
    }, [applyHomeSnapshot, buildLegacyFailureSnapshot, leagueStartDates]);

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
    const homeLivePollingCandidateKey = useMemo(
        () => shouldResolveHomeLivePollingCandidateKey
            ? buildHomeLivePollingCandidateKey(games, scheduledGames, selectedDateKey)
            : '',
        [games, scheduledGames, selectedDateKey, shouldResolveHomeLivePollingCandidateKey],
    );
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
    const showAdminManualDataRecoveryBanner = isAdmin
        && loadFailureReason === 'manual-data-required'
        && manualDataRequest !== null;
    const showConnectionRecoveryBanner = (
        connectionError && (loadFailureReason !== 'manual-data-required' || isAdmin)
    ) || showAdminManualDataRecoveryBanner;
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
        if (shouldMountDeferredSurfaces) {
            return clearDeferredSurfacesMount;
        }

        if (!isHomeFirstCardReady) {
            clearDeferredSurfacesMount();
            return clearDeferredSurfacesMount;
        }

        const mountDeferredSurfaces = () => {
            setShouldMountDeferredSurfaces(true);
            clearDeferredSurfacesMount();
        };

        deferredSurfacesTimeoutRef.current = globalThis.setTimeout(() => {
            deferredSurfacesTimeoutRef.current = null;
            if ('requestIdleCallback' in window) {
                deferredSurfacesIdleCallbackRef.current = window.requestIdleCallback(mountDeferredSurfaces, {
                    timeout: HOME_DEFERRED_SURFACES_IDLE_TIMEOUT_MS,
                });
                return;
            }
            mountDeferredSurfaces();
        }, HOME_DEFERRED_SURFACES_DEFER_DELAY_MS) as unknown as number;

        return clearDeferredSurfacesMount;
    }, [clearDeferredSurfacesMount, isHomeFirstCardReady, shouldMountDeferredSurfaces]);

    useEffect(() => {
        const dateKey = selectedDateKey;
        if (lastBootstrapDateKeyRef.current === dateKey) {
            return;
        }

        lastBootstrapDateKeyRef.current = dateKey;
        void loadHomeBootstrap(selectedDate);
    }, [loadHomeBootstrap, selectedDate, selectedDateKey]);

    useEffect(() => {
        if (isLoading || typeof window === 'undefined') {
            return;
        }

        let firstFrameId: number | null = null;
        let secondFrameId: number | null = null;

        firstFrameId = window.requestAnimationFrame(() => {
            secondFrameId = window.requestAnimationFrame(() => {
                const typedWindow = window as HomeFirstCardReadyWindow;
                typedWindow.__begaHomeFirstCardReadyPathname = window.location.pathname;
                window.dispatchEvent(new Event(HOME_FIRST_CARD_READY_EVENT));
                setIsHomeFirstCardReady(true);
                setShouldMountHomeTeamLogos(true);
                setShouldResolveHomeLivePollingCandidateKey(true);
            });
        });

        return () => {
            if (firstFrameId !== null) {
                window.cancelAnimationFrame(firstFrameId);
            }
            if (secondFrameId !== null) {
                window.cancelAnimationFrame(secondFrameId);
            }
        };
    }, [isLoading, selectedDateKey]);

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
        if (!homeLivePollingCandidateKey) {
            return;
        }
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }

        let disposed = false;
        let startTimeoutId: number | null = null;
        let startIdleCallbackId: number | null = null;
        let intervalId: number | null = null;
        let handleVisibilityOrFocus: (() => void) | null = null;

        const startLiveSummaryPolling = async () => {
            const [
                {
                    LIVE_GAME_POLL_INTERVAL_MS,
                    mergeHomeGamesWithLiveSummaries,
                    recordHomeLiveSummaryTimeoutFailure,
                    resetHomeLiveSummaryTimeoutWarningState,
                    selectHomeLivePollingGameIds,
                },
                { fetchGameLiveSummaries },
            ] = await Promise.all([
                import('../utils/liveGame'),
                import('../api/prediction'),
            ]);

            if (disposed) {
                return;
            }

            const gameIds = selectHomeLivePollingGameIds(games, scheduledGames, selectedDateKey);
            if (!gameIds.length) {
                return;
            }

            resetHomeLiveSummaryTimeoutWarningState(homeLiveSummaryTimeoutWarningRef.current);

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

            handleVisibilityOrFocus = () => {
                if (document.visibilityState === 'hidden') {
                    homeLiveSummaryAbortRef.current?.abort();
                    return;
                }
                void refreshLiveSummaries();
            };

            void refreshLiveSummaries();
            intervalId = window.setInterval(() => {
                void refreshLiveSummaries();
            }, LIVE_GAME_POLL_INTERVAL_MS);

            document.addEventListener('visibilitychange', handleVisibilityOrFocus);
            window.addEventListener('focus', handleVisibilityOrFocus);
        };

        const beginLiveSummaryPolling = () => {
            void startLiveSummaryPolling().catch((error) => {
                if (!disposed) {
                    console.warn('[HomeLivePolling] Failed to initialize live summaries:', error);
                }
            });
        };

        startTimeoutId = globalThis.setTimeout(() => {
            startTimeoutId = null;
            if ('requestIdleCallback' in window) {
                startIdleCallbackId = window.requestIdleCallback(beginLiveSummaryPolling, {
                    timeout: HOME_LIVE_POLLING_IDLE_TIMEOUT_MS,
                });
                return;
            }
            beginLiveSummaryPolling();
        }, HOME_LIVE_POLLING_DEFER_DELAY_MS) as unknown as number;

        return () => {
            disposed = true;
            if (startIdleCallbackId !== null && 'cancelIdleCallback' in window) {
                window.cancelIdleCallback(startIdleCallbackId);
                startIdleCallbackId = null;
            }
            if (startTimeoutId !== null) {
                window.clearTimeout(startTimeoutId);
                startTimeoutId = null;
            }
            homeLiveSummaryAbortRef.current?.abort();
            if (intervalId !== null) {
                window.clearInterval(intervalId);
            }
            if (handleVisibilityOrFocus !== null) {
                document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
                window.removeEventListener('focus', handleVisibilityOrFocus);
            }
        };
    }, [homeLivePollingCandidateKey, selectedDateKey]);

    useEffect(() => {
        setIsSecondarySectionExpanded(false);
    }, [selectedDate]);

    useEffect(() => {
        if (showCalendar) {
            clearDeferredSurfacesMount();
            setShouldMountDeferredSurfaces(true);
        }
    }, [clearDeferredSurfacesMount, showCalendar]);

    const {
        regularSeasonCount,
        postSeasonCount,
        koreanSeriesCount,
        activeStandardGames,
    } = useMemo(
        () => summarizeHomeLeagueGames(games, activeLeagueTab),
        [activeLeagueTab, games],
    );
    const hasScheduledPrimaryGame = useMemo(
        () => hasPrimaryScheduledGame(scheduledGames),
        [scheduledGames],
    );
    const scheduledGamePartitions = useMemo(
        () => activeTabIsScheduled ? partitionScheduledGames(scheduledGames) : EMPTY_SCHEDULED_GAME_PARTITIONS,
        [activeTabIsScheduled, scheduledGames],
    );
    const {
        primary: scheduledPrimaryGames,
        secondary: scheduledSecondaryGames,
        excluded: liveOrFinishedScheduledGames,
    } = scheduledGamePartitions;
    const scheduledPrimaryGamesBySourceDate = useMemo(
        () => activeTabIsScheduled ? groupGamesBySourceDate(scheduledPrimaryGames, selectedDateKey) : EMPTY_GROUPED_GAMES_BY_SOURCE_DATE,
        [activeTabIsScheduled, scheduledPrimaryGames, selectedDateKey],
    );
    const scheduledSecondaryGamesBySourceDate = useMemo(
        () => activeTabIsScheduled ? groupGamesBySourceDate(scheduledSecondaryGames, selectedDateKey) : EMPTY_GROUPED_GAMES_BY_SOURCE_DATE,
        [activeTabIsScheduled, scheduledSecondaryGames, selectedDateKey],
    );
    const displayedHomeDate = selectedDate;
    const matchSkeletonCount = clampLoadingCount(
        Math.max(regularSeasonCount, postSeasonCount, koreanSeriesCount),
    );
    const scheduledSkeletonCount = clampLoadingCount(
        activeTabIsScheduled
            ? Math.max(scheduledPrimaryGames.length + scheduledSecondaryGames.length, scheduledGames.length)
            : scheduledGames.length,
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

    const activeCardHeight = GAME_CARD_MIN_HEIGHT_PX;
    const loadingMatchCardCount = activeTabIsScheduled
        ? scheduledLoadingCardCountRef.current
        : matchLoadingCardCountRef.current;
    const minLoadingCount = Math.max(MIN_LOADING_CARD_COUNT, loadingMatchCardCount);
    const desktopRows = Math.max(1, Math.ceil(Math.min(minLoadingCount, 4) / 2));
    const mobileRows = Math.max(1, Math.min(minLoadingCount, 2));
    const mobileHeight = (mobileRows * activeCardHeight) + ((mobileRows - 1) * 12);
    const desktopHeight = (desktopRows * activeCardHeight) + ((desktopRows - 1) * 12);
    const calculatedMatchSectionMinHeight = Math.max(Math.max(mobileHeight, desktopHeight) + 24, 100);
    const matchSectionMinHeightStyle = { minHeight: `${calculatedMatchSectionMinHeight}px` };

    useEffect(() => {
        const shouldSwitch = shouldAutoSwitchToScheduled({
            activeLeagueTab,
            hasUserChangedTab: hasUserChangedTabRef.current,
            isLoading,
            isScheduledLoading,
            regularCount: regularSeasonCount,
            postseasonCount: postSeasonCount,
            koreanSeriesCount,
            scheduledPrimaryCount: hasScheduledPrimaryGame ? 1 : 0,
        });

        if (shouldSwitch) {
            setActiveLeagueTab('scheduled');
        }
    }, [
        activeLeagueTab,
        isLoading,
        isScheduledLoading,
        regularSeasonCount,
        postSeasonCount,
        koreanSeriesCount,
        hasScheduledPrimaryGame,
    ]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-300 pb-[var(--mobile-content-safe-bottom)] lg:pb-20">
            {showConnectionRecoveryBanner && (
                <Suspense fallback={null}>
                    <LazyHomeRecoveryBanner
                        loadFailureReason={loadFailureReason}
                        manualDataRequest={manualDataRequest}
                        onRetry={() => {
                            setConnectionError(false);
                            setManualDataRequest(null);
                            void loadHomeBootstrap(selectedDate);
                        }}
                    />
                </Suspense>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/70 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-primary to-primary/50" aria-hidden="true" />
                            <div>
                                <span className="block text-13 font-semibold text-muted-foreground">
                                    Scoreboard
                                </span>
                                <h1 className="text-3xl font-extrabold tracking-tight text-primary dark:text-emerald-400">
                                    KBO LEAGUE
                                </h1>
                            </div>
                        </div>
                        <p className="mt-2 pl-[18px] font-medium text-muted-foreground">
                            {selectedDate.getFullYear()} 시즌 경기 일정 및 순위
                        </p>
                    </div>
                    <div>
                        {isTodayOffSeason ? (
                            <button
                                type="button"
                                data-testid="home-offseason-cta"
                                onClick={() => navigate('/offseason')}
                                className={`${HOME_BUTTON_OUTLINE_TOUCH_CLASS} border-emerald-600/20 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-900/20`}
                            >
                                <span className={HOME_CSS_FLAME_CLASS} aria-hidden="true" />
                                스토브리그
                            </button>
                        ) : (
                            <button
                                type="button"
                                data-priority="secondary"
                                data-testid="home-secondary-prediction-cta"
                                onClick={handleNavigateToTodayPrediction}
                                className={`${HOME_BUTTON_OUTLINE_TOUCH_CLASS} border-primary/25 bg-white font-black text-primary hover:bg-primary/5 dark:border-primary/40 dark:bg-card dark:text-emerald-300 dark:hover:bg-primary/10`}
                            >
                                전력분석실 보기
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100 sm:flex-row sm:items-center sm:justify-center sm:px-6 md:w-fit md:mx-auto">
                  <div className="flex items-center justify-center gap-4 sm:gap-6">
                    <button
                      type="button"
                      data-testid="home-date-prev"
                      onClick={() => changeDate('prev')}
                      disabled={isLoading || isScopedNavigationLoading || !dateNavigation.hasPrev}
                      aria-label="이전 날짜"
                      className={`${HOME_BUTTON_GHOST_ICON_TOUCH_CLASS} hover:bg-emerald-50 hover:text-primary disabled:opacity-30 dark:hover:bg-emerald-900/20`}
                    >
                        <span className={HOME_CSS_CHEVRON_LEFT_CLASS} aria-hidden="true" />
                    </button>

                    <div className="flex flex-col items-center min-w-[140px]">
                        <h2 className="text-xl font-extrabold text-foreground tracking-tight leading-none mb-1">
                            {formatHomeDate(displayedHomeDate)}
                        </h2>
                        <button
                            type="button"
                            onClick={() => {
                                setShouldMountDeferredSurfaces(true);
                                setShowCalendar(true);
                            }}
                            className={`${HOME_BUTTON_LINK_SM_CLASS} min-h-11 px-2 py-0 text-body font-bold text-primary opacity-80 transition-opacity hover:opacity-100 dark:text-emerald-400`}
                        >
                            날짜 변경
                        </button>
                    </div>

                    <button
                      type="button"
                      data-testid="home-date-next"
                      onClick={() => changeDate('next')}
                      disabled={isLoading || isScopedNavigationLoading || !dateNavigation.hasNext}
                      aria-label="다음 날짜"
                      className={`${HOME_BUTTON_GHOST_ICON_TOUCH_CLASS} hover:bg-emerald-50 hover:text-primary disabled:opacity-30 dark:hover:bg-emerald-900/20`}
                    >
                        <span className={HOME_CSS_CHEVRON_RIGHT_CLASS} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-3">
                    <div className="w-full">
                        <div className="flex justify-center mb-6">
                            <div
                                role="tablist"
                                aria-label="경기 구분 선택"
                                className={`grid w-full max-w-xl ${visibleLeagueTabGridClass} bg-muted p-1 rounded-xl mx-auto`}
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
                                            className={`min-h-11 rounded-lg px-2 py-2 text-body font-bold transition-all ${
                                                isActive
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
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
                            <Suspense
                                fallback={(
                                    <HomeMatchPanelSuspenseFallback
                                        loadingMatchCardCount={loadingMatchCardCount}
                                        matchSectionMinHeightStyle={matchSectionMinHeightStyle}
                                    />
                                )}
                            >
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
                                    shouldMountTeamLogos={shouldMountHomeTeamLogos}
                                    LoadingCardComponent={HomeMatchPanelFallbackCard}
                                    onRetry={() => void loadHomeBootstrap(selectedDate)}
                                    onSelectPrediction={handleGameCardSelectPrediction}
                                    onToggleSecondarySection={() => setIsSecondarySectionExpanded(prev => !prev)}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>

                {shouldMountDeferredSurfaces || showCalendar ? (
                    <Suspense fallback={null}>
                        <LazyHomeDeferredSurfaces
                            selectedDate={selectedDate}
                            selectedDateKey={selectedDateKey}
                            showCalendar={showCalendar}
                            loggedIn={isLoggedIn}
                            userId={authUserId ? String(authUserId) : null}
                            suppressRecoveryActions={showConnectionRecoveryBanner}
                            onAuthSnapshotChange={handleHomeAuthSnapshotChange}
                            onCloseCalendar={() => setShowCalendar(false)}
                            onSelectCalendarDate={(nextDate) => {
                                hasUserChangedTabRef.current = true;
                                setSelectedDate(nextDate);
                                replaceHomeRouteState(nextDate, activeLeagueTab);
                                setShowCalendar(false);
                            }}
                        />
                    </Suspense>
                ) : null}
                <div
                    className="h-[var(--mobile-content-safe-bottom)] lg:hidden"
                    aria-hidden="true"
                    data-testid="home-mobile-bottom-spacer"
                />
            </main>
        </div>
    );
}
