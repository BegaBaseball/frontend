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

test('대구 좌석도 release lock 문서는 classified row 계약을 고정한다', () => {
  const releaseLockSource = readProjectFile('docs/daegu-seatmap-release-lock.md');

  [
    '# 대구 삼성라이온즈파크 좌석도 release lock',
    'PASS_RELEASE_177',
    '1707x2048',
    'DAEGU_SAMSUNG_LIONS_PARK_2026_MANUAL_POLYGON_V1',
    '0d3926764aa1ced440804a1cfb1519e6f54eb1c4835e56e64bec3597d984640a',
    'LOCKED_VERIFIED',
    '174',
    'classifiedReleaseRows',
    '3',
    'releaseInventoryLocked',
    '177',
    'normalSelectableSeats',
    '171',
    'reviewOnlySeats',
    '0',
    'officialUnconfirmedSeats',
    '2',
    'MR-10',
    'M-10',
    '12',
    'OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED',
    'WAYFINDING_MARKER',
    'not selectable',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'MYSEATCHECK_REFERENCE_2026',
    'docs/daegu-seatmap-myseatcheck-reference-intake.md',
    'canonical 좌표를 대체하지 않는다',
    'Operator input contract verification (2026-05-30)',
    'operator input JSON carries `operatorReviewContract`',
    'production promotion requires gate status `ready-for-source-preview`',
    'reports/stadium/daegu-seatmap-canonical-sky-blue-retrace-batch/operator-input/daegu-seatmap-canonical-sky-blue-retrace-input.json',
    'npm run qa:stadium:daegu:release-lock',
    'npm run stadium:daegu:canonical-retrace-batch -- SKY_UPPER_01_10',
    'npm run stadium:daegu:render-safety-audit',
    'npm run qa:stadium:daegu:full',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `Daegu release lock should include ${requiredText}`);
  });
});

test('standard shell PR scope guard는 clean expected 파일을 blocker로 보지 않는다', () => {
  const guardSource = readProjectFile('scripts/stadium-seatmap-standard-shell-pr-scope-guard.mjs');
  const scopeDocSource = readProjectFile('docs/stadium-seatmap-standard-shell-pr-scope.md');

  assert.ok(guardSource.includes('notDirtyExpectedCount'), 'scope guard should report clean expected standard shell files separately');
  assert.ok(
    guardSource.includes('clean expected files are not packaging blockers'),
    'scope guard report should state clean expected files are not packaging blockers',
  );
  assert.equal(
    guardSource.includes('Expected standard shell PR file is not present in dirty inventory.'),
    false,
    'scope guard should not fail just because an expected standard shell file is currently clean',
  );
  assert.ok(
    scopeDocSource.includes('expected files not currently dirty'),
    'scope doc should document the not-dirty expected file behavior',
  );
});
