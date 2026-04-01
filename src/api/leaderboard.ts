import api from './axios';

// ============================================
// TYPES
// ============================================

export interface LeaderboardEntry {
  rank: number;
  handle?: string | null;
  userName: string;
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
  handle?: string | null;
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
  handle?: string | null;
  userName: string;
  profileImageUrl?: string;
  streak: number;
  level: number;
}

export interface RecentScore {
  id: number;
  handle?: string | null;
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
 * Fetch current user's rank and stats
 */
export async function fetchMyRank(): Promise<UserLeaderboardStats> {
  const response = await api.get<Partial<UserLeaderboardStats>>('/leaderboard/me');
  const data = response.data ?? {};
  const fallback: UserLeaderboardStats = {
    handle: null,
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
    handle: typeof data.handle === 'string' ? data.handle : fallback.handle,
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
