import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');
const defaultCropDir = path.join(defaultReportDir, 'daegu-handoff-evidence-crops');

const PACKAGE_VERSION = 'DAEGU_P1_OPERATOR_PACKAGE_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const TARGET_PRIORITY = 'P1';
const EXPECTED = {
  rows: 29,
  manualTraceRequiredRows: 12,
  sharedCandidateBoundaryRows: 16,
  correctedPathRequiredRows: 1,
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

const isGeneratedRetraceNote = (note) => String(note ?? '').startsWith('No operator corrected path provided;');

const hasOperatorFilledEditableFields = (row) => {
  const editable = editableFieldsFrom(row);
  const hasReviewMarker = Boolean(editable.reviewer)
    || Boolean(editable.reviewedAt)
    || (Boolean(editable.operatorNote) && !isGeneratedRetraceNote(editable.operatorNote));
  const hasCorrectedGeometry = Boolean(editable.correctedPath)
    || editable.correctedLabelX !== ''
    || editable.correctedLabelY !== '';
  return hasReviewMarker || hasCorrectedGeometry;
};

const evidenceCropFor = (row, cropFiles) => {
  const match = cropFiles.find((fileName) => fileName.includes(row.id));
  if (match) return `reports/stadium/daegu-handoff-evidence-crops/${match}`;
  return '';
};

const operatorActionFor = (row) => {
  if (row.candidateStatus === 'NEEDS_MANUAL_TRACE') return 'OPERATOR_MANUAL_TRACE_REQUIRED';
  if (row.recommendedAction === 'TRACE_SHARED_CANDIDATE_BOUNDARIES') {
    return 'OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY';
  }
  return 'OPERATOR_CORRECTED_PATH_REQUIRED';
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const cropDir = path.resolve(frontendRoot, argValue('--crop-dir', defaultCropDir));
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
const batchesPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.json');
const operatorInputJsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');
const operatorInputCsvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.csv');
const checklistCsvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-checklist.csv');
const checklistMarkdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-checklist.md');
const summaryJsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-package.json');
const summaryMarkdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-package.md');

const handoff = await readJson(handoffPath);
const template = await readJson(templatePath);
const batches = await readJson(batchesPath);
const existingOperatorInput = await readOptionalJson(operatorInputJsonPath);
const cropFiles = fsSync.existsSync(cropDir) ? await fs.readdir(cropDir) : [];
const templateByBlockId = new Map((template.corrections ?? []).map((row) => [row.blockId, row]));
const existingInputRows = Array.isArray(existingOperatorInput?.corrections)
  ? existingOperatorInput.corrections
  : [];
const existingInputByBlockId = new Map(existingInputRows.map((row) => [row.blockId, row]));

const p1Rows = (handoff.workItems ?? [])
  .filter((row) => row.queuePriority === TARGET_PRIORITY)
  .sort((a, b) => String(a.block).localeCompare(String(b.block), 'ko'));

const packageRows = p1Rows.map((row) => {
  const templateRow = templateByBlockId.get(row.id) ?? {};
  const existingInputRow = existingInputByBlockId.get(row.id);
  const shouldPreserveExistingInput = hasOperatorFilledEditableFields(existingInputRow);
  const editableSourceRow = shouldPreserveExistingInput ? existingInputRow : templateRow;
  const editableFields = editableFieldsFrom(editableSourceRow);
  const candidatePath = row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath || '';
  const action = operatorActionFor(row);

  return {
    blockId: row.id,
    block: row.block,
    name: row.name,
    category: row.category,
    queuePriority: row.queuePriority,
    batchId: TARGET_BATCH_ID,
    alignmentClass: row.alignmentClass,
    candidateStatus: row.candidateStatus,
    recommendedAction: row.recommendedAction,
    operatorAction: action,
    evidenceCrop: evidenceCropFor(row, cropFiles),
    currentPath: row.currentPath,
    currentLabelX: row.labelX,
    currentLabelY: row.labelY,
    candidatePath,
    candidatePathPointCount: pointCount(candidatePath),
    candidateCenterX: row.candidateCenter?.x ?? '',
    candidateCenterY: row.candidateCenter?.y ?? '',
    candidateDuplicateGroup: row.candidateDuplicateGroup || '',
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

const p1Batch = (batches.batches ?? []).find((batch) => batch.id === TARGET_BATCH_ID);
const blockers = [];
const warnings = [];
if (p1Rows.length !== EXPECTED.rows) warnings.push(`P1_ROW_COUNT_CHANGED_AFTER_WRITES:${p1Rows.length}:${EXPECTED.rows}`);
if (!p1Batch) {
  blockers.push(`MISSING_BATCH:${TARGET_BATCH_ID}`);
} else {
  if (p1Batch.expectedRows !== EXPECTED.rows) warnings.push(`P1_BATCH_EXPECTED_ROWS_CHANGED_AFTER_WRITES:${p1Batch.expectedRows}:${EXPECTED.rows}`);
  if (!p1Batch.queuePriorities?.includes(TARGET_PRIORITY)) blockers.push(`P1_BATCH_PRIORITY_MISMATCH:${(p1Batch.queuePriorities ?? []).join(' ')}`);
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
  existingOperatorInput: path.relative(frontendRoot, operatorInputJsonPath),
  outputDirectory: path.relative(frontendRoot, p1ReportDir),
  totalRows: packageRows.length,
  expectedRows: EXPECTED.rows,
  manualTraceRequiredRows: packageRows.filter((row) => row.operatorAction === 'OPERATOR_MANUAL_TRACE_REQUIRED').length,
  sharedCandidateBoundaryRows: packageRows.filter((row) => row.operatorAction === 'OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY').length,
  correctedPathRequiredRows: packageRows.filter((row) => row.operatorAction === 'OPERATOR_CORRECTED_PATH_REQUIRED').length,
  evidenceCropRows: packageRows.filter((row) => row.evidenceCrop).length,
  approvedRows: packageRows.filter((row) => row.operatorDecision === 'APPROVED').length,
  existingInputRows: existingInputRows.length,
  preservedEditableRows: packageRows.filter((row) => row.editableSource === 'existingOperatorInput').length,
  templateEditableRows: packageRows.filter((row) => row.editableSource === 'template').length,
  requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
  baselineExpectedRows: EXPECTED.rows,
  warnings,
  blockers,
};

const expectedCounts = [
  ['P1_MANUAL_TRACE_REQUIRED_ROWS', summary.manualTraceRequiredRows, EXPECTED.manualTraceRequiredRows],
  ['P1_SHARED_CANDIDATE_BOUNDARY_ROWS', summary.sharedCandidateBoundaryRows, EXPECTED.sharedCandidateBoundaryRows],
  ['P1_CORRECTED_PATH_REQUIRED_ROWS', summary.correctedPathRequiredRows, EXPECTED.correctedPathRequiredRows],
];
expectedCounts.forEach(([label, actual, expected]) => {
  if (actual !== expected) summary.warnings.push(`${label}_CHANGED_AFTER_WRITES:${actual}:${expected}`);
});
summary.status = summary.blockers.length > 0 ? 'blocked' : 'ok';

const packageJson = {
  generatedAt: summary.generatedAt,
  packageVersion: PACKAGE_VERSION,
  targetBatchId: TARGET_BATCH_ID,
  draftOnly: false,
  productionWriteAllowed: false,
  sourceHandoff: summary.sourceHandoff,
  sourceTemplate: summary.sourceTemplate,
  existingOperatorInput: summary.existingOperatorInput,
  safetyContract: [
    'Regenerating this package must preserve operator-filled P1 editable fields from the existing operator input file.',
    'This package is not a production write path and must not promote candidate paths automatically.',
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

await fs.mkdir(p1ReportDir, { recursive: true });

await fs.writeFile(operatorInputJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

const editableCsvHeader = [
  'blockId',
  'block',
  'name',
  'batchId',
  'queuePriority',
  'operatorAction',
  'editableSource',
  'evidenceCrop',
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
  '# Daegu P1 Operator Checklist',
  '',
  `- package version: \`${PACKAGE_VERSION}\``,
  `- target batch: \`${TARGET_BATCH_ID}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- manual trace required rows: ${summary.manualTraceRequiredRows}`,
  `- shared candidate boundary rows: ${summary.sharedCandidateBoundaryRows}`,
  `- corrected path required rows: ${summary.correctedPathRequiredRows}`,
  `- evidence crop rows: ${summary.evidenceCropRows}`,
  `- preserved editable rows: ${summary.preservedEditableRows}`,
  '',
  '## Operator Rules',
  '',
  '1. P1 row는 P0 batch가 종료된 뒤 production write 대상으로 검토합니다.',
  '2. `candidatePath`는 참고용이며 운영자 승인 없이 production 좌표로 복사하지 않습니다.',
  '3. 승인하려면 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채웁니다.',
  '4. path는 단일 폐합 polygon, `M/L/Z`, 최소 6개 point 조건을 만족해야 합니다.',
  '5. package를 다시 생성해도 기존 operator input의 입력된 editable field는 보존합니다.',
  '',
  '## Rows',
  '',
  markdownTable(
    [
      'block',
      'action',
      'candidate',
      'points',
      'duplicate',
      'inside',
      'coverage',
      'failures',
      'editable source',
      'evidence crop',
    ],
    packageRows.map((row) => [
      `\`${row.block}\``,
      `\`${row.operatorAction}\``,
      `\`${row.candidateStatus}\``,
      row.candidatePathPointCount,
      row.candidateDuplicateGroup || '-',
      row.componentInsidePathRatio || '-',
      row.pathColorCoverageRatio || '-',
      row.officialFailureReasons || '-',
      `\`${row.editableSource}\``,
      row.evidenceCrop,
    ]),
  ),
  '',
  '## Editable Inputs',
  '',
  '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json`',
  '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.csv`',
  '',
].join('\n'), 'utf8');

await fs.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
await fs.writeFile(summaryMarkdownPath, [
  '# Daegu P1 Operator Package',
  '',
  `- package version: \`${PACKAGE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- target batch: \`${summary.targetBatchId}\``,
  `- rows: ${summary.totalRows}`,
  `- evidence crop rows: ${summary.evidenceCropRows}`,
  `- approved rows in package: ${summary.approvedRows}`,
  `- existing input rows: ${summary.existingInputRows}`,
  `- preserved editable rows: ${summary.preservedEditableRows}`,
  '',
  '## Outputs',
  '',
  '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json`',
  '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.csv`',
  '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-checklist.md`',
  '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-checklist.csv`',
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0
    ? markdownTable(['blocker'], summary.blockers.map((blocker) => [blocker]))
    : 'No package blockers.',
  '',
  '## Warnings',
  '',
  summary.warnings.length > 0
    ? markdownTable(['warning'], summary.warnings.map((warning) => [warning]))
    : 'No package warnings.',
  '',
].join('\n'), 'utf8');

console.log(`p1_operator_package_json:${summaryJsonPath}`);
console.log(`p1_operator_package_markdown:${summaryMarkdownPath}`);
console.log(`p1_operator_checklist_markdown:${checklistMarkdownPath}`);
console.log(`p1_operator_input_json:${operatorInputJsonPath}`);
console.log(`status:${summary.status} p1=${summary.totalRows} evidence=${summary.evidenceCropRows} approved=${summary.approvedRows}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
