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
const p45JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p45-real-input-guard/daegu-operator-reference-p45-real-input-guard.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p46-release-input-preflight');
const gateDir = path.join(outputDir, 'gate');
const preflightJsonPath = path.join(outputDir, 'daegu-operator-reference-p46-release-input-preflight.json');
const preflightCsvPath = path.join(outputDir, 'daegu-operator-reference-p46-release-input-preflight.csv');
const blockerCsvPath = path.join(outputDir, 'daegu-operator-reference-p46-release-input-blockers.csv');
const approvedCandidateCsvPath = path.join(outputDir, 'daegu-operator-reference-p46-approved-candidates.csv');
const inputManifestMdPath = path.join(outputDir, 'daegu-operator-reference-p46-input-manifest.md');
const preflightMdPath = path.join(outputDir, 'daegu-operator-reference-p46-release-input-preflight.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p46-release-input-preflight-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p46-release-input-preflight-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p46-release-input-preflight-gate.md');

const task = process.argv[2] ?? 'preflight';
const requirePreflight = process.argv.includes('--require-preflight');

const sourceContractLiterals = [
  'P46_RELEASE_INPUT_PREFLIGHT',
  'P45_REAL_OPERATOR_INPUT_GUARD',
  'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
  'REAL_OPERATOR_INPUT_REQUIRED',
  'APPROVED_131_REQUIRED',
  'REJECTED_0_REQUIRED',
  'PENDING_0_REQUIRED',
  'INVALID_0_REQUIRED',
  'IMMUTABLE_0_REQUIRED',
  'FIXTURE_INPUT_BLOCKED',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p46-release-input-preflight-ready',
  'p46-release-input-preflight-gate-passed',
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

function addBlocker(blockers, condition, rowId, severity, message, nextAction) {
  if (!condition) return;
  blockers.push({
    rowId,
    severity,
    message,
    nextAction,
  });
}

function normalizeSummary(p45, p42) {
  const p45Summary = p45.summary ?? {};
  const p42Summary = p42.summary ?? {};
  const reviewRows = p45Summary.reviewRows ?? p42Summary.reviewRows ?? 0;
  const approvedRows = p45Summary.approvedRows ?? p42Summary.approvedRows ?? 0;
  const rejectedRows = p45Summary.rejectedRows ?? p42Summary.rejectedRows ?? 0;
  const pendingRows = p45Summary.pendingRows ?? p42Summary.pendingRows ?? 0;
  const invalidRows = p45Summary.invalidRows ?? p42Summary.invalidRows ?? 0;
  const immutableColumnChangeCount = p45Summary.immutableColumnChangeCount ?? p42Summary.immutableColumnChangeCount ?? 0;
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const releaseCandidateAllowed = p45Summary.realOperatorInputProvided === true
    && p45Summary.defaultP41HandoffInput !== true
    && p45Summary.p44FixtureInput !== true
    && p45Summary.releaseInputAllowed === true
    && reviewRows === 131
    && approvedRows === 131
    && rejectedRows === 0
    && pendingRows === 0
    && invalidRows === 0
    && immutableColumnChangeCount === 0
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: 'p46-release-input-preflight-ready',
    reviewRows,
    expectedReviewRows: 131,
    currentSelectableSeats,
    officialDatasetBlocks,
    approvedRows,
    rejectedRows,
    pendingRows,
    invalidRows,
    immutableColumnChangeCount,
    p42Status: p42.status ?? p42Summary.status,
    p45Status: p45.status ?? p45Summary.status,
    p42ReviewInput: p45.source?.p42ReviewInput ?? p42.source?.reviewInput ?? '',
    p42ReviewInputEnv: p45.source?.p42ReviewInputEnv ?? p42.source?.reviewInputEnv ?? '',
    p45InputKind: p45.source?.p45InputKind ?? p45Summary.p45InputKind ?? '',
    p45InputSha256: p45.source?.p45InputSha256 ?? p45Summary.p45InputSha256 ?? '',
    p45InputFiles: p45.source?.p45InputFiles ?? p45Summary.p45InputFiles ?? [],
    realOperatorInputProvided: p45Summary.realOperatorInputProvided === true,
    defaultP41HandoffInput: p45Summary.defaultP41HandoffInput === true,
    p44FixtureInput: p45Summary.p44FixtureInput === true,
    p45ReleaseInputAllowed: p45Summary.releaseInputAllowed === true,
    releaseCandidateAllowed,
    releaseCandidateBlocked: !releaseCandidateAllowed,
    p47SourceApplyCandidateAllowed: releaseCandidateAllowed,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: p45Summary.buildBlockerTrackedSeparately
      ?? p42Summary.buildBlockerTrackedSeparately
      ?? 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildBlockers(summary) {
  const blockers = [];
  addBlocker(
    blockers,
    summary.realOperatorInputProvided !== true,
    'REAL_OPERATOR_INPUT_REQUIRED',
    'REVIEW_PENDING',
    'REAL_OPERATOR_INPUT_REQUIRED: P46 requires an operator-edited input accepted by P45.',
    'Set DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT to a real operator CSV or directory and rerun P42/P45/P46.',
  );
  addBlocker(
    blockers,
    summary.defaultP41HandoffInput === true,
    'DEFAULT_P41_HANDOFF_BLOCKED',
    'REVIEW_PENDING',
    'The default P41 handoff is not a release input.',
    'Continue operator review and provide edited decisions before P46 can pass.',
  );
  addBlocker(
    blockers,
    summary.p44FixtureInput === true,
    'FIXTURE_INPUT_BLOCKED',
    'INVALID',
    'FIXTURE_INPUT_BLOCKED: P44 fixture input cannot be used for release candidate preflight.',
    'Use P44 fixtures only for tests; provide real operator input for P46.',
  );
  addBlocker(
    blockers,
    !summary.p45InputSha256,
    'INPUT_SHA256_REQUIRED',
    'INVALID',
    'P46 requires the P45 input SHA-256 manifest.',
    'Run npm run stadium:daegu:operator-reference-p45-real-input-guard before P46.',
  );
  addBlocker(
    blockers,
    summary.reviewRows !== 131,
    'REVIEW_ROWS_131_REQUIRED',
    'INVALID',
    `P46 requires 131 review rows; found ${summary.reviewRows}.`,
    'Regenerate P41/P42/P45 with the full operator reference review set.',
  );
  addBlocker(
    blockers,
    summary.approvedRows !== 131,
    'APPROVED_131_REQUIRED',
    'REVIEW_PENDING',
    `APPROVED_131_REQUIRED: approved rows are ${summary.approvedRows}.`,
    'Operator must approve all 131 rows for P46 to allow release candidate status.',
  );
  addBlocker(
    blockers,
    summary.rejectedRows !== 0,
    'REJECTED_0_REQUIRED',
    'REVIEW_PENDING',
    `REJECTED_0_REQUIRED: rejected rows are ${summary.rejectedRows}.`,
    'Retrace rejected rows before attempting P46 release candidate preflight.',
  );
  addBlocker(
    blockers,
    summary.pendingRows !== 0,
    'PENDING_0_REQUIRED',
    'REVIEW_PENDING',
    `PENDING_0_REQUIRED: pending rows are ${summary.pendingRows}.`,
    'Complete operator review before attempting P46 release candidate preflight.',
  );
  addBlocker(
    blockers,
    summary.invalidRows !== 0,
    'INVALID_0_REQUIRED',
    'INVALID',
    `INVALID_0_REQUIRED: invalid rows are ${summary.invalidRows}.`,
    'Fix invalid P42/P45 intake rows before P46.',
  );
  addBlocker(
    blockers,
    summary.immutableColumnChangeCount !== 0,
    'IMMUTABLE_0_REQUIRED',
    'INVALID',
    `IMMUTABLE_0_REQUIRED: immutable column changes are ${summary.immutableColumnChangeCount}.`,
    'Restore immutable evidence columns before P46.',
  );
  addBlocker(
    blockers,
    summary.currentSelectableSeats !== 131,
    'OPERATOR_REFERENCE_SELECTABLE_131_REQUIRED',
    'INVALID',
    `Operator reference selectable seats must remain 131; found ${summary.currentSelectableSeats}.`,
    'Do not change the 4096 operator reference dataset while release input is being reviewed.',
  );
  addBlocker(
    blockers,
    summary.officialDatasetBlocks !== 177,
    'OFFICIAL_DATASET_177_REQUIRED',
    'INVALID',
    `Official PNG dataset must remain 177 blocks; found ${summary.officialDatasetBlocks}.`,
    'Keep the official 1707 PNG dataset separate from operator reference release input.',
  );
  return blockers;
}

function buildRows(summary) {
  return [
    {
      rowId: 'P46_RELEASE_INPUT_PREFLIGHT',
      validationType: 'PREFLIGHT_CONTRACT',
      validationStatus: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `ROWS_${summary.reviewRows}_SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Keep P46 as preflight only; do not write source data in this phase.',
    },
    {
      rowId: 'P45_REAL_OPERATOR_INPUT_GUARD',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p45Status ? 'PASS' : 'INVALID',
      failures: summary.p45Status ? '' : 'P45_GUARD_MISSING',
      nextAction: 'Run npm run stadium:daegu:operator-reference-p45-real-input-guard before P46.',
    },
    {
      rowId: 'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
      validationType: 'INPUT_MANIFEST',
      validationStatus: summary.p42ReviewInput ? 'PASS' : 'INVALID',
      failures: summary.p42ReviewInput ? '' : 'P42_REVIEW_INPUT_MISSING',
      nextAction: 'P46 must preserve the operator review input path.',
    },
    {
      rowId: 'INPUT_SHA256_REQUIRED',
      validationType: 'INPUT_MANIFEST',
      validationStatus: summary.p45InputSha256 ? 'PASS' : 'INVALID',
      failures: summary.p45InputSha256 ? '' : 'INPUT_SHA256_MISSING',
      nextAction: 'P46 must preserve the P45 input SHA-256.',
    },
    {
      rowId: 'REAL_OPERATOR_INPUT_REQUIRED',
      validationType: 'INPUT_ORIGIN_POLICY',
      validationStatus: summary.realOperatorInputProvided ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.realOperatorInputProvided ? '' : 'REAL_OPERATOR_INPUT_NOT_PROVIDED',
      nextAction: summary.realOperatorInputProvided ? 'Continue approval count validation.' : 'Provide real operator input before P46 can pass.',
    },
    {
      rowId: 'FIXTURE_INPUT_BLOCKED',
      validationType: 'INPUT_ORIGIN_POLICY',
      validationStatus: summary.p44FixtureInput ? 'INVALID' : 'PASS',
      failures: summary.p44FixtureInput ? 'P44_FIXTURE_INPUT' : '',
      nextAction: summary.p44FixtureInput ? 'Do not use fixtures as release input.' : 'Input is not a fixture.',
    },
    {
      rowId: 'APPROVED_131_REQUIRED',
      validationType: 'APPROVAL_POLICY',
      validationStatus: summary.approvedRows === 131 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.approvedRows === 131 ? '' : `APPROVED_ROWS:${summary.approvedRows}`,
      nextAction: 'P46 requires all 131 rows approved.',
    },
    {
      rowId: 'REJECTED_0_REQUIRED',
      validationType: 'APPROVAL_POLICY',
      validationStatus: summary.rejectedRows === 0 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.rejectedRows === 0 ? '' : `REJECTED_ROWS:${summary.rejectedRows}`,
      nextAction: 'Rejected rows must be retraced before release candidate status.',
    },
    {
      rowId: 'PENDING_0_REQUIRED',
      validationType: 'APPROVAL_POLICY',
      validationStatus: summary.pendingRows === 0 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.pendingRows === 0 ? '' : `PENDING_ROWS:${summary.pendingRows}`,
      nextAction: 'Complete operator review before release candidate status.',
    },
    {
      rowId: 'INVALID_0_REQUIRED',
      validationType: 'INTAKE_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Fix invalid intake rows.',
    },
    {
      rowId: 'IMMUTABLE_0_REQUIRED',
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
      nextAction: 'P46 must not modify daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P46 only validates operator reference 131 release input; official 177 release remains separate.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu seatmap release input preflight.',
    },
  ];
}

function mapApprovedCandidate(row) {
  return {
    queueOrder: row.queueOrder,
    reviewZone: row.reviewZone,
    reviewId: row.reviewId,
    sectionId: row.sectionId,
    block: row.block,
    name: row.name,
    reviewer: row.reviewer,
    reviewedAt: row.reviewedAt,
    reviewNote: row.reviewNote,
    p46CandidateStatus: 'APPROVED_CANDIDATE_ONLY',
    sourceWriteAllowed: false,
  };
}

async function writePreflight() {
  const [p45, p42] = await Promise.all([
    readJson(p45JsonPath),
    readJson(p42JsonPath),
  ]);
  const summary = normalizeSummary(p45, p42);
  const blockers = buildBlockers(summary);
  const rows = buildRows(summary);
  const approvedCandidates = (p42.approvedCandidates ?? []).map(mapApprovedCandidate);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p42Json: toFrontendRelative(p42JsonPath),
      p45Json: toFrontendRelative(p45JsonPath),
      p42ReviewInput: summary.p42ReviewInput,
      p42ReviewInputEnv: summary.p42ReviewInputEnv,
      p45InputKind: summary.p45InputKind,
      p45InputSha256: summary.p45InputSha256,
      p45InputFiles: summary.p45InputFiles,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      operatorReference131LockAllowed: false,
      p47SourceApplyCandidateAllowed: summary.p47SourceApplyCandidateAllowed,
      note: 'P46_RELEASE_INPUT_PREFLIGHT. P45_REAL_OPERATOR_INPUT_GUARD. REAL_OPERATOR_INPUT_REQUIRED. APPROVED_131_REQUIRED. FIXTURE_INPUT_BLOCKED. SOURCE_WRITE_FORBIDDEN.',
    },
    summary: {
      ...summary,
      blockerCount: blockers.length,
      approvedCandidateRows: approvedCandidates.length,
    },
    blockers,
    approvedCandidates,
    rows,
    outputs: {
      preflightJson: toFrontendRelative(preflightJsonPath),
      preflightCsv: toFrontendRelative(preflightCsvPath),
      blockerCsv: toFrontendRelative(blockerCsvPath),
      approvedCandidateCsv: toFrontendRelative(approvedCandidateCsvPath),
      inputManifestMd: toFrontendRelative(inputManifestMdPath),
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
    'nextAction',
  ]));
  await fs.writeFile(blockerCsvPath, buildCsv(blockers, [
    'rowId',
    'severity',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(approvedCandidateCsvPath, buildCsv(approvedCandidates, [
    'queueOrder',
    'reviewZone',
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewer',
    'reviewedAt',
    'reviewNote',
    'p46CandidateStatus',
    'sourceWriteAllowed',
  ]));
  await fs.writeFile(inputManifestMdPath, [
    '# 대구 operator reference P46 input manifest',
    '',
    `- input: \`${summary.p42ReviewInput}\``,
    `- input kind: \`${summary.p45InputKind}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- real operator input provided: \`${summary.realOperatorInputProvided}\``,
    `- default P41 handoff input: \`${summary.defaultP41HandoffInput}\``,
    `- fixture input: \`${summary.p44FixtureInput}\``,
    `- release candidate allowed: \`${summary.releaseCandidateAllowed}\``,
    '',
    '## Files',
    '',
    ...(summary.p45InputFiles.length > 0 ? summary.p45InputFiles.map((file) => `- \`${file}\``) : ['- none']),
    '',
  ].join('\n'));
  await fs.writeFile(preflightMdPath, [
    '# 대구 operator reference P46 release input preflight',
    '',
    `- status: \`${summary.status}\``,
    `- P42 review input: \`${summary.p42ReviewInput}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- real operator input provided: \`${summary.realOperatorInputProvided}\``,
    `- default P41 handoff input: \`${summary.defaultP41HandoffInput}\``,
    `- fixture input: \`${summary.p44FixtureInput}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- immutable column changes: \`${summary.immutableColumnChangeCount}\``,
    `- release candidate allowed: \`${summary.releaseCandidateAllowed}\``,
    `- release candidate blocked: \`${summary.releaseCandidateBlocked}\``,
    `- P47 source apply candidate allowed: \`${summary.p47SourceApplyCandidateAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- approved candidate rows: \`${approvedCandidates.length}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
    '## Blockers',
    '',
    blockers.length > 0
      ? blockers.map((blocker) => `- \`${blocker.rowId}\`: ${blocker.message} Next: ${blocker.nextAction}`).join('\n')
      : '- none',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} realOperatorInput=${summary.realOperatorInputProvided} fixture=${summary.p44FixtureInput} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} releaseCandidateAllowed=${summary.releaseCandidateAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
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
    status: invalidRows.length === 0 ? 'p46-release-input-preflight-gate-passed' : 'p46-release-input-preflight-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    reviewRows: preflight.summary?.reviewRows ?? 0,
    approvedRows: preflight.summary?.approvedRows ?? 0,
    rejectedRows: preflight.summary?.rejectedRows ?? 0,
    pendingRows: preflight.summary?.pendingRows ?? 0,
    immutableColumnChangeCount: preflight.summary?.immutableColumnChangeCount ?? 0,
    p45InputSha256: preflight.summary?.p45InputSha256 ?? '',
    realOperatorInputProvided: preflight.summary?.realOperatorInputProvided === true,
    defaultP41HandoffInput: preflight.summary?.defaultP41HandoffInput === true,
    p44FixtureInput: preflight.summary?.p44FixtureInput === true,
    releaseCandidateAllowed: preflight.summary?.releaseCandidateAllowed === true,
    releaseCandidateBlocked: preflight.summary?.releaseCandidateBlocked === true,
    p47SourceApplyCandidateAllowed: preflight.summary?.p47SourceApplyCandidateAllowed === true,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: preflight.summary?.buildBlockerTrackedSeparately,
  };

  if (requirePreflight && invalidRows.length > 0) {
    throw new Error(`P46 release input preflight gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
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
    '# 대구 operator reference P46 release input preflight gate',
    '',
    `- status: \`${summary.status}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending validations: \`${summary.reviewPendingRows}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- real operator input provided: \`${summary.realOperatorInputProvided}\``,
    `- default P41 handoff input: \`${summary.defaultP41HandoffInput}\``,
    `- fixture input: \`${summary.p44FixtureInput}\``,
    `- release candidate allowed: \`${summary.releaseCandidateAllowed}\``,
    `- P47 source apply candidate allowed: \`${summary.p47SourceApplyCandidateAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} realOperatorInput=${summary.realOperatorInputProvided} fixture=${summary.p44FixtureInput} approved=${summary.approvedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} releaseCandidateAllowed=${summary.releaseCandidateAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'preflight') {
  await writePreflight();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
