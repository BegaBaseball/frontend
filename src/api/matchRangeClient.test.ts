import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchMatchRangeWire } from './matchRangeClient';
import { PublicApiError } from './publicClient';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

test('fetchMatchRangeWire normalizes range paging params and returns array responses unchanged', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const body = [{
    gameId: 'GAME-1',
    gameDate: '2026-03-02',
  }];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;
    return buildJsonResponse(body);
  });

  const result = await fetchMatchRangeWire({
    startDate: '2026-03-01',
    endDate: '2026-03-07',
    page: -3,
    size: 0,
    includePast: false,
    withMeta: true,
  });

  assert.deepEqual(result.response, body);
  assert.equal(result.page, 0);
  assert.equal(result.size, 1);
  assert.match(requestUrl, /\/api\/matches\/range\?/);
  assert.ok(requestUrl.includes('startDate=2026-03-01'));
  assert.ok(requestUrl.includes('endDate=2026-03-07'));
  assert.ok(requestUrl.includes('page=0'));
  assert.ok(requestUrl.includes('size=1'));
  assert.ok(requestUrl.includes('includePast=false'));
  assert.ok(requestUrl.includes('withMeta=true'));
  assert.equal(requestInit?.credentials, 'include');
  assert.deepEqual(requestInit?.headers, { Accept: 'application/json' });
});

test('fetchMatchRangeWire caps size at 500 and returns page responses unchanged', async (t) => {
  let requestUrl = '';
  const body = {
    content: [{
      gameId: 'GAME-2',
      gameDate: '2026-03-03',
    }],
    page: 4,
    size: 500,
    totalElements: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: true,
  };

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    return buildJsonResponse(body);
  });

  const result = await fetchMatchRangeWire({
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    page: 4,
    size: 900,
  });

  assert.deepEqual(result.response, body);
  assert.equal(result.page, 4);
  assert.equal(result.size, 500);
  assert.ok(requestUrl.includes('page=4'));
  assert.ok(requestUrl.includes('size=500'));
  assert.ok(requestUrl.includes('includePast=true'));
  assert.ok(requestUrl.includes('withMeta=false'));
});

test('fetchMatchRangeWire propagates public api errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildJsonResponse({
    code: 'RANGE_DOWN',
    message: 'range unavailable',
  }, 503));

  await assert.rejects(
    () => fetchMatchRangeWire({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    }),
    (error: unknown) => {
      assert.ok(error instanceof PublicApiError);
      assert.equal(error.status, 503);
      assert.equal(error.data?.code, 'RANGE_DOWN');
      return true;
    },
  );
});
