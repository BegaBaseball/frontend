import test from 'node:test';
import assert from 'node:assert/strict';

import { getPublicFollowCounts, getPublicFollowers, getPublicFollowing } from './followPublic';

test('getPublicFollowCounts는 handle 기반 공개 경로를 same-origin fetch로 호출한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify({
      followerCount: 3,
      followingCount: 7,
      isFollowedByMe: true,
      notifyNewPosts: false,
      blockedByMe: false,
      blockingMe: false,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await getPublicFollowCounts('@slug');

  assert.deepEqual(response, {
    followerCount: 3,
    followingCount: 7,
    isFollowedByMe: true,
    notifyNewPosts: false,
    blockedByMe: false,
    blockingMe: false,
  });
  assert.match(requestUrl, /\/api\/users\/profile\/%40slug\/follow-counts$/);
});

test('getPublicFollowers와 getPublicFollowing은 공개 목록 응답을 정규화한다', async (t) => {
  const urls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    urls.push(url);

    return new Response(JSON.stringify({
      content: [
        {
          handle: '@follower',
          name: 'Follower',
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

  const followers = await getPublicFollowers('@slug');
  const following = await getPublicFollowing('@slug', 1, 10);

  assert.equal(followers.content[0]?.id, null);
  assert.equal(followers.content[0]?.handle, '@follower');
  assert.equal(following.content[0]?.handle, '@follower');
  assert.ok(urls.some((url) => /\/api\/users\/profile\/%40slug\/followers\?page=0&size=20$/.test(url)));
  assert.ok(urls.some((url) => /\/api\/users\/profile\/%40slug\/following\?page=1&size=10$/.test(url)));
});

