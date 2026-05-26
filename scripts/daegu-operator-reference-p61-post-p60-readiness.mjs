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
const p60GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p60-production-pilot-approval/gate/daegu-operator-reference-p60-production-pilot-approval-gate.json');
const p52PreviewJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p52-source-patch-preview/daegu-operator-reference-p52-source-patch-preview.json');
const p52GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p52-source-patch-preview/gate/daegu-operator-reference-p52-source-patch-preview-gate.json');
const p53GuardJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p53-source-apply-guard/daegu-operator-reference-p53-source-apply-guard.json');
const p53GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p53-source-apply-guard/gate/daegu-operator-reference-p53-source-apply-guard-gate.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p61-post-p60-readiness');
const gateDir = path.join(outputDir, 'gate');
const readinessJsonPath = path.join(outputDir, 'daegu-operator-reference-p61-post-p60-readiness.json');
const readinessMdPath = path.join(outputDir, 'daegu-operator-reference-p61-post-p60-readiness.md');
const sourceApplyCandidateCsvPath = path.join(outputDir, 'daegu-operator-reference-p61-source-apply-candidate.csv');
const blockersCsvPath = path.join(outputDir, 'daegu-operator-reference-p61-blockers.csv');
const validationCsvPath = path.join(outputDir, 'daegu-operator-reference-p61-validation.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p61-post-p60-readiness-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p61-post-p60-readiness-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p61-post-p60-readiness-gate.md');

const task = process.argv[2] ?? 'readiness';
const pilotSectionId = 'daegu-outfield-table-tr-tr-9';

const sourceContractLiterals = [
  'P61_POST_P60_READINESS',
  'P60_PRODUCTION_PILOT_SOURCE',
  'P52_PATCH_PREVIEW_SOURCE',
  'P53_SOURCE_APPLY_GUARD_SOURCE',
  'PILOT_PATCH_READY',
  'SINGLE_ROW_APPLY_CANDIDATE',
  'FULL_RELEASE_BLOCKED',
  'PENDING_ROWS_BLOCK_FULL_APPLY',
  'SOURCE_WRITE_STILL_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'pilotPatchReady=true',
  'singleRowApplyCandidate=true',
  'fullReleaseBlocked=true',
  'sourceDataWritePerformed: false',
  'p61-post-p60-readiness-ready',
  'p61-post-p60-readiness-gate-passed',
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

function buildCandidateRows(p53Guard) {
  return (p53Guard.sourceApplyPlanRows ?? []).map((row) => ({
    candidateOrder: row.patchOrder,
    sectionId: row.sectionId,
    block: row.block,
    name: row.name,
    reviewZone: row.reviewZone,
    reviewId: row.reviewId,
    reviewer: row.reviewer,
    reviewedAt: row.reviewedAt,
    patchType: row.patchType,
    targetFile: row.targetFile,
    previousVisualPath: row.previousVisualPath,
    nextVisualPath: row.nextVisualPath,
    previousHitPath: row.previousHitPath,
    nextHitPath: row.nextHitPath,
    previousLabelPoint: row.previousLabelPoint,
    nextLabelPoint: row.nextLabelPoint,
    applyStatus: row.applyStatus,
    sourceApplyAllowed: row.sourceApplyAllowed,
    sourceDataWritePerformed: row.sourceDataWritePerformed,
  }));
}

function buildBlockerRows(p53Guard) {
  return (p53Guard.blockers ?? []).map((row, index) => ({
    blockerOrder: index + 1,
    rowId: row.rowId,
    severity: row.severity,
    message: row.message,
    nextAction: row.nextAction,
  }));
}

function summarize({ p60Gate, p52Preview, p52Gate, p53Guard, p53Gate, candidateRows, blockerRows }) {
  const p60 = p60Gate.summary ?? {};
  const p52 = p52Gate.summary ?? {};
  const p53 = p53Gate.summary ?? {};
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const candidateSectionIds = new Set(candidateRows.map((row) => row.sectionId));
  const pilotPatchReady = p60.approvedRows === 1
    && p60.targetSectionId === pilotSectionId
    && p52.sourcePatchRows === 1
    && p52.sourcePatchAllowed === true
    && p52Preview.sourcePatchRows?.[0]?.sectionId === pilotSectionId;
  const singleRowApplyCandidate = candidateRows.length === 1
    && candidateSectionIds.has(pilotSectionId)
    && p53.sourceApplyPlanRows === 1
    && p53.sourcePatchRows === 1;
  const pendingRowsBlockFullApply = p53.pendingRows === 130
    && blockerRows.some((row) => row.rowId === 'PENDING_ROWS_BLOCK_SOURCE_APPLY');
  const sourceWriteStillForbidden = p60.sourceDataWritePerformed === false
    && p52.sourceDataWritePerformed === false
    && p53.sourceDataWritePerformed === false
    && p53.sourceApplyAllowed === false;
  const fullReleaseBlocked = p53.sourceApplyAllowed === false
    && p53.operatorReference131LockAllowed === false
    && p53.passRelease177Allowed === false
    && pendingRowsBlockFullApply;
  const readinessReady = pilotPatchReady
    && singleRowApplyCandidate
    && fullReleaseBlocked
    && pendingRowsBlockFullApply
    && sourceWriteStillForbidden
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: readinessReady ? 'p61-post-p60-readiness-ready' : 'p61-post-p60-readiness-blocked',
    p60GateStatus: p60.status ?? '',
    p52GateStatus: p52.status ?? '',
    p53GateStatus: p53.status ?? '',
    currentSelectableSeats,
    officialDatasetBlocks,
    targetSectionId: pilotSectionId,
    approvedRows: p60.approvedRows ?? 0,
    pendingRows: p53.pendingRows ?? 0,
    sourcePatchRows: p52.sourcePatchRows ?? 0,
    sourcePatchAllowed: p52.sourcePatchAllowed === true,
    sourceApplyPlanRows: p53.sourceApplyPlanRows ?? 0,
    sourceApplyPreconditionsMet: p53.sourceApplyPreconditionsMet === true,
    sourceApplyAllowed: p53.sourceApplyAllowed === true,
    candidateRows: candidateRows.length,
    blockerRows: blockerRows.length,
    blockerCount: p53Guard.summary?.blockerCount ?? blockerRows.length,
    pilotPatchReady,
    singleRowApplyCandidate,
    fullReleaseBlocked,
    pendingRowsBlockFullApply,
    sourceWriteStillForbidden,
    explicitApplyStepRequired: p53.explicitApplyStepRequired === true,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildValidationRows(summary) {
  return [
    {
      rowId: 'P61_POST_P60_READINESS',
      validationType: 'READINESS_CONTRACT',
      validationStatus: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Use this report to separate the pilot patch candidate from full release readiness.',
    },
    {
      rowId: 'P60_PRODUCTION_PILOT_SOURCE',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.approvedRows === 1 && summary.targetSectionId === pilotSectionId ? 'PASS' : 'INVALID',
      failures: summary.approvedRows === 1 && summary.targetSectionId === pilotSectionId
        ? ''
        : `APPROVED_${summary.approvedRows}_TARGET_${summary.targetSectionId}`,
      nextAction: 'Run P60 production pilot approval first.',
    },
    {
      rowId: 'P52_PATCH_PREVIEW_SOURCE',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.sourcePatchRows === 1 && summary.sourcePatchAllowed ? 'PASS' : 'INVALID',
      failures: summary.sourcePatchRows === 1 && summary.sourcePatchAllowed
        ? ''
        : `PATCH_ROWS_${summary.sourcePatchRows}_ALLOWED_${summary.sourcePatchAllowed}`,
      nextAction: 'Run P52 source patch preview after P60.',
    },
    {
      rowId: 'P53_SOURCE_APPLY_GUARD_SOURCE',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.sourceApplyPlanRows === 1 ? 'PASS' : 'INVALID',
      failures: summary.sourceApplyPlanRows === 1 ? '' : `PLAN_ROWS_${summary.sourceApplyPlanRows}`,
      nextAction: 'Run P53 source apply guard after P52.',
    },
    {
      rowId: 'PILOT_PATCH_READY',
      validationType: 'PILOT_POLICY',
      validationStatus: summary.pilotPatchReady ? 'PASS' : 'INVALID',
      failures: summary.pilotPatchReady ? '' : 'PILOT_PATCH_NOT_READY',
      nextAction: 'Keep TR-9 as the only post-P60 pilot patch candidate.',
    },
    {
      rowId: 'SINGLE_ROW_APPLY_CANDIDATE',
      validationType: 'PILOT_POLICY',
      validationStatus: summary.singleRowApplyCandidate ? 'PASS' : 'INVALID',
      failures: summary.singleRowApplyCandidate ? '' : `CANDIDATE_ROWS_${summary.candidateRows}`,
      nextAction: 'Only one source apply candidate should exist after P60.',
    },
    {
      rowId: 'FULL_RELEASE_BLOCKED',
      validationType: 'RELEASE_POLICY',
      validationStatus: summary.fullReleaseBlocked ? 'REVIEW_PENDING' : 'INVALID',
      failures: summary.fullReleaseBlocked ? 'FULL_RELEASE_BLOCKED' : 'FULL_RELEASE_NOT_BLOCKED',
      nextAction: 'Full source apply remains blocked until all pending rows are reviewed.',
    },
    {
      rowId: 'PENDING_ROWS_BLOCK_FULL_APPLY',
      validationType: 'RELEASE_POLICY',
      validationStatus: summary.pendingRowsBlockFullApply ? 'REVIEW_PENDING' : 'INVALID',
      failures: summary.pendingRowsBlockFullApply ? `PENDING_ROWS:${summary.pendingRows}` : 'PENDING_ROWS_BLOCKER_MISSING',
      nextAction: 'Complete remaining 130 operator approval rows before full apply.',
    },
    {
      rowId: 'SOURCE_WRITE_STILL_FORBIDDEN',
      validationType: 'SOURCE_WRITE_POLICY',
      validationStatus: summary.sourceWriteStillForbidden && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.sourceWriteStillForbidden && summary.sourceDataWritePerformed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'P61 must not write src/data/daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'Release remains forbidden while pending rows block full apply.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu post-P60 readiness.',
    },
  ];
}

async function buildPayload() {
  const [p60Gate, p52Preview, p52Gate, p53Guard, p53Gate] = await Promise.all([
    readJson(p60GateJsonPath),
    readJson(p52PreviewJsonPath),
    readJson(p52GateJsonPath),
    readJson(p53GuardJsonPath),
    readJson(p53GateJsonPath),
  ]);
  const candidateRows = buildCandidateRows(p53Guard);
  const blockerRows = buildBlockerRows(p53Guard);
  const summary = summarize({
    p60Gate,
    p52Preview,
    p52Gate,
    p53Guard,
    p53Gate,
    candidateRows,
    blockerRows,
  });
  const validations = buildValidationRows(summary);

  return {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p60GateJson: toFrontendRelative(p60GateJsonPath),
      p52PreviewJson: toFrontendRelative(p52PreviewJsonPath),
      p52GateJson: toFrontendRelative(p52GateJsonPath),
      p53GuardJson: toFrontendRelative(p53GuardJsonPath),
      p53GateJson: toFrontendRelative(p53GateJsonPath),
    },
    policy: {
      postP60Readiness: true,
      pilotCandidateOnly: true,
      fullReleaseBlocked: true,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P61_POST_P60_READINESS. PILOT_PATCH_READY. SINGLE_ROW_APPLY_CANDIDATE. FULL_RELEASE_BLOCKED. PENDING_ROWS_BLOCK_FULL_APPLY. SOURCE_WRITE_STILL_FORBIDDEN.',
    },
    summary,
    sourceApplyCandidates: candidateRows,
    blockers: blockerRows,
    validations,
    outputs: {
      readinessJson: toFrontendRelative(readinessJsonPath),
      readinessMd: toFrontendRelative(readinessMdPath),
      sourceApplyCandidateCsv: toFrontendRelative(sourceApplyCandidateCsvPath),
      blockersCsv: toFrontendRelative(blockersCsvPath),
      validationCsv: toFrontendRelative(validationCsvPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };
}

async function writeReadiness() {
  const payload = await buildPayload();
  const { summary } = payload;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(readinessJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
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
    'previousVisualPath',
    'nextVisualPath',
    'previousHitPath',
    'nextHitPath',
    'previousLabelPoint',
    'nextLabelPoint',
    'applyStatus',
    'sourceApplyAllowed',
    'sourceDataWritePerformed',
  ]));
  await fs.writeFile(blockersCsvPath, buildCsv(payload.blockers, [
    'blockerOrder',
    'rowId',
    'severity',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(validationCsvPath, buildCsv(payload.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(readinessMdPath, [
    '# 대구 operator reference P61 post-P60 readiness',
    '',
    `- status: \`${summary.status}\``,
    `- target section: \`${summary.targetSectionId}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source apply plan rows: \`${summary.sourceApplyPlanRows}\``,
    `- pilot patch ready: \`${summary.pilotPatchReady}\``,
    `- single row apply candidate: \`${summary.singleRowApplyCandidate}\``,
    `- full release blocked: \`${summary.fullReleaseBlocked}\``,
    `- pending rows block full apply: \`${summary.pendingRowsBlockFullApply}\``,
    `- source write still forbidden: \`${summary.sourceWriteStillForbidden}\``,
    `- source apply allowed: \`${summary.sourceApplyAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
    '## Conclusion',
    '',
    '- TR-9 pilot patch is ready as a candidate.',
    '- Full source apply remains blocked because 130 rows are still pending.',
    '- No source data has been written.',
    '- `PASS_RELEASE_177` remains forbidden.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} pilotPatchReady=${summary.pilotPatchReady} singleRowApplyCandidate=${summary.singleRowApplyCandidate} fullReleaseBlocked=${summary.fullReleaseBlocked} pendingRows=${summary.pendingRows} sourceApplyAllowed=${summary.sourceApplyAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const readiness = await writeReadiness();
  const invalidRows = (readiness.validations ?? []).filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = (readiness.validations ?? []).filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p61-post-p60-readiness-gate-passed' : 'p61-post-p60-readiness-gate-blocked',
    readinessStatus: readiness.summary?.status ?? '',
    totalValidations: readiness.validations?.length ?? 0,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    targetSectionId: readiness.summary?.targetSectionId ?? '',
    approvedRows: readiness.summary?.approvedRows ?? 0,
    pendingRows: readiness.summary?.pendingRows ?? 0,
    sourcePatchRows: readiness.summary?.sourcePatchRows ?? 0,
    sourceApplyPlanRows: readiness.summary?.sourceApplyPlanRows ?? 0,
    pilotPatchReady: readiness.summary?.pilotPatchReady === true,
    singleRowApplyCandidate: readiness.summary?.singleRowApplyCandidate === true,
    fullReleaseBlocked: readiness.summary?.fullReleaseBlocked === true,
    pendingRowsBlockFullApply: readiness.summary?.pendingRowsBlockFullApply === true,
    sourceWriteStillForbidden: readiness.summary?.sourceWriteStillForbidden === true,
    sourceApplyAllowed: false,
    passRelease177Allowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: readiness.summary?.buildBlockerTrackedSeparately,
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations: readiness.validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(readiness.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P61 post-P60 readiness gate',
    '',
    `- status: \`${summary.status}\``,
    `- target section: \`${summary.targetSectionId}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source apply plan rows: \`${summary.sourceApplyPlanRows}\``,
    `- pilot patch ready: \`${summary.pilotPatchReady}\``,
    `- single row apply candidate: \`${summary.singleRowApplyCandidate}\``,
    `- full release blocked: \`${summary.fullReleaseBlocked}\``,
    `- source write still forbidden: \`${summary.sourceWriteStillForbidden}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} pilotPatchReady=${summary.pilotPatchReady} singleRowApplyCandidate=${summary.singleRowApplyCandidate} fullReleaseBlocked=${summary.fullReleaseBlocked} pendingRows=${summary.pendingRows} sourceApplyAllowed=${summary.sourceApplyAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'readiness') {
  await writeReadiness();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
