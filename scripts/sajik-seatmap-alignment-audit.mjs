import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
  SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
  SAJIK_BLOCKS,
  SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS,
  SAJIK_SEATMAP_IMAGE,
} from '../src/data/sajikSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const AUDIT_VERSION = 'SAJIK_ALIGNMENT_AUDIT_V1';
const allowFailures = process.argv.includes('--allow-failures');
const officialPngBlockNotVisibleSet = new Set(SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS);

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const pixelComponentsPath = path.join(outDir, 'sajik-seatmap-pixel-components.json');

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

const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + (point[0] * next[1]) - (next[0] * point[1]);
}, 0) / 2);

const pathBounds = (pathData) => {
  const points = pathPoints(pathData);
  return {
    minX: Math.min(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxX: Math.max(...points.map((point) => point[0])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
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

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const pixelComponents = await readJson(pixelComponentsPath);
const candidateByBlockId = new Map(pixelComponents.blocks.map((block) => [block.id, block.candidate]));
const sortedBlocks = [...SAJIK_BLOCKS].sort((left, right) => left.displayPriority - right.displayPriority);

const topHitBlockAt = (point) => {
  let topBlock = null;
  sortedBlocks.forEach((block) => {
    if (pointInPolygon(point, pathPoints(block.imageGeometry.d))) {
      topBlock = block;
    }
  });
  return topBlock;
};

const failureReasons = (row, { includeCandidateGate }) => {
  const reasons = [];
  if (!row.labelInsideCurrentPath) reasons.push('LABEL_OUTSIDE_CURRENT_PATH');
  if (!row.labelTopHitOk) reasons.push('LABEL_TOP_HIT_MISMATCH');
  if (includeCandidateGate && row.candidateStatus !== 'PIXEL_CANDIDATE_READY') reasons.push('PIXEL_CANDIDATE_NOT_READY');
  if (includeCandidateGate && row.componentInsidePathRatio < SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO) reasons.push('LOW_COMPONENT_INSIDE_CURRENT_PATH');
  if (includeCandidateGate && row.pathColorCoverageRatio < SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO) reasons.push('LOW_CURRENT_PATH_COLOR_COVERAGE');
  return reasons;
};

const rows = SAJIK_BLOCKS.map((block) => {
  const candidate = candidateByBlockId.get(block.id) ?? {};
  const points = pathPoints(block.imageGeometry.d);
  const labelPoint = [block.imageGeometry.labelX, block.imageGeometry.labelY];
  const topHit = topHitBlockAt(labelPoint);
  const row = {
    id: block.id,
    block: block.block,
    name: block.name,
    category: block.category,
    level: block.level,
    side: block.side,
    fanRole: block.fanRole,
    traceStatus: block.traceStatus,
    traceSource: block.imageGeometry.traceSource,
    traceVersion: block.imageGeometry.traceVersion,
    manualReviewed: block.imageGeometry.manualReviewed,
    pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
    currentPath: block.imageGeometry.d,
    currentPathBounds: pathBounds(block.imageGeometry.d),
    currentPathArea: round(polygonArea(points), 1),
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    labelInsideCurrentPath: pointInPolygon(labelPoint, points),
    labelTopHitBlockId: topHit?.id ?? null,
    labelTopHitBlock: topHit?.block ?? null,
    labelTopHitOk: topHit?.id === block.id,
    candidateStatus: candidate.status ?? 'MISSING_PIXEL_REPORT',
    candidateArea: candidate.area ?? '',
    candidateCenter: candidate.center ?? null,
    candidateBbox: candidate.bbox ?? null,
    candidateOuterBoundaryPointCount: candidate.outerBoundaryPointCount ?? '',
    candidateOuterBoundaryPath: candidate.outerBoundaryPath ?? '',
    candidateHullPath: candidate.hullPath ?? '',
    componentInsidePathRatio: Number(candidate.componentInsidePathRatio ?? 0),
    pathColorCoverageRatio: Number(candidate.pathColorCoverageRatio ?? 0),
    seedColor: candidate.seedColor ?? null,
    seedPoint: candidate.seedPoint ?? null,
    strictPixelGate: true,
  };
  const officialReasons = failureReasons(row, { includeCandidateGate: row.strictPixelGate });
  const advisoryReasons = failureReasons(row, { includeCandidateGate: true });
  const officialPngBlockNotVisible = officialPngBlockNotVisibleSet.has(block.block);
  const officialFailureReasons = officialPngBlockNotVisible
    ? [...new Set([...officialReasons, 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE'])]
    : officialReasons;
  const pixelAdvisoryReasons = officialPngBlockNotVisible
    ? [...new Set([...advisoryReasons, 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE'])]
    : advisoryReasons;
  return {
    ...row,
    officialPngBlockNotVisible,
    alignmentClass: officialPngBlockNotVisible
      ? 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE'
      : officialReasons.length === 0
        ? 'LOCKED_VERIFIED'
        : 'RETRACE_REQUIRED',
    officialFailureReasons,
    pixelAdvisoryReasons,
  };
});

const officialFailures = rows.filter((row) => row.alignmentClass === 'RETRACE_REQUIRED');
const officialPngBlockNotVisibleRows = rows.filter((row) => row.alignmentClass === 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE');
const classificationCounts = rows.reduce((counts, row) => {
  counts[row.alignmentClass] = (counts[row.alignmentClass] ?? 0) + 1;
  return counts;
}, {});

const summary = {
  standard: AUDIT_VERSION,
  totalBlocks: rows.length,
  lockedVerified: classificationCounts.LOCKED_VERIFIED ?? 0,
  officialPngBlockNotVisible: classificationCounts.OFFICIAL_PNG_BLOCK_NOT_VISIBLE ?? 0,
  retraceRequired: classificationCounts.RETRACE_REQUIRED ?? 0,
  officialAlignmentFailures: officialFailures.length,
  strictPixelGateBlocks: rows.filter((row) => row.strictPixelGate).length,
  pixelAdvisoryWarnings: rows.filter((row) => row.pixelAdvisoryReasons.length > 0).length,
  labelInsideFailures: rows.filter((row) => !row.labelInsideCurrentPath).length,
  labelTopHitFailures: rows.filter((row) => !row.labelTopHitOk).length,
  candidateFailures: rows.filter((row) => row.candidateStatus !== 'PIXEL_CANDIDATE_READY').length,
  alignmentThresholds: {
    minComponentInsidePathRatio: SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
    minPathColorCoverageRatio: SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
  },
};

const audit = {
  generatedAt: new Date().toISOString(),
  standard: AUDIT_VERSION,
  asset: SAJIK_SEATMAP_IMAGE,
  pixelComponentsReport: pixelComponentsPath,
  summary,
  officialFailurePolicy: {
    requiredForLockedVerified: [
      'labelInsideCurrentPath=true',
      'labelTopHitOk=true',
      'strictPixelGate blocks: candidateStatus=PIXEL_CANDIDATE_READY',
      `strictPixelGate blocks: componentInsidePathRatio>=${SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO}`,
      `strictPixelGate blocks: pathColorCoverageRatio>=${SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO}`,
    ],
    advisoryForNonStrictBlocks: [
      'candidateStatus',
      'componentInsidePathRatio',
      'pathColorCoverageRatio',
    ],
  },
  blocks: rows,
};

const failureRows = officialFailures.slice(0, 32).map((row) => [
  `\`${row.block}\``,
  row.alignmentClass,
  row.officialFailureReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
  row.labelTopHitBlock ? `\`${row.labelTopHitBlock}\`` : '-',
  String(row.componentInsidePathRatio),
  String(row.pathColorCoverageRatio),
]);

const classificationRows = ['LOCKED_VERIFIED', 'RETRACE_REQUIRED'].map((classification) => [
  `\`${classification}\``,
  String(classificationCounts[classification] ?? 0),
]);
const allClassificationRows = ['LOCKED_VERIFIED', 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE', 'RETRACE_REQUIRED'].map((classification) => [
  `\`${classification}\``,
  String(classificationCounts[classification] ?? 0),
]);

const markdown = [
  '# Sajik seatmap alignment audit',
  '',
  `- standard: \`${AUDIT_VERSION}\``,
  `- total blocks: ${summary.totalBlocks}`,
  `- locked verified: ${summary.lockedVerified}`,
  `- official PNG block not visible: ${summary.officialPngBlockNotVisible}`,
  `- retrace required: ${summary.retraceRequired}`,
  `- official alignment failures: ${summary.officialAlignmentFailures}`,
  `- strict pixel gate blocks: ${summary.strictPixelGateBlocks}`,
  `- pixel advisory warnings: ${summary.pixelAdvisoryWarnings}`,
  `- min component inside path ratio: ${SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO}`,
  `- min path color coverage ratio: ${SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO}`,
  '',
  '## Classification',
  '',
  markdownTable(['class', 'blocks'], allClassificationRows),
  '',
  '## Official PNG block not visible',
  '',
  officialPngBlockNotVisibleRows.length > 0
    ? markdownTable(
      ['block', 'failure reasons', 'label top hit', 'inside', 'coverage'],
      officialPngBlockNotVisibleRows.map((row) => [
        `\`${row.block}\``,
        row.officialFailureReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        row.labelTopHitBlock ? `\`${row.labelTopHitBlock}\`` : '-',
        String(row.componentInsidePathRatio),
        String(row.pathColorCoverageRatio),
      ]),
    )
    : 'No official PNG block-not-visible exceptions.',
  '',
  '## Official failures',
  '',
  failureRows.length > 0
    ? markdownTable(['block', 'class', 'failure reasons', 'label top hit', 'inside', 'coverage'], failureRows)
    : 'No official alignment failures.',
  '',
  '## Gate',
  '',
  '- This command fails when any Sajik block is `RETRACE_REQUIRED`.',
  '- `OFFICIAL_PNG_BLOCK_NOT_VISIBLE` is an explicit local-PNG exception for blocks that remain in data for compatibility but have no visible official PNG color component.',
  '- `PIXEL_ALIGNED` is only releasable after this audit and evidence crops pass.',
  '',
].join('\n');

const statusColor = {
  LOCKED_VERIFIED: '#16a34a',
  OFFICIAL_PNG_BLOCK_NOT_VISIBLE: '#f59e0b',
  RETRACE_REQUIRED: '#dc2626',
};

const overlaySvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SAJIK_SEATMAP_IMAGE.imageWidth}" height="${SAJIK_SEATMAP_IMAGE.imageHeight}" viewBox="0 0 ${SAJIK_SEATMAP_IMAGE.imageWidth} ${SAJIK_SEATMAP_IMAGE.imageHeight}">`,
  '  <style>',
  '    .current { fill-opacity: 0.12; stroke-width: 2; vector-effect: non-scaling-stroke; }',
  '    .candidate { fill: none; stroke: #06b6d4; stroke-width: 1.5; stroke-dasharray: 5 4; vector-effect: non-scaling-stroke; }',
  '    .label { font: 800 9px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 2.4; paint-order: stroke; }',
  '  </style>',
  `  <image href="../src/assets/stadiums/lotte/${SAJIK_SEATMAP_IMAGE.requiredAssetFileName}" x="0" y="0" width="${SAJIK_SEATMAP_IMAGE.imageWidth}" height="${SAJIK_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />`,
  '  <g id="current-paths">',
  ...rows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}" fill="${statusColor[row.alignmentClass]}" stroke="${statusColor[row.alignmentClass]}"><title>${xmlEscape(`${row.block} ${row.alignmentClass} inside=${row.componentInsidePathRatio} coverage=${row.pathColorCoverageRatio}`)}</title></path>`),
  '  </g>',
  '  <g id="pixel-candidates">',
  ...rows
    .filter((row) => row.candidateOuterBoundaryPath || row.candidateHullPath)
    .map((row) => `    <path class="candidate" d="${xmlEscape(row.candidateOuterBoundaryPath || row.candidateHullPath)}"><title>${xmlEscape(`${row.block} candidate ${row.candidateStatus}`)}</title></path>`),
  '  </g>',
  '  <g id="labels">',
  ...rows.map((row) => [
    `    <circle cx="${row.labelX}" cy="${row.labelY}" r="3" fill="${statusColor[row.alignmentClass]}" stroke="#ffffff" stroke-width="1.5" vector-effect="non-scaling-stroke" />`,
    `    <text class="label" x="${row.labelX + 5}" y="${row.labelY - 5}">${xmlEscape(row.block)}</text>`,
  ].join('\n')),
  '  </g>',
  '</svg>',
].join('\n');

await fs.mkdir(outDir, { recursive: true });

const jsonPath = path.join(outDir, 'sajik-seatmap-alignment-audit.json');
const csvPath = path.join(outDir, 'sajik-seatmap-alignment-audit.csv');
const markdownPath = path.join(outDir, 'sajik-seatmap-alignment-audit.md');
const svgPath = path.join(outDir, 'sajik-seatmap-alignment-audit.svg');

await fs.writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'block',
    'name',
    'category',
    'level',
    'traceStatus',
    'alignmentClass',
    'officialPngBlockNotVisible',
    'officialFailureReasons',
    'labelX',
    'labelY',
    'labelInsideCurrentPath',
    'labelTopHitBlock',
    'labelTopHitOk',
    'candidateStatus',
    'strictPixelGate',
    'componentInsidePathRatio',
    'pathColorCoverageRatio',
    'pixelAdvisoryReasons',
    'candidateArea',
    'candidateBbox',
    'candidateOuterBoundaryPath',
    'currentPath',
  ],
  ...rows.map((row) => [
    row.id,
    row.block,
    row.name,
    row.category,
    row.level,
    row.traceStatus,
    row.alignmentClass,
    row.officialPngBlockNotVisible,
    row.officialFailureReasons.join(' '),
    row.labelX,
    row.labelY,
    row.labelInsideCurrentPath,
    row.labelTopHitBlock ?? '',
    row.labelTopHitOk,
    row.candidateStatus,
    row.strictPixelGate,
    row.componentInsidePathRatio,
    row.pathColorCoverageRatio,
    row.pixelAdvisoryReasons.join(' '),
    row.candidateArea,
    row.candidateBbox ? JSON.stringify(row.candidateBbox) : '',
    row.candidateOuterBoundaryPath,
    row.currentPath,
  ]),
]);
await fs.writeFile(markdownPath, markdown, 'utf8');
await fs.writeFile(svgPath, overlaySvg, 'utf8');

console.log(`alignment_json:${jsonPath}`);
console.log(`alignment_csv:${csvPath}`);
console.log(`alignment_markdown:${markdownPath}`);
console.log(`alignment_svg:${svgPath}`);
console.log(`status:${officialFailures.length === 0 ? 'ok' : 'failed'} total=${summary.totalBlocks} locked=${summary.lockedVerified} notVisible=${summary.officialPngBlockNotVisible} retrace=${summary.retraceRequired} officialFailures=${summary.officialAlignmentFailures}`);

if (officialFailures.length > 0 && !allowFailures) {
  process.exitCode = 1;
}
