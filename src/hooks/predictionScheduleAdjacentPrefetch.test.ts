import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldSchedulePredictionAdjacentPrefetch } from './predictionScheduleAdjacentPrefetch';

test('shouldSchedulePredictionAdjacentPrefetch returns true for fresh anchor', () => {
  assert.equal(
    shouldSchedulePredictionAdjacentPrefetch('2026-04-10', null, new Set()),
    true,
  );
});

test('shouldSchedulePredictionAdjacentPrefetch blocks pending anchor', () => {
  assert.equal(
    shouldSchedulePredictionAdjacentPrefetch('2026-04-10', '2026-04-10', new Set()),
    false,
  );
});

test('shouldSchedulePredictionAdjacentPrefetch blocks completed anchor reuse', () => {
  assert.equal(
    shouldSchedulePredictionAdjacentPrefetch('2026-04-10', null, new Set(['2026-04-10'])),
    false,
  );
});
