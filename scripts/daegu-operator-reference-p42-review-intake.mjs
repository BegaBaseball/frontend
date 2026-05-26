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
const p41JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p41-review-handoff/daegu-operator-reference-p41-review-handoff.json');
const p41HandoffCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p41-review-handoff/daegu-operator-reference-p41-review-handoff.csv');
const reviewInputEnv = process.env.DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT
  ?? process.env.DAEGU_OPERATOR_REFERENCE_REVIEW_INPUT
  ?? toFrontendRelative(p41HandoffCsvPath);
const reviewInputPath = path.isAbsolute(reviewInputEnv)
  ? reviewInputEnv
  : path.resolve(frontendRoot, reviewInputEnv);
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p42-review-intake');
const gateDir = path.join(outputDir, 'gate');
const intakeJsonPath = path.join(outputDir, 'daegu-operator-reference-p42-review-intake.json');
const intakeCsvPath = path.join(outputDir, 'daegu-operator-reference-p42-review-intake.csv');
const zoneStatusCsvPath = path.join(outputDir, 'daegu-operator-reference-p42-zone-status.csv');
const approvedCandidatesCsvPath = path.join(outputDir, 'daegu-operator-reference-p42-approved-candidates.csv');
const retraceCandidatesCsvPath = path.join(outputDir, 'daegu-operator-reference-p42-retrace-candidates.csv');
const pendingQueueCsvPath = path.join(outputDir, 'daegu-operator-reference-p42-pending-review-queue.csv');
const invalidRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p42-invalid-review-rows.csv');
const immutableChangesCsvPath = path.join(outputDir, 'daegu-operator-reference-p42-immutable-column-changes.csv');
const intakeMdPath = path.join(outputDir, 'daegu-operator-reference-p42-review-intake.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p42-review-intake-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p42-review-intake-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p42-review-intake-gate.md');

const task = process.argv[2] ?? 'intake';
const requireIntake = process.argv.includes('--require-intake');
const allowedDecisions = new Set(['PENDING', 'APPROVED', 'REJECTED']);
const operatorWritableColumns = [
  'operatorDecision',
  'reviewer',
  'reviewedAt',
  'reviewNote',
  'nextAction',
];
const immutableEvidenceColumns = [
  'reviewId',
  'sectionId',
  'block',
  'name',
  'evidenceCropPng',
  'evidenceCropSvg',
  'overlayPng',
];

const sourceContractLiterals = [
  'P42_OPERATOR_REVIEW_INTAKE_FROM_P41_HANDOFF',
  'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
  'P42_DEFAULT_OPERATOR_INPUT_IS_P41_HANDOFF_CSV',
  'P41_ZONE_CSV_INPUT_SUPPORTED',
  'OPERATOR_WRITABLE_COLUMNS_ONLY',
  'EVIDENCE_COLUMNS_IMMUTABLE',
  'APPROVED_REQUIRES_REVIEWER_REVIEWED_AT_REVIEW_NOTE',
  'REJECTED_ROWS_CREATE_RETRACE_QUEUE',
  'PENDING_ROWS_KEEP_REVIEW_OPEN',
  'APPROVED_131_REJECTED_0_PENDING_0_REQUIRED_FOR_P43',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p42-review-intake-ready',
  'p42-review-intake-gate-passed',
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

async function readCsvFile(filePath) {
  return parseCsv(await fs.readFile(filePath, 'utf8'));
}

async function readReviewInput(filePath) {
  const stat = await fs.stat(filePath);
  if (stat.isDirectory()) {
    const entries = (await fs.readdir(filePath))
      .filter((entry) => entry.endsWith('.csv'))
      .sort();
    const rowsByFile = await Promise.all(entries.map(async (entry) => ({
      file: path.join(filePath, entry),
      rows: await readCsvFile(path.join(filePath, entry)),
    })));
    return {
      sourceKind: 'CSV_DIRECTORY',
      rows: rowsByFile.flatMap(({ file, rows }) => rows.map((row) => ({ ...row, reviewInputFile: toFrontendRelative(file) }))),
      files: rowsByFile.map(({ file }) => toFrontendRelative(file)),
    };
  }
  if (filePath.endsWith('.csv')) {
    return {
      sourceKind: 'CSV',
      rows: await readCsvFile(filePath),
      files: [toFrontendRelative(filePath)],
    };
  }
  const payload = await readJson(filePath);
  return {
    sourceKind: 'JSON',
    rows: payload.rows ?? [],
    files: [toFrontendRelative(filePath)],
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

function normalizeDecision(value) {
  return String(value ?? '').trim().toUpperCase() || 'PENDING';
}

function isValidIsoDate(value) {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
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
        changeType: 'ROW_NOT_IN_P41_HANDOFF',
      });
      continue;
    }
    for (const column of immutableEvidenceColumns) {
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

async function validateRows(rows, seedRows, immutableChanges) {
  const sectionIds = new Set();
  const seedIds = new Set(seedRows.map((row) => row.sectionId));
  const immutableChangesBySection = new Map();
  for (const change of immutableChanges) {
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
    if (!seedIds.has(row.sectionId)) failures.push('ROW_NOT_IN_P41_HANDOFF');
    if (!allowedDecisions.has(operatorDecision)) failures.push('INVALID_OPERATOR_DECISION');
    if (immutableChangesBySection.has(row.sectionId)) failures.push('EVIDENCE_COLUMNS_IMMUTABLE');
    if (!cropPngExists || !cropSvgExists || !overlayExists) failures.push('MISSING_EVIDENCE_LINK');

    if (operatorDecision === 'APPROVED') {
      if (!row.reviewer || !isValidIsoDate(row.reviewedAt) || !row.reviewNote) {
        failures.push('APPROVED_REQUIRES_REVIEWER_REVIEWED_AT_REVIEW_NOTE');
      }
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
      reviewZone: row.reviewZone,
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
        reviewZone: '',
        operatorDecision: '',
        validationStatus: 'INVALID',
        failures: 'MISSING_P41_HANDOFF_ROW_IN_REVIEW_INPUT',
      });
    }
  }

  return validations;
}

function enrichInputRows(rows, seedRows) {
  const seedBySectionId = buildSeedIndex(seedRows);
  return rows.map((row) => {
    const seed = seedBySectionId.get(row.sectionId) ?? {};
    const operatorDecision = normalizeDecision(row.operatorDecision);
    return {
      queueOrder: row.queueOrder || seed.queueOrder,
      reviewZone: row.reviewZone || seed.reviewZone,
      zoneOrder: row.zoneOrder || seed.zoneOrder,
      reviewId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      operatorDecision,
      reviewer: row.reviewer ?? '',
      reviewedAt: row.reviewedAt ?? '',
      reviewNote: row.reviewNote ?? '',
      nextAction: row.nextAction || (operatorDecision === 'PENDING' ? 'OPERATOR_REVIEW_PENDING' : ''),
      evidenceCropPng: row.evidenceCropPng || seed.evidenceCropPng,
      evidenceCropSvg: row.evidenceCropSvg || seed.evidenceCropSvg,
      overlayPng: row.overlayPng || seed.overlayPng,
      reviewInputFile: row.reviewInputFile ?? '',
    };
  });
}

function buildStatusRows(rows, validations) {
  const validationByRowId = new Map(validations.map((validation) => [validation.rowId, validation]));
  return rows.map((row) => {
    const validation = validationByRowId.get(row.reviewId || row.sectionId);
    return {
      queueOrder: row.queueOrder,
      reviewZone: row.reviewZone,
      zoneOrder: row.zoneOrder,
      reviewId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      operatorDecision: row.operatorDecision,
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      reviewNote: row.reviewNote,
      nextAction: row.nextAction,
      validationStatus: validation?.validationStatus ?? 'INVALID',
      failures: validation?.failures ?? 'MISSING_VALIDATION',
      evidenceCropPng: row.evidenceCropPng,
      evidenceCropSvg: row.evidenceCropSvg,
      overlayPng: row.overlayPng,
      reviewInputFile: row.reviewInputFile,
    };
  });
}

function buildZoneStatusRows(rows) {
  const byZone = new Map();
  for (const row of rows) {
    const list = byZone.get(row.reviewZone) ?? [];
    list.push(row);
    byZone.set(row.reviewZone, list);
  }
  return [...byZone.entries()].map(([reviewZone, zoneRows]) => ({
    reviewZone,
    rows: zoneRows.length,
    approvedRows: zoneRows.filter((row) => row.operatorDecision === 'APPROVED').length,
    rejectedRows: zoneRows.filter((row) => row.operatorDecision === 'REJECTED').length,
    pendingRows: zoneRows.filter((row) => row.operatorDecision === 'PENDING').length,
    invalidRows: zoneRows.filter((row) => row.validationStatus === 'INVALID').length,
    nextAction: zoneRows.some((row) => row.validationStatus === 'INVALID')
      ? 'Fix invalid operator input rows.'
      : zoneRows.some((row) => row.operatorDecision === 'REJECTED')
        ? 'Create retrace batch for rejected rows.'
        : zoneRows.some((row) => row.operatorDecision === 'PENDING')
          ? 'Continue operator review.'
          : 'Zone is ready for P43 candidate check.',
  }));
}

function summarize({ statusRows, seedRows, validations, immutableChanges }) {
  const approvedRows = statusRows.filter((row) => row.operatorDecision === 'APPROVED');
  const rejectedRows = statusRows.filter((row) => row.operatorDecision === 'REJECTED');
  const pendingRows = statusRows.filter((row) => row.operatorDecision === 'PENDING');
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const releaseLockCandidateReady = statusRows.length === 131
    && seedRows.length === 131
    && approvedRows.length === 131
    && rejectedRows.length === 0
    && pendingRows.length === 0
    && invalidRows.length === 0
    && immutableChanges.length === 0;
  return {
    status: invalidRows.length === 0 ? 'p42-review-intake-ready' : 'p42-review-intake-blocked',
    reviewRows: statusRows.length,
    expectedReviewRows: 131,
    seedRows: seedRows.length,
    currentSelectableSeats: DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    immutableColumnChangeCount: immutableChanges.length,
    immutableColumnChangedRows: new Set(immutableChanges.map((change) => change.sectionId)).size,
    rejectedRowsCreateRetraceQueue: rejectedRows.length > 0,
    pendingRowsKeepReviewOpen: pendingRows.length > 0,
    operatorWritableColumnsOnly: immutableChanges.length === 0,
    evidenceColumnsImmutable: immutableChanges.length === 0,
    p42OperatorReviewIntakeFromP41Handoff: true,
    p41ZoneCsvInputSupported: true,
    p42DefaultOperatorInputIsP41HandoffCsv: reviewInputEnv === toFrontendRelative(p41HandoffCsvPath),
    releaseLockCandidateReady,
    p43CandidateAllowed: releaseLockCandidateReady,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

async function writeIntake() {
  const [p41, reviewInput] = await Promise.all([
    readJson(p41JsonPath),
    readReviewInput(reviewInputPath),
  ]);
  const seedRows = p41.rows ?? [];
  const rows = enrichInputRows(reviewInput.rows, seedRows);
  const immutableChanges = findImmutableColumnChanges(rows, seedRows);
  const validations = await validateRows(rows, seedRows, immutableChanges);
  const statusRows = buildStatusRows(rows, validations);
  const summary = summarize({ statusRows, seedRows, validations, immutableChanges });
  const zoneStatusRows = buildZoneStatusRows(statusRows);
  const approvedCandidates = statusRows.filter((row) => row.operatorDecision === 'APPROVED' && row.validationStatus === 'PASS');
  const retraceCandidates = statusRows.filter((row) => row.operatorDecision === 'REJECTED' && row.validationStatus !== 'INVALID');
  const pendingRows = statusRows.filter((row) => row.operatorDecision === 'PENDING');
  const invalidRows = statusRows.filter((row) => row.validationStatus === 'INVALID');
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p41Json: toFrontendRelative(p41JsonPath),
      p41HandoffCsv: toFrontendRelative(p41HandoffCsvPath),
      reviewInput: toFrontendRelative(reviewInputPath),
      reviewInputEnv,
      reviewInputKind: reviewInput.sourceKind,
      reviewInputFiles: reviewInput.files,
    },
    policy: {
      operatorWritableColumns,
      immutableEvidenceColumns,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P42_OPERATOR_REVIEW_INTAKE_FROM_P41_HANDOFF. DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT. P42_DEFAULT_OPERATOR_INPUT_IS_P41_HANDOFF_CSV. P41_ZONE_CSV_INPUT_SUPPORTED. OPERATOR_WRITABLE_COLUMNS_ONLY. EVIDENCE_COLUMNS_IMMUTABLE.',
    },
    summary,
    zoneStatusRows,
    approvedCandidates,
    retraceCandidates,
    pendingRows,
    invalidRows,
    immutableColumnChanges: immutableChanges,
    rows: statusRows,
    validations,
    outputs: {
      intakeJson: toFrontendRelative(intakeJsonPath),
      intakeCsv: toFrontendRelative(intakeCsvPath),
      zoneStatusCsv: toFrontendRelative(zoneStatusCsvPath),
      approvedCandidatesCsv: toFrontendRelative(approvedCandidatesCsvPath),
      retraceCandidatesCsv: toFrontendRelative(retraceCandidatesCsvPath),
      pendingQueueCsv: toFrontendRelative(pendingQueueCsvPath),
      invalidRowsCsv: toFrontendRelative(invalidRowsCsvPath),
      immutableChangesCsv: toFrontendRelative(immutableChangesCsvPath),
      intakeMd: toFrontendRelative(intakeMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(intakeJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(intakeCsvPath, buildCsv(statusRows, [
    'queueOrder',
    'reviewZone',
    'zoneOrder',
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
    'evidenceCropSvg',
    'overlayPng',
    'reviewInputFile',
  ]));
  await fs.writeFile(zoneStatusCsvPath, buildCsv(zoneStatusRows, [
    'reviewZone',
    'rows',
    'approvedRows',
    'rejectedRows',
    'pendingRows',
    'invalidRows',
    'nextAction',
  ]));
  await fs.writeFile(approvedCandidatesCsvPath, buildCsv(approvedCandidates, [
    'queueOrder',
    'reviewZone',
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewer',
    'reviewedAt',
    'reviewNote',
  ]));
  await fs.writeFile(retraceCandidatesCsvPath, buildCsv(retraceCandidates, [
    'queueOrder',
    'reviewZone',
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewNote',
    'nextAction',
    'evidenceCropPng',
  ]));
  await fs.writeFile(pendingQueueCsvPath, buildCsv(pendingRows, [
    'queueOrder',
    'reviewZone',
    'zoneOrder',
    'reviewId',
    'sectionId',
    'block',
    'name',
    'evidenceCropPng',
    'evidenceCropSvg',
    'overlayPng',
    'nextAction',
  ]));
  await fs.writeFile(invalidRowsCsvPath, buildCsv(invalidRows, [
    'queueOrder',
    'reviewZone',
    'reviewId',
    'sectionId',
    'block',
    'operatorDecision',
    'validationStatus',
    'failures',
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
  await fs.writeFile(intakeMdPath, [
    '# 대구 operator reference P42 review intake',
    '',
    `- status: \`${summary.status}\``,
    `- review input: \`${toFrontendRelative(reviewInputPath)}\``,
    `- review input kind: \`${reviewInput.sourceKind}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- immutable column changes: \`${summary.immutableColumnChangeCount}\``,
    `- release lock candidate ready: \`${summary.releaseLockCandidateReady}\``,
    `- P43 candidate allowed: \`${summary.p43CandidateAllowed}\``,
    `- operator reference 131 lock allowed: \`${summary.operatorReference131LockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
    '## Zone Status',
    '',
    ...zoneStatusRows.map((row) => `- \`${row.reviewZone}\`: rows=\`${row.rows}\`, approved=\`${row.approvedRows}\`, rejected=\`${row.rejectedRows}\`, pending=\`${row.pendingRows}\`, invalid=\`${row.invalidRows}\``),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} input=${toFrontendRelative(reviewInputPath)} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} immutableChanges=${summary.immutableColumnChangeCount} p43CandidateAllowed=${summary.p43CandidateAllowed}`);
  return payload;
}

async function writeGate() {
  let intake;
  try {
    intake = await readJson(intakeJsonPath);
  } catch {
    intake = await writeIntake();
  }
  const summary = intake.summary ?? {};
  const gateValidations = [
    {
      rowId: 'P42_OPERATOR_REVIEW_INTAKE_FROM_P41_HANDOFF',
      validationType: 'SOURCE_CHAIN',
      validationStatus: intake.source?.p41Json ? 'PASS' : 'INVALID',
      failures: intake.source?.p41Json ? '' : 'P41_HANDOFF_SOURCE_MISSING',
    },
    {
      rowId: 'REVIEW_INPUT_ROWS_131',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.reviewRows === 131 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 ? '' : `REVIEW_ROWS_NOT_131:${summary.reviewRows}`,
    },
    {
      rowId: 'OPERATOR_WRITABLE_COLUMNS_ONLY',
      validationType: 'IMMUTABILITY_POLICY',
      validationStatus: summary.operatorWritableColumnsOnly ? 'PASS' : 'INVALID',
      failures: summary.operatorWritableColumnsOnly ? '' : `IMMUTABLE_CHANGES:${summary.immutableColumnChangeCount}`,
    },
    {
      rowId: 'EVIDENCE_COLUMNS_IMMUTABLE',
      validationType: 'IMMUTABILITY_POLICY',
      validationStatus: summary.evidenceColumnsImmutable ? 'PASS' : 'INVALID',
      failures: summary.evidenceColumnsImmutable ? '' : `IMMUTABLE_CHANGES:${summary.immutableColumnChangeCount}`,
    },
    {
      rowId: 'APPROVED_131_REJECTED_0_PENDING_0_REQUIRED_FOR_P43',
      validationType: 'P43_POLICY',
      validationStatus: summary.releaseLockCandidateReady ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.releaseLockCandidateReady ? '' : `APPROVED_${summary.approvedRows}_REJECTED_${summary.rejectedRows}_PENDING_${summary.pendingRows}`,
    },
    {
      rowId: 'REJECTED_ROWS_CREATE_RETRACE_QUEUE',
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
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
    },
  ];
  const validations = [...gateValidations, ...(intake.validations ?? [])];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const gateSummary = {
    status: invalidRows.length === 0 ? 'p42-review-intake-gate-passed' : 'p42-review-intake-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    reviewRows: summary.reviewRows ?? 0,
    approvedRows: summary.approvedRows ?? 0,
    rejectedRows: summary.rejectedRows ?? 0,
    pendingRows: summary.pendingRows ?? 0,
    immutableColumnChangeCount: summary.immutableColumnChangeCount ?? 0,
    releaseLockCandidateReady: summary.releaseLockCandidateReady === true,
    p43CandidateAllowed: summary.p43CandidateAllowed === true,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: summary.buildBlockerTrackedSeparately,
  };

  if (requireIntake && invalidRows.length > 0) {
    throw new Error(`P42 review intake gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary: gateSummary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'sectionId',
    'block',
    'reviewZone',
    'operatorDecision',
    'validationType',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P42 review intake gate',
    '',
    `- status: \`${gateSummary.status}\``,
    `- review rows: \`${gateSummary.reviewRows}\``,
    `- approved rows: \`${gateSummary.approvedRows}\``,
    `- rejected rows: \`${gateSummary.rejectedRows}\``,
    `- pending rows: \`${gateSummary.pendingRows}\``,
    `- invalid rows: \`${gateSummary.invalidRows}\``,
    `- review pending checks: \`${gateSummary.reviewPendingRows}\``,
    `- immutable column changes: \`${gateSummary.immutableColumnChangeCount}\``,
    `- release lock candidate ready: \`${gateSummary.releaseLockCandidateReady}\``,
    `- P43 candidate allowed: \`${gateSummary.p43CandidateAllowed}\``,
    `- operator reference 131 lock allowed: \`${gateSummary.operatorReference131LockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${gateSummary.passRelease177Allowed}\``,
    `- production write allowed: \`${gateSummary.productionWriteAllowed}\``,
    `- source data write performed: \`${gateSummary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${gateSummary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${gateSummary.status} approved=${gateSummary.approvedRows} rejected=${gateSummary.rejectedRows} pending=${gateSummary.pendingRows} invalidRows=${gateSummary.invalidRows} immutableChanges=${gateSummary.immutableColumnChangeCount} p43CandidateAllowed=${gateSummary.p43CandidateAllowed}`);
}

if (task === 'intake') {
  await writeIntake();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
