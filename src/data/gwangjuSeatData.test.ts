import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import sharp from 'sharp';
import {
  GWANGJU_BASE_TRACE_BLOCK_COUNT,
  GWANGJU_BLOCKS,
  GWANGJU_CATEGORIES,
  GWANGJU_CATEGORY_GROUPS,
  GWANGJU_COORDINATE_TRACE_STATUS,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
  GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
  GWANGJU_FULL_RETRACE_GENERATION,
  GWANGJU_FULL_RETRACE_VERSION,
  GWANGJU_IMAGE_GEOMETRY_DRAFTS,
  GWANGJU_OFFICIAL_TRACE_REFERENCE,
  GWANGJU_AWAY_CHEERING_BLOCK_IDS,
  GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS,
  GWANGJU_HOME_CHEERING_BLOCK_IDS,
  GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS,
  GWANGJU_K7_OFFICIAL_BLOCKS,
  GWANGJU_MYSEATCHECK_REFERENCE_URL,
  GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
  GWANGJU_PREVIOUS_TRACE_VERSION,
  GWANGJU_SELECTABLE_BLOCKS_READY,
  GWANGJU_SEATMAP_COORDINATES_READY,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_TRACE_ANCHOR_TOLERANCE_PX,
  GWANGJU_TRACE_BOUNDS_TOLERANCE_PX,
  GWANGJU_TRACE_REVIEW_REGIONS,
  GWANGJU_TRACE_REVIEW_SUMMARY,
  GWANGJU_ZONE_PRECISION_WORKSETS,
  getGwangjuDerivedOperatorRangesForBlock,
  matchesGwangjuCategoryGroup,
} from './gwangjuSeatData';

const REQUIRED_CORE_CATEGORIES = [
  'CHAMPION',
  'CENTRAL_TABLE',
  'TABLE',
  'K9',
  'K7',
  'K5',
  'K3',
  'SURPRISE',
  'OUTFIELD',
  'FAMILY',
  'AWAY',
  'ACCESSIBLE',
];
const OFFICIAL_ALPHABET_SECTION_IDS = [
  'champion-seats',
  'central-table-seats',
  'disabled-seats-center',
  'first-surprise-seats',
  'third-surprise-seats',
  'first-family-seats',
  'third-family-seats',
  'first-wheelchair-seats',
  'third-wheelchair-seats',
  'party-seats-first',
  'party-seats-third',
  'skybox-seats',
];
const OFFICIAL_ALPHABET_SHORT_LABELS = ['A', 'B', 'C', 'G', 'H', 'I', 'J', 'K'];
const OFFICIAL_ALPHABET_OFFICIAL_BLOCKS = [
  '챔피언석',
  '중앙 테이블석',
  '장애인지정석',
  '1루 서프라이즈석',
  '3루 서프라이즈석',
  '1루 타이거즈가족석',
  '3루 타이거즈가족석',
  '1루 휠체어석',
  '3루 휠체어석',
  '3루 휠체어석',
  '1루 4층파티석',
  '3루 4층파티석',
  '스카이박스',
];
const EXPECTED_OPERATOR_REQUIRED_FIELDS = [
  'officialBlocks',
  'level',
  'side',
  'fanRole',
  'points',
  'labelX',
  'labelY',
  'shortLabel',
  'reviewer',
  'reviewedAt',
];
const DERIVED_AGGREGATE_BLOCK_IDS = new Set(['home-k7-seats', 'away-cheering-seats']);
const DERIVED_AGGREGATE_SOURCE_IDS_BY_BLOCK_ID = new Map<string, Set<string>>([
  ['home-k7-seats', new Set(GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS)],
  ['away-cheering-seats', new Set(GWANGJU_AWAY_CHEERING_BLOCK_IDS)],
]);

function isDerivedAggregateBlockId(blockId: string): boolean {
  return DERIVED_AGGREGATE_BLOCK_IDS.has(blockId);
}

function isAllowedDerivedAggregateOverlap(firstId: string, secondId: string): boolean {
  if (isDerivedAggregateBlockId(firstId) && isDerivedAggregateBlockId(secondId)) {
    return true;
  }

  const firstSources = DERIVED_AGGREGATE_SOURCE_IDS_BY_BLOCK_ID.get(firstId);
  if (firstSources?.has(secondId)) {
    return true;
  }

  const secondSources = DERIVED_AGGREGATE_SOURCE_IDS_BY_BLOCK_ID.get(secondId);
  return secondSources?.has(firstId) ?? false;
}

function parsePolygonPoints(pathData: string): Array<[number, number]> {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: Array<[number, number]> = [];

  for (let index = 0; index < numbers.length; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
}

interface Point {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface ImagePixelData {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

function parsePathSubpaths(pathData: string): Point[][] {
  return pathData
    .trim()
    .split(/(?=M\s)/)
    .filter(Boolean)
    .map((subpath) => {
      assert.match(subpath.trim(), /^M\s-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?(?:\sL\s-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?){3,}\sZ$/);
      const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      assert.equal(numbers.length % 2, 0, `${subpath} should contain x/y pairs`);
      return Array.from({ length: numbers.length / 2 }, (_, index) => ({
        x: numbers[index * 2],
        y: numbers[(index * 2) + 1],
      }));
    });
}

function getPathBounds(subpaths: Point[][]): Bounds {
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

function assertWithinTolerance(actual: number, expected: number, tolerance: number, message: string) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

function pointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
  let inside = false;
  const [x, y] = point;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previous];
    const intersects = (yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function isPointInSubpath(point: Point, polygon: Point[]): boolean {
  return pointInPolygon([point.x, point.y], polygon.map(({ x, y }) => [x, y]));
}

function isPointInPath(point: Point, pathData: string): boolean {
  return parsePathSubpaths(pathData).some((subpath) => isPointInSubpath(point, subpath));
}

function polygonArea(polygon: Point[]): number {
  let signedArea = 0;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    signedArea += (polygon[previous].x * polygon[index].y) - (polygon[index].x * polygon[previous].y);
  }

  return Math.abs(signedArea) / 2;
}

function geometryArea(subpaths: Point[][]): number {
  return subpaths.reduce((total, subpath) => total + polygonArea(subpath), 0);
}

function calculateSampledOverlapRatio(firstPath: string, secondPath: string): number {
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

  if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
    return 0;
  }

  let overlappingPoints = 0;
  const sampleStep = 4;

  for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
    for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
      const point = { x, y };
      if (
        firstSubpaths.some((subpath) => isPointInSubpath(point, subpath))
        && secondSubpaths.some((subpath) => isPointInSubpath(point, subpath))
      ) {
        overlappingPoints += 1;
      }
    }
  }

  const overlapArea = overlappingPoints * sampleStep * sampleStep;
  return overlapArea / Math.min(geometryArea(firstSubpaths), geometryArea(secondSubpaths));
}

async function readOfficialSeatmapPixels(): Promise<ImagePixelData> {
  const { data, info } = await sharp(GWANGJU_SEATMAP_IMAGE.imagePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  };
}

function getPixelColor(image: ImagePixelData, x: number, y: number): [number, number, number] {
  const safeX = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const safeY = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const index = ((safeY * image.width) + safeX) * image.channels;

  return [
    image.data[index],
    image.data[index + 1],
    image.data[index + 2],
  ];
}

function isOfficialSeatColor(red: number, green: number, blue: number): boolean {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const luminance = ((0.2126 * red) + (0.7152 * green) + (0.0722 * blue)) / 255;

  return luminance <= 0.97
    && saturation >= 0.05
    && !(red < 80 && green < 80 && blue < 80);
}

function isNearOfficialSeatColor(image: ImagePixelData, x: number, y: number, radius = 18): boolean {
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

function calculateOfficialSeatColorOverlapRatio(image: ImagePixelData, pathData: string): number {
  const subpaths = parsePathSubpaths(pathData);
  const bounds = getPathBounds(subpaths);
  let sampledPoints = 0;
  let seatColorPoints = 0;
  const sampleStep = 3;

  for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
    for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
      if (!subpaths.some((subpath) => isPointInSubpath({ x, y }, subpath))) {
        continue;
      }

      sampledPoints += 1;
      if (isNearOfficialSeatColor(image, x, y)) {
        seatColorPoints += 1;
      }
    }
  }

  return sampledPoints === 0 ? 0 : seatColorPoints / sampledPoints;
}

const GWANGJU_COMPONENT_COLOR_SPECS = {
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
} as const;

const GWANGJU_COMPONENT_EXTRACTION_BOUNDS = { minX: 250, maxX: 1370, minY: 90, maxY: 1090 } as const;

function colorDistance(first: readonly [number, number, number], second: readonly [number, number, number]): number {
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}

function isOfficialComponentPixel(
  image: ImagePixelData,
  groupId: keyof typeof GWANGJU_COMPONENT_COLOR_SPECS,
  x: number,
  y: number,
): boolean {
  const spec = GWANGJU_COMPONENT_COLOR_SPECS[groupId];
  const color = getPixelColor(image, x, y);

  return spec.colors.some((target) => colorDistance(color, target) <= spec.threshold);
}

function componentPixelKey(x: number, y: number): string {
  return `${x},${y}`;
}

function extractOfficialComponents(
  image: ImagePixelData,
  groupId: keyof typeof GWANGJU_COMPONENT_COLOR_SPECS,
) {
  const spec = GWANGJU_COMPONENT_COLOR_SPECS[groupId];
  const bounds = GWANGJU_COMPONENT_EXTRACTION_BOUNDS;
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

  const components: Array<{
    id: string;
    area: number;
    bounds: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
    pixelKeys: Set<string>;
  }> = [];
  const queue: Array<[number, number]> = [];
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const startIndex = ((y - bounds.minY) * width) + (x - bounds.minX);
      if (!mask[startIndex] || seen[startIndex]) continue;

      let minX: number = x;
      let maxX: number = x;
      let minY: number = y;
      let maxY: number = y;
      let area = 0;
      const pixelKeys = new Set<string>();

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

function getSelectedOfficialComponentPixels(
  image: ImagePixelData,
  reference: typeof GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES[string],
): Set<string> {
  const selectedIds = new Set(reference.componentIds);
  const selectedPixelKeys = new Set<string>();
  extractOfficialComponents(image, reference.componentGroupId)
    .filter((component) => selectedIds.has(component.id))
    .forEach((component) => {
      component.pixelKeys.forEach((pixelKey) => selectedPixelKeys.add(pixelKey));
    });

  return selectedPixelKeys;
}

function calculateOfficialComponentCoverage(
  image: ImagePixelData,
  block: { imageGeometry: { d: string } },
  reference: typeof GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES[string],
) {
  const subpaths = parsePathSubpaths(block.imageGeometry.d);
  const selectedComponentPixels = getSelectedOfficialComponentPixels(image, reference);
  const bounds = reference.expectedBounds;
  let componentPixels = 0;
  let polygonPixels = 0;
  let intersectingPixels = 0;
  const sampleStep = 2;
  const padding = 20;

  for (let y = Math.max(0, Math.floor(bounds.minY - padding)); y <= Math.min(image.height - 1, Math.ceil(bounds.maxY + padding)); y += sampleStep) {
    for (let x = Math.max(0, Math.floor(bounds.minX - padding)); x <= Math.min(image.width - 1, Math.ceil(bounds.maxX + padding)); x += sampleStep) {
      const insideReferenceBounds = x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
      const isComponentPixel = insideReferenceBounds && selectedComponentPixels.has(componentPixelKey(x, y));
      const isPolygonPixel = subpaths.some((subpath) => isPointInSubpath({ x, y }, subpath));

      if (isComponentPixel) componentPixels += 1;
      if (isPolygonPixel) polygonPixels += 1;
      if (isComponentPixel && isPolygonPixel) intersectingPixels += 1;
    }
  }

  return {
    officialComponentRecall: componentPixels === 0 ? 0 : intersectingPixels / componentPixels,
    componentIoU: (componentPixels + polygonPixels - intersectingPixels) === 0
      ? 0
      : intersectingPixels / (componentPixels + polygonPixels - intersectingPixels),
  };
}

function isNumberedSeatBlock(block: { block: string }): boolean {
  return /^\d+$/.test(block.block) || /^S-\d+$/.test(block.block);
}

test('광주 좌석도 asset 상태는 공식 파일 준비 여부를 명시한다', () => {
  assert.equal(GWANGJU_SEATMAP_IMAGE.imagePath, 'src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png');
  assert.equal(GWANGJU_SEATMAP_IMAGE.requiredAssetFileName, 'gwangju-kia-seatmap-official-2026.png');
  assert.ok(GWANGJU_SEATMAP_IMAGE.sourceLabel);

  if (GWANGJU_SEATMAP_IMAGE.assetStatus === 'OFFICIAL') {
    assert.ok(GWANGJU_SEATMAP_IMAGE.imageWidth > 0);
    assert.ok(GWANGJU_SEATMAP_IMAGE.imageHeight > 0);
  } else {
    assert.equal(GWANGJU_SEATMAP_IMAGE.assetStatus, 'MANUAL_BASEBALL_DATA_REQUIRED');
    assert.equal(GWANGJU_SEATMAP_IMAGE.imageWidth, 0);
    assert.equal(GWANGJU_SEATMAP_IMAGE.imageHeight, 0);
    assert.equal(GWANGJU_SEATMAP_IMAGE.sourceUrl, null);
    assert.equal(GWANGJU_BLOCKS.length, 0);
  }
});

test('광주 좌석 카테고리는 공식 좌석도 입력 대기 상태에서도 핵심 구역명을 보존하고 active filter는 남은 구역만 노출한다', () => {
  REQUIRED_CORE_CATEGORIES.forEach((category) => {
    assert.ok(GWANGJU_CATEGORIES[category], `${category} category should be defined`);
  });

  const groupedCategories = GWANGJU_CATEGORY_GROUPS.flatMap((group) => group.cats ?? []);
  [
    'CHAMPION',
    'CENTRAL_TABLE',
    'SURPRISE',
    'FAMILY',
    'ACCESSIBLE',
    'PARTY',
    'SKYBOX',
    'K9',
    'K8',
    'K7',
    'K5',
    'SKY_PICNIC',
    'FIVE_TABLE',
    'OUTFIELD',
    'BLEACHERS_TABLE',
  ].forEach((category) => {
    assert.ok(groupedCategories.includes(category), `${category} should stay visible in active category filters`);
  });
  assert.ok(groupedCategories.includes('K7'), 'K7 should be filterable after operator block-range confirmation');
  assert.ok(groupedCategories.includes('AWAY'), 'away cheering should expose the derived aggregate hit-area filter');

  const groupsById = new Map(GWANGJU_CATEGORY_GROUPS.map((group) => [group.id, group]));
  assert.deepEqual(groupsById.get('cheering')?.fanRoles, ['HOME', 'AWAY']);
  assert.deepEqual(groupsById.get('cheering')?.cats, ['K7', 'AWAY']);
  assert.deepEqual(groupsById.get('k7')?.cats, ['K7']);
  assert.equal(groupsById.get('k7')?.fanRoles, undefined);
  assert.deepEqual(groupsById.get('home-cheering')?.fanRoles, ['HOME']);
  assert.deepEqual(groupsById.get('away-cheering')?.fanRoles, ['AWAY']);
  assert.deepEqual(groupsById.get('home-cheering')?.cats, ['K7']);
  assert.deepEqual(groupsById.get('away-cheering')?.cats, ['AWAY']);

  ['EV', 'K3'].forEach((category) => {
    assert.equal(groupedCategories.includes(category), false, `${category} should not be exposed as an active filter without confirmed hit areas`);
  });
});

test('광주 외부 시야 페이지는 운영자 수동 참고로만 보존한다', () => {
  assert.equal(
    GWANGJU_MYSEATCHECK_REFERENCE_URL,
    'https://myseatcheck.com/%EA%B4%91%EC%A3%BC-kia-%EC%B1%94%ED%94%BC%EC%96%B8%EC%8A%A4%ED%95%84%EB%93%9C/',
  );
  assert.equal(GWANGJU_SEATMAP_IMAGE.sourceUrl, null, 'official PNG source should not be replaced with a third-party reference');

  const requirementsByName = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => [section.name, section]));
  ['K7석', '원정응원석'].forEach((name) => {
    const requirement = requirementsByName.get(name);
    assert.ok(requirement, `${name} should require operator coordinates`);
    assert.equal(requirement.manualReferenceUrl, GWANGJU_MYSEATCHECK_REFERENCE_URL);
    assert.deepEqual(requirement.coordinateSystem, {
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    });
    assert.deepEqual(requirement.requiredFields, EXPECTED_OPERATOR_REQUIRED_FIELDS);
  });
});

test('광주 정상 좌석도는 운영자 pending 안내 배너를 노출하지 않는다', () => {
  const source = readFileSync(new URL('../components/gwangju/GwangjuSeatMapSvg.tsx', import.meta.url), 'utf8');

  assert.equal(source.includes('일부 좌석 선택 준비 중'), false);
  assert.equal(source.includes('hasPendingOperatorSections'), false);
  assert.equal(source.includes('GWANGJU_SEATMAP_COORDINATES_READY'), false);
  assert.ok(source.includes('GWANGJU_NON_SELECTABLE_MARKER_ZONES'), 'marker-only zones should be blocked above seat polygons');
  assert.equal(source.includes('좌표 보정 중'), false);
  assert.equal(source.includes('gwangju-seatmap-coordinate-pending'), false);
});

test('광주 M/N 시설 마커 차단 layer는 좌석 hit-area 위에서 선택을 막는다', () => {
  const source = readFileSync(new URL('../components/gwangju/GwangjuSeatMapSvg.tsx', import.meta.url), 'utf8');
  const seatLayerIndex = source.indexOf('GWANGJU_BLOCKS.map');
  const markerLayerIndex = source.indexOf('GWANGJU_NON_SELECTABLE_MARKER_ZONES.map');
  const markerLayerSource = source.slice(markerLayerIndex);

  assert.ok(seatLayerIndex >= 0, 'seat hit-area layer should render');
  assert.ok(markerLayerIndex > seatLayerIndex, 'marker blocker layer should render above seat hit-areas');
  assert.ok(
    markerLayerSource.includes("pointerEvents={shouldRenderHitAreas ? 'all' : 'none'}"),
    'marker blocker layer should receive pointer events while selection is active',
  );
  assert.ok(markerLayerSource.includes('event.stopPropagation();'), 'marker clicks should not bubble into seat paths');
  assert.ok(markerLayerSource.includes('setSelected(null);'), 'marker clicks should clear any selected seat block');
});

test('광주 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlocks = new Set<string>();

  GWANGJU_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    block.officialBlocks.forEach((officialBlock) => {
      assert.ok(!officialBlocks.has(officialBlock), `${officialBlock} official block should be unique`);
      officialBlocks.add(officialBlock);
    });
  });
});

test('광주 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  GWANGJU_BLOCKS.forEach((block) => {
    assert.ok(GWANGJU_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.ok(block.officialBlocks.length > 0, `${block.id} official blocks should exist`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    assert.ok(block.imageGeometry.d.startsWith('M '), `${block.id} image geometry path should exist`);
    const subpaths = parsePathSubpaths(block.imageGeometry.d);
    assert.ok(subpaths.length >= 1, `${block.id} image geometry should use closed polygon path data`);
    if (!['bleachers-table-left', 'bleachers-table-right', 'skybox-seats', 'first-surprise-seats', 'third-surprise-seats', 'third-wheelchair-seats', ...DERIVED_AGGREGATE_BLOCK_IDS].includes(block.id)) {
      assert.equal(subpaths.length, 1, `${block.id} should use a single official-image polygon subpath`);
    }
    assert.ok((block.imageGeometry.d.match(/L /g)?.length ?? 0) >= 3, `${block.id} image geometry should use polygon path data`);
    assert.equal(block.imageGeometry.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${block.id} should use official traced geometry`);
    assert.equal(block.imageGeometry.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${block.id} should use direct official-image path tracing`);
    assert.equal(block.imageGeometry.traceSource, 'OFFICIAL_PNG_MANUAL_POLYGON', `${block.id} should use manual official-PNG polygon source`);
    assert.equal(block.imageGeometry.traceVersion, GWANGJU_FULL_RETRACE_VERSION, `${block.id} should use the full precision retrace version`);
    assert.equal(block.imageGeometry.previousTraceVersion, GWANGJU_PREVIOUS_TRACE_VERSION, `${block.id} should keep the previous trace version`);
    assert.equal(block.imageGeometry.traceGeneration, GWANGJU_FULL_RETRACE_GENERATION, `${block.id} should use the full active block retrace generation`);
    assert.equal(block.imageGeometry.manualReviewed, true, `${block.id} precision trace should be manually reviewed`);
    assert.equal(block.imageGeometry.pixelAlignmentStatus, 'PIXEL_ALIGNED', `${block.id} should be pixel aligned`);
    assert.ok(block.imageGeometry.manualReviewNote, `${block.id} should keep trace review note`);
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= GWANGJU_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= GWANGJU_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);

    const pathNumbers = block.imageGeometry.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    assert.equal(pathNumbers.length / 2, block.imageGeometry.retracePointCount, `${block.id} path point count should match retrace metadata`);
    assert.equal(block.imageGeometry.retracePointCount, block.imageGeometry.retraceSourcePointCount * 2, `${block.id} should be regenerated as a full retrace path`);
    assert.ok(pathNumbers.length >= 4, `${block.id} image geometry should contain path coordinates`);
    pathNumbers.forEach((coordinate, index) => {
      const limit = index % 2 === 0 ? GWANGJU_SEATMAP_IMAGE.imageWidth : GWANGJU_SEATMAP_IMAGE.imageHeight;
      assert.ok(coordinate >= 0 && coordinate <= limit, `${block.id} path coordinate ${coordinate} should fit image bounds`);
    });
  });
});

test('광주 trace review summary는 active 블록의 수동 polygon trace 완료 상태를 고정한다', () => {
  assert.equal(GWANGJU_TRACE_REVIEW_SUMMARY.totalBlocks, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT);
  assert.equal(GWANGJU_TRACE_REVIEW_SUMMARY.officialImageTraced, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT);
  assert.equal(GWANGJU_TRACE_REVIEW_SUMMARY.needsOperatorReview, 0);
  assert.equal(GWANGJU_TRACE_REVIEW_SUMMARY.directOfficialTrace, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT);
  assert.equal(GWANGJU_TRACE_REVIEW_SUMMARY.manualReviewed, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT);
  assert.equal(GWANGJU_TRACE_REVIEW_SUMMARY.unreviewedBlocks, 0);
  assert.equal(GWANGJU_TRACE_REVIEW_SUMMARY.pixelAligned, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT);
  assert.equal(GWANGJU_TRACE_REVIEW_SUMMARY.manualReviewRequired, 0);
});

test('광주 manual-polygon-v96 구역별 정밀화 workset은 111개 release 계약을 고정한다', () => {
  assert.equal(GWANGJU_FULL_RETRACE_VERSION, 'manual-polygon-v96');
  assert.equal(GWANGJU_PREVIOUS_TRACE_VERSION, 'manual-polygon-v95');

  const worksetsById = new Map(GWANGJU_ZONE_PRECISION_WORKSETS.map((workset) => [workset.id, workset]));
  const activeBlockIds = new Set(GWANGJU_BLOCKS.map((block) => block.id));

  assert.deepEqual(
    GWANGJU_ZONE_PRECISION_WORKSETS.map((workset) => workset.id),
    [
      'p1-op-outfield-component',
      'p2-lower-infield-low-margin',
      'p3-official-special-sections',
      'p4-repeated-numbered-blocks',
      'p5-full-release-reference',
    ],
  );

  assert.deepEqual(worksetsById.get('p1-op-outfield-component')?.blockIds, [
    'outfield-left-seats',
    'outfield-right-seats',
    'bleachers-table-left',
    'bleachers-table-right',
  ]);
  assert.equal(worksetsById.get('p2-lower-infield-low-margin')?.blockIds.includes('k5-101'), true);
  assert.equal(worksetsById.get('p2-lower-infield-low-margin')?.blockIds.includes('k5-106'), true);
  assert.equal(worksetsById.get('p2-lower-infield-low-margin')?.blockIds.includes('k7-107'), true);
  assert.equal(worksetsById.get('p2-lower-infield-low-margin')?.blockIds.includes('k7-108'), true);
  assert.equal(worksetsById.get('p2-lower-infield-low-margin')?.blockIds.includes('k7-118'), true);
  assert.equal(worksetsById.get('p2-lower-infield-low-margin')?.blockIds.includes('k7-119'), true);
  assert.equal(worksetsById.get('p2-lower-infield-low-margin')?.blockIds.includes('k9-117'), true);
  assert.equal(worksetsById.get('p3-official-special-sections')?.blockIds.length, 12);
  assert.equal(worksetsById.get('p4-repeated-numbered-blocks')?.blockIds.length, 70);
  assert.deepEqual(
    new Set(worksetsById.get('p4-repeated-numbered-blocks')?.blockIds.map((blockId) => (
      GWANGJU_BLOCKS.find((block) => block.id === blockId)?.category
    ))),
    new Set(['SKY_PICNIC', 'FIVE_TABLE']),
  );
  assert.ok(
    worksetsById.get('p4-repeated-numbered-blocks')?.acceptanceFocus.includes('repeat-block-pixel-coverage-lock'),
    'P4 repeated numbered blocks should lock high official pixel coverage',
  );
  assert.equal(worksetsById.get('p5-full-release-reference')?.blockIds.length, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT);

  GWANGJU_ZONE_PRECISION_WORKSETS.forEach((workset) => {
    assert.ok(workset.acceptanceFocus.length > 0, `${workset.id} should define acceptance focus`);
    workset.blockIds.forEach((blockId) => {
      assert.ok(activeBlockIds.has(blockId), `${workset.id} should reference active block ${blockId}`);
    });
  });

  const p5BlockIds = new Set(worksetsById.get('p5-full-release-reference')?.blockIds);
  assert.deepEqual([...activeBlockIds].sort(), [...p5BlockIds].sort());
});

test('광주 official trace reference는 전 active 블록의 anchor와 bbox를 고정한다', () => {
  const source = readFileSync(new URL('./gwangjuSeatData.ts', import.meta.url), 'utf8');
  const expectedIds = GWANGJU_BLOCKS.map((block) => block.id).sort();
  const actualReferenceIds = Object.keys(GWANGJU_OFFICIAL_TRACE_REFERENCE).sort();

  assert.deepEqual(actualReferenceIds, expectedIds);
  assert.equal(source.includes('toOfficialTraceReference'), false, 'trace reference should not be generated from current geometry at runtime');
  assert.equal(
    source.includes('Object.entries(GWANGJU_IMAGE_GEOMETRY).map(([id, geometry])'),
    false,
    'trace reference should stay independently locked from current geometry',
  );
  assert.ok(
    source.includes("'skybox-seats': { numberAnchor: { x: 356, y: 848 }, expectedBounds: { minX: 345, minY: 823, maxX: 389, maxY: 888 }, expectedSubpathCount: 2 }"),
    'multi-subpath skybox reference should be statically locked',
  );

  GWANGJU_BLOCKS.forEach((block) => {
    const reference = GWANGJU_OFFICIAL_TRACE_REFERENCE[block.id];
    const subpaths = parsePathSubpaths(block.imageGeometry.d);
    const bounds = getPathBounds(subpaths);

    assert.ok(reference, `${block.id} trace reference should exist`);
    assert.equal(subpaths.length, reference.expectedSubpathCount, `${block.id} subpath count should match official trace reference`);
    assertWithinTolerance(block.imageGeometry.labelX, reference.numberAnchor.x, GWANGJU_TRACE_ANCHOR_TOLERANCE_PX, `${block.id} label x should match official number anchor`);
    assertWithinTolerance(block.imageGeometry.labelY, reference.numberAnchor.y, GWANGJU_TRACE_ANCHOR_TOLERANCE_PX, `${block.id} label y should match official number anchor`);
    assertWithinTolerance(bounds.minX, reference.expectedBounds.minX, GWANGJU_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} minX should match reference bbox`);
    assertWithinTolerance(bounds.minY, reference.expectedBounds.minY, GWANGJU_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} minY should match reference bbox`);
    assertWithinTolerance(bounds.maxX, reference.expectedBounds.maxX, GWANGJU_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} maxX should match reference bbox`);
    assertWithinTolerance(bounds.maxY, reference.expectedBounds.maxY, GWANGJU_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} maxY should match reference bbox`);
  });
});

test('광주 블록 label 중심은 각 polygon 내부에 위치한다', () => {
  GWANGJU_BLOCKS.forEach((block) => {
    assert.equal(
      isPointInPath({ x: block.imageGeometry.labelX, y: block.imageGeometry.labelY }, block.imageGeometry.d),
      true,
      `${block.id} label should stay inside its polygon`,
    );
  });
});

test('광주 블록 hit-area는 다른 블록 label 중심을 침범하지 않는다', () => {
  GWANGJU_BLOCKS.forEach((block) => {
    const coveredLabels = GWANGJU_BLOCKS
      .filter((candidate) => candidate.id !== block.id)
      .filter((candidate) => !isAllowedDerivedAggregateOverlap(block.id, candidate.id))
      .filter((candidate) => isPointInPath({ x: candidate.imageGeometry.labelX, y: candidate.imageGeometry.labelY }, block.imageGeometry.d))
      .map((candidate) => candidate.block);

    assert.deepEqual(coveredLabels, [], `${block.id} should not cover other block label centers`);
  });
});

test('광주 traced geometry는 polygon 간 sampled overlap 허용치를 넘지 않는다', () => {
  const overlapWarnings: Array<{ firstId: string; secondId: string; ratio: number }> = [];

  for (let firstIndex = 0; firstIndex < GWANGJU_BLOCKS.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < GWANGJU_BLOCKS.length; secondIndex += 1) {
      const first = GWANGJU_BLOCKS[firstIndex];
      const second = GWANGJU_BLOCKS[secondIndex];
      if (isAllowedDerivedAggregateOverlap(first.id, second.id)) {
        continue;
      }
      const overlapRatio = calculateSampledOverlapRatio(first.imageGeometry.d, second.imageGeometry.d);

      if (overlapRatio > 0.005) {
        overlapWarnings.push({
          firstId: first.id,
          secondId: second.id,
          ratio: Number(overlapRatio.toFixed(4)),
        });
      }
    }
  }

  assert.deepEqual(overlapWarnings, []);
});

test('광주 블록 geometry는 정적 공식 이미지 좌표 map에서만 공급된다', () => {
  const geometryIds = new Set(Object.keys(GWANGJU_IMAGE_GEOMETRY_DRAFTS));
  const blockIds = new Set(GWANGJU_BLOCKS.map((block) => block.id));

  assert.equal(geometryIds.size, blockIds.size);
  GWANGJU_BLOCKS.forEach((block) => {
    const draft = GWANGJU_IMAGE_GEOMETRY_DRAFTS[block.id];
    assert.ok(draft, `${block.id} should have static image geometry`);
    assert.equal(block.imageGeometry.d, draft.d, `${block.id} should use the static geometry path`);
    assert.equal(block.imageGeometry.labelX, draft.labelX, `${block.id} should use the static label x`);
    assert.equal(block.imageGeometry.labelY, draft.labelY, `${block.id} should use the static label y`);
  });

  Object.keys(GWANGJU_IMAGE_GEOMETRY_DRAFTS).forEach((id) => {
    assert.ok(blockIds.has(id), `${id} should map to an existing block`);
  });

  const source = readFileSync(new URL('./gwangjuSeatData.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('SEATMAP_ELLIPSE'), false);
  assert.equal(source.includes('sectorPath'), false);
  assert.equal(source.includes('createArcBlock'), false);
  assert.equal(source.includes('createArcGroup'), false);
  assert.equal(source.includes('splitStripGeometries'), false);
  assert.equal(source.includes('lerpPoint'), false);
  assert.equal(source.includes('StripEntry'), false);
  assert.equal(source.includes('entriesFor'), false);
  assert.equal(source.includes('orientedBox'), false);
  assert.equal(source.includes('SKY_PICNIC_GEOMETRY_CENTERS'), false);
  assert.equal(source.includes('GENERATED_ROTATED_BOX'), false);
  assert.equal(source.includes('APPROXIMATE_MANUAL_POLYGON'), false);
});

test('광주 구역별 정밀화 manifest와 package script는 v44 image alignment/workset 산출물을 고정한다', () => {
  const coreQaSource = readFileSync(new URL('../../scripts/gwangju-seatmap-core-qa.mjs', import.meta.url), 'utf8');
  const manifestSource = coreQaSource;
  const evidenceWorksetOpsSource = readFileSync(new URL('../../scripts/gwangju-seatmap-evidence-workset-ops.mjs', import.meta.url), 'utf8');
  const worksetSource = evidenceWorksetOpsSource;
  const lowMarginSource = evidenceWorksetOpsSource;
  const imageAlignmentSource = coreQaSource;
  const visualHitSplitAuditSource = coreQaSource;
  const lowerInfieldIndependentAuditSource = readFileSync(new URL('../../scripts/gwangju-seatmap-lower-infield-independent-audit.mjs', import.meta.url), 'utf8');
  const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const svgSource = readFileSync(new URL('../components/gwangju/GwangjuSeatMapSvg.tsx', import.meta.url), 'utf8');
  const componentSource = readFileSync(new URL('../components/gwangju/GwangjuSeatMap.tsx', import.meta.url), 'utf8');
  const runtimeLayerSource = coreQaSource;
  const browserAuditSource = readFileSync(new URL('../../scripts/stadium-ux-audit.mjs', import.meta.url), 'utf8');
  const browserEvidenceSource = evidenceWorksetOpsSource;

  [
    'GWANGJU_ZONE_PRECISION_WORKSETS',
    'zonePrecisionWorksets',
    'zonePrecisionWarnings',
    'zonePrecisionWorksetIds',
    'COMPONENT_EXTRACTION_BOUNDS',
    'getSelectedOfficialComponentPixels',
    'reference.componentIds',
    'REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE',
    'REPEATED_BLOCK_PIXEL_COVERAGE_BELOW_LOCK',
    'gwangju-seatmap-trace-review-zone-crops',
    'zoneOverlayArtifacts',
    'gwangju-seatmap-image-alignment-audit',
    '공식 PNG 독립 mask',
  ].forEach((requiredText) => {
    assert.ok(manifestSource.includes(requiredText), `manifest should include ${requiredText}`);
  });

  [
    'GWANGJU_IMAGE_ALIGNMENT_AUDIT_V51',
    'gwangju-seatmap-image-alignment-audit.json',
    'gwangju-seatmap-image-alignment-audit.csv',
    'gwangju-seatmap-image-alignment-audit.md',
    'officialBlockMaskRecall',
    'componentIoU',
    'visualPath',
    'hasSeparateVisualPath',
    'visualHitSplitBlocks',
    'LOWER_INFIELD_VISUAL_HIT_SPLIT_REVIEW_BLOCK_IDS',
    'lowerInfieldVisualHitSplitReview',
    'lowerInfieldVisualHitSplitReviewNoChangeBlockIds',
    'Visual/Hit Split Review',
    'LOWER_INFIELD_J_SKY_BOUNDARY_REVIEW_BLOCK_IDS',
    'lowerInfieldJSkyBoundaryReview',
    'lowerInfieldJSkyBoundaryReviewNoChangeBlockIds',
    'J/S Boundary Review',
    'THIRD_BASE_H_I_J_G_BOUNDARY_REVIEW_BLOCK_IDS',
    'thirdBaseHIJGBoundaryReview',
    'thirdBaseHIJGBoundaryReviewNoChangeBlockIds',
    '121~127/H/I/J/G Boundary Review',
    'THIRD_BASE_123_127_OFFICIAL_VISUAL_REFERENCES',
    'THIRD_BASE_123_127_OFFICIAL_VISUAL_REFERENCE_SOURCE',
    'official-numbered-independent-visual-reference',
    'third-base-123-127-official-png-visual-reference',
    'thirdBase123127IndependentVisualReview',
    'thirdBase123127AdjacencyOverlapReview',
    'thirdBase123127AdjacencyOverlapRows',
    'gwangju-seatmap-official-121-127-raw.png',
    '121~127 Independent Visual Reference',
    'FORBIDDEN_ADJACENCY_OVERLAP',
    'keep d',
    'stroke-dasharray="6 4"',
    'skyPicnicColorCoverageRatio',
    'skyPicnicReviewRequiredBlocks',
    'fiveTableColorCoverageRatio',
    'fiveTableStrictFillCoverageRatio',
    'fiveTableLocalFillBoundsMaxAbsDelta',
    'fiveTableReviewRequiredBlocks',
    'FIVE_TABLE_COLOR_SCAN_THRESHOLDS',
    'FIVE_TABLE_LOCAL_FILL_BOUNDS_THRESHOLDS',
    'FIVE_TABLE_STRICT_FILL_COLOR_SPEC',
    'FIVE_TABLE_LOCAL_FILL_BOUNDS_DELTA_ABOVE_THRESHOLD',
    'official-five-table-color-scan',
    'alphabetSectionColorCoverageRatio',
    'ALPHABET_SECTION_OFFICIAL_MASK_REFERENCES',
    "'third-family-seats': {",
    'searchBounds: { minX: 560, minY: 150, maxX: 700, maxY: 315 }',
    "excludeBlockIds: ['k5-126', 'k5-127']",
    "'third-wheelchair-seats': {",
    "'party-seats-third': {",
    "maskStrategy: 'component-row-envelope-rings'",
    'componentIndexGroups: [[0, 2]]',
    'supplementalMaskRings',
    'component-row-envelope-rings-official-png-color',
    '[[430, 389], [438, 374], [452, 363], [470, 353], [482, 356], [489, 365], [489, 371], [467, 398], [446, 394]]',
    'ALPHABET_SECTION_MASK_THRESHOLDS',
    'official-alphabet-section-mask',
    'row-envelope-official-png-color',
    "maskStrategy: 'row-envelope'",
    '공식 PNG 원본 색상에서 J/I/H 기준 mask를 추출',
    'alphabet-section-official-png-mask-after-101-108',
    'LOWER_INFIELD_SPECIAL_SPLIT_BLOCK_IDS',
    'LOWER_INFIELD_ADJACENT_SKY_PICNIC_BLOCK_IDS',
    'LOWER_INFIELD_I_BOUNDARY_FOCUS_BLOCK_IDS',
    'LOWER_INFIELD_I_BOUNDARY_FOCUS_BOUNDS',
    'lowerInfieldIBoundaryFocus',
    'gwangju-seatmap-image-alignment-audit-104-105-i-j-boundary.png',
    'LOWER_INFIELD_101_108_VISUAL_REVIEW_BLOCK_IDS',
    'LOWER_INFIELD_101_108_VISUAL_REVIEW_BOUNDS',
    'lowerInfield101108VisualReview',
    'gwangju-seatmap-image-alignment-audit-101-108-h-i-j-e-f-visual-review.png',
    'LOWER_INFIELD_P0_VISUAL_CHECKLIST_ITEMS',
    'lowerInfieldP0VisualChecklist',
    'lowerInfieldP0VisualChecklistStatus',
    'gwangju-seatmap-image-alignment-audit-p0-101-102-h-boundary.png',
    'gwangju-seatmap-image-alignment-audit-p0-103-104-105-i-boundary.png',
    'gwangju-seatmap-image-alignment-audit-p0-106-107-108-e-j-boundary.png',
    'gwangju-seatmap-image-alignment-audit-p0-s301-s304-j-boundary.png',
    'nonSelectableOfficialLabels',
    'LOWER_INFIELD_SPECIAL_SPLIT_MAX_OVERLAP_RATIO',
    'lowerInfieldSpecialSplit',
    'lowerInfieldSpecialSplitOverlapWarnings',
    'lowerInfieldSpecialAdjacentOverlapWarnings',
    'lower-infield-special-split',
    'gwangju-seatmap-lower-infield-special-split-official.png',
    'gwangju-seatmap-lower-infield-special-split-numbered-only.png',
    'gwangju-seatmap-lower-infield-special-split-special-only.png',
    'gwangju-seatmap-lower-infield-special-split-adjacent-sky-picnic-only.png',
    'gwangju-seatmap-lower-infield-special-split-adjacent-overlap-heatmap.png',
    'gwangju-seatmap-lower-infield-special-split-overlap-heatmap.png',
    'NUMBERED_INFIELD_AUDIT_BLOCK_IDS',
    'official-numbered-component-mask',
    'official-numbered-boundary-mask',
    "'k5-126': {\n      shape: 'official-coral-irregular-row'",
    'official-png-crop-121-127-shared-boundary-v86',
    'visualPoints: [[535, 286], [604, 305], [611, 316], [624, 299], [683, 314], [672, 362], [515, 329], [528, 300]]',
    'numbered-infield-official-png-mask-101-127',
    'outsideBleedRatio',
    'P0_OFFICIAL_COMPONENT_REFERENCES',
    'SKY_PICNIC_COLOR_SCAN_THRESHOLDS',
    'SKY_PICNIC_LOCAL_FILL_BOUNDS_THRESHOLDS',
    'SKY_PICNIC_STRICT_FILL_COLOR_SPEC',
    'skyPicnicStrictFillCoverageRatio',
    'skyPicnicLocalFillBoundsMaxAbsDelta',
    'SKY_PICNIC_LOCAL_FILL_BOUNDS_DELTA_ABOVE_THRESHOLD',
    'ALPHABET_SECTION_COLOR_SCAN_THRESHOLDS',
    'official-sky-picnic-color-scan',
    'official-alphabet-section-color-scan',
    '--require-sky-picnic',
    '--require-alphabet-sections',
    '--require-five-table',
    'blockers: requireSkyPicnicScan ? reviewWarnings : []',
    'blockers: requireFiveTableScan ? reviewWarnings : []',
    'sky-picnic-s-301-315',
    'sky-picnic-s-316-335',
    'five-table-501-518',
    'five-table-519-535',
    'alphabet-special-seats-upper',
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredText) => {
    assert.ok(imageAlignmentSource.includes(requiredText), `image alignment audit should include ${requiredText}`);
  });

  [
    'GWANGJU_ZONE_PRECISION_WORKSETS_V1',
    'REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE',
    'REPEATED_BLOCK_PIXEL_COVERAGE_BELOW_LOCK',
    'gwangju-seatmap-zone-precision-worksets.json',
    'gwangju-seatmap-zone-precision-worksets.csv',
    'gwangju-seatmap-zone-precision-worksets.md',
    'gwangju-seatmap-zone-precision-worksets.svg',
    'runtimeSeatLayerSource',
    'GWANGJU_BLOCKS[].imageGeometry.d',
    'GWANGJU_IMAGE_GEOMETRY_DRAFTS',
    'GWANGJU_OFFICIAL_TRACE_REFERENCE',
    'gwangju-seatmap-operator-template.json',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredText) => {
    assert.ok(worksetSource.includes(requiredText), `zone workset script should include ${requiredText}`);
  });

  assert.ok(packageSource.includes('"stadium:gwangju:zone-precision-worksets"'));
  assert.ok(packageSource.includes('"stadium:gwangju:image-alignment-audit"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju image-alignment-audit'));
  assert.ok(packageSource.includes('"stadium:gwangju:image-alignment-audit:require-sky-picnic"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:image-alignment-audit -- --require-sky-picnic'));
  assert.ok(packageSource.includes('"stadium:gwangju:image-alignment-audit:require-alphabet-sections"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:image-alignment-audit -- --require-alphabet-sections'));
  assert.ok(packageSource.includes('"stadium:gwangju:image-alignment-audit:require-five-table"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:image-alignment-audit -- --require-five-table'));
  assert.ok(packageSource.includes('"stadium:gwangju:image-alignment-audit:require-release"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju image-alignment-audit:require-release'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju trace-manifest'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju zone-precision-worksets'));
  assert.ok(packageSource.includes('"stadium:gwangju:evidence-inventory"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju evidence-inventory'));
  assert.ok(packageSource.includes('"stadium:gwangju:browser-evidence"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju browser-evidence'));
  assert.ok(packageSource.includes('"stadium:gwangju:low-margin-candidates"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju low-margin-candidates'));
  assert.ok(packageSource.includes('"stadium:gwangju:visual-hit-split-audit"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju visual-hit-split-audit'));
  assert.ok(packageSource.includes('"stadium:gwangju:lower-infield-independent-audit"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju lower-infield-independent-audit'));
  assert.ok(packageSource.includes('"qa:stadium:gwangju:runtime-layer"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju runtime-layer'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju release-gate'));
  [
    'GWANGJU_LOW_MARGIN_CANDIDATES_V1',
    'gwangju-seatmap-low-margin-candidates.json',
    'gwangju-seatmap-low-margin-candidates.csv',
    'gwangju-seatmap-low-margin-candidates.md',
    'NUMBERED_PIXEL_ACCEPTANCE_MIN',
    'SPECIAL_PIXEL_ACCEPTANCE_MIN',
    'COMPONENT_RECALL_REVIEW_TARGET',
    'COMPONENT_IOU_REVIEW_TARGET',
    'P1_P2_BOUNDARY_WATCH',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'browser CSS pixels',
    'web-search-based baseball data',
  ].forEach((requiredText) => {
    assert.ok(lowMarginSource.includes(requiredText), `low-margin script should include ${requiredText}`);
  });
  [
    'GWANGJU_VISUAL_HIT_SPLIT_AUDIT_V1',
    'gwangju-seatmap-visual-hit-split-audit.json',
    'gwangju-seatmap-visual-hit-split-audit.csv',
    'gwangju-seatmap-visual-hit-split-audit.md',
    'gwangju-seatmap-visual-hit-split-audit-crops',
    'runtimeHitPathMatchesData',
    'runtimeVisualPathMatchesData',
    'runtimeHitDataVisualPathMatchesData',
    'visualPointerEventsNone',
    'APPROVED_VISUAL_SPLIT_BLOCK_IDS',
    'unexpectedVisualSplitViolations',
    'UNAPPROVED_VISUAL_SPLIT',
    'MISSING_APPROVED_VISUAL_SPLIT',
    '101-108-h-i-j-visual-hit-split',
    '121-127-h-i-j-g-visual-hit-split',
    's301-j-visual-hit-split',
    'browser CSS pixels as coordinate source',
    'resized screenshots as coordinate source',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredText) => {
    assert.ok(visualHitSplitAuditSource.includes(requiredText), `visual/hit split audit should include ${requiredText}`);
  });
  [
    'GWANGJU_LOWER_INFIELD_INDEPENDENT_AUDIT_V1',
    'OFFICIAL_VISUAL_REFERENCES',
    'official-first-i-horizontal-band',
    'official-third-h-irregular-block',
    'gwangju-seatmap-lower-infield-independent-audit.json',
    'gwangju-seatmap-lower-infield-independent-audit.csv',
    'gwangju-seatmap-lower-infield-independent-audit.md',
    'gwangju-seatmap-lower-infield-independent-audit-${region.id}-overlay.png',
    'first-101-108-h-i-j',
    'third-h-i-j',
    'browser CSS pixels as coordinate source',
    'resized screenshots as coordinate source',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredText) => {
    assert.ok(lowerInfieldIndependentAuditSource.includes(requiredText), `lower infield independent audit should include ${requiredText}`);
  });
  assert.ok(svgSource.includes('GWANGJU_BLOCKS.map'), 'runtime seat layer should render active blocks');
  assert.ok(svgSource.includes('d={block.imageGeometry.d}'), 'runtime seat layer should use release-ready block image geometry');
  assert.ok(svgSource.includes('visualPathD = block.imageGeometry.visualD ?? block.imageGeometry.d'), 'runtime visual overlay should be separable from non-overlap hit geometry');
  assert.ok(svgSource.includes('data-visual-path={visualPathD}'), 'runtime hit path should expose the official-image visual path for browser evidence');
  assert.equal(svgSource.includes('GWANGJU_IMAGE_GEOMETRY_DRAFTS'), false, 'runtime should not render draft geometry directly');
  assert.equal(svgSource.includes('GWANGJU_OFFICIAL_TRACE_REFERENCE'), false, 'runtime should not render reference geometry directly');
  assert.equal(svgSource.includes('GWANGJU_OPERATOR_SECTION_REQUIREMENTS'), false, 'runtime SVG should not render operator-only sections');
  assert.equal(svgSource.includes('gwangju-seatmap-operator-template'), false, 'runtime SVG should not read operator template data');
  assert.ok(svgSource.includes('AGGREGATE_FILTER_HIT_AREA_BY_ID'), 'runtime SVG should gate aggregate hit-areas by filter id');
  assert.ok(svgSource.includes('SOURCE_BLOCK_IDS_HIDDEN_BY_AGGREGATE_FILTER'), 'runtime SVG should hide numbered source blocks when aggregate filters are active');
  assert.ok(svgSource.includes('home-k7-seats'), 'runtime SVG should allow K7 aggregate geometry only in the K7 filter layer');
  assert.ok(svgSource.includes('away-cheering-seats'), 'runtime SVG should allow away aggregate geometry only in the away filter layer');
  assert.ok(svgSource.includes('GWANGJU_NON_SELECTABLE_MARKER_ZONES.map'), 'runtime should keep marker-only zones in a separate marker layer');
  assert.ok(svgSource.includes('<circle'), 'marker-only zones should be rendered as non-seat marker geometry');
  assert.equal(componentSource.includes('GWANGJU_IMAGE_GEOMETRY_DRAFTS'), false, 'runtime component should not import draft geometry');
  assert.equal(componentSource.includes('GWANGJU_OFFICIAL_TRACE_REFERENCE'), false, 'runtime component should not import reference geometry');
  assert.equal(componentSource.includes('GWANGJU_OPERATOR_SECTION_REQUIREMENTS'), false, 'runtime component should not import operator-only section requirements');
  [
    'GWANGJU_RUNTIME_LAYER_AUDIT_V1',
    'gwangju-seatmap-runtime-layer-audit.json',
    'gwangju-seatmap-runtime-layer-audit.csv',
    'gwangju-seatmap-runtime-layer-audit.md',
    'GWANGJU_BLOCKS[].imageGeometry.d',
    'runtime-rendered-paths-match-manifest',
    'runtime-forbidden-paths-absent',
    'runtime-label-top-hit',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'browser CSS pixels',
    'web-search-based baseball data',
  ].forEach((requiredText) => {
    assert.ok(runtimeLayerSource.includes(requiredText), `runtime layer audit should include ${requiredText}`);
  });
  [
    'readGwangjuTraceManifestBlocks',
    'Gwangju runtime layer must render release-ready manifest paths only',
    'pathMismatchCount',
    'renderedVisualPathCount',
    'visualPathMismatchCount',
    'visualHitSplitRows',
    'gwangju-seat-visual-',
    'forbiddenRenderedIds',
    'labelTopHitFailureCount',
    '101-108-h-i-j-browser-coordinate-crop',
    '121-127-h-i-j-browser-coordinate-crop',
    'op-outfield-browser-coordinate-crop',
    'five-table-browser-coordinate-crop',
    'sky-picnic-browser-coordinate-crop',
    "type: 'gwangju-runtime-layer'",
  ].forEach((requiredText) => {
    assert.ok(browserAuditSource.includes(requiredText), `browser QA should include ${requiredText}`);
  });
  [
    'GWANGJU_BROWSER_EVIDENCE_V1',
    'gwangju-seatmap-browser-evidence.json',
    'gwangju-seatmap-browser-evidence.csv',
    'gwangju-seatmap-browser-evidence.md',
    'EXPECTED_VIEWBOX = { x: 0, y: 0, width: 2200, height: 1159 }',
    '101-108-h-i-j-browser-coordinate-crop',
    '121-127-h-i-j-browser-coordinate-crop',
    'op-outfield-browser-coordinate-crop',
    'five-table-browser-coordinate-crop',
    'sky-picnic-browser-coordinate-crop',
    'gwangju-lower-infield-selected-sweep',
    'gwangju-thirdbase-selected-sweep',
    'browser CSS pixels as coordinate source',
    'resized screenshots as coordinate source',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredText) => {
    assert.ok(browserEvidenceSource.includes(requiredText), `browser evidence should include ${requiredText}`);
  });
});

test('광주 좌석도는 정적 공식 이미지 polygon 상태에서 선택을 활성화한다', () => {
  const source = readFileSync(new URL('./gwangjuSeatData.ts', import.meta.url), 'utf8');
  const fiveTableReviewRegion = GWANGJU_TRACE_REVIEW_REGIONS.find((region) => region.id === 'five-table-numbered');

  assert.equal(GWANGJU_COORDINATE_TRACE_STATUS, 'READY');
  assert.equal(GWANGJU_SELECTABLE_BLOCKS_READY, true);
  assert.equal(fiveTableReviewRegion?.method, 'OFFICIAL_IMAGE_PIXEL_TRACE');
  assert.equal(source.includes('FIVE_TABLE_GEOMETRY_CENTERS'), false);
  assert.equal(source.includes('orientedBox('), false);
  assert.equal(source.includes('SKY_PICNIC_GEOMETRY_CENTERS'), false);
});

test('광주 재트레이싱 manifest 대상은 active block과 운영자 대기 구역을 모두 설명한다', () => {
  const operatorRegion = GWANGJU_TRACE_REVIEW_REGIONS.find((region) => region.id === 'operator-only-cheering');

  assert.ok(GWANGJU_TRACE_REVIEW_REGIONS.length > 0);
  assert.ok(GWANGJU_TRACE_REVIEW_REGIONS.every((region) => (
    region.method === 'OFFICIAL_IMAGE_PIXEL_TRACE' || region.method === 'OPERATOR_REQUIRED'
  )));
  assert.equal(
    operatorRegion?.method,
    GWANGJU_SEATMAP_COORDINATES_READY ? 'OFFICIAL_IMAGE_PIXEL_TRACE' : 'OPERATOR_REQUIRED',
  );

  const activeBlockIds = new Set(GWANGJU_BLOCKS.map((block) => block.id));
  const reviewedActiveBlockIds = new Set(
    GWANGJU_TRACE_REVIEW_REGIONS
      .filter((region) => region.method !== 'OPERATOR_REQUIRED')
      .flatMap((region) => region.blockIds),
  );
  const missingReviewIds = [...activeBlockIds].filter((id) => !reviewedActiveBlockIds.has(id));

  assert.deepEqual(missingReviewIds, []);
});

test('광주 알파벳 특수 구역은 공식 좌석 hit-area로 포함한다', () => {
  const geometryIds = new Set(Object.keys(GWANGJU_IMAGE_GEOMETRY_DRAFTS));
  const blockIds = new Set(GWANGJU_BLOCKS.map((block) => block.id));
  const officialBlocks = new Set(GWANGJU_BLOCKS.flatMap((block) => block.officialBlocks));
  const shortLabels = new Set(GWANGJU_BLOCKS.map((block) => block.imageGeometry.shortLabel));

  OFFICIAL_ALPHABET_SECTION_IDS.forEach((id) => {
    assert.ok(geometryIds.has(id), `${id} geometry should exist`);
    assert.ok(blockIds.has(id), `${id} block should exist`);
  });

  OFFICIAL_ALPHABET_SHORT_LABELS.forEach((shortLabel) => {
    assert.ok(shortLabels.has(shortLabel), `${shortLabel} official alphabet label should exist`);
  });

  OFFICIAL_ALPHABET_OFFICIAL_BLOCKS.forEach((officialBlock) => {
    assert.ok(officialBlocks.has(officialBlock), `${officialBlock} should be selectable`);
  });
});

test('광주 공식 이미지 범례/시설 마커는 좌석 hit-area를 통과시키지 않는 차단 영역으로 분리한다', () => {
  assert.ok(GWANGJU_NON_SELECTABLE_MARKER_ZONES.length > 0);
  assert.ok(GWANGJU_NON_SELECTABLE_MARKER_ZONES.some((zone) => zone.markerLabel === 'M'));
  assert.ok(GWANGJU_NON_SELECTABLE_MARKER_ZONES.some((zone) => zone.markerLabel === 'N'));

  const markerIds = new Set<string>();
  const blockIds = new Set(GWANGJU_BLOCKS.map((block) => block.id));

  GWANGJU_NON_SELECTABLE_MARKER_ZONES.forEach((zone) => {
    assert.equal(blockIds.has(zone.id), false, `${zone.id} should not be exposed as a seat block`);
    assert.equal(markerIds.has(zone.id), false, `${zone.id} marker id should be unique`);
    markerIds.add(zone.id);
    assert.ok(zone.label, `${zone.id} marker label should exist`);
    assert.ok(zone.r > 0, `${zone.id} marker radius should be positive`);
    assert.ok(zone.cx - zone.r >= 0 && zone.cx + zone.r <= GWANGJU_SEATMAP_IMAGE.imageWidth, `${zone.id} marker x bounds should fit image`);
    assert.ok(zone.cy - zone.r >= 0 && zone.cy + zone.r <= GWANGJU_SEATMAP_IMAGE.imageHeight, `${zone.id} marker y bounds should fit image`);
  });
});

test('광주 특수석 hit-area는 번호 블록 label 중심을 침범하지 않는다', () => {
  const numberedBlocks = GWANGJU_BLOCKS.filter(isNumberedSeatBlock);
  const specialBlocks = GWANGJU_BLOCKS.filter((block) => !isNumberedSeatBlock(block) && !isDerivedAggregateBlockId(block.id));

  specialBlocks.forEach((specialBlock) => {
    const swallowedLabels = numberedBlocks
      .filter((numberedBlock) => isPointInPath({ x: numberedBlock.imageGeometry.labelX, y: numberedBlock.imageGeometry.labelY }, specialBlock.imageGeometry.d))
      .map((numberedBlock) => numberedBlock.block);

    assert.deepEqual(swallowedLabels, [], `${specialBlock.id} should not cover numbered label centers`);
  });
});

test('광주 P3 챔피언/중앙테이블/서프라이즈 shared boundary는 공식 component 재트레이싱 기준을 유지한다', () => {
  const blocksById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));
  const expectedBoundsByBlockId = {
    'champion-seats': { minX: 461, minY: 740, maxX: 559, maxY: 843 },
    'central-table-seats': { minX: 397, minY: 755, maxX: 523, maxY: 895 },
    'first-surprise-seats': { minX: 714, minY: 772, maxX: 959, maxY: 848 },
    'third-surprise-seats': { minX: 515, minY: 392, maxX: 656, maxY: 585 },
  };
  const expectedSubpathCountByBlockId = {
    'champion-seats': 1,
    'central-table-seats': 1,
    'first-surprise-seats': 3,
    'third-surprise-seats': 3,
  };

  Object.entries(expectedBoundsByBlockId).forEach(([blockId, expectedBounds]) => {
    const block = blocksById.get(blockId);
    assert.ok(block, `${blockId} should exist for P3 precision lock`);
    const subpaths = parsePathSubpaths(block.imageGeometry.d);

    assert.deepEqual(getPathBounds(subpaths), expectedBounds);
    assert.equal(subpaths.length, expectedSubpathCountByBlockId[blockId as keyof typeof expectedSubpathCountByBlockId]);
    assert.equal(GWANGJU_OFFICIAL_TRACE_REFERENCE[blockId].expectedSubpathCount, expectedSubpathCountByBlockId[blockId as keyof typeof expectedSubpathCountByBlockId]);
    assert.deepEqual(GWANGJU_OFFICIAL_TRACE_REFERENCE[blockId].expectedBounds, expectedBounds);
  });

  const champion = blocksById.get('champion-seats')!;
  const centralTable = blocksById.get('central-table-seats')!;

  assert.equal(
    pointInPolygon([centralTable.imageGeometry.labelX, centralTable.imageGeometry.labelY], parsePolygonPoints(champion.imageGeometry.d)),
    false,
    'champion hit-area should not swallow the central table label',
  );
  assert.equal(
    pointInPolygon([champion.imageGeometry.labelX, champion.imageGeometry.labelY], parsePolygonPoints(centralTable.imageGeometry.d)),
    false,
    'central table hit-area should not swallow the champion label',
  );
  assert.ok(
    calculateSampledOverlapRatio(champion.imageGeometry.d, centralTable.imageGeometry.d) <= 0.005,
    'champion and central table polygons should share a boundary without meaningful overlap',
  );
});

test('광주 3루 G/H/I/J와 121~127 shared boundary는 공식 PNG mask 기준을 유지한다', () => {
  const blocksById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));
  const expectedBoundsByBlockId = {
    'third-surprise-seats': { minX: 515, minY: 392, maxX: 656, maxY: 585 },
    'third-family-seats': { minX: 569, minY: 158, maxX: 692, maxY: 307 },
    'third-wheelchair-seats': { minX: 438, minY: 204, maxX: 607, maxY: 362 },
    'party-seats-third': { minX: 430, minY: 353, maxX: 489, maxY: 398 },
    'k7-121': { minX: 428, minY: 490, maxX: 520, maxY: 545 },
    'k7-122': { minX: 455, minY: 452, maxX: 545, maxY: 501 },
    'k8-123': { minX: 470, minY: 408, maxX: 565, maxY: 454 },
    'k5-124': { minX: 490, minY: 370, maxX: 630, maxY: 430 },
    'k5-125': { minX: 485, minY: 330, maxX: 640, maxY: 390 },
    'k5-126': { minX: 560, minY: 315, maxX: 683, maxY: 362 },
    'k5-127': { minX: 675, minY: 243, maxX: 692, maxY: 313 },
  };
  const expectedVisualBoundsByBlockId: Record<string, Bounds> = {
    'k7-121': { minX: 404, minY: 502, maxX: 555, maxY: 586 },
    'k7-122': { minX: 426, minY: 452, maxX: 571, maxY: 508 },
    'k8-123': { minX: 452, minY: 400, maxX: 610, maxY: 459 },
    'k5-124': { minX: 465, minY: 358, maxX: 653, maxY: 439 },
    'k5-125': { minX: 485, minY: 320, maxX: 664, maxY: 392 },
    'k5-126': { minX: 515, minY: 286, maxX: 683, maxY: 362 },
    'k5-127': { minX: 672, minY: 216, maxX: 695, maxY: 309 },
  };

  Object.entries(expectedBoundsByBlockId).forEach(([blockId, expectedBounds]) => {
    const block = blocksById.get(blockId);
    assert.ok(block, `${blockId} should exist for third-base H/126 boundary lock`);
    const subpaths = parsePathSubpaths(block.imageGeometry.d);

    assert.deepEqual(getPathBounds(subpaths), expectedBounds);
    assert.deepEqual(GWANGJU_OFFICIAL_TRACE_REFERENCE[blockId].expectedBounds, expectedBounds);
  });

  ['k7-121', 'k7-122', 'k8-123', 'k5-124', 'k5-125', 'k5-126', 'k5-127'].forEach((blockId) => {
    const block = blocksById.get(blockId);
    assert.ok(block?.imageGeometry.visualD, `${blockId} should use official PNG visualD while keeping a non-overlap hit-area`);
    assert.notEqual(block.imageGeometry.visualD, block.imageGeometry.d, `${blockId} visualD should remain separate from the click hit-area`);
    assert.deepEqual(getPathBounds(parsePathSubpaths(block.imageGeometry.visualD)), expectedVisualBoundsByBlockId[blockId]);
  });

  const thirdFamily = blocksById.get('third-family-seats')!;
  const thirdWheelchair = blocksById.get('third-wheelchair-seats')!;
  const partyThird = blocksById.get('party-seats-third')!;
  const k5126 = blocksById.get('k5-126')!;
  const k5127 = blocksById.get('k5-127')!;
  const thirdFamilyPolygon = parsePolygonPoints(thirdFamily.imageGeometry.d);
  const partyThirdPolygon = parsePolygonPoints(partyThird.imageGeometry.d);

  assert.equal(
    pointInPolygon([k5126.imageGeometry.labelX, k5126.imageGeometry.labelY], thirdFamilyPolygon),
    false,
    '3루 H hit-area should not swallow 126 label center',
  );
  assert.equal(
    pointInPolygon([k5127.imageGeometry.labelX, k5127.imageGeometry.labelY], thirdFamilyPolygon),
    false,
    '3루 H hit-area should not swallow 127 label center',
  );
  assert.equal(
    isPointInPath({ x: partyThird.imageGeometry.labelX, y: partyThird.imageGeometry.labelY }, thirdWheelchair.imageGeometry.d),
    false,
    '3루 I hit-area should not swallow J label center',
  );
  assert.equal(
    pointInPolygon([thirdWheelchair.imageGeometry.labelX, thirdWheelchair.imageGeometry.labelY], partyThirdPolygon),
    false,
    '3루 J hit-area should not swallow I label center',
  );
  assert.ok(
    calculateSampledOverlapRatio(thirdFamily.imageGeometry.d, k5126.imageGeometry.d) <= 0.005,
    '3루 H and 126 polygons should stay split on the official PNG boundary',
  );
  assert.ok(
    calculateSampledOverlapRatio(thirdFamily.imageGeometry.d, k5127.imageGeometry.d) <= 0.005,
    '3루 H and 127 polygons should stay split on the official PNG boundary',
  );
  assert.ok(
    calculateSampledOverlapRatio(thirdWheelchair.imageGeometry.d, partyThird.imageGeometry.d) <= 0.005,
    '3루 I and J polygons should stay split on the official PNG boundary',
  );
  assert.equal(
    calculateSampledOverlapRatio(blocksById.get('k8-123')!.imageGeometry.d, blocksById.get('third-surprise-seats')!.imageGeometry.d),
    0,
    '3루 G should not overlap 123 at the official PNG shared boundary',
  );
  assert.equal(
    calculateSampledOverlapRatio(blocksById.get('k5-124')!.imageGeometry.d, partyThird.imageGeometry.d),
    0,
    '3루 J should not overlap 124 at the official PNG shared boundary',
  );
  assert.ok(
    calculateSampledOverlapRatio(blocksById.get('k7-122')!.imageGeometry.visualD!, blocksById.get('third-surprise-seats')!.imageGeometry.d) <= 0.01,
    '122 visual polygon should not swallow the 3루 G special area',
  );
  assert.ok(
    calculateSampledOverlapRatio(blocksById.get('k8-123')!.imageGeometry.visualD!, blocksById.get('third-surprise-seats')!.imageGeometry.d) <= 0.01,
    '123 visual polygon should not swallow the 3루 G special area',
  );
  assert.ok(
    calculateSampledOverlapRatio(blocksById.get('k5-124')!.imageGeometry.visualD!, partyThird.imageGeometry.d) <= 0.08,
    '124 visual polygon should not swallow the 3루 J special area',
  );
  assert.ok(
    calculateSampledOverlapRatio(blocksById.get('k5-126')!.imageGeometry.visualD!, thirdFamily.imageGeometry.d) <= 0.08,
    '126 visual polygon should stay on its side of the 3루 H shared boundary',
  );
  assert.ok(
    calculateSampledOverlapRatio(blocksById.get('k5-127')!.imageGeometry.visualD!, thirdFamily.imageGeometry.d) <= 0.01,
    '127 visual polygon should not swallow the 3루 H special area',
  );
});

test('광주 1루 101~108과 H/I/J/S-301~304 shared boundary는 공식 PNG mask 기준을 유지한다', () => {
  const blocksById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));
  const expectedBoundsByBlockId = {
    'k5-101': { minX: 1058, minY: 802, maxX: 1115, maxY: 825 },
    'k5-102': { minX: 1009, minY: 794, maxX: 1057, maxY: 839 },
    'k5-103': { minX: 961, minY: 789, maxX: 1013, maxY: 906 },
    'k5-104': { minX: 918, minY: 797, maxX: 982, maxY: 917 },
    'k5-105': { minX: 873, minY: 808, maxX: 938, maxY: 932 },
    'k5-106': { minX: 829, minY: 819, maxX: 894, maxY: 943 },
    'k7-107': { minX: 797, minY: 835, maxX: 850, maxY: 951 },
    'k7-108': { minX: 736, minY: 847, maxX: 808, maxY: 953 },
    'first-family-seats': { minX: 1007, minY: 812, maxX: 1185, maxY: 904 },
    'first-wheelchair-seats': { minX: 958, minY: 893, maxX: 1112, maxY: 944 },
    'party-seats-first': { minX: 867, minY: 930, maxX: 959, maxY: 966 },
    'sky-picnic-s-301': { minX: 846, minY: 952, maxX: 867, maxY: 974 },
    'sky-picnic-s-302': { minX: 822, minY: 957, maxX: 845, maxY: 978 },
    'sky-picnic-s-303': { minX: 799, minY: 961, maxX: 822, maxY: 982 },
    'sky-picnic-s-304': { minX: 778, minY: 965, maxX: 798, maxY: 984 },
  };

  Object.entries(expectedBoundsByBlockId).forEach(([blockId, expectedBounds]) => {
    const block = blocksById.get(blockId);
    assert.ok(block, `${blockId} should exist for first-base 101~108 lower boundary lock`);
    const subpaths = parsePathSubpaths(block.imageGeometry.d);

    assert.deepEqual(getPathBounds(subpaths), expectedBounds);
    assert.deepEqual(GWANGJU_OFFICIAL_TRACE_REFERENCE[blockId].expectedBounds, expectedBounds);
  });

  ['k5-105', 'sky-picnic-s-301'].forEach((blockId) => {
    const block = blocksById.get(blockId);
    assert.ok(block?.imageGeometry.visualD, `${blockId} should render the official-image visual outline separately from the clipped hit path`);
    assert.notEqual(block.imageGeometry.visualD, block.imageGeometry.d, `${blockId} visual outline should not be forced to the non-overlap hit path`);
  });

  const specialIds = ['first-family-seats', 'first-wheelchair-seats', 'party-seats-first'];
  const adjacentLabelIds = [
    'k5-101',
    'k5-102',
    'k5-103',
    'k5-104',
    'k5-105',
    'k5-106',
    'k7-107',
    'k7-108',
    'sky-picnic-s-301',
    'sky-picnic-s-302',
    'sky-picnic-s-303',
    'sky-picnic-s-304',
  ];

  specialIds.forEach((specialId) => {
    const specialBlock = blocksById.get(specialId)!;
    const specialPolygon = parsePolygonPoints(specialBlock.imageGeometry.d);
    const swallowedLabels = adjacentLabelIds
      .filter((blockId) => {
        const adjacentBlock = blocksById.get(blockId)!;
        return pointInPolygon([adjacentBlock.imageGeometry.labelX, adjacentBlock.imageGeometry.labelY], specialPolygon);
      });

    assert.deepEqual(swallowedLabels, [], `${specialId} should not swallow adjacent 101~108 or S-301~304 label centers`);
  });

  assert.equal(
    pointInPolygon(
      [blocksById.get('party-seats-first')!.imageGeometry.labelX, blocksById.get('party-seats-first')!.imageGeometry.labelY],
      parsePolygonPoints(blocksById.get('first-wheelchair-seats')!.imageGeometry.d),
    ),
    false,
    '1루 I hit-area should not swallow J label center',
  );
  assert.equal(
    pointInPolygon(
      [blocksById.get('first-wheelchair-seats')!.imageGeometry.labelX, blocksById.get('first-wheelchair-seats')!.imageGeometry.labelY],
      parsePolygonPoints(blocksById.get('party-seats-first')!.imageGeometry.d),
    ),
    false,
    '1루 J hit-area should not swallow I label center',
  );

  [
    ['first-family-seats', 'k5-101'],
    ['first-family-seats', 'k5-102'],
    ['first-family-seats', 'k5-103'],
    ['first-family-seats', 'k5-104'],
    ['first-wheelchair-seats', 'k5-103'],
    ['first-wheelchair-seats', 'k5-104'],
    ['first-wheelchair-seats', 'k5-105'],
    ['party-seats-first', 'k5-106'],
    ['party-seats-first', 'k7-107'],
    ['party-seats-first', 'k7-108'],
    ['party-seats-first', 'sky-picnic-s-301'],
    ['party-seats-first', 'sky-picnic-s-302'],
    ['party-seats-first', 'sky-picnic-s-303'],
    ['party-seats-first', 'sky-picnic-s-304'],
    ['first-wheelchair-seats', 'party-seats-first'],
  ].forEach(([firstId, secondId]) => {
    const overlapRatio = calculateSampledOverlapRatio(
      blocksById.get(firstId)!.imageGeometry.d,
      blocksById.get(secondId)!.imageGeometry.d,
    );

    assert.ok(overlapRatio <= 0.005, `${firstId}/${secondId} should not overlap. Actual ratio: ${overlapRatio.toFixed(4)}`);
  });
});

test('광주 외야석 hit-area는 외야테이블석 label을 삼키지 않는다', () => {
  const blockById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));
  const pairs = [
    ['outfield-left-seats', 'bleachers-table-left'],
    ['outfield-right-seats', 'bleachers-table-right'],
  ];

  pairs.forEach(([outfieldId, tableId]) => {
    const outfield = blockById.get(outfieldId);
    const table = blockById.get(tableId);
    assert.ok(outfield, `${outfieldId} should exist`);
    assert.ok(table, `${tableId} should exist`);

    assert.equal(
      pointInPolygon(
        [table.imageGeometry.labelX, table.imageGeometry.labelY],
        parsePolygonPoints(outfield.imageGeometry.d),
      ),
      false,
      `${outfieldId} should not create an O/P nested hit area`,
    );
  });
});

test('광주 traced geometry는 공식 PNG 좌석 색상 영역과 충분히 겹친다', async () => {
  const image = await readOfficialSeatmapPixels();

  GWANGJU_BLOCKS.forEach((block) => {
    const overlapRatio = calculateOfficialSeatColorOverlapRatio(image, block.imageGeometry.d);
    const minimumOverlapRatio = isNumberedSeatBlock(block) ? 0.82 : 0.70;

    assert.ok(
      overlapRatio >= minimumOverlapRatio,
      `${block.id} should overlap official colored seat pixels. Actual ratio: ${overlapRatio.toFixed(2)}`,
    );
  });
});

test('광주 P4 반복 블럭은 높은 공식 PNG 좌석 색상 overlap으로 잠근다', async () => {
  const image = await readOfficialSeatmapPixels();
  const p4Workset = GWANGJU_ZONE_PRECISION_WORKSETS.find((workset) => workset.id === 'p4-repeated-numbered-blocks');
  const blocksById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));
  const failures: string[] = [];

  assert.ok(p4Workset, 'P4 repeated numbered block workset should exist');
  assert.equal(p4Workset.blockIds.length, 70);

  p4Workset.blockIds.forEach((blockId) => {
    const block = blocksById.get(blockId);
    assert.ok(block, `${blockId} should exist`);
    assert.ok(['SKY_PICNIC', 'FIVE_TABLE'].includes(block.category), `${blockId} should stay in P4 repeat categories`);

    const overlapRatio = calculateOfficialSeatColorOverlapRatio(image, block.imageGeometry.d);
    if (overlapRatio < 0.98) {
      failures.push(`${blockId}:${overlapRatio.toFixed(4)}`);
    }
  });

  assert.deepEqual(failures, []);
});

test('광주 P4 518/519와 skybox 공유 경계는 공식 component bbox로 잠근다', () => {
  const blocksById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));
  const expectedBoundsByBlockId = {
    'five-table-518': { minX: 319, minY: 861, maxX: 385, maxY: 920 },
    'five-table-519': { minX: 297, minY: 827, maxX: 362, maxY: 883 },
    'skybox-seats': { minX: 345, minY: 823, maxX: 389, maxY: 888 },
  };
  const sharedBoundaryIds = Object.keys(expectedBoundsByBlockId);

  sharedBoundaryIds.forEach((blockId) => {
    const block = blocksById.get(blockId);
    assert.ok(block, `${blockId} should exist for shared-boundary lock`);
    const subpaths = parsePathSubpaths(block.imageGeometry.d);

    assert.deepEqual(getPathBounds(subpaths), expectedBoundsByBlockId[blockId as keyof typeof expectedBoundsByBlockId]);
  });
  assert.equal(parsePathSubpaths(blocksById.get('skybox-seats')!.imageGeometry.d).length, 2);

  sharedBoundaryIds.forEach((firstId, firstIndex) => {
    sharedBoundaryIds.slice(firstIndex + 1).forEach((secondId) => {
      const overlapRatio = calculateSampledOverlapRatio(
        blocksById.get(firstId)!.imageGeometry.d,
        blocksById.get(secondId)!.imageGeometry.d,
      );

      assert.ok(overlapRatio <= 0.005, `${firstId}/${secondId} should not overlap. Actual ratio: ${overlapRatio.toFixed(4)}`);
    });
  });
});

test('광주 O/P 외야 hit-area는 공식 PNG component coverage 기준을 통과한다', async () => {
  const image = await readOfficialSeatmapPixels();
  const blocksById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));

  Object.entries(GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES).forEach(([blockId, reference]) => {
    const block = blocksById.get(blockId);
    assert.ok(block, `${blockId} should exist for O/P component coverage`);

    const metrics = calculateOfficialComponentCoverage(image, block, reference);

    assert.ok(
      metrics.officialComponentRecall >= reference.minimumRecall,
      `${blockId} should cover official ${reference.componentIds.join('+')} pixels. Actual recall: ${metrics.officialComponentRecall.toFixed(3)}`,
    );
    assert.ok(
      metrics.componentIoU >= reference.minimumIoU,
      `${blockId} should align with official ${reference.componentIds.join('+')} component. Actual IoU: ${metrics.componentIoU.toFixed(3)}`,
    );
  });
});

test('광주 공식 좌석도 데이터는 준비 완료 시 핵심 좌석 구역을 포함한다', () => {
  if (GWANGJU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    assert.equal(GWANGJU_BLOCKS.length, 0, 'manual-required state should not expose synthesized hit areas');
    return;
  }

  const officialBlocks = new Set(GWANGJU_BLOCKS.flatMap((block) => block.officialBlocks));
  const categories = new Set(GWANGJU_BLOCKS.map((block) => block.category));

  [
    'CHAMPION',
    'CENTRAL_TABLE',
    'SURPRISE',
    'FAMILY',
    'ACCESSIBLE',
    'PARTY',
    'SKYBOX',
    'K9',
    'K8',
    'K7',
    'K5',
    'SKY_PICNIC',
    'FIVE_TABLE',
    'OUTFIELD',
    'BLEACHERS_TABLE',
  ].forEach((category) => {
    assert.ok(categories.has(category), `${category} category should exist`);
  });

  assert.equal(categories.has('EV'), false, 'EV legend marker should not expose a standalone hit area');
  assert.equal(GWANGJU_BLOCKS.some((block) => ['M', 'N'].includes(block.imageGeometry.shortLabel)), false, 'legend marker letters should not become standalone hit areas');

  [
    ...[
      ...Array.from({ length: 13 }, (_, index) => String(index + 101)),
      '116',
      '117',
      ...Array.from({ length: 10 }, (_, index) => String(index + 118)),
    ],
    ...Array.from({ length: 35 }, (_, index) => `S-${index + 301}`),
    ...Array.from({ length: 35 }, (_, index) => String(index + 501)),
    '외야석',
    '우측 외야석',
    '좌측 외야테이블석',
    '우측 외야테이블석',
  ].forEach((officialBlock) => {
    assert.ok(officialBlocks.has(officialBlock), `${officialBlock} should exist`);
  });

  ['114', '115'].forEach((officialBlock) => {
    assert.equal(officialBlocks.has(officialBlock), false, `${officialBlock} should not be selectable without a visible official number`);
  });

  ['1루 EV석', '3루 EV석', 'EV석'].forEach((officialBlock) => {
    assert.equal(officialBlocks.has(officialBlock), false, `${officialBlock} marker should not be exposed as a guessed official block`);
  });

  assert.ok(categories.has('K7'), 'K7 numbered blocks should exist after operator block-range confirmation');
  assert.ok(categories.has('AWAY'), 'away cheering should expose an official derived aggregate hit-area');
  assert.deepEqual([...GWANGJU_PENDING_OPERATOR_SECTIONS].sort(), []);
  assert.ok(officialBlocks.has('K7석'), 'K7 range should have a filter-only aggregate official block');
  assert.ok(officialBlocks.has('원정응원석'), 'away range should have a filter-only aggregate official block');
});

test('광주 K7/원정응원석 운영자 블럭 범위는 공식 번호 블럭 기반 aggregate hit-area에 연결한다', () => {
  assert.equal(GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE, true);
  assert.deepEqual(GWANGJU_K7_OFFICIAL_BLOCKS, ['107', '108', '109', '110', '111', '118', '119', '120', '121', '122']);
  assert.deepEqual(GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS, ['107', '108', '109', '110']);
  assert.deepEqual(GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS, ['118', '119', '120', '121', '122']);

  const blocksByOfficialBlock = new Map(GWANGJU_BLOCKS.map((block) => [block.block, block]));
  const confirmedBlockIds = new Set(GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS);

  GWANGJU_K7_OFFICIAL_BLOCKS.forEach((officialBlock) => {
    const block = blocksByOfficialBlock.get(officialBlock);
    assert.ok(block, `${officialBlock} should exist`);
    assert.equal(block.category, 'K7', `${officialBlock} should be K7`);
    assert.equal(block.officialBlocks.length, 1, `${officialBlock} should keep one numeric official block`);
    assert.equal(block.officialBlocks[0], officialBlock);
    assert.ok(block.seatViewSections.includes('K7석'), `${officialBlock} should include K7 search alias`);
    assert.ok(confirmedBlockIds.has(block.id), `${officialBlock} should be part of confirmed K7 block id set`);
  });

  GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS.forEach((officialBlock) => {
    const block = blocksByOfficialBlock.get(officialBlock);
    assert.equal(block?.fanRole, 'AWAY', `${officialBlock} should be tagged as away cheering`);
    assert.ok(block?.seatViewSections.includes('원정응원석'), `${officialBlock} should include away cheering alias`);
  });

  GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS.forEach((officialBlock) => {
    const block = blocksByOfficialBlock.get(officialBlock);
    assert.equal(block?.fanRole, 'HOME', `${officialBlock} should be tagged as home cheering`);
    assert.ok(block?.seatViewSections.includes('홈 응원석'), `${officialBlock} should include home cheering alias`);
  });

  assert.equal(blocksByOfficialBlock.get('111')?.fanRole, 'NEUTRAL');
  assert.equal(blocksByOfficialBlock.get('123')?.category, 'K8');
  assert.equal(GWANGJU_BLOCKS.filter((block) => block.category === 'AWAY').length, 1);
  assert.equal(GWANGJU_BLOCKS.find((block) => block.id === 'home-k7-seats')?.imageGeometry.d, GWANGJU_IMAGE_GEOMETRY_DRAFTS['home-k7-seats'].d);
  assert.equal(GWANGJU_BLOCKS.find((block) => block.id === 'away-cheering-seats')?.imageGeometry.d, GWANGJU_IMAGE_GEOMETRY_DRAFTS['away-cheering-seats'].d);
});

test('광주 K7/AWAY derived range는 기존 traced block과 aggregate hit-area를 서비스 필터에 연결한다', () => {
  const rangesById = new Map(GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.map((range) => [range.id, range]));
  const k7Range = rangesById.get('derived-k7-seats');
  const awayRange = rangesById.get('derived-away-cheering-seats');
  const homeRange = rangesById.get('derived-home-cheering-seats');
  const tracedBlockIds = new Set(GWANGJU_BLOCKS.map((block) => block.id));
  const filterGroupIds = new Set(GWANGJU_CATEGORY_GROUPS.map((group) => group.id));

  assert.equal(GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.length, 3);
  assert.deepEqual(k7Range?.officialBlocks, GWANGJU_K7_OFFICIAL_BLOCKS);
  assert.equal(k7Range?.displayBlocks, '107~111, 118~122');
  assert.deepEqual(k7Range?.blockIds, GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS);
  assert.equal(k7Range?.filterGroupId, 'k7');
  assert.equal(k7Range?.fanRoles, null);
  assert.deepEqual(awayRange?.officialBlocks, GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS);
  assert.equal(awayRange?.displayBlocks, '107~110');
  assert.deepEqual(awayRange?.blockIds, GWANGJU_AWAY_CHEERING_BLOCK_IDS);
  assert.equal(awayRange?.filterGroupId, 'away-cheering');
  assert.deepEqual(awayRange?.fanRoles, ['AWAY']);
  assert.deepEqual(homeRange?.officialBlocks, GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS);
  assert.equal(homeRange?.displayBlocks, '118~122');
  assert.deepEqual(homeRange?.blockIds, GWANGJU_HOME_CHEERING_BLOCK_IDS);
  assert.equal(homeRange?.filterGroupId, 'home-cheering');
  assert.deepEqual(homeRange?.fanRoles, ['HOME']);
  assert.deepEqual(
    getGwangjuDerivedOperatorRangesForBlock('k7-107').map((range) => range.id),
    ['derived-k7-seats', 'derived-away-cheering-seats'],
  );
  assert.deepEqual(
    getGwangjuDerivedOperatorRangesForBlock('k7-111').map((range) => range.id),
    ['derived-k7-seats'],
  );
  assert.deepEqual(
    getGwangjuDerivedOperatorRangesForBlock('k7-118').map((range) => range.id),
    ['derived-k7-seats', 'derived-home-cheering-seats'],
  );
  assert.deepEqual(getGwangjuDerivedOperatorRangesForBlock('k5-101'), []);

  assert.equal(k7Range?.aggregateHitArea, 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE');
  assert.equal(k7Range?.operatorPolygonStatus, 'OFFICIAL_DERIVED_READY');
  assert.equal(awayRange?.aggregateHitArea, 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE');
  assert.equal(awayRange?.operatorPolygonStatus, 'OFFICIAL_DERIVED_READY');
  assert.equal(homeRange?.aggregateHitArea, 'REUSES_EXISTING_TRACE_ONLY');
  assert.equal(homeRange?.operatorPolygonStatus, 'OFFICIAL_DERIVED_READY');

  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.forEach((range) => {
    assert.ok(filterGroupIds.has(range.filterGroupId), `${range.id} should point to an active filter group`);
    range.blockIds.forEach((blockId) => {
      const block = GWANGJU_BLOCKS.find((candidate) => candidate.id === blockId);
      assert.ok(tracedBlockIds.has(blockId), `${range.id} should only reference active traced blocks`);
      assert.equal(block?.imageGeometry.traceStatus, 'OFFICIAL_IMAGE_TRACED');
      assert.equal(block?.imageGeometry.manualReviewed, true);
      assert.equal(block?.imageGeometry.pixelAlignmentStatus, 'PIXEL_ALIGNED');
    });
  });
});

test('광주 K7/AWAY는 공식 번호 블럭 aggregate로 active 113개 상태를 유지한다', () => {
  const aggregateOperatorIds = ['home-k7-seats', 'away-cheering-seats'];
  const requirementsById = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((requirement) => [requirement.id, requirement]));

  assert.equal(GWANGJU_BASE_TRACE_BLOCK_COUNT, 111);
  assert.equal(GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, 113);
  assert.equal(GWANGJU_BLOCKS.length, 113);
  assert.equal(GWANGJU_SEATMAP_COORDINATES_READY, true);
  assert.deepEqual(GWANGJU_PENDING_OPERATOR_SECTIONS, []);

  aggregateOperatorIds.forEach((id) => {
    assert.equal(Object.prototype.hasOwnProperty.call(GWANGJU_IMAGE_GEOMETRY_DRAFTS, id), true, `${id} should have official derived aggregate geometry`);
    assert.equal(GWANGJU_BLOCKS.some((block) => block.id === id), true, `${id} should be an active filter-only hit-area`);
    assert.equal(requirementsById.get(id)?.status, 'READY');
  });

  assert.equal(GWANGJU_BLOCKS.some((block) => block.officialBlocks.includes('K7석')), true);
  assert.equal(GWANGJU_BLOCKS.some((block) => block.officialBlocks.includes('원정응원석')), true);
  assert.equal(GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.some((range) => aggregateOperatorIds.includes(range.id)), false);

  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.forEach((range) => {
    assert.equal(range.operatorPolygonStatus, 'OFFICIAL_DERIVED_READY');
    range.sourceRequirementIds.forEach((id) => {
      assert.equal(requirementsById.get(id)?.status, 'READY');
    });
  });
});

test('광주 응원석 필터는 K7 번호 블럭을 fanRole 기준으로 분리한다', () => {
  const groupsById = new Map(GWANGJU_CATEGORY_GROUPS.map((group) => [group.id, group]));
  const blocksByOfficialBlock = new Map(GWANGJU_BLOCKS.map((block) => [block.block, block]));
  const k7Group = groupsById.get('k7');
  const cheeringGroup = groupsById.get('cheering');
  const homeGroup = groupsById.get('home-cheering');
  const awayGroup = groupsById.get('away-cheering');

  assert.ok(k7Group);
  assert.ok(cheeringGroup);
  assert.ok(homeGroup);
  assert.ok(awayGroup);

  const k7Blocks = GWANGJU_BLOCKS.filter((block) => matchesGwangjuCategoryGroup(block, k7Group)).map((block) => block.block).sort();
  const cheeringBlocks = GWANGJU_BLOCKS.filter((block) => matchesGwangjuCategoryGroup(block, cheeringGroup)).map((block) => block.block).sort();
  const homeBlocks = GWANGJU_BLOCKS.filter((block) => matchesGwangjuCategoryGroup(block, homeGroup)).map((block) => block.block).sort();
  const awayBlocks = GWANGJU_BLOCKS.filter((block) => matchesGwangjuCategoryGroup(block, awayGroup)).map((block) => block.block).sort();

  assert.deepEqual(k7Blocks, [...GWANGJU_K7_OFFICIAL_BLOCKS, 'K7석'].sort());
  assert.deepEqual(cheeringBlocks, [...GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS, ...GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS, '원정응원석'].sort());
  assert.deepEqual(homeBlocks, GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS);
  assert.deepEqual(awayBlocks, ['원정응원석']);
  assert.equal(matchesGwangjuCategoryGroup(blocksByOfficialBlock.get('111')!, k7Group), true);
  assert.equal(matchesGwangjuCategoryGroup(blocksByOfficialBlock.get('111')!, cheeringGroup), false);
  assert.equal(matchesGwangjuCategoryGroup(blocksByOfficialBlock.get('111')!, groupsById.get('infield')!), true);
});

test('광주 좌석도는 미확인 응원 구역과 검증된 선택 가능 블록 상태를 분리한다', () => {
  assert.equal(
    GWANGJU_SELECTABLE_BLOCKS_READY,
    GWANGJU_COORDINATE_TRACE_STATUS === 'READY'
      && GWANGJU_SEATMAP_IMAGE.assetStatus === 'OFFICIAL'
      && GWANGJU_BLOCKS.length > 0,
  );

  if (GWANGJU_COORDINATE_TRACE_STATUS === 'RETRACE_IN_PROGRESS') {
    assert.equal(GWANGJU_SELECTABLE_BLOCKS_READY, false, 'seat selection should stay disabled while polygons are being retraced');
  } else if (!GWANGJU_SEATMAP_COORDINATES_READY && GWANGJU_SEATMAP_IMAGE.assetStatus === 'OFFICIAL') {
    assert.equal(GWANGJU_SELECTABLE_BLOCKS_READY, true, 'verified official-image blocks should be selectable while K7/AWAY wait for operator coordinates');
    assert.deepEqual([...GWANGJU_PENDING_OPERATOR_SECTIONS].sort(), ['K7석', '원정응원석'].sort());
  }
});
