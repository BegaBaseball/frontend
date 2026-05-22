import { spawn } from 'node:child_process';
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

const GATE_VERSION = 'GWANGJU_SEATMAP_RELEASE_GATE_V1';
const gateJsonPath = path.join(reportDir, 'gwangju-seatmap-release-gate.json');
const gateMarkdownPath = path.join(reportDir, 'gwangju-seatmap-release-gate.md');
const releasePackagePath = path.join(reportDir, 'gwangju-seatmap-release-package.json');
const operatorStatusPath = path.join(reportDir, 'gwangju-seatmap-operator-status.json');
const traceReviewPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
const runtimeLayerAuditPath = path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.json');
const browserQaPath = path.join(outputRoot, 'stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.json');

const commandPlan = [
  {
    label: 'operator status',
    command: 'npm',
    args: ['run', 'stadium:gwangju:operator-status'],
  },
  {
    label: 'seatmap tests',
    command: 'npm',
    args: ['run', 'test:stadium:seatmaps'],
  },
  {
    label: 'trace review QA',
    command: 'npm',
    args: ['run', 'qa:stadium:gwangju:trace-review'],
  },
  {
    label: 'release package',
    command: 'npm',
    args: ['run', 'stadium:gwangju:release-package'],
  },
  {
    label: 'build',
    command: 'npm',
    args: ['run', 'build'],
    env: {
      VITE_SITE_URL: process.env.VITE_SITE_URL || 'http://localhost:5176',
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '/api',
    },
  },
];

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

const runCommand = (step) => new Promise((resolve) => {
  const startedAt = Date.now();
  console.log(`[gwangju-release-gate] ${step.label}: ${step.command} ${step.args.join(' ')}`);

  const child = spawn(step.command, step.args, {
    cwd: frontendRoot,
    env: { ...process.env, ...step.env },
    stdio: 'inherit',
    shell: false,
  });

  child.on('error', (error) => {
    resolve({
      label: step.label,
      command: [step.command, ...step.args].join(' '),
      status: 'failed',
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  child.on('close', (code, signal) => {
    const status = code === 0 ? 'passed' : 'failed';
    resolve({
      label: step.label,
      command: [step.command, ...step.args].join(' '),
      status,
      durationMs: Date.now() - startedAt,
      exitCode: code,
      signal,
      error: status === 'passed' ? null : `${step.label} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`,
    });
  });
});

const stepResults = [];
for (const step of commandPlan) {
  const result = await runCommand(step);
  stepResults.push(result);
  if (result.status !== 'passed') break;
}

const releasePackage = await readJsonIfExists(releasePackagePath);
const operatorStatus = await readJsonIfExists(operatorStatusPath);
const traceReview = await readJsonIfExists(traceReviewPath);
const runtimeLayerAudit = await readJsonIfExists(runtimeLayerAuditPath);
const browserQa = await readJsonIfExists(browserQaPath);

const blockers = stepResults
  .filter((result) => result.status !== 'passed')
  .map((result) => `STEP_FAILED:${result.label}:${result.error}`);

if (stepResults.length === commandPlan.length && blockers.length === 0) {
  if (releasePackage?.status !== 'ready') {
    blockers.push(`RELEASE_PACKAGE_NOT_READY:${releasePackage?.status ?? 'missing'}`);
  }
  if (releasePackage?.activeBlockContract?.expectedTraceBlocks !== 111) {
    blockers.push(`RELEASE_PACKAGE_ACTIVE_BLOCKS_CHANGED:${releasePackage?.activeBlockContract?.expectedTraceBlocks ?? 'missing'}`);
  }
  if (releasePackage?.activeBlockContract?.aggregateHitArea !== 'REUSES_EXISTING_TRACE_ONLY') {
    blockers.push(`RELEASE_PACKAGE_AGGREGATE_HIT_AREA_CHANGED:${releasePackage?.activeBlockContract?.aggregateHitArea ?? 'missing'}`);
  }
  if (operatorStatus?.summary?.status !== 'pending') {
    blockers.push(`OPERATOR_STATUS_NOT_PENDING:${operatorStatus?.summary?.status ?? 'missing'}`);
  }
  if (traceReview?.summary?.totalBlocks !== 111) {
    blockers.push(`TRACE_REVIEW_ACTIVE_BLOCKS_CHANGED:${traceReview?.summary?.totalBlocks ?? 'missing'}`);
  }
  if (traceReview?.summary?.componentCoverageWarningCount !== 0) {
    blockers.push(`TRACE_REVIEW_OP_COMPONENT_COVERAGE_WARNINGS_PRESENT:${traceReview?.summary?.componentCoverageWarningCount ?? 'missing'}`);
  }
  if (browserQa?.status !== 'passed') {
    blockers.push(`BROWSER_QA_NOT_PASSED:${browserQa?.status ?? 'missing'}`);
  }
  if (runtimeLayerAudit?.status !== 'passed') {
    blockers.push(`RUNTIME_LAYER_AUDIT_NOT_PASSED:${runtimeLayerAudit?.status ?? 'missing'}`);
  }
  if (runtimeLayerAudit?.summary?.pathMismatchCount !== 0) {
    blockers.push(`RUNTIME_LAYER_PATH_MISMATCHES_PRESENT:${runtimeLayerAudit?.summary?.pathMismatchCount ?? 'missing'}`);
  }
}

const status = blockers.length === 0 ? 'passed' : 'failed';
const passedStepCount = stepResults.filter((result) => result.status === 'passed').length;
const releaseAcceptance = {
  requiredStatus: 'passed',
  requiredBlockers: 0,
  requiredCompletedSteps: commandPlan.length,
  requiredReleasePackageStatus: 'ready',
  requiredOperatorStatus: 'pending',
  requiredBrowserQaStatus: 'passed',
  requiredRuntimeLayerAuditStatus: 'passed',
  requiredActiveTraceBlocks: 111,
};
const report = {
  generatedAt: new Date().toISOString(),
  version: GATE_VERSION,
  status,
  doesNotModifyDataFile: true,
  releaseAcceptance,
  asset: {
    imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
    imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
    imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
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
  activeBlockContract: {
    expectedTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    aggregateHitArea: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE
      ? 'REUSES_EXISTING_TRACE_ONLY'
      : 'INDEPENDENT_POLYGON',
    pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
    noPrewrite113Gate: true,
  },
  commandPlan: commandPlan.map((step) => ({
    label: step.label,
    command: [step.command, ...step.args].join(' '),
  })),
  steps: stepResults,
  finalChecks: {
    releasePackageStatus: releasePackage?.status ?? null,
    operatorStatus: operatorStatus?.summary?.status ?? null,
    activeTraceBlocks: traceReview?.summary?.totalBlocks ?? null,
    browserQaStatus: browserQa?.status ?? null,
    runtimeLayerAuditStatus: runtimeLayerAudit?.status ?? null,
    runtimeLayerPathMismatches: runtimeLayerAudit?.summary?.pathMismatchCount ?? null,
    blockers: blockers.length,
    completedSteps: passedStepCount,
    totalSteps: commandPlan.length,
  },
  blockers,
};

const markdown = [
  '# 광주 K7/AWAY release gate',
  '',
  `- version: \`${GATE_VERSION}\``,
  `- status: \`${status}\``,
  `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
  `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
  `- active block contract: \`${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}\``,
  `- aggregate hit-area: \`${report.activeBlockContract.aggregateHitArea}\``,
  `- operator sections: \`${GWANGJU_PENDING_OPERATOR_SECTIONS.join(', ')}\``,
  `- release package: \`${report.finalChecks.releasePackageStatus ?? '-'}\``,
  `- browser QA: \`${report.finalChecks.browserQaStatus ?? '-'}\``,
  `- runtime layer audit: \`${report.finalChecks.runtimeLayerAuditStatus ?? '-'}\``,
  `- completed steps: \`${report.finalChecks.completedSteps}/${report.finalChecks.totalSteps}\``,
  '',
  '## Acceptance',
  '',
  markdownTable(
    ['check', 'expected', 'actual'],
    [
      ['status', `\`${releaseAcceptance.requiredStatus}\``, `\`${report.status}\``],
      ['blockers', `\`${releaseAcceptance.requiredBlockers}\``, `\`${report.finalChecks.blockers}\``],
      ['completed steps', `\`${releaseAcceptance.requiredCompletedSteps}/${commandPlan.length}\``, `\`${report.finalChecks.completedSteps}/${report.finalChecks.totalSteps}\``],
      ['release package', `\`${releaseAcceptance.requiredReleasePackageStatus}\``, `\`${report.finalChecks.releasePackageStatus ?? '-'}\``],
      ['operator status', `\`${releaseAcceptance.requiredOperatorStatus}\``, `\`${report.finalChecks.operatorStatus ?? '-'}\``],
      ['browser QA', `\`${releaseAcceptance.requiredBrowserQaStatus}\``, `\`${report.finalChecks.browserQaStatus ?? '-'}\``],
      ['runtime layer audit', `\`${releaseAcceptance.requiredRuntimeLayerAuditStatus}\``, `\`${report.finalChecks.runtimeLayerAuditStatus ?? '-'}\``],
      ['runtime path mismatches', '`0`', `\`${report.finalChecks.runtimeLayerPathMismatches ?? '-'}\``],
      ['active trace blocks', `\`${releaseAcceptance.requiredActiveTraceBlocks}\``, `\`${report.finalChecks.activeTraceBlocks ?? '-'}\``],
    ],
  ),
  '',
  '## Steps',
  '',
  markdownTable(
    ['step', 'command', 'status', 'duration ms', 'error'],
    stepResults.map((result) => [
      result.label,
      `\`${result.command}\``,
      `\`${result.status}\``,
      result.durationMs,
      result.error ?? '-',
    ]),
  ),
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
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
await fs.writeFile(gateJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(gateMarkdownPath, markdown, 'utf8');

console.log(`release_gate_json:${gateJsonPath}`);
console.log(`release_gate_markdown:${gateMarkdownPath}`);
console.log(`status:${status} blockers=${blockers.length} steps=${stepResults.length}/${commandPlan.length}`);

if (status !== 'passed') {
  process.exitCode = 1;
}
