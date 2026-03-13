import test from 'node:test';
import assert from 'node:assert/strict';
import api from './axios';
import {
  getPublicFollowCounts,
  getPublicFollowers,
  toggleFollowByHandle,
} from './followApi';

test('getPublicFollowCounts는 handle 기반 공개 경로를 호출한다', async (t) => {
  const getMock = t.mock.method(api, 'get', async () => ({
    data: {
      followerCount: 3,
      followingCount: 7,
      isFollowedByMe: true,
      notifyNewPosts: false,
      blockedByMe: false,
      blockingMe: false,
    },
  }) as never);

  const response = await getPublicFollowCounts('@slug');

  assert.deepEqual(response, {
    followerCount: 3,
    followingCount: 7,
    isFollowedByMe: true,
    notifyNewPosts: false,
    blockedByMe: false,
    blockingMe: false,
  });
  assert.equal(getMock.mock.calls[0]?.arguments[0], '/users/profile/%40slug/follow-counts');
});

test('getPublicFollowers는 내부 id 없이 공개 목록을 정규화한다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: {
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
    },
  }) as never);

  const response = await getPublicFollowers('@slug');

  assert.equal(response.content[0]?.id, null);
  assert.equal(response.content[0]?.handle, '@follower');
});

test('toggleFollowByHandle는 handle 기반 액션 경로를 호출한다', async (t) => {
  const postMock = t.mock.method(api, 'post', async () => ({
    data: {
      following: true,
      notifyNewPosts: false,
      followerCount: 5,
      followingCount: 2,
    },
  }) as never);

  const response = await toggleFollowByHandle('@slug');

  assert.equal(response.following, true);
  assert.equal(postMock.mock.calls[0]?.arguments[0], '/users/profile/%40slug/follow');
});
