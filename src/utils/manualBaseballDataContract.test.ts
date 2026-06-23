import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
  formatManualBaseballDataDisplayValue,
} from './manualBaseballDataContract';

test('formatManualBaseballDataDisplayValue removes the manual data contract code from visible labels', () => {
  assert.equal(
    formatManualBaseballDataDisplayValue('운영자 제공 자료 필요 · MANUAL_BASEBALL_DATA_REQUIRED'),
    '운영자 제공 자료 필요',
  );
  assert.equal(
    formatManualBaseballDataDisplayValue('오늘의 운영 동선 공지: MANUAL_BASEBALL_DATA_REQUIRED'),
    '오늘의 운영 동선 공지',
  );
});

test('formatManualBaseballDataDisplayValue keeps a user-facing fallback when only the contract code is available', () => {
  assert.equal(
    formatManualBaseballDataDisplayValue('MANUAL_BASEBALL_DATA_REQUIRED'),
    MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
  );
});
