import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchAllUserVotesBulk,
  fetchGameLiveRelaySnapshot,
  fetchGameLiveSnapshot,
  fetchGameLiveSummaries,
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

test('fetchMatchesByDay는 수동 야구 데이터 요청 계약을 유지한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    code: 'MANUAL_BASEBALL_DATA_REQUIRED',
    message: '다음 야구 데이터가 필요합니다: 경기 날짜, 시즌/리그 구분',
    data: {
      scope: 'prediction.matches_by_date',
      missingItems: [],
      operatorMessage: '다음 야구 데이터가 필요합니다: 경기 날짜, 시즌/리그 구분',
      blocking: true,
    },
  }), {
    headers: { 'content-type': 'application/json' },
    status: 409,
  }));

  const response = await fetchMatchesByDay('2026-04-05');

  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, 'MANUAL_BASEBALL_DATA_REQUIRED');
    assert.equal(
      response.error.message,
      '야구 데이터 준비가 필요합니다. 운영자가 데이터를 제공하면 다시 확인할 수 있습니다.',
    );
  }
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

test('fetchAllUserVotesBulk는 인증 실패 상태와 코드를 보존해 던진다', async (t) => {
  const requests: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requests.push(requestUrl);

    if (requestUrl.includes('/api/auth/reissue')) {
      return new Response(JSON.stringify({
        code: 'AUTH_REISSUE_FAILED',
        message: '세션이 만료되었습니다.',
      }), {
        headers: { 'content-type': 'application/json' },
        status: 401,
      });
    }

    return new Response(JSON.stringify({
      code: 'AUTHENTICATION_REQUIRED',
      message: '로그인이 필요합니다.',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 401,
    });
  });

  await assert.rejects(
    () => fetchAllUserVotesBulk(['game-401']),
    (error: { status?: number; data?: { code?: string } }) => {
      assert.equal(error.status, 401);
      assert.equal(error.data?.code, 'AUTHENTICATION_REQUIRED');
      return true;
    }
  );

  assert.equal(requests.length, 2);
  assert.match(requests[0], /\/api\/predictions\/my-votes$/);
  assert.match(requests[1], /\/api\/auth\/reissue$/);
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

test('fetchGameLiveSnapshot은 delta 조회 파라미터와 문자중계 응답을 정규화한다', async (t) => {
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
      game_id: 'GAME-1',
      game_status: 'IN_PROGRESS',
      home_score: '3',
      away_score: 2,
      current_inning: '7',
      current_inning_half: 'BOTTOM',
      last_event_seq: '42',
      last_updated_at: '2026-04-29T19:45:00',
      events: [{
        event_seq: '42',
        inning: '7',
        inning_half: 'BOTTOM',
        outs: '1',
        batter_name: '홍길동',
        pitcher_name: '김투수',
        description: '좌전 안타',
        event_type: 'HIT',
        result_code: 'SINGLE',
        rbi: '1',
        bases_before: '100',
        bases_after: '010',
        home_score: '3',
        away_score: 2,
        wpa: '0.12',
        win_expectancy_before: '0.55',
        win_expectancy_after: '0.67',
        updated_at: '2026-04-29T19:45:00',
      }],
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const snapshot = await fetchGameLiveSnapshot('GAME-1', { afterSeq: 7, limit: 50 });
  const parsedUrl = new URL(requestUrl, 'http://localhost');

  assert.equal(parsedUrl.pathname, '/api/matches/GAME-1/live');
  assert.equal(parsedUrl.searchParams.get('afterSeq'), '7');
  assert.equal(parsedUrl.searchParams.get('limit'), '50');
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'GET');
  assert.equal(snapshot.gameStatus, 'IN_PROGRESS');
  assert.equal(snapshot.homeScore, 3);
  assert.equal(snapshot.lastEventSeq, 42);
  assert.equal(snapshot.events[0].eventSeq, 42);
  assert.equal(snapshot.events[0].wpa, 0.12);
});

test('fetchGameLiveRelaySnapshot은 원문 문자중계 delta 응답을 정규화한다', async (t) => {
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
      game_id: 'GAME-1',
      last_relay_id: '15',
      last_updated_at: '2026-04-29T20:15:00',
      events: [{
        relay_id: '15',
        inning: '7',
        inning_half: 'BOTTOM',
        pitcher_name: '김투수',
        batter_name: '김도영',
        play_description: '김도영 : 좌익수 왼쪽 2루타',
        event_type: 'PLAY',
        result: '2루타',
        created_at: '2026-04-29T20:14:50',
        updated_at: '2026-04-29T20:15:00',
      }],
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const snapshot = await fetchGameLiveRelaySnapshot('GAME-1', { afterId: 7, limit: 50 });
  const parsedUrl = new URL(requestUrl, 'http://localhost');

  assert.equal(parsedUrl.pathname, '/api/matches/GAME-1/live-relay');
  assert.equal(parsedUrl.searchParams.get('afterId'), '7');
  assert.equal(parsedUrl.searchParams.get('limit'), '50');
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'GET');
  assert.equal(snapshot.gameId, 'GAME-1');
  assert.equal(snapshot.lastRelayId, 15);
  assert.equal(snapshot.events[0].relayId, 15);
  assert.equal(snapshot.events[0].playDescription, '김도영 : 좌익수 왼쪽 2루타');
});

test('fetchGameLiveSummaries는 gameId 중복을 제거하고 홈 카드 응답을 정규화한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify([{
      game_id: 'GAME-1',
      game_status: 'LIVE',
      home_score: '4',
      away_score: '3',
      last_event_seq: '12',
      last_updated_at: '2026-04-29T20:00:00',
    }, {
      gameId: '',
      gameStatus: 'LIVE',
    }]), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const summaries = await fetchGameLiveSummaries(['GAME-1', 'GAME-1', '', 'GAME-2']);
  const parsedUrl = new URL(requestUrl, 'http://localhost');

  assert.equal(parsedUrl.pathname, '/api/matches/live');
  assert.equal(parsedUrl.searchParams.get('gameIds'), 'GAME-1,GAME-2');
  assert.deepEqual(summaries, [{
    gameId: 'GAME-1',
    gameStatus: 'LIVE',
    homeScore: 4,
    awayScore: 3,
    lastEventSeq: 12,
    lastUpdatedAt: '2026-04-29T20:00:00',
  }]);
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
