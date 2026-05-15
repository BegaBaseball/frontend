import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const STATE_AUDIT_VERSION = 'DAEGU_OPERATOR_STATE_AUDIT_V1';
const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
const EXPECTED_TEMPLATE_ROWS = 97;
const INPUT_BATCHES = [
  {
    id: 'BATCH_1_P0',
    label: 'P0',
    priorities: ['P0'],
    expectedRows: 1,
    terminalRowsMayBeClosedInTemplate: true,
    inputPath: 'reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json',
    inputPackageVersion: 'DAEGU_P0_OPERATOR_PACKAGE_V1',
    importPath: 'reports/stadium/daegu-seatmap-p0-operator-import.json',
    importVersion: 'DAEGU_P0_OPERATOR_IMPORT_V1',
  },
  {
    id: 'BATCH_2_P1',
    label: 'P1',
    priorities: ['P1'],
    expectedRows: 17,
    inputPath: 'reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json',
    inputPackageVersion: 'DAEGU_P1_OPERATOR_PACKAGE_V1',
    importPath: 'reports/stadium/daegu-seatmap-p1-operator-import.json',
    importVersion: 'DAEGU_P1_OPERATOR_IMPORT_V1',
  },
  {
    id: 'BATCH_3_P2',
    label: 'P2',
    priorities: ['P2'],
    expectedRows: 36,
    inputPath: 'reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json',
    inputPackageVersion: 'DAEGU_P2_OPERATOR_PACKAGE_V1',
    importPath: 'reports/stadium/daegu-seatmap-p2-operator-import.json',
    importVersion: 'DAEGU_P2_OPERATOR_IMPORT_V1',
  },
  {
    id: 'BATCH_4_P3_P4',
    label: 'P3/P4',
    priorities: ['P3', 'P4'],
    expectedRows: 44,
    inputPath: 'reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.json',
    inputPackageVersion: 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1',
    importPath: 'reports/stadium/daegu-seatmap-p3-p4-operator-import.json',
    importVersion: 'DAEGU_P3_P4_OPERATOR_IMPORT_V1',
  },
];
const TEMPLATE_BATCHES = [
  { id: 'BATCH_1_P0', priorities: ['P0'], expectedRows: 0 },
  { id: 'BATCH_2_P1', priorities: ['P1'], expectedRows: 17 },
  { id: 'BATCH_3_P2', priorities: ['P2'], expectedRows: 36 },
  { id: 'BATCH_4_P3_P4', priorities: ['P3', 'P4'], expectedRows: 44 },
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

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

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

const countDecisions = (rows) => rows.reduce((counts, row) => {
  const decision = normalizeDecision(row.operatorDecision);
  return {
    ...counts,
    [decision]: (counts[decision] ?? 0) + 1,
  };
}, {});

const findDuplicateIds = (rows) => rows
  .map((row) => row.blockId)
  .filter((blockId, index, blockIds) => blockIds.indexOf(blockId) !== index);

const summarizeRows = (rows) => {
  const decisions = countDecisions(rows);
  return {
    rows: rows.length,
    pendingRows: decisions.PENDING ?? 0,
    approvedRows: decisions.APPROVED ?? 0,
    rejectedRows: decisions.REJECTED ?? 0,
    needsRetraceRows: decisions.NEEDS_RETRACE ?? 0,
    invalidRows: rows.filter((row) => !DECISION_OPTIONS.has(normalizeDecision(row.operatorDecision))).length,
  };
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
const templateReport = await readJsonReport(templatePath);
const templateRows = Array.isArray(templateReport.data?.corrections) ? templateReport.data.corrections : [];
const templateByBlockId = new Map(templateRows.map((row) => [row.blockId, row]));
const blockers = [];
const warnings = [];

if (!templateReport.exists) blockers.push(`MISSING_REPORT:${templateReport.relativePath}`);
if (templateReport.exists && templateReport.data?.templateVersion !== TEMPLATE_VERSION) {
  blockers.push(`TEMPLATE_VERSION_MISMATCH:${templateReport.data?.templateVersion ?? ''}`);
}
if (templateRows.length !== EXPECTED_TEMPLATE_ROWS) {
  warnings.push(`TEMPLATE_ROW_COUNT_CHANGED_AFTER_WRITES:${templateRows.length}:${EXPECTED_TEMPLATE_ROWS}`);
}

const templateBatchRows = TEMPLATE_BATCHES.map((batch) => {
  const rows = templateRows.filter((row) => batch.priorities.includes(row.queuePriority));
  const summary = summarizeRows(rows);
  if (rows.length !== batch.expectedRows) {
    warnings.push(`TEMPLATE_BATCH_ROW_COUNT_CHANGED_AFTER_WRITES:${batch.id}:${rows.length}:${batch.expectedRows}`);
  }
  return {
    ...batch,
    ...summary,
  };
});

const firstOpenBatch = templateBatchRows.find((batch) => batch.pendingRows > 0 || batch.approvedRows > 0) ?? null;
const inputBatchRows = [];

for (const batch of INPUT_BATCHES) {
  const inputReport = await readJsonReport(path.join(frontendRoot, batch.inputPath));
  const importReport = await readJsonReport(path.join(frontendRoot, batch.importPath));
  const inputRows = Array.isArray(inputReport.data?.corrections) ? inputReport.data.corrections : [];
  const templateRowsForBatch = inputRows.map((row) => templateByBlockId.get(row.blockId)).filter(Boolean);
  const inputSummary = summarizeRows(inputRows);
  const templateSummary = summarizeRows(templateRowsForBatch);
  const importSummary = importReport.data?.summary ?? {};
  const rowMismatches = [];
  const pendingTemplateMismatches = [];
  const staleWriteTemplateRows = [];

  if (!inputReport.exists) blockers.push(`MISSING_REPORT:${inputReport.relativePath}`);
  if (!importReport.exists) blockers.push(`MISSING_REPORT:${importReport.relativePath}`);
  if (inputReport.exists && inputReport.data?.packageVersion !== batch.inputPackageVersion) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${batch.id}:${inputReport.data?.packageVersion ?? ''}`);
  }
  if (inputReport.exists && inputReport.data?.targetBatchId !== batch.id) {
    blockers.push(`INPUT_BATCH_MISMATCH:${batch.id}:${inputReport.data?.targetBatchId ?? ''}`);
  }
  if (inputReport.exists && inputReport.data?.draftOnly !== false) blockers.push(`INPUT_DRAFT_ONLY_NOT_FALSE:${batch.id}`);
  if (inputReport.exists && inputReport.data?.productionWriteAllowed !== false) {
    blockers.push(`INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE:${batch.id}`);
  }
  if (inputRows.length !== batch.expectedRows) {
    warnings.push(`INPUT_ROW_COUNT_CHANGED_AFTER_WRITES:${batch.id}:${inputRows.length}:${batch.expectedRows}`);
  }

  const duplicateInputIds = [...new Set(findDuplicateIds(inputRows))];
  if (duplicateInputIds.length > 0) blockers.push(`DUPLICATE_INPUT_BLOCK_ID:${batch.id}:${duplicateInputIds.join(' ')}`);
  const missingTemplateRows = inputRows.filter((row) => !templateByBlockId.has(row.blockId));
  const missingPendingTemplateRows = missingTemplateRows
    .filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const missingTerminalTemplateRows = missingTemplateRows
    .filter((row) => normalizeDecision(row.operatorDecision) !== 'PENDING');
  if (missingPendingTemplateRows.length > 0) {
    blockers.push(`INPUT_PENDING_ROWS_MISSING_FROM_TEMPLATE:${batch.id}:${missingPendingTemplateRows.map((row) => row.blockId).join(' ')}`);
  }
  if (missingTerminalTemplateRows.length > 0 && !batch.terminalRowsMayBeClosedInTemplate) {
    warnings.push(`INPUT_TERMINAL_ROWS_CLOSED_IN_TEMPLATE:${batch.id}:${missingTerminalTemplateRows.map((row) => row.blockId).join(' ')}`);
  }
  if (inputSummary.invalidRows > 0) blockers.push(`INVALID_OPERATOR_DECISION:${batch.id}`);

  const closedTerminalImportIds = new Set(
    Number(importSummary.closedTerminalInputRows ?? 0) > 0
      ? missingTerminalTemplateRows.map((row) => row.blockId)
      : [],
  );
  const importComparableRows = inputRows.filter((row) => !closedTerminalImportIds.has(row.blockId));
  const importComparableSummary = summarizeRows(importComparableRows);

  inputRows.forEach((inputRow) => {
    const templateRow = templateByBlockId.get(inputRow.blockId);
    if (!templateRow) return;
    const inputDecision = normalizeDecision(inputRow.operatorDecision);
    const templateDecision = normalizeDecision(templateRow.operatorDecision);
    if (inputDecision === 'PENDING' && templateDecision !== 'PENDING') {
      pendingTemplateMismatches.push(inputRow.block);
    }
    if (inputDecision !== 'PENDING' && templateDecision !== 'PENDING' && inputDecision !== templateDecision) {
      rowMismatches.push(inputRow.block);
    }
  });

  if (pendingTemplateMismatches.length > 0) {
    blockers.push(`INPUT_PENDING_TEMPLATE_NOT_PENDING:${batch.id}:${pendingTemplateMismatches.join(' ')}`);
  }
  if (rowMismatches.length > 0) {
    blockers.push(`INPUT_TEMPLATE_DECISION_MISMATCH:${batch.id}:${rowMismatches.join(' ')}`);
  }

  if (importReport.exists && importSummary.importVersion !== batch.importVersion) {
    blockers.push(`IMPORT_VERSION_MISMATCH:${batch.id}:${importSummary.importVersion ?? ''}`);
  }
  if (importReport.exists && importSummary.status !== 'ok') {
    blockers.push(`IMPORT_REPORT_STATUS_NOT_OK:${batch.id}:${importSummary.status ?? ''}`);
  }
  if (importReport.exists && !['dry-run', 'write-template'].includes(importSummary.mode)) {
    blockers.push(`IMPORT_REPORT_NOT_DRY_RUN:${batch.id}:${importSummary.mode ?? ''}`);
  }
  if (importReport.exists && Number(importSummary.importedRows ?? -1) !== importComparableRows.length) {
    blockers.push(`IMPORT_ROWS_MISMATCH:${batch.id}:${importSummary.importedRows ?? ''}:${importComparableRows.length}`);
  }
  if (importReport.exists && Number(importSummary.pendingRows ?? -1) !== importComparableSummary.pendingRows) {
    blockers.push(`IMPORT_PENDING_ROWS_MISMATCH:${batch.id}:${importSummary.pendingRows ?? ''}:${importComparableSummary.pendingRows}`);
  }
  if (importReport.exists && Number(importSummary.decidedRows ?? -1) !== importComparableRows.length - importComparableSummary.pendingRows) {
    blockers.push(`IMPORT_DECIDED_ROWS_MISMATCH:${batch.id}:${importSummary.decidedRows ?? ''}:${importComparableRows.length - importComparableSummary.pendingRows}`);
  }
  if (importReport.exists && Number(importSummary.approvedRows ?? -1) !== importComparableSummary.approvedRows) {
    blockers.push(`IMPORT_APPROVED_ROWS_MISMATCH:${batch.id}:${importSummary.approvedRows ?? ''}:${importComparableSummary.approvedRows}`);
  }
  if (importReport.exists && importSummary.productionDataChanged === true) {
    blockers.push(`IMPORT_CHANGED_PRODUCTION_DATA:${batch.id}`);
  }

  if (importReport.exists && importSummary.mode === 'write-template' && inputSummary.pendingRows > 0) {
    blockers.push(`WRITE_TEMPLATE_IMPORT_HAS_PENDING_INPUT:${batch.id}:${inputSummary.pendingRows}`);
  }
  if (importReport.exists && importSummary.mode === 'write-template' && importSummary.status === 'ok') {
    inputRows.forEach((inputRow) => {
      const templateRow = templateByBlockId.get(inputRow.blockId);
      if (!templateRow) return;
      if (normalizeDecision(inputRow.operatorDecision) !== normalizeDecision(templateRow.operatorDecision)) {
        staleWriteTemplateRows.push(inputRow.block);
      }
    });
    if (staleWriteTemplateRows.length > 0) {
      blockers.push(`STALE_WRITE_TEMPLATE_IMPORT_REPORT:${batch.id}:${staleWriteTemplateRows.join(' ')}`);
    }
  }

  inputBatchRows.push({
    batchId: batch.id,
    label: batch.label,
    priorities: batch.priorities,
    expectedRows: batch.expectedRows,
    inputRows: inputRows.length,
    inputPendingRows: inputSummary.pendingRows,
    inputApprovedRows: inputSummary.approvedRows,
    inputRejectedRows: inputSummary.rejectedRows,
    inputNeedsRetraceRows: inputSummary.needsRetraceRows,
    templateRows: templateRowsForBatch.length,
    templatePendingRows: templateSummary.pendingRows,
    templateApprovedRows: templateSummary.approvedRows,
    templateRejectedRows: templateSummary.rejectedRows,
    templateNeedsRetraceRows: templateSummary.needsRetraceRows,
    importStatus: importSummary.status ?? '',
    importMode: importSummary.mode ?? '',
    importPendingRows: Number(importSummary.pendingRows ?? 0),
    importApprovedRows: Number(importSummary.approvedRows ?? 0),
    pendingTemplateMismatches: pendingTemplateMismatches.length,
    decisionMismatches: rowMismatches.length,
    staleWriteTemplateRows: staleWriteTemplateRows.length,
  });
}

const firstPendingInputBatch = inputBatchRows.find((batch) => batch.inputPendingRows > 0) ?? null;
if (firstPendingInputBatch && firstOpenBatch?.id !== firstPendingInputBatch.batchId) {
  blockers.push(`FIRST_OPEN_BATCH_DOES_NOT_MATCH_INPUT_PENDING:${firstPendingInputBatch.batchId}:${firstOpenBatch?.id ?? ''}`);
}
if (inputBatchRows.some((batch) => batch.inputPendingRows > 0 && batch.templatePendingRows === 0)) {
  warnings.push('INPUT_PENDING_BATCH_HAS_NO_TEMPLATE_PENDING_ROWS');
}

const ready = blockers.length === 0;
const summary = {
  stateAuditVersion: STATE_AUDIT_VERSION,
  status: ready ? 'ok' : 'failed',
  ready,
  templateRows: templateRows.length,
  firstOpenBatchId: firstOpenBatch?.id ?? '',
  totalInputRows: inputBatchRows.reduce((total, batch) => total + batch.inputRows, 0),
  totalInputPendingRows: inputBatchRows.reduce((total, batch) => total + batch.inputPendingRows, 0),
  totalTemplatePendingRowsForInputs: inputBatchRows.reduce((total, batch) => total + batch.templatePendingRows, 0),
  totalPendingTemplateMismatches: inputBatchRows.reduce((total, batch) => total + batch.pendingTemplateMismatches, 0),
  totalDecisionMismatches: inputBatchRows.reduce((total, batch) => total + batch.decisionMismatches, 0),
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  sourceReports: {
    template: {
      path: templateReport.relativePath,
      exists: templateReport.exists,
      error: templateReport.error,
    },
  },
  safetyContract: [
    'P0/P1/P2/P3/P4 operator input files are the source of truth before template import.',
    'If an operator input row is PENDING, the matching main template row must also remain PENDING.',
    'Import reports must be current dry-run reports unless a guarded write-template flow has just been performed and the template decisions match the input decisions.',
    'This audit never modifies src/data/daeguSeatData.ts or promotes blocks to OFFICIAL_IMAGE_TRACED.',
  ],
  templateBatches: templateBatchRows,
  inputBatches: inputBatchRows,
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-state-audit.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-operator-state-audit.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-state-audit.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'batchId',
    'inputRows',
    'inputPendingRows',
    'inputApprovedRows',
    'templateRows',
    'templatePendingRows',
    'templateApprovedRows',
    'importStatus',
    'importMode',
    'pendingTemplateMismatches',
    'decisionMismatches',
    'staleWriteTemplateRows',
  ],
  ...inputBatchRows.map((row) => [
    row.batchId,
    row.inputRows,
    row.inputPendingRows,
    row.inputApprovedRows,
    row.templateRows,
    row.templatePendingRows,
    row.templateApprovedRows,
    row.importStatus,
    row.importMode,
    row.pendingTemplateMismatches,
    row.decisionMismatches,
    row.staleWriteTemplateRows,
  ]),
]);

await fs.writeFile(markdownPath, [
  '# Daegu Operator State Audit',
  '',
  `- audit version: \`${STATE_AUDIT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- first open batch: \`${summary.firstOpenBatchId || 'none'}\``,
  `- template rows: ${summary.templateRows}`,
  `- input rows: ${summary.totalInputRows}`,
  `- input pending rows: ${summary.totalInputPendingRows}`,
  `- template pending rows for inputs: ${summary.totalTemplatePendingRowsForInputs}`,
  '',
  '## Input Batches',
  '',
  markdownTable(
    [
      'batch',
      'input',
      'input pending',
      'template pending',
      'import',
      'mode',
      'pending mismatch',
      'decision mismatch',
    ],
    inputBatchRows.map((row) => [
      `\`${row.batchId}\``,
      row.inputRows,
      row.inputPendingRows,
      row.templatePendingRows,
      `\`${row.importStatus || 'missing'}\``,
      `\`${row.importMode || 'missing'}\``,
      row.pendingTemplateMismatches,
      row.decisionMismatches,
    ]),
  ),
  '',
  '## Template Batches',
  '',
  markdownTable(
    ['batch', 'rows', 'pending', 'approved', 'rejected', 'needs retrace'],
    templateBatchRows.map((row) => [
      `\`${row.id}\``,
      row.rows,
      row.pendingRows,
      row.approvedRows,
      row.rejectedRows,
      row.needsRetraceRows,
    ]),
  ),
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`operator_state_audit_json:${jsonPath}`);
console.log(`operator_state_audit_csv:${csvPath}`);
console.log(`operator_state_audit_markdown:${markdownPath}`);
console.log(`status:${summary.status} firstOpenBatch=${summary.firstOpenBatchId || 'none'} inputPending=${summary.totalInputPendingRows} blockers=${summary.blockers.length}`);

if (!ready) {
  process.exitCode = 1;
}
