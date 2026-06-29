import assert from 'node:assert/strict';
import test from 'node:test';

import { DEV_PROXY_UPSTREAM_UNAVAILABLE } from './httpClientCore';
import { PrivateApiError, privateDelete, privateGet, privatePost } from './privateClient';

test('privatePost는 401 후 reissue 성공 시 원 요청을 한 번 재시도한다', async (t) => {
  const urls: string[] = [];
  let requestCount = 0;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    urls.push(url);

    if (url.endsWith('/api/users/profile/%40slug/follow') && requestCount++ === 0) {
      return new Response(JSON.stringify({ code: 'TOKEN_EXPIRED', message: 'Unauthorized' }), {
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

    return new Response(JSON.stringify({
      following: true,
      notifyNewPosts: false,
      followerCount: 11,
      followingCount: 5,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await privatePost<{ following: boolean }, undefined>('/users/profile/%40slug/follow');

  assert.equal(response.following, true);
  assert.equal(urls.filter((url) => url.endsWith('/api/users/profile/%40slug/follow')).length, 2);
  assert.ok(urls.some((url) => url.endsWith('/api/auth/reissue')));
});

test('privatePost는 reissue 실패 시 auth-session-expired를 dispatch하고 에러를 던진다', async (t) => {
  const events: Array<Record<string, unknown> | undefined> = [];
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: {
        hostname: 'localhost',
        origin: 'http://localhost',
      },
      dispatchEvent: (event: Event) => {
        const customEvent = event as CustomEvent<Record<string, unknown> | undefined>;
        events.push(customEvent.detail);
        return true;
      },
    },
  });

  t.after(() => {
    if (originalWindow === undefined) {
      // @ts-expect-error test cleanup
      delete globalThis.window;
      return;
    }

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  });

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (url.endsWith('/api/auth/reissue')) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        headers: { 'content-type': 'application/json' },
        status: 401,
      });
    }

    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      headers: { 'content-type': 'application/json' },
      status: 401,
    });
  });

  await assert.rejects(
    () => privatePost('/users/profile/%40slug/follow'),
    (error: unknown) => {
      assert.ok(error instanceof PrivateApiError);
      assert.equal(error.status, 401);
      return true;
    },
  );

  assert.equal(events.length, 1);
  assert.equal(events[0]?.cause, 'reissue_failed');
});

test('privateGet classifies an empty development proxy 500 as upstream unavailable', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', {
    headers: { 'content-type': 'text/plain' },
    status: 500,
    statusText: 'Internal Server Error',
  }));

  await assert.rejects(
    privateGet('/auth/mypage', { skipAuthSessionHandling: true }),
    (error: unknown) => {
      assert.ok(error instanceof PrivateApiError);
      assert.equal(error.status, 500);
      assert.equal(error.data?.code, DEV_PROXY_UPSTREAM_UNAVAILABLE);
      assert.match(error.message, /Development API proxy upstream is unavailable/);
      return true;
    },
  );
});

test('privateDelete는 delete body와 query params를 함께 전송한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await privateDelete<{ success: boolean }, { password: string }>('/auth/account', {
    body: { password: 'Secret123!' },
    params: { reason: 'user-request' },
    skipAuthSessionHandling: true,
  });

  assert.deepEqual(response, { success: true });
  assert.match(requestUrl, /\/api\/auth\/account\?reason=user-request$/);
  assert.equal(requestInit?.method, 'DELETE');
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.body, JSON.stringify({ password: 'Secret123!' }));
});
