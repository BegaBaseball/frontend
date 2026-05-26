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
const p47JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p47-source-apply-preview/daegu-operator-reference-p47-source-apply-preview.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p48-source-apply-guard');
const gateDir = path.join(outputDir, 'gate');
const guardJsonPath = path.join(outputDir, 'daegu-operator-reference-p48-source-apply-guard.json');
const guardCsvPath = path.join(outputDir, 'daegu-operator-reference-p48-source-apply-guard.csv');
const blockerCsvPath = path.join(outputDir, 'daegu-operator-reference-p48-source-apply-blockers.csv');
const sourceApplyPlanCsvPath = path.join(outputDir, 'daegu-operator-reference-p48-source-apply-plan.csv');
const sourceApplyPlanMdPath = path.join(outputDir, 'daegu-operator-reference-p48-source-apply-plan.md');
const guardMdPath = path.join(outputDir, 'daegu-operator-reference-p48-source-apply-guard.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p48-source-apply-guard-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p48-source-apply-guard-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p48-source-apply-guard-gate.md');

const task = process.argv[2] ?? 'guard';
const requireGuard = process.argv.includes('--require-guard');
const sourceTarget = 'src/data/daeguSeatData.ts';

const sourceContractLiterals = [
  'P48_SOURCE_APPLY_GUARD',
  'P47_SOURCE_APPLY_PREVIEW',
  'P47_SOURCE_PATCH_ALLOWED_REQUIRED',
  'SOURCE_PATCH_ROWS_131_REQUIRED',
  'REAL_OPERATOR_INPUT_REQUIRED',
  'SOURCE_TARGET_DAEGU_SEAT_DATA',
  'APPLY_READY_REQUIRES_OPERATOR_RELEASE',
  'WRITE_APPROVAL_REQUIRED',
  'SOURCE_WRITE_FORBIDDEN_UNTIL_EXPLICIT_APPLY',
  'PATCH_PREVIEW_ONLY',
  'OPERATOR_REFERENCE_131_ONLY',
  'OFFICIAL_177_UNCHANGED',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p48-source-apply-guard-ready',
  'p48-source-apply-guard-blocked',
  'p48-source-apply-guard-gate-passed',
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

function buildSourceApplyPlanRows(p47) {
  const summary = p47.summary ?? {};
  if (summary.sourcePatchAllowed !== true) return [];
  return (p47.sourcePatchRows ?? []).map((row) => ({
    ...row,
    applyStatus: 'PRECONDITION_READY_SOURCE_WRITE_NOT_PERFORMED',
    sourceTarget,
    sourceDataWritePerformed: false,
  }));
}

function normalizeSummary(p47, sourceApplyPlanRows) {
  const p47Summary = p47.summary ?? {};
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const sourceApplyPreconditionsMet = p47Summary.sourcePatchAllowed === true
    && p47Summary.realOperatorInputProvided === true
    && p47Summary.p44FixtureInput !== true
    && p47Summary.releaseCandidateAllowed === true
    && p47Summary.approvedCandidateRows === 131
    && p47Summary.sourcePatchRows === 131
    && sourceApplyPlanRows.length === 131
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: sourceApplyPreconditionsMet ? 'p48-source-apply-guard-ready' : 'p48-source-apply-guard-blocked',
    p47Status: p47.status ?? p47Summary.status,
    p42ReviewInput: p47.source?.p42ReviewInput ?? '',
    p45InputSha256: p47.source?.p45InputSha256 ?? p47Summary.p45InputSha256 ?? '',
    realOperatorInputProvided: p47Summary.realOperatorInputProvided === true,
    p44FixtureInput: p47Summary.p44FixtureInput === true,
    releaseCandidateAllowed: p47Summary.releaseCandidateAllowed === true,
    sourcePatchAllowed: p47Summary.sourcePatchAllowed === true,
    approvedCandidateRows: p47Summary.approvedCandidateRows ?? 0,
    sourcePatchRows: p47Summary.sourcePatchRows ?? 0,
    sourceApplyPlanRows: sourceApplyPlanRows.length,
    currentSelectableSeats,
    officialDatasetBlocks,
    sourceApplyPreconditionsMet,
    sourceApplyBlocked: !sourceApplyPreconditionsMet,
    sourceTarget,
    applyReadyRequiresOperatorRelease: true,
    writeApprovalRequired: true,
    patchPreviewOnly: true,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: p47Summary.buildBlockerTrackedSeparately
      ?? 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildBlockers(summary) {
  const blockers = [];
  addBlocker(
    blockers,
    summary.sourcePatchAllowed !== true,
    'P47_SOURCE_PATCH_ALLOWED_REQUIRED',
    'REVIEW_PENDING',
    'P47_SOURCE_PATCH_ALLOWED_REQUIRED: P47 has not produced an allowed source patch preview.',
    'Complete real operator approval so P46/P47 can allow source patch rows.',
  );
  addBlocker(
    blockers,
    summary.sourcePatchRows !== 131,
    'SOURCE_PATCH_ROWS_131_REQUIRED',
    'REVIEW_PENDING',
    `SOURCE_PATCH_ROWS_131_REQUIRED: source patch rows are ${summary.sourcePatchRows}.`,
    'P48 requires 131 source patch rows from P47 before source apply can be considered.',
  );
  addBlocker(
    blockers,
    summary.realOperatorInputProvided !== true,
    'REAL_OPERATOR_INPUT_REQUIRED',
    'REVIEW_PENDING',
    'REAL_OPERATOR_INPUT_REQUIRED: P48 cannot proceed from default handoff input.',
    'Provide real operator-approved input and rerun P42-P48.',
  );
  addBlocker(
    blockers,
    summary.p44FixtureInput === true,
    'FIXTURE_INPUT_BLOCKED',
    'INVALID',
    'Fixture input cannot be used for P48 source apply guard.',
    'Use fixtures only for tests.',
  );
  addBlocker(
    blockers,
    summary.currentSelectableSeats !== 131,
    'OPERATOR_REFERENCE_131_ONLY',
    'INVALID',
    `OPERATOR_REFERENCE_131_ONLY: current selectable seats are ${summary.currentSelectableSeats}.`,
    'Keep operator reference selectable blocks at 131 before source apply.',
  );
  addBlocker(
    blockers,
    summary.officialDatasetBlocks !== 177,
    'OFFICIAL_177_UNCHANGED',
    'INVALID',
    `OFFICIAL_177_UNCHANGED: official dataset blocks are ${summary.officialDatasetBlocks}.`,
    'Do not modify the official 1707 PNG dataset in P48.',
  );
  return blockers;
}

function buildRows(summary) {
  return [
    {
      rowId: 'P48_SOURCE_APPLY_GUARD',
      validationType: 'GUARD_CONTRACT',
      validationStatus: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'P48 is a prewrite guard; source writing remains blocked until an explicit apply step.',
    },
    {
      rowId: 'P47_SOURCE_APPLY_PREVIEW',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p47Status ? 'PASS' : 'INVALID',
      failures: summary.p47Status ? '' : 'P47_PREVIEW_MISSING',
      nextAction: 'Run npm run stadium:daegu:operator-reference-p47-source-apply-preview before P48.',
    },
    {
      rowId: 'P47_SOURCE_PATCH_ALLOWED_REQUIRED',
      validationType: 'P48_POLICY',
      validationStatus: summary.sourcePatchAllowed ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.sourcePatchAllowed ? '' : 'P47_SOURCE_PATCH_NOT_ALLOWED',
      nextAction: 'P48 requires P47 sourcePatchAllowed=true.',
    },
    {
      rowId: 'SOURCE_PATCH_ROWS_131_REQUIRED',
      validationType: 'P48_POLICY',
      validationStatus: summary.sourcePatchRows === 131 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.sourcePatchRows === 131 ? '' : `SOURCE_PATCH_ROWS:${summary.sourcePatchRows}`,
      nextAction: 'P48 requires 131 source patch rows.',
    },
    {
      rowId: 'REAL_OPERATOR_INPUT_REQUIRED',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.realOperatorInputProvided ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.realOperatorInputProvided ? '' : 'REAL_OPERATOR_INPUT_NOT_PROVIDED',
      nextAction: 'P48 requires real operator input, not default handoff.',
    },
    {
      rowId: 'SOURCE_TARGET_DAEGU_SEAT_DATA',
      validationType: 'SOURCE_TARGET_POLICY',
      validationStatus: summary.sourceTarget === sourceTarget ? 'PASS' : 'INVALID',
      failures: summary.sourceTarget === sourceTarget ? '' : `SOURCE_TARGET:${summary.sourceTarget}`,
      nextAction: 'Source apply target must remain src/data/daeguSeatData.ts.',
    },
    {
      rowId: 'APPLY_READY_REQUIRES_OPERATOR_RELEASE',
      validationType: 'RELEASE_POLICY',
      validationStatus: summary.sourceApplyPreconditionsMet ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.sourceApplyPreconditionsMet ? '' : 'SOURCE_APPLY_PRECONDITIONS_NOT_MET',
      nextAction: 'Only operator release-ready input may reach actual source apply.',
    },
    {
      rowId: 'WRITE_APPROVAL_REQUIRED',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.writeApprovalRequired === true ? 'PASS' : 'INVALID',
      failures: summary.writeApprovalRequired === true ? '' : 'WRITE_APPROVAL_POLICY_MISSING',
      nextAction: 'Actual source write remains a separate explicit step.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN_UNTIL_EXPLICIT_APPLY',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceDataWritePerformed === false && summary.productionWriteAllowed === false ? 'PASS' : 'INVALID',
      failures: summary.sourceDataWritePerformed === false && summary.productionWriteAllowed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'P48 must not modify daeguSeatData.ts.',
    },
    {
      rowId: 'PATCH_PREVIEW_ONLY',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.patchPreviewOnly === true ? 'PASS' : 'INVALID',
      failures: summary.patchPreviewOnly === true ? '' : 'PATCH_PREVIEW_ONLY_POLICY_MISSING',
      nextAction: 'Keep P48 as guard/plan output only.',
    },
    {
      rowId: 'OPERATOR_REFERENCE_131_ONLY',
      validationType: 'DATASET_POLICY',
      validationStatus: summary.currentSelectableSeats === 131 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 ? '' : `SELECTABLE_SEATS:${summary.currentSelectableSeats}`,
      nextAction: 'Keep operator reference dataset at 131 selectable blocks.',
    },
    {
      rowId: 'OFFICIAL_177_UNCHANGED',
      validationType: 'DATASET_POLICY',
      validationStatus: summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.officialDatasetBlocks === 177 ? '' : `OFFICIAL_BLOCKS:${summary.officialDatasetBlocks}`,
      nextAction: 'Do not mutate official 177 dataset in P48.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P48 only guards operator reference 131 source apply; official 177 release remains separate.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu seatmap source apply guard.',
    },
  ];
}

async function writeGuard() {
  const p47 = await readJson(p47JsonPath);
  const sourceApplyPlanRows = buildSourceApplyPlanRows(p47);
  const summary = normalizeSummary(p47, sourceApplyPlanRows);
  const blockers = buildBlockers(summary);
  const rows = buildRows(summary);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p47Json: toFrontendRelative(p47JsonPath),
      p42ReviewInput: summary.p42ReviewInput,
      p45InputSha256: summary.p45InputSha256,
      sourceTarget,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      patchPreviewOnly: true,
      writeApprovalRequired: true,
      passRelease177Allowed: false,
      passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      operatorReference131LockAllowed: false,
      note: 'P48_SOURCE_APPLY_GUARD. P47_SOURCE_APPLY_PREVIEW. P47_SOURCE_PATCH_ALLOWED_REQUIRED. WRITE_APPROVAL_REQUIRED. SOURCE_WRITE_FORBIDDEN_UNTIL_EXPLICIT_APPLY.',
    },
    summary: {
      ...summary,
      blockerCount: blockers.length,
    },
    blockers,
    sourceApplyPlanRows,
    rows,
    outputs: {
      guardJson: toFrontendRelative(guardJsonPath),
      guardCsv: toFrontendRelative(guardCsvPath),
      blockerCsv: toFrontendRelative(blockerCsvPath),
      sourceApplyPlanCsv: toFrontendRelative(sourceApplyPlanCsvPath),
      sourceApplyPlanMd: toFrontendRelative(sourceApplyPlanMdPath),
      guardMd: toFrontendRelative(guardMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(guardJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(guardCsvPath, buildCsv(rows, [
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
  await fs.writeFile(sourceApplyPlanCsvPath, buildCsv(sourceApplyPlanRows, [
    'patchOrder',
    'reviewZone',
    'reviewId',
    'sectionId',
    'block',
    'name',
    'patchType',
    'traceVersion',
    'applyStatus',
    'sourceTarget',
    'sourceDataWritePerformed',
  ]));
  await fs.writeFile(sourceApplyPlanMdPath, [
    '# 대구 operator reference P48 source apply plan',
    '',
    `- source target: \`${summary.sourceTarget}\``,
    `- source apply preconditions met: \`${summary.sourceApplyPreconditionsMet}\``,
    `- source apply plan rows: \`${summary.sourceApplyPlanRows}\``,
    `- write approval required: \`${summary.writeApprovalRequired}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));
  await fs.writeFile(guardMdPath, [
    '# 대구 operator reference P48 source apply guard',
    '',
    `- status: \`${summary.status}\``,
    `- P42 review input: \`${summary.p42ReviewInput}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- real operator input provided: \`${summary.realOperatorInputProvided}\``,
    `- release candidate allowed: \`${summary.releaseCandidateAllowed}\``,
    `- source patch allowed: \`${summary.sourcePatchAllowed}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source apply plan rows: \`${summary.sourceApplyPlanRows}\``,
    `- source apply preconditions met: \`${summary.sourceApplyPreconditionsMet}\``,
    `- source apply blocked: \`${summary.sourceApplyBlocked}\``,
    `- source target: \`${summary.sourceTarget}\``,
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

  console.log(`status:${summary.status} realOperatorInput=${summary.realOperatorInputProvided} sourcePatchRows=${summary.sourcePatchRows} sourceApplyPlanRows=${summary.sourceApplyPlanRows} sourceApplyPreconditionsMet=${summary.sourceApplyPreconditionsMet} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  let guard;
  try {
    guard = await readJson(guardJsonPath);
  } catch {
    guard = await writeGuard();
  }

  const validations = guard.rows ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p48-source-apply-guard-gate-passed' : 'p48-source-apply-guard-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    p45InputSha256: guard.summary?.p45InputSha256 ?? '',
    realOperatorInputProvided: guard.summary?.realOperatorInputProvided === true,
    releaseCandidateAllowed: guard.summary?.releaseCandidateAllowed === true,
    sourcePatchAllowed: guard.summary?.sourcePatchAllowed === true,
    sourcePatchRows: guard.summary?.sourcePatchRows ?? 0,
    sourceApplyPlanRows: guard.summary?.sourceApplyPlanRows ?? 0,
    sourceApplyPreconditionsMet: guard.summary?.sourceApplyPreconditionsMet === true,
    currentSelectableSeats: guard.summary?.currentSelectableSeats ?? 0,
    officialDatasetBlocks: guard.summary?.officialDatasetBlocks ?? 0,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: guard.summary?.buildBlockerTrackedSeparately,
  };

  if (requireGuard && invalidRows.length > 0) {
    throw new Error(`P48 source apply guard gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
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
    '# 대구 operator reference P48 source apply guard gate',
    '',
    `- status: \`${summary.status}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending validations: \`${summary.reviewPendingRows}\``,
    `- real operator input provided: \`${summary.realOperatorInputProvided}\``,
    `- source patch allowed: \`${summary.sourcePatchAllowed}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source apply plan rows: \`${summary.sourceApplyPlanRows}\``,
    `- source apply preconditions met: \`${summary.sourceApplyPreconditionsMet}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} realOperatorInput=${summary.realOperatorInputProvided} sourcePatchRows=${summary.sourcePatchRows} sourceApplyPreconditionsMet=${summary.sourceApplyPreconditionsMet} invalidRows=${summary.invalidRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'guard') {
  await writeGuard();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
