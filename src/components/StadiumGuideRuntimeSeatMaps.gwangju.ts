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

test('광주 trace review 스크립트는 M/N 마커 비선택 클릭 검사를 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const dispatcherSource = readProjectFile('scripts/stadium-seatmap-ops.mjs');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');
  const gwangjuDataSource = readProjectFile('src/data/gwangjuSeatData.ts');
  const coreQaSource = readProjectFile('scripts/gwangju-seatmap-core-qa.mjs');
  const manifestSource = coreQaSource;
  const operatorTemplateOpsSource = readProjectFile('scripts/gwangju-seatmap-operator-template-ops.mjs');
  const operatorTemplateSource = operatorTemplateOpsSource;
  const operatorTemplateValidationSource = operatorTemplateOpsSource;
  const operatorTemplateApplyPlanSource = operatorTemplateOpsSource;
  const operatorHandoffSource = operatorTemplateOpsSource;
  const operatorStatusSource = operatorTemplateOpsSource;
  const releaseStagingOpsSource = readProjectFile('scripts/gwangju-seatmap-release-staging-ops.mjs');
  const releasePackageSource = releaseStagingOpsSource;
  const releaseGateSource = coreQaSource;
  const releaseAuditSource = releaseStagingOpsSource;
  const releaseScopeGuardSource = releaseStagingOpsSource;
  const prStagingPlanSource = releaseStagingOpsSource;
  const targetedStagingSource = releaseStagingOpsSource;
  const stagedScopeAuditSource = releaseStagingOpsSource;
  const operatorIntakeWriteOpsSource = readProjectFile('scripts/gwangju-seatmap-operator-intake-write-ops.mjs');
  const operatorApplySource = operatorIntakeWriteOpsSource;
  const operatorWriteSmokeSource = operatorIntakeWriteOpsSource;
  const operatorWriteGuardSource = operatorIntakeWriteOpsSource;
  const pixelComponentSource = coreQaSource;
  const evidenceWorksetOpsSource = readProjectFile('scripts/gwangju-seatmap-evidence-workset-ops.mjs');
  const artifactScopeAuditSource = readProjectFile('scripts/gwangju-seatmap-artifact-scope-audit.mjs');
  const imageTraceCandidateSource = evidenceWorksetOpsSource;
  const lowMarginCandidateSource = evidenceWorksetOpsSource;
  const operatorRunbookSource = readProjectFile('docs/gwangju-seatmap-operator-runbook.md');
  const releaseHandoffSource = readProjectFile('docs/gwangju-seatmap-release-handoff.md');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );
  const requiredMarkerClickLabels = [
    'M/EV marker near 527/528',
    'M/EV marker near 518/519',
    'M/EV marker near 508/509',
    'N/5F table marker near 535',
    'N/5F table marker near 524',
    'N/5F table marker near 512/513',
    'N/5F table marker near 501/502',
  ];

  [
    '"qa:stadium:gwangju:mobile"',
    'node scripts/qa-presets.mjs stadium gwangju mobile',
    '"qa:stadium:gwangju:full"',
    'node scripts/qa-presets.mjs stadium gwangju full',
    '"stadium:gwangju:status"',
    'node scripts/qa-presets.mjs stadium gwangju status',
    '"stadium:gwangju:pixel-components"',
    'node scripts/qa-presets.mjs stadium gwangju pixel-components',
    '"stadium:gwangju:trace-manifest"',
    'node scripts/qa-presets.mjs stadium gwangju trace-manifest',
    '"stadium:gwangju:operator-handoff"',
    'node scripts/qa-presets.mjs stadium gwangju operator-handoff',
    '"stadium:gwangju:operator-status"',
    'node scripts/qa-presets.mjs stadium gwangju operator-status',
    '"qa:stadium:gwangju:release-gate"',
    'node scripts/qa-presets.mjs stadium gwangju release-gate',
    '"qa:stadium:gwangju:release-verify"',
    'node scripts/qa-presets.mjs stadium gwangju release-verify',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `Gwangju public package script should include ${requiredText}`);
  });

  [
    "'image-alignment-audit': [",
    "'image-alignment-audit:require-release': [",
    "'block-source-duplication-audit': [",
    "full: [",
    "args: ['scripts/run-stadium-isolated-qa.mjs', 'GWANGJU:FULL']",
    "'trace-review': [",
    "'runtime-layer': [",
    "'release-package': [",
    "'release-audit': [",
    "'release-scope-guard': [",
    "'pr-staging-plan': [",
    "'pr-staging-review': [",
    "'targeted-staging': [",
    "'staged-scope-audit': [",
    "'pre-pr-final-gate': [",
    "'commit-readiness': [",
    "'release-verify:preoperator': [",
  ].forEach((requiredText) => {
    assert.ok(dispatcherSource.includes(requiredText), `Gwangju dispatcher should keep internal task ${requiredText}`);
  });

  [
    '"test:stadium:gwangju:seatmaps"',
    '"stadium:gwangju:image-alignment-audit"',
    '"stadium:gwangju:image-alignment-audit:require-release"',
    '"stadium:gwangju:block-source-duplication-audit"',
    '"stadium:gwangju:release-package"',
    '"stadium:gwangju:release-audit"',
    '"stadium:gwangju:release-scope-guard"',
    '"stadium:gwangju:pr-staging-plan"',
    '"stadium:gwangju:pr-staging-review"',
    '"stadium:gwangju:targeted-staging"',
    '"stadium:gwangju:staged-scope-audit"',
    '"stadium:gwangju:pre-pr-final-gate"',
    '"stadium:gwangju:commit-readiness"',
    '"qa:stadium:gwangju:runtime-layer"',
    '"qa:stadium:gwangju:trace-review"',
    '"qa:stadium:gwangju:release-verify:preoperator"',
    '"stadium:gwangju:image-trace-candidates"',
    '"stadium:gwangju:artifact-scope-audit"',
    '"stadium:gwangju:operator-template"',
    '"stadium:gwangju:operator-template:validate"',
    '"stadium:gwangju:operator-template:validate:strict"',
    '"stadium:gwangju:operator-template:apply-plan"',
    '"stadium:gwangju:operator-template:apply-plan:require-ready"',
    '"stadium:gwangju:operator-template:gate"',
    '"stadium:gwangju:precision-editor-dataset"',
    '"stadium:gwangju:precision-editor-patch:validate"',
    '"stadium:gwangju:precision-editor-patch:apply-plan"',
    '"stadium:gwangju:precision-editor-patch:gate"',
    '"stadium:gwangju:precision-editor-patch:write-guard"',
    '"stadium:gwangju:precision-editor-patch:postwrite-gate"',
    '"stadium:gwangju:operator-input-aid"',
    '"stadium:gwangju:operator-input-packet"',
    '"stadium:gwangju:operator-intake"',
    '"stadium:gwangju:operator-apply"',
    '"stadium:gwangju:operator-write-smoke"',
    '"stadium:gwangju:operator-write-guard"',
    '"stadium:gwangju:operator-write-guard:require-ready"',
    '"stadium:gwangju:operator-prewrite-gate"',
    '"stadium:gwangju:operator-apply:write"',
    '"stadium:gwangju:operator-postwrite-gate"',
    '"qa:stadium:gwangju:selected-sweep"',
    '"stadium:gwangju:zone-precision-worksets"',
    '"stadium:gwangju:low-margin-candidates"',
    '"qa:stadium:gwangju:release-verify:postoperator"',
  ].forEach((removedText) => {
    assert.equal(packageSource.includes(removedText), false, `Gwangju public package script should not expose ${removedText}`);
  });
  assert.ok(runnerSource.includes("STADIUM_UX_GWANGJU_DEEP_CHECK: '1'"));
  assert.ok(runnerSource.includes("STADIUM_UX_GWANGJU_DEBUG_CAPTURE: '1'"));
  assert.ok(runnerSource.includes("STADIUM_UX_GWANGJU_EXPANDED_EVIDENCE: '1'"));
  assert.ok(runnerSource.includes("STADIUM_UX_GWANGJU_SELECTED_SWEEP_ONLY: '1'"));
  assert.ok(auditSource.includes('selectedSweepStatus'));
  assert.ok(auditSource.includes('selectedSweepBlockers'));
  assert.ok(auditSource.includes('SELECTED_SWEEP_TARGET_NOT_SELECTED'));
  assert.ok(auditSource.includes('SELECTED_SWEEP_MISSING_VISUAL_PATH'));
  assert.ok(evidenceWorksetOpsSource.includes('FORBIDDEN_RELEASE_ARTIFACT_PATTERNS'));
  assert.ok(evidenceWorksetOpsSource.includes('FORBIDDEN_RELEASE_ARTIFACT'));
  assert.ok(evidenceWorksetOpsSource.includes('gwangju-seatmap-artifact-scope-audit.json'));
  assert.ok(evidenceWorksetOpsSource.includes('ARTIFACT_SCOPE_NOT_PASSED'));
  assert.ok(artifactScopeAuditSource.includes('GWANGJU_ARTIFACT_SCOPE_AUDIT_V1'));
  assert.ok(artifactScopeAuditSource.includes('gwangju-seatmap-artifact-scope-audit.json'));
  assert.ok(artifactScopeAuditSource.includes('_archive/gwangju-legacy-candidates'));
  assert.ok(artifactScopeAuditSource.includes('archive-manifest.json'));
  assert.ok(artifactScopeAuditSource.includes('legacy-third-base-retrace'));
  assert.ok(artifactScopeAuditSource.includes('legacy-third-base-independent-audit'));
  assert.ok(artifactScopeAuditSource.includes('LEGACY_DELETED_BLOCK_ID_IN_ACTIVE_THIRD_BASE_ARTIFACT'));
  assert.equal(evidenceWorksetOpsSource.includes('gwangju-v99-visual-baseline'), false);
  assert.equal(evidenceWorksetOpsSource.includes('VERSIONED_GWANGJU_VISUAL_BASELINE_ARCHIVE_ONLY'), false);
  assert.equal(evidenceWorksetOpsSource.includes('gwangju*-v[0-9]*'), false);
  assert.equal(evidenceWorksetOpsSource.includes('VERSIONED_GWANGJU_ARTIFACT_ARCHIVE_ONLY'), false);
  assert.equal(evidenceWorksetOpsSource.includes('gwangju*visual-hit-split*'), false);
  assert.equal(evidenceWorksetOpsSource.includes('VISUAL_HIT_SPLIT_AUDIT_ARCHIVE_ONLY'), false);
  assert.ok(evidenceWorksetOpsSource.includes('forbiddenReleaseArtifactCount'));
  assert.ok(runnerSource.includes("modeToken === 'EVIDENCE'"));
  assert.ok(runnerSource.includes("mode === 'evidence'"));
  assert.ok(pixelComponentSource.includes('gwangju-seatmap-pixel-components.json'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_IMAGE_TRACE_CANDIDATES_V1'));
  assert.ok(imageTraceCandidateSource.includes('official image 2200x1159 only'));
  assert.ok(imageTraceCandidateSource.includes('doesNotModifyDataFile'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_SEATMAP_IMAGE'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_BLOCKS'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_ZONE_PRECISION_WORKSETS'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES'));
  assert.ok(imageTraceCandidateSource.includes('REUSES_EXISTING_TRACE_ONLY'));
  assert.ok(imageTraceCandidateSource.includes('candidatePath'));
  assert.ok(imageTraceCandidateSource.includes('officialComponentRecall'));
  assert.ok(imageTraceCandidateSource.includes('componentIoU'));
  assert.ok(imageTraceCandidateSource.includes('CURRENT_PATH_USED_FOR_COMPONENT_OWNERSHIP_HINT'));
  assert.ok(imageTraceCandidateSource.includes('P2_BOUNDARY_WATCH_BLOCK_IDS'));
  assert.ok(imageTraceCandidateSource.includes('P2_MERGED_COMPONENT_REFERENCES'));
  assert.ok(imageTraceCandidateSource.includes('p2-merged-official-components'));
  assert.ok(imageTraceCandidateSource.includes('P2_MERGED_COMPONENT_RECALL_THRESHOLD'));
  assert.ok(imageTraceCandidateSource.includes('P2_MERGED_COMPONENT_IOU_THRESHOLD'));
  assert.ok(imageTraceCandidateSource.includes('P2_PRODUCTION_REVIEWED_CURRENT_PATH_BLOCK_IDS'));
  assert.ok(imageTraceCandidateSource.includes('p2ProductionReviewedCurrentPathRows'));
  assert.ok(imageTraceCandidateSource.includes('P2_COMPONENT_OWNERSHIP_REQUIRES_MANUAL_REVIEW'));
  assert.ok(imageTraceCandidateSource.includes('P2_LABEL_COMPONENT_IS_ROW_STRIPE_ONLY'));
  assert.ok(imageTraceCandidateSource.includes('p2BoundaryWatchRows'));
  assert.ok(imageTraceCandidateSource.includes('gwangju-seatmap-image-trace-candidates.json'));
  assert.ok(imageTraceCandidateSource.includes('gwangju-seatmap-image-trace-candidates.csv'));
  assert.ok(imageTraceCandidateSource.includes('gwangju-seatmap-image-trace-candidates.md'));
  assert.ok(imageTraceCandidateSource.includes('gwangju-seatmap-image-trace-candidates-overlay.png'));
  assert.ok(imageTraceCandidateSource.includes('gwangju-seatmap-image-trace-candidates-crops'));
  assert.ok(imageTraceCandidateSource.includes('browser CSS pixels'));
  assert.ok(imageTraceCandidateSource.includes('resized screenshots'));
  assert.ok(imageTraceCandidateSource.includes('external crawling'));
  assert.ok(imageTraceCandidateSource.includes('web-search-based baseball data'));
  assert.ok(imageTraceCandidateSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(lowMarginCandidateSource.includes('GWANGJU_LOW_MARGIN_CANDIDATES_V1'));
  assert.ok(lowMarginCandidateSource.includes('gwangju-seatmap-low-margin-candidates.json'));
  assert.ok(lowMarginCandidateSource.includes('gwangju-seatmap-low-margin-candidates.csv'));
  assert.ok(lowMarginCandidateSource.includes('gwangju-seatmap-low-margin-candidates.md'));
  assert.ok(lowMarginCandidateSource.includes('NUMBERED_PIXEL_REVIEW_TARGET'));
  assert.ok(lowMarginCandidateSource.includes('SPECIAL_PIXEL_REVIEW_TARGET'));
  assert.ok(lowMarginCandidateSource.includes('COMPONENT_RECALL_REVIEW_TARGET'));
  assert.ok(lowMarginCandidateSource.includes('COMPONENT_IOU_REVIEW_TARGET'));
  assert.ok(lowMarginCandidateSource.includes('P1_P2_BOUNDARY_WATCH'));
  assert.ok(lowMarginCandidateSource.includes('doesNotModifyDataFile'));
  assert.ok(lowMarginCandidateSource.includes('official image 2200x1159 only'));
  assert.ok(manifestSource.includes('GWANGJU_OFFICIAL_TRACE_REFERENCE'));
  assert.ok(manifestSource.includes('GWANGJU_TRACE_REVIEW_SUMMARY'));
  assert.ok(manifestSource.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES'));
  assert.ok(manifestSource.includes('GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE'));
  assert.ok(manifestSource.includes('baseTraceBlocks'));
  assert.ok(manifestSource.includes('derivedOperatorBlockRanges'));
  assert.ok(manifestSource.includes('derivedRangeDisplayBlocks'));
  assert.ok(manifestSource.includes('traceStatus'));
  assert.ok(manifestSource.includes('traceSource'));
  assert.ok(manifestSource.includes('traceVersion'));
  assert.ok(manifestSource.includes('previousTraceVersion'));
  assert.ok(manifestSource.includes('traceGeneration'));
  assert.ok(manifestSource.includes('fullRetracedBlocks'));
  assert.ok(manifestSource.includes('blocksChangedFromPreviousTrace'));
  assert.ok(manifestSource.includes('totalRetracePointDelta'));
  assert.ok(manifestSource.includes('previousAnchorDeltaPx'));
  assert.ok(manifestSource.includes('previousBoundsDeltaPx'));
  assert.ok(manifestSource.includes('previousPixelCoverageDelta'));
  assert.ok(manifestSource.includes('pathChangedFromPreviousTrace'));
  assert.ok(manifestSource.includes('manualReviewed'));
  assert.ok(manifestSource.includes('pixelAlignmentStatus'));
  assert.ok(manifestSource.includes('expectedBounds'));
  assert.ok(manifestSource.includes('pixelCoverageRatio'));
  assert.ok(manifestSource.includes('officialComponentRecall'));
  assert.ok(manifestSource.includes('componentIoU'));
  assert.ok(manifestSource.includes('componentCoverageWarnings'));
  assert.ok(manifestSource.includes('overlapWarnings'));
  assert.ok(manifestSource.includes('cleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('GWANGJU_ZONE_PRECISION_WORKSETS'));
  assert.ok(manifestSource.includes('zonePrecisionWorksets'));
  assert.ok(manifestSource.includes('zonePrecisionWarnings'));
  assert.ok(manifestSource.includes('zoneOverlayArtifacts'));
  assert.ok(manifestSource.includes('gwangju-seatmap-trace-review-overlay.png'));
  assert.ok(manifestSource.includes('gwangju-seatmap-trace-review-clean-crops'));
  assert.ok(manifestSource.includes('gwangju-seatmap-trace-review-zone-crops'));
  assert.ok(gwangjuDataSource.includes("'reviewer', 'reviewedAt'"));
  assert.ok(operatorTemplateSource.includes('GWANGJU_OPERATOR_SECTION_REQUIREMENTS'));
  assert.ok(operatorTemplateSource.includes('GWANGJU_PENDING_OPERATOR_SECTIONS'));
  assert.ok(operatorTemplateSource.includes('gwangju-seatmap-operator-template.json'));
  assert.ok(operatorTemplateSource.includes('gwangju-seatmap-operator-template.md'));
  assert.ok(operatorTemplateSource.includes('GWANGJU_OPERATOR_POLYGON_TEMPLATE_V1'));
  assert.ok(operatorTemplateSource.includes('preservedOperatorInputSections'));
  assert.ok(operatorTemplateSource.includes('Regenerating this template preserves operatorInput values by section id.'));
  assert.ok(operatorTemplateSource.includes('operator-provided official image coordinates only'));
  assert.ok(operatorTemplateSource.includes('browser CSS pixels'));
  assert.ok(operatorTemplateSource.includes('external crawling'));
  assert.ok(operatorTemplateSource.includes('operatorInput'));
  assert.ok(operatorTemplateSource.includes('officialBlocks'));
  assert.ok(operatorTemplateSource.includes('level'));
  assert.ok(operatorTemplateSource.includes('points'));
  assert.ok(operatorTemplateSource.includes('labelX'));
  assert.ok(operatorTemplateSource.includes('labelY'));
  assert.ok(operatorTemplateValidationSource.includes('GWANGJU_OPERATOR_POLYGON_TEMPLATE_VALIDATION_V1'));
  assert.ok(operatorTemplateValidationSource.includes('GWANGJU_OPERATOR_POLYGON_TEMPLATE_V1'));
  assert.ok(operatorTemplateValidationSource.includes('OPERATOR_INPUT_PENDING'));
  assert.ok(operatorTemplateValidationSource.includes('LEVEL_REQUIRED_OR_INVALID'));
  assert.ok(operatorTemplateValidationSource.includes("VALID_LEVELS = new Set(['1F', '2F', '3F', '4F', '5F', 'OUTFIELD'])"));
  assert.ok(operatorTemplateValidationSource.includes('--strict'));
  assert.ok(operatorTemplateValidationSource.includes('LABEL_OUTSIDE_POLYGON'));
  assert.ok(operatorTemplateValidationSource.includes('POLYGON_SELF_INTERSECTION'));
  assert.ok(operatorTemplateValidationSource.includes('OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP'));
  assert.ok(operatorTemplateValidationSource.includes('This validator does not modify gwangjuSeatData.ts'));
  assert.ok(operatorTemplateValidationSource.includes('gwangju-seatmap-operator-template-validation.json'));
  assert.ok(operatorTemplateValidationSource.includes('gwangju-seatmap-operator-template-validation.csv'));
  assert.ok(operatorTemplateValidationSource.includes('gwangju-seatmap-operator-template-validation.md'));
  assert.ok(operatorTemplateApplyPlanSource.includes('GWANGJU_OPERATOR_POLYGON_APPLY_PLAN_V1'));
  assert.ok(operatorTemplateApplyPlanSource.includes('GWANGJU_OPERATOR_POLYGON_TEMPLATE_VALIDATION_V1'));
  assert.ok(operatorTemplateApplyPlanSource.includes('VALIDATION_INPUT_SHA256_MISMATCH'));
  assert.ok(operatorTemplateApplyPlanSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorTemplateApplyPlanSource.includes('doesNotModifyDataFile'));
  assert.ok(operatorTemplateApplyPlanSource.includes('blockGeometry('));
  assert.ok(operatorTemplateApplyPlanSource.includes('gwangju-seatmap-operator-template-apply-plan.json'));
  assert.ok(operatorTemplateApplyPlanSource.includes('gwangju-seatmap-operator-template-apply-plan.csv'));
  assert.ok(operatorTemplateApplyPlanSource.includes('gwangju-seatmap-operator-template-apply-plan.md'));
  assert.ok(operatorHandoffSource.includes('GWANGJU_OPERATOR_HANDOFF_V1'));
  assert.ok(operatorHandoffSource.includes('gwangju-seatmap-operator-handoff.json'));
  assert.ok(operatorHandoffSource.includes('gwangju-seatmap-operator-handoff.csv'));
  assert.ok(operatorHandoffSource.includes('gwangju-seatmap-operator-handoff.md'));
  assert.ok(operatorHandoffSource.includes('gwangju-seatmap-trace-review-overlay.png'));
  assert.ok(operatorHandoffSource.includes('gwangju-seatmap-trace-review-clean-crops'));
  assert.ok(operatorHandoffSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorHandoffSource.includes('operator-provided official image coordinates only'));
  assert.ok(operatorHandoffSource.includes('npm run stadium:gwangju:operator-status'));
  assert.ok(operatorHandoffSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke'));
  assert.ok(operatorHandoffSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard:require-ready'));
  assert.ok(operatorHandoffSource.includes('validate:strict'));
  assert.ok(operatorHandoffSource.includes('apply-plan:require-ready'));
  assert.ok(operatorStatusSource.includes('GWANGJU_OPERATOR_STATUS_V1'));
  assert.ok(operatorStatusSource.includes('gwangju-seatmap-operator-status.json'));
  assert.ok(operatorStatusSource.includes('gwangju-seatmap-operator-status.csv'));
  assert.ok(operatorStatusSource.includes('gwangju-seatmap-operator-status.md'));
  assert.ok(operatorStatusSource.includes('doesNotModifyDataFile'));
  assert.ok(operatorStatusSource.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES'));
  assert.ok(operatorStatusSource.includes('GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE'));
  assert.ok(operatorStatusSource.includes('baseTraceBlocks'));
  assert.ok(operatorStatusSource.includes('derivedRanges'));
  assert.ok(operatorStatusSource.includes('derivedRangeDisplayBlocks'));
  assert.ok(operatorStatusSource.includes('promotionModelWarnings'));
  assert.ok(operatorStatusSource.includes('DERIVED_RANGE_OFFICIAL_BLOCK_OVERLAP_IS_FILTER_ONLY'));
  assert.ok(operatorStatusSource.includes('EXISTING_NUMBERED_BLOCKS_ONLY'));
  assert.ok(operatorStatusSource.includes('STRICT_VALIDATION_NOT_RUN'));
  assert.ok(operatorStatusSource.includes('STRICT_VALIDATION_PENDING_OPERATOR_INPUT'));
  assert.ok(operatorStatusSource.includes('NO_VALID_DATA_DIFF_SECTIONS'));
  assert.ok(operatorStatusSource.includes('OPERATOR_INPUT_PENDING'));
  assert.ok(operatorStatusSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke'));
  assert.ok(operatorStatusSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard'));
  assert.ok(operatorStatusSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-apply'));
  assert.ok(operatorStatusSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write'));
  assert.ok(operatorStatusSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate'));
  assert.ok(operatorStatusSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorStatusSource.includes('operator-provided official image coordinates only'));
  assert.ok(operatorStatusSource.includes('browser CSS pixels'));
  assert.ok(operatorStatusSource.includes('resized screenshots'));
  assert.ok(operatorStatusSource.includes('external crawling'));
  assert.ok(operatorStatusSource.includes('web-search-based baseball data'));
  assert.ok(operatorStatusSource.includes('third-party copied seatmap images'));
  assert.ok(releasePackageSource.includes('GWANGJU_DERIVED_RANGE_RELEASE_PACKAGE_V1'));
  assert.ok(releasePackageSource.includes('gwangju-seatmap-release-package.json'));
  assert.ok(releasePackageSource.includes('gwangju-seatmap-release-package.md'));
  assert.ok(releasePackageSource.includes('releaseHandoff'));
  assert.ok(releasePackageSource.includes('docs/gwangju-seatmap-release-handoff.md'));
  assert.ok(releasePackageSource.includes('OFFICIAL_DERIVED_MULTI_BLOCK_TRACE'));
  assert.ok(releasePackageSource.includes('doesNotModifyDataFile'));
  assert.ok(releasePackageSource.includes('REUSES_EXISTING_TRACE_ONLY'));
  assert.ok(releasePackageSource.includes('GWANGJU_EXPECTED_TRACE_BLOCK_COUNT'));
  assert.ok(releasePackageSource.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES'));
  assert.ok(releasePackageSource.includes('MISSING_RELEASE_ARTIFACT'));
  assert.ok(releasePackageSource.includes('OPERATOR_STATUS_NOT_READY'));
  assert.ok(releasePackageSource.includes('BROWSER_QA_STATUS_NOT_PASSED'));
  assert.ok(releasePackageSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(releasePackageSource.includes('operator-provided official image coordinates only'));
  assert.ok(releasePackageSource.includes('browser CSS pixels'));
  assert.ok(releasePackageSource.includes('web-search-based baseball data'));
  assert.ok(releasePackageSource.includes('officialDerivedAggregateReady'));
  assert.ok(releaseGateSource.includes('GWANGJU_SEATMAP_RELEASE_GATE_V1'));
  assert.ok(releaseGateSource.includes('releaseAcceptance'));
  assert.ok(releaseGateSource.includes("requiredStatus: 'passed'"));
  assert.ok(releaseGateSource.includes('requiredBlockers: 0'));
  assert.ok(releaseGateSource.includes('requiredCompletedSteps: commandPlan.length'));
  assert.ok(releaseGateSource.includes("requiredReleasePackageStatus: 'ready'"));
  assert.ok(releaseGateSource.includes("requiredOperatorStatus: 'ready'"));
  assert.ok(releaseGateSource.includes("requiredBrowserQaStatus: 'passed'"));
  assert.ok(releaseGateSource.includes("requiredRuntimeLayerAuditStatus: 'passed'"));
  assert.ok(releaseGateSource.includes('requiredActiveTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT'));
  assert.ok(releaseGateSource.includes('completedSteps'));
  assert.ok(releaseGateSource.includes('totalSteps'));
  assert.ok(releaseGateSource.includes("['check', 'expected', 'actual']"));
  assert.ok(releaseGateSource.includes('gwangju-seatmap-release-gate.json'));
  assert.ok(releaseGateSource.includes('gwangju-seatmap-release-gate.md'));
  assert.ok(releaseGateSource.includes("args: ['run', 'stadium:gwangju:operator-status']"));
  assert.ok(releaseGateSource.includes("command: 'node'"));
  assert.ok(releaseGateSource.includes("'--test-name-pattern'"));
  assert.ok(releaseGateSource.includes("'광주|Gwangju'"));
  assert.ok(releaseGateSource.includes("label: 'trace review artifacts'"));
  assert.ok(releaseGateSource.includes("args: ['existing', 'gwangju', 'trace-review', 'artifacts']"));
  assert.ok(releaseGateSource.includes('validateTraceReviewArtifacts'));
  assert.ok(releaseGateSource.includes("args: ['scripts/stadium-seatmap-ops.mjs', 'gwangju', 'release-package']"));
  assert.ok(releaseGateSource.includes("args: ['run', 'build']"));
  assert.ok(releaseGateSource.includes('doesNotModifyDataFile'));
  assert.ok(releaseGateSource.includes('RELEASE_PACKAGE_NOT_READY'));
  assert.ok(releaseGateSource.includes('OPERATOR_STATUS_NOT_READY'));
  assert.ok(releaseGateSource.includes('BROWSER_QA_NOT_PASSED'));
  assert.ok(releaseGateSource.includes('RUNTIME_LAYER_AUDIT_NOT_PASSED'));
  assert.ok(releaseGateSource.includes('RUNTIME_LAYER_PATH_MISMATCHES_PRESENT'));
  assert.ok(releaseGateSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(releaseGateSource.includes('operator-provided official image coordinates only'));
  assert.ok(releaseGateSource.includes('web-search-based baseball data'));
  assert.ok(releaseGateSource.includes('officialDerivedAggregateReady'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-release-scope-guard.json'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-runtime-layer-audit.json'));
  assert.ok(releaseAuditSource.includes('releaseScopeGuard'));
  assert.ok(releaseAuditSource.includes('runtimeLayerAudit'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_NOT_PASSED'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_BLOCKERS_PRESENT'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_UNEXPECTED_FILES_PRESENT'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_INCLUDED_FILE_COUNT_CHANGED'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_INCLUDED_FILES_MISSING'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_EXTRA_INCLUDED_FILES'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_SEPARATE_DIRTY_WORK_BASELINE_CHANGED'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_SEPARATE_EXPANSION_DISABLED'));
  assert.ok(releaseAuditSource.includes('classified additional separate dirty work files'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_PATCH_SEPARATION_STATUS_CHANGED'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-pr-staging-plan.json'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-targeted-staging.json'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-staged-scope-audit.json'));
  assert.ok(releaseAuditSource.includes('prStagingPlan'));
  assert.ok(releaseAuditSource.includes('targetedStaging'));
  assert.ok(releaseAuditSource.includes('stagedScopeAudit'));
  assert.ok(releaseAuditSource.includes('PR_STAGING_PLAN_STATUS_CHANGED'));
  assert.ok(releaseAuditSource.includes('RUNTIME_LAYER_AUDIT_NOT_PASSED'));
  assert.ok(releaseAuditSource.includes('RUNTIME_LAYER_PATH_MISMATCHES_PRESENT'));
  assert.ok(releaseAuditSource.includes('PR_STAGING_PLAN_GIT_ADD_ENABLED'));
  assert.ok(releaseAuditSource.includes('STALE_PR_STAGING_PLAN_BEFORE_SCOPE_GUARD'));
  assert.ok(releaseAuditSource.includes('STALE_RELEASE_SCOPE_GUARD_BEFORE_HANDOFF'));
  assert.ok(releaseAuditSource.includes("requiredScopeGuardStatus: 'passed'"));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardUnexpectedFiles: 0'));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardBlockers: 0'));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardIncludedFiles: EXPECTED_RELEASE_PAYLOAD_FILE_COUNT'));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardSeparateDirtyWorkBaselineFiles: SEPARATE_DIRTY_WORK_BASELINE_FILE_COUNT'));
  assert.ok(releaseAuditSource.includes('allowsClassifiedSeparateDirtyWorkExpansion: true'));
  assert.ok(releaseAuditSource.includes("requiredPatchSeparationReadiness: 'ready-or-review-required'"));
  assert.ok(releaseAuditSource.includes("requiredPrStagingPlanStatus: 'ready-or-review-required'"));
  assert.ok(releaseAuditSource.includes('requiredPrStagingPlanDoesNotRunGitAdd: true'));
  assert.ok(releaseAuditSource.includes('scopeGuardSummary'));
  assert.ok(releaseAuditSource.includes('expectedIncludedFileCount'));
  assert.ok(releaseAuditSource.includes('actualIncludedFileCount'));
  assert.ok(releaseAuditSource.includes('missingExpectedIncludedFileCount'));
  assert.ok(releaseAuditSource.includes('extraIncludedFileCount'));
  assert.ok(releaseAuditSource.includes('expectedSeparateDirtyWorkCount'));
  assert.ok(releaseAuditSource.includes('actualSeparateDirtyWorkCount'));
  assert.ok(releaseAuditSource.includes('missingExpectedSeparateDirtyWorkCount'));
  assert.ok(releaseAuditSource.includes('classifiedSeparateDirtyWorkExpansionAllowed'));
  assert.ok(releaseAuditSource.includes('classifiedAdditionalSeparateDirtyWorkCount'));
  assert.ok(releaseAuditSource.includes('releaseCandidateInventory.expectedIncludedFileCount=26'));
  assert.ok(releaseAuditSource.includes('separateWorkInventory.expectedSeparateDirtyWorkCount baseline=74'));
  assert.ok(releaseAuditSource.includes('separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true'));
  assert.ok(releaseAuditSource.includes('PR Packaging Manifest'));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.releasePayloadFileCount=26'));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.separateDirtyWorkFileCount='));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.unexpectedDirtyFileCount=0'));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.inventoryDriftCount=0'));
  assert.ok(releaseAuditSource.includes('Patch Separation Readiness'));
  assert.ok(releaseAuditSource.includes('patchSeparationReadiness.status=ready-or-review-required'));
  assert.ok(releaseAuditSource.includes('stagedScopeAudit.expectedTargetFileCount=26'));
  assert.ok(releaseAuditSource.includes('STAGED_SCOPE_AUDIT_OUTSIDE_TARGETS_PRESENT'));
  assert.ok(releaseAuditSource.includes('STAGED_SCOPE_AUDIT_SEPARATE_DIRTY_WORK_PRESENT'));
  assert.ok(releaseAuditSource.includes('clean release payload files are not packaging blockers'));
  assert.ok(releaseAuditSource.includes('## Scope Guard'));
  assert.ok(releaseAuditSource.includes('## PR Staging Plan'));
  assert.ok(releaseAuditSource.includes('prStagingPlanSummary'));
  assert.ok(releaseAuditSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(releaseScopeGuardSource.includes('GWANGJU_RELEASE_SCOPE_GUARD_V1'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-release-scope-guard.json'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-release-scope-guard.md'));
  assert.ok(releaseScopeGuardSource.includes('expectedIncludedReleaseFiles'));
  assert.ok(releaseScopeGuardSource.includes('reviewedUntrackedIncludedReleaseFiles'));
  assert.ok(releaseScopeGuardSource.includes('expectedSeparateDirtyWorkFiles'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-evidence-workset-ops.mjs'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-operator-intake-write-ops.mjs'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-release-staging-ops.mjs'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-core-qa.mjs'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-artifact-scope-audit.mjs'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-block-source-duplication-audit.mjs'));
  assert.ok(releaseScopeGuardSource.includes('src/components/gwangju/GwangjuSeatMapSvg.tsx'));
  assert.ok(releaseScopeGuardSource.includes('src/components/MateResultsRuntime.tsx'));
  assert.ok(releaseScopeGuardSource.includes('src/components/ChatBotFloatingButton.tsx'));
  assert.ok(releaseScopeGuardSource.includes('src/components/ChatBotRuntime.tsx'));
  assert.ok(releaseScopeGuardSource.includes('build-budget-support'));
  assert.ok(releaseScopeGuardSource.includes('non-stadium-frontend-work'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-pr-staging-review.json'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-pr-staging-review.md'));
  assert.ok(releaseScopeGuardSource.includes("'pr-staging-review': ["));
  assert.ok(releaseScopeGuardSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-review'));
  assert.ok(releaseScopeGuardSource.includes('prPackagingManifest'));
  assert.ok(releaseScopeGuardSource.includes('releasePayloadFileCount'));
  assert.ok(releaseScopeGuardSource.includes('separateDirtyWorkFileCount'));
  assert.ok(releaseScopeGuardSource.includes('unexpectedDirtyFileCount'));
  assert.ok(releaseScopeGuardSource.includes('inventoryDriftCount'));
  assert.ok(releaseScopeGuardSource.includes('patchSeparationReadiness'));
  assert.ok(releaseScopeGuardSource.includes('patchSeparationStatus'));
  assert.ok(releaseScopeGuardSource.includes('mixedStatusFiles'));
  assert.ok(releaseScopeGuardSource.includes('untrackedIncludedFiles'));
  assert.ok(releaseScopeGuardSource.includes('reviewedUntrackedIncludedFiles'));
  assert.ok(releaseScopeGuardSource.includes('reviewed expected untracked release files are ready for targeted staging'));
  assert.ok(releaseScopeGuardSource.includes('reviewFocusFiles'));
  assert.ok(releaseScopeGuardSource.includes('MIXED_GIT_STATUS'));
  assert.ok(releaseScopeGuardSource.includes('UNTRACKED_INCLUDED_FILE'));
  assert.ok(releaseScopeGuardSource.includes('releaseCandidateInventory'));
  assert.ok(releaseScopeGuardSource.includes('separateWorkInventory'));
  assert.ok(releaseScopeGuardSource.includes('classifiedSeparateDirtyWorkExpansionAllowed'));
  assert.ok(releaseScopeGuardSource.includes('CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED'));
  assert.ok(releaseScopeGuardSource.includes('PR Packaging Manifest'));
  assert.ok(releaseScopeGuardSource.includes('Patch Separation Readiness'));
  assert.ok(releaseScopeGuardSource.includes('PR staging plan'));
  assert.ok(releaseScopeGuardSource.includes('stagingPlan.status=ready-or-review-required'));
  assert.ok(releaseScopeGuardSource.includes('stagingPlan.doesNotRunGitAdd=true'));
  assert.ok(releaseScopeGuardSource.includes('stagingPlan.releasePayloadFileCount=26'));
  assert.ok(releaseScopeGuardSource.includes('stagedScopeAudit.expectedTargetFileCount=26'));
  assert.ok(releaseScopeGuardSource.includes('Release Candidate Inventory'));
  assert.ok(releaseScopeGuardSource.includes('Expected Included Release Files'));
  assert.ok(releaseScopeGuardSource.includes('Separate Workstream Baseline'));
  assert.ok(releaseScopeGuardSource.includes('git'));
  assert.ok(releaseScopeGuardSource.includes('status'));
  assert.ok(releaseScopeGuardSource.includes('includedRules'));
  assert.ok(releaseScopeGuardSource.includes('separateRules'));
  assert.ok(releaseScopeGuardSource.includes('Gwangju official derived aggregate release package'));
  assert.ok(releaseScopeGuardSource.includes('Daejeon work is explicitly outside the Gwangju release handoff scope'));
  assert.ok(releaseScopeGuardSource.includes('daejeon-files'));
  assert.ok(releaseScopeGuardSource.includes('Separate dirty work that must not be judged by this handoff'));
  assert.ok(releaseScopeGuardSource.includes('UNCLASSIFIED_DIRTY_FILE'));
  assert.ok(releaseScopeGuardSource.includes('RELEASE_CANDIDATE_FILE_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('RELEASE_CANDIDATE_FILE_UNEXPECTED'));
  assert.ok(releaseScopeGuardSource.includes('HANDOFF_SCOPE_SNIPPET_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('DISPATCHER_SCOPE_GUARD_TASK_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('RELEASE_LOCK_SCOPE_GUARD_SNIPPET_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('daegu-files'));
  assert.ok(releaseScopeGuardSource.includes('sajik-files'));
  assert.ok(releaseScopeGuardSource.includes('suwon-files'));
  assert.ok(releaseScopeGuardSource.includes('cross-stadium-utilities'));
  assert.ok(releaseScopeGuardSource.includes('src/components/AppRoutes.tsx'));
  assert.ok(releaseScopeGuardSource.includes('operator-provided official image coordinates only'));
  assert.ok(releaseScopeGuardSource.includes('browser CSS pixels'));
  assert.ok(releaseScopeGuardSource.includes('web-search-based baseball data'));
  assert.ok(releaseScopeGuardSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(prStagingPlanSource.includes('GWANGJU_PR_STAGING_PLAN_V1'));
  assert.ok(prStagingPlanSource.includes('GWANGJU_PR_STAGING_REVIEW_V1'));
  assert.ok(prStagingPlanSource.includes('gwangju-seatmap-pr-staging-plan.json'));
  assert.ok(prStagingPlanSource.includes('gwangju-seatmap-pr-staging-plan.md'));
  assert.ok(prStagingPlanSource.includes('gwangju-seatmap-pr-staging-review.json'));
  assert.ok(prStagingPlanSource.includes('gwangju-seatmap-pr-staging-review.md'));
  assert.ok(prStagingPlanSource.includes('--review'));
  assert.ok(prStagingPlanSource.includes('doesNotRunGitAdd'));
  assert.ok(prStagingPlanSource.includes('safeToRunBulkGitAdd'));
  assert.ok(prStagingPlanSource.includes('git'));
  assert.ok(prStagingPlanSource.includes('diff'));
  assert.ok(prStagingPlanSource.includes('--cached'));
  assert.ok(prStagingPlanSource.includes('manual-hunk-review-required'));
  assert.ok(prStagingPlanSource.includes('untracked-review-required'));
  assert.ok(prStagingPlanSource.includes('generated-report-review-required'));
  assert.ok(prStagingPlanSource.includes('ready-to-stage'));
  assert.ok(prStagingPlanSource.includes('reviewedUntrackedReadyFiles'));
  assert.ok(prStagingPlanSource.includes('targeted-git-add-after-whole-file-review'));
  assert.ok(prStagingPlanSource.includes('SEPARATE_FILE_HAS_INDEX_DIFF'));
  assert.ok(prStagingPlanSource.includes('manual-hunk-review-before-staging'));
  assert.ok(prStagingPlanSource.includes('manual-whole-file-review-before-git-add'));
  assert.ok(prStagingPlanSource.includes('RELEASE_PAYLOAD_COUNT_CHANGED'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.status=ready-or-review-required'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.doesNotRunGitAdd=true'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.safeToRunBulkGitAdd=false'));
  assert.ok(prStagingPlanSource.includes("stagingPlan.packageJsonStatus=${packageMixedStatus ?? 'none'}"));
  assert.ok(prStagingPlanSource.includes('stagingPlan.releasePayloadFileCount=26'));
  assert.ok(prStagingPlanSource.includes('stagingReview.status=ready-or-review-required'));
  assert.ok(prStagingPlanSource.includes('stagingReview.doesNotRunGitAdd=true'));
  assert.ok(prStagingPlanSource.includes('stagingReview.safeToRunBulkGitAdd=false'));
  assert.ok(prStagingPlanSource.includes('stagingReview.releasePayloadFileCount=26'));
  assert.ok(prStagingPlanSource.includes('stagingReview.recommendsOnlyIncludedFiles=true'));
  assert.ok(prStagingPlanSource.includes('stagingReview.doesNotRecommendSeparateDirtyWork=true'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.separateDirtyWorkFileCount=${separateDirtyWorkFileCount}'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=${classifiedSeparateDirtyWorkExpansionAllowed}'));
  assert.ok(prStagingPlanSource.includes('git add .'));
  assert.ok(prStagingPlanSource.includes('operator-provided official image coordinates only'));
  assert.ok(prStagingPlanSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(targetedStagingSource.includes('GWANGJU_TARGETED_STAGING_V1'));
  assert.ok(targetedStagingSource.includes('gwangju-seatmap-targeted-staging.json'));
  assert.ok(targetedStagingSource.includes('gwangju-seatmap-targeted-staging.csv'));
  assert.ok(targetedStagingSource.includes('gwangju-seatmap-targeted-staging.md'));
  assert.ok(targetedStagingSource.includes('doesNotRunGitAdd: true'));
  assert.ok(targetedStagingSource.includes('safeToRunBulkGitAdd: false'));
  assert.ok(targetedStagingSource.includes('recommendsOnlyIncludedFiles: true'));
  assert.ok(targetedStagingSource.includes('doesNotRecommendSeparateDirtyWork: true'));
  assert.ok(targetedStagingSource.includes('explicit-file-list-only'));
  assert.ok(targetedStagingSource.includes('READY_TO_STAGE_COUNT_CHANGED'));
  assert.ok(targetedStagingSource.includes('SEPARATE_DIRTY_WORK_IN_TARGETS'));
  assert.ok(targetedStagingSource.includes('scripts/gwangju-seatmap-core-qa.mjs'));
  assert.ok(targetedStagingSource.includes('scripts/gwangju-seatmap-operator-template-ops.mjs'));
  assert.ok(targetedStagingSource.includes('git add .'));
  assert.ok(targetedStagingSource.includes('git add -A'));
  assert.ok(targetedStagingSource.includes('git commit -am'));
  assert.ok(targetedStagingSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(stagedScopeAuditSource.includes('GWANGJU_STAGED_SCOPE_AUDIT_V1'));
  assert.ok(stagedScopeAuditSource.includes('gwangju-seatmap-staged-scope-audit.json'));
  assert.ok(stagedScopeAuditSource.includes('gwangju-seatmap-staged-scope-audit.csv'));
  assert.ok(stagedScopeAuditSource.includes('gwangju-seatmap-staged-scope-audit.md'));
  assert.ok(stagedScopeAuditSource.includes('git diff'));
  assert.ok(stagedScopeAuditSource.includes('--cached'));
  assert.ok(stagedScopeAuditSource.includes('--require-complete'));
  assert.ok(stagedScopeAuditSource.includes('requireComplete'));
  assert.ok(stagedScopeAuditSource.includes('doesNotRunGitAdd: true'));
  assert.ok(stagedScopeAuditSource.includes('safeToRunBulkGitAdd: false'));
  assert.ok(stagedScopeAuditSource.includes('acceptsOnlyTargetedStagingFiles: true'));
  assert.ok(stagedScopeAuditSource.includes('blocksSeparateDirtyWork: true'));
  assert.ok(stagedScopeAuditSource.includes('STAGED_FILE_OUTSIDE_TARGETS'));
  assert.ok(stagedScopeAuditSource.includes('STAGED_SEPARATE_DIRTY_WORK'));
  assert.ok(stagedScopeAuditSource.includes('STAGED_TARGET_DELETED'));
  assert.ok(stagedScopeAuditSource.includes('STAGED_TARGET_FILE_MISSING'));
  assert.ok(stagedScopeAuditSource.includes('missingStagedTargetFileCount'));
  assert.ok(stagedScopeAuditSource.includes('stagedScopeAudit.requireComplete'));
  assert.ok(stagedScopeAuditSource.includes('readyForCommit'));
  assert.ok(stagedScopeAuditSource.includes('git add .'));
  assert.ok(stagedScopeAuditSource.includes('git add -A'));
  assert.ok(stagedScopeAuditSource.includes('git commit -am'));
  assert.ok(stagedScopeAuditSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorApplySource.includes('GWANGJU_OPERATOR_APPLY_V1'));
  assert.ok(operatorApplySource.includes('typescript'));
  assert.ok(operatorApplySource.includes('GWANGJU_OPERATOR_WRITE_GUARD_V1'));
  assert.ok(operatorApplySource.includes('GWANGJU_OPERATOR_POLYGON_APPLY_PLAN_V1'));
  assert.ok(operatorApplySource.includes('home-k7-seats'));
  assert.ok(operatorApplySource.includes('away-cheering-seats'));
  assert.ok(operatorApplySource.includes('GWANGJU_IMAGE_GEOMETRY_DRAFTS'));
  assert.ok(operatorApplySource.includes('SPECIAL_BLOCKS'));
  assert.ok(operatorApplySource.includes('GWANGJU_OPERATOR_SECTION_REQUIREMENTS'));
  assert.ok(operatorApplySource.includes('blockGeometry('));
  assert.ok(operatorApplySource.includes('--write'));
  assert.ok(operatorApplySource.includes('--require-ready'));
  assert.ok(operatorApplySource.includes('--allow-synthetic-smoke'));
  assert.ok(operatorApplySource.includes('OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP'));
  assert.ok(operatorApplySource.includes('gwangju-seatmap-operator-apply.json'));
  assert.ok(operatorApplySource.includes('gwangju-seatmap-operator-apply.csv'));
  assert.ok(operatorApplySource.includes('gwangju-seatmap-operator-apply.md'));
  assert.ok(operatorApplySource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorApplySource.includes('operator-provided official image coordinates only'));
  assert.ok(operatorWriteSmokeSource.includes('GWANGJU_OPERATOR_WRITE_SMOKE_V1'));
  assert.ok(operatorWriteSmokeSource.includes('gwangju-seatmap-operator-write-smoke.json'));
  assert.ok(operatorWriteSmokeSource.includes('nonProductionSyntheticInput'));
  assert.ok(operatorWriteSmokeSource.includes('Synthetic smoke coordinates are not baseball data'));
  assert.ok(operatorWriteSmokeSource.includes('PRODUCTION_GWANGJU_DATA_CHANGED'));
  assert.ok(operatorWriteSmokeSource.includes('PRODUCTION_OPERATOR_TEMPLATE_CHANGED'));
  assert.ok(operatorWriteSmokeSource.includes('SMOKE_STATUS_NOT_READY'));
  assert.ok(operatorWriteSmokeSource.includes('SMOKE_APPLY_NOT_READY'));
  assert.ok(operatorWriteSmokeSource.includes('SMOKE_APPLY_DID_NOT_WRITE_TEMP_FILE'));
  assert.ok(operatorWriteSmokeSource.includes('productionDataUnchanged'));
  assert.ok(operatorWriteSmokeSource.includes('productionTemplateUnchanged'));
  assert.ok(operatorWriteSmokeSource.includes('temporaryDataChanged'));
  assert.ok(operatorWriteSmokeSource.includes('applyWroteTempFile'));
  assert.ok(operatorWriteSmokeSource.includes('gwangjuSeatData.smoke.ts'));
  assert.ok(operatorWriteSmokeSource.includes('scripts/gwangju-seatmap-operator-intake-write-ops.mjs'));
  assert.ok(operatorWriteSmokeSource.includes('operator-provided official image coordinates only'));
  assert.ok(operatorWriteSmokeSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorWriteSmokeSource.includes('browser CSS pixels'));
  assert.ok(operatorWriteSmokeSource.includes('web-search-based baseball data'));
  assert.ok(operatorWriteGuardSource.includes('GWANGJU_OPERATOR_WRITE_GUARD_V1'));
  assert.ok(operatorWriteGuardSource.includes('GWANGJU_OPERATOR_WRITE_SMOKE_V1'));
  assert.ok(operatorWriteGuardSource.includes('GWANGJU_OPERATOR_STATUS_V1'));
  assert.ok(operatorWriteGuardSource.includes('gwangju-seatmap-operator-write-guard.json'));
  assert.ok(operatorWriteGuardSource.includes('--require-ready'));
  assert.ok(operatorWriteGuardSource.includes('STATUS_NOT_READY'));
  assert.ok(operatorWriteGuardSource.includes('OPERATOR_INPUT_PENDING'));
  assert.ok(operatorWriteGuardSource.includes('NO_VALID_DATA_DIFF_SECTIONS'));
  assert.ok(operatorWriteGuardSource.includes('WRITE_SMOKE_PRODUCTION_DATA_CHANGED'));
  assert.ok(operatorWriteGuardSource.includes('WRITE_SMOKE_PRODUCTION_TEMPLATE_CHANGED'));
  assert.ok(operatorWriteGuardSource.includes('WRITE_SMOKE_TEMPORARY_DATA_NOT_CHANGED'));
  assert.ok(operatorWriteGuardSource.includes('WRITE_SMOKE_APPLY_DID_NOT_WRITE_TEMP_FILE'));
  assert.ok(operatorWriteGuardSource.includes('WRITE_SMOKE_APPLY_NOT_READY'));
  assert.ok(operatorWriteGuardSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorRunbookSource.includes('gwangju-kia-seatmap-official-2026.webp'));
  assert.ok(operatorRunbookSource.includes('2200x1159'));
  assert.ok(operatorRunbookSource.includes('operator-provided official image coordinates only'));
  assert.ok(operatorRunbookSource.includes('browser CSS pixels'));
  assert.ok(operatorRunbookSource.includes('resized screenshots'));
  assert.ok(operatorRunbookSource.includes('external crawling'));
  assert.ok(operatorRunbookSource.includes('web-search-based baseball data'));
  assert.ok(operatorRunbookSource.includes('third-party copied seatmap images'));
  assert.ok(operatorRunbookSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorRunbookSource.includes('npm run stadium:gwangju:operator-status'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard:require-ready'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-prewrite-gate'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-apply'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate'));
  assert.ok(operatorRunbookSource.includes('docs/gwangju-seatmap-release-handoff.md'));
  assert.ok(operatorRunbookSource.includes('현재 release-ready 상태와 K7/AWAY 공식 derived aggregate filter 계약'));
  assert.ok(operatorRunbookSource.includes('synthetic K7/AWAY 입력'));
  assert.ok(operatorRunbookSource.includes('production 야구 데이터가 아니며'));
  [
    'release mode: `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    'release gate: `npm run qa:stadium:gwangju:release-gate`',
    'coordinate system: `2200x1159`',
    'active block count: `113`',
    'aggregate hit-area mode: `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY`',
    'K7/AWAY aggregate hit-areas are enabled within the current `113` active block release through official numbered-block aggregate geometry.',
    'release gate status: `passed`',
    'release gate blockers: `0`',
    'release gate steps: `5/5`',
    'release package status: `ready`',
    'operator status: `ready`',
    'browser QA status: `passed`',
    'runtime layer audit status: `passed`',
    'active trace blocks: `113`',
    'runtime layer audit: `node scripts/stadium-seatmap-ops.mjs gwangju runtime-layer`',
    'commit readiness gate: `node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness`',
    'missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`',
    '`K7석`: `107~111`, `118~122`',
    '`원정응원석`: `107~110`',
    '`홈 응원석`: `118~122`',
    '`111`: `K7` category, `fanRole: NEUTRAL`',
    '`home-k7-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`',
    '`away-cheering-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`',
    '`K7석`, `원정응원석` aggregate hit-areas use `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`.',
    '`SPECIAL_BLOCKS` includes K7/AWAY aggregate block definitions.',
    '`GWANGJU_IMAGE_GEOMETRY_DRAFTS` includes `home-k7-seats` and `away-cheering-seats` geometry generated from official traced source blocks.',
    'operator-provided official image coordinates only',
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-prewrite-gate',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate',
    'K7/AWAY official derived aggregate filter hit-areas',
  ].forEach((requiredText) => {
    assert.ok(releaseHandoffSource.includes(requiredText), `Gwangju release handoff should include ${requiredText}`);
  });
  assert.ok(auditSource.includes('verifyGwangjuOverlayClicks'));
  assert.ok(auditSource.includes('readGwangjuTraceManifestBlocks'));
  assert.ok(auditSource.includes('expectedLabelTargetCount'));
  assert.ok(auditSource.includes("['home-k7-seats', 'away-cheering-seats'].includes(entry.id)"));
  assert.ok(auditSource.includes('Gwangju runtime layer must render release-ready manifest paths only'));
  assert.ok(auditSource.includes('runtimeLayerAudit'));
  assert.ok(auditSource.includes('pathMismatchCount'));
  assert.ok(auditSource.includes('forbiddenRenderedIds'));
  assert.ok(auditSource.includes('Gwangju label coordinate top-hit failures'));
  assert.ok(auditSource.includes('markerClickPoints'));
  assert.ok(auditSource.includes('Gwangju K7/AWAY sections must be official-traced before becoming clickable'));
  assert.ok(auditSource.includes('Gwangju marker-only point should not select a seat block'));
  assert.ok(auditSource.includes('rect.width > 0 && rect.height > 0'));
  assert.ok(auditSource.includes('selected=${JSON.stringify(selectedAfterMarkerClick)}'));
  assert.ok(auditSource.includes('Gwangju marker-only point should not open seat details'));
  assert.ok(auditSource.includes('clickGwangjuFilter'));
  assert.ok(auditSource.includes('Gwangju infield filter should keep infield seat blocks interactive.'));
  assert.ok(auditSource.includes('Gwangju K7 filter should expose the K7 aggregate hit-area.'));
  assert.ok(auditSource.includes('Gwangju K7 filter should replace away source K7 blocks with the aggregate hit-area.'));
  assert.ok(auditSource.includes('Gwangju K7 filter should replace home source K7 blocks with the aggregate hit-area.'));
  assert.ok(auditSource.includes('Gwangju K7 filter should hide non-K7 infield seat hit-areas.'));
  assert.ok(auditSource.includes('Gwangju cheering filter should hide neutral K7 block 111.'));
  assert.ok(auditSource.includes('Gwangju home cheering filter should hide away cheering K7 blocks.'));
  assert.ok(auditSource.includes('Gwangju away cheering filter should hide home cheering K7 blocks.'));
  assert.ok(auditSource.includes('Gwangju outfield/table filter should keep five-table seat blocks interactive.'));
  assert.ok(auditSource.includes('readGwangjuVisibleDerivedRangeBadges'));
  assert.ok(auditSource.includes('Gwangju K7 107 detail should show K7 and away derived badges.'));
  assert.ok(auditSource.includes('Gwangju K7 111 detail should show only K7 derived badge.'));
  assert.ok(auditSource.includes('Gwangju K7 118 detail should show K7 and home cheering derived badges.'));
  assert.ok(auditSource.includes("getByRole('button', { name: '확대'"));
  assert.ok(auditSource.includes("getByRole('button', { name: '원래 크기'"));
  requiredMarkerClickLabels.forEach((label) => {
    assert.ok(auditSource.includes(label), `${label} should be part of Gwangju marker click QA`);
  });
});
test('광주 좌석도 release lock 문서는 K7/AWAY block-range 검수 계약을 고정한다', () => {
  const releaseLockSource = readProjectFile('docs/gwangju-seatmap-release-lock.md');
  const dataSource = readProjectFile('src/data/gwangjuSeatData.ts');
  const dataTestSource = readProjectFile('src/data/gwangjuSeatData.test.ts');
  const componentSource = readProjectFile('src/components/gwangju/GwangjuSeatMap.tsx');
  const runbookSource = readProjectFile('docs/gwangju-seatmap-operator-runbook.md');
  const releaseHandoffSource = readProjectFile('docs/gwangju-seatmap-release-handoff.md');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );

  [
    'gwangju-kia-seatmap-official-2026.webp',
    '공식 이미지 좌표계: `2200x1159`',
    '`GWANGJU_SEATMAP_IMAGE`',
    '`GWANGJU_IMAGE_GEOMETRY_DRAFTS`',
    '`GWANGJU_OFFICIAL_TRACE_REFERENCE`',
    '`GWANGJU_BLOCKS`',
    '`OFFICIAL_IMAGE_PIXEL_TRACE`',
    '`OFFICIAL_IMAGE_TRACED`',
    '`PIXEL_ALIGNED`',
    '`gwangju-precision-v1`',
    '`manual-polygon-v113`',
    '`GWANGJU_PRECISION_V1`',
    '`activeBlocks=113`',
    '`GWANGJU_BASE_TRACE_BLOCK_COUNT === 111`',
    '`GWANGJU_EXPECTED_TRACE_BLOCK_COUNT === 113`',
    '`officialImageTracedBlocks=113`',
    '`directOfficialTraceBlocks=113`',
    '`manualReviewedBlocks=113`',
    '`pixelAlignedBlocks=113`',
    '`fullRetracedBlocks=113`',
    '`blocksChangedFromPreviousTrace=113`',
    '`totalRetracePointDelta=7222`',
    '`overlapWarnings=0`',
    '`minimumPixelCoverageRatio=1.0000`',
    '`componentCoverageWarnings=0`',
    '`minimumOfficialComponentRecall=1.0000`',
    '`minimumComponentIoU=0.9255`',
    '`repeatedNumberedBlockMinimumPixelCoverageRatio=1.0000`',
    '`GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === true`',
    '`GWANGJU_SEATMAP_COORDINATES_READY === true`',
    '`operatorRequiredSections=-`',
    '`K7석`: `107`, `108`, `109`, `110`, `111`, `118`, `119`, `120`, `121`, `122`',
    '`원정응원석`: `107`, `108`, `109`, `110`',
    '`홈 응원석`: `118`, `119`, `120`, `121`, `122`',
    '`111`: `K7` 카테고리지만 `fanRole: NEUTRAL`',
    '`내야석`: K7 `107~111`, `118~122` 전체를 포함한다.',
    '`K7석`: `home-k7-seats` aggregate hit-area를 노출하고 source 번호 블럭 hit-area는 해당 필터에서 숨긴다.',
    '`응원석`: `fanRole: HOME/AWAY`인 K7 `107~110`, `118~122`만 포함한다.',
    '`홈 응원석`: K7 `118~122`만 포함한다.',
    '`원정응원석`: `away-cheering-seats` aggregate hit-area를 노출하고 source `107~110` 번호 블럭 hit-area는 해당 필터에서 숨긴다.',
    '`GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES`',
    '`derived-k7-seats`: `filterGroupId=k7`, `displayBlocks=107~111, 118~122`, `aggregateHitArea=OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    '`derived-away-cheering-seats`: `filterGroupId=away-cheering`, `displayBlocks=107~110`, `fanRoles=AWAY`, `aggregateHitArea=OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    '`derived-home-cheering-seats`: `filterGroupId=home-cheering`, `displayBlocks=118~122`, `fanRoles=HOME`, `aggregateHitArea=REUSES_EXISTING_TRACE_ONLY`',
    '`operatorPolygonStatus`는 `OFFICIAL_DERIVED_READY`',
    'K7/AWAY derived range는 UX 표시/필터 계약과 filter 전용 aggregate hit-area를 함께 제공한다.',
    '현재 release 기준은 active 113개이다.',
    '`home-k7-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`',
    '`away-cheering-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`',
    'K7/AWAY aggregate hit-area는 공식 이미지 `2200x1159` 기준 검수 완료 번호 블럭 subpath만 합성한다.',
    'active block 기준은 `111`에서 `113`으로 전환되어 있다.',
    'O/P 외야 계열은 기존 `pixelCoverageRatio`만으로는 작은 polygon이 공식 색상 영역 내부에 있을 때 통과할 수 있으므로',
    '최소 공식 component recall: `0.78`',
    '최소 component IoU: `0.62`',
    '`outfield-right-seats`는 공식 이미지 component `outfield-3` bounds `1184,341,1333,838` 기준으로 하단까지 포함해야 한다.',
    '런타임 SVG는 `GWANGJU_BLOCKS.map`과 `d={block.imageGeometry.d}`만 일반 좌석 `<path>` source로 사용한다.',
    '`GWANGJU_NON_SELECTABLE_MARKER_ZONES`는 좌석 `<path>`가 아니라 차단용 marker layer이며 block detail 선택 대상이 아니다.',
    '`reports/stadium/gwangju-seatmap-trace-review.md`',
    '`reports/stadium/gwangju-seatmap-trace-review-overlay.png`',
    '`reports/stadium/gwangju-seatmap-trace-review-clean-crops/`',
    '`docs/gwangju-seatmap-operator-runbook.md`',
    '`docs/gwangju-seatmap-release-handoff.md`',
    '`reports/stadium/gwangju-seatmap-operator-status.md`',
    '`reports/stadium/gwangju-seatmap-release-package.md`',
    '`reports/stadium/gwangju-seatmap-release-gate.md`',
    '`reports/stadium/gwangju-seatmap-runtime-layer-audit.md`',
    '`reports/stadium/gwangju-seatmap-runtime-layer-audit.json`',
    '`reports/stadium/gwangju-seatmap-release-scope-guard.md`',
    '`reports/stadium/gwangju-seatmap-release-scope-guard.json`',
    'PR packaging manifest: `reports/stadium/gwangju-seatmap-release-scope-guard.md`',
    'Targeted staging report: `reports/stadium/gwangju-seatmap-targeted-staging.md`',
    'Targeted staging report JSON: `reports/stadium/gwangju-seatmap-targeted-staging.json`',
    'Staged scope audit: `reports/stadium/gwangju-seatmap-staged-scope-audit.md`',
    'Staged scope audit JSON: `reports/stadium/gwangju-seatmap-staged-scope-audit.json`',
    '`../output/playwright/stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.md`',
    '`operator-provided official image coordinates only`',
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
    '`MANUAL_BASEBALL_DATA_REQUIRED`',
    'npm run stadium:gwangju:operator-status',
    'npm run test:stadium:seatmaps',
    'node scripts/stadium-seatmap-ops.mjs gwangju trace-review',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-package',
    'npm run qa:stadium:gwangju:release-gate',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-scope-guard',
    'node scripts/stadium-seatmap-ops.mjs gwangju targeted-staging',
    'node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness',
    'npm run build',
    '`pending=0`',
    '`validDataDiff=2`',
    '`blockers=0`',
    '광주 계약 PASS',
    '`status=ready`',
    '`derivedRanges=3`',
    '`status=passed`',
    '`steps=5/5`',
    '`included=26`',
    '`separate=<runtime>`',
    '`unexpected=0`',
    '`inventoryDrift=0`',
    '`scopeGuardStatus=passed`',
    '`scopeGuardIncludedFiles=26`',
    '`scopeGuardSeparateDirtyWorkFiles=<runtime>`',
    '`scopeGuardSeparateDirtyWorkBaselineFiles=74`',
    '`classifiedSeparateDirtyWorkExpansionAllowed=true`',
    '`scopeGuardUnexpectedFiles=0`',
    '`scopeGuardBlockers=0`',
    '`releasePackageStatus=ready`',
    '`operatorStatus=ready`',
    '`browserQaStatus=passed`',
    '`runtimeLayerAuditStatus=passed`',
    '`activeTraceBlocks=113`',
    'current K7/AWAY aggregate release is already active at `activeBlocks=113`',
    'preoperator 통과 + official derived aggregate release + scope guard 통과',
    'release-gate -> targeted-staging -> staged-scope-audit -> release-audit',
    '`commit-readiness`는 `targeted-staging -> staged-scope-audit --require-complete -> release-audit` 순서이다.',
    'release scope guard가 광주 release package와 Daegu/Daejeon/Sajik/Suwon 분리 범위를 구분하지 못하거나 알 수 없는 dirty file을 감지한다.',
    'PR packaging manifest가 광주 release 후보 26개, separate dirty work baseline 74개, runtime classified separate dirty work, unexpected 0, blockers 0 기준을 한 문서로 고정하지 못한다.',
    'release scope guard의 release candidate inventory가 `expectedIncludedFileCount=26`, `actualIncludedFileCount=26`, `missingExpectedIncludedFiles=[]`, `extraIncludedFiles=[]` 상태를 잃는다.',
    'release scope guard의 separate work inventory가 `expectedSeparateDirtyWorkCount baseline=74`, `classifiedSeparateDirtyWorkExpansionAllowed=true` 상태를 잃거나 classified separate dirty work를 blocker로 처리한다.',
    'release scope guard의 `prPackagingManifest.releasePayloadFileCount=26`, `separateDirtyWorkFileCount=<runtime>`, `unexpectedDirtyFileCount=0`, `inventoryDriftCount=0` 상태를 잃는다.',
    'release scope guard의 `patchSeparationReadiness.status=ready-or-review-required` 상태를 잃거나 clean release payload files are not packaging blockers 계약을 숨긴다.',
    'patch separation readiness가 release payload files have unreviewed mixed or untracked diffs 상태에서만 review-required가 됨을 문서화하지 않는다.',
    'PR staging plan이 `stagingPlan.status=ready-or-review-required`, `stagingPlan.doesNotRunGitAdd=true`, `stagingPlan.safeToRunBulkGitAdd=false`, `stagingPlan.releasePayloadFileCount=26`, `stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true` 계약을 잃는다.',
    'PR staging review가 `stagingReview.status=ready-or-review-required`, `stagingReview.doesNotRunGitAdd=true`, `stagingReview.safeToRunBulkGitAdd=false`, `stagingReview.releasePayloadFileCount=26`, `stagingReview.recommendsOnlyIncludedFiles=true`, `stagingReview.doesNotRecommendSeparateDirtyWork=true` 계약을 잃는다.',
    'targeted staging report가 `targetedStaging.status=ready`, `targetedStaging.doesNotRunGitAdd=true`, `targetedStaging.safeToRunBulkGitAdd=false`, `targetedStaging.targetFileCount=26`, `targetedStaging.reviewedUntrackedSatisfiedFileCount=5` 계약을 잃는다.',
    'targeted staging report가 separate dirty work를 staging 대상으로 추천하거나 `git add .`, `git add -A`, `git commit -am`을 허용한다.',
    'staged scope audit가 `stagedScopeAudit.status=ready`, `stagedScopeAudit.doesNotRunGitAdd=true`, `stagedScopeAudit.safeToRunBulkGitAdd=false`, `stagedScopeAudit.expectedTargetFileCount=26`, `stagedScopeAudit.stagedOutsideTargetFileCount=0`, `stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0` 계약을 잃는다.',
    'staged scope audit가 targeted staging 파일 외 staged 파일이나 separate dirty work staged 파일을 허용한다.',
    'commit-readiness가 `--require-complete` strict mode를 잃거나, 명시적 26-file staging 전 `STAGED_TARGET_FILE_MISSING`으로 실패하지 않는다.',
    'commit-readiness가 모든 targeted file staged 이후 `stagedScopeAudit.requireComplete=true`, `stagedScopeAudit.missingStagedTargetFileCount=0`, `readyForCommit=true` 계약을 고정하지 못한다.',
    '`prPackagingManifest.releasePayloadFileCount=26`',
    '`prPackagingManifest.separateDirtyWorkFileCount=<runtime>`',
    '`prPackagingManifest.unexpectedDirtyFileCount=0`',
    '`prPackagingManifest.inventoryDriftCount=0`',
    '`patchSeparationReadiness.status=ready-or-review-required`',
    'clean release payload files are not packaging blockers',
    'node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-review',
    'gwangju-seatmap-pr-staging-review.json',
    'gwangju-seatmap-pr-staging-review.md',
    'stagingReview.status=ready-or-review-required',
    'stagingReview.doesNotRunGitAdd=true',
    'stagingReview.safeToRunBulkGitAdd=false',
    'stagingReview.releasePayloadFileCount=26',
    'stagingReview.recommendsOnlyIncludedFiles=true',
    'stagingReview.doesNotRecommendSeparateDirtyWork=true',
    '## 남은 작업',
    '`activeBlocks=113`',
    '`operatorStatus=ready`',
    '`OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    '`OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP`',
    '공식 derived aggregate filter',
    '실제 클릭 대상이 필요한 non-overlap operator target',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  [
    "export const GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE = true",
    "export const GWANGJU_PREVIOUS_TRACE_VERSION = 'manual-polygon-v113'",
    "export const GWANGJU_FULL_RETRACE_VERSION = 'gwangju-precision-v1'",
    "export const GWANGJU_FULL_RETRACE_GENERATION: GwangjuTraceGeneration = 'GWANGJU_PRECISION_V1'",
    'export const GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES',
    'export const GWANGJU_ZONE_PRECISION_WORKSETS',
    "'p1-op-outfield-component'",
    "'p5-full-release-reference'",
    "componentIds: ['outfield-3']",
    'GWANGJU_OP_COMPONENT_COVERAGE_MIN_RECALL',
    'GWANGJU_OP_COMPONENT_COVERAGE_MIN_IOU',
    "export const GWANGJU_FULL_RETRACE_GENERATION",
    "export const GWANGJU_BASE_TRACE_BLOCK_COUNT = 111",
    "export const GWANGJU_K7_OFFICIAL_BLOCKS = ['107', '108', '109', '110', '111', '118', '119', '120', '121', '122']",
    "export const GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS = ['107', '108', '109', '110']",
    "export const GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS = ['118', '119', '120', '121', '122']",
    'export const GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES',
    "displayBlocks: '107~111, 118~122'",
    "displayBlocks: '107~110'",
    "displayBlocks: '118~122'",
    'getGwangjuDerivedOperatorRangesForBlock',
    "{ id: 'k7', label: 'K7석', cats: ['K7'],",
    "{ id: 'cheering', label: '응원석', cats: ['K7', 'AWAY'], fanRoles: ['HOME', 'AWAY'],",
    "{ id: 'home-cheering', label: '홈 응원석', cats: ['K7'], fanRoles: ['HOME'],",
    "{ id: 'away-cheering', label: '원정응원석', cats: ['AWAY'], fanRoles: ['AWAY'],",
    "status: 'READY'",
    'matchesGwangjuCategoryGroup',
  ].forEach((requiredText) => {
    assert.ok(dataSource.includes(requiredText), `Gwangju data should include ${requiredText}`);
  });

  [
    '광주 K7/원정응원석 운영자 블럭 범위는 공식 번호 블럭 기반 aggregate hit-area에 연결한다',
    '광주 K7/AWAY derived range는 기존 traced block과 aggregate hit-area를 서비스 필터에 연결한다',
    '광주 K7/AWAY는 공식 번호 블럭 aggregate로 active 113개 상태를 유지한다',
    '광주 응원석 필터는 K7 번호 블럭을 fanRole 기준으로 분리한다',
    'GWANGJU_BASE_TRACE_BLOCK_COUNT, 111',
    'GWANGJU_IMAGE_GEOMETRY_DRAFTS[block.id]',
    "assert.deepEqual(k7Blocks, [...GWANGJU_K7_OFFICIAL_BLOCKS, 'K7석'].sort())",
    "assert.equal(k7Range?.filterGroupId, 'k7')",
    "assert.equal(k7Range?.displayBlocks, '107~111, 118~122')",
    "getGwangjuDerivedOperatorRangesForBlock('k7-107')",
    "assert.equal(k7Range?.aggregateHitArea, 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE')",
    "assert.equal(blocksByOfficialBlock.get('111')?.fanRole, 'NEUTRAL')",
    "assert.equal(GWANGJU_BLOCKS.filter((block) => block.category === 'AWAY').length, 1)",
    "assert.equal(matchesGwangjuCategoryGroup(blocksByOfficialBlock.get('111')!, cheeringGroup), false)",
    "assert.equal(matchesGwangjuCategoryGroup(blocksByOfficialBlock.get('111')!, groupsById.get('infield')!), true)",
  ].forEach((requiredText) => {
    assert.ok(dataTestSource.includes(requiredText), `Gwangju data tests should include ${requiredText}`);
  });

  [
    'GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES',
    'data-derived-range-id',
    'data-derived-block-ids',
    'data-aggregate-hit-area',
    'data-testid="gwangju-derived-range-summary"',
    'data-testid="gwangju-derived-range-blocks"',
    'data-testid="gwangju-derived-range-neutral-note"',
    'gwangju-section-derived-range-',
  ].forEach((requiredText) => {
    assert.ok(componentSource.includes(requiredText), `Gwangju component should include ${requiredText}`);
  });

  [
    'getGwangjuDerivedOperatorRangesForBlock',
    'extraMeta={renderDerivedRangeMeta}',
    'data-derived-blocks={range.displayBlocks}',
  ].forEach((requiredText) => {
    assert.ok(componentSource.includes(requiredText), `Gwangju shared panel wiring should include ${requiredText}`);
  });

  [
    'gwangju-browser-coordinate-audit',
    '101-108-h-i-j-browser-coordinate-crop',
    'svgViewBox',
    'svgScreenRect',
    'preserveAspectRatio',
    'first-wheelchair-seats',
    'party-seats-first',
  ].forEach((requiredText) => {
    assert.ok(auditSource.includes(requiredText), `Gwangju browser coordinate audit should include ${requiredText}`);
  });

  [
    '`K7석`: `107~111`, `118~122`',
    '`원정응원석`: `107~110`',
    '`홈 응원석`: `118~122`',
    '선택된 파생 필터는 `displayBlocks` 요약을 표시한다',
    '현재 production data는 이 공식 번호 블럭 polygon을 multi-subpath aggregate로 묶어 `home-k7-seats`, `away-cheering-seats` filter 전용 hit-area를 제공하므로 active block 수는 `113`이다.',
    '현재 최종 trace 기준은 기본 111개 + 공식 derived aggregate 2개, 총 active 113개이다.',
    '공식 이미지 검수 번호 블럭 polygon을 합성한 `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE` 상태다.',
    '`OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP`',
    'non-overlap 구역만 별도 operator target',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-package',
    'npm run qa:stadium:gwangju:release-gate',
    'reports/stadium/gwangju-seatmap-release-package.json',
    'reports/stadium/gwangju-seatmap-release-gate.json',
    'docs/gwangju-seatmap-release-handoff.md',
    'gwangju-browser-coordinate-audit',
    'gwangju-browser-101-108-h-i-j-browser-coordinate-crop',
    'data file을 수정하지 않는다',
    'operator-provided official image coordinates only',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredText) => {
    assert.ok(runbookSource.includes(requiredText), `Gwangju runbook should include ${requiredText}`);
  });

  [
    'Release State',
    'Current Acceptance',
    'Change Scope',
    'K7/AWAY Contract',
    'Operator Polygon Status',
    'Source Policy',
    'Handoff Commands',
    '`OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    '`OFFICIAL_DERIVED_READY`',
    '`MANUAL_BASEBALL_DATA_REQUIRED`',
    '`SPECIAL_BLOCKS` includes K7/AWAY aggregate block definitions.',
    '`GWANGJU_IMAGE_GEOMETRY_DRAFTS` includes `home-k7-seats` and `away-cheering-seats` geometry generated from official traced source blocks.',
    '`status=passed`',
    '`blockers=0`',
    '`steps=5/5`',
    '`operatorStatus=ready`',
    '`browserQaStatus=passed`',
    '`runtimeLayerAuditStatus=passed`',
    '`activeTraceBlocks=113`',
    'runtime layer audit: `node scripts/stadium-seatmap-ops.mjs gwangju runtime-layer`',
    'runtime layer audit status: `passed`',
    'release scope guard: `node scripts/stadium-seatmap-ops.mjs gwangju release-scope-guard`',
    'release scope guard status: `passed`',
    'release scope guard included release files: `26`',
    'release scope guard dirty files: runtime classified count',
    'release scope guard dirty included release files: runtime classified count',
    'release scope guard separate dirty work files: runtime classified count',
    'release scope guard separate dirty work baseline files: `74`',
    'classified separate dirty work expansion allowed: `true`',
    'release scope guard unexpected files: `0`',
    'release scope guard blockers: `0`',
    'release scope guard inventory drift: `0`',
    'patch separation readiness: `ready` or `review-required`',
    'patch separation mixed status: `none` unless release payload files have unreviewed mixed or untracked diffs',
    'PR staging plan status: `ready` or `review-required`',
    'PR staging plan does not run git add: `true`',
    'PR staging plan bulk git add allowed: `false`',
    'staged scope audit require complete: `false`',
    'staged scope audit missing staged target files: `<dirty-target-count>` before explicit staging',
    'commit readiness before explicit staging: `blocked expected`',
    'commit readiness after explicit 26-file staging: must pass with `stagedScopeAudit.requireComplete=true` and `stagedScopeAudit.missingStagedTargetFileCount=0`',
    '`release-verify` runs `release-gate -> targeted-staging -> staged-scope-audit -> release-audit`.',
    '`releaseScopeGuardStatus=passed`',
    '`releaseScopeGuardIncludedFiles=26`',
    '`releaseScopeGuardDirtyFiles=runtime`',
    '`releaseScopeGuardDirtyIncludedFiles=runtime`',
    '`releaseScopeGuardSeparateDirtyWorkFiles=runtime`',
    '`releaseScopeGuardSeparateDirtyWorkBaselineFiles=74`',
    '`classifiedSeparateDirtyWorkExpansionAllowed=true`',
    '`releaseScopeGuardUnexpectedFiles=0`',
    '`releaseScopeGuardBlockers=0`',
    '`releaseScopeGuardInventoryDrift=0`',
    '`patchSeparationReadiness=ready-or-review-required`',
    '`patchSeparationPackageStatus=none-or-mixed`',
    '`stagingPlanStatus=ready-or-review-required`',
    '`stagingPlanDoesNotRunGitAdd=true`',
    '`stagingPlanSafeToRunBulkGitAdd=false`',
    '`stagedScopeAuditRequireComplete=false`',
    '`stagedScopeAuditMissingTargetFiles=<dirty-target-count>-before-staging`',
    'gwangju-seatmap-release-scope-guard.json',
    'gwangju-seatmap-release-scope-guard.md',
    'gwangju-seatmap-runtime-layer-audit.json',
    'gwangju-seatmap-runtime-layer-audit.csv',
    'gwangju-seatmap-runtime-layer-audit.md',
    'gwangju-seatmap-pr-staging-plan.json',
    'gwangju-seatmap-pr-staging-plan.md',
    'gwangju-seatmap-pr-staging-review.json',
    'gwangju-seatmap-pr-staging-review.md',
    'gwangju-seatmap-targeted-staging.json',
    'gwangju-seatmap-targeted-staging.csv',
    'gwangju-seatmap-targeted-staging.md',
    'gwangju-seatmap-staged-scope-audit.json',
    'gwangju-seatmap-staged-scope-audit.csv',
    'gwangju-seatmap-staged-scope-audit.md',
    'node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-plan',
    'node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-review',
    'node scripts/stadium-seatmap-ops.mjs gwangju targeted-staging',
    'node scripts/stadium-seatmap-ops.mjs gwangju staged-scope-audit',
    'node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-scope-guard',
    'Release Candidate Inventory',
    'PR Packaging Manifest',
    'PR packaging manifest source of truth: `reports/stadium/gwangju-seatmap-release-scope-guard.md`',
    'Release PR scope: Gwangju official derived aggregate release package and build verification reports.',
    'Excluded PR scope: Daegu work, Daejeon work, Sajik work, Suwon work, and cross-stadium utilities.',
    'Included release candidate files: `26`',
    'Separate dirty work files: runtime classified count',
    'Separate dirty work baseline files: `74`',
    'Classified separate dirty work expansion allowed: `true`',
    'Inventory drift: `0`',
    'releaseCandidateInventory.expectedIncludedFileCount=26',
    'separateWorkInventory.expectedSeparateDirtyWorkCount baseline=74',
    'actualSeparateDirtyWorkCount=<runtime>',
    'separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true',
    'prPackagingManifest.releasePayloadFileCount=26',
    'prPackagingManifest.separateDirtyWorkFileCount=<runtime>',
    'prPackagingManifest.unexpectedDirtyFileCount=0',
    'prPackagingManifest.inventoryDriftCount=0',
    'Patch Separation Readiness',
    'patchSeparationReadiness.status=ready-or-review-required',
    'patchSeparationReadiness only becomes `review-required` when release payload files have unreviewed mixed or untracked diffs.',
    'reviewed expected untracked release files are ready for targeted staging.',
    'clean release payload files are not packaging blockers',
    'PR Staging Plan',
    'stagingPlan.status=ready-or-review-required',
    'stagingPlan.doesNotRunGitAdd=true',
    'stagingPlan.safeToRunBulkGitAdd=false',
    'stagingPlan.releasePayloadFileCount=26',
    'stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true',
    'stagingReview.status=ready-or-review-required',
    'stagingReview.doesNotRunGitAdd=true',
    'stagingReview.safeToRunBulkGitAdd=false',
    'stagingReview.releasePayloadFileCount=26',
    'stagingReview.recommendsOnlyIncludedFiles=true',
    'stagingReview.doesNotRecommendSeparateDirtyWork=true',
    'Targeted Staging Report',
    'targetedStaging.status=ready',
    'targetedStaging.doesNotRunGitAdd=true',
    'targetedStaging.safeToRunBulkGitAdd=false',
    'targetedStaging.recommendsOnlyIncludedFiles=true',
    'targetedStaging.doesNotRecommendSeparateDirtyWork=true',
    'targetedStaging.targetFileCount=26',
    'targetedStaging.reviewedUntrackedSatisfiedFileCount=5',
    'Staged Scope Audit',
    'stagedScopeAudit.status=ready',
    'stagedScopeAudit.requireComplete=false',
    'stagedScopeAudit.doesNotRunGitAdd=true',
    'stagedScopeAudit.safeToRunBulkGitAdd=false',
    'stagedScopeAudit.acceptsOnlyTargetedStagingFiles=true',
    'stagedScopeAudit.blocksSeparateDirtyWork=true',
    'stagedScopeAudit.expectedTargetFileCount=26',
    'stagedScopeAudit.missingStagedTargetFileCount=<dirty-target-count> before explicit staging',
    'stagedScopeAudit.stagedOutsideTargetFileCount=0',
    'stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0',
    'strict commit-readiness mode: `node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness`',
    'strict commit-readiness adds `--require-complete` and blocks with `STAGED_TARGET_FILE_MISSING` until all dirty targeted release files are staged.',
    'Run `node scripts/stadium-seatmap-ops.mjs gwangju pre-pr-final-gate` before staging. Run `node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness` only after explicit `git add -- <26 target files>`.',
    'explicit-file-list-only',
    'Review focus files: `package.json`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `src/components/ChatBotFloatingButton.tsx`, `src/components/ChatBotRuntime.tsx`, `src/components/MateResultsRuntime.tsx`, `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`.',
    'RELEASE_CANDIDATE_FILE_MISSING',
    'CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED',
    'Gwangju release package',
    'Separate dirty work that must not be judged by this handoff',
    'Daejeon files',
    'Sajik files',
    'Suwon files',
    'Daegu files',
    'src/components/AppRoutes.tsx',
    'src/utils/seatMapPolygonValidator.ts',
    'K7/AWAY aggregate hit-areas are enabled within the current `113` active block release through official numbered-block aggregate geometry.',
    '`SPECIAL_BLOCKS` includes K7/AWAY aggregate block definitions.',
    '`GWANGJU_IMAGE_GEOMETRY_DRAFTS` includes `home-k7-seats` and `away-cheering-seats` geometry generated from official traced source blocks.',
    'Do not replace the current `113` active block aggregate release with new operator geometry unless',
    'future independent operator polygon inputs that share `officialBlocks` must be split into non-overlapping targets first',
  ].forEach((requiredText) => {
    assert.ok(releaseHandoffSource.includes(requiredText), `Gwangju handoff should include ${requiredText}`);
  });

  [
    'Gwangju cheering filter should hide neutral K7 block 111.',
    'Gwangju K7 filter should expose the K7 aggregate hit-area.',
    'Gwangju K7 filter should replace away source K7 blocks with the aggregate hit-area.',
    'Gwangju K7 filter should replace home source K7 blocks with the aggregate hit-area.',
    'Gwangju K7 filter should hide non-K7 infield seat hit-areas.',
    'Gwangju home cheering filter should hide away cheering K7 blocks.',
    'Gwangju away cheering filter should hide home cheering K7 blocks.',
    'Gwangju K7 derived range summary should display 107~111, 118~122.',
    'Gwangju K7 derived range summary should mark neutral block 111.',
    'Gwangju home cheering derived range summary should display 118~122.',
    'Gwangju away cheering derived range summary should display 107~110.',
    'Gwangju K7 107 detail should show K7 and away derived badges.',
    'Gwangju K7 111 detail should show only K7 derived badge.',
    'Gwangju K7 118 detail should show K7 and home cheering derived badges.',
    'Gwangju K7/AWAY sections must be official-traced before becoming clickable',
  ].forEach((requiredText) => {
    assert.ok(auditSource.includes(requiredText), `Gwangju QA audit should include ${requiredText}`);
  });
});
