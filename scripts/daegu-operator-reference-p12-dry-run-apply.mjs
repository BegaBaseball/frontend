import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { DAEGU_OPERATOR_REFERENCE_BLOCKS } from '../src/data/daeguSeatData.ts';
import { validateSeatMapPolygonPath } from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p11PacketJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p11-approval/daegu-operator-reference-p11-approval-packet.json');
const p11OperatorInputJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p11-approval/operator-input/daegu-operator-reference-p11-operator-input.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p12-dry-run-apply');
const gateDir = path.join(outputDir, 'gate');
const planJsonPath = path.join(outputDir, 'daegu-operator-reference-p12-dry-run-apply-plan.json');
const planCsvPath = path.join(outputDir, 'daegu-operator-reference-p12-dry-run-apply-plan.csv');
const planMdPath = path.join(outputDir, 'daegu-operator-reference-p12-dry-run-apply-plan.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p12-dry-run-apply-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p12-dry-run-apply-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p12-dry-run-apply-gate.md');

const task = process.argv[2] ?? 'plan';
const requireReady = process.argv.includes('--require-ready');
const requireApproved = process.argv.includes('--require-approved');
const imageWidth = 4096;
const imageHeight = 4096;
const traceVersion = 'DAEGU_OPERATOR_REFERENCE_P11_APPROVED_DRY_RUN_V1';

const sourceContractLiterals = [
  'P12 reads only P11 operator input rows and creates a dry-run apply plan.',
  'P12 does not write src/data/daeguSeatData.ts.',
  'readyForSourcePatch=false when approvedRows=0',
  'ADD_TO_OPERATOR_REFERENCE_DATASET',
  'OPERATOR_DECISION_NOT_APPROVED',
  'MISSING_CORRECTED_PATH',
  'MISSING_CORRECTED_HIT_PATH',
  'MISSING_CORRECTED_LABEL_X',
  'MISSING_CORRECTED_LABEL_Y',
  'MISSING_REVIEWER',
  'MISSING_REVIEWED_AT',
  'DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK',
  'DAEGU_OPERATOR_REFERENCE_P11_APPROVED_DRY_RUN_V1',
  'p12-dry-run-apply-plan-ready',
  'p12-dry-run-apply-gate-waiting-for-operator-approval',
  'p12-dry-run-apply-gate-source-patch-ready',
  'daegu-operator-reference-p12-dry-run-apply-plan.json',
  'sourceDataWritePerformed: false',
  'productionWriteAllowed: false',
];

void sourceContractLiterals;

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function activeBlockKeys() {
  return new Set(DAEGU_OPERATOR_REFERENCE_BLOCKS.flatMap((block) => [
    block.id,
    block.name,
    block.block,
    block.block.replace('-', ''),
    ...block.officialBlocks,
  ]));
}

function validateApprovedRow(row, existingKeys) {
  const failures = [];

  if (row.operatorDecision === 'PENDING') {
    return {
      validationStatus: 'PENDING_OPERATOR_DECISION',
      failures,
    };
  }

  if (row.operatorDecision !== 'APPROVED') failures.push('OPERATOR_DECISION_NOT_APPROVED');
  if (row.decisionType !== 'ADD_TO_OPERATOR_REFERENCE_DATASET') failures.push('UNSUPPORTED_DECISION_TYPE');
  if (!row.correctedPath) failures.push('MISSING_CORRECTED_PATH');
  if (!row.correctedHitPath) failures.push('MISSING_CORRECTED_HIT_PATH');
  if (!Number.isFinite(Number(row.correctedLabelX))) failures.push('MISSING_CORRECTED_LABEL_X');
  if (!Number.isFinite(Number(row.correctedLabelY))) failures.push('MISSING_CORRECTED_LABEL_Y');
  if (!row.reviewer) failures.push('MISSING_REVIEWER');
  if (!row.reviewedAt) failures.push('MISSING_REVIEWED_AT');
  if (!row.suggestedId || existingKeys.has(row.suggestedId)) failures.push('DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK');
  if (!row.suggestedBlock || existingKeys.has(row.suggestedBlock) || existingKeys.has(String(row.suggestedBlock).replace('-', ''))) failures.push('DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK');

  if (row.correctedPath) {
    validateSeatMapPolygonPath({
      pathData: row.correctedPath,
      width: imageWidth,
      height: imageHeight,
      labelPoint: [Number(row.correctedLabelX), Number(row.correctedLabelY)],
      labelTolerance: 3,
    }).forEach((failure) => failures.push(`correctedPath:${failure}`));
  }
  if (row.correctedHitPath) {
    validateSeatMapPolygonPath({
      pathData: row.correctedHitPath,
      width: imageWidth,
      height: imageHeight,
    }).forEach((failure) => failures.push(`correctedHitPath:${failure}`));
  }

  return {
    validationStatus: failures.length === 0 ? 'APPROVED_READY' : 'INVALID',
    failures,
  };
}

function toBlockRow(row) {
  return {
    id: row.suggestedId,
    name: row.suggestedName,
    block: row.suggestedBlock,
    category: row.suggestedCategory,
    level: row.suggestedLevel,
    side: row.suggestedSide,
    d: row.correctedPath,
    hitPath: row.correctedHitPath,
    labelX: Number(row.correctedLabelX),
    labelY: Number(row.correctedLabelY),
    reviewEvidence: {
      draftId: row.draftId,
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      sourceDraftVisualPath: row.draftVisualPath,
      sourceDraftHitPath: row.draftHitPath,
      sourceDraftLabelPoint: [Number(row.draftLabelX), Number(row.draftLabelY)],
    },
  };
}

function buildSourcePatchSnippet(blockRows) {
  if (blockRows.length === 0) {
    return '';
  }
  return [
    `const DAEGU_OPERATOR_REFERENCE_P11_BLOCK_ROWS: DaeguOperatorReferenceApprovedBlockRow[] = ${JSON.stringify(blockRows, null, 2)};`,
    '',
    '...DAEGU_OPERATOR_REFERENCE_P11_BLOCK_ROWS.map((row) => createOperatorReferenceApprovedBlockWithTrace(row, {',
    '  reviewNote: OPERATOR_REFERENCE_P7_REVIEW_NOTE,',
    `  traceVersion: '${traceVersion}',`,
    '})),',
    '',
  ].join('\n');
}

function summarize(validations, approvedBlockRows) {
  const approvedRows = validations.filter((row) => row.validationStatus === 'APPROVED_READY').length;
  const pendingRows = validations.filter((row) => row.validationStatus === 'PENDING_OPERATOR_DECISION').length;
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID').length;
  const readyForSourcePatch = approvedRows > 0 && invalidRows === 0 && approvedBlockRows.length === approvedRows;

  return {
    status: readyForSourcePatch
      ? 'p12-dry-run-apply-gate-source-patch-ready'
      : invalidRows === 0
        ? 'p12-dry-run-apply-gate-waiting-for-operator-approval'
        : 'p12-dry-run-apply-gate-blocked',
    totalRows: validations.length,
    approvedRows,
    pendingRows,
    invalidRows,
    dryRunRows: approvedBlockRows.length,
    readyForSourcePatch,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
}

async function buildPlanPayload() {
  const p11Packet = await readJson(p11PacketJsonPath);
  const input = await readJson(p11OperatorInputJsonPath);
  const packetRowsById = new Map((p11Packet.rows ?? []).map((row) => [row.draftId, row]));
  const existingKeys = activeBlockKeys();
  const inputRows = input.rows ?? [];

  const validations = inputRows.map((inputRow) => {
    const packetRow = packetRowsById.get(inputRow.draftId);
    const failures = [];
    if (!packetRow) failures.push('MISSING_P11_PACKET_ROW');
    if (packetRow && packetRow.suggestedId !== inputRow.suggestedId) failures.push('PACKET_INPUT_SUGGESTED_ID_MISMATCH');
    const approvedValidation = validateApprovedRow(inputRow, existingKeys);
    failures.push(...approvedValidation.failures);
    const validationStatus = failures.length
      ? 'INVALID'
      : approvedValidation.validationStatus;
    return {
      draftId: inputRow.draftId,
      visibleLabel: inputRow.visibleLabel,
      suggestedId: inputRow.suggestedId,
      suggestedBlock: inputRow.suggestedBlock,
      operatorDecision: inputRow.operatorDecision,
      decisionType: inputRow.decisionType,
      validationStatus,
      failures,
    };
  });
  const approvedRows = inputRows.filter((row) => validations.some((validation) => validation.draftId === row.draftId && validation.validationStatus === 'APPROVED_READY'));
  const approvedBlockRows = approvedRows.map(toBlockRow);
  const summary = summarize(validations, approvedBlockRows);
  return {
    status: 'p12-dry-run-apply-plan-ready',
    generatedAt: new Date().toISOString(),
    source: {
      p11Packet: 'reports/stadium/daegu-operator-reference-p11-approval/daegu-operator-reference-p11-approval-packet.json',
      p11OperatorInput: 'reports/stadium/daegu-operator-reference-p11-approval/operator-input/daegu-operator-reference-p11-operator-input.json',
      viewBox: '0 0 4096 4096',
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      note: 'P12 reads only P11 operator input rows and creates a dry-run apply plan. P12 does not write src/data/daeguSeatData.ts. readyForSourcePatch=false when approvedRows=0.',
      applyRule: 'A later explicit source patch may use approvedBlockRows only when readyForSourcePatch=true.',
    },
    summary,
    validations: validations.map((row) => ({
      ...row,
      failures: row.failures.join('|'),
    })),
    approvedBlockRows,
    sourcePatchSnippet: buildSourcePatchSnippet(approvedBlockRows),
    outputs: {
      planJson: toFrontendRelative(planJsonPath),
      planCsv: toFrontendRelative(planCsvPath),
      planMd: toFrontendRelative(planMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };
}

async function writePlan() {
  const payload = await buildPlanPayload();

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(planJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(planCsvPath, buildCsv(payload.validations, [
    'draftId',
    'visibleLabel',
    'suggestedId',
    'suggestedBlock',
    'operatorDecision',
    'decisionType',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(planMdPath, [
    '# 대구 operator reference P12 dry-run apply plan',
    '',
    `- status: \`${payload.status}\``,
    `- total rows: \`${payload.summary.totalRows}\``,
    `- approved rows: \`${payload.summary.approvedRows}\``,
    `- pending rows: \`${payload.summary.pendingRows}\``,
    `- invalid rows: \`${payload.summary.invalidRows}\``,
    `- dry-run rows: \`${payload.summary.dryRunRows}\``,
    `- ready for source patch: \`${payload.summary.readyForSourcePatch}\``,
    `- production write allowed: \`${payload.summary.productionWriteAllowed}\``,
    `- source data write performed: \`${payload.summary.sourceDataWritePerformed}\``,
    '',
    '## Rows',
    '',
    ...payload.validations.map((row) => `- \`${row.draftId}\` / \`${row.visibleLabel}\`: \`${row.validationStatus}\`${row.failures ? ` (${row.failures})` : ''}`),
    '',
  ].join('\n'));

  console.log(`status:${payload.status} approvedRows=${payload.summary.approvedRows} pendingRows=${payload.summary.pendingRows} invalidRows=${payload.summary.invalidRows} readyForSourcePatch=${payload.summary.readyForSourcePatch}`);
}

async function writeGate() {
  const plan = await readJson(planJsonPath);
  const summary = plan.summary;
  const validations = plan.validations ?? [];

  if (requireReady && summary.invalidRows !== 0) {
    throw new Error(`P12 dry-run gate failed: invalidRows=${summary.invalidRows}`);
  }
  if (requireApproved && !summary.readyForSourcePatch) {
    throw new Error(`P12 dry-run gate has no approved source patch rows: approvedRows=${summary.approvedRows} invalidRows=${summary.invalidRows}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'draftId',
    'visibleLabel',
    'suggestedId',
    'suggestedBlock',
    'operatorDecision',
    'decisionType',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P12 dry-run apply gate',
    '',
    `- status: \`${summary.status}\``,
    `- total rows: \`${summary.totalRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- dry-run rows: \`${summary.dryRunRows}\``,
    `- ready for source patch: \`${summary.readyForSourcePatch}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approvedRows=${summary.approvedRows} pendingRows=${summary.pendingRows} invalidRows=${summary.invalidRows} readyForSourcePatch=${summary.readyForSourcePatch}`);
}

if (task === 'plan') {
  await writePlan();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
