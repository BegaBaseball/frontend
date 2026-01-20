export type DiaryType = 'attended' | 'scheduled';
export type WinningType = 'WIN' | 'DRAW' | 'LOSE' | '';

export interface Game {
  id: number;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  score?: string;
  date: string;
}

export interface DiaryEntry {
  id: number;
  date: string;
  type: DiaryType;
  emoji: string;
  emojiName: string;
  winningName: WinningType;
  gameId: string;
  memo: string;
  photos: string[];
  team: string;
  stadium: string;
  section?: string;
  block?: string;
  row?: string;
  seat?: string;
}

export interface DiaryFormData {
  type: DiaryType;
  emoji: string;
  emojiName: string;
  winningName: WinningType;
  gameId: string;
  memo: string;
  photos: string[];
  photoFiles: File[];
  section?: string;
  block?: string;
  row?: string;
  seat?: string;
}

export interface SaveDiaryRequest {
  date: string;
  type: DiaryType;
  emoji: string;
  emojiName: string;
  winningName: WinningType;
  gameId: string;
  memo: string;
  photos: string[];
  team: string;
  stadium: string;
  section?: string;
  block?: string;
  row?: string;
  seat?: string;
}

export interface DiaryStatistics {
  totalCount: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  winRate: number;
  monthlyCount: number;
  yearlyCount: number;
  yearlyWins: number;
  yearlyWinRate: number;
  mostVisitedStadium: string | null;
  mostVisitedCount: number;
  happiestMonth: string | null;
  happiestCount: number;
  firstDiaryDate: string | null;
  cheerPostCount: number;
  mateParticipationCount: number;

  // New Analysis Fields
  currentWinStreak: number;
  longestWinStreak: number;
  currentLossStreak: number;

  opponentWinRates: Record<string, OpponentStats>;
  bestOpponent: string;
  worstOpponent: string;

  dayOfWeekStats: Record<string, DayStats>;
  luckyDay: string;
  earnedBadges: string[];
}

export interface OpponentStats {
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface DayStats {
  count: number;
  wins: number;
  winRate: number;
}

export interface EmojiStat {
  name: string;
  emoji: string;
  count: number;
}