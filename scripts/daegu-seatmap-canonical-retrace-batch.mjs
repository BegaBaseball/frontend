import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS,
  DAEGU_CANONICAL_SEATMAP_IMAGE,
} from '../src/data/daeguCanonicalSeatMap.ts';
import { validateSeatMapPolygonPath } from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');

const task = process.argv[2] ?? 'batch';
const requireApproved = process.argv.includes('--require-approved');
const requestedBatchKey = process.argv.find((arg, index) => index > 2 && !arg.startsWith('--'))
  ?? process.env.DAEGU_CANONICAL_RETRACE_BATCH_KEY
  ?? 'SKY_UPPER_01_10';
const ALLOWED_DECISIONS = new Set(['PENDING', 'APPROVED', 'REJECTED']);

const BATCHES = {
  SKY_UPPER_01_10: {
    version: 'DAEGU_CANONICAL_SKY_UPPER_RETRACE_BATCH_V1',
    key: 'SKY_UPPER_01_10',
    title: 'Daegu Canonical SKY Upper Retrace Batch',
    gateTitle: 'Daegu Canonical SKY Upper Retrace Gate',
    blockKeys: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'],
    markerSplitBlockKeys: ['09'],
    markerSplitPolicyByBlockKey: {
      '09': 'MARKER_SEAT_SPLIT_REQUIRED:09; trace only the seat polygon and keep accessibility marker outside canonical selectable runtime.',
    },
    outputSlug: 'daegu-seatmap-canonical-sky-upper-retrace-batch',
    inputSlug: 'daegu-seatmap-canonical-sky-upper-retrace',
    inputEnvName: 'DAEGU_CANONICAL_SKY_UPPER_RETRACE_INPUT',
  },
  SPECIAL_ZONE_3F4F_M1_MR9: {
    version: 'DAEGU_CANONICAL_SPECIAL_ZONE_RETRACE_BATCH_V1',
    key: 'SPECIAL_ZONE_3F4F_M1_MR9',
    title: 'Daegu Canonical Special Zone Retrace Batch',
    gateTitle: 'Daegu Canonical Special Zone Retrace Gate',
    blockKeys: ['3루4층', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'MR9'],
    markerSplitBlockKeys: [],
    markerSplitPolicyByBlockKey: {},
    outputSlug: 'daegu-seatmap-canonical-special-zone-retrace-batch',
    inputSlug: 'daegu-seatmap-canonical-special-zone-retrace',
    inputEnvName: 'DAEGU_CANONICAL_SPECIAL_ZONE_RETRACE_INPUT',
  },
  SKY_LOWER_U1_U19: {
    version: 'DAEGU_CANONICAL_SKY_LOWER_RETRACE_BATCH_V1',
    key: 'SKY_LOWER_U1_U19',
    title: 'Daegu Canonical SKY Lower Retrace Batch',
    gateTitle: 'Daegu Canonical SKY Lower Retrace Gate',
    blockKeys: ['U1', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19'],
    markerSplitBlockKeys: [],
    markerSplitPolicyByBlockKey: {},
    outputSlug: 'daegu-seatmap-canonical-sky-lower-retrace-batch',
    inputSlug: 'daegu-seatmap-canonical-sky-lower-retrace',
    inputEnvName: 'DAEGU_CANONICAL_SKY_LOWER_RETRACE_INPUT',
  },
  SKY_BLUE_U2_U20_U31: {
    version: 'DAEGU_CANONICAL_SKY_BLUE_RETRACE_BATCH_V1',
    key: 'SKY_BLUE_U2_U20_U31',
    title: 'Daegu Canonical SKY/BLUE Retrace Batch',
    gateTitle: 'Daegu Canonical SKY/BLUE Retrace Gate',
    blockKeys: ['U2', 'U20', 'U21', 'U22', 'U23', 'U24', 'U25', 'U26', 'U27', 'U28', 'U29', 'U30', 'U31'],
    markerSplitBlockKeys: ['U22'],
    markerSplitPolicyByBlockKey: {
      U22: 'MARKER_SEAT_SPLIT_REQUIRED:U22; trace only the BLUE seat polygon and keep accessibility marker outside canonical selectable runtime.',
    },
    outputSlug: 'daegu-seatmap-canonical-sky-blue-retrace-batch',
    inputSlug: 'daegu-seatmap-canonical-sky-blue-retrace',
    inputEnvName: 'DAEGU_CANONICAL_SKY_BLUE_RETRACE_INPUT',
  },
  REMAINING_U3_U9_V1_V3_OUTFIELD: {
    version: 'DAEGU_CANONICAL_REMAINING_RETRACE_BATCH_V1',
    key: 'REMAINING_U3_U9_V1_V3_OUTFIELD',
    title: 'Daegu Canonical Remaining Retrace Batch',
    gateTitle: 'Daegu Canonical Remaining Retrace Gate',
    blockKeys: ['U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'V1', 'V2', 'V3', '외야3루측', '우측외야', '중앙외야'],
    markerSplitBlockKeys: [],
    markerSplitPolicyByBlockKey: {},
    outputSlug: 'daegu-seatmap-canonical-remaining-retrace-batch',
    inputSlug: 'daegu-seatmap-canonical-remaining-retrace',
    inputEnvName: 'DAEGU_CANONICAL_REMAINING_RETRACE_INPUT',
  },
};

const batchConfig = BATCHES[requestedBatchKey];
if (!batchConfig) {
  throw new Error(`Unknown Daegu canonical retrace batch key: ${requestedBatchKey}`);
}

const BATCH_VERSION = batchConfig.version;
const BATCH_KEY = batchConfig.key;
const BATCH_BLOCK_KEYS = batchConfig.blockKeys;
const markerSplitBlockKeys = new Set(batchConfig.markerSplitBlockKeys);
const OPERATOR_REVIEW_CONTRACT_VERSION = 'DAEGU_CANONICAL_RETRACE_OPERATOR_REVIEW_CONTRACT_V1';
const SOURCE_COORDINATE_SYSTEM = 'SAMSUNG_OFFICIAL_2026_1707x2048';
const TARGET_COORDINATE_SYSTEM = 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096';
const APPROVAL_REQUIRED_FIELDS = Object.freeze([
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedHitPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
]);
const outputDir = process.env.DAEGU_CANONICAL_RETRACE_REPORT_ROOT
  ? path.resolve(frontendRoot, process.env.DAEGU_CANONICAL_RETRACE_REPORT_ROOT)
  : path.join(frontendRoot, 'reports/stadium', batchConfig.outputSlug);
const operatorInputDir = path.join(outputDir, 'operator-input');
const gateDir = path.join(outputDir, 'gate');

const batchJsonPath = path.join(outputDir, `${batchConfig.outputSlug}.json`);
const batchCsvPath = path.join(outputDir, `${batchConfig.outputSlug}.csv`);
const batchMdPath = path.join(outputDir, `${batchConfig.outputSlug}.md`);
const operatorInputJsonPath = path.join(operatorInputDir, `${batchConfig.inputSlug}-input.json`);
const operatorInputCsvPath = path.join(operatorInputDir, `${batchConfig.inputSlug}-input.csv`);
const gateJsonPath = path.join(gateDir, `${batchConfig.inputSlug}-gate.json`);
const gateCsvPath = path.join(gateDir, `${batchConfig.inputSlug}-gate.csv`);
const gateMdPath = path.join(gateDir, `${batchConfig.inputSlug}-gate.md`);
const inputPath = process.env[batchConfig.inputEnvName]
  ? path.resolve(frontendRoot, process.env[batchConfig.inputEnvName])
  : operatorInputJsonPath;

const sourceContractLiterals = [
  'DAEGU_CANONICAL_SKY_UPPER_RETRACE_BATCH_V1',
  'SKY_UPPER_01_10',
  'DAEGU_CANONICAL_SPECIAL_ZONE_RETRACE_BATCH_V1',
  'SPECIAL_ZONE_3F4F_M1_MR9',
  'DAEGU_CANONICAL_SKY_LOWER_RETRACE_BATCH_V1',
  'SKY_LOWER_U1_U19',
  'DAEGU_CANONICAL_SKY_BLUE_RETRACE_BATCH_V1',
  'SKY_BLUE_U2_U20_U31',
  'DAEGU_CANONICAL_REMAINING_RETRACE_BATCH_V1',
  'REMAINING_U3_U9_V1_V3_OUTFIELD',
  'DIRECT_OPERATOR_REFERENCE_TRACE_REQUIRED',
  'SIMPLE_SCALE_OR_COPY_FORBIDDEN',
  'MARKER_SEAT_SPLIT_REQUIRED:09',
  'CORRECTED_PATH_REQUIRED_FOR_APPROVED_ROW',
  'CORRECTED_HIT_PATH_REQUIRED_FOR_APPROVED_ROW',
  'CORRECTED_LABEL_REQUIRED_FOR_APPROVED_ROW',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_TARGET_188_REMAINS_PENDING',
  'sourceDataWritePerformed: false',
  'generatedReportsAreEvidenceOnly: true',
  'operatorReviewContract',
  'DAEGU_CANONICAL_RETRACE_OPERATOR_REVIEW_CONTRACT_V1',
  'productionPromotionRequiresGateStatus',
  'pendingRowsMayContainDraftGeometryButAreIgnoredUntilApproved',
  'OPERATOR_INPUT_SOURCE_WRITE_CHANGED',
  'BATCH_ROW_COUNT_CHANGED',
  'DAEGU_CANONICAL_RETRACE_REPORT_ROOT',
];

void sourceContractLiterals;

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function markdownCell(value) {
  return String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
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

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function finiteNumber(value) {
  return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
}

function buildOperatorReviewContract() {
  return {
    version: OPERATOR_REVIEW_CONTRACT_VERSION,
    batchKey: BATCH_KEY,
    directOperatorReferenceTraceRequired: true,
    officialPngCoordinatesAreHistoricalEvidenceOnly: true,
    sourceCoordinateSystem: SOURCE_COORDINATE_SYSTEM,
    targetCoordinateSystem: TARGET_COORDINATE_SYSTEM,
    operatorReferenceImagePath: DAEGU_CANONICAL_SEATMAP_IMAGE.imagePath,
    operatorReferenceImageSha256: DAEGU_CANONICAL_SEATMAP_IMAGE.imageSha256,
    approvalRequiredFields: APPROVAL_REQUIRED_FIELDS,
    markerSeatSplitRequired: batchConfig.markerSplitBlockKeys,
    markerSeatSplitPolicyByBlockKey: batchConfig.markerSplitPolicyByBlockKey,
    simpleScaleOrCopyAllowed: false,
    sourceDataWritePerformed: false,
    generatedReportsAreEvidenceOnly: true,
    productionPromotionRequiresGateStatus: 'ready-for-source-preview',
    pendingRowsMayContainDraftGeometryButAreIgnoredUntilApproved: true,
  };
}

function buildBatchRows() {
  const pendingByBlockKey = new Map(DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.map((row) => [row.blockKey, row]));
  return BATCH_BLOCK_KEYS.map((blockKey, index) => {
    const row = pendingByBlockKey.get(blockKey);
    if (!row) {
      throw new Error(`Missing pending operator trace row for Daegu canonical block ${blockKey}`);
    }

    const seatSectionIds = row.sourceSectionIds.filter((_, rowIndex) => row.sectionKinds[rowIndex] === 'SEAT_SECTION');
    const markerSectionIds = row.sourceSectionIds.filter((_, rowIndex) => row.sectionKinds[rowIndex] !== 'SEAT_SECTION');
    const markerSeatSplitRequired = markerSectionIds.length > 0;
    const markerSplitPolicy = batchConfig.markerSplitPolicyByBlockKey[blockKey]
      ?? `MARKER_SEAT_SPLIT_REQUIRED:${blockKey}; trace only the seat polygon and keep marker evidence outside canonical selectable runtime.`;

    return {
      reviewId: `DAEGU-CANONICAL-${BATCH_KEY}-${blockKey}`,
      batchKey: BATCH_KEY,
      queueOrder: index + 1,
      blockKey,
      sourceBlockLabels: row.sourceBlockLabels,
      sourceSectionIds: row.sourceSectionIds,
      seatSectionIds,
      markerSectionIds,
      names: row.names,
      categories: row.categories,
      sectionKinds: row.sectionKinds,
      markerSeatSplitRequired,
      tracePolicy: markerSeatSplitRequired
        ? markerSplitPolicy
        : 'DIRECT_OPERATOR_REFERENCE_TRACE_REQUIRED',
      sourceCoordinateSystem: row.sourceCoordinateSystem,
      targetCoordinateSystem: TARGET_COORDINATE_SYSTEM,
      operatorReferenceImagePath: DAEGU_CANONICAL_SEATMAP_IMAGE.imagePath,
      operatorReferenceImageSha256: DAEGU_CANONICAL_SEATMAP_IMAGE.imageSha256,
      simpleScaleOrCopyAllowed: false,
      operatorDecision: 'PENDING',
      correctedPath: '',
      correctedHitPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      operatorNote: '',
      nextAction: 'Trace correctedPath, correctedHitPath, and correctedLabelX/Y directly on the 4096 operator-reference image.',
    };
  });
}

function summarize(rows, validations, contractFailures = []) {
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
  const rejectedRows = rows.filter((row) => row.operatorDecision === 'REJECTED');
  const pendingRows = rows.filter((row) => row.operatorDecision === 'PENDING');
  const markerSplitRows = rows.filter((row) => row.markerSeatSplitRequired);
  const allApproved = rows.length === BATCH_BLOCK_KEYS.length && approvedRows.length === rows.length && invalidRows.length === 0;

  return {
    status: contractFailures.length > 0 || invalidRows.length > 0 || (requireApproved && !allApproved)
      ? 'failed'
      : allApproved
        ? 'ready-for-source-preview'
        : 'review-required',
    version: BATCH_VERSION,
    batchKey: BATCH_KEY,
    batchRows: rows.length,
    expectedBatchRows: BATCH_BLOCK_KEYS.length,
    blockKeys: rows.map((row) => row.blockKey),
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    contractValidationStatus: contractFailures.length > 0 ? 'INVALID' : 'PASS',
    contractFailures: contractFailures.length,
    markerSeatSplitRows: markerSplitRows.length,
    markerSeatSplitBlockKeys: markerSplitRows.map((row) => row.blockKey),
    sourceCoordinateSystem: SOURCE_COORDINATE_SYSTEM,
    targetCoordinateSystem: TARGET_COORDINATE_SYSTEM,
    simpleScaleOrCopyAllowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    generatedReportsAreEvidenceOnly: true,
    passTarget188RemainsPending: !allApproved,
  };
}

function validateRows(rows) {
  const seen = new Set();
  return rows.map((row) => {
    const failures = [];
    const warnings = [];

    if (!BATCH_BLOCK_KEYS.includes(row.blockKey)) failures.push('BLOCK_KEY_OUTSIDE_BATCH');
    if (seen.has(row.blockKey)) failures.push('DUPLICATE_BLOCK_KEY');
    seen.add(row.blockKey);
    if (!ALLOWED_DECISIONS.has(row.operatorDecision)) failures.push('INVALID_OPERATOR_DECISION');
    if (row.targetCoordinateSystem !== TARGET_COORDINATE_SYSTEM) failures.push('INVALID_TARGET_COORDINATE_SYSTEM');
    if (row.simpleScaleOrCopyAllowed !== false) failures.push('SIMPLE_SCALE_OR_COPY_FORBIDDEN');
    if (markerSplitBlockKeys.has(row.blockKey) && row.markerSeatSplitRequired !== true) {
      failures.push(`MARKER_SEAT_SPLIT_REQUIRED:${row.blockKey}`);
    }
    if (!markerSplitBlockKeys.has(row.blockKey) && row.markerSeatSplitRequired === true) {
      failures.push(`UNDECLARED_MARKER_SEAT_SPLIT_ROW:${row.blockKey}`);
    }

    if (row.operatorDecision === 'APPROVED') {
      if (!row.correctedPath) failures.push('CORRECTED_PATH_REQUIRED_FOR_APPROVED_ROW');
      if (!row.correctedHitPath) failures.push('CORRECTED_HIT_PATH_REQUIRED_FOR_APPROVED_ROW');
      if (!finiteNumber(row.correctedLabelX) || !finiteNumber(row.correctedLabelY)) failures.push('CORRECTED_LABEL_REQUIRED_FOR_APPROVED_ROW');
      if (!row.reviewer || !row.reviewedAt || Number.isNaN(Date.parse(row.reviewedAt))) failures.push('REVIEWER_AND_REVIEWED_AT_REQUIRED_FOR_APPROVED_ROW');
      if (row.markerSeatSplitRequired && !row.operatorNote) failures.push('MARKER_SEAT_SPLIT_NOTE_REQUIRED');

      if (row.correctedPath && finiteNumber(row.correctedLabelX) && finiteNumber(row.correctedLabelY)) {
        validateSeatMapPolygonPath({
          pathData: row.correctedPath,
          width: DAEGU_CANONICAL_SEATMAP_IMAGE.imageWidth,
          height: DAEGU_CANONICAL_SEATMAP_IMAGE.imageHeight,
          labelPoint: [Number(row.correctedLabelX), Number(row.correctedLabelY)],
          labelTolerance: 6,
          sectionId: row.blockKey,
          pathKind: 'correctedPath',
        }).forEach((issue) => failures.push(`CORRECTED_PATH_${issue}`));
      }
      if (row.correctedHitPath && finiteNumber(row.correctedLabelX) && finiteNumber(row.correctedLabelY)) {
        validateSeatMapPolygonPath({
          pathData: row.correctedHitPath,
          width: DAEGU_CANONICAL_SEATMAP_IMAGE.imageWidth,
          height: DAEGU_CANONICAL_SEATMAP_IMAGE.imageHeight,
          labelPoint: [Number(row.correctedLabelX), Number(row.correctedLabelY)],
          labelTolerance: 6,
          sectionId: row.blockKey,
          pathKind: 'correctedHitPath',
        }).forEach((issue) => failures.push(`CORRECTED_HIT_PATH_${issue}`));
      }
    }

    if (row.operatorDecision === 'REJECTED' && !row.operatorNote) {
      failures.push('REJECTED_REQUIRES_OPERATOR_NOTE');
    }
    if (row.operatorDecision === 'PENDING' && (row.correctedPath || row.correctedHitPath || row.correctedLabelX || row.correctedLabelY)) {
      warnings.push('PENDING_ROW_HAS_DRAFT_GEOMETRY_IGNORED_UNTIL_APPROVED');
    }

    return {
      reviewId: row.reviewId,
      blockKey: row.blockKey,
      operatorDecision: row.operatorDecision,
      validationStatus: failures.length > 0 ? 'INVALID' : row.operatorDecision === 'PENDING' ? 'REVIEW_PENDING' : 'PASS',
      failures: failures.join('|'),
      warnings: warnings.join('|'),
    };
  });
}

function validateInputShape(rows) {
  const failures = [];
  const rowBlockKeys = rows.map((row) => row.blockKey);

  if (rows.length !== BATCH_BLOCK_KEYS.length) failures.push(`BATCH_ROW_COUNT_CHANGED:${rows.length}`);
  BATCH_BLOCK_KEYS.forEach((blockKey) => {
    if (!rowBlockKeys.includes(blockKey)) failures.push(`BATCH_ROW_MISSING:${blockKey}`);
  });

  return {
    status: failures.length > 0 ? 'INVALID' : 'PASS',
    failures,
  };
}

function buildInputShapeValidationRows(inputShapeValidation) {
  return inputShapeValidation.failures.map((failure, index) => ({
    reviewId: `DAEGU-CANONICAL-${BATCH_KEY}-INPUT-SHAPE-${index + 1}`,
    blockKey: 'INPUT',
    operatorDecision: 'PENDING',
    validationStatus: 'INVALID',
    failures: failure,
    warnings: '',
  }));
}

function validateOperatorReviewContract(payload) {
  const failures = [];
  const contract = payload.operatorReviewContract;

  if (!contract) {
    failures.push('OPERATOR_REVIEW_CONTRACT_REQUIRED');
  } else {
    if (contract.version !== OPERATOR_REVIEW_CONTRACT_VERSION) failures.push('OPERATOR_REVIEW_CONTRACT_VERSION_CHANGED');
    if (contract.batchKey !== BATCH_KEY) failures.push('OPERATOR_REVIEW_CONTRACT_BATCH_CHANGED');
    if (contract.sourceCoordinateSystem !== SOURCE_COORDINATE_SYSTEM) failures.push('OPERATOR_REVIEW_CONTRACT_SOURCE_COORDINATE_CHANGED');
    if (contract.targetCoordinateSystem !== TARGET_COORDINATE_SYSTEM) failures.push('OPERATOR_REVIEW_CONTRACT_TARGET_COORDINATE_CHANGED');
    if (contract.operatorReferenceImageSha256 !== DAEGU_CANONICAL_SEATMAP_IMAGE.imageSha256) failures.push('OPERATOR_REVIEW_CONTRACT_IMAGE_SHA_CHANGED');
    if (!Array.isArray(contract.approvalRequiredFields) || !arraysEqual(contract.approvalRequiredFields, APPROVAL_REQUIRED_FIELDS)) {
      failures.push('OPERATOR_REVIEW_CONTRACT_APPROVAL_FIELDS_CHANGED');
    }
    if (!Array.isArray(contract.markerSeatSplitRequired) || !arraysEqual(contract.markerSeatSplitRequired, batchConfig.markerSplitBlockKeys)) {
      failures.push('OPERATOR_REVIEW_CONTRACT_MARKER_SPLIT_CHANGED');
    }
    if (contract.simpleScaleOrCopyAllowed !== false) failures.push('OPERATOR_REVIEW_CONTRACT_SIMPLE_SCALE_ENABLED');
    if (contract.sourceDataWritePerformed !== false) failures.push('OPERATOR_REVIEW_CONTRACT_SOURCE_WRITE_CHANGED');
    if (contract.generatedReportsAreEvidenceOnly !== true) failures.push('OPERATOR_REVIEW_CONTRACT_EVIDENCE_ONLY_CHANGED');
    if (contract.productionPromotionRequiresGateStatus !== 'ready-for-source-preview') {
      failures.push('OPERATOR_REVIEW_CONTRACT_PROMOTION_STATUS_CHANGED');
    }
    if (contract.pendingRowsMayContainDraftGeometryButAreIgnoredUntilApproved !== true) {
      failures.push('OPERATOR_REVIEW_CONTRACT_PENDING_DRAFT_POLICY_CHANGED');
    }
  }
  if (payload.sourceDataWritePerformed !== false) failures.push('OPERATOR_INPUT_SOURCE_WRITE_CHANGED');

  return {
    status: failures.length > 0 ? 'INVALID' : 'PASS',
    failures,
  };
}

async function writeBatch() {
  const rows = buildBatchRows();
  const inputShapeValidation = validateInputShape(rows);
  const validations = [
    ...validateRows(rows),
    ...buildInputShapeValidationRows(inputShapeValidation),
  ];
  const operatorReviewContract = buildOperatorReviewContract();
  const contractValidation = validateOperatorReviewContract({
    operatorReviewContract,
    sourceDataWritePerformed: false,
  });
  const summary = summarize(rows, validations, contractValidation.failures);
  const columns = [
    'reviewId',
    'batchKey',
    'queueOrder',
    'blockKey',
    'sourceBlockLabels',
    'sourceSectionIds',
    'seatSectionIds',
    'markerSectionIds',
    'names',
    'categories',
    'sectionKinds',
    'markerSeatSplitRequired',
    'tracePolicy',
    'sourceCoordinateSystem',
    'targetCoordinateSystem',
    'operatorDecision',
    'correctedPath',
    'correctedHitPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
    'nextAction',
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    version: BATCH_VERSION,
    status: summary.status,
    policy: {
      ...operatorReviewContract,
      simpleScaleOrCopyForbidden: true,
    },
    summary,
    contractValidation,
    inputShapeValidation,
    rows,
    validations,
    outputs: {
      batchJson: toFrontendRelative(batchJsonPath),
      batchCsv: toFrontendRelative(batchCsvPath),
      batchMarkdown: toFrontendRelative(batchMdPath),
      operatorInputJson: toFrontendRelative(operatorInputJsonPath),
      operatorInputCsv: toFrontendRelative(operatorInputCsvPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(operatorInputDir, { recursive: true });
  await fs.writeFile(batchJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(batchCsvPath, buildCsv(rows, columns), 'utf8');
  await fs.writeFile(operatorInputJsonPath, `${JSON.stringify({
    version: BATCH_VERSION,
    batchKey: BATCH_KEY,
    operatorReviewContract,
    sourceDataWritePerformed: false,
    rows,
  }, null, 2)}\n`, 'utf8');
  await fs.writeFile(operatorInputCsvPath, buildCsv(rows, columns), 'utf8');
  await fs.writeFile(batchMdPath, [
    `# ${batchConfig.title}`,
    '',
    `- status: \`${summary.status}\``,
    `- version: \`${BATCH_VERSION}\``,
    `- batch key: \`${BATCH_KEY}\``,
    `- block keys: \`${summary.blockKeys.join(', ')}\``,
    `- batch rows: \`${summary.batchRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- marker seat split rows: \`${summary.markerSeatSplitRows}\` (${summary.markerSeatSplitBlockKeys.join(', ') || 'none'})`,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- operator input JSON: \`${toFrontendRelative(operatorInputJsonPath)}\``,
    `- operator input CSV: \`${toFrontendRelative(operatorInputCsvPath)}\``,
    '',
    '## Rows',
    '',
    markdownTable(
      ['order', 'blockKey', 'labels', 'sectionIds', 'markerSplit', 'decision', 'nextAction'],
      rows.map((row) => [row.queueOrder, row.blockKey, row.sourceBlockLabels.join(', '), row.sourceSectionIds.join(', '), row.markerSeatSplitRequired, row.operatorDecision, row.nextAction]),
    ),
    '',
    '## Policy',
    '',
    '- `DIRECT_OPERATOR_REFERENCE_TRACE_REQUIRED`: trace every row directly on the 4096 operator-reference image.',
    '- `SIMPLE_SCALE_OR_COPY_FORBIDDEN`: do not scale or copy 1707x2048 official image coordinates.',
    ...batchConfig.markerSplitBlockKeys.map((blockKey) => `- \`MARKER_SEAT_SPLIT_REQUIRED:${blockKey}\`: this row must keep marker evidence outside the selectable seat polygon.`),
    `- operator input JSON carries \`operatorReviewContract\`; production promotion requires gate status \`${operatorReviewContract.productionPromotionRequiresGateStatus}\`.`,
    `- approved promotion requires \`${APPROVAL_REQUIRED_FIELDS.join('`, `')}\`.`,
    '- pending rows may contain draft geometry, but draft geometry is ignored until `operatorDecision=APPROVED`.',
    '- `SOURCE_WRITE_FORBIDDEN`: this batch creates review evidence only.',
    '',
  ].join('\n'), 'utf8');

  console.log(`status:${summary.status} batch=${BATCH_KEY} rows=${summary.batchRows} pending=${summary.pendingRows} approved=${summary.approvedRows} marker_split=${summary.markerSeatSplitRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  console.log(`report:${batchJsonPath}`);
}

async function readInputPayload() {
  try {
    return JSON.parse(await fs.readFile(inputPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {
      version: BATCH_VERSION,
      batchKey: BATCH_KEY,
      operatorReviewContract: buildOperatorReviewContract(),
      sourceDataWritePerformed: false,
      rows: buildBatchRows(),
    };
  }
}

async function writeGate() {
  const inputPayload = await readInputPayload();
  const rows = Array.isArray(inputPayload.rows) ? inputPayload.rows : [];
  const inputShapeValidation = validateInputShape(rows);
  const validations = [
    ...validateRows(rows),
    ...buildInputShapeValidationRows(inputShapeValidation),
  ];
  const contractValidation = validateOperatorReviewContract(inputPayload);
  const summary = summarize(rows, validations, contractValidation.failures);
  const report = {
    generatedAt: new Date().toISOString(),
    version: BATCH_VERSION,
    status: summary.status,
    inputPath: toFrontendRelative(inputPath),
    operatorReviewContract: inputPayload.operatorReviewContract ?? null,
    contractValidation,
    inputShapeValidation,
    summary,
    validations,
    rows,
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(gateCsvPath, buildCsv(validations, ['reviewId', 'blockKey', 'operatorDecision', 'validationStatus', 'failures', 'warnings']), 'utf8');
  await fs.writeFile(gateMdPath, [
    `# ${batchConfig.gateTitle}`,
    '',
    `- status: \`${summary.status}\``,
    `- input path: \`${report.inputPath}\``,
    `- batch rows: \`${summary.batchRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- contract validation: \`${summary.contractValidationStatus}\``,
    `- input shape validation: \`${inputShapeValidation.status}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Contract',
    '',
    contractValidation.failures.length > 0
      ? contractValidation.failures.map((failure) => `- ${failure}`).join('\n')
      : '- `operatorReviewContract`: PASS',
    '',
    '## Validations',
    '',
    markdownTable(
      ['reviewId', 'blockKey', 'decision', 'status', 'failures', 'warnings'],
      validations.map((row) => [row.reviewId, row.blockKey, row.operatorDecision, row.validationStatus, row.failures || '-', row.warnings || '-']),
    ),
    '',
  ].join('\n'), 'utf8');

  console.log(`status:${summary.status} batch=${BATCH_KEY} rows=${summary.batchRows} pending=${summary.pendingRows} approved=${summary.approvedRows} invalid=${summary.invalidRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  console.log(`report:${gateJsonPath}`);

  if (summary.status === 'failed') {
    process.exitCode = 1;
  }
}

if (task === 'gate') {
  await writeGate();
} else {
  await writeBatch();
}
