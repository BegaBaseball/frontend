import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

const GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_TEMPLATE_GATE_V1';
const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const EXPECTED_BLOCK_IDS = [
  'daegu-first-table-t1-1',
  'daegu-third-table-t3-2',
  'daegu-central-table-v-v1',
  'daegu-central-table-v-v2',
  'daegu-central-table-v-v3',
];
const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const sha256File = async (filePath) => crypto
  .createHash('sha256')
  .update(await fs.readFile(filePath))
  .digest('hex');

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

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const normalizePath = (pathData) => String(pathData ?? '')
  .replace(/\s+/g, ' ')
  .replace(/\s*,\s*/g, ',')
  .trim()
  .toUpperCase();

const isBlank = (value) => String(value ?? '').trim() === '';

const pathCommands = (pathData) => String(pathData ?? '').match(/[AaCcHhLlMmQqSsTtVvZz]/g) ?? [];

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

const pointInPolygon = (point, polygon) => {
  if (polygon.length < 3) return false;
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

const validatePath = (pathData) => {
  const reasons = [];
  const commands = pathCommands(pathData);
  const unsupportedCommands = commands.filter((command) => !['M', 'm', 'L', 'l', 'Z', 'z'].includes(command));
  const points = pathPoints(pathData);

  if (isBlank(pathData)) reasons.push('CORRECTED_PATH_REQUIRED');
  if (unsupportedCommands.length > 0) reasons.push(`UNSUPPORTED_PATH_COMMANDS:${[...new Set(unsupportedCommands)].join('')}`);
  if (commands.filter((command) => command.toUpperCase() === 'M').length !== 1) reasons.push('SINGLE_POLYGON_PATH_REQUIRED');
  if (!commands.some((command) => command.toUpperCase() === 'Z')) reasons.push('PATH_NOT_CLOSED');
  if (points.length < 6) reasons.push('PATH_REQUIRES_AT_LEAST_SIX_POINTS');
  if (points.some(([x, y]) => x < 0 || y < 0 || x > 1707 || y > 2048)) reasons.push('PATH_OUTSIDE_DAEGU_IMAGE_BOUNDS');
  if (points.length >= 3 && polygonArea(points) < 16) reasons.push('PATH_AREA_TOO_SMALL');

  return { reasons, points };
};

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const templatePath = path.resolve(
  frontendRoot,
  argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-operator-template.json')),
);
const sourceInputPath = path.resolve(
  frontendRoot,
  argValue('--source-input', path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json')),
);
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));

const template = await readJson(templatePath);
const sourceInput = await readJson(sourceInputPath);
const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
const sourceRows = Array.isArray(sourceInput.corrections) ? sourceInput.corrections : [];
const sourceByBlockId = new Map(sourceRows.map((row) => [row.blockId, row]));
const blockers = [];
const warnings = [];

if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (template.templateOnly !== true) blockers.push('TEMPLATE_ONLY_NOT_TRUE');
if (sourceInput.targetBatchId !== TARGET_BATCH_ID) blockers.push(`SOURCE_INPUT_BATCH_MISMATCH:${sourceInput.targetBatchId ?? ''}`);

const templateIds = templateRows.map((row) => row.blockId);
const duplicateTemplateIds = templateIds.filter((blockId, index, values) => values.indexOf(blockId) !== index);
const missingExpectedIds = EXPECTED_BLOCK_IDS.filter((blockId) => !templateIds.includes(blockId));
const extraTemplateIds = templateIds.filter((blockId) => !EXPECTED_BLOCK_IDS.includes(blockId));
if (templateRows.length !== EXPECTED_BLOCK_IDS.length) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED_BLOCK_IDS.length}`);
if (duplicateTemplateIds.length > 0) blockers.push(`DUPLICATE_TEMPLATE_BLOCK_ID:${[...new Set(duplicateTemplateIds)].join(' ')}`);
if (missingExpectedIds.length > 0) blockers.push(`TEMPLATE_MISSING_BOUNDARY_ROWS:${missingExpectedIds.join(' ')}`);
if (extraTemplateIds.length > 0) blockers.push(`TEMPLATE_HAS_NON_BOUNDARY_ROWS:${extraTemplateIds.join(' ')}`);

const approvedRows = templateRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
const correctedPathGroups = approvedRows.reduce((groups, row) => {
  const key = normalizePath(row.correctedPath);
  if (!key) return groups;
  const group = groups.get(key) ?? [];
  group.push(row.block);
  groups.set(key, group);
  return groups;
}, new Map());
const duplicateCorrectedPathBlocks = new Set();
correctedPathGroups.forEach((blocks) => {
  if (blocks.length < 2) return;
  blocks.forEach((block) => duplicateCorrectedPathBlocks.add(block));
});

const rows = templateRows.map((row) => {
  const decision = normalizeDecision(row.operatorDecision);
  const sourceRow = sourceByBlockId.get(row.blockId);
  const reasons = [];
  const warningsForRow = [];
  const missingFields = [];

  if (!sourceRow) reasons.push('SOURCE_INPUT_ROW_MISSING');
  if (!DECISION_OPTIONS.has(decision)) reasons.push('INVALID_OPERATOR_DECISION');
  if (sourceRow && row.block !== sourceRow.block) reasons.push(`SOURCE_BLOCK_MISMATCH:${row.block}:${sourceRow.block}`);
  if (sourceRow && row.name !== sourceRow.name) warningsForRow.push('SOURCE_NAME_CHANGED_REVIEW_BEFORE_COPY');

  let pathValidation = { reasons: [], points: [] };
  if (decision === 'APPROVED') {
    [
      ['correctedPath', row.correctedPath],
      ['correctedLabelX', row.correctedLabelX],
      ['correctedLabelY', row.correctedLabelY],
      ['reviewer', row.reviewer],
      ['reviewedAt', row.reviewedAt],
    ].forEach(([field, value]) => {
      if (isBlank(value)) missingFields.push(field);
    });
    if (missingFields.length > 0) reasons.push(`APPROVED_ROW_MISSING_FIELDS:${missingFields.join(' ')}`);

    pathValidation = validatePath(row.correctedPath);
    reasons.push(...pathValidation.reasons);

    const labelX = Number(row.correctedLabelX);
    const labelY = Number(row.correctedLabelY);
    if (!Number.isFinite(labelX)) reasons.push('CORRECTED_LABEL_X_NOT_NUMERIC');
    if (!Number.isFinite(labelY)) reasons.push('CORRECTED_LABEL_Y_NOT_NUMERIC');
    if (pathValidation.points.length >= 3 && Number.isFinite(labelX) && Number.isFinite(labelY)) {
      if (!pointInPolygon([labelX, labelY], pathValidation.points)) reasons.push('CORRECTED_LABEL_OUTSIDE_PATH');
    }
    if (row.reviewedAt && Number.isNaN(Date.parse(row.reviewedAt))) reasons.push('REVIEWED_AT_NOT_PARSEABLE');
    if (duplicateCorrectedPathBlocks.has(row.block)) reasons.push('BOUNDARY_FIRST_DUPLICATE_CORRECTED_PATH');
  } else if (!isBlank(row.correctedPath)) {
    warningsForRow.push('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROW');
  }

  return {
    blockId: row.blockId,
    block: row.block,
    decision,
    sourceMatched: Boolean(sourceRow),
    approved: decision === 'APPROVED',
    readyForSourceCopy: decision !== 'APPROVED' || reasons.length === 0,
    reasons,
    warnings: warningsForRow,
    correctedPathPointCount: pathValidation.points.length,
  };
});

const invalidRows = rows.filter((row) => row.reasons.length > 0);
const approvedInvalidRows = rows.filter((row) => row.approved && row.reasons.length > 0);
const nonApprovedFilledRows = rows.filter((row) => row.warnings.includes('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROW'));
if (invalidRows.length > 0) blockers.push(`BOUNDARY_FIRST_TEMPLATE_INVALID_ROWS:${invalidRows.map((row) => row.block).join(' ')}`);
if (nonApprovedFilledRows.length > 0) warnings.push(`BOUNDARY_FIRST_TEMPLATE_NON_APPROVED_FILLED_PATH:${nonApprovedFilledRows.map((row) => row.block).join(' ')}`);
if (approvedRows.length === 0) warnings.push('BOUNDARY_FIRST_TEMPLATE_HAS_NO_APPROVED_ROWS');
if (approvedRows.length > 0 && approvedRows.length < EXPECTED_BLOCK_IDS.length) {
  warnings.push(`BOUNDARY_FIRST_TEMPLATE_PARTIAL_APPROVAL:${approvedRows.length}:${EXPECTED_BLOCK_IDS.length}`);
}

const templateSha256 = await sha256File(templatePath);
const sourceInputSha256 = await sha256File(sourceInputPath);
const status = blockers.length > 0
  ? 'blocked'
  : approvedRows.length === EXPECTED_BLOCK_IDS.length
    ? 'ready-for-source-copy'
    : approvedRows.length > 0
      ? 'partial-boundary-approval'
      : 'waiting-for-operator';

const summary = {
  gateVersion: GATE_VERSION,
  status,
  template: path.relative(frontendRoot, templatePath),
  templateSha256,
  sourceInput: path.relative(frontendRoot, sourceInputPath),
  sourceInputSha256,
  totalRows: rows.length,
  approvedRows: approvedRows.length,
  approvedInvalidRows: approvedInvalidRows.length,
  invalidRows: invalidRows.length,
  nonApprovedFilledRows: nonApprovedFilledRows.length,
  productionWriteAllowed: false,
  writesSourceInput: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This gate is read-only and never copies template rows into the source P1 input.',
    'Only the five boundary-first rows may be present in the operator template.',
    'APPROVED rows must contain correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
    'Duplicate correctedPath among approved boundary-first rows is blocked.',
    'Production write remains forbidden until the source input is updated and full P1 gates pass.',
  ],
  rows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-template-gate.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-template-gate.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-template-gate.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  ['block', 'decision', 'approved', 'readyForSourceCopy', 'reasons', 'warnings', 'correctedPathPointCount'],
  ...rows.map((row) => [
    row.block,
    row.decision,
    row.approved,
    row.readyForSourceCopy,
    row.reasons.join(' '),
    row.warnings.join(' '),
    row.correctedPathPointCount,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary-First Template Gate',
  '',
  `- gate version: \`${GATE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- total rows: ${summary.totalRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- approved invalid rows: ${summary.approvedInvalidRows}`,
  `- invalid rows: ${summary.invalidRows}`,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  '',
  '## Rows',
  '',
  markdownTable(
    ['block', 'decision', 'ready', 'reasons'],
    rows.map((row) => [
      `\`${row.block}\``,
      `\`${row.decision}\``,
      String(row.readyForSourceCopy),
      row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
    ]),
  ),
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`p1_boundary_first_template_gate_json:${jsonPath}`);
console.log(`p1_boundary_first_template_gate_csv:${csvPath}`);
console.log(`p1_boundary_first_template_gate_markdown:${markdownPath}`);
console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows} invalid=${summary.invalidRows}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
