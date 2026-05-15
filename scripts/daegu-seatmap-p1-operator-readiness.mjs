import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');

const READINESS_VERSION = 'DAEGU_P1_OPERATOR_READINESS_V1';
const PACKAGE_VERSION = 'DAEGU_P1_OPERATOR_PACKAGE_V1';
const IMPORT_VERSION = 'DAEGU_P1_OPERATOR_IMPORT_V1';
const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
const NEXT_ACTION_PACKET_VERSION = 'DAEGU_P1_NEXT_ACTION_PACKET_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const TARGET_PRIORITY = 'P1';
const PRIOR_BATCH_ID = 'BATCH_1_P0';
const PRIOR_PRIORITY = 'P0';
const BASELINE_EXPECTED_ROWS = 17;
const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
const STAGE_ORDER = {
  PAIR_BOUNDARY_FIRST: 1,
  SINGLE_CORRECTED_PATH: 2,
  DUPLICATE_CANDIDATE_SPLIT: 3,
};
const ORDERED_STAGES = [
  'PAIR_BOUNDARY_FIRST',
  'SINGLE_CORRECTED_PATH',
  'DUPLICATE_CANDIDATE_SPLIT',
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

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const packagePath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-package.json');
const inputPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');
const validationPath = path.join(p1ReportDir, 'daegu-seatmap-operator-corrections-validation.json');
const importPath = path.join(reportDir, 'daegu-seatmap-p1-operator-import.json');
const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
const nextActionPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.json');

const reports = {
  package: await readJsonReport(packagePath),
  input: await readJsonReport(inputPath),
  validation: await readJsonReport(validationPath),
  import: await readJsonReport(importPath),
  template: await readJsonReport(templatePath),
  nextAction: await readJsonReport(nextActionPath),
};

const packageReport = reports.package.data ?? {};
const input = reports.input.data ?? {};
const validationSummary = reports.validation.data?.summary ?? reports.validation.data ?? {};
const importSummary = reports.import.data?.summary ?? reports.import.data ?? {};
const validationRows = Array.isArray(reports.validation.data?.rows) ? reports.validation.data.rows : [];
const nextActionRows = Array.isArray(reports.nextAction.data?.rows) ? reports.nextAction.data.rows : [];
const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const templateRows = Array.isArray(reports.template.data?.corrections) ? reports.template.data.corrections : [];
const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));
const nextActionByBlockId = new Map(nextActionRows.map((row) => [row.blockId, row]));
const expectedRows = Number.isFinite(Number(packageReport.totalRows))
  ? Number(packageReport.totalRows)
  : inputRows.length;

const rows = inputRows.map((row) => {
  const decision = normalizeDecision(row.operatorDecision);
  const validationRow = validationByBlockId.get(row.blockId) ?? {};
  const nextActionRow = nextActionByBlockId.get(row.blockId) ?? {};
  return {
    blockId: row.blockId,
    block: row.block,
    stage: nextActionRow.stage ?? '',
    stageOrder: STAGE_ORDER[nextActionRow.stage] ?? 99,
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
    closedTerminalInputRow: validationRow.closedTerminalInputRow === true,
    validForApproval: validationRow.validForApproval === true,
    reasons: Array.isArray(validationRow.reasons) ? validationRow.reasons : [],
    warnings: Array.isArray(validationRow.warnings) ? validationRow.warnings : [],
  };
});

const closedTerminalInputRows = rows.filter((row) => row.closedTerminalInputRow);
const actionableRows = rows.filter((row) => !row.closedTerminalInputRow);
const pendingRows = actionableRows.filter((row) => row.pending);
const decidedRows = actionableRows.filter((row) => !row.pending);
const approvedRows = actionableRows.filter((row) => row.approved);
const rejectedRows = actionableRows.filter((row) => row.rejected);
const needsRetraceRows = actionableRows.filter((row) => row.needsRetrace);
const invalidDecisionRows = rows.filter((row) => row.invalidDecision);
const filledPathRows = actionableRows.filter((row) => row.hasCorrectedPath);
const filledReviewerRows = actionableRows.filter((row) => row.hasReviewer);
const blockerRows = rows.filter((row) => row.reasons.length > 0);
const priorBatchRows = templateRows.filter((row) => row.queuePriority === PRIOR_PRIORITY);
const priorPendingRows = priorBatchRows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
const priorApprovedRows = priorBatchRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
const p1TemplateRows = templateRows.filter((row) => row.queuePriority === TARGET_PRIORITY);

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
if (reports.template.exists && reports.template.data?.templateVersion !== TEMPLATE_VERSION) {
  blockers.push(`TEMPLATE_VERSION_MISMATCH:${reports.template.data?.templateVersion ?? ''}`);
}
if (reports.nextAction.exists && reports.nextAction.data?.summary?.packetVersion !== NEXT_ACTION_PACKET_VERSION) {
  blockers.push(`NEXT_ACTION_PACKET_VERSION_MISMATCH:${reports.nextAction.data?.summary?.packetVersion ?? ''}`);
}
if (reports.nextAction.exists && reports.nextAction.data?.summary?.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`NEXT_ACTION_BATCH_MISMATCH:${reports.nextAction.data?.summary?.targetBatchId ?? ''}`);
}
if (rows.length !== expectedRows) blockers.push(`P1_INPUT_ROW_COUNT_MISMATCH:${rows.length}:${expectedRows}`);
if (rows.length !== BASELINE_EXPECTED_ROWS) {
  warnings.push(`P1_INPUT_ROW_COUNT_CHANGED_AFTER_WRITES:${rows.length}:${BASELINE_EXPECTED_ROWS}`);
}
if (p1TemplateRows.length !== actionableRows.length) {
  blockers.push(`P1_TEMPLATE_ROW_COUNT_MISMATCH:${p1TemplateRows.length}:${actionableRows.length}`);
}
if (invalidDecisionRows.length > 0) {
  blockers.push(`INVALID_P1_OPERATOR_DECISION:${invalidDecisionRows.map((row) => row.blockId).join(' ')}`);
}
const missingStageRows = actionableRows.filter((row) => !row.stage);
const unknownStageRows = actionableRows.filter((row) => row.stage && !Object.hasOwn(STAGE_ORDER, row.stage));
if (missingStageRows.length > 0) {
  blockers.push(`P1_NEXT_ACTION_MISSING_STAGE:${missingStageRows.map((row) => row.block).join(' ')}`);
}
if (unknownStageRows.length > 0) {
  blockers.push(`P1_NEXT_ACTION_UNKNOWN_STAGE:${unknownStageRows.map((row) => `${row.block}:${row.stage}`).join(' ')}`);
}
if (priorPendingRows.length > 0) {
  blockers.push(`P1_REQUIRES_PRIOR_BATCH_CLOSED:${PRIOR_BATCH_ID}:${priorPendingRows.map((row) => row.block).join(' ')}`);
}
if (priorApprovedRows.length > 0) {
  blockers.push(`P1_REQUIRES_PRIOR_BATCH_WRITTEN:${PRIOR_BATCH_ID}:${priorApprovedRows.map((row) => row.block).join(' ')}`);
}
if (pendingRows.length > 0) {
  blockers.push(`P1_PENDING_ROWS_REMAIN:${pendingRows.map((row) => row.block).join(' ')}`);
}
if (decidedRows.length === 0) blockers.push('NO_P1_OPERATOR_DECISIONS');

if (reports.validation.exists && validationSummary.validationVersion !== VALIDATION_VERSION) {
  blockers.push(`VALIDATION_VERSION_MISMATCH:${validationSummary.validationVersion ?? ''}`);
}
if (reports.validation.exists && validationSummary.status !== 'ok') blockers.push('P1_VALIDATION_STATUS_NOT_OK');

const validationApprovedRows = numberOrZero(validationSummary.approvedRows);
const validApprovedRows = numberOrZero(validationSummary.validApprovedRows);
const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows);
const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
if (reports.validation.exists && validationApprovedRows !== approvedRows.length) {
  blockers.push(`P1_VALIDATION_APPROVED_ROWS_MISMATCH:${validationApprovedRows}:${approvedRows.length}`);
}
if (invalidApprovedRows > 0) blockers.push(`P1_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
if (invalidMetadataRows > 0) blockers.push(`P1_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
if (approvedRows.length > 0 && validApprovedRows !== approvedRows.length) {
  blockers.push(`P1_VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows.length}`);
}

if (reports.import.exists && importSummary.importVersion !== IMPORT_VERSION) {
  blockers.push(`IMPORT_VERSION_MISMATCH:${importSummary.importVersion ?? ''}`);
}
if (reports.import.exists && importSummary.status !== 'ok') blockers.push('P1_IMPORT_DRY_RUN_STATUS_NOT_OK');
if (reports.import.exists && importSummary.mode !== 'dry-run') {
  blockers.push(`P1_IMPORT_REPORT_NOT_DRY_RUN:${importSummary.mode ?? ''}`);
}
const importChangedRows = numberOrZero(importSummary.changedRows);

if (reports.import.exists && numberOrZero(importSummary.importedRows) !== actionableRows.length) {
  blockers.push(`P1_IMPORT_ROWS_MISMATCH:${importSummary.importedRows ?? ''}:${actionableRows.length}`);
}
if (reports.import.exists && numberOrZero(importSummary.decidedRows) !== decidedRows.length) {
  blockers.push(`P1_IMPORT_DECIDED_ROWS_MISMATCH:${importSummary.decidedRows ?? ''}:${decidedRows.length}`);
}
if (reports.import.exists && numberOrZero(importSummary.approvedRows) !== approvedRows.length) {
  blockers.push(`P1_IMPORT_APPROVED_ROWS_MISMATCH:${importSummary.approvedRows ?? ''}:${approvedRows.length}`);
}
if (reports.import.exists && numberOrZero(importSummary.pendingRows) !== pendingRows.length) {
  blockers.push(`P1_IMPORT_PENDING_ROWS_MISMATCH:${importSummary.pendingRows ?? ''}:${pendingRows.length}`);
}
if (reports.import.exists && boolOrFalse(importSummary.productionDataChanged)) {
  blockers.push('P1_IMPORT_CHANGED_PRODUCTION_DATA');
}

if (closedTerminalInputRows.length > 0) {
  warnings.push(`CLOSED_TERMINAL_INPUT_ROWS_IGNORED:${closedTerminalInputRows.map((row) => row.block).join(' ')}`);
}
const stageSummaries = ORDERED_STAGES.map((stage) => {
  const stageRows = actionableRows.filter((row) => row.stage === stage);
  const stageApprovedRows = stageRows.filter((row) => row.approved);
  return {
    stage,
    stageOrder: STAGE_ORDER[stage],
    rows: stageRows.length,
    approvedRows: stageApprovedRows.length,
    approvedBlocks: stageApprovedRows.map((row) => row.block),
  };
});
const firstIncompleteStage = stageSummaries.find((stage) => stage.approvedRows < stage.rows);
const laterApprovedRows = firstIncompleteStage
  ? approvedRows.filter((row) => row.stageOrder > firstIncompleteStage.stageOrder)
  : [];
if (laterApprovedRows.length > 0) {
  blockers.push(`P1_STAGE_ORDER_APPROVAL_BLOCKED:${firstIncompleteStage.stage}:${laterApprovedRows.map((row) => row.block).join(' ')}`);
}
if (importChangedRows === 0) warnings.push('NO_P1_TEMPLATE_CHANGES_TO_IMPORT');
if (approvedRows.length === 0) warnings.push('NO_APPROVED_P1_ROWS_TEMPLATE_IMPORT_WILL_BLOCK');
if (filledPathRows.length > approvedRows.length) warnings.push('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROWS');
if (filledReviewerRows.length > approvedRows.length) warnings.push('REVIEWER_FILLED_FOR_NON_APPROVED_ROWS');

const awaitingOperatorInput = blockers.length === 0 && (importChangedRows === 0 || approvedRows.length === 0);
const readyForTemplateImport = blockers.length === 0 && importChangedRows > 0 && approvedRows.length > 0;
const readyForGuardedWriteAfterTemplateImport = readyForTemplateImport && approvedRows.length > 0;

const summary = {
  readinessVersion: READINESS_VERSION,
  status: blockers.length > 0 ? 'blocked' : readyForTemplateImport ? 'ready' : 'waiting-for-operator',
  awaitingOperatorInput,
  readyForTemplateImport,
  readyForGuardedWriteAfterTemplateImport,
  targetBatchId: TARGET_BATCH_ID,
  priorBatchId: PRIOR_BATCH_ID,
  expectedRows,
  baselineExpectedRows: BASELINE_EXPECTED_ROWS,
  totalRows: rows.length,
  actionableRows: actionableRows.length,
  closedTerminalInputRows: closedTerminalInputRows.length,
  pendingRows: pendingRows.length,
  decidedRows: decidedRows.length,
  approvedRows: approvedRows.length,
  rejectedRows: rejectedRows.length,
  needsRetraceRows: needsRetraceRows.length,
  invalidDecisionRows: invalidDecisionRows.length,
  filledPathRows: filledPathRows.length,
  filledReviewerRows: filledReviewerRows.length,
  priorPendingRows: priorPendingRows.length,
  priorApprovedRows: priorApprovedRows.length,
  validationStatus: validationSummary.status ?? '',
  validationApprovedRows,
  validApprovedRows,
  invalidApprovedRows,
  invalidMetadataRows,
  importStatus: importSummary.status ?? '',
  importMode: importSummary.mode ?? '',
  importChangedRows,
  importDecidedRows: numberOrZero(importSummary.decidedRows),
  importApprovedRows: numberOrZero(importSummary.approvedRows),
  importPendingRows: numberOrZero(importSummary.pendingRows),
  stageSummaries,
  firstIncompleteStage: firstIncompleteStage?.stage ?? '',
  laterApprovedRows: laterApprovedRows.length,
  productionDataChanged: boolOrFalse(importSummary.productionDataChanged),
  blockerRows: blockerRows.length,
  blockers,
  warnings,
  validateCommand: 'npm run stadium:daegu:p1-operator-validate',
  importDryRunCommand: 'npm run stadium:daegu:p1-operator-import',
  templateImportCommand: 'npm run stadium:daegu:p1-operator-import:write-template',
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
    'It must be run after npm run stadium:daegu:p1-operator-validate and npm run stadium:daegu:p1-operator-import.',
    'It blocks template import while BATCH_1_P0 is still pending or still has approved rows waiting for production write.',
    'It blocks template import while any P1 row remains PENDING.',
    'It blocks template import unless at least one P1 row is operatorDecision=APPROVED.',
    'It blocks template import if SINGLE_CORRECTED_PATH or DUPLICATE_CANDIDATE_SPLIT is approved before the earlier P1 stage is complete.',
    'Terminal P1 input rows already closed in production data may remain as audit history and are ignored for actionable import/write counts.',
    'It does not allow production write directly; production write still requires npm run stadium:daegu:operator-corrections-write.',
    'Do not run npm run stadium:daegu:operator-corrections after p1-operator-import:write-template.',
  ],
  rows,
  nextActions: readyForTemplateImport
    ? [
      'Run npm run stadium:daegu:p1-operator-import:write-template.',
      'Then run npm run stadium:daegu:operator-corrections-write.',
    ]
    : awaitingOperatorInput
      ? [
        'Fill at least one P1 source input row with an operator decision that changes the corrections template.',
        'For production promotion, use operatorDecision=APPROVED with correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
        'Run npm run stadium:daegu:p1-operator-validate.',
        'Run npm run stadium:daegu:p1-operator-import.',
        'Re-run npm run stadium:daegu:p1-operator-readiness.',
      ]
    : [
      'Resolve blockers in the P1 operator input.',
      'Run npm run stadium:daegu:p1-operator-validate.',
      'Run npm run stadium:daegu:p1-operator-import.',
      'Re-run npm run stadium:daegu:p1-operator-readiness.',
    ],
};

const jsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-readiness.json');
const csvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-readiness.csv');
const markdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-readiness.md');

await fs.mkdir(p1ReportDir, { recursive: true });
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
    'closedTerminalInputRow',
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
    row.closedTerminalInputRow,
    row.reasons.join(' '),
    row.warnings.join(' '),
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Operator Readiness',
  '',
  `- readiness version: \`${READINESS_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- awaiting operator input: ${summary.awaitingOperatorInput}`,
  `- ready for template import: ${summary.readyForTemplateImport}`,
  `- ready for guarded write after template import: ${summary.readyForGuardedWriteAfterTemplateImport}`,
  `- prior pending rows: ${summary.priorPendingRows}`,
  `- prior approved rows: ${summary.priorApprovedRows}`,
  `- actionable rows: ${summary.actionableRows}`,
  `- closed terminal input rows: ${summary.closedTerminalInputRows}`,
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
  `- first incomplete stage: \`${summary.firstIncompleteStage || 'none'}\``,
  `- later approved rows: ${summary.laterApprovedRows}`,
  `- production data changed: ${summary.productionDataChanged}`,
  '',
  '## Rows',
  '',
  markdownTable(
    [
      'block',
      'stage',
      'decision',
      'valid',
      'path',
      'label x',
      'label y',
      'reviewer',
      'reviewed at',
      'closed terminal',
      'reasons',
    ],
    rows.map((row) => [
      row.block ? `\`${row.block}\`` : row.blockId,
      `\`${row.stage || 'UNKNOWN'}\``,
      `\`${row.decision}\``,
      String(row.validForApproval),
      String(row.hasCorrectedPath),
      String(row.hasCorrectedLabelX),
      String(row.hasCorrectedLabelY),
      String(row.hasReviewer),
      String(row.hasReviewedAt),
      String(row.closedTerminalInputRow),
      row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
    ]),
  ),
  '',
  '## Stage Order',
  '',
  markdownTable(
    ['stage', 'rows', 'approved', 'approved blocks'],
    stageSummaries.map((row) => [
      `\`${row.stage}\``,
      row.rows,
      row.approvedRows,
      row.approvedBlocks.map((block) => `\`${block}\``).join(' ') || '-',
    ]),
  ),
  '',
  '## Gate',
  '',
  '1. 이 readiness는 read-only이며 main template과 `src/data/daeguSeatData.ts`를 수정하지 않습니다.',
  '2. P0 batch가 pending 없이 닫혔고 approved row도 남아 있지 않아야 P1 template import를 진행할 수 있습니다.',
  '3. 이미 production data에서 닫힌 terminal P1 row는 audit history로 남길 수 있고, actionable import/write 집계에서는 제외합니다.',
  '4. P1 actionable row 중 `PENDING` row가 남아 있으면 template import를 진행하지 않습니다.',
  '5. `APPROVED` row가 있으면 validation에서 `validForApproval=true`여야 합니다.',
  '6. `PAIR_BOUNDARY_FIRST`가 완료되기 전 `SINGLE_CORRECTED_PATH` 또는 `DUPLICATE_CANDIDATE_SPLIT` 승인 row는 template import를 진행하지 않습니다.',
  '7. readiness가 통과해도 production write는 `npm run stadium:daegu:operator-corrections-write` guard를 다시 통과해야 합니다.',
  '8. `p1-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않습니다.',
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

console.log(`p1_operator_readiness_json:${jsonPath}`);
console.log(`p1_operator_readiness_csv:${csvPath}`);
console.log(`p1_operator_readiness_markdown:${markdownPath}`);
console.log(`status:${summary.status} readyForTemplateImport=${summary.readyForTemplateImport} pending=${summary.pendingRows} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows}`);

if (!summary.readyForTemplateImport) {
  process.exitCode = 1;
}
