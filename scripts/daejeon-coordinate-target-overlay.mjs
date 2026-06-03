import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  DAEJEON_BLOCKS,
  DAEJEON_SEATMAP_IMAGE,
} from '../src/data/daejeonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const outputRoot = path.resolve(frontendRoot, '..', 'output/playwright');
const outputPath = path.join(outputRoot, 'daejeon-coordinate-audit-targets.svg');

const targetBlockIds = [
  'catcher-back-100__100b',
  'central-reserved-100__100b',
  'central-table-100__100b',
  'first-infield-b-101-108__105',
  'first-infield-b-101-108__108',
  'third-infield-a-113-120-213-225__115',
  'third-infield-a-113-120-213-225__120',
  'third-infield-b-121-124__124',
  'cass-cheering-200__200',
  'innings-vip-400__400',
  'splash-jacuzzi-425__425',
  'splash-caravan-426__426',
  'outfield-lawn-500__500',
  'outfield-table-third-501-503__501',
  'outfield-table-first-504-508__508',
  'outfield-reserved-509__509',
];

const colors = [
  '#00E5FF',
  '#FF00E5',
  '#00FF6A',
  '#FFD000',
  '#7C3AED',
  '#EF4444',
  '#14B8A6',
  '#F97316',
  '#22C55E',
  '#2563EB',
  '#EC4899',
  '#0F172A',
];

const escapeText = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const imageHref = pathToFileURL(path.resolve(frontendRoot, DAEJEON_SEATMAP_IMAGE.imagePath)).href;
const targetBlocks = targetBlockIds.map((id, index) => ({
  id,
  index,
  block: DAEJEON_BLOCKS.find((candidate) => candidate.id === id),
}));

const overlayPaths = targetBlocks.map(({ id, index, block }) => {
  const color = colors[index % colors.length];
  if (!block) {
    return `<text x="20" y="${30 + index * 18}" font-size="14" fill="red">missing ${escapeText(id)}</text>`;
  }

  const { imageGeometry } = block;
  return [
    '<g>',
    `<path d="${imageGeometry.d}" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="4" vector-effect="non-scaling-stroke" />`,
    `<circle cx="${imageGeometry.labelX}" cy="${imageGeometry.labelY}" r="7" fill="${color}" stroke="white" stroke-width="2" />`,
    `<text x="${imageGeometry.labelX + 9}" y="${imageGeometry.labelY - 9}" font-size="16" font-weight="900" fill="${color}" stroke="white" stroke-width="3" paint-order="stroke">${escapeText(block.blockCode)}</text>`,
    '</g>',
  ].join('');
}).join('\n');

const legend = targetBlocks.map(({ id, index, block }) => {
  const color = colors[index % colors.length];
  return `<text x="12" y="${1012 + index * 14}" font-size="11" fill="${color}">${escapeText(block?.blockCode ?? 'missing')} · ${escapeText(id)}</text>`;
}).join('\n');

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DAEJEON_SEATMAP_IMAGE.imageWidth} ${DAEJEON_SEATMAP_IMAGE.imageHeight}" width="${DAEJEON_SEATMAP_IMAGE.imageWidth}" height="${DAEJEON_SEATMAP_IMAGE.imageHeight}">`,
  `<image href="${imageHref}" x="0" y="0" width="${DAEJEON_SEATMAP_IMAGE.imageWidth}" height="${DAEJEON_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />`,
  overlayPaths,
  '<rect x="0" y="990" width="920" height="70" fill="white" opacity="0.78" />',
  legend,
  '</svg>',
].join('\n');

await fs.mkdir(outputRoot, { recursive: true });
await fs.writeFile(outputPath, svg, 'utf8');

console.log(`overlay_svg:${outputPath}`);
