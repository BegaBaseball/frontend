import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DAEGU_BLOCKS,
  DAEGU_CATEGORIES,
  DAEGU_CATEGORY_GROUPS,
  DAEGU_CANONICAL_SEATMAP_SOURCE_ID,
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
import {
  DAEGU_CANONICAL_BLOCKS,
  DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS,
  DAEGU_CANONICAL_SEATMAP_IMAGE,
  DAEGU_CANONICAL_SEATMAP_SUMMARY,
  validateDaeguCanonicalSeatMap,
} from './daeguCanonicalSeatMap';
import { validateSeatMapPolygonPath } from '../utils/seatMapPolygonValidator';

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
const DAEGU_CANONICAL_OFFICIAL_ONLY_RETRACE_WORKSET_SOURCE = readFileSync(
  new URL('../../scripts/daegu-seatmap-canonical-official-only-retrace-workset.mjs', import.meta.url),
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
const OFFICIAL_ASSET_URL = new URL('../assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.webp', import.meta.url);
const OPERATOR_REFERENCE_RAPAK_2025_ASSET_URL = new URL('../assets/stadiums/samsung/daegu-operator-reference-rapak-2025-enhanced-transparent.webp', import.meta.url);
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
    packageSource.includes(`"${scriptName}": "node scripts/qa-presets.mjs stadium daegu ${operationName}"`),
    `${scriptName} should route through qa-presets stadium dispatcher`,
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

function webpDimensions(assetUrl: URL) {
  const buffer = readFileSync(assetUrl);
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');

  for (let offset = 12; offset + 8 <= buffer.length;) {
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const payloadOffset = offset + 8;

    if (chunkType === 'VP8 ') {
      return {
        width: buffer.readUInt16LE(payloadOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(payloadOffset + 8) & 0x3fff,
      };
    }

    if (chunkType === 'VP8L') {
      const bits = buffer.readUInt32LE(payloadOffset + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }

    if (chunkType === 'VP8X') {
      return {
        width: buffer.readUIntLE(payloadOffset + 4, 3) + 1,
        height: buffer.readUIntLE(payloadOffset + 7, 3) + 1,
      };
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  throw new Error('WebP dimensions could not be read');
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
  assert.equal(DAEGU_SEATMAP_IMAGE.requiredAssetFileName, 'daegu-samsung-seatmap-official-2026.webp');
  assert.equal(DAEGU_SEATMAP_IMAGE.viewBox, '0 0 1707 2048');
  assert.equal(DAEGU_SEATMAP_IMAGE.imageSha256, '0d3926764aa1ced440804a1cfb1519e6f54eb1c4835e56e64bec3597d984640a');
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

test('대구 공식 WebP 실제 크기는 데이터 좌표계와 일치한다', () => {
  const dimensions = webpDimensions(OFFICIAL_ASSET_URL);
  assert.equal(dimensions.width, 1707);
  assert.equal(dimensions.height, 2048);
  assert.equal(dimensions.width, DAEGU_SEATMAP_IMAGE.imageWidth);
  assert.equal(dimensions.height, DAEGU_SEATMAP_IMAGE.imageHeight);
  assert.equal(fileSha256(OFFICIAL_ASSET_URL), DAEGU_SEATMAP_IMAGE.imageSha256);
});

test('대구 MySeatCheck reference source는 canonical 좌석도와 분리된 pending asset으로만 등록된다', () => {
  const canonicalSource = DAEGU_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === 'DAEGU_CANONICAL_2026');
  const officialSource = DAEGU_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === 'SAMSUNG_OFFICIAL_2026');
  const mySeatCheckSource = DAEGU_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === 'MYSEATCHECK_REFERENCE_2026');

  assert.equal(DAEGU_DEFAULT_SEATMAP_SOURCE_ID, DAEGU_CANONICAL_SEATMAP_SOURCE_ID);
  assert.ok(canonicalSource, 'canonical Daegu source reference should exist');
  assert.ok(officialSource, 'official Daegu source reference should exist');
  assert.ok(mySeatCheckSource, 'MySeatCheck reference source should exist');
  assert.equal(canonicalSource.kind, 'INTERACTIVE_SEATMAP');
  assert.equal(canonicalSource.assetStatus, 'CANONICAL');
  assert.equal(canonicalSource.polygonStatus, 'CANONICAL_INTERACTIVE');
  assert.equal(canonicalSource.productionCanonical, true, 'canonical source should be the only production runtime source');
  assert.equal(canonicalSource.imageWidth, 4096);
  assert.equal(canonicalSource.imageHeight, 4096);
  assert.equal(canonicalSource.imageSha256, DAEGU_OPERATOR_REFERENCE_RAPAK_2025_IMAGE_SHA256);
  assert.equal(officialSource.kind, 'REFERENCE_IMAGE');
  assert.equal(officialSource.productionCanonical, false, 'official source should stay historical after canonical consolidation');
  assert.equal(officialSource.polygonStatus, 'HISTORICAL_EVIDENCE_ONLY');
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
    /Do not replace the official image or promote coordinates/,
    'external reference should not be allowed to replace canonical official coordinates',
  );
});

;

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
    'operator reference paths should contain 4096-space x coordinates beyond the 1707 official image width',
  );
  assert.equal(DAEGU_SEATMAP_VIEWPORT.width, 1707, 'official image viewport should stay 1707 wide');
  assert.equal(DAEGU_SEATMAP_VIEWPORT.height, 2048, 'official image viewport should stay 2048 high');
});

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

;

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
    ['대구', '삼성', '라팍', '라이온즈파크', '삼성라이온즈파크', '대구삼성라이온즈파크', '대구 삼성 라이온즈파크', '대구 삼성 라이온즈 파크', block.block, block.name].forEach((alias) => {
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

;

;

;

;

;

;

;

;

;

;

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
    packageSource.includes('"stadium:daegu:qa-ownership-audit": "node scripts/qa-presets.mjs stadium daegu qa-ownership-audit"'),
    'QA ownership audit should run through the qa-presets stadium dispatcher',
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
    '`npm run stadium:daegu:qa-ownership-audit`: `passed`',
    '`reports/stadium/daegu-seatmap-qa-ownership-audit.{json,csv,md}`',
    'active runtime source overlaps: `0` block keys',
    'active QA owner conflicts: `0` block keys',
    'active tracing owner conflicts: `0` block keys',
    'marker-in-seat-QA rows: `0`',
    'unconfirmed selectable trace rows: `0`',
    'pending operator trace block keys: `58`',
    'active canonical selectable blocks: `130`',
    'target canonical selectable blocks: `188`',
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
    packageSource.includes('"stadium:daegu:canonical-block-decision-guard": "node scripts/qa-presets.mjs stadium daegu canonical-block-decision-guard"'),
    'canonical block decision guard should run through the qa-presets stadium dispatcher',
  );
  assert.ok(
    DAEGU_CANONICAL_BLOCK_DECISION_GUARD_SOURCE.includes("buildDaeguCanonicalBlockDecisionReport"),
    'canonical block decision guard should use the shared data builder',
  );
  assert.deepEqual(validateDaeguCanonicalBlockDecisions(), []);
  assert.deepEqual(validateDaeguCanonicalSeatMap(), []);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.status, 'review-required');
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.totalBlockKeys, 191);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.canonicalSelectableBlockKeys, 130);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.activeCanonicalSelectableBlockKeys, 130);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.pendingOperatorTraceBlockKeys, 58);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.targetCanonicalSelectableBlockKeys, 188);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.operatorOverlapCanonicalBlockKeys, 108);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.officialOnlyCanonicalBlockKeys, 0);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.operatorOnlyCanonicalBlockKeys, 22);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.markerAliasSeparationRequiredBlockKeys, 3);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.blockedUnconfirmedBlockKeys, 2);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.geometryIssueBlockKeys, 0);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.canonicalSourceCounts[DAEGU_CANONICAL_OPERATOR_SOURCE_ID], 130);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.canonicalSourceCounts[DAEGU_CANONICAL_OFFICIAL_SOURCE_ID] ?? 0, 0);
  assert.equal(DAEGU_CANONICAL_BLOCKS.length, 130);
  assert.equal(DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.length, 58);
  assert.equal(DAEGU_CANONICAL_SEATMAP_SUMMARY.activeSelectableBlocks, 130);
  assert.equal(DAEGU_CANONICAL_SEATMAP_SUMMARY.pendingOperatorTraceBlocks, 58);
  assert.equal(DAEGU_CANONICAL_SEATMAP_SUMMARY.targetSelectableBlocks, 188);
  assert.equal(DAEGU_CANONICAL_SEATMAP_SUMMARY.mixedCoordinateRuntimePolygons, 0);
  assert.equal(DAEGU_CANONICAL_SEATMAP_IMAGE.imageWidth, 4096);
  assert.equal(DAEGU_CANONICAL_SEATMAP_IMAGE.imageHeight, 4096);
  assert.equal(DAEGU_CANONICAL_SEATMAP_IMAGE.imageSha256, DAEGU_OPERATOR_REFERENCE_RAPAK_2025_IMAGE_SHA256);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_POLICY.overlapDefault, DAEGU_CANONICAL_OPERATOR_SOURCE_ID);
  assert.equal(DAEGU_CANONICAL_BLOCK_DECISION_POLICY.officialOnlyDefault, 'PENDING_OPERATOR_TRACE');
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
    'PENDING_OPERATOR_TRACE',
    'ACTIVE_POLYGON_SOURCE_OVERLAP_RESOLVED_TO_OPERATOR',
    'BLOCKED_UNCONFIRMED_NO_SELECTABLE_CANONICAL',
    'MARKER_ALIAS_SEPARATION_REQUIRED',
    'Every selectable canonical block key resolves to at most one source.',
    'pending operator trace block keys',
    'target canonical selectable block keys',
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
    'active canonical selectable block keys: `130`',
    'pending operator trace block keys: `58`',
    'target canonical selectable block keys: `188`',
    '`CANONICAL_OPERATOR_FROM_OVERLAP`: `108` block keys',
    '`PENDING_OPERATOR_TRACE`: `58` block keys',
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

test('대구 official-only retrace workset은 58개 블럭을 4096 operator 좌표 승인 전까지 runtime에서 제외한다', () => {
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const releaseLockSource = readFileSync(new URL('../../docs/daegu-seatmap-release-lock.md', import.meta.url), 'utf8');

  assert.ok(
    packageSource.includes('"stadium:daegu:canonical-official-only-retrace-workset"'),
    'official-only retrace workset package script should exist',
  );
  assert.ok(
    packageSource.includes('"stadium:daegu:canonical-official-only-retrace-workset": "node scripts/qa-presets.mjs stadium daegu canonical-official-only-retrace-workset"'),
    'official-only retrace workset should run through the qa-presets stadium dispatcher',
  );

  [
    'DAEGU_CANONICAL_OFFICIAL_ONLY_RETRACE_WORKSET_V1',
    'simpleScaleOrCopyAllowed: false',
    'sourceDataWritePerformed: false',
    'PENDING_OPERATOR_TRACE',
    'pending_operator_trace',
    'target_canonical_selectable',
    'daegu-seatmap-canonical-official-only-retrace-workset.json',
    'daegu-seatmap-canonical-official-only-retrace-workset.csv',
    'daegu-seatmap-canonical-official-only-retrace-workset.md',
  ].forEach((requiredText) => {
    assert.ok(
      DAEGU_CANONICAL_OFFICIAL_ONLY_RETRACE_WORKSET_SOURCE.includes(requiredText),
      `Daegu official-only retrace workset should include ${requiredText}`,
    );
  });

  [
    '## Official-only operator retrace workset (2026-05-26)',
    '`npm run stadium:daegu:canonical-official-only-retrace-workset`: `review-required`',
    '`reports/stadium/daegu-seatmap-canonical-official-only-retrace-workset/`',
    'pending operator trace block keys: `58`',
    'simple scale/copy from `1707x2048` official image to `4096x4096` operator reference is forbidden',
    'generated retrace workset reports are QA evidence only and must not be staged as PR payload',
  ].forEach((requiredText) => {
    assert.ok(
      releaseLockSource.includes(requiredText),
      `Daegu release lock should summarize retrace workset evidence: ${requiredText}`,
    );
  });
});

test('대구 좌석도는 DAEGU_CANONICAL_2026 단일 4096 source만 렌더링한다', () => {
  const seatMapSource = readFileSync(new URL('../components/daegu/DaeguSeatMap.tsx', import.meta.url), 'utf8');
  const svgSource = readFileSync(new URL('../components/daegu/DaeguSeatMapSvg.tsx', import.meta.url), 'utf8');

  assert.ok(seatMapSource.includes('DAEGU_CANONICAL_BLOCKS'), 'Daegu seatmap should use the canonical runtime block dataset');
  assert.ok(seatMapSource.includes('DAEGU_CANONICAL_SEATMAP_IMAGE'), 'Daegu seatmap attribution should use the canonical image');
  assert.ok(seatMapSource.includes('canonical 좌석도'), 'Daegu seatmap subtitle should expose canonical runtime status');
  assert.ok(svgSource.includes('DAEGU_CANONICAL_SEATMAP_VIEWPORT'), 'SVG renderer should use the canonical 4096 viewport');
  assert.ok(svgSource.includes(DAEGU_OPERATOR_REFERENCE_RAPAK_2025_REQUIRED_ASSET_FILE_NAME), 'canonical renderer should use the uploaded operator-reference asset');
  assert.ok(svgSource.includes('data-image-view-mode="canonical"'), 'SVG should expose fixed canonical mode for QA');
  assert.ok(svgSource.includes('renderBlocks.length > 0'), 'interactive layers should be driven by the canonical dataset');
  assert.equal(seatMapSource.includes('data-testid="daegu-seatmap-image-mode-toggle"'), false, 'Daegu seatmap should not expose a user source toggle');
  assert.equal(seatMapSource.includes('setImageViewMode'), false, 'Daegu seatmap should not keep image view mode state');
  assert.equal(seatMapSource.includes('DAEGU_OPERATOR_REFERENCE_BLOCKS'), false, 'operator source rows should not compete in the user runtime');
  assert.equal(seatMapSource.includes('DAEGU_BLOCKS'), false, 'official source rows should not compete in the user runtime');
  assert.equal(seatMapSource.includes('daegu-seatmap-mode-operator-reference'), false, 'operator source toggle should be removed');
  assert.equal(seatMapSource.includes('daegu-seatmap-mode-official-png'), false, 'official source toggle should be removed');
  assert.equal(svgSource.includes("imageViewMode === 'operatorReference'"), false, 'SVG renderer should not branch by legacy source mode');
  assert.equal(svgSource.includes('data-image-view-mode={imageViewMode}'), false, 'SVG should not expose mutable source mode');
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
