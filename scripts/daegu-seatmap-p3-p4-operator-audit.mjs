import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP3P4ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p3-p4-operator');

const AUDIT_VERSION = 'DAEGU_P3_P4_OPERATOR_AUDIT_V1';
const EXPECTED = {
  targetBatchId: 'BATCH_4_P3_P4',
  packageRows: 44,
  p3Rows: 0,
  p4Rows: 44,
  manualTraceRequiredRows: 22,
  correctedPathRequiredRows: 22,
  labelAndHitAreaRows: 3,
  evidenceCropRows: 44,
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
  needsRetrace: rows.filter((row) => row.operatorDecision === 'NEEDS_RETRACE').length,
  approved: rows.filter((row) => row.operatorDecision === 'APPROVED').length,
  decided: rows.filter((row) => row.operatorDecision !== 'PENDING').length,
  p3: rows.filter((row) => row.queuePriority === 'P3').length,
  p4: rows.filter((row) => row.queuePriority === 'P4').length,
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

const p3p4ReportDir = path.resolve(frontendRoot, argValue('--p3-p4-report-dir', defaultP3P4ReportDir));
const packagePath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-package.json');
const inputPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-input.json');

const packageReport = await readJson(packagePath);
const input = await readJson(inputPath);
const inputRows = input.corrections ?? [];
const inputCounts = countInputRows(inputRows);
const blockers = [];

pushExpected(blockers, 'PACKAGE_ROWS', packageReport.totalRows, EXPECTED.packageRows);
pushExpected(blockers, 'PACKAGE_EXPECTED_ROWS', packageReport.expectedRows, EXPECTED.packageRows);
pushExpected(blockers, 'PACKAGE_P3_ROWS', packageReport.p3Rows, EXPECTED.p3Rows);
pushExpected(blockers, 'PACKAGE_P4_ROWS', packageReport.p4Rows, EXPECTED.p4Rows);
pushExpected(blockers, 'PACKAGE_MANUAL_TRACE_REQUIRED_ROWS', packageReport.manualTraceRequiredRows, EXPECTED.manualTraceRequiredRows);
pushExpected(blockers, 'PACKAGE_CORRECTED_PATH_REQUIRED_ROWS', packageReport.correctedPathRequiredRows, EXPECTED.correctedPathRequiredRows);
pushExpected(blockers, 'PACKAGE_LABEL_AND_HIT_AREA_ROWS', packageReport.labelAndHitAreaRows, EXPECTED.labelAndHitAreaRows);
pushExpected(blockers, 'PACKAGE_EVIDENCE_CROP_ROWS', packageReport.evidenceCropRows, EXPECTED.evidenceCropRows);
pushExpected(blockers, 'PACKAGE_APPROVED_ROWS', packageReport.approvedRows, 0);
if (packageReport.status !== 'ok') blockers.push(`PACKAGE_STATUS_NOT_OK:${packageReport.status ?? ''}`);
if (packageReport.targetBatchId !== EXPECTED.targetBatchId) blockers.push(`PACKAGE_BATCH_MISMATCH:${packageReport.targetBatchId ?? ''}`);

if (input.packageVersion !== 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1') blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
if (input.targetBatchId !== EXPECTED.targetBatchId) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
if (input.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

pushExpected(blockers, 'INPUT_ROWS', inputCounts.total, EXPECTED.packageRows);
pushExpected(blockers, 'INPUT_PENDING_ROWS', inputCounts.pending, 0);
pushExpected(blockers, 'INPUT_NEEDS_RETRACE_ROWS', inputCounts.needsRetrace, EXPECTED.packageRows);
pushExpected(blockers, 'INPUT_APPROVED_ROWS', inputCounts.approved, 0);
pushExpected(blockers, 'INPUT_DECIDED_ROWS', inputCounts.decided, EXPECTED.packageRows);
pushExpected(blockers, 'INPUT_P3_ROWS', inputCounts.p3, EXPECTED.p3Rows);
pushExpected(blockers, 'INPUT_P4_ROWS', inputCounts.p4, EXPECTED.p4Rows);
pushExpected(blockers, 'INPUT_FILLED_PATH_ROWS', inputCounts.filledPath, 0);
pushExpected(blockers, 'INPUT_FILLED_LABEL_X_ROWS', inputCounts.filledLabelX, 0);
pushExpected(blockers, 'INPUT_FILLED_LABEL_Y_ROWS', inputCounts.filledLabelY, 0);
pushExpected(blockers, 'INPUT_FILLED_REVIEWER_ROWS', inputCounts.filledReviewer, 0);
pushExpected(blockers, 'INPUT_FILLED_REVIEWED_AT_ROWS', inputCounts.filledReviewedAt, 0);
pushExpected(blockers, 'INPUT_EVIDENCE_ROWS', inputCounts.evidenceCrop, EXPECTED.evidenceCropRows);

const summary = {
  auditVersion: AUDIT_VERSION,
  status: blockers.length === 0 ? 'ok' : 'failed',
  p3p4ReportDir: path.relative(frontendRoot, p3p4ReportDir),
  packageReport: path.relative(frontendRoot, packagePath),
  input: path.relative(frontendRoot, inputPath),
  targetBatchId: EXPECTED.targetBatchId,
  packageCounts: {
    totalRows: packageReport.totalRows,
    expectedRows: packageReport.expectedRows,
    p3Rows: packageReport.p3Rows,
    p4Rows: packageReport.p4Rows,
    manualTraceRequiredRows: packageReport.manualTraceRequiredRows,
    correctedPathRequiredRows: packageReport.correctedPathRequiredRows,
    labelAndHitAreaRows: packageReport.labelAndHitAreaRows,
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

const jsonPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-audit.json');
const csvPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-audit.csv');
const markdownPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-audit.md');

await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'status',
    'targetBatchId',
    'packageRows',
    'p3Rows',
    'p4Rows',
    'manualTraceRequiredRows',
    'correctedPathRequiredRows',
    'labelAndHitAreaRows',
    'evidenceCropRows',
    'inputRows',
    'inputPending',
    'inputNeedsRetrace',
    'inputApproved',
    'inputDecided',
    'inputFilledPath',
    'blockers',
  ],
  [
    summary.status,
    summary.targetBatchId,
    summary.packageCounts.totalRows,
    summary.packageCounts.p3Rows,
    summary.packageCounts.p4Rows,
    summary.packageCounts.manualTraceRequiredRows,
    summary.packageCounts.correctedPathRequiredRows,
    summary.packageCounts.labelAndHitAreaRows,
    summary.packageCounts.evidenceCropRows,
    summary.inputCounts.total,
    summary.inputCounts.pending,
    summary.inputCounts.needsRetrace,
    summary.inputCounts.approved,
    summary.inputCounts.decided,
    summary.inputCounts.filledPath,
    summary.blockers.join(' '),
  ],
]);
await fs.writeFile(markdownPath, [
  '# 대구 P3/P4 operator audit',
  '',
  `- audit version: \`${AUDIT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- package report: \`${summary.packageReport}\``,
  `- input: \`${summary.input}\``,
  '',
  '## Expected Counts',
  '',
  `- P3/P4 rows: ${summary.packageCounts.totalRows}`,
  `- P3 rows: ${summary.packageCounts.p3Rows}`,
  `- P4 rows: ${summary.packageCounts.p4Rows}`,
  `- manual trace required: ${summary.packageCounts.manualTraceRequiredRows}`,
  `- corrected path required: ${summary.packageCounts.correctedPathRequiredRows}`,
  `- label and hit-area review: ${summary.packageCounts.labelAndHitAreaRows}`,
  `- evidence crop rows: ${summary.packageCounts.evidenceCropRows}`,
  '',
  '## Input File',
  '',
  `- rows: ${summary.inputCounts.total}`,
  `- pending: ${summary.inputCounts.pending}`,
  `- needsRetrace: ${summary.inputCounts.needsRetrace}`,
  `- approved: ${summary.inputCounts.approved}`,
  `- decided: ${summary.inputCounts.decided}`,
  `- P3 rows: ${summary.inputCounts.p3}`,
  `- P4 rows: ${summary.inputCounts.p4}`,
  `- filledPath: ${summary.inputCounts.filledPath}`,
  `- filledLabelX: ${summary.inputCounts.filledLabelX}`,
  `- filledLabelY: ${summary.inputCounts.filledLabelY}`,
  `- filledReviewer: ${summary.inputCounts.filledReviewer}`,
  `- filledReviewedAt: ${summary.inputCounts.filledReviewedAt}`,
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
].join('\n'), 'utf8');

console.log(`p3_p4_operator_audit_json:${jsonPath}`);
console.log(`p3_p4_operator_audit_csv:${csvPath}`);
console.log(`p3_p4_operator_audit_markdown:${markdownPath}`);
console.log(`status:${summary.status} rows=${inputCounts.total} p3=${inputCounts.p3} p4=${inputCounts.p4} pending=${inputCounts.pending} approved=${inputCounts.approved}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
