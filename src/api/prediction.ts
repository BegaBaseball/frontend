import api from './axios';
import { parseError } from '../utils/errorUtils';
import { Game, GameDetail, MatchBounds, MatchDayNavigation, UserPredictionStat } from '../types/prediction';

export interface MyVotesRequest {
  gameIds: string[];
}

export interface MyVotesResponse {
  votes: {
    [key: string]: 'home' | 'away' | null;
  };
}

export interface VoteStatus {
  homeVotes: number;
  awayVotes: number;
  totalVotes?: number;
}

const normalizeCount = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const unwrapPredictionEnvelope = (source: unknown): unknown => {
  let current = source;
  let depth = 0;

  while (depth < 5 && current && typeof current === 'object') {
    const candidate = current as Record<string, unknown>;

    const next =
      ('data' in candidate && candidate.data && typeof candidate.data === 'object') ? candidate.data
      : ('result' in candidate && candidate.result && typeof candidate.result === 'object') ? candidate.result
      : ('payload' in candidate && candidate.payload && typeof candidate.payload === 'object') ? candidate.payload
      : undefined;

    if (!next) {
      break;
    }

    current = next;
    depth += 1;
  }

  return current;
};

const extractVoteStatusPayload = (payload: unknown): VoteStatus => {
  if (!payload || typeof payload !== 'object') {
    return {
      homeVotes: 0,
      awayVotes: 0,
      totalVotes: undefined,
    };
  }

  const data = unwrapPredictionEnvelope(payload);
  if (!data || typeof data !== 'object') {
    return {
      homeVotes: 0,
      awayVotes: 0,
      totalVotes: undefined,
    };
  }

  const votePayload = data as Record<string, unknown>;
  const candidateCounts = (() => {
    if (votePayload.counts && typeof votePayload.counts === 'object' && !Array.isArray(votePayload.counts)) {
      return votePayload.counts as Record<string, unknown>;
    }
    if (votePayload.vote && typeof votePayload.vote === 'object' && !Array.isArray(votePayload.vote)) {
      return votePayload.vote as Record<string, unknown>;
    }
    return votePayload;
  })();

  const readHome = (obj: Record<string, unknown>) => (
    obj.homeVotes
    ?? obj.home_votes
    ?? obj.homeVote
    ?? obj.home_vote
    ?? obj.home
    ?? obj.HOME
    ?? obj.homeVoteCount
    ?? obj.home_count
    ?? obj.homeTotal
  );
  const readAway = (obj: Record<string, unknown>) => (
    obj.awayVotes
    ?? obj.away_votes
    ?? obj.awayVote
    ?? obj.away_vote
    ?? obj.away
    ?? obj.AWAY
    ?? obj.awayVoteCount
    ?? obj.away_count
    ?? obj.awayTotal
  );
  const readTotal = (obj: Record<string, unknown>) => (
    obj.totalVotes
    ?? obj.total_votes
    ?? obj.total
    ?? obj.totalVote
    ?? obj.total_vote
    ?? obj.voteTotal
    ?? obj.vote_total
    ?? obj.total_count
    ?? obj.vote_total_count
  );

  const homeVotes = normalizeCount(readHome(votePayload) ?? readHome(candidateCounts));
  const awayVotes = normalizeCount(readAway(votePayload) ?? readAway(candidateCounts));
  const rawTotal = readTotal(votePayload) ?? readTotal(candidateCounts);
  const totalVotes = rawTotal === undefined || rawTotal === null ? undefined : normalizeCount(rawTotal);

  return {
    homeVotes,
    awayVotes,
    totalVotes,
  };
};

const normalizeVoteValue = (value: unknown): 'home' | 'away' | null => {
  if (value == null) {
    return null;
  }
  if (value === 'home' || value === 'away') {
    return value;
  }
  if (value === 'HOME' || value === 'AWAY') {
    return value === 'HOME' ? 'home' : 'away';
  }
  return value === 1 ? 'home' : value === 2 ? 'away' : null;
};

const normalizeVoteRecord = (candidate: Record<string, unknown>): MyVotesResponse['votes'] => {
  return Object.entries(candidate).reduce<MyVotesResponse['votes']>((acc, [gameId, value]) => {
    if (!gameId || typeof gameId !== 'string') {
      return acc;
    }

    const normalized = normalizeVoteValue(value);
    if (normalized === null) {
      return acc;
    }

    acc[gameId] = normalized;
    return acc;
  }, {});
};

const extractVotesById = (payload: unknown): MyVotesResponse['votes'] => {
  const data = unwrapPredictionEnvelope(payload);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }

  const current = data as Record<string, unknown>;
  const direct = current.votes;
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    return normalizeVoteRecord(direct as Record<string, unknown>);
  }

  const directKeys = Object.keys(current);
  if (directKeys.length > 0) {
    const maybeVoteRecord = normalizeVoteRecord(current);
    if (Object.keys(maybeVoteRecord).length > 0) {
      return maybeVoteRecord;
    }
  }

  return {};
};

export interface VoteStatusSuccess {
  ok: true;
  data: VoteStatus;
}

export interface VoteStatusFailure {
  ok: false;
  error: {
    message: string;
    status?: number | null;
    code?: string;
  };
}

export type VoteStatusResult = VoteStatusSuccess | VoteStatusFailure;

export interface ApiErrorDetail {
  message: string;
  status?: number | null;
  code?: string;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiErrorDetail;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface MatchRangeRequest {
  startDate: string;
  endDate: string;
  page?: number;
  size?: number;
  includePast?: boolean;
  withMeta?: boolean;
}

export interface MatchRangePageMeta {
  content: Game[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type MatchRangeResult = ApiResult<Game[] | MatchRangePageMeta>;
export type GameDetailResult = ApiResult<GameDetail>;
export type MatchDayResult = ApiResult<MatchDayNavigation>;

export interface FetchOptions {
  signal?: AbortSignal;
}

export const fetchMatchBounds = async (): Promise<ApiResult<MatchBounds>> => {
  try {
    const response = await api.get<MatchBounds>('/matches/bounds', {
      skipGlobalErrorHandler: true,
    });
    return {
      ok: true,
      data: response.data,
    };
  } catch (error) {
    const parsed = parseError(error);
    return {
      ok: false,
      error: {
        message: parsed.message || '경기 경계 조회에 실패했습니다.',
        status: parsed.statusCode,
        code: parsed.responseCode,
      },
    };
  }
};

export const fetchMatchesByDay = async (
  date: string,
  options: FetchOptions = {}
): Promise<MatchDayResult> => {
  try {
    const params = new URLSearchParams({ date });
    const response = await api.get<MatchDayNavigation>(`/matches/day?${params}`, {
      signal: options.signal,
      skipGlobalErrorHandler: true,
    });
    return {
      ok: true,
      data: response.data,
    };
  } catch (error) {
    const parsed = parseError(error);
    return {
      ok: false,
      error: {
        message: parsed.message || '경기일 조회에 실패했습니다.',
        status: parsed.statusCode,
        code: parsed.responseCode,
      },
    };
  }
};

/**
 * 과거 경기 데이터 가져오기
 */
export const fetchPastGames = async (): Promise<Game[]> => {
  const response = await api.get<Game[]>('/games/past');
  return response.data;
};

/**
 * 특정 기간의 경기 데이터 가져오기
 */
export const fetchMatchesByRange = async ({
  startDate,
  endDate,
  page = 0,
  size = 150,
  includePast = true,
  withMeta = false,
}: MatchRangeRequest): Promise<Game[]> => {
  const params = new URLSearchParams({
    startDate,
    endDate,
    page: Math.max(0, page).toString(),
    size: Math.max(1, Math.min(500, size)).toString(),
    includePast: includePast ? 'true' : 'false',
    withMeta: withMeta ? 'true' : 'false',
  });

  const response = await api.get<Game[] | MatchRangePageMeta>(`/matches/range?${params}`, {
    skipGlobalErrorHandler: true,
  });
  if (Array.isArray(response.data)) {
    return response.data;
  }

  return response.data.content;
};

export const fetchMatchesByRangeWithMeta = async ({
  startDate,
  endDate,
  page = 0,
  size = 150,
  includePast = true,
}: MatchRangeRequest): Promise<ApiResult<MatchRangePageMeta>> => {
  try {
    const params = new URLSearchParams({
      startDate,
      endDate,
      page: Math.max(0, page).toString(),
      size: Math.max(1, Math.min(500, size)).toString(),
      includePast: includePast ? 'true' : 'false',
      withMeta: 'true',
    });

    const response = await api.get<MatchRangePageMeta | Game[]>(`/matches/range?${params}`, {
      skipGlobalErrorHandler: true,
    });
    const data = response.data;

    if (Array.isArray(data)) {
      return {
        ok: true,
        data: {
          content: data,
          page,
          size: Math.max(1, Math.min(500, size)),
          totalElements: data.length,
          totalPages: data.length ? 1 : 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error) {
    const parsed = parseError(error);
    return {
      ok: false,
      error: {
        message: parsed.message || '경기 목록 조회에 실패했습니다.',
        status: parsed.statusCode,
        code: parsed.responseCode,
      },
    };
  }
};

export const fetchMatchesByRangeResult = async ({
  startDate,
  endDate,
  page = 0,
  size = 150,
  includePast = true,
  withMeta = false,
}: MatchRangeRequest): Promise<MatchRangeResult> => {
  try {
    const params = new URLSearchParams({
      startDate,
      endDate,
      page: Math.max(0, page).toString(),
      size: Math.max(1, Math.min(500, size)).toString(),
      includePast: includePast ? 'true' : 'false',
      withMeta: withMeta ? 'true' : 'false',
    });

    const response = await api.get<Game[] | MatchRangePageMeta>(`/matches/range?${params}`, {
      skipGlobalErrorHandler: true,
    });
    if (Array.isArray(response.data)) {
      return {
        ok: true,
        data: response.data,
      };
    }

    return {
      ok: true,
      data: response.data,
    };
  } catch (error) {
    const parsed = parseError(error);
    return {
      ok: false,
      error: {
        message: parsed.message || '경기 목록 조회에 실패했습니다.',
        status: parsed.statusCode,
        code: parsed.responseCode,
      },
    };
  }
};

/**
 * 특정 날짜의 경기 데이터 가져오기
 */
export const fetchMatchesByDate = async (date: string): Promise<Game[]> => {
  const response = await api.get<Game[]>(`/matches?date=${date}`);
  return response.data;
};

/**
 * 특정 경기 상세 데이터 가져오기
 */
export const fetchGameDetail = async (gameId: string, options?: FetchOptions): Promise<GameDetail> => {
  const config = {
    ...(options?.signal ? { signal: options.signal } : {}),
    skipGlobalErrorHandler: true,
  };
  const response = await api.get<GameDetail>(`/matches/${gameId}`, config);
  return response.data;
};

export const fetchGameDetailResult = async (
  gameId: string,
  options?: FetchOptions
): Promise<GameDetailResult> => {
  try {
    const config = {
      ...(options?.signal ? { signal: options.signal } : {}),
      skipGlobalErrorHandler: true,
    };
    const response = await api.get<GameDetail>(`/matches/${gameId}`, config);
    return {
      ok: true,
      data: response.data,
    };
  } catch (error) {
    const parsed = parseError(error);
    return {
      ok: false,
      error: {
        message: parsed.message || '경기 상세 정보를 가져오지 못했습니다.',
        status: parsed.statusCode,
        code: parsed.responseCode,
      },
    };
  }
};

/**
 * 특정 경기의 사용자 투표 조회
 */
export const fetchUserVote = async (gameId: string): Promise<string | null> => {
  // prediction 페이지는 단건/배치 혼재를 피하려고 my-votes 배치 API만 사용한다.
  const normalizedGameId = gameId.trim();
  if (!normalizedGameId) {
    return null;
  }

  try {
    const votes = await fetchAllUserVotesBulk([normalizedGameId]);
    return votes[normalizedGameId] || null;
  } catch {
    return null;
  }
};

export const fetchAllUserVotesBulk = async (
  gameIds: string[]
): Promise<{ [key: string]: 'home' | 'away' | null }> => {
  if (!gameIds.length) {
    return {};
  }

  try {
    const response = await api.post<MyVotesResponse>('/predictions/my-votes', {
      gameIds: Array.from(new Set(gameIds)).filter((gameId) => gameId),
    } as MyVotesRequest, {
      skipGlobalErrorHandler: true,
    });
    return extractVotesById(response.data);
  } catch (error) {
    const parsedError = parseError(error);
    if (!error || typeof error !== 'object' || !('status' in error)) {
      throw error;
    }
    throw new Error(parsedError.message || '배열 투표 조회에 실패했습니다.');
  }
};

/**
 * 투표 현황 가져오기
 */
export const fetchVoteStatus = async (
  gameId: string,
  options?: FetchOptions
): Promise<VoteStatusResult> => {
  try {
    const response = await api.get<VoteStatus>(`/predictions/status/${gameId}`, {
      signal: options?.signal,
      skipGlobalErrorHandler: true,
    });
    const normalizedData = extractVoteStatusPayload(response.data);

    return {
      ok: true,
      data: normalizedData,
    };
  } catch (error) {
    const parsed = parseError(error);
    return {
      ok: false,
      error: {
        message: parsed.message || '투표 상태를 가져오지 못했습니다.',
        status: parsed.statusCode,
        code: parsed.responseCode,
      },
    };
  }
};

/**
 * 투표하기
 */
export const submitVote = async (gameId: string, votedTeam: 'home' | 'away'): Promise<boolean> => {
  await api.post('/predictions/vote', { gameId, votedTeam }, {
    skipGlobalErrorHandler: true,
  });
  return true;
};

/**
 * 투표 취소하기
 */
export const cancelVote = async (gameId: string): Promise<boolean> => {
  await api.delete(`/predictions/${gameId}`, {
    skipGlobalErrorHandler: true,
  });
  return true;
};

/**
 * 내 예측 통계 조회
 */
export const fetchMyPredictionStats = async (): Promise<UserPredictionStat> => {
  const response = await api.get<{ success: boolean; data: UserPredictionStat }>('/prediction/stats/me');
  return response.data.data;
};
