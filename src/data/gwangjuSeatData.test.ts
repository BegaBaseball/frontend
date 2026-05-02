import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  GWANGJU_BLOCKS,
  GWANGJU_CATEGORIES,
  GWANGJU_CATEGORY_GROUPS,
  GWANGJU_COORDINATE_TRACE_STATUS,
  GWANGJU_IMAGE_GEOMETRY_DRAFTS,
  GWANGJU_MYSEATCHECK_REFERENCE_URL,
  GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
  GWANGJU_SELECTABLE_BLOCKS_READY,
  GWANGJU_SEATMAP_COORDINATES_READY,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_TRACE_REVIEW_REGIONS,
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

function parsePolygonPoints(pathData: string): Array<[number, number]> {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: Array<[number, number]> = [];

  for (let index = 0; index < numbers.length; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
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
    'K5',
    'SKY_PICNIC',
    'FIVE_TABLE',
    'OUTFIELD',
    'BLEACHERS_TABLE',
  ].forEach((category) => {
    assert.ok(groupedCategories.includes(category), `${category} should stay visible in active category filters`);
  });
  ['K7', 'AWAY', 'EV', 'K3'].forEach((category) => {
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
    ['officialBlocks', 'side', 'fanRole', 'points', 'labelX', 'labelY', 'shortLabel'].forEach((field) => {
      assert.ok(requirement.requiredFields.includes(field), `${name} should require ${field}`);
    });
  });
});

test('광주 정상 좌석도는 운영자 pending 안내 배너를 노출하지 않는다', () => {
  const source = readFileSync(new URL('../components/gwangju/GwangjuSeatMapSvg.tsx', import.meta.url), 'utf8');

  assert.equal(source.includes('일부 좌석 선택 준비 중'), false);
  assert.equal(source.includes('hasPendingOperatorSections'), false);
  assert.equal(source.includes('GWANGJU_SEATMAP_COORDINATES_READY'), false);
  assert.ok(source.includes('GWANGJU_NON_SELECTABLE_MARKER_ZONES'), 'marker-only zones should be blocked above seat polygons');
  assert.ok(source.includes('좌표 보정 중'), 'retrace-only coordinate notice should remain available');
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
});

test('광주 좌석도는 rotated box 초안이 남아 있으면 선택 활성화를 막고 재트레이싱 상태로 유지한다', () => {
  const source = readFileSync(new URL('./gwangjuSeatData.ts', import.meta.url), 'utf8');
  const hasGeneratedRotatedBoxes = source.includes('orientedBox(');
  const fiveTableReviewRegion = GWANGJU_TRACE_REVIEW_REGIONS.find((region) => region.id === 'five-table-numbered');

  if (hasGeneratedRotatedBoxes) {
    assert.equal(GWANGJU_COORDINATE_TRACE_STATUS, 'RETRACE_IN_PROGRESS');
    assert.equal(GWANGJU_SELECTABLE_BLOCKS_READY, false);
  }

  assert.equal(fiveTableReviewRegion?.method, 'OFFICIAL_IMAGE_PIXEL_TRACE');
  assert.equal(source.includes('FIVE_TABLE_GEOMETRY_CENTERS'), false);
  assert.equal(source.includes('orientedBox(cx, cy, 52, 76'), false);
});

test('광주 재트레이싱 manifest 대상은 active block과 운영자 대기 구역을 모두 설명한다', () => {
  assert.ok(GWANGJU_TRACE_REVIEW_REGIONS.length > 0);
  assert.ok(GWANGJU_TRACE_REVIEW_REGIONS.some((region) => region.method === 'GENERATED_ROTATED_BOX'));
  assert.ok(GWANGJU_TRACE_REVIEW_REGIONS.some((region) => region.method === 'OFFICIAL_IMAGE_PIXEL_TRACE'));
  assert.ok(GWANGJU_TRACE_REVIEW_REGIONS.some((region) => region.method === 'OPERATOR_REQUIRED'));

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

  if (GWANGJU_SEATMAP_COORDINATES_READY) {
    ['K7', 'AWAY'].forEach((category) => {
      assert.ok(categories.has(category), `${category} category should exist after operator confirmation`);
    });
    ['K7석', '원정응원석'].forEach((officialBlock) => {
      assert.ok(officialBlocks.has(officialBlock), `${officialBlock} should exist after operator confirmation`);
    });
  } else {
    assert.deepEqual([...GWANGJU_PENDING_OPERATOR_SECTIONS].sort(), ['K7석', '원정응원석'].sort());
    assert.equal(categories.has('K7'), false, 'K7 should not expose guessed hit areas before operator confirmation');
    assert.equal(categories.has('AWAY'), false, 'away section should not expose guessed hit areas before operator confirmation');
    assert.equal(officialBlocks.has('K7석'), false, 'K7 should not expose guessed official block before operator confirmation');
    assert.equal(officialBlocks.has('원정응원석'), false, 'away section should not expose guessed official block before operator confirmation');
  }
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
