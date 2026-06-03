import { publicGet } from './publicClient';
import { parseError } from '../utils/errorUtils';
import type { MatchDayNavigation } from '../types/prediction';

export interface MatchDaySuccess {
  ok: true;
  data: MatchDayNavigation;
}

export interface MatchDayFailure {
  ok: false;
  error: {
    message: string;
    status?: number | null;
    code?: string;
  };
}

export type MatchDayResult = MatchDaySuccess | MatchDayFailure;

export interface MatchDayFetchOptions {
  signal?: AbortSignal;
}

export const fetchMatchesByDay = async (
  date: string,
  options: MatchDayFetchOptions = {}
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
