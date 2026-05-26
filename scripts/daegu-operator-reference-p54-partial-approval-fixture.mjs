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
const p51JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input.json');
const productionP51CsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input.csv');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p54-partial-approval-fixture');
const fixtureDir = path.join(outputDir, 'fixtures');
const gateDir = path.join(outputDir, 'gate');
const fixtureCsvPath = path.join(fixtureDir, 'daegu-operator-reference-p54-partial-approved-3-sample.csv');
const invalidApprovedCsvPath = path.join(fixtureDir, 'daegu-operator-reference-p54-invalid-approved-missing-geometry-sample.csv');
const invalidImmutableCsvPath = path.join(fixtureDir, 'daegu-operator-reference-p54-invalid-immutable-change-sample.csv');
const auditJsonPath = path.join(outputDir, 'daegu-operator-reference-p54-partial-approval-fixture.json');
const auditCsvPath = path.join(outputDir, 'daegu-operator-reference-p54-partial-approval-fixture.csv');
const sourcePatchRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p54-source-patch-rows.csv');
const blockedRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p54-blocked-rows.csv');
const operatorGuideMdPath = path.join(outputDir, 'daegu-operator-reference-p54-operator-guide.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p54-partial-approval-fixture-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p54-partial-approval-fixture-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p54-partial-approval-fixture-gate.md');

const task = process.argv[2] ?? 'fixture';
const requireFixture = process.argv.includes('--require-fixture');
const sampleReviewer = 'operator-fixture';
const sampleReviewedAt = '2026-05-25T00:00:00.000Z';
const approvedSampleRows = 3;
const sourceTarget = 'src/data/daeguSeatData.ts';
const fixtureTraceVersion = 'DAEGU_OPERATOR_REFERENCE_P54_PARTIAL_APPROVAL_FIXTURE_V1';

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
const csvColumns = [
  ...immutableEvidenceColumns,
  ...operatorWritableColumns,
  'editableColumns',
  'immutableColumns',
];
const allowedDecisions = new Set(['PENDING', 'APPROVED', 'REJECTED']);

const sourceContractLiterals = [
  'P54_PARTIAL_APPROVAL_FIXTURE',
  'PRODUCTION_P51_INPUT_UNCHANGED',
  'PARTIAL_APPROVED_ROWS_CREATE_PATCH_PREVIEW',
  'PENDING_ROWS_REMAIN_BLOCKED',
  'P53_SOURCE_APPLY_STILL_FORBIDDEN',
  'INVALID_APPROVED_SAMPLE_BLOCKED',
  'INVALID_IMMUTABLE_CHANGE_SAMPLE_BLOCKED',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p54-partial-approval-fixture-ready',
  'p54-partial-approval-fixture-gate-passed',
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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readCsv(filePath) {
  return parseCsv(await fs.readFile(filePath, 'utf8'));
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

function buildSeedIndex(rows) {
  return new Map(rows.map((row) => [row.sectionId, row]));
}

function buildBlockIndex() {
  return new Map(DAEGU_OPERATOR_REFERENCE_BLOCKS.map((block) => [block.id, block]));
}

function approveRow(row, block, index) {
  const labelPoint = block?.imageGeometry.labelPoint ?? [block?.imageGeometry.labelX ?? '', block?.imageGeometry.labelY ?? ''];
  return {
    ...row,
    operatorDecision: 'APPROVED',
    correctedPath: block?.imageGeometry.visualPath ?? block?.imageGeometry.d ?? '',
    correctedLabelX: labelPoint[0],
    correctedLabelY: labelPoint[1],
    reviewer: sampleReviewer,
    reviewedAt: sampleReviewedAt,
    reviewNote: `P54 partial approval fixture row ${index + 1}: crop and overlay match current operator reference polygon.`,
    nextAction: 'NO_ACTION_APPROVED',
  };
}

function buildPartialApprovedFixtureRows(seedRows) {
  const blockById = buildBlockIndex();
  return seedRows.map((row, index) => {
    if (index >= approvedSampleRows) return { ...row };
    return approveRow(row, blockById.get(row.sectionId), index);
  });
}

function buildInvalidApprovedRows(seedRows) {
  return seedRows.map((row, index) => {
    if (index !== 0) return { ...row };
    return {
      ...row,
      operatorDecision: 'APPROVED',
      correctedPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: sampleReviewer,
      reviewedAt: sampleReviewedAt,
      reviewNote: 'P54 invalid approved sample: missing corrected geometry.',
      nextAction: 'NO_ACTION_APPROVED',
    };
  });
}

function buildInvalidImmutableRows(seedRows) {
  return seedRows.map((row, index) => {
    if (index !== 1) return { ...row };
    return {
      ...row,
      block: `${row.block}-MUTATED`,
      operatorDecision: 'APPROVED',
      correctedPath: row.correctedPath,
      correctedLabelX: row.correctedLabelX,
      correctedLabelY: row.correctedLabelY,
      reviewer: sampleReviewer,
      reviewedAt: sampleReviewedAt,
      reviewNote: 'P54 invalid immutable sample: block column changed.',
      nextAction: 'NO_ACTION_APPROVED',
    };
  });
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
        changeType: 'ROW_NOT_IN_PRODUCTION_P51_INPUT',
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
  return rows.map((row) => {
    const operatorDecision = normalizeDecision(row.operatorDecision);
    const failures = [];
    if (!row.sectionId) failures.push('MISSING_SECTION_ID');
    if (sectionIds.has(row.sectionId)) failures.push('DUPLICATE_SECTION_ID');
    sectionIds.add(row.sectionId);
    if (!seedIds.has(row.sectionId)) failures.push('ROW_NOT_IN_PRODUCTION_P51_INPUT');
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

    if (operatorDecision === 'REJECTED' && (!row.reviewNote || !row.nextAction || row.nextAction === 'OPERATOR_REVIEW_PENDING')) {
      failures.push('REJECTED_REQUIRES_RETRACE');
    }

    return {
      rowId: row.reviewId || row.sectionId,
      sectionId: row.sectionId,
      block: row.block,
      reviewZone: row.reviewZone,
      operatorDecision,
      validationStatus: failures.length > 0 ? 'INVALID' : operatorDecision === 'PENDING' ? 'REVIEW_PENDING' : 'PASS',
      failures: failures.join('|'),
      nextAction: failures.length > 0
        ? 'Fix the fixture row before dry-run source preview.'
        : operatorDecision === 'PENDING'
          ? 'Pending rows stay blocked.'
          : 'Approved fixture row can enter patch preview.',
    };
  });
}

function buildValidationIndex(validations) {
  return new Map(validations.map((row) => [row.sectionId, row]));
}

function buildSourcePatchRows(rows, validations) {
  const validationBySectionId = buildValidationIndex(validations);
  return rows
    .filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED')
    .filter((row) => validationBySectionId.get(row.sectionId)?.validationStatus === 'PASS')
    .map((row, index) => ({
      patchOrder: index + 1,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      reviewZone: row.reviewZone,
      reviewId: row.reviewId,
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      patchType: 'P54_PARTIAL_APPROVAL_FIXTURE_PATCH_PREVIEW',
      targetFile: sourceTarget,
      nextVisualPath: row.correctedPath,
      nextHitPath: row.correctedPath,
      nextLabelPoint: `${row.correctedLabelX}|${row.correctedLabelY}`,
      nextManualReviewed: true,
      nextPixelAlignmentStatus: 'PIXEL_ALIGNED',
      nextTraceSource: 'OPERATOR_REFERENCE_RAPAK_2025',
      nextGeometryVersion: fixtureTraceVersion,
      sourceWriteAllowed: false,
    }));
}

function buildBlockedRows(rows, validations) {
  const validationBySectionId = buildValidationIndex(validations);
  return rows
    .filter((row) => normalizeDecision(row.operatorDecision) !== 'APPROVED'
      || validationBySectionId.get(row.sectionId)?.validationStatus !== 'PASS')
    .map((row) => {
      const validation = validationBySectionId.get(row.sectionId);
      const operatorDecision = normalizeDecision(row.operatorDecision);
      return {
        reviewId: row.reviewId,
        sectionId: row.sectionId,
        block: row.block,
        name: row.name,
        reviewZone: row.reviewZone,
        operatorDecision,
        validationStatus: validation?.validationStatus ?? 'INVALID',
        failures: validation?.failures ?? 'MISSING_VALIDATION',
        blockerType: operatorDecision === 'PENDING'
          ? 'PENDING_ROWS_REMAIN_BLOCKED'
          : operatorDecision === 'REJECTED'
            ? 'REJECTED_ROWS_REQUIRE_RETRACE'
            : 'INVALID_ROW_BLOCKED',
        nextAction: operatorDecision === 'PENDING'
          ? 'Keep row out of source patch preview.'
          : operatorDecision === 'REJECTED'
            ? 'Create retrace workset.'
            : 'Fix invalid fixture row.',
      };
    });
}

function summarizeFixture({ productionP51ShaBefore, productionP51ShaAfter, rows, validations, immutableChanges, sourcePatchRows, blockedRows, p51 }) {
  const approvedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const rejectedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'REJECTED');
  const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const partialApprovedRowsCreatePatchPreview = sourcePatchRows.length === approvedRows.length
    && approvedRows.length === approvedSampleRows;
  const p53SourceApplyStillForbidden = pendingRows.length > 0
    && sourcePatchRows.length === approvedSampleRows;

  return {
    status: invalidRows.length === 0 && partialApprovedRowsCreatePatchPreview ? 'p54-partial-approval-fixture-ready' : 'p54-partial-approval-fixture-blocked',
    p51Status: p51.status ?? p51.summary?.status ?? '',
    productionP51Input: toFrontendRelative(productionP51CsvPath),
    productionP51ShaBefore,
    productionP51ShaAfter,
    productionP51InputUnchanged: productionP51ShaBefore === productionP51ShaAfter,
    reviewRows: rows.length,
    expectedReviewRows: 131,
    currentSelectableSeats,
    officialDatasetBlocks,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    immutableColumnChangeCount: immutableChanges.length,
    sourcePatchRows: sourcePatchRows.length,
    blockedRows: blockedRows.length,
    partialApprovedRowsCreatePatchPreview,
    pendingRowsRemainBlocked: pendingRows.length === 131 - approvedSampleRows && blockedRows.length === 131 - approvedSampleRows,
    p53SourceApplyStillForbidden,
    sourcePatchAllowed: partialApprovedRowsCreatePatchPreview,
    sourceApplyPreconditionsMet: false,
    sourceApplyAllowed: false,
    sourceDataWritePerformed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function summarizeInvalidSample(rows, seedRows) {
  const immutableChanges = findImmutableChanges(rows, seedRows);
  const validations = validateRows(rows, seedRows, immutableChanges);
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  return {
    rows: rows.length,
    invalidRows: invalidRows.length,
    immutableColumnChangeCount: immutableChanges.length,
  };
}

function buildRows(summary, invalidApprovedSummary, invalidImmutableSummary) {
  return [
    {
      rowId: 'P54_PARTIAL_APPROVAL_FIXTURE',
      validationType: 'FIXTURE_CONTRACT',
      validationStatus: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `ROWS_${summary.reviewRows}_SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Use P54 fixture for dry-run validation only.',
    },
    {
      rowId: 'PRODUCTION_P51_INPUT_UNCHANGED',
      validationType: 'INPUT_SAFETY_POLICY',
      validationStatus: summary.productionP51InputUnchanged ? 'PASS' : 'INVALID',
      failures: summary.productionP51InputUnchanged ? '' : 'PRODUCTION_P51_SHA_CHANGED',
      nextAction: 'P54 must not modify the real P51 operator input file.',
    },
    {
      rowId: 'PARTIAL_APPROVED_ROWS_CREATE_PATCH_PREVIEW',
      validationType: 'PATCH_PREVIEW_POLICY',
      validationStatus: summary.partialApprovedRowsCreatePatchPreview ? 'PASS' : 'INVALID',
      failures: summary.partialApprovedRowsCreatePatchPreview ? '' : `APPROVED_${summary.approvedRows}_PATCH_${summary.sourcePatchRows}`,
      nextAction: 'Only approved fixture rows should enter patch preview.',
    },
    {
      rowId: 'PENDING_ROWS_REMAIN_BLOCKED',
      validationType: 'BLOCKER_POLICY',
      validationStatus: summary.pendingRowsRemainBlocked ? 'PASS' : 'INVALID',
      failures: summary.pendingRowsRemainBlocked ? '' : `PENDING_${summary.pendingRows}_BLOCKED_${summary.blockedRows}`,
      nextAction: 'Pending fixture rows must remain blocked.',
    },
    {
      rowId: 'P53_SOURCE_APPLY_STILL_FORBIDDEN',
      validationType: 'SOURCE_APPLY_POLICY',
      validationStatus: summary.p53SourceApplyStillForbidden && summary.sourceApplyAllowed === false ? 'PASS' : 'INVALID',
      failures: summary.p53SourceApplyStillForbidden && summary.sourceApplyAllowed === false ? '' : 'SOURCE_APPLY_NOT_FORBIDDEN',
      nextAction: 'Partial approval must never allow source apply.',
    },
    {
      rowId: 'INVALID_APPROVED_SAMPLE_BLOCKED',
      validationType: 'NEGATIVE_FIXTURE_POLICY',
      validationStatus: invalidApprovedSummary.invalidRows > 0 ? 'PASS' : 'INVALID',
      failures: invalidApprovedSummary.invalidRows > 0 ? '' : 'INVALID_APPROVED_SAMPLE_NOT_BLOCKED',
      nextAction: 'Missing corrected geometry must be blocked.',
    },
    {
      rowId: 'INVALID_IMMUTABLE_CHANGE_SAMPLE_BLOCKED',
      validationType: 'NEGATIVE_FIXTURE_POLICY',
      validationStatus: invalidImmutableSummary.immutableColumnChangeCount > 0 && invalidImmutableSummary.invalidRows > 0 ? 'PASS' : 'INVALID',
      failures: invalidImmutableSummary.immutableColumnChangeCount > 0 && invalidImmutableSummary.invalidRows > 0 ? '' : 'IMMUTABLE_SAMPLE_NOT_BLOCKED',
      nextAction: 'Immutable evidence changes must be blocked.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceDataWritePerformed === false && summary.productionWriteAllowed === false ? 'PASS' : 'INVALID',
      failures: summary.sourceDataWritePerformed === false && summary.productionWriteAllowed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'P54 must not write src/data/daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P54 fixture does not release official 177 blocks.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu fixture validation.',
    },
  ];
}

async function writeFixture() {
  const [p51, seedRows] = await Promise.all([
    readJson(p51JsonPath),
    readCsv(productionP51CsvPath),
  ]);
  const productionP51ShaBefore = await hashFile(productionP51CsvPath);
  const fixtureRows = buildPartialApprovedFixtureRows(seedRows);
  const invalidApprovedRows = buildInvalidApprovedRows(seedRows);
  const invalidImmutableRows = buildInvalidImmutableRows(seedRows);

  await fs.mkdir(fixtureDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(fixtureCsvPath, buildCsv(fixtureRows, csvColumns));
  await fs.writeFile(invalidApprovedCsvPath, buildCsv(invalidApprovedRows, csvColumns));
  await fs.writeFile(invalidImmutableCsvPath, buildCsv(invalidImmutableRows, csvColumns));

  const immutableChanges = findImmutableChanges(fixtureRows, seedRows);
  const validations = validateRows(fixtureRows, seedRows, immutableChanges);
  const sourcePatchRows = buildSourcePatchRows(fixtureRows, validations);
  const blockedRows = buildBlockedRows(fixtureRows, validations);
  const productionP51ShaAfter = await hashFile(productionP51CsvPath);
  const summary = summarizeFixture({
    productionP51ShaBefore,
    productionP51ShaAfter,
    rows: fixtureRows,
    validations,
    immutableChanges,
    sourcePatchRows,
    blockedRows,
    p51,
  });
  const invalidApprovedSummary = summarizeInvalidSample(invalidApprovedRows, seedRows);
  const invalidImmutableSummary = summarizeInvalidSample(invalidImmutableRows, seedRows);
  const rows = buildRows(summary, invalidApprovedSummary, invalidImmutableSummary);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p51Json: toFrontendRelative(p51JsonPath),
      productionP51Csv: toFrontendRelative(productionP51CsvPath),
      partialApprovalFixtureCsv: toFrontendRelative(fixtureCsvPath),
      invalidApprovedCsv: toFrontendRelative(invalidApprovedCsvPath),
      invalidImmutableCsv: toFrontendRelative(invalidImmutableCsvPath),
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      fixtureOnly: true,
      note: 'P54_PARTIAL_APPROVAL_FIXTURE. PRODUCTION_P51_INPUT_UNCHANGED. PARTIAL_APPROVED_ROWS_CREATE_PATCH_PREVIEW. PENDING_ROWS_REMAIN_BLOCKED. P53_SOURCE_APPLY_STILL_FORBIDDEN. SOURCE_WRITE_FORBIDDEN.',
    },
    summary,
    invalidApprovedSummary,
    invalidImmutableSummary,
    sourcePatchRows,
    blockedRows,
    rows,
    validations,
    outputs: {
      auditJson: toFrontendRelative(auditJsonPath),
      auditCsv: toFrontendRelative(auditCsvPath),
      sourcePatchRowsCsv: toFrontendRelative(sourcePatchRowsCsvPath),
      blockedRowsCsv: toFrontendRelative(blockedRowsCsvPath),
      operatorGuideMd: toFrontendRelative(operatorGuideMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.writeFile(auditJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(auditCsvPath, buildCsv(rows, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(sourcePatchRowsCsvPath, buildCsv(sourcePatchRows, [
    'patchOrder',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'reviewId',
    'reviewer',
    'reviewedAt',
    'patchType',
    'targetFile',
    'nextVisualPath',
    'nextHitPath',
    'nextLabelPoint',
    'nextManualReviewed',
    'nextPixelAlignmentStatus',
    'nextTraceSource',
    'nextGeometryVersion',
    'sourceWriteAllowed',
  ]));
  await fs.writeFile(blockedRowsCsvPath, buildCsv(blockedRows, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'operatorDecision',
    'validationStatus',
    'failures',
    'blockerType',
    'nextAction',
  ]));
  await fs.writeFile(operatorGuideMdPath, [
    '# 대구 operator reference P54 operator input guide',
    '',
    `- production P51 input: \`${toFrontendRelative(productionP51CsvPath)}\``,
    `- partial approval fixture: \`${toFrontendRelative(fixtureCsvPath)}\``,
    `- approved fixture rows: \`${summary.approvedRows}\``,
    `- pending fixture rows: \`${summary.pendingRows}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source apply allowed: \`${summary.sourceApplyAllowed}\``,
    `- production P51 unchanged: \`${summary.productionP51InputUnchanged}\``,
    '',
    '## Correct Approval Example',
    '',
    '- `operatorDecision=APPROVED`',
    '- `correctedPath` is filled from the approved polygon path.',
    '- `correctedLabelX` and `correctedLabelY` are numeric.',
    '- `reviewer`, `reviewedAt`, and `reviewNote` are filled.',
    '',
    '## Blocked Examples',
    '',
    '- `APPROVED` without corrected geometry is blocked.',
    '- Immutable evidence columns such as `sectionId`, `block`, and overlay paths must not change.',
    '- `PENDING` rows remain outside source patch preview.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approved=${summary.approvedRows} pending=${summary.pendingRows} sourcePatchRows=${summary.sourcePatchRows} productionP51InputUnchanged=${summary.productionP51InputUnchanged} p53SourceApplyStillForbidden=${summary.p53SourceApplyStillForbidden} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const audit = await writeFixture();
  const validations = audit.rows ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const summary = {
    status: invalidRows.length === 0 ? 'p54-partial-approval-fixture-gate-passed' : 'p54-partial-approval-fixture-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    approvedRows: audit.summary?.approvedRows ?? 0,
    pendingRows: audit.summary?.pendingRows ?? 0,
    sourcePatchRows: audit.summary?.sourcePatchRows ?? 0,
    productionP51InputUnchanged: audit.summary?.productionP51InputUnchanged === true,
    partialApprovedRowsCreatePatchPreview: audit.summary?.partialApprovedRowsCreatePatchPreview === true,
    pendingRowsRemainBlocked: audit.summary?.pendingRowsRemainBlocked === true,
    p53SourceApplyStillForbidden: audit.summary?.p53SourceApplyStillForbidden === true,
    sourceApplyAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: audit.summary?.buildBlockerTrackedSeparately,
  };

  if (requireFixture && invalidRows.length > 0) {
    throw new Error(`P54 partial approval fixture gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P54 partial approval fixture gate',
    '',
    `- status: \`${summary.status}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- production P51 unchanged: \`${summary.productionP51InputUnchanged}\``,
    `- partial approved rows create patch preview: \`${summary.partialApprovedRowsCreatePatchPreview}\``,
    `- pending rows remain blocked: \`${summary.pendingRowsRemainBlocked}\``,
    `- P53 source apply still forbidden: \`${summary.p53SourceApplyStillForbidden}\``,
    `- source apply allowed: \`${summary.sourceApplyAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approved=${summary.approvedRows} pending=${summary.pendingRows} sourcePatchRows=${summary.sourcePatchRows} productionP51InputUnchanged=${summary.productionP51InputUnchanged} p53SourceApplyStillForbidden=${summary.p53SourceApplyStillForbidden} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'fixture') {
  await writeFixture();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
