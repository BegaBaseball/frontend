import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchMatchBounds, fetchMatchesByRangeWithMeta } from './predictionRange';

test('fetchMatchBounds는 공개 경기 경계 API를 조회한다', async (t) => {
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
      hasData: true,
      earliestGameDate: '2026-03-01',
      latestGameDate: '2026-11-01',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchMatchBounds();

  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(response.data.hasData, true);
    assert.equal(response.data.earliestGameDate, '2026-03-01');
  }
  assert.match(requestUrl, /\/api\/matches\/bounds$/);
  assert.equal(requestInit?.method, 'GET');
  assert.equal(requestInit?.credentials, 'include');
});

test('fetchMatchesByRangeWithMeta는 meta 응답을 유지한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify({
      content: [{
        gameId: 'GAME-1',
        gameDate: '2026-03-02',
        homeTeam: 'LG',
        awayTeam: 'SS',
        stadium: '잠실야구장',
        startTime: { hour: 18, minute: 30, second: 0 },
      }],
      page: 0,
      size: 150,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchMatchesByRangeWithMeta({
    startDate: '2026-03-01',
    endDate: '2026-03-07',
  });

  assert.equal(response.ok, true);
  if (response.ok) {
    assert.equal(response.data.page, 0);
    assert.equal(response.data.totalElements, 1);
    assert.equal(response.data.content[0]?.startTime, '18:30:00');
  }
  assert.match(requestUrl, /\/api\/matches\/range\?/);
  assert.match(requestUrl, /startDate=2026-03-01/);
  assert.match(requestUrl, /endDate=2026-03-07/);
  assert.match(requestUrl, /withMeta=true/);
});
