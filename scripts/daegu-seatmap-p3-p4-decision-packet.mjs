import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP3P4ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p3-p4-operator');

const PACKET_VERSION = 'DAEGU_P3_P4_DECISION_PACKET_V1';
const PACKAGE_VERSION = 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1';
const TARGET_BATCH_ID = 'BATCH_4_P3_P4';
const EXPECTED = {
  rows: 52,
  p3Rows: 3,
  p4Rows: 49,
  manualTraceRequiredRows: 27,
  correctedPathRequiredRows: 25,
  labelAndHitAreaRows: 3,
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

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const reviewFocusFor = (row) => {
  if (row.operatorAction === 'OPERATOR_MANUAL_TRACE_REQUIRED') {
    return 'Manual retrace required; do not approve without a corrected polygon path.';
  }
  if (row.recommendedAction === 'RETRACE_LABEL_AND_HIT_AREA') {
    return 'Label and hit-area review required; verify path, label point, and top-hit together.';
  }
  return 'Operator corrected path required before approval.';
};

const p3p4ReportDir = path.resolve(frontendRoot, argValue('--p3-p4-report-dir', defaultP3P4ReportDir));
const inputPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-input.json');
const inputCsvPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-input.csv');
const checklistPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-checklist.md');
const readinessPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-readiness.md');

const input = await readJson(inputPath);
const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const blockers = [];

if (input.packageVersion !== PACKAGE_VERSION) {
  blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
if (input.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (inputRows.length !== EXPECTED.rows) {
  blockers.push(`P3_P4_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.rows}`);
}

const rows = inputRows.map((row) => {
  const evidenceAbsolutePath = row.evidenceCrop ? path.join(frontendRoot, row.evidenceCrop) : '';
  const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
  const decision = normalizeDecision(row.operatorDecision);
  const pending = decision === 'PENDING';
  const approved = decision === 'APPROVED';
  const hasCorrectedPath = Boolean(String(row.correctedPath ?? '').trim());
  const hasCorrectedLabel = String(row.correctedLabelX ?? '').trim() !== ''
    && String(row.correctedLabelY ?? '').trim() !== '';
  const hasReviewer = Boolean(String(row.reviewer ?? '').trim());
  const hasReviewedAt = Boolean(String(row.reviewedAt ?? '').trim());

  if (!evidenceExists) blockers.push(`MISSING_EVIDENCE_CROP:${row.blockId}`);

  return {
    blockId: row.blockId,
    block: row.block,
    name: row.name,
    queuePriority: row.queuePriority,
    recommendedAction: row.recommendedAction,
    operatorAction: row.operatorAction,
    decision,
    pending,
    approved,
    reviewFocus: reviewFocusFor(row),
    evidenceCrop: row.evidenceCrop,
    evidenceAbsolutePath,
    evidenceExists,
    currentPath: row.currentPath,
    candidatePath: row.candidatePath,
    candidatePathPointCount: row.candidatePathPointCount,
    candidateDuplicateGroup: row.candidateDuplicateGroup || '',
    candidateDuplicateIds: row.candidateDuplicateIds || '',
    currentLabel: `${row.currentLabelX},${row.currentLabelY}`,
    candidateCenter: row.candidateCenterX !== '' && row.candidateCenterY !== ''
      ? `${row.candidateCenterX},${row.candidateCenterY}`
      : '',
    officialFailureReasons: row.officialFailureReasons || '',
    riskFlags: row.riskFlags || '',
    hasCorrectedPath,
    hasCorrectedLabel,
    hasReviewer,
    hasReviewedAt,
  };
});

const actionCounts = rows.reduce((counts, row) => ({
  ...counts,
  [row.operatorAction]: (counts[row.operatorAction] ?? 0) + 1,
}), {});
const p3Rows = rows.filter((row) => row.queuePriority === 'P3').length;
const p4Rows = rows.filter((row) => row.queuePriority === 'P4').length;
const labelAndHitAreaRows = rows.filter((row) => row.recommendedAction === 'RETRACE_LABEL_AND_HIT_AREA').length;
const expectedCounts = [
  ['P3_P4_P3_ROWS', p3Rows, EXPECTED.p3Rows],
  ['P3_P4_P4_ROWS', p4Rows, EXPECTED.p4Rows],
  ['P3_P4_MANUAL_TRACE_REQUIRED_ROWS', actionCounts.OPERATOR_MANUAL_TRACE_REQUIRED ?? 0, EXPECTED.manualTraceRequiredRows],
  ['P3_P4_CORRECTED_PATH_REQUIRED_ROWS', actionCounts.OPERATOR_CORRECTED_PATH_REQUIRED ?? 0, EXPECTED.correctedPathRequiredRows],
  ['P3_P4_LABEL_AND_HIT_AREA_ROWS', labelAndHitAreaRows, EXPECTED.labelAndHitAreaRows],
];
expectedCounts.forEach(([label, actual, expected]) => {
  if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
});

const pendingRows = rows.filter((row) => row.pending);
const approvedRows = rows.filter((row) => row.approved);
const missingEvidenceRows = rows.filter((row) => !row.evidenceExists);
const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';

const summary = {
  packetVersion: PACKET_VERSION,
  status,
  targetBatchId: TARGET_BATCH_ID,
  input: path.relative(frontendRoot, inputPath),
  inputCsv: path.relative(frontendRoot, inputCsvPath),
  checklist: path.relative(frontendRoot, checklistPath),
  readiness: path.relative(frontendRoot, readinessPath),
  totalRows: rows.length,
  pendingRows: pendingRows.length,
  approvedRows: approvedRows.length,
  missingEvidenceRows: missingEvidenceRows.length,
  p3Rows,
  p4Rows,
  manualTraceRequiredRows: actionCounts.OPERATOR_MANUAL_TRACE_REQUIRED ?? 0,
  correctedPathRequiredRows: actionCounts.OPERATOR_CORRECTED_PATH_REQUIRED ?? 0,
  labelAndHitAreaRows,
  requiresOperatorDecision: pendingRows.length > 0,
  productionWriteAllowed: false,
  blockers,
  nextCommandsAfterP0P1P2ClosedAndOperatorInput: [
    'npm run stadium:daegu:p3-p4-operator-prewrite-gate',
    'npm run stadium:daegu:p3-p4-operator-import:write-template',
    'npm run stadium:daegu:operator-corrections-write',
  ],
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This packet is a read-only operator review aid.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'P3/P4 write-template remains blocked until P0, P1, and P2 are closed.',
    'Candidate paths are visual references only and must not be promoted without operator approval.',
  ],
  requiredApprovalFields: [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ],
  rows,
};

const jsonPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-decision-packet.json');
const csvPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-decision-packet.csv');
const markdownPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-decision-packet.md');

await fs.mkdir(p3p4ReportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'blockId',
    'block',
    'queuePriority',
    'decision',
    'operatorAction',
    'recommendedAction',
    'reviewFocus',
    'evidenceCrop',
    'evidenceExists',
    'candidatePathPointCount',
    'candidateDuplicateGroup',
    'candidateDuplicateIds',
    'officialFailureReasons',
    'riskFlags',
  ],
  ...rows.map((row) => [
    row.blockId,
    row.block,
    row.queuePriority,
    row.decision,
    row.operatorAction,
    row.recommendedAction,
    row.reviewFocus,
    row.evidenceCrop,
    row.evidenceExists,
    row.candidatePathPointCount,
    row.candidateDuplicateGroup,
    row.candidateDuplicateIds,
    row.officialFailureReasons,
    row.riskFlags,
  ]),
]);

const markdownRows = rows.flatMap((row) => [
  `## ${row.block}`,
  '',
  `![${row.block}](${path.relative(p3p4ReportDir, row.evidenceAbsolutePath)})`,
  '',
  markdownTable(
    ['field', 'value'],
    [
      ['blockId', `\`${row.blockId}\``],
      ['name', row.name],
      ['priority', `\`${row.queuePriority}\``],
      ['decision', `\`${row.decision}\``],
      ['action', `\`${row.operatorAction}\``],
      ['recommended action', row.recommendedAction || '-'],
      ['review focus', row.reviewFocus],
      ['candidate points', row.candidatePathPointCount],
      ['duplicate group', row.candidateDuplicateGroup || '-'],
      ['duplicate ids', row.candidateDuplicateIds || '-'],
      ['current label', row.currentLabel],
      ['candidate center', row.candidateCenter || '-'],
      ['failures', row.officialFailureReasons || '-'],
      ['risk flags', row.riskFlags || '-'],
      ['evidence crop', `\`${row.evidenceCrop}\``],
    ],
  ),
  '',
]);

await fs.writeFile(markdownPath, [
  '# Daegu P3/P4 Decision Packet',
  '',
  `- packet version: \`${PACKET_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- target batch: \`${TARGET_BATCH_ID}\``,
  `- rows: ${summary.totalRows}`,
  `- pending rows: ${summary.pendingRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- P3 rows: ${summary.p3Rows}`,
  `- P4 rows: ${summary.p4Rows}`,
  `- manual trace required rows: ${summary.manualTraceRequiredRows}`,
  `- corrected path required rows: ${summary.correctedPathRequiredRows}`,
  `- label and hit-area rows: ${summary.labelAndHitAreaRows}`,
  `- input JSON: \`${summary.input}\``,
  `- input CSV: \`${summary.inputCsv}\``,
  `- readiness report: \`${summary.readiness}\``,
  '',
  '## Rules',
  '',
  '- This packet is read-only and does not write production data.',
  '- P3/P4 write-template remains blocked until P0, P1, and P2 are closed.',
  '- `candidatePath` is reference-only; do not approve it automatically.',
  '- `APPROVED` rows require `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
  '- If a row cannot be approved, set `operatorDecision` to `REJECTED` or `NEEDS_RETRACE`.',
  '',
  '## Summary',
  '',
  markdownTable(
    ['block', 'priority', 'decision', 'action', 'focus', 'evidence'],
    rows.map((row) => [
      `\`${row.block}\``,
      `\`${row.queuePriority}\``,
      `\`${row.decision}\``,
      `\`${row.operatorAction}\``,
      row.reviewFocus,
      row.evidenceExists ? 'ok' : 'missing',
    ]),
  ),
  '',
  ...markdownRows,
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
].join('\n'), 'utf8');

console.log(`p3_p4_decision_packet_json:${jsonPath}`);
console.log(`p3_p4_decision_packet_csv:${csvPath}`);
console.log(`p3_p4_decision_packet_markdown:${markdownPath}`);
console.log(`status:${summary.status} rows=${summary.totalRows} pending=${summary.pendingRows} blockers=${summary.blockers.length}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
