import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_SEATMAP_IMAGE,
  DAEGU_SEATMAP_VIEWPORT,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const pixelComponentsPath = path.join(outDir, 'daegu-seatmap-pixel-components.json');
const ALIGNMENT_AUDIT_STANDARD = 'DAEGU_ALIGNMENT_AUDIT_V1';
const MIN_COMPONENT_INSIDE_RATIO = 0.65;
const MIN_PATH_COLOR_COVERAGE_RATIO = 0.65;
const operatorDecisionOptions = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE'];
const operatorReviewInputFields = [
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'operatorNote',
];

const round = (value, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

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

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const pathBounds = (pathData) => {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const xs = [];
  const ys = [];
  for (let index = 0; index < numbers.length; index += 2) {
    xs.push(numbers[index]);
    ys.push(numbers[index + 1]);
  }
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

const pathPoints = (pathData) => {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const geometryPaths = (block) => (
  block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d]
);

const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + (point[0] * next[1]) - (next[0] * point[1]);
}, 0) / 2);

const blockArea = (block) => geometryPaths(block)
  .map(pathPoints)
  .reduce((total, points) => total + polygonArea(points), 0);

const distanceToSegment = (point, start, end) => {
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
};

const pointOnPolygonBoundary = (point, polygon, tolerance = 0.75) => {
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (distanceToSegment(point, start, end) <= tolerance) return true;
  }
  return false;
};

const pointInPolygon = (point, polygon) => {
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
};

const pointInAnyPath = (point, block) => geometryPaths(block)
  .map(pathPoints)
  .some((points) => pointInPolygon(point, points));

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const pixelComponents = await readJson(pixelComponentsPath);
const candidateByBlockId = new Map(pixelComponents.blocks.map((block) => [block.id, block.candidate]));
const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));
const renderBlocks = [...DAEGU_BLOCKS].sort((a, b) => blockArea(b) - blockArea(a));

const topHitBlockAt = (point) => {
  let topBlock = null;
  renderBlocks.forEach((block) => {
    if (pointInAnyPath(point, block)) {
      topBlock = block;
    }
  });
  return topBlock;
};

const tracePriority = (block, candidate) => {
  if (block.category === 'ACCESSIBLE') return 'P0';
  if (['VIP', 'TABLE', 'BLUE', 'AWAY'].includes(block.category)) return 'P1';
  if (candidate?.status === 'PIXEL_CANDIDATE_READY' && candidate.componentInsidePathRatio >= 0.85) return 'P2';
  if (candidate?.status === 'PIXEL_CANDIDATE_READY') return 'P3';
  return 'P4';
};

const blockRows = DAEGU_BLOCKS.map((block) => {
  const candidate = candidateByBlockId.get(block.id) ?? null;
  return {
    id: block.id,
    block: block.block,
    name: block.name,
    category: block.category,
    level: block.level,
    side: block.side,
    fanRole: block.fanRole,
    sourceConfidence: block.sourceConfidence,
    traceStatus: block.traceStatus,
    traceMethod: block.traceMethod,
    reviewNote: block.reviewNote,
    tracePriority: tracePriority(block, candidate),
    currentPathBounds: pathBounds(block.imageGeometry.d),
    currentPath: block.imageGeometry.d,
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    label: block.imageGeometry.shortLabel,
    candidateStatus: candidate?.status ?? 'MISSING_PIXEL_REPORT',
    candidateArea: candidate?.area ?? '',
    candidateCenter: candidate?.center ?? '',
    candidateBbox: candidate?.bbox ?? '',
    candidateHullPath: candidate?.hullPath ?? '',
    candidateOuterBoundaryPath: candidate?.outerBoundaryPath ?? '',
    candidateOuterBoundaryPointCount: candidate?.outerBoundaryPointCount ?? '',
    candidateBoundaryPath: candidate?.boundaryPath ?? '',
    candidateBoundaryPointCount: candidate?.boundaryPointCount ?? '',
    componentInsidePathRatio: candidate?.componentInsidePathRatio ?? '',
    pathColorCoverageRatio: candidate?.pathColorCoverageRatio ?? '',
    candidateDuplicateGroup: '',
    candidateDuplicateIds: '',
    candidateDuplicateBoundaryResolved: false,
    candidateDuplicatePeerLabelConflicts: [],
    operatorDecision: 'PENDING',
    correctedPath: '',
    reviewer: '',
    reviewedAt: '',
    operatorNote: '',
    reviewAction: block.sourceConfidence === 'OFFICIAL'
      ? 'Already marked as official traced.'
      : 'Do not promote automatically. Compare candidateOuterBoundaryPath, candidateBoundaryPath, and candidateHullPath with official PNG/debug overlay, then manually trace and review.',
  };
});

const candidateDuplicateGroups = blockRows.reduce((groups, row) => {
  if (row.candidateStatus !== 'PIXEL_CANDIDATE_READY' || !row.candidateBbox || !row.candidateArea) {
    return groups;
  }
  const bbox = row.candidateBbox;
  const key = [
    bbox.minX,
    bbox.minY,
    bbox.maxX,
    bbox.maxY,
    row.candidateArea,
  ].join(':');
  const group = groups.get(key) ?? [];
  group.push(row);
  groups.set(key, group);
  return groups;
}, new Map());

let duplicateGroupIndex = 0;
candidateDuplicateGroups.forEach((rows) => {
  if (rows.length < 2) return;
  duplicateGroupIndex += 1;
  const groupId = `D${String(duplicateGroupIndex).padStart(2, '0')}`;
  const ids = rows.map((row) => row.id).join(' ');
  rows.forEach((row) => {
    row.candidateDuplicateGroup = groupId;
    row.candidateDuplicateIds = ids;
    row.reviewAction = 'Do not promote automatically. Pixel candidate is shared by multiple blocks; manually trace each official boundary.';
  });
});

const duplicateBoundaryReviewForRow = (row) => {
  if (!row.candidateDuplicateGroup) {
    return {
      resolved: false,
      peerLabelConflicts: [],
    };
  }

  const block = blockById.get(row.id);
  if (!block) {
    return {
      resolved: false,
      peerLabelConflicts: [],
    };
  }

  const peerLabelConflicts = row.candidateDuplicateIds
    .split(' ')
    .map((blockId) => blockById.get(blockId))
    .filter((duplicateBlock) => duplicateBlock && duplicateBlock.id !== row.id)
    .map((duplicateBlock) => {
      const point = [duplicateBlock.imageGeometry.labelX, duplicateBlock.imageGeometry.labelY];
      const topHit = topHitBlockAt(point);
      return {
        blockId: duplicateBlock.id,
        block: duplicateBlock.block,
        point: point.map((value) => round(value, 1)),
        insideCurrentPath: pointInAnyPath(point, block),
        topHitBlockId: topHit?.id ?? null,
        topHitBlock: topHit?.block ?? null,
        topHitIsCurrentBlock: topHit?.id === row.id,
      };
    })
    .filter((peerLabel) => peerLabel.insideCurrentPath || peerLabel.topHitIsCurrentBlock);

  const hasSeparateBoundary = row.componentInsidePathRatio !== ''
    && row.componentInsidePathRatio < 0.98
    && row.labelInsideCurrentPath
    && row.labelTopHitOk;

  return {
    resolved: hasSeparateBoundary && peerLabelConflicts.length === 0,
    peerLabelConflicts,
  };
};

const officialFailureReasons = (row) => {
  const reasons = [];
  if (!row.labelInsideCurrentPath) reasons.push('LABEL_OUTSIDE_CURRENT_PATH');
  if (!row.labelTopHitOk) reasons.push('LABEL_TOP_HIT_MISMATCH');
  if (row.candidateStatus !== 'PIXEL_CANDIDATE_READY') reasons.push('PIXEL_CANDIDATE_NOT_READY');
  if (row.candidateDuplicateGroup && !row.candidateDuplicateBoundaryResolved) {
    reasons.push('PIXEL_CANDIDATE_DUPLICATE');
  }
  if (row.componentInsidePathRatio !== '' && row.componentInsidePathRatio < MIN_COMPONENT_INSIDE_RATIO) {
    reasons.push('LOW_COMPONENT_INSIDE_CURRENT_PATH');
  }
  if (row.pathColorCoverageRatio !== '' && row.pathColorCoverageRatio < MIN_PATH_COLOR_COVERAGE_RATIO) {
    reasons.push('LOW_CURRENT_PATH_COLOR_COVERAGE');
  }
  return reasons;
};

const classifyAlignment = (row, reasons) => {
  if (row.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
    return reasons.length === 0 ? 'LOCKED_VERIFIED' : 'RETRACE_REQUIRED';
  }

  if (
    row.candidateStatus === 'PIXEL_CANDIDATE_READY'
    && !row.candidateDuplicateGroup
    && row.componentInsidePathRatio !== ''
    && row.pathColorCoverageRatio !== ''
    && row.componentInsidePathRatio >= MIN_COMPONENT_INSIDE_RATIO
    && row.pathColorCoverageRatio >= MIN_PATH_COLOR_COVERAGE_RATIO
  ) {
    return 'RETRACE_REQUIRED';
  }

  return 'OPERATOR_REQUIRED';
};

blockRows.forEach((row) => {
  const block = blockById.get(row.id);
  const labelPoint = [row.labelX, row.labelY];
  const labelTopHit = topHitBlockAt(labelPoint);
  const duplicateCategories = row.candidateDuplicateIds
    ? [...new Set(row.candidateDuplicateIds.split(' ')
      .map((id) => blockById.get(id)?.category)
      .filter(Boolean))]
    : [];

  row.alignmentStandard = ALIGNMENT_AUDIT_STANDARD;
  row.labelInsideCurrentPath = block ? pointInAnyPath(labelPoint, block) : false;
  row.labelTopHitBlockId = labelTopHit?.id ?? '';
  row.labelTopHitBlock = labelTopHit?.block ?? '';
  row.labelTopHitOk = labelTopHit?.id === row.id;
  row.candidateDuplicateCategories = duplicateCategories.join(' ');
  row.semanticRisk = duplicateCategories.length > 1 ? 'CANDIDATE_DUPLICATE_CROSS_CATEGORY' : '';
  const duplicateBoundaryReview = duplicateBoundaryReviewForRow(row);
  row.candidateDuplicateBoundaryResolved = duplicateBoundaryReview.resolved;
  row.candidateDuplicatePeerLabelConflicts = duplicateBoundaryReview.peerLabelConflicts;

  const reasons = officialFailureReasons(row);
  row.officialFailureReasons = reasons;
  row.alignmentClass = classifyAlignment(row, reasons);
  if (row.traceStatus === 'OFFICIAL_IMAGE_TRACED' && reasons.length === 0) {
    row.reviewAction = 'Locked verified by Daegu alignment audit.';
  } else if (row.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
    row.reviewAction = 'Demote to NEEDS_OPERATOR_REVIEW until the official path is retraced or operator-approved.';
  } else if (row.candidateDuplicateBoundaryResolved) {
    row.reviewAction = 'Shared pixel candidate boundary was resolved by an operator-approved separated path.';
  } else if (row.candidateDuplicateGroup) {
    row.reviewAction = 'Do not promote automatically. Pixel candidate is shared by multiple blocks; manually trace each official boundary.';
  } else if (row.alignmentClass === 'RETRACE_REQUIRED') {
    row.reviewAction = 'Manual retrace from official PNG candidate is possible, but promotion still needs review.';
  } else {
    row.reviewAction = 'Operator corrected path is required before promotion.';
  }
});

const alignmentCounts = blockRows.reduce((counts, row) => {
  counts[row.alignmentClass] = (counts[row.alignmentClass] ?? 0) + 1;
  return counts;
}, {});

const officialAlignmentFailures = blockRows.filter((row) => (
  row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
  && row.alignmentClass !== 'LOCKED_VERIFIED'
));

const summary = {
  alignmentStandard: ALIGNMENT_AUDIT_STANDARD,
  totalBlocks: blockRows.length,
  lockedVerified: alignmentCounts.LOCKED_VERIFIED ?? 0,
  retraceRequired: alignmentCounts.RETRACE_REQUIRED ?? 0,
  operatorRequired: alignmentCounts.OPERATOR_REQUIRED ?? 0,
  officialAlignmentFailures: officialAlignmentFailures.length,
  labelTopHitFailures: blockRows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED' && !row.labelTopHitOk).length,
  officialImageTraced: blockRows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
  needsOperatorReview: blockRows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW').length,
  legacyScaledPolygon: blockRows.filter((row) => row.traceMethod === 'LEGACY_SCALED_POLYGON').length,
  directOfficialTrace: blockRows.filter((row) => row.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length,
  pixelCandidateReady: blockRows.filter((row) => row.candidateStatus === 'PIXEL_CANDIDATE_READY').length,
  candidateNeedsManualTrace: blockRows.filter((row) => row.candidateStatus === 'NEEDS_MANUAL_TRACE').length,
  missingPixelCandidate: blockRows.filter((row) => row.candidateStatus === 'NO_SEED_COLOR' || row.candidateStatus === 'NO_COMPONENT').length,
  duplicatePixelCandidateGroups: duplicateGroupIndex,
  duplicatePixelCandidateBlocks: blockRows.filter((row) => row.candidateDuplicateGroup).length,
  duplicatePixelCandidateBoundaryResolvedBlocks: blockRows
    .filter((row) => row.candidateDuplicateBoundaryResolved).length,
  officialCandidateDuplicateRawBlocks: blockRows.filter((row) => (
    row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
    && row.candidateDuplicateGroup
  )).length,
  officialCandidateDuplicateBlocks: blockRows.filter((row) => (
    row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
    && row.candidateDuplicateGroup
    && !row.candidateDuplicateBoundaryResolved
  )).length,
  sourceConfidence: blockRows.reduce((counts, block) => {
    counts[block.sourceConfidence] = (counts[block.sourceConfidence] ?? 0) + 1;
    return counts;
  }, {}),
  alignmentThresholds: {
    minComponentInsidePathRatio: MIN_COMPONENT_INSIDE_RATIO,
    minPathColorCoverageRatio: MIN_PATH_COLOR_COVERAGE_RATIO,
  },
  viewport: DAEGU_SEATMAP_VIEWPORT,
};

const manifest = {
  generatedAt: new Date().toISOString(),
  asset: DAEGU_SEATMAP_IMAGE,
  operatorReviewContract: {
    inputFields: operatorReviewInputFields,
    decisionOptions: operatorDecisionOptions,
    requiredForPromotion: [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ],
    nonAutomaticPromotion: true,
    note: 'Only operator-approved correctedPath values may be copied into daeguSeatData.ts in a separate reviewed data diff.',
  },
  summary,
  blocks: blockRows,
};

const priorityReviewRows = blockRows.filter((row) => row.tracePriority === 'P0' || row.tracePriority === 'P1');
const priorityReviewSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1707" height="2048" viewBox="0 0 1707 2048">',
  '  <style>',
  '    .grid { stroke: #0f172a; stroke-opacity: 0.22; stroke-width: 1; }',
  '    .current { fill: rgba(239, 68, 68, 0.12); stroke: #ef4444; stroke-width: 2; vector-effect: non-scaling-stroke; }',
  '    .candidate { fill: rgba(6, 182, 212, 0.14); stroke: #06b6d4; stroke-width: 2; stroke-dasharray: 8 5; vector-effect: non-scaling-stroke; }',
  '    .label { font: 700 14px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
  '  </style>',
  '  <image href="../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png" x="0" y="0" width="1707" height="2048" preserveAspectRatio="none" />',
  ...Array.from({ length: Math.floor(1707 / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="2048" />`),
  ...Array.from({ length: Math.floor(2048 / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="1707" y2="${index * 100}" />`),
  '  <g id="current-paths">',
  ...priorityReviewRows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.tracePriority} ${row.block} current`)}</title></path>`),
  '  </g>',
  '  <g id="pixel-candidates">',
  ...priorityReviewRows
    .filter((row) => row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)
    .map((row) => `    <path class="candidate" d="${xmlEscape(row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)}"><title>${xmlEscape(`${row.tracePriority} ${row.block} candidate ${row.candidateStatus}${row.candidateDuplicateGroup ? ` duplicate ${row.candidateDuplicateGroup}` : ''}`)}</title></path>`),
  '  </g>',
  '  <g id="labels">',
  ...priorityReviewRows.map((row) => `    <text class="label" x="${row.labelX}" y="${row.labelY}">${xmlEscape(row.block)}</text>`),
  '  </g>',
  '</svg>',
].join('\n');

const priorityRows = ['P0', 'P1', 'P2', 'P3', 'P4'].map((priority) => {
  const rows = blockRows.filter((row) => row.tracePriority === priority);
  return [
    `\`${priority}\``,
    String(rows.length),
    String(rows.filter((row) => row.candidateStatus === 'PIXEL_CANDIDATE_READY').length),
    String(rows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW').length),
  ];
});

const alignmentRows = ['LOCKED_VERIFIED', 'RETRACE_REQUIRED', 'OPERATOR_REQUIRED'].map((alignmentClass) => [
  `\`${alignmentClass}\``,
  String(alignmentCounts[alignmentClass] ?? 0),
]);

const officialFailureRows = officialAlignmentFailures.slice(0, 12).map((row) => [
  `\`${row.block}\``,
  row.officialFailureReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
  row.labelTopHitBlock ? `\`${row.labelTopHitBlock}\`` : '-',
  row.candidateDuplicateGroup || '-',
]);

const markdown = [
  '# 대구 삼성라이온즈파크 좌석도 trace review manifest',
  '',
  `- 공식 이미지: \`${DAEGU_SEATMAP_IMAGE.requiredAssetFileName}\` (${DAEGU_SEATMAP_IMAGE.imageWidth}x${DAEGU_SEATMAP_IMAGE.imageHeight})`,
  `- viewport: \`${JSON.stringify(DAEGU_SEATMAP_VIEWPORT)}\``,
  `- alignment standard: \`${summary.alignmentStandard}\``,
  `- total blocks: ${summary.totalBlocks}`,
  `- locked verified: ${summary.lockedVerified}`,
  `- retrace required: ${summary.retraceRequired}`,
  `- operator required: ${summary.operatorRequired}`,
  `- official alignment failures: ${summary.officialAlignmentFailures}`,
  `- official image traced: ${summary.officialImageTraced}`,
  `- needs operator review: ${summary.needsOperatorReview}`,
  `- legacy scaled polygon: ${summary.legacyScaledPolygon}`,
  `- direct official trace: ${summary.directOfficialTrace}`,
  `- pixel candidates ready: ${summary.pixelCandidateReady}`,
  `- candidate needs manual trace: ${summary.candidateNeedsManualTrace}`,
  `- missing pixel candidate: ${summary.missingPixelCandidate || '-'}`,
  `- duplicate pixel candidate groups: ${summary.duplicatePixelCandidateGroups}`,
  `- duplicate pixel candidate blocks: ${summary.duplicatePixelCandidateBlocks}`,
  `- duplicate pixel candidate boundary resolved blocks: ${summary.duplicatePixelCandidateBoundaryResolvedBlocks}`,
  '- priority overlay: `reports/stadium/daegu-seatmap-trace-review-priority.svg`',
  '',
  '## Alignment audit',
  '',
  markdownTable(
    ['alignment class', 'blocks'],
    alignmentRows,
  ),
  '',
  '## Official failures',
  '',
  officialFailureRows.length > 0
    ? markdownTable(['block', 'failure reasons', 'label top hit', 'duplicate'], officialFailureRows)
    : 'No official alignment failures.',
  '',
  '## 우선순위',
  '',
  markdownTable(
    ['priority', 'blocks', 'pixel candidates', 'operator review'],
    priorityRows,
  ),
  '',
  '## 사용 방법',
  '',
  '1. `npm run stadium:daegu:alignment-audit`를 먼저 실행해 `OFFICIAL_IMAGE_TRACED` 블록의 label top-hit gate를 통과시킵니다.',
  '2. `npm run stadium:daegu:evidence`를 실행해 pixel candidate, CSV, priority overlay, evidence crop을 같이 생성합니다.',
  '3. CSV의 `alignmentClass`, `officialFailureReasons`, `labelTopHitBlock`을 먼저 확인해 자동 승격 금지/재트레이싱/운영자 필요 대상을 분류합니다.',
  '4. CSV의 `candidateOuterBoundaryPath`, `candidateBoundaryPath`, `candidateHullPath`는 공식 PNG 픽셀에서 뽑은 검수 후보일 뿐입니다. 그대로 자동 반영하지 않습니다.',
  '5. 운영자는 CSV의 `operatorDecision`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote`를 채워 승인/반려 기록을 남깁니다.',
  '6. `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`이 모두 있는 블럭만 별도 데이터 PR에서 `imageGeometry.d`를 수동 갱신합니다.',
  '7. 직접 승인되지 않은 블럭은 `sourceConfidence=UNVERIFIED`와 `NEEDS_OPERATOR_REVIEW` 상태로 남깁니다.',
  '',
].join('\n');

await fs.mkdir(outDir, { recursive: true });

const jsonPath = path.join(outDir, 'daegu-seatmap-trace-review.json');
const csvPath = path.join(outDir, 'daegu-seatmap-trace-review.csv');
const markdownPath = path.join(outDir, 'daegu-seatmap-trace-review.md');
const prioritySvgPath = path.join(outDir, 'daegu-seatmap-trace-review-priority.svg');

await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'block',
    'name',
    'category',
    'level',
    'side',
    'fanRole',
    'sourceConfidence',
    'traceStatus',
    'traceMethod',
    'tracePriority',
    'alignmentStandard',
    'alignmentClass',
    'officialFailureReasons',
    'labelInsideCurrentPath',
    'labelTopHitBlockId',
    'labelTopHitBlock',
    'labelTopHitOk',
    'reviewNote',
    'labelX',
    'labelY',
    'label',
    'currentPathBounds',
    'currentPath',
    'candidateStatus',
    'candidateArea',
    'candidateCenter',
    'candidateBbox',
    'candidateDuplicateGroup',
    'candidateDuplicateIds',
    'candidateDuplicateCategories',
    'candidateDuplicateBoundaryResolved',
    'candidateDuplicatePeerLabelConflicts',
    'semanticRisk',
    'componentInsidePathRatio',
    'pathColorCoverageRatio',
    'candidateOuterBoundaryPointCount',
    'candidateOuterBoundaryPath',
    'candidateBoundaryPointCount',
    'candidateBoundaryPath',
    'candidateHullPath',
    'operatorDecision',
    'correctedPath',
    'reviewer',
    'reviewedAt',
    'operatorNote',
    'reviewAction',
  ],
  ...blockRows.map((block) => [
    block.id,
    block.block,
    block.name,
    block.category,
    block.level,
    block.side,
    block.fanRole,
    block.sourceConfidence,
    block.traceStatus,
    block.traceMethod,
    block.tracePriority,
    block.alignmentStandard,
    block.alignmentClass,
    block.officialFailureReasons.join(' '),
    block.labelInsideCurrentPath,
    block.labelTopHitBlockId,
    block.labelTopHitBlock,
    block.labelTopHitOk,
    block.reviewNote,
    block.labelX,
    block.labelY,
    block.label,
    JSON.stringify(block.currentPathBounds),
    block.currentPath,
    block.candidateStatus,
    block.candidateArea,
    block.candidateCenter ? JSON.stringify(block.candidateCenter) : '',
    block.candidateBbox ? JSON.stringify(block.candidateBbox) : '',
    block.candidateDuplicateGroup,
    block.candidateDuplicateIds,
    block.candidateDuplicateCategories,
    block.candidateDuplicateBoundaryResolved,
    block.candidateDuplicatePeerLabelConflicts.length > 0
      ? JSON.stringify(block.candidateDuplicatePeerLabelConflicts)
      : '',
    block.semanticRisk,
    block.componentInsidePathRatio,
    block.pathColorCoverageRatio,
    block.candidateOuterBoundaryPointCount,
    block.candidateOuterBoundaryPath,
    block.candidateBoundaryPointCount,
    block.candidateBoundaryPath,
    block.candidateHullPath,
    block.operatorDecision,
    block.correctedPath,
    block.reviewer,
    block.reviewedAt,
    block.operatorNote,
    block.reviewAction,
  ]),
]);
await fs.writeFile(markdownPath, markdown, 'utf8');
await fs.writeFile(prioritySvgPath, priorityReviewSvg, 'utf8');

console.log(`manifest_json:${jsonPath}`);
console.log(`manifest_csv:${csvPath}`);
console.log(`manifest_markdown:${markdownPath}`);
console.log(`priority_svg:${prioritySvgPath}`);
console.log(`status:ok total=${summary.totalBlocks} review=${summary.needsOperatorReview} pixelCandidates=${summary.pixelCandidateReady}`);
