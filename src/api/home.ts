// api/home.ts
import { useQuery } from '@tanstack/react-query';
import { normalizeCheerPost } from './cheerApi';
import {
    FeaturedMateCard,
    Game,
    HomeRankingSnapshot,
    HomeWidgetsResponse,
    LeagueStartDates,
} from '../types/home';
import { cacheLeagueStartDates, formatDateForAPI, getFallbackLeagueStartDates } from '../utils/home';
import { publicGet } from './publicClient';
import type { OpenApiResponseBody } from './openapiTypes';
import { toHomeGames, toHomeGamesFromRange } from './homeMappers';
export {
    buildHomeLoadState,
    fetchHomeBootstrap,
    fetchHomeScopedNavigation,
    getHomeBootstrapQueryOptions,
    getHomeScopedNavigationQueryOptions,
    HOME_BOOTSTRAP_QUERY_KEY,
    HOME_BOOTSTRAP_REQUEST_TIMEOUT_MS,
    HOME_SCOPED_NAVIGATION_QUERY_KEY,
    isHomeBootstrapBusinessConflict,
    shouldRetryHomeBootstrapQuery,
    shouldShowHomeConnectionError,
} from './homeCore';
export type {
    HomeCoreLoadSuccessState,
    HomeLoadFailureReason,
    HomeLoadSource,
    HomeLoadState,
    HomeNavigationScope,
} from './homeCore';

export const HOME_WIDGETS_QUERY_KEY = (dateKey: string, seasonYear?: number) => ['home', 'widgets', dateKey, seasonYear ?? 'auto'] as const;

type ScheduleWireResponse = OpenApiResponseBody<'/api/kbo/schedule', 'get'>;
type HomeWidgetsWireResponse = OpenApiResponseBody<'/api/home/widgets', 'get'>;
type HotCheerPostWire = NonNullable<HomeWidgetsWireResponse['hotCheerPosts']>[number];
type ValidHomeWidgetsWireResponse = Omit<
    HomeWidgetsWireResponse,
    'hotCheerPosts' | 'featuredMates' | 'rankingSnapshot'
> & {
    hotCheerPosts: HotCheerPostWire[];
    featuredMates: FeaturedMateCard[];
    rankingSnapshot: HomeRankingSnapshot;
};

const isRankingSnapshot = (value: unknown): value is HomeRankingSnapshot => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    return 'rankingSeasonYear' in value
        && typeof value.rankingSeasonYear === 'number'
        && 'rankingSourceMessage' in value
        && typeof value.rankingSourceMessage === 'string'
        && 'isOffSeason' in value
        && typeof value.isOffSeason === 'boolean'
        && 'rankings' in value
        && Array.isArray(value.rankings);
};

const isWidgetsResponse = (value: unknown): value is ValidHomeWidgetsWireResponse => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    return 'hotCheerPosts' in value
        && Array.isArray(value.hotCheerPosts)
        && 'featuredMates' in value
        && Array.isArray(value.featuredMates)
        && 'rankingSnapshot' in value
        && isRankingSnapshot(value.rankingSnapshot);
};

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
    const { fetchMatchRangeWire } = await import('./matchRangeClient');
    const { response } = await fetchMatchRangeWire({
        startDate,
        endDate,
        page: 0,
        size: 500,
        includePast: true,
        withMeta: true,
    });

    return toHomeGamesFromRange(response);
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

export const fetchHomeWidgets = async (date: Date, seasonYear?: number): Promise<HomeWidgetsResponse> => {
    const apiDate = formatDateForAPI(date);
    const data = await publicGet<unknown>('/home/widgets', {
        params: seasonYear == null ? { date: apiDate } : { date: apiDate, seasonYear },
    });

    if (!isWidgetsResponse(data)) {
        throw new Error('Invalid home widgets response');
    }

    return {
        hotCheerPosts: data.hotCheerPosts.map(normalizeCheerPost),
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
