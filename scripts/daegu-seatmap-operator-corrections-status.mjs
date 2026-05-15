import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const STATUS_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_STATUS_V1';
const RELEASE_CLASSIFICATION_BLOCKED_BY_OPERATOR_REVIEW = 'BLOCKED_BY_OPERATOR_REVIEW';
const RELEASE_CLASSIFICATION_READY_FOR_OPERATOR_WRITE = 'READY_FOR_OPERATOR_WRITE';
const RELEASE_CLASSIFICATION_FAIL = 'FAIL';

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

const readReport = async (label, filePath) => {
  try {
    return {
      label,
      path: filePath,
      relativePath: path.relative(frontendRoot, filePath),
      exists: true,
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: '',
    };
  } catch (error) {
    return {
      label,
      path: filePath,
      relativePath: path.relative(frontendRoot, filePath),
      exists: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const summaryOf = (report) => report.data?.summary ?? report.data ?? {};

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const boolOrFalse = (value) => value === true;

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const reports = {
  alignment: await readReport('alignment', path.join(reportDir, 'daegu-seatmap-alignment-audit.json')),
  handoff: await readReport('handoff', path.join(reportDir, 'daegu-seatmap-operator-handoff.json')),
  template: await readReport('template', path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json')),
  validation: await readReport('validation', path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.json')),
  preview: await readReport('preview', path.join(reportDir, 'daegu-seatmap-operator-corrections-preview.json')),
  apply: await readReport('apply', path.join(reportDir, 'daegu-seatmap-operator-corrections-apply.json')),
  batches: await readReport('batches', path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.json')),
  writeSmoke: await readReport(
    'writeSmoke',
    path.join(
      reportDir,
      'daegu-seatmap-operator-corrections-write-smoke',
      'daegu-seatmap-operator-corrections-write-smoke.json',
    ),
  ),
};

const alignmentSummary = summaryOf(reports.alignment);
const handoffSummary = summaryOf(reports.handoff);
const templateRows = Array.isArray(reports.template.data?.corrections)
  ? reports.template.data.corrections.length
  : 0;
const validationSummary = summaryOf(reports.validation);
const previewSummary = summaryOf(reports.preview);
const applySummary = summaryOf(reports.apply);
const batchesSummary = summaryOf(reports.batches);
const writeSmokeSummary = summaryOf(reports.writeSmoke);

const totalBlocks = numberOrZero(alignmentSummary.totalBlocks ?? handoffSummary.totalBlocks);
const lockedVerified = numberOrZero(alignmentSummary.lockedVerified ?? handoffSummary.lockedVerified);
const retraceRequired = numberOrZero(alignmentSummary.retraceRequired ?? handoffSummary.retraceRequired);
const operatorRequired = numberOrZero(alignmentSummary.operatorRequired ?? handoffSummary.operatorRequired);
const handoffTargets = numberOrZero(handoffSummary.targetBlocks);
const approvedRows = numberOrZero(validationSummary.approvedRows ?? previewSummary.approvedRows ?? applySummary.approvedRows);
const validApprovedRows = numberOrZero(
  validationSummary.validApprovedRows
    ?? previewSummary.validApprovedRows
    ?? applySummary.validApprovedRows,
);
const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows ?? previewSummary.invalidApprovedRows);
const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
const previewRows = numberOrZero(previewSummary.previewRows);
const applyPlannedRows = numberOrZero(applySummary.plannedRows);
const readyBatchId = String(batchesSummary.readyBatchId ?? '');
const approvedBatchCount = numberOrZero(batchesSummary.approvedBatchCount);
const batchReadyApprovedRows = numberOrZero(batchesSummary.readyBatchApprovedRows);
const outOfOrderApprovedRows = numberOrZero(batchesSummary.outOfOrderApprovedRows);
const remainingOperatorRows = Math.max(handoffTargets - approvedRows, 0);
const remainingValidatedRows = Math.max(handoffTargets - validApprovedRows, 0);

const blockers = [];
Object.values(reports).forEach((report) => {
  if (!report.exists) blockers.push(`MISSING_REPORT:${report.relativePath}`);
});

if (reports.alignment.exists && totalBlocks !== 177) blockers.push(`DAEGU_BLOCK_CONTRACT_CHANGED:${totalBlocks}`);
if (reports.handoff.exists && handoffTargets !== retraceRequired + operatorRequired) {
  blockers.push('HANDOFF_TARGETS_DO_NOT_MATCH_AUDIT_RETRACE_PLUS_OPERATOR');
}
if (reports.template.exists && reports.handoff.exists && templateRows !== handoffTargets) {
  blockers.push(`TEMPLATE_ROWS_DO_NOT_MATCH_HANDOFF_TARGETS:${templateRows}:${handoffTargets}`);
}
if (reports.validation.exists && validationSummary.status !== 'ok') blockers.push('VALIDATION_STATUS_NOT_OK');
if (invalidApprovedRows > 0) blockers.push(`VALIDATION_HAS_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
if (invalidMetadataRows > 0) blockers.push(`VALIDATION_HAS_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
if (approvedRows > 0 && validApprovedRows !== approvedRows) {
  blockers.push(`VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows}`);
}
if (reports.preview.exists && previewSummary.status !== 'ok') blockers.push('PREVIEW_STATUS_NOT_OK');
if (approvedRows > 0 && previewRows !== approvedRows) {
  blockers.push(`PREVIEW_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${previewRows}:${approvedRows}`);
}
if (reports.apply.exists && applySummary.status !== 'ok') blockers.push('APPLY_STATUS_NOT_OK');
if (reports.apply.exists && applySummary.mode !== 'dry-run') blockers.push(`APPLY_REPORT_NOT_DRY_RUN:${applySummary.mode}`);
if (reports.apply.exists && boolOrFalse(applySummary.dataFileChanged)) blockers.push('DRY_RUN_APPLY_CHANGED_DATA_FILE');
if (approvedRows > 0 && applyPlannedRows !== validApprovedRows) {
  blockers.push(`APPLY_PLANNED_ROWS_DO_NOT_MATCH_VALID_APPROVED_ROWS:${applyPlannedRows}:${validApprovedRows}`);
}
if (reports.batches.exists && batchesSummary.status !== 'ready' && approvedRows > 0) {
  blockers.push(`BATCH_STATUS_NOT_READY:${batchesSummary.status ?? 'missing'}`);
}
if (reports.batches.exists && approvedRows > 0 && approvedBatchCount !== 1) {
  blockers.push(`APPROVED_ROWS_MUST_BE_SINGLE_BATCH:${approvedBatchCount}`);
}
if (reports.batches.exists && approvedRows > 0 && !readyBatchId) {
  blockers.push('NO_READY_OPERATOR_CORRECTIONS_BATCH');
}
if (reports.batches.exists && approvedRows > 0 && outOfOrderApprovedRows > 0) {
  blockers.push(`APPROVED_ROWS_OUT_OF_PRIORITY_ORDER:${outOfOrderApprovedRows}`);
}
if (reports.batches.exists && approvedRows > 0 && batchReadyApprovedRows !== approvedRows) {
  blockers.push(`READY_BATCH_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${batchReadyApprovedRows}:${approvedRows}`);
}
if (reports.writeSmoke.exists && writeSmokeSummary.status !== 'ok') blockers.push('WRITE_SMOKE_STATUS_NOT_OK');
if (reports.writeSmoke.exists && !boolOrFalse(writeSmokeSummary.productionDataUnchanged)) {
  blockers.push('WRITE_SMOKE_PRODUCTION_DATA_CHANGED');
}
if (reports.writeSmoke.exists && !boolOrFalse(writeSmokeSummary.temporaryDataChanged)) {
  blockers.push('WRITE_SMOKE_TEMPORARY_DATA_NOT_CHANGED');
}
if (reports.writeSmoke.exists && !boolOrFalse(writeSmokeSummary.validationAcceptedSyntheticRow)) {
  blockers.push('WRITE_SMOKE_VALIDATION_DID_NOT_ACCEPT_SYNTHETIC_ROW');
}
if (reports.writeSmoke.exists && !boolOrFalse(writeSmokeSummary.applyWroteTempFile)) {
  blockers.push('WRITE_SMOKE_APPLY_DID_NOT_WRITE_TEMP_FILE');
}
if (approvedRows === 0) blockers.push('NO_APPROVED_OPERATOR_CORRECTIONS');

const readyForWrite = blockers.length === 0;
const warnings = [];
if (remainingOperatorRows > 0) warnings.push(`OPERATOR_ROWS_REMAINING:${remainingOperatorRows}`);
if (remainingValidatedRows > 0) warnings.push(`VALIDATED_ROWS_REMAINING:${remainingValidatedRows}`);
if (previewRows === 0) warnings.push('NO_PREVIEW_ROWS');
if (applyPlannedRows === 0) warnings.push('NO_APPLY_ROWS');

const releaseClassification = remainingOperatorRows > 0
  ? RELEASE_CLASSIFICATION_BLOCKED_BY_OPERATOR_REVIEW
  : readyForWrite
    ? RELEASE_CLASSIFICATION_READY_FOR_OPERATOR_WRITE
    : RELEASE_CLASSIFICATION_FAIL;
const releaseClassificationReason = releaseClassification === RELEASE_CLASSIFICATION_BLOCKED_BY_OPERATOR_REVIEW
  ? `operator approval required for ${remainingOperatorRows} row(s); source geometry must not be promoted automatically`
  : releaseClassification === RELEASE_CLASSIFICATION_READY_FOR_OPERATOR_WRITE
    ? 'operator corrections are validated and ready for the guarded write step'
    : `operator correction gate failed: ${blockers.join(', ') || 'unknown blocker'}`;

const summary = {
  statusVersion: STATUS_VERSION,
  status: readyForWrite ? 'ready' : 'blocked',
  releaseClassification,
  releaseClassificationReason,
  readyForWrite,
  totalBlocks,
  lockedVerified,
  retraceRequired,
  operatorRequired,
  handoffTargets,
  templateRows,
  approvedRows,
  validApprovedRows,
  invalidApprovedRows,
  invalidMetadataRows,
  previewRows,
  applyPlannedRows,
  readyBatchId,
  approvedBatchCount,
  outOfOrderApprovedRows,
  remainingOperatorRows,
  remainingValidatedRows,
  alignmentStatus: reports.alignment.exists ? 'ok' : 'missing',
  validationStatus: validationSummary.status ?? '',
  previewStatus: previewSummary.status ?? '',
  applyStatus: applySummary.status ?? '',
  writeSmokeStatus: writeSmokeSummary.status ?? '',
  productionDataUnchanged: writeSmokeSummary.productionDataUnchanged ?? false,
  temporaryDataChanged: writeSmokeSummary.temporaryDataChanged ?? false,
  blockers,
  warnings,
  nextOperatorCommand: 'npm run stadium:daegu:operator-corrections',
  safeWriteCommand: 'npm run stadium:daegu:operator-corrections-write',
  postWriteGateCommand: 'npm run stadium:daegu:operator-corrections-postwrite-gate',
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  sourceReports: Object.fromEntries(
    Object.entries(reports).map(([key, sourceReport]) => [
      key,
      {
        path: sourceReport.relativePath,
        exists: sourceReport.exists,
        error: sourceReport.error,
      },
    ]),
  ),
  nextActions: readyForWrite
    ? [
      'Review daegu-seatmap-operator-corrections-preview.svg.',
      'Run npm run stadium:daegu:operator-corrections-write.',
      'Run npm run stadium:daegu:operator-corrections-postwrite-gate after write.',
    ]
    : [
      'Fill operatorDecision=APPROVED rows with operator-provided correctedPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt.',
      'Run npm run stadium:daegu:operator-corrections.',
      'Run npm run stadium:daegu:operator-corrections-apply and npm run stadium:daegu:operator-corrections-write-smoke.',
      'Run npm run stadium:daegu:operator-corrections-batches to confirm the current priority batch.',
      'Re-run this status command before production write.',
    ],
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-status.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-status.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-status.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'status',
    'readyForWrite',
    'totalBlocks',
    'lockedVerified',
    'handoffTargets',
    'templateRows',
    'approvedRows',
    'validApprovedRows',
    'invalidApprovedRows',
    'previewRows',
    'applyPlannedRows',
    'readyBatchId',
    'approvedBatchCount',
    'outOfOrderApprovedRows',
    'remainingOperatorRows',
    'writeSmokeStatus',
    'productionDataUnchanged',
    'blockers',
    'warnings',
  ],
  [
    summary.status,
    summary.readyForWrite,
    summary.totalBlocks,
    summary.lockedVerified,
    summary.handoffTargets,
    summary.templateRows,
    summary.approvedRows,
    summary.validApprovedRows,
    summary.invalidApprovedRows,
    summary.previewRows,
    summary.applyPlannedRows,
    summary.readyBatchId,
    summary.approvedBatchCount,
    summary.outOfOrderApprovedRows,
    summary.remainingOperatorRows,
    summary.writeSmokeStatus,
    summary.productionDataUnchanged,
    summary.blockers.join(' '),
    summary.warnings.join(' '),
  ],
]);
await fs.writeFile(markdownPath, [
  '# 대구 좌석도 operator corrections status',
  '',
  `- status version: \`${STATUS_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- release classification: \`${summary.releaseClassification}\``,
  `- release classification reason: ${summary.releaseClassificationReason}`,
  `- ready for write: ${summary.readyForWrite}`,
  `- total blocks: ${summary.totalBlocks}`,
  `- locked verified: ${summary.lockedVerified}`,
  `- handoff targets: ${summary.handoffTargets}`,
  `- template rows: ${summary.templateRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- valid approved rows: ${summary.validApprovedRows}`,
  `- preview rows: ${summary.previewRows}`,
  `- apply planned rows: ${summary.applyPlannedRows}`,
  `- ready batch: \`${summary.readyBatchId || '-'}\``,
  `- approved batch count: ${summary.approvedBatchCount}`,
  `- out-of-order approved rows: ${summary.outOfOrderApprovedRows}`,
  `- remaining operator rows: ${summary.remainingOperatorRows}`,
  `- write smoke status: \`${summary.writeSmokeStatus || 'missing'}\``,
  `- production data unchanged in write smoke: ${summary.productionDataUnchanged}`,
  `- safe write command: \`${summary.safeWriteCommand}\``,
  `- post-write gate command: \`${summary.postWriteGateCommand}\``,
  '',
  '## Gate',
  '',
  '1. `readyForWrite=true`일 때만 production write를 진행합니다.',
  '2. `NO_APPROVED_OPERATOR_CORRECTIONS`가 있으면 운영자 corrected path가 아직 없다는 뜻입니다.',
  '3. 승인 row는 한 번에 하나의 priority batch에만 있어야 하며, 이전 batch에 pending row가 남아 있으면 write하지 않습니다.',
  '4. write 전에는 preview SVG와 validation/apply/batches/status 리포트를 함께 검수합니다.',
  '5. write 후에는 alignment audit, seatmap tests, Daegu full QA를 다시 통과해야 합니다.',
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
  '## Source Reports',
  '',
  markdownTable(
    ['report', 'exists', 'path', 'error'],
    Object.entries(report.sourceReports).map(([key, sourceReport]) => [
      key,
      String(sourceReport.exists),
      `\`${sourceReport.path}\``,
      sourceReport.error || '-',
    ]),
  ),
  '',
  '## Next Actions',
  '',
  report.nextActions.map((action, index) => `${index + 1}. ${action}`).join('\n'),
  '',
].join('\n'), 'utf8');

console.log(`corrections_status_json:${jsonPath}`);
console.log(`corrections_status_csv:${csvPath}`);
console.log(`corrections_status_markdown:${markdownPath}`);
console.log(`status:${summary.status} releaseClassification=${summary.releaseClassification} readyForWrite=${summary.readyForWrite} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows} remainingOperatorRows=${summary.remainingOperatorRows}`);
