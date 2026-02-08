export interface Pitcher {
  name: string;
  era: string;
  win: number;
  loss: number;
  imgUrl?: string;
}

export interface GameSummary {
  type: string | null;
  playerId?: number | null;
  playerName?: string | null;
  detail?: string | null;
}

export interface GameInningScore {
  inning: number;
  teamSide: string;
  teamCode?: string | null;
  runs?: number | null;
  isExtra?: boolean | null;
}

export interface GameDetail {
  gameId: string;
  gameDate?: string;
  stadium?: string | null;
  stadiumName?: string | null;
  startTime?: string | null;
  attendance?: number | null;
  weather?: string | null;
  gameTimeMinutes?: number | null;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homePitcher?: string | null;
  awayPitcher?: string | null;
  gameStatus?: string | null;
  inningScores?: GameInningScore[];
  summary?: GameSummary[];
}

export interface Game {
  gameId: string;
  gameDate?: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  homeScore?: number;
  awayScore?: number;
  winner?: string | null;
  // 고도화를 위한 추가 필드
  homePitcher?: Pitcher;
  awayPitcher?: Pitcher;
  aiSummary?: string;
  winProbability?: {
    home: number;
    away: number;
  };
}

export interface DateGames {
  date: string;
  games: Game[];
}

export interface VoteStatus {
  home: number;
  away: number;
}

export interface ConfirmDialogData {
  title: string;
  description: string;
  onConfirm: () => void;
}

export interface UserPredictionStat {
  accuracy: number; // 적중률 (%)
  streak: number;   // 연승 횟수
  totalPredictions: number;
  correctPredictions: number;
}

export type VoteTeam = 'home' | 'away';
export type PredictionTab = 'match' | 'ranking';
