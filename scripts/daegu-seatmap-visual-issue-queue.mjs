import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const QUEUE_VERSION = 'DAEGU_VISUAL_ISSUE_QUEUE_V1';
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
  expectedVisualSeedRows: 29,
};
const VISUAL_ISSUE_TIER_ORDER = {
  VISUAL_OFF_SEAT_HARD_FAIL: 1,
  OVERSIZED_RECT_MANUAL_RETRACE: 2,
  LABEL_AND_HIT_AREA_REVIEW: 3,
  VISUAL_APPROVAL_CANDIDATE: 4,
  DEFER_DUPLICATE_BOUNDARY: 5,
};
const VISUAL_SEED_OBSERVATIONS = [
  ...['13', '14', '15', '16', 'U25', 'U26', 'U27', 'U28', 'U29', 'U30', 'U31'].map((block) => ({
    visualEvidenceGroup: 'Image #1',
    block,
    observedIssue: 'OVERSIZED_RECT_IN_BACKGROUND_OR_NON_SEAT_AREA',
  })),
  ...['M-9', 'MR-9', 'MR-10', 'LF-9', 'LF-10'].map((block) => ({
    visualEvidenceGroup: 'Image #2',
    block,
    observedIssue: 'GATE_AISLE_OR_OUTFIELD_BOUNDARY_MISMATCH',
  })),
  ...['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'].map((block) => ({
    visualEvidenceGroup: 'Image #3',
    block,
    observedIssue: 'RIGHT_SKY_LOWER_VERTICAL_BOUNDARY_REVIEW',
  })),
  ...['1-7', '1-8', '1-9', '1-10', '1-11'].map((block) => ({
    visualEvidenceGroup: 'Image #3',
    block,
    observedIssue: 'FIRST_BASE_INFIELD_BOUNDARY_LABEL_OR_OVERSIZED_REVIEW',
  })),
];
const VISUAL_SEED_BY_BLOCK = new Map(VISUAL_SEED_OBSERVATIONS.map((seed) => [seed.block, seed]));

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

const needsLabelAndHitReview = (row) => (
  markerIncludes(row.officialFailureReasons, 'LABEL_TOP_HIT_MISMATCH')
  || markerIncludes(row.riskFlags, 'LABEL_TOP_HIT_MISMATCH')
  || row.operatorAction === 'OPERATOR_LABEL_AND_HIT_AREA_REVIEW'
);

const requiresManualTrace = (row) => (
  row.candidateStatus === 'NEEDS_MANUAL_TRACE'
  || row.candidateStatus === 'NO_SEED_COLOR'
  || row.operatorAction === 'OPERATOR_MANUAL_TRACE_REQUIRED'
  || markerIncludes(row.riskFlags, 'LEGACY_SCALED_POLYGON')
);

const classifyVisualIssueTier = (row) => {
  if (row.candidateDuplicateGroup) return 'DEFER_DUPLICATE_BOUNDARY';
  if (isOffSeatCurrentPath(row)) return 'VISUAL_OFF_SEAT_HARD_FAIL';
  if (requiresManualTrace(row) && row.candidateStatus !== 'PIXEL_CANDIDATE_READY') {
    return 'OVERSIZED_RECT_MANUAL_RETRACE';
  }
  if (needsLabelAndHitReview(row)) return 'LABEL_AND_HIT_AREA_REVIEW';
  if (row.candidateStatus === 'PIXEL_CANDIDATE_READY') return 'VISUAL_APPROVAL_CANDIDATE';
  return 'OVERSIZED_RECT_MANUAL_RETRACE';
};

const actionForTier = (tier) => {
  if (tier === 'VISUAL_OFF_SEAT_HARD_FAIL') {
    return 'Manually trace the visible official seat boundary; do not reuse the currentPath or candidatePath.';
  }
  if (tier === 'OVERSIZED_RECT_MANUAL_RETRACE') {
    return 'Replace the oversized legacy rectangle with a minimum 6-point official seat-area polygon.';
  }
  if (tier === 'LABEL_AND_HIT_AREA_REVIEW') {
    return 'Review the corrected label point and top-hit target together before approval.';
  }
  if (tier === 'VISUAL_APPROVAL_CANDIDATE') {
    return 'Use candidatePath as a visual reference only; approve after evidence crop, label, and top-hit review.';
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
  const visualSeed = VISUAL_SEED_BY_BLOCK.get(row.block);
  const visualIssueTier = classifyVisualIssueTier(row);

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
    visualIssueTier,
    visualIssueTierOrder: VISUAL_ISSUE_TIER_ORDER[visualIssueTier],
    visualEvidenceGroup: visualSeed?.visualEvidenceGroup ?? '',
    observedIssue: visualSeed?.observedIssue ?? '',
    isVisualSeed: Boolean(visualSeed),
    operatorAction: actionForTier(visualIssueTier),
    currentPathUsage: 'DO_NOT_COPY_CURRENT_PATH_TO_CORRECTED_PATH',
    candidatePathUsage: 'REFERENCE_ONLY_REQUIRES_OPERATOR_VISUAL_APPROVAL',
    isOffSeatCurrentPath: isOffSeatCurrentPath(row),
    needsLabelAndHitReview: needsLabelAndHitReview(row),
    candidateStatus: row.candidateStatus,
    recommendedAction: row.recommendedAction,
    originalOperatorAction: row.operatorAction,
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
  left.visualIssueTierOrder - right.visualIssueTierOrder
  || left.batchOrder - right.batchOrder
  || String(left.queuePriority).localeCompare(String(right.queuePriority))
  || String(left.block).localeCompare(String(right.block), 'ko')
));
const rowsByBlock = new Map(rows.map((row) => [row.block, row]));
const visualSeedRows = rows.filter((row) => row.isVisualSeed);
const visualObservationNotInSource = VISUAL_SEED_OBSERVATIONS
  .filter((seed) => !rowsByBlock.has(seed.block))
  .map((seed) => seed.block);
const tierCounts = rows.reduce((counts, row) => ({
  ...counts,
  [row.visualIssueTier]: (counts[row.visualIssueTier] ?? 0) + 1,
}), {});
const visualSeedTierCounts = visualSeedRows.reduce((counts, row) => ({
  ...counts,
  [row.visualIssueTier]: (counts[row.visualIssueTier] ?? 0) + 1,
}), {});
const priorityCounts = rows.reduce((counts, row) => ({
  ...counts,
  [row.queuePriority]: (counts[row.queuePriority] ?? 0) + 1,
}), {});
const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');

if (rows.length !== EXPECTED.expectedRows) {
  warnings.push(`VISUAL_ISSUE_QUEUE_ROWS_CHANGED_AFTER_WRITES:${rows.length}:${EXPECTED.expectedRows}`);
}
if (visualSeedRows.length !== EXPECTED.expectedVisualSeedRows) {
  warnings.push(`VISUAL_SEED_ROWS_CHANGED_AFTER_WRITES:${visualSeedRows.length}:${EXPECTED.expectedVisualSeedRows}`);
}

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
const summary = {
  queueVersion: QUEUE_VERSION,
  status,
  productionWriteAllowed: false,
  totalRows: rows.length,
  visualSeedRows: visualSeedRows.length,
  expectedVisualSeedRows: EXPECTED.expectedVisualSeedRows,
  visualObservationRows: VISUAL_SEED_OBSERVATIONS.length,
  visualObservationNotInSource,
  approvedRows: approvedRows.length,
  tierCounts,
  visualSeedTierCounts,
  priorityCounts,
  inputs: INPUT_SPECS.map((spec) => spec.input),
  sourceHandoff: path.relative(frontendRoot, handoffPath),
  blockers,
  warnings,
  approvalRule: 'Candidate paths are visual references only; only operatorDecision=APPROVED rows with correctedPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt can enter production write gates.',
};

const safetyContract = [
  'This visual issue queue is a read-only operator review aid.',
  'It includes the remaining unresolved Daegu operator rows from the source input files; the original baseline was 134 rows.',
  'It never writes the main corrections template.',
  'It never modifies src/data/daeguSeatData.ts.',
  'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
  'Candidate paths remain reference-only and must not be promoted without operator visual approval.',
  'The currentPath must not be copied into correctedPath.',
  'Duplicate candidate rows are deferred until shared boundaries are split per block.',
  'No external crawling, web search, or coordinate inference is allowed.',
];
const report = {
  generatedAt: new Date().toISOString(),
  summary,
  expected: EXPECTED,
  visualSeedObservations: VISUAL_SEED_OBSERVATIONS,
  safetyContract,
  requiredApprovalFields: [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ],
  visualIssueTierOrder: [
    'VISUAL_OFF_SEAT_HARD_FAIL',
    'OVERSIZED_RECT_MANUAL_RETRACE',
    'LABEL_AND_HIT_AREA_REVIEW',
    'VISUAL_APPROVAL_CANDIDATE',
    'DEFER_DUPLICATE_BOUNDARY',
  ],
  rows: sortedRows,
};

const jsonPath = path.join(reportDir, 'daegu-visual-issue-queue.json');
const csvPath = path.join(reportDir, 'daegu-visual-issue-queue.csv');
const markdownPath = path.join(reportDir, 'daegu-visual-issue-queue.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'visualIssueTier',
    'visualEvidenceGroup',
    'observedIssue',
    'isVisualSeed',
    'sourceInput',
    'batchId',
    'blockId',
    'block',
    'name',
    'category',
    'queuePriority',
    'operatorDecision',
    'operatorAction',
    'currentPathUsage',
    'candidatePathUsage',
    'isOffSeatCurrentPath',
    'needsLabelAndHitReview',
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
    row.visualIssueTier,
    row.visualEvidenceGroup,
    row.observedIssue,
    row.isVisualSeed,
    row.sourceInput,
    row.batchId,
    row.blockId,
    row.block,
    row.name,
    row.category,
    row.queuePriority,
    row.operatorDecision,
    row.operatorAction,
    row.currentPathUsage,
    row.candidatePathUsage,
    row.isOffSeatCurrentPath,
    row.needsLabelAndHitReview,
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
  ['tier', 'evidence', 'batch', 'block', 'decision', 'candidate', 'inside', 'coverage', 'duplicate', 'issue'],
  tableRows.map((row) => [
    `\`${row.visualIssueTier}\``,
    row.visualEvidenceGroup || '-',
    `\`${row.batchId}\``,
    `\`${row.block}\``,
    `\`${row.operatorDecision}\``,
    row.candidateStatus,
    row.componentInsidePathRatio === '' ? '-' : row.componentInsidePathRatio,
    row.pathColorCoverageRatio === '' ? '-' : row.pathColorCoverageRatio,
    row.candidateDuplicateGroup || '-',
    row.observedIssue || row.officialFailureReasons || row.riskFlags || '-',
  ]),
);

await fs.writeFile(markdownPath, [
  '# Daegu Visual Issue Queue',
  '',
  `- queue version: \`${QUEUE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  `- total rows: ${summary.totalRows}`,
  `- visual seed rows: ${summary.visualSeedRows}`,
  `- expected visual seed rows: ${summary.expectedVisualSeedRows}`,
  `- visual observation rows: ${summary.visualObservationRows}`,
  `- visual observations not in source input: ${summary.visualObservationNotInSource.join(', ') || 'none'}`,
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
    ['order', 'tier', 'rows', 'visual seed rows', 'operator action'],
    [
      ['1', '`VISUAL_OFF_SEAT_HARD_FAIL`', tierCounts.VISUAL_OFF_SEAT_HARD_FAIL ?? 0, visualSeedTierCounts.VISUAL_OFF_SEAT_HARD_FAIL ?? 0, actionForTier('VISUAL_OFF_SEAT_HARD_FAIL')],
      ['2', '`OVERSIZED_RECT_MANUAL_RETRACE`', tierCounts.OVERSIZED_RECT_MANUAL_RETRACE ?? 0, visualSeedTierCounts.OVERSIZED_RECT_MANUAL_RETRACE ?? 0, actionForTier('OVERSIZED_RECT_MANUAL_RETRACE')],
      ['3', '`LABEL_AND_HIT_AREA_REVIEW`', tierCounts.LABEL_AND_HIT_AREA_REVIEW ?? 0, visualSeedTierCounts.LABEL_AND_HIT_AREA_REVIEW ?? 0, actionForTier('LABEL_AND_HIT_AREA_REVIEW')],
      ['4', '`VISUAL_APPROVAL_CANDIDATE`', tierCounts.VISUAL_APPROVAL_CANDIDATE ?? 0, visualSeedTierCounts.VISUAL_APPROVAL_CANDIDATE ?? 0, actionForTier('VISUAL_APPROVAL_CANDIDATE')],
      ['5', '`DEFER_DUPLICATE_BOUNDARY`', tierCounts.DEFER_DUPLICATE_BOUNDARY ?? 0, visualSeedTierCounts.DEFER_DUPLICATE_BOUNDARY ?? 0, actionForTier('DEFER_DUPLICATE_BOUNDARY')],
    ],
  ),
  '',
  '## Visual Seed Rows',
  '',
  rowTable(sortedRows.filter((row) => row.isVisualSeed)),
  '',
  '## All Rows',
  '',
  rowTable(sortedRows),
  '',
  '## Approval Rule',
  '',
  '- This queue does not approve or write any row.',
  '- Candidate paths remain reference-only until an operator visually approves the row.',
  '- Operator-approved rows must still be copied into the matching operator input file with `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
  '- Production data can change only through the existing validation/preview/apply/write gates.',
].join('\n'), 'utf8');

console.log(JSON.stringify({
  status,
  output: path.relative(frontendRoot, markdownPath),
  totalRows: rows.length,
  visualSeedRows: visualSeedRows.length,
  productionWriteAllowed: summary.productionWriteAllowed,
  tierCounts,
  blockers: blockers.length,
  warnings: warnings.length,
}, null, 2));

if (blockers.length > 0) {
  process.exitCode = 1;
}
