import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSajikSeatMapDataset,
  formatSajikSeatMapSectionPatchTsFragment,
} from '../src/data/sajikSeatMapDataset.ts';
import {
  pathBounds,
  pathToPoints,
  polygonArea,
} from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');

const MANUAL_PATCH_PLAN_VERSION = 'SAJIK_STAGE01_MANUAL_PATCH_PLAN_V1';
const REQUIRED_OPERATOR_STATUS_VERSION = 'SAJIK_STAGE01_OPERATOR_STATUS_V1';
const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
const TARGET_STAGE_LABEL = 'Stage 01 P0';
const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
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

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const hasFlag = (name) => process.argv.includes(name);

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

const booleanText = (value) => (value ? 'true' : 'false');

const pointDelta = (before, after) => {
  if (!Array.isArray(before) || !Array.isArray(after)) return null;
  return [
    Number((after[0] - before[0]).toFixed(2)),
    Number((after[1] - before[1]).toFixed(2)),
  ];
};

const diffSummaryFor = (payload) => {
  const beforeHitPoints = pathToPoints(payload.before.hitPath);
  const afterHitPoints = pathToPoints(payload.after.hitPath);
  const beforeVisualPoints = pathToPoints(payload.before.visualPath);
  const afterVisualPoints = pathToPoints(payload.after.visualPath);

  return {
    visualPathChanged: payload.before.visualPath !== payload.after.visualPath,
    hitPathChanged: payload.before.hitPath !== payload.after.hitPath,
    labelPointChanged: JSON.stringify(payload.before.labelPoint) !== JSON.stringify(payload.after.labelPoint),
    hitPointCountBefore: beforeHitPoints.length,
    hitPointCountAfter: afterHitPoints.length,
    visualPointCountBefore: beforeVisualPoints.length,
    visualPointCountAfter: afterVisualPoints.length,
    hitAreaBefore: Number(polygonArea(beforeHitPoints).toFixed(2)),
    hitAreaAfter: Number(polygonArea(afterHitPoints).toFixed(2)),
    hitBoundsBefore: pathBounds(payload.before.hitPath),
    hitBoundsAfter: pathBounds(payload.after.hitPath),
    labelPointBefore: payload.before.labelPoint,
    labelPointAfter: payload.after.labelPoint,
    labelPointDelta: pointDelta(payload.before.labelPoint, payload.after.labelPoint),
  };
};

const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
const operatorStatusPath = path.resolve(
  frontendRoot,
  argValue('--operator-status', path.join(stageDir, 'sajik-seatmap-stage01-operator-status.json')),
);
const prewritePath = path.resolve(
  frontendRoot,
  argValue('--prewrite', path.join(stageDir, 'sajik-seatmap-stage01-prewrite.json')),
);
const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-manual-patch-plan.json');
const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-manual-patch-plan.csv');
const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-manual-patch-plan.md');
const requireReady = hasFlag('--require-ready');

const dataset = buildSajikSeatMapDataset();
const operatorStatus = await readJson(operatorStatusPath);
const prewrite = await readJson(prewritePath);

const operatorRows = Array.isArray(operatorStatus.rows) ? operatorStatus.rows : [];
const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];
const patchPayloadBySectionId = new Map(patchPayloads.map((payload) => [String(payload.sectionId ?? '').trim(), payload]));
const blockers = [];
const warnings = [];

if (operatorStatus.summary?.operatorStatusVersion !== REQUIRED_OPERATOR_STATUS_VERSION) {
  blockers.push(`OPERATOR_STATUS_VERSION_MISMATCH:${operatorStatus.summary?.operatorStatusVersion ?? ''}`);
}
if (prewrite.summary?.prewriteVersion !== REQUIRED_PREWRITE_VERSION) {
  blockers.push(`PREWRITE_VERSION_MISMATCH:${prewrite.summary?.prewriteVersion ?? ''}`);
}
if (operatorStatus.summary?.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`OPERATOR_STATUS_STAGE_MISMATCH:${operatorStatus.summary?.targetStage ?? ''}`);
}
if (prewrite.summary?.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`PREWRITE_STAGE_MISMATCH:${prewrite.summary?.targetStage ?? ''}`);
}
if (operatorStatus.summary?.productionWriteAllowed !== false) {
  blockers.push('OPERATOR_STATUS_PRODUCTION_WRITE_ALLOWED');
}
if (operatorStatus.summary?.sourceDataWritePerformed !== false) {
  blockers.push('OPERATOR_STATUS_SOURCE_DATA_WRITE_PERFORMED');
}
if (prewrite.summary?.productionDataChanged !== false) {
  blockers.push('PREWRITE_PRODUCTION_DATA_CHANGED');
}
if (prewrite.summary?.productionWriteAllowed !== false) {
  blockers.push('PREWRITE_PRODUCTION_WRITE_ALLOWED');
}
if (operatorStatus.summary?.status === 'blocked') {
  blockers.push(...(operatorStatus.summary.blockers ?? []).map((blocker) => `OPERATOR_STATUS_BLOCKED:${blocker}`));
}

const notAppliedRows = operatorRows.filter((row) => row.rowStatus === 'NOT_APPLIED');
const appliedRows = operatorRows.filter((row) => row.rowStatus === 'APPLIED');
const invalidRows = operatorRows.filter((row) => row.rowStatus === 'INVALID');
const approvedRows = operatorRows.filter((row) => row.operatorDecision === 'APPROVED');

const planRows = notAppliedRows.map((row) => {
  const patchPayload = row.patchPayload ?? patchPayloadBySectionId.get(row.sectionId);
  if (!patchPayload) {
    blockers.push(`PATCH_PAYLOAD_MISSING:${row.sectionId}`);
    return {
      sectionId: row.sectionId,
      action: 'PATCH_PAYLOAD_MISSING',
      reasons: ['PATCH_PAYLOAD_MISSING'],
    };
  }
  if (patchPayload.validation?.status !== 'PASS') {
    blockers.push(`PATCH_PAYLOAD_INVALID:${row.sectionId}:${patchPayload.validation?.status ?? ''}`);
  }

  const diffSummary = diffSummaryFor(patchPayload);
  return {
    sectionId: row.sectionId,
    blockId: patchPayload.blockId,
    batchId: row.batchId,
    zoneId: row.zoneId,
    sectionName: row.sectionName,
    seatCategoryLabel: row.seatCategoryLabel,
    targetSourceFile: TARGET_SOURCE_FILE,
    action: 'MANUAL_PATCH_REQUIRED',
    reviewer: row.reviewer,
    reviewedAt: row.reviewedAt,
    visualPathLocked: !diffSummary.visualPathChanged,
    geometryVersion: 'manual-polygon-v2',
    writableSourceFields: WRITABLE_SOURCE_FIELDS,
    lockedSourceFields: LOCKED_SOURCE_FIELDS,
    sourceEditChecklist: [
      'apply imageGeometry.hitPath from approved.hitPath',
      'apply imageGeometry.labelPoint from approved.labelPoint',
      'update imageGeometry.labelX and imageGeometry.labelY to match approved.labelPoint',
      'keep imageGeometry.visualPath unchanged',
      'keep sectionKind, markerType, mapInteractionStatus, traceSource, traceMethod, and traceVersion unchanged',
    ],
    current: {
      visualPath: patchPayload.before.visualPath,
      hitPath: patchPayload.before.hitPath,
      labelPoint: patchPayload.before.labelPoint,
      labelX: patchPayload.before.labelPoint?.[0] ?? null,
      labelY: patchPayload.before.labelPoint?.[1] ?? null,
    },
    approved: {
      visualPath: patchPayload.after.visualPath,
      hitPath: patchPayload.after.hitPath,
      labelPoint: patchPayload.after.labelPoint,
      labelX: patchPayload.after.labelPoint?.[0] ?? null,
      labelY: patchPayload.after.labelPoint?.[1] ?? null,
    },
    diffSummary,
    patchPayload,
    tsFragment: formatSajikSeatMapSectionPatchTsFragment(patchPayload),
  };
});

if (invalidRows.length > 0) {
  blockers.push(`INVALID_OPERATOR_STATUS_ROWS:${invalidRows.map((row) => row.sectionId).join(' ')}`);
}
if (approvedRows.length === 0) {
  warnings.push('NO_OPERATOR_APPROVED_STAGE01_ROWS');
}
if (planRows.length > 0) {
  warnings.push(`MANUAL_PATCH_REQUIRED:${planRows.map((row) => row.sectionId).join(' ')}`);
}

const baseStatus = blockers.length > 0
  ? 'blocked'
  : approvedRows.length === 0
    ? 'waiting-for-operator'
    : planRows.length > 0
      ? 'ready-for-manual-apply'
      : appliedRows.length === approvedRows.length
        ? 'applied'
        : operatorStatus.summary?.status ?? 'in-progress';

if (requireReady && baseStatus !== 'ready-for-manual-apply') {
  blockers.push(`REQUIRE_READY_NOT_SATISFIED:${baseStatus}`);
}

const status = blockers.length > 0 ? 'blocked' : baseStatus;
const summary = {
  manualPatchPlanVersion: MANUAL_PATCH_PLAN_VERSION,
  status,
  generatedAt: new Date().toISOString(),
  operatorStatus: path.relative(frontendRoot, operatorStatusPath),
  prewrite: path.relative(frontendRoot, prewritePath),
  stadiumId: dataset.stadiumId,
  mapVersion: dataset.mapVersion,
  viewBox: dataset.image.viewBox,
  targetStage: TARGET_STAGE_LABEL,
  targetSourceFile: TARGET_SOURCE_FILE,
  approvedRows: approvedRows.length,
  appliedRows: appliedRows.length,
  notAppliedRows: notAppliedRows.length,
  manualPatchRows: planRows.length,
  invalidRows: invalidRows.length,
  requireReady,
  productionWriteAllowed: false,
  sourceDataWritePerformed: false,
  writableSourceFields: WRITABLE_SOURCE_FIELDS,
  lockedSourceFields: LOCKED_SOURCE_FIELDS,
  blockers,
  warnings,
};

const report = {
  generatedAt: summary.generatedAt,
  summary,
  safetyContract: [
    'This script is a read-only Stage 01 manual patch plan; it never edits src/data/sajikSeatData.ts.',
    'It reads operator-status and prewrite output, then emits only NOT_APPLIED rows as manual patch targets.',
    'MANUAL_PATCH_REQUIRED rows must be reviewed before editing the production data file.',
    'The --require-ready flag fails unless the board is ready-for-manual-apply.',
    'Source data writes remain forbidden here: sourceDataWritePerformed=false and productionWriteAllowed=false.',
    'Writable source fields are limited to imageGeometry.hitPath, imageGeometry.labelPoint, imageGeometry.labelX, and imageGeometry.labelY.',
    'visualPath, sectionKind, markerType, mapInteractionStatus, and trace metadata are locked fields in this Stage 01 plan.',
  ],
  rows: planRows,
};

await fs.mkdir(stageDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'sectionId',
    'blockId',
    'batchId',
    'zoneId',
    'action',
    'visualPathLocked',
    'hitPathChanged',
    'labelPointChanged',
    'labelX',
    'labelY',
    'writableSourceFields',
    'lockedSourceFields',
    'targetSourceFile',
    'reviewer',
    'reviewedAt',
  ],
  ...planRows.map((row) => [
    row.sectionId,
    row.blockId,
    row.batchId,
    row.zoneId,
    row.action,
    row.visualPathLocked,
    row.diffSummary?.hitPathChanged,
    row.diffSummary?.labelPointChanged,
    row.approved?.labelX,
    row.approved?.labelY,
    row.writableSourceFields?.join('; '),
    row.lockedSourceFields?.join('; '),
    row.targetSourceFile,
    row.reviewer,
    row.reviewedAt,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Sajik Stage 01 Manual Patch Plan',
  '',
  `- plan version: \`${MANUAL_PATCH_PLAN_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- target source file: \`${summary.targetSourceFile}\``,
  `- approved rows: \`${summary.approvedRows}\``,
  `- applied rows: \`${summary.appliedRows}\``,
  `- not applied rows: \`${summary.notAppliedRows}\``,
  `- manual patch rows: \`${summary.manualPatchRows}\``,
  `- require ready: \`${summary.requireReady}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
  '',
  '## Source Edit Contract',
  '',
  `- writable source fields: \`${WRITABLE_SOURCE_FIELDS.join('`, `')}\``,
  `- locked source fields: \`${LOCKED_SOURCE_FIELDS.join('`, `')}\``,
  '- source edit checklist: apply only approved `hitPath` and `labelPoint`, then update legacy-compatible `labelX/labelY`.',
  '- lock rule: keep `visualPath`, `sectionKind`, `markerType`, `mapInteractionStatus`, and trace metadata unchanged.',
  '',
  '## Rows',
  '',
  planRows.length > 0
    ? markdownTable(
      ['section', 'batch', 'zone', 'action', 'visual locked', 'hit changed', 'label changed', 'labelPoint', 'writable fields', 'locked fields', 'target'],
      planRows.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.batchId}\``,
        `\`${row.zoneId}\``,
        `\`${row.action}\``,
        `\`${booleanText(row.visualPathLocked)}\``,
        `\`${booleanText(row.diffSummary?.hitPathChanged)}\``,
        `\`${booleanText(row.diffSummary?.labelPointChanged)}\``,
        `\`${JSON.stringify(row.approved?.labelPoint ?? null)}\``,
        `\`${row.writableSourceFields?.join(', ') ?? '-'}\``,
        `\`${row.lockedSourceFields?.join(', ') ?? '-'}\``,
        `\`${row.targetSourceFile}\``,
      ]),
    )
    : 'No manual Stage 01 source patch is currently required.',
  '',
  '## Patch Fragments',
  '',
  planRows.length > 0
    ? planRows.map((row) => [
      `### ${row.sectionId}`,
      '',
      '```ts',
      row.tsFragment,
      '```',
    ].join('\n')).join('\n\n')
    : 'No patch fragments.',
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No manual patch plan blockers.',
  '',
  '## Warnings',
  '',
  warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`stage01_manual_patch_plan_json:${path.relative(frontendRoot, jsonPath)}`);
console.log(`stage01_manual_patch_plan_csv:${path.relative(frontendRoot, csvPath)}`);
console.log(`stage01_manual_patch_plan_markdown:${path.relative(frontendRoot, markdownPath)}`);
console.log(`status:${summary.status} manualPatchRows=${summary.manualPatchRows} approved=${summary.approvedRows} applied=${summary.appliedRows} notApplied=${summary.notAppliedRows} blockers=${summary.blockers.length} requireReady=${summary.requireReady}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
