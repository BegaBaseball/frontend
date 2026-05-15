import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

const PREFLIGHT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_PREFLIGHT_V1';
const ENTRY_SHEET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_SHEET_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const EXPECTED_BLOCKS = ['T1-1', 'T3-2', 'V1', 'V2', 'V3'];
const EXPECTED_BLOCK_IDS = [
  'daegu-first-table-t1-1',
  'daegu-third-table-t3-2',
  'daegu-central-table-v-v1',
  'daegu-central-table-v-v2',
  'daegu-central-table-v-v3',
];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const hasFlag = (name) => process.argv.includes(name);

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
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

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
const entrySheetPath = path.resolve(
  frontendRoot,
  argValue('--entry-sheet', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.json')),
);
const requireReady = hasFlag('--require-ready');

const entrySheet = await readJson(entrySheetPath);
const entryRows = Array.isArray(entrySheet.rows) ? entrySheet.rows : [];
const blockers = [];
const warnings = [];

if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) {
  blockers.push(`ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
}
if (entrySheet.summary?.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`ENTRY_SHEET_BATCH_MISMATCH:${entrySheet.summary?.targetBatchId ?? ''}`);
}
if (entrySheet.summary?.productionWriteAllowed !== false) blockers.push('ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (entrySheet.summary?.writesOperatorDecision !== false) blockers.push('ENTRY_SHEET_WRITES_OPERATOR_DECISION_NOT_FALSE');
if (entrySheet.summary?.writesCorrectionsTemplate !== false) blockers.push('ENTRY_SHEET_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
if (entrySheet.summary?.writesProductionData !== false) blockers.push('ENTRY_SHEET_WRITES_PRODUCTION_DATA_NOT_FALSE');
if ((entrySheet.summary?.blockers ?? []).length > 0) blockers.push('ENTRY_SHEET_HAS_BLOCKERS');

const blocks = entryRows.map((row) => row.block);
const blockIds = entryRows.map((row) => row.blockId);
if (entryRows.length !== EXPECTED_BLOCKS.length) blockers.push(`ENTRY_SHEET_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED_BLOCKS.length}`);
if (blocks.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`ENTRY_SHEET_BLOCK_ORDER_MISMATCH:${blocks.join(' ')}`);
if (blockIds.join(' ') !== EXPECTED_BLOCK_IDS.join(' ')) blockers.push(`ENTRY_SHEET_BLOCK_ID_ORDER_MISMATCH:${blockIds.join(' ')}`);

const rows = entryRows.map((row) => {
  const missingOperatorInputFields = Array.isArray(row.missingOperatorInputFields)
    ? row.missingOperatorInputFields
    : [];
  const readyForTemplateGate = missingOperatorInputFields.length === 0;
  if (!row.editableTarget) blockers.push(`ENTRY_ROW_EDITABLE_TARGET_MISSING:${row.block ?? row.blockId}`);
  if (!row.evidenceCrop) warnings.push(`ENTRY_ROW_EVIDENCE_CROP_MISSING:${row.block ?? row.blockId}`);
  if (!String(row.candidatePathPolicy ?? '').includes('reference-only')) {
    blockers.push(`ENTRY_ROW_CANDIDATE_POLICY_MISSING:${row.block ?? row.blockId}`);
  }
  return {
    blockId: row.blockId,
    block: row.block,
    editableTarget: row.editableTarget,
    currentDecision: row.currentDecision,
    readyForTemplateGate,
    missingOperatorInputFields,
    nextOperatorAction: row.nextOperatorAction,
    evidenceCrop: row.evidenceCrop,
  };
});

const rowsReadyForTemplateGate = rows.filter((row) => row.readyForTemplateGate);
const rowsWaitingForOperator = rows.filter((row) => !row.readyForTemplateGate);
if (requireReady && rowsWaitingForOperator.length > 0) {
  blockers.push(`ENTRY_PREFLIGHT_REQUIRES_OPERATOR_INPUT:${rowsWaitingForOperator.length}:${rows.length}`);
}

const status = blockers.length > 0
  ? 'blocked'
  : rowsWaitingForOperator.length === 0
    ? 'ready-for-template-gate'
    : 'waiting-for-operator-entry';
const summary = {
  preflightVersion: PREFLIGHT_VERSION,
  status,
  mode: requireReady ? 'require-ready' : 'report-only',
  targetBatchId: TARGET_BATCH_ID,
  entrySheet: path.relative(frontendRoot, entrySheetPath),
  totalRows: rows.length,
  rowsReadyForTemplateGate: rowsReadyForTemplateGate.length,
  rowsWaitingForOperator: rowsWaitingForOperator.length,
  requireReady,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This preflight is read-only.',
    'It is the explicit stop sign before source-copy/write when operator input is incomplete.',
    'Report-only mode records waiting-for-operator-entry without failing the command.',
    'Require-ready mode fails until all five boundary-first rows have no missingOperatorInputFields.',
    'It never writes operatorDecision or corrected fields into any source input.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
  ],
  rows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-preflight.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-preflight.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-preflight.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'block',
    'editableTarget',
    'currentDecision',
    'readyForTemplateGate',
    'missingOperatorInputFields',
    'evidenceCrop',
    'nextOperatorAction',
  ],
  ...rows.map((row) => [
    row.block,
    row.editableTarget,
    row.currentDecision,
    row.readyForTemplateGate,
    row.missingOperatorInputFields.join(' '),
    row.evidenceCrop,
    row.nextOperatorAction,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary-First Entry Preflight',
  '',
  `- preflight version: \`${PREFLIGHT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- mode: \`${summary.mode}\``,
  `- rows ready for template gate: ${summary.rowsReadyForTemplateGate}/${summary.totalRows}`,
  `- rows waiting for operator: ${summary.rowsWaitingForOperator}`,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Rows',
  '',
  markdownTable(
    ['block', 'editable target', 'decision', 'ready', 'missing input', 'next action'],
    rows.map((row) => [
      `\`${row.block}\``,
      `\`${row.editableTarget}\``,
      `\`${row.currentDecision}\``,
      String(row.readyForTemplateGate),
      row.missingOperatorInputFields.map((field) => `\`${field}\``).join(' ') || '-',
      row.nextOperatorAction,
    ]),
  ),
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`p1_boundary_first_entry_preflight_json:${jsonPath}`);
console.log(`p1_boundary_first_entry_preflight_csv:${csvPath}`);
console.log(`p1_boundary_first_entry_preflight_markdown:${markdownPath}`);
console.log(`status:${summary.status} mode=${summary.mode} ready=${summary.rowsReadyForTemplateGate}/${summary.totalRows} waiting=${summary.rowsWaitingForOperator}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
