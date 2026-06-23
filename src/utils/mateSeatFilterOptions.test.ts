import assert from 'node:assert/strict';
import test from 'node:test';

import { countActiveMateSeatFilters } from './mateSeatFilterCount';
import { resolveMateSeatFilterOptions } from './mateSeatFilterOptions';

test('resolveMateSeatFilterOptions returns the default filters without a stadium match', () => {
  assert.deepEqual(
    resolveMateSeatFilterOptions('').map((option) => option.label),
    ['응원석', '테이블석', '프리미엄', '익사이팅'],
  );
});

test('resolveMateSeatFilterOptions resolves stadium filters by team alias', () => {
  assert.deepEqual(
    resolveMateSeatFilterOptions('삼성 블루존').map((option) => option.label),
    ['블루존', 'VIP석', '테이블석 (지브로존)'],
  );
});

test('resolveMateSeatFilterOptions preserves Daejeon representative filter order', () => {
  assert.deepEqual(
    resolveMateSeatFilterOptions('한화').map((option) => option.label),
    ['VIP 프리미엄석', '홈 플레이트 테이블석', '중앙 탁자석', '내야 하단 지정석'],
  );
});

test('countActiveMateSeatFilters counts active labels from the resolved filter set', () => {
  assert.equal(countActiveMateSeatFilters('응원석 프리미엄'), 2);
  assert.equal(countActiveMateSeatFilters('삼성 블루존'), 1);
  assert.equal(countActiveMateSeatFilters('블루존'), 0);
});
