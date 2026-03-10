import test from 'node:test';
import assert from 'node:assert/strict';
import api from './axios';
import { fetchLeaderboard, fetchUserRank } from './leaderboard';

test('fetchLeaderboard는 공개 응답의 handle을 유지한다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: {
      content: [
        {
          rank: 1,
          handle: '@slug',
          userName: 'Slug User',
          level: 9,
          rankTitle: 'ALL_STAR',
          score: 1234,
          streak: 4,
        },
      ],
      totalPages: 1,
      totalElements: 1,
    },
  }) as never);

  const response = await fetchLeaderboard();

  assert.equal(response.content[0]?.handle, '@slug');
});

test('fetchUserRank는 handle 기반 공개 경로를 호출한다', async (t) => {
  const getMock = t.mock.method(api, 'get', async () => ({
    data: {
      rank: 8,
      score: 900,
      level: 6,
    },
  }) as never);

  const response = await fetchUserRank('@slug');

  assert.deepEqual(response, {
    rank: 8,
    score: 900,
    level: 6,
  });
  assert.equal(getMock.mock.calls[0]?.arguments[0], '/leaderboard/profile/%40slug/rank');
});
