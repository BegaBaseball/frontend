import test from 'node:test';
import assert from 'node:assert/strict';

import api from './axios';
import {
  DEFAULT_STREAM_RETRY_DELAY_MS,
  DEFAULT_STREAM_TIMEOUT_MS,
  StreamRequestTimeoutError,
  StreamReadTimeoutError,
  buildStreamApiUrl,
  getStreamRetryDelayMs,
  isStreamAbortError,
  readWithTimeout,
  requestStream,
  isStreamRequestTimeoutError,
  isStreamReadTimeoutError,
  waitForStreamDelay,
} from './stream';

test('buildStreamApiUrl normalizes double slashes and leading slash path', () => {
  const originalBaseUrl = api.defaults.baseURL;
  api.defaults.baseURL = 'https://example.com/api/';

  try {
    assert.equal(buildStreamApiUrl('/health'), 'https://example.com/api/health');
    assert.equal(buildStreamApiUrl('health'), 'https://example.com/api/health');
  } finally {
    api.defaults.baseURL = originalBaseUrl;
  }
});

test('getStreamRetryDelayMs applies exponential backoff', () => {
  assert.equal(getStreamRetryDelayMs(1), DEFAULT_STREAM_RETRY_DELAY_MS);
  assert.equal(getStreamRetryDelayMs(2), DEFAULT_STREAM_RETRY_DELAY_MS * 2);
  assert.equal(getStreamRetryDelayMs(3), DEFAULT_STREAM_RETRY_DELAY_MS * 4);
  assert.equal(getStreamRetryDelayMs(2, 250), 500);
});

test('readWithTimeout resolves when read completes before timeout', async () => {
  const value = await readWithTimeout(() => Promise.resolve('ok'), DEFAULT_STREAM_TIMEOUT_MS);
  assert.equal(value, 'ok');
});

test('readWithTimeout throws StreamReadTimeoutError when read takes too long', async () => {
  const neverResolve = () => new Promise<string>(() => {});
  let caught: unknown = undefined;
  try {
    await readWithTimeout(neverResolve, 10);
    assert.fail('Expected StreamReadTimeoutError to be thrown');
  } catch (error) {
    caught = error;
  }

  assert.notEqual(caught, undefined);
  assert.equal(caught instanceof Error, true);
  assert.equal(isStreamReadTimeoutError(caught), true);
});

test('isStreamRequestTimeoutError detects request timeout errors', () => {
  const timeoutError = new StreamRequestTimeoutError();
  const nativeTimeoutError = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
  const otherError = new Error('other');

  assert.equal(isStreamRequestTimeoutError(timeoutError), true);
  assert.equal(isStreamRequestTimeoutError(nativeTimeoutError), true);
  assert.equal(isStreamRequestTimeoutError(otherError), false);
});

test('isStreamAbortError detects DOM abort errors', () => {
  assert.equal(isStreamAbortError(new DOMException('manual abort', 'AbortError')), true);
  assert.equal(isStreamAbortError(new Error('other')), false);
});

test('waitForStreamDelay rejects immediately when signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort(new DOMException('manual abort', 'AbortError'));

  await assert.rejects(
    () => waitForStreamDelay(10, controller.signal),
    (error) => error instanceof DOMException && error.name === 'AbortError',
  );
});

test('waitForStreamDelay rejects when signal aborts during delay', async () => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort(new DOMException('manual abort', 'AbortError'));
  }, 5);

  try {
    await assert.rejects(
      () => waitForStreamDelay(30, controller.signal),
      (error) => error instanceof DOMException && error.name === 'AbortError',
    );
  } finally {
    clearTimeout(timeoutHandle);
  }
});

test('requestStream transforms request-timeout into StreamRequestTimeoutError', async () => {
  const originalFetch = globalThis.fetch;
  const restoreFetch = () => {
    globalThis.fetch = originalFetch;
  };

  globalThis.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    return new Promise<Response>((_, reject) => {
      const signal = init.signal;
      if (signal?.aborted) {
        const reason = signal.reason;
        if (reason instanceof Error) {
          reject(reason);
        } else {
          reject(new DOMException('aborted', 'AbortError'));
        }
        return;
      }

      const onAbort = () => {
        const reason = signal?.reason;
        if (reason instanceof Error) {
          reject(reason);
        } else {
          reject(new DOMException('aborted', 'AbortError'));
        }
      };

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }) as unknown as typeof fetch;

  let caught: unknown = undefined;
  try {
    await requestStream('/timeout', { method: 'GET', timeoutMs: 10 });
    assert.fail('Expected StreamRequestTimeoutError to be thrown');
  } catch (error) {
    caught = error;
  }

  try {
    assert.notEqual(caught, undefined);
    assert.equal(caught instanceof Error, true);
    assert.equal((caught as Error).name, 'StreamRequestTimeoutError');
  } finally {
    restoreFetch();
  }
});

test('requestStream preserves external signal abort as abort error', async () => {
  const originalFetch = globalThis.fetch;
  const restoreFetch = () => {
    globalThis.fetch = originalFetch;
  };

  globalThis.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    return new Promise<Response>((_, reject) => {
      const signal = init.signal;
      if (signal?.aborted) {
        const reason = signal.reason;
        if (reason instanceof Error) {
          reject(reason);
        } else {
          reject(new DOMException('aborted', 'AbortError'));
        }
        return;
      }

      signal?.addEventListener('abort', () => {
        const reason = signal.reason;
        if (reason instanceof Error) {
          reject(reason);
        } else {
          reject(new DOMException('aborted', 'AbortError'));
        }
      }, { once: true });
    });
  }) as unknown as typeof fetch;

  let caught: unknown = undefined;
  try {
    const abortController = new AbortController();
    const externalError = new DOMException('manual abort', 'AbortError');
    abortController.abort(externalError);

    await requestStream('/timeout', { method: 'GET', signal: abortController.signal });
    assert.fail('Expected DOMException to be thrown');
  } catch (error) {
    caught = error;
  }

  try {
    assert.notEqual(caught, undefined);
    assert.equal(caught instanceof Error, true);
    assert.equal((caught as Error).name, 'AbortError');
  } finally {
    restoreFetch();
  }
});

test('external abort wins over request timeout', async () => {
  const originalFetch = globalThis.fetch;
  const restoreFetch = () => {
    globalThis.fetch = originalFetch;
  };
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  globalThis.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    return new Promise<Response>((_, reject) => {
      const signal = init.signal;
      if (signal?.aborted) {
        const reason = signal.reason;
        if (reason instanceof Error) {
          reject(reason);
        } else {
          reject(new DOMException('aborted', 'AbortError'));
        }
        return;
      }

      signal?.addEventListener('abort', () => {
        const reason = signal.reason;
        if (reason instanceof Error) {
          reject(reason);
        } else {
          reject(new DOMException('aborted', 'AbortError'));
        }
      }, { once: true });
    });
  }) as unknown as typeof fetch;

  let caught: unknown = undefined;
  try {
    const abortController = new AbortController();
    timeoutHandle = setTimeout(() => {
      abortController.abort(new DOMException('manual abort', 'AbortError'));
    }, 5);

    await requestStream('/timeout', { method: 'GET', signal: abortController.signal, timeoutMs: 50 });
    assert.fail('Expected DOMException to be thrown');
  } catch (error) {
    caught = error;
  }

  try {
    assert.notEqual(caught, undefined);
    assert.equal(caught instanceof Error, true);
    assert.equal((caught as Error).name, 'AbortError');
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    restoreFetch();
  }
});

test('requestStream builds axios base URL path and sets credentials include', async () => {
  const originalFetch = globalThis.fetch;
  const restoreFetch = () => {
    globalThis.fetch = originalFetch;
  };

  const calls: Array<{ input: string; init: RequestInit }> = [];

  globalThis.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({
      input: typeof input === 'string' ? input : input.toString(),
      init,
    });
    return Promise.resolve(new Response('ok', { status: 200 }));
  }) as typeof fetch;

  try {
    const response = await requestStream('/health', { method: 'GET' });
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].input, buildStreamApiUrl('/health'));
    assert.equal(calls[0].init.credentials, 'include');
  } finally {
    restoreFetch();
  }
});
