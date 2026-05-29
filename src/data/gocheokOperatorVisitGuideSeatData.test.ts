import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { GOCHEOK_BLOCKS } from './gocheokSeatData';
import {
  GOCHEOK_BLOCK_VISIT_GUIDANCE,
  GOCHEOK_OPERATION_NOTICES,
  GOCHEOK_OPERATOR_FACILITY_POINTS,
  getGocheokOperatorVisitGuidance,
  selectGocheokActiveOperationNotices,
  type GocheokOperationNotice,
} from './gocheokOperatorVisitGuide';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SOURCE_DOCUMENT_ID_PATTERN = /^gocheok-operator-\d{8}-[a-z0-9-]+$/;
const FACILITY_POINT_ID_PATTERN = /^gocheok-facility-(entrance|concession|restroom|elevator|parking|transit)-[a-z0-9-]+$/;
const OPERATION_NOTICE_ID_PATTERN = /^gocheok-operation-notice-\d{8}-[a-z0-9-]+$/;
const FORBIDDEN_OPERATOR_DATA_PATTERN = /https?:\/\/|www\.|크롤|스크래핑|scrap|crawl|web\s*search|웹\s*검색/i;
const REQUIRED_INTAKE_COLUMNS = [
  'recordType',
  'stadium',
  'sourceDocumentId',
  'lastUpdatedAt',
  'pointId',
  'kind',
  'label',
  'blockId',
  'recommendedEntrancePointIds',
  'nearbyFacilityPointIds',
  'cautionNotes',
  'noticeId',
  'validFrom',
  'validTo',
  'priority',
  'affectedBlockIds',
  'message',
];

function assertNonEmpty(value: string, message: string) {
  assert.ok(value.trim().length > 0, message);
}

test('고척 운영자 직관 guide는 모든 블록에 fallback 결과를 반환한다', () => {
  GOCHEOK_BLOCKS.forEach((block) => {
    const guidance = getGocheokOperatorVisitGuidance(block, '2026-05-28');

    assert.equal(guidance.blockId, block.id);
    assert.equal(guidance.blockLabel, block.block);
    assert.ok(guidance.recommendedEntranceLabel, `${block.id} recommended entrance fallback should exist`);
    assert.ok(guidance.nearbyFacilitiesLabel, `${block.id} nearby facility fallback should exist`);
    assert.ok(guidance.operationNoticeLabel, `${block.id} operation notice fallback should exist`);
    assert.ok(guidance.lastUpdatedAtLabel, `${block.id} updated-at fallback should exist`);
    assert.equal(guidance.operatorDataStatus, 'MANUAL_BASEBALL_DATA_REQUIRED');
  });
});

test('고척 운영자 직관 guide는 운영자 자료가 없으면 항목 단위 pending 문구를 유지한다', () => {
  const block = GOCHEOK_BLOCKS.find((entry) => entry.block === 'D04');
  assert.ok(block);

  const guidance = getGocheokOperatorVisitGuidance(block, '2026-05-28');

  assert.match(guidance.recommendedEntranceLabel, /운영자 제공 자료 필요/);
  assert.match(guidance.nearbyFacilitiesLabel, /운영자 제공 자료 필요/);
  assert.match(guidance.operationNoticeLabel, /운영자 제공 자료 필요/);
  assert.match(guidance.lastUpdatedAtLabel, /운영자 제공 자료 필요/);
  assert.match(guidance.recommendedEntranceLabel, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.match(guidance.nearbyFacilitiesLabel, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.match(guidance.operationNoticeLabel, /MANUAL_BASEBALL_DATA_REQUIRED/);
});

test('고척 운영자 직관 데이터는 원본/검수 메타데이터와 ID 규칙을 지킨다', () => {
  const pointIds = new Set<string>();
  const noticeIds = new Set<string>();

  GOCHEOK_OPERATOR_FACILITY_POINTS.forEach((point) => {
    assert.match(point.id, FACILITY_POINT_ID_PATTERN, `${point.id} should follow the facility point ID convention`);
    assert.equal(pointIds.has(point.id), false, `${point.id} should be unique`);
    pointIds.add(point.id);
    assertNonEmpty(point.label, `${point.id} should keep an operator-provided label`);
    assert.equal(point.dataStatus, 'OPERATOR_PROVIDED');
    assert.match(point.sourceDocumentId, SOURCE_DOCUMENT_ID_PATTERN, `${point.id} should keep sourceDocumentId`);
    assert.match(point.lastUpdatedAt, ISO_DATE_PATTERN, `${point.id} should keep YYYY-MM-DD lastUpdatedAt`);
    assert.doesNotMatch(JSON.stringify(point), FORBIDDEN_OPERATOR_DATA_PATTERN);
  });

  GOCHEOK_BLOCK_VISIT_GUIDANCE.forEach((guidance) => {
    assertNonEmpty(guidance.blockId, 'block guidance should keep a blockId');
    assert.match(guidance.sourceDocumentId, SOURCE_DOCUMENT_ID_PATTERN, `${guidance.blockId} should keep sourceDocumentId`);
    assert.match(guidance.lastUpdatedAt, ISO_DATE_PATTERN, `${guidance.blockId} should keep YYYY-MM-DD lastUpdatedAt`);
    guidance.cautionNotes.forEach((note) => assertNonEmpty(note, `${guidance.blockId} caution note should not be empty`));
    assert.doesNotMatch(JSON.stringify(guidance), FORBIDDEN_OPERATOR_DATA_PATTERN);
  });

  GOCHEOK_OPERATION_NOTICES.forEach((notice) => {
    assert.match(notice.id, OPERATION_NOTICE_ID_PATTERN, `${notice.id} should follow the operation notice ID convention`);
    assert.equal(noticeIds.has(notice.id), false, `${notice.id} should be unique`);
    noticeIds.add(notice.id);
    assert.match(notice.validFrom, ISO_DATE_PATTERN, `${notice.id} should keep YYYY-MM-DD validFrom`);
    assert.match(notice.validTo, ISO_DATE_PATTERN, `${notice.id} should keep YYYY-MM-DD validTo`);
    assert.ok(notice.validFrom <= notice.validTo, `${notice.id} validFrom should be <= validTo`);
    assert.ok(Number.isInteger(notice.priority), `${notice.id} priority should be an integer`);
    assertNonEmpty(notice.message, `${notice.id} should keep an operator-provided message`);
    assert.match(notice.sourceDocumentId, SOURCE_DOCUMENT_ID_PATTERN, `${notice.id} should keep sourceDocumentId`);
    assert.match(notice.lastUpdatedAt, ISO_DATE_PATTERN, `${notice.id} should keep YYYY-MM-DD lastUpdatedAt`);
    assert.doesNotMatch(JSON.stringify(notice), FORBIDDEN_OPERATOR_DATA_PATTERN);
  });
});

test('고척 운영자 직관 guide 참조 ID는 실제 facility/notice 데이터만 가리킨다', () => {
  const pointIds = new Set(GOCHEOK_OPERATOR_FACILITY_POINTS.map((point) => point.id));
  const pointsById = new Map(GOCHEOK_OPERATOR_FACILITY_POINTS.map((point) => [point.id, point]));
  const blockIds = new Set(GOCHEOK_BLOCKS.map((block) => block.id));

  GOCHEOK_BLOCK_VISIT_GUIDANCE.forEach((guidance) => {
    assert.ok(blockIds.has(guidance.blockId), `${guidance.blockId} should map to a Gocheok block`);
    guidance.recommendedEntrancePointIds.forEach((pointId) => {
      assert.ok(pointIds.has(pointId), `${pointId} should map to a facility point`);
      assert.equal(pointsById.get(pointId)?.kind, 'ENTRANCE', `${pointId} should be an entrance point`);
    });
    guidance.nearbyFacilityPointIds.forEach((pointId) => {
      assert.ok(pointIds.has(pointId), `${pointId} should map to a facility point`);
      assert.notEqual(pointsById.get(pointId)?.kind, 'ENTRANCE', `${pointId} should be a nearby non-entrance facility point`);
    });
  });

  GOCHEOK_OPERATION_NOTICES.forEach((notice) => {
    notice.affectedBlockIds.forEach((blockId) => {
      assert.ok(blockIds.has(blockId), `${blockId} should map to a Gocheok block`);
    });
  });
});

test('고척 날짜별 운영 공지는 KST 날짜와 priority 기준으로 선택된다', () => {
  const notices: GocheokOperationNotice[] = [
    {
      id: 'low-priority',
      validFrom: '2026-05-28',
      validTo: '2026-05-30',
      priority: 10,
      affectedBlockIds: [],
      message: '테스트 운영 공지 낮은 우선순위',
      lastUpdatedAt: '2026-05-20',
      sourceDocumentId: 'operator-test-document',
    },
    {
      id: 'high-priority',
      validFrom: '2026-05-28',
      validTo: '2026-05-28',
      priority: 20,
      affectedBlockIds: [],
      message: '테스트 운영 공지 높은 우선순위',
      lastUpdatedAt: '2026-05-21',
      sourceDocumentId: 'operator-test-document',
    },
    {
      id: 'expired',
      validFrom: '2026-05-01',
      validTo: '2026-05-02',
      priority: 30,
      affectedBlockIds: [],
      message: '테스트 만료 공지',
      lastUpdatedAt: '2026-05-01',
      sourceDocumentId: 'operator-test-document',
    },
  ];

  assert.deepEqual(
    selectGocheokActiveOperationNotices(notices, '2026-05-28').map((notice) => notice.id),
    ['high-priority', 'low-priority'],
  );
  assert.deepEqual(selectGocheokActiveOperationNotices(notices, '2026-05-03'), []);
});

test('고척 운영자 직관 데이터는 외부 URL/자동 수집 계약을 포함하지 않는다', () => {
  const serializedData = JSON.stringify({
    points: GOCHEOK_OPERATOR_FACILITY_POINTS,
    blockGuidance: GOCHEOK_BLOCK_VISIT_GUIDANCE,
    notices: GOCHEOK_OPERATION_NOTICES,
  });
  const source = readFileSync(new URL('./gocheokOperatorVisitGuide.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(serializedData, FORBIDDEN_OPERATOR_DATA_PATTERN);
  assert.doesNotMatch(source, FORBIDDEN_OPERATOR_DATA_PATTERN);
});

test('고척 운영자 직관 런타임은 원본 PDF/CSV/이미지를 직접 파싱하지 않는다', () => {
  const source = readFileSync(new URL('./gocheokOperatorVisitGuide.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /readFile|fetch\(|XMLHttpRequest|\.pdf|\.csv|\.xlsx|\.png|\.webp/i);
});

test('고척 운영자 직관 입력 포맷 문서는 정적 데이터 계약을 고정한다', () => {
  const doc = readFileSync(new URL('../../docs/stadium/gocheok-operator-guide-format.md', import.meta.url), 'utf8');

  assert.match(doc, /GOCHEOK_OPERATOR_FACILITY_POINTS/);
  assert.match(doc, /GOCHEOK_BLOCK_VISIT_GUIDANCE/);
  assert.match(doc, /GOCHEOK_OPERATION_NOTICES/);
  assert.match(doc, /operator-visit-guide-intake-template\.csv/);
  assert.match(doc, /operator-visit-guide-policy\.md/);
  assert.match(doc, /stadium:gocheok:operator-intake/);
  assert.match(doc, /stadium:gocheok:operator-validate/);
  assert.match(doc, /stadium:gocheok:operator-apply-plan/);
  assert.match(doc, /stadium:gocheok:operator-handoff/);
  assert.match(doc, /ready_for_manual_apply/);
  assert.match(doc, /no-source-write/);
  assert.match(doc, /gocheok-operator-visit-guide-apply-plan\.ts-fragment/);
  assert.match(doc, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.match(doc, /sourceDocumentId/);
  assert.match(doc, /lastUpdatedAt/);
});

test('고척 운영자 공통 intake 템플릿은 필수 컬럼과 placeholder-only 예시를 유지한다', () => {
  const template = readFileSync(new URL('../../docs/stadium/operator-visit-guide-intake-template.csv', import.meta.url), 'utf8').trim();
  const [header, ...rows] = template.split(/\r?\n/);
  const columns = header.split(',');
  const gocheokRows = rows.filter((row) => row.includes(',GOCHEOK,'));

  REQUIRED_INTAKE_COLUMNS.forEach((column) => {
    assert.ok(columns.includes(column), `operator intake template should include ${column}`);
  });
  assert.ok(gocheokRows.some((row) => row.startsWith('facility,')), 'Gocheok template should include a facility placeholder row');
  assert.ok(gocheokRows.some((row) => row.startsWith('block,')), 'Gocheok template should include a block placeholder row');
  assert.ok(gocheokRows.some((row) => row.startsWith('notice,')), 'Gocheok template should include a notice placeholder row');
  assert.match(template, /operator-provided-label/);
  assert.match(template, /operator-provided-operation-message/);
  assert.doesNotMatch(template, /https?:\/\/|www\./i);
  assert.doesNotMatch(template, /[가-힣]+게이트|[가-힣]+매점|[가-힣]+출입구/);
});

test('고척 운영자 공통 정책 문서는 결측과 금지 데이터 계약을 고정한다', () => {
  const policy = readFileSync(new URL('../../docs/stadium/operator-visit-guide-policy.md', import.meta.url), 'utf8');

  assert.match(policy, /운영자가 제공한 자료/);
  assert.match(policy, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.match(policy, /런타임/);
  assert.match(policy, /직접 파싱/);
  assert.match(policy, /crawling/);
  assert.match(policy, /scraping/);
  assert.match(policy, /web search/);
  assert.match(policy, /operator-intake/);
  assert.match(policy, /operator-validate/);
  assert.match(policy, /operator-apply-plan/);
  assert.match(policy, /source file을 자동으로 수정하지 않는다/);
  assert.match(policy, /waiting_for_operator/);
  assert.match(policy, /blocked/);
  assert.match(policy, /ready_for_manual_apply/);
});
