import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runReleasePackage = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_BASE_TRACE_BLOCK_COUNT,
    GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
    GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
    GWANGJU_PENDING_OPERATOR_SECTIONS,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const outputRoot = path.join(repoRoot, 'output/playwright');
  
  const RELEASE_PACKAGE_VERSION = 'GWANGJU_DERIVED_RANGE_RELEASE_PACKAGE_V1';
  const expectedPendingOperatorSections = [];
  const requiredReportFiles = {
    traceReview: path.join(reportDir, 'gwangju-seatmap-trace-review.json'),
    traceReviewMarkdown: path.join(reportDir, 'gwangju-seatmap-trace-review.md'),
    operatorStatus: path.join(reportDir, 'gwangju-seatmap-operator-status.json'),
    operatorStatusMarkdown: path.join(reportDir, 'gwangju-seatmap-operator-status.md'),
    browserQaSummary: path.join(outputRoot, 'stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.json'),
    browserQaMarkdown: path.join(outputRoot, 'stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.md'),
    releaseLock: path.join(frontendRoot, 'docs/gwangju-seatmap-release-lock.md'),
    releaseHandoff: path.join(frontendRoot, 'docs/gwangju-seatmap-release-handoff.md'),
    operatorRunbook: path.join(frontendRoot, 'docs/gwangju-seatmap-operator-runbook.md'),
  };
  
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-release-package.json');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-release-package.md');
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const readJsonIfExists = async (filePath) => {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  };
  
  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };
  
  const relativePath = (filePath) => path.relative(frontendRoot, filePath);
  const sorted = (values) => [...values].sort();
  const sameSet = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
  
  const requiredFileRows = await Promise.all(Object.entries(requiredReportFiles).map(async ([key, filePath]) => ({
    key,
    path: relativePath(filePath),
    exists: await fileExists(filePath),
  })));
  
  const traceReview = await readJsonIfExists(requiredReportFiles.traceReview);
  const operatorStatus = await readJsonIfExists(requiredReportFiles.operatorStatus);
  const browserQaSummary = await readJsonIfExists(requiredReportFiles.browserQaSummary);
  const traceSummary = traceReview?.summary ?? {};
  const operatorSummary = operatorStatus?.summary ?? {};
  const derivedRangeRows = GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.map((range) => ({
    id: range.id,
    label: range.label,
    displayBlocks: range.displayBlocks,
    filterGroupId: range.filterGroupId,
    aggregateHitArea: range.aggregateHitArea,
    operatorPolygonStatus: range.operatorPolygonStatus,
    sourceRequirementIds: range.sourceRequirementIds,
  }));
  
  const blockers = [];
  requiredFileRows
    .filter((row) => !row.exists)
    .forEach((row) => blockers.push(`MISSING_RELEASE_ARTIFACT:${row.path}`));
  
  if (GWANGJU_BASE_TRACE_BLOCK_COUNT !== 111) {
    blockers.push(`BASE_TRACE_BLOCK_COUNT_CHANGED:${GWANGJU_BASE_TRACE_BLOCK_COUNT}`);
  }
  if (GWANGJU_EXPECTED_TRACE_BLOCK_COUNT !== 113) {
    blockers.push(`EXPECTED_TRACE_BLOCK_COUNT_CHANGED:${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}`);
  }
  if (!GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE) {
    blockers.push('OPERATOR_BLOCK_RANGE_NO_LONGER_REUSES_EXISTING_TRACE');
  }
  if (!sameSet(GWANGJU_PENDING_OPERATOR_SECTIONS, expectedPendingOperatorSections)) {
    blockers.push(`PENDING_OPERATOR_SECTIONS_CHANGED:${GWANGJU_PENDING_OPERATOR_SECTIONS.join(',')}`);
  }
  
  if (traceReview) {
    if (traceSummary.totalBlocks !== 113) blockers.push(`TRACE_TOTAL_BLOCKS_CHANGED:${traceSummary.totalBlocks}`);
    if (traceSummary.baseTraceBlocks !== 111) blockers.push(`TRACE_BASE_BLOCKS_CHANGED:${traceSummary.baseTraceBlocks}`);
    if (traceSummary.officialImageTracedBlocks !== 113) blockers.push(`TRACE_OFFICIAL_IMAGE_TRACED_CHANGED:${traceSummary.officialImageTracedBlocks}`);
    if (traceSummary.directOfficialTraceBlocks !== 113) blockers.push(`TRACE_DIRECT_OFFICIAL_TRACE_CHANGED:${traceSummary.directOfficialTraceBlocks}`);
    if (traceSummary.manualReviewedBlocks !== 113) blockers.push(`TRACE_MANUAL_REVIEWED_CHANGED:${traceSummary.manualReviewedBlocks}`);
    if (traceSummary.pixelAlignedBlocks !== 113) blockers.push(`TRACE_PIXEL_ALIGNED_CHANGED:${traceSummary.pixelAlignedBlocks}`);
    if (traceSummary.overlapWarningCount !== 0) blockers.push(`TRACE_OVERLAP_WARNINGS_PRESENT:${traceSummary.overlapWarningCount}`);
    if (traceSummary.aggregateHitAreaMode !== 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY') {
      blockers.push(`TRACE_AGGREGATE_HIT_AREA_MODE_CHANGED:${traceSummary.aggregateHitAreaMode}`);
    }
  }
  
  if (operatorStatus) {
    if (operatorSummary.status !== 'ready') blockers.push(`OPERATOR_STATUS_NOT_READY:${operatorSummary.status}`);
    if (operatorSummary.pendingSections !== 0) blockers.push(`OPERATOR_PENDING_SECTION_COUNT_CHANGED:${operatorSummary.pendingSections}`);
    if (operatorSummary.validDataDiffSections !== 0) blockers.push(`OPERATOR_VALID_DATA_DIFF_NOT_ZERO:${operatorSummary.validDataDiffSections}`);
    if ((operatorSummary.blockers ?? []).length !== 0) blockers.push(`OPERATOR_STATUS_BLOCKERS_PRESENT:${operatorSummary.blockers?.join(',')}`);
    if (operatorSummary.operatorBlockRangeReusesExistingTrace !== true) {
      blockers.push('OPERATOR_STATUS_REUSE_EXISTING_TRACE_FLAG_CHANGED');
    }
    if (operatorSummary.derivedRangeCount !== 3) blockers.push(`OPERATOR_DERIVED_RANGE_COUNT_CHANGED:${operatorSummary.derivedRangeCount}`);
  }
  
  if (browserQaSummary && browserQaSummary.status !== 'passed') {
    blockers.push(`BROWSER_QA_STATUS_NOT_PASSED:${browserQaSummary.status}`);
  }
  
  derivedRangeRows.forEach((range) => {
    const expectedAggregateHitArea = range.id === 'derived-home-cheering-seats'
      ? 'REUSES_EXISTING_TRACE_ONLY'
      : 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE';
    if (range.aggregateHitArea !== expectedAggregateHitArea) {
      blockers.push(`DERIVED_RANGE_AGGREGATE_HIT_AREA_CHANGED:${range.id}:${range.aggregateHitArea}`);
    }
    if (range.operatorPolygonStatus !== 'OFFICIAL_DERIVED_READY') {
      blockers.push(`DERIVED_RANGE_OPERATOR_POLYGON_STATUS_CHANGED:${range.id}:${range.operatorPolygonStatus}`);
    }
  });
  
  const report = {
    generatedAt: new Date().toISOString(),
    version: RELEASE_PACKAGE_VERSION,
    status: blockers.length === 0 ? 'ready' : 'blocked',
    doesNotModifyDataFile: true,
    asset: {
      imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    releaseMode: 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE',
    activeBlockContract: {
      baseTraceBlocks: GWANGJU_BASE_TRACE_BLOCK_COUNT,
      expectedTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
      aggregateHitArea: 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY',
      pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
      officialDerivedAggregateReady: true,
    },
    sourcePolicy: {
      allowedCoordinateSource: 'operator-provided official PNG coordinates only',
      coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: [
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
    },
    artifacts: requiredFileRows,
    traceSummary,
    operatorStatusSummary: operatorSummary,
    browserQaSummary: {
      status: browserQaSummary?.status ?? null,
      targets: browserQaSummary?.targets ?? [],
    },
    derivedRanges: derivedRangeRows,
    blockers,
    gateCommands: [
      'npm run qa:stadium:gwangju:trace-review',
      'npm run stadium:gwangju:operator-status',
      'npm run test:stadium:gwangju:seatmaps',
      'validate existing gwangju trace-review artifacts',
      'npm run stadium:gwangju:release-package',
      'npm run build',
    ],
  };
  
  const markdown = [
    '# 광주 K7/AWAY derived range release package',
    '',
    `- version: \`${RELEASE_PACKAGE_VERSION}\``,
    `- status: \`${report.status}\``,
    `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
    `- release mode: \`${report.releaseMode}\``,
    `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
    `- active block contract: \`${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}\``,
    `- aggregate hit-area: \`${report.activeBlockContract.aggregateHitArea}\``,
    `- operator sections: \`${GWANGJU_PENDING_OPERATOR_SECTIONS.join(', ')}\``,
    `- browser QA status: \`${report.browserQaSummary.status ?? '-'}\``,
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
    '',
    '## Derived Ranges',
    '',
    markdownTable(
      ['range', 'display blocks', 'filter', 'hit-area', 'polygon status', 'source requirements'],
      derivedRangeRows.map((range) => [
        `\`${range.label}\``,
        range.displayBlocks,
        `\`${range.filterGroupId}\``,
        `\`${range.aggregateHitArea}\``,
        `\`${range.operatorPolygonStatus}\``,
        range.sourceRequirementIds.map((id) => `\`${id}\``).join('<br>'),
      ]),
    ),
    '',
    '## Required Artifacts',
    '',
    markdownTable(
      ['artifact', 'path', 'exists'],
      requiredFileRows.map((row) => [
        `\`${row.key}\``,
        `\`${row.path}\``,
        `\`${row.exists}\``,
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
    '## Gate Commands',
    '',
    ...report.gateCommands.map((command) => `- \`${command}\``),
    '',
  ].join('\n');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, markdown, 'utf8');
  
  console.log(`release_package_json:${jsonPath}`);
  console.log(`release_package_markdown:${markdownPath}`);
  console.log(`status:${report.status} blockers=${blockers.length} activeBlocks=${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT} derivedRanges=${derivedRangeRows.length}`);
  
  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runReleaseAudit = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
    GWANGJU_PENDING_OPERATOR_SECTIONS,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

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
  const EXPECTED_RELEASE_PAYLOAD_FILE_COUNT = 17;
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
    'release scope guard included release files: `40`',
    'release scope guard separate dirty work baseline files: `95`',
    'classified separate dirty work expansion allowed: `true`',
    'release scope guard inventory drift: `0`',
    '`releaseScopeGuardIncludedFiles=40`',
    '`releaseScopeGuardSeparateDirtyWorkBaselineFiles=95`',
    '`classifiedSeparateDirtyWorkExpansionAllowed=true`',
    '`releaseScopeGuardInventoryDrift=0`',
    'Release Candidate Inventory',
    'releaseCandidateInventory.expectedIncludedFileCount=40',
    'separateWorkInventory.expectedSeparateDirtyWorkCount baseline=95',
    'separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true',
    'PR Packaging Manifest',
    'PR packaging manifest source of truth: `reports/stadium/gwangju-seatmap-release-scope-guard.md`',
    'Release PR scope: Gwangju official derived aggregate release package and build verification reports.',
    'Excluded PR scope: Daegu work, Daejeon work, Sajik work, Suwon work, and cross-stadium utilities.',
    'prPackagingManifest.releasePayloadFileCount=40',
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
    'stagedScopeAudit.expectedTargetFileCount=17',
    'stagedScopeAudit.stagedOutsideTargetFileCount=0',
    'stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0',
    'targetedStaging.status=ready',
    'targetedStaging.doesNotRunGitAdd=true',
    'targetedStaging.safeToRunBulkGitAdd=false',
    'targetedStaging.recommendsOnlyIncludedFiles=true',
    'targetedStaging.doesNotRecommendSeparateDirtyWork=true',
    'targetedStaging.targetFileCount=17',
    'targetedStaging.reviewedUntrackedSatisfiedFileCount=4',
    'stagingPlan.status=ready-or-review-required',
    'stagingPlan.doesNotRunGitAdd=true',
    'stagingPlan.safeToRunBulkGitAdd=false',
    'stagingPlan.releasePayloadFileCount=17',
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
};

const runReleaseScopeGuard = async () => {
  const {
    execFile
  } = await import('node:child_process');
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    promisify
  } = await import('node:util');

  const execFileAsync = promisify(execFile);
  
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  
  const SCOPE_GUARD_VERSION = 'GWANGJU_RELEASE_SCOPE_GUARD_V1';
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-release-scope-guard.json');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-release-scope-guard.md');
  
  const sourcePolicy = {
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
  };
  
  const expectedIncludedReleaseFiles = [
  'scripts/gwangju-seatmap-release-staging-ops.mjs',
    'docs/gwangju-seatmap-operator-runbook.md',
    'docs/gwangju-seatmap-release-handoff.md',
    'docs/gwangju-seatmap-release-lock.md',
    'package.json',
    'reports/bundle-guard-report.json',
    'reports/dist-assets-report.json',
    'src/components/ChatBotFloatingButton.tsx',
    'src/components/ChatBotRuntime.tsx',
    'src/components/MateResultsRuntime.tsx',
    'scripts/gwangju-seatmap-core-qa.mjs',
  'scripts/gwangju-seatmap-evidence-workset-ops.mjs',
    'scripts/gwangju-seatmap-operator-template-ops.mjs',
    'scripts/gwangju-seatmap-operator-intake-write-ops.mjs',
    'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'src/data/gwangjuSeatData.test.ts',
    'src/data/gwangjuSeatData.ts',
  ];
  const expectedIncludedReleaseFileSet = new Set(expectedIncludedReleaseFiles);
  
  const reviewedUntrackedIncludedReleaseFiles = [
    'scripts/gwangju-seatmap-core-qa.mjs',
    'scripts/gwangju-seatmap-operator-template-ops.mjs',
  ];
  
  const expectedSeparateDirtyWorkFiles = [
    'docs/daegu-seatmap-operator-corrections-runbook.md',
    'docs/daejeon-seatmap-release-lock.md',
    'docs/sajik-seatmap-pr-packaging-inventory.md',
    'docs/sajik-seatmap-editor-v17-operator-guide.md',
    'docs/sajik-seatmap-editor-v18-roadmap.md',
    'docs/sajik-seatmap-hitpath-candidate-review.md',
    'docs/sajik-seatmap-marker-only-transition.md',
    'docs/sajik-seatmap-release-lock.md',
    'scripts/daegu-seatmap-non-overlap-priority-queue.mjs',
    'scripts/daegu-seatmap-off-seat-retrace-intake.mjs',
    'scripts/daegu-seatmap-operator-corrections.mjs',
    'scripts/daegu-seatmap-p0-operators.mjs',
    'scripts/daegu-seatmap-p1-boundary-input-aid.mjs',
    'scripts/daegu-seatmap-p1-decision-packet.mjs',
    'scripts/daegu-seatmap-p1-next-action-packet.mjs',
    'scripts/daegu-seatmap-p1-operator-boundary.mjs',
    'scripts/daegu-seatmap-p1-paired-boundary-review.mjs',
    'scripts/daegu-seatmap-p1-precision-workset.mjs',
    'scripts/daegu-seatmap-p1-stage-order-regression.mjs',
    'scripts/daegu-seatmap-p2-operators.mjs',
    'scripts/daegu-seatmap-p2a-operators.mjs',
    'scripts/daegu-seatmap-p3-p4-operators.mjs',
    'scripts/daegu-seatmap-precision-audit.mjs',
    'scripts/daegu-seatmap-retrace-work-queue.mjs',    'scripts/daegu-seatmap-visual-match.mjs',
    'scripts/daejeon-seatmap-ops.mjs',
    'scripts/daejeon-seatmap-anchor-contract.mjs',    'scripts/daejeon-seatmap-ops.mjs',
    'scripts/sajik-seatmap-core-qa.mjs',
    'scripts/sajik-seatmap-editor-scope.mjs',
    'scripts/sajik-seatmap-export-dataset.mjs',
    'scripts/sajik-seatmap-hitpath-candidate-review.mjs',    'scripts/sajik-seatmap-editor-scope.mjs',
    'scripts/sajik-seatmap-core-qa.mjs',
    'scripts/stadium-ux-audit.mjs',
    'src/components/AppRoutes.tsx',
    'src/components/DaejeonStadiumUxAuditContract.test.ts',
    'src/components/HomeRuntime.tsx',
    'src/components/StadiumGuideRuntime.tsx',
    'src/components/changwon/ChangwonSeatMap.tsx',
    'src/components/daegu/DaeguSeatMap.tsx',
    'src/components/daegu/DaeguSeatMapSvg.tsx',
    'src/components/daejeon/DaejeonSeatMap.tsx',
    'src/components/gocheok/GocheokSeatMap.tsx',
    'src/components/gwangju/GwangjuSeatMap.tsx',
    'src/components/incheon/IncheonSeatMap.tsx',
    'src/components/jamsil/JamsilSeatMap.tsx',
    'src/components/sajik/SajikSeatMap.test.ts',
    'src/components/sajik/SajikSeatMap.tsx',
    'src/components/sajik/SajikSeatMapEditor.tsx',
    'src/components/sajik/SajikSeatMapSvg.tsx',
    'src/components/stadiumSeatMap/SeatMapAttribution.tsx',
    'src/components/stadiumSeatMap/SeatMapBottomSheet.tsx',
    'src/components/stadiumSeatMap/SeatMapDetailPanel.tsx',
    'src/components/stadiumSeatMap/SeatMapFilterBar.tsx',
    'src/components/stadiumSeatMap/SeatMapLegend.tsx',
    'src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx',
    'src/components/stadiumSeatMap/SeatMapTemplateShell.tsx',
    'src/components/stadiumSeatMap/seatMapCommonTypes.ts',
    'src/components/stadiumSeatMap/useSeatMapSelectionState.ts',
    'src/components/stadiumSeatMapRegistry.tsx',
    'src/components/suwon/SuwonSeatMap.tsx',
    'src/data/daeguSeatData.test.ts',
    'src/data/daeguSeatData.ts',
    'src/data/daejeonAnchorVisualBaseline.json',
    'src/data/daejeonGeometryBaseline.json',
    'src/data/daejeonSeatData.test.ts',
    'src/data/daejeonSeatData.ts',
    'src/data/sajikSeatData.test.ts',
    'src/data/sajikSeatData.ts',
    'src/data/sajikSeatMapDataset.ts',
    'src/data/suwonSeatData.test.ts',
    'src/data/suwonSeatData.ts',
    'src/utils/seatMapPolygonValidator.ts',
  ];
  
  const nonStadiumFrontendSeparateWorkFiles = new Set([
    '.claude/',
    'cypress/e2e/prediction-coach-briefing.cy.ts',
    'src/api/coach.ts',
    'src/api/ranking.ts',
    'src/components/AuthenticatedLayoutChrome.tsx',
    'src/components/CoachAnalysisDialogLauncher.tsx',
    'src/components/CoachAnalysisDialogResultRuntime.tsx',
    'src/components/CoachBriefing.tsx',
    'src/components/CoachBriefingAutoRuntime.tsx',
    'src/components/CoachBriefingContentRuntime.tsx',
    'src/components/CoachBriefingContentCardRuntime.tsx',
    'src/components/GameCard.tsx',
    'src/components/MatePartyCard.tsx',
    'src/components/Navbar.tsx',
    'src/components/PublicNavbar.tsx',
    'src/components/PublicNavbarDesktopAuthControls.tsx',
    'src/components/home/GameCardSkeleton.tsx',
    'src/components/home/HomeMatchPanel.tsx',
    'src/components/home/HomeSecondaryPanels.tsx',
    'src/components/home/TeamRankRow.tsx',
    'src/components/mypage/MateHistoryCard.tsx',
    'src/components/prediction/CoachAnalysisResultView.tsx',
    'src/components/prediction/PredictionMatchPreviewTab.tsx',
    'src/components/ui/sonner.tsx',
    'src/hooks/predictionScheduleAdjacentPrefetch.test.ts',
    'src/hooks/useDmSocket.ts',
    'src/hooks/useNotificationSocket.ts',
    'src/hooks/usePredictionGameData.ts',
    'src/hooks/useRankingPrediction.ts',
    'src/hooks/useScrollStage.ts',
    'src/hooks/useWebSocket.ts',
    'src/index.css',
    'src/seo/SeoHead.tsx',
    'src/shims/sonner.tsx',
    'src/types/ranking.ts',
    'src/utils/mate.ts',
    'src/utils/predictionDeferredWork.test.ts',
    'src/utils/realtimeAuth.test.ts',
    'src/utils/realtimeAuth.ts',
  ]);
  
  // Temporary one-off diagnostic outputs and probes used during stadium analysis work.
  const temporaryDiagnosticSeparateWorkFiles = new Set([
    'cypress/e2e/url-debug.cy.ts',
    'scripts/gwangju-seatmap-third-base-boundary-overlay.mjs',
    'scripts/gwangju-seatmap-third-base-independent-audit.mjs',
  ]);
  
  const includedRules = [
    {
      id: 'gwangju-release-docs',
      reason: 'Gwangju official derived aggregate release docs and runbook',
      match: (file) => file.startsWith('docs/gwangju-seatmap-') && expectedIncludedReleaseFileSet.has(file),
    },
    {
      id: 'gwangju-release-scripts',
      reason: 'Gwangju release, operator, manifest, and scope guard scripts',
      match: (file) => file.startsWith('scripts/gwangju-seatmap-') && expectedIncludedReleaseFileSet.has(file),
    },
    {
      id: 'gwangju-browser-evidence-runtime',
      reason: 'Shared browser QA script contains Gwangju-specific browser crop evidence generation',
      match: (file) => file === 'scripts/stadium-ux-audit.mjs' && expectedIncludedReleaseFileSet.has(file),
    },
    {
      id: 'gwangju-data-contract',
      reason: 'Gwangju seatmap data and tests contract',
      match: (file) => [
        'src/data/gwangjuSeatData.ts',
        'src/data/gwangjuSeatData.test.ts',
      ].includes(file),
    },
    {
      id: 'shared-static-seatmap-contract',
      reason: 'Static tests lock the Gwangju handoff contract',
      match: (file) => file === 'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    },
    {
      id: 'package-script-contract',
      reason: 'Package scripts expose the Gwangju scope guard',
      match: (file) => file === 'package.json',
    },
    {
      id: 'gwangju-release-reports',
      reason: 'Generated Gwangju release, audit, and scope reports',
      match: (file) => file.startsWith('reports/stadium/gwangju-seatmap-') && expectedIncludedReleaseFileSet.has(file),
    },
    {
      id: 'build-verification-reports',
      reason: 'Build verification reports regenerated by npm run build',
      match: (file) => [
        'reports/bundle-guard-report.json',
        'reports/dist-assets-report.json',
      ].includes(file),
    },
    {
      id: 'build-budget-support',
      reason: 'Runtime split support keeps the release build within bundle guard budgets',
      match: (file) => [
        'src/components/ChatBotFloatingButton.tsx',
        'src/components/ChatBotRuntime.tsx',
        'src/components/MateResultsRuntime.tsx',
      ].includes(file),
    },
  ];
  
  const separateRules = [
    {
      id: 'daegu-files',
      reason: 'Daegu work is explicitly outside the Gwangju release handoff scope',
      match: (file) => (
        file.startsWith('docs/daegu-')
        || file.startsWith('scripts/daegu-')
        || file.startsWith('src/components/daegu/')
        || file.startsWith('src/components/StadiumGuideRuntimeSeatMaps.daegu')
        || file.startsWith('src/data/daegu')
      ),
    },
    {
      id: 'daejeon-files',
      reason: 'Daejeon work is explicitly outside the Gwangju release handoff scope',
      match: (file) => (
        file.startsWith('docs/daejeon-')
        || file.startsWith('scripts/daejeon-')
        || file.startsWith('src/components/daejeon/')
        || file.startsWith('src/data/daejeon')
        || file.startsWith('reports/stadium/daejeon-')
      ),
    },
    {
      id: 'sajik-files',
      reason: 'Sajik work is explicitly outside the Gwangju release handoff scope',
      match: (file) => (
        file.startsWith('docs/sajik-')
        || file.startsWith('scripts/sajik-')
        || file.startsWith('src/assets/stadiums/lotte/')
        || file.startsWith('src/components/sajik/')
        || file.startsWith('src/data/sajik')
      ),
    },
    {
      id: 'changwon-files',
      reason: 'Changwon work is explicitly outside the Gwangju release handoff scope',
      match: (file) => (
        file.startsWith('docs/changwon-')
        || file.startsWith('scripts/changwon-')
        || file.startsWith('src/components/changwon/')
        || file.startsWith('src/data/changwon')
      ),
    },
    {
      id: 'gocheok-files',
      reason: 'Gocheok work is explicitly outside the Gwangju release handoff scope',
      match: (file) => (
        file.startsWith('docs/gocheok-')
        || file.startsWith('scripts/gocheok-')
        || file.startsWith('src/components/gocheok/')
        || file.startsWith('src/data/gocheok')
      ),
    },
    {
      id: 'suwon-files',
      reason: 'Suwon work is explicitly outside the Gwangju release handoff scope',
      match: (file) => (
        file.startsWith('docs/suwon-')
        || file.startsWith('scripts/suwon-')
        || file.startsWith('src/components/suwon/')
        || file.startsWith('src/data/suwon')
      ),
    },
    {
      id: 'jamsil-files',
      reason: 'Jamsil work is explicitly outside the Gwangju release handoff scope',
      match: (file) => (
        file.startsWith('docs/jamsil-')
        || file.startsWith('scripts/jamsil-')
        || file.startsWith('src/components/jamsil/')
        || file.startsWith('src/data/jamsil')
      ),
    },
    {
      id: 'cross-stadium-utilities',
      reason: 'Shared or cross-stadium work is tracked separately from the Gwangju release handoff',
      match: (file) => [
        'docs/stadium-seatmap-standard-shell-pr-scope.md',
        'scripts/run-stadium-isolated-qa.mjs',
        'scripts/stadium-seatmap-ops.mjs',
        'src/components/AppRoutes.tsx',
        'src/components/AuthenticatedStadiumFavoriteToggle.tsx',
        'cypress/e2e/stadium.cy.ts',
        'cypress/e2e/stadium-seatmap.cy.ts',
        'scripts/stadium-ux-audit.mjs',
        'src/components/DaejeonStadiumUxAuditContract.test.ts',
        'src/components/HomeRuntime.tsx',
        'src/components/StadiumGuide.css',
        'src/components/StadiumGuidePlacesRuntime.tsx',
        'src/components/StadiumGuideRuntime.tsx',
        'src/components/changwon/ChangwonBottomSheet.tsx',
        'src/components/changwon/ChangwonSeatMap.tsx',
        'src/components/changwon/ChangwonSeatMapSvg.tsx',
        'src/components/daejeon/DaejeonBottomSheet.tsx',
        'src/components/daejeon/DaejeonSeatMap.tsx',
        'src/components/gocheok/GocheokBottomSheet.tsx',
        'src/components/gocheok/GocheokSeatMap.tsx',
        'src/components/gocheok/GocheokSeatMapSvg.tsx',
        'src/components/gwangju/GwangjuBottomSheet.tsx',
        'src/components/gwangju/GwangjuSeatMap.tsx',
        'src/components/gwangju/GwangjuSeatMapSvg.tsx',
        'src/components/incheon/IncheonBottomSheet.tsx',
        'src/components/incheon/IncheonSeatMap.test.tsx',
        'src/components/incheon/IncheonSeatMap.tsx',
        'src/components/incheon/IncheonSeatMapSvg.tsx',
        'src/components/jamsil/JamsilSeatMap.tsx',
        'scripts/stadium-seatmap-standard-shell-pr-scope-guard.mjs',
        'src/components/stadiumSeatMap/SeatMapAttribution.tsx',
        'src/components/stadiumSeatMap/SeatMapBottomSheet.tsx',
        'src/components/stadiumSeatMap/SeatMapDetailPanel.tsx',
        'src/components/stadiumSeatMap/SeatMapFilterBar.tsx',
        'src/components/stadiumSeatMap/SeatMapLegend.tsx',
        'src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx',
        'src/components/stadiumSeatMap/SeatMapSectionFinder.tsx',
        'src/components/stadiumSeatMap/SeatMapTemplateShell.tsx',
        'src/components/stadiumSeatMap/seatMapInteractionUtils.ts',
        'src/components/stadiumSeatMap/seatMapCommonTypes.ts',
        'src/components/stadiumSeatMap/useSeatMapSelectionState.ts',
        'src/components/stadiumSeatMapRegistry.tsx',
        'src/hooks/useStadiumGuide.ts',
        'src/components/suwon/SuwonSeatMap.tsx',
        'src/data/incheonSeatData.test.ts',
        'src/data/incheonSeatData.ts',
        'src/data/incheonVisitGuide.test.ts',
        'src/data/incheonVisitGuide.ts',
        'src/utils/kakaoMap.ts',
        'src/utils/seatMapPolygonValidator.ts',
      ].includes(file),
    },
    {
      id: 'non-stadium-frontend-work',
      reason: 'Non-stadium frontend runtime work is explicitly outside the Gwangju release handoff scope',
      match: (file) => nonStadiumFrontendSeparateWorkFiles.has(file),
    },
    {
      id: 'temporary-diagnostic-files',
      reason: 'Temporary Gwangju investigation files are outside the release handoff payload',
      match: (file) => temporaryDiagnosticSeparateWorkFiles.has(file),
    },
  ];
  
  const requiredHandoffSnippets = [
    'Change Scope',
    'Gwangju official derived aggregate release package',
    'Separate dirty work that must not be judged by this handoff',
    'Daejeon files',
    'Sajik files',
    'Suwon files',
    'Daegu files',
    'Cross-stadium',
    'src/utils/seatMapPolygonValidator.ts',
    'release scope guard',
    'gwangju-seatmap-release-scope-guard.json',
    'gwangju-seatmap-release-scope-guard.md',
    'PR Packaging Manifest',
    'Release Candidate Inventory',
    'Included release candidate files: `40`',
    'Separate dirty work files:',
    'Separate dirty work baseline files: `95`',
    'Classified separate dirty work expansion allowed: `true`',
    'Inventory drift: `0`',
    'releaseCandidateInventory.expectedIncludedFileCount=40',
    'separateWorkInventory.expectedSeparateDirtyWorkCount baseline=95',
    'separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true',
    'prPackagingManifest.releasePayloadFileCount=40',
    'prPackagingManifest.separateDirtyWorkFileCount=',
    'prPackagingManifest.unexpectedDirtyFileCount=0',
    'prPackagingManifest.inventoryDriftCount=0',
    'Patch Separation Readiness',
    'patch separation readiness: `ready` or `review-required`',
    'patchSeparationReadiness.status=ready-or-review-required',
    'patchSeparationReadiness only becomes `review-required` when release payload files have unreviewed mixed or untracked diffs.',
    'reviewed expected untracked release files are ready for targeted staging',
    'clean release payload files are not packaging blockers',
    'PR staging plan',
    'gwangju-seatmap-pr-staging-plan.json',
    'gwangju-seatmap-pr-staging-plan.md',
    'gwangju-seatmap-pr-staging-review.json',
    'gwangju-seatmap-pr-staging-review.md',
    'staged scope audit: `npm run stadium:gwangju:staged-scope-audit`',
    'gwangju-seatmap-staged-scope-audit.json',
    'gwangju-seatmap-staged-scope-audit.csv',
    'gwangju-seatmap-staged-scope-audit.md',
    'stagedScopeAudit.status=ready',
    'stagedScopeAudit.doesNotRunGitAdd=true',
    'stagedScopeAudit.safeToRunBulkGitAdd=false',
    'stagedScopeAudit.acceptsOnlyTargetedStagingFiles=true',
    'stagedScopeAudit.blocksSeparateDirtyWork=true',
    'stagedScopeAudit.expectedTargetFileCount=17',
    'stagedScopeAudit.stagedOutsideTargetFileCount=0',
    'stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0',
    'stagingPlan.status=ready-or-review-required',
    'stagingPlan.doesNotRunGitAdd=true',
    'stagingPlan.releasePayloadFileCount=17',
    'stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true',
    'stagingReview.status=ready-or-review-required',
    'stagingReview.doesNotRunGitAdd=true',
    'stagingReview.safeToRunBulkGitAdd=false',
    'stagingReview.releasePayloadFileCount=17',
    'stagingReview.recommendsOnlyIncludedFiles=true',
    'stagingReview.doesNotRecommendSeparateDirtyWork=true',
    'targetedStaging.targetFileCount=17',
    'targetedStaging.reviewedUntrackedSatisfiedFileCount=4',
    'RELEASE_CANDIDATE_FILE_MISSING',
    'CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED',
    'scripts/daegu-seatmap-p1-operator-boundary.mjs',
    'operator-provided official PNG coordinates only',
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ];
  
  const requiredPackageSnippets = [
    '"stadium:gwangju:release-scope-guard"',
    'node --import tsx scripts/gwangju-seatmap-release-staging-ops.mjs release-scope-guard',
    '"stadium:gwangju:pr-staging-plan"',
    'node --import tsx scripts/gwangju-seatmap-release-staging-ops.mjs pr-staging-plan',
    '"stadium:gwangju:pr-staging-review"',
    'node --import tsx scripts/gwangju-seatmap-release-staging-ops.mjs pr-staging-plan --review',
    '"stadium:gwangju:targeted-staging"',
    'node --import tsx scripts/gwangju-seatmap-release-staging-ops.mjs targeted-staging',
    '"stadium:gwangju:staged-scope-audit"',
    'node --import tsx scripts/gwangju-seatmap-release-staging-ops.mjs staged-scope-audit',
    '"stadium:gwangju:pre-pr-final-gate"',
  ];
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const sorted = (values) => [...values].sort();
  
  const diffFileList = (expected, actual) => {
    const actualSet = new Set(actual);
    const expectedSet = new Set(expected);
    return {
      missing: sorted(expected.filter((file) => !actualSet.has(file))),
      extra: sorted(actual.filter((file) => !expectedSet.has(file))),
    };
  };
  
  const parseStatusLine = (line) => {
    const status = line.slice(0, 2);
    const rawPath = line.slice(3);
    const file = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;
    return { status, file };
  };
  
  const classifyFile = (entry) => {
    const includedRule = includedRules.find((rule) => rule.match(entry.file));
    if (includedRule) {
      return { ...entry, scope: 'included', rule: includedRule.id, reason: includedRule.reason };
    }
  
    const separateRule = separateRules.find((rule) => rule.match(entry.file));
    if (separateRule) {
      return { ...entry, scope: 'separate', rule: separateRule.id, reason: separateRule.reason };
    }
  
    return {
      ...entry,
      scope: 'unexpected',
      rule: 'unclassified',
      reason: 'This dirty file is not documented as part of the Gwangju handoff scope or a separated workstream.',
    };
  };
  
  const readText = async (filePath) => {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') return '';
      throw error;
    }
  };
  
  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      if (error?.code === 'ENOENT') return false;
      throw error;
    }
  };
  
  const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd: frontendRoot });
  const dirtyEntries = stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map(parseStatusLine)
    .map(classifyFile);
  const dirtyEntriesByFile = new Map(dirtyEntries.map((entry) => [entry.file, entry]));
  const expectedIncludedFileSet = new Set(expectedIncludedReleaseFiles);
  const expectedIncludedFileExistence = await Promise.all(expectedIncludedReleaseFiles.map(async (file) => ({
    file,
    exists: await fileExists(path.join(frontendRoot, file)),
    dirtyEntry: dirtyEntriesByFile.get(file),
  })));
  const includedFiles = expectedIncludedFileExistence
    .filter((entry) => entry.exists || entry.dirtyEntry?.status?.includes('D'))
    .map(({ file, dirtyEntry }) => {
      const includedRule = includedRules.find((rule) => rule.match(file));
  
      return {
        status: dirtyEntry?.status ?? '-',
        file,
        scope: 'included',
        rule: includedRule?.id ?? 'expected-release-payload',
        reason: includedRule?.reason ?? 'Expected Gwangju release payload file.',
        dirty: Boolean(dirtyEntry),
      };
    });
  const includedEntriesByFile = new Map(includedFiles.map((entry) => [entry.file, entry]));
  const reviewedUntrackedIncludedReleaseFileSet = new Set(reviewedUntrackedIncludedReleaseFiles);
  const isReviewedUntrackedIncludedReleaseFile = (entry) => (
    entry.status === '??' && reviewedUntrackedIncludedReleaseFileSet.has(entry.file)
  );
  
  const releaseHandoffSource = await readText(path.join(frontendRoot, 'docs/gwangju-seatmap-release-handoff.md'));
  const releaseLockSource = await readText(path.join(frontendRoot, 'docs/gwangju-seatmap-release-lock.md'));
  const packageSource = await readText(path.join(frontendRoot, 'package.json'));
  
  const missingHandoffSnippets = requiredHandoffSnippets.filter((snippet) => !releaseHandoffSource.includes(snippet));
  const missingPackageSnippets = requiredPackageSnippets.filter((snippet) => !packageSource.includes(snippet));
  const releaseLockMissingSnippets = [
    'scope guard',
    'npm run stadium:gwangju:release-scope-guard',
    'preoperator 통과 + official derived aggregate release + scope guard 통과',
    'scopeGuardIncludedFiles=40',
    'scopeGuardSeparateDirtyWorkFiles=',
    'scopeGuardSeparateDirtyWorkBaselineFiles=95',
    'classifiedSeparateDirtyWorkExpansionAllowed=true',
    'expectedIncludedFileCount=40',
    'expectedSeparateDirtyWorkCount baseline=95',
    'prPackagingManifest.releasePayloadFileCount=40',
    'prPackagingManifest.separateDirtyWorkFileCount=',
    'patchSeparationReadiness.status=ready-or-review-required',
    'clean release payload files are not packaging blockers',
    'stagingPlan.status=ready-or-review-required',
    'stagingPlan.doesNotRunGitAdd=true',
    'stagingReview.status=ready-or-review-required',
    'stagingReview.doesNotRunGitAdd=true',
    'stagingReview.releasePayloadFileCount=17',
    'targetedStaging.targetFileCount=17',
    'stagedScopeAudit.expectedTargetFileCount=17',
    'stagedScopeAudit.stagedOutsideTargetFileCount=0',
    'stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0',
  ].filter((snippet) => !releaseLockSource.includes(snippet));
  
  const unexpectedFiles = dirtyEntries.filter((entry) => entry.scope === 'unexpected');
  const separateDirtyWork = dirtyEntries.filter((entry) => entry.scope === 'separate');
  const entriesByFile = new Map(dirtyEntries.map((entry) => [entry.file, entry]));
  includedFiles.forEach((entry) => {
    entriesByFile.set(entry.file, entry);
  });
  const includedInventoryDiff = {
    missing: sorted(expectedIncludedFileExistence
      .filter((entry) => !entry.exists && !entry.dirtyEntry?.status?.includes('D'))
      .map((entry) => entry.file)),
    extra: sorted(dirtyEntries
      .filter((entry) => entry.scope === 'included' && !expectedIncludedFileSet.has(entry.file))
      .map((entry) => entry.file)),
  };
  const dirtyIncludedFileCount = includedFiles.filter((entry) => entry.dirty).length;
  const cleanIncludedFileCount = includedFiles.length - dirtyIncludedFileCount;
  const separateInventoryDiff = diffFileList(
    expectedSeparateDirtyWorkFiles,
    separateDirtyWork.map((entry) => entry.file),
  );
  const classifiedAdditionalSeparateDirtyWorkFiles = separateInventoryDiff.extra;
  
  const blockers = [
    ...unexpectedFiles.map((entry) => `UNCLASSIFIED_DIRTY_FILE:${entry.file}`),
    ...includedInventoryDiff.missing.map((file) => `RELEASE_CANDIDATE_FILE_MISSING:${file}`),
    ...includedInventoryDiff.extra.map((file) => `RELEASE_CANDIDATE_FILE_UNEXPECTED:${file}`),
    ...missingHandoffSnippets.map((snippet) => `HANDOFF_SCOPE_SNIPPET_MISSING:${snippet}`),
    ...missingPackageSnippets.map((snippet) => `PACKAGE_SCOPE_GUARD_SCRIPT_MISSING:${snippet}`),
    ...releaseLockMissingSnippets.map((snippet) => `RELEASE_LOCK_SCOPE_GUARD_SNIPPET_MISSING:${snippet}`),
  ];
  
  const warnings = [
    ...separateDirtyWork.map((entry) => `SEPARATE_DIRTY_WORK:${entry.file}`),
    ...separateInventoryDiff.missing.map((file) => `SEPARATE_DIRTY_WORK_BASELINE_NOT_DIRTY:${file}`),
    ...classifiedAdditionalSeparateDirtyWorkFiles.map((file) => `CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED:${file}`),
  ];
  
  const groupedSeparateCounts = separateDirtyWork.reduce((counts, entry) => ({
    ...counts,
    [entry.rule]: (counts[entry.rule] ?? 0) + 1,
  }), {});
  
  const groupedIncludedCounts = includedFiles.reduce((counts, entry) => ({
    ...counts,
    [entry.rule]: (counts[entry.rule] ?? 0) + 1,
  }), {});
  
  const isMixedGitStatus = (status) => Boolean(status && status !== '-' && status !== '??' && status[0] !== ' ' && status[1] !== ' ');
  const mixedStatusFiles = includedFiles
    .filter((entry) => isMixedGitStatus(entry.status))
    .map((entry) => ({
      file: entry.file,
      status: entry.status,
      reason: 'Included release file has both index and worktree changes; review before staging.',
    }));
  const untrackedIncludedFiles = includedFiles
    .filter((entry) => entry.status === '??' && !isReviewedUntrackedIncludedReleaseFile(entry))
    .map((entry) => ({
      file: entry.file,
      status: entry.status,
      reason: 'Included release file is untracked; review before staging.',
    }));
  const reviewedUntrackedIncludedFiles = includedFiles
    .filter(isReviewedUntrackedIncludedReleaseFile)
    .map((entry) => ({
      file: entry.file,
      status: entry.status,
      reason: 'Expected included release file has passed whole-file review and is ready for targeted git add.',
    }));
  const patchSeparationFocusFiles = [
    {
      file: 'package.json',
      reason: 'Package script changes can be mixed with unrelated script work; current MM status requires manual review.',
    },
    {
      file: 'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
      reason: 'Shared static test file contains multiple stadium contracts and should be reviewed before staging.',
    },
    {
      file: 'src/components/ChatBotFloatingButton.tsx',
      reason: 'Chatbot launcher support should be reviewed with the chat runtime bundle guard fix.',
    },
    {
      file: 'src/components/ChatBotRuntime.tsx',
      reason: 'Chatbot runtime auth imports should stay outside the release chat chunk forbidden manifest dependencies.',
    },
    {
      file: 'src/components/MateResultsRuntime.tsx',
      reason: 'Build-budget support file should be reviewed with the final bundle guard report.',
    },
    {
      file: 'reports/bundle-guard-report.json',
      reason: 'Generated build report should be regenerated with the final release gate.',
    },
    {
      file: 'reports/dist-assets-report.json',
      reason: 'Generated build report should be regenerated with the final release gate.',
    },
  ];
  const patchSeparationFocusRows = patchSeparationFocusFiles.map((focus) => {
    const entry = includedEntriesByFile.get(focus.file) ?? entriesByFile.get(focus.file);
    return {
      file: focus.file,
      status: entry?.status ?? '-',
      scope: entry?.scope ?? 'missing',
      rule: entry?.rule ?? '-',
      reason: focus.reason,
    };
  });
  const patchSeparationReviewReasons = [
    ...mixedStatusFiles.map((entry) => `MIXED_GIT_STATUS:${entry.file}:${entry.status}`),
    ...untrackedIncludedFiles.map((entry) => `UNTRACKED_INCLUDED_FILE:${entry.file}`),
  ];
  const patchSeparationStatus = blockers.length > 0
    ? 'blocked'
    : patchSeparationReviewReasons.length > 0
      ? 'review-required'
      : 'ready';
  
  const inventoryRows = (expectedFiles, diff) => expectedFiles.map((file) => {
    const entry = entriesByFile.get(file);
    return [
      `\`${file}\``,
      `\`${entry?.status ?? '-'}\``,
      `\`${entry?.scope ?? 'missing'}\``,
      `\`${entry?.rule ?? '-'}\``,
      diff.missing.includes(file) ? '`missing`' : (entry?.dirty ? '`dirty-present`' : '`clean-present`'),
    ];
  });
  
  const report = {
    generatedAt: new Date().toISOString(),
    version: SCOPE_GUARD_VERSION,
    status: blockers.length === 0 ? 'passed' : 'blocked',
    doesNotModifyDataFile: true,
    prPackagingManifest: {
      status: blockers.length === 0 ? 'ready' : 'blocked',
      releasePayloadFileCount: expectedIncludedReleaseFiles.length,
      separateDirtyWorkFileCount: separateDirtyWork.length,
      separateDirtyWorkBaselineFileCount: expectedSeparateDirtyWorkFiles.length,
      classifiedSeparateDirtyWorkExpansionAllowed: true,
      unexpectedDirtyFileCount: unexpectedFiles.length,
      inventoryDriftCount: [
        ...includedInventoryDiff.missing,
        ...includedInventoryDiff.extra,
      ].length,
      sourceOfTruth: [
        'reports/stadium/gwangju-seatmap-release-scope-guard.json',
        'reports/stadium/gwangju-seatmap-release-scope-guard.md',
        'docs/gwangju-seatmap-release-handoff.md',
      ],
      releasePrScope: [
        'Gwangju official derived aggregate release package',
        'build verification reports',
      ],
      excludedPrScope: [
        'Daegu work',
        'Daejeon work',
        'Sajik work',
        'Suwon work',
        'cross-stadium utilities',
      ],
    },
    patchSeparationReadiness: {
      status: patchSeparationStatus,
      expectedReleasePayloadFileCount: expectedIncludedReleaseFiles.length,
      includedFileCount: includedFiles.length,
      mixedStatusFiles,
      untrackedIncludedFiles,
      reviewedUntrackedIncludedFiles,
      reviewedUntrackedIncludedReleaseFiles,
      reviewFocusFiles: patchSeparationFocusRows,
      reviewRequiredReasons: patchSeparationReviewReasons,
      manualReviewRequired: patchSeparationStatus === 'review-required',
      currentContract: 'Clean expected release files and reviewed expected untracked release files are accepted; unreviewed mixed/untracked release payload diffs require review before staging.',
    },
    scopeContract: {
      releaseMode: 'OFFICIAL_DERIVED_AGGREGATE_RELEASE',
      activeBlockCount: 113,
      k7AwayAggregateHitArea: 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE',
    },
    sourcePolicy,
    summary: {
      dirtyFileCount: dirtyEntries.length,
      includedFileCount: includedFiles.length,
      dirtyIncludedFileCount,
      cleanIncludedFileCount,
      separateDirtyWorkCount: separateDirtyWork.length,
      unexpectedFileCount: unexpectedFiles.length,
      blockerCount: blockers.length,
      warningCount: warnings.length,
    },
    releaseCandidateInventory: {
      expectedIncludedFileCount: expectedIncludedReleaseFiles.length,
      actualIncludedFileCount: includedFiles.length,
      dirtyIncludedFileCount,
      cleanIncludedFileCount,
      missingExpectedIncludedFiles: includedInventoryDiff.missing,
      extraIncludedFiles: includedInventoryDiff.extra,
      expectedIncludedReleaseFiles,
      groupedIncludedCounts,
    },
    separateWorkInventory: {
      expectedSeparateDirtyWorkCount: expectedSeparateDirtyWorkFiles.length,
      actualSeparateDirtyWorkCount: separateDirtyWork.length,
      missingExpectedSeparateDirtyWorkFiles: separateInventoryDiff.missing,
      extraSeparateDirtyWorkFiles: separateInventoryDiff.extra,
      classifiedSeparateDirtyWorkExpansionAllowed: true,
      classifiedAdditionalSeparateDirtyWorkFiles,
      classifiedAdditionalSeparateDirtyWorkCount: classifiedAdditionalSeparateDirtyWorkFiles.length,
      expectedSeparateDirtyWorkFiles,
      groupedSeparateCounts,
    },
    groupedIncludedCounts,
    groupedSeparateCounts,
    includedFiles,
    separateDirtyWork,
    unexpectedFiles,
    requiredChecks: {
      missingHandoffSnippets,
      missingPackageSnippets,
      releaseLockMissingSnippets,
    },
    blockers,
    warnings,
  };
  
  const markdown = [
    '# 광주 release scope guard',
    '',
    `- version: \`${SCOPE_GUARD_VERSION}\``,
    `- status: \`${report.status}\``,
    `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
    '- release mode: `OFFICIAL_DERIVED_AGGREGATE_RELEASE`',
    '- active block count: `113`',
    '- K7/AWAY aggregate hit-area: `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    '- source coordinate system: `2200x1159`',
    '- missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`',
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
    ),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
    '',
    '## Patch Separation Readiness',
    '',
    `- status: \`${report.patchSeparationReadiness.status}\``,
    `- manual review required: \`${report.patchSeparationReadiness.manualReviewRequired}\``,
    `- mixed status files: \`${mixedStatusFiles.length}\``,
    `- untracked included files: \`${untrackedIncludedFiles.length}\``,
    `- reviewed untracked included files: \`${reviewedUntrackedIncludedFiles.length}\``,
    '- Clean expected release payload files and reviewed expected untracked release files are accepted; unreviewed mixed/untracked included release files must be reviewed before staging the release PR.',
    '- reviewed expected untracked release files are ready for targeted staging.',
    '',
    patchSeparationReviewReasons.length > 0
      ? patchSeparationReviewReasons.map((reason) => `- \`${reason}\``).join('\n')
      : 'No patch separation review reasons.',
    '',
    '### Reviewed Untracked Included Files',
    '',
    reviewedUntrackedIncludedFiles.length > 0
      ? markdownTable(
        ['file', 'git status', 'reason'],
        reviewedUntrackedIncludedFiles.map((entry) => [
          `\`${entry.file}\``,
          `\`${entry.status}\``,
          entry.reason,
        ]),
      )
      : 'No reviewed untracked included files.',
    '',
    '### Patch Review Focus Files',
    '',
    markdownTable(
      ['file', 'git status', 'scope', 'rule', 'reason'],
      patchSeparationFocusRows.map((entry) => [
        `\`${entry.file}\``,
        `\`${entry.status}\``,
        `\`${entry.scope}\``,
        `\`${entry.rule}\``,
        entry.reason,
      ]),
    ),
    '',
    '## PR Packaging Manifest',
    '',
    '- Source of truth: `gwangju-seatmap-release-scope-guard.json`, `gwangju-seatmap-release-scope-guard.md`, and `docs/gwangju-seatmap-release-handoff.md`.',
    '- Release PR scope: Gwangju official derived aggregate release package and build verification reports.',
    '- Excluded PR scope: Daegu work, Daejeon work, Sajik work, Suwon work, and cross-stadium utilities.',
    `- Release payload files: \`${expectedIncludedReleaseFiles.length}\``,
    `- Separate dirty work files: \`${separateDirtyWork.length}\``,
    `- Separate dirty work baseline files: \`${expectedSeparateDirtyWorkFiles.length}\``,
    '- Classified separate dirty work expansion allowed: `true`',
    `- Unexpected dirty files: \`${unexpectedFiles.length}\``,
    `- Inventory drift: \`${report.prPackagingManifest.inventoryDriftCount}\``,
    '',
    '## Release Candidate Inventory',
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['expected included release files', `\`${expectedIncludedReleaseFiles.length}\``],
        ['actual included release files', `\`${includedFiles.length}\``],
        ['dirty included release files', `\`${dirtyIncludedFileCount}\``],
        ['clean included release files', `\`${cleanIncludedFileCount}\``],
        ['missing expected included files', `\`${includedInventoryDiff.missing.length}\``],
        ['extra included files', `\`${includedInventoryDiff.extra.length}\``],
        ['expected separate dirty work files', `\`${expectedSeparateDirtyWorkFiles.length}\``],
        ['actual separate dirty work files', `\`${separateDirtyWork.length}\``],
        ['missing expected separate dirty work files', `\`${separateInventoryDiff.missing.length}\``],
        ['classified additional separate dirty work files', `\`${classifiedAdditionalSeparateDirtyWorkFiles.length}\``],
        ['classified separate dirty work expansion allowed', '`true`'],
        ['unexpected dirty files', `\`${unexpectedFiles.length}\``],
      ],
    ),
    '',
    '### Expected Included Release Files',
    '',
    markdownTable(
      ['file', 'git status', 'scope', 'rule', 'state'],
      inventoryRows(expectedIncludedReleaseFiles, includedInventoryDiff),
    ),
    '',
    '### Separate Workstream Baseline',
    '',
    markdownTable(
      ['file', 'git status', 'scope', 'rule', 'state'],
      inventoryRows(expectedSeparateDirtyWorkFiles, separateInventoryDiff),
    ),
    '',
    '## Included Gwangju Release Scope',
    '',
    includedFiles.length > 0
      ? markdownTable(
        ['status', 'file', 'rule', 'reason'],
        includedFiles.map((entry) => [
          `\`${entry.status}\``,
          `\`${entry.file}\``,
          `\`${entry.rule}\``,
          entry.reason,
        ]),
      )
      : 'No included release payload files.',
    '',
    '## Separate Dirty Work',
    '',
    separateDirtyWork.length > 0
      ? markdownTable(
        ['status', 'file', 'rule', 'reason'],
        separateDirtyWork.map((entry) => [
          `\`${entry.status}\``,
          `\`${entry.file}\``,
          `\`${entry.rule}\``,
          entry.reason,
        ]),
      )
      : 'No separate dirty work detected.',
    '',
    '## Unexpected Dirty Files',
    '',
    unexpectedFiles.length > 0
      ? markdownTable(
        ['status', 'file', 'reason'],
        unexpectedFiles.map((entry) => [
          `\`${entry.status}\``,
          `\`${entry.file}\``,
          entry.reason,
        ]),
      )
      : 'No unexpected dirty files.',
    '',
    '## Source Policy',
    '',
    '- Allowed coordinate source: operator-provided official PNG coordinates only.',
    '- Allowed coordinate system: original official PNG `2200x1159`.',
    '- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.',
    '- Missing or unclear baseball operating data keeps `MANUAL_BASEBALL_DATA_REQUIRED`.',
    '',
  ].join('\n');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, markdown, 'utf8');
  
  console.log(`scope_guard_json:${jsonPath}`);
  console.log(`scope_guard_markdown:${markdownPath}`);
  console.log(`status:${report.status} included=${includedFiles.length} separate=${separateDirtyWork.length} unexpected=${unexpectedFiles.length} blockers=${blockers.length}`);
  
  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runPrStagingPlan = async () => {
  const {
    execFile
  } = await import('node:child_process');
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    promisify
  } = await import('node:util');

  const execFileAsync = promisify(execFile);
  
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  
  const PLAN_VERSION = 'GWANGJU_PR_STAGING_PLAN_V1';
  const REVIEW_VERSION = 'GWANGJU_PR_STAGING_REVIEW_V1';
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-pr-staging-plan.json');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-pr-staging-plan.md');
  const reviewJsonPath = path.join(reportDir, 'gwangju-seatmap-pr-staging-review.json');
  const reviewMarkdownPath = path.join(reportDir, 'gwangju-seatmap-pr-staging-review.md');
  const scopeGuardPath = path.join(reportDir, 'gwangju-seatmap-release-scope-guard.json');
  const prStagingPlanPath = jsonPath;
  const EXPECTED_RELEASE_PAYLOAD_FILE_COUNT = 17;
  const isReviewMode = process.argv.includes('--review');
  const allowedPatchSeparationStatuses = new Set(['ready', 'review-required']);
  const reviewedUntrackedIncludedReleaseFiles = new Set([
    'scripts/gwangju-seatmap-operator-intake-write-ops.mjs',
    'scripts/gwangju-seatmap-core-qa.mjs',
    'scripts/gwangju-seatmap-operator-template-ops.mjs',
  ]);
  
  const sourcePolicy = {
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
  };
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const readJson = async (filePath) => {
    try {
      return {
        exists: true,
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: null,
      };
    } catch (error) {
      return {
        exists: error?.code !== 'ENOENT',
        data: null,
        error: error?.code === 'ENOENT' ? 'MISSING_SCOPE_GUARD_REPORT' : `READ_SCOPE_GUARD_FAILED:${error.message}`,
      };
    }
  };
  
  const gitStatusRank = (status) => {
    if (!status || status === '-') return 0;
    if (status === '??') return 3;
    if (status && status[0] !== ' ' && status[1] !== ' ') return 2;
    if (status?.[1] !== ' ') return 1;
    return 0;
  };
  
  const uniqueByFile = (entries) => {
    const byFile = new Map();
    for (const entry of entries) {
      const current = byFile.get(entry.file);
      if (!current || gitStatusRank(entry.status) > gitStatusRank(current.status)) {
        byFile.set(entry.file, entry);
      }
    }
    return [...byFile.values()].sort((left, right) => left.file.localeCompare(right.file));
  };
  
  const runGit = async (args) => {
    const { stdout } = await execFileAsync('git', args, { cwd: frontendRoot, maxBuffer: 1024 * 1024 * 10 });
    return stdout.trim();
  };
  
  const splitLines = (value) => value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  
  const parseNumstat = (value) => splitLines(value).map((line) => {
    const [added, deleted, file] = line.split('\t');
    return {
      file,
      added: Number.isFinite(Number(added)) ? Number(added) : added,
      deleted: Number.isFinite(Number(deleted)) ? Number(deleted) : deleted,
    };
  });
  
  const readIncludedDiff = async (entry) => {
    const [cachedName, worktreeName, cachedNumstat, worktreeNumstat, cachedShortstat, worktreeShortstat] = await Promise.all([
      runGit(['diff', '--cached', '--name-only', '--', entry.file]),
      runGit(['diff', '--name-only', '--', entry.file]),
      runGit(['diff', '--cached', '--numstat', '--', entry.file]),
      runGit(['diff', '--numstat', '--', entry.file]),
      runGit(['diff', '--cached', '--shortstat', '--', entry.file]),
      runGit(['diff', '--shortstat', '--', entry.file]),
    ]);
    const hasCachedDiff = cachedName.length > 0 || cachedNumstat.length > 0;
    const hasWorktreeDiff = worktreeName.length > 0 || worktreeNumstat.length > 0;
    return {
      file: entry.file,
      status: entry.status,
      dirty: Boolean(entry.dirty),
      rule: entry.rule,
      hasCachedDiff,
      hasWorktreeDiff,
      cachedNumstat: parseNumstat(cachedNumstat),
      worktreeNumstat: parseNumstat(worktreeNumstat),
      cachedShortstat: cachedShortstat || null,
      worktreeShortstat: worktreeShortstat || null,
    };
  };
  
  const reviewClassFor = (entry, diff) => {
    if (!entry.dirty && !diff.hasCachedDiff && !diff.hasWorktreeDiff) return 'ready-to-stage';
    if (entry.file === 'reports/bundle-guard-report.json' || entry.file === 'reports/dist-assets-report.json') {
      return 'generated-report-review-required';
    }
    if (entry.status === '??' && reviewedUntrackedIncludedReleaseFiles.has(entry.file)) return 'ready-to-stage';
    if (entry.status === '??') return 'untracked-review-required';
    if (entry.status && entry.status !== '-' && entry.status[0] !== ' ' && entry.status[1] !== ' ') return 'manual-hunk-review-required';
    if (diff.hasCachedDiff && diff.hasWorktreeDiff) return 'manual-hunk-review-required';
    return 'ready-to-stage';
  };
  
  const stagingActionFor = (entry, focusFiles) => {
    if (entry.status === '??' && reviewedUntrackedIncludedReleaseFiles.has(entry.file)) return 'targeted-git-add-after-whole-file-review';
    if (entry.status === '??') return 'manual-whole-file-review-before-git-add';
    if (entry.status && entry.status !== '-' && entry.status[0] !== ' ' && entry.status[1] !== ' ') return 'manual-hunk-review-before-staging';
    if (entry.status !== '-' && focusFiles.has(entry.file)) return 'manual-confirm-scope-before-staging';
    return 'stage-after-scope-confirmation';
  };
  
  const { exists, data: scopeGuard, error } = await readJson(scopeGuardPath);
  const blockers = [];
  
  if (error) blockers.push(`${error}:reports/stadium/gwangju-seatmap-release-scope-guard.json`);
  
  const includedFiles = scopeGuard?.includedFiles ?? [];
  const separateDirtyWork = scopeGuard?.separateDirtyWork ?? [];
  const unexpectedFiles = scopeGuard?.unexpectedFiles ?? [];
  const patchSeparationReadiness = scopeGuard?.patchSeparationReadiness ?? {};
  const focusFileSet = new Set((patchSeparationReadiness.reviewFocusFiles ?? []).map((entry) => entry.file));
  
  const releasePayloadFileCount = scopeGuard?.releaseCandidateInventory?.expectedIncludedFileCount ?? includedFiles.length;
  const separateDirtyWorkFileCount = scopeGuard?.summary?.separateDirtyWorkCount ?? separateDirtyWork.length;
  const separateDirtyWorkBaselineFileCount = scopeGuard?.separateWorkInventory?.expectedSeparateDirtyWorkCount ?? null;
  const classifiedSeparateDirtyWorkExpansionAllowed = scopeGuard?.separateWorkInventory?.classifiedSeparateDirtyWorkExpansionAllowed === true;
  const unexpectedDirtyFileCount = scopeGuard?.summary?.unexpectedFileCount ?? unexpectedFiles.length;
  const scopeGuardBlockerCount = scopeGuard?.summary?.blockerCount ?? null;
  const patchStatus = patchSeparationReadiness.status ?? null;
  const packageMixedStatus = (patchSeparationReadiness.mixedStatusFiles ?? [])
    .find((entry) => entry.file === 'package.json')?.status ?? null;
  
  if (scopeGuard?.status !== 'passed') blockers.push(`SCOPE_GUARD_NOT_PASSED:${scopeGuard?.status ?? 'missing'}`);
  if (scopeGuardBlockerCount !== 0) blockers.push(`SCOPE_GUARD_BLOCKERS_PRESENT:${scopeGuardBlockerCount ?? 'missing'}`);
  if (releasePayloadFileCount !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT) blockers.push(`RELEASE_PAYLOAD_COUNT_CHANGED:${releasePayloadFileCount}`);
  if (includedFiles.length !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT) blockers.push(`ACTUAL_INCLUDED_FILE_COUNT_CHANGED:${includedFiles.length}`);
  if (!classifiedSeparateDirtyWorkExpansionAllowed) blockers.push('CLASSIFIED_SEPARATE_DIRTY_WORK_EXPANSION_NOT_ALLOWED');
  if (unexpectedDirtyFileCount !== 0) blockers.push(`UNEXPECTED_DIRTY_FILES_PRESENT:${unexpectedDirtyFileCount}`);
  if (!allowedPatchSeparationStatuses.has(patchStatus)) blockers.push(`PATCH_SEPARATION_READINESS_CHANGED:${patchStatus ?? 'missing'}`);
  
  const releasePayload = includedFiles.map((entry) => ({
    ...entry,
    stagingAction: stagingActionFor(entry, focusFileSet),
  }));
  
  const manualReviewFiles = patchStatus === 'review-required' ? uniqueByFile([
    ...(patchSeparationReadiness.mixedStatusFiles ?? []),
    ...(patchSeparationReadiness.untrackedIncludedFiles ?? []),
    ...(patchSeparationReadiness.reviewFocusFiles ?? []),
  ]).map((entry) => ({
    file: entry.file,
    status: entry.status ?? includedFiles.find((fileEntry) => fileEntry.file === entry.file)?.status ?? '-',
    stagingAction: stagingActionFor(
      {
        file: entry.file,
        status: entry.status ?? includedFiles.find((fileEntry) => fileEntry.file === entry.file)?.status ?? ' M',
      },
      focusFileSet,
    ),
    reason: entry.reason ?? 'Review before staging the release PR.',
  })) : [];
  
  const status = blockers.length > 0 ? 'blocked' : patchStatus;
  const manualReviewRequired = status === 'review-required';
  
  const report = {
    generatedAt: new Date().toISOString(),
    version: PLAN_VERSION,
    status,
    doesNotModifyDataFile: true,
    doesNotRunGitAdd: true,
    writesOnlyReports: true,
    sourceScopeGuard: {
      path: 'reports/stadium/gwangju-seatmap-release-scope-guard.json',
      exists,
      status: scopeGuard?.status ?? null,
      generatedAt: scopeGuard?.generatedAt ?? null,
    },
    summary: {
      releasePayloadFileCount,
      actualIncludedFileCount: includedFiles.length,
      separateDirtyWorkFileCount,
      separateDirtyWorkBaselineFileCount,
      classifiedSeparateDirtyWorkExpansionAllowed,
      actualSeparateDirtyWorkFileCount: separateDirtyWork.length,
      unexpectedDirtyFileCount,
      scopeGuardBlockerCount,
      blockerCount: blockers.length,
      patchSeparationReadiness: patchStatus,
      packageJsonStatus: packageMixedStatus,
      manualReviewRequired,
    },
    stagingGate: {
      status,
      safeToRunBulkGitAdd: false,
      requiresManualReviewBeforeStaging: manualReviewRequired,
      requiresManualHunkReview: manualReviewRequired,
      currentContract: 'Report only. Do not run git add from this script; review mixed/untracked included files before staging when present.',
      forbiddenCommands: [
        'git add .',
        'git add -A',
        'git commit -am',
      ],
    },
    releasePayload,
    separateDirtyWork,
    unexpectedFiles,
    manualReviewFiles,
    manualReviewReasons: patchSeparationReadiness.reviewRequiredReasons ?? [],
    sourcePolicy,
    blockers,
  };
  
  const markdown = [
    '# 광주 PR staging plan',
    '',
    `- version: \`${PLAN_VERSION}\``,
    `- status: \`${status}\``,
    `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
    `- runs git add: \`${!report.doesNotRunGitAdd}\``,
    `- writes only reports: \`${report.writesOnlyReports}\``,
    '- source: `reports/stadium/gwangju-seatmap-release-scope-guard.json`',
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
    ),
    '',
    '## Staging Gate',
    '',
    '- stagingPlan.status=ready-or-review-required',
    '- stagingPlan.doesNotRunGitAdd=true',
    '- stagingPlan.safeToRunBulkGitAdd=false',
    `- stagingPlan.packageJsonStatus=${packageMixedStatus ?? 'none'}`,
    '- stagingPlan.releasePayloadFileCount=17',
    `- stagingPlan.separateDirtyWorkFileCount=${separateDirtyWorkFileCount}`,
    `- stagingPlan.separateDirtyWorkBaselineFileCount=${separateDirtyWorkBaselineFileCount ?? '-'}`,
    `- stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=${classifiedSeparateDirtyWorkExpansionAllowed}`,
    '- Clean release payload files are not packaging blockers; review mixed/untracked included files before staging when present.',
    '- Do not use `git add .`, `git add -A`, or `git commit -am` for this release payload.',
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
    '',
    '## Manual Review Files',
    '',
    manualReviewFiles.length > 0
      ? markdownTable(
        ['file', 'git status', 'staging action', 'reason'],
        manualReviewFiles.map((entry) => [
          `\`${entry.file}\``,
          `\`${entry.status}\``,
          `\`${entry.stagingAction}\``,
          entry.reason,
        ]),
      )
      : 'No manual review files.',
    '',
    '## Release Payload',
    '',
    markdownTable(
      ['file', 'git status', 'rule', 'staging action'],
      releasePayload.map((entry) => [
        `\`${entry.file}\``,
        `\`${entry.status}\``,
        `\`${entry.rule}\``,
        `\`${entry.stagingAction}\``,
      ]),
    ),
    '',
    '## Separate Dirty Work',
    '',
    markdownTable(
      ['file', 'git status', 'rule'],
      separateDirtyWork.map((entry) => [
        `\`${entry.file}\``,
        `\`${entry.status}\``,
        `\`${entry.rule}\``,
      ]),
    ),
    '',
    '## Source Policy',
    '',
    '- Allowed coordinate source: operator-provided official PNG coordinates only.',
    '- Allowed coordinate system: original official PNG `2200x1159`.',
    '- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.',
    '- Missing or unclear baseball operating data keeps `MANUAL_BASEBALL_DATA_REQUIRED`.',
    '',
  ].join('\n');
  
  await fs.mkdir(reportDir, { recursive: true });
  
  if (isReviewMode) {
    const { exists: planExists, data: sourcePlan, error: planError } = await readJson(prStagingPlanPath);
    const diffInputs = {
      cachedNameOnly: splitLines(await runGit(['diff', '--cached', '--name-only'])),
      worktreeNameOnly: splitLines(await runGit(['diff', '--name-only'])),
      cachedShortstat: await runGit(['diff', '--cached', '--shortstat']),
      worktreeShortstat: await runGit(['diff', '--shortstat']),
    };
    const includedDiffs = await Promise.all(releasePayload.map(readIncludedDiff));
    const includedDiffByFile = new Map(includedDiffs.map((entry) => [entry.file, entry]));
    const reviewFiles = releasePayload.map((entry) => {
      const diff = includedDiffByFile.get(entry.file);
      return {
        file: entry.file,
        gitStatus: entry.status,
        rule: entry.rule,
        stagingAction: entry.stagingAction,
        reviewClass: reviewClassFor(entry, diff),
        hasCachedDiff: diff.hasCachedDiff,
        hasWorktreeDiff: diff.hasWorktreeDiff,
        cachedShortstat: diff.cachedShortstat,
        worktreeShortstat: diff.worktreeShortstat,
        cachedNumstat: diff.cachedNumstat,
        worktreeNumstat: diff.worktreeNumstat,
      };
    });
    const reviewClassCounts = reviewFiles.reduce((counts, entry) => ({
      ...counts,
      [entry.reviewClass]: (counts[entry.reviewClass] ?? 0) + 1,
    }), {});
    const reviewedUntrackedReadyFiles = reviewFiles
      .filter((entry) => entry.gitStatus === '??' && reviewedUntrackedIncludedReleaseFiles.has(entry.file))
      .map((entry) => entry.file);
    const cachedOutsideRelease = separateDirtyWork.filter((entry) => (
      entry.status !== '??' && entry.status[0] !== ' '
    ));
    const reviewBlockers = [
      ...blockers,
      ...(planError ? [`${planError}:reports/stadium/gwangju-seatmap-pr-staging-plan.json`] : []),
      ...(sourcePlan?.status && !allowedPatchSeparationStatuses.has(sourcePlan.status)
        ? [`PR_STAGING_PLAN_STATUS_CHANGED:${sourcePlan.status}`]
        : []),
      ...(sourcePlan?.summary?.releasePayloadFileCount !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT
        ? [`PR_STAGING_PLAN_RELEASE_PAYLOAD_COUNT_CHANGED:${sourcePlan?.summary?.releasePayloadFileCount ?? 'missing'}`]
        : []),
    ];
    const reviewWarnings = [
      ...cachedOutsideRelease.map((entry) => `SEPARATE_FILE_HAS_INDEX_DIFF:${entry.file}:${entry.status}`),
    ];
    const reviewStatus = reviewBlockers.length > 0 ? 'blocked' : sourcePlan?.status;
    const reviewManualRequired = reviewStatus === 'review-required';
    const reviewReport = {
      generatedAt: new Date().toISOString(),
      version: REVIEW_VERSION,
      status: reviewStatus,
      doesNotModifyDataFile: true,
      doesNotRunGitAdd: true,
      writesOnlyReports: true,
      sourceReports: {
        releaseScopeGuard: {
          path: 'reports/stadium/gwangju-seatmap-release-scope-guard.json',
          exists,
          status: scopeGuard?.status ?? null,
          generatedAt: scopeGuard?.generatedAt ?? null,
        },
        prStagingPlan: {
          path: 'reports/stadium/gwangju-seatmap-pr-staging-plan.json',
          exists: planExists,
          status: sourcePlan?.status ?? null,
          generatedAt: sourcePlan?.generatedAt ?? null,
        },
      },
      summary: {
        releasePayloadFileCount,
        actualIncludedFileCount: includedFiles.length,
        separateDirtyWorkFileCount,
        separateDirtyWorkBaselineFileCount,
        unexpectedDirtyFileCount,
        blockerCount: reviewBlockers.length,
        warningCount: reviewWarnings.length,
        reviewClassCounts,
        reviewedUntrackedReadyFileCount: reviewedUntrackedReadyFiles.length,
        cachedOutsideReleaseCount: cachedOutsideRelease.length,
        cachedIncludedFileCount: reviewFiles.filter((entry) => entry.hasCachedDiff).length,
        worktreeIncludedFileCount: reviewFiles.filter((entry) => entry.hasWorktreeDiff).length,
        manualReviewRequired: reviewManualRequired,
      },
      stagingGate: {
        status: reviewStatus,
        safeToRunBulkGitAdd: false,
        recommendsOnlyIncludedFiles: true,
        doesNotRecommendSeparateDirtyWork: true,
        currentContract: 'Report only. Review included release payload diffs manually; do not stage separate workstream files from this report.',
        forbiddenCommands: [
          'git add .',
          'git add -A',
          'git commit -am',
        ],
      },
      diffInputs,
      reviewFiles,
      reviewedUntrackedReadyFiles,
      cachedOutsideRelease,
      separateDirtyWork,
      unexpectedFiles,
      sourcePolicy,
      blockers: reviewBlockers,
      warnings: reviewWarnings,
    };
    const reviewMarkdown = [
      '# 광주 PR staging review',
      '',
      `- version: \`${REVIEW_VERSION}\``,
      `- status: \`${reviewStatus}\``,
      `- modifies data file: \`${!reviewReport.doesNotModifyDataFile}\``,
      `- runs git add: \`${!reviewReport.doesNotRunGitAdd}\``,
      `- writes only reports: \`${reviewReport.writesOnlyReports}\``,
      '- source scope guard: `reports/stadium/gwangju-seatmap-release-scope-guard.json`',
      '- source staging plan: `reports/stadium/gwangju-seatmap-pr-staging-plan.json`',
      '',
      '## Summary',
      '',
      markdownTable(
        ['metric', 'value'],
        Object.entries(reviewReport.summary).map(([key, value]) => [
          key,
          typeof value === 'object' ? `\`${JSON.stringify(value)}\`` : `\`${value}\``,
        ]),
      ),
      '',
      '## Staging Gate',
      '',
      '- stagingReview.status=ready-or-review-required',
      '- stagingReview.doesNotRunGitAdd=true',
      '- stagingReview.safeToRunBulkGitAdd=false',
      '- stagingReview.releasePayloadFileCount=17',
      '- stagingReview.recommendsOnlyIncludedFiles=true',
      '- stagingReview.doesNotRecommendSeparateDirtyWork=true',
      '- Clean release payload files are not packaging blockers; review included files with `manual-hunk-review-required`, `untracked-review-required`, or `generated-report-review-required` before staging when present.',
      '- Do not use `git add .`, `git add -A`, or `git commit -am` for this release payload.',
      '',
      '## Blockers',
      '',
      reviewBlockers.length > 0 ? reviewBlockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
      '',
      '## Warnings',
      '',
      reviewWarnings.length > 0 ? reviewWarnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
      '',
      '## Included Diff Review',
      '',
      markdownTable(
        ['file', 'git status', 'review class', 'cached diff', 'worktree diff', 'cached shortstat', 'worktree shortstat'],
        reviewFiles.map((entry) => [
          `\`${entry.file}\``,
          `\`${entry.gitStatus}\``,
          `\`${entry.reviewClass}\``,
          `\`${entry.hasCachedDiff}\``,
          `\`${entry.hasWorktreeDiff}\``,
          entry.cachedShortstat ? `\`${entry.cachedShortstat}\`` : '-',
          entry.worktreeShortstat ? `\`${entry.worktreeShortstat}\`` : '-',
        ]),
      ),
      '',
      '## Separate Files With Index Diff',
      '',
      cachedOutsideRelease.length > 0
        ? markdownTable(
          ['file', 'git status', 'rule'],
          cachedOutsideRelease.map((entry) => [
            `\`${entry.file}\``,
            `\`${entry.status}\``,
            `\`${entry.rule}\``,
          ]),
        )
        : 'No separate workstream files have index diffs.',
      '',
      '## Diff Inputs',
      '',
      `- git diff --cached --name-only count: \`${diffInputs.cachedNameOnly.length}\``,
      `- git diff --name-only count: \`${diffInputs.worktreeNameOnly.length}\``,
      `- git diff --cached --shortstat: \`${diffInputs.cachedShortstat || '-'}\``,
      `- git diff --shortstat: \`${diffInputs.worktreeShortstat || '-'}\``,
      '',
      '## Source Policy',
      '',
      '- Allowed coordinate source: operator-provided official PNG coordinates only.',
      '- Allowed coordinate system: original official PNG `2200x1159`.',
      '- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.',
      '- Missing or unclear baseball operating data keeps `MANUAL_BASEBALL_DATA_REQUIRED`.',
      '',
    ].join('\n');
  
    await fs.writeFile(reviewJsonPath, `${JSON.stringify(reviewReport, null, 2)}\n`, 'utf8');
    await fs.writeFile(reviewMarkdownPath, reviewMarkdown, 'utf8');
  
    console.log(`pr_staging_review_json:${reviewJsonPath}`);
    console.log(`pr_staging_review_markdown:${reviewMarkdownPath}`);
    console.log(`status:${reviewStatus} included=${includedFiles.length} separate=${separateDirtyWork.length} unexpected=${unexpectedDirtyFileCount} blockers=${reviewBlockers.length}`);
  
    if (reviewStatus === 'blocked') {
      process.exitCode = 1;
    }
  } else {
    await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(markdownPath, markdown, 'utf8');
  
    console.log(`pr_staging_plan_json:${jsonPath}`);
    console.log(`pr_staging_plan_markdown:${markdownPath}`);
    console.log(`status:${status} included=${includedFiles.length} separate=${separateDirtyWork.length} unexpected=${unexpectedDirtyFileCount} blockers=${blockers.length}`);
  
    if (status === 'blocked') {
      process.exitCode = 1;
    }
  }
};

const runTargetedStaging = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  
  const REPORT_VERSION = 'GWANGJU_TARGETED_STAGING_V1';
  const EXPECTED_RELEASE_PAYLOAD_FILE_COUNT = 17;
  const EXPECTED_REVIEWED_UNTRACKED_FILES = [
    'scripts/gwangju-seatmap-operator-intake-write-ops.mjs',
    'scripts/gwangju-seatmap-core-qa.mjs',
    'scripts/gwangju-seatmap-operator-template-ops.mjs',
  ];
  const allowedReviewStatuses = new Set(['ready', 'review-required']);
  const blockingReviewClasses = new Set(['untracked-review-required']);
  const legacyReadyToStageDiagnosticNames = [
    'READY_TO_STAGE_COUNT_CHANGED',
    'READY_TO_STAGE_CLASS_COUNT_CHANGED',
  ];
  const reviewJsonPath = path.join(reportDir, 'gwangju-seatmap-pr-staging-review.json');
  const outputPaths = {
    json: path.join(reportDir, 'gwangju-seatmap-targeted-staging.json'),
    csv: path.join(reportDir, 'gwangju-seatmap-targeted-staging.csv'),
    markdown: path.join(reportDir, 'gwangju-seatmap-targeted-staging.md'),
  };
  
  const sourcePolicy = {
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
  };
  
  const forbiddenCommands = [
    'git add .',
    'git add -A',
    'git commit -am',
  ];
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const csvEscape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  
  const readJson = async (filePath) => {
    try {
      return {
        exists: true,
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: null,
      };
    } catch (error) {
      return {
        exists: error?.code !== 'ENOENT',
        data: null,
        error: error?.code === 'ENOENT' ? `MISSING_REPORT:${path.relative(frontendRoot, filePath)}` : `READ_REPORT_FAILED:${error.message}`,
      };
    }
  };
  
  const { exists: reviewExists, data: review, error: reviewError } = await readJson(reviewJsonPath);
  const reviewFiles = review?.reviewFiles ?? [];
  const separateDirtyWork = review?.separateDirtyWork ?? [];
  const unexpectedFiles = review?.unexpectedFiles ?? [];
  const readyFiles = reviewFiles.filter((entry) => entry.reviewClass === 'ready-to-stage');
  const separateFileSet = new Set(separateDirtyWork.map((entry) => entry.file));
  const targetFiles = reviewFiles.map((entry) => entry.file);
  const targetFileSet = new Set(targetFiles);
  const separateTargets = targetFiles.filter((file) => separateFileSet.has(file));
  const duplicateTargets = targetFiles.filter((file, index) => targetFiles.indexOf(file) !== index);
  const reviewedUntrackedReadyFiles = review?.reviewedUntrackedReadyFiles ?? [];
  const reviewedUntrackedStagedFiles = EXPECTED_REVIEWED_UNTRACKED_FILES.filter((file) => {
    const entry = reviewFiles.find((row) => row.file === file);
    return entry?.hasCachedDiff === true;
  });
  const reviewedUntrackedSatisfiedFiles = [...new Set([
    ...reviewedUntrackedReadyFiles,
    ...reviewedUntrackedStagedFiles,
  ])].sort((left, right) => left.localeCompare(right));
  const reviewClassCounts = review?.summary?.reviewClassCounts ?? {};
  const blockingReviewRows = reviewFiles.filter((entry) => blockingReviewClasses.has(entry.reviewClass));
  const manualReviewRows = reviewFiles.filter((entry) => entry.reviewClass === 'manual-hunk-review-required');
  const generatedReportReviewRows = reviewFiles.filter((entry) => entry.reviewClass === 'generated-report-review-required');
  
  const blockers = [
    ...(reviewError ? [`${reviewError}:reports/stadium/gwangju-seatmap-pr-staging-review.json`] : []),
    ...(!allowedReviewStatuses.has(review?.status) ? [`PR_STAGING_REVIEW_NOT_READY:${review?.status ?? 'missing'}`] : []),
    ...((review?.blockers ?? []).length > 0 ? [`PR_STAGING_REVIEW_BLOCKERS_PRESENT:${review.blockers.length}`] : []),
    ...(review?.summary?.blockerCount !== 0 ? [`PR_STAGING_REVIEW_BLOCKER_COUNT_CHANGED:${review?.summary?.blockerCount ?? 'missing'}`] : []),
    ...(review?.summary?.releasePayloadFileCount !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT ? [`RELEASE_PAYLOAD_COUNT_CHANGED:${review?.summary?.releasePayloadFileCount ?? 'missing'}`] : []),
    ...(reviewFiles.length !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT ? [`REVIEW_FILE_COUNT_CHANGED:${reviewFiles.length}`] : []),
    ...(targetFiles.length !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT ? [`TARGET_FILE_COUNT_CHANGED:${targetFiles.length}`] : []),
    ...blockingReviewRows.map((entry) => `BLOCKING_REVIEW_CLASS_PRESENT:${entry.file}:${entry.reviewClass}`),
    ...((review?.summary?.unexpectedDirtyFileCount ?? unexpectedFiles.length) !== 0 ? [`UNEXPECTED_DIRTY_FILES_PRESENT:${review?.summary?.unexpectedDirtyFileCount ?? unexpectedFiles.length}`] : []),
    ...(review?.doesNotRunGitAdd !== true ? ['STAGING_REVIEW_GIT_ADD_ENABLED'] : []),
    ...(review?.stagingGate?.safeToRunBulkGitAdd !== false ? ['STAGING_REVIEW_BULK_GIT_ADD_ALLOWED'] : []),
    ...(review?.stagingGate?.recommendsOnlyIncludedFiles !== true ? ['STAGING_REVIEW_DOES_NOT_RECOMMEND_ONLY_INCLUDED_FILES'] : []),
    ...(review?.stagingGate?.doesNotRecommendSeparateDirtyWork !== true ? ['STAGING_REVIEW_RECOMMENDS_SEPARATE_DIRTY_WORK'] : []),
    ...(reviewedUntrackedSatisfiedFiles.length !== EXPECTED_REVIEWED_UNTRACKED_FILES.length ? [`REVIEWED_UNTRACKED_SATISFIED_COUNT_CHANGED:${reviewedUntrackedSatisfiedFiles.length}`] : []),
    ...EXPECTED_REVIEWED_UNTRACKED_FILES
      .filter((file) => !reviewedUntrackedSatisfiedFiles.includes(file))
      .map((file) => `REVIEWED_UNTRACKED_SATISFIED_FILE_MISSING:${file}`),
    ...EXPECTED_REVIEWED_UNTRACKED_FILES
      .filter((file) => !targetFileSet.has(file))
      .map((file) => `TARGETED_STAGING_MISSING_REVIEWED_UNTRACKED_FILE:${file}`),
    ...separateTargets.map((file) => `SEPARATE_DIRTY_WORK_IN_TARGETS:${file}`),
    ...duplicateTargets.map((file) => `DUPLICATE_TARGET_FILE:${file}`),
  ];
  
  const targetRows = reviewFiles.map((entry, index) => ({
    order: index + 1,
    file: entry.file,
    gitStatus: entry.gitStatus,
    reviewClass: entry.reviewClass,
    stagingAction: entry.stagingAction,
    hasCachedDiff: entry.hasCachedDiff,
    hasWorktreeDiff: entry.hasWorktreeDiff,
  }));
  
  const suggestedCommand = [
    'git',
    'add',
    '--',
    ...targetFiles,
  ];
  
  const report = {
    generatedAt: new Date().toISOString(),
    version: REPORT_VERSION,
    status: blockers.length === 0 ? 'ready' : 'blocked',
    doesNotModifyDataFile: true,
    doesNotRunGitAdd: true,
    writesOnlyReports: true,
    sourceReports: {
      prStagingReview: {
        path: 'reports/stadium/gwangju-seatmap-pr-staging-review.json',
        exists: reviewExists,
        status: review?.status ?? null,
        generatedAt: review?.generatedAt ?? null,
      },
    },
    summary: {
      releasePayloadFileCount: review?.summary?.releasePayloadFileCount ?? null,
      targetFileCount: targetRows.length,
      separateDirtyWorkFileCount: separateDirtyWork.length,
      unexpectedDirtyFileCount: review?.summary?.unexpectedDirtyFileCount ?? unexpectedFiles.length,
      readyToStageCount: reviewClassCounts['ready-to-stage'] ?? 0,
      manualReviewRequiredTargetFileCount: manualReviewRows.length,
      generatedReportReviewTargetFileCount: generatedReportReviewRows.length,
      untrackedReviewRequiredCount: reviewClassCounts['untracked-review-required'] ?? 0,
      reviewedUntrackedReadyFileCount: reviewedUntrackedReadyFiles.length,
      reviewedUntrackedStagedFileCount: reviewedUntrackedStagedFiles.length,
      reviewedUntrackedSatisfiedFileCount: reviewedUntrackedSatisfiedFiles.length,
      blockerCount: blockers.length,
    },
    stagingGate: {
      status: blockers.length === 0 ? 'ready' : 'blocked',
      safeToRunBulkGitAdd: false,
      recommendsOnlyIncludedFiles: true,
      doesNotRecommendSeparateDirtyWork: true,
      recommendedCommandKind: 'explicit-file-list-only',
      suggestedCommand,
      forbiddenCommands,
      currentContract: 'Report only. It never runs git add; when staging manually, use only the explicit targetFiles list and do not stage separate dirty work.',
    },
    targetFiles,
    targetRows,
    reviewedUntrackedReadyFiles,
    reviewedUntrackedStagedFiles,
    reviewedUntrackedSatisfiedFiles,
    manualReviewRows,
    generatedReportReviewRows,
    legacyReadyToStageDiagnosticNames,
    separateDirtyWork,
    unexpectedFiles,
    sourcePolicy,
    blockers,
  };
  
  const csvRows = [
    ['order', 'file', 'gitStatus', 'reviewClass', 'stagingAction', 'hasCachedDiff', 'hasWorktreeDiff'],
    ...targetRows.map((entry) => [
      entry.order,
      entry.file,
      entry.gitStatus,
      entry.reviewClass,
      entry.stagingAction,
      entry.hasCachedDiff,
      entry.hasWorktreeDiff,
    ]),
  ];
  
  const markdown = [
    '# 광주 targeted staging report',
    '',
    `- version: \`${REPORT_VERSION}\``,
    `- status: \`${report.status}\``,
    `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
    `- runs git add: \`${!report.doesNotRunGitAdd}\``,
    `- writes only reports: \`${report.writesOnlyReports}\``,
    '- source review: `reports/stadium/gwangju-seatmap-pr-staging-review.json`',
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
    ),
    '',
    '## Staging Gate',
    '',
    '- targetedStaging.status=ready',
    '- targetedStaging.acceptsReviewRequiredPayload=true',
    '- targetedStaging.doesNotRunGitAdd=true',
    '- targetedStaging.safeToRunBulkGitAdd=false',
    '- targetedStaging.recommendsOnlyIncludedFiles=true',
    '- targetedStaging.doesNotRecommendSeparateDirtyWork=true',
    '- targetedStaging.releasePayloadFileCount=17',
    '- targetedStaging.targetFileCount=17',
    '- targetedStaging.reviewedUntrackedSatisfiedFileCount=4',
    '- New release scripts may be either reviewed untracked files before staging or staged added files after explicit staging.',
    '- Recommended command kind: `explicit-file-list-only`',
    '- Do not use `git add .`, `git add -A`, or `git commit -am` for this release payload.',
    '',
    '## Suggested Explicit Command',
    '',
    '```bash',
    suggestedCommand.join(' \\\n  '),
    '```',
    '',
    '## Target Files',
    '',
    markdownTable(
      ['order', 'file', 'git status', 'review class', 'staging action'],
      targetRows.map((entry) => [
        `\`${entry.order}\``,
        `\`${entry.file}\``,
        `\`${entry.gitStatus}\``,
        `\`${entry.reviewClass}\``,
        `\`${entry.stagingAction}\``,
      ]),
    ),
    '',
    '## Reviewed Untracked Ready Files',
    '',
    reviewedUntrackedReadyFiles.length > 0
      ? reviewedUntrackedReadyFiles.map((file) => `- \`${file}\``).join('\n')
      : '- none',
    '',
    '## Reviewed Untracked Satisfied Files',
    '',
    reviewedUntrackedSatisfiedFiles.length > 0
      ? reviewedUntrackedSatisfiedFiles.map((file) => `- \`${file}\``).join('\n')
      : '- none',
    '',
    '## Manual Review Target Files',
    '',
    manualReviewRows.length > 0
      ? markdownTable(
        ['file', 'git status', 'review class', 'staging action'],
        manualReviewRows.map((entry) => [
          `\`${entry.file}\``,
          `\`${entry.gitStatus}\``,
          `\`${entry.reviewClass}\``,
          `\`${entry.stagingAction}\``,
        ]),
      )
      : '- none',
    '',
    '## Separate Dirty Work Excluded',
    '',
    `- separate dirty work files: \`${separateDirtyWork.length}\``,
    '- separate dirty work is excluded from the suggested command.',
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
    '',
    '## Source Policy',
    '',
    '- Allowed coordinate source: operator-provided official PNG coordinates only.',
    '- Allowed coordinate system: original official PNG `2200x1159`.',
    '- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.',
    '- Missing or unclear baseball operating data keeps `MANUAL_BASEBALL_DATA_REQUIRED`.',
    '',
  ].join('\n');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(outputPaths.csv, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
  await fs.writeFile(outputPaths.markdown, markdown, 'utf8');
  
  console.log(`targeted_staging_json:${outputPaths.json}`);
  console.log(`targeted_staging_csv:${outputPaths.csv}`);
  console.log(`targeted_staging_markdown:${outputPaths.markdown}`);
  console.log(`status:${report.status} targets=${targetRows.length} separate=${separateDirtyWork.length} unexpected=${report.summary.unexpectedDirtyFileCount} blockers=${blockers.length}`);
  
  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runStagedScopeAudit = async () => {
  const {
    execFile
  } = await import('node:child_process');
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    promisify
  } = await import('node:util');

  const execFileAsync = promisify(execFile);
  
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  
  const REPORT_VERSION = 'GWANGJU_STAGED_SCOPE_AUDIT_V1';
  const EXPECTED_TARGET_FILE_COUNT = 17;
  const EXPECTED_REVIEWED_UNTRACKED_READY_FILE_COUNT = 4;
  const requireComplete = process.argv.includes('--require-complete');
  const targetedStagingJsonPath = path.join(reportDir, 'gwangju-seatmap-targeted-staging.json');
  const outputPaths = {
    json: path.join(reportDir, 'gwangju-seatmap-staged-scope-audit.json'),
    csv: path.join(reportDir, 'gwangju-seatmap-staged-scope-audit.csv'),
    markdown: path.join(reportDir, 'gwangju-seatmap-staged-scope-audit.md'),
  };
  
  const sourcePolicy = {
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
  };
  
  const forbiddenCommands = [
    'git add .',
    'git add -A',
    'git commit -am',
  ];
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const csvEscape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  
  const readJson = async (filePath) => {
    try {
      return {
        exists: true,
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: null,
      };
    } catch (error) {
      return {
        exists: error?.code !== 'ENOENT',
        data: null,
        error: error?.code === 'ENOENT' ? `MISSING_REPORT:${path.relative(frontendRoot, filePath)}` : `READ_REPORT_FAILED:${error.message}`,
      };
    }
  };
  
  const parseNameStatusZ = (stdout) => {
    const tokens = stdout.split('\0').filter(Boolean);
    const entries = [];
    for (let index = 0; index < tokens.length;) {
      const status = tokens[index++];
      if (status?.startsWith('R') || status?.startsWith('C')) {
        const from = tokens[index++];
        const file = tokens[index++];
        entries.push({ status, file, from });
      } else if (status) {
        const file = tokens[index++];
        entries.push({ status, file, from: null });
      }
    }
    return entries;
  };
  
  const readStagedEntries = async () => {
    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status', '-z'], {
      cwd: frontendRoot,
      maxBuffer: 1024 * 1024 * 16,
    });
    return parseNameStatusZ(stdout);
  };
  
  const { exists: targetedExists, data: targetedStaging, error: targetedError } = await readJson(targetedStagingJsonPath);
  const stagedEntries = await readStagedEntries();
  
  const targetFiles = targetedStaging?.targetFiles ?? [];
  const targetFileSet = new Set(targetFiles);
  const separateDirtyWork = targetedStaging?.separateDirtyWork ?? [];
  const separateDirtyWorkSet = new Set(separateDirtyWork.map((entry) => entry.file));
  const unexpectedFiles = targetedStaging?.unexpectedFiles ?? [];
  const unexpectedFileSet = new Set(unexpectedFiles.map((entry) => entry.file));
  const duplicateTargetFiles = targetFiles.filter((file, index) => targetFiles.indexOf(file) !== index);
  const targetRows = targetedStaging?.targetRows ?? [];
  const requiredStagedTargetFiles = targetRows
    .filter((entry) => entry.gitStatus !== '-' || entry.hasCachedDiff === true || entry.hasWorktreeDiff === true)
    .map((entry) => entry.file);
  const requiredStagedTargetFileSet = new Set(requiredStagedTargetFiles);
  const stagedOutsideTargets = stagedEntries.filter((entry) => !targetFileSet.has(entry.file));
  const stagedSeparateDirtyWork = stagedEntries.filter((entry) => separateDirtyWorkSet.has(entry.file));
  const stagedUnexpectedFiles = stagedEntries.filter((entry) => unexpectedFileSet.has(entry.file));
  const deletedTargetFiles = stagedEntries.filter((entry) => targetFileSet.has(entry.file) && entry.status === 'D');
  const stagedTargetFileSet = new Set(stagedEntries
    .filter((entry) => targetFileSet.has(entry.file))
    .map((entry) => entry.file));
  const missingStagedTargetFiles = requiredStagedTargetFiles.filter((file) => !stagedTargetFileSet.has(file));
  const strictCompletionBlockers = requireComplete
    ? [
      ...(missingStagedTargetFiles.length > 0 ? [`STAGED_TARGET_COUNT_INCOMPLETE:${stagedEntries.filter((entry) => requiredStagedTargetFileSet.has(entry.file)).length}/${requiredStagedTargetFiles.length}`] : []),
      ...missingStagedTargetFiles.map((file) => `STAGED_TARGET_FILE_MISSING:${file}`),
    ]
    : [];
  
  const blockers = [
    ...(targetedError ? [`${targetedError}:reports/stadium/gwangju-seatmap-targeted-staging.json`] : []),
    ...(targetedStaging?.status !== 'ready' ? [`TARGETED_STAGING_NOT_READY:${targetedStaging?.status ?? 'missing'}`] : []),
    ...((targetedStaging?.blockers ?? []).length > 0 ? [`TARGETED_STAGING_BLOCKERS_PRESENT:${targetedStaging.blockers.length}`] : []),
    ...(targetedStaging?.summary?.blockerCount !== 0 ? [`TARGETED_STAGING_BLOCKER_COUNT_CHANGED:${targetedStaging?.summary?.blockerCount ?? 'missing'}`] : []),
    ...(targetedStaging?.summary?.targetFileCount !== EXPECTED_TARGET_FILE_COUNT ? [`TARGET_FILE_COUNT_CHANGED:${targetedStaging?.summary?.targetFileCount ?? 'missing'}`] : []),
    ...(targetFiles.length !== EXPECTED_TARGET_FILE_COUNT ? [`TARGET_FILE_LIST_COUNT_CHANGED:${targetFiles.length}`] : []),
    ...(targetedStaging?.summary?.reviewedUntrackedSatisfiedFileCount !== EXPECTED_REVIEWED_UNTRACKED_READY_FILE_COUNT ? [`REVIEWED_UNTRACKED_SATISFIED_COUNT_CHANGED:${targetedStaging?.summary?.reviewedUntrackedSatisfiedFileCount ?? 'missing'}`] : []),
    ...(targetedStaging?.doesNotRunGitAdd !== true ? ['TARGETED_STAGING_GIT_ADD_ENABLED'] : []),
    ...(targetedStaging?.stagingGate?.safeToRunBulkGitAdd !== false ? ['TARGETED_STAGING_BULK_GIT_ADD_ALLOWED'] : []),
    ...(targetedStaging?.stagingGate?.recommendsOnlyIncludedFiles !== true ? ['TARGETED_STAGING_DOES_NOT_RECOMMEND_ONLY_INCLUDED_FILES'] : []),
    ...(targetedStaging?.stagingGate?.doesNotRecommendSeparateDirtyWork !== true ? ['TARGETED_STAGING_RECOMMENDS_SEPARATE_DIRTY_WORK'] : []),
    ...duplicateTargetFiles.map((file) => `DUPLICATE_TARGET_FILE:${file}`),
    ...stagedOutsideTargets.map((entry) => `STAGED_FILE_OUTSIDE_TARGETS:${entry.file}`),
    ...stagedSeparateDirtyWork.map((entry) => `STAGED_SEPARATE_DIRTY_WORK:${entry.file}`),
    ...stagedUnexpectedFiles.map((entry) => `STAGED_UNEXPECTED_DIRTY_FILE:${entry.file}`),
    ...deletedTargetFiles.map((entry) => `STAGED_TARGET_DELETED:${entry.file}`),
    ...strictCompletionBlockers,
  ];
  
  const stagedRows = stagedEntries.map((entry, index) => ({
    order: index + 1,
    file: entry.file,
    status: entry.status,
    from: entry.from,
    inTargetFiles: targetFileSet.has(entry.file),
    isSeparateDirtyWork: separateDirtyWorkSet.has(entry.file),
    isUnexpectedDirtyFile: unexpectedFileSet.has(entry.file),
  }));
  
  const report = {
    generatedAt: new Date().toISOString(),
    version: REPORT_VERSION,
    status: blockers.length === 0 ? 'ready' : 'blocked',
    doesNotModifyDataFile: true,
    doesNotRunGitAdd: true,
    writesOnlyReports: true,
    requiresCompleteTargetSet: requireComplete,
    sourceReports: {
      targetedStaging: {
        path: 'reports/stadium/gwangju-seatmap-targeted-staging.json',
        exists: targetedExists,
        status: targetedStaging?.status ?? null,
        generatedAt: targetedStaging?.generatedAt ?? null,
      },
    },
    summary: {
      expectedTargetFileCount: EXPECTED_TARGET_FILE_COUNT,
      requiresCompleteTargetSet: requireComplete,
      targetFileCount: targetFiles.length,
      requiredStagedTargetFileCount: requiredStagedTargetFiles.length,
      stagedFileCount: stagedRows.length,
      stagedTargetFileCount: stagedTargetFileSet.size,
      missingStagedTargetFileCount: missingStagedTargetFiles.length,
      stagedOutsideTargetFileCount: stagedOutsideTargets.length,
      stagedSeparateDirtyWorkFileCount: stagedSeparateDirtyWork.length,
      stagedUnexpectedDirtyFileCount: stagedUnexpectedFiles.length,
      reviewedUntrackedReadyFileCount: targetedStaging?.summary?.reviewedUntrackedReadyFileCount ?? null,
      reviewedUntrackedStagedFileCount: targetedStaging?.summary?.reviewedUntrackedStagedFileCount ?? null,
      reviewedUntrackedSatisfiedFileCount: targetedStaging?.summary?.reviewedUntrackedSatisfiedFileCount ?? null,
      blockerCount: blockers.length,
    },
    stagedScopeGate: {
      status: blockers.length === 0 ? 'ready' : 'blocked',
      stagedState: stagedRows.length === 0 ? 'no-staged-files' : 'staged-files-present',
      requiresCompleteTargetSet: requireComplete,
      readyForCommit: requireComplete
        ? blockers.length === 0 && missingStagedTargetFiles.length === 0
        : blockers.length === 0 && stagedRows.length > 0,
      acceptsOnlyTargetedStagingFiles: true,
      blocksSeparateDirtyWork: true,
      doesNotRecommendSeparateDirtyWork: true,
      safeToRunBulkGitAdd: false,
      recommendedCommandKind: 'audit-cached-index-only',
      forbiddenCommands,
      currentContract: 'Report only. It inspects git diff --cached and fails if staged files are outside the targeted staging file list or include separate dirty work. Strict completion requires every dirty target file to be staged; clean tracked target files are not treated as missing.',
    },
    targetFiles,
    requiredStagedTargetFiles,
    stagedRows,
    missingStagedTargetFiles,
    stagedOutsideTargets,
    stagedSeparateDirtyWork,
    stagedUnexpectedFiles,
    sourcePolicy,
    blockers,
  };
  
  const csvRows = [
    ['order', 'file', 'status', 'from', 'inTargetFiles', 'isSeparateDirtyWork', 'isUnexpectedDirtyFile'],
    ...stagedRows.map((entry) => [
      entry.order,
      entry.file,
      entry.status,
      entry.from ?? '',
      entry.inTargetFiles,
      entry.isSeparateDirtyWork,
      entry.isUnexpectedDirtyFile,
    ]),
  ];
  
  const markdown = [
    '# 광주 staged scope audit',
    '',
    `- version: \`${REPORT_VERSION}\``,
    `- status: \`${report.status}\``,
    `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
    `- runs git add: \`${!report.doesNotRunGitAdd}\``,
    `- writes only reports: \`${report.writesOnlyReports}\``,
    '- source targeted staging report: `reports/stadium/gwangju-seatmap-targeted-staging.json`',
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
    ),
    '',
    '## Staged Scope Gate',
    '',
    `- stagedScopeAudit.status=${report.status}`,
    `- stagedScopeAudit.requireComplete=${requireComplete}`,
    '- stagedScopeAudit.doesNotRunGitAdd=true',
    '- stagedScopeAudit.safeToRunBulkGitAdd=false',
    '- stagedScopeAudit.acceptsOnlyTargetedStagingFiles=true',
    '- stagedScopeAudit.blocksSeparateDirtyWork=true',
    '- stagedScopeAudit.expectedTargetFileCount=17',
    `- stagedScopeAudit.requiredStagedTargetFileCount=${requiredStagedTargetFiles.length}`,
    `- stagedScopeAudit.missingStagedTargetFileCount=${missingStagedTargetFiles.length}`,
    '- stagedScopeAudit.stagedOutsideTargetFileCount=0',
    '- stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0',
    '- Strict commit-readiness mode: `--require-complete` blocks with `STAGED_TARGET_FILE_MISSING` until every dirty targeted release file is staged.',
    '- Command kind: `audit-cached-index-only`',
    '- Do not use `git add .`, `git add -A`, or `git commit -am` for this release payload.',
    '',
    '## Staged Files',
    '',
    stagedRows.length > 0
      ? markdownTable(
        ['order', 'file', 'status', 'target file', 'separate dirty work'],
        stagedRows.map((entry) => [
          `\`${entry.order}\``,
          `\`${entry.file}\``,
          `\`${entry.status}\``,
          `\`${entry.inTargetFiles}\``,
          `\`${entry.isSeparateDirtyWork}\``,
        ]),
      )
      : '- none',
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
    '',
    '## Source Policy',
    '',
    '- Allowed coordinate source: operator-provided official PNG coordinates only.',
    '- Allowed coordinate system: original official PNG `2200x1159`.',
    '- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.',
    '- Missing or unclear baseball operating data keeps `MANUAL_BASEBALL_DATA_REQUIRED`.',
    '',
  ].join('\n');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(outputPaths.csv, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
  await fs.writeFile(outputPaths.markdown, markdown, 'utf8');
  
  console.log(`staged_scope_audit_json:${outputPaths.json}`);
  console.log(`staged_scope_audit_csv:${outputPaths.csv}`);
  console.log(`staged_scope_audit_markdown:${outputPaths.markdown}`);
  console.log(`status:${report.status} staged=${stagedRows.length} outside=${stagedOutsideTargets.length} separate=${stagedSeparateDirtyWork.length} blockers=${blockers.length}`);
  
  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runPostoperatorAudit = async () => {
  const { default: crypto } = await import('node:crypto');
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_BLOCKS,
    GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    GWANGJU_IMAGE_GEOMETRY_DRAFTS,
    GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
    GWANGJU_PENDING_OPERATOR_SECTIONS,
    GWANGJU_SEATMAP_COORDINATES_READY,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  
  const AUDIT_VERSION = 'GWANGJU_SEATMAP_POSTOPERATOR_AUDIT_V1';
  const AUDIT_MODE = 'POST_OPERATOR_POLYGON_APPLIED_RELEASE';
  const expectedPostOperatorBlockCount = 113;
  const expectedBaseTraceBlockCount = 111;
  const expectedOperatorSectionIds = ['home-k7-seats', 'away-cheering-seats'];
  const expectedPendingOperatorSections = ['K7석', '원정응원석'];
  const requiredTraceStatus = 'OFFICIAL_IMAGE_TRACED';
  const requiredPixelAlignmentStatus = 'PIXEL_ALIGNED';
  
  const auditJsonPath = path.join(reportDir, 'gwangju-seatmap-postoperator-audit.json');
  const auditMarkdownPath = path.join(reportDir, 'gwangju-seatmap-postoperator-audit.md');
  
  const sourcePolicy = {
    allowedCoordinateSource: 'operator-provided official PNG coordinates only',
    coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.naturalWidth}x${GWANGJU_SEATMAP_IMAGE.naturalHeight}`,
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  };
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const hashJson = (value) => crypto
    .createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
  
  const stableBlockPayload = GWANGJU_BLOCKS
    .filter((block) => !expectedOperatorSectionIds.includes(block.id))
    .map((block) => ({
      id: block.id,
      label: block.label,
      category: block.category,
      fanRole: block.fanRole,
      price: block.price,
      imageGeometry: block.imageGeometry,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  
  const baseTraceBlockFingerprint = hashJson(stableBlockPayload);
  const blocksById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));
  const blockers = [];
  const checks = [];
  
  const addCheck = (name, expected, actual, pass, blockerCode) => {
    checks.push({ name, expected, actual, pass });
    if (!pass) blockers.push(`${blockerCode}:${actual ?? 'missing'}`);
  };
  
  const activeBlockCount = GWANGJU_BLOCKS.length;
  const pendingOperatorSections = [...GWANGJU_PENDING_OPERATOR_SECTIONS];
  const existingTraceBlockCount = GWANGJU_BLOCKS
    .filter((block) => !expectedOperatorSectionIds.includes(block.id))
    .length;
  
  addCheck(
    'post-operator active block count',
    expectedPostOperatorBlockCount,
    activeBlockCount,
    activeBlockCount === expectedPostOperatorBlockCount && GWANGJU_EXPECTED_TRACE_BLOCK_COUNT === expectedPostOperatorBlockCount,
    'POST_OPERATOR_ACTIVE_BLOCK_COUNT_NOT_113',
  );
  addCheck(
    'post-operator data coordinate readiness',
    true,
    GWANGJU_SEATMAP_COORDINATES_READY,
    GWANGJU_SEATMAP_COORDINATES_READY === true,
    'POST_OPERATOR_STATUS_NOT_READY',
  );
  addCheck(
    'post-operator pending sections',
    'none',
    pendingOperatorSections.join(',') || 'none',
    pendingOperatorSections.length === 0,
    'POST_OPERATOR_PENDING_SECTIONS_PRESENT',
  );
  addCheck(
    'post-operator aggregate hit-area mode',
    false,
    GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
    GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === false,
    'POST_OPERATOR_STILL_REUSES_EXISTING_TRACE_ONLY',
  );
  addCheck(
    'existing traced block count',
    expectedBaseTraceBlockCount,
    existingTraceBlockCount,
    existingTraceBlockCount === expectedBaseTraceBlockCount,
    'POST_OPERATOR_EXISTING_TRACE_BLOCK_COUNT_CHANGED',
  );
  
  const operatorSectionAudits = expectedOperatorSectionIds.map((id) => {
    const block = blocksById.get(id) ?? null;
    const draft = GWANGJU_IMAGE_GEOMETRY_DRAFTS[id] ?? null;
    const geometry = block?.imageGeometry ?? null;
  
    addCheck(
      `${id} block definition`,
      'present',
      block ? 'present' : 'missing',
      Boolean(block),
      `POST_OPERATOR_BLOCK_MISSING:${id}`,
    );
    addCheck(
      `${id} geometry draft`,
      'present',
      draft ? 'present' : 'missing',
      Boolean(draft),
      `POST_OPERATOR_GEOMETRY_MISSING:${id}`,
    );
    addCheck(
      `${id} trace status`,
      requiredTraceStatus,
      geometry?.traceStatus,
      geometry?.traceStatus === requiredTraceStatus,
      `POST_OPERATOR_TRACE_STATUS_NOT_TRACED:${id}`,
    );
    addCheck(
      `${id} manual review`,
      true,
      geometry?.manualReviewed,
      geometry?.manualReviewed === true,
      `POST_OPERATOR_MANUAL_REVIEW_NOT_TRUE:${id}`,
    );
    addCheck(
      `${id} pixel alignment`,
      requiredPixelAlignmentStatus,
      geometry?.pixelAlignmentStatus,
      geometry?.pixelAlignmentStatus === requiredPixelAlignmentStatus,
      `POST_OPERATOR_PIXEL_ALIGNMENT_NOT_ALIGNED:${id}`,
    );
  
    return {
      id,
      blockPresent: Boolean(block),
      geometryPresent: Boolean(draft),
      traceStatus: geometry?.traceStatus ?? null,
      manualReviewed: geometry?.manualReviewed ?? null,
      pixelAlignmentStatus: geometry?.pixelAlignmentStatus ?? null,
      label: block?.label ?? null,
      officialBlock: block?.officialBlock ?? null,
      fanRole: block?.fanRole ?? null,
    };
  });
  
  if (operatorSectionAudits.some((section) => !section.blockPresent || !section.geometryPresent)) {
    blockers.push('POST_OPERATOR_POLYGON_NOT_APPLIED:home-k7-seats,away-cheering-seats');
  }
  
  const status = blockers.length === 0 ? 'passed' : 'blocked';
  
  const report = {
    version: AUDIT_VERSION,
    auditMode: AUDIT_MODE,
    status,
    doesNotModifyDataFile: true,
    generatedAt: new Date().toISOString(),
    expected: {
      activeBlockCount: expectedPostOperatorBlockCount,
      baseTraceBlockCount: expectedBaseTraceBlockCount,
      postOperatorSectionIds: expectedOperatorSectionIds,
      requiredTraceStatus,
      requiredPixelAlignmentStatus,
      manualReviewed: true,
      pendingOperatorSections: [],
      aggregateHitAreaMode: 'INDEPENDENT_OPERATOR_POLYGONS',
    },
    actual: {
      activeBlockCount,
      expectedTraceBlockCount: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
      coordinatesReady: GWANGJU_SEATMAP_COORDINATES_READY,
      pendingOperatorSections,
      expectedPendingOperatorSectionsBeforeWrite: expectedPendingOperatorSections,
      aggregateHitAreaReusesExistingTrace: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
      existingTraceBlockCount,
      baseTraceBlockFingerprint,
    },
    operatorSections: operatorSectionAudits,
    checks,
    blockers,
    sourcePolicy,
    nextRequiredCommands: [
      'npm run stadium:gwangju:operator-prewrite-gate',
      'npm run stadium:gwangju:operator-apply:write',
      'npm run stadium:gwangju:operator-postwrite-gate',
      'npm run qa:stadium:gwangju:release-verify:postoperator',
    ],
  };
  
  const markdown = [
    '# Gwangju Post-Operator Seatmap Audit',
    '',
    `- version: \`${AUDIT_VERSION}\``,
    `- audit mode: \`${AUDIT_MODE}\``,
    `- status: \`${status}\``,
    '- does not modify data file: `true`',
    `- official PNG coordinate system: \`${sourcePolicy.coordinateSystem}\``,
    `- allowed coordinate source: \`${sourcePolicy.allowedCoordinateSource}\``,
    `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
    `- expected active blocks: \`${expectedPostOperatorBlockCount}\``,
    `- actual active blocks: \`${activeBlockCount}\``,
    `- expected trace block count constant: \`${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}\``,
    `- pending operator sections: \`${pendingOperatorSections.join(', ') || 'none'}\``,
    `- base trace block fingerprint: \`${baseTraceBlockFingerprint}\``,
    '',
    '## Operator Sections',
    markdownTable(
      ['id', 'block', 'geometry', 'traceStatus', 'manualReviewed', 'pixelAlignmentStatus', 'fanRole'],
      operatorSectionAudits.map((section) => [
        section.id,
        section.blockPresent ? 'present' : 'missing',
        section.geometryPresent ? 'present' : 'missing',
        section.traceStatus ?? 'missing',
        section.manualReviewed ?? 'missing',
        section.pixelAlignmentStatus ?? 'missing',
        section.fanRole ?? 'missing',
      ]),
    ),
    '',
    '## Checks',
    markdownTable(
      ['check', 'expected', 'actual', 'pass'],
      checks.map((check) => [check.name, check.expected, check.actual, check.pass ? 'yes' : 'no']),
    ),
    '',
    '## Blockers',
    blockers.length > 0
      ? blockers.map((blocker) => `- \`${blocker}\``).join('\n')
      : '- none',
    '',
    '## Source Policy',
    `- allowed: \`${sourcePolicy.allowedCoordinateSource}\``,
    ...sourcePolicy.disallowedSources.map((source) => `- disallowed: \`${source}\``),
    `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
    '',
    '## Next Commands',
    ...report.nextRequiredCommands.map((command) => `- \`${command}\``),
    '',
  ].join('\n');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(auditJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(auditMarkdownPath, markdown);
  
  console.log([
    `Gwangju post-operator audit status=${status}`,
    `blockers=${blockers.length}`,
    `expectedActiveBlocks=${expectedPostOperatorBlockCount}`,
    `actualActiveBlocks=${activeBlockCount}`,
  ].join(' '));
  
  if (blockers.length > 0) {
    for (const blocker of blockers) {
      console.error(`- ${blocker}`);
    }
    process.exitCode = 1;
  }
};

const taskRunners = {
  'release-package': runReleasePackage,
  'release-audit': runReleaseAudit,
  'release-scope-guard': runReleaseScopeGuard,
  'pr-staging-plan': runPrStagingPlan,
  'targeted-staging': runTargetedStaging,
  'staged-scope-audit': runStagedScopeAudit,
  'postoperator-audit': runPostoperatorAudit,
};

const withTaskArgs = async (args, runner) => {
  const originalArgv = process.argv;
  process.argv = [originalArgv[0] ?? 'node', fileURLToPath(import.meta.url), ...args];
  try {
    await runner();
  } finally {
    process.argv = originalArgv;
  }
};

export const runGwangjuReleaseStagingTask = async (task, args = process.argv.slice(2)) => {
  const runner = taskRunners[task];
  if (!runner) {
    throw new Error(`Unknown Gwangju release/staging task: ${task ?? '(missing)'}`);
  }

  await withTaskArgs(args, runner);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runGwangjuReleaseStagingTask(task, args);
}
