import test from 'node:test';
import assert from 'node:assert/strict';
import { getFallbackLeagueStartDates } from './home';

test('getFallbackLeagueStartDates returns 2026 default dates', () => {
  const fallback = getFallbackLeagueStartDates();

  assert.deepEqual(fallback, {
    regularSeasonStart: '2026-03-28',
    postseasonStart: '2026-10-05',
    koreanSeriesStart: '2026-10-25',
  });
});

test('getFallbackLeagueStartDates returns a fresh object per call', () => {
  const first = getFallbackLeagueStartDates();
  const second = getFallbackLeagueStartDates();

  assert.notStrictEqual(first, second);
  assert.deepEqual(first, second);
});
