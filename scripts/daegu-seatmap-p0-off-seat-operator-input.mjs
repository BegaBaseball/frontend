import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const INPUT_VERSION = 'DAEGU_P0_OFF_SEAT_OPERATOR_INPUT_V1';
const WORKSET_VERSION = 'DAEGU_P0_P1_OFF_SEAT_WORKSET_V1';
const TARGET_BATCH_ID = 'BATCH_1_P0';
const TARGET_PRIORITY = 'P0';
const COPY_TARGET_SOURCE_INPUT = 'reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json';
const MIN_OFFICIAL_TRACE_POINTS = 6;
const EXPECTED = {
  expectedRows: 0,
  expectedP0Rows: 0,
  expectedDuplicateRows: 0,
  expectedApprovedRows: 0,
};
const EDITABLE_FIELDS = [
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'operatorNote',
];
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

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const readJsonIfExists = async (filePath) => {
  if (!fsSync.existsSync(filePath)) return null;
  return readJson(filePath);
};

const normalizeDecision = (decision) => String(decision ?? 'NEEDS_RETRACE').trim() || 'NEEDS_RETRACE';

const absoluteFromFrontendRoot = (filePath) => {
  if (!filePath) return '';
  return path.isAbsolute(filePath) ? filePath : path.join(frontendRoot, filePath);
};

const normalizePathText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const pathPointCount = (pathText) => {
  const normalized = normalizePathText(pathText);
  if (!normalized) return 0;
  const matches = normalized.match(/[ML]\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/gi);
  return matches ? matches.length : 0;
};

const hasValue = (value) => String(value ?? '').trim() !== '';

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const worksetPath = path.resolve(
  frontendRoot,
  argValue('--workset', path.join(reportDir, 'daegu-p0-p1-off-seat-workset.json')),
);
const jsonPath = path.join(reportDir, 'daegu-p0-off-seat-operator-input.json');
const csvPath = path.join(reportDir, 'daegu-p0-off-seat-operator-input.csv');
const markdownPath = path.join(reportDir, 'daegu-p0-off-seat-operator-input.md');
const existingDraft = await readJsonIfExists(jsonPath);
const existingRowsByBlockId = new Map((existingDraft?.corrections ?? []).map((row) => [row.blockId, row]));
const blockers = [];
const warnings = [];

const workset = await readJson(worksetPath);
const worksetRows = Array.isArray(workset.rows) ? workset.rows : [];

if (workset.summary?.worksetVersion !== WORKSET_VERSION) {
  blockers.push(`WORKSET_VERSION_MISMATCH:${workset.summary?.worksetVersion ?? ''}`);
}
if (workset.summary?.status !== 'ready-for-operator') {
  blockers.push(`WORKSET_NOT_READY:${workset.summary?.status ?? ''}`);
}

const rows = worksetRows
  .filter((row) => row.queuePriority === TARGET_PRIORITY)
  .map((row) => {
    const existingRow = existingRowsByBlockId.get(row.blockId);
    const draftEditable = EDITABLE_FIELDS.reduce((editable, field) => ({
      ...editable,
      [field]: existingRow?.[field] ?? (field === 'operatorDecision' ? row.operatorDecision : row[field] ?? ''),
    }), {});
    const operatorDecision = normalizeDecision(draftEditable.operatorDecision);
    const correctedPath = String(draftEditable.correctedPath ?? '').trim();
    const correctedPathPointCount = pathPointCount(correctedPath);
    const evidenceAbsolutePath = absoluteFromFrontendRoot(row.evidenceCrop);
    const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
    const rowBlockers = [];
    const rowWarnings = [];

    if (row.batchId !== TARGET_BATCH_ID) rowBlockers.push(`ROW_BATCH_MISMATCH:${row.batchId ?? ''}`);
    if (row.queuePriority !== TARGET_PRIORITY) rowBlockers.push(`ROW_PRIORITY_NOT_P0:${row.queuePriority ?? ''}`);
    if (row.candidateDuplicateGroup) rowBlockers.push(`ROW_HAS_DUPLICATE_GROUP:${row.candidateDuplicateGroup}`);
    if (!evidenceExists) rowBlockers.push('MISSING_EVIDENCE_CROP');
    if (!DECISION_OPTIONS.has(operatorDecision)) rowBlockers.push(`INVALID_OPERATOR_DECISION:${operatorDecision}`);

    if (operatorDecision === 'APPROVED') {
      if (!hasValue(correctedPath)) rowBlockers.push('APPROVED_MISSING_CORRECTED_PATH');
      if (!hasValue(draftEditable.correctedLabelX) || !hasValue(draftEditable.correctedLabelY)) {
        rowBlockers.push('APPROVED_MISSING_CORRECTED_LABEL');
      }
      if (!hasValue(draftEditable.reviewer)) rowBlockers.push('APPROVED_MISSING_REVIEWER');
      if (!hasValue(draftEditable.reviewedAt)) rowBlockers.push('APPROVED_MISSING_REVIEWED_AT');
      if (correctedPathPointCount > 0 && correctedPathPointCount < MIN_OFFICIAL_TRACE_POINTS) {
        rowBlockers.push(`PATH_REQUIRES_AT_LEAST_SIX_POINTS:${correctedPathPointCount}`);
      }
      if (normalizePathText(correctedPath) && normalizePathText(correctedPath) === normalizePathText(row.currentPath)) {
        rowBlockers.push('APPROVED_CORRECTED_PATH_EQUALS_CURRENT_PATH');
      }
      if (normalizePathText(correctedPath) && normalizePathText(correctedPath) === normalizePathText(row.candidatePath)) {
        rowWarnings.push('APPROVED_CORRECTED_PATH_EQUALS_REFERENCE_CANDIDATE_PATH');
      }
    }

    blockers.push(...rowBlockers.map((blocker) => `${blocker}:${row.blockId}`));
    warnings.push(...rowWarnings.map((warning) => `${warning}:${row.blockId}`));

    return {
      sourceWorkset: path.relative(frontendRoot, worksetPath),
      sourceInput: row.sourceInput,
      copyTargetSourceInput: COPY_TARGET_SOURCE_INPUT,
      batchId: row.batchId,
      blockId: row.blockId,
      block: row.block,
      name: row.name,
      category: row.category,
      queuePriority: row.queuePriority,
      offSeatReason: row.offSeatReason,
      candidateStatus: row.candidateStatus,
      evidenceCrop: row.evidenceCrop,
      evidenceExists,
      currentPathUsage: 'DO_NOT_COPY_CURRENT_PATH_TO_CORRECTED_PATH',
      candidatePathUsage: 'REFERENCE_ONLY_REQUIRES_OPERATOR_VISUAL_APPROVAL',
      currentPath: row.currentPath,
      currentLabelX: row.currentLabelX,
      currentLabelY: row.currentLabelY,
      candidatePath: row.candidatePath,
      candidatePathPointCount: row.candidatePathPointCount,
      candidateCenterX: row.candidateCenterX,
      candidateCenterY: row.candidateCenterY,
      componentInsidePathRatio: row.componentInsidePathRatio,
      pathColorCoverageRatio: row.pathColorCoverageRatio,
      officialFailureReasons: row.officialFailureReasons,
      riskFlags: row.riskFlags,
      operatorDecision,
      correctedPath,
      correctedPathPointCount,
      correctedLabelX: draftEditable.correctedLabelX ?? '',
      correctedLabelY: draftEditable.correctedLabelY ?? '',
      reviewer: draftEditable.reviewer ?? '',
      reviewedAt: draftEditable.reviewedAt ?? '',
      operatorNote: draftEditable.operatorNote ?? '',
      editableSource: existingRow ? 'existing-draft' : 'generated-workset',
      rowBlockers,
      rowWarnings,
    };
  })
  .sort((left, right) => String(left.block).localeCompare(String(right.block), 'ko'));

const p0Rows = rows.filter((row) => row.queuePriority === TARGET_PRIORITY);
const duplicateRows = rows.filter((row) => row.candidateDuplicateGroup);
const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
const filledEditableRows = rows.filter((row) => (
  hasValue(row.correctedPath)
  || hasValue(row.correctedLabelX)
  || hasValue(row.correctedLabelY)
  || hasValue(row.reviewer)
  || hasValue(row.reviewedAt)
));

if (rows.length !== EXPECTED.expectedRows) warnings.push(`P0_OFF_SEAT_OPERATOR_INPUT_ROWS_CHANGED:${rows.length}:${EXPECTED.expectedRows}`);
if (p0Rows.length !== EXPECTED.expectedP0Rows) warnings.push(`P0_OFF_SEAT_ROWS_CHANGED:${p0Rows.length}:${EXPECTED.expectedP0Rows}`);
if (duplicateRows.length !== EXPECTED.expectedDuplicateRows) warnings.push(`DUPLICATE_ROWS_PRESENT:${duplicateRows.length}:${EXPECTED.expectedDuplicateRows}`);
if (approvedRows.length !== EXPECTED.expectedApprovedRows) warnings.push(`APPROVED_ROWS_PRESENT_IN_DRAFT_INPUT:${approvedRows.length}:${EXPECTED.expectedApprovedRows}`);

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
const summary = {
  inputVersion: INPUT_VERSION,
  status,
  draftOnly: true,
  sourceOfTruth: false,
  productionWriteAllowed: false,
  sourceWorkset: path.relative(frontendRoot, worksetPath),
  copyTargetSourceInput: COPY_TARGET_SOURCE_INPUT,
  totalRows: rows.length,
  p0Rows: p0Rows.length,
  approvedRows: approvedRows.length,
  duplicateRows: duplicateRows.length,
  filledEditableRows: filledEditableRows.length,
  blockers,
  warnings,
  approvalRule: 'Copy approved rows into reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json before running P0 gates.',
};

const safetyContract = [
  'This draft helper is not a source of truth.',
  'It never writes the main corrections template.',
  'It never modifies src/data/daeguSeatData.ts.',
  'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
  'The currentPath must not be copied into correctedPath.',
  'Candidate paths remain reference-only and must not be promoted without operator approval.',
  'Approved rows must be copied into the P0 operator source input before any production write gate.',
  'No external crawling, web search, or coordinate inference is allowed.',
];

const report = {
  generatedAt: new Date().toISOString(),
  packageVersion: INPUT_VERSION,
  targetBatchId: TARGET_BATCH_ID,
  targetPriority: TARGET_PRIORITY,
  draftOnly: true,
  sourceOfTruth: false,
  productionWriteAllowed: false,
  sourceWorkset: path.relative(frontendRoot, worksetPath),
  copyTargetSourceInput: COPY_TARGET_SOURCE_INPUT,
  summary,
  safetyContract,
  requiredApprovalFields: [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ],
  nextGateCommandsAfterCopy: [
    'npm run stadium:daegu:p0-operator-prewrite-gate',
    'npm run stadium:daegu:p0-operator-import:write-template',
  ],
  corrections: rows,
};

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'blockId',
    'block',
    'name',
    'category',
    'queuePriority',
    'sourceWorkset',
    'sourceInput',
    'copyTargetSourceInput',
    'operatorDecision',
    'correctedPath',
    'correctedPathPointCount',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
    'offSeatReason',
    'evidenceCrop',
    'evidenceExists',
    'currentPathUsage',
    'candidatePathUsage',
    'currentPath',
    'currentLabelX',
    'currentLabelY',
    'candidatePath',
    'candidatePathPointCount',
    'candidateCenterX',
    'candidateCenterY',
    'componentInsidePathRatio',
    'pathColorCoverageRatio',
    'officialFailureReasons',
    'riskFlags',
    'rowBlockers',
    'rowWarnings',
  ],
  ...rows.map((row) => [
    row.blockId,
    row.block,
    row.name,
    row.category,
    row.queuePriority,
    row.sourceWorkset,
    row.sourceInput,
    row.copyTargetSourceInput,
    row.operatorDecision,
    row.correctedPath,
    row.correctedPathPointCount,
    row.correctedLabelX,
    row.correctedLabelY,
    row.reviewer,
    row.reviewedAt,
    row.operatorNote,
    row.offSeatReason,
    row.evidenceCrop,
    row.evidenceExists,
    row.currentPathUsage,
    row.candidatePathUsage,
    row.currentPath,
    row.currentLabelX,
    row.currentLabelY,
    row.candidatePath,
    row.candidatePathPointCount,
    row.candidateCenterX,
    row.candidateCenterY,
    row.componentInsidePathRatio,
    row.pathColorCoverageRatio,
    row.officialFailureReasons,
    row.riskFlags,
    row.rowBlockers.join('; '),
    row.rowWarnings.join('; '),
  ]),
]);

await fs.writeFile(markdownPath, [
  '# Daegu P0 Off-Seat Operator Input Helper',
  '',
  `- input version: \`${INPUT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- draft only: ${summary.draftOnly}`,
  `- source of truth: ${summary.sourceOfTruth}`,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  `- source workset: \`${summary.sourceWorkset}\``,
  `- copy target source input: \`${summary.copyTargetSourceInput}\``,
  `- rows: ${summary.totalRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- duplicate rows: ${summary.duplicateRows}`,
  `- filled editable rows: ${summary.filledEditableRows}`,
  `- JSON output: \`${path.relative(frontendRoot, jsonPath)}\``,
  `- CSV output: \`${path.relative(frontendRoot, csvPath)}\``,
  '',
  '## Safety',
  '',
  ...safetyContract.map((rule) => `- ${rule}`),
  '',
  '## Draft Rows',
  '',
  markdownTable(
    ['block', 'decision', 'reason', 'corrected path points', 'label', 'reviewer', 'evidence', 'source input'],
    rows.map((row) => [
      `\`${row.block}\``,
      `\`${row.operatorDecision}\``,
      row.offSeatReason,
      row.correctedPathPointCount,
      hasValue(row.correctedLabelX) && hasValue(row.correctedLabelY)
        ? `${row.correctedLabelX},${row.correctedLabelY}`
        : 'blank',
      row.reviewer || 'blank',
      row.evidenceCrop ? `[crop](${row.evidenceCrop})` : '-',
      `\`${row.sourceInput}\``,
    ]),
  ),
  '',
  '## Copy Procedure',
  '',
  '- Fill this helper only as an operator draft.',
  '- Copy approved rows into `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json`.',
  '- Keep unapproved rows as `NEEDS_RETRACE` in the source input.',
  '- Run the P0 gate only after copying approved rows to the source input.',
  '',
  '```bash',
  'npm run stadium:daegu:p0-operator-prewrite-gate',
  'npm run stadium:daegu:p0-operator-import:write-template',
  '```',
].join('\n'), 'utf8');

console.log(JSON.stringify({
  status,
  output: path.relative(frontendRoot, markdownPath),
  totalRows: rows.length,
  p0Rows: p0Rows.length,
  approvedRows: approvedRows.length,
  duplicateRows: duplicateRows.length,
  blockers: blockers.length,
  warnings: warnings.length,
}, null, 2));

if (blockers.length > 0) {
  process.exitCode = 1;
}
