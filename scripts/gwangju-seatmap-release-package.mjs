import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_BASE_TRACE_BLOCK_COUNT,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
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

const RELEASE_PACKAGE_VERSION = 'GWANGJU_DERIVED_RANGE_RELEASE_PACKAGE_V1';
const expectedPendingOperatorSections = ['K7석', '원정응원석'];
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
if (GWANGJU_EXPECTED_TRACE_BLOCK_COUNT !== 111) {
  blockers.push(`EXPECTED_TRACE_BLOCK_COUNT_CHANGED:${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}`);
}
if (!GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE) {
  blockers.push('OPERATOR_BLOCK_RANGE_NO_LONGER_REUSES_EXISTING_TRACE');
}
if (!sameSet(GWANGJU_PENDING_OPERATOR_SECTIONS, expectedPendingOperatorSections)) {
  blockers.push(`PENDING_OPERATOR_SECTIONS_CHANGED:${GWANGJU_PENDING_OPERATOR_SECTIONS.join(',')}`);
}

if (traceReview) {
  if (traceSummary.totalBlocks !== 111) blockers.push(`TRACE_TOTAL_BLOCKS_CHANGED:${traceSummary.totalBlocks}`);
  if (traceSummary.baseTraceBlocks !== 111) blockers.push(`TRACE_BASE_BLOCKS_CHANGED:${traceSummary.baseTraceBlocks}`);
  if (traceSummary.officialImageTracedBlocks !== 111) blockers.push(`TRACE_OFFICIAL_IMAGE_TRACED_CHANGED:${traceSummary.officialImageTracedBlocks}`);
  if (traceSummary.directOfficialTraceBlocks !== 111) blockers.push(`TRACE_DIRECT_OFFICIAL_TRACE_CHANGED:${traceSummary.directOfficialTraceBlocks}`);
  if (traceSummary.manualReviewedBlocks !== 111) blockers.push(`TRACE_MANUAL_REVIEWED_CHANGED:${traceSummary.manualReviewedBlocks}`);
  if (traceSummary.pixelAlignedBlocks !== 111) blockers.push(`TRACE_PIXEL_ALIGNED_CHANGED:${traceSummary.pixelAlignedBlocks}`);
  if (traceSummary.overlapWarningCount !== 0) blockers.push(`TRACE_OVERLAP_WARNINGS_PRESENT:${traceSummary.overlapWarningCount}`);
  if (traceSummary.aggregateHitAreaMode !== 'REUSES_EXISTING_TRACE_ONLY') {
    blockers.push(`TRACE_AGGREGATE_HIT_AREA_MODE_CHANGED:${traceSummary.aggregateHitAreaMode}`);
  }
}

if (operatorStatus) {
  if (operatorSummary.status !== 'pending') blockers.push(`OPERATOR_STATUS_NOT_PENDING:${operatorSummary.status}`);
  if (operatorSummary.pendingSections !== 2) blockers.push(`OPERATOR_PENDING_SECTION_COUNT_CHANGED:${operatorSummary.pendingSections}`);
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
  if (range.aggregateHitArea !== 'REUSES_EXISTING_TRACE_ONLY') {
    blockers.push(`DERIVED_RANGE_AGGREGATE_HIT_AREA_CHANGED:${range.id}:${range.aggregateHitArea}`);
  }
  if (range.operatorPolygonStatus !== 'PENDING_OPERATOR_INPUT') {
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
  releaseMode: 'DERIVED_RANGE_FILTER_AND_BADGE_ONLY',
  activeBlockContract: {
    baseTraceBlocks: GWANGJU_BASE_TRACE_BLOCK_COUNT,
    expectedTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    aggregateHitArea: 'REUSES_EXISTING_TRACE_ONLY',
    pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
    noPrewrite113Gate: true,
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
  `- aggregate hit-area: \`REUSES_EXISTING_TRACE_ONLY\``,
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
