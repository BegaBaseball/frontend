import type { MateParty } from './mate';

// types/home.ts
export interface Game {
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
    liveLastEventSeq?: number | null;
    liveLastUpdatedAt?: string | null;
}

export interface Ranking {
    rank: number;
    teamId: string; 
    teamName: string; 
    wins: number;
    losses: number;
    draws: number;
    winRate: string;
    games: number;
    gamesBehind?: number;
    shortName?: string;
}

export interface LeagueStartDates {
    regularSeasonStart: string;
    postseasonStart?: string | null;
    koreanSeriesStart?: string | null;
}

export interface ScheduleNavigation {
    prevGameDate?: string | null;
    nextGameDate?: string | null;
    hasPrev: boolean;
    hasNext: boolean;
}

export interface HomeScopedNavigationResponse {
    resolvedDate?: string | null;
    prevGameDate?: string | null;
    nextGameDate?: string | null;
    hasPrev: boolean;
    hasNext: boolean;
}

export interface FeaturedMateCard extends MateParty {
    ticketPrice?: number | null;
}

export interface RankingSnapshot {
    rankingSeasonYear: number;
    rankingSourceMessage: string;
    isOffSeason: boolean;
    rankings: Ranking[];
}

export type HomeRankingSnapshot = RankingSnapshot;

export interface HomeBootstrapLoadState {
    isFallback?: boolean;
    timedOut?: boolean;
    timedOutSections?: string[];
    failedSections?: string[];
}

export interface HomeBootstrapResponse {
    selectedDate: string;
    leagueStartDates: LeagueStartDates;
    navigation: ScheduleNavigation;
    games: Game[];
    scheduledGamesWindow: Game[];
    loadState?: HomeBootstrapLoadState;
}

export interface HomeWidgetsResponse {
    hotCheerPosts: import('../api/cheerApi').CheerPost[];
    featuredMates: FeaturedMateCard[];
    rankingSnapshot: RankingSnapshot;
}

export interface HomeProps {
    onNavigate?: (page: string) => void;
}
