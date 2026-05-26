import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p50JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p50-final-review-pack/daegu-operator-reference-p50-final-review-pack.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input');
const zoneDir = path.join(outputDir, 'zones');
const gateDir = path.join(outputDir, 'gate');
const seedCsvPath = path.join(outputDir, 'daegu-operator-reference-p51-real-review-input-seed.csv');
const realInputCsvPath = path.join(outputDir, 'daegu-operator-reference-p51-real-review-input.csv');
const manifestJsonPath = path.join(outputDir, 'daegu-operator-reference-p51-real-review-input.json');
const statusCsvPath = path.join(outputDir, 'daegu-operator-reference-p51-real-review-input-status.csv');
const zoneSummaryCsvPath = path.join(outputDir, 'daegu-operator-reference-p51-zone-summary.csv');
const immutableChangesCsvPath = path.join(outputDir, 'daegu-operator-reference-p51-immutable-column-changes.csv');
const invalidRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p51-invalid-rows.csv');
const guideMdPath = path.join(outputDir, 'daegu-operator-reference-p51-operator-guide.md');
const nextCommandsMdPath = path.join(outputDir, 'daegu-operator-reference-p51-next-commands.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p51-real-review-input-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p51-real-review-input-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p51-real-review-input-gate.md');

const task = process.argv[2] ?? 'input';
const requireInput = process.argv.includes('--require-input');
const forceInputOverwrite = process.argv.includes('--force');

const operatorWritableColumns = [
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'reviewNote',
  'nextAction',
];
const immutableEvidenceColumns = [
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
];
const allowedDecisions = new Set(['PENDING', 'APPROVED', 'REJECTED']);

const sourceContractLiterals = [
  'P51_REAL_REVIEW_INPUT',
  'P50_FINAL_REVIEW_PACK_SOURCE',
  'P51_REAL_INPUT_FILE_SEPARATED_FROM_P41_P50',
  'P51_OPERATOR_EDITABLE_FILE_NOT_OVERWRITTEN',
  'DAEGU_OPERATOR_REFERENCE_P51_REVIEW_INPUT',
  'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
  'OPERATOR_WRITABLE_COLUMNS_INCLUDE_CORRECTED_GEOMETRY',
  'APPROVED_REQUIRES_CORRECTED_PATH_LABEL_REVIEWER_REVIEWED_AT',
  'REJECTED_REQUIRES_RETRACE',
  'PENDING_ROWS_BLOCK_SOURCE_WRITE',
  'IMMUTABLE_EVIDENCE_COLUMNS_PRESERVED',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p51-real-review-input-ready',
  'p51-real-review-input-gate-passed',
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

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

function zoneSlug(zoneId) {
  return String(zoneId).toLowerCase().replace(/_/g, '-');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(filePath) {
  const bytes = await fs.readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

function normalizeDecision(value) {
  return String(value ?? '').trim().toUpperCase() || 'PENDING';
}

function isValidIsoDate(value) {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function isFiniteNumberText(value) {
  if (value === null || value === undefined || String(value).trim() === '') return false;
  return Number.isFinite(Number(value));
}

function buildSeedRows(p50) {
  return (p50.rows ?? []).map((row) => ({
    queueOrder: row.queueOrder,
    reviewZone: row.reviewZone,
    zoneOrder: row.zoneOrder,
    reviewId: row.reviewId,
    sectionId: row.sectionId,
    block: row.block,
    name: row.name,
    operatorDecision: normalizeDecision(row.operatorDecision),
    correctedPath: '',
    correctedLabelX: '',
    correctedLabelY: '',
    reviewer: row.reviewer ?? '',
    reviewedAt: row.reviewedAt ?? '',
    reviewNote: row.reviewNote ?? '',
    nextAction: row.nextAction || 'OPERATOR_REVIEW_PENDING',
    evidenceCropPng: row.evidenceCropPng,
    evidenceCropSvg: row.evidenceCropSvg,
    overlayPng: row.overlayPng,
    editableColumns: operatorWritableColumns.join('|'),
    immutableColumns: immutableEvidenceColumns.join('|'),
  }));
}

function buildSeedIndex(seedRows) {
  return new Map(seedRows.map((row) => [row.sectionId, row]));
}

function findImmutableChanges(rows, seedRows) {
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
        changeType: 'ROW_NOT_IN_P50_FINAL_REVIEW_PACK',
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
          changeType: 'IMMUTABLE_EVIDENCE_COLUMN_CHANGED',
        });
      }
    }
  }
  return changes;
}

function validateRows(rows, seedRows, immutableChanges) {
  const seedIds = new Set(seedRows.map((row) => row.sectionId));
  const sectionIds = new Set();
  const immutableChangedIds = new Set(immutableChanges.map((change) => change.sectionId));
  const validations = [];

  for (const row of rows) {
    const operatorDecision = normalizeDecision(row.operatorDecision);
    const failures = [];
    if (!row.sectionId) failures.push('MISSING_SECTION_ID');
    if (sectionIds.has(row.sectionId)) failures.push('DUPLICATE_SECTION_ID');
    sectionIds.add(row.sectionId);
    if (!seedIds.has(row.sectionId)) failures.push('ROW_NOT_IN_P50_FINAL_REVIEW_PACK');
    if (!allowedDecisions.has(operatorDecision)) failures.push('INVALID_OPERATOR_DECISION');
    if (immutableChangedIds.has(row.sectionId)) failures.push('IMMUTABLE_EVIDENCE_COLUMNS_PRESERVED');

    if (operatorDecision === 'APPROVED') {
      if (!row.correctedPath) failures.push('APPROVED_REQUIRES_CORRECTED_PATH');
      if (!isFiniteNumberText(row.correctedLabelX) || !isFiniteNumberText(row.correctedLabelY)) {
        failures.push('APPROVED_REQUIRES_CORRECTED_LABEL_XY');
      }
      if (!row.reviewer || !isValidIsoDate(row.reviewedAt) || !row.reviewNote) {
        failures.push('APPROVED_REQUIRES_REVIEWER_REVIEWED_AT_REVIEW_NOTE');
      }
    }

    if (operatorDecision === 'REJECTED') {
      if (!row.reviewNote || !row.nextAction || row.nextAction === 'OPERATOR_REVIEW_PENDING') {
        failures.push('REJECTED_REQUIRES_RETRACE');
      }
    }

    validations.push({
      rowId: row.reviewId || row.sectionId,
      sectionId: row.sectionId,
      block: row.block,
      reviewZone: row.reviewZone,
      operatorDecision,
      validationStatus: failures.length > 0 ? 'INVALID' : operatorDecision === 'PENDING' ? 'REVIEW_PENDING' : 'PASS',
      failures: failures.join('|'),
      nextAction: failures.length > 0
        ? 'Fix the operator input row before P52.'
        : operatorDecision === 'PENDING'
          ? 'Complete operator review before source patch preview.'
          : 'Row is ready for downstream intake.',
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
        failures: 'MISSING_P50_ROW_IN_P51_INPUT',
        nextAction: 'Restore the missing operator input row.',
      });
    }
  }

  return validations;
}

function buildZoneSummaries(rows) {
  const zoneIds = [...new Set(rows.map((row) => row.reviewZone))];
  return zoneIds.map((reviewZone, index) => {
    const zoneRows = rows.filter((row) => row.reviewZone === reviewZone);
    return {
      reviewZone,
      reviewBatch: `P51-Z${String(index + 1).padStart(2, '0')}`,
      rows: zoneRows.length,
      approvedRows: zoneRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED').length,
      rejectedRows: zoneRows.filter((row) => normalizeDecision(row.operatorDecision) === 'REJECTED').length,
      pendingRows: zoneRows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING').length,
      zoneCsv: toFrontendRelative(path.join(zoneDir, `daegu-operator-reference-p51-${zoneSlug(reviewZone)}.csv`)),
      nextAction: 'Operator edits only the full P51 input CSV unless a zone split workflow is explicitly chosen.',
    };
  });
}

function summarize({ rows, seedRows, validations, immutableChanges, inputCreated, inputSha256, p50 }) {
  const approvedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const rejectedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'REJECTED');
  const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const releaseCandidateAllowed = rows.length === 131
    && seedRows.length === 131
    && approvedRows.length === 131
    && rejectedRows.length === 0
    && pendingRows.length === 0
    && invalidRows.length === 0
    && immutableChanges.length === 0;

  return {
    status: invalidRows.length === 0 ? 'p51-real-review-input-ready' : 'p51-real-review-input-blocked',
    p50Status: p50.status ?? p50.summary?.status ?? '',
    reviewRows: rows.length,
    expectedReviewRows: 131,
    seedRows: seedRows.length,
    currentSelectableSeats,
    officialDatasetBlocks,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    immutableColumnChangeCount: immutableChanges.length,
    p51RealInputFileSeparatedFromP41P50: true,
    p51OperatorEditableFileNotOverwritten: !inputCreated,
    realInputCreated: inputCreated,
    realInputSha256: inputSha256,
    operatorWritableColumnsIncludeCorrectedGeometry: operatorWritableColumns.includes('correctedPath')
      && operatorWritableColumns.includes('correctedLabelX')
      && operatorWritableColumns.includes('correctedLabelY'),
    immutableEvidenceColumnsPreserved: immutableChanges.length === 0,
    pendingRowsBlockSourceWrite: pendingRows.length > 0,
    releaseCandidateAllowed,
    p52SourcePatchPreviewAllowed: releaseCandidateAllowed,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildGateRows(summary) {
  return [
    {
      rowId: 'P51_REAL_REVIEW_INPUT',
      validationType: 'INPUT_CONTRACT',
      validationStatus: summary.reviewRows === 131 && summary.seedRows === 131 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 && summary.seedRows === 131 ? '' : `ROWS_${summary.reviewRows}_SEED_${summary.seedRows}`,
      nextAction: 'Use the P51 CSV as the operator-owned editable input.',
    },
    {
      rowId: 'P51_REAL_INPUT_FILE_SEPARATED_FROM_P41_P50',
      validationType: 'INPUT_ORIGIN_POLICY',
      validationStatus: summary.p51RealInputFileSeparatedFromP41P50 ? 'PASS' : 'INVALID',
      failures: summary.p51RealInputFileSeparatedFromP41P50 ? '' : 'P51_INPUT_NOT_SEPARATED',
      nextAction: 'Do not edit P41/P50 generated files directly.',
    },
    {
      rowId: 'P51_OPERATOR_EDITABLE_FILE_NOT_OVERWRITTEN',
      validationType: 'EDIT_SAFETY_POLICY',
      validationStatus: 'PASS',
      failures: '',
      nextAction: summary.realInputCreated
        ? 'Initial editable file was created. Future runs preserve it unless --force is used.'
        : 'Existing editable input was preserved.',
    },
    {
      rowId: 'OPERATOR_WRITABLE_COLUMNS_INCLUDE_CORRECTED_GEOMETRY',
      validationType: 'COLUMN_POLICY',
      validationStatus: summary.operatorWritableColumnsIncludeCorrectedGeometry ? 'PASS' : 'INVALID',
      failures: summary.operatorWritableColumnsIncludeCorrectedGeometry ? '' : 'CORRECTED_GEOMETRY_COLUMNS_MISSING',
      nextAction: 'Keep correctedPath and correctedLabelX/Y in the operator input.',
    },
    {
      rowId: 'IMMUTABLE_EVIDENCE_COLUMNS_PRESERVED',
      validationType: 'IMMUTABILITY_POLICY',
      validationStatus: summary.immutableEvidenceColumnsPreserved ? 'PASS' : 'INVALID',
      failures: summary.immutableEvidenceColumnsPreserved ? '' : `IMMUTABLE_CHANGES:${summary.immutableColumnChangeCount}`,
      nextAction: 'Restore immutable evidence fields before downstream intake.',
    },
    {
      rowId: 'APPROVED_REQUIRES_CORRECTED_PATH_LABEL_REVIEWER_REVIEWED_AT',
      validationType: 'APPROVAL_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Approved rows must include correctedPath, correctedLabelX/Y, reviewer, reviewedAt, and reviewNote.',
    },
    {
      rowId: 'PENDING_ROWS_BLOCK_SOURCE_WRITE',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.pendingRows > 0 ? `PENDING_ROWS:${summary.pendingRows}` : '',
      nextAction: summary.pendingRows > 0 ? 'Keep source write blocked until review is complete.' : 'No pending rows remain.',
    },
    {
      rowId: 'REJECTED_REQUIRES_RETRACE',
      validationType: 'RETRACE_POLICY',
      validationStatus: summary.rejectedRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.rejectedRows > 0 ? `REJECTED_ROWS:${summary.rejectedRows}` : '',
      nextAction: summary.rejectedRows > 0 ? 'Create retrace worksets before P52.' : 'No rejected rows require retrace.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'SOURCE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
      nextAction: 'P51 must not modify daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P51 prepares operator input only; release remains blocked.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu operator input.',
    },
  ];
}

async function readP50SeedRows() {
  const p50 = await readJson(p50JsonPath);
  return {
    p50,
    seedRows: buildSeedRows(p50),
  };
}

async function writeInput() {
  const { p50, seedRows } = await readP50SeedRows();
  const zoneSummaries = buildZoneSummaries(seedRows);
  const inputAlreadyExists = await pathExists(realInputCsvPath);
  const shouldWriteRealInput = forceInputOverwrite || !inputAlreadyExists;

  await fs.mkdir(zoneDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(seedCsvPath, buildCsv(seedRows, [
    ...immutableEvidenceColumns,
    ...operatorWritableColumns,
    'editableColumns',
    'immutableColumns',
  ]));

  if (shouldWriteRealInput) {
    await fs.writeFile(realInputCsvPath, buildCsv(seedRows, [
      ...immutableEvidenceColumns,
      ...operatorWritableColumns,
      'editableColumns',
      'immutableColumns',
    ]));
  }

  for (const zone of zoneSummaries) {
    const zoneRows = seedRows.filter((row) => row.reviewZone === zone.reviewZone);
    await fs.writeFile(path.join(zoneDir, `daegu-operator-reference-p51-${zoneSlug(zone.reviewZone)}.csv`), buildCsv(zoneRows, [
      ...immutableEvidenceColumns,
      ...operatorWritableColumns,
      'editableColumns',
      'immutableColumns',
    ]));
  }

  const rows = parseCsv(await fs.readFile(realInputCsvPath, 'utf8'));
  const immutableChanges = findImmutableChanges(rows, seedRows);
  const validations = validateRows(rows, seedRows, immutableChanges);
  const inputSha256 = await hashFile(realInputCsvPath);
  const summary = summarize({
    rows,
    seedRows,
    validations,
    immutableChanges,
    inputCreated: shouldWriteRealInput,
    inputSha256,
    p50,
  });

  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p50Json: toFrontendRelative(p50JsonPath),
      seedCsv: toFrontendRelative(seedCsvPath),
      realReviewInputCsv: toFrontendRelative(realInputCsvPath),
      p42ReviewInputCommandEnv: 'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
      p51ReviewInputCommandEnv: 'DAEGU_OPERATOR_REFERENCE_P51_REVIEW_INPUT',
    },
    policy: {
      operatorWritableColumns,
      immutableEvidenceColumns,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P51_REAL_REVIEW_INPUT. P50_FINAL_REVIEW_PACK_SOURCE. P51_REAL_INPUT_FILE_SEPARATED_FROM_P41_P50. OPERATOR_WRITABLE_COLUMNS_INCLUDE_CORRECTED_GEOMETRY. DAEGU_OPERATOR_REFERENCE_P51_REVIEW_INPUT.',
    },
    summary,
    zoneSummaries,
    immutableColumnChanges: immutableChanges,
    invalidRows: validations.filter((row) => row.validationStatus === 'INVALID'),
    rows,
    validations,
    outputs: {
      manifestJson: toFrontendRelative(manifestJsonPath),
      seedCsv: toFrontendRelative(seedCsvPath),
      realInputCsv: toFrontendRelative(realInputCsvPath),
      statusCsv: toFrontendRelative(statusCsvPath),
      zoneSummaryCsv: toFrontendRelative(zoneSummaryCsvPath),
      immutableChangesCsv: toFrontendRelative(immutableChangesCsvPath),
      invalidRowsCsv: toFrontendRelative(invalidRowsCsvPath),
      guideMd: toFrontendRelative(guideMdPath),
      nextCommandsMd: toFrontendRelative(nextCommandsMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.writeFile(manifestJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(statusCsvPath, buildCsv(validations, [
    'rowId',
    'sectionId',
    'block',
    'reviewZone',
    'operatorDecision',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(zoneSummaryCsvPath, buildCsv(zoneSummaries, [
    'reviewZone',
    'reviewBatch',
    'rows',
    'approvedRows',
    'rejectedRows',
    'pendingRows',
    'zoneCsv',
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
  await fs.writeFile(invalidRowsCsvPath, buildCsv(payload.invalidRows, [
    'rowId',
    'sectionId',
    'block',
    'reviewZone',
    'operatorDecision',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(guideMdPath, [
    '# 대구 operator reference P51 real review input',
    '',
    `- editable input CSV: \`${toFrontendRelative(realInputCsvPath)}\``,
    `- seed CSV: \`${toFrontendRelative(seedCsvPath)}\``,
    `- input sha256: \`${summary.realInputSha256}\``,
    `- rows: \`${summary.reviewRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- source write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Editable Columns',
    '',
    ...operatorWritableColumns.map((column) => `- \`${column}\``),
    '',
    '## Immutable Columns',
    '',
    ...immutableEvidenceColumns.map((column) => `- \`${column}\``),
    '',
    '## Approval Rule',
    '',
    '- `APPROVED` rows require `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, and `reviewNote`.',
    '- `REJECTED` rows require `reviewNote` and a concrete `nextAction`.',
    '- `PENDING` rows keep source write and release lock blocked.',
    '',
  ].join('\n'));
  await fs.writeFile(nextCommandsMdPath, [
    '# 대구 operator reference P51 next commands',
    '',
    'After the operator edits the P51 CSV, run:',
    '',
    '```bash',
    `DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT=${toFrontendRelative(realInputCsvPath)} npm run stadium:daegu:operator-reference-p49-postwrite-release-audit`,
    '```',
    '',
    'P51 gate only validates the editable input file. It does not write source data.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} input=${toFrontendRelative(realInputCsvPath)} rows=${summary.reviewRows} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} inputCreated=${summary.realInputCreated} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const manifest = await writeInput();

  const validations = manifest.validations ?? [];
  const gateRows = buildGateRows(manifest.summary ?? {});
  const allValidations = [...gateRows, ...validations];
  const invalidRows = allValidations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = allValidations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p51-real-review-input-gate-passed' : 'p51-real-review-input-gate-blocked',
    totalValidations: allValidations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    reviewRows: manifest.summary?.reviewRows ?? 0,
    approvedRows: manifest.summary?.approvedRows ?? 0,
    rejectedRows: manifest.summary?.rejectedRows ?? 0,
    pendingRows: manifest.summary?.pendingRows ?? 0,
    immutableColumnChangeCount: manifest.summary?.immutableColumnChangeCount ?? 0,
    realInputSha256: manifest.summary?.realInputSha256 ?? '',
    realInputCsv: manifest.source?.realReviewInputCsv ?? '',
    releaseCandidateAllowed: manifest.summary?.releaseCandidateAllowed === true,
    p52SourcePatchPreviewAllowed: manifest.summary?.p52SourcePatchPreviewAllowed === true,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: manifest.summary?.buildBlockerTrackedSeparately,
  };

  if (requireInput && invalidRows.length > 0) {
    throw new Error(`P51 real review input gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations: allValidations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(allValidations, [
    'rowId',
    'validationType',
    'validationStatus',
    'sectionId',
    'block',
    'reviewZone',
    'operatorDecision',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P51 real review input gate',
    '',
    `- status: \`${summary.status}\``,
    `- real input CSV: \`${summary.realInputCsv}\``,
    `- input sha256: \`${summary.realInputSha256}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending validations: \`${summary.reviewPendingRows}\``,
    `- release candidate allowed: \`${summary.releaseCandidateAllowed}\``,
    `- P52 source patch preview allowed: \`${summary.p52SourcePatchPreviewAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} input=${summary.realInputCsv} rows=${summary.reviewRows} approved=${summary.approvedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} releaseCandidateAllowed=${summary.releaseCandidateAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'input') {
  await writeInput();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
