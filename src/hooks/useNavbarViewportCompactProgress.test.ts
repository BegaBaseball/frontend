import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mergeNavbarCompactProgress,
  resolveNavbarViewportCompactProgress,
} from './useNavbarViewportCompactProgress';

describe('resolveNavbarViewportCompactProgress', () => {
  it('fully compacts the desktop navbar at tablet-width desktop breakpoints', () => {
    assert.equal(resolveNavbarViewportCompactProgress(768), 1);
    assert.equal(resolveNavbarViewportCompactProgress(920), 1);
  });

  it('does not compact the navbar on spacious desktop widths', () => {
    assert.equal(resolveNavbarViewportCompactProgress(1024), 0);
    assert.equal(resolveNavbarViewportCompactProgress(1280), 0);
    assert.equal(resolveNavbarViewportCompactProgress(1440), 0);
  });

  it('eases compact progress between narrow and spacious desktop widths', () => {
    assert.equal(resolveNavbarViewportCompactProgress(972), 0.5);
  });
});

describe('mergeNavbarCompactProgress', () => {
  it('uses the strongest valid compacting signal and clamps invalid values', () => {
    assert.equal(mergeNavbarCompactProgress(0.2, 0.75), 0.75);
    assert.equal(mergeNavbarCompactProgress(-1, Number.NaN, 1.5), 1);
  });
});
