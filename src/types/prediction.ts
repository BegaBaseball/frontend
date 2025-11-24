export interface Game {
  gameId: string;
  time?: string;
  stadium: string;
  gameStatus?: string;
  gameStatusKr?: string;
  gameInfo?: string;
  leagueType?: 'REGULAR' | 'POSTSEASON' | 'KOREAN_SERIES' | 'OFFSEASON';
  homeTeam: string;
  homeTeamFull?: string;
  awayTeam: string;
  awayTeamFull?: string;
  homeScore?: number;
  awayScore?: number;
  winner?: 'home' | 'away' | 'draw';
}

export interface DateGames {
  date: string;
  games: Game[];
}

export interface VoteData {
  home: number;
  away: number;
}

export interface VoteRequest {
  gameId: string;
  votedTeam: 'home' | 'away';
}

export interface VoteStatusResponse {
  homeVotes: number;
  awayVotes: number;
}

export type PredictionTab = 'match' | 'ranking';