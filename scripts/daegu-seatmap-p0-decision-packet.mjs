import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP0ReportDir = path.join(defaultReportDir, 'daegu-p0-operator');

const PACKET_VERSION = 'DAEGU_P0_DECISION_PACKET_V1';
const PACKAGE_VERSION = 'DAEGU_P0_OPERATOR_PACKAGE_V1';
const TARGET_BATCH_ID = 'BATCH_1_P0';
const EXPECTED_ROWS = 3;

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
  if (row.operatorAction === 'OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY') {
    return 'Duplicate candidate boundary; trace a separate block-specific polygon before approval.';
  }
  return 'Operator corrected path required before approval.';
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const p0ReportDir = path.resolve(frontendRoot, argValue('--p0-report-dir', defaultP0ReportDir));
const inputPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.json');
const inputCsvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.csv');
const checklistPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-checklist.md');
const readinessPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-readiness.md');

const input = await readJson(inputPath);
const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const blockers = [];

if (input.packageVersion !== PACKAGE_VERSION) {
  blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
if (input.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (inputRows.length !== EXPECTED_ROWS) blockers.push(`P0_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED_ROWS}`);

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
  requiresOperatorDecision: pendingRows.length > 0,
  productionWriteAllowed: false,
  blockers,
  nextCommandsAfterOperatorInput: [
    'npm run stadium:daegu:p0-operator-prewrite-gate',
    'npm run stadium:daegu:p0-operator-import:write-template',
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

const jsonPath = path.join(p0ReportDir, 'daegu-seatmap-p0-decision-packet.json');
const csvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-decision-packet.csv');
const markdownPath = path.join(p0ReportDir, 'daegu-seatmap-p0-decision-packet.md');

await fs.mkdir(p0ReportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'blockId',
    'block',
    'decision',
    'operatorAction',
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
    row.decision,
    row.operatorAction,
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
  `![${row.block}](${path.relative(p0ReportDir, row.evidenceAbsolutePath)})`,
  '',
  markdownTable(
    ['field', 'value'],
    [
      ['blockId', `\`${row.blockId}\``],
      ['name', row.name],
      ['decision', `\`${row.decision}\``],
      ['action', `\`${row.operatorAction}\``],
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
  '# Daegu P0 Decision Packet',
  '',
  `- packet version: \`${PACKET_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- target batch: \`${TARGET_BATCH_ID}\``,
  `- rows: ${summary.totalRows}`,
  `- pending rows: ${summary.pendingRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- input JSON: \`${summary.input}\``,
  `- input CSV: \`${summary.inputCsv}\``,
  `- readiness report: \`${summary.readiness}\``,
  '',
  '## Rules',
  '',
  '- This packet is read-only and does not write production data.',
  '- `candidatePath` is reference-only; do not approve it automatically.',
  '- `APPROVED` rows require `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
  '- If a row cannot be approved, set `operatorDecision` to `REJECTED` or `NEEDS_RETRACE`.',
  '',
  '## Summary',
  '',
  markdownTable(
    ['block', 'decision', 'action', 'focus', 'evidence'],
    rows.map((row) => [
      `\`${row.block}\``,
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

console.log(`p0_decision_packet_json:${jsonPath}`);
console.log(`p0_decision_packet_csv:${csvPath}`);
console.log(`p0_decision_packet_markdown:${markdownPath}`);
console.log(`status:${summary.status} rows=${summary.totalRows} pending=${summary.pendingRows} blockers=${summary.blockers.length}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
