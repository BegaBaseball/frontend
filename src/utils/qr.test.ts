import test from 'node:test';
import assert from 'node:assert/strict';

import { createQrMatrix, createQrPath } from './qr';

test('createQrMatrix returns a deterministic QR finder pattern for ASCII URLs', () => {
  const matrix = createQrMatrix('https://example.com/checkin?partyId=1', 'Q');

  assert.equal(matrix.length, 33);
  assert.deepEqual(
    matrix.slice(0, 7).map((row) => row.slice(0, 7)),
    [
      [true, true, true, true, true, true, true],
      [true, false, false, false, false, false, true],
      [true, false, true, true, true, false, true],
      [true, false, true, true, true, false, true],
      [true, false, true, true, true, false, true],
      [true, false, false, false, false, false, true],
      [true, true, true, true, true, true, true],
    ],
  );
});

test('createQrPath emits path commands for dark modules only', () => {
  const path = createQrPath([
    [true, false],
    [false, true],
  ]);

  assert.equal(path, 'M 0 0 l 1 0 0 1 -1 0 Z M 1 1 l 1 0 0 1 -1 0 Z');
});
