import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const WORKSET_VERSION = 'DAEGU_P0_P1_OFF_SEAT_WORKSET_V1';
const OFF_SEAT_INTAKE_VERSION = 'DAEGU_OFF_SEAT_RETRACE_INTAKE_V1';
const EXPECTED = {
  expectedRows: 14,
  expectedP0Rows: 2,
  expectedP1Rows: 12,
  expectedDuplicateRows: 0,
  expectedApprovedRows: 0,
};
const PRIORITY_ORDER = {
  P0: 1,
  P1: 2,
};

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

const absoluteFromFrontendRoot = (filePath) => {
  if (!filePath) return '';
  return path.isAbsolute(filePath) ? filePath : path.join(frontendRoot, filePath);
};

const hasEditableApprovalFields = (row) => (
  String(row.correctedPath ?? '').trim() !== ''
  || String(row.correctedLabelX ?? '').trim() !== ''
  || String(row.correctedLabelY ?? '').trim() !== ''
  || String(row.reviewer ?? '').trim() !== ''
  || String(row.reviewedAt ?? '').trim() !== ''
);

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const inputPath = path.resolve(
  frontendRoot,
  argValue('--input', path.join(reportDir, 'daegu-off-seat-retrace-intake.json')),
);
const blockers = [];
const warnings = [];

const offSeatIntake = await readJson(inputPath);
const intakeRows = Array.isArray(offSeatIntake.rows) ? offSeatIntake.rows : [];

if (offSeatIntake.summary?.intakeVersion !== OFF_SEAT_INTAKE_VERSION) {
  blockers.push(`OFF_SEAT_INTAKE_VERSION_MISMATCH:${offSeatIntake.summary?.intakeVersion ?? ''}`);
}
if (offSeatIntake.summary?.status !== 'ready-for-operator') {
  blockers.push(`OFF_SEAT_INTAKE_NOT_READY:${offSeatIntake.summary?.status ?? ''}`);
}

const rows = intakeRows
  .filter((row) => row.intakeTier === 'P0_P1_OFF_SEAT_FIRST')
  .map((row) => {
    const evidenceAbsolutePath = absoluteFromFrontendRoot(row.evidenceCrop);
    const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
    const worksetBlockers = [];

    if (!['P0', 'P1'].includes(row.queuePriority)) {
      worksetBlockers.push(`ROW_PRIORITY_NOT_P0_P1:${row.queuePriority ?? ''}`);
    }
    if (row.candidateDuplicateGroup) {
      worksetBlockers.push(`ROW_HAS_DUPLICATE_GROUP:${row.candidateDuplicateGroup}`);
    }
    if (!evidenceExists) {
      worksetBlockers.push('MISSING_EVIDENCE_CROP');
    }

    blockers.push(...worksetBlockers.map((blocker) => `${blocker}:${row.blockId}`));

    return {
      ...row,
      sourceOffSeatIntake: path.relative(frontendRoot, inputPath),
      worksetBlockers,
      evidenceExists,
      hasEditableApprovalFields: hasEditableApprovalFields(row),
      approvalInstruction: 'Copy an operator-traced official PNG polygon into the source operator input row, then set operatorDecision=APPROVED with correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
    };
  })
  .sort((left, right) => (
    (PRIORITY_ORDER[left.queuePriority] ?? 99) - (PRIORITY_ORDER[right.queuePriority] ?? 99)
    || left.batchOrder - right.batchOrder
    || String(left.block).localeCompare(String(right.block), 'ko')
  ));

const p0Rows = rows.filter((row) => row.queuePriority === 'P0');
const p1Rows = rows.filter((row) => row.queuePriority === 'P1');
const duplicateRows = rows.filter((row) => row.candidateDuplicateGroup);
const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
const filledEditableRows = rows.filter((row) => row.hasEditableApprovalFields);
const priorityCounts = rows.reduce((counts, row) => ({
  ...counts,
  [row.queuePriority]: (counts[row.queuePriority] ?? 0) + 1,
}), {});
const reasonCounts = rows.reduce((counts, row) => ({
  ...counts,
  [row.offSeatReason]: (counts[row.offSeatReason] ?? 0) + 1,
}), {});

if (rows.length !== EXPECTED.expectedRows) warnings.push(`P0_P1_OFF_SEAT_WORKSET_ROWS_CHANGED:${rows.length}:${EXPECTED.expectedRows}`);
if (p0Rows.length !== EXPECTED.expectedP0Rows) warnings.push(`P0_OFF_SEAT_ROWS_CHANGED:${p0Rows.length}:${EXPECTED.expectedP0Rows}`);
if (p1Rows.length !== EXPECTED.expectedP1Rows) warnings.push(`P1_OFF_SEAT_ROWS_CHANGED:${p1Rows.length}:${EXPECTED.expectedP1Rows}`);
if (duplicateRows.length !== EXPECTED.expectedDuplicateRows) warnings.push(`DUPLICATE_ROWS_PRESENT:${duplicateRows.length}:${EXPECTED.expectedDuplicateRows}`);
if (approvedRows.length !== EXPECTED.expectedApprovedRows) warnings.push(`APPROVED_ROWS_PRESENT_IN_WORKSET:${approvedRows.length}:${EXPECTED.expectedApprovedRows}`);

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
const summary = {
  worksetVersion: WORKSET_VERSION,
  status,
  productionWriteAllowed: false,
  sourceOffSeatIntake: path.relative(frontendRoot, inputPath),
  totalRows: rows.length,
  p0Rows: p0Rows.length,
  p1Rows: p1Rows.length,
  approvedRows: approvedRows.length,
  duplicateRows: duplicateRows.length,
  filledEditableRows: filledEditableRows.length,
  priorityCounts,
  reasonCounts,
  blockers,
  warnings,
  approvalRule: 'Only operatorDecision=APPROVED rows with correctedPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt can enter production write gates.',
};

const safetyContract = [
  'This P0/P1 off-seat workset is a read-only operator tracing aid.',
  'It never writes the main corrections template.',
  'It never modifies src/data/daeguSeatData.ts.',
  'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
  'The currentPath is a suspected bad legacy path and must not be reused as the correctedPath.',
  'Candidate paths remain reference-only and must not be promoted without operator approval.',
  'Rows with candidateDuplicateGroup are excluded from this workset.',
  'No external crawling, web search, or coordinate inference is allowed.',
];

const report = {
  generatedAt: new Date().toISOString(),
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
  nextGateCommands: {
    p0: [
      'npm run stadium:daegu:p0-operator-prewrite-gate',
      'npm run stadium:daegu:p0-operator-import:write-template',
    ],
    p1: [
      'npm run stadium:daegu:p1-operator-prewrite-gate',
      'npm run stadium:daegu:p1-operator-import:write-template',
    ],
  },
  rows,
};

const jsonPath = path.join(reportDir, 'daegu-p0-p1-off-seat-workset.json');
const csvPath = path.join(reportDir, 'daegu-p0-p1-off-seat-workset.csv');
const markdownPath = path.join(reportDir, 'daegu-p0-p1-off-seat-workset.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'sourceOffSeatIntake',
    'sourceInput',
    'batchId',
    'blockId',
    'block',
    'name',
    'category',
    'queuePriority',
    'operatorDecision',
    'offSeatReason',
    'recommendedOperatorAction',
    'candidateStatus',
    'evidenceCrop',
    'evidenceExists',
    'currentPath',
    'currentLabelX',
    'currentLabelY',
    'candidatePath',
    'candidatePathPointCount',
    'candidateCenterX',
    'candidateCenterY',
    'candidateDuplicateGroup',
    'candidateDuplicateIds',
    'componentInsidePathRatio',
    'pathColorCoverageRatio',
    'officialFailureReasons',
    'riskFlags',
    'operatorDecisionTarget',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
    'approvalInstruction',
  ],
  ...rows.map((row) => [
    row.sourceOffSeatIntake,
    row.sourceInput,
    row.batchId,
    row.blockId,
    row.block,
    row.name,
    row.category,
    row.queuePriority,
    row.operatorDecision,
    row.offSeatReason,
    row.recommendedOperatorAction,
    row.candidateStatus,
    row.evidenceCrop,
    row.evidenceExists,
    row.currentPath,
    row.currentLabelX,
    row.currentLabelY,
    row.candidatePath,
    row.candidatePathPointCount,
    row.candidateCenterX,
    row.candidateCenterY,
    row.candidateDuplicateGroup,
    row.candidateDuplicateIds,
    row.componentInsidePathRatio,
    row.pathColorCoverageRatio,
    row.officialFailureReasons,
    row.riskFlags,
    'operatorDecision=APPROVED',
    row.correctedPath,
    row.correctedLabelX,
    row.correctedLabelY,
    row.reviewer,
    row.reviewedAt,
    row.operatorNote,
    row.approvalInstruction,
  ]),
]);

const rowTable = (tableRows) => markdownTable(
  ['priority', 'batch', 'block', 'category', 'decision', 'reason', 'candidate', 'inside', 'coverage', 'evidence', 'source input'],
  tableRows.map((row) => [
    `\`${row.queuePriority}\``,
    `\`${row.batchId}\``,
    `\`${row.block}\``,
    row.category,
    `\`${row.operatorDecision}\``,
    row.offSeatReason,
    row.candidateStatus,
    row.componentInsidePathRatio === '' ? '-' : row.componentInsidePathRatio,
    row.pathColorCoverageRatio === '' ? '-' : row.pathColorCoverageRatio,
    row.evidenceCrop ? `[crop](${row.evidenceCrop})` : '-',
    `\`${row.sourceInput}\``,
  ]),
);

await fs.writeFile(markdownPath, [
  '# Daegu P0/P1 Off-Seat Workset',
  '',
  `- workset version: \`${WORKSET_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- source off-seat intake: \`${summary.sourceOffSeatIntake}\``,
  `- rows: ${summary.totalRows}`,
  `- P0 rows: ${summary.p0Rows}`,
  `- P1 rows: ${summary.p1Rows}`,
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
  '## Work Order',
  '',
  '- Complete the P0 rows first and run the P0 prewrite gate before moving to P1.',
  '- Keep every unreviewed row as `NEEDS_RETRACE`.',
  '- Use `currentPath` only to understand what is wrong; do not copy it into `correctedPath`.',
  '- Use `candidatePath` only as reference unless the operator manually confirms the boundary and label hit area.',
  '',
  '## P0 Rows',
  '',
  rowTable(p0Rows),
  '',
  '## P1 Rows',
  '',
  rowTable(p1Rows),
  '',
  '## Gate Commands',
  '',
  '```bash',
  'npm run stadium:daegu:p0-operator-prewrite-gate',
  'npm run stadium:daegu:p0-operator-import:write-template',
  'npm run stadium:daegu:p1-operator-prewrite-gate',
  'npm run stadium:daegu:p1-operator-import:write-template',
  '```',
  '',
  '## Approval Rule',
  '',
  '- This workset does not approve or write any row.',
  '- Operator-approved rows must still be copied into the matching operator input file with `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
  '- Production data can change only through the existing validation/preview/apply/write gates.',
].join('\n'), 'utf8');

console.log(JSON.stringify({
  status,
  output: path.relative(frontendRoot, markdownPath),
  totalRows: rows.length,
  p0Rows: p0Rows.length,
  p1Rows: p1Rows.length,
  approvedRows: approvedRows.length,
  duplicateRows: duplicateRows.length,
  blockers: blockers.length,
  warnings: warnings.length,
}, null, 2));

if (blockers.length > 0) {
  process.exitCode = 1;
}
