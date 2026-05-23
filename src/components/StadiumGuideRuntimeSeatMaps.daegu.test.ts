import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('대구 visual match gate는 클릭 smoke와 실제 이미지 정밀도 통과를 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const visualMatchAuditSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const renderSafetyAuditSource = readProjectFile('scripts/daegu-seatmap-render-safety-audit.mjs');
  const stadiumUxAuditSource = readProjectFile('scripts/stadium-ux-audit.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-audit": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-audit"'));

  [
    'DAEGU_SEATMAP_VISUAL_MATCH_AUDIT_V1',
    'PASS_WORKFLOW',
    'PASS_UI_CONTAINMENT',
    'PASS_CLICKABLE_CURRENT',
    'PASS_VISUAL_MATCH',
    'PASS_RELEASE_177',
    'visualMatchReady',
    'visual precision incomplete: visible official rows still have crop-overlay review flags; click/render smoke does not prove official PNG boundary alignment.',
    'REVIEW_ONLY_VISUAL_MATCH_BLOCKER',
    'FLOATING_OR_OFF_SEAT_VISUAL_REVIEW',
    'LOW_SEAT_COLOR_COVERAGE',
    'LABEL_OUTSIDE_VISUAL_PATH',
    'OFFICIAL_IMAGE_SHA256_MISMATCH',
    'daegu-visual-match-audit',
    'rowSvgDir',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
    'This audit does not modify `src/data/daeguSeatData.ts`.',
  ].forEach((requiredText) => {
    assert.ok(visualMatchAuditSource.includes(requiredText), `visual match audit should include ${requiredText}`);
  });

  [
    'PASS_CLICKABLE_CURRENT',
    'PASS_VISUAL_MATCH',
    "const VISUAL_MATCH_PASS_LEVEL = 'PASS_VISUAL_MATCH';",
  ].forEach((requiredText) => {
    assert.ok(renderSafetyAuditSource.includes(requiredText), `render safety audit should include ${requiredText}`);
  });

  [
    'daegu-normal-seatmap-',
    'daegu-debug-overlay-',
    'click/render smoke only; not official PNG visual precision proof',
    'normalReviewOnlyAbsent',
    'debugReviewOnlyPointerDisabled',
    "expectedViewBox: '0 0 1707 2048'",
    'Daegu normal mode must not render review-only block MR-9 as a selectable seat',
    'Daegu debug mode must keep review-only block MR-9 in the review-only overlay',
    'Daegu normal screenshot must not render review-only polygons',
    'Daegu debug review overlay must be pointer-disabled and non-clickable',
  ].forEach((requiredText) => {
    assert.ok(stadiumUxAuditSource.includes(requiredText), `Daegu QA audit should include ${requiredText}`);
  });
});

test('대구 missing block discovery는 공식 PNG 컴포넌트 기준으로 누락 후보를 분류하고 production write를 막는다', () => {
  const packageSource = readProjectFile('package.json');
  const missingBlockDiscoverySource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-discovery"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-discovery'));

  [
    'DAEGU_MISSING_BLOCK_DISCOVERY_V1',
    'OFFICIAL_PNG_SEAT_COMPONENT_SCAN',
    'UNMATCHED_COMPONENT_NO_DATA_ROW',
    'REVIEW_ONLY_COMPONENT_HIDDEN_FROM_NORMAL_UI',
    'LOW_NORMAL_COVERAGE_COMPONENT',
    'DUPLICATE_CURRENT_PATH_OR_SHARED_OWNER',
    'COVERED_BY_NORMAL_UI',
    'LEGEND_OR_MARKER_EXCLUDED',
    'component-to-seat-data',
    'OCR is not used here',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
    'Official PNG pixel scan only',
    'daegu-missing-block-discovery',
  ].forEach((requiredText) => {
    assert.ok(missingBlockDiscoverySource.includes(requiredText), `missing block discovery should include ${requiredText}`);
  });
});

test('대구 missing block P1 coordinate candidates는 P0를 제외한 이미지 후보만 만들고 production write를 막는다', () => {
  const packageSource = readProjectFile('package.json');
  const p1CoordinateCandidatesSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-coordinate-candidates"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-coordinate-candidates'));

  [
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_CANDIDATES_V1',
    'DAEGU_MISSING_BLOCK_DISCOVERY_V1',
    'DAEGU_MISSING_BLOCK_P0_COORDINATE_ANALYSIS_V1',
    'OFFICIAL_PNG_PIXEL_SCAN_P1_COORDINATE_CANDIDATE',
    'IMAGE_DERIVED_CANDIDATE_NOT_OPERATOR_APPROVED',
    'P1_COORDINATE_CANDIDATES_READ_ONLY',
    'P0 components are excluded so their approval flow remains isolated.',
    'operatorDecision stays outside this report; this script never sets APPROVED or writes production data.',
    'No automatic coordinate promotion is allowed.',
    'P1_UNMATCHED_OFFICIAL_COMPONENT',
    'P1_REVIEW_ONLY_RETRACE',
    'P1_LOW_COVERAGE_RETRACE',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'Operator must confirm whether this official component is a missing seat block',
    'Operator must map this candidate to the existing row',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p1CoordinateCandidatesSource.includes(requiredText), `P1 coordinate candidates should include ${requiredText}`);
  });
});

test('대구 missing block P1 approval packet/gate는 duplicate shared 후보를 승인 전 dry-run only로 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const p1ApprovalPacketSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p1ApprovalGateSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p1ReviewBoardSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p1OperatorInputGuideSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-approval-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-approval-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-approval-gate:require-approved"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-review-board"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-operator-input-guide"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-operator-input-guide:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-approval-packet'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-approval-gate'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-review-board'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-operator-input-guide'));

  [
    'DAEGU_MISSING_BLOCK_P1_APPROVAL_PACKET_V1',
    'DAEGU_MISSING_BLOCK_P1_APPROVAL_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_CANDIDATES_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'APPROVED_OR_REJECTED_WITH_CORRECTED_TARGET_OWNERSHIP',
    'P1_DUPLICATE_SHARED_OWNERSHIP_REQUIRES_OPERATOR_TARGET_SELECTION',
    'Choose one target owner for this official PNG component',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'Automated scripts must not fill operatorDecision, reviewer, or reviewedAt.',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p1ApprovalPacketSource.includes(requiredText), `P1 approval packet should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P1_APPROVAL_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_DRY_RUN_APPLY_PLAN_V1',
    'DAEGU_MISSING_BLOCK_P1_APPROVAL_PACKET_V1',
    'DAEGU_MISSING_BLOCK_P1_APPROVAL_INPUT_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'TARGET_BLOCK_NOT_IN_SUGGESTED_OWNERS',
    'CORRECTED_PATH_REQUIRED',
    'CORRECTED_LABEL_NOT_ON_CORRECTED_PATH',
    'REVIEWER_REQUIRED',
    'REVIEWED_AT_REQUIRED',
    'waiting-for-p1-operator-approval',
    'p1-approved-dry-run-plan-ready',
    'UPDATE_EXISTING_DAEGU_BLOCK_GEOMETRY_AFTER_P1_APPROVAL',
    'daegu-missing-block-p1-operator-approved-v1',
    'readyForProductionWrite: false',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p1ApprovalGateSource.includes(requiredText), `P1 approval gate should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P1_REVIEW_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P1_APPROVAL_PACKET_V1',
    'DAEGU_MISSING_BLOCK_P1_APPROVAL_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_APPROVAL_INPUT_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'ONE_OFFICIAL_COMPONENT_MUST_MAP_TO_ONE_BLOCK_SPECIFIC_TARGET',
    'PENDING_OPERATOR_TARGET_SELECTION',
    'visualIndexPng',
    'This board is visual evidence only.',
    'It does not fill `operatorDecision`, `reviewer`, or `reviewedAt`.',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p1ReviewBoardSource.includes(requiredText), `P1 review board should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P1_OPERATOR_INPUT_GUIDE_V1',
    'DAEGU_MISSING_BLOCK_P1_REVIEW_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P1_APPROVAL_PACKET_V1',
    'DAEGU_MISSING_BLOCK_P1_APPROVAL_INPUT_V1',
    'APPROVED_OR_REJECTED_WITH_CORRECTED_TARGET_OWNERSHIP',
    'IMAGE_DERIVED_CANDIDATE_NOT_OPERATOR_APPROVED',
    'Automated scripts must not fill operatorDecision, reviewer, or reviewedAt.',
    'Do not approve a shared component for multiple blocks.',
    'copyableSuggestedUpdate',
    'rows[${row.rowIndex}]',
    'npm run stadium:daegu:missing-block-p1-approval-gate',
    'p1-operator-input-guide-ready-with-pending-rows',
    'p1-operator-input-guide-ready-all-input-complete',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p1OperatorInputGuideSource.includes(requiredText), `P1 operator input guide should include ${requiredText}`);
  });
});

test('대구 missing block P1 retrace review pack은 review-only/low-coverage 후보를 operator 승인 전 dry-run only로 묶는다', () => {
  const packageSource = readProjectFile('package.json');
  const p1RetraceReviewPackSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-retrace-review-pack"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-retrace-review-pack:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-retrace-review-pack:require-approved"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-retrace-review-pack'));

  [
    'DAEGU_MISSING_BLOCK_P1_RETRACE_REVIEW_PACK_V1',
    'DAEGU_MISSING_BLOCK_P1_RETRACE_APPROVAL_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P1_RETRACE_APPROVAL_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_RETRACE_DRY_RUN_APPLY_PLAN_V1',
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_CANDIDATES_V1',
    'P1_REVIEW_ONLY_RETRACE',
    'P1_LOW_COVERAGE_RETRACE',
    'APPROVED_OR_REJECTED_WITH_OPERATOR_CORRECTED_RETRACE',
    'EXPECTED_RETRACE_ROWS = 26',
    'IMAGE_DERIVED_CANDIDATE_NOT_OPERATOR_APPROVED',
    'Automated scripts must not fill operatorDecision, reviewer, or reviewedAt.',
    'Existing operator input values are preserved',
    'TARGET_BLOCK_NOT_IN_SUGGESTED_RETRACE_OWNERS',
    'CORRECTED_PATH_REQUIRED',
    'CORRECTED_LABEL_NOT_ON_CORRECTED_PATH',
    'MULTIPLE_APPROVED_COMPONENTS_FOR_TARGET_REQUIRES_OPERATOR_MERGE',
    'APPROVED_VALID',
    'APPROVED_BLOCKED',
    'REJECTED_VALID',
    'REJECTED_BLOCKED',
    'UNKNOWN_DECISION_BLOCKED',
    'MISSING_REJECTED_FIELD:rejectionReason',
    'rejectionReason',
    'approvedDiffBoardPng',
    'daegu-seatmap-missing-block-p1-retrace-approved-diff-board.png',
    'dryRunChecklist',
    'buildApprovedDiffBoardSvg',
    'Operator Input States',
    'UPDATE_EXISTING_DAEGU_BLOCK_GEOMETRY_AFTER_P1_RETRACE_APPROVAL',
    'daegu-missing-block-p1-retrace-operator-approved-v1',
    'waiting-for-p1-retrace-operator-approval',
    'p1-retrace-approved-dry-run-plan-ready',
    'p1-retrace-operator-input-guide-ready-with-pending-rows',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p1RetraceReviewPackSource.includes(requiredText), `P1 retrace review pack should include ${requiredText}`);
  });
});

test('대구 missing block P1 unmatched decision pack은 owner 없는 공식 component를 신규/기존/비좌석 결정으로 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const p1UnmatchedDecisionPackSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-unmatched-decision-pack"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-unmatched-decision-pack:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-unmatched-decision-pack:require-approved"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-unmatched-decision-pack'));

  [
    'DAEGU_MISSING_BLOCK_P1_UNMATCHED_DECISION_PACK_V1',
    'DAEGU_MISSING_BLOCK_P1_UNMATCHED_DECISION_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P1_UNMATCHED_DECISION_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_UNMATCHED_DRY_RUN_APPLY_PLAN_V1',
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_CANDIDATES_V1',
    'P1_UNMATCHED_OFFICIAL_COMPONENT',
    'EXPECTED_UNMATCHED_ROWS = 24',
    'APPROVED_EXISTING_BLOCK_RETRACE',
    'APPROVED_NEW_SEAT_BLOCK',
    'REJECTED_NON_SEAT_FRAGMENT',
    'REJECTED_MARKER_OR_FACILITY',
    'REJECTED_LABEL_OR_TEXT_FRAGMENT',
    'NO_OWNER_CANDIDATE_AUTOMATIC_MAPPING_FORBIDDEN',
    'Automated scripts must not fill operatorDecision, reviewer, reviewedAt, or new section metadata.',
    'APPROVED_EXISTING_VALID',
    'APPROVED_NEW_VALID',
    'APPROVED_BLOCKED',
    'REJECTED_VALID',
    'REJECTED_BLOCKED',
    'UNKNOWN_DECISION_BLOCKED',
    'MISSING_REJECTED_FIELD:rejectionReason',
    'rejectionReason',
    'approvedEvidenceBoardPng',
    'daegu-seatmap-missing-block-p1-unmatched-approved-evidence-board.png',
    'dryRunChecklist',
    'buildApprovedEvidenceBoardSvg',
    'Operator Input States',
    'TARGET_BLOCK_NOT_IN_NEAREST_UNMATCHED_CANDIDATES',
    'NEW_SECTION_ID_REQUIRED',
    'NEW_SECTION_NAME_REQUIRED',
    'NEW_SEAT_CATEGORY_REQUIRED',
    'REJECTION_OPERATOR_NOTES_REQUIRED',
    'CREATE_NEW_DAEGU_SEAT_BLOCK_AFTER_UNMATCHED_APPROVAL',
    'UPDATE_EXISTING_DAEGU_BLOCK_GEOMETRY_AFTER_UNMATCHED_APPROVAL',
    'daegu-missing-block-p1-unmatched-operator-approved-v1',
    'waiting-for-p1-unmatched-operator-decision',
    'p1-unmatched-decision-dry-run-plan-ready',
    'p1-unmatched-operator-input-guide-ready-with-pending-rows',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p1UnmatchedDecisionPackSource.includes(requiredText), `P1 unmatched decision pack should include ${requiredText}`);
  });
});

test('대구 missing block P1 status board는 세 P1 흐름을 통합하고 production write를 막는다', () => {
  const packageSource = readProjectFile('package.json');
  const p1StatusBoardSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-status-board"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-status-board:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-status-board:require-approved"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-status-board'));

  [
    'DAEGU_MISSING_BLOCK_P1_STATUS_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P1_READINESS_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_INTEGRATED_DRY_RUN_APPLY_PLAN_V1',
    'Integrated P1 status board must not fill operatorDecision, reviewer, reviewedAt, correctedPath, or new section metadata.',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'P1_RETRACE_REVIEW',
    'P1_UNMATCHED_OFFICIAL_COMPONENT',
    'expectedRows: 9',
    'expectedRows: 26',
    'expectedRows: 24',
    'INTEGRATED_DUPLICATE_DRY_RUN_TARGET',
    'INTEGRATED_DUPLICATE_SOURCE_COMPONENT',
    'waiting-for-p1-operator-approvals',
    'p1-integrated-dry-run-plan-ready',
    'p1-status-board-ready',
    'readyForProductionWrite: false',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p1StatusBoardSource.includes(requiredText), `P1 status board should include ${requiredText}`);
  });
});

test('대구 missing block P1 coordinate review board는 59개 후보에 우선순위와 nextAction을 부여한다', () => {
  const packageSource = readProjectFile('package.json');
  const p1CoordinateReviewBoardSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-coordinate-review-board"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-coordinate-review-board:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-coordinate-review-board'));

  [
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_REVIEW_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P1_OPERATOR_ACTION_MATRIX_V1',
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_REVIEW_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_INPUT_WORKSHEET_V1',
    'OFFICIAL_PNG_PIXEL_SCAN_P1_COORDINATE_CANDIDATE',
    'IMAGE_DERIVED_CANDIDATE_NOT_OPERATOR_APPROVED',
    'P1 coordinate review board must not fill operatorDecision, correctedPath, reviewer, reviewedAt, or write src/data/daeguSeatData.ts.',
    'Coordinate input worksheet is evidence-only. Operators must type decisions and final corrected geometry manually.',
    'RESOLVE_SHARED_COMPONENT_OWNER_AND_APPROVE_RETRACE',
    'APPROVE_RETRACE_OR_KEEP_REVIEW_ONLY',
    'DECIDE_COMPONENT_KIND_AND_TARGET',
    '1_duplicate_shared_first',
    '2_retrace_review_second',
    '3_unmatched_decision_third',
    'operatorRequiredFields',
    'currentGeometrySnapshots',
    'ownerCandidateSnapshots',
    'nearestBlockSnapshots',
    'manualCoordinateEntry',
    'copyableCoordinateUpdate',
    'coordinateInputWorksheet',
    'daegu-seatmap-missing-block-p1-coordinate-input-worksheet.json',
    'draftVisualPath',
    'draftLabelPoint',
    'draftGeometrySnapshot',
    'draftReason',
    'readyForOperatorReview',
    'readyForProductionWrite: false',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'src/data/daeguSeatData.ts',
  ].forEach((requiredText) => {
    assert.ok(
      p1CoordinateReviewBoardSource.includes(requiredText),
      `P1 coordinate review board should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 coordinate input preflight는 worksheet 입력 가능성을 flow별로 검증한다', () => {
  const packageSource = readProjectFile('package.json');
  const p1CoordinateInputPreflightSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-coordinate-input-preflight"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-coordinate-input-preflight:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-coordinate-input-preflight'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-coordinate-input-preflight:require-ready'));

  [
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_INPUT_PREFLIGHT_V1',
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_INPUT_WORKSHEET_V1',
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_REVIEW_BOARD_V1',
    'OFFICIAL_PNG_PIXEL_SCAN_P1_COORDINATE_CANDIDATE',
    'IMAGE_DERIVED_CANDIDATE_NOT_OPERATOR_APPROVED',
    'P1 coordinate input preflight must not fill operatorDecision, correctedPath, reviewer, reviewedAt, or write src/data/daeguSeatData.ts.',
    'Preflight validates worksheet shape only. Operator approval must remain manual and downstream gates remain authoritative.',
    'P1_DUPLICATE_SHARED_OWNERSHIP: 9',
    'P1_RETRACE_REVIEW: 26',
    'P1_UNMATCHED_OFFICIAL_COMPONENT: 24',
    'requiredEditPaths',
    'requiredManualFields',
    'requiredDecisionTokens',
    'readyForManualEntry',
    'missingWorksheetFields',
    'missingDraftFields',
    'invalidFieldMapping',
    'missingManualEntryFields',
    'invalidCopyableTemplate',
    'copyableCoordinateUpdate',
    'INVALID_COPYABLE_TEMPLATE',
    'MISSING_OPERATOR_DECISION_TOKEN',
    'daegu-seatmap-missing-block-p1-coordinate-input-preflight.json',
    'p1-coordinate-input-preflight-ready',
    'readyForOperatorEntry',
    'readyForProductionWrite: false',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'src/data/daeguSeatData.ts',
  ].forEach((requiredText) => {
    assert.ok(
      p1CoordinateInputPreflightSource.includes(requiredText),
      `P1 coordinate input preflight should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate handoff는 shared 후보 9개만 operator 승인 대상으로 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const p1DuplicateHandoffSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-handoff"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-handoff:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-handoff:require-approved"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-handoff'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_HANDOFF_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_HANDOFF_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_HANDOFF_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_HANDOFF_DRY_RUN_PLAN_V1',
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_REVIEW_BOARD_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    '1_duplicate_shared_first',
    'EXPECTED_ROWS = 9',
    'Duplicate/shared P1 handoff must not fill operatorDecision, selectedTargetBlockId, correctedPath, reviewer, reviewedAt, or write src/data/daeguSeatData.ts.',
    'selectedTargetBlockId',
    'selectedTargetBlock',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'SELECTED_TARGET_NOT_IN_ALLOWED_OWNER_CANDIDATES',
    'DUPLICATE_APPROVED_SOURCE_COMPONENT',
    'DUPLICATE_APPROVED_TARGET_BLOCK',
    'daegu-seatmap-missing-block-p1-duplicate-handoff-comparison-board.png',
    'daegu-seatmap-missing-block-p1-duplicate-handoff-approved-diff-board.png',
    'comparisonBoardPng',
    'approvedDiffBoardPng',
    'official PNG crop + cyan draft component + dashed current target paths',
    'APPROVED_VALID',
    'APPROVED_BLOCKED',
    'REJECTED_VALID',
    'REJECTED_BLOCKED',
    'UNKNOWN_DECISION_BLOCKED',
    'rejectionReason',
    'Operator Input States',
    'currentGeometrySnapshot',
    'approvalEvidence',
    'manualApplyPolicy',
    'dryRunChecklist',
    'Operator-approved dry-run rows include currentGeometrySnapshot and approvalEvidence',
    'waiting-for-operator-approval',
    'ready-for-manual-production-apply',
    'readyForProductionWrite: false',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'src/data/daeguSeatData.ts',
  ].forEach((requiredText) => {
    assert.ok(
      p1DuplicateHandoffSource.includes(requiredText),
      `P1 duplicate handoff should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate handoff smoke는 승인 lifecycle과 오류 케이스를 격리 검증한다', () => {
  const packageSource = readProjectFile('package.json');
  const p1DuplicateHandoffSmokeSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-handoff-smoke"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-handoff-smoke'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_HANDOFF_SMOKE_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_HANDOFF_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_HANDOFF_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_HANDOFF_DRY_RUN_PLAN_V1',
    'SMOKE_TEST_OPERATOR',
    'Duplicate handoff smoke uses isolated fixture output only and must not overwrite the real operator input or src/data/daeguSeatData.ts.',
    'valid-one-approved-row',
    'duplicate-source-component-blocked',
    'duplicate-target-blocked',
    'invalid-target-blocked',
    'invalid-label-blocked',
    'rejected-without-reason-blocked',
    'DUPLICATE_APPROVED_SOURCE_COMPONENT',
    'DUPLICATE_APPROVED_TARGET_BLOCK',
    'SELECTED_TARGET_NOT_IN_ALLOWED_OWNER_CANDIDATES',
    'CORRECTED_LABEL_NOT_ON_CORRECTED_PATH',
    'MISSING_REJECTED_FIELD:rejectionReason',
    'APPROVED_DIFF_BOARD_MISSING',
    'ROW_CURRENT_GEOMETRY_SNAPSHOT_MISSING',
    'readyForManualProductionApply',
    'REAL_OPERATOR_INPUT_CHANGED',
    'REAL_OPERATOR_PENDING_ROWS',
    'productionWriteAllowed: false',
    'writesRealOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'src/data/daeguSeatData.ts',
  ].forEach((requiredText) => {
    assert.ok(
      p1DuplicateHandoffSmokeSource.includes(requiredText),
      `P1 duplicate handoff smoke should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision candidates는 shared component를 target별 검수 row로 분해한다', () => {
  const packageSource = readProjectFile('package.json');
  const p1DuplicatePrecisionSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-candidates"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-candidates:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-candidates'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_CANDIDATES_V1',
    'DAEGU_MISSING_BLOCK_P1_COORDINATE_CANDIDATES_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_HANDOFF_V1',
    'OFFICIAL_PNG_PIXEL_SCAN_DUPLICATE_SHARED_PRECISION',
    'IMAGE_DERIVED_TARGET_REVIEW_CANDIDATE_NOT_OPERATOR_APPROVED',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'DO_NOT_AUTOFILL_CORRECTED_PATH',
    'MULTI_TARGET_COMPONENT_REQUIRES_OPERATOR_OWNER_DECISION',
    'SHARED_OFFICIAL_COMPONENT_SPLIT_OR_SINGLE_OWNER_REQUIRED',
    'FULL_COMPONENT_REQUIRES_OPERATOR_SPLIT_OR_SINGLE_OWNER_SELECTION',
    'targetCandidateRows',
    'targetCoverageRatio',
    'componentBoardPng',
    'operatorCoordinateDraft',
    'candidatePathForOperatorReview',
    'candidateLabelPointForOperatorReview',
    'Duplicate precision candidates must not fill operatorDecision, correctedPath, reviewer, reviewedAt, or write src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'src/data/daeguSeatData.ts',
  ].forEach((requiredText) => {
    assert.ok(
      p1DuplicatePrecisionSource.includes(requiredText),
      `P1 duplicate precision candidates should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision approval gate는 승인 row만 dry-run apply plan으로 내보낸다', () => {
  const packageSource = readProjectFile('package.json');
  const operatorInputGuideSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const approvalGateSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-operator-input-guide"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-operator-input-guide:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-approval-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-approval-gate:require-approved"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-operator-input-guide'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-approval-gate'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_INPUT_GUIDE_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_CANDIDATES_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'SINGLE_OWNER_FULL_COMPONENT_APPROVED',
    'SPLIT_COMPONENT_CORRECTED_PATH',
    'candidatePathForOperatorReview',
    'DO_NOT_AUTOFILL_CORRECTED_PATH',
    'operatorDecision=APPROVED requires ownershipDecision, correctedPath, correctedLabelX/Y, reviewer, and reviewedAt',
    'Duplicate precision operator input guide may write an operator template only; it must not fill approvals or write src/data/daeguSeatData.ts.',
    'writesOperatorInput: true',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      operatorInputGuideSource.includes(requiredText),
      `P1 duplicate precision operator input guide should include ${requiredText}`,
    );
  });

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_APPROVAL_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_DRY_RUN_APPLY_PLAN_V1',
    'ready-for-dry-run-review',
    'blocked-no-approved-rows',
    'APPROVED_ROWS_REQUIRED_FOR_DUPLICATE_PRECISION_GATE',
    'OWNERSHIP_DECISION_REQUIRED_FOR_APPROVED_ROW',
    'CANDIDATE_PATH_COPIED_WITHOUT_SINGLE_OWNER_DECISION',
    'DUPLICATE_APPROVED_TARGET_BLOCK',
    'DUPLICATE_SINGLE_OWNER_FULL_COMPONENT',
    'SINGLE_OWNER_COMPONENT_HAS_OTHER_APPROVED_TARGETS',
    'APPROVED_SHARED_OVERLAP',
    'candidatePathForOperatorReview is evidence only and cannot become correctedPath without an explicit ownershipDecision.',
    'Dry-run apply plan only. Do not write src/data/daeguSeatData.ts without a separate guarded production writer.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      approvalGateSource.includes(requiredText),
      `P1 duplicate precision approval gate should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision review packet은 component 그룹별 검수 체크리스트를 만든다', () => {
  const packageSource = readProjectFile('package.json');
  const reviewPacketSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-review-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-review-packet:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-review-packet'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_REVIEW_PACKET_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_CANDIDATES_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_APPROVAL_GATE_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'EXPECTED_COMPONENT_ROWS = 9',
    'EXPECTED_TARGET_ROWS = 25',
    'REFERENCE_ONLY_LOCKED_VERIFY',
    'PRIMARY_OPERATOR_RETRACE',
    'LOW_COVERAGE_REFERENCE_OR_SPLIT',
    'MULTIPLE_HIGH_COVERAGE_SPLIT_REVIEW',
    'OWNER_DECISION_REQUIRED',
    'SINGLE_OWNER_FULL_COMPONENT_APPROVED',
    'SPLIT_COMPONENT_CORRECTED_PATH',
    'candidatePathNotAutofilledIntoCorrectedPath',
    'lockedRowsMarkedReferenceOnly',
    'CANDIDATE_PATH_AUTOFILLED_WITHOUT_SINGLE_OWNER',
    'LOCKED_ROWS_NOT_REFERENCE_ONLY',
    'operatorFillChecklist',
    'recommendedOwnershipActions',
    'fullComponentPathAllowedOnlyWithOperatorSingleOwnerDecision',
    'Duplicate precision review packet is read-only. It never writes operator input, production data, or src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      reviewPacketSource.includes(requiredText),
      `P1 duplicate precision review packet should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision draft coordinates는 이미지 기반 좌표 후보와 no-draft 사유를 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const draftCoordinatesSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-draft-coordinates"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-draft-coordinates:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-draft-coordinates'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_DRAFT_COORDINATES_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_REVIEW_PACKET_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_CANDIDATES_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'EXPECTED_COMPONENT_ROWS = 9',
    'EXPECTED_TARGET_ROWS = 25',
    'IMAGE_DERIVED_DRAFT_COORDINATE_NOT_OPERATOR_APPROVED',
    'DRAFT_FULL_COMPONENT_AVAILABLE_OPERATOR_REVIEW_ONLY',
    'DRAFT_FULL_COMPONENT_AVAILABLE_OWNER_DECISION_REQUIRED',
    'SPLIT_REQUIRED_NO_AUTODRAFT',
    'LOW_COVERAGE_NO_DRAFT',
    'REFERENCE_ONLY_NO_DRAFT',
    'draftVisualPath',
    'draftHitPath',
    'draftLabelPoint',
    'draftRowsAreNotCorrectedPath',
    'draftRowsHaveEvidence',
    'ownershipDecisionRequiredBeforeCopyingDraft',
    'canCopyDraftOnlyWhenOwnershipDecision',
    'SINGLE_OWNER_FULL_COMPONENT_APPROVED',
    'SPLIT_COMPONENT_CORRECTED_PATH',
    'FULL_COMPONENT_DRAFT_REQUIRES_OPERATOR_OWNERSHIP_DECISION',
    'BLOCK_SPECIFIC_SPLIT_MUST_BE_MANUAL',
    'LOW_COVERAGE_REVIEW_ONLY_NO_AUTOMATIC_COORDINATE',
    'LOCKED_REFERENCE_ONLY_NO_AUTOMATIC_COORDINATE',
    'Duplicate precision draft coordinates are image-derived review evidence only. This script never writes operator input, production data, or src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      draftCoordinatesSource.includes(requiredText),
      `P1 duplicate precision draft coordinates should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision draft preflight는 draft 복붙 위험과 승인 입력 조건을 검사한다', () => {
  const packageSource = readProjectFile('package.json');
  const draftPreflightSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-draft-preflight"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-draft-preflight:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-draft-preflight'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_DRAFT_PREFLIGHT_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_DRAFT_COORDINATES_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_INPUT_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'EXPECTED_TARGET_ROWS = 25',
    'EXPECTED_DRAFT_ROWS = 13',
    'EXPECTED_NO_DRAFT_ROWS = 12',
    'READY_FOR_OPERATOR_SINGLE_OWNER_REVIEW',
    'REQUIRES_MANUAL_SPLIT',
    'REFERENCE_ONLY_LOCKED',
    'LOW_COVERAGE_REVIEW_ONLY',
    'BLOCKED_NO_DRAFT',
    'candidateDraftVisualPath',
    'candidateDraftHitPath',
    'candidateDraftLabelX',
    'candidateDraftLabelY',
    'requiredOwnershipDecision',
    'nextRequiredInput',
    'operatorPatchTemplate',
    'copyRiskGate',
    'draftPathCanBecomeCorrectedPathOnlyWhen',
    'DRAFT_PATH_COPIED_WITHOUT_SINGLE_OWNER_APPROVAL',
    'SPLIT_ROW_CANNOT_USE_FULL_COMPONENT_DRAFT_PATH',
    'MANUAL_SPLIT_ROW_CANNOT_COPY_DRAFT_PATH',
    'PENDING_OR_NON_APPROVED_ROW_HAS_DRAFT_PATH_IN_CORRECTED_PATH',
    'SINGLE_OWNER_FULL_COMPONENT_APPROVED',
    'SPLIT_COMPONENT_CORRECTED_PATH',
    'Duplicate precision draft preflight is read-only. It writes review reports and a patch template only; it never fills operator approvals or writes src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesOperatorPatchTemplate: true',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      draftPreflightSource.includes(requiredText),
      `P1 duplicate precision draft preflight should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision patch intake gate는 operator patch를 dry-run merge plan으로만 검증한다', () => {
  const packageSource = readProjectFile('package.json');
  const patchIntakeSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-patch-intake-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-patch-intake-gate:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-patch-intake-gate'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_PATCH_INTAKE_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_DRAFT_PREFLIGHT_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_DRAFT_PREFLIGHT_V1_OPERATOR_PATCH_TEMPLATE',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_PATCH_INTAKE_DRY_RUN_MERGE_PLAN_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'EXPECTED_TARGET_ROWS = 25',
    'EXPECTED_DRAFT_ROWS = 13',
    'EXPECTED_NO_DRAFT_ROWS = 12',
    'PATCH_ROW_NOT_IN_TEMPLATE',
    'PATCH_TARGET_BLOCK_ID_MISMATCH',
    'UNKNOWN_OPERATOR_DECISION',
    'OWNERSHIP_DECISION_REQUIRED_FOR_APPROVED_ROW',
    'CORRECTED_PATH_REQUIRED_FOR_APPROVED_ROW',
    'CORRECTED_LABEL_X_REQUIRED_FOR_APPROVED_ROW',
    'CORRECTED_LABEL_Y_REQUIRED_FOR_APPROVED_ROW',
    'REVIEWER_REQUIRED_FOR_APPROVED_ROW',
    'REVIEWED_AT_REQUIRED_FOR_APPROVED_ROW',
    'REJECTION_REASON_REQUIRED_FOR_REJECTED_ROW',
    'PENDING_ROW_HAS_CORRECTED_FIELDS',
    'DRAFT_PATH_COPIED_WITHOUT_SINGLE_OWNER_APPROVAL',
    'SPLIT_ROW_CANNOT_USE_FULL_COMPONENT_DRAFT_PATH',
    'SPLIT_COMPONENT_CORRECTED_PATH_REQUIRES_MANUAL_PATH',
    'dryRunMergeRows',
    'writesOperatorDryRunMergePlan: true',
    'Duplicate precision patch intake gate is dry-run only. It validates operator patch rows and writes a merge plan, but never mutates operator-input.json or src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      patchIntakeSource.includes(requiredText),
      `P1 duplicate precision patch intake gate should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision operator review brief는 승인/수동분할/review-only row를 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const reviewBriefSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-operator-review-brief"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-operator-review-brief:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-operator-review-brief'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_REVIEW_BRIEF_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_DRAFT_PREFLIGHT_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_PATCH_INTAKE_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_REVIEW_PACKET_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'EXPECTED_TARGET_ROWS = 25',
    'EXPECTED_APPROVAL_READY_ROWS = 13',
    'EXPECTED_MANUAL_SPLIT_ROWS = 1',
    'EXPECTED_REFERENCE_ONLY_ROWS = 9',
    'EXPECTED_LOW_COVERAGE_ROWS = 2',
    'APPROVAL_PATCH_READY_WITH_DRAFT',
    'MANUAL_SPLIT_TRACE_REQUIRED',
    'REFERENCE_ONLY_LOCKED_DO_NOT_PATCH',
    'LOW_COVERAGE_MANUAL_REVIEW_REQUIRED',
    'candidateDraftVisualPath may be copied into correctedPath only after visual owner confirmation',
    'manual correctedPath that covers only this target block',
    'Keep PENDING/REJECTED for this duplicate precision patch.',
    'reviewBoardSvg',
    'nextCommandAfterPatch',
    'Duplicate precision operator review brief is read-only. It writes review evidence only and never mutates operator-input.json or src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      reviewBriefSource.includes(requiredText),
      `P1 duplicate precision operator review brief should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision operator patch workset은 승인 후보와 재트레이싱 row를 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const patchWorksetSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-operator-patch-workset"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-operator-patch-workset:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-operator-patch-workset'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_PATCH_WORKSET_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_REVIEW_BRIEF_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'EXPECTED_TARGET_ROWS = 25',
    'EXPECTED_APPROVAL_READY_ROWS = 13',
    'EXPECTED_MANUAL_SPLIT_ROWS = 1',
    'EXPECTED_LOW_COVERAGE_ROWS = 2',
    'EXPECTED_RETRACE_ROWS = EXPECTED_MANUAL_SPLIT_ROWS + EXPECTED_LOW_COVERAGE_ROWS',
    'EXPECTED_REFERENCE_ONLY_ROWS = 9',
    'APPROVAL_PATCH_READY_WITH_DRAFT',
    'MANUAL_SPLIT_TRACE_REQUIRED',
    'LOW_COVERAGE_MANUAL_REVIEW_REQUIRED',
    'REFERENCE_ONLY_LOCKED_DO_NOT_PATCH',
    'approval-ready-operator-patch-template.json',
    'manual-retrace-workset.json',
    'reference-only-locked-rows.json',
    "operatorDecision: 'PENDING'",
    'This template intentionally leaves correctedPath/correctedHitPath/correctedLabelX/Y empty until operator approval.',
    'manual correctedPath traced against the official PNG crop',
    'do not copy the full component candidateDraftVisualPath',
    'Duplicate precision operator patch workset is read-only. It writes operator patch/retrace templates only and never mutates operator-input.json or src/data/daeguSeatData.ts.',
    'approvalPatchRowsStartPending',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      patchWorksetSource.includes(requiredText),
      `P1 duplicate precision operator patch workset should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision operator approval board는 13개 후보를 component 그룹으로 재정렬한다', () => {
  const packageSource = readProjectFile('package.json');
  const approvalBoardSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-operator-approval-board"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-operator-approval-board:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-operator-approval-board'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_APPROVAL_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_PATCH_WORKSET_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'EXPECTED_APPROVAL_PATCH_ROWS = 13',
    'EXPECTED_RETRACE_ROWS = 3',
    'EXPECTED_REFERENCE_ONLY_ROWS = 9',
    'EXPECTED_APPROVAL_COMPONENT_GROUPS = 6',
    'EXPECTED_DUPLICATE_TARGET_BLOCKS = 2',
    'P0_DUPLICATE_TARGET_BLOCK',
    'P1_MULTI_TARGET_COMPONENT',
    'P2_SINGLE_COMPONENT_OWNER_CHECK',
    'approvalRowsStartPending',
    'manualRetraceRowsExcludedFromApprovalPatch',
    'operatorDecisionGuide',
    'manual-retrace-worksheet.json',
    'Full-component candidateDraftVisualPath must not be copied into correctedPath.',
    'Duplicate precision operator approval board is read-only. It writes grouped review evidence and manual retrace worksheets only and never mutates operator-input.json or src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      approvalBoardSource.includes(requiredText),
      `P1 duplicate precision operator approval board should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision P0 duplicate target gate는 1-6/1-7 소유권 중복 승인을 차단한다', () => {
  const packageSource = readProjectFile('package.json');
  const p0GateSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-duplicate-target-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-duplicate-target-gate:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-duplicate-target-gate:require-approved"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-p0-duplicate-target-gate'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_P0_DUPLICATE_TARGET_GATE_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_OPERATOR_APPROVAL_BOARD_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'EXPECTED_P0_COMPONENT_GROUPS = 3',
    'EXPECTED_P0_PATCH_ROWS = 7',
    'EXPECTED_DUPLICATE_TARGET_BLOCKS = 2',
    'P0_DUPLICATE_TARGET_BLOCK',
    'component-patch-templates',
    'p0OwnershipPolicy',
    'Approve at most one row per sourceComponentId.',
    'Approve at most one sourceComponentId for each duplicate targetBlock.',
    'P0_APPROVAL_REQUIRES_SINGLE_OWNER_FULL_COMPONENT_APPROVED',
    'SOURCE_COMPONENT_APPROVED_MULTIPLE_TARGETS',
    'DUPLICATE_TARGET_APPROVED_MULTIPLE_COMPONENTS',
    'P0_SPLIT_COMPONENT_REQUIRES_MANUAL_RETRACE_WORKSHEET',
    'DUPLICATE_TARGET_COMPETING_ROWS_STILL_PENDING',
    'writesOperatorDryRunMergePlan: true',
    'P0 duplicate target gate is dry-run only. It writes component patch templates and a validation report, but never mutates operator-input.json or src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      p0GateSource.includes(requiredText),
      `P0 duplicate target gate should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision P0 image candidate pack은 공식 PNG 픽셀 근거만 산출한다', () => {
  const packageSource = readProjectFile('package.json');
  const p0CandidatePackSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-image-candidate-pack"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-image-candidate-pack:require-ready"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-p0-image-candidate-pack'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_P0_IMAGE_CANDIDATE_PACK_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_P0_DUPLICATE_TARGET_GATE_V1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'EXPECTED_P0_COMPONENT_GROUPS = 3',
    'EXPECTED_P0_PATCH_ROWS = 7',
    'EXPECTED_DUPLICATE_TARGET_BLOCKS = 2',
    'DAEGU_IMAGE_SHA256',
    'classifySeatColorFamily',
    'familyCountsForPolygon',
    'floodFamilyComponent',
    'seatColorCoverageRatio',
    'componentInsidePathRatio',
    'P0_FULL_COMPONENT_SHARED_BY_MULTIPLE_TARGETS',
    'DUPLICATE_TARGET_BLOCK_CLAIM',
    'OFFICIAL_PNG_COMPONENT_DRAFT_NOT_OPERATOR_APPROVED',
    'imageEvidencePng',
    'p0-image-candidate-operator-patch-template.json',
    'P0 image candidate pack uses official PNG pixel analysis as evidence only. It never writes operator-input.json or src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      p0CandidatePackSource.includes(requiredText),
      `P0 image candidate pack should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision P0 duplicate target gate smoke는 fixture 승인/차단 케이스를 검증한다', () => {
  const packageSource = readProjectFile('package.json');
  const p0GateSmokeSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-duplicate-target-gate-smoke"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-duplicate-target-gate-smoke:require-pass"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-p0-duplicate-target-gate-smoke'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_P0_DUPLICATE_TARGET_GATE_SMOKE_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_P0_DUPLICATE_TARGET_GATE_V1',
    'SMOKE_FIXTURE_ONLY_NO_PRODUCTION_WRITE',
    'SMOKE_TEST_OPERATOR',
    'valid-single-approved-row',
    'blocked-source-component-multiple-targets',
    'blocked-duplicate-target-multiple-components',
    'blocked-split-component-approval',
    'blocked-approved-row-missing-reviewer',
    'SOURCE_COMPONENT_APPROVED_MULTIPLE_TARGETS',
    'DUPLICATE_TARGET_APPROVED_MULTIPLE_COMPONENTS',
    'P0_SPLIT_COMPONENT_REQUIRES_MANUAL_RETRACE_WORKSHEET',
    'REVIEWER_REQUIRED_FOR_APPROVED_ROW',
    'productionWriteAllowed: false',
    'writesRealOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'src/data/daeguSeatData.ts',
  ].forEach((requiredText) => {
    assert.ok(
      p0GateSmokeSource.includes(requiredText),
      `P0 duplicate target gate smoke should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision P0 apply preflight는 operator 승인 좌표만 dry-run 적용 계획으로 승격한다', () => {
  const packageSource = readProjectFile('package.json');
  const applyPreflightSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-apply-preflight"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-apply-preflight:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-apply-preflight:require-approved"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-p0-apply-preflight'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_P0_APPLY_PREFLIGHT_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_P0_IMAGE_CANDIDATE_PACK_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_P0_DRY_RUN_APPLY_PLAN_V1',
    'daegu-p1-duplicate-precision-p0-operator-approved-v1',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'SOURCE_COMPONENT_APPROVED_MULTIPLE_TARGETS',
    'DUPLICATE_TARGET_APPROVED_MULTIPLE_COMPONENTS',
    'IMAGE_CANDIDATE_PATH_COPIED_REQUIRES_OPERATOR_NOTE',
    'UPDATE_EXISTING_DAEGU_BLOCK_GEOMETRY_AFTER_P0_OPERATOR_APPROVAL',
    'manualReviewed: true',
    "pixelAlignmentStatus: 'PIXEL_ALIGNED'",
    "traceStatus: 'OFFICIAL_IMAGE_TRACED'",
    "traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE'",
    'reviewOnlyTargetWillBecomeSelectableAfterWrite',
    'LABEL_TOP_HIT_NOT_INSIDE_CORRECTED_HIT_PATH',
    'NORMAL_SELECTABLE_OVERLAP_RISK',
    'P0 apply preflight is dry-run only. It validates operator-approved image candidates and writes an apply plan, but never mutates operator-input.json or src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(
      applyPreflightSource.includes(requiredText),
      `P0 apply preflight should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 duplicate precision P0 apply preflight smoke는 dry-run 승인/차단 fixture를 검증한다', () => {
  const packageSource = readProjectFile('package.json');
  const applyPreflightSmokeSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-apply-preflight-smoke"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-duplicate-precision-p0-apply-preflight-smoke:require-pass"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-duplicate-precision-p0-apply-preflight-smoke'));

  [
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_P0_APPLY_PREFLIGHT_SMOKE_V1',
    'DAEGU_MISSING_BLOCK_P1_DUPLICATE_PRECISION_P0_APPLY_PREFLIGHT_V1',
    'SMOKE_FIXTURE_ONLY_NO_PRODUCTION_WRITE',
    'SMOKE_TEST_OPERATOR',
    'valid-single-approved-row',
    'rejected-row-excluded',
    'blocked-approved-missing-corrected-path',
    'blocked-copied-candidate-path-missing-note',
    'blocked-source-component-multiple-targets',
    'blocked-duplicate-target-multiple-components',
    'CORRECTED_PATH_REQUIRED_FOR_APPROVED_ROW',
    'IMAGE_CANDIDATE_PATH_COPIED_REQUIRES_OPERATOR_NOTE',
    'SOURCE_COMPONENT_APPROVED_MULTIPLE_TARGETS',
    'DUPLICATE_TARGET_APPROVED_MULTIPLE_COMPONENTS',
    'productionWriteAllowed: false',
    'writesRealOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'src/data/daeguSeatData.ts',
  ].forEach((requiredText) => {
    assert.ok(
      applyPreflightSmokeSource.includes(requiredText),
      `P0 apply preflight smoke should include ${requiredText}`,
    );
  });
});

test('대구 missing block P1 operator lifecycle smoke는 세 P1 흐름의 승인/반려 gate를 fixture로 검증한다', () => {
  const packageSource = readProjectFile('package.json');
  const p1LifecycleSmokeSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p1-operator-lifecycle-smoke"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p1-operator-lifecycle-smoke'));

  [
    'DAEGU_MISSING_BLOCK_P1_OPERATOR_LIFECYCLE_SMOKE_V1',
    'SMOKE_FIXTURE_ONLY_NO_PRODUCTION_WRITE',
    'SMOKE_TEST_OPERATOR',
    'P1_DUPLICATE_SHARED_OWNERSHIP',
    'P1_RETRACE_REVIEW',
    'P1_UNMATCHED_OFFICIAL_COMPONENT',
    'INTEGRATED_P1_DRY_RUN',
    'retrace-valid-approved',
    'retrace-rejected-excluded',
    'retrace-missing-corrected-path-blocked',
    'unmatched-existing-approved',
    'unmatched-new-approved',
    'unmatched-rejected-excluded',
    'unmatched-new-missing-metadata-blocked',
    'integrated-valid-approved-only',
    'integrated-duplicate-target-blocked',
    'CORRECTED_PATH_REQUIRED',
    'NEW_SECTION_ID_REQUIRED',
    'INTEGRATED_DUPLICATE_APPROVED_TARGET',
    'REJECTED_ROW_INCLUDED_IN_DRY_RUN',
    'P1 operator lifecycle smoke uses isolated fixture copies only; it must not overwrite real operator input or src/data/daeguSeatData.ts.',
    'productionWriteAllowed: false',
    'writesRealOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
    'src/data/daeguSeatData.ts',
  ].forEach((requiredText) => {
    assert.ok(
      p1LifecycleSmokeSource.includes(requiredText),
      `P1 operator lifecycle smoke should include ${requiredText}`,
    );
  });
});

test('대구 missing block placement package는 누락 후보 crop과 승인 gate를 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const placementPackageSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const placementGateSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-placement-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-placement-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-placement-gate:require-approved"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-placement-package'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-placement-gate'));

  [
    'DAEGU_MISSING_BLOCK_PLACEMENT_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_DISCOVERY_V1',
    'NEW_OR_UNMAPPED_SEAT_COMPONENT',
    'OWNERSHIP_RECONCILIATION_REQUIRED',
    'REVIEW_ONLY_ROW_NEEDS_OPERATOR_APPROVAL',
    'NORMAL_ROW_RETRACE_REQUIRED',
    'BBOX_ENVELOPE_NOT_FINAL_TRACE',
    'DAEGU_MISSING_BLOCK_PLACEMENT_OPERATOR_INPUT_V1',
    'Draft placement paths are image-derived bbox envelopes',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(placementPackageSource.includes(requiredText), `missing block placement package should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_PLACEMENT_APPROVAL_GATE_V1',
    'DAEGU_MISSING_BLOCK_PLACEMENT_DRY_RUN_APPLY_PLAN_V1',
    'DAEGU_MISSING_BLOCK_PLACEMENT_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_PLACEMENT_OPERATOR_INPUT_V1',
    'waiting-for-operator-approval',
    'approved-row-blocked',
    'approved-dry-run-plan-ready',
    'TARGET_BLOCK_NOT_FOUND',
    'CORRECTED_PATH_REQUIRED',
    'REVIEWER_REQUIRED',
    'REVIEWED_AT_REQUIRED',
    'UPDATE_EXISTING_DAEGU_BLOCK_GEOMETRY_AFTER_OPERATOR_APPROVAL',
    'This gate emits a dry-run plan only',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(placementGateSource.includes(requiredText), `missing block placement gate should include ${requiredText}`);
  });
});

test('대구 missing block P0 review board는 신규/미매칭 후보를 분류하고 승인 전 write를 막는다', () => {
  const packageSource = readProjectFile('package.json');
  const p0BoardSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0GateSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-review-board"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-approval-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-approval-gate:require-approved"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-review-board'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-approval-gate'));

  [
    'DAEGU_MISSING_BLOCK_P0_REVIEW_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P0_OPERATOR_INPUT_V1',
    'NEW_OR_UNMAPPED_SEAT_COMPONENT',
    'LIKELY_STANDALONE_BLOCK',
    'EXISTING_REVIEW_ROW_RETRACE',
    'LARGE_REGION_OWNERSHIP_REVIEW',
    'SPLIT_OR_LABEL_FRAGMENT_REVIEW',
    'FIRST_BASE_INFIELD_SKY',
    'THIRD_BASE_INFIELD_SKY',
    'OUTFIELD_ROOFTOP',
    'Operator must confirm visible label',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0BoardSource.includes(requiredText), `P0 review board should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_APPROVAL_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_DRY_RUN_APPLY_PLAN_V1',
    'DAEGU_MISSING_BLOCK_P0_REVIEW_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P0_OPERATOR_INPUT_V1',
    'waiting-for-p0-operator-approval',
    'p0-approved-row-blocked',
    'p0-approved-dry-run-plan-ready',
    'P0_REVIEW_ITEM_NOT_FOUND',
    'TARGET_BLOCK_NOT_FOUND',
    'CORRECTED_PATH_REQUIRED',
    'REVIEWER_REQUIRED',
    'REVIEWED_AT_REQUIRED',
    'UPDATE_EXISTING_DAEGU_BLOCK_GEOMETRY_AFTER_P0_OPERATOR_APPROVAL',
    '--output-dir',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0GateSource.includes(requiredText), `P0 approval gate should include ${requiredText}`);
  });
});

test('대구 missing block P0 standalone package는 누락 가능성이 높은 4개 후보만 별도 crop으로 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const p0StandaloneSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-standalone-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-standalone-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-standalone-gate:require-approved"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-standalone-package'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-standalone-gate:require-approved": "node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-standalone-gate:require-approved"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-standalone-gate:require-approved": "node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-standalone-gate:require-approved"'));

  [
    'DAEGU_MISSING_BLOCK_P0_STANDALONE_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_P0_REVIEW_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P0_OPERATOR_INPUT_V1',
    'LIKELY_STANDALONE_BLOCK',
    'EXPECTED_STANDALONE_CANDIDATES = 4',
    'P0_STANDALONE_MISSING_BLOCK_REVIEW_ONLY',
    'P0_STANDALONE_NEEDS_LABEL_CONFIRMATION',
    'BBOX_ENVELOPE_NOT_FINAL_TRACE',
    'manualTraceRequired',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'p0_standalone_operator_input',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0StandaloneSource.includes(requiredText), `P0 standalone package should include ${requiredText}`);
  });
});

test('대구 missing block P0 reality audit는 standalone 후보를 픽셀 마스크 근거로 재분류한다', () => {
  const packageSource = readProjectFile('package.json');
  const p0RealityAuditSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-reality-audit"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-reality-audit'));

  [
    'DAEGU_MISSING_BLOCK_P0_REALITY_AUDIT_V1',
    'DAEGU_MISSING_BLOCK_P0_STANDALONE_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_DISCOVERY_V1',
    'DAEGU_MISSING_BLOCK_P0_REALITY_DECISION_INPUT_V1',
    'PIXEL_MASK_REVIEW_NOT_FINAL_TRACE',
    'LIKELY_SEAT_SURFACE_COMPONENT',
    'TINY_COMPONENT_LABEL_OR_SEAT_CONFIRMATION_REQUIRED',
    'NARROW_STRIP_OR_SPLIT_COMPONENT_REVIEW',
    'PALE_PURPLE_FAMILY_OPERATOR_LABEL_REQUIRED',
    'OPERATOR_TRACE_AS_MISSING_SEAT_SURFACE_CANDIDATE',
    'OPERATOR_CONFIRM_TINY_COMPONENT_BEFORE_TRACE',
    'seatRealityDecision',
    'APPROVE_AS_MISSING_SEAT_BLOCK',
    'REASSIGN_TO_EXISTING_BLOCK',
    'REJECT_NON_SEAT_FRAGMENT',
    'p0_reality_operator_input',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0RealityAuditSource.includes(requiredText), `P0 reality audit should include ${requiredText}`);
  });
});

test('대구 missing block P0 target resolution board는 이미지 판독 힌트를 기존 review row와 연결한다', () => {
  const packageSource = readProjectFile('package.json');
  const p0TargetResolutionSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-target-resolution"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-target-resolution'));

  [
    'DAEGU_MISSING_BLOCK_P0_TARGET_RESOLUTION_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P0_REALITY_AUDIT_V1',
    'DAEGU_MISSING_BLOCK_P0_TARGET_RESOLUTION_INPUT_V1',
    'VISUAL_LABEL_HINTS',
    'component-0136',
    'S7',
    'component-0095',
    '3-4',
    'RETRACE_EXISTING_REVIEW_ROW',
    'RETRACE_EXISTING_REVIEW_ROW_OR_SPLIT_OWNERSHIP',
    'KEEP_PENDING_OPERATOR_REALITY_DECISION',
    'targetBlockId',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'p0_target_resolution_operator_input',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0TargetResolutionSource.includes(requiredText), `P0 target resolution board should include ${requiredText}`);
  });
});

test('대구 missing block P0 tiny component decision package는 component-0078/0082를 decision-only로 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const tinyDecisionPackageSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const tinyDecisionGateSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const tinyDecisionGateSmokeSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-tiny-component-decision-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-tiny-component-decision-package:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-tiny-component-decision-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-tiny-component-decision-gate:require-decided"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-tiny-component-decision-gate-smoke"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-tiny-component-decision-gate-smoke:require-pass"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-tiny-component-decision-package'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-tiny-component-decision-gate'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-tiny-component-decision-gate-smoke'));

  [
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_P0_TARGET_RESOLUTION_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P0_REALITY_AUDIT_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_INPUT_V1',
    "EXPECTED_TINY_COMPONENTS = ['component-0078', 'component-0082']",
    'CONFIRM_REAL_SEAT_BLOCK',
    'CONFIRM_LABEL_OR_BOUNDARY_FRAGMENT',
    'MERGE_TO_EXISTING_BLOCK',
    'REJECT_NON_SEAT_FRAGMENT',
    'p0-tiny-component-operator-decision-required',
    'decisionOnly: true',
    'operatorDecision=DECIDED',
    'seatRealityDecision',
    'geometryFieldsRequiredOnlyForRealSeat',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(tinyDecisionPackageSource.includes(requiredText), `P0 tiny component decision package should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_PLAN_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_INPUT_V1',
    "EXPECTED_COMPONENTS = ['component-0078', 'component-0082']",
    'waiting-for-p0-tiny-component-operator-decision',
    'p0-tiny-component-decision-row-blocked',
    'p0-tiny-component-decision-plan-ready',
    'CONFIRM_REAL_SEAT_BLOCK',
    'CONFIRM_LABEL_OR_BOUNDARY_FRAGMENT',
    'MERGE_TO_EXISTING_BLOCK',
    'REJECT_NON_SEAT_FRAGMENT',
    'TARGET_BLOCK_REQUIRED_FOR_REAL_SEAT_DECISION',
    'CORRECTED_PATH_REQUIRED',
    'REVIEWER_REQUIRED',
    'ROUTE_TINY_COMPONENT_TO_RETRACE_AFTER_OPERATOR_DECISION',
    'KEEP_TINY_COMPONENT_OUT_OF_SEAT_POLYGON_LAYER_AFTER_OPERATOR_DECISION',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(tinyDecisionGateSource.includes(requiredText), `P0 tiny component decision gate should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_GATE_SMOKE_V1',
    'DECISION_GATE_USES_FIXTURE_OPERATOR_INPUT_ONLY',
    'pending-no-decision-waiting',
    'pending-require-decided-blocked',
    'all-non-seat-decided',
    'missing-reviewer-blocked',
    'real-seat-missing-geometry-blocked',
    'mixed-real-seat-and-non-seat-decided',
    'p0-tiny-component-decision-gate-smoke-passed',
    'CORRECTED_PATH_REQUIRED',
    'REVIEWER_REQUIRED',
    'ROUTE_TINY_COMPONENT_TO_RETRACE_AFTER_OPERATOR_DECISION',
    'KEEP_TINY_COMPONENT_OUT_OF_SEAT_POLYGON_LAYER_AFTER_OPERATOR_DECISION',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(tinyDecisionGateSmokeSource.includes(requiredText), `P0 tiny component decision gate smoke should include ${requiredText}`);
  });
});

test('대구 missing block P0 retrace package는 S7/3-4 전용 승인 입력과 복붙 차단 gate를 만든다', () => {
  const packageSource = readProjectFile('package.json');
  const p0RetracePackageSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0RetraceImageDraftSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0RetraceDraftQualitySource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0RetraceOperatorHandoffSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0RetraceApprovalEntryGuideSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0RetraceApprovalSmokeSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0RetraceGateSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0ReadinessGateSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0OperatorReviewPacketSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0OperatorReviewPacketSmokeSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0OperatorInputGuideSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0DryRunApplyReviewSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');
  const p0CoordinateAnalysisSource = readProjectFile('scripts/daegu-seatmap-missing-block.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-image-draft"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-draft-quality"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-draft-quality:require-quality"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-operator-handoff"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-operator-handoff:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-approval-entry-guide"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-approval-entry-guide:require-approved"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-approval-smoke"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-approval-smoke:require-pass"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-retrace-gate:require-approved"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-readiness-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-readiness-gate:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-operator-review-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-operator-review-packet:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-operator-review-packet-smoke"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-operator-review-packet-smoke:require-pass"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-operator-input-guide"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-operator-input-guide:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-dry-run-apply-review"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-dry-run-apply-review:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:missing-block-p0-coordinate-analysis"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-retrace-package'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-retrace-image-draft'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-retrace-draft-quality'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-retrace-operator-handoff'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-retrace-approval-entry-guide'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-retrace-approval-smoke'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-retrace-gate'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-readiness-gate'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-operator-review-packet'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-operator-review-packet-smoke'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-operator-input-guide'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-dry-run-apply-review'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs daegu missing-block-p0-coordinate-analysis'));

  [
    'DAEGU_MISSING_BLOCK_P0_RETRACE_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_P0_TARGET_RESOLUTION_BOARD_V1',
    'DAEGU_MISSING_BLOCK_P0_REALITY_AUDIT_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_INPUT_V1',
    "ALLOWED_TARGET_BLOCKS = ['S7', '3-4']",
    'EXPECTED_RETRACE_ROWS = 2',
    'draftComponentBboxPath',
    'currentVisualPath',
    'currentHitPath',
    'correctedPath',
    'correctedHitPath',
    'correctedLabelX',
    'correctedLabelY',
    'p0_retrace_operator_input',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0RetracePackageSource.includes(requiredText), `P0 retrace package should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_RETRACE_IMAGE_DRAFT_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_PICKER_DRAFT_V1',
    'PIXEL_HULL_DRAFT_NOT_OPERATOR_APPROVED',
    'DRAFT_REQUIRES_OPERATOR_APPROVAL_BEFORE_VALIDATE',
    'operatorDecision=DRAFT',
    'draftCorrectedPath',
    'draftCorrectedHitPath',
    'pixelColorCoverageRatio',
    'p0_retrace_image_draft_picker',
    'No automatic coordinate promotion is allowed.',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0RetraceImageDraftSource.includes(requiredText), `P0 retrace image draft should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_RETRACE_DRAFT_QUALITY_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_IMAGE_DRAFT_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_PICKER_DRAFT_V1',
    'PIXEL_HULL_DRAFT_NOT_OPERATOR_APPROVED',
    'DRAFT_REQUIRES_OPERATOR_APPROVAL_BEFORE_VALIDATE',
    'DRAFT_CANNOT_BE_APPROVED_BY_THIS_SCRIPT',
    'PICKER_OPERATOR_DECISION_NOT_DRAFT',
    'DRAFT_REUSES_CURRENT_VISUAL_PATH',
    'DRAFT_REUSES_CURRENT_HIT_PATH',
    'p0-retrace-draft-quality-ready-for-operator-review',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
  ].forEach((requiredText) => {
    assert.ok(p0RetraceDraftQualitySource.includes(requiredText), `P0 retrace draft quality gate should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_HANDOFF_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_DRAFT_QUALITY_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_INPUT_V1',
    'p0-retrace-operator-handoff-ready',
    'Suggested approval fields are copy guidance only.',
    'DRAFT_REQUIRES_OPERATOR_APPROVAL_BEFORE_VALIDATE',
    'DRAFT_CANNOT_BE_APPROVED_BY_THIS_SCRIPT',
    'operatorDecision=APPROVED',
    'reviewer',
    'reviewedAt',
    'src/data/daeguSeatData.ts',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
  ].forEach((requiredText) => {
    assert.ok(p0RetraceOperatorHandoffSource.includes(requiredText), `P0 retrace operator handoff should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_RETRACE_APPROVAL_ENTRY_GUIDE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_HANDOFF_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_INPUT_V1',
    'p0-retrace-approval-entry-waiting-for-manual-approval',
    'APPROVAL_REQUIRES_MANUAL_OPERATOR_ENTRY',
    'DRAFT_CANNOT_BE_APPROVED_BY_THIS_SCRIPT',
    'Suggested approval fields are copy guidance only.',
    'operatorDecision=APPROVED',
    'reviewer',
    'reviewedAt',
    'src/data/daeguSeatData.ts',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
  ].forEach((requiredText) => {
    assert.ok(p0RetraceApprovalEntryGuideSource.includes(requiredText), `P0 retrace approval entry guide should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_RETRACE_APPROVAL_SMOKE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_APPROVAL_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_HANDOFF_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_INPUT_V1',
    'APPROVAL_SMOKE_USES_FIXTURE_OPERATOR_INPUT_ONLY',
    'DRAFT_CANNOT_BE_APPROVED_BY_THIS_SCRIPT',
    'p0-retrace-approved-dry-run-plan-ready',
    'waiting-for-p0-retrace-operator-approval',
    'CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH',
    'REVIEWER_REQUIRED',
    'all-suggested-approved',
    'missing-reviewer-blocked',
    'current-path-copy-blocked',
    'no-approval-require-approved-blocked',
    'src/data/daeguSeatData.ts',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
  ].forEach((requiredText) => {
    assert.ok(p0RetraceApprovalSmokeSource.includes(requiredText), `P0 retrace approval smoke should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_RETRACE_APPROVAL_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_DRY_RUN_APPLY_PLAN_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_INPUT_V1',
    'waiting-for-p0-retrace-operator-approval',
    'p0-retrace-approved-row-blocked',
    'p0-retrace-approved-dry-run-plan-ready',
    'CORRECTED_PATH_REUSES_DRAFT_COMPONENT_BBOX',
    'CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH',
    'CORRECTED_PATH_REUSES_CURRENT_HIT_PATH',
    'TARGET_BLOCK_NOT_ALLOWED',
    'UPDATE_EXISTING_DAEGU_BLOCK_GEOMETRY_AFTER_P0_RETRACE_APPROVAL',
    'OFFICIAL_IMAGE_TRACED',
    'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    'PIXEL_ALIGNED',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0RetraceGateSource.includes(requiredText), `P0 retrace approval gate should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_READINESS_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_APPROVAL_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_INPUT_V1',
    "EXPECTED_RETRACE_TARGETS = ['S7', '3-4']",
    "EXPECTED_TINY_COMPONENTS = ['component-0078', 'component-0082']",
    'P0_RETRACE_APPROVAL_PENDING',
    'P0_TINY_DECISION_PENDING',
    'p0-readiness-waiting-for-operator-input',
    'p0-readiness-ready-for-next-action-review',
    'P0_RETRACE_S7_3_4',
    'P0_TINY_COMPONENT_0078_0082',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0ReadinessGateSource.includes(requiredText), `P0 readiness gate should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_OPERATOR_REVIEW_PACKET_V1',
    'DAEGU_MISSING_BLOCK_P0_READINESS_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_HANDOFF_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_INPUT_V1',
    "EXPECTED_RETRACE_TARGETS = ['S7', '3-4']",
    "EXPECTED_TINY_COMPONENTS = ['component-0078', 'component-0082']",
    'APPROVE_RETRACE_COORDINATE',
    'DECIDE_TINY_COMPONENT_REALITY',
    'waiting-for-p0-retrace-operator-approval',
    'waiting-for-p0-tiny-component-operator-decision',
    'p0-operator-review-packet-waiting-for-operator-input',
    'p0-operator-review-packet-operator-input-complete',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0OperatorReviewPacketSource.includes(requiredText), `P0 operator review packet should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_OPERATOR_REVIEW_PACKET_SMOKE_V1',
    'DAEGU_MISSING_BLOCK_P0_OPERATOR_REVIEW_PACKET_V1',
    'P0_OPERATOR_REVIEW_PACKET_SMOKE_USES_FIXTURE_OPERATOR_INPUT_ONLY',
    'pending-real-input-review-ready',
    'pending-real-input-require-complete-blocked',
    'all-fixture-input-complete',
    'missing-tiny-row-hard-blocked',
    'P0_TINY_OPERATOR_INPUT_ROW_MISSING:component-0082',
    'p0-operator-review-packet-smoke-passed',
    'p0-operator-review-packet-smoke-failed',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0OperatorReviewPacketSmokeSource.includes(requiredText), `P0 operator review packet smoke should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_OPERATOR_INPUT_GUIDE_V1',
    'DAEGU_MISSING_BLOCK_P0_OPERATOR_REVIEW_PACKET_V1',
    'DAEGU_MISSING_BLOCK_P0_COORDINATE_ANALYSIS_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_OPERATOR_INPUT_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_INPUT_V1',
    'P0_OPERATOR_INPUT_GUIDE_READ_ONLY',
    'IMAGE_DERIVED_CANDIDATE_NOT_OPERATOR_APPROVED',
    'Use candidate geometry only after seatRealityDecision=CONFIRM_REAL_SEAT_BLOCK or MERGE_TO_EXISTING_BLOCK.',
    'sourceCoordinateAnalysis',
    'coordinateCandidate',
    'coordinateEvidencePng',
    'row.targetBlock && packetRow.targetBlock',
    'APPROVE_RETRACE_COORDINATE',
    'DECIDE_TINY_COMPONENT_REALITY',
    'operatorDecision=APPROVED',
    'operatorDecision=DECIDED',
    'seatRealityDecision',
    'CONFIRM_REAL_SEAT_BLOCK',
    'MERGE_TO_EXISTING_BLOCK',
    'REJECT_NON_SEAT_FRAGMENT',
    'p0-operator-input-guide-ready-with-pending-rows',
    'p0-operator-input-guide-ready-all-input-complete',
    'rows[${rowIndex}]',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0OperatorInputGuideSource.includes(requiredText), `P0 operator input guide should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_DRY_RUN_APPLY_REVIEW_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_APPROVAL_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_DRY_RUN_APPLY_PLAN_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_PLAN_V1',
    'DAEGU_MISSING_BLOCK_P0_READINESS_GATE_V1',
    'DAEGU_MISSING_BLOCK_P0_OPERATOR_INPUT_GUIDE_V1',
    'P0_DRY_RUN_APPLY_REVIEW_READ_ONLY',
    'WAITING_FOR_RETRACE_APPROVAL',
    'WAITING_FOR_TINY_DECISION',
    'UPDATE_EXISTING_DAEGU_BLOCK_GEOMETRY_AFTER_P0_RETRACE_APPROVAL',
    'ROUTE_TINY_COMPONENT_TO_RETRACE_AFTER_OPERATOR_DECISION',
    'KEEP_TINY_COMPONENT_OUT_OF_SEAT_POLYGON_LAYER_AFTER_OPERATOR_DECISION',
    'p0-dry-run-apply-review-waiting-for-operator-input',
    'p0-dry-run-apply-review-ready',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0DryRunApplyReviewSource.includes(requiredText), `P0 dry-run apply review should include ${requiredText}`);
  });

  [
    'DAEGU_MISSING_BLOCK_P0_COORDINATE_ANALYSIS_V1',
    'DAEGU_MISSING_BLOCK_P0_RETRACE_PACKAGE_V1',
    'DAEGU_MISSING_BLOCK_P0_TINY_COMPONENT_DECISION_PACKAGE_V1',
    'OFFICIAL_PNG_PIXEL_SCAN_COORDINATE_CANDIDATE',
    'IMAGE_DERIVED_CANDIDATE_NOT_OPERATOR_APPROVED',
    'P0_COORDINATE_ANALYSIS_READ_ONLY',
    'TINY_COMPONENT_DECISION_REQUIRED_BEFORE_GEOMETRY_WRITE',
    'operatorDecision stays PENDING/DRAFT; this script does not set APPROVED/DECIDED',
    'DECIDE_TINY_COMPONENT_REALITY_BEFORE_ANY_GEOMETRY_WRITE',
    'MANUALLY_APPROVE_OR_EDIT_RETRACE_COORDINATE',
    'p0-coordinate-analysis-ready-for-operator-review',
    'No automatic coordinate promotion is allowed.',
    'src/data/daeguSeatData.ts',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(p0CoordinateAnalysisSource.includes(requiredText), `P0 coordinate analysis should include ${requiredText}`);
  });
});

test('대구 visual match workset은 audit 증거를 작업 큐로 고정하고 production write를 막는다', () => {
  const packageSource = readProjectFile('package.json');
  const visualMatchWorksetSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-workset"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-workset": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-workset"'));

  [
    'DAEGU_SEATMAP_VISUAL_MATCH_WORKSET_V1',
    'DAEGU_SEATMAP_VISUAL_MATCH_AUDIT_V1',
    'expectedReviewOnlyBlockerSource',
    'EXPECTED_NORMAL_REVIEW_ROWS = 0',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'BATCH_2_BOUNDARY_FIRST',
    'BATCH_3_DUPLICATE_SHARED_OWNERSHIP',
    'BATCH_4_5F_SKY_RETRACE',
    'BATCH_5_OUTFIELD_RETRACE',
    'P0_FLOATING_OR_OFF_SEAT',
    'P1_LABEL_OR_HIT_MISMATCH',
    'operatorDecision=APPROVED, correctedPath, correctedLabelX/Y, reviewer, and reviewedAt',
    'This workset does not modify `src/data/daeguSeatData.ts`.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
    'PASS_VISUAL_MATCH is still blocked',
    'visual_match_workset_json',
  ].forEach((requiredText) => {
    assert.ok(visualMatchWorksetSource.includes(requiredText), `visual match workset should include ${requiredText}`);
  });
});

test('대구 visual match batch1 operator package는 screenshot-zone 승인 입력과 dry-run gate를 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const batch1PackageSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1ValidateSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1CoordinateGuideSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1CoordinatePickerSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1CoordinateDraftImportSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1DraftQualitySource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1ImageDraftSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1ImageEvidenceAuditSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1ConflictAuditSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1LockedConflictWorksetSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1LockedConflictImageEvidenceAuditSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1LockedConflictOperatorPackageSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1LockedConflictOperatorValidateSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1LockedConflictDecisionBoardSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1LockedConflictEntryGuideSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1DryRunReviewSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1ReviewBoardSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1ApprovalSmokeSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const batch1ReadinessSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-operator-validate"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-coordinate-guide"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-coordinate-picker"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-coordinate-draft-import"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-draft-quality"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-draft-quality:allow-blocked"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-image-draft"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-image-draft-quality"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-image-evidence-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-conflict-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-conflict-audit:allow-conflicts"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-locked-conflict-workset"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-locked-conflict-image-evidence-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-locked-conflict-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-locked-conflict-operator-validate"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-locked-conflict-decision-board"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-locked-conflict-entry-guide"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-dry-run-review"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-dry-run-review:allow-empty"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-review-board"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-approval-smoke"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-image-draft": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-image-draft"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-readiness:require-ready": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-readiness:require-ready"'));

  [
    'DAEGU_VISUAL_MATCH_BATCH1_OPERATOR_PACKAGE_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    "'16'",
    "'13'",
    "'14'",
    "'15'",
    "'U25'",
    "'U31'",
    "'S23'",
    "'S24'",
    'operatorDecision=APPROVED',
    "'DRAFT'",
    'correctedPath',
    'correctedHitPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'DO_NOT_COPY_CURRENT_VISUAL_OR_HIT_PATH_TO_CORRECTED_PATH',
    'This package writes review artifacts only under reports/stadium/daegu-visual-match-batch1.',
    'It never modifies src/data/daeguSeatData.ts.',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1PackageSource.includes(requiredText), `Daegu batch1 package should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_OPERATOR_VALIDATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_DRY_RUN_APPLY_PLAN_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    "'DRAFT'",
    'MIN_CORRECTED_PATH_POINTS = 4',
    'CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH',
    'CORRECTED_PATH_REUSES_CURRENT_HIT_PATH',
    'CORRECTED_PATH_CAPTURES_BATCH1_LABEL',
    'CORRECTED_HIT_PATH_CAPTURES_NORMAL_LABEL',
    'OFFICIAL_IMAGE_TRACED',
    'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    'PIXEL_ALIGNED',
    'daegu-visual-match-batch1-operator-approved-v1',
    'sourceDataWritePerformed: false',
    'writesProductionData: false',
    'dataFileChanged: false',
    'This validation gate never writes `src/data/daeguSeatData.ts`.',
  ].forEach((requiredText) => {
    assert.ok(batch1ValidateSource.includes(requiredText), `Daegu batch1 validate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_COORDINATE_GUIDE_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'coordinate-guide',
    'currentVisualPath',
    'currentHitPath',
    'currentLabelPoint',
    'operatorEntrySkeleton',
    'red dashed=current visualPath',
    'Current paths are shown as red/purple evidence only and must not be copied.',
    'This guide never modifies `src/data/daeguSeatData.ts`.',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1CoordinateGuideSource.includes(requiredText), `Daegu batch1 coordinate guide should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_COORDINATE_PICKER_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_PICKER_DRAFT_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'coordinate-picker',
    'viewBox="0 0 1707 2048"',
    'toSvgPoint',
    'downloadDraft',
    "operatorDecision: 'DRAFT'",
    'DRAFT_REQUIRES_OPERATOR_APPROVAL_BEFORE_VALIDATE',
    'This picker never modifies `src/data/daeguSeatData.ts`.',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1CoordinatePickerSource.includes(requiredText), `Daegu batch1 coordinate picker should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_COORDINATE_DRAFT_IMPORT_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_PICKER_DRAFT_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'waiting-for-picker-draft',
    'PICKER_DRAFT_DECISION_MUST_BE_DRAFT',
    'APPROVED_NOT_ALLOWED_IN_PICKER_DRAFT',
    "operatorDecision: 'DRAFT'",
    'writesOperatorInput: false',
    'writesOperatorDraftInput: true',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1CoordinateDraftImportSource.includes(requiredText), `Daegu batch1 coordinate draft import should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_DRAFT_QUALITY_REPORT_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_COORDINATE_DRAFT_IMPORT_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'draft-quality',
    'waiting-for-picker-draft',
    'draft-quality-ready-for-operator-review',
    '--allow-blocked',
    'allowBlocked',
    'DRAFT_MISSING_CORRECTED_PATH',
    'DRAFT_LABEL_OUTSIDE_POLYGON',
    'DRAFT_REUSES_CURRENT_VISUAL_PATH',
    'DRAFT_PATH_CAPTURES_BATCH1_LABEL',
    'DRAFT_HIT_PATH_CAPTURES_NORMAL_LABEL',
    'DRAFT_FLOATING_RISK_REQUIRES_OPERATOR_OVERLAY_CONFIRMATION',
    'approvalCandidateRows',
    'This report never modifies `src/data/daeguSeatData.ts`.',
    'This report never converts `DRAFT` to `APPROVED`.',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1DraftQualitySource.includes(requiredText), `Daegu batch1 draft quality should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_IMAGE_DRAFT_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_PICKER_DRAFT_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0',
    'image-draft-ready',
    'image-assisted draft from official PNG crop',
    'const { default: sharp } = await import("sharp");',
    'traceTargets',
    'PIXEL_COMPONENT_VORONOI_PARTITION',
    'CONNECTED_COLOR_COMPONENT',
    'findColorComponents',
    'traceImageDrafts',
    'pixelColorCoverageRatio',
    'NO_VISIBLE_INTERNAL_BOUNDARY_IMAGE_PARTITIONED',
    'overlayCropPng',
    "'16'",
    "'U25'",
    "'S23'",
    "'S24'",
    "operatorDecision: 'DRAFT'",
    'DRAFT_REQUIRES_OPERATOR_APPROVAL_BEFORE_VALIDATE',
    'This script writes only a picker DRAFT artifact and image-draft reports.',
    'It never modifies `src/data/daeguSeatData.ts`.',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1ImageDraftSource.includes(requiredText), `Daegu batch1 image draft should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_IMAGE_EVIDENCE_AUDIT_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_COORDINATE_DRAFT_IMPORT_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0',
    'image-evidence-blocked',
    'image-evidence-ready-for-operator-review',
    'expectedColorFamilyByBlock',
    'DRAFT_LOW_OFFICIAL_SEAT_COLOR_COVERAGE',
    'DRAFT_DOMINANT_COLOR_FAMILY_MISMATCH',
    'CURRENT_OFF_SEAT_OR_BACKGROUND',
    'CURRENT_DOMINANT_COLOR_FAMILY_MISMATCH',
    'draftSeatColorCoverageRatio',
    'draftDominantColorFamily',
    'currentSeatColorCoverageRatio',
    'currentDominantColorFamily',
    'rowSvgDir',
    'Official PNG pixel evidence only. This audit never promotes DRAFT coordinates to APPROVED.',
    'This audit samples pixels from the official Daegu PNG only.',
    'It never modifies src/data/daeguSeatData.ts.',
    'It never writes operator input or corrections templates.',
    'It never converts DRAFT rows to APPROVED.',
    'It is not PASS_VISUAL_MATCH and not PASS_RELEASE_177.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesCorrectionsTemplate: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1ImageEvidenceAuditSource.includes(requiredText), `Daegu batch1 image evidence audit should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_CONFLICT_AUDIT_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_COORDINATE_DRAFT_IMPORT_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'visual-conflict-blocked',
    '--allow-conflicts',
    'allowConflicts',
    'DRAFT_HIT_PATH_CAPTURES_NORMAL_LABEL',
    'Do not approve this draft row until the locked normal block ownership is reviewed against the official PNG overlay.',
    'Resolve duplicate ownership or demote/retrace the conflicting locked normal blocks before operator APPROVED import.',
    'This audit checks image-assisted DRAFT paths against currently normal-selectable locked labels.',
    'It is a visual ownership gate only and never promotes DRAFT rows to APPROVED.',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1ConflictAuditSource.includes(requiredText), `Daegu batch1 conflict audit should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_WORKSET_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_COORDINATE_DRAFT_IMPORT_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'locked-baseline-retrace-required',
    'LOCKED_NORMAL_LABEL_INSIDE_BATCH1_DRAFT_HIT_PATH',
    'LOCKED_BASELINE_RETRACE_REQUIRED',
    'Hold BATCH_1 approval and retrace/demote the locked normal block ownership from the official PNG.',
    'Create operator-approved corrected paths for the locked conflict blocks or explicitly demote them before approving the BATCH_1 draft rows.',
    'This workset turns DRAFT-vs-normal label conflicts into locked baseline retrace targets.',
    'It never writes `src/data/daeguSeatData.ts` and never converts `DRAFT` rows to `APPROVED`.',
    'approvalBlocked',
    'evidencePng',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1LockedConflictWorksetSource.includes(requiredText), `Daegu batch1 locked conflict workset should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_IMAGE_EVIDENCE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_WORKSET_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0',
    'locked-conflict-image-evidence-blocked',
    'locked-conflict-image-evidence-ready',
    'RETRACE_OR_DEMOTE_LOCKED_BASELINE_BEFORE_BATCH1_APPROVAL',
    'DRAFT_LOW_SEAT_COLOR_COVERAGE',
    'LOCKED_LOW_SEAT_COLOR_COVERAGE',
    'LOCKED_AND_DRAFT_SHARE_SEAT_AREA',
    'LOCKED_AND_DRAFT_SAME_COLOR_FAMILY',
    'lockedInsideDraftRatio',
    'draftInsideLockedRatio',
    'highOwnershipOverlapRows',
    'sameDominantColorFamilyRows',
    'Official PNG locked-conflict pixel evidence only. This audit never promotes DRAFT or locked rows to APPROVED.',
    'This audit samples pixels from the official Daegu PNG only.',
    'It reads the locked conflict workset and writes only evidence artifacts.',
    'It never modifies src/data/daeguSeatData.ts.',
    'It never writes operator input or corrections templates.',
    'It never converts DRAFT rows or locked conflict rows to APPROVED.',
    'It is not PASS_VISUAL_MATCH and not PASS_RELEASE_177.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesCorrectionsTemplate: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1LockedConflictImageEvidenceAuditSource.includes(requiredText), `Daegu batch1 locked conflict image evidence audit should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_OPERATOR_PACKAGE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_WORKSET_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_IMAGE_EVIDENCE_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'LOCKED_CONFLICT_IMAGE_EVIDENCE_MISSING',
    'IMAGE_EVIDENCE_VERSION_MISMATCH',
    'LOCKED_CONFLICT_IMAGE_EVIDENCE_ROW_MISSING',
    'LOCKED_CONFLICT_IMAGE_EVIDENCE_SVG_MISSING',
    'RETRACE_APPROVED',
    'DEMOTE_REQUIRED',
    'lockedBaselineDecision',
    'draftSeatColorCoverageRatio',
    'lockedSeatColorCoverageRatio',
    'lockedInsideDraftRatio',
    'draftInsideLockedRatio',
    'sameDominantColorFamily',
    'highOwnershipOverlap',
    'RETRACE_OR_DEMOTE_LOCKED_BASELINE_BEFORE_BATCH1_APPROVAL',
    'DO_NOT_COPY_LOCKED_CURRENT_PATH_TO_CORRECTED_PATH',
    'Use only operator-approved official PNG retrace for RETRACE_APPROVED rows.',
    'Use DEMOTE_REQUIRED only when the locked normal block must leave normal selectable baseline before BATCH_1 approval.',
    'APPROVED rows require lockedBaselineDecision=RETRACE_APPROVED or DEMOTE_REQUIRED plus reviewer/reviewedAt.',
    'This package writes only locked conflict operator artifacts.',
    'It reads locked conflict image evidence before operator entry.',
    'It never modifies `src/data/daeguSeatData.ts`.',
    'It never converts image evidence into operator approval.',
    'Image evidence cannot approve, demote, retrace, or write production data.',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1LockedConflictOperatorPackageSource.includes(requiredText), `Daegu batch1 locked conflict operator package should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_OPERATOR_VALIDATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_OPERATOR_PACKAGE_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'RETRACE_APPROVED',
    'DEMOTE_REQUIRED',
    'RETRACE_LOCKED_BASELINE',
    'DEMOTE_LOCKED_BASELINE',
    'LOCKED_CORRECTED_HIT_CAPTURES_DRAFT_LABEL',
    'LOCKED_CORRECTED_HIT_CAPTURES_OTHER_NORMAL_LABEL',
    'LOCKED_CORRECTED_PATH_REUSES_CURRENT_PATH',
    'DEMOTE_REQUIRED_MISSING_OPERATOR_NOTE',
    'DEMOTE_REQUIRED_GEOMETRY_FIELDS_MUST_BE_EMPTY',
    'REJECTED_INVALID_LOCKED_BASELINE_DECISION',
    'REJECTED_MISSING_OPERATOR_NOTE',
    'REJECTED_GEOMETRY_FIELDS_MUST_BE_EMPTY',
    'REJECTED_REVIEW_IDENTITY_FIELDS_MUST_BE_EMPTY',
    'NEEDS_RETRACE_INVALID_LOCKED_BASELINE_DECISION',
    'NEEDS_RETRACE_MISSING_OPERATOR_NOTE',
    'NEEDS_RETRACE_GEOMETRY_FIELDS_MUST_BE_EMPTY',
    'NEEDS_RETRACE_REVIEW_IDENTITY_FIELDS_MUST_BE_EMPTY',
    'PENDING_INVALID_LOCKED_BASELINE_DECISION',
    'PENDING_GEOMETRY_FIELDS_MUST_BE_EMPTY',
    'PENDING_REVIEW_IDENTITY_FIELDS_MUST_BE_EMPTY',
    'PENDING_OPERATOR_NOTE_MUST_BE_EMPTY',
    'INPUT_IMAGE_EVIDENCE_STATUS_NOT_READY',
    'INPUT_IMAGE_EVIDENCE_ROW_COUNT_MISMATCH',
    'LOCKED_CONFLICT_IMAGE_EVIDENCE_SVG_MISSING',
    'LOCKED_CONFLICT_IMAGE_EVIDENCE_METRIC_MISSING',
    'draftSeatColorCoverageRatio',
    'lockedSeatColorCoverageRatio',
    'lockedInsideDraftRatio',
    'draftInsideLockedRatio',
    'imageEvidenceSvgExists',
    'daegu-visual-match-batch1-locked-conflict-approved-v1',
    'daegu-seatmap-visual-match-batch1-locked-conflict-dry-run-plan.csv',
    'daegu-seatmap-visual-match-batch1-locked-conflict-dry-run-plan.md',
    'dryRunPlanDiffRows',
    'dryRunPlanValidationStatus',
    'DRY_RUN_ROW_COUNT_MISMATCH',
    'DRY_RUN_SOURCE_POLICY_MISMATCH',
    'DRY_RUN_RETRACE_TRACE_STATUS_MISMATCH',
    'DRY_RUN_RETRACE_TRACE_METHOD_MISMATCH',
    'DRY_RUN_RETRACE_D_VISUAL_PATH_MISMATCH',
    'DRY_RUN_DEMOTE_TRACE_STATUS_MISMATCH',
    'DRY_RUN_DEMOTE_TRACE_METHOD_MISMATCH',
    'DRY_RUN_DEMOTE_GEOMETRY_FIELDS_MUST_BE_EMPTY',
    'currentValue',
    'nextValue',
    'imageGeometry.visualPath',
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.manualReviewed',
    'imageGeometry.pixelAlignmentStatus',
    'imageGeometry.geometryVersion',
    'Dry-run plan writes JSON/CSV/MD artifacts only.',
    'It never writes src/data/daeguSeatData.ts.',
    'Dry-run only. Do not modify src/data/daeguSeatData.ts without a guarded production writer.',
    'Decision-Specific Preflight',
    '`DEMOTE_REQUIRED` requires operatorNote and must leave corrected geometry fields empty.',
    '`REJECTED` requires lockedBaselineDecision=REJECTED, operatorNote, and empty corrected geometry/review identity fields.',
    '`NEEDS_RETRACE` requires lockedBaselineDecision=PENDING, operatorNote, and empty corrected geometry/review identity fields.',
    '`PENDING` rows must leave decision, geometry, review identity, and operatorNote fields empty.',
    'This gate validates only operator-approved locked baseline conflict rows.',
    'It never writes `src/data/daeguSeatData.ts`.',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1LockedConflictOperatorValidateSource.includes(requiredText), `Daegu batch1 locked conflict operator validate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_DECISION_BOARD_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_WORKSET_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_OPERATOR_PACKAGE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_OPERATOR_VALIDATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_IMAGE_EVIDENCE_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'LOCKED_CONFLICT_IMAGE_EVIDENCE_MISSING',
    'IMAGE_EVIDENCE_VERSION_MISMATCH',
    'LOCKED_CONFLICT_IMAGE_EVIDENCE_ROW_MISSING',
    'LOCKED_CONFLICT_IMAGE_EVIDENCE_SVG_MISSING',
    'RETRACE_APPROVED',
    'DEMOTE_REQUIRED',
    'REJECTED',
    'NEEDS_RETRACE',
    'waiting-for-locked-conflict-decision',
    'ready-for-batch1-seat-approval',
    'draftLabelInsideLocked',
    'lockedLabelInsideDraft',
    'bboxOverlapArea',
    'draftSeatColorCoverageRatio',
    'lockedSeatColorCoverageRatio',
    'lockedInsideDraftRatio',
    'draftInsideLockedRatio',
    'sameDominantColorFamily',
    'highOwnershipOverlap',
    'Resolve U31/S23 locked conflict operator rows before approving the conflicting BATCH_1 seat rows.',
    'daegu-seatmap-visual-match-batch1-locked-conflict-decision-board.json',
    'daegu-seatmap-visual-match-batch1-locked-conflict-decision-board.md',
    'daegu-seatmap-visual-match-batch1-locked-conflict-decision-board.svg',
    'This decision board reads locked conflict workset, operator input, and validation artifacts only.',
    'This decision board reads locked conflict image evidence as evidence only.',
    'It never writes operator input, corrections templates, production data, or src/data/daeguSeatData.ts.',
    'It never promotes image-assisted DRAFT rows to APPROVED.',
    'It never converts image evidence into operator approval.',
    'Coverage and overlap metrics are evidence only; they cannot approve or write coordinates.',
    'U31 and S23 remain blocked until operator-approved locked conflict decisions validate.',
    'It is not PASS_VISUAL_MATCH and not PASS_RELEASE_177.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesCorrectionsTemplate: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1LockedConflictDecisionBoardSource.includes(requiredText), `Daegu batch1 locked conflict decision board should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_ENTRY_GUIDE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_OPERATOR_PACKAGE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_OPERATOR_VALIDATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_DECISION_BOARD_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'waiting-for-locked-conflict-operator-entry',
    'operator-entry-in-progress',
    'RETRACE_APPROVED',
    'DEMOTE_REQUIRED',
    'REJECTED',
    'NEEDS_RETRACE',
    'correctedPath=official PNG retrace for the locked baseline block',
    'Leave correctedPath/correctedHitPath/correctedLabelX/correctedLabelY empty.',
    'operatorDecision=REJECTED',
    'operatorDecision=NEEDS_RETRACE',
    'editableJsonSkeletons',
    'requiredFieldsByDecision',
    'IMAGE_EVIDENCE_SVG_MISSING',
    'VALIDATION_ROW_MISSING',
    'DECISION_BOARD_ROW_MISSING',
    'This entry guide reads operator input, validation, and decision board artifacts only.',
    'It never writes operator input, corrections templates, production data, or src/data/daeguSeatData.ts.',
    'It never converts image evidence into operator approval.',
    'It is not PASS_VISUAL_MATCH and not PASS_RELEASE_177.',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesCorrectionsTemplate: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1LockedConflictEntryGuideSource.includes(requiredText), `Daegu batch1 locked conflict entry guide should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_DRY_RUN_REVIEW_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_DRY_RUN_APPLY_PLAN_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_DRY_RUN_PLAN_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'APPROVED_ROWS_REQUIRED_FOR_DRY_RUN_REVIEW',
    'onlyNoApprovedBlocker',
    'approvedRows=0 blocks dry-run review by default',
    'ready-for-manual-diff-review',
    'blocked-no-approved-rows',
    'daegu-seatmap-visual-match-batch1-dry-run-review.json',
    'daegu-seatmap-visual-match-batch1-dry-run-review.md',
    'This review reads dry-run plans only.',
    'It never writes operator input, corrections templates, production data, or src/data/daeguSeatData.ts.',
    'It never writes `src/data/daeguSeatData.ts`.',
    'PASS_RELEASE_177 remains blocked',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1DryRunReviewSource.includes(requiredText), `Daegu batch1 dry-run review should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_REVIEW_BOARD_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0',
    'BATCH1_SEAT_SECTION',
    'LOCKED_CONFLICT',
    'BATCH1_OPERATOR_INPUT',
    'LOCKED_CONFLICT_OPERATOR_INPUT',
    'LOCKED_CONFLICT_REQUIRES_DECISION_BEFORE_BATCH1_APPROVAL',
    'BATCH1_APPROVED_WHILE_LOCKED_CONFLICT_OPEN',
    'U31 and S23 must not be approved until locked conflict rows are resolved.',
    'approvalCandidateSeatRows',
    'conflictBlockedSeatRows',
    'daegu-seatmap-visual-match-batch1-review-board.json',
    'daegu-seatmap-visual-match-batch1-review-board.md',
    'This review board writes only JSON/CSV/MD artifacts under reports/stadium/daegu-visual-match-batch1/review-board.',
    'It never modifies src/data/daeguSeatData.ts.',
    'It never writes operator input or corrections templates.',
    'It never promotes image-assisted DRAFT rows to APPROVED.',
    'PASS_RELEASE_177 remains blocked',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1ReviewBoardSource.includes(requiredText), `Daegu batch1 review board should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_APPROVAL_SMOKE_V1',
    'BATCH1_APPROVAL_SMOKE_ONLY',
    'SMOKE_VALID_APPROVED_ROWS_NOT_CREATED',
    'SMOKE_DRY_RUN_PATCH_ROWS_NOT_CREATED',
    'synthetic isolated fixture',
    'It proves only that an APPROVED row can create a dry-run apply plan.',
    'The smoke correctedPath must not be copied into production.',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1ApprovalSmokeSource.includes(requiredText), `Daegu batch1 approval smoke should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_READINESS_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'DAEGU_VISUAL_MATCH_BATCH1_REVIEW_BOARD_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_OPERATOR_VALIDATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_OPERATOR_VALIDATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_DECISION_BOARD_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_ENTRY_GUIDE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_LOCKED_CONFLICT_IMAGE_EVIDENCE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_IMAGE_EVIDENCE_AUDIT_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_DRY_RUN_REVIEW_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_APPROVAL_SMOKE_V1',
    'blocked-image-evidence',
    'blocked-locked-conflict-image-evidence',
    'blocked-locked-conflict-entry-guide',
    'blocked-locked-conflicts',
    'waiting-for-seat-operator-approval',
    'ready-for-manual-diff-review',
    '--require-ready',
    'PASS_UI_CONTAINMENT',
    'visualMatchReady: false',
    'releaseReady: false',
    'Resolve U31/S23 locked conflict operator rows before approving the conflicting BATCH_1 seat rows.',
    'Fix image-evidence blocker rows such as draft color-family mismatches before operator approval.',
    'Generate locked conflict image evidence before operator decisions are accepted.',
    'Generate locked conflict entry guide before operator decisions are accepted.',
    'IMAGE_EVIDENCE_BLOCKER_ROWS',
    'LOCKED_CONFLICT_DECISION_BOARD_ROW_COUNT_MISMATCH',
    'LOCKED_CONFLICT_ENTRY_GUIDE_ROW_COUNT_MISMATCH',
    'LOCKED_CONFLICT_IMAGE_EVIDENCE_ROW_COUNT_MISMATCH',
    'lockedDecisionBoardStatus',
    'validLockedDecisionBoardRows',
    'lockedConflictEntryGuideStatus',
    'lockedConflictEntryGuideRows',
    'lockedConflictEntryCompleteRows',
    'lockedConflictEntryPendingRows',
    'lockedConflictEntryGuideReady',
    'lockedConflictImageEvidenceStatus',
    'lockedConflictImageEvidenceReady',
    'lockedConflictHighOverlapRows',
    'lockedConflictSameFamilyRows',
    'imageEvidenceAuditStatus',
    'imageEvidenceBlockerRows',
    'currentOffSeatRows',
    'currentWrongColorFamilyRows',
    'draftColorFamilyMismatchRows',
    'Fill operator-approved correctedPath/correctedLabelX/Y/reviewer/reviewedAt for at least one non-conflict BATCH_1 seat row.',
    'This readiness gate reads generated review and validation artifacts only.',
    'It never writes operator input, corrections templates, production data, or src/data/daeguSeatData.ts.',
    'It does not promote image-assisted DRAFT rows to APPROVED.',
    'It is not PASS_VISUAL_MATCH and not PASS_RELEASE_177.',
    'PASS_RELEASE_177 remains blocked',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesCorrectionsTemplate: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'dataFileChanged: false',
  ].forEach((requiredText) => {
    assert.ok(batch1ReadinessSource.includes(requiredText), `Daegu batch1 readiness should include ${requiredText}`);
  });
});

test('대구 visual match batch1 closeout gate는 공식 PNG 근거와 production write 금지를 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const closeoutGateSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-closeout-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-closeout-gate": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-closeout-gate"'));

  [
    'DAEGU_VISUAL_MATCH_BATCH1_CLOSEOUT_GATE_V1',
    'BATCH_1_SCREENSHOT_ZONE_FIRST',
    'APPROVAL_READY',
    'RETRACE_REQUIRED_CONTINUOUS_COMPONENT',
    'SEQUENCE_CONFIRMATION_REQUIRED',
    'PAIR_RETRACE_REQUIRED',
    'NORMAL_SELECTABLE_BASELINE_BLOCKS',
    'rowFromGrid',
    'rowFromCurrentGeometry',
    'currentOfficialBaseline',
    'U28',
    'U31',
    'S22',
    'S23',
    'DAEGU_IMAGE_SHA256',
    'const { default: sharp } = await import("sharp");',
    'samplePathImageEvidence',
    'normalSelectableRows',
    'BATCH1_CLOSEOUT_READY_RELEASE_BLOCKED',
    'operatorDecision=APPROVED, correctedPath, correctedLabelX/Y, reviewer, and reviewedAt',
    'This closeout gate samples only the official Daegu PNG.',
    'It classifies Batch1 rows; it does not approve operator rows.',
    'It never writes src/data/daeguSeatData.ts.',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false',
    'productionWriteAllowed: false',
    'writesOperatorInput: false',
    'writesCorrectionsTemplate: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(closeoutGateSource.includes(requiredText), `Daegu batch1 closeout gate should include ${requiredText}`);
  });
});

test('대구 visual match batch1 next operator packet은 approval-only와 retrace queue를 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const approvalOnlyGateSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const retraceQueueSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-approval-only-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-retrace-queue"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-next-operator-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-next-operator-packet": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-next-operator-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-next-operator-packet": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-next-operator-packet"'));

  [
    'DAEGU_VISUAL_MATCH_BATCH1_APPROVAL_ONLY_GATE_V1',
    'APPROVAL_ONLY_WAITING_FOR_OPERATOR_INPUT_RELEASE_BLOCKED',
    'APPROVED_INPUT_PRESENT_DRY_RUN_ONLY_RELEASE_BLOCKED',
    'DISALLOWED_APPROVAL_BLOCKS',
    'U28',
    'U29',
    'U30',
    'U31',
    'S24',
    '13',
    '16',
    'U25',
    'U27',
    'S22',
    'S23',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'This packet never writes src/data/daeguSeatData.ts.',
    'It rejects DISALLOWED_APPROVAL_BLOCKS from approval-only output.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(approvalOnlyGateSource.includes(requiredText), `Daegu approval-only gate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_RETRACE_QUEUE_V1',
    'BATCH1_RETRACE_QUEUE_READY_RELEASE_BLOCKED',
    'RETRACE_REQUIRED_CONTINUOUS_COMPONENT',
    'SEQUENCE_CONFIRMATION_REQUIRED',
    'PAIR_RETRACE_REQUIRED',
    'NORMAL_SELECTABLE_BASELINE_BLOCKS',
    '13',
    '16',
    'U25',
    'U27',
    'S22',
    'S23',
    'U28',
    'S24',
    'It never writes src/data/daeguSeatData.ts.',
    'This queue is evidence for manual retrace only.',
    'It does not produce operator approvals or production correctedPath values.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(retraceQueueSource.includes(requiredText), `Daegu retrace queue should include ${requiredText}`);
  });
});

test('대구 visual match batch1 U28-U31은 이미지 분석 후보를 operator gate로만 연결한다', () => {
  const packageSource = readProjectFile('package.json');
  const operatorPackageSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const approvalGateSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const approvalSmokeSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u28-u31-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u28-u31-approval-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u28-u31-approval-gate:require-approved"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u28-u31-approval-smoke"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u28-u31-approval-smoke": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-u28-u31-approval-smoke"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u28-u31-approval-smoke": "node scripts/stadium-seatmap-ops.mjs daegu visual-match-batch1-u28-u31-approval-smoke"'));

  [
    'DAEGU_VISUAL_MATCH_BATCH1_U28_U31_OPERATOR_PACKAGE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_U28_U31_OPERATOR_INPUT_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_U28_U31_ROW_ANALYSIS_V1',
    'U28_U31_OPERATOR_PACKAGE_READY_RELEASE_BLOCKED',
    "'U31', 'U30', 'U29', 'U28'",
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'This package is derived from the official Daegu PNG U28-U31 row analysis.',
    'It never writes src/data/daeguSeatData.ts.',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(operatorPackageSource.includes(requiredText), `Daegu U28-U31 operator package should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_U28_U31_APPROVAL_GATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_U28_U31_DRY_RUN_APPLY_PLAN_V1',
    'daegu-visual-match-batch1-u28-u31-approved-v1',
    'APPROVED_ROWS_REQUIRED_FOR_U28_U31_APPROVAL_GATE',
    'SEQUENCE_GROUP_PARTIAL',
    'Partial U28-U31 sequence approval is blocked to prevent shared ownership drift.',
    'It emits a dry-run apply plan only.',
    'It never writes src/data/daeguSeatData.ts.',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(approvalGateSource.includes(requiredText), `Daegu U28-U31 approval gate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_U28_U31_APPROVAL_SMOKE_V1',
    'no-approval-waiting',
    'partial-sequence-approval-blocked',
    'full-sequence-approved',
    'bad-label-blocked',
    'The smoke uses fixture copies of the operator input only.',
    'It never writes src/data/daeguSeatData.ts.',
  ].forEach((requiredText) => {
    assert.ok(approvalSmokeSource.includes(requiredText), `Daegu U28-U31 approval smoke should include ${requiredText}`);
  });
});

test('대구 visual match batch1 S25-S31은 legacy 좌표 대신 공식 PNG component scan을 사용한다', () => {
  const packageSource = readProjectFile('package.json');
  const rowAnalysisSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const operatorPackageSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const approvalGateSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const approvalSmokeSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-s25-s31-row-analysis"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-s25-s31-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-s25-s31-approval-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-s25-s31-approval-gate:require-approved"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-s25-s31-approval-smoke"'));

  [
    'DAEGU_VISUAL_MATCH_BATCH1_S25_S31_ROW_ANALYSIS_V1',
    "'S31', 'S30', 'S29', 'S28', 'S27', 'S26', 'S25'",
    'floodMagentaComponents',
    'pathFromHull',
    'S_ROW_DIAGONAL_MIN',
    'S_ROW_DIAGONAL_MAX',
    'S25-S31 are selected from official PNG magenta connected components, not from the legacy rectangle coordinates.',
    'The S row is separated from adjacent U blocks by the diagonal offset cy-cx',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(rowAnalysisSource.includes(requiredText), `Daegu S25-S31 row analysis should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_S25_S31_OPERATOR_PACKAGE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_S25_S31_OPERATOR_INPUT_V1',
    'This package is derived from the official Daegu PNG S25-S31 component scan.',
    'It never writes src/data/daeguSeatData.ts.',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false.',
  ].forEach((requiredText) => {
    assert.ok(operatorPackageSource.includes(requiredText), `Daegu S25-S31 operator package should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_S25_S31_APPROVAL_GATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_S25_S31_DRY_RUN_APPLY_PLAN_V1',
    'daegu-visual-match-batch1-s25-s31-approved-v1',
    'APPROVED_ROWS_REQUIRED_FOR_S25_S31_APPROVAL_GATE',
    'SEQUENCE_GROUP_PARTIAL',
    'Partial S25-S31 sequence approval is blocked to prevent shared ownership drift.',
    'It emits a dry-run apply plan only.',
    'It never writes src/data/daeguSeatData.ts.',
  ].forEach((requiredText) => {
    assert.ok(approvalGateSource.includes(requiredText), `Daegu S25-S31 approval gate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_S25_S31_APPROVAL_SMOKE_V1',
    'no-approval-waiting',
    'partial-sequence-approval-blocked',
    'full-sequence-approved',
    'bad-label-blocked',
    'The smoke uses fixture copies of the operator input only.',
    'It never writes src/data/daeguSeatData.ts.',
  ].forEach((requiredText) => {
    assert.ok(approvalSmokeSource.includes(requiredText), `Daegu S25-S31 approval smoke should include ${requiredText}`);
  });
});

test('대구 visual match batch1 U10-U14는 U15-U19 locked guard를 유지하고 공식 PNG component scan을 사용한다', () => {
  const packageSource = readProjectFile('package.json');
  const rowAnalysisSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const operatorPackageSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const approvalGateSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const approvalSmokeSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u10-u14-row-analysis"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u10-u14-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u10-u14-approval-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u10-u14-approval-gate:require-approved"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-u10-u14-approval-smoke"'));

  [
    'DAEGU_VISUAL_MATCH_BATCH1_U10_U14_ROW_ANALYSIS_V1',
    "'U10', 'U11', 'U12', 'U13', 'U14'",
    "'U15', 'U16', 'U17', 'U18', 'U19'",
    'floodMagentaComponents',
    'pathFromHull',
    'U_ROW_DIAGONAL_MIN',
    'U_ROW_DIAGONAL_MAX',
    'U10-U14 are selected from official PNG magenta connected components, not from the legacy rectangle coordinates.',
    'U15-U19 are kept as locked guard rows',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(rowAnalysisSource.includes(requiredText), `Daegu U10-U14 row analysis should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_U10_U14_OPERATOR_PACKAGE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_U10_U14_OPERATOR_INPUT_V1',
    'This package is derived from the official Daegu PNG U10-U14 component scan.',
    'U15-U19 are locked guard rows and are not rewritten by this package.',
    'It never writes src/data/daeguSeatData.ts.',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false.',
  ].forEach((requiredText) => {
    assert.ok(operatorPackageSource.includes(requiredText), `Daegu U10-U14 operator package should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_U10_U14_APPROVAL_GATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_U10_U14_DRY_RUN_APPLY_PLAN_V1',
    'daegu-visual-match-batch1-u10-u14-approved-v1',
    'APPROVED_ROWS_REQUIRED_FOR_U10_U14_APPROVAL_GATE',
    'SEQUENCE_GROUP_PARTIAL',
    'Partial U10-U14 diagonal sequence approval is blocked to prevent shared ownership drift.',
    'It emits a dry-run apply plan only.',
    'It never writes src/data/daeguSeatData.ts.',
  ].forEach((requiredText) => {
    assert.ok(approvalGateSource.includes(requiredText), `Daegu U10-U14 approval gate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_U10_U14_APPROVAL_SMOKE_V1',
    'no-approval-waiting',
    'partial-sequence-approval-blocked',
    'full-sequence-approved',
    'bad-label-blocked',
    'The smoke uses fixture copies of the operator input only.',
    'It never writes src/data/daeguSeatData.ts.',
  ].forEach((requiredText) => {
    assert.ok(approvalSmokeSource.includes(requiredText), `Daegu U10-U14 approval smoke should include ${requiredText}`);
  });
});

test('대구 visual match batch1 V1은 V2/V3 hard guard를 유지하고 공식 PNG olive component scan을 사용한다', () => {
  const packageSource = readProjectFile('package.json');
  const boundaryAnalysisSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const operatorPackageSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const approvalGateSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const approvalSmokeSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-v1-boundary-analysis"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-v1-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-v1-approval-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-v1-approval-gate:require-approved"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-v1-approval-smoke"'));

  [
    'DAEGU_VISUAL_MATCH_BATCH1_V1_BOUNDARY_ANALYSIS_V1',
    "'V1'",
    "'V2', 'V3'",
    'floodOliveComponents',
    'pathFromHull',
    'OFFICIAL_PNG_OLIVE_COMPONENT_SCAN',
    'V1 is selected from official PNG olive connected components, not from the legacy rectangle coordinates.',
    'V2 and V3 are hard guard rows',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(boundaryAnalysisSource.includes(requiredText), `Daegu V1 boundary analysis should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_V1_OPERATOR_PACKAGE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_V1_OPERATOR_INPUT_V1',
    'This package is derived from the official Daegu PNG V1 olive component scan.',
    'V2 and V3 are hard guard rows and are not rewritten by this package.',
    'It never writes src/data/daeguSeatData.ts.',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false.',
  ].forEach((requiredText) => {
    assert.ok(operatorPackageSource.includes(requiredText), `Daegu V1 operator package should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_V1_APPROVAL_GATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_V1_DRY_RUN_APPLY_PLAN_V1',
    'daegu-visual-match-batch1-v1-approved-v1',
    'APPROVED_ROWS_REQUIRED_FOR_V1_APPROVAL_GATE',
    'HARD_GUARD_OVERLAP',
    'V2 and V3 are hard guard rows; approved V1 cannot overlap them beyond the guard threshold.',
    'It emits a dry-run apply plan only.',
    'It never writes src/data/daeguSeatData.ts.',
  ].forEach((requiredText) => {
    assert.ok(approvalGateSource.includes(requiredText), `Daegu V1 approval gate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_V1_APPROVAL_SMOKE_V1',
    'no-approval-waiting',
    'v1-approved',
    'bad-label-blocked',
    'guard-overlap-blocked',
    'The smoke uses fixture copies of the operator input only.',
    'It never writes src/data/daeguSeatData.ts.',
  ].forEach((requiredText) => {
    assert.ok(approvalSmokeSource.includes(requiredText), `Daegu V1 approval smoke should include ${requiredText}`);
  });
});

test('대구 visual match batch1 1-2/T1-4는 중복 current path를 공식 PNG 색상 component로 분리한다', () => {
  const packageSource = readProjectFile('package.json');
  const sharedAnalysisSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const operatorPackageSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const approvalGateSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');
  const approvalSmokeSource = readProjectFile('scripts/daegu-seatmap-visual-match.mjs');

  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-1-2-t1-4-shared-analysis"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-1-2-t1-4-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-1-2-t1-4-approval-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-1-2-t1-4-approval-gate:require-approved"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-match-batch1-1-2-t1-4-approval-smoke"'));

  [
    'DAEGU_VISUAL_MATCH_BATCH1_1_2_T1_4_SHARED_ANALYSIS_V1',
    "'1-2', 'T1-4'",
    "'1-3', '1-1', 'T1-3'",
    'OFFICIAL_PNG_FIRST_BASE_SHARED_COMPONENT_SCAN',
    'floodColorComponents',
    'MAGENTA',
    'TEAL',
    'CURRENT_PATH_DUPLICATE',
    '1-2 and T1-4 are split from official PNG color components, not from their duplicated current production paths.',
    'T1-4 uses the official PNG teal component anchor because the current label is on the duplicated 1-2 path.',
    'productionWriteAllowed: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'passVisualMatch: false',
    'passRelease177: false',
  ].forEach((requiredText) => {
    assert.ok(sharedAnalysisSource.includes(requiredText), `Daegu 1-2/T1-4 shared analysis should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_1_2_T1_4_OPERATOR_PACKAGE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_1_2_T1_4_OPERATOR_INPUT_V1',
    'This package is derived from the official Daegu PNG 1-2/T1-4 shared component scan.',
    '1-3, 1-1, and T1-3 are hard guard rows and are not rewritten by this package.',
    'It never writes src/data/daeguSeatData.ts.',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'PASS_VISUAL_MATCH and PASS_RELEASE_177 remain false.',
  ].forEach((requiredText) => {
    assert.ok(operatorPackageSource.includes(requiredText), `Daegu 1-2/T1-4 operator package should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_1_2_T1_4_APPROVAL_GATE_V1',
    'DAEGU_VISUAL_MATCH_BATCH1_1_2_T1_4_DRY_RUN_APPLY_PLAN_V1',
    'daegu-visual-match-batch1-1-2-t1-4-approved-v1',
    'APPROVED_ROWS_REQUIRED_FOR_1_2_T1_4_APPROVAL_GATE',
    'SHARED_GROUP_PARTIAL',
    'APPROVED_SHARED_OVERLAP',
    'Partial 1-2/T1-4 shared group approval is blocked to prevent duplicate ownership drift.',
    'It emits a dry-run apply plan only.',
    'It never writes src/data/daeguSeatData.ts.',
  ].forEach((requiredText) => {
    assert.ok(approvalGateSource.includes(requiredText), `Daegu 1-2/T1-4 approval gate should include ${requiredText}`);
  });

  [
    'DAEGU_VISUAL_MATCH_BATCH1_1_2_T1_4_APPROVAL_SMOKE_V1',
    'no-approval-waiting',
    'partial-shared-group-approval-blocked',
    'full-shared-group-approved',
    'bad-label-blocked',
    'shared-overlap-blocked',
    'The smoke uses fixture copies of the operator input only.',
    'It never writes src/data/daeguSeatData.ts.',
  ].forEach((requiredText) => {
    assert.ok(approvalSmokeSource.includes(requiredText), `Daegu 1-2/T1-4 approval smoke should include ${requiredText}`);
  });
});
