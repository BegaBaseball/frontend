import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DAEJEON_BLOCKS,
  DAEJEON_BLOCK_GROUPS,
  DAEJEON_CATEGORIES,
  DAEJEON_CATEGORY_GROUPS,
  DAEJEON_MANUAL_BLOCK_GEOMETRY,
  DAEJEON_OFFICIAL_SECTION_GROUPS,
  DAEJEON_REQUIRED_OFFICIAL_SECTIONS,
  DAEJEON_SECTION_COVERAGE,
  DAEJEON_SEATMAP_IMAGE,
  DAEJEON_TRACE_REVIEW_SUMMARY,
  getDaejeonViewInfo,
} from './daejeonSeatData';

type TestPoint = readonly [number, number];

function pathToPoints(d: string): TestPoint[] {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: TestPoint[] = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
}

function polygonArea(points: TestPoint[]): number {
  const signedArea = points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0);

  return Math.abs(signedArea) / 2;
}

function isPointInsidePolygon(points: TestPoint[], point: TestPoint): boolean {
  const [x, y] = point;
  let inside = false;

  for (let index = 0, previousIndex = points.length - 1; index < points.length; previousIndex = index++) {
    const [xi, yi] = points[index];
    const [xj, yj] = points[previousIndex];
    const intersects = (yi > y) !== (yj > y)
      && x < (((xj - xi) * (y - yi)) / (yj - yi)) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function getDaejeonTestLayer(block: { category: string }): number {
  if (block.category === 'ACCESSIBLE') return 40;
  if (block.category === 'SPECIAL' || block.category === 'EXCITING') return 30;
  if (block.category === 'SKY') return 20;
  return 10;
}

function getDaejeonTraceLayer(block: { traceStatus: string }): number {
  return block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 1 : 0;
}

function getDaejeonRenderOrderedBlocks() {
  return [...DAEJEON_BLOCKS].sort((a, b) => (
    getDaejeonTestLayer(a) - getDaejeonTestLayer(b)
    || getDaejeonTraceLayer(a) - getDaejeonTraceLayer(b)
    || a.displayPriority - b.displayPriority
  ));
}

function getTopHitBlockIdAtPoint(point: TestPoint): string | null {
  const hitBlocks = getDaejeonRenderOrderedBlocks().filter((candidate) => (
    isPointInsidePolygon(pathToPoints(candidate.hitAreaD ?? candidate.imageGeometry.d), point)
  ));

  return hitBlocks[hitBlocks.length - 1]?.id ?? null;
}

function assertPathFitsImageBounds(path: string, context: string) {
  const pathNumbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  assert.ok(pathNumbers.length >= 4, `${context} should contain path coordinates`);

  pathNumbers.forEach((coordinate, index) => {
    const limit = index % 2 === 0 ? DAEJEON_SEATMAP_IMAGE.imageWidth : DAEJEON_SEATMAP_IMAGE.imageHeight;
    assert.ok(coordinate >= 0 && coordinate <= limit, `${context} coordinate ${coordinate} should fit image bounds`);
  });
}

function numericBlockCodes(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

const DAEJEON_COORDINATE_DIAGNOSTIC_TARGET_IDS = [
  'catcher-back-100__100a',
  'catcher-back-100__100b',
  'catcher-back-100__100c',
  'first-infield-b-101-108__101',
  'first-infield-b-101-108__102',
  'first-infield-b-101-108__103',
  'first-infield-b-101-108__104',
  'first-infield-b-101-108__105',
  'first-infield-b-101-108__106',
  'first-infield-b-101-108__107',
  'first-infield-b-101-108__108',
  'third-infield-a-113-120-213-225__113',
  'third-infield-a-113-120-213-225__114',
  'third-infield-a-113-120-213-225__115',
  'third-infield-a-113-120-213-225__116',
  'third-infield-a-113-120-213-225__117',
  'third-infield-a-113-120-213-225__118',
  'third-infield-a-113-120-213-225__119',
  'third-infield-a-113-120-213-225__120',
  'third-infield-b-121-124__124',
  'cass-cheering-200__200',
  'innings-vip-400__400',
  'outfield-lawn-500__500',
  'outfield-reserved-509__509',
  'outfield-table-third-501-503__501',
  'outfield-table-third-501-503__502',
  'outfield-table-third-501-503__503',
  'outfield-table-first-504-508__504',
  'outfield-table-first-504-508__505',
  'outfield-table-first-504-508__506',
  'outfield-table-first-504-508__507',
  'outfield-table-first-504-508__508',
  'first-table-4f-301-413__301',
  'first-table-4f-301-413__302',
  'first-table-4f-301-413__401',
  'first-table-4f-301-413__412',
  'first-table-4f-301-413__413',
  'outfield-reserved-first-301-404__401',
  'outfield-reserved-first-301-404__402',
  'outfield-reserved-first-301-404__403',
  'outfield-reserved-first-301-404__404',
  'third-table-4f-414-330__414',
  'third-table-4f-414-330__420',
  'third-table-4f-414-330__423',
  'outfield-reserved-third-423-330__423',
  'outfield-reserved-third-423-330__424',
  'splash-jacuzzi-425__425',
  'splash-caravan-426__426',
] as const;

test('대전 좌석도 공식 asset 상태를 명시한다', () => {
  assert.equal(DAEJEON_SEATMAP_IMAGE.assetStatus, 'OFFICIAL');
  assert.equal(
    DAEJEON_SEATMAP_IMAGE.imagePath,
    'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png',
  );
  assert.equal(
    DAEJEON_SEATMAP_IMAGE.requiredAssetFileName,
    'daejeon-hanwha-life-eagles-park-seatmap-official-2026.png',
  );
  assert.equal(DAEJEON_SEATMAP_IMAGE.imageWidth, 920);
  assert.equal(DAEJEON_SEATMAP_IMAGE.imageHeight, 1060);
  assert.equal(DAEJEON_SEATMAP_IMAGE.sourceLabel, '한화 이글스 공식 대전 한화생명볼파크 좌석안내도');
  assert.equal(DAEJEON_SEATMAP_IMAGE.sourceUrl, 'https://www.hanwhaeagles.co.kr/MN/EP/MNEPPI01.do');
  assert.equal(DAEJEON_SEATMAP_IMAGE.assetSha256, '5fbfa5364e4271b814789ea35400966e9c6afea38ee1f3654382e9f1838b4081');

  const assetPath = new URL('../assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png', import.meta.url);
  const assetHash = createHash('sha256').update(readFileSync(assetPath)).digest('hex');
  assert.equal(assetHash, DAEJEON_SEATMAP_IMAGE.assetSha256);
});

test('대전 좌석도는 공식 파일 기반 hit-area 블록을 가진다', () => {
  assert.equal(DAEJEON_SEATMAP_IMAGE.assetStatus, 'OFFICIAL');
  assert.equal(DAEJEON_BLOCK_GROUPS.length, 25);
  assert.equal(DAEJEON_BLOCKS.length, 156);
});

test('대전 세분화 좌표는 수동 geometry와 검수 상태를 가진다', () => {
  assert.equal(DAEJEON_TRACE_REVIEW_SUMMARY.totalGroups, DAEJEON_BLOCK_GROUPS.length);
  assert.equal(DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks, DAEJEON_BLOCKS.length);
  assert.equal(
    DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced + DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview,
    DAEJEON_BLOCKS.length,
  );
  assert.equal(Object.keys(DAEJEON_MANUAL_BLOCK_GEOMETRY).length, DAEJEON_BLOCKS.length);

  DAEJEON_BLOCKS.forEach((block) => {
    assert.ok(
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED' || block.traceStatus === 'NEEDS_OPERATOR_REVIEW',
      `${block.id} should have a valid trace status`,
    );
    assert.ok(DAEJEON_MANUAL_BLOCK_GEOMETRY[block.id], `${block.id} should have manual geometry`);
    assert.equal(
      DAEJEON_MANUAL_BLOCK_GEOMETRY[block.id].traceMethod,
      block.traceMethod,
      `${block.id} should expose manual geometry trace method`,
    );
    assert.ok(block.reviewNote, `${block.id} should keep review note`);
    if (block.traceStatus === 'NEEDS_OPERATOR_REVIEW') {
      assert.match(block.reviewNote, /재검수|검수|불명확|확인|NEEDS_OPERATOR_REVIEW/, `${block.id} pending block should explain review reason`);
    }
  });
});

test('대전 카테고리와 필터 그룹은 전용 좌석도 UI에 필요한 기본 분류를 가진다', () => {
  ['PREMIUM', 'TABLE', 'CHEERING', 'INFIELD', 'SKY', 'EXCITING', 'OUTFIELD', 'SPECIAL', 'ACCESSIBLE'].forEach((category) => {
    assert.ok(DAEJEON_CATEGORIES[category], `${category} category should exist`);
  });

  assert.ok(DAEJEON_CATEGORY_GROUPS.some((group) => group.id === 'all' && group.cats === null));
  assert.ok(DAEJEON_CATEGORY_GROUPS.some((group) => group.id === 'cheer' && group.cats?.includes('CHEERING')));
  assert.ok(DAEJEON_CATEGORY_GROUPS.some((group) => group.id === 'accessible' && group.cats?.includes('ACCESSIBLE')));
});

test('대전 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlockLabels = new Set<string>();
  const parentBlockCodes = new Set<string>();

  DAEJEON_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    assert.ok(!officialBlockLabels.has(block.officialBlockLabel), `${block.officialBlockLabel} official block should be unique`);
    officialBlockLabels.add(block.officialBlockLabel);

    const parentBlockCode = `${block.parentId}:${block.blockCode}`;
    assert.ok(!parentBlockCodes.has(parentBlockCode), `${parentBlockCode} should be unique`);
    parentBlockCodes.add(parentBlockCode);
  });
});

test('대전 공식 블록 범위 표기는 번호 단위로 확장된다', () => {
  const byId = new Set(DAEJEON_BLOCKS.map((block) => block.id));
  const labels = new Set(DAEJEON_BLOCKS.map((block) => block.officialBlockLabel));
  const codes = new Set(DAEJEON_BLOCKS.map((block) => block.blockCode));

  [
    'central-reserved-100__100a',
    'central-reserved-100__100c',
    'skybox-s01-s37__s01',
    'skybox-s01-s37__s37',
    'first-table-4f-301-413__301',
    'first-table-4f-301-413__302',
    'first-table-4f-301-413__401',
    'first-table-4f-301-413__413',
    'third-table-4f-414-330__326',
    'third-table-4f-414-330__330',
    'outfield-reserved-third-423-330__423',
    'outfield-reserved-third-423-330__424',
  ].forEach((id) => {
    assert.ok(byId.has(id), `${id} should exist`);
  });

  [
    '중앙 지정석 100A',
    '중앙 지정석 100C',
    '스카이박스 S01',
    '스카이박스 S37',
    '내야 탁자석(4층) 301',
    '내야 탁자석(4층) 302',
    '내야 탁자석(4층) 401',
    '내야 탁자석(4층) 413',
    '외야지정석 423',
    '외야지정석 330',
  ].forEach((label) => {
    assert.ok(labels.has(label), `${label} should exist`);
  });

  ['100A', '100C', 'S01', 'S37', '301', '302', '401', '413', '326', '330', '423', '424'].forEach((code) => {
    assert.ok(codes.has(code), `${code} code should exist`);
  });
});

test('대전 1루 4층 탁자석은 공식 이미지에 없는 303-399 블록을 생성하지 않는다', () => {
  const firstTableBlocks = DAEJEON_BLOCKS.filter((block) => block.parentId === 'first-table-4f-301-413');
  const firstTableCodes = firstTableBlocks.map((block) => block.blockCode);

  assert.deepEqual(firstTableCodes, [
    '301',
    '302',
    '401',
    '402',
    '403',
    '404',
    '405',
    '406',
    '407',
    '408',
    '409',
    '410',
    '411',
    '412',
    '413',
  ]);

  numericBlockCodes(303, 399).forEach((blockCode) => {
    assert.ok(!firstTableCodes.includes(blockCode), `first-table-4f-301-413 should not include non-official block ${blockCode}`);
    assert.ok(
      !DAEJEON_BLOCKS.some((block) => block.parentId === 'first-table-4f-301-413' && block.blockCode === blockCode),
      `non-official first-table block ${blockCode} should not be generated`,
    );
  });
});

test('대전 특수석 hit-area는 인접 일반석을 과대 선택하지 않는다', () => {
  const byId = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const specialHitAreas = [
    {
      id: 'innings-vip-400__400',
      maxArea: 3200,
      requiredPoint: [851, 571] as const,
      excludedAdjacentPoints: [
        [822, 620],
        [875, 530],
        [858, 628],
      ] as const,
    },
    {
      id: 'splash-jacuzzi-425__425',
      maxArea: 1800,
      requiredPoint: [104, 676] as const,
      excludedAdjacentPoints: [
        [83, 650],
        [100, 646],
        [116, 632],
      ] as const,
    },
    {
      id: 'splash-caravan-426__426',
      maxArea: 1300,
      requiredPoint: [83, 595] as const,
      excludedAdjacentPoints: [
        [103, 590],
        [106, 605],
        [110, 612],
      ] as const,
    },
  ];

  specialHitAreas.forEach((special) => {
    const block = byId.get(special.id);
    assert.ok(block, `${special.id} block should exist`);

    const hitAreaPoints = pathToPoints(block.hitAreaD ?? block.imageGeometry.d);
    assert.ok(hitAreaPoints.length >= 4, `${special.id} should have polygon hit area`);
    assert.ok(polygonArea(hitAreaPoints) <= special.maxArea, `${special.id} hit-area should stay tightly scoped`);
    assert.ok(isPointInsidePolygon(hitAreaPoints, special.requiredPoint), `${special.id} should keep its own label point selectable`);

    special.excludedAdjacentPoints.forEach((point) => {
      assert.equal(
        isPointInsidePolygon(hitAreaPoints, point),
        false,
        `${special.id} should not include adjacent anchor ${point.join(',')}`,
      );
    });
  });
});

test('대전 공식 좌석도 대표 구역과 특수구역을 포함한다', () => {
  const searchableText = DAEJEON_BLOCKS
    .flatMap((block) => [block.name, block.block, block.officialSectionName, ...block.officialBlocks, ...block.seatViewSections])
    .join(' ');

  DAEJEON_REQUIRED_OFFICIAL_SECTIONS.forEach((section) => {
    assert.ok(searchableText.includes(section), `${section} should be represented`);
  });
});

test('대전 공식 섹션 그룹은 공식 섹션 17개를 모두 한 번씩 포함한다', () => {
  const groupedSections = DAEJEON_OFFICIAL_SECTION_GROUPS.flatMap((group) => group.sections);
  assert.equal(groupedSections.length, DAEJEON_REQUIRED_OFFICIAL_SECTIONS.length);
  assert.deepEqual([...new Set(groupedSections)].sort(), [...DAEJEON_REQUIRED_OFFICIAL_SECTIONS].sort());
});

test('대전 공식 섹션 coverage는 17개 섹션과 실제 블록을 모두 연결한다', () => {
  const coverageSections = DAEJEON_SECTION_COVERAGE.map((coverage) => coverage.officialSectionName);
  const blockIds = new Set(DAEJEON_BLOCKS.map((block) => block.id));

  assert.equal(coverageSections.length, DAEJEON_REQUIRED_OFFICIAL_SECTIONS.length);
  assert.deepEqual([...new Set(coverageSections)].sort(), [...DAEJEON_REQUIRED_OFFICIAL_SECTIONS].sort());

  DAEJEON_SECTION_COVERAGE.forEach((coverage) => {
    assert.ok(coverage.blockIds.length > 0, `${coverage.officialSectionName} coverage should have block ids`);
    assert.ok(coverage.reviewNote, `${coverage.officialSectionName} coverage should have review note`);
    assert.ok(
      coverage.status === 'REPRESENTATIVE_TRACED' || coverage.status === 'SPLIT_ACROSS_BLOCKS',
      `${coverage.officialSectionName} coverage should have valid status`,
    );
    coverage.blockIds.forEach((blockId) => {
      assert.ok(blockIds.has(blockId), `${coverage.officialSectionName} coverage block ${blockId} should exist`);
    });
  });

  const coveredBlockIds = new Set(DAEJEON_SECTION_COVERAGE.flatMap((coverage) => coverage.blockIds));
  DAEJEON_BLOCKS.forEach((block) => {
    assert.ok(coveredBlockIds.has(block.id), `${block.id} should be linked from coverage`);
  });
});

test('대전 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  const displayPriorities = new Set<number>();
  const parentIds = new Set(DAEJEON_BLOCK_GROUPS.map((group) => group.id));

  DAEJEON_BLOCKS.forEach((block) => {
    assert.ok(DAEJEON_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.zoneGroup, `${block.id} zone group should exist`);
    assert.ok(block.displayPriority > 0, `${block.id} display priority should exist`);
    assert.ok(!displayPriorities.has(block.displayPriority), `${block.id} display priority should be unique`);
    displayPriorities.add(block.displayPriority);
    assert.ok(block.officialSectionName, `${block.id} official section name should exist`);
    assert.ok(parentIds.has(block.parentId), `${block.id} parent id should exist`);
    assert.equal(block.segmentationLevel, 'OFFICIAL_BLOCK', `${block.id} should be an official block child`);
    assert.ok(block.parentBlock, `${block.id} parent block should exist`);
    assert.ok(block.blockCode, `${block.id} block code should exist`);
    assert.ok(block.officialBlockLabel, `${block.id} official block label should exist`);
    assert.ok(
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED' || block.traceStatus === 'NEEDS_OPERATOR_REVIEW',
      `${block.id} trace status should be supported`,
    );
    assert.ok(
      block.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
      || block.traceMethod === 'APPROX_CENTER_RECT'
      || block.traceMethod === 'APPROX_INTERPOLATED_POLYLINE',
      `${block.id} trace method should be supported`,
    );
    if (block.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
      assert.equal(
        block.traceMethod,
        'PATH_TRACED_FROM_OFFICIAL_IMAGE',
        `${block.id} official trace should only use path traced from the official image`,
      );
    }
    if (block.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE') {
      assert.equal(block.traceStatus, 'NEEDS_OPERATOR_REVIEW', `${block.id} generated geometry should stay pending review`);
    }
    if (block.traceStatus === 'NEEDS_OPERATOR_REVIEW') {
      assert.match(block.reviewNote ?? '', /재검수|검수|불명확|확인|NEEDS_OPERATOR_REVIEW/, `${block.id} pending trace should keep review note`);
    }
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.deepEqual(block.officialBlocks, [block.officialBlockLabel], `${block.id} official blocks should contain exact official label`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    assert.equal(
      block.sourceConfidence,
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 'OFFICIAL' : 'UNVERIFIED',
      `${block.id} source confidence should follow trace status`,
    );
    if (block.sourceConfidence === 'UNVERIFIED') {
      assert.match(block.sourceNote, /TODO|재검수|직접 측정/, `${block.id} unverified source should keep operator TODO`);
    }
    assert.ok(block.seatViewSections.includes(block.name), `${block.id} seat view aliases should include section name`);
    assert.ok(block.seatViewSections.includes(block.blockCode), `${block.id} seat view aliases should include block code`);
    assert.ok(block.seatViewSections.includes(block.officialBlockLabel), `${block.id} seat view aliases should include exact official label`);

    const viewInfo = getDaejeonViewInfo(block);
    assert.ok(viewInfo, `${block.id} view info should exist`);
    assert.equal(viewInfo.photos, 0, `${block.id} view info should start with zero photos`);
    assert.equal(viewInfo.rating, null, `${block.id} view info should start without rating`);
    assert.ok(viewInfo.distance, `${block.id} view info distance should exist`);
    assert.ok(viewInfo.notes, `${block.id} view info notes should exist`);
    assert.ok(viewInfo.tags && viewInfo.tags.length > 0, `${block.id} view info tags should exist`);

    assert.ok(block.imageGeometry.d.startsWith('M '), `${block.id} image geometry path should exist`);
    assert.ok((block.hitAreaD ?? block.imageGeometry.d).startsWith('M '), `${block.id} hit area path should exist`);
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= DAEJEON_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= DAEJEON_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);

    assertPathFitsImageBounds(block.imageGeometry.d, `${block.id} display path`);
    assertPathFitsImageBounds(block.hitAreaD ?? block.imageGeometry.d, `${block.id} hit-area path`);

    const hitAreaPoints = pathToPoints(block.hitAreaD ?? block.imageGeometry.d);
    assert.ok(
      isPointInsidePolygon(hitAreaPoints, [block.imageGeometry.labelX, block.imageGeometry.labelY]),
      `${block.id} label point should be inside its own hit-area`,
    );
  });
});

test('대전 좌표 기준 샘플 블록은 존재하고 label 좌표가 자기 hit-area를 선택한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));

  DAEJEON_COORDINATE_DIAGNOSTIC_TARGET_IDS.forEach((id) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} diagnostic target should exist`);

    assertPathFitsImageBounds(block.imageGeometry.d, `${id} display path`);
    assertPathFitsImageBounds(block.hitAreaD ?? block.imageGeometry.d, `${id} hit-area path`);
    if (block.traceStatus === 'NEEDS_OPERATOR_REVIEW') {
      assert.equal(block.sourceConfidence, 'UNVERIFIED', `${id} pending target should not claim official coordinate confidence`);
      return;
    }

    assert.equal(
      getTopHitBlockIdAtPoint([block.imageGeometry.labelX, block.imageGeometry.labelY]),
      id,
      `${id} label point should top-hit itself`,
    );
  });
});

test('대전 좌표 정밀도 audit는 측정 완료 블록과 검수 대기 블록을 구분한다', () => {
  const rows = DAEJEON_BLOCKS.map((block) => ({
    id: block.id,
    parentId: block.parentId,
    traceStatus: block.traceStatus,
    sourceConfidence: block.sourceConfidence,
    area: polygonArea(pathToPoints(block.hitAreaD ?? block.imageGeometry.d)),
    labelTopHitBlockId: getTopHitBlockIdAtPoint([block.imageGeometry.labelX, block.imageGeometry.labelY]),
  }));
  const officialRows = rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED');
  const pendingRows = rows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW');
  const labelTopHitFailures = officialRows.filter((row) => row.labelTopHitBlockId !== row.id);

  assert.equal(rows.length, 156);
  assert.ok(rows.every((row) => row.area > 0), 'all Daejeon hit areas should have positive polygon area');
  assert.ok(pendingRows.length > 0, 'unmeasured Daejeon hit areas should stay pending instead of claiming traced precision');
  assert.ok(pendingRows.every((row) => row.sourceConfidence === 'UNVERIFIED'), 'pending Daejeon hit areas should lower source confidence');
  assert.ok(officialRows.every((row) => row.sourceConfidence === 'OFFICIAL'), 'official traced Daejeon hit areas should keep official confidence');
  assert.deepEqual(labelTopHitFailures, []);
});

test('대전 overlay 검수 실패 블록은 공식 트레이싱 완료로 표시하지 않는다', () => {
  const byId = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));

  [
    'innings-vip-400__400',
  ].forEach((id) => {
    const block = byId.get(id);
    assert.ok(block, `${id} failed audit block should exist`);
    assert.equal(block.traceStatus, 'NEEDS_OPERATOR_REVIEW', `${id} should stay pending until re-traced from the official PNG`);
    assert.equal(block.sourceConfidence, 'UNVERIFIED', `${id} should not claim official coordinate confidence`);
    assert.match(block.reviewNote ?? '', /재트레이싱|재측정|overlay|NEEDS_OPERATOR_REVIEW/, `${id} should explain why it is pending`);
  });
});

test('대전 overlay 재측정 완료 블록은 공식 트레이싱 상태로 승격된다', () => {
  const byId = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));

  [
    'first-infield-b-101-108__108',
    'first-infield-a-109-112-201-212__109',
    'first-table-4f-301-413__301',
    'first-table-4f-301-413__302',
    'first-table-4f-301-413__401',
    'first-table-4f-301-413__402',
    'first-table-4f-301-413__403',
    'first-table-4f-301-413__404',
    'first-table-4f-301-413__405',
    'first-table-4f-301-413__406',
    'first-table-4f-301-413__407',
    'first-table-4f-301-413__408',
    'first-table-4f-301-413__409',
    'first-table-4f-301-413__410',
    'first-table-4f-301-413__411',
    'first-table-4f-301-413__412',
    'first-table-4f-301-413__413',
    'third-table-4f-414-330__414',
    'third-table-4f-414-330__415',
    'third-table-4f-414-330__416',
    'third-table-4f-414-330__417',
    'third-table-4f-414-330__418',
    'third-table-4f-414-330__419',
    'third-table-4f-414-330__420',
    'third-table-4f-414-330__421',
    'third-table-4f-414-330__422',
    'third-table-4f-414-330__423',
    'third-table-4f-414-330__326',
    'third-table-4f-414-330__327',
    'third-table-4f-414-330__328',
    'third-table-4f-414-330__329',
    'third-table-4f-414-330__330',
    'outfield-lawn-500__500',
    ...Array.from({ length: 37 }, (_, index) => `skybox-s01-s37__s${String(index + 1).padStart(2, '0')}`),
  ].forEach((id) => {
    const block = byId.get(id);
    assert.ok(block, `${id} re-traced block should exist`);
    assert.equal(block.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${id} should be promoted after PNG pixel boundary tracing`);
    assert.equal(block.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${id} should use official image path tracing`);
    assert.equal(block.sourceConfidence, 'OFFICIAL', `${id} should recover official coordinate confidence`);
  });
});

test('대전 label 좌표는 측정 완료 블록에서 렌더 순서상 자기 블록을 최상위 hit-area로 가진다', () => {
  DAEJEON_BLOCKS.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED').forEach((block) => {
    const labelPoint: TestPoint = [block.imageGeometry.labelX, block.imageGeometry.labelY];

    assert.equal(
      getTopHitBlockIdAtPoint(labelPoint),
      block.id,
      `${block.id} label point should not be captured by ${getTopHitBlockIdAtPoint(labelPoint) ?? 'no block'}`,
    );
  });
});
