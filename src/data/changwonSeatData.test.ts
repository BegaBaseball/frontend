import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  CHANGWON_BLOCKS,
  CHANGWON_CATEGORIES,
  CHANGWON_EXPECTED_VISIBLE_BLOCKS,
  CHANGWON_IMAGE_GEOMETRY,
  CHANGWON_OFFICIAL_TRACE_REFERENCE,
  CHANGWON_SEATMAP_IMAGE,
  CHANGWON_TRACE_ANCHOR_TOLERANCE_PX,
  CHANGWON_TRACE_BOUNDS_TOLERANCE_PX,
  getChangwonFanRoleLabel,
  getChangwonSideLabel,
  getChangwonSourceLabel,
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

function blockRange(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
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

test('창원 블록 데이터는 공식 이미지에서 보이는 전 블록 set과 정확히 일치한다', () => {
  const expected = [...CHANGWON_EXPECTED_VISIBLE_BLOCKS].sort();
  const actual = CHANGWON_BLOCKS.map((block) => block.block).sort();

  assert.deepEqual(actual, expected);
  assert.equal(CHANGWON_BLOCKS.length, 117);
});

test('창원 traced geometry map은 전 블록 set과 정확히 일치한다', () => {
  const expected = [...CHANGWON_EXPECTED_VISIBLE_BLOCKS].sort();
  const actual = Object.keys(CHANGWON_IMAGE_GEOMETRY).sort();

  assert.deepEqual(actual, expected);
});

test('창원 공식 trace reference는 전 블록 set과 정확히 일치한다', () => {
  const expected = [...CHANGWON_EXPECTED_VISIBLE_BLOCKS].sort();
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
  const strictReviewBlocks = new Set([
    ...blockRange(321, 333),
    ...blockRange(401, 408),
    '420',
    ...blockRange(422, 429),
    ...blockRange(431, 433),
  ]);

  Object.entries(CHANGWON_IMAGE_GEOMETRY).forEach(([block, geometry]) => {
    const overlapRatio = calculateSeatColorOverlapRatio(image, geometry.d);
    assert.ok(
      overlapRatio >= 0.25,
      `${block} should overlap official colored seat pixels. Actual ratio: ${overlapRatio.toFixed(2)}`,
    );

    if (strictReviewBlocks.has(block)) {
      assert.ok(
        overlapRatio >= 0.5,
        `${block} reviewed trace should strongly overlap official colored seat pixels. Actual ratio: ${overlapRatio.toFixed(2)}`,
      );
    }
  });
});

test('창원 블록 alias는 숫자 블록명과 N블록 형태를 포함한다', () => {
  CHANGWON_BLOCKS.forEach((block) => {
    assert.ok(block.seatViewSections.includes(block.block), `${block.id} aliases should include numeric block`);
    assert.ok(block.seatViewSections.includes(`${block.block}블록`), `${block.id} aliases should include N블록`);
  });
});

test('창원 multi-path 블록은 중복 record 없이 하나의 블록으로 유지된다', () => {
  ['112', '113', '114'].forEach((blockNumber) => {
    const matches = CHANGWON_BLOCKS.filter((block) => block.block === blockNumber);
    const block = matches[0];

    assert.equal(matches.length, 1, `${blockNumber} should have one record`);
    assert.ok(block.seatTypes.includes('프리미엄 테이블석'), `${blockNumber} should include premium table seat type`);
    assert.ok(block.seatTypes.includes('내야석'), `${blockNumber} should include infield seat type`);
    assert.ok((block.imageGeometry.d.match(/M /g) ?? []).length >= 2, `${blockNumber} should use multi-path geometry`);
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

test('창원 좌석도 label helper는 UI 표시 문구를 제공한다', () => {
  assert.equal(getChangwonSideLabel('FIRST_BASE'), '1루');
  assert.equal(getChangwonSideLabel('THIRD_BASE'), '3루');
  assert.equal(getChangwonSideLabel('CENTER'), '중앙');
  assert.equal(getChangwonFanRoleLabel('HOME'), '홈 응원');
  assert.equal(getChangwonFanRoleLabel('AWAY'), '원정 응원');
  assert.equal(getChangwonSourceLabel('OFFICIAL'), '공식 확인');
  assert.equal(getChangwonSourceLabel('UNVERIFIED'), '공식 확인 필요');
});
