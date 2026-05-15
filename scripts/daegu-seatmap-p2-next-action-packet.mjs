import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP2OperatorDir = path.join(defaultReportDir, 'daegu-p2-operator');
const defaultP2DraftDir = path.join(defaultReportDir, 'daegu-p2-draft');

const PACKET_VERSION = 'DAEGU_P2_NEXT_ACTION_PACKET_V1';
const TARGET_BATCH_ID = 'BATCH_3_P2';
const EXPECTED = {
  expectedRows: 36,
  labelAndHitAreaRows: 2,
  visualApprovalCandidateRows: 1,
  manualRetraceRows: 33,
  approvalCandidateRows: 3,
  approvedRows: 0,
};

const STAGES = {
  LABEL_HIT_AREA_REVIEW_FIRST: {
    order: 1,
    label: 'LABEL_HIT_AREA_REVIEW_FIRST',
    acceptance: 'Approve only after visual path, corrected label point, and top-hit all resolve to this block.',
  },
  VISUAL_APPROVAL_CHECK: {
    order: 2,
    label: 'VISUAL_APPROVAL_CHECK',
    acceptance: 'Approve only after the operator confirms the reference candidate against the official PNG evidence crop.',
  },
  MANUAL_RETRACE_BATCH: {
    order: 3,
    label: 'MANUAL_RETRACE_BATCH',
    acceptance: 'Approve only after a new correctedPath with at least six polygon points passes validation.',
  },
};

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const readJsonReport = async (filePath) => {
  try {
    return {
      exists: true,
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: '',
      relativePath: path.relative(frontendRoot, filePath),
    };
  } catch (error) {
    return {
      exists: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
      relativePath: path.relative(frontendRoot, filePath),
    };
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

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const classifyRow = (row) => {
  if (row.operatorAction === 'OPERATOR_LABEL_AND_HIT_AREA_REVIEW') return STAGES.LABEL_HIT_AREA_REVIEW_FIRST;
  if (row.operatorAction === 'OPERATOR_VISUAL_APPROVAL_CANDIDATE') return STAGES.VISUAL_APPROVAL_CHECK;
  return STAGES.MANUAL_RETRACE_BATCH;
};

const operatorFocusFor = (stage) => {
  if (stage.label === 'LABEL_HIT_AREA_REVIEW_FIRST') {
    return 'Verify the candidate path, corrected label point, and label top-hit together before approval.';
  }
  if (stage.label === 'VISUAL_APPROVAL_CHECK') {
    return 'Compare the reference candidate against the official PNG crop; approval still requires real reviewer fields.';
  }
  return 'Draw a fresh corrected polygon from the official PNG crop; PATH_REQUIRES_AT_LEAST_SIX_POINTS remains the minimum shape contract.';
};

const operatorActionFor = (stage) => {
  if (stage.label === 'LABEL_HIT_AREA_REVIEW_FIRST') {
    return 'Fill correctedPath and correctedLabelX/Y only after the label point selects this block.';
  }
  if (stage.label === 'VISUAL_APPROVAL_CHECK') {
    return 'Use candidate geometry as reference evidence only, then enter explicit corrected fields and reviewer metadata if approved.';
  }
  return 'Trace a new correctedPath with at least six points and fill correctedLabelX/Y, reviewer, and reviewedAt.';
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
const p2DraftDir = path.resolve(frontendRoot, argValue('--p2-draft-dir', defaultP2DraftDir));
const inputPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');
const decisionPacketPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-decision-packet.json');
const readinessPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-readiness.json');
const stagingAuditPath = path.join(p2DraftDir, 'daegu-seatmap-p2-staging-audit.json');
const reviewPackagePath = path.join(p2DraftDir, 'daegu-seatmap-p2-review-package.json');

const input = await readJson(inputPath);
const decisionPacket = await readJson(decisionPacketPath);
const readinessReport = await readJsonReport(readinessPath);
const readiness = readinessReport.data ?? {};
const stagingAudit = await readJson(stagingAuditPath);
const reviewPackage = await readJson(reviewPackagePath);

const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const decisionRows = Array.isArray(decisionPacket.rows) ? decisionPacket.rows : [];
const decisionByBlockId = new Map(decisionRows.map((row) => [row.blockId, row]));

const blockers = [];
const warnings = [];

if (input.packageVersion !== 'DAEGU_P2_OPERATOR_PACKAGE_V1') {
  blockers.push(`P2_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (input.productionWriteAllowed !== false) blockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (inputRows.length !== EXPECTED.expectedRows) blockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.expectedRows}`);
if (decisionPacket.summary?.packetVersion !== 'DAEGU_P2_DECISION_PACKET_V1') {
  blockers.push(`P2_DECISION_PACKET_VERSION_MISMATCH:${decisionPacket.summary?.packetVersion ?? ''}`);
}
if (readinessReport.exists && readiness.summary?.readinessVersion !== 'DAEGU_P2_OPERATOR_READINESS_V2') {
  blockers.push(`P2_READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
}
if (!readinessReport.exists) {
  warnings.push(`P2_READINESS_REPORT_MISSING:${readinessReport.relativePath}`);
}
if (stagingAudit.summary?.auditVersion !== 'DAEGU_P2_STAGING_AUDIT_V1') {
  blockers.push(`P2_STAGING_AUDIT_VERSION_MISMATCH:${stagingAudit.summary?.auditVersion ?? ''}`);
}
if (reviewPackage.packageVersion !== 'DAEGU_P2_REVIEW_PACKAGE_V1') {
  blockers.push(`P2_REVIEW_PACKAGE_VERSION_MISMATCH:${reviewPackage.packageVersion ?? ''}`);
}

const rows = inputRows.map((row) => {
  const stage = classifyRow(row);
  const decisionRow = decisionByBlockId.get(row.blockId) ?? {};
  const decision = normalizeDecision(row.operatorDecision);

  return {
    nextActionPacketVersion: PACKET_VERSION,
    stage: stage.label,
    stageOrder: stage.order,
    blockId: row.blockId,
    block: row.block,
    name: row.name,
    category: row.category,
    decision,
    requiredOperatorReview: row.requiredOperatorReview || '',
    recommendedAction: row.recommendedAction || '',
    stagingBucket: row.stagingBucket || '',
    operatorAction: operatorActionFor(stage),
    operatorFocus: operatorFocusFor(stage),
    acceptance: stage.acceptance,
    evidenceCrop: row.evidenceCrop,
    sourceInput: path.relative(frontendRoot, inputPath),
    candidatePathPointCount: row.candidatePathPointCount,
    candidateLabel: row.candidateLabelX !== '' && row.candidateLabelY !== ''
      ? `${row.candidateLabelX},${row.candidateLabelY}`
      : '',
    currentLabel: `${row.currentLabelX},${row.currentLabelY}`,
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
  ['P2_NEXT_ACTION_EXPECTED_ROWS', rows.length, EXPECTED.expectedRows],
  ['P2_NEXT_ACTION_LABEL_HIT_AREA_ROWS', countByStage.LABEL_HIT_AREA_REVIEW_FIRST ?? 0, EXPECTED.labelAndHitAreaRows],
  ['P2_NEXT_ACTION_VISUAL_APPROVAL_CANDIDATE_ROWS', countByStage.VISUAL_APPROVAL_CHECK ?? 0, EXPECTED.visualApprovalCandidateRows],
  ['P2_NEXT_ACTION_MANUAL_RETRACE_ROWS', countByStage.MANUAL_RETRACE_BATCH ?? 0, EXPECTED.manualRetraceRows],
  ['P2_NEXT_ACTION_APPROVED_ROWS', approvedRows.length, EXPECTED.approvedRows],
];

expectedChecks.forEach(([label, actual, expected]) => {
  if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
});

if (stagingAudit.summary?.expectedCounts?.approvalCandidateRows !== EXPECTED.approvalCandidateRows) {
  blockers.push(`P2_NEXT_ACTION_APPROVAL_CANDIDATE_ROWS:${stagingAudit.summary?.expectedCounts?.approvalCandidateRows ?? ''}!=${EXPECTED.approvalCandidateRows}`);
}
if (stagingAudit.summary?.expectedCounts?.manualRetraceRows !== EXPECTED.manualRetraceRows) {
  blockers.push(`P2_NEXT_ACTION_STAGING_MANUAL_RETRACE_ROWS:${stagingAudit.summary?.expectedCounts?.manualRetraceRows ?? ''}!=${EXPECTED.manualRetraceRows}`);
}
if (readiness.summary?.readyForTemplateImport === true && approvedRows.length === 0) {
  warnings.push('P2_READY_FOR_TEMPLATE_IMPORT_WITHOUT_APPROVED_ROWS_DO_NOT_WRITE_TEMPLATE');
}

const summary = {
  packetVersion: PACKET_VERSION,
  status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
  targetBatchId: TARGET_BATCH_ID,
  expectedRows: EXPECTED.expectedRows,
  totalRows: rows.length,
  labelAndHitAreaRows: countByStage.LABEL_HIT_AREA_REVIEW_FIRST ?? 0,
  visualApprovalCandidateRows: countByStage.VISUAL_APPROVAL_CHECK ?? 0,
  manualRetraceRows: countByStage.MANUAL_RETRACE_BATCH ?? 0,
  approvalCandidateRows: EXPECTED.approvalCandidateRows,
  approvedRows: approvedRows.length,
  awaitingOperatorInput: approvedRows.length === 0,
  readyForTemplateImport: readiness.summary?.readyForTemplateImport === true,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  sourceInput: path.relative(frontendRoot, inputPath),
  sourceDecisionPacket: path.relative(frontendRoot, decisionPacketPath),
  sourceReadiness: path.relative(frontendRoot, readinessPath),
  sourceReadinessExists: readinessReport.exists,
  sourceStagingAudit: path.relative(frontendRoot, stagingAuditPath),
  sourceReviewPackage: path.relative(frontendRoot, reviewPackagePath),
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
    'P2 staging and draft values are not production approvals.',
    'Candidate paths and current paths are reference-only and must not be copied into correctedPath without explicit operator approval.',
    'No external crawling, web search, or coordinate inference is allowed.',
    'Production data can change only after the matching source input rows pass p2-operator-validate, p2-operator-import, p2-operator-readiness, and the production write guard.',
  ],
  operatorOrder: [
    {
      stage: 'LABEL_HIT_AREA_REVIEW_FIRST',
      rows: EXPECTED.labelAndHitAreaRows,
      description: 'Handle label/top-hit mismatch rows first because they need focused click-target verification.',
    },
    {
      stage: 'VISUAL_APPROVAL_CHECK',
      rows: EXPECTED.visualApprovalCandidateRows,
      description: 'Review the single visual approval candidate after label/hit rows are resolved.',
    },
    {
      stage: 'MANUAL_RETRACE_BATCH',
      rows: EXPECTED.manualRetraceRows,
      description: 'Trace the remaining manual retrace rows with new polygons and corrected label points.',
    },
  ],
  nextGateCommands: [
    'npm run stadium:daegu:p2-operator-validate',
    'npm run stadium:daegu:p2-operator-import',
    'npm run stadium:daegu:p2-operator-readiness',
    'npm run stadium:daegu:p2-operator-import:write-template',
    'npm run stadium:daegu:operator-corrections-write',
  ],
  rows,
};

const jsonPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-next-action-packet.json');
const csvPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-next-action-packet.csv');
const markdownPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-next-action-packet.md');

await fs.mkdir(p2OperatorDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'stageOrder',
    'stage',
    'block',
    'blockId',
    'decision',
    'requiredOperatorReview',
    'operatorFocus',
    'operatorAction',
    'acceptance',
    'candidatePathPointCount',
    'candidateLabel',
    'currentLabel',
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
    row.requiredOperatorReview,
    row.operatorFocus,
    row.operatorAction,
    row.acceptance,
    row.candidatePathPointCount,
    row.candidateLabel,
    row.currentLabel,
    row.evidenceCrop,
    row.sourceInput,
    row.riskFlags,
  ]),
]);

await fs.writeFile(markdownPath, [
  '# Daegu P2 Next Action Packet',
  '',
  `- packet version: \`${PACKET_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- stage counts: LABEL_HIT_AREA_REVIEW_FIRST=${summary.labelAndHitAreaRows}, VISUAL_APPROVAL_CHECK=${summary.visualApprovalCandidateRows}, MANUAL_RETRACE_BATCH=${summary.manualRetraceRows}`,
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
    ['order', 'stage', 'block', 'decision', 'operator focus', 'acceptance', 'candidate points', 'evidence'],
    rows.map((row) => [
      row.stageOrder,
      `\`${row.stage}\``,
      row.block,
      `\`${row.decision}\``,
      row.operatorFocus,
      row.acceptance,
      row.candidatePathPointCount,
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
  `labelHitArea=${summary.labelAndHitAreaRows}`,
  `visualApproval=${summary.visualApprovalCandidateRows}`,
  `manualRetrace=${summary.manualRetraceRows}`,
  `approvedRows=${summary.approvedRows}`,
  `readyForTemplateImport=${summary.readyForTemplateImport}`,
  `json=${path.relative(frontendRoot, jsonPath)}`,
  `markdown=${path.relative(frontendRoot, markdownPath)}`,
].join(' '));

if (blockers.length > 0) process.exitCode = 1;
