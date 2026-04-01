import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleFollowByHandle } from './followApi';

test('toggleFollowByHandle는 handle 기반 액션 경로를 호출한다', async (t) => {
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
      following: true,
      notifyNewPosts: false,
      followerCount: 5,
      followingCount: 2,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await toggleFollowByHandle('@slug');

  assert.equal(response.following, true);
  assert.match(requestUrl, /\/api\/users\/profile\/%40slug\/follow$/);
  assert.equal(requestInit?.method, 'POST');
});
