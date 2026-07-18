import type { components } from './generated/aiStreamV2';
import type { AiEventVersion } from './aiStreamContract';

type AiStreamHttpError = components['schemas']['AiStreamHttpError'];
type StreamErrorData = components['schemas']['StreamErrorData'];

export interface AiStreamErrorDetails {
  code: string;
  message: string;
  detail: string | null;
  retryable: boolean;
  retryAfterSeconds: number | null;
  supportedVersions: AiEventVersion[];
}

export class AiStreamRequestError extends Error implements AiStreamErrorDetails {
  readonly statusCode: number;
  readonly code: string;
  readonly detail: string | null;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;
  readonly supportedVersions: AiEventVersion[];

  constructor(statusCode: number, details: AiStreamErrorDetails) {
    super(details.message);
    this.name = 'AiStreamRequestError';
    this.statusCode = statusCode;
    this.code = details.code;
    this.detail = details.detail;
    this.retryable = details.retryable;
    this.retryAfterSeconds = details.retryAfterSeconds;
    this.supportedVersions = [...details.supportedVersions];
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const nonEmptyString = (value: unknown): string | null => (
  typeof value === 'string' && value.length > 0 ? value : null
);

const nonNegativeInteger = (value: unknown): number | null => (
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
);

const hasExactSupportedVersions = (value: unknown): value is ['1', '2'] => (
  Array.isArray(value)
  && value.length === 2
  && value[0] === '1'
  && value[1] === '2'
);

const retryAfterFromHeader = (value: string | null): number | null => {
  if (!value || !/^\d+$/.test(value)) return null;
  return nonNegativeInteger(Number(value));
};

const fallbackForStatus = (status: number): AiStreamErrorDetails => ({
  code: 'AI_STREAM_REQUEST_FAILED',
  message: status === 504
    ? 'AI 서비스 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
    : status === 503 || status === 502
      ? 'AI 서비스가 현재 사용할 수 없습니다. 잠시 후 다시 시도해주세요.'
      : 'AI 요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.',
  detail: null,
  retryable: status === 429 || status >= 500,
  retryAfterSeconds: null,
  supportedVersions: [],
});

const CANONICAL_HTTP_ERROR_KEYS = [
  'code',
  'message',
  'detail',
  'retryable',
  'retry_after_seconds',
  'supported_versions',
] as const;

const hasExactKeys = (value: Record<string, unknown>, expected: readonly string[]): boolean => {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

const hasCanonicalOnlyField = (value: Record<string, unknown>): boolean => (
  'retryable' in value
  || 'retry_after_seconds' in value
  || 'supported_versions' in value
);

const isCanonicalHttpError = (
  status: number,
  value: Record<string, unknown>,
): value is AiStreamHttpError => (
  hasExactKeys(value, CANONICAL_HTTP_ERROR_KEYS)
  && nonEmptyString(value.code) !== null
  && nonEmptyString(value.message) !== null
  && (value.detail === null || typeof value.detail === 'string')
  && typeof value.retryable === 'boolean'
  && (value.retry_after_seconds === null || nonNegativeInteger(value.retry_after_seconds) !== null)
  && (
    value.code === 'AI_EVENT_VERSION_UNSUPPORTED'
      ? status === 406
        && value.retryable === false
        && value.retry_after_seconds === null
        && hasExactSupportedVersions(value.supported_versions)
      : Array.isArray(value.supported_versions) && value.supported_versions.length === 0
  )
);

const isLegacyUnsupportedVersionError = (
  status: number,
  value: Record<string, unknown>,
): boolean => (
  status === 406
  && isRecord(value.detail)
  && value.detail.code === 'AI_EVENT_VERSION_UNSUPPORTED'
  && hasExactSupportedVersions(value.detail.supported_versions)
);

const unsupportedVersionDetails = (): AiStreamErrorDetails => ({
  code: 'AI_EVENT_VERSION_UNSUPPORTED',
  message: '지원하지 않는 AI 이벤트 버전입니다.',
  detail: null,
  retryable: false,
  retryAfterSeconds: null,
  supportedVersions: ['1', '2'],
});

const isLegacySpringApiError = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & { success: false; code: string; message: string } => (
  value.success === false
  && nonEmptyString(value.code) !== null
  && nonEmptyString(value.message) !== null
);

const detailsFromLegacySpring = (
  value: Record<string, unknown> & { success: false; code: string; message: string },
  fallback: AiStreamErrorDetails,
  retryAfterSeconds: number | null,
): AiStreamErrorDetails => ({
  code: value.code,
  message: value.message,
  detail: null,
  retryable: fallback.retryable,
  retryAfterSeconds,
  supportedVersions: [],
});

const parseBody = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
};

export const decodeAiStreamHttpError = async (response: Response): Promise<AiStreamRequestError> => {
  const fallback = fallbackForStatus(response.status);
  const parsed = parseBody(await response.text());
  const headerRetryAfter = retryAfterFromHeader(response.headers.get('Retry-After'));

  if (isRecord(parsed)) {
    if (isCanonicalHttpError(response.status, parsed)) {
      return new AiStreamRequestError(
        response.status,
        {
          code: parsed.code,
          message: parsed.message,
          detail: parsed.detail,
          retryable: parsed.retryable,
          retryAfterSeconds: parsed.retry_after_seconds ?? headerRetryAfter,
          supportedVersions: [...parsed.supported_versions],
        },
      );
    }

    if (isLegacyUnsupportedVersionError(response.status, parsed)) {
      return new AiStreamRequestError(response.status, unsupportedVersionDetails());
    }

    if (hasCanonicalOnlyField(parsed)) {
      return new AiStreamRequestError(response.status, {
        ...fallback,
        retryAfterSeconds: headerRetryAfter,
      });
    }

    if (isLegacySpringApiError(parsed)) {
      return new AiStreamRequestError(
        response.status,
        detailsFromLegacySpring(parsed, fallback, headerRetryAfter),
      );
    }
  }

  return new AiStreamRequestError(response.status, {
    ...fallback,
    retryAfterSeconds: headerRetryAfter,
  });
};

export const normalizeAiStreamEventError = (data: StreamErrorData): AiStreamErrorDetails => ({
  code: data.code,
  message: data.message,
  detail: data.detail ?? null,
  retryable: data.retryable,
  retryAfterSeconds: null,
  supportedVersions: [],
});

export class RateLimitError extends Error {
  readonly code: string;
  readonly detail: string | null;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number;
  readonly supportedVersions: AiEventVersion[];

  constructor(value: AiStreamErrorDetails | number) {
    const details = typeof value === 'number'
      ? {
          code: 'RATE_LIMITED',
          message: '요청이 많아 잠시 후 다시 시도해주세요.',
          detail: null,
          retryable: true,
          retryAfterSeconds: value,
          supportedVersions: [] as AiEventVersion[],
        }
      : value;
    super(details.message);
    this.name = 'RateLimitError';
    this.code = details.code;
    this.detail = details.detail;
    this.retryable = details.retryable;
    this.retryAfterSeconds = details.retryAfterSeconds ?? 10;
    this.supportedVersions = [...details.supportedVersions];
  }
}

export interface RateLimitErrorDetails {
  message: string;
  retryAfterSeconds: number;
}

export const resolveRateLimitErrorDetails = (error: unknown): RateLimitErrorDetails | null => (
  error instanceof RateLimitError
    ? {
        message: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
      }
    : null
);
