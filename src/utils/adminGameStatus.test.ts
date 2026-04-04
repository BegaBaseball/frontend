import assert from 'node:assert/strict';
import test from 'node:test';

import type { AdminGameStatusMismatch } from '../types/admin';
import {
  buildGameStatusDateRecommendations,
  formatInputDate,
  shiftInputDate,
} from './adminGameStatus';

test('formatInputDate는 Date를 yyyy-mm-dd 문자열로 만든다', () => {
  const result = formatInputDate(new Date(2026, 3, 4));

  assert.equal(result, '2026-04-04');
});

test('shiftInputDate는 날짜를 일 단위로 이동한다', () => {
  const result = shiftInputDate('2026-04-04', -13);

  assert.equal(result, '2026-03-22');
});

test('buildGameStatusDateRecommendations는 날짜별 mismatch를 묶고 최신순으로 정렬한다', () => {
  const mismatches: AdminGameStatusMismatch[] = [
    {
      gameId: 'GAME-1',
      gameDate: '2026-03-29',
      startTime: '14:00:00',
      rawStatus: 'SCHEDULED',
      normalizedRawStatus: 'SCHEDULED',
      effectiveStatus: 'COMPLETED',
      homeScore: 11,
      awayScore: 6,
      inningScoreCount: 9,
      hasKnownScore: true,
      hasInningScores: true,
      reasons: ['inning_scores_present'],
    },
    {
      gameId: 'GAME-2',
      gameDate: '2026-03-29',
      startTime: '17:00:00',
      rawStatus: 'SCHEDULED',
      normalizedRawStatus: 'SCHEDULED',
      effectiveStatus: 'DRAW',
      homeScore: 3,
      awayScore: 3,
      inningScoreCount: 9,
      hasKnownScore: true,
      hasInningScores: false,
      reasons: ['score_present'],
    },
    {
      gameId: 'GAME-3',
      gameDate: '2026-03-26',
      startTime: '18:30:00',
      rawStatus: 'SCHEDULED',
      normalizedRawStatus: 'SCHEDULED',
      effectiveStatus: 'LIVE',
      homeScore: 1,
      awayScore: 0,
      inningScoreCount: 3,
      hasKnownScore: true,
      hasInningScores: true,
      reasons: ['inning_scores_present'],
    },
  ];

  const result = buildGameStatusDateRecommendations(mismatches);

  assert.deepEqual(result, [
    {
      gameDate: '2026-03-29',
      mismatchCount: 2,
      effectiveStatuses: ['COMPLETED', 'DRAW'],
    },
    {
      gameDate: '2026-03-26',
      mismatchCount: 1,
      effectiveStatuses: ['LIVE'],
    },
  ]);
});
