import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP2DraftDir = path.join(defaultReportDir, 'daegu-p2-draft');
const defaultP2OperatorDir = path.join(defaultReportDir, 'daegu-p2-operator');

const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
const STAGING_PACKAGE_VERSION = 'DAEGU_P2_REVIEW_PACKAGE_V1';
const TARGET_BATCH_ID = 'BATCH_3_P2';
const TARGET_PRIORITY = 'P2';
const EXPECTED = {
  rows: 36,
  approvalCandidateRows: 3,
  manualRetraceRows: 33,
  labelAndHitAreaRows: 2,
  visualApprovalCandidateRows: 1,
};
const REQUIRED_APPROVAL_FIELDS = [
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
];

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

const readOptionalJson = async (filePath) => {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const pointCount = (pathData) => (
  String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.length ?? 0
) / 2;

const editableFieldsFrom = (row) => ({
  operatorDecision: String(row?.operatorDecision ?? 'PENDING').trim() || 'PENDING',
  correctedPath: String(row?.correctedPath ?? '').trim(),
  correctedLabelX: row?.correctedLabelX ?? '',
  correctedLabelY: row?.correctedLabelY ?? '',
  reviewer: String(row?.reviewer ?? '').trim(),
  reviewedAt: String(row?.reviewedAt ?? '').trim(),
  operatorNote: String(row?.operatorNote ?? '').trim(),
});

const hasOperatorFilledEditableFields = (row) => {
  const editable = editableFieldsFrom(row);
  return editable.operatorDecision !== 'PENDING'
    || Boolean(editable.correctedPath)
    || editable.correctedLabelX !== ''
    || editable.correctedLabelY !== ''
    || Boolean(editable.reviewer)
    || Boolean(editable.reviewedAt)
    || Boolean(editable.operatorNote);
};

const operatorActionFor = (stagingRow) => {
  if (stagingRow?.requiredOperatorReview === 'MANUAL_RETRACE_REQUIRED') {
    return 'OPERATOR_MANUAL_TRACE_REQUIRED';
  }
  if (stagingRow?.requiredOperatorReview === 'LABEL_AND_HIT_AREA_REVIEW') {
    return 'OPERATOR_LABEL_AND_HIT_AREA_REVIEW';
  }
  return 'OPERATOR_VISUAL_APPROVAL_CANDIDATE';
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const p2DraftDir = path.resolve(frontendRoot, argValue('--p2-draft-dir', defaultP2DraftDir));
const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
const batchesPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.json');
const reviewPackagePath = path.join(p2DraftDir, 'daegu-seatmap-p2-review-package.json');
const approvalCandidatesPath = path.join(p2DraftDir, 'daegu-seatmap-p2-operator-approval-candidates.json');
const manualRetracePath = path.join(p2DraftDir, 'daegu-seatmap-p2-manual-retrace-template.json');
const operatorInputJsonPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');
const operatorInputCsvPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.csv');
const checklistCsvPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-checklist.csv');
const checklistMarkdownPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-checklist.md');
const summaryJsonPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-package.json');
const summaryMarkdownPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-package.md');

const handoff = await readJson(handoffPath);
const template = await readJson(templatePath);
const batches = await readJson(batchesPath);
const reviewPackage = await readJson(reviewPackagePath);
const approvalCandidates = await readJson(approvalCandidatesPath);
const manualRetrace = await readJson(manualRetracePath);
const existingOperatorInput = await readOptionalJson(operatorInputJsonPath);
const currentExpected = {
  rows: Number(reviewPackage.p2Rows ?? 0),
  approvalCandidateRows: Number(reviewPackage.labelAndHitAreaReview ?? 0)
    + Number(reviewPackage.visualApprovalCandidates ?? 0),
  manualRetraceRows: Number(reviewPackage.manualRetraceRequired ?? 0),
  labelAndHitAreaRows: Number(reviewPackage.labelAndHitAreaReview ?? 0),
  visualApprovalCandidateRows: Number(reviewPackage.visualApprovalCandidates ?? 0),
};

const approvalRows = Array.isArray(approvalCandidates.corrections) ? approvalCandidates.corrections : [];
const manualRows = Array.isArray(manualRetrace.corrections) ? manualRetrace.corrections : [];
const stagingRows = [
  ...approvalRows.map((row) => ({ ...row, stagingBucket: 'APPROVAL_CANDIDATE' })),
  ...manualRows.map((row) => ({ ...row, stagingBucket: 'MANUAL_RETRACE' })),
];
const stagingByBlockId = new Map(stagingRows.map((row) => [row.blockId, row]));
const templateByBlockId = new Map((template.corrections ?? []).map((row) => [row.blockId, row]));
const existingInputRows = Array.isArray(existingOperatorInput?.corrections)
  ? existingOperatorInput.corrections
  : [];
const existingInputByBlockId = new Map(existingInputRows.map((row) => [row.blockId, row]));

const p2Rows = (handoff.workItems ?? [])
  .filter((row) => row.queuePriority === TARGET_PRIORITY)
  .sort((a, b) => String(a.block).localeCompare(String(b.block), 'ko'));

const packageRows = p2Rows.map((row) => {
  const stagingRow = stagingByBlockId.get(row.id) ?? {};
  const templateRow = templateByBlockId.get(row.id) ?? {};
  const existingInputRow = existingInputByBlockId.get(row.id);
  const shouldPreserveExistingInput = hasOperatorFilledEditableFields(existingInputRow);
  const editableSourceRow = shouldPreserveExistingInput ? existingInputRow : templateRow;
  const editableFields = editableFieldsFrom(editableSourceRow);
  const candidatePath = stagingRow.correctedPath || row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath || '';
  const candidateLabelX = stagingRow.correctedLabelX ?? row.candidateCenter?.x ?? '';
  const candidateLabelY = stagingRow.correctedLabelY ?? row.candidateCenter?.y ?? '';

  return {
    blockId: row.id,
    block: row.block,
    name: row.name,
    category: row.category,
    queuePriority: row.queuePriority,
    batchId: TARGET_BATCH_ID,
    alignmentClass: row.alignmentClass,
    candidateStatus: row.candidateStatus,
    candidateDuplicateGroup: row.candidateDuplicateGroup || '',
    recommendedAction: row.recommendedAction,
    requiredOperatorReview: stagingRow.requiredOperatorReview || '',
    operatorAction: operatorActionFor(stagingRow),
    stagingBucket: stagingRow.stagingBucket || '',
    evidenceCrop: stagingRow.evidenceCrop || '',
    currentPath: row.currentPath,
    currentLabelX: row.labelX,
    currentLabelY: row.labelY,
    candidatePath,
    candidatePathPointCount: pointCount(candidatePath),
    candidateLabelX,
    candidateLabelY,
    candidateDuplicateIds: row.candidateDuplicateIds || '',
    componentInsidePathRatio: row.componentInsidePathRatio ?? '',
    pathColorCoverageRatio: row.pathColorCoverageRatio ?? '',
    officialFailureReasons: (row.officialFailureReasons ?? []).join('; '),
    riskFlags: (row.riskFlags ?? []).join('; '),
    editableSource: shouldPreserveExistingInput ? 'existingOperatorInput' : 'template',
    operatorDecision: editableFields.operatorDecision,
    correctedPath: editableFields.correctedPath,
    correctedLabelX: editableFields.correctedLabelX,
    correctedLabelY: editableFields.correctedLabelY,
    reviewer: editableFields.reviewer,
    reviewedAt: editableFields.reviewedAt,
    operatorNote: editableFields.operatorNote,
  };
});

const p2Batch = (batches.batches ?? []).find((batch) => batch.id === TARGET_BATCH_ID);
const blockers = [];
if (reviewPackage.packageVersion !== STAGING_PACKAGE_VERSION) {
  blockers.push(`STAGING_PACKAGE_VERSION_MISMATCH:${reviewPackage.packageVersion ?? ''}`);
}
if (reviewPackage.status !== 'ok') blockers.push(`STAGING_PACKAGE_STATUS_NOT_OK:${reviewPackage.status ?? ''}`);
if (p2Rows.length !== currentExpected.rows) blockers.push(`P2_ROW_COUNT_CHANGED:${p2Rows.length}:${currentExpected.rows}`);
if (!p2Batch) {
  blockers.push(`MISSING_BATCH:${TARGET_BATCH_ID}`);
} else {
  if (!p2Batch.queuePriorities?.includes(TARGET_PRIORITY)) blockers.push(`P2_BATCH_PRIORITY_MISMATCH:${(p2Batch.queuePriorities ?? []).join(' ')}`);
}
if (approvalCandidates.stagingOnly !== true) blockers.push('APPROVAL_CANDIDATES_NOT_STAGING_ONLY');
if (manualRetrace.stagingOnly !== true) blockers.push('MANUAL_RETRACE_NOT_STAGING_ONLY');
if (approvalRows.length !== currentExpected.approvalCandidateRows) {
  blockers.push(`APPROVAL_CANDIDATE_ROWS:${approvalRows.length}!=${currentExpected.approvalCandidateRows}`);
}
if (manualRows.length !== currentExpected.manualRetraceRows) {
  blockers.push(`MANUAL_RETRACE_ROWS:${manualRows.length}!=${currentExpected.manualRetraceRows}`);
}

const missingStagingRows = p2Rows.filter((row) => !stagingByBlockId.has(row.id));
if (missingStagingRows.length > 0) {
  blockers.push(`MISSING_P2_STAGING_ROWS:${missingStagingRows.map((row) => row.block).join(' ')}`);
}
const missingEvidenceRows = packageRows.filter((row) => !row.evidenceCrop);
if (missingEvidenceRows.length > 0) {
  blockers.push(`MISSING_EVIDENCE_CROPS:${missingEvidenceRows.map((row) => row.block).join(' ')}`);
}

const summary = {
  packageVersion: PACKAGE_VERSION,
  status: blockers.length > 0 ? 'blocked' : 'ok',
  targetBatchId: TARGET_BATCH_ID,
  targetPriority: TARGET_PRIORITY,
  generatedAt: new Date().toISOString(),
  sourceHandoff: path.relative(frontendRoot, handoffPath),
  sourceTemplate: path.relative(frontendRoot, templatePath),
  sourceBatches: path.relative(frontendRoot, batchesPath),
  sourceReviewPackage: path.relative(frontendRoot, reviewPackagePath),
  sourceApprovalCandidates: path.relative(frontendRoot, approvalCandidatesPath),
  sourceManualRetrace: path.relative(frontendRoot, manualRetracePath),
  existingOperatorInput: path.relative(frontendRoot, operatorInputJsonPath),
  outputDirectory: path.relative(frontendRoot, p2OperatorDir),
  totalRows: packageRows.length,
  baselineExpectedRows: EXPECTED.rows,
  expectedRows: currentExpected.rows,
  approvalCandidateRows: packageRows.filter((row) => row.stagingBucket === 'APPROVAL_CANDIDATE').length,
  manualRetraceRows: packageRows.filter((row) => row.stagingBucket === 'MANUAL_RETRACE').length,
  labelAndHitAreaRows: packageRows.filter((row) => row.requiredOperatorReview === 'LABEL_AND_HIT_AREA_REVIEW').length,
  visualApprovalCandidateRows: packageRows.filter((row) => row.requiredOperatorReview === 'VISUAL_APPROVAL_CANDIDATE').length,
  evidenceCropRows: packageRows.filter((row) => row.evidenceCrop).length,
  candidatePathReferenceRows: packageRows.filter((row) => row.candidatePath).length,
  approvedRows: packageRows.filter((row) => row.operatorDecision === 'APPROVED').length,
  existingInputRows: existingInputRows.length,
  preservedEditableRows: packageRows.filter((row) => row.editableSource === 'existingOperatorInput').length,
  templateEditableRows: packageRows.filter((row) => row.editableSource === 'template').length,
  requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
  blockers,
};

const expectedCounts = [
  ['P2_APPROVAL_CANDIDATE_ROWS', summary.approvalCandidateRows, currentExpected.approvalCandidateRows],
  ['P2_MANUAL_RETRACE_ROWS', summary.manualRetraceRows, currentExpected.manualRetraceRows],
  ['P2_LABEL_AND_HIT_AREA_ROWS', summary.labelAndHitAreaRows, currentExpected.labelAndHitAreaRows],
  ['P2_VISUAL_APPROVAL_CANDIDATE_ROWS', summary.visualApprovalCandidateRows, currentExpected.visualApprovalCandidateRows],
];
expectedCounts.forEach(([label, actual, expected]) => {
  if (actual !== expected) summary.blockers.push(`${label}:${actual}!=${expected}`);
});
summary.status = summary.blockers.length > 0 ? 'blocked' : 'ok';

const packageJson = {
  generatedAt: summary.generatedAt,
  packageVersion: PACKAGE_VERSION,
  targetBatchId: TARGET_BATCH_ID,
  draftOnly: false,
  productionWriteAllowed: false,
  sourceHandoff: summary.sourceHandoff,
  sourceReviewPackage: summary.sourceReviewPackage,
  sourceApprovalCandidates: summary.sourceApprovalCandidates,
  sourceManualRetrace: summary.sourceManualRetrace,
  existingOperatorInput: summary.existingOperatorInput,
  safetyContract: [
    'Regenerating this package must preserve operator-filled P2 editable fields from the existing operator input file.',
    'Candidate paths in this package are references only and must not be promoted automatically.',
    'This package is not a production write path.',
  ],
  correctionContract: {
    coordinateSystem: 'official PNG 1707x2048',
    pathRules: ['single closed polygon', 'M/L/Z only', 'minimum 6 polygon points'],
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    noCoordinateInference: true,
    noExternalCrawlingOrWebSearch: true,
  },
  corrections: packageRows,
};

await fs.mkdir(p2OperatorDir, { recursive: true });
await fs.writeFile(operatorInputJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

const editableCsvHeader = [
  'blockId',
  'block',
  'name',
  'batchId',
  'queuePriority',
  'operatorAction',
  'requiredOperatorReview',
  'stagingBucket',
  'editableSource',
  'evidenceCrop',
  'candidatePath',
  'candidateLabelX',
  'candidateLabelY',
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'operatorNote',
];
await writeCsv(operatorInputCsvPath, [
  editableCsvHeader,
  ...packageRows.map((row) => editableCsvHeader.map((key) => row[key])),
]);

const checklistCsvHeader = [
  'block',
  'blockId',
  'operatorAction',
  'requiredOperatorReview',
  'stagingBucket',
  'candidateStatus',
  'recommendedAction',
  'candidatePathPointCount',
  'candidateDuplicateGroup',
  'componentInsidePathRatio',
  'pathColorCoverageRatio',
  'officialFailureReasons',
  'riskFlags',
  'editableSource',
  'evidenceCrop',
];
await writeCsv(checklistCsvPath, [
  checklistCsvHeader,
  ...packageRows.map((row) => checklistCsvHeader.map((key) => row[key])),
]);

await fs.writeFile(checklistMarkdownPath, [
  '# Daegu P2 Operator Checklist',
  '',
  `- package version: \`${PACKAGE_VERSION}\``,
  `- target batch: \`${TARGET_BATCH_ID}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- approval candidate rows: ${summary.approvalCandidateRows}`,
  `- manual retrace rows: ${summary.manualRetraceRows}`,
  `- label and hit area rows: ${summary.labelAndHitAreaRows}`,
  `- visual approval candidate rows: ${summary.visualApprovalCandidateRows}`,
  `- candidate path reference rows: ${summary.candidatePathReferenceRows}`,
  `- preserved editable rows: ${summary.preservedEditableRows}`,
  '',
  '## Operator Rules',
  '',
  '1. P2 row는 P0/P1 batch가 종료된 뒤 production write 대상으로 검토합니다.',
  '2. `candidatePath` / `candidateLabelX` / `candidateLabelY`는 참고용이며 운영자 승인 없이 `corrected*` field로 복사하지 않습니다.',
  '3. 승인하려면 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채웁니다.',
  '4. manual retrace row는 corrected fields가 비어 있어야 하며 운영자가 새 path를 직접 작성해야 합니다.',
  '5. package를 다시 생성해도 기존 operator input의 입력된 editable field는 보존합니다.',
  '',
  '## Rows',
  '',
  markdownTable(
    [
      'block',
      'action',
      'review',
      'bucket',
      'points',
      'duplicate',
      'failures',
      'editable source',
      'evidence crop',
    ],
    packageRows.map((row) => [
      `\`${row.block}\``,
      `\`${row.operatorAction}\``,
      `\`${row.requiredOperatorReview || '-'}\``,
      `\`${row.stagingBucket || '-'}\``,
      row.candidatePathPointCount,
      row.candidateDuplicateGroup || '-',
      row.officialFailureReasons || '-',
      `\`${row.editableSource}\``,
      row.evidenceCrop,
    ]),
  ),
  '',
  '## Editable Inputs',
  '',
  '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json`',
  '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.csv`',
  '',
].join('\n'), 'utf8');

await fs.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
await fs.writeFile(summaryMarkdownPath, [
  '# Daegu P2 Operator Package',
  '',
  `- package version: \`${PACKAGE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- target batch: \`${summary.targetBatchId}\``,
  `- rows: ${summary.totalRows}`,
  `- approval candidate rows: ${summary.approvalCandidateRows}`,
  `- manual retrace rows: ${summary.manualRetraceRows}`,
  `- approved rows in package: ${summary.approvedRows}`,
  `- existing input rows: ${summary.existingInputRows}`,
  `- preserved editable rows: ${summary.preservedEditableRows}`,
  '',
  '## Outputs',
  '',
  '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json`',
  '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.csv`',
  '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-checklist.md`',
  '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-checklist.csv`',
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0
    ? markdownTable(['blocker'], summary.blockers.map((blocker) => [blocker]))
    : 'No package blockers.',
  '',
].join('\n'), 'utf8');

console.log(`p2_operator_package_json:${summaryJsonPath}`);
console.log(`p2_operator_package_markdown:${summaryMarkdownPath}`);
console.log(`p2_operator_checklist_markdown:${checklistMarkdownPath}`);
console.log(`p2_operator_input_json:${operatorInputJsonPath}`);
console.log(`status:${summary.status} p2=${summary.totalRows} approvalCandidates=${summary.approvalCandidateRows} manualRetrace=${summary.manualRetraceRows} approved=${summary.approvedRows}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
