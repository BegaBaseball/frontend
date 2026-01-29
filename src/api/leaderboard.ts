import api from './axios';

// ============================================
// TYPES
// ============================================

export interface LeaderboardEntry {
  userId: number;
  userName: string;
  handle?: string;
  profileImageUrl?: string;
  level: number;
  rankTitle: string;
  score: number;
  streak: number;
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
  const response = await api.get('/leaderboard', {
    params: { type, page, size },
  });
  return response.data;
}

/**
 * Fetch current user's rank and stats
 */
export async function fetchMyRank(): Promise<UserLeaderboardStats> {
  const response = await api.get('/leaderboard/me');
  return response.data;
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
  const response = await api.get('/leaderboard/powerups');
  return response.data;
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
  const response = await api.get(`/leaderboard/users/${userId}/rank`);
  return response.data;
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
