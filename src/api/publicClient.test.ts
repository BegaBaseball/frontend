import assert from 'node:assert/strict';
import test from 'node:test';

import { DEV_PROXY_UPSTREAM_UNAVAILABLE } from './httpClientCore';
import { PublicApiError, publicGet, publicPost } from './publicClient';

test('publicGet appends query params to the public api path', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await publicGet<{ ok: boolean }>('/kbo/offseason/metadata', {
    params: { year: 2025, mode: 'summary' },
  });

  assert.deepEqual(response, { ok: true });
  assert.match(requestUrl, /\/api\/kbo\/offseason\/metadata\?year=2025&mode=summary$/);
  assert.equal(requestInit?.credentials, 'include');
});

test('publicGet throws a parseable public api error when the server responds with json', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    code: 'OFFSEASON_DOWN',
    message: 'Internal Server Error',
  }), {
    headers: { 'content-type': 'application/json' },
    status: 500,
    statusText: 'Internal Server Error',
  }));

  await assert.rejects(
    publicGet('/kbo/offseason/movements'),
    (error: unknown) => {
      assert.ok(error instanceof PublicApiError);
      assert.equal(error.status, 500);
      assert.equal(error.data?.code, 'OFFSEASON_DOWN');
      assert.equal(error.message, 'Internal Server Error');
      return true;
    },
  );
});

test('publicGet classifies an empty development proxy 500 as upstream unavailable', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', {
    headers: { 'content-type': 'text/plain' },
    status: 500,
    statusText: 'Internal Server Error',
  }));

  await assert.rejects(
    publicGet('/matches/bounds'),
    (error: unknown) => {
      assert.ok(error instanceof PublicApiError);
      assert.equal(error.status, 500);
      assert.equal(error.data?.code, DEV_PROXY_UPSTREAM_UNAVAILABLE);
      assert.match(error.message, /Development API proxy upstream is unavailable/);
      return true;
    },
  );
});

test('publicPost sends a same-origin json body with credentials', async (t) => {
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

  const response = await publicPost<{ success: boolean }, { token: string }>(
    '/auth/account/deletion/recovery',
    { token: 'recovery-token' },
  );

  assert.deepEqual(response, { success: true });
  assert.match(requestUrl, /\/api\/auth\/account\/deletion\/recovery$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.body, JSON.stringify({ token: 'recovery-token' }));
  assert.deepEqual(requestInit?.headers, {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
});
