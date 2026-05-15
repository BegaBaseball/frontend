import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

const ENTRY_SHEET_VERSION = 'DAEGU_P2_OPERATOR_ENTRY_SHEET_V1';
const PREFLIGHT_VERSION = 'DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1';
const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
const TARGET_BATCH_ID = 'BATCH_3_P2';
const SOURCE_INPUT_RELATIVE_PATH = 'reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json';
const EDITABLE_FIELDS = [
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'operatorNote',
];
const WORKSETS = [
  {
    id: 'P2-A',
    slug: 'p2-a-label-hit',
    artifactPrefix: 'daegu-seatmap-p2-a-label-hit-entry-sheet',
    title: 'P2-A Label/Hit Entry Sheet',
    expectedRows: 2,
    focus: 'Fill correctedPath and correctedLabelX/Y only after label top-hit review against the official PNG.',
  },
  {
    id: 'P2-B',
    slug: 'p2-b-visual-approval',
    artifactPrefix: 'daegu-seatmap-p2-b-visual-approval-entry-sheet',
    title: 'P2-B Visual Approval Entry Sheet',
    expectedRows: 1,
    focus: 'Compare candidate geometry with the evidence crop before approving; candidatePath is reference-only.',
  },
  {
    id: 'P2-C',
    slug: 'p2-c-sky-u-manual-retrace',
    artifactPrefix: 'daegu-seatmap-p2-c-sky-u-manual-retrace-entry-sheet',
    title: 'P2-C SKY/U Manual Retrace Entry Sheet',
    expectedRows: 5,
    focus: 'Trace fresh SKY/U polygons from the official PNG; currentPath is reference-only.',
  },
  {
    id: 'P2-D',
    slug: 'p2-d-outfield-manual-retrace',
    artifactPrefix: 'daegu-seatmap-p2-d-outfield-manual-retrace-entry-sheet',
    title: 'P2-D Outfield Manual Retrace Entry Sheet',
    expectedRows: 28,
    focus: 'Trace fresh outfield polygons from the official PNG; do not reuse legacy rectangles.',
  },
];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

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

const isBlank = (value) => String(value ?? '').trim() === '';
const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';
const svgPathPointCount = (value) => {
  const numbers = String(value ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/giu) ?? [];
  return Math.floor(numbers.length / 2);
};

const missingEntryFields = (row) => {
  const missing = [];
  if (normalizeDecision(row.operatorDecision) !== 'APPROVED') missing.push('operatorDecision=APPROVED');
  if (isBlank(row.correctedPath)) missing.push('correctedPath');
  if (isBlank(row.correctedLabelX) || isBlank(row.correctedLabelY)) missing.push('correctedLabelX/Y');
  if (isBlank(row.reviewer)) missing.push('reviewer');
  if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
  return missing;
};

const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
const preflightPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-workset-preflight.json');
const inputPath = path.join(frontendRoot, SOURCE_INPUT_RELATIVE_PATH);

const preflight = await readJson(preflightPath);
const input = await readJson(inputPath);
const blockers = [];

if (preflight.summary?.preflightVersion !== PREFLIGHT_VERSION) {
  blockers.push(`P2_WORKSET_PREFLIGHT_VERSION_MISMATCH:${preflight.summary?.preflightVersion ?? ''}`);
}
if (input.packageVersion !== PACKAGE_VERSION) blockers.push(`P2_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (input.productionWriteAllowed !== false) blockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (preflight.summary?.productionWriteAllowed !== false) blockers.push('P2_PREFLIGHT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const preflightRows = Array.isArray(preflight.rows) ? preflight.rows : [];
const preflightByBlockId = new Map(preflightRows.map((row) => [row.blockId, row]));

const entries = inputRows.map((inputRow, index) => {
  const preflightRow = preflightByBlockId.get(inputRow.blockId) ?? {};
  const missingFields = missingEntryFields(inputRow);
  const workset = preflightRow.workset ?? 'UNASSIGNED';
  return {
    workset,
    worksetTitle: preflightRow.worksetTitle ?? '',
    block: inputRow.block,
    blockId: inputRow.blockId,
    name: inputRow.name,
    category: inputRow.category,
    rowIndex: index,
    editableTarget: `${SOURCE_INPUT_RELATIVE_PATH}#corrections[${index}]`,
    editableFields: EDITABLE_FIELDS,
    decision: normalizeDecision(inputRow.operatorDecision),
    rowStatus: missingFields.length > 0 ? 'waiting-for-operator-entry' : 'entry-fields-complete',
    missingEntryFields: missingFields,
    requiredOperatorReview: inputRow.requiredOperatorReview,
    operatorAction: inputRow.operatorAction,
    stagingBucket: inputRow.stagingBucket,
    currentPath: inputRow.currentPath ?? '',
    currentPathPointCount: svgPathPointCount(inputRow.currentPath),
    currentPathReferenceOnly: true,
    currentLabelX: inputRow.currentLabelX ?? '',
    currentLabelY: inputRow.currentLabelY ?? '',
    candidatePath: inputRow.candidatePath ?? '',
    candidatePathPointCount: Number(inputRow.candidatePathPointCount ?? svgPathPointCount(inputRow.candidatePath)),
    candidatePathReferenceOnly: true,
    candidateLabelX: inputRow.candidateLabelX ?? '',
    candidateLabelY: inputRow.candidateLabelY ?? '',
    correctedPath: inputRow.correctedPath ?? '',
    correctedPathPointCount: svgPathPointCount(inputRow.correctedPath),
    correctedLabelX: inputRow.correctedLabelX ?? '',
    correctedLabelY: inputRow.correctedLabelY ?? '',
    reviewer: inputRow.reviewer ?? '',
    reviewedAt: inputRow.reviewedAt ?? '',
    operatorNote: inputRow.operatorNote ?? '',
    evidenceCrop: inputRow.evidenceCrop ?? '',
    riskFlags: inputRow.riskFlags ?? '',
    officialFailureReasons: inputRow.officialFailureReasons ?? '',
    preflightStatus: preflightRow.rowStatus ?? 'missing-preflight-row',
    preflightWarnings: preflightRow.warnings ?? [],
    preflightBlockers: preflightRow.blockers ?? [],
    candidateReferenceOnly: true,
    productionWriteAllowed: false,
  };
});

const entriesByBlockId = new Map(entries.map((entry) => [entry.blockId, entry]));
const missingPreflightRows = entries.filter((entry) => entry.preflightStatus === 'missing-preflight-row');
if (missingPreflightRows.length > 0) {
  blockers.push(`P2_ENTRY_SHEET_MISSING_PREFLIGHT_ROWS:${missingPreflightRows.map((entry) => entry.block).join(' ')}`);
}
const extraPreflightRows = preflightRows.filter((row) => !entriesByBlockId.has(row.blockId));
if (extraPreflightRows.length > 0) {
  blockers.push(`P2_ENTRY_SHEET_EXTRA_PREFLIGHT_ROWS:${extraPreflightRows.map((row) => row.block).join(' ')}`);
}

const worksetSummaries = WORKSETS.map((definition) => {
  const rows = entries.filter((entry) => entry.workset === definition.id);
  if (rows.length !== definition.expectedRows) {
    blockers.push(`${definition.id}_ENTRY_ROW_COUNT_MISMATCH:${rows.length}:${definition.expectedRows}`);
  }
  return {
    id: definition.id,
    slug: definition.slug,
    artifactPrefix: definition.artifactPrefix,
    title: definition.title,
    focus: definition.focus,
    expectedRows: definition.expectedRows,
    rowCount: rows.length,
    waitingForOperatorRows: rows.filter((entry) => entry.rowStatus === 'waiting-for-operator-entry').length,
    completeRows: rows.filter((entry) => entry.rowStatus === 'entry-fields-complete').length,
    rows,
  };
});

const unassignedEntries = entries.filter((entry) => entry.workset === 'UNASSIGNED');
if (unassignedEntries.length > 0) {
  blockers.push(`P2_ENTRY_SHEET_UNASSIGNED_ROWS:${unassignedEntries.map((entry) => entry.block).join(' ')}`);
}

const waitingForOperatorRows = entries.filter((entry) => entry.rowStatus === 'waiting-for-operator-entry');
const summary = {
  entrySheetVersion: ENTRY_SHEET_VERSION,
  status: blockers.length > 0
    ? 'blocked'
    : waitingForOperatorRows.length > 0
      ? 'waiting-for-operator-entry'
      : 'ready-for-workset-preflight',
  targetBatchId: TARGET_BATCH_ID,
  sourceInput: SOURCE_INPUT_RELATIVE_PATH,
  sourcePreflight: path.relative(frontendRoot, preflightPath),
  totalRows: entries.length,
  p2aRows: worksetSummaries.find((workset) => workset.id === 'P2-A')?.rowCount ?? 0,
  p2bRows: worksetSummaries.find((workset) => workset.id === 'P2-B')?.rowCount ?? 0,
  p2cRows: worksetSummaries.find((workset) => workset.id === 'P2-C')?.rowCount ?? 0,
  p2dRows: worksetSummaries.find((workset) => workset.id === 'P2-D')?.rowCount ?? 0,
  waitingForOperatorRows: waitingForOperatorRows.length,
  completeRows: entries.filter((entry) => entry.rowStatus === 'entry-fields-complete').length,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesSourceInput: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings: preflight.summary?.warnings ?? [],
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  editableFields: EDITABLE_FIELDS,
  safetyContract: [
    'This entry sheet is read-only.',
    'It shows editableTarget pointers into the P2 source input file but never writes those fields.',
    'candidatePath is reference-only.',
    'currentPath is reference-only.',
    'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
    'It never writes source input or the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
  ],
  worksets: worksetSummaries,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-entry-sheet.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-entry-sheet.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-entry-sheet.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'workset',
    'block',
    'blockId',
    'editableTarget',
    'editableFields',
    'decision',
    'rowStatus',
    'missingEntryFields',
    'currentPathReferenceOnly',
    'candidatePathReferenceOnly',
    'currentPathPointCount',
    'candidatePathPointCount',
    'correctedPathPointCount',
    'evidenceCrop',
    'riskFlags',
  ],
  ...entries.map((entry) => [
    entry.workset,
    entry.block,
    entry.blockId,
    entry.editableTarget,
    entry.editableFields.join(' '),
    entry.decision,
    entry.rowStatus,
    entry.missingEntryFields.join(' '),
    entry.currentPathReferenceOnly,
    entry.candidatePathReferenceOnly,
    entry.currentPathPointCount,
    entry.candidatePathPointCount,
    entry.correctedPathPointCount,
    entry.evidenceCrop,
    entry.riskFlags,
  ]),
]);

const writeWorksetEntrySheet = async (workset) => {
  const worksetJsonPath = path.join(outputDir, `${workset.artifactPrefix}.json`);
  const worksetCsvPath = path.join(outputDir, `${workset.artifactPrefix}.csv`);
  const worksetMarkdownPath = path.join(outputDir, `${workset.artifactPrefix}.md`);
  const worksetReport = {
    generatedAt: report.generatedAt,
    entrySheetVersion: ENTRY_SHEET_VERSION,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    id: workset.id,
    slug: workset.slug,
    title: workset.title,
    focus: workset.focus,
    expectedRows: workset.expectedRows,
    rowCount: workset.rowCount,
    waitingForOperatorRows: workset.waitingForOperatorRows,
    completeRows: workset.completeRows,
    editableFields: EDITABLE_FIELDS,
    rows: workset.rows,
  };
  await fs.writeFile(worksetJsonPath, `${JSON.stringify(worksetReport, null, 2)}\n`, 'utf8');
  await writeCsv(worksetCsvPath, [
    [
      'block',
      'blockId',
      'editableTarget',
      'decision',
      'rowStatus',
      'missingEntryFields',
      'currentPathPointCount',
      'candidatePathPointCount',
      'correctedPathPointCount',
      'evidenceCrop',
      'operatorNote',
    ],
    ...workset.rows.map((entry) => [
      entry.block,
      entry.blockId,
      entry.editableTarget,
      entry.decision,
      entry.rowStatus,
      entry.missingEntryFields.join(' '),
      entry.currentPathPointCount,
      entry.candidatePathPointCount,
      entry.correctedPathPointCount,
      entry.evidenceCrop,
      entry.operatorNote,
    ]),
  ]);
  await fs.writeFile(worksetMarkdownPath, [
    `# Daegu ${workset.title}`,
    '',
    `- entry sheet version: \`${ENTRY_SHEET_VERSION}\``,
    `- rows: ${workset.rowCount}/${workset.expectedRows}`,
    `- waiting for operator: ${workset.waitingForOperatorRows}`,
    `- complete rows: ${workset.completeRows}`,
    `- production write allowed: \`false\``,
    '',
    '## Focus',
    '',
    workset.focus,
    '',
    '## Editable Fields',
    '',
    `- ${EDITABLE_FIELDS.map((field) => `\`${field}\``).join(' ')}`,
    '- `currentPath` and `candidatePath` are reference-only.',
    '- Fill the matching `editableTarget` row in the P2 source input only after operator review.',
    '',
    '## Rows',
    '',
    markdownTable(
      ['block', 'editable target', 'decision', 'status', 'missing fields', 'current points', 'candidate points', 'evidence'],
      workset.rows.map((entry) => [
        `\`${entry.block}\``,
        `\`${entry.editableTarget}\``,
        `\`${entry.decision}\``,
        `\`${entry.rowStatus}\``,
        entry.missingEntryFields.map((field) => `\`${field}\``).join(' ') || '-',
        entry.currentPathPointCount,
        entry.candidatePathPointCount,
        `\`${entry.evidenceCrop}\``,
      ]),
    ),
    '',
  ].join('\n'), 'utf8');
  return {
    id: workset.id,
    json: path.relative(frontendRoot, worksetJsonPath),
    csv: path.relative(frontendRoot, worksetCsvPath),
    markdown: path.relative(frontendRoot, worksetMarkdownPath),
  };
};

const worksetArtifacts = [];
for (const workset of worksetSummaries) {
  worksetArtifacts.push(await writeWorksetEntrySheet(workset));
}
report.worksetArtifacts = worksetArtifacts;
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

await fs.writeFile(markdownPath, [
  '# Daegu P2 Operator Entry Sheet',
  '',
  `- entry sheet version: \`${ENTRY_SHEET_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- waiting for operator: ${summary.waitingForOperatorRows}`,
  `- complete rows: ${summary.completeRows}`,
  `- source input: \`${summary.sourceInput}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Editable Fields',
  '',
  `- ${EDITABLE_FIELDS.map((field) => `\`${field}\``).join(' ')}`,
  '',
  '## Worksets',
  '',
  markdownTable(
    ['workset', 'rows', 'waiting', 'complete', 'artifact'],
    worksetSummaries.map((workset) => {
      const artifact = worksetArtifacts.find((item) => item.id === workset.id);
      return [
        `\`${workset.id}\` ${workset.title}`,
        `${workset.rowCount}/${workset.expectedRows}`,
        workset.waitingForOperatorRows,
        workset.completeRows,
        artifact ? `\`${artifact.markdown}\`` : '-',
      ];
    }),
  ),
  '',
  '## Rows',
  '',
  markdownTable(
    ['workset', 'block', 'editable target', 'status', 'missing fields', 'evidence'],
    entries.map((entry) => [
      `\`${entry.workset}\``,
      `\`${entry.block}\``,
      `\`${entry.editableTarget}\``,
      `\`${entry.rowStatus}\``,
      entry.missingEntryFields.map((field) => `\`${field}\``).join(' ') || '-',
      `\`${entry.evidenceCrop}\``,
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

console.log(`p2_operator_entry_sheet_json:${jsonPath}`);
console.log(`p2_operator_entry_sheet_csv:${csvPath}`);
console.log(`p2_operator_entry_sheet_markdown:${markdownPath}`);
console.log(`status:${summary.status} waiting=${summary.waitingForOperatorRows}/${summary.totalRows} complete=${summary.completeRows}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
