import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const outputRoot = path.join(repoRoot, 'output/playwright');

const AUDIT_VERSION = 'GWANGJU_SEATMAP_RELEASE_AUDIT_V1';
const AUDIT_MODE = 'OFFICIAL_DERIVED_AGGREGATE_RELEASE';
const auditJsonPath = path.join(reportDir, 'gwangju-seatmap-release-audit.json');
const auditMarkdownPath = path.join(reportDir, 'gwangju-seatmap-release-audit.md');

const inputFiles = {
  releaseGate: path.join(reportDir, 'gwangju-seatmap-release-gate.json'),
  releasePackage: path.join(reportDir, 'gwangju-seatmap-release-package.json'),
  operatorStatus: path.join(reportDir, 'gwangju-seatmap-operator-status.json'),
  traceReview: path.join(reportDir, 'gwangju-seatmap-trace-review.json'),
  runtimeLayerAudit: path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.json'),
  releaseScopeGuard: path.join(reportDir, 'gwangju-seatmap-release-scope-guard.json'),
  prStagingPlan: path.join(reportDir, 'gwangju-seatmap-pr-staging-plan.json'),
  targetedStaging: path.join(reportDir, 'gwangju-seatmap-targeted-staging.json'),
  stagedScopeAudit: path.join(reportDir, 'gwangju-seatmap-staged-scope-audit.json'),
  releaseHandoff: path.join(frontendRoot, 'docs/gwangju-seatmap-release-handoff.md'),
  browserQaSummary: path.join(outputRoot, 'stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.json'),
};

const expectedStepCommands = [
  'npm run stadium:gwangju:operator-status',
  'npm run test:stadium:gwangju:seatmaps',
  'validate existing gwangju trace-review artifacts',
  'npm run stadium:gwangju:release-package',
  'npm run build',
];

const expectedPendingOperatorSections = [];
const STALE_TOLERANCE_MS = 1000;
const SEPARATE_DIRTY_WORK_BASELINE_FILE_COUNT = 95;
const EXPECTED_RELEASE_PAYLOAD_FILE_COUNT = 34;
const allowedPatchSeparationStatuses = new Set(['ready', 'review-required']);

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const relativePath = (filePath) => path.relative(frontendRoot, filePath);
const sorted = (values) => [...values].sort();
const sameSet = (left, right) => JSON.stringify(sorted(left ?? [])) === JSON.stringify(sorted(right ?? []));

const readJsonInput = async (key, filePath) => {
  try {
    return {
      key,
      path: relativePath(filePath),
      exists: true,
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: null,
    };
  } catch (error) {
    return {
      key,
      path: relativePath(filePath),
      exists: error?.code !== 'ENOENT',
      data: null,
      error: error?.code === 'ENOENT' ? 'MISSING_RELEASE_AUDIT_INPUT' : `READ_FAILED:${error.message}`,
    };
  }
};

const readTextInput = async (key, filePath) => {
  try {
    return {
      key,
      path: relativePath(filePath),
      exists: true,
      text: await fs.readFile(filePath, 'utf8'),
      error: null,
    };
  } catch (error) {
    return {
      key,
      path: relativePath(filePath),
      exists: error?.code !== 'ENOENT',
      text: '',
      error: error?.code === 'ENOENT' ? 'MISSING_RELEASE_AUDIT_INPUT' : `READ_FAILED:${error.message}`,
    };
  }
};

const fileInfo = async ([key, filePath]) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      key,
      path: relativePath(filePath),
      exists: true,
      mtimeMs: stats.mtimeMs,
      modifiedAt: stats.mtime.toISOString(),
    };
  } catch (error) {
    return {
      key,
      path: relativePath(filePath),
      exists: false,
      mtimeMs: null,
      modifiedAt: null,
      error: error?.code === 'ENOENT' ? 'MISSING_RELEASE_AUDIT_INPUT' : `STAT_FAILED:${error.message}`,
    };
  }
};

const isStaleBefore = (later, earlier) => {
  if (!later?.exists || !earlier?.exists) return false;
  return later.mtimeMs + STALE_TOLERANCE_MS < earlier.mtimeMs;
};

const jsonInputs = Object.fromEntries(await Promise.all(
  Object.entries(inputFiles)
    .filter(([key]) => key !== 'releaseHandoff')
    .map(async ([key, filePath]) => [key, await readJsonInput(key, filePath)]),
));
const releaseHandoff = await readTextInput('releaseHandoff', inputFiles.releaseHandoff);
const fileInfos = Object.fromEntries(await Promise.all(
  Object.entries(inputFiles).map(async (entry) => {
    const info = await fileInfo(entry);
    return [info.key, info];
  }),
));

const releaseGate = jsonInputs.releaseGate?.data;
const releasePackage = jsonInputs.releasePackage?.data;
const operatorStatus = jsonInputs.operatorStatus?.data;
const traceReview = jsonInputs.traceReview?.data;
const runtimeLayerAudit = jsonInputs.runtimeLayerAudit?.data;
const releaseScopeGuard = jsonInputs.releaseScopeGuard?.data;
const prStagingPlan = jsonInputs.prStagingPlan?.data;
const targetedStaging = jsonInputs.targetedStaging?.data;
const stagedScopeAudit = jsonInputs.stagedScopeAudit?.data;
const browserQaSummary = jsonInputs.browserQaSummary?.data;

const blockers = [];
const warnings = [];
const checks = [];

for (const input of [...Object.values(jsonInputs), releaseHandoff]) {
  if (input.error) blockers.push(`${input.error}:${input.path}`);
}

const addCheck = (name, expected, actual, pass, blockerCode) => {
  checks.push({ name, expected, actual, pass });
  if (!pass) blockers.push(`${blockerCode}:${actual ?? 'missing'}`);
};

const releaseGateSteps = releaseGate?.steps ?? [];
const releaseGatePassedSteps = releaseGateSteps.filter((step) => step.status === 'passed').length;
const releaseGateCommands = releaseGateSteps.map((step) => step.command);
const scopeGuardSeparateBaselineCount = releaseScopeGuard?.separateWorkInventory?.expectedSeparateDirtyWorkCount ?? null;
const scopeGuardActualSeparateCount = releaseScopeGuard?.separateWorkInventory?.actualSeparateDirtyWorkCount ?? null;
const scopeGuardClassifiedExpansionAllowed = releaseScopeGuard?.separateWorkInventory?.classifiedSeparateDirtyWorkExpansionAllowed === true;
const prStagingPlanClassifiedExpansionAllowed = prStagingPlan?.summary?.classifiedSeparateDirtyWorkExpansionAllowed === true;

addCheck('release gate version', AUDIT_VERSION.replace('AUDIT', 'GATE'), releaseGate?.version, releaseGate?.version === 'GWANGJU_SEATMAP_RELEASE_GATE_V1', 'RELEASE_GATE_VERSION_CHANGED');
addCheck('release gate status', 'passed', releaseGate?.status, releaseGate?.status === 'passed', 'RELEASE_GATE_NOT_PASSED');
addCheck('release gate blockers', 0, releaseGate?.blockers?.length ?? releaseGate?.finalChecks?.blockers, (releaseGate?.blockers ?? []).length === 0 && releaseGate?.finalChecks?.blockers === 0, 'RELEASE_GATE_BLOCKERS_PRESENT');
addCheck('release gate steps', '5/5', `${releaseGatePassedSteps}/${releaseGate?.finalChecks?.totalSteps ?? releaseGateSteps.length}`, releaseGatePassedSteps === 5 && releaseGateSteps.length === 5 && releaseGate?.finalChecks?.completedSteps === 5, 'RELEASE_GATE_STEPS_NOT_COMPLETE');
addCheck('release gate command order', expectedStepCommands.join(' -> '), releaseGateCommands.join(' -> '), JSON.stringify(releaseGateCommands) === JSON.stringify(expectedStepCommands), 'RELEASE_GATE_COMMAND_ORDER_CHANGED');
addCheck('release gate package status', 'ready', releaseGate?.finalChecks?.releasePackageStatus, releaseGate?.finalChecks?.releasePackageStatus === 'ready', 'RELEASE_GATE_PACKAGE_NOT_READY');
addCheck('release gate operator status', 'ready', releaseGate?.finalChecks?.operatorStatus, releaseGate?.finalChecks?.operatorStatus === 'ready', 'RELEASE_GATE_OPERATOR_STATUS_NOT_READY');
addCheck('release gate browser QA', 'passed', releaseGate?.finalChecks?.browserQaStatus, releaseGate?.finalChecks?.browserQaStatus === 'passed', 'RELEASE_GATE_BROWSER_QA_NOT_PASSED');
addCheck('release gate active trace blocks', 113, releaseGate?.finalChecks?.activeTraceBlocks, releaseGate?.finalChecks?.activeTraceBlocks === 113, 'RELEASE_GATE_ACTIVE_TRACE_BLOCKS_CHANGED');
addCheck('release gate aggregate hit-area', 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY', releaseGate?.activeBlockContract?.aggregateHitArea, releaseGate?.activeBlockContract?.aggregateHitArea === 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY', 'RELEASE_GATE_AGGREGATE_HIT_AREA_CHANGED');
addCheck('release gate official aggregate ready', true, releaseGate?.activeBlockContract?.officialDerivedAggregateReady, releaseGate?.activeBlockContract?.officialDerivedAggregateReady === true, 'RELEASE_GATE_OFFICIAL_AGGREGATE_NOT_READY');

addCheck('release package status', 'ready', releasePackage?.status, releasePackage?.status === 'ready', 'RELEASE_PACKAGE_NOT_READY');
addCheck('release package blockers', 0, releasePackage?.blockers?.length, (releasePackage?.blockers ?? []).length === 0, 'RELEASE_PACKAGE_BLOCKERS_PRESENT');
addCheck('release package release mode', 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE', releasePackage?.releaseMode, releasePackage?.releaseMode === 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE', 'RELEASE_PACKAGE_MODE_CHANGED');
addCheck('release package aggregate hit-area', 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY', releasePackage?.activeBlockContract?.aggregateHitArea, releasePackage?.activeBlockContract?.aggregateHitArea === 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY', 'RELEASE_PACKAGE_AGGREGATE_HIT_AREA_CHANGED');
addCheck('release package expected trace blocks', 113, releasePackage?.activeBlockContract?.expectedTraceBlocks, releasePackage?.activeBlockContract?.expectedTraceBlocks === 113, 'RELEASE_PACKAGE_ACTIVE_TRACE_BLOCKS_CHANGED');
addCheck('release package pending sections', expectedPendingOperatorSections.join(','), releasePackage?.activeBlockContract?.pendingOperatorSections?.join(','), sameSet(releasePackage?.activeBlockContract?.pendingOperatorSections, expectedPendingOperatorSections), 'RELEASE_PACKAGE_PENDING_SECTIONS_CHANGED');

addCheck('operator status', 'ready', operatorStatus?.summary?.status, operatorStatus?.summary?.status === 'ready', 'OPERATOR_STATUS_NOT_READY');
addCheck('operator status blockers', 0, operatorStatus?.summary?.blockers?.length, (operatorStatus?.summary?.blockers ?? []).length === 0, 'OPERATOR_STATUS_BLOCKERS_PRESENT');
addCheck('operator valid data diff', 0, operatorStatus?.summary?.validDataDiffSections, operatorStatus?.summary?.validDataDiffSections === 0, 'OPERATOR_VALID_DATA_DIFF_NOT_ZERO');
addCheck('operator active trace blocks', 113, operatorStatus?.summary?.activeTraceBlocks, operatorStatus?.summary?.activeTraceBlocks === 113, 'OPERATOR_ACTIVE_TRACE_BLOCKS_CHANGED');

addCheck('trace review status', 'READY', traceReview?.summary?.traceStatus, traceReview?.summary?.traceStatus === 'READY', 'TRACE_REVIEW_NOT_READY');
addCheck('trace review total blocks', 113, traceReview?.summary?.totalBlocks, traceReview?.summary?.totalBlocks === 113, 'TRACE_REVIEW_ACTIVE_BLOCKS_CHANGED');
addCheck('trace review pixel aligned', 113, traceReview?.summary?.pixelAlignedBlocks, traceReview?.summary?.pixelAlignedBlocks === 113, 'TRACE_REVIEW_PIXEL_ALIGNMENT_CHANGED');
addCheck('trace review overlap warnings', 0, traceReview?.summary?.overlapWarningCount, traceReview?.summary?.overlapWarningCount === 0, 'TRACE_REVIEW_OVERLAP_WARNINGS_PRESENT');
addCheck('trace review O/P component coverage warnings', 0, traceReview?.summary?.componentCoverageWarningCount, traceReview?.summary?.componentCoverageWarningCount === 0, 'TRACE_REVIEW_OP_COMPONENT_COVERAGE_WARNINGS_PRESENT');
addCheck('trace review aggregate hit-area', 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY', traceReview?.summary?.aggregateHitAreaMode, traceReview?.summary?.aggregateHitAreaMode === 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY', 'TRACE_REVIEW_AGGREGATE_HIT_AREA_CHANGED');

addCheck('runtime layer audit version', 'GWANGJU_RUNTIME_LAYER_AUDIT_V1', runtimeLayerAudit?.version, runtimeLayerAudit?.version === 'GWANGJU_RUNTIME_LAYER_AUDIT_V1', 'RUNTIME_LAYER_AUDIT_VERSION_CHANGED');
addCheck('runtime layer audit status', 'passed', runtimeLayerAudit?.status, runtimeLayerAudit?.status === 'passed', 'RUNTIME_LAYER_AUDIT_NOT_PASSED');
addCheck('runtime layer source', 'GWANGJU_BLOCKS[].imageGeometry.d', runtimeLayerAudit?.runtimeSeatLayerSource, runtimeLayerAudit?.runtimeSeatLayerSource === 'GWANGJU_BLOCKS[].imageGeometry.d', 'RUNTIME_LAYER_SOURCE_CHANGED');
addCheck('runtime rendered path count', 113, runtimeLayerAudit?.summary?.renderedPathCount, runtimeLayerAudit?.summary?.renderedPathCount === 113, 'RUNTIME_LAYER_RENDERED_PATH_COUNT_CHANGED');
addCheck('runtime path mismatches', 0, runtimeLayerAudit?.summary?.pathMismatchCount, runtimeLayerAudit?.summary?.pathMismatchCount === 0, 'RUNTIME_LAYER_PATH_MISMATCHES_PRESENT');
addCheck('runtime forbidden rendered ids', 0, runtimeLayerAudit?.summary?.forbiddenRenderedIdCount, runtimeLayerAudit?.summary?.forbiddenRenderedIdCount === 0, 'RUNTIME_LAYER_FORBIDDEN_IDS_PRESENT');
addCheck('runtime label top-hit failures', 0, runtimeLayerAudit?.summary?.labelTopHitFailureCount, runtimeLayerAudit?.summary?.labelTopHitFailureCount === 0, 'RUNTIME_LAYER_LABEL_TOP_HIT_FAILURES_PRESENT');

addCheck('release scope guard version', 'GWANGJU_RELEASE_SCOPE_GUARD_V1', releaseScopeGuard?.version, releaseScopeGuard?.version === 'GWANGJU_RELEASE_SCOPE_GUARD_V1', 'RELEASE_SCOPE_GUARD_VERSION_CHANGED');
addCheck('release scope guard status', 'passed', releaseScopeGuard?.status, releaseScopeGuard?.status === 'passed', 'RELEASE_SCOPE_GUARD_NOT_PASSED');
addCheck('release scope guard blockers', 0, releaseScopeGuard?.summary?.blockerCount, releaseScopeGuard?.summary?.blockerCount === 0, 'RELEASE_SCOPE_GUARD_BLOCKERS_PRESENT');
addCheck('release scope guard unexpected files', 0, releaseScopeGuard?.summary?.unexpectedFileCount, releaseScopeGuard?.summary?.unexpectedFileCount === 0, 'RELEASE_SCOPE_GUARD_UNEXPECTED_FILES_PRESENT');
addCheck('release scope guard active block count', 113, releaseScopeGuard?.scopeContract?.activeBlockCount, releaseScopeGuard?.scopeContract?.activeBlockCount === 113, 'RELEASE_SCOPE_GUARD_ACTIVE_BLOCK_COUNT_CHANGED');
addCheck('release scope guard aggregate hit-area', 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE', releaseScopeGuard?.scopeContract?.k7AwayAggregateHitArea, releaseScopeGuard?.scopeContract?.k7AwayAggregateHitArea === 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE', 'RELEASE_SCOPE_GUARD_AGGREGATE_HIT_AREA_CHANGED');
addCheck('release scope guard included release files', EXPECTED_RELEASE_PAYLOAD_FILE_COUNT, releaseScopeGuard?.releaseCandidateInventory?.actualIncludedFileCount, releaseScopeGuard?.releaseCandidateInventory?.actualIncludedFileCount === EXPECTED_RELEASE_PAYLOAD_FILE_COUNT, 'RELEASE_SCOPE_GUARD_INCLUDED_FILE_COUNT_CHANGED');
addCheck('release scope guard missing included files', 0, releaseScopeGuard?.releaseCandidateInventory?.missingExpectedIncludedFiles?.length, (releaseScopeGuard?.releaseCandidateInventory?.missingExpectedIncludedFiles ?? []).length === 0, 'RELEASE_SCOPE_GUARD_INCLUDED_FILES_MISSING');
addCheck('release scope guard extra included files', 0, releaseScopeGuard?.releaseCandidateInventory?.extraIncludedFiles?.length, (releaseScopeGuard?.releaseCandidateInventory?.extraIncludedFiles ?? []).length === 0, 'RELEASE_SCOPE_GUARD_EXTRA_INCLUDED_FILES');
addCheck('release scope guard separate dirty work baseline files', SEPARATE_DIRTY_WORK_BASELINE_FILE_COUNT, scopeGuardSeparateBaselineCount, scopeGuardSeparateBaselineCount === SEPARATE_DIRTY_WORK_BASELINE_FILE_COUNT, 'RELEASE_SCOPE_GUARD_SEPARATE_DIRTY_WORK_BASELINE_CHANGED');
addCheck('release scope guard classified separate dirty work expansion allowed', true, scopeGuardClassifiedExpansionAllowed, scopeGuardClassifiedExpansionAllowed === true, 'RELEASE_SCOPE_GUARD_SEPARATE_EXPANSION_DISABLED');
checks.push({
  name: 'release scope guard actual separate dirty work files',
  expected: 'runtime classified count',
  actual: scopeGuardActualSeparateCount,
  pass: typeof scopeGuardActualSeparateCount === 'number',
});
checks.push({
  name: 'release scope guard missing separate dirty work files',
  expected: 'warning-only',
  actual: releaseScopeGuard?.separateWorkInventory?.missingExpectedSeparateDirtyWorkFiles?.length,
  pass: true,
});
checks.push({
  name: 'release scope guard classified additional separate dirty work files',
  expected: 'warning-only',
  actual: releaseScopeGuard?.separateWorkInventory?.classifiedAdditionalSeparateDirtyWorkCount ?? releaseScopeGuard?.separateWorkInventory?.extraSeparateDirtyWorkFiles?.length,
  pass: true,
});
addCheck('release scope guard patch separation readiness', 'ready-or-review-required', releaseScopeGuard?.patchSeparationReadiness?.status, allowedPatchSeparationStatuses.has(releaseScopeGuard?.patchSeparationReadiness?.status), 'RELEASE_SCOPE_GUARD_PATCH_SEPARATION_STATUS_CHANGED');

addCheck('PR staging plan version', 'GWANGJU_PR_STAGING_PLAN_V1', prStagingPlan?.version, prStagingPlan?.version === 'GWANGJU_PR_STAGING_PLAN_V1', 'PR_STAGING_PLAN_VERSION_CHANGED');
addCheck('PR staging plan status', 'ready-or-review-required', prStagingPlan?.status, allowedPatchSeparationStatuses.has(prStagingPlan?.status), 'PR_STAGING_PLAN_STATUS_CHANGED');
addCheck('PR staging plan blockers', 0, prStagingPlan?.summary?.blockerCount, prStagingPlan?.summary?.blockerCount === 0, 'PR_STAGING_PLAN_BLOCKERS_PRESENT');
addCheck('PR staging plan does not run git add', true, prStagingPlan?.doesNotRunGitAdd, prStagingPlan?.doesNotRunGitAdd === true, 'PR_STAGING_PLAN_GIT_ADD_ENABLED');
addCheck('PR staging plan release payload files', EXPECTED_RELEASE_PAYLOAD_FILE_COUNT, prStagingPlan?.summary?.releasePayloadFileCount, prStagingPlan?.summary?.releasePayloadFileCount === EXPECTED_RELEASE_PAYLOAD_FILE_COUNT, 'PR_STAGING_PLAN_RELEASE_PAYLOAD_COUNT_CHANGED');
addCheck('PR staging plan classified separate dirty work expansion allowed', true, prStagingPlanClassifiedExpansionAllowed, prStagingPlanClassifiedExpansionAllowed === true, 'PR_STAGING_PLAN_SEPARATE_EXPANSION_DISABLED');
checks.push({
  name: 'PR staging plan separate dirty work files',
  expected: 'runtime classified count',
  actual: prStagingPlan?.summary?.separateDirtyWorkFileCount,
  pass: typeof prStagingPlan?.summary?.separateDirtyWorkFileCount === 'number',
});
addCheck('PR staging plan unexpected files', 0, prStagingPlan?.summary?.unexpectedDirtyFileCount, prStagingPlan?.summary?.unexpectedDirtyFileCount === 0, 'PR_STAGING_PLAN_UNEXPECTED_DIRTY_FILES_PRESENT');
checks.push({
  name: 'PR staging plan package mixed status',
  expected: 'null unless package.json is mixed',
  actual: prStagingPlan?.summary?.packageJsonStatus,
  pass: prStagingPlan?.summary?.packageJsonStatus === null || prStagingPlan?.summary?.packageJsonStatus === 'MM',
});
addCheck('PR staging plan bulk add guard', false, prStagingPlan?.stagingGate?.safeToRunBulkGitAdd, prStagingPlan?.stagingGate?.safeToRunBulkGitAdd === false, 'PR_STAGING_PLAN_BULK_ADD_ALLOWED');

addCheck('targeted staging status', 'ready', targetedStaging?.status, targetedStaging?.status === 'ready', 'TARGETED_STAGING_NOT_READY');
addCheck('targeted staging blockers', 0, targetedStaging?.summary?.blockerCount, targetedStaging?.summary?.blockerCount === 0, 'TARGETED_STAGING_BLOCKERS_PRESENT');
addCheck('targeted staging target files', EXPECTED_RELEASE_PAYLOAD_FILE_COUNT, targetedStaging?.summary?.targetFileCount, targetedStaging?.summary?.targetFileCount === EXPECTED_RELEASE_PAYLOAD_FILE_COUNT, 'TARGETED_STAGING_TARGET_COUNT_CHANGED');
addCheck('targeted staging does not run git add', true, targetedStaging?.doesNotRunGitAdd, targetedStaging?.doesNotRunGitAdd === true, 'TARGETED_STAGING_GIT_ADD_ENABLED');
addCheck('targeted staging bulk add guard', false, targetedStaging?.stagingGate?.safeToRunBulkGitAdd, targetedStaging?.stagingGate?.safeToRunBulkGitAdd === false, 'TARGETED_STAGING_BULK_ADD_ALLOWED');

addCheck('staged scope audit version', 'GWANGJU_STAGED_SCOPE_AUDIT_V1', stagedScopeAudit?.version, stagedScopeAudit?.version === 'GWANGJU_STAGED_SCOPE_AUDIT_V1', 'STAGED_SCOPE_AUDIT_VERSION_CHANGED');
addCheck('staged scope audit status', 'ready', stagedScopeAudit?.status, stagedScopeAudit?.status === 'ready', 'STAGED_SCOPE_AUDIT_NOT_READY');
addCheck('staged scope audit blockers', 0, stagedScopeAudit?.summary?.blockerCount, stagedScopeAudit?.summary?.blockerCount === 0, 'STAGED_SCOPE_AUDIT_BLOCKERS_PRESENT');
addCheck('staged scope audit expected target files', EXPECTED_RELEASE_PAYLOAD_FILE_COUNT, stagedScopeAudit?.summary?.expectedTargetFileCount, stagedScopeAudit?.summary?.expectedTargetFileCount === EXPECTED_RELEASE_PAYLOAD_FILE_COUNT, 'STAGED_SCOPE_AUDIT_TARGET_COUNT_CHANGED');
addCheck('staged scope audit outside targets', 0, stagedScopeAudit?.summary?.stagedOutsideTargetFileCount, stagedScopeAudit?.summary?.stagedOutsideTargetFileCount === 0, 'STAGED_SCOPE_AUDIT_OUTSIDE_TARGETS_PRESENT');
addCheck('staged scope audit separate dirty work', 0, stagedScopeAudit?.summary?.stagedSeparateDirtyWorkFileCount, stagedScopeAudit?.summary?.stagedSeparateDirtyWorkFileCount === 0, 'STAGED_SCOPE_AUDIT_SEPARATE_DIRTY_WORK_PRESENT');
addCheck('staged scope audit does not run git add', true, stagedScopeAudit?.doesNotRunGitAdd, stagedScopeAudit?.doesNotRunGitAdd === true, 'STAGED_SCOPE_AUDIT_GIT_ADD_ENABLED');
addCheck('staged scope audit bulk add guard', false, stagedScopeAudit?.stagedScopeGate?.safeToRunBulkGitAdd, stagedScopeAudit?.stagedScopeGate?.safeToRunBulkGitAdd === false, 'STAGED_SCOPE_AUDIT_BULK_ADD_ALLOWED');

addCheck('browser QA status', 'passed', browserQaSummary?.status, browserQaSummary?.status === 'passed', 'BROWSER_QA_NOT_PASSED');
addCheck('data expected trace blocks', 113, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT === 113, 'DATA_EXPECTED_TRACE_BLOCKS_CHANGED');
addCheck('data aggregate hit-area mode', true, GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE, GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === true, 'DATA_AGGREGATE_HIT_AREA_MODE_CHANGED');
addCheck('data pending sections', expectedPendingOperatorSections.join(','), GWANGJU_PENDING_OPERATOR_SECTIONS.join(','), sameSet(GWANGJU_PENDING_OPERATOR_SECTIONS, expectedPendingOperatorSections), 'DATA_PENDING_SECTIONS_CHANGED');

const sourcePolicyValues = [
  releaseGate?.sourcePolicy,
  releasePackage?.sourcePolicy,
  operatorStatus?.sourcePolicy,
  releaseScopeGuard?.sourcePolicy,
  prStagingPlan?.sourcePolicy,
  targetedStaging?.sourcePolicy,
  stagedScopeAudit?.sourcePolicy,
].filter(Boolean);
sourcePolicyValues.forEach((policy, index) => {
  addCheck(`source policy ${index + 1} missing data contract`, 'MANUAL_BASEBALL_DATA_REQUIRED', policy.missingBaseballDataContract, policy.missingBaseballDataContract === 'MANUAL_BASEBALL_DATA_REQUIRED', 'SOURCE_POLICY_MANUAL_CONTRACT_CHANGED');
  addCheck(`source policy ${index + 1} allowed coordinate source`, 'operator-provided official PNG coordinates only', policy.allowedCoordinateSource, policy.allowedCoordinateSource === 'operator-provided official PNG coordinates only', 'SOURCE_POLICY_ALLOWED_SOURCE_CHANGED');
  addCheck(`source policy ${index + 1} coordinate system`, '2200x1159', policy.coordinateSystem, policy.coordinateSystem === '2200x1159', 'SOURCE_POLICY_COORDINATE_SYSTEM_CHANGED');
  ['browser CSS pixels', 'resized screenshots', 'external crawling', 'web-search-based baseball data', 'third-party copied seatmap images'].forEach((source) => {
    addCheck(`source policy ${index + 1} disallows ${source}`, source, policy.disallowedSources?.includes(source), policy.disallowedSources?.includes(source) === true, 'SOURCE_POLICY_DISALLOWED_SOURCE_MISSING');
  });
});

const requiredHandoffSnippets = [
  'release mode: `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
  'release gate: `npm run qa:stadium:gwangju:release-gate`',
  'runtime layer audit: `npm run qa:stadium:gwangju:runtime-layer`',
  'coordinate system: `2200x1159`',
  'active block count: `113`',
  'aggregate hit-area mode: `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY`',
  'K7/AWAY active block target `113` is enabled through official numbered-block aggregate geometry.',
  'release gate status: `passed`',
  'release gate blockers: `0`',
  'release gate steps: `5/5`',
  'release package status: `ready`',
  'operator status: `ready`',
  'browser QA status: `passed`',
  'runtime layer audit status: `passed`',
  'active trace blocks: `113`',
  'missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`',
  '`status=passed`',
  '`blockers=0`',
  '`steps=5/5`',
  '`releasePackageStatus=ready`',
  '`operatorStatus=ready`',
  '`browserQaStatus=passed`',
  '`runtimeLayerAuditStatus=passed`',
  '`activeTraceBlocks=113`',
  'release scope guard: `npm run stadium:gwangju:release-scope-guard`',
  'gwangju-seatmap-release-scope-guard.json',
  'gwangju-seatmap-release-scope-guard.md',
  'gwangju-seatmap-runtime-layer-audit.json',
  'gwangju-seatmap-runtime-layer-audit.csv',
  'gwangju-seatmap-runtime-layer-audit.md',
  'release scope guard included release files: `34`',
  'release scope guard separate dirty work baseline files: `95`',
  'classified separate dirty work expansion allowed: `true`',
  'release scope guard inventory drift: `0`',
  '`releaseScopeGuardIncludedFiles=34`',
  '`releaseScopeGuardSeparateDirtyWorkBaselineFiles=95`',
  '`classifiedSeparateDirtyWorkExpansionAllowed=true`',
  '`releaseScopeGuardInventoryDrift=0`',
  'Release Candidate Inventory',
  'releaseCandidateInventory.expectedIncludedFileCount=34',
  'separateWorkInventory.expectedSeparateDirtyWorkCount baseline=95',
  'separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true',
  'PR Packaging Manifest',
  'PR packaging manifest source of truth: `reports/stadium/gwangju-seatmap-release-scope-guard.md`',
  'Release PR scope: Gwangju official derived aggregate release package and build verification reports.',
  'Excluded PR scope: Daegu work, Daejeon work, Sajik work, Suwon work, and cross-stadium utilities.',
  'prPackagingManifest.releasePayloadFileCount=34',
  'prPackagingManifest.separateDirtyWorkFileCount=',
  'prPackagingManifest.unexpectedDirtyFileCount=0',
  'prPackagingManifest.inventoryDriftCount=0',
  'Patch Separation Readiness',
  'patch separation readiness: `ready` or `review-required`',
  'patchSeparationReadiness.status=ready-or-review-required',
  'patchSeparationReadiness only becomes `review-required` when release payload files have unreviewed mixed or untracked diffs.',
  'reviewed expected untracked release files are ready for targeted staging.',
  'clean release payload files are not packaging blockers',
  'PR staging plan: `npm run stadium:gwangju:pr-staging-plan`',
  'gwangju-seatmap-pr-staging-plan.json',
  'gwangju-seatmap-pr-staging-plan.md',
  'targeted staging report: `npm run stadium:gwangju:targeted-staging`',
  'gwangju-seatmap-targeted-staging.json',
  'gwangju-seatmap-targeted-staging.csv',
  'gwangju-seatmap-targeted-staging.md',
  'staged scope audit: `npm run stadium:gwangju:staged-scope-audit`',
  'gwangju-seatmap-staged-scope-audit.json',
  'gwangju-seatmap-staged-scope-audit.csv',
  'gwangju-seatmap-staged-scope-audit.md',
  'stagedScopeAudit.status=ready',
  'stagedScopeAudit.doesNotRunGitAdd=true',
  'stagedScopeAudit.safeToRunBulkGitAdd=false',
  'stagedScopeAudit.acceptsOnlyTargetedStagingFiles=true',
  'stagedScopeAudit.blocksSeparateDirtyWork=true',
  'stagedScopeAudit.expectedTargetFileCount=34',
  'stagedScopeAudit.stagedOutsideTargetFileCount=0',
  'stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0',
  'targetedStaging.status=ready',
  'targetedStaging.doesNotRunGitAdd=true',
  'targetedStaging.safeToRunBulkGitAdd=false',
  'targetedStaging.recommendsOnlyIncludedFiles=true',
  'targetedStaging.doesNotRecommendSeparateDirtyWork=true',
  'targetedStaging.targetFileCount=34',
  'targetedStaging.reviewedUntrackedSatisfiedFileCount=6',
  'stagingPlan.status=ready-or-review-required',
  'stagingPlan.doesNotRunGitAdd=true',
  'stagingPlan.safeToRunBulkGitAdd=false',
  'stagingPlan.releasePayloadFileCount=34',
  'stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true',
  '`K7석`: `107~111`, `118~122`',
  '`원정응원석`: `107~110`',
  '`홈 응원석`: `118~122`',
  '`home-k7-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`',
  '`away-cheering-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`',
  '`K7석`, `원정응원석` aggregate hit-areas use `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`.',
  'operator-provided official PNG coordinates only',
  'browser CSS pixels',
  'resized screenshots',
  'external crawling',
  'web-search-based baseball data',
  'third-party copied seatmap images',
  'Do not replace the current `113` active block aggregate release with new operator geometry unless',
];

const missingHandoffSnippets = requiredHandoffSnippets.filter((snippet) => !releaseHandoff.text.includes(snippet));
if (missingHandoffSnippets.length > 0) {
  blockers.push(`HANDOFF_ACCEPTANCE_MISMATCH:${missingHandoffSnippets.join(' | ')}`);
}

const staleChecks = [
  ['STALE_RELEASE_GATE_BEFORE_RELEASE_PACKAGE', fileInfos.releaseGate, fileInfos.releasePackage],
  ['STALE_RELEASE_GATE_BEFORE_OPERATOR_STATUS', fileInfos.releaseGate, fileInfos.operatorStatus],
  ['STALE_RELEASE_GATE_BEFORE_TRACE_REVIEW', fileInfos.releaseGate, fileInfos.traceReview],
  ['STALE_RELEASE_GATE_BEFORE_RUNTIME_LAYER_AUDIT', fileInfos.releaseGate, fileInfos.runtimeLayerAudit],
  ['STALE_RELEASE_GATE_BEFORE_BROWSER_QA', fileInfos.releaseGate, fileInfos.browserQaSummary],
  ['STALE_RELEASE_PACKAGE_BEFORE_OPERATOR_STATUS', fileInfos.releasePackage, fileInfos.operatorStatus],
  ['STALE_RELEASE_PACKAGE_BEFORE_TRACE_REVIEW', fileInfos.releasePackage, fileInfos.traceReview],
  ['STALE_RUNTIME_LAYER_AUDIT_BEFORE_TRACE_REVIEW', fileInfos.runtimeLayerAudit, fileInfos.traceReview],
  ['STALE_RUNTIME_LAYER_AUDIT_BEFORE_BROWSER_QA', fileInfos.runtimeLayerAudit, fileInfos.browserQaSummary],
  ['STALE_RELEASE_PACKAGE_BEFORE_BROWSER_QA', fileInfos.releasePackage, fileInfos.browserQaSummary],
  ['STALE_RELEASE_SCOPE_GUARD_BEFORE_HANDOFF', fileInfos.releaseScopeGuard, fileInfos.releaseHandoff],
  ['STALE_PR_STAGING_PLAN_BEFORE_SCOPE_GUARD', fileInfos.prStagingPlan, fileInfos.releaseScopeGuard],
  ['STALE_PR_STAGING_PLAN_BEFORE_HANDOFF', fileInfos.prStagingPlan, fileInfos.releaseHandoff],
  ['STALE_TARGETED_STAGING_BEFORE_PR_STAGING_PLAN', fileInfos.targetedStaging, fileInfos.prStagingPlan],
  ['STALE_TARGETED_STAGING_BEFORE_HANDOFF', fileInfos.targetedStaging, fileInfos.releaseHandoff],
  ['STALE_STAGED_SCOPE_AUDIT_BEFORE_TARGETED_STAGING', fileInfos.stagedScopeAudit, fileInfos.targetedStaging],
  ['STALE_STAGED_SCOPE_AUDIT_BEFORE_HANDOFF', fileInfos.stagedScopeAudit, fileInfos.releaseHandoff],
];

const staleRows = staleChecks.map(([code, later, earlier]) => ({
  code,
  later: later?.path,
  laterModifiedAt: later?.modifiedAt,
  earlier: earlier?.path,
  earlierModifiedAt: earlier?.modifiedAt,
  stale: isStaleBefore(later, earlier),
}));

staleRows
  .filter((row) => row.stale && !row.code.startsWith('STALE_RELEASE_SCOPE_GUARD_'))
  .forEach((row) => blockers.push(`${row.code}:${row.later}<${row.earlier}`));

staleRows
  .filter((row) => row.stale && row.code.startsWith('STALE_RELEASE_SCOPE_GUARD_'))
  .forEach((row) => warnings.push(`${row.code}:${row.later}<${row.earlier}`));

const blockingStaleRows = staleRows.filter((row) => row.stale && !row.code.startsWith('STALE_RELEASE_SCOPE_GUARD_'));
const scopeGuardStaleRows = staleRows.filter((row) => row.stale && row.code.startsWith('STALE_RELEASE_SCOPE_GUARD_'));

if (releaseGate?.generatedAt && releasePackage?.generatedAt && new Date(releaseGate.generatedAt) < new Date(releasePackage.generatedAt)) {
  blockers.push('STALE_RELEASE_GATE_GENERATED_BEFORE_RELEASE_PACKAGE');
}

if (releasePackage?.generatedAt && operatorStatus?.generatedAt && new Date(releasePackage.generatedAt) < new Date(operatorStatus.generatedAt)) {
  blockers.push('STALE_RELEASE_PACKAGE_GENERATED_BEFORE_OPERATOR_STATUS');
}

if (!releaseGate?.doesNotModifyDataFile || !releasePackage?.doesNotModifyDataFile || !operatorStatus?.summary?.doesNotModifyDataFile) {
  blockers.push('RELEASE_AUDIT_MUTATION_CONTRACT_CHANGED');
}

if (releaseGate?.activeBlockContract?.officialDerivedAggregateReady !== true || releasePackage?.activeBlockContract?.officialDerivedAggregateReady !== true) {
  blockers.push('OFFICIAL_DERIVED_AGGREGATE_NOT_READY');
}

if (blockers.length > 0 && blockingStaleRows.length > 0) {
  warnings.push('Run `npm run qa:stadium:gwangju:release-gate` to regenerate the stale release reports.');
}

const status = blockers.length === 0 ? 'passed' : 'failed';
const report = {
  generatedAt: new Date().toISOString(),
  version: AUDIT_VERSION,
  auditMode: AUDIT_MODE,
  status,
  doesNotModifyDataFile: true,
  asset: {
    imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
    imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
    imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
  },
  releaseAcceptance: {
    requiredStatus: 'passed',
    requiredBlockers: 0,
    requiredCompletedSteps: 5,
    requiredReleasePackageStatus: 'ready',
    requiredOperatorStatus: 'ready',
    requiredBrowserQaStatus: 'passed',
    requiredRuntimeLayerAuditStatus: 'passed',
    requiredActiveTraceBlocks: 113,
    requiredAggregateHitArea: 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY',
    requiredScopeGuardStatus: 'passed',
    requiredScopeGuardUnexpectedFiles: 0,
    requiredScopeGuardBlockers: 0,
    requiredScopeGuardIncludedFiles: EXPECTED_RELEASE_PAYLOAD_FILE_COUNT,
    requiredScopeGuardSeparateDirtyWorkBaselineFiles: SEPARATE_DIRTY_WORK_BASELINE_FILE_COUNT,
    allowsClassifiedSeparateDirtyWorkExpansion: true,
    requiredPatchSeparationReadiness: 'ready-or-review-required',
    requiredPrStagingPlanStatus: 'ready-or-review-required',
    requiredPrStagingPlanDoesNotRunGitAdd: true,
    requiredTargetedStagingStatus: 'ready',
    requiredStagedScopeAuditStatus: 'ready',
    requiredStagedOutsideTargetFiles: 0,
    requiredStagedSeparateDirtyWorkFiles: 0,
    officialDerivedAggregateReady: true,
  },
  inputs: Object.fromEntries(Object.entries(fileInfos).map(([key, info]) => [key, {
    path: info.path,
    exists: info.exists,
    modifiedAt: info.modifiedAt,
  }])),
  checks,
  staleChecks: staleRows,
  staleSummary: {
    blockingStaleCount: blockingStaleRows.length,
    scopeGuardStaleWarningCount: scopeGuardStaleRows.length,
  },
  missingHandoffSnippets,
  scopeGuardSummary: {
    status: releaseScopeGuard?.status ?? null,
    includedFileCount: releaseScopeGuard?.summary?.includedFileCount ?? null,
    separateDirtyWorkCount: releaseScopeGuard?.summary?.separateDirtyWorkCount ?? null,
    unexpectedFileCount: releaseScopeGuard?.summary?.unexpectedFileCount ?? null,
    blockerCount: releaseScopeGuard?.summary?.blockerCount ?? null,
    expectedIncludedFileCount: releaseScopeGuard?.releaseCandidateInventory?.expectedIncludedFileCount ?? null,
    actualIncludedFileCount: releaseScopeGuard?.releaseCandidateInventory?.actualIncludedFileCount ?? null,
    missingExpectedIncludedFileCount: releaseScopeGuard?.releaseCandidateInventory?.missingExpectedIncludedFiles?.length ?? null,
    extraIncludedFileCount: releaseScopeGuard?.releaseCandidateInventory?.extraIncludedFiles?.length ?? null,
    expectedSeparateDirtyWorkCount: releaseScopeGuard?.separateWorkInventory?.expectedSeparateDirtyWorkCount ?? null,
    actualSeparateDirtyWorkCount: releaseScopeGuard?.separateWorkInventory?.actualSeparateDirtyWorkCount ?? null,
    missingExpectedSeparateDirtyWorkCount: releaseScopeGuard?.separateWorkInventory?.missingExpectedSeparateDirtyWorkFiles?.length ?? null,
    extraSeparateDirtyWorkCount: releaseScopeGuard?.separateWorkInventory?.extraSeparateDirtyWorkFiles?.length ?? null,
    classifiedSeparateDirtyWorkExpansionAllowed: releaseScopeGuard?.separateWorkInventory?.classifiedSeparateDirtyWorkExpansionAllowed ?? null,
    classifiedAdditionalSeparateDirtyWorkCount: releaseScopeGuard?.separateWorkInventory?.classifiedAdditionalSeparateDirtyWorkCount ?? null,
    patchSeparationReadiness: releaseScopeGuard?.patchSeparationReadiness?.status ?? null,
    patchSeparationMixedStatusCount: releaseScopeGuard?.patchSeparationReadiness?.mixedStatusFiles?.length ?? null,
    patchSeparationUntrackedIncludedCount: releaseScopeGuard?.patchSeparationReadiness?.untrackedIncludedFiles?.length ?? null,
  },
  prStagingPlanSummary: {
    status: prStagingPlan?.status ?? null,
    releasePayloadFileCount: prStagingPlan?.summary?.releasePayloadFileCount ?? null,
    separateDirtyWorkFileCount: prStagingPlan?.summary?.separateDirtyWorkFileCount ?? null,
    separateDirtyWorkBaselineFileCount: prStagingPlan?.summary?.separateDirtyWorkBaselineFileCount ?? null,
    classifiedSeparateDirtyWorkExpansionAllowed: prStagingPlan?.summary?.classifiedSeparateDirtyWorkExpansionAllowed ?? null,
    unexpectedDirtyFileCount: prStagingPlan?.summary?.unexpectedDirtyFileCount ?? null,
    blockerCount: prStagingPlan?.summary?.blockerCount ?? null,
    doesNotRunGitAdd: prStagingPlan?.doesNotRunGitAdd ?? null,
    safeToRunBulkGitAdd: prStagingPlan?.stagingGate?.safeToRunBulkGitAdd ?? null,
    packageJsonStatus: prStagingPlan?.summary?.packageJsonStatus ?? null,
    manualReviewRequired: prStagingPlan?.summary?.manualReviewRequired ?? null,
  },
  targetedStagingSummary: {
    status: targetedStaging?.status ?? null,
    targetFileCount: targetedStaging?.summary?.targetFileCount ?? null,
    reviewedUntrackedReadyFileCount: targetedStaging?.summary?.reviewedUntrackedReadyFileCount ?? null,
    reviewedUntrackedStagedFileCount: targetedStaging?.summary?.reviewedUntrackedStagedFileCount ?? null,
    reviewedUntrackedSatisfiedFileCount: targetedStaging?.summary?.reviewedUntrackedSatisfiedFileCount ?? null,
    unexpectedDirtyFileCount: targetedStaging?.summary?.unexpectedDirtyFileCount ?? null,
    blockerCount: targetedStaging?.summary?.blockerCount ?? null,
    doesNotRunGitAdd: targetedStaging?.doesNotRunGitAdd ?? null,
    safeToRunBulkGitAdd: targetedStaging?.stagingGate?.safeToRunBulkGitAdd ?? null,
  },
  stagedScopeAuditSummary: {
    status: stagedScopeAudit?.status ?? null,
    expectedTargetFileCount: stagedScopeAudit?.summary?.expectedTargetFileCount ?? null,
    stagedFileCount: stagedScopeAudit?.summary?.stagedFileCount ?? null,
    stagedOutsideTargetFileCount: stagedScopeAudit?.summary?.stagedOutsideTargetFileCount ?? null,
    stagedSeparateDirtyWorkFileCount: stagedScopeAudit?.summary?.stagedSeparateDirtyWorkFileCount ?? null,
    blockerCount: stagedScopeAudit?.summary?.blockerCount ?? null,
    doesNotRunGitAdd: stagedScopeAudit?.doesNotRunGitAdd ?? null,
    safeToRunBulkGitAdd: stagedScopeAudit?.stagedScopeGate?.safeToRunBulkGitAdd ?? null,
  },
  sourcePolicy: {
    allowedCoordinateSource: 'operator-provided official PNG coordinates only',
    coordinateSystem: '2200x1159',
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
  },
  blockers,
  warnings,
};

const markdown = [
  '# 광주 K7/AWAY release audit',
  '',
  `- version: \`${AUDIT_VERSION}\``,
  `- audit mode: \`${AUDIT_MODE}\``,
  `- status: \`${status}\``,
  `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
  `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
  `- active trace blocks: \`${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}\``,
  '- aggregate hit-area: `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY`',
  '- official derived aggregate ready: `true`',
  `- scope guard status: \`${report.scopeGuardSummary.status ?? '-'}\``,
  `- scope guard unexpected files: \`${report.scopeGuardSummary.unexpectedFileCount ?? '-'}\``,
  `- scope guard blockers: \`${report.scopeGuardSummary.blockerCount ?? '-'}\``,
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
  '',
  '## Checks',
  '',
  markdownTable(
    ['check', 'expected', 'actual', 'pass'],
    checks.map((check) => [
      check.name,
      `\`${check.expected}\``,
      `\`${check.actual}\``,
      `\`${check.pass}\``,
    ]),
  ),
  '',
  '## Stale Guard',
  '',
  markdownTable(
    ['code', 'later', 'later modified', 'earlier', 'earlier modified', 'stale'],
    staleRows.map((row) => [
      `\`${row.code}\``,
      `\`${row.later}\``,
      row.laterModifiedAt ?? '-',
      `\`${row.earlier}\``,
      row.earlierModifiedAt ?? '-',
      `\`${row.stale}\``,
    ]),
  ),
  '',
  '## Scope Guard',
  '',
  markdownTable(
    ['check', 'value'],
    [
      ['status', `\`${report.scopeGuardSummary.status ?? '-'}\``],
      ['included files', `\`${report.scopeGuardSummary.includedFileCount ?? '-'}\``],
      ['separate dirty work', `\`${report.scopeGuardSummary.separateDirtyWorkCount ?? '-'}\``],
      ['unexpected files', `\`${report.scopeGuardSummary.unexpectedFileCount ?? '-'}\``],
      ['blockers', `\`${report.scopeGuardSummary.blockerCount ?? '-'}\``],
      ['expected included release files', `\`${report.scopeGuardSummary.expectedIncludedFileCount ?? '-'}\``],
      ['actual included release files', `\`${report.scopeGuardSummary.actualIncludedFileCount ?? '-'}\``],
      ['missing expected included files', `\`${report.scopeGuardSummary.missingExpectedIncludedFileCount ?? '-'}\``],
      ['extra included files', `\`${report.scopeGuardSummary.extraIncludedFileCount ?? '-'}\``],
      ['expected separate dirty work files', `\`${report.scopeGuardSummary.expectedSeparateDirtyWorkCount ?? '-'}\``],
      ['actual separate dirty work files', `\`${report.scopeGuardSummary.actualSeparateDirtyWorkCount ?? '-'}\``],
      ['missing expected separate dirty work files', `\`${report.scopeGuardSummary.missingExpectedSeparateDirtyWorkCount ?? '-'}\``],
      ['classified additional separate dirty work files', `\`${report.scopeGuardSummary.classifiedAdditionalSeparateDirtyWorkCount ?? report.scopeGuardSummary.extraSeparateDirtyWorkCount ?? '-'}\``],
      ['classified separate dirty work expansion allowed', `\`${report.scopeGuardSummary.classifiedSeparateDirtyWorkExpansionAllowed ?? '-'}\``],
      ['patch separation readiness', `\`${report.scopeGuardSummary.patchSeparationReadiness ?? '-'}\``],
      ['patch separation mixed status files', `\`${report.scopeGuardSummary.patchSeparationMixedStatusCount ?? '-'}\``],
      ['patch separation untracked included files', `\`${report.scopeGuardSummary.patchSeparationUntrackedIncludedCount ?? '-'}\``],
    ],
  ),
  '',
  '## PR Staging Plan',
  '',
  markdownTable(
    ['check', 'value'],
    [
      ['status', `\`${report.prStagingPlanSummary.status ?? '-'}\``],
      ['release payload files', `\`${report.prStagingPlanSummary.releasePayloadFileCount ?? '-'}\``],
      ['separate dirty work files', `\`${report.prStagingPlanSummary.separateDirtyWorkFileCount ?? '-'}\``],
      ['separate dirty work baseline files', `\`${report.prStagingPlanSummary.separateDirtyWorkBaselineFileCount ?? '-'}\``],
      ['classified separate dirty work expansion allowed', `\`${report.prStagingPlanSummary.classifiedSeparateDirtyWorkExpansionAllowed ?? '-'}\``],
      ['unexpected dirty files', `\`${report.prStagingPlanSummary.unexpectedDirtyFileCount ?? '-'}\``],
      ['blockers', `\`${report.prStagingPlanSummary.blockerCount ?? '-'}\``],
      ['does not run git add', `\`${report.prStagingPlanSummary.doesNotRunGitAdd ?? '-'}\``],
      ['safe to run bulk git add', `\`${report.prStagingPlanSummary.safeToRunBulkGitAdd ?? '-'}\``],
      ['package.json status', `\`${report.prStagingPlanSummary.packageJsonStatus ?? '-'}\``],
      ['manual review required', `\`${report.prStagingPlanSummary.manualReviewRequired ?? '-'}\``],
    ],
  ),
  '',
  '## Targeted Staging',
  '',
  markdownTable(
    ['check', 'value'],
    [
      ['status', `\`${report.targetedStagingSummary.status ?? '-'}\``],
      ['target files', `\`${report.targetedStagingSummary.targetFileCount ?? '-'}\``],
      ['reviewed untracked ready files', `\`${report.targetedStagingSummary.reviewedUntrackedReadyFileCount ?? '-'}\``],
      ['reviewed untracked staged files', `\`${report.targetedStagingSummary.reviewedUntrackedStagedFileCount ?? '-'}\``],
      ['reviewed untracked satisfied files', `\`${report.targetedStagingSummary.reviewedUntrackedSatisfiedFileCount ?? '-'}\``],
      ['unexpected dirty files', `\`${report.targetedStagingSummary.unexpectedDirtyFileCount ?? '-'}\``],
      ['blockers', `\`${report.targetedStagingSummary.blockerCount ?? '-'}\``],
      ['does not run git add', `\`${report.targetedStagingSummary.doesNotRunGitAdd ?? '-'}\``],
      ['safe to run bulk git add', `\`${report.targetedStagingSummary.safeToRunBulkGitAdd ?? '-'}\``],
    ],
  ),
  '',
  '## Staged Scope Audit',
  '',
  markdownTable(
    ['check', 'value'],
    [
      ['status', `\`${report.stagedScopeAuditSummary.status ?? '-'}\``],
      ['expected target files', `\`${report.stagedScopeAuditSummary.expectedTargetFileCount ?? '-'}\``],
      ['staged files', `\`${report.stagedScopeAuditSummary.stagedFileCount ?? '-'}\``],
      ['staged outside target files', `\`${report.stagedScopeAuditSummary.stagedOutsideTargetFileCount ?? '-'}\``],
      ['staged separate dirty work files', `\`${report.stagedScopeAuditSummary.stagedSeparateDirtyWorkFileCount ?? '-'}\``],
      ['blockers', `\`${report.stagedScopeAuditSummary.blockerCount ?? '-'}\``],
      ['does not run git add', `\`${report.stagedScopeAuditSummary.doesNotRunGitAdd ?? '-'}\``],
      ['safe to run bulk git add', `\`${report.stagedScopeAuditSummary.safeToRunBulkGitAdd ?? '-'}\``],
    ],
  ),
  '',
  '## Inputs',
  '',
  markdownTable(
    ['input', 'path', 'exists', 'modified'],
    Object.entries(report.inputs).map(([key, input]) => [
      `\`${key}\``,
      `\`${input.path}\``,
      `\`${input.exists}\``,
      input.modifiedAt ?? '-',
    ]),
  ),
  '',
  '## Source Policy',
  '',
  '- 허용: operator-provided official PNG coordinates only',
  '- 좌표계: official PNG 2200x1159',
  '- 금지: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images',
  '- 누락 야구 운영 데이터: `MANUAL_BASEBALL_DATA_REQUIRED`',
  '- 좌표 승격 전에는 active 113개 기준 테스트를 실행하지 않는다.',
  '',
].join('\n');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(auditJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(auditMarkdownPath, markdown, 'utf8');

console.log(`release_audit_json:${auditJsonPath}`);
console.log(`release_audit_markdown:${auditMarkdownPath}`);
console.log(`status:${status} blockers=${blockers.length} stale=${blockingStaleRows.length} scopeGuardStaleWarnings=${scopeGuardStaleRows.length}`);

if (status !== 'passed') {
  process.exitCode = 1;
}
