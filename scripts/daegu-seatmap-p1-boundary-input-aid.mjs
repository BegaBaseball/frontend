import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultOutputDir = path.join(defaultReportDir, 'daegu-p1-operator');

const INPUT_AID_VERSION = 'DAEGU_P1_BOUNDARY_INPUT_AID_V1';
const PAIRED_REVIEW_VERSION = 'DAEGU_P1_PAIRED_BOUNDARY_REVIEW_V1';
const ALIGNMENT_STANDARD = 'DAEGU_ALIGNMENT_AUDIT_V1';
const EXPECTED = {
  expectedRows: 5,
  expectedPairedRelabelRows: 2,
  expectedManualSplitRows: 3,
  expectedApprovalRows: 0,
};

const REVIEW_TYPE_DETAILS = {
  PAIRED_RELABEL_BOUNDARY_REVIEW: {
    aidGroup: 'LOCKED_NEIGHBOR_OWNERSHIP_REVIEW',
    operatorFocus: 'Review target plus locked neighbor ownership before drawing any corrected path.',
    approvalRule: 'Do not approve the target row until every affected boundary owner has a non-overlapping corrected boundary and label/top-hit result.',
  },
  MANUAL_NON_OVERLAP_SPLIT_REQUIRED: {
    aidGroup: 'SHARED_MANUAL_SPLIT_REVIEW',
    operatorFocus: 'Trace the target only as part of the shared V1/V2/V3 boundary split with adjacent table blocks visible.',
    approvalRule: 'Do not approve an isolated target row; the shared split must pass label-inside, top-hit, and non-overlap checks together.',
  },
};

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

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

const compactBounds = (bounds) => {
  if (!bounds) return '';
  return `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;
};

const pathPointCount = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g) ?? [];
  return Math.floor(numbers.length / 2);
};

const summarizeAlignmentRow = (row) => {
  if (!row) return null;
  return {
    blockId: row.id,
    block: row.block,
    name: row.name,
    traceStatus: row.traceStatus,
    sourceConfidence: row.sourceConfidence,
    alignmentClass: row.alignmentClass,
    currentPath: row.currentPath,
    currentPathPointCount: pathPointCount(row.currentPath),
    currentPathBounds: row.currentPathBounds,
    labelX: row.labelX,
    labelY: row.labelY,
    labelInsideCurrentPath: row.labelInsideCurrentPath,
    labelTopHitBlock: row.labelTopHitBlock,
    labelTopHitOk: row.labelTopHitOk,
    candidateStatus: row.candidateStatus,
    candidatePath: row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath || '',
    candidatePathPointCount: pathPointCount(row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath),
    candidateBbox: row.candidateBbox,
    candidateCenter: row.candidateCenter,
    componentInsidePathRatio: row.componentInsidePathRatio ?? '',
    pathColorCoverageRatio: row.pathColorCoverageRatio ?? '',
    officialFailureReasons: row.officialFailureReasons ?? [],
  };
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
const pairedReviewPath = path.resolve(
  frontendRoot,
  argValue('--paired-review', path.join(reportDir, 'daegu-p1-operator/daegu-seatmap-p1-paired-boundary-review.json')),
);
const alignmentPath = path.resolve(
  frontendRoot,
  argValue('--alignment', path.join(reportDir, 'daegu-seatmap-alignment-audit.json')),
);

const blockers = [];
const warnings = [];
const pairedReview = await readJson(pairedReviewPath);
const alignmentAudit = await readJson(alignmentPath);
const pairedRows = Array.isArray(pairedReview.rows) ? pairedReview.rows : [];
const alignmentRows = Array.isArray(alignmentAudit.blocks) ? alignmentAudit.blocks : [];
const alignmentByBlock = new Map(alignmentRows.map((row) => [row.block, row]));

if (pairedReview.summary?.reviewVersion !== PAIRED_REVIEW_VERSION) {
  blockers.push(`PAIRED_REVIEW_VERSION_MISMATCH:${pairedReview.summary?.reviewVersion ?? ''}`);
}
if (pairedReview.summary?.productionWriteAllowed !== false) {
  blockers.push('PAIRED_REVIEW_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
}
if (pairedReview.summary?.approvedRows !== 0) {
  blockers.push(`PAIRED_REVIEW_APPROVED_ROWS_PRESENT:${pairedReview.summary?.approvedRows}`);
}
if (alignmentAudit.standard !== ALIGNMENT_STANDARD && alignmentAudit.summary?.standard !== ALIGNMENT_STANDARD) {
  blockers.push(`ALIGNMENT_STANDARD_MISMATCH:${alignmentAudit.standard ?? alignmentAudit.summary?.standard ?? ''}`);
}
if (alignmentAudit.summary?.officialAlignmentFailures !== 0) {
  blockers.push(`ALIGNMENT_OFFICIAL_FAILURES_PRESENT:${alignmentAudit.summary?.officialAlignmentFailures}`);
}

const rows = pairedRows.map((row, index) => {
  const typeDetail = REVIEW_TYPE_DETAILS[row.reviewType];
  const targetAlignment = summarizeAlignmentRow(alignmentByBlock.get(row.block));
  const pairedContext = row.pairedBlocks
    .map((block) => summarizeAlignmentRow(alignmentByBlock.get(block)))
    .filter(Boolean);
  const rowBlockers = [];

  if (!typeDetail) rowBlockers.push('UNKNOWN_REVIEW_TYPE');
  if (!targetAlignment?.currentPath) rowBlockers.push('MISSING_TARGET_CURRENT_PATH');
  if (pairedContext.length !== row.pairedBlocks.length) rowBlockers.push('MISSING_PAIRED_BLOCK_CONTEXT');
  if (row.operatorDecision === 'APPROVED') rowBlockers.push('SOURCE_ROW_ALREADY_APPROVED');
  if (!row.evidenceExists) rowBlockers.push('MISSING_EVIDENCE_CROP');

  blockers.push(...rowBlockers.map((blocker) => `${blocker}:${row.block}`));

  return {
    inputAidVersion: INPUT_AID_VERSION,
    rowNumber: index + 1,
    sourcePairedReview: path.relative(frontendRoot, pairedReviewPath),
    sourceAlignmentAudit: path.relative(frontendRoot, alignmentPath),
    sourceInput: row.sourceInput,
    sourceRowState: row.operatorDecision,
    batchId: row.batchId,
    target: {
      blockId: row.blockId,
      block: row.block,
      name: row.name,
      category: row.category,
      reviewGroup: row.reviewGroup,
      reviewType: row.reviewType,
      aidGroup: typeDetail?.aidGroup ?? 'UNKNOWN_REVIEW_TYPE',
      blockingReason: row.blockingReason,
      observedIssue: row.observedIssue,
      operatorFocus: typeDetail?.operatorFocus ?? '',
      operatorAction: row.operatorAction,
      approvalRule: typeDetail?.approvalRule ?? '',
      evidenceCrop: row.evidenceCrop,
    },
    targetGeometryReference: {
      currentPath: targetAlignment?.currentPath ?? '',
      currentPathPointCount: targetAlignment?.currentPathPointCount ?? 0,
      currentPathBounds: targetAlignment?.currentPathBounds ?? null,
      candidatePath: targetAlignment?.candidatePath ?? '',
      candidatePathPointCount: targetAlignment?.candidatePathPointCount ?? 0,
      candidateBbox: targetAlignment?.candidateBbox ?? null,
      candidateStatus: targetAlignment?.candidateStatus ?? row.candidateStatus,
      componentInsidePathRatio: targetAlignment?.componentInsidePathRatio ?? '',
      pathColorCoverageRatio: targetAlignment?.pathColorCoverageRatio ?? '',
      labelX: targetAlignment?.labelX ?? '',
      labelY: targetAlignment?.labelY ?? '',
      labelInsideCurrentPath: targetAlignment?.labelInsideCurrentPath ?? '',
      labelTopHitBlock: targetAlignment?.labelTopHitBlock ?? '',
      labelTopHitOk: targetAlignment?.labelTopHitOk ?? '',
    },
    pairedGeometryReference: pairedContext.map((paired) => ({
      blockId: paired.blockId,
      block: paired.block,
      name: paired.name,
      traceStatus: paired.traceStatus,
      alignmentClass: paired.alignmentClass,
      currentPath: paired.currentPath,
      currentPathPointCount: paired.currentPathPointCount,
      currentPathBounds: paired.currentPathBounds,
      labelX: paired.labelX,
      labelY: paired.labelY,
      labelTopHitBlock: paired.labelTopHitBlock,
      labelTopHitOk: paired.labelTopHitOk,
    })),
    inputInstructions: [
      'Use this row only as operator drawing guidance.',
      'Open the evidence crop and paired block context before drawing.',
      'Do not copy currentPath into correctedPath.',
      'Do not copy candidatePath into correctedPath.',
      'When the operator approves a final boundary, edit only the matching source input row and then run the P1 gate.',
    ],
    requiredSourceInputFieldsAfterApproval: [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ],
    rowBlockers,
    readyForProductionWrite: false,
  };
});

const pairedRelabelRows = rows.filter((row) => row.target.reviewType === 'PAIRED_RELABEL_BOUNDARY_REVIEW');
const manualSplitRows = rows.filter((row) => row.target.reviewType === 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED');
const approvalRows = rows.filter((row) => row.sourceRowState === 'APPROVED');

if (rows.length !== EXPECTED.expectedRows) warnings.push(`P1_BOUNDARY_INPUT_AID_ROWS_CHANGED:${rows.length}:${EXPECTED.expectedRows}`);
if (pairedRelabelRows.length !== EXPECTED.expectedPairedRelabelRows) {
  warnings.push(`P1_BOUNDARY_INPUT_AID_PAIRED_ROWS_CHANGED:${pairedRelabelRows.length}:${EXPECTED.expectedPairedRelabelRows}`);
}
if (manualSplitRows.length !== EXPECTED.expectedManualSplitRows) {
  warnings.push(`P1_BOUNDARY_INPUT_AID_MANUAL_SPLIT_ROWS_CHANGED:${manualSplitRows.length}:${EXPECTED.expectedManualSplitRows}`);
}
if (approvalRows.length !== EXPECTED.expectedApprovalRows) {
  blockers.push(`P1_BOUNDARY_INPUT_AID_APPROVAL_ROWS_PRESENT:${approvalRows.map((row) => row.target.block).join(' ')}`);
}

const safetyContract = [
  'This P1 boundary input aid is read-only.',
  'It is not the production corrections template and contains no operatorDecision column.',
  'It never writes the main corrections template.',
  'It never modifies src/data/daeguSeatData.ts.',
  'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
  'Rows in this aid must not be approved as isolated single-row corrections.',
  'The currentPath must not be copied into correctedPath.',
  'Candidate paths are reference-only and must not be copied into correctedPath.',
  'Production data can change only after the matching source input rows pass p1-operator-validate, p1-operator-import, p1-operator-readiness, and the production write guard.',
  'No external crawling, web search, or coordinate inference is allowed.',
];

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
const summary = {
  inputAidVersion: INPUT_AID_VERSION,
  status,
  productionWriteAllowed: false,
  sourcePairedReviewVersion: PAIRED_REVIEW_VERSION,
  sourceAlignmentStandard: ALIGNMENT_STANDARD,
  sourcePairedReview: path.relative(frontendRoot, pairedReviewPath),
  sourceAlignmentAudit: path.relative(frontendRoot, alignmentPath),
  totalRows: rows.length,
  pairedRelabelRows: pairedRelabelRows.length,
  manualSplitRows: manualSplitRows.length,
  approvalRows: approvalRows.length,
  writesOperatorDecision: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings,
};

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

await fs.mkdir(outputDir, { recursive: true });

const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-input-aid.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-input-aid.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-input-aid.md');

await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'sourcePairedReview',
    'sourceAlignmentAudit',
    'sourceInput',
    'sourceRowState',
    'batchId',
    'blockId',
    'block',
    'name',
    'reviewGroup',
    'reviewType',
    'aidGroup',
    'blockingReason',
    'pairedBlocks',
    'targetCurrentBounds',
    'targetCandidateBbox',
    'targetCandidateStatus',
    'targetComponentInsideRatio',
    'targetPathColorCoverageRatio',
    'targetLabelTopHitBlock',
    'evidenceCrop',
    'operatorFocus',
    'approvalRule',
    'rowBlockers',
  ],
  ...rows.map((row) => [
    row.sourcePairedReview,
    row.sourceAlignmentAudit,
    row.sourceInput,
    row.sourceRowState,
    row.batchId,
    row.target.blockId,
    row.target.block,
    row.target.name,
    row.target.reviewGroup,
    row.target.reviewType,
    row.target.aidGroup,
    row.target.blockingReason,
    row.pairedGeometryReference.map((paired) => paired.block).join(' '),
    compactBounds(row.targetGeometryReference.currentPathBounds),
    compactBounds(row.targetGeometryReference.candidateBbox),
    row.targetGeometryReference.candidateStatus,
    row.targetGeometryReference.componentInsidePathRatio,
    row.targetGeometryReference.pathColorCoverageRatio,
    row.targetGeometryReference.labelTopHitBlock,
    row.target.evidenceCrop,
    row.target.operatorFocus,
    row.target.approvalRule,
    row.rowBlockers.join('; '),
  ]),
]);

const rowTable = markdownTable(
  ['block', 'type', 'aid group', 'paired blocks', 'candidate', 'inside', 'coverage', 'operator focus', 'evidence'],
  rows.map((row) => [
    `\`${row.target.block}\``,
    `\`${row.target.reviewType}\``,
    `\`${row.target.aidGroup}\``,
    row.pairedGeometryReference.map((paired) => `\`${paired.block}\``).join(' '),
    row.targetGeometryReference.candidateStatus,
    row.targetGeometryReference.componentInsidePathRatio === '' ? '-' : row.targetGeometryReference.componentInsidePathRatio,
    row.targetGeometryReference.pathColorCoverageRatio === '' ? '-' : row.targetGeometryReference.pathColorCoverageRatio,
    row.target.operatorFocus,
    row.target.evidenceCrop ? `[crop](${path.relative(outputDir, path.join(frontendRoot, row.target.evidenceCrop))})` : '-',
  ]),
);

const geometryTable = markdownTable(
  ['block', 'current bounds', 'candidate bbox', 'current points', 'candidate points', 'label top-hit', 'rule'],
  rows.map((row) => [
    `\`${row.target.block}\``,
    compactBounds(row.targetGeometryReference.currentPathBounds),
    compactBounds(row.targetGeometryReference.candidateBbox),
    row.targetGeometryReference.currentPathPointCount,
    row.targetGeometryReference.candidatePathPointCount,
    row.targetGeometryReference.labelTopHitBlock || '-',
    row.target.approvalRule,
  ]),
);

const pairedContextTable = markdownTable(
  ['target', 'paired block', 'status', 'class', 'bounds', 'label top-hit'],
  rows.flatMap((row) => row.pairedGeometryReference.map((paired) => [
    `\`${row.target.block}\``,
    `\`${paired.block}\``,
    paired.traceStatus,
    paired.alignmentClass,
    compactBounds(paired.currentPathBounds),
    paired.labelTopHitBlock ?? '-',
  ])),
);

await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary Input Aid',
  '',
  `- input aid version: \`${INPUT_AID_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  `- writes operator decision: ${summary.writesOperatorDecision}`,
  `- writes corrections template: ${summary.writesCorrectionsTemplate}`,
  `- writes production data: ${summary.writesProductionData}`,
  `- source paired review: \`${summary.sourcePairedReview}\``,
  `- source alignment audit: \`${summary.sourceAlignmentAudit}\``,
  `- total rows: ${summary.totalRows}`,
  `- paired relabel rows: ${summary.pairedRelabelRows}`,
  `- manual split rows: ${summary.manualSplitRows}`,
  `- approval rows: ${summary.approvalRows}`,
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
  '## Geometry References',
  '',
  geometryTable,
  '',
  '## Paired Context',
  '',
  pairedContextTable,
  '',
  '## Operator Use',
  '',
  '- This file is an input aid only; edit the matching P1 source input row after manual review.',
  '- Required source input fields after approval are `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
  '- Do not use this aid as evidence that a row has been approved.',
  '- After source input edits, run `npm run stadium:daegu:p1-operator-prewrite-gate` before any write-template or production write step.',
].join('\n'), 'utf8');

console.log(JSON.stringify({
  status,
  output: path.relative(frontendRoot, markdownPath),
  totalRows: rows.length,
  pairedRelabelRows: pairedRelabelRows.length,
  manualSplitRows: manualSplitRows.length,
  approvalRows: approvalRows.length,
  productionWriteAllowed: false,
  blockers: blockers.length,
  warnings: warnings.length,
}, null, 2));

if (blockers.length > 0) {
  process.exitCode = 1;
}
