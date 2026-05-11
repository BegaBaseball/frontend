import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP0ReportDir = path.join(defaultReportDir, 'daegu-p0-operator');

const INTAKE_VERSION = 'DAEGU_P0_RETRACE_INTAKE_V1';
const PACKAGE_VERSION = 'DAEGU_P0_OPERATOR_PACKAGE_V1';
const TARGET_BATCH_ID = 'BATCH_1_P0';
const EXPECTED = {
  expectedRows: 3,
  expectedNeedsRetraceRows: 3,
  expectedApprovedRows: 0,
  expectedQueuePriority: 'P0',
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

const absoluteFromFrontendRoot = (filePath) => {
  if (!filePath) return '';
  return path.isAbsolute(filePath) ? filePath : path.join(frontendRoot, filePath);
};

const hasValue = (value) => String(value ?? '').trim() !== '';

const reviewFocusFor = (row) => {
  if (row.operatorAction === 'OPERATOR_MANUAL_TRACE_REQUIRED') {
    return 'Draw a new block-specific closed polygon with at least 6 points before approval.';
  }
  if (row.operatorAction === 'OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY') {
    return 'Do not reuse the shared candidate path; draw a separate block-specific boundary before approval.';
  }
  return 'Operator corrected path and label hit point are required before approval.';
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const p0ReportDir = path.resolve(frontendRoot, argValue('--p0-report-dir', defaultP0ReportDir));
const inputPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.json');
const inputCsvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.csv');

const input = await readJson(inputPath);
const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const blockers = [];
const warnings = [];

if (input.packageVersion !== PACKAGE_VERSION) {
  blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (input.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
}
if (input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
if (input.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (inputRows.length !== EXPECTED.expectedRows) {
  blockers.push(`P0_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.expectedRows}`);
}

const rows = inputRows.map((row) => {
  const evidenceAbsolutePath = absoluteFromFrontendRoot(row.evidenceCrop);
  const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
  const operatorDecision = normalizeDecision(row.operatorDecision);
  const hasCorrectedPath = hasValue(row.correctedPath);
  const hasCorrectedLabel = hasValue(row.correctedLabelX) && hasValue(row.correctedLabelY);
  const hasReviewer = hasValue(row.reviewer);
  const hasReviewedAt = hasValue(row.reviewedAt);
  const hasFilledEditableFields = hasCorrectedPath || hasCorrectedLabel || hasReviewer || hasReviewedAt;
  const rowBlockers = [];

  if (row.batchId !== TARGET_BATCH_ID) rowBlockers.push(`ROW_BATCH_MISMATCH:${row.batchId ?? ''}`);
  if (row.queuePriority !== EXPECTED.expectedQueuePriority) rowBlockers.push(`ROW_PRIORITY_NOT_P0:${row.queuePriority ?? ''}`);
  if (operatorDecision !== 'NEEDS_RETRACE') rowBlockers.push(`ROW_DECISION_NOT_NEEDS_RETRACE:${operatorDecision}`);
  if (row.draftOnly === true) rowBlockers.push('ROW_DRAFT_ONLY_TRUE');
  if (row.stagingOnly === true) rowBlockers.push('ROW_STAGING_ONLY_TRUE');
  if (!evidenceExists) rowBlockers.push('MISSING_EVIDENCE_CROP');

  blockers.push(...rowBlockers.map((blocker) => `${blocker}:${row.blockId}`));
  if (hasFilledEditableFields) warnings.push(`FILLED_EDITABLE_FIELDS_PRESENT:${row.blockId}`);

  return {
    sourceInput: path.relative(frontendRoot, inputPath),
    blockId: row.blockId,
    block: row.block,
    name: row.name,
    category: row.category,
    batchId: row.batchId,
    queuePriority: row.queuePriority,
    alignmentClass: row.alignmentClass,
    candidateStatus: row.candidateStatus,
    recommendedAction: row.recommendedAction,
    operatorAction: row.operatorAction,
    requiredOperatorReview: row.requiredOperatorReview || '',
    operatorDecision,
    reviewFocus: reviewFocusFor(row),
    evidenceCrop: row.evidenceCrop,
    evidenceAbsolutePath,
    evidenceExists,
    currentPath: row.currentPath,
    currentLabelX: row.currentLabelX,
    currentLabelY: row.currentLabelY,
    candidatePath: row.candidatePath,
    candidatePathPointCount: row.candidatePathPointCount,
    candidateCenterX: row.candidateCenterX,
    candidateCenterY: row.candidateCenterY,
    candidateLabelX: row.candidateLabelX,
    candidateLabelY: row.candidateLabelY,
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
    hasFilledEditableFields,
    rowBlockers,
    operatorApprovalInstruction: 'Set operatorDecision=APPROVED and fill correctedPath, correctedLabelX, correctedLabelY, reviewer, reviewedAt in the source P0 operator input after manual tracing.',
  };
});

const needsRetraceRows = rows.filter((row) => row.operatorDecision === 'NEEDS_RETRACE');
const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
const pendingRows = rows.filter((row) => row.operatorDecision === 'PENDING');
const nonP0Rows = rows.filter((row) => row.queuePriority !== EXPECTED.expectedQueuePriority);
const missingEvidenceRows = rows.filter((row) => !row.evidenceExists);
const filledEditableRows = rows.filter((row) => row.hasFilledEditableFields);

if (needsRetraceRows.length !== EXPECTED.expectedNeedsRetraceRows) {
  blockers.push(`P0_NEEDS_RETRACE_ROW_COUNT_MISMATCH:${needsRetraceRows.length}:${EXPECTED.expectedNeedsRetraceRows}`);
}
if (approvedRows.length !== EXPECTED.expectedApprovedRows) {
  blockers.push(`P0_APPROVED_ROWS_NOT_ALLOWED_IN_RETRACE_INTAKE:${approvedRows.length}`);
}
if (nonP0Rows.length > 0) blockers.push(`NON_P0_ROWS_PRESENT:${nonP0Rows.length}`);

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator-retrace';
const summary = {
  intakeVersion: INTAKE_VERSION,
  status,
  targetBatchId: TARGET_BATCH_ID,
  sourceInput: path.relative(frontendRoot, inputPath),
  sourceInputCsv: path.relative(frontendRoot, inputCsvPath),
  productionWriteAllowed: false,
  totalRows: rows.length,
  needsRetraceRows: needsRetraceRows.length,
  approvedRows: approvedRows.length,
  pendingRows: pendingRows.length,
  nonP0Rows: nonP0Rows.length,
  missingEvidenceRows: missingEvidenceRows.length,
  filledEditableRows: filledEditableRows.length,
  expectedRows: EXPECTED.expectedRows,
  expectedNeedsRetraceRows: EXPECTED.expectedNeedsRetraceRows,
  expectedApprovedRows: EXPECTED.expectedApprovedRows,
  blockers,
  warnings,
  nextOperatorAction: 'Manually trace each P0 block in the official PNG coordinate system, then update the source P0 operator input row with an APPROVED decision and corrected geometry.',
};

const safetyContract = [
  'This P0 retrace intake is a read-only operator tracing aid.',
  'It never writes the main corrections template.',
  'It never modifies src/data/daeguSeatData.ts.',
  'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
  'Candidate paths remain reference-only and must not be promoted without operator approval.',
  'The P0 operator input JSON remains the source of truth for approvals.',
];

const requiredApprovalFields = [
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
];

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract,
  requiredApprovalFields,
  rows,
};

const jsonPath = path.join(p0ReportDir, 'daegu-seatmap-p0-retrace-intake.json');
const csvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-retrace-intake.csv');
const markdownPath = path.join(p0ReportDir, 'daegu-seatmap-p0-retrace-intake.md');

await fs.mkdir(p0ReportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'sourceInput',
    'blockId',
    'block',
    'name',
    'category',
    'batchId',
    'queuePriority',
    'operatorDecision',
    'operatorAction',
    'recommendedAction',
    'reviewFocus',
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
    'operatorApprovalInstruction',
  ],
  ...rows.map((row) => [
    row.sourceInput,
    row.blockId,
    row.block,
    row.name,
    row.category,
    row.batchId,
    row.queuePriority,
    row.operatorDecision,
    row.operatorAction,
    row.recommendedAction,
    row.reviewFocus,
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
    row.operatorApprovalInstruction,
  ]),
]);

const rowSummaryTable = markdownTable(
  ['block', 'decision', 'action', 'candidate points', 'duplicate group', 'evidence', 'editable fields'],
  rows.map((row) => [
    `\`${row.block}\``,
    `\`${row.operatorDecision}\``,
    `\`${row.operatorAction}\``,
    row.candidatePathPointCount,
    row.candidateDuplicateGroup || '-',
    row.evidenceExists ? 'ok' : 'missing',
    row.hasFilledEditableFields ? 'filled' : 'blank',
  ]),
);

const markdownRows = rows.flatMap((row) => {
  const evidenceRelativePath = row.evidenceAbsolutePath
    ? path.relative(p0ReportDir, row.evidenceAbsolutePath)
    : '';

  return [
    `## ${row.block}`,
    '',
    evidenceRelativePath ? `![${row.block}](${evidenceRelativePath})` : '_Missing evidence crop._',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['blockId', `\`${row.blockId}\``],
        ['name', row.name],
        ['category', row.category],
        ['decision', `\`${row.operatorDecision}\``],
        ['action', `\`${row.operatorAction}\``],
        ['review focus', row.reviewFocus],
        ['candidate points', row.candidatePathPointCount],
        ['candidate duplicate group', row.candidateDuplicateGroup || '-'],
        ['candidate duplicate ids', row.candidateDuplicateIds || '-'],
        ['current label', `${row.currentLabelX},${row.currentLabelY}`],
        ['candidate center', row.candidateCenterX !== '' && row.candidateCenterY !== '' ? `${row.candidateCenterX},${row.candidateCenterY}` : '-'],
        ['component inside current path', row.componentInsidePathRatio],
        ['path color coverage', row.pathColorCoverageRatio],
        ['official failures', row.officialFailureReasons || '-'],
        ['risk flags', row.riskFlags || '-'],
        ['correctedPath', row.correctedPath ? 'filled in source input' : 'blank - operator must fill before approval'],
        ['correctedLabelX/Y', row.correctedLabelX !== '' && row.correctedLabelY !== '' ? `${row.correctedLabelX},${row.correctedLabelY}` : 'blank - operator must fill before approval'],
        ['reviewer', row.reviewer || 'blank - operator must fill before approval'],
        ['reviewedAt', row.reviewedAt || 'blank - operator must fill before approval'],
        ['operator note', row.operatorNote || '-'],
        ['source paths', 'Full currentPath and candidatePath are included in the JSON/CSV outputs.'],
      ],
    ),
    '',
  ];
});

await fs.writeFile(markdownPath, [
  '# Daegu P0 Retrace Intake',
  '',
  `- intake version: \`${INTAKE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- target batch: \`${TARGET_BATCH_ID}\``,
  `- rows: ${summary.totalRows}`,
  `- needs retrace rows: ${summary.needsRetraceRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- missing evidence rows: ${summary.missingEvidenceRows}`,
  `- filled editable rows: ${summary.filledEditableRows}`,
  `- source input JSON: \`${summary.sourceInput}\``,
  `- source input CSV: \`${summary.sourceInputCsv}\``,
  `- JSON output: \`${path.relative(frontendRoot, jsonPath)}\``,
  `- CSV output: \`${path.relative(frontendRoot, csvPath)}\``,
  '',
  '## Safety',
  '',
  ...safetyContract.map((rule) => `- ${rule}`),
  '',
  '## Operator Approval Rule',
  '',
  '- Keep `candidatePath` as reference-only.',
  '- Draw a new official-image polygon manually for each P0 block.',
  '- Approve by editing the source P0 operator input row to `operatorDecision=APPROVED` and filling `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
  '- Leave the row as `NEEDS_RETRACE` until all required approval fields are present.',
  '',
  '## Summary',
  '',
  rowSummaryTable,
  '',
  ...markdownRows,
].join('\n'), 'utf8');

console.log(JSON.stringify({
  status,
  output: path.relative(frontendRoot, markdownPath),
  totalRows: rows.length,
  needsRetraceRows: needsRetraceRows.length,
  approvedRows: approvedRows.length,
  blockers: blockers.length,
  warnings: warnings.length,
}, null, 2));

if (blockers.length > 0) {
  process.exitCode = 1;
}
