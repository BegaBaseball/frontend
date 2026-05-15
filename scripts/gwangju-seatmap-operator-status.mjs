import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_BASE_TRACE_BLOCK_COUNT,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
  GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const STATUS_VERSION = 'GWANGJU_OPERATOR_STATUS_V1';
const REQUIRED_REPORTS = {
  traceReview: 'gwangju-seatmap-trace-review.json',
  operatorTemplate: 'gwangju-seatmap-operator-template.json',
  validation: 'gwangju-seatmap-operator-template-validation.json',
  applyPlan: 'gwangju-seatmap-operator-template-apply-plan.json',
  handoff: 'gwangju-seatmap-operator-handoff.json',
};

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const writeCsv = async (filePath, rows) => {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const readJsonReport = async (reportDir, fileName) => {
  const filePath = path.join(reportDir, fileName);
  try {
    return {
      exists: true,
      filePath,
      relativePath: path.relative(frontendRoot, filePath),
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      filePath,
      relativePath: path.relative(frontendRoot, filePath),
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const boolOrFalse = (value) => value === true;

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const reports = Object.fromEntries(await Promise.all(
  Object.entries(REQUIRED_REPORTS).map(async ([key, fileName]) => [key, await readJsonReport(reportDir, fileName)]),
));

const missingReports = Object.values(reports)
  .filter((report) => !report.exists)
  .map((report) => report.relativePath);

const traceSummary = reports.traceReview.data?.summary ?? {};
const validationSummary = reports.validation.data?.summary ?? {};
const applyPlanSummary = reports.applyPlan.data?.summary ?? {};
const handoffSummary = reports.handoff.data?.summary ?? {};
const validationRowsById = new Map((reports.validation.data?.sections ?? []).map((row) => [row.id, row]));
const applyPlanRowsById = new Map((reports.applyPlan.data?.rows ?? []).map((row) => [row.id, row]));
const handoffItemsById = new Map((reports.handoff.data?.workItems ?? []).map((item) => [item.id, item]));
const templateSectionsById = new Map((reports.operatorTemplate.data?.sections ?? []).map((section) => [section.id, section]));
const validationRows = reports.validation.data?.sections ?? [];
const strictPendingOnlyValidationFailure = validationSummary.status === 'failed'
  && validationSummary.strict === true
  && (validationSummary.templateReasons ?? []).length === 0
  && validationRows.length > 0
  && validationRows
    .filter((row) => (row.reasons ?? []).length > 0)
    .every((row) => (row.reasons ?? []).every((reason) => reason === 'OPERATOR_INPUT_PENDING'));
const operatorRequirements = GWANGJU_OPERATOR_SECTION_REQUIREMENTS
  .filter((section) => section.status === 'PENDING_OPERATOR_INPUT');
const coordinatesAlreadyReady = GWANGJU_PENDING_OPERATOR_SECTIONS.length === 0;

const workItems = operatorRequirements.map((requirement) => {
  const templateSection = templateSectionsById.get(requirement.id) ?? {};
  const validationRow = validationRowsById.get(requirement.id) ?? {};
  const applyPlanRow = applyPlanRowsById.get(requirement.id) ?? {};
  const handoffItem = handoffItemsById.get(requirement.id) ?? {};
  const operatorInput = templateSection.operatorInput ?? {};
  const pending = validationRow.pending !== false || handoffItem.pending !== false;
  const validForPromotion = validationRow.validForPromotion === true || handoffItem.validForPromotion === true;
  const validForDataDiff = applyPlanRow.validForDataDiff === true || handoffItem.validForDataDiff === true;
  const reasons = [
    ...(validationRow.reasons ?? []),
    ...(applyPlanRow.rowBlockers ?? []),
    ...(handoffItem.applyPlanBlockers ?? []),
  ];

  if (pending && !reasons.includes('OPERATOR_INPUT_PENDING')) {
    reasons.push('OPERATOR_INPUT_PENDING');
  }
  if (!validForDataDiff && !reasons.includes('NO_VALID_DATA_DIFF')) {
    reasons.push('NO_VALID_DATA_DIFF');
  }

  return {
    id: requirement.id,
    name: requirement.name,
    category: requirement.category,
    pending,
    validForPromotion,
    validForDataDiff,
    reasons: Array.from(new Set(reasons)),
    warnings: Array.from(new Set([
      ...(validationRow.warnings ?? []),
      ...(handoffItem.validationWarnings ?? []),
    ])),
    requiredFields: requirement.requiredFields,
    officialBlocks: operatorInput.officialBlocks ?? handoffItem.operatorInputSnapshot?.officialBlocks ?? [],
    level: operatorInput.level ?? handoffItem.operatorInputSnapshot?.level ?? null,
    side: operatorInput.side ?? handoffItem.operatorInputSnapshot?.side ?? null,
    fanRole: operatorInput.fanRole ?? handoffItem.operatorInputSnapshot?.fanRole ?? null,
    pointCount: Array.isArray(operatorInput.points)
      ? operatorInput.points.length
      : numberOrZero(handoffItem.operatorInputSnapshot?.pointCount),
    labelX: operatorInput.labelX ?? handoffItem.operatorInputSnapshot?.labelX ?? null,
    labelY: operatorInput.labelY ?? handoffItem.operatorInputSnapshot?.labelY ?? null,
    reviewer: operatorInput.reviewer ?? handoffItem.operatorInputSnapshot?.reviewer ?? null,
    reviewedAt: operatorInput.reviewedAt ?? handoffItem.operatorInputSnapshot?.reviewedAt ?? null,
  };
});

const derivedRangeRows = GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.map((range) => ({
  id: range.id,
  label: range.label,
  displayBlocks: range.displayBlocks,
  officialBlocks: range.officialBlocks,
  blockIds: range.blockIds,
  filterGroupId: range.filterGroupId,
  fanRoles: range.fanRoles ?? [],
  aggregateHitArea: range.aggregateHitArea,
  activeHitArea: 'EXISTING_NUMBERED_BLOCKS_ONLY',
  operatorPolygonStatus: range.operatorPolygonStatus,
  sourceRequirementIds: range.sourceRequirementIds,
}));
const overlappingDerivedRangePairs = [];
for (let leftIndex = 0; leftIndex < derivedRangeRows.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < derivedRangeRows.length; rightIndex += 1) {
    const left = derivedRangeRows[leftIndex];
    const right = derivedRangeRows[rightIndex];
    const sharedOfficialBlocks = left.officialBlocks
      .filter((officialBlock) => right.officialBlocks.includes(officialBlock));

    if (sharedOfficialBlocks.length > 0) {
      overlappingDerivedRangePairs.push({
        left: left.id,
        right: right.id,
        sharedOfficialBlocks,
      });
    }
  }
}
const promotionModelWarnings = overlappingDerivedRangePairs.map((pair) => (
  `DERIVED_RANGE_OFFICIAL_BLOCK_OVERLAP_IS_FILTER_ONLY:${pair.left}:${pair.right}:${pair.sharedOfficialBlocks.join(' ')}`
));

const activeTraceBlocks = numberOrZero(traceSummary.totalBlocks ?? handoffSummary.activeTraceBlocks);
const officialImageTracedBlocks = numberOrZero(
  traceSummary.officialImageTracedBlocks ?? handoffSummary.officialImageTracedBlocks,
);
const pixelAlignedBlocks = numberOrZero(traceSummary.pixelAlignedBlocks ?? handoffSummary.pixelAlignedBlocks);
const overlapWarnings = numberOrZero(traceSummary.overlapWarningCount ?? handoffSummary.overlapWarnings);
const operatorSections = operatorRequirements.length;
const pendingSections = workItems.filter((item) => item.pending).length;
const validDataDiffSections = workItems.filter((item) => item.validForDataDiff).length;
const expectedTraceBlocks = GWANGJU_EXPECTED_TRACE_BLOCK_COUNT;

const blockers = [];
missingReports.forEach((reportPath) => blockers.push(`MISSING_REPORT:${reportPath}`));
if (reports.traceReview.exists && activeTraceBlocks !== expectedTraceBlocks) {
  blockers.push(`TRACE_ACTIVE_BLOCK_COUNT_CHANGED:${activeTraceBlocks}`);
}
if (reports.traceReview.exists && officialImageTracedBlocks !== expectedTraceBlocks) {
  blockers.push(`TRACE_OFFICIAL_IMAGE_TRACED_INCOMPLETE:${officialImageTracedBlocks}`);
}
if (reports.traceReview.exists && pixelAlignedBlocks !== expectedTraceBlocks) {
  blockers.push(`TRACE_PIXEL_ALIGNMENT_INCOMPLETE:${pixelAlignedBlocks}`);
}
if (reports.traceReview.exists && overlapWarnings > 0) {
  blockers.push(`TRACE_OVERLAP_WARNINGS_PRESENT:${overlapWarnings}`);
}
if (reports.validation.exists && validationSummary.status === 'failed' && !strictPendingOnlyValidationFailure) {
  blockers.push('VALIDATION_STATUS_FAILED');
}
if (reports.validation.exists && numberOrZero(validationSummary.invalidSections) > 0 && !strictPendingOnlyValidationFailure) {
  blockers.push(`VALIDATION_INVALID_SECTIONS:${validationSummary.invalidSections}`);
}
if (reports.applyPlan.exists && applyPlanSummary.status === 'blocked') {
  blockers.push('APPLY_PLAN_STATUS_BLOCKED');
}
(applyPlanSummary.blockers ?? []).forEach((blocker) => blockers.push(`APPLY_PLAN_BLOCKER:${blocker}`));
if (reports.handoff.exists && handoffSummary.status === 'blocked') {
  blockers.push('HANDOFF_STATUS_BLOCKED');
}

const pendingReasons = [];
if (!coordinatesAlreadyReady) {
  if (reports.validation.exists && boolOrFalse(validationSummary.strict) !== true) {
    pendingReasons.push('STRICT_VALIDATION_NOT_RUN');
  }
  if (reports.validation.exists && validationSummary.status !== 'ready') {
    pendingReasons.push(`STRICT_VALIDATION_NOT_READY:${validationSummary.status ?? 'missing'}`);
  }
  if (strictPendingOnlyValidationFailure) {
    pendingReasons.push('STRICT_VALIDATION_PENDING_OPERATOR_INPUT');
  }
  if (pendingSections > 0) pendingReasons.push(`OPERATOR_INPUT_PENDING:${pendingSections}`);
  if (validDataDiffSections === 0) pendingReasons.push('NO_VALID_DATA_DIFF_SECTIONS');
  if (reports.handoff.exists && handoffSummary.status !== 'ready') {
    pendingReasons.push(`HANDOFF_NOT_READY:${handoffSummary.status ?? 'missing'}`);
  }
  workItems
    .filter((item) => item.pending)
    .forEach((item) => pendingReasons.push(`${item.id}:OPERATOR_INPUT_PENDING`));
}

const status = blockers.length > 0 ? 'blocked' : pendingReasons.length > 0 ? 'pending' : 'ready';

const summary = {
  statusVersion: STATUS_VERSION,
  status,
  doesNotModifyDataFile: true,
  coordinatesAlreadyReady,
  asset: {
    imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
    imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
    imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
  },
  baseTraceBlocks: GWANGJU_BASE_TRACE_BLOCK_COUNT,
  activeTraceBlocks,
  expectedTraceBlocks,
  derivedRangeCount: derivedRangeRows.length,
  derivedRangeDisplayBlocks: Object.fromEntries(derivedRangeRows.map((range) => [range.id, range.displayBlocks])),
  operatorBlockRangeReusesExistingTrace: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  promotionModelWarnings,
  officialImageTracedBlocks,
  pixelAlignedBlocks,
  overlapWarnings,
  operatorSections,
  pendingSections,
  validPromotionSections: workItems.filter((item) => item.validForPromotion).length,
  validDataDiffSections,
  validationStrict: validationSummary.strict === true,
  validationStatus: validationSummary.status ?? '',
  applyPlanStatus: applyPlanSummary.status ?? '',
  handoffStatus: handoffSummary.status ?? '',
  missingReports,
  blockers,
  pendingReasons: Array.from(new Set(pendingReasons)),
};

const statusReport = {
  generatedAt: new Date().toISOString(),
  summary,
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
  reports: Object.fromEntries(Object.entries(reports).map(([key, report]) => [
    key,
    {
      path: report.relativePath,
      exists: report.exists,
      error: report.error,
    },
  ])),
  nextCommands: {
    regenerateHandoff: 'npm run stadium:gwangju:operator-handoff',
    strictValidation: 'npm run stadium:gwangju:operator-template:validate:strict',
    requireReadyApplyPlan: 'npm run stadium:gwangju:operator-template:apply-plan:require-ready',
    writeSmoke: 'npm run stadium:gwangju:operator-write-smoke',
    writeGuard: 'npm run stadium:gwangju:operator-write-guard',
    requireReadyWriteGuard: 'npm run stadium:gwangju:operator-write-guard:require-ready',
    dryRunApply: 'npm run stadium:gwangju:operator-apply',
    writeApply: 'npm run stadium:gwangju:operator-apply:write',
    postWriteGate: 'npm run stadium:gwangju:operator-postwrite-gate',
    postDataDiffGate: [
      'npm run test:stadium:seatmaps',
      'npm run qa:stadium:gwangju:trace-review',
      'npm run build',
    ],
  },
  pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
  derivedRanges: derivedRangeRows,
  workItems,
};

const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-status.json');
const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-status.csv');
const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-status.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(statusReport, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'name',
    'category',
    'pending',
    'validForPromotion',
    'validForDataDiff',
    'reasons',
    'warnings',
    'requiredFields',
    'pointCount',
    'labelX',
    'labelY',
    'reviewer',
    'reviewedAt',
  ],
  ...workItems.map((item) => [
    item.id,
    item.name,
    item.category,
    item.pending,
    item.validForPromotion,
    item.validForDataDiff,
    item.reasons,
    item.warnings,
    item.requiredFields,
    item.pointCount,
    item.labelX,
    item.labelY,
    item.reviewer,
    item.reviewedAt,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# 광주 K7/원정응원석 operator status',
  '',
  `- status version: \`${STATUS_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- modifies data file: \`${!summary.doesNotModifyDataFile}\``,
  `- coordinates already ready: \`${summary.coordinatesAlreadyReady}\``,
  `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
  `- base traced blocks: ${summary.baseTraceBlocks}`,
  `- active traced blocks: ${summary.activeTraceBlocks}`,
  `- expected traced blocks: ${summary.expectedTraceBlocks}`,
  `- derived range count: ${summary.derivedRangeCount}`,
  `- K7/AWAY aggregate hit-area mode: \`${GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE ? 'REUSES_EXISTING_TRACE_ONLY' : 'INDEPENDENT_POLYGON'}\``,
  `- official traced blocks: ${summary.officialImageTracedBlocks}`,
  `- pixel aligned blocks: ${summary.pixelAlignedBlocks}`,
  `- overlap warnings: ${summary.overlapWarnings}`,
  `- operator sections: ${summary.operatorSections}`,
  `- pending sections: ${summary.pendingSections}`,
  `- valid data diff sections: ${summary.validDataDiffSections}`,
  `- strict validation: \`${summary.validationStrict}\``,
  `- validation status: \`${summary.validationStatus || '-'}\``,
  `- apply plan status: \`${summary.applyPlanStatus || '-'}\``,
  `- handoff status: \`${summary.handoffStatus || '-'}\``,
  '',
  '## Source Policy',
  '',
  '- 허용: operator-provided official PNG coordinates only',
  '- 좌표계: official PNG 2200x1159',
  '- 금지: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images',
  '- 누락 야구 운영 데이터: `MANUAL_BASEBALL_DATA_REQUIRED`',
  '',
  '## Derived Ranges',
  '',
  'K7석/원정응원석/홈 응원석은 운영자 polygon 승격 전까지 active block 111개를 유지하고 기존 번호 블럭 hit-area만 재사용합니다.',
  '서로 겹치는 derived range는 필터/배지 모델에서만 허용되며, 같은 official block을 공유하는 독립 polygon 승격 입력은 validation에서 차단합니다.',
  '',
  markdownTable(
    ['range', 'display blocks', 'filter', 'active hit-area', 'polygon status', 'source requirements'],
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
  '## Promotion Model Warnings',
  '',
  summary.promotionModelWarnings.length > 0
    ? summary.promotionModelWarnings.map((warning) => `- \`${warning}\``).join('\n')
    : 'No promotion model warnings.',
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
  '',
  '## Pending Reasons',
  '',
  summary.pendingReasons.length > 0
    ? summary.pendingReasons.map((reason) => `- \`${reason}\``).join('\n')
    : 'No pending reasons.',
  '',
  '## Work Items',
  '',
  markdownTable(
    ['section', 'pending', 'valid promotion', 'valid data diff', 'reasons', 'point count', 'reviewer'],
    workItems.map((item) => [
      `\`${item.name}\``,
      `\`${item.pending}\``,
      `\`${item.validForPromotion}\``,
      `\`${item.validForDataDiff}\``,
      item.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
      item.pointCount,
      item.reviewer || '-',
    ]),
  ),
  '',
  '## Commands',
  '',
  '- `npm run stadium:gwangju:operator-handoff`',
  '- `npm run stadium:gwangju:operator-status`',
  '- `npm run stadium:gwangju:operator-template:validate:strict`',
  '- `npm run stadium:gwangju:operator-template:apply-plan:require-ready`',
  '- `npm run test:stadium:seatmaps`',
  '- `npm run stadium:gwangju:operator-apply`',
  '- `npm run stadium:gwangju:operator-apply:write`',
  '- `npm run stadium:gwangju:operator-postwrite-gate`',
  '- `npm run qa:stadium:gwangju:trace-review`',
  '- `npm run build`',
  '',
].join('\n'), 'utf8');

console.log(`operator_status_json:${jsonPath}`);
console.log(`operator_status_csv:${csvPath}`);
console.log(`operator_status_markdown:${markdownPath}`);
console.log(`status:${summary.status} pending=${summary.pendingSections} validDataDiff=${summary.validDataDiffSections} blockers=${summary.blockers.length}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
