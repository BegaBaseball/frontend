import { requestAuthReissue } from './authReissue';
import {
  DEFAULT_API_TIMEOUT_MS,
  buildApiRequestHeaders,
  buildApiUrl,
  createTimeoutController,
  isAbortError,
  parseResponseBody,
  toRequestBody,
} from './httpClientCore';
import type { ApiParamValue } from './httpClientCore';

type PrivateApiParamValue = ApiParamValue;

interface PrivateApiErrorData {
  code?: string;
  data?: unknown;
  error?: string;
  errors?: Record<string, unknown>;
  message?: string;
}

export class PrivateApiError extends Error {
  data: PrivateApiErrorData | null;
  status: number;

  constructor(status: number, message: string, data: PrivateApiErrorData | null = null) {
    super(message);
    this.name = 'PrivateApiError';
    this.status = status;
    this.data = data;
  }
}

interface PrivateRequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, PrivateApiParamValue>;
  signal?: AbortSignal;
  skipAuthSessionHandling?: boolean;
  timeoutMs?: number;
}

let hasSessionExpired = false;

const dispatchAuthSessionExpired = (
  detail: Record<string, unknown>,
  skipAuthSessionHandling?: boolean,
) => {
  if (skipAuthSessionHandling || hasSessionExpired || typeof window === 'undefined') {
    return;
  }

  hasSessionExpired = true;
  window.dispatchEvent(new CustomEvent('auth-session-expired', { detail }));
};

export const requestPrivateReissue = async (): Promise<boolean> => requestAuthReissue();

const privateRequest = async <T>(
  endpoint: string,
  options: PrivateRequestOptions = {},
  hasRetried = false,
): Promise<T> => {
  const timeout = createTimeoutController(options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS, options.signal);
  const method = options.method ?? 'GET';
  const url = buildApiUrl(endpoint, options.params);
  const requestBody = toRequestBody(options.body);

  try {
    const response = await fetch(url, {
      credentials: 'include',
      method,
      headers: buildApiRequestHeaders(requestBody, options.headers),
      body: requestBody,
      signal: timeout.signal,
    });
    const responseBody = await parseResponseBody(response);

    if (response.status === 401 && !hasRetried && !options.skipAuthSessionHandling) {
      try {
        await requestAuthReissue();
        hasSessionExpired = false;
        return privateRequest<T>(endpoint, options, true);
      } catch (reissueError) {
        dispatchAuthSessionExpired({
          cause: 'reissue_failed',
          requestUrl: endpoint,
          requestMethod: method,
          requestStatus: 401,
          requestCode: typeof (responseBody as { code?: unknown } | null)?.code === 'string'
            ? (responseBody as { code?: string }).code
            : undefined,
          reissueError: reissueError instanceof Error ? reissueError.message : String(reissueError),
        }, options.skipAuthSessionHandling);
      }
    } else if (response.status === 401 && !options.skipAuthSessionHandling) {
      dispatchAuthSessionExpired({
        cause: 'request_unauthorized',
        requestUrl: endpoint,
        requestMethod: method,
        requestStatus: 401,
        requestCode: typeof (responseBody as { code?: unknown } | null)?.code === 'string'
          ? (responseBody as { code?: string }).code
          : undefined,
      }, options.skipAuthSessionHandling);
    }

    if (!response.ok) {
      const data = typeof responseBody === 'object' && responseBody !== null
        ? responseBody as PrivateApiErrorData
        : null;
      const message = data?.message || data?.error || response.statusText || `Request failed with status ${response.status}`;
      throw new PrivateApiError(response.status, message, data);
    }

    return responseBody as T;
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`Request timed out after ${timeout.timeoutMs}ms`);
    }

    throw error;
  } finally {
    timeout.cleanup();
  }
};

export const privateGet = async <T>(
  endpoint: string,
  options: Omit<PrivateRequestOptions, 'body' | 'method'> = {},
): Promise<T> => privateRequest<T>(endpoint, options);

export const privatePost = async <TResponse, TBody = unknown>(
  endpoint: string,
  body?: TBody,
  options: Omit<PrivateRequestOptions, 'body' | 'method'> = {},
): Promise<TResponse> => privateRequest<TResponse>(endpoint, {
  ...options,
  body,
  method: 'POST',
});

export const privatePut = async <TResponse, TBody = unknown>(
  endpoint: string,
  body?: TBody,
  options: Omit<PrivateRequestOptions, 'body' | 'method'> = {},
): Promise<TResponse> => privateRequest<TResponse>(endpoint, {
  ...options,
  body,
  method: 'PUT',
});

export const privateDelete = async <TResponse, TBody = unknown>(
  endpoint: string,
  options: Omit<PrivateRequestOptions, 'method'> & { body?: TBody } = {},
): Promise<TResponse> => privateRequest<TResponse>(endpoint, {
  ...options,
  method: 'DELETE',
});

export const privatePatch = async <TResponse, TBody = unknown>(
  endpoint: string,
  body?: TBody,
  options: Omit<PrivateRequestOptions, 'body' | 'method'> = {},
): Promise<TResponse> => privateRequest<TResponse>(endpoint, {
  ...options,
  body,
  method: 'PATCH',
});
