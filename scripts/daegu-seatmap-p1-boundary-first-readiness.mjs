import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');

const READINESS_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_READINESS_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const INPUT_PACKAGE_VERSION = 'DAEGU_P1_OPERATOR_PACKAGE_V1';
const BOUNDARY_AID_VERSION = 'DAEGU_P1_BOUNDARY_INPUT_AID_V1';
const NEXT_ACTION_PACKET_VERSION = 'DAEGU_P1_NEXT_ACTION_PACKET_V1';
const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
const REQUIRED_STAGE = 'PAIR_BOUNDARY_FIRST';
const REQUIRED_APPROVAL_FIELDS = [
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
];
const EXPECTED_BOUNDARY_ROWS = [
  {
    blockId: 'daegu-first-table-t1-1',
    block: 'T1-1',
    pairedBlocks: ['T1-2', 'TC-1'],
    reviewType: 'PAIRED_RELABEL_BOUNDARY_REVIEW',
  },
  {
    blockId: 'daegu-third-table-t3-2',
    block: 'T3-2',
    pairedBlocks: ['T3-1', 'T3-3', 'T3-4', 'TC-3'],
    reviewType: 'PAIRED_RELABEL_BOUNDARY_REVIEW',
  },
  {
    blockId: 'daegu-central-table-v-v1',
    block: 'V1',
    pairedBlocks: ['V2', 'TC-1', 'TC-2'],
    reviewType: 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED',
  },
  {
    blockId: 'daegu-central-table-v-v2',
    block: 'V2',
    pairedBlocks: ['V1', 'V3', 'T3-2', 'T3-3'],
    reviewType: 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED',
  },
  {
    blockId: 'daegu-central-table-v-v3',
    block: 'V3',
    pairedBlocks: ['V1', 'V2', 'T3-3', 'T3-1'],
    reviewType: 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED',
  },
];

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

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
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

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const normalizePath = (pathData) => String(pathData ?? '')
  .replace(/\s+/g, ' ')
  .replace(/\s*,\s*/g, ',')
  .trim()
  .toUpperCase();

const isBlank = (value) => String(value ?? '').trim() === '';

const sorted = (values) => [...values].sort((a, b) => a.localeCompare(b, 'ko'));

const sameStringSet = (left, right) => {
  const leftSorted = sorted(left);
  const rightSorted = sorted(right);
  return leftSorted.length === rightSorted.length
    && leftSorted.every((value, index) => value === rightSorted[index]);
};

const classifyStatus = ({ decision, evidenceMissing, contextMissing, approvedInvalid }) => {
  if (decision === 'APPROVED') return approvedInvalid ? 'APPROVED_INVALID' : 'APPROVED_VALID';
  if (evidenceMissing) return 'MISSING_EVIDENCE';
  if (contextMissing) return 'MISSING_CONTEXT';
  return 'READY_FOR_OPERATOR';
};

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const inputPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');
const boundaryAidPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-input-aid.json');
const nextActionPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.json');
const validationPath = path.join(p1ReportDir, 'daegu-seatmap-operator-corrections-validation.json');

const reports = {
  input: await readJsonReport(inputPath),
  boundaryAid: await readJsonReport(boundaryAidPath),
  nextAction: await readJsonReport(nextActionPath),
  validation: await readJsonReport(validationPath),
};

const input = reports.input.data ?? {};
const boundaryAid = reports.boundaryAid.data ?? {};
const nextAction = reports.nextAction.data ?? {};
const validation = reports.validation.data ?? {};
const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const boundaryAidRows = Array.isArray(boundaryAid.rows) ? boundaryAid.rows : [];
const nextActionRows = Array.isArray(nextAction.rows) ? nextAction.rows : [];
const validationRows = Array.isArray(validation.rows) ? validation.rows : [];
const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
const boundaryAidByBlockId = new Map(boundaryAidRows.map((row) => [row.target?.blockId, row]).filter(([blockId]) => blockId));
const nextActionByBlockId = new Map(nextActionRows.map((row) => [row.blockId, row]));
const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));

const blockers = [];
const warnings = [];

Object.values(reports).forEach((report) => {
  if (!report.exists) blockers.push(`MISSING_REPORT:${report.relativePath}`);
});

if (reports.input.exists && input.packageVersion !== INPUT_PACKAGE_VERSION) {
  blockers.push(`P1_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (reports.input.exists && input.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`P1_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
}
if (reports.input.exists && input.productionWriteAllowed !== false) {
  blockers.push('P1_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
}
if (reports.boundaryAid.exists && boundaryAid.summary?.inputAidVersion !== BOUNDARY_AID_VERSION) {
  blockers.push(`P1_BOUNDARY_AID_VERSION_MISMATCH:${boundaryAid.summary?.inputAidVersion ?? ''}`);
}
if (reports.nextAction.exists && nextAction.summary?.packetVersion !== NEXT_ACTION_PACKET_VERSION) {
  blockers.push(`P1_NEXT_ACTION_PACKET_VERSION_MISMATCH:${nextAction.summary?.packetVersion ?? ''}`);
}
if (reports.nextAction.exists && nextAction.summary?.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`P1_NEXT_ACTION_BATCH_MISMATCH:${nextAction.summary?.targetBatchId ?? ''}`);
}
if (reports.validation.exists && (validation.summary?.validationVersion ?? validation.validationVersion) !== VALIDATION_VERSION) {
  blockers.push(`P1_VALIDATION_VERSION_MISMATCH:${validation.summary?.validationVersion ?? validation.validationVersion ?? ''}`);
}
if (reports.validation.exists && validation.summary?.status !== 'ok') {
  warnings.push(`P1_VALIDATION_STATUS_NOT_OK:${validation.summary?.status ?? ''}`);
}

const approvedBoundaryRows = EXPECTED_BOUNDARY_ROWS
  .map((expected) => inputByBlockId.get(expected.blockId))
  .filter((row) => normalizeDecision(row?.operatorDecision) === 'APPROVED');
const duplicateCorrectedPathGroups = approvedBoundaryRows.reduce((groups, row) => {
  const key = normalizePath(row.correctedPath);
  if (!key) return groups;
  const group = groups.get(key) ?? [];
  group.push(row.block);
  groups.set(key, group);
  return groups;
}, new Map());
const duplicateCorrectedPathBlocks = new Set();
duplicateCorrectedPathGroups.forEach((blocks) => {
  if (blocks.length < 2) return;
  blocks.forEach((block) => duplicateCorrectedPathBlocks.add(block));
});

const rows = await Promise.all(EXPECTED_BOUNDARY_ROWS.map(async (expected, index) => {
  const inputRow = inputByBlockId.get(expected.blockId);
  const boundaryAidRow = boundaryAidByBlockId.get(expected.blockId);
  const nextActionRow = nextActionByBlockId.get(expected.blockId);
  const validationRow = validationByBlockId.get(expected.blockId);
  const decision = normalizeDecision(inputRow?.operatorDecision);
  const evidenceCrop = inputRow?.evidenceCrop || boundaryAidRow?.target?.evidenceCrop || nextActionRow?.evidenceCrop || '';
  const evidencePath = evidenceCrop ? path.resolve(frontendRoot, evidenceCrop) : '';
  const evidenceExists = evidencePath ? await fileExists(evidencePath) : false;
  const pairedContextBlocks = Array.isArray(boundaryAidRow?.pairedGeometryReference)
    ? boundaryAidRow.pairedGeometryReference.map((row) => row.block).filter(Boolean)
    : [];
  const rowBlockers = [];
  const rowWarnings = [];

  if (!inputRow) rowBlockers.push('SOURCE_INPUT_ROW_MISSING');
  if (!boundaryAidRow) rowBlockers.push('BOUNDARY_AID_ROW_MISSING');
  if (!nextActionRow) rowBlockers.push('NEXT_ACTION_ROW_MISSING');
  if (nextActionRow && nextActionRow.stage !== REQUIRED_STAGE) {
    rowBlockers.push(`NEXT_ACTION_STAGE_NOT_BOUNDARY_FIRST:${nextActionRow.stage}`);
  }
  if (boundaryAidRow?.target?.reviewType && boundaryAidRow.target.reviewType !== expected.reviewType) {
    rowBlockers.push(`BOUNDARY_AID_REVIEW_TYPE_MISMATCH:${boundaryAidRow.target.reviewType}`);
  }
  if (!evidenceCrop) rowBlockers.push('EVIDENCE_CROP_MISSING');
  if (evidenceCrop && !evidenceExists) rowBlockers.push('EVIDENCE_FILE_MISSING');
  if (!boundaryAidRow?.targetGeometryReference?.currentPath) rowBlockers.push('TARGET_CURRENT_PATH_MISSING');
  if (!boundaryAidRow?.targetGeometryReference?.candidateStatus) rowWarnings.push('TARGET_CANDIDATE_STATUS_MISSING');
  if (pairedContextBlocks.length === 0) rowBlockers.push('PAIRED_CONTEXT_MISSING');
  if (pairedContextBlocks.length > 0 && !sameStringSet(pairedContextBlocks, expected.pairedBlocks)) {
    rowBlockers.push(`PAIRED_CONTEXT_BLOCKS_MISMATCH:${sorted(pairedContextBlocks).join(' ')}!=${sorted(expected.pairedBlocks).join(' ')}`);
  }
  if (boundaryAidRow?.pairedGeometryReference?.some((paired) => !paired.currentPath)) {
    rowBlockers.push('PAIRED_CONTEXT_CURRENT_PATH_MISSING');
  }

  const missingApprovalFields = decision === 'APPROVED'
    ? [
      ['correctedPath', inputRow?.correctedPath],
      ['correctedLabelX', inputRow?.correctedLabelX],
      ['correctedLabelY', inputRow?.correctedLabelY],
      ['reviewer', inputRow?.reviewer],
      ['reviewedAt', inputRow?.reviewedAt],
    ].filter(([, value]) => isBlank(value)).map(([field]) => field)
    : [];
  const validationReasons = Array.isArray(validationRow?.reasons) ? validationRow.reasons : [];
  const approvedInvalid = decision === 'APPROVED' && (
    rowBlockers.length > 0
    || missingApprovalFields.length > 0
    || !validationRow?.validForApproval
    || duplicateCorrectedPathBlocks.has(expected.block)
  );

  if (decision === 'APPROVED') {
    if (!validationRow) rowBlockers.push('VALIDATION_ROW_MISSING');
    if (missingApprovalFields.length > 0) rowBlockers.push(`APPROVED_ROW_MISSING_FIELDS:${missingApprovalFields.join(' ')}`);
    if (validationRow && validationRow.validForApproval !== true) {
      rowBlockers.push(`APPROVED_ROW_NOT_VALID_FOR_APPROVAL:${validationReasons.join(' ') || 'UNKNOWN_REASON'}`);
    }
    if (duplicateCorrectedPathBlocks.has(expected.block)) rowBlockers.push('BOUNDARY_FIRST_DUPLICATE_CORRECTED_PATH');
  }

  const evidenceMissing = rowBlockers.some((blocker) => blocker.startsWith('EVIDENCE_'));
  const contextMissing = rowBlockers.some((blocker) => (
    blocker.startsWith('BOUNDARY_AID_')
    || blocker.startsWith('TARGET_')
    || blocker.startsWith('PAIRED_')
    || blocker.startsWith('NEXT_ACTION_')
  ));
  const status = classifyStatus({
    decision,
    evidenceMissing,
    contextMissing,
    approvedInvalid,
  });

  return {
    readinessVersion: READINESS_VERSION,
    rowNumber: index + 1,
    blockId: expected.blockId,
    block: expected.block,
    name: inputRow?.name ?? boundaryAidRow?.target?.name ?? nextActionRow?.name ?? '',
    category: inputRow?.category ?? boundaryAidRow?.target?.category ?? nextActionRow?.category ?? '',
    stage: nextActionRow?.stage ?? '',
    reviewType: boundaryAidRow?.target?.reviewType ?? expected.reviewType,
    expectedPairedBlocks: expected.pairedBlocks.join(' '),
    pairedContextBlocks: pairedContextBlocks.join(' '),
    decision,
    status,
    evidenceCrop,
    evidenceExists,
    operatorFocus: nextActionRow?.operatorFocus ?? boundaryAidRow?.target?.operatorFocus ?? '',
    operatorAction: nextActionRow?.operatorAction ?? boundaryAidRow?.target?.operatorAction ?? '',
    approvalRule: boundaryAidRow?.target?.approvalRule ?? nextActionRow?.acceptance ?? '',
    targetCurrentPathPointCount: boundaryAidRow?.targetGeometryReference?.currentPathPointCount ?? 0,
    targetCandidatePathPointCount: boundaryAidRow?.targetGeometryReference?.candidatePathPointCount ?? 0,
    targetCandidateStatus: boundaryAidRow?.targetGeometryReference?.candidateStatus ?? inputRow?.candidateStatus ?? '',
    correctedPathFilled: !isBlank(inputRow?.correctedPath),
    correctedLabelFilled: !isBlank(inputRow?.correctedLabelX) && !isBlank(inputRow?.correctedLabelY),
    reviewerFilled: !isBlank(inputRow?.reviewer),
    reviewedAtFilled: !isBlank(inputRow?.reviewedAt),
    validForApproval: validationRow?.validForApproval === true,
    validationReasons,
    validationWarnings: Array.isArray(validationRow?.warnings) ? validationRow.warnings : [],
    rowBlockers,
    rowWarnings,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
  };
}));

const statusCounts = rows.reduce((counts, row) => {
  counts[row.status] = (counts[row.status] ?? 0) + 1;
  return counts;
}, {});
const approvedValidRows = rows.filter((row) => row.status === 'APPROVED_VALID');
const approvedInvalidRows = rows.filter((row) => row.status === 'APPROVED_INVALID');
const readyForOperatorRows = rows.filter((row) => row.status === 'READY_FOR_OPERATOR');
const missingEvidenceRows = rows.filter((row) => row.status === 'MISSING_EVIDENCE');
const missingContextRows = rows.filter((row) => row.status === 'MISSING_CONTEXT');
const rowBlockers = rows.flatMap((row) => row.rowBlockers.map((blocker) => `${row.block}:${blocker}`));

const expectedIds = new Set(EXPECTED_BOUNDARY_ROWS.map((row) => row.blockId));
const boundaryStageIds = nextActionRows
  .filter((row) => row.stage === REQUIRED_STAGE)
  .map((row) => row.blockId);
const missingExpectedIds = [...expectedIds].filter((blockId) => !boundaryStageIds.includes(blockId));
const extraBoundaryStageIds = boundaryStageIds.filter((blockId) => !expectedIds.has(blockId));
if (missingExpectedIds.length > 0) blockers.push(`BOUNDARY_FIRST_MISSING_EXPECTED_ROWS:${missingExpectedIds.join(' ')}`);
if (extraBoundaryStageIds.length > 0) blockers.push(`BOUNDARY_FIRST_HAS_EXTRA_ROWS:${extraBoundaryStageIds.join(' ')}`);
if (rows.length !== EXPECTED_BOUNDARY_ROWS.length) {
  blockers.push(`BOUNDARY_FIRST_ROW_COUNT_MISMATCH:${rows.length}:${EXPECTED_BOUNDARY_ROWS.length}`);
}
if (approvedInvalidRows.length > 0) blockers.push(`BOUNDARY_FIRST_APPROVED_INVALID_ROWS:${approvedInvalidRows.map((row) => row.block).join(' ')}`);
if (missingEvidenceRows.length > 0) blockers.push(`BOUNDARY_FIRST_MISSING_EVIDENCE_ROWS:${missingEvidenceRows.map((row) => row.block).join(' ')}`);
if (missingContextRows.length > 0) blockers.push(`BOUNDARY_FIRST_MISSING_CONTEXT_ROWS:${missingContextRows.map((row) => row.block).join(' ')}`);

if (rowBlockers.length > 0) warnings.push(`BOUNDARY_FIRST_ROW_BLOCKERS:${rowBlockers.join(' | ')}`);
if (readyForOperatorRows.length > 0) warnings.push(`BOUNDARY_FIRST_WAITING_FOR_OPERATOR:${readyForOperatorRows.map((row) => row.block).join(' ')}`);

const canAdvanceToSingleCorrectedPath = blockers.length === 0
  && approvedValidRows.length === EXPECTED_BOUNDARY_ROWS.length;
const summary = {
  readinessVersion: READINESS_VERSION,
  status: blockers.length > 0 ? 'blocked' : canAdvanceToSingleCorrectedPath ? 'ready-for-next-stage' : 'ready-for-operator',
  targetBatchId: TARGET_BATCH_ID,
  requiredStage: REQUIRED_STAGE,
  expectedRows: EXPECTED_BOUNDARY_ROWS.length,
  totalRows: rows.length,
  approvedValidRows: approvedValidRows.length,
  approvedInvalidRows: approvedInvalidRows.length,
  readyForOperatorRows: readyForOperatorRows.length,
  missingEvidenceRows: missingEvidenceRows.length,
  missingContextRows: missingContextRows.length,
  statusCounts,
  canAdvanceToSingleCorrectedPath,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  sourceInput: reports.input.relativePath,
  sourceBoundaryAid: reports.boundaryAid.relativePath,
  sourceNextAction: reports.nextAction.relativePath,
  sourceValidation: reports.validation.relativePath,
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  expectedRows: EXPECTED_BOUNDARY_ROWS,
  safetyContract: [
    'This P1 boundary-first readiness report is read-only.',
    'It never writes operatorDecision or corrected fields.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'Boundary-first rows must be approved before SINGLE_CORRECTED_PATH or DUPLICATE_CANDIDATE_SPLIT rows can advance.',
    'APPROVED rows must pass the shared operator corrections validator before they count as APPROVED_VALID.',
    'No external crawling, web search, or coordinate inference is allowed.',
  ],
  statusDefinitions: {
    READY_FOR_OPERATOR: 'Evidence and context are present, but the source input row is not approved yet.',
    MISSING_EVIDENCE: 'Evidence crop is missing or not present on disk.',
    MISSING_CONTEXT: 'Boundary aid, next action, target geometry, or paired neighbor context is incomplete.',
    APPROVED_VALID: 'The row is operatorDecision=APPROVED and the shared validation row is validForApproval=true.',
    APPROVED_INVALID: 'The row is approved but missing required fields, duplicate correctedPath, or validator approval.',
  },
  rows,
};

const jsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-readiness.json');
const csvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-readiness.csv');
const markdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-readiness.md');

await fs.mkdir(p1ReportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'block',
    'blockId',
    'status',
    'decision',
    'stage',
    'reviewType',
    'evidenceExists',
    'pairedContextBlocks',
    'validForApproval',
    'rowBlockers',
    'validationReasons',
  ],
  ...rows.map((row) => [
    row.block,
    row.blockId,
    row.status,
    row.decision,
    row.stage,
    row.reviewType,
    row.evidenceExists,
    row.pairedContextBlocks,
    row.validForApproval,
    row.rowBlockers.join(' '),
    row.validationReasons.join(' '),
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary-First Readiness',
  '',
  `- readiness version: \`${READINESS_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- required stage: \`${summary.requiredStage}\``,
  `- total rows: ${summary.totalRows}`,
  `- approved valid rows: ${summary.approvedValidRows}`,
  `- approved invalid rows: ${summary.approvedInvalidRows}`,
  `- ready for operator rows: ${summary.readyForOperatorRows}`,
  `- missing evidence rows: ${summary.missingEvidenceRows}`,
  `- missing context rows: ${summary.missingContextRows}`,
  `- can advance to single corrected path: ${summary.canAdvanceToSingleCorrectedPath}`,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  '',
  '## Rows',
  '',
  markdownTable(
    [
      'block',
      'status',
      'decision',
      'paired context',
      'evidence',
      'valid',
      'blockers',
    ],
    rows.map((row) => [
      `\`${row.block}\``,
      `\`${row.status}\``,
      `\`${row.decision}\``,
      row.pairedContextBlocks,
      row.evidenceExists ? 'yes' : 'no',
      String(row.validForApproval),
      row.rowBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
    ]),
  ),
  '',
  '## Gate',
  '',
  '1. 이 report는 read-only이며 source P1 input, main template, production data를 수정하지 않습니다.',
  '2. `T1-1`, `T3-2`, `V1`, `V2`, `V3` 5개만 boundary-first 대상으로 검사합니다.',
  '3. 5개가 모두 `APPROVED_VALID`가 되기 전에는 `M-9`와 duplicate split 11개로 넘어가지 않습니다.',
  '4. `APPROVED_INVALID`, `MISSING_EVIDENCE`, `MISSING_CONTEXT`가 있으면 operator 재검수가 필요합니다.',
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

console.log(`p1_boundary_first_readiness_json:${jsonPath}`);
console.log(`p1_boundary_first_readiness_csv:${csvPath}`);
console.log(`p1_boundary_first_readiness_markdown:${markdownPath}`);
console.log(`status:${summary.status} approvedValid=${summary.approvedValidRows} readyForOperator=${summary.readyForOperatorRows} missingEvidence=${summary.missingEvidenceRows} missingContext=${summary.missingContextRows} canAdvance=${summary.canAdvanceToSingleCorrectedPath}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
