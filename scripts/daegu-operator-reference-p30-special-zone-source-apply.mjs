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
const p21TemplateCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p21-approval-template/operator-input/daegu-operator-reference-p21-operator-approval-template.csv');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p30-special-zone-source-apply');
const approvalWriteJsonPath = path.join(outputDir, 'daegu-operator-reference-p30-special-zone-approval-write.json');
const approvalWriteCsvPath = path.join(outputDir, 'daegu-operator-reference-p30-special-zone-approval-write.csv');
const approvalWriteMdPath = path.join(outputDir, 'daegu-operator-reference-p30-special-zone-approval-write.md');
const postwriteJsonPath = path.join(outputDir, 'daegu-operator-reference-p30-special-zone-postwrite.json');
const postwriteCsvPath = path.join(outputDir, 'daegu-operator-reference-p30-special-zone-postwrite.csv');
const postwriteMdPath = path.join(outputDir, 'daegu-operator-reference-p30-special-zone-postwrite.md');

const task = process.argv[2] ?? 'write-approval';
const requireApplied = process.argv.includes('--require-applied');
const approvalReviewer = 'codex-image-review';
const approvalReviewedAt = '2026-05-25T00:45:00+09:00';
const traceVersion = 'DAEGU_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_APPROVED_V1';
const expectedMapVersion = 'DAEGU_SAMSUNG_LIONS_PARK_2025_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_APPROVED_V1';
const imageWidth = 4096;
const imageHeight = 4096;

const targetRows = [
  {
    draftId: 'RAPAK_REF_054',
    id: 'daegu-operator-reference-party-floor',
    block: '파티플로어',
    name: '파티플로어석',
  },
  {
    draftId: 'RAPAK_REF_057',
    id: 'daegu-operator-reference-grass-zone',
    block: '잔디석',
    name: '잔디석',
  },
  {
    draftId: 'RAPAK_REF_058',
    id: 'daegu-operator-reference-imbank-camping-zone',
    block: 'IM뱅크 캠핑존',
    name: 'IM뱅크 캠핑존',
  },
  {
    draftId: 'RAPAK_REF_187',
    id: 'daegu-operator-reference-sky-yogibo-zone',
    block: 'SKY요기보존',
    name: 'SKY요기보존',
  },
];

const targetDraftIds = new Set(targetRows.map((row) => row.draftId));
const targetBlocks = new Set(targetRows.map((row) => row.block));
const expectedSelectableRows = 114;

const csvColumns = [
  'reviewOrder',
  'draftId',
  'reviewGroup',
  'visibleLabel',
  'suggestedId',
  'suggestedName',
  'suggestedBlock',
  'suggestedCategory',
  'suggestedLevel',
  'suggestedSide',
  'operatorDecision',
  'correctedPath',
  'correctedHitPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'approvalTemplateStatus',
  'templateDecisionType',
  'operatorInstruction',
  'imageColorCoverageRatio',
  'evidenceOverlayPng',
  'expandedOverlayPng',
  'p20RiskFlags',
  'canonicalApplyTarget',
];

const sourceContractLiterals = [
  'P30 approves only four special/large-zone P21 rows.',
  'P30 source write applies RAPAK_REF_054, RAPAK_REF_057, RAPAK_REF_058, RAPAK_REF_187 only.',
  'P30 keeps the remaining 17 SKY S-4~S-20 rows pending.',
  'RAPAK_REF_054',
  'RAPAK_REF_057',
  'RAPAK_REF_058',
  'RAPAK_REF_187',
  '파티플로어석',
  '잔디석',
  'IM뱅크 캠핑존',
  'SKY요기보존',
  'DAEGU_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_APPROVED_V1',
  'DAEGU_SAMSUNG_LIONS_PARK_2025_OPERATOR_REFERENCE_P30_SPECIAL_ZONE_APPROVED_V1',
  'P21_APPROVED_ROWS_FIVE',
  'P21_PENDING_ROWS_SEVENTEEN',
  'TARGET_FOUR_ROWS_APPROVED',
  'APPROVED_FOUR_BLOCKS_SOURCE_APPLIED',
  'CURRENT_SELECTABLE_ROWS_114',
  'TARGET_GEOMETRY_VALID',
  'TARGET_LABEL_TOP_HIT_VALID',
  'PENDING_17_ROWS_NOT_APPLIED',
  'OFFICIAL_DATASET_STAYS_177',
  'SOURCE_DATA_WRITE_PERFORMED',
  'PRODUCTION_WRITE_BLOCKED',
  'p30-special-zone-approval-write-applied',
  'p30-special-zone-approval-write-noop-already-applied',
  'p30-special-zone-approval-write-blocked',
  'p30-special-zone-postwrite-applied',
  'p30-special-zone-postwrite-blocked',
  'daegu-operator-reference-p30-special-zone-approval-write.json',
  'daegu-operator-reference-p30-special-zone-postwrite.json',
  'approvedRows=5',
  'pendingRows=17',
  'targetApprovedRows=4',
  'currentSelectableRows=114',
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

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function rowCounts(rows) {
  return {
    totalRows: rows.length,
    approvedRows: rows.filter((row) => row.operatorDecision === 'APPROVED').length,
    pendingRows: rows.filter((row) => row.operatorDecision === 'PENDING').length,
  };
}

function targetIsApproved(row) {
  return row?.operatorDecision === 'APPROVED'
    && row?.reviewer === approvalReviewer
    && row?.reviewedAt === approvalReviewedAt;
}

function buildApprovalCandidate(template) {
  const candidate = cloneJson(template);
  candidate.rows = (candidate.rows ?? []).map((row) => {
    if (!targetDraftIds.has(row.draftId)) return row;
    return {
      ...row,
      operatorDecision: 'APPROVED',
      reviewer: approvalReviewer,
      reviewedAt: approvalReviewedAt,
    };
  });
  return candidate;
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

function findBlock(target) {
  return DAEGU_OPERATOR_REFERENCE_BLOCKS.find((block) => (
    block.id === target.id
    && block.name === target.name
    && block.block === target.block
  ));
}

function buildApprovalChecks(template, candidate) {
  const checks = [];
  const addCheck = (check, ok, failure = '') => {
    checks.push({
      check,
      status: ok ? 'PASS' : 'FAIL',
      failure: ok ? '' : failure,
    });
  };
  const rows = template.rows ?? [];
  const candidateRows = candidate.rows ?? [];
  const counts = rowCounts(rows);
  const candidateCounts = rowCounts(candidateRows);
  const targetCurrentRows = rows.filter((row) => targetDraftIds.has(row.draftId));
  const targetCandidateRows = candidateRows.filter((row) => targetDraftIds.has(row.draftId));
  const existingKeys = activeOperatorReferenceKeys();
  const targetAlreadyApproved = targetCurrentRows.every(targetIsApproved);
  const nonTargetChangedRows = rows.filter((row, index) => !targetDraftIds.has(row.draftId) && JSON.stringify(row) !== JSON.stringify(candidateRows[index]));
  const duplicateSourceTargets = targetCandidateRows.filter((row) => (
    existingKeys.has(row.suggestedId)
    || existingKeys.has(row.suggestedName)
    || existingKeys.has(row.suggestedBlock)
    || existingKeys.has(String(row.suggestedBlock).replace('-', ''))
  ));
  const sourceTargetsAlreadyApplied = targetRows.every((target) => {
    const block = findBlock(target);
    return block?.imageGeometry.geometryVersion === traceVersion
      && block?.imageGeometry.traceVersion === traceVersion;
  });

  addCheck('P21_TEMPLATE_HAS_22_ROWS', counts.totalRows === 22 && candidateCounts.totalRows === 22, `P21_ROWS_${counts.totalRows}`);
  addCheck('P21_CURRENT_HAS_ONE_APPROVED_OR_TARGETS_ALREADY_APPROVED', counts.approvedRows === 1 || (counts.approvedRows === 5 && targetAlreadyApproved), `CURRENT_APPROVED_ROWS_${counts.approvedRows}`);
  addCheck('P21_APPROVED_ROWS_FIVE', candidateCounts.approvedRows === 5, `PROJECTED_APPROVED_ROWS_${candidateCounts.approvedRows}`);
  addCheck('P21_PENDING_ROWS_SEVENTEEN', candidateCounts.pendingRows === 17, `PROJECTED_PENDING_ROWS_${candidateCounts.pendingRows}`);
  addCheck('TARGET_FOUR_ROWS_PRESENT', targetCurrentRows.length === 4 && targetCandidateRows.length === 4, `TARGET_ROWS_${targetCurrentRows.length}`);
  addCheck('TARGET_FOUR_ROWS_APPROVED', targetCandidateRows.every(targetIsApproved), 'P30_TARGET_ROWS_MUST_BE_APPROVED');
  addCheck('NON_TARGET_ROWS_UNCHANGED', nonTargetChangedRows.length === 0, `NON_TARGET_CHANGED_${nonTargetChangedRows.map((row) => row.draftId).join('|')}`);
  addCheck('TARGET_GEOMETRY_UNCHANGED', targetCurrentRows.every((row) => {
    const nextRow = targetCandidateRows.find((candidateRow) => candidateRow.draftId === row.draftId);
    return nextRow
      && row.correctedPath === nextRow.correctedPath
      && row.correctedHitPath === nextRow.correctedHitPath
      && Number(row.correctedLabelX) === Number(nextRow.correctedLabelX)
      && Number(row.correctedLabelY) === Number(nextRow.correctedLabelY);
  }), 'P30_TARGET_GEOMETRY_CHANGED');
  addCheck('TARGET_FOUR_SOURCE_KEYS_NOT_UNRELATED_ACTIVE', duplicateSourceTargets.length === 0 || targetAlreadyApproved || sourceTargetsAlreadyApplied, `P30_DUPLICATE_SOURCE_TARGET_${duplicateSourceTargets.map((row) => row.draftId).join('|')}`);
  addCheck('SOURCE_WRITE_BLOCKED_DURING_APPROVAL_WRITE', true, 'P30_APPROVAL_WRITE_MUST_NOT_TOUCH_SOURCE');
  addCheck('PRODUCTION_WRITE_BLOCKED', true, 'PRODUCTION_WRITE_MUST_REMAIN_FALSE');

  return checks;
}

async function writeApproval() {
  const template = await readJson(p21TemplatePath);
  const candidate = buildApprovalCandidate(template);
  const checks = buildApprovalChecks(template, candidate);
  const failedChecks = checks.filter((row) => row.status === 'FAIL');
  const targetCurrentRows = (template.rows ?? []).filter((row) => targetDraftIds.has(row.draftId));
  const alreadyApplied = failedChecks.length === 0 && targetCurrentRows.every(targetIsApproved);
  const shouldWrite = failedChecks.length === 0 && !alreadyApplied;
  const summary = {
    status: failedChecks.length
      ? 'p30-special-zone-approval-write-blocked'
      : alreadyApplied
        ? 'p30-special-zone-approval-write-noop-already-applied'
        : 'p30-special-zone-approval-write-applied',
    targetDraftIds: Array.from(targetDraftIds),
    approvedRows: rowCounts(candidate.rows ?? []).approvedRows,
    pendingRows: rowCounts(candidate.rows ?? []).pendingRows,
    targetApprovedRows: (candidate.rows ?? []).filter((row) => targetDraftIds.has(row.draftId) && targetIsApproved(row)).length,
    invalidRows: failedChecks.length,
    approvalReviewer,
    approvalReviewedAt,
    canonicalApprovalTemplateWritePerformed: shouldWrite,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
  };

  await fs.mkdir(outputDir, { recursive: true });
  if (shouldWrite) {
    await fs.writeFile(p21TemplatePath, `${JSON.stringify(candidate, null, 2)}\n`);
    await fs.writeFile(p21TemplateCsvPath, buildCsv(candidate.rows ?? [], csvColumns));
  }

  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p21OperatorTemplate: toFrontendRelative(p21TemplatePath),
      p21OperatorTemplateCsv: toFrontendRelative(p21TemplateCsvPath),
    },
    policy: {
      note: 'P30 approves only four special/large-zone P21 rows. P30 source write applies RAPAK_REF_054, RAPAK_REF_057, RAPAK_REF_058, RAPAK_REF_187 only. P30 keeps the remaining 17 SKY S-4~S-20 rows pending.',
      sourceDataWritePerformed: false,
      productionWriteAllowed: false,
    },
    summary,
    checks,
    approvedTargets: (candidate.rows ?? []).filter((row) => targetDraftIds.has(row.draftId)),
    outputs: {
      approvalWriteJson: toFrontendRelative(approvalWriteJsonPath),
      approvalWriteCsv: toFrontendRelative(approvalWriteCsvPath),
      approvalWriteMd: toFrontendRelative(approvalWriteMdPath),
    },
  };

  await fs.writeFile(approvalWriteJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(approvalWriteCsvPath, buildCsv(checks, ['check', 'status', 'failure']));
  await fs.writeFile(approvalWriteMdPath, [
    '# 대구 operator reference P30 special zone approval write',
    '',
    `- status: \`${summary.status}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- target approved rows: \`${summary.targetApprovedRows}\``,
    `- approval template write performed: \`${summary.canonicalApprovalTemplateWritePerformed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Checks',
    '',
    ...checks.map((row) => `- \`${row.check}\`: \`${row.status}\`${row.failure ? ` (${row.failure})` : ''}`),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approvedRows=${summary.approvedRows} pendingRows=${summary.pendingRows} targetApprovedRows=${summary.targetApprovedRows} canonicalApprovalTemplateWritePerformed=${summary.canonicalApprovalTemplateWritePerformed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

function buildPostwriteChecks(template) {
  const checks = [];
  const addCheck = (check, ok, failure = '') => {
    checks.push({
      check,
      status: ok ? 'PASS' : 'FAIL',
      failure: ok ? '' : failure,
    });
  };

  const rows = template.rows ?? [];
  const counts = rowCounts(rows);
  const targetTemplateRows = rows.filter((row) => targetDraftIds.has(row.draftId));
  const pendingRows = rows.filter((row) => row.operatorDecision === 'PENDING');
  const activeKeys = activeOperatorReferenceKeys();
  const pendingRowsInSource = pendingRows.filter((row) => (
    activeKeys.has(row.suggestedId)
    || activeKeys.has(row.suggestedName)
    || activeKeys.has(row.suggestedBlock)
    || activeKeys.has(String(row.suggestedBlock).replace('-', ''))
  ));
  const selectableRows = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const sourceBlocks = targetRows.map((target) => ({
    target,
    block: findBlock(target),
    templateRow: targetTemplateRows.find((row) => row.draftId === target.draftId),
  }));

  addCheck('P21_APPROVED_ROWS_FIVE', counts.approvedRows === 5, `APPROVED_ROWS_${counts.approvedRows}`);
  addCheck('P21_PENDING_ROWS_SEVENTEEN', counts.pendingRows === 17, `PENDING_ROWS_${counts.pendingRows}`);
  addCheck('TARGET_FOUR_ROWS_APPROVED', targetTemplateRows.length === 4 && targetTemplateRows.every(targetIsApproved), 'P30_TARGET_APPROVAL_MISSING');
  addCheck('APPROVED_FOUR_BLOCKS_SOURCE_APPLIED', sourceBlocks.every((row) => Boolean(row.block)), `MISSING_SOURCE_BLOCKS_${sourceBlocks.filter((row) => !row.block).map((row) => row.target.draftId).join('|')}`);
  addCheck('CURRENT_SELECTABLE_ROWS_114', selectableRows === expectedSelectableRows, `CURRENT_SELECTABLE_ROWS_${selectableRows}`);
  addCheck('TARGET_MAP_VERSION_P30', DAEGU_OPERATOR_REFERENCE_RAPAK_2025_MAP_VERSION === expectedMapVersion, `MAP_VERSION_${DAEGU_OPERATOR_REFERENCE_RAPAK_2025_MAP_VERSION}`);
  addCheck('PENDING_17_ROWS_NOT_APPLIED', pendingRowsInSource.length === 0, `PENDING_ROWS_IN_SOURCE_${pendingRowsInSource.map((row) => row.draftId).join('|')}`);
  addCheck('OFFICIAL_DATASET_STAYS_177', DAEGU_BLOCKS.length === 177, `OFFICIAL_ROWS_${DAEGU_BLOCKS.length}`);

  sourceBlocks.forEach(({ target, block, templateRow }) => {
    addCheck(`TARGET_BLOCK_SELECTABLE_${target.draftId}`, Boolean(block) && isDaeguOperatorReferenceSelectableSeat(block), `TARGET_BLOCK_NOT_SELECTABLE_${target.draftId}`);
    addCheck(`TARGET_TRACE_VERSION_P30_${target.draftId}`, block?.imageGeometry.geometryVersion === traceVersion && block?.imageGeometry.traceVersion === traceVersion, `TRACE_VERSION_${block?.imageGeometry.geometryVersion ?? 'MISSING'}`);

    if (!block || !templateRow) {
      addCheck(`TARGET_GEOMETRY_VALID_${target.draftId}`, false, 'TARGET_BLOCK_OR_TEMPLATE_ROW_MISSING');
      addCheck(`TARGET_LABEL_TOP_HIT_VALID_${target.draftId}`, false, 'TARGET_BLOCK_OR_TEMPLATE_ROW_MISSING');
      return;
    }

    const labelPoint = block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY];
    const visualErrors = validateSeatMapPolygonPath({
      pathData: block.imageGeometry.visualPath ?? block.imageGeometry.d,
      width: imageWidth,
      height: imageHeight,
      labelPoint,
      labelTolerance: 3,
    });
    const hitErrors = validateSeatMapPolygonPath({
      pathData: block.imageGeometry.hitPath ?? block.imageGeometry.visualPath ?? block.imageGeometry.d,
      width: imageWidth,
      height: imageHeight,
      labelPoint,
      labelTolerance: 3,
    });

    addCheck(`TARGET_GEOMETRY_MATCHES_APPROVED_ROW_${target.draftId}`, block.imageGeometry.d === templateRow.correctedPath && block.imageGeometry.hitPath === templateRow.correctedHitPath && Number(block.imageGeometry.labelX) === Number(templateRow.correctedLabelX) && Number(block.imageGeometry.labelY) === Number(templateRow.correctedLabelY), `TARGET_GEOMETRY_MISMATCH_${target.draftId}`);
    addCheck(`TARGET_GEOMETRY_VALID_${target.draftId}`, visualErrors.length === 0 && hitErrors.length === 0, [...visualErrors, ...hitErrors].join('|'));
    addCheck(`TARGET_LABEL_TOP_HIT_VALID_${target.draftId}`, hitErrors.length === 0, hitErrors.join('|'));
  });

  addCheck('SOURCE_DATA_WRITE_PERFORMED', sourceBlocks.every((row) => Boolean(row.block)), 'SOURCE_DATA_WRITE_MUST_ADD_TARGETS');
  addCheck('PRODUCTION_WRITE_BLOCKED', true, 'PRODUCTION_WRITE_MUST_REMAIN_FALSE');

  return checks;
}

async function writePostwrite() {
  const template = await readJson(p21TemplatePath);
  const checks = buildPostwriteChecks(template);
  const failedChecks = checks.filter((row) => row.status === 'FAIL');
  const counts = rowCounts(template.rows ?? []);
  const summary = {
    status: failedChecks.length === 0 ? 'p30-special-zone-postwrite-applied' : 'p30-special-zone-postwrite-blocked',
    targetDraftIds: Array.from(targetDraftIds),
    approvedRows: counts.approvedRows,
    pendingRows: counts.pendingRows,
    targetApprovedRows: (template.rows ?? []).filter((row) => targetDraftIds.has(row.draftId) && targetIsApproved(row)).length,
    invalidRows: failedChecks.length,
    previousSelectableRows: 110,
    currentSelectableRows: DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length,
    expectedSelectableRows,
    sourceDataWritePerformed: failedChecks.length === 0,
    productionWriteAllowed: false,
    traceVersion,
    sourceTarget: 'src/data/daeguSeatData.ts',
  };

  if (requireApplied && summary.status !== 'p30-special-zone-postwrite-applied') {
    throw new Error(`P30 special zone postwrite blocked: failedChecks=${failedChecks.length}`);
  }

  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p21OperatorTemplate: toFrontendRelative(p21TemplatePath),
      sourceTarget: 'src/data/daeguSeatData.ts',
    },
    policy: {
      note: 'P30 source write applies RAPAK_REF_054, RAPAK_REF_057, RAPAK_REF_058, RAPAK_REF_187 only. P30 keeps the remaining 17 SKY S-4~S-20 rows pending.',
      productionWriteAllowed: false,
      sourceDataWritePerformed: summary.sourceDataWritePerformed,
    },
    summary,
    checks,
    targetBlocks: targetRows.map((target) => findBlock(target)).filter(Boolean),
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
    '# 대구 operator reference P30 special zone postwrite',
    '',
    `- status: \`${summary.status}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- target approved rows: \`${summary.targetApprovedRows}\``,
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

  console.log(`status:${summary.status} approvedRows=${summary.approvedRows} pendingRows=${summary.pendingRows} targetApprovedRows=${summary.targetApprovedRows} currentSelectableRows=${summary.currentSelectableRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed} productionWriteAllowed=${summary.productionWriteAllowed}`);
}

if (task === 'write-approval') {
  await writeApproval();
} else if (task === 'postwrite') {
  await writePostwrite();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
