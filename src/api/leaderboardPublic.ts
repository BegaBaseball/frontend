import { publicGet } from './publicClient';
import type {
  HotStreak,
  LeaderboardEntry,
  LeaderboardType,
  RecentScore,
} from './leaderboard';

export type { LeaderboardType } from './leaderboard';

interface LeaderboardPageResponse {
  content?: Array<Partial<LeaderboardEntry> & { rank?: number | string; handle?: string | null }>;
  totalPages?: number;
  totalElements?: number;
}

const normalizeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string'
      ? (Number.isFinite(Number(value)) ? Number(value) : fallback)
      : fallback;

export async function fetchLeaderboard(
  type: LeaderboardType = 'season',
  page: number = 0,
  size: number = 20,
): Promise<{ content: LeaderboardEntry[]; totalPages: number; totalElements: number }> {
  const data = await publicGet<LeaderboardPageResponse>('/leaderboard', {
    params: { type, page, size },
  });

  const entries = Array.isArray(data?.content) ? data.content : [];
  const content = entries.map((entry, index) => ({
    ...entry,
    userName: entry.userName || '',
    rank: normalizeNumber(entry.rank, page * size + index + 1),
    handle: typeof entry.handle === 'string' ? entry.handle : null,
    level: normalizeNumber(entry.level, 1),
    score: normalizeNumber(entry.score, 0),
    streak: normalizeNumber(entry.streak, 0),
    maxStreak: entry.maxStreak == null ? undefined : normalizeNumber(entry.maxStreak, 0),
    accuracy: entry.accuracy == null ? undefined : normalizeNumber(entry.accuracy, 0),
    rankChange: entry.rankChange == null ? undefined : normalizeNumber(entry.rankChange, 0),
    rankTitle: entry.rankTitle || '',
  }));

  return {
    content,
    totalPages: normalizeNumber(data?.totalPages, 0),
    totalElements: normalizeNumber(data?.totalElements, 0),
  };
}

export async function fetchHotStreaks(limit: number = 10): Promise<HotStreak[]> {
  return publicGet<HotStreak[]>('/leaderboard/hot-streaks', {
    params: { limit },
  });
}

export async function fetchRecentScores(limit: number = 20): Promise<RecentScore[]> {
  return publicGet<RecentScore[]>('/leaderboard/recent-scores', {
    params: { limit },
  });
}

export async function fetchUserRank(handle: string): Promise<{
  rank: number;
  score: number;
  level: number;
}> {
  const data = await publicGet<Partial<{ rank: number; score: number; level: number }>>(
    `/leaderboard/profile/${encodeURIComponent(handle)}/rank`,
  );

  return {
    rank: normalizeNumber(data?.rank, 0),
    score: normalizeNumber(data?.score, 0),
    level: normalizeNumber(data?.level, 0),
  };
}

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
