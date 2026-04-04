import { getApiBaseUrl } from './apiBase';

type PrivateApiParamValue = string | number | boolean | null | undefined;

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

const DEFAULT_TIMEOUT_MS = 10_000;
let reissueInFlight: Promise<boolean> | null = null;
let hasSessionExpired = false;

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const buildPrivateApiUrl = (
  endpoint: string,
  params?: Record<string, PrivateApiParamValue>,
): string => {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = isAbsoluteUrl(baseUrl)
    ? new URL(`${baseUrl}${normalizedEndpoint}`)
    : new URL(`${baseUrl}${normalizedEndpoint}`, origin);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value == null) {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  if (isAbsoluteUrl(baseUrl)) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
};

const isBodyInitLike = (value: unknown): value is BodyInit =>
  typeof value === 'string'
  || value instanceof FormData
  || value instanceof URLSearchParams
  || value instanceof Blob
  || value instanceof ArrayBuffer
  || ArrayBuffer.isView(value);

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

const requestReissue = async (): Promise<boolean> => {
  if (!reissueInFlight) {
    reissueInFlight = (async () => {
      const response = await fetch(buildPrivateApiUrl('/auth/reissue'), {
        credentials: 'include',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Reissue failed with status ${response.status}`);
      }

      return true;
    })().finally(() => {
      reissueInFlight = null;
    });
  }

  return reissueInFlight;
};

export const requestPrivateReissue = async (): Promise<boolean> => requestReissue();

const privateRequest = async <T>(
  endpoint: string,
  options: PrivateRequestOptions = {},
  hasRetried = false,
): Promise<T> => {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutHandle = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const abortSignal = options.signal;
  const abortListener = () => controller.abort();
  abortSignal?.addEventListener('abort', abortListener);

  const method = options.method ?? 'GET';
  const url = buildPrivateApiUrl(endpoint, options.params);
  const requestBody = options.body === undefined
    ? undefined
    : isBodyInitLike(options.body)
      ? options.body
      : JSON.stringify(options.body);
  const shouldSetJsonContentType = requestBody !== undefined && !(requestBody instanceof FormData);

  try {
    const response = await fetch(url, {
      credentials: 'include',
      method,
      headers: {
        Accept: 'application/json',
        ...(shouldSetJsonContentType ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
      body: requestBody,
      signal: controller.signal,
    });

    const responseBody = await parseResponseBody(response);

    if (response.status === 401 && !hasRetried && !options.skipAuthSessionHandling) {
      try {
        await requestReissue();
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
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutHandle);
    abortSignal?.removeEventListener('abort', abortListener);
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
