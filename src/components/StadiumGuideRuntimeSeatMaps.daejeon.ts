import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { KBO_STADIUMS } from '../utils/stadiumData';
import {
  resolveStadiumSeatMapEntry,
  STADIUM_SEAT_MAP_ENTRIES,
} from './stadiumSeatMapRegistry';
import { DAEGU_CANONICAL_BLOCKS } from '../data/daeguCanonicalSeatMap';
import {
  SUWON_ALIGNMENT_PROBES,
  SUWON_BROWSER_QA_PROBES,
  SUWON_BLOCKS,
  SUWON_HIT_TEST_PROBES,
} from '../data/suwonSeatData';
import {
  filterAndRankDaeguSeatMapBlocks,
  rankDaeguSeatMapSearchResult,
} from './daegu/daeguSeatMapSearch';
import {
  OPERATIONAL_STADIUM_SEAT_MAP_ENTRIES,
  STADIUM_SEATMAP_CONTRACTS,
  STADIUM_TEAM_FALLBACK_CASES,
  diffSet,
  formatProbeDiffByBlock,
  projectRoot,
  probeKey,
  readImageDimensions,
  readProjectFile,
  snapshotSuwonProbeKeySets,
  snapshotSuwonSeatFixture,
  splitProbeKeysByBlock,
  suwonFixtureSignature,
  uniqueSorted,
} from './StadiumGuideRuntimeSeatMaps.support';

test('Stadium QA runner는 generic smoke 포트 충돌 회피와 실패 진단을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');

  assert.ok(packageSource.includes('"qa:stadium:mobile": "node scripts/qa-presets.mjs stadium-mobile all"'));
  assert.ok(packageSource.includes('"qa:stadium:mobile:smoke": "node scripts/qa-presets.mjs stadium-mobile smoke"'));
  assert.ok(packageSource.includes('"qa:stadium:mobile:attached"'));
  assert.ok(packageSource.includes('"qa:stadium:mobile:smoke:attached"'));
  assert.ok(runnerSource.includes("modeToken === 'SMOKE'"));
  assert.ok(runnerSource.includes('SMOKE_VIEWPORTS'));
  assert.ok(runnerSource.includes('portListenerDiagnostics'));
  assert.ok(runnerSource.includes('auditChildPid='));
  assert.ok(runnerSource.includes('classifyQaFailure'));
  assert.ok(runnerSource.includes('failureCategory='));
  assert.ok(runnerSource.includes("'hmr-reload'"));
  assert.ok(runnerSource.includes("'coordinate'"));
  assert.ok(runnerSource.includes("'server'"));
  assert.ok(runnerSource.includes('Output dir:'));
  assert.ok(runnerSource.includes('Summary path:'));
  assert.ok(runnerSource.includes('Post-run listener PID(s):'));
});

test('대전 trace review QA는 P2 retired alias 제거 계약과 139개 traced 기준을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const evidenceSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const manifestSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const anchorCropSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );

  assert.ok(packageSource.includes('"stadium:daejeon:trace-manifest": "node scripts/qa-presets.mjs stadium daejeon trace-manifest"'));
  assert.equal(packageSource.includes('"stadium:daejeon:evidence"'), false);
  assert.equal(packageSource.includes('"stadium:daejeon:anchor-crops"'), false);
  assert.equal(packageSource.includes('"qa:stadium:daejeon:trace-review"'), false);
  assert.ok(evidenceSource.includes('clearGeneratedCropImages'));
  assert.ok(evidenceSource.includes('DAEJEON_P2_DEDUPLICATED_ALIASES'));
  assert.ok(evidenceSource.includes('Retired alias has no operational geometry'));
  assert.ok(manifestSource.includes('anchorReviewCrops'));
  assert.ok(manifestSource.includes('special-400-accessible-first'));
  assert.ok(manifestSource.includes('special-425-426-third-accessible'));
  assert.ok(anchorCropSource.includes('daejeon-anchor-review-crops.json'));
  assert.ok(anchorCropSource.includes('special-accessible-outfield-third'));
  assert.ok(auditSource.includes('verifyDaejeonRetiredP2BlocksRemoved'));
  assert.ok(auditSource.includes('Daejeon official-traced label coordinate click target count should be 139'));
  assert.ok(auditSource.includes('outfield-reserved-third-423-330__424'));
  assert.ok(auditSource.includes('Daejeon image/path transform layer contract failed at ${label}'));
  assert.ok(auditSource.includes("assertDaejeonTransformLayerContract(2.49, 'manual-zoom-2.5')"));
  assert.ok(auditSource.includes('Daejeon visible highlight path should use imageGeometry.d'));
  assert.ok(auditSource.includes("selectPoint: { x: 143, y: 663 }"));
  assert.ok(auditSource.includes("selectPoint: { x: 109, y: 589 }"));
  [
    'innings-vip-400__400',
    'splash-jacuzzi-425__425',
    'splash-caravan-426__426',
    'central-accessible__center',
    'first-infield-accessible__first-infield',
    'third-infield-accessible__third-infield',
    'outfield-accessible-third__left-outfield',
    'outfield-accessible-first__right-outfield',
  ].forEach((id) => {
    assert.ok(auditSource.includes(id), `${id} should remain in Daejeon special/accessibility QA`);
  });
  [
    'outfield-reserved-first-301-404__301',
    'outfield-reserved-first-301-404__404',
    'outfield-reserved-third-423-330__327',
    'outfield-reserved-third-423-330__423',
  ].forEach((id) => {
    assert.ok(auditSource.includes(id), `${id} should remain in retired P2 removal QA`);
  });
});
test('대전 좌석도 release lock 문서는 최종 검수 계약을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const releaseLockSource = readProjectFile('docs/daejeon-seatmap-release-lock.md');
  const releaseGateSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const changeGuardSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const operatorHandoffSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const operatorApprovalSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const operatorApprovalTestSource = readProjectFile('scripts/daejeon-seatmap-operator-approval.test.mjs');
  const manifestSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const coverageReportSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const anchorCropSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const anchorCropContractSource = readProjectFile('scripts/daejeon-seatmap-anchor-contract.mjs');
  const blockEvidenceCropSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const visualDiffSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const visualBaselineSource = readProjectFile('src/data/daejeonAnchorVisualBaseline.json');
  const geometryDiffSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const geometryBaselineSource = readProjectFile('src/data/daejeonGeometryBaseline.json');

  [
    '공식 이미지 좌표계: `920x1060`',
    '`DAEJEON_BLOCKS.length === 139`',
    '`officialImageTraced=139`',
    '`needsOperatorReview=0`',
    '`DAEJEON_TRACE_REVIEW_QUEUE.length === 0`',
    '`labelTopHitFailures=0`',
    '`DAEJEON_COORDINATE_CHANGE_IMPACT_V1`',
    '`missingImpact=0`',
    '`DAEJEON_ANCHOR_VISUAL_BASELINE_V1`',
    '`changedCropCount=0`',
    '`metadataMismatchCount=0`',
    '`DAEJEON_GEOMETRY_BASELINE_V1`',
    '`changedBlockCount=0`',
    '`missingBlockCount=0`',
    '`extraBlockCount=0`',
    "`sourceConfidence='OFFICIAL'`",
    "`traceMethod='PATH_TRACED_FROM_OFFICIAL_IMAGE'`",
    "`traceStatus='OFFICIAL_IMAGE_TRACED'`",
    '`special-425-426-third-accessible`',
    '`outfield-reserved-first-301-404__301`',
    '`outfield-reserved-third-423-330__423`',
    '`reports/stadium/daejeon-seatmap-trace-review.md`',
    '`reports/stadium/daejeon-seatmap-p2-evidence-crops.md`',
    '`../output/playwright/daejeon-anchor-review/daejeon-anchor-review-crops.md`',
    '`src/data/daejeonAnchorVisualBaseline.json`',
    '`reports/stadium/daejeon-seatmap-visual-diff.md`',
    '`src/data/daejeonGeometryBaseline.json`',
    '`reports/stadium/daejeon-seatmap-geometry-diff.md`',
    '`reports/stadium/daejeon-seatmap-block-evidence-crops.md`',
    '`../output/playwright/stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.md`',
    '`reports/stadium/daejeon-seatmap-release-gate.md`',
    '표시용 highlight/stroke는 `imageGeometry.d`만 사용한다.',
    '클릭/터치 hit path는 `hitAreaD ?? imageGeometry.d`만 사용한다.',
    '외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.',
    'npm run qa:stadium:daejeon:release-lock',
    'node scripts/stadium-seatmap-ops.mjs daejeon change-guard',
    'node --test scripts/daejeon-seatmap-operator-approval.test.mjs',
    'npm run stadium:daejeon:operator-handoff',
    'npm run stadium:daejeon:operator-approval',
    'npm run stadium:daejeon:operator-approval:status',
    'npm run stadium:daejeon:operator-approval:approve -- --approved-by "seatmap-ops-reviewer" --notes "검수 완료"',
    'npm run stadium:daejeon:operator-approval:verify',
    'npm run qa:stadium:daejeon:release-approved',
    '`reports/stadium/daejeon-seatmap-operator-handoff.md`',
    '`reports/stadium/daejeon-seatmap-operator-handoff.json`',
    '`reports/stadium/daejeon-seatmap-operator-approval.json`',
    '`PENDING_OPERATOR_APPROVAL`',
    '`APPROVED`',
    '`STALE_APPROVAL`',
    '`--require-approved`',
    '`--approved-by`',
    '`--notes`',
    '임시 디렉터리 fixture',
    '운영 approval JSON을 수정하지 않는다',
    'release gate 리포트의 `operatorApproval` 섹션',
    'release-lock does not require operator approval',
    'JSON을 직접 편집하지 않고',
    '마지막 release gate 이후 변경됐는지 mtime으로 확인한다',
    '운영자는 trace manifest, P2 evidence, anchor crops, 브라우저 QA summary를 한 문서에서 확인하고 승인/반려 체크리스트를 처리한다.',
    'coordinate impact missingImpact=0',
    'anchor crop count: `28`',
    'anchor visual baseline: `expectedCropCount=28`',
    'anchor visual diff: `baselineCropCount=28`, `currentCropCount=28`, `changedCropCount=0`, `metadataMismatchCount=0`',
    '`first-104-106-detail`',
    '`third-116-121-detail`',
    'visual diff changedCropCount=0',
    'geometry diff changedBlockCount=0',
    'node scripts/stadium-seatmap-ops.mjs daejeon block-crops -- --codes 104,105',
    '파란 overlay는 visible `imageGeometry.d`, 빨간 dashed overlay는 click-only `hitAreaD`',
    '`PENDING_OPERATOR_APPROVAL`을 배포 승인으로 인정하지 않는다.',
    '승인된 handoff/release gate hash가 현재 산출물과 다르면 `STALE_APPROVAL`로 실패하고 운영 릴리즈를 차단한다.',
    '데이터 테스트, evidence 생성, anchor visual diff, geometry diff, coverage report, 브라우저 trace-review QA, production build',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  [
    '"qa:stadium:daejeon:mobile": "node scripts/qa-presets.mjs stadium daejeon mobile"',
    '"stadium:daejeon:status": "node scripts/qa-presets.mjs stadium daejeon status"',
    '"stadium:daejeon:pixel-components": "node scripts/qa-presets.mjs stadium daejeon pixel-components"',
    '"stadium:daejeon:trace-manifest": "node scripts/qa-presets.mjs stadium daejeon trace-manifest"',
    '"qa:stadium:daejeon:release-lock": "node scripts/qa-presets.mjs stadium daejeon release-lock"',
    '"stadium:daejeon:operator-handoff": "node scripts/qa-presets.mjs stadium daejeon operator-handoff"',
    '"stadium:daejeon:operator-approval": "node scripts/qa-presets.mjs stadium daejeon operator-approval"',
    '"stadium:daejeon:operator-approval:status": "node scripts/qa-presets.mjs stadium daejeon operator-approval:status"',
    '"stadium:daejeon:operator-approval:approve": "node scripts/qa-presets.mjs stadium daejeon operator-approval:approve"',
    '"stadium:daejeon:operator-approval:verify": "node scripts/qa-presets.mjs stadium daejeon operator-approval:verify"',
    '"qa:stadium:daejeon:release-approved": "node scripts/qa-presets.mjs stadium daejeon release-approved"',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  [
    '"stadium:daejeon:anchor-crops"',
    '"stadium:daejeon:block-crops"',
    '"stadium:daejeon:visual-diff"',
    '"stadium:daejeon:visual-baseline"',
    '"stadium:daejeon:geometry-diff"',
    '"stadium:daejeon:geometry-baseline"',
    '"stadium:daejeon:coverage-report"',
    '"stadium:daejeon:evidence"',
    '"qa:stadium:daejeon:trace-review"',
    '"qa:stadium:daejeon:change-guard"',
    '"test:stadium:daejeon:operator-approval"',
  ].forEach((removedText) => {
    assert.equal(packageSource.includes(removedText), false, `package script should not expose ${removedText}`);
  });

  [
    'EXPECTED_BLOCKS = 139',
    'EXPECTED_TRACED = 139',
    'EXPECTED_REVIEW = 0',
    'EXPECTED_P2_ALIASES = 11',
    'EXPECTED_ANCHOR_CROPS = 28',
    "'src/data/daejeonSeatData.test.ts'",
    "'src/components/StadiumGuideRuntimeSeatMaps.test.ts'",
    "'npm'",
    "'scripts/stadium-seatmap-ops.mjs'",
    "'visual-diff'",
    "'geometry-diff'",
    "'trace-review'",
    "'build'",
    'daejeon-seatmap-release-gate.json',
    'daejeon-seatmap-release-gate.md',
    'readOperatorApprovalSummary',
    'operatorApproval',
    'MISSING_APPROVAL',
    'UNKNOWN_APPROVAL_STATUS',
    'PENDING_OPERATOR_APPROVAL',
    'APPROVED',
    'hashMatchesReleaseGate',
    'deferred-to-release-approved',
    'release-lock does not require operator approval',
    'npm run qa:stadium:daejeon:release-approved',
    'overflowFailureCount === 0',
    'labelTopHitFailureCount === 0',
    "traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE'",
    'missingAnchorCropReviewMetadata',
    'DAEJEON_ANCHOR_CROP_REVIEW_V2',
    'reviewMetadataComplete',
    'priorityCounts',
    'reviewPriority',
    'riskTags',
    'p0AnchorCrops.length === 4',
    'p0RegressionTestIds',
    'p1RegressionTestIds',
    'p1RegressionWarningCropIds',
    'p2RegressionTestIds',
    'p2ManualOnlyCropIds',
    'p2RegressionWarningCropIds',
    'coordinateChangeImpactSummary',
    'DAEJEON_COORDINATE_CHANGE_IMPACT_V1',
    'DAEJEON_ANCHOR_VISUAL_BASELINE_V1',
    'visualDiffSummary',
    'visualDiff',
    'geometryDiffSummary',
    'geometryDiff',
    'changedCropCount === 0',
    'changedBlockCount === 0',
    'DAEJEON_GEOMETRY_BASELINE_V1',
    'metadataMismatchCount === 0',
    'missingImpact',
    'manifest and coverage coordinate impact counts must match',
    'jsonEqual',
    'P0 anchor crops missing data regression tests',
  ].forEach((requiredText) => {
    assert.ok(releaseGateSource.includes(requiredText), `release gate should include ${requiredText}`);
  });

  [
    'WATCH_FILES',
    'WATCH_DIRECTORIES',
    "'src/data/daejeonSeatData.ts'",
    "'src/data/daejeonAnchorVisualBaseline.json'",
    "'src/data/daejeonGeometryBaseline.json'",
    "'src/components/stadium/daejeon'",
    "'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.webp'",
    "'docs/daejeon-seatmap-release-lock.md'",
    "relativePath.startsWith('scripts/')",
    "path.basename(relativePath).startsWith('daejeon-')",
    'releaseGatePath',
    'validateFreshness',
    'stat.mtimeMs > generatedAtMs + staleToleranceMs',
    'status:passed',
    'expected?.totalBlocks === EXPECTED_BLOCKS',
    'expected?.officialImageTraced === EXPECTED_TRACED',
    'expected?.needsOperatorReview === EXPECTED_REVIEW',
    'precisionAudit?.labelTopHitFailureCount === 0',
    'coordinateChangeImpact',
    'coordinateChangeImpactSummary',
    'DAEJEON_COORDINATE_CHANGE_IMPACT_V1',
    'DAEJEON_ANCHOR_VISUAL_BASELINE_V1',
    'visualDiff',
    'changedCropCount === 0',
    'geometryDiff',
    'changedBlockCount === 0',
    'DAEJEON_GEOMETRY_BASELINE_V1',
    'metadataMismatchCount === 0',
    'overflowFailureCount === 0',
    'Re-run `npm run qa:stadium:daejeon:release-lock`',
  ].forEach((requiredText) => {
    assert.ok(changeGuardSource.includes(requiredText), `change guard should include ${requiredText}`);
  });

  [
    'daejeon-seatmap-operator-handoff.json',
    'daejeon-seatmap-operator-handoff.md',
    'releaseGatePath',
    'validateReleaseGate',
    'validateArtifacts',
    'approvalChecklist',
    'lockedDecisions',
    'keyAnchorCropIds',
    'traceManifest',
    'p2Evidence',
    'anchorCrops',
    'visualDiff',
    'geometryDiff',
    'browserQa',
    'labelTopHitFailureCount',
    'overflowFailureCount',
    'P2 Retired Alias Policy',
    'Operator Review Steps',
    'Approval Checklist',
    'Operator Approval',
    'approvedHandoffHash',
    'approvedReleaseGateHash',
    'DAEJEON_OPERATOR_APPROVAL_V1',
    'operator handoff releaseGate.generatedAt must match current release gate',
    '--approved-by must be a real operator identifier',
    'PENDING_OPERATOR_APPROVAL hash does not match current handoff/release gate artifacts',
    'const runOperatorApproval = async (taskArgs = process.argv.slice(2)',
    'await runner(args);',
    'STALE_APPROVAL',
    'operator-approval:status',
    'operator-approval:approve',
    '--approved-by',
    '--notes',
    'qa:stadium:daejeon:release-approved',
    '--require-approved',
    'Locked Decisions',
    'READY_FOR_OPERATOR_REVIEW',
    'special-425-426-third-accessible',
    '?daejeonDebug=1',
    'passCriteria',
    'rejectCriteria',
    'representativeBlocks',
    'reviewPriority',
    'riskTags',
    'regressionTestIds',
    'reviewMode',
    'P0 -> P1 -> P2',
    'P0 crop은 자동 회귀 테스트가 존재해야',
    'P1/P2 자동 후보 crop은 release gate warning 없이 회귀 테스트 ID가 연결되어야',
    'MANUAL_CROP_ONLY',
    'Anchor Crop Regression Coverage',
    'Anchor Visual Diff',
    'visualDiffSummary',
    'changedCropCount=0',
    'Geometry Fingerprint Diff',
    'geometryDiffSummary',
    'changedBlockCount=0',
    'Coordinate Change Impact',
    'coordinateChangeImpactSummary',
    'Anchor Crop Review Criteria',
    'DAEJEON_ANCHOR_CROP_REVIEW_V2',
  ].forEach((requiredText) => {
    assert.ok(operatorHandoffSource.includes(requiredText), `operator handoff should include ${requiredText}`);
  });

  [
    'DAEJEON_ANCHOR_VISUAL_BASELINE_V1',
    'visualDiffContract',
    'baselinePath',
    'daejeonAnchorVisualBaseline.json',
    'daejeon-seatmap-visual-diff.json',
    'daejeon-seatmap-visual-diff.md',
    '--write-baseline',
    'changedCropCount',
    'metadataMismatchCount',
    'P2 MANUAL_CROP_ONLY',
    'baseline 갱신은 운영자 검수 후',
  ].forEach((requiredText) => {
    assert.ok(visualDiffSource.includes(requiredText), `visual diff script should include ${requiredText}`);
  });

  [
    '"contract": "DAEJEON_ANCHOR_VISUAL_BASELINE_V1"',
    '"reviewContractVersion": "DAEJEON_ANCHOR_CROP_REVIEW_V2"',
    '"coordinateChangeImpactContract": "DAEJEON_COORDINATE_CHANGE_IMPACT_V1"',
    '"expectedCropCount": 28',
    '"id": "first-101-109"',
    '"id": "third-121-124"',
    '"sha256"',
  ].forEach((requiredText) => {
    assert.ok(visualBaselineSource.includes(requiredText), `visual baseline should include ${requiredText}`);
  });

  [
    'DAEJEON_GEOMETRY_BASELINE_V1',
    'geometryDiffContract',
    'baselinePath',
    'daejeonGeometryBaseline.json',
    'daejeon-seatmap-geometry-diff.json',
    'daejeon-seatmap-geometry-diff.md',
    '--write-baseline',
    'changedBlockCount',
    'changedFields',
    'imageGeometry.d',
    'hitAreaD',
    'labelX',
    'labelY',
    'anchorCropIds',
    'regressionTestIds',
    'baseline 갱신은 운영자 검수 후',
  ].forEach((requiredText) => {
    assert.ok(geometryDiffSource.includes(requiredText), `geometry diff script should include ${requiredText}`);
  });

  [
    '"contract": "DAEJEON_GEOMETRY_BASELINE_V1"',
    '"coordinateChangeImpactContract": "DAEJEON_COORDINATE_CHANGE_IMPACT_V1"',
    '"expectedBlockCount": 139',
    '"id": "first-infield-b-101-108__104"',
    '"fingerprint"',
    '"imageGeometry"',
    '"hitAreaD"',
  ].forEach((requiredText) => {
    assert.ok(geometryBaselineSource.includes(requiredText), `geometry baseline should include ${requiredText}`);
  });

  [
    'coordinateChangeImpact',
    'DAEJEON_COORDINATE_CHANGE_IMPACT_V1',
    'anchorCropIds',
    'regressionTestIds',
    'reviewPriority',
    'reviewMode',
    'riskTags',
    'manualOnlyReasons',
    'missingImpactBlockIds',
    'tracedWithoutRegressionBlockIds',
  ].forEach((requiredText) => {
    assert.ok(manifestSource.includes(requiredText), `Daejeon manifest should include coordinate impact contract ${requiredText}`);
  });

  [
    'daejeon-seatmap-anchor-contract.mjs',
    'buildCoordinateChangeImpact',
    'coordinateChangeImpactContract',
  ].forEach((requiredText) => {
    assert.ok(coverageReportSource.includes(requiredText), `Daejeon coverage report should use shared impact contract ${requiredText}`);
  });

  [
    'DAEJEON_ANCHOR_CROP_REVIEW_V2',
    'DAEJEON_COORDINATE_CHANGE_IMPACT_V1',
    'anchorReviewCropDefinitions',
    'buildAnchorReviewCrops',
    'buildAnchorImpactByBlockId',
    'coordinateImpactForBlock',
    'buildCoordinateChangeImpact',
    'coordinateChangeImpactContract',
    'passCriteria',
    'rejectCriteria',
    'representativeBlocks',
    'p0ReviewCropIds',
    'p1ReviewCropIds',
    'riskTagsByCropId',
    'regressionTestIdsByCropId',
    'P0_FIRST_101_109_SEQUENCE_DRIFT_REGRESSION',
    'P0_THIRD_121_124_SPLIT_COLOR_REGRESSION',
    'P0_THIRD_120_122_BOUNDARY_REGRESSION',
    'P0_THIRD_113_117_DRIFT_REGRESSION',
    'P1_HOME_100_STACK_REGRESSION',
    'P1_FIRST_109_112_SEQUENCE_REGRESSION',
    'P1_CASS_200_SPECIAL_CELL_REGRESSION',
    'P1_THIRD_113_120_SEQUENCE_REGRESSION',
    'P1_FIRST_201_212_SMALL_BLOCK_REGRESSION',
    'P1_FIRST_4F_301_413_SEQUENCE_REGRESSION',
    'P1_THIRD_4F_414_330_SEQUENCE_REGRESSION',
    'P1_OUTFIELD_500_509_SEQUENCE_REGRESSION',
    'P2_FIRST_107_110_DETAIL_REGRESSION',
    'P2_THIRD_119_121_DETAIL_REGRESSION',
    'P2_THIRD_115_117_DETAIL_REGRESSION',
    'P2_THIRD_113_114_DETAIL_REGRESSION',
    'P2_THIRD_213_225_SEQUENCE_REGRESSION',
    'P2_THIRD_221_225_DETAIL_REGRESSION',
    'P2_THIRD_213_219_DETAIL_REGRESSION',
    'P2_SPECIAL_400_ACCESSIBLE_FIRST_REGRESSION',
    'P2_SPECIAL_425_426_THIRD_ACCESSIBLE_REGRESSION',
    'P2_SPECIAL_ACCESSIBLE_CENTER_REGRESSION',
    'P2_SPECIAL_ACCESSIBLE_OUTFIELD_THIRD_REGRESSION',
    'p2ManualOnlyCropIds',
    'MANUAL_CROP_ONLY',
    'defaultPassCriteria',
    'defaultRejectCriteria',
    'cropCriteriaByGroup',
    '104 단일 셀, 105-109',
    '121 split-color',
    'required review order',
  ].forEach((requiredText) => {
    assert.ok(
      `${anchorCropSource}\n${anchorCropContractSource}`.includes(requiredText),
      `anchor crop contract should include ${requiredText}`,
    );
  });

  [
    'DAEJEON_BLOCK_EVIDENCE_CROP_V1',
    'defaultBlockCodes',
    'daejeon-seatmap-block-evidence-crops.json',
    'daejeon-seatmap-block-evidence-crops.md',
    'output/playwright',
    'daejeon-block-review',
    '--blocks',
    '--codes',
    '--all',
    'imageGeometry.d',
    'hitAreaD',
    'blue=imageGeometry.d',
    'red=hitAreaD',
    'anchorCropIds',
    'regressionTestIds',
    'reviewPriority',
    'reviewMode',
    'DAEJEON_SEATMAP_IMAGE.imageWidth',
    'DAEJEON_SEATMAP_IMAGE.imageHeight',
  ].forEach((requiredText) => {
    assert.ok(blockEvidenceCropSource.includes(requiredText), `block evidence crop script should include ${requiredText}`);
  });

  [
    'daejeon-seatmap-operator-approval.json',
    'handoffJsonPath',
    'handoffMarkdownPath',
    'releaseGateJsonPath',
    'sha256File',
    'export const main',
    'rootDir = defaultFrontendRoot',
    'stdout = console.log',
    'now = () => new Date().toISOString()',
    'PENDING_OPERATOR_APPROVAL',
    'APPROVED',
    'STALE_APPROVAL',
    'approvedAt',
    'approvedBy',
    'approvedHandoffHash',
    'approvedHandoffMarkdownHash',
    'approvedReleaseGateHash',
    'handoffGeneratedAt',
    'releaseGateGeneratedAt',
    'getOptionValue',
    'approveRequested',
    'statusRequested',
    'requireApproved',
    '--approve',
    '--status',
    '--approved-by',
    '--notes',
    '--require-approved',
    'writeApprovedApproval',
    'printApprovalStatus',
    'hashMatches',
    'operator approval file must exist before --approve',
    '--approve requires --approved-by',
    'APPROVED operator approval required; approval file is missing',
    'APPROVED operator approval required; current status is PENDING_OPERATOR_APPROVAL',
    'STALE_APPROVAL: operator approval hash does not match current handoff/release gate artifacts',
    'operator handoff must be READY_FOR_OPERATOR_REVIEW',
    'release gate must be passed',
  ].forEach((requiredText) => {
    assert.ok(operatorApprovalSource.includes(requiredText), `operator approval should include ${requiredText}`);
  });

  [
    "import { main } from './daejeon-seatmap-ops.mjs'",
    'mkdtemp',
    'daejeon-operator-approval-',
    'reports/stadium',
    'runApproval',
    'rootDir',
    'stdout: (line) => lines.push(line)',
    'PENDING_OPERATOR_APPROVAL',
    'APPROVED',
    'STALE_APPROVAL',
    '--status',
    '--approve',
    '--approved-by',
    '--notes',
    '--require-approved',
    'status mode does not mutate the approval file',
    'passes require-approved verification',
    'APPROVED operator approval required; current status is PENDING_OPERATOR_APPROVAL',
    '--approve requires --approved-by',
    'STALE_APPROVAL: operator approval hash does not match current handoff\\/release gate artifacts',
  ].forEach((requiredText) => {
    assert.ok(operatorApprovalTestSource.includes(requiredText), `operator approval test should include ${requiredText}`);
  });

  [
    'releaseLockDocumentPath',
    'releaseGateReportPath',
    'browserQaSummaryPath',
    'docs/daejeon-seatmap-release-lock.md',
    'daejeon-seatmap-release-gate.md',
    'stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.md',
    'npm run qa:stadium:daejeon:release-lock',
  ].forEach((requiredText) => {
    assert.ok(manifestSource.includes(requiredText), `manifest should include release lock contract ${requiredText}`);
  });
});
