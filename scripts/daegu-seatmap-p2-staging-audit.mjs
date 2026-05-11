import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP2ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-draft');

const AUDIT_VERSION = 'DAEGU_P2_STAGING_AUDIT_V1';
const EXPECTED = {
  p2Rows: 50,
  validApprovedRows: 16,
  invalidApprovedRows: 34,
  manualRetraceRequired: 34,
  labelAndHitAreaReview: 2,
  visualApprovalCandidates: 14,
  approvalCandidateRows: 16,
  manualRetraceRows: 34,
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

const countRows = (rows) => ({
  total: rows.length,
  pending: rows.filter((row) => row.operatorDecision === 'PENDING').length,
  approved: rows.filter((row) => row.operatorDecision === 'APPROVED').length,
  filledPath: rows.filter((row) => !isBlank(row.correctedPath)).length,
  filledLabelX: rows.filter((row) => !isBlank(row.correctedLabelX)).length,
  filledLabelY: rows.filter((row) => !isBlank(row.correctedLabelY)).length,
  filledReviewer: rows.filter((row) => !isBlank(row.reviewer)).length,
  filledReviewedAt: rows.filter((row) => !isBlank(row.reviewedAt)).length,
});

const pushExpected = (blockers, label, actual, expected) => {
  if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
};

const p2ReportDir = path.resolve(frontendRoot, argValue('--p2-report-dir', defaultP2ReportDir));
const packagePath = path.join(p2ReportDir, 'daegu-seatmap-p2-review-package.json');
const approvalCandidatesPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-approval-candidates.json');
const manualRetracePath = path.join(p2ReportDir, 'daegu-seatmap-p2-manual-retrace-template.json');

const packageReport = await readJson(packagePath);
const approvalCandidates = await readJson(approvalCandidatesPath);
const manualRetrace = await readJson(manualRetracePath);

const approvalRows = approvalCandidates.corrections ?? [];
const manualRows = manualRetrace.corrections ?? [];
const approvalCounts = countRows(approvalRows);
const manualCounts = countRows(manualRows);
const dynamicExpected = {
  p2Rows: Number(packageReport.p2Rows ?? 0),
  validApprovedRows: Number(packageReport.validApprovedRows ?? 0),
  invalidApprovedRows: Number(packageReport.invalidApprovedRows ?? 0),
  manualRetraceRequired: Number(packageReport.manualRetraceRequired ?? 0),
  labelAndHitAreaReview: Number(packageReport.labelAndHitAreaReview ?? 0),
  visualApprovalCandidates: Number(packageReport.visualApprovalCandidates ?? 0),
  approvalCandidateRows: Number(packageReport.labelAndHitAreaReview ?? 0)
    + Number(packageReport.visualApprovalCandidates ?? 0),
  manualRetraceRows: Number(packageReport.manualRetraceRequired ?? 0),
};
const blockers = [];

pushExpected(blockers, 'PACKAGE_BUCKET_TOTAL', dynamicExpected.manualRetraceRequired + dynamicExpected.approvalCandidateRows, dynamicExpected.p2Rows);
pushExpected(blockers, 'PACKAGE_VALIDATION_TOTAL', dynamicExpected.validApprovedRows + dynamicExpected.invalidApprovedRows, dynamicExpected.p2Rows);
if (packageReport.status !== 'ok') blockers.push(`PACKAGE_STATUS_NOT_OK:${packageReport.status ?? ''}`);

if (approvalCandidates.stagingOnly !== true) blockers.push('APPROVAL_CANDIDATES_NOT_STAGING_ONLY');
pushExpected(blockers, 'APPROVAL_CANDIDATE_ROWS', approvalCounts.total, dynamicExpected.approvalCandidateRows);
pushExpected(blockers, 'APPROVAL_CANDIDATE_PENDING_ROWS', approvalCounts.pending, dynamicExpected.approvalCandidateRows);
pushExpected(blockers, 'APPROVAL_CANDIDATE_APPROVED_ROWS', approvalCounts.approved, 0);
pushExpected(blockers, 'APPROVAL_CANDIDATE_FILLED_PATH_ROWS', approvalCounts.filledPath, dynamicExpected.approvalCandidateRows);
pushExpected(blockers, 'APPROVAL_CANDIDATE_FILLED_REVIEWER_ROWS', approvalCounts.filledReviewer, 0);
pushExpected(blockers, 'APPROVAL_CANDIDATE_FILLED_REVIEWED_AT_ROWS', approvalCounts.filledReviewedAt, 0);

if (manualRetrace.stagingOnly !== true) blockers.push('MANUAL_RETRACE_NOT_STAGING_ONLY');
pushExpected(blockers, 'MANUAL_RETRACE_ROWS', manualCounts.total, dynamicExpected.manualRetraceRows);
pushExpected(blockers, 'MANUAL_RETRACE_PENDING_ROWS', manualCounts.pending, dynamicExpected.manualRetraceRows);
pushExpected(blockers, 'MANUAL_RETRACE_APPROVED_ROWS', manualCounts.approved, 0);
pushExpected(blockers, 'MANUAL_RETRACE_FILLED_PATH_ROWS', manualCounts.filledPath, 0);
pushExpected(blockers, 'MANUAL_RETRACE_FILLED_LABEL_X_ROWS', manualCounts.filledLabelX, 0);
pushExpected(blockers, 'MANUAL_RETRACE_FILLED_LABEL_Y_ROWS', manualCounts.filledLabelY, 0);
pushExpected(blockers, 'MANUAL_RETRACE_FILLED_REVIEWER_ROWS', manualCounts.filledReviewer, 0);
pushExpected(blockers, 'MANUAL_RETRACE_FILLED_REVIEWED_AT_ROWS', manualCounts.filledReviewedAt, 0);

const summary = {
  auditVersion: AUDIT_VERSION,
  status: blockers.length === 0 ? 'ok' : 'failed',
  p2ReportDir: path.relative(frontendRoot, p2ReportDir),
  packageReport: path.relative(frontendRoot, packagePath),
  approvalCandidates: path.relative(frontendRoot, approvalCandidatesPath),
  manualRetrace: path.relative(frontendRoot, manualRetracePath),
  packageCounts: {
    p2Rows: packageReport.p2Rows,
    baselineP2Rows: EXPECTED.p2Rows,
    validApprovedRows: packageReport.validApprovedRows,
    invalidApprovedRows: packageReport.invalidApprovedRows,
    manualRetraceRequired: packageReport.manualRetraceRequired,
    labelAndHitAreaReview: packageReport.labelAndHitAreaReview,
    visualApprovalCandidates: packageReport.visualApprovalCandidates,
  },
  expectedCounts: dynamicExpected,
  approvalCandidateCounts: approvalCounts,
  manualRetraceCounts: manualCounts,
  blockers,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
};

const jsonPath = path.join(p2ReportDir, 'daegu-seatmap-p2-staging-audit.json');
const csvPath = path.join(p2ReportDir, 'daegu-seatmap-p2-staging-audit.csv');
const markdownPath = path.join(p2ReportDir, 'daegu-seatmap-p2-staging-audit.md');

await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'status',
    'p2Rows',
    'validApprovedRows',
    'invalidApprovedRows',
    'manualRetraceRequired',
    'labelAndHitAreaReview',
    'visualApprovalCandidates',
    'approvalCandidateRows',
    'approvalCandidatePending',
    'approvalCandidateApproved',
    'approvalCandidateFilledPath',
    'manualRetraceRows',
    'manualRetracePending',
    'manualRetraceApproved',
    'manualRetraceFilledPath',
    'blockers',
  ],
  [
    summary.status,
    summary.packageCounts.p2Rows,
    summary.packageCounts.validApprovedRows,
    summary.packageCounts.invalidApprovedRows,
    summary.packageCounts.manualRetraceRequired,
    summary.packageCounts.labelAndHitAreaReview,
    summary.packageCounts.visualApprovalCandidates,
    summary.approvalCandidateCounts.total,
    summary.approvalCandidateCounts.pending,
    summary.approvalCandidateCounts.approved,
    summary.approvalCandidateCounts.filledPath,
    summary.manualRetraceCounts.total,
    summary.manualRetraceCounts.pending,
    summary.manualRetraceCounts.approved,
    summary.manualRetraceCounts.filledPath,
    summary.blockers.join(' '),
  ],
]);
await fs.writeFile(markdownPath, [
  '# 대구 P2 staging audit',
  '',
  `- audit version: \`${AUDIT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- package report: \`${summary.packageReport}\``,
  `- approval candidates: \`${summary.approvalCandidates}\``,
  `- manual retrace: \`${summary.manualRetrace}\``,
  '',
  '## Expected Counts',
  '',
  `- P2 rows: ${summary.packageCounts.p2Rows}`,
  `- valid approved draft rows: ${summary.packageCounts.validApprovedRows}`,
  `- invalid approved draft rows: ${summary.packageCounts.invalidApprovedRows}`,
  `- manual retrace required: ${summary.packageCounts.manualRetraceRequired}`,
  `- label and hit area review: ${summary.packageCounts.labelAndHitAreaReview}`,
  `- visual approval candidates: ${summary.packageCounts.visualApprovalCandidates}`,
  '',
  '## Staging Files',
  '',
  `- approval candidates: rows=${approvalCounts.total}, pending=${approvalCounts.pending}, approved=${approvalCounts.approved}, filledPath=${approvalCounts.filledPath}`,
  `- manual retrace: rows=${manualCounts.total}, pending=${manualCounts.pending}, approved=${manualCounts.approved}, filledPath=${manualCounts.filledPath}`,
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
].join('\n'), 'utf8');

console.log(`p2_staging_audit_json:${jsonPath}`);
console.log(`p2_staging_audit_csv:${csvPath}`);
console.log(`p2_staging_audit_markdown:${markdownPath}`);
console.log(`status:${summary.status} approvalCandidates=${approvalCounts.total} manualRetrace=${manualCounts.total}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
