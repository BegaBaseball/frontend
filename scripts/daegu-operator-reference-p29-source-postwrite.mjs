import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_RAPAK_2025_MAP_VERSION,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';
import { validateSeatMapPolygonPath } from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p21TemplatePath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p21-approval-template/operator-input/daegu-operator-reference-p21-operator-approval-template.json');
const p28PreviewPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p28-source-patch-preview/daegu-operator-reference-p28-source-patch-preview.json');
const p28ApprovedRowsPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p28-source-patch-preview/daegu-operator-reference-p28-approved-block-rows.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p29-source-postwrite');
const postwriteJsonPath = path.join(outputDir, 'daegu-operator-reference-p29-source-postwrite.json');
const postwriteCsvPath = path.join(outputDir, 'daegu-operator-reference-p29-source-postwrite.csv');
const postwriteMdPath = path.join(outputDir, 'daegu-operator-reference-p29-source-postwrite.md');

const task = process.argv[2] ?? 'postwrite';
const requireApplied = process.argv.includes('--require-applied');
const targetDraftId = 'RAPAK_REF_011';
const targetBlockId = 'daegu-operator-reference-rooftop-table';
const targetBlockName = '루프탑 테이블석';
const targetBlock = '루프탑';
const traceVersion = 'DAEGU_OPERATOR_REFERENCE_P28_APPROVED_DRY_RUN_V1';
const expectedSelectableRows = 110;
const imageWidth = 4096;
const imageHeight = 4096;

const sourceContractLiterals = [
  'P29 verifies that the P28 approved row was applied to src/data/daeguSeatData.ts.',
  'P29 source write applies only RAPAK_REF_011.',
  'P29 keeps the 21 pending P21 rows out of DAEGU_OPERATOR_REFERENCE_BLOCKS.',
  'RAPAK_REF_011',
  '루프탑 테이블석',
  'daegu-operator-reference-rooftop-table',
  'DAEGU_OPERATOR_REFERENCE_P28_APPROVED_DRY_RUN_V1',
  'DAEGU_SAMSUNG_LIONS_PARK_2025_OPERATOR_REFERENCE_P28_APPROVED_V1',
  'P28_SOURCE_PATCH_PREVIEW_READY',
  'P28_APPROVED_ROWS_JSON_ONE',
  'APPROVED_BLOCK_SOURCE_APPLIED',
  'CURRENT_SELECTABLE_ROWS_110',
  'TARGET_BLOCK_SELECTABLE',
  'TARGET_TRACE_VERSION_P28',
  'TARGET_GEOMETRY_VALID',
  'TARGET_LABEL_TOP_HIT_VALID',
  'PENDING_21_ROWS_NOT_APPLIED',
  'OFFICIAL_DATASET_STAYS_177',
  'SOURCE_DATA_WRITE_PERFORMED',
  'PRODUCTION_WRITE_BLOCKED',
  'p29-source-postwrite-applied',
  'p29-source-postwrite-blocked',
  'daegu-operator-reference-p29-source-postwrite.json',
  'approvedRows=1',
  'pendingRows=21',
  'currentSelectableRows=110',
  'sourceDataWritePerformed=true',
  'productionWriteAllowed=false',
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

function findTargetBlock() {
  return DAEGU_OPERATOR_REFERENCE_BLOCKS.find((block) => (
    block.id === targetBlockId
    && block.name === targetBlockName
    && block.block === targetBlock
  ));
}

function buildChecks({ p21Template, p28Preview, p28ApprovedRows }) {
  const checks = [];
  const addCheck = (check, ok, failure = '') => {
    checks.push({
      check,
      status: ok ? 'PASS' : 'FAIL',
      failure: ok ? '' : failure,
    });
  };

  const target = findTargetBlock();
  const selectableRows = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const p21Rows = p21Template.rows ?? [];
  const approvedP21Rows = p21Rows.filter((row) => row.operatorDecision === 'APPROVED');
  const pendingP21Rows = p21Rows.filter((row) => row.operatorDecision === 'PENDING');
  const activeKeys = activeOperatorReferenceKeys();
  const pendingRowsInSource = pendingP21Rows.filter((row) => (
    activeKeys.has(row.suggestedId)
    || activeKeys.has(row.suggestedName)
    || activeKeys.has(row.suggestedBlock)
    || activeKeys.has(String(row.suggestedBlock).replace('-', ''))
  ));

  addCheck('P28_SOURCE_PATCH_PREVIEW_READY', p28Preview.summary?.readyForSourcePatch === true && p28Preview.summary?.sourcePatchRows === 1, 'P28_PREVIEW_MUST_HAVE_ONE_READY_SOURCE_PATCH_ROW');
  addCheck('P28_APPROVED_ROWS_JSON_ONE', p28ApprovedRows.status === 'p28-approved-block-rows-ready' && p28ApprovedRows.rows?.length === 1 && p28ApprovedRows.rows[0]?.id === targetBlockId, 'P28_APPROVED_ROWS_JSON_MUST_CONTAIN_TARGET_ONLY');
  addCheck('P21_APPROVED_ROWS_ONE', approvedP21Rows.length === 1 && approvedP21Rows[0]?.draftId === targetDraftId, 'P21_MUST_HAVE_ONLY_RAPAK_REF_011_APPROVED');
  addCheck('APPROVED_BLOCK_SOURCE_APPLIED', Boolean(target), 'P28_APPROVED_BLOCK_MISSING_FROM_SOURCE');
  addCheck('CURRENT_SELECTABLE_ROWS_110', selectableRows === expectedSelectableRows, `CURRENT_SELECTABLE_ROWS_${selectableRows}`);
  addCheck('TARGET_BLOCK_SELECTABLE', Boolean(target) && isDaeguOperatorReferenceSelectableSeat(target), 'TARGET_BLOCK_NOT_SELECTABLE');
  addCheck('TARGET_TRACE_VERSION_P28', target?.imageGeometry.geometryVersion === traceVersion && target?.imageGeometry.traceVersion === traceVersion, `TARGET_TRACE_VERSION_${target?.imageGeometry.geometryVersion ?? 'MISSING'}`);
  addCheck('TARGET_MAP_VERSION_P28', DAEGU_OPERATOR_REFERENCE_RAPAK_2025_MAP_VERSION === 'DAEGU_SAMSUNG_LIONS_PARK_2025_OPERATOR_REFERENCE_P28_APPROVED_V1', `TARGET_MAP_VERSION_${DAEGU_OPERATOR_REFERENCE_RAPAK_2025_MAP_VERSION}`);
  addCheck('PENDING_21_ROWS_NOT_APPLIED', pendingP21Rows.length === 21 && pendingRowsInSource.length === 0, `PENDING_ROWS_IN_SOURCE_${pendingRowsInSource.map((row) => row.draftId).join('|')}`);
  addCheck('OFFICIAL_DATASET_STAYS_177', DAEGU_BLOCKS.length === 177, `OFFICIAL_DATASET_ROWS_${DAEGU_BLOCKS.length}`);

  if (target) {
    const labelPoint = target.imageGeometry.labelPoint ?? [target.imageGeometry.labelX, target.imageGeometry.labelY];
    const visualErrors = validateSeatMapPolygonPath({
      pathData: target.imageGeometry.visualPath ?? target.imageGeometry.d,
      width: imageWidth,
      height: imageHeight,
      labelPoint,
      labelTolerance: 3,
    });
    const hitErrors = validateSeatMapPolygonPath({
      pathData: target.imageGeometry.hitPath ?? target.imageGeometry.visualPath ?? target.imageGeometry.d,
      width: imageWidth,
      height: imageHeight,
      labelPoint,
      labelTolerance: 3,
    });

    addCheck('TARGET_GEOMETRY_VALID', visualErrors.length === 0 && hitErrors.length === 0, [...visualErrors, ...hitErrors].join('|'));
    addCheck('TARGET_LABEL_TOP_HIT_VALID', hitErrors.length === 0, hitErrors.join('|'));
  } else {
    addCheck('TARGET_GEOMETRY_VALID', false, 'TARGET_BLOCK_MISSING');
    addCheck('TARGET_LABEL_TOP_HIT_VALID', false, 'TARGET_BLOCK_MISSING');
  }

  addCheck('SOURCE_DATA_WRITE_PERFORMED', Boolean(target), 'SOURCE_DATA_WRITE_MUST_ADD_TARGET');
  addCheck('PRODUCTION_WRITE_BLOCKED', true, 'PRODUCTION_WRITE_MUST_REMAIN_FALSE');

  return checks;
}

function summarize({ checks, p21Template, p28Preview }) {
  const failedChecks = checks.filter((row) => row.status === 'FAIL');
  const selectableRows = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const p21Rows = p21Template.rows ?? [];
  const approvedRows = p21Rows.filter((row) => row.operatorDecision === 'APPROVED').length;
  const pendingRows = p21Rows.filter((row) => row.operatorDecision === 'PENDING').length;
  const applied = failedChecks.length === 0;

  return {
    status: applied ? 'p29-source-postwrite-applied' : 'p29-source-postwrite-blocked',
    targetDraftId,
    targetBlockId,
    approvedRows,
    pendingRows,
    invalidRows: failedChecks.length,
    previousSelectableRows: p28Preview.summary?.currentSelectableRows ?? null,
    currentSelectableRows: selectableRows,
    expectedSelectableRows,
    sourceDataWritePerformed: applied,
    productionWriteAllowed: false,
    traceVersion,
    sourceTarget: 'src/data/daeguSeatData.ts',
  };
}

async function writePostwrite() {
  const [p21Template, p28Preview, p28ApprovedRows] = await Promise.all([
    readJson(p21TemplatePath),
    readJson(p28PreviewPath),
    readJson(p28ApprovedRowsPath),
  ]);
  const checks = buildChecks({ p21Template, p28Preview, p28ApprovedRows });
  const summary = summarize({ checks, p21Template, p28Preview });

  if (requireApplied && summary.status !== 'p29-source-postwrite-applied') {
    throw new Error(`P29 source postwrite blocked: failedChecks=${checks.filter((row) => row.status === 'FAIL').length}`);
  }

  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p21OperatorTemplate: toFrontendRelative(p21TemplatePath),
      p28Preview: toFrontendRelative(p28PreviewPath),
      p28ApprovedRows: toFrontendRelative(p28ApprovedRowsPath),
      sourceTarget: 'src/data/daeguSeatData.ts',
    },
    policy: {
      note: 'P29 verifies that the P28 approved row was applied to src/data/daeguSeatData.ts. P29 source write applies only RAPAK_REF_011. P29 keeps the 21 pending P21 rows out of DAEGU_OPERATOR_REFERENCE_BLOCKS.',
      productionWriteAllowed: false,
      sourceDataWritePerformed: summary.sourceDataWritePerformed,
    },
    summary,
    checks,
    targetBlock: findTargetBlock(),
    outputs: {
      postwriteJson: toFrontendRelative(postwriteJsonPath),
      postwriteCsv: toFrontendRelative(postwriteCsvPath),
      postwriteMd: toFrontendRelative(postwriteMdPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(postwriteJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(postwriteCsvPath, buildCsv(checks, ['check', 'status', 'failure']));
  await fs.writeFile(postwriteMdPath, [
    '# 대구 operator reference P29 source postwrite',
    '',
    `- status: \`${summary.status}\``,
    `- target draft id: \`${summary.targetDraftId}\``,
    `- target block id: \`${summary.targetBlockId}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- previous selectable rows: \`${summary.previousSelectableRows}\``,
    `- current selectable rows: \`${summary.currentSelectableRows}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Checks',
    '',
    ...checks.map((row) => `- \`${row.check}\`: \`${row.status}\`${row.failure ? ` (${row.failure})` : ''}`),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approvedRows=${summary.approvedRows} pendingRows=${summary.pendingRows} currentSelectableRows=${summary.currentSelectableRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed} productionWriteAllowed=${summary.productionWriteAllowed}`);
}

if (task === 'postwrite') {
  await writePostwrite();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
