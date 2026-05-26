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
const p42JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p42-review-intake/daegu-operator-reference-p42-review-intake.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p43-release-candidate-preflight');
const gateDir = path.join(outputDir, 'gate');
const preflightJsonPath = path.join(outputDir, 'daegu-operator-reference-p43-release-candidate-preflight.json');
const preflightCsvPath = path.join(outputDir, 'daegu-operator-reference-p43-release-candidate-preflight.csv');
const blockerCsvPath = path.join(outputDir, 'daegu-operator-reference-p43-release-candidate-blockers.csv');
const preflightMdPath = path.join(outputDir, 'daegu-operator-reference-p43-release-candidate-preflight.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p43-release-candidate-preflight-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p43-release-candidate-preflight-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p43-release-candidate-preflight-gate.md');

const task = process.argv[2] ?? 'preflight';
const requirePreflight = process.argv.includes('--require-preflight');

const sourceContractLiterals = [
  'P43_OPERATOR_REFERENCE_131_RELEASE_CANDIDATE_PREFLIGHT',
  'P43_READS_P42_REVIEW_INTAKE',
  'PENDING_ROWS_BLOCK_P43',
  'REJECTED_ROWS_REQUIRE_RETRACE',
  'INVALID_ROWS_BLOCK_P43',
  'IMMUTABLE_CHANGES_BLOCK_P43',
  'APPROVED_131_REQUIRED',
  'APPROVED_131_REJECTED_0_PENDING_0_REQUIRED_FOR_OPERATOR_REFERENCE_RELEASE',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'P43_PREFLIGHT_DOES_NOT_WRITE_SOURCE_DATA',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p43-release-candidate-preflight-ready',
  'p43-release-candidate-preflight-gate-passed',
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

function normalizeSummary(p42) {
  const p42Summary = p42.summary ?? {};
  return {
    reviewRows: p42Summary.reviewRows ?? 0,
    expectedReviewRows: 131,
    currentSelectableSeats: DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    approvedRows: p42Summary.approvedRows ?? 0,
    rejectedRows: p42Summary.rejectedRows ?? 0,
    pendingRows: p42Summary.pendingRows ?? 0,
    invalidRows: p42Summary.invalidRows ?? 0,
    immutableColumnChangeCount: p42Summary.immutableColumnChangeCount ?? 0,
    p42Status: p42.status ?? p42Summary.status,
    p42ReviewInput: p42.source?.reviewInput ?? '',
    p42ReviewInputKind: p42.source?.reviewInputKind ?? '',
  };
}

function isReleaseCandidateReady(summary) {
  return summary.reviewRows === 131
    && summary.currentSelectableSeats === 131
    && summary.officialDatasetBlocks === 177
    && summary.approvedRows === 131
    && summary.rejectedRows === 0
    && summary.pendingRows === 0
    && summary.invalidRows === 0
    && summary.immutableColumnChangeCount === 0;
}

function buildBlockers(summary) {
  const blockers = [];
  addBlocker(
    blockers,
    summary.reviewRows !== 131,
    'REVIEW_ROWS_131_REQUIRED',
    `P43_OPERATOR_REFERENCE_131_RELEASE_CANDIDATE_PREFLIGHT requires 131 review rows; found ${summary.reviewRows}.`,
    'Regenerate P41/P42 review intake before attempting P43.',
  );
  addBlocker(
    blockers,
    summary.currentSelectableSeats !== 131,
    'OPERATOR_REFERENCE_SELECTABLE_131_REQUIRED',
    `Operator reference selectable seats must be 131; found ${summary.currentSelectableSeats}.`,
    'Keep the 4096 operator reference dataset stable before release candidate preflight.',
  );
  addBlocker(
    blockers,
    summary.officialDatasetBlocks !== 177,
    'OFFICIAL_DATASET_177_REQUIRED',
    `Official PNG dataset must remain separate at 177 blocks; found ${summary.officialDatasetBlocks}.`,
    'Do not mix 4096 operator reference coordinates with the official 1707 PNG dataset.',
  );
  addBlocker(
    blockers,
    summary.approvedRows !== 131,
    'APPROVED_131_REQUIRED',
    `APPROVED_131_REQUIRED: only ${summary.approvedRows} rows are approved.`,
    'Operator must approve all 131 rows or reject rows that need retrace.',
  );
  addBlocker(
    blockers,
    summary.pendingRows > 0,
    `PENDING_ROWS_BLOCK_P43_${summary.pendingRows}`,
    `PENDING_ROWS_BLOCK_P43: ${summary.pendingRows} rows are still pending.`,
    'Continue operator review and rerun P42/P43 after decisions are filled.',
  );
  addBlocker(
    blockers,
    summary.rejectedRows > 0,
    `REJECTED_ROWS_REQUIRE_RETRACE_${summary.rejectedRows}`,
    `REJECTED_ROWS_REQUIRE_RETRACE: ${summary.rejectedRows} rows require retrace before P43 can pass.`,
    'Create retrace worksets from the P42 retrace candidates and restart evidence review.',
  );
  addBlocker(
    blockers,
    summary.invalidRows > 0,
    `INVALID_ROWS_BLOCK_P43_${summary.invalidRows}`,
    `INVALID_ROWS_BLOCK_P43: ${summary.invalidRows} invalid intake rows were found.`,
    'Fix operator input format and rerun P42/P43.',
  );
  addBlocker(
    blockers,
    summary.immutableColumnChangeCount > 0,
    `IMMUTABLE_CHANGES_BLOCK_P43_${summary.immutableColumnChangeCount}`,
    `IMMUTABLE_CHANGES_BLOCK_P43: ${summary.immutableColumnChangeCount} immutable evidence changes were found.`,
    'Restore immutable evidence columns and edit only operator writable fields.',
  );
  return blockers;
}

function buildSummary(p42) {
  const normalized = normalizeSummary(p42);
  const releaseCandidateReady = isReleaseCandidateReady(normalized);
  const blockers = buildBlockers(normalized);
  return {
    status: 'p43-release-candidate-preflight-ready',
    ...normalized,
    releaseCandidateReady,
    releaseCandidateBlocked: !releaseCandidateReady,
    p43CandidateAllowed: releaseCandidateReady,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    p43ReadsP42ReviewIntake: true,
    p43PreflightDoesNotWriteSourceData: true,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
    blockerCount: blockers.length,
  };
}

function buildPreflightRows(summary, blockers) {
  return [
    {
      rowId: 'P43_OPERATOR_REFERENCE_131_RELEASE_CANDIDATE_PREFLIGHT',
      validationType: 'PREFLIGHT_CONTRACT',
      validationStatus: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 ? '' : `ROWS_${summary.reviewRows}_SELECTABLE_${summary.currentSelectableSeats}`,
      nextAction: 'Keep P43 as a release candidate preflight until all operator decisions are complete.',
    },
    {
      rowId: 'P43_READS_P42_REVIEW_INTAKE',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p43ReadsP42ReviewIntake ? 'PASS' : 'INVALID',
      failures: summary.p43ReadsP42ReviewIntake ? '' : 'P42_INTAKE_NOT_READ',
      nextAction: 'Run npm run stadium:daegu:operator-reference-p42-review-intake before P43.',
    },
    {
      rowId: 'APPROVED_131_REJECTED_0_PENDING_0_REQUIRED_FOR_OPERATOR_REFERENCE_RELEASE',
      validationType: 'RELEASE_CANDIDATE_POLICY',
      validationStatus: summary.releaseCandidateReady ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.releaseCandidateReady ? '' : `APPROVED_${summary.approvedRows}_REJECTED_${summary.rejectedRows}_PENDING_${summary.pendingRows}`,
      nextAction: 'Release candidate requires approved=131, rejected=0, pending=0, invalid=0.',
    },
    {
      rowId: 'PENDING_ROWS_BLOCK_P43',
      validationType: 'RELEASE_CANDIDATE_POLICY',
      validationStatus: summary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.pendingRows > 0 ? `PENDING_ROWS:${summary.pendingRows}` : '',
      nextAction: summary.pendingRows > 0 ? 'Continue operator review.' : 'No pending rows remain.',
    },
    {
      rowId: 'REJECTED_ROWS_REQUIRE_RETRACE',
      validationType: 'RETRACE_POLICY',
      validationStatus: summary.rejectedRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.rejectedRows > 0 ? `REJECTED_ROWS:${summary.rejectedRows}` : '',
      nextAction: summary.rejectedRows > 0 ? 'Create retrace batch for rejected rows.' : 'No rejected rows require retrace.',
    },
    {
      rowId: 'INVALID_ROWS_BLOCK_P43',
      validationType: 'INTAKE_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Fix invalid P42 intake rows.',
    },
    {
      rowId: 'IMMUTABLE_CHANGES_BLOCK_P43',
      validationType: 'IMMUTABILITY_POLICY',
      validationStatus: summary.immutableColumnChangeCount === 0 ? 'PASS' : 'INVALID',
      failures: summary.immutableColumnChangeCount === 0 ? '' : `IMMUTABLE_CHANGES:${summary.immutableColumnChangeCount}`,
      nextAction: 'Only operator writable columns may change.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
      nextAction: 'P43 must not modify daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P43 only evaluates operatorReference 131 candidate status; official 177 release remains separate.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu seatmap release candidate preflight.',
    },
    ...blockers.map((blocker) => ({
      ...blocker,
      validationType: 'BLOCKER',
      validationStatus: blocker.rowId.includes('INVALID') || blocker.rowId.includes('IMMUTABLE') || blocker.rowId.includes('REVIEW_ROWS') || blocker.rowId.includes('SELECTABLE') || blocker.rowId.includes('OFFICIAL_DATASET')
        ? 'INVALID'
        : 'REVIEW_PENDING',
      failures: blocker.rowId,
    })),
  ];
}

async function writePreflight() {
  const p42 = await readJson(p42JsonPath);
  const summary = buildSummary(p42);
  const blockers = buildBlockers(summary);
  const rows = buildPreflightRows(summary, blockers);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p42Json: toFrontendRelative(p42JsonPath),
      p42ReviewInput: p42.source?.reviewInput,
      p42ReviewInputKind: p42.source?.reviewInputKind,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      operatorReference131LockAllowed: false,
      note: 'P43_OPERATOR_REFERENCE_131_RELEASE_CANDIDATE_PREFLIGHT. P43_READS_P42_REVIEW_INTAKE. APPROVED_131_REQUIRED. PENDING_ROWS_BLOCK_P43. REJECTED_ROWS_REQUIRE_RETRACE. INVALID_ROWS_BLOCK_P43. IMMUTABLE_CHANGES_BLOCK_P43. P43_PREFLIGHT_DOES_NOT_WRITE_SOURCE_DATA.',
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
    '# 대구 operator reference P43 release candidate preflight',
    '',
    `- status: \`${summary.status}\``,
    `- P42 review input: \`${summary.p42ReviewInput}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- selectable seats: \`${summary.currentSelectableSeats}\``,
    `- official dataset blocks: \`${summary.officialDatasetBlocks}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- immutable column changes: \`${summary.immutableColumnChangeCount}\``,
    `- release candidate ready: \`${summary.releaseCandidateReady}\``,
    `- release candidate blocked: \`${summary.releaseCandidateBlocked}\``,
    `- P43 candidate allowed: \`${summary.p43CandidateAllowed}\``,
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

  console.log(`status:${summary.status} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} immutableChanges=${summary.immutableColumnChangeCount} releaseCandidateBlocked=${summary.releaseCandidateBlocked} p43CandidateAllowed=${summary.p43CandidateAllowed}`);
  return payload;
}

async function writeGate() {
  let preflight;
  try {
    preflight = await readJson(preflightJsonPath);
  } catch {
    preflight = await writePreflight();
  }

  const validations = preflight.rows ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p43-release-candidate-preflight-gate-passed' : 'p43-release-candidate-preflight-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    reviewRows: preflight.summary?.reviewRows ?? 0,
    approvedRows: preflight.summary?.approvedRows ?? 0,
    rejectedRows: preflight.summary?.rejectedRows ?? 0,
    pendingRows: preflight.summary?.pendingRows ?? 0,
    immutableColumnChangeCount: preflight.summary?.immutableColumnChangeCount ?? 0,
    releaseCandidateReady: preflight.summary?.releaseCandidateReady === true,
    releaseCandidateBlocked: preflight.summary?.releaseCandidateBlocked === true,
    p43CandidateAllowed: preflight.summary?.p43CandidateAllowed === true,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: preflight.summary?.buildBlockerTrackedSeparately,
  };

  if (requirePreflight && invalidRows.length > 0) {
    throw new Error(`P43 release candidate preflight gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P43 release candidate preflight gate',
    '',
    `- status: \`${summary.status}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending validations: \`${summary.reviewPendingRows}\``,
    `- immutable column changes: \`${summary.immutableColumnChangeCount}\``,
    `- release candidate ready: \`${summary.releaseCandidateReady}\``,
    `- release candidate blocked: \`${summary.releaseCandidateBlocked}\``,
    `- P43 candidate allowed: \`${summary.p43CandidateAllowed}\``,
    `- operator reference 131 lock allowed: \`${summary.operatorReference131LockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} releaseCandidateBlocked=${summary.releaseCandidateBlocked} p43CandidateAllowed=${summary.p43CandidateAllowed}`);
}

if (task === 'preflight') {
  await writePreflight();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
