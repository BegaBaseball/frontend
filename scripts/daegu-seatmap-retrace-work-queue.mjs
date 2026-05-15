import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const QUEUE_VERSION = 'DAEGU_RETRACE_WORK_QUEUE_V1';
const EXPECTED = {
  expectedRows: 97,
  expectedNeedsRetraceRows: 97,
  p0Rows: 0,
  p1Rows: 17,
  p2Rows: 36,
  p3Rows: 0,
  p4Rows: 44,
};
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

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
const handoff = await readJson(handoffPath);
const currentHandoffIds = new Set((handoff.workItems ?? []).map((row) => row.id));
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
    warnings.push(`INPUT_ROW_COUNT_CHANGED_AFTER_WRITES:${spec.batchId}:${inputRows.length}:${spec.expectedRows}`);
  }

  return {
    ...spec,
    inputPath,
    input,
    rows: inputRows,
  };
}));

const allRows = inputReports.flatMap((inputReport) => inputReport.rows
  .filter((row) => {
    if (currentHandoffIds.has(row.blockId)) return true;
    const operatorDecision = normalizeDecision(row.operatorDecision);
    if (operatorDecision === 'PENDING') {
      blockers.push(`INPUT_PENDING_ROW_MISSING_FROM_CURRENT_HANDOFF:${row.blockId}`);
    }
    return false;
  })
  .map((row) => {
  const evidenceAbsolutePath = absoluteFromFrontendRoot(row.evidenceCrop);
  const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
  const operatorDecision = normalizeDecision(row.operatorDecision);
  const hasCorrectedPath = Boolean(String(row.correctedPath ?? '').trim());
  const hasCorrectedLabel = String(row.correctedLabelX ?? '').trim() !== ''
    && String(row.correctedLabelY ?? '').trim() !== '';
  const hasReviewer = Boolean(String(row.reviewer ?? '').trim());
  const hasReviewedAt = Boolean(String(row.reviewedAt ?? '').trim());

  if (!evidenceExists) blockers.push(`MISSING_EVIDENCE_CROP:${row.blockId}`);

  return {
    batchId: inputReport.batchId,
    batchOrder: inputReport.batchOrder,
    input: path.relative(frontendRoot, inputReport.inputPath),
    blockId: row.blockId,
    block: row.block,
    name: row.name,
    category: row.category,
    queuePriority: row.queuePriority,
    alignmentClass: row.alignmentClass,
    candidateStatus: row.candidateStatus,
    recommendedAction: row.recommendedAction,
    operatorAction: row.operatorAction,
    requiredOperatorReview: row.requiredOperatorReview || '',
    stagingBucket: row.stagingBucket || '',
    operatorDecision,
    operatorNote: row.operatorNote || '',
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
    hasCorrectedPath,
    hasCorrectedLabel,
    hasReviewer,
    hasReviewedAt,
  };
}));

const queueRows = allRows
  .filter((row) => row.operatorDecision === 'NEEDS_RETRACE')
  .sort((left, right) => (
    left.batchOrder - right.batchOrder
    || String(left.queuePriority).localeCompare(String(right.queuePriority))
    || String(left.block).localeCompare(String(right.block), 'ko')
  ));
const pendingRows = allRows.filter((row) => row.operatorDecision === 'PENDING');
const approvedRows = allRows.filter((row) => row.operatorDecision === 'APPROVED');
const filledEditableRows = allRows.filter((row) => (
  row.hasCorrectedPath
  || row.hasCorrectedLabel
  || row.hasReviewer
  || row.hasReviewedAt
));
const missingEvidenceRows = queueRows.filter((row) => !row.evidenceExists);
const actionCounts = queueRows.reduce((counts, row) => ({
  ...counts,
  [row.operatorAction]: (counts[row.operatorAction] ?? 0) + 1,
}), {});
const priorityCounts = queueRows.reduce((counts, row) => ({
  ...counts,
  [row.queuePriority]: (counts[row.queuePriority] ?? 0) + 1,
}), {});

if (allRows.length !== EXPECTED.expectedRows) {
  warnings.push(`TOTAL_INPUT_ROWS_CHANGED_AFTER_WRITES:${allRows.length}:${EXPECTED.expectedRows}`);
}
if (queueRows.length !== EXPECTED.expectedNeedsRetraceRows) {
  warnings.push(`NEEDS_RETRACE_QUEUE_ROWS_CHANGED:${queueRows.length}:${EXPECTED.expectedNeedsRetraceRows}`);
}
if ((priorityCounts.P0 ?? 0) !== EXPECTED.p0Rows) warnings.push(`P0_QUEUE_ROWS_CHANGED:${priorityCounts.P0 ?? 0}:${EXPECTED.p0Rows}`);
if ((priorityCounts.P1 ?? 0) !== EXPECTED.p1Rows) warnings.push(`P1_QUEUE_ROWS_CHANGED:${priorityCounts.P1 ?? 0}:${EXPECTED.p1Rows}`);
if ((priorityCounts.P2 ?? 0) !== EXPECTED.p2Rows) warnings.push(`P2_QUEUE_ROWS_CHANGED:${priorityCounts.P2 ?? 0}:${EXPECTED.p2Rows}`);
if ((priorityCounts.P3 ?? 0) !== EXPECTED.p3Rows) warnings.push(`P3_QUEUE_ROWS_CHANGED:${priorityCounts.P3 ?? 0}:${EXPECTED.p3Rows}`);
if ((priorityCounts.P4 ?? 0) !== EXPECTED.p4Rows) warnings.push(`P4_QUEUE_ROWS_CHANGED:${priorityCounts.P4 ?? 0}:${EXPECTED.p4Rows}`);
if (pendingRows.length > 0) warnings.push(`PENDING_ROWS_REMAIN:${pendingRows.length}`);
if (approvedRows.length > 0) warnings.push(`APPROVED_ROWS_EXCLUDED_FROM_RETRACE_QUEUE:${approvedRows.length}`);
if (filledEditableRows.length > 0) warnings.push(`FILLED_EDITABLE_ROWS_PRESENT:${filledEditableRows.length}`);

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
const summary = {
  queueVersion: QUEUE_VERSION,
  status,
  productionWriteAllowed: false,
  totalInputRows: allRows.length,
  queueRows: queueRows.length,
  expectedRows: EXPECTED.expectedRows,
  expectedNeedsRetraceRows: EXPECTED.expectedNeedsRetraceRows,
  pendingRows: pendingRows.length,
  approvedRows: approvedRows.length,
  filledEditableRows: filledEditableRows.length,
  missingEvidenceRows: missingEvidenceRows.length,
  priorityCounts,
  actionCounts,
  inputs: INPUT_SPECS.map((spec) => spec.input),
  sourceHandoff: path.relative(frontendRoot, handoffPath),
  blockers,
  warnings,
  approvalRule: 'Only rows changed back to operatorDecision=APPROVED with correctedPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt can enter production write gates.',
  nextCommandsAfterOperatorTracing: [
    'npm run stadium:daegu:p0-operator-prewrite-gate',
    'npm run stadium:daegu:p1-operator-prewrite-gate',
    'npm run stadium:daegu:p2-operator-prewrite-gate',
    'npm run stadium:daegu:p3-p4-operator-prewrite-gate',
  ],
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This work queue is a read-only operator retracing aid.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'Candidate paths remain reference-only and must not be promoted without operator approval.',
    'Operator input files remain the source of truth for approvals.',
  ],
  requiredApprovalFields: [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ],
  rows: queueRows,
};

const jsonPath = path.join(reportDir, 'daegu-retrace-work-queue.json');
const csvPath = path.join(reportDir, 'daegu-retrace-work-queue.csv');
const markdownPath = path.join(reportDir, 'daegu-retrace-work-queue.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'batchId',
    'queuePriority',
    'blockId',
    'block',
    'name',
    'operatorDecision',
    'operatorAction',
    'recommendedAction',
    'requiredOperatorReview',
    'stagingBucket',
    'evidenceCrop',
    'evidenceExists',
    'currentPath',
    'currentLabelX',
    'currentLabelY',
    'candidatePath',
    'candidatePathPointCount',
    'candidateCenterX',
    'candidateCenterY',
    'candidateLabelX',
    'candidateLabelY',
    'candidateDuplicateGroup',
    'candidateDuplicateIds',
    'officialFailureReasons',
    'riskFlags',
    'operatorNote',
  ],
  ...queueRows.map((row) => [
    row.batchId,
    row.queuePriority,
    row.blockId,
    row.block,
    row.name,
    row.operatorDecision,
    row.operatorAction,
    row.recommendedAction,
    row.requiredOperatorReview,
    row.stagingBucket,
    row.evidenceCrop,
    row.evidenceExists,
    row.currentPath,
    row.currentLabelX,
    row.currentLabelY,
    row.candidatePath,
    row.candidatePathPointCount,
    row.candidateCenterX,
    row.candidateCenterY,
    row.candidateLabelX,
    row.candidateLabelY,
    row.candidateDuplicateGroup,
    row.candidateDuplicateIds,
    row.officialFailureReasons,
    row.riskFlags,
    row.operatorNote,
  ]),
]);

const groupedRows = queueRows.reduce((groups, row) => {
  const key = row.batchId;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
  return groups;
}, new Map());

const markdownSections = [...groupedRows.entries()].flatMap(([batchId, rows]) => [
  `## ${batchId}`,
  '',
  markdownTable(
    ['priority', 'block', 'action', 'candidate points', 'duplicate group', 'evidence'],
    rows.map((row) => [
      `\`${row.queuePriority}\``,
      `\`${row.block}\``,
      `\`${row.operatorAction}\``,
      row.candidatePathPointCount || '-',
      row.candidateDuplicateGroup || '-',
      row.evidenceExists ? 'ok' : 'missing',
    ]),
  ),
  '',
]);

await fs.writeFile(markdownPath, [
  '# Daegu Retrace Work Queue',
  '',
  `- queue version: \`${QUEUE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- total input rows: ${summary.totalInputRows}`,
  `- retrace queue rows: ${summary.queueRows}`,
  `- pending rows: ${summary.pendingRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- filled editable rows: ${summary.filledEditableRows}`,
  `- missing evidence rows: ${summary.missingEvidenceRows}`,
  `- JSON: \`${path.relative(frontendRoot, jsonPath)}\``,
  `- CSV: \`${path.relative(frontendRoot, csvPath)}\``,
  '',
  '## Safety',
  '',
  '- This report is read-only and does not write production data.',
  '- Full current/candidate geometry fields are included in the JSON and CSV outputs.',
  '- Candidate paths are reference-only until an operator changes a source input row to `APPROVED` and supplies all corrected fields.',
  '',
  '## Priority Summary',
  '',
  markdownTable(
    ['priority', 'rows'],
    Object.entries(summary.priorityCounts).map(([priority, count]) => [`\`${priority}\``, count]),
  ),
  '',
  '## Action Summary',
  '',
  markdownTable(
    ['action', 'rows'],
    Object.entries(summary.actionCounts).map(([action, count]) => [`\`${action}\``, count]),
  ),
  '',
  '## Queue',
  '',
  ...markdownSections,
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`retrace_work_queue_json:${jsonPath}`);
console.log(`retrace_work_queue_csv:${csvPath}`);
console.log(`retrace_work_queue_markdown:${markdownPath}`);
console.log(`status:${summary.status} queueRows=${summary.queueRows} pending=${summary.pendingRows} approved=${summary.approvedRows} blockers=${blockers.length}`);

if (blockers.length > 0) process.exitCode = 1;
