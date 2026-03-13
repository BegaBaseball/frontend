import test from 'node:test';
import assert from 'node:assert/strict';
import type { DateGames } from '../types/prediction';
import {
  partitionScheduledGames,
  resolveDeepLinkSelection,
  resolveInitialPredictionDateIndex,
  shouldAutoSwitchToScheduled,
} from './predictionHomeLogic';

const toDateGames = (date: string, gameIds: string[]): DateGames => ({
  date,
  games: gameIds.map((gameId) => ({ gameId } as DateGames['games'][number])),
});

test('partitionScheduledGames 분류 규칙', () => {
  const games = [
    { gameId: '1', gameStatus: 'SCHEDULED' },
    { gameId: '2', gameStatus: 'POSTPONED' },
    { gameId: '3', gameStatus: 'CANCELLED' },
    { gameId: '4', gameStatus: 'COMPLETED' },
  ];

  const result = partitionScheduledGames(games);
  assert.deepEqual(result.primary.map((game) => game.gameId), ['1']);
  assert.deepEqual(result.secondary.map((game) => game.gameId), ['2', '3']);
  assert.deepEqual(result.excluded.map((game) => game.gameId), ['4']);
});

test('partitionScheduledGames 미래 경기 + 상태 미확정 + 점수 미입력은 예정으로 분류', () => {
  const games = [
    { gameId: 'future-unknown', gameStatus: null, sourceDate: '2026-03-23', homeScore: null, awayScore: null },
    { gameId: 'past-unknown', gameStatus: null, sourceDate: '2026-03-03', homeScore: null, awayScore: null },
    { gameId: 'future-live-like', gameStatus: 'IN_PROGRESS', sourceDate: '2026-03-23', homeScore: null, awayScore: null },
    { gameId: 'future-scored', gameStatus: null, sourceDate: '2026-03-23', homeScore: 3, awayScore: 1 },
  ];

  const result = partitionScheduledGames(games, { todayKey: '2026-03-05' });
  assert.deepEqual(result.primary.map((game) => game.gameId), ['future-unknown']);
  assert.deepEqual(result.excluded.map((game) => game.gameId), ['past-unknown', 'future-live-like', 'future-scored']);
});

test('shouldAutoSwitchToScheduled true 조건', () => {
  const canSwitch = shouldAutoSwitchToScheduled({
    activeLeagueTab: 'regular',
    hasUserChangedTab: false,
    isLoading: false,
    isScheduledLoading: false,
    regularCount: 0,
    postseasonCount: 0,
    koreanSeriesCount: 0,
    scheduledPrimaryCount: 2,
  });

  assert.equal(canSwitch, true);
});

test('shouldAutoSwitchToScheduled false 조건', () => {
  const alreadyScheduled = shouldAutoSwitchToScheduled({
    activeLeagueTab: 'scheduled',
    hasUserChangedTab: false,
    isLoading: false,
    isScheduledLoading: false,
    regularCount: 0,
    postseasonCount: 0,
    koreanSeriesCount: 0,
    scheduledPrimaryCount: 2,
  });
  assert.equal(alreadyScheduled, false);

  const userLocked = shouldAutoSwitchToScheduled({
    activeLeagueTab: 'regular',
    hasUserChangedTab: true,
    isLoading: false,
    isScheduledLoading: false,
    regularCount: 0,
    postseasonCount: 0,
    koreanSeriesCount: 0,
    scheduledPrimaryCount: 2,
  });
  assert.equal(userLocked, false);
});

test('resolveInitialPredictionDateIndex 우선순위', () => {
  const allDatesData: DateGames[] = [
    toDateGames('2026-02-10', ['A']),
    toDateGames('2026-02-11', []),
    toDateGames('2026-02-12', ['B']),
  ];

  assert.equal(resolveInitialPredictionDateIndex(allDatesData, '2026-02-11'), 2);
  assert.equal(resolveInitialPredictionDateIndex(allDatesData, '2026-02-13'), 2);
  assert.equal(resolveInitialPredictionDateIndex([], '2026-02-13'), 0);
});

test('resolveDeepLinkSelection gameId 우선, 이후 date fallback', () => {
  const allDatesData: DateGames[] = [
    toDateGames('2026-02-10', ['G1']),
    toDateGames('2026-02-11', ['G2', 'G3']),
  ];

  const byGameId = resolveDeepLinkSelection(allDatesData, 'G3', '2026-02-10');
  assert.deepEqual(byGameId, { dateIndex: 1, gameIndex: 1, reason: 'gameId' });

  const byDate = resolveDeepLinkSelection(allDatesData, 'UNKNOWN', '2026-02-10');
  assert.deepEqual(byDate, { dateIndex: 0, gameIndex: 0, reason: 'date' });

  const noMatch = resolveDeepLinkSelection(allDatesData, 'UNKNOWN', '2026-02-20');
  assert.equal(noMatch, null);
});
