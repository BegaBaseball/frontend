import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  isDaeguNormalSelectableSeat,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');

const GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const EXPECTED_BLOCK_IDS = [
  'daegu-first-table-t1-1',
  'daegu-third-table-t3-2',
  'daegu-central-table-v-v1',
  'daegu-central-table-v-v2',
  'daegu-central-table-v-v3',
];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const hasFlag = (name) => process.argv.includes(name);

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

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const shortHash = (value) => crypto
  .createHash('sha256')
  .update(String(value ?? ''))
  .digest('hex')
  .slice(0, 12);

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const requireWritten = hasFlag('--require-written');

const reports = {
  sourceInput: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json')),
  sourceCopy: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-source-copy.json')),
  p1Readiness: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-operator-readiness.json')),
  validation: await readJsonReport(path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.json')),
  apply: await readJsonReport(path.join(reportDir, 'daegu-seatmap-operator-corrections-apply.json')),
  alignment: await readJsonReport(path.join(reportDir, 'daegu-seatmap-alignment-audit.json')),
  renderSafety: await readJsonReport(path.join(reportDir, 'daegu-seatmap-render-safety-audit.json')),
};

const sourceInputRows = Array.isArray(reports.sourceInput.data?.corrections)
  ? reports.sourceInput.data.corrections
  : [];
const validationRows = Array.isArray(reports.validation.data?.rows)
  ? reports.validation.data.rows
  : [];
const applyRows = Array.isArray(reports.apply.data?.rows) ? reports.apply.data.rows : [];
const alignmentRows = Array.isArray(reports.alignment.data?.blocks) ? reports.alignment.data.blocks : [];
const renderRows = Array.isArray(reports.renderSafety.data?.rows) ? reports.renderSafety.data.rows : [];

const sourceByBlockId = new Map(sourceInputRows.map((row) => [row.blockId, row]));
const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));
const applyByBlockId = new Map(applyRows.map((row) => [row.blockId, row]));
const alignmentByBlockId = new Map(alignmentRows.map((row) => [row.id, row]));
const renderByBlockId = new Map(renderRows.map((row) => [row.blockId, row]));
const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));

const sourceBoundaryRows = EXPECTED_BLOCK_IDS.map((blockId) => sourceByBlockId.get(blockId)).filter(Boolean);
const approvedSourceRows = sourceBoundaryRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
const approvedValidationRows = validationRows.filter((row) => row.operatorDecision === 'APPROVED');
const approvedBoundaryValidationRows = approvedValidationRows.filter((row) => EXPECTED_BLOCK_IDS.includes(row.blockId));
const approvedNonBoundaryRows = approvedValidationRows.filter((row) => !EXPECTED_BLOCK_IDS.includes(row.blockId));
const applyBoundaryRows = applyRows.filter((row) => EXPECTED_BLOCK_IDS.includes(row.blockId));

const blockers = [];
const warnings = [];

if (!reports.sourceInput.exists) blockers.push(`MISSING_REPORT:${reports.sourceInput.relativePath}`);
if (reports.sourceInput.exists && reports.sourceInput.data?.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`SOURCE_INPUT_BATCH_MISMATCH:${reports.sourceInput.data?.targetBatchId ?? ''}`);
}
if (sourceBoundaryRows.length !== EXPECTED_BLOCK_IDS.length) {
  blockers.push(`SOURCE_INPUT_BOUNDARY_ROW_COUNT_MISMATCH:${sourceBoundaryRows.length}:${EXPECTED_BLOCK_IDS.length}`);
}

if (approvedSourceRows.length === 0) {
  warnings.push('P1_BOUNDARY_FIRST_WAITING_FOR_OPERATOR_APPROVALS');
} else {
  Object.entries(reports).forEach(([key, report]) => {
    if (!report.exists) blockers.push(`MISSING_REPORT:${key}:${report.relativePath}`);
  });

  if (approvedSourceRows.length !== EXPECTED_BLOCK_IDS.length) {
    blockers.push(`P1_BOUNDARY_FIRST_REQUIRES_FIVE_APPROVED_SOURCE_ROWS:${approvedSourceRows.length}:${EXPECTED_BLOCK_IDS.length}`);
  }
  if (!['source-input-updated', 'ready-for-write-source-input'].includes(reports.sourceCopy.data?.summary?.status ?? '')) {
    blockers.push(`SOURCE_COPY_NOT_READY_OR_UPDATED:${reports.sourceCopy.data?.summary?.status ?? ''}`);
  }
  if (reports.p1Readiness.exists && reports.p1Readiness.data?.summary?.approvedRows !== approvedSourceRows.length) {
    blockers.push(`P1_READINESS_APPROVED_ROWS_MISMATCH:${reports.p1Readiness.data?.summary?.approvedRows ?? ''}:${approvedSourceRows.length}`);
  }
  if (reports.validation.data?.summary?.status !== 'ok') {
    blockers.push(`VALIDATION_STATUS_NOT_OK:${reports.validation.data?.summary?.status ?? ''}`);
  }
  if (numberOrZero(reports.validation.data?.summary?.approvedRows) !== EXPECTED_BLOCK_IDS.length) {
    blockers.push(`VALIDATION_APPROVED_ROWS_NOT_BOUNDARY_FIVE:${reports.validation.data?.summary?.approvedRows ?? ''}:${EXPECTED_BLOCK_IDS.length}`);
  }
  if (approvedBoundaryValidationRows.length !== EXPECTED_BLOCK_IDS.length) {
    blockers.push(`VALIDATION_BOUNDARY_APPROVED_ROWS_MISMATCH:${approvedBoundaryValidationRows.length}:${EXPECTED_BLOCK_IDS.length}`);
  }
  if (approvedNonBoundaryRows.length > 0) {
    blockers.push(`VALIDATION_HAS_NON_BOUNDARY_APPROVED_ROWS:${approvedNonBoundaryRows.map((row) => row.block ?? row.blockId).join(' ')}`);
  }
  if (reports.apply.data?.summary?.status !== 'ok') {
    blockers.push(`APPLY_STATUS_NOT_OK:${reports.apply.data?.summary?.status ?? ''}`);
  }
  if (reports.apply.data?.summary?.mode !== 'write') {
    blockers.push(`APPLY_REPORT_NOT_WRITE_MODE:${reports.apply.data?.summary?.mode ?? ''}`);
  }
  if (reports.apply.data?.summary?.dataFileChanged !== true) {
    blockers.push('APPLY_WRITE_DID_NOT_CHANGE_DATA_FILE');
  }
  if (numberOrZero(reports.apply.data?.summary?.plannedRows) !== EXPECTED_BLOCK_IDS.length) {
    blockers.push(`APPLY_PLANNED_ROWS_NOT_BOUNDARY_FIVE:${reports.apply.data?.summary?.plannedRows ?? ''}:${EXPECTED_BLOCK_IDS.length}`);
  }
  if (applyBoundaryRows.length !== EXPECTED_BLOCK_IDS.length) {
    blockers.push(`APPLY_BOUNDARY_ROWS_MISMATCH:${applyBoundaryRows.length}:${EXPECTED_BLOCK_IDS.length}`);
  }
  if (reports.alignment.data?.summary?.officialAlignmentFailures !== 0) {
    blockers.push(`ALIGNMENT_OFFICIAL_FAILURES:${reports.alignment.data?.summary?.officialAlignmentFailures ?? ''}`);
  }
  if (reports.renderSafety.data?.status !== 'ui-contained') {
    blockers.push(`RENDER_SAFETY_STATUS_NOT_UI_CONTAINED:${reports.renderSafety.data?.status ?? ''}`);
  }
}

const rows = EXPECTED_BLOCK_IDS.map((blockId) => {
  const sourceRow = sourceByBlockId.get(blockId) ?? {};
  const validationRow = validationByBlockId.get(blockId) ?? {};
  const applyRow = applyByBlockId.get(blockId) ?? {};
  const alignmentRow = alignmentByBlockId.get(blockId) ?? {};
  const renderRow = renderByBlockId.get(blockId) ?? {};
  const block = blockById.get(blockId);
  const sourceDecision = normalizeDecision(sourceRow.operatorDecision);
  const approvedInSource = sourceDecision === 'APPROVED';
  const rowBlockers = [];

  if (!block) rowBlockers.push('CURRENT_BLOCK_NOT_FOUND');

  if (approvedInSource) {
    if (validationRow.operatorDecision !== 'APPROVED') rowBlockers.push('VALIDATION_APPROVED_ROW_MISSING');
    if (validationRow.validForApproval !== true) rowBlockers.push('VALIDATION_ROW_NOT_VALID_FOR_APPROVAL');
    if (!applyRow.blockId) rowBlockers.push('APPLY_ROW_MISSING');
    if (block?.traceStatus !== 'OFFICIAL_IMAGE_TRACED') rowBlockers.push(`TRACE_STATUS_NOT_OFFICIAL:${block?.traceStatus ?? ''}`);
    if (block?.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE') rowBlockers.push(`TRACE_METHOD_NOT_OFFICIAL_PATH:${block?.traceMethod ?? ''}`);
    if (block?.sourceConfidence !== 'OFFICIAL') rowBlockers.push(`SOURCE_CONFIDENCE_NOT_OFFICIAL:${block?.sourceConfidence ?? ''}`);
    if (block?.imageGeometry.manualReviewed !== true) rowBlockers.push('MANUAL_REVIEWED_NOT_TRUE');
    if (block?.imageGeometry.pixelAlignmentStatus !== 'PIXEL_ALIGNED') {
      rowBlockers.push(`PIXEL_ALIGNMENT_NOT_ALIGNED:${block?.imageGeometry.pixelAlignmentStatus ?? ''}`);
    }
    if (block && !isDaeguNormalSelectableSeat(block)) rowBlockers.push('NORMAL_SELECTABLE_PREDICATE_FALSE');
    if (applyRow.newPathHash && block && shortHash(block.imageGeometry.d) !== applyRow.newPathHash) {
      rowBlockers.push(`CURRENT_PATH_HASH_MISMATCH:${shortHash(block.imageGeometry.d)}:${applyRow.newPathHash}`);
    }
    if (applyRow.newLabel && block && `${block.imageGeometry.labelX},${block.imageGeometry.labelY}` !== applyRow.newLabel) {
      rowBlockers.push(`CURRENT_LABEL_MISMATCH:${block.imageGeometry.labelX},${block.imageGeometry.labelY}:${applyRow.newLabel}`);
    }
    if (alignmentRow.alignmentClass !== 'LOCKED_VERIFIED') {
      rowBlockers.push(`ALIGNMENT_CLASS_NOT_LOCKED_VERIFIED:${alignmentRow.alignmentClass ?? ''}`);
    }
    if (alignmentRow.labelInsideCurrentPath !== true) rowBlockers.push('ALIGNMENT_LABEL_NOT_INSIDE_PATH');
    if (alignmentRow.labelTopHitOk !== true) rowBlockers.push(`ALIGNMENT_LABEL_TOP_HIT_FAILED:${alignmentRow.labelTopHitBlockId ?? ''}`);
    if (Array.isArray(alignmentRow.officialFailureReasons) && alignmentRow.officialFailureReasons.length > 0) {
      rowBlockers.push(`ALIGNMENT_OFFICIAL_FAILURE_REASONS:${alignmentRow.officialFailureReasons.join(' ')}`);
    }
    if (renderRow.normalUiSelectable !== true) rowBlockers.push('RENDER_SAFETY_NOT_NORMAL_SELECTABLE');
    if (renderRow.renderLayer && renderRow.renderLayer !== 'normal-seat') {
      rowBlockers.push(`RENDER_LAYER_NOT_NORMAL_SEAT:${renderRow.renderLayer}`);
    }
  } else if (block?.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
    rowBlockers.push('BOUNDARY_ROW_PROMOTED_WITHOUT_SOURCE_APPROVAL');
  }

  return {
    blockId,
    block: block?.block ?? sourceRow.block ?? validationRow.block ?? '',
    approvedInSource,
    sourceDecision,
    validationApproved: validationRow.operatorDecision === 'APPROVED',
    validationValid: validationRow.validForApproval === true,
    appliedByWrite: reports.apply.data?.summary?.mode === 'write' && Boolean(applyRow.blockId),
    currentTraceStatus: block?.traceStatus ?? '',
    currentTraceMethod: block?.traceMethod ?? '',
    normalSelectable: block ? isDaeguNormalSelectableSeat(block) : false,
    alignmentClass: alignmentRow.alignmentClass ?? '',
    labelTopHitOk: alignmentRow.labelTopHitOk ?? null,
    renderLayer: renderRow.renderLayer ?? '',
    normalUiSelectable: renderRow.normalUiSelectable ?? null,
    rowBlockers,
  };
});

rows.forEach((row) => {
  row.rowBlockers.forEach((blocker) => blockers.push(`${blocker}:${row.block}`));
});

const postwriteVerified = blockers.length === 0 && approvedSourceRows.length === EXPECTED_BLOCK_IDS.length;
const status = blockers.length > 0
  ? 'blocked'
  : postwriteVerified
    ? 'postwrite-verified'
    : 'waiting-for-operator';
const summary = {
  gateVersion: GATE_VERSION,
  status,
  postwriteVerified,
  requireWritten,
  targetBatchId: TARGET_BATCH_ID,
  totalBoundaryRows: EXPECTED_BLOCK_IDS.length,
  sourceBoundaryRows: sourceBoundaryRows.length,
  approvedSourceRows: approvedSourceRows.length,
  validationApprovedRows: numberOrZero(reports.validation.data?.summary?.approvedRows),
  boundaryValidationApprovedRows: approvedBoundaryValidationRows.length,
  nonBoundaryValidationApprovedRows: approvedNonBoundaryRows.length,
  applyMode: reports.apply.data?.summary?.mode ?? '',
  applyStatus: reports.apply.data?.summary?.status ?? '',
  applyPlannedRows: numberOrZero(reports.apply.data?.summary?.plannedRows),
  applyBoundaryRows: applyBoundaryRows.length,
  dataFileChanged: reports.apply.data?.summary?.dataFileChanged === true,
  alignmentOfficialFailures: numberOrZero(reports.alignment.data?.summary?.officialAlignmentFailures),
  renderSafetyStatus: reports.renderSafety.data?.status ?? '',
  productionWriteAllowed: false,
  writesSourceInput: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  sourceReports: Object.fromEntries(
    Object.entries(reports).map(([key, sourceReport]) => [
      key,
      {
        path: sourceReport.relativePath,
        exists: sourceReport.exists,
        error: sourceReport.error,
      },
    ]),
  ),
  rows,
  safetyContract: [
    'This gate is read-only and never modifies source input, corrections template, or src/data/daeguSeatData.ts.',
    'It verifies only the five P1 boundary-first rows: T1-1, T3-2, V1, V2, and V3.',
    'If no boundary-first source rows are APPROVED, status stays waiting-for-operator and production data must not be changed.',
    'If boundary-first source rows are APPROVED, all five rows must already be written and verified before this gate passes.',
    'Approved rows must be OFFICIAL_IMAGE_TRACED, PATH_TRACED_FROM_OFFICIAL_IMAGE, manualReviewed=true, PIXEL_ALIGNED, normal selectable, and LOCKED_VERIFIED.',
    'Non-approved boundary-first rows must not be promoted to OFFICIAL_IMAGE_TRACED.',
  ],
};

const jsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-postwrite-gate.json');
const csvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-postwrite-gate.csv');
const markdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-postwrite-gate.md');

await fs.mkdir(p1ReportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'block',
    'approvedInSource',
    'sourceDecision',
    'validationApproved',
    'validationValid',
    'appliedByWrite',
    'currentTraceStatus',
    'currentTraceMethod',
    'normalSelectable',
    'alignmentClass',
    'labelTopHitOk',
    'renderLayer',
    'normalUiSelectable',
    'rowBlockers',
  ],
  ...rows.map((row) => [
    row.block,
    row.approvedInSource,
    row.sourceDecision,
    row.validationApproved,
    row.validationValid,
    row.appliedByWrite,
    row.currentTraceStatus,
    row.currentTraceMethod,
    row.normalSelectable,
    row.alignmentClass,
    row.labelTopHitOk,
    row.renderLayer,
    row.normalUiSelectable,
    row.rowBlockers.join(' '),
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary-First Postwrite Gate',
  '',
  `- gate version: \`${summary.gateVersion}\``,
  `- status: \`${summary.status}\``,
  `- postwrite verified: ${summary.postwriteVerified}`,
  `- approved source rows: ${summary.approvedSourceRows}/${summary.totalBoundaryRows}`,
  `- validation approved rows: ${summary.validationApprovedRows}`,
  `- boundary validation approved rows: ${summary.boundaryValidationApprovedRows}`,
  `- non-boundary validation approved rows: ${summary.nonBoundaryValidationApprovedRows}`,
  `- apply mode: \`${summary.applyMode || 'none'}\``,
  `- apply planned rows: ${summary.applyPlannedRows}`,
  `- apply boundary rows: ${summary.applyBoundaryRows}`,
  `- data file changed: ${summary.dataFileChanged}`,
  `- alignment official failures: ${summary.alignmentOfficialFailures}`,
  `- render safety status: \`${summary.renderSafetyStatus || 'none'}\``,
  '',
  '## Rows',
  '',
  markdownTable(
    [
      'block',
      'source approved',
      'validation valid',
      'applied',
      'trace status',
      'normal selectable',
      'alignment',
      'render layer',
      'blockers',
    ],
    rows.map((row) => [
      `\`${row.block}\``,
      String(row.approvedInSource),
      String(row.validationValid),
      String(row.appliedByWrite),
      `\`${row.currentTraceStatus}/${row.currentTraceMethod}\``,
      String(row.normalSelectable),
      `\`${row.alignmentClass || '-'}\``,
      `\`${row.renderLayer || '-'}\``,
      row.rowBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
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
  '## Gate',
  '',
  '1. 승인 row가 0개이면 이 gate는 `waiting-for-operator`로 남고 production write를 허용하지 않습니다.',
  '2. 승인 row가 있으면 다섯 boundary-first row 전체가 source input, validation, apply write, alignment, render-safety에서 일치해야 합니다.',
  '3. 승인되지 않은 boundary-first row가 `OFFICIAL_IMAGE_TRACED`로 승격되면 차단합니다.',
  '4. 이 gate는 read-only이며 `src/data/daeguSeatData.ts`를 수정하지 않습니다.',
  '',
].join('\n'), 'utf8');

console.log(`p1_boundary_first_postwrite_gate_json:${jsonPath}`);
console.log(`p1_boundary_first_postwrite_gate_csv:${csvPath}`);
console.log(`p1_boundary_first_postwrite_gate_markdown:${markdownPath}`);
console.log(`status:${summary.status} approved=${summary.approvedSourceRows}/${summary.totalBoundaryRows} postwriteVerified=${summary.postwriteVerified} blockers=${summary.blockers.length}`);

if (summary.status === 'blocked' || (requireWritten && !summary.postwriteVerified)) {
  process.exitCode = 1;
}
