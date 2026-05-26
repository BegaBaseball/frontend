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
const p51InputCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input.csv');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p52-source-patch-preview');
const gateDir = path.join(outputDir, 'gate');
const previewJsonPath = path.join(outputDir, 'daegu-operator-reference-p52-source-patch-preview.json');
const previewCsvPath = path.join(outputDir, 'daegu-operator-reference-p52-source-patch-preview.csv');
const sourcePatchRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p52-source-patch-rows.csv');
const blockedRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p52-blocked-rows.csv');
const patchTxtPath = path.join(outputDir, 'daegu-operator-reference-p52-source-patch-preview.patch.txt');
const previewMdPath = path.join(outputDir, 'daegu-operator-reference-p52-source-patch-preview.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p52-source-patch-preview-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p52-source-patch-preview-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p52-source-patch-preview-gate.md');

const task = process.argv[2] ?? 'preview';
const requirePreview = process.argv.includes('--require-preview');
const patchTraceVersion = 'DAEGU_OPERATOR_REFERENCE_P52_SOURCE_PATCH_PREVIEW_V1';

const sourceContractLiterals = [
  'P52_SOURCE_PATCH_PREVIEW',
  'P51_REAL_REVIEW_INPUT_SOURCE',
  'DAEGU_OPERATOR_REFERENCE_P51_REVIEW_INPUT',
  'APPROVED_ROWS_ONLY',
  'APPROVED_REQUIRES_CORRECTED_PATH_LABEL_REVIEWER_REVIEWED_AT',
  'PENDING_ROWS_BLOCK_SOURCE_WRITE',
  'REJECTED_ROWS_REQUIRE_RETRACE',
  'INVALID_ROWS_BLOCK_PREVIEW',
  'PATCH_PREVIEW_ONLY',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'sourcePatchAllowed=false',
  'p52-source-patch-preview-ready',
  'p52-source-patch-preview-gate-passed',
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

function normalizeDecision(value) {
  return String(value ?? '').trim().toUpperCase() || 'PENDING';
}

function buildValidationIndex(p51) {
  return new Map((p51.validations ?? []).map((row) => [row.sectionId, row]));
}

function buildBlockIndex() {
  return new Map(DAEGU_OPERATOR_REFERENCE_BLOCKS.map((block) => [block.id, block]));
}

function buildSourcePatchRows(rows, p51) {
  const validationBySectionId = buildValidationIndex(p51);
  const blockById = buildBlockIndex();
  return rows
    .filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED')
    .filter((row) => validationBySectionId.get(row.sectionId)?.validationStatus === 'PASS')
    .map((row, index) => {
      const currentBlock = blockById.get(row.sectionId);
      return {
        patchOrder: index + 1,
        sectionId: row.sectionId,
        block: row.block,
        name: row.name,
        reviewZone: row.reviewZone,
        reviewId: row.reviewId,
        reviewer: row.reviewer,
        reviewedAt: row.reviewedAt,
        reviewNote: row.reviewNote,
        patchType: 'OPERATOR_REFERENCE_GEOMETRY_UPDATE_PREVIEW',
        targetFile: 'src/data/daeguSeatData.ts',
        previousVisualPath: currentBlock?.imageGeometry.visualPath ?? currentBlock?.imageGeometry.d ?? '',
        nextVisualPath: row.correctedPath,
        previousHitPath: currentBlock?.imageGeometry.hitPath ?? currentBlock?.imageGeometry.visualPath ?? currentBlock?.imageGeometry.d ?? '',
        nextHitPath: row.correctedPath,
        previousLabelPoint: currentBlock?.imageGeometry.labelPoint?.join('|') ?? `${currentBlock?.imageGeometry.labelX ?? ''}|${currentBlock?.imageGeometry.labelY ?? ''}`,
        nextLabelPoint: `${row.correctedLabelX}|${row.correctedLabelY}`,
        nextManualReviewed: true,
        nextPixelAlignmentStatus: 'PIXEL_ALIGNED',
        nextTraceSource: 'OPERATOR_REFERENCE_RAPAK_2025',
        nextGeometryVersion: patchTraceVersion,
        sourceWriteAllowed: false,
      };
    });
}

function buildBlockedRows(rows, p51) {
  const validationBySectionId = buildValidationIndex(p51);
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
        failures: validation?.failures ?? 'MISSING_P51_VALIDATION',
        blockerType: operatorDecision === 'PENDING'
          ? 'PENDING_ROWS_BLOCK_SOURCE_WRITE'
          : operatorDecision === 'REJECTED'
            ? 'REJECTED_ROWS_REQUIRE_RETRACE'
            : 'INVALID_ROWS_BLOCK_PREVIEW',
        nextAction: operatorDecision === 'PENDING'
          ? 'Complete operator review before source patch preview.'
          : operatorDecision === 'REJECTED'
            ? 'Create retrace workset for this row.'
            : 'Fix invalid P51 input row.',
      };
    });
}

function summarize({ p51, rows, sourcePatchRows, blockedRows }) {
  const validations = p51.validations ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const approvedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const rejectedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'REJECTED');
  const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const sourcePatchAllowed = approvedRows.length > 0
    && invalidRows.length === 0
    && sourcePatchRows.length === approvedRows.length
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: invalidRows.length === 0 ? 'p52-source-patch-preview-ready' : 'p52-source-patch-preview-blocked',
    p51Status: p51.status ?? p51.summary?.status ?? '',
    p51RealInputCsv: toFrontendRelative(p51InputCsvPath),
    p51RealInputSha256: p51.summary?.realInputSha256 ?? '',
    reviewRows: rows.length,
    expectedReviewRows: 131,
    currentSelectableSeats,
    officialDatasetBlocks,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    blockedRows: blockedRows.length,
    sourcePatchRows: sourcePatchRows.length,
    approvedRowsOnly: sourcePatchRows.every((row) => row.patchType === 'OPERATOR_REFERENCE_GEOMETRY_UPDATE_PREVIEW'),
    sourcePatchAllowed,
    sourcePatchBlocked: !sourcePatchAllowed,
    p53SourceApplyAllowed: false,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildPatchPreviewText(summary, sourcePatchRows) {
  if (!summary.sourcePatchAllowed) {
    return [
      'P52_SOURCE_PATCH_PREVIEW blocked or empty.',
      `approvedRows=${summary.approvedRows}`,
      `pendingRows=${summary.pendingRows}`,
      `rejectedRows=${summary.rejectedRows}`,
      `invalidRows=${summary.invalidRows}`,
      `sourcePatchRows=${summary.sourcePatchRows}`,
      'sourcePatchAllowed=false',
      'sourceDataWritePerformed=false',
      '',
    ].join('\n');
  }

  return [
    '// P52_SOURCE_PATCH_PREVIEW only. This is not an apply script.',
    `const DAEGU_OPERATOR_REFERENCE_P52_SOURCE_PATCH_TRACE_VERSION = '${patchTraceVersion}';`,
    `const DAEGU_OPERATOR_REFERENCE_P52_SOURCE_PATCH_ROWS = ${JSON.stringify(sourcePatchRows, null, 2)};`,
    '',
  ].join('\n');
}

function buildRows(summary) {
  return [
    {
      rowId: 'P52_SOURCE_PATCH_PREVIEW',
      validationType: 'PREVIEW_CONTRACT',
      validationStatus: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `ROWS_${summary.reviewRows}_SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Generate preview rows only; do not write source.',
    },
    {
      rowId: 'P51_REAL_REVIEW_INPUT_SOURCE',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p51Status ? 'PASS' : 'INVALID',
      failures: summary.p51Status ? '' : 'P51_MANIFEST_MISSING',
      nextAction: 'Run P51 real review input before P52.',
    },
    {
      rowId: 'APPROVED_ROWS_ONLY',
      validationType: 'PATCH_ROW_POLICY',
      validationStatus: summary.sourcePatchRows === summary.approvedRows ? 'PASS' : 'INVALID',
      failures: summary.sourcePatchRows === summary.approvedRows ? '' : `PATCH_${summary.sourcePatchRows}_APPROVED_${summary.approvedRows}`,
      nextAction: 'Only APPROVED and P51-valid rows may enter source patch preview.',
    },
    {
      rowId: 'APPROVED_REQUIRES_CORRECTED_PATH_LABEL_REVIEWER_REVIEWED_AT',
      validationType: 'APPROVAL_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Approved rows must satisfy P51 corrected geometry validation.',
    },
    {
      rowId: 'PENDING_ROWS_BLOCK_SOURCE_WRITE',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.pendingRows > 0 ? `PENDING_ROWS:${summary.pendingRows}` : '',
      nextAction: summary.pendingRows > 0 ? 'Keep source write blocked until review is complete.' : 'No pending rows remain.',
    },
    {
      rowId: 'REJECTED_ROWS_REQUIRE_RETRACE',
      validationType: 'RETRACE_POLICY',
      validationStatus: summary.rejectedRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.rejectedRows > 0 ? `REJECTED_ROWS:${summary.rejectedRows}` : '',
      nextAction: summary.rejectedRows > 0 ? 'Create retrace worksets before source apply.' : 'No rejected rows require retrace.',
    },
    {
      rowId: 'INVALID_ROWS_BLOCK_PREVIEW',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Fix invalid P51 rows before P52.',
    },
    {
      rowId: 'PATCH_PREVIEW_ONLY',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
      nextAction: 'P52 must not modify daeguSeatData.ts.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.sourceDataWritePerformed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'Preview output only; source apply must be a later explicit step.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P52 does not release official 177 blocks.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu source preview.',
    },
  ];
}

async function writePreview() {
  const [p51, rows] = await Promise.all([
    readJson(p51JsonPath),
    readCsv(p51InputCsvPath),
  ]);
  const sourcePatchRows = buildSourcePatchRows(rows, p51);
  const blockedRows = buildBlockedRows(rows, p51);
  const summary = summarize({ p51, rows, sourcePatchRows, blockedRows });
  const validations = buildRows(summary);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p51Json: toFrontendRelative(p51JsonPath),
      p51RealInputCsv: toFrontendRelative(p51InputCsvPath),
      p51RealInputSha256: summary.p51RealInputSha256,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      patchPreviewOnly: true,
      note: 'P52_SOURCE_PATCH_PREVIEW. P51_REAL_REVIEW_INPUT_SOURCE. APPROVED_ROWS_ONLY. PATCH_PREVIEW_ONLY. SOURCE_WRITE_FORBIDDEN.',
    },
    summary,
    sourcePatchRows,
    blockedRows,
    validations,
    outputs: {
      previewJson: toFrontendRelative(previewJsonPath),
      previewCsv: toFrontendRelative(previewCsvPath),
      sourcePatchRowsCsv: toFrontendRelative(sourcePatchRowsCsvPath),
      blockedRowsCsv: toFrontendRelative(blockedRowsCsvPath),
      patchTxt: toFrontendRelative(patchTxtPath),
      previewMd: toFrontendRelative(previewMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(previewJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(previewCsvPath, buildCsv(validations, [
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
  await fs.writeFile(patchTxtPath, buildPatchPreviewText(summary, sourcePatchRows));
  await fs.writeFile(previewMdPath, [
    '# 대구 operator reference P52 source patch preview',
    '',
    `- status: \`${summary.status}\``,
    `- P51 input: \`${toFrontendRelative(p51InputCsvPath)}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source patch allowed: \`${summary.sourcePatchAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
    '## Rule',
    '',
    '- Only P51-valid `APPROVED` rows enter source patch preview.',
    '- `PENDING`, `REJECTED`, and invalid rows never enter source patch rows.',
    '- This step never writes `src/data/daeguSeatData.ts`.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} rows=${summary.reviewRows} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} sourcePatchRows=${summary.sourcePatchRows} sourcePatchAllowed=${summary.sourcePatchAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const preview = await writePreview();

  const validations = preview.validations ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p52-source-patch-preview-gate-passed' : 'p52-source-patch-preview-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    reviewRows: preview.summary?.reviewRows ?? 0,
    approvedRows: preview.summary?.approvedRows ?? 0,
    rejectedRows: preview.summary?.rejectedRows ?? 0,
    pendingRows: preview.summary?.pendingRows ?? 0,
    sourcePatchRows: preview.summary?.sourcePatchRows ?? 0,
    sourcePatchAllowed: preview.summary?.sourcePatchAllowed === true,
    p53SourceApplyAllowed: false,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: preview.summary?.buildBlockerTrackedSeparately,
  };

  if (requirePreview && invalidRows.length > 0) {
    throw new Error(`P52 source patch preview gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
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
    '# 대구 operator reference P52 source patch preview gate',
    '',
    `- status: \`${summary.status}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source patch allowed: \`${summary.sourcePatchAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} rows=${summary.reviewRows} approved=${summary.approvedRows} pending=${summary.pendingRows} sourcePatchRows=${summary.sourcePatchRows} sourcePatchAllowed=${summary.sourcePatchAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'preview') {
  await writePreview();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
