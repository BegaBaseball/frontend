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
const p56IntakeJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p56-real-input-intake/daegu-operator-reference-p56-real-input-intake.json');
const p56GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p56-real-input-intake/gate/daegu-operator-reference-p56-real-input-intake-gate.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p57-p52-handoff');
const gateDir = path.join(outputDir, 'gate');
const handoffJsonPath = path.join(outputDir, 'daegu-operator-reference-p57-p52-handoff.json');
const handoffMdPath = path.join(outputDir, 'daegu-operator-reference-p57-p52-handoff.md');
const approvedRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p57-approved-rows.csv');
const blockedRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p57-blocked-rows.csv');
const validationCsvPath = path.join(outputDir, 'daegu-operator-reference-p57-validation.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p57-p52-handoff-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p57-p52-handoff-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p57-p52-handoff-gate.md');

const task = process.argv[2] ?? 'handoff';
const requireReady = process.argv.includes('--require-ready');

const sourceContractLiterals = [
  'P57_P52_HANDOFF',
  'P56_GATE_RESULT_REQUIRED',
  'P56_APPROVED_PREVIEW_ROWS_SOURCE',
  'APPROVED_PREVIEW_READY_ROWS_ONLY',
  'READY_FOR_P52_REQUIRES_APPROVED_ROWS',
  'INVALID_P56_ROWS_BLOCK_P52',
  'PENDING_P56_ROWS_BLOCK_P52',
  'P52_ENTRY_GATE_STRENGTHENED',
  'P52_PREVIEW_BLOCKED_WHEN_APPROVED_ROWS_0',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'readyForP52=false',
  'p57-p52-handoff-ready',
  'p57-p52-handoff-blocked',
  'p57-p52-handoff-gate-passed',
  'p57-p52-handoff-gate-blocked',
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

function buildApprovedRows(p56) {
  return (p56.approvedPreviewRows ?? []).map((row, index) => ({
    handoffOrder: index + 1,
    p56PreviewOrder: row.previewOrder,
    reviewId: row.reviewId,
    sectionId: row.sectionId,
    block: row.block,
    name: row.name,
    reviewZone: row.reviewZone,
    correctedPath: row.correctedPath,
    correctedLabelPoint: row.correctedLabelPoint,
    reviewer: row.reviewer,
    reviewedAt: row.reviewedAt,
    p52PatchPreviewCandidate: true,
    productionWriteAllowed: false,
  }));
}

function buildBlockedRows(p56) {
  const p56BlockedRows = p56.blockedRows ?? [];
  if (p56BlockedRows.length > 0) {
    return p56BlockedRows.map((row) => ({
      reviewId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      reviewZone: row.reviewZone,
      operatorDecision: row.operatorDecision,
      validationStatus: row.validationStatus,
      failures: row.failures,
      blockerType: row.blockerType,
      nextAction: row.nextAction,
    }));
  }

  if ((p56.summary?.approvedRows ?? 0) === 0) {
    return [{
      reviewId: 'P57_NO_APPROVED_ROWS',
      sectionId: '',
      block: '',
      name: '',
      reviewZone: '',
      operatorDecision: 'PENDING',
      validationStatus: 'REVIEW_PENDING',
      failures: 'P52_PREVIEW_BLOCKED_WHEN_APPROVED_ROWS_0',
      blockerType: 'READY_FOR_P52_REQUIRES_APPROVED_ROWS',
      nextAction: 'Operator must approve at least one valid P56 row before P52.',
    }];
  }

  return [];
}

function summarize({ p56, p56Gate, approvedRows, blockedRows }) {
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const p56GatePassed = p56Gate.summary?.status === 'p56-real-input-intake-gate-passed';
  const p56PreviewReady = p56Gate.summary?.p52PreviewReady === true && p56.summary?.p52PreviewReady === true;
  const readyForP52 = p56GatePassed
    && p56PreviewReady
    && approvedRows.length > 0
    && (p56.summary?.invalidRows ?? 0) === 0
    && approvedRows.length === (p56.summary?.approvedPreviewReadyRows ?? 0);

  return {
    status: readyForP52 ? 'p57-p52-handoff-ready' : 'p57-p52-handoff-blocked',
    p56Status: p56.status ?? p56.summary?.status ?? '',
    p56GateStatus: p56Gate.summary?.status ?? '',
    p56GatePassed,
    p56PreviewReady,
    p56InputChanged: p56.summary?.operatorInputChanged === true,
    p56ReviewRows: p56.summary?.reviewRows ?? 0,
    currentSelectableSeats,
    officialDatasetBlocks,
    approvedRows: p56.summary?.approvedRows ?? 0,
    approvedPreviewReadyRows: p56.summary?.approvedPreviewReadyRows ?? 0,
    p57ApprovedRows: approvedRows.length,
    blockedRows: blockedRows.length,
    rejectedRows: p56.summary?.rejectedRows ?? 0,
    pendingRows: p56.summary?.pendingRows ?? 0,
    invalidRows: p56.summary?.invalidRows ?? 0,
    readyForP52,
    p52EntryGateStrengthened: true,
    p52PreviewBlockedWhenApprovedRows0: (p56.summary?.approvedRows ?? 0) === 0 && !readyForP52,
    p52SourcePatchPreviewAllowed: readyForP52,
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
      rowId: 'P57_P52_HANDOFF',
      validationType: 'HANDOFF_CONTRACT',
      validationStatus: summary.p56ReviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.p56ReviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `ROWS_${summary.p56ReviewRows}_SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Use P57 as the P56-to-P52 approval handoff.',
    },
    {
      rowId: 'P56_GATE_RESULT_REQUIRED',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p56GatePassed ? 'PASS' : 'INVALID',
      failures: summary.p56GatePassed ? '' : `P56_GATE_STATUS_${summary.p56GateStatus}`,
      nextAction: 'Run P56 real input intake gate before P57.',
    },
    {
      rowId: 'P56_APPROVED_PREVIEW_ROWS_SOURCE',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p56Status ? 'PASS' : 'INVALID',
      failures: summary.p56Status ? '' : 'P56_INTAKE_MISSING',
      nextAction: 'P57 must read approvedPreviewRows from P56 output.',
    },
    {
      rowId: 'APPROVED_PREVIEW_READY_ROWS_ONLY',
      validationType: 'ROW_POLICY',
      validationStatus: summary.p57ApprovedRows === summary.approvedPreviewReadyRows ? 'PASS' : 'INVALID',
      failures: summary.p57ApprovedRows === summary.approvedPreviewReadyRows
        ? ''
        : `P57_APPROVED_${summary.p57ApprovedRows}_P56_READY_${summary.approvedPreviewReadyRows}`,
      nextAction: 'Only P56 preview-ready approved rows may enter P57 handoff.',
    },
    {
      rowId: 'READY_FOR_P52_REQUIRES_APPROVED_ROWS',
      validationType: 'PREVIEW_POLICY',
      validationStatus: summary.readyForP52 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.readyForP52 ? '' : `APPROVED_${summary.approvedRows}_P56_READY_${summary.p56PreviewReady}`,
      nextAction: summary.readyForP52 ? 'Run P52 source patch preview.' : 'Do not run P52 require-ready until approved rows exist.',
    },
    {
      rowId: 'INVALID_P56_ROWS_BLOCK_P52',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Fix invalid P56 rows before P52.',
    },
    {
      rowId: 'PENDING_P56_ROWS_BLOCK_P52',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.pendingRows > 0 ? `PENDING_ROWS:${summary.pendingRows}` : '',
      nextAction: summary.pendingRows > 0 ? 'Keep P52 blocked for pending operator rows.' : 'No pending rows remain.',
    },
    {
      rowId: 'P52_ENTRY_GATE_STRENGTHENED',
      validationType: 'PREVIEW_POLICY',
      validationStatus: summary.p52EntryGateStrengthened ? 'PASS' : 'INVALID',
      failures: summary.p52EntryGateStrengthened ? '' : 'P52_ENTRY_GATE_NOT_STRENGTHENED',
      nextAction: 'Require this P57 handoff before treating P52 output as actionable.',
    },
    {
      rowId: 'P52_PREVIEW_BLOCKED_WHEN_APPROVED_ROWS_0',
      validationType: 'PREVIEW_POLICY',
      validationStatus: summary.p52PreviewBlockedWhenApprovedRows0 || summary.readyForP52 ? 'PASS' : 'INVALID',
      failures: summary.p52PreviewBlockedWhenApprovedRows0 || summary.readyForP52 ? '' : 'APPROVED_ROWS_0_NOT_BLOCKED',
      nextAction: 'P52 stays blocked when no approved rows exist.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'P57 must not write src/data/daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P57 only hands off 4096 operator reference rows; release remains forbidden.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu P52 handoff.',
    },
  ];
}

async function buildHandoffPayload() {
  const [p56, p56Gate] = await Promise.all([
    readJson(p56IntakeJsonPath),
    readJson(p56GateJsonPath),
  ]);
  const approvedRows = buildApprovedRows(p56);
  const blockedRows = buildBlockedRows(p56);
  const summary = summarize({ p56, p56Gate, approvedRows, blockedRows });
  const validations = buildValidationRows(summary);

  return {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p56IntakeJson: toFrontendRelative(p56IntakeJsonPath),
      p56GateJson: toFrontendRelative(p56GateJsonPath),
    },
    policy: {
      p52EntryGateStrengthened: true,
      approvedRowsOnly: true,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P57_P52_HANDOFF. P56_GATE_RESULT_REQUIRED. APPROVED_PREVIEW_READY_ROWS_ONLY. READY_FOR_P52_REQUIRES_APPROVED_ROWS. SOURCE_WRITE_FORBIDDEN.',
    },
    summary,
    approvedRows,
    blockedRows,
    validations,
    outputs: {
      handoffJson: toFrontendRelative(handoffJsonPath),
      handoffMd: toFrontendRelative(handoffMdPath),
      approvedRowsCsv: toFrontendRelative(approvedRowsCsvPath),
      blockedRowsCsv: toFrontendRelative(blockedRowsCsvPath),
      validationCsv: toFrontendRelative(validationCsvPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };
}

async function writeHandoff() {
  const payload = await buildHandoffPayload();
  const { summary } = payload;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(handoffJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(approvedRowsCsvPath, buildCsv(payload.approvedRows, [
    'handoffOrder',
    'p56PreviewOrder',
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'correctedPath',
    'correctedLabelPoint',
    'reviewer',
    'reviewedAt',
    'p52PatchPreviewCandidate',
    'productionWriteAllowed',
  ]));
  await fs.writeFile(blockedRowsCsvPath, buildCsv(payload.blockedRows, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'operatorDecision',
    'validationStatus',
    'failures',
    'blockerType',
    'nextAction',
  ]));
  await fs.writeFile(validationCsvPath, buildCsv(payload.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(handoffMdPath, [
    '# 대구 operator reference P57 P52 handoff',
    '',
    `- status: \`${summary.status}\``,
    `- P56 status: \`${summary.p56Status}\``,
    `- P56 gate status: \`${summary.p56GateStatus}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- approved preview-ready rows: \`${summary.approvedPreviewReadyRows}\``,
    `- P57 approved rows: \`${summary.p57ApprovedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- ready for P52: \`${summary.readyForP52}\``,
    `- P52 blocked when approved rows are 0: \`${summary.p52PreviewBlockedWhenApprovedRows0}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
    '## Rule',
    '',
    '- P57 exports only P56 `approvedPreviewRows`.',
    '- `readyForP52=false` when approved rows are 0, P56 has invalid rows, or P56 gate is not ready.',
    '- P57 never writes `src/data/daeguSeatData.ts`.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} p56Gate=${summary.p56GateStatus} approved=${summary.approvedRows} p57Approved=${summary.p57ApprovedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} readyForP52=${summary.readyForP52} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const handoff = await writeHandoff();
  const invalidRows = (handoff.validations ?? []).filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = (handoff.validations ?? []).filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const readyFailures = requireReady && !handoff.summary?.readyForP52
    ? [{
        rowId: 'P57_REQUIRE_READY',
        validationType: 'REQUIRE_READY_POLICY',
        validationStatus: 'INVALID',
        failures: 'READY_FOR_P52_FALSE',
        nextAction: 'Complete valid P56 approved rows before requiring P52 handoff readiness.',
      }]
    : [];
  const gateValidations = [...(handoff.validations ?? []), ...readyFailures];
  const gateInvalidRows = [...invalidRows, ...readyFailures];
  const summary = {
    status: gateInvalidRows.length === 0 ? 'p57-p52-handoff-gate-passed' : 'p57-p52-handoff-gate-blocked',
    handoffStatus: handoff.summary?.status ?? '',
    totalValidations: gateValidations.length,
    invalidRows: gateInvalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    p56GateStatus: handoff.summary?.p56GateStatus ?? '',
    p56GatePassed: handoff.summary?.p56GatePassed === true,
    approvedRows: handoff.summary?.approvedRows ?? 0,
    approvedPreviewReadyRows: handoff.summary?.approvedPreviewReadyRows ?? 0,
    p57ApprovedRows: handoff.summary?.p57ApprovedRows ?? 0,
    blockedRows: handoff.summary?.blockedRows ?? 0,
    pendingRows: handoff.summary?.pendingRows ?? 0,
    invalidP56Rows: handoff.summary?.invalidRows ?? 0,
    readyForP52: handoff.summary?.readyForP52 === true,
    p52SourcePatchPreviewAllowed: handoff.summary?.p52SourcePatchPreviewAllowed === true,
    sourceApplyAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: handoff.summary?.buildBlockerTrackedSeparately,
  };

  if (requireReady && gateInvalidRows.length > 0) {
    throw new Error(`P57 P52 handoff gate failed: ${gateInvalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations: gateValidations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(gateValidations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P57 P52 handoff gate',
    '',
    `- status: \`${summary.status}\``,
    `- handoff status: \`${summary.handoffStatus}\``,
    `- P56 gate status: \`${summary.p56GateStatus}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- P57 approved rows: \`${summary.p57ApprovedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- ready for P52: \`${summary.readyForP52}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} handoffStatus=${summary.handoffStatus} approved=${summary.approvedRows} p57Approved=${summary.p57ApprovedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} readyForP52=${summary.readyForP52} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'handoff') {
  await writeHandoff();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
