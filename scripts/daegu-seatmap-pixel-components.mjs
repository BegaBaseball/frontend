import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  DAEGU_BLOCKS,
  DAEGU_SEATMAP_IMAGE,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const imagePath = path.resolve(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath);
const reportPath = path.join(outDir, 'daegu-seatmap-pixel-components.json');

const round = (value, digits = 1) => Number(value.toFixed(digits));

const pathPoints = (pathData) => {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const geometryPaths = (block) => (
  block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d]
);

const pathBounds = (paths) => {
  const points = paths.flatMap(pathPoints);
  return {
    minX: Math.floor(Math.min(...points.map((point) => point[0]))),
    minY: Math.floor(Math.min(...points.map((point) => point[1]))),
    maxX: Math.ceil(Math.max(...points.map((point) => point[0]))),
    maxY: Math.ceil(Math.max(...points.map((point) => point[1]))),
  };
};

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

const pointInAnyPath = (point, polygons) => polygons.some((polygon) => pointInPolygon(point, polygon));

const convexHull = (points) => {
  const sorted = [...new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values()]
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

const hullPath = (hull) => {
  if (!Array.isArray(hull) || hull.length === 0) return '';
  return `M ${hull.map((point) => point.join(' ')).join(' L ')} Z`;
};

const pointKey = ([x, y]) => `${x},${y}`;
const pixelKey = (x, y) => `${x},${y}`;

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
      const sameX = previous[0] === current[0] && current[0] === next[0];
      const sameY = previous[1] === current[1] && current[1] === next[1];
      if (sameX || sameY) {
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
  const addEdge = (start, end) => {
    edges.push({ start, end });
  };

  for (const [x, y] of pixels) {
    if (!pixelSet.has(pixelKey(x, y - 1))) addEdge([x, y], [x + 1, y]);
    if (!pixelSet.has(pixelKey(x + 1, y))) addEdge([x + 1, y], [x + 1, y + 1]);
    if (!pixelSet.has(pixelKey(x, y + 1))) addEdge([x + 1, y + 1], [x, y + 1]);
    if (!pixelSet.has(pixelKey(x - 1, y))) addEdge([x, y + 1], [x, y]);
  }

  const edgesByStart = new Map();
  edges.forEach((edge, index) => {
    const key = pointKey(edge.start);
    const indexes = edgesByStart.get(key) ?? [];
    indexes.push(index);
    edgesByStart.set(key, indexes);
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

  return rings.sort((a, b) => b.length - a.length);
};

const ringPath = (ring) => {
  if (!Array.isArray(ring) || ring.length === 0) return '';
  return `M ${ring.map((point) => point.join(' ')).join(' L ')} Z`;
};

const ringsPath = (rings) => rings.map(ringPath).filter(Boolean).join(' ');

const ringArea = (ring) => {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    area += (current[0] * next[1]) - (next[0] * current[1]);
  }
  return Math.abs(area) / 2;
};

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const maxChannelDistance = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
const pixelOffset = (width, x, y) => ((y * width) + x) * 4;

const isIgnoredPixel = ([r, g, b, a]) => {
  if (a < 200) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  if (max < 35) return true;
  if (min > 232) return true;
  return avg > 222 && (max - min) < 38;
};

const quantize = ([r, g, b]) => [
  Math.round(r / 12) * 12,
  Math.round(g / 12) * 12,
  Math.round(b / 12) * 12,
].join(',');

const pickSeedColor = ({ data, width, height }, block) => {
  const labelX = Math.round(block.imageGeometry.labelX);
  const labelY = Math.round(block.imageGeometry.labelY);
  const clusters = new Map();
  const radius = 9;

  for (let y = Math.max(0, labelY - radius); y <= Math.min(height - 1, labelY + radius); y += 1) {
    for (let x = Math.max(0, labelX - radius); x <= Math.min(width - 1, labelX + radius); x += 1) {
      const offset = pixelOffset(width, x, y);
      const rgba = [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
      if (isIgnoredPixel(rgba)) continue;

      const key = quantize(rgba);
      const item = clusters.get(key) ?? {
        count: 0,
        sum: [0, 0, 0],
        nearestPoint: [x, y],
        nearestDistance: Infinity,
      };
      item.count += 1;
      item.sum[0] += rgba[0];
      item.sum[1] += rgba[1];
      item.sum[2] += rgba[2];
      const pointDistance = Math.hypot(x - labelX, y - labelY);
      if (pointDistance < item.nearestDistance) {
        item.nearestDistance = pointDistance;
        item.nearestPoint = [x, y];
      }
      clusters.set(key, item);
    }
  }

  const [best] = [...clusters.values()].sort((a, b) => b.count - a.count || a.nearestDistance - b.nearestDistance);
  if (!best) return null;

  return {
    color: best.sum.map((value) => Math.round(value / best.count)),
    point: best.nearestPoint,
    clusterPixelCount: best.count,
    clusterCount: clusters.size,
  };
};

const similarToSeed = (rgba, seedColor) => {
  if (isIgnoredPixel(rgba)) return false;
  const maxDelta = Math.max(seedColor[0], seedColor[1], seedColor[2]) - Math.min(seedColor[0], seedColor[1], seedColor[2]);
  const threshold = maxDelta < 28 ? 58 : 82;
  const channelThreshold = maxDelta < 28 ? 44 : 68;
  return distance(rgba, seedColor) <= threshold && maxChannelDistance(rgba, seedColor) <= channelThreshold;
};

const traceBlockCandidate = (image, block) => {
  const seed = pickSeedColor(image, block);
  if (!seed) {
    return {
      status: 'NO_SEED_COLOR',
      reason: 'No non-background official PNG pixel was found around the current label point.',
    };
  }

  const paths = geometryPaths(block);
  const bounds = pathBounds(paths);
  const padding = 28;
  const minX = Math.max(0, bounds.minX - padding);
  const minY = Math.max(0, bounds.minY - padding);
  const maxX = Math.min(image.width - 1, bounds.maxX + padding);
  const maxY = Math.min(image.height - 1, bounds.maxY + padding);
  const localWidth = maxX - minX + 1;
  const localHeight = maxY - minY + 1;
  const mask = new Uint8Array(localWidth * localHeight);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const offset = pixelOffset(image.width, x, y);
      const rgba = [image.data[offset], image.data[offset + 1], image.data[offset + 2], image.data[offset + 3]];
      if (similarToSeed(rgba, seed.color)) {
        mask[((y - minY) * localWidth) + (x - minX)] = 1;
      }
    }
  }

  let seedIndex = ((seed.point[1] - minY) * localWidth) + (seed.point[0] - minX);
  if (!mask[seedIndex]) {
    let bestIndex = -1;
    let bestDistance = Infinity;
    for (let index = 0; index < mask.length; index += 1) {
      if (!mask[index]) continue;
      const x = minX + (index % localWidth);
      const y = minY + Math.floor(index / localWidth);
      const seedDistance = Math.hypot(x - seed.point[0], y - seed.point[1]);
      if (seedDistance < bestDistance) {
        bestDistance = seedDistance;
        bestIndex = index;
      }
    }
    seedIndex = bestIndex;
  }

  if (seedIndex < 0) {
    return {
      status: 'NO_COMPONENT',
      seedColor: seed.color,
      seedPoint: seed.point,
      reason: 'No connected official PNG color component matched the seed color.',
    };
  }

  const seen = new Uint8Array(mask.length);
  const queue = [seedIndex];
  const pixels = [];
  const boundaryPoints = [];
  seen[seedIndex] = 1;
  let sumX = 0;
  let sumY = 0;
  let componentMinX = image.width;
  let componentMinY = image.height;
  let componentMaxX = 0;
  let componentMaxY = 0;

  while (queue.length > 0) {
    const current = queue.pop();
    const localX = current % localWidth;
    const localY = Math.floor(current / localWidth);
    const x = minX + localX;
    const y = minY + localY;
    pixels.push([x, y]);
    sumX += x;
    sumY += y;
    componentMinX = Math.min(componentMinX, x);
    componentMinY = Math.min(componentMinY, y);
    componentMaxX = Math.max(componentMaxX, x);
    componentMaxY = Math.max(componentMaxY, y);

    const neighbors = [
      localX > 0 ? current - 1 : -1,
      localX < localWidth - 1 ? current + 1 : -1,
      localY > 0 ? current - localWidth : -1,
      localY < localHeight - 1 ? current + localWidth : -1,
    ];
    if (neighbors.some((next) => next < 0 || !mask[next])) {
      boundaryPoints.push([x, y]);
    }
    for (const next of neighbors) {
      if (next < 0 || seen[next] || !mask[next]) continue;
      seen[next] = 1;
      queue.push(next);
    }
  }

  const polygons = paths.map(pathPoints);
  const componentInsidePath = pixels.filter((point) => pointInAnyPath(point, polygons)).length;
  let pathAreaPixels = 0;
  let pathSimilarPixels = 0;
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (!pointInAnyPath([x + 0.5, y + 0.5], polygons)) continue;
      pathAreaPixels += 1;
      const localX = x - minX;
      const localY = y - minY;
      if (localX >= 0 && localY >= 0 && localX < localWidth && localY < localHeight && mask[(localY * localWidth) + localX]) {
        pathSimilarPixels += 1;
      }
    }
  }

  const hull = convexHull(boundaryPoints);
  const boundaryRings = componentBoundaryRings(pixels);
  const [outerBoundaryRing = []] = [...boundaryRings].sort((a, b) => ringArea(b) - ringArea(a));
  const componentInsidePathRatio = pixels.length > 0 ? componentInsidePath / pixels.length : 0;
  const pathColorCoverageRatio = pathAreaPixels > 0 ? pathSimilarPixels / pathAreaPixels : 0;
  const status = pixels.length >= 24 && componentInsidePathRatio >= 0.65
    ? 'PIXEL_CANDIDATE_READY'
    : 'NEEDS_MANUAL_TRACE';

  return {
    status,
    seedColor: seed.color,
    seedPoint: seed.point,
    seedClusterPixelCount: seed.clusterPixelCount,
    seedClusterCount: seed.clusterCount,
    area: pixels.length,
    bbox: {
      minX: componentMinX,
      minY: componentMinY,
      maxX: componentMaxX,
      maxY: componentMaxY,
    },
    center: {
      x: round(sumX / pixels.length),
      y: round(sumY / pixels.length),
    },
    hull,
    hullPath: hullPath(hull),
    boundaryRings,
    boundaryPath: ringsPath(boundaryRings),
    boundaryPointCount: boundaryRings.reduce((total, ring) => total + ring.length, 0),
    outerBoundaryRing,
    outerBoundaryPath: ringPath(outerBoundaryRing),
    outerBoundaryPointCount: outerBoundaryRing.length,
    currentPathBounds: bounds,
    componentInsidePathRatio: round(componentInsidePathRatio, 3),
    pathColorCoverageRatio: round(pathColorCoverageRatio, 3),
    pathAreaPixels,
    pathSimilarPixels,
  };
};

const image = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const imageData = {
  width: image.info.width,
  height: image.info.height,
  data: image.data,
};

if (
  imageData.width !== DAEGU_SEATMAP_IMAGE.imageWidth
  || imageData.height !== DAEGU_SEATMAP_IMAGE.imageHeight
) {
  throw new Error(`Daegu image size mismatch: actual=${imageData.width}x${imageData.height} data=${DAEGU_SEATMAP_IMAGE.imageWidth}x${DAEGU_SEATMAP_IMAGE.imageHeight}`);
}

const blocks = DAEGU_BLOCKS.map((block) => ({
  id: block.id,
  block: block.block,
  name: block.name,
  category: block.category,
  sourceConfidence: block.sourceConfidence,
  traceStatus: block.traceStatus,
  traceMethod: block.traceMethod,
  reviewNote: block.reviewNote,
  labelX: block.imageGeometry.labelX,
  labelY: block.imageGeometry.labelY,
  shortLabel: block.imageGeometry.shortLabel,
  currentPath: block.imageGeometry.d,
  candidate: traceBlockCandidate(imageData, block),
}));

const summary = {
  totalBlocks: blocks.length,
  pixelCandidateReady: blocks.filter((block) => block.candidate.status === 'PIXEL_CANDIDATE_READY').length,
  needsManualTrace: blocks.filter((block) => block.candidate.status === 'NEEDS_MANUAL_TRACE').length,
  noSeedColor: blocks.filter((block) => block.candidate.status === 'NO_SEED_COLOR').length,
  noComponent: blocks.filter((block) => block.candidate.status === 'NO_COMPONENT').length,
  sourceConfidence: blocks.reduce((counts, block) => {
    counts[block.sourceConfidence] = (counts[block.sourceConfidence] ?? 0) + 1;
    return counts;
  }, {}),
};

const report = {
  generatedAt: new Date().toISOString(),
  asset: DAEGU_SEATMAP_IMAGE,
  image: {
    width: imageData.width,
    height: imageData.height,
    source: imagePath,
  },
  summary,
  blocks,
};

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`pixel_components:${reportPath}`);
console.log(`status:ok total=${summary.totalBlocks} candidates=${summary.pixelCandidateReady} review=${summary.needsManualTrace} noSeed=${summary.noSeedColor} noComponent=${summary.noComponent}`);
