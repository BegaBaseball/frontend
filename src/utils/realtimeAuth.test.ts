import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { ensureRealtimeAuthSession } from './realtimeAuth';

type GlobalWithTestWindow = typeof globalThis & {
  CustomEvent?: typeof CustomEvent;
  window?: Window;
};

const originalWindow = (globalThis as GlobalWithTestWindow).window;
const originalCustomEvent = (globalThis as GlobalWithTestWindow).CustomEvent;

const TestCustomEvent = class<T> extends Event {
  detail: T;

  constructor(type: string, init?: CustomEventInit<T>) {
    super(type);
    this.detail = init?.detail as T;
  }
} as unknown as typeof CustomEvent;

const installWindow = (onDispatch?: (event: Event) => void): void => {
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    writable: true,
    value: TestCustomEvent,
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      location: {
        hostname: 'localhost',
        origin: 'http://localhost:5176',
      },
      dispatchEvent: (event: Event) => {
        onDispatch?.(event);
        return true;
      },
    } as Window,
  });
};

const restoreWindow = (): void => {
  if (originalCustomEvent) {
    Object.defineProperty(globalThis, 'CustomEvent', {
      configurable: true,
      writable: true,
      value: originalCustomEvent,
    });
  } else {
    Reflect.deleteProperty(globalThis, 'CustomEvent');
  }

  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: originalWindow,
    });
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
};

const requestUrl = (input: string | URL | Request): string => {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
};

const authProfileResponse = (email: string): Response => new Response(JSON.stringify({
  data: {
    id: 42,
    email,
  },
}), {
  headers: { 'content-type': 'application/json' },
  status: 200,
});

afterEach(() => {
  restoreWindow();
});

test('ensureRealtimeAuthSession succeeds when the current auth cookie is valid', async (t) => {
  const urls: string[] = [];
  installWindow();

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = requestUrl(input);
    urls.push(url);
    return authProfileResponse('active.user@example.com');
  });

  const ok = await ensureRealtimeAuthSession();

  assert.equal(ok, true);
  assert.deepEqual(urls, ['/api/auth/mypage']);
});

test('ensureRealtimeAuthSession can force a network cookie check when a test profile is injected', async (t) => {
  const urls: string[] = [];
  installWindow();
  ((globalThis as GlobalWithTestWindow).window as Window & {
    __BEGA_TEST_AUTH_PROFILE__?: Record<string, unknown>;
  }).__BEGA_TEST_AUTH_PROFILE__ = {
    data: {
      id: 7,
      email: 'injected.user@example.com',
    },
  };

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = requestUrl(input);
    urls.push(url);
    return authProfileResponse('network.user@example.com');
  });

  const ok = await ensureRealtimeAuthSession({ useInjectedProfile: false });

  assert.equal(ok, true);
  assert.deepEqual(urls, ['/api/auth/mypage']);
});

test('ensureRealtimeAuthSession reissues before websocket connection when access cookie expired', async (t) => {
  const urls: string[] = [];
  let profileRequestCount = 0;
  installWindow();

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = requestUrl(input);
    urls.push(url);

    if (url.endsWith('/api/auth/mypage') && profileRequestCount++ === 0) {
      return new Response(JSON.stringify({
        code: 'TOKEN_EXPIRED',
        message: 'Unauthorized',
      }), {
        headers: { 'content-type': 'application/json' },
        status: 401,
      });
    }

    if (url.endsWith('/api/auth/reissue')) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    return authProfileResponse('restored.user@example.com');
  });

  const ok = await ensureRealtimeAuthSession();

  assert.equal(ok, true);
  assert.equal(urls.filter((url) => url.endsWith('/api/auth/mypage')).length, 2);
  assert.ok(urls.some((url) => url.endsWith('/api/auth/reissue')));
});

test('ensureRealtimeAuthSession shares concurrent websocket auth recovery attempts', async (t) => {
  const events: Array<CustomEvent<Record<string, unknown>>> = [];
  const urls: string[] = [];
  let profileRequestCount = 0;
  installWindow((event) => {
    events.push(event as CustomEvent<Record<string, unknown>>);
  });

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = requestUrl(input);
    urls.push(url);

    if (url.endsWith('/api/auth/mypage') && profileRequestCount++ === 0) {
      return new Response(JSON.stringify({
        code: 'TOKEN_EXPIRED',
        message: 'Unauthorized',
      }), {
        headers: { 'content-type': 'application/json' },
        status: 401,
      });
    }

    if (url.endsWith('/api/auth/reissue')) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    return authProfileResponse('shared.realtime.user@example.com');
  });

  const [first, second] = await Promise.all([
    ensureRealtimeAuthSession(),
    ensureRealtimeAuthSession(),
  ]);

  assert.equal(first, true);
  assert.equal(second, true);
  assert.equal(urls.filter((url) => url.endsWith('/api/auth/mypage')).length, 2);
  assert.equal(urls.filter((url) => url.endsWith('/api/auth/reissue')).length, 1);
  assert.equal(events.length, 0);
});

test('ensureRealtimeAuthSession dispatches auth expiration when reissue fails', async (t) => {
  const events: Array<CustomEvent<Record<string, unknown>>> = [];
  installWindow((event) => {
    events.push(event as CustomEvent<Record<string, unknown>>);
  });

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = requestUrl(input);

    if (url.endsWith('/api/auth/reissue')) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        headers: { 'content-type': 'application/json' },
        status: 401,
      });
    }

    return new Response(JSON.stringify({
      code: 'TOKEN_EXPIRED',
      message: 'Unauthorized',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 401,
    });
  });

  const ok = await ensureRealtimeAuthSession();

  assert.equal(ok, false);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'auth-session-expired');
  assert.equal(events[0].detail.cause, 'realtime_auth_failed');
  assert.equal(events[0].detail.requestUrl, '/ws');
  assert.equal(events[0].detail.requestStatus, 401);
  assert.equal(events[0].detail.requestCode, 'TOKEN_EXPIRED');
});

test('ensureRealtimeAuthSession allows websocket attempt for backend errors', async (t) => {
  const events: Array<CustomEvent<Record<string, unknown>>> = [];
  installWindow((event) => {
    events.push(event as CustomEvent<Record<string, unknown>>);
  });

  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    message: 'Internal Server Error',
  }), {
    headers: { 'content-type': 'application/json' },
    status: 500,
  }));

  const ok = await ensureRealtimeAuthSession();

  assert.equal(ok, true);
  assert.equal(events.length, 0);
});
