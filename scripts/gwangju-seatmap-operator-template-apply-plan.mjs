import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultInputPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template.json');
const defaultValidationPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template-validation.json');

const APPLY_PLAN_VERSION = 'GWANGJU_OPERATOR_POLYGON_APPLY_PLAN_V1';
const REQUIRED_VALIDATION_VERSION = 'GWANGJU_OPERATOR_POLYGON_TEMPLATE_VALIDATION_V1';
const VALID_LEVELS = new Set(['1F', '2F', '3F', '4F', '5F', 'OUTFIELD']);

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

const formatNumber = (value) => (
  Number.isInteger(value) ? String(value) : Number(value).toFixed(1).replace(/\.0$/, '')
);

const formatPoints = (points) => {
  if (!Array.isArray(points) || points.length === 0) return '[]';
  return `[\n${points.map((point) => `    [${formatNumber(point[0])}, ${formatNumber(point[1])}]`).join(',\n')},\n  ]`;
};

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

const buildSeatViewSections = (name, shortLabel, officialBlocks) => Array.from(new Set([
  name,
  shortLabel,
  ...officialBlocks,
  ...officialBlocks.map((block) => `${block}블록`),
  `광주 ${name}`,
  `KIA ${name}`,
].filter(Boolean)));

const buildGeometrySnippet = (section, input) => [
  `  '${section.id}': blockGeometry(`,
  `  ${formatPoints(input.points)},`,
  `  ${formatNumber(input.labelX)},`,
  `  ${formatNumber(input.labelY)},`,
  `  ${JSON.stringify(input.shortLabel)},`,
  '),',
].join('\n');

const buildBlockDefinitionSnippet = (section, input) => {
  const level = VALID_LEVELS.has(input.level) ? input.level : '<MANUAL_BASEBALL_DATA_REQUIRED_LEVEL>';
  const seatViewSections = buildSeatViewSections(section.name, input.shortLabel, input.officialBlocks);

  return [
    `  // MANUAL_BASEBALL_DATA_REQUIRED: confirm level before adding this block to SPECIAL_BLOCKS.`,
    `  { id: '${section.id}', level: '${level}', category: '${section.category}', name: '${section.name}', block: '${section.name}', officialBlocks: ${JSON.stringify(input.officialBlocks)}, side: '${input.side}', fanRole: '${input.fanRole}', seatViewSections: ${JSON.stringify(seatViewSections)} },`,
  ].join('\n');
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
const validationPath = path.resolve(frontendRoot, argValue('--validation', defaultValidationPath));
const requireReady = hasFlag('--require-ready');

const template = await readJson(inputPath);
const validation = await readJson(validationPath);
const inputSha256 = await sha256File(inputPath);
const requirementById = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => [section.id, section]));
const templateSectionById = new Map((template.sections ?? []).map((section) => [String(section.id ?? '').trim(), section]));
const validationSections = validation.sections ?? [];

const blockers = [];
if (validation.summary?.validationVersion !== REQUIRED_VALIDATION_VERSION) {
  blockers.push('VALIDATION_VERSION_MISMATCH');
}
if (validation.summary?.inputSha256 !== inputSha256) {
  blockers.push('VALIDATION_INPUT_SHA256_MISMATCH');
}
if (validation.summary?.status === 'failed') {
  blockers.push('VALIDATION_STATUS_FAILED');
}
if (requireReady && validation.summary?.status !== 'ready') {
  blockers.push('VALIDATION_STATUS_NOT_READY');
}

const rows = validationSections.map((validationRow) => {
  const requirement = requirementById.get(validationRow.id);
  const templateSection = templateSectionById.get(validationRow.id);
  const operatorInput = normalizeOperatorInput(templateSection?.operatorInput);
  const rowBlockers = [];

  if (!requirement) rowBlockers.push('UNKNOWN_OPERATOR_REQUIREMENT');
  if (!templateSection) rowBlockers.push('TEMPLATE_SECTION_NOT_FOUND');
  if (validationRow.pending) rowBlockers.push('OPERATOR_INPUT_PENDING');
  if (validationRow.validForPromotion !== true) rowBlockers.push('SECTION_NOT_VALID_FOR_PROMOTION');
  if (validationRow.validForPromotion === true && !VALID_LEVELS.has(operatorInput.level)) {
    rowBlockers.push('LEVEL_MANUAL_BASEBALL_DATA_REQUIRED');
  }

  const validForDataDiff = validationRow.validForPromotion === true && rowBlockers.length === 0;
  return {
    id: validationRow.id,
    name: validationRow.name,
    category: validationRow.category,
    pending: validationRow.pending,
    validForPromotion: validationRow.validForPromotion,
    validForDataDiff,
    rowBlockers,
    manualDataRequired: rowBlockers.filter((blocker) => blocker.includes('MANUAL_BASEBALL_DATA_REQUIRED')),
    reviewer: operatorInput.reviewer,
    reviewedAt: operatorInput.reviewedAt,
    officialBlocks: operatorInput.officialBlocks,
    level: operatorInput.level,
    side: operatorInput.side,
    fanRole: operatorInput.fanRole,
    shortLabel: operatorInput.shortLabel,
    labelX: operatorInput.labelX,
    labelY: operatorInput.labelY,
    pointCount: operatorInput.points.length,
    geometrySnippet: validationRow.validForPromotion === true && requirement
      ? buildGeometrySnippet(requirement, operatorInput)
      : '',
    blockDefinitionSnippet: validationRow.validForPromotion === true && requirement
      ? buildBlockDefinitionSnippet(requirement, operatorInput)
      : '',
  };
});

const validDataDiffRows = rows.filter((row) => row.validForDataDiff);
const manualDataRequiredRows = rows.filter((row) => row.manualDataRequired.length > 0);
const pendingRows = rows.filter((row) => row.pending);

let status = 'ready';
if (blockers.length > 0) {
  status = 'blocked';
} else if (pendingRows.length > 0 || validation.summary?.status === 'pending') {
  status = 'pending';
} else if (manualDataRequiredRows.length > 0) {
  status = 'manual-data-required';
}

const summary = {
  applyPlanVersion: APPLY_PLAN_VERSION,
  status,
  requireReady,
  input: path.relative(frontendRoot, inputPath),
  inputSha256,
  validation: path.relative(frontendRoot, validationPath),
  validationStatus: validation.summary?.status ?? '',
  asset: {
    imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
    imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
  },
  totalSections: rows.length,
  pendingSections: pendingRows.length,
  validPromotionSections: rows.filter((row) => row.validForPromotion).length,
  validDataDiffSections: validDataDiffRows.length,
  manualDataRequiredSections: manualDataRequiredRows.length,
  blockers,
  requiredPostApplyGate: [
    'npm run test:stadium:seatmaps',
    'npm run qa:stadium:gwangju:trace-review',
    'npm run build',
  ],
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  policy: {
    doesNotModifyDataFile: true,
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    allowedCoordinateSource: 'operator-provided official PNG coordinates only',
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
  },
  rows,
};

const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-template-apply-plan.json');
const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-template-apply-plan.csv');
const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-template-apply-plan.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'name',
    'category',
    'pending',
    'validForPromotion',
    'validForDataDiff',
    'rowBlockers',
    'manualDataRequired',
    'officialBlocks',
    'level',
    'side',
    'fanRole',
    'shortLabel',
    'pointCount',
    'labelX',
    'labelY',
    'reviewer',
    'reviewedAt',
  ],
  ...rows.map((row) => [
    row.id,
    row.name,
    row.category,
    row.pending,
    row.validForPromotion,
    row.validForDataDiff,
    row.rowBlockers,
    row.manualDataRequired,
    row.officialBlocks,
    row.level,
    row.side,
    row.fanRole,
    row.shortLabel,
    row.pointCount,
    row.labelX,
    row.labelY,
    row.reviewer,
    row.reviewedAt,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# 광주 K7/원정응원석 operator apply plan',
  '',
  `- apply plan version: \`${APPLY_PLAN_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- require ready: \`${summary.requireReady}\``,
  `- input: \`${summary.input}\``,
  `- input sha256: \`${summary.inputSha256}\``,
  `- validation: \`${summary.validation}\``,
  `- validation status: \`${summary.validationStatus}\``,
  `- pending sections: ${summary.pendingSections}`,
  `- valid promotion sections: ${summary.validPromotionSections}`,
  `- valid data diff sections: ${summary.validDataDiffSections}`,
  `- manual data required sections: ${summary.manualDataRequiredSections}`,
  '',
  '## Gate',
  '',
  '1. 이 스크립트는 `gwangjuSeatData.ts`를 수정하지 않습니다.',
  '2. validation report의 `inputSha256`이 현재 template input과 다르면 차단합니다.',
  '3. 좌표는 공식 PNG 원본 2200x1159 기준만 허용합니다.',
  '4. level 등 승격에 필요한 야구 운영 데이터가 비어 있으면 `MANUAL_BASEBALL_DATA_REQUIRED`로 남깁니다.',
  '5. data diff 반영 후에는 `npm run test:stadium:seatmaps`, `npm run qa:stadium:gwangju:trace-review`, `npm run build`를 다시 통과해야 합니다.',
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No plan-level blockers.',
  '',
  '## Section Results',
  '',
  markdownTable(
    ['section', 'pending', 'valid promotion', 'valid data diff', 'blockers', 'manual data'],
    rows.map((row) => [
      `\`${row.name}\``,
      `\`${row.pending}\``,
      `\`${row.validForPromotion}\``,
      `\`${row.validForDataDiff}\``,
      row.rowBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
      row.manualDataRequired.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
    ]),
  ),
  '',
  '## Geometry Candidates',
  '',
  rows.some((row) => row.geometrySnippet)
    ? rows.filter((row) => row.geometrySnippet).map((row) => [
      `### ${row.name}`,
      '',
      '```ts',
      row.geometrySnippet,
      '',
      row.blockDefinitionSnippet,
      '```',
    ].join('\n')).join('\n\n')
    : 'No validated operator geometry candidates.',
  '',
].join('\n'), 'utf8');

console.log(`operator_template_apply_plan_json:${jsonPath}`);
console.log(`operator_template_apply_plan_csv:${csvPath}`);
console.log(`operator_template_apply_plan_markdown:${markdownPath}`);
console.log(`status:${summary.status} pending=${summary.pendingSections} validPromotion=${summary.validPromotionSections} validDataDiff=${summary.validDataDiffSections}`);

if (summary.status === 'blocked' || (requireReady && summary.status !== 'ready')) {
  process.exitCode = 1;
}
