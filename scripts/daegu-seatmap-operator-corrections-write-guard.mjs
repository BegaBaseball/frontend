import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const GUARD_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_WRITE_GUARD_V1';
const REQUIRED_STATUS_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_STATUS_V1';

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

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const statusPath = path.resolve(
  frontendRoot,
  argValue('--status', path.join('reports/stadium', 'daegu-seatmap-operator-corrections-status.json')),
);

let statusReport = null;
let statusReadError = '';
try {
  statusReport = await readJson(statusPath);
} catch (error) {
  statusReadError = error instanceof Error ? error.message : String(error);
}

const statusSummary = statusReport?.summary ?? {};
const approvedRows = numberOrZero(statusSummary.approvedRows);
const validApprovedRows = numberOrZero(statusSummary.validApprovedRows);
const previewRows = numberOrZero(statusSummary.previewRows);
const applyPlannedRows = numberOrZero(statusSummary.applyPlannedRows);
const readyBatchId = String(statusSummary.readyBatchId ?? '');
const approvedBatchCount = numberOrZero(statusSummary.approvedBatchCount);
const outOfOrderApprovedRows = numberOrZero(statusSummary.outOfOrderApprovedRows);
const statusBlockers = Array.isArray(statusSummary.blockers) ? statusSummary.blockers : [];
const blockers = [];

if (!statusReport) blockers.push(`STATUS_REPORT_UNREADABLE:${statusReadError}`);
if (statusSummary.statusVersion !== REQUIRED_STATUS_VERSION) blockers.push('STATUS_VERSION_MISMATCH');
if (statusSummary.status !== 'ready') blockers.push(`STATUS_NOT_READY:${statusSummary.status ?? ''}`);
if (statusSummary.readyForWrite !== true) blockers.push('READY_FOR_WRITE_NOT_TRUE');
if (statusBlockers.length > 0) blockers.push(`STATUS_HAS_BLOCKERS:${statusBlockers.join(' ')}`);
if (approvedRows <= 0) blockers.push('NO_APPROVED_OPERATOR_CORRECTIONS');
if (validApprovedRows <= 0) blockers.push('NO_VALID_APPROVED_OPERATOR_CORRECTIONS');
if (approvedRows !== validApprovedRows) blockers.push(`APPROVED_ROWS_NOT_ALL_VALID:${approvedRows}:${validApprovedRows}`);
if (previewRows !== approvedRows) blockers.push(`PREVIEW_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${previewRows}:${approvedRows}`);
if (applyPlannedRows !== validApprovedRows) {
  blockers.push(`APPLY_PLANNED_ROWS_DO_NOT_MATCH_VALID_APPROVED_ROWS:${applyPlannedRows}:${validApprovedRows}`);
}
if (approvedRows > 0 && !readyBatchId) blockers.push('NO_READY_OPERATOR_CORRECTIONS_BATCH');
if (approvedRows > 0 && approvedBatchCount !== 1) blockers.push(`APPROVED_ROWS_MUST_BE_SINGLE_BATCH:${approvedBatchCount}`);
if (outOfOrderApprovedRows > 0) blockers.push(`APPROVED_ROWS_OUT_OF_PRIORITY_ORDER:${outOfOrderApprovedRows}`);
if (statusSummary.validationStatus !== 'ok') blockers.push(`VALIDATION_STATUS_NOT_OK:${statusSummary.validationStatus ?? ''}`);
if (statusSummary.previewStatus !== 'ok') blockers.push(`PREVIEW_STATUS_NOT_OK:${statusSummary.previewStatus ?? ''}`);
if (statusSummary.applyStatus !== 'ok') blockers.push(`APPLY_STATUS_NOT_OK:${statusSummary.applyStatus ?? ''}`);
if (statusSummary.writeSmokeStatus !== 'ok') blockers.push(`WRITE_SMOKE_STATUS_NOT_OK:${statusSummary.writeSmokeStatus ?? ''}`);
if (statusSummary.productionDataUnchanged !== true) blockers.push('WRITE_SMOKE_PRODUCTION_DATA_NOT_UNCHANGED');
if (statusSummary.temporaryDataChanged !== true) blockers.push('WRITE_SMOKE_TEMPORARY_DATA_NOT_CHANGED');

const passed = blockers.length === 0;
const summary = {
  guardVersion: GUARD_VERSION,
  status: passed ? 'ok' : 'blocked',
  passed,
  statusReport: path.relative(frontendRoot, statusPath),
  statusVersion: statusSummary.statusVersion ?? '',
  readyForWrite: statusSummary.readyForWrite === true,
  approvedRows,
  validApprovedRows,
  previewRows,
  applyPlannedRows,
  readyBatchId,
  approvedBatchCount,
  outOfOrderApprovedRows,
  validationStatus: statusSummary.validationStatus ?? '',
  previewStatus: statusSummary.previewStatus ?? '',
  applyStatus: statusSummary.applyStatus ?? '',
  writeSmokeStatus: statusSummary.writeSmokeStatus ?? '',
  productionDataUnchanged: statusSummary.productionDataUnchanged === true,
  temporaryDataChanged: statusSummary.temporaryDataChanged === true,
  blockers,
  statusBlockers,
  guardedWriteCommand: 'npm run stadium:daegu:operator-corrections-write',
  postWriteGateCommand: 'npm run stadium:daegu:operator-corrections-postwrite-gate',
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This guard must pass before daeguSeatData.ts can be modified by operator corrections write.',
    'The guard requires a fresh ready status report, valid approved rows, successful write-smoke, and no status blockers.',
    'If this guard is blocked, operator-corrections-write must stop before invoking apply --write.',
  ],
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-write-guard.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-write-guard.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-write-guard.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'status',
    'passed',
    'readyForWrite',
    'approvedRows',
    'validApprovedRows',
    'previewRows',
    'applyPlannedRows',
    'readyBatchId',
    'approvedBatchCount',
    'outOfOrderApprovedRows',
    'writeSmokeStatus',
    'productionDataUnchanged',
    'blockers',
  ],
  [
    summary.status,
    summary.passed,
    summary.readyForWrite,
    summary.approvedRows,
    summary.validApprovedRows,
    summary.previewRows,
    summary.applyPlannedRows,
    summary.readyBatchId,
    summary.approvedBatchCount,
    summary.outOfOrderApprovedRows,
    summary.writeSmokeStatus,
    summary.productionDataUnchanged,
    summary.blockers.join(' '),
  ],
]);
await fs.writeFile(markdownPath, [
  '# 대구 좌석도 operator corrections write guard',
  '',
  `- guard version: \`${GUARD_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- passed: ${summary.passed}`,
  `- status report: \`${summary.statusReport}\``,
  `- ready for write: ${summary.readyForWrite}`,
  `- approved rows: ${summary.approvedRows}`,
  `- valid approved rows: ${summary.validApprovedRows}`,
  `- preview rows: ${summary.previewRows}`,
  `- apply planned rows: ${summary.applyPlannedRows}`,
  `- ready batch: \`${summary.readyBatchId || '-'}\``,
  `- approved batch count: ${summary.approvedBatchCount}`,
  `- out-of-order approved rows: ${summary.outOfOrderApprovedRows}`,
  `- write smoke status: \`${summary.writeSmokeStatus || 'missing'}\``,
  `- production data unchanged: ${summary.productionDataUnchanged}`,
  '',
  '## Gate',
  '',
  '1. 이 guard가 통과해야만 `operator-corrections-write`가 `apply --write`를 호출합니다.',
  '2. `NO_APPROVED_OPERATOR_CORRECTIONS`가 있으면 production data를 수정하지 않습니다.',
  '3. status report가 `readyForWrite=true`가 아니면 production data를 수정하지 않습니다.',
  '4. 승인 row가 단일 priority batch로 묶이지 않으면 production data를 수정하지 않습니다.',
  '5. write-smoke가 production data unchanged를 증명하지 못하면 production data를 수정하지 않습니다.',
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Status Blockers',
  '',
  summary.statusBlockers.length > 0
    ? summary.statusBlockers.map((blocker) => `- \`${blocker}\``).join('\n')
    : 'No status blockers.',
  '',
].join('\n'), 'utf8');

console.log(`write_guard_json:${jsonPath}`);
console.log(`write_guard_csv:${csvPath}`);
console.log(`write_guard_markdown:${markdownPath}`);
console.log(`status:${summary.status} passed=${summary.passed} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows}`);

if (!passed) {
  process.exitCode = 1;
}
