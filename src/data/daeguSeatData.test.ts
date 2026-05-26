import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DAEGU_BLOCKS,
  DAEGU_CATEGORIES,
  DAEGU_CATEGORY_GROUPS,
  DAEGU_REQUIRED_OFFICIAL_SECTIONS,
  DAEGU_DEFAULT_SEATMAP_SOURCE_ID,
  DAEGU_MYSEATCHECK_REFERENCE_REQUIRED_ASSET_FILE_NAME,
  DAEGU_MYSEATCHECK_REFERENCE_URL,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_RAPAK_2025_IMAGE_SHA256,
  DAEGU_OPERATOR_REFERENCE_RAPAK_2025_REQUIRED_ASSET_FILE_NAME,
  DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT,
  DAEGU_SEATMAP_IMAGE,
  DAEGU_SEATMAP_SOURCE_REFERENCES,
  DAEGU_SEATMAP_VIEWPORT,
  getDaeguTraceMethodLabel,
  getDaeguTraceStatusLabel,
  isDaeguNormalSelectableSeat,
  isDaeguOperatorReferenceSelectableSeat,
  isDaeguOfficialUnconfirmedSeat,
  isDaeguReviewOnlySeat,
} from './daeguSeatData';
import {
  DAEGU_CANONICAL_BLOCK_DECISIONS,
  DAEGU_CANONICAL_BLOCK_DECISION_POLICY,
  DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY,
  DAEGU_CANONICAL_OFFICIAL_SOURCE_ID,
  DAEGU_CANONICAL_OPERATOR_SOURCE_ID,
  validateDaeguCanonicalBlockDecisions,
} from './daeguCanonicalBlockDecision';
import { validateSeatMapPolygonPath } from '../utils/seatMapPolygonValidator';

const DAEGU_VISUAL_MATCH_SOURCE = readFileSync(
  new URL('../../scripts/daegu-seatmap-visual-match.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P0_APPROVAL_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p0-approval.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P1_APPROVAL_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p1-approval.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P2A_APPROVAL_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p2a-approval.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P2B_APPROVAL_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p2b-approval.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P2C_APPROVAL_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p2c-approval.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P3_APPROVAL_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p3-approval.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P4_APPROVAL_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p4-approval.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P7_APPROVAL_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p7-approval.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P8_CLASSIFICATION_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p8-classification.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P9_MISSING_SCAN_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p9-missing-scan.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P10_CANDIDATE_CLASSIFICATION_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p10-candidate-classification.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P11_APPROVAL_PACKET_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p11-approval-packet.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P12_DRY_RUN_APPLY_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p12-dry-run-apply.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P13_SOURCE_APPLY_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p13-source-apply.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P14_REVIEW_WORKFLOW_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p14-review-workflow.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P27_CANONICAL_APPROVAL_WRITE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p27-canonical-approval-write.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P28_SOURCE_PATCH_PREVIEW_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p28-source-patch-preview.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P29_SOURCE_POSTWRITE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p29-source-postwrite.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p30-special-zone-source-apply.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P31_SKY_FIRST_BASE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p31-sky-first-base-source-apply.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P31_SKY_CENTER_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p31-sky-center-source-apply.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P31_SKY_THIRD_BASE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p31-sky-third-base-source-apply.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P32_POST_P31_AUDIT_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p32-post-p31-audit.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P33_LABEL_COVERAGE_AUDIT_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p33-label-coverage-audit.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P34_VISUAL_MATCH_AUDIT_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p34-visual-match-audit.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P35_REVIEW_LOCK_AUDIT_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p35-review-lock-audit.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P36_REVIEW_TEMPLATE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p36-review-template.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P37_REVIEW_STATUS_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p37-review-status.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P38_REVIEW_INPUT_SEED_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p38-review-input-seed.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P39_REVIEW_INPUT_STATUS_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p39-review-input-status.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P40_RELEASE_LOCK_PREFLIGHT_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p40-release-lock-preflight.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P41_REVIEW_HANDOFF_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p41-review-handoff.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INTAKE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p42-review-intake.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P43_RELEASE_CANDIDATE_PREFLIGHT_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p43-release-candidate-preflight.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P44_DECISION_FIXTURES_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p44-decision-fixtures.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P45_REAL_INPUT_GUARD_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p45-real-input-guard.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P46_RELEASE_INPUT_PREFLIGHT_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p46-release-input-preflight.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P47_SOURCE_APPLY_PREVIEW_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p47-source-apply-preview.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P48_SOURCE_APPLY_GUARD_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p48-source-apply-guard.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P49_POSTWRITE_RELEASE_AUDIT_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p49-postwrite-release-audit.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P50_FINAL_REVIEW_PACK_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p50-final-review-pack.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P51_REAL_REVIEW_INPUT_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p51-real-review-input.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P52_SOURCE_PATCH_PREVIEW_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p52-source-patch-preview.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P53_SOURCE_APPLY_GUARD_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p53-source-apply-guard.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P54_PARTIAL_APPROVAL_FIXTURE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p54-partial-approval-fixture.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P55_OPERATOR_HANDOFF_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p55-operator-handoff.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P56_REAL_INPUT_INTAKE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p56-real-input-intake.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P57_P52_HANDOFF_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p57-p52-handoff.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P58_READY_FIXTURE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p58-ready-fixture.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P59_READINESS_COMPARISON_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p59-readiness-comparison.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P60_PRODUCTION_PILOT_APPROVAL_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p60-production-pilot-approval.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P61_POST_P60_READINESS_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p61-post-p60-readiness.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P62_SINGLE_ROW_APPLY_PREVIEW_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p62-single-row-apply-preview.mjs', import.meta.url),
  'utf8',
);
const DAEGU_OPERATOR_REFERENCE_P63_SINGLE_ROW_SOURCE_POSTWRITE_SOURCE = readFileSync(
  new URL('../../scripts/daegu-operator-reference-p63-single-row-source-postwrite.mjs', import.meta.url),
  'utf8',
);
const DAEGU_QA_OWNERSHIP_AUDIT_SOURCE = readFileSync(
  new URL('../../scripts/daegu-seatmap-qa-ownership-audit.mjs', import.meta.url),
  'utf8',
);
const DAEGU_CANONICAL_BLOCK_DECISION_GUARD_SOURCE = readFileSync(
  new URL('../../scripts/daegu-seatmap-canonical-block-decision-guard.mjs', import.meta.url),
  'utf8',
);
const DAEGU_CANONICAL_BLOCK_DECISION_SOURCE = readFileSync(
  new URL('./daeguCanonicalBlockDecision.ts', import.meta.url),
  'utf8',
);

const REQUIRED_CORE_CATEGORIES = [
  'VIP',
  'TABLE',
  'BLUE',
  'EXCITING',
  'INFIELD',
  'SKY',
  'OUTFIELD',
  'AWAY',
  'ACCESSIBLE',
  'SWEETBOX',
  'PARTY',
];
const OFFICIAL_SOURCE_URL = 'https://www.samsunglions.com/score/score_4_2_1.asp';
const OFFICIAL_ASSET_URL = new URL('../assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png', import.meta.url);
const OPERATOR_REFERENCE_RAPAK_2025_ASSET_URL = new URL('../assets/stadiums/samsung/daegu-operator-reference-rapak-2025-enhanced-transparent.png', import.meta.url);
const OFFICIAL_ALLOWED_GEOMETRY_VERSIONS = new Set([
  'manual-polygon-v1',
  'daegu-p1-duplicate-precision-p0-operator-approved-v1',
  'daegu-p1-boundary-first-image-approved-v1',
  'daegu-visual-match-batch1-1-2-t1-4-image-approved-v1',
  'daegu-visual-match-batch1-3-8-11-image-approved-v1',
  'daegu-visual-match-batch1-3e-3-4-chain-image-approved-v1',
  'daegu-visual-match-batch1-13-14-u22-protected-v1',
  'daegu-visual-match-batch1-15-16-component-split-image-approved-v1',
  'daegu-visual-match-batch1-u25-u31-magenta-component-image-approved-v1',
  'daegu-visual-match-batch2-u10-u14-magenta-component-image-approved-v1',
  'daegu-visual-match-batch2-06-11-sky-upper-component-split-image-approved-v1',
  'daegu-visual-match-batch2-01-05-sky-upper-component-split-image-approved-v1',
  'daegu-visual-match-batch2-07-sky-upper-component-split-image-approved-v1',
  'daegu-visual-match-batch2-08-sky-upper-component-split-image-approved-v1',
  'daegu-visual-match-batch2-12-wayfinding-marker-image-classified-v1',
  'daegu-visual-match-batch2-1-12-small-triangle-image-approved-v1',
  'daegu-visual-match-batch3-1-9-1-12-overlap-split-v1',
  'daegu-visual-match-batch2-mr-9-official-label-remap-v1',
  'daegu-visual-match-batch2-m-9-official-label-remap-v1',
  'daegu-visual-match-batch2-right-outfield-grass-zone-image-approved-v1',
  'daegu-visual-match-batch2-right-outfield-camping-split-image-approved-v1',
  'daegu-missing-block-p0-1-4-image-approved-v1',
  'daegu-missing-block-p0-s7-image-approved-v1',
  'daegu-missing-block-p1-lf-2-image-approved-v1',
  'daegu-missing-block-p1-s24-image-approved-v1',
  'daegu-missing-block-p1-s25-image-approved-v1',
  'daegu-missing-block-p1-s26-image-approved-v1',
  'daegu-missing-block-p1-s27-image-approved-v1',
  'daegu-missing-block-p1-1-11-image-approved-v1',
  'daegu-missing-block-p1-1-10-image-approved-v1',
  'daegu-missing-block-p1-1-9-component-boundary-v2',
  'daegu-missing-block-p1-1-8-component-boundary-v2',
  'daegu-missing-block-p1-1-7-component-boundary-v2',
  'daegu-missing-block-p1-1e-cluster-component-boundary-v1',
  'daegu-missing-block-p1-s24-s27-component-boundary-v2',
  'daegu-missing-block-p1-s31-s23-diagonal-component-remap-v3',
  'daegu-missing-block-p1-s21-s23-ownership-remap-v1',
  'daegu-missing-block-p1-party-live-image-approved-v1',
]);

function assertDaeguOpsScript(packageSource: string, scriptName: string): void {
  const operationName = scriptName.replace('stadium:daegu:', '');
  assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  assert.ok(
    packageSource.includes(`"${scriptName}": "node scripts/stadium-seatmap-ops.mjs daegu ${operationName}"`),
    `${scriptName} should route through stadium-seatmap-ops.mjs`,
  );
}

const OFFICIAL_SIMPLE_POLYGON_BLOCKS = new Set([
  '1-6',
  'T3-2',
  '3-1',
  'S21',
  'S20',
  'S12',
  'S11',
  'S10',
  'S9',
  'S8',
  'U19',
  'U18',
  'U17',
  'U16',
  'U1',
  'U23',
  'U22',
  '09',
  'F-2',
  'M-6',
  'M-5',
  'M-4',
  'M-3',
  'M-1',
  'TR-7',
  'TR-6',
  'TR-5',
  'TR-4',
  'TR-3',
  'TR-2',
  'TR-1',
  'RF-8',
  'RF-7',
  'RF-6',
  'RF-5',
  'RF-4',
  'RF-3',
  'RF-2',
  'RF-1',
  'MR-8',
  'MR-7',
  'MR-6',
  'MR-5',
  'MR-4',
  'MR-3',
  'MR-2',
  'MR-1',
  'LF-6',
  'LF-5',
  'LF-4',
  'LF-1',
  '외야 3루측',
]);
type Point = [number, number];

function pngDimensions(assetUrl: URL) {
  const buffer = readFileSync(assetUrl);
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function fileSha256(assetUrl: URL) {
  return createHash('sha256').update(readFileSync(assetUrl)).digest('hex');
}

function pathPoints(path: string) {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: Point[] = [];
  for (let index = 0; index < numbers.length; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
}

function geometryPaths(block: (typeof DAEGU_BLOCKS)[number]) {
  const visualPath = block.imageGeometry.visualPath ?? block.imageGeometry.d;
  const hitPath = block.imageGeometry.hitPath ?? visualPath;
  if (hitPath === block.imageGeometry.d && block.imageGeometry.paths?.length) {
    return block.imageGeometry.paths;
  }
  return [hitPath];
}

function polygonArea(points: Point[]) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0) / 2);
}

function blockArea(block: (typeof DAEGU_BLOCKS)[number]) {
  return geometryPaths(block).reduce((sum, path) => sum + polygonArea(pathPoints(path)), 0);
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const segmentX = end[0] - start[0];
  const segmentY = end[1] - start[1];
  const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
  if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);

  const ratio = Math.max(0, Math.min(1, (
    ((point[0] - start[0]) * segmentX) + ((point[1] - start[1]) * segmentY)
  ) / lengthSquared));

  return Math.hypot(
    point[0] - (start[0] + (ratio * segmentX)),
    point[1] - (start[1] + (ratio * segmentY)),
  );
}

function pointOnPolygonBoundary(point: Point, polygon: Point[], tolerance = 0.75) {
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (distanceToSegment(point, start, end) <= tolerance) return true;
  }

  return false;
}

function pointInPolygon(point: Point, polygon: Point[]) {
  if (polygon.length < 3) return false;
  if (pointOnPolygonBoundary(point, polygon)) return true;

  const [x, y] = point;
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const [xi, yi] = polygon[current];
    const [xj, yj] = polygon[previous];
    const intersects = ((yi > y) !== (yj > y))
      && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInBlockPath(point: Point, block: (typeof DAEGU_BLOCKS)[number]) {
  return geometryPaths(block).some((path) => pointInPolygon(point, pathPoints(path)));
}

function topHitBlockAt(point: Point): (typeof DAEGU_BLOCKS)[number] | null {
  let topBlock: (typeof DAEGU_BLOCKS)[number] | null = null;

  DAEGU_BLOCKS
    .filter((block) => !isDaeguReviewOnlySeat(block))
    .sort((a, b) => blockArea(b) - blockArea(a))
    .forEach((block) => {
      if (pointInBlockPath(point, block)) {
        topBlock = block;
      }
    });

  return topBlock;
}

function orientation(a: Point, b: Point, c: Point) {
  const value = ((b[0] - a[0]) * (c[1] - a[1])) - ((b[1] - a[1]) * (c[0] - a[0]));
  return Math.sign(value);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return Boolean(o1 && o2 && o3 && o4 && o1 !== o2 && o3 !== o4);
}

function hasSelfIntersection(points: Point[]) {
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) {
      const adjacent = Math.abs(index - nextIndex) <= 1 || (index === 0 && nextIndex === points.length - 1);
      if (adjacent) continue;
      const c = points[nextIndex];
      const d = points[(nextIndex + 1) % points.length];
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

test('대구 좌석도 asset 상태는 공식 파일 준비 여부를 명시한다', () => {
  assert.equal(DAEGU_SEATMAP_IMAGE.stadiumId, 'DAEGU_SAMSUNG_LIONS_PARK');
  assert.equal(DAEGU_SEATMAP_IMAGE.mapVersion, 'DAEGU_SAMSUNG_LIONS_PARK_2026_MANUAL_POLYGON_V1');
  assert.equal(DAEGU_SEATMAP_IMAGE.imagePath, `src/assets/stadiums/samsung/${DAEGU_SEATMAP_IMAGE.requiredAssetFileName}`);
  assert.match(DAEGU_SEATMAP_IMAGE.requiredAssetFileName, /^daegu-samsung-seatmap-official-2026\.(png|webp)$/);
  assert.equal(DAEGU_SEATMAP_IMAGE.viewBox, '0 0 1707 2048');
  assert.equal(DAEGU_SEATMAP_IMAGE.imageSha256, '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0');
  assert.ok(DAEGU_SEATMAP_IMAGE.sourceLabel);
  assert.equal(DAEGU_SEATMAP_IMAGE.sourceUrl, OFFICIAL_SOURCE_URL);

  if (DAEGU_SEATMAP_IMAGE.assetStatus === 'OFFICIAL') {
    assert.equal(DAEGU_SEATMAP_IMAGE.imageWidth, 1707);
    assert.equal(DAEGU_SEATMAP_IMAGE.imageHeight, 2048);
  } else {
    assert.equal(DAEGU_SEATMAP_IMAGE.assetStatus, 'MANUAL_BASEBALL_DATA_REQUIRED');
    assert.equal(DAEGU_SEATMAP_IMAGE.imageWidth, 0);
    assert.equal(DAEGU_SEATMAP_IMAGE.imageHeight, 0);
    assert.equal(DAEGU_BLOCKS.length, 0);
  }
});

test('대구 공식 PNG 실제 크기는 데이터 좌표계와 일치한다', () => {
  const dimensions = pngDimensions(OFFICIAL_ASSET_URL);
  assert.equal(dimensions.width, 1707);
  assert.equal(dimensions.height, 2048);
  assert.equal(dimensions.width, DAEGU_SEATMAP_IMAGE.imageWidth);
  assert.equal(dimensions.height, DAEGU_SEATMAP_IMAGE.imageHeight);
  assert.equal(fileSha256(OFFICIAL_ASSET_URL), DAEGU_SEATMAP_IMAGE.imageSha256);
});

test('대구 MySeatCheck reference source는 공식 좌석도와 분리된 pending asset으로만 등록된다', () => {
  const officialSource = DAEGU_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === 'SAMSUNG_OFFICIAL_2026');
  const mySeatCheckSource = DAEGU_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === 'MYSEATCHECK_REFERENCE_2026');

  assert.equal(DAEGU_DEFAULT_SEATMAP_SOURCE_ID, 'OPERATOR_REFERENCE_RAPAK_2025');
  assert.ok(officialSource, 'official Daegu source reference should exist');
  assert.ok(mySeatCheckSource, 'MySeatCheck reference source should exist');
  assert.equal(officialSource.productionCanonical, true, 'official source should remain the production canonical source');
  assert.equal(officialSource.polygonStatus, 'PRODUCTION_INTERACTIVE');
  assert.equal(mySeatCheckSource.kind, 'REFERENCE_IMAGE');
  assert.equal(mySeatCheckSource.assetStatus, 'EXTERNAL_REFERENCE_PENDING_ASSET');
  assert.equal(mySeatCheckSource.polygonStatus, 'REFERENCE_ONLY_PENDING_ASSET');
  assert.equal(mySeatCheckSource.productionCanonical, false);
  assert.equal(mySeatCheckSource.attributionRequired, true);
  assert.equal(mySeatCheckSource.imageWidth, 0);
  assert.equal(mySeatCheckSource.imageHeight, 0);
  assert.equal(mySeatCheckSource.viewBox, '0 0 0 0');
  assert.equal(mySeatCheckSource.imageSha256, null);
  assert.equal(mySeatCheckSource.sourceUrl, DAEGU_MYSEATCHECK_REFERENCE_URL);
  assert.equal(mySeatCheckSource.requiredAssetFileName, DAEGU_MYSEATCHECK_REFERENCE_REQUIRED_ASSET_FILE_NAME);
  assert.equal(mySeatCheckSource.imagePath, `src/assets/stadiums/samsung/${DAEGU_MYSEATCHECK_REFERENCE_REQUIRED_ASSET_FILE_NAME}`);
  assert.match(
    mySeatCheckSource.notes,
    /Do not replace the official PNG or promote coordinates/,
    'external reference should not be allowed to replace canonical official coordinates',
  );
});

test('대구 업로드 operator reference source는 4096 기본 선택 좌석도로 등록된다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const source = DAEGU_SEATMAP_SOURCE_REFERENCES.find((candidate) => candidate.id === 'OPERATOR_REFERENCE_RAPAK_2025');

  assert.ok(source, 'uploaded RaPak operator reference source should exist');
  assert.equal(source.kind, 'INTERACTIVE_SEATMAP');
  assert.equal(source.assetStatus, 'OPERATOR_REFERENCE');
  assert.equal(source.polygonStatus, 'OPERATOR_REFERENCE_APPROVED_INTERACTIVE');
  assert.equal(source.productionCanonical, false);
  assert.equal(source.imageWidth, 4096);
  assert.equal(source.imageHeight, 4096);
  assert.equal(source.viewBox, '0 0 4096 4096');
  assert.equal(DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.width, 4096);
  assert.equal(DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.height, 4096);
  assert.equal(source.imageSha256, DAEGU_OPERATOR_REFERENCE_RAPAK_2025_IMAGE_SHA256);
  assert.equal(source.requiredAssetFileName, DAEGU_OPERATOR_REFERENCE_RAPAK_2025_REQUIRED_ASSET_FILE_NAME);
  assert.equal(source.imagePath, `src/assets/stadiums/samsung/${DAEGU_OPERATOR_REFERENCE_RAPAK_2025_REQUIRED_ASSET_FILE_NAME}`);
  assert.equal(fileSha256(OPERATOR_REFERENCE_RAPAK_2025_ASSET_URL), DAEGU_OPERATOR_REFERENCE_RAPAK_2025_IMAGE_SHA256);
  assert.ok(packageSource.includes('"stadium:daegu:operator-reference-trace"'), 'operator reference trace script should be exposed');
  assert.ok(packageSource.includes('"stadium:daegu:operator-reference-review-packet"'), 'operator reference review packet script should be exposed');
  assert.ok(packageSource.includes('"stadium:daegu:operator-reference-auto-map"'), 'operator reference auto-map script should be exposed');
  assert.ok(packageSource.includes('"stadium:daegu:operator-reference-inventory"'), 'operator reference inventory script should be exposed');
  assert.ok(packageSource.includes('"stadium:daegu:operator-reference-p0-approval-packet"'), 'operator reference P0 approval packet script should be exposed');
  assert.ok(packageSource.includes('"stadium:daegu:operator-reference-p0-approval-gate"'), 'operator reference P0 approval gate script should be exposed');
  assert.match(
    source.notes,
    /Only approved 4096x4096 operator-reference polygons are interactive/,
    'uploaded reference should only expose approved 4096 polygons',
  );
});

test('대구 operator reference P0/P1/P2/P3/P4/P5/P6/P7/P28/P30/P31 승인 블럭 131개는 4096 좌표계에서만 selectable이다', () => {
  const expectedP0Labels = new Set(['TR0', 'TR8', 'TR9', 'TR10']);
  const expectedP1Labels = new Set([
    'TR1',
    'TR2',
    'TR3',
    'TR4',
    'TR5',
    'TR6',
    'TR7',
    'RF1',
    'RF2',
    'RF3',
    'RF4',
    'RF5',
    'RF6',
    'RF7',
    'RF8',
    'RF9',
    'RF10',
  ]);
  const expectedP2ALabels = new Set([
    'LF1',
    'LF2',
    'LF3',
    'LF4',
    'LF5',
    'LF6',
    'LF7',
    'LF8',
    'LF9',
    'LF10',
  ]);
  const expectedP2BLabels = new Set(['F1', 'F2', 'MR10']);
  const expectedP2CLabels = new Set(['S24', 'S25', 'S26', 'S27', 'S28', 'S29', 'S30', 'S31']);
  const expectedP3Labels = new Set(['ML1', 'ML2', 'ML3', 'ML4', 'ML5', 'ML6', 'ML7', 'ML8', 'ML10', 'MR1', 'MR2', 'MR3', 'MR4', 'MR5', 'MR6', 'MR7', 'MR8']);
  const expectedP4Labels = new Set(['112', '111', '110', '19', '18', '17', '16', '312', '311', '310', '39', '38', '1E3', '1E2', '1E1', '3E3', '3E2', '3E1']);
  const expectedP5Labels = new Set(['VIP3', 'VIP2', 'VIP1', 'TC3', 'TC2', 'TC1', 'T34', 'T33', 'T32', 'T31', 'T14', 'T13', 'T12', 'T11']);
  const expectedP6Labels = new Set(['37', '36', '35', '34', '33', '32', '31', '15', '14', '13', '12', '11']);
  const expectedP7Labels = new Set(['S1', 'S2', 'S3', 'S21', 'S22', 'S23']);
  const expectedP28Labels = new Set(['루프탑']);
  const expectedP30Labels = new Set(['파티플로어', '잔디석', 'IM뱅크 캠핑존', 'SKY요기보존']);
  const expectedP31Labels = new Set(['S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']);
  const expectedP31BLabels = new Set(['S11', 'S12', 'S13', 'S14', 'S15']);
  const expectedP31CLabels = new Set(['S16', 'S17', 'S18', 'S19', 'S20']);
  const expectedLabels = new Set([
    ...expectedP0Labels,
    ...expectedP1Labels,
    ...expectedP2ALabels,
    ...expectedP2BLabels,
    ...expectedP2CLabels,
    ...expectedP3Labels,
    ...expectedP4Labels,
    ...expectedP5Labels,
    ...expectedP6Labels,
    ...expectedP7Labels,
    ...expectedP28Labels,
    ...expectedP30Labels,
    ...expectedP31Labels,
    ...expectedP31BLabels,
    ...expectedP31CLabels,
  ]);
  const blockLabels = DAEGU_OPERATOR_REFERENCE_BLOCKS.map((block) => block.block.replace('-', ''));

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.deepEqual(new Set(blockLabels), expectedLabels);
  assert.equal(blockLabels.filter((label) => expectedP0Labels.has(label)).length, 4);
  assert.equal(blockLabels.filter((label) => expectedP1Labels.has(label)).length, 17);
  assert.equal(blockLabels.filter((label) => expectedP2ALabels.has(label)).length, 10);
  assert.equal(blockLabels.filter((label) => expectedP2BLabels.has(label)).length, 3);
  assert.equal(blockLabels.filter((label) => expectedP2CLabels.has(label)).length, 8);
  assert.equal(blockLabels.filter((label) => expectedP3Labels.has(label)).length, 17);
  assert.equal(blockLabels.filter((label) => expectedP4Labels.has(label)).length, 18);
  assert.equal(blockLabels.filter((label) => expectedP5Labels.has(label)).length, 14);
  assert.equal(blockLabels.filter((label) => expectedP6Labels.has(label)).length, 12);
  assert.equal(blockLabels.filter((label) => expectedP7Labels.has(label)).length, 6);
  assert.equal(blockLabels.filter((label) => expectedP28Labels.has(label)).length, 1);
  assert.equal(blockLabels.filter((label) => expectedP30Labels.has(label)).length, 4);
  assert.equal(blockLabels.filter((label) => expectedP31Labels.has(label)).length, 7);
  assert.equal(blockLabels.filter((label) => expectedP31BLabels.has(label)).length, 5);
  assert.equal(blockLabels.filter((label) => expectedP31CLabels.has(label)).length, 5);

  DAEGU_OPERATOR_REFERENCE_BLOCKS.forEach((block) => {
    const normalizedBlock = block.block.replace('-', '');
    assert.equal(isDaeguOperatorReferenceSelectableSeat(block), true, `${block.block} should be selectable in operator reference mode`);
    assert.equal(block.imageGeometry.traceSource, 'OPERATOR_REFERENCE_RAPAK_2025');
    assert.equal(
      block.imageGeometry.geometryVersion,
      expectedP0Labels.has(normalizedBlock)
        ? 'DAEGU_OPERATOR_REFERENCE_P0_APPROVED_DRY_RUN_V1'
        : expectedP1Labels.has(normalizedBlock)
          ? 'DAEGU_OPERATOR_REFERENCE_P1_APPROVED_DRY_RUN_V1'
          : expectedP2ALabels.has(normalizedBlock)
            ? 'DAEGU_OPERATOR_REFERENCE_P2A_APPROVED_DRY_RUN_V1'
            : expectedP2BLabels.has(normalizedBlock)
              ? 'DAEGU_OPERATOR_REFERENCE_P2B_APPROVED_DRY_RUN_V1'
            : expectedP3Labels.has(normalizedBlock)
              ? 'DAEGU_OPERATOR_REFERENCE_P3_APPROVED_DRY_RUN_V1'
              : expectedP4Labels.has(normalizedBlock)
                ? 'DAEGU_OPERATOR_REFERENCE_P4_APPROVED_DRY_RUN_V1'
                : expectedP5Labels.has(normalizedBlock)
                  ? 'DAEGU_OPERATOR_REFERENCE_P5_APPROVED_DRY_RUN_V1'
                  : expectedP6Labels.has(normalizedBlock)
                    ? 'DAEGU_OPERATOR_REFERENCE_P6_APPROVED_DRY_RUN_V1'
                    : expectedP7Labels.has(normalizedBlock)
                      ? 'DAEGU_OPERATOR_REFERENCE_P7_APPROVED_DRY_RUN_V1'
                      : expectedP28Labels.has(normalizedBlock)
                        ? 'DAEGU_OPERATOR_REFERENCE_P28_APPROVED_DRY_RUN_V1'
                        : expectedP30Labels.has(normalizedBlock)
                          ? 'DAEGU_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_APPROVED_V1'
                          : expectedP31Labels.has(normalizedBlock)
                            ? 'DAEGU_OPERATOR_REFERENCE_P31_SKY_FIRST_BASE_APPROVED_V1'
                            : expectedP31BLabels.has(normalizedBlock)
                              ? 'DAEGU_OPERATOR_REFERENCE_P31_SKY_CENTER_APPROVED_V1'
                              : expectedP31CLabels.has(normalizedBlock)
                                ? 'DAEGU_OPERATOR_REFERENCE_P31_SKY_THIRD_BASE_APPROVED_V1'
                      : 'DAEGU_OPERATOR_REFERENCE_P2C_APPROVED_DRY_RUN_V1',
    );
    assert.equal(block.imageGeometry.traceVersion, block.imageGeometry.geometryVersion);
    assert.equal(block.imageGeometry.manualReviewed, true);
    assert.equal(block.imageGeometry.pixelAlignmentStatus, 'PIXEL_ALIGNED');
    assert.ok(block.sourceNote.includes('4096x4096'), `${block.block} source note should document the 4096 coordinate system`);
    assert.ok(block.sourceNote.includes('공식 PNG 1707x2048'), `${block.block} source note should prevent official PNG coordinate mixing`);
    if (block.block === 'TR-0') {
      assert.match(block.reviewNote, /ZERO_INDEX_LABEL_REVIEW/);
    }

    [
      block.imageGeometry.visualPath ?? block.imageGeometry.d,
      block.imageGeometry.hitPath ?? block.imageGeometry.visualPath ?? block.imageGeometry.d,
    ].forEach((path) => {
      const validationErrors = validateSeatMapPolygonPath({
        pathData: path,
        width: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.width,
        height: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.height,
      });
      assert.deepEqual(validationErrors, [], `${block.block} operator reference path should be valid`);
      const points = pathPoints(path);
      assert.ok(!hasSelfIntersection(points), `${block.block} operator reference path should not self-intersect`);
      points.forEach(([x, y]) => {
        assert.ok(x >= 0 && x <= DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.width, `${block.block} x coordinate should stay inside 4096 viewBox`);
        assert.ok(y >= 0 && y <= DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.height, `${block.block} y coordinate should stay inside 4096 viewBox`);
      });
    });

    const labelPoint = block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY];
    assert.ok(
      pointInBlockPath(labelPoint, block),
      `${block.block} label point should land inside its operator reference hit path`,
    );
  });

  assert.ok(
    DAEGU_OPERATOR_REFERENCE_BLOCKS.some((block) => pathPoints(block.imageGeometry.d).some(([x]) => x > DAEGU_SEATMAP_IMAGE.imageWidth)),
    'operator reference paths should contain 4096-space x coordinates beyond the 1707 official PNG width',
  );
  assert.equal(DAEGU_SEATMAP_VIEWPORT.width, 1707, 'official PNG viewport should stay 1707 wide');
  assert.equal(DAEGU_SEATMAP_VIEWPORT.height, 2048, 'official PNG viewport should stay 2048 high');
});

test('대구 operator reference P0 approval flow는 누락 후보 4개와 승인 gate 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p0-approval-packet',
    'stadium:daegu:operator-reference-p0-approval-gate',
    'stadium:daegu:operator-reference-p0-approval-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'TR8',
    'TR9',
    'TR10',
    'TR0',
    'ADD_NEW_SECTION',
    'MAP_TO_EXISTING',
    'EXCLUDE_NON_SEAT',
    'ZERO_INDEX_LABEL_REVIEW',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedHitPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'p0-approval-packet-ready',
    'p0-approval-gate-waiting-for-operator-input',
    'p0-approval-gate-dry-run-ready',
    'daegu-operator-reference-p0-dry-run-apply-plan.json',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'This packet creates review evidence and operator input only. It never writes src/data/daeguSeatData.ts.',
    'This gate validates operator input and emits a dry-run plan only. It never writes src/data/daeguSeatData.ts.',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P0_APPROVAL_SOURCE.includes(requiredText),
      `Daegu operator reference P0 approval flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P1 approval flow는 TR/RF 17개 후보의 dry-run only 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p1-approval-packet',
    'stadium:daegu:operator-reference-p1-approval-gate',
    'stadium:daegu:operator-reference-p1-approval-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'TR1',
    'TR7',
    'RF1',
    'RF10',
    'ADD_TO_OPERATOR_REFERENCE_DATASET',
    'EXCLUDE_NON_SEAT',
    'DAEGU_OPERATOR_REFERENCE_P1_APPROVED_DRY_RUN_V1',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedHitPath',
    'reviewer',
    'reviewedAt',
    'p1-approval-packet-ready',
    'p1-approval-gate-waiting-for-operator-input',
    'p1-approval-gate-dry-run-ready',
    'daegu-operator-reference-p1-dry-run-apply-plan.json',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'This packet creates 4096 operator-reference P1 review evidence only. It never writes src/data/daeguSeatData.ts.',
    'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P1_APPROVAL_SOURCE.includes(requiredText),
      `Daegu operator reference P1 approval flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P2A approval flow는 LF 10개 후보의 dry-run only 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p2a-approval-packet',
    'stadium:daegu:operator-reference-p2a-approval-gate',
    'stadium:daegu:operator-reference-p2a-approval-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'LF1',
    'LF10',
    'ADD_TO_OPERATOR_REFERENCE_DATASET',
    'EXCLUDE_NON_SEAT',
    'DAEGU_OPERATOR_REFERENCE_P2A_APPROVED_DRY_RUN_V1',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedHitPath',
    'reviewer',
    'reviewedAt',
    'p2a-approval-packet-ready',
    'p2a-approval-gate-waiting-for-operator-input',
    'p2a-approval-gate-dry-run-ready',
    'daegu-operator-reference-p2a-dry-run-apply-plan.json',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'This packet creates 4096 operator-reference P2A LF review evidence only. It never writes src/data/daeguSeatData.ts.',
    'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P2A_APPROVAL_SOURCE.includes(requiredText),
      `Daegu operator reference P2A approval flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P2B approval flow는 특수 외야 3개 후보의 dry-run only 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p2b-approval-packet',
    'stadium:daegu:operator-reference-p2b-approval-gate',
    'stadium:daegu:operator-reference-p2b-approval-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'F1',
    'F2',
    'MR10',
    'ADD_TO_OPERATOR_REFERENCE_DATASET',
    'EXCLUDE_NON_SEAT',
    'DAEGU_OPERATOR_REFERENCE_P2B_APPROVED_DRY_RUN_V1',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedHitPath',
    'reviewer',
    'reviewedAt',
    'p2b-approval-packet-ready',
    'p2b-approval-gate-waiting-for-operator-input',
    'p2b-approval-gate-dry-run-ready',
    'daegu-operator-reference-p2b-dry-run-apply-plan.json',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'This packet creates 4096 operator-reference P2B special outfield review evidence only. It never writes src/data/daeguSeatData.ts.',
    'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P2B_APPROVAL_SOURCE.includes(requiredText),
      `Daegu operator reference P2B approval flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P2C approval flow는 SKY S24~S31 8개 후보의 dry-run only 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p2c-approval-packet',
    'stadium:daegu:operator-reference-p2c-approval-gate',
    'stadium:daegu:operator-reference-p2c-approval-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'S24',
    'S31',
    'ADD_TO_OPERATOR_REFERENCE_DATASET',
    'EXCLUDE_NON_SEAT',
    'DAEGU_OPERATOR_REFERENCE_P2C_APPROVED_DRY_RUN_V1',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedHitPath',
    'reviewer',
    'reviewedAt',
    'p2c-approval-packet-ready',
    'p2c-approval-gate-waiting-for-operator-input',
    'p2c-approval-gate-dry-run-ready',
    'daegu-operator-reference-p2c-dry-run-apply-plan.json',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'This packet creates 4096 operator-reference P2C SKY S24-S31 review evidence only. It never writes src/data/daeguSeatData.ts.',
    'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P2C_APPROVAL_SOURCE.includes(requiredText),
      `Daegu operator reference P2C approval flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P4 approval flow는 내야/익사이팅 18개 후보의 dry-run only 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p4-approval-packet',
    'stadium:daegu:operator-reference-p4-approval-gate',
    'stadium:daegu:operator-reference-p4-approval-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    '1-12',
    '1-6',
    '3-12',
    '3-8',
    '1E-3',
    '1E-2',
    '1E-1',
    '3E-3',
    '3E-1',
    'ADD_TO_OPERATOR_REFERENCE_DATASET',
    'EXCLUDE_NON_SEAT',
    'DAEGU_OPERATOR_REFERENCE_P4_APPROVED_DRY_RUN_V1',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedHitPath',
    'reviewer',
    'reviewedAt',
    'p4-approval-packet-ready',
    'p4-approval-gate-waiting-for-operator-input',
    'p4-approval-gate-dry-run-ready',
    'daegu-operator-reference-p4-dry-run-apply-plan.json',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'This packet creates 4096 operator-reference P4 infield/exciting review evidence only. It never writes src/data/daeguSeatData.ts.',
    'P4_OPERATOR_REFERENCE_INFIELD_EXCITING_IMAGE_LABEL_REVIEW',
    'MANUAL_SPLIT_FROM_IMAGE_COMPONENT',
    'RAPAK_REF_080',
    'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P4_APPROVAL_SOURCE.includes(requiredText),
      `Daegu operator reference P4 approval flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P7 approval flow는 SKY 하단 6개와 pending strip 20개 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p7-approval-packet',
    'stadium:daegu:operator-reference-p7-approval-gate',
    'stadium:daegu:operator-reference-p7-approval-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'S-23',
    'S-22',
    'S-21',
    'S-1',
    'S-2',
    'S-3',
    'RAPAK_REF_102',
    'RAPAK_REF_105',
    'ADD_TO_OPERATOR_REFERENCE_DATASET',
    'EXCLUDE_NON_SEAT',
    'PENDING_OPERATOR_DECISION',
    'P7_OPERATOR_REFERENCE_UNLABELED_LOWER_BOWL_REVIEW',
    'P7_REQUIRES_OPERATOR_BLOCK_LABEL',
    'DAEGU_OPERATOR_REFERENCE_P7_APPROVED_DRY_RUN_V1',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedHitPath',
    'reviewer',
    'reviewedAt',
    'p7-approval-packet-ready',
    'p7-approval-gate-waiting-for-operator-input',
    'p7-approval-gate-dry-run-ready',
    'daegu-operator-reference-p7-dry-run-apply-plan.json',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'This packet creates 4096 operator-reference P7 unlabeled lower-bowl review evidence only. It never writes src/data/daeguSeatData.ts.',
    'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P7_APPROVAL_SOURCE.includes(requiredText),
      `Daegu operator reference P7 approval flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P8 classification flow는 P7 pending 20개를 seat layer 밖으로 분류한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p8-classification-packet',
    'stadium:daegu:operator-reference-p8-classification-gate',
    'stadium:daegu:operator-reference-p8-classification-gate:require-classified',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'RAPAK_REF_104',
    'RAPAK_REF_150',
    'MARKER_OR_ACCESSIBILITY_REVIEW',
    'UNLABELED_SEAT_STRIP_REVIEW',
    'WHEELCHAIR_OR_ACCESSIBLE_STRIP',
    'SKY_LOWER_UNLABELED_STRIP',
    'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER',
    'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT',
    'P8 classifies P7 pending components only. It does not add selectable seat polygons.',
    'p8-classification-packet-ready',
    'p8-classification-gate-passed',
    'operatorDecision',
    'APPROVED',
    'reviewer',
    'codex-image-review',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    '블럭명이 없는 SKY 하단 strip은 operator 라벨 없이는 선택 좌석으로 승격하지 않고',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P8_CLASSIFICATION_SOURCE.includes(requiredText),
      `Daegu operator reference P8 classification flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P9 missing scan flow는 이미지 component와 active polygon 비교 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p9-missing-scan-packet',
    'stadium:daegu:operator-reference-p9-missing-scan-gate',
    'stadium:daegu:operator-reference-p9-missing-scan-gate:require-candidates',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'DAEGU_OPERATOR_REFERENCE_BLOCKS',
    'daegu-operator-reference-trace.json',
    'MISSING_BLOCK_CANDIDATE',
    'ALREADY_COVERED_ACTIVE_SEAT',
    'P8_CLASSIFIED_NON_SELECTABLE_OR_LABEL_REQUIRED',
    'FLOATING_POLYGON_RISK',
    'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT',
    'P9 scans the 4096 operator reference image components and compares them with the current active selectable polygons.',
    "operatorDecision: 'PENDING'",
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p9-missing-scan-packet-ready',
    'p9-missing-scan-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P9_MISSING_SCAN_SOURCE.includes(requiredText),
      `Daegu operator reference P9 missing scan flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P10 candidate classification flow는 현재 P9 누락 후보를 P11 후보와 review row로 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p10-candidate-classification-packet',
    'stadium:daegu:operator-reference-p10-candidate-classification-gate',
    'stadium:daegu:operator-reference-p10-candidate-classification-gate:require-classified',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'LABEL_VISIBLE_SEAT_BLOCK',
    'UNLABELED_SEAT_STRIP_REVIEW',
    'MARKER_OR_ACCESSIBILITY_REVIEW',
    'FACILITY_OR_NON_SEAT',
    'LEGEND_OR_DECORATION',
    'MERGE_WITH_EXISTING_REVIEW',
    'P11_PROMOTION_CANDIDATE',
    'PENDING_OPERATOR_LABEL',
    'ADD_TO_OPERATOR_REFERENCE_DATASET is forbidden in P10.',
    'P10 classifies the current P9 missing candidates from image crop evidence. It does not add selectable seat polygons.',
    "operatorDecision: 'PENDING'",
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p10-candidate-classification-packet-ready',
    'p10-candidate-classification-gate-passed',
    'daegu-operator-reference-p11-promotion-candidates.json',
    'RAPAK_REF_155',
    'SKY 지정석 S-4',
    'RAPAK_REF_187',
    'SKY요기보존',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P10_CANDIDATE_CLASSIFICATION_SOURCE.includes(requiredText),
      `Daegu operator reference P10 classification flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P11 approval packet flow는 P10 승격 후보 22개의 승인 입력 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p11-approval-packet',
    'stadium:daegu:operator-reference-p11-approval-gate',
    'stadium:daegu:operator-reference-p11-approval-gate:require-ready',
    'stadium:daegu:operator-reference-p11-approval-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P11 builds an approval packet from P10 label-visible missing candidates. It does not add selectable seat polygons.',
    'P11 uses sourceDraftVisualPath/sourceDraftHitPath from the image component scan as draft evidence only.',
    'ADD_TO_OPERATOR_REFERENCE_DATASET',
    "operatorDecision: 'PENDING'",
    'correctedPath',
    'correctedHitPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'p11-approval-packet-ready',
    'p11-approval-gate-waiting-for-operator-input',
    'p11-approval-gate-dry-run-ready',
    'daegu-operator-reference-p11-approval-packet.json',
    'daegu-operator-reference-p11-operator-input.json',
    'daegu-operator-reference-p11-dry-run-apply-plan.json',
    'RAPAK_REF_011',
    '루프탑 테이블석',
    'RAPAK_REF_187',
    'SKY요기보존',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P11_APPROVAL_PACKET_SOURCE.includes(requiredText),
      `Daegu operator reference P11 approval packet flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P12 dry-run apply flow는 승인 row 없을 때 source patch를 차단한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p12-dry-run-plan',
    'stadium:daegu:operator-reference-p12-dry-run-gate',
    'stadium:daegu:operator-reference-p12-dry-run-gate:require-ready',
    'stadium:daegu:operator-reference-p12-dry-run-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P12 reads only P11 operator input rows and creates a dry-run apply plan.',
    'P12 does not write src/data/daeguSeatData.ts.',
    'readyForSourcePatch=false when approvedRows=0',
    'ADD_TO_OPERATOR_REFERENCE_DATASET',
    'OPERATOR_DECISION_NOT_APPROVED',
    'MISSING_CORRECTED_PATH',
    'MISSING_CORRECTED_HIT_PATH',
    'MISSING_CORRECTED_LABEL_X',
    'MISSING_CORRECTED_LABEL_Y',
    'MISSING_REVIEWER',
    'MISSING_REVIEWED_AT',
    'DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK',
    'DAEGU_OPERATOR_REFERENCE_P11_APPROVED_DRY_RUN_V1',
    'p12-dry-run-apply-plan-ready',
    'p12-dry-run-apply-gate-waiting-for-operator-approval',
    'p12-dry-run-apply-gate-source-patch-ready',
    'daegu-operator-reference-p12-dry-run-apply-plan.json',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P12_DRY_RUN_APPLY_SOURCE.includes(requiredText),
      `Daegu operator reference P12 dry-run apply flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P13 source apply flow는 승인 row 없을 때 source write를 차단한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p13-source-apply-plan',
    'stadium:daegu:operator-reference-p13-source-apply-gate',
    'stadium:daegu:operator-reference-p13-source-apply-gate:require-ready',
    'stadium:daegu:operator-reference-p13-source-apply-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P13 reads the P12 dry-run apply plan and gates source application.',
    'P13 does not write src/data/daeguSeatData.ts.',
    'readyForSourceWrite=false when P12 readyForSourcePatch=false',
    'DAEGU_OPERATOR_REFERENCE_BLOCKS',
    'DAEGU_OPERATOR_REFERENCE_P11_BLOCK_ROWS',
    'DAEGU_OPERATOR_REFERENCE_P11_APPROVED_DRY_RUN_V1',
    'p13-source-apply-plan-ready',
    'p13-source-apply-gate-waiting-for-approved-rows',
    'p13-source-apply-gate-source-write-ready',
    'p13-source-apply-gate-blocked',
    'daegu-operator-reference-p13-source-apply-plan.json',
    'currentSelectableRows',
    'projectedSelectableRows',
    'readyForSourceWrite',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P13_SOURCE_APPLY_SOURCE.includes(requiredText),
      `Daegu operator reference P13 source apply flow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P14 review workflow는 P11 후보 22개를 검수 그룹으로 재정렬한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p14-review-packet',
    'stadium:daegu:operator-reference-p14-review-gate',
    'stadium:daegu:operator-reference-p14-review-gate:require-ready',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P14 reorganizes the 22 P11 approval candidates into operator review groups.',
    'P14 does not auto-fill correctedPath or correctedHitPath.',
    'SPECIAL_ZONE_REVIEW',
    'SKY_LOWER_SEQUENCE_REVIEW',
    'draftPathRecommendedAsStartingPoint',
    'draftLabelRecommendedAsStartingPoint',
    'operatorAction',
    'approvalChecklist',
    "operatorDecision: 'PENDING'",
    "correctedPath: ''",
    "correctedHitPath: ''",
    'p14-review-packet-ready',
    'p14-review-gate-ready',
    'p14-special-zone-overlay.svg',
    'p14-sky-lower-overlay.svg',
    'p14-review-checklist.md',
    'currentSelectableRows=109',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P14_REVIEW_WORKFLOW_SOURCE.includes(requiredText),
      `Daegu operator reference P14 review workflow should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P27 canonical approval write는 P21 템플릿 1건만 승인 반영한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p27-canonical-approval-plan',
    'stadium:daegu:operator-reference-p27-canonical-approval-gate',
    'stadium:daegu:operator-reference-p27-canonical-approval-gate:require-ready',
    'stadium:daegu:operator-reference-p27-canonical-approval-write',
    'stadium:daegu:operator-reference-p27-canonical-approval-postwrite',
    'stadium:daegu:operator-reference-p27-canonical-approval-postwrite:require-applied',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P27 reads P26 approval input preview and writes only the P21 operator approval template.',
    'P27 changes only operatorDecision, reviewer, reviewedAt on RAPAK_REF_011.',
    'P27 does not modify reports/stadium/daegu-operator-reference-p14-review-workflow/operator-input/daegu-operator-reference-p14-review-input.json.',
    'P27 does not modify reports/stadium/daegu-operator-reference-p26-approval-input-preview/daegu-operator-reference-p26-approval-input-preview.json.',
    'P27 does not write src/data/daeguSeatData.ts.',
    'RAPAK_REF_011',
    'operatorDecision=APPROVED',
    'reviewer=codex-image-review',
    'reviewedAt=2026-05-24T23:15:00+09:00',
    'CANONICAL_APPROVAL_TEMPLATE_WRITE_ONLY',
    'P26_PREVIEW_READY',
    'P26_PREVIEW_APPROVED_ONE_ROW',
    'TARGET_ROW_MATCHES_RAPAK_REF_011',
    'P21_TEMPLATE_HAS_22_ROWS',
    'P21_TEMPLATE_TARGET_PENDING_OR_ALREADY_APPLIED',
    'CANONICAL_WRITE_CHANGES_APPROVAL_METADATA_ONLY',
    'OTHER_ROWS_REMAIN_PENDING',
    'CORRECTED_GEOMETRY_UNCHANGED',
    'P14_OPERATOR_INPUT_UNCHANGED',
    'P26_PREVIEW_UNCHANGED',
    'SOURCE_WRITE_BLOCKED',
    'PRODUCTION_WRITE_BLOCKED',
    'p27-canonical-approval-write-ready',
    'p27-canonical-approval-write-already-applied',
    'p27-canonical-approval-write-blocked',
    'p27-canonical-approval-write-gate-ready',
    'p27-canonical-approval-write-gate-already-applied',
    'p27-canonical-approval-write-gate-blocked',
    'p27-canonical-approval-write-applied',
    'p27-canonical-approval-write-noop-already-applied',
    'p27-canonical-approval-postwrite-applied',
    'daegu-operator-reference-p27-canonical-approval-write-plan.json',
    'daegu-operator-reference-p27-canonical-approval-template-candidate.json',
    'daegu-operator-reference-p27-canonical-approval-write.patch.txt',
    'approvedRows=1',
    'pendingRows=21',
    'canonicalApprovalTemplateWritePerformed: true',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
    'p14OperatorInputWritePerformed: false',
    'p26PreviewWritePerformed: false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P27_CANONICAL_APPROVAL_WRITE_SOURCE.includes(requiredText),
      `Daegu operator reference P27 canonical approval write should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P28 source patch preview는 승인 row 1건만 source patch 후보로 만든다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p28-source-patch-preview',
    'stadium:daegu:operator-reference-p28-source-patch-preview-gate',
    'stadium:daegu:operator-reference-p28-source-patch-preview-gate:require-ready',
    'stadium:daegu:operator-reference-p28-source-patch-preview-gate:require-approved',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P28 reads P21 canonical approved rows and creates source patch preview only.',
    'P28 requires P27 canonical approval postwrite to be applied.',
    'P28 uses only operatorDecision=APPROVED rows from P21.',
    'P28 excludes the remaining 21 PENDING rows from sourcePatchRows.',
    'P28 does not write src/data/daeguSeatData.ts.',
    'RAPAK_REF_011',
    '루프탑 테이블석',
    'ADD_TO_OPERATOR_REFERENCE_DATASET',
    'DAEGU_OPERATOR_REFERENCE_P28_APPROVED_DRY_RUN_V1',
    'DAEGU_OPERATOR_REFERENCE_P28_BLOCK_ROWS',
    'OPERATOR_REFERENCE_P28_REVIEW_NOTE',
    'createOperatorReferenceApprovedBlockWithTrace',
    'P27_POSTWRITE_APPLIED',
    'P21_APPROVED_ROWS_ONE',
    'PENDING_ROWS_EXCLUDED_FROM_SOURCE_PATCH',
    'NO_DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK',
    'APPROVED_ROW_GEOMETRY_VALID',
    'APPROVED_ROW_LABEL_TOP_HIT_VALID',
    'SOURCE_PATCH_PREVIEW_ONLY',
    'SOURCE_WRITE_BLOCKED',
    'PRODUCTION_WRITE_BLOCKED',
    'readyForSourcePatch=true',
    'p28-source-patch-preview-ready',
    'p28-source-patch-preview-blocked',
    'p28-source-patch-preview-gate-ready',
    'p28-source-patch-preview-gate-blocked',
    'daegu-operator-reference-p28-source-patch-preview.json',
    'daegu-operator-reference-p28-approved-block-rows.json',
    'daegu-operator-reference-p28-source-patch-preview.patch.txt',
    'approvedRows=1',
    'pendingRows=21',
    'sourcePatchRows=1',
    'currentSelectableRows=109',
    'projectedSelectableRows=110',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P28_SOURCE_PATCH_PREVIEW_SOURCE.includes(requiredText),
      `Daegu operator reference P28 source patch preview should include ${requiredText}`,
    );
  });
});

test('대구 operator reference P29 source postwrite는 P28 승인 row 1건만 source에 반영된 상태를 검증한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const targetBlock = DAEGU_OPERATOR_REFERENCE_BLOCKS.find((block) => block.id === 'daegu-operator-reference-rooftop-table');

  [
    'stadium:daegu:operator-reference-p29-source-postwrite',
    'stadium:daegu:operator-reference-p29-source-postwrite:require-applied',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P29 verifies that the P28 approved row was applied to src/data/daeguSeatData.ts.',
    'P29 source write applies only RAPAK_REF_011.',
    'P29 keeps the 21 pending P21 rows out of DAEGU_OPERATOR_REFERENCE_BLOCKS.',
    'RAPAK_REF_011',
    '루프탑 테이블석',
    'daegu-operator-reference-rooftop-table',
    'DAEGU_OPERATOR_REFERENCE_P28_APPROVED_DRY_RUN_V1',
    'DAEGU_SAMSUNG_LIONS_PARK_2025_OPERATOR_REFERENCE_P28_APPROVED_V1',
    'P28_SOURCE_PATCH_PREVIEW_READY',
    'P28_APPROVED_ROWS_JSON_ONE',
    'APPROVED_BLOCK_SOURCE_APPLIED',
    'CURRENT_SELECTABLE_ROWS_110',
    'TARGET_BLOCK_SELECTABLE',
    'TARGET_TRACE_VERSION_P28',
    'TARGET_GEOMETRY_VALID',
    'TARGET_LABEL_TOP_HIT_VALID',
    'PENDING_21_ROWS_NOT_APPLIED',
    'OFFICIAL_DATASET_STAYS_177',
    'SOURCE_DATA_WRITE_PERFORMED',
    'PRODUCTION_WRITE_BLOCKED',
    'p29-source-postwrite-applied',
    'p29-source-postwrite-blocked',
    'daegu-operator-reference-p29-source-postwrite.json',
    'approvedRows=1',
    'pendingRows=21',
    'currentSelectableRows=110',
    'sourceDataWritePerformed=true',
    'productionWriteAllowed=false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P29_SOURCE_POSTWRITE_SOURCE.includes(requiredText),
      `Daegu operator reference P29 source postwrite should include ${requiredText}`,
    );
  });

  assert.ok(targetBlock, '루프탑 테이블석 should be present in the operator reference source dataset');
  assert.equal(targetBlock.name, '루프탑 테이블석');
  assert.equal(targetBlock.block, '루프탑');
  assert.equal(targetBlock.imageGeometry.geometryVersion, 'DAEGU_OPERATOR_REFERENCE_P28_APPROVED_DRY_RUN_V1');
  assert.equal(targetBlock.imageGeometry.traceVersion, 'DAEGU_OPERATOR_REFERENCE_P28_APPROVED_DRY_RUN_V1');
  assert.equal(targetBlock.imageGeometry.traceSource, 'OPERATOR_REFERENCE_RAPAK_2025');
  assert.equal(isDaeguOperatorReferenceSelectableSeat(targetBlock), true);
});

test('대구 operator reference P30 special zone source apply는 특수/대형 4개 row만 승인 반영한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const targetBlocks = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter((block) => (
    ['파티플로어', '잔디석', 'IM뱅크 캠핑존', 'SKY요기보존'].includes(block.block)
  ));

  [
    'stadium:daegu:operator-reference-p30-special-zone-approval-write',
    'stadium:daegu:operator-reference-p30-special-zone-postwrite',
    'stadium:daegu:operator-reference-p30-special-zone-postwrite:require-applied',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P30 approves only four special/large-zone P21 rows.',
    'P30 source write applies RAPAK_REF_054, RAPAK_REF_057, RAPAK_REF_058, RAPAK_REF_187 only.',
    'P30 keeps the remaining 17 SKY S-4~S-20 rows pending.',
    'RAPAK_REF_054',
    'RAPAK_REF_057',
    'RAPAK_REF_058',
    'RAPAK_REF_187',
    '파티플로어석',
    '잔디석',
    'IM뱅크 캠핑존',
    'SKY요기보존',
    'DAEGU_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_APPROVED_V1',
    'DAEGU_SAMSUNG_LIONS_PARK_2025_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_APPROVED_V1',
    'P21_APPROVED_ROWS_FIVE',
    'P21_PENDING_ROWS_SEVENTEEN',
    'TARGET_FOUR_ROWS_APPROVED',
    'APPROVED_FOUR_BLOCKS_SOURCE_APPLIED',
    'CURRENT_SELECTABLE_ROWS_114',
    'TARGET_GEOMETRY_VALID',
    'TARGET_LABEL_TOP_HIT_VALID',
    'PENDING_17_ROWS_NOT_APPLIED',
    'OFFICIAL_DATASET_STAYS_177',
    'SOURCE_DATA_WRITE_PERFORMED',
    'PRODUCTION_WRITE_BLOCKED',
    'p30-special-zone-approval-write-applied',
    'p30-special-zone-approval-write-noop-already-applied',
    'p30-special-zone-approval-write-blocked',
    'p30-special-zone-postwrite-applied',
    'p30-special-zone-postwrite-blocked',
    'daegu-operator-reference-p30-special-zone-approval-write.json',
    'daegu-operator-reference-p30-special-zone-postwrite.json',
    'approvedRows=5',
    'pendingRows=17',
    'targetApprovedRows=4',
    'currentSelectableRows=114',
    'sourceDataWritePerformed=true',
    'productionWriteAllowed=false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_SOURCE.includes(requiredText),
      `Daegu operator reference P30 special zone source apply should include ${requiredText}`,
    );
  });

  assert.equal(targetBlocks.length, 4);
  targetBlocks.forEach((block) => {
    assert.equal(block.imageGeometry.geometryVersion, 'DAEGU_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_APPROVED_V1');
    assert.equal(block.imageGeometry.traceVersion, 'DAEGU_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_APPROVED_V1');
    assert.equal(block.imageGeometry.traceSource, 'OPERATOR_REFERENCE_RAPAK_2025');
    assert.equal(isDaeguOperatorReferenceSelectableSeat(block), true);
  });
});

test('대구 operator reference P31-A SKY first-base source apply는 S-4~S-10 7개 row만 승인 반영한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const targetBlocks = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter((block) => (
    ['S-4', 'S-5', 'S-6', 'S-7', 'S-8', 'S-9', 'S-10'].includes(block.block)
  ));

  [
    'stadium:daegu:operator-reference-p31-sky-first-base-approval-write',
    'stadium:daegu:operator-reference-p31-sky-first-base-postwrite',
    'stadium:daegu:operator-reference-p31-sky-first-base-postwrite:require-applied',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P31-A approves seven SKY S-4~S-10 P21 rows.',
    'P31-A source write applies RAPAK_REF_155, RAPAK_REF_160, RAPAK_REF_164, RAPAK_REF_168, RAPAK_REF_172, RAPAK_REF_176, RAPAK_REF_186 only.',
    'P31-A keeps the remaining 10 SKY S-11~S-20 rows pending.',
    'RAPAK_REF_155',
    'RAPAK_REF_160',
    'RAPAK_REF_164',
    'RAPAK_REF_168',
    'RAPAK_REF_172',
    'RAPAK_REF_176',
    'RAPAK_REF_186',
    'SKY 하단 지정석 S-4',
    'SKY 하단 지정석 S-10',
    'DAEGU_OPERATOR_REFERENCE_P31_SKY_FIRST_BASE_APPROVED_V1',
    'DAEGU_SAMSUNG_LIONS_PARK_2025_OPERATOR_REFERENCE_P31_SKY_FIRST_BASE_APPROVED_V1',
    'P21_APPROVED_ROWS_TWELVE',
    'P21_PENDING_ROWS_TEN',
    'TARGET_SEVEN_ROWS_APPROVED',
    'APPROVED_SEVEN_BLOCKS_SOURCE_APPLIED',
    'CURRENT_SELECTABLE_ROWS_121',
    'TARGET_GEOMETRY_VALID',
    'TARGET_LABEL_TOP_HIT_VALID',
    'PENDING_10_ROWS_NOT_APPLIED',
    'OFFICIAL_DATASET_STAYS_177',
    'SOURCE_DATA_WRITE_PERFORMED',
    'PRODUCTION_WRITE_BLOCKED',
    'p31-sky-first-base-approval-write-applied',
    'p31-sky-first-base-approval-write-noop-already-applied',
    'p31-sky-first-base-approval-write-blocked',
    'p31-sky-first-base-postwrite-applied',
    'p31-sky-first-base-postwrite-blocked',
    'daegu-operator-reference-p31-sky-first-base-approval-write.json',
    'daegu-operator-reference-p31-sky-first-base-postwrite.json',
    'approvedRows=12',
    'pendingRows=10',
    'targetApprovedRows=7',
    'currentSelectableRows=121',
    'sourceDataWritePerformed=true',
    'productionWriteAllowed=false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P31_SKY_FIRST_BASE_SOURCE.includes(requiredText),
      `Daegu operator reference P31-A SKY first-base source apply should include ${requiredText}`,
    );
  });

  assert.equal(targetBlocks.length, 7);
  targetBlocks.forEach((block) => {
    assert.equal(block.imageGeometry.geometryVersion, 'DAEGU_OPERATOR_REFERENCE_P31_SKY_FIRST_BASE_APPROVED_V1');
    assert.equal(block.imageGeometry.traceVersion, 'DAEGU_OPERATOR_REFERENCE_P31_SKY_FIRST_BASE_APPROVED_V1');
    assert.equal(block.imageGeometry.traceSource, 'OPERATOR_REFERENCE_RAPAK_2025');
    assert.equal(isDaeguOperatorReferenceSelectableSeat(block), true);
  });
});

test('대구 operator reference P31-B SKY center source apply는 S-11~S-15 5개 row만 승인 반영한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const targetBlocks = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter((block) => (
    ['S-11', 'S-12', 'S-13', 'S-14', 'S-15'].includes(block.block)
  ));

  [
    'stadium:daegu:operator-reference-p31-sky-center-approval-write',
    'stadium:daegu:operator-reference-p31-sky-center-postwrite',
    'stadium:daegu:operator-reference-p31-sky-center-postwrite:require-applied',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P31-B approves five SKY S-11~S-15 P21 rows.',
    'P31-B source write applies RAPAK_REF_185, RAPAK_REF_184, RAPAK_REF_183, RAPAK_REF_182, RAPAK_REF_175 only.',
    'P31-B keeps the remaining 5 SKY S-16~S-20 rows pending.',
    'RAPAK_REF_185',
    'RAPAK_REF_184',
    'RAPAK_REF_183',
    'RAPAK_REF_182',
    'RAPAK_REF_175',
    'SKY 하단 지정석 S-11',
    'SKY 하단 지정석 S-15',
    'DAEGU_OPERATOR_REFERENCE_P31_SKY_CENTER_APPROVED_V1',
    'DAEGU_SAMSUNG_LIONS_PARK_2025_OPERATOR_REFERENCE_P31_SKY_CENTER_APPROVED_V1',
    'P21_APPROVED_ROWS_SEVENTEEN',
    'P21_PENDING_ROWS_FIVE',
    'TARGET_FIVE_ROWS_APPROVED',
    'APPROVED_FIVE_BLOCKS_SOURCE_APPLIED',
    'CURRENT_SELECTABLE_ROWS_126',
    'TARGET_GEOMETRY_VALID',
    'TARGET_LABEL_TOP_HIT_VALID',
    'PENDING_5_ROWS_NOT_APPLIED',
    'OFFICIAL_DATASET_STAYS_177',
    'SOURCE_DATA_WRITE_PERFORMED',
    'PRODUCTION_WRITE_BLOCKED',
    'p31-sky-center-approval-write-applied',
    'p31-sky-center-approval-write-noop-already-applied',
    'p31-sky-center-approval-write-blocked',
    'p31-sky-center-postwrite-applied',
    'p31-sky-center-postwrite-blocked',
    'daegu-operator-reference-p31-sky-center-approval-write.json',
    'daegu-operator-reference-p31-sky-center-postwrite.json',
    'approvedRows=17',
    'pendingRows=5',
    'targetApprovedRows=5',
    'currentSelectableRows=126',
    'sourceDataWritePerformed=true',
    'productionWriteAllowed=false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P31_SKY_CENTER_SOURCE.includes(requiredText),
      `Daegu operator reference P31-B SKY center source apply should include ${requiredText}`,
    );
  });

  assert.equal(targetBlocks.length, 5);
  targetBlocks.forEach((block) => {
    assert.equal(block.imageGeometry.geometryVersion, 'DAEGU_OPERATOR_REFERENCE_P31_SKY_CENTER_APPROVED_V1');
    assert.equal(block.imageGeometry.traceVersion, 'DAEGU_OPERATOR_REFERENCE_P31_SKY_CENTER_APPROVED_V1');
    assert.equal(block.imageGeometry.traceSource, 'OPERATOR_REFERENCE_RAPAK_2025');
    assert.equal(isDaeguOperatorReferenceSelectableSeat(block), true);
  });
});

test('대구 operator reference P31-C SKY third-base source apply는 S-16~S-20 5개 row만 승인 반영한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const targetBlocks = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter((block) => (
    ['S-16', 'S-17', 'S-18', 'S-19', 'S-20'].includes(block.block)
  ));

  [
    'stadium:daegu:operator-reference-p31-sky-third-base-approval-write',
    'stadium:daegu:operator-reference-p31-sky-third-base-postwrite',
    'stadium:daegu:operator-reference-p31-sky-third-base-postwrite:require-applied',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P31-C approves five SKY S-16~S-20 P21 rows.',
    'P31-C source write applies RAPAK_REF_171, RAPAK_REF_167, RAPAK_REF_163, RAPAK_REF_159, RAPAK_REF_156 only.',
    'P31-C clears all remaining SKY S-16~S-20 pending rows.',
    'RAPAK_REF_171',
    'RAPAK_REF_167',
    'RAPAK_REF_163',
    'RAPAK_REF_159',
    'RAPAK_REF_156',
    'SKY 하단 지정석 S-16',
    'SKY 하단 지정석 S-20',
    'DAEGU_OPERATOR_REFERENCE_P31_SKY_THIRD_BASE_APPROVED_V1',
    'DAEGU_SAMSUNG_LIONS_PARK_2025_OPERATOR_REFERENCE_P31_SKY_THIRD_BASE_APPROVED_V1',
    'P21_APPROVED_ROWS_TWENTY_TWO',
    'P21_PENDING_ROWS_ZERO',
    'TARGET_FIVE_ROWS_APPROVED',
    'APPROVED_FIVE_BLOCKS_SOURCE_APPLIED',
    'CURRENT_SELECTABLE_ROWS_131',
    'TARGET_GEOMETRY_VALID',
    'TARGET_LABEL_TOP_HIT_VALID',
    'NO_PENDING_ROWS_LEFT',
    'OFFICIAL_DATASET_STAYS_177',
    'SOURCE_DATA_WRITE_PERFORMED',
    'PRODUCTION_WRITE_BLOCKED',
    'p31-sky-third-base-approval-write-applied',
    'p31-sky-third-base-approval-write-noop-already-applied',
    'p31-sky-third-base-approval-write-blocked',
    'p31-sky-third-base-postwrite-applied',
    'p31-sky-third-base-postwrite-blocked',
    'daegu-operator-reference-p31-sky-third-base-approval-write.json',
    'daegu-operator-reference-p31-sky-third-base-postwrite.json',
    'approvedRows=22',
    'pendingRows=0',
    'targetApprovedRows=5',
    'currentSelectableRows=131',
    'sourceDataWritePerformed=true',
    'productionWriteAllowed=false',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P31_SKY_THIRD_BASE_SOURCE.includes(requiredText),
      `Daegu operator reference P31-C SKY third-base source apply should include ${requiredText}`,
    );
  });

  assert.equal(targetBlocks.length, 5);
  targetBlocks.forEach((block) => {
    assert.equal(block.imageGeometry.geometryVersion, 'DAEGU_OPERATOR_REFERENCE_P31_SKY_THIRD_BASE_APPROVED_V1');
    assert.equal(block.imageGeometry.traceVersion, 'DAEGU_OPERATOR_REFERENCE_P31_SKY_THIRD_BASE_APPROVED_V1');
    assert.equal(block.imageGeometry.traceSource, 'OPERATOR_REFERENCE_RAPAK_2025');
    assert.equal(isDaeguOperatorReferenceSelectableSeat(block), true);
  });
});

test('대구 operator reference P32 post-P31 audit는 남은 image component 분류 상태를 source write 없이 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p32-post-p31-audit',
    'stadium:daegu:operator-reference-p32-post-p31-audit-gate',
    'stadium:daegu:operator-reference-p32-post-p31-audit-gate:require-classified',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P32 consolidates the post-P31 P9/P10 image-component evidence.',
    'POST_P31_REVIEW_ONLY_STRIP',
    'POST_P31_DUPLICATE_OR_STRIP_REVIEW',
    'POST_P31_NON_SEAT_COMPONENT',
    'POST_P31_NEXT_BATCH_CANDIDATE',
    'NO_LABEL_VISIBLE_SEAT_CANDIDATES_LEFT_AFTER_P31',
    'DAEGU_OPERATOR_REFERENCE_BLOCKS',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p32-post-p31-audit-ready',
    'p32-post-p31-audit-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P32_POST_P31_AUDIT_SOURCE.includes(requiredText),
      `Daegu operator reference P32 post-P31 audit should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P33 label coverage audit는 이미지 visible seat label 131개 커버리지를 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p33-label-coverage-audit',
    'stadium:daegu:operator-reference-p33-label-coverage-audit-gate',
    'stadium:daegu:operator-reference-p33-label-coverage-audit-gate:require-covered',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P33 transcribes visible seat labels from the 4096 operator reference image and compares them with DAEGU_OPERATOR_REFERENCE_BLOCKS.',
    'VISIBLE_SEAT_LABEL_ACTIVE',
    'MISSING_LABEL_BLOCK',
    'GROUP_LABEL_ONLY',
    'NON_SEAT_LABEL',
    'EXPECTED_VISIBLE_SEAT_LABELS_131',
    'NO_MISSING_VISIBLE_SEAT_LABELS',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p33-label-coverage-audit-ready',
    'p33-label-coverage-audit-gate-passed',
    'OUTFIELD_TABLE_TOP_RIGHT',
    'OUTFIELD_RESERVED_RIGHT',
    'OUTFIELD_MINI_TABLE_RIGHT',
    'OUTFIELD_RESERVED_LEFT',
    'OUTFIELD_MINI_TABLE_LEFT',
    'SKY_YOGIBO',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P33_LABEL_COVERAGE_AUDIT_SOURCE.includes(requiredText),
      `Daegu operator reference P33 label coverage audit should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P34 visual match audit는 131개 selectable polygon별 overlay evidence 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p34-visual-match-audit',
    'stadium:daegu:operator-reference-p34-visual-match-audit-gate',
    'stadium:daegu:operator-reference-p34-visual-match-audit-gate:require-audited',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P34 audits all 131 operator-reference selectable polygons against the 4096 image component scan.',
    'PASS_VISUAL_MATCH_CANDIDATE',
    'LOW_COLOR_COVERAGE',
    'OVERLAP_REVIEW_REQUIRED',
    'LABEL_POINT_OUTSIDE',
    'HITPATH_TOO_LARGE',
    'BOUNDS_OR_SELF_INTERSECTION_INVALID',
    'MANUAL_RETRACE_REQUIRED',
    'PASS_VISUAL_MATCH_FORBIDDEN_WHILE_BLOCKERS_REMAIN',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p34-visual-match-audit-ready',
    'p34-visual-match-audit-gate-passed',
    'block-crops',
    'daegu-operator-reference-p34-visual-match-overlay.png',
    'daegu-operator-reference-p34-risk-contact-sheet.png',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P34_VISUAL_MATCH_AUDIT_SOURCE.includes(requiredText),
      `Daegu operator reference P34 visual match audit should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P35 review lock audit는 131개 evidence와 187개 component disposition 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p35-review-lock-audit',
    'stadium:daegu:operator-reference-p35-review-lock-audit-gate',
    'stadium:daegu:operator-reference-p35-review-lock-audit-gate:require-evidence',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P35 locks P34 crop/overlay evidence and component disposition before any release wording.',
    'AUTO_VISUAL_MATCH_READY',
    'OPERATOR_VISUAL_REVIEW_PENDING',
    'OPERATOR_VISUAL_REVIEW_NOT_COMPLETE',
    'SELECTABLE_COMPONENT_EVIDENCE',
    'SELECTABLE_COMPONENT_SHARED_OR_MERGED',
    'P32_REVIEW_ONLY_COMPONENT',
    'P8_NON_SELECTABLE_OR_LABEL_REQUIRED',
    'ALL_187_COMPONENTS_DISPOSITIONED',
    'PASS_RELEASE_177_FORBIDDEN',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p35-review-lock-audit-ready',
    'p35-review-lock-audit-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P35_REVIEW_LOCK_AUDIT_SOURCE.includes(requiredText),
      `Daegu operator reference P35 review lock audit should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P36 review template은 131개 crop evidence operator 승인 입력 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p36-review-template',
    'stadium:daegu:operator-reference-p36-review-gate',
    'stadium:daegu:operator-reference-p36-review-gate:require-template',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P36 creates an operator visual review template from 131 P35 evidence rows.',
    'OPERATOR_DECISION_PENDING',
    'APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT',
    'APPROVED_REQUIRES_REVIEW_NOTE',
    'REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION',
    'PENDING_ROWS_BLOCK_RELEASE_LOCK',
    'OPERATOR_REVIEW_TEMPLATE_ROWS_131',
    'RELEASE_LOCK_CANDIDATE_REQUIRES_131_APPROVED_ROWS',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p36-review-template-ready',
    'p36-review-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P36_REVIEW_TEMPLATE_SOURCE.includes(requiredText),
      `Daegu operator reference P36 review template should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P37 review status는 operator 승인 결과와 release lock 후보 상태를 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p37-review-status',
    'stadium:daegu:operator-reference-p37-review-status-gate',
    'stadium:daegu:operator-reference-p37-review-status-gate:require-status',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P37 reads operator review decisions from the P36 CSV/JSON template and computes release-lock readiness.',
    'APPROVED_131_REQUIRED_FOR_RELEASE_LOCK',
    'REJECTED_ROWS_CREATE_RETRACE_BATCH',
    'PENDING_ROWS_KEEP_REVIEW_OPEN',
    'INVALID_OPERATOR_DECISION_BLOCKS_RELEASE_LOCK',
    'APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT',
    'REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION',
    'RELEASE_LOCK_ALLOWED_FALSE_UNTIL_ALL_APPROVED',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p37-review-status-ready',
    'p37-review-status-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P37_REVIEW_STATUS_SOURCE.includes(requiredText),
      `Daegu operator reference P37 review status should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P38 review input seed는 operator 입력 파일과 승인 샘플 fixture를 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p38-review-input-seed',
    'stadium:daegu:operator-reference-p38-review-input-seed-gate',
    'stadium:daegu:operator-reference-p38-review-input-seed-gate:require-seed',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P38 creates a separate operator input seed and sample fixtures without modifying P36 evidence.',
    'OPERATOR_INPUT_SEED_ROWS_131',
    'P37_REVIEW_INPUT_OVERRIDE_SUPPORTED',
    'VALID_APPROVED_SAMPLE_PASSES',
    'INVALID_APPROVED_SAMPLE_BLOCKED',
    'VALID_REJECTED_SAMPLE_CREATES_RETRACE_CANDIDATE',
    'INVALID_REJECTED_SAMPLE_BLOCKED',
    'OPERATOR_WRITABLE_COLUMNS_ONLY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p38-review-input-seed-ready',
    'p38-review-input-seed-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P38_REVIEW_INPUT_SEED_SOURCE.includes(requiredText),
      `Daegu operator reference P38 review input seed should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P39 review input status는 운영 input과 evidence immutable 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p39-review-input-status',
    'stadium:daegu:operator-reference-p39-review-input-status-gate',
    'stadium:daegu:operator-reference-p39-review-input-status-gate:require-status',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P39_OPERATOR_INPUT_STATUS_USES_EXTERNAL_REVIEW_INPUT',
    'OPERATOR_WRITABLE_COLUMNS_ONLY',
    'EVIDENCE_COLUMNS_IMMUTABLE',
    'SOURCE_WRITE_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'DAEGU_OPERATOR_REFERENCE_REVIEW_INPUT',
    'DAEGU_OPERATOR_REFERENCE_P37_REVIEW_INPUT',
    'P39_DEFAULT_OPERATOR_INPUT_IS_P38_SEED_CSV',
    'APPROVED_131_REQUIRED_FOR_RELEASE_LOCK',
    'REJECTED_ROWS_CREATE_RETRACE_BATCH',
    'PENDING_ROWS_KEEP_REVIEW_OPEN',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p39-review-input-status-ready',
    'p39-review-input-status-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P39_REVIEW_INPUT_STATUS_SOURCE.includes(requiredText),
      `Daegu operator reference P39 review input status should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P40 release lock preflight는 승인 미완료를 blocker로 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p40-release-lock-preflight',
    'stadium:daegu:operator-reference-p40-release-lock-preflight-gate',
    'stadium:daegu:operator-reference-p40-release-lock-preflight-gate:require-preflight',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P40_OPERATOR_REFERENCE_131_RELEASE_PREFLIGHT',
    'OPERATOR_REVIEW_PENDING_ROWS_BLOCK_RELEASE_LOCK',
    'APPROVED_131_REJECTED_0_PENDING_0_REQUIRED',
    'IMMUTABLE_CHANGES_BLOCK_RELEASE_LOCK',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'P40_READS_P39_REVIEW_INPUT_STATUS',
    'P40_PREFLIGHT_DOES_NOT_WRITE_SOURCE_DATA',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p40-release-lock-preflight-ready',
    'p40-release-lock-preflight-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P40_RELEASE_LOCK_PREFLIGHT_SOURCE.includes(requiredText),
      `Daegu operator reference P40 release lock preflight should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P41 review handoff는 pending 131개를 구역별 operator 큐로 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p41-review-handoff',
    'stadium:daegu:operator-reference-p41-review-handoff-gate',
    'stadium:daegu:operator-reference-p41-review-handoff-gate:require-handoff',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P41_OPERATOR_REVIEW_HANDOFF_FROM_P40_BLOCKERS',
    'PENDING_131_ROWS_SPLIT_BY_REVIEW_ZONE',
    'OPERATOR_WRITABLE_COLUMNS_ONLY',
    'EVIDENCE_LINKS_PRESERVED',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'P41_HANDOFF_DOES_NOT_APPROVE_ROWS',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p41-review-handoff-ready',
    'p41-review-handoff-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P41_REVIEW_HANDOFF_SOURCE.includes(requiredText),
      `Daegu operator reference P41 review handoff should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P42 review intake는 operator 입력을 검증하고 source write를 차단한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p42-review-intake',
    'stadium:daegu:operator-reference-p42-review-intake-gate',
    'stadium:daegu:operator-reference-p42-review-intake-gate:require-intake',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P42_OPERATOR_REVIEW_INTAKE_FROM_P41_HANDOFF',
    'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
    'P42_DEFAULT_OPERATOR_INPUT_IS_P41_HANDOFF_CSV',
    'P41_ZONE_CSV_INPUT_SUPPORTED',
    'OPERATOR_WRITABLE_COLUMNS_ONLY',
    'EVIDENCE_COLUMNS_IMMUTABLE',
    'APPROVED_REQUIRES_REVIEWER_REVIEWED_AT_REVIEW_NOTE',
    'REJECTED_ROWS_CREATE_RETRACE_QUEUE',
    'PENDING_ROWS_KEEP_REVIEW_OPEN',
    'APPROVED_131_REJECTED_0_PENDING_0_REQUIRED_FOR_P43',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p42-review-intake-ready',
    'p42-review-intake-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INTAKE_SOURCE.includes(requiredText),
      `Daegu operator reference P42 review intake should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P43 release candidate preflight는 승인 완료 전 후보 승격을 차단한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p43-release-candidate-preflight',
    'stadium:daegu:operator-reference-p43-release-candidate-preflight-gate',
    'stadium:daegu:operator-reference-p43-release-candidate-preflight-gate:require-preflight',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P43_OPERATOR_REFERENCE_131_RELEASE_CANDIDATE_PREFLIGHT',
    'P43_READS_P42_REVIEW_INTAKE',
    'PENDING_ROWS_BLOCK_P43',
    'REJECTED_ROWS_REQUIRE_RETRACE',
    'INVALID_ROWS_BLOCK_P43',
    'IMMUTABLE_CHANGES_BLOCK_P43',
    'APPROVED_131_REQUIRED',
    'APPROVED_131_REJECTED_0_PENDING_0_REQUIRED_FOR_OPERATOR_REFERENCE_RELEASE',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'P43_PREFLIGHT_DOES_NOT_WRITE_SOURCE_DATA',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p43-release-candidate-preflight-ready',
    'p43-release-candidate-preflight-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P43_RELEASE_CANDIDATE_PREFLIGHT_SOURCE.includes(requiredText),
      `Daegu operator reference P43 release candidate preflight should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P44 decision fixtures는 승인/반려/오류/전체승인 경로를 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p44-decision-fixtures',
    'stadium:daegu:operator-reference-p44-decision-fixtures-gate',
    'stadium:daegu:operator-reference-p44-decision-fixtures-gate:require-fixtures',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P44_OPERATOR_DECISION_FIXTURES',
    'VALID_APPROVED_SAMPLE_PASSES_P42',
    'VALID_REJECTED_SAMPLE_CREATES_RETRACE_QUEUE',
    'INVALID_APPROVED_SAMPLE_BLOCKED',
    'INVALID_IMMUTABLE_CHANGE_SAMPLE_BLOCKED',
    'FULL_APPROVED_131_SAMPLE_ALLOWS_P43_CANDIDATE',
    'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
    'P43_CANDIDATE_ALLOWED_ONLY_FOR_FULL_APPROVED_131',
    'OPERATOR_WRITABLE_COLUMNS_ONLY',
    'EVIDENCE_COLUMNS_IMMUTABLE',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p44-decision-fixtures-ready',
    'p44-decision-fixtures-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P44_DECISION_FIXTURES_SOURCE.includes(requiredText),
      `Daegu operator reference P44 decision fixtures should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P45 real input guard는 fixture와 실제 operator 입력을 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p45-real-input-guard',
    'stadium:daegu:operator-reference-p45-real-input-guard-gate',
    'stadium:daegu:operator-reference-p45-real-input-guard-gate:require-real-input',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P45_REAL_OPERATOR_INPUT_GUARD',
    'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
    'P44_FIXTURE_INPUT_BLOCKED_FOR_RELEASE',
    'P45_DEFAULT_P41_HANDOFF_NOT_RELEASE_INPUT',
    'REAL_OPERATOR_INPUT_REQUIRED_FOR_P46',
    'INPUT_SHA256_RECORDED',
    'APPROVED_131_REQUIRED_FOR_P46',
    'PENDING_ROWS_KEEP_REVIEW_OPEN',
    'REJECTED_ROWS_REQUIRE_RETRACE',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p45-real-input-guard-ready',
    'p45-real-input-guard-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P45_REAL_INPUT_GUARD_SOURCE.includes(requiredText),
      `Daegu operator reference P45 real input guard should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P46 release input preflight는 실제 승인 입력 전 source write를 차단한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p46-release-input-preflight',
    'stadium:daegu:operator-reference-p46-release-input-preflight-gate',
    'stadium:daegu:operator-reference-p46-release-input-preflight-gate:require-preflight',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P46_RELEASE_INPUT_PREFLIGHT',
    'P45_REAL_OPERATOR_INPUT_GUARD',
    'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
    'REAL_OPERATOR_INPUT_REQUIRED',
    'APPROVED_131_REQUIRED',
    'REJECTED_0_REQUIRED',
    'PENDING_0_REQUIRED',
    'INVALID_0_REQUIRED',
    'IMMUTABLE_0_REQUIRED',
    'FIXTURE_INPUT_BLOCKED',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p46-release-input-preflight-ready',
    'p46-release-input-preflight-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P46_RELEASE_INPUT_PREFLIGHT_SOURCE.includes(requiredText),
      `Daegu operator reference P46 release input preflight should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P47 source apply preview는 release 후보 전 patch 생성을 차단한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p47-source-apply-preview',
    'stadium:daegu:operator-reference-p47-source-apply-preview-gate',
    'stadium:daegu:operator-reference-p47-source-apply-preview-gate:require-preview',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P47_SOURCE_APPLY_PREVIEW',
    'P46_RELEASE_INPUT_PREFLIGHT',
    'RELEASE_CANDIDATE_REQUIRED',
    'REAL_OPERATOR_INPUT_REQUIRED',
    'APPROVED_CANDIDATES_131_REQUIRED',
    'OPERATOR_REFERENCE_131_ONLY',
    'OFFICIAL_177_UNCHANGED',
    'FIXTURE_INPUT_BLOCKED',
    'PATCH_PREVIEW_ONLY',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p47-source-apply-preview-ready',
    'p47-source-apply-preview-blocked',
    'p47-source-apply-preview-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P47_SOURCE_APPLY_PREVIEW_SOURCE.includes(requiredText),
      `Daegu operator reference P47 source apply preview should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P48 source apply guard는 명시적 apply 전 source write를 차단한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p48-source-apply-guard',
    'stadium:daegu:operator-reference-p48-source-apply-guard-gate',
    'stadium:daegu:operator-reference-p48-source-apply-guard-gate:require-guard',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P48_SOURCE_APPLY_GUARD',
    'P47_SOURCE_APPLY_PREVIEW',
    'P47_SOURCE_PATCH_ALLOWED_REQUIRED',
    'SOURCE_PATCH_ROWS_131_REQUIRED',
    'REAL_OPERATOR_INPUT_REQUIRED',
    'SOURCE_TARGET_DAEGU_SEAT_DATA',
    'APPLY_READY_REQUIRES_OPERATOR_RELEASE',
    'WRITE_APPROVAL_REQUIRED',
    'SOURCE_WRITE_FORBIDDEN_UNTIL_EXPLICIT_APPLY',
    'PATCH_PREVIEW_ONLY',
    'OPERATOR_REFERENCE_131_ONLY',
    'OFFICIAL_177_UNCHANGED',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p48-source-apply-guard-ready',
    'p48-source-apply-guard-blocked',
    'p48-source-apply-guard-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P48_SOURCE_APPLY_GUARD_SOURCE.includes(requiredText),
      `Daegu operator reference P48 source apply guard should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P49 postwrite release audit는 source write 전 release lock을 차단한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p49-postwrite-release-audit',
    'stadium:daegu:operator-reference-p49-postwrite-release-audit-gate',
    'stadium:daegu:operator-reference-p49-postwrite-release-audit-gate:require-audit',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P49_POSTWRITE_RELEASE_AUDIT',
    'P48_SOURCE_APPLY_GUARD',
    'SOURCE_WRITE_REQUIRED_FOR_POSTWRITE',
    'OPERATOR_REFERENCE_131_REQUIRED',
    'OFFICIAL_177_UNCHANGED',
    'INPUT_SHA256_REQUIRED',
    'SOURCE_TARGET_DAEGU_SEAT_DATA',
    'RELEASE_LOCK_REQUIRES_POSTWRITE_AUDIT',
    'SOURCE_WRITE_AUDIT_ONLY',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'postwriteAuditReady=false',
    'releaseLockAllowed=false',
    'p49-postwrite-release-audit-ready',
    'p49-postwrite-release-audit-blocked',
    'p49-postwrite-release-audit-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P49_POSTWRITE_RELEASE_AUDIT_SOURCE.includes(requiredText),
      `Daegu operator reference P49 postwrite release audit should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P50 final review pack은 operator 입력용 131개 row를 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p50-final-review-pack',
    'stadium:daegu:operator-reference-p50-final-review-pack-gate',
    'stadium:daegu:operator-reference-p50-final-review-pack-gate:require-pack',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P50_FINAL_REVIEW_PACK',
    'P41_REVIEW_HANDOFF_ROWS_131',
    'P49_RELEASE_BLOCKERS_INCLUDED',
    'OPERATOR_WRITABLE_COLUMNS_ONLY',
    'IMMUTABLE_EVIDENCE_COLUMNS_PRESERVED',
    'ZONE_CSVS_GENERATED',
    'APPROVED_REQUIRES_CROP_OVERLAY_MATCH',
    'REJECTED_REQUIRES_RETRACE',
    'PENDING_BLOCKS_RELEASE',
    'REAL_OPERATOR_INPUT_NEXT_COMMAND',
    'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p50-final-review-pack-ready',
    'p50-final-review-pack-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P50_FINAL_REVIEW_PACK_SOURCE.includes(requiredText),
      `Daegu operator reference P50 final review pack should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P51 real review input은 operator 수정 파일을 P50 산출물과 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p51-real-review-input',
    'stadium:daegu:operator-reference-p51-real-review-input-gate',
    'stadium:daegu:operator-reference-p51-real-review-input-gate:require-input',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P51_REAL_REVIEW_INPUT',
    'P50_FINAL_REVIEW_PACK_SOURCE',
    'P51_REAL_INPUT_FILE_SEPARATED_FROM_P41_P50',
    'P51_OPERATOR_EDITABLE_FILE_NOT_OVERWRITTEN',
    'DAEGU_OPERATOR_REFERENCE_P51_REVIEW_INPUT',
    'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
    'OPERATOR_WRITABLE_COLUMNS_INCLUDE_CORRECTED_GEOMETRY',
    'APPROVED_REQUIRES_CORRECTED_PATH_LABEL_REVIEWER_REVIEWED_AT',
    'REJECTED_REQUIRES_RETRACE',
    'PENDING_ROWS_BLOCK_SOURCE_WRITE',
    'IMMUTABLE_EVIDENCE_COLUMNS_PRESERVED',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p51-real-review-input-ready',
    'p51-real-review-input-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P51_REAL_REVIEW_INPUT_SOURCE.includes(requiredText),
      `Daegu operator reference P51 real review input should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P52 source patch preview는 승인 row만 patch 후보로 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p52-source-patch-preview',
    'stadium:daegu:operator-reference-p52-source-patch-preview-gate',
    'stadium:daegu:operator-reference-p52-source-patch-preview-gate:require-preview',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P52_SOURCE_PATCH_PREVIEW',
    'P51_REAL_REVIEW_INPUT_SOURCE',
    'DAEGU_OPERATOR_REFERENCE_P51_REVIEW_INPUT',
    'APPROVED_ROWS_ONLY',
    'APPROVED_REQUIRES_CORRECTED_PATH_LABEL_REVIEWER_REVIEWED_AT',
    'PENDING_ROWS_BLOCK_SOURCE_WRITE',
    'REJECTED_ROWS_REQUIRE_RETRACE',
    'INVALID_ROWS_BLOCK_PREVIEW',
    'PATCH_PREVIEW_ONLY',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'sourcePatchAllowed=false',
    'p52-source-patch-preview-ready',
    'p52-source-patch-preview-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P52_SOURCE_PATCH_PREVIEW_SOURCE.includes(requiredText),
      `Daegu operator reference P52 source patch preview should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P53 source apply guard는 명시적 apply 전 source write를 차단한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p53-source-apply-guard',
    'stadium:daegu:operator-reference-p53-source-apply-guard-gate',
    'stadium:daegu:operator-reference-p53-source-apply-guard-gate:require-guard',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P53_SOURCE_APPLY_GUARD',
    'P52_SOURCE_PATCH_PREVIEW_SOURCE',
    'SOURCE_PATCH_ROWS_REQUIRED',
    'PENDING_ROWS_BLOCK_SOURCE_APPLY',
    'SOURCE_PATCH_ALLOWED_REQUIRED',
    'APPROVED_ROWS_MATCH_PATCH_ROWS_REQUIRED',
    'REJECTED_ROWS_REQUIRE_RETRACE',
    'INVALID_ROWS_BLOCK_SOURCE_APPLY',
    'EXPLICIT_APPLY_STEP_REQUIRED',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceApplyAllowed=false',
    'sourceDataWritePerformed: false',
    'p53-source-apply-guard-ready',
    'p53-source-apply-guard-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P53_SOURCE_APPLY_GUARD_SOURCE.includes(requiredText),
      `Daegu operator reference P53 source apply guard should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P54 partial approval fixture는 production 입력 없이 부분 승인 dry-run을 검증한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p54-partial-approval-fixture',
    'stadium:daegu:operator-reference-p54-partial-approval-fixture-gate',
    'stadium:daegu:operator-reference-p54-partial-approval-fixture-gate:require-fixture',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P54_PARTIAL_APPROVAL_FIXTURE',
    'PRODUCTION_P51_INPUT_UNCHANGED',
    'PARTIAL_APPROVED_ROWS_CREATE_PATCH_PREVIEW',
    'PENDING_ROWS_REMAIN_BLOCKED',
    'P53_SOURCE_APPLY_STILL_FORBIDDEN',
    'INVALID_APPROVED_SAMPLE_BLOCKED',
    'INVALID_IMMUTABLE_CHANGE_SAMPLE_BLOCKED',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p54-partial-approval-fixture-ready',
    'p54-partial-approval-fixture-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P54_PARTIAL_APPROVAL_FIXTURE_SOURCE.includes(requiredText),
      `Daegu operator reference P54 partial approval fixture should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P55 operator handoff는 실제 검수 입력 파일과 검증 명령을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p55-operator-handoff',
    'stadium:daegu:operator-reference-p55-operator-handoff-gate',
    'stadium:daegu:operator-reference-p55-operator-handoff-gate:require-handoff',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P55_OPERATOR_HANDOFF',
    'P51_REAL_REVIEW_INPUT_EDIT_TARGET',
    'OPERATOR_WRITABLE_COLUMNS_DOCUMENTED',
    'IMMUTABLE_COLUMNS_DOCUMENTED',
    'P54_FIXTURE_REFERENCE_INCLUDED',
    'VALIDATION_COMMAND_CHECKLIST_INCLUDED',
    'P52_P53_SOURCE_WRITE_BLOCKED',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p55-operator-handoff-ready',
    'p55-operator-handoff-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P55_OPERATOR_HANDOFF_SOURCE.includes(requiredText),
      `Daegu operator reference P55 operator handoff should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P56 real input intake는 P55 기준 hash와 승인 좌표 gate를 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p56-real-input-intake',
    'stadium:daegu:operator-reference-p56-real-input-intake-gate',
    'stadium:daegu:operator-reference-p56-real-input-intake-gate:require-ready',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P56_REAL_INPUT_INTAKE',
    'P55_HANDOFF_HASH_BASELINE',
    'NO_OPERATOR_INPUT',
    'INPUT_EDITED_PENDING_APPROVAL',
    'APPROVED_READY_FOR_PREVIEW',
    'INVALID_OPERATOR_INPUT_BLOCKED',
    'OPERATOR_WRITABLE_ONLY',
    'IMMUTABLE_COLUMNS_UNCHANGED',
    'APPROVED_GEOMETRY_WITHIN_4096_VIEWBOX',
    'APPROVED_GEOMETRY_SELF_INTERSECTION_0',
    'APPROVED_LABEL_POINT_TOP_HIT',
    'P52_PREVIEW_READY_REQUIRES_APPROVED_ROWS',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'p56-no-operator-input',
    'p56-approved-ready-for-preview',
    'p56-real-input-intake-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P56_REAL_INPUT_INTAKE_SOURCE.includes(requiredText),
      `Daegu operator reference P56 real input intake should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P57 P52 handoff는 P56 승인 row만 preview 진입 후보로 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p57-p52-handoff',
    'stadium:daegu:operator-reference-p57-p52-handoff-gate',
    'stadium:daegu:operator-reference-p57-p52-handoff-gate:require-ready',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P57_P52_HANDOFF',
    'P56_GATE_RESULT_REQUIRED',
    'P56_APPROVED_PREVIEW_ROWS_SOURCE',
    'APPROVED_PREVIEW_READY_ROWS_ONLY',
    'READY_FOR_P52_REQUIRES_APPROVED_ROWS',
    'INVALID_P56_ROWS_BLOCK_P52',
    'PENDING_P56_ROWS_BLOCK_P52',
    'P52_ENTRY_GATE_STRENGTHENED',
    'P52_PREVIEW_BLOCKED_WHEN_APPROVED_ROWS_0',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'readyForP52=false',
    'p57-p52-handoff-ready',
    'p57-p52-handoff-blocked',
    'p57-p52-handoff-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P57_P52_HANDOFF_SOURCE.includes(requiredText),
      `Daegu operator reference P57 P52 handoff should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P58 ready fixture는 승인 1건으로 P56/P57 ready 경로만 검증한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p58-ready-fixture',
    'stadium:daegu:operator-reference-p58-ready-fixture-gate',
    'stadium:daegu:operator-reference-p58-ready-fixture-gate:require-ready',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P58_READY_FIXTURE',
    'P51_REAL_INPUT_UNCHANGED',
    'P56_FIXTURE_INTAKE_SIMULATION',
    'P57_FIXTURE_HANDOFF_SIMULATION',
    'APPROVED_1_READY_FOR_P52',
    'P58_FIXTURE_APPROVED_ROWS_ONLY',
    'P58_FIXTURE_DOES_NOT_WRITE_REAL_P51',
    'P52_PREVIEW_READY_TRUE_WITH_APPROVED_1',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'readyForP52=true',
    'p58-ready-fixture-ready',
    'p58-ready-fixture-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P58_READY_FIXTURE_SOURCE.includes(requiredText),
      `Daegu operator reference P58 ready fixture should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P59 readiness comparison은 fixture ready와 production pending을 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p59-readiness-comparison',
    'stadium:daegu:operator-reference-p59-readiness-comparison-gate',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P59_READINESS_COMPARISON',
    'P58_FIXTURE_READY_SOURCE',
    'P57_PRODUCTION_NOT_READY_SOURCE',
    'TECHNICAL_PATH_VERIFIED',
    'FIXTURE_READY_FOR_P52_TRUE',
    'PRODUCTION_READY_FOR_P52_FALSE',
    'PRODUCTION_INPUT_STILL_PENDING',
    'NEXT_REQUIRED_ACTION_OPERATOR_APPROVE_P51',
    'P51_REAL_REVIEW_INPUT_EDIT_TARGET',
    'SOURCE_WRITE_STILL_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'technicalPathVerified=true',
    'productionReadyForP52=false',
    'p59-readiness-comparison-ready',
    'p59-readiness-comparison-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P59_READINESS_COMPARISON_SOURCE.includes(requiredText),
      `Daegu operator reference P59 readiness comparison should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P60 production pilot approval은 P51 운영 입력 1건만 승인한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p60-production-pilot-approval',
    'stadium:daegu:operator-reference-p60-production-pilot-approval-gate',
    'stadium:daegu:operator-reference-p60-production-pilot-approval-gate:require-approval',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P60_PRODUCTION_PILOT_APPROVAL',
    'P51_REAL_INPUT_WRITE_ALLOWED_FOR_PILOT',
    'TR9_PRODUCTION_APPROVED_1',
    'ONLY_WRITABLE_COLUMNS_CHANGED',
    'IMMUTABLE_COLUMNS_UNCHANGED',
    'PRODUCTION_P51_INPUT_WRITE_PERFORMED',
    'P56_PRODUCTION_EXPECTED_READY',
    'P57_PRODUCTION_EXPECTED_READY',
    'P52_SOURCE_PATCH_EXPECTED_1',
    'P53_SOURCE_APPLY_GUARD_EXPECTED',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'productionP51InputWritePerformed: true',
    'sourceDataWritePerformed: false',
    'p60-production-pilot-approval-ready',
    'p60-production-pilot-approval-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P60_PRODUCTION_PILOT_APPROVAL_SOURCE.includes(requiredText),
      `Daegu operator reference P60 production pilot approval should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P61 post-P60 readiness는 단건 후보와 전체 apply 차단을 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p61-post-p60-readiness',
    'stadium:daegu:operator-reference-p61-post-p60-readiness-gate',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P61_POST_P60_READINESS',
    'P60_PRODUCTION_PILOT_SOURCE',
    'P52_PATCH_PREVIEW_SOURCE',
    'P53_SOURCE_APPLY_GUARD_SOURCE',
    'PILOT_PATCH_READY',
    'SINGLE_ROW_APPLY_CANDIDATE',
    'FULL_RELEASE_BLOCKED',
    'PENDING_ROWS_BLOCK_FULL_APPLY',
    'SOURCE_WRITE_STILL_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'BUILD_BLOCKER_TRACKED_SEPARATELY',
    'pilotPatchReady=true',
    'singleRowApplyCandidate=true',
    'fullReleaseBlocked=true',
    'sourceDataWritePerformed: false',
    'p61-post-p60-readiness-ready',
    'p61-post-p60-readiness-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P61_POST_P60_READINESS_SOURCE.includes(requiredText),
      `Daegu operator reference P61 post-P60 readiness should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P62 single-row apply preview는 TR-9 단건 source preview만 허용한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');

  [
    'stadium:daegu:operator-reference-p62-single-row-apply-preview',
    'stadium:daegu:operator-reference-p62-single-row-apply-preview-gate',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P62_SINGLE_ROW_APPLY_PREVIEW',
    'P61_POST_P60_READINESS_SOURCE',
    'SINGLE_ROW_PILOT_APPLY_ALLOWED',
    'TR9_ONLY_SOURCE_PATCH_CANDIDATE',
    'PATCH_PREVIEW_ONLY',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'PENDING_ROWS_DO_NOT_BLOCK_SINGLE_ROW_PREVIEW',
    'FULL_RELEASE_STILL_BLOCKED',
    'SOURCE_HASH_UNCHANGED',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'singleRowPilotApplyAllowed=true',
    'p62-single-row-apply-preview-ready',
    'p62-single-row-apply-preview-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P62_SINGLE_ROW_APPLY_PREVIEW_SOURCE.includes(requiredText),
      `Daegu operator reference P62 single-row apply preview should include ${requiredText}`,
    );
  });

  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 operator reference P63 single-row source postwrite는 TR-9 hitPath 적용만 검증한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const tr9Block = DAEGU_OPERATOR_REFERENCE_BLOCKS.find((block) => block.id === 'daegu-outfield-table-tr-tr-9');

  [
    'stadium:daegu:operator-reference-p63-single-row-source-postwrite',
    'stadium:daegu:operator-reference-p63-single-row-source-postwrite-gate',
    'stadium:daegu:operator-reference-p63-single-row-source-postwrite:require-applied',
  ].forEach((scriptName) => {
    assert.ok(packageSource.includes(`"${scriptName}"`), `${scriptName} package script should exist`);
  });

  [
    'P63_SINGLE_ROW_SOURCE_POSTWRITE',
    'P62_SINGLE_ROW_APPLY_PREVIEW_SOURCE',
    'TR9_ONLY_SOURCE_WRITE_APPLIED',
    'HIT_PATH_ONLY_SOURCE_DELTA',
    'SOURCE_HASH_CHANGED_FROM_P62',
    'TARGET_GEOMETRY_MATCHES_P62',
    'TARGET_LABEL_TOP_HIT_VALID',
    'SOURCE_DATA_WRITE_PERFORMED',
    'PENDING_ROWS_STILL_BLOCK_FULL_RELEASE',
    'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    'PRODUCTION_WRITE_BLOCKED',
    'sourceDataWritePerformed=true',
    'productionWriteAllowed: false',
    'p63-single-row-source-postwrite-applied',
    'p63-single-row-source-postwrite-gate-passed',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_OPERATOR_REFERENCE_P63_SINGLE_ROW_SOURCE_POSTWRITE_SOURCE.includes(requiredText),
      `Daegu operator reference P63 single-row source postwrite should include ${requiredText}`,
    );
  });

  assert.ok(tr9Block, 'TR-9 operator reference block should exist');
  assert.equal(tr9Block?.imageGeometry.hitPath, tr9Block?.imageGeometry.visualPath);
  assert.equal(DAEGU_OPERATOR_REFERENCE_BLOCKS.length, 131);
  assert.equal(DAEGU_BLOCKS.length, 177);
});

test('대구 좌석 카테고리는 공식 좌석도 입력 대기 상태에서도 핵심 구역명을 보존한다', () => {
  REQUIRED_CORE_CATEGORIES.forEach((category) => {
    assert.ok(DAEGU_CATEGORIES[category], `${category} category should be defined`);
  });

  DAEGU_REQUIRED_OFFICIAL_SECTIONS.forEach((label) => {
    assert.ok(Object.values(DAEGU_CATEGORIES).some((category) => category.label === label), `${label} label should be defined`);
  });

  assert.ok(DAEGU_CATEGORY_GROUPS.some((group) => group.id === 'cheer' && group.cats?.includes('BLUE')));
  assert.ok(DAEGU_CATEGORY_GROUPS.some((group) => group.id === 'premium' && group.cats?.includes('VIP')));
  assert.ok(DAEGU_CATEGORY_GROUPS.some((group) => group.id === 'accessible' && group.cats?.includes('ACCESSIBLE')));
});

test('대구 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlocks = new Set<string>();

  DAEGU_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    block.officialBlocks.forEach((officialBlock) => {
      assert.ok(!officialBlocks.has(officialBlock), `${officialBlock} official block should be unique`);
      officialBlocks.add(officialBlock);
    });
  });
});

test('대구 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  const viewportRight = DAEGU_SEATMAP_VIEWPORT.x + DAEGU_SEATMAP_VIEWPORT.width;
  const viewportBottom = DAEGU_SEATMAP_VIEWPORT.y + DAEGU_SEATMAP_VIEWPORT.height;

  if (DAEGU_SEATMAP_IMAGE.assetStatus === 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 177);
  }

  DAEGU_BLOCKS.forEach((block) => {
    assert.ok(DAEGU_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.ok(
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      || block.traceStatus === 'NEEDS_OPERATOR_REVIEW'
      || block.traceStatus === 'OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED',
      `${block.id} trace status should be explicit`,
    );
    assert.ok(
      block.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
      || block.traceMethod === 'LEGACY_SCALED_POLYGON'
      || block.traceMethod === 'PIXEL_COMPONENT_CANDIDATE'
      || block.traceMethod === 'TODO_UNMEASURED',
      `${block.id} trace method should be explicit`,
    );
    assert.ok(block.reviewNote, `${block.id} review note should exist`);
    assert.equal(
      block.sourceConfidence,
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 'OFFICIAL' : 'UNVERIFIED',
      `${block.id} source confidence should follow trace status`,
    );
    if (block.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
      assert.equal(block.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${block.id} official trace should use direct official-image path tracing`);
    } else {
      assert.match(block.reviewNote, /검수|REVIEW|확인|대조/, `${block.id} unverified trace should keep review guidance`);
    }
    assert.ok(block.officialBlocks.length > 0, `${block.id} official blocks should exist`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    ['대구', '삼성', '라팍', block.block, block.name].forEach((alias) => {
      assert.ok(block.seatViewSections.includes(alias), `${block.id} aliases should include ${alias}`);
    });
    assert.equal(block.imageGeometry.visualPath, block.imageGeometry.d, `${block.id} visual path should keep d as the canonical display polygon`);
    assert.ok(block.imageGeometry.hitPath, `${block.id} hit path should exist`);
    assert.deepEqual(block.imageGeometry.labelPoint, [block.imageGeometry.labelX, block.imageGeometry.labelY], `${block.id} label point should mirror labelX/labelY`);
    assert.equal(block.imageGeometry.geometryVersion != null && OFFICIAL_ALLOWED_GEOMETRY_VERSIONS.has(block.imageGeometry.geometryVersion), true, `${block.id} geometry version should be normalized to an approved Daegu trace version`);
    assert.equal(block.imageGeometry.traceSource, 'OFFICIAL_PNG_MANUAL_POLYGON', `${block.id} trace source should be normalized`);
    assert.equal(block.imageGeometry.traceVersion, 'manual-polygon-v1', `${block.id} trace version should be normalized`);
    assert.equal(block.imageGeometry.manualReviewed, block.traceStatus === 'OFFICIAL_IMAGE_TRACED', `${block.id} manual review flag should follow official trace status`);
    assert.equal(
      block.imageGeometry.pixelAlignmentStatus,
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 'PIXEL_ALIGNED' : 'MANUAL_REVIEW_REQUIRED',
      `${block.id} pixel alignment status should follow trace readiness`,
    );
    const expectedSectionKind = block.block === '12'
      ? 'WAYFINDING_MARKER'
      : block.markerType === 'WHEELCHAIR'
      ? 'ACCESSIBILITY_MARKER'
      : block.markerType === 'GATE'
        ? 'GATE_MARKER'
        : block.markerType
          ? 'FACILITY_MARKER'
          : 'SEAT_SECTION';
    assert.equal(block.sectionKind, expectedSectionKind, `${block.id} section kind should separate seat polygons and markers`);
    assert.equal(block.markerType, block.category === 'ACCESSIBLE' ? 'WHEELCHAIR' : undefined, `${block.id} marker type should only be set for wheelchair entries`);

    const blockGeometryPaths = geometryPaths(block);
    assert.ok(blockGeometryPaths.length > 0, `${block.id} image geometry path should exist`);
    blockGeometryPaths.forEach((path) => {
      assert.ok(path.startsWith('M '), `${block.id} image geometry path should exist`);
      assert.ok(path.trim().endsWith('Z'), `${block.id} image geometry path should be closed`);
    });
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= DAEGU_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= DAEGU_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);
    assert.ok(block.imageGeometry.labelX >= DAEGU_SEATMAP_VIEWPORT.x && block.imageGeometry.labelX <= viewportRight, `${block.id} label x should fit viewport`);
    assert.ok(block.imageGeometry.labelY >= DAEGU_SEATMAP_VIEWPORT.y && block.imageGeometry.labelY <= viewportBottom, `${block.id} label y should fit viewport`);

    blockGeometryPaths.forEach((path) => {
      const pathNumbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      if (block.traceStatus === 'OFFICIAL_IMAGE_TRACED' && !OFFICIAL_SIMPLE_POLYGON_BLOCKS.has(block.block)) {
        assert.ok(pathNumbers.length >= 12, `${block.id} image geometry should contain at least 6 polygon points`);
      }
      assert.ok(!hasSelfIntersection(pathPoints(path)), `${block.id} image geometry should not self-intersect`);
      pathNumbers.forEach((coordinate, index) => {
        const limit = index % 2 === 0 ? DAEGU_SEATMAP_IMAGE.imageWidth : DAEGU_SEATMAP_IMAGE.imageHeight;
        assert.ok(coordinate >= 0 && coordinate <= limit, `${block.id} path coordinate ${coordinate} should fit image bounds`);
        const viewportMin = index % 2 === 0 ? DAEGU_SEATMAP_VIEWPORT.x : DAEGU_SEATMAP_VIEWPORT.y;
        const viewportMax = index % 2 === 0 ? viewportRight : viewportBottom;
        assert.ok(coordinate >= viewportMin && coordinate <= viewportMax, `${block.id} path coordinate ${coordinate} should fit viewport`);
      });
    });
  });
});

test('대구 visualPath/hitPath는 공통 polygon validator 계약을 통과한다', () => {
  if (DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 0, 'manual-required state should not expose synthesized hit areas');
    return;
  }

  DAEGU_BLOCKS.forEach((block) => {
    const labelPoint = block.imageGeometry.labelPoint ?? ([block.imageGeometry.labelX, block.imageGeometry.labelY] as Point);
    const normalizedPaths = [block.imageGeometry.visualPath, block.imageGeometry.hitPath].filter((pathData): pathData is string => Boolean(pathData));
    assert.equal(normalizedPaths.length, 2, `${block.id} should expose visual and hit polygon paths`);

    normalizedPaths.forEach((pathData) => {
      assert.deepEqual(
        validateSeatMapPolygonPath({
          pathData,
          width: DAEGU_SEATMAP_IMAGE.imageWidth,
          height: DAEGU_SEATMAP_IMAGE.imageHeight,
          labelPoint: block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? labelPoint : undefined,
          labelTolerance: 1,
        }),
        [],
        `${block.id} normalized polygon path should pass validator`,
      );
    });
  });
});

test('대구 normal selectable seat predicate는 미검수 polygon을 일반 UI에서 제외한다', () => {
  if (DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 0, 'manual-required state should not expose synthesized hit areas');
    return;
  }

  const seatSections = DAEGU_BLOCKS.filter((block) => block.sectionKind === 'SEAT_SECTION');
  const normalSelectableSeats = DAEGU_BLOCKS.filter(isDaeguNormalSelectableSeat);
  const reviewOnlySeats = DAEGU_BLOCKS.filter(isDaeguReviewOnlySeat);
  const officialUnconfirmedSeats = DAEGU_BLOCKS.filter(isDaeguOfficialUnconfirmedSeat);
  const wayfindingRows = DAEGU_BLOCKS.filter((block) => block.sectionKind === 'WAYFINDING_MARKER');
  const classifiedReleaseRows = [...officialUnconfirmedSeats, ...wayfindingRows];
  const validationBlockedBlocks = ['MR-10', 'M-10'];
  const validationBlockedEvidence: Record<string, string[]> = {
    'MR-10': ['OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED', 'seat component', 'coverage 0.19'],
    'M-10': ['OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED', 'seat seed', 'M-9'],
  };

  assert.equal(DAEGU_BLOCKS.length, 177, 'Daegu release inventory should stay fixed at 177 rows');
  assert.equal(seatSections.length, 173, 'Daegu should keep 173 seat sections and marker-only rows outside this count');
  assert.equal(normalSelectableSeats.length, seatSections.length - reviewOnlySeats.length - officialUnconfirmedSeats.length);
  assert.equal(normalSelectableSeats.length, 171, 'Daegu release lock should expose 171 normal selectable seat sections');
  assert.equal(reviewOnlySeats.length, 0, 'Daegu release lock should not expose review-only seat polygons');
  assert.equal(officialUnconfirmedSeats.length, 2, 'MR-10/M-10 should be policy-excluded until an independent official component is confirmed');
  assert.equal(classifiedReleaseRows.length, 3, 'Daegu release lock should keep MR-10/M-10/12 as classified release rows');
  validationBlockedBlocks.forEach((blockName) => {
    const block = DAEGU_BLOCKS.find((candidate) => candidate.block === blockName);
    assert.ok(block, `${blockName} should exist`);
    assert.equal(block.sectionKind, 'SEAT_SECTION', `${blockName} should remain a tracked seat-section inventory row`);
    assert.equal(block.traceStatus, 'OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED', `${blockName} should not be promoted without operator confirmation`);
    assert.equal(block.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${blockName} should keep the official-image evidence path method`);
    assert.equal(block.imageGeometry.manualReviewed, false, `${blockName} should not be marked manually reviewed before operator confirmation`);
    assert.equal(block.imageGeometry.pixelAlignmentStatus, 'MANUAL_REVIEW_REQUIRED', `${blockName} should require manual review before seat layer return`);
    assert.equal(isDaeguNormalSelectableSeat(block), false, `${blockName} should not be normal selectable without a confirmed independent official component`);
    assert.equal(isDaeguReviewOnlySeat(block), false, `${blockName} should not appear as a debug review polygon candidate`);
    assert.equal(isDaeguOfficialUnconfirmedSeat(block), true, `${blockName} should be tracked as official-image independent component unconfirmed`);
    validationBlockedEvidence[blockName].forEach((requiredText) => {
      assert.match(
        `${block.sourceNote} ${block.reviewNote}`,
        new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `${blockName} should document the official-image visibility blocker: ${requiredText}`,
      );
    });
  });

  normalSelectableSeats.forEach((block) => {
    assert.equal(block.sectionKind, 'SEAT_SECTION', `${block.id} normal selectable rows must be seat sections`);
    assert.equal(block.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${block.id} normal selectable rows must be official traced`);
    assert.equal(block.imageGeometry.manualReviewed, true, `${block.id} normal selectable rows must be manually reviewed`);
    assert.equal(block.imageGeometry.pixelAlignmentStatus, 'PIXEL_ALIGNED', `${block.id} normal selectable rows must be pixel aligned`);
  });

  DAEGU_BLOCKS
    .filter((block) => block.sectionKind !== 'SEAT_SECTION')
    .forEach((block) => {
      assert.equal(isDaeguNormalSelectableSeat(block), false, `${block.id} marker-only row should not be normal selectable`);
      assert.equal(isDaeguReviewOnlySeat(block), false, `${block.id} marker-only row should not be debug review seat`);
    });

  const wayfindingBlock12 = DAEGU_BLOCKS.find((block) => block.block === '12');
  assert.ok(wayfindingBlock12, '12 wayfinding marker should exist');
  assert.equal(wayfindingBlock12.sectionKind, 'WAYFINDING_MARKER', '12 should be separated from selectable seat polygons');
  assert.equal(wayfindingBlock12.traceStatus, 'NEEDS_OPERATOR_REVIEW', '12 should not be promoted as an official traced seat polygon');
  assert.equal(wayfindingBlock12.imageGeometry.manualReviewed, false, '12 should not be marked manually reviewed as a seat polygon');
  assert.equal(wayfindingBlock12.imageGeometry.pixelAlignmentStatus, 'MANUAL_REVIEW_REQUIRED', '12 should remain outside the pixel-aligned seat polygon set');
  assert.equal(isDaeguNormalSelectableSeat(wayfindingBlock12), false, '12 wayfinding marker should not be normal selectable');
  assert.equal(isDaeguReviewOnlySeat(wayfindingBlock12), false, '12 wayfinding marker should not be a review-only seat polygon');
});

test('대구 미검수 polygon 구역별 정밀화 workset은 모든 row를 구역별로 분류한다', () => {
  if (DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 0, 'manual-required state should not expose synthesized hit areas');
    return;
  }

  const reviewOnlySeats = DAEGU_BLOCKS.filter(isDaeguReviewOnlySeat);
  const officialUnconfirmedSeats = DAEGU_BLOCKS.filter(isDaeguOfficialUnconfirmedSeat);
  const reviewOnlySeatBlocks = new Set(reviewOnlySeats.map((block) => block.block));
  const batch1ReviewBlocks: string[] = [];
  const heldBoundaryFirstBlocks: string[] = [];
  const promotedBoundaryFirstBlocks = ['T1-1', 'V1', 'V2', 'T3-2', 'V3', '13', '14', '15', '16', '1-2', 'T1-4', '3-10', '3-9', '3E-3', '3E-2', '3-8', '3-7', '3-6', '3-5', '3-4', '1-4', '1-12', '1-11', '1-10', '1-9', '1-8', '1E-3', '1E-2', '1E-1', 'S7', 'LF-2', 'S31', 'S30', 'S29', 'S28', 'S24', 'S25', 'S26', 'S27', 'S22', 'S23', 'U25', 'U26', 'U27', 'U28', 'U29', 'U30', 'U31', 'U10', 'U11', 'U12', 'U13', 'U14', '01', '06', '07', '08', '09', '10', '11', 'MR-9', 'M-9', '우측 외야', '중앙 외야'];

  assert.equal(reviewOnlySeats.length, 0, 'currently unresolved coordinate workset should be empty after official-image unconfirmed rows are policy-excluded');
  assert.equal(officialUnconfirmedSeats.length, 2, 'MR-10/M-10 should remain classified release rows outside selectable seat layers until independent official components are confirmed');

  [...batch1ReviewBlocks, ...heldBoundaryFirstBlocks].forEach((blockName) => {
    const block = DAEGU_BLOCKS.find((candidate) => candidate.block === blockName);
    assert.ok(block, `${blockName} should exist`);
    assert.equal(reviewOnlySeatBlocks.has(blockName), true, `${blockName} should remain in review-only workset`);
    assert.equal(isDaeguNormalSelectableSeat(block), false, `${blockName} should not be normal selectable before operator approval`);
  });

  promotedBoundaryFirstBlocks.forEach((blockName) => {
    const block = DAEGU_BLOCKS.find((candidate) => candidate.block === blockName);
    assert.ok(block, `${blockName} should exist`);
    assert.equal(isDaeguNormalSelectableSeat(block), true, `${blockName} should be normal selectable`);
  });
});

test('대구 13~16 retrace candidate는 공식 PNG component scan과 operator 승인 차단을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const candidateSource = DAEGU_VISUAL_MATCH_SOURCE;

  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-13-16-retrace-candidate');

  [
    'DAEGU_VISUAL_MATCH_BATCH1_13_16_RETRACE_CANDIDATE_V1',
    'THIRTEEN_TO_SIXTEEN_RETRACE_CANDIDATE_READY_RELEASE_BLOCKED',
    'THIRTEEN_TO_SIXTEEN_WAITING_FOR_OPERATOR_INPUT_RELEASE_BLOCKED',
    'RETRACE_REQUIRED_CONTINUOUS_COMPONENT',
    'OFFICIAL_PNG_PURPLE_COMPONENT_SCAN_WITH_OPERATOR_RETRACE_PARTITION',
    'floodPurpleComponent',
    'nearestPurplePixel',
    'component-mask.png',
    '13',
    '14',
    '15',
    '16',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'This script samples only the official Daegu PNG.',
    'It scans the purple 13-16 component and emits evidence-only retrace candidates.',
    'It protects U22 wheelchair marker labels from seat candidate hit areas.',
    'OFFICIAL_PNG_PURPLE_COMPONENT_SCAN_WITH_U22_MARKER_PROTECTED_PARTITION',
    'PROTECTED_MARKER_LABEL_HITS',
    'U22 휠체어',
    'It never writes src/data/daeguSeatData.ts.',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(candidateSource.includes(requiredText), `Daegu 13-16 retrace candidate should include ${requiredText}`);
  });
});

test('대구 13~16 approval gate는 승인 row만 dry-run patch로 내보낸다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const gateSource = DAEGU_VISUAL_MATCH_SOURCE;
  const smokeSource = DAEGU_VISUAL_MATCH_SOURCE;

  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-13-16-approval-gate');
  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-13-16-approval-gate:require-approved');
  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-13-16-approval-smoke');

  [
    'DAEGU_VISUAL_MATCH_BATCH1_13_16_APPROVAL_GATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_13_16_RETRACE_CANDIDATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_13_16_DRY_RUN_APPLY_PLAN_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'APPROVED_ROWS_REQUIRED_FOR_13_16_APPROVAL_GATE',
    '13',
    '14',
    '15',
    '16',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'validateSeatMapPolygonPath',
    'pointInPolygon',
    'approximateOverlap',
    'CORRECTED_VISUAL_',
    'CORRECTED_HIT_',
    'CORRECTED_HIT_PATH_CAPTURES_APPROVED_LABEL',
    'CORRECTED_HIT_PATH_CAPTURES_NORMAL_LABEL',
    'CORRECTED_HIT_PATH_CAPTURES_MARKER_LABEL',
    'CORRECTED_LABEL_TOP_HIT_CONFLICT_NORMAL',
    'CORRECTED_LABEL_TOP_HIT_CONFLICT_MARKER',
    'CORRECTED_VISUAL_OVERLAPS_APPROVED',
    'CORRECTED_VISUAL_OVERLAPS_NORMAL',
    "traceStatus: 'OFFICIAL_IMAGE_TRACED'",
    "traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE'",
    'manualReviewed: true',
    "pixelAlignmentStatus: 'PIXEL_ALIGNED'",
    '13/15/16 can be approved independently when marker and normal label ownership checks pass.',
    'This gate never writes src/data/daeguSeatData.ts.',
    'status === READY_STATUS ? candidatePatchRows : []',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(gateSource.includes(requiredText), `Daegu 13-16 approval gate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_13_16_APPROVAL_SMOKE_V1',
    'no-approval-waiting',
    'no-approval-require-approved-blocked',
    'single-16-approved',
    'single-14-approved',
    'single-14-old-path-blocked-by-u22-marker',
    '15-16-approved',
    '14-15-16-approved',
    'all-13-16-approved',
    'single-16-missing-reviewer-blocked',
    'APPROVED_ROWS_REQUIRED_FOR_13_16_APPROVAL_GATE',
    'OLD_14_MARKER_COLLISION_PATH',
    'CORRECTED_HIT_PATH_CAPTURES_MARKER_LABEL:U22 휠체어:daegu-sky-third-upper-14',
    'APPROVED_MISSING_REVIEWER:daegu-sky-third-upper-16',
    'ready-for-dry-run-review',
    'waiting-for-operator-input',
    'blocked-no-approved-rows',
    'daegu-seatmap-visual-match-batch1-13-16-dry-run-apply-plan.json',
    'productionWriteAllowed, false',
    'dataFileChanged, false',
    'passVisualMatch, false',
    'passRelease177, false',
  ].forEach((requiredText) => {
    assert.ok(smokeSource.includes(requiredText), `Daegu 13-16 approval smoke should include ${requiredText}`);
  });
});

test('대구 13~16 split analysis는 U22 휠체어 marker label 보호를 포함한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const splitSource = DAEGU_VISUAL_MATCH_SOURCE;
  const gridSource = DAEGU_VISUAL_MATCH_SOURCE;

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-13-14-split-analysis"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-13-16-grid-split-analysis"'));

  [
    'PROTECTED_MARKER_BLOCK',
    'U22 휠체어',
    'currentDraft14ContainsU22MarkerLabel',
    'proposed14ExcludesU22MarkerLabel',
    'markerU22ContainsMarkerLabel',
    'The U22 wheelchair marker label is protected',
    'exclude the U22 wheelchair marker label',
  ].forEach((requiredText) => {
    assert.ok(splitSource.includes(requiredText), `Daegu 13/14 split analysis should include ${requiredText}`);
  });

  [
    'PROTECTED_MARKER_BLOCKS',
    'U22 휠체어',
    "kind: 'marker'",
    'U22 wheelchair is included as a protected marker label',
    'unexpectedLabelHits',
  ].forEach((requiredText) => {
    assert.ok(gridSource.includes(requiredText), `Daegu 13~16 grid split analysis should include ${requiredText}`);
  });
});

test('대구 13/U24 ownership gate는 U24 보정 이후 13 단독 승인을 허용한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const reconciliationSource = DAEGU_VISUAL_MATCH_SOURCE;
  const gateSource = DAEGU_VISUAL_MATCH_SOURCE;
  const smokeSource = DAEGU_VISUAL_MATCH_SOURCE;

  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-13-u24-ownership-reconciliation');
  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-13-u24-ownership-approval-gate');
  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-13-u24-ownership-approval-gate:require-approved');
  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-13-u24-ownership-approval-smoke');

  [
    'DAEGU_VISUAL_MATCH_BATCH1_13_U24_OWNERSHIP_RECONCILIATION_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_13_U24_OWNERSHIP_INPUT_V1',
    'THIRTEEN_U24_OWNERSHIP_RECONCILIATION_READY_RELEASE_BLOCKED',
    'LOCKED_NEEDS_OWNERSHIP_CORRECTION',
    'RETRACE_REQUIRED_CONTINUOUS_COMPONENT',
    'currentOverlap',
    'proposedOverlap',
    'currentU24Evidence',
    'proposedU24Evidence',
    '13 requires U24 ownership correction before approval.',
    'It proves current U24 captures purple 13 component pixels',
    'It never writes src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(reconciliationSource.includes(requiredText), `Daegu 13/U24 reconciliation should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_13_U24_OWNERSHIP_APPROVAL_GATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_13_U24_OWNERSHIP_INPUT_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_13_U24_OWNERSHIP_DRY_RUN_APPLY_PLAN_V1',
    'OWNERSHIP_DEPENDENCY_MISSING:13_REQUIRES_U24',
    'APPROVED_ROWS_REQUIRED_FOR_13_U24_OWNERSHIP_APPROVAL_GATE',
    '13 requires U24 ownership correction before approval.',
    'If current U24 already matches the ownership correction, 13 can be approved independently.',
    'U24 can be approved independently',
    'u24OwnershipAlreadyResolved',
    'This gate never writes src/data/daeguSeatData.ts.',
    'validateSeatMapPolygonPath',
    'pointInPolygon',
    'approximateOverlap',
    'CORRECTED_VISUAL_OVERLAPS_NORMAL',
    'CORRECTED_LABEL_TOP_HIT_CONFLICT_NORMAL',
    'status === READY_STATUS ? candidatePatchRows : []',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(gateSource.includes(requiredText), `Daegu 13/U24 approval gate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_13_U24_OWNERSHIP_APPROVAL_SMOKE_V1',
    'no-approval-waiting',
    'no-approval-require-approved-blocked',
    'thirteen-only-approved-after-u24-correction',
    'u24-only-approved',
    'thirteen-u24-approved',
    'u24-missing-reviewer-blocked',
    'APPROVED_ROWS_REQUIRED_FOR_13_U24_OWNERSHIP_APPROVAL_GATE',
    'APPROVED_MISSING_REVIEWER:daegu-sky-blue-zone-u24',
    'ready-for-dry-run-review',
    'waiting-for-operator-input',
    'blocked-no-approved-rows',
    'daegu-seatmap-visual-match-batch1-13-u24-ownership-dry-run-apply-plan.json',
    'productionWriteAllowed, false',
    'dataFileChanged, false',
    'passVisualMatch, false',
    'passRelease177, false',
  ].forEach((requiredText) => {
    assert.ok(smokeSource.includes(requiredText), `Daegu 13/U24 approval smoke should include ${requiredText}`);
  });
});

test('대구 U25~U27 sequence candidate는 공식 PNG magenta scan과 U28~U31 guard를 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const candidateSource = DAEGU_VISUAL_MATCH_SOURCE;

  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-u25-u27-sequence-candidate');

  [
    'DAEGU_VISUAL_MATCH_BATCH1_U25_U27_SEQUENCE_CANDIDATE_V1',
    'U25_U27_SEQUENCE_CANDIDATE_READY_RELEASE_BLOCKED',
    'U25_U27_WAITING_FOR_OPERATOR_INPUT_RELEASE_BLOCKED',
    'SEQUENCE_CONFIRMATION_REQUIRED',
    'OFFICIAL_PNG_MAGENTA_SEQUENCE_SCAN_WITH_OPERATOR_RETRACE_PARTITION',
    'floodMagentaComponent',
    'nearestMagentaPixel',
    'sequenceOrderIsMonotonic',
    'magenta-component-mask.png',
    'U25',
    'U26',
    'U27',
    'U28',
    'U31',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'This script samples only the official Daegu PNG.',
    'It scans the U25-U31 magenta sequence and emits evidence-only U25-U27 sequence candidates.',
    'It uses U28-U31 only as guard rows for sequence order and overlap checks.',
    'It never writes src/data/daeguSeatData.ts.',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(candidateSource.includes(requiredText), `Daegu U25-U27 sequence candidate should include ${requiredText}`);
  });
});

test('대구 S22/S23 pair retrace candidate는 공식 PNG magenta scan과 S24 guard를 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const candidateSource = DAEGU_VISUAL_MATCH_SOURCE;

  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-s22-s23-pair-retrace-candidate');

  [
    'DAEGU_VISUAL_MATCH_BATCH1_S22_S23_PAIR_RETRACE_CANDIDATE_V1',
    'S22_S23_PAIR_RETRACE_CANDIDATE_READY_RELEASE_BLOCKED',
    'S22_S23_WAITING_FOR_OPERATOR_INPUT_RELEASE_BLOCKED',
    'PAIR_RETRACE_REQUIRED',
    'OFFICIAL_PNG_MAGENTA_PAIR_RETRACE_SCAN_WITH_OPERATOR_APPROVAL_REQUIRED',
    'floodMagentaComponent',
    'nearestMagentaPixel',
    'magenta-component-mask.png',
    'S22',
    'S23',
    'S24',
    'S22_S23_PAIR_RETRACE_REQUIRED',
    'CANDIDATE_REQUIRES_REWORK',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'This script samples only the official Daegu PNG.',
    'It scans the S22-S24 magenta component and emits evidence-only S22/S23 pair retrace candidates.',
    'It uses S24 and neighboring labels only as guard rows for ownership checks.',
    'It never writes src/data/daeguSeatData.ts.',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(candidateSource.includes(requiredText), `Daegu S22/S23 pair retrace candidate should include ${requiredText}`);
  });
});

test('대구 batch1 consolidated operator package는 승인 전 dry-run only 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const candidateSource = DAEGU_VISUAL_MATCH_SOURCE;

  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-consolidated-operator-package');

  [
    'DAEGU_VISUAL_MATCH_BATCH1_CONSOLIDATED_OPERATOR_PACKAGE_V1',
    'BATCH1_CONSOLIDATED_WAITING_FOR_OPERATOR_INPUT_RELEASE_BLOCKED',
    'BATCH1_CONSOLIDATED_APPROVED_INPUT_PRESENT_DRY_RUN_ONLY_RELEASE_BLOCKED',
    'THIRTEEN_TO_SIXTEEN_RETRACE_CANDIDATE_READY_RELEASE_BLOCKED',
    'U25_U27_SEQUENCE_CANDIDATE_READY_RELEASE_BLOCKED',
    'S22_S23_PAIR_RETRACE_CANDIDATE_READY_RELEASE_BLOCKED',
    'APPROVAL_READY_VISUAL_GATE_PASSED_RELEASE_BLOCKED',
    'EXPECTED_BLOCKS',
    'PAIR_APPROVAL_GROUPS',
    'S22',
    'S23',
    'S24',
    'U28',
    'U31',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    "traceStatus: 'OFFICIAL_IMAGE_TRACED'",
    "traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE'",
    'manualReviewed: true',
    "pixelAlignmentStatus: 'PIXEL_ALIGNED'",
    'This script consolidates only official-PNG-derived Batch1 evidence reports.',
    'It never writes src/data/daeguSeatData.ts.',
    'Approved rows are emitted only as a dry-run apply plan.',
    'It blocks partial S22/S23 pair approval.',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(candidateSource.includes(requiredText), `Daegu batch1 consolidated package should include ${requiredText}`);
  });
});

test('대구 batch1 consolidated approval gate는 승인 row geometry 검증과 source write 차단을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const gateSource = DAEGU_VISUAL_MATCH_SOURCE;

  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-consolidated-approval-gate');
  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-consolidated-approval-gate:require-approved');
  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-consolidated-approved-apply-dry-run');
  assert.ok(gateSource.includes('daegu-seatmap-visual-match-batch1-consolidated-dry-run-apply-plan.json'));

  [
    'DAEGU_VISUAL_MATCH_BATCH1_CONSOLIDATED_APPROVAL_GATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_CONSOLIDATED_OPERATOR_PACKAGE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_DRY_RUN_APPLY_PLAN_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'APPROVED_ROWS_REQUIRED_FOR_CONSOLIDATED_APPROVAL_GATE',
    'EMPTY_PATCH_ROWS_NOT_ALLOWED',
    'PAIR_APPROVAL_GROUP_PARTIAL',
    'S22',
    'S23',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'validateSeatMapPolygonPath',
    'pointInPolygon',
    'approximateOverlap',
    'CORRECTED_VISUAL_',
    'CORRECTED_HIT_',
    'CORRECTED_HIT_PATH_CAPTURES_APPROVED_LABEL',
    'CORRECTED_HIT_PATH_CAPTURES_NORMAL_LABEL',
    'CORRECTED_LABEL_TOP_HIT_CONFLICT_NORMAL',
    'CORRECTED_VISUAL_OVERLAPS_APPROVED',
    'CORRECTED_VISUAL_OVERLAPS_NORMAL',
    "traceStatus: 'OFFICIAL_IMAGE_TRACED'",
    "traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE'",
    'manualReviewed: true',
    "pixelAlignmentStatus: 'PIXEL_ALIGNED'",
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'passVisualMatch: false',
    'passRelease177: false',
    'This gate never writes `src/data/daeguSeatData.ts`.',
    'A passing waiting state is not visual precision completion.',
  ].forEach((requiredText) => {
    assert.ok(gateSource.includes(requiredText), `Daegu batch1 consolidated approval gate should include ${requiredText}`);
  });
});

test('대구 batch1 consolidated approval smoke는 승인 lifecycle과 dry-run apply 연결을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const smokeSource = DAEGU_VISUAL_MATCH_SOURCE;

  assertDaeguOpsScript(packageSource, 'stadium:daegu:visual-match-batch1-consolidated-approval-smoke');

  [
    'DAEGU_VISUAL_MATCH_BATCH1_CONSOLIDATED_APPROVAL_SMOKE_V1',
    'no-approval-waiting',
    'no-approval-require-approved-blocked',
    's22-only-approved-blocked',
    'approved-missing-reviewer-blocked',
    'single-14-approved',
    'multi-14-u25-approved',
    's22-s23-approved-blocked-by-s21-overlap',
    'APPROVED_ROWS_REQUIRED_FOR_CONSOLIDATED_APPROVAL_GATE',
    'PAIR_APPROVAL_GROUP_PARTIAL:S22+S23',
    'APPROVED_MISSING_REVIEWER:daegu-sky-third-upper-14',
    'CORRECTED_VISUAL_OVERLAPS_NORMAL:S21:1:daegu-sky-lower-s22',
    'ready-for-dry-run-review',
    'waiting-for-operator-input',
    'blocked-no-approved-rows',
    'daegu-seatmap-visual-match-batch1-consolidated-dry-run-apply-plan.json',
    'scripts/daegu-seatmap-visual-match.mjs',
    '--require-ready',
    '--allow-partial',
    'plannedEditCount',
    'productionWriteAllowed, false',
    'dataFileChanged, false',
    'passVisualMatch, false',
    'passRelease177, false',
  ].forEach((requiredText) => {
    assert.ok(smokeSource.includes(requiredText), `Daegu batch1 consolidated approval smoke should include ${requiredText}`);
  });
});

test('대구 S21~S24 ownership reconciliation은 S21/S22/S23 그룹 승인 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const reconciliationSource = DAEGU_VISUAL_MATCH_SOURCE;
  const gateSource = DAEGU_VISUAL_MATCH_SOURCE;
  const smokeSource = DAEGU_VISUAL_MATCH_SOURCE;

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-s21-s24-ownership-reconciliation"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-s21-s24-ownership-approval-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-s21-s24-ownership-approval-smoke"'));

  [
    'DAEGU_VISUAL_MATCH_BATCH1_S21_S24_OWNERSHIP_RECONCILIATION_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_S21_S24_OWNERSHIP_INPUT_V1',
    'S21_S24_OWNERSHIP_RECONCILIATION_READY_RELEASE_BLOCKED',
    'LOCKED_NEEDS_OWNERSHIP_CORRECTION',
    'currentS21CapturesS22ComponentPixels',
    'proposedS21CapturesS22ComponentPixels',
    'S21',
    'S22',
    'S23',
    'S24',
    'Current S21 normal polygon captures S22 official PNG component pixels',
    'Operator must approve S21, S22, and S23 together or keep all three pending.',
    'S24 can be approved independently after visual confirmation.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(reconciliationSource.includes(requiredText), `Daegu S21-S24 reconciliation should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_S21_S24_OWNERSHIP_APPROVAL_GATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_S21_S24_OWNERSHIP_DRY_RUN_APPLY_PLAN_V1',
    'OWNERSHIP_GROUP_PARTIAL',
    'S21',
    'S22',
    'S23',
    'S24',
    'APPROVED_ROWS_REQUIRED_FOR_S21_S24_OWNERSHIP_APPROVAL_GATE',
    'S21/S22/S23 must be approved together because current S21 captures S22 component pixels.',
    'S24 can be approved independently after visual confirmation.',
    'This gate never writes src/data/daeguSeatData.ts.',
    'status === READY_STATUS ? candidatePatchRows : []',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(gateSource.includes(requiredText), `Daegu S21-S24 approval gate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_S21_S24_OWNERSHIP_APPROVAL_SMOKE_V1',
    'no-approval-waiting',
    'no-approval-require-approved-blocked',
    's22-s23-only-approved-blocked',
    's21-s22-s23-approved',
    's21-s22-s23-s24-approved',
    's24-only-approved',
    'OWNERSHIP_GROUP_PARTIAL:S21+S22+S23',
    'ready-for-dry-run-review',
    'blocked-no-approved-rows',
    'productionWriteAllowed, false',
    'dataFileChanged, false',
    'passVisualMatch, false',
    'passRelease177, false',
  ].forEach((requiredText) => {
    assert.ok(smokeSource.includes(requiredText), `Daegu S21-S24 approval smoke should include ${requiredText}`);
  });
});

test('대구 marker-only 항목은 seat polygon layer와 분리되어 렌더링된다', () => {
  const source = readFileSync(new URL('../components/daegu/DaeguSeatMapSvg.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('data-layer="daegu-seat-polygon-layer"'), 'seat polygon layer should be explicit');
  assert.ok(source.includes('data-layer="daegu-review-polygon-layer"'), 'review-only polygon layer should be explicit');
  assert.ok(source.includes('data-layer="daegu-marker-layer"'), 'marker layer should be explicit');
  assert.ok(source.includes("'daegu-seatmap-marker'"), 'marker layer should use marker-specific test ids');
  assert.ok(source.includes('renderBlocks.filter(isDaeguNormalSelectableSeat)'), 'normal layer should only render verified selectable seats');
  assert.ok(source.includes('renderBlocks.filter(isDaeguReviewOnlySeat)'), 'debug layer should isolate unreviewed seat polygons');
  assert.ok(source.includes("renderInteractiveBlocks(renderSeatBlocks, 'seat')"), 'seat blocks should render through the seat layer');
  assert.ok(source.includes('renderReviewOnlyBlocks(renderReviewBlocks)'), 'review-only seats should use a non-interactive debug renderer');
  assert.ok(source.includes('renderMarkerOnlyBlocks(renderMarkerBlocks)'), 'marker-only rows should render through a non-seat marker layer');
  assert.ok(source.includes('pointerEvents="none"'), 'review and marker-only layers should not participate in seat selection');
});

test('대구 QA ownership audit는 active owner와 historical evidence를 분리한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const releaseLockSource = readFileSync(new URL('../../docs/daegu-seatmap-release-lock.md', import.meta.url), 'utf8');

  assert.ok(packageSource.includes('"stadium:daegu:qa-ownership-audit"'), 'QA ownership audit package script should exist');
  assert.ok(
    packageSource.includes('"stadium:daegu:qa-ownership-audit": "node --import tsx scripts/daegu-seatmap-qa-ownership-audit.mjs"'),
    'QA ownership audit should run through tsx so it can import Daegu TS data',
  );

  [
    'activeRuntimeSource',
    'activeValidationOwner',
    'activeTracingOwner',
    'historicalEvidenceOwner',
    'globalValidationOwnersAreNotBlockOwners',
    'generatedReportsAreEvidenceOnly',
    'reportFilesMustNotBeStaged',
    'MULTIPLE_ACTIVE_QA_OWNERS_FOR_BLOCK',
    'MULTIPLE_ACTIVE_TRACING_WORKFLOWS_FOR_BLOCK',
    'ACTIVE_POLYGON_SOURCE_OVERLAP',
    'MARKER_IN_SEAT_QA',
    'UNCONFIRMED_BLOCK_HAS_SELECTABLE_TRACE',
    'daegu-seatmap-qa-ownership-audit.json',
    'daegu-seatmap-qa-ownership-audit.csv',
    'daegu-seatmap-qa-ownership-audit.md',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_QA_OWNERSHIP_AUDIT_SOURCE.includes(requiredText),
      `Daegu QA ownership audit should include ${requiredText}`,
    );
  });

  [
    '## QA ownership audit (2026-05-26)',
    '`npm run stadium:daegu:qa-ownership-audit`: `review-required`',
    '`reports/stadium/daegu-seatmap-qa-ownership-audit.{json,csv,md}`',
    'active runtime source overlaps: `108` block keys',
    'active QA owner conflicts: `108` block keys',
    'active tracing owner conflicts: `108` block keys',
    'marker-in-seat-QA rows: `3` (`09`, `12`, `U22`)',
    'unconfirmed selectable trace rows: `1` (`MR-10`)',
    'generated ownership reports are QA evidence only and must not be staged as PR payload',
  ].forEach((requiredText) => {
    assert.ok(
      releaseLockSource.includes(requiredText),
      `Daegu release lock should summarize QA ownership audit evidence: ${requiredText}`,
    );
  });
});

test('대구 canonical block decision guard는 block key당 canonical 후보 1개 계약을 고정한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const releaseLockSource = readFileSync(new URL('../../docs/daegu-seatmap-release-lock.md', import.meta.url), 'utf8');
  const canonicalGuardContractSource = `${DAEGU_CANONICAL_BLOCK_DECISION_GUARD_SOURCE}\n${DAEGU_CANONICAL_BLOCK_DECISION_SOURCE}`;

  assert.ok(packageSource.includes('"stadium:daegu:canonical-block-decision-guard"'), 'canonical block decision guard package script should exist');
  assert.ok(
    packageSource.includes('"stadium:daegu:canonical-block-decision-guard": "node --import tsx scripts/daegu-seatmap-canonical-block-decision-guard.mjs"'),
    'canonical block decision guard should run through tsx so it can import Daegu TS data',
  );
  assert.ok(
    DAEGU_CANONICAL_BLOCK_DECISION_GUARD_SOURCE.includes("buildDaeguCanonicalBlockDecisionReport"),
    'canonical block decision guard should use the shared data builder',
  );
  assert.deepEqual(validateDaeguCanonicalBlockDecisions(), []);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.status, 'review-required');
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.totalBlockKeys, 191);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.canonicalSelectableBlockKeys, 188);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.operatorOverlapCanonicalBlockKeys, 108);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.officialOnlyCanonicalBlockKeys, 58);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.operatorOnlyCanonicalBlockKeys, 22);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.markerAliasSeparationRequiredBlockKeys, 3);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.blockedUnconfirmedBlockKeys, 2);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.geometryIssueBlockKeys, 0);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.canonicalSourceCounts[DAEGU_CANONICAL_OPERATOR_SOURCE_ID], 130);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.canonicalSourceCounts[DAEGU_CANONICAL_OFFICIAL_SOURCE_ID], 58);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_POLICY.overlapDefault, DAEGU_CANONICAL_OPERATOR_SOURCE_ID);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_POLICY.generatedReportsAreEvidenceOnly, true);
  assert.equal(
    new Set(DAEGU_CANONICAL_BLOCK_DECISIONS.map((decision) => decision.blockKey)).size,
    DAEGU_CANONICAL_BLOCK_DECISIONS.length,
    'canonical builder should emit exactly one decision per normalized block key',
  );
  assert.equal(
    DAEGU_CANONICAL_BLOCK_DECISIONS.filter((decision) => decision.activeSourceCount > 1)
      .every((decision) => decision.canonicalSourceId === DAEGU_CANONICAL_OPERATOR_SOURCE_ID),
    true,
    'official/operator overlap rows should resolve to operator reference',
  );
  assert.deepEqual(
    DAEGU_CANONICAL_BLOCK_DECISIONS.filter((decision) => decision.decisionStatus === 'BLOCKED_UNCONFIRMED')
      .flatMap((decision) => decision.blockLabels)
      .sort(),
    ['M-10', 'MR-10'],
  );

  [
    'DAEGU_CANONICAL_BLOCK_DECISION_GUARD_V1',
    'overlapDefault',
    'markerAliasRowsStayOutOfSelectableLayer',
    'unconfirmedRowsBlockSelectableCanonical',
    'ACTIVE_POLYGON_SOURCE_OVERLAP_RESOLVED_TO_OPERATOR',
    'BLOCKED_UNCONFIRMED_NO_SELECTABLE_CANONICAL',
    'MARKER_ALIAS_SEPARATION_REQUIRED',
    'Every selectable canonical block key resolves to at most one source.',
    'daegu-seatmap-canonical-block-decision-guard.json',
    'daegu-seatmap-canonical-block-decision-guard.csv',
    'daegu-seatmap-canonical-block-decision-guard.md',
  ].forEach((requiredText) => {
    assert.ok(
      canonicalGuardContractSource.includes(requiredText),
      `Daegu canonical block decision guard should include ${requiredText}`,
    );
  });

  [
    '## Canonical block decision guard (2026-05-26)',
    '`npm run stadium:daegu:canonical-block-decision-guard`: `review-required`',
    'canonical decision builder: `src/data/daeguCanonicalBlockDecision.ts`; the guard script only serializes generated evidence.',
    '`reports/stadium/daegu-seatmap-canonical-block-decision-guard.{json,csv,md}`',
    'canonical selectable block keys: `188`',
    '`CANONICAL_OPERATOR_FROM_OVERLAP`: `108` block keys',
    '`CANONICAL_OFFICIAL_ONLY`: `58` block keys',
    '`CANONICAL_OPERATOR_ONLY`: `22` block keys',
    '`BLOCKED_UNCONFIRMED`: `2` block keys (`MR-10`, `M-10`)',
    'marker alias separation required: `3` block keys (`09`, `12`, `U22`)',
    'generated canonical block decision reports are QA evidence only and must not be staged as PR payload',
  ].forEach((requiredText) => {
    assert.ok(
      releaseLockSource.includes(requiredText),
      `Daegu release lock should summarize canonical block decision guard evidence: ${requiredText}`,
    );
  });
});

test('대구 좌석도는 기존 좌석배치도 4096 데이터와 공식 PNG 1707 데이터를 모드별로 분리한다', () => {
  const seatMapSource = readFileSync(new URL('../components/daegu/DaeguSeatMap.tsx', import.meta.url), 'utf8');
  const svgSource = readFileSync(new URL('../components/daegu/DaeguSeatMapSvg.tsx', import.meta.url), 'utf8');

  assert.ok(seatMapSource.includes('data-testid="daegu-seatmap-image-mode-toggle"'), 'Daegu seatmap should expose an image mode toggle');
  assert.ok(seatMapSource.includes("useState<DaeguSeatMapImageViewMode>('operatorReference')"), 'operator reference mode should be the default');
  assert.ok(seatMapSource.includes('DAEGU_OPERATOR_REFERENCE_BLOCKS'), 'operator reference mode should use a separate 4096 block dataset');
  assert.ok(seatMapSource.includes('daegu-seatmap-mode-operator-reference'), 'existing seatmap button should be testable');
  assert.ok(seatMapSource.includes('daegu-seatmap-mode-official-png'), 'official image button should be testable');
  assert.ok(seatMapSource.includes("'기존 좌석배치도'"), 'existing seatmap label should be visible');
  assert.ok(seatMapSource.includes("'공식 이미지'"), 'official image label should be visible');
  assert.ok(svgSource.includes("imageViewMode === 'operatorReference'"), 'SVG renderer should branch for the operator reference mode');
  assert.ok(svgSource.includes('DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT'), 'operator reference renderer should use the 4096 viewport');
  assert.ok(svgSource.includes(DAEGU_OPERATOR_REFERENCE_RAPAK_2025_REQUIRED_ASSET_FILE_NAME), 'operator reference mode should use the uploaded reference asset');
  assert.ok(svgSource.includes('renderBlocks.length > 0'), 'interactive layers should be driven by the active mode dataset');
  assert.ok(svgSource.includes('data-image-view-mode={imageViewMode}'), 'SVG should expose the active image mode for QA');
  assert.equal(seatMapSource.includes('이 모드에서는 좌석 polygon 선택을 비활성화합니다'), false, 'operator reference mode should no longer describe polygon selection as disabled');
});

test('대구 공식 좌석도 polygon은 4점 사각형 일괄 회귀를 허용하지 않는다', () => {
  if (DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 0, 'manual-required state should not expose synthesized hit areas');
    return;
  }

  const pointCounts = DAEGU_BLOCKS.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED').flatMap((block) => {
    const geometryPaths = block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d];
    return geometryPaths.map((path) => (path.match(/-?\d+(?:\.\d+)?/g)?.length ?? 0) / 2);
  });
  const fourPointPolygons = DAEGU_BLOCKS.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED').flatMap((block) => {
    const geometryPaths = block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d];
    return geometryPaths
      .filter((path) => ((path.match(/-?\d+(?:\.\d+)?/g)?.length ?? 0) / 2) <= 4)
      .map(() => block.block);
  });
  const detailedPolygons = pointCounts.filter((count) => count >= 6);

  assert.deepEqual(new Set(fourPointPolygons), OFFICIAL_SIMPLE_POLYGON_BLOCKS, 'only audited simple official blocks may use 4-point rectangles');
  assert.equal(detailedPolygons.length, pointCounts.length - OFFICIAL_SIMPLE_POLYGON_BLOCKS.size, 'all non-simple official Daegu hit areas should use at least 6 polygon points');
});

test('대구 공식 트레이싱 블록은 label 좌표에서 자기 자신으로 선택된다', () => {
  if (DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 0, 'manual-required state should not expose synthesized hit areas');
    return;
  }

  const officialBlocks = DAEGU_BLOCKS.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED');
  assert.ok(officialBlocks.length > 0, 'Daegu should keep at least one locked official traced block');

  officialBlocks.forEach((block) => {
    const labelPoint: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];
    assert.ok(pointInBlockPath(labelPoint, block), `${block.id} label should stay inside its current path`);
    assert.equal(
      topHitBlockAt(labelPoint)?.id,
      block.id,
      `${block.id} label top-hit should resolve to itself`,
    );
  });
});

test('대구 좌석도 viewport는 좌표 보정 중 전체 공식 이미지 좌표계를 사용한다', () => {
  assert.equal(DAEGU_SEATMAP_VIEWPORT.x, 0);
  assert.equal(DAEGU_SEATMAP_VIEWPORT.y, 0);
  assert.equal(DAEGU_SEATMAP_VIEWPORT.width, DAEGU_SEATMAP_IMAGE.imageWidth);
  assert.equal(DAEGU_SEATMAP_VIEWPORT.height, DAEGU_SEATMAP_IMAGE.imageHeight);
  assert.equal(DAEGU_SEATMAP_VIEWPORT.padding, 0);
});

test('대구 좌석도 trace 상태와 방식은 UI에서 표시 가능한 라벨을 가진다', () => {
  assert.equal(getDaeguTraceStatusLabel('OFFICIAL_IMAGE_TRACED'), '공식 이미지 트레이싱 완료');
  assert.equal(getDaeguTraceStatusLabel('NEEDS_OPERATOR_REVIEW'), '운영자 좌표 검수 필요');
  assert.equal(getDaeguTraceStatusLabel('OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED'), '공식 이미지 독립 블럭 미확인');
  assert.equal(getDaeguTraceMethodLabel('PATH_TRACED_FROM_OFFICIAL_IMAGE'), '공식 PNG 직접 트레이싱');
  assert.equal(getDaeguTraceMethodLabel('LEGACY_SCALED_POLYGON'), '기존 좌표계 변환 polygon');
  assert.equal(getDaeguTraceMethodLabel('PIXEL_COMPONENT_CANDIDATE'), '공식 PNG 픽셀 후보');
  assert.equal(getDaeguTraceMethodLabel('TODO_UNMEASURED'), '직접 측정 전 TODO');
});

test('대구 공식 좌석도 데이터는 준비 완료 시 핵심 좌석 구역을 포함한다', () => {
  if (DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 0, 'manual-required state should not expose synthesized hit areas');
    return;
  }

  assert.ok(DAEGU_BLOCKS.length >= 150, `official block-level map should expose at least 150 hit areas, got ${DAEGU_BLOCKS.length}`);

  const blockCodes = new Set(DAEGU_BLOCKS.map((block) => block.block));
  const categories = new Set(DAEGU_BLOCKS.map((block) => block.category));
  const aliases = new Set(DAEGU_BLOCKS.flatMap((block) => block.seatViewSections));

  ['BLUE', 'AWAY', 'VIP', 'TABLE', 'INFIELD', 'SKY', 'OUTFIELD', 'SWEETBOX', 'PARTY', 'ACCESSIBLE'].forEach((category) => {
    assert.ok(categories.has(category), `${category} category should exist`);
  });

  [
    '1-1', '1-12', '1E-1', 'T1-1', 'TC-1',
    '3-1', '3-11', '3E-1', 'T3-1', 'T3-4',
    'S1', 'S31', 'U1', 'U31', '01', '16',
    'F-1', 'F-2', 'LF-1', 'RF-1', 'TR-1', 'MR-1', 'M-1',
  ].forEach((blockCode) => {
    assert.ok(blockCodes.has(blockCode), `${blockCode} block should exist`);
  });

  ['블루존', '원정응원석', 'VIP석', '중앙 테이블석', 'SKY 지정석', '외야석', '스윗박스', '휠체어 장애인석', '3루', '홈 응원석', '대구', '삼성', '라팍'].forEach((alias) => {
    assert.ok(aliases.has(alias), `${alias} alias should exist`);
  });
});
