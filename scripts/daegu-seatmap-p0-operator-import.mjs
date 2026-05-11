import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultInputPath = path.join(
  defaultReportDir,
  'daegu-p0-operator/daegu-seatmap-p0-operator-input.json',
);

const IMPORT_VERSION = 'DAEGU_P0_OPERATOR_IMPORT_V1';
const TARGET_BATCH_ID = 'BATCH_1_P0';
const TARGET_PRIORITY = 'P0';
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

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
const writeTemplate = hasFlag('--write-template');
const templateJsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
const templateCsvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.csv');
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');

const input = await readJson(inputPath);
const template = await readJson(templateJsonPath);
const handoff = await readJson(handoffPath);

const p0HandoffRows = (handoff.workItems ?? []).filter((row) => row.queuePriority === TARGET_PRIORITY);
const expectedP0Ids = new Set(p0HandoffRows.map((row) => row.id));
const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
const blockers = [];
const warnings = [];

if (input.packageVersion !== 'DAEGU_P0_OPERATOR_PACKAGE_V1') {
  blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (template.templateVersion !== TEMPLATE_VERSION) {
  blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
}
if (inputRows.length !== expectedP0Ids.size) blockers.push(`P0_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${expectedP0Ids.size}`);

const inputIds = new Set(inputRows.map((row) => row.blockId));
const nonP0InputRows = inputRows.filter((row) => !expectedP0Ids.has(row.blockId));
if (nonP0InputRows.length > 0) {
  blockers.push(`INPUT_HAS_NON_P0_ROWS:${nonP0InputRows.map((row) => row.blockId).join(' ')}`);
}
const missingP0Ids = [...expectedP0Ids].filter((blockId) => !inputIds.has(blockId));
if (missingP0Ids.length > 0) blockers.push(`INPUT_MISSING_P0_ROWS:${missingP0Ids.join(' ')}`);

const duplicateInputIds = inputRows
  .map((row) => row.blockId)
  .filter((blockId, index, blockIds) => blockIds.indexOf(blockId) !== index);
if (duplicateInputIds.length > 0) blockers.push(`DUPLICATE_INPUT_BLOCK_ID:${[...new Set(duplicateInputIds)].join(' ')}`);

const draftMarkerRows = inputRows.filter((row) => (
  row.reviewer === DRAFT_REVIEWER
  || row.reviewedAt === DRAFT_REVIEWED_AT
));
if (writeTemplate && input.draftOnly === true) blockers.push('WRITE_TEMPLATE_INPUT_DRAFT_ONLY');
if (writeTemplate && input.stagingOnly === true) blockers.push('WRITE_TEMPLATE_INPUT_STAGING_ONLY');
if (writeTemplate && draftMarkerRows.length > 0) {
  blockers.push(`WRITE_TEMPLATE_HAS_DRAFT_MARKERS:${draftMarkerRows.map((row) => row.blockId).join(' ')}`);
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
const invalidDecisionRows = importedRows.filter((row) => !DECISION_OPTIONS.has(row.operatorDecision));
if (invalidDecisionRows.length > 0) {
  blockers.push(`INVALID_P0_OPERATOR_DECISION:${invalidDecisionRows.map((row) => row.blockId).join(' ')}`);
}
if (decidedRows.length === 0) warnings.push('NO_P0_OPERATOR_DECISIONS_TO_IMPORT');
if (writeTemplate && blockers.length === 0 && decidedRows.length === 0) {
  blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_P0_DECISION');
}
if (writeTemplate && pendingRows.length > 0) {
  blockers.push(`WRITE_TEMPLATE_REQUIRES_NO_P0_PENDING_ROWS:${pendingRows.map((row) => row.block).join(' ')}`);
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
  input: path.relative(frontendRoot, inputPath),
  template: path.relative(frontendRoot, templateJsonPath),
  totalInputRows: inputRows.length,
  importedRows: importedRows.length,
  changedRows: changedRows.length,
  decidedRows: decidedRows.length,
  approvedRows: approvedRows.length,
  pendingRows: pendingRows.length,
  invalidDecisionRows: invalidDecisionRows.length,
  draftMarkerRows: draftMarkerRows.length,
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
    'This script only imports P0 operator decisions into the corrections template.',
    'It blocks write-template while any P0 row remains PENDING.',
    'It blocks write-template when draft/staging metadata or DRAFT_VALIDATION_ONLY markers are present.',
    'Do not run npm run stadium:daegu:operator-corrections after write-template because it regenerates the template from handoff defaults.',
    'It never modifies src/data/daeguSeatData.ts or promotes blocks to OFFICIAL_IMAGE_TRACED.',
    'Run validation, preview, dry-run apply, batches, status, and write-guard after importing operator decisions.',
  ],
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-p0-operator-import.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-p0-operator-import.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-p0-operator-import.md');

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
  '# Daegu P0 Operator Import',
  '',
  `- import version: \`${IMPORT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- mode: \`${summary.mode}\``,
  `- input: \`${summary.input}\``,
  `- imported rows: ${summary.importedRows}`,
  `- changed rows: ${summary.changedRows}`,
  `- decided rows: ${summary.decidedRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- pending rows: ${summary.pendingRows}`,
  `- invalid decision rows: ${summary.invalidDecisionRows}`,
  `- draft marker rows: ${summary.draftMarkerRows}`,
  `- production data changed: ${summary.productionDataChanged}`,
  `- template changed: ${summary.templateChanged}`,
  '',
  '## Imported Rows',
  '',
  markdownTable(
    ['block', 'decision', 'changed', 'approved', 'decided'],
    importedRows.map((row) => [
      `\`${row.block}\``,
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

console.log(`p0_operator_import_json:${jsonPath}`);
console.log(`p0_operator_import_csv:${csvPath}`);
console.log(`p0_operator_import_markdown:${markdownPath}`);
console.log(`status:${summary.status} mode=${summary.mode} imported=${summary.importedRows} changed=${summary.changedRows} decided=${summary.decidedRows} approved=${summary.approvedRows}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
