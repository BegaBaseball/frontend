import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  GWANGJU_BLOCKS,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
  GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
  GWANGJU_OFFICIAL_TRACE_REFERENCE,
  GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_ZONE_PRECISION_WORKSETS,
} from '../src/data/gwangjuSeatData.ts';

const SCRIPT_VERSION = 'GWANGJU_IMAGE_TRACE_CANDIDATES_V1';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const defaultOutDir = path.join(repoRoot, 'output/playwright');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const cropDir = path.join(outDir, 'gwangju-seatmap-image-trace-candidates-crops');
const jsonPath = path.join(outDir, 'gwangju-seatmap-image-trace-candidates.json');
const csvPath = path.join(outDir, 'gwangju-seatmap-image-trace-candidates.csv');
const markdownPath = path.join(outDir, 'gwangju-seatmap-image-trace-candidates.md');
const overlayPath = path.join(outDir, 'gwangju-seatmap-image-trace-candidates-overlay.png');
const imagePath = path.resolve(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath);

const SEATMAP_BOUNDS = { minX: 250, maxX: 1370, minY: 90, maxY: 1090 };
const SOURCE_POLICY = {
  allowedCoordinateSource: 'official PNG 2200x1159 only',
  coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  disallowedSources: [
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
  ],
};

const PIXEL_GROUPS = [
  { id: 'k5', label: 'K5/K5-family salmon blocks', colors: [[243, 164, 144], [248, 196, 180]], threshold: 28, minArea: 80 },
  { id: 'k8', label: 'K7/K8 yellow blocks', colors: [[251, 203, 112], [251, 226, 160]], threshold: 26, minArea: 80 },
  { id: 'k9', label: 'K9 green blocks', colors: [[186, 216, 122], [206, 226, 160]], threshold: 26, minArea: 80 },
  { id: 'sky-picnic', label: 'Sky picnic pink blocks', colors: [[239, 146, 181], [244, 180, 208]], threshold: 28, minArea: 20 },
  { id: 'five-table', label: '5F table blue-gray blocks', colors: [[208, 214, 236], [222, 226, 241], [204, 207, 228]], threshold: 20, minArea: 70 },
  { id: 'champion', label: 'Champion seats', colors: [[79, 189, 176]], threshold: 28, minArea: 200 },
  { id: 'central-table', label: 'Central table seats', colors: [[148, 213, 246]], threshold: 30, minArea: 200 },
  { id: 'accessible-green', label: 'Accessible seats', colors: [[35, 172, 56]], threshold: 28, minArea: 120 },
  { id: 'surprise', label: 'Surprise seats', colors: [[243, 152, 0]], threshold: 28, minArea: 180 },
  { id: 'family', label: 'Tigers family seats', colors: [[238, 130, 124]], threshold: 30, minArea: 180 },
  { id: 'party', label: 'Party seats', colors: [[223, 127, 110]], threshold: 26, minArea: 80 },
  { id: 'skybox', label: 'Skybox', colors: [[225, 131, 172]], threshold: 28, minArea: 50 },
  { id: 'outfield', label: 'Outfield seats', colors: [[220, 234, 186]], threshold: 22, minArea: 300 },
  { id: 'bleachers-table', label: 'Bleachers table seats', colors: [[144, 195, 31]], threshold: 30, minArea: 100 },
];

const CATEGORY_GROUP_IDS = {
  K5: ['k5'],
  K7: ['k8'],
  K8: ['k8'],
  K9: ['k9'],
  SKY_PICNIC: ['sky-picnic'],
  FIVE_TABLE: ['five-table'],
  CHAMPION: ['champion'],
  CENTRAL_TABLE: ['central-table'],
  ACCESSIBLE: ['accessible-green'],
  SURPRISE: ['surprise'],
  FAMILY: ['family'],
  PARTY: ['party'],
  SKYBOX: ['skybox'],
  OUTFIELD: ['outfield'],
  BLEACHERS_TABLE: ['bleachers-table'],
};

const P2_BOUNDARY_WATCH_BLOCK_IDS = new Set([
  'k7-111',
  'k9-112',
  'k9-113',
  'k9-116',
  'k9-117',
  'k7-118',
  'k7-119',
  'k7-120',
  'k7-121',
  'k7-122',
]);
const P2_ROW_STRIPE_REFERENCE_AREA_RATIO = 0.45;
const P2_MERGED_COMPONENT_REFERENCES = {
  'k7-111': {
    componentGroupId: 'k8',
    componentIds: ['k8-85', 'k8-87', 'k8-94', 'k8-99', 'k8-104', 'k8-109', 'k8-114', 'k8-119', 'k8-125', 'k8-129', 'k8-133', 'k8-140', 'k8-145'],
  },
  'k9-112': {
    componentGroupId: 'k9',
    componentIds: ['k9-39', 'k9-41', 'k9-44', 'k9-46', 'k9-49', 'k9-51', 'k9-54', 'k9-56', 'k9-59', 'k9-61', 'k9-62', 'k9-63'],
  },
  'k9-113': {
    componentGroupId: 'k9',
    componentIds: ['k9-33', 'k9-34', 'k9-35', 'k9-36', 'k9-37', 'k9-38', 'k9-40', 'k9-42', 'k9-43', 'k9-45', 'k9-47', 'k9-48', 'k9-50', 'k9-52', 'k9-53', 'k9-55', 'k9-57', 'k9-58', 'k9-60'],
  },
  'k9-116': {
    componentGroupId: 'k9',
    componentIds: ['k9-15', 'k9-16', 'k9-17', 'k9-18', 'k9-19', 'k9-20', 'k9-21', 'k9-22', 'k9-23', 'k9-24', 'k9-25', 'k9-26', 'k9-27', 'k9-28', 'k9-29', 'k9-30', 'k9-31', 'k9-32'],
  },
  'k9-117': {
    componentGroupId: 'k9',
    componentIds: ['k9-1', 'k9-2', 'k9-3', 'k9-4', 'k9-5', 'k9-6', 'k9-7', 'k9-8', 'k9-9', 'k9-10', 'k9-11', 'k9-12', 'k9-13', 'k9-14'],
  },
  'k7-118': {
    componentGroupId: 'k8',
    componentIds: ['k8-71', 'k8-72', 'k8-73', 'k8-74', 'k8-75', 'k8-76', 'k8-77', 'k8-78', 'k8-79', 'k8-80', 'k8-81', 'k8-82', 'k8-83', 'k8-84'],
  },
  'k7-119': {
    componentGroupId: 'k8',
    componentIds: ['k8-56', 'k8-57', 'k8-58', 'k8-59', 'k8-60', 'k8-61', 'k8-62', 'k8-63', 'k8-64', 'k8-65', 'k8-66', 'k8-67', 'k8-68', 'k8-69', 'k8-70'],
  },
  'k7-120': {
    componentGroupId: 'k8',
    componentIds: ['k8-43', 'k8-44', 'k8-45', 'k8-46', 'k8-47', 'k8-48', 'k8-49', 'k8-50', 'k8-51', 'k8-52', 'k8-53', 'k8-54', 'k8-55'],
  },
};
const P2_MERGED_COMPONENT_RECALL_THRESHOLD = 0.96;
const P2_MERGED_COMPONENT_IOU_THRESHOLD = 0.35;
const P2_PRODUCTION_REVIEWED_CURRENT_PATH_BLOCK_IDS = new Set([
  'k7-121',
  'k7-122',
]);

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));
const pixelKey = (x, y) => `${x},${y}`;
const pointKey = ([x, y]) => `${x},${y}`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const colorDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const rgbAt = (image, x, y) => {
  const offset = ((y * image.width) + x) * image.channels;
  return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
};

const isGroupPixel = (image, group, x, y) => {
  const rgb = rgbAt(image, x, y);
  return group.colors.some((color) => colorDistance(rgb, color) <= group.threshold);
};

const pathSubpaths = (pathData) => {
  const matches = String(pathData ?? '').match(/M[^M]+/g) ?? [];
  return matches.map((subpath) => {
    const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  }).filter((points) => points.length >= 3);
};

const pointsBounds = (points) => ({
  minX: Math.floor(Math.min(...points.map((point) => point[0]))),
  minY: Math.floor(Math.min(...points.map((point) => point[1]))),
  maxX: Math.ceil(Math.max(...points.map((point) => point[0]))),
  maxY: Math.ceil(Math.max(...points.map((point) => point[1]))),
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

const pathBounds = (pathData) => {
  const subpaths = pathSubpaths(pathData);
  return unionBounds(subpaths.map(pointsBounds));
};

const pointInBounds = ([x, y], bounds) => (
  bounds
  && x >= bounds.minX
  && x <= bounds.maxX
  && y >= bounds.minY
  && y <= bounds.maxY
);

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

const pointInAnyRing = (point, rings) => rings.some((ring) => pointInPolygon(point, ring));

const polygonArea = (points) => {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    area += (x1 * y2) - (x2 * y1);
  }
  return area / 2;
};

const convexHull = (points) => {
  const sorted = [...new Map(points.map((point) => [pointKey(point), point])).values()]
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length <= 1) return sorted;

  const cross = (origin, a, b) => (
    (a[0] - origin[0]) * (b[1] - origin[1])
    - (a[1] - origin[1]) * (b[0] - origin[0])
  );
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
};

const simplifyOrthogonalRing = (points) => {
  if (points.length <= 3) return points;
  const openPoints = pointKey(points[0]) === pointKey(points[points.length - 1])
    ? points.slice(0, -1)
    : [...points];
  let changed = true;
  while (changed && openPoints.length > 3) {
    changed = false;
    for (let index = 0; index < openPoints.length; index += 1) {
      const previous = openPoints[(index - 1 + openPoints.length) % openPoints.length];
      const current = openPoints[index];
      const next = openPoints[(index + 1) % openPoints.length];
      if ((previous[0] === current[0] && current[0] === next[0])
        || (previous[1] === current[1] && current[1] === next[1])) {
        openPoints.splice(index, 1);
        changed = true;
        break;
      }
    }
  }
  return openPoints;
};

const componentBoundaryRings = (pixels) => {
  if (pixels.length === 0) return [];

  const pixelSet = new Set(pixels.map(([x, y]) => pixelKey(x, y)));
  const edges = [];
  const addEdge = (start, end) => edges.push({ start, end });

  for (const [x, y] of pixels) {
    if (!pixelSet.has(pixelKey(x, y - 1))) addEdge([x, y], [x + 1, y]);
    if (!pixelSet.has(pixelKey(x + 1, y))) addEdge([x + 1, y], [x + 1, y + 1]);
    if (!pixelSet.has(pixelKey(x, y + 1))) addEdge([x + 1, y + 1], [x, y + 1]);
    if (!pixelSet.has(pixelKey(x - 1, y))) addEdge([x, y + 1], [x, y]);
  }

  const edgesByStart = new Map();
  edges.forEach((edge, index) => {
    const indexes = edgesByStart.get(pointKey(edge.start)) ?? [];
    indexes.push(index);
    edgesByStart.set(pointKey(edge.start), indexes);
  });

  const used = new Uint8Array(edges.length);
  const rings = [];

  for (let index = 0; index < edges.length; index += 1) {
    if (used[index]) continue;
    const first = edges[index];
    const ring = [first.start];
    let currentEnd = first.end;
    used[index] = 1;

    while (pointKey(currentEnd) !== pointKey(ring[0])) {
      ring.push(currentEnd);
      const candidates = edgesByStart.get(pointKey(currentEnd)) ?? [];
      const nextIndex = candidates.find((candidateIndex) => !used[candidateIndex]);
      if (nextIndex === undefined) break;
      used[nextIndex] = 1;
      currentEnd = edges[nextIndex].end;
    }

    if (pointKey(currentEnd) === pointKey(ring[0]) && ring.length >= 4) {
      rings.push(simplifyOrthogonalRing(ring));
    }
  }

  return rings.sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)));
};

const ringPath = (ring) => {
  if (!Array.isArray(ring) || ring.length === 0) return '';
  return `M ${ring.map((point) => point.join(' ')).join(' L ')} Z`;
};

const ringsPath = (rings) => rings.map(ringPath).filter(Boolean).join(' ');

const ensureComponentRings = (component) => {
  if (!component.rings) component.rings = componentBoundaryRings(component.pixels);
  return component.rings;
};

const extractComponents = (image, group) => {
  const bounds = group.bounds ?? SEATMAP_BOUNDS;
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const mask = new Uint8Array(width * height);
  const seen = new Uint8Array(width * height);

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (isGroupPixel(image, group, x, y)) {
        mask[((y - bounds.minY) * width) + (x - bounds.minX)] = 1;
      }
    }
  }

  const components = [];
  const queue = [];
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const startIndex = ((y - bounds.minY) * width) + (x - bounds.minX);
      if (!mask[startIndex] || seen[startIndex]) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      const pixels = [];
      seen[startIndex] = 1;
      queue.length = 0;
      queue.push(startIndex);

      for (let head = 0; head < queue.length; head += 1) {
        const localIndex = queue[head];
        const cx = bounds.minX + (localIndex % width);
        const cy = bounds.minY + Math.floor(localIndex / width);
        pixels.push([cx, cy]);
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        for (const [dx, dy] of directions) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < bounds.minX || nx > bounds.maxX || ny < bounds.minY || ny > bounds.maxY) continue;
          const index = ((ny - bounds.minY) * width) + (nx - bounds.minX);
          if (!mask[index] || seen[index]) continue;
          seen[index] = 1;
          queue.push(index);
        }
      }

      const area = pixels.length;
      if (area >= group.minArea && area <= (group.maxArea ?? Infinity)) {
        components.push({
          id: `${group.id}-${components.length + 1}`,
          groupId: group.id,
          groupLabel: group.label,
          area,
          bounds: { minX, minY, maxX, maxY },
          center: {
            x: round((minX + maxX) / 2, 1),
            y: round((minY + maxY) / 2, 1),
          },
          pixels,
        });
      }
    }
  }

  return components.sort((a, b) => a.bounds.minY - b.bounds.minY || a.bounds.minX - b.bounds.minX);
};

const buildComponentIndex = (image) => {
  const groups = PIXEL_GROUPS.map((group) => ({
    ...group,
    components: extractComponents(image, group),
  }));
  const byGroup = new Map(groups.map((group) => [group.id, group.components]));
  const byId = new Map(groups.flatMap((group) => group.components.map((component) => [component.id, component])));
  return { groups, byGroup, byId };
};

const componentPixelSet = (components) => new Set(components.flatMap((component) => (
  component.pixels.map(([x, y]) => pixelKey(x, y))
)));

const candidateComponentCoverage = (rings, components) => {
  const bounds = unionBounds([
    unionBounds(rings.map(pointsBounds)),
    unionBounds(components.map((component) => component.bounds)),
  ]);
  if (!bounds || rings.length === 0 || components.length === 0) {
    return {
      componentPixels: 0,
      candidatePixels: 0,
      intersectionPixels: 0,
      officialComponentRecall: 0,
      componentIoU: 0,
    };
  }

  const componentPixels = componentPixelSet(components);
  let candidatePixels = 0;
  let intersectionPixels = 0;

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (!pointInAnyRing([x + 0.5, y + 0.5], rings)) continue;
      candidatePixels += 1;
      if (componentPixels.has(pixelKey(x, y))) intersectionPixels += 1;
    }
  }

  const componentPixelCount = componentPixels.size;
  const unionPixelCount = candidatePixels + componentPixelCount - intersectionPixels;
  return {
    componentPixels: componentPixelCount,
    candidatePixels,
    intersectionPixels,
    officialComponentRecall: componentPixelCount > 0 ? round(intersectionPixels / componentPixelCount) : 0,
    componentIoU: unionPixelCount > 0 ? round(intersectionPixels / unionPixelCount) : 0,
  };
};

const blockWorksetIds = new Map();
for (const workset of GWANGJU_ZONE_PRECISION_WORKSETS) {
  for (const blockId of workset.blockIds) {
    const ids = blockWorksetIds.get(blockId) ?? [];
    ids.push(workset.id);
    blockWorksetIds.set(blockId, ids);
  }
}

const labelPoint = (block) => [block.imageGeometry.labelX, block.imageGeometry.labelY];

const boundsOverlap = (a, b) => (
  a
  && b
  && a.minX <= b.maxX
  && a.maxX >= b.minX
  && a.minY <= b.maxY
  && a.maxY >= b.minY
);

const labelsInsideRings = (rings, targetBlockId) => GWANGJU_BLOCKS
  .filter((block) => block.id !== targetBlockId)
  .filter((block) => pointInAnyRing(labelPoint(block), rings))
  .map((block) => block.id);

const bestRingForComponent = (component) => {
  const [ring] = ensureComponentRings(component);
  return ring ?? null;
};

const clippedComponent = (component, clipBounds) => {
  if (!clipBounds) return component;
  const pixels = component.pixels.filter(([x, y]) => (
    x >= clipBounds.minX
    && x <= clipBounds.maxX
    && y >= clipBounds.minY
    && y <= clipBounds.maxY
  ));
  if (pixels.length === 0) {
    return {
      ...component,
      area: 0,
      bounds: null,
      center: null,
      pixels,
      rings: [],
    };
  }
  const bounds = pointsBounds(pixels);
  return {
    ...component,
    area: pixels.length,
    bounds,
    center: {
      x: round((bounds.minX + bounds.maxX) / 2, 1),
      y: round((bounds.minY + bounds.maxY) / 2, 1),
    },
    pixels,
    rings: undefined,
  };
};

const explicitComponentCandidate = (block, componentIndex) => {
  const reference = GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES[block.id];
  if (!reference) return null;
  const components = reference.componentIds
    .map((componentId) => componentIndex.byId.get(componentId))
    .filter(Boolean)
    .map((component) => clippedComponent(component, reference.expectedBounds))
    .filter((component) => component.area > 0);
  const missingComponentIds = reference.componentIds.filter((componentId) => !componentIndex.byId.has(componentId));
  const rings = components.map(bestRingForComponent).filter(Boolean);
  return {
    mode: 'official-component-reference',
    expectedComponentIds: reference.componentIds,
    missingComponentIds,
    components,
    rings,
    reference,
  };
};

const mergedComponentHullCandidate = (block, componentIndex) => {
  const reference = P2_MERGED_COMPONENT_REFERENCES[block.id];
  if (!reference) return null;
  const components = reference.componentIds
    .map((componentId) => componentIndex.byId.get(componentId))
    .filter(Boolean);
  const missingComponentIds = reference.componentIds.filter((componentId) => !componentIndex.byId.has(componentId));
  const hullInputPoints = [];
  for (const component of components) {
    for (const [x, y] of component.pixels) {
      hullInputPoints.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]);
    }
  }
  const hull = simplifyOrthogonalRing(convexHull(hullInputPoints));
  return {
    mode: 'p2-merged-official-components',
    allowedGroupIds: [reference.componentGroupId],
    expectedComponentIds: reference.componentIds,
    missingComponentIds,
    components,
    rings: hull.length >= 3 ? [hull] : [],
    reference,
  };
};

const labelMatchedComponentCandidate = (block, componentIndex) => {
  const groupIds = CATEGORY_GROUP_IDS[block.category] ?? [];
  const label = labelPoint(block);
  const matches = [];

  for (const groupId of groupIds) {
    for (const component of componentIndex.byGroup.get(groupId) ?? []) {
      if (!pointInBounds(label, component.bounds)) continue;
      const ring = bestRingForComponent(component);
      if (!ring || !pointInPolygon(label, ring)) continue;
      matches.push({ groupId, component, ring });
    }
  }

  const sorted = matches.sort((a, b) => (
    a.component.area - b.component.area
    || a.component.bounds.minY - b.component.bounds.minY
    || a.component.bounds.minX - b.component.bounds.minX
  ));
  const best = sorted[0] ?? null;
  return {
    mode: 'label-anchor-component',
    allowedGroupIds: groupIds,
    candidateMatches: matches.length,
    components: best ? [best.component] : [],
    rings: best ? [best.ring] : [],
    allMatchedComponentIds: sorted.map((match) => match.component.id),
  };
};

const currentPathComponentHullCandidate = (block, componentIndex) => {
  const groupIds = CATEGORY_GROUP_IDS[block.category] ?? [];
  const currentRings = pathSubpaths(block.imageGeometry.d);
  const currentBounds = pathBounds(block.imageGeometry.d);
  const selected = [];

  for (const groupId of groupIds) {
    for (const component of componentIndex.byGroup.get(groupId) ?? []) {
      if (!boundsOverlap(currentBounds, component.bounds)) continue;
      let insidePixels = 0;
      for (const [x, y] of component.pixels) {
        if (pointInAnyRing([x + 0.5, y + 0.5], currentRings)) insidePixels += 1;
      }
      if (insidePixels < Math.max(8, Math.min(40, component.area * 0.08))) continue;
      selected.push({
        component,
        insidePixels,
        insideRatio: insidePixels / component.area,
      });
    }
  }

  if (selected.length === 0) {
    return {
      mode: 'current-path-component-hull',
      allowedGroupIds: groupIds,
      components: [],
      rings: [],
      selectedComponentCount: 0,
      allMatchedComponentIds: [],
    };
  }

  const hullInputPoints = [];
  for (const { component } of selected) {
    for (const [x, y] of component.pixels) {
      if (!pointInAnyRing([x + 0.5, y + 0.5], currentRings)) continue;
      hullInputPoints.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]);
    }
  }

  const hull = simplifyOrthogonalRing(convexHull(hullInputPoints));
  return {
    mode: 'current-path-component-hull',
    allowedGroupIds: groupIds,
    components: selected.map((item) => item.component),
    rings: hull.length >= 3 ? [hull] : [],
    selectedComponentCount: selected.length,
    allMatchedComponentIds: selected.map((item) => item.component.id),
  };
};

const boundsDelta = (a, b) => {
  if (!a || !b) return null;
  return {
    minX: round(a.minX - b.minX, 1),
    minY: round(a.minY - b.minY, 1),
    maxX: round(a.maxX - b.maxX, 1),
    maxY: round(a.maxY - b.maxY, 1),
  };
};

const maxAbsBoundsDelta = (delta) => {
  if (!delta) return null;
  return Math.max(...Object.values(delta).map((value) => Math.abs(value)));
};

const boundsArea = (bounds) => (
  bounds
    ? Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY)
    : 0
);

const blockCandidate = (block, componentIndex) => {
  const p2MergedCandidate = mergedComponentHullCandidate(block, componentIndex);
  const explicitCandidate = p2MergedCandidate ?? explicitComponentCandidate(block, componentIndex);
  const labelCandidate = explicitCandidate ?? labelMatchedComponentCandidate(block, componentIndex);
  const fallbackCandidate = !explicitCandidate && labelCandidate.components.length === 0
    ? currentPathComponentHullCandidate(block, componentIndex)
    : null;
  const resolvedCandidate = explicitCandidate
    ?? (labelCandidate.components.length > 0 ? labelCandidate : fallbackCandidate ?? labelCandidate);
  const rings = resolvedCandidate.rings;
  const components = resolvedCandidate.components;
  const candidatePath = ringsPath(rings);
  const currentBounds = pathBounds(block.imageGeometry.d);
  const candidateBounds = rings.length > 0 ? unionBounds(rings.map(pointsBounds)) : null;
  const reference = GWANGJU_OFFICIAL_TRACE_REFERENCE[block.id] ?? null;
  const expectedBounds = reference?.expectedBounds ?? null;
  const candidateReferenceAreaRatio = boundsArea(expectedBounds) > 0
    ? round(boundsArea(candidateBounds) / boundsArea(expectedBounds))
    : null;
  const p2ProductionReviewedCurrentPath = P2_PRODUCTION_REVIEWED_CURRENT_PATH_BLOCK_IDS.has(block.id)
    && resolvedCandidate.mode === 'current-path-component-hull'
    && candidateReferenceAreaRatio === 1;
  const label = labelPoint(block);
  const warnings = [];

  if ((CATEGORY_GROUP_IDS[block.category] ?? []).length === 0 && !explicitCandidate) warnings.push('NO_COLOR_GROUP_MAPPING');
  if (explicitCandidate?.missingComponentIds?.length > 0) warnings.push(`MISSING_REFERENCE_COMPONENT:${explicitCandidate.missingComponentIds.join(',')}`);
  if (!candidatePath) warnings.push('NO_OFFICIAL_IMAGE_COMPONENT_CANDIDATE');
  if (!explicitCandidate && labelCandidate.candidateMatches === 0 && resolvedCandidate.mode !== 'current-path-component-hull') warnings.push('NO_COMPONENT_CONTAINS_LABEL_ANCHOR');
  if (!explicitCandidate && labelCandidate.candidateMatches > 1) warnings.push(`MULTIPLE_COMPONENTS_CONTAIN_LABEL:${labelCandidate.allMatchedComponentIds.join(',')}`);
  if (resolvedCandidate.mode === 'current-path-component-hull' && !p2ProductionReviewedCurrentPath) {
    warnings.push('CURRENT_PATH_USED_FOR_COMPONENT_OWNERSHIP_HINT');
  }
  if (P2_BOUNDARY_WATCH_BLOCK_IDS.has(block.id)
    && !explicitCandidate
    && resolvedCandidate.mode === 'current-path-component-hull'
    && !p2ProductionReviewedCurrentPath) {
    warnings.push('P2_COMPONENT_OWNERSHIP_REQUIRES_MANUAL_REVIEW');
  }
  if (P2_BOUNDARY_WATCH_BLOCK_IDS.has(block.id)
    && !explicitCandidate
    && resolvedCandidate.mode === 'label-anchor-component'
    && candidateReferenceAreaRatio !== null
    && candidateReferenceAreaRatio < P2_ROW_STRIPE_REFERENCE_AREA_RATIO) {
    warnings.push(`P2_LABEL_COMPONENT_IS_ROW_STRIPE_ONLY:${candidateReferenceAreaRatio}`);
  }

  const siblingLabelsInside = candidatePath ? labelsInsideRings(rings, block.id) : [];
  if (siblingLabelsInside.length > 0) warnings.push(`MULTIPLE_LABEL_ANCHORS_IN_COMPONENT:${siblingLabelsInside.join(',')}`);

  const labelInsideCandidate = candidatePath ? pointInAnyRing(label, rings) : false;
  if (candidatePath && !labelInsideCandidate) warnings.push('LABEL_OUTSIDE_CANDIDATE_PATH');

  const coverage = candidateComponentCoverage(rings, components);
  if (candidatePath && p2MergedCandidate && coverage.officialComponentRecall < P2_MERGED_COMPONENT_RECALL_THRESHOLD) {
    warnings.push(`LOW_P2_MERGED_COMPONENT_RECALL:${coverage.officialComponentRecall}`);
  } else if (candidatePath && !p2MergedCandidate && !p2ProductionReviewedCurrentPath && coverage.officialComponentRecall < 0.9) {
    warnings.push(`LOW_COMPONENT_RECALL:${coverage.officialComponentRecall}`);
  }
  if (candidatePath && p2MergedCandidate && coverage.componentIoU < P2_MERGED_COMPONENT_IOU_THRESHOLD) {
    warnings.push(`LOW_P2_MERGED_COMPONENT_IOU:${coverage.componentIoU}`);
  } else if (candidatePath && !p2MergedCandidate && !p2ProductionReviewedCurrentPath && coverage.componentIoU < 0.86) {
    warnings.push(`LOW_COMPONENT_IOU:${coverage.componentIoU}`);
  }

  const candidateStatus = warnings.length === 0 ? 'auto-candidate' : 'manual-review';
  const currentPointCount = pathSubpaths(block.imageGeometry.d).reduce((total, points) => total + points.length, 0);
  const candidatePointCount = rings.reduce((total, ring) => total + ring.length, 0);

  return {
    id: block.id,
    category: block.category,
    block: block.block,
    name: block.name,
    worksetIds: blockWorksetIds.get(block.id) ?? [],
    status: candidateStatus,
    requiresManualReview: candidateStatus !== 'auto-candidate',
    mode: resolvedCandidate.mode,
    sourcePolicy: SOURCE_POLICY.allowedCoordinateSource,
    doesNotModifyDataFile: true,
    p2ProductionReviewedCurrentPath,
    candidatePath,
    currentPath: block.imageGeometry.d,
    shortLabel: block.imageGeometry.shortLabel,
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    labelInsideCandidate,
    allowedGroupIds: resolvedCandidate.allowedGroupIds ?? [resolvedCandidate.reference?.componentGroupId].filter(Boolean),
    componentIds: components.map((component) => component.id),
    matchedComponentCount: components.length,
    candidateSubpathCount: rings.length,
    currentSubpathCount: pathSubpaths(block.imageGeometry.d).length,
    expectedSubpathCount: reference?.expectedSubpathCount ?? null,
    currentPointCount,
    candidatePointCount,
    pointCountDelta: candidatePointCount - currentPointCount,
    currentBounds,
    candidateBounds,
    expectedBounds,
    candidateVsCurrentBoundsDelta: boundsDelta(candidateBounds, currentBounds),
    candidateVsReferenceBoundsDelta: boundsDelta(candidateBounds, expectedBounds),
    candidateVsCurrentMaxAbsBoundsDelta: maxAbsBoundsDelta(boundsDelta(candidateBounds, currentBounds)),
    candidateVsReferenceMaxAbsBoundsDelta: maxAbsBoundsDelta(boundsDelta(candidateBounds, expectedBounds)),
    candidateReferenceAreaRatio,
    componentBounds: unionBounds(components.map((component) => component.bounds)),
    componentArea: components.reduce((total, component) => total + component.area, 0),
    ...coverage,
    siblingLabelsInside,
    warnings,
  };
};

const svgEscape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const svgPath = (d, stroke, fill, strokeWidth = 2, opacity = 1) => (
  d
    ? `<path d="${svgEscape(d)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" vector-effect="non-scaling-stroke"/>`
    : ''
);

const candidateStroke = (row) => (row.status === 'auto-candidate' ? '#00a846' : '#f97316');

const fullOverlaySvg = (rows, width, height) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g>
    ${rows.map((row) => svgPath(row.currentPath, '#2563eb', 'rgba(37,99,235,0.10)', 1.2, 0.55)).join('\n')}
  </g>
  <g>
    ${rows.map((row) => svgPath(row.candidatePath, candidateStroke(row), row.status === 'auto-candidate' ? 'rgba(0,168,70,0.16)' : 'rgba(249,115,22,0.18)', 2.2, 0.9)).join('\n')}
  </g>
  <g font-family="Arial, sans-serif" font-size="10" font-weight="700">
    ${rows.map((row) => `<text x="${row.labelX}" y="${row.labelY}" text-anchor="middle" dominant-baseline="middle" fill="#111827" stroke="#fff" stroke-width="2" paint-order="stroke">${svgEscape(row.shortLabel)}</text>`).join('\n')}
  </g>
</svg>`;

const cropBoundsFor = (row, width, height) => {
  const bounds = unionBounds([row.currentBounds, row.candidateBounds, row.componentBounds]);
  if (!bounds) return null;
  const padding = 28;
  const left = clamp(Math.floor(bounds.minX - padding), 0, width - 1);
  const top = clamp(Math.floor(bounds.minY - padding), 0, height - 1);
  const right = clamp(Math.ceil(bounds.maxX + padding), left + 1, width);
  const bottom = clamp(Math.ceil(bounds.maxY + padding), top + 1, height);
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
};

const cropOverlaySvg = (row, crop) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}">
  <rect x="0" y="0" width="${crop.width}" height="${crop.height}" fill="rgba(255,255,255,0)"/>
  <g transform="translate(${-crop.left} ${-crop.top})">
    ${svgPath(row.currentPath, '#2563eb', 'rgba(37,99,235,0.14)', 2, 0.65)}
    ${svgPath(row.candidatePath, candidateStroke(row), row.status === 'auto-candidate' ? 'rgba(0,168,70,0.22)' : 'rgba(249,115,22,0.24)', 2.5, 0.95)}
    <circle cx="${row.labelX}" cy="${row.labelY}" r="4" fill="#111827" stroke="#fff" stroke-width="2"/>
  </g>
  <text x="8" y="16" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#111827" stroke="#fff" stroke-width="2" paint-order="stroke">${svgEscape(row.id)} / ${svgEscape(row.status)}</text>
</svg>`;

const writeCrop = async (row, width, height) => {
  const crop = cropBoundsFor(row, width, height);
  if (!crop) return null;
  const cropPath = path.join(cropDir, `${row.id}.png`);
  await sharp(imagePath)
    .extract(crop)
    .composite([{ input: Buffer.from(cropOverlaySvg(row, crop)), top: 0, left: 0 }])
    .png()
    .toFile(cropPath);
  return path.relative(outDir, cropPath);
};

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
};

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const markdownValue = (value) => (
  value && typeof value === 'object'
    ? `\`${JSON.stringify(value)}\``
    : `\`${value}\``
);

const hashRows = (rows) => {
  const counts = new Map();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
};

const writeReports = async (report, rows, image) => {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(cropDir, { recursive: true });

  const rowsWithCrops = [];
  for (const row of rows) {
    rowsWithCrops.push({
      ...row,
      cropArtifact: await writeCrop(row, image.width, image.height),
    });
  }

  const reportWithCrops = {
    ...report,
    rows: rowsWithCrops,
  };

  await fs.writeFile(jsonPath, `${JSON.stringify(reportWithCrops, null, 2)}\n`, 'utf8');

  const csvHeaders = [
    'id',
    'category',
    'status',
    'mode',
    'worksetIds',
    'componentIds',
    'candidateSubpathCount',
    'candidatePointCount',
    'currentPointCount',
    'pointCountDelta',
    'officialComponentRecall',
    'componentIoU',
    'candidateVsReferenceMaxAbsBoundsDelta',
    'candidateVsCurrentMaxAbsBoundsDelta',
    'warnings',
    'cropArtifact',
  ];
  await fs.writeFile(csvPath, [
    csvHeaders.join(','),
    ...rowsWithCrops.map((row) => csvHeaders.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n'), 'utf8');

  const previewRows = rowsWithCrops
    .slice()
    .sort((a, b) => Number(b.requiresManualReview) - Number(a.requiresManualReview) || b.warnings.length - a.warnings.length || a.id.localeCompare(b.id))
    .slice(0, 30)
    .map((row) => [
      `\`${row.id}\``,
      `\`${row.category}\``,
      `\`${row.status}\``,
      `\`${row.mode}\``,
      `\`${row.componentIds.join(',') || '-'}\``,
      `\`${row.officialComponentRecall}\``,
      `\`${row.componentIoU}\``,
      row.warnings.length > 0 ? row.warnings.map((warning) => `\`${warning}\``).join('<br>') : '-',
    ]);

  const markdown = [
    '# 광주 공식 PNG 이미지 트레이싱 후보',
    '',
    `- version: \`${SCRIPT_VERSION}\``,
    `- generatedAt: \`${report.generatedAt}\``,
    `- official image: \`${GWANGJU_SEATMAP_IMAGE.imagePath}\``,
    `- coordinate source: \`${SOURCE_POLICY.allowedCoordinateSource}\``,
    `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
    `- candidate rows: \`${rowsWithCrops.length}\``,
    `- expected active trace blocks: \`${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}\``,
    `- derived K7/AWAY aggregate mode: \`${report.derivedOperatorAggregateMode}\``,
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.summary).map(([key, value]) => [key, markdownValue(value)]),
    ),
    '',
    '## Source Policy',
    '',
    `- allowed: \`${SOURCE_POLICY.allowedCoordinateSource}\``,
    ...SOURCE_POLICY.disallowedSources.map((source) => `- disallowed: \`${source}\``),
    `- missing baseball data: \`${SOURCE_POLICY.missingBaseballDataContract}\``,
    '',
    '## Artifacts',
    '',
    `- JSON: \`${path.relative(frontendRoot, jsonPath)}\``,
    `- CSV: \`${path.relative(frontendRoot, csvPath)}\``,
    `- overlay: \`${path.relative(frontendRoot, overlayPath)}\``,
    `- crops: \`${path.relative(frontendRoot, cropDir)}\``,
    '',
    '## Review Rows',
    '',
    markdownTable(
      ['id', 'category', 'status', 'mode', 'components', 'recall', 'IoU', 'warnings'],
      previewRows,
    ),
  ].join('\n');
  await fs.writeFile(markdownPath, `${markdown}\n`, 'utf8');

  await sharp(imagePath)
    .composite([{ input: Buffer.from(fullOverlaySvg(rowsWithCrops, image.width, image.height)), top: 0, left: 0 }])
    .png()
    .toFile(overlayPath);

  return reportWithCrops;
};

const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const image = { data, width: info.width, height: info.height, channels: info.channels };

if (image.width !== GWANGJU_SEATMAP_IMAGE.imageWidth || image.height !== GWANGJU_SEATMAP_IMAGE.imageHeight) {
  throw new Error(`Official image size mismatch: expected ${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}, got ${image.width}x${image.height}`);
}

const componentIndex = buildComponentIndex(image);
const rows = GWANGJU_BLOCKS.map((block) => blockCandidate(block, componentIndex));
const statusCounts = hashRows(rows);
const manualReviewRows = rows.filter((row) => row.requiresManualReview);
const opRows = rows.filter((row) => ['outfield-left-seats', 'outfield-right-seats', 'bleachers-table-left', 'bleachers-table-right'].includes(row.id));
const p2BoundaryRows = rows.filter((row) => P2_BOUNDARY_WATCH_BLOCK_IDS.has(row.id));

const report = {
  version: SCRIPT_VERSION,
  generatedAt: new Date().toISOString(),
  doesNotModifyDataFile: true,
  writesOnlyArtifacts: true,
  sourcePolicy: SOURCE_POLICY,
  image: {
    path: GWANGJU_SEATMAP_IMAGE.imagePath,
    width: image.width,
    height: image.height,
    requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
  },
  extractionBounds: SEATMAP_BOUNDS,
  componentGroups: componentIndex.groups.map((group) => ({
    id: group.id,
    label: group.label,
    threshold: group.threshold,
    minArea: group.minArea,
    componentCount: group.components.length,
    components: group.components.map((component) => ({
      id: component.id,
      area: component.area,
      bounds: component.bounds,
      center: component.center,
    })),
  })),
  expectedActiveTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
  actualCandidateRows: rows.length,
  derivedOperatorAggregateMode: GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.every((range) => range.aggregateHitArea === 'REUSES_EXISTING_TRACE_ONLY')
    ? 'REUSES_EXISTING_TRACE_ONLY'
    : 'UNEXPECTED_AGGREGATE_HIT_AREA',
  zonePrecisionWorksets: GWANGJU_ZONE_PRECISION_WORKSETS.map((workset) => ({
    id: workset.id,
    priority: workset.priority,
    blockCount: workset.blockIds.length,
    acceptanceFocus: workset.acceptanceFocus,
  })),
  opComponentRows: opRows.map((row) => ({
    id: row.id,
    componentIds: row.componentIds,
    officialComponentRecall: row.officialComponentRecall,
    componentIoU: row.componentIoU,
    status: row.status,
    warnings: row.warnings,
  })),
  p2BoundaryWatchRows: p2BoundaryRows.map((row) => ({
    id: row.id,
    status: row.status,
    mode: row.mode,
    p2ProductionReviewedCurrentPath: row.p2ProductionReviewedCurrentPath,
    candidateReferenceAreaRatio: row.candidateReferenceAreaRatio,
    officialComponentRecall: row.officialComponentRecall,
    componentIoU: row.componentIoU,
    warnings: row.warnings,
  })),
  summary: {
    candidateRows: rows.length,
    expectedActiveTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    autoCandidateRows: rows.filter((row) => row.status === 'auto-candidate').length,
    manualReviewRows: manualReviewRows.length,
    missingCandidateRows: rows.filter((row) => row.warnings.some((warning) => warning.includes('NO_OFFICIAL_IMAGE_COMPONENT_CANDIDATE'))).length,
    labelOutsideCandidateRows: rows.filter((row) => row.warnings.includes('LABEL_OUTSIDE_CANDIDATE_PATH')).length,
    multiLabelRows: rows.filter((row) => row.warnings.some((warning) => warning.startsWith('MULTIPLE_LABEL_ANCHORS_IN_COMPONENT'))).length,
    opComponentRows: opRows.length,
    opComponentAutoCandidateRows: opRows.filter((row) => row.status === 'auto-candidate').length,
    p2BoundaryWatchRows: p2BoundaryRows.length,
    p2ProductionReviewedCurrentPathRows: p2BoundaryRows.filter((row) => row.p2ProductionReviewedCurrentPath).length,
    p2BoundaryManualReviewRows: p2BoundaryRows.filter((row) => row.requiresManualReview).length,
    p2RowStripeOnlyRows: p2BoundaryRows.filter((row) => row.warnings.some((warning) => warning.startsWith('P2_LABEL_COMPONENT_IS_ROW_STRIPE_ONLY'))).length,
    statusCounts,
  },
};

const writtenReport = await writeReports(report, rows, image);

console.log(`image_trace_candidates_json:${jsonPath}`);
console.log(`image_trace_candidates_csv:${csvPath}`);
console.log(`image_trace_candidates_markdown:${markdownPath}`);
console.log(`image_trace_candidates_overlay:${overlayPath}`);
console.log(`statusCounts:${JSON.stringify(writtenReport.summary.statusCounts)}`);
