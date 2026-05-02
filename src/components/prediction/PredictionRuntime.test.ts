import assert from 'node:assert/strict';
import test from 'node:test';

import { getPredictionTabActivationState } from './PredictionRuntime';

test('getPredictionTabActivationState는 ranking 탭 진입 시 즉시 ranking feature를 활성화한다', () => {
  const nextState = getPredictionTabActivationState('ranking', false, false);

  assert.deepEqual(nextState, {
    hasVisitedRankingTab: true,
    rankingFeatureReady: true,
  });
});

test('getPredictionTabActivationState는 match 탭 복귀 시에도 ranking warm state를 유지한다', () => {
  const nextState = getPredictionTabActivationState('match', true, true);

  assert.deepEqual(nextState, {
    hasVisitedRankingTab: true,
    rankingFeatureReady: true,
  });
});
