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

test('인천 직관 UX Cypress spec은 전용 stadium-seatmap 회귀 파일에서 검증한다', () => {
  const stadiumSeatmapSpec = readProjectFile('cypress/e2e/stadium-seatmap-incheon.cy.ts');

  [
    'Stadium SeatMap — Incheon First Visit UX',
    'selectIncheonBlock',
    'incheon-first-visit-guide',
    'incheon-section-finder',
    'incheon-seatmap-detail-panel',
    'incheon-block-search',
    'incheon-section-finder-item-incheon-101b',
    'incheon-guide-search',
    'incheon-guide-result-incheon-101b',
    'incheon-guide-result-incheon-accessible-9b',
    'incheon-compare-tray',
    'incheon-compare-add',
    'incheon-compare-remove',
    'incheon-operator-visit-guide',
    'incheon-operator-data-status',
    'incheon-operator-row-entrance',
    'incheon-operator-row-facilities',
    'incheon-operator-row-notice',
    'incheon-operator-row-updated',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'incheon-mobile-tool-tab-guide',
    'incheon-mobile-tool-tab-finder',
    '시야 사진 올리기',
    'pendingLoginRedirect',
  ].forEach((requiredText) => {
    assert.ok(stadiumSeatmapSpec.includes(requiredText), `Stadium seatmap Cypress spec should include ${requiredText}`);
  });
});

test('인천 좌석도 package alias는 runtime release 최소 표면만 노출한다', () => {
  const packageSource = readProjectFile('package.json');
  const dispatcherSource = readProjectFile('scripts/stadium-seatmap-ops.mjs');
  const incheonOpsSource = readProjectFile('scripts/incheon-seatmap-ops.mjs');
  const releaseLockSource = readProjectFile('docs/incheon-seatmap-release-lock.md');
  const overlayChecklistSource = readProjectFile('docs/stadium-seatmap-overlay-checklist.md');

  [
    '"qa:stadium:incheon:mobile": "node scripts/qa-presets.mjs stadium incheon mobile"',
    '"qa:stadium:incheon:full": "node scripts/qa-presets.mjs stadium incheon full"',
    '"qa:stadium:incheon:release-lock": "node scripts/qa-presets.mjs stadium incheon release-gate"',
    '"stadium:incheon:status": "node scripts/qa-presets.mjs stadium incheon status"',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  [
    '"qa:stadium:incheon:responsive"',
    '"qa:stadium:incheon:trace-review"',
    '"stadium:incheon:pixel-components"',
  ].forEach((removedText) => {
    assert.equal(packageSource.includes(removedText), false, `package script should not expose ${removedText}`);
  });

  [
    'publicTasks: [',
    "'release-gate'",
    'package aliases expose only mobile/full runtime QA, release lock, and status',
    'additional review modes must stay dispatcher-internal',
  ].forEach((requiredText) => {
    assert.ok(dispatcherSource.includes(requiredText), `dispatcher should include ${requiredText}`);
  });

  [
    'package mobile script',
    'package full script',
    'package responsive script absent',
    'package trace review script absent',
    'package pixel components script absent',
    'release lock document includes current fixture fingerprint',
  ].forEach((requiredText) => {
    assert.ok(incheonOpsSource.includes(requiredText), `Incheon release gate should check ${requiredText}`);
  });

  [
    '## 공개 명령',
    'npm run stadium:incheon:status',
    'releaseFixtureFingerprint=ff1421f842dba83886df3a06eb800ed6b155391045705a3db29156d67e171852',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  assert.ok(overlayChecklistSource.includes('Clickable coverage: 156 official blocks and special zones'));
  assert.ok(overlayChecklistSource.includes('Release lock: `npm run qa:stadium:incheon:release-lock`'));
  assert.ok(overlayChecklistSource.includes('Public status: `npm run stadium:incheon:status`'));
});
