import { useQuery } from '@tanstack/react-query';
import type { Ranking, RankingSnapshot } from '../types/home';
import { formatDateForAPI } from '../utils/home';
import { publicGet } from './publicClient';

export const RANKING_SNAPSHOT_QUERY_KEY = (dateKey: string, seasonYear?: number) => ['ranking-snapshot', dateKey, seasonYear ?? 'auto'] as const;

interface FetchRankingSnapshotOptions {
  date?: Date;
  seasonYear?: number;
}

const isRankingSnapshot = (value: unknown): value is RankingSnapshot => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.rankingSeasonYear === 'number'
    && typeof candidate.rankingSourceMessage === 'string'
    && typeof candidate.isOffSeason === 'boolean'
    && Array.isArray(candidate.rankings);
};

const inferRankingSeasonYear = (options: FetchRankingSnapshotOptions): number => {
  if (options.seasonYear != null) {
    return options.seasonYear;
  }

  if (options.date) {
    const parsed = new Date(options.date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getFullYear();
    }
  }

  return new Date().getFullYear();
};

const normalizeRankingSnapshot = (
  value: unknown,
  options: FetchRankingSnapshotOptions,
): RankingSnapshot => {
  if (isRankingSnapshot(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    const rankingSeasonYear = inferRankingSeasonYear(options);
    const rankings = value as Ranking[];

    return {
      rankingSeasonYear,
      rankingSourceMessage: rankings.length > 0
        ? `${rankingSeasonYear} 시즌 순위 데이터`
        : `${rankingSeasonYear} 시즌 데이터가 아직 집계되지 않았습니다.`,
      isOffSeason: false,
      rankings,
    };
  }

  throw new Error('Invalid ranking snapshot response');
};

export const fetchRankingSnapshot = async (
  options: FetchRankingSnapshotOptions = {},
): Promise<RankingSnapshot> => {
  if (options.seasonYear != null) {
    const data = await publicGet<unknown>(`/kbo/rankings/${options.seasonYear}`);
    return normalizeRankingSnapshot(data, options);
  }

  const params: Record<string, string | number> = {};
  if (options.date) {
    params.date = formatDateForAPI(options.date);
  }

  const data = await publicGet<unknown>('/kbo/rankings/snapshot', {
    ...(Object.keys(params).length > 0 ? { params } : {}),
  });

  return normalizeRankingSnapshot(data, options);
};

export const getRankingSnapshotQueryOptions = (
  options: FetchRankingSnapshotOptions = {},
) => {
  const dateKey = options.date ? formatDateForAPI(options.date) : 'today';

  return {
    queryKey: RANKING_SNAPSHOT_QUERY_KEY(dateKey, options.seasonYear),
    queryFn: () => fetchRankingSnapshot(options),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  } as const;
};

export const useRankingSnapshot = (
  options: FetchRankingSnapshotOptions = {},
) => useQuery(getRankingSnapshotQueryOptions(options));
