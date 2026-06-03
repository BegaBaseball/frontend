import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
  SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
  SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS,
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_CATEGORY_GROUPS,
  SAJIK_DEFAULT_SEATMAP_SOURCE_ID,
  SAJIK_OPERATOR_REFERENCE_IMAGE_SHA256,
  SAJIK_OPERATOR_REFERENCE_MAP_VERSION,
  SAJIK_OPERATOR_REFERENCE_VIEW_BOX,
  SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS,
  SAJIK_OFFICIAL_TRACE_REFERENCE,
  SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS,
  SAJIK_REFERENCE_URL,
  SAJIK_REQUIRED_OFFICIAL_SECTIONS,
  SAJIK_SEATMAP_IMAGE,
  SAJIK_SEATMAP_SOURCE_REFERENCES,
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
import {
  buildSajikSeatMapSectionPatchPayload,
  buildSajikSeatMapDataset,
  formatSajikSeatMapSectionPatchTsFragment,
  formatSajikSeatMapDatasetIssue,
  geometrySnapshotFromPolygons,
  SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS,
  validateSajikSeatMapDataset,
  validateSajikSeatMapDatasetIssues,
} from './sajikSeatMapDataset';
import {
  SAJIK_OPERATOR_REFERENCE_IMAGE,
  SAJIK_OPERATOR_REFERENCE_RUNTIME_SELECTION_ENABLED,
  SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET,
  SAJIK_OPERATOR_REFERENCE_SECTION_METADATA_OVERRIDES,
  validateSajikOperatorReferenceSeatMapDataset,
} from './sajikOperatorReferenceSeatMapDataset';
import {
  SAJIK_CANONICAL_ACCESSIBILITY_MARKERS,
  SAJIK_CANONICAL_ACCESSIBILITY_MARKER_ALIASES,
  SAJIK_CANONICAL_BLOCKS,
  SAJIK_CANONICAL_LEGACY_ALIAS_ONLY_BLOCKS,
  SAJIK_CANONICAL_OPERATOR_ONLY_SECTION_IDS,
  SAJIK_CANONICAL_SEATMAP_IMAGE,
  SAJIK_CANONICAL_SEATMAP_SOURCE_ID,
  SAJIK_CANONICAL_SEATMAP_SUMMARY,
  SAJIK_CANONICAL_SOURCE_POLICY,
  validateSajikCanonicalSeatMap,
} from './sajikCanonicalSeatMap';
import {
  distanceToPolygon as distanceToSeatMapPolygon,
  isSingleClosedPolygonPath,
  pathBounds,
  pathSubpathCount,
  pathToPoints,
  pointInPolygon,
  polygonArea,
  polygonSelfIntersections,
  segmentsIntersect,
  validateSeatMapPolygonPath,
  type SeatMapPoint,
} from '../utils/seatMapPolygonValidator';

function assertWithinTolerance(actual: number, expected: number, tolerance: number, message: string) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, actual ${actual}, tolerance ${tolerance}`);
}

const SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCK_SET = new Set<string>(SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS);
const SAJIK_EXPLICIT_HIT_PATH_BLOCKS = new Set<string>([
  'sajik-central-table-032',
  'sajik-accessible-휠체어석-3루',
]);

function isPointInsidePolygon(x: number, y: number, points: SeatMapPoint[]): boolean {
  return pointInPolygon([x, y], points);
}

function distanceToPolygon(px: number, py: number, points: SeatMapPoint[]): number {
  return distanceToSeatMapPolygon([px, py], points);
}

test('사직 좌석도 asset 상태는 공식 파일 준비 여부를 명시한다', () => {
  assert.equal(SAJIK_SEATMAP_IMAGE.stadiumId, 'BUSAN_SAJIK');
  assert.equal(SAJIK_SEATMAP_IMAGE.mapVersion, 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2');
  assert.equal(SAJIK_SEATMAP_IMAGE.imagePath, 'src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.webp');
  assert.equal(SAJIK_SEATMAP_IMAGE.requiredAssetFileName, 'sajik-lotte-seatmap-official-2026.webp');
  assert.equal(SAJIK_SEATMAP_IMAGE.viewBox, '0 0 960 640');
  assert.equal(SAJIK_SEATMAP_IMAGE.imageSha256, 'd943cef6e4c86530c9568e3d50d43303aab3f0102a19dc76f828547c79a20b13');
  assert.equal(SAJIK_SEATMAP_IMAGE.sourceUrl, SAJIK_REFERENCE_URL);
  assert.ok(SAJIK_SEATMAP_IMAGE.sourceLabel);
  assert.equal(SAJIK_SEATMAP_IMAGE.renderImagePath, undefined);
  assert.equal(SAJIK_SEATMAP_IMAGE.renderImageSha256, undefined);
  assert.equal(SAJIK_SEATMAP_IMAGE.renderImageNaturalWidth, undefined);
  assert.equal(SAJIK_SEATMAP_IMAGE.renderImageNaturalHeight, undefined);
  assert.equal(SAJIK_SEATMAP_IMAGE.renderImageSourceUrl, undefined);
  assert.equal(SAJIK_SEATMAP_IMAGE.renderImageSourceLabel, undefined);

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

test('사직 좌석도 source references는 operator reference를 기본 좌표계로 두고 공식 이미지를 secondary로 유지한다', () => {
  assert.equal(SAJIK_DEFAULT_SEATMAP_SOURCE_ID, 'OPERATOR_REFERENCE_2026');
  assert.equal(SAJIK_SEATMAP_SOURCE_REFERENCES.length, 2);
  assert.equal(SAJIK_SEATMAP_SOURCE_REFERENCES[0]?.id, 'OPERATOR_REFERENCE_2026');
  assert.equal(SAJIK_SEATMAP_SOURCE_REFERENCES[1]?.id, 'LOTTE_OFFICIAL_2026');

  const officialSource = SAJIK_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === 'LOTTE_OFFICIAL_2026');
  const operatorReference = SAJIK_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === 'OPERATOR_REFERENCE_2026');

  assert.ok(operatorReference);
  assert.equal(operatorReference.label, '기준 좌석도');
  assert.equal(operatorReference.kind, 'REFERENCE_IMAGE');
  assert.equal(operatorReference.assetStatus, 'OPERATOR_REFERENCE');
  assert.equal(operatorReference.polygonStatus, 'PRODUCTION_INTERACTIVE');
  assert.equal(operatorReference.imagePath, 'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp');
  assert.equal(operatorReference.imageWidth, 1151);
  assert.equal(operatorReference.imageHeight, 1367);
  assert.equal(operatorReference.viewBox, SAJIK_OPERATOR_REFERENCE_VIEW_BOX);
  assert.equal(operatorReference.imageSha256, SAJIK_OPERATOR_REFERENCE_IMAGE_SHA256);
  assert.equal(operatorReference.mapVersion, SAJIK_OPERATOR_REFERENCE_MAP_VERSION);
  assert.equal(operatorReference.sourceUrl, null);

  assert.ok(officialSource);
  assert.equal(officialSource.label, '공식 이미지');
  assert.equal(officialSource.kind, 'INTERACTIVE_SEATMAP');
  assert.equal(officialSource.assetStatus, 'OFFICIAL');
  assert.equal(officialSource.polygonStatus, 'PRODUCTION_INTERACTIVE');
  assert.equal(officialSource.imagePath, SAJIK_SEATMAP_IMAGE.imagePath);
  assert.equal(officialSource.viewBox, SAJIK_SEATMAP_IMAGE.viewBox);

  const referenceAssetPath = resolve(process.cwd(), operatorReference.imagePath);
  assert.equal(existsSync(referenceAssetPath), true, 'operator reference asset should be checked into static assets');
  assert.equal(
    createHash('sha256').update(readFileSync(referenceAssetPath)).digest('hex'),
    operatorReference.imageSha256,
    'operator reference asset hash should remain fixed',
  );
});

test('사직 operator reference polygon dataset은 선택 미리보기 runtime 계약으로 고정된다', () => {
  const dataset = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET;

  assert.equal(dataset.stadiumId, 'BUSAN_SAJIK');
  assert.equal(dataset.sourceId, 'OPERATOR_REFERENCE_2026');
  assert.equal(dataset.mapVersion, 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1');
  assert.equal(dataset.coordinateSystem, 'SVG_VIEW_BOX');
  assert.equal(dataset.runtimeSelectionEnabled, true);
  assert.equal(SAJIK_OPERATOR_REFERENCE_RUNTIME_SELECTION_ENABLED, true);
  assert.deepEqual(dataset.image, SAJIK_OPERATOR_REFERENCE_IMAGE);
  assert.equal(dataset.image.width, 1151);
  assert.equal(dataset.image.height, 1367);
  assert.equal(dataset.image.viewBox, SAJIK_OPERATOR_REFERENCE_VIEW_BOX);
  assert.equal(dataset.image.sha256, SAJIK_OPERATOR_REFERENCE_IMAGE_SHA256);
  assert.equal(dataset.image.sourceStatus, 'OPERATOR_REFERENCE');
  assert.deepEqual(dataset.summary, {
    sections: 78,
    markers: 14,
    stageCount: 4,
  });
  assert.deepEqual(validateSajikOperatorReferenceSeatMapDataset(dataset), []);
  assert.equal(SAJIK_SEATMAP_IMAGE.viewBox, '0 0 960 640', 'official production coordinate system should stay separated');

  const sectionIds = new Set<string>();
  const stageCounts = new Map<string, number>();
  const expectedVisibleSectionIds = [
    '021', '022', '023', '024',
    '031', '032', '033', '034', '041', '044',
    '051', '052', '053', '054', '055', '056', '057',
    '111', '112', '113', '114', '115', '116',
    '121', '122', '123', '124', '125', '126', '127',
    '131', '132', '133', '134', '135', '136', '137', '142', '143',
    '311', '312', '313', '314', '315', '316',
    '321', '322', '323', '324', '325', '326', '327',
    '331', '332', '333', '334', '335', '336', '337', '338', '342', '343',
    '721', '722', '723', '724', '732', '733', '734',
    '921', '922', '923', '924', '925', '931', '932', '933', '934',
  ];
  const expectedHitExpandedSectionIds = [...expectedVisibleSectionIds];
  const expectedManualHitExpandedSectionIds = new Set(['021']);
  const expectedHitExpandedSectionIdSet = new Set(expectedHitExpandedSectionIds);
  const actualHitExpandedSectionIds: string[] = [];
  const officialBlockIds = new Set(SAJIK_BLOCKS.flatMap((block) => [block.block, ...block.officialBlocks]));
  const officialMetadataMissingSectionIds: string[] = [];
  dataset.sections.forEach((section) => {
    assert.ok(!sectionIds.has(section.sectionId), `${section.sectionId} should be unique in operator reference dataset`);
    sectionIds.add(section.sectionId);
    stageCounts.set(section.stageId, (stageCounts.get(section.stageId) ?? 0) + 1);
    assert.equal(section.traceStatus, 'OPERATOR_APPROVED');
    assert.equal(section.geometryVersion, 'operator-reference-polygon-v1');
    if (expectedHitExpandedSectionIdSet.has(section.sectionId)) {
      actualHitExpandedSectionIds.push(section.sectionId);
      assert.notEqual(section.visualPath, section.hitPath, `${section.sectionId} should keep its approved touch hitPath expansion`);
      assert.notDeepEqual(section.visualPolygon, section.hitPolygon, `${section.sectionId} hit polygon should expand beyond the visual polygon`);
      assert.equal(section.hitPathExpansionPx, 3, `${section.sectionId} should record the approved touch hitPath buffer size`);
      assert.equal(
        section.hitPathExpansionSource,
        expectedManualHitExpandedSectionIds.has(section.sectionId) ? 'MANUAL_TOUCH_POLYGON_V1' : 'CENTROID_RADIAL_BUFFER_V1',
        `${section.sectionId} should record the touch hitPath expansion source`,
      );
      assert.ok(
        polygonArea(section.hitPolygon) > polygonArea(section.visualPolygon),
        `${section.sectionId} hit polygon should be larger than the visual polygon`,
      );
    } else {
      assert.equal(section.visualPath, section.hitPath, `${section.sectionId} hitPath should mirror visualPath until an explicit touch hit-area is approved`);
      assert.deepEqual(section.visualPolygon, section.hitPolygon, `${section.sectionId} hit polygon should mirror visual polygon until an explicit touch hit-area is approved`);
      assert.equal(section.hitPathExpansionPx, undefined, `${section.sectionId} should not carry unused hitPath expansion metadata`);
      assert.equal(section.hitPathExpansionSource, undefined, `${section.sectionId} should not carry unused hitPath expansion metadata`);
    }
    assert.ok(section.visualPolygon.length >= 3, `${section.sectionId} should have at least 3 polygon points`);
    assert.ok(section.visualPolygon.length <= 8, `${section.sectionId} should not trace label/icon extraction noise as polygon vertices`);
    assert.ok(section.operatorReview.reviewer, `${section.sectionId} should keep reviewer metadata`);
    assert.ok(section.operatorReview.reviewedAt, `${section.sectionId} should keep review timestamp`);
    if (!officialBlockIds.has(section.sectionId)) {
      officialMetadataMissingSectionIds.push(section.sectionId);
    }

    const bounds = pathBounds(section.visualPath);
    assert.ok(bounds.minX >= 0 && bounds.maxX <= dataset.image.width, `${section.sectionId} x bounds should fit reference image`);
    assert.ok(bounds.minY >= 0 && bounds.maxY <= dataset.image.height, `${section.sectionId} y bounds should fit reference image`);
    const [labelX, labelY] = section.labelPoint;
    assert.ok(labelX >= 0 && labelX <= dataset.image.width, `${section.sectionId} label x should fit reference image`);
    assert.ok(labelY >= 0 && labelY <= dataset.image.height, `${section.sectionId} label y should fit reference image`);
  });

  assert.equal(stageCounts.get('stage01'), 17);
  assert.equal(stageCounts.get('stage02'), 22);
  assert.equal(stageCounts.get('stage03'), 30);
  assert.equal(stageCounts.get('stage04'), 9);
  assert.deepEqual([...sectionIds].sort(), expectedVisibleSectionIds, 'operator reference should cover every image-analysis visible labeled section');
  assert.deepEqual(
    actualHitExpandedSectionIds.sort(),
    expectedHitExpandedSectionIds,
    'operator reference touch hitPath expansion should stay limited to topology-approved small sections',
  );
  assert.deepEqual(
    officialMetadataMissingSectionIds,
    ['323', '322', '921'],
    'reference-only sections should not be added to official production SAJIK_BLOCKS',
  );
  assert.deepEqual(
    SAJIK_OPERATOR_REFERENCE_SECTION_METADATA_OVERRIDES.map((override) => override.sectionId),
    officialMetadataMissingSectionIds,
    'reference-only sections should have explicit preview metadata overrides before promotion preview',
  );

  const markerIds = new Set<string>();
  const linkedSelectableMarkerIds = new Set([
    'stage02-wheelchair-01',
    'stage02-wheelchair-03',
    'stage02-wheelchair-04',
    'stage02-wheelchair-09',
    'stage03-wheelchair-01',
    'stage03-wheelchair-02',
    'stage03-wheelchair-04',
    'stage03-wheelchair-05',
  ]);
  const expectedMarkerSectionIds = new Map<string, string>([
    ['stage02-wheelchair-01', '137'],
    ['stage02-wheelchair-02', '127'],
    ['stage02-wheelchair-03', '125'],
    ['stage02-wheelchair-04', '135'],
    ['stage02-wheelchair-05', '124'],
    ['stage02-wheelchair-06', '133'],
    ['stage02-wheelchair-07', '123'],
    ['stage02-wheelchair-08', '122'],
    ['stage02-wheelchair-09', '132'],
    ['stage03-wheelchair-01', '325'],
    ['stage03-wheelchair-02', '335'],
    ['stage03-wheelchair-03', '324'],
    ['stage03-wheelchair-04', '333'],
    ['stage03-wheelchair-05', '323'],
  ]);
  dataset.markers.forEach((marker) => {
    assert.ok(!markerIds.has(marker.markerId), `${marker.markerId} should be unique in operator reference marker dataset`);
    markerIds.add(marker.markerId);
    assert.equal(marker.markerType, 'WHEELCHAIR');
    const expectedInteractionStatus = linkedSelectableMarkerIds.has(marker.markerId)
      ? 'LINKED_SECTION_SELECTABLE'
      : 'DISPLAY_ONLY';
    assert.equal(marker.markerInteractionStatus, expectedInteractionStatus, `${marker.markerId} interaction policy should match operator approval`);
    assert.equal(marker.enabled, linkedSelectableMarkerIds.has(marker.markerId), `${marker.markerId} enabled flag should follow marker interaction policy`);
    assert.equal(marker.source, 'IMAGE_ANALYSIS_COMPONENT');
    assert.equal(marker.relatedSectionId, expectedMarkerSectionIds.get(marker.markerId), `${marker.markerId} should keep its image-analysis related section`);
    assert.ok(sectionIds.has(marker.relatedSectionId), `${marker.markerId} relatedSectionId should exist in reference sections`);
    const [x, y] = marker.position;
    assert.ok(x >= 0 && x <= dataset.image.width, `${marker.markerId} x should fit reference image`);
    assert.ok(y >= 0 && y <= dataset.image.height, `${marker.markerId} y should fit reference image`);
    const containingSections = dataset.sections.filter((section) => pointInPolygon([x, y], section.visualPolygon));
    assert.equal(
      containingSections.length,
      1,
      `${marker.markerId} marker point should be covered by exactly one continuous seat polygon after marker-layer split`,
    );
    assert.equal(containingSections[0].sectionId, marker.relatedSectionId, `${marker.markerId} relatedSectionId should match containing section`);
  });
  assert.equal(markerIds.size, expectedMarkerSectionIds.size);
});

test('사직 canonical 좌석도는 operator-reference 1151x1367 좌표계의 단일 runtime source다', () => {
  assert.equal(SAJIK_CANONICAL_SEATMAP_SOURCE_ID, 'SAJIK_CANONICAL_2026');
  assert.equal(SAJIK_CANONICAL_SEATMAP_IMAGE.mapVersion, 'BUSAN_SAJIK_2026_CANONICAL_OPERATOR_REFERENCE_V1');
  assert.equal(SAJIK_CANONICAL_SEATMAP_IMAGE.imagePath, 'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp');
  assert.equal(SAJIK_CANONICAL_SEATMAP_IMAGE.imageWidth, 1151);
  assert.equal(SAJIK_CANONICAL_SEATMAP_IMAGE.imageHeight, 1367);
  assert.equal(SAJIK_CANONICAL_SEATMAP_IMAGE.viewBox, '0 0 1151 1367');
  assert.equal(SAJIK_CANONICAL_SEATMAP_IMAGE.imageSha256, SAJIK_OPERATOR_REFERENCE_IMAGE_SHA256);
  assert.deepEqual(validateSajikCanonicalSeatMap(), []);
  assert.deepEqual(SAJIK_CANONICAL_SEATMAP_SUMMARY, {
    sourceId: 'SAJIK_CANONICAL_2026',
    mapVersion: 'BUSAN_SAJIK_2026_CANONICAL_OPERATOR_REFERENCE_V1',
    activeBlocks: 78,
    activeSeatSections: 78,
    accessibilityMarkers: 14,
    linkedAccessibilityMarkers: 8,
    legacyAliasOnlyBlocks: 11,
    legacyAccessibilityMarkerAliases: 3,
    operatorOnlyBlocks: 3,
  });

  const canonicalSectionIds = SAJIK_CANONICAL_BLOCKS.map((block) => block.block);
  const duplicateCanonicalSectionIds = canonicalSectionIds.filter((sectionId, index) => (
    canonicalSectionIds.indexOf(sectionId) !== index
  ));
  assert.deepEqual(duplicateCanonicalSectionIds, []);
  assert.deepEqual(
    [...SAJIK_CANONICAL_OPERATOR_ONLY_SECTION_IDS].sort(),
    ['322', '323', '921'],
  );
  assert.deepEqual(
    [...SAJIK_CANONICAL_OPERATOR_ONLY_SECTION_IDS].filter((sectionId) => !canonicalSectionIds.includes(sectionId)),
    [],
  );
  assert.equal(
    SAJIK_CANONICAL_BLOCKS.every((block) => (
      block.canonicalSourceId === 'SAJIK_CANONICAL_2026'
      && block.mapInteractionStatus === 'MAP_SELECTABLE'
      && block.sectionKind === 'SEAT_SECTION'
    )),
    true,
  );
  assert.equal(SAJIK_CANONICAL_ACCESSIBILITY_MARKERS.length, 14);
  assert.equal(SAJIK_CANONICAL_ACCESSIBILITY_MARKERS.filter((marker) => marker.enabled).length, 8);
  assert.deepEqual(
    SAJIK_CANONICAL_LEGACY_ALIAS_ONLY_BLOCKS.map((block) => block.block).sort(),
    [
      '011',
      '012',
      '013',
      '901',
      '902',
      '903',
      '911',
      '912',
      '913',
      '914',
      '935',
    ],
  );
  assert.deepEqual(
    SAJIK_CANONICAL_ACCESSIBILITY_MARKER_ALIASES.map((marker) => marker.markerId).sort(),
    ['휠체어석-1루', '휠체어석-3루', '휠체어석-중앙'],
  );
  assert.equal(SAJIK_CANONICAL_ACCESSIBILITY_MARKER_ALIASES.every((marker) => marker.runtimePolygon === false), true);
  assert.equal(SAJIK_CANONICAL_SOURCE_POLICY.legacyOfficialImageRuntimeRole, 'historical QA/reference only');
  assert.equal(SAJIK_CANONICAL_SOURCE_POLICY.missingOperatorImageBlockPolicy, 'legacy alias only; no runtime polygon until operator-reference trace exists');
  assert.equal(SAJIK_CANONICAL_SOURCE_POLICY.legacyOfficialWheelchairMarkerPolicy, 'canonical marker alias only; no seat polygon runtime source');
});

test('사직 공식 asset 파일과 데이터 상태는 함께 전환되어야 한다', () => {
  const assetPath = resolve(process.cwd(), SAJIK_SEATMAP_IMAGE.imagePath);
  const assetExists = existsSync(assetPath);

  if (SAJIK_SEATMAP_IMAGE.assetStatus === 'OFFICIAL') {
    assert.equal(assetExists, true, 'OFFICIAL 상태에서는 승인된 사직 좌석도 asset 파일이 있어야 한다');
    assert.equal(SAJIK_BLOCKS.length, 89, 'OFFICIAL 상태에서는 사직 블록 hit-area 데이터가 89개여야 한다');
    assert.equal(
      createHash('sha256').update(readFileSync(assetPath)).digest('hex'),
      SAJIK_SEATMAP_IMAGE.imageSha256,
      'OFFICIAL 상태에서는 승인된 사직 좌석도 asset hash가 mapVersion 기준과 일치해야 한다',
    );
  } else {
    assert.equal(
      assetExists,
      false,
      '승인된 사직 좌석도 asset 파일이 추가되면 assetStatus를 OFFICIAL로 바꾸고 블록 좌표를 수동 입력해야 한다',
    );
  }
});

test('사직 고해상도 source audit는 수동 후보만 검증하고 런타임 hotlink를 막는다', () => {
  const dispatcherSource = readFileSync(resolve(process.cwd(), 'scripts/stadium-seatmap-ops.mjs'), 'utf8');
  const scriptSource = readFileSync(resolve(process.cwd(), 'scripts/sajik-seatmap-source-audit.mjs'), 'utf8');

  assert.match(dispatcherSource, /'source-audit': \[/);
  assert.match(scriptSource, /OFFICIAL_PUBLIC_CANDIDATE_URLS/);
  assert.match(scriptSource, /giantsclub\.com/);
  assert.match(scriptSource, /ticketlink\.co\.kr/);
  assert.match(scriptSource, /sj_info_bg@2x\.jpg/);
  assert.match(scriptSource, /sj_info_bg_original\.jpg/);
  assert.match(scriptSource, /FALLBACK_HTML_NOT_IMAGE_ASSET/);
  assert.match(scriptSource, /NOT_HIGH_RESOLUTION_SOURCE/);
  assert.match(scriptSource, /OPERATOR_SOURCE_LABEL_REQUIRED/);
  assert.match(scriptSource, /APPROVED_FOR_STATIC_IMPORT/);
  assert.match(scriptSource, /acceptsRuntimeHotlink: false/);
  assert.doesNotMatch(scriptSource, /puppeteer|playwright|cheerio|crawl|scrap/i);
});

test('사직 historical operator reference 스크립트는 public release 계약에서 제외된다', () => {
  const packageJson = readFileSync(resolve(process.cwd(), 'package.json'), 'utf8');
  const packageScripts = JSON.parse(packageJson).scripts as Record<string, string>;
  const publicOperatorReferenceAliases = Object.keys(packageScripts).filter((key) => key.includes(':sajik:operator-reference'));
  const publicStageAliases = Object.keys(packageScripts).filter((key) => key.includes(':sajik:stage01'));

  assert.deepEqual(publicOperatorReferenceAliases, []);
  assert.deepEqual(publicStageAliases, []);
  assert.equal(packageScripts['qa:stadium:sajik:release-lock'], 'node scripts/stadium-seatmap-ops.mjs sajik release-lock');
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
    assert.equal(block.imageGeometry.visualPath, block.imageGeometry.d, `${block.id} visual path should default to the official traced path`);
    if (SAJIK_EXPLICIT_HIT_PATH_BLOCKS.has(block.id)) {
      assert.notEqual(block.imageGeometry.hitPath, block.imageGeometry.visualPath, `${block.id} should keep its approved mobile hit-area override`);
    } else {
      assert.equal(block.imageGeometry.hitPath, block.imageGeometry.visualPath, `${block.id} hit path should default to the visual path until an explicit mobile hit-area is approved`);
    }
    assert.deepEqual(block.imageGeometry.labelPoint, [block.imageGeometry.labelX, block.imageGeometry.labelY], `${block.id} label point should mirror labelX/labelY`);
    assert.equal(block.imageGeometry.geometryVersion, SAJIK_TRACE_VERSION, `${block.id} geometry version should use the v2 precision trace version`);
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
    assert.equal(
      block.sectionKind,
      block.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE'
        ? 'ALIAS_ONLY'
        : block.category === 'ACCESSIBLE'
          ? 'ACCESSIBILITY_MARKER'
          : 'SEAT_SECTION',
      `${block.id} should expose its normalized section kind`,
    );
    assert.equal(block.markerType, block.category === 'ACCESSIBLE' ? 'WHEELCHAIR' : undefined, `${block.id} marker type should only be set for wheelchair entries`);

    const pathNumbers = block.imageGeometry.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    assert.ok(pathNumbers.length >= 4, `${block.id} image geometry should contain path coordinates`);
    pathNumbers.forEach((coordinate, index) => {
      const limit = index % 2 === 0 ? SAJIK_SEATMAP_IMAGE.imageWidth : SAJIK_SEATMAP_IMAGE.imageHeight;
      assert.ok(coordinate >= 0 && coordinate <= limit, `${block.id} path coordinate ${coordinate} should fit image bounds`);
    });
  });
});

test('사직 sectionKind별 runtime layer 계약은 고정되어야 한다', () => {
  const seatSections = SAJIK_BLOCKS.filter((block) => block.sectionKind === 'SEAT_SECTION');
  const accessibilityMarkers = SAJIK_BLOCKS.filter((block) => block.sectionKind === 'ACCESSIBILITY_MARKER');
  const aliasOnlySections = SAJIK_BLOCKS.filter((block) => block.sectionKind === 'ALIAS_ONLY');
  const mapSelectableBlocks = SAJIK_BLOCKS.filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE');

  assert.equal(seatSections.length, 84, 'Sajik runtime seat path layer should have 84 seat sections');
  assert.equal(accessibilityMarkers.length, 3, 'Sajik runtime accessibility marker layer should have 3 markers');
  assert.equal(aliasOnlySections.length, 2, 'Sajik alias-only sections should stay out of runtime hit layers');
  assert.equal(mapSelectableBlocks.filter((block) => block.sectionKind === 'SEAT_SECTION').length, 84);
  assert.equal(mapSelectableBlocks.filter((block) => block.sectionKind === 'ACCESSIBILITY_MARKER').length, 3);
  assert.equal(mapSelectableBlocks.filter((block) => block.sectionKind === 'ALIAS_ONLY').length, 0);

  mapSelectableBlocks.forEach((block) => {
    assert.ok(block.imageGeometry.visualPath, `${block.id} should expose visualPath for runtime rendering`);
    assert.ok(block.imageGeometry.hitPath, `${block.id} should expose hitPath for runtime rendering`);
    assert.ok(block.imageGeometry.labelPoint, `${block.id} should expose labelPoint for runtime rendering`);
    assert.equal(block.imageGeometry.geometryVersion, SAJIK_TRACE_VERSION, `${block.id} should expose manual-polygon-v2 geometryVersion`);
  });

  accessibilityMarkers.forEach((block) => {
    assert.equal(block.markerType, 'WHEELCHAIR', `${block.id} should remain a wheelchair marker`);
    assert.equal(block.mapInteractionStatus, 'MAP_SELECTABLE', `${block.id} marker selection compatibility should stay enabled`);
  });

  aliasOnlySections.forEach((block) => {
    assert.equal(block.mapInteractionStatus, 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE', `${block.id} should stay alias-only`);
  });
});

test('사직 visualPath/hitPath는 공통 polygon validator 계약을 통과한다', () => {
  SAJIK_BLOCKS.forEach((block) => {
    const labelPoint = block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY];
    const normalizedPaths = [block.imageGeometry.visualPath, block.imageGeometry.hitPath].filter((pathData): pathData is string => Boolean(pathData));
    assert.equal(normalizedPaths.length, 2, `${block.id} should expose visual and hit polygon paths`);
    normalizedPaths.forEach((pathData) => {
      assert.deepEqual(
        validateSeatMapPolygonPath({
          pathData,
          width: SAJIK_SEATMAP_IMAGE.imageWidth,
          height: SAJIK_SEATMAP_IMAGE.imageHeight,
          labelPoint,
          labelTolerance: 1,
        }),
        [],
        `${block.id} normalized polygon path should pass validator`,
      );
    });
  });
});

test('사직 JSON dataset export 모델은 editor/export 계약을 보존한다', () => {
  const dataset = buildSajikSeatMapDataset();

  assert.equal(dataset.stadiumId, 'BUSAN_SAJIK');
  assert.equal(dataset.mapVersion, SAJIK_SEATMAP_IMAGE.mapVersion);
  assert.equal(dataset.coordinateSystem, 'SVG_VIEW_BOX');
  assert.deepEqual(dataset.image, {
    path: SAJIK_SEATMAP_IMAGE.imagePath,
    width: 960,
    height: 640,
    viewBox: '0 0 960 640',
    sha256: SAJIK_SEATMAP_IMAGE.imageSha256,
    sourceLabel: SAJIK_SEATMAP_IMAGE.sourceLabel,
    sourceUrl: SAJIK_SEATMAP_IMAGE.sourceUrl,
  });
  assert.equal(dataset.image.renderImagePath, SAJIK_SEATMAP_IMAGE.renderImagePath);
  assert.equal(dataset.image.renderImageSha256, SAJIK_SEATMAP_IMAGE.renderImageSha256);
  assert.equal(dataset.image.renderImageNaturalWidth, SAJIK_SEATMAP_IMAGE.renderImageNaturalWidth);
  assert.equal(dataset.image.renderImageNaturalHeight, SAJIK_SEATMAP_IMAGE.renderImageNaturalHeight);
  assert.equal(dataset.image.renderImageSourceUrl, SAJIK_SEATMAP_IMAGE.renderImageSourceUrl);
  assert.equal(dataset.image.renderImageSourceLabel, SAJIK_SEATMAP_IMAGE.renderImageSourceLabel);
  assert.deepEqual(dataset.summary, {
    totalSections: 89,
    enabledSections: 87,
    aliasOnlySections: 2,
    markers: 3,
  });
  assert.deepEqual(validateSajikSeatMapDataset(dataset), []);
  assert.deepEqual(validateSajikSeatMapDatasetIssues(dataset), []);
  assert.deepEqual(
    dataset.sections.filter((section) => section.hitPathExpansionCandidate).map((section) => section.sectionId).sort(),
    [...SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS].sort(),
  );

  const section112 = dataset.sections.find((section) => section.sectionId === '112');
  assert.ok(section112, '112 section should be exported');
  assert.equal(section112.seatCategoryLabel, SAJIK_CATEGORIES.INFIELD_FIELD_1B.label);
  assert.equal(section112.floor, 1);
  assert.equal(section112.enabled, true);
  assert.equal(section112.visualPath, section112.hitPath);
  assert.ok(section112.visualPolygon.length >= 3);
  assert.deepEqual(section112.visualPolygon, section112.hitPolygon);
  assert.deepEqual(section112.labelPoint, SAJIK_BLOCKS.find((block) => block.block === '112')?.imageGeometry.labelPoint);

  const section112Patch = buildSajikSeatMapSectionPatchPayload(section112, dataset);
  assert.equal(section112Patch.type, 'SAJIK_SECTION_GEOMETRY_PATCH_PREVIEW');
  assert.equal(section112Patch.mapVersion, SAJIK_SEATMAP_IMAGE.mapVersion);
  assert.equal(section112Patch.sectionId, '112');
  assert.equal(section112Patch.enabled, true);
  assert.equal(section112Patch.markerType, undefined);
  assert.deepEqual(section112Patch.before, section112Patch.after);
  assert.equal(section112Patch.validation.status, 'PASS');
  assert.equal(section112Patch.validation.issueCount, 0);
  assert.deepEqual(section112Patch.validation.issues, []);

  const moved112Polygon = section112.visualPolygon.map((point, index): SeatMapPoint => (
    index === 0 ? [point[0] + 1, point[1]] : point
  ));
  const moved112Geometry = geometrySnapshotFromPolygons({
    visualPolygon: moved112Polygon,
    hitPolygon: moved112Polygon,
    labelPoint: section112.labelPoint,
  });
  const moved112Patch = buildSajikSeatMapSectionPatchPayload(section112, dataset, moved112Geometry);
  assert.notDeepEqual(moved112Patch.before, moved112Patch.after);
  assert.equal(moved112Patch.after.visualPath, moved112Patch.after.hitPath);
  assert.equal(moved112Patch.validation.status, 'PASS');
  assert.equal(moved112Patch.validation.issueCount, 0);
  const moved112TsPatch = formatSajikSeatMapSectionPatchTsFragment(moved112Patch);
  assert.match(moved112TsPatch, /BUSAN_SAJIK_2026_MANUAL_POLYGON_V2 112 geometry patch preview/);
  assert.match(moved112TsPatch, /sectionId: '112'/);
  assert.match(moved112TsPatch, /visualPath: 'M /);
  assert.match(moved112TsPatch, /hitPath: 'M /);
  assert.match(moved112TsPatch, /labelPoint: \[/);

  const [labelX, labelY] = section112.labelPoint;
  const tinyHitPathGeometry = geometrySnapshotFromPolygons({
    visualPolygon: section112.visualPolygon,
    hitPolygon: [
      [labelX - 1, labelY - 1],
      [labelX + 1, labelY - 1],
      [labelX + 1, labelY + 1],
      [labelX - 1, labelY + 1],
    ],
    labelPoint: section112.labelPoint,
  });
  const tinyHitPathPatch = buildSajikSeatMapSectionPatchPayload(section112, dataset, tinyHitPathGeometry);
  assert.equal(tinyHitPathPatch.validation.status, 'FAIL');
  assert.ok(tinyHitPathPatch.validation.issues.some((issue) => (
    issue.sectionId === '112'
    && issue.pathKind === 'hitPath'
    && issue.code === 'HIT_POLYGON_TOO_SMALL'
  )));

  const aliasOnlySections = dataset.sections.filter((section) => section.sectionKind === 'ALIAS_ONLY');
  assert.deepEqual(aliasOnlySections.map((section) => section.sectionId), ['011', '903']);
  assert.ok(aliasOnlySections.every((section) => section.enabled === false));

  assert.ok(aliasOnlySections[0], '011 alias-only section should be exported');
  const alias011Patch = buildSajikSeatMapSectionPatchPayload(aliasOnlySections[0], dataset);
  assert.equal(alias011Patch.sectionId, '011');
  assert.equal(alias011Patch.enabled, false);
  assert.equal(alias011Patch.sectionKind, 'ALIAS_ONLY');
  assert.equal(alias011Patch.validation.status, 'PASS');

  const wheelchairMarkers = dataset.markers.filter((marker) => marker.type === 'WHEELCHAIR');
  assert.equal(wheelchairMarkers.length, 3);
  const wheelchairPatch = buildSajikSeatMapSectionPatchPayload(
    dataset.sections.find((section) => section.sectionId === wheelchairMarkers[0]?.relatedSectionId) ?? section112,
    dataset,
  );
  assert.equal(wheelchairPatch.sectionKind, 'ACCESSIBILITY_MARKER');
  assert.equal(wheelchairPatch.markerType, 'WHEELCHAIR');
  assert.equal(wheelchairPatch.validation.status, 'PASS');
  assert.deepEqual(
    wheelchairMarkers.map((marker) => marker.relatedSectionId),
    SAJIK_BLOCKS.filter((block) => block.markerType === 'WHEELCHAIR').map((block) => block.block),
  );

  const invalidDataset = {
    ...dataset,
    sections: [
      {
        ...dataset.sections[0],
        sectionId: 'BROKEN',
        visualPath: 'M 0 0 L 1 1 Z',
        visualPolygon: [[0, 0], [1, 1]] as SeatMapPoint[],
      },
    ],
    markers: [],
  };
  const invalidIssues = validateSajikSeatMapDatasetIssues(invalidDataset);
  assert.ok(invalidIssues.some((issue) => (
    issue.sectionId === 'BROKEN'
    && issue.pathKind === 'visualPath'
    && issue.code === 'MIN_POINT_COUNT_REQUIRED'
    && issue.severity === 'error'
  )));
  assert.ok(invalidIssues.every((issue) => issue.message.length > 0));
  assert.match(formatSajikSeatMapDatasetIssue(invalidIssues[0]), /^BROKEN:(visualPath|hitPath):/);
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
  assert.equal(pathToPoints(retraced143.imageGeometry.d).length, 13);
  assert.deepEqual(pathBounds(retraced143.imageGeometry.d), { minX: 779, minY: 438, maxX: 840, maxY: 481 });

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
    assert.equal(isSingleClosedPolygonPath(block.imageGeometry.d), true, `${block.id} should be a single closed M/L/Z polygon`);
    const points = pathToPoints(block.imageGeometry.d);
    assert.deepEqual(polygonSelfIntersections(points), [], `${block.id} polygon edges should not self-intersect`);
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
        pathToPoints(candidate.imageGeometry.hitPath ?? ''),
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
          pathToPoints(candidate.imageGeometry.hitPath ?? ''),
        )
      ));
      assert.notEqual(hits.at(-1)?.id, block.id, `${block.id} should not be selectable from the map hit stack`);
    });
});

test('사직 P0 143 주변 경계는 인접 블럭 polygon을 침범하지 않는다', () => {
  const blockByNumber = new Map(SAJIK_BLOCKS.map((block) => [block.block, block]));
  const seamPairs = [
    ['132', '142'],
    ['142', '143'],
    ['132', '143'],
    ['123', '133'],
    ['133', '143'],
    ['123', '143'],
  ] as const;

  seamPairs.forEach(([firstBlockNumber, secondBlockNumber]) => {
    const firstBlock = blockByNumber.get(firstBlockNumber);
    const secondBlock = blockByNumber.get(secondBlockNumber);
    assert.ok(firstBlock, `${firstBlockNumber} should exist`);
    assert.ok(secondBlock, `${secondBlockNumber} should exist`);

    const firstPoints = pathToPoints(firstBlock.imageGeometry.d);
    const secondPoints = pathToPoints(secondBlock.imageGeometry.d);

    firstPoints.forEach((point, index) => {
      assert.equal(
        isPointInsidePolygon(point[0], point[1], secondPoints),
        false,
        `${firstBlockNumber} vertex ${index} should not intrude into ${secondBlockNumber}`,
      );
    });
    secondPoints.forEach((point, index) => {
      assert.equal(
        isPointInsidePolygon(point[0], point[1], firstPoints),
        false,
        `${secondBlockNumber} vertex ${index} should not intrude into ${firstBlockNumber}`,
      );
    });

    firstPoints.forEach((point, edgeIndex) => {
      const nextPoint = firstPoints[(edgeIndex + 1) % firstPoints.length];
      secondPoints.forEach((comparePoint, compareIndex) => {
        const compareNextPoint = secondPoints[(compareIndex + 1) % secondPoints.length];
        assert.equal(
          segmentsIntersect(point, nextPoint, comparePoint, compareNextPoint),
          false,
          `${firstBlockNumber}/${secondBlockNumber} edges ${edgeIndex}/${compareIndex} should not cross or overlap`,
        );
      });
    });
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
