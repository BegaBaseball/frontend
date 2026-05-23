import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { GWANGJU_BLOCKS } from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const outDir = path.join(frontendRoot, 'reports/stadium/manual-official-retrace-v87');
const imagePath = path.join(frontendRoot, 'src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png');

const THIRD_BASE_CROP = { left: 330, top: 160, width: 520, height: 600 };
const THIRD_BASE_IDS = [
  'sky-picnic-s-333',
  'sky-picnic-s-334',
  'sky-picnic-s-335',
  'k7-121',
  'k7-122',
  'k8-123',
  'k5-124',
  'k5-125',
  'k5-126',
  'k5-127',
  'third-family-seats',
  'third-wheelchair-seats',
  'party-seats-third',
  'third-surprise-seats',
];

const CANDIDATE_BLOCKS = [
  { id: 'k7-121', color: 'yellow', rough: { minX: 350, minY: 520, maxX: 610, maxY: 655 }, label: [515, 590] },
  { id: 'k7-122', color: 'yellow', rough: { minX: 380, minY: 470, maxX: 630, maxY: 575 }, label: [540, 530] },
  { id: 'k8-123', color: 'yellow', rough: { minX: 405, minY: 420, maxX: 680, maxY: 525 }, label: [555, 480] },
  { id: 'k5-124', color: 'coral', rough: { minX: 430, minY: 365, maxX: 705, maxY: 500 }, label: [570, 430] },
  { id: 'k5-125', color: 'coral', rough: { minX: 455, minY: 310, maxX: 725, maxY: 435 }, label: [590, 380] },
  { id: 'k5-126', color: 'coral', rough: { minX: 520, minY: 255, maxX: 745, maxY: 465 }, label: [650, 440] },
  { id: 'k5-127', color: 'coral', rough: { minX: 655, minY: 290, maxX: 760, maxY: 430 }, label: [700, 360] },
];

const blockById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));

function shiftPath(pathData, crop) {
  let pointIndex = 0;
  return String(pathData).replace(/-?\d+(?:\.\d+)?/g, (rawValue) => {
    const offset = pointIndex % 2 === 0 ? crop.left : crop.top;
    pointIndex += 1;
    return String(Number((Number(rawValue) - offset).toFixed(1)));
  });
}

function gridSvg(crop) {
  const lines = [];
  for (let x = Math.ceil(crop.left / 25) * 25; x <= crop.left + crop.width; x += 25) {
    const sx = x - crop.left;
    const major = x % 100 === 0;
    lines.push(`<line x1="${sx}" y1="0" x2="${sx}" y2="${crop.height}" stroke="${major ? '#111827' : '#9ca3af'}" stroke-width="${major ? 1.2 : 0.5}" opacity="0.6"/>`);
    if (major) lines.push(`<text x="${sx + 2}" y="14" font-size="11" fill="#111827">x${x}</text>`);
  }
  for (let y = Math.ceil(crop.top / 25) * 25; y <= crop.top + crop.height; y += 25) {
    const sy = y - crop.top;
    const major = y % 100 === 0;
    lines.push(`<line x1="0" y1="${sy}" x2="${crop.width}" y2="${sy}" stroke="${major ? '#111827' : '#9ca3af'}" stroke-width="${major ? 1.2 : 0.5}" opacity="0.6"/>`);
    if (major) lines.push(`<text x="2" y="${sy + 12}" font-size="11" fill="#111827">y${y}</text>`);
  }
  return lines.join('');
}

function currentOverlaySvg(crop, ids) {
  const paths = [];
  for (const id of ids) {
    const block = blockById.get(id);
    if (!block) continue;
    const hitPath = block.imageGeometry.d;
    const visualPath = block.imageGeometry.visualD ?? hitPath;
    paths.push(`<path d="${shiftPath(visualPath, crop)}" fill="rgba(220,38,38,0.12)" stroke="#dc2626" stroke-width="2.2" stroke-dasharray="7 4"/>`);
    paths.push(`<path d="${shiftPath(hitPath, crop)}" fill="rgba(37,99,235,0.12)" stroke="#2563eb" stroke-width="1.7"/>`);
    paths.push(`<circle cx="${block.imageGeometry.labelX - crop.left}" cy="${block.imageGeometry.labelY - crop.top}" r="3.5" fill="#111827"/>`);
    paths.push(`<text x="${block.imageGeometry.labelX - crop.left + 5}" y="${block.imageGeometry.labelY - crop.top - 5}" font-size="12" fill="#111827" stroke="white" stroke-width="3" paint-order="stroke">${id}</text>`);
  }
  return [
    `<svg width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}" xmlns="http://www.w3.org/2000/svg">`,
    gridSvg(crop),
    paths.join(''),
    '</svg>',
  ].join('');
}

function isCandidatePixel({ r, g, b }, color) {
  if (color === 'yellow') {
    return r >= 235 && g >= 175 && g <= 230 && b >= 70 && b <= 150;
  }
  if (color === 'coral') {
    return r >= 225 && g >= 115 && g <= 205 && b >= 100 && b <= 190;
  }
  return false;
}

function cross(origin, a, b) {
  return (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0]);
}

function convexHull(points) {
  const unique = [...new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values()]
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (unique.length <= 1) return unique;
  const lower = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const point = unique[index];
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function simplifyHull(points, minimumDistance = 8) {
  const simplified = [];
  for (const point of points) {
    const previous = simplified.at(-1);
    if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) >= minimumDistance) {
      simplified.push(point);
    }
  }
  if (simplified.length > 2) {
    const first = simplified[0];
    const last = simplified.at(-1);
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < minimumDistance) simplified.pop();
  }
  return simplified;
}

async function buildCandidates(crop) {
  const { data, info } = await sharp(imagePath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const maskOverlay = Buffer.alloc(crop.width * crop.height * 4, 0);
  const palettePixels = [
    [14, 165, 233],
    [34, 197, 94],
    [249, 115, 22],
    [124, 58, 237],
    [239, 68, 68],
    [20, 184, 166],
    [168, 85, 247],
  ];
  const candidates = [];
  for (const [candidateIndex, candidate] of CANDIDATE_BLOCKS.entries()) {
    const points = [];
    const pixelColor = palettePixels[candidateIndex % palettePixels.length];
    const minX = Math.max(0, candidate.rough.minX);
    const maxX = Math.min(info.width - 1, candidate.rough.maxX);
    const minY = Math.max(0, candidate.rough.minY);
    const maxY = Math.min(info.height - 1, candidate.rough.maxY);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const offset = (y * info.width + x) * info.channels;
        const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
        if (isCandidatePixel(pixel, candidate.color)) {
          points.push([x, y]);
          if (x >= crop.left && x < crop.left + crop.width && y >= crop.top && y < crop.top + crop.height) {
            const maskOffset = ((y - crop.top) * crop.width + (x - crop.left)) * 4;
            maskOverlay[maskOffset] = pixelColor[0];
            maskOverlay[maskOffset + 1] = pixelColor[1];
            maskOverlay[maskOffset + 2] = pixelColor[2];
            maskOverlay[maskOffset + 3] = 150;
          }
        }
      }
    }
    const hull = simplifyHull(convexHull(points));
    candidates.push({
      ...candidate,
      points: hull,
      sampleCount: points.length,
      bounds: hull.length
        ? {
          minX: Math.min(...hull.map(([x]) => x)),
          minY: Math.min(...hull.map(([, y]) => y)),
          maxX: Math.max(...hull.map(([x]) => x)),
          maxY: Math.max(...hull.map(([, y]) => y)),
        }
        : null,
    });
  }

  const palette = ['#0ea5e9', '#22c55e', '#f97316', '#7c3aed', '#ef4444', '#14b8a6', '#a855f7'];
  const paths = candidates.map((candidate, index) => {
    const shifted = candidate.points.map(([x, y]) => [x - crop.left, y - crop.top]);
    const pathData = shifted.length
      ? `M ${shifted.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`
      : '';
    const [labelX, labelY] = candidate.label;
    const color = palette[index % palette.length];
    return [
      `<path d="${pathData}" fill="${color}33" stroke="${color}" stroke-width="2.5"/>`,
      `<circle cx="${labelX - crop.left}" cy="${labelY - crop.top}" r="4" fill="${color}"/>`,
      `<text x="${labelX - crop.left + 6}" y="${labelY - crop.top - 6}" font-size="13" fill="${color}" stroke="white" stroke-width="3" paint-order="stroke">${candidate.id}</text>`,
    ].join('');
  });

  const roughRects = CANDIDATE_BLOCKS.map((candidate) => (
    `<rect x="${candidate.rough.minX - crop.left}" y="${candidate.rough.minY - crop.top}" width="${candidate.rough.maxX - candidate.rough.minX}" height="${candidate.rough.maxY - candidate.rough.minY}" fill="none" stroke="#111827" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>`
  ));

  const svg = [
    `<svg width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}" xmlns="http://www.w3.org/2000/svg">`,
    gridSvg(crop),
    roughRects.join(''),
    paths.join(''),
    '</svg>',
  ].join('');

  await sharp(imagePath)
    .extract(crop)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .resize({ width: crop.width * 2, height: crop.height * 2, kernel: 'nearest' })
    .toFile(path.join(outDir, 'candidate-color-hull-overlay.png'));
  const maskPng = await sharp(maskOverlay, {
    raw: {
      width: crop.width,
      height: crop.height,
      channels: 4,
    },
  }).png().toBuffer();
  await sharp(imagePath)
    .extract(crop)
    .composite([{ input: maskPng, left: 0, top: 0 }])
    .resize({ width: crop.width * 2, height: crop.height * 2, kernel: 'nearest' })
    .toFile(path.join(outDir, 'candidate-color-mask-overlay.png'));
  await fs.writeFile(path.join(outDir, 'candidate-color-hulls.json'), `${JSON.stringify(candidates, null, 2)}\n`, 'utf8');
}

await fs.mkdir(outDir, { recursive: true });

await sharp(imagePath)
  .extract(THIRD_BASE_CROP)
  .composite([{ input: Buffer.from(`<svg width="${THIRD_BASE_CROP.width}" height="${THIRD_BASE_CROP.height}" viewBox="0 0 ${THIRD_BASE_CROP.width} ${THIRD_BASE_CROP.height}" xmlns="http://www.w3.org/2000/svg">${gridSvg(THIRD_BASE_CROP)}</svg>`), left: 0, top: 0 }])
  .resize({ width: THIRD_BASE_CROP.width * 2, height: THIRD_BASE_CROP.height * 2, kernel: 'nearest' })
  .toFile(path.join(outDir, 'official-121-127-grid.png'));

await sharp(imagePath)
  .extract(THIRD_BASE_CROP)
  .composite([{ input: Buffer.from(currentOverlaySvg(THIRD_BASE_CROP, THIRD_BASE_IDS)), left: 0, top: 0 }])
  .resize({ width: THIRD_BASE_CROP.width * 2, height: THIRD_BASE_CROP.height * 2, kernel: 'nearest' })
  .toFile(path.join(outDir, 'current-hit-blue-visual-red-overlay.png'));

await fs.writeFile(
  path.join(outDir, 'crop.json'),
  `${JSON.stringify({ crop: THIRD_BASE_CROP, ids: THIRD_BASE_IDS }, null, 2)}\n`,
  'utf8',
);

await buildCandidates(THIRD_BASE_CROP);

console.log(`official_grid:${path.join(outDir, 'official-121-127-grid.png')}`);
console.log(`current_overlay:${path.join(outDir, 'current-hit-blue-visual-red-overlay.png')}`);
console.log(`candidate_overlay:${path.join(outDir, 'candidate-color-hull-overlay.png')}`);
console.log(`candidate_mask:${path.join(outDir, 'candidate-color-mask-overlay.png')}`);
console.log(`candidate_json:${path.join(outDir, 'candidate-color-hulls.json')}`);
