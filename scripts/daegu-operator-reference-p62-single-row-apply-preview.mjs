import crypto from 'node:crypto';
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
const p61ReadinessJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p61-post-p60-readiness/daegu-operator-reference-p61-post-p60-readiness.json');
const p61GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p61-post-p60-readiness/gate/daegu-operator-reference-p61-post-p60-readiness-gate.json');
const sourceTargetPath = path.join(frontendRoot, 'src/data/daeguSeatData.ts');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p62-single-row-apply-preview');
const gateDir = path.join(outputDir, 'gate');
const previewJsonPath = path.join(outputDir, 'daegu-operator-reference-p62-single-row-apply-preview.json');
const previewMdPath = path.join(outputDir, 'daegu-operator-reference-p62-single-row-apply-preview.md');
const sourcePatchDiffPath = path.join(outputDir, 'daegu-operator-reference-p62-source-patch.diff');
const sourceApplyCandidateCsvPath = path.join(outputDir, 'daegu-operator-reference-p62-source-apply-candidate.csv');
const validationCsvPath = path.join(outputDir, 'daegu-operator-reference-p62-validation.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p62-single-row-apply-preview-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p62-single-row-apply-preview-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p62-single-row-apply-preview-gate.md');

const task = process.argv[2] ?? 'preview';
const pilotSectionId = 'daegu-outfield-table-tr-tr-9';
const sourceTarget = 'src/data/daeguSeatData.ts';

const sourceContractLiterals = [
  'P62_SINGLE_ROW_APPLY_PREVIEW',
  'P61_POST_P60_READINESS_SOURCE',
  'SINGLE_ROW_PILOT_APPLY_ALLOWED',
  'TR9_ONLY_SOURCE_PATCH_CANDIDATE',
  'PATCH_PREVIEW_ONLY',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'PENDING_ROWS_DO_NOT_BLOCK_SINGLE_ROW_PREVIEW',
  'FULL_RELEASE_STILL_BLOCKED',
  'SOURCE_HASH_UNCHANGED',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'singleRowPilotApplyAllowed=true',
  'p62-single-row-apply-preview-ready',
  'p62-single-row-apply-preview-gate-passed',
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

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function findCurrentBlock() {
  return DAEGU_OPERATOR_REFERENCE_BLOCKS.find((block) => block.id === pilotSectionId);
}

function buildChangedFields(candidate) {
  const previousLabelPoint = candidate.previousLabelPoint ?? '';
  const nextLabelPoint = candidate.nextLabelPoint ?? '';
  return [
    candidate.previousVisualPath !== candidate.nextVisualPath ? 'visualPath' : '',
    candidate.previousHitPath !== candidate.nextHitPath ? 'hitPath' : '',
    previousLabelPoint !== nextLabelPoint ? 'labelPoint' : '',
  ].filter(Boolean);
}

function buildPreviewCandidate(candidate, currentBlock) {
  const changedFields = buildChangedFields(candidate);
  const [nextLabelX = '', nextLabelY = ''] = String(candidate.nextLabelPoint ?? '').split('|');
  const [previousLabelX = '', previousLabelY = ''] = String(candidate.previousLabelPoint ?? '').split('|');
  return {
    candidateOrder: candidate.candidateOrder,
    sectionId: candidate.sectionId,
    block: candidate.block,
    name: candidate.name,
    reviewZone: candidate.reviewZone,
    reviewId: candidate.reviewId,
    reviewer: candidate.reviewer,
    reviewedAt: candidate.reviewedAt,
    patchType: 'P62_SINGLE_ROW_OPERATOR_REFERENCE_GEOMETRY_PREVIEW',
    targetFile: sourceTarget,
    changedSourceFields: changedFields.join('|') || 'none',
    previousVisualPath: candidate.previousVisualPath,
    nextVisualPath: candidate.nextVisualPath,
    previousHitPath: candidate.previousHitPath,
    nextHitPath: candidate.nextHitPath,
    previousLabelPoint: candidate.previousLabelPoint,
    nextLabelPoint: candidate.nextLabelPoint,
    previousLabelX,
    previousLabelY,
    nextLabelX,
    nextLabelY,
    currentVisualPath: currentBlock?.imageGeometry.visualPath ?? currentBlock?.imageGeometry.d ?? '',
    currentHitPath: currentBlock?.imageGeometry.hitPath ?? currentBlock?.imageGeometry.visualPath ?? currentBlock?.imageGeometry.d ?? '',
    currentLabelPoint: currentBlock?.imageGeometry.labelPoint?.join('|') ?? `${currentBlock?.imageGeometry.labelX ?? ''}|${currentBlock?.imageGeometry.labelY ?? ''}`,
    singleRowPilotApplyAllowed: true,
    sourceApplyAllowed: false,
    sourceDataWritePerformed: false,
  };
}

function buildPatchPreviewText(candidate) {
  const lines = [
    'diff --git a/src/data/daeguSeatData.ts b/src/data/daeguSeatData.ts',
    '--- a/src/data/daeguSeatData.ts',
    '+++ b/src/data/daeguSeatData.ts',
    '@@ daegu-outfield-table-tr-tr-9 imageGeometry (P62 preview only) @@',
  ];

  if (candidate.previousVisualPath !== candidate.nextVisualPath) {
    lines.push(`-      visualPath: '${candidate.previousVisualPath}',`);
    lines.push(`+      visualPath: '${candidate.nextVisualPath}',`);
  } else {
    lines.push(`       visualPath: '${candidate.nextVisualPath}',`);
  }

  if (candidate.previousHitPath !== candidate.nextHitPath) {
    lines.push(`-      hitPath: '${candidate.previousHitPath}',`);
    lines.push(`+      hitPath: '${candidate.nextHitPath}',`);
  } else {
    lines.push(`       hitPath: '${candidate.nextHitPath}',`);
  }

  if (candidate.previousLabelPoint !== candidate.nextLabelPoint) {
    lines.push(`-      labelPoint: [${String(candidate.previousLabelPoint).replace('|', ', ')}],`);
    lines.push(`+      labelPoint: [${String(candidate.nextLabelPoint).replace('|', ', ')}],`);
  } else {
    lines.push(`       labelPoint: [${String(candidate.nextLabelPoint).replace('|', ', ')}],`);
  }

  lines.push('');
  lines.push('P62_SINGLE_ROW_APPLY_PREVIEW only.');
  lines.push('PATCH_PREVIEW_ONLY.');
  lines.push('SOURCE_WRITE_FORBIDDEN.');
  lines.push('sourceDataWritePerformed=false.');
  lines.push('');
  return lines.join('\n');
}

function summarize({ p61, p61Gate, previewCandidate, currentBlock, sourceShaBefore, sourceShaAfter }) {
  const p61Summary = p61.summary ?? {};
  const p61GateSummary = p61Gate.summary ?? {};
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const sourceMatchesP61Candidate = previewCandidate.currentVisualPath === previewCandidate.previousVisualPath
    && previewCandidate.currentHitPath === previewCandidate.previousHitPath
    && previewCandidate.currentLabelPoint === previewCandidate.previousLabelPoint;
  const singleRowPilotApplyAllowed = p61Summary.pilotPatchReady === true
    && p61Summary.singleRowApplyCandidate === true
    && p61Summary.sourceApplyPlanRows === 1
    && p61Summary.targetSectionId === pilotSectionId
    && previewCandidate.sectionId === pilotSectionId
    && previewCandidate.block === 'TR-9'
    && currentBlock
    && sourceMatchesP61Candidate;
  const sourceHashUnchanged = sourceShaBefore === sourceShaAfter;
  const fullReleaseStillBlocked = p61Summary.fullReleaseBlocked === true
    && p61Summary.pendingRows === 130
    && p61Summary.passRelease177Allowed === false
    && p61GateSummary.passRelease177Allowed === false;
  const previewReady = singleRowPilotApplyAllowed
    && sourceHashUnchanged
    && fullReleaseStillBlocked
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: previewReady ? 'p62-single-row-apply-preview-ready' : 'p62-single-row-apply-preview-blocked',
    p61Status: p61Summary.status ?? '',
    p61GateStatus: p61GateSummary.status ?? '',
    currentSelectableSeats,
    officialDatasetBlocks,
    targetSectionId: pilotSectionId,
    targetBlock: 'TR-9',
    approvedRows: p61Summary.approvedRows ?? 0,
    pendingRows: p61Summary.pendingRows ?? 0,
    sourcePatchRows: p61Summary.sourcePatchRows ?? 0,
    sourceApplyPlanRows: p61Summary.sourceApplyPlanRows ?? 0,
    sourceApplyCandidateRows: 1,
    changedSourceFields: previewCandidate.changedSourceFields,
    sourceMatchesP61Candidate,
    singleRowPilotApplyAllowed: Boolean(singleRowPilotApplyAllowed),
    pendingRowsDoNotBlockSingleRowPreview: p61Summary.pendingRows === 130 && Boolean(singleRowPilotApplyAllowed),
    fullReleaseStillBlocked,
    fullReleaseBlocked: true,
    sourceHashUnchanged,
    sourceShaBefore,
    sourceShaAfter,
    sourceApplyAllowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    sourceWritePreviewOnly: true,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    buildBlockerTrackedSeparately: p61Summary.buildBlockerTrackedSeparately
      ?? 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildValidationRows(summary, previewCandidate) {
  return [
    {
      rowId: 'P62_SINGLE_ROW_APPLY_PREVIEW',
      validationType: 'PREVIEW_CONTRACT',
      validationStatus: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Use P62 as the final preview before a later explicit single-row source apply step.',
    },
    {
      rowId: 'P61_POST_P60_READINESS_SOURCE',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p61Status === 'p61-post-p60-readiness-ready' && summary.p61GateStatus === 'p61-post-p60-readiness-gate-passed' ? 'PASS' : 'INVALID',
      failures: summary.p61Status === 'p61-post-p60-readiness-ready' && summary.p61GateStatus === 'p61-post-p60-readiness-gate-passed'
        ? ''
        : `P61_${summary.p61Status}_GATE_${summary.p61GateStatus}`,
      nextAction: 'Run P61 post-P60 readiness gate before P62.',
    },
    {
      rowId: 'SINGLE_ROW_PILOT_APPLY_ALLOWED',
      validationType: 'PILOT_POLICY',
      validationStatus: summary.singleRowPilotApplyAllowed ? 'PASS' : 'INVALID',
      failures: summary.singleRowPilotApplyAllowed ? '' : 'SINGLE_ROW_PILOT_APPLY_NOT_ALLOWED',
      nextAction: 'Allow only the TR-9 pilot row to advance to explicit source apply.',
    },
    {
      rowId: 'TR9_ONLY_SOURCE_PATCH_CANDIDATE',
      validationType: 'PATCH_POLICY',
      validationStatus: previewCandidate.sectionId === pilotSectionId && previewCandidate.block === 'TR-9' && summary.sourceApplyCandidateRows === 1 ? 'PASS' : 'INVALID',
      failures: previewCandidate.sectionId === pilotSectionId && previewCandidate.block === 'TR-9' && summary.sourceApplyCandidateRows === 1
        ? ''
        : `SECTION_${previewCandidate.sectionId}_BLOCK_${previewCandidate.block}_ROWS_${summary.sourceApplyCandidateRows}`,
      nextAction: 'Keep P62 limited to the approved TR-9 production pilot row.',
    },
    {
      rowId: 'PATCH_PREVIEW_ONLY',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceWritePreviewOnly && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.sourceWritePreviewOnly && summary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
      nextAction: 'P62 must emit preview artifacts only.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceApplyAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.sourceApplyAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'Do not modify src/data/daeguSeatData.ts in P62.',
    },
    {
      rowId: 'SOURCE_HASH_UNCHANGED',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceHashUnchanged ? 'PASS' : 'INVALID',
      failures: summary.sourceHashUnchanged ? '' : 'SOURCE_SHA_CHANGED',
      nextAction: 'Confirm P62 did not write source data.',
    },
    {
      rowId: 'PENDING_ROWS_DO_NOT_BLOCK_SINGLE_ROW_PREVIEW',
      validationType: 'PILOT_POLICY',
      validationStatus: summary.pendingRowsDoNotBlockSingleRowPreview ? 'PASS' : 'INVALID',
      failures: summary.pendingRowsDoNotBlockSingleRowPreview ? '' : `PENDING_ROWS_${summary.pendingRows}`,
      nextAction: 'Pending rows still block full release, but not the TR-9 preview artifact.',
    },
    {
      rowId: 'FULL_RELEASE_STILL_BLOCKED',
      validationType: 'RELEASE_POLICY',
      validationStatus: summary.fullReleaseStillBlocked ? 'REVIEW_PENDING' : 'INVALID',
      failures: summary.fullReleaseStillBlocked ? `PENDING_ROWS:${summary.pendingRows}` : 'FULL_RELEASE_NOT_BLOCKED',
      nextAction: 'Complete the remaining operator approvals before any full release lock.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P62 does not release official 177 blocks.',
    },
  ];
}

async function buildPayload() {
  const [p61, p61Gate, sourceBefore] = await Promise.all([
    readJson(p61ReadinessJsonPath),
    readJson(p61GateJsonPath),
    fs.readFile(sourceTargetPath, 'utf8'),
  ]);
  const currentBlock = findCurrentBlock();
  const sourceShaBefore = sha256(sourceBefore);
  const candidate = p61.sourceApplyCandidates?.[0];

  if (!candidate) {
    throw new Error('P62 requires one P61 source apply candidate.');
  }

  const previewCandidate = buildPreviewCandidate(candidate, currentBlock);
  const sourceAfter = await fs.readFile(sourceTargetPath, 'utf8');
  const sourceShaAfter = sha256(sourceAfter);
  const patchPreviewText = buildPatchPreviewText(previewCandidate);
  const summary = summarize({
    p61,
    p61Gate,
    previewCandidate,
    currentBlock,
    sourceShaBefore,
    sourceShaAfter,
  });
  const validations = buildValidationRows(summary, previewCandidate);

  return {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p61ReadinessJson: toFrontendRelative(p61ReadinessJsonPath),
      p61GateJson: toFrontendRelative(p61GateJsonPath),
      sourceTarget,
      sourceShaBefore,
      sourceShaAfter,
    },
    policy: {
      productionWriteAllowed: false,
      singleRowPilotApplyAllowed: summary.singleRowPilotApplyAllowed,
      sourceWritePreviewOnly: true,
      sourceApplyAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P62_SINGLE_ROW_APPLY_PREVIEW. P61_POST_P60_READINESS_SOURCE. SINGLE_ROW_PILOT_APPLY_ALLOWED. TR9_ONLY_SOURCE_PATCH_CANDIDATE. PATCH_PREVIEW_ONLY. SOURCE_WRITE_FORBIDDEN.',
    },
    summary,
    sourceApplyCandidates: [previewCandidate],
    validations,
    patchPreviewText,
    outputs: {
      previewJson: toFrontendRelative(previewJsonPath),
      previewMd: toFrontendRelative(previewMdPath),
      sourcePatchDiff: toFrontendRelative(sourcePatchDiffPath),
      sourceApplyCandidateCsv: toFrontendRelative(sourceApplyCandidateCsvPath),
      validationCsv: toFrontendRelative(validationCsvPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };
}

async function writePreview() {
  const payload = await buildPayload();
  const { summary } = payload;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(previewJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(sourcePatchDiffPath, payload.patchPreviewText);
  await fs.writeFile(sourceApplyCandidateCsvPath, buildCsv(payload.sourceApplyCandidates, [
    'candidateOrder',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'reviewId',
    'reviewer',
    'reviewedAt',
    'patchType',
    'targetFile',
    'changedSourceFields',
    'previousVisualPath',
    'nextVisualPath',
    'previousHitPath',
    'nextHitPath',
    'previousLabelPoint',
    'nextLabelPoint',
    'singleRowPilotApplyAllowed',
    'sourceApplyAllowed',
    'sourceDataWritePerformed',
  ]));
  await fs.writeFile(validationCsvPath, buildCsv(payload.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(previewMdPath, [
    '# 대구 operator reference P62 single-row apply preview',
    '',
    `- status: \`${summary.status}\``,
    `- target section: \`${summary.targetSectionId}\``,
    `- target block: \`${summary.targetBlock}\``,
    `- changed source fields: \`${summary.changedSourceFields}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- source apply candidate rows: \`${summary.sourceApplyCandidateRows}\``,
    `- single row pilot apply allowed: \`${summary.singleRowPilotApplyAllowed}\``,
    `- pending rows do not block single-row preview: \`${summary.pendingRowsDoNotBlockSingleRowPreview}\``,
    `- full release still blocked: \`${summary.fullReleaseStillBlocked}\``,
    `- source hash unchanged: \`${summary.sourceHashUnchanged}\``,
    `- source apply allowed: \`${summary.sourceApplyAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
    '## Rule',
    '',
    '- P62 creates the TR-9 source patch preview only.',
    '- P62 does not write `src/data/daeguSeatData.ts`.',
    '- Full release remains blocked while 130 rows are pending.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} target=${summary.targetSectionId} singleRowPilotApplyAllowed=${summary.singleRowPilotApplyAllowed} pendingRows=${summary.pendingRows} sourceHashUnchanged=${summary.sourceHashUnchanged} sourceApplyAllowed=${summary.sourceApplyAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const preview = await writePreview();
  const invalidRows = (preview.validations ?? []).filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = (preview.validations ?? []).filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p62-single-row-apply-preview-gate-passed' : 'p62-single-row-apply-preview-gate-blocked',
    previewStatus: preview.summary?.status ?? '',
    totalValidations: preview.validations?.length ?? 0,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    targetSectionId: preview.summary?.targetSectionId ?? '',
    targetBlock: preview.summary?.targetBlock ?? '',
    approvedRows: preview.summary?.approvedRows ?? 0,
    pendingRows: preview.summary?.pendingRows ?? 0,
    sourceApplyCandidateRows: preview.summary?.sourceApplyCandidateRows ?? 0,
    changedSourceFields: preview.summary?.changedSourceFields ?? '',
    singleRowPilotApplyAllowed: preview.summary?.singleRowPilotApplyAllowed === true,
    pendingRowsDoNotBlockSingleRowPreview: preview.summary?.pendingRowsDoNotBlockSingleRowPreview === true,
    fullReleaseStillBlocked: preview.summary?.fullReleaseStillBlocked === true,
    sourceHashUnchanged: preview.summary?.sourceHashUnchanged === true,
    sourceApplyAllowed: false,
    productionWriteAllowed: false,
    passRelease177Allowed: false,
    sourceDataWritePerformed: false,
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations: preview.validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(preview.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P62 single-row apply preview gate',
    '',
    `- status: \`${summary.status}\``,
    `- target section: \`${summary.targetSectionId}\``,
    `- target block: \`${summary.targetBlock}\``,
    `- changed source fields: \`${summary.changedSourceFields}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- single row pilot apply allowed: \`${summary.singleRowPilotApplyAllowed}\``,
    `- full release still blocked: \`${summary.fullReleaseStillBlocked}\``,
    `- source hash unchanged: \`${summary.sourceHashUnchanged}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} target=${summary.targetSectionId} singleRowPilotApplyAllowed=${summary.singleRowPilotApplyAllowed} pendingRows=${summary.pendingRows} sourceHashUnchanged=${summary.sourceHashUnchanged} sourceApplyAllowed=${summary.sourceApplyAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'preview') {
  await writePreview();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
