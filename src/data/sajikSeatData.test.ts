import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
  SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
  SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS,
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_CATEGORY_GROUPS,
  SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS,
  SAJIK_OFFICIAL_TRACE_REFERENCE,
  SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS,
  SAJIK_REFERENCE_URL,
  SAJIK_REQUIRED_OFFICIAL_SECTIONS,
  SAJIK_SEATMAP_IMAGE,
  SAJIK_TRACE_ANCHOR_TOLERANCE_PX,
  SAJIK_TRACE_AREA_TOLERANCE_PX2,
  SAJIK_TRACE_BOUNDS_TOLERANCE_PX,
  SAJIK_TRACE_REVIEW_SUMMARY,
  SAJIK_TRACE_SOURCE,
  SAJIK_TRACE_VERSION,
  SAJIK_THIN_ALIGNMENT_DILATION_TOLERANCE_PX,
  SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO,
  SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX,
  SAJIK_THIN_ALIGNMENT_STRICT_BLOCKS,
  getSajikFanRoleLabel,
  getSajikGuideMatches,
  getSajikSeatViewAliases,
  getSajikSideLabel,
  getSajikSourceLabel,
  getSajikTraceStatusLabel,
  type SajikBlock,
} from './sajikSeatData';

const SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCK_SET = new Set<string>(SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS);

function pathToPoints(d: string): Array<[number, number]> {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: Array<[number, number]> = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
}

function pathSubpathCount(d: string): number {
  return (d.match(/(?:^|\s)M\s/g) ?? []).length || 1;
}

function pathBounds(d: string) {
  const points = pathToPoints(d);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function polygonArea(points: Array<[number, number]>): number {
  const signedArea = points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + ((point[0] * next[1]) - (next[0] * point[1]));
  }, 0);

  return Math.abs(signedArea / 2);
}

function assertWithinTolerance(actual: number, expected: number, tolerance: number, message: string) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, actual ${actual}, tolerance ${tolerance}`);
}

function isPointInsidePolygon(x: number, y: number, points: Array<[number, number]>): boolean {
  let inside = false;

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const [xi, yi] = points[index];
    const [xj, yj] = points[previous];
    const intersects = ((yi > y) !== (yj > y))
      && x < (((xj - xi) * (y - yi)) / (yj - yi)) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const segmentLengthSquared = (dx * dx) + (dy * dy);

  if (segmentLengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(0, Math.min(1, (((px - ax) * dx) + ((py - ay) * dy)) / segmentLengthSquared));
  return Math.hypot(px - (ax + (t * dx)), py - (ay + (t * dy)));
}

function distanceToPolygon(px: number, py: number, points: Array<[number, number]>): number {
  return points.reduce((minimum, point, index) => {
    const next = points[(index + 1) % points.length];
    return Math.min(minimum, distanceToSegment(px, py, point[0], point[1], next[0], next[1]));
  }, Number.POSITIVE_INFINITY);
}

function orientation(a: [number, number], b: [number, number], c: [number, number]): number {
  return ((b[0] - a[0]) * (c[1] - a[1])) - ((b[1] - a[1]) * (c[0] - a[0]));
}

function isPointOnSegment(point: [number, number], start: [number, number], end: [number, number]): boolean {
  const epsilon = 0.0001;
  if (Math.abs(orientation(start, end, point)) > epsilon) {
    return false;
  }

  return point[0] >= Math.min(start[0], end[0]) - epsilon
    && point[0] <= Math.max(start[0], end[0]) + epsilon
    && point[1] >= Math.min(start[1], end[1]) - epsilon
    && point[1] <= Math.max(start[1], end[1]) + epsilon;
}

function segmentsIntersect(
  firstStart: [number, number],
  firstEnd: [number, number],
  secondStart: [number, number],
  secondEnd: [number, number],
): boolean {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart);
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);

  if (
    ((firstOrientation > 0 && secondOrientation < 0) || (firstOrientation < 0 && secondOrientation > 0))
    && ((thirdOrientation > 0 && fourthOrientation < 0) || (thirdOrientation < 0 && fourthOrientation > 0))
  ) {
    return true;
  }

  return isPointOnSegment(secondStart, firstStart, firstEnd)
    || isPointOnSegment(secondEnd, firstStart, firstEnd)
    || isPointOnSegment(firstStart, secondStart, secondEnd)
    || isPointOnSegment(firstEnd, secondStart, secondEnd);
}

test('사직 좌석도 asset 상태는 공식 파일 준비 여부를 명시한다', () => {
  assert.equal(SAJIK_SEATMAP_IMAGE.imagePath, 'src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png');
  assert.equal(SAJIK_SEATMAP_IMAGE.requiredAssetFileName, 'sajik-lotte-seatmap-official-2026.png');
  assert.equal(SAJIK_SEATMAP_IMAGE.sourceUrl, SAJIK_REFERENCE_URL);
  assert.ok(SAJIK_SEATMAP_IMAGE.sourceLabel);

  if (SAJIK_SEATMAP_IMAGE.assetStatus === 'OFFICIAL') {
    assert.equal(SAJIK_SEATMAP_IMAGE.imageWidth, 960);
    assert.equal(SAJIK_SEATMAP_IMAGE.imageHeight, 640);
  } else {
    assert.equal(SAJIK_SEATMAP_IMAGE.assetStatus, 'MANUAL_BASEBALL_DATA_REQUIRED');
    assert.equal(SAJIK_SEATMAP_IMAGE.imageWidth, 0);
    assert.equal(SAJIK_SEATMAP_IMAGE.imageHeight, 0);
    assert.equal(SAJIK_BLOCKS.length, 0);
  }
});

test('사직 공식 asset 파일과 데이터 상태는 함께 전환되어야 한다', () => {
  const assetExists = existsSync(resolve(process.cwd(), SAJIK_SEATMAP_IMAGE.imagePath));

  if (SAJIK_SEATMAP_IMAGE.assetStatus === 'OFFICIAL') {
    assert.equal(assetExists, true, 'OFFICIAL 상태에서는 승인된 사직 좌석도 asset 파일이 있어야 한다');
    assert.equal(SAJIK_BLOCKS.length, 89, 'OFFICIAL 상태에서는 사직 블록 hit-area 데이터가 89개여야 한다');
  } else {
    assert.equal(
      assetExists,
      false,
      '승인된 사직 좌석도 asset 파일이 추가되면 assetStatus를 OFFICIAL로 바꾸고 블록 좌표를 수동 입력해야 한다',
    );
  }
});

test('사직 좌석 카테고리는 공식 좌석도의 핵심 구역명을 보존한다', () => {
  SAJIK_REQUIRED_OFFICIAL_SECTIONS.forEach((label) => {
    assert.ok(Object.values(SAJIK_CATEGORIES).some((category) => category.label === label), `${label} label should be defined`);
  });

  assert.ok(SAJIK_CATEGORY_GROUPS.some((group) => group.id === 'cheer' && group.cats?.includes('INFIELD_FIELD_1B')));
  assert.ok(SAJIK_CATEGORY_GROUPS.some((group) => group.id === 'table' && group.cats?.includes('CENTRAL_TABLE')));
  assert.ok(SAJIK_CATEGORY_GROUPS.some((group) => group.id === 'accessible' && group.cats?.includes('ACCESSIBLE')));
});

test('사직 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlocks = new Set<string>();

  SAJIK_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    block.officialBlocks.forEach((officialBlock) => {
      assert.ok(!officialBlocks.has(officialBlock), `${officialBlock} official block should be unique`);
      officialBlocks.add(officialBlock);
    });
  });
});

test('사직 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  const displayPriorities = new Set<number>();

  SAJIK_BLOCKS.forEach((block) => {
    assert.ok(SAJIK_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.displayPriority > 0, `${block.id} display priority should exist`);
    assert.ok(!displayPriorities.has(block.displayPriority), `${block.id} display priority should be unique`);
    displayPriorities.add(block.displayPriority);
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.equal(block.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${block.id} trace status should be official image traced`);
    assert.ok(block.reviewNote, `${block.id} review note should exist`);
    assert.equal(
      block.mapInteractionStatus,
      SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS.includes(block.block as (typeof SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS)[number])
        ? 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE'
        : 'MAP_SELECTABLE',
      `${block.id} should keep the current map interaction state`,
    );
    assert.ok(block.officialBlocks.length > 0, `${block.id} official blocks should exist`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    assert.ok(block.imageGeometry.d.startsWith('M '), `${block.id} image geometry path should exist`);
    assert.equal(block.imageGeometry.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${block.id} should use direct official-image path tracing`);
    assert.equal(block.imageGeometry.traceSource, SAJIK_TRACE_SOURCE, `${block.id} should use the official PNG manual polygon source`);
    assert.equal(block.imageGeometry.traceVersion, SAJIK_TRACE_VERSION, `${block.id} should use the v2 precision trace version`);
    assert.equal(block.imageGeometry.manualReviewed, true, `${block.id} precision trace should be manually reviewed`);
    assert.equal(
      block.imageGeometry.pixelAlignmentStatus,
      SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCK_SET.has(block.block) ? 'MANUAL_REVIEW_REQUIRED' : 'PIXEL_ALIGNED',
      `${block.id} should keep the current pixel alignment review state`,
    );
    assert.ok(block.imageGeometry.manualReviewNote, `${block.id} should keep a manual review note`);
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= SAJIK_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= SAJIK_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);

    const pathNumbers = block.imageGeometry.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    assert.ok(pathNumbers.length >= 4, `${block.id} image geometry should contain path coordinates`);
    pathNumbers.forEach((coordinate, index) => {
      const limit = index % 2 === 0 ? SAJIK_SEATMAP_IMAGE.imageWidth : SAJIK_SEATMAP_IMAGE.imageHeight;
      assert.ok(coordinate >= 0 && coordinate <= limit, `${block.id} path coordinate ${coordinate} should fit image bounds`);
    });
  });
});

test('사직 trace review summary는 모든 블럭의 수동 polygon trace 완료 상태를 고정한다', () => {
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.totalBlocks, 89);
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.mapSelectable, 87);
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.aliasOnlyOfficialPngBlockNotVisible, 2);
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.officialImageTraced, 89);
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.needsOperatorReview, 0);
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.directOfficialTrace, 89);
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.manualReviewed, 89);
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.unreviewedBlocks, 0);
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.pixelAligned, 87);
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.manualReviewRequired, 2);
});

test('사직 alignment audit 기준값과 041 정정 alias를 고정한다', () => {
  assert.equal(SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO, 0.9);
  assert.equal(SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO, 0.75);
  assert.equal(SAJIK_THIN_ALIGNMENT_DILATION_TOLERANCE_PX, 1.5);
  assert.equal(SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO, 0.025);
  assert.equal(SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX, 3);
  assert.deepEqual([...SAJIK_THIN_ALIGNMENT_STRICT_BLOCKS], ['121', '122', '123', '124', '125', '131', '132', '133', '134', '135', '142', '143']);
  assert.deepEqual(
    SAJIK_BLOCKS
      .filter((block) => block.imageGeometry.pixelAlignmentStatus === 'MANUAL_REVIEW_REQUIRED')
      .map((block) => block.block),
    [...SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS],
  );
  assert.deepEqual([...SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS], ['011', '903']);
  assert.deepEqual([...SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS], ['011', '903']);
  assert.deepEqual(
    SAJIK_BLOCKS
      .filter((block) => block.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE')
      .map((block) => block.block),
    ['011', '903'],
  );
  assert.equal(SAJIK_BLOCKS.filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE').length, 87);

  const officialPngNotVisibleBlock = SAJIK_BLOCKS.find((block) => block.block === '011');
  assert.ok(officialPngNotVisibleBlock, '011 compatibility block should remain explicit');
  assert.equal(officialPngNotVisibleBlock.imageGeometry.pixelAlignmentStatus, 'MANUAL_REVIEW_REQUIRED');
  assert.equal(officialPngNotVisibleBlock.mapInteractionStatus, 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE');
  assert.match(officialPngNotVisibleBlock.imageGeometry.manualReviewNote ?? '', /공식 PNG/);

  const everyTimeCompatibilityBlock = SAJIK_BLOCKS.find((block) => block.block === '903');
  assert.ok(everyTimeCompatibilityBlock, '903 compatibility block should remain explicit');
  assert.equal(everyTimeCompatibilityBlock.imageGeometry.pixelAlignmentStatus, 'MANUAL_REVIEW_REQUIRED');
  assert.equal(everyTimeCompatibilityBlock.mapInteractionStatus, 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE');
  assert.match(everyTimeCompatibilityBlock.imageGeometry.manualReviewNote ?? '', /공식 PNG/);

  const retraced143 = SAJIK_BLOCKS.find((block) => block.block === '143');
  assert.ok(retraced143, '143 should remain explicit');
  assert.equal(retraced143.mapInteractionStatus, 'MAP_SELECTABLE');
  assert.equal(pathToPoints(retraced143.imageGeometry.d).length, 10);
  assert.deepEqual(pathBounds(retraced143.imageGeometry.d), { minX: 779, minY: 458, maxX: 813, maxY: 481 });

  const central041 = SAJIK_BLOCKS.find((block) => block.block === '041');
  assert.ok(central041, '041 block should exist from official PNG');
  assert.equal(central041.category, 'CENTRAL_TABLE');
  assert.deepEqual(central041.officialBlocks, ['041']);
  assert.ok(central041.seatViewSections.includes('141'));
  assert.ok(central041.seatViewSections.includes('141블록'));
  assert.equal(SAJIK_BLOCKS.some((block) => block.block === '141'), false);
});

test('사직 official trace reference는 전 블럭의 anchor와 bbox를 독립 기준으로 고정한다', () => {
  const expectedBlocks = SAJIK_BLOCKS.map((block) => block.block).sort();
  const actualReferenceBlocks = Object.keys(SAJIK_OFFICIAL_TRACE_REFERENCE).sort();

  assert.deepEqual(actualReferenceBlocks, expectedBlocks);

  SAJIK_BLOCKS.forEach((block) => {
    const reference = SAJIK_OFFICIAL_TRACE_REFERENCE[block.block];
    const points = pathToPoints(block.imageGeometry.d);
    const bounds = pathBounds(block.imageGeometry.d);

    assert.ok(reference, `${block.id} trace reference should exist`);
    assert.equal(pathSubpathCount(block.imageGeometry.d), reference.expectedSubpathCount, `${block.id} subpath count should match reference`);
    assert.equal(points.length, reference.expectedPointCount, `${block.id} point count should match reference`);
    assertWithinTolerance(polygonArea(points), reference.expectedArea, SAJIK_TRACE_AREA_TOLERANCE_PX2, `${block.id} polygon area should match reference`);
    assertWithinTolerance(block.imageGeometry.labelX, reference.numberAnchor.x, SAJIK_TRACE_ANCHOR_TOLERANCE_PX, `${block.id} label x should match official number anchor`);
    assertWithinTolerance(block.imageGeometry.labelY, reference.numberAnchor.y, SAJIK_TRACE_ANCHOR_TOLERANCE_PX, `${block.id} label y should match official number anchor`);
    assertWithinTolerance(bounds.minX, reference.expectedBounds.minX, SAJIK_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} minX should match reference bbox`);
    assertWithinTolerance(bounds.minY, reference.expectedBounds.minY, SAJIK_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} minY should match reference bbox`);
    assertWithinTolerance(bounds.maxX, reference.expectedBounds.maxX, SAJIK_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} maxX should match reference bbox`);
    assertWithinTolerance(bounds.maxY, reference.expectedBounds.maxY, SAJIK_TRACE_BOUNDS_TOLERANCE_PX, `${block.id} maxY should match reference bbox`);
  });
});

test('사직 label 좌표는 자기 polygon 내부 또는 허용 오차 안에 있다', () => {
  SAJIK_BLOCKS.forEach((block) => {
    const points = pathToPoints(block.imageGeometry.d);
    assert.ok(points.length >= 3, `${block.id} polygon should have at least 3 points`);

    const isInside = isPointInsidePolygon(block.imageGeometry.labelX, block.imageGeometry.labelY, points);
    const distance = distanceToPolygon(block.imageGeometry.labelX, block.imageGeometry.labelY, points);
    assert.ok(isInside || distance <= 1, `${block.id} label should be inside its polygon or within tolerance`);
  });
});

test('사직 polygon은 단일 폐합 path이고 자기 교차가 없다', () => {
  SAJIK_BLOCKS.forEach((block) => {
    assert.match(
      block.imageGeometry.d,
      /^M\s-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?(?:\sL\s-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?)+\sZ$/,
      `${block.id} should be a single closed M/L/Z polygon`,
    );

    const points = pathToPoints(block.imageGeometry.d);
    points.forEach((point, edgeIndex) => {
      const nextPoint = points[(edgeIndex + 1) % points.length];

      for (let compareIndex = edgeIndex + 1; compareIndex < points.length; compareIndex += 1) {
        const isAdjacent = Math.abs(edgeIndex - compareIndex) <= 1
          || (edgeIndex === 0 && compareIndex === points.length - 1);
        if (isAdjacent) {
          continue;
        }

        const comparePoint = points[compareIndex];
        const compareNextPoint = points[(compareIndex + 1) % points.length];
        assert.equal(
          segmentsIntersect(point, nextPoint, comparePoint, compareNextPoint),
          false,
          `${block.id} polygon edges ${edgeIndex} and ${compareIndex} should not intersect`,
        );
      }
    });
  });
});

test('사직 label 좌표 클릭은 최상위 polygon hit target과 일치한다', () => {
  const sortedBlocks = [...SAJIK_BLOCKS]
    .filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE')
    .sort((left, right) => left.displayPriority - right.displayPriority);

  sortedBlocks.forEach((block) => {
    const hits = sortedBlocks.filter((candidate) => (
      isPointInsidePolygon(
        block.imageGeometry.labelX,
        block.imageGeometry.labelY,
        pathToPoints(candidate.imageGeometry.d),
      )
    ));

    assert.ok(hits.length > 0, `${block.id} label should hit at least one polygon`);
    assert.equal(hits.at(-1)?.id, block.id, `${block.id} label should not be covered by a later-rendered polygon`);
  });

  SAJIK_BLOCKS
    .filter((block) => block.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE')
    .forEach((block) => {
      const hits = sortedBlocks.filter((candidate) => (
        isPointInsidePolygon(
          block.imageGeometry.labelX,
          block.imageGeometry.labelY,
          pathToPoints(candidate.imageGeometry.d),
        )
      ));
      assert.notEqual(hits.at(-1)?.id, block.id, `${block.id} should not be selectable from the map hit stack`);
    });
});

test('사직 polygon 정밀화는 단순 사각형 전체 fallback으로 회귀하지 않는다', () => {
  const refinedBlocks = SAJIK_BLOCKS.filter((block) => pathToPoints(block.imageGeometry.d).length > 4);
  const thinFirstBaseBlocks = new Set(['121', '122', '123', '124', '125', '131', '132', '133', '134', '135', '142', '143']);

  assert.ok(refinedBlocks.length >= 45, 'at least 45 Sajik blocks should use refined polygons with more than 4 points');
  SAJIK_BLOCKS
    .filter((block) => thinFirstBaseBlocks.has(block.block))
    .forEach((block) => {
      assert.ok(pathToPoints(block.imageGeometry.d).length >= 6, `${block.block} should keep a refined thin-block polygon`);
    });
});

test('사직 대표 블럭은 홈/원정/외야/휠체어/중앙 계열을 포함한다', () => {
  assert.ok(SAJIK_BLOCKS.some((block) => block.category === 'INFIELD_FIELD_3A' && block.block === '313'), 'HOME field section should exist');
  assert.ok(SAJIK_BLOCKS.some((block) => block.category === 'INFIELD_FIELD_1B' && block.block === '111'), 'AWAY field section should exist');
  assert.ok(SAJIK_BLOCKS.some((block) => block.category === 'OUTFIELD_3B' && block.block === '723'), 'OUTFIELD section should exist');
  assert.ok(SAJIK_BLOCKS.some((block) => block.category === 'ACCESSIBLE' && block.officialBlocks.includes('휠체어석-1루')), 'ACCESSIBLE section should exist');
  assert.ok(SAJIK_BLOCKS.some((block) => block.category === 'CENTRAL_TABLE' && block.block === '021'), 'CENTRAL table section should exist');
});

test('사직 좌석도 label helper는 UI 표시 문구를 제공한다', () => {
  assert.equal(getSajikSideLabel('FIRST_BASE'), '1루');
  assert.equal(getSajikSideLabel('THIRD_BASE'), '3루');
  assert.equal(getSajikSideLabel('CENTER'), '중앙');
  assert.equal(getSajikFanRoleLabel('HOME'), '홈 응원');
  assert.equal(getSajikFanRoleLabel('AWAY'), '원정 응원');
  assert.equal(getSajikSourceLabel('OFFICIAL'), '공식 확인');
  assert.equal(getSajikSourceLabel('UNVERIFIED'), '공식 확인 필요');
  assert.equal(getSajikTraceStatusLabel('OFFICIAL_IMAGE_TRACED'), '공식 이미지 트레이싱');
  assert.equal(getSajikTraceStatusLabel('NEEDS_OPERATOR_REVIEW'), '운영자 재검수 필요');
});

test('사직 시야 갤러리 alias에는 구장/팀/블록/좌석등급명이 포함된다', () => {
  const block: SajikBlock = {
    id: 'sajik-sample-101',
    level: '1F',
    category: 'INFIELD_FIELD_1B',
    name: '1루 내야필드석 101블록',
    block: '101',
    officialBlocks: ['101', '102'],
    side: 'FIRST_BASE',
    fanRole: 'HOME',
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    reviewNote: 'test',
    displayPriority: 1,
    mapInteractionStatus: 'MAP_SELECTABLE',
    sourceConfidence: 'OFFICIAL',
    sourceNote: 'test',
    seatViewSections: ['1루 필드석'],
    imageGeometry: {
      d: 'M 0 0 L 10 0 L 10 10 Z',
      labelX: 5,
      labelY: 5,
      shortLabel: '101',
      traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
      traceSource: SAJIK_TRACE_SOURCE,
      traceVersion: SAJIK_TRACE_VERSION,
      manualReviewed: true,
      pixelAlignmentStatus: 'PIXEL_ALIGNED',
      manualReviewNote: 'test',
    },
  };

  const aliases = getSajikSeatViewAliases(block);

  ['사직', '사직야구장', '롯데', '롯데 자이언츠', '101', '101블록', '102', '102블록', '1루 내야필드석', '1루 필드석'].forEach((alias) => {
    assert.ok(aliases.includes(alias), `${alias} alias should be included`);
  });
  assert.equal(new Set(aliases).size, aliases.length);
});

test('사직 처음 가이드 추천 모드는 기존 블록 필드에서 매칭 결과를 만든다', () => {
  const homeMatches = getSajikGuideMatches('home_cheer', '', SAJIK_BLOCKS);
  const awayThirdMatches = getSajikGuideMatches('away_third', '', SAJIK_BLOCKS);
  const tableMatches = getSajikGuideMatches('center_table', '', SAJIK_BLOCKS);
  const outfieldMatches = getSajikGuideMatches('outfield', '', SAJIK_BLOCKS);
  const accessibleMatches = getSajikGuideMatches('accessible', '', SAJIK_BLOCKS);

  assert.ok(homeMatches.length > 0, 'home cheer matches should exist');
  assert.ok(homeMatches.every((match) => match.block.fanRole === 'HOME'));
  assert.ok(awayThirdMatches.length > 0, 'away/third matches should exist');
  assert.ok(awayThirdMatches.every((match) => match.block.fanRole === 'AWAY' || match.block.side === 'THIRD_BASE'));
  assert.ok(tableMatches.some((match) => match.block.category === 'CENTRAL_TABLE'));
  assert.ok(outfieldMatches.every((match) => match.block.level === 'OUTFIELD' || match.block.side === 'OUTFIELD' || match.block.category.startsWith('OUTFIELD') || match.block.category === 'CAMPING'));
  assert.equal(accessibleMatches.length, 3);
  assert.ok(accessibleMatches.every((match) => match.block.category === 'ACCESSIBLE'));
});

test('사직 처음 가이드 검색은 블록 번호와 좌석명과 접근성 별칭을 찾는다', () => {
  const blockMatches = getSajikGuideMatches('all', '111', SAJIK_BLOCKS);
  const centralTableMatches = getSajikGuideMatches('all', '중앙탁자석', SAJIK_BLOCKS);
  const accessibleMatches = getSajikGuideMatches('all', '휠체어', SAJIK_BLOCKS);

  assert.equal(blockMatches[0]?.block.block, '111');
  assert.ok(centralTableMatches.length > 0);
  assert.ok(centralTableMatches.every((match) => match.block.category === 'CENTRAL_TABLE' || match.block.seatViewSections.some((alias) => alias.includes('중앙탁자석'))));
  assert.equal(accessibleMatches.length, 3);
  assert.ok(accessibleMatches.every((match) => match.block.category === 'ACCESSIBLE'));
});
