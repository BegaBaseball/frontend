import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_CATEGORY_GROUPS,
  SAJIK_REFERENCE_URL,
  SAJIK_REQUIRED_OFFICIAL_SECTIONS,
  SAJIK_SEATMAP_IMAGE,
  SAJIK_TRACE_REVIEW_SUMMARY,
  getSajikFanRoleLabel,
  getSajikSeatViewAliases,
  getSajikSideLabel,
  getSajikSourceLabel,
  getSajikTraceStatusLabel,
  type SajikBlock,
} from './sajikSeatData';

function pathToPoints(d: string): Array<[number, number]> {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: Array<[number, number]> = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
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
    assert.ok(block.officialBlocks.length > 0, `${block.id} official blocks should exist`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    assert.ok(block.imageGeometry.d.startsWith('M '), `${block.id} image geometry path should exist`);
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
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.officialImageTraced, 89);
  assert.equal(SAJIK_TRACE_REVIEW_SUMMARY.needsOperatorReview, 0);
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
    sourceConfidence: 'OFFICIAL',
    sourceNote: 'test',
    seatViewSections: ['1루 필드석'],
    imageGeometry: { d: 'M 0 0 L 10 0 L 10 10 Z', labelX: 5, labelY: 5, shortLabel: '101' },
  };

  const aliases = getSajikSeatViewAliases(block);

  ['사직', '사직야구장', '롯데', '롯데 자이언츠', '101', '101블록', '102', '102블록', '1루 내야필드석', '1루 필드석'].forEach((alias) => {
    assert.ok(aliases.includes(alias), `${alias} alias should be included`);
  });
  assert.equal(new Set(aliases).size, aliases.length);
});
