import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSajikSeatMapDataset,
  buildSajikSeatMapSectionPatchPayload,
  formatSajikSeatMapSectionPatchTsFragment,
  geometrySnapshotForSection,
  validateSajikSeatMapDataset,
} from '../src/data/sajikSeatMapDataset.ts';
import {
  pathBounds,
  pathToPoints,
  pointInPolygon,
  polygonArea,
} from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultStageDir = path.join(defaultReportDir, 'sajik-stage01-operator');
const defaultInputPath = path.join(defaultStageDir, 'sajik-seatmap-stage01-operator-input.json');

const PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
const REQUIRED_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
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
const REQUIRED_APPROVAL_FIELDS = [
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
];

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

const parseCsv = (content) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows.filter((item) => item.some((fieldValue) => fieldValue !== ''));
  if (!headers) return [];
  return dataRows.map((dataRow) => Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ''])));
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const readInput = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  if (filePath.endsWith('.csv')) {
    return {
      packageVersion: REQUIRED_PACKAGE_VERSION,
      targetStage: TARGET_STAGE_LABEL,
      corrections: parseCsv(content),
    };
  }
  return JSON.parse(content);
};

const sha256File = async (filePath) => crypto
  .createHash('sha256')
  .update(await fs.readFile(filePath))
  .digest('hex');

const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

const normalizePath = (value) => String(value ?? '')
  .replace(/\s+/g, ' ')
  .trim();

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const sorted = (values) => [...values].sort();

const fieldMissing = (value) => value === '' || value === null || value === undefined;

const roundDelta = (value) => Number(value.toFixed(2));

const geometryStats = (pathData) => {
  const points = pathToPoints(pathData);
  return {
    pointCount: points.length,
    area: roundDelta(polygonArea(points)),
    bounds: pathBounds(pathData),
  };
};

const geometryReviewForPatchPayload = (payload) => {
  const beforeHit = geometryStats(payload.before.hitPath);
  const afterHit = geometryStats(payload.after.hitPath);
  const beforeLabel = payload.before.labelPoint ?? [null, null];
  const afterLabel = payload.after.labelPoint ?? [null, null];
  return {
    sectionId: payload.sectionId,
    blockId: payload.blockId,
    visualPathLocked: payload.before.visualPath === payload.after.visualPath,
    hitPathChanged: payload.before.hitPath !== payload.after.hitPath,
    labelPointChanged: JSON.stringify(beforeLabel) !== JSON.stringify(afterLabel),
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
    validationStatus: payload.validation?.status ?? '',
    validationIssueCount: payload.validation?.issueCount ?? 0,
  };
};

const normalizeRow = (row) => {
  const correctedLabelX = numberOrNull(row.correctedLabelX);
  const correctedLabelY = numberOrNull(row.correctedLabelY);
  return {
    ...row,
    sectionId: String(row.sectionId ?? '').trim(),
    blockId: String(row.blockId ?? '').trim(),
    batchId: String(row.batchId ?? '').trim(),
    zoneId: String(row.zoneId ?? '').trim(),
    sectionKind: String(row.sectionKind ?? '').trim(),
    mapInteractionStatus: String(row.mapInteractionStatus ?? '').trim(),
    operatorDecision: normalizeDecision(row.operatorDecision),
    correctedPath: normalizePath(row.correctedPath),
    correctedLabelXRaw: row.correctedLabelX,
    correctedLabelYRaw: row.correctedLabelY,
    correctedLabelX,
    correctedLabelY,
    reviewer: String(row.reviewer ?? '').trim(),
    reviewedAt: String(row.reviewedAt ?? '').trim(),
    operatorNote: String(row.operatorNote ?? '').trim(),
  };
};

const labelPointForRow = (row) => {
  if (row.correctedLabelX === null || row.correctedLabelY === null) return null;
  return [row.correctedLabelX, row.correctedLabelY];
};

const rowHasGeometryDelta = (section, row) => {
  const labelPoint = labelPointForRow(row);
  return row.correctedPath !== section.hitPath
    || (labelPoint && (labelPoint[0] !== section.labelPoint[0] || labelPoint[1] !== section.labelPoint[1]));
};

const topHitIssuesFor = (dataset, approvedAfterBySectionId) => {
  const seatSections = dataset.sections
    .filter((section) => section.enabled && section.sectionKind === 'SEAT_SECTION')
    .sort((left, right) => left.displayPriority - right.displayPriority);

  return seatSections.flatMap((target) => {
    const targetAfter = approvedAfterBySectionId.get(target.sectionId);
    const labelPoint = targetAfter?.labelPoint ?? target.labelPoint;
    const hits = seatSections.filter((candidate) => {
      const candidateAfter = approvedAfterBySectionId.get(candidate.sectionId);
      const hitPath = candidateAfter?.hitPath ?? candidate.hitPath;
      return pointInPolygon(labelPoint, pathToPoints(hitPath));
    });

    if (hits.length === 0) {
      return [`LABEL_TOP_HIT_MISSING:${target.sectionId}`];
    }
    if (hits.at(-1)?.sectionId !== target.sectionId) {
      return [`LABEL_TOP_HIT_MISMATCH:${target.sectionId}:${hits.at(-1)?.sectionId ?? ''}`];
    }
    return [];
  });
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite.json');
const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite.csv');
const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite.md');
const patchPreviewPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite.patch-preview.ts');

const input = await readInput(inputPath);
const inputSha256 = await sha256File(inputPath);
const dataset = buildSajikSeatMapDataset();
const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
const rows = (Array.isArray(input.corrections) ? input.corrections : []).map(normalizeRow);
const blockers = [];
const warnings = [];
const datasetIssues = validateSajikSeatMapDataset(dataset);

if (input.packageVersion !== REQUIRED_PACKAGE_VERSION) {
  blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (input.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`INPUT_STAGE_MISMATCH:${input.targetStage ?? ''}`);
}
if (datasetIssues.length > 0) {
  blockers.push(`DATASET_VALIDATION_ISSUES:${datasetIssues.length}`);
}
if (rows.length !== EXPECTED_STAGE01_ROWS) {
  blockers.push(`STAGE01_INPUT_ROW_COUNT_MISMATCH:${rows.length}:${EXPECTED_STAGE01_ROWS}`);
}

const rowIds = sorted(rows.map((row) => row.sectionId));
const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
if (rowIds.join(',') !== expectedIds.join(',')) {
  blockers.push(`STAGE01_INPUT_SECTION_IDS_MISMATCH:${rowIds.join(' ')}:${expectedIds.join(' ')}`);
}

const duplicateIds = rows
  .map((row) => row.sectionId)
  .filter((sectionId, index, sectionIds) => sectionIds.indexOf(sectionId) !== index);
if (duplicateIds.length > 0) {
  blockers.push(`DUPLICATE_STAGE01_SECTION_ID:${[...new Set(duplicateIds)].join(' ')}`);
}

const approvedAfterBySectionId = new Map();
const rowReports = rows.map((row) => {
  const section = sectionsById.get(row.sectionId);
  const reasons = [];
  const rowWarnings = [];

  if (!DECISION_OPTIONS.has(row.operatorDecision)) {
    reasons.push(`INVALID_OPERATOR_DECISION:${row.operatorDecision}`);
  }
  if (!section) {
    reasons.push('SECTION_NOT_FOUND');
  }
  if (section && section.sectionKind !== 'SEAT_SECTION') {
    reasons.push(`SECTION_KIND_NOT_WRITABLE:${section.sectionKind}`);
  }
  if (section && !section.enabled) {
    reasons.push('SECTION_NOT_MAP_SELECTABLE');
  }

  let patchPayload = null;
  if (row.operatorDecision === 'APPROVED' && section) {
    REQUIRED_APPROVAL_FIELDS.forEach((field) => {
      if (fieldMissing(row[field])) {
        reasons.push(`APPROVAL_FIELD_REQUIRED:${field}`);
      }
    });
    if (row.reviewedAt && Number.isNaN(Date.parse(row.reviewedAt))) {
      reasons.push('REVIEWED_AT_INVALID_DATE');
    }
    if (!fieldMissing(row.correctedLabelXRaw) && row.correctedLabelX === null) {
      reasons.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelX');
    }
    if (!fieldMissing(row.correctedLabelYRaw) && row.correctedLabelY === null) {
      reasons.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelY');
    }

    const labelPoint = labelPointForRow(row);
    if (labelPoint) {
      const after = {
        visualPath: section.visualPath,
        hitPath: row.correctedPath,
        labelPoint,
        visualPolygon: pathToPoints(section.visualPath),
        hitPolygon: pathToPoints(row.correctedPath),
      };
      patchPayload = buildSajikSeatMapSectionPatchPayload(section, dataset, after);
      if (patchPayload.validation.status !== 'PASS') {
        reasons.push(...patchPayload.validation.issues.map((issue) => `${issue.pathKind ?? 'geometry'}:${issue.code}`));
      }
      if (!rowHasGeometryDelta(section, row)) {
        rowWarnings.push('APPROVED_NO_GEOMETRY_DELTA');
      }
      approvedAfterBySectionId.set(row.sectionId, after);
    }
  }

  if (row.operatorDecision === 'REJECTED' || row.operatorDecision === 'NEEDS_RETRACE' || row.operatorDecision === 'KEEP_CURRENT') {
    if (!row.operatorNote) rowWarnings.push('DECISION_NOTE_RECOMMENDED');
  }

  return {
    sectionId: row.sectionId,
    blockId: row.blockId || section?.blockId || '',
    batchId: row.batchId,
    zoneId: row.zoneId,
    sectionName: section?.sectionName ?? row.sectionName ?? '',
    seatCategoryLabel: section?.seatCategoryLabel ?? row.seatCategoryLabel ?? '',
    operatorDecision: row.operatorDecision,
    approved: row.operatorDecision === 'APPROVED',
    skipped: row.operatorDecision !== 'APPROVED',
    validForPatchPreview: row.operatorDecision === 'APPROVED' && reasons.length === 0,
    geometryDelta: section ? rowHasGeometryDelta(section, row) : false,
    reviewer: row.reviewer,
    reviewedAt: row.reviewedAt,
    reasons,
    warnings: rowWarnings,
    patchPayload,
  };
});

const topHitIssues = topHitIssuesFor(dataset, approvedAfterBySectionId);
if (topHitIssues.length > 0) {
  blockers.push(...topHitIssues);
}

rowReports
  .filter((row) => row.reasons.length > 0 && row.operatorDecision === 'APPROVED')
  .forEach((row) => blockers.push(`APPROVED_ROW_INVALID:${row.sectionId}:${row.reasons.join('|')}`));

const approvedRows = rowReports.filter((row) => row.approved);
const validApprovedRows = approvedRows.filter((row) => row.validForPatchPreview);
const patchPreviewRows = rowReports.filter((row) => row.validForPatchPreview && row.patchPayload);
const keepCurrentRows = rowReports.filter((row) => row.operatorDecision === 'KEEP_CURRENT');
const patchReviewRows = patchPreviewRows.map((row) => geometryReviewForPatchPayload(row.patchPayload));

if (approvedRows.length === 0) {
  warnings.push('NO_OPERATOR_APPROVED_STAGE01_ROWS');
}
rowReports
  .filter((row) => row.operatorDecision === 'REJECTED' || row.operatorDecision === 'NEEDS_RETRACE' || row.operatorDecision === 'KEEP_CURRENT')
  .forEach((row) => warnings.push(`STAGE01_ROW_NOT_APPROVED:${row.sectionId}:${row.operatorDecision}`));

const status = blockers.length > 0
  ? 'blocked'
  : approvedRows.length === 0
    ? 'waiting-for-operator'
    : 'ready-for-data-patch';

const summary = {
  prewriteVersion: PREWRITE_VERSION,
  status,
  generatedAt: new Date().toISOString(),
  input: path.relative(frontendRoot, inputPath),
  inputSha256,
  stadiumId: dataset.stadiumId,
  mapVersion: dataset.mapVersion,
  viewBox: dataset.image.viewBox,
  targetStage: TARGET_STAGE_LABEL,
  totalRows: rows.length,
  expectedRows: EXPECTED_STAGE01_ROWS,
  approvedRows: approvedRows.length,
  validApprovedRows: validApprovedRows.length,
  keepCurrentRows: keepCurrentRows.length,
  skippedRows: rowReports.filter((row) => row.skipped).length,
  patchPreviewRows: patchPreviewRows.length,
  topHitIssues: topHitIssues.length,
  productionDataChanged: false,
  productionWriteAllowed: false,
  blockers,
  warnings,
  requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
  operatorInputSchema: {
    editableFields: [
      'operatorDecision',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
    ],
    decisionOptions: [...DECISION_OPTIONS],
    approvedRequiredFields: ['operatorDecision=APPROVED', ...REQUIRED_APPROVAL_FIELDS],
    productionWritableDecisions: ['APPROVED'],
    noPatchPreviewDecisions: ['PENDING', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'],
  },
};

const report = {
  generatedAt: summary.generatedAt,
  summary,
  safetyContract: [
    'This script is a prewrite gate only; it never edits src/data/sajikSeatData.ts.',
    'Only operatorDecision=APPROVED rows can produce patch preview fragments.',
    'PENDING, REJECTED, NEEDS_RETRACE, and KEEP_CURRENT rows never produce patch preview fragments.',
    'Stage 01 applies correctedPath as hitPath while keeping visualPath fixed to the current official traced path.',
    'Alias-only sections and accessibility markers are blocked from patch previews.',
    'Top-hit checks run across the seat section hitPath layer after applying approved Stage 01 rows in memory.',
  ],
  rows: rowReports.map(({ patchPayload, ...row }) => ({
    ...row,
    patchValidationStatus: patchPayload?.validation.status ?? '',
    patchValidationIssueCount: patchPayload?.validation.issueCount ?? 0,
  })),
  patchPayloads: patchPreviewRows.map((row) => row.patchPayload),
  patchReviewRows,
};

await fs.mkdir(stageDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'sectionId',
    'batchId',
    'zoneId',
    'operatorDecision',
    'validForPatchPreview',
    'visualPathLocked',
    'geometryDelta',
    'pointCountDelta',
    'areaDelta',
    'boundsDelta',
    'labelPointDelta',
    'reviewer',
    'reviewedAt',
    'reasons',
    'warnings',
  ],
  ...rowReports.map((row) => [
    row.sectionId,
    row.batchId,
    row.zoneId,
    row.operatorDecision,
    row.validForPatchPreview,
    row.patchPayload ? geometryReviewForPatchPayload(row.patchPayload).visualPathLocked : '',
    row.geometryDelta,
    row.patchPayload ? geometryReviewForPatchPayload(row.patchPayload).pointCountDelta : '',
    row.patchPayload ? geometryReviewForPatchPayload(row.patchPayload).areaDelta : '',
    row.patchPayload ? JSON.stringify(geometryReviewForPatchPayload(row.patchPayload).boundsDelta) : '',
    row.patchPayload ? geometryReviewForPatchPayload(row.patchPayload).labelPointDelta.join(',') : '',
    row.reviewer,
    row.reviewedAt,
    row.reasons.join('; '),
    row.warnings.join('; '),
  ]),
]);

const patchPreview = patchPreviewRows.length > 0
  ? patchPreviewRows.map((row) => formatSajikSeatMapSectionPatchTsFragment(row.patchPayload)).join('\n\n')
  : [
    '// No Sajik Stage 01 operator-approved geometry rows are ready for patch preview.',
    `// Input: ${path.relative(frontendRoot, inputPath)}`,
    `// Current status: ${status}`,
  ].join('\n');
await fs.writeFile(patchPreviewPath, `${patchPreview}\n`, 'utf8');

await fs.writeFile(markdownPath, [
  '# Sajik Stage 01 Prewrite Gate',
  '',
  `- prewrite version: \`${PREWRITE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- input: \`${summary.input}\``,
  `- rows: \`${summary.totalRows}/${summary.expectedRows}\``,
  `- approved rows: \`${summary.approvedRows}\``,
  `- valid approved rows: \`${summary.validApprovedRows}\``,
  `- keep current rows: \`${summary.keepCurrentRows}\``,
  `- patch preview rows: \`${summary.patchPreviewRows}\``,
  `- production data changed: \`${summary.productionDataChanged}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Patch Preview Review',
  '',
  patchReviewRows.length > 0
    ? markdownTable(
      ['section', 'visual locked', 'hit changed', 'label changed', 'points', 'area delta', 'bounds delta', 'label delta', 'validation'],
      patchReviewRows.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.visualPathLocked}\``,
        `\`${row.hitPathChanged}\``,
        `\`${row.labelPointChanged}\``,
        `\`${row.pointCountBefore}->${row.pointCountAfter}\``,
        `\`${row.areaDelta}\``,
        `\`${JSON.stringify(row.boundsDelta)}\``,
        `\`${row.labelPointDelta.join(',')}\``,
        `\`${row.validationStatus}:${row.validationIssueCount}\``,
      ]),
    )
    : 'No operator-approved patch preview rows are ready.',
  '',
  '## Rows',
  '',
  markdownTable(
    ['section', 'batch', 'zone', 'decision', 'valid', 'delta', 'reasons', 'warnings'],
    rowReports.map((row) => [
      `\`${row.sectionId}\``,
      `\`${row.batchId}\``,
      `\`${row.zoneId}\``,
      `\`${row.operatorDecision}\``,
      `\`${row.validForPatchPreview}\``,
      `\`${row.geometryDelta}\``,
      row.reasons.length > 0 ? row.reasons.join('; ') : '-',
      row.warnings.length > 0 ? row.warnings.join('; ') : '-',
    ]),
  ),
  '',
  '## Outputs',
  '',
  `- \`${path.relative(frontendRoot, jsonPath)}\``,
  `- \`${path.relative(frontendRoot, csvPath)}\``,
  `- \`${path.relative(frontendRoot, patchPreviewPath)}\``,
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No prewrite blockers.',
  '',
  '## Warnings',
  '',
  warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`stage01_prewrite_json:${path.relative(frontendRoot, jsonPath)}`);
console.log(`stage01_prewrite_markdown:${path.relative(frontendRoot, markdownPath)}`);
console.log(`stage01_prewrite_patch_preview:${path.relative(frontendRoot, patchPreviewPath)}`);
console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows} valid=${summary.validApprovedRows} patchPreview=${summary.patchPreviewRows} blockers=${summary.blockers.length}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
