import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  GWANGJU_BLOCKS,
  GWANGJU_FULL_RETRACE_VERSION,
  GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

const SCRIPT_VERSION = 'GWANGJU_IMAGE_ALIGNMENT_AUDIT_V4';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const cropDir = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit-crops');
const jsonPath = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit.json');
const csvPath = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit.csv');
const markdownPath = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit.md');
const overlayPath = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit-overlay.png');
const imagePath = path.resolve(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath);
const allowFailures = process.argv.includes('--allow-failures');
const requireSkyPicnicScan = process.argv.includes('--require-sky-picnic');
const requireAlphabetSectionScan = process.argv.includes('--require-alphabet-sections');

const SOURCE_POLICY = {
  coordinateSource: 'official PNG 2200x1159 only',
  coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
  disallowedSources: [
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
  ],
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
};

const NUMBERED_BLOCK_THRESHOLDS = {
  default: { minimumRecall: 0.85, minimumIoU: 0.7, maximumOutsideBleed: 0.08 },
  p0: { minimumRecall: 0.9, minimumIoU: 0.75, maximumOutsideBleed: 0.08 },
};

const SKY_PICNIC_COLOR_SCAN_THRESHOLDS = {
  minimumColorCoverageRatio: 0.45,
  criticalColorCoverageRatio: 0.2,
};

const SKY_PICNIC_COLOR_SPEC = {
  colors: [
    [248, 196, 180],
    [244, 203, 205],
    [243, 164, 144],
    [225, 131, 172],
    [238, 145, 181],
    [239, 146, 181],
    [244, 180, 208],
  ],
  threshold: 42,
};

const ALPHABET_SECTION_COLOR_SCAN_THRESHOLDS = {
  minimumColorCoverageRatio: 0.55,
  criticalColorCoverageRatio: 0.25,
};

const ALPHABET_SECTION_COLOR_SPECS = {
  'champion-seats': {
    label: 'A',
    colors: [[80, 192, 176]],
    threshold: 38,
  },
  'central-table-seats': {
    label: 'B',
    colors: [[152, 216, 248]],
    threshold: 38,
  },
  'disabled-seats-center': {
    label: 'C',
    colors: [[32, 176, 56], [53, 178, 65], [65, 170, 115], [0, 141, 67]],
    threshold: 38,
  },
  'first-surprise-seats': {
    label: 'G',
    colors: [[240, 152, 0]],
    threshold: 38,
  },
  'third-surprise-seats': {
    label: 'G',
    colors: [[240, 152, 0]],
    threshold: 38,
  },
  'first-family-seats': {
    label: 'H',
    colors: [[240, 128, 128]],
    threshold: 38,
  },
  'third-family-seats': {
    label: 'H',
    colors: [[240, 128, 128]],
    threshold: 38,
  },
  'first-wheelchair-seats': {
    label: 'I',
    colors: [[240, 168, 144], [248, 184, 208], [232, 136, 168]],
    threshold: 42,
  },
  'third-wheelchair-seats': {
    label: 'I',
    colors: [[240, 168, 144], [248, 184, 208], [232, 136, 168]],
    threshold: 42,
  },
  'party-seats-first': {
    label: 'J',
    colors: [[248, 200, 112], [240, 168, 144]],
    threshold: 42,
  },
  'party-seats-third': {
    label: 'J',
    colors: [[248, 200, 184], [240, 168, 144], [224, 136, 112], [248, 184, 208]],
    threshold: 42,
  },
  'skybox-seats': {
    label: 'K',
    colors: [[104, 56, 120], [128, 96, 152]],
    threshold: 45,
  },
};

const ALPHABET_SECTION_IDS = new Set(Object.keys(ALPHABET_SECTION_COLOR_SPECS));

const P0_BLOCK_IDS = new Set([
  'k5-101',
  'k5-102',
  'k5-103',
  'k5-104',
  'k5-105',
  'k5-106',
  'k7-107',
  'k7-108',
]);

const P0_OFFICIAL_BLOCK_MASKS = {
  'k5-101': [[1068.5, 798.7], [1140, 810], [1103.6, 841.2], [1077.3, 840.6], [1068.5, 838.3]],
  'k5-102': [[1011, 807.8], [1014, 800], [1065.5, 798.2], [1065.5, 811.5], [1054, 846], [1018.9, 839.5]],
  'k5-103': [[959.7, 826.5], [968, 808], [1006.4, 801.9], [1011.3, 821.5], [1000, 858], [969.4, 851.9]],
  'k5-104': [[908.5, 841.9], [918, 820], [951.1, 812.6], [961.8, 840.5], [953, 886], [919.3, 884]],
  'k5-105': [[872, 853.8], [877, 834], [899.4, 826.4], [914, 858.5], [901, 900], [878, 895]],
  'k5-106': [[825, 856.1], [828.2, 845.8], [852, 838.9], [874, 879.8], [862, 910], [827.9, 915.7]],
  'k7-107': [[785.5, 902.2], [781.8, 874.3], [790, 848], [808.1, 844.8], [821.5, 847.1], [823.2, 881], [814.4, 911.6]],
  'k7-108': [[752.5, 931.1], [751.5, 930.8], [736.7, 865.7], [740, 850], [775.3, 848.6], [781.7, 896], [779.6, 905.6]],
};

const COMPONENT_COLOR_SPECS = {
  outfield: { colors: [[220, 234, 186]], threshold: 22, minArea: 300 },
  'bleachers-table': { colors: [[144, 195, 31]], threshold: 30, minArea: 100 },
};
const COMPONENT_EXTRACTION_BOUNDS = { minX: 250, maxX: 1370, minY: 90, maxY: 1090 };

const CROP_REGIONS = [
  { id: '101-108', bounds: { left: 700, top: 780, width: 480, height: 190 } },
  { id: '101-113', bounds: { left: 500, top: 780, width: 690, height: 205 } },
  { id: '116-123', bounds: { left: 350, top: 385, width: 350, height: 380 } },
  { id: 'sky-picnic-s-301-315', bounds: { left: 430, top: 880, width: 760, height: 170 } },
  { id: 'sky-picnic-s-316-335', bounds: { left: 300, top: 360, width: 360, height: 650 } },
  { id: 'op-outfield', bounds: { left: 690, top: 80, width: 700, height: 780 } },
  { id: 'special-seats', bounds: { left: 330, top: 700, width: 900, height: 250 } },
  { id: 'alphabet-special-seats-upper', bounds: { left: 430, top: 100, width: 560, height: 430 } },
];

const round = (value, digits = 4) => (
  value === null || value === undefined || Number.isNaN(value)
    ? null
    : Number(value.toFixed(digits))
);
const pixelKey = (x, y) => `${x},${y}`;
const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const markdownCell = (value) => String(value ?? '-').replaceAll('|', '\\|').replaceAll('\n', '<br>');
const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');
const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const parsePathSubpaths = (pathData) => (String(pathData ?? '').match(/M[^M]+/g) ?? [])
  .map((subpath) => {
    const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  })
  .filter((points) => points.length >= 3);

const pointInPolygon = ([x, y], polygon) => {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const [xi, yi] = polygon[current];
    const [xj, yj] = polygon[previous];
    const intersects = ((yi > y) !== (yj > y))
      && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};
const pointInRings = (point, rings) => rings.some((ring) => pointInPolygon(point, ring));
const pointsBounds = (points) => ({
  minX: Math.min(...points.map(([x]) => x)),
  minY: Math.min(...points.map(([, y]) => y)),
  maxX: Math.max(...points.map(([x]) => x)),
  maxY: Math.max(...points.map(([, y]) => y)),
});
const unionBounds = (boundsList) => {
  const valid = boundsList.filter(Boolean);
  if (valid.length === 0) return null;
  return {
    minX: Math.min(...valid.map((bounds) => bounds.minX)),
    minY: Math.min(...valid.map((bounds) => bounds.minY)),
    maxX: Math.max(...valid.map((bounds) => bounds.maxX)),
    maxY: Math.max(...valid.map((bounds) => bounds.maxY)),
  };
};
const pathBounds = (pathData) => unionBounds(parsePathSubpaths(pathData).map(pointsBounds));
const boundsDelta = (actual, expected) => {
  if (!actual || !expected) return null;
  return {
    minX: round(actual.minX - expected.minX, 1),
    minY: round(actual.minY - expected.minY, 1),
    maxX: round(actual.maxX - expected.maxX, 1),
    maxY: round(actual.maxY - expected.maxY, 1),
  };
};
const maxAbsBoundsDelta = (delta) => (
  delta ? Math.max(...Object.values(delta).map((value) => Math.abs(value))) : null
);
const pathFromPoints = (points) => `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;
const colorDistance = (first, second) => Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
const rgbAt = (image, x, y) => {
  const offset = ((y * image.width) + x) * image.channels;
  return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
};
const isSkyPicnicOfficialColorPixel = (image, x, y) => {
  const color = rgbAt(image, x, y);
  return SKY_PICNIC_COLOR_SPEC.colors.some((target) => colorDistance(color, target) <= SKY_PICNIC_COLOR_SPEC.threshold);
};
const isAlphabetSectionOfficialColorPixel = (image, blockId, x, y) => {
  const spec = ALPHABET_SECTION_COLOR_SPECS[blockId];
  if (!spec) return false;
  const color = rgbAt(image, x, y);
  return spec.colors.some((target) => colorDistance(color, target) <= spec.threshold);
};
const isComponentPixel = (image, groupId, x, y) => {
  const spec = COMPONENT_COLOR_SPECS[groupId];
  const color = rgbAt(image, x, y);
  return spec.colors.some((target) => colorDistance(color, target) <= spec.threshold);
};

const extractOfficialComponents = (image, groupId) => {
  const spec = COMPONENT_COLOR_SPECS[groupId];
  const bounds = COMPONENT_EXTRACTION_BOUNDS;
  const width = bounds.maxX - bounds.minX + 1;
  const mask = new Uint8Array(width * (bounds.maxY - bounds.minY + 1));
  const seen = new Uint8Array(mask.length);

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (isComponentPixel(image, groupId, x, y)) {
        mask[((y - bounds.minY) * width) + (x - bounds.minX)] = 1;
      }
    }
  }

  const components = [];
  const queue = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const startIndex = ((y - bounds.minY) * width) + (x - bounds.minX);
      if (!mask[startIndex] || seen[startIndex]) continue;
      const pixels = [];
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      seen[startIndex] = 1;
      queue.length = 0;
      queue.push([x, y]);

      for (let head = 0; head < queue.length; head += 1) {
        const [currentX, currentY] = queue[head];
        pixels.push([currentX, currentY]);
        minX = Math.min(minX, currentX);
        minY = Math.min(minY, currentY);
        maxX = Math.max(maxX, currentX);
        maxY = Math.max(maxY, currentY);

        for (const [offsetX, offsetY] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nextX = currentX + offsetX;
          const nextY = currentY + offsetY;
          if (nextX < bounds.minX || nextX > bounds.maxX || nextY < bounds.minY || nextY > bounds.maxY) continue;
          const index = ((nextY - bounds.minY) * width) + (nextX - bounds.minX);
          if (!mask[index] || seen[index]) continue;
          seen[index] = 1;
          queue.push([nextX, nextY]);
        }
      }

      if (pixels.length >= spec.minArea) {
        components.push({
          id: `${groupId}-${components.length + 1}`,
          bounds: { minX, minY, maxX, maxY },
          pixels,
        });
      }
    }
  }

  return components.sort((left, right) => left.bounds.minY - right.bounds.minY || left.bounds.minX - right.bounds.minX);
};

const officialComponentPixels = (image, reference) => {
  const selectedIds = new Set(reference.componentIds);
  const pixels = new Set();
  extractOfficialComponents(image, reference.componentGroupId)
    .filter((component) => selectedIds.has(component.id))
    .forEach((component) => {
      component.pixels.forEach(([x, y]) => {
        if (
          x >= reference.expectedBounds.minX
          && x <= reference.expectedBounds.maxX
          && y >= reference.expectedBounds.minY
          && y <= reference.expectedBounds.maxY
        ) {
          pixels.add(pixelKey(x, y));
        }
      });
    });
  return pixels;
};

const calculateMaskAlignment = (block, officialMaskRings, thresholds) => {
  const polygonRings = parsePathSubpaths(block.imageGeometry.d);
  const officialBounds = unionBounds(officialMaskRings.map(pointsBounds));
  const polygonBounds = pathBounds(block.imageGeometry.d);
  const bounds = unionBounds([officialBounds, polygonBounds]);
  let officialPixels = 0;
  let polygonPixels = 0;
  let intersectionPixels = 0;
  const sampleStep = 2;

  for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
    for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
      const point = [x + 0.5, y + 0.5];
      const insideOfficial = pointInRings(point, officialMaskRings);
      const insidePolygon = pointInRings(point, polygonRings);
      if (insideOfficial) officialPixels += 1;
      if (insidePolygon) polygonPixels += 1;
      if (insideOfficial && insidePolygon) intersectionPixels += 1;
    }
  }

  const unionPixels = officialPixels + polygonPixels - intersectionPixels;
  const outsidePixels = Math.max(0, polygonPixels - intersectionPixels);
  const officialBlockMaskRecall = officialPixels === 0 ? 0 : intersectionPixels / officialPixels;
  const componentIoU = unionPixels === 0 ? 0 : intersectionPixels / unionPixels;
  const outsideBleedRatio = polygonPixels === 0 ? 1 : outsidePixels / polygonPixels;
  const labelPoint = [block.imageGeometry.labelX, block.imageGeometry.labelY];
  const labelInsideOfficialMask = pointInRings(labelPoint, officialMaskRings);
  const officialBoundsDelta = boundsDelta(polygonBounds, officialBounds);
  const blockers = [];

  if (officialBlockMaskRecall < thresholds.minimumRecall) blockers.push(`OFFICIAL_BLOCK_MASK_RECALL_BELOW_THRESHOLD:${round(officialBlockMaskRecall)}`);
  if (componentIoU < thresholds.minimumIoU) blockers.push(`COMPONENT_IOU_BELOW_THRESHOLD:${round(componentIoU)}`);
  if (outsideBleedRatio > thresholds.maximumOutsideBleed) blockers.push(`OUTSIDE_BLEED_RATIO_ABOVE_THRESHOLD:${round(outsideBleedRatio)}`);
  if (!labelInsideOfficialMask) blockers.push('LABEL_OUTSIDE_OFFICIAL_MASK');

  return {
    auditMode: 'official-block-mask',
    officialBlockMaskRecall: round(officialBlockMaskRecall),
    componentIoU: round(componentIoU),
    skyPicnicColorCoverageRatio: null,
    alphabetSectionColorCoverageRatio: null,
    outsideBleedRatio: round(outsideBleedRatio),
    officialBounds: {
      minX: round(officialBounds.minX, 1),
      minY: round(officialBounds.minY, 1),
      maxX: round(officialBounds.maxX, 1),
      maxY: round(officialBounds.maxY, 1),
    },
    currentBounds: {
      minX: round(polygonBounds.minX, 1),
      minY: round(polygonBounds.minY, 1),
      maxX: round(polygonBounds.maxX, 1),
      maxY: round(polygonBounds.maxY, 1),
    },
    officialBoundsDelta,
    officialBoundsMaxAbsDelta: round(maxAbsBoundsDelta(officialBoundsDelta), 1),
    labelInsideOfficialMask,
    blockers,
  };
};

const calculateComponentAlignment = (image, block, reference) => {
  const polygonRings = parsePathSubpaths(block.imageGeometry.d);
  const componentPixels = officialComponentPixels(image, reference);
  const polygonBounds = pathBounds(block.imageGeometry.d);
  const bounds = unionBounds([reference.expectedBounds, polygonBounds]);
  let officialPixels = 0;
  let polygonPixels = 0;
  let intersectionPixels = 0;
  const sampleStep = 2;

  for (let y = Math.max(0, Math.floor(bounds.minY - 20)); y <= Math.min(image.height - 1, Math.ceil(bounds.maxY + 20)); y += sampleStep) {
    for (let x = Math.max(0, Math.floor(bounds.minX - 20)); x <= Math.min(image.width - 1, Math.ceil(bounds.maxX + 20)); x += sampleStep) {
      const inOfficialBounds = x >= reference.expectedBounds.minX && x <= reference.expectedBounds.maxX && y >= reference.expectedBounds.minY && y <= reference.expectedBounds.maxY;
      const insideOfficial = inOfficialBounds && componentPixels.has(pixelKey(x, y));
      const insidePolygon = pointInRings([x + 0.5, y + 0.5], polygonRings);
      if (insideOfficial) officialPixels += 1;
      if (insidePolygon) polygonPixels += 1;
      if (insideOfficial && insidePolygon) intersectionPixels += 1;
    }
  }

  const unionPixels = officialPixels + polygonPixels - intersectionPixels;
  const outsidePixels = Math.max(0, polygonPixels - intersectionPixels);
  const officialBlockMaskRecall = officialPixels === 0 ? 0 : intersectionPixels / officialPixels;
  const componentIoU = unionPixels === 0 ? 0 : intersectionPixels / unionPixels;
  const outsideBleedRatio = polygonPixels === 0 ? 1 : outsidePixels / polygonPixels;
  const blockers = [];
  if (officialBlockMaskRecall < reference.minimumRecall) blockers.push(`OFFICIAL_COMPONENT_RECALL_BELOW_THRESHOLD:${round(officialBlockMaskRecall)}`);
  if (componentIoU < reference.minimumIoU) blockers.push(`COMPONENT_IOU_BELOW_THRESHOLD:${round(componentIoU)}`);

  return {
    auditMode: 'official-component',
    officialBlockMaskRecall: round(officialBlockMaskRecall),
    componentIoU: round(componentIoU),
    skyPicnicColorCoverageRatio: null,
    alphabetSectionColorCoverageRatio: null,
    outsideBleedRatio: round(outsideBleedRatio),
    officialBounds: reference.expectedBounds,
    currentBounds: {
      minX: round(polygonBounds.minX, 1),
      minY: round(polygonBounds.minY, 1),
      maxX: round(polygonBounds.maxX, 1),
      maxY: round(polygonBounds.maxY, 1),
    },
    officialBoundsDelta: boundsDelta(polygonBounds, reference.expectedBounds),
    officialBoundsMaxAbsDelta: round(maxAbsBoundsDelta(boundsDelta(polygonBounds, reference.expectedBounds)), 1),
    labelInsideOfficialMask: null,
    blockers,
  };
};

const calculateSkyPicnicColorScan = (image, block) => {
  const polygonRings = parsePathSubpaths(block.imageGeometry.d);
  const polygonBounds = pathBounds(block.imageGeometry.d);
  let polygonPixels = 0;
  let skyPicnicColorPixels = 0;
  const sampleStep = 2;

  for (let y = Math.max(0, Math.floor(polygonBounds.minY - 4)); y <= Math.min(image.height - 1, Math.ceil(polygonBounds.maxY + 4)); y += sampleStep) {
    for (let x = Math.max(0, Math.floor(polygonBounds.minX - 4)); x <= Math.min(image.width - 1, Math.ceil(polygonBounds.maxX + 4)); x += sampleStep) {
      const insidePolygon = pointInRings([x + 0.5, y + 0.5], polygonRings);
      if (!insidePolygon) continue;
      polygonPixels += 1;
      if (isSkyPicnicOfficialColorPixel(image, x, y)) skyPicnicColorPixels += 1;
    }
  }

  const skyPicnicColorCoverageRatio = polygonPixels === 0 ? 0 : skyPicnicColorPixels / polygonPixels;
  const outsideBleedRatio = polygonPixels === 0 ? 1 : 1 - skyPicnicColorCoverageRatio;
  const reviewWarnings = [];
  if (skyPicnicColorCoverageRatio < SKY_PICNIC_COLOR_SCAN_THRESHOLDS.minimumColorCoverageRatio) {
    reviewWarnings.push(`SKY_PICNIC_COLOR_COVERAGE_BELOW_REVIEW_TARGET:${round(skyPicnicColorCoverageRatio)}`);
  }
  if (skyPicnicColorCoverageRatio < SKY_PICNIC_COLOR_SCAN_THRESHOLDS.criticalColorCoverageRatio) {
    reviewWarnings.push(`SKY_PICNIC_COLOR_COVERAGE_CRITICAL:${round(skyPicnicColorCoverageRatio)}`);
  }

  return {
    auditMode: 'official-sky-picnic-color-scan',
    officialBlockMaskRecall: null,
    componentIoU: null,
    skyPicnicColorCoverageRatio: round(skyPicnicColorCoverageRatio),
    alphabetSectionColorCoverageRatio: null,
    outsideBleedRatio: round(outsideBleedRatio),
    officialBounds: null,
    currentBounds: {
      minX: round(polygonBounds.minX, 1),
      minY: round(polygonBounds.minY, 1),
      maxX: round(polygonBounds.maxX, 1),
      maxY: round(polygonBounds.maxY, 1),
    },
    officialBoundsDelta: null,
    officialBoundsMaxAbsDelta: null,
    labelInsideOfficialMask: null,
    blockers: requireSkyPicnicScan ? reviewWarnings : [],
    reviewWarnings,
  };
};

const calculateAlphabetSectionColorScan = (image, block) => {
  const polygonRings = parsePathSubpaths(block.imageGeometry.d);
  const polygonBounds = pathBounds(block.imageGeometry.d);
  let polygonPixels = 0;
  let alphabetSectionColorPixels = 0;
  const sampleStep = 2;

  for (let y = Math.max(0, Math.floor(polygonBounds.minY - 4)); y <= Math.min(image.height - 1, Math.ceil(polygonBounds.maxY + 4)); y += sampleStep) {
    for (let x = Math.max(0, Math.floor(polygonBounds.minX - 4)); x <= Math.min(image.width - 1, Math.ceil(polygonBounds.maxX + 4)); x += sampleStep) {
      const insidePolygon = pointInRings([x + 0.5, y + 0.5], polygonRings);
      if (!insidePolygon) continue;
      polygonPixels += 1;
      if (isAlphabetSectionOfficialColorPixel(image, block.id, x, y)) alphabetSectionColorPixels += 1;
    }
  }

  const alphabetSectionColorCoverageRatio = polygonPixels === 0 ? 0 : alphabetSectionColorPixels / polygonPixels;
  const outsideBleedRatio = polygonPixels === 0 ? 1 : 1 - alphabetSectionColorCoverageRatio;
  const reviewWarnings = [];
  if (alphabetSectionColorCoverageRatio < ALPHABET_SECTION_COLOR_SCAN_THRESHOLDS.minimumColorCoverageRatio) {
    reviewWarnings.push(`ALPHABET_SECTION_COLOR_COVERAGE_BELOW_REVIEW_TARGET:${round(alphabetSectionColorCoverageRatio)}`);
  }
  if (alphabetSectionColorCoverageRatio < ALPHABET_SECTION_COLOR_SCAN_THRESHOLDS.criticalColorCoverageRatio) {
    reviewWarnings.push(`ALPHABET_SECTION_COLOR_COVERAGE_CRITICAL:${round(alphabetSectionColorCoverageRatio)}`);
  }

  return {
    auditMode: 'official-alphabet-section-color-scan',
    officialBlockMaskRecall: null,
    componentIoU: null,
    skyPicnicColorCoverageRatio: null,
    alphabetSectionColorCoverageRatio: round(alphabetSectionColorCoverageRatio),
    outsideBleedRatio: round(outsideBleedRatio),
    officialBounds: null,
    currentBounds: {
      minX: round(polygonBounds.minX, 1),
      minY: round(polygonBounds.minY, 1),
      maxX: round(polygonBounds.maxX, 1),
      maxY: round(polygonBounds.maxY, 1),
    },
    officialBoundsDelta: null,
    officialBoundsMaxAbsDelta: null,
    labelInsideOfficialMask: null,
    blockers: requireAlphabetSectionScan ? reviewWarnings : [],
    reviewWarnings,
  };
};

const topHitAtLabel = (block, blocksWithRings) => {
  const point = [block.imageGeometry.labelX, block.imageGeometry.labelY];
  const containing = blocksWithRings.filter((candidate) => pointInRings(point, candidate.rings));
  return containing.at(-1)?.id === block.id;
};

const renderOverlay = async (rows, targetPath, cropBounds = null) => {
  const width = GWANGJU_SEATMAP_IMAGE.imageWidth;
  const height = GWANGJU_SEATMAP_IMAGE.imageHeight;
  const officialPaths = rows
    .filter((row) => row.officialMaskPath)
    .map((row) => `<path d="${xmlEscape(row.officialMaskPath)}" fill="rgba(34,197,94,0.18)" stroke="#16a34a" stroke-width="2.4"/>`)
    .join('\n');
  const currentPaths = rows
    .map((row) => `<path d="${xmlEscape(row.currentPath)}" fill="rgba(37,99,235,0.16)" stroke="#2563eb" stroke-width="1.6"/>`)
    .join('\n');
  const labels = rows
    .map((row) => `<text x="${row.labelX}" y="${row.labelY}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="800" fill="#111827" stroke="#fff" stroke-width="2" paint-order="stroke">${xmlEscape(row.shortLabel)}</text>`)
    .join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${officialPaths}${currentPaths}${labels}</svg>`;
  const overlayBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const full = await sharp(imagePath)
    .ensureAlpha()
    .composite([{ input: overlayBuffer, left: 0, top: 0 }])
    .png()
    .toBuffer();
  const image = cropBounds
    ? sharp(full).extract(cropBounds).resize({ width: cropBounds.width * 2 })
    : sharp(full);
  await image.png().toFile(targetPath);
};

await fs.mkdir(reportDir, { recursive: true });
await fs.mkdir(cropDir, { recursive: true });

const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
const image = { data, width: info.width, height: info.height, channels: info.channels };
const blocksWithRings = GWANGJU_BLOCKS.map((block) => ({
  id: block.id,
  rings: parsePathSubpaths(block.imageGeometry.d),
}));
const rows = GWANGJU_BLOCKS.map((block) => {
  const p0Mask = P0_OFFICIAL_BLOCK_MASKS[block.id];
  const opReference = GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES[block.id];
  const isSkyPicnicBlock = block.category === 'SKY_PICNIC';
  const isAlphabetSectionBlock = ALPHABET_SECTION_IDS.has(block.id);
  const thresholds = P0_BLOCK_IDS.has(block.id) ? NUMBERED_BLOCK_THRESHOLDS.p0 : NUMBERED_BLOCK_THRESHOLDS.default;
  let metric;
  if (p0Mask) {
    metric = calculateMaskAlignment(block, [p0Mask], thresholds);
  } else if (opReference) {
    metric = calculateComponentAlignment(image, block, opReference);
  } else if (isSkyPicnicBlock) {
    metric = calculateSkyPicnicColorScan(image, block);
  } else if (isAlphabetSectionBlock) {
    metric = calculateAlphabetSectionColorScan(image, block);
  } else {
    metric = {
      auditMode: 'release-trace-advisory',
      officialBlockMaskRecall: null,
      componentIoU: null,
      skyPicnicColorCoverageRatio: null,
      alphabetSectionColorCoverageRatio: null,
      outsideBleedRatio: null,
      officialBounds: null,
      currentBounds: pathBounds(block.imageGeometry.d),
      officialBoundsDelta: null,
      officialBoundsMaxAbsDelta: null,
      labelInsideOfficialMask: null,
      blockers: [],
      reviewWarnings: [],
    };
  }
  const topHit = topHitAtLabel(block, blocksWithRings);
  const blockers = [
    ...metric.blockers,
    ...(topHit ? [] : ['LABEL_TOP_HIT_MISMATCH']),
  ];
  const reviewWarnings = metric.reviewWarnings ?? [];

  return {
    id: block.id,
    block: block.block,
    category: block.category,
    shortLabel: block.imageGeometry.shortLabel,
    traceVersion: block.imageGeometry.traceVersion,
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    currentPath: block.imageGeometry.d,
    officialMaskPath: p0Mask ? pathFromPoints(p0Mask) : null,
    thresholdProfile: P0_BLOCK_IDS.has(block.id) ? 'p0-101-108' : opReference ? 'op-component' : isSkyPicnicBlock ? 'sky-picnic-color-scan' : isAlphabetSectionBlock ? 'alphabet-section-color-scan' : 'advisory',
    topHitAtLabel: topHit,
    status: blockers.length > 0 ? 'failed' : reviewWarnings.length > 0 ? 'review-required' : 'passed',
    ...metric,
    blockers,
    reviewWarnings,
  };
});

const auditedRows = rows.filter((row) => row.auditMode !== 'release-trace-advisory');
const failedRows = auditedRows.filter((row) => row.status === 'failed');
const reviewRows = auditedRows.filter((row) => row.status === 'review-required');
const p0Rows = rows.filter((row) => P0_BLOCK_IDS.has(row.id));
const skyPicnicRows = rows.filter((row) => row.auditMode === 'official-sky-picnic-color-scan');
const alphabetSectionRows = rows.filter((row) => row.auditMode === 'official-alphabet-section-color-scan');
const summary = {
  scriptVersion: SCRIPT_VERSION,
  status: failedRows.length === 0 ? 'passed' : 'failed',
  traceVersion: GWANGJU_FULL_RETRACE_VERSION,
  imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
  coordinateSystem: SOURCE_POLICY.coordinateSystem,
  totalBlocks: rows.length,
  auditedBlocks: auditedRows.length,
  p0AuditedBlocks: p0Rows.length,
  skyPicnicAuditedBlocks: skyPicnicRows.length,
  alphabetSectionAuditedBlocks: alphabetSectionRows.length,
  failedBlocks: failedRows.length,
  reviewRequiredBlocks: reviewRows.length,
  minimumP0OfficialBlockMaskRecall: round(Math.min(...p0Rows.map((row) => row.officialBlockMaskRecall ?? 1))),
  minimumP0ComponentIoU: round(Math.min(...p0Rows.map((row) => row.componentIoU ?? 1))),
  maximumP0OutsideBleedRatio: round(Math.max(...p0Rows.map((row) => row.outsideBleedRatio ?? 0))),
  minimumSkyPicnicColorCoverageRatio: round(Math.min(...skyPicnicRows.map((row) => row.skyPicnicColorCoverageRatio ?? 1))),
  maximumSkyPicnicOutsideBleedRatio: round(Math.max(...skyPicnicRows.map((row) => row.outsideBleedRatio ?? 0))),
  skyPicnicReviewRequiredBlocks: skyPicnicRows.filter((row) => row.status === 'review-required').length,
  skyPicnicScanBlocking: requireSkyPicnicScan,
  alphabetSectionReviewRequiredBlocks: alphabetSectionRows.filter((row) => row.status === 'review-required').length,
  minimumAlphabetSectionColorCoverageRatio: round(Math.min(...alphabetSectionRows.map((row) => row.alphabetSectionColorCoverageRatio ?? 1))),
  maximumAlphabetSectionOutsideBleedRatio: round(Math.max(...alphabetSectionRows.map((row) => row.outsideBleedRatio ?? 0))),
  alphabetSectionScanBlocking: requireAlphabetSectionScan,
  labelTopHitFailures: rows.filter((row) => !row.topHitAtLabel).length,
  officialMaskSourcePolicy: SOURCE_POLICY,
};

await renderOverlay(rows.filter((row) => row.auditMode !== 'release-trace-advisory'), overlayPath);
for (const region of CROP_REGIONS) {
  await renderOverlay(rows.filter((row) => row.auditMode !== 'release-trace-advisory'), path.join(cropDir, `gwangju-seatmap-image-alignment-audit-${region.id}.png`), region.bounds);
}

await fs.writeFile(jsonPath, `${JSON.stringify({
  summary,
  thresholds: {
    numberedBlocks: NUMBERED_BLOCK_THRESHOLDS,
    skyPicnicColorScan: SKY_PICNIC_COLOR_SCAN_THRESHOLDS,
    alphabetSectionColorScan: ALPHABET_SECTION_COLOR_SCAN_THRESHOLDS,
  },
  cropArtifacts: CROP_REGIONS.map((region) => path.relative(frontendRoot, path.join(cropDir, `gwangju-seatmap-image-alignment-audit-${region.id}.png`))),
  overlayArtifact: path.relative(frontendRoot, overlayPath),
  rows,
}, null, 2)}\n`, 'utf8');

const csvHeaders = [
  'id',
  'block',
  'category',
  'traceVersion',
  'auditMode',
  'thresholdProfile',
  'officialBlockMaskRecall',
  'componentIoU',
  'skyPicnicColorCoverageRatio',
  'alphabetSectionColorCoverageRatio',
  'outsideBleedRatio',
  'officialBoundsMaxAbsDelta',
  'labelInsideOfficialMask',
  'topHitAtLabel',
  'status',
  'blockers',
  'reviewWarnings',
];
await fs.writeFile(csvPath, `${[
  csvHeaders,
  ...rows.map((row) => [
    row.id,
    row.block,
    row.category,
    row.traceVersion,
    row.auditMode,
    row.thresholdProfile,
    row.officialBlockMaskRecall,
    row.componentIoU,
    row.skyPicnicColorCoverageRatio,
    row.alphabetSectionColorCoverageRatio,
    row.outsideBleedRatio,
    row.officialBoundsMaxAbsDelta,
    row.labelInsideOfficialMask,
    row.topHitAtLabel,
    row.status,
    row.blockers.join('|'),
    row.reviewWarnings.join('|'),
  ]),
].map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');

const markdown = [
  '# 광주 좌석도 image alignment audit',
  '',
  `- status: \`${summary.status}\``,
  `- trace version: \`${summary.traceVersion}\``,
  `- coordinate source: \`${SOURCE_POLICY.coordinateSource}\``,
  `- coordinate system: \`${SOURCE_POLICY.coordinateSystem}\``,
  `- audited blocks: ${summary.auditedBlocks}`,
  `- P0 101~108 minimum recall: \`${summary.minimumP0OfficialBlockMaskRecall}\``,
  `- P0 101~108 minimum IoU: \`${summary.minimumP0ComponentIoU}\``,
  `- P0 101~108 maximum outside bleed: \`${summary.maximumP0OutsideBleedRatio}\``,
  `- S-301~S-335 minimum official color coverage: \`${summary.minimumSkyPicnicColorCoverageRatio}\``,
  `- S-301~S-335 maximum outside bleed: \`${summary.maximumSkyPicnicOutsideBleedRatio}\``,
  `- S-301~S-335 review-required rows: ${skyPicnicRows.filter((row) => row.status === 'review-required').length}`,
  `- S-301~S-335 blocking mode: \`${summary.skyPicnicScanBlocking ? 'enabled' : 'disabled'}\``,
  `- alphabet sections minimum official color coverage: \`${summary.minimumAlphabetSectionColorCoverageRatio}\``,
  `- alphabet sections maximum outside bleed: \`${summary.maximumAlphabetSectionOutsideBleedRatio}\``,
  `- alphabet sections review-required rows: ${summary.alphabetSectionReviewRequiredBlocks}`,
  `- alphabet sections blocking mode: \`${summary.alphabetSectionScanBlocking ? 'enabled' : 'disabled'}\``,
  `- label top-hit failures: ${summary.labelTopHitFailures}`,
  '',
  '기존 `pixelCoverageRatio`는 작은 polygon이 공식 색상 영역 내부에 있을 때 false pass를 만들 수 있으므로, 101~108 P0 구간은 공식 PNG 기준 독립 mask recall/IoU/outside bleed를 release 판단에 사용합니다. S-301~S-335와 A/B/C/G/H/I/J/K 알파벳 표시 좌석은 공식 PNG 색상 coverage를 전수조사해 기존 polygon이 다른 layer나 흰 여백을 과도하게 삼키는지 별도 보고합니다.',
  '',
  '## P0 101~108',
  '',
  markdownTable(
    ['id', 'recall', 'IoU', 'outsideBleed', 'topHit', 'status', 'blockers'],
    p0Rows.map((row) => [
      row.id,
      row.officialBlockMaskRecall,
      row.componentIoU,
      row.outsideBleedRatio,
      row.topHitAtLabel,
      row.status,
      row.blockers.join('<br>'),
    ]),
  ),
  '',
  '## S-301~S-335 Full Scan',
  '',
  '`official-sky-picnic-color-scan`은 공식 PNG 원본 색상만 샘플링합니다. 기본 실행에서는 review-required로 보고만 하고, `--require-sky-picnic`을 붙이면 같은 결과를 차단 gate로 승격합니다.',
  '',
  markdownTable(
    ['id', 'colorCoverage', 'outsideBleed', 'topHit', 'status', 'warnings'],
    skyPicnicRows.map((row) => [
      row.id,
      row.skyPicnicColorCoverageRatio,
      row.outsideBleedRatio,
      row.topHitAtLabel,
      row.status,
      row.reviewWarnings.join('<br>'),
    ]),
  ),
  '',
  '## Alphabet Section Full Scan',
  '',
  '`official-alphabet-section-color-scan`은 선택 가능한 A/B/C/G/H/I/J/K 알파벳 좌석 polygon 내부가 공식 PNG의 해당 구역 색상을 충분히 덮는지 전수조사합니다. 기본 실행에서는 review-required로 보고만 하고, `--require-alphabet-sections`를 붙이면 같은 결과를 차단 gate로 승격합니다.',
  '',
  markdownTable(
    ['id', 'label', 'category', 'colorCoverage', 'outsideBleed', 'topHit', 'status', 'warnings'],
    alphabetSectionRows.map((row) => [
      row.id,
      row.shortLabel,
      row.category,
      row.alphabetSectionColorCoverageRatio,
      row.outsideBleedRatio,
      row.topHitAtLabel,
      row.status,
      row.reviewWarnings.join('<br>'),
    ]),
  ),
  '',
  '## Failures',
  '',
  failedRows.length === 0
    ? 'No image alignment failures.'
    : markdownTable(
      ['id', 'mode', 'recall', 'IoU', 'outsideBleed', 'blockers'],
      failedRows.map((row) => [
        row.id,
        row.auditMode,
        row.officialBlockMaskRecall,
        row.componentIoU,
        row.outsideBleedRatio,
        row.blockers.join('<br>'),
      ]),
    ),
  '',
  '## Artifacts',
  '',
  `- overlay: \`${path.relative(frontendRoot, overlayPath)}\``,
  ...CROP_REGIONS.map((region) => `- crop ${region.id}: \`${path.relative(frontendRoot, path.join(cropDir, `gwangju-seatmap-image-alignment-audit-${region.id}.png`))}\``),
  '',
  '## Source Policy',
  '',
  SOURCE_POLICY.disallowedSources.map((source) => `- forbidden: ${source}`).join('\n'),
  `- missing data contract: \`${SOURCE_POLICY.missingBaseballDataContract}\``,
].join('\n');
await fs.writeFile(markdownPath, `${markdown}\n`, 'utf8');

console.log(`image_alignment_audit_json:${jsonPath}`);
console.log(`image_alignment_audit_csv:${csvPath}`);
console.log(`image_alignment_audit_markdown:${markdownPath}`);
console.log(`image_alignment_audit_overlay:${overlayPath}`);
console.log(`status:${summary.status}`);

if (summary.status !== 'passed' && !allowFailures) {
  process.exitCode = 1;
}
