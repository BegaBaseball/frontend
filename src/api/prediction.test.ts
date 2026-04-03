import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchAllUserVotesBulk,
  fetchMatchesByDay,
  fetchMyPredictionStats,
  fetchVoteStatus,
} from './prediction';

test('fetchMatchesByDay는 공개 경기일 API를 조회한다', async (t) => {
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
      date: '2026-04-02',
      games: [],
      prevDate: '2026-04-01',
      nextDate: '2026-04-03',
      hasPrev: true,
      hasNext: true,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchMatchesByDay('2026-04-02');

  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(response.data.date, '2026-04-02');
    assert.equal(response.data.hasPrev, true);
  }
  assert.match(requestUrl, /\/api\/matches\/day\?date=2026-04-02$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'GET');
});

test('fetchAllUserVotesBulk는 중복 gameId를 제거하고 응답을 정규화한다', async (t) => {
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
      votes: {
        game1: 'HOME',
        game2: 2,
        game3: null,
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchAllUserVotesBulk(['game1', 'game2', 'game1', '', 'game3']);

  assert.deepEqual(response, {
    game1: 'home',
    game2: 'away',
  });
  assert.match(requestUrl, /\/api\/predictions\/my-votes$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.body, JSON.stringify({
    gameIds: ['game1', 'game2', 'game3'],
  }));
});

test('fetchVoteStatus는 다양한 응답 키를 표준 구조로 정규화한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    counts: {
      home_vote: 12,
      awayVoteCount: 8,
      total_vote: 20,
    },
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  const response = await fetchVoteStatus('game-123');

  assert.equal(response.ok, true);
  if (response.ok) {
    assert.deepEqual(response.data, {
      homeVotes: 12,
      awayVotes: 8,
      totalVotes: 20,
    });
  }
});

test('fetchMyPredictionStats는 인증 통계 응답의 data를 반환한다', async (t) => {
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
        accuracy: 72.5,
        streak: 4,
        totalPredictions: 40,
        correctPredictions: 29,
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchMyPredictionStats();

  assert.deepEqual(response, {
    accuracy: 72.5,
    streak: 4,
    totalPredictions: 40,
    correctPredictions: 29,
  });
  assert.match(requestUrl, /\/api\/prediction\/stats\/me$/);
});
