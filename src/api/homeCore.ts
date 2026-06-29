import {
    HomeBootstrapResponse,
    HomeScopedNavigationResponse,
} from '../types/home';
import { cacheLeagueStartDates, formatDateForAPI } from '../utils/home';
import { PublicApiError, publicGet } from './publicClient';
import type { ManualBaseballDataRequest } from '../types/manualBaseballData';

export type HomeLoadSource = 'bootstrap' | 'legacy-fallback';
export type HomeLoadFailureReason = 'manual-data-required' | 'request-failed';
export type HomeNavigationScope = 'regular' | 'postseason' | 'koreanseries' | 'scheduled';

export const HOME_BOOTSTRAP_REQUEST_TIMEOUT_MS = 8000;
export const HOME_BOOTSTRAP_QUERY_KEY = (dateKey: string) => ['home', 'bootstrap', dateKey] as const;
export const HOME_SCOPED_NAVIGATION_QUERY_KEY = (dateKey: string, scope: HomeNavigationScope, seasonYear?: number) => (
    ['home', 'navigation', dateKey, scope, seasonYear ?? 'auto'] as const
);

export interface HomeLoadState {
    source: HomeLoadSource;
    isFallback: boolean;
    timedOut: boolean;
    timedOutSections: string[];
    failedSections: string[];
    failureReason: HomeLoadFailureReason | null;
    manualDataRequest: ManualBaseballDataRequest | null;
}

export interface HomeCoreLoadSuccessState {
    leagueStartDates: boolean;
    navigation: boolean;
    games: boolean;
    scheduledGames: boolean;
}

const isBootstrapResponse = (value: unknown): value is HomeBootstrapResponse => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    const loadState = candidate.loadState;
    return typeof candidate.selectedDate === 'string'
        && Array.isArray(candidate.games)
        && Array.isArray(candidate.scheduledGamesWindow)
        && !!candidate.leagueStartDates
        && !!candidate.navigation
        && (loadState == null || (typeof loadState === 'object' && !Array.isArray(loadState)));
};

const isStringArray = (value: unknown): value is string[] => (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
);

const isHomeLoadFailureReason = (value: unknown): value is HomeLoadFailureReason => (
    value === 'manual-data-required' || value === 'request-failed'
);

const isManualBaseballDataRequest = (value: unknown): value is ManualBaseballDataRequest => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Partial<ManualBaseballDataRequest>;
    return typeof candidate.scope === 'string'
        && Array.isArray(candidate.missingItems)
        && typeof candidate.operatorMessage === 'string'
        && typeof candidate.blocking === 'boolean';
};

const isScopedNavigationResponse = (value: unknown): value is HomeScopedNavigationResponse => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.hasPrev === 'boolean'
        && typeof candidate.hasNext === 'boolean';
};

export const buildHomeLoadState = (
    source: HomeLoadSource,
    options: {
        isFallback?: boolean;
        timedOut?: boolean;
        timedOutSections?: string[];
        failedSections?: string[];
        failureReason?: HomeLoadFailureReason | null;
        manualDataRequest?: ManualBaseballDataRequest | null;
    } = {},
): HomeLoadState => ({
    source,
    isFallback: options.isFallback ?? source === 'legacy-fallback',
    timedOut: options.timedOut === true,
    timedOutSections: options.timedOutSections ?? [],
    failedSections: options.failedSections ?? [],
    failureReason: options.failureReason ?? null,
    manualDataRequest: options.manualDataRequest ?? null,
});

export const shouldShowHomeConnectionError = (
    state: HomeCoreLoadSuccessState,
): boolean => !Object.values(state).some(Boolean);

export const isHomeBootstrapBusinessConflict = (error: unknown): boolean => (
    error instanceof PublicApiError && error.status === 409
);

export const shouldRetryHomeBootstrapQuery = (
    failureCount: number,
    error: unknown,
): boolean => (
    !isHomeBootstrapBusinessConflict(error) && failureCount < 1
);

export const fetchHomeBootstrap = async (
    date: Date,
    options: { timeoutMs?: number } = {},
): Promise<HomeBootstrapResponse> => {
    const apiDate = formatDateForAPI(date);
    const data = await publicGet<unknown>('/home/bootstrap', {
        params: { date: apiDate },
        timeoutMs: options.timeoutMs ?? HOME_BOOTSTRAP_REQUEST_TIMEOUT_MS,
    });

    if (!isBootstrapResponse(data)) {
        throw new Error('Invalid home bootstrap response');
    }

    const loadState = data.loadState
        ? {
            ...data.loadState,
            timedOutSections: isStringArray(data.loadState.timedOutSections)
                ? data.loadState.timedOutSections
                : [],
            failedSections: isStringArray(data.loadState.failedSections)
                ? data.loadState.failedSections
                : [],
            failureReason: isHomeLoadFailureReason(data.loadState.failureReason)
                ? data.loadState.failureReason
                : null,
            manualDataRequest: isManualBaseballDataRequest(data.loadState.manualDataRequest)
                ? data.loadState.manualDataRequest
                : null,
        }
        : undefined;
    const response: HomeBootstrapResponse = {
        selectedDate: data.selectedDate,
        leagueStartDates: data.leagueStartDates,
        navigation: data.navigation,
        games: data.games,
        scheduledGamesWindow: data.scheduledGamesWindow,
        ...(loadState ? { loadState } : {}),
    };

    cacheLeagueStartDates(response.leagueStartDates);
    return response;
};

export const getHomeBootstrapQueryOptions = (date: Date) => {
    const dateKey = formatDateForAPI(date);
    return {
        queryKey: HOME_BOOTSTRAP_QUERY_KEY(dateKey),
        queryFn: () => fetchHomeBootstrap(date),
        retry: shouldRetryHomeBootstrapQuery,
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
    } as const;
};

export const fetchHomeScopedNavigation = async (
    date: Date,
    scope: HomeNavigationScope,
    seasonYear?: number,
): Promise<HomeScopedNavigationResponse> => {
    const apiDate = formatDateForAPI(date);
    const data = await publicGet<unknown>('/home/navigation', {
        params: seasonYear == null
            ? { date: apiDate, scope }
            : { date: apiDate, scope, seasonYear },
    });

    if (!isScopedNavigationResponse(data)) {
        throw new Error('Invalid home scoped navigation response');
    }

    return data;
};

export const getHomeScopedNavigationQueryOptions = (
    date: Date,
    scope: HomeNavigationScope,
    seasonYear?: number,
) => {
    const dateKey = formatDateForAPI(date);
    return {
        queryKey: HOME_SCOPED_NAVIGATION_QUERY_KEY(dateKey, scope, seasonYear),
        queryFn: () => fetchHomeScopedNavigation(date, scope, seasonYear),
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
    } as const;
};
