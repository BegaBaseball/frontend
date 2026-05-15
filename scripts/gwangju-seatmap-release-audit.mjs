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
const AUDIT_MODE = 'PRE_OPERATOR_DERIVED_RANGE_RELEASE';
const auditJsonPath = path.join(reportDir, 'gwangju-seatmap-release-audit.json');
const auditMarkdownPath = path.join(reportDir, 'gwangju-seatmap-release-audit.md');

const inputFiles = {
  releaseGate: path.join(reportDir, 'gwangju-seatmap-release-gate.json'),
  releasePackage: path.join(reportDir, 'gwangju-seatmap-release-package.json'),
  operatorStatus: path.join(reportDir, 'gwangju-seatmap-operator-status.json'),
  traceReview: path.join(reportDir, 'gwangju-seatmap-trace-review.json'),
  releaseScopeGuard: path.join(reportDir, 'gwangju-seatmap-release-scope-guard.json'),
  prStagingPlan: path.join(reportDir, 'gwangju-seatmap-pr-staging-plan.json'),
  releaseHandoff: path.join(frontendRoot, 'docs/gwangju-seatmap-release-handoff.md'),
  browserQaSummary: path.join(outputRoot, 'stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.json'),
};

const expectedStepCommands = [
  'npm run stadium:gwangju:operator-status',
  'npm run test:stadium:seatmaps',
  'npm run qa:stadium:gwangju:trace-review',
  'npm run stadium:gwangju:release-package',
  'npm run build',
];

const expectedPendingOperatorSections = ['K7석', '원정응원석'];
const STALE_TOLERANCE_MS = 1000;
const SEPARATE_DIRTY_WORK_BASELINE_FILE_COUNT = 95;
const EXPECTED_RELEASE_PAYLOAD_FILE_COUNT = 19;

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
const releaseScopeGuard = jsonInputs.releaseScopeGuard?.data;
const prStagingPlan = jsonInputs.prStagingPlan?.data;
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
addCheck('release gate operator status', 'pending', releaseGate?.finalChecks?.operatorStatus, releaseGate?.finalChecks?.operatorStatus === 'pending', 'RELEASE_GATE_OPERATOR_STATUS_NOT_PENDING');
addCheck('release gate browser QA', 'passed', releaseGate?.finalChecks?.browserQaStatus, releaseGate?.finalChecks?.browserQaStatus === 'passed', 'RELEASE_GATE_BROWSER_QA_NOT_PASSED');
addCheck('release gate active trace blocks', 111, releaseGate?.finalChecks?.activeTraceBlocks, releaseGate?.finalChecks?.activeTraceBlocks === 111, 'RELEASE_GATE_ACTIVE_TRACE_BLOCKS_CHANGED');
addCheck('release gate aggregate hit-area', 'REUSES_EXISTING_TRACE_ONLY', releaseGate?.activeBlockContract?.aggregateHitArea, releaseGate?.activeBlockContract?.aggregateHitArea === 'REUSES_EXISTING_TRACE_ONLY', 'RELEASE_GATE_AGGREGATE_HIT_AREA_CHANGED');
addCheck('release gate no prewrite 113', true, releaseGate?.activeBlockContract?.noPrewrite113Gate, releaseGate?.activeBlockContract?.noPrewrite113Gate === true, 'RELEASE_GATE_PREWRITE_113_ENABLED');

addCheck('release package status', 'ready', releasePackage?.status, releasePackage?.status === 'ready', 'RELEASE_PACKAGE_NOT_READY');
addCheck('release package blockers', 0, releasePackage?.blockers?.length, (releasePackage?.blockers ?? []).length === 0, 'RELEASE_PACKAGE_BLOCKERS_PRESENT');
addCheck('release package release mode', 'DERIVED_RANGE_FILTER_AND_BADGE_ONLY', releasePackage?.releaseMode, releasePackage?.releaseMode === 'DERIVED_RANGE_FILTER_AND_BADGE_ONLY', 'RELEASE_PACKAGE_MODE_CHANGED');
addCheck('release package aggregate hit-area', 'REUSES_EXISTING_TRACE_ONLY', releasePackage?.activeBlockContract?.aggregateHitArea, releasePackage?.activeBlockContract?.aggregateHitArea === 'REUSES_EXISTING_TRACE_ONLY', 'RELEASE_PACKAGE_AGGREGATE_HIT_AREA_CHANGED');
addCheck('release package expected trace blocks', 111, releasePackage?.activeBlockContract?.expectedTraceBlocks, releasePackage?.activeBlockContract?.expectedTraceBlocks === 111, 'RELEASE_PACKAGE_ACTIVE_TRACE_BLOCKS_CHANGED');
addCheck('release package pending sections', expectedPendingOperatorSections.join(','), releasePackage?.activeBlockContract?.pendingOperatorSections?.join(','), sameSet(releasePackage?.activeBlockContract?.pendingOperatorSections, expectedPendingOperatorSections), 'RELEASE_PACKAGE_PENDING_SECTIONS_CHANGED');

addCheck('operator status', 'pending', operatorStatus?.summary?.status, operatorStatus?.summary?.status === 'pending', 'OPERATOR_STATUS_NOT_PENDING');
addCheck('operator status blockers', 0, operatorStatus?.summary?.blockers?.length, (operatorStatus?.summary?.blockers ?? []).length === 0, 'OPERATOR_STATUS_BLOCKERS_PRESENT');
addCheck('operator valid data diff', 0, operatorStatus?.summary?.validDataDiffSections, operatorStatus?.summary?.validDataDiffSections === 0, 'OPERATOR_VALID_DATA_DIFF_NOT_ZERO');
addCheck('operator active trace blocks', 111, operatorStatus?.summary?.activeTraceBlocks, operatorStatus?.summary?.activeTraceBlocks === 111, 'OPERATOR_ACTIVE_TRACE_BLOCKS_CHANGED');

addCheck('trace review status', 'READY', traceReview?.summary?.traceStatus, traceReview?.summary?.traceStatus === 'READY', 'TRACE_REVIEW_NOT_READY');
addCheck('trace review total blocks', 111, traceReview?.summary?.totalBlocks, traceReview?.summary?.totalBlocks === 111, 'TRACE_REVIEW_ACTIVE_BLOCKS_CHANGED');
addCheck('trace review pixel aligned', 111, traceReview?.summary?.pixelAlignedBlocks, traceReview?.summary?.pixelAlignedBlocks === 111, 'TRACE_REVIEW_PIXEL_ALIGNMENT_CHANGED');
addCheck('trace review overlap warnings', 0, traceReview?.summary?.overlapWarningCount, traceReview?.summary?.overlapWarningCount === 0, 'TRACE_REVIEW_OVERLAP_WARNINGS_PRESENT');
addCheck('trace review O/P component coverage warnings', 0, traceReview?.summary?.componentCoverageWarningCount, traceReview?.summary?.componentCoverageWarningCount === 0, 'TRACE_REVIEW_OP_COMPONENT_COVERAGE_WARNINGS_PRESENT');
addCheck('trace review aggregate hit-area', 'REUSES_EXISTING_TRACE_ONLY', traceReview?.summary?.aggregateHitAreaMode, traceReview?.summary?.aggregateHitAreaMode === 'REUSES_EXISTING_TRACE_ONLY', 'TRACE_REVIEW_AGGREGATE_HIT_AREA_CHANGED');

addCheck('release scope guard version', 'GWANGJU_RELEASE_SCOPE_GUARD_V1', releaseScopeGuard?.version, releaseScopeGuard?.version === 'GWANGJU_RELEASE_SCOPE_GUARD_V1', 'RELEASE_SCOPE_GUARD_VERSION_CHANGED');
addCheck('release scope guard status', 'passed', releaseScopeGuard?.status, releaseScopeGuard?.status === 'passed', 'RELEASE_SCOPE_GUARD_NOT_PASSED');
addCheck('release scope guard blockers', 0, releaseScopeGuard?.summary?.blockerCount, releaseScopeGuard?.summary?.blockerCount === 0, 'RELEASE_SCOPE_GUARD_BLOCKERS_PRESENT');
addCheck('release scope guard unexpected files', 0, releaseScopeGuard?.summary?.unexpectedFileCount, releaseScopeGuard?.summary?.unexpectedFileCount === 0, 'RELEASE_SCOPE_GUARD_UNEXPECTED_FILES_PRESENT');
addCheck('release scope guard active block count', 111, releaseScopeGuard?.scopeContract?.activeBlockCount, releaseScopeGuard?.scopeContract?.activeBlockCount === 111, 'RELEASE_SCOPE_GUARD_ACTIVE_BLOCK_COUNT_CHANGED');
addCheck('release scope guard post-operator state', 'blocked', releaseScopeGuard?.scopeContract?.postOperatorBeforeWrite, releaseScopeGuard?.scopeContract?.postOperatorBeforeWrite === 'blocked', 'RELEASE_SCOPE_GUARD_POST_OPERATOR_STATE_CHANGED');
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
addCheck('release scope guard patch separation readiness', 'review-required', releaseScopeGuard?.patchSeparationReadiness?.status, releaseScopeGuard?.patchSeparationReadiness?.status === 'review-required', 'RELEASE_SCOPE_GUARD_PATCH_SEPARATION_STATUS_CHANGED');
addCheck(
  'release scope guard package mixed status',
  true,
  releaseScopeGuard?.patchSeparationReadiness?.mixedStatusFiles?.some((entry) => entry.file === 'package.json' && entry.status === 'MM'),
  releaseScopeGuard?.patchSeparationReadiness?.mixedStatusFiles?.some((entry) => entry.file === 'package.json' && entry.status === 'MM') === true,
  'RELEASE_SCOPE_GUARD_PACKAGE_MIXED_STATUS_MISSING',
);

addCheck('PR staging plan version', 'GWANGJU_PR_STAGING_PLAN_V1', prStagingPlan?.version, prStagingPlan?.version === 'GWANGJU_PR_STAGING_PLAN_V1', 'PR_STAGING_PLAN_VERSION_CHANGED');
addCheck('PR staging plan status', 'review-required', prStagingPlan?.status, prStagingPlan?.status === 'review-required', 'PR_STAGING_PLAN_STATUS_CHANGED');
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
addCheck('PR staging plan package mixed status', 'MM', prStagingPlan?.summary?.packageJsonStatus, prStagingPlan?.summary?.packageJsonStatus === 'MM', 'PR_STAGING_PLAN_PACKAGE_MIXED_STATUS_MISSING');
addCheck('PR staging plan bulk add guard', false, prStagingPlan?.stagingGate?.safeToRunBulkGitAdd, prStagingPlan?.stagingGate?.safeToRunBulkGitAdd === false, 'PR_STAGING_PLAN_BULK_ADD_ALLOWED');

addCheck('browser QA status', 'passed', browserQaSummary?.status, browserQaSummary?.status === 'passed', 'BROWSER_QA_NOT_PASSED');
addCheck('data expected trace blocks', 111, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT === 111, 'DATA_EXPECTED_TRACE_BLOCKS_CHANGED');
addCheck('data aggregate hit-area mode', true, GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE, GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === true, 'DATA_AGGREGATE_HIT_AREA_MODE_CHANGED');
addCheck('data pending sections', expectedPendingOperatorSections.join(','), GWANGJU_PENDING_OPERATOR_SECTIONS.join(','), sameSet(GWANGJU_PENDING_OPERATOR_SECTIONS, expectedPendingOperatorSections), 'DATA_PENDING_SECTIONS_CHANGED');

const sourcePolicyValues = [
  releaseGate?.sourcePolicy,
  releasePackage?.sourcePolicy,
  operatorStatus?.sourcePolicy,
  releaseScopeGuard?.sourcePolicy,
  prStagingPlan?.sourcePolicy,
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
  'release mode: `DERIVED_RANGE_FILTER_AND_BADGE_ONLY`',
  'release gate: `npm run qa:stadium:gwangju:release-gate`',
  'coordinate system: `2200x1159`',
  'active block count: `111`',
  'aggregate hit-area mode: `REUSES_EXISTING_TRACE_ONLY`',
  'independent K7/AWAY active block target `113` is not enabled before operator polygon write.',
  'release gate status: `passed`',
  'release gate blockers: `0`',
  'release gate steps: `5/5`',
  'release package status: `ready`',
  'operator status: `pending`',
  'browser QA status: `passed`',
  'active trace blocks: `111`',
  'missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`',
  '`status=passed`',
  '`blockers=0`',
  '`steps=5/5`',
  '`releasePackageStatus=ready`',
  '`operatorStatus=pending`',
  '`browserQaStatus=passed`',
  '`activeTraceBlocks=111`',
  'release scope guard: `npm run stadium:gwangju:release-scope-guard`',
  'gwangju-seatmap-release-scope-guard.json',
  'gwangju-seatmap-release-scope-guard.md',
  'release scope guard included release files: `19`',
  'release scope guard separate dirty work baseline files: `95`',
  'classified separate dirty work expansion allowed: `true`',
  'release scope guard inventory drift: `0`',
  '`releaseScopeGuardIncludedFiles=19`',
  '`releaseScopeGuardSeparateDirtyWorkBaselineFiles=95`',
  '`classifiedSeparateDirtyWorkExpansionAllowed=true`',
  '`releaseScopeGuardInventoryDrift=0`',
  'Release Candidate Inventory',
  'releaseCandidateInventory.expectedIncludedFileCount=19',
  'separateWorkInventory.expectedSeparateDirtyWorkCount baseline=95',
  'separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true',
  'PR Packaging Manifest',
  'PR packaging manifest source of truth: `reports/stadium/gwangju-seatmap-release-scope-guard.md`',
  'Release PR scope: Gwangju pre-operator release package and build verification reports.',
  'Excluded PR scope: Daegu work, Daejeon work, Sajik work, Suwon work, and cross-stadium utilities.',
  'prPackagingManifest.releasePayloadFileCount=19',
  'prPackagingManifest.separateDirtyWorkFileCount=',
  'prPackagingManifest.unexpectedDirtyFileCount=0',
  'prPackagingManifest.inventoryDriftCount=0',
  'Patch Separation Readiness',
  'patch separation readiness: `review-required`',
  'patchSeparationReadiness.status=review-required',
  'patchSeparationReadiness.mixedStatusFiles includes `package.json` with status `MM`',
  'patchSeparationReadiness must be reviewed before staging the release PR.',
  'PR staging plan: `npm run stadium:gwangju:pr-staging-plan`',
  'gwangju-seatmap-pr-staging-plan.json',
  'gwangju-seatmap-pr-staging-plan.md',
  'stagingPlan.status=review-required',
  'stagingPlan.doesNotRunGitAdd=true',
  'stagingPlan.safeToRunBulkGitAdd=false',
  'stagingPlan.packageJsonStatus=MM',
  'stagingPlan.releasePayloadFileCount=19',
  'stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true',
  '`K7석`: `107~111`, `118~122`',
  '`원정응원석`: `107~110`',
  '`홈 응원석`: `118~122`',
  '`home-k7-seats`: `PENDING_OPERATOR_INPUT`',
  '`away-cheering-seats`: `PENDING_OPERATOR_INPUT`',
  '`OPERATOR_REQUIRED`',
  'operator-provided official PNG coordinates only',
  'browser CSS pixels',
  'resized screenshots',
  'external crawling',
  'web-search-based baseball data',
  'third-party copied seatmap images',
  'Do not run the `113` active block acceptance path unless',
];

const missingHandoffSnippets = requiredHandoffSnippets.filter((snippet) => !releaseHandoff.text.includes(snippet));
if (missingHandoffSnippets.length > 0) {
  blockers.push(`HANDOFF_ACCEPTANCE_MISMATCH:${missingHandoffSnippets.join(' | ')}`);
}

const staleChecks = [
  ['STALE_RELEASE_GATE_BEFORE_RELEASE_PACKAGE', fileInfos.releaseGate, fileInfos.releasePackage],
  ['STALE_RELEASE_GATE_BEFORE_OPERATOR_STATUS', fileInfos.releaseGate, fileInfos.operatorStatus],
  ['STALE_RELEASE_GATE_BEFORE_TRACE_REVIEW', fileInfos.releaseGate, fileInfos.traceReview],
  ['STALE_RELEASE_GATE_BEFORE_BROWSER_QA', fileInfos.releaseGate, fileInfos.browserQaSummary],
  ['STALE_RELEASE_GATE_BEFORE_HANDOFF', fileInfos.releaseGate, fileInfos.releaseHandoff],
  ['STALE_RELEASE_PACKAGE_BEFORE_OPERATOR_STATUS', fileInfos.releasePackage, fileInfos.operatorStatus],
  ['STALE_RELEASE_PACKAGE_BEFORE_TRACE_REVIEW', fileInfos.releasePackage, fileInfos.traceReview],
  ['STALE_RELEASE_PACKAGE_BEFORE_BROWSER_QA', fileInfos.releasePackage, fileInfos.browserQaSummary],
  ['STALE_RELEASE_PACKAGE_BEFORE_HANDOFF', fileInfos.releasePackage, fileInfos.releaseHandoff],
  ['STALE_RELEASE_SCOPE_GUARD_BEFORE_HANDOFF', fileInfos.releaseScopeGuard, fileInfos.releaseHandoff],
  ['STALE_PR_STAGING_PLAN_BEFORE_SCOPE_GUARD', fileInfos.prStagingPlan, fileInfos.releaseScopeGuard],
  ['STALE_PR_STAGING_PLAN_BEFORE_HANDOFF', fileInfos.prStagingPlan, fileInfos.releaseHandoff],
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

if (releaseGate?.activeBlockContract?.noPrewrite113Gate !== true || releasePackage?.activeBlockContract?.noPrewrite113Gate !== true) {
  blockers.push('PREWRITE_113_GATE_ENABLED_BEFORE_OPERATOR_POLYGON_WRITE');
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
    requiredOperatorStatus: 'pending',
    requiredBrowserQaStatus: 'passed',
    requiredActiveTraceBlocks: 111,
    requiredAggregateHitArea: 'REUSES_EXISTING_TRACE_ONLY',
    requiredScopeGuardStatus: 'passed',
    requiredScopeGuardUnexpectedFiles: 0,
    requiredScopeGuardBlockers: 0,
    requiredScopeGuardIncludedFiles: EXPECTED_RELEASE_PAYLOAD_FILE_COUNT,
    requiredScopeGuardSeparateDirtyWorkBaselineFiles: SEPARATE_DIRTY_WORK_BASELINE_FILE_COUNT,
    allowsClassifiedSeparateDirtyWorkExpansion: true,
    requiredPatchSeparationReadiness: 'review-required',
    requiredPrStagingPlanStatus: 'review-required',
    requiredPrStagingPlanDoesNotRunGitAdd: true,
    noPrewrite113Gate: true,
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
  '- aggregate hit-area: `REUSES_EXISTING_TRACE_ONLY`',
  '- no prewrite 113 gate: `true`',
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
