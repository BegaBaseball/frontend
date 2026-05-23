import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  GWANGJU_BLOCKS,
  GWANGJU_FULL_RETRACE_VERSION,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const imagePath = path.resolve(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath);

const cropBounds = { left: 380, top: 220, width: 380, height: 300 };
const targetBlockIds = [
  'sky-picnic-s-335',
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
const colorsByBlockId = {
  'sky-picnic-s-335': '#db2777',
  'k8-123': '#d97706',
  'k5-124': '#dc2626',
  'k5-125': '#dc2626',
  'k5-126': '#dc2626',
  'k5-127': '#dc2626',
  'third-family-seats': '#7c3aed',
  'third-wheelchair-seats': '#0891b2',
  'party-seats-third': '#111827',
  'third-surprise-seats': '#f97316',
};

const outputPaths = {
  json: path.join(reportDir, 'gwangju-seatmap-third-base-boundary-overlay.json'),
  markdown: path.join(reportDir, 'gwangju-seatmap-third-base-boundary-overlay.md'),
  png: path.join(reportDir, 'gwangju-seatmap-third-base-boundary-overlay.png'),
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

const blockById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));

const shiftPath = (pathD) => String(pathD ?? '')
  .replace(/([ML])\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)/g, (_, command, x, y) => (
    `${command} ${Number(x) - cropBounds.left} ${Number(y) - cropBounds.top}`
  ));

const pathBounds = (pathD) => {
  const matches = [...String(pathD ?? '').matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)/g)];
  const points = matches.map((match) => [Number(match[1]), Number(match[2])]);

  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
};

const blockRows = targetBlockIds.map((id) => {
  const block = blockById.get(id);
  if (!block) {
    throw new Error(`Missing Gwangju block for third-base overlay: ${id}`);
  }

  return {
    id,
    block: block.block,
    shortLabel: block.imageGeometry.shortLabel,
    label: { x: block.imageGeometry.labelX, y: block.imageGeometry.labelY },
    bounds: pathBounds(block.imageGeometry.d),
    hasSeparateVisualPath: Boolean(block.imageGeometry.visualD),
  };
});

const gridLines = [];
for (let x = 0; x <= cropBounds.width; x += 20) {
  gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${cropBounds.height}" stroke="rgba(15,23,42,0.18)" stroke-width="0.5"/>`);
  gridLines.push(`<text x="${x + 2}" y="11" font-size="8" fill="rgba(15,23,42,0.55)">${cropBounds.left + x}</text>`);
}
for (let y = 0; y <= cropBounds.height; y += 20) {
  gridLines.push(`<line x1="0" y1="${y}" x2="${cropBounds.width}" y2="${y}" stroke="rgba(15,23,42,0.18)" stroke-width="0.5"/>`);
  gridLines.push(`<text x="2" y="${y + 9}" font-size="8" fill="rgba(15,23,42,0.55)">${cropBounds.top + y}</text>`);
}

const blockOverlays = targetBlockIds.map((id) => {
  const block = blockById.get(id);
  const color = colorsByBlockId[id] ?? '#2563eb';
  const labelX = block.imageGeometry.labelX - cropBounds.left;
  const labelY = block.imageGeometry.labelY - cropBounds.top;

  return [
    `<path d="${xmlEscape(shiftPath(block.imageGeometry.d))}" fill="${color}33" stroke="${color}" stroke-width="2"/>`,
    `<circle cx="${labelX}" cy="${labelY}" r="3" fill="${color}"/>`,
    `<text x="${labelX + 5}" y="${labelY - 5}" font-size="10" fill="${color}">${xmlEscape(`${block.imageGeometry.shortLabel} ${id}`)}</text>`,
  ].join('');
});

const svg = [
  `<svg width="${cropBounds.width}" height="${cropBounds.height}" viewBox="0 0 ${cropBounds.width} ${cropBounds.height}" xmlns="http://www.w3.org/2000/svg">`,
  ...gridLines,
  ...blockOverlays,
  '</svg>',
].join('');

await fs.mkdir(reportDir, { recursive: true });
const croppedOverlay = await sharp(imagePath)
  .extract(cropBounds)
  .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
  .png()
  .toBuffer();

await sharp(croppedOverlay)
  .resize({ width: cropBounds.width * 3, height: cropBounds.height * 3, kernel: 'nearest' })
  .toFile(outputPaths.png);

const report = {
  generatedAt: new Date().toISOString(),
  traceVersion: GWANGJU_FULL_RETRACE_VERSION,
  image: {
    path: GWANGJU_SEATMAP_IMAGE.imagePath,
    width: GWANGJU_SEATMAP_IMAGE.imageWidth,
    height: GWANGJU_SEATMAP_IMAGE.imageHeight,
  },
  cropBounds,
  targetBlockIds,
  blocks: blockRows,
  artifacts: {
    overlay: path.relative(frontendRoot, outputPaths.png),
  },
  sourcePolicy: {
    coordinateSource: 'official PNG 2200x1159 only',
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  },
};

await fs.writeFile(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(outputPaths.markdown, [
  '# Gwangju Third-Base Boundary Overlay',
  '',
  `- generatedAt: \`${report.generatedAt}\``,
  `- traceVersion: \`${report.traceVersion}\``,
  `- official PNG: \`${report.image.path}\``,
  `- crop: \`${cropBounds.left},${cropBounds.top},${cropBounds.width},${cropBounds.height}\``,
  `- overlay: \`${report.artifacts.overlay}\``,
  '',
  markdownTable(
    ['id', 'label', 'bounds', 'label point', 'separate visual path'],
    blockRows.map((row) => [
      row.id,
      row.shortLabel,
      `${row.bounds.minX},${row.bounds.minY},${row.bounds.maxX},${row.bounds.maxY}`,
      `${row.label.x},${row.label.y}`,
      row.hasSeparateVisualPath ? 'yes' : 'no',
    ]),
  ),
  '',
  'Coordinates are official PNG `2200x1159` coordinates only. CSS pixels, resized screenshots, external crawling, web-search-based baseball data, and third-party copied seatmap images are not coordinate sources.',
].join('\n'), 'utf8');

console.log(`third_base_boundary_overlay_json:${outputPaths.json}`);
console.log(`third_base_boundary_overlay_markdown:${outputPaths.markdown}`);
console.log(`third_base_boundary_overlay_png:${outputPaths.png}`);
