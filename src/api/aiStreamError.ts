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

const nullableString = (value: unknown): string | null => (
  typeof value === 'string' ? value : null
);

const nonNegativeInteger = (value: unknown): number | null => (
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
);

const supportedVersions = (value: unknown): AiEventVersion[] => (
  Array.isArray(value)
    ? value.filter((item): item is AiEventVersion => item === '1' || item === '2')
    : []
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

const isCanonicalHttpError = (value: Record<string, unknown>): value is AiStreamHttpError => (
  nonEmptyString(value.code) !== null
  && nonEmptyString(value.message) !== null
  && typeof value.retryable === 'boolean'
);

const detailsFromRecord = (
  value: Record<string, unknown>,
  fallback: AiStreamErrorDetails,
  retryAfterSeconds: number | null,
): AiStreamErrorDetails => ({
  code: nonEmptyString(value.code) ?? fallback.code,
  message: nonEmptyString(value.message) ?? fallback.message,
  detail: nullableString(value.detail),
  retryable: typeof value.retryable === 'boolean' ? value.retryable : fallback.retryable,
  retryAfterSeconds,
  supportedVersions: supportedVersions(value.supported_versions),
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
    if (isCanonicalHttpError(parsed)) {
      return new AiStreamRequestError(
        response.status,
        detailsFromRecord(parsed, fallback, nonNegativeInteger(parsed.retry_after_seconds) ?? headerRetryAfter),
      );
    }

    if (isRecord(parsed.detail)) {
      return new AiStreamRequestError(
        response.status,
        detailsFromRecord(parsed.detail, fallback, nonNegativeInteger(parsed.detail.retry_after_seconds) ?? headerRetryAfter),
      );
    }

    if (parsed.success === false) {
      return new AiStreamRequestError(
        response.status,
        detailsFromRecord(parsed, fallback, nonNegativeInteger(parsed.retry_after_seconds) ?? headerRetryAfter),
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
