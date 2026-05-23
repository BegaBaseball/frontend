import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runPixelComponents = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { SAJIK_BLOCKS, SAJIK_CATEGORIES, SAJIK_SEATMAP_IMAGE } = await import("../src/data/sajikSeatData.ts");

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

  const distanceToPolygon = (point, polygon) => polygon.reduce((minimum, current, index) => (
    Math.min(minimum, distanceToSegment(point, current, polygon[(index + 1) % polygon.length]))
  ), Number.POSITIVE_INFINITY);

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
    let componentInsideDilatedPath = 0;
    let maxComponentOutsidePathDistance = 0;
    const pathDilationTolerancePx = 1.5;
    pixels.forEach((point) => {
      const pixelCenter = [point[0] + 0.5, point[1] + 0.5];
      const insidePath = pointInPolygon(point, points);
      const distanceFromPath = insidePath ? 0 : distanceToPolygon(pixelCenter, points);
      if (insidePath) componentInsidePath += 1;
      if (insidePath || distanceFromPath <= pathDilationTolerancePx) componentInsideDilatedPath += 1;
      if (!insidePath) maxComponentOutsidePathDistance = Math.max(maxComponentOutsidePathDistance, distanceFromPath);
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
    const componentInsideDilatedPathRatio = pixels.length > 0 ? componentInsideDilatedPath / pixels.length : 0;
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
      componentInsideDilatedPathRatio: round(componentInsideDilatedPathRatio),
      componentOutsideDilatedPathRatio: round(1 - componentInsideDilatedPathRatio),
      maxComponentOutsidePathDistance: round(maxComponentOutsidePathDistance),
      pathDilationTolerancePx,
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
};

const runTraceManifest = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { SAJIK_BLOCKS, SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO, SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO, SAJIK_OFFICIAL_TRACE_REFERENCE, SAJIK_SEATMAP_IMAGE, SAJIK_TRACE_ANCHOR_TOLERANCE_PX, SAJIK_TRACE_BOUNDS_TOLERANCE_PX, SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO, SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX } = await import("../src/data/sajikSeatData.ts");
  const { pathBounds, pathSubpathCount, pathToPoints: pathPoints, polygonArea } = await import("../src/utils/seatMapPolygonValidator.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const alignmentAuditPath = path.join(outDir, 'sajik-seatmap-alignment-audit.json');

  const P0_BLOCKS = new Set([
    '111',
    '112',
    '113',
    '114',
    '115',
    '116',
    '121',
    '122',
    '123',
    '124',
    '125',
    '126',
    '127',
    '131',
    '132',
    '133',
    '134',
    '135',
    '136',
    '137',
    '142',
    '143',
    '021',
    '031',
    '041',
  ]);
  const P0_CATEGORIES = new Set(['ACCESSIBLE', 'CENTRAL_TABLE', 'CENTRAL_UPPER_TABLE', 'AVENUEL', 'CAMPING', 'CHEER_TABLE']);
  const P1_CATEGORIES = new Set([
    'CHEER_TABLE',
    'WIDE_TABLE',
    'INFIELD_TABLE',
    'EVERYTIME',
    'INFIELD_FIELD_1B',
    'INFIELD_FIELD_3A',
    'INFIELD_FIELD_3B',
  ]);

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

  const reviewTierForBlock = (block) => {
    if (P0_BLOCKS.has(block.block) || P0_CATEGORIES.has(block.category)) return 'P0';
    if (block.level === '1F' || P1_CATEGORIES.has(block.category)) return 'P1';
    return 'P2';
  };

  let alignmentSummary = null;
  let alignmentByBlock = new Map();
  try {
    const alignmentAudit = JSON.parse(await fs.readFile(alignmentAuditPath, 'utf8'));
    alignmentSummary = alignmentAudit.summary ?? null;
    alignmentByBlock = new Map((alignmentAudit.blocks ?? []).map((row) => [row.block, row]));
  } catch {
    alignmentSummary = null;
    alignmentByBlock = new Map();
  }

  const blockRows = SAJIK_BLOCKS.map((block) => {
    const reference = SAJIK_OFFICIAL_TRACE_REFERENCE[block.block];
    if (!reference) {
      throw new Error(`Missing Sajik trace reference for block ${block.block}`);
    }

    const visualPath = block.imageGeometry.visualPath ?? block.imageGeometry.d;
    const hitPath = block.imageGeometry.hitPath ?? visualPath;
    const labelPoint = block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY];
    const points = pathPoints(visualPath);
    const area = Number(polygonArea(points).toFixed(2));
    const alignment = alignmentByBlock.get(block.block);

    return {
      id: block.id,
      block: block.block,
      name: block.name,
      level: block.level,
      side: block.side,
      category: block.category,
      fanRole: block.fanRole,
      sectionKind: block.sectionKind,
      markerType: block.markerType ?? '',
      reviewTier: reviewTierForBlock(block),
      labelAnchor: {
        x: labelPoint[0],
        y: labelPoint[1],
      },
      expectedBounds: reference.expectedBounds,
      currentBounds: pathBounds(visualPath),
      expectedSubpathCount: reference.expectedSubpathCount,
      actualSubpathCount: pathSubpathCount(visualPath),
      expectedPointCount: reference.expectedPointCount,
      actualPointCount: points.length,
      expectedArea: reference.expectedArea,
      actualArea: area,
      traceStatus: block.traceStatus,
      traceMethod: block.imageGeometry.traceMethod,
      traceSource: block.imageGeometry.traceSource,
      traceVersion: block.imageGeometry.traceVersion,
      manualReviewed: block.imageGeometry.manualReviewed,
      pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
      mapInteractionStatus: block.mapInteractionStatus,
      alignmentClass: alignment?.alignmentClass ?? 'NOT_RUN',
      componentInsidePathRatio: alignment?.componentInsidePathRatio ?? '',
      componentOutsideDilatedPathRatio: alignment?.componentOutsideDilatedPathRatio ?? '',
      maxComponentOutsidePathDistance: alignment?.maxComponentOutsidePathDistance ?? '',
      pathColorCoverageRatio: alignment?.pathColorCoverageRatio ?? '',
      manualReviewNote: block.imageGeometry.manualReviewNote,
      path: visualPath,
      visualPath,
      hitPath,
      geometryVersion: block.imageGeometry.geometryVersion,
    };
  });

  const missingBlocks = SAJIK_BLOCKS
    .map((block) => block.block)
    .filter((block) => !SAJIK_OFFICIAL_TRACE_REFERENCE[block]);
  if (missingBlocks.length > 0) {
    throw new Error(`Missing Sajik trace references: ${missingBlocks.join(', ')}`);
  }

  const unexpectedReferences = Object.keys(SAJIK_OFFICIAL_TRACE_REFERENCE)
    .filter((block) => !SAJIK_BLOCKS.some((entry) => entry.block === block));
  if (unexpectedReferences.length > 0) {
    throw new Error(`Unexpected Sajik trace references: ${unexpectedReferences.join(', ')}`);
  }

  const summary = {
    totalBlocks: blockRows.length,
    p0Blocks: blockRows.filter((row) => row.reviewTier === 'P0').length,
    p1Blocks: blockRows.filter((row) => row.reviewTier === 'P1').length,
    p2Blocks: blockRows.filter((row) => row.reviewTier === 'P2').length,
    officialImageTraced: blockRows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
    needsOperatorReview: blockRows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW').length,
    directOfficialTrace: blockRows.filter((row) => row.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length,
    officialPngManualPolygon: blockRows.filter((row) => row.traceSource === 'OFFICIAL_PNG_MANUAL_POLYGON').length,
    manualPolygonV2: blockRows.filter((row) => row.traceVersion === 'manual-polygon-v2').length,
    manualReviewed: blockRows.filter((row) => row.manualReviewed === true).length,
    unreviewedBlocks: blockRows.filter((row) => row.manualReviewed !== true).length,
    pixelAligned: blockRows.filter((row) => row.pixelAlignmentStatus === 'PIXEL_ALIGNED').length,
    manualReviewRequired: blockRows.filter((row) => row.pixelAlignmentStatus === 'MANUAL_REVIEW_REQUIRED').length,
    mapSelectable: blockRows.filter((row) => row.mapInteractionStatus === 'MAP_SELECTABLE').length,
    aliasOnlyOfficialPngBlockNotVisible: blockRows.filter((row) => row.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE').length,
    refinedPolygons: blockRows.filter((row) => row.actualPointCount > 4).length,
    alignmentLockedVerified: alignmentSummary?.lockedVerified ?? blockRows.filter((row) => row.alignmentClass === 'LOCKED_VERIFIED').length,
    officialPngBlockNotVisible: alignmentSummary?.officialPngBlockNotVisible ?? blockRows.filter((row) => row.alignmentClass === 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE').length,
    alignmentFailures: alignmentSummary?.officialAlignmentFailures ?? blockRows.filter((row) => row.alignmentClass !== 'LOCKED_VERIFIED').length,
    alignmentThresholds: {
      minComponentInsidePathRatio: SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
      minPathColorCoverageRatio: SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
      maxThinComponentOutsideDilatedPathRatio: SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO,
      maxThinComponentOutsidePathDistancePx: SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX,
    },
  };

  const priorityRows = ['P0', 'P1', 'P2'].map((tier) => {
    const rows = blockRows.filter((row) => row.reviewTier === tier);
    return [
      `\`${tier}\``,
      String(rows.length),
      String(rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length),
      String(rows.filter((row) => row.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length),
      String(rows.filter((row) => row.traceVersion === 'manual-polygon-v2').length),
      String(rows.filter((row) => row.actualPointCount > 4).length),
      String(rows.filter((row) => row.manualReviewed).length),
      String(rows.filter((row) => row.pixelAlignmentStatus === 'PIXEL_ALIGNED').length),
      rows.map((row) => row.block).join(' '),
    ];
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    asset: SAJIK_SEATMAP_IMAGE,
    tolerances: {
      anchorPx: SAJIK_TRACE_ANCHOR_TOLERANCE_PX,
      boundsPx: SAJIK_TRACE_BOUNDS_TOLERANCE_PX,
    },
    summary,
    reviewTiers: {
      P0: {
        label: 'accessible, central/table/special and representative blocks',
        blocks: blockRows.filter((row) => row.reviewTier === 'P0').map((row) => row.block),
      },
      P1: {
        label: '1F infield, cheer and table blocks',
        blocks: blockRows.filter((row) => row.reviewTier === 'P1').map((row) => row.block),
      },
      P2: {
        label: 'remaining upper and outfield blocks',
        blocks: blockRows.filter((row) => row.reviewTier === 'P2').map((row) => row.block),
      },
    },
    blocks: blockRows,
  };

  const markdown = [
    '# 사직야구장 좌석도 trace review manifest',
    '',
    `- 공식 이미지: \`${SAJIK_SEATMAP_IMAGE.requiredAssetFileName}\` (${SAJIK_SEATMAP_IMAGE.imageWidth}x${SAJIK_SEATMAP_IMAGE.imageHeight})`,
    `- total blocks: ${summary.totalBlocks}`,
    `- official image traced: ${summary.officialImageTraced}`,
    `- direct official-image path trace: ${summary.directOfficialTrace}`,
    `- trace source: ${summary.officialPngManualPolygon} OFFICIAL_PNG_MANUAL_POLYGON`,
    `- trace version: ${summary.manualPolygonV2} manual-polygon-v2`,
    `- refined polygons (>4 points): ${summary.refinedPolygons}`,
    `- manual reviewed: ${summary.manualReviewed}`,
    `- unreviewed blocks: ${summary.unreviewedBlocks}`,
    `- pixel aligned: ${summary.pixelAligned}`,
    `- manual review required: ${summary.manualReviewRequired}`,
    `- map selectable: ${summary.mapSelectable}`,
    `- alias-only official PNG block not visible: ${summary.aliasOnlyOfficialPngBlockNotVisible}`,
    `- alignment locked verified: ${summary.alignmentLockedVerified}`,
    `- official PNG block not visible: ${summary.officialPngBlockNotVisible}`,
    `- alignment failures: ${summary.alignmentFailures}`,
    `- alignment thresholds: component>=${SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO}, coverage>=${SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO}, thinOutside<=${SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO}, thinMaxDistance<=${SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX}`,
    `- needs operator review: ${summary.needsOperatorReview || '-'}`,
    '',
    '## 검수 우선순위',
    '',
    markdownTable(
      ['tier', 'blocks', 'official traced', 'direct trace', 'v2 trace', '>4 point', 'manual reviewed', 'pixel aligned', 'block list'],
      priorityRows,
    ),
    '',
    '## 사용 방법',
    '',
    '1. `npm run stadium:sajik:alignment-audit`를 실행해 공식 PNG 픽셀 정합을 먼저 검증합니다.',
    '2. `/stadium?sajikDebug=1`에서 P0 -> P1 -> P2 순서로 공식 이미지와 overlay를 비교합니다.',
    '3. 모든 블럭은 `PATH_TRACED_FROM_OFFICIAL_IMAGE`, `OFFICIAL_PNG_MANUAL_POLYGON`, `manual-polygon-v2`, `manualReviewed=true` 상태여야 하며, 공식 PNG 색상 블럭이 확인되는 블럭은 `PIXEL_ALIGNED` 상태여야 합니다.',
    '4. 공식 PNG에서 색상 블럭이 보이지 않는 운영 호환 블럭은 `ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE`로 보존하고 SVG hit-area에서는 렌더링하지 않습니다.',
    '5. 좌표 변경 후 `npm run stadium:sajik:evidence`, `npm run test:stadium:seatmaps`, `npm run qa:stadium:sajik:trace-review`를 통과시킵니다.',
    '',
  ].join('\n');

  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'sajik-seatmap-trace-review.json');
  const csvPath = path.join(outDir, 'sajik-seatmap-trace-review.csv');
  const markdownPath = path.join(outDir, 'sajik-seatmap-trace-review.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'block',
      'name',
      'level',
      'side',
      'category',
      'fanRole',
      'reviewTier',
      'labelAnchorX',
      'labelAnchorY',
      'expectedBounds',
      'currentBounds',
      'expectedSubpathCount',
      'actualSubpathCount',
      'expectedPointCount',
      'actualPointCount',
      'expectedArea',
      'actualArea',
      'traceStatus',
      'traceMethod',
      'traceSource',
      'traceVersion',
      'manualReviewed',
      'pixelAlignmentStatus',
      'mapInteractionStatus',
      'alignmentClass',
      'componentInsidePathRatio',
      'componentOutsideDilatedPathRatio',
      'maxComponentOutsidePathDistance',
      'pathColorCoverageRatio',
      'manualReviewNote',
      'path',
    ],
    ...blockRows.map((block) => [
      block.id,
      block.block,
      block.name,
      block.level,
      block.side,
      block.category,
      block.fanRole,
      block.reviewTier,
      block.labelAnchor.x,
      block.labelAnchor.y,
      JSON.stringify(block.expectedBounds),
      JSON.stringify(block.currentBounds),
      block.expectedSubpathCount,
      block.actualSubpathCount,
      block.expectedPointCount,
      block.actualPointCount,
      block.expectedArea,
      block.actualArea,
      block.traceStatus,
      block.traceMethod,
      block.traceSource,
      block.traceVersion,
      block.manualReviewed,
      block.pixelAlignmentStatus,
      block.mapInteractionStatus,
      block.alignmentClass,
      block.componentInsidePathRatio,
      block.componentOutsideDilatedPathRatio,
      block.maxComponentOutsidePathDistance,
      block.pathColorCoverageRatio,
      block.manualReviewNote,
      block.path,
    ]),
  ]);
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`manifest_json:${jsonPath}`);
  console.log(`manifest_csv:${csvPath}`);
  console.log(`manifest_markdown:${markdownPath}`);
  console.log(`status:ok total=${summary.totalBlocks} p0=${summary.p0Blocks} p1=${summary.p1Blocks} p2=${summary.p2Blocks} official=${summary.officialImageTraced} direct=${summary.directOfficialTrace} source=${summary.officialPngManualPolygon} version=${summary.manualPolygonV2} refined=${summary.refinedPolygons} reviewed=${summary.manualReviewed} pixelAligned=${summary.pixelAligned} mapSelectable=${summary.mapSelectable} aliasOnlyNotVisible=${summary.aliasOnlyOfficialPngBlockNotVisible} notVisible=${summary.officialPngBlockNotVisible} alignmentLocked=${summary.alignmentLockedVerified} alignmentFailures=${summary.alignmentFailures}`);
};

const runAlignmentAudit = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO, SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO, SAJIK_BLOCKS, SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS, SAJIK_SEATMAP_IMAGE, SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO, SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX, SAJIK_THIN_ALIGNMENT_STRICT_BLOCKS } = await import("../src/data/sajikSeatData.ts");
  const { pathBounds, pathToPoints: pathPoints, pointInPolygon, polygonArea } = await import("../src/utils/seatMapPolygonValidator.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

  const AUDIT_VERSION = 'SAJIK_ALIGNMENT_AUDIT_V2';
  const allowFailures = process.argv.includes('--allow-failures');
  const officialPngBlockNotVisibleSet = new Set(SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS);
  const thinStrictBlockSet = new Set(SAJIK_THIN_ALIGNMENT_STRICT_BLOCKS);

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const pixelComponentsPath = path.join(outDir, 'sajik-seatmap-pixel-components.json');

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

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const pixelComponents = await readJson(pixelComponentsPath);
  const candidateByBlockId = new Map(pixelComponents.blocks.map((block) => [block.id, block.candidate]));
  const sortedBlocks = [...SAJIK_BLOCKS].sort((left, right) => left.displayPriority - right.displayPriority);
  const sortedMapSelectableBlocks = sortedBlocks.filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE');

  const topHitBlockAt = (point) => {
    let topBlock = null;
    sortedMapSelectableBlocks.forEach((block) => {
      const hitPath = block.imageGeometry.hitPath ?? block.imageGeometry.visualPath ?? block.imageGeometry.d;
      if (pointInPolygon(point, pathPoints(hitPath))) {
        topBlock = block;
      }
    });
    return topBlock;
  };

  const failureReasons = (row, { includeCandidateGate }) => {
    const reasons = [];
    if (!row.labelInsideCurrentPath) reasons.push('LABEL_OUTSIDE_CURRENT_PATH');
    if (!row.labelTopHitOk) reasons.push('LABEL_TOP_HIT_MISMATCH');
    if (includeCandidateGate && row.candidateStatus !== 'PIXEL_CANDIDATE_READY') reasons.push('PIXEL_CANDIDATE_NOT_READY');
    if (includeCandidateGate && row.componentInsidePathRatio < SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO) reasons.push('LOW_COMPONENT_INSIDE_CURRENT_PATH');
    if (includeCandidateGate && row.pathColorCoverageRatio < SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO) reasons.push('LOW_CURRENT_PATH_COLOR_COVERAGE');
    if (
      row.thinStrictPixelGate
      && row.candidateStatus === 'PIXEL_CANDIDATE_READY'
      && row.componentOutsideDilatedPathRatio > SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO
    ) {
      reasons.push('THIN_COMPONENT_LEAKAGE_OUTSIDE_DILATED_PATH');
    }
    if (
      row.thinStrictPixelGate
      && row.candidateStatus === 'PIXEL_CANDIDATE_READY'
      && row.maxComponentOutsidePathDistance > SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX
    ) {
      reasons.push('THIN_COMPONENT_MAX_DISTANCE_OUTSIDE_PATH');
    }
    return reasons;
  };

  const rows = SAJIK_BLOCKS.map((block) => {
    const candidate = candidateByBlockId.get(block.id) ?? {};
    const visualPath = block.imageGeometry.visualPath ?? block.imageGeometry.d;
    const hitPath = block.imageGeometry.hitPath ?? visualPath;
    const points = pathPoints(visualPath);
    const labelPoint = block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY];
    const topHit = topHitBlockAt(labelPoint);
    const row = {
      id: block.id,
      block: block.block,
      name: block.name,
      category: block.category,
      level: block.level,
      side: block.side,
      fanRole: block.fanRole,
      traceStatus: block.traceStatus,
      traceSource: block.imageGeometry.traceSource,
      traceVersion: block.imageGeometry.traceVersion,
      manualReviewed: block.imageGeometry.manualReviewed,
      pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
      mapInteractionStatus: block.mapInteractionStatus,
      currentPath: visualPath,
      visualPath,
      hitPath,
      currentPathBounds: pathBounds(visualPath),
      currentPathArea: round(polygonArea(points), 1),
      labelX: labelPoint[0],
      labelY: labelPoint[1],
      labelInsideCurrentPath: pointInPolygon(labelPoint, points),
      labelTopHitBlockId: topHit?.id ?? null,
      labelTopHitBlock: topHit?.block ?? null,
      labelTopHitOk: topHit?.id === block.id,
      candidateStatus: candidate.status ?? 'MISSING_PIXEL_REPORT',
      candidateArea: candidate.area ?? '',
      candidateCenter: candidate.center ?? null,
      candidateBbox: candidate.bbox ?? null,
      candidateOuterBoundaryPointCount: candidate.outerBoundaryPointCount ?? '',
      candidateOuterBoundaryPath: candidate.outerBoundaryPath ?? '',
      candidateHullPath: candidate.hullPath ?? '',
      componentInsidePathRatio: Number(candidate.componentInsidePathRatio ?? 0),
      componentInsideDilatedPathRatio: Number(candidate.componentInsideDilatedPathRatio ?? 0),
      componentOutsideDilatedPathRatio: Number(candidate.componentOutsideDilatedPathRatio ?? 1),
      maxComponentOutsidePathDistance: Number(candidate.maxComponentOutsidePathDistance ?? 0),
      pathColorCoverageRatio: Number(candidate.pathColorCoverageRatio ?? 0),
      seedColor: candidate.seedColor ?? null,
      seedPoint: candidate.seedPoint ?? null,
      strictPixelGate: block.mapInteractionStatus === 'MAP_SELECTABLE',
      thinStrictPixelGate: block.mapInteractionStatus === 'MAP_SELECTABLE' && thinStrictBlockSet.has(block.block),
    };
    const officialReasons = failureReasons(row, { includeCandidateGate: row.strictPixelGate });
    const advisoryReasons = failureReasons(row, { includeCandidateGate: true });
    const officialPngBlockNotVisible = officialPngBlockNotVisibleSet.has(block.block);
    const officialFailureReasons = officialPngBlockNotVisible
      ? [...new Set([...officialReasons, 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE'])]
      : officialReasons;
    const pixelAdvisoryReasons = officialPngBlockNotVisible
      ? [...new Set([...advisoryReasons, 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE'])]
      : advisoryReasons;
    return {
      ...row,
      officialPngBlockNotVisible,
      alignmentClass: officialPngBlockNotVisible
        ? 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE'
        : officialReasons.length === 0
          ? 'LOCKED_VERIFIED'
          : 'RETRACE_REQUIRED',
      officialFailureReasons,
      pixelAdvisoryReasons,
    };
  });

  const officialFailures = rows.filter((row) => row.alignmentClass === 'RETRACE_REQUIRED');
  const officialPngBlockNotVisibleRows = rows.filter((row) => row.alignmentClass === 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE');
  const classificationCounts = rows.reduce((counts, row) => {
    counts[row.alignmentClass] = (counts[row.alignmentClass] ?? 0) + 1;
    return counts;
  }, {});

  const summary = {
    standard: AUDIT_VERSION,
    totalBlocks: rows.length,
    mapSelectable: rows.filter((row) => row.mapInteractionStatus === 'MAP_SELECTABLE').length,
    aliasOnlyOfficialPngBlockNotVisible: rows.filter((row) => row.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE').length,
    lockedVerified: classificationCounts.LOCKED_VERIFIED ?? 0,
    officialPngBlockNotVisible: classificationCounts.OFFICIAL_PNG_BLOCK_NOT_VISIBLE ?? 0,
    retraceRequired: classificationCounts.RETRACE_REQUIRED ?? 0,
    officialAlignmentFailures: officialFailures.length,
    strictPixelGateBlocks: rows.filter((row) => row.strictPixelGate).length,
    pixelAdvisoryWarnings: rows.filter((row) => row.pixelAdvisoryReasons.length > 0).length,
    labelInsideFailures: rows.filter((row) => row.mapInteractionStatus === 'MAP_SELECTABLE' && !row.labelInsideCurrentPath).length,
    labelTopHitFailures: rows.filter((row) => row.mapInteractionStatus === 'MAP_SELECTABLE' && !row.labelTopHitOk).length,
    candidateFailures: rows.filter((row) => row.candidateStatus !== 'PIXEL_CANDIDATE_READY').length,
    thinStrictGateBlocks: rows.filter((row) => row.thinStrictPixelGate).length,
    thinOutsideFailures: rows.filter((row) => (
      row.officialFailureReasons.includes('THIN_COMPONENT_LEAKAGE_OUTSIDE_DILATED_PATH')
      || row.officialFailureReasons.includes('THIN_COMPONENT_MAX_DISTANCE_OUTSIDE_PATH')
    )).length,
    alignmentThresholds: {
      minComponentInsidePathRatio: SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
      minPathColorCoverageRatio: SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
      maxThinComponentOutsideDilatedPathRatio: SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO,
      maxThinComponentOutsidePathDistancePx: SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX,
    },
  };

  const audit = {
    generatedAt: new Date().toISOString(),
    standard: AUDIT_VERSION,
    asset: SAJIK_SEATMAP_IMAGE,
    pixelComponentsReport: pixelComponentsPath,
    summary,
    officialFailurePolicy: {
      requiredForLockedVerified: [
        'labelInsideCurrentPath=true',
        'labelTopHitOk=true',
        'strictPixelGate blocks: candidateStatus=PIXEL_CANDIDATE_READY',
        `strictPixelGate blocks: componentInsidePathRatio>=${SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO}`,
        `strictPixelGate blocks: pathColorCoverageRatio>=${SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO}`,
        `thinStrictPixelGate blocks: componentOutsideDilatedPathRatio<=${SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO}`,
        `thinStrictPixelGate blocks: maxComponentOutsidePathDistance<=${SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX}`,
      ],
      advisoryForNonStrictBlocks: [
        'candidateStatus',
        'componentInsidePathRatio',
        'pathColorCoverageRatio',
      ],
    },
    blocks: rows,
  };

  const failureRows = officialFailures.slice(0, 32).map((row) => [
    `\`${row.block}\``,
    row.alignmentClass,
    row.officialFailureReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
    row.labelTopHitBlock ? `\`${row.labelTopHitBlock}\`` : '-',
    String(row.componentInsidePathRatio),
    String(row.pathColorCoverageRatio),
  ]);

  const classificationRows = ['LOCKED_VERIFIED', 'RETRACE_REQUIRED'].map((classification) => [
    `\`${classification}\``,
    String(classificationCounts[classification] ?? 0),
  ]);
  const allClassificationRows = ['LOCKED_VERIFIED', 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE', 'RETRACE_REQUIRED'].map((classification) => [
    `\`${classification}\``,
    String(classificationCounts[classification] ?? 0),
  ]);

  const markdown = [
    '# Sajik seatmap alignment audit',
    '',
    `- standard: \`${AUDIT_VERSION}\``,
    `- total blocks: ${summary.totalBlocks}`,
    `- map selectable: ${summary.mapSelectable}`,
    `- alias-only official PNG block not visible: ${summary.aliasOnlyOfficialPngBlockNotVisible}`,
    `- locked verified: ${summary.lockedVerified}`,
    `- official PNG block not visible: ${summary.officialPngBlockNotVisible}`,
    `- retrace required: ${summary.retraceRequired}`,
    `- official alignment failures: ${summary.officialAlignmentFailures}`,
    `- strict pixel gate blocks: ${summary.strictPixelGateBlocks}`,
    `- thin strict gate blocks: ${summary.thinStrictGateBlocks}`,
    `- thin outside failures: ${summary.thinOutsideFailures}`,
    `- pixel advisory warnings: ${summary.pixelAdvisoryWarnings}`,
    `- min component inside path ratio: ${SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO}`,
    `- min path color coverage ratio: ${SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO}`,
    '',
    '## Classification',
    '',
    markdownTable(['class', 'blocks'], allClassificationRows),
    '',
    '## Official PNG block not visible',
    '',
    officialPngBlockNotVisibleRows.length > 0
      ? markdownTable(
        ['block', 'failure reasons', 'label top hit', 'inside', 'coverage'],
        officialPngBlockNotVisibleRows.map((row) => [
          `\`${row.block}\``,
          row.officialFailureReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
          row.labelTopHitBlock ? `\`${row.labelTopHitBlock}\`` : '-',
          String(row.componentInsidePathRatio),
          String(row.pathColorCoverageRatio),
        ]),
      )
      : 'No official PNG block-not-visible exceptions.',
    '',
    '## Official failures',
    '',
    failureRows.length > 0
      ? markdownTable(['block', 'class', 'failure reasons', 'label top hit', 'inside', 'coverage'], failureRows)
      : 'No official alignment failures.',
    '',
    '## Gate',
    '',
    '- This command fails when any Sajik block is `RETRACE_REQUIRED`.',
    '- `OFFICIAL_PNG_BLOCK_NOT_VISIBLE` is an explicit local-PNG exception for blocks that remain in data for compatibility but have no visible official PNG color component.',
    '- `PIXEL_ALIGNED` is only releasable after this audit and evidence crops pass.',
    '',
  ].join('\n');

  const statusColor = {
    LOCKED_VERIFIED: '#16a34a',
    OFFICIAL_PNG_BLOCK_NOT_VISIBLE: '#f59e0b',
    RETRACE_REQUIRED: '#dc2626',
  };

  const overlaySvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SAJIK_SEATMAP_IMAGE.imageWidth}" height="${SAJIK_SEATMAP_IMAGE.imageHeight}" viewBox="0 0 ${SAJIK_SEATMAP_IMAGE.imageWidth} ${SAJIK_SEATMAP_IMAGE.imageHeight}">`,
    '  <style>',
    '    .current { fill-opacity: 0.12; stroke-width: 2; vector-effect: non-scaling-stroke; }',
    '    .candidate { fill: none; stroke: #06b6d4; stroke-width: 1.5; stroke-dasharray: 5 4; vector-effect: non-scaling-stroke; }',
    '    .label { font: 800 9px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 2.4; paint-order: stroke; }',
    '  </style>',
    `  <image href="../src/assets/stadiums/lotte/${SAJIK_SEATMAP_IMAGE.requiredAssetFileName}" x="0" y="0" width="${SAJIK_SEATMAP_IMAGE.imageWidth}" height="${SAJIK_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />`,
    '  <g id="current-paths">',
    ...rows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}" fill="${statusColor[row.alignmentClass]}" stroke="${statusColor[row.alignmentClass]}"><title>${xmlEscape(`${row.block} ${row.alignmentClass} inside=${row.componentInsidePathRatio} coverage=${row.pathColorCoverageRatio}`)}</title></path>`),
    '  </g>',
    '  <g id="pixel-candidates">',
    ...rows
      .filter((row) => row.candidateOuterBoundaryPath || row.candidateHullPath)
      .map((row) => `    <path class="candidate" d="${xmlEscape(row.candidateOuterBoundaryPath || row.candidateHullPath)}"><title>${xmlEscape(`${row.block} candidate ${row.candidateStatus}`)}</title></path>`),
    '  </g>',
    '  <g id="labels">',
    ...rows.map((row) => [
      `    <circle cx="${row.labelX}" cy="${row.labelY}" r="3" fill="${statusColor[row.alignmentClass]}" stroke="#ffffff" stroke-width="1.5" vector-effect="non-scaling-stroke" />`,
      `    <text class="label" x="${row.labelX + 5}" y="${row.labelY - 5}">${xmlEscape(row.block)}</text>`,
    ].join('\n')),
    '  </g>',
    '</svg>',
  ].join('\n');

  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'sajik-seatmap-alignment-audit.json');
  const csvPath = path.join(outDir, 'sajik-seatmap-alignment-audit.csv');
  const markdownPath = path.join(outDir, 'sajik-seatmap-alignment-audit.md');
  const svgPath = path.join(outDir, 'sajik-seatmap-alignment-audit.svg');

  await fs.writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'block',
      'name',
      'category',
      'level',
      'traceStatus',
      'mapInteractionStatus',
      'alignmentClass',
      'officialPngBlockNotVisible',
      'officialFailureReasons',
      'labelX',
      'labelY',
      'labelInsideCurrentPath',
      'labelTopHitBlock',
      'labelTopHitOk',
      'candidateStatus',
      'strictPixelGate',
      'thinStrictPixelGate',
      'componentInsidePathRatio',
      'componentInsideDilatedPathRatio',
      'componentOutsideDilatedPathRatio',
      'maxComponentOutsidePathDistance',
      'pathColorCoverageRatio',
      'pixelAdvisoryReasons',
      'candidateArea',
      'candidateBbox',
      'candidateOuterBoundaryPath',
      'currentPath',
    ],
    ...rows.map((row) => [
      row.id,
      row.block,
      row.name,
      row.category,
      row.level,
      row.traceStatus,
      row.mapInteractionStatus,
      row.alignmentClass,
      row.officialPngBlockNotVisible,
      row.officialFailureReasons.join(' '),
      row.labelX,
      row.labelY,
      row.labelInsideCurrentPath,
      row.labelTopHitBlock ?? '',
      row.labelTopHitOk,
      row.candidateStatus,
      row.strictPixelGate,
      row.thinStrictPixelGate,
      row.componentInsidePathRatio,
      row.componentInsideDilatedPathRatio,
      row.componentOutsideDilatedPathRatio,
      row.maxComponentOutsidePathDistance,
      row.pathColorCoverageRatio,
      row.pixelAdvisoryReasons.join(' '),
      row.candidateArea,
      row.candidateBbox ? JSON.stringify(row.candidateBbox) : '',
      row.candidateOuterBoundaryPath,
      row.currentPath,
    ]),
  ]);
  await fs.writeFile(markdownPath, markdown, 'utf8');
  await fs.writeFile(svgPath, overlaySvg, 'utf8');

  console.log(`alignment_json:${jsonPath}`);
  console.log(`alignment_csv:${csvPath}`);
  console.log(`alignment_markdown:${markdownPath}`);
  console.log(`alignment_svg:${svgPath}`);
  console.log(`status:${officialFailures.length === 0 ? 'ok' : 'failed'} total=${summary.totalBlocks} mapSelectable=${summary.mapSelectable} aliasOnlyNotVisible=${summary.aliasOnlyOfficialPngBlockNotVisible} locked=${summary.lockedVerified} notVisible=${summary.officialPngBlockNotVisible} retrace=${summary.retraceRequired} officialFailures=${summary.officialAlignmentFailures} thinOutsideFailures=${summary.thinOutsideFailures}`);

  if (officialFailures.length > 0 && !allowFailures) {
    process.exitCode = 1;
  }
};

const runEvidence = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { SAJIK_BLOCKS, SAJIK_CATEGORIES, SAJIK_SEATMAP_IMAGE } = await import("../src/data/sajikSeatData.ts");

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
  const alignmentAuditPath = path.join(outDir, 'sajik-seatmap-alignment-audit.json');

  const P0_BLOCKS = new Set([
    '111',
    '112',
    '113',
    '114',
    '115',
    '116',
    '121',
    '122',
    '123',
    '124',
    '125',
    '126',
    '127',
    '131',
    '132',
    '133',
    '134',
    '135',
    '136',
    '137',
    '142',
    '143',
    '021',
    '031',
    '041',
  ]);
  const P0_CATEGORIES = new Set(['ACCESSIBLE', 'CENTRAL_TABLE', 'CENTRAL_UPPER_TABLE', 'AVENUEL', 'CAMPING', 'CHEER_TABLE']);
  const P1_CATEGORIES = new Set([
    'CHEER_TABLE',
    'WIDE_TABLE',
    'INFIELD_TABLE',
    'EVERYTIME',
    'INFIELD_FIELD_1B',
    'INFIELD_FIELD_3A',
    'INFIELD_FIELD_3B',
  ]);

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

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
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);

    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  };

  const polygonArea = (points) => {
    const signedArea = points.reduce((area, point, index) => {
      const next = points[(index + 1) % points.length];
      return area + ((point[0] * next[1]) - (next[0] * point[1]));
    }, 0);

    return Math.abs(signedArea / 2);
  };

  const reviewTierForBlock = (block) => {
    if (P0_BLOCKS.has(block.block) || P0_CATEGORIES.has(block.category)) return 'P0';
    if (block.level === '1F' || P1_CATEGORIES.has(block.category)) return 'P1';
    return 'P2';
  };

  const tierOrder = ['P0', 'P1', 'P2'];
  const tierLabels = {
    P0: 'P0 thin first-base, central/table, special, accessible',
    P1: 'P1 1F infield, cheer, table, Everytime',
    P2: 'P2 remaining upper and outfield',
  };

  let alignmentSummary = null;
  let alignmentByBlock = new Map();
  try {
    const alignmentAudit = JSON.parse(await fs.readFile(alignmentAuditPath, 'utf8'));
    alignmentSummary = alignmentAudit.summary ?? null;
    alignmentByBlock = new Map((alignmentAudit.blocks ?? []).map((row) => [row.block, row]));
  } catch {
    alignmentSummary = null;
    alignmentByBlock = new Map();
  }

  const blocksWithMetrics = SAJIK_BLOCKS.map((block) => {
    const points = pathPoints(block.imageGeometry.d);
    const alignment = alignmentByBlock.get(block.block);
    return {
      ...block,
      reviewTier: reviewTierForBlock(block),
      pointCount: points.length,
      area: Number(polygonArea(points).toFixed(2)),
      bounds: pathBounds(block.imageGeometry.d),
      alignment,
    };
  });

  const buildOverlaySvg = (tier, tierBlocks, viewport = {
    width: SAJIK_SEATMAP_IMAGE.imageWidth,
    height: SAJIK_SEATMAP_IMAGE.imageHeight,
    minX: 0,
    minY: 0,
    viewWidth: SAJIK_SEATMAP_IMAGE.imageWidth,
    viewHeight: SAJIK_SEATMAP_IMAGE.imageHeight,
  }, options = {}) => {
    const {
      includeLegend = true,
      labelFontSize = 9,
      tierLabelFontSize = 10,
      labelStrokeWidth = 2.6,
      labelCircleRadius = 3,
      tierFillOpacity = 0.45,
    } = options;
    const tierBlockKeys = new Set(tierBlocks.map((block) => block.block));

    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="${viewport.minX} ${viewport.minY} ${viewport.viewWidth} ${viewport.viewHeight}">
    <style>
      .label { font: 900 ${labelFontSize}px Arial, sans-serif; text-anchor: middle; dominant-baseline: central; fill: #020617; stroke: #ffffff; stroke-width: ${labelStrokeWidth}px; paint-order: stroke; }
      .tier-label { font: 900 ${tierLabelFontSize}px Arial, sans-serif; text-anchor: middle; dominant-baseline: central; fill: #7c2d12; stroke: #ffffff; stroke-width: ${labelStrokeWidth}px; paint-order: stroke; }
      .candidate { fill: none; stroke: #06b6d4; stroke-width: 1.6px; stroke-dasharray: 5 4; vector-effect: non-scaling-stroke; }
      .alias-only { fill: #f59e0b; fill-opacity: 0.16; stroke: #f59e0b; stroke-width: 2.6px; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
    </style>
    <rect x="${viewport.minX + 1}" y="${viewport.minY + 1}" width="${viewport.viewWidth - 2}" height="${viewport.viewHeight - 2}" fill="none" stroke="#0f172a" stroke-opacity="0.5" stroke-width="2" />
    ${blocksWithMetrics.map((block) => {
      const isTierBlock = tierBlockKeys.has(block.block) && (tier === 'FOCUS' || block.reviewTier === tier);
      const isAlignmentFailure = isTierBlock && block.alignment?.alignmentClass === 'RETRACE_REQUIRED';
      const isNotVisibleException = isTierBlock && block.alignment?.alignmentClass === 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE';
      const isAliasOnly = block.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE';
      const category = SAJIK_CATEGORIES[block.category];
      const fill = category?.light ?? '#38bdf8';
      const stroke = isAlignmentFailure ? '#dc2626' : isNotVisibleException ? '#f59e0b' : isTierBlock ? '#ea580c' : '#64748b';
      const strokeWidth = isAlignmentFailure ? '3.2' : isTierBlock ? '2.2' : '1';

      return `
    <path class="${isAliasOnly && isTierBlock ? 'alias-only' : ''}" d="${xmlEscape(block.imageGeometry.d)}" fill="${fill}" fill-opacity="${isTierBlock ? tierFillOpacity : '0.03'}" stroke="${stroke}" stroke-opacity="${isTierBlock ? '0.92' : '0.18'}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke">
      <title>${xmlEscape(`${block.block} ${block.name} ${block.pointCount}pt ${block.imageGeometry.traceVersion} ${block.alignment?.alignmentClass ?? 'alignment-not-run'}`)}</title>
    </path>
    ${isTierBlock && block.alignment?.candidateOuterBoundaryPath ? `<path class="candidate" d="${xmlEscape(block.alignment.candidateOuterBoundaryPath)}" />` : ''}
    ${isTierBlock ? `<circle cx="${block.imageGeometry.labelX}" cy="${block.imageGeometry.labelY}" r="${labelCircleRadius}" fill="#ef4444" stroke="#ffffff" stroke-width="1.4" vector-effect="non-scaling-stroke" />` : ''}
    ${isTierBlock ? `<text class="${block.pointCount > 4 ? 'tier-label' : 'label'}" x="${block.imageGeometry.labelX}" y="${block.imageGeometry.labelY}" transform="rotate(${block.imageGeometry.labelRotate ?? 0} ${block.imageGeometry.labelX} ${block.imageGeometry.labelY})">${xmlEscape(block.imageGeometry.shortLabel)}</text>` : ''}`;
    }).join('')}
    ${includeLegend ? `<text x="${viewport.minX + 16}" y="${viewport.minY + viewport.viewHeight - 18}" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#f8fafc" stroke="#0f172a" stroke-width="3" paint-order="stroke">${xmlEscape(`${tier} ${tierBlocks.length} blocks · cyan=official PNG pixel candidate · amber=official PNG block not visible · red=retrace required`)}</text>` : ''}
  </svg>`;
  };

  const buildHeaderSvg = (tier, tierBlocks, width, height) => {
    const refined = tierBlocks.filter((block) => block.pointCount > 4).length;
    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" />
    <text x="14" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#0f172a">${xmlEscape(`Sajik ${tier} polygon evidence`)}</text>
    <text x="14" y="40" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#475569">${xmlEscape(`${tierLabels[tier]} · blocks=${tierBlocks.length} · refined=${refined} · source=OFFICIAL_PNG_MANUAL_POLYGON · version=manual-polygon-v2`)}</text>
  </svg>`;
  };

  const renderTierPanel = async (tier, tierBlocks) => {
    const overlay = Buffer.from(buildOverlaySvg(tier, tierBlocks));
    const headerHeight = 54;
    const header = Buffer.from(buildHeaderSvg(tier, tierBlocks, SAJIK_SEATMAP_IMAGE.imageWidth, headerHeight));
    const panelBuffer = await sharp(imagePath)
      .composite([{ input: overlay, left: 0, top: 0 }])
      .extend({ top: headerHeight, background: '#f8fafc' })
      .composite([{ input: header, left: 0, top: 0 }])
      .png()
      .toBuffer();

    const outputPath = path.join(outDir, `sajik-seatmap-evidence-${tier.toLowerCase()}.png`);
    await sharp(panelBuffer).toFile(outputPath);

    return {
      tier,
      outputPath,
      width: SAJIK_SEATMAP_IMAGE.imageWidth,
      height: SAJIK_SEATMAP_IMAGE.imageHeight + headerHeight,
      blockCount: tierBlocks.length,
      refinedCount: tierBlocks.filter((block) => block.pointCount > 4).length,
      blocks: tierBlocks.map((block) => ({
        id: block.id,
        block: block.block,
        name: block.name,
        mapInteractionStatus: block.mapInteractionStatus,
        alignmentClass: block.alignment?.alignmentClass ?? 'NOT_RUN',
        componentInsidePathRatio: block.alignment?.componentInsidePathRatio ?? null,
        pathColorCoverageRatio: block.alignment?.pathColorCoverageRatio ?? null,
        officialFailureReasons: block.alignment?.officialFailureReasons ?? [],
        pointCount: block.pointCount,
        area: block.area,
        bounds: block.bounds,
        path: block.imageGeometry.d,
      })),
    };
  };

  const focusCrops = [
    {
      id: 'p0-thin-first-base',
      title: 'P0 thin first-base, 143 strict lock, and 041 correction',
      left: 600,
      top: 320,
      width: 340,
      height: 235,
      blocks: ['111', '112', '113', '114', '115', '116', '121', '122', '123', '124', '125', '126', '127', '131', '132', '133', '134', '135', '136', '137', '142', '143', '021', '031', '041'],
    },
    {
      id: 'p0-143-boundary-lock',
      title: 'P0 143 boundary lock - blue block only',
      left: 770,
      top: 450,
      width: 56,
      height: 42,
      blocks: ['123', '133', '134', '143'],
      compact: true,
    },
    {
      id: 'p0-132-142-143-seams',
      title: 'P0 seam check - 132/142/143',
      left: 695,
      top: 468,
      width: 118,
      height: 62,
      blocks: ['132', '142', '143'],
      compact: true,
    },
    {
      id: 'p0-123-133-143-seams',
      title: 'P0 seam check - 123/133/143',
      left: 750,
      top: 435,
      width: 82,
      height: 58,
      blocks: ['123', '133', '143'],
      compact: true,
    },
    {
      id: 'p0-retraced-3b-upper',
      title: 'P0 retraced - 3B upper thin blocks',
      left: 220,
      top: 75,
      width: 175,
      height: 170,
      blocks: ['332', '322', '331', '321', '312', '311'],
    },
    {
      id: 'p0-central-lower-011-review',
      title: 'P0 central lower - 011 alias-only review',
      left: 470,
      top: 390,
      width: 230,
      height: 95,
      blocks: ['024', '013', '023', '033', '022', '012', '021', '031', '011'],
    },
    {
      id: 'p0-011-alias-only-no-hit-area',
      title: 'P0 011 alias-only - no SVG hit-area',
      left: 610,
      top: 355,
      width: 170,
      height: 90,
      blocks: ['011', '012', '021'],
      compact: true,
    },
    {
      id: 'p1-retraced-everytime',
      title: 'P1 retraced - Everytime blocks',
      left: 790,
      top: 235,
      width: 135,
      height: 80,
      blocks: ['922', '903', '913', '914', '904', '923'],
    },
  ];

  const renderFocusPanel = async (focus) => {
    const focusBlocks = blocksWithMetrics.filter((block) => focus.blocks.includes(block.block));
    const headerHeight = 54;
    const outputWidth = SAJIK_SEATMAP_IMAGE.imageWidth;
    const outputHeight = Math.round((focus.height / focus.width) * outputWidth);
    const overlay = Buffer.from(buildOverlaySvg('FOCUS', focusBlocks, {
      width: outputWidth,
      height: outputHeight,
      minX: focus.left,
      minY: focus.top,
      viewWidth: focus.width,
      viewHeight: focus.height,
    }, focus.compact ? {
      includeLegend: false,
      labelFontSize: 3.8,
      tierLabelFontSize: 4.2,
      labelStrokeWidth: 1.2,
      labelCircleRadius: 1.2,
      tierFillOpacity: 0.26,
    } : {
      includeLegend: false,
    }));
    const header = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${headerHeight}" viewBox="0 0 ${outputWidth} ${headerHeight}">
    <rect x="0" y="0" width="${outputWidth}" height="${headerHeight}" fill="#f8fafc" />
    <text x="14" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#0f172a">${xmlEscape(`Sajik ${focus.title}`)}</text>
    <text x="14" y="40" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#475569">${xmlEscape(`blocks=${focusBlocks.length} · official PNG crop=${focus.left},${focus.top},${focus.width},${focus.height} · cyan=official pixel candidate`)}</text>
  </svg>`);
    const cropBuffer = await sharp(imagePath)
      .extract({ left: focus.left, top: focus.top, width: focus.width, height: focus.height })
      .resize({ width: outputWidth, height: outputHeight, kernel: 'nearest' })
      .composite([{ input: overlay, left: 0, top: 0 }])
      .png()
      .toBuffer();
    const panelBuffer = await sharp(cropBuffer)
      .extend({ top: headerHeight, background: '#f8fafc' })
      .composite([{ input: header, left: 0, top: 0 }])
      .png()
      .toBuffer();

    const outputPath = path.join(outDir, `sajik-seatmap-evidence-${focus.id}.png`);
    await sharp(panelBuffer).toFile(outputPath);

    return {
      tier: 'FOCUS',
      id: focus.id,
      outputPath,
      width: outputWidth,
      height: outputHeight + headerHeight,
      blockCount: focusBlocks.length,
      refinedCount: focusBlocks.filter((block) => block.pointCount > 4).length,
      blocks: focusBlocks.map((block) => ({
        block: block.block,
        mapInteractionStatus: block.mapInteractionStatus,
        rendersMapHitArea: block.mapInteractionStatus === 'MAP_SELECTABLE',
        alignmentClass: block.alignment?.alignmentClass ?? 'NOT_RUN',
        componentInsidePathRatio: block.alignment?.componentInsidePathRatio ?? null,
        pathColorCoverageRatio: block.alignment?.pathColorCoverageRatio ?? null,
        officialFailureReasons: block.alignment?.officialFailureReasons ?? [],
      })),
    };
  };

  await fs.mkdir(outDir, { recursive: true });

  const metadata = await sharp(imagePath).metadata();
  if (metadata.width !== SAJIK_SEATMAP_IMAGE.imageWidth || metadata.height !== SAJIK_SEATMAP_IMAGE.imageHeight) {
    throw new Error(`Unexpected Sajik image size: ${metadata.width}x${metadata.height}`);
  }
  if (SAJIK_BLOCKS.length !== 89) {
    throw new Error(`Sajik evidence requires 89 blocks. Actual: ${SAJIK_BLOCKS.length}`);
  }

  const invalidTraceBlocks = blocksWithMetrics.filter((block) => (
    block.imageGeometry.traceSource !== 'OFFICIAL_PNG_MANUAL_POLYGON'
    || block.imageGeometry.traceVersion !== 'manual-polygon-v2'
    || block.imageGeometry.manualReviewed !== true
  ));
  if (invalidTraceBlocks.length > 0) {
    throw new Error(`Sajik evidence requires finalized v2 trace metadata: ${invalidTraceBlocks.map((block) => block.block).join(', ')}`);
  }

  const tierOutputs = [];
  for (const tier of tierOrder) {
    tierOutputs.push(await renderTierPanel(tier, blocksWithMetrics.filter((block) => block.reviewTier === tier)));
  }
  const focusOutputs = [];
  for (const focus of focusCrops) {
    focusOutputs.push(await renderFocusPanel(focus));
  }

  const contactSheetPath = path.join(outDir, 'sajik-seatmap-evidence-contact-sheet.png');
  const sheetOutputs = [...focusOutputs, ...tierOutputs];
  const contactSheetHeight = sheetOutputs.reduce((total, output) => total + output.height, 0);
  await sharp({
    create: {
      width: SAJIK_SEATMAP_IMAGE.imageWidth,
      height: contactSheetHeight,
      channels: 3,
      background: '#f8fafc',
    },
  })
    .composite(await Promise.all(sheetOutputs.map(async (output, index) => ({
      input: await fs.readFile(output.outputPath),
      left: 0,
      top: sheetOutputs.slice(0, index).reduce((total, item) => total + item.height, 0),
    }))))
    .png()
    .toFile(contactSheetPath);

  const report = {
    generatedAt: new Date().toISOString(),
    asset: SAJIK_SEATMAP_IMAGE,
    contactSheetPath,
    summary: {
      totalBlocks: blocksWithMetrics.length,
      refinedPolygons: blocksWithMetrics.filter((block) => block.pointCount > 4).length,
      manualReviewRequired: blocksWithMetrics.filter((block) => block.imageGeometry.pixelAlignmentStatus === 'MANUAL_REVIEW_REQUIRED').length,
      mapSelectable: blocksWithMetrics.filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE').length,
      aliasOnlyOfficialPngBlockNotVisible: blocksWithMetrics.filter((block) => block.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE').length,
      manualReviewBlocks: blocksWithMetrics
        .filter((block) => block.imageGeometry.pixelAlignmentStatus === 'MANUAL_REVIEW_REQUIRED')
        .map((block) => block.block),
      p0Blocks: tierOutputs.find((output) => output.tier === 'P0')?.blockCount ?? 0,
      p1Blocks: tierOutputs.find((output) => output.tier === 'P1')?.blockCount ?? 0,
      p2Blocks: tierOutputs.find((output) => output.tier === 'P2')?.blockCount ?? 0,
      alignmentLockedVerified: alignmentSummary?.lockedVerified ?? null,
      officialPngBlockNotVisible: alignmentSummary?.officialPngBlockNotVisible ?? null,
      alignmentFailures: alignmentSummary?.officialAlignmentFailures ?? null,
    },
    tiers: tierOutputs,
    focus: focusOutputs,
  };

  const jsonPath = path.join(outDir, 'sajik-seatmap-evidence-crops.json');
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const markdownPath = path.join(outDir, 'sajik-seatmap-evidence-crops.md');
  const markdown = [
    '# Sajik seatmap polygon evidence',
    '',
    `- Official asset: \`${SAJIK_SEATMAP_IMAGE.requiredAssetFileName}\` (${SAJIK_SEATMAP_IMAGE.imageWidth}x${SAJIK_SEATMAP_IMAGE.imageHeight})`,
    `- Trace source: \`OFFICIAL_PNG_MANUAL_POLYGON\``,
    `- Trace version: \`manual-polygon-v2\``,
    `- Total blocks: ${report.summary.totalBlocks}`,
    `- Refined polygons (>4 points): ${report.summary.refinedPolygons}`,
    `- Manual review required: ${report.summary.manualReviewRequired} (${report.summary.manualReviewBlocks.join(', ') || 'none'})`,
    `- Map selectable: ${report.summary.mapSelectable}`,
    `- Alias-only official PNG block not visible: ${report.summary.aliasOnlyOfficialPngBlockNotVisible}`,
    `- Alignment locked verified: ${report.summary.alignmentLockedVerified ?? 'not-run'}`,
    `- Official PNG block not visible: ${report.summary.officialPngBlockNotVisible ?? 'not-run'}`,
    `- Alignment failures: ${report.summary.alignmentFailures ?? 'not-run'}`,
    `- Contact sheet: ${contactSheetPath}`,
    '',
    markdownTable(
      ['tier', 'blocks', 'refined', 'evidence PNG'],
      [...focusOutputs, ...tierOutputs].map((output) => [
        `\`${output.id ?? output.tier}\``,
        String(output.blockCount),
        String(output.refinedCount),
        output.outputPath,
      ]),
    ),
    '',
  ].join('\n');
  await fs.writeFile(markdownPath, markdown, 'utf8');

  tierOutputs.forEach((output) => {
    console.log(`evidence_${output.tier.toLowerCase()}:${output.outputPath}`);
  });
  focusOutputs.forEach((output) => {
    console.log(`evidence_${output.id}:${output.outputPath}`);
  });
  console.log(`evidence_contact_sheet:${contactSheetPath}`);
  console.log(`evidence_report:${jsonPath}`);
  console.log(`evidence_markdown:${markdownPath}`);
};

const runAdvisoryPlaywright = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath, pathToFileURL } = await import("node:url");
  const { SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO, SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO, SAJIK_BLOCKS, SAJIK_CATEGORIES, SAJIK_SEATMAP_IMAGE } = await import("../src/data/sajikSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const playwrightOutDir = path.join(repoRoot, 'output/playwright/sajik-seatmap-advisory-review');
  const alignmentAuditPath = path.join(reportDir, 'sajik-seatmap-alignment-audit.json');
  const imagePath = path.resolve(frontendRoot, SAJIK_SEATMAP_IMAGE.imagePath);

  const htmlPath = path.join(reportDir, 'sajik-seatmap-advisory-playwright-review.html');
  const jsonPath = path.join(reportDir, 'sajik-seatmap-advisory-playwright-review.json');
  const markdownPath = path.join(reportDir, 'sajik-seatmap-advisory-playwright-review.md');

  const REVIEW_VERSION = 'SAJIK_ADVISORY_PLAYWRIGHT_REVIEW_V1';

  const ADVISORY_GROUPS = [
    {
      id: 'central-lower',
      title: 'Central lower advisory',
      blocks: ['011'],
    },
  ];

  const htmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const xmlEscape = htmlEscape;

  const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

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
      minX: Math.min(...points.map((point) => point[0])),
      minY: Math.min(...points.map((point) => point[1])),
      maxX: Math.max(...points.map((point) => point[0])),
      maxY: Math.max(...points.map((point) => point[1])),
    };
  };

  const pointInPolygon = (point, polygon) => {
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

  const sortedBlocks = [...SAJIK_BLOCKS]
    .filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE')
    .sort((left, right) => left.displayPriority - right.displayPriority);
  const topHitBlockAt = (point) => {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    let topBlock = null;
    sortedBlocks.forEach((block) => {
      if (pointInPolygon([point.x, point.y], pathPoints(block.imageGeometry.d))) {
        topBlock = block;
      }
    });
    return topBlock;
  };

  const classifyAdvisory = (row) => {
    if (row.candidateStatus !== 'PIXEL_CANDIDATE_READY') {
      return 'SEED_MISSING_OR_TEXT_ONLY';
    }

    const candidateTopHit = topHitBlockAt(row.candidateCenter);
    if (candidateTopHit && candidateTopHit.block !== row.block) {
      return 'CANDIDATE_SEED_SELECTED_NEIGHBOR';
    }

    const lowInside = row.componentInsidePathRatio < SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO;
    const lowCoverage = row.pathColorCoverageRatio < SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO;
    if (lowInside && !lowCoverage) {
      return 'CANDIDATE_COMPONENT_OVER_EXPANDED';
    }
    if (!lowInside && lowCoverage) {
      return 'PATH_COLOR_UNDER_COVERED';
    }
    if (lowInside && lowCoverage) {
      return 'MANUAL_CROP_REVIEW_REQUIRED';
    }
    return 'ADVISORY_ONLY';
  };

  const expandBounds = (bounds, padding = 28) => ({
    minX: Math.max(0, Math.floor(bounds.minX - padding)),
    minY: Math.max(0, Math.floor(bounds.minY - padding)),
    maxX: Math.min(SAJIK_SEATMAP_IMAGE.imageWidth, Math.ceil(bounds.maxX + padding)),
    maxY: Math.min(SAJIK_SEATMAP_IMAGE.imageHeight, Math.ceil(bounds.maxY + padding)),
  });

  const unionBounds = (boundsList) => {
    const validBounds = boundsList.filter(Boolean);
    if (validBounds.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: SAJIK_SEATMAP_IMAGE.imageWidth,
        maxY: SAJIK_SEATMAP_IMAGE.imageHeight,
      };
    }
    return {
      minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
      minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
      maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
      maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
    };
  };

  const blockByBlock = new Map(SAJIK_BLOCKS.map((block) => [block.block, block]));
  const imageBuffer = await fs.readFile(imagePath);
  const imageDataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
  const alignmentAudit = JSON.parse(await fs.readFile(alignmentAuditPath, 'utf8'));
  const advisoryRows = (alignmentAudit.blocks ?? [])
    .filter((row) => Array.isArray(row.pixelAdvisoryReasons) && row.pixelAdvisoryReasons.length > 0)
    .map((row) => {
      const block = blockByBlock.get(row.block);
      const classification = classifyAdvisory(row);
      return {
        ...row,
        blockData: block,
        classification,
        currentBounds: block ? pathBounds(block.imageGeometry.d) : row.currentPathBounds,
        candidateTopHitBlock: topHitBlockAt(row.candidateCenter)?.block ?? null,
      };
    });

  const advisoryByBlock = new Map(advisoryRows.map((row) => [row.block, row]));

  const renderMetricPill = (label, value, failed) => `
    <span class="metric ${failed ? 'failed' : 'ok'}">${htmlEscape(label)} ${htmlEscape(value)}</span>`;

  const renderBlockTable = (rows) => `
  <table>
    <thead>
      <tr>
        <th>block</th>
        <th>class</th>
        <th>reasons</th>
        <th>candidate hit</th>
        <th>inside</th>
        <th>coverage</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
      <tr>
        <td><code>${htmlEscape(row.block)}</code></td>
        <td>${htmlEscape(row.classification)}</td>
        <td>${htmlEscape(row.pixelAdvisoryReasons.join(', '))}</td>
        <td>${htmlEscape(row.candidateTopHitBlock ?? '-')}</td>
        <td>${row.componentInsidePathRatio}</td>
        <td>${row.pathColorCoverageRatio}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;

  const renderOverlay = ({ id, title, rows, bounds }) => {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const visibleBlocks = SAJIK_BLOCKS.filter((block) => {
      const blockBounds = pathBounds(block.imageGeometry.d);
      return blockBounds.maxX >= bounds.minX
        && blockBounds.minX <= bounds.maxX
        && blockBounds.maxY >= bounds.minY
        && blockBounds.minY <= bounds.maxY;
    });
    const advisoryBlocks = new Set(rows.map((row) => row.block));

    return `
  <section class="review-panel" data-panel-id="${htmlEscape(id)}">
    <div class="panel-header">
      <div>
        <h2>${htmlEscape(title)}</h2>
        <p>official crop=${bounds.minX},${bounds.minY},${width},${height} · orange=current polygon · cyan=official pixel candidate · red=label anchor</p>
      </div>
      <div class="panel-count">${rows.length} advisory blocks</div>
    </div>
    <svg class="seatmap-overlay" viewBox="${bounds.minX} ${bounds.minY} ${width} ${height}" width="1120" height="${Math.max(260, Math.round((height / width) * 1120))}">
      <image href="${imageDataUrl}" x="0" y="0" width="${SAJIK_SEATMAP_IMAGE.imageWidth}" height="${SAJIK_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />
      ${visibleBlocks.map((block) => {
        const isAdvisory = advisoryBlocks.has(block.block);
        const category = SAJIK_CATEGORIES[block.category];
        return `<path d="${xmlEscape(block.imageGeometry.d)}" fill="${category?.light ?? '#38bdf8'}" fill-opacity="${isAdvisory ? '0.35' : '0.04'}" stroke="${isAdvisory ? '#ea580c' : '#64748b'}" stroke-opacity="${isAdvisory ? '0.95' : '0.18'}" stroke-width="${isAdvisory ? '2.2' : '1'}" vector-effect="non-scaling-stroke" />`;
      }).join('')}
      ${rows.map((row) => row.candidateOuterBoundaryPath
      ? `<path d="${xmlEscape(row.candidateOuterBoundaryPath)}" fill="none" stroke="#06b6d4" stroke-width="1.8" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" />`
      : '').join('')}
      ${rows.map((row) => {
        const block = row.blockData;
        if (!block) return '';
        return `
        <circle cx="${block.imageGeometry.labelX}" cy="${block.imageGeometry.labelY}" r="3" fill="#ef4444" stroke="#ffffff" stroke-width="1.2" vector-effect="non-scaling-stroke" />
        <text x="${block.imageGeometry.labelX + 5}" y="${block.imageGeometry.labelY - 5}" font-size="10" font-family="Arial, sans-serif" font-weight="900" fill="#7c2d12" stroke="#ffffff" stroke-width="2.8" paint-order="stroke">${xmlEscape(block.imageGeometry.shortLabel)}</text>`;
      }).join('')}
    </svg>
    <div class="metric-row">
      ${renderMetricPill('min inside', SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO, false)}
      ${renderMetricPill('min coverage', SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO, false)}
      ${renderMetricPill('warnings', rows.length, rows.length > 0)}
    </div>
    ${renderBlockTable(rows)}
  </section>`;
  };

  const groupReports = ADVISORY_GROUPS.map((group) => {
    const rows = group.blocks.map((block) => advisoryByBlock.get(block)).filter(Boolean);
    const bounds = expandBounds(unionBounds(rows.flatMap((row) => [
      row.currentBounds,
      row.candidateBbox,
    ])), 26);
    return {
      ...group,
      rows,
      bounds,
      screenshotPath: path.join(playwrightOutDir, `sajik-advisory-${group.id}.png`),
    };
  });

  const fullBounds = expandBounds(unionBounds(advisoryRows.flatMap((row) => [
    row.currentBounds,
    row.candidateBbox,
  ])), 36);

  const classificationCounts = advisoryRows.reduce((counts, row) => {
    counts[row.classification] = (counts[row.classification] ?? 0) + 1;
    return counts;
  }, {});

  const html = `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sajik seatmap advisory Playwright review</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Arial, "Apple SD Gothic Neo", sans-serif;
        color: #0f172a;
        background: #f8fafc;
      }
      body {
        margin: 0;
        padding: 24px;
        background: #f8fafc;
      }
      h1, h2, p {
        margin: 0;
      }
      h1 {
        font-size: 24px;
        line-height: 1.2;
      }
      h2 {
        font-size: 18px;
        line-height: 1.2;
      }
      p {
        margin-top: 6px;
        color: #475569;
        font-size: 12px;
        font-weight: 700;
      }
      .summary, .review-panel {
        width: 1120px;
        box-sizing: border-box;
        margin: 0 0 18px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        overflow: hidden;
      }
      .summary {
        padding: 18px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-top: 16px;
      }
      .summary-cell {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px;
        background: #f8fafc;
      }
      .summary-cell strong {
        display: block;
        margin-bottom: 4px;
        color: #0f172a;
        font-size: 18px;
      }
      .summary-cell span {
        color: #475569;
        font-size: 11px;
        font-weight: 800;
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .panel-count {
        white-space: nowrap;
        padding: 6px 8px;
        border-radius: 6px;
        background: #fff7ed;
        color: #9a3412;
        font-size: 12px;
        font-weight: 900;
      }
      .seatmap-overlay {
        display: block;
        width: 100%;
        height: auto;
        background: #0f172a;
      }
      .metric-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 16px 0;
      }
      .metric {
        display: inline-flex;
        padding: 5px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 900;
        border: 1px solid #bbf7d0;
        background: #f0fdf4;
        color: #166534;
      }
      .metric.failed {
        border-color: #fed7aa;
        background: #fff7ed;
        color: #9a3412;
      }
      table {
        width: calc(100% - 32px);
        margin: 12px 16px 16px;
        border-collapse: collapse;
        font-size: 11px;
      }
      th, td {
        padding: 7px 8px;
        border: 1px solid #e2e8f0;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f1f5f9;
        font-weight: 900;
      }
      code {
        font-weight: 900;
        color: #0f172a;
      }
    </style>
  </head>
  <body>
    <section class="summary" data-panel-id="summary">
      <h1>Sajik seatmap advisory Playwright review</h1>
      <p>version=${REVIEW_VERSION} · official asset=${htmlEscape(SAJIK_SEATMAP_IMAGE.requiredAssetFileName)} · generated from local PNG only</p>
      <div class="summary-grid">
        <div class="summary-cell"><strong>${alignmentAudit.summary?.lockedVerified ?? '-'}</strong><span>locked verified</span></div>
        <div class="summary-cell"><strong>${alignmentAudit.summary?.officialAlignmentFailures ?? '-'}</strong><span>official failures</span></div>
        <div class="summary-cell"><strong>${advisoryRows.length}</strong><span>advisory warnings</span></div>
        <div class="summary-cell"><strong>${groupReports.length}</strong><span>Playwright crop groups</span></div>
      </div>
    </section>
    ${renderOverlay({ id: 'all-advisory', title: 'All advisory blocks overview', rows: advisoryRows, bounds: fullBounds })}
    ${groupReports.map((group) => renderOverlay({
      id: group.id,
      title: group.title,
      rows: group.rows,
      bounds: group.bounds,
    })).join('')}
  </body>
  </html>`;

  const loadPlaywright = async () => {
    const candidates = [
      process.env.PLAYWRIGHT_MODULE_URL,
      'playwright',
      'file:///Users/mac/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs',
    ].filter(Boolean);
    const failures = [];

    for (const candidate of candidates) {
      try {
        return await import(candidate);
      } catch (error) {
        failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`Unable to load Playwright. Set PLAYWRIGHT_MODULE_URL or install playwright. Attempts: ${failures.join(' | ')}`);
  };

  const launchChromium = async (chromium) => {
    try {
      return await chromium.launch({ channel: 'chrome', headless: true });
    } catch {
      return chromium.launch({ headless: true });
    }
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.mkdir(playwrightOutDir, { recursive: true });
  await fs.writeFile(htmlPath, html, 'utf8');

  const { chromium } = await loadPlaywright();
  const browser = await launchChromium(chromium);
  const page = await browser.newPage({
    viewport: { width: 1220, height: 1000 },
    deviceScaleFactor: 1,
  });

  const panelScreenshots = [];
  try {
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
    const fullScreenshotPath = path.join(playwrightOutDir, 'sajik-advisory-playwright-full.png');
    await page.screenshot({
      path: fullScreenshotPath,
      fullPage: true,
      animations: 'disabled',
    });

    for (const group of [
      { id: 'all-advisory', screenshotPath: path.join(playwrightOutDir, 'sajik-advisory-all-advisory.png') },
      ...groupReports,
    ]) {
      const locator = page.locator(`[data-panel-id="${group.id}"]`).first();
      await locator.screenshot({
        path: group.screenshotPath,
        animations: 'disabled',
      });
      panelScreenshots.push({
        id: group.id,
        screenshotPath: group.screenshotPath,
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      version: REVIEW_VERSION,
      asset: SAJIK_SEATMAP_IMAGE,
      thresholds: {
        minComponentInsidePathRatio: SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
        minPathColorCoverageRatio: SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
      },
      summary: {
        lockedVerified: alignmentAudit.summary?.lockedVerified ?? null,
        officialAlignmentFailures: alignmentAudit.summary?.officialAlignmentFailures ?? null,
        pixelAdvisoryWarnings: advisoryRows.length,
        classificationCounts,
      },
      htmlPath,
      fullScreenshotPath,
      panelScreenshots,
      groups: groupReports.map((group) => ({
        id: group.id,
        title: group.title,
        blocks: group.rows.map((row) => row.block),
        bounds: group.bounds,
        screenshotPath: group.screenshotPath,
      })),
      blocks: advisoryRows.map((row) => ({
        block: row.block,
        id: row.id,
        category: row.category,
        classification: row.classification,
        pixelAdvisoryReasons: row.pixelAdvisoryReasons,
        candidateTopHitBlock: row.candidateTopHitBlock,
        componentInsidePathRatio: row.componentInsidePathRatio,
        pathColorCoverageRatio: row.pathColorCoverageRatio,
        candidateStatus: row.candidateStatus,
        candidateBbox: row.candidateBbox,
        currentPathBounds: row.currentPathBounds,
      })),
    };

    await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const markdown = [
      '# Sajik advisory Playwright review',
      '',
      `- version: \`${REVIEW_VERSION}\``,
      `- locked verified: ${report.summary.lockedVerified}`,
      `- official alignment failures: ${report.summary.officialAlignmentFailures}`,
      `- advisory warnings: ${report.summary.pixelAdvisoryWarnings}`,
      `- HTML review: ${htmlPath}`,
      `- full screenshot: ${fullScreenshotPath}`,
      '',
      '## Classifications',
      '',
      markdownTable(
        ['classification', 'count'],
        Object.entries(classificationCounts)
          .sort((left, right) => right[1] - left[1])
          .map(([classification, count]) => [`\`${classification}\``, String(count)]),
      ),
      '',
      '## Screenshots',
      '',
      markdownTable(
        ['panel', 'screenshot'],
        panelScreenshots.map((item) => [`\`${item.id}\``, item.screenshotPath]),
      ),
      '',
      '## Advisory blocks',
      '',
      markdownTable(
        ['block', 'classification', 'reasons', 'inside', 'coverage', 'candidate hit'],
        advisoryRows.map((row) => [
          `\`${row.block}\``,
          `\`${row.classification}\``,
          row.pixelAdvisoryReasons.map((reason) => `\`${reason}\``).join('<br>'),
          String(round(row.componentInsidePathRatio)),
          String(round(row.pathColorCoverageRatio)),
          row.candidateTopHitBlock ? `\`${row.candidateTopHitBlock}\`` : '-',
        ]),
      ),
      '',
    ].join('\n');
    await fs.writeFile(markdownPath, markdown, 'utf8');

    console.log(`advisory_html:${htmlPath}`);
    console.log(`advisory_json:${jsonPath}`);
    console.log(`advisory_markdown:${markdownPath}`);
    console.log(`advisory_full_screenshot:${fullScreenshotPath}`);
    panelScreenshots.forEach((item) => {
      console.log(`advisory_panel_${item.id}:${item.screenshotPath}`);
    });
    console.log(`status:ok advisory=${advisoryRows.length} panels=${panelScreenshots.length}`);
  } finally {
    await browser.close().catch(() => undefined);
  }
};

const TASKS = {
  "pixel-components": runPixelComponents,
  "trace-manifest": runTraceManifest,
  "alignment-audit": runAlignmentAudit,
  "evidence": runEvidence,
  "advisory-playwright": runAdvisoryPlaywright,
};

export const runSajikCoreQaTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Sajik core QA task: ${task}. Available tasks: ${available}`);
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
  await runSajikCoreQaTask(task, args);
}
