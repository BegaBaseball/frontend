// api/home.ts
import { useQuery } from '@tanstack/react-query';
import type { CheerPost } from './cheerApi';
import { getTeamColorByAnyKey } from '../constants/teams';
import { formatTimeAgo } from '../utils/time';
import {
    FeaturedMateCard,
    Game,
    HomeBootstrapResponse,
    HomeRankingSnapshot,
    HomeScopedNavigationResponse,
    HomeWidgetsResponse,
    LeagueStartDates,
} from '../types/home';
import { cacheLeagueStartDates, formatDateForAPI, getFallbackLeagueStartDates } from '../utils/home';
import { PublicApiError, publicGet } from './publicClient';
import type { OpenApiResponseBody } from './openapiTypes';
import type { ManualBaseballDataRequest } from '../types/manualBaseballData';
import { toHomeGames, toHomeGamesFromRange } from './homeMappers';

export type HomeLoadSource = 'bootstrap' | 'legacy-fallback';
export type HomeLoadFailureReason = 'manual-data-required' | 'request-failed';
export type HomeNavigationScope = 'regular' | 'postseason' | 'koreanseries' | 'scheduled';

export const HOME_BOOTSTRAP_REQUEST_TIMEOUT_MS = 8000;
export const HOME_BOOTSTRAP_QUERY_KEY = (dateKey: string) => ['home', 'bootstrap', dateKey] as const;
export const HOME_WIDGETS_QUERY_KEY = (dateKey: string, seasonYear?: number) => ['home', 'widgets', dateKey, seasonYear ?? 'auto'] as const;
export const HOME_SCOPED_NAVIGATION_QUERY_KEY = (dateKey: string, scope: HomeNavigationScope, seasonYear?: number) => (
    ['home', 'navigation', dateKey, scope, seasonYear ?? 'auto'] as const
);

type ScheduleWireResponse = OpenApiResponseBody<'/api/kbo/schedule', 'get'>;
type MatchRangeWireResponse = OpenApiResponseBody<'/api/matches/range', 'get'>;

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

interface RawHotCheerPost {
    id: number;
    teamId: string;
    content: string;
    author: string;
    authorHandle?: string;
    authorProfileImageUrl?: string;
    authorTeamId?: string;
    createdAt: string;
    comments?: number;
    likes?: number;
    bookmarkCount?: number;
    views?: number;
    isHot?: boolean;
    isBookmarked?: boolean;
    isOwner?: boolean;
    repostCount?: number;
    repostedByMe?: boolean;
    postType?: string;
    imageUrls?: string[];
}

const toCheerPost = (post: RawHotCheerPost): CheerPost => ({
    id: post.id,
    teamId: post.teamId,
    team: post.teamId,
    postType: (post.postType as CheerPost['postType']) || 'NORMAL',
    author: post.author,
    authorHandle: post.authorHandle || '',
    authorProfileImageUrl: post.authorProfileImageUrl,
    authorTeamId: post.authorTeamId,
    content: post.content || '',
    timeAgo: formatTimeAgo(post.createdAt),
    teamColor: getTeamColorByAnyKey(post.teamId),
    likeCount: post.likes ?? 0,
    commentCount: post.comments ?? 0,
    bookmarkCount: post.bookmarkCount ?? 0,
    repostCount: post.repostCount ?? 0,
    views: post.views ?? 0,
    isHot: post.isHot ?? false,
    createdAt: post.createdAt,
    updatedAt: post.createdAt,
    liked: false,
    bookmarked: post.isBookmarked ?? false,
    isOwner: post.isOwner ?? false,
    repostedByMe: post.repostedByMe ?? false,
    imageUrls: post.imageUrls || [],
});

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

const isRankingSnapshot = (value: unknown): value is HomeRankingSnapshot => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.rankingSeasonYear === 'number'
        && typeof candidate.rankingSourceMessage === 'string'
        && typeof candidate.isOffSeason === 'boolean'
        && Array.isArray(candidate.rankings);
};

const isWidgetsResponse = (value: unknown): value is { hotCheerPosts: RawHotCheerPost[]; featuredMates: FeaturedMateCard[]; rankingSnapshot: HomeRankingSnapshot } => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return Array.isArray(candidate.hotCheerPosts)
        && Array.isArray(candidate.featuredMates)
        && isRankingSnapshot(candidate.rankingSnapshot);
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

/**
 * 특정 날짜의 경기 데이터 조회
 */
export const fetchGamesData = async (date: Date): Promise<Game[]> => {
    const apiDate = formatDateForAPI(date);

    try {
        const data = await publicGet<ScheduleWireResponse>('/kbo/schedule', {
            params: { date: apiDate },
        });
        return toHomeGames(data);

    } catch (error) {
        return [];
    }
};

export const fetchGamesRangeData = async (startDate: string, endDate: string): Promise<Game[]> => {
    const data = await publicGet<MatchRangeWireResponse>('/matches/range', {
        params: {
            startDate,
            endDate,
            page: 0,
            size: 500,
            includePast: true,
            withMeta: true,
        },
    });

    return toHomeGamesFromRange(data);
};

/**
 * 리그 시작 날짜 조회 
 */
export const fetchLeagueStartDates = async (): Promise<LeagueStartDates> => {
    try {
        const data = await publicGet<LeagueStartDates>('/kbo/league-start-dates');
        cacheLeagueStartDates(data);
        return data;

    } catch (error) {
        return getFallbackLeagueStartDates();
    }
};

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

export const fetchHomeWidgets = async (date: Date, seasonYear?: number): Promise<HomeWidgetsResponse> => {
    const apiDate = formatDateForAPI(date);
    const data = await publicGet<unknown>('/home/widgets', {
        params: seasonYear == null ? { date: apiDate } : { date: apiDate, seasonYear },
    });

    if (!isWidgetsResponse(data)) {
        throw new Error('Invalid home widgets response');
    }

    return {
        hotCheerPosts: data.hotCheerPosts.map(toCheerPost),
        featuredMates: data.featuredMates,
        rankingSnapshot: data.rankingSnapshot,
    };
};

export const getHomeWidgetsQueryOptions = (date: Date, seasonYear?: number) => {
    const dateKey = formatDateForAPI(date);
    return {
        queryKey: HOME_WIDGETS_QUERY_KEY(dateKey, seasonYear),
        queryFn: () => fetchHomeWidgets(date, seasonYear),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    } as const;
};

// ✅ React Query 훅 추가
export const useLeagueStartDates = () => {
    return useQuery({
        queryKey: ['leagueStartDates'],
        queryFn: fetchLeagueStartDates,
        staleTime: 60 * 60 * 1000, // 1시간 (리그 날짜는 자주 안 바뀜)
        gcTime: 24 * 60 * 60 * 1000, // 24시간
    });
};

export const useGamesData = (date: Date) => {
    const formattedDate = formatDateForAPI(date);

    return useQuery({
        queryKey: ['games', formattedDate], // 날짜별로 캐싱
        queryFn: () => fetchGamesData(date),
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 10 * 60 * 1000, // 10분
        enabled: !!date, // date가 있을 때만 실행
    });
};
