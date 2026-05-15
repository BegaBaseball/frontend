import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const WORKSET_VERSION = 'DAEGU_VISUAL_OFF_SEAT_WORKSET_V1';
const VISUAL_QUEUE_VERSION = 'DAEGU_VISUAL_ISSUE_QUEUE_V1';
const TARGET_TIER = 'VISUAL_OFF_SEAT_HARD_FAIL';
const EXPECTED = {
  expectedRows: 27,
  expectedVisualSeedRows: 7,
  expectedP0Rows: 0,
  expectedP1Rows: 5,
  expectedP2Rows: 0,
  expectedP3P4Rows: 22,
  expectedApprovedRows: 0,
};
const BATCH_GROUPS = {
  BATCH_1_P0: 'P0',
  BATCH_2_P1: 'P1',
  BATCH_3_P2: 'P2',
  BATCH_4_P3_P4: 'P3_P4',
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

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const visualQueuePath = path.resolve(
  frontendRoot,
  argValue('--visual-queue', path.join(reportDir, 'daegu-visual-issue-queue.json')),
);
const blockers = [];
const warnings = [];

const visualQueue = await readJson(visualQueuePath);
const sourceRows = Array.isArray(visualQueue.rows) ? visualQueue.rows : [];

if (visualQueue.summary?.queueVersion !== VISUAL_QUEUE_VERSION) {
  blockers.push(`VISUAL_QUEUE_VERSION_MISMATCH:${visualQueue.summary?.queueVersion ?? ''}`);
}
if (visualQueue.summary?.status !== 'ready-for-operator') {
  blockers.push(`VISUAL_QUEUE_NOT_READY:${visualQueue.summary?.status ?? ''}`);
}
if (visualQueue.summary?.productionWriteAllowed !== false) {
  blockers.push('VISUAL_QUEUE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
}

const rows = sourceRows
  .filter((row) => row.visualIssueTier === TARGET_TIER)
  .map((row) => ({
    sourceQueue: path.relative(frontendRoot, visualQueuePath),
    sourceInput: row.sourceInput,
    batchId: row.batchId,
    batchGroup: BATCH_GROUPS[row.batchId] ?? row.batchId,
    blockId: row.blockId,
    block: row.block,
    name: row.name,
    category: row.category,
    queuePriority: row.queuePriority,
    operatorDecision: normalizeDecision(row.operatorDecision),
    visualIssueTier: row.visualIssueTier,
    visualEvidenceGroup: row.visualEvidenceGroup,
    observedIssue: row.observedIssue,
    isVisualSeed: row.isVisualSeed,
    operatorAction: 'Manually trace the visible official seat boundary; do not reuse currentPath or candidatePath.',
    currentPathUsage: 'DO_NOT_COPY_CURRENT_PATH_TO_CORRECTED_PATH',
    candidatePathUsage: 'REFERENCE_ONLY_DO_NOT_COPY_TO_CORRECTED_PATH',
    candidateStatus: row.candidateStatus,
    evidenceCrop: row.evidenceCrop,
    evidenceExists: row.evidenceExists,
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
    correctedPath: row.correctedPath ?? '',
    correctedLabelX: row.correctedLabelX ?? '',
    correctedLabelY: row.correctedLabelY ?? '',
    reviewer: row.reviewer ?? '',
    reviewedAt: row.reviewedAt ?? '',
    operatorNote: row.operatorNote ?? '',
  }))
  .sort((left, right) => (
    left.batchId.localeCompare(right.batchId)
    || String(left.queuePriority).localeCompare(String(right.queuePriority))
    || String(left.block).localeCompare(String(right.block), 'ko')
  ));

const visualSeedRows = rows.filter((row) => row.isVisualSeed);
const p0Rows = rows.filter((row) => row.batchId === 'BATCH_1_P0');
const p1Rows = rows.filter((row) => row.batchId === 'BATCH_2_P1');
const p2Rows = rows.filter((row) => row.batchId === 'BATCH_3_P2');
const p3p4Rows = rows.filter((row) => row.batchId === 'BATCH_4_P3_P4');
const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
const missingEvidenceRows = rows.filter((row) => row.evidenceExists !== true);
const batchCounts = rows.reduce((counts, row) => ({
  ...counts,
  [row.batchGroup]: (counts[row.batchGroup] ?? 0) + 1,
}), {});

if (rows.length !== EXPECTED.expectedRows) {
  warnings.push(`VISUAL_OFF_SEAT_WORKSET_ROWS_CHANGED_AFTER_WRITES:${rows.length}:${EXPECTED.expectedRows}`);
}
if (visualSeedRows.length !== EXPECTED.expectedVisualSeedRows) {
  warnings.push(`VISUAL_OFF_SEAT_SEED_ROWS_CHANGED_AFTER_WRITES:${visualSeedRows.length}:${EXPECTED.expectedVisualSeedRows}`);
}
if (p0Rows.length !== EXPECTED.expectedP0Rows) {
  warnings.push(`VISUAL_OFF_SEAT_P0_ROWS_CHANGED_AFTER_WRITES:${p0Rows.length}:${EXPECTED.expectedP0Rows}`);
}
if (p1Rows.length !== EXPECTED.expectedP1Rows) {
  warnings.push(`VISUAL_OFF_SEAT_P1_ROWS_CHANGED_AFTER_WRITES:${p1Rows.length}:${EXPECTED.expectedP1Rows}`);
}
if (p2Rows.length !== EXPECTED.expectedP2Rows) {
  warnings.push(`VISUAL_OFF_SEAT_P2_ROWS_CHANGED_AFTER_WRITES:${p2Rows.length}:${EXPECTED.expectedP2Rows}`);
}
if (p3p4Rows.length !== EXPECTED.expectedP3P4Rows) {
  warnings.push(`VISUAL_OFF_SEAT_P3_P4_ROWS_CHANGED_AFTER_WRITES:${p3p4Rows.length}:${EXPECTED.expectedP3P4Rows}`);
}
if (missingEvidenceRows.length > 0) {
  blockers.push(`VISUAL_OFF_SEAT_MISSING_EVIDENCE:${missingEvidenceRows.map((row) => row.blockId).join(' ')}`);
}
if (approvedRows.length !== EXPECTED.expectedApprovedRows) {
  warnings.push(`APPROVED_ROWS_PRESENT_IN_VISUAL_OFF_SEAT_WORKSET:${approvedRows.length}:${EXPECTED.expectedApprovedRows}`);
}

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
const summary = {
  worksetVersion: WORKSET_VERSION,
  status,
  productionWriteAllowed: false,
  sourceQueueVersion: VISUAL_QUEUE_VERSION,
  sourceQueue: path.relative(frontendRoot, visualQueuePath),
  targetTier: TARGET_TIER,
  totalRows: rows.length,
  visualSeedRows: visualSeedRows.length,
  approvedRows: approvedRows.length,
  p0Rows: p0Rows.length,
  p1Rows: p1Rows.length,
  p2Rows: p2Rows.length,
  p3p4Rows: p3p4Rows.length,
  batchCounts,
  blockers,
  warnings,
  approvalRule: 'Operators must write approved corrected geometry back to the matching source input file; this workset never writes production data.',
};
const safetyContract = [
  'This VISUAL_OFF_SEAT_HARD_FAIL workset is read-only.',
  'It never writes the main corrections template.',
  'It never modifies src/data/daeguSeatData.ts.',
  'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
  'The currentPath must not be copied into correctedPath.',
  'Candidate paths are reference-only and must not be copied into correctedPath.',
  'Approved rows still require correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt in the matching source input.',
  'No external crawling, web search, or coordinate inference is allowed.',
];
const report = {
  generatedAt: new Date().toISOString(),
  summary,
  expected: EXPECTED,
  safetyContract,
  requiredApprovalFields: [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ],
  nextBatchGateCommands: [
    'npm run stadium:daegu:p0-operator-prewrite-gate',
    'npm run stadium:daegu:p1-operator-prewrite-gate',
    'npm run stadium:daegu:p3-p4-operator-prewrite-gate',
  ],
  rows,
};

const jsonPath = path.join(reportDir, 'daegu-visual-off-seat-workset.json');
const csvPath = path.join(reportDir, 'daegu-visual-off-seat-workset.csv');
const markdownPath = path.join(reportDir, 'daegu-visual-off-seat-workset.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'sourceQueue',
    'sourceInput',
    'batchId',
    'batchGroup',
    'blockId',
    'block',
    'name',
    'category',
    'queuePriority',
    'operatorDecision',
    'visualEvidenceGroup',
    'observedIssue',
    'isVisualSeed',
    'operatorAction',
    'currentPathUsage',
    'candidatePathUsage',
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
    'componentInsidePathRatio',
    'pathColorCoverageRatio',
    'officialFailureReasons',
    'riskFlags',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ],
  ...rows.map((row) => [
    row.sourceQueue,
    row.sourceInput,
    row.batchId,
    row.batchGroup,
    row.blockId,
    row.block,
    row.name,
    row.category,
    row.queuePriority,
    row.operatorDecision,
    row.visualEvidenceGroup,
    row.observedIssue,
    row.isVisualSeed,
    row.operatorAction,
    row.currentPathUsage,
    row.candidatePathUsage,
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
    row.componentInsidePathRatio,
    row.pathColorCoverageRatio,
    row.officialFailureReasons,
    row.riskFlags,
    row.correctedPath,
    row.correctedLabelX,
    row.correctedLabelY,
    row.reviewer,
    row.reviewedAt,
    row.operatorNote,
  ]),
]);

const rowTable = (tableRows) => markdownTable(
  ['batch', 'block', 'evidence group', 'seed', 'decision', 'candidate', 'inside', 'coverage', 'source input', 'evidence'],
  tableRows.map((row) => [
    `\`${row.batchId}\``,
    `\`${row.block}\``,
    row.visualEvidenceGroup || '-',
    row.isVisualSeed,
    `\`${row.operatorDecision}\``,
    row.candidateStatus,
    row.componentInsidePathRatio === '' ? '-' : row.componentInsidePathRatio,
    row.pathColorCoverageRatio === '' ? '-' : row.pathColorCoverageRatio,
    `\`${row.sourceInput}\``,
    row.evidenceCrop ? `[crop](${row.evidenceCrop})` : '-',
  ]),
);

await fs.writeFile(markdownPath, [
  '# Daegu Visual Off-Seat Workset',
  '',
  `- workset version: \`${WORKSET_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- source queue: \`${summary.sourceQueue}\``,
  `- target tier: \`${summary.targetTier}\``,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  `- total rows: ${summary.totalRows}`,
  `- visual seed rows: ${summary.visualSeedRows}`,
  `- P0 rows: ${summary.p0Rows}`,
  `- P1 rows: ${summary.p1Rows}`,
  `- P2 rows: ${summary.p2Rows}`,
  `- P3/P4 rows: ${summary.p3p4Rows}`,
  `- JSON output: \`${path.relative(frontendRoot, jsonPath)}\``,
  `- CSV output: \`${path.relative(frontendRoot, csvPath)}\``,
  '',
  '## Safety',
  '',
  ...safetyContract.map((rule) => `- ${rule}`),
  '',
  '## Batch Counts',
  '',
  markdownTable(
    ['batch group', 'rows'],
    [
      ['P0', summary.p0Rows],
      ['P1', summary.p1Rows],
      ['P2', summary.p2Rows],
      ['P3/P4', summary.p3p4Rows],
    ],
  ),
  '',
  '## Rows',
  '',
  rowTable(rows),
  '',
  '## Approval Rule',
  '',
  '- This workset does not approve or write any row.',
  '- Operators must manually trace the visible official seat boundary for these rows.',
  '- Approved rows must be written back to the matching source input file and then pass the existing batch gate.',
  '- Production data can change only through the existing validation/preview/apply/write gates.',
].join('\n'), 'utf8');

console.log(JSON.stringify({
  status,
  output: path.relative(frontendRoot, markdownPath),
  totalRows: rows.length,
  visualSeedRows: visualSeedRows.length,
  p0Rows: p0Rows.length,
  p1Rows: p1Rows.length,
  p2Rows: p2Rows.length,
  p3p4Rows: p3p4Rows.length,
  productionWriteAllowed: summary.productionWriteAllowed,
  blockers: blockers.length,
  warnings: warnings.length,
}, null, 2));

if (blockers.length > 0) {
  process.exitCode = 1;
}
