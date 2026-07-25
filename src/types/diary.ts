export type DiaryType = 'attended' | 'scheduled';
export type WinningType = 'WIN' | 'DRAW' | 'LOSE' | '' | null;
export type DiaryStatsScope = 'all' | 'home' | 'away';
export type DiaryGameScope = 'home' | 'away' | 'neutral';
export type SeatViewSourceType = 'DIARY_UPLOAD' | 'TICKET_SCAN';
export type SeatViewLabel = 'SEAT_VIEW' | 'TICKET' | 'OTHER' | 'INAPPROPRIATE';

export interface DiaryPhotoFile {
  file: File;
  sourceType: SeatViewSourceType;
}

export interface SeatViewCandidate {
  id: number;
  storagePath: string;
  previewUrl: string;
  sourceType: SeatViewSourceType;
  aiSuggestedLabel: SeatViewLabel | null;
  aiConfidence: number | null;
  shareEligible: boolean;
}

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
  gameId: number;
  memo: string;
  photos: string[];
  photoStoragePaths?: string[];
  gameScope?: DiaryGameScope;
  team: string;
  stadium: string;
  section?: string;
  block?: string;
  seatRow?: string;
  seatNumber?: string;
  ticketVerified?: boolean;
}

export interface DiaryFormData {
  type: DiaryType;
  emoji: string;
  emojiName: string;
  winningName: WinningType;
  gameId: number;
  memo: string;
  photos: string[];
  photoStoragePaths: string[];
  photoFiles: DiaryPhotoFile[];
  section?: string;
  block?: string;
  seatRow?: string;
  seatNumber?: string;
  ticketVerificationToken?: string;
  ticketVerified?: boolean;
}

export interface SaveDiaryRequest {
  date: string;
  type: DiaryType;
  emoji: string;
  emojiName: string;
  winningName: WinningType;
  gameId: number;
  memo: string;
  photos: string[];
  team: string;
  stadium: string;
  section?: string;
  block?: string;
  seatRow?: string;
  seatNumber?: string;
  ticketVerificationToken?: string;
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
  monthlyVisitCounts?: Record<string, number>;
  stadiumVisitCounts?: Record<string, number>;
  homeVisitCount?: number;
  awayVisitCount?: number;
  scheduledCount?: number;
  scopedStatistics?: Record<string, DiaryScopedStatistics>;
  happiestMonth: string | null;
  happiestCount: number;
  firstDiaryDate: string | null;
  cheerPostCount: number;
  mateParticipationCount: number;
  emojiCounts?: Record<string, number>;

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

export interface DiaryScopedStatistics {
  totalCount: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  winRate: number;
  mostVisitedStadium: string | null;
  mostVisitedCount: number;
  monthlyVisitCounts?: Record<string, number>;
  stadiumVisitCounts?: Record<string, number>;
  homeVisitCount?: number;
  awayVisitCount?: number;
  scheduledCount?: number;
  emojiCounts?: Record<string, number>;
  opponentWinRates?: Record<string, OpponentStats>;
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

export interface SeatViewAchievement {
  code: string;
  nameKo: string;
  rarity: string;
}

export interface SeatViewReward {
  pointsEarned: number;
  firstContribution: boolean;
  unlockedAchievements: SeatViewAchievement[];
  totalContributions: number;
}

// 직관 출석 등 업적 시스템 공통 DTO (backend AchievementDto와 필드 일치)
export interface AchievementDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  rarity: string;
  rarityKo: string;
  rarityColor: string;
  pointsRequired: number;
  earned: boolean;
  earnedAt: string | null;
}
