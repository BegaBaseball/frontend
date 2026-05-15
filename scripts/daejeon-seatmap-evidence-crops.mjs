import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  DAEJEON_BLOCKS,
  DAEJEON_P2_DEDUPLICATED_ALIASES,
  DAEJEON_SEATMAP_IMAGE,
} from '../src/data/daejeonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultOutDir = path.join(defaultReportDir, 'daejeon-p2-evidence-crops');

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

const pathToPoints = (pathData) => {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
};

const pathBounds = (pathData) => {
  const points = pathToPoints(pathData);
  if (points.length === 0) return null;

  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
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

const cropForRows = (rows, padding) => {
  const bounds = rows
    .map((row) => normalizeBounds(pathBounds(row.hitAreaD || row.imageGeometry?.d || '')))
    .filter(Boolean);

  if (bounds.length === 0) {
    throw new Error('Cannot build Daejeon evidence crop without path bounds');
  }

  const minX = Math.floor(Math.min(...bounds.map((item) => item.minX)) - padding);
  const minY = Math.floor(Math.min(...bounds.map((item) => item.minY)) - padding);
  const maxX = Math.ceil(Math.max(...bounds.map((item) => item.maxX)) + padding);
  const maxY = Math.ceil(Math.max(...bounds.map((item) => item.maxY)) + padding);

  const x = clamp(minX, 0, DAEJEON_SEATMAP_IMAGE.imageWidth - 1);
  const y = clamp(minY, 0, DAEJEON_SEATMAP_IMAGE.imageHeight - 1);
  const right = clamp(maxX, x + 1, DAEJEON_SEATMAP_IMAGE.imageWidth);
  const bottom = clamp(maxY, y + 1, DAEJEON_SEATMAP_IMAGE.imageHeight);

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

const buildOverlaySvg = (alias, canonicalOwnerRow, crop, width, height) => {
  const labelFontSize = Math.max(8, Math.min(16, Math.round(crop.width / 13)));

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
  <style>
    .grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 0.8; vector-effect: non-scaling-stroke; }
    .owner { fill: rgba(14, 165, 233, 0.2); stroke: #0284c7; stroke-width: 2.4; vector-effect: non-scaling-stroke; }
    .owner-label { font: 900 ${labelFontSize}px Arial, sans-serif; fill: #075985; stroke: #ffffff; stroke-width: 2.8; paint-order: stroke; text-anchor: middle; dominant-baseline: central; }
  </style>
  ${gridLines(crop, 25)}
  <path class="owner" d="${xmlEscape(canonicalOwnerRow.hitAreaD)}"><title>${xmlEscape(`${canonicalOwnerRow.id} canonical owner for retired ${alias.retiredBlockId}`)}</title></path>
  <circle cx="${canonicalOwnerRow.labelX}" cy="${canonicalOwnerRow.labelY}" r="3" fill="#0369a1" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />
  <text class="owner-label" x="${canonicalOwnerRow.labelX}" y="${canonicalOwnerRow.labelY - 10}">${xmlEscape(canonicalOwnerRow.blockCode)}</text>
</svg>`;
};

const buildHeaderSvg = (alias, canonicalOwnerRow, width, height) => {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" />
  <text x="10" y="19" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#0f172a">${xmlEscape(`${alias.blockCode}. retired ${alias.retiredBlockId}`)}</text>
  <text x="10" y="38" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">${xmlEscape(`blue=canonical owner: ${canonicalOwnerRow.id}`)}</text>
  <text x="10" y="56" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#0369a1">${xmlEscape('Retired alias has no operational geometry. This crop shows the traced canonical owner only.')}</text>
</svg>`;
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const scale = numberOr(argValue('--scale', '3'), 3);
const padding = numberOr(argValue('--padding', '56'), 56);
const imagePath = path.resolve(frontendRoot, DAEJEON_SEATMAP_IMAGE.imagePath);
const manifestPath = path.join(reportDir, 'daejeon-seatmap-trace-review.json');

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const imageMetadata = await sharp(imagePath).metadata();
if (imageMetadata.width !== DAEJEON_SEATMAP_IMAGE.imageWidth || imageMetadata.height !== DAEJEON_SEATMAP_IMAGE.imageHeight) {
  throw new Error(`Daejeon image size mismatch: actual=${imageMetadata.width}x${imageMetadata.height} data=${DAEJEON_SEATMAP_IMAGE.imageWidth}x${DAEJEON_SEATMAP_IMAGE.imageHeight}`);
}

const blockRowsById = new Map(manifest.blocks.map((row) => [row.id, row]));
const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));

await fs.mkdir(outDir, { recursive: true });
await clearGeneratedCropImages(outDir);

const outputs = [];
for (const alias of DAEJEON_P2_DEDUPLICATED_ALIASES) {
  const canonicalOwnerRow = blockRowsById.get(alias.canonicalBlockId);
  if (!canonicalOwnerRow) {
    throw new Error(`Missing Daejeon canonical owner row for ${alias.retiredBlockId}: ${alias.canonicalBlockId}`);
  }
  if (blockRowsById.has(alias.retiredBlockId) || blockById.has(alias.retiredBlockId)) {
    throw new Error(`Retired Daejeon alias should not exist as operational geometry: ${alias.retiredBlockId}`);
  }

  const crop = cropForRows([canonicalOwnerRow], padding);
  const outputWidth = crop.width * scale;
  const outputHeight = crop.height * scale;
  const headerHeight = 72;
  const overlaySvg = Buffer.from(buildOverlaySvg(alias, canonicalOwnerRow, crop, outputWidth, outputHeight));
  const headerSvg = Buffer.from(buildHeaderSvg(alias, canonicalOwnerRow, outputWidth, headerHeight));
  const fileName = path.basename(alias.evidenceCropPath);
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
    retiredBlockId: alias.retiredBlockId,
    blockCode: alias.blockCode,
    retiredParentId: alias.retiredParentId,
    officialSectionName: alias.officialSectionName,
    canonicalBlockId: alias.canonicalBlockId,
    reason: alias.reason,
    evidenceCropPath: alias.evidenceCropPath,
    ownerBlockId: canonicalOwnerRow.id,
    ownerLabel: canonicalOwnerRow.officialBlockLabel,
    overlayBlockIds: [canonicalOwnerRow.id],
    crop,
    outputPath,
    retiredBlockExists: blockById.has(alias.retiredBlockId),
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  asset: DAEJEON_SEATMAP_IMAGE,
  scale,
  padding,
  note: 'P2 retired aliases are not operational geometry. Evidence crops show only the official traced canonical owner for each duplicate blockCode.',
  outputs,
};

const reportPath = path.join(reportDir, 'daejeon-seatmap-p2-evidence-crops.json');
const markdownPath = path.join(reportDir, 'daejeon-seatmap-p2-evidence-crops.md');
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, [
  '# 대전 좌석도 P2 deduplicated alias evidence crops',
  '',
  `- generated: ${report.generatedAt}`,
  `- outputs: ${outputs.length}`,
  '- blue: 같은 blockCode로 이미 traced 된 canonical owner path',
  '- retired alias는 운영 geometry가 아니므로 red pending overlay를 생성하지 않습니다.',
  '',
  '| order | retired block | section | canonical owner | crop |',
  '| --- | --- | --- | --- | --- |',
  ...outputs.map((output, index) => (
    `| ${index + 1} | \`${output.retiredBlockId}\` | ${output.officialSectionName} | \`${output.ownerBlockId}\` | ${path.relative(reportDir, output.outputPath)} |`
  )),
  '',
].join('\n'), 'utf8');

console.log(`evidence_report:${reportPath}`);
console.log(`evidence_markdown:${markdownPath}`);
console.log(`evidence_dir:${outDir}`);
console.log(`status:ok outputs=${outputs.length}`);
