import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

const CANONICAL_COMMANDS = [
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

test('대구 review 계약은 canonical/runtime release 명령만 검수한다', () => {
  const scripts = JSON.parse(readProjectFile('package.json')).scripts as Record<string, string>;

  CANONICAL_COMMANDS.forEach((scriptName) => {
    assert.ok(scripts[scriptName], `${scriptName} should remain public`);
    assert.match(scripts[scriptName], /^node scripts\/stadium-seatmap-ops\.mjs daegu /);
  });

  [
    'stadium:daegu:trace-review',
    'stadium:daegu:operator-reference-trace',
    'stadium:daegu:missing-block-discovery',
    'stadium:daegu:p0-operator-package',
    'stadium:daegu:p1-operator-package',
    'stadium:daegu:p2-operator-package',
    'stadium:daegu:p3-p4-operator-package',
    'stadium:daegu:visual-match-audit',
  ].forEach((removedScriptName) => {
    assert.equal(scripts[removedScriptName], undefined, `${removedScriptName} should be removed`);
  });
});

test('대구 review docs는 통합 canonical retrace batch 명령을 안내한다', () => {
  const releaseLockSource = readProjectFile('docs/daegu-seatmap-release-lock.md');

  [
    'npm run stadium:daegu:canonical-retrace-batch -- SKY_UPPER_01_10',
    'npm run stadium:daegu:canonical-retrace-gate -- SKY_UPPER_01_10',
    'npm run stadium:daegu:canonical-retrace-batch -- SPECIAL_ZONE_3F4F_M1_MR9',
    'npm run stadium:daegu:canonical-retrace-batch -- SKY_LOWER_U1_U19',
    'npm run stadium:daegu:canonical-retrace-batch -- SKY_BLUE_U2_U20_U31',
    'npm run stadium:daegu:canonical-retrace-batch -- REMAINING_U3_U9_V1_V3_OUTFIELD',
    'Operator input contract verification (2026-05-30)',
    'reports/stadium/daegu-seatmap-canonical-sky-upper-retrace-batch/operator-input/daegu-seatmap-canonical-sky-upper-retrace-input.json',
    'reports/stadium/daegu-seatmap-canonical-special-zone-retrace-batch/operator-input/daegu-seatmap-canonical-special-zone-retrace-input.json',
    'reports/stadium/daegu-seatmap-canonical-sky-lower-retrace-batch/operator-input/daegu-seatmap-canonical-sky-lower-retrace-input.json',
    'reports/stadium/daegu-seatmap-canonical-sky-blue-retrace-batch/operator-input/daegu-seatmap-canonical-sky-blue-retrace-input.json',
    'reports/stadium/daegu-seatmap-canonical-remaining-retrace-batch/operator-input/daegu-seatmap-canonical-remaining-retrace-input.json',
    'operator input JSON carries `operatorReviewContract`',
    'production promotion requires gate status `ready-for-source-preview`',
    '`contract validation` and `input shape validation` both pass',
    'historical/operator-reference 단계별 스크립트는 Git history로만 복구한다',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should document ${requiredText}`);
  });

  [
    'stadium:daegu:canonical-sky-upper-retrace-batch',
    'stadium:daegu:canonical-special-zone-retrace-batch',
    'stadium:daegu:canonical-sky-lower-retrace-batch',
    'stadium:daegu:canonical-sky-blue-retrace-batch',
    'stadium:daegu:canonical-remaining-retrace-batch',
    'stadium:daegu:visual-match-workset',
  ].forEach((removedText) => {
    assert.equal(releaseLockSource.includes(removedText), false, `${removedText} should be removed from release docs`);
  });
});
