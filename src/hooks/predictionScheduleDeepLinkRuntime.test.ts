import assert from 'node:assert/strict';
import test from 'node:test';

import type { DateGames } from '../types/prediction';
import { resolvePredictionScheduleDeepLinkOutcome } from './predictionScheduleDeepLinkRuntime';

const toDateGames = (date: string, gameIds: string[]): DateGames => ({
  date,
  games: gameIds.map((gameId) => ({
    gameId,
    homeTeam: 'HH',
    awayTeam: 'LG',
    stadium: '대전',
    gameDate: date,
  })),
});

test('resolvePredictionScheduleDeepLinkOutcome keeps gameId deep links strict', () => {
  const outcome = resolvePredictionScheduleDeepLinkOutcome({
    allDatesData: [toDateGames('2026-03-07', ['GAME-1', 'GAME-2'])],
    currentDateIndex: 0,
    deepLinkGameId: 'GAME-3',
    deepLinkDate: '2026-03-07',
    deepLinkParamValidationNotice: null,
    canResolveMorePast: false,
    canResolveMoreFuture: false,
    deepLinkResolutionAttempt: 2,
    deepLinkResolutionDirection: 'future',
  });

  assert.equal(outcome.type, 'fallback');
});

test('resolvePredictionScheduleDeepLinkOutcome still allows date-only fallback', () => {
  const outcome = resolvePredictionScheduleDeepLinkOutcome({
    allDatesData: [toDateGames('2026-03-07', ['GAME-1', 'GAME-2'])],
    currentDateIndex: 0,
    deepLinkGameId: '',
    deepLinkDate: '2026-03-07',
    deepLinkParamValidationNotice: null,
    canResolveMorePast: false,
    canResolveMoreFuture: false,
    deepLinkResolutionAttempt: 0,
    deepLinkResolutionDirection: 'future',
  });

  assert.deepEqual(outcome, {
    type: 'resolved',
    notice: null,
    selection: { dateIndex: 0, gameIndex: 0, reason: 'date' },
  });
});
