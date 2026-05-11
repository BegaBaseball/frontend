import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  DAEGU_SEATMAP_IMAGE,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultOutDir = path.join(defaultReportDir, 'daegu-handoff-evidence-crops');

const EVIDENCE_VERSION = 'DAEGU_HANDOFF_EVIDENCE_CROPS_V1';
const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3', 'P4'];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const numberOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const intOr = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const sanitizeFilePart = (value) => {
  const sanitized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'block';
};

const pathPoints = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const pathBounds = (pathData) => {
  const points = pathPoints(pathData);
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxX: Math.max(...points.map((point) => point[0])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
};

const normalizeBounds = (bounds) => {
  if (!bounds || typeof bounds !== 'object') return null;
  const { minX, minY, maxX, maxY } = bounds;
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  return { minX, minY, maxX, maxY };
};

const labelBounds = (row) => {
  if (!Number.isFinite(row.labelX) || !Number.isFinite(row.labelY)) return null;
  return {
    minX: row.labelX,
    minY: row.labelY,
    maxX: row.labelX,
    maxY: row.labelY,
  };
};

const rowBounds = (row) => [
  normalizeBounds(row.currentPathBounds),
  pathBounds(row.currentPath),
  normalizeBounds(row.candidateBbox),
  pathBounds(row.candidateOuterBoundaryPath),
  pathBounds(row.candidateBoundaryPath),
  pathBounds(row.candidateHullPath),
  labelBounds(row),
].filter(Boolean);

const cropForRows = (rows, padding) => {
  const bounds = rows.flatMap(rowBounds);
  if (bounds.length === 0) {
    throw new Error(`Cannot build Daegu handoff evidence crop without bounds for ${rows.map((row) => row.id).join(', ')}`);
  }

  const minX = Math.floor(Math.min(...bounds.map((item) => item.minX)) - padding);
  const minY = Math.floor(Math.min(...bounds.map((item) => item.minY)) - padding);
  const maxX = Math.ceil(Math.max(...bounds.map((item) => item.maxX)) + padding);
  const maxY = Math.ceil(Math.max(...bounds.map((item) => item.maxY)) + padding);

  const x = clamp(minX, 0, DAEGU_SEATMAP_IMAGE.imageWidth - 1);
  const y = clamp(minY, 0, DAEGU_SEATMAP_IMAGE.imageHeight - 1);
  const right = clamp(maxX, x + 1, DAEGU_SEATMAP_IMAGE.imageWidth);
  const bottom = clamp(maxY, y + 1, DAEGU_SEATMAP_IMAGE.imageHeight);

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
};

const clearGeneratedCropImages = async (directory) => {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
    .map((entry) => fs.unlink(path.join(directory, entry.name))));
};

const gridLines = (crop, step) => {
  const lines = [];
  const startX = Math.ceil(crop.x / step) * step;
  const startY = Math.ceil(crop.y / step) * step;

  for (let x = startX; x <= crop.x + crop.width; x += step) {
    lines.push(`<line class="grid" x1="${x}" y1="${crop.y}" x2="${x}" y2="${crop.y + crop.height}" />`);
  }
  for (let y = startY; y <= crop.y + crop.height; y += step) {
    lines.push(`<line class="grid" x1="${crop.x}" y1="${y}" x2="${crop.x + crop.width}" y2="${y}" />`);
  }

  return lines.join('\n');
};

const buildOverlaySvg = (row, peers, crop, width, height) => {
  const candidatePath = row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath || '';
  const labelFontSize = Math.max(8, Math.min(18, Math.round(crop.width / 13)));

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
  <style>
    .grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 0.8; vector-effect: non-scaling-stroke; }
    .current { fill: rgba(239, 68, 68, 0.2); stroke: #ef4444; stroke-width: 2.4; vector-effect: non-scaling-stroke; }
    .candidate { fill: rgba(6, 182, 212, 0.18); stroke: #06b6d4; stroke-width: 2.2; vector-effect: non-scaling-stroke; }
    .boundary { fill: none; stroke: #f59e0b; stroke-width: 1.5; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
    .hull { fill: none; stroke: #2563eb; stroke-width: 1.6; stroke-dasharray: 6 4; vector-effect: non-scaling-stroke; }
    .peer { fill: rgba(147, 51, 234, 0.08); stroke: #9333ea; stroke-width: 2; stroke-dasharray: 7 5; vector-effect: non-scaling-stroke; }
    .label { font: 900 ${labelFontSize}px Arial, sans-serif; fill: #020617; stroke: #ffffff; stroke-width: 3; paint-order: stroke; text-anchor: middle; dominant-baseline: central; }
    .peer-label { font: 800 ${Math.max(7, labelFontSize - 3)}px Arial, sans-serif; fill: #581c87; stroke: #ffffff; stroke-width: 2.4; paint-order: stroke; text-anchor: middle; dominant-baseline: central; }
  </style>
  ${gridLines(crop, 25)}
  ${peers.map((peer) => `<path class="peer" d="${xmlEscape(peer.currentPath)}"><title>${xmlEscape(`duplicate peer ${peer.block} current path`)}</title></path>`).join('\n  ')}
  <path class="current" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.block} current path`)}</title></path>
  ${candidatePath ? `<path class="candidate" d="${xmlEscape(candidatePath)}"><title>${xmlEscape(`${row.block} candidate outer boundary`)}</title></path>` : ''}
  ${row.candidateBoundaryPath && row.candidateBoundaryPath !== row.candidateOuterBoundaryPath ? `<path class="boundary" d="${xmlEscape(row.candidateBoundaryPath)}"><title>${xmlEscape(`${row.block} full boundary including inner rings`)}</title></path>` : ''}
  ${row.candidateHullPath ? `<path class="hull" d="${xmlEscape(row.candidateHullPath)}"><title>${xmlEscape(`${row.block} candidate hull`)}</title></path>` : ''}
  ${peers.map((peer) => `<circle cx="${peer.labelX}" cy="${peer.labelY}" r="2.5" fill="#9333ea" stroke="#ffffff" stroke-width="1.6" vector-effect="non-scaling-stroke" />
  <text class="peer-label" x="${peer.labelX}" y="${peer.labelY - 10}">${xmlEscape(peer.block)}</text>`).join('\n  ')}
  <circle cx="${row.labelX}" cy="${row.labelY}" r="4" fill="#0f172a" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />
  <text class="label" x="${row.labelX}" y="${row.labelY - 13}">${xmlEscape(row.block)}</text>
</svg>`;
};

const buildHeaderSvg = (row, peers, width, height) => {
  const duplicate = row.candidateDuplicateGroup
    ? ` duplicate=${row.candidateDuplicateGroup} peers=${peers.map((peer) => peer.block).join(' ')}`
    : '';
  const ratio = `inside=${row.componentInsidePathRatio || '-'} coverage=${row.pathColorCoverageRatio || '-'}`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" />
  <text x="10" y="19" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#0f172a">${xmlEscape(`${row.queuePriority} ${row.block} ${row.alignmentClass} ${row.category}`)}</text>
  <text x="10" y="38" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#475569">${xmlEscape(`${row.candidateStatus} ${ratio}${duplicate}`)}</text>
  <text x="10" y="56" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#be123c">${xmlEscape(`${row.recommendedAction}; red=current, cyan=candidate, purple=duplicate peer`)}</text>
</svg>`;
};

const priorityRank = (priority) => {
  const index = PRIORITY_ORDER.indexOf(priority);
  return index === -1 ? PRIORITY_ORDER.length : index;
};

const sortRows = (a, b) => (
  priorityRank(a.queuePriority) - priorityRank(b.queuePriority)
    || String(a.alignmentClass).localeCompare(String(b.alignmentClass))
    || String(a.category).localeCompare(String(b.category))
    || String(a.block).localeCompare(String(b.block), 'ko')
);

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const queuePriorities = new Set(argValue('--queue-priorities', PRIORITY_ORDER.join(',')).split(',').map((item) => item.trim()).filter(Boolean));
const scale = numberOr(argValue('--scale', '2'), 2);
const padding = numberOr(argValue('--padding', '44'), 44);
const limit = intOr(argValue('--limit', '0'), 0);
const imagePath = path.resolve(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath);
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');

const handoff = JSON.parse(await fs.readFile(handoffPath, 'utf8'));
const imageMetadata = await sharp(imagePath).metadata();
if (imageMetadata.width !== DAEGU_SEATMAP_IMAGE.imageWidth || imageMetadata.height !== DAEGU_SEATMAP_IMAGE.imageHeight) {
  throw new Error(`Daegu image size mismatch: actual=${imageMetadata.width}x${imageMetadata.height} data=${DAEGU_SEATMAP_IMAGE.imageWidth}x${DAEGU_SEATMAP_IMAGE.imageHeight}`);
}

const allRowsById = new Map(handoff.workItems.map((row) => [row.id, row]));
const rows = handoff.workItems
  .filter((row) => queuePriorities.has(row.queuePriority))
  .sort(sortRows)
  .slice(0, limit > 0 ? limit : undefined);

await fs.mkdir(outDir, { recursive: true });
await clearGeneratedCropImages(outDir);

const outputs = [];
for (const row of rows) {
  const peers = String(row.candidateDuplicateIds || '')
    .split(/\s+/)
    .filter(Boolean)
    .filter((id) => id !== row.id)
    .map((id) => allRowsById.get(id))
    .filter(Boolean);
  const crop = cropForRows([row, ...peers], padding);
  const outputWidth = crop.width * scale;
  const outputHeight = crop.height * scale;
  const headerHeight = 72;
  const overlaySvg = Buffer.from(buildOverlaySvg(row, peers, crop, outputWidth, outputHeight));
  const headerSvg = Buffer.from(buildHeaderSvg(row, peers, outputWidth, headerHeight));
  const fileName = `${row.queuePriority.toLowerCase()}-${sanitizeFilePart(row.alignmentClass)}-${sanitizeFilePart(row.category)}-${sanitizeFilePart(row.block)}-${sanitizeFilePart(row.id)}.png`;
  const outputPath = path.join(outDir, fileName);

  const cropBuffer = await sharp(imagePath)
    .extract({
      left: crop.x,
      top: crop.y,
      width: crop.width,
      height: crop.height,
    })
    .resize(outputWidth, outputHeight, { kernel: 'nearest' })
    .composite([{ input: overlaySvg, left: 0, top: 0 }])
    .png()
    .toBuffer();

  await sharp(cropBuffer)
    .extend({ top: headerHeight, background: '#f8fafc' })
    .composite([{ input: headerSvg, left: 0, top: 0 }])
    .png()
    .toFile(outputPath);

  outputs.push({
    id: row.id,
    block: row.block,
    name: row.name,
    category: row.category,
    queuePriority: row.queuePriority,
    alignmentClass: row.alignmentClass,
    candidateStatus: row.candidateStatus,
    candidateDuplicateGroup: row.candidateDuplicateGroup,
    duplicatePeerBlocks: peers.map((peer) => peer.block),
    recommendedAction: row.recommendedAction,
    riskFlags: row.riskFlags,
    componentInsidePathRatio: row.componentInsidePathRatio,
    pathColorCoverageRatio: row.pathColorCoverageRatio,
    crop,
    outputPath,
  });
}

const outputsByPriority = outputs.reduce((counts, output) => {
  counts[output.queuePriority] = (counts[output.queuePriority] ?? 0) + 1;
  return counts;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  evidenceVersion: EVIDENCE_VERSION,
  asset: DAEGU_SEATMAP_IMAGE,
  sourceHandoff: path.relative(frontendRoot, handoffPath),
  handoffSummary: handoff.summary,
  queuePriorities: [...queuePriorities],
  scale,
  padding,
  limit,
  totalOutputs: outputs.length,
  outputsByPriority,
  outputs,
};

const reportPath = path.join(reportDir, 'daegu-seatmap-handoff-evidence-crops.json');
const markdownPath = path.join(reportDir, 'daegu-seatmap-handoff-evidence-crops.md');
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, [
  '# 대구 좌석도 handoff evidence crops',
  '',
  `- evidence version: \`${EVIDENCE_VERSION}\``,
  `- generated: ${report.generatedAt}`,
  `- source handoff: \`${report.sourceHandoff}\``,
  `- queue priorities: ${[...queuePriorities].map((priority) => `\`${priority}\``).join(' ')}`,
  `- outputs: ${outputs.length}`,
  `- crop directory: \`${path.relative(reportDir, outDir)}\``,
  '',
  '## Priority outputs',
  '',
  markdownTable(
    ['priority', 'outputs'],
    PRIORITY_ORDER.map((priority) => [`\`${priority}\``, String(outputsByPriority[priority] ?? 0)]),
  ),
  '',
  '## Crop index',
  '',
  markdownTable(
    ['queue', 'block', 'name', 'alignment', 'candidate', 'duplicate', 'action', 'crop'],
    outputs.map((output) => [
      `\`${output.queuePriority}\``,
      `\`${output.block}\``,
      output.name,
      `\`${output.alignmentClass}\``,
      `\`${output.candidateStatus}\``,
      output.candidateDuplicateGroup ? `\`${output.candidateDuplicateGroup}\`` : '-',
      `\`${output.recommendedAction}\``,
      path.relative(reportDir, output.outputPath),
    ]),
  ),
  '',
  '## Legend',
  '',
  '- red: current SVG hit area',
  '- cyan: pixel candidate outer boundary',
  '- orange dashed: candidate boundary with inner rings',
  '- blue dashed: candidate hull',
  '- purple dashed: duplicate candidate peer current path',
  '- `TRACE_SHARED_CANDIDATE_BOUNDARIES`: duplicate candidate groups must be reviewed as separate official boundaries',
  '',
].join('\n'), 'utf8');

console.log(`handoff_evidence_report:${reportPath}`);
console.log(`handoff_evidence_markdown:${markdownPath}`);
console.log(`handoff_evidence_dir:${outDir}`);
console.log(`status:ok outputs=${outputs.length}`);
