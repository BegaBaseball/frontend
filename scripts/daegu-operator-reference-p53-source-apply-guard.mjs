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
const p52JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p52-source-patch-preview/daegu-operator-reference-p52-source-patch-preview.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p53-source-apply-guard');
const gateDir = path.join(outputDir, 'gate');
const guardJsonPath = path.join(outputDir, 'daegu-operator-reference-p53-source-apply-guard.json');
const guardCsvPath = path.join(outputDir, 'daegu-operator-reference-p53-source-apply-guard.csv');
const blockerCsvPath = path.join(outputDir, 'daegu-operator-reference-p53-source-apply-blockers.csv');
const sourceApplyPlanCsvPath = path.join(outputDir, 'daegu-operator-reference-p53-source-apply-plan.csv');
const sourceApplyPlanMdPath = path.join(outputDir, 'daegu-operator-reference-p53-source-apply-plan.md');
const guardMdPath = path.join(outputDir, 'daegu-operator-reference-p53-source-apply-guard.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p53-source-apply-guard-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p53-source-apply-guard-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p53-source-apply-guard-gate.md');

const task = process.argv[2] ?? 'guard';
const requireGuard = process.argv.includes('--require-guard');
const sourceTarget = 'src/data/daeguSeatData.ts';

const sourceContractLiterals = [
  'P53_SOURCE_APPLY_GUARD',
  'P52_SOURCE_PATCH_PREVIEW_SOURCE',
  'SOURCE_PATCH_ROWS_REQUIRED',
  'PENDING_ROWS_BLOCK_SOURCE_APPLY',
  'SOURCE_PATCH_ALLOWED_REQUIRED',
  'APPROVED_ROWS_MATCH_PATCH_ROWS_REQUIRED',
  'REJECTED_ROWS_REQUIRE_RETRACE',
  'INVALID_ROWS_BLOCK_SOURCE_APPLY',
  'EXPLICIT_APPLY_STEP_REQUIRED',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceApplyAllowed=false',
  'sourceDataWritePerformed: false',
  'p53-source-apply-guard-ready',
  'p53-source-apply-guard-blocked',
  'p53-source-apply-guard-gate-passed',
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

function buildSourceApplyPlanRows(p52) {
  const summary = p52.summary ?? {};
  if (summary.sourcePatchAllowed !== true || (p52.sourcePatchRows ?? []).length === 0) return [];
  return (p52.sourcePatchRows ?? []).map((row) => ({
    ...row,
    applyStatus: 'PRECONDITION_READY_SOURCE_WRITE_NOT_PERFORMED',
    sourceTarget,
    sourceApplyAllowed: false,
    sourceDataWritePerformed: false,
  }));
}

function normalizeSummary(p52, sourceApplyPlanRows) {
  const p52Summary = p52.summary ?? {};
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const sourcePatchRows = p52Summary.sourcePatchRows ?? 0;
  const approvedRows = p52Summary.approvedRows ?? 0;
  const pendingRows = p52Summary.pendingRows ?? 0;
  const rejectedRows = p52Summary.rejectedRows ?? 0;
  const invalidRows = p52Summary.invalidRows ?? 0;
  const sourcePatchAllowed = p52Summary.sourcePatchAllowed === true;
  const sourceApplyPreconditionsMet = sourcePatchRows > 0
    && approvedRows === sourcePatchRows
    && pendingRows === 0
    && rejectedRows === 0
    && invalidRows === 0
    && sourcePatchAllowed
    && sourceApplyPlanRows.length === sourcePatchRows
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: sourceApplyPreconditionsMet ? 'p53-source-apply-guard-ready' : 'p53-source-apply-guard-blocked',
    p52Status: p52.status ?? p52Summary.status,
    p51RealInputCsv: p52.source?.p51RealInputCsv ?? p52Summary.p51RealInputCsv ?? '',
    p51RealInputSha256: p52.source?.p51RealInputSha256 ?? p52Summary.p51RealInputSha256 ?? '',
    reviewRows: p52Summary.reviewRows ?? 0,
    approvedRows,
    rejectedRows,
    pendingRows,
    invalidRows,
    blockedRows: p52Summary.blockedRows ?? 0,
    sourcePatchRows,
    sourceApplyPlanRows: sourceApplyPlanRows.length,
    currentSelectableSeats,
    officialDatasetBlocks,
    sourcePatchAllowed,
    sourcePatchBlocked: p52Summary.sourcePatchBlocked === true,
    approvedRowsMatchPatchRows: approvedRows === sourcePatchRows,
    sourceApplyPreconditionsMet,
    sourceApplyBlocked: true,
    sourceApplyAllowed: false,
    explicitApplyStepRequired: true,
    sourceTarget,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: p52Summary.buildBlockerTrackedSeparately
      ?? 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildBlockers(summary) {
  const blockers = [];
  addBlocker(
    blockers,
    summary.sourcePatchRows === 0,
    'SOURCE_PATCH_ROWS_REQUIRED',
    'REVIEW_PENDING',
    'SOURCE_PATCH_ROWS_REQUIRED: P53 needs at least one approved source patch row from P52.',
    'Complete operator approval in P51, rerun P52, then rerun P53.',
  );
  addBlocker(
    blockers,
    summary.pendingRows > 0,
    'PENDING_ROWS_BLOCK_SOURCE_APPLY',
    'REVIEW_PENDING',
    `PENDING_ROWS_BLOCK_SOURCE_APPLY: ${summary.pendingRows} rows are still pending.`,
    'Complete all operator review rows before source apply can be considered.',
  );
  addBlocker(
    blockers,
    summary.sourcePatchAllowed !== true,
    'SOURCE_PATCH_ALLOWED_REQUIRED',
    'REVIEW_PENDING',
    'SOURCE_PATCH_ALLOWED_REQUIRED: P52 did not allow source patch preview.',
    'Only P52 sourcePatchAllowed=true can feed a source apply guard.',
  );
  addBlocker(
    blockers,
    summary.approvedRowsMatchPatchRows !== true,
    'APPROVED_ROWS_MATCH_PATCH_ROWS_REQUIRED',
    'INVALID',
    `APPROVED_ROWS_MATCH_PATCH_ROWS_REQUIRED: approved=${summary.approvedRows}, patch=${summary.sourcePatchRows}.`,
    'Regenerate P52 so approved rows and patch rows match exactly.',
  );
  addBlocker(
    blockers,
    summary.rejectedRows > 0,
    'REJECTED_ROWS_REQUIRE_RETRACE',
    'REVIEW_PENDING',
    `REJECTED_ROWS_REQUIRE_RETRACE: ${summary.rejectedRows} rows need retrace.`,
    'Create retrace worksets and do not source-apply rejected rows.',
  );
  addBlocker(
    blockers,
    summary.invalidRows > 0,
    'INVALID_ROWS_BLOCK_SOURCE_APPLY',
    'INVALID',
    `INVALID_ROWS_BLOCK_SOURCE_APPLY: ${summary.invalidRows} invalid rows were found.`,
    'Fix P51/P52 invalid rows before source apply can be considered.',
  );
  addBlocker(
    blockers,
    true,
    'EXPLICIT_APPLY_STEP_REQUIRED',
    'REVIEW_PENDING',
    'EXPLICIT_APPLY_STEP_REQUIRED: P53 is a guard only and never writes source data.',
    'Run a later explicit source apply step only after reviewing the P53 plan.',
  );
  return blockers;
}

function buildRows(summary) {
  return [
    {
      rowId: 'P53_SOURCE_APPLY_GUARD',
      validationType: 'GUARD_CONTRACT',
      validationStatus: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'P53 is a prewrite guard; source writing remains blocked.',
    },
    {
      rowId: 'P52_SOURCE_PATCH_PREVIEW_SOURCE',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p52Status ? 'PASS' : 'INVALID',
      failures: summary.p52Status ? '' : 'P52_PREVIEW_MISSING',
      nextAction: 'Run P52 source patch preview before P53.',
    },
    {
      rowId: 'SOURCE_PATCH_ROWS_REQUIRED',
      validationType: 'P53_POLICY',
      validationStatus: summary.sourcePatchRows > 0 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.sourcePatchRows > 0 ? '' : 'SOURCE_PATCH_ROWS:0',
      nextAction: 'P53 requires at least one P52 source patch row.',
    },
    {
      rowId: 'PENDING_ROWS_BLOCK_SOURCE_APPLY',
      validationType: 'P53_POLICY',
      validationStatus: summary.pendingRows === 0 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.pendingRows === 0 ? '' : `PENDING_ROWS:${summary.pendingRows}`,
      nextAction: 'Complete pending operator review before source apply.',
    },
    {
      rowId: 'SOURCE_PATCH_ALLOWED_REQUIRED',
      validationType: 'P53_POLICY',
      validationStatus: summary.sourcePatchAllowed ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.sourcePatchAllowed ? '' : 'SOURCE_PATCH_ALLOWED_FALSE',
      nextAction: 'P52 must report sourcePatchAllowed=true.',
    },
    {
      rowId: 'APPROVED_ROWS_MATCH_PATCH_ROWS_REQUIRED',
      validationType: 'PATCH_POLICY',
      validationStatus: summary.approvedRowsMatchPatchRows ? 'PASS' : 'INVALID',
      failures: summary.approvedRowsMatchPatchRows ? '' : `APPROVED_${summary.approvedRows}_PATCH_${summary.sourcePatchRows}`,
      nextAction: 'Approved rows and patch rows must match exactly.',
    },
    {
      rowId: 'REJECTED_ROWS_REQUIRE_RETRACE',
      validationType: 'RETRACE_POLICY',
      validationStatus: summary.rejectedRows === 0 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.rejectedRows === 0 ? '' : `REJECTED_ROWS:${summary.rejectedRows}`,
      nextAction: 'Retrace rejected rows before source apply.',
    },
    {
      rowId: 'INVALID_ROWS_BLOCK_SOURCE_APPLY',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Fix invalid P51/P52 rows before source apply.',
    },
    {
      rowId: 'EXPLICIT_APPLY_STEP_REQUIRED',
      validationType: 'WRITE_POLICY',
      validationStatus: 'REVIEW_PENDING',
      failures: 'EXPLICIT_APPLY_STEP_REQUIRED',
      nextAction: 'P53 does not write source; a later explicit apply step is required.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceDataWritePerformed === false && summary.sourceApplyAllowed === false ? 'PASS' : 'INVALID',
      failures: summary.sourceDataWritePerformed === false && summary.sourceApplyAllowed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'Do not modify src/data/daeguSeatData.ts in P53.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P53 does not release official 177 blocks.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu source apply guard.',
    },
  ];
}

async function writeGuard() {
  const p52 = await readJson(p52JsonPath);
  const sourceApplyPlanRows = buildSourceApplyPlanRows(p52);
  const summary = normalizeSummary(p52, sourceApplyPlanRows);
  const blockers = buildBlockers(summary);
  const rows = buildRows(summary);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p52Json: toFrontendRelative(p52JsonPath),
      p51RealInputCsv: summary.p51RealInputCsv,
      p51RealInputSha256: summary.p51RealInputSha256,
      sourceTarget,
    },
    policy: {
      productionWriteAllowed: false,
      sourceApplyAllowed: false,
      sourceDataWritePerformed: false,
      explicitApplyStepRequired: true,
      passRelease177Allowed: false,
      passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      note: 'P53_SOURCE_APPLY_GUARD. P52_SOURCE_PATCH_PREVIEW_SOURCE. SOURCE_PATCH_ROWS_REQUIRED. PENDING_ROWS_BLOCK_SOURCE_APPLY. EXPLICIT_APPLY_STEP_REQUIRED. SOURCE_WRITE_FORBIDDEN.',
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
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'reviewId',
    'patchType',
    'targetFile',
    'nextVisualPath',
    'nextHitPath',
    'nextLabelPoint',
    'nextGeometryVersion',
    'applyStatus',
    'sourceTarget',
    'sourceApplyAllowed',
    'sourceDataWritePerformed',
  ]));
  await fs.writeFile(sourceApplyPlanMdPath, [
    '# 대구 operator reference P53 source apply plan',
    '',
    `- source target: \`${summary.sourceTarget}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source apply plan rows: \`${summary.sourceApplyPlanRows}\``,
    `- source apply preconditions met: \`${summary.sourceApplyPreconditionsMet}\``,
    `- explicit apply step required: \`${summary.explicitApplyStepRequired}\``,
    `- source apply allowed: \`${summary.sourceApplyAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));
  await fs.writeFile(guardMdPath, [
    '# 대구 operator reference P53 source apply guard',
    '',
    `- status: \`${summary.status}\``,
    `- P51 input: \`${summary.p51RealInputCsv}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- source patch allowed: \`${summary.sourcePatchAllowed}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source apply plan rows: \`${summary.sourceApplyPlanRows}\``,
    `- source apply preconditions met: \`${summary.sourceApplyPreconditionsMet}\``,
    `- source apply allowed: \`${summary.sourceApplyAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
    '## Blockers',
    '',
    blockers.length > 0
      ? blockers.map((blocker) => `- \`${blocker.rowId}\`: ${blocker.message} Next: ${blocker.nextAction}`).join('\n')
      : '- none',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} sourcePatchRows=${summary.sourcePatchRows} pending=${summary.pendingRows} sourceApplyPlanRows=${summary.sourceApplyPlanRows} sourceApplyPreconditionsMet=${summary.sourceApplyPreconditionsMet} sourceApplyAllowed=${summary.sourceApplyAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const guard = await writeGuard();

  const validations = guard.rows ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p53-source-apply-guard-gate-passed' : 'p53-source-apply-guard-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    approvedRows: guard.summary?.approvedRows ?? 0,
    rejectedRows: guard.summary?.rejectedRows ?? 0,
    pendingRows: guard.summary?.pendingRows ?? 0,
    sourcePatchAllowed: guard.summary?.sourcePatchAllowed === true,
    sourcePatchRows: guard.summary?.sourcePatchRows ?? 0,
    sourceApplyPlanRows: guard.summary?.sourceApplyPlanRows ?? 0,
    sourceApplyPreconditionsMet: guard.summary?.sourceApplyPreconditionsMet === true,
    sourceApplyAllowed: false,
    explicitApplyStepRequired: true,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: guard.summary?.buildBlockerTrackedSeparately,
  };

  if (requireGuard && invalidRows.length > 0) {
    throw new Error(`P53 source apply guard gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
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
    '# 대구 operator reference P53 source apply guard gate',
    '',
    `- status: \`${summary.status}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending validations: \`${summary.reviewPendingRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- source patch allowed: \`${summary.sourcePatchAllowed}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source apply plan rows: \`${summary.sourceApplyPlanRows}\``,
    `- source apply preconditions met: \`${summary.sourceApplyPreconditionsMet}\``,
    `- explicit apply step required: \`${summary.explicitApplyStepRequired}\``,
    `- source apply allowed: \`${summary.sourceApplyAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} sourcePatchRows=${summary.sourcePatchRows} pending=${summary.pendingRows} sourceApplyPreconditionsMet=${summary.sourceApplyPreconditionsMet} sourceApplyAllowed=${summary.sourceApplyAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'guard') {
  await writeGuard();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
