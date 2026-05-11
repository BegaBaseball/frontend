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

const AUDIT_VERSION = 'DAEGU_ALIGNMENT_AUDIT_V1';
const MIN_COMPONENT_INSIDE_RATIO = 0.65;
const MIN_PATH_COLOR_COVERAGE_RATIO = 0.65;

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const pixelComponentsPath = path.join(outDir, 'daegu-seatmap-pixel-components.json');

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

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

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

const centroid = (points) => {
  if (points.length === 0) return [0, 0];
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
  ];
};

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

const pathBounds = (paths) => {
  const points = paths.flatMap(pathPoints);
  return {
    minX: Math.min(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxX: Math.max(...points.map((point) => point[0])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const pixelComponents = await readJson(pixelComponentsPath);
const candidateByBlockId = new Map(pixelComponents.blocks.map((block) => [block.id, block.candidate]));

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

const candidateDuplicateGroups = DAEGU_BLOCKS.reduce((groups, block) => {
  const candidate = candidateByBlockId.get(block.id);
  if (candidate?.status !== 'PIXEL_CANDIDATE_READY' || !candidate.bbox || !candidate.area) {
    return groups;
  }

  const key = [
    candidate.bbox.minX,
    candidate.bbox.minY,
    candidate.bbox.maxX,
    candidate.bbox.maxY,
    candidate.area,
  ].join(':');
  const group = groups.get(key) ?? [];
  group.push(block.id);
  groups.set(key, group);
  return groups;
}, new Map());

const duplicateByBlockId = new Map();
let duplicateGroupIndex = 0;
candidateDuplicateGroups.forEach((blockIds) => {
  if (blockIds.length < 2) return;
  duplicateGroupIndex += 1;
  const groupId = `D${String(duplicateGroupIndex).padStart(2, '0')}`;
  blockIds.forEach((blockId) => {
    duplicateByBlockId.set(blockId, {
      groupId,
      blockIds,
    });
  });
});

const probeResultsForBlock = (block, candidate) => {
  const paths = geometryPaths(block);
  const largestPath = paths
    .map((pathData) => ({ pathData, points: pathPoints(pathData) }))
    .sort((a, b) => polygonArea(b.points) - polygonArea(a.points))[0];
  const bounds = pathBounds(paths);
  const probes = [
    {
      name: 'label',
      point: [block.imageGeometry.labelX, block.imageGeometry.labelY],
    },
    {
      name: 'currentCentroid',
      point: centroid(largestPath?.points ?? []),
    },
    {
      name: 'currentBoundsCenter',
      point: [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2],
    },
  ];

  if (candidate?.center) {
    probes.push({
      name: 'candidateCenter',
      point: [candidate.center.x, candidate.center.y],
    });
  }

  return probes.map((probe) => {
    const topHit = topHitBlockAt(probe.point);
    return {
      name: probe.name,
      point: probe.point.map((value) => round(value, 1)),
      insideCurrentPath: pointInAnyPath(probe.point, block),
      topHitBlockId: topHit?.id ?? null,
      topHitBlock: topHit?.block ?? null,
      topHitOk: topHit?.id === block.id,
    };
  });
};

const duplicateBoundaryReviewForBlock = (block, row, duplicateBlocks) => {
  if (!row.candidateDuplicateGroup) {
    return {
      resolved: false,
      peerLabelConflicts: [],
    };
  }

  const peerLabelConflicts = duplicateBlocks
    .filter((duplicateBlock) => duplicateBlock.id !== block.id)
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
        topHitIsCurrentBlock: topHit?.id === block.id,
      };
    })
    .filter((peerLabel) => peerLabel.insideCurrentPath || peerLabel.topHitIsCurrentBlock);

  const hasSeparateBoundary = row.componentInsidePathRatio !== ''
    && row.componentInsidePathRatio < 0.98
    && row.labelInsideCurrentPath
    && row.labelTopHitOk
    && row.hasSelfHitProbe;

  return {
    resolved: hasSeparateBoundary && peerLabelConflicts.length === 0,
    peerLabelConflicts,
  };
};

const officialFailureReasons = (row) => {
  const reasons = [];
  if (!row.labelInsideCurrentPath) reasons.push('LABEL_OUTSIDE_CURRENT_PATH');
  if (!row.labelTopHitOk) reasons.push('LABEL_TOP_HIT_MISMATCH');
  if (!row.hasSelfHitProbe) reasons.push('NO_SELF_HIT_PROBE');
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

const classifyRow = (row, reasons) => {
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

const rows = DAEGU_BLOCKS.map((block) => {
  const candidate = candidateByBlockId.get(block.id) ?? null;
  const duplicate = duplicateByBlockId.get(block.id);
  const probes = probeResultsForBlock(block, candidate);
  const labelProbe = probes.find((probe) => probe.name === 'label');
  const duplicateBlocks = duplicate?.blockIds
    .map((blockId) => DAEGU_BLOCKS.find((candidateBlock) => candidateBlock.id === blockId))
    .filter(Boolean) ?? [];
  const duplicateCategories = [...new Set(duplicateBlocks.map((candidateBlock) => candidateBlock.category))];
  const row = {
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
    currentPath: block.imageGeometry.d,
    currentPathBounds: pathBounds(geometryPaths(block)),
    currentPathArea: round(blockArea(block), 1),
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    labelInsideCurrentPath: labelProbe?.insideCurrentPath ?? false,
    labelTopHitBlockId: labelProbe?.topHitBlockId ?? null,
    labelTopHitBlock: labelProbe?.topHitBlock ?? null,
    labelTopHitOk: labelProbe?.topHitOk ?? false,
    selfHitProbeCount: probes.filter((probe) => probe.topHitOk).length,
    probeCount: probes.length,
    hasSelfHitProbe: probes.some((probe) => probe.topHitOk),
    probes,
    candidateStatus: candidate?.status ?? 'MISSING_PIXEL_REPORT',
    candidateArea: candidate?.area ?? '',
    candidateCenter: candidate?.center ?? null,
    candidateBbox: candidate?.bbox ?? null,
    candidateDuplicateGroup: duplicate?.groupId ?? '',
    candidateDuplicateIds: duplicate?.blockIds.join(' ') ?? '',
    candidateDuplicateCategories: duplicateCategories.join(' '),
    semanticRisk: duplicateCategories.length > 1 ? 'CANDIDATE_DUPLICATE_CROSS_CATEGORY' : '',
    componentInsidePathRatio: candidate?.componentInsidePathRatio ?? '',
    pathColorCoverageRatio: candidate?.pathColorCoverageRatio ?? '',
    candidateOuterBoundaryPointCount: candidate?.outerBoundaryPointCount ?? '',
    candidateOuterBoundaryPath: candidate?.outerBoundaryPath ?? '',
    candidateBoundaryPointCount: candidate?.boundaryPointCount ?? '',
    candidateBoundaryPath: candidate?.boundaryPath ?? '',
    candidateHullPath: candidate?.hullPath ?? '',
  };
  const duplicateBoundaryReview = duplicateBoundaryReviewForBlock(block, row, duplicateBlocks);
  row.candidateDuplicateBoundaryResolved = duplicateBoundaryReview.resolved;
  row.candidateDuplicatePeerLabelConflicts = duplicateBoundaryReview.peerLabelConflicts;
  const reasons = officialFailureReasons(row);
  const alignmentClass = classifyRow(row, reasons);
  return {
    ...row,
    alignmentClass,
    officialFailureReasons: reasons,
    reviewAction: reasons.length > 0 && block.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      ? 'Demote to NEEDS_OPERATOR_REVIEW until the official path is retraced or operator-approved.'
      : row.candidateDuplicateBoundaryResolved
        ? 'Shared pixel candidate boundary was resolved by an operator-approved separated path.'
      : row.candidateDuplicateGroup
        ? 'Do not promote automatically. Pixel candidate is shared by multiple blocks.'
        : alignmentClass === 'RETRACE_REQUIRED'
          ? 'Manual retrace from official PNG candidate is possible, but promotion still needs review.'
          : 'Operator corrected path is required before promotion.',
  };
});

const officialFailures = rows.filter((row) => (
  row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
  && row.alignmentClass !== 'LOCKED_VERIFIED'
));
const classificationCounts = rows.reduce((counts, row) => {
  counts[row.alignmentClass] = (counts[row.alignmentClass] ?? 0) + 1;
  return counts;
}, {});

const summary = {
  standard: AUDIT_VERSION,
  totalBlocks: rows.length,
  lockedVerified: classificationCounts.LOCKED_VERIFIED ?? 0,
  retraceRequired: classificationCounts.RETRACE_REQUIRED ?? 0,
  operatorRequired: classificationCounts.OPERATOR_REQUIRED ?? 0,
  officialImageTraced: rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
  officialAlignmentFailures: officialFailures.length,
  labelInsideFailures: rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED' && !row.labelInsideCurrentPath).length,
  labelTopHitFailures: rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED' && !row.labelTopHitOk).length,
  candidateDuplicateGroups: duplicateGroupIndex,
  candidateDuplicateBlocks: rows.filter((row) => row.candidateDuplicateGroup).length,
  candidateDuplicateBoundaryResolvedBlocks: rows.filter((row) => row.candidateDuplicateBoundaryResolved).length,
  officialCandidateDuplicateRawBlocks: rows.filter((row) => (
    row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
    && row.candidateDuplicateGroup
  )).length,
  officialCandidateDuplicateBlocks: rows.filter((row) => (
    row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
    && row.candidateDuplicateGroup
    && !row.candidateDuplicateBoundaryResolved
  )).length,
  thresholds: {
    minComponentInsidePathRatio: MIN_COMPONENT_INSIDE_RATIO,
    minPathColorCoverageRatio: MIN_PATH_COLOR_COVERAGE_RATIO,
  },
};

const audit = {
  generatedAt: new Date().toISOString(),
  standard: AUDIT_VERSION,
  asset: DAEGU_SEATMAP_IMAGE,
  viewport: DAEGU_SEATMAP_VIEWPORT,
  pixelComponentsReport: pixelComponentsPath,
  summary,
  officialFailurePolicy: {
    defaultAction: 'Demote failing OFFICIAL_IMAGE_TRACED blocks to NEEDS_OPERATOR_REVIEW before additional promotion.',
    requiredForLockedVerified: [
      'labelInsideCurrentPath=true',
      'labelTopHitOk=true',
      'hasSelfHitProbe=true',
      'candidateStatus=PIXEL_CANDIDATE_READY',
      'candidateDuplicateGroup empty or candidateDuplicateBoundaryResolved=true',
      `componentInsidePathRatio>=${MIN_COMPONENT_INSIDE_RATIO}`,
      `pathColorCoverageRatio>=${MIN_PATH_COLOR_COVERAGE_RATIO}`,
    ],
  },
  blocks: rows,
};

const failureRowsForMarkdown = officialFailures.slice(0, 24).map((row) => [
  `\`${row.block}\``,
  row.alignmentClass,
  row.officialFailureReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
  row.labelTopHitBlock ? `\`${row.labelTopHitBlock}\`` : '-',
  row.candidateDuplicateGroup || '-',
]);

const classificationRows = ['LOCKED_VERIFIED', 'RETRACE_REQUIRED', 'OPERATOR_REQUIRED'].map((classification) => [
  `\`${classification}\``,
  String(classificationCounts[classification] ?? 0),
]);

const markdown = [
  '# Daegu seatmap alignment audit',
  '',
  `- standard: \`${AUDIT_VERSION}\``,
  `- total blocks: ${summary.totalBlocks}`,
  `- locked verified: ${summary.lockedVerified}`,
  `- retrace required: ${summary.retraceRequired}`,
  `- operator required: ${summary.operatorRequired}`,
  `- official image traced: ${summary.officialImageTraced}`,
  `- official alignment failures: ${summary.officialAlignmentFailures}`,
  `- label top-hit failures: ${summary.labelTopHitFailures}`,
  `- candidate duplicate blocks: ${summary.candidateDuplicateBlocks}`,
  `- candidate duplicate boundary resolved blocks: ${summary.candidateDuplicateBoundaryResolvedBlocks}`,
  '',
  '## Classification',
  '',
  markdownTable(['class', 'blocks'], classificationRows),
  '',
  '## Official failures',
  '',
  failureRowsForMarkdown.length > 0
    ? markdownTable(['block', 'class', 'failure reasons', 'label top hit', 'duplicate'], failureRowsForMarkdown)
    : 'No official alignment failures.',
  '',
  '## Gate',
  '',
  '- This command fails when any `OFFICIAL_IMAGE_TRACED` block is not `LOCKED_VERIFIED`.',
  '- Failing official blocks should stay selectable, but must be demoted to `NEEDS_OPERATOR_REVIEW` until retraced or operator-approved.',
  '',
].join('\n');

const statusColor = {
  LOCKED_VERIFIED: '#16a34a',
  RETRACE_REQUIRED: '#f97316',
  OPERATOR_REQUIRED: '#dc2626',
};

const overlayRows = rows.filter((row) => row.alignmentClass !== 'LOCKED_VERIFIED' || row.traceStatus === 'OFFICIAL_IMAGE_TRACED');
const overlaySvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1707" height="2048" viewBox="0 0 1707 2048">',
  '  <style>',
  '    .grid { stroke: #0f172a; stroke-opacity: 0.16; stroke-width: 1; }',
  '    .current { fill-opacity: 0.08; stroke-width: 2; vector-effect: non-scaling-stroke; }',
  '    .candidate { fill: none; stroke: #06b6d4; stroke-width: 2; stroke-dasharray: 8 5; vector-effect: non-scaling-stroke; }',
  '    .label { font: 800 13px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
  '    .reason { font: 700 10px sans-serif; fill: #334155; stroke: #fff; stroke-width: 2; paint-order: stroke; }',
  '  </style>',
  '  <image href="../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png" x="0" y="0" width="1707" height="2048" preserveAspectRatio="none" />',
  ...Array.from({ length: Math.floor(1707 / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="2048" />`),
  ...Array.from({ length: Math.floor(2048 / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="1707" y2="${index * 100}" />`),
  '  <g id="current-paths">',
  ...overlayRows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}" fill="${statusColor[row.alignmentClass]}" stroke="${statusColor[row.alignmentClass]}"><title>${xmlEscape(`${row.block} ${row.alignmentClass} ${row.officialFailureReasons.join(' ')}`)}</title></path>`),
  '  </g>',
  '  <g id="pixel-candidates">',
  ...overlayRows
    .filter((row) => row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)
    .map((row) => `    <path class="candidate" d="${xmlEscape(row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)}"><title>${xmlEscape(`${row.block} candidate ${row.candidateStatus}${row.candidateDuplicateGroup ? ` ${row.candidateDuplicateGroup}` : ''}`)}</title></path>`),
  '  </g>',
  '  <g id="labels">',
  ...overlayRows.map((row) => [
    `    <circle cx="${row.labelX}" cy="${row.labelY}" r="4" fill="${statusColor[row.alignmentClass]}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />`,
    `    <text class="label" x="${row.labelX + 7}" y="${row.labelY - 7}">${xmlEscape(row.block)}</text>`,
    row.officialFailureReasons.length > 0
      ? `    <text class="reason" x="${row.labelX + 7}" y="${row.labelY + 7}">${xmlEscape(row.officialFailureReasons.join(' '))}</text>`
      : '',
  ].filter(Boolean).join('\n')),
  '  </g>',
  '</svg>',
].join('\n');

await fs.mkdir(outDir, { recursive: true });

const jsonPath = path.join(outDir, 'daegu-seatmap-alignment-audit.json');
const csvPath = path.join(outDir, 'daegu-seatmap-alignment-audit.csv');
const markdownPath = path.join(outDir, 'daegu-seatmap-alignment-audit.md');
const svgPath = path.join(outDir, 'daegu-seatmap-alignment-audit.svg');

await fs.writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
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
    'alignmentClass',
    'officialFailureReasons',
    'labelX',
    'labelY',
    'labelInsideCurrentPath',
    'labelTopHitBlockId',
    'labelTopHitBlock',
    'labelTopHitOk',
    'selfHitProbeCount',
    'probeCount',
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
    'reviewAction',
  ],
  ...rows.map((row) => [
    row.id,
    row.block,
    row.name,
    row.category,
    row.level,
    row.side,
    row.fanRole,
    row.sourceConfidence,
    row.traceStatus,
    row.traceMethod,
    row.alignmentClass,
    row.officialFailureReasons.join(' '),
    row.labelX,
    row.labelY,
    row.labelInsideCurrentPath,
    row.labelTopHitBlockId ?? '',
    row.labelTopHitBlock ?? '',
    row.labelTopHitOk,
    row.selfHitProbeCount,
    row.probeCount,
    row.candidateStatus,
    row.candidateArea,
    row.candidateCenter ? JSON.stringify(row.candidateCenter) : '',
    row.candidateBbox ? JSON.stringify(row.candidateBbox) : '',
    row.candidateDuplicateGroup,
    row.candidateDuplicateIds,
    row.candidateDuplicateCategories,
    row.candidateDuplicateBoundaryResolved,
    row.candidateDuplicatePeerLabelConflicts.length > 0
      ? JSON.stringify(row.candidateDuplicatePeerLabelConflicts)
      : '',
    row.semanticRisk,
    row.componentInsidePathRatio,
    row.pathColorCoverageRatio,
    row.candidateOuterBoundaryPointCount,
    row.candidateOuterBoundaryPath,
    row.candidateBoundaryPointCount,
    row.candidateBoundaryPath,
    row.candidateHullPath,
    row.reviewAction,
  ]),
]);
await fs.writeFile(markdownPath, markdown, 'utf8');
await fs.writeFile(svgPath, overlaySvg, 'utf8');

console.log(`alignment_json:${jsonPath}`);
console.log(`alignment_csv:${csvPath}`);
console.log(`alignment_markdown:${markdownPath}`);
console.log(`alignment_svg:${svgPath}`);
console.log(`status:${officialFailures.length === 0 ? 'ok' : 'failed'} total=${summary.totalBlocks} locked=${summary.lockedVerified} retrace=${summary.retraceRequired} operator=${summary.operatorRequired} officialFailures=${summary.officialAlignmentFailures}`);

if (officialFailures.length > 0) {
  process.exitCode = 1;
}
