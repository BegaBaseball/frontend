import test from 'node:test';
import assert from 'node:assert/strict';
import { getMyFollowCounts, getMyFollowers, toggleFollowByHandle } from './followApi';

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

test('getMyFollowCounts는 인증 same-origin 경로를 호출한다', async (t) => {
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
      followerCount: 8,
      followingCount: 13,
      isFollowedByMe: false,
      notifyNewPosts: true,
      blockedByMe: false,
      blockingMe: false,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await getMyFollowCounts();

  assert.equal(response.followerCount, 8);
  assert.equal(response.followingCount, 13);
  assert.match(requestUrl, /\/api\/users\/me\/follow-counts$/);
  assert.equal(requestInit?.method, 'GET');
});

test('getMyFollowers는 인증 same-origin 목록 경로를 호출한다', async (t) => {
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
          handle: '@slugger',
          name: 'Slugger',
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

  const response = await getMyFollowers(1, 10);

  assert.equal(response.content[0]?.handle, '@slugger');
  assert.match(requestUrl, /\/api\/users\/me\/followers\?page=1&size=10$/);
});
