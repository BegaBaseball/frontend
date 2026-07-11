import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulateCheerPollingCount,
  advanceCheerPollingCursor,
  buildPostChangesQuery,
  resolveLatestVisiblePostId,
} from './cheerPolling';

test('resolveLatestVisiblePostId: 양수 ID 중 가장 큰 값을 반환한다', () => {
  const latest = resolveLatestVisiblePostId([
    { id: -1001 }, // optimistic post
    { id: 21 },
    { id: 7 },
    { id: 42 },
  ]);

  assert.equal(latest, 42);
});

test('resolveLatestVisiblePostId: 양수 ID가 없으면 null을 반환한다', () => {
  assert.equal(resolveLatestVisiblePostId([]), null);
  assert.equal(resolveLatestVisiblePostId([{ id: 0 }, { id: -1 }]), null);
});

test('buildPostChangesQuery: sinceId/teamId를 올바르게 포함한다', () => {
  const query = buildPostChangesQuery({ sinceId: 120, teamId: 'LG' });
  assert.equal(query, '?sinceId=120&teamId=LG');
});

test('buildPostChangesQuery: teamId=all은 제외하고 sinceId=0은 유지한다', () => {
  const query = buildPostChangesQuery({ sinceId: 0, teamId: 'all' });
  assert.equal(query, '?sinceId=0');
});

test('buildPostChangesQuery: 파라미터가 없으면 빈 문자열을 반환한다', () => {
  assert.equal(buildPostChangesQuery(), '');
  assert.equal(buildPostChangesQuery({ sinceId: null, teamId: null }), '');
});

test('advanceCheerPollingCursor: 서버 스캔 커서를 단조 증가시킨다', () => {
  assert.equal(advanceCheerPollingCursor(100, 300), 300);
  assert.equal(advanceCheerPollingCursor(300, 250), 300);
  assert.equal(advanceCheerPollingCursor(null, 200), 200);
  assert.equal(advanceCheerPollingCursor(200, null), 200);
});

test('accumulateCheerPollingCount: 연속 200건 청크의 새 글 수를 누적한다', () => {
  const chunkCounts = [180, 175, 25];
  const total = chunkCounts.reduce(accumulateCheerPollingCount, 0);

  assert.equal(total, 380);
  assert.equal(accumulateCheerPollingCount(total, -1), total);
});
