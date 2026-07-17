import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMateCiSummary,
  parseCypressMetrics,
  parseNodeCoverageMetrics,
  parseNodeTestMetrics,
  renderMateCiSummaryMarkdown,
} from './mate-ci-summary-lib.mjs';

test('parseNodeTestMetrics extracts TAP counts', () => {
  const metrics = parseNodeTestMetrics([
    '1..3',
    '# tests 3',
    '# pass 3',
    '# fail 0',
    '# skipped 0',
  ].join('\n'));

  assert.deepEqual(metrics, {
    total: 3,
    pass: 3,
    fail: 0,
    skipped: 0,
  });
});

test('parseNodeCoverageMetrics extracts the Node all-files coverage row', () => {
  const metrics = parseNodeCoverageMetrics([
    '# start of coverage report',
    '# file | line % | branch % | funcs % | uncovered lines',
    '# all files | 91.37 | 73.33 | 72.65 |',
    '# end of coverage report',
  ].join('\n'));

  assert.deepEqual(metrics, {
    lines: 91.37,
    branches: 73.33,
    functions: 72.65,
  });
});

test('parseCypressMetrics aggregates sequential spec result blocks', () => {
  const metrics = parseCypressMetrics([
    '│ Tests:        14                                                                               │',
    '│ Passing:      14                                                                               │',
    '│ Failing:      0                                                                                │',
    '│ Tests:        8                                                                                │',
    '│ Passing:      8                                                                                │',
    '│ Failing:      0                                                                                │',
  ].join('\n'));

  assert.deepEqual(metrics, {
    total: 22,
    pass: 22,
    fail: 0,
  });
});

test('buildMateCiSummary builds smoke markdown from local logs', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'mate-ci-summary-'));
  const reportsDir = join(tempRoot, 'reports', 'mate-ci');
  mkdirSync(reportsDir, { recursive: true });

  writeFileSync(join(reportsDir, 'unit-smoke.log'), [
    '# tests 41',
    '# pass 41',
    '# fail 0',
    '# skipped 0',
  ].join('\n'));
  writeFileSync(join(reportsDir, 'coverage.log'), [
    '# start of coverage report',
    '# file | line % | branch % | funcs % | uncovered lines',
    '# all files | 91.37 | 73.33 | 72.65 |',
    '# end of coverage report',
  ].join('\n'));
  writeFileSync(join(reportsDir, 'build-smoke.log'), 'vite build ok');
  writeFileSync(join(reportsDir, 'e2e-smoke.log'), [
    '│ Tests:        14                                                                               │',
    '│ Passing:      14                                                                               │',
    '│ Failing:      0                                                                                │',
    '│ Tests:        8                                                                                │',
    '│ Passing:      8                                                                                │',
    '│ Failing:      0                                                                                │',
  ].join('\n'));

  const summary = buildMateCiSummary({
    workflow: 'smoke',
    cwd: tempRoot,
    env: {
      MATE_CI_STATUS_UNIT_SMOKE: 'success',
      MATE_CI_STATUS_COVERAGE: 'success',
      MATE_CI_STATUS_BUILD_SMOKE: 'success',
      MATE_CI_STATUS_E2E_SMOKE: 'success',
      MATE_CI_TRIGGER_NOTE: 'manual workflow dispatch',
      MATE_CI_ARTIFACT_NOTE: 'reports uploaded',
    },
  });

  assert.equal(summary.stages[0].count, '41/41 passed');
  assert.equal(summary.stages[1].count, 'L 91.37% · B 73.33% · F 72.65%');
  assert.equal(summary.stages[3].count, '22/22 passed');

  const markdown = renderMateCiSummaryMarkdown(summary);
  assert.match(markdown, /Frontend Mate Smoke/);
  assert.match(markdown, /\| Unit coverage \| success \| L 91\.37% · B 73\.33% · F 72\.65% \|/);
  assert.match(markdown, /\| Core E2E smoke \| success \| 22\/22 passed \|/);
  assert.match(markdown, /- Trigger: manual workflow dispatch/);
});
