import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

const INPUT_PACKET_VERSION = 'DAEGU_P2A_OPERATOR_INPUT_PACKET_V1';
const P2A_POST_ENTRY_QA_VERSION = 'DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1';
const ENTRY_SHEET_VERSION = 'DAEGU_P2_OPERATOR_ENTRY_SHEET_V1';
const TRACING_PACK_VERSION = 'DAEGU_P2_OPERATOR_TRACING_PACK_V1';
const TARGET_BATCH_ID = 'BATCH_3_P2';
const TARGET_WORKSET = 'P2-A';
const EXPECTED_P2A_ROWS = 2;
const REQUIRED_FIELDS = [
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'operatorNote',
];
const LABEL_TOP_HIT_CHECKLIST = [
  'CHECK_CORRECTED_LABEL_POINT_INSIDE_POLYGON',
  'CHECK_LABEL_POINT_SELECTS_SAME_BLOCK',
  'CHECK_HIT_PATH_DOES_NOT_CAPTURE_NEIGHBOR_BLOCK',
  'CHECK_PATH_ALIGNED_TO_OFFICIAL_PNG_SEAT_AREA',
  'CHECK_CURRENT_AND_CANDIDATE_PATHS_NOT_COPIED',
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

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
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

const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
const entrySheetPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-entry-sheet.json');
const tracingPackPath = path.join(
  p2OperatorDir,
  'daegu-seatmap-p2-operator-tracing-pack/daegu-seatmap-p2-operator-tracing-pack.json',
);
const p2aQaPath = path.join(p2OperatorDir, 'daegu-seatmap-p2a-operator-post-entry-qa.json');

const reports = {
  entrySheet: await readJsonReport(entrySheetPath),
  tracingPack: await readJsonReport(tracingPackPath),
  p2aPostEntryQa: await readJsonReport(p2aQaPath),
};

const entrySummary = reports.entrySheet.data?.summary ?? {};
const tracingSummary = reports.tracingPack.data?.summary ?? {};
const qaSummary = reports.p2aPostEntryQa.data?.summary ?? {};
const structuralBlockers = [];

Object.values(reports).forEach((report) => {
  if (!report.exists) structuralBlockers.push(`MISSING_REPORT:${report.relativePath}`);
});

if (reports.entrySheet.exists && entrySummary.entrySheetVersion !== ENTRY_SHEET_VERSION) {
  structuralBlockers.push(`ENTRY_SHEET_VERSION_MISMATCH:${entrySummary.entrySheetVersion ?? ''}`);
}
if (reports.tracingPack.exists && tracingSummary.tracingPackVersion !== TRACING_PACK_VERSION) {
  structuralBlockers.push(`TRACING_PACK_VERSION_MISMATCH:${tracingSummary.tracingPackVersion ?? ''}`);
}
if (reports.p2aPostEntryQa.exists && qaSummary.p2aPostEntryQaVersion !== P2A_POST_ENTRY_QA_VERSION) {
  structuralBlockers.push(`P2A_POST_ENTRY_QA_VERSION_MISMATCH:${qaSummary.p2aPostEntryQaVersion ?? ''}`);
}
if (reports.entrySheet.exists && entrySummary.targetBatchId !== TARGET_BATCH_ID) {
  structuralBlockers.push(`ENTRY_SHEET_BATCH_MISMATCH:${entrySummary.targetBatchId ?? ''}`);
}
if (reports.tracingPack.exists && tracingSummary.targetBatchId !== TARGET_BATCH_ID) {
  structuralBlockers.push(`TRACING_PACK_BATCH_MISMATCH:${tracingSummary.targetBatchId ?? ''}`);
}
if (reports.p2aPostEntryQa.exists && qaSummary.targetBatchId !== TARGET_BATCH_ID) {
  structuralBlockers.push(`P2A_POST_ENTRY_QA_BATCH_MISMATCH:${qaSummary.targetBatchId ?? ''}`);
}
if (reports.entrySheet.exists && entrySummary.productionWriteAllowed !== false) {
  structuralBlockers.push('ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
}
if (reports.tracingPack.exists && tracingSummary.productionWriteAllowed !== false) {
  structuralBlockers.push('TRACING_PACK_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
}
if (reports.p2aPostEntryQa.exists && qaSummary.productionWriteAllowed !== false) {
  structuralBlockers.push('P2A_POST_ENTRY_QA_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
}

const entryRows = (Array.isArray(reports.entrySheet.data?.worksets) ? reports.entrySheet.data.worksets : [])
  .flatMap((workset) => (Array.isArray(workset.rows) ? workset.rows : []))
  .filter((row) => row.workset === TARGET_WORKSET);
const tracingRows = (Array.isArray(reports.tracingPack.data?.rows) ? reports.tracingPack.data.rows : [])
  .filter((row) => row.workset === TARGET_WORKSET);
const qaRows = (Array.isArray(reports.p2aPostEntryQa.data?.rows) ? reports.p2aPostEntryQa.data.rows : [])
  .filter((row) => row.subset === TARGET_WORKSET || row.workset === TARGET_WORKSET);

const entryByBlockId = new Map(entryRows.map((row) => [row.blockId, row]));
const tracingByBlockId = new Map(tracingRows.map((row) => [row.blockId, row]));
const qaByBlockId = new Map(qaRows.map((row) => [row.blockId, row]));
const blockIds = [...new Set([
  ...entryRows.map((row) => row.blockId),
  ...tracingRows.map((row) => row.blockId),
  ...qaRows.map((row) => row.blockId),
])].filter(Boolean);

if (entryRows.length !== EXPECTED_P2A_ROWS) {
  structuralBlockers.push(`P2A_ENTRY_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED_P2A_ROWS}`);
}
if (tracingRows.length !== EXPECTED_P2A_ROWS) {
  structuralBlockers.push(`P2A_TRACING_ROW_COUNT_MISMATCH:${tracingRows.length}:${EXPECTED_P2A_ROWS}`);
}
if (qaRows.length !== EXPECTED_P2A_ROWS) {
  structuralBlockers.push(`P2A_QA_ROW_COUNT_MISMATCH:${qaRows.length}:${EXPECTED_P2A_ROWS}`);
}
if (blockIds.length !== EXPECTED_P2A_ROWS) {
  structuralBlockers.push(`P2A_BLOCK_ID_UNION_COUNT_MISMATCH:${blockIds.length}:${EXPECTED_P2A_ROWS}`);
}

const rows = [];
for (const blockId of blockIds) {
  const entryRow = entryByBlockId.get(blockId) ?? {};
  const tracingRow = tracingByBlockId.get(blockId) ?? {};
  const qaRow = qaByBlockId.get(blockId) ?? {};
  const evidenceCrop = qaRow.evidenceCrop ?? entryRow.evidenceCrop ?? tracingRow.evidenceCrop ?? '';
  const tracingSvg = qaRow.tracingSvg ?? tracingRow.tracingSvg ?? '';
  const evidenceCropExists = evidenceCrop
    ? await fileExists(path.resolve(frontendRoot, evidenceCrop))
    : false;
  const tracingSvgExists = tracingSvg
    ? await fileExists(path.resolve(frontendRoot, tracingSvg))
    : false;
  const rowBlockers = [];

  if (!entryRow.blockId) rowBlockers.push('ENTRY_ROW_MISSING');
  if (!tracingRow.blockId) rowBlockers.push('TRACING_ROW_MISSING');
  if (!qaRow.blockId) rowBlockers.push('POST_ENTRY_QA_ROW_MISSING');
  if (!evidenceCropExists) rowBlockers.push('EVIDENCE_CROP_MISSING');
  if (!tracingSvgExists) rowBlockers.push('TRACING_SVG_MISSING');

  rows.push({
    inputPacketVersion: INPUT_PACKET_VERSION,
    workset: TARGET_WORKSET,
    block: entryRow.block ?? qaRow.block ?? tracingRow.block ?? '',
    blockId,
    name: entryRow.name ?? qaRow.name ?? tracingRow.name ?? '',
    category: entryRow.category ?? tracingRow.category ?? '',
    editableTarget: entryRow.editableTarget ?? qaRow.editableTarget ?? tracingRow.editableTarget ?? '',
    requiredFields: REQUIRED_FIELDS,
    labelTopHitChecklist: LABEL_TOP_HIT_CHECKLIST,
    decision: qaRow.decision ?? entryRow.decision ?? '',
    rowStatus: qaRow.rowStatus ?? entryRow.rowStatus ?? '',
    missingEntryFields: entryRow.missingEntryFields ?? [],
    requiredOperatorReview: entryRow.requiredOperatorReview ?? '',
    operatorAction: entryRow.operatorAction ?? '',
    evidenceCrop,
    evidenceCropExists,
    tracingSvg,
    tracingSvgExists,
    currentPath: entryRow.currentPath ?? tracingRow.currentPath ?? '',
    currentPathPointCount: entryRow.currentPathPointCount ?? tracingRow.currentPathPointCount ?? 0,
    currentPathReferenceOnly: true,
    candidatePath: entryRow.candidatePath ?? tracingRow.candidatePath ?? '',
    candidatePathPointCount: entryRow.candidatePathPointCount ?? tracingRow.candidatePathPointCount ?? 0,
    candidatePathReferenceOnly: true,
    currentLabel: `${entryRow.currentLabelX ?? tracingRow.currentLabelX ?? ''},${entryRow.currentLabelY ?? tracingRow.currentLabelY ?? ''}`,
    candidateLabel: `${entryRow.candidateLabelX ?? tracingRow.candidateLabelX ?? ''},${entryRow.candidateLabelY ?? tracingRow.candidateLabelY ?? ''}`,
    correctedPathPointCount: qaRow.correctedPathPointCount ?? entryRow.correctedPathPointCount ?? 0,
    minCorrectedPathPoints: qaRow.minCorrectedPathPoints ?? 6,
    postEntryActions: qaRow.actions ?? [],
    postEntryWarnings: qaRow.warnings ?? [],
    postEntryBlockers: qaRow.blockers ?? [],
    nextAction: qaRow.nextAction ?? '',
    p1PostwriteStatus: qaRow.p1PostwriteStatus ?? qaSummary.p1PostwriteStatus ?? '',
    noCopyPolicy: 'currentPath and candidatePath are reference-only and must not be copied into correctedPath.',
    operatorInstruction: 'Trace correctedPath on the official PNG evidence, set correctedLabelX/Y after label top-hit QA, then fill reviewer and reviewedAt.',
    rowBlockers,
  });
}

const rowBlockers = rows.flatMap((row) => row.rowBlockers.map((blocker) => `${row.block}:${blocker}`));
const blockers = [...structuralBlockers, ...rowBlockers];
const approvedRows = rows.filter((row) => row.decision === 'APPROVED');
const waitingRows = rows.filter((row) => row.decision !== 'APPROVED');
const p1PostwriteStatus = qaSummary.p1PostwriteStatus ?? '';
const p1PostwriteVerified = p1PostwriteStatus === 'postwrite-verified';
const status = blockers.length > 0
  ? 'blocked'
  : approvedRows.length < EXPECTED_P2A_ROWS
    ? 'waiting-for-operator-entry'
    : !p1PostwriteVerified
      ? 'waiting-for-p1-postwrite'
      : 'ready-for-p2-readiness';

const summary = {
  inputPacketVersion: INPUT_PACKET_VERSION,
  status,
  targetBatchId: TARGET_BATCH_ID,
  targetWorkset: TARGET_WORKSET,
  expectedRows: EXPECTED_P2A_ROWS,
  totalRows: rows.length,
  approvedRows: approvedRows.length,
  waitingForOperatorRows: waitingRows.length,
  p1PostwriteStatus,
  p1PostwriteVerified,
  readyForP2Readiness: status === 'ready-for-p2-readiness',
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesSourceInput: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  sourceEntrySheet: path.relative(frontendRoot, entrySheetPath),
  sourceTracingPack: path.relative(frontendRoot, tracingPackPath),
  sourceP2aPostEntryQa: path.relative(frontendRoot, p2aQaPath),
  requiredFields: REQUIRED_FIELDS,
  labelTopHitChecklist: LABEL_TOP_HIT_CHECKLIST,
  blockers,
  warnings: [...new Set(rows.flatMap((row) => row.postEntryWarnings))],
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This P2-A input packet is read-only.',
    'It aggregates entry sheet, tracing pack, and P2-A post-entry QA artifacts for operator use.',
    'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, reviewedAt, or operatorNote.',
    'It never writes source input or the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'currentPath is reference-only and must not be copied into correctedPath.',
    'candidatePath is reference-only and must not be copied into correctedPath.',
    'P2-A approval never bypasses full P2 readiness or the production write guard.',
  ],
  rows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-input-packet.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-input-packet.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-input-packet.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'workset',
    'block',
    'blockId',
    'editableTarget',
    'decision',
    'rowStatus',
    'requiredFields',
    'labelTopHitChecklist',
    'evidenceCrop',
    'evidenceCropExists',
    'tracingSvg',
    'tracingSvgExists',
    'postEntryActions',
    'nextAction',
    'rowBlockers',
  ],
  ...rows.map((row) => [
    row.workset,
    row.block,
    row.blockId,
    row.editableTarget,
    row.decision,
    row.rowStatus,
    row.requiredFields.join(' '),
    row.labelTopHitChecklist.join(' '),
    row.evidenceCrop,
    row.evidenceCropExists,
    row.tracingSvg,
    row.tracingSvgExists,
    row.postEntryActions.join(' '),
    row.nextAction,
    row.rowBlockers.join(' '),
  ]),
]);

await fs.writeFile(markdownPath, [
  '# Daegu P2-A Operator Input Packet',
  '',
  `- input packet version: \`${INPUT_PACKET_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- workset: \`${summary.targetWorkset}\``,
  `- rows: ${summary.totalRows}/${summary.expectedRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- waiting for operator: ${summary.waitingForOperatorRows}`,
  `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
  `- ready for P2 readiness: ${summary.readyForP2Readiness}`,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Required Fields',
  '',
  ...REQUIRED_FIELDS.map((field) => `- \`${field}\``),
  '',
  '## Label Top-Hit Checklist',
  '',
  ...LABEL_TOP_HIT_CHECKLIST.map((item) => `- \`${item}\``),
  '',
  '## Rows',
  '',
  markdownTable(
    [
      'block',
      'editable target',
      'decision',
      'evidence crop',
      'tracing svg',
      'missing fields',
      'actions',
      'next action',
      'blockers',
    ],
    rows.map((row) => [
      `\`${row.block}\``,
      `\`${row.editableTarget}\``,
      `\`${row.decision}\``,
      `\`${row.evidenceCrop}\``,
      `\`${row.tracingSvg}\``,
      row.missingEntryFields.map((field) => `\`${field}\``).join(' ') || '-',
      row.postEntryActions.map((action) => `\`${action}\``).join(' ') || '-',
      `\`${row.nextAction || 'missing'}\``,
      row.rowBlockers.map((blocker) => `\`${blocker}\``).join(' ') || '-',
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

console.log(`p2a_operator_input_packet_json:${jsonPath}`);
console.log(`p2a_operator_input_packet_csv:${csvPath}`);
console.log(`p2a_operator_input_packet_markdown:${markdownPath}`);
console.log(`status:${summary.status} rows=${summary.totalRows}/${summary.expectedRows} approved=${summary.approvedRows} blockers=${summary.blockers.length}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
