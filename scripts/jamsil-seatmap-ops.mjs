/**
 * Jamsil Baseball Stadium seatmap operations.
 *
 * Tasks:
 *   release-gate  — Verify geometry fixture fingerprint + asset SHA256 have not drifted.
 *   food-candidate-validate — Validate secondary food candidate review rows.
 *   food-candidate-review-workset — Build operator review packet for secondary food candidates.
 *   food-candidate-transfer — Convert operator-confirmed food candidates into intake CSV rows.
 *   food-candidate-apply-plan — Build a manual TS fragment from confirmed food candidates.
 *   restroom-candidate-validate — Validate restroom candidate review rows.
 *   restroom-candidate-review-workset — Build operator review packet for restroom candidates.
 *   restroom-candidate-transfer — Convert operator-confirmed restroom candidates into intake CSV rows.
 *   restroom-candidate-apply-plan — Build a manual TS fragment from confirmed restroom candidates.
 *   field-survey-validate — Validate Jamsil restroom/walking/congestion field-survey rows.
 *   field-survey-workset — Build operator field-survey packet for every Jamsil block.
 *   operator-approval — Approve the generated operator handoff and candidate/survey packets.
 *
 * Usage:
 *   node --import tsx scripts/jamsil-seatmap-ops.mjs release-gate
 *   node --import tsx scripts/jamsil-seatmap-ops.mjs food-candidate-transfer --source-document-id jamsil-operator-YYYYMMDD-food-review --last-updated-at YYYY-MM-DD
 *   node --import tsx scripts/jamsil-seatmap-ops.mjs food-candidate-apply-plan --source-document-id jamsil-operator-YYYYMMDD-food-review --last-updated-at YYYY-MM-DD
 *   node --import tsx scripts/jamsil-seatmap-ops.mjs restroom-candidate-transfer --source-document-id jamsil-operator-YYYYMMDD-restroom-review --last-updated-at YYYY-MM-DD
 *   node --import tsx scripts/jamsil-seatmap-ops.mjs restroom-candidate-apply-plan --source-document-id jamsil-operator-YYYYMMDD-restroom-review --last-updated-at YYYY-MM-DD
 *   node --import tsx scripts/jamsil-seatmap-ops.mjs field-survey-workset
 *   node scripts/stadium-seatmap-ops.mjs jamsil release-gate
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');

// ─── Release-gate constants ──────────────────────────────────────────────────
//  Update these values after the first successful run.
const EXPECTED_TOTAL_BLOCKS = 109;
const EXPECTED_OFFICIAL_ASSET_SHA256 = 'e0d7aa65372ebf6b206ce519f8ed4e73e64232377ec9ace2b871be7a57e8537b';
const EXPECTED_RELEASE_FIXTURE_FINGERPRINT = '4ed2c6ba5a647d0ca68e8540e801164031c09153ab3d1af3e1bd15da920d272e';

// ─── Operator intake constants ───────────────────────────────────────────────
const JAMSIL_OPERATOR_GATE_VERSION = 'JAMSIL_OPERATOR_VISIT_GUIDE_GATE_V1';
const JAMSIL_OPERATOR_REPORT_DIR = path.join(frontendRoot, 'reports/stadium');
const JAMSIL_OPERATOR_INPUT_FILE = 'jamsil-operator-visit-guide-input.csv';
const JAMSIL_OPERATOR_TEMPLATE_BASENAME = 'jamsil-operator-visit-guide-template';
const JAMSIL_OPERATOR_VALIDATION_JSON = 'jamsil-operator-visit-guide-validation.json';
const JAMSIL_OPERATOR_VALIDATION_CSV = 'jamsil-operator-visit-guide-validation.csv';
const JAMSIL_OPERATOR_VALIDATION_MARKDOWN = 'jamsil-operator-visit-guide-validation.md';
const JAMSIL_OPERATOR_APPLY_PLAN_JSON = 'jamsil-operator-visit-guide-apply-plan.json';
const JAMSIL_OPERATOR_APPLY_PLAN_MARKDOWN = 'jamsil-operator-visit-guide-apply-plan.md';
const JAMSIL_OPERATOR_APPLY_PLAN_TS_FRAGMENT = 'jamsil-operator-visit-guide-apply-plan.ts-fragment';
const JAMSIL_OPERATOR_HANDOFF_JSON = 'jamsil-operator-visit-guide-handoff.json';
const JAMSIL_OPERATOR_HANDOFF_MARKDOWN = 'jamsil-operator-visit-guide-handoff.md';
const JAMSIL_OPERATOR_APPROVAL_JSON = 'jamsil-operator-visit-guide-approval.json';
const JAMSIL_OPERATOR_APPROVAL_MARKDOWN = 'jamsil-operator-visit-guide-approval.md';
const JAMSIL_OPERATOR_SOURCE_FILE = path.join(frontendRoot, 'src/data/jamsilOperatorVisitGuide.ts');
const JAMSIL_FOOD_CANDIDATE_REVIEW_FILE = 'docs/stadium/jamsil-food-candidate-review.csv';
const JAMSIL_FOOD_CANDIDATE_VALIDATION_JSON = 'jamsil-food-candidate-review-validation.json';
const JAMSIL_FOOD_CANDIDATE_VALIDATION_CSV = 'jamsil-food-candidate-review-validation.csv';
const JAMSIL_FOOD_CANDIDATE_VALIDATION_MARKDOWN = 'jamsil-food-candidate-review-validation.md';
const JAMSIL_FOOD_CANDIDATE_REVIEW_WORKSET_JSON = 'jamsil-food-candidate-review-workset.json';
const JAMSIL_FOOD_CANDIDATE_REVIEW_WORKSET_CSV = 'jamsil-food-candidate-review-workset.csv';
const JAMSIL_FOOD_CANDIDATE_REVIEW_WORKSET_MARKDOWN = 'jamsil-food-candidate-review-workset.md';
const JAMSIL_FOOD_CANDIDATE_TRANSFER_JSON = 'jamsil-food-candidate-intake-transfer.json';
const JAMSIL_FOOD_CANDIDATE_TRANSFER_CSV = 'jamsil-food-candidate-intake-transfer.csv';
const JAMSIL_FOOD_CANDIDATE_TRANSFER_MARKDOWN = 'jamsil-food-candidate-intake-transfer.md';
const JAMSIL_FOOD_CANDIDATE_APPLY_PLAN_JSON = 'jamsil-food-candidate-apply-plan.json';
const JAMSIL_FOOD_CANDIDATE_APPLY_PLAN_MARKDOWN = 'jamsil-food-candidate-apply-plan.md';
const JAMSIL_FOOD_CANDIDATE_APPLY_PLAN_TS_FRAGMENT = 'jamsil-food-candidate-apply-plan.ts-fragment';
const JAMSIL_RESTROOM_CANDIDATE_REVIEW_FILE = 'docs/stadium/jamsil-restroom-candidate-review.csv';
const JAMSIL_RESTROOM_CANDIDATE_VALIDATION_JSON = 'jamsil-restroom-candidate-review-validation.json';
const JAMSIL_RESTROOM_CANDIDATE_VALIDATION_CSV = 'jamsil-restroom-candidate-review-validation.csv';
const JAMSIL_RESTROOM_CANDIDATE_VALIDATION_MARKDOWN = 'jamsil-restroom-candidate-review-validation.md';
const JAMSIL_RESTROOM_CANDIDATE_REVIEW_WORKSET_JSON = 'jamsil-restroom-candidate-review-workset.json';
const JAMSIL_RESTROOM_CANDIDATE_REVIEW_WORKSET_CSV = 'jamsil-restroom-candidate-review-workset.csv';
const JAMSIL_RESTROOM_CANDIDATE_REVIEW_WORKSET_MARKDOWN = 'jamsil-restroom-candidate-review-workset.md';
const JAMSIL_RESTROOM_CANDIDATE_TRANSFER_JSON = 'jamsil-restroom-candidate-intake-transfer.json';
const JAMSIL_RESTROOM_CANDIDATE_TRANSFER_CSV = 'jamsil-restroom-candidate-intake-transfer.csv';
const JAMSIL_RESTROOM_CANDIDATE_TRANSFER_MARKDOWN = 'jamsil-restroom-candidate-intake-transfer.md';
const JAMSIL_RESTROOM_CANDIDATE_APPLY_PLAN_JSON = 'jamsil-restroom-candidate-apply-plan.json';
const JAMSIL_RESTROOM_CANDIDATE_APPLY_PLAN_MARKDOWN = 'jamsil-restroom-candidate-apply-plan.md';
const JAMSIL_RESTROOM_CANDIDATE_APPLY_PLAN_TS_FRAGMENT = 'jamsil-restroom-candidate-apply-plan.ts-fragment';
const JAMSIL_FIELD_SURVEY_REVIEW_FILE = 'docs/stadium/jamsil-field-survey-review.csv';
const JAMSIL_FIELD_SURVEY_VALIDATION_JSON = 'jamsil-field-survey-validation.json';
const JAMSIL_FIELD_SURVEY_VALIDATION_MARKDOWN = 'jamsil-field-survey-validation.md';
const JAMSIL_FIELD_SURVEY_WORKSET_JSON = 'jamsil-field-survey-workset.json';
const JAMSIL_FIELD_SURVEY_WORKSET_CSV = 'jamsil-field-survey-workset.csv';
const JAMSIL_FIELD_SURVEY_WORKSET_MARKDOWN = 'jamsil-field-survey-workset.md';
const JAMSIL_OPERATOR_REQUIRED_COLUMNS = [
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
const JAMSIL_OPERATOR_FACILITY_KINDS = new Set([
  'ENTRANCE',
  'CONCESSION',
  'RESTROOM',
  'ELEVATOR',
  'PARKING',
  'TRANSIT',
  'TICKET_OFFICE',
  'SHOP',
  'ACCESSIBILITY',
  'RENTAL',
]);
const JAMSIL_OPERATOR_TEAM_CONTEXTS = new Set(['COMMON', 'LG', 'DOOSAN']);
const JAMSIL_OPERATOR_SOURCE_ID_PATTERN = /^jamsil-operator-\d{8}-[a-z0-9-]+$/;
const JAMSIL_OPERATOR_FACILITY_ID_PATTERN = /^jamsil-facility-(entrance|concession|restroom|elevator|parking|transit|ticketoffice|shop|accessibility|rental)-[a-z0-9-]+$/;
const JAMSIL_OPERATOR_NOTICE_ID_PATTERN = /^jamsil-operation-notice-\d{8}-[a-z0-9-]+$/;
const JAMSIL_OPERATOR_ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const JAMSIL_OPERATOR_FORBIDDEN_PATTERN = /https?:\/\/|www\.|크롤|스크래핑|scrap|crawl|web\s*search|웹\s*검색/i;
const JAMSIL_OPERATOR_PLACEHOLDER_PATTERN = /YYYY|YYYY-MM-DD|operator-provided|operator-block-id|operator-id|source-id|<[^>]+>/i;
const JAMSIL_FOOD_CANDIDATE_REQUIRED_COLUMNS = [
  'candidateZoneId',
  'candidateStoreName',
  'candidateFloor',
  'candidateSide',
  'candidateLocationText',
  'candidateSourceDocumentId',
  'candidateStatus',
  'runtimeExposure',
  'operatorFacilityId',
  'operatorNearSectionIds',
  'operatorLocationText',
  'operatorOpenStatus',
  'operatorAccessible',
  'operatorWalkingMinutes',
  'operatorVerificationStatus',
  'reviewerNote',
];
const JAMSIL_FOOD_CANDIDATE_STATUS = 'SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION';
const JAMSIL_FOOD_CANDIDATE_RUNTIME_EXPOSURE = 'DISABLED_UNTIL_OPERATOR_CONFIRMED';
const JAMSIL_FOOD_OPERATOR_FACILITY_ID_PATTERN = /^jamsil-facility-concession-[a-z0-9-]+$/;
const JAMSIL_FOOD_OPERATOR_OPEN_STATUSES = new Set(['OPEN', 'CLOSED', 'GAME_DAY_ONLY', 'UNKNOWN']);
const JAMSIL_FOOD_OPERATOR_ACCESSIBLE_STATUSES = new Set(['YES', 'NO', 'UNKNOWN']);
const JAMSIL_FOOD_OPERATOR_VERIFICATION_STATUSES = new Set(['', 'OPERATOR_CONFIRMED', 'REJECTED', 'NEEDS_RECHECK']);
const JAMSIL_FOOD_CONFIRMATION_REQUIRED_COLUMNS = [
  'operatorFacilityId',
  'operatorNearSectionIds',
  'operatorLocationText',
  'operatorOpenStatus',
  'operatorAccessible',
  'operatorWalkingMinutes',
  'operatorVerificationStatus',
];
const JAMSIL_RESTROOM_CANDIDATE_REQUIRED_COLUMNS = [
  'candidateFacilityId',
  'candidateFacilityName',
  'candidateCategory',
  'candidateFloor',
  'candidateSide',
  'candidateLocationText',
  'candidateAddress',
  'candidateManager',
  'candidatePhone',
  'candidateOpenTime',
  'candidateAccessibleSummary',
  'candidateNearSectionIds',
  'candidateNearGateIds',
  'candidateMapPosition',
  'candidateSourceDocumentId',
  'candidateSourceType',
  'candidateDataStatus',
  'runtimeExposure',
  'operatorFacilityId',
  'operatorNearSectionIds',
  'operatorNearGateIds',
  'operatorLocationText',
  'operatorFloor',
  'operatorSide',
  'operatorOpenStatus',
  'operatorAccessible',
  'operatorWalkingMinutes',
  'operatorVerificationStatus',
  'reviewerNote',
];
const JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE = 'DISABLED_UNTIL_OPERATOR_CONFIRMED';
const JAMSIL_RESTROOM_CANDIDATE_SOURCE_TYPES = new Set([
  'OFFICIAL_SONGPA_PUBLIC_RESTROOM',
  'FIELD_COLLECTED_SECONDARY',
]);
const JAMSIL_RESTROOM_CANDIDATE_DATA_STATUSES = new Set([
  'OFFICIAL_PARTIAL',
  'OFFICIAL_AVAILABLE',
  'FIELD_COLLECTED_NEEDS_CONFIRMATION',
]);
const JAMSIL_RESTROOM_OPERATOR_FACILITY_ID_PATTERN = /^jamsil-facility-restroom-[a-z0-9-]+$/;
const JAMSIL_RESTROOM_GATE_ID_PATTERN = /^JAMSIL_GATE_\d+_\d+$/;
const JAMSIL_RESTROOM_OPERATOR_VERIFICATION_STATUSES = new Set(['', 'OPERATOR_CONFIRMED', 'REJECTED', 'NEEDS_RECHECK']);
const JAMSIL_RESTROOM_OPERATOR_OPEN_STATUSES = new Set(['OPEN', 'CLOSED', 'GAME_DAY_ONLY', '24_HOURS', 'UNKNOWN']);
const JAMSIL_RESTROOM_OPERATOR_ACCESSIBLE_STATUSES = new Set(['YES', 'NO', 'UNKNOWN']);
const JAMSIL_RESTROOM_CONFIRMATION_REQUIRED_COLUMNS = [
  'operatorFacilityId',
  'operatorNearSectionIds',
  'operatorLocationText',
  'operatorFloor',
  'operatorSide',
  'operatorOpenStatus',
  'operatorAccessible',
  'operatorWalkingMinutes',
  'operatorVerificationStatus',
];
const JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_OFFICIAL = 'jamsil-songpa-public-restroom-20260531-user-paste-v1';
const JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY = 'jamsil-secondary-restroom-map-20260531-user-paste-v1';
const JAMSIL_RESTROOM_CANDIDATE_ROWS = [
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_PUBLIC_STADIUM',
    candidateFacilityName: '잠실야구장',
    candidateCategory: 'RESTROOM',
    candidateFloor: 'OUTSIDE',
    candidateSide: 'CENTER',
    candidateLocationText: '잠실야구장 공중화장실 기본 정보',
    candidateAddress: '서울특별시 송파구 올림픽로 25',
    candidateManager: '서울시 체육시설관리사업소',
    candidatePhone: '02-2240-8703',
    candidateOpenTime: '운영시간내',
    candidateAccessibleSummary: '장애인 대변기 수와 휠체어 진입 여부 공식 상세 미제공',
    candidateNearSectionIds: '',
    candidateNearGateIds: '',
    candidateMapPosition: '',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_OFFICIAL,
    candidateSourceType: 'OFFICIAL_SONGPA_PUBLIC_RESTROOM',
    candidateDataStatus: 'OFFICIAL_PARTIAL',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_3B_OUTER',
    candidateFacilityName: '잠실야구장 3루 외곽',
    candidateCategory: 'RESTROOM',
    candidateFloor: 'OUTSIDE',
    candidateSide: 'THIRD_BASE',
    candidateLocationText: '잠실야구장 3루 외곽 공중화장실',
    candidateAddress: '서울특별시 송파구 올림픽로 25',
    candidateManager: '서울시 체육시설관리사업소',
    candidatePhone: '02-2202-3834',
    candidateOpenTime: '00:00~24:00',
    candidateAccessibleSummary: '남성 장애인용 대변기 1개 / 휠체어 진입 가능',
    candidateNearSectionIds: '',
    candidateNearGateIds: '',
    candidateMapPosition: '',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_OFFICIAL,
    candidateSourceType: 'OFFICIAL_SONGPA_PUBLIC_RESTROOM',
    candidateDataStatus: 'OFFICIAL_AVAILABLE',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_MAIN_STADIUM_FRONT',
    candidateFacilityName: '잠실주경기장 야구장 앞',
    candidateCategory: 'RESTROOM',
    candidateFloor: 'OUTSIDE',
    candidateSide: 'CENTER',
    candidateLocationText: '잠실주경기장 야구장 앞 공중화장실',
    candidateAddress: '서울특별시 송파구 올림픽로 25',
    candidateManager: '서울시 체육시설관리사업소',
    candidatePhone: '02-2240-8703',
    candidateOpenTime: '00:00~24:00',
    candidateAccessibleSummary: '장애인 대변기 수와 휠체어 진입 여부 공식 상세 미제공',
    candidateNearSectionIds: '',
    candidateNearGateIds: '',
    candidateMapPosition: '',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_OFFICIAL,
    candidateSourceType: 'OFFICIAL_SONGPA_PUBLIC_RESTROOM',
    candidateDataStatus: 'OFFICIAL_PARTIAL',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_1F_334',
    candidateFacilityName: '1층 334구역 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '1F',
    candidateSide: 'THIRD_BASE',
    candidateLocationText: '334 섹션 근처 / 자문밖 / BHC 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: 'block-334',
    candidateNearGateIds: '',
    candidateMapPosition: '',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_1F_223',
    candidateFacilityName: '1층 223구역 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '1F',
    candidateSide: 'THIRD_BASE',
    candidateLocationText: '223 섹션 근처 / 광장식당 / KFC 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: 'block-223',
    candidateNearGateIds: '',
    candidateMapPosition: '',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_1F_101',
    candidateFacilityName: '1층 101구역 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '1F',
    candidateSide: 'FIRST_BASE',
    candidateLocationText: '101 섹션 근처 / GS25 / BBQ 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: 'block-101',
    candidateNearGateIds: '',
    candidateMapPosition: '',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_1F_401',
    candidateFacilityName: '1층 401구역 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '1F',
    candidateSide: 'OUTFIELD',
    candidateLocationText: '401 섹션 근처 / GS25 / 무인발권기 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: 'block-401',
    candidateNearGateIds: '',
    candidateMapPosition: '',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_2F_GATE_2_1',
    candidateFacilityName: '2층 2-1 Gate 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '2F',
    candidateSide: 'THIRD_BASE',
    candidateLocationText: 'GATE 2-1 근처 / BHC / 카페그라운드 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: '',
    candidateNearGateIds: 'JAMSIL_GATE_2_1',
    candidateMapPosition: '',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_2F_GATE_2_2',
    candidateFacilityName: '2층 2-2 Gate 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '2F',
    candidateSide: 'CENTER',
    candidateLocationText: 'GATE 2-2 근처 / 프랭크버거 / BBQ 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: '',
    candidateNearGateIds: 'JAMSIL_GATE_2_2',
    candidateMapPosition: '',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_2F_GATE_2_3',
    candidateFacilityName: '2층 2-3 Gate 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '2F',
    candidateSide: 'FIRST_BASE',
    candidateLocationText: 'GATE 2-3 근처 / 트윈스 굿즈샵 / 트윈스존 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: '',
    candidateNearGateIds: 'JAMSIL_GATE_2_3',
    candidateMapPosition: '',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_3F_D03',
    candidateFacilityName: '3층 D03 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '3F',
    candidateSide: 'UNKNOWN',
    candidateLocationText: 'D03 근처 / GS25 / KFC 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: '',
    candidateNearGateIds: '',
    candidateMapPosition: 'D03',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_3F_D05',
    candidateFacilityName: '3층 D05 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '3F',
    candidateSide: 'UNKNOWN',
    candidateLocationText: 'D05 근처 / GS25 / 와팡 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: '',
    candidateNearGateIds: '',
    candidateMapPosition: 'D05',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_3F_D08',
    candidateFacilityName: '3층 D08 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '3F',
    candidateSide: 'UNKNOWN',
    candidateLocationText: 'D08 근처 / GS25 / BBQ 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: '',
    candidateNearGateIds: '',
    candidateMapPosition: 'D08',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
  {
    candidateFacilityId: 'JAMSIL_RESTROOM_3F_D10',
    candidateFacilityName: '3층 D10 인근 화장실',
    candidateCategory: 'RESTROOM',
    candidateFloor: '3F',
    candidateSide: 'UNKNOWN',
    candidateLocationText: 'D10 근처 / GS25 / 프랭크버거 인근',
    candidateAddress: '',
    candidateManager: '',
    candidatePhone: '',
    candidateOpenTime: '',
    candidateAccessibleSummary: '',
    candidateNearSectionIds: '',
    candidateNearGateIds: '',
    candidateMapPosition: 'D10',
    candidateSourceDocumentId: JAMSIL_RESTROOM_CANDIDATE_SOURCE_ID_SECONDARY,
    candidateSourceType: 'FIELD_COLLECTED_SECONDARY',
    candidateDataStatus: 'FIELD_COLLECTED_NEEDS_CONFIRMATION',
    runtimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
  },
];
const JAMSIL_FIELD_SURVEY_REQUIRED_COLUMNS = [
  'blockId',
  'blockLabel',
  'category',
  'level',
  'side',
  'operatorRestroomFacilityId',
  'operatorRestroomLocationText',
  'operatorRestroomFloor',
  'operatorRestroomSide',
  'operatorRestroomAccessible',
  'operatorSectionToRestroomMinutes',
  'operatorRestroomVerificationStatus',
  'operatorGateToSectionMinutes',
  'operatorSectionToFoodMinutes',
  'operatorWalkingVerificationStatus',
  'operatorGateCongestionLevel',
  'operatorConcourseCongestionLevel',
  'operatorFoodQueueLevel',
  'operatorRestroomQueueLevel',
  'operatorCongestionObservedAt',
  'operatorCongestionVerificationStatus',
  'reviewerNote',
];
const JAMSIL_FIELD_SURVEY_VERIFICATION_STATUSES = new Set(['', 'OPERATOR_CONFIRMED', 'REJECTED', 'NEEDS_RECHECK']);
const JAMSIL_FIELD_SURVEY_ACCESSIBLE_STATUSES = new Set(['', 'YES', 'NO', 'UNKNOWN']);
const JAMSIL_FIELD_SURVEY_CONGESTION_LEVELS = new Set(['', 'UNKNOWN', 'LOW', 'MEDIUM', 'HIGH']);
const JAMSIL_FIELD_SURVEY_CONCRETE_CONGESTION_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH']);
const JAMSIL_FIELD_SURVEY_RESTROOM_FACILITY_ID_PATTERN = /^jamsil-facility-restroom-[a-z0-9-]+$/;
const JAMSIL_FIELD_SURVEY_OBSERVED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\+09:00$/;
const JAMSIL_FIELD_SURVEY_RESTROOM_REQUIRED_COLUMNS = [
  'operatorRestroomFacilityId',
  'operatorRestroomLocationText',
  'operatorRestroomFloor',
  'operatorRestroomSide',
  'operatorRestroomAccessible',
  'operatorSectionToRestroomMinutes',
];
const JAMSIL_FIELD_SURVEY_WALKING_REQUIRED_COLUMNS = [
  'operatorGateToSectionMinutes',
  'operatorSectionToFoodMinutes',
];
const JAMSIL_FIELD_SURVEY_CONGESTION_LEVEL_COLUMNS = [
  'operatorGateCongestionLevel',
  'operatorConcourseCongestionLevel',
  'operatorFoodQueueLevel',
  'operatorRestroomQueueLevel',
];
const JAMSIL_OPERATOR_DETAIL_REQUIRED_KINDS = new Set([
  'CONCESSION',
  'RESTROOM',
  'ELEVATOR',
  'PARKING',
  'TRANSIT',
  'TICKET_OFFICE',
  'SHOP',
  'ACCESSIBILITY',
  'RENTAL',
]);
const JAMSIL_OPERATOR_REQUIRED_DETAIL_COLUMNS = [
  'floor',
  'side',
  'nearSectionIds',
  'locationText',
  'openStatus',
  'verificationStatus',
];
const JAMSIL_OPERATOR_OPEN_STATUSES = new Set([...JAMSIL_FOOD_OPERATOR_OPEN_STATUSES, '24_HOURS']);
const JAMSIL_OPERATOR_ACCESSIBLE_STATUSES = JAMSIL_FOOD_OPERATOR_ACCESSIBLE_STATUSES;
const JAMSIL_OPERATOR_VERIFICATION_STATUSES = new Set(['OPERATOR_CONFIRMED']);
const JAMSIL_OPERATOR_APPROVAL_STATUSES = new Set([
  'WAITING_FOR_OPERATOR',
  'PENDING_OPERATOR_APPROVAL',
  'APPROVED',
  'STALE_APPROVAL',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function snapshotFixture(blocks) {
  const sorted = blocks
    .map((b) => ({
      id: b.id,
      block: b.block,
      level: b.level,
      category: b.category,
      d: b.imageGeometry.d,
      labelX: b.imageGeometry.labelX,
      labelY: b.imageGeometry.labelY,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({ blocks: sorted });
}

const operatorArgValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const operatorHasFlag = (name) => process.argv.includes(name);
const resolveOperatorPath = (value) => path.resolve(frontendRoot, value);

const operatorGatePaths = () => {
  const outDir = resolveOperatorPath(operatorArgValue('--out-dir', JAMSIL_OPERATOR_REPORT_DIR));
  const inputPath = resolveOperatorPath(operatorArgValue('--input', path.join(outDir, JAMSIL_OPERATOR_INPUT_FILE)));
  return {
    outDir,
    inputPath,
    templateJsonPath: path.join(outDir, `${JAMSIL_OPERATOR_TEMPLATE_BASENAME}.json`),
    templateMarkdownPath: path.join(outDir, `${JAMSIL_OPERATOR_TEMPLATE_BASENAME}.md`),
    validationJsonPath: path.join(outDir, JAMSIL_OPERATOR_VALIDATION_JSON),
    validationCsvPath: path.join(outDir, JAMSIL_OPERATOR_VALIDATION_CSV),
    validationMarkdownPath: path.join(outDir, JAMSIL_OPERATOR_VALIDATION_MARKDOWN),
    applyPlanJsonPath: path.join(outDir, JAMSIL_OPERATOR_APPLY_PLAN_JSON),
    applyPlanMarkdownPath: path.join(outDir, JAMSIL_OPERATOR_APPLY_PLAN_MARKDOWN),
    applyPlanTsFragmentPath: path.join(outDir, JAMSIL_OPERATOR_APPLY_PLAN_TS_FRAGMENT),
    handoffJsonPath: path.join(outDir, JAMSIL_OPERATOR_HANDOFF_JSON),
    handoffMarkdownPath: path.join(outDir, JAMSIL_OPERATOR_HANDOFF_MARKDOWN),
    approvalJsonPath: path.join(outDir, JAMSIL_OPERATOR_APPROVAL_JSON),
    approvalMarkdownPath: path.join(outDir, JAMSIL_OPERATOR_APPROVAL_MARKDOWN),
  };
};

const foodCandidatePaths = () => {
  const outDir = resolveOperatorPath(operatorArgValue('--out-dir', JAMSIL_OPERATOR_REPORT_DIR));
  const reviewPath = resolveOperatorPath(operatorArgValue('--review', JAMSIL_FOOD_CANDIDATE_REVIEW_FILE));
  return {
    outDir,
    reviewPath,
    validationJsonPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_VALIDATION_JSON),
    validationCsvPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_VALIDATION_CSV),
    validationMarkdownPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_VALIDATION_MARKDOWN),
    reviewWorksetJsonPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_REVIEW_WORKSET_JSON),
    reviewWorksetCsvPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_REVIEW_WORKSET_CSV),
    reviewWorksetMarkdownPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_REVIEW_WORKSET_MARKDOWN),
    transferJsonPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_TRANSFER_JSON),
    transferCsvPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_TRANSFER_CSV),
    transferMarkdownPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_TRANSFER_MARKDOWN),
    applyPlanJsonPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_APPLY_PLAN_JSON),
    applyPlanMarkdownPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_APPLY_PLAN_MARKDOWN),
    applyPlanTsFragmentPath: path.join(outDir, JAMSIL_FOOD_CANDIDATE_APPLY_PLAN_TS_FRAGMENT),
  };
};

const restroomCandidatePaths = () => {
  const outDir = resolveOperatorPath(operatorArgValue('--out-dir', JAMSIL_OPERATOR_REPORT_DIR));
  const taskName = process.argv[2] ?? '';
  const genericReviewFallback = taskName.startsWith('restroom-candidate')
    ? operatorArgValue('--review', JAMSIL_RESTROOM_CANDIDATE_REVIEW_FILE)
    : JAMSIL_RESTROOM_CANDIDATE_REVIEW_FILE;
  const reviewPath = resolveOperatorPath(operatorArgValue('--restroom-review', genericReviewFallback));
  return {
    outDir,
    reviewPath,
    validationJsonPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_VALIDATION_JSON),
    validationCsvPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_VALIDATION_CSV),
    validationMarkdownPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_VALIDATION_MARKDOWN),
    reviewWorksetJsonPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_REVIEW_WORKSET_JSON),
    reviewWorksetCsvPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_REVIEW_WORKSET_CSV),
    reviewWorksetMarkdownPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_REVIEW_WORKSET_MARKDOWN),
    transferJsonPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_TRANSFER_JSON),
    transferCsvPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_TRANSFER_CSV),
    transferMarkdownPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_TRANSFER_MARKDOWN),
    applyPlanJsonPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_APPLY_PLAN_JSON),
    applyPlanMarkdownPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_APPLY_PLAN_MARKDOWN),
    applyPlanTsFragmentPath: path.join(outDir, JAMSIL_RESTROOM_CANDIDATE_APPLY_PLAN_TS_FRAGMENT),
  };
};

const fieldSurveyPaths = () => {
  const outDir = resolveOperatorPath(operatorArgValue('--out-dir', JAMSIL_OPERATOR_REPORT_DIR));
  const taskName = process.argv[2] ?? '';
  const genericReviewFallback = taskName.startsWith('field-survey')
    ? operatorArgValue('--review', JAMSIL_FIELD_SURVEY_REVIEW_FILE)
    : JAMSIL_FIELD_SURVEY_REVIEW_FILE;
  const reviewPath = resolveOperatorPath(operatorArgValue('--field-survey-review', genericReviewFallback));
  return {
    outDir,
    reviewPath,
    validationJsonPath: path.join(outDir, JAMSIL_FIELD_SURVEY_VALIDATION_JSON),
    validationMarkdownPath: path.join(outDir, JAMSIL_FIELD_SURVEY_VALIDATION_MARKDOWN),
    worksetJsonPath: path.join(outDir, JAMSIL_FIELD_SURVEY_WORKSET_JSON),
    worksetCsvPath: path.join(outDir, JAMSIL_FIELD_SURVEY_WORKSET_CSV),
    worksetMarkdownPath: path.join(outDir, JAMSIL_FIELD_SURVEY_WORKSET_MARKDOWN),
  };
};

function parseCsvLine(line) {
  const values = [];
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

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { header: [], rows: [] };

  const header = parseCsvLine(lines[0]).map((column) => column.trim());
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    return {
      rowNumber: index + 2,
      raw: line,
      values: Object.fromEntries(header.map((column, columnIndex) => [
        column,
        (values[columnIndex] ?? '').trim(),
      ])),
    };
  });

  return { header, rows };
}

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join(';') : String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const csvLine = (values) => values.map(csvEscape).join(',');

const splitOperatorList = (value) => String(value ?? '')
  .split(/[;|]/)
  .map((item) => item.trim())
  .filter(Boolean);

const facilityKindSlug = (kind) => ({
  TICKET_OFFICE: 'ticketoffice',
}[kind] ?? String(kind ?? '').toLowerCase());

const rowHasOperatorPlaceholder = (row) => Object.values(row.values)
  .filter(Boolean)
  .some((value) => JAMSIL_OPERATOR_PLACEHOLDER_PATTERN.test(value));

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const sha256File = async (filePath) => createHash('sha256').update(await fs.readFile(filePath)).digest('hex');

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readJsonFile = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

function validateOperatorSourceFields(record, rowNumber, addBlocker) {
  if (!JAMSIL_OPERATOR_SOURCE_ID_PATTERN.test(record.sourceDocumentId ?? '')) {
    addBlocker('INVALID_SOURCE_DOCUMENT_ID', `row ${rowNumber} sourceDocumentId must match jamsil-operator-YYYYMMDD-*`);
  }
  if (!JAMSIL_OPERATOR_ISO_DATE_PATTERN.test(record.lastUpdatedAt ?? '')) {
    addBlocker('INVALID_LAST_UPDATED_AT', `row ${rowNumber} lastUpdatedAt must be YYYY-MM-DD`);
  }
  if (JAMSIL_OPERATOR_FORBIDDEN_PATTERN.test(JSON.stringify(record))) {
    addBlocker('FORBIDDEN_OPERATOR_DATA', `row ${rowNumber} contains URL/crawling/scraping/web-search text`);
  }
}

const isUnknownOrNonNegativeInteger = (value) => value === 'UNKNOWN' || /^\d+$/.test(String(value ?? ''));

function validateFacilityDetailFields(record, rowNumber, blockIds, addBlocker) {
  const requiresDetails = JAMSIL_OPERATOR_DETAIL_REQUIRED_KINDS.has(record.kind);
  if (requiresDetails) {
    JAMSIL_OPERATOR_REQUIRED_DETAIL_COLUMNS.forEach((column) => {
      if (!record[column]) {
        addBlocker('MISSING_FACILITY_DETAIL_FIELD', `row ${rowNumber} ${column} is required for ${record.kind}`);
      }
    });
  }

  const nearSectionIds = splitOperatorList(record.nearSectionIds);
  nearSectionIds.forEach((blockId) => {
    if (!blockIds.has(blockId)) {
      addBlocker('UNKNOWN_FACILITY_NEAR_SECTION_ID', `row ${rowNumber} nearSectionIds ${blockId} is not in JAMSIL_BLOCKS`);
    }
  });

  if (record.openStatus && !JAMSIL_OPERATOR_OPEN_STATUSES.has(record.openStatus)) {
    addBlocker('INVALID_FACILITY_OPEN_STATUS', `row ${rowNumber} openStatus must be OPEN/CLOSED/GAME_DAY_ONLY/24_HOURS/UNKNOWN`);
  }
  if (record.accessible && !JAMSIL_OPERATOR_ACCESSIBLE_STATUSES.has(record.accessible)) {
    addBlocker('INVALID_FACILITY_ACCESSIBLE', `row ${rowNumber} accessible must be YES/NO/UNKNOWN`);
  }
  if (record.walkingMinutes && !isUnknownOrNonNegativeInteger(record.walkingMinutes)) {
    addBlocker('INVALID_FACILITY_WALKING_MINUTES', `row ${rowNumber} walkingMinutes must be UNKNOWN or a non-negative integer`);
  }
  if (record.verificationStatus && !JAMSIL_OPERATOR_VERIFICATION_STATUSES.has(record.verificationStatus)) {
    addBlocker('INVALID_FACILITY_VERIFICATION_STATUS', `row ${rowNumber} verificationStatus must be OPERATOR_CONFIRMED`);
  }
}

function normalizeFacilityPoint(record) {
  const point = {
    id: record.pointId,
    kind: record.kind,
    label: record.label,
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: record.sourceDocumentId,
    lastUpdatedAt: record.lastUpdatedAt,
  };
  const optionalFields = [
    ['floor', record.floor],
    ['side', record.side],
    ['nearSectionIds', splitOperatorList(record.nearSectionIds)],
    ['locationText', record.locationText],
    ['openStatus', record.openStatus],
    ['accessible', record.accessible],
    [
      'walkingMinutes',
      record.walkingMinutes === 'UNKNOWN'
        ? 'UNKNOWN'
        : /^\d+$/.test(record.walkingMinutes ?? '')
          ? Number(record.walkingMinutes)
          : '',
    ],
    ['verificationStatus', record.verificationStatus],
  ];

  optionalFields.forEach(([key, value]) => {
    if (Array.isArray(value) ? value.length > 0 : value !== '') {
      point[key] = value;
    }
  });

  return point;
}

async function validateJamsilOperatorInput({ writeReports = true } = {}) {
  const { JAMSIL_BLOCKS } = await import('../src/data/jamsilSeatData.ts');
  const paths = operatorGatePaths();
  const blockIds = new Set(JAMSIL_BLOCKS.map((block) => block.id));
  const sourceSha256Before = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  let header = [];
  let rows = [];
  const blockers = [];
  const rowReports = [];
  const normalized = {
    facilityPoints: [],
    blockGuidance: [],
    operationNotices: [],
  };

  try {
    ({ header, rows } = parseCsv(await fs.readFile(paths.inputPath, 'utf8')));
  } catch {
    blockers.push(`INPUT_CSV_MISSING:${path.relative(frontendRoot, paths.inputPath)}`);
  }

  const missingColumns = JAMSIL_OPERATOR_REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  missingColumns.forEach((column) => blockers.push(`MISSING_COLUMN:${column}`));

  const jamsilRows = rows.filter((row) => row.values.stadium === 'JAMSIL');
  const nonJamsilRows = rows.filter((row) => row.values.stadium && row.values.stadium !== 'JAMSIL');
  nonJamsilRows.forEach((row) => blockers.push(`NON_JAMSIL_ROW:row ${row.rowNumber}`));

  const placeholderRows = jamsilRows.filter(rowHasOperatorPlaceholder);
  const realRows = jamsilRows.filter((row) => !rowHasOperatorPlaceholder(row));

  placeholderRows.forEach((row) => {
    rowReports.push({
      rowNumber: row.rowNumber,
      recordType: row.values.recordType || '-',
      status: 'waiting_for_operator',
      blockers: ['PLACEHOLDER_ROW'],
    });
  });

  if (placeholderRows.length > 0 && realRows.length > 0) {
    placeholderRows.forEach((row) => blockers.push(`PLACEHOLDER_ROW_PRESENT:row ${row.rowNumber}`));
  }

  const pointRowsById = new Map();
  const noticeIds = new Set();
  const guidanceBlockIds = new Set();
  const pendingBlockReferenceChecks = [];

  realRows.forEach((row) => {
    const record = row.values;
    const rowBlockers = [];
    const addBlocker = (code, detail) => {
      rowBlockers.push(code);
      blockers.push(`${code}:${detail}`);
    };

    validateOperatorSourceFields(record, row.rowNumber, addBlocker);

    if (!['facility', 'block', 'notice'].includes(record.recordType)) {
      addBlocker('INVALID_RECORD_TYPE', `row ${row.rowNumber} recordType must be facility/block/notice`);
    }

    if (record.recordType === 'facility') {
      if (!JAMSIL_OPERATOR_FACILITY_ID_PATTERN.test(record.pointId ?? '')) {
        addBlocker('INVALID_FACILITY_POINT_ID', `row ${row.rowNumber} pointId must match jamsil-facility-*`);
      }
      if (!JAMSIL_OPERATOR_FACILITY_KINDS.has(record.kind)) {
        addBlocker('INVALID_FACILITY_KIND', `row ${row.rowNumber} kind must be a known facility kind`);
      }
      if (record.kind && record.pointId && !record.pointId.startsWith(`jamsil-facility-${facilityKindSlug(record.kind)}-`)) {
        addBlocker('FACILITY_ID_KIND_MISMATCH', `row ${row.rowNumber} pointId prefix must match kind`);
      }
      if (!record.label) {
        addBlocker('MISSING_FACILITY_LABEL', `row ${row.rowNumber} facility label is required`);
      }
      if (pointRowsById.has(record.pointId)) {
        addBlocker('DUPLICATE_FACILITY_POINT_ID', `row ${row.rowNumber} duplicate pointId ${record.pointId}`);
      }
      validateFacilityDetailFields(record, row.rowNumber, blockIds, addBlocker);

      if (rowBlockers.length === 0) {
        const point = normalizeFacilityPoint(record);
        pointRowsById.set(point.id, point);
        normalized.facilityPoints.push(point);
      }
    }

    if (record.recordType === 'block') {
      if (!blockIds.has(record.blockId)) {
        addBlocker('UNKNOWN_BLOCK_ID', `row ${row.rowNumber} blockId ${record.blockId || '-'} is not in JAMSIL_BLOCKS`);
      }
      if (guidanceBlockIds.has(record.blockId)) {
        addBlocker('DUPLICATE_BLOCK_GUIDANCE', `row ${row.rowNumber} duplicate blockId ${record.blockId}`);
      }

      const recommendedEntrancePointIds = splitOperatorList(record.recommendedEntrancePointIds);
      const nearbyFacilityPointIds = splitOperatorList(record.nearbyFacilityPointIds);
      const cautionNotes = splitOperatorList(record.cautionNotes);
      if (rowBlockers.length === 0) {
        guidanceBlockIds.add(record.blockId);
        const guidance = {
          blockId: record.blockId,
          recommendedEntrancePointIds,
          nearbyFacilityPointIds,
          cautionNotes,
          sourceDocumentId: record.sourceDocumentId,
          lastUpdatedAt: record.lastUpdatedAt,
        };
        normalized.blockGuidance.push(guidance);
        pendingBlockReferenceChecks.push({ rowNumber: row.rowNumber, guidance });
      }
    }

    if (record.recordType === 'notice') {
      if (!JAMSIL_OPERATOR_NOTICE_ID_PATTERN.test(record.noticeId ?? '')) {
        addBlocker('INVALID_OPERATION_NOTICE_ID', `row ${row.rowNumber} noticeId must match jamsil-operation-notice-YYYYMMDD-*`);
      }
      if (noticeIds.has(record.noticeId)) {
        addBlocker('DUPLICATE_OPERATION_NOTICE_ID', `row ${row.rowNumber} duplicate noticeId ${record.noticeId}`);
      }
      if (!JAMSIL_OPERATOR_ISO_DATE_PATTERN.test(record.validFrom ?? '')) {
        addBlocker('INVALID_NOTICE_VALID_FROM', `row ${row.rowNumber} validFrom must be YYYY-MM-DD`);
      }
      if (!JAMSIL_OPERATOR_ISO_DATE_PATTERN.test(record.validTo ?? '')) {
        addBlocker('INVALID_NOTICE_VALID_TO', `row ${row.rowNumber} validTo must be YYYY-MM-DD`);
      }
      if (record.validFrom && record.validTo && record.validFrom > record.validTo) {
        addBlocker('INVALID_NOTICE_DATE_RANGE', `row ${row.rowNumber} validFrom must be <= validTo`);
      }
      if (!/^-?\d+$/.test(record.priority ?? '')) {
        addBlocker('INVALID_NOTICE_PRIORITY', `row ${row.rowNumber} priority must be an integer`);
      }
      if (!JAMSIL_OPERATOR_TEAM_CONTEXTS.has(record.teamContext)) {
        addBlocker('INVALID_TEAM_CONTEXT', `row ${row.rowNumber} teamContext must be COMMON/LG/DOOSAN`);
      }
      if (!record.message) {
        addBlocker('MISSING_NOTICE_MESSAGE', `row ${row.rowNumber} message is required`);
      }
      splitOperatorList(record.affectedBlockIds).forEach((blockId) => {
        if (!blockIds.has(blockId)) {
          addBlocker('UNKNOWN_NOTICE_BLOCK_ID', `row ${row.rowNumber} affectedBlockId ${blockId} is not in JAMSIL_BLOCKS`);
        }
      });

      if (rowBlockers.length === 0) {
        noticeIds.add(record.noticeId);
        normalized.operationNotices.push({
          id: record.noticeId,
          validFrom: record.validFrom,
          validTo: record.validTo,
          priority: Number(record.priority),
          teamContext: record.teamContext,
          affectedBlockIds: splitOperatorList(record.affectedBlockIds),
          message: record.message,
          lastUpdatedAt: record.lastUpdatedAt,
          sourceDocumentId: record.sourceDocumentId,
        });
      }
    }

    rowReports.push({
      rowNumber: row.rowNumber,
      recordType: record.recordType || '-',
      status: rowBlockers.length === 0 ? 'valid' : 'blocked',
      blockers: rowBlockers,
    });
  });

  pendingBlockReferenceChecks.forEach(({ rowNumber, guidance }) => {
    guidance.recommendedEntrancePointIds.forEach((pointId) => {
      const point = pointRowsById.get(pointId);
      if (!point) {
        blockers.push(`MISSING_FACILITY_REFERENCE:row ${rowNumber} ${pointId}`);
      } else if (point.kind !== 'ENTRANCE') {
        blockers.push(`NON_ENTRANCE_RECOMMENDED_REFERENCE:row ${rowNumber} ${pointId}`);
      }
    });
    guidance.nearbyFacilityPointIds.forEach((pointId) => {
      const point = pointRowsById.get(pointId);
      if (!point) {
        blockers.push(`MISSING_FACILITY_REFERENCE:row ${rowNumber} ${pointId}`);
      } else if (point.kind === 'ENTRANCE') {
        blockers.push(`ENTRANCE_USED_AS_NEARBY_FACILITY:row ${rowNumber} ${pointId}`);
      }
    });
  });

  const status = blockers.length > 0
    ? 'blocked'
    : realRows.length === 0
      ? 'waiting_for_operator'
      : 'ready_for_manual_apply';
  const sourceSha256After = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const report = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    sourceFile: {
      path: 'src/data/jamsilOperatorVisitGuide.ts',
      sha256Before: sourceSha256Before,
      sha256After: sourceSha256After,
      unchanged: sourceSha256Before === sourceSha256After,
    },
    input: {
      path: path.relative(frontendRoot, paths.inputPath),
      totalRows: rows.length,
      jamsilRows: jamsilRows.length,
      realRows: realRows.length,
      placeholderRows: placeholderRows.length,
      missingColumns,
    },
    sourcePolicy: {
      runtimeReadsStaticTsOnly: true,
      manualMissingContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: ['external URL', 'crawling', 'scraping', 'web-search-based baseball data'],
    },
    summary: {
      facilityPoints: normalized.facilityPoints.length,
      blockGuidance: normalized.blockGuidance.length,
      operationNotices: normalized.operationNotices.length,
      blockerCount: blockers.length,
    },
    blockers,
    rows: rowReports,
    normalizedData: status === 'ready_for_manual_apply' ? normalized : {
      facilityPoints: [],
      blockGuidance: [],
      operationNotices: [],
    },
  };

  if (writeReports) {
    await fs.mkdir(paths.outDir, { recursive: true });
    await fs.writeFile(paths.validationJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(paths.validationCsvPath, `${[
      csvLine(['rowNumber', 'recordType', 'status', 'blockers']),
      ...rowReports.map((row) => csvLine([row.rowNumber, row.recordType, row.status, row.blockers.join(';')])),
    ].join('\n')}\n`, 'utf8');
    await fs.writeFile(paths.validationMarkdownPath, [
      '# Jamsil Operator Visit Guide Validation',
      '',
      `- status: \`${status}\``,
      `- input: \`${path.relative(frontendRoot, paths.inputPath)}\``,
      `- sourceDataWritePerformed: \`${report.sourceDataWritePerformed}\``,
      `- blockerCount: \`${blockers.length}\``,
      '',
      '## Rows',
      '',
      markdownTable(
        ['row', 'type', 'status', 'blockers'],
        rowReports.map((row) => [row.rowNumber, row.recordType, row.status, row.blockers.join(';') || '-']),
      ),
      '',
      ...(blockers.length > 0 ? ['## Blockers', '', ...blockers.map((blocker) => `- ${blocker}`), ''] : []),
    ].join('\n'), 'utf8');
  }

  return { report, paths };
}

async function validateJamsilFoodCandidateReview({ writeReports = true } = {}) {
  const { JAMSIL_BLOCKS } = await import('../src/data/jamsilSeatData.ts');
  const { JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES } = await import('../src/data/jamsilOfficialSeedData.ts');
  const paths = foodCandidatePaths();
  const blockIds = new Set(JAMSIL_BLOCKS.map((block) => block.id));
  const expectedCandidatePairs = new Set(JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES.flatMap((zone) => (
    zone.storeNames.map((storeName) => `${zone.zoneId}::${storeName}`)
  )));
  let header = [];
  let rows = [];
  const blockers = [];
  const rowReports = [];
  const confirmedRows = [];
  const confirmedOperatorFacilityIds = new Set();

  try {
    ({ header, rows } = parseCsv(await fs.readFile(paths.reviewPath, 'utf8')));
  } catch {
    blockers.push(`FOOD_REVIEW_CSV_MISSING:${path.relative(frontendRoot, paths.reviewPath)}`);
  }

  const missingColumns = JAMSIL_FOOD_CANDIDATE_REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  missingColumns.forEach((column) => blockers.push(`FOOD_REVIEW_MISSING_COLUMN:${column}`));

  const seenCandidatePairs = new Set();
  rows.forEach((row) => {
    const record = row.values;
    const rowBlockers = [];
    const addBlocker = (code, detail) => {
      rowBlockers.push(code);
      blockers.push(`${code}:${detail}`);
    };
    const candidateKey = `${record.candidateZoneId}::${record.candidateStoreName}`;
    const operatorFields = [
      record.operatorFacilityId,
      record.operatorNearSectionIds,
      record.operatorLocationText,
      record.operatorOpenStatus,
      record.operatorAccessible,
      record.operatorWalkingMinutes,
    ].filter(Boolean);

    if (JAMSIL_OPERATOR_FORBIDDEN_PATTERN.test(JSON.stringify(record))) {
      addBlocker('FOOD_REVIEW_FORBIDDEN_DATA', `row ${row.rowNumber} contains URL/crawling/scraping/web-search text`);
    }
    if (!expectedCandidatePairs.has(candidateKey)) {
      addBlocker('FOOD_REVIEW_UNKNOWN_CANDIDATE', `row ${row.rowNumber} ${candidateKey} is not in JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES`);
    }
    if (seenCandidatePairs.has(candidateKey)) {
      addBlocker('FOOD_REVIEW_DUPLICATE_CANDIDATE', `row ${row.rowNumber} duplicate ${candidateKey}`);
    }
    seenCandidatePairs.add(candidateKey);
    if (record.candidateStatus !== JAMSIL_FOOD_CANDIDATE_STATUS) {
      addBlocker('FOOD_REVIEW_INVALID_CANDIDATE_STATUS', `row ${row.rowNumber} candidateStatus must be ${JAMSIL_FOOD_CANDIDATE_STATUS}`);
    }
    if (record.runtimeExposure !== JAMSIL_FOOD_CANDIDATE_RUNTIME_EXPOSURE) {
      addBlocker('FOOD_REVIEW_INVALID_RUNTIME_EXPOSURE', `row ${row.rowNumber} runtimeExposure must be ${JAMSIL_FOOD_CANDIDATE_RUNTIME_EXPOSURE}`);
    }
    if (!JAMSIL_FOOD_OPERATOR_VERIFICATION_STATUSES.has(record.operatorVerificationStatus)) {
      addBlocker('FOOD_REVIEW_INVALID_OPERATOR_VERIFICATION_STATUS', `row ${row.rowNumber} operatorVerificationStatus is not allowed`);
    }

    if (!record.operatorVerificationStatus && operatorFields.length > 0) {
      addBlocker('FOOD_REVIEW_UNVERIFIED_OPERATOR_FIELDS', `row ${row.rowNumber} operator fields require operatorVerificationStatus`);
    }

    if (record.operatorVerificationStatus === 'OPERATOR_CONFIRMED') {
      if (!JAMSIL_FOOD_OPERATOR_FACILITY_ID_PATTERN.test(record.operatorFacilityId ?? '')) {
        addBlocker('FOOD_REVIEW_INVALID_OPERATOR_FACILITY_ID', `row ${row.rowNumber} operatorFacilityId must match jamsil-facility-concession-*`);
      }
      if (record.operatorFacilityId) {
        if (confirmedOperatorFacilityIds.has(record.operatorFacilityId)) {
          addBlocker('FOOD_REVIEW_DUPLICATE_OPERATOR_FACILITY_ID', `row ${row.rowNumber} duplicate operatorFacilityId ${record.operatorFacilityId}`);
        }
        confirmedOperatorFacilityIds.add(record.operatorFacilityId);
      }
      if (splitOperatorList(record.operatorNearSectionIds).length === 0) {
        addBlocker('FOOD_REVIEW_MISSING_OPERATOR_NEAR_SECTION_IDS', `row ${row.rowNumber} operatorNearSectionIds is required`);
      }
      splitOperatorList(record.operatorNearSectionIds).forEach((blockId) => {
        if (!blockIds.has(blockId)) {
          addBlocker('FOOD_REVIEW_UNKNOWN_OPERATOR_NEAR_SECTION_ID', `row ${row.rowNumber} operatorNearSectionIds ${blockId} is not in JAMSIL_BLOCKS`);
        }
      });
      if (!record.operatorLocationText) {
        addBlocker('FOOD_REVIEW_MISSING_OPERATOR_LOCATION_TEXT', `row ${row.rowNumber} operatorLocationText is required`);
      }
      if (!JAMSIL_FOOD_OPERATOR_OPEN_STATUSES.has(record.operatorOpenStatus)) {
        addBlocker('FOOD_REVIEW_INVALID_OPERATOR_OPEN_STATUS', `row ${row.rowNumber} operatorOpenStatus must be OPEN/CLOSED/GAME_DAY_ONLY/UNKNOWN`);
      }
      if (!JAMSIL_FOOD_OPERATOR_ACCESSIBLE_STATUSES.has(record.operatorAccessible)) {
        addBlocker('FOOD_REVIEW_INVALID_OPERATOR_ACCESSIBLE', `row ${row.rowNumber} operatorAccessible must be YES/NO/UNKNOWN`);
      }
      if (!isUnknownOrNonNegativeInteger(record.operatorWalkingMinutes)) {
        addBlocker('FOOD_REVIEW_INVALID_OPERATOR_WALKING_MINUTES', `row ${row.rowNumber} operatorWalkingMinutes must be UNKNOWN or a non-negative integer`);
      }
      if (rowBlockers.length === 0) {
        confirmedRows.push({
          candidateZoneId: record.candidateZoneId,
          candidateStoreName: record.candidateStoreName,
          candidateFloor: record.candidateFloor,
          candidateSide: record.candidateSide,
          operatorFacilityId: record.operatorFacilityId,
          operatorNearSectionIds: splitOperatorList(record.operatorNearSectionIds),
          operatorLocationText: record.operatorLocationText,
          operatorOpenStatus: record.operatorOpenStatus,
          operatorAccessible: record.operatorAccessible,
          operatorWalkingMinutes: record.operatorWalkingMinutes === 'UNKNOWN' ? 'UNKNOWN' : Number(record.operatorWalkingMinutes),
        });
      }
    }

    if (['REJECTED', 'NEEDS_RECHECK'].includes(record.operatorVerificationStatus) && !record.reviewerNote) {
      addBlocker('FOOD_REVIEW_MISSING_REVIEWER_NOTE', `row ${row.rowNumber} reviewerNote is required for ${record.operatorVerificationStatus}`);
    }

    rowReports.push({
      rowNumber: row.rowNumber,
      candidateZoneId: record.candidateZoneId || '-',
      candidateStoreName: record.candidateStoreName || '-',
      status: rowBlockers.length === 0 ? 'valid' : 'blocked',
      operatorVerificationStatus: record.operatorVerificationStatus || 'waiting_for_operator',
      blockers: rowBlockers,
    });
  });

  expectedCandidatePairs.forEach((candidateKey) => {
    if (!seenCandidatePairs.has(candidateKey)) {
      blockers.push(`FOOD_REVIEW_MISSING_CANDIDATE:${candidateKey}`);
    }
  });

  const status = blockers.length > 0
    ? 'blocked'
    : confirmedRows.length > 0
      ? 'ready_for_operator_intake_transfer'
      : 'waiting_for_operator';
  const report = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    review: {
      path: path.relative(frontendRoot, paths.reviewPath),
      totalRows: rows.length,
      expectedRows: expectedCandidatePairs.size,
      missingColumns,
    },
    sourcePolicy: {
      runtimeReadsStaticTsOnly: true,
      manualMissingContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      secondaryCandidateExposure: JAMSIL_FOOD_CANDIDATE_RUNTIME_EXPOSURE,
      disallowedSources: ['external URL', 'crawling', 'scraping', 'web-search-based baseball data'],
    },
    summary: {
      confirmedRows: confirmedRows.length,
      rejectedRows: rows.filter((row) => row.values.operatorVerificationStatus === 'REJECTED').length,
      needsRecheckRows: rows.filter((row) => row.values.operatorVerificationStatus === 'NEEDS_RECHECK').length,
      waitingRows: rows.filter((row) => !row.values.operatorVerificationStatus).length,
      blockerCount: blockers.length,
    },
    blockers,
    rows: rowReports,
    confirmedRows,
  };

  if (writeReports) {
    await fs.mkdir(paths.outDir, { recursive: true });
    await fs.writeFile(paths.validationJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(paths.validationCsvPath, `${[
      csvLine(['rowNumber', 'candidateZoneId', 'candidateStoreName', 'operatorVerificationStatus', 'status', 'blockers']),
      ...rowReports.map((row) => csvLine([
        row.rowNumber,
        row.candidateZoneId,
        row.candidateStoreName,
        row.operatorVerificationStatus,
        row.status,
        row.blockers.join(';'),
      ])),
    ].join('\n')}\n`, 'utf8');
    await fs.writeFile(paths.validationMarkdownPath, [
      '# Jamsil Food Candidate Review Validation',
      '',
      `- status: \`${status}\``,
      `- review: \`${path.relative(frontendRoot, paths.reviewPath)}\``,
      `- sourceDataWritePerformed: \`${report.sourceDataWritePerformed}\``,
      `- confirmedRows: \`${confirmedRows.length}\``,
      `- blockerCount: \`${blockers.length}\``,
      '',
      '## Rows',
      '',
      markdownTable(
        ['row', 'zone', 'store', 'operator status', 'status', 'blockers'],
        rowReports.map((row) => [
          row.rowNumber,
          row.candidateZoneId,
          row.candidateStoreName,
          row.operatorVerificationStatus,
          row.status,
          row.blockers.join(';') || '-',
        ]),
      ),
      '',
      ...(blockers.length > 0 ? ['## Blockers', '', ...blockers.map((blocker) => `- ${blocker}`), ''] : []),
    ].join('\n'), 'utf8');
  }

  return { report, paths };
}

const writeRestroomCandidateReviewCsv = async (reviewPath, rows = JAMSIL_RESTROOM_CANDIDATE_ROWS) => {
  await fs.mkdir(path.dirname(reviewPath), { recursive: true });
  await fs.writeFile(reviewPath, `${[
    csvLine(JAMSIL_RESTROOM_CANDIDATE_REQUIRED_COLUMNS),
    ...rows.map((row) => csvLine(JAMSIL_RESTROOM_CANDIDATE_REQUIRED_COLUMNS.map((column) => row[column] ?? ''))),
  ].join('\n')}\n`, 'utf8');
};

const ensureRestroomCandidateReviewCsv = async (reviewPath) => {
  if (await fileExists(reviewPath)) return false;
  await writeRestroomCandidateReviewCsv(reviewPath);
  return true;
};

const restroomCandidateReviewRowState = (record, rowReport) => {
  if (rowReport?.status === 'blocked') return 'BLOCKED';
  if (record.operatorVerificationStatus === 'OPERATOR_CONFIRMED') return 'OPERATOR_CONFIRMED';
  if (record.operatorVerificationStatus === 'REJECTED') return 'REJECTED';
  if (record.operatorVerificationStatus === 'NEEDS_RECHECK') return 'NEEDS_RECHECK';
  return 'WAITING_FOR_OPERATOR';
};

const missingRestroomCandidateReviewFields = (record, rowState) => {
  if (rowState === 'OPERATOR_CONFIRMED' || rowState === 'WAITING_FOR_OPERATOR' || rowState === 'BLOCKED') {
    const missing = JAMSIL_RESTROOM_CONFIRMATION_REQUIRED_COLUMNS.filter((column) => !record[column]);
    if (['REJECTED', 'NEEDS_RECHECK'].includes(record.operatorVerificationStatus) && !record.reviewerNote) {
      missing.push('reviewerNote');
    }
    return missing;
  }
  if (['REJECTED', 'NEEDS_RECHECK'].includes(rowState) && !record.reviewerNote) {
    return ['reviewerNote'];
  }
  return [];
};

const restroomCandidateReviewNextAction = (rowState, missingOperatorFields) => {
  if (rowState === 'BLOCKED') return 'Fix blockers before future restroom apply-plan work.';
  if (rowState === 'OPERATOR_CONFIRMED' && missingOperatorFields.length === 0) {
    return 'Ready for a future restroom apply-plan; keep walking minutes UNKNOWN unless measured.';
  }
  if (rowState === 'OPERATOR_CONFIRMED') return 'Complete missing restroom operator fields before future apply-plan work.';
  if (rowState === 'REJECTED') return 'Keep out of future restroom apply-plan; reviewerNote records rejection reason.';
  if (rowState === 'NEEDS_RECHECK') return 'Keep out of future restroom apply-plan until the operator resolves the recheck.';
  return 'Operator must confirm, reject, or mark needs recheck.';
};

async function validateJamsilRestroomCandidateReview({ writeReports = true } = {}) {
  const { JAMSIL_BLOCKS } = await import('../src/data/jamsilSeatData.ts');
  const paths = restroomCandidatePaths();
  const sourceSha256Before = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const reviewCreated = await ensureRestroomCandidateReviewCsv(paths.reviewPath);
  const sourceSha256AfterCreate = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const blockIds = new Set(JAMSIL_BLOCKS.map((block) => block.id));
  const expectedCandidateIds = new Set(JAMSIL_RESTROOM_CANDIDATE_ROWS.map((row) => row.candidateFacilityId));
  const blockers = [];
  const rowReports = [];
  const confirmedRows = [];
  const confirmedOperatorFacilityIds = new Set();
  let header = [];
  let rows = [];

  try {
    ({ header, rows } = parseCsv(await fs.readFile(paths.reviewPath, 'utf8')));
  } catch {
    blockers.push(`RESTROOM_REVIEW_CSV_MISSING:${path.relative(frontendRoot, paths.reviewPath)}`);
  }

  const missingColumns = JAMSIL_RESTROOM_CANDIDATE_REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  missingColumns.forEach((column) => blockers.push(`RESTROOM_REVIEW_MISSING_COLUMN:${column}`));

  const seenCandidateIds = new Set();
  rows.forEach((row) => {
    const record = row.values;
    const rowBlockers = [];
    const addBlocker = (code, detail) => {
      rowBlockers.push(code);
      blockers.push(`${code}:${detail}`);
    };
    const operatorFields = [
      record.operatorFacilityId,
      record.operatorNearSectionIds,
      record.operatorNearGateIds,
      record.operatorLocationText,
      record.operatorFloor,
      record.operatorSide,
      record.operatorOpenStatus,
      record.operatorAccessible,
      record.operatorWalkingMinutes,
    ].filter(Boolean);

    if (JAMSIL_OPERATOR_FORBIDDEN_PATTERN.test(JSON.stringify(record))) {
      addBlocker('RESTROOM_REVIEW_FORBIDDEN_DATA', `row ${row.rowNumber} contains URL/crawling/scraping/web-search text`);
    }
    if (!expectedCandidateIds.has(record.candidateFacilityId)) {
      addBlocker('RESTROOM_REVIEW_UNKNOWN_CANDIDATE', `row ${row.rowNumber} ${record.candidateFacilityId || '-'} is not in the approved restroom candidate packet`);
    }
    if (seenCandidateIds.has(record.candidateFacilityId)) {
      addBlocker('RESTROOM_REVIEW_DUPLICATE_CANDIDATE', `row ${row.rowNumber} duplicate ${record.candidateFacilityId}`);
    }
    seenCandidateIds.add(record.candidateFacilityId);
    if (record.candidateCategory !== 'RESTROOM') {
      addBlocker('RESTROOM_REVIEW_INVALID_CANDIDATE_CATEGORY', `row ${row.rowNumber} candidateCategory must be RESTROOM`);
    }
    if (!JAMSIL_RESTROOM_CANDIDATE_SOURCE_TYPES.has(record.candidateSourceType)) {
      addBlocker('RESTROOM_REVIEW_INVALID_SOURCE_TYPE', `row ${row.rowNumber} candidateSourceType is not allowed`);
    }
    if (!JAMSIL_RESTROOM_CANDIDATE_DATA_STATUSES.has(record.candidateDataStatus)) {
      addBlocker('RESTROOM_REVIEW_INVALID_DATA_STATUS', `row ${row.rowNumber} candidateDataStatus is not allowed`);
    }
    if (record.runtimeExposure !== JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE) {
      addBlocker('RESTROOM_REVIEW_INVALID_RUNTIME_EXPOSURE', `row ${row.rowNumber} runtimeExposure must be ${JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE}`);
    }
    splitOperatorList(record.candidateNearSectionIds).forEach((blockId) => {
      if (!blockIds.has(blockId)) {
        addBlocker('RESTROOM_REVIEW_UNKNOWN_CANDIDATE_NEAR_SECTION_ID', `row ${row.rowNumber} candidateNearSectionIds ${blockId} is not in JAMSIL_BLOCKS`);
      }
    });
    splitOperatorList(record.candidateNearGateIds).forEach((gateId) => {
      if (!JAMSIL_RESTROOM_GATE_ID_PATTERN.test(gateId)) {
        addBlocker('RESTROOM_REVIEW_INVALID_CANDIDATE_NEAR_GATE_ID', `row ${row.rowNumber} candidateNearGateIds ${gateId} must match JAMSIL_GATE_N_N`);
      }
    });

    if (!JAMSIL_RESTROOM_OPERATOR_VERIFICATION_STATUSES.has(record.operatorVerificationStatus)) {
      addBlocker('RESTROOM_REVIEW_INVALID_OPERATOR_VERIFICATION_STATUS', `row ${row.rowNumber} operatorVerificationStatus is not allowed`);
    }
    if (!record.operatorVerificationStatus && operatorFields.length > 0) {
      addBlocker('RESTROOM_REVIEW_UNVERIFIED_OPERATOR_FIELDS', `row ${row.rowNumber} operator fields require operatorVerificationStatus`);
    }

    if (record.operatorVerificationStatus === 'OPERATOR_CONFIRMED') {
      if (!JAMSIL_RESTROOM_OPERATOR_FACILITY_ID_PATTERN.test(record.operatorFacilityId ?? '')) {
        addBlocker('RESTROOM_REVIEW_INVALID_OPERATOR_FACILITY_ID', `row ${row.rowNumber} operatorFacilityId must match jamsil-facility-restroom-*`);
      }
      if (record.operatorFacilityId) {
        if (confirmedOperatorFacilityIds.has(record.operatorFacilityId)) {
          addBlocker('RESTROOM_REVIEW_DUPLICATE_OPERATOR_FACILITY_ID', `row ${row.rowNumber} duplicate operatorFacilityId ${record.operatorFacilityId}`);
        }
        confirmedOperatorFacilityIds.add(record.operatorFacilityId);
      }
      JAMSIL_RESTROOM_CONFIRMATION_REQUIRED_COLUMNS.forEach((column) => {
        if (!record[column]) {
          addBlocker('RESTROOM_REVIEW_MISSING_OPERATOR_FIELD', `row ${row.rowNumber} ${column} is required for OPERATOR_CONFIRMED`);
        }
      });
      splitOperatorList(record.operatorNearSectionIds).forEach((blockId) => {
        if (!blockIds.has(blockId)) {
          addBlocker('RESTROOM_REVIEW_UNKNOWN_OPERATOR_NEAR_SECTION_ID', `row ${row.rowNumber} operatorNearSectionIds ${blockId} is not in JAMSIL_BLOCKS`);
        }
      });
      splitOperatorList(record.operatorNearGateIds).forEach((gateId) => {
        if (!JAMSIL_RESTROOM_GATE_ID_PATTERN.test(gateId)) {
          addBlocker('RESTROOM_REVIEW_INVALID_OPERATOR_NEAR_GATE_ID', `row ${row.rowNumber} operatorNearGateIds ${gateId} must match JAMSIL_GATE_N_N`);
        }
      });
      if (record.operatorOpenStatus && !JAMSIL_RESTROOM_OPERATOR_OPEN_STATUSES.has(record.operatorOpenStatus)) {
        addBlocker('RESTROOM_REVIEW_INVALID_OPERATOR_OPEN_STATUS', `row ${row.rowNumber} operatorOpenStatus is not allowed`);
      }
      if (record.operatorAccessible && !JAMSIL_RESTROOM_OPERATOR_ACCESSIBLE_STATUSES.has(record.operatorAccessible)) {
        addBlocker('RESTROOM_REVIEW_INVALID_OPERATOR_ACCESSIBLE', `row ${row.rowNumber} operatorAccessible must be YES/NO/UNKNOWN`);
      }
      if (record.operatorWalkingMinutes && !isUnknownOrNonNegativeInteger(record.operatorWalkingMinutes)) {
        addBlocker('RESTROOM_REVIEW_INVALID_OPERATOR_WALKING_MINUTES', `row ${row.rowNumber} operatorWalkingMinutes must be UNKNOWN or a non-negative integer`);
      }
      if (rowBlockers.length === 0) {
        confirmedRows.push({
          candidateFacilityId: record.candidateFacilityId,
          candidateFacilityName: record.candidateFacilityName,
          candidateSourceType: record.candidateSourceType,
          candidateDataStatus: record.candidateDataStatus,
          operatorFacilityId: record.operatorFacilityId,
          operatorNearSectionIds: splitOperatorList(record.operatorNearSectionIds),
          operatorNearGateIds: splitOperatorList(record.operatorNearGateIds),
          operatorLocationText: record.operatorLocationText,
          operatorFloor: record.operatorFloor,
          operatorSide: record.operatorSide,
          operatorOpenStatus: record.operatorOpenStatus,
          operatorAccessible: record.operatorAccessible,
          operatorWalkingMinutes: record.operatorWalkingMinutes === 'UNKNOWN' ? 'UNKNOWN' : Number(record.operatorWalkingMinutes),
        });
      }
    }

    if (['REJECTED', 'NEEDS_RECHECK'].includes(record.operatorVerificationStatus) && !record.reviewerNote) {
      addBlocker('RESTROOM_REVIEW_MISSING_REVIEWER_NOTE', `row ${row.rowNumber} reviewerNote is required for ${record.operatorVerificationStatus}`);
    }

    rowReports.push({
      rowNumber: row.rowNumber,
      candidateFacilityId: record.candidateFacilityId || '-',
      candidateFacilityName: record.candidateFacilityName || '-',
      candidateSourceType: record.candidateSourceType || '-',
      candidateDataStatus: record.candidateDataStatus || '-',
      status: rowBlockers.length === 0 ? 'valid' : 'blocked',
      operatorVerificationStatus: record.operatorVerificationStatus || 'waiting_for_operator',
      blockers: rowBlockers,
    });
  });

  expectedCandidateIds.forEach((candidateId) => {
    if (!seenCandidateIds.has(candidateId)) {
      blockers.push(`RESTROOM_REVIEW_MISSING_CANDIDATE:${candidateId}`);
    }
  });

  const reviewedRows = rows.filter((row) => Boolean(row.values.operatorVerificationStatus)).length;
  const waitingRows = rows.filter((row) => !row.values.operatorVerificationStatus).length;
  const rejectedRows = rows.filter((row) => row.values.operatorVerificationStatus === 'REJECTED').length;
  const needsRecheckRows = rows.filter((row) => row.values.operatorVerificationStatus === 'NEEDS_RECHECK').length;
  const status = blockers.length > 0
    ? 'blocked'
    : reviewedRows === 0
      ? 'waiting_for_operator'
      : waitingRows === 0 && confirmedRows.length > 0
        ? 'ready_for_future_apply_plan'
        : 'partial_operator_review';
  const sourceSha256After = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const report = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    review: {
      path: path.relative(frontendRoot, paths.reviewPath),
      createdFromTemplate: reviewCreated,
      totalRows: rows.length,
      expectedRows: expectedCandidateIds.size,
      missingColumns,
    },
    sourceFile: {
      path: 'src/data/jamsilOperatorVisitGuide.ts',
      sha256Before: sourceSha256Before,
      sha256AfterCreate: sourceSha256AfterCreate,
      sha256After: sourceSha256After,
      unchanged: sourceSha256Before === sourceSha256After,
    },
    sourcePolicy: {
      runtimeReadsStaticTsOnly: true,
      manualMissingContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      candidatePacketIsRuntimeData: false,
      disabledRuntimeExposure: JAMSIL_RESTROOM_CANDIDATE_RUNTIME_EXPOSURE,
      excludedData: ['2011 historical restroom wait-time metric', 'external approach congestion at Jamsil exit 5'],
      disallowedSources: ['external URL', 'crawling', 'scraping', 'web-search-based baseball data'],
    },
    summary: {
      totalRows: rows.length,
      expectedRows: expectedCandidateIds.size,
      officialRows: rows.filter((row) => row.values.candidateSourceType === 'OFFICIAL_SONGPA_PUBLIC_RESTROOM').length,
      fieldCollectedRows: rows.filter((row) => row.values.candidateSourceType === 'FIELD_COLLECTED_SECONDARY').length,
      confirmedRows: confirmedRows.length,
      rejectedRows,
      needsRecheckRows,
      waitingRows,
      reviewedRows,
      blockerCount: blockers.length,
    },
    blockers,
    rows: rowReports,
    confirmedRows,
  };

  if (writeReports) {
    await fs.mkdir(paths.outDir, { recursive: true });
    await fs.writeFile(paths.validationJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(paths.validationCsvPath, `${[
      csvLine(['rowNumber', 'candidateFacilityId', 'candidateFacilityName', 'operatorVerificationStatus', 'status', 'blockers']),
      ...rowReports.map((row) => csvLine([
        row.rowNumber,
        row.candidateFacilityId,
        row.candidateFacilityName,
        row.operatorVerificationStatus,
        row.status,
        row.blockers.join(';'),
      ])),
    ].join('\n')}\n`, 'utf8');
    await fs.writeFile(paths.validationMarkdownPath, [
      '# Jamsil Restroom Candidate Review Validation',
      '',
      `- status: \`${status}\``,
      `- review: \`${path.relative(frontendRoot, paths.reviewPath)}\``,
      `- sourceDataWritePerformed: \`${report.sourceDataWritePerformed}\``,
      `- totalRows: \`${report.summary.totalRows}\``,
      `- officialRows: \`${report.summary.officialRows}\``,
      `- fieldCollectedRows: \`${report.summary.fieldCollectedRows}\``,
      `- confirmedRows: \`${confirmedRows.length}\``,
      `- blockerCount: \`${blockers.length}\``,
      '',
      '## Rows',
      '',
      markdownTable(
        ['row', 'candidate id', 'name', 'candidate status', 'operator status', 'status', 'blockers'],
        rowReports.map((row) => [
          row.rowNumber,
          row.candidateFacilityId,
          row.candidateFacilityName,
          row.candidateDataStatus,
          row.operatorVerificationStatus,
          row.status,
          row.blockers.join(';') || '-',
        ]),
      ),
      '',
      ...(blockers.length > 0 ? ['## Blockers', '', ...blockers.map((blocker) => `- ${blocker}`), ''] : []),
    ].join('\n'), 'utf8');
  }

  return { report, paths };
}

const isFieldSurveySpecialBlock = (block) => !/^block-\d+$/.test(block.id);

const buildDefaultFieldSurveyRows = (blocks) => blocks.map((block) => ({
  blockId: block.id,
  blockLabel: block.block,
  category: block.category,
  level: block.level,
  side: block.side,
  operatorRestroomFacilityId: '',
  operatorRestroomLocationText: '',
  operatorRestroomFloor: '',
  operatorRestroomSide: '',
  operatorRestroomAccessible: '',
  operatorSectionToRestroomMinutes: '',
  operatorRestroomVerificationStatus: '',
  operatorGateToSectionMinutes: '',
  operatorSectionToFoodMinutes: '',
  operatorWalkingVerificationStatus: '',
  operatorGateCongestionLevel: '',
  operatorConcourseCongestionLevel: '',
  operatorFoodQueueLevel: '',
  operatorRestroomQueueLevel: '',
  operatorCongestionObservedAt: '',
  operatorCongestionVerificationStatus: '',
  reviewerNote: '',
}));

const writeFieldSurveyReviewCsv = async (reviewPath, rows) => {
  await fs.mkdir(path.dirname(reviewPath), { recursive: true });
  await fs.writeFile(reviewPath, `${[
    csvLine(JAMSIL_FIELD_SURVEY_REQUIRED_COLUMNS),
    ...rows.map((row) => csvLine(JAMSIL_FIELD_SURVEY_REQUIRED_COLUMNS.map((column) => row[column] ?? ''))),
  ].join('\n')}\n`, 'utf8');
};

const ensureFieldSurveyReviewCsv = async (reviewPath, blocks) => {
  if (await fileExists(reviewPath)) return false;
  await writeFieldSurveyReviewCsv(reviewPath, buildDefaultFieldSurveyRows(blocks));
  return true;
};

const fieldSurveyVerificationStatuses = (record) => [
  record.operatorRestroomVerificationStatus,
  record.operatorWalkingVerificationStatus,
  record.operatorCongestionVerificationStatus,
].filter(Boolean);

const fieldSurveyCategoryConfirmed = (record, category) => {
  if (category === 'restroom') return record.operatorRestroomVerificationStatus === 'OPERATOR_CONFIRMED';
  if (category === 'walking') return record.operatorWalkingVerificationStatus === 'OPERATOR_CONFIRMED';
  return record.operatorCongestionVerificationStatus === 'OPERATOR_CONFIRMED';
};

const hasConcreteFieldSurveyCongestionLevel = (record) => JAMSIL_FIELD_SURVEY_CONGESTION_LEVEL_COLUMNS
  .some((column) => JAMSIL_FIELD_SURVEY_CONCRETE_CONGESTION_LEVELS.has(record[column]));

const fieldSurveyRowState = (record, rowBlockers) => {
  if (rowBlockers.length > 0) return 'BLOCKED';
  if (
    fieldSurveyCategoryConfirmed(record, 'restroom')
    && fieldSurveyCategoryConfirmed(record, 'walking')
    && fieldSurveyCategoryConfirmed(record, 'congestion')
  ) {
    return 'READY_FOR_FUTURE_APPLY_PLAN';
  }
  if (fieldSurveyVerificationStatuses(record).length > 0) return 'PARTIAL_OPERATOR_REVIEW';
  return 'WAITING_FOR_OPERATOR';
};

const fieldSurveyNextAction = (rowState, missingFields) => {
  if (rowState === 'BLOCKED') return 'Fix blockers before future apply-plan work.';
  if (rowState === 'READY_FOR_FUTURE_APPLY_PLAN') return 'All field-survey categories are operator-confirmed for this block.';
  if (rowState === 'PARTIAL_OPERATOR_REVIEW') return missingFields.length > 0
    ? 'Complete missing fields or change the category verification status.'
    : 'Continue collecting the remaining restroom, walking, or congestion categories.';
  return 'Operator must collect restroom, walking-time, and congestion data or mark recheck/rejected.';
};

async function validateJamsilFieldSurveyReview({ writeReports = true } = {}) {
  const { JAMSIL_BLOCKS } = await import('../src/data/jamsilSeatData.ts');
  const { JAMSIL_OPERATOR_FACILITY_POINTS } = await import('../src/data/jamsilOperatorVisitGuide.ts');
  const paths = fieldSurveyPaths();
  const sourceSha256Before = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const reviewCreated = await ensureFieldSurveyReviewCsv(paths.reviewPath, JAMSIL_BLOCKS);
  const sourceSha256AfterCreate = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const blocksById = new Map(JAMSIL_BLOCKS.map((block) => [block.id, block]));
  const blockIds = new Set(blocksById.keys());
  const expectedBlockIds = new Set(blockIds);
  const restroomFacilityIds = new Set(JAMSIL_OPERATOR_FACILITY_POINTS
    .filter((point) => point.kind === 'RESTROOM')
    .map((point) => point.id));
  const blockers = [];
  const rowReports = [];
  let header = [];
  let rows = [];

  try {
    ({ header, rows } = parseCsv(await fs.readFile(paths.reviewPath, 'utf8')));
  } catch {
    blockers.push(`FIELD_SURVEY_CSV_MISSING:${path.relative(frontendRoot, paths.reviewPath)}`);
  }

  const missingColumns = JAMSIL_FIELD_SURVEY_REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  missingColumns.forEach((column) => blockers.push(`FIELD_SURVEY_MISSING_COLUMN:${column}`));

  const seenBlockIds = new Set();
  rows.forEach((row) => {
    const record = row.values;
    const rowBlockers = [];
    const missingOperatorFields = [];
    const addBlocker = (code, detail) => {
      rowBlockers.push(code);
      blockers.push(`${code}:${detail}`);
    };
    const addMissingField = (code, column, detail) => {
      missingOperatorFields.push(column);
      addBlocker(code, detail);
    };
    const block = blocksById.get(record.blockId);

    if (JAMSIL_OPERATOR_FORBIDDEN_PATTERN.test(JSON.stringify(record))) {
      addBlocker('FIELD_SURVEY_FORBIDDEN_DATA', `row ${row.rowNumber} contains URL/crawling/scraping/web-search text`);
    }
    if (!block) {
      addBlocker('FIELD_SURVEY_UNKNOWN_BLOCK_ID', `row ${row.rowNumber} blockId ${record.blockId} is not in JAMSIL_BLOCKS`);
    } else {
      if (seenBlockIds.has(record.blockId)) {
        addBlocker('FIELD_SURVEY_DUPLICATE_BLOCK_ID', `row ${row.rowNumber} duplicate blockId ${record.blockId}`);
      }
      seenBlockIds.add(record.blockId);
      if (record.blockLabel !== block.block) {
        addBlocker('FIELD_SURVEY_BLOCK_LABEL_MISMATCH', `row ${row.rowNumber} blockLabel must be ${block.block}`);
      }
      if (record.category !== block.category) {
        addBlocker('FIELD_SURVEY_CATEGORY_MISMATCH', `row ${row.rowNumber} category must be ${block.category}`);
      }
      if (record.level !== block.level) {
        addBlocker('FIELD_SURVEY_LEVEL_MISMATCH', `row ${row.rowNumber} level must be ${block.level}`);
      }
      if (record.side !== block.side) {
        addBlocker('FIELD_SURVEY_SIDE_MISMATCH', `row ${row.rowNumber} side must be ${block.side}`);
      }
    }

    [
      ['operatorRestroomVerificationStatus', record.operatorRestroomVerificationStatus],
      ['operatorWalkingVerificationStatus', record.operatorWalkingVerificationStatus],
      ['operatorCongestionVerificationStatus', record.operatorCongestionVerificationStatus],
    ].forEach(([column, value]) => {
      if (!JAMSIL_FIELD_SURVEY_VERIFICATION_STATUSES.has(value)) {
        addBlocker('FIELD_SURVEY_INVALID_VERIFICATION_STATUS', `row ${row.rowNumber} ${column} is not allowed`);
      }
      if (['REJECTED', 'NEEDS_RECHECK'].includes(value) && !record.reviewerNote) {
        addBlocker('FIELD_SURVEY_MISSING_REVIEWER_NOTE', `row ${row.rowNumber} reviewerNote is required for ${column}=${value}`);
      }
    });

    if (record.operatorRestroomFacilityId && !JAMSIL_FIELD_SURVEY_RESTROOM_FACILITY_ID_PATTERN.test(record.operatorRestroomFacilityId)) {
      addBlocker('FIELD_SURVEY_INVALID_RESTROOM_FACILITY_ID', `row ${row.rowNumber} operatorRestroomFacilityId must match jamsil-facility-restroom-*`);
    }
    if (record.operatorRestroomFacilityId && !restroomFacilityIds.has(record.operatorRestroomFacilityId)) {
      addBlocker('FIELD_SURVEY_UNKNOWN_RESTROOM_FACILITY_ID', `row ${row.rowNumber} operatorRestroomFacilityId ${record.operatorRestroomFacilityId} is not a RESTROOM facility point`);
    }
    if (!JAMSIL_FIELD_SURVEY_ACCESSIBLE_STATUSES.has(record.operatorRestroomAccessible)) {
      addBlocker('FIELD_SURVEY_INVALID_RESTROOM_ACCESSIBLE', `row ${row.rowNumber} operatorRestroomAccessible must be YES/NO/UNKNOWN or blank`);
    }
    [
      'operatorSectionToRestroomMinutes',
      'operatorGateToSectionMinutes',
      'operatorSectionToFoodMinutes',
    ].forEach((column) => {
      if (record[column] && !isUnknownOrNonNegativeInteger(record[column])) {
        addBlocker('FIELD_SURVEY_INVALID_MINUTES', `row ${row.rowNumber} ${column} must be UNKNOWN or a non-negative integer`);
      }
    });
    JAMSIL_FIELD_SURVEY_CONGESTION_LEVEL_COLUMNS.forEach((column) => {
      if (!JAMSIL_FIELD_SURVEY_CONGESTION_LEVELS.has(record[column])) {
        addBlocker('FIELD_SURVEY_INVALID_CONGESTION_LEVEL', `row ${row.rowNumber} ${column} must be UNKNOWN/LOW/MEDIUM/HIGH or blank`);
      }
    });
    if (record.operatorCongestionObservedAt && !JAMSIL_FIELD_SURVEY_OBSERVED_AT_PATTERN.test(record.operatorCongestionObservedAt)) {
      addBlocker('FIELD_SURVEY_INVALID_CONGESTION_OBSERVED_AT', `row ${row.rowNumber} operatorCongestionObservedAt must be YYYY-MM-DDTHH:mm+09:00`);
    }

    if (record.operatorRestroomVerificationStatus === 'OPERATOR_CONFIRMED') {
      JAMSIL_FIELD_SURVEY_RESTROOM_REQUIRED_COLUMNS.forEach((column) => {
        if (!record[column]) {
          addMissingField('FIELD_SURVEY_MISSING_RESTROOM_FIELD', column, `row ${row.rowNumber} ${column} is required for operator-confirmed restroom data`);
        }
      });
    }
    if (record.operatorWalkingVerificationStatus === 'OPERATOR_CONFIRMED') {
      JAMSIL_FIELD_SURVEY_WALKING_REQUIRED_COLUMNS.forEach((column) => {
        if (!record[column]) {
          addMissingField('FIELD_SURVEY_MISSING_WALKING_FIELD', column, `row ${row.rowNumber} ${column} is required for operator-confirmed walking data`);
        }
      });
    }
    if (record.operatorCongestionVerificationStatus === 'OPERATOR_CONFIRMED') {
      JAMSIL_FIELD_SURVEY_CONGESTION_LEVEL_COLUMNS.forEach((column) => {
        if (!record[column]) {
          addMissingField('FIELD_SURVEY_MISSING_CONGESTION_FIELD', column, `row ${row.rowNumber} ${column} is required for operator-confirmed congestion data`);
        }
      });
      if (hasConcreteFieldSurveyCongestionLevel(record) && !record.operatorCongestionObservedAt) {
        addMissingField(
          'FIELD_SURVEY_MISSING_CONGESTION_FIELD',
          'operatorCongestionObservedAt',
          `row ${row.rowNumber} operatorCongestionObservedAt is required when operator-confirmed congestion has LOW/MEDIUM/HIGH values`,
        );
      }
    }

    const rowState = fieldSurveyRowState(record, rowBlockers);
    rowReports.push({
      rowNumber: row.rowNumber,
      blockId: record.blockId || '-',
      blockLabel: record.blockLabel || '-',
      category: record.category || '-',
      level: record.level || '-',
      side: record.side || '-',
      rowState,
      restroomStatus: record.operatorRestroomVerificationStatus || 'WAITING_FOR_OPERATOR',
      walkingStatus: record.operatorWalkingVerificationStatus || 'WAITING_FOR_OPERATOR',
      congestionStatus: record.operatorCongestionVerificationStatus || 'WAITING_FOR_OPERATOR',
      missingOperatorFields: [...new Set(missingOperatorFields)],
      blockers: rowBlockers,
    });
  });

  expectedBlockIds.forEach((blockId) => {
    if (!seenBlockIds.has(blockId)) {
      blockers.push(`FIELD_SURVEY_MISSING_BLOCK:${blockId}`);
    }
  });

  const confirmedRestroomRows = rows.filter((row) => row.values.operatorRestroomVerificationStatus === 'OPERATOR_CONFIRMED').length;
  const confirmedWalkingRows = rows.filter((row) => row.values.operatorWalkingVerificationStatus === 'OPERATOR_CONFIRMED').length;
  const confirmedCongestionRows = rows.filter((row) => row.values.operatorCongestionVerificationStatus === 'OPERATOR_CONFIRMED').length;
  const reviewedCategories = rows.reduce((sum, row) => sum + fieldSurveyVerificationStatuses(row.values).length, 0);
  const allCategoryCount = JAMSIL_BLOCKS.length * 3;
  const status = blockers.length > 0
    ? 'blocked'
    : reviewedCategories === 0
      ? 'waiting_for_operator'
      : reviewedCategories === allCategoryCount
        && confirmedRestroomRows === JAMSIL_BLOCKS.length
        && confirmedWalkingRows === JAMSIL_BLOCKS.length
        && confirmedCongestionRows === JAMSIL_BLOCKS.length
        ? 'ready_for_future_apply_plan'
        : 'partial_operator_review';
  const sourceSha256After = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const report = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    review: {
      path: path.relative(frontendRoot, paths.reviewPath),
      createdFromTemplate: reviewCreated,
      totalRows: rows.length,
      expectedRows: JAMSIL_BLOCKS.length,
      missingColumns,
    },
    sourceFile: {
      path: 'src/data/jamsilOperatorVisitGuide.ts',
      sha256Before: sourceSha256Before,
      sha256AfterCreate: sourceSha256AfterCreate,
      sha256After: sourceSha256After,
      unchanged: sourceSha256Before === sourceSha256After,
    },
    sourcePolicy: {
      runtimeReadsStaticTsOnly: true,
      manualMissingContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      surveyPacketIsRuntimeData: false,
      disallowedSources: ['external URL', 'crawling', 'scraping', 'web-search-based baseball data'],
    },
    summary: {
      totalRows: rows.length,
      expectedRows: JAMSIL_BLOCKS.length,
      numberedRows: rows.filter((row) => /^block-\d+$/.test(row.values.blockId)).length,
      specialRows: rows.filter((row) => row.values.blockId && !/^block-\d+$/.test(row.values.blockId)).length,
      confirmedRestroomRows,
      confirmedWalkingRows,
      confirmedCongestionRows,
      completedRows: rows.filter((row) => (
        row.values.operatorRestroomVerificationStatus === 'OPERATOR_CONFIRMED'
        && row.values.operatorWalkingVerificationStatus === 'OPERATOR_CONFIRMED'
        && row.values.operatorCongestionVerificationStatus === 'OPERATOR_CONFIRMED'
      )).length,
      reviewedCategories,
      blockerCount: blockers.length,
    },
    blockers,
    rows: rowReports,
  };

  if (writeReports) {
    await fs.mkdir(paths.outDir, { recursive: true });
    await fs.writeFile(paths.validationJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(paths.validationMarkdownPath, [
      '# Jamsil Field Survey Validation',
      '',
      `- status: \`${status}\``,
      `- review: \`${path.relative(frontendRoot, paths.reviewPath)}\``,
      `- sourceDataWritePerformed: \`${report.sourceDataWritePerformed}\``,
      `- totalRows: \`${report.summary.totalRows}\``,
      `- expectedRows: \`${report.summary.expectedRows}\``,
      `- numberedRows: \`${report.summary.numberedRows}\``,
      `- specialRows: \`${report.summary.specialRows}\``,
      `- confirmedRestroomRows: \`${confirmedRestroomRows}\``,
      `- confirmedWalkingRows: \`${confirmedWalkingRows}\``,
      `- confirmedCongestionRows: \`${confirmedCongestionRows}\``,
      `- blockerCount: \`${blockers.length}\``,
      '',
      '## Rows',
      '',
      markdownTable(
        ['row', 'block', 'label', 'state', 'restroom', 'walking', 'congestion', 'missing fields', 'blockers'],
        rowReports.map((row) => [
          row.rowNumber,
          row.blockId,
          row.blockLabel,
          row.rowState,
          row.restroomStatus,
          row.walkingStatus,
          row.congestionStatus,
          row.missingOperatorFields.join(';') || '-',
          row.blockers.join(';') || '-',
        ]),
      ),
      '',
      ...(blockers.length > 0 ? ['## Blockers', '', ...blockers.map((blocker) => `- ${blocker}`), ''] : []),
    ].join('\n'), 'utf8');
  }

  return { report, paths };
}

function formatOperatorTsFragment(normalizedData, status) {
  if (status !== 'ready_for_manual_apply') {
    return [
      '// Manual apply fragment for src/data/jamsilOperatorVisitGuide.ts',
      `// status: ${status}`,
      '// No operator-provided data is ready for manual application.',
      '',
    ].join('\n');
  }

  return [
    '// Manual apply fragment for src/data/jamsilOperatorVisitGuide.ts',
    '// Review this fragment, then replace only the matching arrays in the source file.',
    '// Do not add external URLs, crawling, scraping, or web-search-derived baseball data.',
    '',
    `export const JAMSIL_OPERATOR_FACILITY_POINTS: readonly JamsilFacilityPoint[] = ${JSON.stringify(normalizedData.facilityPoints, null, 2)};`,
    '',
    `export const JAMSIL_BLOCK_VISIT_GUIDANCE: readonly JamsilBlockVisitGuidance[] = ${JSON.stringify(normalizedData.blockGuidance, null, 2)};`,
    '',
    `export const JAMSIL_OPERATION_NOTICES: readonly JamsilOperationNotice[] = ${JSON.stringify(normalizedData.operationNotices, null, 2)};`,
    '',
  ].join('\n');
}

function validateFoodCandidateSourceArgs({ sourceDocumentId, lastUpdatedAt, hasConfirmedRows, blockerPrefix }) {
  const blockers = [];
  if (!hasConfirmedRows) return blockers;

  if (!sourceDocumentId) {
    blockers.push(`${blockerPrefix}_MISSING_SOURCE_DOCUMENT_ID:--source-document-id is required when confirmed rows exist`);
  } else if (!JAMSIL_OPERATOR_SOURCE_ID_PATTERN.test(sourceDocumentId)) {
    blockers.push(`${blockerPrefix}_INVALID_SOURCE_DOCUMENT_ID:--source-document-id must match jamsil-operator-YYYYMMDD-*`);
  }

  if (!lastUpdatedAt) {
    blockers.push(`${blockerPrefix}_MISSING_LAST_UPDATED_AT:--last-updated-at is required when confirmed rows exist`);
  } else if (!JAMSIL_OPERATOR_ISO_DATE_PATTERN.test(lastUpdatedAt)) {
    blockers.push(`${blockerPrefix}_INVALID_LAST_UPDATED_AT:--last-updated-at must be YYYY-MM-DD`);
  }

  return blockers;
}

function normalizeFoodCandidateFacilityPoint(row, sourceDocumentId, lastUpdatedAt) {
  return {
    id: row.operatorFacilityId,
    kind: 'CONCESSION',
    label: row.candidateStoreName,
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId,
    lastUpdatedAt,
    floor: row.candidateFloor,
    side: row.candidateSide,
    nearSectionIds: row.operatorNearSectionIds,
    locationText: row.operatorLocationText,
    openStatus: row.operatorOpenStatus,
    accessible: row.operatorAccessible,
    walkingMinutes: row.operatorWalkingMinutes,
    verificationStatus: 'OPERATOR_CONFIRMED',
  };
}

const softenFoodManualCaution = (note) => String(note ?? '')
  .replace('매점/화장실/도보시간은 아직 운영자 제공 자료가 필요합니다.', '화장실/도보시간은 아직 운영자 제공 자료가 필요합니다.')
  .replace('매점/화장실/도보시간 전체가 필요', '화장실/도보시간 자료가 필요');

function mergeFoodCandidateManualApplyData({
  currentFacilityPoints,
  currentBlockGuidance,
  confirmedRows,
  sourceDocumentId,
  lastUpdatedAt,
}) {
  const candidateFacilityPoints = confirmedRows.map((row) => (
    normalizeFoodCandidateFacilityPoint(row, sourceDocumentId, lastUpdatedAt)
  ));
  const facilityPointsById = new Map(currentFacilityPoints.map((point) => [point.id, point]));
  candidateFacilityPoints.forEach((point) => {
    facilityPointsById.set(point.id, point);
  });

  const guidanceByBlockId = new Map(currentBlockGuidance.map((guidance) => [
    guidance.blockId,
    {
      ...guidance,
      recommendedEntrancePointIds: [...guidance.recommendedEntrancePointIds],
      nearbyFacilityPointIds: [...guidance.nearbyFacilityPointIds],
      cautionNotes: [...guidance.cautionNotes],
    },
  ]));
  const currentGuidanceOrder = currentBlockGuidance.map((guidance) => guidance.blockId);
  const addedGuidanceBlockIds = [];
  const affectedBlockIds = new Set();

  candidateFacilityPoints.forEach((point) => {
    point.nearSectionIds.forEach((blockId) => {
      const existing = guidanceByBlockId.get(blockId);
      affectedBlockIds.add(blockId);
      if (existing) {
        guidanceByBlockId.set(blockId, {
          ...existing,
          nearbyFacilityPointIds: [
            point.id,
            ...existing.nearbyFacilityPointIds.filter((facilityId) => facilityId !== point.id),
          ],
          cautionNotes: existing.cautionNotes.map(softenFoodManualCaution),
          sourceDocumentId,
          lastUpdatedAt,
          dataStatus: 'OPERATOR_PROVIDED',
        });
      } else {
        addedGuidanceBlockIds.push(blockId);
        guidanceByBlockId.set(blockId, {
          blockId,
          recommendedEntrancePointIds: [],
          nearbyFacilityPointIds: [point.id],
          cautionNotes: ['화장실/도보시간은 아직 운영자 제공 자료가 필요합니다.'],
          sourceDocumentId,
          lastUpdatedAt,
          dataStatus: 'OPERATOR_PROVIDED',
        });
      }
    });
  });

  return {
    facilityPoints: [...facilityPointsById.values()],
    blockGuidance: [...currentGuidanceOrder, ...addedGuidanceBlockIds].map((blockId) => guidanceByBlockId.get(blockId)),
    candidateFacilityPoints,
    affectedBlockIds: [...affectedBlockIds].sort(),
  };
}

function formatFoodCandidateApplyPlanTsFragment(normalizedData, status) {
  if (status !== 'ready_for_manual_apply') {
    return [
      '// Food candidate manual apply fragment for src/data/jamsilOperatorVisitGuide.ts',
      `// status: ${status}`,
      '// No operator-confirmed food candidates are ready for manual application.',
      '// JAMSIL_OPERATION_NOTICES remains unchanged.',
      '',
    ].join('\n');
  }

  return [
    '// Food candidate manual apply fragment for src/data/jamsilOperatorVisitGuide.ts',
    '// Review this fragment, then replace only the facility and block guidance arrays.',
    '// Do not add external URLs, crawling, scraping, or web-search-derived baseball data.',
    '// JAMSIL_OPERATION_NOTICES remains unchanged.',
    '',
    `export const JAMSIL_OPERATOR_FACILITY_POINTS: readonly JamsilFacilityPoint[] = ${JSON.stringify(normalizedData.facilityPoints, null, 2)};`,
    '',
    `export const JAMSIL_BLOCK_VISIT_GUIDANCE: readonly JamsilBlockVisitGuidance[] = ${JSON.stringify(normalizedData.blockGuidance, null, 2)};`,
    '',
  ].join('\n');
}

function normalizeRestroomCandidateFacilityPoint(row, sourceDocumentId, lastUpdatedAt) {
  return {
    id: row.operatorFacilityId,
    kind: 'RESTROOM',
    label: row.candidateFacilityName,
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId,
    lastUpdatedAt,
    floor: row.operatorFloor,
    side: row.operatorSide,
    nearSectionIds: row.operatorNearSectionIds,
    locationText: row.operatorLocationText,
    openStatus: row.operatorOpenStatus,
    accessible: row.operatorAccessible,
    walkingMinutes: row.operatorWalkingMinutes,
    verificationStatus: 'OPERATOR_CONFIRMED',
  };
}

const softenRestroomManualCaution = (note) => String(note ?? '')
  .replace('매점/화장실/도보시간은 아직 운영자 제공 자료가 필요합니다.', '도보시간은 아직 운영자 제공 자료가 필요합니다.')
  .replace('화장실/도보시간은 아직 운영자 제공 자료가 필요합니다.', '도보시간은 아직 운영자 제공 자료가 필요합니다.')
  .replace('화장실/도보시간 자료가 필요', '도보시간 자료가 필요');

function mergeRestroomCandidateManualApplyData({
  currentFacilityPoints,
  currentBlockGuidance,
  confirmedRows,
  sourceDocumentId,
  lastUpdatedAt,
}) {
  const candidateFacilityPoints = confirmedRows.map((row) => (
    normalizeRestroomCandidateFacilityPoint(row, sourceDocumentId, lastUpdatedAt)
  ));
  const facilityPointsById = new Map(currentFacilityPoints.map((point) => [point.id, point]));
  candidateFacilityPoints.forEach((point) => {
    facilityPointsById.set(point.id, point);
  });

  const guidanceByBlockId = new Map(currentBlockGuidance.map((guidance) => [
    guidance.blockId,
    {
      ...guidance,
      recommendedEntrancePointIds: [...guidance.recommendedEntrancePointIds],
      nearbyFacilityPointIds: [...guidance.nearbyFacilityPointIds],
      cautionNotes: [...guidance.cautionNotes],
    },
  ]));
  const currentGuidanceOrder = currentBlockGuidance.map((guidance) => guidance.blockId);
  const addedGuidanceBlockIds = [];
  const affectedBlockIds = new Set();

  candidateFacilityPoints.forEach((point) => {
    point.nearSectionIds.forEach((blockId) => {
      const existing = guidanceByBlockId.get(blockId);
      affectedBlockIds.add(blockId);
      if (existing) {
        guidanceByBlockId.set(blockId, {
          ...existing,
          nearbyFacilityPointIds: [
            point.id,
            ...existing.nearbyFacilityPointIds.filter((facilityId) => facilityId !== point.id),
          ],
          cautionNotes: existing.cautionNotes.map(softenRestroomManualCaution),
          sourceDocumentId,
          lastUpdatedAt,
          dataStatus: 'OPERATOR_PROVIDED',
        });
      } else {
        addedGuidanceBlockIds.push(blockId);
        guidanceByBlockId.set(blockId, {
          blockId,
          recommendedEntrancePointIds: [],
          nearbyFacilityPointIds: [point.id],
          cautionNotes: ['도보시간은 아직 운영자 제공 자료가 필요합니다.'],
          sourceDocumentId,
          lastUpdatedAt,
          dataStatus: 'OPERATOR_PROVIDED',
        });
      }
    });
  });

  return {
    facilityPoints: [...facilityPointsById.values()],
    blockGuidance: [...currentGuidanceOrder, ...addedGuidanceBlockIds].map((blockId) => guidanceByBlockId.get(blockId)),
    candidateFacilityPoints,
    affectedBlockIds: [...affectedBlockIds].sort(),
  };
}

function formatRestroomCandidateApplyPlanTsFragment(normalizedData, status) {
  if (status !== 'ready_for_manual_apply') {
    return [
      '// Restroom candidate manual apply fragment for src/data/jamsilOperatorVisitGuide.ts',
      `// status: ${status}`,
      '// No operator-confirmed restroom candidates are ready for manual application.',
      '// JAMSIL_OPERATION_NOTICES remains unchanged.',
      '',
    ].join('\n');
  }

  return [
    '// Restroom candidate manual apply fragment for src/data/jamsilOperatorVisitGuide.ts',
    '// Review this fragment, then replace only the facility and block guidance arrays.',
    '// Do not add historical restroom wait-time metrics, external approach congestion, URLs, crawling, scraping, or web-search-derived baseball data.',
    '// JAMSIL_OPERATION_NOTICES remains unchanged.',
    '',
    `export const JAMSIL_OPERATOR_FACILITY_POINTS: readonly JamsilFacilityPoint[] = ${JSON.stringify(normalizedData.facilityPoints, null, 2)};`,
    '',
    `export const JAMSIL_BLOCK_VISIT_GUIDANCE: readonly JamsilBlockVisitGuidance[] = ${JSON.stringify(normalizedData.blockGuidance, null, 2)};`,
    '',
  ].join('\n');
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
const runReleaseGate = async () => {
  const { JAMSIL_BLOCKS, JAMSIL_SEATMAP_IMAGE } = await import(
    '../src/data/jamsilSeatData.ts'
  );

  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const reportJsonPath = path.join(reportDir, 'jamsil-seatmap-release-gate.json');
  const reportMarkdownPath = path.join(reportDir, 'jamsil-seatmap-release-gate.md');

  const packageSource = await fs.readFile(path.join(frontendRoot, 'package.json'), 'utf8');
  const dispatcherSource = await fs.readFile(path.join(frontendRoot, 'scripts/stadium-seatmap-ops.mjs'), 'utf8');
  const stadiumUxAuditSource = await fs.readFile(path.join(frontendRoot, 'scripts/stadium-ux-audit.mjs'), 'utf8');
  const releaseLockSource = await fs.readFile(path.join(frontendRoot, 'docs/jamsil-seatmap-release-lock.md'), 'utf8');
  const assetBuffer = await fs.readFile(path.join(frontendRoot, JAMSIL_SEATMAP_IMAGE.imagePath));

  const releaseFixtureFingerprint = sha256(snapshotFixture(JAMSIL_BLOCKS));
  const officialAssetSha256 = sha256(assetBuffer);

  const summary = {
    totalBlocks: JAMSIL_BLOCKS.length,
    releaseFixtureFingerprint,
    officialAssetSha256,
  };

  const checks = [
    ['total blocks', summary.totalBlocks === EXPECTED_TOTAL_BLOCKS],
    ['official asset sha256', summary.officialAssetSha256 === EXPECTED_OFFICIAL_ASSET_SHA256],
    ['release fixture fingerprint', summary.releaseFixtureFingerprint === EXPECTED_RELEASE_FIXTURE_FINGERPRINT],
    ['package mobile script', packageSource.includes('"qa:stadium:jamsil:mobile": "node scripts/qa-presets.mjs stadium jamsil mobile"')],
    ['package full script', packageSource.includes('"qa:stadium:jamsil:full": "node scripts/qa-presets.mjs stadium jamsil full"')],
    ['package release lock script', packageSource.includes('"qa:stadium:jamsil:release-lock": "node scripts/qa-presets.mjs stadium jamsil release-gate"')],
    ['package status script', packageSource.includes('"stadium:jamsil:status": "node scripts/qa-presets.mjs stadium jamsil status"')],
    ['package field survey validate script', packageSource.includes('"stadium:jamsil:field-survey-validate": "node scripts/qa-presets.mjs stadium jamsil field-survey-validate"')],
    ['package field survey workset script', packageSource.includes('"stadium:jamsil:field-survey-workset": "node scripts/qa-presets.mjs stadium jamsil field-survey-workset"')],
    ['package food candidate validate script', packageSource.includes('"stadium:jamsil:food-candidate-validate": "node scripts/qa-presets.mjs stadium jamsil food-candidate-validate"')],
    ['package food candidate review workset script', packageSource.includes('"stadium:jamsil:food-candidate-review-workset": "node scripts/qa-presets.mjs stadium jamsil food-candidate-review-workset"')],
    ['package food candidate transfer script', packageSource.includes('"stadium:jamsil:food-candidate-transfer": "node scripts/qa-presets.mjs stadium jamsil food-candidate-transfer"')],
    ['package food candidate apply plan script', packageSource.includes('"stadium:jamsil:food-candidate-apply-plan": "node scripts/qa-presets.mjs stadium jamsil food-candidate-apply-plan"')],
    ['package restroom candidate validate script', packageSource.includes('"stadium:jamsil:restroom-candidate-validate": "node scripts/qa-presets.mjs stadium jamsil restroom-candidate-validate"')],
    ['package restroom candidate review workset script', packageSource.includes('"stadium:jamsil:restroom-candidate-review-workset": "node scripts/qa-presets.mjs stadium jamsil restroom-candidate-review-workset"')],
    ['package restroom candidate transfer script', packageSource.includes('"stadium:jamsil:restroom-candidate-transfer": "node scripts/qa-presets.mjs stadium jamsil restroom-candidate-transfer"')],
    ['package restroom candidate apply plan script', packageSource.includes('"stadium:jamsil:restroom-candidate-apply-plan": "node scripts/qa-presets.mjs stadium jamsil restroom-candidate-apply-plan"')],
    ['package operator intake script', packageSource.includes('"stadium:jamsil:operator-intake": "node scripts/qa-presets.mjs stadium jamsil operator-intake"')],
    ['package operator approval script', packageSource.includes('"stadium:jamsil:operator-approval": "node scripts/qa-presets.mjs stadium jamsil operator-approval"')],
    ['package operator approval status script', packageSource.includes('"stadium:jamsil:operator-approval:status": "node scripts/qa-presets.mjs stadium jamsil operator-approval:status"')],
    ['package operator approval approve script', packageSource.includes('"stadium:jamsil:operator-approval:approve": "node scripts/qa-presets.mjs stadium jamsil operator-approval:approve"')],
    ['package operator approval verify script', packageSource.includes('"stadium:jamsil:operator-approval:verify": "node scripts/qa-presets.mjs stadium jamsil operator-approval:verify"')],
    ['package responsive script removed', !packageSource.includes('"qa:stadium:jamsil:responsive"')],
    ['dispatcher responsive task', dispatcherSource.includes('responsive: [')],
    ['dispatcher responsive policy', dispatcherSource.includes('responsive QA remains dispatcher-internal')],
    ['dispatcher field survey validate task', dispatcherSource.includes("'field-survey-validate': [")],
    ['dispatcher field survey workset task', dispatcherSource.includes("'field-survey-workset': [")],
    ['dispatcher food candidate validate task', dispatcherSource.includes("'food-candidate-validate': [")],
    ['dispatcher food candidate review workset task', dispatcherSource.includes("'food-candidate-review-workset': [")],
    ['dispatcher food candidate transfer task', dispatcherSource.includes("'food-candidate-transfer': [")],
    ['dispatcher food candidate apply plan task', dispatcherSource.includes("'food-candidate-apply-plan': [")],
    ['dispatcher restroom candidate validate task', dispatcherSource.includes("'restroom-candidate-validate': [")],
    ['dispatcher restroom candidate review workset task', dispatcherSource.includes("'restroom-candidate-review-workset': [")],
    ['dispatcher restroom candidate transfer task', dispatcherSource.includes("'restroom-candidate-transfer': [")],
    ['dispatcher restroom candidate apply plan task', dispatcherSource.includes("'restroom-candidate-apply-plan': [")],
    ['dispatcher operator approval task', dispatcherSource.includes("'operator-approval': [")],
    ['dispatcher operator approval status task', dispatcherSource.includes("'operator-approval:status': [")],
    ['dispatcher operator approval approve task', dispatcherSource.includes("'operator-approval:approve': [")],
    ['dispatcher operator approval verify task', dispatcherSource.includes("'operator-approval:verify': [")],
    ['Playwright Jamsil operator runtime targets', stadiumUxAuditSource.includes('JAMSIL_OPERATOR_RUNTIME_TARGETS')],
    ['Playwright Jamsil operator runtime report JSON', stadiumUxAuditSource.includes('jamsil-operator-runtime-check.json')],
    ['Playwright Jamsil operator runtime field source assertion', stadiumUxAuditSource.includes('data-operator-field-source')],
    ['release lock document includes internal responsive task', releaseLockSource.includes('node scripts/stadium-seatmap-ops.mjs jamsil responsive')],
    ['release lock document includes Playwright operator runtime report', releaseLockSource.includes('jamsil-operator-runtime-check.json')],
    ['release lock document includes Playwright operator runtime blocker', releaseLockSource.includes('jamsil-operator-runtime-check')],
    ['release lock document includes field survey validate command', releaseLockSource.includes('npm run stadium:jamsil:field-survey-validate')],
    ['release lock document includes field survey workset command', releaseLockSource.includes('npm run stadium:jamsil:field-survey-workset')],
    ['release lock document includes food candidate validate command', releaseLockSource.includes('npm run stadium:jamsil:food-candidate-validate')],
    ['release lock document includes food candidate review workset command', releaseLockSource.includes('npm run stadium:jamsil:food-candidate-review-workset')],
    ['release lock document includes food candidate transfer command', releaseLockSource.includes('npm run stadium:jamsil:food-candidate-transfer')],
    ['release lock document includes food candidate apply plan command', releaseLockSource.includes('npm run stadium:jamsil:food-candidate-apply-plan')],
    ['release lock document includes restroom candidate validate command', releaseLockSource.includes('npm run stadium:jamsil:restroom-candidate-validate')],
    ['release lock document includes restroom candidate review workset command', releaseLockSource.includes('npm run stadium:jamsil:restroom-candidate-review-workset')],
    ['release lock document includes restroom candidate transfer command', releaseLockSource.includes('npm run stadium:jamsil:restroom-candidate-transfer')],
    ['release lock document includes restroom candidate apply plan command', releaseLockSource.includes('npm run stadium:jamsil:restroom-candidate-apply-plan')],
    ['release lock document includes operator approval command', releaseLockSource.includes('npm run stadium:jamsil:operator-approval')],
    ['release lock document includes field survey approval stale condition', releaseLockSource.includes('handoff/food/restroom/field-survey packet')],
  ].map(([label, passed]) => ({ label, passed }));

  const failures = checks.filter((c) => !c.passed).map((c) => c.label);
  const report = {
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    summary,
    checks,
    failures,
  };

  const markdown = [
    '# Jamsil Seatmap Release Gate',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- totalBlocks: ${summary.totalBlocks}`,
    `- officialAssetSha256: ${summary.officialAssetSha256}`,
    `- releaseFixtureFingerprint: ${summary.releaseFixtureFingerprint}`,
    '',
    '## Checks',
    '',
    ...checks.map((c) => `- ${c.passed ? 'PASS' : 'FAIL'} ${c.label}`),
    '',
    ...(failures.length > 0 ? ['## Failures', '', ...failures.map((f) => `- ${f}`), ''] : []),
  ].join('\n');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(reportMarkdownPath, markdown);

  if (failures.length > 0) {
    failures.forEach((f) => console.error(`[jamsil-release-gate] failure: ${f}`));
    console.error('[jamsil-release-gate] failed');
    console.error(`[jamsil-release-gate] report=${reportJsonPath}`);

    // Print actual values to make it easy to update the constants
    if (summary.officialAssetSha256 !== EXPECTED_OFFICIAL_ASSET_SHA256) {
      console.error(`[jamsil-release-gate] actual officialAssetSha256=${summary.officialAssetSha256}`);
    }
    if (summary.releaseFixtureFingerprint !== EXPECTED_RELEASE_FIXTURE_FINGERPRINT) {
      console.error(`[jamsil-release-gate] actual releaseFixtureFingerprint=${summary.releaseFixtureFingerprint}`);
    }

    process.exit(1);
  }

  console.log('[jamsil-release-gate] passed');
  console.log(`[jamsil-release-gate] report=${reportJsonPath}`);
};

const runOperatorTemplate = async () => {
  const paths = operatorGatePaths();
  const templatePath = path.join(frontendRoot, 'docs/stadium/operator-visit-guide-intake-template.csv');
  const force = operatorHasFlag('--force');
  const { header, rows } = parseCsv(await fs.readFile(templatePath, 'utf8'));
  const jamsilRows = rows.filter((row) => row.values.stadium === 'JAMSIL');
  let action = 'created';

  await fs.mkdir(paths.outDir, { recursive: true });
  try {
    await fs.access(paths.inputPath);
    if (!force) {
      action = 'preserved_existing';
    }
  } catch {
    action = 'created';
  }

  if (action === 'created' || force) {
    await fs.writeFile(paths.inputPath, `${[
      csvLine(header),
      ...jamsilRows.map((row) => csvLine(header.map((column) => row.values[column] ?? ''))),
    ].join('\n')}\n`, 'utf8');
    action = force ? 'overwritten_by_force' : action;
  }

  const report = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status: 'ok',
    action,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    inputPath: path.relative(frontendRoot, paths.inputPath),
    rows: jamsilRows.length,
  };

  await fs.writeFile(paths.templateJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.templateMarkdownPath, [
    '# Jamsil Operator Visit Guide Input Template',
    '',
    `- status: \`${report.status}\``,
    `- action: \`${action}\``,
    `- input: \`${report.inputPath}\``,
    '- sourceDataWritePerformed: `false`',
    '',
    '운영자 자료가 들어오기 전 placeholder 값은 검증 단계에서 `waiting_for_operator`로 유지합니다.',
    '',
  ].join('\n'), 'utf8');

  console.log(`[jamsil-operator-template] ${action}`);
  console.log(`[jamsil-operator-template] input=${paths.inputPath}`);
  return { report, paths };
};

const runOperatorValidate = async ({ exitOnBlocked = true } = {}) => {
  const { report, paths } = await validateJamsilOperatorInput({ writeReports: true });
  const foodCandidate = await validateJamsilFoodCandidateReview({ writeReports: true });
  console.log(`[jamsil-operator-validate] status=${report.status}`);
  console.log(`[jamsil-operator-validate] report=${paths.validationJsonPath}`);
  console.log(`[jamsil-food-candidate-validate] status=${foodCandidate.report.status}`);
  console.log(`[jamsil-food-candidate-validate] report=${foodCandidate.paths.validationJsonPath}`);
  if (exitOnBlocked && (report.status === 'blocked' || foodCandidate.report.status === 'blocked')) {
    process.exit(1);
  }
  return { report, paths, foodCandidate };
};

const runOperatorApplyPlan = async ({ exitOnBlocked = true } = {}) => {
  const { report: validation, paths } = await validateJamsilOperatorInput({ writeReports: true });
  const foodCandidate = await validateJamsilFoodCandidateReview({ writeReports: true });
  const foodCandidateBlockers = foodCandidate.report.status === 'blocked'
    ? foodCandidate.report.blockers.map((blocker) => `FOOD_CANDIDATE_REVIEW:${blocker}`)
    : [];
  const status = foodCandidateBlockers.length > 0 ? 'blocked' : validation.status;
  const plan = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    sourceFile: validation.sourceFile,
    targetSourceFile: 'src/data/jamsilOperatorVisitGuide.ts',
    tsFragmentPath: path.relative(frontendRoot, paths.applyPlanTsFragmentPath),
    validationReportPath: path.relative(frontendRoot, paths.validationJsonPath),
    foodCandidateReviewReportPath: path.relative(frontendRoot, foodCandidate.paths.validationJsonPath),
    foodCandidateReviewStatus: foodCandidate.report.status,
    normalizedData: status === 'ready_for_manual_apply' ? validation.normalizedData : {
      facilityPoints: [],
      blockGuidance: [],
      operationNotices: [],
    },
    blockers: [...validation.blockers, ...foodCandidateBlockers],
    nextAction: status === 'ready_for_manual_apply'
      ? 'Review the TS fragment and manually apply only the three operator data arrays.'
      : 'Keep MANUAL_BASEBALL_DATA_REQUIRED until operator-provided data validates.',
  };
  const fragment = formatOperatorTsFragment(plan.normalizedData, plan.status);

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.applyPlanJsonPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.applyPlanTsFragmentPath, fragment, 'utf8');
  await fs.writeFile(paths.applyPlanMarkdownPath, [
    '# Jamsil Operator Visit Guide Apply Plan',
    '',
    `- status: \`${plan.status}\``,
    `- sourceDataWritePerformed: \`${plan.sourceDataWritePerformed}\``,
    `- target source file: \`${plan.targetSourceFile}\``,
    `- TS fragment: \`${plan.tsFragmentPath}\``,
    `- food candidate review: \`${plan.foodCandidateReviewStatus}\``,
    `- next action: ${plan.nextAction}`,
    '',
    '## Summary',
    '',
    `- facility points: ${plan.normalizedData.facilityPoints.length}`,
    `- block guidance rows: ${plan.normalizedData.blockGuidance.length}`,
    `- operation notices: ${plan.normalizedData.operationNotices.length}`,
    '',
    ...(plan.blockers.length > 0 ? ['## Blockers', '', ...plan.blockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[jamsil-operator-apply-plan] status=${plan.status}`);
  console.log(`[jamsil-operator-apply-plan] report=${paths.applyPlanJsonPath}`);
  if (exitOnBlocked && plan.status === 'blocked') {
    process.exit(1);
  }
  return { report: plan, paths };
};

const runOperatorHandoff = async ({ exitOnBlocked = true } = {}) => {
  const paths = operatorGatePaths();
  const foodCandidate = await validateJamsilFoodCandidateReview({ writeReports: true });
  const restroomCandidate = await validateJamsilRestroomCandidateReview({ writeReports: true });
  const fieldSurveyWorkset = await runFieldSurveyWorkset({ exitOnBlocked: false });
  const readJson = async (filePath) => {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch {
      return null;
    }
  };
  const template = await readJson(paths.templateJsonPath);
  const validation = await readJson(paths.validationJsonPath);
  const applyPlan = await readJson(paths.applyPlanJsonPath);
  const foodCandidateApplyPlan = await readJson(foodCandidate.paths.applyPlanJsonPath);
  const restroomCandidateTransfer = await readJson(restroomCandidate.paths.transferJsonPath);
  const restroomCandidateApplyPlan = await readJson(restroomCandidate.paths.applyPlanJsonPath);
  const hasConfirmedRestroomRows = (restroomCandidate.report.summary?.confirmedRows ?? 0) > 0;
  const missingInputs = [
    ['template', template, paths.templateJsonPath],
    ['validation', validation, paths.validationJsonPath],
    ['applyPlan', applyPlan, paths.applyPlanJsonPath],
    ...(hasConfirmedRestroomRows ? [
      ['restroomCandidateTransfer', restroomCandidateTransfer, restroomCandidate.paths.transferJsonPath],
      ['restroomCandidateApplyPlan', restroomCandidateApplyPlan, restroomCandidate.paths.applyPlanJsonPath],
    ] : []),
  ].filter(([, value]) => !value);
  const status = missingInputs.length > 0
    ? 'blocked'
    : validation.status === 'blocked'
      || applyPlan.status === 'blocked'
      || foodCandidate.report.status === 'blocked'
      || foodCandidateApplyPlan?.status === 'blocked'
      || restroomCandidate.report.status === 'blocked'
      || fieldSurveyWorkset.report.status === 'blocked'
      || (hasConfirmedRestroomRows && (
        restroomCandidateTransfer?.status !== 'ready_for_operator_validate'
        || restroomCandidateApplyPlan?.status !== 'ready_for_manual_apply'
      ))
      ? 'blocked'
      : validation.status === 'ready_for_manual_apply' && applyPlan.status === 'ready_for_manual_apply'
        ? 'ready_for_manual_apply'
        : 'waiting_for_operator';
  const blockers = [
    ...missingInputs.map(([label, , filePath]) => `MISSING_${label.toUpperCase()}_REPORT:${path.relative(frontendRoot, filePath)}`),
    ...(validation?.blockers ?? []),
    ...(applyPlan?.blockers ?? []),
    ...(foodCandidate.report.status === 'blocked'
      ? foodCandidate.report.blockers.map((blocker) => `FOOD_CANDIDATE_REVIEW:${blocker}`)
      : []),
    ...(foodCandidateApplyPlan?.status === 'blocked'
      ? foodCandidateApplyPlan.blockers.map((blocker) => `FOOD_CANDIDATE_APPLY_PLAN:${blocker}`)
      : []),
    ...(restroomCandidate.report.status === 'blocked'
      ? restroomCandidate.report.blockers.map((blocker) => `RESTROOM_CANDIDATE_REVIEW:${blocker}`)
      : []),
    ...(fieldSurveyWorkset.report.status === 'blocked'
      ? fieldSurveyWorkset.report.blockers.map((blocker) => `FIELD_SURVEY:${blocker}`)
      : []),
    ...(hasConfirmedRestroomRows && restroomCandidateTransfer?.status !== 'ready_for_operator_validate'
      ? [`RESTROOM_CANDIDATE_TRANSFER_NOT_READY:${restroomCandidateTransfer?.status ?? 'missing'}`]
      : []),
    ...(hasConfirmedRestroomRows && restroomCandidateApplyPlan?.status !== 'ready_for_manual_apply'
      ? [`RESTROOM_CANDIDATE_APPLY_PLAN_NOT_READY:${restroomCandidateApplyPlan?.status ?? 'missing'}`]
      : []),
    ...(restroomCandidateTransfer?.status === 'blocked'
      ? restroomCandidateTransfer.blockers.map((blocker) => `RESTROOM_CANDIDATE_TRANSFER:${blocker}`)
      : []),
    ...(restroomCandidateApplyPlan?.status === 'blocked'
      ? restroomCandidateApplyPlan.blockers.map((blocker) => `RESTROOM_CANDIDATE_APPLY_PLAN:${blocker}`)
      : []),
  ];
  const handoff = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    reports: {
      template: path.relative(frontendRoot, paths.templateJsonPath),
      validation: path.relative(frontendRoot, paths.validationJsonPath),
      applyPlan: path.relative(frontendRoot, paths.applyPlanJsonPath),
      tsFragment: path.relative(frontendRoot, paths.applyPlanTsFragmentPath),
      foodCandidateReview: path.relative(frontendRoot, foodCandidate.paths.validationJsonPath),
      foodCandidateReviewCsv: path.relative(frontendRoot, foodCandidate.paths.validationCsvPath),
      foodCandidateReviewMarkdown: path.relative(frontendRoot, foodCandidate.paths.validationMarkdownPath),
      foodCandidateApplyPlan: path.relative(frontendRoot, foodCandidate.paths.applyPlanJsonPath),
      foodCandidateApplyPlanTsFragment: path.relative(frontendRoot, foodCandidate.paths.applyPlanTsFragmentPath),
      restroomCandidateReview: path.relative(frontendRoot, restroomCandidate.paths.validationJsonPath),
      restroomCandidateTransfer: path.relative(frontendRoot, restroomCandidate.paths.transferJsonPath),
      restroomCandidateTransferCsv: path.relative(frontendRoot, restroomCandidate.paths.transferCsvPath),
      restroomCandidateApplyPlan: path.relative(frontendRoot, restroomCandidate.paths.applyPlanJsonPath),
      restroomCandidateApplyPlanTsFragment: path.relative(frontendRoot, restroomCandidate.paths.applyPlanTsFragmentPath),
      fieldSurveyValidation: path.relative(frontendRoot, fieldSurveyWorkset.paths.validationJsonPath),
      fieldSurveyWorkset: path.relative(frontendRoot, fieldSurveyWorkset.paths.worksetJsonPath),
      fieldSurveyWorksetCsv: path.relative(frontendRoot, fieldSurveyWorkset.paths.worksetCsvPath),
    },
    summary: {
      validationStatus: validation?.status ?? null,
      applyPlanStatus: applyPlan?.status ?? null,
      foodCandidateReviewStatus: foodCandidate.report.status,
      foodCandidateApplyPlanStatus: foodCandidateApplyPlan?.status ?? null,
      restroomCandidateReviewStatus: restroomCandidate.report.status,
      restroomCandidateTransferStatus: restroomCandidateTransfer?.status ?? null,
      restroomCandidateApplyPlanStatus: restroomCandidateApplyPlan?.status ?? null,
      fieldSurveyStatus: fieldSurveyWorkset.report.status,
      confirmedFoodCandidateRows: foodCandidate.report.summary.confirmedRows,
      foodCandidateAffectedBlocks: foodCandidateApplyPlan?.summary?.affectedBlocks ?? 0,
      confirmedRestroomCandidateRows: restroomCandidate.report.summary.confirmedRows,
      restroomCandidateAffectedBlocks: restroomCandidateApplyPlan?.summary?.affectedBlocks ?? 0,
      fieldSurveyCompletedRows: fieldSurveyWorkset.report.summary.completedRows,
      fieldSurveyReadyRows: fieldSurveyWorkset.report.summary.readyRows,
      facilityPoints: applyPlan?.normalizedData?.facilityPoints?.length ?? 0,
      blockGuidance: applyPlan?.normalizedData?.blockGuidance?.length ?? 0,
      operationNotices: applyPlan?.normalizedData?.operationNotices?.length ?? 0,
      blockerCount: blockers.length,
    },
    blockers,
    nextAction: status === 'ready_for_manual_apply'
      ? 'Review and manually apply the generated TS fragment.'
      : 'Collect operator-provided Jamsil entrance/facility/operation data and rerun operator-intake.',
  };

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.handoffJsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.handoffMarkdownPath, [
    '# Jamsil Operator Visit Guide Handoff',
    '',
    `- status: \`${handoff.status}\``,
    `- sourceDataWritePerformed: \`${handoff.sourceDataWritePerformed}\``,
    `- validation: \`${handoff.summary.validationStatus ?? 'missing'}\``,
    `- apply plan: \`${handoff.summary.applyPlanStatus ?? 'missing'}\``,
    `- food candidate review: \`${handoff.summary.foodCandidateReviewStatus}\``,
    `- food candidate apply plan: \`${handoff.summary.foodCandidateApplyPlanStatus ?? 'missing'}\``,
    `- restroom candidate review: \`${handoff.summary.restroomCandidateReviewStatus}\``,
    `- restroom candidate transfer: \`${handoff.summary.restroomCandidateTransferStatus ?? 'not-required'}\``,
    `- restroom candidate apply plan: \`${handoff.summary.restroomCandidateApplyPlanStatus ?? 'not-required'}\``,
    `- field survey workset: \`${handoff.summary.fieldSurveyStatus}\``,
    `- TS fragment: \`${handoff.reports.tsFragment}\``,
    `- food candidate report: \`${handoff.reports.foodCandidateReview}\``,
    `- food candidate TS fragment: \`${handoff.reports.foodCandidateApplyPlanTsFragment}\``,
    `- restroom candidate report: \`${handoff.reports.restroomCandidateReview}\``,
    `- restroom candidate TS fragment: \`${handoff.reports.restroomCandidateApplyPlanTsFragment}\``,
    `- field survey workset: \`${handoff.reports.fieldSurveyWorkset}\``,
    `- next action: ${handoff.nextAction}`,
    '',
    ...(blockers.length > 0 ? ['## Blockers', '', ...blockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[jamsil-operator-handoff] status=${handoff.status}`);
  console.log(`[jamsil-operator-handoff] report=${paths.handoffJsonPath}`);
  if (exitOnBlocked && handoff.status === 'blocked') {
    process.exit(1);
  }
  return { report: handoff, paths };
};

const runOperatorIntake = async () => {
  await runOperatorTemplate();
  const foodReviewWorkset = await runFoodCandidateReviewWorkset({ exitOnBlocked: false });
  const foodTransfer = await runFoodCandidateTransfer({ exitOnBlocked: false });
  const foodCandidateApplyPlan = await runFoodCandidateApplyPlan({ exitOnBlocked: false });
  const restroomReviewWorkset = await runRestroomCandidateReviewWorkset({ exitOnBlocked: false });
  const restroomTransfer = await runRestroomCandidateTransfer({ exitOnBlocked: false });
  const restroomCandidateApplyPlan = await runRestroomCandidateApplyPlan({ exitOnBlocked: false });
  const fieldSurveyWorkset = await runFieldSurveyWorkset({ exitOnBlocked: false });
  const validation = await runOperatorValidate({ exitOnBlocked: false });
  const applyPlan = await runOperatorApplyPlan({ exitOnBlocked: false });
  const handoff = await runOperatorHandoff({ exitOnBlocked: false });
  if (
    foodReviewWorkset.report.status === 'blocked'
    || foodTransfer.report.status === 'blocked'
    || foodCandidateApplyPlan.report.status === 'blocked'
    || restroomReviewWorkset.report.status === 'blocked'
    || restroomTransfer.report.status === 'blocked'
    || restroomCandidateApplyPlan.report.status === 'blocked'
    || fieldSurveyWorkset.report.status === 'blocked'
    || validation.report.status === 'blocked'
    || validation.foodCandidate.report.status === 'blocked'
    || applyPlan.report.status === 'blocked'
    || handoff.report.status === 'blocked'
  ) {
    process.exit(1);
  }
};

const runFoodCandidateValidate = async ({ exitOnBlocked = true } = {}) => {
  const { report, paths } = await validateJamsilFoodCandidateReview({ writeReports: true });
  console.log(`[jamsil-food-candidate-validate] status=${report.status}`);
  console.log(`[jamsil-food-candidate-validate] report=${paths.validationJsonPath}`);
  if (exitOnBlocked && report.status === 'blocked') {
    process.exit(1);
  }
  return { report, paths };
};

const runFieldSurveyValidate = async ({ exitOnBlocked = true } = {}) => {
  const { report, paths } = await validateJamsilFieldSurveyReview({ writeReports: true });
  console.log(`[jamsil-field-survey-validate] status=${report.status}`);
  console.log(`[jamsil-field-survey-validate] report=${paths.validationJsonPath}`);
  if (exitOnBlocked && report.status === 'blocked') {
    process.exit(1);
  }
  return { report, paths };
};

const runFieldSurveyWorkset = async ({ exitOnBlocked = true } = {}) => {
  const { report: validation, paths } = await validateJamsilFieldSurveyReview({ writeReports: true });
  const sourceSha256Before = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const { header, rows } = parseCsv(await fs.readFile(paths.reviewPath, 'utf8'));
  const rowReportsByNumber = new Map(validation.rows.map((row) => [row.rowNumber, row]));
  const reviewBatchId = `jamsil-field-survey-${validation.review.expectedRows}-blocks`;
  const worksetRows = rows.map((row) => {
    const rowReport = rowReportsByNumber.get(row.rowNumber);
    const missingOperatorFields = rowReport?.missingOperatorFields ?? [];
    const rowState = rowReport?.rowState ?? 'BLOCKED';
    return {
      reviewBatchId,
      rowNumber: row.rowNumber,
      rowState,
      missingOperatorFields,
      nextAction: fieldSurveyNextAction(rowState, missingOperatorFields),
      blockers: rowReport?.blockers ?? [],
      restroomStatus: rowReport?.restroomStatus ?? 'WAITING_FOR_OPERATOR',
      walkingStatus: rowReport?.walkingStatus ?? 'WAITING_FOR_OPERATOR',
      congestionStatus: rowReport?.congestionStatus ?? 'WAITING_FOR_OPERATOR',
      ...row.values,
    };
  });
  const sourceSha256After = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const workset = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status: validation.status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    reviewBatchId,
    review: validation.review,
    validationReportPath: path.relative(frontendRoot, paths.validationJsonPath),
    worksetCsvPath: path.relative(frontendRoot, paths.worksetCsvPath),
    sourceFile: {
      path: 'src/data/jamsilOperatorVisitGuide.ts',
      sha256Before: sourceSha256Before,
      sha256After: sourceSha256After,
      unchanged: sourceSha256Before === sourceSha256After,
    },
    summary: {
      ...validation.summary,
      waitingRows: worksetRows.filter((row) => row.rowState === 'WAITING_FOR_OPERATOR').length,
      partialRows: worksetRows.filter((row) => row.rowState === 'PARTIAL_OPERATOR_REVIEW').length,
      readyRows: worksetRows.filter((row) => row.rowState === 'READY_FOR_FUTURE_APPLY_PLAN').length,
      blockedRows: worksetRows.filter((row) => row.rowState === 'BLOCKED').length,
    },
    allowedValues: {
      verificationStatus: [...JAMSIL_FIELD_SURVEY_VERIFICATION_STATUSES],
      operatorRestroomAccessible: [...JAMSIL_FIELD_SURVEY_ACCESSIBLE_STATUSES],
      minutes: 'blank, UNKNOWN, or non-negative integer; do not infer measured time',
      congestionLevel: [...JAMSIL_FIELD_SURVEY_CONGESTION_LEVELS],
      operatorCongestionObservedAt: 'blank or YYYY-MM-DDTHH:mm+09:00',
    },
    sourcePolicy: validation.sourcePolicy,
    blockers: validation.blockers,
    rows: worksetRows,
    nextAction: validation.status === 'blocked'
      ? 'Fix field-survey blockers before future apply-plan work.'
      : validation.status === 'ready_for_future_apply_plan'
        ? 'Review the complete field-survey packet before designing a future manual apply-plan.'
        : 'Send the workset to the operator; runtime restroom, walking-time, and congestion data remain MANUAL_BASEBALL_DATA_REQUIRED.',
  };
  const worksetColumns = [
    ...header,
    'reviewBatchId',
    'rowState',
    'restroomStatus',
    'walkingStatus',
    'congestionStatus',
    'missingOperatorFields',
    'nextAction',
    'blockers',
  ];

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.worksetJsonPath, `${JSON.stringify(workset, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.worksetCsvPath, `${[
    csvLine(worksetColumns),
    ...worksetRows.map((row) => csvLine(worksetColumns.map((column) => {
      if (column === 'missingOperatorFields') return row.missingOperatorFields.join(';');
      if (column === 'blockers') return row.blockers.join(';');
      return row[column] ?? '';
    }))),
  ].join('\n')}\n`, 'utf8');
  await fs.writeFile(paths.worksetMarkdownPath, [
    '# Jamsil Field Survey Workset',
    '',
    `- status: \`${workset.status}\``,
    `- reviewBatchId: \`${workset.reviewBatchId}\``,
    `- sourceDataWritePerformed: \`${workset.sourceDataWritePerformed}\``,
    `- review: \`${workset.review.path}\``,
    `- validation: \`${workset.validationReportPath}\``,
    `- workset CSV: \`${workset.worksetCsvPath}\``,
    `- totalRows: \`${workset.summary.totalRows}\``,
    `- numberedRows: \`${workset.summary.numberedRows}\``,
    `- specialRows: \`${workset.summary.specialRows}\``,
    `- confirmedRestroomRows: \`${workset.summary.confirmedRestroomRows}\``,
    `- confirmedWalkingRows: \`${workset.summary.confirmedWalkingRows}\``,
    `- confirmedCongestionRows: \`${workset.summary.confirmedCongestionRows}\``,
    `- blockerCount: \`${workset.summary.blockerCount}\``,
    `- next action: ${workset.nextAction}`,
    '',
    '## Required Operator Fields',
    '',
    '- Restroom confirmation requires `operatorRestroomFacilityId`, `operatorRestroomLocationText`, `operatorRestroomFloor`, `operatorRestroomSide`, `operatorRestroomAccessible`, and `operatorSectionToRestroomMinutes`.',
    '- Walking confirmation requires `operatorGateToSectionMinutes` and `operatorSectionToFoodMinutes`.',
    '- Congestion confirmation requires all queue/density levels. `operatorCongestionObservedAt` is required only when any level is `LOW`, `MEDIUM`, or `HIGH`; all-`UNKNOWN` confirmation may leave it blank.',
    '- Use `UNKNOWN` for measured values that the operator cannot confirm. Do not invent walking minutes from seat location or map position.',
    '- `REJECTED` and `NEEDS_RECHECK` require `reviewerNote`.',
    '',
    '## Rows',
    '',
    markdownTable(
      ['row', 'block', 'label', 'state', 'restroom', 'walking', 'congestion', 'missing fields', 'next action', 'blockers'],
      worksetRows.map((row) => [
        row.rowNumber,
        row.blockId,
        row.blockLabel,
        row.rowState,
        row.restroomStatus,
        row.walkingStatus,
        row.congestionStatus,
        row.missingOperatorFields.join(';') || '-',
        row.nextAction,
        row.blockers.join(';') || '-',
      ]),
    ),
    '',
    '## Commands',
    '',
    '```bash',
    'npm run stadium:jamsil:field-survey-validate',
    'npm run stadium:jamsil:field-survey-workset',
    '```',
    '',
    ...(workset.blockers.length > 0 ? ['## Blockers', '', ...workset.blockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[jamsil-field-survey-workset] status=${workset.status}`);
  console.log(`[jamsil-field-survey-workset] report=${paths.worksetJsonPath}`);
  console.log(`[jamsil-field-survey-workset] csv=${paths.worksetCsvPath}`);
  if (exitOnBlocked && workset.status === 'blocked') {
    process.exit(1);
  }
  return { report: workset, paths };
};

const foodCandidateReviewRowState = (record, rowReport) => {
  if (rowReport?.status === 'blocked') return 'BLOCKED';
  if (record.operatorVerificationStatus === 'OPERATOR_CONFIRMED') return 'OPERATOR_CONFIRMED';
  if (record.operatorVerificationStatus === 'REJECTED') return 'REJECTED';
  if (record.operatorVerificationStatus === 'NEEDS_RECHECK') return 'NEEDS_RECHECK';
  return 'WAITING_FOR_OPERATOR';
};

const missingFoodCandidateReviewFields = (record, rowState) => {
  if (rowState === 'OPERATOR_CONFIRMED' || rowState === 'WAITING_FOR_OPERATOR' || rowState === 'BLOCKED') {
    const missing = JAMSIL_FOOD_CONFIRMATION_REQUIRED_COLUMNS.filter((column) => !record[column]);
    if (['REJECTED', 'NEEDS_RECHECK'].includes(record.operatorVerificationStatus) && !record.reviewerNote) {
      missing.push('reviewerNote');
    }
    return missing;
  }
  if (['REJECTED', 'NEEDS_RECHECK'].includes(rowState) && !record.reviewerNote) {
    return ['reviewerNote'];
  }
  return [];
};

const foodCandidateReviewNextAction = (rowState, missingOperatorFields) => {
  if (rowState === 'BLOCKED') return 'Fix blockers before transfer/apply-plan.';
  if (rowState === 'OPERATOR_CONFIRMED' && missingOperatorFields.length === 0) {
    return 'Ready for food-candidate-transfer; do not infer extra blocks outside operatorNearSectionIds.';
  }
  if (rowState === 'OPERATOR_CONFIRMED') return 'Complete missing operator fields before transfer.';
  if (rowState === 'REJECTED') return 'Keep out of transfer/apply-plan; reviewerNote records rejection reason.';
  if (rowState === 'NEEDS_RECHECK') return 'Keep out of transfer/apply-plan until the operator resolves the recheck.';
  return 'Operator must confirm, reject, or mark needs recheck.';
};

const countWorksetRows = (rows, state) => rows.filter((row) => row.rowState === state).length;

const runRestroomCandidateValidate = async ({ exitOnBlocked = true } = {}) => {
  const { report, paths } = await validateJamsilRestroomCandidateReview({ writeReports: true });
  console.log(`[jamsil-restroom-candidate-validate] status=${report.status}`);
  console.log(`[jamsil-restroom-candidate-validate] report=${paths.validationJsonPath}`);
  if (exitOnBlocked && report.status === 'blocked') {
    process.exit(1);
  }
  return { report, paths };
};

const runRestroomCandidateReviewWorkset = async ({ exitOnBlocked = true } = {}) => {
  const { report: validation, paths } = await validateJamsilRestroomCandidateReview({ writeReports: true });
  const sourceSha256Before = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  let header = [];
  let rows = [];
  try {
    ({ header, rows } = parseCsv(await fs.readFile(paths.reviewPath, 'utf8')));
  } catch {
    header = JAMSIL_RESTROOM_CANDIDATE_REQUIRED_COLUMNS;
    rows = [];
  }
  const rowReportsByNumber = new Map(validation.rows.map((row) => [row.rowNumber, row]));
  const reviewBatchId = `jamsil-restroom-review-${validation.review.totalRows}-candidates`;
  const worksetRows = rows.map((row) => {
    const record = row.values;
    const rowReport = rowReportsByNumber.get(row.rowNumber);
    const rowState = restroomCandidateReviewRowState(record, rowReport);
    const missingOperatorFields = missingRestroomCandidateReviewFields(record, rowState);
    return {
      reviewBatchId,
      rowNumber: row.rowNumber,
      rowState,
      missingOperatorFields,
      nextAction: restroomCandidateReviewNextAction(rowState, missingOperatorFields),
      blockers: rowReport?.blockers ?? [],
      ...record,
    };
  });
  const groupIds = [...new Set(worksetRows.map((row) => row.candidateDataStatus).filter(Boolean))];
  const groups = groupIds.map((candidateDataStatus) => {
    const groupRows = worksetRows.filter((row) => row.candidateDataStatus === candidateDataStatus);
    return {
      candidateDataStatus,
      totalRows: groupRows.length,
      waitingRows: countWorksetRows(groupRows, 'WAITING_FOR_OPERATOR'),
      confirmedRows: countWorksetRows(groupRows, 'OPERATOR_CONFIRMED'),
      rejectedRows: countWorksetRows(groupRows, 'REJECTED'),
      needsRecheckRows: countWorksetRows(groupRows, 'NEEDS_RECHECK'),
      blockedRows: countWorksetRows(groupRows, 'BLOCKED'),
      rows: groupRows.map((row) => ({
        rowNumber: row.rowNumber,
        candidateFacilityId: row.candidateFacilityId,
        candidateFacilityName: row.candidateFacilityName,
        rowState: row.rowState,
        missingOperatorFields: row.missingOperatorFields,
        nextAction: row.nextAction,
      })),
    };
  });
  const sourceSha256After = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const workset = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status: validation.status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    reviewBatchId,
    review: validation.review,
    validationReportPath: path.relative(frontendRoot, paths.validationJsonPath),
    worksetCsvPath: path.relative(frontendRoot, paths.reviewWorksetCsvPath),
    sourceFile: {
      path: 'src/data/jamsilOperatorVisitGuide.ts',
      sha256Before: sourceSha256Before,
      sha256After: sourceSha256After,
      unchanged: sourceSha256Before === sourceSha256After,
    },
    summary: {
      ...validation.summary,
      waitingRows: countWorksetRows(worksetRows, 'WAITING_FOR_OPERATOR'),
      confirmedRows: countWorksetRows(worksetRows, 'OPERATOR_CONFIRMED'),
      rejectedRows: countWorksetRows(worksetRows, 'REJECTED'),
      needsRecheckRows: countWorksetRows(worksetRows, 'NEEDS_RECHECK'),
      blockedRows: countWorksetRows(worksetRows, 'BLOCKED'),
    },
    allowedValues: {
      operatorFacilityId: 'jamsil-facility-restroom-*',
      operatorNearSectionIds: 'semicolon-separated JAMSIL block ids from operator confirmation only',
      operatorNearGateIds: 'semicolon-separated JAMSIL_GATE_N_N ids',
      operatorOpenStatus: [...JAMSIL_RESTROOM_OPERATOR_OPEN_STATUSES],
      operatorAccessible: [...JAMSIL_RESTROOM_OPERATOR_ACCESSIBLE_STATUSES],
      operatorWalkingMinutes: 'UNKNOWN or non-negative integer; do not infer measured time',
      operatorVerificationStatus: [...JAMSIL_RESTROOM_OPERATOR_VERIFICATION_STATUSES].filter(Boolean),
    },
    sourcePolicy: validation.sourcePolicy,
    blockers: validation.blockers,
    groups,
    rows: worksetRows,
    nextAction: validation.status === 'blocked'
      ? 'Fix restroom candidate review blockers before future apply-plan work.'
      : validation.status === 'ready_for_future_apply_plan'
        ? 'Review the confirmed restroom packet before designing a future manual apply-plan.'
        : 'Send the workset to the operator; runtime restroom, walking-time, and congestion data remain MANUAL_BASEBALL_DATA_REQUIRED.',
  };
  const worksetColumns = [
    ...header,
    'reviewBatchId',
    'rowState',
    'missingOperatorFields',
    'nextAction',
    'blockers',
  ];

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.reviewWorksetJsonPath, `${JSON.stringify(workset, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.reviewWorksetCsvPath, `${[
    csvLine(worksetColumns),
    ...worksetRows.map((row) => csvLine(worksetColumns.map((column) => {
      if (column === 'missingOperatorFields') return row.missingOperatorFields.join(';');
      if (column === 'blockers') return row.blockers.join(';');
      return row[column] ?? '';
    }))),
  ].join('\n')}\n`, 'utf8');
  await fs.writeFile(paths.reviewWorksetMarkdownPath, [
    '# Jamsil Restroom Candidate Review Workset',
    '',
    `- status: \`${workset.status}\``,
    `- reviewBatchId: \`${workset.reviewBatchId}\``,
    `- sourceDataWritePerformed: \`${workset.sourceDataWritePerformed}\``,
    `- review: \`${workset.review.path}\``,
    `- validation: \`${workset.validationReportPath}\``,
    `- workset CSV: \`${workset.worksetCsvPath}\``,
    `- totalRows: \`${workset.summary.totalRows}\``,
    `- officialRows: \`${workset.summary.officialRows}\``,
    `- fieldCollectedRows: \`${workset.summary.fieldCollectedRows}\``,
    `- confirmedRows: \`${workset.summary.confirmedRows}\``,
    `- waitingRows: \`${workset.summary.waitingRows}\``,
    `- blockerCount: \`${workset.summary.blockerCount}\``,
    `- next action: ${workset.nextAction}`,
    '',
    '## Candidate Status Summary',
    '',
    markdownTable(
      ['candidate status', 'total', 'waiting', 'confirmed', 'rejected', 'needs recheck', 'blocked'],
      groups.map((group) => [
        group.candidateDataStatus,
        group.totalRows,
        group.waitingRows,
        group.confirmedRows,
        group.rejectedRows,
        group.needsRecheckRows,
        group.blockedRows,
      ]),
    ),
    '',
    '## Required Operator Fields',
    '',
    '- `operatorFacilityId`: `jamsil-facility-restroom-*`',
    '- `operatorNearSectionIds`: operator-confirmed block ids only; do not infer from map position.',
    '- `operatorLocationText`: user-facing location text.',
    '- `operatorFloor` and `operatorSide`: operator-confirmed location hints.',
    '- `operatorOpenStatus`: `OPEN`, `CLOSED`, `GAME_DAY_ONLY`, `24_HOURS`, or `UNKNOWN`.',
    '- `operatorAccessible`: `YES`, `NO`, or `UNKNOWN`.',
    '- `operatorWalkingMinutes`: `UNKNOWN` or a non-negative integer; do not invent measured time.',
    '- `operatorVerificationStatus`: `OPERATOR_CONFIRMED`, `REJECTED`, or `NEEDS_RECHECK`.',
    '- `reviewerNote`: required for `REJECTED` and `NEEDS_RECHECK`.',
    '',
    '## Excluded From Runtime',
    '',
    '- 2011 historical restroom wait-time metrics are not current operating data.',
    '- Jamsil Sports Complex exit 5 crowd sensing is external approach congestion, not inside-stadium restroom queue data.',
    '- This workset does not update `src/data/jamsilOperatorVisitGuide.ts` or `JAMSIL_OPERATION_NOTICES`.',
    '',
    '## Rows',
    '',
    markdownTable(
      ['row', 'candidate id', 'name', 'candidate status', 'state', 'missing fields', 'next action', 'blockers'],
      worksetRows.map((row) => [
        row.rowNumber,
        row.candidateFacilityId,
        row.candidateFacilityName,
        row.candidateDataStatus,
        row.rowState,
        row.missingOperatorFields.join(';') || '-',
        row.nextAction,
        row.blockers.join(';') || '-',
      ]),
    ),
    '',
    '## Commands',
    '',
    '```bash',
    'npm run stadium:jamsil:restroom-candidate-validate',
    'npm run stadium:jamsil:restroom-candidate-review-workset',
    'npm run stadium:jamsil:field-survey-workset',
    '```',
    '',
    ...(workset.blockers.length > 0 ? ['## Blockers', '', ...workset.blockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[jamsil-restroom-candidate-review-workset] status=${workset.status}`);
  console.log(`[jamsil-restroom-candidate-review-workset] report=${paths.reviewWorksetJsonPath}`);
  console.log(`[jamsil-restroom-candidate-review-workset] csv=${paths.reviewWorksetCsvPath}`);
  if (exitOnBlocked && workset.status === 'blocked') {
    process.exit(1);
  }
  return { report: workset, paths };
};

const runFoodCandidateReviewWorkset = async ({ exitOnBlocked = true } = {}) => {
  const { report: validation, paths } = await validateJamsilFoodCandidateReview({ writeReports: true });
  const sourceSha256Before = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  let header = [];
  let rows = [];
  try {
    ({ header, rows } = parseCsv(await fs.readFile(paths.reviewPath, 'utf8')));
  } catch {
    header = JAMSIL_FOOD_CANDIDATE_REQUIRED_COLUMNS;
    rows = [];
  }
  const rowReportsByNumber = new Map(validation.rows.map((row) => [row.rowNumber, row]));
  const reviewBatchId = `jamsil-food-review-${validation.review.totalRows}-candidates`;
  const worksetRows = rows.map((row) => {
    const record = row.values;
    const rowReport = rowReportsByNumber.get(row.rowNumber);
    const rowState = foodCandidateReviewRowState(record, rowReport);
    const missingOperatorFields = missingFoodCandidateReviewFields(record, rowState);
    return {
      reviewBatchId,
      rowNumber: row.rowNumber,
      rowState,
      missingOperatorFields,
      nextAction: foodCandidateReviewNextAction(rowState, missingOperatorFields),
      blockers: rowReport?.blockers ?? [],
      ...record,
    };
  });
  const zoneIds = [...new Set(worksetRows.map((row) => row.candidateZoneId).filter(Boolean))];
  const zones = zoneIds.map((zoneId) => {
    const zoneRows = worksetRows.filter((row) => row.candidateZoneId === zoneId);
    return {
      zoneId,
      totalRows: zoneRows.length,
      waitingRows: countWorksetRows(zoneRows, 'WAITING_FOR_OPERATOR'),
      confirmedRows: countWorksetRows(zoneRows, 'OPERATOR_CONFIRMED'),
      rejectedRows: countWorksetRows(zoneRows, 'REJECTED'),
      needsRecheckRows: countWorksetRows(zoneRows, 'NEEDS_RECHECK'),
      blockedRows: countWorksetRows(zoneRows, 'BLOCKED'),
      rows: zoneRows.map((row) => ({
        rowNumber: row.rowNumber,
        candidateStoreName: row.candidateStoreName,
        rowState: row.rowState,
        missingOperatorFields: row.missingOperatorFields,
        nextAction: row.nextAction,
      })),
    };
  });
  const sourceSha256After = await sha256File(JAMSIL_OPERATOR_SOURCE_FILE);
  const workset = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status: validation.status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    reviewBatchId,
    review: validation.review,
    validationReportPath: path.relative(frontendRoot, paths.validationJsonPath),
    worksetCsvPath: path.relative(frontendRoot, paths.reviewWorksetCsvPath),
    sourceFile: {
      path: 'src/data/jamsilOperatorVisitGuide.ts',
      sha256Before: sourceSha256Before,
      sha256After: sourceSha256After,
      unchanged: sourceSha256Before === sourceSha256After,
    },
    summary: {
      totalRows: worksetRows.length,
      expectedRows: validation.review.expectedRows,
      zoneCount: zones.length,
      waitingRows: countWorksetRows(worksetRows, 'WAITING_FOR_OPERATOR'),
      confirmedRows: countWorksetRows(worksetRows, 'OPERATOR_CONFIRMED'),
      rejectedRows: countWorksetRows(worksetRows, 'REJECTED'),
      needsRecheckRows: countWorksetRows(worksetRows, 'NEEDS_RECHECK'),
      blockedRows: countWorksetRows(worksetRows, 'BLOCKED'),
      blockerCount: validation.blockers.length,
    },
    allowedValues: {
      operatorFacilityId: 'jamsil-facility-concession-*',
      operatorNearSectionIds: 'semicolon-separated JAMSIL block ids from operator confirmation only',
      operatorOpenStatus: [...JAMSIL_FOOD_OPERATOR_OPEN_STATUSES],
      operatorAccessible: [...JAMSIL_FOOD_OPERATOR_ACCESSIBLE_STATUSES],
      operatorWalkingMinutes: 'UNKNOWN or non-negative integer',
      operatorVerificationStatus: [...JAMSIL_FOOD_OPERATOR_VERIFICATION_STATUSES].filter(Boolean),
    },
    sourcePolicy: validation.sourcePolicy,
    blockers: validation.blockers,
    zones,
    rows: worksetRows,
    nextAction: validation.status === 'blocked'
      ? 'Fix food candidate review blockers before transfer/apply-plan.'
      : validation.summary.confirmedRows > 0
        ? 'Run food-candidate-transfer with a valid operator source document id and last-updated date.'
        : 'Send the workset to the operator and keep runtime exposure disabled until OPERATOR_CONFIRMED rows exist.',
  };
  const worksetColumns = [
    ...header,
    'reviewBatchId',
    'rowState',
    'missingOperatorFields',
    'nextAction',
  ];

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.reviewWorksetJsonPath, `${JSON.stringify(workset, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.reviewWorksetCsvPath, `${[
    csvLine(worksetColumns),
    ...worksetRows.map((row) => csvLine(worksetColumns.map((column) => {
      if (column === 'missingOperatorFields') return row.missingOperatorFields.join(';');
      return row[column] ?? '';
    }))),
  ].join('\n')}\n`, 'utf8');
  await fs.writeFile(paths.reviewWorksetMarkdownPath, [
    '# Jamsil Food Candidate Review Workset',
    '',
    `- status: \`${workset.status}\``,
    `- reviewBatchId: \`${workset.reviewBatchId}\``,
    `- sourceDataWritePerformed: \`${workset.sourceDataWritePerformed}\``,
    `- review: \`${workset.review.path}\``,
    `- validation: \`${workset.validationReportPath}\``,
    `- workset CSV: \`${workset.worksetCsvPath}\``,
    `- totalRows: \`${workset.summary.totalRows}\``,
    `- zoneCount: \`${workset.summary.zoneCount}\``,
    `- confirmedRows: \`${workset.summary.confirmedRows}\``,
    `- waitingRows: \`${workset.summary.waitingRows}\``,
    `- blockerCount: \`${workset.summary.blockerCount}\``,
    `- next action: ${workset.nextAction}`,
    '',
    '## Zone Summary',
    '',
    markdownTable(
      ['zone', 'total', 'waiting', 'confirmed', 'rejected', 'needs recheck', 'blocked'],
      zones.map((zone) => [
        zone.zoneId,
        zone.totalRows,
        zone.waitingRows,
        zone.confirmedRows,
        zone.rejectedRows,
        zone.needsRecheckRows,
        zone.blockedRows,
      ]),
    ),
    '',
    '## Required Operator Fields',
    '',
    '- `operatorFacilityId`: `jamsil-facility-concession-*`',
    '- `operatorNearSectionIds`: operator-confirmed block ids only; do not infer from seat positions.',
    '- `operatorLocationText`: user-facing location text.',
    '- `operatorOpenStatus`: `OPEN`, `CLOSED`, `GAME_DAY_ONLY`, or `UNKNOWN`.',
    '- `operatorAccessible`: `YES`, `NO`, or `UNKNOWN`.',
    '- `operatorWalkingMinutes`: `UNKNOWN` or a non-negative integer; do not invent measured time.',
    '- `operatorVerificationStatus`: `OPERATOR_CONFIRMED`, `REJECTED`, or `NEEDS_RECHECK`.',
    '- `reviewerNote`: required for `REJECTED` and `NEEDS_RECHECK`.',
    '',
    '## Rows',
    '',
    markdownTable(
      ['row', 'zone', 'store', 'state', 'missing fields', 'next action', 'blockers'],
      worksetRows.map((row) => [
        row.rowNumber,
        row.candidateZoneId,
        row.candidateStoreName,
        row.rowState,
        row.missingOperatorFields.join(';') || '-',
        row.nextAction,
        row.blockers.join(';') || '-',
      ]),
    ),
    '',
    '## Commands After Review',
    '',
    '```bash',
    'npm run stadium:jamsil:food-candidate-validate',
    'npm run stadium:jamsil:food-candidate-transfer -- --source-document-id jamsil-operator-YYYYMMDD-food-review --last-updated-at YYYY-MM-DD',
    'npm run stadium:jamsil:food-candidate-apply-plan -- --source-document-id jamsil-operator-YYYYMMDD-food-review --last-updated-at YYYY-MM-DD',
    'npm run stadium:jamsil:operator-intake',
    'npm run stadium:jamsil:operator-approval',
    '```',
    '',
    ...(workset.blockers.length > 0 ? ['## Blockers', '', ...workset.blockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[jamsil-food-candidate-review-workset] status=${workset.status}`);
  console.log(`[jamsil-food-candidate-review-workset] report=${paths.reviewWorksetJsonPath}`);
  console.log(`[jamsil-food-candidate-review-workset] csv=${paths.reviewWorksetCsvPath}`);
  if (exitOnBlocked && workset.status === 'blocked') {
    process.exit(1);
  }
  return { report: workset, paths };
};

const runRestroomCandidateTransfer = async ({ exitOnBlocked = true } = {}) => {
  const { report: validation, paths } = await validateJamsilRestroomCandidateReview({ writeReports: true });
  const sourceDocumentId = operatorArgValue('--source-document-id', '');
  const lastUpdatedAt = operatorArgValue('--last-updated-at', '');
  const transferBlockers = validation.status === 'blocked'
    ? validation.blockers.map((blocker) => `RESTROOM_CANDIDATE_REVIEW:${blocker}`)
    : [];
  const hasConfirmedRows = validation.confirmedRows.length > 0;

  if (hasConfirmedRows) {
    if (!sourceDocumentId) {
      transferBlockers.push('RESTROOM_TRANSFER_MISSING_SOURCE_DOCUMENT_ID:--source-document-id is required when confirmed rows exist');
    } else if (!JAMSIL_OPERATOR_SOURCE_ID_PATTERN.test(sourceDocumentId)) {
      transferBlockers.push('RESTROOM_TRANSFER_INVALID_SOURCE_DOCUMENT_ID:--source-document-id must match jamsil-operator-YYYYMMDD-*');
    }

    if (!lastUpdatedAt) {
      transferBlockers.push('RESTROOM_TRANSFER_MISSING_LAST_UPDATED_AT:--last-updated-at is required when confirmed rows exist');
    } else if (!JAMSIL_OPERATOR_ISO_DATE_PATTERN.test(lastUpdatedAt)) {
      transferBlockers.push('RESTROOM_TRANSFER_INVALID_LAST_UPDATED_AT:--last-updated-at must be YYYY-MM-DD');
    }
  }

  const status = transferBlockers.length > 0
    ? 'blocked'
    : hasConfirmedRows
      ? 'ready_for_operator_validate'
      : 'waiting_for_operator';
  const rows = status === 'ready_for_operator_validate'
    ? validation.confirmedRows.map((row) => ({
      recordType: 'facility',
      stadium: 'JAMSIL',
      sourceDocumentId,
      lastUpdatedAt,
      pointId: row.operatorFacilityId,
      kind: 'RESTROOM',
      label: row.candidateFacilityName,
      floor: row.operatorFloor,
      side: row.operatorSide,
      nearSectionIds: row.operatorNearSectionIds.join(';'),
      locationText: row.operatorLocationText,
      openStatus: row.operatorOpenStatus,
      accessible: row.operatorAccessible,
      walkingMinutes: String(row.operatorWalkingMinutes),
      verificationStatus: 'OPERATOR_CONFIRMED',
      blockId: '',
      recommendedEntrancePointIds: '',
      nearbyFacilityPointIds: '',
      cautionNotes: '',
      noticeId: '',
      validFrom: '',
      validTo: '',
      priority: '',
      teamContext: '',
      affectedBlockIds: '',
      message: '',
    }))
    : [];
  const transfer = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    reviewReportPath: path.relative(frontendRoot, paths.validationJsonPath),
    transferCsvPath: path.relative(frontendRoot, paths.transferCsvPath),
    sourceDocumentId: sourceDocumentId || null,
    lastUpdatedAt: lastUpdatedAt || null,
    summary: {
      confirmedRows: validation.confirmedRows.length,
      transferredRows: rows.length,
      blockerCount: transferBlockers.length,
    },
    blockers: transferBlockers,
    rows,
    nextAction: status === 'ready_for_operator_validate'
      ? `Run operator validation with --input ${path.relative(frontendRoot, paths.transferCsvPath)} and the same --review file.`
      : hasConfirmedRows
        ? 'Provide --source-document-id and --last-updated-at before transferring confirmed rows.'
        : 'Keep restroom candidates in review until operatorVerificationStatus=OPERATOR_CONFIRMED rows exist.',
  };

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.transferJsonPath, `${JSON.stringify(transfer, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.transferCsvPath, `${[
    csvLine(JAMSIL_OPERATOR_REQUIRED_COLUMNS),
    ...rows.map((row) => csvLine(JAMSIL_OPERATOR_REQUIRED_COLUMNS.map((column) => row[column] ?? ''))),
  ].join('\n')}\n`, 'utf8');
  await fs.writeFile(paths.transferMarkdownPath, [
    '# Jamsil Restroom Candidate Intake Transfer',
    '',
    `- status: \`${status}\``,
    `- sourceDataWritePerformed: \`${transfer.sourceDataWritePerformed}\``,
    `- review report: \`${transfer.reviewReportPath}\``,
    `- transfer CSV: \`${transfer.transferCsvPath}\``,
    `- confirmedRows: \`${transfer.summary.confirmedRows}\``,
    `- transferredRows: \`${transfer.summary.transferredRows}\``,
    `- blockerCount: \`${transfer.summary.blockerCount}\``,
    `- next action: ${transfer.nextAction}`,
    '',
    ...(transferBlockers.length > 0 ? ['## Blockers', '', ...transferBlockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[jamsil-restroom-candidate-transfer] status=${transfer.status}`);
  console.log(`[jamsil-restroom-candidate-transfer] report=${paths.transferJsonPath}`);
  console.log(`[jamsil-restroom-candidate-transfer] csv=${paths.transferCsvPath}`);
  if (exitOnBlocked && transfer.status === 'blocked') {
    process.exit(1);
  }
  return { report: transfer, paths };
};

const runRestroomCandidateApplyPlan = async ({ exitOnBlocked = true } = {}) => {
  const { report: validation, paths } = await validateJamsilRestroomCandidateReview({ writeReports: true });
  const sourceDocumentId = operatorArgValue('--source-document-id', '');
  const lastUpdatedAt = operatorArgValue('--last-updated-at', '');
  const hasConfirmedRows = validation.confirmedRows.length > 0;
  const applyPlanBlockers = [
    ...(validation.status === 'blocked'
      ? validation.blockers.map((blocker) => `RESTROOM_CANDIDATE_REVIEW:${blocker}`)
      : []),
    ...validateFoodCandidateSourceArgs({
      sourceDocumentId,
      lastUpdatedAt,
      hasConfirmedRows,
      blockerPrefix: 'RESTROOM_APPLY',
    }),
  ];
  const {
    JAMSIL_OPERATOR_FACILITY_POINTS,
    JAMSIL_BLOCK_VISIT_GUIDANCE,
    JAMSIL_OPERATION_NOTICES,
  } = await import('../src/data/jamsilOperatorVisitGuide.ts');
  const status = applyPlanBlockers.length > 0
    ? 'blocked'
    : hasConfirmedRows
      ? 'ready_for_manual_apply'
      : 'waiting_for_operator';
  const normalizedData = status === 'ready_for_manual_apply'
    ? mergeRestroomCandidateManualApplyData({
      currentFacilityPoints: JAMSIL_OPERATOR_FACILITY_POINTS,
      currentBlockGuidance: JAMSIL_BLOCK_VISIT_GUIDANCE,
      confirmedRows: validation.confirmedRows,
      sourceDocumentId,
      lastUpdatedAt,
    })
    : {
      facilityPoints: [],
      blockGuidance: [],
      candidateFacilityPoints: [],
      affectedBlockIds: [],
    };
  const applyPlan = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    targetSourceFile: 'src/data/jamsilOperatorVisitGuide.ts',
    reviewReportPath: path.relative(frontendRoot, paths.validationJsonPath),
    tsFragmentPath: path.relative(frontendRoot, paths.applyPlanTsFragmentPath),
    sourceDocumentId: sourceDocumentId || null,
    lastUpdatedAt: lastUpdatedAt || null,
    operationNoticesUnchanged: true,
    excludedFromRuntime: [
      '2011 historical restroom wait-time metrics',
      'Jamsil Sports Complex exit 5 external approach congestion',
    ],
    currentRuntimeSummary: {
      facilityPoints: JAMSIL_OPERATOR_FACILITY_POINTS.length,
      blockGuidance: JAMSIL_BLOCK_VISIT_GUIDANCE.length,
      operationNotices: JAMSIL_OPERATION_NOTICES.length,
    },
    summary: {
      confirmedRows: validation.confirmedRows.length,
      candidateFacilityPoints: normalizedData.candidateFacilityPoints.length,
      affectedBlocks: normalizedData.affectedBlockIds.length,
      blockerCount: applyPlanBlockers.length,
    },
    blockers: applyPlanBlockers,
    normalizedData,
    nextAction: status === 'ready_for_manual_apply'
      ? 'Review the TS fragment and manually replace only JAMSIL_OPERATOR_FACILITY_POINTS and JAMSIL_BLOCK_VISIT_GUIDANCE.'
      : hasConfirmedRows
        ? 'Provide valid --source-document-id and --last-updated-at before manual application.'
        : 'Keep restroom candidates in review until operatorVerificationStatus=OPERATOR_CONFIRMED rows exist.',
  };
  const fragment = formatRestroomCandidateApplyPlanTsFragment(normalizedData, status);

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.applyPlanJsonPath, `${JSON.stringify(applyPlan, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.applyPlanTsFragmentPath, fragment, 'utf8');
  await fs.writeFile(paths.applyPlanMarkdownPath, [
    '# Jamsil Restroom Candidate Apply Plan',
    '',
    `- status: \`${status}\``,
    `- sourceDataWritePerformed: \`${applyPlan.sourceDataWritePerformed}\``,
    `- target source file: \`${applyPlan.targetSourceFile}\``,
    `- TS fragment: \`${applyPlan.tsFragmentPath}\``,
    `- confirmedRows: \`${applyPlan.summary.confirmedRows}\``,
    `- candidateFacilityPoints: \`${applyPlan.summary.candidateFacilityPoints}\``,
    `- affectedBlocks: \`${applyPlan.summary.affectedBlocks}\``,
    `- operationNoticesUnchanged: \`${applyPlan.operationNoticesUnchanged}\``,
    `- blockerCount: \`${applyPlan.summary.blockerCount}\``,
    `- next action: ${applyPlan.nextAction}`,
    '',
    '## Runtime Exclusions',
    '',
    '- 2011 historical restroom wait-time metrics remain excluded.',
    '- Jamsil Sports Complex exit 5 external approach congestion remains excluded.',
    '- Walking-time, queue, congestion, and daily operation notice gaps remain MANUAL_BASEBALL_DATA_REQUIRED.',
    '',
    ...(applyPlanBlockers.length > 0 ? ['## Blockers', '', ...applyPlanBlockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[jamsil-restroom-candidate-apply-plan] status=${applyPlan.status}`);
  console.log(`[jamsil-restroom-candidate-apply-plan] report=${paths.applyPlanJsonPath}`);
  console.log(`[jamsil-restroom-candidate-apply-plan] fragment=${paths.applyPlanTsFragmentPath}`);
  if (exitOnBlocked && applyPlan.status === 'blocked') {
    process.exit(1);
  }
  return { report: applyPlan, paths };
};

const runFoodCandidateTransfer = async ({ exitOnBlocked = true } = {}) => {
  const { report: validation, paths } = await validateJamsilFoodCandidateReview({ writeReports: true });
  const sourceDocumentId = operatorArgValue('--source-document-id', '');
  const lastUpdatedAt = operatorArgValue('--last-updated-at', '');
  const transferBlockers = validation.status === 'blocked'
    ? validation.blockers.map((blocker) => `FOOD_CANDIDATE_REVIEW:${blocker}`)
    : [];
  const hasConfirmedRows = validation.confirmedRows.length > 0;

  if (hasConfirmedRows) {
    if (!sourceDocumentId) {
      transferBlockers.push('FOOD_TRANSFER_MISSING_SOURCE_DOCUMENT_ID:--source-document-id is required when confirmed rows exist');
    } else if (!JAMSIL_OPERATOR_SOURCE_ID_PATTERN.test(sourceDocumentId)) {
      transferBlockers.push('FOOD_TRANSFER_INVALID_SOURCE_DOCUMENT_ID:--source-document-id must match jamsil-operator-YYYYMMDD-*');
    }

    if (!lastUpdatedAt) {
      transferBlockers.push('FOOD_TRANSFER_MISSING_LAST_UPDATED_AT:--last-updated-at is required when confirmed rows exist');
    } else if (!JAMSIL_OPERATOR_ISO_DATE_PATTERN.test(lastUpdatedAt)) {
      transferBlockers.push('FOOD_TRANSFER_INVALID_LAST_UPDATED_AT:--last-updated-at must be YYYY-MM-DD');
    }
  }

  const status = transferBlockers.length > 0
    ? 'blocked'
    : hasConfirmedRows
      ? 'ready_for_operator_validate'
      : 'waiting_for_operator';
  const rows = status === 'ready_for_operator_validate'
    ? validation.confirmedRows.map((row) => ({
      recordType: 'facility',
      stadium: 'JAMSIL',
      sourceDocumentId,
      lastUpdatedAt,
      pointId: row.operatorFacilityId,
      kind: 'CONCESSION',
      label: row.candidateStoreName,
      floor: row.candidateFloor,
      side: row.candidateSide,
      nearSectionIds: row.operatorNearSectionIds.join(';'),
      locationText: row.operatorLocationText,
      openStatus: row.operatorOpenStatus,
      accessible: row.operatorAccessible,
      walkingMinutes: String(row.operatorWalkingMinutes),
      verificationStatus: 'OPERATOR_CONFIRMED',
      blockId: '',
      recommendedEntrancePointIds: '',
      nearbyFacilityPointIds: '',
      cautionNotes: '',
      noticeId: '',
      validFrom: '',
      validTo: '',
      priority: '',
      teamContext: '',
      affectedBlockIds: '',
      message: '',
    }))
    : [];
  const transfer = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    reviewReportPath: path.relative(frontendRoot, paths.validationJsonPath),
    transferCsvPath: path.relative(frontendRoot, paths.transferCsvPath),
    sourceDocumentId: sourceDocumentId || null,
    lastUpdatedAt: lastUpdatedAt || null,
    summary: {
      confirmedRows: validation.confirmedRows.length,
      transferredRows: rows.length,
      blockerCount: transferBlockers.length,
    },
    blockers: transferBlockers,
    rows,
    nextAction: status === 'ready_for_operator_validate'
      ? `Run operator validation with --input ${path.relative(frontendRoot, paths.transferCsvPath)} and the same --review file.`
      : hasConfirmedRows
        ? 'Provide --source-document-id and --last-updated-at before transferring confirmed rows.'
        : 'Keep candidates in review until operatorVerificationStatus=OPERATOR_CONFIRMED rows exist.',
  };

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.transferJsonPath, `${JSON.stringify(transfer, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.transferCsvPath, `${[
    csvLine(JAMSIL_OPERATOR_REQUIRED_COLUMNS),
    ...rows.map((row) => csvLine(JAMSIL_OPERATOR_REQUIRED_COLUMNS.map((column) => row[column] ?? ''))),
  ].join('\n')}\n`, 'utf8');
  await fs.writeFile(paths.transferMarkdownPath, [
    '# Jamsil Food Candidate Intake Transfer',
    '',
    `- status: \`${status}\``,
    `- sourceDataWritePerformed: \`${transfer.sourceDataWritePerformed}\``,
    `- review report: \`${transfer.reviewReportPath}\``,
    `- transfer CSV: \`${transfer.transferCsvPath}\``,
    `- confirmedRows: \`${transfer.summary.confirmedRows}\``,
    `- transferredRows: \`${transfer.summary.transferredRows}\``,
    `- blockerCount: \`${transfer.summary.blockerCount}\``,
    `- next action: ${transfer.nextAction}`,
    '',
    ...(transferBlockers.length > 0 ? ['## Blockers', '', ...transferBlockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[jamsil-food-candidate-transfer] status=${transfer.status}`);
  console.log(`[jamsil-food-candidate-transfer] report=${paths.transferJsonPath}`);
  console.log(`[jamsil-food-candidate-transfer] csv=${paths.transferCsvPath}`);
  if (exitOnBlocked && transfer.status === 'blocked') {
    process.exit(1);
  }
  return { report: transfer, paths };
};

const runFoodCandidateApplyPlan = async ({ exitOnBlocked = true } = {}) => {
  const { report: validation, paths } = await validateJamsilFoodCandidateReview({ writeReports: true });
  const sourceDocumentId = operatorArgValue('--source-document-id', '');
  const lastUpdatedAt = operatorArgValue('--last-updated-at', '');
  const hasConfirmedRows = validation.confirmedRows.length > 0;
  const applyPlanBlockers = [
    ...(validation.status === 'blocked'
      ? validation.blockers.map((blocker) => `FOOD_CANDIDATE_REVIEW:${blocker}`)
      : []),
    ...validateFoodCandidateSourceArgs({
      sourceDocumentId,
      lastUpdatedAt,
      hasConfirmedRows,
      blockerPrefix: 'FOOD_APPLY',
    }),
  ];
  const {
    JAMSIL_OPERATOR_FACILITY_POINTS,
    JAMSIL_BLOCK_VISIT_GUIDANCE,
    JAMSIL_OPERATION_NOTICES,
  } = await import('../src/data/jamsilOperatorVisitGuide.ts');
  const status = applyPlanBlockers.length > 0
    ? 'blocked'
    : hasConfirmedRows
      ? 'ready_for_manual_apply'
      : 'waiting_for_operator';
  const normalizedData = status === 'ready_for_manual_apply'
    ? mergeFoodCandidateManualApplyData({
      currentFacilityPoints: JAMSIL_OPERATOR_FACILITY_POINTS,
      currentBlockGuidance: JAMSIL_BLOCK_VISIT_GUIDANCE,
      confirmedRows: validation.confirmedRows,
      sourceDocumentId,
      lastUpdatedAt,
    })
    : {
      facilityPoints: [],
      blockGuidance: [],
      candidateFacilityPoints: [],
      affectedBlockIds: [],
    };
  const applyPlan = {
    version: JAMSIL_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    targetSourceFile: 'src/data/jamsilOperatorVisitGuide.ts',
    reviewReportPath: path.relative(frontendRoot, paths.validationJsonPath),
    tsFragmentPath: path.relative(frontendRoot, paths.applyPlanTsFragmentPath),
    sourceDocumentId: sourceDocumentId || null,
    lastUpdatedAt: lastUpdatedAt || null,
    operationNoticesUnchanged: true,
    currentRuntimeSummary: {
      facilityPoints: JAMSIL_OPERATOR_FACILITY_POINTS.length,
      blockGuidance: JAMSIL_BLOCK_VISIT_GUIDANCE.length,
      operationNotices: JAMSIL_OPERATION_NOTICES.length,
    },
    summary: {
      confirmedRows: validation.confirmedRows.length,
      candidateFacilityPoints: normalizedData.candidateFacilityPoints.length,
      affectedBlocks: normalizedData.affectedBlockIds.length,
      blockerCount: applyPlanBlockers.length,
    },
    blockers: applyPlanBlockers,
    normalizedData,
    nextAction: status === 'ready_for_manual_apply'
      ? 'Review the TS fragment and manually replace only JAMSIL_OPERATOR_FACILITY_POINTS and JAMSIL_BLOCK_VISIT_GUIDANCE.'
      : hasConfirmedRows
        ? 'Provide valid --source-document-id and --last-updated-at before manual application.'
        : 'Keep candidates in review until operatorVerificationStatus=OPERATOR_CONFIRMED rows exist.',
  };
  const fragment = formatFoodCandidateApplyPlanTsFragment(normalizedData, status);

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.applyPlanJsonPath, `${JSON.stringify(applyPlan, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.applyPlanTsFragmentPath, fragment, 'utf8');
  await fs.writeFile(paths.applyPlanMarkdownPath, [
    '# Jamsil Food Candidate Apply Plan',
    '',
    `- status: \`${status}\``,
    `- sourceDataWritePerformed: \`${applyPlan.sourceDataWritePerformed}\``,
    `- target source file: \`${applyPlan.targetSourceFile}\``,
    `- TS fragment: \`${applyPlan.tsFragmentPath}\``,
    `- confirmedRows: \`${applyPlan.summary.confirmedRows}\``,
    `- candidateFacilityPoints: \`${applyPlan.summary.candidateFacilityPoints}\``,
    `- affectedBlocks: \`${applyPlan.summary.affectedBlocks}\``,
    `- operationNoticesUnchanged: \`${applyPlan.operationNoticesUnchanged}\``,
    `- blockerCount: \`${applyPlan.summary.blockerCount}\``,
    `- next action: ${applyPlan.nextAction}`,
    '',
    ...(applyPlanBlockers.length > 0 ? ['## Blockers', '', ...applyPlanBlockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[jamsil-food-candidate-apply-plan] status=${applyPlan.status}`);
  console.log(`[jamsil-food-candidate-apply-plan] report=${paths.applyPlanJsonPath}`);
  console.log(`[jamsil-food-candidate-apply-plan] fragment=${paths.applyPlanTsFragmentPath}`);
  if (exitOnBlocked && applyPlan.status === 'blocked') {
    process.exit(1);
  }
  return { report: applyPlan, paths };
};

const approvalArtifactSpecs = (operatorPaths, foodPaths, restroomPaths, fieldSurveyArtifactPaths, { includeRestroom = false } = {}) => [
  ['handoffJson', operatorPaths.handoffJsonPath, 'json'],
  ['handoffMarkdown', operatorPaths.handoffMarkdownPath, 'text'],
  ['operatorValidationJson', operatorPaths.validationJsonPath, 'json'],
  ['operatorApplyPlanJson', operatorPaths.applyPlanJsonPath, 'json'],
  ['foodCandidateReviewJson', foodPaths.validationJsonPath, 'json'],
  ['foodCandidateTransferCsv', foodPaths.transferCsvPath, 'text'],
  ['foodCandidateApplyPlanJson', foodPaths.applyPlanJsonPath, 'statusJson'],
  ['foodCandidateApplyPlanTsFragment', foodPaths.applyPlanTsFragmentPath, 'text'],
  ['fieldSurveyValidationJson', fieldSurveyArtifactPaths.validationJsonPath, 'json'],
  ['fieldSurveyValidationMarkdown', fieldSurveyArtifactPaths.validationMarkdownPath, 'text'],
  ['fieldSurveyWorksetJson', fieldSurveyArtifactPaths.worksetJsonPath, 'json'],
  ['fieldSurveyWorksetCsv', fieldSurveyArtifactPaths.worksetCsvPath, 'text'],
  ['fieldSurveyWorksetMarkdown', fieldSurveyArtifactPaths.worksetMarkdownPath, 'text'],
  ...(includeRestroom ? [
    ['restroomCandidateReviewJson', restroomPaths.validationJsonPath, 'json'],
    ['restroomCandidateTransferJson', restroomPaths.transferJsonPath, 'json'],
    ['restroomCandidateTransferCsv', restroomPaths.transferCsvPath, 'text'],
    ['restroomCandidateApplyPlanJson', restroomPaths.applyPlanJsonPath, 'statusJson'],
    ['restroomCandidateApplyPlanTsFragment', restroomPaths.applyPlanTsFragmentPath, 'text'],
  ] : []),
];

const buildJamsilOperatorApprovalCurrent = async () => {
  const operatorPaths = operatorGatePaths();
  const foodPaths = foodCandidatePaths();
  const fieldSurveyArtifactPaths = fieldSurveyPaths();
  const restroomValidation = await validateJamsilRestroomCandidateReview({ writeReports: false });
  const restroomPaths = restroomValidation.paths;
  const confirmedRestroomCandidateRows = restroomValidation.report.summary?.confirmedRows ?? 0;
  const includeRestroom = confirmedRestroomCandidateRows > 0;
  const specs = approvalArtifactSpecs(operatorPaths, foodPaths, restroomPaths, fieldSurveyArtifactPaths, { includeRestroom });
  const missingArtifacts = [];
  const artifacts = {};
  const artifactHashes = {};
  const artifactGeneratedAt = {};
  const artifactStatuses = {};

  await Promise.all(specs.map(async ([key, filePath, type]) => {
    if (!(await fileExists(filePath))) {
      missingArtifacts.push(path.relative(frontendRoot, filePath));
      return;
    }

    artifacts[key] = path.relative(frontendRoot, filePath);
    if (type !== 'statusJson') {
      artifactHashes[`${key}Hash`] = await sha256File(filePath);
    }

    if (type === 'json' || type === 'statusJson') {
      const json = await readJsonFile(filePath);
      artifactGeneratedAt[`${key}GeneratedAt`] = json.generatedAt ?? null;
      artifactStatuses[`${key}Status`] = json.status ?? null;
      artifacts[`${key}Data`] = json;
    }
  }));

  if (missingArtifacts.length > 0) {
    return {
      status: 'missing_artifacts',
      operatorPaths,
      foodPaths,
      restroomPaths,
      fieldSurveyPaths: fieldSurveyArtifactPaths,
      missingArtifacts,
      artifacts,
      artifactHashes,
      artifactGeneratedAt,
      artifactStatuses,
      restroomValidation: restroomValidation.report,
      confirmedRestroomCandidateRows,
      includeRestroom,
    };
  }

  const handoff = artifacts.handoffJsonData;
  const operatorValidation = artifacts.operatorValidationJsonData;
  const operatorApplyPlan = artifacts.operatorApplyPlanJsonData;
  const foodReview = artifacts.foodCandidateReviewJsonData;
  const foodApplyPlan = artifacts.foodCandidateApplyPlanJsonData;
  const fieldSurveyValidation = artifacts.fieldSurveyValidationJsonData;
  const fieldSurveyWorkset = artifacts.fieldSurveyWorksetJsonData;
  const restroomReview = includeRestroom ? artifacts.restroomCandidateReviewJsonData : restroomValidation.report;
  const restroomApplyPlan = includeRestroom ? artifacts.restroomCandidateApplyPlanJsonData : null;
  const blockers = [
    ...(handoff.status === 'blocked' ? ['HANDOFF_BLOCKED'] : []),
    ...(operatorValidation.status === 'blocked' ? ['OPERATOR_VALIDATION_BLOCKED'] : []),
    ...(operatorApplyPlan.status === 'blocked' ? ['OPERATOR_APPLY_PLAN_BLOCKED'] : []),
    ...(foodReview.status === 'blocked' ? ['FOOD_REVIEW_BLOCKED'] : []),
    ...(foodApplyPlan.status === 'blocked' ? ['FOOD_APPLY_PLAN_BLOCKED'] : []),
    ...(fieldSurveyValidation.status === 'blocked' ? ['FIELD_SURVEY_VALIDATION_BLOCKED'] : []),
    ...(fieldSurveyWorkset.status === 'blocked' ? ['FIELD_SURVEY_WORKSET_BLOCKED'] : []),
    ...(restroomReview.status === 'blocked' ? ['RESTROOM_REVIEW_BLOCKED'] : []),
    ...(includeRestroom && artifacts.restroomCandidateTransferJsonData?.status !== 'ready_for_operator_validate'
      ? [`RESTROOM_TRANSFER_NOT_READY:${artifacts.restroomCandidateTransferJsonData?.status ?? 'missing'}`]
      : []),
    ...(includeRestroom && artifacts.restroomCandidateApplyPlanJsonData?.status !== 'ready_for_manual_apply'
      ? [`RESTROOM_APPLY_PLAN_NOT_READY:${artifacts.restroomCandidateApplyPlanJsonData?.status ?? 'missing'}`]
      : []),
  ];
  const confirmedFoodCandidateRows = foodReview.summary?.confirmedRows ?? 0;
  const readyForApproval = blockers.length === 0
    && confirmedFoodCandidateRows > 0
    && handoff.status === 'ready_for_manual_apply'
    && operatorValidation.status === 'ready_for_manual_apply'
    && operatorApplyPlan.status === 'ready_for_manual_apply'
    && foodReview.status === 'ready_for_operator_intake_transfer'
    && foodApplyPlan.status === 'ready_for_manual_apply'
    && (!includeRestroom || (
      restroomReview.status !== 'blocked'
      && artifacts.restroomCandidateTransferJsonData.status === 'ready_for_operator_validate'
      && restroomApplyPlan.status === 'ready_for_manual_apply'
    ));

  return {
    status: blockers.length > 0
      ? 'blocked'
      : readyForApproval
        ? 'ready_for_approval'
        : 'waiting_for_operator',
    operatorPaths,
    foodPaths,
    restroomPaths,
    fieldSurveyPaths: fieldSurveyArtifactPaths,
    missingArtifacts,
    artifacts,
    artifactHashes,
    artifactGeneratedAt,
    artifactStatuses,
    blockers,
    confirmedFoodCandidateRows,
    confirmedRestroomCandidateRows,
    fieldSurveyStatus: fieldSurveyValidation.status,
    fieldSurveyWorksetStatus: fieldSurveyWorkset.status,
    fieldSurveyCompletedRows: fieldSurveyValidation.summary?.completedRows ?? 0,
    fieldSurveyReadyRows: fieldSurveyWorkset.summary?.readyRows ?? 0,
    restroomValidationStatus: restroomValidation.report.status,
    includeRestroom,
    readyForApproval,
  };
};

const approvalMatchesCurrentArtifacts = (approval, current) => (
  Object.entries(current.artifactHashes ?? {}).every(([key, value]) => approval[key] === value)
);

const writeJamsilOperatorApprovalMarkdown = async (approval, markdownPath) => {
  await fs.writeFile(markdownPath, [
    '# Jamsil Operator Visit Guide Approval',
    '',
    `- status: \`${approval.status}\``,
    `- sourceDataWritePerformed: \`${approval.sourceDataWritePerformed}\``,
    `- generatedAt: \`${approval.generatedAt}\``,
    `- approvedBy: \`${approval.approvedBy ?? ''}\``,
    `- approvedAt: \`${approval.approvedAt ?? ''}\``,
    `- confirmedFoodCandidateRows: \`${approval.confirmedFoodCandidateRows ?? 0}\``,
    `- confirmedRestroomCandidateRows: \`${approval.confirmedRestroomCandidateRows ?? 0}\``,
    `- fieldSurveyStatus: \`${approval.fieldSurveyStatus ?? ''}\``,
    `- fieldSurveyWorksetStatus: \`${approval.fieldSurveyWorksetStatus ?? ''}\``,
    `- fieldSurveyCompletedRows: \`${approval.fieldSurveyCompletedRows ?? 0}\``,
    `- notes: ${approval.notes || '-'}`,
    '',
    '## Artifacts',
    '',
    ...Object.entries(approval.artifacts ?? {}).map(([key, value]) => `- ${key}: \`${value}\``),
    '',
    ...(approval.blockers?.length > 0 ? ['## Blockers', '', ...approval.blockers.map((blocker) => `- ${blocker}`), ''] : []),
    ...(approval.reviewChecklist?.length > 0 ? ['## Review Checklist', '', ...approval.reviewChecklist.map((item) => `- [ ] ${item}`), ''] : []),
  ].join('\n'), 'utf8');
};

const buildJamsilOperatorApprovalSnapshot = ({ current, status, now, approvedBy = null, approvedAt = null, notes = '' }) => ({
  version: JAMSIL_OPERATOR_GATE_VERSION,
  status,
  generatedAt: now,
  sourceDataWritePerformed: false,
  approvedBy,
  approvedAt,
  notes,
  confirmedFoodCandidateRows: current.confirmedFoodCandidateRows ?? 0,
  fieldSurveyStatus: current.fieldSurveyStatus ?? null,
  fieldSurveyWorksetStatus: current.fieldSurveyWorksetStatus ?? null,
  fieldSurveyCompletedRows: current.fieldSurveyCompletedRows ?? 0,
  fieldSurveyReadyRows: current.fieldSurveyReadyRows ?? 0,
  artifacts: Object.fromEntries(Object.entries(current.artifacts ?? {}).filter(([key]) => !key.endsWith('Data'))),
  artifactStatuses: current.artifactStatuses ?? {},
  artifactGeneratedAt: current.artifactGeneratedAt ?? {},
  blockers: current.blockers ?? [],
  reviewChecklist: [
    'food candidate review confirmed rows match the operator source document',
    'food candidate apply-plan fragment changes only facility and block guidance arrays',
    'restroom candidate apply-plan fragment changes only facility and block guidance arrays when confirmed restroom rows exist',
    'field survey 109-block workset is reviewed and UNKNOWN walking/congestion values are not treated as measured data',
    'operatorNearSectionIds are operator-confirmed and not inferred from seat positions',
    'MANUAL_BASEBALL_DATA_REQUIRED remains for measured walking time, concrete congestion, and daily operation notice gaps',
  ],
  confirmedRestroomCandidateRows: current.confirmedRestroomCandidateRows ?? 0,
  includeRestroomArtifacts: current.includeRestroom ?? false,
  ...current.artifactHashes,
});

const runOperatorApproval = async ({ exitOnBlocked = true } = {}) => {
  const operatorPaths = operatorGatePaths();
  const approve = operatorHasFlag('--approve');
  const statusOnly = operatorHasFlag('--status');
  const requireApproved = operatorHasFlag('--require-approved') || operatorHasFlag('--verify');
  const approvedBy = operatorArgValue('--approved-by', '').trim();
  const notes = operatorArgValue('--notes', '');
  const now = new Date().toISOString();
  const current = await buildJamsilOperatorApprovalCurrent();

  if (current.status === 'missing_artifacts') {
    throw new Error(`MISSING_OPERATOR_APPROVAL_ARTIFACTS:${current.missingArtifacts.join(',')}`);
  }
  if (current.status === 'blocked') {
    throw new Error(`BLOCKED_OPERATOR_APPROVAL_ARTIFACTS:${current.blockers.join(',')}`);
  }

  let existingApproval = null;
  if (await fileExists(operatorPaths.approvalJsonPath)) {
    existingApproval = await readJsonFile(operatorPaths.approvalJsonPath);
    if (!JAMSIL_OPERATOR_APPROVAL_STATUSES.has(existingApproval.status)) {
      throw new Error(`UNKNOWN_OPERATOR_APPROVAL_STATUS:${existingApproval.status}`);
    }
  }

  if (current.status === 'waiting_for_operator') {
    const waitingApproval = buildJamsilOperatorApprovalSnapshot({
      current,
      status: 'WAITING_FOR_OPERATOR',
      now,
    });
    if (!statusOnly) {
      await fs.mkdir(path.dirname(operatorPaths.approvalJsonPath), { recursive: true });
      await fs.writeFile(operatorPaths.approvalJsonPath, `${JSON.stringify(waitingApproval, null, 2)}\n`, 'utf8');
      await writeJamsilOperatorApprovalMarkdown(waitingApproval, operatorPaths.approvalMarkdownPath);
    }
    console.log(`[jamsil-operator-approval] status=${waitingApproval.status}`);
    console.log(`[jamsil-operator-approval] report=${operatorPaths.approvalJsonPath}`);
    if ((approve || requireApproved) && exitOnBlocked) {
      process.exit(1);
    }
    return { report: waitingApproval, paths: operatorPaths };
  }

  if (approve && !approvedBy) {
    throw new Error('--approve requires --approved-by');
  }

  if (approve) {
    const approval = buildJamsilOperatorApprovalSnapshot({
      current,
      status: 'APPROVED',
      now,
      approvedBy,
      approvedAt: now,
      notes,
    });
    await fs.mkdir(path.dirname(operatorPaths.approvalJsonPath), { recursive: true });
    await fs.writeFile(operatorPaths.approvalJsonPath, `${JSON.stringify(approval, null, 2)}\n`, 'utf8');
    await writeJamsilOperatorApprovalMarkdown(approval, operatorPaths.approvalMarkdownPath);
    console.log(`[jamsil-operator-approval] status=${approval.status}`);
    console.log(`[jamsil-operator-approval] report=${operatorPaths.approvalJsonPath}`);
    return { report: approval, paths: operatorPaths };
  }

  if (existingApproval?.status === 'APPROVED' && !approvalMatchesCurrentArtifacts(existingApproval, current)) {
    const staleApproval = {
      ...existingApproval,
      status: 'STALE_APPROVAL',
      staleReason: 'approved operator handoff hash does not match current artifacts',
      staleDetectedAt: now,
      currentArtifactHashes: current.artifactHashes,
    };
    if (!statusOnly) {
      await fs.writeFile(operatorPaths.approvalJsonPath, `${JSON.stringify(staleApproval, null, 2)}\n`, 'utf8');
      await writeJamsilOperatorApprovalMarkdown(staleApproval, operatorPaths.approvalMarkdownPath);
    }
    console.log(`[jamsil-operator-approval] status=${staleApproval.status}`);
    console.log(`[jamsil-operator-approval] report=${operatorPaths.approvalJsonPath}`);
    if (exitOnBlocked && !statusOnly) {
      process.exit(1);
    }
    return { report: staleApproval, paths: operatorPaths };
  }

  if (requireApproved) {
    if (!existingApproval) {
      throw new Error('APPROVED operator approval required; approval file is missing');
    }
    if (existingApproval.status !== 'APPROVED') {
      throw new Error(`APPROVED operator approval required; current status is ${existingApproval.status}`);
    }
    console.log(`[jamsil-operator-approval] status=${existingApproval.status}`);
    console.log(`[jamsil-operator-approval] report=${operatorPaths.approvalJsonPath}`);
    return { report: existingApproval, paths: operatorPaths };
  }

  const pendingApproval = existingApproval?.status === 'APPROVED'
    ? existingApproval
    : buildJamsilOperatorApprovalSnapshot({
      current,
      status: 'PENDING_OPERATOR_APPROVAL',
      now,
    });
  if (!statusOnly) {
    await fs.mkdir(path.dirname(operatorPaths.approvalJsonPath), { recursive: true });
    await fs.writeFile(operatorPaths.approvalJsonPath, `${JSON.stringify(pendingApproval, null, 2)}\n`, 'utf8');
    await writeJamsilOperatorApprovalMarkdown(pendingApproval, operatorPaths.approvalMarkdownPath);
  }
  console.log(`[jamsil-operator-approval] status=${pendingApproval.status}`);
  console.log(`[jamsil-operator-approval] report=${operatorPaths.approvalJsonPath}`);
  console.log(`[jamsil-operator-approval] hashMatches=${existingApproval ? approvalMatchesCurrentArtifacts(existingApproval, current) : true}`);
  return { report: pendingApproval, paths: operatorPaths };
};

const TASKS = {
  'field-survey-validate': runFieldSurveyValidate,
  'field-survey-workset': runFieldSurveyWorkset,
  'food-candidate-apply-plan': runFoodCandidateApplyPlan,
  'food-candidate-review-workset': runFoodCandidateReviewWorkset,
  'food-candidate-validate': runFoodCandidateValidate,
  'food-candidate-transfer': runFoodCandidateTransfer,
  'restroom-candidate-apply-plan': runRestroomCandidateApplyPlan,
  'restroom-candidate-review-workset': runRestroomCandidateReviewWorkset,
  'restroom-candidate-transfer': runRestroomCandidateTransfer,
  'restroom-candidate-validate': runRestroomCandidateValidate,
  'operator-approval': runOperatorApproval,
  'operator-template': runOperatorTemplate,
  'operator-validate': runOperatorValidate,
  'operator-apply-plan': runOperatorApplyPlan,
  'operator-handoff': runOperatorHandoff,
  'operator-intake': runOperatorIntake,
  'release-gate': runReleaseGate,
};

const [, , task, ...rest] = process.argv;
const runner = TASKS[task];
if (!runner) {
  console.error(`Unknown task: ${task}. Available: ${Object.keys(TASKS).join(', ')}`);
  process.exit(1);
}
runner(rest);
