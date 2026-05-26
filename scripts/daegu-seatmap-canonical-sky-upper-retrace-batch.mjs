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
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-seatmap-canonical-sky-upper-retrace-batch');
const operatorInputDir = path.join(outputDir, 'operator-input');
const gateDir = path.join(outputDir, 'gate');

const batchJsonPath = path.join(outputDir, 'daegu-seatmap-canonical-sky-upper-retrace-batch.json');
const batchCsvPath = path.join(outputDir, 'daegu-seatmap-canonical-sky-upper-retrace-batch.csv');
const batchMdPath = path.join(outputDir, 'daegu-seatmap-canonical-sky-upper-retrace-batch.md');
const operatorInputJsonPath = path.join(operatorInputDir, 'daegu-seatmap-canonical-sky-upper-retrace-input.json');
const operatorInputCsvPath = path.join(operatorInputDir, 'daegu-seatmap-canonical-sky-upper-retrace-input.csv');
const gateJsonPath = path.join(gateDir, 'daegu-seatmap-canonical-sky-upper-retrace-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-seatmap-canonical-sky-upper-retrace-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-seatmap-canonical-sky-upper-retrace-gate.md');

const task = process.argv[2] ?? 'batch';
const requireApproved = process.argv.includes('--require-approved');
const inputPath = process.env.DAEGU_CANONICAL_SKY_UPPER_RETRACE_INPUT
  ? path.resolve(frontendRoot, process.env.DAEGU_CANONICAL_SKY_UPPER_RETRACE_INPUT)
  : operatorInputJsonPath;

const BATCH_VERSION = 'DAEGU_CANONICAL_SKY_UPPER_RETRACE_BATCH_V1';
const BATCH_KEY = 'SKY_UPPER_01_10';
const BATCH_BLOCK_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
const ALLOWED_DECISIONS = new Set(['PENDING', 'APPROVED', 'REJECTED']);

const sourceContractLiterals = [
  'DAEGU_CANONICAL_SKY_UPPER_RETRACE_BATCH_V1',
  'SKY_UPPER_01_10',
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

function finiteNumber(value) {
  return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
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
        ? 'MARKER_SEAT_SPLIT_REQUIRED:09; trace only the seat polygon and keep accessibility marker outside canonical selectable runtime.'
        : 'DIRECT_OPERATOR_REFERENCE_TRACE_REQUIRED',
      sourceCoordinateSystem: row.sourceCoordinateSystem,
      targetCoordinateSystem: row.targetCoordinateSystem,
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

function summarize(rows, validations) {
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
  const rejectedRows = rows.filter((row) => row.operatorDecision === 'REJECTED');
  const pendingRows = rows.filter((row) => row.operatorDecision === 'PENDING');
  const markerSplitRows = rows.filter((row) => row.markerSeatSplitRequired);
  const allApproved = rows.length === BATCH_BLOCK_KEYS.length && approvedRows.length === rows.length && invalidRows.length === 0;

  return {
    status: invalidRows.length > 0 || (requireApproved && !allApproved)
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
    markerSeatSplitRows: markerSplitRows.length,
    markerSeatSplitBlockKeys: markerSplitRows.map((row) => row.blockKey),
    sourceCoordinateSystem: 'SAMSUNG_OFFICIAL_2026_1707x2048',
    targetCoordinateSystem: 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096',
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
    if (row.targetCoordinateSystem !== 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096') failures.push('INVALID_TARGET_COORDINATE_SYSTEM');
    if (row.simpleScaleOrCopyAllowed !== false) failures.push('SIMPLE_SCALE_OR_COPY_FORBIDDEN');
    if (row.blockKey === '09' && row.markerSeatSplitRequired !== true) failures.push('MARKER_SEAT_SPLIT_REQUIRED:09');

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

async function writeBatch() {
  const rows = buildBatchRows();
  const validations = validateRows(rows);
  const summary = summarize(rows, validations);
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
      batchKey: BATCH_KEY,
      directOperatorReferenceTraceRequired: true,
      officialPngCoordinatesAreHistoricalEvidenceOnly: true,
      simpleScaleOrCopyForbidden: true,
      markerSeatSplitRequired: ['09'],
      approvalRequiredFields: ['operatorDecision=APPROVED', 'correctedPath', 'correctedHitPath', 'correctedLabelX', 'correctedLabelY', 'reviewer', 'reviewedAt'],
      sourceDataWritePerformed: false,
      generatedReportsAreEvidenceOnly: true,
    },
    summary,
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
    sourceDataWritePerformed: false,
    rows,
  }, null, 2)}\n`, 'utf8');
  await fs.writeFile(operatorInputCsvPath, buildCsv(rows, columns), 'utf8');
  await fs.writeFile(batchMdPath, [
    '# Daegu Canonical SKY Upper Retrace Batch',
    '',
    `- status: \`${summary.status}\``,
    `- version: \`${BATCH_VERSION}\``,
    `- batch key: \`${BATCH_KEY}\``,
    `- block keys: \`${summary.blockKeys.join(', ')}\``,
    `- batch rows: \`${summary.batchRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- marker seat split rows: \`${summary.markerSeatSplitRows}\` (${summary.markerSeatSplitBlockKeys.join(', ') || 'none'})`,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
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
    '- `SIMPLE_SCALE_OR_COPY_FORBIDDEN`: do not scale or copy 1707x2048 official PNG coordinates.',
    '- `MARKER_SEAT_SPLIT_REQUIRED:09`: row 09 must keep accessibility marker evidence outside the selectable seat polygon.',
    '- `SOURCE_WRITE_FORBIDDEN`: this batch creates review evidence only.',
    '',
  ].join('\n'), 'utf8');

  console.log(`status:${summary.status} batch=${BATCH_KEY} rows=${summary.batchRows} pending=${summary.pendingRows} approved=${summary.approvedRows} marker_split=${summary.markerSeatSplitRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  console.log(`report:${batchJsonPath}`);
}

async function readInputRows() {
  try {
    const payload = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    return Array.isArray(payload.rows) ? payload.rows : [];
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return buildBatchRows();
  }
}

async function writeGate() {
  const rows = await readInputRows();
  const validations = validateRows(rows);
  const summary = summarize(rows, validations);
  const report = {
    generatedAt: new Date().toISOString(),
    version: BATCH_VERSION,
    status: summary.status,
    inputPath: toFrontendRelative(inputPath),
    summary,
    validations,
    rows,
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(gateCsvPath, buildCsv(validations, ['reviewId', 'blockKey', 'operatorDecision', 'validationStatus', 'failures', 'warnings']), 'utf8');
  await fs.writeFile(gateMdPath, [
    '# Daegu Canonical SKY Upper Retrace Gate',
    '',
    `- status: \`${summary.status}\``,
    `- input path: \`${report.inputPath}\``,
    `- batch rows: \`${summary.batchRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
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
