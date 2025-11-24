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
}

export interface EmojiStat {
  name: string;
  emoji: string;
  count: number;
}