import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';
import { validateSeatMapPolygonPath } from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p21TemplatePath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p21-approval-template/operator-input/daegu-operator-reference-p21-operator-approval-template.json');
const p27PostwritePath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p27-canonical-approval-write/postwrite/daegu-operator-reference-p27-canonical-approval-postwrite.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p28-source-patch-preview');
const gateDir = path.join(outputDir, 'gate');
const previewJsonPath = path.join(outputDir, 'daegu-operator-reference-p28-source-patch-preview.json');
const previewCsvPath = path.join(outputDir, 'daegu-operator-reference-p28-source-patch-preview.csv');
const previewMdPath = path.join(outputDir, 'daegu-operator-reference-p28-source-patch-preview.md');
const patchTxtPath = path.join(outputDir, 'daegu-operator-reference-p28-source-patch-preview.patch.txt');
const approvedRowsJsonPath = path.join(outputDir, 'daegu-operator-reference-p28-approved-block-rows.json');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p28-source-patch-preview-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p28-source-patch-preview-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p28-source-patch-preview-gate.md');

const task = process.argv[2] ?? 'preview';
const requireReady = process.argv.includes('--require-ready');
const requireApproved = process.argv.includes('--require-approved');
const targetDraftId = 'RAPAK_REF_011';
const imageWidth = 4096;
const imageHeight = 4096;
const traceVersion = 'DAEGU_OPERATOR_REFERENCE_P28_APPROVED_DRY_RUN_V1';

const sourceContractLiterals = [
  'P28 reads P21 canonical approved rows and creates source patch preview only.',
  'P28 requires P27 canonical approval postwrite to be applied.',
  'P28 uses only operatorDecision=APPROVED rows from P21.',
  'P28 excludes the remaining 21 PENDING rows from sourcePatchRows.',
  'P28 does not write src/data/daeguSeatData.ts.',
  'RAPAK_REF_011',
  '루프탑 테이블석',
  'ADD_TO_OPERATOR_REFERENCE_DATASET',
  'DAEGU_OPERATOR_REFERENCE_P28_APPROVED_DRY_RUN_V1',
  'DAEGU_OPERATOR_REFERENCE_P28_BLOCK_ROWS',
  'OPERATOR_REFERENCE_P28_REVIEW_NOTE',
  'createOperatorReferenceApprovedBlockWithTrace',
  'P27_POSTWRITE_APPLIED',
  'P21_APPROVED_ROWS_ONE',
  'PENDING_ROWS_EXCLUDED_FROM_SOURCE_PATCH',
  'NO_DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK',
  'APPROVED_ROW_GEOMETRY_VALID',
  'APPROVED_ROW_LABEL_TOP_HIT_VALID',
  'SOURCE_PATCH_PREVIEW_ONLY',
  'SOURCE_WRITE_BLOCKED',
  'PRODUCTION_WRITE_BLOCKED',
  'readyForSourcePatch=true',
  'p28-source-patch-preview-ready',
  'p28-source-patch-preview-blocked',
  'p28-source-patch-preview-gate-ready',
  'p28-source-patch-preview-gate-blocked',
  'daegu-operator-reference-p28-source-patch-preview.json',
  'daegu-operator-reference-p28-approved-block-rows.json',
  'daegu-operator-reference-p28-source-patch-preview.patch.txt',
  'approvedRows=1',
  'pendingRows=21',
  'sourcePatchRows=1',
  'currentSelectableRows=109',
  'projectedSelectableRows=110',
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

function validateApprovedRow(row, existingKeys) {
  const failures = [];

  if (row.operatorDecision === 'PENDING') {
    return {
      validationStatus: 'PENDING_OPERATOR_DECISION',
      failures,
    };
  }

  if (row.operatorDecision !== 'APPROVED') failures.push('OPERATOR_DECISION_NOT_APPROVED');
  if (row.draftId !== targetDraftId) failures.push('UNEXPECTED_APPROVED_DRAFT_ID');
  if (!row.suggestedId || existingKeys.has(row.suggestedId)) failures.push('DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK');
  if (!row.suggestedName || existingKeys.has(row.suggestedName)) failures.push('DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK');
  if (!row.suggestedBlock || existingKeys.has(row.suggestedBlock) || existingKeys.has(String(row.suggestedBlock).replace('-', ''))) failures.push('DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK');
  if (!row.correctedPath) failures.push('MISSING_CORRECTED_PATH');
  if (!row.correctedHitPath) failures.push('MISSING_CORRECTED_HIT_PATH');
  if (!Number.isFinite(Number(row.correctedLabelX))) failures.push('MISSING_CORRECTED_LABEL_X');
  if (!Number.isFinite(Number(row.correctedLabelY))) failures.push('MISSING_CORRECTED_LABEL_Y');
  if (!row.reviewer) failures.push('MISSING_REVIEWER');
  if (!row.reviewedAt) failures.push('MISSING_REVIEWED_AT');

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
      labelPoint: [Number(row.correctedLabelX), Number(row.correctedLabelY)],
      labelTolerance: 3,
    }).forEach((failure) => failures.push(`correctedHitPath:${failure}`));
  }

  return {
    validationStatus: failures.length === 0 ? 'APPROVED_SOURCE_PATCH_READY' : 'INVALID',
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
      p27Postwrite: 'reports/stadium/daegu-operator-reference-p27-canonical-approval-write/postwrite/daegu-operator-reference-p27-canonical-approval-postwrite.json',
      sourceDraftVisualPath: row.draftVisualPath,
      sourceDraftHitPath: row.draftHitPath,
      sourceDraftLabelPoint: [Number(row.draftLabelX), Number(row.draftLabelY)],
    },
  };
}

function buildSourcePatchSnippet(blockRows) {
  if (blockRows.length === 0) return '';
  return [
    "const OPERATOR_REFERENCE_P28_REVIEW_NOTE = 'operatorDecision=APPROVED correctedPath/correctedLabelX/Y 반영 완료. reviewer=codex-image-review; reviewedAt=2026-05-24T23:15:00+09:00. P28 rooftop table operator reference evidence 반영.';",
    `const OPERATOR_REFERENCE_P28_TRACE_VERSION: DaeguTraceVersion = '${traceVersion}';`,
    '',
    `const DAEGU_OPERATOR_REFERENCE_P28_BLOCK_ROWS: DaeguOperatorReferenceApprovedBlockRow[] = ${JSON.stringify(blockRows, null, 2)};`,
    '',
    '...DAEGU_OPERATOR_REFERENCE_P28_BLOCK_ROWS.map((row) => createOperatorReferenceApprovedBlockWithTrace(row, {',
    '  reviewNote: OPERATOR_REFERENCE_P28_REVIEW_NOTE,',
    '  traceVersion: OPERATOR_REFERENCE_P28_TRACE_VERSION,',
    '})),',
    '',
  ].join('\n');
}

function buildChecks({ p27Postwrite, validations, approvedBlockRows, currentSelectableRows }) {
  const checks = [];
  const addCheck = (check, ok, failure = '') => {
    checks.push({
      check,
      status: ok ? 'PASS' : 'FAIL',
      failure: ok ? '' : failure,
    });
  };
  const approvedRows = validations.filter((row) => row.validationStatus === 'APPROVED_SOURCE_PATCH_READY');
  const pendingRows = validations.filter((row) => row.validationStatus === 'PENDING_OPERATOR_DECISION');
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');

  addCheck('P27_POSTWRITE_APPLIED', p27Postwrite.summary?.status === 'p27-canonical-approval-postwrite-applied' && p27Postwrite.summary?.invalidRows === 0, 'P27_POSTWRITE_MUST_BE_APPLIED');
  addCheck('P21_APPROVED_ROWS_ONE', approvedRows.length === 1 && approvedRows[0]?.draftId === targetDraftId, 'P21_MUST_HAVE_ONE_TARGET_APPROVED_ROW');
  addCheck('PENDING_ROWS_EXCLUDED_FROM_SOURCE_PATCH', pendingRows.length === 21 && approvedBlockRows.length === approvedRows.length, 'PENDING_ROWS_MUST_NOT_BECOME_SOURCE_PATCH_ROWS');
  addCheck('NO_DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK', validations.every((row) => !String(row.failures).includes('DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK')), 'P28_DUPLICATE_ACTIVE_OPERATOR_REFERENCE_BLOCK');
  addCheck('APPROVED_ROW_GEOMETRY_VALID', invalidRows.length === 0 && approvedRows.length === 1, 'P28_APPROVED_ROW_GEOMETRY_INVALID');
  addCheck('APPROVED_ROW_LABEL_TOP_HIT_VALID', approvedRows.length === 1 && approvedBlockRows.length === 1, 'P28_APPROVED_ROW_LABEL_TOP_HIT_INVALID');
  addCheck('SOURCE_PATCH_PREVIEW_ONLY', true, 'P28_PREVIEW_ONLY');
  addCheck('SOURCE_WRITE_BLOCKED', true, 'P28_SOURCE_WRITE_MUST_BE_FALSE');
  addCheck('PRODUCTION_WRITE_BLOCKED', true, 'P28_PRODUCTION_WRITE_MUST_BE_FALSE');
  addCheck('CURRENT_SELECTABLE_ROWS_109', currentSelectableRows === 109, `CURRENT_SELECTABLE_ROWS_${currentSelectableRows}`);

  return checks;
}

function summarize({ validations, approvedBlockRows, checks, currentSelectableRows }) {
  const approvedRows = validations.filter((row) => row.validationStatus === 'APPROVED_SOURCE_PATCH_READY').length;
  const pendingRows = validations.filter((row) => row.validationStatus === 'PENDING_OPERATOR_DECISION').length;
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID').length + checks.filter((row) => row.status === 'FAIL').length;
  const readyForSourcePatch = approvedRows === 1 && pendingRows === 21 && invalidRows === 0 && approvedBlockRows.length === 1;

  return {
    status: readyForSourcePatch ? 'p28-source-patch-preview-ready' : 'p28-source-patch-preview-blocked',
    targetDraftId,
    totalRows: validations.length,
    approvedRows,
    pendingRows,
    invalidRows,
    sourcePatchRows: approvedBlockRows.length,
    currentSelectableRows,
    projectedSelectableRows: currentSelectableRows + approvedBlockRows.length,
    readyForSourcePatch,
    sourcePatchTarget: 'src/data/daeguSeatData.ts',
    traceVersion,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
  };
}

async function buildPreviewPayload() {
  const p21Template = await readJson(p21TemplatePath);
  const p27Postwrite = await readJson(p27PostwritePath);
  const existingKeys = activeOperatorReferenceKeys();
  const rows = p21Template.rows ?? [];
  const validations = rows.map((row) => {
    const result = validateApprovedRow(row, existingKeys);
    return {
      draftId: row.draftId,
      visibleLabel: row.visibleLabel,
      suggestedId: row.suggestedId,
      suggestedBlock: row.suggestedBlock,
      operatorDecision: row.operatorDecision,
      validationStatus: result.validationStatus,
      failures: result.failures.join('|'),
    };
  });
  const approvedRows = rows.filter((row) => validations.some((validation) => validation.draftId === row.draftId && validation.validationStatus === 'APPROVED_SOURCE_PATCH_READY'));
  const approvedBlockRows = approvedRows.map(toBlockRow);
  const currentSelectableRows = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const checks = buildChecks({
    p27Postwrite,
    validations,
    approvedBlockRows,
    currentSelectableRows,
  });
  const summary = summarize({
    validations,
    approvedBlockRows,
    checks,
    currentSelectableRows,
  });
  const sourcePatchSnippet = buildSourcePatchSnippet(approvedBlockRows);

  return {
    status: 'p28-source-patch-preview-plan-ready',
    generatedAt: new Date().toISOString(),
    source: {
      p21OperatorTemplate: 'reports/stadium/daegu-operator-reference-p21-approval-template/operator-input/daegu-operator-reference-p21-operator-approval-template.json',
      p27Postwrite: 'reports/stadium/daegu-operator-reference-p27-canonical-approval-write/postwrite/daegu-operator-reference-p27-canonical-approval-postwrite.json',
      viewBox: '0 0 4096 4096',
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      note: 'P28 reads P21 canonical approved rows and creates source patch preview only. P28 requires P27 canonical approval postwrite to be applied. P28 uses only operatorDecision=APPROVED rows from P21. P28 excludes the remaining 21 PENDING rows from sourcePatchRows. P28 does not write src/data/daeguSeatData.ts.',
      applyRule: 'A later explicit P29 source write may use approvedBlockRows only when readyForSourcePatch=true.',
    },
    summary,
    checks,
    validations,
    approvedBlockRows,
    sourcePatchSnippet,
    outputs: {
      previewJson: toFrontendRelative(previewJsonPath),
      previewCsv: toFrontendRelative(previewCsvPath),
      previewMd: toFrontendRelative(previewMdPath),
      patchTxt: toFrontendRelative(patchTxtPath),
      approvedRowsJson: toFrontendRelative(approvedRowsJsonPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };
}

async function writePreview() {
  const payload = await buildPreviewPayload();

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(previewJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(approvedRowsJsonPath, `${JSON.stringify({
    status: 'p28-approved-block-rows-ready',
    traceVersion,
    rows: payload.approvedBlockRows,
  }, null, 2)}\n`);
  await fs.writeFile(previewCsvPath, buildCsv(payload.validations, [
    'draftId',
    'visibleLabel',
    'suggestedId',
    'suggestedBlock',
    'operatorDecision',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(patchTxtPath, payload.sourcePatchSnippet);
  await fs.writeFile(previewMdPath, [
    '# 대구 operator reference P28 source patch preview',
    '',
    `- status: \`${payload.summary.status}\``,
    `- target draft id: \`${payload.summary.targetDraftId}\``,
    `- approved rows: \`${payload.summary.approvedRows}\``,
    `- pending rows: \`${payload.summary.pendingRows}\``,
    `- invalid rows: \`${payload.summary.invalidRows}\``,
    `- source patch rows: \`${payload.summary.sourcePatchRows}\``,
    `- current selectable rows: \`${payload.summary.currentSelectableRows}\``,
    `- projected selectable rows: \`${payload.summary.projectedSelectableRows}\``,
    `- ready for source patch: \`${payload.summary.readyForSourcePatch}\``,
    `- source data write performed: \`${payload.summary.sourceDataWritePerformed}\``,
    `- production write allowed: \`${payload.summary.productionWriteAllowed}\``,
    '',
    '## Checks',
    '',
    ...payload.checks.map((row) => `- \`${row.check}\`: \`${row.status}\`${row.failure ? ` (${row.failure})` : ''}`),
    '',
    '## Patch Preview',
    '',
    `See \`${toFrontendRelative(patchTxtPath)}\`.`,
    '',
  ].join('\n'));

  console.log(`status:${payload.summary.status} approvedRows=${payload.summary.approvedRows} pendingRows=${payload.summary.pendingRows} invalidRows=${payload.summary.invalidRows} sourcePatchRows=${payload.summary.sourcePatchRows} readyForSourcePatch=${payload.summary.readyForSourcePatch}`);
}

async function writeGate() {
  const preview = await readJson(previewJsonPath);
  const summary = preview.summary;
  const checks = preview.checks ?? [];
  const gateStatus = summary.readyForSourcePatch
    ? 'p28-source-patch-preview-gate-ready'
    : 'p28-source-patch-preview-gate-blocked';

  if (requireReady && gateStatus === 'p28-source-patch-preview-gate-blocked') {
    throw new Error(`P28 source patch preview gate blocked: invalidRows=${summary.invalidRows}`);
  }
  if (requireApproved && !summary.readyForSourcePatch) {
    throw new Error(`P28 source patch preview gate has no approved source patch row: approvedRows=${summary.approvedRows} invalidRows=${summary.invalidRows}`);
  }

  const gatePayload = {
    status: gateStatus,
    summary,
    checks,
    validations: preview.validations ?? [],
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify(gatePayload, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(checks, ['check', 'status', 'failure']));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P28 source patch preview gate',
    '',
    `- status: \`${gateStatus}\``,
    `- preview status: \`${summary.status}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- current selectable rows: \`${summary.currentSelectableRows}\``,
    `- projected selectable rows: \`${summary.projectedSelectableRows}\``,
    `- ready for source patch: \`${summary.readyForSourcePatch}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Checks',
    '',
    ...checks.map((row) => `- \`${row.check}\`: \`${row.status}\`${row.failure ? ` (${row.failure})` : ''}`),
    '',
  ].join('\n'));

  console.log(`status:${gateStatus} approvedRows=${summary.approvedRows} pendingRows=${summary.pendingRows} invalidRows=${summary.invalidRows} sourcePatchRows=${summary.sourcePatchRows} readyForSourcePatch=${summary.readyForSourcePatch}`);
}

if (task === 'preview') {
  await writePreview();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
