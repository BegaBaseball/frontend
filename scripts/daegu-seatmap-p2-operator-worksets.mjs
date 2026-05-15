import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

const WORKSETS_VERSION = 'DAEGU_P2_OPERATOR_WORKSETS_V1';
const HANDOFF_VERSION = 'DAEGU_P2_OPERATOR_HANDOFF_V1';
const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
const TARGET_BATCH_ID = 'BATCH_3_P2';
const EXPECTED = {
  totalRows: 36,
  p2aRows: 2,
  p2bRows: 1,
  p2cRows: 5,
  p2dRows: 28,
};
const WORKSET_DEFINITIONS = [
  {
    id: 'P2-A',
    slug: 'p2-a-label-hit',
    title: 'P2-A Label/Hit Review',
    description: 'Label/top-hit mismatch rows that need path, corrected label point, and click target review together.',
    accepts: (row) => row.stage === 'LABEL_HIT_AREA_REVIEW_FIRST',
    expectedRows: EXPECTED.p2aRows,
    operatorFocus: 'Verify label top-hit against the official PNG, then approve only with correctedPath and correctedLabelX/Y.',
  },
  {
    id: 'P2-B',
    slug: 'p2-b-visual-approval',
    title: 'P2-B Visual Approval Candidate',
    description: 'Single visual approval candidate; candidate geometry is reference-only until explicitly approved by operator.',
    accepts: (row) => row.stage === 'VISUAL_APPROVAL_CHECK',
    expectedRows: EXPECTED.p2bRows,
    operatorFocus: 'Compare candidate geometry with the evidence crop and official PNG before approval.',
  },
  {
    id: 'P2-C',
    slug: 'p2-c-sky-u-manual-retrace',
    title: 'P2-C SKY/U Manual Retrace',
    description: 'Manual retrace rows for SKY/U blocks. These require fresh corrected polygons with at least six points.',
    accepts: (row) => row.stage === 'MANUAL_RETRACE_BATCH' && /^U\d+$/u.test(row.block),
    expectedRows: EXPECTED.p2cRows,
    operatorFocus: 'Trace fresh SKY/U polygons from the evidence crop; do not reuse legacy rectangles.',
  },
  {
    id: 'P2-D',
    slug: 'p2-d-outfield-manual-retrace',
    title: 'P2-D Outfield Manual Retrace',
    description: 'Manual retrace rows for outfield, RF/LF/MR/TR/F, and remaining wide outfield blocks.',
    accepts: (row) => row.stage === 'MANUAL_RETRACE_BATCH' && !/^U\d+$/u.test(row.block),
    expectedRows: EXPECTED.p2dRows,
    operatorFocus: 'Trace fresh outfield polygons from the evidence crop; keep candidate/current paths as reference only.',
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

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const isBlank = (value) => String(value ?? '').trim() === '';

const missingApprovalFields = (row) => {
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
const handoffPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-handoff.json');
const inputPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');

const handoff = await readJson(handoffPath);
const input = await readJson(inputPath);
const blockers = [];
const warnings = [];

if (handoff.summary?.handoffVersion !== HANDOFF_VERSION) {
  blockers.push(`P2_HANDOFF_VERSION_MISMATCH:${handoff.summary?.handoffVersion ?? ''}`);
}
if (input.packageVersion !== PACKAGE_VERSION) blockers.push(`P2_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (input.productionWriteAllowed !== false) blockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (handoff.summary?.productionWriteAllowed !== false) blockers.push('P2_HANDOFF_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const handoffRows = Array.isArray(handoff.rows) ? handoff.rows : [];
if (inputRows.length !== EXPECTED.totalRows) blockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.totalRows}`);
if (handoffRows.length !== EXPECTED.totalRows) blockers.push(`P2_HANDOFF_ROW_COUNT_MISMATCH:${handoffRows.length}:${EXPECTED.totalRows}`);

const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
const rows = handoffRows.map((handoffRow) => {
  const inputRow = inputByBlockId.get(handoffRow.blockId) ?? {};
  const missingFields = missingApprovalFields(inputRow);
  const correctedPathBlank = isBlank(inputRow.correctedPath);
  return {
    blockId: handoffRow.blockId,
    block: handoffRow.block,
    name: inputRow.name ?? handoffRow.name ?? '',
    category: inputRow.category ?? handoffRow.category ?? '',
    stage: handoffRow.stage,
    operatorAction: handoffRow.operatorAction,
    requiredOperatorReview: handoffRow.requiredOperatorReview,
    stagingBucket: inputRow.stagingBucket ?? handoffRow.stagingBucket ?? '',
    decision: normalizeDecision(inputRow.operatorDecision ?? handoffRow.decision),
    evidenceCrop: inputRow.evidenceCrop ?? handoffRow.evidenceCrop ?? '',
    currentPath: inputRow.currentPath ?? '',
    currentLabel: `${inputRow.currentLabelX ?? ''},${inputRow.currentLabelY ?? ''}`,
    candidatePath: inputRow.candidatePath ?? '',
    candidatePathPointCount: inputRow.candidatePathPointCount ?? handoffRow.candidatePathPointCount ?? '',
    candidateLabel: inputRow.candidateLabelX !== '' && inputRow.candidateLabelY !== ''
      ? `${inputRow.candidateLabelX},${inputRow.candidateLabelY}`
      : '',
    correctedPathBlank,
    correctedLabelBlank: isBlank(inputRow.correctedLabelX) || isBlank(inputRow.correctedLabelY),
    reviewerBlank: isBlank(inputRow.reviewer),
    reviewedAtBlank: isBlank(inputRow.reviewedAt),
    missingApprovalFields: missingFields,
    minCorrectedPathPoints: 6,
    candidateReferenceOnly: true,
    productionWriteAllowed: false,
    candidateDuplicateGroup: inputRow.candidateDuplicateGroup ?? handoffRow.candidateDuplicateGroup ?? '',
    candidateDuplicateIds: inputRow.candidateDuplicateIds ?? handoffRow.candidateDuplicateIds ?? '',
    officialFailureReasons: inputRow.officialFailureReasons ?? handoffRow.officialFailureReasons ?? '',
    riskFlags: inputRow.riskFlags ?? handoffRow.riskFlags ?? '',
  };
});

const assignedBlockIds = new Set();
const worksets = WORKSET_DEFINITIONS.map((definition) => {
  const worksetRows = rows.filter((row) => definition.accepts(row));
  worksetRows.forEach((row) => assignedBlockIds.add(row.blockId));
  if (worksetRows.length !== definition.expectedRows) {
    blockers.push(`${definition.id}_ROW_COUNT_MISMATCH:${worksetRows.length}:${definition.expectedRows}`);
  }
  return {
    id: definition.id,
    slug: definition.slug,
    title: definition.title,
    description: definition.description,
    operatorFocus: definition.operatorFocus,
    expectedRows: definition.expectedRows,
    rows: worksetRows,
    rowCount: worksetRows.length,
    waitingForOperatorRows: worksetRows.filter((row) => row.missingApprovalFields.length > 0).length,
    approvedRows: worksetRows.filter((row) => row.decision === 'APPROVED' && row.missingApprovalFields.length === 0).length,
  };
});
const unassignedRows = rows.filter((row) => !assignedBlockIds.has(row.blockId));
if (unassignedRows.length > 0) blockers.push(`P2_WORKSET_UNASSIGNED_ROWS:${unassignedRows.map((row) => row.block).join(' ')}`);

if (handoff.summary?.status === 'waiting-for-prior-batch-and-operator') {
  warnings.push('P2_WORKSETS_WAITING_FOR_P1_POSTWRITE_AND_OPERATOR_APPROVALS');
}
if (rows.every((row) => row.missingApprovalFields.length > 0)) {
  warnings.push('P2_WORKSETS_OPERATOR_APPROVAL_REQUIRED_FOR_ALL_ROWS');
}

const summary = {
  worksetsVersion: WORKSETS_VERSION,
  status: blockers.length > 0 ? 'blocked' : 'ready-for-operator-worksets',
  targetBatchId: TARGET_BATCH_ID,
  totalRows: rows.length,
  p2aRows: worksets.find((workset) => workset.id === 'P2-A')?.rowCount ?? 0,
  p2bRows: worksets.find((workset) => workset.id === 'P2-B')?.rowCount ?? 0,
  p2cRows: worksets.find((workset) => workset.id === 'P2-C')?.rowCount ?? 0,
  p2dRows: worksets.find((workset) => workset.id === 'P2-D')?.rowCount ?? 0,
  waitingForOperatorRows: rows.filter((row) => row.missingApprovalFields.length > 0).length,
  approvedRows: rows.filter((row) => row.decision === 'APPROVED' && row.missingApprovalFields.length === 0).length,
  sourceHandoff: path.relative(frontendRoot, handoffPath),
  sourceInput: path.relative(frontendRoot, inputPath),
  handoffStatus: handoff.summary?.status ?? '',
  p1PostwriteStatus: handoff.summary?.p1PostwriteStatus ?? '',
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesSourceInput: false,
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
    'This workset split is read-only.',
    'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
    'It never writes source input or the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'candidatePath and candidateLabel are reference-only and must not be copied into corrected fields without explicit operator approval.',
    'P2 production write remains blocked until P1 boundary-first postwrite is verified and P2 approvals pass readiness.',
  ],
  worksets,
  unassignedRows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-worksets.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-worksets.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-worksets.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'workset',
    'stage',
    'block',
    'blockId',
    'decision',
    'missingApprovalFields',
    'correctedPathBlank',
    'candidatePathPointCount',
    'minCorrectedPathPoints',
    'evidenceCrop',
    'riskFlags',
  ],
  ...worksets.flatMap((workset) => workset.rows.map((row) => [
    workset.id,
    row.stage,
    row.block,
    row.blockId,
    row.decision,
    row.missingApprovalFields.join(' '),
    row.correctedPathBlank,
    row.candidatePathPointCount,
    row.minCorrectedPathPoints,
    row.evidenceCrop,
    row.riskFlags,
  ])),
]);

const writeWorksetArtifacts = async (workset) => {
  const worksetJsonPath = path.join(outputDir, `daegu-seatmap-${workset.slug}-handoff.json`);
  const worksetCsvPath = path.join(outputDir, `daegu-seatmap-${workset.slug}-handoff.csv`);
  const worksetMarkdownPath = path.join(outputDir, `daegu-seatmap-${workset.slug}-handoff.md`);
  const worksetReport = {
    generatedAt: report.generatedAt,
    worksetsVersion: WORKSETS_VERSION,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    id: workset.id,
    title: workset.title,
    description: workset.description,
    operatorFocus: workset.operatorFocus,
    expectedRows: workset.expectedRows,
    rowCount: workset.rowCount,
    waitingForOperatorRows: workset.waitingForOperatorRows,
    approvedRows: workset.approvedRows,
    rows: workset.rows,
  };
  await fs.writeFile(worksetJsonPath, `${JSON.stringify(worksetReport, null, 2)}\n`, 'utf8');
  await writeCsv(worksetCsvPath, [
    [
      'block',
      'blockId',
      'stage',
      'decision',
      'missingApprovalFields',
      'candidateReferenceOnly',
      'currentLabel',
      'candidateLabel',
      'candidatePathPointCount',
      'minCorrectedPathPoints',
      'evidenceCrop',
      'officialFailureReasons',
      'riskFlags',
    ],
    ...workset.rows.map((row) => [
      row.block,
      row.blockId,
      row.stage,
      row.decision,
      row.missingApprovalFields.join(' '),
      row.candidateReferenceOnly,
      row.currentLabel,
      row.candidateLabel,
      row.candidatePathPointCount,
      row.minCorrectedPathPoints,
      row.evidenceCrop,
      row.officialFailureReasons,
      row.riskFlags,
    ]),
  ]);
  await fs.writeFile(worksetMarkdownPath, [
    `# Daegu ${workset.title}`,
    '',
    `- worksets version: \`${WORKSETS_VERSION}\``,
    `- rows: ${workset.rowCount}/${workset.expectedRows}`,
    `- waiting for operator: ${workset.waitingForOperatorRows}`,
    `- approved rows: ${workset.approvedRows}`,
    `- production write allowed: \`false\``,
    '',
    '## Operator Focus',
    '',
    workset.operatorFocus,
    '',
    '## Safety',
    '',
    '- Read-only handoff.',
    '- Candidate/current paths are reference-only.',
    '- Approval requires `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, and `reviewedAt`.',
    '- Manual retrace rows require a fresh corrected polygon with at least six points.',
    '',
    '## Rows',
    '',
    markdownTable(
      ['block', 'decision', 'missing fields', 'corrected path blank', 'candidate points', 'min points', 'evidence', 'risk flags'],
      workset.rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.decision}\``,
        row.missingApprovalFields.map((field) => `\`${field}\``).join(' ') || '-',
        String(row.correctedPathBlank),
        row.candidatePathPointCount,
        row.minCorrectedPathPoints,
        `\`${row.evidenceCrop}\``,
        row.riskFlags || '-',
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
for (const workset of worksets) {
  worksetArtifacts.push(await writeWorksetArtifacts(workset));
}
report.worksetArtifacts = worksetArtifacts;
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

await fs.writeFile(markdownPath, [
  '# Daegu P2 Operator Worksets',
  '',
  `- worksets version: \`${WORKSETS_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- P2-A label/hit: ${summary.p2aRows}`,
  `- P2-B visual approval: ${summary.p2bRows}`,
  `- P2-C SKY/U manual retrace: ${summary.p2cRows}`,
  `- P2-D outfield manual retrace: ${summary.p2dRows}`,
  `- handoff status: \`${summary.handoffStatus}\``,
  `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Worksets',
  '',
  markdownTable(
    ['workset', 'rows', 'waiting', 'approved', 'artifact'],
    worksets.map((workset) => {
      const artifact = worksetArtifacts.find((item) => item.id === workset.id);
      return [
        `\`${workset.id}\` ${workset.title}`,
        `${workset.rowCount}/${workset.expectedRows}`,
        workset.waitingForOperatorRows,
        workset.approvedRows,
        artifact ? `\`${artifact.markdown}\`` : '-',
      ];
    }),
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

console.log(`p2_operator_worksets_json:${jsonPath}`);
console.log(`p2_operator_worksets_csv:${csvPath}`);
console.log(`p2_operator_worksets_markdown:${markdownPath}`);
console.log(`status:${summary.status} p2a=${summary.p2aRows} p2b=${summary.p2bRows} p2c=${summary.p2cRows} p2d=${summary.p2dRows} waiting=${summary.waitingForOperatorRows}/${summary.totalRows}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
