import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  GOCHEOK_BLOCKS,
  GOCHEOK_CATEGORIES,
  GOCHEOK_OMITTED_OFFICIAL_BLOCKS,
  GOCHEOK_SEATMAP_IMAGE,
} from '../src/data/gocheokSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const imagePath = path.join(frontendRoot, GOCHEOK_SEATMAP_IMAGE.imagePath);
const blocksById = new Map(GOCHEOK_BLOCKS.map((block) => [block.id, block]));

const rangeBlockIds = (start, end) => (
  Array.from({ length: end - start + 1 }, (_, index) => `gocheok-${start + index}`)
);

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

const intersectsCrop = (bounds, crop) => (
  bounds.maxX >= crop.x
  && bounds.minX <= crop.x + crop.width
  && bounds.maxY >= crop.y
  && bounds.minY <= crop.y + crop.height
);

const containsBounds = (bounds, crop) => (
  bounds.minX >= crop.x
  && bounds.maxX <= crop.x + crop.width
  && bounds.minY >= crop.y
  && bounds.maxY <= crop.y + crop.height
);

const crops = [
  {
    id: 'top-outfield',
    title: '323-334 and 425-435 top outfield',
    x: 130,
    y: 65,
    width: 420,
    height: 155,
    blockIds: [
      ...rangeBlockIds(323, 334),
      ...rangeBlockIds(425, 435),
    ],
  },
  {
    id: 'right-outfield-335-review',
    title: 'Right outfield 335 omission review',
    x: 420,
    y: 95,
    width: 160,
    height: 150,
    blockIds: [
      'gocheok-334',
      'gocheok-435',
      'gocheok-220',
      'gocheok-221',
      'gocheok-222',
    ],
    note: `Omitted: ${GOCHEOK_OMITTED_OFFICIAL_BLOCKS.map((entry) => entry.block).join(', ') || '-'}`,
  },
  {
    id: 'anchor-overview',
    title: 'Anchor blocks 101/114/401/424/430/412',
    x: 20,
    y: 95,
    width: 610,
    height: 780,
    blockIds: [
      'gocheok-101',
      'gocheok-114',
      'gocheok-401',
      'gocheok-424',
      'gocheok-430',
      'gocheok-412',
    ],
  },
];

const expectedCropIds = new Set(['top-outfield', 'right-outfield-335-review', 'anchor-overview']);
if (crops.length !== expectedCropIds.size || crops.some((crop) => !expectedCropIds.has(crop.id))) {
  throw new Error(`Unexpected Gocheok evidence crop set: ${crops.map((crop) => crop.id).join(', ')}`);
}

const buildOverlaySvg = (crop, blocks) => {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
  <style>
    .label { font: 700 9px Arial, sans-serif; text-anchor: middle; dominant-baseline: central; fill: #020617; stroke: #ffffff; stroke-width: 2px; paint-order: stroke; }
  </style>
  <rect x="${crop.x + 1}" y="${crop.y + 1}" width="${crop.width - 2}" height="${crop.height - 2}" fill="none" stroke="#0f172a" stroke-width="2" />
  ${blocks.map((block) => {
    const category = GOCHEOK_CATEGORIES[block.category];
    const color = category?.light ?? '#38bdf8';
    return `
  <path d="${xmlEscape(block.imageGeometry.d)}" fill="${color}" fill-opacity="0.38" stroke="#0f172a" stroke-width="1.5" vector-effect="non-scaling-stroke" />
  <text class="label" x="${block.imageGeometry.labelX}" y="${block.imageGeometry.labelY}">${xmlEscape(block.imageGeometry.shortLabel)}</text>`;
  }).join('')}
</svg>`;
};

const buildHeaderSvg = (crop, headerHeight) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${headerHeight}" viewBox="0 0 ${crop.width} ${headerHeight}">
  <rect x="0" y="0" width="${crop.width}" height="${headerHeight}" fill="#f8fafc" />
  <text x="8" y="17" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${xmlEscape(crop.title)}</text>
  ${crop.note ? `<text x="8" y="33" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#be123c">${xmlEscape(crop.note)}</text>` : ''}
</svg>`;

await fs.mkdir(outDir, { recursive: true });

const metadata = await sharp(imagePath).metadata();
if (metadata.width !== GOCHEOK_SEATMAP_IMAGE.imageWidth || metadata.height !== GOCHEOK_SEATMAP_IMAGE.imageHeight) {
  throw new Error(`Unexpected Gocheok image size: ${metadata.width}x${metadata.height}`);
}

const outputs = [];

for (const crop of crops) {
  const blocks = crop.blockIds
    .map((id) => blocksById.get(id))
    .filter(Boolean)
    .filter((block) => intersectsCrop(pathBounds(block.imageGeometry.d), crop));
  const missingBlockIds = crop.blockIds.filter((id) => !blocksById.has(id));
  if (missingBlockIds.length > 0) {
    throw new Error(`${crop.id} evidence crop references missing blocks: ${missingBlockIds.join(', ')}`);
  }
  if (blocks.length === 0) {
    throw new Error(`${crop.id} evidence crop did not include any visible hit-area paths`);
  }
  const clippedBlockIds = blocks
    .filter((block) => !containsBounds(pathBounds(block.imageGeometry.d), crop))
    .map((block) => block.id);
  if (clippedBlockIds.length > 0) {
    throw new Error(`${crop.id} evidence crop clips hit-area paths: ${clippedBlockIds.join(', ')}`);
  }

  const overlay = Buffer.from(buildOverlaySvg(crop, blocks));
  const headerHeight = crop.note ? 42 : 26;
  const header = Buffer.from(buildHeaderSvg(crop, headerHeight));
  const outputPath = path.join(outDir, `gocheok-evidence-${crop.id}.png`);

  const cropBuffer = await sharp(imagePath)
    .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();

  await sharp(cropBuffer)
    .extend({ top: headerHeight, background: '#f8fafc' })
    .composite([{ input: header, left: 0, top: 0 }])
    .png()
    .toFile(outputPath);

  outputs.push({
    id: crop.id,
    title: crop.title,
    path: outputPath,
    crop: {
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    },
    headerHeight,
    blockIds: blocks.map((block) => block.id),
    missingBlockIds,
    omittedOfficialBlocks: GOCHEOK_OMITTED_OFFICIAL_BLOCKS,
  });
}

const reportPath = path.join(outDir, 'gocheok-seatmap-evidence-crops.json');
await fs.writeFile(reportPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  asset: GOCHEOK_SEATMAP_IMAGE,
  outputs,
}, null, 2)}\n`, 'utf8');

outputs.forEach((output) => {
  console.log(`evidence_${output.id}:${output.path}`);
});
console.log(`evidence_report:${reportPath}`);
