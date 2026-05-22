import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  GWANGJU_BASE_TRACE_BLOCK_COUNT,
  GWANGJU_BLOCKS,
  GWANGJU_COORDINATE_TRACE_STATUS,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
  GWANGJU_FULL_RETRACE_GENERATION,
  GWANGJU_FULL_RETRACE_VERSION,
  GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES,
  GWANGJU_OFFICIAL_TRACE_REFERENCE,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_PREVIOUS_TRACE_VERSION,
  GWANGJU_SELECTABLE_BLOCKS_READY,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_TRACE_REVIEW_REGIONS,
  GWANGJU_TRACE_REVIEW_SUMMARY,
  GWANGJU_ZONE_PRECISION_WORKSETS,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const imagePath = path.resolve(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath);
const REPEATED_NUMBERED_BLOCK_WORKSET_ID = 'p4-repeated-numbered-blocks';
const REPEATED_NUMBERED_BLOCK_EXPECTED_COUNT = 70;
const REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE = 0.98;
const REPEATED_NUMBERED_BLOCK_CATEGORIES = new Set(['SKY_PICNIC', 'FIVE_TABLE']);

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const svgEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const writeCsv = async (filePath, rows) => {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
};

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

function parsePathSubpaths(pathData) {
  return pathData
    .trim()
    .split(/(?=M\s)/)
    .filter(Boolean)
    .map((subpath) => {
      const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      return Array.from({ length: numbers.length / 2 }, (_, index) => ({
        x: numbers[index * 2],
        y: numbers[(index * 2) + 1],
      }));
    });
}

function getPathBounds(subpaths) {
  const points = subpaths.flat();
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function pointInPolygon(point, polygon) {
  let inside = false;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const start = polygon[previous];
    const end = polygon[current];
    const intersects = ((start.y > point.y) !== (end.y > point.y))
      && (point.x < (((end.x - start.x) * (point.y - start.y)) / (end.y - start.y)) + start.x);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getPixelColor(image, x, y) {
  const safeX = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const safeY = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const index = ((safeY * image.width) + safeX) * image.channels;

  return [
    image.data[index],
    image.data[index + 1],
    image.data[index + 2],
  ];
}

function isOfficialSeatColor(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const luminance = ((0.2126 * red) + (0.7152 * green) + (0.0722 * blue)) / 255;

  return luminance <= 0.97
    && saturation >= 0.05
    && !(red < 80 && green < 80 && blue < 80);
}

function isNearOfficialSeatColor(image, x, y, radius = 18) {
  for (let offsetY = -radius; offsetY <= radius; offsetY += 3) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 3) {
      if ((offsetX ** 2) + (offsetY ** 2) > radius ** 2) continue;
      const [red, green, blue] = getPixelColor(image, x + offsetX, y + offsetY);
      if (isOfficialSeatColor(red, green, blue)) {
        return true;
      }
    }
  }

  return false;
}

function calculatePixelCoverageRatio(image, pathData) {
  const subpaths = parsePathSubpaths(pathData);
  const bounds = getPathBounds(subpaths);
  let sampledPoints = 0;
  let seatColorPoints = 0;
  const sampleStep = 3;

  for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
    for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
      if (!subpaths.some((subpath) => pointInPolygon({ x, y }, subpath))) continue;
      sampledPoints += 1;
      if (isNearOfficialSeatColor(image, x, y)) {
        seatColorPoints += 1;
      }
    }
  }

  return sampledPoints === 0 ? 0 : seatColorPoints / sampledPoints;
}

const COMPONENT_COLOR_SPECS = {
  outfield: {
    colors: [[220, 234, 186]],
    threshold: 22,
    minArea: 300,
  },
  'bleachers-table': {
    colors: [[144, 195, 31]],
    threshold: 30,
    minArea: 100,
  },
};

const COMPONENT_EXTRACTION_BOUNDS = { minX: 250, maxX: 1370, minY: 90, maxY: 1090 };

function colorDistance(first, second) {
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}

function isOfficialComponentPixel(image, groupId, x, y) {
  const spec = COMPONENT_COLOR_SPECS[groupId];
  if (!spec) return false;
  const color = getPixelColor(image, x, y);

  return spec.colors.some((target) => colorDistance(color, target) <= spec.threshold);
}

function componentPixelKey(x, y) {
  return `${x},${y}`;
}

const officialComponentCache = new Map();

function extractOfficialComponents(image, groupId) {
  const spec = COMPONENT_COLOR_SPECS[groupId];
  const bounds = COMPONENT_EXTRACTION_BOUNDS;
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const mask = new Uint8Array(width * height);
  const seen = new Uint8Array(width * height);

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (isOfficialComponentPixel(image, groupId, x, y)) {
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
      let area = 0;
      const pixelKeys = new Set();

      seen[startIndex] = 1;
      queue.length = 0;
      queue.push([x, y]);

      for (let head = 0; head < queue.length; head += 1) {
        const [currentX, currentY] = queue[head];
        area += 1;
        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, currentY);
        pixelKeys.add(componentPixelKey(currentX, currentY));

        for (const [offsetX, offsetY] of directions) {
          const nextX = currentX + offsetX;
          const nextY = currentY + offsetY;
          if (nextX < bounds.minX || nextX > bounds.maxX || nextY < bounds.minY || nextY > bounds.maxY) {
            continue;
          }

          const index = ((nextY - bounds.minY) * width) + (nextX - bounds.minX);
          if (!mask[index] || seen[index]) continue;

          seen[index] = 1;
          queue.push([nextX, nextY]);
        }
      }

      if (area >= spec.minArea) {
        components.push({
          id: `${groupId}-${components.length + 1}`,
          area,
          bounds: { minX, minY, maxX, maxY },
          pixelKeys,
        });
      }
    }
  }

  return components.sort((left, right) => (
    left.bounds.minY - right.bounds.minY
    || left.bounds.minX - right.bounds.minX
  ));
}

function getSelectedOfficialComponentPixels(image, reference) {
  if (!officialComponentCache.has(reference.componentGroupId)) {
    officialComponentCache.set(reference.componentGroupId, extractOfficialComponents(image, reference.componentGroupId));
  }

  const selectedIds = new Set(reference.componentIds);
  const selectedPixelKeys = new Set();
  officialComponentCache
    .get(reference.componentGroupId)
    .filter((component) => selectedIds.has(component.id))
    .forEach((component) => {
      component.pixelKeys.forEach((pixelKey) => selectedPixelKeys.add(pixelKey));
    });

  return selectedPixelKeys;
}

function calculateOfficialComponentCoverage(image, pathData, reference) {
  const subpaths = parsePathSubpaths(pathData);
  const selectedComponentPixels = getSelectedOfficialComponentPixels(image, reference);
  const bounds = reference.expectedBounds;
  let componentPixels = 0;
  let polygonPixels = 0;
  let intersectingPixels = 0;
  const sampleStep = 2;
  const padding = 20;
  const minX = Math.max(0, Math.floor(bounds.minX - padding));
  const minY = Math.max(0, Math.floor(bounds.minY - padding));
  const maxX = Math.min(image.width - 1, Math.ceil(bounds.maxX + padding));
  const maxY = Math.min(image.height - 1, Math.ceil(bounds.maxY + padding));

  for (let y = minY; y <= maxY; y += sampleStep) {
    for (let x = minX; x <= maxX; x += sampleStep) {
      const insideReferenceBounds = x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
      const isComponentPixel = insideReferenceBounds && selectedComponentPixels.has(componentPixelKey(x, y));
      const isPolygonPixel = subpaths.some((subpath) => pointInPolygon({ x, y }, subpath));

      if (isComponentPixel) componentPixels += 1;
      if (isPolygonPixel) polygonPixels += 1;
      if (isComponentPixel && isPolygonPixel) intersectingPixels += 1;
    }
  }

  const unionPixels = componentPixels + polygonPixels - intersectingPixels;

  return {
    componentPixels,
    polygonPixels,
    intersectingPixels,
    officialComponentRecall: componentPixels === 0 ? 0 : intersectingPixels / componentPixels,
    componentIoU: unionPixels === 0 ? 0 : intersectingPixels / unionPixels,
  };
}

function polygonArea(polygon) {
  let signedArea = 0;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    signedArea += (polygon[previous].x * polygon[current].y) - (polygon[current].x * polygon[previous].y);
  }

  return Math.abs(signedArea) / 2;
}

function geometryArea(subpaths) {
  return subpaths.reduce((total, subpath) => total + polygonArea(subpath), 0);
}

function calculateSampledOverlapRatio(firstPath, secondPath) {
  const firstSubpaths = parsePathSubpaths(firstPath);
  const secondSubpaths = parsePathSubpaths(secondPath);
  const firstBounds = getPathBounds(firstSubpaths);
  const secondBounds = getPathBounds(secondSubpaths);
  const bounds = {
    minX: Math.max(firstBounds.minX, secondBounds.minX),
    minY: Math.max(firstBounds.minY, secondBounds.minY),
    maxX: Math.min(firstBounds.maxX, secondBounds.maxX),
    maxY: Math.min(firstBounds.maxY, secondBounds.maxY),
  };

  if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) return 0;

  let overlappingPoints = 0;
  const sampleStep = 4;

  for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
    for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
      const point = { x, y };
      if (
        firstSubpaths.some((subpath) => pointInPolygon(point, subpath))
        && secondSubpaths.some((subpath) => pointInPolygon(point, subpath))
      ) {
        overlappingPoints += 1;
      }
    }
  }

  const overlapArea = overlappingPoints * sampleStep * sampleStep;
  return overlapArea / Math.min(geometryArea(firstSubpaths), geometryArea(secondSubpaths));
}

const formatBounds = (bounds) => `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;

const pathPointCount = (subpaths) => subpaths.reduce((total, subpath) => total + subpath.length, 0);

const finiteMinimum = (values) => {
  const finiteValues = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return finiteValues.length === 0 ? null : Math.min(...finiteValues);
};

const maxBoundsDelta = (first, second) => Math.max(
  Math.abs(first.minX - second.minX),
  Math.abs(first.minY - second.minY),
  Math.abs(first.maxX - second.maxX),
  Math.abs(first.maxY - second.maxY),
);

const colorForBlock = (block) => {
  if (block.category === 'SKY_PICNIC') return '#16a34a';
  if (block.category === 'FIVE_TABLE') return '#0284c7';
  if (block.category === 'K9') return '#dc2626';
  if (block.category === 'K8') return '#ea580c';
  if (block.category === 'K5') return '#7c3aed';
  if (block.category === 'OUTFIELD') return '#65a30d';
  if (block.category === 'BLEACHERS_TABLE') return '#0891b2';
  return '#db2777';
};

const createOverlaySvg = (rows, options = {}) => {
  const {
    cropBounds = null,
    imageHref = path.relative(outDir, imagePath),
    includeImage = true,
    showLabels = true,
    title = 'Gwangju trace review overlay',
  } = options;
  const minX = cropBounds?.left ?? 0;
  const minY = cropBounds?.top ?? 0;
  const width = cropBounds?.width ?? GWANGJU_SEATMAP_IMAGE.imageWidth;
  const height = cropBounds?.height ?? GWANGJU_SEATMAP_IMAGE.imageHeight;
  const translate = cropBounds ? ` transform="translate(${-minX} ${-minY})"` : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${svgEscape(title)}">`,
    includeImage ? `<image href="${svgEscape(imageHref)}" x="0" y="0" width="${GWANGJU_SEATMAP_IMAGE.imageWidth}" height="${GWANGJU_SEATMAP_IMAGE.imageHeight}"${translate} opacity="0.92" />` : '',
    `<g${translate}>`,
    ...rows.map((block) => {
      const color = colorForBlock(block);
      return [
        `<path d="${svgEscape(block.path)}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke" />`,
        `<circle cx="${block.labelX}" cy="${block.labelY}" r="8" fill="#111827" stroke="#ffffff" stroke-width="3" />`,
        showLabels ? `<text x="${block.labelX + 10}" y="${block.labelY - 10}" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827" stroke="#ffffff" stroke-width="4" paint-order="stroke">${svgEscape(block.block)}</text>` : '',
      ].join('');
    }),
    '</g>',
    '</svg>',
  ].join('\n');
};

const createCropBounds = (bounds, padding = 28) => {
  const left = Math.max(0, Math.floor(bounds.minX - padding));
  const top = Math.max(0, Math.floor(bounds.minY - padding));
  const right = Math.min(GWANGJU_SEATMAP_IMAGE.imageWidth, Math.ceil(bounds.maxX + padding));
  const bottom = Math.min(GWANGJU_SEATMAP_IMAGE.imageHeight, Math.ceil(bounds.maxY + padding));

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
};

const createUnionBounds = (rows) => rows.reduce((bounds, row) => ({
  minX: Math.min(bounds.minX, row.pathBounds.minX),
  minY: Math.min(bounds.minY, row.pathBounds.minY),
  maxX: Math.max(bounds.maxX, row.pathBounds.maxX),
  maxY: Math.max(bounds.maxY, row.pathBounds.maxY),
}), {
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
});

const reviewRegionByBlockId = new Map();
GWANGJU_TRACE_REVIEW_REGIONS.forEach((region) => {
  region.blockIds.forEach((blockId) => {
    reviewRegionByBlockId.set(blockId, region);
  });
});

const { data: imageData, info: imageInfo } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
const seatMapPixels = {
  data: imageData,
  width: imageInfo.width,
  height: imageInfo.height,
  channels: imageInfo.channels,
};

const blockRows = GWANGJU_BLOCKS.map((block) => {
  const region = reviewRegionByBlockId.get(block.id);
  const zonePrecisionWorksets = GWANGJU_ZONE_PRECISION_WORKSETS.filter((workset) => workset.blockIds.includes(block.id));
  const subpaths = parsePathSubpaths(block.imageGeometry.d);
  const bounds = getPathBounds(subpaths);
  const reference = GWANGJU_OFFICIAL_TRACE_REFERENCE[block.id];
  const currentPointCount = pathPointCount(subpaths);
  const previousPointCount = block.imageGeometry.retraceSourcePointCount ?? currentPointCount;
  const currentPixelCoverageRatio = Number(calculatePixelCoverageRatio(seatMapPixels, block.imageGeometry.d).toFixed(4));
  const componentReference = GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES[block.id] ?? null;
  const componentCoverage = componentReference
    ? calculateOfficialComponentCoverage(seatMapPixels, block.imageGeometry.d, componentReference)
    : null;

  return {
    id: block.id,
    name: block.name,
    block: block.block,
    category: block.category,
    level: block.level,
    side: block.side,
    fanRole: block.fanRole,
    reviewRegionId: region?.id ?? 'UNASSIGNED',
    tracePriority: region?.priority ?? 'P0',
    zonePrecisionWorksetIds: zonePrecisionWorksets.map((workset) => workset.id),
    zonePrecisionPriorities: zonePrecisionWorksets.map((workset) => workset.priority),
    traceMethod: region?.method ?? 'UNASSIGNED',
    traceNote: region?.note ?? '',
    traceStatus: block.imageGeometry.traceStatus,
    traceSource: block.imageGeometry.traceSource,
    traceVersion: block.imageGeometry.traceVersion,
    previousTraceVersion: block.imageGeometry.previousTraceVersion ?? GWANGJU_PREVIOUS_TRACE_VERSION,
    traceGeneration: block.imageGeometry.traceGeneration ?? GWANGJU_FULL_RETRACE_GENERATION,
    manualReviewed: block.imageGeometry.manualReviewed,
    pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    label: block.imageGeometry.shortLabel,
    expectedBounds: reference?.expectedBounds ?? bounds,
    expectedSubpathCount: reference?.expectedSubpathCount ?? subpaths.length,
    pathBounds: bounds,
    retraceSourcePointCount: previousPointCount,
    retracePointCount: block.imageGeometry.retracePointCount ?? currentPointCount,
    actualPathPointCount: currentPointCount,
    retracePointDelta: currentPointCount - previousPointCount,
    previousAnchorDeltaPx: 0,
    previousBoundsDeltaPx: Number(maxBoundsDelta(bounds, reference?.expectedBounds ?? bounds).toFixed(2)),
    previousPixelCoverageDelta: 0,
    pathChangedFromPreviousTrace: (block.imageGeometry.previousTraceVersion ?? GWANGJU_PREVIOUS_TRACE_VERSION) !== block.imageGeometry.traceVersion
      || currentPointCount !== previousPointCount,
    pixelCoverageRatio: currentPixelCoverageRatio,
    officialComponentGroupId: componentReference?.componentGroupId ?? null,
    officialComponentIds: componentReference?.componentIds ?? [],
    officialComponentBounds: componentReference?.expectedBounds ?? null,
    officialComponentMinimumRecall: componentReference?.minimumRecall ?? null,
    officialComponentMinimumIoU: componentReference?.minimumIoU ?? null,
    officialComponentRecall: componentCoverage ? Number(componentCoverage.officialComponentRecall.toFixed(4)) : null,
    componentIoU: componentCoverage ? Number(componentCoverage.componentIoU.toFixed(4)) : null,
    componentCoverageStatus: componentReference && componentCoverage
      ? (
        componentCoverage.officialComponentRecall >= componentReference.minimumRecall
        && componentCoverage.componentIoU >= componentReference.minimumIoU
          ? 'passed'
          : 'failed'
      )
      : 'not-applicable',
    componentCoverageNote: componentReference?.note ?? null,
    path: block.imageGeometry.d,
  };
});

const overlapWarnings = [];
for (let firstIndex = 0; firstIndex < blockRows.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < blockRows.length; secondIndex += 1) {
    const first = blockRows[firstIndex];
    const second = blockRows[secondIndex];
    const overlapRatio = calculateSampledOverlapRatio(first.path, second.path);
    if (overlapRatio > 0.005) {
      overlapWarnings.push({
        firstId: first.id,
        secondId: second.id,
        firstBlock: first.block,
        secondBlock: second.block,
        overlapRatio: Number(overlapRatio.toFixed(4)),
      });
    }
  }
}

const componentCoverageWarnings = blockRows
  .filter((row) => row.componentCoverageStatus === 'failed')
  .map((row) => ({
    id: row.id,
    block: row.block,
    componentGroupId: row.officialComponentGroupId,
    componentIds: row.officialComponentIds,
    officialComponentRecall: row.officialComponentRecall,
    minimumRecall: row.officialComponentMinimumRecall,
    componentIoU: row.componentIoU,
    minimumIoU: row.officialComponentMinimumIoU,
  }));

const regionRows = GWANGJU_TRACE_REVIEW_REGIONS.map((region) => {
  const activeBlockCount = region.blockIds.filter((id) => GWANGJU_BLOCKS.some((block) => block.id === id)).length;
  return {
    id: region.id,
    label: region.label,
    priority: region.priority,
    method: region.method,
    activeBlockCount,
    totalReferences: region.blockIds.length,
    note: region.note,
  };
});

const derivedRangeRows = GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.map((range) => ({
  id: range.id,
  label: range.label,
  displayBlocks: range.displayBlocks,
  officialBlocks: range.officialBlocks,
  blockIds: range.blockIds,
  filterGroupId: range.filterGroupId,
  fanRoles: range.fanRoles ?? [],
  aggregateHitArea: range.aggregateHitArea,
  activeHitArea: 'EXISTING_NUMBERED_BLOCKS_ONLY',
  operatorPolygonStatus: range.operatorPolygonStatus,
  sourceRequirementIds: range.sourceRequirementIds,
}));

const blockRowsById = new Map(blockRows.map((row) => [row.id, row]));
const activeBlockIds = new Set(blockRows.map((row) => row.id));
const zonePrecisionWorksetRows = GWANGJU_ZONE_PRECISION_WORKSETS.map((workset) => {
  const rows = workset.blockIds
    .map((blockId) => blockRowsById.get(blockId))
    .filter(Boolean);
  const missingBlockIds = workset.blockIds.filter((blockId) => !activeBlockIds.has(blockId));
  const componentRows = rows.filter((row) => row.componentCoverageStatus !== 'not-applicable');
  const lowMarginRows = rows
    .filter((row) => row.pixelCoverageRatio < 0.95 || (typeof row.componentIoU === 'number' && row.componentIoU < 0.75))
    .map((row) => ({
      id: row.id,
      block: row.block,
      pixelCoverageRatio: row.pixelCoverageRatio,
      officialComponentRecall: row.officialComponentRecall,
      componentIoU: row.componentIoU,
    }));
  const blockers = [
    ...missingBlockIds.map((blockId) => `MISSING_BLOCK:${blockId}`),
    ...rows
      .filter((row) => row.traceVersion !== GWANGJU_FULL_RETRACE_VERSION)
      .map((row) => `TRACE_VERSION_MISMATCH:${row.id}:${row.traceVersion}:expected=${GWANGJU_FULL_RETRACE_VERSION}`),
    ...rows
      .filter((row) => row.previousTraceVersion !== GWANGJU_PREVIOUS_TRACE_VERSION)
      .map((row) => `PREVIOUS_TRACE_VERSION_MISMATCH:${row.id}:${row.previousTraceVersion}:expected=${GWANGJU_PREVIOUS_TRACE_VERSION}`),
    ...rows
      .filter((row) => row.traceStatus !== 'OFFICIAL_IMAGE_TRACED')
      .map((row) => `TRACE_STATUS_NOT_READY:${row.id}:${row.traceStatus}`),
    ...rows
      .filter((row) => row.manualReviewed !== true)
      .map((row) => `MANUAL_REVIEW_NOT_TRUE:${row.id}`),
    ...rows
      .filter((row) => row.pixelAlignmentStatus !== 'PIXEL_ALIGNED')
      .map((row) => `PIXEL_ALIGNMENT_NOT_READY:${row.id}:${row.pixelAlignmentStatus}`),
    ...rows
      .filter((row) => row.componentCoverageStatus === 'failed')
      .map((row) => `COMPONENT_COVERAGE_FAILED:${row.id}`),
  ];
  if (workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID) {
    if (rows.length !== REPEATED_NUMBERED_BLOCK_EXPECTED_COUNT) {
      blockers.push(`REPEATED_BLOCK_COUNT_CHANGED:${rows.length}`);
    }
    rows
      .filter((row) => !REPEATED_NUMBERED_BLOCK_CATEGORIES.has(row.category))
      .forEach((row) => blockers.push(`REPEATED_BLOCK_CATEGORY_UNEXPECTED:${row.id}:${row.category}`));
    rows
      .filter((row) => row.pixelCoverageRatio < REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE)
      .forEach((row) => blockers.push(`REPEATED_BLOCK_PIXEL_COVERAGE_BELOW_LOCK:${row.id}:${row.pixelCoverageRatio}`));
    lowMarginRows.forEach((row) => blockers.push(`REPEATED_BLOCK_LOW_MARGIN_ROW:${row.id}`));
  }

  return {
    id: workset.id,
    label: workset.label,
    priority: workset.priority,
    note: workset.note,
    acceptanceFocus: workset.acceptanceFocus,
    expectedBlockCount: workset.blockIds.length,
    activeBlockCount: rows.length,
    missingBlockIds,
    blockIds: workset.blockIds,
    minimumPixelCoverageRatio: finiteMinimum(rows.map((row) => row.pixelCoverageRatio)),
    minimumOfficialComponentRecall: finiteMinimum(componentRows.map((row) => row.officialComponentRecall)),
    minimumComponentIoU: finiteMinimum(componentRows.map((row) => row.componentIoU)),
    componentCoverageBlockCount: componentRows.length,
    lowMarginRows,
    repeatedBlockPixelCoverageMinimum: workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID
      ? REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE
      : null,
    maximumPreviousBoundsDeltaPx: finiteMinimum(rows.map((row) => -row.previousBoundsDeltaPx)) === null
      ? null
      : Math.max(...rows.map((row) => row.previousBoundsDeltaPx)),
    maximumPreviousAnchorDeltaPx: finiteMinimum(rows.map((row) => -row.previousAnchorDeltaPx)) === null
      ? null
      : Math.max(...rows.map((row) => row.previousAnchorDeltaPx)),
    totalRetracePointDelta: rows.reduce((total, row) => total + row.retracePointDelta, 0),
    blocksChangedFromPreviousTrace: rows.filter((row) => row.pathChangedFromPreviousTrace).length,
    status: blockers.length === 0 ? 'passed' : 'failed',
    blockers,
  };
});

const zonePrecisionWarnings = zonePrecisionWorksetRows.flatMap((workset) => workset.blockers.map((blocker) => ({
  worksetId: workset.id,
  blocker,
})));

const summary = {
  traceStatus: GWANGJU_COORDINATE_TRACE_STATUS,
  traceVersion: GWANGJU_FULL_RETRACE_VERSION,
  previousTraceVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
  traceGeneration: GWANGJU_FULL_RETRACE_GENERATION,
  selectableBlocksReady: GWANGJU_SELECTABLE_BLOCKS_READY,
  baseTraceBlocks: GWANGJU_BASE_TRACE_BLOCK_COUNT,
  totalBlocks: GWANGJU_BLOCKS.length,
  fullRetracedBlocks: blockRows.filter((row) => row.traceGeneration === GWANGJU_FULL_RETRACE_GENERATION).length,
  blocksChangedFromPreviousTrace: blockRows.filter((row) => row.pathChangedFromPreviousTrace).length,
  totalRetracePointDelta: blockRows.reduce((total, row) => total + row.retracePointDelta, 0),
  maximumPreviousAnchorDeltaPx: Math.max(...blockRows.map((row) => row.previousAnchorDeltaPx)),
  maximumPreviousBoundsDeltaPx: Math.max(...blockRows.map((row) => row.previousBoundsDeltaPx)),
  maximumPreviousPixelCoverageDelta: Math.max(...blockRows.map((row) => Math.abs(row.previousPixelCoverageDelta))),
  derivedRangeCount: derivedRangeRows.length,
  derivedRangeDisplayBlocks: Object.fromEntries(derivedRangeRows.map((range) => [range.id, range.displayBlocks])),
  operatorBlockRangeReusesExistingTrace: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  aggregateHitAreaMode: 'REUSES_EXISTING_TRACE_ONLY',
  officialImageTracedBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.officialImageTraced,
  directOfficialTraceBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.directOfficialTrace,
  manualReviewedBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.manualReviewed,
  pixelAlignedBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.pixelAligned,
  overlapWarningCount: overlapWarnings.length,
  componentCoverageWarningCount: componentCoverageWarnings.length,
  componentCoverageBlockCount: blockRows.filter((row) => row.componentCoverageStatus !== 'not-applicable').length,
  zonePrecisionWorksetCount: zonePrecisionWorksetRows.length,
  zonePrecisionStatus: zonePrecisionWarnings.length === 0 ? 'passed' : 'failed',
  zonePrecisionWarningCount: zonePrecisionWarnings.length,
  zonePrecisionActiveBlockCoverage: new Set(zonePrecisionWorksetRows.flatMap((workset) => workset.blockIds)).size,
  repeatedNumberedBlockPixelCoverageMinimum: REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE,
  repeatedNumberedBlockMinimumPixelCoverageRatio: zonePrecisionWorksetRows
    .find((workset) => workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID)?.minimumPixelCoverageRatio ?? null,
  minimumOfficialComponentRecall: Math.min(
    ...blockRows
      .filter((row) => typeof row.officialComponentRecall === 'number')
      .map((row) => row.officialComponentRecall),
  ),
  minimumComponentIoU: Math.min(
    ...blockRows
      .filter((row) => typeof row.componentIoU === 'number')
      .map((row) => row.componentIoU),
  ),
  minimumPixelCoverageRatio: Math.min(...blockRows.map((row) => row.pixelCoverageRatio)),
  operatorRequiredSections: GWANGJU_OPERATOR_SECTION_REQUIREMENTS.filter((section) => section.status !== 'READY').map((section) => section.name),
};

await fs.mkdir(outDir, { recursive: true });

const fullOverlaySvgPath = path.join(outDir, 'gwangju-seatmap-trace-review-overlay.svg');
const fullOverlayPngPath = path.join(outDir, 'gwangju-seatmap-trace-review-overlay.png');
const cleanCropDir = path.join(outDir, 'gwangju-seatmap-trace-review-clean-crops');
const zoneCropDir = path.join(outDir, 'gwangju-seatmap-trace-review-zone-crops');
const fullOverlaySvg = createOverlaySvg(blockRows, {
  imageHref: path.relative(outDir, imagePath),
  title: '광주-KIA 챔피언스필드 공식 좌석도 polygon trace overlay',
});
const fullOverlayPngLayerSvg = createOverlaySvg(blockRows, {
  includeImage: false,
  title: '광주-KIA 챔피언스필드 공식 좌석도 polygon trace overlay',
});
await fs.writeFile(fullOverlaySvgPath, fullOverlaySvg, 'utf8');
await sharp(imagePath)
  .composite([{ input: Buffer.from(fullOverlayPngLayerSvg), top: 0, left: 0 }])
  .png()
  .toFile(fullOverlayPngPath);

await fs.mkdir(cleanCropDir, { recursive: true });
await fs.mkdir(zoneCropDir, { recursive: true });
const cleanOverlayArtifacts = [];
for (const block of blockRows) {
  const cropBounds = createCropBounds(block.pathBounds);
  const slug = block.id.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const cropPath = path.join(cleanCropDir, `gwangju-seatmap-trace-review-${slug}-clean-overlay.png`);
  const cropOverlaySvg = createOverlaySvg([block], {
    cropBounds,
    includeImage: false,
    showLabels: true,
    title: `${block.block} clean trace crop`,
  });

  await sharp(imagePath)
    .extract(cropBounds)
    .composite([{ input: Buffer.from(cropOverlaySvg), top: 0, left: 0 }])
    .png()
    .toFile(cropPath);

  cleanOverlayArtifacts.push({
    id: block.id,
    block: block.block,
    path: cropPath,
    cropBounds,
  });
}

const zoneOverlayArtifacts = [];
for (const workset of zonePrecisionWorksetRows) {
  const rows = workset.blockIds
    .map((blockId) => blockRowsById.get(blockId))
    .filter(Boolean);
  if (rows.length === 0) continue;

  const cropBounds = createCropBounds(createUnionBounds(rows), workset.id === 'p5-full-release-reference' ? 0 : 36);
  const slug = workset.id.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const cropPath = path.join(zoneCropDir, `gwangju-seatmap-trace-review-${slug}-zone-overlay.png`);
  const cropOverlaySvg = createOverlaySvg(rows, {
    cropBounds,
    includeImage: false,
    showLabels: true,
    title: `${workset.label} zone trace crop`,
  });

  await sharp(imagePath)
    .extract(cropBounds)
    .composite([{ input: Buffer.from(cropOverlaySvg), top: 0, left: 0 }])
    .png()
    .toFile(cropPath);

  zoneOverlayArtifacts.push({
    id: workset.id,
    label: workset.label,
    priority: workset.priority,
    path: cropPath,
    cropBounds,
    activeBlockCount: rows.length,
  });
}

const artifacts = {
  manifestJson: path.join(outDir, 'gwangju-seatmap-trace-review.json'),
  manifestCsv: path.join(outDir, 'gwangju-seatmap-trace-review.csv'),
  manifestMarkdown: path.join(outDir, 'gwangju-seatmap-trace-review.md'),
  fullOverlaySvg: fullOverlaySvgPath,
  fullOverlayPng: fullOverlayPngPath,
  cleanOverlayArtifacts,
  zoneOverlayArtifacts,
};

const manifest = {
  generatedAt: new Date().toISOString(),
  asset: GWANGJU_SEATMAP_IMAGE,
  summary,
  artifacts,
  reviewRegions: regionRows,
  zonePrecisionWorksets: zonePrecisionWorksetRows,
  derivedOperatorBlockRanges: derivedRangeRows,
  markerOnlyZones: GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  overlapWarnings,
  componentCoverageWarnings,
  zonePrecisionWarnings,
  blocks: blockRows,
};

const markdown = [
  '# 광주-KIA 챔피언스필드 좌석도 좌표 재트레이싱 manifest',
  '',
  `- 공식 이미지: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
  `- 좌표 상태: \`${GWANGJU_COORDINATE_TRACE_STATUS}\``,
  `- trace version: \`${summary.traceVersion}\``,
  `- previous trace version: \`${summary.previousTraceVersion}\``,
  `- trace generation: \`${summary.traceGeneration}\``,
  `- 선택 활성화: \`${GWANGJU_SELECTABLE_BLOCKS_READY}\``,
  `- base traced blocks: ${summary.baseTraceBlocks}`,
  `- active blocks: ${summary.totalBlocks}`,
  `- full retraced blocks: ${summary.fullRetracedBlocks}`,
  `- blocks changed from previous trace: ${summary.blocksChangedFromPreviousTrace}`,
  `- total retrace point delta: ${summary.totalRetracePointDelta}`,
  `- max previous anchor delta px: ${summary.maximumPreviousAnchorDeltaPx.toFixed(2)}`,
  `- max previous bbox delta px: ${summary.maximumPreviousBoundsDeltaPx.toFixed(2)}`,
  `- max previous pixel coverage delta: ${summary.maximumPreviousPixelCoverageDelta.toFixed(4)}`,
  `- derived ranges: ${summary.derivedRangeCount}`,
  `- K7/AWAY aggregate hit-area mode: \`${summary.aggregateHitAreaMode}\``,
  `- official image traced blocks: ${summary.officialImageTracedBlocks}`,
  `- direct official trace blocks: ${summary.directOfficialTraceBlocks}`,
  `- manual reviewed blocks: ${summary.manualReviewedBlocks}`,
  `- pixel aligned blocks: ${summary.pixelAlignedBlocks}`,
  `- minimum pixel coverage ratio: ${summary.minimumPixelCoverageRatio.toFixed(4)}`,
  `- O/P component coverage blocks: ${summary.componentCoverageBlockCount}`,
  `- minimum O/P official component recall: ${summary.minimumOfficialComponentRecall.toFixed(4)}`,
  `- minimum O/P component IoU: ${summary.minimumComponentIoU.toFixed(4)}`,
  `- zone precision worksets: ${summary.zonePrecisionWorksetCount}`,
  `- zone precision status: \`${summary.zonePrecisionStatus}\``,
  `- zone precision warnings: ${summary.zonePrecisionWarningCount}`,
  `- zone precision active coverage: ${summary.zonePrecisionActiveBlockCoverage}`,
  `- P4 repeated block pixel coverage lock: ${summary.repeatedNumberedBlockMinimumPixelCoverageRatio?.toFixed(4) ?? '-'} / ${summary.repeatedNumberedBlockPixelCoverageMinimum.toFixed(2)}`,
  `- overlap warnings: ${summary.overlapWarningCount}`,
  `- component coverage warnings: ${summary.componentCoverageWarningCount}`,
  `- operator required: ${summary.operatorRequiredSections.join(', ') || '-'}`,
  '',
  '## 산출물',
  '',
  `- manifest JSON: \`${path.basename(artifacts.manifestJson)}\``,
  `- manifest CSV: \`${path.basename(artifacts.manifestCsv)}\``,
  `- full overlay SVG: \`${path.basename(artifacts.fullOverlaySvg)}\``,
  `- full overlay PNG: \`${path.basename(artifacts.fullOverlayPng)}\``,
  `- block clean overlay crops: \`${path.basename(cleanCropDir)}/\` (${cleanOverlayArtifacts.length} files)`,
  `- zone overlay crops: \`${path.basename(zoneCropDir)}/\` (${zoneOverlayArtifacts.length} files)`,
  '',
  '## 재트레이싱 구역',
  '',
  markdownTable(
    ['id', 'label', 'priority', 'method', 'active', 'total', 'note'],
    regionRows.map((region) => [
      `\`${region.id}\``,
      region.label,
      region.priority,
      region.method,
      String(region.activeBlockCount),
      String(region.totalReferences),
      region.note,
    ]),
  ),
  '',
  '## 구역별 precision workset',
  '',
  markdownTable(
    ['id', 'priority', 'active', 'min coverage', 'min recall', 'min IoU', 'low margin rows', 'status', 'focus'],
    zonePrecisionWorksetRows.map((workset) => [
      `\`${workset.id}\``,
      workset.priority,
      `${workset.activeBlockCount}/${workset.expectedBlockCount}`,
      workset.minimumPixelCoverageRatio === null ? '-' : workset.minimumPixelCoverageRatio.toFixed(4),
      workset.minimumOfficialComponentRecall === null ? '-' : workset.minimumOfficialComponentRecall.toFixed(4),
      workset.minimumComponentIoU === null ? '-' : workset.minimumComponentIoU.toFixed(4),
      String(workset.lowMarginRows.length),
      `\`${workset.status}\``,
      workset.acceptanceFocus.map((item) => `\`${item}\``).join('<br>'),
    ]),
  ),
  '',
  `각 workset은 \`${GWANGJU_FULL_RETRACE_VERSION}\` active geometry를 기준으로 bbox/anchor/coverage/component/overlap evidence를 묶어 검수합니다. P5는 전체 111개 reference 재고정과 K7/AWAY derived-only 계약을 확인합니다.`,
  '',
  '## Derived range / no aggregate hit-area',
  '',
  'K7석/원정응원석/홈 응원석은 운영자 polygon 승격 전까지 active block 111개를 유지하고 기존 번호 블럭 hit-area만 재사용합니다.',
  '',
  markdownTable(
    ['id', 'label', 'display blocks', 'filter', 'hit-area', 'polygon status', 'source requirements'],
    derivedRangeRows.map((range) => [
      `\`${range.id}\``,
      range.label,
      range.displayBlocks,
      `\`${range.filterGroupId}\``,
      `\`${range.aggregateHitArea}\``,
      `\`${range.operatorPolygonStatus}\``,
      range.sourceRequirementIds.map((id) => `\`${id}\``).join('<br>'),
    ]),
  ),
  '',
  '## O/P component coverage',
  '',
  '기존 `pixelCoverageRatio`는 작은 polygon도 색상 영역 안에만 있으면 통과할 수 있으므로, O/P 외야 계열은 공식 PNG component recall/IoU를 별도로 차단 기준으로 둡니다.',
  '',
  '101~108 하단 내야는 `gwangju-seatmap-image-alignment-audit`에서 공식 PNG 독립 mask recall/IoU/outside bleed를 추가로 확인합니다.',
  '',
  markdownTable(
    ['id', 'components', 'recall', 'min recall', 'IoU', 'min IoU', 'status'],
    blockRows
      .filter((block) => block.componentCoverageStatus !== 'not-applicable')
      .map((block) => [
        `\`${block.id}\``,
        block.officialComponentIds.map((id) => `\`${id}\``).join('<br>'),
        block.officialComponentRecall.toFixed(4),
        block.officialComponentMinimumRecall.toFixed(2),
        block.componentIoU.toFixed(4),
        block.officialComponentMinimumIoU.toFixed(2),
        `\`${block.componentCoverageStatus}\``,
      ]),
  ),
  '',
  '## 검수 방법',
  '',
  '1. `npm run qa:stadium:gwangju:trace-review`를 실행해 debug overlay screenshot과 CSV를 생성합니다.',
  '2. `/stadium?gwangjuDebug=hit`에서 공식 PNG와 polygon을 같은 2200x1159 좌표계로 비교합니다.',
  '3. active block은 모두 `OFFICIAL_IMAGE_TRACED`/`PIXEL_ALIGNED`로 유지하고, 신규 블록은 같은 좌표계의 정적 polygon으로만 추가합니다.',
  '4. K7석/원정응원석은 운영자 제공 polygon이 들어오기 전까지 hit-area를 만들지 않습니다.',
  '5. O/P 외야 계열은 component recall/IoU gate로 작은 legacy polygon이 일반 좌석 layer에 남는 회귀를 차단합니다.',
  '6. `previousTraceVersion`, bbox/anchor/coverage delta, point-count delta와 zone overlay crop으로 이전 trace 대비 재트레이싱 결과를 확인합니다.',
  '',
].join('\n');

const jsonPath = path.join(outDir, 'gwangju-seatmap-trace-review.json');
const csvPath = path.join(outDir, 'gwangju-seatmap-trace-review.csv');
const markdownPath = path.join(outDir, 'gwangju-seatmap-trace-review.md');

await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'name',
    'block',
    'category',
    'level',
    'side',
    'fanRole',
    'reviewRegionId',
    'tracePriority',
    'zonePrecisionWorksetIds',
    'zonePrecisionPriorities',
    'traceMethod',
    'traceNote',
    'traceStatus',
    'traceSource',
    'traceVersion',
    'previousTraceVersion',
    'traceGeneration',
    'manualReviewed',
    'pixelAlignmentStatus',
    'labelX',
    'labelY',
    'label',
    'pathMinX',
    'pathMinY',
    'pathMaxX',
    'pathMaxY',
    'expectedMinX',
    'expectedMinY',
    'expectedMaxX',
    'expectedMaxY',
    'expectedSubpathCount',
    'retraceSourcePointCount',
    'retracePointCount',
    'actualPathPointCount',
    'retracePointDelta',
    'previousAnchorDeltaPx',
    'previousBoundsDeltaPx',
    'previousPixelCoverageDelta',
    'pathChangedFromPreviousTrace',
    'pixelCoverageRatio',
    'officialComponentGroupId',
    'officialComponentIds',
    'officialComponentMinX',
    'officialComponentMinY',
    'officialComponentMaxX',
    'officialComponentMaxY',
    'officialComponentMinimumRecall',
    'officialComponentMinimumIoU',
    'officialComponentRecall',
    'componentIoU',
    'componentCoverageStatus',
    'path',
  ],
  ...blockRows.map((block) => [
    block.id,
    block.name,
    block.block,
    block.category,
    block.level,
    block.side,
    block.fanRole,
    block.reviewRegionId,
    block.tracePriority,
    block.zonePrecisionWorksetIds.join('|'),
    block.zonePrecisionPriorities.join('|'),
    block.traceMethod,
    block.traceNote,
    block.traceStatus,
    block.traceSource,
    block.traceVersion,
    block.previousTraceVersion,
    block.traceGeneration,
    block.manualReviewed,
    block.pixelAlignmentStatus,
    block.labelX,
    block.labelY,
    block.label,
    block.pathBounds.minX,
    block.pathBounds.minY,
    block.pathBounds.maxX,
    block.pathBounds.maxY,
    block.expectedBounds.minX,
    block.expectedBounds.minY,
    block.expectedBounds.maxX,
    block.expectedBounds.maxY,
    block.expectedSubpathCount,
    block.retraceSourcePointCount,
    block.retracePointCount,
    block.actualPathPointCount,
    block.retracePointDelta,
    block.previousAnchorDeltaPx,
    block.previousBoundsDeltaPx,
    block.previousPixelCoverageDelta,
    block.pathChangedFromPreviousTrace,
    block.pixelCoverageRatio,
    block.officialComponentGroupId ?? '',
    block.officialComponentIds.join('|'),
    block.officialComponentBounds?.minX ?? '',
    block.officialComponentBounds?.minY ?? '',
    block.officialComponentBounds?.maxX ?? '',
    block.officialComponentBounds?.maxY ?? '',
    block.officialComponentMinimumRecall ?? '',
    block.officialComponentMinimumIoU ?? '',
    block.officialComponentRecall ?? '',
    block.componentIoU ?? '',
    block.componentCoverageStatus,
    block.path,
  ]),
]);
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`manifest_json:${jsonPath}`);
console.log(`manifest_csv:${csvPath}`);
console.log(`manifest_markdown:${markdownPath}`);
console.log(`manifest_overlay:${fullOverlayPngPath}`);
console.log(`manifest_clean_crops:${cleanCropDir}`);
const manifestStatus = summary.overlapWarningCount === 0 && summary.componentCoverageWarningCount === 0 && summary.zonePrecisionWarningCount === 0 ? 'ok' : 'failed';
console.log(`status:${manifestStatus} total=${summary.totalBlocks} traced=${summary.officialImageTracedBlocks} pixel_aligned=${summary.pixelAlignedBlocks} overlap_warnings=${summary.overlapWarningCount} component_warnings=${summary.componentCoverageWarningCount} zone_warnings=${summary.zonePrecisionWarningCount} selectable=${summary.selectableBlocksReady}`);
if (manifestStatus !== 'ok') {
  process.exitCode = 1;
}
