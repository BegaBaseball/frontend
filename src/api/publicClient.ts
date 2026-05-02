import { getApiBaseUrl } from './apiBase';

type PublicApiParamValue = string | number | boolean | null | undefined;

interface PublicApiErrorData {
  code?: string;
  error?: string;
  message?: string;
  data?: unknown;
  errors?: Record<string, unknown>;
}

export class PublicApiError extends Error {
  data: PublicApiErrorData | null;
  status: number;

  constructor(status: number, message: string, data: PublicApiErrorData | null = null) {
    super(message);
    this.name = 'PublicApiError';
    this.status = status;
    this.data = data;
  }
}

interface PublicGetOptions {
  params?: Record<string, PublicApiParamValue>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface PublicRequestOptions extends PublicGetOptions {
  body?: unknown;
  method?: 'GET' | 'POST';
}

const DEFAULT_TIMEOUT_MS = 10_000;

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const buildPublicApiUrl = (
  endpoint: string,
  params?: Record<string, PublicApiParamValue>,
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

const publicRequest = async <T>(
  endpoint: string,
  options: PublicRequestOptions = {},
): Promise<T> => {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutHandle = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const url = buildPublicApiUrl(endpoint, options.params);

  const abortSignal = options.signal;
  const abortListener = () => controller.abort();
  abortSignal?.addEventListener('abort', abortListener);
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    const method = options.method ?? 'GET';
    const requestBody = options.body === undefined ? undefined : JSON.stringify(options.body);

    if (requestBody !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      credentials: 'include',
      method,
      headers,
      body: requestBody,
      signal: controller.signal,
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      const data = typeof responseBody === 'object' && responseBody !== null
        ? responseBody as PublicApiErrorData
        : null;
      const message = data?.message || data?.error || response.statusText || `Request failed with status ${response.status}`;
      throw new PublicApiError(response.status, message, data);
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

export const publicGet = async <T>(
  endpoint: string,
  options: PublicGetOptions = {},
): Promise<T> => publicRequest<T>(endpoint, options);

export const publicPost = async <TResponse, TBody>(
  endpoint: string,
  body: TBody,
  options: PublicGetOptions = {},
): Promise<TResponse> => publicRequest<TResponse>(endpoint, {
  ...options,
  body,
  method: 'POST',
});
