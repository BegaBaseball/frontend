// api/home.ts
import { useQuery } from '@tanstack/react-query';
import type { CheerPost } from './cheerApi';
import { getTeamColorByAnyKey } from '../constants/teams';
import { formatTimeAgo } from '../utils/time';
import {
    FeaturedMateCard,
    Game,
    HomeBootstrapResponse,
    HomeWidgetsResponse,
    LeagueStartDates,
    Ranking,
} from '../types/home';
import { cacheLeagueStartDates, formatDateForAPI, getFallbackLeagueStartDates } from '../utils/home';
import api from './axios';

const publicHomeRequestConfig = {
    skipAuthSessionHandling: true,
} as const;

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
    return typeof candidate.selectedDate === 'string'
        && Array.isArray(candidate.games)
        && Array.isArray(candidate.scheduledGamesWindow)
        && Array.isArray(candidate.rankings)
        && !!candidate.leagueStartDates
        && !!candidate.navigation;
};

const isWidgetsResponse = (value: unknown): value is { hotCheerPosts: RawHotCheerPost[]; featuredMates: FeaturedMateCard[] } => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return Array.isArray(candidate.hotCheerPosts) && Array.isArray(candidate.featuredMates);
};

/**
 * 특정 날짜의 경기 데이터 조회
 */
export const fetchGamesData = async (date: Date): Promise<Game[]> => {
    const apiDate = formatDateForAPI(date);

    try {
        const { data } = await api.get<Game[]>('/kbo/schedule', {
            params: { date: apiDate },
            ...publicHomeRequestConfig,
        });
        return data;

    } catch (error) {
        return [];
    }
};

/**
 * 시즌 순위 데이터 조회
 */
export const fetchRankingsData = async (year: number): Promise<Ranking[]> => {
    try {
        const { data } = await api.get<Ranking[]>(`/kbo/rankings/${year}`, publicHomeRequestConfig);
        return data;

    } catch (error) {
        return [];
    }
};

/**
 * 리그 시작 날짜 조회 
 */
export const fetchLeagueStartDates = async (): Promise<LeagueStartDates> => {
    try {
        const { data } = await api.get<LeagueStartDates>('/kbo/league-start-dates', publicHomeRequestConfig);
        cacheLeagueStartDates(data);
        return data;

    } catch (error) {
        return getFallbackLeagueStartDates();
    }
};

export const fetchHomeBootstrap = async (date: Date): Promise<HomeBootstrapResponse> => {
    const apiDate = formatDateForAPI(date);
    const { data } = await api.get('/home/bootstrap', {
        params: { date: apiDate },
        ...publicHomeRequestConfig,
    });

    if (!isBootstrapResponse(data)) {
        throw new Error('Invalid home bootstrap response');
    }

    cacheLeagueStartDates(data.leagueStartDates);
    return data;
};

export const fetchHomeWidgets = async (date: Date): Promise<HomeWidgetsResponse> => {
    const apiDate = formatDateForAPI(date);
    const { data } = await api.get('/home/widgets', {
        params: { date: apiDate },
        ...publicHomeRequestConfig,
    });

    if (!isWidgetsResponse(data)) {
        throw new Error('Invalid home widgets response');
    }

    return {
        hotCheerPosts: data.hotCheerPosts.map(toCheerPost),
        featuredMates: data.featuredMates,
    };
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

export const useRankingsData = (year: number) => {
    return useQuery({
        queryKey: ['rankings', year], // 연도별로 캐싱
        queryFn: () => fetchRankingsData(year),
        staleTime: 30 * 60 * 1000, // 30분 (순위는 자주 안 바뀜)
        gcTime: 60 * 60 * 1000, // 1시간
    });
};
