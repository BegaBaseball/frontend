import test from 'node:test';
import assert from 'node:assert/strict';
import api from './axios';
import { fetchMyRank } from './leaderboard';

test('fetchMyRank는 숫자 필드를 정규화한다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: {
      handle: '@slug',
      userName: 'Slug User',
      rank: '7',
      totalScore: '1234',
      seasonScore: 700,
      monthlyScore: '300',
      weeklyScore: null,
      level: '9',
      rankTitle: 'ALL_STAR',
      currentStreak: '4',
      maxStreak: 8,
      experiencePoints: '560',
      nextLevelExp: null,
      accuracy: '71.5',
      totalPredictions: '20',
      correctPredictions: 14,
    },
  }) as never);

  const response = await fetchMyRank();

  assert.equal(response.handle, '@slug');
  assert.equal(response.rank, 7);
  assert.equal(response.totalScore, 1234);
  assert.equal(response.monthlyScore, 300);
  assert.equal(response.weeklyScore, 0);
  assert.equal(response.level, 9);
  assert.equal(response.currentStreak, 4);
  assert.equal(response.nextLevelExp, 100);
  assert.equal(response.accuracy, 71.5);
  assert.equal(response.totalPredictions, 20);
  assert.equal(response.correctPredictions, 14);
});
