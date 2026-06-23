import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeWinProbabilityPercent,
  resolveWinProbabilityDisplay,
} from './coachWinProbability';

test('normalizeWinProbabilityPercent는 0~1 확률을 표시용 퍼센트로 변환한다', () => {
  assert.equal(normalizeWinProbabilityPercent(0.62), 62);
  assert.equal(normalizeWinProbabilityPercent(0.625), 63);
  assert.equal(normalizeWinProbabilityPercent(1), 100);
});

test('normalizeWinProbabilityPercent는 이미 퍼센트인 값을 그대로 정규화한다', () => {
  assert.equal(normalizeWinProbabilityPercent(62), 62);
  assert.equal(normalizeWinProbabilityPercent(62.4), 62);
  assert.equal(normalizeWinProbabilityPercent(62.5), 63);
});

test('resolveWinProbabilityDisplay는 홈/원정 표시값과 우세 팀을 계산한다', () => {
  assert.deepEqual(resolveWinProbabilityDisplay(0.38), {
    homePct: 38,
    awayPct: 62,
    favoredPct: 62,
    favoredSide: 'away',
    diffPct: 24,
  });
  assert.deepEqual(resolveWinProbabilityDisplay(62), {
    homePct: 62,
    awayPct: 38,
    favoredPct: 62,
    favoredSide: 'home',
    diffPct: 24,
  });
});

test('resolveWinProbabilityDisplay는 유효하지 않은 값을 렌더 불가로 처리한다', () => {
  assert.equal(resolveWinProbabilityDisplay(null), null);
  assert.equal(resolveWinProbabilityDisplay(undefined), null);
  assert.equal(resolveWinProbabilityDisplay(Number.NaN), null);
  assert.equal(resolveWinProbabilityDisplay(-0.1), null);
});
