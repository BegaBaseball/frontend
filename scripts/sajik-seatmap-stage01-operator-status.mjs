import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSajikSeatMapDataset,
} from '../src/data/sajikSeatMapDataset.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');

const STATUS_VERSION = 'SAJIK_STAGE01_OPERATOR_STATUS_V1';
const REQUIRED_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
const REQUIRED_APPLY_READY_VERSION = 'SAJIK_STAGE01_APPLY_READY_V1';
const REQUIRED_POST_APPLY_VERSION = 'SAJIK_STAGE01_POST_APPLY_AUDIT_V1';
const TARGET_STAGE_LABEL = 'Stage 01 P0';
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

const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
const operatorInputPath = path.resolve(
  frontendRoot,
  argValue('--operator-input', path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json')),
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
const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-status.json');
const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-status.csv');
const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-status.md');

const dataset = buildSajikSeatMapDataset();
const input = await readJson(operatorInputPath);
const prewrite = await readJson(prewritePath);
const applyReady = await readJson(applyReadyPath);
const postApply = await readJson(postApplyPath);

const operatorRows = Array.isArray(input.corrections) ? input.corrections : [];
const prewriteRows = Array.isArray(prewrite.rows) ? prewrite.rows : [];
const applyReadyRows = Array.isArray(applyReady.rows) ? applyReady.rows : [];
const postApplyRows = Array.isArray(postApply.rows) ? postApply.rows : [];
const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];

const operatorBySectionId = new Map(operatorRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const prewriteBySectionId = new Map(prewriteRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const applyReadyBySectionId = new Map(applyReadyRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const postApplyBySectionId = new Map(postApplyRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const patchPayloadBySectionId = new Map(patchPayloads.map((payload) => [String(payload.sectionId ?? '').trim(), payload]));

const blockers = [];
const warnings = [];

if (input.packageVersion !== REQUIRED_PACKAGE_VERSION) {
  blockers.push(`OPERATOR_INPUT_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (input.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`OPERATOR_INPUT_STAGE_MISMATCH:${input.targetStage ?? ''}`);
}
if (prewrite.summary?.prewriteVersion !== REQUIRED_PREWRITE_VERSION) {
  blockers.push(`PREWRITE_VERSION_MISMATCH:${prewrite.summary?.prewriteVersion ?? ''}`);
}
if (applyReady.summary?.applyReadyVersion !== REQUIRED_APPLY_READY_VERSION) {
  blockers.push(`APPLY_READY_VERSION_MISMATCH:${applyReady.summary?.applyReadyVersion ?? ''}`);
}
if (postApply.summary?.postApplyAuditVersion !== REQUIRED_POST_APPLY_VERSION) {
  blockers.push(`POST_APPLY_VERSION_MISMATCH:${postApply.summary?.postApplyAuditVersion ?? ''}`);
}
if (prewrite.summary?.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`PREWRITE_STAGE_MISMATCH:${prewrite.summary?.targetStage ?? ''}`);
}
if (applyReady.summary?.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`APPLY_READY_STAGE_MISMATCH:${applyReady.summary?.targetStage ?? ''}`);
}
if (postApply.summary?.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`POST_APPLY_STAGE_MISMATCH:${postApply.summary?.targetStage ?? ''}`);
}
if (prewrite.summary?.productionDataChanged !== false) {
  blockers.push('PREWRITE_PRODUCTION_DATA_CHANGED');
}
if (prewrite.summary?.productionWriteAllowed !== false) {
  blockers.push('PREWRITE_PRODUCTION_WRITE_ALLOWED');
}
if (applyReady.summary?.productionDataChanged !== false) {
  blockers.push('APPLY_READY_PRODUCTION_DATA_CHANGED');
}
if (applyReady.summary?.productionWriteAllowed !== false) {
  blockers.push('APPLY_READY_PRODUCTION_WRITE_ALLOWED');
}
if (applyReady.summary?.sourceDataWritePerformed !== false) {
  blockers.push('APPLY_READY_SOURCE_DATA_WRITE_PERFORMED');
}
if (postApply.summary?.readOnly !== true) {
  blockers.push('POST_APPLY_NOT_READ_ONLY');
}
if (postApply.summary?.productionWriteAllowed !== false) {
  blockers.push('POST_APPLY_PRODUCTION_WRITE_ALLOWED');
}
if (postApply.summary?.sourceDataWritePerformed !== false) {
  blockers.push('POST_APPLY_SOURCE_DATA_WRITE_PERFORMED');
}

const operatorIds = sorted(operatorRows.map((row) => String(row.sectionId ?? '').trim()));
const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
if (operatorRows.length !== EXPECTED_STAGE01_ROWS) {
  blockers.push(`STAGE01_OPERATOR_ROW_COUNT_MISMATCH:${operatorRows.length}:${EXPECTED_STAGE01_ROWS}`);
}
if (operatorIds.join(',') !== expectedIds.join(',')) {
  blockers.push(`STAGE01_OPERATOR_SECTION_IDS_MISMATCH:${operatorIds.join(' ')}:${expectedIds.join(' ')}`);
}

const rowStatusFor = ({ operatorRow, prewriteRow, postApplyRow }) => {
  const decision = normalizeDecision(operatorRow?.operatorDecision);
  if (!DECISION_OPTIONS.has(decision)) return 'INVALID';
  if (decision === 'PENDING') return 'PENDING';
  if (decision === 'REJECTED') return 'REJECTED';
  if (decision === 'NEEDS_RETRACE') return 'NEEDS_RETRACE';
  if (decision === 'KEEP_CURRENT') return 'KEEP_CURRENT';
  if (!prewriteRow || prewriteRow.validForPatchPreview !== true) return 'INVALID';
  if (!postApplyRow) return 'NOT_APPLIED';
  return postApplyRow.applied ? 'APPLIED' : 'NOT_APPLIED';
};

const statusSectionIds = [
  ...EXPECTED_STAGE01_SECTION_IDS,
  ...operatorIds.filter((sectionId) => !EXPECTED_STAGE01_SECTION_IDS.includes(sectionId)),
];

const rows = statusSectionIds.map((sectionId) => {
  const operatorRow = operatorBySectionId.get(sectionId);
  const prewriteRow = prewriteBySectionId.get(sectionId);
  const applyReadyRow = applyReadyBySectionId.get(sectionId);
  const postApplyRow = postApplyBySectionId.get(sectionId);
  const patchPayload = patchPayloadBySectionId.get(sectionId);
  const rowStatus = rowStatusFor({ operatorRow, prewriteRow, postApplyRow });
  const decision = normalizeDecision(operatorRow?.operatorDecision);
  const action = rowStatus === 'NOT_APPLIED'
    ? 'MANUAL_PATCH_REQUIRED'
    : rowStatus === 'INVALID'
      ? 'FIX_OPERATOR_INPUT'
      : rowStatus === 'PENDING'
        ? 'WAIT_FOR_OPERATOR'
        : rowStatus === 'REJECTED' || rowStatus === 'NEEDS_RETRACE' || rowStatus === 'KEEP_CURRENT'
          ? 'NO_PATCH_PREVIEW'
          : 'NO_ACTION';

  return {
    sectionId,
    batchId: operatorRow?.batchId ?? prewriteRow?.batchId ?? '',
    zoneId: operatorRow?.zoneId ?? prewriteRow?.zoneId ?? '',
    sectionName: operatorRow?.sectionName ?? prewriteRow?.sectionName ?? '',
    seatCategoryLabel: operatorRow?.seatCategoryLabel ?? prewriteRow?.seatCategoryLabel ?? '',
    operatorDecision: decision,
    rowStatus,
    action,
    validForPatchPreview: Boolean(prewriteRow?.validForPatchPreview),
    geometryDelta: Boolean(prewriteRow?.geometryDelta),
    applyReadyStatus: applyReadyRow ? (applyReadyRow.reasons?.length > 0 ? 'blocked' : applyReady.summary?.status) : applyReady.summary?.status,
    postApplyStatus: postApplyRow ? (postApplyRow.applied ? 'applied' : 'not-applied') : '-',
    reviewer: prewriteRow?.reviewer ?? operatorRow?.reviewer ?? '',
    reviewedAt: prewriteRow?.reviewedAt ?? operatorRow?.reviewedAt ?? '',
    prewriteReasons: prewriteRow?.reasons ?? [],
    prewriteWarnings: prewriteRow?.warnings ?? [],
    applyReadyReasons: applyReadyRow?.reasons ?? [],
    applyReadyWarnings: applyReadyRow?.warnings ?? [],
    postApplyReasons: postApplyRow?.reasons ?? [],
    patchPayload,
  };
});

const statusCounts = rows.reduce((accumulator, row) => ({
  ...accumulator,
  [row.rowStatus]: (accumulator[row.rowStatus] ?? 0) + 1,
}), {});
const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
const validApprovedRows = approvedRows.filter((row) => row.validForPatchPreview);
const invalidRows = rows.filter((row) => row.rowStatus === 'INVALID');
const notAppliedRows = rows.filter((row) => row.rowStatus === 'NOT_APPLIED');
const appliedRows = rows.filter((row) => row.rowStatus === 'APPLIED');
const pendingRows = rows.filter((row) => row.rowStatus === 'PENDING');
const rejectedRows = rows.filter((row) => row.rowStatus === 'REJECTED');
const needsRetraceRows = rows.filter((row) => row.rowStatus === 'NEEDS_RETRACE');
const keepCurrentRows = rows.filter((row) => row.rowStatus === 'KEEP_CURRENT');

if (prewrite.summary?.status === 'blocked') {
  blockers.push(...(prewrite.summary.blockers ?? []).map((blocker) => `PREWRITE_BLOCKED:${blocker}`));
}
if (applyReady.summary?.status === 'blocked') {
  blockers.push(...(applyReady.summary.blockers ?? []).map((blocker) => `APPLY_READY_BLOCKED:${blocker}`));
}
if (postApply.summary?.status === 'blocked') {
  blockers.push(...(postApply.summary.blockers ?? []).map((blocker) => `POST_APPLY_BLOCKED:${blocker}`));
}
if (invalidRows.length > 0) {
  blockers.push(`INVALID_APPROVED_ROWS:${invalidRows.map((row) => row.sectionId).join(' ')}`);
}
if (approvedRows.length === 0) {
  warnings.push('NO_OPERATOR_APPROVED_STAGE01_ROWS');
}
if (notAppliedRows.length > 0) {
  warnings.push(`APPROVED_ROWS_NOT_APPLIED:${notAppliedRows.map((row) => row.sectionId).join(' ')}`);
}
if (rejectedRows.length > 0) {
  warnings.push(`REJECTED_ROWS:${rejectedRows.map((row) => row.sectionId).join(' ')}`);
}
if (needsRetraceRows.length > 0) {
  warnings.push(`NEEDS_RETRACE_ROWS:${needsRetraceRows.map((row) => row.sectionId).join(' ')}`);
}
if (keepCurrentRows.length > 0) {
  warnings.push(`KEEP_CURRENT_ROWS:${keepCurrentRows.map((row) => row.sectionId).join(' ')}`);
}

const status = blockers.length > 0
  ? 'blocked'
  : approvedRows.length === 0
    ? 'waiting-for-operator'
    : notAppliedRows.length > 0
      ? 'ready-for-manual-apply'
      : appliedRows.length === approvedRows.length
        ? 'applied'
        : 'in-progress';

const manualPatchChecklist = notAppliedRows.map((row) => ({
  sectionId: row.sectionId,
  batchId: row.batchId,
  sectionName: row.sectionName,
  applyHitPathFrom: 'patchPayload.after.hitPath',
  hitPath: row.patchPayload?.after?.hitPath ?? '',
  labelPoint: row.patchPayload?.after?.labelPoint ?? null,
  legacyLabelX: row.patchPayload?.after?.labelPoint?.[0] ?? null,
  legacyLabelY: row.patchPayload?.after?.labelPoint?.[1] ?? null,
  visualPathLocked: row.patchPayload?.before?.visualPath === row.patchPayload?.after?.visualPath,
  geometryVersion: 'manual-polygon-v2',
  sourcePreview: 'reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.patch-preview.ts',
}));

const summary = {
  operatorStatusVersion: STATUS_VERSION,
  status,
  generatedAt: new Date().toISOString(),
  operatorInput: path.relative(frontendRoot, operatorInputPath),
  prewrite: path.relative(frontendRoot, prewritePath),
  applyReady: path.relative(frontendRoot, applyReadyPath),
  postApply: path.relative(frontendRoot, postApplyPath),
  stadiumId: dataset.stadiumId,
  mapVersion: dataset.mapVersion,
  viewBox: dataset.image.viewBox,
  targetStage: TARGET_STAGE_LABEL,
  totalRows: rows.length,
  expectedRows: EXPECTED_STAGE01_ROWS,
  approvedRows: approvedRows.length,
  validApprovedRows: validApprovedRows.length,
  appliedRows: appliedRows.length,
  notAppliedRows: notAppliedRows.length,
  pendingRows: pendingRows.length,
  rejectedRows: rejectedRows.length,
  needsRetraceRows: needsRetraceRows.length,
  keepCurrentRows: keepCurrentRows.length,
  invalidRows: invalidRows.length,
  manualPatchChecklistRows: manualPatchChecklist.length,
  statusCounts,
  productionWriteAllowed: false,
  sourceDataWritePerformed: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: summary.generatedAt,
  summary,
  safetyContract: [
    'This script is a read-only Stage 01 operator status board; it never edits src/data/sajikSeatData.ts.',
    'It merges operator input, prewrite, apply-ready, and post-apply audit reports into row-level statuses.',
    'APPROVED rows can become APPLIED only when post-apply audit confirms current production data matches the patch payload.',
    'NOT_APPLIED rows require a manual data patch review using sajik-seatmap-stage01-prewrite.patch-preview.ts.',
    'Alias-only sections and accessibility markers are not writable in Stage 01.',
  ],
  rowStatusLegend: {
    PENDING: 'No operator decision yet.',
    APPROVED: 'Raw operator decision only; final rowStatus is APPLIED, NOT_APPLIED, or INVALID.',
    REJECTED: 'Operator rejected the candidate; no production patch preview should be applied.',
    NEEDS_RETRACE: 'Operator requested retracing; no production patch preview should be applied.',
    KEEP_CURRENT: 'Operator chose to keep the current production geometry; no production patch preview should be applied.',
    INVALID: 'Operator-approved row is malformed or blocked by prewrite/apply-ready validation.',
    APPLIED: 'Operator-approved row matches current production hitPath/labelPoint data.',
    NOT_APPLIED: 'Operator-approved row is valid but current production data does not match yet.',
  },
  rows,
  manualPatchChecklist,
};

await fs.mkdir(stageDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'sectionId',
    'batchId',
    'zoneId',
    'operatorDecision',
    'rowStatus',
    'action',
    'validForPatchPreview',
    'geometryDelta',
    'postApplyStatus',
    'reviewer',
    'reviewedAt',
    'reasons',
    'warnings',
  ],
  ...rows.map((row) => [
    row.sectionId,
    row.batchId,
    row.zoneId,
    row.operatorDecision,
    row.rowStatus,
    row.action,
    row.validForPatchPreview,
    row.geometryDelta,
    row.postApplyStatus,
    row.reviewer,
    row.reviewedAt,
    [
      ...row.prewriteReasons,
      ...row.applyReadyReasons,
      ...row.postApplyReasons,
    ].join('; '),
    [
      ...row.prewriteWarnings,
      ...row.applyReadyWarnings,
    ].join('; '),
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Sajik Stage 01 Operator Status',
  '',
  `- status version: \`${STATUS_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- approved rows: \`${summary.approvedRows}\``,
  `- valid approved rows: \`${summary.validApprovedRows}\``,
  `- applied rows: \`${summary.appliedRows}\``,
  `- not applied rows: \`${summary.notAppliedRows}\``,
  `- pending rows: \`${summary.pendingRows}\``,
  `- keep current rows: \`${summary.keepCurrentRows}\``,
  `- invalid rows: \`${summary.invalidRows}\``,
  `- manual patch checklist rows: \`${summary.manualPatchChecklistRows}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
  '',
  '## Rows',
  '',
  markdownTable(
    ['section', 'batch', 'zone', 'decision', 'row status', 'action', 'valid', 'delta', 'post-apply', 'reasons'],
    rows.map((row) => [
      `\`${row.sectionId}\``,
      `\`${row.batchId}\``,
      `\`${row.zoneId}\``,
      `\`${row.operatorDecision}\``,
      `\`${row.rowStatus}\``,
      `\`${row.action}\``,
      `\`${row.validForPatchPreview}\``,
      `\`${row.geometryDelta}\``,
      `\`${row.postApplyStatus}\``,
      [
        ...row.prewriteReasons,
        ...row.applyReadyReasons,
        ...row.postApplyReasons,
      ].join('; ') || '-',
    ]),
  ),
  '',
  '## Manual Patch Checklist',
  '',
  manualPatchChecklist.length > 0
    ? markdownTable(
      ['section', 'batch', 'hitPath source', 'labelPoint', 'labelX/Y', 'visual locked', 'source preview'],
      manualPatchChecklist.map((item) => [
        `\`${item.sectionId}\``,
        `\`${item.batchId}\``,
        `\`${item.applyHitPathFrom}\``,
        `\`${JSON.stringify(item.labelPoint)}\``,
        `\`${item.legacyLabelX},${item.legacyLabelY}\``,
        `\`${item.visualPathLocked}\``,
        `\`${item.sourcePreview}\``,
      ]),
    )
    : 'No manual Stage 01 data patch is currently required.',
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No operator status blockers.',
  '',
  '## Warnings',
  '',
  warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`stage01_operator_status_json:${path.relative(frontendRoot, jsonPath)}`);
console.log(`stage01_operator_status_csv:${path.relative(frontendRoot, csvPath)}`);
console.log(`stage01_operator_status_markdown:${path.relative(frontendRoot, markdownPath)}`);
console.log(`status:${summary.status} approved=${summary.approvedRows} applied=${summary.appliedRows} notApplied=${summary.notAppliedRows} pending=${summary.pendingRows} invalid=${summary.invalidRows} blockers=${summary.blockers.length}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
