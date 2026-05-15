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

const PREVIEW_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_PREVIEW_V1';
const REQUIRED_VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';

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

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const sha256 = (content) => crypto
  .createHash('sha256')
  .update(content)
  .digest('hex');

const sha256File = async (filePath) => sha256(await fs.readFile(filePath));

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

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeBlockId = (row) => String(row.blockId ?? row.id ?? '').trim();

const normalizePath = (pathData) => String(pathData ?? '')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeRows = (rows) => rows.map((row) => ({
  ...row,
  blockId: normalizeBlockId(row),
  operatorDecision: String(row.operatorDecision ?? 'PENDING').trim() || 'PENDING',
  correctedPath: normalizePath(row.correctedPath),
  correctedLabelX: numberOrNull(row.correctedLabelX ?? row.labelX),
  correctedLabelY: numberOrNull(row.correctedLabelY ?? row.labelY),
  reviewer: String(row.reviewer ?? '').trim(),
  reviewedAt: String(row.reviewedAt ?? '').trim(),
}));

const pathPoints = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const pathBounds = (paths) => {
  const points = paths.flatMap(pathPoints);
  if (points.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: DAEGU_SEATMAP_IMAGE.imageWidth,
      maxY: DAEGU_SEATMAP_IMAGE.imageHeight,
    };
  }

  return {
    minX: Math.min(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxX: Math.max(...points.map((point) => point[0])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
};

const expandBounds = (bounds, padding = 80) => ({
  minX: Math.max(0, Math.floor(bounds.minX - padding)),
  minY: Math.max(0, Math.floor(bounds.minY - padding)),
  maxX: Math.min(DAEGU_SEATMAP_IMAGE.imageWidth, Math.ceil(bounds.maxX + padding)),
  maxY: Math.min(DAEGU_SEATMAP_IMAGE.imageHeight, Math.ceil(bounds.maxY + padding)),
});

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const inputPath = path.resolve(frontendRoot, argValue('--input', path.join('reports/stadium', 'daegu-seatmap-operator-corrections-template.json')));
const validationPath = path.resolve(frontendRoot, argValue('--validation', path.join('reports/stadium', 'daegu-seatmap-operator-corrections-validation.json')));

const inputSha256 = await sha256File(inputPath);
const corrections = normalizeRows(await readCorrections(inputPath));
const validation = await readJson(validationPath);
const validationRows = validation.rows ?? [];
const correctionByBlockId = new Map(corrections.map((row) => [row.blockId, row]));
const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));

const blockers = [];
if (validation.summary?.validationVersion !== REQUIRED_VALIDATION_VERSION) {
  blockers.push('VALIDATION_VERSION_MISMATCH');
}
if (validation.summary?.inputSha256 !== inputSha256) {
  blockers.push('VALIDATION_INPUT_SHA256_MISMATCH');
}
if (validation.summary?.status !== 'ok') {
  blockers.push('VALIDATION_STATUS_NOT_OK');
}

const approvedValidationRows = validationRows.filter((row) => row.operatorDecision === 'APPROVED');
const previewRows = approvedValidationRows.map((validationRow) => {
  const correction = correctionByBlockId.get(validationRow.blockId);
  const block = blockById.get(validationRow.blockId);
  const currentPath = block?.imageGeometry.d ?? '';
  const correctedPath = correction?.correctedPath ?? '';
  const bounds = expandBounds(pathBounds([currentPath, correctedPath]));

  return {
    blockId: validationRow.blockId,
    block: block?.block ?? validationRow.block ?? '',
    name: block?.name ?? '',
    category: block?.category ?? '',
    validForApproval: validationRow.validForApproval,
    reasons: validationRow.reasons ?? [],
    warnings: validationRow.warnings ?? [],
    reviewer: correction?.reviewer ?? '',
    reviewedAt: correction?.reviewedAt ?? '',
    currentPath,
    correctedPath,
    currentLabelX: block?.imageGeometry.labelX ?? '',
    currentLabelY: block?.imageGeometry.labelY ?? '',
    correctedLabelX: correction?.correctedLabelX ?? '',
    correctedLabelY: correction?.correctedLabelY ?? '',
    bounds,
  };
});

const summary = {
  previewVersion: PREVIEW_VERSION,
  status: blockers.length === 0 ? 'ok' : 'blocked',
  input: path.relative(frontendRoot, inputPath),
  inputSha256,
  validation: path.relative(frontendRoot, validationPath),
  validationStatus: validation.summary?.status ?? '',
  approvedRows: approvedValidationRows.length,
  validApprovedRows: previewRows.filter((row) => row.validForApproval).length,
  invalidApprovedRows: previewRows.filter((row) => !row.validForApproval).length,
  previewRows: previewRows.length,
  blockers,
  requiredBeforeWrite: 'npm run stadium:daegu:operator-corrections-validate',
  writeCommand: 'npm run stadium:daegu:operator-corrections-write',
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-preview.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-preview.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-preview.md');
const svgPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-preview.svg');

const previewSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${DAEGU_SEATMAP_IMAGE.imageWidth}" height="${DAEGU_SEATMAP_IMAGE.imageHeight}" viewBox="0 0 ${DAEGU_SEATMAP_IMAGE.imageWidth} ${DAEGU_SEATMAP_IMAGE.imageHeight}">`,
  '  <style>',
  '    .grid { stroke: #0f172a; stroke-opacity: 0.14; stroke-width: 1; }',
  '    .current { fill: #ef4444; fill-opacity: 0.12; stroke: #dc2626; stroke-width: 3; vector-effect: non-scaling-stroke; }',
  '    .corrected { fill: #22c55e; fill-opacity: 0.18; stroke: #16a34a; stroke-width: 3; vector-effect: non-scaling-stroke; }',
  '    .invalid { fill: #f97316; fill-opacity: 0.18; stroke: #ea580c; stroke-width: 3; vector-effect: non-scaling-stroke; }',
  '    .focus { fill: none; stroke: #0f172a; stroke-width: 2; stroke-dasharray: 10 6; vector-effect: non-scaling-stroke; }',
  '    .label { font: 800 14px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
  '    .note { font: 700 18px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
  '  </style>',
  `  <image href="../../src/assets/stadiums/samsung/${DAEGU_SEATMAP_IMAGE.requiredAssetFileName}" x="0" y="0" width="${DAEGU_SEATMAP_IMAGE.imageWidth}" height="${DAEGU_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />`,
  ...Array.from({ length: Math.floor(DAEGU_SEATMAP_IMAGE.imageWidth / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="${DAEGU_SEATMAP_IMAGE.imageHeight}" />`),
  ...Array.from({ length: Math.floor(DAEGU_SEATMAP_IMAGE.imageHeight / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="${DAEGU_SEATMAP_IMAGE.imageWidth}" y2="${index * 100}" />`),
  previewRows.length === 0
    ? '  <text class="note" x="80" y="120">No approved operator corrections to preview.</text>'
    : '',
  '  <g id="current-paths">',
  ...previewRows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.block} current path`)}</title></path>`),
  '  </g>',
  '  <g id="corrected-paths">',
  ...previewRows.map((row) => `    <path class="${row.validForApproval ? 'corrected' : 'invalid'}" d="${xmlEscape(row.correctedPath)}"><title>${xmlEscape(`${row.block} corrected path ${row.validForApproval ? 'valid' : row.reasons.join(' ')}`)}</title></path>`),
  '  </g>',
  '  <g id="focus-bounds">',
  ...previewRows.map((row) => `    <rect class="focus" x="${row.bounds.minX}" y="${row.bounds.minY}" width="${row.bounds.maxX - row.bounds.minX}" height="${row.bounds.maxY - row.bounds.minY}"><title>${xmlEscape(`${row.block} preview bounds`)}</title></rect>`),
  '  </g>',
  '  <g id="labels">',
  ...previewRows.map((row) => [
    row.currentLabelX !== '' && row.currentLabelY !== ''
      ? `    <circle cx="${row.currentLabelX}" cy="${row.currentLabelY}" r="5" fill="#dc2626" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />`
      : '',
    row.correctedLabelX !== '' && row.correctedLabelY !== ''
      ? `    <circle cx="${row.correctedLabelX}" cy="${row.correctedLabelY}" r="5" fill="${row.validForApproval ? '#16a34a' : '#ea580c'}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />`
      : '',
    row.correctedLabelX !== '' && row.correctedLabelY !== ''
      ? `    <text class="label" x="${Number(row.correctedLabelX) + 8}" y="${Number(row.correctedLabelY) - 8}">${xmlEscape(row.block)}</text>`
      : '',
  ].filter(Boolean).join('\n')),
  '  </g>',
  '</svg>',
].join('\n');

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  legend: {
    currentPath: 'red',
    validCorrectedPath: 'green',
    invalidApprovedPath: 'orange',
    currentLabel: 'red dot',
    correctedLabel: 'green/orange dot',
  },
  rows: previewRows,
};

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'blockId',
    'block',
    'name',
    'category',
    'validForApproval',
    'reasons',
    'warnings',
    'reviewer',
    'reviewedAt',
    'currentLabelX',
    'currentLabelY',
    'correctedLabelX',
    'correctedLabelY',
  ],
  ...previewRows.map((row) => [
    row.blockId,
    row.block,
    row.name,
    row.category,
    row.validForApproval,
    row.reasons.join(' '),
    row.warnings.join(' '),
    row.reviewer,
    row.reviewedAt,
    row.currentLabelX,
    row.currentLabelY,
    row.correctedLabelX,
    row.correctedLabelY,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# 대구 좌석도 operator corrections preview',
  '',
  `- preview version: \`${PREVIEW_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- input: \`${summary.input}\``,
  `- input sha256: \`${summary.inputSha256}\``,
  `- validation: \`${summary.validation}\``,
  `- approved rows: ${summary.approvedRows}`,
  `- valid approved rows: ${summary.validApprovedRows}`,
  `- invalid approved rows: ${summary.invalidApprovedRows}`,
  `- preview rows: ${summary.previewRows}`,
  '- SVG: `reports/stadium/daegu-seatmap-operator-corrections-preview.svg`',
  '',
  '## Legend',
  '',
  '- red path: current `daeguSeatData.ts` path',
  '- green path: valid operator corrected path',
  '- orange path: approved row that did not pass validation',
  '- red dot: current label point',
  '- green/orange dot: corrected label point',
  '',
  '## Gate',
  '',
  '1. 이 preview는 데이터를 수정하지 않습니다.',
  '2. `VALIDATION_INPUT_SHA256_MISMATCH`가 있으면 현재 input과 validation 결과가 서로 다른 것입니다.',
  '3. write 전에는 이 SVG에서 current path와 corrected path를 비교합니다.',
  '4. write 후에는 `npm run stadium:daegu:alignment-audit`를 다시 통과해야 합니다.',
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Preview Rows',
  '',
  previewRows.length > 0
    ? markdownTable(
      ['block', 'valid', 'reviewer', 'reviewedAt', 'current label', 'corrected label', 'reasons', 'warnings'],
      previewRows.map((row) => [
        row.block ? `\`${row.block}\`` : row.blockId,
        String(row.validForApproval),
        row.reviewer,
        row.reviewedAt,
        `${row.currentLabelX},${row.currentLabelY}`,
        `${row.correctedLabelX},${row.correctedLabelY}`,
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
      ]),
    )
    : 'No approved corrections to preview.',
  '',
].join('\n'), 'utf8');
await fs.writeFile(svgPath, previewSvg, 'utf8');

console.log(`corrections_preview_json:${jsonPath}`);
console.log(`corrections_preview_csv:${csvPath}`);
console.log(`corrections_preview_markdown:${markdownPath}`);
console.log(`corrections_preview_svg:${svgPath}`);
console.log(`status:${summary.status} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows} previewRows=${summary.previewRows}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
