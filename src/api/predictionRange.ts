import { publicGet } from './publicClient';
import { toPredictionGames, toPredictionMatchRangePage } from './predictionMappers';
import type {
  ApiResult,
  MatchRangePageMeta,
  MatchRangeRequest,
} from './prediction';
import type { MatchBounds } from '../types/prediction';
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
    const { fetchMatchRangeWire } = await import('./matchRangeClient');
    const { response, page: normalizedPage, size: normalizedSize } = await fetchMatchRangeWire({
      startDate,
      endDate,
      page,
      size,
      includePast,
      withMeta: true,
    });

    if (Array.isArray(response)) {
      return {
        ok: true,
        data: {
          content: toPredictionGames(response),
          page: normalizedPage,
          size: normalizedSize,
          totalElements: response.length,
          totalPages: response.length ? 1 : 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }

    return {
      ok: true,
      data: toPredictionMatchRangePage(response, {
        page: normalizedPage,
        size: normalizedSize,
      }),
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
