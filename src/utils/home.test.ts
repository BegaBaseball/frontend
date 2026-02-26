import test from 'node:test';
import assert from 'node:assert/strict';
import { getFallbackLeagueStartDates } from './home';

test('getFallbackLeagueStartDates returns year-based fallback dates', () => {
  const currentYear = new Date().getFullYear();
  const fallback = getFallbackLeagueStartDates();

  assert.deepEqual(fallback, {
    regularSeasonStart: `${currentYear}-03-22`,
    postseasonStart: `${currentYear}-10-06`,
    koreanSeriesStart: `${currentYear}-10-26`,
  });
});

test('getFallbackLeagueStartDates returns a fresh object per call', () => {
  const first = getFallbackLeagueStartDates();
  const second = getFallbackLeagueStartDates();

  assert.notStrictEqual(first, second);
  assert.deepEqual(first, second);
});
