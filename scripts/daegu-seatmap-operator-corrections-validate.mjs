import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_SEATMAP_IMAGE,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
const MIN_OFFICIAL_TRACE_POINTS = 6;
const DRAFT_REVIEWER = 'DRAFT_VALIDATION_ONLY';
const DRAFT_REVIEWED_AT = '2026-05-10T00:00:00.000Z';
const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
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

const hasArg = (name) => process.argv.includes(name);

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

const sha256File = async (filePath) => crypto
  .createHash('sha256')
  .update(await fs.readFile(filePath))
  .digest('hex');

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

const readCorrections = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  if (filePath.endsWith('.csv')) {
    return parseCsv(content);
  }

  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.corrections)) return parsed.corrections;
  throw new Error(`Unsupported Daegu operator corrections JSON shape: ${filePath}`);
};

const readInputMetadata = async (filePath) => {
  if (filePath.endsWith('.csv')) return {};
  const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
  return Array.isArray(parsed) ? {} : parsed;
};

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeBlockId = (row) => String(row.blockId ?? row.id ?? '').trim();

const normalizePath = (pathData) => String(pathData ?? '')
  .replace(/\s+/g, ' ')
  .replace(/\s*,\s*/g, ',')
  .trim()
  .toUpperCase();

const pathPoints = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const pathCommands = (pathData) => String(pathData ?? '').match(/[AaCcHhLlMmQqSsTtVvZz]/g) ?? [];

const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + (point[0] * next[1]) - (next[0] * point[1]);
}, 0) / 2);

const geometryPaths = (block) => (
  block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d]
);

const blockArea = (block) => geometryPaths(block)
  .map(pathPoints)
  .reduce((total, points) => total + polygonArea(points), 0);

const distanceToSegment = (point, start, end) => {
  const segmentX = end[0] - start[0];
  const segmentY = end[1] - start[1];
  const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
  if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);

  const ratio = Math.max(0, Math.min(1, (
    ((point[0] - start[0]) * segmentX) + ((point[1] - start[1]) * segmentY)
  ) / lengthSquared));
  return Math.hypot(
    point[0] - (start[0] + (ratio * segmentX)),
    point[1] - (start[1] + (ratio * segmentY)),
  );
};

const pointOnPolygonBoundary = (point, polygon, tolerance = 0.75) => {
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (distanceToSegment(point, start, end) <= tolerance) return true;
  }
  return false;
};

const pointInPolygon = (point, polygon) => {
  if (polygon.length < 3) return false;
  if (pointOnPolygonBoundary(point, polygon)) return true;

  const [x, y] = point;
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const [xi, yi] = polygon[current];
    const [xj, yj] = polygon[previous];
    const intersects = ((yi > y) !== (yj > y))
      && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInAnyPath = (point, block) => geometryPaths(block)
  .map(pathPoints)
  .some((points) => pointInPolygon(point, points));

const orientation = (a, b, c) => {
  const value = ((b[1] - a[1]) * (c[0] - b[0])) - ((b[0] - a[0]) * (c[1] - b[1]));
  if (Math.abs(value) < 1e-9) return 0;
  return value > 0 ? 1 : 2;
};

const onSegment = (a, b, c) => (
  b[0] <= Math.max(a[0], c[0])
  && b[0] >= Math.min(a[0], c[0])
  && b[1] <= Math.max(a[1], c[1])
  && b[1] >= Math.min(a[1], c[1])
);

const segmentsIntersect = (a, b, c, d) => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return false;
};

const hasSelfIntersection = (points) => {
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      const adjacent = first === second
        || firstNext === second
        || secondNext === first;
      if (adjacent) continue;
      if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) {
        return true;
      }
    }
  }
  return false;
};

const validatePath = (pathData) => {
  const reasons = [];
  const commands = pathCommands(pathData);
  const unsupportedCommands = commands.filter((command) => !['M', 'm', 'L', 'l', 'Z', 'z'].includes(command));
  const points = pathPoints(pathData);

  if (!String(pathData ?? '').trim()) reasons.push('CORRECTED_PATH_REQUIRED');
  if (unsupportedCommands.length > 0) reasons.push(`UNSUPPORTED_PATH_COMMANDS:${[...new Set(unsupportedCommands)].join('')}`);
  if (commands.filter((command) => command.toUpperCase() === 'M').length !== 1) reasons.push('SINGLE_POLYGON_PATH_REQUIRED');
  if (!commands.some((command) => command.toUpperCase() === 'Z')) reasons.push('PATH_NOT_CLOSED');
  if (points.length < 3) reasons.push('PATH_REQUIRES_AT_LEAST_THREE_POINTS');
  if (points.length >= 3 && points.length < MIN_OFFICIAL_TRACE_POINTS) {
    reasons.push('PATH_REQUIRES_AT_LEAST_SIX_POINTS');
  }
  if (points.some((point) => !point.every(Number.isFinite))) reasons.push('PATH_HAS_NON_FINITE_COORDINATES');
  if (points.some(([x, y]) => x < 0 || y < 0 || x > DAEGU_SEATMAP_IMAGE.imageWidth || y > DAEGU_SEATMAP_IMAGE.imageHeight)) {
    reasons.push('PATH_OUTSIDE_DAEGU_IMAGE_BOUNDS');
  }
  if (points.length >= 3 && polygonArea(points) < 16) reasons.push('PATH_AREA_TOO_SMALL');
  if (points.length >= 4 && hasSelfIntersection(points)) reasons.push('PATH_SELF_INTERSECTION');

  return {
    valid: reasons.length === 0,
    reasons,
    points,
    area: points.length >= 3 ? polygonArea(points) : 0,
  };
};

const cloneBlockWithCorrection = (block, correction) => ({
  ...block,
  imageGeometry: {
    ...block.imageGeometry,
    d: correction.correctedPath,
    paths: undefined,
    labelX: correction.correctedLabelX,
    labelY: correction.correctedLabelY,
  },
});

const topHitBlockAt = (blocks, point) => {
  let topBlock = null;
  [...blocks].sort((a, b) => blockArea(b) - blockArea(a)).forEach((block) => {
    if (pointInAnyPath(point, block)) {
      topBlock = block;
    }
  });
  return topBlock;
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const inputPath = path.resolve(frontendRoot, argValue('--input', path.join('reports/stadium', 'daegu-seatmap-operator-corrections-template.json')));
const inputSha256 = await sha256File(inputPath);
const allowDraftMarkers = hasArg('--allow-draft-markers');
const inputMetadata = await readInputMetadata(inputPath);
const handoffPath = path.resolve(
  frontendRoot,
  argValue('--handoff', path.relative(frontendRoot, path.join(defaultReportDir, 'daegu-seatmap-operator-handoff.json'))),
);
const handoff = await readJson(handoffPath);
const corrections = await readCorrections(inputPath);

const handoffByBlockId = new Map(handoff.workItems.map((row) => [row.id, row]));
const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));
const duplicateInputBlockIds = corrections
  .map(normalizeBlockId)
  .filter(Boolean)
  .filter((blockId, index, blockIds) => blockIds.indexOf(blockId) !== index);
const duplicateInputBlockIdSet = new Set(duplicateInputBlockIds);

const normalizedRows = corrections.map((row) => ({
  ...row,
  blockId: normalizeBlockId(row),
  operatorDecision: String(row.operatorDecision ?? 'PENDING').trim() || 'PENDING',
  correctedPath: String(row.correctedPath ?? '').trim(),
  correctedLabelX: numberOrNull(row.correctedLabelX ?? row.labelX),
  correctedLabelY: numberOrNull(row.correctedLabelY ?? row.labelY),
  reviewer: String(row.reviewer ?? '').trim(),
  reviewedAt: String(row.reviewedAt ?? '').trim(),
}));

const approvedRows = normalizedRows.filter((row) => row.operatorDecision === 'APPROVED');
const approvedByBlockId = new Map(approvedRows.map((row) => [row.blockId, row]));
const simulationBlocks = DAEGU_BLOCKS.map((block) => {
  const correction = approvedByBlockId.get(block.id);
  return correction ? cloneBlockWithCorrection(block, correction) : block;
});

const correctedPathGroups = approvedRows.reduce((groups, row) => {
  const key = normalizePath(row.correctedPath);
  if (!key) return groups;
  const group = groups.get(key) ?? [];
  group.push(row.blockId);
  groups.set(key, group);
  return groups;
}, new Map());

const duplicateCorrectedPathByBlockId = new Map();
correctedPathGroups.forEach((blockIds) => {
  if (blockIds.length < 2) return;
  blockIds.forEach((blockId) => duplicateCorrectedPathByBlockId.set(blockId, blockIds));
});

const validationRows = normalizedRows.map((row) => {
  const reasons = [];
  const warnings = [];
  const handoffRow = handoffByBlockId.get(row.blockId);
  const sourceBlock = blockById.get(row.blockId);
  const closedTerminalInputRow = !handoffRow
    && sourceBlock?.traceStatus === 'OFFICIAL_IMAGE_TRACED'
    && row.operatorDecision !== 'PENDING';

  if (!row.blockId) reasons.push('BLOCK_ID_REQUIRED');
  if (duplicateInputBlockIdSet.has(row.blockId)) reasons.push('DUPLICATE_INPUT_BLOCK_ID');
  if (!DECISION_OPTIONS.has(row.operatorDecision)) reasons.push('INVALID_OPERATOR_DECISION');
  if (!sourceBlock) reasons.push('UNKNOWN_DAEGU_BLOCK_ID');
  if (!handoffRow && !closedTerminalInputRow) reasons.push('BLOCK_NOT_IN_OPERATOR_HANDOFF');
  if (closedTerminalInputRow) warnings.push('CLOSED_TERMINAL_ROW_IGNORED_FOR_APPROVAL');

  let pathValidation = null;
  let labelInsideCorrectedPath = null;
  let correctedLabelTopHitBlockId = null;
  let correctedLabelTopHitOk = null;

  if (row.operatorDecision === 'APPROVED' && !closedTerminalInputRow) {
    REQUIRED_APPROVAL_FIELDS.forEach((field) => {
      if (field === 'correctedLabelX' || field === 'correctedLabelY') {
        if (row[field] === null) reasons.push(`${field.toUpperCase()}_REQUIRED`);
      } else if (!row[field]) {
        reasons.push(`${field.toUpperCase()}_REQUIRED`);
      }
    });

    if (row.reviewedAt && Number.isNaN(Date.parse(row.reviewedAt))) {
      reasons.push('REVIEWED_AT_NOT_PARSEABLE');
    }

    if (!allowDraftMarkers) {
      if (inputMetadata.draftOnly === true) reasons.push('DRAFT_ONLY_INPUT_NOT_ALLOWED_FOR_APPROVAL');
      if (inputMetadata.stagingOnly === true) reasons.push('STAGING_ONLY_INPUT_NOT_ALLOWED_FOR_APPROVAL');
      if (row.reviewer === DRAFT_REVIEWER) reasons.push('DRAFT_REVIEWER_NOT_ALLOWED_FOR_APPROVAL');
      if (row.reviewedAt === DRAFT_REVIEWED_AT) reasons.push('DRAFT_REVIEWED_AT_NOT_ALLOWED_FOR_APPROVAL');
    }

    pathValidation = validatePath(row.correctedPath);
    reasons.push(...pathValidation.reasons);

    if (
      pathValidation.points.length >= 3
      && row.correctedLabelX !== null
      && row.correctedLabelY !== null
    ) {
      const labelPoint = [row.correctedLabelX, row.correctedLabelY];
      labelInsideCorrectedPath = pointInPolygon(labelPoint, pathValidation.points);
      if (!labelInsideCorrectedPath) reasons.push('CORRECTED_LABEL_OUTSIDE_PATH');

      const topHit = topHitBlockAt(simulationBlocks, labelPoint);
      correctedLabelTopHitBlockId = topHit?.id ?? '';
      correctedLabelTopHitOk = topHit?.id === row.blockId;
      if (!correctedLabelTopHitOk) reasons.push('CORRECTED_LABEL_TOP_HIT_MISMATCH');
    }

    const duplicateCorrectedPathBlockIds = duplicateCorrectedPathByBlockId.get(row.blockId);
    if (duplicateCorrectedPathBlockIds) {
      reasons.push(`DUPLICATE_CORRECTED_PATH:${duplicateCorrectedPathBlockIds.join(' ')}`);
    }

    if (handoffRow?.candidateDuplicateGroup && !duplicateCorrectedPathBlockIds) {
      warnings.push('DUPLICATE_PIXEL_CANDIDATE_GROUP_REQUIRES_SEPARATE_BOUNDARY_REVIEW');
    }
  } else {
    if (row.correctedPath && !closedTerminalInputRow) warnings.push('CORRECTED_PATH_IGNORED_UNLESS_APPROVED');
  }

  return {
    blockId: row.blockId,
    block: handoffRow?.block ?? sourceBlock?.block ?? row.block ?? '',
    queuePriority: handoffRow?.queuePriority ?? row.queuePriority ?? '',
    alignmentClass: handoffRow?.alignmentClass ?? row.alignmentClass ?? '',
    operatorDecision: row.operatorDecision,
    reviewedAt: row.reviewedAt,
    reviewer: row.reviewer,
    closedTerminalInputRow,
    validForApproval: row.operatorDecision === 'APPROVED' && !closedTerminalInputRow && reasons.length === 0,
    reasons,
    warnings,
    correctedPathPointCount: pathValidation?.points.length ?? 0,
    correctedPathArea: pathValidation?.area ?? '',
    labelInsideCorrectedPath,
    correctedLabelTopHitBlockId,
    correctedLabelTopHitOk,
  };
});

const actionableApprovedRows = validationRows.filter((row) => row.operatorDecision === 'APPROVED' && !row.closedTerminalInputRow);
const invalidApprovedRows = actionableApprovedRows.filter((row) => row.reasons.length > 0);
const invalidMetadataRows = validationRows.filter((row) => row.operatorDecision !== 'APPROVED' && row.reasons.length > 0);
const summary = {
  validationVersion: VALIDATION_VERSION,
  input: path.relative(frontendRoot, inputPath),
  inputSha256,
  allowDraftMarkers,
  inputDraftOnly: inputMetadata.draftOnly === true,
  inputStagingOnly: inputMetadata.stagingOnly === true,
  totalRows: validationRows.length,
  approvedRows: actionableApprovedRows.length,
  validApprovedRows: validationRows.filter((row) => row.validForApproval).length,
  invalidApprovedRows: invalidApprovedRows.length,
  invalidMetadataRows: invalidMetadataRows.length,
  closedTerminalInputRows: validationRows.filter((row) => row.closedTerminalInputRow).length,
  warningRows: validationRows.filter((row) => row.warnings.length > 0).length,
  status: invalidApprovedRows.length === 0 && invalidMetadataRows.length === 0 ? 'ok' : 'failed',
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  acceptanceGate: {
    nonAutomaticPromotion: true,
    requiredAfterDataDiff: 'npm run stadium:daegu:alignment-audit',
    note: 'This validator only accepts operator corrections for a later reviewed data diff. It does not modify daeguSeatData.ts.',
  },
  rows: validationRows,
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'blockId',
    'block',
    'queuePriority',
    'alignmentClass',
    'operatorDecision',
    'closedTerminalInputRow',
    'validForApproval',
    'reasons',
    'warnings',
    'correctedPathPointCount',
    'correctedPathArea',
    'labelInsideCorrectedPath',
    'correctedLabelTopHitBlockId',
    'correctedLabelTopHitOk',
    'reviewer',
    'reviewedAt',
  ],
  ...validationRows.map((row) => [
    row.blockId,
    row.block,
    row.queuePriority,
    row.alignmentClass,
    row.operatorDecision,
    row.closedTerminalInputRow,
    row.validForApproval,
    row.reasons.join(' '),
    row.warnings.join(' '),
    row.correctedPathPointCount,
    row.correctedPathArea,
    row.labelInsideCorrectedPath,
    row.correctedLabelTopHitBlockId,
    row.correctedLabelTopHitOk,
    row.reviewer,
    row.reviewedAt,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# 대구 좌석도 operator corrections validation',
  '',
  `- validation version: \`${VALIDATION_VERSION}\``,
  `- input: \`${summary.input}\``,
  `- input sha256: \`${summary.inputSha256}\``,
  `- allow draft markers: ${summary.allowDraftMarkers}`,
  `- input draft only: ${summary.inputDraftOnly}`,
  `- input staging only: ${summary.inputStagingOnly}`,
  `- status: \`${summary.status}\``,
  `- total rows: ${summary.totalRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- valid approved rows: ${summary.validApprovedRows}`,
  `- invalid approved rows: ${summary.invalidApprovedRows}`,
  `- invalid metadata rows: ${summary.invalidMetadataRows}`,
  `- closed terminal input rows: ${summary.closedTerminalInputRows}`,
  `- warning rows: ${summary.warningRows}`,
  '',
  '## Invalid Rows',
  '',
  invalidApprovedRows.length || invalidMetadataRows.length
    ? markdownTable(
      ['block', 'decision', 'reasons', 'warnings'],
      validationRows
        .filter((row) => row.reasons.length > 0)
        .map((row) => [
          row.block ? `\`${row.block}\`` : row.blockId,
          `\`${row.operatorDecision}\``,
          row.reasons.map((reason) => `\`${reason}\``).join('<br>'),
          row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
        ]),
    )
    : 'No invalid rows.',
  '',
  '## Approval Gate',
  '',
  '1. 이 검증은 `daeguSeatData.ts`를 수정하지 않습니다.',
  '2. `validForApproval=true`인 행만 별도 data diff에 반영할 수 있습니다.',
  '3. 승인 path는 official Daegu hit-area 계약과 동일하게 최소 6개 polygon point가 필요합니다.',
  '4. production validation은 draft/staging marker가 남은 `APPROVED` row를 차단합니다.',
  '5. P2 draft sanity 검수만 `--allow-draft-markers`를 사용할 수 있습니다.',
  '6. data diff 반영 후에는 `npm run stadium:daegu:alignment-audit`를 다시 통과해야 합니다.',
  '',
].join('\n'), 'utf8');

console.log(`corrections_validation_json:${jsonPath}`);
console.log(`corrections_validation_csv:${csvPath}`);
console.log(`corrections_validation_markdown:${markdownPath}`);
console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows} invalidApproved=${summary.invalidApprovedRows}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
