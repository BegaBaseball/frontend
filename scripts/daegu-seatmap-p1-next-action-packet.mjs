import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

const PACKET_VERSION = 'DAEGU_P1_NEXT_ACTION_PACKET_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const EXPECTED = {
  expectedRows: 12,
  boundaryAidRows: 1,
  pairedRelabelRows: 2,
  manualSplitRows: 3,
  singleCorrectedPathRows: 2,
  sharedCandidateBoundaryRows: 9,
  approvedRows: 1,
};

const STAGES = {
  PAIR_BOUNDARY_FIRST: {
    order: 1,
    label: 'PAIR_BOUNDARY_FIRST',
    acceptance: 'Approve only after paired/shared boundary context passes non-overlap and label top-hit.',
  },
  SINGLE_CORRECTED_PATH: {
    order: 2,
    label: 'SINGLE_CORRECTED_PATH',
    acceptance: 'Approve after correctedPath and corrected label point pass validation for this block.',
  },
  DUPLICATE_CANDIDATE_SPLIT: {
    order: 3,
    label: 'DUPLICATE_CANDIDATE_SPLIT',
    acceptance: 'Approve after duplicate candidate peers are split into separate block-specific boundaries.',
  },
};

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const readOptionalJson = async (filePath) => {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
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

const splitList = (value) => String(value ?? '')
  .split(/\s+/)
  .map((item) => item.trim())
  .filter(Boolean);

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const summarizeBoundaryAid = (aidRow) => {
  if (!aidRow) return '';
  const target = aidRow.target ?? {};
  const pairedBlocks = Array.isArray(aidRow.pairedGeometryReference)
    ? aidRow.pairedGeometryReference.map((row) => row.block).filter(Boolean).join(' ')
    : '';
  return [
    target.reviewType,
    target.blockingReason,
    pairedBlocks ? `paired=${pairedBlocks}` : '',
  ].filter(Boolean).join('; ');
};

const classifyRow = (row, boundaryAidByBlockId) => {
  if (boundaryAidByBlockId.has(row.blockId)) return STAGES.PAIR_BOUNDARY_FIRST;
  if (['OPERATOR_CORRECTED_PATH_REQUIRED', 'OPERATOR_MANUAL_TRACE_REQUIRED'].includes(row.operatorAction)) {
    return STAGES.SINGLE_CORRECTED_PATH;
  }
  return STAGES.DUPLICATE_CANDIDATE_SPLIT;
};

const operatorFocusFor = (row, stage, boundaryAidRow) => {
  if (stage.label === 'PAIR_BOUNDARY_FIRST') {
    return boundaryAidRow?.target?.operatorFocus
      ?? 'Resolve paired/manual boundary ownership before editing the matching source input row.';
  }
  if (stage.label === 'SINGLE_CORRECTED_PATH') {
    return 'Trace a corrected polygon from the official PNG evidence crop; no candidate path is acceptable as-is.';
  }
  return 'Use the duplicate candidate only as evidence, then draw a separate block-specific boundary.';
};

const operatorActionFor = (row, stage, boundaryAidRow) => {
  if (stage.label === 'PAIR_BOUNDARY_FIRST') {
    return boundaryAidRow?.target?.operatorAction
      ?? 'Review all affected boundary owners together before approval.';
  }
  if (stage.label === 'SINGLE_CORRECTED_PATH') {
    return 'Fill correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt on the matching P1 source input row.';
  }
  return 'Split the shared duplicate candidate boundary and approve only the corrected block-specific polygon.';
};

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const inputPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');
const decisionPacketPath = path.join(p1ReportDir, 'daegu-seatmap-p1-decision-packet.json');
const boundaryAidPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-input-aid.json');
const readinessPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-readiness.json');

const input = await readJson(inputPath);
const decisionPacket = await readJson(decisionPacketPath);
const boundaryAid = await readJson(boundaryAidPath);
const readiness = await readOptionalJson(readinessPath);

const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const decisionRows = Array.isArray(decisionPacket.rows) ? decisionPacket.rows : [];
const boundaryAidRows = Array.isArray(boundaryAid.rows) ? boundaryAid.rows : [];
const decisionByBlockId = new Map(decisionRows.map((row) => [row.blockId, row]));
const boundaryAidByBlockId = new Map(boundaryAidRows.map((row) => [row.target?.blockId, row]).filter(([blockId]) => blockId));

const blockers = [];
const warnings = [];

if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P1_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (input.productionWriteAllowed !== false) blockers.push('P1_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (inputRows.length !== EXPECTED.expectedRows) blockers.push(`P1_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.expectedRows}`);
if (decisionPacket.summary?.packetVersion !== 'DAEGU_P1_DECISION_PACKET_V1') {
  blockers.push(`P1_DECISION_PACKET_VERSION_MISMATCH:${decisionPacket.summary?.packetVersion ?? ''}`);
}
if (boundaryAid.summary?.inputAidVersion !== 'DAEGU_P1_BOUNDARY_INPUT_AID_V1') {
  blockers.push(`P1_BOUNDARY_AID_VERSION_MISMATCH:${boundaryAid.summary?.inputAidVersion ?? ''}`);
}
if (!readiness) {
  warnings.push('P1_READINESS_REPORT_MISSING_NEXT_ACTION_BOOTSTRAP');
} else if (readiness.summary?.readinessVersion !== 'DAEGU_P1_OPERATOR_READINESS_V1') {
  blockers.push(`P1_READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
}
if (readiness?.summary?.readyForTemplateImport === true) {
  warnings.push('P1_READY_FOR_TEMPLATE_IMPORT_PRESENT_REVIEW_BEFORE_USING_NEXT_ACTION_PACKET');
}

const rows = inputRows.map((row) => {
  const decisionRow = decisionByBlockId.get(row.blockId) ?? {};
  const boundaryAidRow = boundaryAidByBlockId.get(row.blockId);
  const stage = classifyRow(row, boundaryAidByBlockId);
  const decision = normalizeDecision(row.operatorDecision);
  const duplicatePeerBlocks = splitList(row.candidateDuplicateIds)
    .filter((blockId) => blockId !== row.blockId)
    .map((blockId) => inputRows.find((candidate) => candidate.blockId === blockId)?.block ?? blockId)
    .join(' ');
  const pairedBlocks = Array.isArray(boundaryAidRow?.pairedGeometryReference)
    ? boundaryAidRow.pairedGeometryReference.map((pairedRow) => pairedRow.block).filter(Boolean).join(' ')
    : '';

  return {
    nextActionPacketVersion: PACKET_VERSION,
    stage: stage.label,
    stageOrder: stage.order,
    blockId: row.blockId,
    block: row.block,
    name: row.name,
    category: row.category,
    decision,
    recommendedAction: row.recommendedAction,
    operatorAction: operatorActionFor(row, stage, boundaryAidRow),
    operatorFocus: operatorFocusFor(row, stage, boundaryAidRow),
    acceptance: stage.acceptance,
    evidenceCrop: row.evidenceCrop,
    sourceInput: path.relative(frontendRoot, inputPath),
    boundaryAidSummary: summarizeBoundaryAid(boundaryAidRow),
    duplicateGroup: row.candidateDuplicateGroup || '',
    duplicatePeerBlocks,
    pairedBlocks,
    officialFailureReasons: row.officialFailureReasons || decisionRow.officialFailureReasons || '',
    riskFlags: row.riskFlags || decisionRow.riskFlags || '',
    requiredApprovalFields: [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ],
  };
}).sort((a, b) => a.stageOrder - b.stageOrder || a.block.localeCompare(b.block));

const countByStage = rows.reduce((counts, row) => ({
  ...counts,
  [row.stage]: (counts[row.stage] ?? 0) + 1,
}), {});

const approvedRows = rows.filter((row) => row.decision === 'APPROVED');
const expectedChecks = [
  ['P1_NEXT_ACTION_EXPECTED_ROWS', rows.length, EXPECTED.expectedRows],
  ['P1_NEXT_ACTION_BOUNDARY_AID_ROWS', countByStage.PAIR_BOUNDARY_FIRST ?? 0, EXPECTED.boundaryAidRows],
  ['P1_NEXT_ACTION_SINGLE_CORRECTED_PATH_ROWS', countByStage.SINGLE_CORRECTED_PATH ?? 0, EXPECTED.singleCorrectedPathRows],
  ['P1_NEXT_ACTION_SHARED_CANDIDATE_BOUNDARY_ROWS', countByStage.DUPLICATE_CANDIDATE_SPLIT ?? 0, EXPECTED.sharedCandidateBoundaryRows],
  ['P1_NEXT_ACTION_APPROVED_ROWS', approvedRows.length, EXPECTED.approvedRows],
];

expectedChecks.forEach(([label, actual, expected]) => {
  if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
});

if (boundaryAid.summary?.pairedRelabelRows !== EXPECTED.pairedRelabelRows) {
  blockers.push(`P1_NEXT_ACTION_PAIRED_RELABEL_ROWS:${boundaryAid.summary?.pairedRelabelRows ?? ''}!=${EXPECTED.pairedRelabelRows}`);
}
if (boundaryAid.summary?.manualSplitRows !== EXPECTED.manualSplitRows) {
  blockers.push(`P1_NEXT_ACTION_MANUAL_SPLIT_ROWS:${boundaryAid.summary?.manualSplitRows ?? ''}!=${EXPECTED.manualSplitRows}`);
}

const summary = {
  packetVersion: PACKET_VERSION,
  status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
  targetBatchId: TARGET_BATCH_ID,
  expectedRows: EXPECTED.expectedRows,
  totalRows: rows.length,
  boundaryAidRows: countByStage.PAIR_BOUNDARY_FIRST ?? 0,
  pairedRelabelRows: boundaryAid.summary?.pairedRelabelRows ?? 0,
  manualSplitRows: boundaryAid.summary?.manualSplitRows ?? 0,
  singleCorrectedPathRows: countByStage.SINGLE_CORRECTED_PATH ?? 0,
  sharedCandidateBoundaryRows: countByStage.DUPLICATE_CANDIDATE_SPLIT ?? 0,
  approvedRows: approvedRows.length,
  awaitingOperatorInput: readiness?.summary?.awaitingOperatorInput === true,
  readyForTemplateImport: readiness?.summary?.readyForTemplateImport === true,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  sourceInput: path.relative(frontendRoot, inputPath),
  sourceDecisionPacket: path.relative(frontendRoot, decisionPacketPath),
  sourceBoundaryAid: path.relative(frontendRoot, boundaryAidPath),
  sourceReadiness: path.relative(frontendRoot, readinessPath),
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  expected: EXPECTED,
  safetyContract: [
    'This packet is read-only and writes no operator input fields.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'Candidate paths and current paths are reference-only and must not be copied into correctedPath.',
    'No external crawling, web search, or coordinate inference is allowed.',
    'Production data can change only after the matching source input rows pass p1-operator-validate, p1-operator-import, p1-operator-readiness, and the production write guard.',
  ],
  operatorOrder: [
    {
      stage: 'PAIR_BOUNDARY_FIRST',
      rows: EXPECTED.boundaryAidRows,
      description: 'Resolve paired relabel and manual split rows first because isolated approval can break neighboring ownership.',
    },
    {
      stage: 'SINGLE_CORRECTED_PATH',
      rows: EXPECTED.singleCorrectedPathRows,
      description: 'Trace the lone corrected-path row after boundary-first rows are understood.',
    },
    {
      stage: 'DUPLICATE_CANDIDATE_SPLIT',
      rows: EXPECTED.sharedCandidateBoundaryRows,
      description: 'Split remaining duplicate candidate boundaries into block-specific polygons.',
    },
  ],
  nextGateCommands: [
    'npm run stadium:daegu:p1-operator-validate',
    'npm run stadium:daegu:p1-operator-import',
    'npm run stadium:daegu:p1-operator-readiness',
    'npm run stadium:daegu:p1-operator-import:write-template',
    'npm run stadium:daegu:operator-corrections-write',
  ],
  rows,
};

const jsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.json');
const csvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.csv');
const markdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.md');

await fs.mkdir(p1ReportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'stageOrder',
    'stage',
    'block',
    'blockId',
    'decision',
    'operatorFocus',
    'operatorAction',
    'acceptance',
    'duplicateGroup',
    'duplicatePeerBlocks',
    'pairedBlocks',
    'evidenceCrop',
    'sourceInput',
    'riskFlags',
  ],
  ...rows.map((row) => [
    row.stageOrder,
    row.stage,
    row.block,
    row.blockId,
    row.decision,
    row.operatorFocus,
    row.operatorAction,
    row.acceptance,
    row.duplicateGroup,
    row.duplicatePeerBlocks,
    row.pairedBlocks,
    row.evidenceCrop,
    row.sourceInput,
    row.riskFlags,
  ]),
]);

await fs.writeFile(markdownPath, [
  '# Daegu P1 Next Action Packet',
  '',
  `- packet version: \`${PACKET_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- stage counts: PAIR_BOUNDARY_FIRST=${summary.boundaryAidRows}, SINGLE_CORRECTED_PATH=${summary.singleCorrectedPathRows}, DUPLICATE_CANDIDATE_SPLIT=${summary.sharedCandidateBoundaryRows}`,
  `- ready for template import: \`${summary.readyForTemplateImport}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  `- blockers: ${summary.blockers.length ? summary.blockers.map((blocker) => `\`${blocker}\``).join(', ') : 'none'}`,
  `- warnings: ${summary.warnings.length ? summary.warnings.map((warning) => `\`${warning}\``).join(', ') : 'none'}`,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Operator Order',
  '',
  markdownTable(
    ['order', 'stage', 'rows', 'description'],
    report.operatorOrder.map((row, index) => [index + 1, `\`${row.stage}\``, row.rows, row.description]),
  ),
  '',
  '## Rows',
  '',
  markdownTable(
    ['order', 'stage', 'block', 'decision', 'operator focus', 'acceptance', 'peers', 'evidence'],
    rows.map((row) => [
      row.stageOrder,
      `\`${row.stage}\``,
      row.block,
      `\`${row.decision}\``,
      row.operatorFocus,
      row.acceptance,
      row.pairedBlocks || row.duplicatePeerBlocks || '-',
      `\`${row.evidenceCrop}\``,
    ]),
  ),
  '',
  '## Required Source Input Fields After Approval',
  '',
  '- `operatorDecision=APPROVED`',
  '- `correctedPath`',
  '- `correctedLabelX`',
  '- `correctedLabelY`',
  '- `reviewer`',
  '- `reviewedAt`',
  '',
  '## Next Gates',
  '',
  ...report.nextGateCommands.map((command) => `- \`${command}\``),
  '',
].join('\n'), 'utf8');

console.log([
  `[${PACKET_VERSION}] status=${summary.status}`,
  `rows=${summary.totalRows}`,
  `boundaryAid=${summary.boundaryAidRows}`,
  `singleCorrectedPath=${summary.singleCorrectedPathRows}`,
  `duplicateCandidateSplit=${summary.sharedCandidateBoundaryRows}`,
  `approvedRows=${summary.approvedRows}`,
  `readyForTemplateImport=${summary.readyForTemplateImport}`,
  `json=${path.relative(frontendRoot, jsonPath)}`,
  `markdown=${path.relative(frontendRoot, markdownPath)}`,
].join(' '));

if (blockers.length > 0) process.exitCode = 1;
