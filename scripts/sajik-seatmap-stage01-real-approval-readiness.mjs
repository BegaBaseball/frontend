#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');

const REAL_APPROVAL_READINESS_VERSION = 'SAJIK_STAGE01_REAL_APPROVAL_READINESS_V1';
const REQUIRED_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
const REQUIRED_INPUT_AID_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_AID_V1';
const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
const REQUIRED_APPLY_READY_VERSION = 'SAJIK_STAGE01_APPLY_READY_V1';
const REQUIRED_POST_APPLY_VERSION = 'SAJIK_STAGE01_POST_APPLY_AUDIT_V1';
const REQUIRED_OPERATOR_STATUS_VERSION = 'SAJIK_STAGE01_OPERATOR_STATUS_V1';
const REQUIRED_MANUAL_PATCH_PLAN_VERSION = 'SAJIK_STAGE01_MANUAL_PATCH_PLAN_V1';
const TARGET_STAGE_LABEL = 'Stage 01 P0';
const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
const EXPECTED_STAGE01_ROWS = 16;
const EXPECTED_STAGE01_SECTION_IDS = [
  '021',
  '022',
  '031',
  '032',
  '121',
  '122',
  '123',
  '124',
  '125',
  '131',
  '132',
  '133',
  '134',
  '135',
  '142',
  '143',
];
const WRITABLE_SOURCE_FIELDS = [
  'imageGeometry.hitPath',
  'imageGeometry.labelPoint',
  'imageGeometry.labelX',
  'imageGeometry.labelY',
];
const LOCKED_SOURCE_FIELDS = [
  'imageGeometry.visualPath',
  'imageGeometry.geometryVersion',
  'sectionKind',
  'markerType',
  'mapInteractionStatus',
  'traceSource',
  'traceMethod',
  'traceVersion',
];
const APPROVED_READINESS_STATUSES = [
  'APPROVED_READY',
  'APPROVED_NOT_APPLIED',
  'APPROVED_APPLIED',
  'APPROVED_BLOCKED',
];
const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const writeCsv = async (filePath, rows) => {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const sorted = (values) => [...values].sort();

const sameStringArray = (actual, expected) => (
  Array.isArray(actual)
  && actual.length === expected.length
  && expected.every((value, index) => actual[index] === value)
);

const reportStatus = (report) => report?.summary?.status ?? report?.status ?? 'missing';

const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

const relativeToFrontend = (filePath) => path.relative(frontendRoot, filePath);

const pushVersionBlocker = (blockers, reportName, actual, expected) => {
  if (actual !== expected) {
    blockers.push(`${reportName}_VERSION_MISMATCH:${actual ?? ''}:${expected}`);
  }
};

const pushStageBlocker = (blockers, reportName, actual) => {
  if (actual !== TARGET_STAGE_LABEL) {
    blockers.push(`${reportName}_STAGE_MISMATCH:${actual ?? ''}`);
  }
};

const pushFalseFlagBlocker = (blockers, reportName, flagName, actual) => {
  if (actual !== false) {
    blockers.push(`${reportName}_${flagName}_MUST_BE_FALSE`);
  }
};

const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
const operatorInputPath = path.resolve(
  frontendRoot,
  argValue('--operator-input', path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json')),
);
const inputAidPath = path.resolve(
  frontendRoot,
  argValue('--input-aid', path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.json')),
);
const prewritePath = path.resolve(
  frontendRoot,
  argValue('--prewrite', path.join(stageDir, 'sajik-seatmap-stage01-prewrite.json')),
);
const applyReadyPath = path.resolve(
  frontendRoot,
  argValue('--apply-ready', path.join(stageDir, 'sajik-seatmap-stage01-apply-ready.json')),
);
const postApplyPath = path.resolve(
  frontendRoot,
  argValue('--post-apply', path.join(stageDir, 'sajik-seatmap-stage01-post-apply-audit.json')),
);
const operatorStatusPath = path.resolve(
  frontendRoot,
  argValue('--operator-status', path.join(stageDir, 'sajik-seatmap-stage01-operator-status.json')),
);
const manualPatchPlanPath = path.resolve(
  frontendRoot,
  argValue('--manual-patch-plan', path.join(stageDir, 'sajik-seatmap-stage01-manual-patch-plan.json')),
);
const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-real-approval-readiness.json');
const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-real-approval-readiness.csv');
const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-real-approval-readiness.md');

const operatorInput = await readJson(operatorInputPath);
const inputAid = await readJson(inputAidPath);
const prewrite = await readJson(prewritePath);
const applyReady = await readJson(applyReadyPath);
const postApply = await readJson(postApplyPath);
const operatorStatus = await readJson(operatorStatusPath);
const manualPatchPlan = await readJson(manualPatchPlanPath);

const operatorRows = Array.isArray(operatorInput.corrections) ? operatorInput.corrections : [];
const inputAidRows = Array.isArray(inputAid.rows) ? inputAid.rows : [];
const prewriteRows = Array.isArray(prewrite.rows) ? prewrite.rows : [];
const applyReadyRows = Array.isArray(applyReady.rows) ? applyReady.rows : [];
const postApplyRows = Array.isArray(postApply.rows) ? postApply.rows : [];
const operatorStatusRows = Array.isArray(operatorStatus.rows) ? operatorStatus.rows : [];
const manualPatchRows = Array.isArray(manualPatchPlan.rows) ? manualPatchPlan.rows : [];
const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];

const inputAidBySectionId = new Map(inputAidRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const prewriteBySectionId = new Map(prewriteRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const applyReadyBySectionId = new Map(applyReadyRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const postApplyBySectionId = new Map(postApplyRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const operatorStatusBySectionId = new Map(operatorStatusRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const manualPatchBySectionId = new Map(manualPatchRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const patchPayloadBySectionId = new Map(patchPayloads.map((payload) => [String(payload.sectionId ?? '').trim(), payload]));

const blockers = [];
const warnings = [];

pushVersionBlocker(blockers, 'OPERATOR_INPUT', operatorInput.packageVersion, REQUIRED_PACKAGE_VERSION);
pushVersionBlocker(blockers, 'INPUT_AID', inputAid.summary?.inputAidVersion, REQUIRED_INPUT_AID_VERSION);
pushVersionBlocker(blockers, 'PREWRITE', prewrite.summary?.prewriteVersion, REQUIRED_PREWRITE_VERSION);
pushVersionBlocker(blockers, 'APPLY_READY', applyReady.summary?.applyReadyVersion, REQUIRED_APPLY_READY_VERSION);
pushVersionBlocker(blockers, 'POST_APPLY', postApply.summary?.postApplyAuditVersion, REQUIRED_POST_APPLY_VERSION);
pushVersionBlocker(blockers, 'OPERATOR_STATUS', operatorStatus.summary?.operatorStatusVersion, REQUIRED_OPERATOR_STATUS_VERSION);
pushVersionBlocker(blockers, 'MANUAL_PATCH_PLAN', manualPatchPlan.summary?.manualPatchPlanVersion, REQUIRED_MANUAL_PATCH_PLAN_VERSION);

pushStageBlocker(blockers, 'OPERATOR_INPUT', operatorInput.targetStage);
pushStageBlocker(blockers, 'INPUT_AID', inputAid.summary?.targetStage);
pushStageBlocker(blockers, 'PREWRITE', prewrite.summary?.targetStage);
pushStageBlocker(blockers, 'APPLY_READY', applyReady.summary?.targetStage);
pushStageBlocker(blockers, 'POST_APPLY', postApply.summary?.targetStage);
pushStageBlocker(blockers, 'OPERATOR_STATUS', operatorStatus.summary?.targetStage);
pushStageBlocker(blockers, 'MANUAL_PATCH_PLAN', manualPatchPlan.summary?.targetStage);

pushFalseFlagBlocker(blockers, 'INPUT_AID', 'SOURCE_DATA_WRITE_PERFORMED', inputAid.summary?.sourceDataWritePerformed);
pushFalseFlagBlocker(blockers, 'PREWRITE', 'PRODUCTION_DATA_CHANGED', prewrite.summary?.productionDataChanged);
pushFalseFlagBlocker(blockers, 'PREWRITE', 'PRODUCTION_WRITE_ALLOWED', prewrite.summary?.productionWriteAllowed);
pushFalseFlagBlocker(blockers, 'APPLY_READY', 'PRODUCTION_DATA_CHANGED', applyReady.summary?.productionDataChanged);
pushFalseFlagBlocker(blockers, 'APPLY_READY', 'PRODUCTION_WRITE_ALLOWED', applyReady.summary?.productionWriteAllowed);
pushFalseFlagBlocker(blockers, 'APPLY_READY', 'SOURCE_DATA_WRITE_PERFORMED', applyReady.summary?.sourceDataWritePerformed);
pushFalseFlagBlocker(blockers, 'POST_APPLY', 'PRODUCTION_WRITE_ALLOWED', postApply.summary?.productionWriteAllowed);
pushFalseFlagBlocker(blockers, 'POST_APPLY', 'SOURCE_DATA_WRITE_PERFORMED', postApply.summary?.sourceDataWritePerformed);
pushFalseFlagBlocker(blockers, 'OPERATOR_STATUS', 'PRODUCTION_WRITE_ALLOWED', operatorStatus.summary?.productionWriteAllowed);
pushFalseFlagBlocker(blockers, 'OPERATOR_STATUS', 'SOURCE_DATA_WRITE_PERFORMED', operatorStatus.summary?.sourceDataWritePerformed);
pushFalseFlagBlocker(blockers, 'MANUAL_PATCH_PLAN', 'PRODUCTION_WRITE_ALLOWED', manualPatchPlan.summary?.productionWriteAllowed);
pushFalseFlagBlocker(blockers, 'MANUAL_PATCH_PLAN', 'SOURCE_DATA_WRITE_PERFORMED', manualPatchPlan.summary?.sourceDataWritePerformed);

if (postApply.summary?.readOnly !== true) {
  blockers.push('POST_APPLY_MUST_BE_READ_ONLY');
}
if (manualPatchPlan.summary?.targetSourceFile !== TARGET_SOURCE_FILE) {
  blockers.push(`TARGET_SOURCE_FILE_MISMATCH:${manualPatchPlan.summary?.targetSourceFile ?? ''}:${TARGET_SOURCE_FILE}`);
}
if (!sameStringArray(manualPatchPlan.summary?.writableSourceFields, WRITABLE_SOURCE_FIELDS)) {
  blockers.push('WRITABLE_SOURCE_FIELDS_MISMATCH');
}
if (!sameStringArray(manualPatchPlan.summary?.lockedSourceFields, LOCKED_SOURCE_FIELDS)) {
  blockers.push('LOCKED_SOURCE_FIELDS_MISMATCH');
}

const operatorIds = sorted(operatorRows.map((row) => String(row.sectionId ?? '').trim()));
const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
if (operatorRows.length !== EXPECTED_STAGE01_ROWS) {
  blockers.push(`STAGE01_OPERATOR_ROW_COUNT_MISMATCH:${operatorRows.length}:${EXPECTED_STAGE01_ROWS}`);
}
if (operatorIds.join(',') !== expectedIds.join(',')) {
  blockers.push(`STAGE01_OPERATOR_SECTION_IDS_MISMATCH:${operatorIds.join(' ')}:${expectedIds.join(' ')}`);
}

const rows = operatorRows.map((operatorRow) => {
  const sectionId = String(operatorRow.sectionId ?? '').trim();
  const decision = normalizeDecision(operatorRow.operatorDecision);
  const inputAidRow = inputAidBySectionId.get(sectionId);
  const prewriteRow = prewriteBySectionId.get(sectionId);
  const applyReadyRow = applyReadyBySectionId.get(sectionId);
  const postApplyRow = postApplyBySectionId.get(sectionId);
  const operatorStatusRow = operatorStatusBySectionId.get(sectionId);
  const manualPatchRow = manualPatchBySectionId.get(sectionId);
  const patchPayload = patchPayloadBySectionId.get(sectionId);
  const rowBlockers = [];
  const rowWarnings = [];

  if (!EXPECTED_STAGE01_SECTION_IDS.includes(sectionId)) {
    rowBlockers.push(`SECTION_OUTSIDE_STAGE01:${sectionId}`);
  }
  if (!DECISION_OPTIONS.has(decision)) {
    rowBlockers.push(`UNKNOWN_OPERATOR_DECISION:${decision}`);
  }

  let readinessStatus = operatorStatusRow?.rowStatus ?? inputAidRow?.rowStatus ?? 'PENDING';
  let readinessAction = decision === 'PENDING' ? 'FILL_OR_DECIDE' : 'NO_PATCH_PREVIEW';

  if (decision === 'APPROVED') {
    if (!patchPayload) {
      rowBlockers.push('PATCH_PAYLOAD_MISSING');
    }
    if (prewriteRow?.validForPatchPreview !== true) {
      rowBlockers.push('APPROVED_ROW_NOT_VALID_FOR_PATCH_PREVIEW');
    }
    if (patchPayload?.sectionKind !== 'SEAT_SECTION') {
      rowBlockers.push(`SECTION_KIND_NOT_WRITABLE:${patchPayload?.sectionKind ?? ''}`);
    }
    if (patchPayload?.validation?.status !== 'PASS') {
      rowBlockers.push(`PATCH_PAYLOAD_VALIDATION_NOT_PASS:${patchPayload?.validation?.status ?? ''}`);
    }
    if (patchPayload && patchPayload.before?.visualPath !== patchPayload.after?.visualPath) {
      rowBlockers.push('VISUAL_PATH_CHANGED_WITHOUT_APPROVAL');
    }
    if (manualPatchRow && manualPatchRow.targetSourceFile !== TARGET_SOURCE_FILE) {
      rowBlockers.push(`MANUAL_PATCH_TARGET_SOURCE_FILE_MISMATCH:${manualPatchRow.targetSourceFile ?? ''}`);
    }
    if (manualPatchRow && !sameStringArray(manualPatchRow.writableSourceFields, WRITABLE_SOURCE_FIELDS)) {
      rowBlockers.push('MANUAL_PATCH_WRITABLE_SOURCE_FIELDS_MISMATCH');
    }
    if (manualPatchRow && !sameStringArray(manualPatchRow.lockedSourceFields, LOCKED_SOURCE_FIELDS)) {
      rowBlockers.push('MANUAL_PATCH_LOCKED_SOURCE_FIELDS_MISMATCH');
    }

    const hitPathChanged = patchPayload && patchPayload.before?.hitPath !== patchPayload.after?.hitPath;
    const labelPointChanged = patchPayload && JSON.stringify(patchPayload.before?.labelPoint) !== JSON.stringify(patchPayload.after?.labelPoint);
    if (patchPayload && !hitPathChanged && !labelPointChanged) {
      rowWarnings.push('APPROVED_NO_GEOMETRY_DELTA');
    }

    if (rowBlockers.length > 0 || operatorStatusRow?.rowStatus === 'INVALID') {
      readinessStatus = 'APPROVED_BLOCKED';
      readinessAction = 'FIX_APPROVAL';
    } else if (operatorStatusRow?.rowStatus === 'APPLIED' || postApplyRow?.applied === true) {
      readinessStatus = 'APPROVED_APPLIED';
      readinessAction = 'VERIFY_APPLIED';
    } else if (operatorStatusRow?.rowStatus === 'NOT_APPLIED' || manualPatchRow?.action === 'MANUAL_PATCH_REQUIRED') {
      readinessStatus = 'APPROVED_NOT_APPLIED';
      readinessAction = 'APPLY_MANUAL_PATCH';
    } else if (reportStatus(applyReady) === 'ready-for-manual-apply') {
      readinessStatus = 'APPROVED_READY';
      readinessAction = 'REVIEW_MANUAL_PATCH';
    } else {
      readinessStatus = 'APPROVED_BLOCKED';
      readinessAction = 'FIX_APPROVAL';
      rowBlockers.push(`APPROVED_ROW_NOT_READY:${reportStatus(applyReady)}`);
    }
  }

  rowBlockers.forEach((blocker) => blockers.push(`${blocker}:${sectionId}`));
  rowWarnings.forEach((warning) => warnings.push(`${warning}:${sectionId}`));

  return {
    sectionId,
    batchId: operatorRow.batchId ?? operatorStatusRow?.batchId ?? '',
    zoneId: operatorRow.zoneId ?? operatorStatusRow?.zoneId ?? '',
    sectionName: operatorRow.sectionName ?? operatorStatusRow?.sectionName ?? '',
    seatCategoryLabel: operatorRow.seatCategoryLabel ?? operatorStatusRow?.seatCategoryLabel ?? '',
    operatorDecision: decision,
    inputAidRowStatus: inputAidRow?.rowStatus ?? '',
    operatorRowStatus: operatorStatusRow?.rowStatus ?? '',
    readinessStatus,
    readinessAction,
    patchPreviewEligible: decision === 'APPROVED',
    validForPatchPreview: Boolean(prewriteRow?.validForPatchPreview),
    applied: Boolean(postApplyRow?.applied),
    manualPatchRequired: manualPatchRow?.action === 'MANUAL_PATCH_REQUIRED',
    geometryDelta: Boolean(prewriteRow?.geometryDelta),
    visualPathLocked: patchPayload ? patchPayload.before?.visualPath === patchPayload.after?.visualPath : null,
    hitPathChanged: patchPayload ? patchPayload.before?.hitPath !== patchPayload.after?.hitPath : null,
    labelPointChanged: patchPayload
      ? JSON.stringify(patchPayload.before?.labelPoint) !== JSON.stringify(patchPayload.after?.labelPoint)
      : null,
    targetSourceFile: manualPatchRow?.targetSourceFile ?? TARGET_SOURCE_FILE,
    writableSourceFields: manualPatchRow?.writableSourceFields ?? WRITABLE_SOURCE_FIELDS,
    lockedSourceFields: manualPatchRow?.lockedSourceFields ?? LOCKED_SOURCE_FIELDS,
    blockers: rowBlockers,
    warnings: rowWarnings,
  };
});

const readinessCounts = rows.reduce((counts, row) => {
  counts[row.readinessStatus] = (counts[row.readinessStatus] ?? 0) + 1;
  return counts;
}, {});
const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
const approvedReadyRows = rows.filter((row) => row.readinessStatus === 'APPROVED_READY');
const approvedNotAppliedRows = rows.filter((row) => row.readinessStatus === 'APPROVED_NOT_APPLIED');
const approvedAppliedRows = rows.filter((row) => row.readinessStatus === 'APPROVED_APPLIED');
const approvedBlockedRows = rows.filter((row) => row.readinessStatus === 'APPROVED_BLOCKED');
const manualPatchRequiredRows = rows.filter((row) => row.manualPatchRequired);

let status = 'waiting-for-operator';
if (blockers.length > 0 || approvedBlockedRows.length > 0 || reportStatus(inputAid) === 'blocked' || reportStatus(prewrite) === 'blocked' || reportStatus(applyReady) === 'blocked' || reportStatus(operatorStatus) === 'blocked' || reportStatus(manualPatchPlan) === 'blocked') {
  status = 'blocked';
} else if (approvedRows.length === 0) {
  status = 'waiting-for-operator';
} else if (approvedNotAppliedRows.length > 0 || approvedReadyRows.length > 0) {
  status = 'ready-for-manual-apply';
} else if (approvedAppliedRows.length === approvedRows.length) {
  status = 'applied';
}

const summary = {
  realApprovalReadinessVersion: REAL_APPROVAL_READINESS_VERSION,
  status,
  generatedAt: new Date().toISOString(),
  stageDir: relativeToFrontend(stageDir),
  operatorInput: relativeToFrontend(operatorInputPath),
  inputAid: relativeToFrontend(inputAidPath),
  prewrite: relativeToFrontend(prewritePath),
  applyReady: relativeToFrontend(applyReadyPath),
  postApply: relativeToFrontend(postApplyPath),
  operatorStatus: relativeToFrontend(operatorStatusPath),
  manualPatchPlan: relativeToFrontend(manualPatchPlanPath),
  targetStage: TARGET_STAGE_LABEL,
  targetSourceFile: TARGET_SOURCE_FILE,
  totalRows: rows.length,
  expectedRows: EXPECTED_STAGE01_ROWS,
  approvedRows: approvedRows.length,
  approvedReadyRows: approvedReadyRows.length,
  approvedNotAppliedRows: approvedNotAppliedRows.length,
  approvedAppliedRows: approvedAppliedRows.length,
  approvedBlockedRows: approvedBlockedRows.length,
  manualPatchRows: manualPatchPlan.summary?.manualPatchRows ?? manualPatchRequiredRows.length,
  manualPatchRequiredRows: manualPatchRequiredRows.length,
  pendingRows: rows.filter((row) => row.operatorDecision === 'PENDING').length,
  rejectedRows: rows.filter((row) => row.operatorDecision === 'REJECTED').length,
  needsRetraceRows: rows.filter((row) => row.operatorDecision === 'NEEDS_RETRACE').length,
  keepCurrentRows: rows.filter((row) => row.operatorDecision === 'KEEP_CURRENT').length,
  readinessCounts,
  approvedReadinessStatuses: APPROVED_READINESS_STATUSES,
  reportStatuses: {
    inputAid: reportStatus(inputAid),
    prewrite: reportStatus(prewrite),
    applyReady: reportStatus(applyReady),
    postApply: reportStatus(postApply),
    operatorStatus: reportStatus(operatorStatus),
    manualPatchPlan: reportStatus(manualPatchPlan),
  },
  safetyContract: {
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
    productionDataChanged: false,
    writableSourceFields: WRITABLE_SOURCE_FIELDS,
    lockedSourceFields: LOCKED_SOURCE_FIELDS,
    sourceWritePolicy: 'read-only readiness gate; manual review patch only',
  },
  blockers,
  warnings,
};

const report = {
  generatedAt: summary.generatedAt,
  summary,
  rows,
};

const csvRows = [
  [
    'sectionId',
    'batchId',
    'zoneId',
    'operatorDecision',
    'inputAidRowStatus',
    'operatorRowStatus',
    'readinessStatus',
    'readinessAction',
    'validForPatchPreview',
    'applied',
    'manualPatchRequired',
    'geometryDelta',
    'visualPathLocked',
    'hitPathChanged',
    'labelPointChanged',
    'blockers',
    'warnings',
  ],
  ...rows.map((row) => [
    row.sectionId,
    row.batchId,
    row.zoneId,
    row.operatorDecision,
    row.inputAidRowStatus,
    row.operatorRowStatus,
    row.readinessStatus,
    row.readinessAction,
    row.validForPatchPreview,
    row.applied,
    row.manualPatchRequired,
    row.geometryDelta,
    row.visualPathLocked,
    row.hitPathChanged,
    row.labelPointChanged,
    row.blockers.join(';'),
    row.warnings.join(';'),
  ]),
];

const approvedRowsTable = markdownTable(
  ['section', 'decision', 'readiness', 'action', 'manualPatch', 'visualLocked', 'hitChanged', 'labelChanged', 'blockers', 'warnings'],
  (approvedRows.length > 0 ? approvedRows : rows).map((row) => [
    row.sectionId,
    row.operatorDecision,
    row.readinessStatus,
    row.readinessAction,
    row.manualPatchRequired,
    row.visualPathLocked,
    row.hitPathChanged,
    row.labelPointChanged,
    row.blockers.join('<br>'),
    row.warnings.join('<br>'),
  ]),
);

const markdown = [
  '# Sajik Stage 01 Real Approval Readiness',
  '',
  `- status: \`${summary.status}\``,
  `- approved rows: \`${summary.approvedRows}\``,
  `- approved ready rows: \`${summary.approvedReadyRows}\``,
  `- approved not applied rows: \`${summary.approvedNotAppliedRows}\``,
  `- approved applied rows: \`${summary.approvedAppliedRows}\``,
  `- approved blocked rows: \`${summary.approvedBlockedRows}\``,
  `- manual patch rows: \`${summary.manualPatchRows}\``,
  `- blockers: \`${summary.blockers.length}\``,
  `- source data write performed: \`${summary.safetyContract.sourceDataWritePerformed}\``,
  '',
  '## Readiness Statuses',
  '',
  '- `APPROVED_READY`: approved row has a valid patch preview and is review-ready.',
  '- `APPROVED_NOT_APPLIED`: approved row is valid and requires a manual source patch.',
  '- `APPROVED_APPLIED`: approved row already matches production data.',
  '- `APPROVED_BLOCKED`: approved row has invalid input, unsafe section kind, visualPath change, or blocked upstream report.',
  '',
  '## Approved Row Readiness',
  '',
  approvedRowsTable,
  '',
  '## Safety Contract',
  '',
  `- target source file: \`${TARGET_SOURCE_FILE}\``,
  `- writable source fields: \`${WRITABLE_SOURCE_FIELDS.join(', ')}\``,
  `- locked source fields: \`${LOCKED_SOURCE_FIELDS.join(', ')}\``,
  '- source data write performed: `false`',
  '- production write allowed: `false`',
  '- production data changed: `false`',
  '',
  '## Next Step',
  '',
  summary.status === 'waiting-for-operator'
    ? '- Wait for operator-approved Stage 01 rows.'
    : summary.status === 'ready-for-manual-apply'
      ? '- Review manual patch plan fragments and apply approved rows manually.'
      : summary.status === 'applied'
        ? '- Run post-apply audit with `--require-applied` before entering Stage 02.'
        : '- Fix blockers before applying any source patch.',
].join('\n');

await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, csvRows);
await fs.writeFile(markdownPath, `${markdown}\n`, 'utf8');

console.log(`stage01_real_approval_readiness_json:${relativeToFrontend(jsonPath)}`);
console.log(`stage01_real_approval_readiness_csv:${relativeToFrontend(csvPath)}`);
console.log(`stage01_real_approval_readiness_markdown:${relativeToFrontend(markdownPath)}`);
console.log(`status:${summary.status} approved=${summary.approvedRows} ready=${summary.approvedReadyRows} notApplied=${summary.approvedNotAppliedRows} applied=${summary.approvedAppliedRows} blocked=${summary.approvedBlockedRows} manualPatchRows=${summary.manualPatchRows} blockers=${summary.blockers.length} sourceDataWritePerformed=false`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
