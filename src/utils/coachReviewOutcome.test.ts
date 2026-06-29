import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCoachReviewOutcomeLabel,
  resolveCoachReviewOutcome,
} from './coachReviewOutcome';

test('resolveCoachReviewOutcome은 완료 경기 원정 승리를 승/패로 판정한다', () => {
  const outcome = resolveCoachReviewOutcome({
    gameStatusBucket: 'COMPLETED',
    homeScore: 5,
    awayScore: 11,
  });

  assert.deepEqual(outcome, {
    home: 'loss',
    away: 'win',
    isDraw: false,
  });
  assert.equal(getCoachReviewOutcomeLabel(outcome!.away), '승');
  assert.equal(getCoachReviewOutcomeLabel(outcome!.home), '패');
});

test('resolveCoachReviewOutcome은 완료 경기 홈 승리와 문자열 점수를 지원한다', () => {
  const outcome = resolveCoachReviewOutcome({
    gameStatusBucket: 'FINAL',
    homeScore: '7',
    awayScore: '3',
  });

  assert.deepEqual(outcome, {
    home: 'win',
    away: 'loss',
    isDraw: false,
  });
});

test('resolveCoachReviewOutcome은 무승부 완료 경기를 무로 판정한다', () => {
  const outcome = resolveCoachReviewOutcome({
    gameStatusBucket: 'DRAW',
    homeScore: 4,
    awayScore: 4,
  });

  assert.deepEqual(outcome, {
    home: 'draw',
    away: 'draw',
    isDraw: true,
  });
  assert.equal(getCoachReviewOutcomeLabel(outcome!.home), '무');
  assert.equal(getCoachReviewOutcomeLabel(outcome!.away), '무');
});

test('resolveCoachReviewOutcome은 예정 경기나 점수 누락에서 결과를 추정하지 않는다', () => {
  assert.equal(
    resolveCoachReviewOutcome({
      gameStatusBucket: 'SCHEDULED',
      homeScore: 5,
      awayScore: 11,
    }),
    null,
  );
  assert.equal(
    resolveCoachReviewOutcome({
      gameStatusBucket: 'COMPLETED',
      homeScore: null,
      awayScore: 11,
    }),
    null,
  );
  assert.equal(
    resolveCoachReviewOutcome({
      gameStatusBucket: 'COMPLETED',
      homeScore: '--',
      awayScore: 11,
    }),
    null,
  );
});
