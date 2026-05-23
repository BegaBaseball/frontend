import { getApiErrorMessage, type ParsedError } from '../utils/errorUtils';
import { normalizePredictionDate } from '../utils/predictionHomeLogic';
import type { MatchDayResult } from '../api/predictionMatchDay';
import type {
  PredictionFlowEmitter,
  PredictionOverlayController,
} from './predictionHookShared';

// ---------------------------------------------------------------------------
// Game ID validation
// ---------------------------------------------------------------------------

const PREDICTION_GAME_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export const toPredictionGameId = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return PREDICTION_GAME_ID_PATTERN.test(normalized) ? normalized : null;
};

// ---------------------------------------------------------------------------
// Noop sentinels (default parameter values)
// ---------------------------------------------------------------------------

export const noopEmitFlowEvent: PredictionFlowEmitter = () => {};
export const noopShowPredictionErrorOverlay: PredictionOverlayController['showPredictionErrorOverlay'] = () => {};
export const noopFetchAndCacheUserVotes = async () => {};
export const noopPrimeGameDetail = () => {};
export const noopActivateMatchTab = () => {};

// ---------------------------------------------------------------------------
// Canceled result sentinel
// ---------------------------------------------------------------------------

export const CANCELED_MATCH_DAY_RESULT: MatchDayResult = {
  ok: false,
  error: {
    message: 'canceled',
    code: 'ERR_CANCELED',
    status: 0,
  },
};

// ---------------------------------------------------------------------------
// Match bounds date normalizer
// ---------------------------------------------------------------------------

export const normalizeMatchBoundsDate = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return normalizePredictionDate(value);
};

// ---------------------------------------------------------------------------
// Range error utilities
// ---------------------------------------------------------------------------

export const getPredictionRangeErrorMessage = (
  error: {
    message?: string;
    status?: number | null;
    code?: string;
  } | undefined,
  fallback: string,
) => {
  const normalizedStatus = typeof error?.status === 'number' ? error.status : null;
  const normalizedMessage = typeof error?.message === 'string' ? error.message.trim() : '';
  const resolvedMessage = normalizedMessage || fallback;

  return getApiErrorMessage(normalizedStatus !== null
    ? {
      status: normalizedStatus,
      data: {
        message: normalizedMessage || undefined,
        code: error?.code,
      },
      message: resolvedMessage,
    }
    : new Error(resolvedMessage), fallback);
};

export const getMatchRangeErrorType = (status: number | null): ParsedError['type'] => {
  if (status === 401) {
    return 'AUTH';
  }
  if (status === 403) {
    return 'PERMISSION';
  }
  if (status === 404) {
    return 'NOT_FOUND';
  }
  if (status !== null && status >= 500) {
    return 'SERVER';
  }
  return 'UNKNOWN';
};

export const getMatchRangeErrorFallback = (type: ParsedError['type']) => {
  if (type === 'AUTH') {
    return '로그인 정보를 다시 확인해주세요.';
  }
  if (type === 'PERMISSION') {
    return '접근 권한이 없습니다.';
  }
  if (type === 'NOT_FOUND') {
    return '요청한 정보를 찾을 수 없습니다.';
  }
  if (type === 'SERVER') {
    return '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.';
  }
  return '예측 경기 목록 조회에 실패했습니다.';
};

export const normalizeMatchRangeError = (error?: {
  message?: string;
  status?: number | null;
  code?: string;
}): ParsedError => {
  const statusCode = error?.status ?? null;
  const normalizedStatus = typeof statusCode === 'number' ? statusCode : null;
  const type = getMatchRangeErrorType(normalizedStatus);

  return {
    type,
    responseCode: error?.code,
    message: getPredictionRangeErrorMessage(error, getMatchRangeErrorFallback(type)),
    statusCode: normalizedStatus,
  };
};
