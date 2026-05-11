import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const IMPORT_VERSION = 'DAEGU_P0_OFF_SEAT_OPERATOR_IMPORT_V1';
const DRAFT_INPUT_VERSION = 'DAEGU_P0_OFF_SEAT_OPERATOR_INPUT_V1';
const SOURCE_INPUT_VERSION = 'DAEGU_P0_OPERATOR_PACKAGE_V1';
const TARGET_BATCH_ID = 'BATCH_1_P0';
const TARGET_PRIORITY = 'P0';
const MIN_OFFICIAL_TRACE_POINTS = 6;
const DRAFT_REVIEWER = 'DRAFT_VALIDATION_ONLY';
const DRAFT_REVIEWED_AT = '2026-05-10T00:00:00.000Z';
const DEFAULT_DRAFT_INPUT = 'reports/stadium/daegu-p0-off-seat-operator-input.json';
const DEFAULT_SOURCE_INPUT = 'reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json';
const EXPECTED = {
  expectedRows: 2,
  expectedApprovedRows: 0,
  expectedDuplicateRows: 0,
};
const EXPECTED_BLOCK_IDS = new Set([
  'daegu-accessible-sky-09',
  'daegu-accessible-u22',
]);
const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
const SOURCE_COPY_FIELDS = [
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

const relativeToFrontendRoot = (filePath) => path.relative(frontendRoot, filePath);

const pathFromFrontendRoot = (filePath) => (
  path.isAbsolute(filePath) ? filePath : path.resolve(frontendRoot, filePath)
);

const normalizePathText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const pathPointCount = (pathText) => {
  const normalized = normalizePathText(pathText);
  if (!normalized) return 0;
  const matches = normalized.match(/[ML]\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/gi);
  return matches ? matches.length : 0;
};

const hasValue = (value) => String(value ?? '').trim() !== '';

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const isDraftMarkerValue = (row) => (
  row.draftOnly === true
  || row.stagingOnly === true
  || row.reviewer === DRAFT_REVIEWER
  || row.reviewedAt === DRAFT_REVIEWED_AT
);

const copyEditableFields = (draftRow) => ({
  operatorDecision: normalizeDecision(draftRow.operatorDecision),
  correctedPath: String(draftRow.correctedPath ?? '').trim(),
  correctedLabelX: draftRow.correctedLabelX ?? '',
  correctedLabelY: draftRow.correctedLabelY ?? '',
  reviewer: String(draftRow.reviewer ?? '').trim(),
  reviewedAt: String(draftRow.reviewedAt ?? '').trim(),
  operatorNote: String(draftRow.operatorNote ?? '').trim(),
});

const rowChanged = (before, after) => SOURCE_COPY_FIELDS.some((field) => (
  String(before[field] ?? '') !== String(after[field] ?? '')
));

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const draftInputPath = pathFromFrontendRoot(argValue('--draft', DEFAULT_DRAFT_INPUT));
const writeSourceInput = hasFlag('--write-source-input');
const jsonPath = path.join(reportDir, 'daegu-p0-off-seat-operator-import.json');
const csvPath = path.join(reportDir, 'daegu-p0-off-seat-operator-import.csv');
const markdownPath = path.join(reportDir, 'daegu-p0-off-seat-operator-import.md');

const draft = await readJson(draftInputPath);
const sourceInputPath = pathFromFrontendRoot(argValue(
  '--source-input',
  draft.copyTargetSourceInput ?? draft.summary?.copyTargetSourceInput ?? DEFAULT_SOURCE_INPUT,
));
const sourceInput = await readJson(sourceInputPath);
const draftRows = Array.isArray(draft.corrections) ? draft.corrections : [];
const sourceRows = Array.isArray(sourceInput.corrections) ? sourceInput.corrections : [];
const sourceByBlockId = new Map(sourceRows.map((row) => [row.blockId, row]));
const blockers = [];
const warnings = [];

if (draft.packageVersion !== DRAFT_INPUT_VERSION) {
  blockers.push(`DRAFT_INPUT_VERSION_MISMATCH:${draft.packageVersion ?? ''}`);
}
if (draft.targetBatchId !== TARGET_BATCH_ID) blockers.push(`DRAFT_BATCH_MISMATCH:${draft.targetBatchId ?? ''}`);
if (draft.draftOnly !== true) blockers.push('DRAFT_INPUT_MUST_BE_DRAFT_ONLY');
if (draft.sourceOfTruth !== false) blockers.push('DRAFT_INPUT_MUST_NOT_BE_SOURCE_OF_TRUTH');
if (draft.productionWriteAllowed !== false) blockers.push('DRAFT_INPUT_PRODUCTION_WRITE_ALLOWED');
if (relativeToFrontendRoot(sourceInputPath) !== (draft.copyTargetSourceInput ?? DEFAULT_SOURCE_INPUT)) {
  blockers.push(`DRAFT_COPY_TARGET_SOURCE_INPUT_MISMATCH:${draft.copyTargetSourceInput ?? ''}`);
}
if (sourceInput.packageVersion !== SOURCE_INPUT_VERSION) {
  blockers.push(`SOURCE_INPUT_VERSION_MISMATCH:${sourceInput.packageVersion ?? ''}`);
}
if (sourceInput.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`SOURCE_INPUT_BATCH_MISMATCH:${sourceInput.targetBatchId ?? ''}`);
}
if (sourceInput.draftOnly === true) blockers.push('SOURCE_INPUT_MUST_NOT_BE_DRAFT_ONLY');
if (sourceInput.stagingOnly === true) blockers.push('SOURCE_INPUT_MUST_NOT_BE_STAGING_ONLY');
if (sourceInput.productionWriteAllowed !== false) blockers.push('SOURCE_INPUT_PRODUCTION_WRITE_ALLOWED');

const draftIds = draftRows.map((row) => row.blockId);
const duplicateDraftIds = draftIds.filter((blockId, index, blockIds) => blockIds.indexOf(blockId) !== index);
if (draftRows.length !== EXPECTED.expectedRows) {
  blockers.push(`P0_OFF_SEAT_IMPORT_ROWS_CHANGED:${draftRows.length}:${EXPECTED.expectedRows}`);
}
if (duplicateDraftIds.length > 0) {
  blockers.push(`DUPLICATE_DRAFT_BLOCK_ID:${[...new Set(duplicateDraftIds)].join(' ')}`);
}

const unexpectedDraftRows = draftRows.filter((row) => !EXPECTED_BLOCK_IDS.has(row.blockId));
if (unexpectedDraftRows.length > 0) {
  blockers.push(`DRAFT_HAS_UNEXPECTED_BLOCKS:${unexpectedDraftRows.map((row) => row.blockId).join(' ')}`);
}
const missingDraftIds = [...EXPECTED_BLOCK_IDS].filter((blockId) => !draftIds.includes(blockId));
if (missingDraftIds.length > 0) blockers.push(`DRAFT_MISSING_BLOCKS:${missingDraftIds.join(' ')}`);

const missingSourceIds = [...EXPECTED_BLOCK_IDS].filter((blockId) => !sourceByBlockId.has(blockId));
if (missingSourceIds.length > 0) blockers.push(`SOURCE_INPUT_MISSING_BLOCKS:${missingSourceIds.join(' ')}`);

const importRows = draftRows.map((draftRow) => {
  const sourceRow = sourceByBlockId.get(draftRow.blockId);
  const operatorDecision = normalizeDecision(draftRow.operatorDecision);
  const editable = copyEditableFields({ ...draftRow, operatorDecision });
  const correctedPathPointCount = pathPointCount(editable.correctedPath);
  const rowBlockers = [];
  const rowWarnings = [];

  if (draftRow.batchId !== TARGET_BATCH_ID) rowBlockers.push(`ROW_BATCH_MISMATCH:${draftRow.batchId ?? ''}`);
  if (draftRow.queuePriority !== TARGET_PRIORITY) rowBlockers.push(`ROW_PRIORITY_NOT_P0:${draftRow.queuePriority ?? ''}`);
  if (draftRow.candidateDuplicateGroup) rowBlockers.push(`ROW_HAS_DUPLICATE_GROUP:${draftRow.candidateDuplicateGroup}`);
  if (!EXPECTED_BLOCK_IDS.has(draftRow.blockId)) rowBlockers.push('ROW_NOT_IN_EXPECTED_P0_OFF_SEAT_SET');
  if (!sourceRow) rowBlockers.push('SOURCE_INPUT_ROW_MISSING');
  if (!DECISION_OPTIONS.has(operatorDecision)) rowBlockers.push(`INVALID_OPERATOR_DECISION:${operatorDecision}`);
  if (sourceRow && sourceRow.batchId !== TARGET_BATCH_ID) rowBlockers.push(`SOURCE_ROW_BATCH_MISMATCH:${sourceRow.batchId ?? ''}`);
  if (sourceRow && sourceRow.queuePriority !== TARGET_PRIORITY) {
    rowBlockers.push(`SOURCE_ROW_PRIORITY_NOT_P0:${sourceRow.queuePriority ?? ''}`);
  }

  if (operatorDecision === 'APPROVED') {
    if (!hasValue(editable.correctedPath)) rowBlockers.push('APPROVED_MISSING_CORRECTED_PATH');
    if (!hasValue(editable.correctedLabelX) || !hasValue(editable.correctedLabelY)) {
      rowBlockers.push('APPROVED_MISSING_CORRECTED_LABEL');
    }
    if (!hasValue(editable.reviewer)) rowBlockers.push('APPROVED_MISSING_REVIEWER');
    if (!hasValue(editable.reviewedAt)) rowBlockers.push('APPROVED_MISSING_REVIEWED_AT');
    if (correctedPathPointCount > 0 && correctedPathPointCount < MIN_OFFICIAL_TRACE_POINTS) {
      rowBlockers.push(`PATH_REQUIRES_AT_LEAST_SIX_POINTS:${correctedPathPointCount}`);
    }
    if (normalizePathText(editable.correctedPath) === normalizePathText(draftRow.currentPath)) {
      rowBlockers.push('APPROVED_CORRECTED_PATH_EQUALS_CURRENT_PATH');
    }
    if (normalizePathText(editable.correctedPath) === normalizePathText(draftRow.candidatePath)) {
      rowBlockers.push('APPROVED_CORRECTED_PATH_EQUALS_REFERENCE_CANDIDATE_PATH');
    }
    if (isDraftMarkerValue(draftRow)) {
      rowBlockers.push('DRAFT_MARKER_NOT_ALLOWED_FOR_SOURCE_IMPORT');
    }
    if (draftRow.reviewer === DRAFT_REVIEWER) {
      rowBlockers.push('DRAFT_REVIEWER_NOT_ALLOWED_FOR_SOURCE_IMPORT');
    }
    if (draftRow.reviewedAt === DRAFT_REVIEWED_AT) {
      rowBlockers.push('DRAFT_REVIEWED_AT_NOT_ALLOWED_FOR_SOURCE_IMPORT');
    }
  } else if (
    hasValue(editable.correctedPath)
    || hasValue(editable.correctedLabelX)
    || hasValue(editable.correctedLabelY)
    || hasValue(editable.reviewer)
    || hasValue(editable.reviewedAt)
  ) {
    rowWarnings.push('NON_APPROVED_ROW_HAS_EDITABLE_FIELDS_NOT_COPIED');
  }

  const mergedSourceRow = sourceRow ? { ...sourceRow, ...editable } : null;
  const validApproved = operatorDecision === 'APPROVED' && rowBlockers.length === 0;
  const copied = validApproved;
  const sourceChanged = copied && sourceRow && rowChanged(sourceRow, mergedSourceRow);

  blockers.push(...rowBlockers.map((blocker) => `${blocker}:${draftRow.blockId}`));
  warnings.push(...rowWarnings.map((warning) => `${warning}:${draftRow.blockId}`));

  return {
    blockId: draftRow.blockId,
    block: draftRow.block,
    queuePriority: draftRow.queuePriority,
    sourceInput: draftRow.sourceInput ?? DEFAULT_SOURCE_INPUT,
    operatorDecision,
    approved: operatorDecision === 'APPROVED',
    copied,
    sourceChanged,
    correctedPathPointCount,
    rowBlockers,
    rowWarnings,
  };
});

const approvedRows = importRows.filter((row) => row.approved);
const copiedRows = importRows.filter((row) => row.copied);
const sourceChangedRows = importRows.filter((row) => row.sourceChanged);
const duplicateRows = importRows.filter((row) => {
  const draftRow = draftRows.find((candidate) => candidate.blockId === row.blockId);
  return Boolean(draftRow?.candidateDuplicateGroup);
});

if (approvedRows.length !== EXPECTED.expectedApprovedRows) {
  warnings.push(`APPROVED_ROWS_PRESENT_IN_DRAFT_IMPORT:${approvedRows.length}:${EXPECTED.expectedApprovedRows}`);
}
if (duplicateRows.length !== EXPECTED.expectedDuplicateRows) {
  blockers.push(`DUPLICATE_ROWS_PRESENT:${duplicateRows.length}:${EXPECTED.expectedDuplicateRows}`);
}
if (writeSourceInput && copiedRows.length === 0) warnings.push('NO_APPROVED_ROWS_TO_COPY');

const sourceInputChanged = sourceChangedRows.length > 0;
let sourceInputWritten = false;
if (writeSourceInput && blockers.length === 0 && sourceInputChanged) {
  const copiedByBlockId = new Map(
    draftRows
      .filter((draftRow) => copiedRows.some((row) => row.blockId === draftRow.blockId))
      .map((draftRow) => [draftRow.blockId, copyEditableFields(draftRow)]),
  );
  const mergedSourceInput = {
    ...sourceInput,
    generatedAt: new Date().toISOString(),
    corrections: sourceRows.map((sourceRow) => (
      copiedByBlockId.has(sourceRow.blockId)
        ? { ...sourceRow, ...copiedByBlockId.get(sourceRow.blockId) }
        : sourceRow
    )),
  };
  await fs.writeFile(sourceInputPath, `${JSON.stringify(mergedSourceInput, null, 2)}\n`, 'utf8');
  sourceInputWritten = true;
}

const status = blockers.length > 0 ? 'blocked' : 'ok';
const summary = {
  importVersion: IMPORT_VERSION,
  status,
  mode: writeSourceInput ? 'write-source-input' : 'dry-run',
  draftInput: relativeToFrontendRoot(draftInputPath),
  sourceInput: relativeToFrontendRoot(sourceInputPath),
  targetBatchId: TARGET_BATCH_ID,
  targetPriority: TARGET_PRIORITY,
  totalRows: draftRows.length,
  approvedRows: approvedRows.length,
  copiedRows: copiedRows.length,
  sourceChangedRows: sourceChangedRows.length,
  sourceInputChanged,
  sourceInputWritten,
  productionDataChanged: false,
  templateChanged: false,
  blockers,
  warnings,
};
const safetyContract = [
  'This script imports approved P0 off-seat draft rows only into the P0 operator source input.',
  'Dry-run mode is the default and never writes the source input.',
  'The --write-source-input flag is required before any source input write.',
  '승인 row가 없으면 source input을 쓰지 않는다.',
  'It never writes the main corrections template.',
  'It never modifies src/data/daeguSeatData.ts.',
  'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
  'The currentPath must not be copied into correctedPath.',
  'Candidate paths remain reference-only and are blocked from source import as correctedPath.',
  'Draft markers are blocked from APPROVED rows before source import.',
  'No external crawling, web search, or coordinate inference is allowed.',
];
const report = {
  generatedAt: new Date().toISOString(),
  packageVersion: IMPORT_VERSION,
  draftInputVersion: DRAFT_INPUT_VERSION,
  sourceInputVersion: SOURCE_INPUT_VERSION,
  targetBatchId: TARGET_BATCH_ID,
  targetPriority: TARGET_PRIORITY,
  expected: EXPECTED,
  summary,
  safetyContract,
  importRows,
  nextGateCommandsAfterSourceImport: [
    'npm run stadium:daegu:p0-operator-prewrite-gate',
    'npm run stadium:daegu:p0-operator-import:write-template',
  ],
};

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'draftInput',
    'sourceInput',
    'blockId',
    'block',
    'operatorDecision',
    'approved',
    'copied',
    'sourceChanged',
    'correctedPathPointCount',
    'rowBlockers',
    'rowWarnings',
  ],
  ...importRows.map((row) => [
    summary.draftInput,
    summary.sourceInput,
    row.blockId,
    row.block,
    row.operatorDecision,
    row.approved,
    row.copied,
    row.sourceChanged,
    row.correctedPathPointCount,
    row.rowBlockers.join('; '),
    row.rowWarnings.join('; '),
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P0 Off-Seat Operator Import',
  '',
  `- import version: \`${IMPORT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- mode: \`${summary.mode}\``,
  `- draft input: \`${summary.draftInput}\``,
  `- source input: \`${summary.sourceInput}\``,
  `- rows: ${summary.totalRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- copied rows: ${summary.copiedRows}`,
  `- source input changed: ${summary.sourceInputChanged}`,
  `- source input written: ${summary.sourceInputWritten}`,
  `- JSON output: \`${relativeToFrontendRoot(jsonPath)}\``,
  `- CSV output: \`${relativeToFrontendRoot(csvPath)}\``,
  '',
  '## Safety',
  '',
  ...safetyContract.map((rule) => `- ${rule}`),
  '',
  '## Import Rows',
  '',
  markdownTable(
    ['block', 'decision', 'approved', 'copied', 'source changed', 'points', 'blockers', 'warnings'],
    importRows.map((row) => [
      `\`${row.block}\``,
      `\`${row.operatorDecision}\``,
      row.approved,
      row.copied,
      row.sourceChanged,
      row.correctedPathPointCount,
      row.rowBlockers.join('<br>') || '-',
      row.rowWarnings.join('<br>') || '-',
    ]),
  ),
  '',
  '## Next Gates',
  '',
  '```bash',
  'npm run stadium:daegu:p0-operator-prewrite-gate',
  'npm run stadium:daegu:p0-operator-import:write-template',
  '```',
].join('\n'), 'utf8');

console.log(JSON.stringify({
  status,
  mode: summary.mode,
  output: relativeToFrontendRoot(markdownPath),
  totalRows: summary.totalRows,
  approvedRows: summary.approvedRows,
  copiedRows: summary.copiedRows,
  sourceInputChanged: summary.sourceInputChanged,
  sourceInputWritten: summary.sourceInputWritten,
  blockers: blockers.length,
  warnings: warnings.length,
}, null, 2));

if (blockers.length > 0) {
  process.exitCode = 1;
}
