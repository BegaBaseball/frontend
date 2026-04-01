import test from 'node:test';
import assert from 'node:assert/strict';
import { getBlockedUsers, toggleBlockByHandle } from './blockApi';

test('toggleBlockByHandle는 handle 기반 액션 경로를 호출한다', async (t) => {
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
      blocked: true,
      blockedCount: 2,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await toggleBlockByHandle('@slug');

  assert.equal(response.blocked, true);
  assert.match(requestUrl, /\/api\/users\/profile\/%40slug\/block$/);
  assert.equal(requestInit?.method, 'POST');
});

test('getBlockedUsers는 handle 기반 목록 응답을 정규화한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify({
      content: [
        {
          handle: '@blocked',
          name: 'Blocked User',
          profileImageUrl: null,
          favoriteTeam: 'LG',
          isFollowedByMe: false,
        },
      ],
      last: true,
      totalPages: 1,
      totalElements: 1,
      size: 20,
      number: 0,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await getBlockedUsers();

  assert.equal(response.content[0]?.handle, '@blocked');
  assert.equal(response.content[0]?.id, null);
  assert.match(requestUrl, /\/api\/users\/me\/blocked\?page=0&size=20$/);
});
