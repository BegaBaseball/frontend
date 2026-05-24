import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { validateSeatMapPolygonPath } from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');

function csvEscape(value) {
  const text = String(value ?? '');
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

function validateApprovedRow(row, imageWidth, imageHeight, options = {}) {
  const failures = [];

  if ((row.operatorDecision === 'PENDING' || !row.operatorDecision) && options.allowPendingRows) {
    return {
      validationStatus: 'PENDING_OPERATOR_DECISION',
      failures,
    };
  }

  if (row.operatorDecision !== 'APPROVED') failures.push('OPERATOR_DECISION_NOT_APPROVED');
  if (row.decisionType === 'EXCLUDE_NON_SEAT' && options.allowExcludeNonSeat) {
    if (!row.reviewer) failures.push('MISSING_REVIEWER');
    if (!row.reviewedAt) failures.push('MISSING_REVIEWED_AT');
    return {
      validationStatus: failures.length === 0 ? 'APPROVED_VALID' : 'INVALID',
      failures,
    };
  }

  if (row.decisionType !== 'ADD_TO_OPERATOR_REFERENCE_DATASET') failures.push('UNSUPPORTED_DECISION_TYPE');
  if (!row.correctedPath) failures.push('MISSING_CORRECTED_PATH');
  if (!row.correctedHitPath) failures.push('MISSING_CORRECTED_HIT_PATH');
  if (!Number.isFinite(Number(row.correctedLabelX))) failures.push('MISSING_CORRECTED_LABEL_X');
  if (!Number.isFinite(Number(row.correctedLabelY))) failures.push('MISSING_CORRECTED_LABEL_Y');
  if (!row.reviewer) failures.push('MISSING_REVIEWER');
  if (!row.reviewedAt) failures.push('MISSING_REVIEWED_AT');

  [
    ['correctedPath', row.correctedPath],
    ['correctedHitPath', row.correctedHitPath],
  ].forEach(([fieldName, pathData]) => {
    if (!pathData) return;
    validateSeatMapPolygonPath({
      pathData,
      width: imageWidth,
      height: imageHeight,
    }).forEach((error) => failures.push(`${fieldName}:${error}`));
  });

  return failures;
}

export async function runDaeguOperatorReferencePhaseApproval({
  phase,
  imageWidth = 4096,
  imageHeight = 4096,
  allowPendingRows = false,
  allowExcludeNonSeat = false,
}) {
  const task = process.argv[2] ?? 'packet';
  const requireApproved = process.argv.includes('--require-approved');
  const outputDir = path.join(frontendRoot, `reports/stadium/daegu-operator-reference-${phase}-approval`);
  const gateDir = path.join(outputDir, 'gate');
  const packetJsonPath = path.join(outputDir, `daegu-operator-reference-${phase}-approval-packet.json`);
  const operatorInputJsonPath = path.join(outputDir, 'operator-input', `daegu-operator-reference-${phase}-operator-input.json`);
  const gateJsonPath = path.join(gateDir, `daegu-operator-reference-${phase}-approval-gate.json`);
  const gateCsvPath = path.join(gateDir, `daegu-operator-reference-${phase}-approval-gate.csv`);
  const gateMdPath = path.join(gateDir, `daegu-operator-reference-${phase}-approval-gate.md`);
  const dryRunPlanPath = path.join(gateDir, `daegu-operator-reference-${phase}-dry-run-apply-plan.json`);

  if (task === 'packet') {
    const packet = await readJson(packetJsonPath);
    const candidateCount = packet.summary?.candidateCount ?? packet.candidates?.length ?? 0;
    console.log(`status:${phase}-approval-packet-ready candidates=${candidateCount}`);
    return;
  }

  if (task !== 'gate') {
    throw new Error(`Unsupported task: ${task}`);
  }

  const input = await readJson(operatorInputJsonPath);
  const rows = input.rows ?? [];
  const validations = rows.map((row) => {
    const result = validateApprovedRow(row, imageWidth, imageHeight, {
      allowPendingRows,
      allowExcludeNonSeat,
    });
    const failures = Array.isArray(result) ? result : result.failures;
    const validationStatus = Array.isArray(result)
      ? failures.length === 0 ? 'APPROVED_READY' : 'INVALID'
      : result.validationStatus;
    return {
      draftId: row.draftId,
      visibleLabel: row.visibleLabel,
      operatorDecision: row.operatorDecision,
      decisionType: row.decisionType,
      validationStatus,
      failures: failures.join('|'),
    };
  });

  const approvedRows = validations.filter((row) => row.validationStatus === 'APPROVED_READY' || row.validationStatus === 'APPROVED_VALID');
  const dryRunRows = validations.filter((row) => {
    const inputRow = rows.find((candidate) => candidate.draftId === row.draftId);
    return row.validationStatus === 'APPROVED_READY'
      && inputRow?.decisionType === 'ADD_TO_OPERATOR_REFERENCE_DATASET';
  });
  const pendingRows = validations.filter((row) => row.validationStatus === 'PENDING_OPERATOR_DECISION');
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const readyForTemplateImport = invalidRows.length === 0 && dryRunRows.length > 0;
  if (requireApproved && !readyForTemplateImport) {
    throw new Error(`${phase} approval gate failed: dryRunRows=${dryRunRows.length} invalidRows=${invalidRows.length}`);
  }

  const summary = {
    status: readyForTemplateImport ? `${phase}-approval-gate-dry-run-ready` : `${phase}-approval-gate-waiting-for-operator-input`,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    pendingRows: pendingRows.length,
    dryRunRows: dryRunRows.length,
    invalidRows: invalidRows.length,
    readyForTemplateImport,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    dryRunPlan: path.relative(frontendRoot, dryRunPlanPath),
  };

  const dryRunPlan = {
    status: 'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
    phase,
    geometryVersion: `DAEGU_OPERATOR_REFERENCE_${phase.toUpperCase()}_APPROVED_DRY_RUN_V1`,
    approvedRows: rows.filter((row) => dryRunRows.some((approved) => approved.draftId === row.draftId)),
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, JSON.stringify({ summary, validations }, null, 2));
  await fs.writeFile(gateCsvPath, buildCsv(validations, ['draftId', 'visibleLabel', 'operatorDecision', 'decisionType', 'validationStatus', 'failures']));
  await fs.writeFile(dryRunPlanPath, JSON.stringify(dryRunPlan, null, 2));
  await fs.writeFile(gateMdPath, [
    `# 대구 operator reference ${phase.toUpperCase()} approval gate`,
    '',
    `- status: \`${summary.status}\``,
    `- total rows: \`${summary.totalRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- dry-run rows: \`${summary.dryRunRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Rows',
    '',
    ...validations.map((row) => `- \`${row.draftId}\` / \`${row.visibleLabel}\`: \`${row.validationStatus}\`${row.failures ? ` (${row.failures})` : ''}`),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approvedRows=${summary.approvedRows} pendingRows=${summary.pendingRows} dryRunRows=${summary.dryRunRows} invalidRows=${summary.invalidRows}`);
}
