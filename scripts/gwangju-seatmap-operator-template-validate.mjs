import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_BLOCKS,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultInputPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template.json');

const VALIDATION_VERSION = 'GWANGJU_OPERATOR_POLYGON_TEMPLATE_VALIDATION_V1';
const TEMPLATE_CONTRACT = 'GWANGJU_OPERATOR_POLYGON_TEMPLATE_V1';
const MIN_POLYGON_AREA = 16;
const ACTIVE_OVERLAP_WARNING_THRESHOLD = 0.005;
const CANDIDATE_OVERLAP_FAILURE_THRESHOLD = 0.005;
const SAMPLE_STEP = 4;
const VALID_LEVELS = new Set(['1F', '2F', '3F', '4F', '5F', 'OUTFIELD']);
const VALID_SIDES = new Set(['FIRST_BASE', 'THIRD_BASE', 'CENTER', 'OUTFIELD']);
const VALID_FAN_ROLES = new Set(['HOME', 'AWAY', 'NEUTRAL']);
const REQUIRED_SOURCE_POLICY_TERMS = [
  'browser CSS pixels',
  'resized screenshots',
  'external crawling',
  'web-search-based baseball data',
  'third-party copied seatmap images',
];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const hasFlag = (name) => process.argv.includes(name);

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
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

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const pointFromTuple = (value) => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const x = numberOrNull(value[0]);
  const y = numberOrNull(value[1]);
  if (x === null || y === null) return null;
  return [x, y];
};

const pathPoints = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + (point[0] * next[1]) - (next[0] * point[1]);
}, 0) / 2);

const boundsForPoints = (points) => ({
  minX: Math.min(...points.map(([x]) => x)),
  minY: Math.min(...points.map(([, y]) => y)),
  maxX: Math.max(...points.map(([x]) => x)),
  maxY: Math.max(...points.map(([, y]) => y)),
});

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

const sampledOverlapRatio = (aPoints, bPoints) => {
  if (aPoints.length < 3 || bPoints.length < 3) return 0;
  const aBounds = boundsForPoints(aPoints);
  const bBounds = boundsForPoints(bPoints);
  const minX = Math.max(aBounds.minX, bBounds.minX);
  const minY = Math.max(aBounds.minY, bBounds.minY);
  const maxX = Math.min(aBounds.maxX, bBounds.maxX);
  const maxY = Math.min(aBounds.maxY, bBounds.maxY);
  if (minX >= maxX || minY >= maxY) return 0;

  let overlapSamples = 0;
  for (let y = minY; y <= maxY; y += SAMPLE_STEP) {
    for (let x = minX; x <= maxX; x += SAMPLE_STEP) {
      if (pointInPolygon([x, y], aPoints) && pointInPolygon([x, y], bPoints)) {
        overlapSamples += 1;
      }
    }
  }

  const overlapArea = overlapSamples * SAMPLE_STEP * SAMPLE_STEP;
  return overlapArea / Math.max(1, Math.min(polygonArea(aPoints), polygonArea(bPoints)));
};

const activeBlockPolygons = GWANGJU_BLOCKS.map((block) => ({
  id: block.id,
  name: block.name,
  points: pathPoints(block.imageGeometry.d),
}));

const activeBlocksContainingPoint = (point) => activeBlockPolygons
  .filter((block) => pointInPolygon(point, block.points))
  .map((block) => block.id);

const activeBlockOverlapWarnings = (points) => activeBlockPolygons
  .map((block) => ({
    blockId: block.id,
    ratio: sampledOverlapRatio(points, block.points),
  }))
  .filter((row) => row.ratio > ACTIVE_OVERLAP_WARNING_THRESHOLD)
  .map((row) => `ACTIVE_BLOCK_OVERLAP_REQUIRES_Z_ORDER_REVIEW:${row.blockId}:${row.ratio.toFixed(4)}`);

const normalizeOperatorInput = (operatorInput = {}) => ({
  officialBlocks: Array.isArray(operatorInput.officialBlocks)
    ? operatorInput.officialBlocks.map((value) => String(value).trim()).filter(Boolean)
    : [],
  level: String(operatorInput.level ?? '').trim(),
  side: String(operatorInput.side ?? '').trim(),
  fanRole: String(operatorInput.fanRole ?? '').trim(),
  points: Array.isArray(operatorInput.points) ? operatorInput.points : [],
  labelX: numberOrNull(operatorInput.labelX),
  labelY: numberOrNull(operatorInput.labelY),
  shortLabel: String(operatorInput.shortLabel ?? '').trim(),
  reviewer: String(operatorInput.reviewer ?? '').trim(),
  reviewedAt: String(operatorInput.reviewedAt ?? '').trim(),
  operatorNote: String(operatorInput.operatorNote ?? '').trim(),
});

const hasAnyOperatorInput = (input) => (
  input.officialBlocks.length > 0
  || input.level
  || input.side
  || input.fanRole
  || input.points.length > 0
  || input.labelX !== null
  || input.labelY !== null
  || input.shortLabel
  || input.reviewer
  || input.reviewedAt
  || input.operatorNote
);

const validatePolygon = (points) => {
  const reasons = [];
  if (points.length < 3) reasons.push('POINTS_REQUIRE_AT_LEAST_THREE_VERTICES');
  if (points.some((point) => point === null)) reasons.push('POINTS_MUST_BE_NUMERIC_XY_TUPLES');
  const numericPoints = points.filter(Boolean);
  if (numericPoints.some(([x, y]) => x < 0 || y < 0 || x > GWANGJU_SEATMAP_IMAGE.imageWidth || y > GWANGJU_SEATMAP_IMAGE.imageHeight)) {
    reasons.push('POINTS_OUTSIDE_OFFICIAL_IMAGE_BOUNDS');
  }
  if (numericPoints.length >= 3 && polygonArea(numericPoints) < MIN_POLYGON_AREA) {
    reasons.push('POLYGON_AREA_TOO_SMALL');
  }
  if (numericPoints.length >= 4 && hasSelfIntersection(numericPoints)) {
    reasons.push('POLYGON_SELF_INTERSECTION');
  }
  return {
    reasons,
    points: numericPoints,
    area: numericPoints.length >= 3 ? polygonArea(numericPoints) : 0,
    bounds: numericPoints.length >= 3 ? boundsForPoints(numericPoints) : null,
  };
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
const strict = hasFlag('--strict');

const template = await readJson(inputPath);
const inputSha256 = await sha256File(inputPath);
const expectedRequirements = GWANGJU_OPERATOR_SECTION_REQUIREMENTS
  .filter((section) => section.status === 'PENDING_OPERATOR_INPUT');
const requirementById = new Map(expectedRequirements.map((section) => [section.id, section]));
const sectionIds = (template.sections ?? []).map((section) => String(section.id ?? '').trim());
const duplicateSectionIds = sectionIds.filter((id, index) => id && sectionIds.indexOf(id) !== index);
const duplicateSectionIdSet = new Set(duplicateSectionIds);
const unknownSectionIds = sectionIds.filter((id) => id && !requirementById.has(id));
const missingSectionIds = expectedRequirements
  .map((section) => section.id)
  .filter((id) => !sectionIds.includes(id));

const templateReasons = [];
if (template.contract !== TEMPLATE_CONTRACT) templateReasons.push('CONTRACT_MISMATCH');
if (template.asset?.imageWidth !== GWANGJU_SEATMAP_IMAGE.imageWidth) templateReasons.push('ASSET_WIDTH_MISMATCH');
if (template.asset?.imageHeight !== GWANGJU_SEATMAP_IMAGE.imageHeight) templateReasons.push('ASSET_HEIGHT_MISMATCH');
if (template.asset?.requiredAssetFileName !== GWANGJU_SEATMAP_IMAGE.requiredAssetFileName) {
  templateReasons.push('ASSET_FILENAME_MISMATCH');
}
if (missingSectionIds.length > 0) templateReasons.push(`MISSING_OPERATOR_SECTIONS:${missingSectionIds.join(' ')}`);
if (unknownSectionIds.length > 0) templateReasons.push(`UNKNOWN_OPERATOR_SECTIONS:${unknownSectionIds.join(' ')}`);
if (duplicateSectionIds.length > 0) templateReasons.push(`DUPLICATE_OPERATOR_SECTIONS:${duplicateSectionIds.join(' ')}`);

const candidateRows = (template.sections ?? [])
  .filter((section) => requirementById.has(String(section.id ?? '').trim()))
  .map((section) => {
    const id = String(section.id ?? '').trim();
    const requirement = requirementById.get(id);
    const reasons = [];
    const warnings = [];

    if (duplicateSectionIdSet.has(id)) reasons.push('DUPLICATE_SECTION_ID');
    if (section.category !== requirement.category) reasons.push('CATEGORY_MISMATCH');
    if (section.name !== requirement.name) reasons.push('SECTION_NAME_MISMATCH');
    if (section.coordinateSystem?.imageWidth !== GWANGJU_SEATMAP_IMAGE.imageWidth) {
      reasons.push('COORDINATE_SYSTEM_WIDTH_MISMATCH');
    }
    if (section.coordinateSystem?.imageHeight !== GWANGJU_SEATMAP_IMAGE.imageHeight) {
      reasons.push('COORDINATE_SYSTEM_HEIGHT_MISMATCH');
    }
    if (section.sourcePolicy?.allowedSource !== 'operator-provided official PNG coordinates only') {
      reasons.push('SOURCE_POLICY_ALLOWED_SOURCE_MISMATCH');
    }
    REQUIRED_SOURCE_POLICY_TERMS.forEach((term) => {
      if (!section.sourcePolicy?.disallowedSources?.includes(term)) {
        reasons.push(`SOURCE_POLICY_MISSING_DISALLOWED_TERM:${term}`);
      }
    });

    const operatorInput = normalizeOperatorInput(section.operatorInput);
    const pending = !hasAnyOperatorInput(operatorInput);
    let polygonValidation = {
      reasons: [],
      points: [],
      area: 0,
      bounds: null,
    };
    let labelInsidePolygon = null;
    let activeLabelConflicts = [];

    if (pending) {
      if (strict) reasons.push('OPERATOR_INPUT_PENDING');
    } else {
      if (operatorInput.officialBlocks.length === 0) reasons.push('OFFICIAL_BLOCKS_REQUIRED');
      if (!VALID_LEVELS.has(operatorInput.level)) reasons.push('LEVEL_REQUIRED_OR_INVALID');
      if (!VALID_SIDES.has(operatorInput.side)) reasons.push('SIDE_REQUIRED_OR_INVALID');
      if (!VALID_FAN_ROLES.has(operatorInput.fanRole)) reasons.push('FAN_ROLE_REQUIRED_OR_INVALID');
      if (!operatorInput.shortLabel) reasons.push('SHORT_LABEL_REQUIRED');
      if (!operatorInput.reviewer) reasons.push('REVIEWER_REQUIRED');
      if (!operatorInput.reviewedAt) reasons.push('REVIEWED_AT_REQUIRED');
      if (operatorInput.reviewedAt && Number.isNaN(Date.parse(operatorInput.reviewedAt))) {
        reasons.push('REVIEWED_AT_NOT_PARSEABLE');
      }

      polygonValidation = validatePolygon(operatorInput.points.map(pointFromTuple));
      reasons.push(...polygonValidation.reasons);

      if (operatorInput.labelX === null || operatorInput.labelY === null) {
        reasons.push('LABEL_COORDINATES_REQUIRED');
      } else if (
        operatorInput.labelX < 0
        || operatorInput.labelY < 0
        || operatorInput.labelX > GWANGJU_SEATMAP_IMAGE.imageWidth
        || operatorInput.labelY > GWANGJU_SEATMAP_IMAGE.imageHeight
      ) {
        reasons.push('LABEL_OUTSIDE_OFFICIAL_IMAGE_BOUNDS');
      } else if (polygonValidation.points.length >= 3) {
        const labelPoint = [operatorInput.labelX, operatorInput.labelY];
        labelInsidePolygon = pointInPolygon(labelPoint, polygonValidation.points);
        if (!labelInsidePolygon) reasons.push('LABEL_OUTSIDE_POLYGON');
        activeLabelConflicts = activeBlocksContainingPoint(labelPoint);
        if (activeLabelConflicts.length > 0) {
          warnings.push(`LABEL_OVERLAPS_ACTIVE_BLOCK_REQUIRES_Z_ORDER_REVIEW:${activeLabelConflicts.join(' ')}`);
        }
      }

      if (polygonValidation.points.length >= 3) {
        warnings.push(...activeBlockOverlapWarnings(polygonValidation.points));
      }
    }

    return {
      id,
      name: requirement.name,
      category: requirement.category,
      pending,
      validForPromotion: !pending && reasons.length === 0,
      reasons,
      warnings,
      officialBlocks: operatorInput.officialBlocks,
      level: operatorInput.level,
      side: operatorInput.side,
      fanRole: operatorInput.fanRole,
      shortLabel: operatorInput.shortLabel,
      reviewer: operatorInput.reviewer,
      reviewedAt: operatorInput.reviewedAt,
      pointCount: polygonValidation.points.length,
      polygonArea: Number(polygonValidation.area.toFixed(2)),
      bounds: polygonValidation.bounds,
      labelX: operatorInput.labelX,
      labelY: operatorInput.labelY,
      labelInsidePolygon,
      activeLabelConflicts,
      points: polygonValidation.points,
    };
  });

for (let first = 0; first < candidateRows.length; first += 1) {
  for (let second = first + 1; second < candidateRows.length; second += 1) {
    const firstRow = candidateRows[first];
    const secondRow = candidateRows[second];
    if (firstRow.points.length < 3 || secondRow.points.length < 3) continue;
    const overlapRatio = sampledOverlapRatio(firstRow.points, secondRow.points);
    if (overlapRatio > CANDIDATE_OVERLAP_FAILURE_THRESHOLD) {
      firstRow.reasons.push(`OPERATOR_SECTION_OVERLAP:${secondRow.id}:${overlapRatio.toFixed(4)}`);
      secondRow.reasons.push(`OPERATOR_SECTION_OVERLAP:${firstRow.id}:${overlapRatio.toFixed(4)}`);
      firstRow.validForPromotion = false;
      secondRow.validForPromotion = false;
    }
  }
}

const invalidRows = candidateRows.filter((row) => row.reasons.length > 0);
const pendingRows = candidateRows.filter((row) => row.pending);
const summaryStatus = templateReasons.length > 0 || invalidRows.length > 0
  ? 'failed'
  : pendingRows.length > 0
    ? 'pending'
    : 'ready';
const summary = {
  validationVersion: VALIDATION_VERSION,
  input: path.relative(frontendRoot, inputPath),
  inputSha256,
  strict,
  status: summaryStatus,
  expectedSections: expectedRequirements.length,
  totalSections: candidateRows.length,
  pendingSections: pendingRows.length,
  validPromotionSections: candidateRows.filter((row) => row.validForPromotion).length,
  invalidSections: invalidRows.length,
  warningSections: candidateRows.filter((row) => row.warnings.length > 0).length,
  templateReasons,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  acceptanceGate: {
    coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
    nonAutomaticPromotion: true,
    requiredAfterDataDiff: [
      'npm run test:stadium:seatmaps',
      'npm run qa:stadium:gwangju:trace-review',
      'npm run build',
    ],
    note: 'This validator does not modify gwangjuSeatData.ts. It only verifies operator-provided K7/AWAY coordinates before a reviewed data diff.',
  },
  sections: candidateRows.map(({ points, ...row }) => row),
};

const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-template-validation.json');
const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-template-validation.csv');
const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-template-validation.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'name',
    'category',
    'pending',
    'validForPromotion',
    'reasons',
    'warnings',
    'officialBlocks',
    'level',
    'side',
    'fanRole',
    'shortLabel',
    'pointCount',
    'polygonArea',
    'labelX',
    'labelY',
    'labelInsidePolygon',
    'reviewer',
    'reviewedAt',
  ],
  ...candidateRows.map((row) => [
    row.id,
    row.name,
    row.category,
    row.pending,
    row.validForPromotion,
    row.reasons,
    row.warnings,
    row.officialBlocks,
    row.level,
    row.side,
    row.fanRole,
    row.shortLabel,
    row.pointCount,
    row.polygonArea,
    row.labelX,
    row.labelY,
    row.labelInsidePolygon,
    row.reviewer,
    row.reviewedAt,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# 광주 K7/원정응원석 operator template validation',
  '',
  `- validation version: \`${VALIDATION_VERSION}\``,
  `- input: \`${summary.input}\``,
  `- input sha256: \`${summary.inputSha256}\``,
  `- strict: \`${summary.strict}\``,
  `- status: \`${summary.status}\``,
  `- expected sections: ${summary.expectedSections}`,
  `- total sections: ${summary.totalSections}`,
  `- pending sections: ${summary.pendingSections}`,
  `- valid promotion sections: ${summary.validPromotionSections}`,
  `- invalid sections: ${summary.invalidSections}`,
  `- warning sections: ${summary.warningSections}`,
  '',
  '## Template Gate',
  '',
  summary.templateReasons.length
    ? summary.templateReasons.map((reason) => `- \`${reason}\``).join('\n')
    : 'No template-level failures.',
  '',
  '## Section Results',
  '',
  markdownTable(
    ['section', 'pending', 'valid', 'reasons', 'warnings'],
    candidateRows.map((row) => [
      `\`${row.name}\``,
      `\`${row.pending}\``,
      `\`${row.validForPromotion}\``,
      row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
      row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
    ]),
  ),
  '',
  '## Promotion Gate',
  '',
  '1. 이 검증은 `gwangjuSeatData.ts`를 수정하지 않습니다.',
  '2. `validForPromotion=true`인 구역만 별도 data diff로 승격할 수 있습니다.',
  '3. 좌표는 공식 PNG 원본 2200x1159 기준만 허용합니다.',
  '4. 승격 후에는 `npm run test:stadium:seatmaps`, `npm run qa:stadium:gwangju:trace-review`, `npm run build`를 다시 통과해야 합니다.',
  '',
].join('\n'), 'utf8');

console.log(`operator_template_validation_json:${jsonPath}`);
console.log(`operator_template_validation_csv:${csvPath}`);
console.log(`operator_template_validation_markdown:${markdownPath}`);
console.log(`status:${summary.status} sections=${summary.totalSections} pending=${summary.pendingSections} valid=${summary.validPromotionSections} invalid=${summary.invalidSections}`);

if (summary.status === 'failed') {
  process.exitCode = 1;
}
