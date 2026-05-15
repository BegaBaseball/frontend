import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

const P2A_POST_ENTRY_QA_VERSION = 'DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1';
const POST_ENTRY_QA_VERSION = 'DAEGU_P2_OPERATOR_POST_ENTRY_QA_V1';
const TARGET_BATCH_ID = 'BATCH_3_P2';
const TARGET_WORKSET = 'P2-A';
const EXPECTED_P2A_ROWS = 2;
const ACTIONS = {
  fillRequiredFields: 'FILL_REQUIRED_FIELDS',
  reviewLabelTopHit: 'REVIEW_LABEL_TOP_HIT',
  runP2PostEntryQa: 'RUN_P2_POST_ENTRY_QA',
  waitForP1Postwrite: 'WAIT_FOR_P1_POSTWRITE',
  continueP2FullReadiness: 'CONTINUE_P2_FULL_READINESS',
};

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
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

const readJsonReport = async (filePath) => {
  try {
    return {
      path: filePath,
      relativePath: path.relative(frontendRoot, filePath),
      exists: true,
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: '',
    };
  } catch (error) {
    return {
      path: filePath,
      relativePath: path.relative(frontendRoot, filePath),
      exists: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const addUnique = (items, value) => {
  if (!items.includes(value)) items.push(value);
};

const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
const postEntryQaPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-post-entry-qa.json');

const postEntryQa = await readJsonReport(postEntryQaPath);
const postEntrySummary = postEntryQa.data?.summary ?? {};
const sourceRows = Array.isArray(postEntryQa.data?.rows) ? postEntryQa.data.rows : [];
const structuralBlockers = [];

if (!postEntryQa.exists) structuralBlockers.push(`MISSING_REPORT:${postEntryQa.relativePath}`);
if (postEntryQa.exists && postEntrySummary.postEntryQaVersion !== POST_ENTRY_QA_VERSION) {
  structuralBlockers.push(`POST_ENTRY_QA_VERSION_MISMATCH:${postEntrySummary.postEntryQaVersion ?? ''}`);
}
if (postEntryQa.exists && postEntrySummary.targetBatchId !== TARGET_BATCH_ID) {
  structuralBlockers.push(`POST_ENTRY_QA_BATCH_MISMATCH:${postEntrySummary.targetBatchId ?? ''}`);
}
if (postEntryQa.exists && postEntrySummary.productionWriteAllowed !== false) {
  structuralBlockers.push('POST_ENTRY_QA_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
}
if (postEntryQa.exists && postEntrySummary.writesSourceInput !== false) {
  structuralBlockers.push('POST_ENTRY_QA_WRITES_SOURCE_INPUT_NOT_FALSE');
}
if (postEntryQa.exists && postEntrySummary.writesCorrectionsTemplate !== false) {
  structuralBlockers.push('POST_ENTRY_QA_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
}
if (postEntryQa.exists && postEntrySummary.writesProductionData !== false) {
  structuralBlockers.push('POST_ENTRY_QA_WRITES_PRODUCTION_DATA_NOT_FALSE');
}

const p2aRows = sourceRows
  .filter((row) => row.workset === TARGET_WORKSET)
  .map((row) => {
    const actions = Array.isArray(row.actions) ? [...row.actions] : [];
    const warnings = Array.isArray(row.warnings) ? [...row.warnings] : [];
    addUnique(actions, ACTIONS.reviewLabelTopHit);
    if (row.approved !== true) addUnique(actions, ACTIONS.fillRequiredFields);
    if (row.approved === true && row.p1PostwriteStatus !== 'postwrite-verified') {
      addUnique(actions, ACTIONS.waitForP1Postwrite);
    }
    if (row.approved === true && row.p1PostwriteStatus === 'postwrite-verified') {
      addUnique(actions, ACTIONS.continueP2FullReadiness);
    }
    addUnique(warnings, 'P2A_LABEL_TOP_HIT_OPERATOR_QA_REQUIRED');

    return {
      ...row,
      subset: TARGET_WORKSET,
      requiresLabelTopHitQa: true,
      actions,
      warnings,
      nextAction: row.approved === true
        ? row.p1PostwriteStatus === 'postwrite-verified'
          ? ACTIONS.continueP2FullReadiness
          : ACTIONS.waitForP1Postwrite
        : ACTIONS.fillRequiredFields,
    };
  });

if (p2aRows.length !== EXPECTED_P2A_ROWS) {
  structuralBlockers.push(`P2A_ROW_COUNT_MISMATCH:${p2aRows.length}:${EXPECTED_P2A_ROWS}`);
}

const approvedRows = p2aRows.filter((row) => row.approved);
const waitingRows = p2aRows.filter((row) => !row.approved);
const blockedRows = p2aRows.filter((row) => Array.isArray(row.blockers) && row.blockers.length > 0);
const p1PostwriteStatus = postEntrySummary.p1PostwriteStatus ?? '';
const p1PostwriteVerified = p1PostwriteStatus === 'postwrite-verified';
const allBlockers = [
  ...structuralBlockers,
  ...p2aRows.flatMap((row) => (row.blockers ?? []).map((blocker) => `${row.block}:${blocker}`)),
];

const status = allBlockers.length > 0
  ? 'blocked-after-entry'
  : approvedRows.length < EXPECTED_P2A_ROWS
    ? 'waiting-for-operator-entry'
    : !p1PostwriteVerified
      ? 'waiting-for-p1-postwrite'
      : 'ready-for-p2-readiness';

const summary = {
  p2aPostEntryQaVersion: P2A_POST_ENTRY_QA_VERSION,
  upstreamPostEntryQaVersion: postEntrySummary.postEntryQaVersion ?? '',
  status,
  targetBatchId: TARGET_BATCH_ID,
  targetWorkset: TARGET_WORKSET,
  sourcePostEntryQa: path.relative(frontendRoot, postEntryQaPath),
  expectedRows: EXPECTED_P2A_ROWS,
  totalRows: p2aRows.length,
  approvedRows: approvedRows.length,
  waitingForOperatorRows: waitingRows.length,
  blockedRows: blockedRows.length,
  p1PostwriteStatus,
  p1PostwriteVerified,
  readyForP2Readiness: status === 'ready-for-p2-readiness',
  readyForProductionWrite: false,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesSourceInput: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers: allBlockers,
  warnings: [...new Set(p2aRows.flatMap((row) => row.warnings ?? []))],
  actions: [...new Set(p2aRows.flatMap((row) => row.actions ?? []))],
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  actionCatalog: ACTIONS,
  safetyContract: [
    'This P2-A post-entry QA is read-only.',
    'It only narrows the existing P2 post-entry QA report to P2-A label/hit rows.',
    'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
    'It never writes source input or the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'P2-A rows require label top-hit operator QA before they can advance.',
    'P2-A approval never bypasses the full P2 readiness gate.',
    'P2 production write waits for P1 boundary-first postwrite verification.',
  ],
  rows: p2aRows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-post-entry-qa.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-post-entry-qa.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-post-entry-qa.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'subset',
    'block',
    'blockId',
    'decision',
    'rowStatus',
    'requiresLabelTopHitQa',
    'blockers',
    'warnings',
    'actions',
    'nextAction',
    'p1PostwriteStatus',
    'editableTarget',
  ],
  ...p2aRows.map((row) => [
    row.subset,
    row.block,
    row.blockId,
    row.decision,
    row.rowStatus,
    row.requiresLabelTopHitQa,
    row.blockers?.join(' ') ?? '',
    row.warnings?.join(' ') ?? '',
    row.actions?.join(' ') ?? '',
    row.nextAction,
    row.p1PostwriteStatus,
    row.editableTarget,
  ]),
]);

await fs.writeFile(markdownPath, [
  '# Daegu P2-A Operator Post-Entry QA',
  '',
  `- P2-A post-entry QA version: \`${P2A_POST_ENTRY_QA_VERSION}\``,
  `- upstream post-entry QA version: \`${summary.upstreamPostEntryQaVersion || 'missing'}\``,
  `- status: \`${summary.status}\``,
  `- workset: \`${summary.targetWorkset}\``,
  `- rows: ${summary.totalRows}/${summary.expectedRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- waiting for operator: ${summary.waitingForOperatorRows}`,
  `- blocked rows: ${summary.blockedRows}`,
  `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
  `- ready for P2 readiness: ${summary.readyForP2Readiness}`,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Action Catalog',
  '',
  ...Object.values(ACTIONS).map((action) => `- \`${action}\``),
  '',
  '## Rows',
  '',
  markdownTable(
    ['block', 'decision', 'status', 'label top-hit QA', 'blockers', 'warnings', 'actions', 'next action'],
    p2aRows.map((row) => [
      `\`${row.block}\``,
      `\`${row.decision}\``,
      `\`${row.rowStatus}\``,
      String(row.requiresLabelTopHitQa),
      row.blockers?.map((blocker) => `\`${blocker}\``).join(' ') || '-',
      row.warnings?.map((warning) => `\`${warning}\``).join(' ') || '-',
      row.actions?.map((action) => `\`${action}\``).join(' ') || '-',
      `\`${row.nextAction}\``,
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

console.log(`p2a_operator_post_entry_qa_json:${jsonPath}`);
console.log(`p2a_operator_post_entry_qa_csv:${csvPath}`);
console.log(`p2a_operator_post_entry_qa_markdown:${markdownPath}`);
console.log(`status:${summary.status} approved=${summary.approvedRows}/${summary.totalRows} blocked=${summary.blockedRows} p1Postwrite=${summary.p1PostwriteStatus || 'missing'}`);

if (summary.status === 'blocked-after-entry') {
  process.exitCode = 1;
}
