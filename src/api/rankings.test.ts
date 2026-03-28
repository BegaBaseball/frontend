import test from 'node:test';
import assert from 'node:assert/strict';

import api from './axios';
import {
  fetchRankingSnapshot,
  getRankingSnapshotQueryOptions,
} from './rankings';

test('fetchRankingSnapshot은 공개 랭킹 스냅샷 요청으로 세션 처리만 건너뛰고 seasonYear를 전달한다', async (t) => {
  let requestConfig: Record<string, unknown> | undefined;

  t.mock.method(api, 'get', async (_path: string, config?: Record<string, unknown>) => {
    requestConfig = config;
    return {
      data: {
        rankingSeasonYear: 2025,
        rankingSourceMessage: '2025 시즌 순위 데이터',
        isOffSeason: false,
        rankings: [],
      },
    } as never;
  });

  const response = await fetchRankingSnapshot({ seasonYear: 2025 });

  assert.equal(response.rankingSeasonYear, 2025);
  assert.equal(requestConfig?.skipAuthSessionHandling, true);
  assert.deepEqual(requestConfig?.params, { seasonYear: 2025 });
  assert.equal('skipGlobalErrorHandler' in (requestConfig ?? {}), false);
});

test('getRankingSnapshotQueryOptions는 auto와 explicit seasonYear를 서로 다른 캐시 키로 분리한다', () => {
  const date = new Date('2026-03-16T12:00:00');

  assert.deepEqual(getRankingSnapshotQueryOptions({ date }).queryKey, ['ranking-snapshot', '2026-03-16', 'auto']);
  assert.deepEqual(getRankingSnapshotQueryOptions({ seasonYear: 2025 }).queryKey, ['ranking-snapshot', 'today', 2025]);
});

test('fetchRankingSnapshot은 legacy 배열 응답도 스냅샷 형태로 정규화한다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: [
      {
        teamId: 'HH',
        teamName: '한화 이글스',
        rank: 1,
        wins: 80,
        losses: 55,
        draws: 0,
        winRate: '0.593',
        games: 135,
        gamesBehind: 0,
      },
    ],
  }) as never);

  const response = await fetchRankingSnapshot({ seasonYear: 2026 });

  assert.equal(response.rankingSeasonYear, 2026);
  assert.equal(response.rankingSourceMessage, '2026 시즌 순위 데이터');
  assert.equal(response.isOffSeason, false);
  assert.equal(response.rankings[0]?.teamId, 'HH');
});
