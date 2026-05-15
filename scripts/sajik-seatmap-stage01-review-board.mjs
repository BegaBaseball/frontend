import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  pathToPoints,
} from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');

const REVIEW_BOARD_VERSION = 'SAJIK_STAGE01_REVIEW_BOARD_V1';
const REQUIRED_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
const REQUIRED_INPUT_AID_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_AID_V1';
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
const DECISION_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'];
const APPROVED_REQUIRED_FIELDS = [
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
];
const IMAGE_HREF = '../../../src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png';
const IMAGE_WIDTH = 960;
const IMAGE_HEIGHT = 640;

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

const sorted = (values) => [...values].sort();

const editableFieldsPresent = (row) => String(row.operatorDecision ?? 'PENDING').trim() !== 'PENDING'
  || Boolean(String(row.correctedPath ?? '').trim())
  || row.correctedLabelX !== ''
  || row.correctedLabelY !== ''
  || Boolean(String(row.reviewer ?? '').trim())
  || Boolean(String(row.reviewedAt ?? '').trim())
  || Boolean(String(row.operatorNote ?? '').trim());

const safePointCount = (pathData) => {
  try {
    return pathToPoints(String(pathData ?? '')).length;
  } catch {
    return 0;
  }
};

const statusFill = (rowStatus) => {
  if (rowStatus === 'READY_FOR_PREWRITE') return '#16A34A';
  if (rowStatus === 'INVALID') return '#DC2626';
  if (rowStatus === 'REJECTED') return '#475569';
  if (rowStatus === 'NEEDS_RETRACE') return '#EA580C';
  if (rowStatus === 'KEEP_CURRENT') return '#0284C7';
  return '#64748B';
};

const batchStroke = (batchId) => {
  if (batchId === 'P0-A') return '#DC2626';
  if (batchId === 'P0-B') return '#EA580C';
  if (batchId === 'P0-C') return '#CA8A04';
  return '#334155';
};

const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
const inputPath = path.resolve(
  frontendRoot,
  argValue('--input', path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json')),
);
const inputAidPath = path.resolve(
  frontendRoot,
  argValue('--input-aid', path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.json')),
);
const packagePath = path.resolve(
  frontendRoot,
  argValue('--package', path.join(stageDir, 'sajik-seatmap-stage01-operator-package.json')),
);
const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-review-board.json');
const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-review-board.csv');
const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-review-board.md');
const entrySheetCsvPath = path.join(stageDir, 'sajik-seatmap-stage01-entry-sheet.csv');
const entrySheetMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-entry-sheet.md');
const overlaySvgPath = path.join(stageDir, 'sajik-seatmap-stage01-review-board.svg');

const operatorInput = await readJson(inputPath);
const inputAid = await readJson(inputAidPath);
const packageSummary = await readJson(packagePath);
const inputRows = Array.isArray(operatorInput.corrections) ? operatorInput.corrections : [];
const aidRows = Array.isArray(inputAid.rows) ? inputAid.rows : [];
const aidBySectionId = new Map(aidRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const blockers = [];

if (operatorInput.packageVersion !== REQUIRED_PACKAGE_VERSION) {
  blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${operatorInput.packageVersion ?? ''}`);
}
if (operatorInput.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`INPUT_STAGE_MISMATCH:${operatorInput.targetStage ?? ''}`);
}
if (inputAid.summary?.inputAidVersion !== REQUIRED_INPUT_AID_VERSION) {
  blockers.push(`INPUT_AID_VERSION_MISMATCH:${inputAid.summary?.inputAidVersion ?? ''}`);
}
if (packageSummary.packageVersion !== REQUIRED_PACKAGE_VERSION) {
  blockers.push(`PACKAGE_SUMMARY_VERSION_MISMATCH:${packageSummary.packageVersion ?? ''}`);
}
if (inputRows.length !== EXPECTED_STAGE01_ROWS) {
  blockers.push(`STAGE01_REVIEW_BOARD_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED_STAGE01_ROWS}`);
}

const rowIds = sorted(inputRows.map((row) => String(row.sectionId ?? '').trim()));
const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
if (rowIds.join(',') !== expectedIds.join(',')) {
  blockers.push(`STAGE01_REVIEW_BOARD_SECTION_IDS_MISMATCH:${rowIds.join(' ')}:${expectedIds.join(' ')}`);
}

const rows = inputRows.map((row) => {
  const sectionId = String(row.sectionId ?? '').trim();
  const aidRow = aidBySectionId.get(sectionId);
  if (!aidRow) {
    blockers.push(`INPUT_AID_ROW_MISSING:${sectionId}`);
  }
  const rowStatus = aidRow?.rowStatus ?? 'MISSING_AID';
  const currentLabelPoint = row.currentLabelPoint ?? [row.currentLabelX ?? null, row.currentLabelY ?? null];
  return {
    sectionId,
    batchId: row.batchId ?? '',
    stageOrder: row.stageOrder ?? '',
    zoneId: row.zoneId ?? '',
    zoneLabel: row.zoneLabel ?? '',
    sectionName: row.sectionName ?? '',
    seatCategoryLabel: row.seatCategoryLabel ?? '',
    currentVisualPath: row.currentVisualPath ?? '',
    currentHitPath: row.currentHitPath ?? '',
    currentPointCount: safePointCount(row.currentHitPath),
    currentLabelX: row.currentLabelX ?? '',
    currentLabelY: row.currentLabelY ?? '',
    currentLabelPoint,
    operatorDecision: aidRow?.operatorDecision ?? row.operatorDecision ?? 'PENDING',
    rowStatus,
    action: aidRow?.action ?? 'MISSING_AID',
    nextAction: aidRow?.nextAction ?? 'Regenerate input aid before operator entry.',
    patchPreviewEligible: rowStatus === 'READY_FOR_PREWRITE',
    missingFields: aidRow?.missingFields ?? [],
    correctedPointCount: aidRow?.correctedPointCount ?? safePointCount(row.correctedPath),
    reviewer: String(row.reviewer ?? '').trim(),
    reviewedAt: String(row.reviewedAt ?? '').trim(),
    operatorNote: String(row.operatorNote ?? '').trim(),
    correctedPath: row.correctedPath ?? '',
    correctedLabelX: row.correctedLabelX ?? '',
    correctedLabelY: row.correctedLabelY ?? '',
    editableFieldsPresent: editableFieldsPresent(row),
    reasons: aidRow?.reasons ?? [],
    warnings: aidRow?.warnings ?? [],
  };
});

const statusCounts = rows.reduce((accumulator, row) => ({
  ...accumulator,
  [row.rowStatus]: (accumulator[row.rowStatus] ?? 0) + 1,
}), {});
const invalidRows = rows.filter((row) => row.rowStatus === 'INVALID');
const readyRows = rows.filter((row) => row.rowStatus === 'READY_FOR_PREWRITE');

const summary = {
  reviewBoardVersion: REVIEW_BOARD_VERSION,
  status: blockers.length > 0 ? 'blocked' : inputAid.summary?.status ?? 'waiting-for-operator',
  generatedAt: new Date().toISOString(),
  targetStage: TARGET_STAGE_LABEL,
  input: path.relative(frontendRoot, inputPath),
  inputAid: path.relative(frontendRoot, inputAidPath),
  packageSummary: path.relative(frontendRoot, packagePath),
  totalRows: rows.length,
  expectedRows: EXPECTED_STAGE01_ROWS,
  pendingRows: statusCounts.PENDING ?? 0,
  readyForPrewriteRows: readyRows.length,
  rejectedRows: statusCounts.REJECTED ?? 0,
  needsRetraceRows: statusCounts.NEEDS_RETRACE ?? 0,
  keepCurrentRows: statusCounts.KEEP_CURRENT ?? 0,
  invalidRows: invalidRows.length,
  editableRows: rows.filter((row) => row.editableFieldsPresent).length,
  patchPreviewEligibleRows: readyRows.length,
  statusCounts,
  operatorDecisionOptions: DECISION_OPTIONS,
  approvedRequiredFields: APPROVED_REQUIRED_FIELDS,
  keepCurrentRule: 'KEEP_CURRENT keeps the current production geometry and never enters patch preview.',
  preservationStatus: packageSummary.preservationStatus ?? '',
  preservedEditableRows: packageSummary.preservedEditableRows ?? 0,
  productionWriteAllowed: false,
  sourceDataWritePerformed: false,
  coordinateSystem: `SVG viewBox 0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`,
  blockers,
};

const report = {
  generatedAt: summary.generatedAt,
  summary,
  safetyContract: [
    'This Stage 01 review board is read-only and never edits src/data/sajikSeatData.ts.',
    'It reads the operator package and input aid, then emits review board, entry sheet, and overlay outputs.',
    'It does not infer coordinates, expand hitPath, crawl baseball data, or use web search.',
    'The entry sheet is for operator-provided correctedPath and labelPoint values only.',
  ],
  actionLegend: {
    FILL_OR_DECIDE: 'Operator must fill approval fields or choose REJECTED/NEEDS_RETRACE/KEEP_CURRENT.',
    RUN_PREWRITE: 'Row is ready for the Stage 01 prewrite gate.',
    FIX_OPERATOR_INPUT: 'Operator input is invalid and must be fixed first.',
    NO_PATCH_PREVIEW: 'Decision row only; no source patch preview should be produced.',
    KEEP_CURRENT: 'Operator chose to keep the current production geometry for this Stage 01 pass.',
  },
  operatorGuide: {
    operatorDecisionOptions: DECISION_OPTIONS,
    approvedRequiredFields: APPROVED_REQUIRED_FIELDS,
    keepCurrentRule: summary.keepCurrentRule,
    patchPreviewRule: 'Only READY_FOR_PREWRITE rows with operatorDecision=APPROVED can enter patch preview.',
    invalidRowsFirst: true,
  },
  rows,
};

await fs.mkdir(stageDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const boardHeaders = [
  'sectionId',
  'batchId',
  'zoneId',
  'sectionName',
  'seatCategoryLabel',
  'rowStatus',
    'action',
    'nextAction',
    'operatorDecision',
    'patchPreviewEligible',
    'missingFields',
  'currentPointCount',
  'correctedPointCount',
  'editableFieldsPresent',
  'reasons',
  'warnings',
];
await writeCsv(csvPath, [
  boardHeaders,
  ...rows.map((row) => [
    row.sectionId,
    row.batchId,
    row.zoneId,
    row.sectionName,
    row.seatCategoryLabel,
    row.rowStatus,
    row.action,
    row.nextAction,
    row.operatorDecision,
    row.patchPreviewEligible,
    row.missingFields.join('; '),
    row.currentPointCount,
    row.correctedPointCount,
    row.editableFieldsPresent,
    row.reasons.join('; '),
    row.warnings.join('; '),
  ]),
]);

const entryHeaders = [
  'sectionId',
  'batchId',
  'zoneId',
  'rowStatus',
  'action',
  'operatorDecision',
  'operatorDecisionOptions',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'operatorNote',
  'approvedRequiredFields',
  'keepCurrentRule',
  'patchPreviewEligible',
  'nextAction',
];
await writeCsv(entrySheetCsvPath, [
  entryHeaders,
  ...rows.map((row) => [
    row.sectionId,
    row.batchId,
    row.zoneId,
    row.rowStatus,
    row.action,
    row.operatorDecision,
    DECISION_OPTIONS.join('|'),
    row.correctedPath,
    row.correctedLabelX,
    row.correctedLabelY,
    row.reviewer,
    row.reviewedAt,
    row.operatorNote,
    APPROVED_REQUIRED_FIELDS.join('|'),
    summary.keepCurrentRule,
    row.patchPreviewEligible,
    row.nextAction,
  ]),
]);

await fs.writeFile(markdownPath, [
  '# Sajik Stage 01 Review Board',
  '',
  `- review board version: \`${REVIEW_BOARD_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- target stage: \`${summary.targetStage}\``,
  `- rows: \`${summary.totalRows}/${summary.expectedRows}\``,
  `- pending rows: \`${summary.pendingRows}\``,
  `- ready for prewrite rows: \`${summary.readyForPrewriteRows}\``,
  `- patch preview eligible rows: \`${summary.patchPreviewEligibleRows}\``,
  `- invalid rows: \`${summary.invalidRows}\``,
  `- preservation status: \`${summary.preservationStatus}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
  '',
  '## Status Counts',
  '',
  markdownTable(
    ['status', 'count'],
    DECISION_OPTIONS
      .map((decision) => (decision === 'APPROVED' ? 'READY_FOR_PREWRITE' : decision))
      .filter((status, index, values) => values.indexOf(status) === index)
      .concat(['INVALID'])
      .map((status) => [`\`${status}\``, `\`${statusCounts[status] ?? 0}\``]),
  ),
  '',
  '## Invalid Rows First',
  '',
  invalidRows.length > 0
    ? markdownTable(
      ['section', 'status', 'action', 'next action', 'reasons'],
      invalidRows.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.rowStatus}\``,
        `\`${row.action}\``,
        row.nextAction,
        row.reasons.join('; ') || '-',
      ]),
    )
    : 'No invalid operator input rows.',
  '',
  '## Rows',
  '',
  markdownTable(
    ['section', 'batch', 'zone', 'status', 'action', 'patch eligible', 'next action', 'missing fields', 'points', 'editable', 'reasons'],
    rows.map((row) => [
      `\`${row.sectionId}\``,
      `\`${row.batchId}\``,
      `\`${row.zoneId}\``,
      `\`${row.rowStatus}\``,
      `\`${row.action}\``,
      `\`${row.patchPreviewEligible}\``,
      row.nextAction,
      row.missingFields.join('; ') || '-',
      `\`${row.currentPointCount}/${row.correctedPointCount}\``,
      `\`${row.editableFieldsPresent}\``,
      row.reasons.join('; ') || '-',
    ]),
  ),
  '',
  '## Outputs',
  '',
  `- \`${path.relative(frontendRoot, jsonPath)}\``,
  `- \`${path.relative(frontendRoot, csvPath)}\``,
  `- \`${path.relative(frontendRoot, entrySheetCsvPath)}\``,
  `- \`${path.relative(frontendRoot, entrySheetMarkdownPath)}\``,
  `- \`${path.relative(frontendRoot, overlaySvgPath)}\``,
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No review board blockers.',
  '',
].join('\n'), 'utf8');

await fs.writeFile(entrySheetMarkdownPath, [
  '# Sajik Stage 01 Entry Sheet',
  '',
  `- review board version: \`${REVIEW_BOARD_VERSION}\``,
  `- source input: \`${summary.input}\``,
  `- editable csv: \`${path.relative(frontendRoot, entrySheetCsvPath)}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Editable Fields',
  '',
  '- `operatorDecision`: `PENDING`, `APPROVED`, `REJECTED`, or `NEEDS_RETRACE`',
  `- operatorDecisionOptions: \`${DECISION_OPTIONS.join(' | ')}\``,
  `- approvedRequiredFields: \`${APPROVED_REQUIRED_FIELDS.join(' | ')}\``,
  '- `correctedPath`: operator-approved `hitPath` in the official `960x640` SVG viewBox',
  '- `correctedLabelX` / `correctedLabelY`: operator-approved label point',
  '- `reviewer` and `reviewedAt`: required for `APPROVED` rows',
  '- `operatorNote`: required in practice for `REJECTED`, `NEEDS_RETRACE`, and `KEEP_CURRENT` rows',
  `- keepCurrentRule: ${summary.keepCurrentRule}`,
  '- patchPreviewEligible: only `READY_FOR_PREWRITE` rows can proceed to prewrite patch preview',
  '',
  '## Examples',
  '',
  'Example approved entry:',
  '',
  '```json',
  JSON.stringify({
    operatorDecision: 'APPROVED',
    correctedPath: 'M ... Z',
    correctedLabelX: 480,
    correctedLabelY: 312,
    reviewer: 'operator-name',
    reviewedAt: '2026-05-15T00:00:00.000Z',
    operatorNote: 'Approved hitPath after official PNG trace review.',
  }, null, 2),
  '```',
  '',
  'Example keep-current entry:',
  '',
  '```json',
  JSON.stringify({
    operatorDecision: 'KEEP_CURRENT',
    operatorNote: 'Current production hitPath is acceptable for this Stage 01 pass.',
  }, null, 2),
  '```',
  '',
  '## Rows',
  '',
  markdownTable(
    ['section', 'batch', 'zone', 'status', 'action', 'patch eligible', 'operator decision', 'next action'],
    rows.map((row) => [
      `\`${row.sectionId}\``,
      `\`${row.batchId}\``,
      `\`${row.zoneId}\``,
      `\`${row.rowStatus}\``,
      `\`${row.action}\``,
      `\`${row.patchPreviewEligible}\``,
      `\`${row.operatorDecision}\``,
      row.nextAction,
    ]),
  ),
  '',
].join('\n'), 'utf8');

const svgPaths = rows.map((row) => {
  const [labelX, labelY] = row.currentLabelPoint;
  return `
  <path d="${xmlEscape(row.currentVisualPath)}" fill="${statusFill(row.rowStatus)}" fill-opacity="0.22" stroke="${batchStroke(row.batchId)}" stroke-width="2.5" vector-effect="non-scaling-stroke">
    <title>${xmlEscape(`${row.sectionId} ${row.rowStatus} ${row.action}`)}</title>
  </path>
  <circle cx="${Number(labelX) || 0}" cy="${Number(labelY) || 0}" r="7" fill="${statusFill(row.rowStatus)}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"/>
  <text x="${Number(labelX) || 0}" y="${Number(labelY) || 0}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(row.sectionId)}</text>
`;
}).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}">
  <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.52"/>
  <rect x="12" y="12" width="340" height="92" rx="8" fill="#ffffff" fill-opacity="0.9" stroke="#cbd5e1"/>
  <text x="28" y="38" font-size="18" font-weight="900" fill="#0f172a">Sajik Stage 01 review board</text>
  <text x="28" y="62" font-size="12" fill="#334155">status=${xmlEscape(summary.status)} pending=${summary.pendingRows} ready=${summary.readyForPrewriteRows} invalid=${summary.invalidRows}</text>
  <text x="28" y="82" font-size="12" fill="#334155">red/orange/yellow strokes=P0-A/B/C, fill=row status</text>
  ${svgPaths}
</svg>
`;
await fs.writeFile(overlaySvgPath, svg, 'utf8');

console.log(`stage01_review_board_json:${path.relative(frontendRoot, jsonPath)}`);
console.log(`stage01_review_board_csv:${path.relative(frontendRoot, csvPath)}`);
console.log(`stage01_review_board_markdown:${path.relative(frontendRoot, markdownPath)}`);
console.log(`stage01_entry_sheet_csv:${path.relative(frontendRoot, entrySheetCsvPath)}`);
console.log(`stage01_entry_sheet_markdown:${path.relative(frontendRoot, entrySheetMarkdownPath)}`);
console.log(`stage01_review_board_svg:${path.relative(frontendRoot, overlaySvgPath)}`);
console.log(`status:${summary.status} rows=${summary.totalRows} pending=${summary.pendingRows} ready=${summary.readyForPrewriteRows} invalid=${summary.invalidRows} blockers=${summary.blockers.length} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
