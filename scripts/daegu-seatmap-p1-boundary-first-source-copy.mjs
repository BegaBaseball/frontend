import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

const COPY_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_SOURCE_COPY_V1';
const GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_TEMPLATE_GATE_V1';
const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const EXPECTED_BLOCK_IDS = [
  'daegu-first-table-t1-1',
  'daegu-third-table-t3-2',
  'daegu-central-table-v-v1',
  'daegu-central-table-v-v2',
  'daegu-central-table-v-v3',
];
const COPY_FIELDS = [
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

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const sha256File = async (filePath) => crypto
  .createHash('sha256')
  .update(await fs.readFile(filePath))
  .digest('hex');

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

const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

const normalizeCopyFields = (row) => ({
  operatorDecision: normalizeDecision(row.operatorDecision),
  correctedPath: String(row.correctedPath ?? '').trim(),
  correctedLabelX: row.correctedLabelX ?? '',
  correctedLabelY: row.correctedLabelY ?? '',
  reviewer: String(row.reviewer ?? '').trim(),
  reviewedAt: String(row.reviewedAt ?? '').trim(),
  operatorNote: String(row.operatorNote ?? '').trim(),
});

const rowChanged = (before, after) => COPY_FIELDS.some((field) => String(before[field] ?? '') !== String(after[field] ?? ''));

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const templatePath = path.resolve(
  frontendRoot,
  argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-operator-template.json')),
);
const sourceInputPath = path.resolve(
  frontendRoot,
  argValue('--source-input', path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json')),
);
const gatePath = path.resolve(
  frontendRoot,
  argValue('--gate', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-template-gate.json')),
);
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
const writeSourceInput = hasFlag('--write-source-input');

const template = await readJson(templatePath);
const sourceInput = await readJson(sourceInputPath);
const gate = await readJson(gatePath);
const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
const sourceRows = Array.isArray(sourceInput.corrections) ? sourceInput.corrections : [];
const approvedTemplateRows = templateRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
const approvedByBlockId = new Map(approvedTemplateRows.map((row) => [row.blockId, row]));
const blockers = [];
const warnings = [];

const templateSha256 = await sha256File(templatePath);
const sourceInputSha256Before = await sha256File(sourceInputPath);
const expectedTemplatePath = path.relative(frontendRoot, templatePath);
const expectedSourceInputPath = path.relative(frontendRoot, sourceInputPath);

if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
if (template.templateOnly !== true) blockers.push('TEMPLATE_ONLY_NOT_TRUE');
if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (sourceInput.packageVersion !== 'DAEGU_P1_OPERATOR_PACKAGE_V1') {
  blockers.push(`SOURCE_INPUT_PACKAGE_VERSION_MISMATCH:${sourceInput.packageVersion ?? ''}`);
}
if (sourceInput.targetBatchId !== TARGET_BATCH_ID) blockers.push(`SOURCE_INPUT_BATCH_MISMATCH:${sourceInput.targetBatchId ?? ''}`);
if (gate.summary?.gateVersion !== GATE_VERSION) blockers.push(`GATE_VERSION_MISMATCH:${gate.summary?.gateVersion ?? ''}`);
if (gate.summary?.template !== expectedTemplatePath) blockers.push(`GATE_TEMPLATE_PATH_MISMATCH:${gate.summary?.template ?? ''}:${expectedTemplatePath}`);
if (gate.summary?.sourceInput !== expectedSourceInputPath) {
  blockers.push(`GATE_SOURCE_INPUT_PATH_MISMATCH:${gate.summary?.sourceInput ?? ''}:${expectedSourceInputPath}`);
}
if (!gate.summary?.templateSha256) blockers.push('GATE_TEMPLATE_SHA256_MISSING');
if (!gate.summary?.sourceInputSha256) blockers.push('GATE_SOURCE_INPUT_SHA256_MISSING');
if (gate.summary?.templateSha256 && gate.summary.templateSha256 !== templateSha256) {
  blockers.push('GATE_TEMPLATE_SHA256_STALE');
}
if (gate.summary?.sourceInputSha256 && gate.summary.sourceInputSha256 !== sourceInputSha256Before) {
  blockers.push('GATE_SOURCE_INPUT_SHA256_STALE');
}
if (gate.summary?.status !== 'ready-for-source-copy') {
  warnings.push(`GATE_NOT_READY_FOR_SOURCE_COPY:${gate.summary?.status ?? ''}`);
}
if ((gate.summary?.blockers ?? []).length > 0) blockers.push('GATE_HAS_BLOCKERS');
if ((gate.summary?.invalidRows ?? 0) > 0) blockers.push(`GATE_INVALID_ROWS:${gate.summary.invalidRows}`);
if ((gate.summary?.approvedRows ?? 0) !== EXPECTED_BLOCK_IDS.length) {
  warnings.push(`GATE_REQUIRES_ALL_BOUNDARY_FIRST_APPROVALS:${gate.summary?.approvedRows ?? 0}:${EXPECTED_BLOCK_IDS.length}`);
}

const templateIds = templateRows.map((row) => row.blockId);
const sourceIds = sourceRows.map((row) => row.blockId);
const duplicateTemplateIds = templateIds.filter((blockId, index, ids) => ids.indexOf(blockId) !== index);
const duplicateSourceIds = sourceIds.filter((blockId, index, ids) => ids.indexOf(blockId) !== index);
const missingTemplateIds = EXPECTED_BLOCK_IDS.filter((blockId) => !templateIds.includes(blockId));
const missingSourceIds = EXPECTED_BLOCK_IDS.filter((blockId) => !sourceIds.includes(blockId));
const extraTemplateIds = templateIds.filter((blockId) => !EXPECTED_BLOCK_IDS.includes(blockId));
if (templateRows.length !== EXPECTED_BLOCK_IDS.length) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED_BLOCK_IDS.length}`);
if (duplicateTemplateIds.length > 0) blockers.push(`DUPLICATE_TEMPLATE_BLOCK_ID:${[...new Set(duplicateTemplateIds)].join(' ')}`);
if (duplicateSourceIds.length > 0) blockers.push(`DUPLICATE_SOURCE_INPUT_BLOCK_ID:${[...new Set(duplicateSourceIds)].join(' ')}`);
if (missingTemplateIds.length > 0) blockers.push(`TEMPLATE_MISSING_BOUNDARY_ROWS:${missingTemplateIds.join(' ')}`);
if (missingSourceIds.length > 0) blockers.push(`SOURCE_INPUT_MISSING_BOUNDARY_ROWS:${missingSourceIds.join(' ')}`);
if (extraTemplateIds.length > 0) blockers.push(`TEMPLATE_HAS_NON_BOUNDARY_ROWS:${extraTemplateIds.join(' ')}`);
if (approvedTemplateRows.length !== EXPECTED_BLOCK_IDS.length) {
  warnings.push(`BOUNDARY_FIRST_SOURCE_COPY_WAITING_FOR_ALL_APPROVALS:${approvedTemplateRows.length}:${EXPECTED_BLOCK_IDS.length}`);
}

const rowReports = EXPECTED_BLOCK_IDS.map((blockId) => {
  const templateRow = approvedByBlockId.get(blockId);
  const sourceRow = sourceRows.find((row) => row.blockId === blockId);
  const copiedFields = templateRow ? normalizeCopyFields(templateRow) : {};
  const afterRow = sourceRow && templateRow ? { ...sourceRow, ...copiedFields } : sourceRow;
  return {
    blockId,
    block: templateRow?.block ?? sourceRow?.block ?? '',
    sourceMatched: Boolean(sourceRow),
    approvedInTemplate: Boolean(templateRow),
    changed: Boolean(sourceRow && templateRow && rowChanged(sourceRow, afterRow)),
    operatorDecision: templateRow ? normalizeDecision(templateRow.operatorDecision) : '',
    copiedFields: templateRow ? COPY_FIELDS : [],
  };
});

const canCopy = blockers.length === 0
  && gate.summary?.status === 'ready-for-source-copy'
  && approvedTemplateRows.length === EXPECTED_BLOCK_IDS.length
  && rowReports.every((row) => row.sourceMatched && row.approvedInTemplate);
if (writeSourceInput && !canCopy) blockers.push('WRITE_SOURCE_INPUT_REQUIRES_READY_GATE_AND_FIVE_APPROVALS');

const mergedRows = sourceRows.map((sourceRow) => {
  const templateRow = approvedByBlockId.get(sourceRow.blockId);
  if (!templateRow) return sourceRow;
  return {
    ...sourceRow,
    ...normalizeCopyFields(templateRow),
  };
});
const mergedInput = {
  ...sourceInput,
  generatedAt: new Date().toISOString(),
  existingOperatorInput: path.relative(frontendRoot, sourceInputPath),
  corrections: mergedRows,
};

if (writeSourceInput && canCopy && blockers.length === 0) {
  await fs.writeFile(sourceInputPath, `${JSON.stringify(mergedInput, null, 2)}\n`, 'utf8');
}

const sourceInputSha256After = await sha256File(sourceInputPath);
const status = blockers.length > 0
  ? 'blocked'
  : canCopy
    ? writeSourceInput ? 'source-input-updated' : 'ready-for-write-source-input'
    : approvedTemplateRows.length > 0 ? 'partial-boundary-approval' : 'waiting-for-operator';
const summary = {
  copyVersion: COPY_VERSION,
  status,
  mode: writeSourceInput ? 'write-source-input' : 'dry-run',
  template: expectedTemplatePath,
  templateSha256,
  sourceInput: expectedSourceInputPath,
  sourceInputSha256Before,
  sourceInputSha256After,
  gate: path.relative(frontendRoot, gatePath),
  gateStatus: gate.summary?.status ?? '',
  targetBatchId: TARGET_BATCH_ID,
  totalBoundaryRows: EXPECTED_BLOCK_IDS.length,
  approvedTemplateRows: approvedTemplateRows.length,
  copiedRows: canCopy ? rowReports.filter((row) => row.approvedInTemplate).length : 0,
  changedRows: canCopy ? rowReports.filter((row) => row.changed).length : 0,
  productionWriteAllowed: false,
  writesSourceInput: writeSourceInput && canCopy && blockers.length === 0,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings,
};
const report = {
  generatedAt: new Date().toISOString(),
  summary,
  rows: rowReports,
  safetyContract: [
    'This script copies only operator-approved boundary-first rows from the boundary template into the P1 source input.',
    'It requires a fresh template gate with matching templateSha256 and sourceInputSha256.',
    'It requires all five boundary-first rows to be APPROVED before --write-source-input can update the source input.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts or promotes blocks to OFFICIAL_IMAGE_TRACED.',
  ],
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-source-copy.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-source-copy.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-source-copy.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  ['block', 'sourceMatched', 'approvedInTemplate', 'changed', 'operatorDecision', 'copiedFields'],
  ...rowReports.map((row) => [
    row.block,
    row.sourceMatched,
    row.approvedInTemplate,
    row.changed,
    row.operatorDecision,
    row.copiedFields.join(' '),
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary-First Source Copy',
  '',
  `- copy version: \`${COPY_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- mode: \`${summary.mode}\``,
  `- gate status: \`${summary.gateStatus || 'none'}\``,
  `- approved template rows: ${summary.approvedTemplateRows}/${summary.totalBoundaryRows}`,
  `- copied rows: ${summary.copiedRows}`,
  `- changed rows: ${summary.changedRows}`,
  `- writes source input: ${summary.writesSourceInput}`,
  `- writes production data: ${summary.writesProductionData}`,
  '',
  '## Rows',
  '',
  markdownTable(
    ['block', 'source matched', 'approved', 'changed', 'decision'],
    rowReports.map((row) => [
      `\`${row.block || row.blockId}\``,
      String(row.sourceMatched),
      String(row.approvedInTemplate),
      String(row.changed),
      `\`${row.operatorDecision || 'none'}\``,
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

console.log(`p1_boundary_first_source_copy_json:${jsonPath}`);
console.log(`p1_boundary_first_source_copy_csv:${csvPath}`);
console.log(`p1_boundary_first_source_copy_markdown:${markdownPath}`);
console.log(`status:${summary.status} mode=${summary.mode} approved=${summary.approvedTemplateRows}/${summary.totalBoundaryRows} copied=${summary.copiedRows} changed=${summary.changedRows}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
