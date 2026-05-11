import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const BATCH_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_BATCHES_V1';
const BATCHES = [
  {
    id: 'BATCH_1_P0',
    label: '1차 P0',
    order: 1,
    queuePriorities: ['P0'],
    expectedRows: 3,
  },
  {
    id: 'BATCH_2_P1',
    label: '2차 P1',
    order: 2,
    queuePriorities: ['P1'],
    expectedRows: 29,
  },
  {
    id: 'BATCH_3_P2',
    label: '3차 P2',
    order: 3,
    queuePriorities: ['P2'],
    expectedRows: 50,
  },
  {
    id: 'BATCH_4_P3_P4',
    label: '4차 P3/P4',
    order: 4,
    queuePriorities: ['P3', 'P4'],
    expectedRows: 52,
  },
];

const TERMINAL_NON_APPROVED_DECISIONS = new Set(['REJECTED', 'NEEDS_RETRACE']);

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

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
const validationPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.json');
const handoffReport = await readJsonReport(handoffPath);
const validationReport = await readJsonReport(validationPath);

const blockers = [];
const warnings = [];
if (!handoffReport.exists) blockers.push(`MISSING_REPORT:${handoffReport.relativePath}`);
if (!validationReport.exists) blockers.push(`MISSING_REPORT:${validationReport.relativePath}`);

const handoffItems = Array.isArray(handoffReport.data?.workItems) ? handoffReport.data.workItems : [];
const validationRows = Array.isArray(validationReport.data?.rows) ? validationReport.data.rows : [];
const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));

const batchRows = BATCHES.map((batch) => {
  const rows = handoffItems
    .filter((item) => batch.queuePriorities.includes(item.queuePriority))
    .map((item) => {
      const validationRow = validationByBlockId.get(item.id) ?? {};
      const operatorDecision = normalizeDecision(validationRow.operatorDecision ?? item.operatorDecision);
      const validForApproval = validationRow.validForApproval === true;
      const reasons = Array.isArray(validationRow.reasons) ? validationRow.reasons : [];
      const warningsForRow = Array.isArray(validationRow.warnings) ? validationRow.warnings : [];
      const isApproved = operatorDecision === 'APPROVED';
      return {
        batchId: batch.id,
        batchLabel: batch.label,
        batchOrder: batch.order,
        blockId: item.id,
        block: item.block,
        queuePriority: item.queuePriority,
        alignmentClass: item.alignmentClass,
        operatorDecision,
        validForApproval,
        invalidApproved: isApproved && !validForApproval,
        pending: operatorDecision === 'PENDING',
        terminalNonApproved: TERMINAL_NON_APPROVED_DECISIONS.has(operatorDecision),
        reasons,
        warnings: warningsForRow,
      };
    });

  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED').length;
  const validApprovedRows = rows.filter((row) => row.validForApproval).length;
  const invalidApprovedRows = rows.filter((row) => row.invalidApproved).length;
  const pendingRows = rows.filter((row) => row.pending).length;
  const rejectedRows = rows.filter((row) => row.operatorDecision === 'REJECTED').length;
  const needsRetraceRows = rows.filter((row) => row.operatorDecision === 'NEEDS_RETRACE').length;
  const terminalNonApprovedRows = rows.filter((row) => row.terminalNonApproved).length;
  const blockersForBatch = [];
  const warningsForBatch = [];

  if (rows.length !== batch.expectedRows) {
    warningsForBatch.push(`BATCH_TARGET_COUNT_CHANGED:${rows.length}:${batch.expectedRows}`);
  }
  if (approvedRows === 0) blockersForBatch.push('NO_APPROVED_ROWS_IN_BATCH');
  if (invalidApprovedRows > 0) blockersForBatch.push(`INVALID_APPROVED_ROWS_IN_BATCH:${invalidApprovedRows}`);
  if (approvedRows > 0 && validApprovedRows !== approvedRows) {
    blockersForBatch.push(`VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows}`);
  }
  if (approvedRows > 0 && pendingRows > 0) {
    blockersForBatch.push(`BATCH_HAS_PENDING_ROWS:${pendingRows}`);
  }

  return {
    id: batch.id,
    label: batch.label,
    order: batch.order,
    queuePriorities: batch.queuePriorities,
    expectedRows: batch.expectedRows,
    totalRows: rows.length,
    approvedRows,
    validApprovedRows,
    invalidApprovedRows,
    pendingRows,
    rejectedRows,
    needsRetraceRows,
    terminalNonApprovedRows,
    readyForWrite: approvedRows > 0
      && invalidApprovedRows === 0
      && validApprovedRows === approvedRows
      && pendingRows === 0,
    blockers: blockersForBatch,
    warnings: warningsForBatch,
    rows,
  };
});

const firstOpenBatch = batchRows.find((batch) => (
  batch.pendingRows > 0
  || batch.approvedRows > 0
  || batch.invalidApprovedRows > 0
)) ?? null;
const approvedBatchRows = batchRows.filter((batch) => batch.approvedRows > 0);
const approvedBatchIds = approvedBatchRows.map((batch) => batch.id);
const outOfOrderBatchRows = firstOpenBatch
  ? batchRows.filter((batch) => batch.order > firstOpenBatch.order && batch.approvedRows > 0)
  : [];
const outOfOrderApprovedRows = outOfOrderBatchRows.reduce(
  (total, batch) => total + batch.approvedRows,
  0,
);
const readyBatchRows = batchRows.filter((batch) => batch.readyForWrite);
const selectedReadyBatch = readyBatchRows.find((batch) => (
  approvedBatchIds.length === 1
  && approvedBatchIds[0] === batch.id
  && outOfOrderApprovedRows === 0
)) ?? null;

if (handoffItems.length !== 134) warnings.push(`HANDOFF_TARGET_COUNT_CHANGED:${handoffItems.length}:134`);
if (approvedBatchIds.length > 1) blockers.push(`APPROVED_ROWS_MUST_BE_SINGLE_BATCH:${approvedBatchIds.join(' ')}`);
if (outOfOrderApprovedRows > 0) blockers.push(`APPROVED_ROWS_OUT_OF_PRIORITY_ORDER:${outOfOrderApprovedRows}`);
if (approvedBatchIds.length === 1 && !selectedReadyBatch) {
  blockers.push(`APPROVED_BATCH_NOT_READY:${approvedBatchIds[0]}`);
}
batchRows.forEach((batch) => {
  warnings.push(...batch.warnings.map((warning) => `${batch.id}:${warning}`));
});

const totalApprovedRows = batchRows.reduce((total, batch) => total + batch.approvedRows, 0);
const totalValidApprovedRows = batchRows.reduce((total, batch) => total + batch.validApprovedRows, 0);
const totalInvalidApprovedRows = batchRows.reduce((total, batch) => total + batch.invalidApprovedRows, 0);
const totalPendingRows = batchRows.reduce((total, batch) => total + batch.pendingRows, 0);

if (totalApprovedRows === 0) blockers.push('NO_APPROVED_OPERATOR_CORRECTIONS');

const readyForWrite = blockers.length === 0 && selectedReadyBatch !== null;
const summary = {
  batchVersion: BATCH_VERSION,
  status: readyForWrite ? 'ready' : 'blocked',
  readyForWrite,
  totalHandoffRows: handoffItems.length,
  expectedHandoffRows: 134,
  approvedRows: totalApprovedRows,
  validApprovedRows: totalValidApprovedRows,
  invalidApprovedRows: totalInvalidApprovedRows,
  pendingRows: totalPendingRows,
  batchCount: BATCHES.length,
  approvedBatchCount: approvedBatchIds.length,
  approvedBatchIds,
  firstOpenBatchId: firstOpenBatch?.id ?? '',
  nextBatchId: selectedReadyBatch?.id ?? firstOpenBatch?.id ?? '',
  readyBatchId: selectedReadyBatch?.id ?? '',
  readyBatchApprovedRows: selectedReadyBatch?.approvedRows ?? 0,
  outOfOrderApprovedRows,
  blockers,
  warnings,
  guardedWriteCommand: 'npm run stadium:daegu:operator-corrections-write',
  postWriteGateCommand: 'npm run stadium:daegu:operator-corrections-postwrite-gate',
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  batchPolicy: {
    version: BATCH_VERSION,
    officialPngCoordinateSystem: '1707x2048',
    approvedRowsOnly: true,
    singleBatchOnly: true,
    priorityOrder: BATCHES.map((batch) => batch.id),
    failedRowsStayInSourceBatch: true,
    failedRowsAreNotCarriedForward: true,
    productionWriteCommand: 'npm run stadium:daegu:operator-corrections-write',
    note: 'This report does not modify src/data/daeguSeatData.ts. It only decides whether the current approved rows match the operator batch policy.',
  },
  sourceReports: {
    handoff: {
      path: handoffReport.relativePath,
      exists: handoffReport.exists,
      error: handoffReport.error,
    },
    validation: {
      path: validationReport.relativePath,
      exists: validationReport.exists,
      error: validationReport.error,
    },
  },
  batches: batchRows,
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'batchId',
    'label',
    'queuePriorities',
    'expectedRows',
    'totalRows',
    'approvedRows',
    'validApprovedRows',
    'invalidApprovedRows',
    'pendingRows',
    'rejectedRows',
    'needsRetraceRows',
    'readyForWrite',
    'blockers',
    'warnings',
  ],
  ...batchRows.map((batch) => [
    batch.id,
    batch.label,
    batch.queuePriorities.join(' '),
    batch.expectedRows,
    batch.totalRows,
    batch.approvedRows,
    batch.validApprovedRows,
    batch.invalidApprovedRows,
    batch.pendingRows,
    batch.rejectedRows,
    batch.needsRetraceRows,
    batch.readyForWrite,
    batch.blockers.join(' '),
    batch.warnings.join(' '),
  ]),
]);
await fs.writeFile(markdownPath, [
  '# 대구 좌석도 operator corrections batches',
  '',
  `- batch version: \`${BATCH_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- ready for write: ${summary.readyForWrite}`,
  `- total handoff rows: ${summary.totalHandoffRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- valid approved rows: ${summary.validApprovedRows}`,
  `- invalid approved rows: ${summary.invalidApprovedRows}`,
  `- approved batch ids: ${summary.approvedBatchIds.length ? summary.approvedBatchIds.map((id) => `\`${id}\``).join(', ') : '-'}`,
  `- first open batch: \`${summary.firstOpenBatchId || '-'}\``,
  `- next batch: \`${summary.nextBatchId || '-'}\``,
  `- ready batch: \`${summary.readyBatchId || '-'}\``,
  `- out-of-order approved rows: ${summary.outOfOrderApprovedRows}`,
  `- guarded write command: \`${summary.guardedWriteCommand}\``,
  '',
  '## Batch Policy',
  '',
  '1. `BATCH_1_P0` -> `BATCH_2_P1` -> `BATCH_3_P2` -> `BATCH_4_P3_P4` 순서로 진행한다.',
  '2. 한 번의 production write에는 하나의 batch에 속한 승인 row만 포함한다.',
  '3. batch 안의 `PENDING` row가 남아 있으면 write 준비 상태가 아니다.',
  '4. `REJECTED` 또는 `NEEDS_RETRACE` row는 실패/보류 row로 보고 다음 batch로 넘기지 않는다.',
  '5. 이 리포트는 production 좌표를 수정하지 않는다.',
  '',
  '## Batches',
  '',
  markdownTable(
    [
      'batch',
      'priorities',
      'expected',
      'total',
      'approved',
      'valid approved',
      'invalid approved',
      'pending',
      'rejected',
      'needs retrace',
      'ready',
      'blockers',
    ],
    batchRows.map((batch) => [
      `\`${batch.id}\``,
      batch.queuePriorities.map((priority) => `\`${priority}\``).join(' '),
      batch.expectedRows,
      batch.totalRows,
      batch.approvedRows,
      batch.validApprovedRows,
      batch.invalidApprovedRows,
      batch.pendingRows,
      batch.rejectedRows,
      batch.needsRetraceRows,
      String(batch.readyForWrite),
      batch.blockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
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

console.log(`corrections_batches_json:${jsonPath}`);
console.log(`corrections_batches_csv:${csvPath}`);
console.log(`corrections_batches_markdown:${markdownPath}`);
console.log(`status:${summary.status} readyForWrite=${summary.readyForWrite} nextBatch=${summary.nextBatchId || '-'} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows}`);
