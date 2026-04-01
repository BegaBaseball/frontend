import test from 'node:test';
import assert from 'node:assert/strict';

import api from './axios';
import { fetchCurrentSeason, saveRankingPrediction } from './ranking';

test('saveRankingPrediction은 shareId가 포함된 응답을 반환한다', async (t) => {
  let requestConfig: Record<string, unknown> | undefined;

  t.mock.method(api, 'post', async (_path: string, _body: unknown, config?: Record<string, unknown>) => {
    requestConfig = config;
    return {
      data: {
        id: 1,
        shareId: '550e8400-e29b-41d4-a716-446655440000',
        seasonYear: 2026,
        teamIdsInOrder: ['LG', 'SS'],
        createdAt: '2026-03-09T00:00:00',
      },
    } as never;
  });

  const response = await saveRankingPrediction({
    seasonYear: 2026,
    teamIdsInOrder: ['LG', 'SS'],
  });

  assert.equal(response.shareId, '550e8400-e29b-41d4-a716-446655440000');
  assert.deepEqual(response.teamIdsInOrder, ['LG', 'SS']);
  assert.equal(requestConfig?.skipGlobalErrorHandler, true);
  assert.equal(requestConfig?.skipAuthSessionHandling, true);
});

test('fetchCurrentSeason은 로컬 인증 복구를 위해 전역 에러/세션 처리를 건너뛴다', async (t) => {
  let requestConfig: Record<string, unknown> | undefined;

  t.mock.method(api, 'get', async (_path: string, config?: Record<string, unknown>) => {
    requestConfig = config;
    return {
      data: {
        seasonYear: 2026,
      },
    } as never;
  });

  const response = await fetchCurrentSeason();

  assert.equal(response.seasonYear, 2026);
  assert.equal(requestConfig?.skipGlobalErrorHandler, true);
  assert.equal(requestConfig?.skipAuthSessionHandling, true);
});
