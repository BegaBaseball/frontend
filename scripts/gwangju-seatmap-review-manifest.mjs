import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  GWANGJU_BASE_TRACE_BLOCK_COUNT,
  GWANGJU_BLOCKS,
  GWANGJU_COORDINATE_TRACE_STATUS,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
  GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  GWANGJU_OFFICIAL_TRACE_REFERENCE,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_SELECTABLE_BLOCKS_READY,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_TRACE_REVIEW_REGIONS,
  GWANGJU_TRACE_REVIEW_SUMMARY,
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
  const subpaths = parsePathSubpaths(block.imageGeometry.d);
  const bounds = getPathBounds(subpaths);
  const reference = GWANGJU_OFFICIAL_TRACE_REFERENCE[block.id];

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
    traceMethod: region?.method ?? 'UNASSIGNED',
    traceNote: region?.note ?? '',
    traceStatus: block.imageGeometry.traceStatus,
    traceSource: block.imageGeometry.traceSource,
    traceVersion: block.imageGeometry.traceVersion,
    manualReviewed: block.imageGeometry.manualReviewed,
    pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    label: block.imageGeometry.shortLabel,
    expectedBounds: reference?.expectedBounds ?? bounds,
    expectedSubpathCount: reference?.expectedSubpathCount ?? subpaths.length,
    pathBounds: bounds,
    pixelCoverageRatio: Number(calculatePixelCoverageRatio(seatMapPixels, block.imageGeometry.d).toFixed(4)),
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

const summary = {
  traceStatus: GWANGJU_COORDINATE_TRACE_STATUS,
  selectableBlocksReady: GWANGJU_SELECTABLE_BLOCKS_READY,
  baseTraceBlocks: GWANGJU_BASE_TRACE_BLOCK_COUNT,
  totalBlocks: GWANGJU_BLOCKS.length,
  derivedRangeCount: derivedRangeRows.length,
  derivedRangeDisplayBlocks: Object.fromEntries(derivedRangeRows.map((range) => [range.id, range.displayBlocks])),
  operatorBlockRangeReusesExistingTrace: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  aggregateHitAreaMode: 'REUSES_EXISTING_TRACE_ONLY',
  officialImageTracedBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.officialImageTraced,
  directOfficialTraceBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.directOfficialTrace,
  manualReviewedBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.manualReviewed,
  pixelAlignedBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.pixelAligned,
  overlapWarningCount: overlapWarnings.length,
  minimumPixelCoverageRatio: Math.min(...blockRows.map((row) => row.pixelCoverageRatio)),
  operatorRequiredSections: GWANGJU_OPERATOR_SECTION_REQUIREMENTS.filter((section) => section.status !== 'READY').map((section) => section.name),
};

await fs.mkdir(outDir, { recursive: true });

const fullOverlaySvgPath = path.join(outDir, 'gwangju-seatmap-trace-review-overlay.svg');
const fullOverlayPngPath = path.join(outDir, 'gwangju-seatmap-trace-review-overlay.png');
const cleanCropDir = path.join(outDir, 'gwangju-seatmap-trace-review-clean-crops');
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

const artifacts = {
  manifestJson: path.join(outDir, 'gwangju-seatmap-trace-review.json'),
  manifestCsv: path.join(outDir, 'gwangju-seatmap-trace-review.csv'),
  manifestMarkdown: path.join(outDir, 'gwangju-seatmap-trace-review.md'),
  fullOverlaySvg: fullOverlaySvgPath,
  fullOverlayPng: fullOverlayPngPath,
  cleanOverlayArtifacts,
};

const manifest = {
  generatedAt: new Date().toISOString(),
  asset: GWANGJU_SEATMAP_IMAGE,
  summary,
  artifacts,
  reviewRegions: regionRows,
  derivedOperatorBlockRanges: derivedRangeRows,
  markerOnlyZones: GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  overlapWarnings,
  blocks: blockRows,
};

const markdown = [
  '# 광주-KIA 챔피언스필드 좌석도 좌표 재트레이싱 manifest',
  '',
  `- 공식 이미지: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
  `- 좌표 상태: \`${GWANGJU_COORDINATE_TRACE_STATUS}\``,
  `- 선택 활성화: \`${GWANGJU_SELECTABLE_BLOCKS_READY}\``,
  `- base traced blocks: ${summary.baseTraceBlocks}`,
  `- active blocks: ${summary.totalBlocks}`,
  `- derived ranges: ${summary.derivedRangeCount}`,
  `- K7/AWAY aggregate hit-area mode: \`${summary.aggregateHitAreaMode}\``,
  `- official image traced blocks: ${summary.officialImageTracedBlocks}`,
  `- direct official trace blocks: ${summary.directOfficialTraceBlocks}`,
  `- manual reviewed blocks: ${summary.manualReviewedBlocks}`,
  `- pixel aligned blocks: ${summary.pixelAlignedBlocks}`,
  `- minimum pixel coverage ratio: ${summary.minimumPixelCoverageRatio.toFixed(4)}`,
  `- overlap warnings: ${summary.overlapWarningCount}`,
  `- operator required: ${summary.operatorRequiredSections.join(', ') || '-'}`,
  '',
  '## 산출물',
  '',
  `- manifest JSON: \`${path.basename(artifacts.manifestJson)}\``,
  `- manifest CSV: \`${path.basename(artifacts.manifestCsv)}\``,
  `- full overlay SVG: \`${path.basename(artifacts.fullOverlaySvg)}\``,
  `- full overlay PNG: \`${path.basename(artifacts.fullOverlayPng)}\``,
  `- block clean overlay crops: \`${path.basename(cleanCropDir)}/\` (${cleanOverlayArtifacts.length} files)`,
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
  '## 검수 방법',
  '',
  '1. `npm run qa:stadium:gwangju:trace-review`를 실행해 debug overlay screenshot과 CSV를 생성합니다.',
  '2. `/stadium?gwangjuDebug=hit`에서 공식 PNG와 polygon을 같은 2200x1159 좌표계로 비교합니다.',
  '3. active block은 모두 `OFFICIAL_IMAGE_TRACED`/`PIXEL_ALIGNED`로 유지하고, 신규 블록은 같은 좌표계의 정적 polygon으로만 추가합니다.',
  '4. K7석/원정응원석은 운영자 제공 polygon이 들어오기 전까지 hit-area를 만들지 않습니다.',
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
    'traceMethod',
    'traceNote',
    'traceStatus',
    'traceSource',
    'traceVersion',
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
    'pixelCoverageRatio',
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
    block.traceMethod,
    block.traceNote,
    block.traceStatus,
    block.traceSource,
    block.traceVersion,
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
    block.pixelCoverageRatio,
    block.path,
  ]),
]);
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`manifest_json:${jsonPath}`);
console.log(`manifest_csv:${csvPath}`);
console.log(`manifest_markdown:${markdownPath}`);
console.log(`manifest_overlay:${fullOverlayPngPath}`);
console.log(`manifest_clean_crops:${cleanCropDir}`);
console.log(`status:ok total=${summary.totalBlocks} traced=${summary.officialImageTracedBlocks} pixel_aligned=${summary.pixelAlignedBlocks} overlap_warnings=${summary.overlapWarningCount} selectable=${summary.selectableBlocksReady}`);
