import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p12PlanJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p12-dry-run-apply/daegu-operator-reference-p12-dry-run-apply-plan.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p13-source-apply');
const gateDir = path.join(outputDir, 'gate');
const planJsonPath = path.join(outputDir, 'daegu-operator-reference-p13-source-apply-plan.json');
const planCsvPath = path.join(outputDir, 'daegu-operator-reference-p13-source-apply-plan.csv');
const planMdPath = path.join(outputDir, 'daegu-operator-reference-p13-source-apply-plan.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p13-source-apply-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p13-source-apply-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p13-source-apply-gate.md');

const task = process.argv[2] ?? 'plan';
const requireReady = process.argv.includes('--require-ready');
const requireApproved = process.argv.includes('--require-approved');
const traceVersion = 'DAEGU_OPERATOR_REFERENCE_P11_APPROVED_DRY_RUN_V1';
const sourceTarget = 'src/data/daeguSeatData.ts';

const sourceContractLiterals = [
  'P13 reads the P12 dry-run apply plan and gates source application.',
  'P13 does not write src/data/daeguSeatData.ts.',
  'readyForSourceWrite=false when P12 readyForSourcePatch=false',
  'DAEGU_OPERATOR_REFERENCE_BLOCKS',
  'DAEGU_OPERATOR_REFERENCE_P11_BLOCK_ROWS',
  'DAEGU_OPERATOR_REFERENCE_P11_APPROVED_DRY_RUN_V1',
  'p13-source-apply-plan-ready',
  'p13-source-apply-gate-waiting-for-approved-rows',
  'p13-source-apply-gate-source-write-ready',
  'p13-source-apply-gate-blocked',
  'daegu-operator-reference-p13-source-apply-plan.json',
  'currentSelectableRows',
  'projectedSelectableRows',
  'readyForSourceWrite',
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

function activeOperatorReferenceKeys() {
  return new Set(DAEGU_OPERATOR_REFERENCE_BLOCKS.flatMap((block) => [
    block.id,
    block.name,
    block.block,
    block.block.replace('-', ''),
    ...block.officialBlocks,
  ]));
}

function validateP12Plan(p12Plan) {
  const checks = [];
  const summary = p12Plan.summary ?? {};
  const approvedBlockRows = p12Plan.approvedBlockRows ?? [];
  const existingKeys = activeOperatorReferenceKeys();

  const addCheck = (check, ok, failure = '') => {
    checks.push({
      check,
      status: ok ? 'PASS' : 'FAIL',
      failure,
    });
  };

  addCheck('P12_PLAN_PRESENT', Boolean(p12Plan.status), 'MISSING_P12_PLAN_STATUS');
  addCheck('P12_SOURCE_WRITE_BLOCKED', p12Plan.policy?.sourceDataWritePerformed === false, 'P12_POLICY_MUST_NOT_WRITE_SOURCE');
  addCheck('P12_PRODUCTION_WRITE_BLOCKED', p12Plan.policy?.productionWriteAllowed === false, 'P12_POLICY_MUST_NOT_ALLOW_PRODUCTION_WRITE');
  addCheck('P12_INVALID_ROWS_ZERO', Number(summary.invalidRows) === 0, `P12_INVALID_ROWS_${summary.invalidRows ?? 'UNKNOWN'}`);

  if (summary.readyForSourcePatch) {
    addCheck('P12_READY_HAS_APPROVED_ROWS', Number(summary.approvedRows) > 0, 'P12_READY_WITHOUT_APPROVED_ROWS');
    addCheck('P12_APPROVED_BLOCK_ROWS_MATCH', approvedBlockRows.length === Number(summary.approvedRows), 'P12_APPROVED_BLOCK_ROW_COUNT_MISMATCH');
    addCheck('P12_SOURCE_PATCH_SNIPPET_PRESENT', Boolean(p12Plan.sourcePatchSnippet), 'MISSING_P12_SOURCE_PATCH_SNIPPET');
  } else {
    addCheck('P12_NOT_READY_HAS_NO_APPROVED_BLOCK_ROWS', approvedBlockRows.length === 0, 'P12_NOT_READY_MUST_NOT_EXPOSE_APPROVED_BLOCK_ROWS');
    addCheck('P12_NOT_READY_HAS_NO_SOURCE_PATCH_SNIPPET', !p12Plan.sourcePatchSnippet, 'P12_NOT_READY_MUST_NOT_EXPOSE_SOURCE_PATCH_SNIPPET');
  }

  approvedBlockRows.forEach((row) => {
    const duplicate = existingKeys.has(row.id)
      || existingKeys.has(row.name)
      || existingKeys.has(row.block)
      || existingKeys.has(String(row.block).replace('-', ''));
    addCheck(`NO_DUPLICATE_ACTIVE_KEY_${row.id}`, !duplicate, `DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK:${row.id}`);
  });

  return checks;
}

function summarize(p12Plan, checks) {
  const failedChecks = checks.filter((row) => row.status === 'FAIL');
  const p12Summary = p12Plan.summary ?? {};
  const approvedBlockRows = p12Plan.approvedBlockRows ?? [];
  const currentSelectableRows = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const readyForSourceWrite = failedChecks.length === 0
    && p12Summary.readyForSourcePatch === true
    && approvedBlockRows.length > 0;
  const status = failedChecks.length
    ? 'p13-source-apply-gate-blocked'
    : readyForSourceWrite
      ? 'p13-source-apply-gate-source-write-ready'
      : 'p13-source-apply-gate-waiting-for-approved-rows';

  return {
    status,
    p12Status: p12Summary.status,
    totalRows: Number(p12Summary.totalRows ?? 0),
    approvedRows: Number(p12Summary.approvedRows ?? 0),
    pendingRows: Number(p12Summary.pendingRows ?? 0),
    invalidRows: Number(p12Summary.invalidRows ?? 0),
    approvedBlockRows: approvedBlockRows.length,
    currentSelectableRows,
    projectedSelectableRows: currentSelectableRows + approvedBlockRows.length,
    readyForSourceWrite,
    sourceTarget,
    traceVersion,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
}

async function buildPlanPayload() {
  const p12Plan = await readJson(p12PlanJsonPath);
  const checks = validateP12Plan(p12Plan);
  const summary = summarize(p12Plan, checks);

  return {
    status: 'p13-source-apply-plan-ready',
    generatedAt: new Date().toISOString(),
    source: {
      p12Plan: 'reports/stadium/daegu-operator-reference-p12-dry-run-apply/daegu-operator-reference-p12-dry-run-apply-plan.json',
      sourceTarget,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      note: 'P13 reads the P12 dry-run apply plan and gates source application. P13 does not write src/data/daeguSeatData.ts. readyForSourceWrite=false when P12 readyForSourcePatch=false.',
      applyRule: 'Only when readyForSourceWrite=true may a later explicit source patch add DAEGU_OPERATOR_REFERENCE_P11_BLOCK_ROWS to DAEGU_OPERATOR_REFERENCE_BLOCKS.',
    },
    summary,
    checks,
    approvedBlockRows: summary.readyForSourceWrite ? p12Plan.approvedBlockRows : [],
    sourcePatchSnippet: summary.readyForSourceWrite ? p12Plan.sourcePatchSnippet : '',
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
  await fs.writeFile(planCsvPath, buildCsv(payload.checks, ['check', 'status', 'failure']));
  await fs.writeFile(planMdPath, [
    '# 대구 operator reference P13 source apply plan',
    '',
    `- status: \`${payload.status}\``,
    `- gate status: \`${payload.summary.status}\``,
    `- approved rows: \`${payload.summary.approvedRows}\``,
    `- pending rows: \`${payload.summary.pendingRows}\``,
    `- invalid rows: \`${payload.summary.invalidRows}\``,
    `- approved block rows: \`${payload.summary.approvedBlockRows}\``,
    `- current selectable rows: \`${payload.summary.currentSelectableRows}\``,
    `- projected selectable rows: \`${payload.summary.projectedSelectableRows}\``,
    `- ready for source write: \`${payload.summary.readyForSourceWrite}\``,
    `- production write allowed: \`${payload.summary.productionWriteAllowed}\``,
    `- source data write performed: \`${payload.summary.sourceDataWritePerformed}\``,
    '',
    '## Checks',
    '',
    ...payload.checks.map((row) => `- \`${row.check}\`: \`${row.status}\`${row.failure ? ` (${row.failure})` : ''}`),
    '',
  ].join('\n'));

  console.log(`status:${payload.status} gateStatus=${payload.summary.status} approvedRows=${payload.summary.approvedRows} readyForSourceWrite=${payload.summary.readyForSourceWrite}`);
}

async function writeGate() {
  const plan = await readJson(planJsonPath);
  const summary = plan.summary;
  const checks = plan.checks ?? [];

  if (requireReady && summary.status === 'p13-source-apply-gate-blocked') {
    throw new Error(`P13 source apply gate blocked: failedChecks=${checks.filter((row) => row.status === 'FAIL').length}`);
  }
  if (requireApproved && !summary.readyForSourceWrite) {
    throw new Error(`P13 source apply gate has no approved source write rows: approvedRows=${summary.approvedRows} readyForSourceWrite=${summary.readyForSourceWrite}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, checks }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(checks, ['check', 'status', 'failure']));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P13 source apply gate',
    '',
    `- status: \`${summary.status}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- approved block rows: \`${summary.approvedBlockRows}\``,
    `- current selectable rows: \`${summary.currentSelectableRows}\``,
    `- projected selectable rows: \`${summary.projectedSelectableRows}\``,
    `- ready for source write: \`${summary.readyForSourceWrite}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approvedRows=${summary.approvedRows} readyForSourceWrite=${summary.readyForSourceWrite} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'plan') {
  await writePlan();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
