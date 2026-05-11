import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP0ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p0-operator');

const AUDIT_VERSION = 'DAEGU_P0_OPERATOR_AUDIT_V1';
const TARGET_BATCH_ID = 'BATCH_1_P0';
const EXPECTED = {
  rows: 3,
  manualTraceRequiredRows: 2,
  sharedCandidateBoundaryRows: 1,
  evidenceCropRows: 3,
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

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const isBlank = (value) => String(value ?? '').trim() === '';

const countInputRows = (rows) => ({
  total: rows.length,
  pending: rows.filter((row) => row.operatorDecision === 'PENDING').length,
  approved: rows.filter((row) => row.operatorDecision === 'APPROVED').length,
  decided: rows.filter((row) => row.operatorDecision && row.operatorDecision !== 'PENDING').length,
  filledPath: rows.filter((row) => !isBlank(row.correctedPath)).length,
  filledLabelX: rows.filter((row) => !isBlank(row.correctedLabelX)).length,
  filledLabelY: rows.filter((row) => !isBlank(row.correctedLabelY)).length,
  filledReviewer: rows.filter((row) => !isBlank(row.reviewer)).length,
  filledReviewedAt: rows.filter((row) => !isBlank(row.reviewedAt)).length,
  evidenceCrop: rows.filter((row) => !isBlank(row.evidenceCrop)).length,
});

const pushExpected = (blockers, label, actual, expected) => {
  if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
};

const p0ReportDir = path.resolve(frontendRoot, argValue('--p0-report-dir', defaultP0ReportDir));
const packagePath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-package.json');
const inputPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.json');

const packageReport = await readJson(packagePath);
const operatorInput = await readJson(inputPath);
const inputRows = operatorInput.corrections ?? [];
const inputCounts = countInputRows(inputRows);
const blockers = [];

if (packageReport.packageVersion !== 'DAEGU_P0_OPERATOR_PACKAGE_V1') {
  blockers.push(`PACKAGE_VERSION_MISMATCH:${packageReport.packageVersion ?? ''}`);
}
if (packageReport.status !== 'ok') blockers.push(`PACKAGE_STATUS_NOT_OK:${packageReport.status ?? ''}`);
if (packageReport.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`PACKAGE_BATCH_MISMATCH:${packageReport.targetBatchId ?? ''}`);
}
pushExpected(blockers, 'PACKAGE_ROWS', packageReport.totalRows, EXPECTED.rows);
pushExpected(blockers, 'PACKAGE_EXPECTED_ROWS', packageReport.expectedRows, EXPECTED.rows);
pushExpected(blockers, 'PACKAGE_MANUAL_TRACE_ROWS', packageReport.manualTraceRequiredRows, EXPECTED.manualTraceRequiredRows);
pushExpected(blockers, 'PACKAGE_SHARED_CANDIDATE_ROWS', packageReport.sharedCandidateBoundaryRows, EXPECTED.sharedCandidateBoundaryRows);
pushExpected(blockers, 'PACKAGE_EVIDENCE_ROWS', packageReport.evidenceCropRows, EXPECTED.evidenceCropRows);
pushExpected(blockers, 'PACKAGE_APPROVED_ROWS', packageReport.approvedRows, 0);

if (operatorInput.packageVersion !== 'DAEGU_P0_OPERATOR_PACKAGE_V1') {
  blockers.push(`INPUT_VERSION_MISMATCH:${operatorInput.packageVersion ?? ''}`);
}
if (operatorInput.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`INPUT_BATCH_MISMATCH:${operatorInput.targetBatchId ?? ''}`);
}
if (operatorInput.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
if (operatorInput.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
pushExpected(blockers, 'INPUT_ROWS', inputCounts.total, EXPECTED.rows);
pushExpected(blockers, 'INPUT_PENDING_ROWS', inputCounts.pending, EXPECTED.rows);
pushExpected(blockers, 'INPUT_APPROVED_ROWS', inputCounts.approved, 0);
pushExpected(blockers, 'INPUT_DECIDED_ROWS', inputCounts.decided, 0);
pushExpected(blockers, 'INPUT_FILLED_PATH_ROWS', inputCounts.filledPath, 0);
pushExpected(blockers, 'INPUT_FILLED_LABEL_X_ROWS', inputCounts.filledLabelX, 0);
pushExpected(blockers, 'INPUT_FILLED_LABEL_Y_ROWS', inputCounts.filledLabelY, 0);
pushExpected(blockers, 'INPUT_FILLED_REVIEWER_ROWS', inputCounts.filledReviewer, 0);
pushExpected(blockers, 'INPUT_FILLED_REVIEWED_AT_ROWS', inputCounts.filledReviewedAt, 0);
pushExpected(blockers, 'INPUT_EVIDENCE_ROWS', inputCounts.evidenceCrop, EXPECTED.evidenceCropRows);

const summary = {
  auditVersion: AUDIT_VERSION,
  status: blockers.length === 0 ? 'ok' : 'failed',
  p0ReportDir: path.relative(frontendRoot, p0ReportDir),
  packageReport: path.relative(frontendRoot, packagePath),
  operatorInput: path.relative(frontendRoot, inputPath),
  packageCounts: {
    totalRows: packageReport.totalRows,
    expectedRows: packageReport.expectedRows,
    manualTraceRequiredRows: packageReport.manualTraceRequiredRows,
    sharedCandidateBoundaryRows: packageReport.sharedCandidateBoundaryRows,
    evidenceCropRows: packageReport.evidenceCropRows,
    approvedRows: packageReport.approvedRows,
    preservedEditableRows: packageReport.preservedEditableRows,
  },
  inputCounts,
  blockers,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
};

const jsonPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-audit.json');
const csvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-audit.csv');
const markdownPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-audit.md');

await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'status',
    'packageRows',
    'inputRows',
    'pendingRows',
    'approvedRows',
    'decidedRows',
    'filledPathRows',
    'filledReviewerRows',
    'evidenceCropRows',
    'blockers',
  ],
  [
    summary.status,
    summary.packageCounts.totalRows,
    inputCounts.total,
    inputCounts.pending,
    inputCounts.approved,
    inputCounts.decided,
    inputCounts.filledPath,
    inputCounts.filledReviewer,
    inputCounts.evidenceCrop,
    blockers.join(' '),
  ],
]);
await fs.writeFile(markdownPath, [
  '# Daegu P0 Operator Audit',
  '',
  `- audit version: \`${AUDIT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- package report: \`${summary.packageReport}\``,
  `- operator input: \`${summary.operatorInput}\``,
  '',
  '## Counts',
  '',
  `- package rows: ${summary.packageCounts.totalRows}`,
  `- input rows: ${inputCounts.total}`,
  `- pending rows: ${inputCounts.pending}`,
  `- approved rows: ${inputCounts.approved}`,
  `- decided rows: ${inputCounts.decided}`,
  `- filled path rows: ${inputCounts.filledPath}`,
  `- evidence crop rows: ${inputCounts.evidenceCrop}`,
  '',
  '## Gate',
  '',
  'This audit is for the pre-approval P0 package state. It must be `ok` before operator edits begin.',
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
].join('\n'), 'utf8');

console.log(`p0_operator_audit_json:${jsonPath}`);
console.log(`p0_operator_audit_csv:${csvPath}`);
console.log(`p0_operator_audit_markdown:${markdownPath}`);
console.log(`status:${summary.status} rows=${inputCounts.total} pending=${inputCounts.pending} approved=${inputCounts.approved}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
