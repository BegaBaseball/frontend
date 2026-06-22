import { getApiBaseUrl } from './apiBase';

export type ApiParamValue = string | number | boolean | null | undefined;

export const DEFAULT_API_TIMEOUT_MS = 10_000;

export const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export const buildApiUrl = (
  endpoint: string,
  params?: Record<string, ApiParamValue>,
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

export const parseResponseBody = async (response: Response): Promise<unknown> => {
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

export const isBodyInitLike = (value: unknown): value is BodyInit =>
  typeof value === 'string'
  || value instanceof FormData
  || value instanceof URLSearchParams
  || value instanceof Blob
  || value instanceof ArrayBuffer
  || ArrayBuffer.isView(value);

export const toRequestBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined) {
    return undefined;
  }

  return isBodyInitLike(body) ? body : JSON.stringify(body);
};

export const toJsonRequestBody = (body: unknown): string | undefined => (
  body === undefined ? undefined : JSON.stringify(body)
);

export const buildApiRequestHeaders = (
  requestBody: BodyInit | string | undefined,
  headers: Record<string, string> = {},
): Record<string, string> => ({
  Accept: 'application/json',
  ...(requestBody !== undefined && !(requestBody instanceof FormData)
    ? { 'Content-Type': 'application/json' }
    : {}),
  ...headers,
});

export interface TimeoutController {
  cleanup: () => void;
  signal: AbortSignal;
  timeoutMs: number;
}

export const createTimeoutController = (
  timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
  abortSignal?: AbortSignal,
): TimeoutController => {
  // AbortSignal.timeout() uses a browser-native timer that is NOT affected by
  // fake-clock stubs (e.g. cy.clock() in Cypress). Using globalThis.setTimeout
  // caused timeouts to fire prematurely during cy.tick() advances, aborting
  // in-flight fetch responses before they could be processed.
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = abortSignal
    ? AbortSignal.any([timeoutSignal, abortSignal])
    : timeoutSignal;

  return {
    cleanup: () => {},
    signal,
    timeoutMs,
  };
};

export const isAbortError = (error: unknown): boolean => (
  error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')
);
