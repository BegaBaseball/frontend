import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMateDDayLabel,
  getMateMinGameDate,
  isMateGameSoon,
} from './mateDateLabels';

const baseNow = new Date(2026, 5, 14, 9, 30);

test('getMateDDayLabel returns D-Day for the same local day', () => {
  assert.equal(getMateDDayLabel('2026-06-14', baseNow), 'D-Day');
});

test('getMateDDayLabel returns future offsets and hides past dates', () => {
  assert.equal(getMateDDayLabel('2026-06-16', baseNow), 'D-2');
  assert.equal(getMateDDayLabel('2026-06-13', baseNow), '');
});

test('getMateDDayLabel caps far future dates as scheduled', () => {
  assert.equal(getMateDDayLabel('2029-03-10', baseNow), '예정');
});

test('getMateMinGameDate formats the current local date for date input min', () => {
  assert.equal(getMateMinGameDate(baseNow), '2026-06-14');
});

test('isMateGameSoon returns true only for games within the next 24 hours', () => {
  assert.equal(isMateGameSoon('2026-06-14T20:00:00', baseNow), true);
  assert.equal(isMateGameSoon('2026-06-15T12:00:00', baseNow), false);
  assert.equal(isMateGameSoon('2026-06-13T20:00:00', baseNow), false);
});
