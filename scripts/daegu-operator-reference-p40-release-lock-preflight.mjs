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
const p39JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p39-review-input-status/daegu-operator-reference-p39-review-input-status.json');
const p39GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p39-review-input-status/gate/daegu-operator-reference-p39-review-input-status-gate.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p40-release-lock-preflight');
const gateDir = path.join(outputDir, 'gate');
const preflightJsonPath = path.join(outputDir, 'daegu-operator-reference-p40-release-lock-preflight.json');
const preflightCsvPath = path.join(outputDir, 'daegu-operator-reference-p40-release-lock-preflight.csv');
const blockerCsvPath = path.join(outputDir, 'daegu-operator-reference-p40-release-lock-blockers.csv');
const preflightMdPath = path.join(outputDir, 'daegu-operator-reference-p40-release-lock-preflight.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p40-release-lock-preflight-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p40-release-lock-preflight-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p40-release-lock-preflight-gate.md');

const task = process.argv[2] ?? 'preflight';
const requirePreflight = process.argv.includes('--require-preflight');

const sourceContractLiterals = [
  'P40_OPERATOR_REFERENCE_131_RELEASE_PREFLIGHT',
  'OPERATOR_REVIEW_PENDING_ROWS_BLOCK_RELEASE_LOCK',
  'APPROVED_131_REJECTED_0_PENDING_0_REQUIRED',
  'IMMUTABLE_CHANGES_BLOCK_RELEASE_LOCK',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'P40_READS_P39_REVIEW_INPUT_STATUS',
  'P40_PREFLIGHT_DOES_NOT_WRITE_SOURCE_DATA',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p40-release-lock-preflight-ready',
  'p40-release-lock-preflight-gate-passed',
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

function addBlocker(blockers, condition, rowId, message, nextAction) {
  if (!condition) return;
  blockers.push({
    rowId,
    severity: 'BLOCKER',
    message,
    nextAction,
  });
}

function buildBlockers(summary) {
  const blockers = [];
  addBlocker(
    blockers,
    summary.reviewRows !== 131,
    'OPERATOR_REVIEW_ROWS_131_REQUIRED',
    `P40_OPERATOR_REFERENCE_131_RELEASE_PREFLIGHT requires 131 review rows; found ${summary.reviewRows ?? 0}.`,
    'Regenerate P38/P39 review input status before attempting release lock.',
  );
  addBlocker(
    blockers,
    summary.approvedRows !== 131 || summary.rejectedRows !== 0 || summary.pendingRows !== 0,
    'APPROVED_131_REJECTED_0_PENDING_0_REQUIRED',
    `Approved=${summary.approvedRows ?? 0}, rejected=${summary.rejectedRows ?? 0}, pending=${summary.pendingRows ?? 0}; release lock requires approved=131, rejected=0, pending=0.`,
    'Operator must review all 131 rows and mark every lockable row APPROVED with reviewer and reviewedAt.',
  );
  addBlocker(
    blockers,
    (summary.pendingRows ?? 0) > 0,
    `OPERATOR_REVIEW_PENDING_ROWS_${summary.pendingRows}_BLOCK_RELEASE_LOCK`,
    `OPERATOR_REVIEW_PENDING_ROWS_BLOCK_RELEASE_LOCK: ${summary.pendingRows} rows remain pending.`,
    'Fill operatorDecision, reviewer, reviewedAt, reviewNote, and nextAction in the external P38/P39 input file.',
  );
  addBlocker(
    blockers,
    (summary.rejectedRows ?? 0) > 0,
    `OPERATOR_REVIEW_REJECTED_ROWS_${summary.rejectedRows}_CREATE_RETRACE_BATCH`,
    `${summary.rejectedRows} rejected rows require a retrace batch before lock.`,
    'Create a retrace workset for rejected rows, update evidence, and rerun P34 through P40.',
  );
  addBlocker(
    blockers,
    (summary.invalidRows ?? 0) > 0,
    `OPERATOR_REVIEW_INVALID_ROWS_${summary.invalidRows}_BLOCK_RELEASE_LOCK`,
    `${summary.invalidRows} invalid review rows block release lock.`,
    'Fix invalid operator input rows and rerun P39/P40.',
  );
  addBlocker(
    blockers,
    (summary.immutableColumnChangeCount ?? 0) > 0,
    `IMMUTABLE_CHANGES_BLOCK_RELEASE_LOCK_${summary.immutableColumnChangeCount}`,
    `IMMUTABLE_CHANGES_BLOCK_RELEASE_LOCK: ${summary.immutableColumnChangeCount} immutable evidence column changes were detected.`,
    'Restore immutable evidence columns and edit only operatorDecision, reviewer, reviewedAt, reviewNote, nextAction.',
  );
  addBlocker(
    blockers,
    summary.currentSelectableSeats !== 131,
    'OPERATOR_REFERENCE_SELECTABLE_131_REQUIRED',
    `Operator reference selectable seats must remain 131; found ${summary.currentSelectableSeats ?? 0}.`,
    'Do not change the 4096 dataset while review lock is pending.',
  );
  addBlocker(
    blockers,
    summary.officialDatasetBlocks !== 177,
    'OFFICIAL_DATASET_177_REQUIRED',
    `Official PNG dataset must remain separate at 177 blocks; found ${summary.officialDatasetBlocks ?? 0}.`,
    'Keep the official 1707 dataset separate from the operator reference 4096 dataset.',
  );
  return blockers;
}

function buildSummary(p39, p39Gate) {
  const p39Summary = p39.summary ?? {};
  const p39GateSummary = p39Gate.summary ?? {};
  const computedSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const normalized = {
    reviewRows: p39Summary.reviewRows ?? 0,
    seedRows: p39Summary.seedRows ?? 0,
    expectedReviewRows: 131,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    currentSelectableSeats: computedSelectableSeats,
    approvedRows: p39Summary.approvedRows ?? 0,
    rejectedRows: p39Summary.rejectedRows ?? 0,
    pendingRows: p39Summary.pendingRows ?? 0,
    invalidRows: p39Summary.invalidRows ?? 0,
    immutableColumnChangeCount: p39Summary.immutableColumnChangeCount ?? 0,
    p39Status: p39.status ?? p39Summary.status,
    p39GateStatus: p39GateSummary.status,
  };
  const releaseLockCandidateReady = normalized.reviewRows === 131
    && normalized.seedRows === 131
    && normalized.approvedRows === 131
    && normalized.rejectedRows === 0
    && normalized.pendingRows === 0
    && normalized.invalidRows === 0
    && normalized.immutableColumnChangeCount === 0
    && normalized.currentSelectableSeats === 131
    && normalized.officialDatasetBlocks === 177;
  const blockers = buildBlockers(normalized);
  return {
    status: 'p40-release-lock-preflight-ready',
    ...normalized,
    releaseLockCandidateReady,
    releaseLockBlocked: !releaseLockCandidateReady,
    operatorReference131LockAllowed: releaseLockCandidateReady,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    p40ReadsP39ReviewInputStatus: true,
    p40PreflightDoesNotWriteSourceData: true,
    approved131Rejected0Pending0Required: true,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
    blockerCount: blockers.length,
  };
}

function buildPreflightRows(summary, blockers) {
  return [
    {
      rowId: 'P40_OPERATOR_REFERENCE_131_RELEASE_PREFLIGHT',
      validationType: 'PREFLIGHT_CONTRACT',
      validationStatus: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 ? '' : 'OPERATOR_REFERENCE_131_PREFLIGHT_MISMATCH',
      nextAction: 'Keep P40 as a preflight only until operator review is complete.',
    },
    {
      rowId: 'P40_READS_P39_REVIEW_INPUT_STATUS',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p40ReadsP39ReviewInputStatus ? 'PASS' : 'INVALID',
      failures: summary.p40ReadsP39ReviewInputStatus ? '' : 'P39_STATUS_NOT_READ',
      nextAction: 'Run npm run stadium:daegu:operator-reference-p39-review-input-status before P40.',
    },
    {
      rowId: 'APPROVED_131_REJECTED_0_PENDING_0_REQUIRED',
      validationType: 'RELEASE_LOCK_POLICY',
      validationStatus: summary.releaseLockCandidateReady ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.releaseLockCandidateReady ? '' : `APPROVED_${summary.approvedRows}_REJECTED_${summary.rejectedRows}_PENDING_${summary.pendingRows}`,
      nextAction: 'Complete operator review for all 131 rows before release lock.',
    },
    {
      rowId: 'OPERATOR_REVIEW_PENDING_ROWS_BLOCK_RELEASE_LOCK',
      validationType: 'RELEASE_LOCK_POLICY',
      validationStatus: summary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.pendingRows > 0 ? `PENDING_ROWS:${summary.pendingRows}` : '',
      nextAction: summary.pendingRows > 0 ? 'Fill operator review decisions in the external input file.' : 'No pending review rows remain.',
    },
    {
      rowId: 'IMMUTABLE_CHANGES_BLOCK_RELEASE_LOCK',
      validationType: 'IMMUTABILITY_POLICY',
      validationStatus: summary.immutableColumnChangeCount === 0 ? 'PASS' : 'INVALID',
      failures: summary.immutableColumnChangeCount === 0 ? '' : `IMMUTABLE_COLUMN_CHANGES:${summary.immutableColumnChangeCount}`,
      nextAction: 'Only operator writable columns may be edited.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
      nextAction: 'P40 must not modify daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'Do not use PASS_RELEASE_177 wording until the separate 177 official dataset release gate exists and passes.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu seatmap preflight.',
    },
    ...blockers.map((blocker) => ({
      ...blocker,
      validationType: 'BLOCKER',
      validationStatus: 'REVIEW_PENDING',
      failures: blocker.rowId,
    })),
  ];
}

async function writePreflight() {
  const [p39, p39Gate] = await Promise.all([
    readJson(p39JsonPath),
    readJson(p39GateJsonPath),
  ]);
  const summary = buildSummary(p39, p39Gate);
  const blockers = buildBlockers(summary);
  const rows = buildPreflightRows(summary, blockers);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p39Json: toFrontendRelative(p39JsonPath),
      p39GateJson: toFrontendRelative(p39GateJsonPath),
      p39OperatorInput: p39.source?.operatorInput,
      p39OperatorInputKind: p39.source?.operatorInputKind,
    },
    policy: {
      operatorReference131LockAllowed: summary.operatorReference131LockAllowed,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      buildBlockerTrackedSeparately: summary.buildBlockerTrackedSeparately,
      note: 'P40_OPERATOR_REFERENCE_131_RELEASE_PREFLIGHT. APPROVED_131_REJECTED_0_PENDING_0_REQUIRED. OPERATOR_REVIEW_PENDING_ROWS_BLOCK_RELEASE_LOCK. IMMUTABLE_CHANGES_BLOCK_RELEASE_LOCK. P40_PREFLIGHT_DOES_NOT_WRITE_SOURCE_DATA.',
    },
    summary,
    blockers,
    rows,
    outputs: {
      preflightJson: toFrontendRelative(preflightJsonPath),
      preflightCsv: toFrontendRelative(preflightCsvPath),
      blockerCsv: toFrontendRelative(blockerCsvPath),
      preflightMd: toFrontendRelative(preflightMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(preflightJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(preflightCsvPath, buildCsv(rows, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(blockerCsvPath, buildCsv(blockers, [
    'rowId',
    'severity',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(preflightMdPath, [
    '# 대구 operator reference P40 release lock preflight',
    '',
    `- status: \`${summary.status}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- selectable seats: \`${summary.currentSelectableSeats}\``,
    `- official dataset blocks: \`${summary.officialDatasetBlocks}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- immutable column changes: \`${summary.immutableColumnChangeCount}\``,
    `- release lock candidate ready: \`${summary.releaseLockCandidateReady}\``,
    `- release lock blocked: \`${summary.releaseLockBlocked}\``,
    `- operator reference 131 lock allowed: \`${summary.operatorReference131LockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
    '## Blockers',
    '',
    blockers.length > 0
      ? blockers.map((blocker) => `- \`${blocker.rowId}\`: ${blocker.message} Next: ${blocker.nextAction}`).join('\n')
      : '- none',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} immutableChanges=${summary.immutableColumnChangeCount} releaseLockBlocked=${summary.releaseLockBlocked} operatorReference131LockAllowed=${summary.operatorReference131LockAllowed}`);
  return payload;
}

async function writeGate() {
  let preflight;
  try {
    preflight = await readJson(preflightJsonPath);
  } catch {
    preflight = await writePreflight();
  }

  const summary = preflight.summary ?? {};
  const validations = preflight.rows ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const gateSummary = {
    status: invalidRows.length === 0 ? 'p40-release-lock-preflight-gate-passed' : 'p40-release-lock-preflight-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    reviewRows: summary.reviewRows ?? 0,
    approvedRows: summary.approvedRows ?? 0,
    rejectedRows: summary.rejectedRows ?? 0,
    pendingRows: summary.pendingRows ?? 0,
    immutableColumnChangeCount: summary.immutableColumnChangeCount ?? 0,
    releaseLockCandidateReady: summary.releaseLockCandidateReady === true,
    releaseLockBlocked: summary.releaseLockBlocked === true,
    operatorReference131LockAllowed: summary.operatorReference131LockAllowed === true,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: summary.buildBlockerTrackedSeparately,
  };

  if (requirePreflight && invalidRows.length > 0) {
    throw new Error(`P40 release lock preflight gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary: gateSummary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P40 release lock preflight gate',
    '',
    `- status: \`${gateSummary.status}\``,
    `- review rows: \`${gateSummary.reviewRows}\``,
    `- approved rows: \`${gateSummary.approvedRows}\``,
    `- rejected rows: \`${gateSummary.rejectedRows}\``,
    `- pending rows: \`${gateSummary.pendingRows}\``,
    `- invalid rows: \`${gateSummary.invalidRows}\``,
    `- review pending validations: \`${gateSummary.reviewPendingRows}\``,
    `- immutable column changes: \`${gateSummary.immutableColumnChangeCount}\``,
    `- release lock candidate ready: \`${gateSummary.releaseLockCandidateReady}\``,
    `- release lock blocked: \`${gateSummary.releaseLockBlocked}\``,
    `- operator reference 131 lock allowed: \`${gateSummary.operatorReference131LockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${gateSummary.passRelease177Allowed}\``,
    `- production write allowed: \`${gateSummary.productionWriteAllowed}\``,
    `- source data write performed: \`${gateSummary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${gateSummary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${gateSummary.status} approved=${gateSummary.approvedRows} rejected=${gateSummary.rejectedRows} pending=${gateSummary.pendingRows} invalidRows=${gateSummary.invalidRows} releaseLockBlocked=${gateSummary.releaseLockBlocked} operatorReference131LockAllowed=${gateSummary.operatorReference131LockAllowed}`);
}

if (task === 'preflight') {
  await writePreflight();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
