import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_SEATMAP_IMAGE,
} from '../src/data/sajikSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const imagePath = path.resolve(frontendRoot, SAJIK_SEATMAP_IMAGE.imagePath);
const reportPath = path.join(outDir, 'sajik-seatmap-pixel-components.json');

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

const pathPoints = (pathData) => {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const pathBounds = (pathData) => {
  const points = pathPoints(pathData);
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

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const maxChannelDistance = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
const pixelOffset = (width, x, y) => ((y * width) + x) * 4;
const pixelKey = (x, y) => `${x},${y}`;
const pointKey = ([x, y]) => `${x},${y}`;

const parseHexColor = (value) => {
  const hex = String(value ?? '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
};

const isIgnoredPixel = ([r, g, b, a]) => {
  if (a < 200) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  if (max < 20) return true;
  if (g > 145 && r < 180 && b < 100) return true;
  if (min > 236) return true;
  if (avg > 222 && (max - min) < 42) return true;
  if (avg > 70 && (max - min) < 16) return true;
  return false;
};

const quantize = ([r, g, b]) => [
  Math.round(r / 10) * 10,
  Math.round(g / 10) * 10,
  Math.round(b / 10) * 10,
].join(',');

const collectSeedClusters = ({ data, width, height }, block, mode) => {
  const labelX = Math.round(block.imageGeometry.labelX);
  const labelY = Math.round(block.imageGeometry.labelY);
  const categoryColor = parseHexColor(SAJIK_CATEGORIES[block.category]?.light);
  const clusters = new Map();
  const radius = 18;
  const polygon = pathPoints(block.imageGeometry.d);
  const bounds = pathBounds(block.imageGeometry.d);

  const minX = mode === 'path' ? Math.max(0, bounds.minX) : Math.max(0, labelX - radius);
  const minY = mode === 'path' ? Math.max(0, bounds.minY) : Math.max(0, labelY - radius);
  const maxX = mode === 'path' ? Math.min(width - 1, bounds.maxX) : Math.min(width - 1, labelX + radius);
  const maxY = mode === 'path' ? Math.min(height - 1, bounds.maxY) : Math.min(height - 1, labelY + radius);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (mode === 'path' && !pointInPolygon([x + 0.5, y + 0.5], polygon)) continue;
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

  return [...clusters.values()].map((cluster) => {
    const color = cluster.sum.map((value) => Math.round(value / cluster.count));
    const categoryDistance = categoryColor ? distance(color, categoryColor) : 0;
    return {
      ...cluster,
      color,
      categoryDistance,
      mode,
      score: (mode === 'path' ? 0 : 100)
        + (categoryDistance * 0.1)
        + (cluster.nearestDistance * 0.05)
        - (Math.sqrt(cluster.count) * 3),
    };
  });
};

const pickSeedColor = (image, block) => {
  if (block.imageGeometry.alignmentSeedPoint) {
    const seedPoint = [
      Math.round(block.imageGeometry.alignmentSeedPoint.x),
      Math.round(block.imageGeometry.alignmentSeedPoint.y),
    ];
    const offset = pixelOffset(image.width, seedPoint[0], seedPoint[1]);
    const rgba = [image.data[offset], image.data[offset + 1], image.data[offset + 2], image.data[offset + 3]];
    if (!isIgnoredPixel(rgba)) {
      const color = rgba.slice(0, 3);
      const categoryColor = parseHexColor(SAJIK_CATEGORIES[block.category]?.light);
      return {
        color,
        point: seedPoint,
        clusterPixelCount: 1,
        clusterCount: 1,
        categoryDistance: categoryColor ? round(distance(color, categoryColor), 1) : 0,
      };
    }
  }

  const pathCandidates = collectSeedClusters(image, block, 'path');
  const labelCandidates = collectSeedClusters(image, block, 'label');
  const categoryColor = parseHexColor(SAJIK_CATEGORIES[block.category]?.light);
  const candidates = pathCandidates.concat(labelCandidates);

  const [best] = candidates
    .filter((cluster) => cluster.count >= 4)
    .sort((a, b) => a.score - b.score || b.count - a.count || a.nearestDistance - b.nearestDistance);
  if (!best) return null;

  return {
    color: best.color,
    point: best.nearestPoint,
    clusterPixelCount: best.count,
    clusterCount: candidates.length,
    categoryDistance: round(best.categoryDistance, 1),
  };
};

const similarToSeed = (rgba, seedColor) => {
  if (isIgnoredPixel(rgba)) return false;
  const spread = Math.max(seedColor[0], seedColor[1], seedColor[2]) - Math.min(seedColor[0], seedColor[1], seedColor[2]);
  if (seedColor[0] < 80 && seedColor[1] < 95 && seedColor[2] > 85) {
    return distance(rgba, seedColor) <= 74 && maxChannelDistance(rgba, seedColor) <= 56;
  }
  const threshold = spread < 28 ? 58 : 92;
  const channelThreshold = spread < 28 ? 44 : 74;
  return distance(rgba, seedColor) <= threshold && maxChannelDistance(rgba, seedColor) <= channelThreshold;
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

const hullPath = (hull) => {
  if (!Array.isArray(hull) || hull.length === 0) return '';
  return `M ${hull.map((point) => point.join(' ')).join(' L ')} Z`;
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

  return rings.sort((a, b) => b.length - a.length);
};

const ringPath = (ring) => {
  if (!Array.isArray(ring) || ring.length === 0) return '';
  return `M ${ring.map((point) => point.join(' ')).join(' L ')} Z`;
};

const traceBlockCandidate = (image, block) => {
  const seed = pickSeedColor(image, block);
  if (!seed) {
    return {
      status: 'NO_SEED_COLOR',
      reason: 'No official PNG color seed was found around the block label.',
    };
  }

  const points = pathPoints(block.imageGeometry.d);
  const bounds = pathBounds(block.imageGeometry.d);
  const padding = 4;
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

  let componentInsidePath = 0;
  pixels.forEach((point) => {
    if (pointInPolygon(point, points)) componentInsidePath += 1;
  });

  let pathAreaPixels = 0;
  let pathSimilarPixels = 0;
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (!pointInPolygon([x + 0.5, y + 0.5], points)) continue;
      const offset = pixelOffset(image.width, x, y);
      const rgba = [image.data[offset], image.data[offset + 1], image.data[offset + 2], image.data[offset + 3]];
      if (isIgnoredPixel(rgba)) continue;
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
  const [outerBoundaryRing = []] = boundaryRings;
  const componentInsidePathRatio = pixels.length > 0 ? componentInsidePath / pixels.length : 0;
  const pathColorCoverageRatio = pathAreaPixels > 0 ? pathSimilarPixels / pathAreaPixels : 0;

  return {
    status: pixels.length >= 10 ? 'PIXEL_CANDIDATE_READY' : 'NEEDS_MANUAL_TRACE',
    seedColor: seed.color,
    seedPoint: seed.point,
    seedClusterPixelCount: seed.clusterPixelCount,
    seedClusterCount: seed.clusterCount,
    seedCategoryDistance: seed.categoryDistance,
    area: pixels.length,
    bbox: {
      minX: componentMinX,
      minY: componentMinY,
      maxX: componentMaxX,
      maxY: componentMaxY,
    },
    center: {
      x: round(sumX / pixels.length, 1),
      y: round(sumY / pixels.length, 1),
    },
    hull,
    hullPath: hullPath(hull),
    boundaryPath: boundaryRings.map(ringPath).filter(Boolean).join(' '),
    outerBoundaryPath: ringPath(outerBoundaryRing),
    outerBoundaryPointCount: outerBoundaryRing.length,
    currentPathBounds: bounds,
    componentInsidePathRatio: round(componentInsidePathRatio),
    pathColorCoverageRatio: round(pathColorCoverageRatio),
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

if (imageData.width !== SAJIK_SEATMAP_IMAGE.imageWidth || imageData.height !== SAJIK_SEATMAP_IMAGE.imageHeight) {
  throw new Error(`Sajik image size mismatch: actual=${imageData.width}x${imageData.height} data=${SAJIK_SEATMAP_IMAGE.imageWidth}x${SAJIK_SEATMAP_IMAGE.imageHeight}`);
}

const blocks = SAJIK_BLOCKS.map((block) => ({
  id: block.id,
  block: block.block,
  name: block.name,
  category: block.category,
  traceStatus: block.traceStatus,
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
};

const report = {
  generatedAt: new Date().toISOString(),
  asset: SAJIK_SEATMAP_IMAGE,
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
