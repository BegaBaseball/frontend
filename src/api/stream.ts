import api from './axios';

export const DEFAULT_STREAM_TIMEOUT_MS = 30000;
export const DEFAULT_STREAM_TIMEOUT_RETRY_ATTEMPTS = 3;
export const COACH_STREAM_TIMEOUT_RETRY_ATTEMPTS = 2;
export const DEFAULT_STREAM_RETRY_DELAY_MS = 1000;

export const STREAM_TIMEOUT_ERROR_NAME = 'StreamRequestTimeoutError';
export const CHATBOT_STATUS_RATE_LIMIT = 'STATUS_429';
export const CHATBOT_STATUS_SERVICE_UNAVAILABLE = 'STATUS_503';
export const CHATBOT_STREAM_TIMEOUT_ERROR = 'STREAM_TIMEOUT';
export const CHATBOT_STREAM_INCOMPLETE_ERROR = 'INCOMPLETE_STREAM';
export const CHATBOT_STREAM_TEMPORARY_ERROR = 'TEMPORARY_STREAM_ERROR';

export type ChatStreamStatusCode =
  | typeof CHATBOT_STATUS_RATE_LIMIT
  | typeof CHATBOT_STATUS_SERVICE_UNAVAILABLE
  | typeof CHATBOT_STREAM_TIMEOUT_ERROR
  | typeof CHATBOT_STREAM_INCOMPLETE_ERROR
  | typeof CHATBOT_STREAM_TEMPORARY_ERROR;

export const isChatStreamStatusError = (error: unknown, statusCode: ChatStreamStatusCode): boolean =>
  error instanceof Error && error.message === statusCode;

export class StreamRequestTimeoutError extends Error {
  constructor(message: string = 'Stream request timed out') {
    super(message);
    this.name = STREAM_TIMEOUT_ERROR_NAME;
  }
}

export const isStreamRequestTimeoutError = (error: unknown): boolean =>
  error instanceof Error && (error.name === STREAM_TIMEOUT_ERROR_NAME || error.name === 'TimeoutError');

export const STREAM_READ_TIMEOUT_ERROR_NAME = 'StreamReadTimeoutError';

export class StreamReadTimeoutError extends Error {
  constructor(message: string = 'Stream read timed out') {
    super(message);
    this.name = STREAM_READ_TIMEOUT_ERROR_NAME;
  }
}

export const isStreamReadTimeoutError = (error: unknown): boolean =>
  error instanceof Error && error.name === STREAM_READ_TIMEOUT_ERROR_NAME;

export const isStreamAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return true;
    }
    const message = error.message.toLowerCase();
    return message.includes('aborterror') || message.includes('aborted');
  }
  return String(error ?? '').toLowerCase().includes('abort');
};

export const waitForStreamDelay = (delayMs: number, signal?: AbortSignal): Promise<void> => {
  if (signal?.aborted) {
    return Promise.reject(signal.reason ?? new DOMException('aborted', 'AbortError'));
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);

    const onAbort = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
      reject(signal?.reason ?? new DOMException('aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
};

export const readWithTimeout = async <T>(
  read: () => Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<never>((_, rejectTimeout) => {
      timeoutId = setTimeout(() => {
        rejectTimeout(new StreamReadTimeoutError());
      }, timeoutMs);
    });

    Promise.race([read(), timeoutPromise]).then((value) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve(value);
    }).catch((error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });
  });
};

export const getStreamRetryDelayMs = (attempt: number, baseDelayMs = DEFAULT_STREAM_RETRY_DELAY_MS): number =>
  Math.pow(2, attempt - 1) * baseDelayMs;

export const buildStreamApiUrl = (path: string): string => {
    const baseUrl = (api.defaults.baseURL ?? '/api').replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
};

type StreamRequestInit = RequestInit & {
    timeoutMs?: number;
};

export const requestStream = async (path: string, init: StreamRequestInit = {}): Promise<Response> => {
    const { timeoutMs, signal, ...requestInit } = init;
    const controller = new AbortController();
    const onExternalAbort = () => {
        controller.abort(signal?.reason);
    };

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let requestTimedOut = false;

    if (signal) {
        if (signal.aborted) {
            controller.abort(signal.reason);
        } else {
            signal.addEventListener('abort', onExternalAbort, { once: true });
        }
    }

    if (typeof timeoutMs === 'number' && timeoutMs > 0) {
        timeoutId = setTimeout(() => {
            requestTimedOut = true;
            controller.abort(new StreamRequestTimeoutError());
        }, timeoutMs);
    }

    const initWithCredentials = {
        ...requestInit,
        credentials: 'include' as const,
        signal: controller.signal,
    };

    try {
        return await fetch(buildStreamApiUrl(path), initWithCredentials);
    } catch (error) {
        if (
            requestTimedOut &&
            error instanceof Error &&
            (error.name === 'AbortError' || error.name === STREAM_TIMEOUT_ERROR_NAME || error.name === 'TimeoutError')
        ) {
            throw new StreamRequestTimeoutError();
        }
        throw error;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (signal) {
            signal.removeEventListener('abort', onExternalAbort);
        }
    }
};
