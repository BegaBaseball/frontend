import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultInputPath = path.join(
  defaultReportDir,
  'daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.json',
);
const defaultValidationPath = path.join(
  defaultReportDir,
  'daegu-p3-p4-operator/daegu-seatmap-operator-corrections-validation.json',
);

const IMPORT_VERSION = 'DAEGU_P3_P4_OPERATOR_IMPORT_V1';
const INPUT_PACKAGE_VERSION = 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1';
const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
const TARGET_BATCH_ID = 'BATCH_4_P3_P4';
const TARGET_PRIORITIES = ['P3', 'P4'];
const PRIOR_BATCHES = [
  { id: 'BATCH_1_P0', priorities: ['P0'] },
  { id: 'BATCH_2_P1', priorities: ['P1'] },
  { id: 'BATCH_3_P2', priorities: ['P2'] },
];
const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
const DRAFT_REVIEWER = 'DRAFT_VALIDATION_ONLY';
const DRAFT_REVIEWED_AT = '2026-05-10T00:00:00.000Z';
const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
const IMPORT_FIELDS = [
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'operatorNote',
];
const CSV_HEADERS = [
  'blockId',
  'block',
  'name',
  'category',
  'queuePriority',
  'alignmentClass',
  'candidateStatus',
  'candidateDuplicateGroup',
  'recommendedAction',
  'evidenceCrop',
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'operatorNote',
];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const hasFlag = (name) => process.argv.includes(name);

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

const readOptionalJson = async (filePath) => {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

const normalizeEditableFields = (row) => ({
  operatorDecision: normalizeDecision(row.operatorDecision),
  correctedPath: String(row.correctedPath ?? '').trim(),
  correctedLabelX: row.correctedLabelX ?? '',
  correctedLabelY: row.correctedLabelY ?? '',
  reviewer: String(row.reviewer ?? '').trim(),
  reviewedAt: String(row.reviewedAt ?? '').trim(),
  operatorNote: String(row.operatorNote ?? '').trim(),
});

const rowChanged = (before, after) => IMPORT_FIELDS.some((field) => String(before[field] ?? '') !== String(after[field] ?? ''));

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const hasDraftMarker = (row) => (
  row.draftOnly === true
  || row.stagingOnly === true
  || row.reviewer === DRAFT_REVIEWER
  || row.reviewedAt === DRAFT_REVIEWED_AT
);

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
const validationPath = path.resolve(frontendRoot, argValue('--validation', defaultValidationPath));
const writeTemplate = hasFlag('--write-template');
const templateJsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
const templateCsvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.csv');
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');

const input = await readJson(inputPath);
const template = await readJson(templateJsonPath);
const handoff = await readJson(handoffPath);
const validation = await readOptionalJson(validationPath);

const p3p4HandoffRows = (handoff.workItems ?? []).filter((row) => TARGET_PRIORITIES.includes(row.queuePriority));
const expectedP3P4Ids = new Set(p3p4HandoffRows.map((row) => row.id));
const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
const templateIds = new Set(templateRows.map((row) => row.blockId));
const blockers = [];
const warnings = [];

if (input.packageVersion !== INPUT_PACKAGE_VERSION) {
  blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (template.templateVersion !== TEMPLATE_VERSION) {
  blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
}
if (inputRows.length !== expectedP3P4Ids.size) {
  blockers.push(`P3_P4_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${expectedP3P4Ids.size}`);
}

const inputIds = new Set(inputRows.map((row) => row.blockId));
const nonP3P4InputRows = inputRows.filter((row) => !expectedP3P4Ids.has(row.blockId));
if (nonP3P4InputRows.length > 0) {
  blockers.push(`INPUT_HAS_NON_P3_P4_ROWS:${nonP3P4InputRows.map((row) => row.blockId).join(' ')}`);
}
const missingP3P4Ids = [...expectedP3P4Ids].filter((blockId) => !inputIds.has(blockId));
if (missingP3P4Ids.length > 0) blockers.push(`INPUT_MISSING_P3_P4_ROWS:${missingP3P4Ids.join(' ')}`);

const missingTemplateIds = inputRows
  .map((row) => row.blockId)
  .filter((blockId) => !templateIds.has(blockId));
if (missingTemplateIds.length > 0) {
  blockers.push(`TEMPLATE_MISSING_P3_P4_ROWS:${missingTemplateIds.join(' ')}`);
}

const duplicateInputIds = inputRows
  .map((row) => row.blockId)
  .filter((blockId, index, blockIds) => blockIds.indexOf(blockId) !== index);
if (duplicateInputIds.length > 0) blockers.push(`DUPLICATE_INPUT_BLOCK_ID:${[...new Set(duplicateInputIds)].join(' ')}`);

const draftMarkerRows = inputRows.filter(hasDraftMarker);
if (writeTemplate && input.draftOnly === true) blockers.push('WRITE_TEMPLATE_INPUT_DRAFT_ONLY');
if (writeTemplate && input.stagingOnly === true) blockers.push('WRITE_TEMPLATE_INPUT_STAGING_ONLY');
if (writeTemplate && draftMarkerRows.length > 0) {
  blockers.push(`WRITE_TEMPLATE_HAS_DRAFT_MARKERS:${draftMarkerRows.map((row) => row.blockId).join(' ')}`);
}

const priorBatchSummaries = PRIOR_BATCHES.map((batch) => {
  const rows = templateRows.filter((row) => batch.priorities.includes(row.queuePriority));
  const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const approvedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  if (writeTemplate && pendingRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED:${batch.id}:${pendingRows.map((row) => row.block).join(' ')}`);
  }
  if (writeTemplate && approvedRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN:${batch.id}:${approvedRows.map((row) => row.block).join(' ')}`);
  }
  return {
    batchId: batch.id,
    priorities: batch.priorities,
    rows: rows.length,
    pendingRows: pendingRows.length,
    approvedRows: approvedRows.length,
  };
});

const invalidDecisionInputRows = inputRows.filter((row) => !DECISION_OPTIONS.has(normalizeDecision(row.operatorDecision)));
if (invalidDecisionInputRows.length > 0) {
  blockers.push(`INVALID_P3_P4_OPERATOR_DECISION:${invalidDecisionInputRows.map((row) => row.blockId).join(' ')}`);
}

const importedRows = [];
const mergedRows = templateRows.map((templateRow) => {
  const inputRow = inputByBlockId.get(templateRow.blockId);
  if (!inputRow) return templateRow;

  const editable = normalizeEditableFields(inputRow);
  const mergedRow = {
    ...templateRow,
    ...editable,
  };
  const changed = rowChanged(templateRow, mergedRow);
  importedRows.push({
    blockId: templateRow.blockId,
    block: templateRow.block,
    queuePriority: templateRow.queuePriority,
    operatorDecision: mergedRow.operatorDecision,
    changed,
    approved: mergedRow.operatorDecision === 'APPROVED',
    decided: mergedRow.operatorDecision !== 'PENDING',
  });
  return mergedRow;
});

const changedRows = importedRows.filter((row) => row.changed);
const decidedRows = importedRows.filter((row) => row.decided);
const approvedRows = importedRows.filter((row) => row.approved);
const pendingRows = importedRows.filter((row) => row.operatorDecision === 'PENDING');
if (decidedRows.length === 0) warnings.push('NO_P3_P4_OPERATOR_DECISIONS_TO_IMPORT');
if (writeTemplate && blockers.length === 0 && decidedRows.length === 0) {
  blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_P3_P4_DECISION');
}
if (writeTemplate && approvedRows.length === 0) {
  blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P3_P4_ROW');
}
if (writeTemplate && pendingRows.length > 0) {
  blockers.push(`WRITE_TEMPLATE_REQUIRES_NO_P3_P4_PENDING_ROWS:${pendingRows.map((row) => row.block).join(' ')}`);
}

const validationSummary = validation?.summary ?? {};
const validationApprovedRows = numberOrZero(validationSummary.approvedRows);
const validApprovedRows = numberOrZero(validationSummary.validApprovedRows);
const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows);
const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
if (writeTemplate && approvedRows.length > 0 && !validation) blockers.push('WRITE_TEMPLATE_REQUIRES_P3_P4_VALIDATION_REPORT');
if (writeTemplate && validation && validationSummary.validationVersion !== VALIDATION_VERSION) {
  blockers.push(`WRITE_TEMPLATE_VALIDATION_VERSION_MISMATCH:${validationSummary.validationVersion ?? ''}`);
}
if (writeTemplate && validation && validationSummary.status !== 'ok') blockers.push('WRITE_TEMPLATE_VALIDATION_STATUS_NOT_OK');
if (writeTemplate && validation && validationApprovedRows !== approvedRows.length) {
  blockers.push(`WRITE_TEMPLATE_VALIDATION_APPROVED_ROWS_MISMATCH:${validationApprovedRows}:${approvedRows.length}`);
}
if (writeTemplate && invalidApprovedRows > 0) blockers.push(`WRITE_TEMPLATE_P3_P4_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
if (writeTemplate && invalidMetadataRows > 0) blockers.push(`WRITE_TEMPLATE_P3_P4_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
if (writeTemplate && approvedRows.length > 0 && validApprovedRows !== approvedRows.length) {
  blockers.push(`WRITE_TEMPLATE_P3_P4_VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows.length}`);
}

const mergedTemplate = {
  ...template,
  generatedAt: new Date().toISOString(),
  corrections: mergedRows,
};
const summary = {
  importVersion: IMPORT_VERSION,
  status: blockers.length > 0 ? 'blocked' : 'ok',
  mode: writeTemplate ? 'write-template' : 'dry-run',
  targetBatchId: TARGET_BATCH_ID,
  priorBatchIds: PRIOR_BATCHES.map((batch) => batch.id),
  input: path.relative(frontendRoot, inputPath),
  template: path.relative(frontendRoot, templateJsonPath),
  validation: path.relative(frontendRoot, validationPath),
  totalInputRows: inputRows.length,
  importedRows: importedRows.length,
  changedRows: changedRows.length,
  decidedRows: decidedRows.length,
  approvedRows: approvedRows.length,
  pendingRows: pendingRows.length,
  invalidDecisionRows: invalidDecisionInputRows.length,
  draftMarkerRows: draftMarkerRows.length,
  priorBatchSummaries,
  priorPendingRows: priorBatchSummaries.reduce((total, batch) => total + batch.pendingRows, 0),
  priorApprovedRows: priorBatchSummaries.reduce((total, batch) => total + batch.approvedRows, 0),
  validationStatus: validationSummary.status ?? '',
  validationApprovedRows,
  validApprovedRows,
  invalidApprovedRows,
  invalidMetadataRows,
  productionDataChanged: false,
  templateChanged: writeTemplate && blockers.length === 0,
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  importedRows,
  safetyContract: [
    'This script only imports P3/P4 operator decisions into the corrections template.',
    'It blocks write-template while any P0, P1, or P2 rows remain pending or approved in the current template.',
    'It blocks write-template while any P3/P4 row remains PENDING.',
    'It blocks write-template unless at least one P3/P4 row is operatorDecision=APPROVED.',
    'It blocks write-template when P3/P4 APPROVED rows do not have validForApproval=true in the existing validator report.',
    'It blocks write-template when draft/staging metadata or DRAFT_VALIDATION_ONLY markers are present.',
    'Do not run npm run stadium:daegu:operator-corrections after write-template because it regenerates the template from handoff defaults.',
    'It never modifies src/data/daeguSeatData.ts or promotes blocks to OFFICIAL_IMAGE_TRACED.',
    'Run validation, preview, dry-run apply, batches, status, and write-guard after importing operator decisions.',
  ],
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-p3-p4-operator-import.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-p3-p4-operator-import.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-p3-p4-operator-import.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'blockId',
    'block',
    'queuePriority',
    'operatorDecision',
    'changed',
    'approved',
    'decided',
  ],
  ...importedRows.map((row) => [
    row.blockId,
    row.block,
    row.queuePriority,
    row.operatorDecision,
    row.changed,
    row.approved,
    row.decided,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P3/P4 Operator Import',
  '',
  `- import version: \`${IMPORT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- mode: \`${summary.mode}\``,
  `- input: \`${summary.input}\``,
  `- prior batches: \`${summary.priorBatchIds.join(', ')}\``,
  `- imported rows: ${summary.importedRows}`,
  `- changed rows: ${summary.changedRows}`,
  `- decided rows: ${summary.decidedRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- pending rows: ${summary.pendingRows}`,
  `- invalid decision rows: ${summary.invalidDecisionRows}`,
  `- draft marker rows: ${summary.draftMarkerRows}`,
  `- prior pending rows: ${summary.priorPendingRows}`,
  `- prior approved rows: ${summary.priorApprovedRows}`,
  `- valid approved rows: ${summary.validApprovedRows}`,
  `- invalid approved rows: ${summary.invalidApprovedRows}`,
  `- production data changed: ${summary.productionDataChanged}`,
  `- template changed: ${summary.templateChanged}`,
  '',
  '## Prior Batches',
  '',
  markdownTable(
    ['batch', 'priorities', 'rows', 'pending', 'approved'],
    priorBatchSummaries.map((row) => [
      `\`${row.batchId}\``,
      `\`${row.priorities.join(',')}\``,
      row.rows,
      row.pendingRows,
      row.approvedRows,
    ]),
  ),
  '',
  '## Imported Rows',
  '',
  markdownTable(
    ['block', 'priority', 'decision', 'changed', 'approved', 'decided'],
    importedRows.map((row) => [
      `\`${row.block}\``,
      `\`${row.queuePriority}\``,
      `\`${row.operatorDecision}\``,
      String(row.changed),
      String(row.approved),
      String(row.decided),
    ]),
  ),
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

if (writeTemplate && blockers.length === 0) {
  await fs.writeFile(templateJsonPath, `${JSON.stringify(mergedTemplate, null, 2)}\n`, 'utf8');
  await writeCsv(templateCsvPath, [
    CSV_HEADERS,
    ...mergedRows.map((row) => CSV_HEADERS.map((key) => row[key])),
  ]);
}

console.log(`p3_p4_operator_import_json:${jsonPath}`);
console.log(`p3_p4_operator_import_csv:${csvPath}`);
console.log(`p3_p4_operator_import_markdown:${markdownPath}`);
console.log(`status:${summary.status} mode=${summary.mode} imported=${summary.importedRows} changed=${summary.changedRows} decided=${summary.decidedRows} approved=${summary.approvedRows}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
