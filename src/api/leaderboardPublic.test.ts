import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchLeaderboard, fetchHotStreaks, fetchRecentScores, fetchUserRank } from './leaderboardPublic';

test('fetchLeaderboard는 공개 응답의 handle을 유지한다', async (t) => {
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
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchLeaderboard();

  assert.equal(response.content[0]?.handle, '@slug');
  assert.match(requestUrl, /\/api\/leaderboard\?type=season&page=0&size=20$/);
});

test('fetchHotStreaks와 fetchRecentScores는 공개 쿼리스트링을 붙인다', async (t) => {
  const urls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    urls.push(url);

    if (url.includes('/hot-streaks')) {
      return new Response(JSON.stringify([{ userName: 'Slug User', streak: 6, level: 3 }]), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify([{ id: 1, userName: 'Slug User', eventType: 'NORMAL', score: 20, streak: 2, timestamp: '2026-04-01T10:00:00Z' }]), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const hotStreaks = await fetchHotStreaks(5);
  const scores = await fetchRecentScores(12);

  assert.equal(hotStreaks[0]?.streak, 6);
  assert.equal(scores[0]?.score, 20);
  assert.ok(urls.some((url) => /\/api\/leaderboard\/hot-streaks\?limit=5$/.test(url)));
  assert.ok(urls.some((url) => /\/api\/leaderboard\/recent-scores\?limit=12$/.test(url)));
});

test('fetchUserRank는 handle 기반 공개 경로를 호출한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify({
      rank: 8,
      score: 900,
      level: 6,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchUserRank('@slug');

  assert.deepEqual(response, {
    rank: 8,
    score: 900,
    level: 6,
  });
  assert.match(requestUrl, /\/api\/leaderboard\/profile\/%40slug\/rank$/);
});
