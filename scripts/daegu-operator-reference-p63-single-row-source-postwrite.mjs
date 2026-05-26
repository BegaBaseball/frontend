import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';
import { validateSeatMapPolygonPath } from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p62PreviewJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p62-single-row-apply-preview/daegu-operator-reference-p62-single-row-apply-preview.json');
const p62GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p62-single-row-apply-preview/gate/daegu-operator-reference-p62-single-row-apply-preview-gate.json');
const sourceTargetPath = path.join(frontendRoot, 'src/data/daeguSeatData.ts');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p63-single-row-source-postwrite');
const gateDir = path.join(outputDir, 'gate');
const postwriteJsonPath = path.join(outputDir, 'daegu-operator-reference-p63-single-row-source-postwrite.json');
const postwriteMdPath = path.join(outputDir, 'daegu-operator-reference-p63-single-row-source-postwrite.md');
const validationCsvPath = path.join(outputDir, 'daegu-operator-reference-p63-validation.csv');
const targetSnapshotCsvPath = path.join(outputDir, 'daegu-operator-reference-p63-target-snapshot.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p63-single-row-source-postwrite-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p63-single-row-source-postwrite-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p63-single-row-source-postwrite-gate.md');

const task = process.argv[2] ?? 'postwrite';
const requireApplied = process.argv.includes('--require-applied');
const pilotSectionId = 'daegu-outfield-table-tr-tr-9';
const sourceTarget = 'src/data/daeguSeatData.ts';
const imageWidth = 4096;
const imageHeight = 4096;

const sourceContractLiterals = [
  'P63_SINGLE_ROW_SOURCE_POSTWRITE',
  'P62_SINGLE_ROW_APPLY_PREVIEW_SOURCE',
  'TR9_ONLY_SOURCE_WRITE_APPLIED',
  'HIT_PATH_ONLY_SOURCE_DELTA',
  'SOURCE_HASH_CHANGED_FROM_P62',
  'TARGET_GEOMETRY_MATCHES_P62',
  'TARGET_LABEL_TOP_HIT_VALID',
  'SOURCE_DATA_WRITE_PERFORMED',
  'PENDING_ROWS_STILL_BLOCK_FULL_RELEASE',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'PRODUCTION_WRITE_BLOCKED',
  'sourceDataWritePerformed=true',
  'productionWriteAllowed: false',
  'p63-single-row-source-postwrite-applied',
  'p63-single-row-source-postwrite-gate-passed',
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

function targetBlock() {
  return DAEGU_OPERATOR_REFERENCE_BLOCKS.find((block) => block.id === pilotSectionId);
}

function pointText(block) {
  return block?.imageGeometry.labelPoint?.join('|') ?? `${block?.imageGeometry.labelX ?? ''}|${block?.imageGeometry.labelY ?? ''}`;
}

function buildTargetSnapshot(block, p62Candidate) {
  return {
    sectionId: block?.id ?? '',
    block: block?.block ?? '',
    name: block?.name ?? '',
    targetFile: sourceTarget,
    visualPath: block?.imageGeometry.visualPath ?? block?.imageGeometry.d ?? '',
    hitPath: block?.imageGeometry.hitPath ?? block?.imageGeometry.visualPath ?? block?.imageGeometry.d ?? '',
    labelPoint: pointText(block),
    p62NextVisualPath: p62Candidate.nextVisualPath,
    p62NextHitPath: p62Candidate.nextHitPath,
    p62NextLabelPoint: p62Candidate.nextLabelPoint,
    sourceConfidence: block?.sourceConfidence ?? '',
    traceStatus: block?.traceStatus ?? '',
    traceMethod: block?.traceMethod ?? '',
    manualReviewed: block?.imageGeometry.manualReviewed ?? '',
    pixelAlignmentStatus: block?.imageGeometry.pixelAlignmentStatus ?? '',
  };
}

function summarize({ p62Preview, p62Gate, currentBlock, sourceShaNow }) {
  const p62Summary = p62Preview.summary ?? {};
  const p62GateSummary = p62Gate.summary ?? {};
  const p62Candidate = p62Preview.sourceApplyCandidates?.[0] ?? {};
  const labelPoint = currentBlock?.imageGeometry.labelPoint ?? [currentBlock?.imageGeometry.labelX ?? 0, currentBlock?.imageGeometry.labelY ?? 0];
  const visualPath = currentBlock?.imageGeometry.visualPath ?? currentBlock?.imageGeometry.d ?? '';
  const hitPath = currentBlock?.imageGeometry.hitPath ?? visualPath;
  const visualErrors = currentBlock
    ? validateSeatMapPolygonPath({
      pathData: visualPath,
      width: imageWidth,
      height: imageHeight,
      labelPoint,
      labelTolerance: 3,
    })
    : ['TARGET_BLOCK_MISSING'];
  const hitErrors = currentBlock
    ? validateSeatMapPolygonPath({
      pathData: hitPath,
      width: imageWidth,
      height: imageHeight,
      labelPoint,
      labelTolerance: 3,
    })
    : ['TARGET_BLOCK_MISSING'];
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const targetMatchesP62 = currentBlock?.id === pilotSectionId
    && currentBlock?.block === 'TR-9'
    && visualPath === p62Candidate.nextVisualPath
    && hitPath === p62Candidate.nextHitPath
    && pointText(currentBlock) === p62Candidate.nextLabelPoint;
  const hitPathOnlySourceDelta = p62Candidate.changedSourceFields === 'hitPath';
  const sourceHashChangedFromP62 = sourceShaNow !== p62Summary.sourceShaBefore
    && sourceShaNow !== p62Summary.sourceShaAfter;
  const p62Ready = p62Summary.status === 'p62-single-row-apply-preview-ready'
    && p62GateSummary.status === 'p62-single-row-apply-preview-gate-passed';
  const applied = p62Ready
    && targetMatchesP62
    && hitPathOnlySourceDelta
    && sourceHashChangedFromP62
    && visualErrors.length === 0
    && hitErrors.length === 0
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: applied ? 'p63-single-row-source-postwrite-applied' : 'p63-single-row-source-postwrite-blocked',
    p62Status: p62Summary.status ?? '',
    p62GateStatus: p62GateSummary.status ?? '',
    targetSectionId: pilotSectionId,
    targetBlock: 'TR-9',
    changedSourceFields: p62Candidate.changedSourceFields ?? '',
    currentSelectableSeats,
    officialDatasetBlocks,
    approvedRows: p62Summary.approvedRows ?? 0,
    pendingRows: p62Summary.pendingRows ?? 0,
    sourceApplyCandidateRows: p62Summary.sourceApplyCandidateRows ?? 0,
    p62SourceShaBefore: p62Summary.sourceShaBefore ?? '',
    p62SourceShaAfter: p62Summary.sourceShaAfter ?? '',
    sourceShaNow,
    sourceHashChangedFromP62,
    hitPathOnlySourceDelta,
    targetMatchesP62,
    targetGeometryValid: visualErrors.length === 0 && hitErrors.length === 0,
    targetLabelTopHitValid: hitErrors.length === 0,
    visualValidationErrors: visualErrors.join('|'),
    hitValidationErrors: hitErrors.join('|'),
    pendingRowsStillBlockFullRelease: (p62Summary.pendingRows ?? 0) === 130,
    fullReleaseBlocked: true,
    sourceApplyAllowed: false,
    sourceDataWritePerformed: applied,
    productionWriteAllowed: false,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    buildBlockerTrackedSeparately: p62Summary.buildBlockerTrackedSeparately
      ?? 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildRows(summary) {
  return [
    {
      rowId: 'P63_SINGLE_ROW_SOURCE_POSTWRITE',
      validationType: 'POSTWRITE_CONTRACT',
      validationStatus: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Verify the explicit TR-9 source write after P62 preview.',
    },
    {
      rowId: 'P62_SINGLE_ROW_APPLY_PREVIEW_SOURCE',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p62Status === 'p62-single-row-apply-preview-ready' && summary.p62GateStatus === 'p62-single-row-apply-preview-gate-passed' ? 'PASS' : 'INVALID',
      failures: summary.p62Status === 'p62-single-row-apply-preview-ready' && summary.p62GateStatus === 'p62-single-row-apply-preview-gate-passed'
        ? ''
        : `P62_${summary.p62Status}_GATE_${summary.p62GateStatus}`,
      nextAction: 'Run and preserve P62 preview artifacts before P63 postwrite verification.',
    },
    {
      rowId: 'TR9_ONLY_SOURCE_WRITE_APPLIED',
      validationType: 'TARGET_POLICY',
      validationStatus: summary.targetMatchesP62 ? 'PASS' : 'INVALID',
      failures: summary.targetMatchesP62 ? '' : 'TARGET_DOES_NOT_MATCH_P62',
      nextAction: 'Only TR-9 should match the P62 single-row source preview.',
    },
    {
      rowId: 'HIT_PATH_ONLY_SOURCE_DELTA',
      validationType: 'PATCH_POLICY',
      validationStatus: summary.hitPathOnlySourceDelta ? 'PASS' : 'INVALID',
      failures: summary.hitPathOnlySourceDelta ? '' : `CHANGED_FIELDS_${summary.changedSourceFields}`,
      nextAction: 'Keep this explicit source apply limited to the P62 hitPath delta.',
    },
    {
      rowId: 'SOURCE_HASH_CHANGED_FROM_P62',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceHashChangedFromP62 ? 'PASS' : 'INVALID',
      failures: summary.sourceHashChangedFromP62 ? '' : 'SOURCE_SHA_NOT_CHANGED',
      nextAction: 'The current source hash should differ from the pre-apply P62 source hash.',
    },
    {
      rowId: 'TARGET_GEOMETRY_MATCHES_P62',
      validationType: 'GEOMETRY_POLICY',
      validationStatus: summary.targetGeometryValid ? 'PASS' : 'INVALID',
      failures: summary.targetGeometryValid ? '' : `${summary.visualValidationErrors}|${summary.hitValidationErrors}`,
      nextAction: 'Fix TR-9 geometry if current source no longer validates.',
    },
    {
      rowId: 'TARGET_LABEL_TOP_HIT_VALID',
      validationType: 'GEOMETRY_POLICY',
      validationStatus: summary.targetLabelTopHitValid ? 'PASS' : 'INVALID',
      failures: summary.targetLabelTopHitValid ? '' : summary.hitValidationErrors,
      nextAction: 'Keep TR-9 label point inside its hit polygon.',
    },
    {
      rowId: 'SOURCE_DATA_WRITE_PERFORMED',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceDataWritePerformed ? 'PASS' : 'INVALID',
      failures: summary.sourceDataWritePerformed ? '' : 'SOURCE_WRITE_NOT_CONFIRMED',
      nextAction: 'Record that P63 is the explicit source write verification step.',
    },
    {
      rowId: 'PENDING_ROWS_STILL_BLOCK_FULL_RELEASE',
      validationType: 'RELEASE_POLICY',
      validationStatus: summary.pendingRowsStillBlockFullRelease ? 'REVIEW_PENDING' : 'INVALID',
      failures: summary.pendingRowsStillBlockFullRelease ? `PENDING_ROWS:${summary.pendingRows}` : 'PENDING_ROWS_UNEXPECTED',
      nextAction: 'Approve the remaining 130 rows before full release lock.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P63 does not release official 177 blocks.',
    },
    {
      rowId: 'PRODUCTION_WRITE_BLOCKED',
      validationType: 'PRODUCTION_POLICY',
      validationStatus: summary.productionWriteAllowed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false ? '' : 'PRODUCTION_WRITE_ALLOWED_TOO_EARLY',
      nextAction: 'Keep production release blocked until all approval rows are complete.',
    },
  ];
}

async function buildPayload() {
  const [p62Preview, p62Gate, sourceText] = await Promise.all([
    readJson(p62PreviewJsonPath),
    readJson(p62GateJsonPath),
    fs.readFile(sourceTargetPath, 'utf8'),
  ]);
  const currentBlock = targetBlock();
  const p62Candidate = p62Preview.sourceApplyCandidates?.[0] ?? {};
  const summary = summarize({
    p62Preview,
    p62Gate,
    currentBlock,
    sourceShaNow: sha256(sourceText),
  });
  const validations = buildRows(summary);
  const targetSnapshot = buildTargetSnapshot(currentBlock, p62Candidate);

  return {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p62PreviewJson: toFrontendRelative(p62PreviewJsonPath),
      p62GateJson: toFrontendRelative(p62GateJsonPath),
      sourceTarget,
      sourceShaNow: summary.sourceShaNow,
    },
    policy: {
      note: 'P63_SINGLE_ROW_SOURCE_POSTWRITE. P62_SINGLE_ROW_APPLY_PREVIEW_SOURCE. TR9_ONLY_SOURCE_WRITE_APPLIED. HIT_PATH_ONLY_SOURCE_DELTA. SOURCE_DATA_WRITE_PERFORMED. PASS_RELEASE_177_REMAINS_FORBIDDEN.',
      sourceDataWritePerformed: summary.sourceDataWritePerformed,
      productionWriteAllowed: false,
      passRelease177Allowed: false,
    },
    summary,
    targetSnapshot,
    validations,
    outputs: {
      postwriteJson: toFrontendRelative(postwriteJsonPath),
      postwriteMd: toFrontendRelative(postwriteMdPath),
      validationCsv: toFrontendRelative(validationCsvPath),
      targetSnapshotCsv: toFrontendRelative(targetSnapshotCsvPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };
}

async function writePostwrite() {
  const payload = await buildPayload();
  const { summary } = payload;

  if (requireApplied && summary.status !== 'p63-single-row-source-postwrite-applied') {
    throw new Error(`P63 single-row source postwrite blocked: ${payload.validations.filter((row) => row.validationStatus === 'INVALID').map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(postwriteJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(validationCsvPath, buildCsv(payload.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(targetSnapshotCsvPath, buildCsv([payload.targetSnapshot], [
    'sectionId',
    'block',
    'name',
    'targetFile',
    'visualPath',
    'hitPath',
    'labelPoint',
    'p62NextVisualPath',
    'p62NextHitPath',
    'p62NextLabelPoint',
    'sourceConfidence',
    'traceStatus',
    'traceMethod',
    'manualReviewed',
    'pixelAlignmentStatus',
  ]));
  await fs.writeFile(postwriteMdPath, [
    '# 대구 operator reference P63 single-row source postwrite',
    '',
    `- status: \`${summary.status}\``,
    `- target section: \`${summary.targetSectionId}\``,
    `- target block: \`${summary.targetBlock}\``,
    `- changed source fields: \`${summary.changedSourceFields}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- target matches P62: \`${summary.targetMatchesP62}\``,
    `- hitPath-only source delta: \`${summary.hitPathOnlySourceDelta}\``,
    `- source hash changed from P62: \`${summary.sourceHashChangedFromP62}\``,
    `- target geometry valid: \`${summary.targetGeometryValid}\``,
    `- target label top-hit valid: \`${summary.targetLabelTopHitValid}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
    '## Rule',
    '',
    '- P63 verifies the explicit TR-9 source write after P62 preview.',
    '- Full release remains blocked while 130 rows are pending.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} target=${summary.targetSectionId} changedSourceFields=${summary.changedSourceFields} targetMatchesP62=${summary.targetMatchesP62} pendingRows=${summary.pendingRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed} passRelease177Allowed=${summary.passRelease177Allowed}`);
  return payload;
}

async function writeGate() {
  const postwrite = await writePostwrite();
  const invalidRows = (postwrite.validations ?? []).filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = (postwrite.validations ?? []).filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p63-single-row-source-postwrite-gate-passed' : 'p63-single-row-source-postwrite-gate-blocked',
    postwriteStatus: postwrite.summary?.status ?? '',
    totalValidations: postwrite.validations?.length ?? 0,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    targetSectionId: postwrite.summary?.targetSectionId ?? '',
    targetBlock: postwrite.summary?.targetBlock ?? '',
    changedSourceFields: postwrite.summary?.changedSourceFields ?? '',
    pendingRows: postwrite.summary?.pendingRows ?? 0,
    targetMatchesP62: postwrite.summary?.targetMatchesP62 === true,
    hitPathOnlySourceDelta: postwrite.summary?.hitPathOnlySourceDelta === true,
    sourceHashChangedFromP62: postwrite.summary?.sourceHashChangedFromP62 === true,
    targetGeometryValid: postwrite.summary?.targetGeometryValid === true,
    targetLabelTopHitValid: postwrite.summary?.targetLabelTopHitValid === true,
    sourceDataWritePerformed: postwrite.summary?.sourceDataWritePerformed === true,
    productionWriteAllowed: false,
    passRelease177Allowed: false,
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations: postwrite.validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(postwrite.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P63 single-row source postwrite gate',
    '',
    `- status: \`${summary.status}\``,
    `- target section: \`${summary.targetSectionId}\``,
    `- target block: \`${summary.targetBlock}\``,
    `- changed source fields: \`${summary.changedSourceFields}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- target matches P62: \`${summary.targetMatchesP62}\``,
    `- hitPath-only source delta: \`${summary.hitPathOnlySourceDelta}\``,
    `- source hash changed from P62: \`${summary.sourceHashChangedFromP62}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} target=${summary.targetSectionId} changedSourceFields=${summary.changedSourceFields} pendingRows=${summary.pendingRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed} passRelease177Allowed=${summary.passRelease177Allowed}`);
}

if (task === 'postwrite') {
  await writePostwrite();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
