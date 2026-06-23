import { publicGet } from './publicClient';
import type { OpenApiResponseBody } from './openapiTypes';

export type MatchRangeWireResponse = OpenApiResponseBody<'/api/matches/range', 'get'>;

export interface MatchRangeWireRequest {
  startDate: string;
  endDate: string;
  page?: number;
  size?: number;
  includePast?: boolean;
  withMeta?: boolean;
}

export interface MatchRangeWireResult {
  response: MatchRangeWireResponse;
  page: number;
  size: number;
}

const normalizeMatchRangePage = (page: number | undefined): number => Math.max(0, page ?? 0);

const normalizeMatchRangeSize = (size: number | undefined): number => Math.max(1, Math.min(500, size ?? 150));

export const fetchMatchRangeWire = async ({
  startDate,
  endDate,
  page,
  size,
  includePast = true,
  withMeta = false,
}: MatchRangeWireRequest): Promise<MatchRangeWireResult> => {
  const normalizedPage = normalizeMatchRangePage(page);
  const normalizedSize = normalizeMatchRangeSize(size);
  const response = await publicGet<MatchRangeWireResponse>('/matches/range', {
    params: {
      startDate,
      endDate,
      page: normalizedPage,
      size: normalizedSize,
      includePast,
      withMeta,
    },
  });

  return {
    response,
    page: normalizedPage,
    size: normalizedSize,
  };
};
