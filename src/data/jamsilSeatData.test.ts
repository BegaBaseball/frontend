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
import {
  JAMSIL_MANUAL_OPERATOR_DATA_GAPS,
  JAMSIL_FIELD_VALIDATION_ROUTE_CANDIDATES,
  JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA,
  JAMSIL_OFFICIAL_FACILITY_MASTER,
  JAMSIL_OFFICIAL_GATE_MASTER,
  JAMSIL_OFFICIAL_MAP_INFERRED_GATE_CANDIDATES,
  JAMSIL_OFFICIAL_SEAT_GRADE_RANGES,
  JAMSIL_OFFICIAL_SEAT_SECTION_BASELINE,
  JAMSIL_OFFICIAL_STADIUM_PROFILE,
  JAMSIL_OFFICIAL_WHEELCHAIR_SEAT_LOCATIONS,
  JAMSIL_PRODUCTION_DATA_READINESS,
  JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES,
} from './jamsilOfficialSeedData';

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

test('잠실 공식 seed 데이터는 구장 기본 정보와 좌석 기준 데이터를 운영자 안내와 분리한다', () => {
  assert.equal(JAMSIL_OFFICIAL_STADIUM_PROFILE.stadiumId, 'JAMSIL');
  assert.equal(JAMSIL_OFFICIAL_STADIUM_PROFILE.dataStatus, 'AVAILABLE');
  assert.equal(JAMSIL_OFFICIAL_STADIUM_PROFILE.sourceType, 'OFFICIAL_PUBLIC_DATA');
  assert.equal(JAMSIL_OFFICIAL_STADIUM_PROFILE.seats, 24411);
  assert.equal(JAMSIL_OFFICIAL_STADIUM_PROFILE.capacity, 25000);
  assert.deepEqual(JAMSIL_OFFICIAL_STADIUM_PROFILE.operator, ['LG스포츠', '두산베어스']);

  assert.deepEqual(
    JAMSIL_OFFICIAL_SEAT_SECTION_BASELINE.normalSectionRanges,
    ['101-122', '201-226', '301-334', '401-422'],
  );
  assert.deepEqual(
    JAMSIL_OFFICIAL_SEAT_GRADE_RANGES.map((range) => range.seatGrade),
    ['레드석', '블루석', '테이블석', '오렌지석', '네이비석', '그린응원석', '그린석'],
  );
  assert.ok(JAMSIL_OFFICIAL_SEAT_SECTION_BASELINE.specialSections.some((section) => section.sectionId === 'JAMSIL_PREMIUM'));
});

test('잠실 공식 출입구 master는 section별 권장 출입구로 승격하지 않는다', () => {
  const gatesById = new Map(JAMSIL_OFFICIAL_GATE_MASTER.map((gate) => [gate.gateId, gate]));
  const centralGate = gatesById.get('JAMSIL_GATE_1_1');

  assert.equal(JAMSIL_OFFICIAL_GATE_MASTER.length, 5);
  assert.equal(gatesById.get('JAMSIL_GATE_2_3')?.officialGateLabel, '2-3 Gate');
  assert.equal(gatesById.get('JAMSIL_GATE_2_1')?.gateType, 'INFIELD');
  assert.equal(gatesById.get('JAMSIL_GATE_1_4')?.gateType, 'OUTFIELD');
  assert.equal(gatesById.get('JAMSIL_GATE_1_3')?.gateType, 'OUTFIELD');
  assert.ok(centralGate);
  assert.equal(centralGate?.status, 'RESTRICTED_OR_NEEDS_OPERATOR_CONFIRMATION');

  JAMSIL_OFFICIAL_MAP_INFERRED_GATE_CANDIDATES.forEach((candidate) => {
    assert.ok(gatesById.has(candidate.candidateGateId), `${candidate.candidateGateId} should map to a gate master row`);
    assert.equal(candidate.status, 'INFERRED_FROM_OFFICIAL_MAP');
    assert.equal(candidate.officialVerified, false);
    assert.equal(candidate.walkingMinutes, null);
    assert.equal(candidate.accessible, null);
  });
});

test('잠실 공식 시설 seed는 공개 확인 가능 시설과 수기 필요 gap을 함께 고정한다', () => {
  const facilitiesById = new Map(JAMSIL_OFFICIAL_FACILITY_MASTER.map((facility) => [facility.facilityId, facility]));
  const ticketOffice = facilitiesById.get('JAMSIL_TICKET_OFFICE_MAIN');
  const audioSupportDesk = facilitiesById.get('JAMSIL_KBO_AUDIO_SUPPORT_DESK');

  assert.ok(ticketOffice);
  assert.equal(ticketOffice?.category, '매표소');
  assert.equal(ticketOffice?.openStatus, 'GAME_DAY_OPERATION');
  assert.ok(ticketOffice?.hours?.weekday?.includes('경기 시작 1시간 30분 전'));
  assert.ok(ticketOffice?.hours?.weekendHoliday?.includes('경기 시작 2시간 전'));

  assert.ok(audioSupportDesk);
  assert.equal(audioSupportDesk?.relatedGateId, 'JAMSIL_GATE_2_3');
  assert.equal(audioSupportDesk?.reservationPhone, '1666-0720');
  assert.equal(audioSupportDesk?.sourceType, 'KBO_OFFICIAL');

  assert.deepEqual(
    JAMSIL_OFFICIAL_WHEELCHAIR_SEAT_LOCATIONS.map((location) => location.sectionId).sort(),
    ['JAMSIL_101', 'JAMSIL_102', 'JAMSIL_109', 'JAMSIL_114', 'JAMSIL_121', 'JAMSIL_122'].sort(),
  );
  assert.equal(JAMSIL_MANUAL_OPERATOR_DATA_GAPS.facilityLinkStatus, 'MANUAL_BASEBALL_DATA_REQUIRED');
  assert.ok(JAMSIL_MANUAL_OPERATOR_DATA_GAPS.missingOfficialFields.includes('sectionId별 가까운 매점'));
  assert.ok(JAMSIL_MANUAL_OPERATOR_DATA_GAPS.missingOfficialFields.includes('walkingMinutes'));
  assert.ok(JAMSIL_MANUAL_OPERATOR_DATA_GAPS.missingOfficialFields.includes('경기일별 임시 동선 공지'));
});

test('잠실 현장 검증 후보와 매점 수집 schema는 확정 데이터와 분리된다', () => {
  const primaryRoute = JAMSIL_FIELD_VALIDATION_ROUTE_CANDIDATES.find((route) => route.routeId === 'JAMSIL_ROUTE_PUBLIC_TRANSIT_PRIMARY');
  const readinessByItem = new Map(JAMSIL_PRODUCTION_DATA_READINESS.map((item) => [item.item, item]));

  assert.ok(primaryRoute);
  assert.equal(primaryRoute?.station, '종합운동장역');
  assert.match(primaryRoute?.publicTransportText ?? '', /5,6번 출구/);
  assert.equal(primaryRoute?.validationStatus, 'FIELD_VALIDATION_REQUIRED');
  assert.ok(primaryRoute?.mappedGateIds.includes('JAMSIL_GATE_2_3'));
  assert.ok(primaryRoute?.mappedGateIds.includes('JAMSIL_GATE_1_3'));
  assert.ok(primaryRoute?.missingFields.includes('권역별 실측 이동시간'));

  assert.equal(JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA.status, 'MANUAL_BASEBALL_DATA_REQUIRED');
  assert.deepEqual(JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA.allowedFloors, [1, 2, 3, 4]);
  assert.ok(JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA.requiredFields.some((field) => field.field === 'facilityName'));
  assert.ok(JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA.requiredFields.some((field) => field.field === 'nearSectionIds'));
  assert.ok(JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA.requiredFields.some((field) => field.field === 'verificationStatus'));
  assert.match(JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA.runtimeRule, /확정 데이터로 노출하지 않는다/);

  assert.equal(JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES.length, 6);
  assert.ok(JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES.some((zone) => zone.zoneId === 'JAMSIL_FOOD_2F_1B_CONCOURSE'));
  assert.ok(JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES.some((zone) => zone.storeNames.includes('GS25')));
  assert.ok(JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES.some((zone) => zone.storeNames.includes('BHC')));
  JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES.forEach((zone) => {
    assert.equal(zone.sourceType, 'SECONDARY_MAP_DERIVED');
    assert.equal(zone.dataStatus, 'SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION');
    assert.equal(zone.runtimeExposure, 'DISABLED_UNTIL_OPERATOR_CONFIRMED');
    assert.ok(zone.operatorRequiredFields.includes('verificationStatus'), `${zone.zoneId} should require verificationStatus`);
    assert.doesNotMatch(JSON.stringify(zone), /https?:\/\/|www\./i);
  });

  assert.equal(readinessByItem.get('seatSections')?.runtimeStatus, 'AVAILABLE');
  assert.equal(readinessByItem.get('gateMaster')?.runtimeStatus, 'PARTIAL_OFFICIAL_SEED');
  assert.equal(readinessByItem.get('sectionGateMapping')?.runtimeStatus, 'INFERRED_FROM_OFFICIAL_MAP');
  assert.equal(readinessByItem.get('foodStores')?.runtimeStatus, 'MANUAL_BASEBALL_DATA_REQUIRED');
  assert.equal(readinessByItem.get('realWalkingMinutes')?.runtimeStatus, 'FIELD_VALIDATION_REQUIRED');
});

test('잠실 매점 후보 검수 작업표는 운영자 확정 row와 수동 반영 전용 플래그를 보유한다', () => {
  const csv = readFileSync(new URL('../../docs/stadium/jamsil-food-candidate-review.csv', import.meta.url), 'utf8').trim();
  const [headerLine, ...lines] = csv.split(/\r?\n/);
  const headers = headerLine.split(',');
  const expectedRows = JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES.reduce((sum, zone) => sum + zone.storeNames.length, 0);
  const candidatePairs = new Set(JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES.flatMap((zone) => (
    zone.storeNames.map((storeName) => `${zone.zoneId}::${storeName}`)
  )));
  const blockRange = (start: number, end: number) => Array.from(
    { length: end - start + 1 },
    (_, index) => `block-${start + index}`,
  ).join(';');
  const expectedNearSectionsByZone = new Map([
    ['JAMSIL_FOOD_1F_1B_OUTSIDE', blockRange(101, 113)],
    ['JAMSIL_FOOD_1F_3B_OUTSIDE', blockRange(114, 122)],
    ['JAMSIL_FOOD_2F_1B_CONCOURSE', blockRange(201, 213)],
    ['JAMSIL_FOOD_2F_3B_CONCOURSE', blockRange(214, 226)],
    ['JAMSIL_FOOD_OUTFIELD_BACKSIDE', blockRange(401, 422)],
    ['JAMSIL_FOOD_3F_4F', `${blockRange(301, 334)};${blockRange(401, 422)}`],
  ]);
  const operatorFacilityIds = new Set<string>();

  assert.equal(lines.length, expectedRows);
  [
    'candidateZoneId',
    'candidateStoreName',
    'candidateStatus',
    'runtimeExposure',
    'operatorFacilityId',
    'operatorNearSectionIds',
    'operatorVerificationStatus',
  ].forEach((column) => {
    assert.ok(headers.includes(column), `candidate review CSV should include ${column}`);
  });

  lines.forEach((line, index) => {
    const values = line.split(',');
    assert.equal(values.length, headers.length, `${line} should keep the CSV column width`);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    const csvRowNumber = index + 2;
    assert.ok(candidatePairs.has(`${row.candidateZoneId}::${row.candidateStoreName}`));
    assert.equal(row.candidateStatus, 'SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION');
    assert.equal(row.runtimeExposure, 'DISABLED_UNTIL_OPERATOR_CONFIRMED');
    assert.equal(row.operatorFacilityId, `jamsil-facility-concession-food-${String(csvRowNumber).padStart(3, '0')}`);
    assert.equal(row.operatorNearSectionIds, expectedNearSectionsByZone.get(row.candidateZoneId));
    assert.equal(row.operatorLocationText, row.candidateLocationText);
    assert.equal(row.operatorOpenStatus, 'UNKNOWN');
    assert.equal(row.operatorAccessible, 'UNKNOWN');
    assert.equal(row.operatorWalkingMinutes, 'UNKNOWN');
    assert.equal(row.operatorVerificationStatus, 'OPERATOR_CONFIRMED');
    assert.equal(row.reviewerNote, 'user-provided operator confirmation 2026-05-31');
    assert.equal(operatorFacilityIds.has(row.operatorFacilityId), false);
    operatorFacilityIds.add(row.operatorFacilityId);
    assert.doesNotMatch(line, /https?:\/\/|www\./i);
  });

  assert.equal(operatorFacilityIds.size, expectedRows);
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
