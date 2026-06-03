import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JAMSIL_BLOCKS } from './jamsilSeatData';
import {
  JAMSIL_BLOCK_VISIT_GUIDANCE,
  JAMSIL_OPERATION_NOTICES,
  JAMSIL_OPERATOR_FACILITY_POINTS,
  getJamsilOperatorVisitGuidance,
  selectJamsilActiveOperationNotices,
  type JamsilOperationNotice,
} from './jamsilOperatorVisitGuide';
import { JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES } from './jamsilOfficialSeedData';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SOURCE_DOCUMENT_ID_PATTERN = /^jamsil-operator-\d{8}-[a-z0-9-]+$/;
const FACILITY_POINT_ID_PATTERN = /^jamsil-facility-(entrance|concession|restroom|elevator|parking|transit|ticketoffice|shop|accessibility|rental)-[a-z0-9-]+$/;
const OPERATION_NOTICE_ID_PATTERN = /^jamsil-operation-notice-\d{8}-[a-z0-9-]+$/;
const FORBIDDEN_OPERATOR_DATA_PATTERN = /https?:\/\/|www\.|크롤|스크래핑|scrap|crawl|web\s*search|웹\s*검색/i;
const REQUIRED_INTAKE_COLUMNS = [
  'recordType',
  'stadium',
  'sourceDocumentId',
  'lastUpdatedAt',
  'pointId',
  'kind',
  'label',
  'floor',
  'side',
  'nearSectionIds',
  'locationText',
  'openStatus',
  'accessible',
  'walkingMinutes',
  'verificationStatus',
  'blockId',
  'recommendedEntrancePointIds',
  'nearbyFacilityPointIds',
  'cautionNotes',
  'noticeId',
  'validFrom',
  'validTo',
  'priority',
  'teamContext',
  'affectedBlockIds',
  'message',
];

function assertNonEmpty(value: string, message: string) {
  assert.ok(value.trim().length > 0, message);
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function readCsvRows(relativePath: string): Array<Record<string, string>> {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8').trim();
  const [headerLine, ...rowLines] = source.split(/\r?\n/);
  const columns = parseCsvLine(headerLine);

  return rowLines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
  });
}

test('잠실 운영자 직관 guide는 모든 블록에 정적 안내 또는 fallback 결과를 반환한다', () => {
  JAMSIL_BLOCKS.forEach((block) => {
    const guidance = getJamsilOperatorVisitGuidance(block, '2026-05-29');

    assert.equal(guidance.blockId, block.id);
    assert.equal(guidance.blockLabel, block.block);
    assert.ok(guidance.teamContextLabel, `${block.id} team context fallback should exist`);
    assert.ok(guidance.recommendedEntranceLabel, `${block.id} recommended entrance fallback should exist`);
    assert.ok(guidance.nearbyFacilitiesLabel, `${block.id} nearby facility fallback should exist`);
    assert.ok(guidance.operationNoticeLabel, `${block.id} operation notice fallback should exist`);
    assert.ok(guidance.lastUpdatedAtLabel, `${block.id} updated-at fallback should exist`);
    assert.ok(
      ['MANUAL_BASEBALL_DATA_REQUIRED', 'PARTIAL_OFFICIAL_SEED', 'OPERATOR_PROVIDED'].includes(guidance.operatorDataStatus),
      `${block.id} should expose a known operatorDataStatus`,
    );
  });
});

test('잠실 운영자 직관 guide는 미해결 항목 단위 pending 문구를 유지한다', () => {
  const block = JAMSIL_BLOCKS.find((entry) => entry.id === 'premium-center');
  assert.ok(block);

  const guidance = getJamsilOperatorVisitGuidance(block, '2026-06-01');

  assert.match(guidance.recommendedEntranceLabel, /운영자 제공 자료 필요/);
  assert.match(guidance.nearbyFacilitiesLabel, /잠실야구장/);
  assert.match(guidance.operationNoticeLabel, /운영자 제공 자료 필요/);
  assert.equal(guidance.lastUpdatedAtLabel, '2026-06-01');
  assert.match(guidance.recommendedEntranceLabel, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.match(guidance.operationNoticeLabel, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.equal(guidance.operatorDataStatus, 'OPERATOR_PROVIDED');
});

test('잠실 운영자 직관 fallback은 좌석 메타데이터를 출입구/시설/동선으로 대체하지 않는다', () => {
  const seedBlock = JAMSIL_BLOCKS.find((entry) => entry.id === 'premium-center');
  assert.ok(seedBlock);

  const guidance = getJamsilOperatorVisitGuidance({
    ...seedBlock,
    id: 'operator-missing-test-block',
    block: '운영자 미등록 테스트 블록',
  }, '2026-05-29');
  const fallbackValue = '운영자 제공 자료 필요 · MANUAL_BASEBALL_DATA_REQUIRED';

  assert.deepEqual(
    [
      guidance.recommendedEntranceLabel,
      guidance.nearbyFacilitiesLabel,
      guidance.operationNoticeLabel,
      guidance.lastUpdatedAtLabel,
    ],
    [fallbackValue, fallbackValue, fallbackValue, fallbackValue],
  );
  assert.equal(guidance.operatorDataPendingLabel, '운영자 제공 출입구/매점/동선 자료 필요 · MANUAL_BASEBALL_DATA_REQUIRED');
  assert.deepEqual(guidance.cautionNotes, []);
  assert.deepEqual(guidance.activeNotices, []);
});

test('잠실 승인 매점과 화장실은 101블록에 운영자 제공 시설과 기존 공개 편의시설을 함께 표시한다', () => {
  const block = JAMSIL_BLOCKS.find((entry) => entry.id === 'block-101');
  assert.ok(block);

  const guidance = getJamsilOperatorVisitGuidance(block, '2026-06-01');

  assert.equal(guidance.operatorDataStatus, 'OPERATOR_PROVIDED');
  assert.match(guidance.recommendedEntranceLabel, /2-3 Gate 1루 내야 출입구/);
  assert.match(guidance.recommendedEntranceLabel, /공식 좌석도 기반 후보/);
  assert.match(guidance.nearbyFacilitiesLabel, /2층 2-3 Gate 인근 화장실/);
  assert.match(guidance.nearbyFacilitiesLabel, /잠실야구장/);
  assert.match(guidance.nearbyFacilitiesLabel, /GS25/);
  assert.match(guidance.nearbyFacilitiesLabel, /도미노피자/);
  assert.match(guidance.nearbyFacilitiesLabel, /제2매표소/);
  assert.match(guidance.nearbyFacilitiesLabel, /KBO 중계 음성 지원 안내데스크/);
  assert.match(guidance.operationNoticeLabel, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.equal(guidance.lastUpdatedAtLabel, '2026-06-01');
  assert.ok(guidance.cautionNotes.some((note) => note.includes('공식 좌석도 위치 기반 후보')));
  assert.ok(guidance.cautionNotes.some((note) => note.includes('종합운동장역 5/6번 출구')));
  assert.ok(guidance.cautionNotes.some((note) => note.includes('도보시간')));
  assert.equal(guidance.cautionNotes.some((note) => note.includes('화장실/도보시간')), false);
  assert.equal(guidance.cautionNotes.some((note) => note.includes('매점/화장실/도보시간')), false);
});

test('잠실 운영자 직관 데이터는 원본/검수 메타데이터와 ID 규칙을 지킨다', () => {
  const pointIds = new Set<string>();
  const noticeIds = new Set<string>();

  JAMSIL_OPERATOR_FACILITY_POINTS.forEach((point) => {
    assert.match(point.id, FACILITY_POINT_ID_PATTERN, `${point.id} should follow the facility point ID convention`);
    assert.equal(pointIds.has(point.id), false, `${point.id} should be unique`);
    pointIds.add(point.id);
    assertNonEmpty(point.label, `${point.id} should keep a static guide label`);
    assert.ok(
      ['OPERATOR_PROVIDED', 'OFFICIAL_PUBLIC_DATA', 'INFERRED_FROM_OFFICIAL_MAP'].includes(point.dataStatus),
      `${point.id} should keep a valid dataStatus`,
    );
    assert.match(point.sourceDocumentId, SOURCE_DOCUMENT_ID_PATTERN, `${point.id} should keep sourceDocumentId`);
    assert.match(point.lastUpdatedAt, ISO_DATE_PATTERN, `${point.id} should keep YYYY-MM-DD lastUpdatedAt`);
    assert.doesNotMatch(JSON.stringify(point), FORBIDDEN_OPERATOR_DATA_PATTERN);
  });

  JAMSIL_BLOCK_VISIT_GUIDANCE.forEach((guidance) => {
    assertNonEmpty(guidance.blockId, 'block guidance should keep a blockId');
    assert.match(guidance.sourceDocumentId, SOURCE_DOCUMENT_ID_PATTERN, `${guidance.blockId} should keep sourceDocumentId`);
    assert.match(guidance.lastUpdatedAt, ISO_DATE_PATTERN, `${guidance.blockId} should keep YYYY-MM-DD lastUpdatedAt`);
    guidance.cautionNotes.forEach((note) => assertNonEmpty(note, `${guidance.blockId} caution note should not be empty`));
    assert.doesNotMatch(JSON.stringify(guidance), FORBIDDEN_OPERATOR_DATA_PATTERN);
  });

  JAMSIL_OPERATION_NOTICES.forEach((notice) => {
    assert.match(notice.id, OPERATION_NOTICE_ID_PATTERN, `${notice.id} should follow the operation notice ID convention`);
    assert.equal(noticeIds.has(notice.id), false, `${notice.id} should be unique`);
    noticeIds.add(notice.id);
    assert.match(notice.validFrom, ISO_DATE_PATTERN, `${notice.id} should keep YYYY-MM-DD validFrom`);
    assert.match(notice.validTo, ISO_DATE_PATTERN, `${notice.id} should keep YYYY-MM-DD validTo`);
    assert.ok(notice.validFrom <= notice.validTo, `${notice.id} validFrom should be <= validTo`);
    assert.ok(Number.isInteger(notice.priority), `${notice.id} priority should be an integer`);
    assert.ok(['COMMON', 'LG', 'DOOSAN'].includes(notice.teamContext), `${notice.id} should keep a valid teamContext`);
    assertNonEmpty(notice.message, `${notice.id} should keep an operator-provided message`);
    assert.match(notice.sourceDocumentId, SOURCE_DOCUMENT_ID_PATTERN, `${notice.id} should keep sourceDocumentId`);
    assert.match(notice.lastUpdatedAt, ISO_DATE_PATTERN, `${notice.id} should keep YYYY-MM-DD lastUpdatedAt`);
    assert.doesNotMatch(JSON.stringify(notice), FORBIDDEN_OPERATOR_DATA_PATTERN);
  });
});

test('잠실 운영자 직관 guide 참조 ID는 실제 facility/notice 데이터만 가리킨다', () => {
  const pointIds = new Set(JAMSIL_OPERATOR_FACILITY_POINTS.map((point) => point.id));
  const pointsById = new Map(JAMSIL_OPERATOR_FACILITY_POINTS.map((point) => [point.id, point]));
  const blockIds = new Set(JAMSIL_BLOCKS.map((block) => block.id));

  JAMSIL_BLOCK_VISIT_GUIDANCE.forEach((guidance) => {
    assert.ok(blockIds.has(guidance.blockId), `${guidance.blockId} should map to a Jamsil block`);
    guidance.recommendedEntrancePointIds.forEach((pointId) => {
      assert.ok(pointIds.has(pointId), `${pointId} should map to a facility point`);
      assert.equal(pointsById.get(pointId)?.kind, 'ENTRANCE', `${pointId} should be an entrance point`);
    });
    guidance.nearbyFacilityPointIds.forEach((pointId) => {
      assert.ok(pointIds.has(pointId), `${pointId} should map to a facility point`);
      assert.notEqual(pointsById.get(pointId)?.kind, 'ENTRANCE', `${pointId} should be a nearby non-entrance facility point`);
    });
  });

  JAMSIL_OPERATION_NOTICES.forEach((notice) => {
    notice.affectedBlockIds.forEach((blockId) => {
      assert.ok(blockIds.has(blockId), `${blockId} should map to a Jamsil block`);
    });
  });
});

test('잠실 날짜별 운영 공지는 KST 날짜와 priority 기준으로 선택된다', () => {
  const notices: JamsilOperationNotice[] = [
    {
      id: 'low-priority',
      validFrom: '2026-05-29',
      validTo: '2026-05-31',
      priority: 10,
      teamContext: 'COMMON',
      affectedBlockIds: [],
      message: '테스트 운영 공지 낮은 우선순위',
      lastUpdatedAt: '2026-05-20',
      sourceDocumentId: 'jamsil-operator-20260529-test-document',
    },
    {
      id: 'high-priority',
      validFrom: '2026-05-29',
      validTo: '2026-05-29',
      priority: 20,
      teamContext: 'LG',
      affectedBlockIds: [],
      message: '테스트 운영 공지 높은 우선순위',
      lastUpdatedAt: '2026-05-21',
      sourceDocumentId: 'jamsil-operator-20260529-test-document',
    },
    {
      id: 'expired',
      validFrom: '2026-05-01',
      validTo: '2026-05-02',
      priority: 30,
      teamContext: 'DOOSAN',
      affectedBlockIds: [],
      message: '테스트 만료 공지',
      lastUpdatedAt: '2026-05-01',
      sourceDocumentId: 'jamsil-operator-20260529-test-document',
    },
  ];

  assert.deepEqual(
    selectJamsilActiveOperationNotices(notices, '2026-05-29').map((notice) => notice.id),
    ['high-priority', 'low-priority'],
  );
  assert.deepEqual(selectJamsilActiveOperationNotices(notices, '2026-05-03'), []);
});

test('잠실 운영자 직관 데이터는 외부 URL/자동 수집 계약을 포함하지 않는다', () => {
  const serializedData = JSON.stringify({
    points: JAMSIL_OPERATOR_FACILITY_POINTS,
    blockGuidance: JAMSIL_BLOCK_VISIT_GUIDANCE,
    notices: JAMSIL_OPERATION_NOTICES,
  });
  const source = readFileSync(new URL('./jamsilOperatorVisitGuide.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(serializedData, FORBIDDEN_OPERATOR_DATA_PATTERN);
  assert.doesNotMatch(source, FORBIDDEN_OPERATOR_DATA_PATTERN);
});

test('잠실 운영자 직관 런타임은 원본 PDF/CSV/이미지를 직접 파싱하지 않는다', () => {
  const source = readFileSync(new URL('./jamsilOperatorVisitGuide.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /readFile|fetch\(|XMLHttpRequest|\.pdf|\.csv|\.xlsx|\.png|\.webp/i);
});

test('잠실 2차 매점과 화장실 후보는 approval 이후 수동 반영된 facility point로만 승격된다', () => {
  const runtimeData = JSON.stringify({
    points: JAMSIL_OPERATOR_FACILITY_POINTS,
    blockGuidance: JAMSIL_BLOCK_VISIT_GUIDANCE,
  });
  const runtimePointLabels = new Set(JAMSIL_OPERATOR_FACILITY_POINTS.map((point) => point.label));
  const candidateStoreNames = new Set(JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES.flatMap((zone) => zone.storeNames));
  const concessionPoints = JAMSIL_OPERATOR_FACILITY_POINTS.filter((point) => point.kind === 'CONCESSION');
  const restroomPoints = JAMSIL_OPERATOR_FACILITY_POINTS.filter((point) => point.kind === 'RESTROOM');
  const operatorProvidedBlocks = JAMSIL_BLOCK_VISIT_GUIDANCE.filter((guidance) => (
    guidance.dataStatus === 'OPERATOR_PROVIDED' && /^block-\d+$/.test(guidance.blockId)
  ));
  const operatorProvidedGuidance = JAMSIL_BLOCK_VISIT_GUIDANCE.filter((guidance) => guidance.dataStatus === 'OPERATOR_PROVIDED');

  assert.ok(candidateStoreNames.has('GS25'));
  assert.ok(candidateStoreNames.has('BHC'));
  assert.equal(runtimeData.includes('jamsil-secondary-map-derived'), false);
  assert.equal(concessionPoints.length, 57);
  assert.equal(restroomPoints.length, 14);
  assert.equal(operatorProvidedBlocks.length, 104);
  assert.equal(operatorProvidedGuidance.length, 109);
  assert.equal(JAMSIL_OPERATION_NOTICES.length, 0);
  concessionPoints.forEach((point) => {
    assert.equal(point.dataStatus, 'OPERATOR_PROVIDED');
    assert.equal(point.sourceDocumentId, 'jamsil-operator-20260531-user-confirmed-food-review');
    assert.equal(point.openStatus, 'UNKNOWN');
    assert.equal(point.accessible, 'UNKNOWN');
    assert.equal(point.walkingMinutes, 'UNKNOWN');
    assert.equal(point.verificationStatus, 'OPERATOR_CONFIRMED');
  });
  assert.ok(restroomPoints.some((point) => point.openStatus === '24_HOURS'));
  restroomPoints.forEach((point) => {
    assert.equal(point.dataStatus, 'OPERATOR_PROVIDED');
    assert.equal(point.sourceDocumentId, 'jamsil-operator-20260601-user-confirmed-restroom-review');
    assert.equal(point.walkingMinutes, 'UNKNOWN');
    assert.equal(point.verificationStatus, 'OPERATOR_CONFIRMED');
  });
  candidateStoreNames.forEach((storeName) => {
    assert.equal(runtimePointLabels.has(storeName), true, `${storeName} should be present only after approved manual apply`);
  });
});

test('잠실 field-survey restroom assignments are fully reflected in runtime guidance', () => {
  const fieldSurveyRows = readCsvRows('../../docs/stadium/jamsil-field-survey-review.csv');
  const guidanceByBlock = new Map(JAMSIL_BLOCK_VISIT_GUIDANCE.map((guidance) => [guidance.blockId, guidance]));
  const unresolvedWalkingColumns = [
    'operatorSectionToRestroomMinutes',
    'operatorGateToSectionMinutes',
    'operatorSectionToFoodMinutes',
  ];
  const unresolvedCongestionColumns = [
    'operatorGateCongestionLevel',
    'operatorConcourseCongestionLevel',
    'operatorFoodQueueLevel',
    'operatorRestroomQueueLevel',
  ];

  assert.equal(fieldSurveyRows.length, 109);
  fieldSurveyRows.forEach((row) => {
    const guidance = guidanceByBlock.get(row.blockId);
    assert.ok(guidance, `${row.blockId} should have runtime guidance`);
    assert.equal(guidance.dataStatus, 'OPERATOR_PROVIDED', `${row.blockId} should use approved operator data status`);
    assert.equal(guidance.lastUpdatedAt, '2026-06-01', `${row.blockId} should use approved field-survey date`);
    assert.ok(
      guidance.nearbyFacilityPointIds.includes(row.operatorRestroomFacilityId),
      `${row.blockId} should include approved restroom ${row.operatorRestroomFacilityId}`,
    );
    assert.equal(
      guidance.nearbyFacilityPointIds.find((pointId) => pointId.includes('restroom')),
      row.operatorRestroomFacilityId,
      `${row.blockId} should prefer the approved field-survey restroom`,
    );
  });
  assert.equal(
    fieldSurveyRows.every((row) => unresolvedWalkingColumns.every((column) => row[column] === 'UNKNOWN')),
    true,
    'field-survey walking values should remain unresolved UNKNOWN values',
  );
  assert.equal(
    fieldSurveyRows.every((row) => unresolvedCongestionColumns.every((column) => row[column] === 'UNKNOWN')),
    true,
    'field-survey congestion values should remain unresolved UNKNOWN values',
  );
  assert.equal(JAMSIL_OPERATION_NOTICES.length, 0);
});

test('잠실 운영자 직관 입력 포맷 문서는 정적 데이터 계약을 고정한다', () => {
  const doc = readFileSync(new URL('../../docs/stadium/jamsil-operator-guide-format.md', import.meta.url), 'utf8');

  assert.match(doc, /JAMSIL_OPERATOR_FACILITY_POINTS/);
  assert.match(doc, /JAMSIL_BLOCK_VISIT_GUIDANCE/);
  assert.match(doc, /JAMSIL_OPERATION_NOTICES/);
  assert.match(doc, /JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES/);
  assert.match(doc, /jamsil-food-candidate-review\.csv/);
  assert.match(doc, /jamsil-food-candidate-review-validation\.json/);
  assert.match(doc, /jamsil-food-candidate-review-workset\.json/);
  assert.match(doc, /jamsil-food-candidate-intake-transfer\.csv/);
  assert.match(doc, /jamsil-food-candidate-apply-plan\.ts-fragment/);
  assert.match(doc, /jamsil-restroom-candidate-review\.csv/);
  assert.match(doc, /jamsil-restroom-candidate-review-validation\.json/);
  assert.match(doc, /jamsil-restroom-candidate-review-workset\.json/);
  assert.match(doc, /jamsil-operator-visit-guide-approval\.json/);
  assert.match(doc, /PENDING_OPERATOR_APPROVAL/);
  assert.match(doc, /STALE_APPROVAL/);
  assert.match(doc, /ready_for_operator_intake_transfer/);
  assert.match(doc, /ready_for_operator_validate/);
  assert.match(doc, /ready_for_manual_apply/);
  assert.match(doc, /operatorNearSectionIds/);
  assert.match(doc, /teamContext/);
  assert.match(doc, /operator-visit-guide-intake-template\.csv/);
  assert.match(doc, /jamsil-operator-visit-guide-input\.csv/);
  assert.match(doc, /jamsil-operator-visit-guide-handoff\.md/);
  assert.match(doc, /operator-visit-guide-policy\.md/);
  assert.match(doc, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.match(doc, /sourceDocumentId/);
  assert.match(doc, /lastUpdatedAt/);
  assert.match(doc, /24_HOURS/);
});

test('잠실 운영자 공통 intake 템플릿은 필수 컬럼과 placeholder-only 예시를 유지한다', () => {
  const template = readFileSync(new URL('../../docs/stadium/operator-visit-guide-intake-template.csv', import.meta.url), 'utf8').trim();
  const [header, ...rows] = template.split(/\r?\n/);
  const columns = header.split(',');
  const jamsilRows = rows.filter((row) => row.includes(',JAMSIL,'));

  REQUIRED_INTAKE_COLUMNS.forEach((column) => {
    assert.ok(columns.includes(column), `operator intake template should include ${column}`);
  });
  assert.ok(jamsilRows.some((row) => row.startsWith('facility,')), 'Jamsil template should include a facility placeholder row');
  assert.ok(jamsilRows.some((row) => row.startsWith('block,')), 'Jamsil template should include a block placeholder row');
  assert.ok(jamsilRows.some((row) => row.startsWith('notice,')), 'Jamsil template should include a notice placeholder row');
  assert.match(template, /operator-provided-label/);
  assert.match(template, /operator-provided-operation-message/);
  assert.match(template, /operator-near-section-ids/);
  assert.match(template, /COMMON/);
  assert.doesNotMatch(template, /https?:\/\/|www\./i);
  assert.doesNotMatch(template, /[가-힣]+게이트|[가-힣]+매점|[가-힣]+출입구/);
});

test('잠실 운영자 공통 정책 문서는 결측과 금지 데이터 계약을 고정한다', () => {
  const policy = readFileSync(new URL('../../docs/stadium/operator-visit-guide-policy.md', import.meta.url), 'utf8');

  assert.match(policy, /서울잠실야구장/);
  assert.match(policy, /운영자가 제공한 자료/);
  assert.match(policy, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.match(policy, /런타임/);
  assert.match(policy, /직접 파싱/);
  assert.match(policy, /crawling/);
  assert.match(policy, /scraping/);
  assert.match(policy, /web search/);
});
