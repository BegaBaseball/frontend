import {
  DEFAULT_API_TIMEOUT_MS,
  buildDevProxyUnavailableErrorData,
  buildApiRequestHeaders,
  buildApiUrl,
  createTimeoutController,
  isAbortError,
  parseResponseBody,
  toJsonRequestBody,
} from './httpClientCore';
import type { ApiClientErrorData, ApiParamValue } from './httpClientCore';

type PublicApiParamValue = ApiParamValue;

type PublicApiErrorData = ApiClientErrorData;

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

const publicRequest = async <T>(
  endpoint: string,
  options: PublicRequestOptions = {},
): Promise<T> => {
  const timeout = createTimeoutController(options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS, options.signal);
  const url = buildApiUrl(endpoint, options.params);

  try {
    const method = options.method ?? 'GET';
    const requestBody = toJsonRequestBody(options.body);

    const response = await fetch(url, {
      credentials: 'include',
      method,
      headers: buildApiRequestHeaders(requestBody),
      body: requestBody,
      signal: timeout.signal,
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      const parsedData = typeof responseBody === 'object' && responseBody !== null
        ? responseBody as PublicApiErrorData
        : null;
      const data = buildDevProxyUnavailableErrorData(response, responseBody, url) ?? parsedData;
      const message = data?.message || data?.error || response.statusText || `Request failed with status ${response.status}`;
      throw new PublicApiError(response.status, message, data);
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
