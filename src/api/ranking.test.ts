import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchCurrentSeason, fetchSavedPrediction, saveRankingPrediction } from './ranking';

test('saveRankingPrediction은 인증 fetch로 shareId가 포함된 응답을 반환한다', async (t) => {
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
      id: 1,
      shareId: '550e8400-e29b-41d4-a716-446655440000',
      seasonYear: 2026,
      teamIdsInOrder: ['LG', 'SS'],
      createdAt: '2026-03-09T00:00:00',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await saveRankingPrediction({
    seasonYear: 2026,
    teamIdsInOrder: ['LG', 'SS'],
  });

  assert.equal(response.shareId, '550e8400-e29b-41d4-a716-446655440000');
  assert.deepEqual(response.teamIdsInOrder, ['LG', 'SS']);
  assert.match(requestUrl, /\/api\/predictions\/ranking$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.body, JSON.stringify({
    seasonYear: 2026,
    teamIdsInOrder: ['LG', 'SS'],
  }));
});

test('fetchCurrentSeason은 공개 fetch로 시즌 정보를 조회한다', async (t) => {
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
      seasonYear: 2026,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchCurrentSeason();

  assert.equal(response.seasonYear, 2026);
  assert.match(requestUrl, /\/api\/predictions\/ranking\/current-season$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'GET');
});

test('fetchSavedPrediction은 404면 null을 반환한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    code: 'PREDICTION_NOT_FOUND',
    message: 'Not Found',
  }), {
    headers: { 'content-type': 'application/json' },
    status: 404,
  }));

  const response = await fetchSavedPrediction(2026);

  assert.equal(response, null);
});
