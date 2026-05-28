import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  INCHEON_BLOCKS,
  INCHEON_CATEGORIES,
  INCHEON_IMAGE_GEOMETRY_DRAFTS,
  INCHEON_SEATMAP_IMAGE,
  INCHEON_SEATMAP_VIEWPORT,
  getIncheonDecisionTags,
  getIncheonGuideMatches,
  getIncheonSeatViewAliases,
} from './incheonSeatData';

function numberedBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => `${start + index}B`);
}

test('인천 좌석도 공식 asset 상태를 명시한다', () => {
  assert.equal(INCHEON_SEATMAP_IMAGE.assetStatus, 'OFFICIAL');
  assert.equal(INCHEON_SEATMAP_IMAGE.imagePath, 'src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp');
  assert.equal(INCHEON_SEATMAP_IMAGE.optimizedImagePath, 'src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp');
  assert.equal(INCHEON_SEATMAP_IMAGE.requiredAssetFileName, 'incheon-ssg-seatmap-official-2026.webp');
  assert.equal(INCHEON_SEATMAP_IMAGE.imageWidth, 3360);
  assert.equal(INCHEON_SEATMAP_IMAGE.imageHeight, 5328);
  assert.ok(INCHEON_SEATMAP_IMAGE.sourceLabel);
  assert.equal(INCHEON_SEATMAP_IMAGE.sourceUrl, 'https://www.ssglanders.com/game/ticket');
  assert.ok(INCHEON_SEATMAP_VIEWPORT.cropY >= 0);
  assert.ok(INCHEON_SEATMAP_VIEWPORT.cropHeight > 0);
  assert.ok(INCHEON_SEATMAP_VIEWPORT.cropY + INCHEON_SEATMAP_VIEWPORT.cropHeight <= INCHEON_SEATMAP_IMAGE.imageHeight);
});

test('인천 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlocks = new Set<string>();

  INCHEON_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    block.officialBlocks.forEach((officialBlock) => {
      assert.ok(!officialBlocks.has(officialBlock), `${officialBlock} official block should be unique`);
      officialBlocks.add(officialBlock);
    });
  });
});

test('인천 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  INCHEON_BLOCKS.forEach((block) => {
    assert.ok(INCHEON_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.ok(block.officialBlocks.length > 0, `${block.id} official blocks should exist`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    assert.ok(block.imageGeometry.d.startsWith('M '), `${block.id} image geometry path should exist`);
    assert.ok((block.imageGeometry.d.match(/L /g)?.length ?? 0) >= 6, `${block.id} image geometry should use traced polygon/path data`);
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= INCHEON_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= INCHEON_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);

    const pathNumbers = block.imageGeometry.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    assert.ok(pathNumbers.length >= 4, `${block.id} image geometry should contain path coordinates`);
    pathNumbers.forEach((coordinate, index) => {
      const limit = index % 2 === 0 ? INCHEON_SEATMAP_IMAGE.imageWidth : INCHEON_SEATMAP_IMAGE.imageHeight;
      assert.ok(coordinate >= 0 && coordinate <= limit, `${block.id} path coordinate ${coordinate} should fit image bounds`);
    });
  });
});

test('인천 블록 geometry는 정적 공식 이미지 좌표 map에서만 공급된다', () => {
  const geometryIds = new Set(Object.keys(INCHEON_IMAGE_GEOMETRY_DRAFTS));
  const blockIds = new Set(INCHEON_BLOCKS.map((block) => block.id));

  assert.equal(geometryIds.size, blockIds.size);
  INCHEON_BLOCKS.forEach((block) => {
    assert.ok(geometryIds.has(block.id), `${block.id} should have static image geometry`);
  });

  Object.keys(INCHEON_IMAGE_GEOMETRY_DRAFTS).forEach((id) => {
    assert.ok(blockIds.has(id), `${id} should map to an existing block`);
  });

  const source = readFileSync(new URL('./incheonSeatData.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('SEATMAP_ELLIPSE'), false);
  assert.equal(source.includes('sectorPath'), false);
  assert.equal(source.includes('pointAt('), false);
  assert.equal(source.includes('createArcGroup'), false);
});

test('인천 대표 블록 좌표는 공식 이미지 실제 좌석도 영역에 고정된다', () => {
  const expectedBounds: Record<string, { x: [number, number]; y: [number, number] }> = {
    '101B': { x: [2500, 2620], y: [1950, 2080] },
    'N3': { x: [2480, 2620], y: [2050, 2200] },
    '28B': { x: [990, 1120], y: [2530, 2700] },
    '8B': { x: [2130, 2260], y: [2870, 3040] },
    '25B': { x: [1090, 1215], y: [2660, 2820] },
    '410B': { x: [1490, 1635], y: [3400, 3550] },
    '휠체어석 9B': { x: [2100, 2180], y: [2845, 2930] },
    '휠체어석 8B': { x: [2210, 2300], y: [2735, 2820] },
    'L9': { x: [900, 1020], y: [2860, 3010] },
    'R14': { x: [2500, 2625], y: [2600, 2750] },
    'C1': { x: [1820, 1935], y: [3260, 3360] },
    '301B': { x: [2680, 2810], y: [2410, 2560] },
    '418B': { x: [480, 610], y: [2460, 2600] },
    '로케트배터리 외야파티덱': { x: [1300, 1470], y: [1240, 1370] },
    '이마트바비큐존': { x: [2260, 2430], y: [1430, 1570] },
    '휠체어석 25B': { x: [1070, 1140], y: [2740, 2820] },
    '휠체어석 23B': { x: [1180, 1260], y: [2850, 2930] },
  };

  Object.entries(expectedBounds).forEach(([blockName, bounds]) => {
    const block = INCHEON_BLOCKS.find((candidate) => candidate.block === blockName);
    assert.ok(block, `${blockName} should exist`);
    assert.ok(block.imageGeometry.labelX >= bounds.x[0] && block.imageGeometry.labelX <= bounds.x[1], `${blockName} label x should stay near official image block`);
    assert.ok(block.imageGeometry.labelY >= bounds.y[0] && block.imageGeometry.labelY <= bounds.y[1], `${blockName} label y should stay near official image block`);
  });
});

test('인천 공식 좌석도 전체 블록과 특수 구역을 포함한다', () => {
  const officialBlocks = new Set(INCHEON_BLOCKS.flatMap((block) => block.officialBlocks));
  const requiredOfficialBlocks = [
    ...numberedBlocks(101, 118),
    ...numberedBlocks(201, 209),
    ...numberedBlocks(301, 308),
    ...numberedBlocks(401, 418),
    ...numberedBlocks(1, 10),
    ...numberedBlocks(11, 32),
    ...numberedBlocks(36, 45),
    ...Array.from({ length: 4 }, (_, index) => `N${index + 1}`),
    ...Array.from({ length: 6 }, (_, index) => `V${index + 1}`),
    ...Array.from({ length: 18 }, (_, index) => `L${index + 1}`),
    ...Array.from({ length: 18 }, (_, index) => `R${index + 1}`),
    'C1',
    'C2',
    '홈런커플존 1루',
    '홈런커플존 3루',
    '로케트배터리 외야파티덱',
    '몰리스 그린존',
    '초가정자',
    '외야패밀리존',
    '이마트 프렌들리존',
    '도드람한돈 바비큐존',
    '이마트바비큐존',
    '휠체어석 9B',
    '휠체어석 8B',
    '휠체어석 23B',
    '휠체어석 25B',
  ];

  assert.ok(INCHEON_BLOCKS.length >= 150, 'official SSG seat map should expose full block-level hit areas');
  requiredOfficialBlocks.forEach((officialBlock) => {
    assert.ok(officialBlocks.has(officialBlock), `${officialBlock} should exist`);
  });

  assert.ok(INCHEON_BLOCKS.some((block) => block.category === 'CHEERING'), 'home cheering section should exist');
  assert.ok(INCHEON_BLOCKS.some((block) => block.category === 'AWAY'), 'away cheering section should exist');
  assert.ok(INCHEON_BLOCKS.some((block) => block.category === 'ACCESSIBLE'), 'accessible seating should exist');
});

test('인천 seat view alias helper는 공식 좌석/시야 검색 alias 계약을 유지한다', () => {
  const accessibleBlock = INCHEON_BLOCKS.find((block) => block.block === '휠체어석 8B');
  assert.ok(accessibleBlock);
  const aliases = getIncheonSeatViewAliases(accessibleBlock);
  assert.ok(aliases.includes('인천 SSG 랜더스필드'));
  assert.ok(aliases.includes('SSG 랜더스'));
  assert.ok(aliases.includes('휠체어석 8B'));
});

test('인천 가이드 helper는 정확한 블록 검색을 최우선으로 정렬한다', () => {
  const matches = getIncheonGuideMatches('전체', '101B');

  assert.ok(matches.length > 0);
  assert.equal(matches[0].block.block, '101B');
  assert.ok(matches[0].reasons.includes('검색 일치'));
});

test('인천 가이드 helper는 홈 응원 intent를 정적 좌석 데이터에서만 파생한다', () => {
  const matches = getIncheonGuideMatches('홈 응원', '');

  assert.ok(matches.length > 0);
  assert.ok(matches.every((match) => match.block.fanRole === 'HOME'));
  assert.ok(matches.some((match) => match.tags.includes('홈 응원')));
});

test('인천 가이드 helper는 원정/3루 intent를 원정 또는 3루 블록으로 제한한다', () => {
  const matches = getIncheonGuideMatches('원정/3루', '');

  assert.ok(matches.length > 0);
  assert.ok(matches.every((match) => match.block.fanRole === 'AWAY' || match.block.side === 'THIRD_BASE'));
  assert.ok(matches.some((match) => match.tags.includes('원정/3루')));
});

test('인천 가이드 helper는 바비큐 검색을 공식 카테고리/alias에서 찾는다', () => {
  const matches = getIncheonGuideMatches('전체', '바비큐');

  assert.ok(matches.length > 0);
  assert.ok(matches.every((match) => match.tags.includes('바비큐')));
});

test('인천 가이드 helper는 휠체어 검색과 접근성 태그를 연결한다', () => {
  const matches = getIncheonGuideMatches('전체', '휠체어');
  const accessibleBlock = INCHEON_BLOCKS.find((block) => block.block === '휠체어석 8B');
  assert.ok(accessibleBlock);

  assert.ok(matches.length > 0);
  assert.ok(matches.every((match) => match.tags.includes('접근성')));
  assert.ok(getIncheonDecisionTags(accessibleBlock).includes('휠체어석'));
});

test('인천 가이드 helper는 존재하지 않는 검색어를 추천하지 않는다', () => {
  const matches = getIncheonGuideMatches('전체', '없는좌석검색어');

  assert.deepEqual(matches, []);
});
