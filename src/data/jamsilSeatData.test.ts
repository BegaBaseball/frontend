import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildSeatViewSectionQueries, dedupeSeatViewPhotos } from '../components/SeatViewGallery';
import {
  JAMSIL_BLOCKS,
  JAMSIL_CATEGORIES,
  JAMSIL_DOOSAN_STADIUM_GUIDE,
  JAMSIL_OFFICIAL_REFERENCES,
  JAMSIL_SEATMAP_IMAGE,
} from './jamsilSeatData';

function rangeBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

test('잠실 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlocks = new Set<string>();

  JAMSIL_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    block.officialBlocks.forEach((officialBlock) => {
      assert.ok(!officialBlocks.has(officialBlock), `${officialBlock} official block should be unique`);
      officialBlocks.add(officialBlock);
    });
  });
});

test('잠실 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  JAMSIL_BLOCKS.forEach((block) => {
    assert.ok(JAMSIL_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.ok(block.officialBlocks.length > 0, `${block.id} official blocks should exist`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    assert.ok(block.imageGeometry.d.startsWith('M '), `${block.id} image geometry path should exist`);
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= JAMSIL_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= JAMSIL_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);

    const pathNumbers = block.imageGeometry.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    assert.ok(pathNumbers.length >= 4, `${block.id} image geometry should contain path coordinates`);
    pathNumbers.forEach((coordinate, index) => {
      const limit = index % 2 === 0 ? JAMSIL_SEATMAP_IMAGE.imageWidth : JAMSIL_SEATMAP_IMAGE.imageHeight;
      assert.ok(coordinate >= 0 && coordinate <= limit, `${block.id} path coordinate ${coordinate} should fit image bounds`);
    });
  });
});

test('잠실 좌석도 이미지는 공식 asset 준비 상태를 명시한다', () => {
  assert.equal(JAMSIL_SEATMAP_IMAGE.assetStatus, 'OFFICIAL');
  assert.equal(JAMSIL_SEATMAP_IMAGE.imagePath, 'src/assets/stadiums/lg/jamsil-lg-seatmap-default-2026.webp');
  assert.equal(JAMSIL_SEATMAP_IMAGE.imageWidth, 1570);
  assert.equal(JAMSIL_SEATMAP_IMAGE.imageHeight, 1570);
  assert.equal(JAMSIL_SEATMAP_IMAGE.requiredAssetFileName, 'jamsil-lg-seatmap-default-2026.webp');
  assert.ok(JAMSIL_SEATMAP_IMAGE.sourceLabel);
  assert.match(JAMSIL_SEATMAP_IMAGE.sourceUrl, /^https:\/\/www\.lgtwins\.com\/ticket\/general/);
});

test('잠실 공식 참고 이미지는 LG 좌석도와 두산 구장 안내를 모두 포함한다', () => {
  const lgReference = JAMSIL_OFFICIAL_REFERENCES.find((reference) => reference.id === 'LG');
  const doosanReference = JAMSIL_OFFICIAL_REFERENCES.find((reference) => reference.id === 'DOOSAN');

  assert.ok(lgReference);
  assert.equal(lgReference.kind, 'SEATMAP');
  assert.ok(lgReference.imagePaths.length >= 10);
  assert.ok(lgReference.imagePaths.every((imagePath) => imagePath.startsWith('src/assets/stadiums/lg/')));

  assert.ok(doosanReference);
  assert.equal(doosanReference.kind, 'STADIUM_GUIDE');
  assert.ok(doosanReference.imagePaths.length >= 5);
  assert.ok(doosanReference.imagePaths.every((imagePath) => imagePath.startsWith('src/assets/stadiums/doosan/')));
});

test('두산 공식 구장 안내 데이터는 좌석도 hit-area와 분리된 정적 안내 정보를 가진다', () => {
  const guide = JAMSIL_DOOSAN_STADIUM_GUIDE;
  const doosanReference = JAMSIL_OFFICIAL_REFERENCES.find((reference) => reference.id === 'DOOSAN');

  assert.ok(doosanReference);
  assert.equal(doosanReference.kind, 'STADIUM_GUIDE');
  assert.equal(guide.sourceLabel, doosanReference.sourceLabel);
  assert.equal(guide.sourceUrl, doosanReference.sourceUrl);
  assert.equal(guide.totalSeats, 25000);
  assert.ok(guide.overviewImage.imagePath.startsWith('src/assets/stadiums/doosan/'));
  assert.equal(guide.floorImages.length, 4);
  assert.ok(guide.floorImages.every((image) => image.imagePath.startsWith('src/assets/stadiums/doosan/')));
  assert.ok(guide.floorImages.every((image) => image.width > 0 && image.height > 0));
  assert.deepEqual(
    guide.seatCounts.map((seat) => seat.label),
    ['VIP석', '테이블석', '블루석', '레드석', '네이비석', '외야석'],
  );
  assert.ok(guide.entrances.publicEntrances.includes('1루 내야 출입구'));
  assert.ok(guide.transport.subway.some((item) => item.includes('종합운동장역')));
  assert.ok(guide.parking.stadium.some((item) => item.includes('2,200대')));
  assert.ok(guide.implementationNote.includes('구장 안내 자료'));
  assert.ok(!('imageGeometry' in guide), 'Doosan stadium guide should not be modeled as a clickable seat section');
});

test('잠실 데이터는 휠체어석과 2026 외야 응원 구역을 포함한다', () => {
  const accessibleBlocks = JAMSIL_BLOCKS.filter((block) => block.category === 'ACCESSIBLE');
  const outfieldCheerBlocks = JAMSIL_BLOCKS
    .filter((block) => block.category === 'OUTFIELD_CHEER')
    .flatMap((block) => block.officialBlocks)
    .sort();
  const outfieldBlocks = new Set(
    JAMSIL_BLOCKS
      .filter((block) => block.category === 'OUTFIELD')
      .flatMap((block) => block.officialBlocks),
  );

  assert.equal(accessibleBlocks.length, 2);
  assert.deepEqual(
    accessibleBlocks.flatMap((block) => block.officialBlocks).sort(),
    ['101B', '102B', '109B', '114B', '121B', '122B'].sort(),
  );
  assert.deepEqual(outfieldCheerBlocks, ['405', '406', '407', '408']);
  ['401', '402', '403', '404', ...rangeBlocks(409, 422)].forEach((block) => {
    assert.ok(outfieldBlocks.has(block), `${block} outfield block should exist`);
  });
});

test('잠실 데이터는 공식 이미지의 번호 블록을 블록 단위로 제공한다', () => {
  const officialBlocks = new Set(JAMSIL_BLOCKS.flatMap((block) => block.officialBlocks));
  const expectedNumberedBlocks = [
    ...rangeBlocks(101, 122),
    ...rangeBlocks(201, 226),
    ...rangeBlocks(301, 334),
    ...rangeBlocks(401, 422),
  ];

  expectedNumberedBlocks.forEach((block) => {
    const section = JAMSIL_BLOCKS.find((item) => item.officialBlocks.length === 1 && item.officialBlocks[0] === block);
    assert.ok(section, `${block} should have a dedicated clickable section`);
    assert.equal(section?.id, `block-${block}`);
    assert.ok(section?.seatViewSections.includes(block), `${block} should be a seat-view alias`);
    assert.ok(section?.seatViewSections.includes(`${block}블록`), `${block} block alias should exist`);
  });

  assert.equal(JAMSIL_BLOCKS.filter((block) => block.id.startsWith('block-')).length, expectedNumberedBlocks.length);
  assert.ok(officialBlocks.has('테라존'));
  assert.ok(officialBlocks.has('1루 익사이팅존'));
  assert.ok(officialBlocks.has('3루 익사이팅존'));
});

test('잠실 seat-view alias는 정확한 블록명부터 조회하도록 정렬한다', () => {
  const block205 = JAMSIL_BLOCKS.find((block) => block.id === 'block-205');

  assert.ok(block205);
  assert.deepEqual(
    block205.seatViewSections.slice(0, 5),
    ['205', '205블록', '잠실 205', '잠실 205블록', '205 블록 1루 오렌지석'],
  );
});

test('SeatViewGallery alias helper는 조회 순서와 사진 중복 제거를 보장한다', () => {
  assert.deepEqual(
    buildSeatViewSectionQueries('205 블록 1루 오렌지석', ['205', '205블록', '잠실 205', '205']),
    ['205 블록 1루 오렌지석', '205', '205블록', '잠실 205'],
  );

  const photos = dedupeSeatViewPhotos([
    [
      { photoUrl: '/a.jpg', stadium: 'JAMSIL', section: '205', block: '205', diaryDate: '2026-05-02' },
      { photoUrl: '/b.jpg', stadium: 'JAMSIL', section: '205', block: '205', diaryDate: '2026-05-02' },
    ],
    [
      { photoUrl: '/a.jpg', stadium: 'JAMSIL', section: '205블록', block: '205', diaryDate: '2026-05-02' },
    ],
  ]);

  assert.deepEqual(photos.map((photo) => photo.photoUrl), ['/a.jpg', '/b.jpg']);
});

test('잠실 일반 좌석도 UI에는 햇빛/날씨 레이어 잔여 코드가 없다', () => {
  const files = [
    '../components/jamsil/JamsilSeatMap.tsx',
    '../components/jamsil/JamsilSeatMapSvg.tsx',
    '../components/jamsil/JamsilUploadFlowModal.tsx',
    '../components/stadiumSeatMap/SeatMapDetailPanel.tsx',
    '../components/stadiumSeatMap/SeatMapBottomSheet.tsx',
    './jamsilSeatData.ts',
  ];

  files.forEach((file) => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.ok(!source.includes('sunMode'), `${file} should not use sunMode`);
    assert.ok(!source.includes('JAMSIL_SHADE_SCORE'), `${file} should not use shade score`);
    assert.ok(!source.includes('JAMSIL_SUN_DIRECTION'), `${file} should not use sun direction`);
    assert.ok(!source.includes('햇빛'), `${file} should not expose sun copy`);
    assert.ok(!source.includes('그늘'), `${file} should not expose shade copy`);
    assert.ok(!source.includes('야간 조명'), `${file} should not expose night-light copy`);
  });
});
