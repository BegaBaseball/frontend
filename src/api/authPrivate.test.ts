import assert from 'node:assert/strict';
import test from 'node:test';

import { getLinkToken } from './authPrivate';

test('getLinkToken은 인증 same-origin fetch로 링크 토큰 경로를 호출한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({
      linkToken: 'link-token-123',
      expiresIn: 300,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await getLinkToken();

  assert.deepEqual(response, {
    linkToken: 'link-token-123',
    expiresIn: 300,
  });
  assert.match(requestUrl, /\/api\/auth\/link-token$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'GET');
});
