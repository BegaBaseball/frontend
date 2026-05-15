import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

const HANDOFF_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_HANDOFF_V1';
const TRACING_PACK_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_TRACING_PACK_V1';
const ENTRY_PREFLIGHT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_PREFLIGHT_V1';
const POSTWRITE_GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
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

const list = (value) => (Array.isArray(value) ? value : []);

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const tracingPackDir = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-tracing-pack');
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));

const reports = {
  tracingPack: await readJsonReport(path.join(tracingPackDir, 'daegu-seatmap-p1-boundary-first-tracing-pack.json')),
  entrySheet: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.json')),
  entryPreflight: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-entry-preflight.json')),
  templateGate: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-template-gate.json')),
  sourceCopy: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-source-copy.json')),
  postwriteGate: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-postwrite-gate.json')),
};

const blockers = [];
const warnings = [];

Object.entries(reports).forEach(([name, report]) => {
  if (!report.exists) blockers.push(`MISSING_REPORT:${name}:${report.relativePath}`);
});

if (reports.tracingPack.exists && reports.tracingPack.data?.summary?.tracingPackVersion !== TRACING_PACK_VERSION) {
  blockers.push(`TRACING_PACK_VERSION_MISMATCH:${reports.tracingPack.data?.summary?.tracingPackVersion ?? ''}`);
}
if (reports.entryPreflight.exists && reports.entryPreflight.data?.summary?.preflightVersion !== ENTRY_PREFLIGHT_VERSION) {
  blockers.push(`ENTRY_PREFLIGHT_VERSION_MISMATCH:${reports.entryPreflight.data?.summary?.preflightVersion ?? ''}`);
}
if (reports.postwriteGate.exists && reports.postwriteGate.data?.summary?.gateVersion !== POSTWRITE_GATE_VERSION) {
  blockers.push(`POSTWRITE_GATE_VERSION_MISMATCH:${reports.postwriteGate.data?.summary?.gateVersion ?? ''}`);
}

const tracingRows = list(reports.tracingPack.data?.rows);
const entryRows = list(reports.entrySheet.data?.rows);
const postwriteRows = list(reports.postwriteGate.data?.rows);
const tracingById = new Map(tracingRows.map((row) => [row.blockId, row]));
const entryById = new Map(entryRows.map((row) => [row.blockId, row]));
const postwriteById = new Map(postwriteRows.map((row) => [row.blockId, row]));
const tracingIds = tracingRows.map((row) => row.blockId);
const entryIds = entryRows.map((row) => row.blockId);
const templateGateStatus = reports.templateGate.data?.summary?.status ?? '';
const sourceCopyStatus = reports.sourceCopy.data?.summary?.status ?? '';
const readyForSourceCopyGate = templateGateStatus === 'ready-for-source-copy'
  && ['ready-for-write-source-input', 'source-input-updated'].includes(sourceCopyStatus);

if (tracingRows.length !== EXPECTED_BLOCK_IDS.length) {
  blockers.push(`TRACING_PACK_ROW_COUNT_MISMATCH:${tracingRows.length}:${EXPECTED_BLOCK_IDS.length}`);
}
if (entryRows.length !== EXPECTED_BLOCK_IDS.length) {
  blockers.push(`ENTRY_SHEET_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED_BLOCK_IDS.length}`);
}
if (tracingIds.join(' ') !== EXPECTED_BLOCK_IDS.join(' ')) {
  blockers.push(`TRACING_PACK_BLOCK_ORDER_MISMATCH:${tracingIds.join(' ')}`);
}
if (entryIds.join(' ') !== EXPECTED_BLOCK_IDS.join(' ')) {
  blockers.push(`ENTRY_SHEET_BLOCK_ORDER_MISMATCH:${entryIds.join(' ')}`);
}

[
  reports.tracingPack.data?.summary,
  reports.entrySheet.data?.summary,
  reports.entryPreflight.data?.summary,
  reports.postwriteGate.data?.summary,
].filter(Boolean).forEach((summary) => {
  if (summary.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TARGET_BATCH_MISMATCH:${summary.targetBatchId ?? ''}`);
  if (summary.productionWriteAllowed !== false) blockers.push(`PRODUCTION_WRITE_ALLOWED_NOT_FALSE:${summary.targetBatchId ?? ''}`);
  if (summary.writesProductionData !== false) blockers.push(`WRITES_PRODUCTION_DATA_NOT_FALSE:${summary.targetBatchId ?? ''}`);
});

const rows = EXPECTED_BLOCK_IDS.map((blockId) => {
  const tracingRow = tracingById.get(blockId) ?? {};
  const entryRow = entryById.get(blockId) ?? {};
  const postwriteRow = postwriteById.get(blockId) ?? {};
  const missingOperatorInputFields = list(entryRow.missingOperatorInputFields ?? tracingRow.missingOperatorInputFields);
  const rowStatus = postwriteRow.postwriteReady
    ? 'postwrite-verified'
    : missingOperatorInputFields.length === 0
      ? readyForSourceCopyGate ? 'ready-for-source-copy' : 'operator-input-needs-gate-fix'
      : 'waiting-for-operator';

  return {
    blockId,
    block: tracingRow.block ?? entryRow.block ?? postwriteRow.block ?? '',
    editableTarget: tracingRow.editableTarget ?? entryRow.editableTarget ?? '',
    templateJsonPointer: tracingRow.templateJsonPointer ?? '',
    tracingSvg: tracingRow.tracingSvg ?? '',
    evidenceCrop: tracingRow.evidenceCrop ?? entryRow.evidenceCrop ?? '',
    evidenceCropExists: tracingRow.evidenceCropExists === true,
    sourceDecision: postwriteRow.sourceDecision ?? entryRow.currentDecision ?? '',
    alignmentClass: postwriteRow.alignmentClass ?? '',
    renderLayer: postwriteRow.renderLayer ?? '',
    missingOperatorInputFields,
    rowStatus,
    nextOperatorAction: missingOperatorInputFields.length > 0
      ? `Fill ${missingOperatorInputFields.join(', ')} in ${tracingRow.editableTarget ?? entryRow.editableTarget ?? 'boundary template row'}.`
      : 'Run template gate and source-copy dry-run before production write.',
  };
});

const waitingRows = rows.filter((row) => row.rowStatus === 'waiting-for-operator');
const readyRows = rows.filter((row) => row.rowStatus === 'ready-for-source-copy');
const verifiedRows = rows.filter((row) => row.rowStatus === 'postwrite-verified');
const needsGateFixRows = rows.filter((row) => row.rowStatus === 'operator-input-needs-gate-fix');
const status = blockers.length > 0
  ? 'blocked'
  : verifiedRows.length === EXPECTED_BLOCK_IDS.length
    ? 'postwrite-verified'
    : readyRows.length === EXPECTED_BLOCK_IDS.length
      ? 'ready-for-source-copy'
      : needsGateFixRows.length > 0 && waitingRows.length === 0
        ? 'operator-input-needs-gate-fix'
        : 'ready-for-operator-tracing';

if (waitingRows.length > 0) warnings.push(`P1_BOUNDARY_FIRST_OPERATOR_INPUT_REQUIRED:${waitingRows.length}:${rows.length}`);
if (needsGateFixRows.length > 0) warnings.push(`P1_BOUNDARY_FIRST_OPERATOR_INPUT_NEEDS_GATE_FIX:${needsGateFixRows.length}:${rows.length}`);
if (reports.postwriteGate.data?.summary?.status === 'waiting-for-operator') {
  warnings.push('P1_BOUNDARY_FIRST_POSTWRITE_GATE_WAITING_FOR_OPERATOR');
}

const summary = {
  handoffVersion: HANDOFF_VERSION,
  status,
  targetBatchId: TARGET_BATCH_ID,
  totalRows: rows.length,
  waitingForOperatorRows: waitingRows.length,
  readyForSourceCopyRows: readyRows.length,
  operatorInputNeedsGateFixRows: needsGateFixRows.length,
  postwriteVerifiedRows: verifiedRows.length,
  tracingPackStatus: reports.tracingPack.data?.summary?.status ?? '',
  entryPreflightStatus: reports.entryPreflight.data?.summary?.status ?? '',
  templateGateStatus,
  sourceCopyStatus,
  postwriteGateStatus: reports.postwriteGate.data?.summary?.status ?? '',
  nextCommand: waitingRows.length > 0
    ? 'Fill reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-operator-template.json, then run npm run stadium:daegu:p1-boundary-first-template-gate.'
    : status === 'ready-for-source-copy'
      ? 'Run npm run stadium:daegu:p1-boundary-first-source-copy:write-source-input, then P1 prewrite/import/write gates.'
      : status === 'operator-input-needs-gate-fix'
        ? 'Run npm run stadium:daegu:p1-boundary-first-template-gate and fix reported blockers before source-copy.'
        : 'Run npm run stadium:daegu:operator-corrections-postwrite-gate.',
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesSourceInput: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  sourceReports: Object.fromEntries(
    Object.entries(reports).map(([name, reportEntry]) => [name, reportEntry.relativePath]),
  ),
  safetyContract: [
    'This handoff is read-only.',
    'It aggregates boundary-first tracing, entry, template gate, source-copy, and postwrite status for operator work.',
    'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
    'It never writes source input or the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'candidatePath is reference-only and must not be copied into correctedPath.',
  ],
  requiredOperatorFields: [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
  ],
  rows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-operator-handoff.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-operator-handoff.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-operator-handoff.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'block',
    'editableTarget',
    'rowStatus',
    'sourceDecision',
    'alignmentClass',
    'renderLayer',
    'missingOperatorInputFields',
    'tracingSvg',
    'evidenceCrop',
    'nextOperatorAction',
  ],
  ...rows.map((row) => [
    row.block,
    row.editableTarget,
    row.rowStatus,
    row.sourceDecision,
    row.alignmentClass,
    row.renderLayer,
    row.missingOperatorInputFields.join(' '),
    row.tracingSvg,
    row.evidenceCrop,
    row.nextOperatorAction,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary-First Operator Handoff',
  '',
  `- handoff version: \`${HANDOFF_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- waiting for operator: ${summary.waitingForOperatorRows}/${summary.totalRows}`,
  `- ready for source copy: ${summary.readyForSourceCopyRows}/${summary.totalRows}`,
  `- operator input needs gate fix: ${summary.operatorInputNeedsGateFixRows}/${summary.totalRows}`,
  `- postwrite verified: ${summary.postwriteVerifiedRows}/${summary.totalRows}`,
  `- next command: \`${summary.nextCommand}\``,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Required Operator Fields',
  '',
  ...report.requiredOperatorFields.map((field) => `- \`${field}\``),
  '',
  '## Rows',
  '',
  markdownTable(
    ['block', 'editable target', 'status', 'source decision', 'alignment', 'render layer', 'missing fields', 'tracing SVG', 'evidence crop', 'next action'],
    rows.map((row) => [
      `\`${row.block}\``,
      `\`${row.editableTarget}\``,
      `\`${row.rowStatus}\``,
      `\`${row.sourceDecision}\``,
      `\`${row.alignmentClass}\``,
      `\`${row.renderLayer}\``,
      row.missingOperatorInputFields.map((field) => `\`${field}\``).join(' ') || '-',
      `\`${row.tracingSvg}\``,
      `\`${row.evidenceCrop}\``,
      row.nextOperatorAction,
    ]),
  ),
  '',
  '## Source Reports',
  '',
  ...Object.entries(report.sourceReports).map(([name, sourcePath]) => `- ${name}: \`${sourcePath}\``),
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

console.log(`p1_boundary_first_operator_handoff_json:${jsonPath}`);
console.log(`p1_boundary_first_operator_handoff_csv:${csvPath}`);
console.log(`p1_boundary_first_operator_handoff_markdown:${markdownPath}`);
console.log(`status:${summary.status} waiting=${summary.waitingForOperatorRows}/${summary.totalRows} readyForSourceCopy=${summary.readyForSourceCopyRows}/${summary.totalRows} needsGateFix=${summary.operatorInputNeedsGateFixRows}/${summary.totalRows} postwriteVerified=${summary.postwriteVerifiedRows}/${summary.totalRows}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
