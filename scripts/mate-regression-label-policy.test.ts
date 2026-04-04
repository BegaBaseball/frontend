import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractLabelGlobs,
  findFullMateRegressionMatches,
  loadFullMateRegressionGlobs,
  shouldApplyFullMateRegressionLabel,
} from './mate-regression-label-policy.mjs';

test('extractLabelGlobs reads only the full mate regression glob list', () => {
  const globs = extractLabelGlobs([
    'full-mate-regression:',
    '  - changed-files:',
    '      - any-glob-to-any-file:',
    '          - "src/components/Mate*.tsx"',
    'another-label:',
    '  - changed-files:',
    '      - any-glob-to-any-file:',
    '          - "should-not-be-read"',
  ].join('\n'));

  assert.deepEqual(globs, ['src/components/Mate*.tsx']);
});

test('loadFullMateRegressionGlobs reads the repository labeler config', () => {
  const globs = loadFullMateRegressionGlobs();
  assert.ok(globs.includes('src/components/Mate*.tsx'));
  assert.ok(globs.includes('src/store/authStore.ts'));
});

test('shouldApplyFullMateRegressionLabel matches mate-critical files only', () => {
  const globs = loadFullMateRegressionGlobs();

  assert.equal(
    shouldApplyFullMateRegressionLabel(['src/components/MateDetail.tsx'], globs),
    true,
  );
  assert.equal(
    shouldApplyFullMateRegressionLabel(['src/store/authStore.ts'], globs),
    true,
  );
  assert.equal(
    shouldApplyFullMateRegressionLabel(['bega_backend/BEGA_PROJECT/build.gradle'], globs),
    false,
  );
});

test('findFullMateRegressionMatches returns only matching files', () => {
  const globs = loadFullMateRegressionGlobs();
  const matches = findFullMateRegressionMatches([
    'src/components/ui/button.tsx',
    'src/utils/loginRedirect.ts',
    'README.md',
  ], globs);

  assert.deepEqual(matches, [
    'src/utils/loginRedirect.ts',
  ]);
});
