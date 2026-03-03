import api from './axios';

// ============================================
// TYPES
// ============================================

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  userName: string;
  handle?: string;
  profileImageUrl?: string;
  level: number;
  rankTitle: string;
  score: number;
  streak: number;
  maxStreak?: number;
  accuracy?: number;
  rankChange?: number;
}

export interface UserLeaderboardStats {
  userId: number;
  userName: string;
  profileImageUrl?: string;
  rank: number;
  totalScore: number;
  seasonScore: number;
  monthlyScore: number;
  weeklyScore: number;
  level: number;
  rankTitle: string;
  currentStreak: number;
  maxStreak: number;
  experiencePoints: number;
  nextLevelExp: number;
  accuracy?: number;
  totalPredictions?: number;
  correctPredictions?: number;
}

export interface HotStreak {
  userId: number;
  userName: string;
  profileImageUrl?: string;
  streak: number;
  level: number;
}

export interface RecentScore {
  id: number;
  userId: number;
  userName: string;
  eventType: string;
  score: number;
  streak: number;
  timestamp: string;
}

export interface PowerupInventory {
  MAGIC_BAT: number;
  GOLDEN_GLOVE: number;
  SCOUTER: number;
}

export interface ActivePowerup {
  type: string;
  gameId?: string;
  expiresAt?: string;
}

export interface PowerupUseResult {
  success: boolean;
  message: string;
  remainingCount: number;
}

export type LeaderboardType = 'season' | 'monthly' | 'weekly';

interface LeaderboardPageResponse {
  content?: Array<Partial<LeaderboardEntry> & { rank?: number | string }>;
  totalPages?: number;
  totalElements?: number;
}

const normalizeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string'
      ? (Number.isFinite(Number(value)) ? Number(value) : fallback)
      : fallback;

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch leaderboard rankings
 */
export async function fetchLeaderboard(
  type: LeaderboardType = 'season',
  page: number = 0,
  size: number = 20
): Promise<{ content: LeaderboardEntry[]; totalPages: number; totalElements: number }> {
  const response = await api.get<LeaderboardPageResponse>('/leaderboard', {
    params: { type, page, size },
  });

  const entries = Array.isArray(response.data?.content) ? response.data.content : [];
  const content = entries.map((entry, index) => ({
    ...entry,
    rank: normalizeNumber(entry.rank, page * size + index + 1),
    userId: normalizeNumber(entry.userId, 0),
    level: normalizeNumber(entry.level, 1),
    score: normalizeNumber(entry.score, 0),
    streak: normalizeNumber(entry.streak, 0),
    maxStreak: entry.maxStreak == null ? undefined : normalizeNumber(entry.maxStreak, 0),
    accuracy: entry.accuracy == null ? undefined : normalizeNumber(entry.accuracy, 0),
    rankChange: entry.rankChange == null ? undefined : normalizeNumber(entry.rankChange, 0),
  }));

  return {
    content,
    totalPages: normalizeNumber(response.data?.totalPages, 0),
    totalElements: normalizeNumber(response.data?.totalElements, 0),
  };
}

/**
 * Fetch current user's rank and stats
 */
export async function fetchMyRank(): Promise<UserLeaderboardStats> {
  const response = await api.get<Partial<UserLeaderboardStats>>('/leaderboard/me');
  const data = response.data ?? {};
  const fallback: UserLeaderboardStats = {
    userId: 0,
    userName: '',
    rank: 0,
    totalScore: 0,
    seasonScore: 0,
    monthlyScore: 0,
    weeklyScore: 0,
    level: 1,
    rankTitle: 'ROOKIE',
    currentStreak: 0,
    maxStreak: 0,
    experiencePoints: 0,
    nextLevelExp: 100,
  };

  return {
    ...fallback,
    ...data,
    userId: normalizeNumber(data.userId, fallback.userId),
    rank: normalizeNumber(data.rank, fallback.rank),
    totalScore: normalizeNumber(data.totalScore, fallback.totalScore),
    seasonScore: normalizeNumber(data.seasonScore, fallback.seasonScore),
    monthlyScore: normalizeNumber(data.monthlyScore, fallback.monthlyScore),
    weeklyScore: normalizeNumber(data.weeklyScore, fallback.weeklyScore),
    level: normalizeNumber(data.level, fallback.level),
    currentStreak: normalizeNumber(data.currentStreak, fallback.currentStreak),
    maxStreak: normalizeNumber(data.maxStreak, fallback.maxStreak),
    experiencePoints: normalizeNumber(data.experiencePoints, fallback.experiencePoints),
    nextLevelExp: normalizeNumber(data.nextLevelExp, fallback.nextLevelExp),
    accuracy: data.accuracy == null ? undefined : normalizeNumber(data.accuracy, 0),
    totalPredictions: data.totalPredictions == null ? undefined : normalizeNumber(data.totalPredictions, 0),
    correctPredictions: data.correctPredictions == null ? undefined : normalizeNumber(data.correctPredictions, 0),
  };
}

/**
 * Fetch users with active hot streaks
 */
export async function fetchHotStreaks(limit: number = 10): Promise<HotStreak[]> {
  const response = await api.get('/leaderboard/hot-streaks', {
    params: { limit },
  });
  return response.data;
}

/**
 * Fetch recent scoring events for live ticker
 */
export async function fetchRecentScores(limit: number = 20): Promise<RecentScore[]> {
  const response = await api.get('/leaderboard/recent-scores', {
    params: { limit },
  });
  return response.data;
}

/**
 * Fetch user's powerup inventory
 */
export async function fetchPowerups(): Promise<PowerupInventory> {
  const response = await api.get<Partial<Record<keyof PowerupInventory, number | null>>>('/leaderboard/powerups');
  const data = response.data ?? {};
  return {
    MAGIC_BAT: normalizeNumber(data.MAGIC_BAT, 0),
    GOLDEN_GLOVE: normalizeNumber(data.GOLDEN_GLOVE, 0),
    SCOUTER: normalizeNumber(data.SCOUTER, 0),
  };
}

/**
 * Fetch active powerups for current user
 */
export async function fetchActivePowerups(): Promise<ActivePowerup[]> {
  const response = await api.get('/leaderboard/powerups/active');
  return response.data;
}

/**
 * Use a powerup for a specific game
 */
export async function usePowerup(
  type: string,
  gameId?: string
): Promise<PowerupUseResult> {
  const response = await api.post(`/leaderboard/powerups/${type}/use`, { gameId });
  return response.data;
}

/**
 * Get leaderboard ranking for a specific user
 */
export async function fetchUserRank(userId: number): Promise<{
  rank: number;
  score: number;
  level: number;
}> {
  const response = await api.get<Partial<{ rank: number; score: number; level: number }>>(`/leaderboard/users/${userId}/rank`);
  return {
    rank: normalizeNumber(response.data?.rank, 0),
    score: normalizeNumber(response.data?.score, 0),
    level: normalizeNumber(response.data?.level, 0),
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format score event for ticker display
 */
export function formatScoreEvent(event: RecentScore): {
  id: string;
  text: string;
  type: 'fire' | 'streak' | 'upset' | 'perfect' | 'levelup' | 'normal';
} {
  let type: 'fire' | 'streak' | 'upset' | 'perfect' | 'levelup' | 'normal' = 'normal';
  let text = `${event.userName} +${event.score}PTS`;

  if (event.streak >= 7) {
    type = 'fire';
    text += ` (${event.streak}연승!)`;
  } else if (event.streak >= 3) {
    type = 'streak';
    text += ` (${event.streak}연승)`;
  }

  if (event.eventType === 'UPSET_BONUS') {
    type = 'upset';
    text = `${event.userName} UPSET 예측 성공! +${event.score}PTS`;
  } else if (event.eventType === 'PERFECT_DAY') {
    type = 'perfect';
    text = `${event.userName} PERFECT DAY 달성! +${event.score}PTS`;
  } else if (event.eventType === 'SEAT_VIEW_CONTRIBUTION') {
    type = 'fire';
    text = `${event.userName} 시야 사진 기여! +${event.score}PTS`;
  }

  return {
    id: `${event.id}-${event.timestamp}`,
    text,
    type,
  };
}

/**
 * Calculate XP needed for next level
 */
export function calculateNextLevelXP(level: number): number {
  return Math.pow(level, 2) * 100;
}

/**
 * Get rank tier from level
 */
export function getRankTierFromLevel(level: number): string {
  if (level <= 10) return 'ROOKIE';
  if (level <= 30) return 'MINOR_LEAGUER';
  if (level <= 60) return 'MAJOR_LEAGUER';
  return 'HALL_OF_FAME';
}
