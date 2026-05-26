import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p38SeedJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p38-review-input-seed/daegu-operator-reference-p38-review-input-seed.json');
const p38SeedCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p38-review-input-seed/daegu-operator-reference-p38-review-input-seed.csv');
const p37SourcePath = path.join(frontendRoot, 'scripts/daegu-operator-reference-p37-review-status.mjs');
const operatorInputEnv = process.env.DAEGU_OPERATOR_REFERENCE_REVIEW_INPUT
  ?? process.env.DAEGU_OPERATOR_REFERENCE_P37_REVIEW_INPUT
  ?? toFrontendRelative(p38SeedCsvPath);
const operatorInputPath = path.isAbsolute(operatorInputEnv)
  ? operatorInputEnv
  : path.resolve(frontendRoot, operatorInputEnv);
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p39-review-input-status');
const gateDir = path.join(outputDir, 'gate');
const auditJsonPath = path.join(outputDir, 'daegu-operator-reference-p39-review-input-status.json');
const auditCsvPath = path.join(outputDir, 'daegu-operator-reference-p39-review-input-status.csv');
const pendingCsvPath = path.join(outputDir, 'daegu-operator-reference-p39-pending-review-rows.csv');
const rejectedCsvPath = path.join(outputDir, 'daegu-operator-reference-p39-retrace-candidates.csv');
const immutableChangesCsvPath = path.join(outputDir, 'daegu-operator-reference-p39-immutable-column-changes.csv');
const auditMdPath = path.join(outputDir, 'daegu-operator-reference-p39-review-input-status.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p39-review-input-status-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p39-review-input-status-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p39-review-input-status-gate.md');

const task = process.argv[2] ?? 'status';
const requireStatus = process.argv.includes('--require-status');
const allowedDecisions = new Set(['PENDING', 'APPROVED', 'REJECTED']);
const operatorWritableColumns = new Set([
  'operatorDecision',
  'reviewer',
  'reviewedAt',
  'reviewNote',
  'nextAction',
]);
const evidenceColumns = [
  'reviewId',
  'sectionId',
  'block',
  'name',
  'evidenceCropPng',
  'evidenceCropSvg',
  'overlayPng',
];

const sourceContractLiterals = [
  'P39_OPERATOR_INPUT_STATUS_USES_EXTERNAL_REVIEW_INPUT',
  'OPERATOR_WRITABLE_COLUMNS_ONLY',
  'EVIDENCE_COLUMNS_IMMUTABLE',
  'SOURCE_WRITE_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'DAEGU_OPERATOR_REFERENCE_REVIEW_INPUT',
  'DAEGU_OPERATOR_REFERENCE_P37_REVIEW_INPUT',
  'P39_DEFAULT_OPERATOR_INPUT_IS_P38_SEED_CSV',
  'APPROVED_131_REQUIRED_FOR_RELEASE_LOCK',
  'REJECTED_ROWS_CREATE_RETRACE_BATCH',
  'PENDING_ROWS_KEEP_REVIEW_OPEN',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p39-review-input-status-ready',
  'p39-review-input-status-gate-passed',
];

void sourceContractLiterals;

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(rows, columns) {
  return `${[
    columns.map(csvEscape).join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n')}\n`;
}

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      current = '';
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  if (rows.length === 0) return [];
  const [headers, ...dataRows] = rows;
  return dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

async function readReviewInput(filePath) {
  if (filePath.endsWith('.csv')) {
    return {
      sourceKind: 'CSV',
      rows: parseCsv(await fs.readFile(filePath, 'utf8')),
    };
  }
  const payload = await readJson(filePath);
  return {
    sourceKind: 'JSON',
    rows: payload.rows ?? [],
    sourcePayload: payload,
  };
}

async function pathExists(frontendRelativePath) {
  if (!frontendRelativePath) return false;
  try {
    await fs.access(path.join(frontendRoot, frontendRelativePath));
    return true;
  } catch {
    return false;
  }
}

function isValidIsoDate(value) {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function normalizeDecision(value) {
  const decision = String(value ?? '').trim().toUpperCase();
  return decision || 'PENDING';
}

function buildSeedIndex(seedRows) {
  return new Map(seedRows.map((row) => [row.sectionId, row]));
}

function findImmutableColumnChanges(rows, seedRows) {
  const seedBySectionId = buildSeedIndex(seedRows);
  const changes = [];

  for (const row of rows) {
    const seed = seedBySectionId.get(row.sectionId);
    if (!seed) {
      changes.push({
        reviewId: row.reviewId,
        sectionId: row.sectionId,
        block: row.block,
        column: 'sectionId',
        seedValue: '',
        operatorValue: row.sectionId,
        changeType: 'ROW_NOT_IN_SEED',
      });
      continue;
    }

    for (const column of evidenceColumns) {
      const seedValue = String(seed[column] ?? '');
      const operatorValue = String(row[column] ?? '');
      if (seedValue !== operatorValue) {
        changes.push({
          reviewId: row.reviewId,
          sectionId: row.sectionId,
          block: row.block,
          column,
          seedValue,
          operatorValue,
          changeType: 'EVIDENCE_COLUMN_CHANGED',
        });
      }
    }
  }

  return changes;
}

async function validateReviewRows(rows, seedRows) {
  const sectionIds = new Set();
  const seedIds = new Set(seedRows.map((row) => row.sectionId));
  const immutableChangesBySection = new Map();
  for (const change of findImmutableColumnChanges(rows, seedRows)) {
    const list = immutableChangesBySection.get(change.sectionId) ?? [];
    list.push(change);
    immutableChangesBySection.set(change.sectionId, list);
  }

  const validations = [];
  for (const row of rows) {
    const operatorDecision = normalizeDecision(row.operatorDecision);
    const failures = [];
    const cropPngExists = await pathExists(row.evidenceCropPng);
    const cropSvgExists = await pathExists(row.evidenceCropSvg);
    const overlayExists = await pathExists(row.overlayPng);

    if (!row.sectionId) failures.push('MISSING_SECTION_ID');
    if (sectionIds.has(row.sectionId)) failures.push('DUPLICATE_SECTION_ID');
    sectionIds.add(row.sectionId);
    if (!seedIds.has(row.sectionId)) failures.push('ROW_NOT_IN_SEED');
    if (!allowedDecisions.has(operatorDecision)) failures.push('INVALID_OPERATOR_DECISION_BLOCKS_RELEASE_LOCK');
    if (!cropPngExists || !cropSvgExists || !overlayExists) failures.push('MISSING_EVIDENCE_PATH');
    if (immutableChangesBySection.has(row.sectionId)) failures.push('EVIDENCE_COLUMNS_IMMUTABLE');

    if (operatorDecision === 'APPROVED') {
      if (!row.reviewer || !isValidIsoDate(row.reviewedAt)) {
        failures.push('APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT');
      }
      if (!row.reviewNote) failures.push('APPROVED_REQUIRES_REVIEW_NOTE');
    }

    if (operatorDecision === 'REJECTED') {
      if (!row.reviewNote || !row.nextAction || row.nextAction === 'OPERATOR_REVIEW_PENDING') {
        failures.push('REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION');
      }
    }

    validations.push({
      rowId: row.reviewId || row.sectionId,
      sectionId: row.sectionId,
      block: row.block,
      operatorDecision,
      validationStatus: failures.length ? 'INVALID' : operatorDecision === 'PENDING' ? 'REVIEW_PENDING' : 'PASS',
      failures: failures.join('|'),
    });
  }

  for (const seedId of seedIds) {
    if (!sectionIds.has(seedId)) {
      validations.push({
        rowId: seedId,
        sectionId: seedId,
        block: '',
        operatorDecision: '',
        validationStatus: 'INVALID',
        failures: 'MISSING_SEED_ROW_IN_OPERATOR_INPUT',
      });
    }
  }

  return validations;
}

function buildStatusRows(rows, validations) {
  const validationByRowId = new Map(validations.map((validation) => [validation.rowId, validation]));
  return rows.map((row) => {
    const rowId = row.reviewId || row.sectionId;
    const validation = validationByRowId.get(rowId);
    const operatorDecision = normalizeDecision(row.operatorDecision);
    return {
      reviewId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      operatorDecision,
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      reviewNote: row.reviewNote,
      nextAction: row.nextAction,
      evidenceCropPng: row.evidenceCropPng,
      validationStatus: validation?.validationStatus ?? 'INVALID',
      failures: validation?.failures ?? 'MISSING_VALIDATION',
    };
  });
}

function summarizeRows({ rows, seedRows, validations, immutableChanges }) {
  const approvedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const rejectedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'REJECTED');
  const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const releaseLockCandidateReady = rows.length === 131
    && seedRows.length === 131
    && approvedRows.length === 131
    && rejectedRows.length === 0
    && pendingRows.length === 0
    && invalidRows.length === 0
    && immutableChanges.length === 0;

  return {
    status: invalidRows.length === 0 ? 'p39-review-input-status-ready' : 'p39-review-input-status-blocked',
    reviewRows: rows.length,
    seedRows: seedRows.length,
    expectedReviewRows: 131,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    currentSelectableSeats: DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    immutableColumnChangedRows: new Set(immutableChanges.map((change) => change.sectionId)).size,
    immutableColumnChangeCount: immutableChanges.length,
    rejectedRowsCreateRetraceBatch: rejectedRows.length > 0,
    pendingRowsKeepReviewOpen: pendingRows.length > 0,
    operatorWritableColumnsOnly: immutableChanges.length === 0,
    evidenceColumnsImmutable: immutableChanges.length === 0,
    p39OperatorInputStatusUsesExternalReviewInput: true,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
    releaseLockCandidateReady,
    releaseLockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
}

async function writeStatus() {
  const [seedInput, operatorInput, p37Source] = await Promise.all([
    readReviewInput(p38SeedJsonPath),
    readReviewInput(operatorInputPath),
    fs.readFile(p37SourcePath, 'utf8'),
  ]);
  const seedRows = seedInput.rows;
  const rows = operatorInput.rows;
  const immutableChanges = findImmutableColumnChanges(rows, seedRows);
  const validations = await validateReviewRows(rows, seedRows);
  const statusRows = buildStatusRows(rows, validations);
  const summary = summarizeRows({ rows, seedRows, validations, immutableChanges });
  const pendingRows = statusRows.filter((row) => row.operatorDecision === 'PENDING');
  const rejectedRows = statusRows.filter((row) => row.operatorDecision === 'REJECTED');
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      operatorInput: toFrontendRelative(operatorInputPath),
      operatorInputKind: operatorInput.sourceKind,
      operatorInputEnv: operatorInputEnv,
      p38SeedJson: toFrontendRelative(p38SeedJsonPath),
      p38SeedCsv: toFrontendRelative(p38SeedCsvPath),
      p37Source: toFrontendRelative(p37SourcePath),
      p37ReviewInputOverrideSupported: p37Source.includes('DAEGU_OPERATOR_REFERENCE_P37_REVIEW_INPUT'),
      p37EquivalentEnv: `DAEGU_OPERATOR_REFERENCE_P37_REVIEW_INPUT=${toFrontendRelative(operatorInputPath)}`,
    },
    policy: {
      operatorWritableColumns: [...operatorWritableColumns],
      evidenceColumns,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      releaseLockAllowed: false,
      passRelease177Allowed: false,
      buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
      note: 'P39_OPERATOR_INPUT_STATUS_USES_EXTERNAL_REVIEW_INPUT. OPERATOR_WRITABLE_COLUMNS_ONLY: operatorDecision, reviewer, reviewedAt, reviewNote, nextAction. EVIDENCE_COLUMNS_IMMUTABLE. SOURCE_WRITE_FORBIDDEN. BUILD_BLOCKER_TRACKED_SEPARATELY.',
    },
    summary,
    rows: statusRows,
    pendingRows,
    rejectedRows,
    retraceCandidates: rejectedRows.map((row) => ({
      reviewId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      evidenceCropPng: row.evidenceCropPng,
      reviewNote: row.reviewNote,
      nextAction: row.nextAction,
    })),
    immutableColumnChanges: immutableChanges,
    validations,
    outputs: {
      auditJson: toFrontendRelative(auditJsonPath),
      auditCsv: toFrontendRelative(auditCsvPath),
      pendingCsv: toFrontendRelative(pendingCsvPath),
      rejectedCsv: toFrontendRelative(rejectedCsvPath),
      immutableChangesCsv: toFrontendRelative(immutableChangesCsvPath),
      auditMd: toFrontendRelative(auditMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(auditJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(auditCsvPath, buildCsv(statusRows, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'operatorDecision',
    'reviewer',
    'reviewedAt',
    'reviewNote',
    'nextAction',
    'validationStatus',
    'failures',
    'evidenceCropPng',
  ]));
  await fs.writeFile(pendingCsvPath, buildCsv(pendingRows, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'evidenceCropPng',
    'nextAction',
  ]));
  await fs.writeFile(rejectedCsvPath, buildCsv(payload.retraceCandidates, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'evidenceCropPng',
    'reviewNote',
    'nextAction',
  ]));
  await fs.writeFile(immutableChangesCsvPath, buildCsv(immutableChanges, [
    'reviewId',
    'sectionId',
    'block',
    'column',
    'seedValue',
    'operatorValue',
    'changeType',
  ]));
  await fs.writeFile(auditMdPath, [
    '# 대구 operator reference P39 review input status',
    '',
    `- status: \`${summary.status}\``,
    `- operator input: \`${toFrontendRelative(operatorInputPath)}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- immutable column changed rows: \`${summary.immutableColumnChangedRows}\``,
    `- immutable column change count: \`${summary.immutableColumnChangeCount}\``,
    `- operator writable columns only: \`${summary.operatorWritableColumnsOnly}\``,
    `- evidence columns immutable: \`${summary.evidenceColumnsImmutable}\``,
    `- release lock candidate ready: \`${summary.releaseLockCandidateReady}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
    '## Pending Rows',
    '',
    pendingRows.length > 0
      ? pendingRows.slice(0, 30).map((row) => `- \`${row.block}\` ${row.sectionId} crop=\`${row.evidenceCropPng}\``).join('\n')
      : '- none',
    pendingRows.length > 30 ? `- ... ${pendingRows.length - 30} more` : '',
    '',
    '## Retrace Candidates',
    '',
    payload.retraceCandidates.length > 0
      ? payload.retraceCandidates.map((row) => `- \`${row.block}\` ${row.sectionId} next=\`${row.nextAction}\``).join('\n')
      : '- none',
    '',
    '## Immutable Column Changes',
    '',
    immutableChanges.length > 0
      ? immutableChanges.slice(0, 30).map((row) => `- \`${row.sectionId}\` ${row.column}: seed=\`${row.seedValue}\` operator=\`${row.operatorValue}\``).join('\n')
      : '- none',
    immutableChanges.length > 30 ? `- ... ${immutableChanges.length - 30} more` : '',
    '',
  ].filter((line) => line !== '').join('\n'));

  console.log(`status:${summary.status} input=${toFrontendRelative(operatorInputPath)} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} immutableChanges=${summary.immutableColumnChangeCount} releaseLockCandidateReady=${summary.releaseLockCandidateReady}`);
  return payload;
}

async function writeGate() {
  let audit;
  try {
    audit = await readJson(auditJsonPath);
  } catch {
    audit = await writeStatus();
  }

  const summary = audit.summary ?? {};
  const gateValidations = [
    {
      rowId: 'P39_OPERATOR_INPUT_STATUS_USES_EXTERNAL_REVIEW_INPUT',
      validationType: 'INPUT_POLICY',
      validationStatus: audit.source?.operatorInput ? 'PASS' : 'INVALID',
      failures: audit.source?.operatorInput ? '' : 'OPERATOR_INPUT_PATH_MISSING',
    },
    {
      rowId: 'OPERATOR_INPUT_ROWS_131',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.reviewRows === 131 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 ? '' : `REVIEW_ROWS_NOT_131:${summary.reviewRows}`,
    },
    {
      rowId: 'OPERATOR_WRITABLE_COLUMNS_ONLY',
      validationType: 'IMMUTABILITY_POLICY',
      validationStatus: summary.operatorWritableColumnsOnly ? 'PASS' : 'INVALID',
      failures: summary.operatorWritableColumnsOnly ? '' : `IMMUTABLE_COLUMN_CHANGES:${summary.immutableColumnChangeCount}`,
    },
    {
      rowId: 'EVIDENCE_COLUMNS_IMMUTABLE',
      validationType: 'IMMUTABILITY_POLICY',
      validationStatus: summary.evidenceColumnsImmutable ? 'PASS' : 'INVALID',
      failures: summary.evidenceColumnsImmutable ? '' : `IMMUTABLE_COLUMN_CHANGES:${summary.immutableColumnChangeCount}`,
    },
    {
      rowId: 'APPROVED_131_REQUIRED_FOR_RELEASE_LOCK',
      validationType: 'RELEASE_LOCK_POLICY',
      validationStatus: summary.releaseLockCandidateReady ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.releaseLockCandidateReady ? '' : `APPROVED_${summary.approvedRows}_PENDING_${summary.pendingRows}_REJECTED_${summary.rejectedRows}`,
    },
    {
      rowId: 'REJECTED_ROWS_CREATE_RETRACE_BATCH',
      validationType: 'RETRACE_POLICY',
      validationStatus: summary.rejectedRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.rejectedRows > 0 ? `REJECTED_ROWS:${summary.rejectedRows}` : '',
    },
    {
      rowId: 'PENDING_ROWS_KEEP_REVIEW_OPEN',
      validationType: 'REVIEW_STATUS_POLICY',
      validationStatus: summary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.pendingRows > 0 ? `PENDING_ROWS:${summary.pendingRows}` : '',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
    },
  ];
  const validations = [...gateValidations, ...(audit.validations ?? [])];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const gateSummary = {
    status: invalidRows.length === 0 ? 'p39-review-input-status-gate-passed' : 'p39-review-input-status-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    reviewRows: summary.reviewRows ?? 0,
    approvedRows: summary.approvedRows ?? 0,
    rejectedRows: summary.rejectedRows ?? 0,
    pendingRows: summary.pendingRows ?? 0,
    immutableColumnChangeCount: summary.immutableColumnChangeCount ?? 0,
    releaseLockCandidateReady: summary.releaseLockCandidateReady === true,
    releaseLockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: summary.buildBlockerTrackedSeparately,
  };

  if (requireStatus && invalidRows.length > 0) {
    throw new Error(`P39 review input status gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary: gateSummary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'sectionId',
    'block',
    'operatorDecision',
    'validationType',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P39 review input status gate',
    '',
    `- status: \`${gateSummary.status}\``,
    `- review rows: \`${gateSummary.reviewRows}\``,
    `- approved rows: \`${gateSummary.approvedRows}\``,
    `- rejected rows: \`${gateSummary.rejectedRows}\``,
    `- pending rows: \`${gateSummary.pendingRows}\``,
    `- invalid rows: \`${gateSummary.invalidRows}\``,
    `- review pending validations: \`${gateSummary.reviewPendingRows}\``,
    `- immutable column changes: \`${gateSummary.immutableColumnChangeCount}\``,
    `- release lock candidate ready: \`${gateSummary.releaseLockCandidateReady}\``,
    `- release lock allowed: \`${gateSummary.releaseLockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${gateSummary.passRelease177Allowed}\``,
    `- production write allowed: \`${gateSummary.productionWriteAllowed}\``,
    `- source data write performed: \`${gateSummary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${gateSummary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${gateSummary.status} approved=${gateSummary.approvedRows} rejected=${gateSummary.rejectedRows} pending=${gateSummary.pendingRows} invalidRows=${gateSummary.invalidRows} immutableChanges=${gateSummary.immutableColumnChangeCount} releaseLockCandidateReady=${gateSummary.releaseLockCandidateReady}`);
}

if (task === 'status') {
  await writeStatus();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
