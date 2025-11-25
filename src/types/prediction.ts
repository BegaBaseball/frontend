export interface Game {
  gameId: string;
  gameDate: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  homeScore?: number;
  awayScore?: number;
  winner?: string | null;
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

export type VoteTeam = 'home' | 'away';
export type PredictionTab = 'match' | 'ranking';