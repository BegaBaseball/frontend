// types/home.ts

/**
 * 경기 리그 타입
 */
export type LeagueType = 'REGULAR' | 'POSTSEASON' | 'KOREAN_SERIES' | 'OFFSEASON';

/**
 * 경기 정보
 */
export interface Game {
  gameId: string;
  time: string;
  stadium: string;
  gameStatus: string;
  gameStatusKr: string;
  gameInfo: string;
  leagueType: LeagueType;
  homeTeam: string;
  homeTeamFull: string;
  awayTeam: string;
  awayTeamFull: string;
  homeScore?: number;
  awayScore?: number;
}

/**
 * 팀 순위 정보
 */
export interface Ranking {
  rank: number;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: string;
  games: number;
}

/**
 * 경기 필터링 결과
 */
export interface FilteredGames {
  regular: Game[];
  postseason: Game[];
  koreanSeries: Game[];
}