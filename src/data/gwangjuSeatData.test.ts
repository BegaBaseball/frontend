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
  GWANGJU_IMAGE_GEOMETRY_DRAFTS,
  GWANGJU_OFFICIAL_TRACE_REFERENCE,
  GWANGJU_AWAY_CHEERING_BLOCK_IDS,
  GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS,
  GWANGJU_HOME_CHEERING_BLOCK_IDS,
  GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS,
  GWANGJU_K7_OFFICIAL_BLOCKS,
  GWANGJU_MYSEATCHECK_REFERENCE_URL,
  GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
  GWANGJU_SELECTABLE_BLOCKS_READY,
  GWANGJU_SEATMAP_COORDINATES_READY,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_TRACE_ANCHOR_TOLERANCE_PX,
  GWANGJU_TRACE_BOUNDS_TOLERANCE_PX,
  GWANGJU_TRACE_REVIEW_REGIONS,
  GWANGJU_TRACE_REVIEW_SUMMARY,
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
  assert.equal(groupedCategories.includes('AWAY'), false, 'away cheering should be represented by K7 block fanRole, not a duplicated filter polygon');

  const groupsById = new Map(GWANGJU_CATEGORY_GROUPS.map((group) => [group.id, group]));
  assert.deepEqual(groupsById.get('cheering')?.fanRoles, ['HOME', 'AWAY']);
  assert.deepEqual(groupsById.get('k7')?.cats, ['K7']);
  assert.equal(groupsById.get('k7')?.fanRoles, undefined);
  assert.deepEqual(groupsById.get('home-cheering')?.fanRoles, ['HOME']);
  assert.deepEqual(groupsById.get('away-cheering')?.fanRoles, ['AWAY']);
  assert.deepEqual(groupsById.get('home-cheering')?.cats, ['K7']);
  assert.deepEqual(groupsById.get('away-cheering')?.cats, ['K7']);

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
    assert.match(block.imageGeometry.d, /^M -?\d+(?:\.\d+)? -?\d+(?:\.\d+)?(?: L -?\d+(?:\.\d+)? -?\d+(?:\.\d+)?){3,} Z$/, `${block.id} image geometry should use closed polygon path data`);
    assert.ok((block.imageGeometry.d.match(/L /g)?.length ?? 0) >= 3, `${block.id} image geometry should use polygon path data`);
    assert.equal(block.imageGeometry.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${block.id} should use official traced geometry`);
    assert.equal(block.imageGeometry.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${block.id} should use direct official-image path tracing`);
    assert.equal(block.imageGeometry.traceSource, 'OFFICIAL_PNG_MANUAL_POLYGON', `${block.id} should use manual official-PNG polygon source`);
    assert.equal(block.imageGeometry.traceVersion, 'manual-polygon-v2', `${block.id} should use the precision retrace version`);
    assert.equal(block.imageGeometry.manualReviewed, true, `${block.id} precision trace should be manually reviewed`);
    assert.equal(block.imageGeometry.pixelAlignmentStatus, 'PIXEL_ALIGNED', `${block.id} should be pixel aligned`);
    assert.ok(block.imageGeometry.manualReviewNote, `${block.id} should keep trace review note`);
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= GWANGJU_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= GWANGJU_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);

    const pathNumbers = block.imageGeometry.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
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

test('광주 official trace reference는 전 active 블록의 anchor와 bbox를 고정한다', () => {
  const expectedIds = GWANGJU_BLOCKS.map((block) => block.id).sort();
  const actualReferenceIds = Object.keys(GWANGJU_OFFICIAL_TRACE_REFERENCE).sort();

  assert.deepEqual(actualReferenceIds, expectedIds);

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
    const polygon = parsePolygonPoints(block.imageGeometry.d);

    assert.equal(
      pointInPolygon([block.imageGeometry.labelX, block.imageGeometry.labelY], polygon),
      true,
      `${block.id} label should stay inside its polygon`,
    );
  });
});

test('광주 블록 hit-area는 다른 블록 label 중심을 침범하지 않는다', () => {
  GWANGJU_BLOCKS.forEach((block) => {
    const polygon = parsePolygonPoints(block.imageGeometry.d);
    const coveredLabels = GWANGJU_BLOCKS
      .filter((candidate) => candidate.id !== block.id)
      .filter((candidate) => pointInPolygon([candidate.imageGeometry.labelX, candidate.imageGeometry.labelY], polygon))
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
  const specialBlocks = GWANGJU_BLOCKS.filter((block) => !isNumberedSeatBlock(block));

  specialBlocks.forEach((specialBlock) => {
    const polygon = parsePolygonPoints(specialBlock.imageGeometry.d);
    const swallowedLabels = numberedBlocks
      .filter((numberedBlock) => pointInPolygon([numberedBlock.imageGeometry.labelX, numberedBlock.imageGeometry.labelY], polygon))
      .map((numberedBlock) => numberedBlock.block);

    assert.deepEqual(swallowedLabels, [], `${specialBlock.id} should not cover numbered label centers`);
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
  assert.equal(categories.has('AWAY'), false, 'away cheering should not duplicate K7 numbered block hit-areas');
  assert.deepEqual([...GWANGJU_PENDING_OPERATOR_SECTIONS].sort(), ['K7석', '원정응원석'].sort());
  assert.equal(officialBlocks.has('K7석'), false, 'K7 range should use existing numbered official blocks, not a duplicate aggregate official block');
  assert.equal(officialBlocks.has('원정응원석'), false, 'away range should use existing numbered official blocks, not a duplicate aggregate official block');
});

test('광주 K7/원정응원석 운영자 블럭 범위는 기존 번호 블럭 hit-area에 연결한다', () => {
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
  assert.equal(GWANGJU_BLOCKS.filter((block) => block.category === 'AWAY').length, 0);
});

test('광주 K7/AWAY derived range는 기존 traced block만 서비스 필터에 연결한다', () => {
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

  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.forEach((range) => {
    assert.equal(range.aggregateHitArea, 'REUSES_EXISTING_TRACE_ONLY');
    assert.equal(range.operatorPolygonStatus, 'PENDING_OPERATOR_INPUT');
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

test('광주 K7/AWAY는 operator polygon 승격 전까지 active 111개와 derived-only 상태를 유지한다', () => {
  const pendingOperatorIds = ['home-k7-seats', 'away-cheering-seats'];
  const requirementsById = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((requirement) => [requirement.id, requirement]));

  assert.equal(GWANGJU_BASE_TRACE_BLOCK_COUNT, 111);
  assert.equal(GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, 111);
  assert.equal(GWANGJU_BLOCKS.length, 111);

  pendingOperatorIds.forEach((id) => {
    assert.equal(Object.hasOwn(GWANGJU_IMAGE_GEOMETRY_DRAFTS, id), false, `${id} should not have independent geometry before operator write`);
    assert.equal(GWANGJU_BLOCKS.some((block) => block.id === id), false, `${id} should not be an active hit-area before operator write`);
    assert.equal(requirementsById.get(id)?.status, 'PENDING_OPERATOR_INPUT');
  });

  assert.equal(GWANGJU_BLOCKS.some((block) => block.officialBlocks.includes('K7석')), false);
  assert.equal(GWANGJU_BLOCKS.some((block) => block.officialBlocks.includes('원정응원석')), false);
  assert.equal(GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.some((range) => pendingOperatorIds.includes(range.id)), false);

  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.forEach((range) => {
    assert.equal(range.aggregateHitArea, 'REUSES_EXISTING_TRACE_ONLY');
    assert.equal(range.operatorPolygonStatus, 'PENDING_OPERATOR_INPUT');
    range.sourceRequirementIds.forEach((id) => {
      assert.equal(requirementsById.get(id)?.status, 'PENDING_OPERATOR_INPUT');
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

  assert.deepEqual(k7Blocks, GWANGJU_K7_OFFICIAL_BLOCKS);
  assert.deepEqual(cheeringBlocks, [...GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS, ...GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS].sort());
  assert.deepEqual(homeBlocks, GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS);
  assert.deepEqual(awayBlocks, GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS);
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
