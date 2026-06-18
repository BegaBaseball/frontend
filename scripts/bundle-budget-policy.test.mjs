import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBudgetOverageBytes,
  isBudgetWithinLimit,
} from './lib/bundle-budget-policy.mjs';

test('isBudgetWithinLimit allows only tiny byte and ratio overages', () => {
  assert.equal(isBudgetWithinLimit({ sizeBytes: 12_000, maxBytes: 12_000 }), true);
  assert.equal(isBudgetWithinLimit({ sizeBytes: 11_999, maxBytes: 12_000 }), true);
  assert.equal(isBudgetWithinLimit({ sizeBytes: 12_036, maxBytes: 12_000 }), true);
  assert.equal(isBudgetWithinLimit({ sizeBytes: 13_079, maxBytes: 13_000 }), false);
  assert.equal(isBudgetWithinLimit({ sizeBytes: 4_040, maxBytes: 4_000 }), false);
  assert.equal(isBudgetWithinLimit({ sizeBytes: 100_100, maxBytes: 100_000 }), false);
});

test('getBudgetOverageBytes reports only bytes above the hard budget', () => {
  assert.equal(getBudgetOverageBytes({ sizeBytes: 11_999, maxBytes: 12_000 }), 0);
  assert.equal(getBudgetOverageBytes({ sizeBytes: 12_000, maxBytes: 12_000 }), 0);
  assert.equal(getBudgetOverageBytes({ sizeBytes: 12_036, maxBytes: 12_000 }), 36);
});
