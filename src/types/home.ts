// types/home.ts
export interface Game {
    gameId: string;
    time: string;
    stadium: string;
    gameStatus: string;
    gameStatusKr: string;
    gameInfo: string;
    leagueType: 'REGULAR' | 'POSTSEASON' | 'KOREAN_SERIES' | 'OFFSEASON' | 'PRE' | 'PRESEASON' | string;
    homeTeam: string;
    homeTeamFull: string;
    awayTeam: string;
    awayTeamFull: string;
    gameDate?: string;
    homeScore?: number;
    awayScore?: number;
    sourceDate?: string;
    leagueBadge?: string;
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
    postseasonStart: string;
    koreanSeriesStart: string;
}

export interface ScheduleNavigation {
    prevGameDate?: string | null;
    nextGameDate?: string | null;
    hasPrev: boolean;
    hasNext: boolean;
}

export interface FeaturedMateCard {
    id: number;
    gameDate: string;
    gameTime: string;
    homeTeam: string;
    awayTeam: string;
    currentParticipants: number;
    maxParticipants: number;
    ticketPrice?: number | null;
    status: string;
}

export interface HomeBootstrapResponse {
    selectedDate: string;
    leagueStartDates: LeagueStartDates;
    navigation: ScheduleNavigation;
    games: Game[];
    scheduledGamesWindow: Game[];
    rankingSeasonYear: number;
    rankingSourceMessage: string;
    isOffSeason: boolean;
    rankings: Ranking[];
}

export interface HomeWidgetsResponse {
    hotCheerPosts: import('../api/cheerApi').CheerPost[];
    featuredMates: FeaturedMateCard[];
}

export interface HomeProps {
    onNavigate?: (page: string) => void;
}
