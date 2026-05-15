import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');

const WORKSET_VERSION = 'DAEGU_P1_PRECISION_WORKSET_V1';
const PRECISION_AUDIT_VERSION = 'DAEGU_SEATMAP_PRECISION_AUDIT_V1';
const NEXT_ACTION_PACKET_VERSION = 'DAEGU_P1_NEXT_ACTION_PACKET_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const EXPECTED = {
  expectedRows: 17,
  boundaryFirstRows: 5,
  singleCorrectedPathRows: 1,
  duplicateSplitRows: 11,
  approvedRows: 0,
};

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

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

const splitList = (value) => String(value ?? '')
  .split(/\s+/)
  .map((item) => item.trim())
  .filter(Boolean);

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const precisionAuditPath = path.join(reportDir, 'daegu-seatmap-precision-audit.json');
const nextActionPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.json');
const inputPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');

const precisionAudit = await readJson(precisionAuditPath);
const nextActionPacket = await readJson(nextActionPath);
const input = await readJson(inputPath);

const precisionRows = Array.isArray(precisionAudit.unresolvedWorkset) ? precisionAudit.unresolvedWorkset : [];
const nextActionRows = Array.isArray(nextActionPacket.rows) ? nextActionPacket.rows : [];
const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const precisionById = new Map(precisionRows.map((row) => [row.id, row]));
const inputById = new Map(inputRows.map((row) => [row.blockId, row]));

const blockers = [];
const warnings = [];

if (precisionAudit.auditVersion !== PRECISION_AUDIT_VERSION) {
  blockers.push(`PRECISION_AUDIT_VERSION_MISMATCH:${precisionAudit.auditVersion ?? ''}`);
}
if (nextActionPacket.summary?.packetVersion !== NEXT_ACTION_PACKET_VERSION) {
  blockers.push(`NEXT_ACTION_PACKET_VERSION_MISMATCH:${nextActionPacket.summary?.packetVersion ?? ''}`);
}
if (nextActionPacket.summary?.targetBatchId !== TARGET_BATCH_ID) {
  blockers.push(`NEXT_ACTION_BATCH_MISMATCH:${nextActionPacket.summary?.targetBatchId ?? ''}`);
}
if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P1_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (input.productionWriteAllowed !== false) blockers.push('P1_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (nextActionRows.length !== EXPECTED.expectedRows) {
  blockers.push(`P1_PRECISION_WORKSET_ROW_COUNT:${nextActionRows.length}!=${EXPECTED.expectedRows}`);
}
if (inputRows.length !== EXPECTED.expectedRows) {
  blockers.push(`P1_INPUT_ROW_COUNT:${inputRows.length}!=${EXPECTED.expectedRows}`);
}
if (precisionAudit.passLevel === 'PASS_RELEASE_177') {
  warnings.push('PRECISION_AUDIT_ALREADY_RELEASE_READY_P1_WORKSET_SHOULD_BE_EMPTY');
}

const stageOrder = {
  PAIR_BOUNDARY_FIRST: 1,
  SINGLE_CORRECTED_PATH: 2,
  DUPLICATE_CANDIDATE_SPLIT: 3,
};

const rows = nextActionRows.map((actionRow) => {
  const precisionRow = precisionById.get(actionRow.blockId);
  const inputRow = inputById.get(actionRow.blockId);

  if (!precisionRow) blockers.push(`P1_ROW_MISSING_FROM_PRECISION_AUDIT:${actionRow.blockId}`);
  if (!inputRow) blockers.push(`P1_ROW_MISSING_FROM_SOURCE_INPUT:${actionRow.blockId}`);
  if (precisionRow && !['01_P1_BOUNDARY_FIRST', '02_P1_DUPLICATE_OR_SINGLE_CORRECTION'].includes(precisionRow.workOrderGroup)) {
    blockers.push(`P1_PRECISION_WORK_ORDER_MISMATCH:${actionRow.block}:${precisionRow.workOrderGroup}`);
  }

  const precisionFlags = precisionRow?.precisionFlags ?? splitList(actionRow.riskFlags);
  const blockingFlags = precisionFlags.filter((flag) => [
    'FLOATING_OR_OFF_SEAT_REVIEW',
    'OVERSIZED_RECT_MANUAL_RETRACE',
    'SAME_SEAT_MULTI_OWNER',
    'PEER_LABEL_INSIDE_CURRENT_PATH',
    'LABEL_TOP_HIT_MISMATCH',
    'PIXEL_CANDIDATE_DUPLICATE',
    'LOW_COMPONENT_INSIDE_CURRENT_PATH',
    'LOW_CURRENT_PATH_COLOR_COVERAGE',
  ].includes(flag));

  return {
    worksetVersion: WORKSET_VERSION,
    targetBatchId: TARGET_BATCH_ID,
    stage: actionRow.stage,
    stageOrder: stageOrder[actionRow.stage] ?? actionRow.stageOrder ?? 99,
    precisionWorkOrderGroup: precisionRow?.workOrderGroup ?? '',
    blockId: actionRow.blockId,
    block: actionRow.block,
    name: actionRow.name,
    category: actionRow.category,
    decision: actionRow.decision,
    alignmentClass: precisionRow?.alignmentClass ?? '',
    traceStatus: precisionRow?.traceStatus ?? '',
    traceMethod: precisionRow?.traceMethod ?? '',
    precisionFlags,
    blockingFlags,
    operatorFocus: actionRow.operatorFocus,
    operatorAction: actionRow.operatorAction,
    acceptance: actionRow.acceptance,
    currentPath: precisionRow?.currentPath ?? inputRow?.currentPath ?? '',
    currentLabel: precisionRow ? [precisionRow.labelX, precisionRow.labelY] : [inputRow?.currentLabelX, inputRow?.currentLabelY],
    draftOnly: true,
    sourceOfTruth: false,
    productionWriteAllowed: false,
    draftVisualPath: precisionRow?.draftVisualPath ?? '',
    draftHitPath: precisionRow?.draftHitPath ?? '',
    draftLabelPoint: precisionRow?.draftLabelPoint ?? '',
    draftReason: precisionRow?.draftReason ?? '',
    evidenceCrop: precisionRow?.evidenceCrop || actionRow.evidenceCrop || inputRow?.evidenceCrop || '',
    duplicateGroup: actionRow.duplicateGroup || precisionRow?.candidateDuplicateGroup || '',
    duplicatePeerBlocks: actionRow.duplicatePeerBlocks,
    pairedBlocks: actionRow.pairedBlocks,
    peerLabelConflicts: precisionRow?.peerLabelConflicts ?? [],
    sourceInput: actionRow.sourceInput,
    requiredApprovalFields: actionRow.requiredApprovalFields ?? [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ],
    emptyOperatorFields: [
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ].filter((field) => !inputRow?.[field]),
  };
}).sort((a, b) => a.stageOrder - b.stageOrder || String(a.block).localeCompare(String(b.block), 'ko'));

const countByStage = rows.reduce((counts, row) => {
  counts[row.stage] = (counts[row.stage] ?? 0) + 1;
  return counts;
}, {});
const approvedRows = rows.filter((row) => row.decision === 'APPROVED');
const rowsWithDraft = rows.filter((row) => row.draftVisualPath).length;
const rowsWithoutDraft = rows.length - rowsWithDraft;
const rowsWithBlockingFlags = rows.filter((row) => row.blockingFlags.length > 0).length;

[
  ['P1_PRECISION_BOUNDARY_FIRST_ROWS', countByStage.PAIR_BOUNDARY_FIRST ?? 0, EXPECTED.boundaryFirstRows],
  ['P1_PRECISION_SINGLE_CORRECTED_PATH_ROWS', countByStage.SINGLE_CORRECTED_PATH ?? 0, EXPECTED.singleCorrectedPathRows],
  ['P1_PRECISION_DUPLICATE_SPLIT_ROWS', countByStage.DUPLICATE_CANDIDATE_SPLIT ?? 0, EXPECTED.duplicateSplitRows],
  ['P1_PRECISION_APPROVED_ROWS', approvedRows.length, EXPECTED.approvedRows],
].forEach(([label, actual, expected]) => {
  if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
});

if (approvedRows.length > 0) warnings.push('P1_PRECISION_WORKSET_HAS_APPROVED_ROWS_REVIEW_SOURCE_INPUT_BEFORE_WRITE');

const summary = {
  worksetVersion: WORKSET_VERSION,
  status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
  targetBatchId: TARGET_BATCH_ID,
  precisionAudit: path.relative(frontendRoot, precisionAuditPath),
  nextActionPacket: path.relative(frontendRoot, nextActionPath),
  sourceInput: path.relative(frontendRoot, inputPath),
  totalRows: rows.length,
  boundaryFirstRows: countByStage.PAIR_BOUNDARY_FIRST ?? 0,
  singleCorrectedPathRows: countByStage.SINGLE_CORRECTED_PATH ?? 0,
  duplicateSplitRows: countByStage.DUPLICATE_CANDIDATE_SPLIT ?? 0,
  approvedRows: approvedRows.length,
  rowsWithDraft,
  rowsWithoutDraft,
  rowsWithBlockingFlags,
  precisionPassLevel: precisionAudit.passLevel ?? '',
  releaseReady: precisionAudit.summary?.releaseReady === true,
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
  expected: EXPECTED,
  safetyContract: [
    'This P1 precision workset is read-only.',
    'It never writes operatorDecision or corrected fields.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'draftVisualPath, draftHitPath, and draftLabelPoint are evidence only.',
    'Production promotion still requires operatorDecision=APPROVED, correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt in the P1 source input.',
    'No external crawling, web search, or coordinate inference is allowed.',
  ],
  operatorOrder: [
    {
      stage: 'PAIR_BOUNDARY_FIRST',
      rows: EXPECTED.boundaryFirstRows,
      description: 'Resolve T1-1, T3-2, V1, V2, and V3 before any isolated duplicate split approval.',
    },
    {
      stage: 'SINGLE_CORRECTED_PATH',
      rows: EXPECTED.singleCorrectedPathRows,
      description: 'Trace M-9 from the official PNG because it has no reliable pixel candidate draft.',
    },
    {
      stage: 'DUPLICATE_CANDIDATE_SPLIT',
      rows: EXPECTED.duplicateSplitRows,
      description: 'Split each shared pixel candidate into a separate block-specific correctedPath.',
    },
  ],
  nextGateCommands: [
    'npm run stadium:daegu:p1-operator-validate',
    'npm run stadium:daegu:p1-operator-import',
    'npm run stadium:daegu:p1-operator-readiness',
    'npm run stadium:daegu:p1-operator-import:write-template',
    'npm run stadium:daegu:operator-corrections-write',
  ],
  rows,
};

const jsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-precision-workset.json');
const csvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-precision-workset.csv');
const markdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-precision-workset.md');
const svgPath = path.join(p1ReportDir, 'daegu-seatmap-p1-precision-workset.svg');

await fs.mkdir(p1ReportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'stageOrder',
    'stage',
    'precisionWorkOrderGroup',
    'block',
    'blockId',
    'decision',
    'alignmentClass',
    'precisionFlags',
    'blockingFlags',
    'operatorFocus',
    'operatorAction',
    'acceptance',
    'draftOnly',
    'sourceOfTruth',
    'productionWriteAllowed',
    'draftVisualPath',
    'draftHitPath',
    'draftLabelPoint',
    'evidenceCrop',
    'sourceInput',
    'requiredApprovalFields',
  ],
  ...rows.map((row) => [
    row.stageOrder,
    row.stage,
    row.precisionWorkOrderGroup,
    row.block,
    row.blockId,
    row.decision,
    row.alignmentClass,
    row.precisionFlags.join(' '),
    row.blockingFlags.join(' '),
    row.operatorFocus,
    row.operatorAction,
    row.acceptance,
    row.draftOnly,
    row.sourceOfTruth,
    row.productionWriteAllowed,
    row.draftVisualPath,
    row.draftHitPath,
    Array.isArray(row.draftLabelPoint) ? JSON.stringify(row.draftLabelPoint) : row.draftLabelPoint,
    row.evidenceCrop,
    row.sourceInput,
    row.requiredApprovalFields.join(' | '),
  ]),
]);

const stageRows = ['PAIR_BOUNDARY_FIRST', 'SINGLE_CORRECTED_PATH', 'DUPLICATE_CANDIDATE_SPLIT'].map((stage) => [
  `\`${stage}\``,
  String(countByStage[stage] ?? 0),
  rows
    .filter((row) => row.stage === stage)
    .map((row) => `\`${row.block}\``)
    .join(' '),
]);

const workRows = rows.map((row) => [
  String(row.stageOrder),
  `\`${row.stage}\``,
  `\`${row.block}\``,
  row.name,
  row.precisionFlags.map((flag) => `\`${flag}\``).join('<br>') || '-',
  row.blockingFlags.map((flag) => `\`${flag}\``).join('<br>') || '-',
  row.evidenceCrop ? `\`${row.evidenceCrop}\`` : '-',
  row.operatorAction,
]);

const markdown = [
  '# Daegu P1 precision workset',
  '',
  `- workset version: \`${summary.worksetVersion}\``,
  `- status: \`${summary.status}\``,
  `- target batch: \`${summary.targetBatchId}\``,
  `- total rows: ${summary.totalRows}`,
  `- boundary-first rows: ${summary.boundaryFirstRows}`,
  `- single corrected-path rows: ${summary.singleCorrectedPathRows}`,
  `- duplicate split rows: ${summary.duplicateSplitRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- rows with draft evidence: ${summary.rowsWithDraft}`,
  `- rows without draft evidence: ${summary.rowsWithoutDraft}`,
  `- rows with blocking flags: ${summary.rowsWithBlockingFlags}`,
  `- precision pass level: \`${summary.precisionPassLevel}\``,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  '',
  '## Stage Order',
  '',
  markdownTable(['stage', 'rows', 'blocks'], stageRows),
  '',
  '## Work Rows',
  '',
  markdownTable(['order', 'stage', 'block', 'name', 'precision flags', 'blocking flags', 'evidence crop', 'operator action'], workRows),
  '',
  '## Safety Contract',
  '',
  report.safetyContract.map((line) => `- ${line}`).join('\n'),
  '',
  '## Next Gates',
  '',
  report.nextGateCommands.map((command, index) => `${index + 1}. \`${command}\``).join('\n'),
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n');
await fs.writeFile(markdownPath, markdown, 'utf8');

const stageColor = {
  PAIR_BOUNDARY_FIRST: '#dc2626',
  SINGLE_CORRECTED_PATH: '#ea580c',
  DUPLICATE_CANDIDATE_SPLIT: '#7c3aed',
};

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1707" height="2048" viewBox="0 0 1707 2048">',
  '  <style>',
  '    .grid { stroke: #0f172a; stroke-opacity: 0.12; stroke-width: 1; }',
  '    .current { fill-opacity: 0.1; stroke-width: 2; vector-effect: non-scaling-stroke; }',
  '    .draft { fill: none; stroke: #06b6d4; stroke-width: 2; stroke-dasharray: 8 5; vector-effect: non-scaling-stroke; }',
  '    .label { font: 800 13px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
  '    .stage { font: 700 9px sans-serif; fill: #334155; stroke: #fff; stroke-width: 2; paint-order: stroke; }',
  '  </style>',
  '  <image href="../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png" x="0" y="0" width="1707" height="2048" preserveAspectRatio="none" />',
  ...Array.from({ length: Math.floor(1707 / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="2048" />`),
  ...Array.from({ length: Math.floor(2048 / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="1707" y2="${index * 100}" />`),
  '  <g id="current-paths">',
  ...rows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}" fill="${stageColor[row.stage] ?? '#64748b'}" stroke="${stageColor[row.stage] ?? '#64748b'}"><title>${xmlEscape(`${row.block} ${row.stage} ${(row.precisionFlags ?? []).join(' ')}`)}</title></path>`),
  '  </g>',
  '  <g id="draft-paths">',
  ...rows
    .filter((row) => row.draftVisualPath)
    .map((row) => `    <path class="draft" d="${xmlEscape(row.draftVisualPath)}"><title>${xmlEscape(`${row.block} draft reference only`)}</title></path>`),
  '  </g>',
  '  <g id="labels">',
  ...rows.map((row) => {
    const [x, y] = Array.isArray(row.currentLabel) ? row.currentLabel : [0, 0];
    return [
      `    <circle cx="${x}" cy="${y}" r="4" fill="${stageColor[row.stage] ?? '#64748b'}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />`,
      `    <text class="label" x="${Number(x) + 7}" y="${Number(y) - 7}">${xmlEscape(row.block)}</text>`,
      `    <text class="stage" x="${Number(x) + 7}" y="${Number(y) + 7}">${xmlEscape(row.stage)}</text>`,
    ].join('\n');
  }),
  '  </g>',
  '</svg>',
].join('\n');
await fs.writeFile(svgPath, svg, 'utf8');

console.log(`p1_precision_workset_json:${jsonPath}`);
console.log(`p1_precision_workset_csv:${csvPath}`);
console.log(`p1_precision_workset_markdown:${markdownPath}`);
console.log(`p1_precision_workset_svg:${svgPath}`);
console.log(`status:${summary.status} total=${summary.totalRows} boundaryFirst=${summary.boundaryFirstRows} single=${summary.singleCorrectedPathRows} duplicate=${summary.duplicateSplitRows} approved=${summary.approvedRows}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
