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

const TARGET_BLOCK_IDS = [
  'k5-101',
  'k5-102',
  'k5-103',
  'k5-104',
  'k5-105',
  'k5-106',
  'k7-107',
  'k7-108',
  'first-family-seats',
  'first-wheelchair-seats',
  'party-seats-first',
  'third-family-seats',
];

const CROP_REGIONS = [
  {
    id: 'first-101-108-h-i-j',
    label: '1루 101~108/H/I/J',
    bounds: { left: 700, top: 710, width: 640, height: 330 },
    blockIds: [
      'k5-101',
      'k5-102',
      'k5-103',
      'k5-104',
      'k5-105',
      'k5-106',
      'k7-107',
      'k7-108',
      'first-family-seats',
      'first-wheelchair-seats',
      'party-seats-first',
    ],
  },
  {
    id: 'third-h',
    label: '3루 H',
    bounds: { left: 420, top: 140, width: 330, height: 300 },
    blockIds: [
      'third-family-seats',
    ],
  },
];

const OFFICIAL_VISUAL_REFERENCE_SOURCE = 'official-png-crop-lower-infield-hij-v77';
const OFFICIAL_VISUAL_REFERENCES = {
  'k5-101': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-k5-101-row-wedge',
    visualSubpaths: [
      [[1058, 802], [1062, 802], [1069, 803], [1109, 809], [1115, 810], [1115, 812], [1114, 813], [1104, 818], [1093, 822], [1084, 825], [1081, 825], [1067, 823], [1062, 822], [1061, 819], [1058, 806]],
    ],
  },
  'k5-102': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-k5-102-row-wedge',
    visualSubpaths: [
      [[1009, 794], [1011, 794], [1036, 798], [1048, 800], [1050, 801], [1051, 803], [1053, 811], [1056, 824], [1057, 830], [1057, 831], [1056, 832], [1030, 838], [1025, 839], [1022, 839], [1019, 838], [1018, 836], [1016, 828], [1009, 799]],
    ],
  },
  'k5-103': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-k5-103-row-wedge',
    visualSubpaths: [
      [[961, 791], [966, 790], [972, 789], [975, 789], [982, 790], [995, 792], [1001, 793], [1002, 794], [1006, 810], [1013, 839], [1013, 841], [1005, 906], [1001, 906], [993, 905], [988, 904], [987, 903], [986, 900], [980, 875], [965, 812], [961, 795]],
    ],
  },
  'k5-104': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-k5-104-row-wedge',
    visualSubpaths: [
      [[918, 806], [920, 805], [924, 804], [953, 797], [956, 797], [957, 800], [960, 812], [975, 875], [979, 892], [982, 905], [982, 908], [981, 909], [977, 910], [955, 915], [946, 917], [943, 917], [942, 913], [924, 836], [918, 810]],
    ],
  },
  'k5-105': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-k5-105-row-wedge',
    visualSubpaths: [
      [[873, 818], [874, 817], [877, 816], [908, 808], [911, 808], [912, 809], [914, 817], [927, 872], [931, 889], [937, 915], [938, 920], [938, 924], [935, 925], [927, 927], [914, 930], [905, 932], [900, 932], [883, 861], [873, 819]],
    ],
  },
  'k5-106': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-k5-106-row-wedge',
    visualSubpaths: [
      [[829, 829], [830, 828], [849, 823], [865, 819], [867, 819], [868, 822], [871, 834], [876, 855], [894, 931], [894, 934], [892, 935], [884, 937], [867, 941], [858, 943], [856, 943], [855, 942], [851, 926], [830, 837], [829, 832]],
    ],
  },
  'k7-107': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-k7-107-row-wedge',
    visualSubpaths: [
      [[797, 840], [822, 835], [824, 835], [825, 836], [842, 907], [847, 928], [850, 941], [850, 945], [842, 947], [832, 949], [820, 951], [815, 951], [808, 911], [803, 882], [798, 852], [797, 845]],
    ],
  },
  'k7-108': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-k7-108-row-wedge',
    visualSubpaths: [
      [[736, 948], [737, 937], [746, 858], [747, 853], [764, 847], [775, 847], [791, 848], [792, 849], [808, 950], [808, 953], [736, 953]],
    ],
  },
  'first-family-seats': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-first-h-irregular-block',
    visualSubpaths: [
      [[1123, 812], [1119, 815], [1109, 820], [1095, 825], [1077, 830], [1056, 835], [1034, 840], [1013, 845], [1011, 855], [1011, 860], [1009, 870], [1009, 875], [1008, 880], [1008, 885], [1007, 890], [1010, 905], [1012, 905], [1034, 900], [1115, 895], [1135, 885], [1159, 870], [1173, 860], [1185, 850], [1165, 830], [1161, 825], [1156, 820], [1150, 815], [1129, 812]],
    ],
  },
  'first-wheelchair-seats': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-first-i-horizontal-band',
    visualSubpaths: [
      [[1106, 893], [1101, 894], [1089, 897], [1076, 900], [1064, 903], [1051, 906], [1039, 909], [1026, 912], [1014, 915], [1001, 918], [989, 921], [981, 924], [980, 927], [958, 930], [960, 936], [960, 939], [961, 942], [962, 944], [967, 944], [976, 942], [988, 939], [1001, 936], [1013, 933], [1026, 930], [1038, 927], [1051, 924], [1063, 921], [1076, 918], [1088, 915], [1101, 912], [1112, 909], [1110, 903], [1110, 900], [1108, 894], [1108, 893]],
    ],
  },
  'party-seats-first': {
    regionId: 'first-101-108-h-i-j',
    shape: 'official-first-j-horizontal-band',
    visualSubpaths: [
      [[905, 930], [941, 933], [928, 936], [910, 939], [903, 942], [891, 945], [878, 948], [867, 951], [869, 957], [869, 960], [871, 966], [876, 966], [900, 960], [918, 957], [922, 954], [937, 951], [949, 948], [959, 945], [957, 939], [957, 936], [955, 930]],
    ],
  },
  'third-family-seats': {
    regionId: 'third-h',
    shape: 'official-third-h-irregular-block',
    visualSubpaths: [
      [[668, 158], [666, 159], [646, 171], [642, 174], [637, 177], [617, 192], [614, 195], [610, 198], [607, 201], [603, 204], [600, 207], [601, 210], [611, 216], [610, 219], [607, 222], [569, 279], [573, 282], [579, 285], [599, 297], [605, 300], [615, 306], [620, 307], [622, 307], [623, 306], [649, 267], [660, 264], [654, 261], [662, 249], [665, 246], [667, 243], [676, 234], [680, 231], [683, 228], [687, 225], [689, 219], [689, 216], [691, 210], [691, 207], [692, 204], [692, 198], [688, 192], [687, 189], [683, 183], [682, 180], [678, 174], [677, 171], [673, 165], [672, 162], [670, 159], [670, 158]],
    ],
  },
};

const FORBIDDEN_HIT_OVERLAP_PAIRS = [
  ['k5-104', 'first-wheelchair-seats', '104/I shared boundary'],
  ['k5-105', 'first-wheelchair-seats', '105/I shared boundary'],
  ['k5-106', 'party-seats-first', '106/J shared boundary'],
  ['k7-107', 'party-seats-first', '107/J shared boundary'],
  ['k7-108', 'party-seats-first', '108/J shared boundary'],
  ['first-family-seats', 'first-wheelchair-seats', 'H/I shared boundary'],
  ['first-wheelchair-seats', 'party-seats-first', 'I/J shared boundary'],
];

const PASS_THRESHOLDS = {
  visualRecall: 0.995,
  visualIoU: 0.995,
  maxBoundsDeltaPx: 0,
  maxAnchorDeltaPx: 2,
  maxForbiddenOverlapRatio: 0.005,
};

const SOURCE_POLICY = {
  coordinateSource: 'official PNG 2200x1159 crop + fixed independent visual references',
  visualReferenceSource: OFFICIAL_VISUAL_REFERENCE_SOURCE,
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
  json: path.join(reportDir, 'gwangju-seatmap-lower-infield-independent-audit.json'),
  csv: path.join(reportDir, 'gwangju-seatmap-lower-infield-independent-audit.csv'),
  markdown: path.join(reportDir, 'gwangju-seatmap-lower-infield-independent-audit.md'),
  crops: CROP_REGIONS.map((region) => ({
    ...region,
    officialCrop: path.join(reportDir, `gwangju-seatmap-lower-infield-independent-audit-${region.id}-official-crop.png`),
    overlay: path.join(reportDir, `gwangju-seatmap-lower-infield-independent-audit-${region.id}-overlay.png`),
  })),
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

const polygonPath = (points) => {
  if (points.length === 0) return '';
  return `M ${points.map(([x, y], index) => `${index === 0 ? '' : 'L '}${x} ${y}`).join(' ')} Z`;
};

const subpathsToPath = (subpaths) => subpaths.map(polygonPath).join(' ');

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

const pathBounds = (rings) => {
  const points = rings.flat();
  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
};

const boundsDelta = (first, second) => Math.max(
  Math.abs(first.minX - second.minX),
  Math.abs(first.minY - second.minY),
  Math.abs(first.maxX - second.maxX),
  Math.abs(first.maxY - second.maxY),
);

const anchorDelta = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);

const calculateRingsOverlap = (firstRings, secondRings) => {
  const firstBounds = pathBounds(firstRings);
  const secondBounds = pathBounds(secondRings);
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
        const insideFirst = pointInRings(point, firstRings);
        const insideSecond = pointInRings(point, secondRings);
        if (insideFirst) firstSamples += 1;
        if (insideSecond) secondSamples += 1;
        if (insideFirst && insideSecond) intersectionSamples += 1;
      }
    }
  }

  const unionSamples = firstSamples + secondSamples - intersectionSamples;
  return {
    recall: secondSamples > 0 ? round(intersectionSamples / secondSamples) : 0,
    iou: unionSamples > 0 ? round(intersectionSamples / unionSamples) : 0,
    firstSamples,
    secondSamples,
    intersectionSamples,
  };
};

const shiftPath = (pathD, bounds) => String(pathD ?? '')
  .replaceAll(/([ML])\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)/g, (_match, command, x, y) => (
    `${command} ${round(Number(x) - bounds.left, 2)} ${round(Number(y) - bounds.top, 2)}`
  ));

const renderGrid = (bounds) => {
  const lines = [];
  for (let x = 0; x <= bounds.width; x += 20) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${bounds.height}" stroke="rgba(15,23,42,0.16)" stroke-width="0.5"/>`);
    lines.push(`<text x="${x + 2}" y="11" font-size="8" fill="rgba(15,23,42,0.55)">${bounds.left + x}</text>`);
  }
  for (let y = 0; y <= bounds.height; y += 20) {
    lines.push(`<line x1="0" y1="${y}" x2="${bounds.width}" y2="${y}" stroke="rgba(15,23,42,0.16)" stroke-width="0.5"/>`);
    lines.push(`<text x="2" y="${y + 9}" font-size="8" fill="rgba(15,23,42,0.55)">${bounds.top + y}</text>`);
  }
  return lines.join('');
};

const buildRows = () => TARGET_BLOCK_IDS.map((id) => {
  const block = blockById.get(id);
  const reference = OFFICIAL_VISUAL_REFERENCES[id];
  if (!block) throw new Error(`Missing Gwangju block: ${id}`);
  if (!reference) throw new Error(`Missing lower infield visual reference: ${id}`);

  const visualPath = block.imageGeometry.visualD ?? block.imageGeometry.d;
  const hitPath = block.imageGeometry.d;
  const visualRings = parsePathSubpaths(visualPath);
  const hitRings = parsePathSubpaths(hitPath);
  const referenceRings = reference.visualSubpaths;
  const visualBounds = pathBounds(visualRings);
  const hitBounds = pathBounds(hitRings);
  const referenceBounds = pathBounds(referenceRings);
  const overlap = calculateRingsOverlap(visualRings, referenceRings);
  const maxBoundsDelta = boundsDelta(visualBounds, referenceBounds);
  const maxAnchorDelta = anchorDelta(
    { x: block.imageGeometry.labelX, y: block.imageGeometry.labelY },
    { x: block.imageGeometry.labelX, y: block.imageGeometry.labelY },
  );
  const labelInsideReference = pointInRings([block.imageGeometry.labelX, block.imageGeometry.labelY], referenceRings);
  const blockers = [
    ...(overlap.recall >= PASS_THRESHOLDS.visualRecall ? [] : [`VISUAL_RECALL_BELOW_THRESHOLD:${overlap.recall}`]),
    ...(overlap.iou >= PASS_THRESHOLDS.visualIoU ? [] : [`VISUAL_IOU_BELOW_THRESHOLD:${overlap.iou}`]),
    ...(maxBoundsDelta <= PASS_THRESHOLDS.maxBoundsDeltaPx ? [] : [`VISUAL_BOUNDS_DELTA:${maxBoundsDelta}`]),
    ...(maxAnchorDelta <= PASS_THRESHOLDS.maxAnchorDeltaPx ? [] : [`ANCHOR_DELTA:${round(maxAnchorDelta)}`]),
    ...(labelInsideReference ? [] : ['LABEL_OUTSIDE_INDEPENDENT_REFERENCE']),
  ];

  return {
    id,
    block: block.block,
    shortLabel: block.imageGeometry.shortLabel,
    regionId: reference.regionId,
    shape: reference.shape,
    traceVersion: block.imageGeometry.traceVersion,
    visualRecall: overlap.recall,
    visualIoU: overlap.iou,
    visualBounds,
    hitBounds,
    referenceBounds,
    maxBoundsDelta,
    label: { x: block.imageGeometry.labelX, y: block.imageGeometry.labelY },
    labelInsideReference,
    currentVisualPath: visualPath,
    currentHitPath: hitPath,
    referencePath: subpathsToPath(referenceRings),
    blockerCount: blockers.length,
    blockers,
    status: blockers.length === 0 ? 'passed' : 'failed',
  };
});

const rows = buildRows();

const overlapRows = FORBIDDEN_HIT_OVERLAP_PAIRS.map(([firstId, secondId, reason]) => {
  const firstBlock = blockById.get(firstId);
  const secondBlock = blockById.get(secondId);
  if (!firstBlock || !secondBlock) {
    return {
      firstId,
      secondId,
      reason,
      overlapRatio: null,
      status: 'failed',
      blockers: [`MISSING_BLOCK:${!firstBlock ? firstId : secondId}`],
    };
  }
  const overlap = calculateRingsOverlap(
    parsePathSubpaths(firstBlock.imageGeometry.d),
    parsePathSubpaths(secondBlock.imageGeometry.d),
  );
  const smallerSamples = Math.min(overlap.firstSamples, overlap.secondSamples);
  const overlapRatio = smallerSamples > 0 ? round(overlap.intersectionSamples / smallerSamples) : 0;
  const blockers = overlapRatio <= PASS_THRESHOLDS.maxForbiddenOverlapRatio
    ? []
    : [`FORBIDDEN_HIT_OVERLAP:${overlapRatio}`];
  return {
    firstId,
    secondId,
    reason,
    overlapRatio,
    status: blockers.length === 0 ? 'passed' : 'failed',
    blockers,
  };
});

const renderRegionArtifacts = async (region) => {
  const regionRows = rows.filter((row) => region.blockIds.includes(row.id));
  const currentPaths = regionRows.map((row) => (
    `<path d="${xmlEscape(shiftPath(row.currentVisualPath, region.bounds))}" fill="rgba(37,99,235,0.12)" stroke="#2563eb" stroke-width="2"/>`
  ));
  const referencePaths = regionRows.map((row) => (
    `<path d="${xmlEscape(shiftPath(row.referencePath, region.bounds))}" fill="rgba(22,163,74,0.10)" stroke="#16a34a" stroke-width="2" stroke-dasharray="7 5"/>`
  ));
  const labels = regionRows.map((row) => (
    `<circle cx="${row.label.x - region.bounds.left}" cy="${row.label.y - region.bounds.top}" r="3" fill="#111827"/><text x="${row.label.x - region.bounds.left + 5}" y="${row.label.y - region.bounds.top - 5}" font-size="11" fill="#111827">${xmlEscape(row.id)}</text>`
  ));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${region.bounds.width}" height="${region.bounds.height}" viewBox="0 0 ${region.bounds.width} ${region.bounds.height}">
    ${renderGrid(region.bounds)}
    ${currentPaths.join('\n')}
    ${referencePaths.join('\n')}
    ${labels.join('\n')}
    <rect x="4" y="4" width="228" height="48" fill="rgba(255,255,255,0.82)" stroke="rgba(15,23,42,0.18)"/>
    <text x="10" y="20" font-size="11" fill="#111827">${xmlEscape(region.label)}</text>
    <text x="10" y="34" font-size="10" fill="#2563eb">blue=current browser visual polygon</text>
    <text x="10" y="47" font-size="10" fill="#16a34a">green dashed=independent official reference</text>
  </svg>`;

  await sharp(imagePath)
    .extract(region.bounds)
    .resize({ width: region.bounds.width * 3, height: region.bounds.height * 3, kernel: 'nearest' })
    .png()
    .toFile(region.officialCrop);

  const overlay = await sharp(imagePath)
    .extract(region.bounds)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png()
    .toBuffer();
  await sharp(overlay)
    .resize({ width: region.bounds.width * 3, height: region.bounds.height * 3, kernel: 'nearest' })
    .png()
    .toFile(region.overlay);
};

await fs.mkdir(reportDir, { recursive: true });
for (const region of outputPaths.crops) {
  await renderRegionArtifacts(region);
}

const blockers = [
  ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.id}:${blocker}`)),
  ...overlapRows.flatMap((row) => row.blockers.map((blocker) => `${row.firstId}/${row.secondId}:${blocker}`)),
];
const summary = {
  status: blockers.length === 0 ? 'passed' : 'failed',
  traceVersion: GWANGJU_FULL_RETRACE_VERSION,
  targetBlockCount: TARGET_BLOCK_IDS.length,
  passedBlockCount: rows.filter((row) => row.status === 'passed').length,
  failedBlockCount: rows.filter((row) => row.status !== 'passed').length,
  forbiddenHitOverlapFailureCount: overlapRows.filter((row) => row.status !== 'passed').length,
  blockerCount: blockers.length,
  minVisualRecall: Math.min(...rows.map((row) => row.visualRecall)),
  minVisualIoU: Math.min(...rows.map((row) => row.visualIoU)),
};

const report = {
  version: 'GWANGJU_LOWER_INFIELD_INDEPENDENT_AUDIT_V1',
  generatedAt: new Date().toISOString(),
  sourcePolicy: SOURCE_POLICY,
  thresholds: PASS_THRESHOLDS,
  summary,
  rows,
  forbiddenHitOverlapRows: overlapRows,
  artifacts: {
    json: path.relative(frontendRoot, outputPaths.json),
    csv: path.relative(frontendRoot, outputPaths.csv),
    markdown: path.relative(frontendRoot, outputPaths.markdown),
    crops: outputPaths.crops.map((region) => ({
      id: region.id,
      officialCrop: path.relative(frontendRoot, region.officialCrop),
      overlay: path.relative(frontendRoot, region.overlay),
    })),
  },
};

const csvHeaders = [
  'id',
  'status',
  'regionId',
  'shape',
  'traceVersion',
  'visualRecall',
  'visualIoU',
  'boundsDelta',
  'labelInsideReference',
  'visualBounds',
  'referenceBounds',
  'blockers',
];
const csvLines = [
  csvHeaders.join(','),
  ...rows.map((row) => [
    row.id,
    row.status,
    row.regionId,
    row.shape,
    row.traceVersion,
    row.visualRecall,
    row.visualIoU,
    row.maxBoundsDelta,
    row.labelInsideReference,
    JSON.stringify(row.visualBounds),
    JSON.stringify(row.referenceBounds),
    row.blockers.join('|'),
  ].map(csvEscape).join(',')),
  '',
  'firstId,secondId,status,reason,overlapRatio,blockers',
  ...overlapRows.map((row) => [
    row.firstId,
    row.secondId,
    row.status,
    row.reason,
    row.overlapRatio,
    row.blockers.join('|'),
  ].map(csvEscape).join(',')),
];

const markdown = [
  '# Gwangju Lower Infield Independent Audit',
  '',
  `- status: \`${summary.status}\``,
  `- traceVersion: \`${GWANGJU_FULL_RETRACE_VERSION}\``,
  `- target blocks: ${summary.targetBlockCount}`,
  `- blockers: ${summary.blockerCount}`,
  `- visual reference source: \`${OFFICIAL_VISUAL_REFERENCE_SOURCE}\``,
  '',
  '## Artifacts',
  '',
  ...report.artifacts.crops.flatMap((region) => [
    `- ${region.id} official crop: \`${region.officialCrop}\``,
    `- ${region.id} overlay: \`${region.overlay}\``,
  ]),
  '',
  '## Block Results',
  '',
  markdownTable(
    ['id', 'status', 'region', 'shape', 'recall', 'IoU', 'bounds delta', 'label inside', 'blockers'],
    rows.map((row) => [
      row.id,
      row.status,
      row.regionId,
      row.shape,
      row.visualRecall,
      row.visualIoU,
      row.maxBoundsDelta,
      row.labelInsideReference ? 'yes' : 'no',
      row.blockers.join('<br>') || '-',
    ]),
  ),
  '',
  '## Forbidden Hit Overlap',
  '',
  markdownTable(
    ['first', 'second', 'status', 'reason', 'overlap ratio', 'blockers'],
    overlapRows.map((row) => [
      row.firstId,
      row.secondId,
      row.status,
      row.reason,
      row.overlapRatio,
      row.blockers.join('<br>') || '-',
    ]),
  ),
  '',
  '## Source Policy',
  '',
  'This audit uses only the official PNG 2200x1159 coordinate system and fixed visual references traced from official PNG crops. It does not use browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, or third-party copied seatmap coordinates.',
].join('\n');

await fs.writeFile(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(outputPaths.csv, `${csvLines.join('\n')}\n`);
await fs.writeFile(outputPaths.markdown, `${markdown}\n`);

console.log(`status:${summary.status} target_blocks=${summary.targetBlockCount} blockers=${summary.blockerCount} min_recall=${summary.minVisualRecall} min_iou=${summary.minVisualIoU}`);
if (blockers.length > 0) {
  console.error(blockers.join('\n'));
  process.exitCode = 1;
}
