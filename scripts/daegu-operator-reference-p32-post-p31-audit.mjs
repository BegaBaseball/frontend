import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p9PacketJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p9-missing-scan/daegu-operator-reference-p9-missing-scan-packet.json');
const p10PacketJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p10-candidate-classification/daegu-operator-reference-p10-candidate-classification-packet.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p32-post-p31-audit');
const auditJsonPath = path.join(outputDir, 'daegu-operator-reference-p32-post-p31-audit.json');
const auditCsvPath = path.join(outputDir, 'daegu-operator-reference-p32-post-p31-audit.csv');
const auditMdPath = path.join(outputDir, 'daegu-operator-reference-p32-post-p31-audit.md');
const gateDir = path.join(outputDir, 'gate');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p32-post-p31-audit-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p32-post-p31-audit-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p32-post-p31-audit-gate.md');

const task = process.argv[2] ?? 'audit';
const requireClassified = process.argv.includes('--require-classified');

const allowedP10Classifications = new Set([
  'LABEL_VISIBLE_SEAT_BLOCK',
  'UNLABELED_SEAT_STRIP_REVIEW',
  'MARKER_OR_ACCESSIBILITY_REVIEW',
  'FACILITY_OR_NON_SEAT',
  'LEGEND_OR_DECORATION',
  'MERGE_WITH_EXISTING_REVIEW',
]);

const sourceContractLiterals = [
  'P32 consolidates the post-P31 P9/P10 image-component evidence.',
  'POST_P31_REVIEW_ONLY_STRIP',
  'POST_P31_DUPLICATE_OR_STRIP_REVIEW',
  'POST_P31_NON_SEAT_COMPONENT',
  'POST_P31_NEXT_BATCH_CANDIDATE',
  'NO_LABEL_VISIBLE_SEAT_CANDIDATES_LEFT_AFTER_P31',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p32-post-p31-audit-ready',
  'p32-post-p31-audit-gate-passed',
  'DAEGU_OPERATOR_REFERENCE_BLOCKS',
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

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] || 'UNCLASSIFIED';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function mapP10Row(row) {
  const base = {
    draftId: row.draftId,
    sourceClassification: row.classification,
    suggestedBlockName: row.suggestedBlockName,
    suggestedCategory: row.suggestedCategory,
    p11DecisionType: row.p11DecisionType,
    colorClass: row.colorClass,
    minX: row.minX,
    minY: row.minY,
    maxX: row.maxX,
    maxY: row.maxY,
    labelX: row.labelX,
    labelY: row.labelY,
    cropPng: row.cropPng,
    reviewNote: row.reviewNote,
  };

  switch (row.classification) {
    case 'LABEL_VISIBLE_SEAT_BLOCK':
      return {
        ...base,
        p32Classification: 'POST_P31_NEXT_BATCH_CANDIDATE',
        blocker: 'LABEL_VISIBLE_SEAT_CANDIDATE_REQUIRES_OPERATOR_APPROVAL',
        nextAction: 'CREATE_NEXT_APPROVAL_BATCH_BEFORE_PRODUCTION_IMPORT',
      };
    case 'UNLABELED_SEAT_STRIP_REVIEW':
      return {
        ...base,
        p32Classification: 'POST_P31_REVIEW_ONLY_STRIP',
        blocker: 'NO_INDEPENDENT_VISIBLE_BLOCK_LABEL',
        nextAction: 'KEEP_OUT_OF_SELECTABLE_LAYER_UNLESS_OPERATOR_PROVIDES_BLOCK_LABEL',
      };
    case 'MERGE_WITH_EXISTING_REVIEW':
      return {
        ...base,
        p32Classification: 'POST_P31_DUPLICATE_OR_STRIP_REVIEW',
        blocker: 'NEIGHBOR_OWNERSHIP_OR_THIN_STRIP_REVIEW_REQUIRED',
        nextAction: 'REVIEW_NEIGHBOR_OWNERSHIP_BEFORE_ANY_PROMOTION',
      };
    case 'FACILITY_OR_NON_SEAT':
    case 'MARKER_OR_ACCESSIBILITY_REVIEW':
    case 'LEGEND_OR_DECORATION':
      return {
        ...base,
        p32Classification: 'POST_P31_NON_SEAT_COMPONENT',
        blocker: 'NOT_A_SELECTABLE_SEAT_BLOCK',
        nextAction: 'KEEP_OUT_OF_SELECTABLE_SEAT_LAYER',
      };
    default:
      return {
        ...base,
        p32Classification: 'POST_P31_UNCLASSIFIED',
        blocker: 'P10_CLASSIFICATION_MISSING_OR_UNKNOWN',
        nextAction: 'MANUAL_CLASSIFICATION_REQUIRED',
      };
  }
}

function validateAudit({ p9Packet, p10Packet, p32Rows }) {
  const p9MissingRows = (p9Packet.rows ?? []).filter((row) => row.classification === 'MISSING_BLOCK_CANDIDATE');
  const p10Rows = p10Packet.rows ?? [];
  const p10RowIds = new Set(p10Rows.map((row) => row.draftId));
  const p9MissingIds = new Set(p9MissingRows.map((row) => row.draftId));
  const validations = [];

  for (const row of p9MissingRows) {
    const failures = [];
    if (!p10RowIds.has(row.draftId)) failures.push('MISSING_P10_CLASSIFICATION');
    validations.push({
      rowId: row.draftId,
      validationType: 'P9_TO_P10_COVERAGE',
      validationStatus: failures.length ? 'INVALID' : 'PASS',
      failures: failures.join('|'),
    });
  }

  for (const row of p10Rows) {
    const failures = [];
    if (!p9MissingIds.has(row.draftId)) failures.push('P10_ROW_NOT_IN_CURRENT_P9_MISSING_SET');
    if (!allowedP10Classifications.has(row.classification)) failures.push('UNKNOWN_P10_CLASSIFICATION');
    if (!row.reviewNote) failures.push('MISSING_REVIEW_NOTE');
    if (!row.nextAction) failures.push('MISSING_NEXT_ACTION');
    validations.push({
      rowId: row.draftId,
      validationType: 'P10_CLASSIFICATION_CONTRACT',
      validationStatus: failures.length ? 'INVALID' : 'PASS',
      failures: failures.join('|'),
    });
  }

  const activeCount = DAEGU_OPERATOR_REFERENCE_BLOCKS.length;
  const p9ActiveCount = p9Packet.summary?.activeSelectableSeatCount ?? 0;
  validations.push({
    rowId: 'DAEGU_OPERATOR_REFERENCE_BLOCKS',
    validationType: 'CURRENT_ACTIVE_SELECTABLE_COUNT',
    validationStatus: activeCount === p9ActiveCount ? 'PASS' : 'INVALID',
    failures: activeCount === p9ActiveCount ? '' : `P9_ACTIVE_COUNT_MISMATCH:${p9ActiveCount}_VS_${activeCount}`,
  });

  validations.push({
    rowId: 'P32_NEXT_BATCH_CANDIDATES',
    validationType: 'POST_P31_NEXT_BATCH_CANDIDATES',
    validationStatus: p32Rows.some((row) => row.p32Classification === 'POST_P31_NEXT_BATCH_CANDIDATE') ? 'REVIEW_REQUIRED' : 'PASS',
    failures: p32Rows.some((row) => row.p32Classification === 'POST_P31_NEXT_BATCH_CANDIDATE')
      ? 'LABEL_VISIBLE_SEAT_CANDIDATES_REMAIN'
      : '',
  });

  return validations;
}

async function writeAudit() {
  const p9Packet = await readJson(p9PacketJsonPath);
  const p10Packet = await readJson(p10PacketJsonPath);
  const p32Rows = (p10Packet.rows ?? []).map(mapP10Row);
  const validations = validateAudit({ p9Packet, p10Packet, p32Rows });
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const nextBatchRows = p32Rows.filter((row) => row.p32Classification === 'POST_P31_NEXT_BATCH_CANDIDATE');
  const reviewOnlyRows = p32Rows.filter((row) => row.p32Classification !== 'POST_P31_NEXT_BATCH_CANDIDATE');
  const status = invalidRows.length === 0 ? 'p32-post-p31-audit-ready' : 'p32-post-p31-audit-blocked';
  const summary = {
    status,
    traceComponentCount: p9Packet.summary?.traceComponentCount ?? 0,
    currentActiveSelectableSeats: DAEGU_OPERATOR_REFERENCE_BLOCKS.length,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    p9ActiveSelectableSeatCount: p9Packet.summary?.activeSelectableSeatCount ?? 0,
    p9MissingCandidateRows: p9Packet.summary?.missingCandidateRows ?? 0,
    p9AlreadyCoveredRows: p9Packet.summary?.alreadyCoveredRows ?? 0,
    p9P8ExcludedRows: p9Packet.summary?.p8ExcludedRows ?? 0,
    p10ClassifiedRows: p10Packet.summary?.classifiedRows ?? 0,
    p32ReviewRows: p32Rows.length,
    nextBatchCandidateRows: nextBatchRows.length,
    reviewOnlyRows: reviewOnlyRows.length,
    invalidRows: invalidRows.length,
    p32ClassificationCounts: countBy(p32Rows, 'p32Classification'),
    noLabelVisibleSeatCandidatesLeftAfterP31: nextBatchRows.length === 0,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
  const payload = {
    status,
    generatedAt: new Date().toISOString(),
    source: {
      p9Packet: toFrontendRelative(p9PacketJsonPath),
      p10Packet: toFrontendRelative(p10PacketJsonPath),
      referenceImage: p9Packet.source?.referenceImage,
      viewBox: p9Packet.source?.viewBox,
      imageSha256: p9Packet.source?.imageSha256,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      note: 'P32 consolidates the post-P31 P9/P10 image-component evidence. It does not add selectable seat polygons.',
    },
    summary,
    nextAction: nextBatchRows.length > 0
      ? 'NEXT_APPROVAL_BATCH_REQUIRED_BEFORE_SOURCE_WRITE'
      : 'NO_LABEL_VISIBLE_SEAT_CANDIDATES_LEFT_AFTER_P31; keep review-only strips and non-seat components out of selectable layer.',
    rows: p32Rows,
    validations,
    outputs: {
      auditJson: toFrontendRelative(auditJsonPath),
      auditCsv: toFrontendRelative(auditCsvPath),
      auditMd: toFrontendRelative(auditMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(auditJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(auditCsvPath, buildCsv(p32Rows, [
    'draftId',
    'sourceClassification',
    'p32Classification',
    'suggestedBlockName',
    'suggestedCategory',
    'p11DecisionType',
    'blocker',
    'nextAction',
    'colorClass',
    'minX',
    'minY',
    'maxX',
    'maxY',
    'labelX',
    'labelY',
    'cropPng',
    'reviewNote',
  ]));
  await fs.writeFile(auditMdPath, [
    '# 대구 operator reference P32 post-P31 audit',
    '',
    `- status: \`${summary.status}\``,
    `- trace components: \`${summary.traceComponentCount}\``,
    `- current active selectable seats: \`${summary.currentActiveSelectableSeats}\``,
    `- official dataset blocks: \`${summary.officialDatasetBlocks}\``,
    `- P9 missing candidates: \`${summary.p9MissingCandidateRows}\``,
    `- P9 already covered rows: \`${summary.p9AlreadyCoveredRows}\``,
    `- P9 P8 excluded rows: \`${summary.p9P8ExcludedRows}\``,
    `- P10 classified rows: \`${summary.p10ClassifiedRows}\``,
    `- P32 review rows: \`${summary.p32ReviewRows}\``,
    `- next batch candidates: \`${summary.nextBatchCandidateRows}\``,
    `- review-only rows: \`${summary.reviewOnlyRows}\``,
    `- no label-visible seat candidates left after P31: \`${summary.noLabelVisibleSeatCandidatesLeftAfterP31}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## P32 Classification Counts',
    '',
    ...Object.entries(summary.p32ClassificationCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([classification, count]) => `- \`${classification}\`: ${count}`),
    '',
    '## Next Batch Candidates',
    '',
    nextBatchRows.length > 0
      ? nextBatchRows.map((row) => `- \`${row.draftId}\` -> \`${row.suggestedBlockName}\` (${row.suggestedCategory})`).join('\n')
      : '- none',
    '',
    '## Review-Only Rows',
    '',
    ...reviewOnlyRows.map((row) => `- \`${row.draftId}\` ${row.p32Classification} next=\`${row.nextAction}\``),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} activeSelectable=${summary.currentActiveSelectableSeats} p9Missing=${summary.p9MissingCandidateRows} nextBatchCandidates=${summary.nextBatchCandidateRows} invalidRows=${summary.invalidRows}`);
  return payload;
}

async function writeGate() {
  let audit;
  try {
    audit = await readJson(auditJsonPath);
  } catch {
    audit = await writeAudit();
  }

  const validations = audit.validations ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewRequiredRows = validations.filter((row) => row.validationStatus === 'REVIEW_REQUIRED');
  const summary = {
    status: invalidRows.length === 0 ? 'p32-post-p31-audit-gate-passed' : 'p32-post-p31-audit-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewRequiredRows: reviewRequiredRows.length,
    currentActiveSelectableSeats: audit.summary?.currentActiveSelectableSeats ?? 0,
    p9MissingCandidateRows: audit.summary?.p9MissingCandidateRows ?? 0,
    nextBatchCandidateRows: audit.summary?.nextBatchCandidateRows ?? 0,
    noLabelVisibleSeatCandidatesLeftAfterP31: audit.summary?.noLabelVisibleSeatCandidatesLeftAfterP31 === true,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  if (requireClassified && invalidRows.length > 0) {
    throw new Error(`P32 post-P31 audit gate failed: invalidRows=${summary.invalidRows}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P32 post-P31 audit gate',
    '',
    `- status: \`${summary.status}\``,
    `- total validations: \`${summary.totalValidations}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review required rows: \`${summary.reviewRequiredRows}\``,
    `- current active selectable seats: \`${summary.currentActiveSelectableSeats}\``,
    `- P9 missing candidates: \`${summary.p9MissingCandidateRows}\``,
    `- next batch candidates: \`${summary.nextBatchCandidateRows}\``,
    `- no label-visible seat candidates left after P31: \`${summary.noLabelVisibleSeatCandidatesLeftAfterP31}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} invalidRows=${summary.invalidRows} nextBatchCandidates=${summary.nextBatchCandidateRows}`);
}

if (task === 'audit') {
  await writeAudit();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
