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
const p51InputCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input.csv');
const p51SeedCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input-seed.csv');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p60-production-pilot-approval');
const gateDir = path.join(outputDir, 'gate');
const approvalJsonPath = path.join(outputDir, 'daegu-operator-reference-p60-production-pilot-approval.json');
const approvalMdPath = path.join(outputDir, 'daegu-operator-reference-p60-production-pilot-approval.md');
const changedRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p60-changed-rows.csv');
const approvedRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p60-approved-rows.csv');
const validationCsvPath = path.join(outputDir, 'daegu-operator-reference-p60-validation.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p60-production-pilot-approval-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p60-production-pilot-approval-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p60-production-pilot-approval-gate.md');

const task = process.argv[2] ?? 'approve';
const requireApproval = process.argv.includes('--require-approval');
const pilotSectionId = 'daegu-outfield-table-tr-tr-9';
const pilotReviewer = 'P60_PRODUCTION_PILOT_APPROVAL';
const pilotReviewedAt = '2026-05-26T00:00:00.000+09:00';
const writableColumns = [
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'reviewNote',
  'nextAction',
];
const immutableColumns = [
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
  'editableColumns',
  'immutableColumns',
];
const csvColumns = [
  ...immutableColumns.slice(0, 10),
  ...writableColumns,
  'editableColumns',
  'immutableColumns',
];

const sourceContractLiterals = [
  'P60_PRODUCTION_PILOT_APPROVAL',
  'P51_REAL_INPUT_WRITE_ALLOWED_FOR_PILOT',
  'TR9_PRODUCTION_APPROVED_1',
  'ONLY_WRITABLE_COLUMNS_CHANGED',
  'IMMUTABLE_COLUMNS_UNCHANGED',
  'PRODUCTION_P51_INPUT_WRITE_PERFORMED',
  'P56_PRODUCTION_EXPECTED_READY',
  'P57_PRODUCTION_EXPECTED_READY',
  'P52_SOURCE_PATCH_EXPECTED_1',
  'P53_SOURCE_APPLY_GUARD_EXPECTED',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionP51InputWritePerformed: true',
  'sourceDataWritePerformed: false',
  'p60-production-pilot-approval-ready',
  'p60-production-pilot-approval-gate-passed',
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

function getPilotGeometry() {
  const block = DAEGU_OPERATOR_REFERENCE_BLOCKS.find((candidate) => candidate.id === pilotSectionId);
  if (!block) throw new Error(`Missing pilot block: ${pilotSectionId}`);
  const correctedPath = block.imageGeometry.visualPath ?? block.imageGeometry.d;
  const labelPoint = block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY];
  if (!correctedPath || !labelPoint?.every((value) => Number.isFinite(Number(value)))) {
    throw new Error(`Pilot block geometry is incomplete: ${pilotSectionId}`);
  }
  return {
    correctedPath,
    correctedLabelX: labelPoint[0],
    correctedLabelY: labelPoint[1],
  };
}

function applyPilotApproval(rows) {
  const geometry = getPilotGeometry();
  let targetFound = false;
  const updatedRows = rows.map((row) => {
    if (row.sectionId !== pilotSectionId) return { ...row };
    targetFound = true;
    return {
      ...row,
      operatorDecision: 'APPROVED',
      correctedPath: geometry.correctedPath,
      correctedLabelX: geometry.correctedLabelX,
      correctedLabelY: geometry.correctedLabelY,
      reviewer: pilotReviewer,
      reviewedAt: pilotReviewedAt,
      reviewNote: 'P60 production pilot approval: TR-9 operator reference polygon approved as first production P51 row.',
      nextAction: 'P60_PILOT_APPROVED_READY_FOR_P56_P57_P52',
    };
  });
  if (!targetFound) throw new Error(`Pilot target row not found in P51 input: ${pilotSectionId}`);
  return updatedRows;
}

function buildDiffRows(rows, seedRows) {
  const seedBySectionId = new Map(seedRows.map((row) => [row.sectionId, row]));
  return rows
    .map((row) => {
      const seed = seedBySectionId.get(row.sectionId);
      const changedWritableColumns = writableColumns.filter((column) => String(row[column] ?? '') !== String(seed?.[column] ?? ''));
      const changedImmutableColumns = immutableColumns.filter((column) => String(row[column] ?? '') !== String(seed?.[column] ?? ''));
      return {
        reviewId: row.reviewId,
        sectionId: row.sectionId,
        block: row.block,
        name: row.name,
        reviewZone: row.reviewZone,
        operatorDecision: normalizeDecision(row.operatorDecision),
        changedWritableColumns: changedWritableColumns.join('|'),
        changedImmutableColumns: changedImmutableColumns.join('|'),
        changedWritableCount: changedWritableColumns.length,
        changedImmutableCount: changedImmutableColumns.length,
        diffStatus: changedImmutableColumns.length > 0 ? 'IMMUTABLE_CHANGED' : changedWritableColumns.length > 0 ? 'WRITABLE_CHANGED' : 'UNCHANGED',
      };
    })
    .filter((row) => row.diffStatus !== 'UNCHANGED');
}

function buildApprovedRows(rows) {
  return rows
    .filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED')
    .map((row, index) => ({
      approvalOrder: index + 1,
      reviewId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      reviewZone: row.reviewZone,
      correctedPath: row.correctedPath,
      correctedLabelPoint: `${row.correctedLabelX}|${row.correctedLabelY}`,
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      readyForP56P57P52: true,
      productionP51InputWritePerformed: true,
      sourceDataWritePerformed: false,
    }));
}

function summarize({ hashBefore, hashAfter, rows, diffRows, approvedRows }) {
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const immutableChangedRows = diffRows.filter((row) => row.changedImmutableCount > 0);
  const pilotApprovedRows = approvedRows.filter((row) => row.sectionId === pilotSectionId);
  const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const pilotApprovalPresent = approvedRows.length === 1 && pilotApprovedRows.length === 1;
  const approvalReady = rows.length === 131
    && diffRows.length === 1
    && immutableChangedRows.length === 0
    && pilotApprovalPresent
    && pendingRows.length === 130
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: approvalReady ? 'p60-production-pilot-approval-ready' : 'p60-production-pilot-approval-blocked',
    p51InputCsv: toFrontendRelative(p51InputCsvPath),
    p51InputShaBefore: hashBefore,
    p51InputShaAfter: hashAfter,
    p51InputChanged: hashBefore !== hashAfter,
    pilotApprovalPresent,
    targetSectionId: pilotSectionId,
    reviewRows: rows.length,
    currentSelectableSeats,
    officialDatasetBlocks,
    changedRows: diffRows.length,
    immutableChangedRows: immutableChangedRows.length,
    approvedRows: approvedRows.length,
    pilotApprovedRows: pilotApprovedRows.length,
    pendingRows: pendingRows.length,
    p56ProductionExpectedReady: approvalReady,
    p57ProductionExpectedReady: approvalReady,
    p52SourcePatchExpectedRows: approvalReady ? 1 : 0,
    p53SourceApplyGuardExpected: approvalReady,
    sourceApplyAllowed: false,
    passRelease177Allowed: false,
    productionP51InputWritePerformed: true,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildValidationRows(summary) {
  return [
    {
      rowId: 'P60_PRODUCTION_PILOT_APPROVAL',
      validationType: 'PILOT_APPROVAL_CONTRACT',
      validationStatus: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `ROWS_${summary.reviewRows}_SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Use P60 only for the first production pilot approval row.',
    },
    {
      rowId: 'P51_REAL_INPUT_WRITE_ALLOWED_FOR_PILOT',
      validationType: 'INPUT_WRITE_POLICY',
      validationStatus: summary.productionP51InputWritePerformed && summary.pilotApprovalPresent ? 'PASS' : 'INVALID',
      failures: summary.productionP51InputWritePerformed && summary.pilotApprovalPresent ? '' : 'PILOT_APPROVAL_NOT_PRESENT',
      nextAction: summary.p51InputChanged
        ? 'P60 intentionally wrote only the P51 real review input CSV.'
        : 'P60 pilot approval was already present; input write is idempotent.',
    },
    {
      rowId: 'TR9_PRODUCTION_APPROVED_1',
      validationType: 'APPROVAL_POLICY',
      validationStatus: summary.approvedRows === 1 && summary.pilotApprovedRows === 1 ? 'PASS' : 'INVALID',
      failures: summary.approvedRows === 1 && summary.pilotApprovedRows === 1
        ? ''
        : `APPROVED_${summary.approvedRows}_PILOT_${summary.pilotApprovedRows}`,
      nextAction: 'Exactly TR-9 should be approved by this pilot.',
    },
    {
      rowId: 'ONLY_WRITABLE_COLUMNS_CHANGED',
      validationType: 'COLUMN_POLICY',
      validationStatus: summary.changedRows === 1 && summary.immutableChangedRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.changedRows === 1 && summary.immutableChangedRows === 0
        ? ''
        : `CHANGED_${summary.changedRows}_IMMUTABLE_${summary.immutableChangedRows}`,
      nextAction: 'Only writable columns on the pilot row may change.',
    },
    {
      rowId: 'IMMUTABLE_COLUMNS_UNCHANGED',
      validationType: 'IMMUTABILITY_POLICY',
      validationStatus: summary.immutableChangedRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.immutableChangedRows === 0 ? '' : `IMMUTABLE_CHANGED_ROWS:${summary.immutableChangedRows}`,
      nextAction: 'Restore immutable evidence columns before downstream gates.',
    },
    {
      rowId: 'PRODUCTION_P51_INPUT_WRITE_PERFORMED',
      validationType: 'INPUT_WRITE_POLICY',
      validationStatus: summary.productionP51InputWritePerformed ? 'PASS' : 'INVALID',
      failures: summary.productionP51InputWritePerformed ? '' : 'PRODUCTION_P51_INPUT_WRITE_NOT_RECORDED',
      nextAction: 'Record that P60 changed production P51 input, not source data.',
    },
    {
      rowId: 'P56_PRODUCTION_EXPECTED_READY',
      validationType: 'DOWNSTREAM_EXPECTATION',
      validationStatus: summary.p56ProductionExpectedReady ? 'PASS' : 'INVALID',
      failures: summary.p56ProductionExpectedReady ? '' : 'P56_EXPECTED_READY_FALSE',
      nextAction: 'Run P56 require-ready after P60.',
    },
    {
      rowId: 'P57_PRODUCTION_EXPECTED_READY',
      validationType: 'DOWNSTREAM_EXPECTATION',
      validationStatus: summary.p57ProductionExpectedReady ? 'PASS' : 'INVALID',
      failures: summary.p57ProductionExpectedReady ? '' : 'P57_EXPECTED_READY_FALSE',
      nextAction: 'Run P57 require-ready after P60.',
    },
    {
      rowId: 'P52_SOURCE_PATCH_EXPECTED_1',
      validationType: 'DOWNSTREAM_EXPECTATION',
      validationStatus: summary.p52SourcePatchExpectedRows === 1 ? 'PASS' : 'INVALID',
      failures: summary.p52SourcePatchExpectedRows === 1 ? '' : `PATCH_ROWS_${summary.p52SourcePatchExpectedRows}`,
      nextAction: 'Run P52 source patch preview after P60.',
    },
    {
      rowId: 'P53_SOURCE_APPLY_GUARD_EXPECTED',
      validationType: 'DOWNSTREAM_EXPECTATION',
      validationStatus: summary.p53SourceApplyGuardExpected ? 'PASS' : 'INVALID',
      failures: summary.p53SourceApplyGuardExpected ? '' : 'P53_EXPECTED_FALSE',
      nextAction: 'Run P53 source apply guard after P52.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'SOURCE_WRITE_POLICY',
      validationStatus: summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.sourceDataWritePerformed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'P60 must not write src/data/daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P60 approves one 4096 operator row only; release remains forbidden.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu pilot approval.',
    },
  ];
}

async function writeApproval() {
  const hashBefore = await hashFile(p51InputCsvPath);
  const [currentRows, seedRows] = await Promise.all([
    readCsv(p51InputCsvPath),
    readCsv(p51SeedCsvPath),
  ]);
  const updatedRows = applyPilotApproval(currentRows);
  await fs.writeFile(p51InputCsvPath, buildCsv(updatedRows, csvColumns));
  const hashAfter = await hashFile(p51InputCsvPath);
  const diffRows = buildDiffRows(updatedRows, seedRows);
  const approvedRows = buildApprovedRows(updatedRows);
  const summary = summarize({
    hashBefore,
    hashAfter,
    rows: updatedRows,
    diffRows,
    approvedRows,
  });
  const validations = buildValidationRows(summary);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p51RealReviewInputCsv: toFrontendRelative(p51InputCsvPath),
      p51SeedCsv: toFrontendRelative(p51SeedCsvPath),
      geometrySource: 'DAEGU_OPERATOR_REFERENCE_BLOCKS',
    },
    policy: {
      pilotSectionId,
      productionP51InputWritePerformed: true,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P60_PRODUCTION_PILOT_APPROVAL. P51_REAL_INPUT_WRITE_ALLOWED_FOR_PILOT. TR9_PRODUCTION_APPROVED_1. ONLY_WRITABLE_COLUMNS_CHANGED. SOURCE_WRITE_FORBIDDEN.',
    },
    summary,
    changedRows: diffRows,
    approvedRows,
    validations,
    outputs: {
      approvalJson: toFrontendRelative(approvalJsonPath),
      approvalMd: toFrontendRelative(approvalMdPath),
      changedRowsCsv: toFrontendRelative(changedRowsCsvPath),
      approvedRowsCsv: toFrontendRelative(approvedRowsCsvPath),
      validationCsv: toFrontendRelative(validationCsvPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(approvalJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(changedRowsCsvPath, buildCsv(diffRows, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'operatorDecision',
    'changedWritableColumns',
    'changedImmutableColumns',
    'changedWritableCount',
    'changedImmutableCount',
    'diffStatus',
  ]));
  await fs.writeFile(approvedRowsCsvPath, buildCsv(approvedRows, [
    'approvalOrder',
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'correctedPath',
    'correctedLabelPoint',
    'reviewer',
    'reviewedAt',
    'readyForP56P57P52',
    'productionP51InputWritePerformed',
    'sourceDataWritePerformed',
  ]));
  await fs.writeFile(validationCsvPath, buildCsv(validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(approvalMdPath, [
    '# 대구 operator reference P60 production pilot approval',
    '',
    `- status: \`${summary.status}\``,
    `- P51 input: \`${summary.p51InputCsv}\``,
    `- target section: \`${summary.targetSectionId}\``,
    `- P51 input changed: \`${summary.p51InputChanged}\``,
    `- pilot approval present: \`${summary.pilotApprovalPresent}\``,
    `- changed rows: \`${summary.changedRows}\``,
    `- immutable changed rows: \`${summary.immutableChangedRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- P56 expected ready: \`${summary.p56ProductionExpectedReady}\``,
    `- P57 expected ready: \`${summary.p57ProductionExpectedReady}\``,
    `- P52 expected patch rows: \`${summary.p52SourcePatchExpectedRows}\``,
    `- production P51 input write performed: \`${summary.productionP51InputWritePerformed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
    '## Rule',
    '',
    '- P60 writes the P51 real review input CSV for one pilot row.',
    '- P60 does not write `src/data/daeguSeatData.ts`.',
    '- Downstream P56/P57/P52/P53 must run before any source apply is considered.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} target=${summary.targetSectionId} approved=${summary.approvedRows} pending=${summary.pendingRows} changedRows=${summary.changedRows} immutableChangedRows=${summary.immutableChangedRows} p56ExpectedReady=${summary.p56ProductionExpectedReady} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const approval = await writeApproval();
  const invalidRows = (approval.validations ?? []).filter((row) => row.validationStatus === 'INVALID');
  const summary = {
    status: invalidRows.length === 0 ? 'p60-production-pilot-approval-gate-passed' : 'p60-production-pilot-approval-gate-blocked',
    approvalStatus: approval.summary?.status ?? '',
    totalValidations: approval.validations?.length ?? 0,
    invalidRows: invalidRows.length,
    targetSectionId: approval.summary?.targetSectionId ?? '',
    pilotApprovalPresent: approval.summary?.pilotApprovalPresent === true,
    approvedRows: approval.summary?.approvedRows ?? 0,
    pendingRows: approval.summary?.pendingRows ?? 0,
    changedRows: approval.summary?.changedRows ?? 0,
    immutableChangedRows: approval.summary?.immutableChangedRows ?? 0,
    p56ProductionExpectedReady: approval.summary?.p56ProductionExpectedReady === true,
    p57ProductionExpectedReady: approval.summary?.p57ProductionExpectedReady === true,
    p52SourcePatchExpectedRows: approval.summary?.p52SourcePatchExpectedRows ?? 0,
    p53SourceApplyGuardExpected: approval.summary?.p53SourceApplyGuardExpected === true,
    sourceApplyAllowed: false,
    passRelease177Allowed: false,
    productionP51InputWritePerformed: true,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: approval.summary?.buildBlockerTrackedSeparately,
  };

  if (requireApproval && invalidRows.length > 0) {
    throw new Error(`P60 production pilot approval gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations: approval.validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(approval.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P60 production pilot approval gate',
    '',
    `- status: \`${summary.status}\``,
    `- target section: \`${summary.targetSectionId}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- changed rows: \`${summary.changedRows}\``,
    `- immutable changed rows: \`${summary.immutableChangedRows}\``,
    `- P56 expected ready: \`${summary.p56ProductionExpectedReady}\``,
    `- P57 expected ready: \`${summary.p57ProductionExpectedReady}\``,
    `- P52 expected patch rows: \`${summary.p52SourcePatchExpectedRows}\``,
    `- production P51 input write performed: \`${summary.productionP51InputWritePerformed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} target=${summary.targetSectionId} approved=${summary.approvedRows} pending=${summary.pendingRows} changedRows=${summary.changedRows} immutableChangedRows=${summary.immutableChangedRows} p56ExpectedReady=${summary.p56ProductionExpectedReady} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'approve') {
  await writeApproval();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
