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
const defaultOutDir = path.join(defaultReportDir, 'daegu-evidence-crops');

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

const numberOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const sanitizeFilePart = (value) => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '');

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

const normalizeBounds = (bounds) => {
  if (!bounds || typeof bounds !== 'object') return null;
  const { minX, minY, maxX, maxY } = bounds;
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  return { minX, minY, maxX, maxY };
};

const cropForRow = (row, padding) => {
  const bounds = [
    normalizeBounds(row.currentPathBounds),
    normalizeBounds(row.candidateBbox),
    row.candidateOuterBoundaryPath ? pathBounds(row.candidateOuterBoundaryPath) : null,
    row.candidateBoundaryPath ? pathBounds(row.candidateBoundaryPath) : null,
  ].filter(Boolean);

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

const buildOverlaySvg = (row, crop, width, height) => {
  const candidatePath = row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath || '';
  const labelFontSize = Math.max(8, Math.min(16, Math.round(crop.width / 12)));
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
  <style>
    .grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 0.8; vector-effect: non-scaling-stroke; }
    .current { fill: rgba(239, 68, 68, 0.18); stroke: #ef4444; stroke-width: 2; vector-effect: non-scaling-stroke; }
    .candidate { fill: rgba(6, 182, 212, 0.18); stroke: #06b6d4; stroke-width: 2; vector-effect: non-scaling-stroke; }
    .boundary { fill: none; stroke: #f59e0b; stroke-width: 1.2; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
    .hull { fill: none; stroke: #2563eb; stroke-width: 1.5; stroke-dasharray: 6 4; vector-effect: non-scaling-stroke; }
    .label { font: 800 ${labelFontSize}px Arial, sans-serif; fill: #020617; stroke: #ffffff; stroke-width: 3; paint-order: stroke; text-anchor: middle; dominant-baseline: central; }
  </style>
  ${gridLines(crop, 25)}
  <path class="current" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.block} current legacy path`)}</title></path>
  ${candidatePath ? `<path class="candidate" d="${xmlEscape(candidatePath)}"><title>${xmlEscape(`${row.block} candidate outer boundary`)}</title></path>` : ''}
  ${row.candidateBoundaryPath && row.candidateBoundaryPath !== row.candidateOuterBoundaryPath ? `<path class="boundary" d="${xmlEscape(row.candidateBoundaryPath)}"><title>${xmlEscape(`${row.block} full boundary including inner rings`)}</title></path>` : ''}
  ${row.candidateHullPath ? `<path class="hull" d="${xmlEscape(row.candidateHullPath)}"><title>${xmlEscape(`${row.block} candidate hull`)}</title></path>` : ''}
  <circle cx="${row.labelX}" cy="${row.labelY}" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />
  <text class="label" x="${row.labelX}" y="${row.labelY - 12}">${xmlEscape(row.block)}</text>
</svg>`;
};

const buildHeaderSvg = (row, width, height) => {
  const duplicate = row.candidateDuplicateGroup
    ? ` duplicate=${row.candidateDuplicateGroup}`
    : '';
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" />
  <text x="10" y="19" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#0f172a">${xmlEscape(`${row.tracePriority} ${row.block} ${row.category} ${row.name}`)}</text>
  <text x="10" y="38" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">${xmlEscape(`candidate=${row.candidateStatus} inside=${row.componentInsidePathRatio || '-'} coverage=${row.pathColorCoverageRatio || '-'}${duplicate}`)}</text>
  <text x="10" y="55" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#be123c">${xmlEscape('red=current, cyan=outer candidate, orange dashed=inner rings, blue dashed=hull')}</text>
</svg>`;
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const priorities = new Set(argValue('--priorities', 'P0,P1').split(',').map((item) => item.trim()).filter(Boolean));
const scale = numberOr(argValue('--scale', '2'), 2);
const padding = numberOr(argValue('--padding', '40'), 40);
const imagePath = path.resolve(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath);
const manifestPath = path.join(reportDir, 'daegu-seatmap-trace-review.json');

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const imageMetadata = await sharp(imagePath).metadata();
if (imageMetadata.width !== DAEGU_SEATMAP_IMAGE.imageWidth || imageMetadata.height !== DAEGU_SEATMAP_IMAGE.imageHeight) {
  throw new Error(`Daegu image size mismatch: actual=${imageMetadata.width}x${imageMetadata.height} data=${DAEGU_SEATMAP_IMAGE.imageWidth}x${DAEGU_SEATMAP_IMAGE.imageHeight}`);
}

const rows = manifest.blocks
  .filter((row) => priorities.has(row.tracePriority))
  .sort((a, b) => (
    a.tracePriority.localeCompare(b.tracePriority)
    || a.category.localeCompare(b.category)
    || String(a.block).localeCompare(String(b.block), 'ko')
  ));

await fs.mkdir(outDir, { recursive: true });

const outputs = [];
for (const row of rows) {
  const crop = cropForRow(row, padding);
  const outputWidth = crop.width * scale;
  const outputHeight = crop.height * scale;
  const headerHeight = 64;
  const overlaySvg = Buffer.from(buildOverlaySvg(row, crop, outputWidth, outputHeight));
  const headerSvg = Buffer.from(buildHeaderSvg(row, outputWidth, headerHeight));
  const fileName = `${row.tracePriority.toLowerCase()}-${sanitizeFilePart(row.category)}-${sanitizeFilePart(row.block)}-${sanitizeFilePart(row.id)}.png`;
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
    tracePriority: row.tracePriority,
    candidateStatus: row.candidateStatus,
    candidateDuplicateGroup: row.candidateDuplicateGroup,
    componentInsidePathRatio: row.componentInsidePathRatio,
    pathColorCoverageRatio: row.pathColorCoverageRatio,
    crop,
    outputPath,
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  asset: DAEGU_SEATMAP_IMAGE,
  priorities: [...priorities],
  scale,
  padding,
  outputs,
};

const reportPath = path.join(reportDir, 'daegu-seatmap-evidence-crops.json');
const markdownPath = path.join(reportDir, 'daegu-seatmap-evidence-crops.md');
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, [
  '# 대구 좌석도 evidence crops',
  '',
  `- generated: ${report.generatedAt}`,
  `- priorities: ${[...priorities].join(', ')}`,
  `- outputs: ${outputs.length}`,
  '',
  '| priority | block | category | candidate | duplicate | crop |',
  '| --- | --- | --- | --- | --- | --- |',
  ...outputs.map((output) => (
    `| ${output.tracePriority} | ${output.block} | ${output.category} | ${output.candidateStatus} | ${output.candidateDuplicateGroup || '-'} | ${path.relative(reportDir, output.outputPath)} |`
  )),
  '',
].join('\n'), 'utf8');

console.log(`evidence_report:${reportPath}`);
console.log(`evidence_markdown:${markdownPath}`);
console.log(`evidence_dir:${outDir}`);
console.log(`status:ok outputs=${outputs.length}`);
