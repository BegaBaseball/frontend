import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_SEATMAP_IMAGE,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

const TRACING_PACK_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_TRACING_PACK_V1';
const REVIEW_BOARD_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_REVIEW_BOARD_V1';
const ENTRY_SHEET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_SHEET_V1';
const PREFLIGHT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_PREFLIGHT_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const VIEWBOX = {
  width: DAEGU_SEATMAP_IMAGE.imageWidth,
  height: DAEGU_SEATMAP_IMAGE.imageHeight,
};
const EXPECTED_BLOCKS = ['T1-1', 'T3-2', 'V1', 'V2', 'V3'];
const EXPECTED_BLOCK_IDS = [
  'daegu-first-table-t1-1',
  'daegu-third-table-t3-2',
  'daegu-central-table-v-v1',
  'daegu-central-table-v-v2',
  'daegu-central-table-v-v3',
];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

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

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const sanitizeFilePart = (value) => {
  const sanitized = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'block';
};

const pathPoints = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const boundsForPath = (pathData) => {
  const points = pathPoints(pathData);
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
};

const boundsForLabel = (labelPoint) => {
  const [x, y] = String(labelPoint ?? '').split(',').map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { minX: x, minY: y, maxX: x, maxY: y };
};

const mergeBounds = (items, padding = 60) => {
  const bounds = items.filter(Boolean);
  if (bounds.length === 0) {
    return { x: 0, y: 0, width: VIEWBOX.width, height: VIEWBOX.height };
  }
  const minX = Math.max(0, Math.floor(Math.min(...bounds.map((item) => item.minX)) - padding));
  const minY = Math.max(0, Math.floor(Math.min(...bounds.map((item) => item.minY)) - padding));
  const maxX = Math.min(VIEWBOX.width, Math.ceil(Math.max(...bounds.map((item) => item.maxX)) + padding));
  const maxY = Math.min(VIEWBOX.height, Math.ceil(Math.max(...bounds.map((item) => item.maxY)) + padding));
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
};

const labelCoordinates = (labelPoint) => {
  const [x, y] = String(labelPoint ?? '').split(',').map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
};

const gridLines = (crop, step) => {
  const lines = [];
  const startX = Math.ceil(crop.x / step) * step;
  const startY = Math.ceil(crop.y / step) * step;
  for (let x = startX; x <= crop.x + crop.width; x += step) {
    lines.push(`<line class="grid" x1="${x}" y1="${crop.y}" x2="${x}" y2="${crop.y + crop.height}" />`);
    lines.push(`<text class="grid-label" x="${x + 2}" y="${crop.y + 14}">${x}</text>`);
  }
  for (let y = startY; y <= crop.y + crop.height; y += step) {
    lines.push(`<line class="grid" x1="${crop.x}" y1="${y}" x2="${crop.x + crop.width}" y2="${y}" />`);
    lines.push(`<text class="grid-label" x="${crop.x + 4}" y="${y - 4}">${y}</text>`);
  }
  return lines.join('\n  ');
};

const buildTargetSvg = (row, outputFilePath, officialImagePath) => {
  const crop = row.crop;
  const imageHref = path.relative(path.dirname(outputFilePath), officialImagePath);
  const label = labelCoordinates(row.targetReference.currentLabelPoint);
  const titleY = crop.y + 28;
  const detailY = titleY + 22;
  const actionY = detailY + 22;
  const fontSize = Math.max(14, Math.min(24, Math.round(crop.width / 25)));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" width="${crop.width}" height="${crop.height}">`,
    '<style>',
    '.official-image { opacity: 0.94; }',
    '.shade { fill: rgba(255, 255, 255, 0.58); stroke: none; }',
    '.grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 1; vector-effect: non-scaling-stroke; }',
    '.grid-label { font: 700 10px Arial, sans-serif; fill: #334155; stroke: #fff; stroke-width: 2; paint-order: stroke; }',
    '.target-current { fill: rgba(220, 38, 38, 0.22); stroke: #dc2626; stroke-width: 4; vector-effect: non-scaling-stroke; }',
    '.target-candidate { fill: none; stroke: #f59e0b; stroke-width: 3; stroke-dasharray: 10 7; vector-effect: non-scaling-stroke; }',
    '.paired-current { fill: rgba(37, 99, 235, 0.12); stroke: #2563eb; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '.label-dot { fill: #111827; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '.paired-dot { fill: #2563eb; stroke: #fff; stroke-width: 2; vector-effect: non-scaling-stroke; }',
    '.title { font: 900 24px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
    `.detail { font: 800 ${fontSize}px Arial, sans-serif; fill: #374151; stroke: #fff; stroke-width: 4; paint-order: stroke; }`,
    '.warning { font: 900 16px Arial, sans-serif; fill: #b91c1c; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
    '</style>',
    `<image class="official-image" href="${xmlEscape(imageHref)}" x="0" y="0" width="${VIEWBOX.width}" height="${VIEWBOX.height}" preserveAspectRatio="none" />`,
    gridLines(crop, 25),
    ...row.pairedNeighbors.map((paired) => `<path class="paired-current" d="${xmlEscape(paired.currentPath)}"><title>${xmlEscape(`${paired.block} paired current path`)}</title></path>`),
    `<path class="target-current" d="${xmlEscape(row.targetReference.currentPath)}"><title>${xmlEscape(`${row.block} current path`)}</title></path>`,
    row.targetReference.candidatePath
      ? `<path class="target-candidate" d="${xmlEscape(row.targetReference.candidatePath)}"><title>${xmlEscape(`${row.block} candidate reference-only path`)}</title></path>`
      : '',
    ...row.pairedNeighbors.map((paired) => (
      Number.isFinite(paired.currentLabelX) && Number.isFinite(paired.currentLabelY)
        ? `<circle class="paired-dot" cx="${paired.currentLabelX}" cy="${paired.currentLabelY}" r="5" /><text class="detail" x="${paired.currentLabelX + 8}" y="${paired.currentLabelY - 8}">${xmlEscape(paired.block)}</text>`
        : ''
    )),
    label ? `<circle class="label-dot" cx="${label.x}" cy="${label.y}" r="7" />` : '',
    `<rect class="shade" x="${crop.x + 8}" y="${crop.y + 8}" width="${Math.min(crop.width - 16, 760)}" height="86" rx="0" />`,
    `<text class="title" x="${crop.x + 18}" y="${titleY}">${xmlEscape(`${row.rowNumber}. ${row.block} ${row.name}`)}</text>`,
    `<text class="detail" x="${crop.x + 18}" y="${detailY}">${xmlEscape(`editableTarget=${row.editableTarget} paired=${row.pairedBlocks.join(' ') || '-'}`)}</text>`,
    `<text class="warning" x="${crop.x + 18}" y="${actionY}">${xmlEscape('Trace manually on official PNG. Do not copy candidatePath into correctedPath.')}</text>`,
    '</svg>',
  ].filter(Boolean).join('\n');
};

const buildOverviewSvg = (rows, outputFilePath, officialImagePath) => {
  const imageHref = path.relative(path.dirname(outputFilePath), officialImagePath);
  const paths = rows.flatMap((row) => [
    ...row.pairedNeighbors.map((paired) => `<path class="paired-current" d="${xmlEscape(paired.currentPath)}" data-block="${xmlEscape(paired.block)}" />`),
    row.targetReference.candidatePath
      ? `<path class="target-candidate" d="${xmlEscape(row.targetReference.candidatePath)}" data-block="${xmlEscape(row.block)}" />`
      : '',
    `<path class="target-current" d="${xmlEscape(row.targetReference.currentPath)}" data-block="${xmlEscape(row.block)}" />`,
  ]).filter(Boolean);
  const labels = rows.map((row) => {
    const label = labelCoordinates(row.targetReference.currentLabelPoint);
    return label
      ? `<text class="target-label" x="${label.x + 10}" y="${label.y - 8}">${xmlEscape(row.block)}</text><circle class="target-dot" cx="${label.x}" cy="${label.y}" r="6" />`
      : '';
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" width="${VIEWBOX.width}" height="${VIEWBOX.height}">`,
    '<style>',
    '.official-image { opacity: 0.88; }',
    '.target-current { fill: rgba(220, 38, 38, 0.22); stroke: #dc2626; stroke-width: 5; vector-effect: non-scaling-stroke; }',
    '.target-candidate { fill: none; stroke: #f59e0b; stroke-width: 3; stroke-dasharray: 10 7; vector-effect: non-scaling-stroke; }',
    '.paired-current { fill: rgba(37, 99, 235, 0.12); stroke: #2563eb; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '.target-dot { fill: #111827; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '.target-label { font: 900 24px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
    '.title { font: 900 28px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
    '</style>',
    `<image class="official-image" href="${xmlEscape(imageHref)}" x="0" y="0" width="${VIEWBOX.width}" height="${VIEWBOX.height}" preserveAspectRatio="none" />`,
    '<g id="daegu-p1-boundary-first-tracing-overview">',
    ...paths,
    ...labels.filter(Boolean),
    '</g>',
    '<text class="title" x="24" y="40">Daegu P1 boundary-first tracing pack: red=current target, blue=paired, orange=candidate reference-only</text>',
    '</svg>',
  ].join('\n');
};

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-tracing-pack')));
const reviewBoardPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-review-board.json');
const entrySheetPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.json');
const preflightPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-entry-preflight.json');
const officialImagePath = path.resolve(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath);

const reviewBoard = await readJson(reviewBoardPath);
const entrySheet = await readJson(entrySheetPath);
const preflight = await readJson(preflightPath);
const reviewRows = Array.isArray(reviewBoard.rows) ? reviewBoard.rows : [];
const entryRows = Array.isArray(entrySheet.rows) ? entrySheet.rows : [];
const reviewByBlockId = new Map(reviewRows.map((row) => [row.blockId, row]));
const entryByBlockId = new Map(entryRows.map((row) => [row.blockId, row]));
const blockers = [];
const warnings = [];

if (reviewBoard.summary?.reviewBoardVersion !== REVIEW_BOARD_VERSION) blockers.push(`REVIEW_BOARD_VERSION_MISMATCH:${reviewBoard.summary?.reviewBoardVersion ?? ''}`);
if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) blockers.push(`ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
if (preflight.summary?.preflightVersion !== PREFLIGHT_VERSION) blockers.push(`PREFLIGHT_VERSION_MISMATCH:${preflight.summary?.preflightVersion ?? ''}`);
if (entrySheet.summary?.targetBatchId !== TARGET_BATCH_ID) blockers.push(`ENTRY_SHEET_BATCH_MISMATCH:${entrySheet.summary?.targetBatchId ?? ''}`);
if (preflight.summary?.targetBatchId !== TARGET_BATCH_ID) blockers.push(`PREFLIGHT_BATCH_MISMATCH:${preflight.summary?.targetBatchId ?? ''}`);
if (!(await fileExists(officialImagePath))) blockers.push(`OFFICIAL_IMAGE_MISSING:${DAEGU_SEATMAP_IMAGE.imagePath}`);
if ((reviewBoard.summary?.blockers ?? []).length > 0) blockers.push('REVIEW_BOARD_HAS_BLOCKERS');
if ((entrySheet.summary?.blockers ?? []).length > 0) blockers.push('ENTRY_SHEET_HAS_BLOCKERS');
if ((preflight.summary?.blockers ?? []).length > 0) blockers.push('PREFLIGHT_HAS_BLOCKERS');

const rows = await Promise.all(EXPECTED_BLOCK_IDS.map(async (blockId, index) => {
  const reviewRow = reviewByBlockId.get(blockId) ?? {};
  const entryRow = entryByBlockId.get(blockId) ?? {};
  const block = reviewRow.block ?? entryRow.block ?? EXPECTED_BLOCKS[index];
  const evidenceCrop = entryRow.evidenceCrop ?? reviewRow.evidenceCrop ?? '';
  const evidenceCropExists = evidenceCrop ? await fileExists(path.resolve(frontendRoot, evidenceCrop)) : false;
  const targetReference = reviewRow.targetReference ?? {};
  const pairedNeighbors = Array.isArray(reviewRow.pairedNeighbors) ? reviewRow.pairedNeighbors : [];
  const pairedBlocks = Array.isArray(entryRow.pairedBlocks) ? entryRow.pairedBlocks : [];
  const crop = mergeBounds([
    boundsForPath(targetReference.currentPath),
    boundsForPath(targetReference.candidatePath),
    boundsForLabel(targetReference.currentLabelPoint),
    ...pairedNeighbors.map((paired) => boundsForPath(paired.currentPath)),
    ...pairedNeighbors.map((paired) => (
      Number.isFinite(paired.currentLabelX) && Number.isFinite(paired.currentLabelY)
        ? { minX: paired.currentLabelX, minY: paired.currentLabelY, maxX: paired.currentLabelX, maxY: paired.currentLabelY }
        : null
    )),
  ]);
  const svgFileName = `${String(index + 1).padStart(2, '0')}-${sanitizeFilePart(block)}-${sanitizeFilePart(blockId)}.svg`;
  const svgPath = path.join(outputDir, svgFileName);

  if (!reviewRow.blockId) blockers.push(`TRACING_REVIEW_ROW_MISSING:${blockId}`);
  if (!entryRow.blockId) blockers.push(`TRACING_ENTRY_ROW_MISSING:${blockId}`);
  if (!evidenceCropExists) blockers.push(`TRACING_EVIDENCE_CROP_MISSING:${block}`);
  if (!targetReference.currentPath) blockers.push(`TRACING_CURRENT_PATH_MISSING:${block}`);
  if (targetReference.candidateReferenceOnly !== true) blockers.push(`TRACING_CANDIDATE_NOT_REFERENCE_ONLY:${block}`);
  if (pairedNeighbors.length === 0) blockers.push(`TRACING_PAIRED_NEIGHBOR_MISSING:${block}`);
  if (pairedBlocks.join(' ') !== pairedNeighbors.map((paired) => paired.block).join(' ')) {
    warnings.push(`TRACING_PAIRED_BLOCKS_STALE:${block}`);
  }

  return {
    tracingPackVersion: TRACING_PACK_VERSION,
    rowNumber: index + 1,
    blockId,
    block,
    name: reviewRow.name ?? entryRow.name ?? '',
    category: reviewRow.category ?? entryRow.category ?? '',
    editableTarget: entryRow.editableTarget ?? `corrections[${index}]`,
    templateJsonPointer: entryRow.templateJsonPointer ?? `/corrections/${index}`,
    evidenceCrop,
    evidenceCropExists,
    tracingSvg: path.relative(frontendRoot, svgPath),
    pairedBlocks: pairedNeighbors.map((paired) => paired.block),
    missingOperatorInputFields: entryRow.missingOperatorInputFields ?? [],
    nextOperatorAction: entryRow.nextOperatorAction ?? '',
    operatorFocus: reviewRow.operatorFocus ?? '',
    operatorAction: reviewRow.operatorAction ?? '',
    approvalRule: reviewRow.approvalRule ?? '',
    candidatePathPolicy: 'candidatePath is reference-only and must not be copied into correctedPath.',
    crop,
    targetReference,
    pairedNeighbors,
  };
}));

const blockOrder = rows.map((row) => row.block);
const blockIdOrder = rows.map((row) => row.blockId);
if (blockOrder.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`TRACING_BLOCK_ORDER_MISMATCH:${blockOrder.join(' ')}`);
if (blockIdOrder.join(' ') !== EXPECTED_BLOCK_IDS.join(' ')) blockers.push(`TRACING_BLOCK_ID_ORDER_MISMATCH:${blockIdOrder.join(' ')}`);

await fs.mkdir(outputDir, { recursive: true });

for (const row of rows) {
  const svgPath = path.resolve(frontendRoot, row.tracingSvg);
  await fs.writeFile(svgPath, `${buildTargetSvg(row, svgPath, officialImagePath)}\n`, 'utf8');
}

const overviewSvgPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-tracing-overview.svg');
await fs.writeFile(overviewSvgPath, `${buildOverviewSvg(rows, overviewSvgPath, officialImagePath)}\n`, 'utf8');

const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator-tracing';
const summary = {
  tracingPackVersion: TRACING_PACK_VERSION,
  status,
  targetBatchId: TARGET_BATCH_ID,
  reviewBoard: path.relative(frontendRoot, reviewBoardPath),
  entrySheet: path.relative(frontendRoot, entrySheetPath),
  preflight: path.relative(frontendRoot, preflightPath),
  officialImage: DAEGU_SEATMAP_IMAGE.imagePath,
  imageSha256: DAEGU_SEATMAP_IMAGE.imageSha256,
  totalRows: rows.length,
  targetSvgRows: rows.filter((row) => Boolean(row.tracingSvg)).length,
  rowsMissingOperatorInput: rows.filter((row) => row.missingOperatorInputFields.length > 0).length,
  rowsWithEvidenceCrop: rows.filter((row) => row.evidenceCropExists).length,
  overviewSvg: path.relative(frontendRoot, overviewSvgPath),
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This tracing pack is read-only.',
    'It uses the official Daegu PNG as the SVG background and keeps the original 1707x2048 coordinate system.',
    'Per-target SVG files are operator evidence only and are not source-of-truth geometry.',
    'candidatePath is reference-only and must not be copied into correctedPath.',
    'It never writes operatorDecision or corrected fields into any source input.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
  ],
  rows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-tracing-pack.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-tracing-pack.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-tracing-pack.md');

await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'rowNumber',
    'block',
    'blockId',
    'editableTarget',
    'templateJsonPointer',
    'tracingSvg',
    'evidenceCrop',
    'evidenceCropExists',
    'pairedBlocks',
    'missingOperatorInputFields',
    'candidatePathPolicy',
    'nextOperatorAction',
  ],
  ...rows.map((row) => [
    row.rowNumber,
    row.block,
    row.blockId,
    row.editableTarget,
    row.templateJsonPointer,
    row.tracingSvg,
    row.evidenceCrop,
    row.evidenceCropExists,
    row.pairedBlocks.join(' '),
    row.missingOperatorInputFields.join(' '),
    row.candidatePathPolicy,
    row.nextOperatorAction,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary-First Tracing Pack',
  '',
  `- tracing pack version: \`${TRACING_PACK_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- rows missing operator input: ${summary.rowsMissingOperatorInput}`,
  `- official image: \`${summary.officialImage}\``,
  `- image sha256: \`${summary.imageSha256}\``,
  `- overview svg: \`${summary.overviewSvg}\``,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Target SVGs',
  '',
  markdownTable(
    ['row', 'block', 'editable target', 'tracing svg', 'paired', 'missing input', 'next action'],
    rows.map((row) => [
      row.rowNumber,
      `\`${row.block}\``,
      `\`${row.editableTarget}\``,
      `\`${row.tracingSvg}\``,
      row.pairedBlocks.map((block) => `\`${block}\``).join(' ') || '-',
      row.missingOperatorInputFields.map((field) => `\`${field}\``).join(' ') || '-',
      row.nextOperatorAction,
    ]),
  ),
  '',
  '## Operator Rules',
  '',
  '- Trace manually against the official PNG shown in each SVG.',
  '- Do not copy candidatePath into correctedPath.',
  '- Fill only the matching boundary-first operator template row indicated by editableTarget.',
  '- Run `npm run stadium:daegu:p1-boundary-first-entry-preflight:require-ready` after all five rows are filled.',
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

console.log(`p1_boundary_first_tracing_pack_json:${jsonPath}`);
console.log(`p1_boundary_first_tracing_pack_csv:${csvPath}`);
console.log(`p1_boundary_first_tracing_pack_markdown:${markdownPath}`);
console.log(`p1_boundary_first_tracing_pack_overview_svg:${overviewSvgPath}`);
console.log(`status:${summary.status} rows=${summary.totalRows} targetSvgs=${summary.targetSvgRows} evidence=${summary.rowsWithEvidenceCrop}/${summary.totalRows} missingOperatorInput=${summary.rowsMissingOperatorInput}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
