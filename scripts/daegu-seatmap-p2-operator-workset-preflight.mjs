import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

const PREFLIGHT_VERSION = 'DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1';
const WORKSETS_VERSION = 'DAEGU_P2_OPERATOR_WORKSETS_V1';
const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
const TARGET_BATCH_ID = 'BATCH_3_P2';
const EXPECTED = {
  totalRows: 36,
  p2aRows: 2,
  p2bRows: 1,
  p2cRows: 5,
  p2dRows: 28,
};
const BLOCKERS = {
  approvedRowMissingFields: 'APPROVED_ROW_MISSING_FIELDS',
  correctedPathReusesCurrentPath: 'CORRECTED_PATH_REUSES_CURRENT_PATH',
  correctedPathReusesCandidatePath: 'CORRECTED_PATH_REUSES_CANDIDATE_PATH',
  correctedPathRequiresAtLeastSixPoints: 'CORRECTED_PATH_REQUIRES_AT_LEAST_SIX_POINTS',
  correctedLabelXyNotNumeric: 'CORRECTED_LABEL_XY_NOT_NUMERIC',
  duplicateAssignment: 'P2_WORKSET_DUPLICATE_ASSIGNMENT',
  unassignedRows: 'P2_WORKSET_UNASSIGNED_ROWS',
};
const WARNINGS = {
  labelTopHitRequiresOperatorQa: 'LABEL_TOP_HIT_REQUIRES_OPERATOR_QA',
  visualApprovalOperatorNoteRecommended: 'VISUAL_APPROVAL_OPERATOR_NOTE_RECOMMENDED',
  nonApprovedRowHasCorrectedFields: 'NON_APPROVED_ROW_HAS_CORRECTED_FIELDS',
  waitingForOperatorApprovals: 'P2_WORKSET_PREFLIGHT_WAITING_FOR_OPERATOR_APPROVALS',
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

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';
const isBlank = (value) => String(value ?? '').trim() === '';
const isNumeric = (value) => !isBlank(value) && Number.isFinite(Number(value));
const normalizePath = (value) => String(value ?? '').trim().replace(/\s+/gu, ' ').toUpperCase();
const svgPathPointCount = (value) => {
  const numbers = String(value ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/giu) ?? [];
  return Math.floor(numbers.length / 2);
};

const hasAnyCorrectedField = (row) => [
  row.correctedPath,
  row.correctedLabelX,
  row.correctedLabelY,
  row.reviewer,
  row.reviewedAt,
].some((value) => !isBlank(value));

const missingApprovedFields = (row) => {
  const missing = [];
  if (isBlank(row.correctedPath)) missing.push('correctedPath');
  if (!isNumeric(row.correctedLabelX) || !isNumeric(row.correctedLabelY)) missing.push('correctedLabelX/Y');
  if (isBlank(row.reviewer)) missing.push('reviewer');
  if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
  return missing;
};

const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
const worksetsPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-worksets.json');
const inputPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');

const worksetsReport = await readJson(worksetsPath);
const input = await readJson(inputPath);
const structuralBlockers = [];
const reportWarnings = [];

if (worksetsReport.summary?.worksetsVersion !== WORKSETS_VERSION) {
  structuralBlockers.push(`P2_WORKSETS_VERSION_MISMATCH:${worksetsReport.summary?.worksetsVersion ?? ''}`);
}
if (input.packageVersion !== PACKAGE_VERSION) {
  structuralBlockers.push(`P2_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (input.targetBatchId !== TARGET_BATCH_ID) {
  structuralBlockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
}
if (input.productionWriteAllowed !== false) structuralBlockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (worksetsReport.summary?.productionWriteAllowed !== false) {
  structuralBlockers.push('P2_WORKSETS_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
}

const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const worksets = Array.isArray(worksetsReport.worksets) ? worksetsReport.worksets : [];
const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
const assignments = [];
worksets.forEach((workset) => {
  (Array.isArray(workset.rows) ? workset.rows : []).forEach((row) => {
    assignments.push({ worksetId: workset.id, worksetTitle: workset.title, row });
  });
});

if (inputRows.length !== EXPECTED.totalRows) {
  structuralBlockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.totalRows}`);
}
if (assignments.length !== EXPECTED.totalRows) {
  structuralBlockers.push(`P2_WORKSET_ROW_COUNT_MISMATCH:${assignments.length}:${EXPECTED.totalRows}`);
}

const countByWorkset = new Map(worksets.map((workset) => [workset.id, Array.isArray(workset.rows) ? workset.rows.length : 0]));
const expectedByWorkset = new Map([
  ['P2-A', EXPECTED.p2aRows],
  ['P2-B', EXPECTED.p2bRows],
  ['P2-C', EXPECTED.p2cRows],
  ['P2-D', EXPECTED.p2dRows],
]);
expectedByWorkset.forEach((expectedRows, worksetId) => {
  const actualRows = countByWorkset.get(worksetId) ?? 0;
  if (actualRows !== expectedRows) structuralBlockers.push(`${worksetId}_ROW_COUNT_MISMATCH:${actualRows}:${expectedRows}`);
});

const assignedByBlockId = new Map();
assignments.forEach((assignment) => {
  const blockId = assignment.row.blockId;
  if (!assignedByBlockId.has(blockId)) assignedByBlockId.set(blockId, []);
  assignedByBlockId.get(blockId).push(assignment.worksetId);
});
const duplicateAssignments = [...assignedByBlockId.entries()]
  .filter(([, assignedWorksets]) => assignedWorksets.length > 1)
  .map(([blockId, assignedWorksets]) => `${blockId}:${assignedWorksets.join('+')}`);
if (duplicateAssignments.length > 0) {
  structuralBlockers.push(`${BLOCKERS.duplicateAssignment}:${duplicateAssignments.join(' ')}`);
}
const unassignedRows = inputRows.filter((row) => !assignedByBlockId.has(row.blockId));
if (unassignedRows.length > 0) {
  structuralBlockers.push(`${BLOCKERS.unassignedRows}:${unassignedRows.map((row) => row.block).join(' ')}`);
}

const rows = assignments.map(({ worksetId, worksetTitle, row: worksetRow }) => {
  const inputRow = inputByBlockId.get(worksetRow.blockId) ?? {};
  const decision = normalizeDecision(inputRow.operatorDecision ?? worksetRow.decision);
  const approved = decision === 'APPROVED';
  const correctedPathPointCount = svgPathPointCount(inputRow.correctedPath);
  const rowBlockers = [];
  const rowWarnings = [];
  const missingFields = approved ? missingApprovedFields(inputRow) : [];

  if (approved && missingFields.length > 0) {
    rowBlockers.push(`${BLOCKERS.approvedRowMissingFields}:${missingFields.join('+')}`);
  }
  if (approved && (!isNumeric(inputRow.correctedLabelX) || !isNumeric(inputRow.correctedLabelY))) {
    rowBlockers.push(BLOCKERS.correctedLabelXyNotNumeric);
  }
  if (approved && correctedPathPointCount < 6) {
    rowBlockers.push(`${BLOCKERS.correctedPathRequiresAtLeastSixPoints}:${correctedPathPointCount}:6`);
  }
  if (approved && !isBlank(inputRow.correctedPath) && normalizePath(inputRow.correctedPath) === normalizePath(inputRow.currentPath)) {
    rowBlockers.push(BLOCKERS.correctedPathReusesCurrentPath);
  }
  if (approved && !isBlank(inputRow.correctedPath) && normalizePath(inputRow.correctedPath) === normalizePath(inputRow.candidatePath)) {
    rowBlockers.push(BLOCKERS.correctedPathReusesCandidatePath);
  }
  if (worksetId === 'P2-A') rowWarnings.push(WARNINGS.labelTopHitRequiresOperatorQa);
  if (worksetId === 'P2-B' && isBlank(inputRow.operatorNote)) rowWarnings.push(WARNINGS.visualApprovalOperatorNoteRecommended);
  if (!approved && hasAnyCorrectedField(inputRow)) rowWarnings.push(WARNINGS.nonApprovedRowHasCorrectedFields);

  return {
    workset: worksetId,
    worksetTitle,
    block: inputRow.block ?? worksetRow.block ?? '',
    blockId: worksetRow.blockId,
    stage: inputRow.stage ?? worksetRow.stage ?? '',
    decision,
    rowStatus: rowBlockers.length > 0
      ? 'blocked'
      : approved
        ? 'approved-preflight-passed'
        : 'waiting-for-operator',
    blockers: rowBlockers,
    warnings: rowWarnings,
    missingApprovedFields: missingFields,
    correctedPathPointCount,
    minCorrectedPathPoints: 6,
    currentPathPointCount: svgPathPointCount(inputRow.currentPath),
    candidatePathPointCount: Number(inputRow.candidatePathPointCount ?? worksetRow.candidatePathPointCount ?? svgPathPointCount(inputRow.candidatePath)),
    correctedLabelX: inputRow.correctedLabelX ?? '',
    correctedLabelY: inputRow.correctedLabelY ?? '',
    reviewer: inputRow.reviewer ?? '',
    reviewedAt: inputRow.reviewedAt ?? '',
    operatorNote: inputRow.operatorNote ?? '',
    evidenceCrop: inputRow.evidenceCrop ?? worksetRow.evidenceCrop ?? '',
    riskFlags: inputRow.riskFlags ?? worksetRow.riskFlags ?? '',
    officialFailureReasons: inputRow.officialFailureReasons ?? worksetRow.officialFailureReasons ?? '',
  };
});

const rowBlockers = rows.flatMap((row) => row.blockers.map((blocker) => `${row.block}:${blocker}`));
const approvedRows = rows.filter((row) => row.decision === 'APPROVED');
const waitingForOperatorRows = rows.filter((row) => row.decision !== 'APPROVED');
if (approvedRows.length === 0) reportWarnings.push(WARNINGS.waitingForOperatorApprovals);

const allBlockers = [...structuralBlockers, ...rowBlockers];
const status = allBlockers.length > 0
  ? 'blocked'
  : approvedRows.length === 0
    ? 'waiting-for-operator'
    : waitingForOperatorRows.length > 0
      ? 'partial-approved-preflight-passed'
      : 'ready-for-p2-readiness';

const summary = {
  preflightVersion: PREFLIGHT_VERSION,
  status,
  targetBatchId: TARGET_BATCH_ID,
  sourceWorksets: path.relative(frontendRoot, worksetsPath),
  sourceInput: path.relative(frontendRoot, inputPath),
  totalRows: rows.length,
  p2aRows: countByWorkset.get('P2-A') ?? 0,
  p2bRows: countByWorkset.get('P2-B') ?? 0,
  p2cRows: countByWorkset.get('P2-C') ?? 0,
  p2dRows: countByWorkset.get('P2-D') ?? 0,
  approvedRows: approvedRows.length,
  waitingForOperatorRows: waitingForOperatorRows.length,
  blockedRows: rows.filter((row) => row.blockers.length > 0).length,
  duplicateAssignments: duplicateAssignments.length,
  unassignedRows: unassignedRows.length,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesSourceInput: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers: allBlockers,
  warnings: [...reportWarnings, ...new Set(rows.flatMap((row) => row.warnings))],
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  expected: EXPECTED,
  safetyContract: [
    'This preflight is read-only.',
    'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
    'It never writes source input or the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'APPROVED rows must provide correctedPath, numeric correctedLabelX/Y, reviewer, and reviewedAt.',
    'Corrected paths must not reuse currentPath or candidatePath.',
    'Manual P2 precision rows require at least six corrected path points.',
  ],
  rows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-workset-preflight.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-workset-preflight.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-workset-preflight.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'workset',
    'block',
    'blockId',
    'decision',
    'rowStatus',
    'blockers',
    'warnings',
    'correctedPathPointCount',
    'minCorrectedPathPoints',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'evidenceCrop',
    'riskFlags',
  ],
  ...rows.map((row) => [
    row.workset,
    row.block,
    row.blockId,
    row.decision,
    row.rowStatus,
    row.blockers.join(' '),
    row.warnings.join(' '),
    row.correctedPathPointCount,
    row.minCorrectedPathPoints,
    row.correctedLabelX,
    row.correctedLabelY,
    row.reviewer,
    row.reviewedAt,
    row.evidenceCrop,
    row.riskFlags,
  ]),
]);

await fs.writeFile(markdownPath, [
  '# Daegu P2 Operator Workset Preflight',
  '',
  `- preflight version: \`${PREFLIGHT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- waiting for operator: ${summary.waitingForOperatorRows}`,
  `- blocked rows: ${summary.blockedRows}`,
  `- duplicate assignments: ${summary.duplicateAssignments}`,
  `- unassigned rows: ${summary.unassignedRows}`,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Required Approved Row Checks',
  '',
  `- \`${BLOCKERS.approvedRowMissingFields}\``,
  `- \`${BLOCKERS.correctedLabelXyNotNumeric}\``,
  `- \`${BLOCKERS.correctedPathRequiresAtLeastSixPoints}\``,
  `- \`${BLOCKERS.correctedPathReusesCurrentPath}\``,
  `- \`${BLOCKERS.correctedPathReusesCandidatePath}\``,
  `- \`${WARNINGS.labelTopHitRequiresOperatorQa}\``,
  `- \`${WARNINGS.visualApprovalOperatorNoteRecommended}\``,
  '',
  '## Rows',
  '',
  markdownTable(
    ['workset', 'block', 'decision', 'status', 'blockers', 'warnings', 'corrected points', 'evidence'],
    rows.map((row) => [
      `\`${row.workset}\``,
      `\`${row.block}\``,
      `\`${row.decision}\``,
      `\`${row.rowStatus}\``,
      row.blockers.map((blocker) => `\`${blocker}\``).join(' ') || '-',
      row.warnings.map((warning) => `\`${warning}\``).join(' ') || '-',
      `${row.correctedPathPointCount}/${row.minCorrectedPathPoints}`,
      `\`${row.evidenceCrop}\``,
    ]),
  ),
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

console.log(`p2_operator_workset_preflight_json:${jsonPath}`);
console.log(`p2_operator_workset_preflight_csv:${csvPath}`);
console.log(`p2_operator_workset_preflight_markdown:${markdownPath}`);
console.log(`status:${summary.status} approved=${summary.approvedRows} waiting=${summary.waitingForOperatorRows}/${summary.totalRows} blocked=${summary.blockedRows}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
