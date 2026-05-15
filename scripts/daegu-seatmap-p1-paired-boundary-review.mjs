import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultOutputDir = path.join(defaultReportDir, 'daegu-p1-operator');

const REVIEW_VERSION = 'DAEGU_P1_PAIRED_BOUNDARY_REVIEW_V1';
const VISUAL_WORKSET_VERSION = 'DAEGU_VISUAL_OFF_SEAT_WORKSET_V1';
const ALIGNMENT_STANDARD = 'DAEGU_ALIGNMENT_AUDIT_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const EXPECTED = {
  expectedRows: 5,
  expectedPairedRelabelRows: 2,
  expectedManualSplitRows: 3,
  expectedApprovedRows: 0,
};

const REVIEW_SPECS = {
  'T1-1': {
    reviewGroup: 'P1_FIRST_TABLE_T1_1_T1_2_TC_1',
    reviewType: 'PAIRED_RELABEL_BOUNDARY_REVIEW',
    pairedBlocks: ['T1-2', 'TC-1'],
    blockingReason: 'LOCKED_NEIGHBOR_OWNS_VISIBLE_TABLE_AREA',
    observedIssue: 'The visible cyan table area near T1-1 is already covered by locked T1-2/TC-1 geometry, so approving T1-1 alone fails top-hit ownership.',
    operatorAction: 'Review T1-1 together with T1-2 and TC-1. Approve only after every affected owner has a non-overlapping corrected boundary and label.',
  },
  'T3-2': {
    reviewGroup: 'P1_THIRD_TABLE_T3_2_T3_3_TC_3_T3_1',
    reviewType: 'PAIRED_RELABEL_BOUNDARY_REVIEW',
    pairedBlocks: ['T3-3', 'T3-4', 'TC-3', 'T3-1'],
    blockingReason: 'LOCKED_NEIGHBOR_OWNS_VISIBLE_TABLE_AREA',
    observedIssue: 'The visible dark-red table area for T3-2 is already represented by locked T3-3/T3-4 side-by-side geometry and adjacent TC/T3 geometry.',
    operatorAction: 'Review T3-2 with the locked T3-3/T3-4/TC-3/T3-1 neighborhood. Do not approve T3-2 as a single-row correction.',
  },
  V1: {
    reviewGroup: 'P1_CENTER_TABLE_V_SPLIT',
    reviewType: 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED',
    pairedBlocks: ['V2', 'TC-2', 'TC-1'],
    blockingReason: 'NARROW_DIAGONAL_COMPONENT_NEEDS_SHARED_BOUNDARY',
    observedIssue: 'V1 is a small diagonal olive component between V2 and central table blocks; current/candidate geometry has low component and color coverage.',
    operatorAction: 'Trace V1 only as part of a V1/V2/V3 plus TC boundary split. Keep V1 NEEDS_RETRACE until the shared boundary is reviewed.',
  },
  V2: {
    reviewGroup: 'P1_CENTER_TABLE_V_SPLIT',
    reviewType: 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED',
    pairedBlocks: ['V1', 'V3', 'T3-3', 'T3-2'],
    blockingReason: 'CANDIDATE_COMPONENT_COLLIDES_WITH_T3_TABLE_BLOCKS',
    observedIssue: 'V2 candidate extraction lands on the nearby dark-red T3 table component instead of the narrow olive V component, so candidate geometry is not a safe source.',
    operatorAction: 'Trace V2 manually with V1/V3 and adjacent T3 table blocks visible. Do not copy the candidate path.',
  },
  V3: {
    reviewGroup: 'P1_CENTER_TABLE_V_SPLIT',
    reviewType: 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED',
    pairedBlocks: ['V1', 'V2', 'T3-3', 'T3-1'],
    blockingReason: 'CANDIDATE_COMPONENT_COLLIDES_WITH_T3_TABLE_BLOCKS',
    observedIssue: 'V3 candidate extraction overlaps the nearby dark-red T3 table component and cannot distinguish the small olive V component.',
    operatorAction: 'Trace V3 manually with V1/V2 and adjacent T3 table blocks visible. Do not copy the candidate path.',
  },
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

const compactBounds = (bounds) => {
  if (!bounds) return '';
  return `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;
};

const summarizeAlignmentBlock = (row) => {
  if (!row) return null;
  return {
    blockId: row.id,
    block: row.block,
    name: row.name,
    traceStatus: row.traceStatus,
    sourceConfidence: row.sourceConfidence,
    alignmentClass: row.alignmentClass,
    currentPathBounds: row.currentPathBounds,
    candidateStatus: row.candidateStatus,
    candidateBbox: row.candidateBbox,
    candidateCenter: row.candidateCenter,
    labelX: row.labelX,
    labelY: row.labelY,
    labelTopHitBlock: row.labelTopHitBlock,
    labelTopHitOk: row.labelTopHitOk,
    componentInsidePathRatio: row.componentInsidePathRatio ?? '',
    pathColorCoverageRatio: row.pathColorCoverageRatio ?? '',
    officialFailureReasons: row.officialFailureReasons ?? [],
  };
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
const visualWorksetPath = path.resolve(
  frontendRoot,
  argValue('--visual-workset', path.join(reportDir, 'daegu-visual-off-seat-workset.json')),
);
const alignmentPath = path.resolve(
  frontendRoot,
  argValue('--alignment', path.join(reportDir, 'daegu-seatmap-alignment-audit.json')),
);

const blockers = [];
const warnings = [];
const visualWorkset = await readJson(visualWorksetPath);
const alignmentAudit = await readJson(alignmentPath);
const worksetRows = Array.isArray(visualWorkset.rows) ? visualWorkset.rows : [];
const alignmentRows = Array.isArray(alignmentAudit.blocks) ? alignmentAudit.blocks : [];
const alignmentByBlock = new Map(alignmentRows.map((row) => [row.block, row]));

if (visualWorkset.summary?.worksetVersion !== VISUAL_WORKSET_VERSION) {
  blockers.push(`VISUAL_WORKSET_VERSION_MISMATCH:${visualWorkset.summary?.worksetVersion ?? ''}`);
}
if (alignmentAudit.standard !== ALIGNMENT_STANDARD && alignmentAudit.summary?.standard !== ALIGNMENT_STANDARD) {
  blockers.push(`ALIGNMENT_STANDARD_MISMATCH:${alignmentAudit.standard ?? alignmentAudit.summary?.standard ?? ''}`);
}
if (visualWorkset.summary?.productionWriteAllowed !== false) {
  blockers.push('VISUAL_WORKSET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
}
if (alignmentAudit.summary?.officialAlignmentFailures !== 0) {
  blockers.push(`ALIGNMENT_OFFICIAL_FAILURES_PRESENT:${alignmentAudit.summary?.officialAlignmentFailures}`);
}

const targetRows = worksetRows
  .filter((row) => row.batchId === TARGET_BATCH_ID)
  .sort((left, right) => String(left.block).localeCompare(String(right.block), 'ko'));
const expectedBlocks = Object.keys(REVIEW_SPECS);
const targetBlocks = targetRows.map((row) => row.block);
const missingExpectedBlocks = expectedBlocks.filter((block) => !targetBlocks.includes(block));
const unmappedRows = targetRows.filter((row) => !REVIEW_SPECS[row.block]);
if (missingExpectedBlocks.length > 0) {
  warnings.push(`P1_PAIRED_REVIEW_EXPECTED_BLOCKS_CHANGED:${missingExpectedBlocks.join(' ')}`);
}
if (unmappedRows.length > 0) {
  blockers.push(`P1_PAIRED_REVIEW_UNMAPPED_ROWS:${unmappedRows.map((row) => row.block).join(' ')}`);
}

const rows = targetRows
  .filter((row) => REVIEW_SPECS[row.block])
  .map((row) => {
    const spec = REVIEW_SPECS[row.block];
    const evidenceAbsolutePath = absoluteFromFrontendRoot(row.evidenceCrop);
    const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
    const targetAlignment = summarizeAlignmentBlock(alignmentByBlock.get(row.block));
    const pairedBlocks = spec.pairedBlocks
      .map((block) => summarizeAlignmentBlock(alignmentByBlock.get(block)))
      .filter(Boolean);
    const lockedPairedBlocks = pairedBlocks.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED');
    const rowBlockers = [];

    if (row.operatorDecision === 'APPROVED') {
      rowBlockers.push('PAIR_REVIEW_ROW_MUST_NOT_BE_APPROVED');
    }
    if (!evidenceExists) {
      rowBlockers.push('MISSING_EVIDENCE_CROP');
    }
    if (lockedPairedBlocks.length === 0) {
      rowBlockers.push('NO_LOCKED_NEIGHBOR_CONTEXT');
    }
    blockers.push(...rowBlockers.map((blocker) => `${blocker}:${row.block}`));

    return {
      reviewVersion: REVIEW_VERSION,
      sourceWorkset: path.relative(frontendRoot, visualWorksetPath),
      sourceAlignmentAudit: path.relative(frontendRoot, alignmentPath),
      sourceInput: row.sourceInput,
      batchId: row.batchId,
      blockId: row.blockId,
      block: row.block,
      name: row.name,
      category: row.category,
      queuePriority: row.queuePriority,
      operatorDecision: row.operatorDecision,
      reviewGroup: spec.reviewGroup,
      reviewType: spec.reviewType,
      blockingReason: spec.blockingReason,
      observedIssue: spec.observedIssue,
      operatorAction: spec.operatorAction,
      pairedBlocks: spec.pairedBlocks,
      lockedPairedBlocks: lockedPairedBlocks.map((block) => block.block),
      targetAlignment,
      pairedBlockDetails: pairedBlocks,
      currentPathUsage: 'DO_NOT_COPY_CURRENT_PATH_TO_CORRECTED_PATH',
      candidatePathUsage: 'REFERENCE_ONLY_DO_NOT_COPY_TO_CORRECTED_PATH',
      candidateStatus: row.candidateStatus,
      evidenceCrop: row.evidenceCrop,
      evidenceExists,
      componentInsidePathRatio: row.componentInsidePathRatio,
      pathColorCoverageRatio: row.pathColorCoverageRatio,
      officialFailureReasons: row.officialFailureReasons,
      riskFlags: row.riskFlags,
      operatorNote: row.operatorNote ?? '',
      rowBlockers,
      readyForProductionWrite: false,
    };
  });

const pairedRelabelRows = rows.filter((row) => row.reviewType === 'PAIRED_RELABEL_BOUNDARY_REVIEW');
const manualSplitRows = rows.filter((row) => row.reviewType === 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED');
const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');

if (rows.length !== EXPECTED.expectedRows) warnings.push(`P1_PAIRED_REVIEW_ROWS_CHANGED:${rows.length}:${EXPECTED.expectedRows}`);
if (pairedRelabelRows.length !== EXPECTED.expectedPairedRelabelRows) {
  warnings.push(`P1_PAIRED_RELABEL_ROWS_CHANGED:${pairedRelabelRows.length}:${EXPECTED.expectedPairedRelabelRows}`);
}
if (manualSplitRows.length !== EXPECTED.expectedManualSplitRows) {
  warnings.push(`P1_MANUAL_SPLIT_ROWS_CHANGED:${manualSplitRows.length}:${EXPECTED.expectedManualSplitRows}`);
}
if (approvedRows.length !== EXPECTED.expectedApprovedRows) {
  blockers.push(`P1_PAIRED_REVIEW_APPROVED_ROWS_PRESENT:${approvedRows.map((row) => row.block).join(' ')}`);
}

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
const summary = {
  reviewVersion: REVIEW_VERSION,
  status,
  productionWriteAllowed: false,
  sourceWorksetVersion: VISUAL_WORKSET_VERSION,
  sourceAlignmentStandard: ALIGNMENT_STANDARD,
  sourceWorkset: path.relative(frontendRoot, visualWorksetPath),
  sourceAlignmentAudit: path.relative(frontendRoot, alignmentPath),
  targetBatchId: TARGET_BATCH_ID,
  totalRows: rows.length,
  pairedRelabelRows: pairedRelabelRows.length,
  manualSplitRows: manualSplitRows.length,
  approvedRows: approvedRows.length,
  lockedNeighborReviewRows: rows.filter((row) => row.lockedPairedBlocks.length > 0).length,
  blockers,
  warnings,
};

const safetyContract = [
  'This P1 paired boundary review is read-only.',
  'It never writes the main corrections template.',
  'It never modifies src/data/daeguSeatData.ts.',
  'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
  'Rows in this report must not be approved as single-row corrections.',
  'The currentPath must not be copied into correctedPath.',
  'Candidate paths are reference-only and must not be copied into correctedPath.',
  'Production data can change only after paired boundaries pass the existing P1 validation/import/readiness/write gates.',
  'No external crawling, web search, or coordinate inference is allowed.',
];

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  expected: EXPECTED,
  safetyContract,
  nextGateCommands: [
    'npm run stadium:daegu:p1-operator-prewrite-gate',
    'npm run stadium:daegu:p1-operator-import:write-template',
    'npm run stadium:daegu:operator-corrections-write',
  ],
  rows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-boundary-review.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-boundary-review.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-boundary-review.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'sourceWorkset',
    'sourceAlignmentAudit',
    'sourceInput',
    'batchId',
    'blockId',
    'block',
    'name',
    'reviewGroup',
    'reviewType',
    'blockingReason',
    'observedIssue',
    'operatorAction',
    'pairedBlocks',
    'lockedPairedBlocks',
    'operatorDecision',
    'candidateStatus',
    'componentInsidePathRatio',
    'pathColorCoverageRatio',
    'officialFailureReasons',
    'riskFlags',
    'targetBounds',
    'targetCandidateBbox',
    'targetLabelTopHitBlock',
    'evidenceCrop',
    'evidenceExists',
    'operatorNote',
    'rowBlockers',
  ],
  ...rows.map((row) => [
    row.sourceWorkset,
    row.sourceAlignmentAudit,
    row.sourceInput,
    row.batchId,
    row.blockId,
    row.block,
    row.name,
    row.reviewGroup,
    row.reviewType,
    row.blockingReason,
    row.observedIssue,
    row.operatorAction,
    row.pairedBlocks.join(' '),
    row.lockedPairedBlocks.join(' '),
    row.operatorDecision,
    row.candidateStatus,
    row.componentInsidePathRatio,
    row.pathColorCoverageRatio,
    row.officialFailureReasons,
    row.riskFlags,
    compactBounds(row.targetAlignment?.currentPathBounds),
    compactBounds(row.targetAlignment?.candidateBbox),
    row.targetAlignment?.labelTopHitBlock ?? '',
    row.evidenceCrop,
    row.evidenceExists,
    row.operatorNote,
    row.rowBlockers.join('; '),
  ]),
]);

const rowTable = markdownTable(
  ['block', 'type', 'paired blocks', 'locked neighbors', 'candidate', 'inside', 'coverage', 'action', 'evidence'],
  rows.map((row) => [
    `\`${row.block}\``,
    `\`${row.reviewType}\``,
    row.pairedBlocks.map((block) => `\`${block}\``).join(' '),
    row.lockedPairedBlocks.map((block) => `\`${block}\``).join(' '),
    row.candidateStatus,
    row.componentInsidePathRatio === '' ? '-' : row.componentInsidePathRatio,
    row.pathColorCoverageRatio === '' ? '-' : row.pathColorCoverageRatio,
    row.operatorAction,
    row.evidenceCrop ? `[crop](${path.relative(outputDir, path.join(frontendRoot, row.evidenceCrop))})` : '-',
  ]),
);

const pairedDetailTable = markdownTable(
  ['target', 'paired block', 'status', 'class', 'bounds', 'candidate bbox', 'label top-hit'],
  rows.flatMap((row) => row.pairedBlockDetails.map((paired) => [
    `\`${row.block}\``,
    `\`${paired.block}\``,
    paired.traceStatus,
    paired.alignmentClass,
    compactBounds(paired.currentPathBounds),
    compactBounds(paired.candidateBbox),
    paired.labelTopHitBlock ?? '-',
  ])),
);

await fs.writeFile(markdownPath, [
  '# Daegu P1 Paired Boundary Review',
  '',
  `- review version: \`${REVIEW_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  `- source workset: \`${summary.sourceWorkset}\``,
  `- source alignment audit: \`${summary.sourceAlignmentAudit}\``,
  `- total rows: ${summary.totalRows}`,
  `- paired relabel rows: ${summary.pairedRelabelRows}`,
  `- manual split rows: ${summary.manualSplitRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- JSON output: \`${path.relative(frontendRoot, jsonPath)}\``,
  `- CSV output: \`${path.relative(frontendRoot, csvPath)}\``,
  '',
  '## Safety',
  '',
  ...safetyContract.map((rule) => `- ${rule}`),
  '',
  '## Rows',
  '',
  rowTable,
  '',
  '## Paired Block Context',
  '',
  pairedDetailTable,
  '',
  '## Operator Rule',
  '',
  '- Do not set these rows to `APPROVED` as isolated single-row corrections.',
  '- For `PAIRED_RELABEL_BOUNDARY_REVIEW`, the affected locked neighbor ownership must be reviewed with the target block.',
  '- For `MANUAL_NON_OVERLAP_SPLIT_REQUIRED`, manually trace the small V split with adjacent table blocks visible.',
  '- Any final approval must still pass `p1-operator-validate`, `p1-operator-import`, `p1-operator-readiness`, and the production write guard.',
].join('\n'), 'utf8');

console.log(JSON.stringify({
  status,
  output: path.relative(frontendRoot, markdownPath),
  totalRows: rows.length,
  pairedRelabelRows: pairedRelabelRows.length,
  manualSplitRows: manualSplitRows.length,
  approvedRows: approvedRows.length,
  productionWriteAllowed: false,
  blockers: blockers.length,
  warnings: warnings.length,
}, null, 2));

if (blockers.length > 0) {
  process.exitCode = 1;
}
