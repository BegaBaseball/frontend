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

test('잠실 운영자 직관 UX Cypress spec은 전용 stadium-seatmap 회귀 파일에서 검증한다', () => {
  const stadiumSeatmapSpec = readProjectFile('cypress/e2e/stadium-seatmap-jamsil.cy.ts');
  const stadiumUxAuditSource = readProjectFile('scripts/stadium-ux-audit.mjs');
  const jamsilSource = readProjectFile('src/components/jamsil/JamsilSeatMap.tsx');
  const jamsilOperatorSource = readProjectFile('src/data/jamsilOperatorVisitGuide.ts');
  const releaseLockSource = readProjectFile('docs/jamsil-seatmap-release-lock.md');

  [
    'getJamsilOperatorVisitGuidance',
    'renderOperatorVisitMeta',
    'jamsil-operator-visit-check',
    'jamsil-operator-data-status',
    'jamsil-seatmap-bottom-sheet',
    'MANUAL_OPERATOR_GUIDANCE_STATUS',
    'hasManualFallback',
    'getTileFieldSource',
    'data-operator-field-source',
  ].forEach((requiredText) => {
    assert.ok(jamsilSource.includes(requiredText), `JamsilSeatMap should include ${requiredText}`);
  });

  [
    "{ label: '블록', value: operatorGuidance.blockLabel }",
    "{ label: '층', value: section.level }",
    "{ label: '측', value: getJamsilSideLabel(section.side) }",
    "{ label: '팬 구분', value: getJamsilFanRoleLabel(section) }",
  ].forEach((forbiddenText) => {
    assert.equal(jamsilSource.includes(forbiddenText), false, `Jamsil operator panel should not surface non-operator seat metadata: ${forbiddenText}`);
  });

  [
    'JAMSIL_OPERATOR_FACILITY_POINTS',
    'JAMSIL_BLOCK_VISIT_GUIDANCE',
    'JAMSIL_OPERATION_NOTICES',
    'getJamsilOperatorVisitGuidance',
    'getJamsilActiveOperationNotices',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredText) => {
    assert.ok(jamsilOperatorSource.includes(requiredText), `jamsilOperatorVisitGuide should include ${requiredText}`);
  });

  [
    'Stadium SeatMap — Jamsil Operator Visit UX',
    'selectJamsilBlock',
    'jamsil-block-search',
    'jamsil-section-finder-item-block-101',
    'jamsil-section-finder-item-accessible-first',
    'jamsil-operator-visit-check',
    'jamsil-operator-data-status',
    'assertJamsilOperatorConfirmedBlock101Fields',
    'assertJamsilOperatorConfirmedAccessibleFirstFields',
    'data-operator-field-source',
    'manual-required',
    'operator-provided',
    'OPERATOR_PROVIDED',
    '2층 2-3 Gate 인근 화장실',
    '2026-06-01',
    'jamsil-seatmap-bottom-sheet',
  ].forEach((requiredText) => {
    assert.ok(stadiumSeatmapSpec.includes(requiredText), `Stadium seatmap Cypress spec should include ${requiredText}`);
  });

  [
    'JAMSIL_OPERATOR_RUNTIME_TARGETS',
    'jamsil-operator-runtime-check.json',
    'jamsil-operator-runtime-check.md',
    'data-operator-field-source',
    "targetType: 'special'",
    'field-survey restroom assignment is approved runtime guidance',
    'special field-survey restroom assignments are approved runtime guidance',
    '잠실야구장',
    '1층 101구역 인근 화장실',
    '1층 223구역 인근 화장실',
    '2층 2-3 Gate 인근 화장실',
    '2층 2-1 Gate 인근 화장실',
    '도미노피자',
    '3층 D10 인근 화장실',
    '베어스하우스',
  ].forEach((requiredText) => {
    assert.ok(stadiumUxAuditSource.includes(requiredText), `Stadium UX audit should include Jamsil operator runtime check token: ${requiredText}`);
  });

  [
    'jamsil-operator-runtime-check.json',
    'jamsil-operator-runtime-check',
    'data-operator-field-source',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `Jamsil release lock should include ${requiredText}`);
  });
});
