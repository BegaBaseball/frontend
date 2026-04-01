import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchPublicUserProfileByHandle } from './profilePublic';

test('fetchPublicUserProfileByHandle는 공개 프로필 경로를 same-origin fetch로 호출한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify({
      success: true,
      data: {
        handle: '@slug',
        name: 'Slug User',
        profileImageUrl: null,
        favoriteTeam: '없음',
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchPublicUserProfileByHandle('@slug');

  assert.equal(response.handle, '@slug');
  assert.equal(response.favoriteTeam, null);
  assert.match(requestUrl, /\/api\/users\/profile\/%40slug$/);
});

