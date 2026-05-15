import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP0ReportDir = path.join(defaultReportDir, 'daegu-p0-operator');

const READINESS_VERSION = 'DAEGU_P0_OPERATOR_READINESS_V1';
const PACKAGE_VERSION = 'DAEGU_P0_OPERATOR_PACKAGE_V1';
const IMPORT_VERSION = 'DAEGU_P0_OPERATOR_IMPORT_V1';
const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
const TARGET_BATCH_ID = 'BATCH_1_P0';
const EXPECTED_ROWS = 3;
const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);

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

const readJsonReport = async (filePath) => {
  try {
    return {
      path: filePath,
      relativePath: path.relative(frontendRoot, filePath),
      exists: true,
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: '',
    };
  } catch (error) {
    return {
      path: filePath,
      relativePath: path.relative(frontendRoot, filePath),
      exists: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const isBlank = (value) => String(value ?? '').trim() === '';

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const boolOrFalse = (value) => value === true;

const p0ReportDir = path.resolve(frontendRoot, argValue('--p0-report-dir', defaultP0ReportDir));
const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const packagePath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-package.json');
const inputPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.json');
const validationPath = path.join(p0ReportDir, 'daegu-seatmap-operator-corrections-validation.json');
const importPath = path.join(reportDir, 'daegu-seatmap-p0-operator-import.json');

const reports = {
  package: await readJsonReport(packagePath),
  input: await readJsonReport(inputPath),
  validation: await readJsonReport(validationPath),
  import: await readJsonReport(importPath),
};

const packageReport = reports.package.data ?? {};
const input = reports.input.data ?? {};
const validationSummary = reports.validation.data?.summary ?? {};
const importSummary = reports.import.data?.summary ?? {};
const validationRows = Array.isArray(reports.validation.data?.rows) ? reports.validation.data.rows : [];
const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));
const expectedRows = Number.isFinite(Number(packageReport.totalRows))
  ? Number(packageReport.totalRows)
  : EXPECTED_ROWS;

const rows = inputRows.map((row) => {
  const decision = normalizeDecision(row.operatorDecision);
  const validationRow = validationByBlockId.get(row.blockId) ?? {};
  return {
    blockId: row.blockId,
    block: row.block,
    decision,
    pending: decision === 'PENDING',
    approved: decision === 'APPROVED',
    rejected: decision === 'REJECTED',
    needsRetrace: decision === 'NEEDS_RETRACE',
    invalidDecision: !DECISION_OPTIONS.has(decision),
    hasCorrectedPath: !isBlank(row.correctedPath),
    hasCorrectedLabelX: !isBlank(row.correctedLabelX),
    hasCorrectedLabelY: !isBlank(row.correctedLabelY),
    hasReviewer: !isBlank(row.reviewer),
    hasReviewedAt: !isBlank(row.reviewedAt),
    validForApproval: validationRow.validForApproval === true,
    reasons: Array.isArray(validationRow.reasons) ? validationRow.reasons : [],
    warnings: Array.isArray(validationRow.warnings) ? validationRow.warnings : [],
  };
});

const pendingRows = rows.filter((row) => row.pending);
const decidedRows = rows.filter((row) => !row.pending);
const approvedRows = rows.filter((row) => row.approved);
const rejectedRows = rows.filter((row) => row.rejected);
const needsRetraceRows = rows.filter((row) => row.needsRetrace);
const invalidDecisionRows = rows.filter((row) => row.invalidDecision);
const filledPathRows = rows.filter((row) => row.hasCorrectedPath);
const filledReviewerRows = rows.filter((row) => row.hasReviewer);
const blockerRows = rows.filter((row) => row.reasons.length > 0);

const blockers = [];
const warnings = [];

Object.values(reports).forEach((report) => {
  if (!report.exists) blockers.push(`MISSING_REPORT:${report.relativePath}`);
});

if (reports.package.exists && packageReport.packageVersion !== PACKAGE_VERSION) {
  blockers.push(`PACKAGE_VERSION_MISMATCH:${packageReport.packageVersion ?? ''}`);
}
if (reports.package.exists && packageReport.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`PACKAGE_BATCH_MISMATCH:${packageReport.targetBatchId ?? ''}`);
}
if (reports.input.exists && input.packageVersion !== PACKAGE_VERSION) {
  blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (reports.input.exists && input.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
}
if (reports.input.exists && input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
if (reports.input.exists && input.productionWriteAllowed !== false) {
  blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
}
if (rows.length !== expectedRows) blockers.push(`P0_INPUT_ROW_COUNT_MISMATCH:${rows.length}:${expectedRows}`);
if (invalidDecisionRows.length > 0) {
  blockers.push(`INVALID_P0_OPERATOR_DECISION:${invalidDecisionRows.map((row) => row.blockId).join(' ')}`);
}
if (pendingRows.length > 0) {
  blockers.push(`P0_PENDING_ROWS_REMAIN:${pendingRows.map((row) => row.block).join(' ')}`);
}
if (decidedRows.length === 0) blockers.push('NO_P0_OPERATOR_DECISIONS');

if (reports.validation.exists && validationSummary.validationVersion !== VALIDATION_VERSION) {
  blockers.push(`VALIDATION_VERSION_MISMATCH:${validationSummary.validationVersion ?? ''}`);
}
if (reports.validation.exists && validationSummary.status !== 'ok') blockers.push('P0_VALIDATION_STATUS_NOT_OK');

const validationApprovedRows = numberOrZero(validationSummary.approvedRows);
const validApprovedRows = numberOrZero(validationSummary.validApprovedRows);
const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows);
const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
if (reports.validation.exists && validationApprovedRows !== approvedRows.length) {
  blockers.push(`P0_VALIDATION_APPROVED_ROWS_MISMATCH:${validationApprovedRows}:${approvedRows.length}`);
}
if (invalidApprovedRows > 0) blockers.push(`P0_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
if (invalidMetadataRows > 0) blockers.push(`P0_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
if (approvedRows.length > 0 && validApprovedRows !== approvedRows.length) {
  blockers.push(`P0_VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows.length}`);
}

if (reports.import.exists && importSummary.importVersion !== IMPORT_VERSION) {
  blockers.push(`IMPORT_VERSION_MISMATCH:${importSummary.importVersion ?? ''}`);
}
if (reports.import.exists && importSummary.status !== 'ok') blockers.push('P0_IMPORT_DRY_RUN_STATUS_NOT_OK');
if (reports.import.exists && importSummary.mode !== 'dry-run') {
  blockers.push(`P0_IMPORT_REPORT_NOT_DRY_RUN:${importSummary.mode ?? ''}`);
}
if (reports.import.exists && numberOrZero(importSummary.importedRows) !== expectedRows) {
  blockers.push(`P0_IMPORT_ROWS_MISMATCH:${importSummary.importedRows ?? ''}:${expectedRows}`);
}
if (reports.import.exists && numberOrZero(importSummary.decidedRows) !== decidedRows.length) {
  blockers.push(`P0_IMPORT_DECIDED_ROWS_MISMATCH:${importSummary.decidedRows ?? ''}:${decidedRows.length}`);
}
if (reports.import.exists && numberOrZero(importSummary.approvedRows) !== approvedRows.length) {
  blockers.push(`P0_IMPORT_APPROVED_ROWS_MISMATCH:${importSummary.approvedRows ?? ''}:${approvedRows.length}`);
}
if (reports.import.exists && numberOrZero(importSummary.pendingRows) !== pendingRows.length) {
  blockers.push(`P0_IMPORT_PENDING_ROWS_MISMATCH:${importSummary.pendingRows ?? ''}:${pendingRows.length}`);
}
if (reports.import.exists && boolOrFalse(importSummary.productionDataChanged)) {
  blockers.push('P0_IMPORT_CHANGED_PRODUCTION_DATA');
}

if (approvedRows.length === 0) warnings.push('NO_APPROVED_P0_ROWS_TEMPLATE_IMPORT_WILL_BLOCK');
if (filledPathRows.length > approvedRows.length) warnings.push('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROWS');
if (filledReviewerRows.length > approvedRows.length) warnings.push('REVIEWER_FILLED_FOR_NON_APPROVED_ROWS');

const awaitingOperatorInput = blockers.length === 0 && approvedRows.length === 0;
const readyForTemplateImport = blockers.length === 0 && approvedRows.length > 0;
const readyForGuardedWriteAfterTemplateImport = readyForTemplateImport && approvedRows.length > 0;

const summary = {
  readinessVersion: READINESS_VERSION,
  status: blockers.length > 0 ? 'blocked' : readyForTemplateImport ? 'ready' : 'waiting-for-operator',
  awaitingOperatorInput,
  readyForTemplateImport,
  readyForGuardedWriteAfterTemplateImport,
  targetBatchId: TARGET_BATCH_ID,
  expectedRows,
  initialExpectedRows: EXPECTED_ROWS,
  totalRows: rows.length,
  pendingRows: pendingRows.length,
  decidedRows: decidedRows.length,
  approvedRows: approvedRows.length,
  rejectedRows: rejectedRows.length,
  needsRetraceRows: needsRetraceRows.length,
  invalidDecisionRows: invalidDecisionRows.length,
  filledPathRows: filledPathRows.length,
  filledReviewerRows: filledReviewerRows.length,
  validationStatus: validationSummary.status ?? '',
  validationApprovedRows,
  validApprovedRows,
  invalidApprovedRows,
  invalidMetadataRows,
  importStatus: importSummary.status ?? '',
  importMode: importSummary.mode ?? '',
  importChangedRows: numberOrZero(importSummary.changedRows),
  importDecidedRows: numberOrZero(importSummary.decidedRows),
  importApprovedRows: numberOrZero(importSummary.approvedRows),
  importPendingRows: numberOrZero(importSummary.pendingRows),
  productionDataChanged: boolOrFalse(importSummary.productionDataChanged),
  blockerRows: blockerRows.length,
  blockers,
  warnings,
  validateCommand: 'npm run stadium:daegu:p0-operator-validate',
  importDryRunCommand: 'npm run stadium:daegu:p0-operator-import',
  templateImportCommand: 'npm run stadium:daegu:p0-operator-import:write-template',
  guardedWriteCommand: 'npm run stadium:daegu:operator-corrections-write',
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
  safetyContract: [
    'This readiness gate is read-only and never modifies the main corrections template.',
    'It must be run after npm run stadium:daegu:p0-operator-validate and npm run stadium:daegu:p0-operator-import.',
    'It blocks template import while any P0 row remains PENDING.',
    'It blocks template import unless at least one P0 row is operatorDecision=APPROVED.',
    'It does not allow production write directly; production write still requires npm run stadium:daegu:operator-corrections-write.',
    'Do not run npm run stadium:daegu:operator-corrections after p0-operator-import:write-template.',
  ],
  rows,
  nextActions: readyForTemplateImport
    ? [
      'Run npm run stadium:daegu:p0-operator-import:write-template.',
      'Then run npm run stadium:daegu:operator-corrections-write.',
    ]
    : awaitingOperatorInput
      ? [
        'Fill at least one P0 source input row with operatorDecision=APPROVED.',
        'Approved rows require correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
        'Run npm run stadium:daegu:p0-operator-validate.',
        'Run npm run stadium:daegu:p0-operator-import.',
        'Re-run npm run stadium:daegu:p0-operator-readiness.',
      ]
    : [
      'Resolve blockers in the P0 operator input.',
      'Run npm run stadium:daegu:p0-operator-validate.',
      'Run npm run stadium:daegu:p0-operator-import.',
      'Re-run npm run stadium:daegu:p0-operator-readiness.',
    ],
};

const jsonPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-readiness.json');
const csvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-readiness.csv');
const markdownPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-readiness.md');

await fs.mkdir(p0ReportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'blockId',
    'block',
    'decision',
    'validForApproval',
    'hasCorrectedPath',
    'hasCorrectedLabelX',
    'hasCorrectedLabelY',
    'hasReviewer',
    'hasReviewedAt',
    'reasons',
    'warnings',
  ],
  ...rows.map((row) => [
    row.blockId,
    row.block,
    row.decision,
    row.validForApproval,
    row.hasCorrectedPath,
    row.hasCorrectedLabelX,
    row.hasCorrectedLabelY,
    row.hasReviewer,
    row.hasReviewedAt,
    row.reasons.join(' '),
    row.warnings.join(' '),
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P0 Operator Readiness',
  '',
  `- readiness version: \`${READINESS_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- awaiting operator input: ${summary.awaitingOperatorInput}`,
  `- ready for template import: ${summary.readyForTemplateImport}`,
  `- ready for guarded write after template import: ${summary.readyForGuardedWriteAfterTemplateImport}`,
  `- pending rows: ${summary.pendingRows}`,
  `- decided rows: ${summary.decidedRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- rejected rows: ${summary.rejectedRows}`,
  `- needs retrace rows: ${summary.needsRetraceRows}`,
  `- invalid decision rows: ${summary.invalidDecisionRows}`,
  `- valid approved rows: ${summary.validApprovedRows}`,
  `- invalid approved rows: ${summary.invalidApprovedRows}`,
  `- import dry-run status: \`${summary.importStatus || 'missing'}\``,
  `- import dry-run changed rows: ${summary.importChangedRows}`,
  `- production data changed: ${summary.productionDataChanged}`,
  '',
  '## Rows',
  '',
  markdownTable(
    [
      'block',
      'decision',
      'valid',
      'path',
      'label x',
      'label y',
      'reviewer',
      'reviewed at',
      'reasons',
    ],
    rows.map((row) => [
      row.block ? `\`${row.block}\`` : row.blockId,
      `\`${row.decision}\``,
      String(row.validForApproval),
      String(row.hasCorrectedPath),
      String(row.hasCorrectedLabelX),
      String(row.hasCorrectedLabelY),
      String(row.hasReviewer),
      String(row.hasReviewedAt),
      row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
    ]),
  ),
  '',
  '## Gate',
  '',
  '1. 이 readiness는 read-only이며 main template과 `src/data/daeguSeatData.ts`를 수정하지 않습니다.',
  '2. P0 3건 중 `PENDING` row가 남아 있으면 template import를 진행하지 않습니다.',
  '3. 승인된 P0 row가 1건 이상 있어야 template import를 진행할 수 있습니다.',
  '4. `APPROVED` row가 있으면 validation에서 `validForApproval=true`여야 합니다.',
  '5. readiness가 통과해도 production write는 `npm run stadium:daegu:operator-corrections-write` guard를 다시 통과해야 합니다.',
  '6. `p0-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않습니다.',
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
  '## Next Actions',
  '',
  report.nextActions.map((action, index) => `${index + 1}. ${action}`).join('\n'),
  '',
].join('\n'), 'utf8');

console.log(`p0_operator_readiness_json:${jsonPath}`);
console.log(`p0_operator_readiness_csv:${csvPath}`);
console.log(`p0_operator_readiness_markdown:${markdownPath}`);
console.log(`status:${summary.status} readyForTemplateImport=${summary.readyForTemplateImport} pending=${summary.pendingRows} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows}`);

if (!summary.readyForTemplateImport) {
  process.exitCode = 1;
}
