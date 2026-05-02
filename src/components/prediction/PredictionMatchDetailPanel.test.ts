import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPredictionDetailRetryButtonLabel,
  getRankingSnapshotScopeKey,
  isResolvedRankingSnapshotReady,
} from './PredictionMatchDetailPanel';

test('getRankingSnapshotScopeKey는 date snapshot scope를 stable key로 만든다', () => {
  const scopeKey = getRankingSnapshotScopeKey(new Date('2026-04-13T00:00:00Z'), 2026);

  assert.equal(scopeKey, 'date:2026-04-13');
});

test('getRankingSnapshotScopeKey는 date가 없으면 season scope를 사용한다', () => {
  const scopeKey = getRankingSnapshotScopeKey(null, 2026);

  assert.equal(scopeKey, 'season:2026');
});

test('isResolvedRankingSnapshotReady는 현재 selection용 snapshot이 resolve된 뒤에만 true를 반환한다', () => {
  assert.equal(
    isResolvedRankingSnapshotReady({
      rankingSnapshot: {
        rankingSeasonYear: 2026,
        rankingSourceMessage: '',
        isOffSeason: false,
        rankings: [],
      },
      rankingSnapshotLoading: false,
      resolvedScopeKey: 'date:2026-04-13',
      expectedScopeKey: 'date:2026-04-13',
    }),
    true,
  );

  assert.equal(
    isResolvedRankingSnapshotReady({
      rankingSnapshot: {
        rankingSeasonYear: 2026,
        rankingSourceMessage: '',
        isOffSeason: false,
        rankings: [],
      },
      rankingSnapshotLoading: true,
      resolvedScopeKey: 'date:2026-04-13',
      expectedScopeKey: 'date:2026-04-13',
    }),
    false,
  );

  assert.equal(
    isResolvedRankingSnapshotReady({
      rankingSnapshot: {
        rankingSeasonYear: 2026,
        rankingSourceMessage: '',
        isOffSeason: false,
        rankings: [],
      },
      rankingSnapshotLoading: false,
      resolvedScopeKey: 'date:2026-04-12',
      expectedScopeKey: 'date:2026-04-13',
    }),
    false,
  );
});

test('getPredictionDetailRetryButtonLabel는 수동 야구 데이터 계약에서 재확인 문구를 사용한다', () => {
  assert.equal(
    getPredictionDetailRetryButtonLabel('MANUAL_BASEBALL_DATA_REQUIRED'),
    '데이터 다시 확인',
  );

  assert.equal(getPredictionDetailRetryButtonLabel('SERVER'), '다시 시도');
});
