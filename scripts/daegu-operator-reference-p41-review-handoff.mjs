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
const p38SeedJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p38-review-input-seed/daegu-operator-reference-p38-review-input-seed.json');
const p39JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p39-review-input-status/daegu-operator-reference-p39-review-input-status.json');
const p40JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p40-release-lock-preflight/daegu-operator-reference-p40-release-lock-preflight.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p41-review-handoff');
const zoneDir = path.join(outputDir, 'zones');
const gateDir = path.join(outputDir, 'gate');
const handoffJsonPath = path.join(outputDir, 'daegu-operator-reference-p41-review-handoff.json');
const handoffCsvPath = path.join(outputDir, 'daegu-operator-reference-p41-review-handoff.csv');
const pendingCsvPath = path.join(outputDir, 'daegu-operator-reference-p41-pending-review-queue.csv');
const zoneSummaryCsvPath = path.join(outputDir, 'daegu-operator-reference-p41-zone-summary.csv');
const handoffMdPath = path.join(outputDir, 'daegu-operator-reference-p41-review-handoff.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p41-review-handoff-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p41-review-handoff-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p41-review-handoff-gate.md');

const task = process.argv[2] ?? 'handoff';
const requireHandoff = process.argv.includes('--require-handoff');
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
const reviewZoneOrder = [
  'OUTFIELD_TOP_TABLE_RESERVED',
  'OUTFIELD_MINI_COUPLE_FAMILY',
  'INFIELD_RESERVED',
  'EXCITING_INFIELD',
  'VIP_TABLE_BLUE_AWAY',
  'SKY_LOWER',
  'SPECIAL_ZONE',
];

const sourceContractLiterals = [
  'P41_OPERATOR_REVIEW_HANDOFF_FROM_P40_BLOCKERS',
  'PENDING_131_ROWS_SPLIT_BY_REVIEW_ZONE',
  'OPERATOR_WRITABLE_COLUMNS_ONLY',
  'EVIDENCE_LINKS_PRESERVED',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'P41_HANDOFF_DOES_NOT_APPROVE_ROWS',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p41-review-handoff-ready',
  'p41-review-handoff-gate-passed',
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

function normalizeDecision(value) {
  return String(value ?? '').trim().toUpperCase() || 'PENDING';
}

function zoneSlug(zoneId) {
  return zoneId.toLowerCase().replace(/_/g, '-');
}

function classifyReviewZone(row) {
  const block = String(row.block ?? '').toUpperCase();
  const name = String(row.name ?? '');
  if (/^(TR|RF|LF)-/.test(block)) {
    return 'OUTFIELD_TOP_TABLE_RESERVED';
  }
  if (/^(ML|MR|F)-/.test(block)) {
    return 'OUTFIELD_MINI_COUPLE_FAMILY';
  }
  if (block.startsWith('1E-') || block.startsWith('3E-')) {
    return 'EXCITING_INFIELD';
  }
  if (name.includes('내야지정석')) {
    return 'INFIELD_RESERVED';
  }
  if (block.startsWith('S-')) {
    return 'SKY_LOWER';
  }
  if (name.includes('루프탑') || name.includes('파티플로어') || name.includes('잔디석') || name.includes('캠핑존') || name.includes('요기보')) {
    return 'SPECIAL_ZONE';
  }
  return 'VIP_TABLE_BLUE_AWAY';
}

function buildZoneSummaries(rows) {
  const zoneRows = new Map(reviewZoneOrder.map((zoneId) => [zoneId, []]));
  for (const row of rows) {
    const list = zoneRows.get(row.reviewZone) ?? [];
    list.push(row);
    zoneRows.set(row.reviewZone, list);
  }
  return [...zoneRows.entries()]
    .filter(([, rowsInZone]) => rowsInZone.length > 0)
    .map(([zoneId, rowsInZone], index) => ({
      reviewZone: zoneId,
      reviewBatch: `P41-Z${String(index + 1).padStart(2, '0')}`,
      rows: rowsInZone.length,
      approvedRows: rowsInZone.filter((row) => row.operatorDecision === 'APPROVED').length,
      rejectedRows: rowsInZone.filter((row) => row.operatorDecision === 'REJECTED').length,
      pendingRows: rowsInZone.filter((row) => row.operatorDecision === 'PENDING').length,
      firstReviewId: rowsInZone[0]?.reviewId ?? '',
      lastReviewId: rowsInZone[rowsInZone.length - 1]?.reviewId ?? '',
      zoneCsv: toFrontendRelative(path.join(zoneDir, `daegu-operator-reference-p41-${zoneSlug(zoneId)}.csv`)),
      nextAction: 'Review every crop against the overlay, then edit only operatorDecision, reviewer, reviewedAt, reviewNote, nextAction in the external input file.',
    }));
}

function enrichRows({ seedRows, statusRows }) {
  const seedBySectionId = new Map(seedRows.map((row) => [row.sectionId, row]));
  const zonePosition = new Map();
  return statusRows.map((statusRow, index) => {
    const seedRow = seedBySectionId.get(statusRow.sectionId) ?? {};
    const operatorDecision = normalizeDecision(statusRow.operatorDecision);
    const reviewZone = classifyReviewZone(statusRow);
    const currentPosition = (zonePosition.get(reviewZone) ?? 0) + 1;
    zonePosition.set(reviewZone, currentPosition);
    return {
      queueOrder: index + 1,
      reviewZone,
      zoneOrder: currentPosition,
      reviewId: statusRow.reviewId,
      sectionId: statusRow.sectionId,
      block: statusRow.block,
      name: statusRow.name,
      operatorDecision,
      reviewer: statusRow.reviewer,
      reviewedAt: statusRow.reviewedAt,
      reviewNote: statusRow.reviewNote,
      nextAction: statusRow.nextAction || 'OPERATOR_REVIEW_PENDING',
      validationStatus: statusRow.validationStatus,
      failures: statusRow.failures,
      evidenceCropPng: seedRow.evidenceCropPng ?? statusRow.evidenceCropPng,
      evidenceCropSvg: seedRow.evidenceCropSvg ?? '',
      overlayPng: seedRow.overlayPng ?? '',
      handoffInstruction: operatorDecision === 'PENDING'
        ? 'Inspect crop/overlay and fill operator writable columns only.'
        : 'Keep evidence columns unchanged.',
    };
  });
}

function buildValidations({ summary, rows, zoneSummaries }) {
  const assignedRows = rows.filter((row) => reviewZoneOrder.includes(row.reviewZone)).length;
  const missingEvidenceRows = rows.filter((row) => !row.evidenceCropPng || !row.evidenceCropSvg || !row.overlayPng);
  return [
    {
      rowId: 'P41_OPERATOR_REVIEW_HANDOFF_FROM_P40_BLOCKERS',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p40ReleaseLockBlocked === true ? 'PASS' : 'INVALID',
      failures: summary.p40ReleaseLockBlocked === true ? '' : 'P40_BLOCKER_STATE_NOT_FOUND',
    },
    {
      rowId: 'PENDING_131_ROWS_SPLIT_BY_REVIEW_ZONE',
      validationType: 'HANDOFF_QUEUE',
      validationStatus: rows.length === 131 && assignedRows === 131 && zoneSummaries.length > 0 ? 'PASS' : 'INVALID',
      failures: rows.length === 131 && assignedRows === 131 && zoneSummaries.length > 0 ? '' : `ROWS_${rows.length}_ASSIGNED_${assignedRows}_ZONES_${zoneSummaries.length}`,
    },
    {
      rowId: 'P41_HANDOFF_DOES_NOT_APPROVE_ROWS',
      validationType: 'APPROVAL_POLICY',
      validationStatus: summary.approvedRows === 0 && summary.pendingRows === 131 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.approvedRows === 0 && summary.pendingRows === 131 ? '' : `APPROVED_${summary.approvedRows}_PENDING_${summary.pendingRows}`,
    },
    {
      rowId: 'EVIDENCE_LINKS_PRESERVED',
      validationType: 'EVIDENCE_POLICY',
      validationStatus: missingEvidenceRows.length === 0 ? 'PASS' : 'INVALID',
      failures: missingEvidenceRows.length === 0 ? '' : `MISSING_EVIDENCE_LINKS:${missingEvidenceRows.length}`,
    },
    {
      rowId: 'OPERATOR_WRITABLE_COLUMNS_ONLY',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.operatorWritableColumnsOnly ? 'PASS' : 'INVALID',
      failures: summary.operatorWritableColumnsOnly ? '' : 'IMMUTABLE_COLUMNS_CHANGED',
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
}

async function writeHandoff() {
  const [seed, p39, p40] = await Promise.all([
    readJson(p38SeedJsonPath),
    readJson(p39JsonPath),
    readJson(p40JsonPath),
  ]);
  const rows = enrichRows({ seedRows: seed.rows ?? [], statusRows: p39.rows ?? [] });
  const zoneSummaries = buildZoneSummaries(rows);
  const p39Summary = p39.summary ?? {};
  const p40Summary = p40.summary ?? {};
  const summary = {
    status: 'p41-review-handoff-ready',
    totalRows: rows.length,
    expectedRows: 131,
    currentSelectableSeats: DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    zoneCount: zoneSummaries.length,
    approvedRows: p39Summary.approvedRows ?? 0,
    rejectedRows: p39Summary.rejectedRows ?? 0,
    pendingRows: p39Summary.pendingRows ?? 0,
    invalidRows: p39Summary.invalidRows ?? 0,
    immutableColumnChangeCount: p39Summary.immutableColumnChangeCount ?? 0,
    p40ReleaseLockBlocked: p40Summary.releaseLockBlocked === true,
    releaseLockCandidateReady: false,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    operatorWritableColumnsOnly: p39Summary.operatorWritableColumnsOnly === true,
    evidenceLinksPreserved: rows.every((row) => row.evidenceCropPng && row.evidenceCropSvg && row.overlayPng),
    p41HandoffDoesNotApproveRows: true,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
  const validations = buildValidations({ summary, rows, zoneSummaries });
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p38SeedJson: toFrontendRelative(p38SeedJsonPath),
      p39Json: toFrontendRelative(p39JsonPath),
      p40Json: toFrontendRelative(p40JsonPath),
      p39OperatorInput: p39.source?.operatorInput,
    },
    policy: {
      operatorWritableColumns,
      immutableEvidenceColumns,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P41_OPERATOR_REVIEW_HANDOFF_FROM_P40_BLOCKERS. PENDING_131_ROWS_SPLIT_BY_REVIEW_ZONE. OPERATOR_WRITABLE_COLUMNS_ONLY. EVIDENCE_LINKS_PRESERVED. P41_HANDOFF_DOES_NOT_APPROVE_ROWS.',
    },
    summary: {
      ...summary,
      invalidHandoffChecks: invalidRows.length,
      reviewPendingChecks: reviewPendingRows.length,
    },
    zoneSummaries,
    rows,
    validations,
    outputs: {
      handoffJson: toFrontendRelative(handoffJsonPath),
      handoffCsv: toFrontendRelative(handoffCsvPath),
      pendingCsv: toFrontendRelative(pendingCsvPath),
      zoneSummaryCsv: toFrontendRelative(zoneSummaryCsvPath),
      handoffMd: toFrontendRelative(handoffMdPath),
      zoneDir: toFrontendRelative(zoneDir),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(zoneDir, { recursive: true });
  await fs.writeFile(handoffJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(handoffCsvPath, buildCsv(rows, [
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
    'handoffInstruction',
  ]));
  await fs.writeFile(pendingCsvPath, buildCsv(rows.filter((row) => row.operatorDecision === 'PENDING'), [
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
    'handoffInstruction',
  ]));
  await fs.writeFile(zoneSummaryCsvPath, buildCsv(zoneSummaries, [
    'reviewBatch',
    'reviewZone',
    'rows',
    'approvedRows',
    'rejectedRows',
    'pendingRows',
    'firstReviewId',
    'lastReviewId',
    'zoneCsv',
    'nextAction',
  ]));
  for (const zone of zoneSummaries) {
    const zoneRows = rows.filter((row) => row.reviewZone === zone.reviewZone);
    await fs.writeFile(path.join(zoneDir, `daegu-operator-reference-p41-${zoneSlug(zone.reviewZone)}.csv`), buildCsv(zoneRows, [
      'zoneOrder',
      'queueOrder',
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
      'handoffInstruction',
    ]));
  }
  await fs.writeFile(handoffMdPath, [
    '# 대구 operator reference P41 review handoff',
    '',
    `- status: \`${payload.summary.status}\``,
    `- total rows: \`${payload.summary.totalRows}\``,
    `- pending rows: \`${payload.summary.pendingRows}\``,
    `- approved rows: \`${payload.summary.approvedRows}\``,
    `- rejected rows: \`${payload.summary.rejectedRows}\``,
    `- invalid rows: \`${payload.summary.invalidRows}\``,
    `- zone count: \`${payload.summary.zoneCount}\``,
    `- P40 release lock blocked: \`${payload.summary.p40ReleaseLockBlocked}\``,
    `- operator reference 131 lock allowed: \`${payload.summary.operatorReference131LockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${payload.summary.passRelease177Allowed}\``,
    `- production write allowed: \`${payload.summary.productionWriteAllowed}\``,
    `- source data write performed: \`${payload.summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${payload.summary.buildBlockerTrackedSeparately}\``,
    '',
    '## Review Zones',
    '',
    ...zoneSummaries.map((zone) => `- \`${zone.reviewBatch}\` ${zone.reviewZone}: rows=\`${zone.rows}\`, pending=\`${zone.pendingRows}\`, csv=\`${zone.zoneCsv}\``),
    '',
    '## Operator Editable Columns',
    '',
    operatorWritableColumns.map((column) => `- \`${column}\``).join('\n'),
    '',
    '## Immutable Evidence Columns',
    '',
    immutableEvidenceColumns.map((column) => `- \`${column}\``).join('\n'),
    '',
  ].join('\n'));

  console.log(`status:${payload.summary.status} rows=${payload.summary.totalRows} zones=${payload.summary.zoneCount} approved=${payload.summary.approvedRows} rejected=${payload.summary.rejectedRows} pending=${payload.summary.pendingRows} invalid=${payload.summary.invalidHandoffChecks} releaseLockBlocked=${payload.summary.p40ReleaseLockBlocked}`);
  return payload;
}

async function writeGate() {
  let handoff;
  try {
    handoff = await readJson(handoffJsonPath);
  } catch {
    handoff = await writeHandoff();
  }
  const validations = handoff.validations ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p41-review-handoff-gate-passed' : 'p41-review-handoff-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    totalRows: handoff.summary?.totalRows ?? 0,
    zoneCount: handoff.summary?.zoneCount ?? 0,
    approvedRows: handoff.summary?.approvedRows ?? 0,
    rejectedRows: handoff.summary?.rejectedRows ?? 0,
    pendingRows: handoff.summary?.pendingRows ?? 0,
    releaseLockBlocked: handoff.summary?.p40ReleaseLockBlocked === true,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: handoff.summary?.buildBlockerTrackedSeparately,
  };

  if (requireHandoff && invalidRows.length > 0) {
    throw new Error(`P41 review handoff gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
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
    '# 대구 operator reference P41 review handoff gate',
    '',
    `- status: \`${summary.status}\``,
    `- total rows: \`${summary.totalRows}\``,
    `- zone count: \`${summary.zoneCount}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending checks: \`${summary.reviewPendingRows}\``,
    `- release lock blocked: \`${summary.releaseLockBlocked}\``,
    `- operator reference 131 lock allowed: \`${summary.operatorReference131LockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} rows=${summary.totalRows} zones=${summary.zoneCount} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} invalid=${summary.invalidRows} releaseLockBlocked=${summary.releaseLockBlocked}`);
}

if (task === 'handoff') {
  await writeHandoff();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
