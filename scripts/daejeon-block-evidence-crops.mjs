import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  buildAnchorImpactByBlockId,
  buildAnchorReviewCrops,
  coordinateImpactForBlock,
  reviewContractVersion,
} from './daejeon-seatmap-anchor-contract.mjs';
import {
  DAEJEON_BLOCKS,
  DAEJEON_SEATMAP_IMAGE,
  isDaejeonSelectableSeatBlock,
} from '../src/data/daejeonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const outputRoot = path.join(repoRoot, 'output/playwright');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const defaultOutDir = path.join(outputRoot, 'daejeon-block-review');
const imagePath = path.resolve(frontendRoot, DAEJEON_SEATMAP_IMAGE.imagePath);
const blockEvidenceContract = 'DAEJEON_BLOCK_EVIDENCE_CROP_V1';
const defaultBlockCodes = [
  '100A',
  '100B',
  '100C',
  '104',
  '105',
  '106',
  '107',
  '108',
  '109',
  '121',
  '122',
  '123',
  '124',
];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const hasArg = (name) => process.argv.includes(name);

const csvArg = (name) => String(argValue(name, ''))
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const numberOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const escapeXml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const pathToPoints = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
};

const boundsForPath = (pathData) => {
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

const unionBounds = (boundsList) => {
  const validBounds = boundsList.filter(Boolean);
  if (validBounds.length === 0) return null;

  return {
    minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
    minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
    maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
    maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
  };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const cropForBlock = (block, padding) => {
  const pathBounds = boundsForPath(block.imageGeometry.d);
  const hitBounds = boundsForPath(block.hitAreaD ?? block.imageGeometry.d);
  const labelBounds = {
    minX: block.imageGeometry.labelX,
    minY: block.imageGeometry.labelY,
    maxX: block.imageGeometry.labelX,
    maxY: block.imageGeometry.labelY,
  };
  const bounds = unionBounds([pathBounds, hitBounds, labelBounds]);

  if (!bounds) {
    throw new Error(`Cannot build Daejeon block crop without path bounds: ${block.id}`);
  }

  const minX = Math.floor(bounds.minX - padding);
  const minY = Math.floor(bounds.minY - padding);
  const maxX = Math.ceil(bounds.maxX + padding);
  const maxY = Math.ceil(bounds.maxY + padding);
  const x = clamp(minX, 0, DAEJEON_SEATMAP_IMAGE.imageWidth - 1);
  const y = clamp(minY, 0, DAEJEON_SEATMAP_IMAGE.imageHeight - 1);
  const right = clamp(maxX, x + 1, DAEJEON_SEATMAP_IMAGE.imageWidth);
  const bottom = clamp(maxY, y + 1, DAEJEON_SEATMAP_IMAGE.imageHeight);

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
    pathBounds,
    hitBounds,
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

const samePath = (left, right) => String(left ?? '').trim() === String(right ?? '').trim();

const gridLines = (crop, step) => {
  const lines = [];
  const startX = Math.ceil(crop.x / step) * step;
  const startY = Math.ceil(crop.y / step) * step;

  for (let x = startX; x <= crop.x + crop.width; x += step) {
    const major = x % 50 === 0;
    lines.push(`<line x1="${x}" y1="${crop.y}" x2="${x}" y2="${crop.y + crop.height}" class="${major ? 'grid-major' : 'grid'}" />`);
  }
  for (let y = startY; y <= crop.y + crop.height; y += step) {
    const major = y % 50 === 0;
    lines.push(`<line x1="${crop.x}" y1="${y}" x2="${crop.x + crop.width}" y2="${y}" class="${major ? 'grid-major' : 'grid'}" />`);
  }

  return lines.join('\n');
};

const bboxRect = (bounds, className) => {
  if (!bounds) return '';
  return `<rect class="${className}" x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" />`;
};

const buildOverlaySvg = (block, crop, width, height) => {
  const visiblePath = block.imageGeometry.d;
  const hitPath = block.hitAreaD ?? block.imageGeometry.d;
  const hasExpandedHitArea = !samePath(visiblePath, hitPath);
  const label = block.imageGeometry;
  const title = `${block.blockCode} ${block.id}`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
  <style>
    .grid { stroke: #0f172a; stroke-opacity: 0.16; stroke-width: 0.5; vector-effect: non-scaling-stroke; }
    .grid-major { stroke: #0f172a; stroke-opacity: 0.32; stroke-width: 0.9; vector-effect: non-scaling-stroke; }
    .visible { fill: rgba(37, 99, 235, 0.16); stroke: #1d4ed8; stroke-width: 2.4; vector-effect: non-scaling-stroke; }
    .hit { fill: rgba(239, 68, 68, 0.08); stroke: #dc2626; stroke-width: 1.8; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
    .path-bbox { fill: none; stroke: #1d4ed8; stroke-width: 0.9; stroke-dasharray: 2 2; vector-effect: non-scaling-stroke; }
    .hit-bbox { fill: none; stroke: #dc2626; stroke-width: 0.9; stroke-dasharray: 3 2; vector-effect: non-scaling-stroke; }
    .label-dot { fill: #111827; stroke: #ffffff; stroke-width: 2; vector-effect: non-scaling-stroke; }
    .label-cross { stroke: #111827; stroke-width: 1.4; vector-effect: non-scaling-stroke; }
    .block-label { font: 900 12px Arial, sans-serif; fill: #111827; stroke: #ffffff; stroke-width: 3; paint-order: stroke; text-anchor: middle; dominant-baseline: central; }
    .legend { font: 800 9px Arial, sans-serif; fill: #111827; stroke: #ffffff; stroke-width: 2; paint-order: stroke; }
  </style>
  ${gridLines(crop, 10)}
  ${hasExpandedHitArea ? `<path class="hit" d="${escapeXml(hitPath)}"><title>${escapeXml(`${title} hitAreaD`)}</title></path>` : ''}
  <path class="visible" d="${escapeXml(visiblePath)}"><title>${escapeXml(`${title} imageGeometry.d`)}</title></path>
  ${bboxRect(crop.pathBounds, 'path-bbox')}
  ${hasExpandedHitArea ? bboxRect(crop.hitBounds, 'hit-bbox') : ''}
  <line class="label-cross" x1="${label.labelX - 7}" y1="${label.labelY}" x2="${label.labelX + 7}" y2="${label.labelY}" />
  <line class="label-cross" x1="${label.labelX}" y1="${label.labelY - 7}" x2="${label.labelX}" y2="${label.labelY + 7}" />
  <circle class="label-dot" cx="${label.labelX}" cy="${label.labelY}" r="3.6" />
  <text class="block-label" x="${label.labelX}" y="${label.labelY - 14}">${escapeXml(block.blockCode)}</text>
  <text class="legend" x="${crop.x + 8}" y="${crop.y + 14}">blue=imageGeometry.d${hasExpandedHitArea ? ' / red=hitAreaD' : ' / hitAreaD=same'}</text>
  <rect x="${crop.x + 0.5}" y="${crop.y + 0.5}" width="${crop.width - 1}" height="${crop.height - 1}" fill="none" stroke="#111827" stroke-width="1" vector-effect="non-scaling-stroke" />
</svg>`;
};

const buildHeaderSvg = (block, impact, width, height) => {
  const anchorText = impact.anchorCropIds.length ? impact.anchorCropIds.join(', ') : 'none';
  const regressionText = impact.regressionTestIds.length ? impact.regressionTestIds.join(', ') : 'none';

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" />
  <text x="10" y="18" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#0f172a">${escapeXml(`${block.blockCode} ${block.name}`)}</text>
  <text x="10" y="36" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#334155">${escapeXml(block.id)}</text>
  <text x="10" y="53" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#1d4ed8">${escapeXml(`trace=${block.traceStatus} / ${block.traceMethod} / ${block.sourceConfidence}`)}</text>
  <text x="10" y="69" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#475569">${escapeXml(`priority=${impact.reviewPriority} mode=${impact.reviewMode}`)}</text>
  <text x="10" y="85" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#475569">${escapeXml(`anchors=${anchorText}`)}</text>
  <text x="10" y="101" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#475569">${escapeXml(`tests=${regressionText}`)}</text>
</svg>`;
};

const selectBlocks = () => {
  if (hasArg('--all')) {
    return [...DAEJEON_BLOCKS].sort((a, b) => a.id.localeCompare(b.id));
  }

  const requestedIds = new Set(csvArg('--blocks'));
  const requestedCodes = new Set((csvArg('--codes').length ? csvArg('--codes') : defaultBlockCodes)
    .map((code) => code.toUpperCase()));

  const blocks = DAEJEON_BLOCKS.filter((block) => (
    requestedIds.has(block.id)
    || requestedCodes.has(String(block.blockCode).toUpperCase())
  )).sort((a, b) => (
    String(a.blockCode).localeCompare(String(b.blockCode), 'en', { numeric: true })
    || a.id.localeCompare(b.id)
  ));

  const missingIds = [...requestedIds].filter((id) => !DAEJEON_BLOCKS.some((block) => block.id === id));
  if (missingIds.length > 0) {
    throw new Error(`Unknown Daejeon block id(s): ${missingIds.join(', ')}`);
  }

  if (blocks.length === 0) {
    throw new Error('No Daejeon blocks matched. Use --blocks id1,id2 or --codes 104,105.');
  }

  return blocks;
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const scale = numberOr(argValue('--scale', '4'), 4);
const padding = numberOr(argValue('--padding', '42'), 42);
const anchorImpactByBlockId = buildAnchorImpactByBlockId(buildAnchorReviewCrops(path.join(outputRoot, 'daejeon-anchor-review')));

const imageMetadata = await sharp(imagePath).metadata();
if (imageMetadata.width !== DAEJEON_SEATMAP_IMAGE.imageWidth || imageMetadata.height !== DAEJEON_SEATMAP_IMAGE.imageHeight) {
  throw new Error(`Daejeon image size mismatch: actual=${imageMetadata.width}x${imageMetadata.height} data=${DAEJEON_SEATMAP_IMAGE.imageWidth}x${DAEJEON_SEATMAP_IMAGE.imageHeight}`);
}

const blocks = selectBlocks();
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(reportDir, { recursive: true });
await clearGeneratedCropImages(outDir);

const outputs = [];
for (const block of blocks) {
  const crop = cropForBlock(block, padding);
  const outputWidth = crop.width * scale;
  const outputHeight = crop.height * scale;
  const headerHeight = 112;
  const impact = coordinateImpactForBlock(anchorImpactByBlockId, block.id);
  const overlaySvg = Buffer.from(buildOverlaySvg(block, crop, outputWidth, outputHeight));
  const headerSvg = Buffer.from(buildHeaderSvg(block, impact, outputWidth, headerHeight));
  const outputPath = path.join(outDir, `${block.id}.png`);

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

  const finalBuffer = await sharp(cropBuffer)
    .extend({ top: headerHeight, background: '#f8fafc' })
    .composite([{ input: headerSvg, left: 0, top: 0 }])
    .png()
    .toBuffer();

  await fs.writeFile(outputPath, finalBuffer);

  outputs.push({
    id: block.id,
    blockCode: block.blockCode,
    parentId: block.parentId,
    officialBlockLabel: block.officialBlockLabel,
    officialSectionName: block.officialSectionName,
    name: block.name,
    traceStatus: block.traceStatus,
    traceMethod: block.traceMethod,
    sourceConfidence: block.sourceConfidence,
    selectable: isDaejeonSelectableSeatBlock(block),
    label: {
      x: block.imageGeometry.labelX,
      y: block.imageGeometry.labelY,
      shortLabel: block.imageGeometry.shortLabel,
    },
    crop: {
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
      pathBounds: crop.pathBounds,
      hitBounds: crop.hitBounds,
    },
    hasExpandedHitArea: !samePath(block.imageGeometry.d, block.hitAreaD ?? block.imageGeometry.d),
    anchorCropIds: impact.anchorCropIds,
    regressionTestIds: impact.regressionTestIds,
    reviewPriority: impact.reviewPriority,
    reviewMode: impact.reviewMode,
    riskTags: impact.riskTags,
    outputPath,
    outputPathRelativeToRepo: path.relative(repoRoot, outputPath).replaceAll(path.sep, '/'),
    sha256: createHash('sha256').update(finalBuffer).digest('hex'),
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  contract: blockEvidenceContract,
  reviewContractVersion,
  asset: DAEJEON_SEATMAP_IMAGE,
  scale,
  padding,
  requested: {
    all: hasArg('--all'),
    blocks: csvArg('--blocks'),
    codes: csvArg('--codes').length ? csvArg('--codes') : defaultBlockCodes,
  },
  policy: {
    blue: 'visible highlight/stroke source: imageGeometry.d',
    red: 'click-only hitAreaD when it differs from imageGeometry.d',
    note: '이 crop은 좌표 검수 산출물이며 운영 geometry를 새로 만들지 않는다.',
  },
  outputs,
};

const reportPath = path.join(reportDir, 'daejeon-seatmap-block-evidence-crops.json');
const markdownPath = path.join(reportDir, 'daejeon-seatmap-block-evidence-crops.md');
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, [
  '# 대전 좌석도 block evidence crops',
  '',
  `- generated: ${report.generatedAt}`,
  `- contract: \`${blockEvidenceContract}\``,
  `- review contract: \`${reviewContractVersion}\``,
  `- output dir: \`${path.relative(frontendRoot, outDir).replaceAll(path.sep, '/')}\``,
  `- outputs: ${outputs.length}`,
  '- blue overlay: `imageGeometry.d` visible highlight',
  '- red dashed overlay: `hitAreaD` click-only area when expanded',
  '',
  '| block | section | priority | mode | expanded hit | anchors | tests | crop |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...outputs.map((output) => [
    `\`${output.blockCode}\`<br>\`${output.id}\``,
    output.officialSectionName,
    output.reviewPriority,
    output.reviewMode,
    String(output.hasExpandedHitArea),
    output.anchorCropIds.map((id) => `\`${id}\``).join('<br>') || 'none',
    output.regressionTestIds.map((id) => `\`${id}\``).join('<br>') || 'none',
    `\`${output.outputPathRelativeToRepo}\``,
  ].join(' | ')).map((row) => `| ${row} |`),
  '',
].join('\n'), 'utf8');

console.log(`block_evidence_report:${reportPath}`);
console.log(`block_evidence_markdown:${markdownPath}`);
console.log(`block_evidence_dir:${outDir}`);
console.log(`status:ok outputs=${outputs.length}`);
