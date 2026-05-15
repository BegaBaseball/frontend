import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import sharp from 'sharp';
import {
  CHANGWON_BLOCKS,
  CHANGWON_CATEGORIES,
  CHANGWON_CATEGORY_GROUPS,
  CHANGWON_EXPECTED_VISIBLE_BLOCKS,
  CHANGWON_EXPECTED_SELECTABLE_AREAS,
  CHANGWON_IMAGE_GEOMETRY,
  CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS,
  CHANGWON_OFFICIAL_TRACE_REFERENCE,
  CHANGWON_SEATMAP_IMAGE,
  CHANGWON_SPECIAL_SELECTABLE_AREAS,
  CHANGWON_TRACE_ANCHOR_TOLERANCE_PX,
  CHANGWON_TRACE_BOUNDS_TOLERANCE_PX,
  getChangwonBlockDisplayName,
  getChangwonFanRoleLabel,
  getChangwonLevelLabel,
  getChangwonSeatMapSearchTokens,
  getChangwonSideLabel,
  getChangwonSourceLabel,
  isChangwonBlockInCategoryGroup,
  isChangwonSpecialSelectableArea,
  normalizeChangwonSeatMapSearchText,
  searchChangwonSeatMapBlocks,
} from './changwonSeatData';

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

function parsePathSubpaths(d: string): Point[][] {
  return d
    .trim()
    .split(/(?=M\s)/)
    .filter(Boolean)
    .map((subpath) => {
      assert.match(subpath.trim(), /^M\s-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?(?:\sL\s-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?)+\sZ$/);
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

function polygonArea(polygon: Point[]): number {
  let signedArea = 0;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    signedArea += (polygon[previous].x * polygon[current].y) - (polygon[current].x * polygon[previous].y);
  }

  return Math.abs(signedArea) / 2;
}

function geometryArea(subpaths: Point[][]): number {
  return subpaths.reduce((total, subpath) => total + polygonArea(subpath), 0);
}

function assertWithinTolerance(actual: number, expected: number, tolerance: number, message: string) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

function isPointOnSegment(point: Point, start: Point, end: Point): boolean {
  const cross = ((point.y - start.y) * (end.x - start.x)) - ((point.x - start.x) * (end.y - start.y));
  if (Math.abs(cross) > 0.001) return false;

  const dot = ((point.x - start.x) * (end.x - start.x)) + ((point.y - start.y) * (end.y - start.y));
  if (dot < -0.001) return false;

  const squaredLength = ((end.x - start.x) ** 2) + ((end.y - start.y) ** 2);
  return dot <= squaredLength + 0.001;
}

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const start = polygon[previous];
    const end = polygon[current];

    if (isPointOnSegment(point, start, end)) {
      return true;
    }

    const intersects = ((start.y > point.y) !== (end.y > point.y))
      && (point.x < (((end.x - start.x) * (point.y - start.y)) / (end.y - start.y)) + start.x);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function segmentOrientation(a: Point, b: Point, c: Point): number {
  const value = ((b.y - a.y) * (c.x - b.x)) - ((b.x - a.x) * (c.y - b.y));
  if (Math.abs(value) < 0.001) return 0;
  return value > 0 ? 1 : 2;
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const orientation1 = segmentOrientation(a, b, c);
  const orientation2 = segmentOrientation(a, b, d);
  const orientation3 = segmentOrientation(c, d, a);
  const orientation4 = segmentOrientation(c, d, b);

  if (orientation1 !== orientation2 && orientation3 !== orientation4) return true;
  if (orientation1 === 0 && isPointOnSegment(c, a, b)) return true;
  if (orientation2 === 0 && isPointOnSegment(d, a, b)) return true;
  if (orientation3 === 0 && isPointOnSegment(a, c, d)) return true;
  if (orientation4 === 0 && isPointOnSegment(b, c, d)) return true;
  return false;
}

function hasSelfIntersection(polygon: Point[]): boolean {
  for (let current = 0; current < polygon.length; current += 1) {
    const next = (current + 1) % polygon.length;

    for (let candidate = current + 1; candidate < polygon.length; candidate += 1) {
      const candidateNext = (candidate + 1) % polygon.length;
      if (current === candidate || current === candidateNext || next === candidate) continue;
      if (segmentsIntersect(polygon[current], polygon[next], polygon[candidate], polygon[candidateNext])) {
        return true;
      }
    }
  }

  return false;
}

async function readOfficialSeatmapPixels(): Promise<ImagePixelData> {
  const { data, info } = await sharp(CHANGWON_SEATMAP_IMAGE.imagePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  };
}

function isOfficialSeatColor(red: number, green: number, blue: number): boolean {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const luminance = ((0.2126 * red) + (0.7152 * green) + (0.0722 * blue)) / 255;

  return luminance <= 0.95
    && saturation >= 0.1
    && !(red < 80 && green < 80 && blue < 80);
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

function calculateSeatColorOverlapRatio(image: ImagePixelData, d: string): number {
  const subpaths = parsePathSubpaths(d);
  const bounds = getPathBounds(subpaths);
  let sampledPoints = 0;
  let coloredPoints = 0;
  const sampleStep = 3;

  for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
    for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
      if (!subpaths.some((subpath) => isPointInPolygon({ x, y }, subpath))) {
        continue;
      }

      sampledPoints += 1;
      const [red, green, blue] = getPixelColor(image, x, y);
      if (isOfficialSeatColor(red, green, blue)) {
        coloredPoints += 1;
      }
    }
  }

  return sampledPoints === 0 ? 0 : coloredPoints / sampledPoints;
}

function calculateSampledOverlapRatio(first: string, second: string): number {
  const firstSubpaths = parsePathSubpaths(first);
  const secondSubpaths = parsePathSubpaths(second);
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
        firstSubpaths.some((subpath) => isPointInPolygon(point, subpath))
        && secondSubpaths.some((subpath) => isPointInPolygon(point, subpath))
      ) {
        overlappingPoints += 1;
      }
    }
  }

  const overlapArea = overlappingPoints * sampleStep * sampleStep;
  return overlapArea / Math.min(geometryArea(firstSubpaths), geometryArea(secondSubpaths));
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);

  const progress = Math.max(0, Math.min(1, (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / ((dx ** 2) + (dy ** 2))));
  const closestX = start.x + (progress * dx);
  const closestY = start.y + (progress * dy);

  return Math.hypot(point.x - closestX, point.y - closestY);
}

function distanceToPolygonStroke(point: Point, polygon: Point[]): number {
  return Math.min(...polygon.map((start, index) => distanceToSegment(point, start, polygon[(index + 1) % polygon.length])));
}

function isPointInRenderedHitArea(block: typeof CHANGWON_BLOCKS[number], point: Point): boolean {
  const subpaths = parsePathSubpaths(block.imageGeometry.d);

  if (subpaths.some((subpath) => isPointInPolygon(point, subpath))) {
    return true;
  }

  const hitStrokeWidth = block.imageGeometry.hitStrokeWidth ?? 0;
  if (hitStrokeWidth <= 0) return false;

  return subpaths.some((subpath) => distanceToPolygonStroke(point, subpath) <= hitStrokeWidth / 2);
}

function topRenderedHitBlockAt(point: Point): string | null {
  return CHANGWON_BLOCKS
    .filter((block) => isPointInRenderedHitArea(block, point))
    .at(-1)?.block ?? null;
}

function polygonCentroid(polygon: Point[]): Point {
  let signedArea = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const cross = (polygon[previous].x * polygon[current].y) - (polygon[current].x * polygon[previous].y);
    signedArea += cross;
    centroidX += (polygon[previous].x + polygon[current].x) * cross;
    centroidY += (polygon[previous].y + polygon[current].y) * cross;
  }

  if (Math.abs(signedArea) < 0.001) return polygon[0];

  return {
    x: centroidX / (3 * signedArea),
    y: centroidY / (3 * signedArea),
  };
}

function representativePointForPolygon(polygon: Point[]): Point {
  const centroid = polygonCentroid(polygon);
  if (isPointInPolygon(centroid, polygon)) return centroid;

  const bounds = getPathBounds([polygon]);
  let bestPoint: Point | null = null;
  let bestDistance = -1;
  const steps = 8;

  for (let xIndex = 1; xIndex < steps; xIndex += 1) {
    for (let yIndex = 1; yIndex < steps; yIndex += 1) {
      const candidate = {
        x: bounds.minX + (((bounds.maxX - bounds.minX) * xIndex) / steps),
        y: bounds.minY + (((bounds.maxY - bounds.minY) * yIndex) / steps),
      };

      if (!isPointInPolygon(candidate, polygon)) continue;

      const distance = distanceToPolygonStroke(candidate, polygon);
      if (distance > bestDistance) {
        bestPoint = candidate;
        bestDistance = distance;
      }
    }
  }

  return bestPoint ?? polygon[0];
}

function roundPoint(point: Point): Point {
  return {
    x: Number(point.x.toFixed(1)),
    y: Number(point.y.toFixed(1)),
  };
}

function hitProbesForBlock(block: typeof CHANGWON_BLOCKS[number]) {
  const subpaths = parsePathSubpaths(block.imageGeometry.d);
  return [
    {
      kind: 'LABEL_ANCHOR',
      point: {
        x: block.imageGeometry.labelX,
        y: block.imageGeometry.labelY,
      },
    },
    ...subpaths.map((subpath, index) => ({
      kind: `SUBPATH_REPRESENTATIVE_${index}`,
      point: roundPoint(representativePointForPolygon(subpath)),
    })),
  ];
}

function changwonGeometryReleaseLockFingerprint(): string {
  const payload = {
    blocks: CHANGWON_BLOCKS.map((block) => ({
      block: block.block,
      id: block.id,
      d: block.imageGeometry.d,
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      labelRotate: block.imageGeometry.labelRotate ?? null,
      labelFontSize: block.imageGeometry.labelFontSize ?? null,
      shortLabel: block.imageGeometry.shortLabel,
      hitStrokeWidth: block.imageGeometry.hitStrokeWidth ?? null,
      traceVersion: block.imageGeometry.traceVersion,
    })),
    references: Object.fromEntries(
      Object.entries(CHANGWON_OFFICIAL_TRACE_REFERENCE)
        .sort(([left], [right]) => left.localeCompare(right, 'ko'))
        .map(([block, reference]) => [block, reference]),
    ),
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

test('창원 좌석도 이미지는 공식 asset 준비 상태와 출처를 명시한다', () => {
  assert.equal(CHANGWON_SEATMAP_IMAGE.assetStatus, 'OFFICIAL');
  assert.equal(CHANGWON_SEATMAP_IMAGE.imagePath, 'src/assets/stadiums/nc/changwon-nc-seatmap-official-2026.png');
  assert.equal(CHANGWON_SEATMAP_IMAGE.requiredAssetFileName, 'changwon-nc-seatmap-official-2026.png');
  assert.equal(CHANGWON_SEATMAP_IMAGE.sourceLabel, 'NC 다이노스 공식 티켓 안내 좌석도');
  assert.equal(CHANGWON_SEATMAP_IMAGE.sourceUrl, 'https://www.ncdinos.com/dinos/stadium.do');
  assert.equal(CHANGWON_SEATMAP_IMAGE.imageWidth, 1960);
  assert.equal(CHANGWON_SEATMAP_IMAGE.imageHeight, 2546);
});

test('창원 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlocks = new Set<string>();

  CHANGWON_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    block.officialBlocks.forEach((officialBlock) => {
      assert.ok(!officialBlocks.has(officialBlock), `${officialBlock} official block should be unique`);
      officialBlocks.add(officialBlock);
    });
  });
});

test('창원 블록 데이터는 공식 이미지에서 보이는 전 블록과 특수 선택 구역 set과 정확히 일치한다', () => {
  const expected = [...CHANGWON_EXPECTED_VISIBLE_BLOCKS].sort();
  const actualNumbered = CHANGWON_BLOCKS
    .filter((block) => CHANGWON_EXPECTED_VISIBLE_BLOCKS.includes(block.block))
    .map((block) => block.block)
    .sort();
  const actualSelectable = CHANGWON_BLOCKS.map((block) => block.block).sort();

  assert.deepEqual(actualNumbered, expected);
  assert.deepEqual(actualSelectable, [...CHANGWON_EXPECTED_SELECTABLE_AREAS].sort());
  assert.equal(CHANGWON_BLOCKS.length, CHANGWON_EXPECTED_SELECTABLE_AREAS.length);
});

test('창원 traced geometry map은 전 선택 구역 set과 정확히 일치한다', () => {
  const expected = [...CHANGWON_EXPECTED_SELECTABLE_AREAS].sort();
  const actual = Object.keys(CHANGWON_IMAGE_GEOMETRY).sort();

  assert.deepEqual(actual, expected);
});

test('창원 공식 trace reference는 전 선택 구역 set과 정확히 일치한다', () => {
  const expected = [...CHANGWON_EXPECTED_SELECTABLE_AREAS].sort();
  const actual = Object.keys(CHANGWON_OFFICIAL_TRACE_REFERENCE).sort();

  assert.deepEqual(actual, expected);
});

test('창원 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  CHANGWON_BLOCKS.forEach((block) => {
    assert.ok(block.block, `${block.id} block should exist`);
    assert.ok(CHANGWON_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.fanRole, `${block.id} fan role should exist`);
    assert.ok(block.seatTypes.length > 0, `${block.id} seat types should exist`);
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.ok(block.officialBlocks.length > 0, `${block.id} official blocks should exist`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    assert.ok(block.imageGeometry.d.startsWith('M '), `${block.id} image geometry path should exist`);
    assert.equal(block.imageGeometry.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${block.id} should use traced official geometry`);
    assert.equal(block.imageGeometry.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${block.id} should use direct official-image path tracing`);
    assert.equal(block.imageGeometry.traceSource, 'OFFICIAL_PNG_MANUAL_POLYGON', `${block.id} should use manual official-PNG polygon source`);
    assert.equal(block.imageGeometry.traceVersion, 'manual-polygon-v2', `${block.id} should use the precision retrace version`);
    assert.equal(block.imageGeometry.manualReviewed, true, `${block.id} precision trace should be manually reviewed`);
    assert.equal(block.imageGeometry.pixelAlignmentStatus, 'PIXEL_ALIGNED', `${block.id} should be pixel aligned`);
    assert.ok(block.imageGeometry.manualReviewNote, `${block.id} should keep trace review note`);
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= CHANGWON_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= CHANGWON_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);

    const subpaths = parsePathSubpaths(block.imageGeometry.d);
    const labelPoint = { x: block.imageGeometry.labelX, y: block.imageGeometry.labelY };
    const reference = CHANGWON_OFFICIAL_TRACE_REFERENCE[block.block];
    const pathBounds = getPathBounds(subpaths);

    assert.ok(reference, `${block.id} trace reference should exist`);
    assert.equal(subpaths.length, reference.expectedSubpathCount, `${block.id} subpath count should match official trace reference`);
    assertWithinTolerance(block.imageGeometry.labelX, reference.numberAnchor.x, CHANGWON_TRACE_ANCHOR_TOLERANCE_PX, `${block.id} label x should match official number anchor`);
    assertWithinTolerance(block.imageGeometry.labelY, reference.numberAnchor.y, CHANGWON_TRACE_ANCHOR_TOLERANCE_PX, `${block.id} label y should match official number anchor`);
    assertWithinTolerance(pathBounds.minX, reference.expectedBounds.minX, CHANGWON_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} minX should match reference bbox`);
    assertWithinTolerance(pathBounds.minY, reference.expectedBounds.minY, CHANGWON_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} minY should match reference bbox`);
    assertWithinTolerance(pathBounds.maxX, reference.expectedBounds.maxX, CHANGWON_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} maxX should match reference bbox`);
    assertWithinTolerance(pathBounds.maxY, reference.expectedBounds.maxY, CHANGWON_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} maxY should match reference bbox`);

    assert.ok(subpaths.length > 0, `${block.id} image geometry should contain path coordinates`);
    assert.ok(subpaths.some((subpath) => isPointInPolygon(labelPoint, subpath)), `${block.id} label should sit inside its traced path`);

    subpaths.flat().forEach((point) => {
      assert.ok(point.x >= 0 && point.x <= CHANGWON_SEATMAP_IMAGE.imageWidth, `${block.id} path x ${point.x} should fit image bounds`);
      assert.ok(point.y >= 0 && point.y <= CHANGWON_SEATMAP_IMAGE.imageHeight, `${block.id} path y ${point.y} should fit image bounds`);
    });
  });
});

test('창원 trace reference bbox와 공식 숫자 anchor는 이미지 bounds 안에 있다', () => {
  Object.entries(CHANGWON_OFFICIAL_TRACE_REFERENCE).forEach(([block, reference]) => {
    assert.ok(reference.numberAnchor.x >= 0 && reference.numberAnchor.x <= CHANGWON_SEATMAP_IMAGE.imageWidth, `${block} anchor x should fit image bounds`);
    assert.ok(reference.numberAnchor.y >= 0 && reference.numberAnchor.y <= CHANGWON_SEATMAP_IMAGE.imageHeight, `${block} anchor y should fit image bounds`);
    assert.ok(reference.expectedBounds.minX >= 0 && reference.expectedBounds.minX <= CHANGWON_SEATMAP_IMAGE.imageWidth, `${block} minX should fit image bounds`);
    assert.ok(reference.expectedBounds.maxX >= 0 && reference.expectedBounds.maxX <= CHANGWON_SEATMAP_IMAGE.imageWidth, `${block} maxX should fit image bounds`);
    assert.ok(reference.expectedBounds.minY >= 0 && reference.expectedBounds.minY <= CHANGWON_SEATMAP_IMAGE.imageHeight, `${block} minY should fit image bounds`);
    assert.ok(reference.expectedBounds.maxY >= 0 && reference.expectedBounds.maxY <= CHANGWON_SEATMAP_IMAGE.imageHeight, `${block} maxY should fit image bounds`);
    assert.ok(reference.expectedBounds.maxX > reference.expectedBounds.minX, `${block} reference bbox should have width`);
    assert.ok(reference.expectedBounds.maxY > reference.expectedBounds.minY, `${block} reference bbox should have height`);
  });
});

test('창원 traced geometry는 공식 PNG 좌석 색상 영역과 겹친다', async () => {
  const image = await readOfficialSeatmapPixels();

  Object.entries(CHANGWON_IMAGE_GEOMETRY).forEach(([block, geometry]) => {
    const overlapRatio = calculateSeatColorOverlapRatio(image, geometry.d);
    assert.ok(
      overlapRatio >= 0.82,
      `${block} should tightly overlap official colored seat pixels. Actual ratio: ${overlapRatio.toFixed(2)}`,
    );
  });
});

test('창원 traced geometry는 외부 label anchor와 비허용 multi-path를 포함하지 않는다', () => {
  const multiPathAllowList = new Set([
    '101',
    '102',
    '103',
    '104',
    '112',
    '113',
    '114',
    '122',
    '123',
    '124',
    '125',
    '1루 바베큐석',
    '1루 라운드 테이블석',
    '1루 테이블석',
    '외야 카운터석',
    '외야 가족석',
  ]);
  const labels = CHANGWON_BLOCKS.map((block) => ({
    block: block.block,
    point: {
      x: block.imageGeometry.labelX,
      y: block.imageGeometry.labelY,
    },
  }));

  CHANGWON_BLOCKS.forEach((block) => {
    const subpaths = parsePathSubpaths(block.imageGeometry.d);
    const bounds = getPathBounds(subpaths);
    const area = geometryArea(subpaths);
    const foreignLabelAnchors = labels
      .filter((label) => label.block !== block.block)
      .filter((label) => subpaths.some((subpath) => isPointInPolygon(label.point, subpath)))
      .map((label) => label.block);

    assert.equal(foreignLabelAnchors.length, 0, `${block.block} should not contain foreign label anchors: ${foreignLabelAnchors.join(', ')}`);
    assert.ok(bounds.maxX - bounds.minX >= 18, `${block.block} bbox width should be at least 18px`);
    assert.ok(bounds.maxY - bounds.minY >= 18, `${block.block} bbox height should be at least 18px`);
    assert.ok(area >= 300, `${block.block} polygon area should be at least 300px²`);

    if (multiPathAllowList.has(block.block)) {
      assert.ok(subpaths.length >= 2, `${block.block} should keep reviewed multi-path geometry`);
    } else {
      assert.equal(subpaths.length, 1, `${block.block} should not use multi-path geometry`);
    }
  });
});

test('창원 traced geometry는 self-intersection과 의미 있는 polygon overlap이 없다', () => {
  const geometries = CHANGWON_BLOCKS.map((block) => ({
    block: block.block,
    d: block.imageGeometry.d,
    subpaths: parsePathSubpaths(block.imageGeometry.d),
  }));

  geometries.forEach((geometry) => {
    geometry.subpaths.forEach((subpath) => {
      assert.equal(hasSelfIntersection(subpath), false, `${geometry.block} should not self-intersect`);
    });
  });

  for (let first = 0; first < geometries.length; first += 1) {
    for (let second = first + 1; second < geometries.length; second += 1) {
      const overlapRatio = calculateSampledOverlapRatio(geometries[first].d, geometries[second].d);
      assert.ok(
        overlapRatio <= 0.005,
        `${geometries[first].block}-${geometries[second].block} overlap ratio should stay <= 0.5%. Actual ratio: ${overlapRatio.toFixed(3)}`,
      );
    }
  }
});

test('창원 production geometry는 scaled template 생성 경로 없이 직접 추적 path만 사용한다', () => {
  const source = fs.readFileSync(new URL('./changwonSeatData.ts', import.meta.url), 'utf8');

  assert.ok(source.includes('CHANGWON_PRECISION_IMAGE_GEOMETRY_ENTRIES'));
  assert.ok(source.includes('manual-polygon-v2'));
  assert.ok(source.includes('OFFICIAL_PNG_MANUAL_POLYGON'));
  assert.ok(!source.includes('scaleTemplatePath'));
  assert.ok(!source.includes('CHANGWON_GEOMETRY_PATH_TEMPLATES'));
  assert.ok(!source.includes('CHANGWON_GEOMETRY_OVERRIDES'));
  assert.equal(
    Object.values(CHANGWON_IMAGE_GEOMETRY).filter((geometry) => geometry.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length,
    CHANGWON_EXPECTED_SELECTABLE_AREAS.length,
  );
  assert.equal(Object.values(CHANGWON_IMAGE_GEOMETRY).filter((geometry) => geometry.manualReviewed).length, CHANGWON_EXPECTED_SELECTABLE_AREAS.length);
  assert.equal(Object.values(CHANGWON_IMAGE_GEOMETRY).filter((geometry) => geometry.traceSource === 'OFFICIAL_PNG_MANUAL_POLYGON').length, CHANGWON_EXPECTED_SELECTABLE_AREAS.length);
  assert.equal(Object.values(CHANGWON_IMAGE_GEOMETRY).filter((geometry) => geometry.traceVersion === 'manual-polygon-v2').length, CHANGWON_EXPECTED_SELECTABLE_AREAS.length);
  assert.equal(
    Object.values(CHANGWON_IMAGE_GEOMETRY).filter((geometry) => geometry.pixelAlignmentStatus === 'PIXEL_ALIGNED').length,
    CHANGWON_EXPECTED_SELECTABLE_AREAS.length,
  );
});

test('창원 release-lock 좌표 fingerprint는 UX 작업 중 변경되지 않는다', () => {
  assert.equal(
    changwonGeometryReleaseLockFingerprint(),
    '1b3e4d22d446ba5eede5102aa746f992851d2a5083671db3c541b06c0e96ee3b',
  );
});

test('창원 블록 alias는 숫자 블록명과 N블록 형태를 포함한다', () => {
  CHANGWON_BLOCKS
    .filter((block) => CHANGWON_EXPECTED_VISIBLE_BLOCKS.includes(block.block))
    .forEach((block) => {
    assert.ok(block.seatViewSections.includes(block.block), `${block.id} aliases should include numeric block`);
    assert.ok(block.seatViewSections.includes(`${block.block}블록`), `${block.id} aliases should include N블록`);
  });

  CHANGWON_SPECIAL_SELECTABLE_AREAS.forEach((area) => {
    const block = CHANGWON_BLOCKS.find((entry) => entry.block === area);

    assert.ok(block, `${area} special selectable area should exist`);
    assert.ok(block.seatViewSections.includes(area), `${area} aliases should include official special area name`);
  });
});

test('창원 특수 선택 구역 표시명은 같은 이름을 중복하지 않는다', () => {
  CHANGWON_SPECIAL_SELECTABLE_AREAS.forEach((area) => {
    const block = CHANGWON_BLOCKS.find((entry) => entry.block === area);

    assert.ok(block, `${area} special selectable area should exist`);
    assert.equal(getChangwonBlockDisplayName(block), area);
  });

  const numericBlock = CHANGWON_BLOCKS.find((entry) => entry.block === '101');

  assert.ok(numericBlock, '101 block should exist');
  assert.equal(getChangwonBlockDisplayName(numericBlock), '101 1루 프리미엄석');
});

test('창원 특수 선택 구역 label anchor는 서로 충돌하지 않는다', () => {
  const specialBlocks = CHANGWON_SPECIAL_SELECTABLE_AREAS.map((area) => {
    const block = CHANGWON_BLOCKS.find((entry) => entry.block === area);

    assert.ok(block, `${area} special selectable area should exist`);
    return block;
  });

  for (let first = 0; first < specialBlocks.length; first += 1) {
    for (let second = first + 1; second < specialBlocks.length; second += 1) {
      const firstGeometry = specialBlocks[first].imageGeometry;
      const secondGeometry = specialBlocks[second].imageGeometry;
      const distance = Math.hypot(firstGeometry.labelX - secondGeometry.labelX, firstGeometry.labelY - secondGeometry.labelY);

      assert.ok(
        distance >= 48,
        `${specialBlocks[first].block}-${specialBlocks[second].block} special label anchors should stay separated. Actual: ${distance.toFixed(1)}px`,
      );
    }
  }
});

test('창원 모든 선택 구역 label anchor는 자기 block을 최상위 hit-area로 가진다', () => {
  CHANGWON_BLOCKS.forEach((block) => {
    assert.equal(
      topRenderedHitBlockAt({ x: block.imageGeometry.labelX, y: block.imageGeometry.labelY }),
      block.block,
      `${block.block} label anchor should resolve to its own rendered hit-area`,
    );
  });
});

test('창원 모든 선택 구역 대표 probe는 자기 block을 최상위 hit-area로 가진다', () => {
  CHANGWON_BLOCKS.forEach((block) => {
    const subpaths = parsePathSubpaths(block.imageGeometry.d);
    const probes = hitProbesForBlock(block);

    assert.ok(probes.length >= 2, `${block.block} should have at least label and representative probes`);
    assert.equal(probes.length, subpaths.length + 1, `${block.block} should have one representative probe per subpath`);

    probes.forEach((probe) => {
      assert.equal(
        topRenderedHitBlockAt(probe.point),
        block.block,
        `${block.block} ${probe.kind} probe ${probe.point.x},${probe.point.y} should resolve to its own rendered hit-area`,
      );
    });
  });
});

test('창원 특수 선택 구역 hit-area는 다른 label anchor를 가로채지 않는다', () => {
  const labels = CHANGWON_BLOCKS.map((block) => ({
    block: block.block,
    point: {
      x: block.imageGeometry.labelX,
      y: block.imageGeometry.labelY,
    },
  }));

  CHANGWON_SPECIAL_SELECTABLE_AREAS.forEach((area) => {
    const specialBlock = CHANGWON_BLOCKS.find((block) => block.block === area);

    assert.ok(specialBlock, `${area} special selectable area should exist`);

    const interceptedLabels = labels
      .filter((label) => label.block !== area)
      .filter((label) => isPointInRenderedHitArea(specialBlock, label.point))
      .map((label) => label.block);

    assert.deepEqual(interceptedLabels, [], `${area} hit-area should not intercept other label anchors`);
  });
});

test('창원 1루 바베큐석 hit-area는 301-315 label top-hit를 가로채지 않는다', () => {
  const bbqBlock = CHANGWON_BLOCKS.find((block) => block.block === '1루 바베큐석');

  assert.ok(bbqBlock, '1루 바베큐석 special selectable area should exist');
  assert.equal(
    topRenderedHitBlockAt({ x: bbqBlock.imageGeometry.labelX, y: bbqBlock.imageGeometry.labelY }),
    '1루 바베큐석',
    '1루 바베큐석 label anchor should still select the special area',
  );

  CHANGWON_BLOCKS
    .filter((block) => {
      const blockNumber = Number(block.block);
      return blockNumber >= 301 && blockNumber <= 315;
    })
    .forEach((block) => {
      assert.equal(
        topRenderedHitBlockAt({ x: block.imageGeometry.labelX, y: block.imageGeometry.labelY }),
        block.block,
        `${block.block} label anchor should not be intercepted by 1루 바베큐석 expanded hit-area`,
      );
    });
});

test('창원 multi-path 블록은 중복 record 없이 하나의 블록으로 유지된다', () => {
  ['101', '102', '103', '104', '112', '113', '114', '122', '123', '124', '125'].forEach((blockNumber) => {
    const matches = CHANGWON_BLOCKS.filter((block) => block.block === blockNumber);
    const block = matches[0];

    assert.equal(matches.length, 1, `${blockNumber} should have one record`);
    assert.ok((block.imageGeometry.d.match(/M /g) ?? []).length >= 2, `${blockNumber} should use multi-path geometry`);

    if (Number(blockNumber) >= 101 && Number(blockNumber) <= 104) {
      assert.ok(block.seatTypes.includes('프리미엄석'), `${blockNumber} should keep premium seat type`);
      return;
    }

    if (Number(blockNumber) >= 112 && Number(blockNumber) <= 114) {
      assert.ok(block.seatTypes.includes('프리미엄 테이블석'), `${blockNumber} should include premium table seat type`);
      assert.ok(block.seatTypes.includes('내야석'), `${blockNumber} should include infield seat type`);
      return;
    }

    if (Number(blockNumber) >= 122 && Number(blockNumber) <= 124) {
      assert.ok(block.seatTypes.includes('원정 응원석'), `${blockNumber} should include away cheering seat type`);
      return;
    }

    assert.ok(block.seatTypes.includes('내야석'), `${blockNumber} should include infield seat type`);
  });
});

test('창원 분리 프리미엄 component는 해당 블록 hit-area에 포함된다', () => {
  const splitComponentProbes = [
    ['101', { x: 1420, y: 730 }],
    ['102', { x: 1420, y: 785 }],
    ['103', { x: 1420, y: 840 }],
    ['104', { x: 1420, y: 920 }],
    ['122', { x: 535, y: 920 }],
    ['123', { x: 535, y: 840 }],
    ['124', { x: 535, y: 785 }],
    ['125', { x: 535, y: 730 }],
  ] as const;

  splitComponentProbes.forEach(([blockNumber, probe]) => {
    const geometry = CHANGWON_IMAGE_GEOMETRY[blockNumber];
    const subpaths = parsePathSubpaths(geometry.d);

    assert.ok(
      subpaths.some((subpath) => isPointInPolygon(probe, subpath)),
      `${blockNumber} should include separated premium component probe ${probe.x},${probe.y}`,
    );
  });
});

test('창원 블록 데이터는 대표 블록 alias를 유지한다', () => {
  const block105 = CHANGWON_BLOCKS.find((block) => block.block === '105');
  const block112 = CHANGWON_BLOCKS.find((block) => block.block === '112');
  const block126 = CHANGWON_BLOCKS.find((block) => block.block === '126');
  const block128 = CHANGWON_BLOCKS.find((block) => block.block === '128');
  const block129 = CHANGWON_BLOCKS.find((block) => block.block === '129');
  const block201 = CHANGWON_BLOCKS.find((block) => block.block === '201');
  const block433 = CHANGWON_BLOCKS.find((block) => block.block === '433');

  assert.ok(block105?.seatViewSections.includes('내야 응원석'));
  assert.ok(block112?.seatViewSections.includes('포수 후면'));
  assert.ok(block126?.seatViewSections.includes('바베큐석'));
  assert.ok(block128?.seatViewSections.includes('불펜 가족석'));
  assert.ok(block129?.seatViewSections.includes('외야 잔디석'));
  assert.ok(block201?.seatViewSections.includes('2층 1루 내야석'));
  assert.equal(block433?.name, '4층 내야석');
});

test('창원 검색 헬퍼는 숫자 블록, 특수 구역, 좌석 타입, alias를 모두 검색 대상으로 둔다', () => {
  assert.equal(normalizeChangwonSeatMapSearchText(' 1루 바베큐 '), '1루바베큐');

  const block125 = CHANGWON_BLOCKS.find((block) => block.block === '125');
  const specialBbq = CHANGWON_BLOCKS.find((block) => block.block === '1루 바베큐석');

  assert.ok(block125, '125 block should exist');
  assert.ok(specialBbq, '1루 바베큐석 special area should exist');

  const block125Tokens = getChangwonSeatMapSearchTokens(block125);
  assert.ok(block125Tokens.includes('125'));
  assert.ok(block125Tokens.includes('125블록'));
  assert.ok(block125Tokens.includes(normalizeChangwonSeatMapSearchText('125 3루 내야석')));
  assert.ok(block125Tokens.includes(normalizeChangwonSeatMapSearchText('내야석')));

  const specialTokens = getChangwonSeatMapSearchTokens(specialBbq);
  assert.ok(isChangwonSpecialSelectableArea(specialBbq));
  assert.ok(specialTokens.includes(normalizeChangwonSeatMapSearchText('1루 바베큐석')));
  assert.ok(specialTokens.includes(normalizeChangwonSeatMapSearchText('NC파크 1루 바베큐석')));
  assert.ok(specialTokens.includes(normalizeChangwonSeatMapSearchText('특수 구역')));

  CHANGWON_BLOCKS.forEach((block) => {
    const tokens = getChangwonSeatMapSearchTokens(block);
    assert.ok(tokens.includes(normalizeChangwonSeatMapSearchText(block.block)), `${block.block} search tokens should include block/name`);
    block.seatTypes.forEach((seatType) => {
      assert.ok(tokens.includes(normalizeChangwonSeatMapSearchText(seatType)), `${block.block} search tokens should include seat type ${seatType}`);
    });
    block.seatViewSections.forEach((section) => {
      assert.ok(tokens.includes(normalizeChangwonSeatMapSearchText(section)), `${block.block} search tokens should include seat view alias ${section}`);
    });
  });

  assert.equal(searchChangwonSeatMapBlocks('125')[0]?.block, '125');
  assert.ok(searchChangwonSeatMapBlocks('바베큐').some((block) => block.block === '1루 바베큐석'));
  assert.ok(searchChangwonSeatMapBlocks('바베큐').some((block) => block.block === '126'));
  assert.ok(searchChangwonSeatMapBlocks('휠체어').some((block) => block.block === '105'));
  assert.deepEqual(searchChangwonSeatMapBlocks('존재하지않는구역'), []);
});

test('창원 필터 그룹은 선택 가능 영역 count와 특수 구역 membership을 고정한다', () => {
  const allGroup = CHANGWON_CATEGORY_GROUPS.find((group) => group.id === 'all');
  const specialGroup = CHANGWON_CATEGORY_GROUPS.find((group) => group.id === 'outfield-special');
  const accessibleGroup = CHANGWON_CATEGORY_GROUPS.find((group) => group.id === 'accessible');

  assert.ok(allGroup, 'all filter should exist');
  assert.ok(specialGroup, 'outfield-special filter should exist');
  assert.ok(accessibleGroup, 'accessible filter should exist');

  assert.equal(CHANGWON_BLOCKS.filter((block) => isChangwonBlockInCategoryGroup(block, allGroup)).length, 123);
  assert.ok(CHANGWON_BLOCKS.filter((block) => isChangwonBlockInCategoryGroup(block, accessibleGroup)).length > 0);

  CHANGWON_SPECIAL_SELECTABLE_AREAS.forEach((area) => {
    const block = CHANGWON_BLOCKS.find((candidate) => candidate.block === area);
    assert.ok(block, `${area} special area should exist`);
    assert.equal(isChangwonSpecialSelectableArea(block), true);
    assert.equal(isChangwonBlockInCategoryGroup(block, specialGroup), true, `${area} should be visible in outfield-special filter`);
  });
});

test('창원 low coverage 승인 예외 목록은 release lock 수치와 일치한다', () => {
  assert.deepEqual(
    CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS,
    ['113', '125', '129', '137', '326', '412', '426', '428'],
  );
});

test('창원 좌석도 label helper는 UI 표시 문구를 제공한다', () => {
  assert.equal(getChangwonSideLabel('FIRST_BASE'), '1루');
  assert.equal(getChangwonSideLabel('THIRD_BASE'), '3루');
  assert.equal(getChangwonSideLabel('CENTER'), '중앙');
  assert.equal(getChangwonLevelLabel('1F'), '1층');
  assert.equal(getChangwonLevelLabel('OUTFIELD'), '외야');
  assert.equal(getChangwonFanRoleLabel('HOME'), '홈 응원');
  assert.equal(getChangwonFanRoleLabel('AWAY'), '원정 응원');
  assert.equal(getChangwonSourceLabel('OFFICIAL'), '공식 확인');
  assert.equal(getChangwonSourceLabel('UNVERIFIED'), '공식 확인 필요');
});
