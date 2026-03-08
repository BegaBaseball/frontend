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
    return response.data?.votes || {};
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

    return {
      ok: true,
      data: {
        homeVotes: response.data.homeVotes,
        awayVotes: response.data.awayVotes,
        totalVotes: response.data.totalVotes,
      },
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
