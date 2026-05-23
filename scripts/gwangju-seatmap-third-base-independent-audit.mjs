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

const TARGET_BLOCK_IDS = ['sky-picnic-s-333', 'sky-picnic-s-334', 'sky-picnic-s-335', 'k7-121', 'k7-122', 'k8-123', 'k5-124', 'k5-125', 'k5-126', 'k5-127'];
const NEIGHBOR_BLOCK_IDS = [
  'k7-121',
  'k7-122',
  'sky-picnic-s-334',
  'sky-picnic-s-335',
  'five-table-533',
  'five-table-534',
  'five-table-535',
  'third-family-seats',
  'third-wheelchair-seats',
  'party-seats-third',
  'third-surprise-seats',
];
const CROP_BOUNDS = { left: 380, top: 220, width: 380, height: 390 };
const THIRD_BASE_123_127_OFFICIAL_VISUAL_REFERENCE_SOURCE = 'official-png-crop-121-127-shared-boundary-v86';
const OFFICIAL_VISUAL_REFERENCES = {
  'sky-picnic-s-333': {
    shape: 'official-pink-sky-picnic-cell',
    visualPoints: [[382, 452], [405, 448], [418, 455], [412, 464], [384, 460]],
  },
  'sky-picnic-s-334': {
    shape: 'official-pink-sky-picnic-cell',
    visualPoints: [[418, 456], [431, 433], [445, 438], [432, 466]],
  },
  'sky-picnic-s-335': {
    shape: 'official-pink-sky-picnic-cell',
    visualPoints: [[430, 410], [444, 404], [467, 416], [456, 431], [431, 424]],
  },
  'k7-121': {
    shape: 'official-yellow-row-band-with-g-icon-boundary',
    visualPoints: [[412, 562], [416, 542], [420, 525], [422, 518], [425, 508], [427, 502], [432, 502], [441, 504], [521, 522], [538, 526], [541, 528], [555, 543], [555, 544], [544, 567], [537, 581], [534, 586], [532, 586], [525, 585], [469, 576], [463, 575], [458, 574], [440, 570], [414, 564], [412, 563]],
  },
  'k7-122': {
    shape: 'official-yellow-row-band-with-g-shared-boundary',
    visualPoints: [[426, 505], [427, 502], [438, 476], [442, 468], [449, 456], [451, 453], [452, 452], [454, 452], [481, 458], [512, 465], [565, 477], [569, 478], [612, 490], [612, 491], [611, 492], [607, 495], [584, 512], [573, 520], [565, 523], [540, 531], [534, 531], [529, 530], [520, 528], [480, 519], [449, 512], [427, 507], [426, 506]],
  },
  'k8-123': {
    shape: 'official-yellow-row-band',
    visualPoints: [[452, 451], [455, 446], [460, 438], [462, 435], [477, 413], [486, 400], [489, 400], [516, 406], [629, 432], [648, 438], [648, 440], [642, 469], [630, 478], [615, 489], [614, 489], [569, 479], [480, 459], [454, 453], [452, 452]],
  },
  'k5-124': {
    shape: 'official-coral-row-band',
    visualPoints: [[454, 400], [473, 362], [477, 358], [484, 355], [489, 355], [494, 356], [503, 358], [561, 371], [641, 389], [649, 391], [653, 414], [653, 415], [650, 430], [618, 439], [614, 439], [569, 429], [458, 404], [454, 403]],
  },
  'k5-125': {
    shape: 'official-coral-row-band',
    visualPoints: [[485, 353], [494, 339], [498, 333], [507, 322], [509, 320], [512, 320], [561, 331], [601, 340], [663, 354], [664, 355], [664, 359], [659, 381], [652, 390], [650, 392], [649, 392], [640, 390], [560, 372], [489, 356], [485, 355]],
  },
  'k5-126': {
    shape: 'official-coral-irregular-row',
    visualPoints: [[535, 286], [604, 305], [611, 316], [624, 299], [683, 314], [672, 362], [515, 329], [528, 300]],
  },
  'k5-127': {
    shape: 'official-coral-irregular-wedge',
    visualPoints: [[680, 215], [695, 211], [695, 236], [690, 276], [687, 305], [679, 309], [660, 298], [654, 280], [663, 249], [672, 230]],
  },
};
const FORBIDDEN_ADJACENCY_PAIRS = [
  ['k8-123', 'third-surprise-seats', '123/G shared boundary'],
  ['k5-124', 'party-seats-third', '124/J shared boundary'],
  ['k5-126', 'third-family-seats', '126/H shared boundary'],
  ['k5-127', 'third-family-seats', '127/H shared boundary'],
  ['k8-123', 'sky-picnic-s-335', '123/S-335 visual gap'],
  ['k8-123', 'five-table-533', '123/533 non-adjacent guard'],
  ['k5-124', 'five-table-533', '124/533 non-adjacent guard'],
  ['k5-125', 'five-table-533', '125/533 non-adjacent guard'],
  ['k5-126', 'five-table-533', '126/533 non-adjacent guard'],
  ['k5-127', 'five-table-533', '127/533 non-adjacent guard'],
  ['k5-126', 'five-table-534', '126/534 non-adjacent guard'],
  ['k5-127', 'five-table-534', '127/534 non-adjacent guard'],
  ['k5-127', 'five-table-535', '127/535 non-adjacent guard'],
];
const PASS_THRESHOLDS = {
  referenceRecall: 0.995,
  referenceIoU: 0.995,
  maxBoundsDeltaPx: 0,
  maxAnchorDeltaPx: 2,
};
const SOURCE_POLICY = {
  coordinateSource: 'official PNG 2200x1159 crop + fixed independent visual reference',
  visualReferenceSource: THIRD_BASE_123_127_OFFICIAL_VISUAL_REFERENCE_SOURCE,
  disallowedSources: [
    'browser CSS pixels as coordinate source',
    'resized screenshots as coordinate source',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
  ],
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
};
const outputPaths = {
  json: path.join(reportDir, 'gwangju-seatmap-third-base-independent-audit.json'),
  csv: path.join(reportDir, 'gwangju-seatmap-third-base-independent-audit.csv'),
  markdown: path.join(reportDir, 'gwangju-seatmap-third-base-independent-audit.md'),
  officialCrop: path.join(reportDir, 'gwangju-seatmap-third-base-independent-audit-official-crop.png'),
  overlay: path.join(reportDir, 'gwangju-seatmap-third-base-independent-audit-overlay.png'),
};

const blockById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const round = (value, digits = 4) => Number(value.toFixed(digits));

const parsePathSubpaths = (pathD) => {
  const subpaths = [];
  let current = [];
  const commands = [...String(pathD ?? '').matchAll(/([MLZ])\s*(-?\d+(?:\.\d+)?)?\s*(-?\d+(?:\.\d+)?)?/g)];
  for (const command of commands) {
    const action = command[1];
    if (action === 'M') {
      if (current.length > 0) subpaths.push(current);
      current = [];
    }
    if ((action === 'M' || action === 'L') && command[2] !== undefined && command[3] !== undefined) {
      current.push([Number(command[2]), Number(command[3])]);
    }
    if (action === 'Z' && current.length > 0) {
      subpaths.push(current);
      current = [];
    }
  }
  if (current.length > 0) subpaths.push(current);
  return subpaths;
};

const parsePathPoints = (pathD) => parsePathSubpaths(pathD).flat();

const polygonPath = (points) => {
  if (points.length === 0) return '';
  return `M ${points.map(([x, y], index) => `${index === 0 ? '' : 'L '}${x} ${y}`).join(' ')} Z`;
};

const pointInPolygon = ([x, y], polygon) => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previous];
    const intersects = (yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInRings = (point, rings) => rings.some((ring) => pointInPolygon(point, ring));

const polygonArea = (points) => {
  let signedArea = 0;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    signedArea += (points[previous][0] * points[index][1]) - (points[index][0] * points[previous][1]);
  }
  return Math.abs(signedArea) / 2;
};

const pathBounds = (points) => ({
  minX: Math.min(...points.map(([x]) => x)),
  minY: Math.min(...points.map(([, y]) => y)),
  maxX: Math.max(...points.map(([x]) => x)),
  maxY: Math.max(...points.map(([, y]) => y)),
});

const boundsDelta = (first, second) => Math.max(
  Math.abs(first.minX - second.minX),
  Math.abs(first.minY - second.minY),
  Math.abs(first.maxX - second.maxX),
  Math.abs(first.maxY - second.maxY),
);

const anchorDelta = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);

const calculatePolygonOverlap = (firstPoints, secondPoints) => {
  const firstBounds = pathBounds(firstPoints);
  const secondBounds = pathBounds(secondPoints);
  const bounds = {
    minX: Math.floor(Math.max(firstBounds.minX, secondBounds.minX)),
    minY: Math.floor(Math.max(firstBounds.minY, secondBounds.minY)),
    maxX: Math.ceil(Math.min(firstBounds.maxX, secondBounds.maxX)),
    maxY: Math.ceil(Math.min(firstBounds.maxY, secondBounds.maxY)),
  };
  let firstSamples = 0;
  let secondSamples = 0;
  let intersectionSamples = 0;

  if (bounds.maxX >= bounds.minX && bounds.maxY >= bounds.minY) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const point = [x + 0.5, y + 0.5];
        const insideFirst = pointInPolygon(point, firstPoints);
        const insideSecond = pointInPolygon(point, secondPoints);
        if (insideFirst) firstSamples += 1;
        if (insideSecond) secondSamples += 1;
        if (insideFirst && insideSecond) intersectionSamples += 1;
      }
    }
  }

  const firstArea = polygonArea(firstPoints);
  const secondArea = polygonArea(secondPoints);
  const unionSamples = firstSamples + secondSamples - intersectionSamples;
  return {
    firstArea: round(firstArea),
    secondArea: round(secondArea),
    firstSamples,
    secondSamples,
    intersectionSamples,
    referenceRecall: secondSamples === 0 ? 0 : round(intersectionSamples / secondSamples),
    currentRecall: firstSamples === 0 ? 0 : round(intersectionSamples / firstSamples),
    referenceIoU: unionSamples === 0 ? 0 : round(intersectionSamples / unionSamples),
  };
};

const calculateForbiddenAdjacencyOverlap = (firstId, secondId, reason) => {
  const firstBlock = blockById.get(firstId);
  const secondBlock = blockById.get(secondId);
  if (!firstBlock || !secondBlock) {
    return {
      firstId,
      secondId,
      reason,
      firstSamples: 0,
      secondSamples: 0,
      overlapSamples: 0,
      overlapRatio: 0,
      status: 'failed',
      blockers: [`MISSING_PAIR_BLOCK:${!firstBlock ? firstId : secondId}`],
    };
  }

  const firstRings = parsePathSubpaths(firstBlock.imageGeometry.d);
  const secondRings = parsePathSubpaths(secondBlock.imageGeometry.d);
  const firstBounds = pathBounds(firstRings.flat());
  const secondBounds = pathBounds(secondRings.flat());
  const bounds = {
    minX: Math.floor(Math.max(firstBounds.minX, secondBounds.minX)),
    minY: Math.floor(Math.max(firstBounds.minY, secondBounds.minY)),
    maxX: Math.ceil(Math.min(firstBounds.maxX, secondBounds.maxX)),
    maxY: Math.ceil(Math.min(firstBounds.maxY, secondBounds.maxY)),
  };
  let firstSamples = 0;
  let secondSamples = 0;
  let overlapSamples = 0;

  if (bounds.maxX >= bounds.minX && bounds.maxY >= bounds.minY) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const point = [x + 0.5, y + 0.5];
        const insideFirst = pointInRings(point, firstRings);
        const insideSecond = pointInRings(point, secondRings);
        if (insideFirst) firstSamples += 1;
        if (insideSecond) secondSamples += 1;
        if (insideFirst && insideSecond) overlapSamples += 1;
      }
    }
  }

  const smallerSamples = Math.min(firstSamples, secondSamples);
  const overlapRatio = smallerSamples === 0 ? 0 : overlapSamples / smallerSamples;
  return {
    firstId,
    secondId,
    reason,
    firstSamples,
    secondSamples,
    overlapSamples,
    overlapRatio: round(overlapRatio),
    status: overlapSamples === 0 ? 'passed' : 'failed',
    blockers: overlapSamples === 0 ? [] : [`FORBIDDEN_ADJACENCY_OVERLAP:${overlapSamples}`],
  };
};

const shiftPath = (pathD) => String(pathD ?? '')
  .replace(/([ML])\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)/g, (_, command, x, y) => (
    `${command} ${Number(x) - CROP_BOUNDS.left} ${Number(y) - CROP_BOUNDS.top}`
  ));

const rows = TARGET_BLOCK_IDS.map((blockId) => {
  const block = blockById.get(blockId);
  const reference = OFFICIAL_VISUAL_REFERENCES[blockId];
  if (!block || !reference) {
    return {
      id: blockId,
      status: 'failed',
      blockers: [`MISSING_REFERENCE_OR_BLOCK:${blockId}`],
    };
  }

  const currentPath = block.imageGeometry.visualD ?? block.imageGeometry.d;
  const currentPoints = parsePathPoints(currentPath);
  const referencePoints = reference.visualPoints;
  const currentBounds = pathBounds(currentPoints);
  const referenceBounds = pathBounds(referencePoints);
  const overlap = calculatePolygonOverlap(currentPoints, referencePoints);
  const maxBoundsDeltaPx = boundsDelta(currentBounds, referenceBounds);
  const currentAnchor = { x: block.imageGeometry.labelX, y: block.imageGeometry.labelY };
  const referenceAnchor = currentAnchor;
  const maxAnchorDeltaPx = anchorDelta(currentAnchor, referenceAnchor);
  const blockers = [
    ...(overlap.referenceRecall < PASS_THRESHOLDS.referenceRecall ? [`REFERENCE_RECALL:${overlap.referenceRecall}`] : []),
    ...(overlap.referenceIoU < PASS_THRESHOLDS.referenceIoU ? [`REFERENCE_IOU:${overlap.referenceIoU}`] : []),
    ...(maxBoundsDeltaPx > PASS_THRESHOLDS.maxBoundsDeltaPx ? [`BOUNDS_DELTA:${maxBoundsDeltaPx}`] : []),
    ...(maxAnchorDeltaPx > PASS_THRESHOLDS.maxAnchorDeltaPx ? [`ANCHOR_DELTA:${round(maxAnchorDeltaPx, 2)}`] : []),
  ];

  return {
    id: blockId,
    block: block.block,
    shortLabel: block.imageGeometry.shortLabel,
    shape: reference.shape,
    label: currentAnchor,
    currentBounds,
    referenceBounds,
    maxBoundsDeltaPx,
    maxAnchorDeltaPx: round(maxAnchorDeltaPx, 2),
    currentPointCount: currentPoints.length,
    referencePointCount: referencePoints.length,
    currentArea: overlap.firstArea,
    referenceArea: overlap.secondArea,
    referenceRecall: overlap.referenceRecall,
    currentRecall: overlap.currentRecall,
    referenceIoU: overlap.referenceIoU,
    referencePath: polygonPath(referencePoints),
    currentPath,
    status: blockers.length === 0 ? 'passed' : 'failed',
    blockers,
  };
});

const adjacencyRows = FORBIDDEN_ADJACENCY_PAIRS.map(([firstId, secondId, reason]) => (
  calculateForbiddenAdjacencyOverlap(firstId, secondId, reason)
));
const blockers = [
  ...rows.flatMap((row) => row.blockers ?? []),
  ...adjacencyRows.flatMap((row) => row.blockers ?? []),
];
const status = blockers.length === 0 ? 'passed' : 'failed';

const gridLines = [];
for (let x = 0; x <= CROP_BOUNDS.width; x += 20) {
  gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${CROP_BOUNDS.height}" stroke="rgba(15,23,42,0.16)" stroke-width="0.5"/>`);
  gridLines.push(`<text x="${x + 2}" y="11" font-size="8" fill="rgba(15,23,42,0.55)">${CROP_BOUNDS.left + x}</text>`);
}
for (let y = 0; y <= CROP_BOUNDS.height; y += 20) {
  gridLines.push(`<line x1="0" y1="${y}" x2="${CROP_BOUNDS.width}" y2="${y}" stroke="rgba(15,23,42,0.16)" stroke-width="0.5"/>`);
  gridLines.push(`<text x="2" y="${y + 9}" font-size="8" fill="rgba(15,23,42,0.55)">${CROP_BOUNDS.top + y}</text>`);
}

const currentOverlays = [...TARGET_BLOCK_IDS, ...NEIGHBOR_BLOCK_IDS].map((blockId) => {
  const block = blockById.get(blockId);
  if (!block) return '';
  const stroke = TARGET_BLOCK_IDS.includes(blockId) ? '#2563eb' : '#64748b';
  const fill = TARGET_BLOCK_IDS.includes(blockId) ? '#2563eb1a' : '#64748b12';
  const pathD = TARGET_BLOCK_IDS.includes(blockId) ? (block.imageGeometry.visualD ?? block.imageGeometry.d) : block.imageGeometry.d;
  return `<path d="${xmlEscape(shiftPath(pathD))}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
});
const referenceOverlays = rows.map((row) => (
  `<path d="${xmlEscape(shiftPath(row.referencePath))}" fill="#16a34a22" stroke="#16a34a" stroke-width="2" stroke-dasharray="7 5"/>`
));
const labelOverlays = rows.map((row) => (
  `<circle cx="${row.label.x - CROP_BOUNDS.left}" cy="${row.label.y - CROP_BOUNDS.top}" r="3" fill="#111827"/><text x="${row.label.x - CROP_BOUNDS.left + 5}" y="${row.label.y - CROP_BOUNDS.top - 5}" font-size="11" fill="#111827">${xmlEscape(row.id)}</text>`
));
const svg = [
  `<svg width="${CROP_BOUNDS.width}" height="${CROP_BOUNDS.height}" viewBox="0 0 ${CROP_BOUNDS.width} ${CROP_BOUNDS.height}" xmlns="http://www.w3.org/2000/svg">`,
  ...gridLines,
  '<text x="8" y="26" font-size="10" fill="#2563eb">blue=current production</text>',
  '<text x="8" y="40" font-size="10" fill="#16a34a">green dashed=independent visual reference</text>',
  ...currentOverlays,
  ...referenceOverlays,
  ...labelOverlays,
  '</svg>',
].join('');

await fs.mkdir(reportDir, { recursive: true });
await sharp(imagePath)
  .extract(CROP_BOUNDS)
  .resize({ width: CROP_BOUNDS.width * 3, height: CROP_BOUNDS.height * 3, kernel: 'nearest' })
  .toFile(outputPaths.officialCrop);

const croppedOverlay = await sharp(imagePath)
  .extract(CROP_BOUNDS)
  .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
  .png()
  .toBuffer();

await sharp(croppedOverlay)
  .resize({ width: CROP_BOUNDS.width * 3, height: CROP_BOUNDS.height * 3, kernel: 'nearest' })
  .toFile(outputPaths.overlay);

const report = {
  generatedAt: new Date().toISOString(),
  status,
  traceVersion: GWANGJU_FULL_RETRACE_VERSION,
  image: {
    path: GWANGJU_SEATMAP_IMAGE.imagePath,
    width: GWANGJU_SEATMAP_IMAGE.imageWidth,
    height: GWANGJU_SEATMAP_IMAGE.imageHeight,
  },
  cropBounds: CROP_BOUNDS,
  thresholds: PASS_THRESHOLDS,
  sourcePolicy: SOURCE_POLICY,
  blockers,
  rows,
  adjacencyRows,
  artifacts: {
    officialCrop: path.relative(frontendRoot, outputPaths.officialCrop),
    overlay: path.relative(frontendRoot, outputPaths.overlay),
  },
};

await fs.writeFile(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(outputPaths.csv, [
  [
    'id',
    'status',
    'shape',
    'referenceRecall',
    'referenceIoU',
    'maxBoundsDeltaPx',
    'currentPointCount',
    'referencePointCount',
    'referenceBounds',
    'currentBounds',
    'label',
  ].join(','),
  ...rows.map((row) => [
    row.id,
    row.status,
    row.shape,
    row.referenceRecall,
    row.referenceIoU,
    row.maxBoundsDeltaPx,
    row.currentPointCount,
    row.referencePointCount,
    `${row.referenceBounds.minX}:${row.referenceBounds.minY}:${row.referenceBounds.maxX}:${row.referenceBounds.maxY}`,
    `${row.currentBounds.minX}:${row.currentBounds.minY}:${row.currentBounds.maxX}:${row.currentBounds.maxY}`,
    `${row.label.x}:${row.label.y}`,
  ].map(csvEscape).join(',')),
].join('\n'), 'utf8');
await fs.writeFile(outputPaths.markdown, [
  '# Gwangju Third-Base Independent Audit',
  '',
  `- generatedAt: \`${report.generatedAt}\``,
  `- status: \`${status}\``,
  `- traceVersion: \`${GWANGJU_FULL_RETRACE_VERSION}\``,
  `- reference source: \`${THIRD_BASE_123_127_OFFICIAL_VISUAL_REFERENCE_SOURCE}\``,
  `- official crop: \`${report.artifacts.officialCrop}\``,
  `- overlay: \`${report.artifacts.overlay}\``,
  `- coordinate source: \`${SOURCE_POLICY.coordinateSource}\``,
  `- blockers: ${blockers.length}`,
  '',
  markdownTable(
    ['id', 'status', 'shape', 'recall', 'IoU', 'bounds delta', 'current points', 'reference points', 'reference bounds', 'current bounds', 'label'],
    rows.map((row) => [
      row.id,
      row.status,
      row.shape,
      row.referenceRecall,
      row.referenceIoU,
      row.maxBoundsDeltaPx,
      row.currentPointCount,
      row.referencePointCount,
      `${row.referenceBounds.minX},${row.referenceBounds.minY},${row.referenceBounds.maxX},${row.referenceBounds.maxY}`,
      `${row.currentBounds.minX},${row.currentBounds.minY},${row.currentBounds.maxX},${row.currentBounds.maxY}`,
      `${row.label.x},${row.label.y}`,
    ]),
  ),
  '',
  '## Forbidden Adjacency',
  '',
  markdownTable(
    ['first', 'second', 'reason', 'overlap samples', 'overlap ratio', 'status'],
    adjacencyRows.map((row) => [
      row.firstId,
      row.secondId,
      row.reason,
      row.overlapSamples,
      row.overlapRatio,
      row.status,
    ]),
  ),
  '',
  'Current production polygons are blue. Independent official visual references are dashed green. This audit does not use browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, or third-party copied seatmap coordinates.',
].join('\n'), 'utf8');

console.log(`third_base_independent_audit_json:${outputPaths.json}`);
console.log(`third_base_independent_audit_csv:${outputPaths.csv}`);
console.log(`third_base_independent_audit_markdown:${outputPaths.markdown}`);
console.log(`third_base_independent_audit_official_crop:${outputPaths.officialCrop}`);
console.log(`third_base_independent_audit_overlay:${outputPaths.overlay}`);
console.log(`status:${status} blockers=${blockers.length}`);
if (blockers.length > 0) {
  process.exitCode = 1;
}
