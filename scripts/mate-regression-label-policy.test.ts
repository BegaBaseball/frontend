import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DEFAULT_REPO_ROOT,
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
  assert.ok(globs.includes('src/store/mate*.ts'));
  assert.equal(globs.includes('src/store/authStore.ts'), false);
});

test('shouldApplyFullMateRegressionLabel matches mate-critical files only', () => {
  const globs = loadFullMateRegressionGlobs();

  assert.equal(
    shouldApplyFullMateRegressionLabel(['src/components/MateDetail.tsx'], globs),
    true,
  );
  assert.equal(
    shouldApplyFullMateRegressionLabel(['src/store/authStore.ts'], globs),
    false,
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
    'src/utils/mateCreateDraft.ts',
    'README.md',
  ], globs);

  assert.deepEqual(matches, [
    'src/utils/mateCreateDraft.ts',
  ]);
});

test('mate-regression-label-check accepts changed files from --file', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'mate-label-check-'));
  const changedFilesPath = join(tempDir, 'changed-files.txt');

  try {
    writeFileSync(changedFilesPath, [
      'README.md',
      'src/components/MateDetailRuntime.tsx',
    ].join('\n'));

    const result = spawnSync(process.execPath, [
      'scripts/mate-regression-label-check.mjs',
      '--json',
      '--file',
      changedFilesPath,
    ], {
      cwd: DEFAULT_REPO_ROOT,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.shouldApply, true);
    assert.deepEqual(payload.matches, ['src/components/MateDetailRuntime.tsx']);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
