import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

const ENTRY_SHEET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_SHEET_V1';
const REVIEW_BOARD_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_REVIEW_BOARD_V1';
const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const EXPECTED_BLOCKS = ['T1-1', 'T3-2', 'V1', 'V2', 'V3'];
const EXPECTED_BLOCK_IDS = [
  'daegu-first-table-t1-1',
  'daegu-third-table-t3-2',
  'daegu-central-table-v-v1',
  'daegu-central-table-v-v2',
  'daegu-central-table-v-v3',
];
const REQUIRED_APPROVAL_FIELDS = [
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedLabelX/Y',
  'reviewer',
  'reviewedAt',
];

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

const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

const isBlank = (value) => String(value ?? '').trim() === '';

const hasFilledCorrectedLabel = (row) => !isBlank(row?.correctedLabelX) && !isBlank(row?.correctedLabelY);

const missingApprovalFieldsFor = (templateRow) => {
  const missing = [];
  if (normalizeDecision(templateRow?.operatorDecision) !== 'APPROVED') missing.push('operatorDecision=APPROVED');
  if (isBlank(templateRow?.correctedPath)) missing.push('correctedPath');
  if (!hasFilledCorrectedLabel(templateRow)) missing.push('correctedLabelX/Y');
  if (isBlank(templateRow?.reviewer)) missing.push('reviewer');
  if (isBlank(templateRow?.reviewedAt)) missing.push('reviewedAt');
  return missing;
};

const fieldStatus = (missingFields, fieldName) => missingFields.includes(fieldName) ? 'missing' : 'filled';

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
const reviewBoardPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-review-board.json');
const templatePath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-operator-template.json');

const reviewBoard = await readJson(reviewBoardPath);
const template = await readJson(templatePath);
const reviewRows = Array.isArray(reviewBoard.rows) ? reviewBoard.rows : [];
const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
const reviewByBlockId = new Map(reviewRows.map((row) => [row.blockId, row]));
const templateByBlockId = new Map(templateRows.map((row) => [row.blockId, row]));
const blockers = [];
const warnings = [];

if (reviewBoard.summary?.reviewBoardVersion !== REVIEW_BOARD_VERSION) {
  blockers.push(`REVIEW_BOARD_VERSION_MISMATCH:${reviewBoard.summary?.reviewBoardVersion ?? ''}`);
}
if (template.templateVersion !== TEMPLATE_VERSION) {
  blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
}
if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
if (template.templateOnly !== true) blockers.push('TEMPLATE_ONLY_NOT_TRUE');
if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if ((reviewBoard.summary?.blockers ?? []).length > 0) blockers.push('REVIEW_BOARD_HAS_BLOCKERS');

const templateBlocks = templateRows.map((row) => row.block);
const templateBlockIds = templateRows.map((row) => row.blockId);
if (templateRows.length !== EXPECTED_BLOCKS.length) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED_BLOCKS.length}`);
if (templateBlocks.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`TEMPLATE_BLOCK_ORDER_MISMATCH:${templateBlocks.join(' ')}`);
if (templateBlockIds.join(' ') !== EXPECTED_BLOCK_IDS.join(' ')) blockers.push(`TEMPLATE_BLOCK_ID_ORDER_MISMATCH:${templateBlockIds.join(' ')}`);

const rows = EXPECTED_BLOCK_IDS.map((blockId, index) => {
  const templateRow = templateByBlockId.get(blockId) ?? {};
  const reviewRow = reviewByBlockId.get(blockId) ?? {};
  const missingOperatorInputFields = missingApprovalFieldsFor(templateRow);
  const labelPoint = hasFilledCorrectedLabel(templateRow)
    ? `${templateRow.correctedLabelX},${templateRow.correctedLabelY}`
    : '';
  const editableTarget = `corrections[${index}]`;

  if (!templateRow.blockId) blockers.push(`ENTRY_TEMPLATE_ROW_MISSING:${blockId}`);
  if (!reviewRow.blockId) blockers.push(`ENTRY_REVIEW_ROW_MISSING:${blockId}`);
  if (reviewRow.evidenceCropExists === false) blockers.push(`ENTRY_EVIDENCE_CROP_MISSING:${reviewRow.block ?? blockId}`);
  if (Array.isArray(reviewRow.approvalMissingFields)
    && reviewRow.approvalMissingFields.join(' ') !== missingOperatorInputFields.join(' ')) {
    warnings.push(`ENTRY_REVIEW_BOARD_MISSING_FIELDS_STALE:${reviewRow.block ?? blockId}`);
  }

  return {
    entrySheetVersion: ENTRY_SHEET_VERSION,
    rowNumber: index + 1,
    blockId,
    block: templateRow.block ?? reviewRow.block ?? EXPECTED_BLOCKS[index],
    name: templateRow.name ?? reviewRow.name ?? '',
    category: templateRow.category ?? reviewRow.category ?? '',
    editableTarget,
    templateJsonPointer: `/corrections/${index}`,
    templateEditableSource: templateRow.editableSource ?? reviewRow.templateEditableSource ?? '',
    operatorTemplate: path.relative(frontendRoot, templatePath),
    reviewBoard: path.relative(frontendRoot, reviewBoardPath),
    evidenceCrop: templateRow.evidenceCrop ?? reviewRow.evidenceCrop ?? '',
    pairedBlocks: Array.isArray(reviewRow.pairedBlocks) ? reviewRow.pairedBlocks : [],
    currentDecision: normalizeDecision(templateRow.operatorDecision),
    currentCorrectedPathFilled: !isBlank(templateRow.correctedPath),
    currentCorrectedPathPointCount: String(templateRow.correctedPath ?? '').match(/-?\d+(?:\.\d+)?/g)?.length / 2 || 0,
    currentCorrectedLabelPoint: labelPoint,
    currentReviewer: String(templateRow.reviewer ?? '').trim(),
    currentReviewedAt: String(templateRow.reviewedAt ?? '').trim(),
    currentOperatorNoteFilled: !isBlank(templateRow.operatorNote),
    missingOperatorInputFields,
    fieldChecklist: {
      'operatorDecision=APPROVED': fieldStatus(missingOperatorInputFields, 'operatorDecision=APPROVED'),
      correctedPath: fieldStatus(missingOperatorInputFields, 'correctedPath'),
      'correctedLabelX/Y': fieldStatus(missingOperatorInputFields, 'correctedLabelX/Y'),
      reviewer: fieldStatus(missingOperatorInputFields, 'reviewer'),
      reviewedAt: fieldStatus(missingOperatorInputFields, 'reviewedAt'),
    },
    nextOperatorAction: missingOperatorInputFields.length === 0
      ? 'Run npm run stadium:daegu:p1-boundary-first-template-gate.'
      : `Fill ${missingOperatorInputFields.join(', ')} in ${editableTarget} of daegu-seatmap-p1-boundary-first-operator-template.json.`,
    candidatePathPolicy: 'candidatePath is reference-only and must not be copied into correctedPath.',
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    nextGateCommand: 'npm run stadium:daegu:p1-boundary-first-template-gate',
  };
});

const rowsMissingOperatorInput = rows.filter((row) => row.missingOperatorInputFields.length > 0);
const rowsReadyForGate = rows.filter((row) => row.missingOperatorInputFields.length === 0);
const status = blockers.length > 0
  ? 'blocked'
  : rowsMissingOperatorInput.length === 0
    ? 'ready-for-template-gate'
    : 'waiting-for-operator-entry';

const summary = {
  entrySheetVersion: ENTRY_SHEET_VERSION,
  status,
  targetBatchId: TARGET_BATCH_ID,
  reviewBoard: path.relative(frontendRoot, reviewBoardPath),
  operatorTemplate: path.relative(frontendRoot, templatePath),
  totalRows: rows.length,
  rowsMissingOperatorInput: rowsMissingOperatorInput.length,
  rowsReadyForGate: rowsReadyForGate.length,
  approvedRows: rows.filter((row) => row.currentDecision === 'APPROVED').length,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This entry sheet is read-only.',
    'It lists exactly the five P1 boundary-first operator-template rows to edit.',
    'It never writes operatorDecision or corrected fields into any source input.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'candidatePath is reference-only and must not be copied into correctedPath.',
    'Run the boundary-first template gate after all missingOperatorInputFields are filled.',
  ],
  editableFieldOrder: [
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ],
  rows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'rowNumber',
    'block',
    'blockId',
    'editableTarget',
    'templateJsonPointer',
    'currentDecision',
    'currentCorrectedPathFilled',
    'currentCorrectedLabelPoint',
    'currentReviewer',
    'currentReviewedAt',
    'missingOperatorInputFields',
    'pairedBlocks',
    'evidenceCrop',
    'candidatePathPolicy',
    'nextOperatorAction',
  ],
  ...rows.map((row) => [
    row.rowNumber,
    row.block,
    row.blockId,
    row.editableTarget,
    row.templateJsonPointer,
    row.currentDecision,
    row.currentCorrectedPathFilled,
    row.currentCorrectedLabelPoint,
    row.currentReviewer,
    row.currentReviewedAt,
    row.missingOperatorInputFields.join(' '),
    row.pairedBlocks.join(' '),
    row.evidenceCrop,
    row.candidatePathPolicy,
    row.nextOperatorAction,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary-First Entry Sheet',
  '',
  `- entry sheet version: \`${ENTRY_SHEET_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- rows missing operator input: ${summary.rowsMissingOperatorInput}`,
  `- rows ready for gate: ${summary.rowsReadyForGate}`,
  `- operator template: \`${summary.operatorTemplate}\``,
  `- review board: \`${summary.reviewBoard}\``,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Entry Rows',
  '',
  markdownTable(
    ['row', 'block', 'editable target', 'decision', 'missing input', 'evidence', 'next action'],
    rows.map((row) => [
      row.rowNumber,
      `\`${row.block}\``,
      `\`${row.editableTarget}\``,
      `\`${row.currentDecision}\``,
      row.missingOperatorInputFields.map((field) => `\`${field}\``).join(' ') || '-',
      row.evidenceCrop,
      row.nextOperatorAction,
    ]),
  ),
  '',
  '## Field Checklist',
  '',
  ...rows.flatMap((row) => [
    `### ${row.block}`,
    '',
    `- template JSON pointer: \`${row.templateJsonPointer}\``,
    `- paired blocks: ${row.pairedBlocks.map((block) => `\`${block}\``).join(' ') || '-'}`,
    `- evidence crop: \`${row.evidenceCrop}\``,
    `- operatorDecision=APPROVED: \`${row.fieldChecklist['operatorDecision=APPROVED']}\``,
    `- correctedPath: \`${row.fieldChecklist.correctedPath}\``,
    `- correctedLabelX/Y: \`${row.fieldChecklist['correctedLabelX/Y']}\``,
    `- reviewer: \`${row.fieldChecklist.reviewer}\``,
    `- reviewedAt: \`${row.fieldChecklist.reviewedAt}\``,
    `- candidate policy: ${row.candidatePathPolicy}`,
    '',
  ]),
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`p1_boundary_first_entry_sheet_json:${jsonPath}`);
console.log(`p1_boundary_first_entry_sheet_csv:${csvPath}`);
console.log(`p1_boundary_first_entry_sheet_markdown:${markdownPath}`);
console.log(`status:${summary.status} rows=${summary.totalRows} missingOperatorInput=${summary.rowsMissingOperatorInput} readyForGate=${summary.rowsReadyForGate}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
