import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const INTAKE_VERSION = 'DAEGU_OFF_SEAT_RETRACE_INTAKE_V1';
const INPUT_SPECS = [
  {
    batchId: 'BATCH_1_P0',
    batchOrder: 1,
    packageVersion: 'DAEGU_P0_OPERATOR_PACKAGE_V1',
    input: 'reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json',
    expectedRows: 1,
  },
  {
    batchId: 'BATCH_2_P1',
    batchOrder: 2,
    packageVersion: 'DAEGU_P1_OPERATOR_PACKAGE_V1',
    input: 'reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json',
    expectedRows: 17,
  },
  {
    batchId: 'BATCH_3_P2',
    batchOrder: 3,
    packageVersion: 'DAEGU_P2_OPERATOR_PACKAGE_V1',
    input: 'reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json',
    expectedRows: 36,
  },
  {
    batchId: 'BATCH_4_P3_P4',
    batchOrder: 4,
    packageVersion: 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1',
    input: 'reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.json',
    expectedRows: 44,
  },
];
const EXPECTED = {
  expectedRows: 27,
  expectedP0P1Rows: 5,
  expectedDuplicateRowsIncluded: 0,
  expectedDuplicateRowsExcluded: 2,
  expectedApprovedRows: 0,
  priorityCounts: {
    P0: 0,
    P1: 5,
    P3: 0,
    P4: 22,
  },
};
const PRIORITY_ORDER = {
  P0: 1,
  P1: 2,
  P2: 3,
  P3: 4,
  P4: 5,
};

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const csvEscape = (value) => {
  const text = String(value ?? '');
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

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const markerIncludes = (value, marker) => {
  if (Array.isArray(value)) return value.includes(marker);
  return String(value ?? '').includes(marker);
};

const absoluteFromFrontendRoot = (filePath) => {
  if (!filePath) return '';
  return path.isAbsolute(filePath) ? filePath : path.join(frontendRoot, filePath);
};

const isOffSeatCurrentPath = (row) => (
  markerIncludes(row.officialFailureReasons, 'LOW_COMPONENT_INSIDE_CURRENT_PATH')
  || markerIncludes(row.officialFailureReasons, 'LOW_CURRENT_PATH_COLOR_COVERAGE')
  || markerIncludes(row.riskFlags, 'LOW_COMPONENT_INSIDE_CURRENT_PATH')
  || markerIncludes(row.riskFlags, 'LOW_CURRENT_PATH_COLOR_COVERAGE')
);

const offSeatReasonFor = (row) => [
  markerIncludes(row.officialFailureReasons, 'LOW_COMPONENT_INSIDE_CURRENT_PATH')
    || markerIncludes(row.riskFlags, 'LOW_COMPONENT_INSIDE_CURRENT_PATH')
    ? 'LOW_COMPONENT_INSIDE_CURRENT_PATH'
    : '',
  markerIncludes(row.officialFailureReasons, 'LOW_CURRENT_PATH_COLOR_COVERAGE')
    || markerIncludes(row.riskFlags, 'LOW_CURRENT_PATH_COLOR_COVERAGE')
    ? 'LOW_CURRENT_PATH_COLOR_COVERAGE'
    : '',
].filter(Boolean).join('; ');

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const blockers = [];
const warnings = [];

const inputReports = await Promise.all(INPUT_SPECS.map(async (spec) => {
  const inputPath = path.join(frontendRoot, spec.input);
  const input = await readJson(inputPath);
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];

  if (input.packageVersion !== spec.packageVersion) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${spec.batchId}:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== spec.batchId) {
    blockers.push(`INPUT_BATCH_MISMATCH:${spec.batchId}:${input.targetBatchId ?? ''}`);
  }
  if (input.draftOnly !== false) blockers.push(`INPUT_DRAFT_ONLY_NOT_FALSE:${spec.batchId}`);
  if (input.productionWriteAllowed !== false) {
    blockers.push(`INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE:${spec.batchId}`);
  }
  if (inputRows.length !== spec.expectedRows) {
    blockers.push(`INPUT_ROW_COUNT_MISMATCH:${spec.batchId}:${inputRows.length}:${spec.expectedRows}`);
  }

  return {
    ...spec,
    inputPath,
    rows: inputRows,
  };
}));

const sourceRows = inputReports.flatMap((inputReport) => inputReport.rows.map((row) => ({
  inputReport,
  row,
})));
const duplicateOffSeatRows = sourceRows.filter(({ row }) => row.candidateDuplicateGroup && isOffSeatCurrentPath(row));
const intakeRows = sourceRows
  .filter(({ row }) => !row.candidateDuplicateGroup && isOffSeatCurrentPath(row))
  .map(({ inputReport, row }) => {
    const evidenceAbsolutePath = absoluteFromFrontendRoot(row.evidenceCrop);
    const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
    const operatorDecision = normalizeDecision(row.operatorDecision);

    if (!evidenceExists) blockers.push(`MISSING_EVIDENCE_CROP:${row.blockId}`);

    return {
      intakeTier: ['P0', 'P1'].includes(row.queuePriority)
        ? 'P0_P1_OFF_SEAT_FIRST'
        : 'OFF_SEAT_BACKLOG',
      sourceInput: path.relative(frontendRoot, inputReport.inputPath),
      batchId: inputReport.batchId,
      batchOrder: inputReport.batchOrder,
      blockId: row.blockId,
      block: row.block,
      name: row.name,
      category: row.category,
      queuePriority: row.queuePriority,
      alignmentClass: row.alignmentClass,
      operatorDecision,
      offSeatReason: offSeatReasonFor(row),
      recommendedOperatorAction: 'Trace the visible official seat boundary manually; do not reuse the legacy currentPath.',
      candidateStatus: row.candidateStatus,
      recommendedAction: row.recommendedAction,
      operatorAction: row.operatorAction,
      evidenceCrop: row.evidenceCrop,
      evidenceExists,
      currentPath: row.currentPath,
      currentLabelX: row.currentLabelX,
      currentLabelY: row.currentLabelY,
      candidatePath: row.candidatePath,
      candidatePathPointCount: row.candidatePathPointCount,
      candidateCenterX: row.candidateCenterX,
      candidateCenterY: row.candidateCenterY,
      candidateDuplicateGroup: row.candidateDuplicateGroup || '',
      candidateDuplicateIds: row.candidateDuplicateIds || '',
      componentInsidePathRatio: row.componentInsidePathRatio,
      pathColorCoverageRatio: row.pathColorCoverageRatio,
      officialFailureReasons: row.officialFailureReasons || '',
      riskFlags: row.riskFlags || '',
      correctedPath: row.correctedPath ?? '',
      correctedLabelX: row.correctedLabelX ?? '',
      correctedLabelY: row.correctedLabelY ?? '',
      reviewer: row.reviewer ?? '',
      reviewedAt: row.reviewedAt ?? '',
      operatorNote: row.operatorNote || '',
    };
  })
  .sort((left, right) => (
    (PRIORITY_ORDER[left.queuePriority] ?? 99) - (PRIORITY_ORDER[right.queuePriority] ?? 99)
    || left.batchOrder - right.batchOrder
    || String(left.block).localeCompare(String(right.block), 'ko')
  ));

const p0p1Rows = intakeRows.filter((row) => ['P0', 'P1'].includes(row.queuePriority));
const approvedRows = intakeRows.filter((row) => row.operatorDecision === 'APPROVED');
const duplicateRowsIncluded = intakeRows.filter((row) => row.candidateDuplicateGroup);
const priorityCounts = intakeRows.reduce((counts, row) => ({
  ...counts,
  [row.queuePriority]: (counts[row.queuePriority] ?? 0) + 1,
}), {});
const reasonCounts = intakeRows.reduce((counts, row) => ({
  ...counts,
  [row.offSeatReason]: (counts[row.offSeatReason] ?? 0) + 1,
}), {});

if (intakeRows.length !== EXPECTED.expectedRows) {
  warnings.push(`OFF_SEAT_INTAKE_ROWS_CHANGED:${intakeRows.length}:${EXPECTED.expectedRows}`);
}
if (p0p1Rows.length !== EXPECTED.expectedP0P1Rows) {
  warnings.push(`P0_P1_OFF_SEAT_ROWS_CHANGED:${p0p1Rows.length}:${EXPECTED.expectedP0P1Rows}`);
}
if (duplicateRowsIncluded.length !== EXPECTED.expectedDuplicateRowsIncluded) {
  warnings.push(`DUPLICATE_OFF_SEAT_ROWS_INCLUDED:${duplicateRowsIncluded.length}:${EXPECTED.expectedDuplicateRowsIncluded}`);
}
if (duplicateOffSeatRows.length !== EXPECTED.expectedDuplicateRowsExcluded) {
  warnings.push(`DUPLICATE_OFF_SEAT_ROWS_EXCLUDED:${duplicateOffSeatRows.length}:${EXPECTED.expectedDuplicateRowsExcluded}`);
}
if (approvedRows.length !== EXPECTED.expectedApprovedRows) {
  warnings.push(`APPROVED_ROWS_PRESENT_IN_OFF_SEAT_INTAKE:${approvedRows.length}:${EXPECTED.expectedApprovedRows}`);
}
Object.entries(EXPECTED.priorityCounts).forEach(([priority, expectedCount]) => {
  const actualCount = priorityCounts[priority] ?? 0;
  if (actualCount !== expectedCount) {
    warnings.push(`OFF_SEAT_PRIORITY_COUNT_CHANGED:${priority}:${actualCount}:${expectedCount}`);
  }
});

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
const summary = {
  intakeVersion: INTAKE_VERSION,
  status,
  productionWriteAllowed: false,
  totalRows: intakeRows.length,
  p0p1Rows: p0p1Rows.length,
  approvedRows: approvedRows.length,
  duplicateRowsIncluded: duplicateRowsIncluded.length,
  duplicateRowsExcluded: duplicateOffSeatRows.length,
  priorityCounts,
  reasonCounts,
  inputs: INPUT_SPECS.map((spec) => spec.input),
  blockers,
  warnings,
  approvalRule: 'Only operatorDecision=APPROVED rows with correctedPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt can enter production write gates.',
};

const safetyContract = [
  'This off-seat retrace intake is a read-only operator review aid.',
  'It never writes the main corrections template.',
  'It never modifies src/data/daeguSeatData.ts.',
  'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
  'Candidate paths remain reference-only and must not be promoted without operator approval.',
  'Rows with candidateDuplicateGroup are excluded from this intake.',
  'No external crawling, web search, or coordinate inference is allowed.',
];

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract,
  requiredApprovalFields: [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ],
  operatorWorkOrder: [
    'P0/P1 off-seat rows first',
    'P2/P3/P4 off-seat backlog after earlier batches are closed',
    'Duplicate/shared boundary rows stay out of this intake',
  ],
  rows: intakeRows,
};

const jsonPath = path.join(reportDir, 'daegu-off-seat-retrace-intake.json');
const csvPath = path.join(reportDir, 'daegu-off-seat-retrace-intake.csv');
const markdownPath = path.join(reportDir, 'daegu-off-seat-retrace-intake.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'intakeTier',
    'sourceInput',
    'batchId',
    'blockId',
    'block',
    'name',
    'category',
    'queuePriority',
    'operatorDecision',
    'offSeatReason',
    'recommendedOperatorAction',
    'candidateStatus',
    'evidenceCrop',
    'evidenceExists',
    'currentPath',
    'currentLabelX',
    'currentLabelY',
    'candidatePath',
    'candidatePathPointCount',
    'candidateCenterX',
    'candidateCenterY',
    'candidateDuplicateGroup',
    'candidateDuplicateIds',
    'componentInsidePathRatio',
    'pathColorCoverageRatio',
    'officialFailureReasons',
    'riskFlags',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ],
  ...intakeRows.map((row) => [
    row.intakeTier,
    row.sourceInput,
    row.batchId,
    row.blockId,
    row.block,
    row.name,
    row.category,
    row.queuePriority,
    row.operatorDecision,
    row.offSeatReason,
    row.recommendedOperatorAction,
    row.candidateStatus,
    row.evidenceCrop,
    row.evidenceExists,
    row.currentPath,
    row.currentLabelX,
    row.currentLabelY,
    row.candidatePath,
    row.candidatePathPointCount,
    row.candidateCenterX,
    row.candidateCenterY,
    row.candidateDuplicateGroup,
    row.candidateDuplicateIds,
    row.componentInsidePathRatio,
    row.pathColorCoverageRatio,
    row.officialFailureReasons,
    row.riskFlags,
    row.correctedPath,
    row.correctedLabelX,
    row.correctedLabelY,
    row.reviewer,
    row.reviewedAt,
    row.operatorNote,
  ]),
]);

const rowTable = (rows) => markdownTable(
  ['priority', 'batch', 'block', 'category', 'decision', 'reason', 'candidate', 'inside', 'coverage', 'evidence', 'source input'],
  rows.map((row) => [
    `\`${row.queuePriority}\``,
    `\`${row.batchId}\``,
    `\`${row.block}\``,
    row.category,
    `\`${row.operatorDecision}\``,
    row.offSeatReason,
    row.candidateStatus,
    row.componentInsidePathRatio === '' ? '-' : row.componentInsidePathRatio,
    row.pathColorCoverageRatio === '' ? '-' : row.pathColorCoverageRatio,
    row.evidenceCrop ? `[crop](${row.evidenceCrop})` : '-',
    `\`${row.sourceInput}\``,
  ]),
);

await fs.writeFile(markdownPath, [
  '# Daegu Off-Seat Retrace Intake',
  '',
  `- intake version: \`${INTAKE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- total rows: ${summary.totalRows}`,
  `- P0/P1 first rows: ${summary.p0p1Rows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- duplicate rows included: ${summary.duplicateRowsIncluded}`,
  `- duplicate rows excluded: ${summary.duplicateRowsExcluded}`,
  `- JSON output: \`${path.relative(frontendRoot, jsonPath)}\``,
  `- CSV output: \`${path.relative(frontendRoot, csvPath)}\``,
  '',
  '## Safety',
  '',
  ...safetyContract.map((rule) => `- ${rule}`),
  '',
  '## Operator Work Order',
  '',
  '- Work the `P0_P1_OFF_SEAT_FIRST` rows first.',
  '- These rows are suspected of placing the legacy currentPath outside the visible official seat area.',
  '- Do not reuse `currentPath`; trace the visible official seat boundary manually.',
  '- Keep `candidatePath` as reference-only unless the operator visually approves and supplies the corrected fields.',
  '',
  '## P0/P1 First Rows',
  '',
  rowTable(p0p1Rows),
  '',
  '## Full Off-Seat Intake',
  '',
  rowTable(intakeRows),
  '',
  '## Approval Rule',
  '',
  '- This intake does not approve or write any row.',
  '- Operator-approved rows must still be copied into the matching operator input file with `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
  '- Production data can change only through the existing validation/preview/apply/write gates.',
].join('\n'), 'utf8');

console.log(JSON.stringify({
  status,
  output: path.relative(frontendRoot, markdownPath),
  totalRows: intakeRows.length,
  p0p1Rows: p0p1Rows.length,
  approvedRows: approvedRows.length,
  duplicateRowsIncluded: duplicateRowsIncluded.length,
  duplicateRowsExcluded: duplicateOffSeatRows.length,
  blockers: blockers.length,
  warnings: warnings.length,
}, null, 2));

if (blockers.length > 0) {
  process.exitCode = 1;
}
