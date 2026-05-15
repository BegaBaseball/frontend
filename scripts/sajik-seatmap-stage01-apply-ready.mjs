import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSajikSeatMapDataset,
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
const defaultPrewritePath = path.join(defaultStageDir, 'sajik-seatmap-stage01-prewrite.json');
const defaultPatchPreviewPath = path.join(defaultStageDir, 'sajik-seatmap-stage01-prewrite.patch-preview.ts');

const APPLY_READY_VERSION = 'SAJIK_STAGE01_APPLY_READY_V1';
const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
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

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
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

const samePoint = (left, right) => (
  Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((value, index) => value === right[index])
);

const roundDelta = (value) => Number(value.toFixed(2));

const geometryStats = (pathData) => {
  const points = pathToPoints(pathData);
  return {
    pointCount: points.length,
    area: roundDelta(polygonArea(points)),
    bounds: pathBounds(pathData),
  };
};

const geometryDiffSummaryFor = (payload) => {
  const beforeHit = geometryStats(payload.before?.hitPath ?? '');
  const afterHit = geometryStats(payload.after?.hitPath ?? '');
  const beforeLabel = payload.before?.labelPoint ?? [null, null];
  const afterLabel = payload.after?.labelPoint ?? [null, null];

  return {
    pointCountBefore: beforeHit.pointCount,
    pointCountAfter: afterHit.pointCount,
    pointCountDelta: afterHit.pointCount - beforeHit.pointCount,
    areaBefore: beforeHit.area,
    areaAfter: afterHit.area,
    areaDelta: roundDelta(afterHit.area - beforeHit.area),
    boundsBefore: beforeHit.bounds,
    boundsAfter: afterHit.bounds,
    boundsDelta: {
      minX: roundDelta(afterHit.bounds.minX - beforeHit.bounds.minX),
      minY: roundDelta(afterHit.bounds.minY - beforeHit.bounds.minY),
      maxX: roundDelta(afterHit.bounds.maxX - beforeHit.bounds.maxX),
      maxY: roundDelta(afterHit.bounds.maxY - beforeHit.bounds.maxY),
    },
    labelPointBefore: beforeLabel,
    labelPointAfter: afterLabel,
    labelPointDelta: [
      typeof beforeLabel[0] === 'number' && typeof afterLabel[0] === 'number'
        ? roundDelta(afterLabel[0] - beforeLabel[0])
        : null,
      typeof beforeLabel[1] === 'number' && typeof afterLabel[1] === 'number'
        ? roundDelta(afterLabel[1] - beforeLabel[1])
        : null,
    ],
  };
};

const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
const prewritePath = path.resolve(frontendRoot, argValue('--prewrite', defaultPrewritePath));
const patchPreviewPath = path.resolve(frontendRoot, argValue('--patch-preview', defaultPatchPreviewPath));
const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-apply-ready.json');
const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-apply-ready.md');

const prewrite = await readJson(prewritePath);
const patchPreviewText = await fs.readFile(patchPreviewPath, 'utf8').catch(() => '');
const dataset = buildSajikSeatMapDataset();
const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
const summary = prewrite.summary ?? {};
const rows = Array.isArray(prewrite.rows) ? prewrite.rows : [];
const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];
const rowsBySectionId = new Map(rows.map((row) => [row.sectionId, row]));

const blockers = [];
const warnings = [];

if (summary.prewriteVersion !== REQUIRED_PREWRITE_VERSION) {
  blockers.push(`PREWRITE_VERSION_MISMATCH:${summary.prewriteVersion ?? ''}`);
}
if (summary.stadiumId !== dataset.stadiumId) {
  blockers.push(`STADIUM_ID_MISMATCH:${summary.stadiumId ?? ''}:${dataset.stadiumId}`);
}
if (summary.mapVersion !== dataset.mapVersion) {
  blockers.push(`MAP_VERSION_MISMATCH:${summary.mapVersion ?? ''}:${dataset.mapVersion}`);
}
if (summary.viewBox !== dataset.image.viewBox) {
  blockers.push(`VIEWBOX_MISMATCH:${summary.viewBox ?? ''}:${dataset.image.viewBox}`);
}
if (summary.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`TARGET_STAGE_MISMATCH:${summary.targetStage ?? ''}`);
}
if (summary.totalRows !== EXPECTED_STAGE01_ROWS) {
  blockers.push(`STAGE01_ROW_COUNT_MISMATCH:${summary.totalRows ?? ''}:${EXPECTED_STAGE01_ROWS}`);
}
if (summary.productionDataChanged !== false) {
  blockers.push('PREWRITE_PRODUCTION_DATA_CHANGED');
}
if (summary.productionWriteAllowed !== false) {
  blockers.push('PREWRITE_PRODUCTION_WRITE_ALLOWED');
}
if (!['waiting-for-operator', 'ready-for-data-patch', 'blocked'].includes(summary.status)) {
  blockers.push(`PREWRITE_STATUS_UNKNOWN:${summary.status ?? ''}`);
}
if (summary.status === 'blocked') {
  blockers.push(...(summary.blockers ?? []).map((blocker) => `PREWRITE_BLOCKED:${blocker}`));
}
if ((summary.blockers ?? []).length > 0 && summary.status !== 'blocked') {
  blockers.push(`PREWRITE_BLOCKERS_WITH_NON_BLOCKED_STATUS:${(summary.blockers ?? []).length}`);
}

const rowIds = sorted(rows.map((row) => row.sectionId));
const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
if (rowIds.join(',') !== expectedIds.join(',')) {
  blockers.push(`STAGE01_ROW_SECTION_IDS_MISMATCH:${rowIds.join(' ')}:${expectedIds.join(' ')}`);
}

const approvedRows = rows.filter((row) => row.approved);
const validRows = rows.filter((row) => row.validForPatchPreview);
const patchSectionIds = sorted(patchPayloads.map((payload) => payload.sectionId));
const validSectionIds = sorted(validRows.map((row) => row.sectionId));

if (summary.status === 'waiting-for-operator') {
  if (summary.approvedRows !== 0 || approvedRows.length !== 0) {
    blockers.push(`WAITING_STATUS_HAS_APPROVED_ROWS:${summary.approvedRows ?? approvedRows.length}`);
  }
  if (summary.patchPreviewRows !== 0 || patchPayloads.length !== 0) {
    blockers.push(`WAITING_STATUS_HAS_PATCH_PAYLOADS:${summary.patchPreviewRows ?? patchPayloads.length}`);
  }
}

if (summary.status === 'ready-for-data-patch') {
  if (summary.approvedRows <= 0 || approvedRows.length <= 0) {
    blockers.push('READY_STATUS_REQUIRES_APPROVED_ROWS');
  }
  if (summary.validApprovedRows !== summary.approvedRows) {
    blockers.push(`APPROVED_ROWS_NOT_ALL_VALID:${summary.validApprovedRows ?? ''}:${summary.approvedRows ?? ''}`);
  }
  if (summary.patchPreviewRows !== summary.validApprovedRows) {
    blockers.push(`PATCH_PREVIEW_ROW_COUNT_MISMATCH:${summary.patchPreviewRows ?? ''}:${summary.validApprovedRows ?? ''}`);
  }
  if (patchPayloads.length !== summary.patchPreviewRows) {
    blockers.push(`PATCH_PAYLOAD_COUNT_MISMATCH:${patchPayloads.length}:${summary.patchPreviewRows ?? ''}`);
  }
  if (patchSectionIds.join(',') !== validSectionIds.join(',')) {
    blockers.push(`PATCH_PAYLOAD_SECTION_MISMATCH:${patchSectionIds.join(' ')}:${validSectionIds.join(' ')}`);
  }
}

const duplicatePatchIds = patchPayloads
  .map((payload) => payload.sectionId)
  .filter((sectionId, index, sectionIds) => sectionIds.indexOf(sectionId) !== index);
if (duplicatePatchIds.length > 0) {
  blockers.push(`DUPLICATE_PATCH_PAYLOAD_SECTION_ID:${[...new Set(duplicatePatchIds)].join(' ')}`);
}

const patchReviewRows = patchPayloads.map((payload) => {
  const section = sectionsById.get(payload.sectionId);
  const row = rowsBySectionId.get(payload.sectionId);
  const reasons = [];
  const rowWarnings = [];

  if (payload.type !== 'SAJIK_SECTION_GEOMETRY_PATCH_PREVIEW') {
    reasons.push(`PATCH_PAYLOAD_TYPE_MISMATCH:${payload.type ?? ''}`);
  }
  if (!EXPECTED_STAGE01_SECTION_IDS.includes(payload.sectionId)) {
    reasons.push(`PATCH_PAYLOAD_NOT_STAGE01:${payload.sectionId}`);
  }
  if (!section) {
    reasons.push('PATCH_SECTION_NOT_FOUND');
  }
  if (section && section.sectionKind !== 'SEAT_SECTION') {
    reasons.push(`PATCH_SECTION_KIND_NOT_WRITABLE:${section.sectionKind}`);
  }
  if (payload.sectionKind !== 'SEAT_SECTION') {
    reasons.push(`PATCH_PAYLOAD_SECTION_KIND_NOT_WRITABLE:${payload.sectionKind ?? ''}`);
  }
  if (payload.enabled !== true) {
    reasons.push('PATCH_PAYLOAD_SECTION_NOT_ENABLED');
  }
  if (payload.validation?.status !== 'PASS') {
    reasons.push(`PATCH_VALIDATION_NOT_PASS:${payload.validation?.status ?? ''}`);
  }
  if ((payload.validation?.issueCount ?? 0) !== 0) {
    reasons.push(`PATCH_VALIDATION_ISSUES:${payload.validation?.issueCount ?? ''}`);
  }
  if (payload.before?.visualPath !== payload.after?.visualPath) {
    reasons.push('VISUAL_PATH_CHANGED');
  }
  if (section && payload.before?.visualPath !== section.visualPath) {
    reasons.push('BEFORE_VISUAL_PATH_NOT_CURRENT_DATASET');
  }
  if (section && payload.before?.hitPath !== section.hitPath) {
    reasons.push('BEFORE_HIT_PATH_NOT_CURRENT_DATASET');
  }
  if (section && !samePoint(payload.before?.labelPoint, section.labelPoint)) {
    reasons.push('BEFORE_LABEL_POINT_NOT_CURRENT_DATASET');
  }
  if (!patchPreviewText.includes(`sectionId: '${payload.sectionId}'`)) {
    reasons.push('PATCH_PREVIEW_FRAGMENT_MISSING');
  }

  const geometryDelta = payload.before?.hitPath !== payload.after?.hitPath
    || !samePoint(payload.before?.labelPoint, payload.after?.labelPoint);
  if (!geometryDelta) {
    rowWarnings.push('PATCH_PAYLOAD_HAS_NO_GEOMETRY_DELTA');
  }
  const diffSummary = geometryDiffSummaryFor(payload);

  return {
    sectionId: payload.sectionId,
    blockId: payload.blockId,
    validationStatus: payload.validation?.status ?? '',
    geometryDelta,
    visualPathLocked: payload.before?.visualPath === payload.after?.visualPath,
    hitPathChanged: payload.before?.hitPath !== payload.after?.hitPath,
    labelPointChanged: !samePoint(payload.before?.labelPoint, payload.after?.labelPoint),
    diffSummary,
    reviewer: row?.reviewer ?? '',
    reviewedAt: row?.reviewedAt ?? '',
    reasons,
    warnings: rowWarnings,
  };
});

patchReviewRows
  .filter((row) => row.reasons.length > 0)
  .forEach((row) => blockers.push(`PATCH_PAYLOAD_INVALID:${row.sectionId}:${row.reasons.join('|')}`));

const applyReadinessStatus = blockers.length > 0
  ? 'blocked'
  : summary.status === 'ready-for-data-patch'
    ? 'ready-for-manual-apply'
    : 'waiting-for-operator';

if (applyReadinessStatus === 'waiting-for-operator') {
  warnings.push('NO_MANUAL_DATA_PATCH_CANDIDATES');
}

const applyReadySummary = {
  applyReadyVersion: APPLY_READY_VERSION,
  status: applyReadinessStatus,
  generatedAt: new Date().toISOString(),
  prewrite: path.relative(frontendRoot, prewritePath),
  patchPreview: path.relative(frontendRoot, patchPreviewPath),
  stadiumId: dataset.stadiumId,
  mapVersion: dataset.mapVersion,
  viewBox: dataset.image.viewBox,
  targetStage: TARGET_STAGE_LABEL,
  totalRows: rows.length,
  approvedRows: approvedRows.length,
  validApprovedRows: validRows.length,
  patchPreviewRows: patchPayloads.length,
  manualPatchReviewReady: applyReadinessStatus === 'ready-for-manual-apply',
  productionDataChanged: false,
  productionWriteAllowed: false,
  sourceDataWritePerformed: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: applyReadySummary.generatedAt,
  summary: applyReadySummary,
  safetyContract: [
    'MANUAL_DATA_PATCH_REVIEW_ONLY: this script never edits src/data/sajikSeatData.ts.',
    'It reads the Stage 01 prewrite report and confirms whether approved rows are ready for manual data patch review.',
    'The production write path remains closed; productionWriteAllowed is always false.',
    'A ready-for-manual-apply status means patch-preview fragments are valid candidates, not that a file write was performed.',
    'visualPath must remain locked for Stage 01; correctedPath is reviewed as hitPath only.',
  ],
  manualApplyChecklist: [
    'Review every fragment in sajik-seatmap-stage01-prewrite.patch-preview.ts.',
    'Apply only approved section hitPath and labelPoint values to src/data/sajikSeatData.ts.',
    'Keep imageGeometry.visualPath and geometryVersion unchanged unless a separate operator-approved visual retrace exists.',
    'Update labelX/labelY with the approved labelPoint when applying a section.',
    'Run npm run qa:stadium:sajik:polygon-v2 after any manual data patch.',
  ],
  rows: patchReviewRows,
};

await fs.mkdir(stageDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, [
  '# Sajik Stage 01 Apply-Ready Gate',
  '',
  `- apply-ready version: \`${APPLY_READY_VERSION}\``,
  `- status: \`${applyReadySummary.status}\``,
  `- prewrite: \`${applyReadySummary.prewrite}\``,
  `- patch preview: \`${applyReadySummary.patchPreview}\``,
  `- approved rows: \`${applyReadySummary.approvedRows}\``,
  `- valid approved rows: \`${applyReadySummary.validApprovedRows}\``,
  `- patch preview rows: \`${applyReadySummary.patchPreviewRows}\``,
  `- manual patch review ready: \`${applyReadySummary.manualPatchReviewReady}\``,
  `- production data changed: \`${applyReadySummary.productionDataChanged}\``,
  `- production write allowed: \`${applyReadySummary.productionWriteAllowed}\``,
  `- source data write performed: \`${applyReadySummary.sourceDataWritePerformed}\``,
  `- diff summaries: \`${patchReviewRows.length}\``,
  '',
  '## Patch Candidates',
  '',
  patchReviewRows.length > 0
    ? markdownTable(
      ['section', 'validation', 'delta', 'points', 'area delta', 'bounds delta', 'label delta', 'reviewer', 'reasons', 'warnings'],
      patchReviewRows.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.validationStatus}\``,
        `\`${row.geometryDelta}\``,
        `\`${row.diffSummary.pointCountBefore}->${row.diffSummary.pointCountAfter}\``,
        `\`${row.diffSummary.areaDelta}\``,
        `\`${JSON.stringify(row.diffSummary.boundsDelta)}\``,
        `\`${row.diffSummary.labelPointDelta.join(',')}\``,
        `\`${row.reviewer || '-'}\``,
        row.reasons.length > 0 ? row.reasons.join('; ') : '-',
        row.warnings.length > 0 ? row.warnings.join('; ') : '-',
      ]),
    )
    : 'No Stage 01 rows are ready for manual data patch review.',
  '',
  '## Manual Apply Checklist',
  '',
  report.manualApplyChecklist.map((item) => `- ${item}`).join('\n'),
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No apply-ready blockers.',
  '',
  '## Warnings',
  '',
  warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`stage01_apply_ready_json:${path.relative(frontendRoot, jsonPath)}`);
console.log(`stage01_apply_ready_markdown:${path.relative(frontendRoot, markdownPath)}`);
console.log(`status:${applyReadySummary.status} approved=${applyReadySummary.approvedRows} patchPreview=${applyReadySummary.patchPreviewRows} blockers=${applyReadySummary.blockers.length} productionDataChanged=${applyReadySummary.productionDataChanged}`);

if (applyReadySummary.status === 'blocked') {
  process.exitCode = 1;
}
