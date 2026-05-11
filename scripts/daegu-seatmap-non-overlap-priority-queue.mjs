import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const QUEUE_VERSION = 'DAEGU_NON_OVERLAP_PRIORITY_QUEUE_V1';
const INPUT_SPECS = [
  {
    batchId: 'BATCH_1_P0',
    batchOrder: 1,
    packageVersion: 'DAEGU_P0_OPERATOR_PACKAGE_V1',
    input: 'reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json',
    expectedRows: 3,
  },
  {
    batchId: 'BATCH_2_P1',
    batchOrder: 2,
    packageVersion: 'DAEGU_P1_OPERATOR_PACKAGE_V1',
    input: 'reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json',
    expectedRows: 29,
  },
  {
    batchId: 'BATCH_3_P2',
    batchOrder: 3,
    packageVersion: 'DAEGU_P2_OPERATOR_PACKAGE_V1',
    input: 'reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json',
    expectedRows: 50,
  },
  {
    batchId: 'BATCH_4_P3_P4',
    batchOrder: 4,
    packageVersion: 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1',
    input: 'reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.json',
    expectedRows: 52,
  },
];
const EXPECTED = {
  expectedRows: 134,
  expectedNonOverlapRows: 117,
  expectedDuplicateRows: 17,
  expectedOffSeatRows: 44,
  expectedVisualCandidateRows: 50,
  expectedManualRetraceRows: 23,
};
const WORK_TIER_ORDER = {
  NO_OVERLAP_OFF_SEAT_RETRACE_FIRST: 1,
  NO_OVERLAP_VISUAL_APPROVAL_CANDIDATE: 2,
  NO_OVERLAP_MANUAL_RETRACE: 3,
  DEFER_DUPLICATE_BOUNDARY: 4,
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

const markerIncludes = (value, marker) => {
  if (Array.isArray(value)) return value.includes(marker);
  return String(value ?? '').includes(marker);
};

const absoluteFromFrontendRoot = (filePath) => {
  if (!filePath) return '';
  return path.isAbsolute(filePath) ? filePath : path.join(frontendRoot, filePath);
};

const isOffSeatCurrentPath = (row) => (
  markerIncludes(row.officialFailureReasons, 'LOW_COMPONENT_INSIDE_CURRENT_PATH')
  || markerIncludes(row.officialFailureReasons, 'LOW_CURRENT_PATH_COLOR_COVERAGE')
  || markerIncludes(row.riskFlags, 'LOW_COMPONENT_INSIDE_CURRENT_PATH')
  || markerIncludes(row.riskFlags, 'LOW_CURRENT_PATH_COLOR_COVERAGE')
);

const classifyWorkTier = (row) => {
  if (row.candidateDuplicateGroup) return 'DEFER_DUPLICATE_BOUNDARY';
  if (isOffSeatCurrentPath(row)) return 'NO_OVERLAP_OFF_SEAT_RETRACE_FIRST';
  if (row.candidateStatus === 'PIXEL_CANDIDATE_READY') return 'NO_OVERLAP_VISUAL_APPROVAL_CANDIDATE';
  return 'NO_OVERLAP_MANUAL_RETRACE';
};

const actionForTier = (tier) => {
  if (tier === 'NO_OVERLAP_OFF_SEAT_RETRACE_FIRST') {
    return 'Trace the visible official seat boundary manually; do not reuse the legacy currentPath.';
  }
  if (tier === 'NO_OVERLAP_VISUAL_APPROVAL_CANDIDATE') {
    return 'Compare evidence crop and candidatePath; approve only after operator visual confirmation and label/top-hit review.';
  }
  if (tier === 'NO_OVERLAP_MANUAL_RETRACE') {
    return 'Manual retrace is required because no clean pixel candidate is available.';
  }
  return 'Defer until duplicate/shared candidate boundaries are split per block.';
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
const handoff = await readJson(handoffPath);
const currentHandoffIds = new Set((handoff.workItems ?? []).map((row) => row.id));
const blockers = [];
const warnings = [];

const inputReports = await Promise.all(INPUT_SPECS.map(async (spec) => {
  const inputPath = path.join(frontendRoot, spec.input);
  const input = await readJson(inputPath);
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];

  if (input.packageVersion !== spec.packageVersion) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${spec.batchId}:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== spec.batchId) {
    blockers.push(`INPUT_BATCH_MISMATCH:${spec.batchId}:${input.targetBatchId ?? ''}`);
  }
  if (input.draftOnly !== false) blockers.push(`INPUT_DRAFT_ONLY_NOT_FALSE:${spec.batchId}`);
  if (input.productionWriteAllowed !== false) {
    blockers.push(`INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE:${spec.batchId}`);
  }
  if (inputRows.length !== spec.expectedRows) {
    warnings.push(`INPUT_ROW_COUNT_CHANGED_AFTER_WRITES:${spec.batchId}:${inputRows.length}:${spec.expectedRows}`);
  }

  return {
    ...spec,
    inputPath,
    rows: inputRows,
  };
}));

const rows = inputReports.flatMap((inputReport) => inputReport.rows
  .filter((row) => {
    if (currentHandoffIds.has(row.blockId)) return true;
    const operatorDecision = normalizeDecision(row.operatorDecision);
    if (operatorDecision === 'PENDING') {
      blockers.push(`INPUT_PENDING_ROW_MISSING_FROM_CURRENT_HANDOFF:${row.blockId}`);
    } else {
      warnings.push(`INPUT_TERMINAL_ROW_CLOSED_IN_CURRENT_HANDOFF:${row.blockId}`);
    }
    return false;
  })
  .map((row) => {
  const evidenceAbsolutePath = absoluteFromFrontendRoot(row.evidenceCrop);
  const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
  const operatorDecision = normalizeDecision(row.operatorDecision);
  const workTier = classifyWorkTier(row);
  const duplicate = workTier === 'DEFER_DUPLICATE_BOUNDARY';

  if (!evidenceExists) blockers.push(`MISSING_EVIDENCE_CROP:${row.blockId}`);

  return {
    sourceInput: path.relative(frontendRoot, inputReport.inputPath),
    batchId: inputReport.batchId,
    batchOrder: inputReport.batchOrder,
    blockId: row.blockId,
    block: row.block,
    name: row.name,
    category: row.category,
    queuePriority: row.queuePriority,
    alignmentClass: row.alignmentClass,
    operatorDecision,
    workTier,
    workTierOrder: WORK_TIER_ORDER[workTier],
    recommendedOperatorAction: actionForTier(workTier),
    isNonOverlap: !duplicate,
    isOffSeatCurrentPath: isOffSeatCurrentPath(row),
    candidateStatus: row.candidateStatus,
    recommendedAction: row.recommendedAction,
    operatorAction: row.operatorAction,
    evidenceCrop: row.evidenceCrop,
    evidenceExists,
    currentPath: row.currentPath,
    currentLabelX: row.currentLabelX,
    currentLabelY: row.currentLabelY,
    candidatePath: row.candidatePath,
    candidatePathPointCount: row.candidatePathPointCount,
    candidateCenterX: row.candidateCenterX,
    candidateCenterY: row.candidateCenterY,
    candidateDuplicateGroup: row.candidateDuplicateGroup || '',
    candidateDuplicateIds: row.candidateDuplicateIds || '',
    componentInsidePathRatio: row.componentInsidePathRatio,
    pathColorCoverageRatio: row.pathColorCoverageRatio,
    officialFailureReasons: row.officialFailureReasons || '',
    riskFlags: row.riskFlags || '',
    correctedPath: row.correctedPath ?? '',
    correctedLabelX: row.correctedLabelX ?? '',
    correctedLabelY: row.correctedLabelY ?? '',
    reviewer: row.reviewer ?? '',
    reviewedAt: row.reviewedAt ?? '',
    operatorNote: row.operatorNote || '',
  };
}));

const sortedRows = [...rows].sort((left, right) => (
  left.workTierOrder - right.workTierOrder
  || left.batchOrder - right.batchOrder
  || String(left.queuePriority).localeCompare(String(right.queuePriority))
  || String(left.block).localeCompare(String(right.block), 'ko')
));
const nonOverlapRows = rows.filter((row) => row.isNonOverlap);
const duplicateRows = rows.filter((row) => !row.isNonOverlap);
const offSeatRows = rows.filter((row) => row.workTier === 'NO_OVERLAP_OFF_SEAT_RETRACE_FIRST');
const visualCandidateRows = rows.filter((row) => row.workTier === 'NO_OVERLAP_VISUAL_APPROVAL_CANDIDATE');
const manualRetraceRows = rows.filter((row) => row.workTier === 'NO_OVERLAP_MANUAL_RETRACE');
const tierCounts = rows.reduce((counts, row) => ({
  ...counts,
  [row.workTier]: (counts[row.workTier] ?? 0) + 1,
}), {});
const priorityCounts = nonOverlapRows.reduce((counts, row) => ({
  ...counts,
  [row.queuePriority]: (counts[row.queuePriority] ?? 0) + 1,
}), {});

if (rows.length !== EXPECTED.expectedRows) warnings.push(`TOTAL_ROWS_CHANGED:${rows.length}:${EXPECTED.expectedRows}`);
if (nonOverlapRows.length !== EXPECTED.expectedNonOverlapRows) {
  warnings.push(`NON_OVERLAP_ROWS_CHANGED:${nonOverlapRows.length}:${EXPECTED.expectedNonOverlapRows}`);
}
if (duplicateRows.length !== EXPECTED.expectedDuplicateRows) {
  warnings.push(`DUPLICATE_ROWS_CHANGED:${duplicateRows.length}:${EXPECTED.expectedDuplicateRows}`);
}
if (offSeatRows.length !== EXPECTED.expectedOffSeatRows) {
  warnings.push(`OFF_SEAT_ROWS_CHANGED:${offSeatRows.length}:${EXPECTED.expectedOffSeatRows}`);
}
if (visualCandidateRows.length !== EXPECTED.expectedVisualCandidateRows) {
  warnings.push(`VISUAL_CANDIDATE_ROWS_CHANGED:${visualCandidateRows.length}:${EXPECTED.expectedVisualCandidateRows}`);
}
if (manualRetraceRows.length !== EXPECTED.expectedManualRetraceRows) {
  warnings.push(`MANUAL_RETRACE_ROWS_CHANGED:${manualRetraceRows.length}:${EXPECTED.expectedManualRetraceRows}`);
}

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
const summary = {
  queueVersion: QUEUE_VERSION,
  status,
  productionWriteAllowed: false,
  totalRows: rows.length,
  nonOverlapRows: nonOverlapRows.length,
  duplicateRows: duplicateRows.length,
  offSeatRows: offSeatRows.length,
  visualCandidateRows: visualCandidateRows.length,
  manualRetraceRows: manualRetraceRows.length,
  priorityCounts,
  tierCounts,
  inputs: INPUT_SPECS.map((spec) => spec.input),
  sourceHandoff: path.relative(frontendRoot, handoffPath),
  blockers,
  warnings,
  approvalRule: 'Only operatorDecision=APPROVED rows with correctedPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt can enter production write gates.',
};

const safetyContract = [
  'This priority queue is a read-only operator review aid.',
  'It never writes the main corrections template.',
  'It never modifies src/data/daeguSeatData.ts.',
  'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
  'Candidate paths remain reference-only and must not be promoted without operator approval.',
  'Duplicate candidate rows are deferred until shared boundaries are split per block.',
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
  workTierOrder: [
    'NO_OVERLAP_OFF_SEAT_RETRACE_FIRST',
    'NO_OVERLAP_VISUAL_APPROVAL_CANDIDATE',
    'NO_OVERLAP_MANUAL_RETRACE',
    'DEFER_DUPLICATE_BOUNDARY',
  ],
  rows: sortedRows,
};

const jsonPath = path.join(reportDir, 'daegu-non-overlap-priority-queue.json');
const csvPath = path.join(reportDir, 'daegu-non-overlap-priority-queue.csv');
const markdownPath = path.join(reportDir, 'daegu-non-overlap-priority-queue.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'workTier',
    'sourceInput',
    'batchId',
    'blockId',
    'block',
    'name',
    'category',
    'queuePriority',
    'operatorDecision',
    'recommendedOperatorAction',
    'isNonOverlap',
    'isOffSeatCurrentPath',
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
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ],
  ...sortedRows.map((row) => [
    row.workTier,
    row.sourceInput,
    row.batchId,
    row.blockId,
    row.block,
    row.name,
    row.category,
    row.queuePriority,
    row.operatorDecision,
    row.recommendedOperatorAction,
    row.isNonOverlap,
    row.isOffSeatCurrentPath,
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
    row.correctedPath,
    row.correctedLabelX,
    row.correctedLabelY,
    row.reviewer,
    row.reviewedAt,
    row.operatorNote,
  ]),
]);

const rowTable = (tableRows) => markdownTable(
  ['tier', 'batch', 'block', 'category', 'decision', 'candidate', 'inside', 'coverage', 'duplicate', 'evidence', 'failures'],
  tableRows.map((row) => [
    `\`${row.workTier}\``,
    `\`${row.batchId}\``,
    `\`${row.block}\``,
    row.category,
    `\`${row.operatorDecision}\``,
    row.candidateStatus,
    row.componentInsidePathRatio === '' ? '-' : row.componentInsidePathRatio,
    row.pathColorCoverageRatio === '' ? '-' : row.pathColorCoverageRatio,
    row.candidateDuplicateGroup || '-',
    row.evidenceCrop ? `[crop](${row.evidenceCrop})` : '-',
    row.officialFailureReasons || '-',
  ]),
);

await fs.writeFile(markdownPath, [
  '# Daegu Non-Overlap Priority Queue',
  '',
  `- queue version: \`${QUEUE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- total rows: ${summary.totalRows}`,
  `- non-overlap first rows: ${summary.nonOverlapRows}`,
  `- duplicate deferred rows: ${summary.duplicateRows}`,
  `- off-seat current path rows: ${summary.offSeatRows}`,
  `- visual candidate rows: ${summary.visualCandidateRows}`,
  `- manual retrace rows: ${summary.manualRetraceRows}`,
  `- JSON output: \`${path.relative(frontendRoot, jsonPath)}\``,
  `- CSV output: \`${path.relative(frontendRoot, csvPath)}\``,
  '',
  '## Safety',
  '',
  ...safetyContract.map((rule) => `- ${rule}`),
  '',
  '## Work Order',
  '',
  markdownTable(
    ['order', 'tier', 'rows', 'operator action'],
    [
      ['1', '`NO_OVERLAP_OFF_SEAT_RETRACE_FIRST`', offSeatRows.length, actionForTier('NO_OVERLAP_OFF_SEAT_RETRACE_FIRST')],
      ['2', '`NO_OVERLAP_VISUAL_APPROVAL_CANDIDATE`', visualCandidateRows.length, actionForTier('NO_OVERLAP_VISUAL_APPROVAL_CANDIDATE')],
      ['3', '`NO_OVERLAP_MANUAL_RETRACE`', manualRetraceRows.length, actionForTier('NO_OVERLAP_MANUAL_RETRACE')],
      ['4', '`DEFER_DUPLICATE_BOUNDARY`', duplicateRows.length, actionForTier('DEFER_DUPLICATE_BOUNDARY')],
    ],
  ),
  '',
  '## Non-Overlap Rows',
  '',
  rowTable(sortedRows.filter((row) => row.isNonOverlap)),
  '',
  '## Deferred Duplicate Rows',
  '',
  rowTable(sortedRows.filter((row) => !row.isNonOverlap)),
  '',
  '## Approval Rule',
  '',
  '- This queue does not approve or write any row.',
  '- Operator-approved rows must still be copied into the matching operator input file with `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
  '- Production data can change only through the existing validation/preview/apply/write gates.',
].join('\n'), 'utf8');

console.log(JSON.stringify({
  status,
  output: path.relative(frontendRoot, markdownPath),
  totalRows: rows.length,
  nonOverlapRows: nonOverlapRows.length,
  offSeatRows: offSeatRows.length,
  visualCandidateRows: visualCandidateRows.length,
  manualRetraceRows: manualRetraceRows.length,
  duplicateDeferredRows: duplicateRows.length,
  blockers: blockers.length,
  warnings: warnings.length,
}, null, 2));

if (blockers.length > 0) {
  process.exitCode = 1;
}
