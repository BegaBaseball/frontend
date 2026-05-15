import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP2OperatorDir = path.join(defaultReportDir, 'daegu-p2-operator');
const defaultP2DraftDir = path.join(defaultReportDir, 'daegu-p2-draft');
const defaultP1OperatorDir = path.join(defaultReportDir, 'daegu-p1-operator');

const HANDOFF_VERSION = 'DAEGU_P2_OPERATOR_HANDOFF_V1';
const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
const NEXT_ACTION_VERSION = 'DAEGU_P2_NEXT_ACTION_PACKET_V1';
const READINESS_VERSION = 'DAEGU_P2_OPERATOR_READINESS_V2';
const STAGING_AUDIT_VERSION = 'DAEGU_P2_STAGING_AUDIT_V1';
const P1_POSTWRITE_GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1';
const TARGET_BATCH_ID = 'BATCH_3_P2';
const EXPECTED = {
  totalRows: 36,
  labelAndHitAreaRows: 2,
  visualApprovalCandidateRows: 1,
  manualRetraceRows: 33,
};

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const readJsonReport = async (filePath) => {
  try {
    return {
      path: filePath,
      relativePath: path.relative(frontendRoot, filePath),
      exists: true,
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: '',
    };
  } catch (error) {
    return {
      path: filePath,
      relativePath: path.relative(frontendRoot, filePath),
      exists: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

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

const list = (value) => (Array.isArray(value) ? value : []);

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const isBlank = (value) => String(value ?? '').trim() === '';

const countBy = (rows, key) => rows.reduce((counts, row) => ({
  ...counts,
  [row[key] || '']: (counts[row[key] || ''] ?? 0) + 1,
}), {});

const missingApprovalFields = (row) => {
  const missing = [];
  if (normalizeDecision(row.operatorDecision) !== 'APPROVED') missing.push('operatorDecision=APPROVED');
  if (isBlank(row.correctedPath)) missing.push('correctedPath');
  if (isBlank(row.correctedLabelX) || isBlank(row.correctedLabelY)) missing.push('correctedLabelX/Y');
  if (isBlank(row.reviewer)) missing.push('reviewer');
  if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
  return missing;
};

const stageFor = (row) => {
  if (row.operatorAction === 'OPERATOR_LABEL_AND_HIT_AREA_REVIEW') return 'LABEL_HIT_AREA_REVIEW_FIRST';
  if (row.operatorAction === 'OPERATOR_VISUAL_APPROVAL_CANDIDATE') return 'VISUAL_APPROVAL_CHECK';
  return 'MANUAL_RETRACE_BATCH';
};

const nextActionFor = (row, missing) => {
  if (missing.length === 0) return 'Run P2 validate/import/readiness before template import.';
  if (row.operatorAction === 'OPERATOR_LABEL_AND_HIT_AREA_REVIEW') {
    return `Verify label top-hit against the official PNG, then fill ${missing.join(', ')}.`;
  }
  if (row.operatorAction === 'OPERATOR_VISUAL_APPROVAL_CANDIDATE') {
    return `Compare candidate geometry with evidence crop, then fill ${missing.join(', ')} only if approved.`;
  }
  return `Trace a new corrected polygon from the evidence crop, then fill ${missing.join(', ')}.`;
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
const p2DraftDir = path.resolve(frontendRoot, argValue('--p2-draft-dir', defaultP2DraftDir));
const p1OperatorDir = path.resolve(frontendRoot, argValue('--p1-operator-dir', defaultP1OperatorDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));

const reports = {
  package: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-package.json')),
  input: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json')),
  decisionPacket: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-p2-decision-packet.json')),
  nextAction: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-p2-next-action-packet.json')),
  validation: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-operator-corrections-validation.json')),
  readiness: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-readiness.json')),
  importDryRun: await readJsonReport(path.join(reportDir, 'daegu-seatmap-p2-operator-import.json')),
  stagingAudit: await readJsonReport(path.join(p2DraftDir, 'daegu-seatmap-p2-staging-audit.json')),
  p1PostwriteGate: await readJsonReport(path.join(p1OperatorDir, 'daegu-seatmap-p1-boundary-first-postwrite-gate.json')),
};

const blockers = [];
const warnings = [];
const requiredReportNames = [
  'package',
  'input',
  'decisionPacket',
  'nextAction',
  'validation',
  'importDryRun',
  'stagingAudit',
];

Object.entries(reports).forEach(([name, report]) => {
  if (!report.exists && requiredReportNames.includes(name)) {
    blockers.push(`MISSING_REPORT:${name}:${report.relativePath}`);
  }
  if (!report.exists && !requiredReportNames.includes(name)) {
    warnings.push(`MISSING_OPTIONAL_REPORT:${name}:${report.relativePath}`);
  }
});

if (reports.package.exists && reports.package.data?.packageVersion !== PACKAGE_VERSION) {
  blockers.push(`P2_PACKAGE_VERSION_MISMATCH:${reports.package.data?.packageVersion ?? ''}`);
}
if (reports.input.exists && reports.input.data?.packageVersion !== PACKAGE_VERSION) {
  blockers.push(`P2_INPUT_VERSION_MISMATCH:${reports.input.data?.packageVersion ?? ''}`);
}
if (reports.nextAction.exists && reports.nextAction.data?.summary?.packetVersion !== NEXT_ACTION_VERSION) {
  blockers.push(`P2_NEXT_ACTION_VERSION_MISMATCH:${reports.nextAction.data?.summary?.packetVersion ?? ''}`);
}
if (reports.readiness.exists && reports.readiness.data?.summary?.readinessVersion !== READINESS_VERSION) {
  blockers.push(`P2_READINESS_VERSION_MISMATCH:${reports.readiness.data?.summary?.readinessVersion ?? ''}`);
}
if (reports.stagingAudit.exists && reports.stagingAudit.data?.summary?.auditVersion !== STAGING_AUDIT_VERSION) {
  blockers.push(`P2_STAGING_AUDIT_VERSION_MISMATCH:${reports.stagingAudit.data?.summary?.auditVersion ?? ''}`);
}
if (reports.p1PostwriteGate.exists && reports.p1PostwriteGate.data?.summary?.gateVersion !== P1_POSTWRITE_GATE_VERSION) {
  blockers.push(`P1_POSTWRITE_GATE_VERSION_MISMATCH:${reports.p1PostwriteGate.data?.summary?.gateVersion ?? ''}`);
}

[
  reports.package.data,
  reports.input.data,
  reports.nextAction.data?.summary,
  reports.readiness.data?.summary,
].filter(Boolean).forEach((summary) => {
  if (summary.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P2_TARGET_BATCH_MISMATCH:${summary.targetBatchId ?? ''}`);
  if ('productionWriteAllowed' in summary && summary.productionWriteAllowed !== false) {
    blockers.push('P2_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
});

const inputRows = list(reports.input.data?.corrections);
const nextRows = list(reports.nextAction.data?.rows);
const nextByBlockId = new Map(nextRows.map((row) => [row.blockId, row]));

if (inputRows.length !== EXPECTED.totalRows) blockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.totalRows}`);
if (nextRows.length !== EXPECTED.totalRows) blockers.push(`P2_NEXT_ACTION_ROW_COUNT_MISMATCH:${nextRows.length}:${EXPECTED.totalRows}`);

const rows = inputRows.map((row) => {
  const nextRow = nextByBlockId.get(row.blockId) ?? {};
  const missing = missingApprovalFields(row);
  const decision = normalizeDecision(row.operatorDecision);
  const stage = stageFor(row);
  return {
    blockId: row.blockId,
    block: row.block,
    name: row.name,
    category: row.category,
    stage,
    operatorAction: row.operatorAction,
    requiredOperatorReview: row.requiredOperatorReview || '',
    stagingBucket: row.stagingBucket || '',
    decision,
    rowStatus: decision === 'APPROVED' && missing.length === 0 ? 'operator-approved' : 'waiting-for-operator',
    missingApprovalFields: missing,
    candidatePathPointCount: row.candidatePathPointCount,
    candidateDuplicateGroup: row.candidateDuplicateGroup || '',
    candidateDuplicateIds: row.candidateDuplicateIds || '',
    evidenceCrop: row.evidenceCrop,
    riskFlags: row.riskFlags || nextRow.riskFlags || '',
    officialFailureReasons: row.officialFailureReasons || nextRow.officialFailureReasons || '',
    nextOperatorAction: nextActionFor(row, missing),
  };
});

const stageCounts = countBy(rows, 'stage');
const decisionCounts = countBy(rows, 'decision');
const waitingRows = rows.filter((row) => row.rowStatus === 'waiting-for-operator');
const approvedRows = rows.filter((row) => row.rowStatus === 'operator-approved');
const duplicateRows = rows.filter((row) => row.candidateDuplicateGroup || row.candidateDuplicateIds);
const p1PostwriteStatus = reports.p1PostwriteGate.data?.summary?.status ?? '';
const priorBatchReady = p1PostwriteStatus === 'postwrite-verified';

[
  ['P2_LABEL_HIT_AREA_ROWS', stageCounts.LABEL_HIT_AREA_REVIEW_FIRST ?? 0, EXPECTED.labelAndHitAreaRows],
  ['P2_VISUAL_APPROVAL_ROWS', stageCounts.VISUAL_APPROVAL_CHECK ?? 0, EXPECTED.visualApprovalCandidateRows],
  ['P2_MANUAL_RETRACE_ROWS', stageCounts.MANUAL_RETRACE_BATCH ?? 0, EXPECTED.manualRetraceRows],
].forEach(([label, actual, expected]) => {
  if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
});

if (!priorBatchReady) warnings.push(`P2_WAITING_FOR_P1_POSTWRITE:${p1PostwriteStatus || 'missing'}`);
if (approvedRows.length === 0) warnings.push('P2_OPERATOR_APPROVAL_REQUIRED:0/36');
if (reports.readiness.data?.summary?.readyForTemplateImport !== false && approvedRows.length === 0) {
  warnings.push('P2_READY_FOR_TEMPLATE_IMPORT_WITHOUT_APPROVALS');
}

const status = blockers.length > 0
  ? 'blocked'
  : !priorBatchReady && waitingRows.length > 0
    ? 'waiting-for-prior-batch-and-operator'
    : waitingRows.length > 0
      ? 'waiting-for-operator'
      : reports.readiness.data?.summary?.readyForTemplateImport === true
        ? 'ready-for-template-import'
        : 'operator-input-needs-gate-fix';

const summary = {
  handoffVersion: HANDOFF_VERSION,
  status,
  targetBatchId: TARGET_BATCH_ID,
  totalRows: rows.length,
  waitingForOperatorRows: waitingRows.length,
  approvedRows: approvedRows.length,
  needsRetraceRows: decisionCounts.NEEDS_RETRACE ?? 0,
  labelAndHitAreaRows: stageCounts.LABEL_HIT_AREA_REVIEW_FIRST ?? 0,
  visualApprovalCandidateRows: stageCounts.VISUAL_APPROVAL_CHECK ?? 0,
  manualRetraceRows: stageCounts.MANUAL_RETRACE_BATCH ?? 0,
  duplicateReferenceRows: duplicateRows.length,
  p1PostwriteStatus,
  priorBatchReady,
  nextActionStatus: reports.nextAction.data?.summary?.status ?? '',
  readinessStatus: reports.readiness.data?.summary?.status ?? '',
  readyForTemplateImport: reports.readiness.data?.summary?.readyForTemplateImport === true,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesSourceInput: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  nextCommand: !priorBatchReady
    ? 'Finish P1 boundary-first postwrite verification before P2 production write; P2 operator tracing can continue in parallel.'
    : waitingRows.length > 0
      ? 'Fill P2 operator input rows, then run npm run stadium:daegu:p2-operator-prewrite-gate.'
      : 'Run npm run stadium:daegu:p2-operator-prewrite-gate before any write-template step.',
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  sourceReports: Object.fromEntries(
    Object.entries(reports).map(([name, reportEntry]) => [name, reportEntry.relativePath]),
  ),
  safetyContract: [
    'This handoff is read-only.',
    'It aggregates P2 package, decision, next-action, staging audit, validation, import dry-run, readiness, and P1 postwrite status.',
    'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
    'It never writes source input or the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'Candidate and draft paths are reference-only and must not be copied into correctedPath without explicit operator approval.',
    'P2 production write remains blocked until P1 boundary-first postwrite is verified.',
  ],
  requiredOperatorFields: [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
  ],
  operatorOrder: [
    {
      stage: 'LABEL_HIT_AREA_REVIEW_FIRST',
      rows: summary.labelAndHitAreaRows,
      action: 'Fix label/top-hit sensitive rows first.',
    },
    {
      stage: 'VISUAL_APPROVAL_CHECK',
      rows: summary.visualApprovalCandidateRows,
      action: 'Confirm candidate geometry against official PNG evidence before approval.',
    },
    {
      stage: 'MANUAL_RETRACE_BATCH',
      rows: summary.manualRetraceRows,
      action: 'Trace fresh corrected polygons and label points.',
    },
  ],
  rows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-handoff.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-handoff.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-handoff.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'stage',
    'block',
    'blockId',
    'decision',
    'rowStatus',
    'operatorAction',
    'requiredOperatorReview',
    'missingApprovalFields',
    'candidatePathPointCount',
    'candidateDuplicateGroup',
    'candidateDuplicateIds',
    'evidenceCrop',
    'nextOperatorAction',
  ],
  ...rows.map((row) => [
    row.stage,
    row.block,
    row.blockId,
    row.decision,
    row.rowStatus,
    row.operatorAction,
    row.requiredOperatorReview,
    row.missingApprovalFields.join(' '),
    row.candidatePathPointCount,
    row.candidateDuplicateGroup,
    row.candidateDuplicateIds,
    row.evidenceCrop,
    row.nextOperatorAction,
  ]),
]);

await fs.writeFile(markdownPath, [
  '# Daegu P2 Operator Handoff',
  '',
  `- handoff version: \`${HANDOFF_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- waiting for operator: ${summary.waitingForOperatorRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
  `- next command: ${summary.nextCommand}`,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Operator Order',
  '',
  markdownTable(
    ['stage', 'rows', 'action'],
    report.operatorOrder.map((row) => [`\`${row.stage}\``, row.rows, row.action]),
  ),
  '',
  '## Required Operator Fields',
  '',
  ...report.requiredOperatorFields.map((field) => `- \`${field}\``),
  '',
  '## Rows',
  '',
  markdownTable(
    ['stage', 'block', 'decision', 'status', 'missing fields', 'points', 'duplicate', 'evidence', 'next action'],
    rows.map((row) => [
      `\`${row.stage}\``,
      `\`${row.block}\``,
      `\`${row.decision}\``,
      `\`${row.rowStatus}\``,
      row.missingApprovalFields.map((field) => `\`${field}\``).join(' ') || '-',
      row.candidatePathPointCount,
      row.candidateDuplicateGroup || row.candidateDuplicateIds || '-',
      `\`${row.evidenceCrop}\``,
      row.nextOperatorAction,
    ]),
  ),
  '',
  '## Source Reports',
  '',
  ...Object.entries(report.sourceReports).map(([name, sourcePath]) => `- ${name}: \`${sourcePath}\``),
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`p2_operator_handoff_json:${jsonPath}`);
console.log(`p2_operator_handoff_csv:${csvPath}`);
console.log(`p2_operator_handoff_markdown:${markdownPath}`);
console.log(`status:${summary.status} waiting=${summary.waitingForOperatorRows}/${summary.totalRows} approved=${summary.approvedRows}/${summary.totalRows} p1Postwrite=${summary.p1PostwriteStatus || 'missing'}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
