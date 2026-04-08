import { publicGet } from './publicClient';
import type {
  ApiResult,
  MatchRangePageMeta,
  MatchRangeRequest,
} from './prediction';
import type { Game, MatchBounds } from '../types/prediction';
import { parseError } from '../utils/errorUtils';

export const fetchMatchBounds = async (): Promise<ApiResult<MatchBounds>> => {
  try {
    return {
      ok: true,
      data: await publicGet<MatchBounds>('/matches/bounds'),
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

export const fetchMatchesByRangeWithMeta = async ({
  startDate,
  endDate,
  page = 0,
  size = 150,
  includePast = true,
}: MatchRangeRequest): Promise<ApiResult<MatchRangePageMeta>> => {
  try {
    const normalizedSize = Math.max(1, Math.min(500, size));
    const data = await publicGet<MatchRangePageMeta | Game[]>('/matches/range', {
      params: {
        startDate,
        endDate,
        page: Math.max(0, page),
        size: normalizedSize,
        includePast,
        withMeta: true,
      },
    });

    if (Array.isArray(data)) {
      return {
        ok: true,
        data: {
          content: data,
          page,
          size: normalizedSize,
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
