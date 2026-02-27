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

export interface HomeProps {
    onNavigate?: (page: string) => void;
}
