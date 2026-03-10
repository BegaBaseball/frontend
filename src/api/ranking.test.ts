import test from 'node:test';
import assert from 'node:assert/strict';

import api from './axios';
import { fetchSharedPrediction, saveRankingPrediction } from './ranking';

test('saveRankingPrediction은 shareId가 포함된 응답을 반환한다', async (t) => {
  t.mock.method(api, 'post', async () => ({
    data: {
      id: 1,
      shareId: '550e8400-e29b-41d4-a716-446655440000',
      seasonYear: 2026,
      teamIdsInOrder: ['LG', 'SS'],
      createdAt: '2026-03-09T00:00:00',
    },
  }) as never);

  const response = await saveRankingPrediction({
    seasonYear: 2026,
    teamIdsInOrder: ['LG', 'SS'],
  });

  assert.equal(response.shareId, '550e8400-e29b-41d4-a716-446655440000');
  assert.deepEqual(response.teamIdsInOrder, ['LG', 'SS']);
});

test('fetchSharedPrediction은 shareId 기반 경로를 호출한다', async (t) => {
  let requestedPath = '';

  t.mock.method(api, 'get', async (path: string) => {
    requestedPath = path;
    return {
      data: {
        id: 1,
        shareId: '550e8400-e29b-41d4-a716-446655440000',
        seasonYear: 2026,
        teamIdsInOrder: ['LG'],
        createdAt: '2026-03-09T00:00:00',
      },
    } as never;
  });

  await fetchSharedPrediction('550e8400-e29b-41d4-a716-446655440000', '2026');

  assert.equal(
    requestedPath,
    '/predictions/ranking/share/550e8400-e29b-41d4-a716-446655440000/2026',
  );
});
