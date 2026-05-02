import { privateDelete, privateGet, privatePost } from './privateClient';
import { publicGet } from './publicClient';
import { parseError } from '../utils/errorUtils';
import {
  Game,
  GameDetail,
  GameLiveEvent,
  GameLiveSnapshot,
  GameLiveSummary,
  GameRelayEvent,
  GameRelaySnapshot,
  MatchBounds,
  MatchDayNavigation,
  UserPredictionStat,
} from '../types/prediction';

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

export interface LiveSnapshotFetchOptions extends FetchOptions {
  afterSeq?: number | null;
  limit?: number;
}

export interface LiveRelayFetchOptions extends FetchOptions {
  afterId?: number | null;
  limit?: number;
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = `${value}`.trim();
  return text ? text : null;
};

const toLiveEvent = (value: unknown): GameLiveEvent | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const source = value as Record<string, unknown>;
  return {
    eventSeq: toNullableNumber(source.eventSeq ?? source.event_seq),
    inning: toNullableNumber(source.inning),
    inningHalf: toNullableString(source.inningHalf ?? source.inning_half),
    outs: toNullableNumber(source.outs),
    batterName: toNullableString(source.batterName ?? source.batter_name),
    pitcherName: toNullableString(source.pitcherName ?? source.pitcher_name),
    description: toNullableString(source.description),
    eventType: toNullableString(source.eventType ?? source.event_type),
    resultCode: toNullableString(source.resultCode ?? source.result_code),
    rbi: toNullableNumber(source.rbi),
    basesBefore: toNullableString(source.basesBefore ?? source.bases_before),
    basesAfter: toNullableString(source.basesAfter ?? source.bases_after),
    homeScore: toNullableNumber(source.homeScore ?? source.home_score),
    awayScore: toNullableNumber(source.awayScore ?? source.away_score),
    wpa: toNullableNumber(source.wpa),
    winExpectancyBefore: toNullableNumber(source.winExpectancyBefore ?? source.win_expectancy_before),
    winExpectancyAfter: toNullableNumber(source.winExpectancyAfter ?? source.win_expectancy_after),
    updatedAt: toNullableString(source.updatedAt ?? source.updated_at),
  };
};

const toLiveSnapshot = (value: unknown, fallbackGameId: string): GameLiveSnapshot => {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const events = Array.isArray(source.events)
    ? source.events.map(toLiveEvent).filter((event): event is GameLiveEvent => Boolean(event))
    : [];

  return {
    gameId: toNullableString(source.gameId ?? source.game_id) || fallbackGameId,
    gameStatus: toNullableString(source.gameStatus ?? source.game_status),
    homeScore: toNullableNumber(source.homeScore ?? source.home_score),
    awayScore: toNullableNumber(source.awayScore ?? source.away_score),
    currentInning: toNullableNumber(source.currentInning ?? source.current_inning),
    currentInningHalf: toNullableString(source.currentInningHalf ?? source.current_inning_half),
    lastEventSeq: toNullableNumber(source.lastEventSeq ?? source.last_event_seq),
    lastUpdatedAt: toNullableString(source.lastUpdatedAt ?? source.last_updated_at),
    events,
  };
};

const toRelayEvent = (value: unknown): GameRelayEvent | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const source = value as Record<string, unknown>;
  return {
    relayId: toNullableNumber(source.relayId ?? source.relay_id ?? source.id),
    inning: toNullableNumber(source.inning),
    inningHalf: toNullableString(source.inningHalf ?? source.inning_half),
    pitcherName: toNullableString(source.pitcherName ?? source.pitcher_name),
    batterName: toNullableString(source.batterName ?? source.batter_name),
    playDescription: toNullableString(source.playDescription ?? source.play_description),
    eventType: toNullableString(source.eventType ?? source.event_type),
    result: toNullableString(source.result),
    createdAt: toNullableString(source.createdAt ?? source.created_at),
    updatedAt: toNullableString(source.updatedAt ?? source.updated_at),
  };
};

const toRelaySnapshot = (value: unknown, fallbackGameId: string): GameRelaySnapshot => {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const events = Array.isArray(source.events)
    ? source.events.map(toRelayEvent).filter((event): event is GameRelayEvent => Boolean(event))
    : [];

  return {
    gameId: toNullableString(source.gameId ?? source.game_id) || fallbackGameId,
    lastRelayId: toNullableNumber(source.lastRelayId ?? source.last_relay_id),
    lastUpdatedAt: toNullableString(source.lastUpdatedAt ?? source.last_updated_at),
    events,
  };
};

const toLiveSummary = (value: unknown): GameLiveSummary | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const source = value as Record<string, unknown>;
  const gameId = toNullableString(source.gameId ?? source.game_id);
  if (!gameId) {
    return null;
  }
  return {
    gameId,
    gameStatus: toNullableString(source.gameStatus ?? source.game_status),
    homeScore: toNullableNumber(source.homeScore ?? source.home_score),
    awayScore: toNullableNumber(source.awayScore ?? source.away_score),
    lastEventSeq: toNullableNumber(source.lastEventSeq ?? source.last_event_seq),
    lastUpdatedAt: toNullableString(source.lastUpdatedAt ?? source.last_updated_at),
  };
};

export const fetchMatchesByDay = async (
  date: string,
  options: FetchOptions = {}
): Promise<MatchDayResult> => {
  try {
    const data = await publicGet<MatchDayNavigation>('/matches/day', {
      params: { date },
      signal: options.signal,
    });
    return {
      ok: true,
      data,
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
  return publicGet<Game[]>('/games/past');
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
  const response = await publicGet<Game[] | MatchRangePageMeta>('/matches/range', {
    params: {
      startDate,
      endDate,
      page: Math.max(0, page),
      size: Math.max(1, Math.min(500, size)),
      includePast,
      withMeta,
    },
  });
  if (Array.isArray(response)) {
    return response;
  }

  return response.content;
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
    const data = await publicGet<Game[] | MatchRangePageMeta>('/matches/range', {
      params: {
        startDate,
        endDate,
        page: Math.max(0, page),
        size: Math.max(1, Math.min(500, size)),
        includePast,
        withMeta,
      },
    });
    if (Array.isArray(data)) {
      return {
        ok: true,
        data,
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

/**
 * 특정 날짜의 경기 데이터 가져오기
 */
export const fetchMatchesByDate = async (date: string): Promise<Game[]> => {
  return publicGet<Game[]>('/matches', {
    params: { date },
  });
};

/**
 * 특정 경기 상세 데이터 가져오기
 */
export const fetchGameDetail = async (gameId: string, options?: FetchOptions): Promise<GameDetail> => {
  return publicGet<GameDetail>(`/matches/${gameId}`, {
    signal: options?.signal,
  });
};

export const fetchGameDetailResult = async (
  gameId: string,
  options?: FetchOptions
): Promise<GameDetailResult> => {
  try {
    return {
      ok: true,
      data: await publicGet<GameDetail>(`/matches/${gameId}`, {
        signal: options?.signal,
      }),
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

export const fetchGameLiveSnapshot = async (
  gameId: string,
  options: LiveSnapshotFetchOptions = {},
): Promise<GameLiveSnapshot> => {
  const normalizedGameId = gameId.trim();
  const data = await publicGet<unknown>(`/matches/${normalizedGameId}/live`, {
    params: {
      afterSeq: options.afterSeq == null ? undefined : Math.max(0, options.afterSeq),
      limit: options.limit,
    },
    signal: options.signal,
  });
  return toLiveSnapshot(data, normalizedGameId);
};

export const fetchGameLiveRelaySnapshot = async (
  gameId: string,
  options: LiveRelayFetchOptions = {},
): Promise<GameRelaySnapshot> => {
  const normalizedGameId = gameId.trim();
  const data = await publicGet<unknown>(`/matches/${normalizedGameId}/live-relay`, {
    params: {
      afterId: options.afterId == null ? undefined : Math.max(0, options.afterId),
      limit: options.limit,
    },
    signal: options.signal,
  });
  return toRelaySnapshot(data, normalizedGameId);
};

export const fetchGameLiveSummaries = async (
  gameIds: string[],
  options: FetchOptions = {},
): Promise<GameLiveSummary[]> => {
  const normalizedGameIds = Array.from(new Set(gameIds.map((gameId) => gameId.trim()).filter(Boolean)));
  if (normalizedGameIds.length === 0) {
    return [];
  }

  const data = await publicGet<unknown>('/matches/live', {
    params: {
      gameIds: normalizedGameIds.join(','),
    },
    signal: options.signal,
  });
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(toLiveSummary).filter((summary): summary is GameLiveSummary => Boolean(summary));
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

  const response = await privatePost<MyVotesResponse, MyVotesRequest>('/predictions/my-votes', {
    gameIds: Array.from(new Set(gameIds)).filter((gameId) => gameId),
  });
  return extractVotesById(response);
};

/**
 * 투표 현황 가져오기
 */
export const fetchVoteStatus = async (
  gameId: string,
  options?: FetchOptions
): Promise<VoteStatusResult> => {
  try {
    const response = await publicGet<VoteStatus>(`/predictions/status/${gameId}`, {
      signal: options?.signal,
    });
    const normalizedData = extractVoteStatusPayload(response);

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
  await privatePost('/predictions/vote', { gameId, votedTeam });
  return true;
};

/**
 * 투표 취소하기
 */
export const cancelVote = async (gameId: string): Promise<boolean> => {
  await privateDelete(`/predictions/${gameId}`);
  return true;
};

/**
 * 내 예측 통계 조회
 */
export const fetchMyPredictionStats = async (): Promise<UserPredictionStat> => {
  const response = await privateGet<{ success: boolean; data: UserPredictionStat }>('/prediction/stats/me');
  return response.data;
};
