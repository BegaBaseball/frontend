import { publicGet } from './publicClient';
import { toPredictionGameDetail, toPredictionMatchDayNavigation } from './predictionMappers';
import type { OpenApiResponseBody } from './openapiTypes';
import { parseError } from '../utils/errorUtils';
import type { GameDetail, MatchDayNavigation } from '../types/prediction';
import type { VoteStatus as PredictionVoteStatus } from './prediction';

const PREDICTION_BOOTSTRAP_TTL_MS = 30 * 1000;
export const PREDICTION_BOOTSTRAP_INVALIDATED_EVENT = 'prediction-bootstrap-invalidated';

type PredictionBootstrapWireResponse = OpenApiResponseBody<'/api/predictions/bootstrap', 'get'>;
type PredictionBootstrapWireDetailResource = NonNullable<PredictionBootstrapWireResponse['detail']>;
type PredictionBootstrapWireVoteStatusResource = NonNullable<PredictionBootstrapWireResponse['voteStatus']>;
type PredictionBootstrapWireError = NonNullable<
  PredictionBootstrapWireDetailResource['error'] | PredictionBootstrapWireVoteStatusResource['error']
>;
type PredictionBootstrapWireResource<T> = {
  ok?: boolean;
  data?: T | null;
  error?: PredictionBootstrapWireError | null;
};

export interface PredictionBootstrapError {
  message: string;
  status?: number | null;
  code?: string;
}

export interface PredictionBootstrapResource<T> {
  ok: boolean;
  data: T | null;
  error: PredictionBootstrapError | null;
}

export interface PredictionBootstrapResponse {
  schedule: MatchDayNavigation;
  selectedGameId: string | null;
  selectedGameFound: boolean;
  detail: PredictionBootstrapResource<GameDetail> | null;
  voteStatus: PredictionBootstrapResource<PredictionVoteStatus> | null;
}

export interface PredictionBootstrapSuccess {
  ok: true;
  data: PredictionBootstrapResponse;
}

export interface PredictionBootstrapFailure {
  ok: false;
  error: PredictionBootstrapError;
}

export type PredictionBootstrapResult = PredictionBootstrapSuccess | PredictionBootstrapFailure;

type PredictionBootstrapCacheEntry = {
  data: PredictionBootstrapResponse;
  fetchedAt: number;
};

const predictionBootstrapCache = new Map<string, PredictionBootstrapCacheEntry>();
const predictionBootstrapRequests = new Map<string, Promise<PredictionBootstrapResult>>();

const getPredictionBootstrapRuntimeScope = () => {
  if (typeof window === 'undefined') {
    return 'server';
  }

  return `${window.location.origin}:${Math.round(window.performance?.timeOrigin || Date.now())}`;
};

const buildBootstrapCacheKey = (date: string, gameId?: string | null) => (
  `${getPredictionBootstrapRuntimeScope()}:${date}:${gameId || ''}`
);

const normalizeBootstrapResource = <TWire, TData>(
  resource: PredictionBootstrapWireResource<TWire> | null | undefined,
  normalizeData: (data: TWire) => TData
): PredictionBootstrapResource<TData> | null => {
  if (!resource || typeof resource !== 'object') {
    return null;
  }
  return {
    ok: resource.ok === true,
    data: resource.data == null ? null : normalizeData(resource.data),
    error: normalizeBootstrapError(resource.error),
  };
};

const normalizeBootstrapError = (
  error: PredictionBootstrapWireError | null | undefined
): PredictionBootstrapError | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  return {
    message: error.message || '요청 처리에 실패했습니다.',
    status: error.status ?? null,
    code: error.code ?? undefined,
  };
};

const toGameDetail = (detail: NonNullable<PredictionBootstrapWireDetailResource['data']>): GameDetail => (
  toPredictionGameDetail(detail)
);

const toVoteStatus = (voteStatus: NonNullable<PredictionBootstrapWireVoteStatusResource['data']>): PredictionVoteStatus => (
  voteStatus as PredictionVoteStatus
);

export const invalidatePredictionBootstrapCache = (gameId?: string | null) => {
  if (!gameId) {
    predictionBootstrapCache.clear();
    predictionBootstrapRequests.clear();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PREDICTION_BOOTSTRAP_INVALIDATED_EVENT));
    }
    return;
  }

  const normalizedGameId = gameId.trim();
  Array.from(predictionBootstrapCache.keys()).forEach((key) => {
    if (key.endsWith(`:${normalizedGameId}`)) {
      predictionBootstrapCache.delete(key);
    }
  });
  Array.from(predictionBootstrapRequests.keys()).forEach((key) => {
    if (key.endsWith(`:${normalizedGameId}`)) {
      predictionBootstrapRequests.delete(key);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PREDICTION_BOOTSTRAP_INVALIDATED_EVENT, {
      detail: {
        gameId: normalizedGameId,
      },
    }));
  }
};

export const clearPredictionBootstrapCacheForTests = () => {
  invalidatePredictionBootstrapCache();
};

export const fetchPredictionBootstrap = async (
  date: string,
  gameId?: string | null
): Promise<PredictionBootstrapResult> => {
  const normalizedDate = date.trim();
  const normalizedGameId = gameId?.trim() || null;
  const cacheKey = buildBootstrapCacheKey(normalizedDate, normalizedGameId);
  const cached = predictionBootstrapCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < PREDICTION_BOOTSTRAP_TTL_MS) {
    return {
      ok: true,
      data: cached.data,
    };
  }

  const existingRequest = predictionBootstrapRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const nextRequest = (async (): Promise<PredictionBootstrapResult> => {
    try {
      const data = await publicGet<PredictionBootstrapWireResponse>('/predictions/bootstrap', {
        params: {
          date: normalizedDate,
          gameId: normalizedGameId,
        },
      });
      const normalizedData = {
        ...data,
        schedule: toPredictionMatchDayNavigation(data.schedule),
        selectedGameId: data.selectedGameId ?? null,
        selectedGameFound: data.selectedGameFound === true,
        detail: normalizeBootstrapResource(data.detail, toGameDetail),
        voteStatus: normalizeBootstrapResource(data.voteStatus, toVoteStatus),
      };
      predictionBootstrapCache.set(cacheKey, {
        data: normalizedData,
        fetchedAt: Date.now(),
      });
      return {
        ok: true,
        data: normalizedData,
      };
    } catch (error) {
      const parsed = parseError(error);
      return {
        ok: false,
        error: {
          message: parsed.message || '예측 경기 정보를 불러오지 못했습니다.',
          status: parsed.statusCode,
          code: parsed.responseCode,
        },
      };
    }
  })().finally(() => {
    if (predictionBootstrapRequests.get(cacheKey) === nextRequest) {
      predictionBootstrapRequests.delete(cacheKey);
    }
  });

  predictionBootstrapRequests.set(cacheKey, nextRequest);
  return nextRequest;
};
