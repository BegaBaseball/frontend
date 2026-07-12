import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { KBO_STADIUMS } from '../utils/stadiumData';
import {
  resolveStadiumSeatMapEntry,
  STADIUM_SEAT_MAP_ENTRIES,
} from './stadiumSeatMapRegistry';
import { DAEGU_CANONICAL_BLOCKS } from '../data/daeguCanonicalSeatMap';
import {
  SUWON_ALIGNMENT_PROBES,
  SUWON_BROWSER_QA_PROBES,
  SUWON_BLOCKS,
  SUWON_HIT_TEST_PROBES,
} from '../data/suwonSeatData';
import {
  filterAndRankDaeguSeatMapBlocks,
  rankDaeguSeatMapSearchResult,
} from './daegu/daeguSeatMapSearch';
import {
  OPERATIONAL_STADIUM_SEAT_MAP_ENTRIES,
  STADIUM_SEATMAP_CONTRACTS,
  STADIUM_TEAM_FALLBACK_CASES,
  diffSet,
  formatProbeDiffByBlock,
  projectRoot,
  probeKey,
  readImageDimensions,
  readProjectFile,
  snapshotSuwonProbeKeySets,
  snapshotSuwonSeatFixture,
  splitProbeKeysByBlock,
  suwonFixtureSignature,
  uniqueSorted,
} from './StadiumGuideRuntimeSeatMaps.support';

test('고척 직관 UX Cypress spec은 split shared stadium-seatmap 회귀 파일에서 검증한다', () => {
  const stadiumSeatmapSpec = readProjectFile('cypress/e2e/stadium-seatmap-shared.cy.ts');

  [
    'Stadium SeatMap — Gocheok Visit UX',
    'getGocheokPlaces',
    'gocheok-block-search',
    'gocheok-section-finder-item-gocheok-d04',
    'gocheok-section-finder-item-gocheok-430',
    'gocheok-visit-check',
    'gocheok-facility-guide-open',
    'gocheok-operation-guide-open',
    'gocheok-facility-tab-overview',
    'gocheok-facility-tab-entrances',
    'gocheok-facility-tab-operations',
    'gocheok-operation-notice-panel',
    'gocheok-operator-data-status',
    'gocheok-seatmap-svg',
  ].forEach((requiredText) => {
    assert.ok(stadiumSeatmapSpec.includes(requiredText), `Stadium seatmap Cypress spec should include ${requiredText}`);
  });
});
test('고척 좌석도 package alias는 runtime release와 운영자 입력 게이트 표면만 노출한다', () => {
  const packageSource = readProjectFile('package.json');
  const dispatcherSource = readProjectFile('scripts/stadium-seatmap-ops.mjs');
  const gocheokOpsSource = readProjectFile('scripts/gocheok-seatmap-ops.mjs');
  const releaseLockSource = readProjectFile('docs/gocheok-seatmap-release-lock.md');
  const overlayChecklistSource = readProjectFile('docs/stadium-seatmap-overlay-checklist.md');

  [
    '"qa:stadium:gocheok:mobile": "node scripts/qa-presets.mjs stadium gocheok mobile"',
    '"qa:stadium:gocheok:full": "node scripts/qa-presets.mjs stadium gocheok full"',
    '"qa:stadium:gocheok:release-lock": "node scripts/qa-presets.mjs stadium gocheok release-gate"',
    '"stadium:gocheok:status": "node scripts/qa-presets.mjs stadium gocheok status"',
    '"stadium:gocheok:pixel-components": "node scripts/qa-presets.mjs stadium gocheok pixel-components"',
    '"stadium:gocheok:trace-manifest": "node scripts/qa-presets.mjs stadium gocheok trace-manifest"',
    '"stadium:gocheok:operator-intake": "node scripts/qa-presets.mjs stadium gocheok operator-intake"',
    '"stadium:gocheok:operator-validate": "node scripts/qa-presets.mjs stadium gocheok operator-validate"',
    '"stadium:gocheok:operator-apply-plan": "node scripts/qa-presets.mjs stadium gocheok operator-apply-plan"',
    '"stadium:gocheok:operator-handoff": "node scripts/qa-presets.mjs stadium gocheok operator-handoff"',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  [
    '"stadium:gocheok:evidence"',
    '"qa:stadium:gocheok:trace-review"',
  ].forEach((removedText) => {
    assert.equal(packageSource.includes(removedText), false, `package script should not expose ${removedText}`);
  });

  [
    'publicTasks: [',
    "'operator-intake'",
    "'operator-validate'",
    "'operator-apply-plan'",
    "'operator-handoff'",
    "'release-gate'",
    "'operator-template': [",
    "'operator-validate': [",
    "'operator-apply-plan': [",
    "'operator-handoff': [",
    "'operator-intake': [",
    "evidence: [",
    "'trace-review': [",
    'evidence crop generation and trace-review bundles remain dispatcher-internal',
    'evidence and trace-review tasks stay available through the integrated dispatcher',
  ].forEach((requiredText) => {
    assert.ok(dispatcherSource.includes(requiredText), `dispatcher should include ${requiredText}`);
  });

  [
    'GOCHEOK_OPERATOR_VISIT_GUIDE_GATE_V1',
    'gocheok-operator-visit-guide-input.csv',
    'gocheok-operator-visit-guide-validation.json',
    'gocheok-operator-visit-guide-apply-plan.ts-fragment',
    'gocheok-operator-visit-guide-handoff.json',
    'sourceDataWritePerformed: false',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'FORBIDDEN_OPERATOR_DATA',
    'PLACEHOLDER_ROW_PRESENT',
    'MISSING_FACILITY_REFERENCE',
  ].forEach((requiredText) => {
    assert.ok(gocheokOpsSource.includes(requiredText), `Gocheok operator gate should include ${requiredText}`);
  });

  [
    '--allow-source-write',
  ].forEach((forbiddenText) => {
    assert.equal(gocheokOpsSource.includes(forbiddenText), false, `Gocheok operator gate should not expose ${forbiddenText}`);
  });

  [
    'node scripts/stadium-seatmap-ops.mjs gocheok evidence',
    'node scripts/stadium-seatmap-ops.mjs gocheok trace-review',
  ].forEach((internalCommand) => {
    assert.ok(gocheokOpsSource.includes(internalCommand), `Gocheok ops should document ${internalCommand}`);
    assert.ok(releaseLockSource.includes(internalCommand), `release lock should document ${internalCommand}`);
    assert.ok(overlayChecklistSource.includes(internalCommand), `overlay checklist should document ${internalCommand}`);
  });

  [
    'npm run stadium:gocheok:evidence',
    'npm run qa:stadium:gocheok:trace-review',
  ].forEach((removedCommand) => {
    assert.equal(gocheokOpsSource.includes(removedCommand), false, `Gocheok ops should not document ${removedCommand}`);
    assert.equal(releaseLockSource.includes(removedCommand), false, `release lock should not document ${removedCommand}`);
    assert.equal(overlayChecklistSource.includes(removedCommand), false, `overlay checklist should not document ${removedCommand}`);
  });
});
