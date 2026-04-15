import test from 'node:test';
import assert from 'node:assert/strict';

import type { DateGames } from '../types/prediction';
import {
  hasPredictionAdditionalPastMatches,
  normalizePredictionBoundaryDate,
  resolvePredictionNearestNavigationDate,
} from './predictionMatchNavigation';

test('resolvePredictionNearestNavigationDate prefers loaded previous date with games', () => {
  const result = resolvePredictionNearestNavigationDate(
    [
      { date: '2026-04-09', games: [{ gameId: 'A' }] },
      { date: '2026-04-10', games: [] },
      { date: '2026-04-11', games: [{ gameId: 'B' }] },
    ] as DateGames[],
    { prevDate: '2026-04-09', nextDate: '2026-04-11' },
  );

  assert.deepEqual(result, { date: '2026-04-09', isPast: true });
});

test('resolvePredictionNearestNavigationDate falls back to next date when previous candidate is known empty', () => {
  const result = resolvePredictionNearestNavigationDate(
    [
      { date: '2026-04-09', games: [] },
      { date: '2026-04-10', games: [] },
    ] as DateGames[],
    { prevDate: '2026-04-09', nextDate: '2026-04-12' },
  );

  assert.deepEqual(result, { date: '2026-04-12', isPast: false });
});

test('normalizePredictionBoundaryDate trims time payloads', () => {
  assert.equal(normalizePredictionBoundaryDate('2026-04-10T18:30:00'), '2026-04-10');
  assert.equal(normalizePredictionBoundaryDate(' 2026-04-10 '), '2026-04-10');
  assert.equal(normalizePredictionBoundaryDate(''), null);
});

test('hasPredictionAdditionalPastMatches compares normalized earliest boundary and loaded date', () => {
  const result = hasPredictionAdditionalPastMatches(
    {
      hasData: true,
      earliestGameDate: '2026-04-01T00:00:00',
      latestGameDate: '2026-04-04T00:00:00',
    },
    [
      { date: '2026-04-03', games: [] },
      { date: '2026-04-04', games: [] },
    ] as DateGames[],
  );

  assert.equal(result, true);
});
