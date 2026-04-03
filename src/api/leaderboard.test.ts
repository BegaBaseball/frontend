import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchMyRank, usePowerup } from './leaderboard';

test('fetchMyRank는 숫자 필드를 정규화한다', async (t) => {
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
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

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
  assert.match(requestUrl, /\/api\/leaderboard\/me$/);
  assert.equal(requestInit?.credentials, 'include');
});

test('usePowerup은 인증 POST 요청으로 powerup 사용 결과를 반환한다', async (t) => {
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
      success: true,
      message: '사용 완료',
      remainingCount: 2,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await usePowerup('MAGIC_BAT', 'game-123');

  assert.deepEqual(response, {
    success: true,
    message: '사용 완료',
    remainingCount: 2,
  });
  assert.match(requestUrl, /\/api\/leaderboard\/powerups\/MAGIC_BAT\/use$/);
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.body, JSON.stringify({ gameId: 'game-123' }));
});
