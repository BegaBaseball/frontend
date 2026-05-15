import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEJEON_BLOCKS,
  DAEJEON_P2_DEDUPLICATED_ALIASES,
  DAEJEON_TRACE_REVIEW_QUEUE,
  DAEJEON_TRACE_REVIEW_SUMMARY,
  isDaejeonSelectableSeatBlock,
} from '../src/data/daejeonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const outputRoot = path.join(repoRoot, 'output/playwright');
const dataTestSourcePath = path.join(frontendRoot, 'src/data/daejeonSeatData.test.ts');

const EXPECTED_BLOCKS = 145;
const EXPECTED_TRACED = 145;
const EXPECTED_REVIEW = 0;
const EXPECTED_P2_ALIASES = 11;
const EXPECTED_ANCHOR_CROPS = 28;
const OPERATOR_APPROVAL_STATUSES = new Set([
  'MISSING_APPROVAL',
  'PENDING_OPERATOR_APPROVAL',
  'APPROVED',
  'STALE_APPROVAL',
]);

const commandPlan = [
  {
    label: 'data tests',
    command: 'node',
    args: [
      '--import',
      'tsx',
      '--test',
      'src/data/daejeonSeatData.test.ts',
      'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    ],
  },
  {
    label: 'evidence',
    command: 'npm',
    args: ['run', 'stadium:daejeon:evidence'],
  },
  {
    label: 'visual diff',
    command: 'npm',
    args: ['run', 'stadium:daejeon:visual-diff'],
  },
  {
    label: 'geometry diff',
    command: 'npm',
    args: ['run', 'stadium:daejeon:geometry-diff'],
  },
  {
    label: 'coverage report',
    command: 'npm',
    args: ['run', 'stadium:daejeon:coverage-report'],
  },
  {
    label: 'browser QA',
    command: 'npm',
    args: ['run', 'qa:stadium:daejeon:trace-review'],
  },
  {
    label: 'build',
    command: 'npm',
    args: ['run', 'build'],
  },
];

const requiredFiles = {
  traceManifest: path.join(reportDir, 'daejeon-seatmap-trace-review.json'),
  traceSummary: path.join(reportDir, 'daejeon-seatmap-trace-review.md'),
  coverageReport: path.join(reportDir, 'daejeon-seatmap-coverage-report.json'),
  coverageSummary: path.join(reportDir, 'daejeon-seatmap-coverage-report.md'),
  p2Evidence: path.join(reportDir, 'daejeon-seatmap-p2-evidence-crops.json'),
  p2EvidenceSummary: path.join(reportDir, 'daejeon-seatmap-p2-evidence-crops.md'),
  anchorCrops: path.join(outputRoot, 'daejeon-anchor-review/daejeon-anchor-review-crops.json'),
  anchorCropsSummary: path.join(outputRoot, 'daejeon-anchor-review/daejeon-anchor-review-crops.md'),
  visualDiff: path.join(reportDir, 'daejeon-seatmap-visual-diff.json'),
  visualDiffSummary: path.join(reportDir, 'daejeon-seatmap-visual-diff.md'),
  geometryDiff: path.join(reportDir, 'daejeon-seatmap-geometry-diff.json'),
  geometryDiffSummary: path.join(reportDir, 'daejeon-seatmap-geometry-diff.md'),
  browserQa: path.join(outputRoot, 'stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.json'),
  browserQaSummary: path.join(outputRoot, 'stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.md'),
  mobileScreenshot: path.join(outputRoot, 'stadium-ux-daejeon-validate/mobile-390.png'),
  desktopScreenshot: path.join(outputRoot, 'stadium-ux-daejeon-validate/desktop-1440.png'),
};

const requiredAnchorCropIds = [
  'home-100',
  'first-101-109',
  'first-104-106-detail',
  'first-109-112-sequence',
  'cass-200-detail',
  'third-121-124',
  'third-116-121-detail',
  'first-4f-table-301-413-sequence',
  'third-4f-table-414-330-sequence',
  'outfield-upper-500-509-sequence',
  'skybox-s01-s12-sequence',
  'skybox-s13-s25-sequence',
  'skybox-s26-s37-sequence',
  'special-400-accessible-first',
  'special-425-426-third-accessible',
  'special-accessible-center',
  'special-accessible-outfield-third',
];

const expectedRetiredBlockIds = new Set(DAEJEON_P2_DEDUPLICATED_ALIASES.map((alias) => alias.retiredBlockId));

const assertGate = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const jsonEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const runCommand = (step) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  console.log(`[daejeon-release-gate] ${step.label}: ${step.command} ${step.args.join(' ')}`);

  const child = spawn(step.command, step.args, {
    cwd: frontendRoot,
    env: { ...process.env },
    stdio: 'inherit',
    shell: false,
  });

  child.on('error', reject);
  child.on('close', (code, signal) => {
    const durationMs = Date.now() - startedAt;
    if (code === 0) {
      resolve({
        label: step.label,
        command: [step.command, ...step.args].join(' '),
        status: 'passed',
        durationMs,
      });
      return;
    }

    reject(new Error(`${step.label} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`));
  });
});

const validateStaticData = () => {
  assertGate(DAEJEON_BLOCKS.length === EXPECTED_BLOCKS, `DAEJEON_BLOCKS.length must be ${EXPECTED_BLOCKS}`);
  assertGate(DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks === EXPECTED_BLOCKS, `summary.totalBlocks must be ${EXPECTED_BLOCKS}`);
  assertGate(DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced === EXPECTED_TRACED, `summary.officialImageTraced must be ${EXPECTED_TRACED}`);
  assertGate(DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview === EXPECTED_REVIEW, `summary.needsOperatorReview must be ${EXPECTED_REVIEW}`);
  assertGate(DAEJEON_TRACE_REVIEW_QUEUE.length === 0, 'DAEJEON_TRACE_REVIEW_QUEUE must stay empty');
  assertGate(DAEJEON_P2_DEDUPLICATED_ALIASES.length === EXPECTED_P2_ALIASES, `P2 deduplicated aliases must be ${EXPECTED_P2_ALIASES}`);

  const retiredOperationalBlocks = DAEJEON_BLOCKS.filter((block) => expectedRetiredBlockIds.has(block.id));
  assertGate(retiredOperationalBlocks.length === 0, `retired P2 aliases must not exist in DAEJEON_BLOCKS: ${retiredOperationalBlocks.map((block) => block.id).join(', ')}`);

  const invalidBlocks = DAEJEON_BLOCKS.filter((block) => (
    block.traceStatus !== 'OFFICIAL_IMAGE_TRACED'
    || block.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
    || block.sourceConfidence !== 'OFFICIAL'
    || !isDaejeonSelectableSeatBlock(block)
  ));
  assertGate(invalidBlocks.length === 0, `all DAEJEON_BLOCKS must be selectable official traced blocks: ${invalidBlocks.map((block) => block.id).join(', ')}`);
};

const validateArtifacts = async () => {
  const missingFiles = [];
  for (const [label, filePath] of Object.entries(requiredFiles)) {
    if (!(await fileExists(filePath))) {
      missingFiles.push(`${label}: ${filePath}`);
    }
  }
  assertGate(missingFiles.length === 0, `missing Daejeon release gate artifacts:\n${missingFiles.join('\n')}`);

  const manifest = await readJson(requiredFiles.traceManifest);
  assertGate(manifest.summary?.totalBlocks === EXPECTED_BLOCKS, `manifest summary.totalBlocks must be ${EXPECTED_BLOCKS}`);
  assertGate(manifest.summary?.officialImageTraced === EXPECTED_TRACED, `manifest summary.officialImageTraced must be ${EXPECTED_TRACED}`);
  assertGate(manifest.summary?.needsOperatorReview === EXPECTED_REVIEW, `manifest summary.needsOperatorReview must be ${EXPECTED_REVIEW}`);
  assertGate((manifest.traceReviewQueue ?? []).length === 0, 'manifest traceReviewQueue must be empty');
  assertGate(manifest.precisionAudit?.labelTopHitFailureCount === 0, 'manifest labelTopHitFailureCount must be 0');
  assertGate((manifest.deduplicatedAliases ?? []).length === EXPECTED_P2_ALIASES, `manifest deduplicatedAliases must be ${EXPECTED_P2_ALIASES}`);
  assertGate((manifest.blocks ?? []).length === EXPECTED_BLOCKS, `manifest blocks must be ${EXPECTED_BLOCKS}`);
  assertGate(manifest.coordinateChangeImpact?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'manifest coordinateChangeImpact contract is missing');
  assertGate(manifest.coordinateChangeImpact?.counts?.missingImpact === 0, 'manifest coordinateChangeImpact missingImpact must be 0');

  const manifestRetiredBlocks = (manifest.blocks ?? []).filter((block) => expectedRetiredBlockIds.has(block.id));
  assertGate(manifestRetiredBlocks.length === 0, `retired P2 aliases must not exist in manifest blocks: ${manifestRetiredBlocks.map((block) => block.id).join(', ')}`);

  const invalidManifestBlocks = (manifest.blocks ?? []).filter((block) => (
    block.sourceConfidence !== 'OFFICIAL'
    || block.traceStatus !== 'OFFICIAL_IMAGE_TRACED'
    || block.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
    || block.selectable !== true
  ));
  assertGate(invalidManifestBlocks.length === 0, `manifest contains non-releaseable blocks: ${invalidManifestBlocks.map((block) => block.id).join(', ')}`);

  const coverageReport = await readJson(requiredFiles.coverageReport);
  assertGate(coverageReport.summary?.totalBlocks === EXPECTED_BLOCKS, `coverage totalBlocks must be ${EXPECTED_BLOCKS}`);
  assertGate(coverageReport.summary?.lockedCount === EXPECTED_BLOCKS, `coverage lockedCount must be ${EXPECTED_BLOCKS}`);
  assertGate(coverageReport.summary?.labelOnlyCount === 0, 'coverage labelOnlyCount must be 0');
  assertGate(coverageReport.summary?.partialCount === 0, 'coverage partialCount must be 0');
  assertGate(coverageReport.summary?.missingLabelTopHitCount === 0, 'coverage missingLabelTopHitCount must be 0');
  assertGate(coverageReport.summary?.missingAnchorWithoutExceptionCount === 0, 'coverage missingAnchorWithoutExceptionCount must be 0');
  assertGate(coverageReport.summary?.missingOwnerPointRequiredCount === 0, 'coverage missingOwnerPointRequiredCount must be 0');
  assertGate((coverageReport.blocks ?? []).length === EXPECTED_BLOCKS, `coverage blocks must be ${EXPECTED_BLOCKS}`);
  assertGate(coverageReport.coordinateChangeImpact?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'coverage coordinateChangeImpact contract is missing');
  assertGate(coverageReport.coordinateChangeImpact?.counts?.missingImpact === 0, 'coverage coordinateChangeImpact missingImpact must be 0');
  assertGate(
    jsonEqual(manifest.coordinateChangeImpact?.counts ?? null, coverageReport.coordinateChangeImpact?.counts ?? null),
    'manifest and coverage coordinate impact counts must match',
  );
  [
    'p0BlockIds',
    'p1BlockIds',
    'p2AutoBlockIds',
    'p2ManualOnlyBlockIds',
    'autoRegressionBlockIds',
    'manualCropOnlyBlockIds',
    'tracedWithoutRegressionBlockIds',
    'missingImpactBlockIds',
  ].forEach((key) => {
    assertGate(
      jsonEqual(manifest.coordinateChangeImpact?.[key] ?? [], coverageReport.coordinateChangeImpact?.[key] ?? []),
      `manifest and coverage coordinate impact ${key} must match`,
    );
  });

  const p2Evidence = await readJson(requiredFiles.p2Evidence);
  assertGate((p2Evidence.outputs ?? []).length === EXPECTED_P2_ALIASES, `P2 evidence outputs must be ${EXPECTED_P2_ALIASES}`);
  const invalidP2Outputs = (p2Evidence.outputs ?? []).filter((output) => output.retiredBlockExists || !expectedRetiredBlockIds.has(output.retiredBlockId));
  assertGate(invalidP2Outputs.length === 0, `P2 evidence contains invalid retired alias outputs: ${invalidP2Outputs.map((output) => output.retiredBlockId).join(', ')}`);
  const missingP2OutputFiles = [];
  for (const output of p2Evidence.outputs ?? []) {
    if (!(await fileExists(output.outputPath))) {
      missingP2OutputFiles.push(output.outputPath);
    }
  }
  assertGate(missingP2OutputFiles.length === 0, `missing P2 evidence crop files:\n${missingP2OutputFiles.join('\n')}`);

  const anchorCrops = await readJson(requiredFiles.anchorCrops);
  const dataTestSource = await fs.readFile(dataTestSourcePath, 'utf8');
  assertGate((anchorCrops.crops ?? []).length === EXPECTED_ANCHOR_CROPS, `anchor crop count must be ${EXPECTED_ANCHOR_CROPS}`);
  const anchorCropIds = new Set((anchorCrops.crops ?? []).map((crop) => crop.id));
  const missingAnchorCropIds = requiredAnchorCropIds.filter((id) => !anchorCropIds.has(id));
  assertGate(missingAnchorCropIds.length === 0, `missing anchor crop ids: ${missingAnchorCropIds.join(', ')}`);
  const p0AnchorCrops = (anchorCrops.crops ?? []).filter((crop) => crop.reviewPriority === 'P0');
  assertGate(p0AnchorCrops.length === 4, `P0 anchor crops must stay at 4: ${p0AnchorCrops.map((crop) => crop.id).join(', ')}`);
  const missingAnchorCropReviewMetadata = (anchorCrops.crops ?? []).filter((crop) => (
    typeof crop.group !== 'string'
    || typeof crop.purpose !== 'string'
    || typeof crop.reviewFocus !== 'string'
    || !Array.isArray(crop.passCriteria)
    || crop.passCriteria.length === 0
    || !Array.isArray(crop.rejectCriteria)
    || crop.rejectCriteria.length === 0
    || !Array.isArray(crop.representativeBlocks)
    || crop.representativeBlocks.length === 0
    || !['P0', 'P1', 'P2'].includes(crop.reviewPriority)
    || typeof crop.reviewMode !== 'string'
    || !Array.isArray(crop.riskTags)
    || crop.riskTags.length === 0
    || crop.reviewContractVersion !== 'DAEJEON_ANCHOR_CROP_REVIEW_V2'
    || (crop.reviewMode === 'MANUAL_CROP_ONLY' && typeof crop.manualOnlyReason !== 'string')
    || (crop.reviewPriority === 'P0' && (!Array.isArray(crop.regressionTestIds) || crop.regressionTestIds.length === 0))
  ));
  assertGate(
    missingAnchorCropReviewMetadata.length === 0,
    `anchor crops missing operator review metadata: ${missingAnchorCropReviewMetadata.map((crop) => crop.id).join(', ')}`,
  );
  const p0CropsMissingRegressionTests = p0AnchorCrops.filter((crop) => (
    !Array.isArray(crop.regressionTestIds)
    || crop.regressionTestIds.some((testId) => !dataTestSource.includes(testId))
  ));
  assertGate(
    p0CropsMissingRegressionTests.length === 0,
    `P0 anchor crops missing data regression tests: ${p0CropsMissingRegressionTests.map((crop) => crop.id).join(', ')}`,
  );
  const missingAnchorCropFiles = [];
  for (const crop of anchorCrops.crops ?? []) {
    if (!(await fileExists(crop.outputPath))) {
      missingAnchorCropFiles.push(crop.outputPath);
    }
  }
  assertGate(missingAnchorCropFiles.length === 0, `missing anchor crop files:\n${missingAnchorCropFiles.join('\n')}`);

  const visualDiff = await readJson(requiredFiles.visualDiff);
  assertGate(visualDiff.contract === 'DAEJEON_ANCHOR_VISUAL_BASELINE_V1', 'visual diff contract is missing');
  assertGate(visualDiff.status === 'passed', `visual diff status must be passed: ${(visualDiff.failures ?? []).join(', ')}`);
  assertGate(visualDiff.summary?.baselineCropCount === EXPECTED_ANCHOR_CROPS, `visual diff baselineCropCount must be ${EXPECTED_ANCHOR_CROPS}`);
  assertGate(visualDiff.summary?.currentCropCount === EXPECTED_ANCHOR_CROPS, `visual diff currentCropCount must be ${EXPECTED_ANCHOR_CROPS}`);
  assertGate(visualDiff.summary?.changedCropCount === 0, 'visual diff changedCropCount must be 0');
  assertGate(visualDiff.summary?.metadataMismatchCount === 0, 'visual diff metadataMismatchCount must be 0');
  assertGate(visualDiff.summary?.missingCropCount === 0, 'visual diff missingCropCount must be 0');
  assertGate(visualDiff.summary?.extraCropCount === 0, 'visual diff extraCropCount must be 0');
  assertGate(visualDiff.baseline?.reviewContractVersion === 'DAEJEON_ANCHOR_CROP_REVIEW_V2', 'visual diff baseline review contract is missing');

  const geometryDiff = await readJson(requiredFiles.geometryDiff);
  assertGate(geometryDiff.contract === 'DAEJEON_GEOMETRY_BASELINE_V1', 'geometry diff contract is missing');
  assertGate(geometryDiff.status === 'passed', `geometry diff status must be passed: ${(geometryDiff.failures ?? []).join(', ')}`);
  assertGate(geometryDiff.summary?.baselineBlockCount === EXPECTED_BLOCKS, `geometry diff baselineBlockCount must be ${EXPECTED_BLOCKS}`);
  assertGate(geometryDiff.summary?.currentBlockCount === EXPECTED_BLOCKS, `geometry diff currentBlockCount must be ${EXPECTED_BLOCKS}`);
  assertGate(geometryDiff.summary?.changedBlockCount === 0, 'geometry diff changedBlockCount must be 0');
  assertGate(geometryDiff.summary?.missingBlockCount === 0, 'geometry diff missingBlockCount must be 0');
  assertGate(geometryDiff.summary?.extraBlockCount === 0, 'geometry diff extraBlockCount must be 0');
  assertGate(geometryDiff.current?.coordinateChangeImpactContract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'geometry diff coordinate impact contract is missing');

  const browserQa = await readJson(requiredFiles.browserQa);
  assertGate(browserQa.status === 'passed', 'browser QA summary status must be passed');
  assertGate(browserQa.entryCount === 2, 'browser QA must include mobile and desktop scenarios');
  assertGate(browserQa.overflowFailureCount === 0, 'browser QA overflowFailureCount must be 0');
  assertGate(browserQa.actionableFailedRequestCount === 0, 'browser QA actionableFailedRequestCount must be 0');
  assertGate(browserQa.actionableConsoleErrorCount === 0, 'browser QA actionableConsoleErrorCount must be 0');

  const scenarioFailures = (browserQa.scenarios ?? []).filter((scenario) => (
    scenario.status !== 'passed' || scenario.metrics?.overflowX
  ));
  assertGate(scenarioFailures.length === 0, `browser QA scenarios must pass without overflow: ${scenarioFailures.map((scenario) => scenario.label ?? scenario.key).join(', ')}`);
};

const readOperatorApprovalSummary = async () => {
  const approvalPath = path.join(reportDir, 'daejeon-seatmap-operator-approval.json');
  const approvalRelativePath = path.relative(frontendRoot, approvalPath);
  const baseSummary = {
    approvalPath: approvalRelativePath,
    status: 'MISSING_APPROVAL',
    approvedBy: null,
    approvedAt: null,
    hashMatchesReleaseGate: null,
    hashVerification: 'deferred-to-release-approved',
    releaseApprovedCommand: 'npm run qa:stadium:daejeon:release-approved',
    releaseLockRequiresOperatorApproval: false,
    note: 'release-lock does not require operator approval; final operator hash validation runs in release-approved.',
  };

  if (!(await fileExists(approvalPath))) {
    return baseSummary;
  }

  const approval = await readJson(approvalPath);
  const approvalStatus = typeof approval.status === 'string' && OPERATOR_APPROVAL_STATUSES.has(approval.status)
    ? approval.status
    : 'UNKNOWN_APPROVAL_STATUS';

  return {
    ...baseSummary,
    status: approvalStatus,
    approvedBy: approval.approvedBy ?? null,
    approvedAt: approval.approvedAt ?? null,
    hasApprovedHandoffHash: typeof approval.approvedHandoffHash === 'string' && approval.approvedHandoffHash.length > 0,
    hasApprovedHandoffMarkdownHash: typeof approval.approvedHandoffMarkdownHash === 'string' && approval.approvedHandoffMarkdownHash.length > 0,
    hasApprovedReleaseGateHash: typeof approval.approvedReleaseGateHash === 'string' && approval.approvedReleaseGateHash.length > 0,
  };
};

const writeReport = async (steps) => {
  const operatorApproval = await readOperatorApprovalSummary();
  const coverageReport = await readJson(requiredFiles.coverageReport);
  const anchorCrops = await readJson(requiredFiles.anchorCrops);
  const visualDiff = await readJson(requiredFiles.visualDiff);
  const geometryDiff = await readJson(requiredFiles.geometryDiff);
  const dataTestSource = await fs.readFile(dataTestSourcePath, 'utf8');
  const coverageSummary = {
    lockedCount: coverageReport.summary?.lockedCount ?? null,
    labelOnlyCount: coverageReport.summary?.labelOnlyCount ?? null,
    partialCount: coverageReport.summary?.partialCount ?? null,
    missingLabelTopHitCount: coverageReport.summary?.missingLabelTopHitCount ?? null,
    missingAnchorWithoutExceptionCount: coverageReport.summary?.missingAnchorWithoutExceptionCount ?? null,
    missingOwnerPointRequiredCount: coverageReport.summary?.missingOwnerPointRequiredCount ?? null,
    coordinateImpactContract: coverageReport.coordinateChangeImpact?.contract ?? null,
    coordinateImpactCounts: coverageReport.coordinateChangeImpact?.counts ?? null,
  };
  const anchorCropSummary = {
    total: (anchorCrops.crops ?? []).length,
    required: EXPECTED_ANCHOR_CROPS,
    reviewContractVersion: anchorCrops.reviewContractVersion ?? null,
    reviewMetadataComplete: (anchorCrops.crops ?? []).every((crop) => (
      crop.reviewContractVersion === 'DAEJEON_ANCHOR_CROP_REVIEW_V2'
      && Array.isArray(crop.passCriteria)
      && crop.passCriteria.length > 0
      && Array.isArray(crop.rejectCriteria)
      && crop.rejectCriteria.length > 0
      && Array.isArray(crop.representativeBlocks)
      && crop.representativeBlocks.length > 0
      && ['P0', 'P1', 'P2'].includes(crop.reviewPriority)
      && typeof crop.reviewMode === 'string'
      && Array.isArray(crop.riskTags)
      && crop.riskTags.length > 0
      && (crop.reviewMode !== 'MANUAL_CROP_ONLY' || typeof crop.manualOnlyReason === 'string')
      && (crop.reviewPriority !== 'P0' || (Array.isArray(crop.regressionTestIds) && crop.regressionTestIds.every((testId) => dataTestSource.includes(testId))))
    )),
    priorityCounts: (anchorCrops.crops ?? []).reduce((counts, crop) => {
      const key = ['P0', 'P1', 'P2'].includes(crop.reviewPriority) ? crop.reviewPriority : 'unknown';
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
    p0RegressionTestIds: (anchorCrops.crops ?? [])
      .filter((crop) => crop.reviewPriority === 'P0')
      .flatMap((crop) => crop.regressionTestIds ?? []),
    p1RegressionTestIds: (anchorCrops.crops ?? [])
      .filter((crop) => crop.reviewPriority === 'P1')
      .flatMap((crop) => crop.regressionTestIds ?? []),
    p1RegressionWarningCropIds: (anchorCrops.crops ?? [])
      .filter((crop) => (
        crop.reviewPriority === 'P1'
        && (
          !Array.isArray(crop.regressionTestIds)
          || crop.regressionTestIds.length === 0
          || crop.regressionTestIds.some((testId) => !dataTestSource.includes(testId))
        )
      ))
      .map((crop) => crop.id),
    p2RegressionTestIds: (anchorCrops.crops ?? [])
      .filter((crop) => crop.reviewPriority === 'P2')
      .flatMap((crop) => crop.regressionTestIds ?? []),
    p2ManualOnlyCropIds: (anchorCrops.crops ?? [])
      .filter((crop) => crop.reviewPriority === 'P2' && crop.reviewMode === 'MANUAL_CROP_ONLY')
      .map((crop) => crop.id),
    p2RegressionWarningCropIds: (anchorCrops.crops ?? [])
      .filter((crop) => (
        crop.reviewPriority === 'P2'
        && crop.reviewMode !== 'MANUAL_CROP_ONLY'
        && (
          !Array.isArray(crop.regressionTestIds)
          || crop.regressionTestIds.length === 0
          || crop.regressionTestIds.some((testId) => !dataTestSource.includes(testId))
        )
      ))
      .map((crop) => crop.id),
    skybox: (anchorCrops.crops ?? [])
      .filter((crop) => String(crop.id).startsWith('skybox-'))
      .map((crop) => crop.id),
  };
  const coordinateChangeImpactSummary = {
    contract: coverageReport.coordinateChangeImpact?.contract ?? null,
    counts: coverageReport.coordinateChangeImpact?.counts ?? {},
    p0BlockIds: coverageReport.coordinateChangeImpact?.p0BlockIds ?? [],
    p1BlockIds: coverageReport.coordinateChangeImpact?.p1BlockIds ?? [],
    p2AutoBlockIds: coverageReport.coordinateChangeImpact?.p2AutoBlockIds ?? [],
    p2ManualOnlyBlockIds: coverageReport.coordinateChangeImpact?.p2ManualOnlyBlockIds ?? [],
    tracedWithoutRegressionBlockIds: coverageReport.coordinateChangeImpact?.tracedWithoutRegressionBlockIds ?? [],
    missingImpactBlockIds: coverageReport.coordinateChangeImpact?.missingImpactBlockIds ?? [],
  };
  const visualDiffSummary = {
    contract: visualDiff.contract ?? null,
    status: visualDiff.status ?? null,
    baseline: visualDiff.baseline ?? null,
    counts: visualDiff.summary ?? {},
    changedCropIds: (visualDiff.hashChanged ?? []).map((item) => item.id),
    metadataChangedCropIds: (visualDiff.metadataChanged ?? []).map((item) => item.id),
    p2ManualOnlyChangedCropIds: visualDiff.p2ManualOnlyChanged ?? [],
  };
  const geometryDiffSummary = {
    contract: geometryDiff.contract ?? null,
    status: geometryDiff.status ?? null,
    baseline: geometryDiff.baseline ?? null,
    counts: geometryDiff.summary ?? {},
    changedBlockIds: (geometryDiff.changedBlocks ?? []).map((block) => block.id),
    changedFieldsByBlock: Object.fromEntries((geometryDiff.changedBlocks ?? []).map((block) => [block.id, block.changedFields ?? []])),
  };
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'passed',
    expected: {
      totalBlocks: EXPECTED_BLOCKS,
      officialImageTraced: EXPECTED_TRACED,
      needsOperatorReview: EXPECTED_REVIEW,
      p2DeduplicatedAliases: EXPECTED_P2_ALIASES,
      anchorCrops: EXPECTED_ANCHOR_CROPS,
    },
    coverage: coverageSummary,
    anchorCropSummary,
    coordinateChangeImpactSummary,
    visualDiffSummary,
    geometryDiffSummary,
    operatorApproval,
    commands: steps,
    artifacts: Object.fromEntries(
      Object.entries(requiredFiles).map(([label, filePath]) => [label, path.relative(frontendRoot, filePath)]),
    ),
    releaseApprovalCommand: 'npm run qa:stadium:daejeon:release-approved',
  };
  const jsonPath = path.join(reportDir, 'daejeon-seatmap-release-gate.json');
  const markdownPath = path.join(reportDir, 'daejeon-seatmap-release-gate.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, [
    '# 대전 좌석도 release gate',
    '',
    `- generated: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- total blocks: ${EXPECTED_BLOCKS}`,
    `- official image traced: ${EXPECTED_TRACED}`,
    `- needs operator review: ${EXPECTED_REVIEW}`,
    `- P2 deduplicated aliases: ${EXPECTED_P2_ALIASES}`,
    `- anchor crops: ${EXPECTED_ANCHOR_CROPS}`,
    `- coverage locked: ${coverageSummary.lockedCount}/${EXPECTED_BLOCKS}`,
    `- coverage LABEL_ONLY: ${coverageSummary.labelOnlyCount}`,
    `- coverage PARTIAL: ${coverageSummary.partialCount}`,
    `- coordinate impact contract: \`${coordinateChangeImpactSummary.contract}\``,
    `- visual diff: ${visualDiffSummary.status} (${visualDiffSummary.counts.changedCropCount ?? 0} changed crops)`,
    `- geometry diff: ${geometryDiffSummary.status} (${geometryDiffSummary.counts.changedBlockCount ?? 0} changed blocks)`,
    '',
    '## Coverage',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| locked | ${coverageSummary.lockedCount} |`,
    `| LABEL_ONLY | ${coverageSummary.labelOnlyCount} |`,
    `| PARTIAL | ${coverageSummary.partialCount} |`,
    `| missing label top-hit | ${coverageSummary.missingLabelTopHitCount} |`,
    `| missing anchor without exception | ${coverageSummary.missingAnchorWithoutExceptionCount} |`,
    `| missing owner-point required | ${coverageSummary.missingOwnerPointRequiredCount} |`,
    '',
    '## Coordinate Change Impact',
    '',
    '| group | count |',
    '| --- | ---: |',
    `| P0 crop coverage | ${coordinateChangeImpactSummary.counts.p0 ?? 0} |`,
    `| P1 crop coverage | ${coordinateChangeImpactSummary.counts.p1 ?? 0} |`,
    `| P2 auto regression coverage | ${coordinateChangeImpactSummary.counts.p2Auto ?? 0} |`,
    `| P2 manual crop-only coverage | ${coordinateChangeImpactSummary.counts.p2ManualOnly ?? 0} |`,
    `| auto regression blocks | ${coordinateChangeImpactSummary.counts.autoRegression ?? 0} |`,
    `| manual crop-only blocks | ${coordinateChangeImpactSummary.counts.manualCropOnly ?? 0} |`,
    `| traced without regression | ${coordinateChangeImpactSummary.counts.tracedWithoutRegression ?? 0} |`,
    `| missing impact mapping | ${coordinateChangeImpactSummary.counts.missingImpact ?? 0} |`,
    '',
    '## Anchor Visual Diff',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| baseline crops | ${visualDiffSummary.counts.baselineCropCount ?? 0} |`,
    `| current crops | ${visualDiffSummary.counts.currentCropCount ?? 0} |`,
    `| changed crops | ${visualDiffSummary.counts.changedCropCount ?? 0} |`,
    `| metadata mismatches | ${visualDiffSummary.counts.metadataMismatchCount ?? 0} |`,
    `| missing crops | ${visualDiffSummary.counts.missingCropCount ?? 0} |`,
    `| extra crops | ${visualDiffSummary.counts.extraCropCount ?? 0} |`,
    `| P2 manual-only changed | ${visualDiffSummary.counts.p2ManualOnlyChangedCount ?? 0} |`,
    '',
    `- baseline: \`${visualDiffSummary.baseline?.path ?? ''}\``,
    `- changed crop ids: ${visualDiffSummary.changedCropIds.length ? visualDiffSummary.changedCropIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
    '',
    '## Geometry Fingerprint Diff',
    '',
    '| metric | value |',
    '| --- | ---: |',
    `| baseline blocks | ${geometryDiffSummary.counts.baselineBlockCount ?? 0} |`,
    `| current blocks | ${geometryDiffSummary.counts.currentBlockCount ?? 0} |`,
    `| changed blocks | ${geometryDiffSummary.counts.changedBlockCount ?? 0} |`,
    `| missing blocks | ${geometryDiffSummary.counts.missingBlockCount ?? 0} |`,
    `| extra blocks | ${geometryDiffSummary.counts.extraBlockCount ?? 0} |`,
    `| changed imageGeometry.d | ${geometryDiffSummary.counts.changedImageGeometryDCount ?? 0} |`,
    `| changed hitAreaD | ${geometryDiffSummary.counts.changedHitAreaDCount ?? 0} |`,
    `| changed label coordinates | ${geometryDiffSummary.counts.changedLabelCoordinateCount ?? 0} |`,
    `| changed trace contract | ${geometryDiffSummary.counts.changedTraceContractCount ?? 0} |`,
    '',
    `- baseline: \`${geometryDiffSummary.baseline?.path ?? ''}\``,
    `- changed block ids: ${geometryDiffSummary.changedBlockIds.length ? geometryDiffSummary.changedBlockIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
    '',
    '## Anchor Crops',
    '',
    `- total: ${anchorCropSummary.total}/${anchorCropSummary.required}`,
    `- review contract: \`${anchorCropSummary.reviewContractVersion}\``,
    `- review metadata complete: ${anchorCropSummary.reviewMetadataComplete}`,
    `- priority counts: ${Object.entries(anchorCropSummary.priorityCounts).map(([key, value]) => `${key}=${value}`).join(', ')}`,
    `- P0 regression tests: ${anchorCropSummary.p0RegressionTestIds.map((id) => `\`${id}\``).join(', ')}`,
    `- P1 regression tests: ${anchorCropSummary.p1RegressionTestIds.map((id) => `\`${id}\``).join(', ')}`,
    `- P1 regression warnings: ${anchorCropSummary.p1RegressionWarningCropIds.length ? anchorCropSummary.p1RegressionWarningCropIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
    `- P2 regression tests: ${anchorCropSummary.p2RegressionTestIds.map((id) => `\`${id}\``).join(', ')}`,
    `- P2 manual-only crops: ${anchorCropSummary.p2ManualOnlyCropIds.map((id) => `\`${id}\``).join(', ')}`,
    `- P2 regression warnings: ${anchorCropSummary.p2RegressionWarningCropIds.length ? anchorCropSummary.p2RegressionWarningCropIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
    `- skybox crops: ${anchorCropSummary.skybox.map((id) => `\`${id}\``).join(', ')}`,
    '',
    '## Operator Approval',
    '',
    '- release-lock does not require operator approval',
    `- approval file: \`${operatorApproval.approvalPath}\``,
    `- status: ${operatorApproval.status}`,
    `- approved by: ${operatorApproval.approvedBy ?? ''}`,
    `- approved at: ${operatorApproval.approvedAt ?? ''}`,
    `- hashMatchesReleaseGate: ${operatorApproval.hashMatchesReleaseGate ?? 'deferred'}`,
    `- hash verification: ${operatorApproval.hashVerification}`,
    `- final approval gate: \`${operatorApproval.releaseApprovedCommand}\``,
    '',
    '| step | status | duration ms | command |',
    '| --- | --- | ---: | --- |',
    ...steps.map((step) => `| ${step.label} | ${step.status} | ${step.durationMs} | \`${step.command}\` |`),
    '',
  ].join('\n'), 'utf8');

  return { jsonPath, markdownPath };
};

try {
  validateStaticData();

  const steps = [];
  for (const step of commandPlan) {
    steps.push(await runCommand(step));
  }

  await validateArtifacts();
  const report = await writeReport(steps);

  console.log(`[daejeon-release-gate] status:passed report=${report.jsonPath}`);
  console.log(`[daejeon-release-gate] summary=${report.markdownPath}`);
} catch (error) {
  console.error('[daejeon-release-gate] status:failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
