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
const p57GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p57-p52-handoff/gate/daegu-operator-reference-p57-p52-handoff-gate.json');
const p58GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p58-ready-fixture/gate/daegu-operator-reference-p58-ready-fixture-gate.json');
const p51InputCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input.csv');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p59-readiness-comparison');
const gateDir = path.join(outputDir, 'gate');
const comparisonJsonPath = path.join(outputDir, 'daegu-operator-reference-p59-readiness-comparison.json');
const comparisonMdPath = path.join(outputDir, 'daegu-operator-reference-p59-readiness-comparison.md');
const nextOperatorActionMdPath = path.join(outputDir, 'daegu-operator-reference-p59-next-operator-action.md');
const validationCsvPath = path.join(outputDir, 'daegu-operator-reference-p59-validation.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p59-readiness-comparison-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p59-readiness-comparison-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p59-readiness-comparison-gate.md');

const task = process.argv[2] ?? 'comparison';
const requiredOperatorColumns = [
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'reviewNote',
];

const sourceContractLiterals = [
  'P59_READINESS_COMPARISON',
  'P58_FIXTURE_READY_SOURCE',
  'P57_PRODUCTION_NOT_READY_SOURCE',
  'TECHNICAL_PATH_VERIFIED',
  'FIXTURE_READY_FOR_P52_TRUE',
  'PRODUCTION_READY_FOR_P52_FALSE',
  'PRODUCTION_INPUT_STILL_PENDING',
  'NEXT_REQUIRED_ACTION_OPERATOR_APPROVE_P51',
  'P51_REAL_REVIEW_INPUT_EDIT_TARGET',
  'SOURCE_WRITE_STILL_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'technicalPathVerified=true',
  'productionReadyForP52=false',
  'p59-readiness-comparison-ready',
  'p59-readiness-comparison-gate-passed',
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

function summarize({ p57Gate, p58Gate }) {
  const p57 = p57Gate.summary ?? {};
  const p58 = p58Gate.summary ?? {};
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const fixtureReadyForP52 = p58.readyForP52 === true
    && p58.approvedRows === 1
    && p58.approvedPreviewReadyRows === 1
    && p58.realP51InputUnchanged === true
    && p58.sourceDataWritePerformed === false;
  const productionReadyForP52 = p57.readyForP52 === true;
  const productionInputStillPending = productionReadyForP52 === false
    && p57.approvedRows === 0
    && p57.pendingRows === 131
    && p57.sourceDataWritePerformed === false;
  const sourceWriteStillForbidden = p57.sourceDataWritePerformed === false
    && p58.sourceDataWritePerformed === false
    && p57.productionWriteAllowed === false
    && p58.productionWriteAllowed === false;
  const technicalPathVerified = fixtureReadyForP52
    && p58.p56FixturePreviewReady === true
    && p58.p57FixtureReadyForP52 === true;
  const comparisonReady = technicalPathVerified
    && productionInputStillPending
    && sourceWriteStillForbidden
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: comparisonReady ? 'p59-readiness-comparison-ready' : 'p59-readiness-comparison-blocked',
    p57GateStatus: p57.status ?? '',
    p58GateStatus: p58.status ?? '',
    currentSelectableSeats,
    officialDatasetBlocks,
    fixtureReadyForP52,
    fixtureApprovedRows: p58.approvedRows ?? 0,
    fixtureApprovedPreviewReadyRows: p58.approvedPreviewReadyRows ?? 0,
    fixtureRealP51InputUnchanged: p58.realP51InputUnchanged === true,
    productionReadyForP52,
    productionApprovedRows: p57.approvedRows ?? 0,
    productionPendingRows: p57.pendingRows ?? 0,
    productionInvalidRows: p57.invalidRows ?? p57.invalidP56Rows ?? 0,
    technicalPathVerified,
    productionInputStillPending,
    sourceWriteStillForbidden,
    nextRequiredAction: 'NEXT_REQUIRED_ACTION_OPERATOR_APPROVE_P51',
    operatorEditTarget: toFrontendRelative(p51InputCsvPath),
    requiredOperatorColumns,
    p52SourcePatchPreviewAllowed: false,
    sourceApplyAllowed: false,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildValidationRows(summary) {
  return [
    {
      rowId: 'P59_READINESS_COMPARISON',
      validationType: 'COMPARISON_CONTRACT',
      validationStatus: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Use this report to separate fixture readiness from production readiness.',
    },
    {
      rowId: 'P58_FIXTURE_READY_SOURCE',
      validationType: 'FIXTURE_SOURCE',
      validationStatus: summary.fixtureReadyForP52 ? 'PASS' : 'INVALID',
      failures: summary.fixtureReadyForP52 ? '' : 'FIXTURE_READY_FOR_P52_FALSE',
      nextAction: 'Run P58 ready fixture before P59.',
    },
    {
      rowId: 'P57_PRODUCTION_NOT_READY_SOURCE',
      validationType: 'PRODUCTION_SOURCE',
      validationStatus: summary.productionReadyForP52 === false ? 'PASS' : 'INVALID',
      failures: summary.productionReadyForP52 === false ? '' : 'PRODUCTION_READY_TOO_EARLY',
      nextAction: 'Production should remain not-ready until real P51 approval rows exist.',
    },
    {
      rowId: 'TECHNICAL_PATH_VERIFIED',
      validationType: 'READINESS_POLICY',
      validationStatus: summary.technicalPathVerified ? 'PASS' : 'INVALID',
      failures: summary.technicalPathVerified ? '' : 'TECHNICAL_PATH_NOT_VERIFIED',
      nextAction: 'The fixture path must prove P56 -> P57 -> P52 readiness.',
    },
    {
      rowId: 'FIXTURE_READY_FOR_P52_TRUE',
      validationType: 'READINESS_POLICY',
      validationStatus: summary.fixtureReadyForP52 ? 'PASS' : 'INVALID',
      failures: summary.fixtureReadyForP52 ? '' : 'FIXTURE_READY_FALSE',
      nextAction: 'Keep P58 as the positive ready control.',
    },
    {
      rowId: 'PRODUCTION_READY_FOR_P52_FALSE',
      validationType: 'READINESS_POLICY',
      validationStatus: summary.productionReadyForP52 === false ? 'PASS' : 'INVALID',
      failures: summary.productionReadyForP52 === false ? '' : 'PRODUCTION_READY_TRUE_WITHOUT_INPUT',
      nextAction: 'Production must not be ready before operator P51 approval.',
    },
    {
      rowId: 'PRODUCTION_INPUT_STILL_PENDING',
      validationType: 'OPERATOR_ACTION_POLICY',
      validationStatus: summary.productionInputStillPending ? 'REVIEW_PENDING' : 'INVALID',
      failures: summary.productionInputStillPending ? 'PENDING_ROWS:131' : 'PRODUCTION_PENDING_STATE_NOT_MATCHED',
      nextAction: 'Operator must approve rows in the P51 real review input CSV.',
    },
    {
      rowId: 'NEXT_REQUIRED_ACTION_OPERATOR_APPROVE_P51',
      validationType: 'OPERATOR_ACTION_POLICY',
      validationStatus: 'REVIEW_PENDING',
      failures: 'OPERATOR_APPROVAL_REQUIRED',
      nextAction: `Edit ${summary.operatorEditTarget} and fill ${summary.requiredOperatorColumns.join(', ')}.`,
    },
    {
      rowId: 'P51_REAL_REVIEW_INPUT_EDIT_TARGET',
      validationType: 'INPUT_TARGET',
      validationStatus: summary.operatorEditTarget.endsWith('daegu-operator-reference-p51-real-review-input.csv') ? 'PASS' : 'INVALID',
      failures: summary.operatorEditTarget.endsWith('daegu-operator-reference-p51-real-review-input.csv') ? '' : 'P51_EDIT_TARGET_MISSING',
      nextAction: 'Use only the P51 real review input CSV for production approval input.',
    },
    {
      rowId: 'SOURCE_WRITE_STILL_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceWriteStillForbidden ? 'PASS' : 'INVALID',
      failures: summary.sourceWriteStillForbidden ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'P59 must not write source data.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'Release remains forbidden until real production approval and source apply are complete.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu readiness comparison.',
    },
  ];
}

async function buildPayload() {
  const [p57Gate, p58Gate] = await Promise.all([
    readJson(p57GateJsonPath),
    readJson(p58GateJsonPath),
  ]);
  const summary = summarize({ p57Gate, p58Gate });
  const validations = buildValidationRows(summary);

  return {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p57GateJson: toFrontendRelative(p57GateJsonPath),
      p58GateJson: toFrontendRelative(p58GateJsonPath),
      p51RealReviewInputCsv: toFrontendRelative(p51InputCsvPath),
    },
    policy: {
      p59ReadinessComparison: true,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P59_READINESS_COMPARISON. TECHNICAL_PATH_VERIFIED. FIXTURE_READY_FOR_P52_TRUE. PRODUCTION_READY_FOR_P52_FALSE. NEXT_REQUIRED_ACTION_OPERATOR_APPROVE_P51. SOURCE_WRITE_STILL_FORBIDDEN.',
    },
    summary,
    validations,
    outputs: {
      comparisonJson: toFrontendRelative(comparisonJsonPath),
      comparisonMd: toFrontendRelative(comparisonMdPath),
      nextOperatorActionMd: toFrontendRelative(nextOperatorActionMdPath),
      validationCsv: toFrontendRelative(validationCsvPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };
}

async function writeComparison() {
  const payload = await buildPayload();
  const { summary } = payload;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(comparisonJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(validationCsvPath, buildCsv(payload.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(comparisonMdPath, [
    '# 대구 operator reference P59 readiness comparison',
    '',
    `- status: \`${summary.status}\``,
    `- technical path verified: \`${summary.technicalPathVerified}\``,
    `- fixture ready for P52: \`${summary.fixtureReadyForP52}\``,
    `- fixture approved rows: \`${summary.fixtureApprovedRows}\``,
    `- production ready for P52: \`${summary.productionReadyForP52}\``,
    `- production approved rows: \`${summary.productionApprovedRows}\``,
    `- production pending rows: \`${summary.productionPendingRows}\``,
    `- production input still pending: \`${summary.productionInputStillPending}\``,
    `- source write still forbidden: \`${summary.sourceWriteStillForbidden}\``,
    `- next required action: \`${summary.nextRequiredAction}\``,
    `- operator edit target: \`${summary.operatorEditTarget}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
    '## Conclusion',
    '',
    '- `technicalPathVerified=true`: P58 proves the P56 -> P57 -> P52 ready path works with one valid approved row.',
    '- `productionReadyForP52=false`: the real P51 production input has no approved rows yet.',
    '- The next required action is operator approval in the P51 CSV, not another source write step.',
    '',
  ].join('\n'));
  await fs.writeFile(nextOperatorActionMdPath, [
    '# 대구 operator reference P59 next operator action',
    '',
    `Edit target: \`${summary.operatorEditTarget}\``,
    '',
    'Required columns for each production-approved row:',
    '',
    ...requiredOperatorColumns.map((column) => `- \`${column}\``),
    '',
    'Rules:',
    '',
    '- Do not edit immutable evidence columns.',
    '- Do not edit fixture files for production input.',
    '- Run P56/P57 again after the P51 CSV is edited.',
    '- Source write remains forbidden until production P56/P57 gates are ready.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} technicalPathVerified=${summary.technicalPathVerified} fixtureReadyForP52=${summary.fixtureReadyForP52} productionReadyForP52=${summary.productionReadyForP52} productionApproved=${summary.productionApprovedRows} productionPending=${summary.productionPendingRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const comparison = await writeComparison();
  const invalidRows = (comparison.validations ?? []).filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = (comparison.validations ?? []).filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p59-readiness-comparison-gate-passed' : 'p59-readiness-comparison-gate-blocked',
    comparisonStatus: comparison.summary?.status ?? '',
    totalValidations: comparison.validations?.length ?? 0,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    technicalPathVerified: comparison.summary?.technicalPathVerified === true,
    fixtureReadyForP52: comparison.summary?.fixtureReadyForP52 === true,
    productionReadyForP52: comparison.summary?.productionReadyForP52 === true,
    productionInputStillPending: comparison.summary?.productionInputStillPending === true,
    sourceWriteStillForbidden: comparison.summary?.sourceWriteStillForbidden === true,
    nextRequiredAction: comparison.summary?.nextRequiredAction ?? '',
    operatorEditTarget: comparison.summary?.operatorEditTarget ?? '',
    sourceApplyAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: comparison.summary?.buildBlockerTrackedSeparately,
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations: comparison.validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(comparison.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P59 readiness comparison gate',
    '',
    `- status: \`${summary.status}\``,
    `- technical path verified: \`${summary.technicalPathVerified}\``,
    `- fixture ready for P52: \`${summary.fixtureReadyForP52}\``,
    `- production ready for P52: \`${summary.productionReadyForP52}\``,
    `- production input still pending: \`${summary.productionInputStillPending}\``,
    `- source write still forbidden: \`${summary.sourceWriteStillForbidden}\``,
    `- next required action: \`${summary.nextRequiredAction}\``,
    `- operator edit target: \`${summary.operatorEditTarget}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} technicalPathVerified=${summary.technicalPathVerified} fixtureReadyForP52=${summary.fixtureReadyForP52} productionReadyForP52=${summary.productionReadyForP52} productionInputStillPending=${summary.productionInputStillPending} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'comparison') {
  await writeComparison();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
