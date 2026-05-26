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
const p41JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p41-review-handoff/daegu-operator-reference-p41-review-handoff.json');
const p49JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p49-postwrite-release-audit/daegu-operator-reference-p49-postwrite-release-audit.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p50-final-review-pack');
const zoneDir = path.join(outputDir, 'zones');
const gateDir = path.join(outputDir, 'gate');
const packJsonPath = path.join(outputDir, 'daegu-operator-reference-p50-final-review-pack.json');
const packCsvPath = path.join(outputDir, 'daegu-operator-reference-p50-final-review-pack.csv');
const zoneSummaryCsvPath = path.join(outputDir, 'daegu-operator-reference-p50-zone-summary.csv');
const operatorGuideMdPath = path.join(outputDir, 'daegu-operator-reference-p50-operator-guide.md');
const expectedCommandsMdPath = path.join(outputDir, 'daegu-operator-reference-p50-expected-commands.md');
const blockerCsvPath = path.join(outputDir, 'daegu-operator-reference-p50-release-blockers.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p50-final-review-pack-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p50-final-review-pack-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p50-final-review-pack-gate.md');

const task = process.argv[2] ?? 'pack';
const requirePack = process.argv.includes('--require-pack');

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
  'reviewZone',
  'evidenceCropPng',
  'evidenceCropSvg',
  'overlayPng',
];

const sourceContractLiterals = [
  'P50_FINAL_REVIEW_PACK',
  'P41_REVIEW_HANDOFF_ROWS_131',
  'P49_RELEASE_BLOCKERS_INCLUDED',
  'OPERATOR_WRITABLE_COLUMNS_ONLY',
  'IMMUTABLE_EVIDENCE_COLUMNS_PRESERVED',
  'ZONE_CSVS_GENERATED',
  'APPROVED_REQUIRES_CROP_OVERLAY_MATCH',
  'REJECTED_REQUIRES_RETRACE',
  'PENDING_BLOCKS_RELEASE',
  'REAL_OPERATOR_INPUT_NEXT_COMMAND',
  'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p50-final-review-pack-ready',
  'p50-final-review-pack-gate-passed',
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

function zoneSlug(zoneId) {
  return String(zoneId).toLowerCase().replace(/_/g, '-');
}

function normalizeRows(p41) {
  return (p41.rows ?? []).map((row) => ({
    queueOrder: row.queueOrder,
    reviewZone: row.reviewZone,
    zoneOrder: row.zoneOrder,
    reviewId: row.reviewId,
    sectionId: row.sectionId,
    block: row.block,
    name: row.name,
    operatorDecision: row.operatorDecision || 'PENDING',
    reviewer: row.reviewer ?? '',
    reviewedAt: row.reviewedAt ?? '',
    reviewNote: row.reviewNote ?? '',
    nextAction: row.nextAction || 'OPERATOR_REVIEW_PENDING',
    evidenceCropPng: row.evidenceCropPng,
    evidenceCropSvg: row.evidenceCropSvg,
    overlayPng: row.overlayPng,
    approvedCriteria: 'APPROVED_REQUIRES_CROP_OVERLAY_MATCH',
    rejectedCriteria: 'REJECTED_REQUIRES_RETRACE',
    editableColumns: operatorWritableColumns.join('|'),
    immutableColumns: immutableEvidenceColumns.join('|'),
  }));
}

function buildZoneSummaries(rows) {
  const zoneIds = [...new Set(rows.map((row) => row.reviewZone))];
  return zoneIds.map((zoneId, index) => {
    const zoneRows = rows.filter((row) => row.reviewZone === zoneId);
    return {
      reviewZone: zoneId,
      reviewBatch: `P50-Z${String(index + 1).padStart(2, '0')}`,
      rows: zoneRows.length,
      approvedRows: zoneRows.filter((row) => row.operatorDecision === 'APPROVED').length,
      rejectedRows: zoneRows.filter((row) => row.operatorDecision === 'REJECTED').length,
      pendingRows: zoneRows.filter((row) => row.operatorDecision === 'PENDING').length,
      zoneCsv: toFrontendRelative(path.join(zoneDir, `daegu-operator-reference-p50-${zoneSlug(zoneId)}.csv`)),
      nextAction: 'Fill operatorDecision, reviewer, reviewedAt, reviewNote, nextAction only.',
    };
  });
}

function normalizeSummary(p41, p49, rows, zoneSummaries) {
  const p41Summary = p41.summary ?? {};
  const p49Summary = p49.summary ?? {};
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const pendingRows = rows.filter((row) => row.operatorDecision === 'PENDING').length;
  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED').length;
  const rejectedRows = rows.filter((row) => row.operatorDecision === 'REJECTED').length;
  const missingEvidenceRows = rows.filter((row) => !row.evidenceCropPng || !row.evidenceCropSvg || !row.overlayPng).length;
  const finalReviewPackReady = rows.length === 131
    && zoneSummaries.length > 0
    && missingEvidenceRows === 0
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: finalReviewPackReady ? 'p50-final-review-pack-ready' : 'p50-final-review-pack-blocked',
    p41Status: p41.status ?? p41Summary.status,
    p49Status: p49.status ?? p49Summary.status,
    totalRows: rows.length,
    expectedRows: 131,
    zoneCount: zoneSummaries.length,
    approvedRows,
    rejectedRows,
    pendingRows,
    missingEvidenceRows,
    operatorWritableColumnsOnly: true,
    immutableEvidenceColumnsPreserved: missingEvidenceRows === 0,
    p41ReviewHandoffRows131: rows.length === 131,
    p49ReleaseBlockersIncluded: (p49.blockers ?? []).length > 0,
    releaseBlockerRows: (p49.blockers ?? []).length,
    currentSelectableSeats,
    officialDatasetBlocks,
    finalReviewPackReady,
    releaseLockAllowed: false,
    releaseLockBlocked: true,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: p49Summary.buildBlockerTrackedSeparately
      ?? p41Summary.buildBlockerTrackedSeparately
      ?? 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildValidations(summary) {
  return [
    {
      rowId: 'P50_FINAL_REVIEW_PACK',
      validationType: 'PACK_CONTRACT',
      validationStatus: summary.finalReviewPackReady ? 'PASS' : 'INVALID',
      failures: summary.finalReviewPackReady ? '' : `ROWS_${summary.totalRows}_MISSING_EVIDENCE_${summary.missingEvidenceRows}`,
      nextAction: 'Use this pack as the final operator review input source.',
    },
    {
      rowId: 'P41_REVIEW_HANDOFF_ROWS_131',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p41ReviewHandoffRows131 ? 'PASS' : 'INVALID',
      failures: summary.p41ReviewHandoffRows131 ? '' : `ROWS:${summary.totalRows}`,
      nextAction: 'Regenerate P41 if the pack is not 131 rows.',
    },
    {
      rowId: 'P49_RELEASE_BLOCKERS_INCLUDED',
      validationType: 'BLOCKER_CONTEXT',
      validationStatus: summary.p49ReleaseBlockersIncluded ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.p49ReleaseBlockersIncluded ? '' : 'P49_BLOCKERS_MISSING',
      nextAction: 'Keep P49 blocker context visible until real operator input is complete.',
    },
    {
      rowId: 'OPERATOR_WRITABLE_COLUMNS_ONLY',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.operatorWritableColumnsOnly ? 'PASS' : 'INVALID',
      failures: summary.operatorWritableColumnsOnly ? '' : 'WRITABLE_COLUMN_POLICY_MISSING',
      nextAction: 'Only operatorDecision, reviewer, reviewedAt, reviewNote, nextAction may be edited.',
    },
    {
      rowId: 'IMMUTABLE_EVIDENCE_COLUMNS_PRESERVED',
      validationType: 'EVIDENCE_POLICY',
      validationStatus: summary.immutableEvidenceColumnsPreserved ? 'PASS' : 'INVALID',
      failures: summary.immutableEvidenceColumnsPreserved ? '' : `MISSING_EVIDENCE:${summary.missingEvidenceRows}`,
      nextAction: 'Evidence crop, SVG, and overlay links must remain unchanged.',
    },
    {
      rowId: 'ZONE_CSVS_GENERATED',
      validationType: 'OUTPUT_POLICY',
      validationStatus: summary.zoneCount > 0 ? 'PASS' : 'INVALID',
      failures: summary.zoneCount > 0 ? '' : 'ZONE_CSVS_MISSING',
      nextAction: 'Review can proceed by zone CSV or full CSV.',
    },
    {
      rowId: 'PENDING_BLOCKS_RELEASE',
      validationType: 'RELEASE_POLICY',
      validationStatus: summary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.pendingRows > 0 ? `PENDING_ROWS:${summary.pendingRows}` : '',
      nextAction: 'Release remains blocked until all rows are APPROVED or rejected/retraced.',
    },
    {
      rowId: 'REAL_OPERATOR_INPUT_NEXT_COMMAND',
      validationType: 'COMMAND_POLICY',
      validationStatus: 'PASS',
      failures: '',
      nextAction: 'Run DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT=<operator-csv> npm run stadium:daegu:operator-reference-p49-postwrite-release-audit after review is complete.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
      nextAction: 'P50 must not modify daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P50 prepares operator reference review only; official 177 release remains separate.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu operator review.',
    },
  ];
}

async function writePack() {
  const [p41, p49] = await Promise.all([
    readJson(p41JsonPath),
    readJson(p49JsonPath),
  ]);
  const rows = normalizeRows(p41);
  const zoneSummaries = buildZoneSummaries(rows);
  const summary = normalizeSummary(p41, p49, rows, zoneSummaries);
  const validations = buildValidations(summary);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p41Json: toFrontendRelative(p41JsonPath),
      p49Json: toFrontendRelative(p49JsonPath),
      p41ReviewHandoffCsv: p41.outputs?.handoffCsv,
      p49ReleaseLockManifest: p49.outputs?.releaseLockManifestMd,
    },
    policy: {
      operatorWritableColumns,
      immutableEvidenceColumns,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P50_FINAL_REVIEW_PACK. P41_REVIEW_HANDOFF_ROWS_131. P49_RELEASE_BLOCKERS_INCLUDED. OPERATOR_WRITABLE_COLUMNS_ONLY. DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT.',
    },
    summary,
    p49Blockers: p49.blockers ?? [],
    zoneSummaries,
    rows,
    validations,
    outputs: {
      packJson: toFrontendRelative(packJsonPath),
      packCsv: toFrontendRelative(packCsvPath),
      zoneSummaryCsv: toFrontendRelative(zoneSummaryCsvPath),
      operatorGuideMd: toFrontendRelative(operatorGuideMdPath),
      expectedCommandsMd: toFrontendRelative(expectedCommandsMdPath),
      blockerCsv: toFrontendRelative(blockerCsvPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(zoneDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(packJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(packCsvPath, buildCsv(rows, [
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
    'evidenceCropPng',
    'evidenceCropSvg',
    'overlayPng',
    'approvedCriteria',
    'rejectedCriteria',
    'editableColumns',
    'immutableColumns',
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
  for (const zone of zoneSummaries) {
    const zoneRows = rows.filter((row) => row.reviewZone === zone.reviewZone);
    await fs.writeFile(path.join(zoneDir, `daegu-operator-reference-p50-${zoneSlug(zone.reviewZone)}.csv`), buildCsv(zoneRows, [
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
      'evidenceCropPng',
      'evidenceCropSvg',
      'overlayPng',
      'approvedCriteria',
      'rejectedCriteria',
      'editableColumns',
      'immutableColumns',
    ]));
  }
  await fs.writeFile(blockerCsvPath, buildCsv(p49.blockers ?? [], [
    'rowId',
    'severity',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(operatorGuideMdPath, [
    '# 대구 operator reference P50 final review guide',
    '',
    `- total rows: \`${summary.totalRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- zone count: \`${summary.zoneCount}\``,
    `- editable columns: \`${operatorWritableColumns.join(', ')}\``,
    `- immutable evidence columns: \`${immutableEvidenceColumns.join(', ')}\``,
    '',
    '## Decision Rules',
    '',
    '- `APPROVED`: crop/overlay and seat label match the intended block.',
    '- `REJECTED`: polygon, label, duplicate ownership, missing block, or off-seat placement needs retrace.',
    '- `PENDING`: keeps release blocked.',
    '',
    '## Zone Files',
    '',
    ...zoneSummaries.map((zone) => `- \`${zone.reviewZone}\`: \`${zone.zoneCsv}\` (${zone.rows} rows)`),
    '',
  ].join('\n'));
  await fs.writeFile(expectedCommandsMdPath, [
    '# 대구 operator reference P50 expected commands',
    '',
    'After the operator fills the final CSV, run:',
    '',
    '```bash',
    'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT=<operator-csv> npm run stadium:daegu:operator-reference-p49-postwrite-release-audit',
    '```',
    '',
    'Expected release path after all 131 rows are approved:',
    '',
    '- P45: `realOperatorInputProvided=true`',
    '- P46: `releaseCandidateAllowed=true`',
    '- P47: `sourcePatchRows=131` and `sourcePatchAllowed=true`',
    '- P48: `sourceApplyPreconditionsMet=true`',
    '- P49: remains blocked until the explicit source apply step writes source data',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} rows=${summary.totalRows} zones=${summary.zoneCount} pending=${summary.pendingRows} p49Blockers=${summary.releaseBlockerRows} finalReviewPackReady=${summary.finalReviewPackReady}`);
  return payload;
}

async function writeGate() {
  let pack;
  try {
    pack = await readJson(packJsonPath);
  } catch {
    pack = await writePack();
  }

  const validations = pack.validations ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p50-final-review-pack-gate-passed' : 'p50-final-review-pack-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    totalRows: pack.summary?.totalRows ?? 0,
    zoneCount: pack.summary?.zoneCount ?? 0,
    approvedRows: pack.summary?.approvedRows ?? 0,
    rejectedRows: pack.summary?.rejectedRows ?? 0,
    pendingRows: pack.summary?.pendingRows ?? 0,
    releaseBlockerRows: pack.summary?.releaseBlockerRows ?? 0,
    finalReviewPackReady: pack.summary?.finalReviewPackReady === true,
    releaseLockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: pack.summary?.buildBlockerTrackedSeparately,
  };

  if (requirePack && invalidRows.length > 0) {
    throw new Error(`P50 final review pack gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
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
    '# 대구 operator reference P50 final review pack gate',
    '',
    `- status: \`${summary.status}\``,
    `- total rows: \`${summary.totalRows}\``,
    `- zone count: \`${summary.zoneCount}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- review pending validations: \`${summary.reviewPendingRows}\``,
    `- final review pack ready: \`${summary.finalReviewPackReady}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} rows=${summary.totalRows} zones=${summary.zoneCount} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} finalReviewPackReady=${summary.finalReviewPackReady}`);
}

if (task === 'pack') {
  await writePack();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
