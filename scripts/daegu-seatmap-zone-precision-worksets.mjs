import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const WORKSET_VERSION = 'DAEGU_ZONE_PRECISION_WORKSETS_V1';
const PRECISION_AUDIT_VERSION = 'DAEGU_SEATMAP_PRECISION_AUDIT_V1';
const RENDER_SAFETY_AUDIT_VERSION = 'DAEGU_SEATMAP_RENDER_SAFETY_AUDIT_V1';
const UI_PASS_LEVEL = 'PASS_UI_CONTAINMENT';
const RELEASE_PASS_LEVEL = 'PASS_RELEASE_177';
const EXPECTED_UNRESOLVED_ROWS = 97;

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

const pathBounds = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
};

const zoneDefinitions = [
  {
    id: 'ZONE_3F_FIRST_BASE',
    label: '3F 1루/내야/테이블',
    expectedRows: 13,
    description: '1루 원정/내야/익사이팅/테이블 미검수 row',
    includes: (row) => row.level === '3F' && row.side === 'FIRST_BASE',
  },
  {
    id: 'ZONE_3F_CENTER_THIRD',
    label: '3F 중앙/3루/테이블',
    expectedRows: 11,
    description: '중앙 V 계열과 3루 내야/블루/익사이팅/테이블 미검수 row',
    includes: (row) => row.level === '3F' && ['CENTER', 'THIRD_BASE'].includes(row.side),
  },
  {
    id: 'ZONE_5F_SKY',
    label: '5F SKY 중앙/1루/3루',
    expectedRows: 39,
    description: 'S/U/숫자 SKY 계열 미검수 row',
    includes: (row) => row.level === '5F' && row.category === 'SKY',
  },
  {
    id: 'ZONE_OUTFIELD',
    label: '외야/루프탑/커플/패밀리',
    expectedRows: 34,
    description: 'RF/LF/MR/TR/F/외야 특수 잔여 row',
    includes: (row) => row.side === 'OUTFIELD' || ['M-9', '중앙 외야', '외야 3루측'].includes(row.block),
  },
];

const workStageDefinitions = [
  {
    id: 'STAGE_01_BOUNDARY_FIRST',
    order: 1,
    label: 'Boundary-first ownership',
    expectedRows: 5,
    includes: (row) => row.workOrderGroup === '01_P1_BOUNDARY_FIRST',
  },
  {
    id: 'STAGE_02_DUPLICATE_SHARED',
    order: 2,
    label: 'Duplicate/shared candidate split',
    expectedRows: 12,
    includes: (row) => row.workOrderGroup === '02_P1_DUPLICATE_OR_SINGLE_CORRECTION',
  },
  {
    id: 'STAGE_03_3F_MANUAL_RETRACE',
    order: 3,
    label: '3F manual retrace remainder',
    expectedRows: 9,
    includes: (row) => ['ZONE_3F_FIRST_BASE', 'ZONE_3F_CENTER_THIRD'].includes(row.zoneId),
  },
  {
    id: 'STAGE_04_5F_SKY',
    order: 4,
    label: '5F SKY S/U/number blocks',
    expectedRows: 39,
    includes: (row) => row.zoneId === 'ZONE_5F_SKY',
  },
  {
    id: 'STAGE_05_OUTFIELD',
    order: 5,
    label: 'Outfield remainder',
    expectedRows: 32,
    includes: (row) => row.zoneId === 'ZONE_OUTFIELD',
  },
];

const stageFor = (row) => workStageDefinitions.find((stage) => stage.includes(row));
const zoneFor = (row) => zoneDefinitions.find((zone) => zone.includes(row));

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const precisionAuditPath = path.join(reportDir, 'daegu-seatmap-precision-audit.json');
const renderSafetyAuditPath = path.join(reportDir, 'daegu-seatmap-render-safety-audit.json');
const precisionAudit = await readJson(precisionAuditPath);
const renderSafetyAudit = await readJson(renderSafetyAuditPath);

const precisionRows = Array.isArray(precisionAudit.unresolvedWorkset) ? precisionAudit.unresolvedWorkset : [];
const blockers = [];
const warnings = [];

if (precisionAudit.auditVersion !== PRECISION_AUDIT_VERSION) {
  blockers.push(`PRECISION_AUDIT_VERSION_MISMATCH:${precisionAudit.auditVersion ?? ''}`);
}
if (renderSafetyAudit.auditVersion !== RENDER_SAFETY_AUDIT_VERSION) {
  blockers.push(`RENDER_SAFETY_AUDIT_VERSION_MISMATCH:${renderSafetyAudit.auditVersion ?? ''}`);
}
if (renderSafetyAudit.passLevel !== UI_PASS_LEVEL) {
  blockers.push(`RENDER_SAFETY_PASS_LEVEL_NOT_UI_CONTAINED:${renderSafetyAudit.passLevel ?? ''}`);
}
if (precisionRows.length !== EXPECTED_UNRESOLVED_ROWS) {
  blockers.push(`UNRESOLVED_ROW_COUNT:${precisionRows.length}!=${EXPECTED_UNRESOLVED_ROWS}`);
}
if (precisionAudit.passLevel === RELEASE_PASS_LEVEL) {
  warnings.push('PRECISION_AUDIT_ALREADY_RELEASE_READY_ZONE_WORKSET_SHOULD_BE_EMPTY');
}

const rows = precisionRows.map((row) => {
  const zone = zoneFor(row);
  if (!zone) blockers.push(`ZONE_UNASSIGNED:${row.block}`);
  return {
    ...row,
    zoneId: zone?.id ?? 'ZONE_UNASSIGNED',
    zoneLabel: zone?.label ?? 'Unassigned',
    zoneDescription: zone?.description ?? '',
  };
}).map((row) => {
  const stage = stageFor(row);
  if (!stage) blockers.push(`WORK_STAGE_UNASSIGNED:${row.block}`);
  return {
    worksetVersion: WORKSET_VERSION,
    blockId: row.id,
    block: row.block,
    name: row.name,
    category: row.category,
    level: row.level,
    side: row.side,
    zoneId: row.zoneId,
    zoneLabel: row.zoneLabel,
    workStageId: stage?.id ?? 'STAGE_UNASSIGNED',
    workStageOrder: stage?.order ?? 99,
    workStageLabel: stage?.label ?? 'Unassigned',
    workOrderGroup: row.workOrderGroup,
    traceStatus: row.traceStatus,
    traceMethod: row.traceMethod,
    precisionFlags: row.precisionFlags ?? [],
    nextAction: row.nextAction,
    currentPath: row.currentPath,
    currentBounds: row.currentPathBounds ?? pathBounds(row.currentPath),
    currentLabel: [row.labelX, row.labelY],
    draftOnly: true,
    sourceOfTruth: false,
    productionWriteAllowed: false,
    operatorApprovalRequired: true,
    requiredApprovalFields: row.requiredApprovalFields ?? [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ],
    draftVisualPath: row.draftVisualPath ?? '',
    draftHitPath: row.draftHitPath ?? '',
    draftLabelPoint: row.draftLabelPoint ?? '',
    draftReason: row.draftReason ?? '',
    evidenceCrop: row.evidenceCrop ?? '',
    candidateDuplicateGroup: row.candidateDuplicateGroup ?? '',
    peerLabelConflicts: row.peerLabelConflicts ?? [],
  };
}).sort((a, b) => (
  a.workStageOrder - b.workStageOrder
  || a.zoneId.localeCompare(b.zoneId)
  || String(a.block).localeCompare(String(b.block), 'ko')
));

const countBy = (items, key) => items.reduce((counts, row) => {
  counts[row[key]] = (counts[row[key]] ?? 0) + 1;
  return counts;
}, {});

const zoneCounts = countBy(rows, 'zoneId');
const workStageCounts = countBy(rows, 'workStageId');

zoneDefinitions.forEach((zone) => {
  const actual = zoneCounts[zone.id] ?? 0;
  if (actual !== zone.expectedRows) blockers.push(`ZONE_ROW_COUNT:${zone.id}:${actual}!=${zone.expectedRows}`);
});

workStageDefinitions.forEach((stage) => {
  const actual = workStageCounts[stage.id] ?? 0;
  if (actual !== stage.expectedRows) blockers.push(`WORK_STAGE_ROW_COUNT:${stage.id}:${actual}!=${stage.expectedRows}`);
});

const hiddenFromNormalUi = renderSafetyAudit.summary?.hiddenFromNormalUiRows ?? 0;
if (hiddenFromNormalUi !== EXPECTED_UNRESOLVED_ROWS) {
  blockers.push(`HIDDEN_FROM_NORMAL_UI_COUNT:${hiddenFromNormalUi}!=${EXPECTED_UNRESOLVED_ROWS}`);
}

const summary = {
  worksetVersion: WORKSET_VERSION,
  status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
  passLevel: precisionAudit.passLevel ?? '',
  uiPassLevel: renderSafetyAudit.passLevel ?? '',
  releaseTarget: RELEASE_PASS_LEVEL,
  totalRows: rows.length,
  expectedRows: EXPECTED_UNRESOLVED_ROWS,
  zoneCounts,
  workStageCounts,
  zoneDefinitions: zoneDefinitions.map(({ id, label, expectedRows, description }) => ({
    id,
    label,
    expectedRows,
    description,
  })),
  workStageDefinitions: workStageDefinitions.map(({ id, order, label, expectedRows }) => ({
    id,
    order,
    label,
    expectedRows,
  })),
  precisionAudit: path.relative(frontendRoot, precisionAuditPath),
  renderSafetyAudit: path.relative(frontendRoot, renderSafetyAuditPath),
  productionWriteAllowed: false,
  sourceOfTruth: false,
  draftOnly: true,
  blockers,
  warnings,
};

const outputBase = path.join(reportDir, 'daegu-seatmap-zone-precision-worksets');
await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(`${outputBase}.json`, JSON.stringify({ summary, rows }, null, 2), 'utf8');

await writeCsv(`${outputBase}.csv`, [
  [
    'workStageOrder',
    'workStageId',
    'zoneId',
    'block',
    'name',
    'category',
    'level',
    'side',
    'workOrderGroup',
    'traceStatus',
    'traceMethod',
    'precisionFlags',
    'nextAction',
    'evidenceCrop',
    'requiredApprovalFields',
    'productionWriteAllowed',
  ],
  ...rows.map((row) => [
    row.workStageOrder,
    row.workStageId,
    row.zoneId,
    row.block,
    row.name,
    row.category,
    row.level,
    row.side,
    row.workOrderGroup,
    row.traceStatus,
    row.traceMethod,
    row.precisionFlags.join(' '),
    row.nextAction,
    row.evidenceCrop,
    row.requiredApprovalFields.join(' '),
    row.productionWriteAllowed,
  ]),
]);

const zoneTable = markdownTable(
  ['Zone', 'Label', 'Expected', 'Actual', 'Description'],
  zoneDefinitions.map((zone) => [
    `\`${zone.id}\``,
    zone.label,
    zone.expectedRows,
    zoneCounts[zone.id] ?? 0,
    zone.description,
  ]),
);
const stageTable = markdownTable(
  ['Order', 'Stage', 'Expected', 'Actual', 'Meaning'],
  workStageDefinitions.map((stage) => [
    stage.order,
    `\`${stage.id}\``,
    stage.expectedRows,
    workStageCounts[stage.id] ?? 0,
    stage.label,
  ]),
);
const rowTable = markdownTable(
  ['Stage', 'Zone', 'Block', 'Name', 'Flags', 'Next action'],
  rows.map((row) => [
    `${row.workStageOrder}. ${row.workStageId}`,
    row.zoneId,
    row.block,
    row.name,
    row.precisionFlags.join('<br>'),
    row.nextAction,
  ]),
);

const markdown = `# Daegu Seatmap Zone Precision Worksets

- version: \`${WORKSET_VERSION}\`
- status: \`${summary.status}\`
- precision pass level: \`${summary.passLevel}\`
- UI pass level: \`${summary.uiPassLevel}\`
- release target: \`${summary.releaseTarget}\`
- unresolved rows: \`${summary.totalRows}/${summary.expectedRows}\`
- production write allowed: \`${summary.productionWriteAllowed}\`

This report locks the zone-by-zone tracing order for the remaining Daegu polygons.
It is not production source of truth. Only operator-approved corrected paths may be written back.

## Zones

${zoneTable}

## Work Stages

${stageTable}

## Rows

${rowTable}

## Blockers

${blockers.length ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none'}

## Warnings

${warnings.length ? warnings.map((warning) => `- \`${warning}\``).join('\n') : '- none'}
`;
await fs.writeFile(`${outputBase}.md`, markdown, 'utf8');

const stageColors = {
  STAGE_01_BOUNDARY_FIRST: '#DC2626',
  STAGE_02_DUPLICATE_SHARED: '#EA580C',
  STAGE_03_3F_MANUAL_RETRACE: '#CA8A04',
  STAGE_04_5F_SKY: '#2563EB',
  STAGE_05_OUTFIELD: '#16A34A',
};
const paths = rows.map((row) => `
  <path d="${xmlEscape(row.currentPath)}" fill="${stageColors[row.workStageId] ?? '#64748B'}" fill-opacity="0.18" stroke="${stageColors[row.workStageId] ?? '#64748B'}" stroke-width="3" vector-effect="non-scaling-stroke">
    <title>${xmlEscape(`${row.workStageId} · ${row.zoneId} · ${row.block} · ${row.name}`)}</title>
  </path>
  <text x="${row.currentLabel[0]}" y="${row.currentLabel[1]}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="4" paint-order="stroke">${xmlEscape(row.block)}</text>
`).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1707 2048">
  <rect width="1707" height="2048" fill="#f8fafc"/>
  <text x="32" y="48" font-size="30" font-weight="900" fill="#0f172a">Daegu zone precision worksets (${summary.status})</text>
  ${paths}
</svg>
`;
await fs.writeFile(`${outputBase}.svg`, svg, 'utf8');

console.log(`zone_precision_worksets_json:${path.relative(frontendRoot, `${outputBase}.json`)}`);
console.log(`zone_precision_worksets_csv:${path.relative(frontendRoot, `${outputBase}.csv`)}`);
console.log(`zone_precision_worksets_markdown:${path.relative(frontendRoot, `${outputBase}.md`)}`);
console.log(`zone_precision_worksets_svg:${path.relative(frontendRoot, `${outputBase}.svg`)}`);
console.log(`status:${summary.status} rows=${rows.length} stages=${Object.keys(workStageCounts).length} zones=${Object.keys(zoneCounts).length}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
