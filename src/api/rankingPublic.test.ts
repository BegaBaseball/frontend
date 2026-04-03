import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchSharedPrediction } from './rankingPublic';

test('fetchSharedPrediction은 shareId 기반 public 경로를 호출한다', async (t) => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestCredentials: RequestCredentials | undefined;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = t.mock.fn(async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestCredentials = init?.credentials;

    return {
      ok: true,
      headers: {
        get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        id: 1,
        shareId: '550e8400-e29b-41d4-a716-446655440000',
        seasonYear: 2026,
        teamIdsInOrder: ['LG'],
        createdAt: '2026-03-09T00:00:00',
      }),
    } as Response;
  });

  const response = await fetchSharedPrediction('550e8400-e29b-41d4-a716-446655440000', '2026');

  assert.match(
    requestedUrl,
    /\/api\/predictions\/ranking\/share\/550e8400-e29b-41d4-a716-446655440000\/2026$/,
  );
  assert.equal(requestCredentials, 'include');
  assert.equal(response.seasonYear, 2026);
  assert.deepEqual(response.teamIdsInOrder, ['LG']);
});
