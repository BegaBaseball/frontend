import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SAJIK_BLOCKS,
  SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
  SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
  SAJIK_OFFICIAL_TRACE_REFERENCE,
  SAJIK_SEATMAP_IMAGE,
  SAJIK_TRACE_ANCHOR_TOLERANCE_PX,
  SAJIK_TRACE_BOUNDS_TOLERANCE_PX,
  SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO,
  SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX,
} from '../src/data/sajikSeatData.ts';
import {
  pathBounds,
  pathSubpathCount,
  pathToPoints as pathPoints,
  polygonArea,
} from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const alignmentAuditPath = path.join(outDir, 'sajik-seatmap-alignment-audit.json');

const P0_BLOCKS = new Set([
  '111',
  '112',
  '113',
  '114',
  '115',
  '116',
  '121',
  '122',
  '123',
  '124',
  '125',
  '126',
  '127',
  '131',
  '132',
  '133',
  '134',
  '135',
  '136',
  '137',
  '142',
  '143',
  '021',
  '031',
  '041',
]);
const P0_CATEGORIES = new Set(['ACCESSIBLE', 'CENTRAL_TABLE', 'CENTRAL_UPPER_TABLE', 'AVENUEL', 'CAMPING', 'CHEER_TABLE']);
const P1_CATEGORIES = new Set([
  'CHEER_TABLE',
  'WIDE_TABLE',
  'INFIELD_TABLE',
  'EVERYTIME',
  'INFIELD_FIELD_1B',
  'INFIELD_FIELD_3A',
  'INFIELD_FIELD_3B',
]);

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const writeCsv = async (filePath, rows) => {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
};

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const reviewTierForBlock = (block) => {
  if (P0_BLOCKS.has(block.block) || P0_CATEGORIES.has(block.category)) return 'P0';
  if (block.level === '1F' || P1_CATEGORIES.has(block.category)) return 'P1';
  return 'P2';
};

let alignmentSummary = null;
let alignmentByBlock = new Map();
try {
  const alignmentAudit = JSON.parse(await fs.readFile(alignmentAuditPath, 'utf8'));
  alignmentSummary = alignmentAudit.summary ?? null;
  alignmentByBlock = new Map((alignmentAudit.blocks ?? []).map((row) => [row.block, row]));
} catch {
  alignmentSummary = null;
  alignmentByBlock = new Map();
}

const blockRows = SAJIK_BLOCKS.map((block) => {
  const reference = SAJIK_OFFICIAL_TRACE_REFERENCE[block.block];
  if (!reference) {
    throw new Error(`Missing Sajik trace reference for block ${block.block}`);
  }

  const visualPath = block.imageGeometry.visualPath ?? block.imageGeometry.d;
  const hitPath = block.imageGeometry.hitPath ?? visualPath;
  const labelPoint = block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY];
  const points = pathPoints(visualPath);
  const area = Number(polygonArea(points).toFixed(2));
  const alignment = alignmentByBlock.get(block.block);

  return {
    id: block.id,
    block: block.block,
    name: block.name,
    level: block.level,
    side: block.side,
    category: block.category,
    fanRole: block.fanRole,
    sectionKind: block.sectionKind,
    markerType: block.markerType ?? '',
    reviewTier: reviewTierForBlock(block),
    labelAnchor: {
      x: labelPoint[0],
      y: labelPoint[1],
    },
    expectedBounds: reference.expectedBounds,
    currentBounds: pathBounds(visualPath),
    expectedSubpathCount: reference.expectedSubpathCount,
    actualSubpathCount: pathSubpathCount(visualPath),
    expectedPointCount: reference.expectedPointCount,
    actualPointCount: points.length,
    expectedArea: reference.expectedArea,
    actualArea: area,
    traceStatus: block.traceStatus,
    traceMethod: block.imageGeometry.traceMethod,
    traceSource: block.imageGeometry.traceSource,
    traceVersion: block.imageGeometry.traceVersion,
    manualReviewed: block.imageGeometry.manualReviewed,
    pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
    mapInteractionStatus: block.mapInteractionStatus,
    alignmentClass: alignment?.alignmentClass ?? 'NOT_RUN',
    componentInsidePathRatio: alignment?.componentInsidePathRatio ?? '',
    componentOutsideDilatedPathRatio: alignment?.componentOutsideDilatedPathRatio ?? '',
    maxComponentOutsidePathDistance: alignment?.maxComponentOutsidePathDistance ?? '',
    pathColorCoverageRatio: alignment?.pathColorCoverageRatio ?? '',
    manualReviewNote: block.imageGeometry.manualReviewNote,
    path: visualPath,
    visualPath,
    hitPath,
    geometryVersion: block.imageGeometry.geometryVersion,
  };
});

const missingBlocks = SAJIK_BLOCKS
  .map((block) => block.block)
  .filter((block) => !SAJIK_OFFICIAL_TRACE_REFERENCE[block]);
if (missingBlocks.length > 0) {
  throw new Error(`Missing Sajik trace references: ${missingBlocks.join(', ')}`);
}

const unexpectedReferences = Object.keys(SAJIK_OFFICIAL_TRACE_REFERENCE)
  .filter((block) => !SAJIK_BLOCKS.some((entry) => entry.block === block));
if (unexpectedReferences.length > 0) {
  throw new Error(`Unexpected Sajik trace references: ${unexpectedReferences.join(', ')}`);
}

const summary = {
  totalBlocks: blockRows.length,
  p0Blocks: blockRows.filter((row) => row.reviewTier === 'P0').length,
  p1Blocks: blockRows.filter((row) => row.reviewTier === 'P1').length,
  p2Blocks: blockRows.filter((row) => row.reviewTier === 'P2').length,
  officialImageTraced: blockRows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
  needsOperatorReview: blockRows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW').length,
  directOfficialTrace: blockRows.filter((row) => row.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length,
  officialPngManualPolygon: blockRows.filter((row) => row.traceSource === 'OFFICIAL_PNG_MANUAL_POLYGON').length,
  manualPolygonV2: blockRows.filter((row) => row.traceVersion === 'manual-polygon-v2').length,
  manualReviewed: blockRows.filter((row) => row.manualReviewed === true).length,
  unreviewedBlocks: blockRows.filter((row) => row.manualReviewed !== true).length,
  pixelAligned: blockRows.filter((row) => row.pixelAlignmentStatus === 'PIXEL_ALIGNED').length,
  manualReviewRequired: blockRows.filter((row) => row.pixelAlignmentStatus === 'MANUAL_REVIEW_REQUIRED').length,
  mapSelectable: blockRows.filter((row) => row.mapInteractionStatus === 'MAP_SELECTABLE').length,
  aliasOnlyOfficialPngBlockNotVisible: blockRows.filter((row) => row.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE').length,
  refinedPolygons: blockRows.filter((row) => row.actualPointCount > 4).length,
  alignmentLockedVerified: alignmentSummary?.lockedVerified ?? blockRows.filter((row) => row.alignmentClass === 'LOCKED_VERIFIED').length,
  officialPngBlockNotVisible: alignmentSummary?.officialPngBlockNotVisible ?? blockRows.filter((row) => row.alignmentClass === 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE').length,
  alignmentFailures: alignmentSummary?.officialAlignmentFailures ?? blockRows.filter((row) => row.alignmentClass !== 'LOCKED_VERIFIED').length,
  alignmentThresholds: {
    minComponentInsidePathRatio: SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
    minPathColorCoverageRatio: SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
    maxThinComponentOutsideDilatedPathRatio: SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO,
    maxThinComponentOutsidePathDistancePx: SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX,
  },
};

const priorityRows = ['P0', 'P1', 'P2'].map((tier) => {
  const rows = blockRows.filter((row) => row.reviewTier === tier);
  return [
    `\`${tier}\``,
    String(rows.length),
    String(rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length),
    String(rows.filter((row) => row.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length),
    String(rows.filter((row) => row.traceVersion === 'manual-polygon-v2').length),
    String(rows.filter((row) => row.actualPointCount > 4).length),
    String(rows.filter((row) => row.manualReviewed).length),
    String(rows.filter((row) => row.pixelAlignmentStatus === 'PIXEL_ALIGNED').length),
    rows.map((row) => row.block).join(' '),
  ];
});

const manifest = {
  generatedAt: new Date().toISOString(),
  asset: SAJIK_SEATMAP_IMAGE,
  tolerances: {
    anchorPx: SAJIK_TRACE_ANCHOR_TOLERANCE_PX,
    boundsPx: SAJIK_TRACE_BOUNDS_TOLERANCE_PX,
  },
  summary,
  reviewTiers: {
    P0: {
      label: 'accessible, central/table/special and representative blocks',
      blocks: blockRows.filter((row) => row.reviewTier === 'P0').map((row) => row.block),
    },
    P1: {
      label: '1F infield, cheer and table blocks',
      blocks: blockRows.filter((row) => row.reviewTier === 'P1').map((row) => row.block),
    },
    P2: {
      label: 'remaining upper and outfield blocks',
      blocks: blockRows.filter((row) => row.reviewTier === 'P2').map((row) => row.block),
    },
  },
  blocks: blockRows,
};

const markdown = [
  '# 사직야구장 좌석도 trace review manifest',
  '',
  `- 공식 이미지: \`${SAJIK_SEATMAP_IMAGE.requiredAssetFileName}\` (${SAJIK_SEATMAP_IMAGE.imageWidth}x${SAJIK_SEATMAP_IMAGE.imageHeight})`,
  `- total blocks: ${summary.totalBlocks}`,
  `- official image traced: ${summary.officialImageTraced}`,
  `- direct official-image path trace: ${summary.directOfficialTrace}`,
  `- trace source: ${summary.officialPngManualPolygon} OFFICIAL_PNG_MANUAL_POLYGON`,
  `- trace version: ${summary.manualPolygonV2} manual-polygon-v2`,
  `- refined polygons (>4 points): ${summary.refinedPolygons}`,
  `- manual reviewed: ${summary.manualReviewed}`,
  `- unreviewed blocks: ${summary.unreviewedBlocks}`,
  `- pixel aligned: ${summary.pixelAligned}`,
  `- manual review required: ${summary.manualReviewRequired}`,
  `- map selectable: ${summary.mapSelectable}`,
  `- alias-only official PNG block not visible: ${summary.aliasOnlyOfficialPngBlockNotVisible}`,
  `- alignment locked verified: ${summary.alignmentLockedVerified}`,
  `- official PNG block not visible: ${summary.officialPngBlockNotVisible}`,
  `- alignment failures: ${summary.alignmentFailures}`,
  `- alignment thresholds: component>=${SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO}, coverage>=${SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO}, thinOutside<=${SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO}, thinMaxDistance<=${SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX}`,
  `- needs operator review: ${summary.needsOperatorReview || '-'}`,
  '',
  '## 검수 우선순위',
  '',
  markdownTable(
    ['tier', 'blocks', 'official traced', 'direct trace', 'v2 trace', '>4 point', 'manual reviewed', 'pixel aligned', 'block list'],
    priorityRows,
  ),
  '',
  '## 사용 방법',
  '',
  '1. `npm run stadium:sajik:alignment-audit`를 실행해 공식 PNG 픽셀 정합을 먼저 검증합니다.',
  '2. `/stadium?sajikDebug=1`에서 P0 -> P1 -> P2 순서로 공식 이미지와 overlay를 비교합니다.',
  '3. 모든 블럭은 `PATH_TRACED_FROM_OFFICIAL_IMAGE`, `OFFICIAL_PNG_MANUAL_POLYGON`, `manual-polygon-v2`, `manualReviewed=true` 상태여야 하며, 공식 PNG 색상 블럭이 확인되는 블럭은 `PIXEL_ALIGNED` 상태여야 합니다.',
  '4. 공식 PNG에서 색상 블럭이 보이지 않는 운영 호환 블럭은 `ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE`로 보존하고 SVG hit-area에서는 렌더링하지 않습니다.',
  '5. 좌표 변경 후 `npm run stadium:sajik:evidence`, `npm run test:stadium:seatmaps`, `npm run qa:stadium:sajik:trace-review`를 통과시킵니다.',
  '',
].join('\n');

await fs.mkdir(outDir, { recursive: true });

const jsonPath = path.join(outDir, 'sajik-seatmap-trace-review.json');
const csvPath = path.join(outDir, 'sajik-seatmap-trace-review.csv');
const markdownPath = path.join(outDir, 'sajik-seatmap-trace-review.md');

await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'block',
    'name',
    'level',
    'side',
    'category',
    'fanRole',
    'reviewTier',
    'labelAnchorX',
    'labelAnchorY',
    'expectedBounds',
    'currentBounds',
    'expectedSubpathCount',
    'actualSubpathCount',
    'expectedPointCount',
    'actualPointCount',
    'expectedArea',
    'actualArea',
    'traceStatus',
    'traceMethod',
    'traceSource',
    'traceVersion',
    'manualReviewed',
    'pixelAlignmentStatus',
    'mapInteractionStatus',
    'alignmentClass',
    'componentInsidePathRatio',
    'componentOutsideDilatedPathRatio',
    'maxComponentOutsidePathDistance',
    'pathColorCoverageRatio',
    'manualReviewNote',
    'path',
  ],
  ...blockRows.map((block) => [
    block.id,
    block.block,
    block.name,
    block.level,
    block.side,
    block.category,
    block.fanRole,
    block.reviewTier,
    block.labelAnchor.x,
    block.labelAnchor.y,
    JSON.stringify(block.expectedBounds),
    JSON.stringify(block.currentBounds),
    block.expectedSubpathCount,
    block.actualSubpathCount,
    block.expectedPointCount,
    block.actualPointCount,
    block.expectedArea,
    block.actualArea,
    block.traceStatus,
    block.traceMethod,
    block.traceSource,
    block.traceVersion,
    block.manualReviewed,
    block.pixelAlignmentStatus,
    block.mapInteractionStatus,
    block.alignmentClass,
    block.componentInsidePathRatio,
    block.componentOutsideDilatedPathRatio,
    block.maxComponentOutsidePathDistance,
    block.pathColorCoverageRatio,
    block.manualReviewNote,
    block.path,
  ]),
]);
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`manifest_json:${jsonPath}`);
console.log(`manifest_csv:${csvPath}`);
console.log(`manifest_markdown:${markdownPath}`);
console.log(`status:ok total=${summary.totalBlocks} p0=${summary.p0Blocks} p1=${summary.p1Blocks} p2=${summary.p2Blocks} official=${summary.officialImageTraced} direct=${summary.directOfficialTrace} source=${summary.officialPngManualPolygon} version=${summary.manualPolygonV2} refined=${summary.refinedPolygons} reviewed=${summary.manualReviewed} pixelAligned=${summary.pixelAligned} mapSelectable=${summary.mapSelectable} aliasOnlyNotVisible=${summary.aliasOnlyOfficialPngBlockNotVisible} notVisible=${summary.officialPngBlockNotVisible} alignmentLocked=${summary.alignmentLockedVerified} alignmentFailures=${summary.alignmentFailures}`);
