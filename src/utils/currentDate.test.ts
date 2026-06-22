import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatDateKey,
  getDayDifference,
  getLocalTodayKey,
  isSameLocalDateKey,
  parseLocalDate,
} from './currentDate';

test('formatDateKey formats a local Date as yyyy-mm-dd', () => {
  assert.equal(formatDateKey(new Date(2026, 5, 14, 23, 59)), '2026-06-14');
});

test('parseLocalDate treats date-only strings as local midday', () => {
  const parsed = parseLocalDate('2026-06-14');

  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 5);
  assert.equal(parsed.getDate(), 14);
  assert.equal(parsed.getHours(), 12);
});

test('getLocalTodayKey can use an injected clock', () => {
  assert.equal(getLocalTodayKey(new Date(2026, 0, 2, 3, 4)), '2026-01-02');
});

test('isSameLocalDateKey compares by local date key', () => {
  assert.equal(isSameLocalDateKey('2026-06-14', new Date(2026, 5, 14, 23, 59)), true);
  assert.equal(isSameLocalDateKey('2026-06-13', new Date(2026, 5, 14, 0, 1)), false);
});

test('getDayDifference compares dates at local day granularity', () => {
  assert.equal(getDayDifference('2026-06-16', '2026-06-14'), 2);
  assert.equal(getDayDifference('2026-06-13', '2026-06-14'), -1);
});
