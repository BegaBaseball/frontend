import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

const PACKET_VERSION = 'DAEGU_P1_NEXT_OPERATOR_PACKET_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';

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

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const pendingRowSort = (a, b) => {
  const priority = (row) => {
    if (row.operatorActionSource === 'OPERATOR_CORRECTED_PATH_REQUIRED') return 1;
    if (row.operatorActionSource === 'OPERATOR_MANUAL_TRACE_REQUIRED') return 2;
    return 3;
  };
  return priority(a) - priority(b) || a.block.localeCompare(b.block, 'ko');
};

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const nextActionPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.json');
const precisionWorksetPath = path.join(p1ReportDir, 'daegu-seatmap-p1-precision-workset.json');
const inputPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');
const readinessPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-readiness.json');
const t3vReadinessPath = path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness.json');
const t3vWarningBoardPath = path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.json');
const t3vApprovalGatePath = path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate.json');
const t3vDryRunPath = path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approved-dry-run.json');

const nextAction = await readJson(nextActionPath);
const precisionWorkset = await readJson(precisionWorksetPath);
const input = await readJson(inputPath);
const readiness = await readOptionalJson(readinessPath);
const t3vReadiness = await readOptionalJson(t3vReadinessPath);
const t3vWarningBoard = await readOptionalJson(t3vWarningBoardPath);
const t3vApprovalGate = await readOptionalJson(t3vApprovalGatePath);
const t3vDryRun = await readOptionalJson(t3vDryRunPath);

const nextActionRows = Array.isArray(nextAction.rows) ? nextAction.rows : [];
const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
const precisionRows = Array.isArray(precisionWorkset.rows) ? precisionWorkset.rows : [];
const precisionByBlockId = new Map(precisionRows.map((row) => [row.blockId, row]));

const rows = nextActionRows.map((row) => {
  const inputRow = inputByBlockId.get(row.blockId) ?? {};
  const precisionRow = precisionByBlockId.get(row.blockId) ?? {};
  return {
    ...row,
    decision: normalizeDecision(row.decision),
    operatorActionSource: inputRow.operatorAction ?? '',
    recommendedActionSource: inputRow.recommendedAction ?? '',
    candidateStatus: inputRow.candidateStatus ?? '',
    currentPath: inputRow.currentPath ?? '',
    currentLabel: [inputRow.currentLabelX, inputRow.currentLabelY].filter((value) => value !== undefined && value !== '').join(','),
    candidatePath: inputRow.candidatePath ?? '',
    candidatePathPointCount: inputRow.candidatePathPointCount ?? '',
    candidateCenter: [inputRow.candidateCenterX, inputRow.candidateCenterY].filter((value) => value !== undefined && value !== '').join(','),
    precisionWorkOrderGroup: precisionRow.precisionWorkOrderGroup ?? '',
    blockingFlags: Array.isArray(precisionRow.blockingFlags) ? precisionRow.blockingFlags : [],
    emptyOperatorFields: Array.isArray(precisionRow.emptyOperatorFields) ? precisionRow.emptyOperatorFields : [],
  };
});

const boundaryApprovedRows = rows.filter((row) => row.stage === 'PAIR_BOUNDARY_FIRST' && row.decision === 'APPROVED');
const correctedPathRows = rows
  .filter((row) => row.stage === 'SINGLE_CORRECTED_PATH' && row.decision === 'PENDING')
  .sort(pendingRowSort);
const deferredDuplicateRows = rows
  .filter((row) => row.stage === 'DUPLICATE_CANDIDATE_SPLIT' && row.decision === 'PENDING')
  .sort((a, b) => a.block.localeCompare(b.block, 'ko'));
const nextSourceInputRow = correctedPathRows[0] ?? null;

const missingFiles = [
  ['t3vCandidateReadiness', t3vReadinessPath, t3vReadiness],
  ['t3vWarningBoard', t3vWarningBoardPath, t3vWarningBoard],
  ['t3vApprovalGate', t3vApprovalGatePath, t3vApprovalGate],
  ['t3vApprovedDryRun', t3vDryRunPath, t3vDryRun],
].filter(([, , data]) => !data);

const packetBlockers = [];
if (nextAction.summary?.packetVersion !== 'DAEGU_P1_NEXT_ACTION_PACKET_V1') {
  packetBlockers.push(`NEXT_ACTION_PACKET_VERSION_MISMATCH:${nextAction.summary?.packetVersion ?? ''}`);
}
if (nextAction.summary?.targetBatchId !== TARGET_BATCH_ID) {
  packetBlockers.push(`NEXT_ACTION_BATCH_MISMATCH:${nextAction.summary?.targetBatchId ?? ''}`);
}
if (precisionWorkset.summary?.worksetVersion !== 'DAEGU_P1_PRECISION_WORKSET_V1') {
  packetBlockers.push(`PRECISION_WORKSET_VERSION_MISMATCH:${precisionWorkset.summary?.worksetVersion ?? ''}`);
}
if (input.targetBatchId !== TARGET_BATCH_ID) packetBlockers.push(`P1_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (input.productionWriteAllowed !== false) packetBlockers.push('P1_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
missingFiles.forEach(([label, filePath]) => {
  packetBlockers.push(`MISSING_RELABEL_OWNERSHIP_REPORT:${label}:${path.relative(frontendRoot, filePath)}`);
});

const relabelOwnership = {
  status: t3vApprovalGate?.summary?.status ?? t3vApprovalGate?.status ?? 'missing',
  candidateReadinessStatus: t3vReadiness?.summary?.status ?? t3vReadiness?.status ?? 'missing',
  warningBoardStatus: t3vWarningBoard?.summary?.status ?? t3vWarningBoard?.status ?? 'missing',
  approvedDryRunStatus: t3vDryRun?.summary?.status ?? t3vDryRun?.status ?? 'missing',
  approvedRows: t3vApprovalGate?.summary?.approvedRows ?? t3vApprovalGate?.approvedRows ?? 0,
  validApprovedRows: t3vApprovalGate?.summary?.validApprovedRows ?? t3vApprovalGate?.validApprovedRows ?? 0,
  blockers: [
    ...(t3vReadiness?.summary?.blockers ?? t3vReadiness?.blockers ?? []),
    ...(t3vWarningBoard?.summary?.blockers ?? t3vWarningBoard?.blockers ?? []),
    ...(t3vApprovalGate?.summary?.blockers ?? t3vApprovalGate?.blockers ?? []),
    ...(t3vDryRun?.summary?.blockers ?? t3vDryRun?.blockers ?? []),
  ],
  warnings: [
    ...(t3vReadiness?.summary?.warnings ?? t3vReadiness?.warnings ?? []),
    ...(t3vWarningBoard?.summary?.warnings ?? t3vWarningBoard?.warnings ?? []),
    ...(t3vApprovalGate?.summary?.warnings ?? t3vApprovalGate?.warnings ?? []),
    ...(t3vDryRun?.summary?.warnings ?? t3vDryRun?.warnings ?? []),
  ],
  reportPaths: {
    candidateReadiness: path.relative(frontendRoot, t3vReadinessPath),
    warningReviewBoard: path.relative(frontendRoot, t3vWarningBoardPath),
    approvalInputGate: path.relative(frontendRoot, t3vApprovalGatePath),
    approvedDryRun: path.relative(frontendRoot, t3vDryRunPath),
  },
};

const safetyContract = [
  'This packet is read-only.',
  'It does not write operatorDecision, corrected fields, the corrections template, or production seat data.',
  'Use only the operator-provided correctedPath and corrected label point for approval.',
  'Do not copy currentPath or candidatePath into correctedPath without manual review.',
  'Do not infer coordinates from external data, crawling, or web search.',
  'Production promotion remains blocked until validation, import, readiness, and postwrite gates pass.',
];

const summary = {
  packetVersion: PACKET_VERSION,
  status: packetBlockers.length > 0 ? 'blocked' : 'waiting-for-operator',
  targetBatchId: TARGET_BATCH_ID,
  generatedFrom: {
    nextActionPacket: path.relative(frontendRoot, nextActionPath),
    precisionWorkset: path.relative(frontendRoot, precisionWorksetPath),
    sourceInput: path.relative(frontendRoot, inputPath),
    operatorReadiness: path.relative(frontendRoot, readinessPath),
  },
  p1GateState: {
    readinessStatus: readiness?.summary?.status ?? 'missing',
    readyForTemplateImport: readiness?.summary?.readyForTemplateImport === true,
    pendingRows: readiness?.summary?.pendingRows ?? rows.filter((row) => row.decision === 'PENDING').length,
    approvedRows: readiness?.summary?.approvedRows ?? rows.filter((row) => row.decision === 'APPROVED').length,
    validApprovedRows: readiness?.summary?.validApprovedRows ?? 0,
    boundaryApprovedRows: boundaryApprovedRows.length,
    correctedPathPendingRows: correctedPathRows.length,
    deferredDuplicateSplitRows: deferredDuplicateRows.length,
    blockers: readiness?.summary?.blockers ?? [],
  },
  nextSourceInputRow: nextSourceInputRow
    ? {
      block: nextSourceInputRow.block,
      blockId: nextSourceInputRow.blockId,
      stage: nextSourceInputRow.stage,
      operatorActionSource: nextSourceInputRow.operatorActionSource,
      evidenceCrop: nextSourceInputRow.evidenceCrop,
      sourceInput: nextSourceInputRow.sourceInput,
      requiredApprovalFields: nextSourceInputRow.requiredApprovalFields,
    }
    : null,
  relabelOwnership,
  correctedPathRows: correctedPathRows.length,
  deferredDuplicateSplitRows: deferredDuplicateRows.length,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers: packetBlockers,
  warnings: [],
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract,
  boundaryApprovedRows,
  correctedPathRows,
  deferredDuplicateRows,
  relabelOwnership,
  nextCommands: [
    'npm run stadium:daegu:p1-operator-validate',
    'npm run stadium:daegu:p1-operator-import',
    'npm run stadium:daegu:p1-operator-readiness',
    'npm run stadium:daegu:p1-operator-prewrite-gate',
  ],
};

const jsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-operator-packet.json');
const csvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-operator-packet.csv');
const markdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-operator-packet.md');

await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

await writeCsv(csvPath, [
  [
    'section',
    'priority',
    'block',
    'blockId',
    'stage',
    'decision',
    'operatorActionSource',
    'operatorAction',
    'evidenceCrop',
    'sourceInput',
    'requiredApprovalFields',
    'blockers',
  ],
  ...correctedPathRows.map((row, index) => [
    'corrected-path-next',
    index + 1,
    row.block,
    row.blockId,
    row.stage,
    row.decision,
    row.operatorActionSource,
    row.operatorAction,
    row.evidenceCrop,
    row.sourceInput,
    (row.requiredApprovalFields ?? []).join(' | '),
    row.blockingFlags.join(' | '),
  ]),
  ...deferredDuplicateRows.map((row, index) => [
    'deferred-duplicate-split',
    index + 1,
    row.block,
    row.blockId,
    row.stage,
    row.decision,
    row.operatorActionSource,
    row.operatorAction,
    row.evidenceCrop,
    row.sourceInput,
    (row.requiredApprovalFields ?? []).join(' | '),
    row.blockingFlags.join(' | '),
  ]),
]);

const markdown = [
  '# Daegu P1 Next Operator Packet',
  '',
  `- status: \`${summary.status}\``,
  `- target batch: \`${TARGET_BATCH_ID}\``,
  `- source input: \`${summary.generatedFrom.sourceInput}\``,
  `- P1 gate: \`${summary.p1GateState.readinessStatus}\`, pending=${summary.p1GateState.pendingRows}, approved=${summary.p1GateState.approvedRows}, validApproved=${summary.p1GateState.validApprovedRows}`,
  `- corrected-path rows to fill next: ${summary.correctedPathRows}`,
  `- deferred duplicate-split rows: ${summary.deferredDuplicateSplitRows}`,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Current Gate State',
  '',
  markdownTable(
    ['gate', 'status', 'detail'],
    [
      ['boundary-first P1 source input', 'approved', `approved blocks=${boundaryApprovedRows.map((row) => row.block).join(' ')}`],
      ['P1 operator readiness', summary.p1GateState.readinessStatus, (summary.p1GateState.blockers ?? []).join('; ') || 'no blockers'],
      ['T3/V relabel approval input', relabelOwnership.status, `approved=${relabelOwnership.approvedRows}, validApproved=${relabelOwnership.validApprovedRows}`],
      ['T3/V warning review board', relabelOwnership.warningBoardStatus, relabelOwnership.blockers.join('; ') || 'no blockers'],
    ],
  ),
  '',
  '## Corrected Path Rows',
  '',
  markdownTable(
    ['priority', 'block', 'source action', 'operator packet action', 'evidence crop', 'required fields'],
    correctedPathRows.map((row, index) => [
      index + 1,
      row.block,
      row.operatorActionSource,
      row.operatorAction,
      row.evidenceCrop,
      (row.requiredApprovalFields ?? []).join('<br>'),
    ]),
  ),
  '',
  '## Relabel Ownership Blocker',
  '',
  markdownTable(
    ['report', 'status', 'blockers or warnings'],
    [
      ['candidate approval readiness', relabelOwnership.candidateReadinessStatus, (t3vReadiness?.summary?.blockers ?? t3vReadiness?.blockers ?? []).join('; ')],
      ['warning review board', relabelOwnership.warningBoardStatus, (t3vWarningBoard?.summary?.blockers ?? t3vWarningBoard?.blockers ?? []).join('; ')],
      ['approval input gate', relabelOwnership.status, (t3vApprovalGate?.summary?.blockers ?? t3vApprovalGate?.blockers ?? []).join('; ')],
      ['approved dry-run', relabelOwnership.approvedDryRunStatus, (t3vDryRun?.summary?.blockers ?? t3vDryRun?.blockers ?? []).join('; ')],
    ],
  ),
  '',
  '## Deferred Duplicate Split Rows',
  '',
  markdownTable(
    ['block', 'duplicate group', 'peer blocks', 'evidence crop'],
    deferredDuplicateRows.map((row) => [
      row.block,
      row.duplicateGroup,
      row.duplicatePeerBlocks,
      row.evidenceCrop,
    ]),
  ),
  '',
  '## Safety Contract',
  '',
  ...safetyContract.map((item) => `- ${item}`),
  '',
  '## Next Commands After Operator Input',
  '',
  ...report.nextCommands.map((command) => `- \`${command}\``),
  '',
].join('\n');

await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(
  [
    `status:${summary.status}`,
    `correctedPathRows=${summary.correctedPathRows}`,
    `next=${summary.nextSourceInputRow?.block ?? 'none'}`,
    `deferredDuplicateSplitRows=${summary.deferredDuplicateSplitRows}`,
    `relabelOwnership=${summary.relabelOwnership.status}`,
    `json=${path.relative(frontendRoot, jsonPath)}`,
    `markdown=${path.relative(frontendRoot, markdownPath)}`,
  ].join(' '),
);

if (summary.status === 'blocked') process.exitCode = 1;
