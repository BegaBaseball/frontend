import test from 'node:test';
import assert from 'node:assert/strict';
import api from './axios';
import { getBlockedUsers, toggleBlockByHandle } from './blockApi';

test('toggleBlockByHandle는 handle 기반 액션 경로를 호출한다', async (t) => {
  const postMock = t.mock.method(api, 'post', async () => ({
    data: {
      blocked: true,
      blockedCount: 2,
    },
  }) as never);

  const response = await toggleBlockByHandle('@slug');

  assert.equal(response.blocked, true);
  assert.equal(postMock.mock.calls[0]?.arguments[0], '/users/profile/%40slug/block');
});

test('getBlockedUsers는 handle 기반 목록 응답을 정규화한다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: {
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
    },
  }) as never);

  const response = await getBlockedUsers();

  assert.equal(response.content[0]?.handle, '@blocked');
  assert.equal(response.content[0]?.id, null);
});
