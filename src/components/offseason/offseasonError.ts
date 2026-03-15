import { getApiErrorMessage, parseError } from '../../utils/errorUtils';

const DEFAULT_OFFSEASON_ERROR_MESSAGE = '스토브리그 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';

export const normalizeOffseasonErrorMessage = (
  error: unknown,
  fallback = DEFAULT_OFFSEASON_ERROR_MESSAGE,
): string => (
  parseError(new Error(getApiErrorMessage(error, fallback))).message || fallback
);
