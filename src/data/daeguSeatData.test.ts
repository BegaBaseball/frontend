import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DAEGU_BLOCKS,
  DAEGU_CATEGORIES,
  DAEGU_CATEGORY_GROUPS,
  DAEGU_REQUIRED_OFFICIAL_SECTIONS,
  DAEGU_SEATMAP_IMAGE,
  DAEGU_SEATMAP_VIEWPORT,
  getDaeguTraceMethodLabel,
  getDaeguTraceStatusLabel,
} from './daeguSeatData';

const REQUIRED_CORE_CATEGORIES = [
  'VIP',
  'TABLE',
  'BLUE',
  'EXCITING',
  'INFIELD',
  'SKY',
  'OUTFIELD',
  'AWAY',
  'ACCESSIBLE',
  'SWEETBOX',
  'PARTY',
];
const OFFICIAL_SOURCE_URL = 'https://www.samsunglions.com/score/score_4_2_1.asp';
const OFFICIAL_ASSET_URL = new URL('../assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png', import.meta.url);
type Point = [number, number];

function pngDimensions(assetUrl: URL) {
  const buffer = readFileSync(assetUrl);
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function pathPoints(path: string) {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: Point[] = [];
  for (let index = 0; index < numbers.length; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
}

function geometryPaths(block: (typeof DAEGU_BLOCKS)[number]) {
  return block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d];
}

function polygonArea(points: Point[]) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0) / 2);
}

function blockArea(block: (typeof DAEGU_BLOCKS)[number]) {
  return geometryPaths(block).reduce((sum, path) => sum + polygonArea(pathPoints(path)), 0);
}

function distanceToSegment(point: Point, start: Point, end: Point) {
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
}

function pointOnPolygonBoundary(point: Point, polygon: Point[], tolerance = 0.75) {
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (distanceToSegment(point, start, end) <= tolerance) return true;
  }

  return false;
}

function pointInPolygon(point: Point, polygon: Point[]) {
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
}

function pointInBlockPath(point: Point, block: (typeof DAEGU_BLOCKS)[number]) {
  return geometryPaths(block).some((path) => pointInPolygon(point, pathPoints(path)));
}

function topHitBlockAt(point: Point) {
  let topBlock: (typeof DAEGU_BLOCKS)[number] | null = null;

  [...DAEGU_BLOCKS]
    .sort((a, b) => blockArea(b) - blockArea(a))
    .forEach((block) => {
      if (pointInBlockPath(point, block)) {
        topBlock = block;
      }
    });

  return topBlock;
}

function orientation(a: Point, b: Point, c: Point) {
  const value = ((b[0] - a[0]) * (c[1] - a[1])) - ((b[1] - a[1]) * (c[0] - a[0]));
  return Math.sign(value);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return Boolean(o1 && o2 && o3 && o4 && o1 !== o2 && o3 !== o4);
}

function hasSelfIntersection(points: Point[]) {
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) {
      const adjacent = Math.abs(index - nextIndex) <= 1 || (index === 0 && nextIndex === points.length - 1);
      if (adjacent) continue;
      const c = points[nextIndex];
      const d = points[(nextIndex + 1) % points.length];
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

test('대구 좌석도 asset 상태는 공식 파일 준비 여부를 명시한다', () => {
  assert.equal(DAEGU_SEATMAP_IMAGE.imagePath, 'src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png');
  assert.equal(DAEGU_SEATMAP_IMAGE.requiredAssetFileName, 'daegu-samsung-seatmap-official-2026.png');
  assert.ok(DAEGU_SEATMAP_IMAGE.sourceLabel);
  assert.equal(DAEGU_SEATMAP_IMAGE.sourceUrl, OFFICIAL_SOURCE_URL);

  if (DAEGU_SEATMAP_IMAGE.assetStatus === 'OFFICIAL') {
    assert.equal(DAEGU_SEATMAP_IMAGE.imageWidth, 1707);
    assert.equal(DAEGU_SEATMAP_IMAGE.imageHeight, 2048);
  } else {
    assert.equal(DAEGU_SEATMAP_IMAGE.assetStatus, 'MANUAL_BASEBALL_DATA_REQUIRED');
    assert.equal(DAEGU_SEATMAP_IMAGE.imageWidth, 0);
    assert.equal(DAEGU_SEATMAP_IMAGE.imageHeight, 0);
    assert.equal(DAEGU_BLOCKS.length, 0);
  }
});

test('대구 공식 PNG 실제 크기는 데이터 좌표계와 일치한다', () => {
  const dimensions = pngDimensions(OFFICIAL_ASSET_URL);
  assert.equal(dimensions.width, 1707);
  assert.equal(dimensions.height, 2048);
  assert.equal(dimensions.width, DAEGU_SEATMAP_IMAGE.imageWidth);
  assert.equal(dimensions.height, DAEGU_SEATMAP_IMAGE.imageHeight);
});

test('대구 좌석 카테고리는 공식 좌석도 입력 대기 상태에서도 핵심 구역명을 보존한다', () => {
  REQUIRED_CORE_CATEGORIES.forEach((category) => {
    assert.ok(DAEGU_CATEGORIES[category], `${category} category should be defined`);
  });

  DAEGU_REQUIRED_OFFICIAL_SECTIONS.forEach((label) => {
    assert.ok(Object.values(DAEGU_CATEGORIES).some((category) => category.label === label), `${label} label should be defined`);
  });

  assert.ok(DAEGU_CATEGORY_GROUPS.some((group) => group.id === 'cheer' && group.cats?.includes('BLUE')));
  assert.ok(DAEGU_CATEGORY_GROUPS.some((group) => group.id === 'premium' && group.cats?.includes('VIP')));
  assert.ok(DAEGU_CATEGORY_GROUPS.some((group) => group.id === 'accessible' && group.cats?.includes('ACCESSIBLE')));
});

test('대구 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlocks = new Set<string>();

  DAEGU_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    block.officialBlocks.forEach((officialBlock) => {
      assert.ok(!officialBlocks.has(officialBlock), `${officialBlock} official block should be unique`);
      officialBlocks.add(officialBlock);
    });
  });
});

test('대구 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  const viewportRight = DAEGU_SEATMAP_VIEWPORT.x + DAEGU_SEATMAP_VIEWPORT.width;
  const viewportBottom = DAEGU_SEATMAP_VIEWPORT.y + DAEGU_SEATMAP_VIEWPORT.height;

  if (DAEGU_SEATMAP_IMAGE.assetStatus === 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 177);
  }

  DAEGU_BLOCKS.forEach((block) => {
    assert.ok(DAEGU_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.ok(block.traceStatus === 'OFFICIAL_IMAGE_TRACED' || block.traceStatus === 'NEEDS_OPERATOR_REVIEW', `${block.id} trace status should be explicit`);
    assert.ok(
      block.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
      || block.traceMethod === 'LEGACY_SCALED_POLYGON'
      || block.traceMethod === 'PIXEL_COMPONENT_CANDIDATE'
      || block.traceMethod === 'TODO_UNMEASURED',
      `${block.id} trace method should be explicit`,
    );
    assert.ok(block.reviewNote, `${block.id} review note should exist`);
    assert.equal(
      block.sourceConfidence,
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 'OFFICIAL' : 'UNVERIFIED',
      `${block.id} source confidence should follow trace status`,
    );
    if (block.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
      assert.equal(block.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${block.id} official trace should use direct official-image path tracing`);
    } else {
      assert.match(block.reviewNote, /검수|REVIEW|확인|대조/, `${block.id} unverified trace should keep review guidance`);
    }
    assert.ok(block.officialBlocks.length > 0, `${block.id} official blocks should exist`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    ['대구', '삼성', '라팍', block.block, block.name].forEach((alias) => {
      assert.ok(block.seatViewSections.includes(alias), `${block.id} aliases should include ${alias}`);
    });
    const geometryPaths = block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d];
    assert.ok(geometryPaths.length > 0, `${block.id} image geometry path should exist`);
    geometryPaths.forEach((path) => {
      assert.ok(path.startsWith('M '), `${block.id} image geometry path should exist`);
      assert.ok(path.trim().endsWith('Z'), `${block.id} image geometry path should be closed`);
    });
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= DAEGU_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= DAEGU_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);
    assert.ok(block.imageGeometry.labelX >= DAEGU_SEATMAP_VIEWPORT.x && block.imageGeometry.labelX <= viewportRight, `${block.id} label x should fit viewport`);
    assert.ok(block.imageGeometry.labelY >= DAEGU_SEATMAP_VIEWPORT.y && block.imageGeometry.labelY <= viewportBottom, `${block.id} label y should fit viewport`);

    geometryPaths.forEach((path) => {
      const pathNumbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      assert.ok(pathNumbers.length >= 12, `${block.id} image geometry should contain at least 6 polygon points`);
      assert.ok(!hasSelfIntersection(pathPoints(path)), `${block.id} image geometry should not self-intersect`);
      pathNumbers.forEach((coordinate, index) => {
        const limit = index % 2 === 0 ? DAEGU_SEATMAP_IMAGE.imageWidth : DAEGU_SEATMAP_IMAGE.imageHeight;
        assert.ok(coordinate >= 0 && coordinate <= limit, `${block.id} path coordinate ${coordinate} should fit image bounds`);
        const viewportMin = index % 2 === 0 ? DAEGU_SEATMAP_VIEWPORT.x : DAEGU_SEATMAP_VIEWPORT.y;
        const viewportMax = index % 2 === 0 ? viewportRight : viewportBottom;
        assert.ok(coordinate >= viewportMin && coordinate <= viewportMax, `${block.id} path coordinate ${coordinate} should fit viewport`);
      });
    });
  });
});

test('대구 공식 좌석도 polygon은 4점 사각형 일괄 회귀를 허용하지 않는다', () => {
  if (DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 0, 'manual-required state should not expose synthesized hit areas');
    return;
  }

  const pointCounts = DAEGU_BLOCKS.flatMap((block) => {
    const geometryPaths = block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d];
    return geometryPaths.map((path) => (path.match(/-?\d+(?:\.\d+)?/g)?.length ?? 0) / 2);
  });
  const fourPointPolygons = pointCounts.filter((count) => count <= 4);
  const detailedPolygons = pointCounts.filter((count) => count >= 8);

  assert.equal(fourPointPolygons.length, 0, 'official Daegu hit areas should not regress to 4-point rectangles');
  assert.ok(detailedPolygons.length >= 160, `expected most Daegu hit areas to use detailed polygons, got ${detailedPolygons.length}`);
});

test('대구 공식 트레이싱 블록은 label 좌표에서 자기 자신으로 선택된다', () => {
  if (DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 0, 'manual-required state should not expose synthesized hit areas');
    return;
  }

  const officialBlocks = DAEGU_BLOCKS.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED');
  assert.ok(officialBlocks.length > 0, 'Daegu should keep at least one locked official traced block');

  officialBlocks.forEach((block) => {
    const labelPoint: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];
    assert.ok(pointInBlockPath(labelPoint, block), `${block.id} label should stay inside its current path`);
    assert.equal(
      topHitBlockAt(labelPoint)?.id,
      block.id,
      `${block.id} label top-hit should resolve to itself`,
    );
  });
});

test('대구 좌석도 viewport는 좌표 보정 중 전체 공식 이미지 좌표계를 사용한다', () => {
  assert.equal(DAEGU_SEATMAP_VIEWPORT.x, 0);
  assert.equal(DAEGU_SEATMAP_VIEWPORT.y, 0);
  assert.equal(DAEGU_SEATMAP_VIEWPORT.width, DAEGU_SEATMAP_IMAGE.imageWidth);
  assert.equal(DAEGU_SEATMAP_VIEWPORT.height, DAEGU_SEATMAP_IMAGE.imageHeight);
  assert.equal(DAEGU_SEATMAP_VIEWPORT.padding, 0);
});

test('대구 좌석도 trace 상태와 방식은 UI에서 표시 가능한 라벨을 가진다', () => {
  assert.equal(getDaeguTraceStatusLabel('OFFICIAL_IMAGE_TRACED'), '공식 이미지 트레이싱 완료');
  assert.equal(getDaeguTraceStatusLabel('NEEDS_OPERATOR_REVIEW'), '운영자 좌표 검수 필요');
  assert.equal(getDaeguTraceMethodLabel('PATH_TRACED_FROM_OFFICIAL_IMAGE'), '공식 PNG 직접 트레이싱');
  assert.equal(getDaeguTraceMethodLabel('LEGACY_SCALED_POLYGON'), '기존 좌표계 변환 polygon');
  assert.equal(getDaeguTraceMethodLabel('PIXEL_COMPONENT_CANDIDATE'), '공식 PNG 픽셀 후보');
  assert.equal(getDaeguTraceMethodLabel('TODO_UNMEASURED'), '직접 측정 전 TODO');
});

test('대구 공식 좌석도 데이터는 준비 완료 시 핵심 좌석 구역을 포함한다', () => {
  if (DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    assert.equal(DAEGU_BLOCKS.length, 0, 'manual-required state should not expose synthesized hit areas');
    return;
  }

  assert.ok(DAEGU_BLOCKS.length >= 150, `official block-level map should expose at least 150 hit areas, got ${DAEGU_BLOCKS.length}`);

  const blockCodes = new Set(DAEGU_BLOCKS.map((block) => block.block));
  const categories = new Set(DAEGU_BLOCKS.map((block) => block.category));
  const aliases = new Set(DAEGU_BLOCKS.flatMap((block) => block.seatViewSections));

  ['BLUE', 'AWAY', 'VIP', 'TABLE', 'INFIELD', 'SKY', 'OUTFIELD', 'SWEETBOX', 'PARTY', 'ACCESSIBLE'].forEach((category) => {
    assert.ok(categories.has(category), `${category} category should exist`);
  });

  [
    '1-1', '1-12', '1E-1', 'T1-1', 'TC-1',
    '3-1', '3-11', '3E-1', 'T3-1', 'T3-4',
    'S1', 'S31', 'U1', 'U31', '01', '16',
    'F-1', 'F-2', 'LF-1', 'RF-1', 'TR-1', 'MR-1', 'M-1',
  ].forEach((blockCode) => {
    assert.ok(blockCodes.has(blockCode), `${blockCode} block should exist`);
  });

  ['블루존', '원정응원석', 'VIP석', '중앙 테이블석', 'SKY 지정석', '외야석', '스윗박스', '휠체어 장애인석', '3루', '홈 응원석', '대구', '삼성', '라팍'].forEach((alias) => {
    assert.ok(aliases.has(alias), `${alias} alias should exist`);
  });
});
