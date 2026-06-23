import assert from 'node:assert/strict';
import test from 'node:test';

import type { PartyStatus } from '../types/mate';
import {
  getAdminStatusBadgeMeta,
  getGameStatusBadgeMeta,
  getMateStatusBadgeMeta,
} from './statusBadgeMeta';

test('getMateStatusBadgeMeta는 모든 파티 상태를 Quiet Signal 메타로 반환한다', () => {
  const cases: Array<[PartyStatus, string, string, boolean | undefined, string | undefined]> = [
    ['PENDING', '모집 중', 'dot', true, undefined],
    ['MATCHED', '매칭 성공', 'check', undefined, undefined],
    ['FAILED', '매칭 실패', 'x', undefined, undefined],
    ['SELLING', '판매 중', 'arrow', true, 'hover'],
    ['SOLD', '판매 완료', 'check', undefined, undefined],
    ['CHECKED_IN', '체크인', 'diamond', undefined, undefined],
    ['COMPLETED', '관람 완료', 'check', undefined, undefined],
  ];

  cases.forEach(([status, label, marker, live, liveMode]) => {
    const meta = getMateStatusBadgeMeta(status);
    assert.equal(meta.label, label);
    assert.equal(meta.marker, marker);
    assert.equal(meta.live, live);
    assert.equal(meta.liveMode, liveMode);
  });
});

test('getGameStatusBadgeMeta는 주요 경기 상태를 표준화한다', () => {
  assert.deepEqual(
    {
      label: getGameStatusBadgeMeta('SCHEDULED').label,
      marker: getGameStatusBadgeMeta('SCHEDULED').marker,
      live: getGameStatusBadgeMeta('SCHEDULED').live,
    },
    { label: '경기 예정', marker: 'dot', live: undefined },
  );
  assert.deepEqual(
    {
      label: getGameStatusBadgeMeta('IN_PROGRESS').label,
      marker: getGameStatusBadgeMeta('IN_PROGRESS').marker,
      live: getGameStatusBadgeMeta('IN_PROGRESS').live,
      liveMode: getGameStatusBadgeMeta('IN_PROGRESS').liveMode,
    },
    { label: 'LIVE', marker: 'dot', live: true, liveMode: undefined },
  );
  assert.equal(getGameStatusBadgeMeta('FINAL').label, '경기 종료');
  assert.equal(getGameStatusBadgeMeta('CANCELLED').marker, 'dash');
  assert.equal(getGameStatusBadgeMeta('POSTPONED', '우천 취소').label, '우천 취소');
});

test('getAdminStatusBadgeMeta는 PASS/FAIL/진행 상태를 구분한다', () => {
  assert.equal(getAdminStatusBadgeMeta('PASS').marker, 'check');
  assert.equal(getAdminStatusBadgeMeta('FAIL').marker, 'x');
  assert.equal(getAdminStatusBadgeMeta('NO_GO').tone, 'danger');
  assert.equal(getAdminStatusBadgeMeta('IN_REVIEW').live, true);
  assert.equal(getAdminStatusBadgeMeta('IN_REVIEW').liveMode, undefined);
  assert.equal(getAdminStatusBadgeMeta('in_progress').live, true);
  assert.equal(getAdminStatusBadgeMeta('in_progress').liveMode, undefined);
  assert.equal(getAdminStatusBadgeMeta('done').label, '정제 완료');
});
