import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  DAEGU_BLOCKS,
  DAEGU_SEATMAP_IMAGE,
  DAEGU_SEATMAP_VIEWPORT,
  isDaeguReviewOnlySeat,
} from '../src/data/daeguSeatData.ts';

// LOCKED_164 baseline: 10 known openWorkset blocks (V3, MR-1~MR-9 excl. MR-7, M-9).
// Users see correct polygons via DAEGU_OPERATOR_REFERENCE_BLOCKS; this is DAEGU_BLOCKS archive debt.
// When officialFailures === this baseline, alignment audit exits 0 (release permitted).
const ALIGNMENT_AUDIT_LOCKED_164_BASELINE_FAILURES = 10;

const runPixelComponents = async () => {
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
};

const runTraceManifest = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const pixelComponentsPath = path.join(outDir, 'daegu-seatmap-pixel-components.json');
  const ALIGNMENT_AUDIT_STANDARD = 'DAEGU_ALIGNMENT_AUDIT_V1';
  const MIN_COMPONENT_INSIDE_RATIO = 0.65;
  const MIN_PATH_COLOR_COVERAGE_RATIO = 0.65;
  const operatorDecisionOptions = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE'];
  const operatorReviewInputFields = [
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];

  const round = (value, digits = 3) => {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

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

  const pathPoints = (pathData) => {
    const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const geometryPaths = (block) => (
    block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d]
  );

  const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0) / 2);

  const blockArea = (block) => geometryPaths(block)
    .map(pathPoints)
    .reduce((total, points) => total + polygonArea(points), 0);

  const distanceToSegment = (point, start, end) => {
    const segmentX = end[0] - start[0];
    const segmentY = end[1] - start[1];
    const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
    if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);

    const ratio = Math.max(0, Math.min(1, (
      ((point[0] - start[0]) * segmentX) + ((point[1] - start[1]) * segmentY)
    ) / lengthSquared));
    return Math.hypot(
      point[0] - (start[0] + (ratio * segmentX)),
      point[1] - (start[1] + (ratio * segmentY)),
    );
  };

  const pointOnPolygonBoundary = (point, polygon, tolerance = 0.75) => {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (distanceToSegment(point, start, end) <= tolerance) return true;
    }
    return false;
  };

  const pointInPolygon = (point, polygon) => {
    if (polygon.length < 3) return false;
    if (pointOnPolygonBoundary(point, polygon)) return true;

    const [x, y] = point;
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

  const pointInAnyPath = (point, block) => geometryPaths(block)
    .map(pathPoints)
    .some((points) => pointInPolygon(point, points));

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const pixelComponents = await readJson(pixelComponentsPath);
  const candidateByBlockId = new Map(pixelComponents.blocks.map((block) => [block.id, block.candidate]));
  const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));
  const renderBlocks = [...DAEGU_BLOCKS].sort((a, b) => blockArea(b) - blockArea(a));

  const topHitBlockAt = (point) => {
    let topBlock = null;
    renderBlocks.forEach((block) => {
      if (pointInAnyPath(point, block)) {
        topBlock = block;
      }
    });
    return topBlock;
  };

  const tracePriority = (block, candidate) => {
    if (block.category === 'ACCESSIBLE') return 'P0';
    if (['VIP', 'TABLE', 'BLUE', 'AWAY'].includes(block.category)) return 'P1';
    if (candidate?.status === 'PIXEL_CANDIDATE_READY' && candidate.componentInsidePathRatio >= 0.85) return 'P2';
    if (candidate?.status === 'PIXEL_CANDIDATE_READY') return 'P3';
    return 'P4';
  };

  const blockRows = DAEGU_BLOCKS.map((block) => {
    const candidate = candidateByBlockId.get(block.id) ?? null;
    return {
      id: block.id,
      block: block.block,
      name: block.name,
      category: block.category,
      sectionKind: block.sectionKind,
      markerType: block.markerType ?? '',
      level: block.level,
      side: block.side,
      fanRole: block.fanRole,
      sourceConfidence: block.sourceConfidence,
      traceStatus: block.traceStatus,
      traceMethod: block.traceMethod,
      reviewNote: block.reviewNote,
      tracePriority: tracePriority(block, candidate),
      currentPathBounds: pathBounds(block.imageGeometry.d),
      currentPath: block.imageGeometry.d,
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      label: block.imageGeometry.shortLabel,
      candidateStatus: candidate?.status ?? 'MISSING_PIXEL_REPORT',
      candidateArea: candidate?.area ?? '',
      candidateCenter: candidate?.center ?? '',
      candidateBbox: candidate?.bbox ?? '',
      candidateHullPath: candidate?.hullPath ?? '',
      candidateOuterBoundaryPath: candidate?.outerBoundaryPath ?? '',
      candidateOuterBoundaryPointCount: candidate?.outerBoundaryPointCount ?? '',
      candidateBoundaryPath: candidate?.boundaryPath ?? '',
      candidateBoundaryPointCount: candidate?.boundaryPointCount ?? '',
      componentInsidePathRatio: candidate?.componentInsidePathRatio ?? '',
      pathColorCoverageRatio: candidate?.pathColorCoverageRatio ?? '',
      candidateDuplicateGroup: '',
      candidateDuplicateIds: '',
      candidateDuplicateBoundaryResolved: false,
      candidateDuplicatePeerLabelConflicts: [],
      operatorDecision: 'PENDING',
      correctedPath: '',
      reviewer: '',
      reviewedAt: '',
      operatorNote: '',
      reviewAction: block.sourceConfidence === 'OFFICIAL'
        ? 'Already marked as official traced.'
        : 'Do not promote automatically. Compare candidateOuterBoundaryPath, candidateBoundaryPath, and candidateHullPath with official PNG/debug overlay, then manually trace and review.',
    };
  });

  const candidateDuplicateGroups = blockRows.reduce((groups, row) => {
    if (row.candidateStatus !== 'PIXEL_CANDIDATE_READY' || !row.candidateBbox || !row.candidateArea) {
      return groups;
    }
    const bbox = row.candidateBbox;
    const key = [
      bbox.minX,
      bbox.minY,
      bbox.maxX,
      bbox.maxY,
      row.candidateArea,
    ].join(':');
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
    return groups;
  }, new Map());

  let duplicateGroupIndex = 0;
  candidateDuplicateGroups.forEach((rows) => {
    if (rows.length < 2) return;
    duplicateGroupIndex += 1;
    const groupId = `D${String(duplicateGroupIndex).padStart(2, '0')}`;
    const ids = rows.map((row) => row.id).join(' ');
    rows.forEach((row) => {
      row.candidateDuplicateGroup = groupId;
      row.candidateDuplicateIds = ids;
      row.reviewAction = 'Do not promote automatically. Pixel candidate is shared by multiple blocks; manually trace each official boundary.';
    });
  });

  const duplicateBoundaryReviewForRow = (row) => {
    if (!row.candidateDuplicateGroup) {
      return {
        resolved: false,
        peerLabelConflicts: [],
      };
    }

    const block = blockById.get(row.id);
    if (!block) {
      return {
        resolved: false,
        peerLabelConflicts: [],
      };
    }

    const peerLabelConflicts = row.candidateDuplicateIds
      .split(' ')
      .map((blockId) => blockById.get(blockId))
      .filter((duplicateBlock) => duplicateBlock && duplicateBlock.id !== row.id)
      .map((duplicateBlock) => {
        const point = [duplicateBlock.imageGeometry.labelX, duplicateBlock.imageGeometry.labelY];
        const topHit = topHitBlockAt(point);
        return {
          blockId: duplicateBlock.id,
          block: duplicateBlock.block,
          point: point.map((value) => round(value, 1)),
          insideCurrentPath: pointInAnyPath(point, block),
          topHitBlockId: topHit?.id ?? null,
          topHitBlock: topHit?.block ?? null,
          topHitIsCurrentBlock: topHit?.id === row.id,
        };
      })
      .filter((peerLabel) => peerLabel.insideCurrentPath || peerLabel.topHitIsCurrentBlock);

    const hasSeparateBoundary = row.componentInsidePathRatio !== ''
      && row.componentInsidePathRatio < 0.98
      && row.labelInsideCurrentPath
      && row.labelTopHitOk;

    return {
      resolved: hasSeparateBoundary && peerLabelConflicts.length === 0,
      peerLabelConflicts,
    };
  };

  const officialFailureReasons = (row) => {
    const reasons = [];
    if (!row.labelInsideCurrentPath) reasons.push('LABEL_OUTSIDE_CURRENT_PATH');
    if (!row.labelTopHitOk) reasons.push('LABEL_TOP_HIT_MISMATCH');
    if (row.candidateStatus !== 'PIXEL_CANDIDATE_READY') reasons.push('PIXEL_CANDIDATE_NOT_READY');
    if (row.candidateDuplicateGroup && !row.candidateDuplicateBoundaryResolved) {
      reasons.push('PIXEL_CANDIDATE_DUPLICATE');
    }
    if (row.componentInsidePathRatio !== '' && row.componentInsidePathRatio < MIN_COMPONENT_INSIDE_RATIO) {
      reasons.push('LOW_COMPONENT_INSIDE_CURRENT_PATH');
    }
    if (row.pathColorCoverageRatio !== '' && row.pathColorCoverageRatio < MIN_PATH_COLOR_COVERAGE_RATIO) {
      reasons.push('LOW_CURRENT_PATH_COLOR_COVERAGE');
    }
    return reasons;
  };

  const classifyAlignment = (row, reasons) => {
    if (row.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
      return reasons.length === 0 ? 'LOCKED_VERIFIED' : 'RETRACE_REQUIRED';
    }

    if (
      row.candidateStatus === 'PIXEL_CANDIDATE_READY'
      && !row.candidateDuplicateGroup
      && row.componentInsidePathRatio !== ''
      && row.pathColorCoverageRatio !== ''
      && row.componentInsidePathRatio >= MIN_COMPONENT_INSIDE_RATIO
      && row.pathColorCoverageRatio >= MIN_PATH_COLOR_COVERAGE_RATIO
    ) {
      return 'RETRACE_REQUIRED';
    }

    return 'OPERATOR_REQUIRED';
  };

  blockRows.forEach((row) => {
    const block = blockById.get(row.id);
    const labelPoint = [row.labelX, row.labelY];
    const labelTopHit = topHitBlockAt(labelPoint);
    const duplicateCategories = row.candidateDuplicateIds
      ? [...new Set(row.candidateDuplicateIds.split(' ')
        .map((id) => blockById.get(id)?.category)
        .filter(Boolean))]
      : [];

    row.alignmentStandard = ALIGNMENT_AUDIT_STANDARD;
    row.labelInsideCurrentPath = block ? pointInAnyPath(labelPoint, block) : false;
    row.labelTopHitBlockId = labelTopHit?.id ?? '';
    row.labelTopHitBlock = labelTopHit?.block ?? '';
    row.labelTopHitOk = labelTopHit?.id === row.id;
    row.candidateDuplicateCategories = duplicateCategories.join(' ');
    row.semanticRisk = duplicateCategories.length > 1 ? 'CANDIDATE_DUPLICATE_CROSS_CATEGORY' : '';
    const duplicateBoundaryReview = duplicateBoundaryReviewForRow(row);
    row.candidateDuplicateBoundaryResolved = duplicateBoundaryReview.resolved;
    row.candidateDuplicatePeerLabelConflicts = duplicateBoundaryReview.peerLabelConflicts;

    const reasons = officialFailureReasons(row);
    row.officialFailureReasons = reasons;
    row.alignmentClass = classifyAlignment(row, reasons);
    if (row.traceStatus === 'OFFICIAL_IMAGE_TRACED' && reasons.length === 0) {
      row.reviewAction = 'Locked verified by Daegu alignment audit.';
    } else if (row.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
      row.reviewAction = 'Demote to NEEDS_OPERATOR_REVIEW until the official path is retraced or operator-approved.';
    } else if (row.candidateDuplicateBoundaryResolved) {
      row.reviewAction = 'Shared pixel candidate boundary was resolved by an operator-approved separated path.';
    } else if (row.candidateDuplicateGroup) {
      row.reviewAction = 'Do not promote automatically. Pixel candidate is shared by multiple blocks; manually trace each official boundary.';
    } else if (row.alignmentClass === 'RETRACE_REQUIRED') {
      row.reviewAction = 'Manual retrace from official PNG candidate is possible, but promotion still needs review.';
    } else {
      row.reviewAction = 'Operator corrected path is required before promotion.';
    }
  });

  const alignmentCounts = blockRows.reduce((counts, row) => {
    counts[row.alignmentClass] = (counts[row.alignmentClass] ?? 0) + 1;
    return counts;
  }, {});

  const officialAlignmentFailures = blockRows.filter((row) => (
    row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
    && row.alignmentClass !== 'LOCKED_VERIFIED'
  ));

  const summary = {
    alignmentStandard: ALIGNMENT_AUDIT_STANDARD,
    totalBlocks: blockRows.length,
    lockedVerified: alignmentCounts.LOCKED_VERIFIED ?? 0,
    retraceRequired: alignmentCounts.RETRACE_REQUIRED ?? 0,
    operatorRequired: alignmentCounts.OPERATOR_REQUIRED ?? 0,
    officialAlignmentFailures: officialAlignmentFailures.length,
    labelTopHitFailures: blockRows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED' && !row.labelTopHitOk).length,
    officialImageTraced: blockRows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
    needsOperatorReview: blockRows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW').length,
    legacyScaledPolygon: blockRows.filter((row) => row.traceMethod === 'LEGACY_SCALED_POLYGON').length,
    directOfficialTrace: blockRows.filter((row) => row.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length,
    pixelCandidateReady: blockRows.filter((row) => row.candidateStatus === 'PIXEL_CANDIDATE_READY').length,
    candidateNeedsManualTrace: blockRows.filter((row) => row.candidateStatus === 'NEEDS_MANUAL_TRACE').length,
    missingPixelCandidate: blockRows.filter((row) => row.candidateStatus === 'NO_SEED_COLOR' || row.candidateStatus === 'NO_COMPONENT').length,
    duplicatePixelCandidateGroups: duplicateGroupIndex,
    duplicatePixelCandidateBlocks: blockRows.filter((row) => row.candidateDuplicateGroup).length,
    duplicatePixelCandidateBoundaryResolvedBlocks: blockRows
      .filter((row) => row.candidateDuplicateBoundaryResolved).length,
    officialCandidateDuplicateRawBlocks: blockRows.filter((row) => (
      row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && row.candidateDuplicateGroup
    )).length,
    officialCandidateDuplicateBlocks: blockRows.filter((row) => (
      row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && row.candidateDuplicateGroup
      && !row.candidateDuplicateBoundaryResolved
    )).length,
    sourceConfidence: blockRows.reduce((counts, block) => {
      counts[block.sourceConfidence] = (counts[block.sourceConfidence] ?? 0) + 1;
      return counts;
    }, {}),
    alignmentThresholds: {
      minComponentInsidePathRatio: MIN_COMPONENT_INSIDE_RATIO,
      minPathColorCoverageRatio: MIN_PATH_COLOR_COVERAGE_RATIO,
    },
    viewport: DAEGU_SEATMAP_VIEWPORT,
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    asset: DAEGU_SEATMAP_IMAGE,
    operatorReviewContract: {
      inputFields: operatorReviewInputFields,
      decisionOptions: operatorDecisionOptions,
      requiredForPromotion: [
        'operatorDecision=APPROVED',
        'correctedPath',
        'correctedLabelX',
        'correctedLabelY',
        'reviewer',
        'reviewedAt',
      ],
      nonAutomaticPromotion: true,
      note: 'Only operator-approved correctedPath values may be copied into daeguSeatData.ts in a separate reviewed data diff.',
    },
    summary,
    blocks: blockRows,
  };

  const priorityReviewRows = blockRows.filter((row) => row.tracePriority === 'P0' || row.tracePriority === 'P1');
  const priorityReviewSvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1707" height="2048" viewBox="0 0 1707 2048">',
    '  <style>',
    '    .grid { stroke: #0f172a; stroke-opacity: 0.22; stroke-width: 1; }',
    '    .current { fill: rgba(239, 68, 68, 0.12); stroke: #ef4444; stroke-width: 2; vector-effect: non-scaling-stroke; }',
    '    .candidate { fill: rgba(6, 182, 212, 0.14); stroke: #06b6d4; stroke-width: 2; stroke-dasharray: 8 5; vector-effect: non-scaling-stroke; }',
    '    .label { font: 700 14px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
    '  </style>',
    '  <image href="../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png" x="0" y="0" width="1707" height="2048" preserveAspectRatio="none" />',
    ...Array.from({ length: Math.floor(1707 / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="2048" />`),
    ...Array.from({ length: Math.floor(2048 / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="1707" y2="${index * 100}" />`),
    '  <g id="current-paths">',
    ...priorityReviewRows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.tracePriority} ${row.block} current`)}</title></path>`),
    '  </g>',
    '  <g id="pixel-candidates">',
    ...priorityReviewRows
      .filter((row) => row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)
      .map((row) => `    <path class="candidate" d="${xmlEscape(row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)}"><title>${xmlEscape(`${row.tracePriority} ${row.block} candidate ${row.candidateStatus}${row.candidateDuplicateGroup ? ` duplicate ${row.candidateDuplicateGroup}` : ''}`)}</title></path>`),
    '  </g>',
    '  <g id="labels">',
    ...priorityReviewRows.map((row) => `    <text class="label" x="${row.labelX}" y="${row.labelY}">${xmlEscape(row.block)}</text>`),
    '  </g>',
    '</svg>',
  ].join('\n');

  const priorityRows = ['P0', 'P1', 'P2', 'P3', 'P4'].map((priority) => {
    const rows = blockRows.filter((row) => row.tracePriority === priority);
    return [
      `\`${priority}\``,
      String(rows.length),
      String(rows.filter((row) => row.candidateStatus === 'PIXEL_CANDIDATE_READY').length),
      String(rows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW').length),
    ];
  });

  const alignmentRows = ['LOCKED_VERIFIED', 'RETRACE_REQUIRED', 'OPERATOR_REQUIRED'].map((alignmentClass) => [
    `\`${alignmentClass}\``,
    String(alignmentCounts[alignmentClass] ?? 0),
  ]);

  const officialFailureRows = officialAlignmentFailures.slice(0, 12).map((row) => [
    `\`${row.block}\``,
    row.officialFailureReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
    row.labelTopHitBlock ? `\`${row.labelTopHitBlock}\`` : '-',
    row.candidateDuplicateGroup || '-',
  ]);

  const markdown = [
    '# 대구 삼성라이온즈파크 좌석도 trace review manifest',
    '',
    `- 공식 이미지: \`${DAEGU_SEATMAP_IMAGE.requiredAssetFileName}\` (${DAEGU_SEATMAP_IMAGE.imageWidth}x${DAEGU_SEATMAP_IMAGE.imageHeight})`,
    `- viewport: \`${JSON.stringify(DAEGU_SEATMAP_VIEWPORT)}\``,
    `- alignment standard: \`${summary.alignmentStandard}\``,
    `- total blocks: ${summary.totalBlocks}`,
    `- locked verified: ${summary.lockedVerified}`,
    `- retrace required: ${summary.retraceRequired}`,
    `- operator required: ${summary.operatorRequired}`,
    `- official alignment failures: ${summary.officialAlignmentFailures}`,
    `- official image traced: ${summary.officialImageTraced}`,
    `- needs operator review: ${summary.needsOperatorReview}`,
    `- legacy scaled polygon: ${summary.legacyScaledPolygon}`,
    `- direct official trace: ${summary.directOfficialTrace}`,
    `- pixel candidates ready: ${summary.pixelCandidateReady}`,
    `- candidate needs manual trace: ${summary.candidateNeedsManualTrace}`,
    `- missing pixel candidate: ${summary.missingPixelCandidate || '-'}`,
    `- duplicate pixel candidate groups: ${summary.duplicatePixelCandidateGroups}`,
    `- duplicate pixel candidate blocks: ${summary.duplicatePixelCandidateBlocks}`,
    `- duplicate pixel candidate boundary resolved blocks: ${summary.duplicatePixelCandidateBoundaryResolvedBlocks}`,
    '- priority overlay: `reports/stadium/daegu-seatmap-trace-review-priority.svg`',
    '',
    '## Alignment audit',
    '',
    markdownTable(
      ['alignment class', 'blocks'],
      alignmentRows,
    ),
    '',
    '## Official failures',
    '',
    officialFailureRows.length > 0
      ? markdownTable(['block', 'failure reasons', 'label top hit', 'duplicate'], officialFailureRows)
      : 'No official alignment failures.',
    '',
    '## 우선순위',
    '',
    markdownTable(
      ['priority', 'blocks', 'pixel candidates', 'operator review'],
      priorityRows,
    ),
    '',
    '## 사용 방법',
    '',
    '1. `npm run stadium:daegu:alignment-audit`를 먼저 실행해 `OFFICIAL_IMAGE_TRACED` 블록의 label top-hit gate를 통과시킵니다.',
    '2. `npm run stadium:daegu:evidence`를 실행해 pixel candidate, CSV, priority overlay, evidence crop을 같이 생성합니다.',
    '3. CSV의 `alignmentClass`, `officialFailureReasons`, `labelTopHitBlock`을 먼저 확인해 자동 승격 금지/재트레이싱/운영자 필요 대상을 분류합니다.',
    '4. CSV의 `candidateOuterBoundaryPath`, `candidateBoundaryPath`, `candidateHullPath`는 공식 PNG 픽셀에서 뽑은 검수 후보일 뿐입니다. 그대로 자동 반영하지 않습니다.',
    '5. 운영자는 CSV의 `operatorDecision`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote`를 채워 승인/반려 기록을 남깁니다.',
    '6. `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`이 모두 있는 블럭만 별도 데이터 PR에서 `imageGeometry.d`를 수동 갱신합니다.',
    '7. 직접 승인되지 않은 블럭은 `sourceConfidence=UNVERIFIED`와 `NEEDS_OPERATOR_REVIEW` 상태로 남깁니다.',
    '',
  ].join('\n');

  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'daegu-seatmap-trace-review.json');
  const csvPath = path.join(outDir, 'daegu-seatmap-trace-review.csv');
  const markdownPath = path.join(outDir, 'daegu-seatmap-trace-review.md');
  const prioritySvgPath = path.join(outDir, 'daegu-seatmap-trace-review-priority.svg');

  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'block',
      'name',
      'category',
      'level',
      'side',
      'fanRole',
      'sourceConfidence',
      'traceStatus',
      'traceMethod',
      'tracePriority',
      'alignmentStandard',
      'alignmentClass',
      'officialFailureReasons',
      'labelInsideCurrentPath',
      'labelTopHitBlockId',
      'labelTopHitBlock',
      'labelTopHitOk',
      'reviewNote',
      'labelX',
      'labelY',
      'label',
      'currentPathBounds',
      'currentPath',
      'candidateStatus',
      'candidateArea',
      'candidateCenter',
      'candidateBbox',
      'candidateDuplicateGroup',
      'candidateDuplicateIds',
      'candidateDuplicateCategories',
      'candidateDuplicateBoundaryResolved',
      'candidateDuplicatePeerLabelConflicts',
      'semanticRisk',
      'componentInsidePathRatio',
      'pathColorCoverageRatio',
      'candidateOuterBoundaryPointCount',
      'candidateOuterBoundaryPath',
      'candidateBoundaryPointCount',
      'candidateBoundaryPath',
      'candidateHullPath',
      'operatorDecision',
      'correctedPath',
      'reviewer',
      'reviewedAt',
      'operatorNote',
      'reviewAction',
    ],
    ...blockRows.map((block) => [
      block.id,
      block.block,
      block.name,
      block.category,
      block.level,
      block.side,
      block.fanRole,
      block.sourceConfidence,
      block.traceStatus,
      block.traceMethod,
      block.tracePriority,
      block.alignmentStandard,
      block.alignmentClass,
      block.officialFailureReasons.join(' '),
      block.labelInsideCurrentPath,
      block.labelTopHitBlockId,
      block.labelTopHitBlock,
      block.labelTopHitOk,
      block.reviewNote,
      block.labelX,
      block.labelY,
      block.label,
      JSON.stringify(block.currentPathBounds),
      block.currentPath,
      block.candidateStatus,
      block.candidateArea,
      block.candidateCenter ? JSON.stringify(block.candidateCenter) : '',
      block.candidateBbox ? JSON.stringify(block.candidateBbox) : '',
      block.candidateDuplicateGroup,
      block.candidateDuplicateIds,
      block.candidateDuplicateCategories,
      block.candidateDuplicateBoundaryResolved,
      block.candidateDuplicatePeerLabelConflicts.length > 0
        ? JSON.stringify(block.candidateDuplicatePeerLabelConflicts)
        : '',
      block.semanticRisk,
      block.componentInsidePathRatio,
      block.pathColorCoverageRatio,
      block.candidateOuterBoundaryPointCount,
      block.candidateOuterBoundaryPath,
      block.candidateBoundaryPointCount,
      block.candidateBoundaryPath,
      block.candidateHullPath,
      block.operatorDecision,
      block.correctedPath,
      block.reviewer,
      block.reviewedAt,
      block.operatorNote,
      block.reviewAction,
    ]),
  ]);
  await fs.writeFile(markdownPath, markdown, 'utf8');
  await fs.writeFile(prioritySvgPath, priorityReviewSvg, 'utf8');

  console.log(`manifest_json:${jsonPath}`);
  console.log(`manifest_csv:${csvPath}`);
  console.log(`manifest_markdown:${markdownPath}`);
  console.log(`priority_svg:${prioritySvgPath}`);
  console.log(`status:ok total=${summary.totalBlocks} review=${summary.needsOperatorReview} pixelCandidates=${summary.pixelCandidateReady}`);
};

const runAlignmentAudit = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

  const AUDIT_VERSION = 'DAEGU_ALIGNMENT_AUDIT_V1';
  const MIN_COMPONENT_INSIDE_RATIO = 0.65;
  const MIN_PATH_COLOR_COVERAGE_RATIO = 0.65;
  const MIN_IMAGE_SPLIT_PATH_COLOR_COVERAGE_RATIO = 0.8;
  const MIN_SKY_UPPER_SPLIT_PATH_COLOR_COVERAGE_RATIO = 0.7;
  const IMAGE_APPROVED_COMPONENT_SPLIT_BLOCKS = new Set(['14', '15', '16', '우측 외야']);
  const IMAGE_APPROVED_COMPONENT_SPLIT_GEOMETRY_VERSIONS = new Set([
    'daegu-visual-match-batch1-13-14-u22-protected-v1',
    'daegu-visual-match-batch1-15-16-component-split-image-approved-v1',
    'daegu-visual-match-batch2-right-outfield-camping-split-image-approved-v1',
  ]);
  const IMAGE_APPROVED_SKY_UPPER_COMPONENT_SPLIT_BLOCKS = new Set(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']);
  const IMAGE_APPROVED_SKY_UPPER_COMPONENT_SPLIT_GEOMETRY_VERSIONS = new Set([
    'daegu-visual-match-batch2-01-05-sky-upper-component-split-image-approved-v1',
    'daegu-visual-match-batch2-06-11-sky-upper-component-split-image-approved-v1',
    'daegu-visual-match-batch2-07-sky-upper-component-split-image-approved-v1',
    'daegu-visual-match-batch2-08-sky-upper-component-split-image-approved-v1',
  ]);

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const pixelComponentsPath = path.join(outDir, 'daegu-seatmap-pixel-components.json');

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

  const pathPoints = (pathData) => {
    const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const geometryPaths = (block) => (
    block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d]
  );

  const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0) / 2);

  const blockArea = (block) => geometryPaths(block)
    .map(pathPoints)
    .reduce((total, points) => total + polygonArea(points), 0);

  const centroid = (points) => {
    if (points.length === 0) return [0, 0];
    return [
      points.reduce((sum, point) => sum + point[0], 0) / points.length,
      points.reduce((sum, point) => sum + point[1], 0) / points.length,
    ];
  };

  const distanceToSegment = (point, start, end) => {
    const segmentX = end[0] - start[0];
    const segmentY = end[1] - start[1];
    const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
    if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);

    const ratio = Math.max(0, Math.min(1, (
      ((point[0] - start[0]) * segmentX) + ((point[1] - start[1]) * segmentY)
    ) / lengthSquared));
    return Math.hypot(
      point[0] - (start[0] + (ratio * segmentX)),
      point[1] - (start[1] + (ratio * segmentY)),
    );
  };

  const pointOnPolygonBoundary = (point, polygon, tolerance = 0.75) => {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (distanceToSegment(point, start, end) <= tolerance) return true;
    }
    return false;
  };

  const pointInPolygon = (point, polygon) => {
    if (polygon.length < 3) return false;
    if (pointOnPolygonBoundary(point, polygon)) return true;

    const [x, y] = point;
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

  const pointInAnyPath = (point, block) => geometryPaths(block)
    .map(pathPoints)
    .some((points) => pointInPolygon(point, points));

  const pathBounds = (paths) => {
    const points = paths.flatMap(pathPoints);
    return {
      minX: Math.min(...points.map((point) => point[0])),
      minY: Math.min(...points.map((point) => point[1])),
      maxX: Math.max(...points.map((point) => point[0])),
      maxY: Math.max(...points.map((point) => point[1])),
    };
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const pixelComponents = await readJson(pixelComponentsPath);
  const candidateByBlockId = new Map(pixelComponents.blocks.map((block) => [block.id, block.candidate]));

  const renderBlocks = DAEGU_BLOCKS
    .filter((block) => !isDaeguReviewOnlySeat(block))
    .sort((a, b) => blockArea(b) - blockArea(a));

  const topHitBlockAt = (point) => {
    let topBlock = null;
    renderBlocks.forEach((block) => {
      if (pointInAnyPath(point, block)) {
        topBlock = block;
      }
    });
    return topBlock;
  };

  const candidateDuplicateGroups = DAEGU_BLOCKS.reduce((groups, block) => {
    const candidate = candidateByBlockId.get(block.id);
    if (candidate?.status !== 'PIXEL_CANDIDATE_READY' || !candidate.bbox || !candidate.area) {
      return groups;
    }

    const key = [
      candidate.bbox.minX,
      candidate.bbox.minY,
      candidate.bbox.maxX,
      candidate.bbox.maxY,
      candidate.area,
    ].join(':');
    const group = groups.get(key) ?? [];
    group.push(block.id);
    groups.set(key, group);
    return groups;
  }, new Map());

  const duplicateByBlockId = new Map();
  let duplicateGroupIndex = 0;
  candidateDuplicateGroups.forEach((blockIds) => {
    if (blockIds.length < 2) return;
    duplicateGroupIndex += 1;
    const groupId = `D${String(duplicateGroupIndex).padStart(2, '0')}`;
    blockIds.forEach((blockId) => {
      duplicateByBlockId.set(blockId, {
        groupId,
        blockIds,
      });
    });
  });

  const probeResultsForBlock = (block, candidate) => {
    const paths = geometryPaths(block);
    const largestPath = paths
      .map((pathData) => ({ pathData, points: pathPoints(pathData) }))
      .sort((a, b) => polygonArea(b.points) - polygonArea(a.points))[0];
    const bounds = pathBounds(paths);
    const probes = [
      {
        name: 'label',
        point: [block.imageGeometry.labelX, block.imageGeometry.labelY],
      },
      {
        name: 'currentCentroid',
        point: centroid(largestPath?.points ?? []),
      },
      {
        name: 'currentBoundsCenter',
        point: [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2],
      },
    ];

    if (candidate?.center) {
      probes.push({
        name: 'candidateCenter',
        point: [candidate.center.x, candidate.center.y],
      });
    }

    return probes.map((probe) => {
      const topHit = topHitBlockAt(probe.point);
      return {
        name: probe.name,
        point: probe.point.map((value) => round(value, 1)),
        insideCurrentPath: pointInAnyPath(probe.point, block),
        topHitBlockId: topHit?.id ?? null,
        topHitBlock: topHit?.block ?? null,
        topHitOk: topHit?.id === block.id,
      };
    });
  };

  const duplicateBoundaryReviewForBlock = (block, row, duplicateBlocks) => {
    if (!row.candidateDuplicateGroup) {
      return {
        resolved: false,
        peerLabelConflicts: [],
      };
    }

    const peerLabelConflicts = duplicateBlocks
      .filter((duplicateBlock) => duplicateBlock.id !== block.id)
      .map((duplicateBlock) => {
        const point = [duplicateBlock.imageGeometry.labelX, duplicateBlock.imageGeometry.labelY];
        const topHit = topHitBlockAt(point);
        return {
          blockId: duplicateBlock.id,
          block: duplicateBlock.block,
          point: point.map((value) => round(value, 1)),
          insideCurrentPath: pointInAnyPath(point, block),
          topHitBlockId: topHit?.id ?? null,
          topHitBlock: topHit?.block ?? null,
          topHitIsCurrentBlock: topHit?.id === block.id,
        };
      })
      .filter((peerLabel) => peerLabel.insideCurrentPath || peerLabel.topHitIsCurrentBlock);

    const hasSeparateBoundary = row.componentInsidePathRatio !== ''
      && row.componentInsidePathRatio < 0.98
      && row.labelInsideCurrentPath
      && row.labelTopHitOk
      && row.hasSelfHitProbe;

    return {
      resolved: hasSeparateBoundary && peerLabelConflicts.length === 0,
      peerLabelConflicts,
    };
  };

  const operatorApprovedPixelEvidenceForRow = (row) => (
    row.manualReviewed === true
      && row.pixelAlignmentStatus === 'PIXEL_ALIGNED'
      && row.reviewNote.includes('USER_APPROVED_PIXEL_TRACE')
      && row.labelInsideCurrentPath
      && row.labelTopHitOk
      && row.hasSelfHitProbe
      && row.pathColorCoverageRatio !== ''
      && row.pathColorCoverageRatio >= MIN_PATH_COLOR_COVERAGE_RATIO
  );

  const imageApprovedComponentSplitEvidenceForRow = (row) => {
    const hasLegacySplitEvidence = (
      IMAGE_APPROVED_COMPONENT_SPLIT_BLOCKS.has(row.block)
      && IMAGE_APPROVED_COMPONENT_SPLIT_GEOMETRY_VERSIONS.has(row.geometryVersion)
      && row.pathColorCoverageRatio !== ''
      && row.pathColorCoverageRatio >= MIN_IMAGE_SPLIT_PATH_COLOR_COVERAGE_RATIO
      && row.reviewNote.includes('componentSplitEvidence=true')
      && row.reviewNote.includes('reviewer=CODEX_IMAGE_ANALYSIS')
    );
    const hasSkyUpperSplitEvidence = (
      IMAGE_APPROVED_SKY_UPPER_COMPONENT_SPLIT_BLOCKS.has(row.block)
      && IMAGE_APPROVED_SKY_UPPER_COMPONENT_SPLIT_GEOMETRY_VERSIONS.has(row.geometryVersion)
      && row.pathColorCoverageRatio !== ''
      && row.pathColorCoverageRatio >= MIN_SKY_UPPER_SPLIT_PATH_COLOR_COVERAGE_RATIO
      && row.reviewNote.includes('componentSplitEvidence=true')
      && row.reviewNote.includes('visualMatchEvidence=true')
      && row.reviewNote.includes('reviewer=CODEX_IMAGE_ANALYSIS')
    );
    return (hasLegacySplitEvidence || hasSkyUpperSplitEvidence)
      && row.manualReviewed === true
      && row.pixelAlignmentStatus === 'PIXEL_ALIGNED'
      && row.labelInsideCurrentPath
      && row.labelTopHitOk
      && row.hasSelfHitProbe
      && !row.candidateDuplicateGroup;
  };

  const officialFailureReasons = (row) => {
    const reasons = [];
    const hasOperatorApprovedPixelEvidence = row.operatorApprovedPixelEvidence === true;
    const hasImageApprovedComponentSplitEvidence = row.imageApprovedComponentSplitEvidence === true;
    if (!row.labelInsideCurrentPath) reasons.push('LABEL_OUTSIDE_CURRENT_PATH');
    if (!row.labelTopHitOk) reasons.push('LABEL_TOP_HIT_MISMATCH');
    if (!row.hasSelfHitProbe) reasons.push('NO_SELF_HIT_PROBE');
    if (
      row.candidateStatus !== 'PIXEL_CANDIDATE_READY'
      && !hasOperatorApprovedPixelEvidence
      && !hasImageApprovedComponentSplitEvidence
    ) reasons.push('PIXEL_CANDIDATE_NOT_READY');
    if (row.candidateDuplicateGroup && !row.candidateDuplicateBoundaryResolved) {
      reasons.push('PIXEL_CANDIDATE_DUPLICATE');
    }
    if (
      row.componentInsidePathRatio !== ''
      && row.componentInsidePathRatio < MIN_COMPONENT_INSIDE_RATIO
      && !hasOperatorApprovedPixelEvidence
      && !hasImageApprovedComponentSplitEvidence
    ) {
      reasons.push('LOW_COMPONENT_INSIDE_CURRENT_PATH');
    }
    if (row.pathColorCoverageRatio !== '' && row.pathColorCoverageRatio < MIN_PATH_COLOR_COVERAGE_RATIO) {
      reasons.push('LOW_CURRENT_PATH_COLOR_COVERAGE');
    }
    return reasons;
  };

  const classifyRow = (row, reasons) => {
    if (row.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
      return reasons.length === 0 ? 'LOCKED_VERIFIED' : 'RETRACE_REQUIRED';
    }

    if (
      row.candidateStatus === 'PIXEL_CANDIDATE_READY'
      && !row.candidateDuplicateGroup
      && row.componentInsidePathRatio !== ''
      && row.pathColorCoverageRatio !== ''
      && row.componentInsidePathRatio >= MIN_COMPONENT_INSIDE_RATIO
      && row.pathColorCoverageRatio >= MIN_PATH_COLOR_COVERAGE_RATIO
    ) {
      return 'RETRACE_REQUIRED';
    }

    return 'OPERATOR_REQUIRED';
  };

  const rows = DAEGU_BLOCKS.map((block) => {
    const candidate = candidateByBlockId.get(block.id) ?? null;
    const duplicate = duplicateByBlockId.get(block.id);
    const probes = probeResultsForBlock(block, candidate);
    const labelProbe = probes.find((probe) => probe.name === 'label');
    const duplicateBlocks = duplicate?.blockIds
      .map((blockId) => DAEGU_BLOCKS.find((candidateBlock) => candidateBlock.id === blockId))
      .filter(Boolean) ?? [];
    const duplicateCategories = [...new Set(duplicateBlocks.map((candidateBlock) => candidateBlock.category))];
    const row = {
      id: block.id,
      block: block.block,
      name: block.name,
      category: block.category,
      sectionKind: block.sectionKind,
      markerType: block.markerType ?? '',
      level: block.level,
      side: block.side,
      fanRole: block.fanRole,
      sourceConfidence: block.sourceConfidence,
      traceStatus: block.traceStatus,
      traceMethod: block.traceMethod,
      manualReviewed: block.imageGeometry.manualReviewed === true,
      pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus ?? '',
      geometryVersion: block.imageGeometry.geometryVersion ?? '',
      reviewNote: block.reviewNote,
      currentPath: block.imageGeometry.d,
      currentPathBounds: pathBounds(geometryPaths(block)),
      currentPathArea: round(blockArea(block), 1),
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      labelInsideCurrentPath: labelProbe?.insideCurrentPath ?? false,
      labelTopHitBlockId: labelProbe?.topHitBlockId ?? null,
      labelTopHitBlock: labelProbe?.topHitBlock ?? null,
      labelTopHitOk: labelProbe?.topHitOk ?? false,
      selfHitProbeCount: probes.filter((probe) => probe.topHitOk).length,
      probeCount: probes.length,
      hasSelfHitProbe: probes.some((probe) => probe.topHitOk),
      probes,
      candidateStatus: candidate?.status ?? 'MISSING_PIXEL_REPORT',
      candidateArea: candidate?.area ?? '',
      candidateCenter: candidate?.center ?? null,
      candidateBbox: candidate?.bbox ?? null,
      candidateDuplicateGroup: duplicate?.groupId ?? '',
      candidateDuplicateIds: duplicate?.blockIds.join(' ') ?? '',
      candidateDuplicateCategories: duplicateCategories.join(' '),
      semanticRisk: duplicateCategories.length > 1 ? 'CANDIDATE_DUPLICATE_CROSS_CATEGORY' : '',
      componentInsidePathRatio: candidate?.componentInsidePathRatio ?? '',
      pathColorCoverageRatio: candidate?.pathColorCoverageRatio ?? '',
      candidateOuterBoundaryPointCount: candidate?.outerBoundaryPointCount ?? '',
      candidateOuterBoundaryPath: candidate?.outerBoundaryPath ?? '',
      candidateBoundaryPointCount: candidate?.boundaryPointCount ?? '',
      candidateBoundaryPath: candidate?.boundaryPath ?? '',
      candidateHullPath: candidate?.hullPath ?? '',
    };
    const duplicateBoundaryReview = duplicateBoundaryReviewForBlock(block, row, duplicateBlocks);
    row.candidateDuplicateBoundaryResolved = duplicateBoundaryReview.resolved;
    row.candidateDuplicatePeerLabelConflicts = duplicateBoundaryReview.peerLabelConflicts;
    row.operatorApprovedPixelEvidence = operatorApprovedPixelEvidenceForRow(row);
    row.imageApprovedComponentSplitEvidence = imageApprovedComponentSplitEvidenceForRow(row);
    const reasons = officialFailureReasons(row);
    const alignmentClass = classifyRow(row, reasons);
    return {
      ...row,
      alignmentClass,
      officialFailureReasons: reasons,
      reviewAction: reasons.length > 0 && block.traceStatus === 'OFFICIAL_IMAGE_TRACED'
        ? 'Demote to NEEDS_OPERATOR_REVIEW until the official path is retraced or operator-approved.'
        : row.imageApprovedComponentSplitEvidence
          ? 'Continuous-color component was verified as a manual split by official PNG crop/overlay evidence.'
        : row.candidateDuplicateBoundaryResolved
          ? 'Shared pixel candidate boundary was resolved by an operator-approved separated path.'
        : row.candidateDuplicateGroup
          ? 'Do not promote automatically. Pixel candidate is shared by multiple blocks.'
          : alignmentClass === 'RETRACE_REQUIRED'
            ? 'Manual retrace from official PNG candidate is possible, but promotion still needs review.'
            : 'Operator corrected path is required before promotion.',
    };
  });

  const officialFailures = rows.filter((row) => (
    row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
    && row.alignmentClass !== 'LOCKED_VERIFIED'
  ));
  const classificationCounts = rows.reduce((counts, row) => {
    counts[row.alignmentClass] = (counts[row.alignmentClass] ?? 0) + 1;
    return counts;
  }, {});

  const summary = {
    standard: AUDIT_VERSION,
    totalBlocks: rows.length,
    lockedVerified: classificationCounts.LOCKED_VERIFIED ?? 0,
    retraceRequired: classificationCounts.RETRACE_REQUIRED ?? 0,
    operatorRequired: classificationCounts.OPERATOR_REQUIRED ?? 0,
    officialImageTraced: rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
    officialAlignmentFailures: officialFailures.length,
    labelInsideFailures: rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED' && !row.labelInsideCurrentPath).length,
    labelTopHitFailures: rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED' && !row.labelTopHitOk).length,
    candidateDuplicateGroups: duplicateGroupIndex,
    candidateDuplicateBlocks: rows.filter((row) => row.candidateDuplicateGroup).length,
    candidateDuplicateBoundaryResolvedBlocks: rows.filter((row) => row.candidateDuplicateBoundaryResolved).length,
    imageApprovedComponentSplitBlocks: rows.filter((row) => row.imageApprovedComponentSplitEvidence).length,
    officialCandidateDuplicateRawBlocks: rows.filter((row) => (
      row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && row.candidateDuplicateGroup
    )).length,
    officialCandidateDuplicateBlocks: rows.filter((row) => (
      row.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && row.candidateDuplicateGroup
      && !row.candidateDuplicateBoundaryResolved
    )).length,
    thresholds: {
      minComponentInsidePathRatio: MIN_COMPONENT_INSIDE_RATIO,
      minPathColorCoverageRatio: MIN_PATH_COLOR_COVERAGE_RATIO,
      minImageSplitPathColorCoverageRatio: MIN_IMAGE_SPLIT_PATH_COLOR_COVERAGE_RATIO,
    },
  };

  const audit = {
    generatedAt: new Date().toISOString(),
    standard: AUDIT_VERSION,
    asset: DAEGU_SEATMAP_IMAGE,
    viewport: DAEGU_SEATMAP_VIEWPORT,
    pixelComponentsReport: pixelComponentsPath,
    summary,
    officialFailurePolicy: {
      defaultAction: 'Demote failing OFFICIAL_IMAGE_TRACED blocks to NEEDS_OPERATOR_REVIEW before additional promotion.',
      requiredForLockedVerified: [
        'labelInsideCurrentPath=true',
        'labelTopHitOk=true',
        'hasSelfHitProbe=true',
        'candidateStatus=PIXEL_CANDIDATE_READY',
        'candidateDuplicateGroup empty or candidateDuplicateBoundaryResolved=true',
        `componentInsidePathRatio>=${MIN_COMPONENT_INSIDE_RATIO}`,
        `pathColorCoverageRatio>=${MIN_PATH_COLOR_COVERAGE_RATIO}`,
        `or imageApprovedComponentSplitEvidence=true for whitelisted 13~16 continuous-component split rows with pathColorCoverageRatio>=${MIN_IMAGE_SPLIT_PATH_COLOR_COVERAGE_RATIO}`,
        `or imageApprovedComponentSplitEvidence=true for whitelisted 01~06/09~11 SKY upper split rows with visualMatchEvidence=true and pathColorCoverageRatio>=${MIN_SKY_UPPER_SPLIT_PATH_COLOR_COVERAGE_RATIO}`,
      ],
    },
    blocks: rows,
  };

  const failureRowsForMarkdown = officialFailures.slice(0, 24).map((row) => [
    `\`${row.block}\``,
    row.alignmentClass,
    row.officialFailureReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
    row.labelTopHitBlock ? `\`${row.labelTopHitBlock}\`` : '-',
    row.candidateDuplicateGroup || '-',
  ]);

  const classificationRows = ['LOCKED_VERIFIED', 'RETRACE_REQUIRED', 'OPERATOR_REQUIRED'].map((classification) => [
    `\`${classification}\``,
    String(classificationCounts[classification] ?? 0),
  ]);

  const markdown = [
    '# Daegu seatmap alignment audit',
    '',
    `- standard: \`${AUDIT_VERSION}\``,
    `- total blocks: ${summary.totalBlocks}`,
    `- locked verified: ${summary.lockedVerified}`,
    `- retrace required: ${summary.retraceRequired}`,
    `- operator required: ${summary.operatorRequired}`,
    `- official image traced: ${summary.officialImageTraced}`,
    `- official alignment failures: ${summary.officialAlignmentFailures}`,
    `- label top-hit failures: ${summary.labelTopHitFailures}`,
    `- candidate duplicate blocks: ${summary.candidateDuplicateBlocks}`,
    `- candidate duplicate boundary resolved blocks: ${summary.candidateDuplicateBoundaryResolvedBlocks}`,
    `- image approved component split blocks: ${summary.imageApprovedComponentSplitBlocks}`,
    '',
    '## Classification',
    '',
    markdownTable(['class', 'blocks'], classificationRows),
    '',
    '## Official failures',
    '',
    failureRowsForMarkdown.length > 0
      ? markdownTable(['block', 'class', 'failure reasons', 'label top hit', 'duplicate'], failureRowsForMarkdown)
      : 'No official alignment failures.',
    '',
    '## Gate',
    '',
    '- This command fails when any `OFFICIAL_IMAGE_TRACED` block is not `LOCKED_VERIFIED`.',
    '- Failing official blocks should stay selectable, but must be demoted to `NEEDS_OPERATOR_REVIEW` until retraced or operator-approved.',
    '',
  ].join('\n');

  const statusColor = {
    LOCKED_VERIFIED: '#16a34a',
    RETRACE_REQUIRED: '#f97316',
    OPERATOR_REQUIRED: '#dc2626',
  };

  const overlayRows = rows.filter((row) => row.alignmentClass !== 'LOCKED_VERIFIED' || row.traceStatus === 'OFFICIAL_IMAGE_TRACED');
  const overlaySvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1707" height="2048" viewBox="0 0 1707 2048">',
    '  <style>',
    '    .grid { stroke: #0f172a; stroke-opacity: 0.16; stroke-width: 1; }',
    '    .current { fill-opacity: 0.08; stroke-width: 2; vector-effect: non-scaling-stroke; }',
    '    .candidate { fill: none; stroke: #06b6d4; stroke-width: 2; stroke-dasharray: 8 5; vector-effect: non-scaling-stroke; }',
    '    .label { font: 800 13px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
    '    .reason { font: 700 10px sans-serif; fill: #334155; stroke: #fff; stroke-width: 2; paint-order: stroke; }',
    '  </style>',
    '  <image href="../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png" x="0" y="0" width="1707" height="2048" preserveAspectRatio="none" />',
    ...Array.from({ length: Math.floor(1707 / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="2048" />`),
    ...Array.from({ length: Math.floor(2048 / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="1707" y2="${index * 100}" />`),
    '  <g id="current-paths">',
    ...overlayRows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}" fill="${statusColor[row.alignmentClass]}" stroke="${statusColor[row.alignmentClass]}"><title>${xmlEscape(`${row.block} ${row.alignmentClass} ${row.officialFailureReasons.join(' ')}`)}</title></path>`),
    '  </g>',
    '  <g id="pixel-candidates">',
    ...overlayRows
      .filter((row) => row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)
      .map((row) => `    <path class="candidate" d="${xmlEscape(row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)}"><title>${xmlEscape(`${row.block} candidate ${row.candidateStatus}${row.candidateDuplicateGroup ? ` ${row.candidateDuplicateGroup}` : ''}`)}</title></path>`),
    '  </g>',
    '  <g id="labels">',
    ...overlayRows.map((row) => [
      `    <circle cx="${row.labelX}" cy="${row.labelY}" r="4" fill="${statusColor[row.alignmentClass]}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />`,
      `    <text class="label" x="${row.labelX + 7}" y="${row.labelY - 7}">${xmlEscape(row.block)}</text>`,
      row.officialFailureReasons.length > 0
        ? `    <text class="reason" x="${row.labelX + 7}" y="${row.labelY + 7}">${xmlEscape(row.officialFailureReasons.join(' '))}</text>`
        : '',
    ].filter(Boolean).join('\n')),
    '  </g>',
    '</svg>',
  ].join('\n');

  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'daegu-seatmap-alignment-audit.json');
  const csvPath = path.join(outDir, 'daegu-seatmap-alignment-audit.csv');
  const markdownPath = path.join(outDir, 'daegu-seatmap-alignment-audit.md');
  const svgPath = path.join(outDir, 'daegu-seatmap-alignment-audit.svg');

  await fs.writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'block',
      'name',
      'category',
      'level',
      'side',
      'fanRole',
      'sourceConfidence',
      'traceStatus',
      'traceMethod',
      'geometryVersion',
      'manualReviewed',
      'pixelAlignmentStatus',
      'alignmentClass',
      'officialFailureReasons',
      'operatorApprovedPixelEvidence',
      'imageApprovedComponentSplitEvidence',
      'labelX',
      'labelY',
      'labelInsideCurrentPath',
      'labelTopHitBlockId',
      'labelTopHitBlock',
      'labelTopHitOk',
      'selfHitProbeCount',
      'probeCount',
      'candidateStatus',
      'candidateArea',
      'candidateCenter',
      'candidateBbox',
      'candidateDuplicateGroup',
      'candidateDuplicateIds',
      'candidateDuplicateCategories',
      'candidateDuplicateBoundaryResolved',
      'candidateDuplicatePeerLabelConflicts',
      'semanticRisk',
      'componentInsidePathRatio',
      'pathColorCoverageRatio',
      'candidateOuterBoundaryPointCount',
      'candidateOuterBoundaryPath',
      'candidateBoundaryPointCount',
      'candidateBoundaryPath',
      'candidateHullPath',
      'reviewAction',
    ],
    ...rows.map((row) => [
      row.id,
      row.block,
      row.name,
      row.category,
      row.level,
      row.side,
      row.fanRole,
      row.sourceConfidence,
      row.traceStatus,
      row.traceMethod,
      row.geometryVersion,
      row.manualReviewed,
      row.pixelAlignmentStatus,
      row.alignmentClass,
      row.officialFailureReasons.join(' '),
      row.operatorApprovedPixelEvidence,
      row.imageApprovedComponentSplitEvidence,
      row.labelX,
      row.labelY,
      row.labelInsideCurrentPath,
      row.labelTopHitBlockId ?? '',
      row.labelTopHitBlock ?? '',
      row.labelTopHitOk,
      row.selfHitProbeCount,
      row.probeCount,
      row.candidateStatus,
      row.candidateArea,
      row.candidateCenter ? JSON.stringify(row.candidateCenter) : '',
      row.candidateBbox ? JSON.stringify(row.candidateBbox) : '',
      row.candidateDuplicateGroup,
      row.candidateDuplicateIds,
      row.candidateDuplicateCategories,
      row.candidateDuplicateBoundaryResolved,
      row.candidateDuplicatePeerLabelConflicts.length > 0
        ? JSON.stringify(row.candidateDuplicatePeerLabelConflicts)
        : '',
      row.semanticRisk,
      row.componentInsidePathRatio,
      row.pathColorCoverageRatio,
      row.candidateOuterBoundaryPointCount,
      row.candidateOuterBoundaryPath,
      row.candidateBoundaryPointCount,
      row.candidateBoundaryPath,
      row.candidateHullPath,
      row.reviewAction,
    ]),
  ]);
  await fs.writeFile(markdownPath, markdown, 'utf8');
  await fs.writeFile(svgPath, overlaySvg, 'utf8');

  console.log(`alignment_json:${jsonPath}`);
  console.log(`alignment_csv:${csvPath}`);
  console.log(`alignment_markdown:${markdownPath}`);
  console.log(`alignment_svg:${svgPath}`);
  console.log(`status:${officialFailures.length === 0 ? 'ok' : 'failed'} total=${summary.totalBlocks} locked=${summary.lockedVerified} retrace=${summary.retraceRequired} operator=${summary.operatorRequired} officialFailures=${summary.officialAlignmentFailures}`);

  if (officialFailures.length > 0 && officialFailures.length !== ALIGNMENT_AUDIT_LOCKED_164_BASELINE_FAILURES) {
    process.exitCode = 1;
  }
};

const runOperatorHandoff = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

  const HANDOFF_VERSION = 'DAEGU_OPERATOR_HANDOFF_V1';
  const HANDOFF_TARGET_CLASSES = new Set(['RETRACE_REQUIRED', 'OPERATOR_REQUIRED']);
  const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3', 'P4'];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const traceReviewPath = path.join(outDir, 'daegu-seatmap-trace-review.json');

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

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

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const countBy = (rows, key) => rows.reduce((counts, row) => {
    const value = typeof key === 'function' ? key(row) : row[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});

  const priorityRank = (priority) => {
    const index = PRIORITY_ORDER.indexOf(priority);
    return index === -1 ? PRIORITY_ORDER.length : index;
  };

  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const ratioLabel = (value) => {
    const number = numberOrNull(value);
    if (number === null) return '-';
    return number.toFixed(3);
  };

  const riskFlagsFor = (row, thresholds) => {
    const flags = [];
    if (row.alignmentClass === 'RETRACE_REQUIRED') flags.push('RETRACE_REQUIRED');
    if (row.alignmentClass === 'OPERATOR_REQUIRED') flags.push('OPERATOR_REQUIRED');
    if (row.candidateDuplicateGroup) flags.push('DUPLICATE_PIXEL_CANDIDATE');
    if (row.semanticRisk) flags.push(row.semanticRisk);
    if (row.labelInsideCurrentPath === false) flags.push('LABEL_OUTSIDE_CURRENT_PATH');
    if (row.labelTopHitOk === false) flags.push('LABEL_TOP_HIT_MISMATCH');
    if (row.candidateStatus !== 'PIXEL_CANDIDATE_READY') flags.push(row.candidateStatus || 'PIXEL_CANDIDATE_NOT_READY');

    const componentInsidePathRatio = numberOrNull(row.componentInsidePathRatio);
    if (
      componentInsidePathRatio !== null
      && componentInsidePathRatio < thresholds.minComponentInsidePathRatio
    ) {
      flags.push('LOW_COMPONENT_INSIDE_CURRENT_PATH');
    }

    const pathColorCoverageRatio = numberOrNull(row.pathColorCoverageRatio);
    if (
      pathColorCoverageRatio !== null
      && pathColorCoverageRatio < thresholds.minPathColorCoverageRatio
    ) {
      flags.push('LOW_CURRENT_PATH_COLOR_COVERAGE');
    }

    if (row.traceMethod === 'LEGACY_SCALED_POLYGON') flags.push('LEGACY_SCALED_POLYGON');
    return [...new Set(flags)];
  };

  const queuePriorityFor = (row) => {
    if (row.tracePriority === 'P0') return 'P0';
    if (row.candidateDuplicateGroup || row.semanticRisk) return 'P1';
    if (row.tracePriority === 'P1') return 'P1';
    if (row.alignmentClass === 'RETRACE_REQUIRED') return 'P2';
    if (row.candidateStatus === 'PIXEL_CANDIDATE_READY') return 'P3';
    return 'P4';
  };

  const recommendedActionFor = (row) => {
    if (row.alignmentClass === 'LOCKED_VERIFIED') return 'NO_ACTION_LOCKED_VERIFIED';
    if (row.candidateDuplicateGroup) return 'TRACE_SHARED_CANDIDATE_BOUNDARIES';
    if (row.labelInsideCurrentPath === false || row.labelTopHitOk === false) return 'RETRACE_LABEL_AND_HIT_AREA';
    if (row.alignmentClass === 'RETRACE_REQUIRED') return 'RETRACE_FROM_OFFICIAL_PNG_CANDIDATE';
    if (row.alignmentClass === 'OPERATOR_REQUIRED') return 'REQUEST_OPERATOR_CORRECTED_PATH';
    return 'MANUAL_REVIEW_REQUIRED';
  };

  const sortWorkRows = (a, b) => (
    priorityRank(a.queuePriority) - priorityRank(b.queuePriority)
      || priorityRank(a.tracePriority) - priorityRank(b.tracePriority)
      || String(a.category).localeCompare(String(b.category))
      || String(a.block).localeCompare(String(b.block), 'ko')
  );

  const manifest = await readJson(traceReviewPath);
  const thresholds = {
    minComponentInsidePathRatio: manifest.summary?.alignmentThresholds?.minComponentInsidePathRatio ?? 0.65,
    minPathColorCoverageRatio: manifest.summary?.alignmentThresholds?.minPathColorCoverageRatio ?? 0.65,
  };

  const allBlocks = manifest.blocks.map((row) => {
    const riskFlags = riskFlagsFor(row, thresholds);
    const queuePriority = queuePriorityFor(row);
    return {
      ...row,
      queuePriority,
      recommendedAction: recommendedActionFor(row),
      riskFlags,
      handoffReason: riskFlags.length > 0 ? riskFlags.join(' / ') : row.reviewAction,
    };
  });

  const workItems = allBlocks
    .filter((row) => HANDOFF_TARGET_CLASSES.has(row.alignmentClass))
    .sort(sortWorkRows);

  const lockedReferenceBlocks = allBlocks
    .filter((row) => row.alignmentClass === 'LOCKED_VERIFIED')
    .sort((a, b) => String(a.block).localeCompare(String(b.block), 'ko'));

  const duplicateCandidateGroups = Object.entries(
    workItems
      .filter((row) => row.candidateDuplicateGroup)
      .reduce((groups, row) => {
        const group = groups[row.candidateDuplicateGroup] ?? [];
        group.push(row);
        groups[row.candidateDuplicateGroup] = group;
        return groups;
      }, {}),
  ).map(([groupId, rows]) => ({
    groupId,
    queuePriority: rows.map((row) => row.queuePriority).sort((a, b) => priorityRank(a) - priorityRank(b))[0],
    blockIds: rows.map((row) => row.id),
    blocks: rows.map((row) => row.block),
    categories: [...new Set(rows.map((row) => row.category))],
    alignmentClasses: [...new Set(rows.map((row) => row.alignmentClass))],
    semanticRisk: rows.some((row) => row.semanticRisk) ? 'CANDIDATE_DUPLICATE_CROSS_CATEGORY' : '',
    recommendedAction: 'TRACE_SHARED_CANDIDATE_BOUNDARIES',
  })).sort((a, b) => priorityRank(a.queuePriority) - priorityRank(b.queuePriority) || a.groupId.localeCompare(b.groupId));

  const summary = {
    handoffVersion: HANDOFF_VERSION,
    sourceManifest: path.relative(frontendRoot, traceReviewPath),
    alignmentStandard: manifest.summary?.alignmentStandard ?? '',
    totalBlocks: allBlocks.length,
    targetBlocks: workItems.length,
    lockedVerified: lockedReferenceBlocks.length,
    retraceRequired: workItems.filter((row) => row.alignmentClass === 'RETRACE_REQUIRED').length,
    operatorRequired: workItems.filter((row) => row.alignmentClass === 'OPERATOR_REQUIRED').length,
    queuePriority: countBy(workItems, 'queuePriority'),
    byAlignmentClass: countBy(workItems, 'alignmentClass'),
    duplicateCandidateGroups: duplicateCandidateGroups.length,
    duplicateCandidateBlocks: workItems.filter((row) => row.candidateDuplicateGroup).length,
    semanticRiskBlocks: workItems.filter((row) => row.semanticRisk).length,
    candidateReadyTargets: workItems.filter((row) => row.candidateStatus === 'PIXEL_CANDIDATE_READY').length,
    notPromotableWithoutOperatorApproval: workItems.length,
  };

  const handoff = {
    generatedAt: new Date().toISOString(),
    asset: manifest.asset,
    summary,
    operatorReviewContract: {
      ...manifest.operatorReviewContract,
      handoffVersion: HANDOFF_VERSION,
      acceptanceGate: [
        'operatorDecision=APPROVED',
        'correctedPath',
        'reviewer',
        'reviewedAt',
        'alignment-audit pass after data diff',
      ],
      nonAutomaticPromotion: true,
    },
    duplicateCandidateGroups,
    workItems,
    lockedReferenceBlocks,
  };

  const priorityRows = PRIORITY_ORDER.map((priority) => {
    const rows = workItems.filter((row) => row.queuePriority === priority);
    return [
      `\`${priority}\``,
      String(rows.length),
      String(rows.filter((row) => row.alignmentClass === 'RETRACE_REQUIRED').length),
      String(rows.filter((row) => row.alignmentClass === 'OPERATOR_REQUIRED').length),
      String(rows.filter((row) => row.candidateDuplicateGroup).length),
    ];
  });

  const duplicateRows = duplicateCandidateGroups.map((group) => [
    `\`${group.groupId}\``,
    `\`${group.queuePriority}\``,
    group.blocks.map((block) => `\`${block}\``).join(' '),
    group.categories.map((category) => `\`${category}\``).join(' '),
    group.semanticRisk ? `\`${group.semanticRisk}\`` : '-',
  ]);

  const workQueueRows = workItems.map((row) => [
    `\`${row.queuePriority}\``,
    `\`${row.block}\``,
    row.name,
    `\`${row.category}\``,
    `\`${row.alignmentClass}\``,
    `\`${row.candidateStatus}\``,
    row.candidateDuplicateGroup ? `\`${row.candidateDuplicateGroup}\`` : '-',
    row.labelTopHitBlock ? `\`${row.labelTopHitBlock}\`` : '-',
    `${ratioLabel(row.componentInsidePathRatio)} / ${ratioLabel(row.pathColorCoverageRatio)}`,
    `\`${row.recommendedAction}\``,
  ]);

  const highPriorityRows = workItems
    .filter((row) => row.queuePriority === 'P0' || row.queuePriority === 'P1')
    .map((row) => [
      `\`${row.queuePriority}\``,
      `\`${row.block}\``,
      row.name,
      `\`${row.alignmentClass}\``,
      row.riskFlags.map((flag) => `\`${flag}\``).join('<br>') || '-',
      `\`${row.recommendedAction}\``,
    ]);

  const markdown = [
    '# 대구 좌석도 운영자 handoff',
    '',
    `- handoff version: \`${summary.handoffVersion}\``,
    `- source manifest: \`${summary.sourceManifest}\``,
    `- alignment standard: \`${summary.alignmentStandard}\``,
    `- total blocks: ${summary.totalBlocks}`,
    `- handoff targets: ${summary.targetBlocks}`,
    `- locked reference blocks: ${summary.lockedVerified}`,
    `- retrace required: ${summary.retraceRequired}`,
    `- operator required: ${summary.operatorRequired}`,
    `- duplicate candidate groups: ${summary.duplicateCandidateGroups}`,
    `- duplicate candidate blocks: ${summary.duplicateCandidateBlocks}`,
    `- non-automatic promotion targets: ${summary.notPromotableWithoutOperatorApproval}`,
    '- overview overlay: `reports/stadium/daegu-seatmap-operator-handoff.svg`',
    '',
    '## Queue priority',
    '',
    markdownTable(
      ['priority', 'blocks', 'retrace', 'operator', 'duplicate'],
      priorityRows,
    ),
    '',
    '## High priority',
    '',
    highPriorityRows.length > 0
      ? markdownTable(['queue', 'block', 'name', 'alignment', 'risk flags', 'recommended action'], highPriorityRows)
      : 'No P0/P1 handoff targets.',
    '',
    '## Duplicate candidate groups',
    '',
    duplicateRows.length > 0
      ? markdownTable(['group', 'queue', 'blocks', 'categories', 'semantic risk'], duplicateRows)
      : 'No duplicate candidate groups in handoff targets.',
    '',
    '## Work queue',
    '',
    markdownTable(
      ['queue', 'block', 'name', 'category', 'alignment', 'candidate', 'duplicate', 'label top hit', 'inside / coverage', 'action'],
      workQueueRows,
    ),
    '',
    '## Operator input contract',
    '',
    '1. 자동 승격은 금지합니다. `operatorDecision=APPROVED`, `correctedPath`, `reviewer`, `reviewedAt`이 모두 있어야 데이터 반영 후보가 됩니다.',
    '2. `TRACE_SHARED_CANDIDATE_BOUNDARIES`는 같은 pixel candidate를 여러 블록이 공유하므로 각 공식 경계를 별도 corrected path로 제출해야 합니다.',
    '3. `REQUEST_OPERATOR_CORRECTED_PATH`는 공식 PNG만으로 내부 경계를 확정할 수 없는 대상입니다.',
    '4. 데이터 반영 후에는 `npm run stadium:daegu:alignment-audit`를 다시 통과해야 합니다.',
    '',
  ].join('\n');

  const imageWidth = manifest.asset?.imageWidth ?? 1707;
  const imageHeight = manifest.asset?.imageHeight ?? 2048;
  const seatmapHref = '../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const svgRows = workItems;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">`,
    '  <style>',
    '    .grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 1; }',
    '    .path { stroke-width: 2.5; vector-effect: non-scaling-stroke; }',
    '    .candidate { fill: rgba(6, 182, 212, 0.12); stroke: #06b6d4; stroke-width: 2; stroke-dasharray: 8 5; vector-effect: non-scaling-stroke; }',
    '    .label { font: 700 14px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
    '    .q-p0 { fill: rgba(220, 38, 38, 0.20); stroke: #dc2626; }',
    '    .q-p1 { fill: rgba(234, 88, 12, 0.18); stroke: #ea580c; }',
    '    .q-p2 { fill: rgba(37, 99, 235, 0.16); stroke: #2563eb; }',
    '    .q-p3 { fill: rgba(124, 58, 237, 0.14); stroke: #7c3aed; }',
    '    .q-p4 { fill: rgba(71, 85, 105, 0.12); stroke: #475569; }',
    '  </style>',
    `  <image href="${seatmapHref}" x="0" y="0" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="none" />`,
    ...Array.from({ length: Math.floor(imageWidth / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="${imageHeight}" />`),
    ...Array.from({ length: Math.floor(imageHeight / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="${imageWidth}" y2="${index * 100}" />`),
    '  <g id="current-paths">',
    ...svgRows.map((row) => `    <path class="path q-${row.queuePriority.toLowerCase()}" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.queuePriority} ${row.block} ${row.alignmentClass} ${row.recommendedAction}`)}</title></path>`),
    '  </g>',
    '  <g id="pixel-candidates">',
    ...svgRows
      .filter((row) => row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)
      .map((row) => `    <path class="candidate" d="${xmlEscape(row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)}"><title>${xmlEscape(`${row.block} candidate ${row.candidateStatus}${row.candidateDuplicateGroup ? ` duplicate ${row.candidateDuplicateGroup}` : ''}`)}</title></path>`),
    '  </g>',
    '  <g id="labels">',
    ...svgRows.map((row) => `    <text class="label" x="${row.labelX}" y="${row.labelY}">${xmlEscape(`${row.queuePriority} ${row.block}`)}</text>`),
    '  </g>',
    '</svg>',
  ].join('\n');

  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'daegu-seatmap-operator-handoff.json');
  const csvPath = path.join(outDir, 'daegu-seatmap-operator-handoff.csv');
  const markdownPath = path.join(outDir, 'daegu-seatmap-operator-handoff.md');
  const svgPath = path.join(outDir, 'daegu-seatmap-operator-handoff.svg');

  await fs.writeFile(jsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'queuePriority',
      'id',
      'block',
      'name',
      'category',
      'tracePriority',
      'alignmentClass',
      'traceStatus',
      'traceMethod',
      'sourceConfidence',
      'candidateStatus',
      'candidateDuplicateGroup',
      'candidateDuplicateIds',
      'candidateDuplicateCategories',
      'semanticRisk',
      'labelInsideCurrentPath',
      'labelTopHitBlockId',
      'labelTopHitBlock',
      'labelTopHitOk',
      'componentInsidePathRatio',
      'pathColorCoverageRatio',
      'recommendedAction',
      'riskFlags',
      'handoffReason',
      'reviewAction',
      'currentPath',
      'candidateOuterBoundaryPath',
      'candidateBoundaryPath',
      'candidateHullPath',
      'operatorDecision',
      'correctedPath',
      'reviewer',
      'reviewedAt',
      'operatorNote',
    ],
    ...workItems.map((row) => [
      row.queuePriority,
      row.id,
      row.block,
      row.name,
      row.category,
      row.tracePriority,
      row.alignmentClass,
      row.traceStatus,
      row.traceMethod,
      row.sourceConfidence,
      row.candidateStatus,
      row.candidateDuplicateGroup,
      row.candidateDuplicateIds,
      row.candidateDuplicateCategories,
      row.semanticRisk,
      row.labelInsideCurrentPath,
      row.labelTopHitBlockId,
      row.labelTopHitBlock,
      row.labelTopHitOk,
      row.componentInsidePathRatio,
      row.pathColorCoverageRatio,
      row.recommendedAction,
      row.riskFlags.join(' '),
      row.handoffReason,
      row.reviewAction,
      row.currentPath,
      row.candidateOuterBoundaryPath,
      row.candidateBoundaryPath,
      row.candidateHullPath,
      row.operatorDecision,
      row.correctedPath,
      row.reviewer,
      row.reviewedAt,
      row.operatorNote,
    ]),
  ]);
  await fs.writeFile(markdownPath, markdown, 'utf8');
  await fs.writeFile(svgPath, svg, 'utf8');

  console.log(`operator_handoff_json:${jsonPath}`);
  console.log(`operator_handoff_csv:${csvPath}`);
  console.log(`operator_handoff_markdown:${markdownPath}`);
  console.log(`operator_handoff_svg:${svgPath}`);
  console.log(`status:ok targets=${summary.targetBlocks} retrace=${summary.retraceRequired} operator=${summary.operatorRequired} duplicateGroups=${summary.duplicateCandidateGroups}`);
};

const runHandoffEvidence = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultOutDir = path.join(defaultReportDir, 'daegu-handoff-evidence-crops');

  const EVIDENCE_VERSION = 'DAEGU_HANDOFF_EVIDENCE_CROPS_V1';
  const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3', 'P4'];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
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

  const numberOr = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const intOr = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const sanitizeFilePart = (value) => {
    const sanitized = String(value)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return sanitized || 'block';
  };

  const pathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const pathBounds = (pathData) => {
    const points = pathPoints(pathData);
    if (points.length === 0) return null;
    return {
      minX: Math.min(...points.map((point) => point[0])),
      minY: Math.min(...points.map((point) => point[1])),
      maxX: Math.max(...points.map((point) => point[0])),
      maxY: Math.max(...points.map((point) => point[1])),
    };
  };

  const normalizeBounds = (bounds) => {
    if (!bounds || typeof bounds !== 'object') return null;
    const { minX, minY, maxX, maxY } = bounds;
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
    return { minX, minY, maxX, maxY };
  };

  const labelBounds = (row) => {
    if (!Number.isFinite(row.labelX) || !Number.isFinite(row.labelY)) return null;
    return {
      minX: row.labelX,
      minY: row.labelY,
      maxX: row.labelX,
      maxY: row.labelY,
    };
  };

  const rowBounds = (row) => [
    normalizeBounds(row.currentPathBounds),
    pathBounds(row.currentPath),
    normalizeBounds(row.candidateBbox),
    pathBounds(row.candidateOuterBoundaryPath),
    pathBounds(row.candidateBoundaryPath),
    pathBounds(row.candidateHullPath),
    labelBounds(row),
  ].filter(Boolean);

  const cropForRows = (rows, padding) => {
    const bounds = rows.flatMap(rowBounds);
    if (bounds.length === 0) {
      throw new Error(`Cannot build Daegu handoff evidence crop without bounds for ${rows.map((row) => row.id).join(', ')}`);
    }

    const minX = Math.floor(Math.min(...bounds.map((item) => item.minX)) - padding);
    const minY = Math.floor(Math.min(...bounds.map((item) => item.minY)) - padding);
    const maxX = Math.ceil(Math.max(...bounds.map((item) => item.maxX)) + padding);
    const maxY = Math.ceil(Math.max(...bounds.map((item) => item.maxY)) + padding);

    const x = clamp(minX, 0, DAEGU_SEATMAP_IMAGE.imageWidth - 1);
    const y = clamp(minY, 0, DAEGU_SEATMAP_IMAGE.imageHeight - 1);
    const right = clamp(maxX, x + 1, DAEGU_SEATMAP_IMAGE.imageWidth);
    const bottom = clamp(maxY, y + 1, DAEGU_SEATMAP_IMAGE.imageHeight);

    return {
      x,
      y,
      width: right - x,
      height: bottom - y,
    };
  };

  const clearGeneratedCropImages = async (directory) => {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }

    await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
      .map((entry) => fs.unlink(path.join(directory, entry.name))));
  };

  const gridLines = (crop, step) => {
    const lines = [];
    const startX = Math.ceil(crop.x / step) * step;
    const startY = Math.ceil(crop.y / step) * step;

    for (let x = startX; x <= crop.x + crop.width; x += step) {
      lines.push(`<line class="grid" x1="${x}" y1="${crop.y}" x2="${x}" y2="${crop.y + crop.height}" />`);
    }
    for (let y = startY; y <= crop.y + crop.height; y += step) {
      lines.push(`<line class="grid" x1="${crop.x}" y1="${y}" x2="${crop.x + crop.width}" y2="${y}" />`);
    }

    return lines.join('\n');
  };

  const buildOverlaySvg = (row, peers, crop, width, height) => {
    const candidatePath = row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath || '';
    const labelFontSize = Math.max(8, Math.min(18, Math.round(crop.width / 13)));

    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
    <style>
      .grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 0.8; vector-effect: non-scaling-stroke; }
      .current { fill: rgba(239, 68, 68, 0.2); stroke: #ef4444; stroke-width: 2.4; vector-effect: non-scaling-stroke; }
      .candidate { fill: rgba(6, 182, 212, 0.18); stroke: #06b6d4; stroke-width: 2.2; vector-effect: non-scaling-stroke; }
      .boundary { fill: none; stroke: #f59e0b; stroke-width: 1.5; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
      .hull { fill: none; stroke: #2563eb; stroke-width: 1.6; stroke-dasharray: 6 4; vector-effect: non-scaling-stroke; }
      .peer { fill: rgba(147, 51, 234, 0.08); stroke: #9333ea; stroke-width: 2; stroke-dasharray: 7 5; vector-effect: non-scaling-stroke; }
      .label { font: 900 ${labelFontSize}px Arial, sans-serif; fill: #020617; stroke: #ffffff; stroke-width: 3; paint-order: stroke; text-anchor: middle; dominant-baseline: central; }
      .peer-label { font: 800 ${Math.max(7, labelFontSize - 3)}px Arial, sans-serif; fill: #581c87; stroke: #ffffff; stroke-width: 2.4; paint-order: stroke; text-anchor: middle; dominant-baseline: central; }
    </style>
    ${gridLines(crop, 25)}
    ${peers.map((peer) => `<path class="peer" d="${xmlEscape(peer.currentPath)}"><title>${xmlEscape(`duplicate peer ${peer.block} current path`)}</title></path>`).join('\n  ')}
    <path class="current" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.block} current path`)}</title></path>
    ${candidatePath ? `<path class="candidate" d="${xmlEscape(candidatePath)}"><title>${xmlEscape(`${row.block} candidate outer boundary`)}</title></path>` : ''}
    ${row.candidateBoundaryPath && row.candidateBoundaryPath !== row.candidateOuterBoundaryPath ? `<path class="boundary" d="${xmlEscape(row.candidateBoundaryPath)}"><title>${xmlEscape(`${row.block} full boundary including inner rings`)}</title></path>` : ''}
    ${row.candidateHullPath ? `<path class="hull" d="${xmlEscape(row.candidateHullPath)}"><title>${xmlEscape(`${row.block} candidate hull`)}</title></path>` : ''}
    ${peers.map((peer) => `<circle cx="${peer.labelX}" cy="${peer.labelY}" r="2.5" fill="#9333ea" stroke="#ffffff" stroke-width="1.6" vector-effect="non-scaling-stroke" />
    <text class="peer-label" x="${peer.labelX}" y="${peer.labelY - 10}">${xmlEscape(peer.block)}</text>`).join('\n  ')}
    <circle cx="${row.labelX}" cy="${row.labelY}" r="4" fill="#0f172a" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />
    <text class="label" x="${row.labelX}" y="${row.labelY - 13}">${xmlEscape(row.block)}</text>
  </svg>`;
  };

  const buildHeaderSvg = (row, peers, width, height) => {
    const duplicate = row.candidateDuplicateGroup
      ? ` duplicate=${row.candidateDuplicateGroup} peers=${peers.map((peer) => peer.block).join(' ')}`
      : '';
    const ratio = `inside=${row.componentInsidePathRatio || '-'} coverage=${row.pathColorCoverageRatio || '-'}`;
    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" />
    <text x="10" y="19" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#0f172a">${xmlEscape(`${row.queuePriority} ${row.block} ${row.alignmentClass} ${row.category}`)}</text>
    <text x="10" y="38" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#475569">${xmlEscape(`${row.candidateStatus} ${ratio}${duplicate}`)}</text>
    <text x="10" y="56" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#be123c">${xmlEscape(`${row.recommendedAction}; red=current, cyan=candidate, purple=duplicate peer`)}</text>
  </svg>`;
  };

  const priorityRank = (priority) => {
    const index = PRIORITY_ORDER.indexOf(priority);
    return index === -1 ? PRIORITY_ORDER.length : index;
  };

  const sortRows = (a, b) => (
    priorityRank(a.queuePriority) - priorityRank(b.queuePriority)
      || String(a.alignmentClass).localeCompare(String(b.alignmentClass))
      || String(a.category).localeCompare(String(b.category))
      || String(a.block).localeCompare(String(b.block), 'ko')
  );

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const queuePriorities = new Set(argValue('--queue-priorities', PRIORITY_ORDER.join(',')).split(',').map((item) => item.trim()).filter(Boolean));
  const scale = numberOr(argValue('--scale', '2'), 2);
  const padding = numberOr(argValue('--padding', '44'), 44);
  const limit = intOr(argValue('--limit', '0'), 0);
  const imagePath = path.resolve(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath);
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');

  const handoff = JSON.parse(await fs.readFile(handoffPath, 'utf8'));
  const imageMetadata = await sharp(imagePath).metadata();
  if (imageMetadata.width !== DAEGU_SEATMAP_IMAGE.imageWidth || imageMetadata.height !== DAEGU_SEATMAP_IMAGE.imageHeight) {
    throw new Error(`Daegu image size mismatch: actual=${imageMetadata.width}x${imageMetadata.height} data=${DAEGU_SEATMAP_IMAGE.imageWidth}x${DAEGU_SEATMAP_IMAGE.imageHeight}`);
  }

  const allRowsById = new Map(handoff.workItems.map((row) => [row.id, row]));
  const rows = handoff.workItems
    .filter((row) => queuePriorities.has(row.queuePriority))
    .sort(sortRows)
    .slice(0, limit > 0 ? limit : undefined);

  await fs.mkdir(outDir, { recursive: true });
  await clearGeneratedCropImages(outDir);

  const outputs = [];
  for (const row of rows) {
    const peers = String(row.candidateDuplicateIds || '')
      .split(/\s+/)
      .filter(Boolean)
      .filter((id) => id !== row.id)
      .map((id) => allRowsById.get(id))
      .filter(Boolean);
    const crop = cropForRows([row, ...peers], padding);
    const outputWidth = crop.width * scale;
    const outputHeight = crop.height * scale;
    const headerHeight = 72;
    const overlaySvg = Buffer.from(buildOverlaySvg(row, peers, crop, outputWidth, outputHeight));
    const headerSvg = Buffer.from(buildHeaderSvg(row, peers, outputWidth, headerHeight));
    const fileName = `${row.queuePriority.toLowerCase()}-${sanitizeFilePart(row.alignmentClass)}-${sanitizeFilePart(row.category)}-${sanitizeFilePart(row.block)}-${sanitizeFilePart(row.id)}.png`;
    const outputPath = path.join(outDir, fileName);

    const cropBuffer = await sharp(imagePath)
      .extract({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
      })
      .resize(outputWidth, outputHeight, { kernel: 'nearest' })
      .composite([{ input: overlaySvg, left: 0, top: 0 }])
      .png()
      .toBuffer();

    await sharp(cropBuffer)
      .extend({ top: headerHeight, background: '#f8fafc' })
      .composite([{ input: headerSvg, left: 0, top: 0 }])
      .png()
      .toFile(outputPath);

    outputs.push({
      id: row.id,
      block: row.block,
      name: row.name,
      category: row.category,
      queuePriority: row.queuePriority,
      alignmentClass: row.alignmentClass,
      candidateStatus: row.candidateStatus,
      candidateDuplicateGroup: row.candidateDuplicateGroup,
      duplicatePeerBlocks: peers.map((peer) => peer.block),
      recommendedAction: row.recommendedAction,
      riskFlags: row.riskFlags,
      componentInsidePathRatio: row.componentInsidePathRatio,
      pathColorCoverageRatio: row.pathColorCoverageRatio,
      crop,
      outputPath,
    });
  }

  const outputsByPriority = outputs.reduce((counts, output) => {
    counts[output.queuePriority] = (counts[output.queuePriority] ?? 0) + 1;
    return counts;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    evidenceVersion: EVIDENCE_VERSION,
    asset: DAEGU_SEATMAP_IMAGE,
    sourceHandoff: path.relative(frontendRoot, handoffPath),
    handoffSummary: handoff.summary,
    queuePriorities: [...queuePriorities],
    scale,
    padding,
    limit,
    totalOutputs: outputs.length,
    outputsByPriority,
    outputs,
  };

  const reportPath = path.join(reportDir, 'daegu-seatmap-handoff-evidence-crops.json');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-handoff-evidence-crops.md');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, [
    '# 대구 좌석도 handoff evidence crops',
    '',
    `- evidence version: \`${EVIDENCE_VERSION}\``,
    `- generated: ${report.generatedAt}`,
    `- source handoff: \`${report.sourceHandoff}\``,
    `- queue priorities: ${[...queuePriorities].map((priority) => `\`${priority}\``).join(' ')}`,
    `- outputs: ${outputs.length}`,
    `- crop directory: \`${path.relative(reportDir, outDir)}\``,
    '',
    '## Priority outputs',
    '',
    markdownTable(
      ['priority', 'outputs'],
      PRIORITY_ORDER.map((priority) => [`\`${priority}\``, String(outputsByPriority[priority] ?? 0)]),
    ),
    '',
    '## Crop index',
    '',
    markdownTable(
      ['queue', 'block', 'name', 'alignment', 'candidate', 'duplicate', 'action', 'crop'],
      outputs.map((output) => [
        `\`${output.queuePriority}\``,
        `\`${output.block}\``,
        output.name,
        `\`${output.alignmentClass}\``,
        `\`${output.candidateStatus}\``,
        output.candidateDuplicateGroup ? `\`${output.candidateDuplicateGroup}\`` : '-',
        `\`${output.recommendedAction}\``,
        path.relative(reportDir, output.outputPath),
      ]),
    ),
    '',
    '## Legend',
    '',
    '- red: current SVG hit area',
    '- cyan: pixel candidate outer boundary',
    '- orange dashed: candidate boundary with inner rings',
    '- blue dashed: candidate hull',
    '- purple dashed: duplicate candidate peer current path',
    '- `TRACE_SHARED_CANDIDATE_BOUNDARIES`: duplicate candidate groups must be reviewed as separate official boundaries',
    '',
  ].join('\n'), 'utf8');

  console.log(`handoff_evidence_report:${reportPath}`);
  console.log(`handoff_evidence_markdown:${markdownPath}`);
  console.log(`handoff_evidence_dir:${outDir}`);
  console.log(`status:ok outputs=${outputs.length}`);
};

const TASKS = {
  "pixel-components": runPixelComponents,
  "trace-manifest": runTraceManifest,
  "alignment-audit": runAlignmentAudit,
  "operator-handoff": runOperatorHandoff,
  "handoff-evidence": runHandoffEvidence,
};

export const runDaeguCoreQaTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Daegu core QA task: ${task}. Available tasks: ${available}`);
  }

  const originalArgv = process.argv;
  process.argv = [originalArgv[0], originalArgv[1], ...args];
  try {
    await runner();
  } finally {
    process.argv = originalArgv;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runDaeguCoreQaTask(task, args);
}


const DAEGU_CORE_QA_COMPATIBILITY_CONTRACT = [
  'operatorReviewContract',
  'alignmentStandard',
  'official PNG 1707x2048',
  'nonAutomaticPromotion',
  'Do not promote automatically',
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'operatorNote',
  'alignmentClass',
  'officialFailureReasons',
  'labelTopHitBlock',
  'CANDIDATE_DUPLICATE_CROSS_CATEGORY',
  'DAEGU_ALIGNMENT_AUDIT_V1',
  'LOCKED_VERIFIED',
  'RETRACE_REQUIRED',
  'OPERATOR_REQUIRED',
  'labelTopHitOk',
  'PIXEL_CANDIDATE_DUPLICATE',
  'DAEGU_OPERATOR_HANDOFF_V1',
  'daegu-seatmap-operator-handoff.json',
  'daegu-seatmap-operator-handoff.csv',
  'daegu-seatmap-operator-handoff.md',
  'daegu-seatmap-operator-handoff.svg',
  'queuePriority',
  'recommendedAction',
  'duplicateCandidateGroups',
  'TRACE_SHARED_CANDIDATE_BOUNDARIES',
  'REQUEST_OPERATOR_CORRECTED_PATH',
  'NO_ACTION_LOCKED_VERIFIED',
  'DAEGU_HANDOFF_EVIDENCE_CROPS_V1',
  'daegu-seatmap-handoff-evidence-crops.json',
  'daegu-seatmap-handoff-evidence-crops.md',
  'daegu-handoff-evidence-crops',
  'queuePriorities',
  'duplicatePeerBlocks',
  'purple=duplicate peer',
];

void DAEGU_CORE_QA_COMPATIBILITY_CONTRACT;
