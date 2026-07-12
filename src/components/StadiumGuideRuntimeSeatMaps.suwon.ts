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

test('수원 Finder UX Cypress spec은 전용 stadium-seatmap 회귀 파일에서 검증한다', () => {
  const stadiumSeatmapSpec = readProjectFile('cypress/e2e/stadium-seatmap-suwon.cy.ts');
  const suwonSource = readProjectFile('src/components/suwon/SuwonSeatMap.tsx');
  const suwonSvgSource = readProjectFile('src/components/suwon/SuwonSeatMapSvg.tsx');
  const suwonOperatorSource = readProjectFile('src/data/suwonOperatorVisitGuide.ts');

  [
    'data-testid={`suwon-seat-hit-${block.id}`}',
    'aria-pressed={selectedId === block.id}',
    'tabIndex={isFiltered ? -1 : 0}',
    "event.key === 'Enter' || event.key === ' '",
    'comparisonIds',
    "data-compared={isCompared ? 'true' : undefined}",
  ].forEach((requiredText) => {
    assert.ok(suwonSvgSource.includes(requiredText), `SuwonSeatMapSvg should include ${requiredText}`);
  });

  [
    'getSuwonOperatorVisitGuidance',
    'renderOperatorVisitMeta',
    'SuwonCompareTray',
    'comparisonIds',
    'recentSelectionIds',
    'suwon-compare-tray',
    'suwon-compare-add',
    'suwon-compare-remove',
    'suwon-compare-clear',
    'suwon-recent-card-',
    'suwon-operator-visit-check',
    'suwon-operator-data-status',
    'MANUAL_OPERATOR_GUIDANCE_STATUS',
    'hasManualFallback',
    'data-operator-field-source',
  ].forEach((requiredText) => {
    assert.ok(suwonSource.includes(requiredText), `SuwonSeatMap should include ${requiredText}`);
  });

  [
    "{ label: '블록', value: operatorGuidance.blockLabel }",
    "{ label: '층', value: section.level }",
    "{ label: '측', value: getSuwonSideLabel(section.side) }",
    "{ label: '팬 구분', value: getSuwonFanRoleLabel(section.fanRole) }",
  ].forEach((forbiddenText) => {
    assert.equal(suwonSource.includes(forbiddenText), false, `Suwon operator panel should not surface non-operator seat metadata: ${forbiddenText}`);
  });

  [
    'SUWON_OPERATOR_FACILITY_POINTS',
    'SUWON_BLOCK_VISIT_GUIDANCE',
    'SUWON_OPERATION_NOTICES',
    'getSuwonOperatorVisitGuidance',
    'getSuwonActiveOperationNotices',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredText) => {
    assert.ok(suwonOperatorSource.includes(requiredText), `suwonOperatorVisitGuide should include ${requiredText}`);
  });

  [
    'Stadium SeatMap — Suwon Finder UX',
    'getSuwonPlaces',
    'selectSuwonBlock',
    'suwon-block-search',
    'suwon-first-visit-guide',
    'suwon-mobile-secondary-panel',
    'suwon-mobile-tool-tab-guide',
    'suwon-mobile-tool-tab-finder',
    'suwon-guide-intent-home',
    'suwon-guide-result-suwon-107',
    'suwon-guide-intent-accessible',
    'suwon-guide-result-suwon-wheel-center',
    'suwon-section-finder',
    'suwon-section-finder-item-suwon-sb22',
    'suwon-section-finder-item-suwon-117',
    '키보드로 수원 블록 검색 결과와 SVG 블록을 선택할 수 있다',
    'suwon-seat-hit-suwon-117',
    'suwon-seat-hit-suwon-118',
    'suwon-filter-sky',
    'suwon-seatmap-transform-layer',
    'suwon-seatmap-bottom-sheet',
    'suwon-compare-tray',
    'suwon-compare-card-suwon-117',
    'suwon-compare-card-suwon-118',
    'suwon-compare-card-suwon-sb22',
    'suwon-compare-add',
    'suwon-compare-view',
    'suwon-compare-remove',
    'suwon-compare-clear',
    'suwon-recent-card-suwon-107',
    'suwon-recent-view',
    'suwon-recent-add',
    'data-compared',
    'suwon-operator-visit-check',
    'suwon-operator-data-status',
    'assertSuwonOperatorFallbackFields',
    'data-operator-field-source',
    'manual-required',
  ].forEach((requiredText) => {
    assert.ok(stadiumSeatmapSpec.includes(requiredText), `Stadium seatmap Cypress spec should include ${requiredText}`);
  });
});
test('stadium seatmap Cypress 회귀는 구장별 split alias를 제공한다', () => {
  const packageSource = readProjectFile('package.json');
  const defaultSeatmapSpec = readProjectFile('cypress/e2e/stadium-seatmap.cy.ts');

  [
    '"cy:stadium:seatmaps": "node scripts/qa-presets.mjs cypress stadium-seatmaps"',
    '"cy:stadium:shared": "node scripts/qa-presets.mjs cypress stadium-shared"',
    '"cy:stadium:incheon": "node scripts/qa-presets.mjs cypress stadium-incheon"',
    '"cy:stadium:jamsil": "node scripts/qa-presets.mjs cypress stadium-jamsil"',
    '"cy:stadium:suwon": "node scripts/qa-presets.mjs cypress stadium-suwon"',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  assert.ok(defaultSeatmapSpec.includes('Stadium SeatMap — Split Spec Smoke'));
});

test('수원 좌석도 package alias는 runtime release 최소 표면만 노출한다', () => {
  const packageSource = readProjectFile('package.json');
  const dispatcherSource = readProjectFile('scripts/stadium-seatmap-ops.mjs');
  const suwonOpsSource = readProjectFile('scripts/suwon-seatmap-ops.mjs');
  const releaseLockSource = readProjectFile('docs/suwon-seatmap-release-lock.md');

  [
    '"qa:stadium:suwon:mobile": "node scripts/qa-presets.mjs stadium suwon mobile"',
    '"qa:stadium:suwon:full": "node scripts/qa-presets.mjs stadium suwon full"',
    '"qa:stadium:suwon:release-lock": "node scripts/qa-presets.mjs stadium suwon release-gate"',
    '"stadium:suwon:status": "node scripts/qa-presets.mjs stadium suwon status"',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  [
    '"qa:stadium:suwon:responsive"',
    '"stadium:suwon:visual-review"',
    '"stadium:suwon:precision-workset"',
    '"qa:stadium:suwon:visual-review"',
  ].forEach((removedText) => {
    assert.equal(packageSource.includes(removedText), false, `package script should not expose ${removedText}`);
  });

  [
    'publicTasks: [',
    "'release-gate'",
    'responsive: [',
    "'visual-review': [",
    "'precision-workset': [",
    'responsive QA, visual review, and precision workset generation remain dispatcher-internal',
    'responsive, visual-review, and precision-workset tasks stay available through the integrated dispatcher',
  ].forEach((requiredText) => {
    assert.ok(dispatcherSource.includes(requiredText), `dispatcher should include ${requiredText}`);
  });

  [
    'node scripts/stadium-seatmap-ops.mjs suwon responsive',
    'node scripts/stadium-seatmap-ops.mjs suwon visual-review',
    'node scripts/stadium-seatmap-ops.mjs suwon precision-workset',
    'src/data/suwonOperatorVisitGuide.ts',
    'docs/stadium/operator-visit-guide-policy.md',
    'node --import tsx --test --test-concurrency=1 src/data/suwonOperatorVisitGuideSeatData.test.ts',
    'suwon-operator-entrance',
    'suwon-operator-facilities',
    'suwon-operator-notice',
    'suwon-operator-updated-at',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((internalCommand) => {
    assert.ok(releaseLockSource.includes(internalCommand), `release lock should document ${internalCommand}`);
  });

  [
    'npm run qa:stadium:suwon:responsive',
    'npm run stadium:suwon:visual-review',
    'npm run stadium:suwon:precision-workset',
    'npm run qa:stadium:suwon:visual-review',
  ].forEach((removedCommand) => {
    assert.equal(releaseLockSource.includes(removedCommand), false, `release lock should not document ${removedCommand}`);
  });

  [
    'package responsive script removed',
    'package visual review script removed',
    'package precision workset script removed',
    'dispatcher responsive task',
    'dispatcher visual review task',
    'dispatcher precision workset task',
  ].forEach((requiredText) => {
    assert.ok(suwonOpsSource.includes(requiredText), `Suwon release gate should check ${requiredText}`);
  });
});
