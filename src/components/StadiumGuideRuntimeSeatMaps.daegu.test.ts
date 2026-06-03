import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

const ALLOWED_DAEGU_PACKAGE_SCRIPTS = [
  'qa:stadium:daegu:mobile',
  'qa:stadium:daegu:full',
  'qa:stadium:daegu:release-lock',
  'stadium:daegu:status',
  'stadium:daegu:pixel-components',
  'stadium:daegu:trace-manifest',
  'stadium:daegu:alignment-audit',
  'stadium:daegu:operator-handoff',
  'stadium:daegu:handoff-evidence',
  'stadium:daegu:source-baseline-audit',
  'stadium:daegu:canonical-decision-table',
  'stadium:daegu:qa-ownership-audit',
  'stadium:daegu:canonical-block-decision-guard',
  'stadium:daegu:canonical-official-only-retrace-workset',
  'stadium:daegu:canonical-retrace-batch',
  'stadium:daegu:canonical-retrace-gate',
  'stadium:daegu:canonical-retrace-gate:require-approved',
  'stadium:daegu:precision-audit',
  'stadium:daegu:render-safety-audit',
];

const RETAINED_DAEGU_SCRIPT_FILES = [
  'daegu-seatmap-canonical-block-decision-guard.mjs',
  'daegu-seatmap-canonical-decision-table.mjs',
  'daegu-seatmap-canonical-official-only-retrace-workset.mjs',
  'daegu-seatmap-canonical-retrace-batch.mjs',
  'daegu-seatmap-core-qa.mjs',
  'daegu-seatmap-ops.mjs',
  'daegu-seatmap-precision-audit.mjs',
  'daegu-seatmap-qa-ownership-audit.mjs',
  'daegu-seatmap-render-safety-audit.mjs',
  'daegu-seatmap-source-baseline-audit.mjs',
];

const REMOVED_SCRIPT_PATTERNS = [
  /^daegu-operator-reference-/,
  /^daegu-seatmap-missing-block\.mjs$/,
  /^daegu-seatmap-operator-corrections\.mjs$/,
  /^daegu-seatmap-p0-/,
  /^daegu-seatmap-p1-/,
  /^daegu-seatmap-p2/,
  /^daegu-seatmap-p3-p4-/,
  /^daegu-seatmap-visual-match\.mjs$/,
  /^daegu-seatmap-evidence-crops\.mjs$/,
  /^daegu-seatmap-non-overlap-priority-queue\.mjs$/,
  /^daegu-seatmap-off-seat-retrace-intake\.mjs$/,
  /^daegu-seatmap-retrace-work-queue\.mjs$/,
  /^daegu-seatmap-zone-precision-worksets\.mjs$/,
  /^daegu-seatmap-canonical-sky-upper-retrace-batch\.mjs$/,
];

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function packageScripts(): Record<string, string> {
  return JSON.parse(readProjectFile('package.json')).scripts;
}

test('대구 공개 package 명령은 canonical/runtime release 명령만 남긴다', () => {
  const scripts = packageScripts();
  const daeguKeys = Object.keys(scripts).filter((key) => key.includes(':daegu')).sort();

  assert.deepEqual(daeguKeys, [...ALLOWED_DAEGU_PACKAGE_SCRIPTS].sort());
  assert.equal(scripts['qa:stadium:daegu:mobile'], 'node scripts/run-stadium-isolated-qa.mjs DAEGU');
  assert.equal(scripts['qa:stadium:daegu:full'], 'node scripts/run-stadium-isolated-qa.mjs DAEGU:FULL');
  assert.equal(scripts['qa:stadium:daegu:release-lock'], 'npm run stadium:daegu:precision-audit -- --require-release');

  Object.entries(scripts)
    .filter(([key]) => key.startsWith('stadium:daegu:'))
    .forEach(([key, command]) => {
      assert.match(command, /^node scripts\/stadium-seatmap-ops\.mjs daegu /, `${key} should delegate through stadium-seatmap-ops`);
    });

  ['trace-review', 'operator-reference', 'missing-block', 'visual-match', ':p0-', ':p1-', ':p2', ':p3-p4'].forEach((removedToken) => {
    assert.equal(daeguKeys.some((key) => key.includes(removedToken)), false, `${removedToken} aliases should be removed`);
  });
});

test('대구 전용 script inventory는 canonical/runtime release 파일만 남긴다', () => {
  const files = fs.readdirSync(path.join(projectRoot, 'scripts'))
    .filter((fileName) => fileName.includes('daegu') && fileName.endsWith('.mjs'))
    .sort();

  assert.deepEqual(files, RETAINED_DAEGU_SCRIPT_FILES);
  assert.equal(files.some((fileName) => REMOVED_SCRIPT_PATTERNS.some((pattern) => pattern.test(fileName))), false);
});

test('대구 stadium dispatcher는 새 전용 entrypoint로만 위임한다', () => {
  const stadiumOpsSource = readProjectFile('scripts/stadium-seatmap-ops.mjs');
  const daeguOpsSource = readProjectFile('scripts/daegu-seatmap-ops.mjs');

  [
    "args: ['scripts/daegu-seatmap-ops.mjs', 'pixel-components']",
    "args: ['scripts/daegu-seatmap-ops.mjs', 'canonical-retrace-batch']",
    "args: ['scripts/daegu-seatmap-ops.mjs', 'precision-audit']",
    "cleanupPolicy: 'historical operator-reference stage scripts are recoverable from Git history only'",
  ].forEach((requiredText) => {
    assert.ok(stadiumOpsSource.includes(requiredText), `stadium dispatcher should include ${requiredText}`);
  });

  [
    'daegu-seatmap-core-qa.mjs',
    'daegu-seatmap-source-baseline-audit.mjs',
    'daegu-seatmap-canonical-retrace-batch.mjs',
    'canonical-retrace-gate:require-approved',
  ].forEach((requiredText) => {
    assert.ok(daeguOpsSource.includes(requiredText), `Daegu ops should include ${requiredText}`);
  });

  [
    'daegu-seatmap-p0-operators.mjs',
    'daegu-seatmap-p1-operator-boundary.mjs',
    'daegu-seatmap-p2-operators.mjs',
    'daegu-seatmap-p3-p4-operators.mjs',
    'daegu-seatmap-visual-match.mjs',
    'daegu-seatmap-missing-block.mjs',
    'daegu-seatmap-operator-corrections.mjs',
    'daegu-operator-reference-',
  ].forEach((removedText) => {
    assert.equal(stadiumOpsSource.includes(removedText), false, `${removedText} should be removed from stadium dispatcher`);
  });
});
