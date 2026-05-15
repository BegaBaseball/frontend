import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

const POST_ENTRY_QA_VERSION = 'DAEGU_P2_OPERATOR_POST_ENTRY_QA_V1';
const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
const ENTRY_SHEET_VERSION = 'DAEGU_P2_OPERATOR_ENTRY_SHEET_V1';
const TRACING_PACK_VERSION = 'DAEGU_P2_OPERATOR_TRACING_PACK_V1';
const PREFLIGHT_VERSION = 'DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1';
const HANDOFF_VERSION = 'DAEGU_P2_OPERATOR_HANDOFF_V1';
const TARGET_BATCH_ID = 'BATCH_3_P2';
const EXPECTED = {
  totalRows: 36,
  p2aRows: 2,
  p2bRows: 1,
  p2cRows: 5,
  p2dRows: 28,
};
const ACTIONS = {
  fillRequiredFields: 'FILL_REQUIRED_FIELDS',
  retraceFromOfficialPng: 'RETRACE_FROM_OFFICIAL_PNG',
  moveLabelPoint: 'MOVE_LABEL_POINT',
  reviewLabelTopHit: 'REVIEW_LABEL_TOP_HIT',
  doNotCopyReferencePath: 'DO_NOT_COPY_REFERENCE_PATH',
  runWorksetPreflight: 'RUN_WORKSET_PREFLIGHT',
  waitForP1Postwrite: 'WAIT_FOR_P1_POSTWRITE',
};
const BLOCKERS = {
  approvedRowMissingFields: 'APPROVED_ROW_MISSING_FIELDS',
  correctedPathReusesCurrentPath: 'CORRECTED_PATH_REUSES_CURRENT_PATH',
  correctedPathReusesCandidatePath: 'CORRECTED_PATH_REUSES_CANDIDATE_PATH',
  correctedPathRequiresAtLeastSixPoints: 'CORRECTED_PATH_REQUIRES_AT_LEAST_SIX_POINTS',
  correctedLabelXyNotNumeric: 'CORRECTED_LABEL_XY_NOT_NUMERIC',
  evidenceCropMissing: 'EVIDENCE_CROP_MISSING',
  tracingSvgMissing: 'TRACING_SVG_MISSING',
  worksetAssignmentMismatch: 'WORKSET_ASSIGNMENT_MISMATCH',
};

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

const isBlank = (value) => String(value ?? '').trim() === '';
const isNumeric = (value) => !isBlank(value) && Number.isFinite(Number(value));
const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';
const normalizePath = (value) => String(value ?? '').trim().replace(/\s+/gu, ' ').toUpperCase();
const svgPathPointCount = (value) => {
  const numbers = String(value ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/giu) ?? [];
  return Math.floor(numbers.length / 2);
};

const addUnique = (items, value) => {
  if (!items.includes(value)) items.push(value);
};

const requiredFieldBlockers = (row) => {
  const missing = [];
  if (isBlank(row.correctedPath)) missing.push('correctedPath');
  if (!isNumeric(row.correctedLabelX) || !isNumeric(row.correctedLabelY)) missing.push('correctedLabelX/Y');
  if (isBlank(row.reviewer)) missing.push('reviewer');
  if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
  return missing;
};

const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
const inputPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');
const entrySheetPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-entry-sheet.json');
const preflightPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-workset-preflight.json');
const tracingPackPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-tracing-pack/daegu-seatmap-p2-operator-tracing-pack.json');
const handoffPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-handoff.json');

const input = await readJson(inputPath);
const entrySheet = await readJson(entrySheetPath);
const preflight = await readJson(preflightPath);
const tracingPack = await readJson(tracingPackPath);
const handoff = await readJson(handoffPath);
const structuralBlockers = [];

if (input.packageVersion !== PACKAGE_VERSION) structuralBlockers.push(`P2_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
if (input.targetBatchId !== TARGET_BATCH_ID) structuralBlockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (input.productionWriteAllowed !== false) structuralBlockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) structuralBlockers.push(`P2_ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
if (preflight.summary?.preflightVersion !== PREFLIGHT_VERSION) structuralBlockers.push(`P2_PREFLIGHT_VERSION_MISMATCH:${preflight.summary?.preflightVersion ?? ''}`);
if (tracingPack.summary?.tracingPackVersion !== TRACING_PACK_VERSION) structuralBlockers.push(`P2_TRACING_PACK_VERSION_MISMATCH:${tracingPack.summary?.tracingPackVersion ?? ''}`);
if (handoff.summary?.handoffVersion !== HANDOFF_VERSION) structuralBlockers.push(`P2_HANDOFF_VERSION_MISMATCH:${handoff.summary?.handoffVersion ?? ''}`);
if (entrySheet.summary?.productionWriteAllowed !== false) structuralBlockers.push('P2_ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (preflight.summary?.productionWriteAllowed !== false) structuralBlockers.push('P2_PREFLIGHT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (tracingPack.summary?.productionWriteAllowed !== false) structuralBlockers.push('P2_TRACING_PACK_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (handoff.summary?.productionWriteAllowed !== false) structuralBlockers.push('P2_HANDOFF_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const entryRows = (Array.isArray(entrySheet.worksets) ? entrySheet.worksets : [])
  .flatMap((workset) => (Array.isArray(workset.rows) ? workset.rows : []));
const preflightRows = Array.isArray(preflight.rows) ? preflight.rows : [];
const tracingRows = Array.isArray(tracingPack.rows) ? tracingPack.rows : [];

if (inputRows.length !== EXPECTED.totalRows) structuralBlockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.totalRows}`);
if (entryRows.length !== EXPECTED.totalRows) structuralBlockers.push(`P2_ENTRY_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED.totalRows}`);
if (preflightRows.length !== EXPECTED.totalRows) structuralBlockers.push(`P2_PREFLIGHT_ROW_COUNT_MISMATCH:${preflightRows.length}:${EXPECTED.totalRows}`);
if (tracingRows.length !== EXPECTED.totalRows) structuralBlockers.push(`P2_TRACING_ROW_COUNT_MISMATCH:${tracingRows.length}:${EXPECTED.totalRows}`);

const entryByBlockId = new Map(entryRows.map((row) => [row.blockId, row]));
const preflightByBlockId = new Map(preflightRows.map((row) => [row.blockId, row]));
const tracingByBlockId = new Map(tracingRows.map((row) => [row.blockId, row]));
const p1PostwriteStatus = handoff.summary?.p1PostwriteStatus ?? '';
const p1PostwriteVerified = p1PostwriteStatus === 'postwrite-verified';

const rows = [];
for (const inputRow of inputRows) {
  const entryRow = entryByBlockId.get(inputRow.blockId) ?? {};
  const preflightRow = preflightByBlockId.get(inputRow.blockId) ?? {};
  const tracingRow = tracingByBlockId.get(inputRow.blockId) ?? {};
  const decision = normalizeDecision(inputRow.operatorDecision);
  const approved = decision === 'APPROVED';
  const blockers = [];
  const actions = [];
  const warnings = [];
  const correctedPathPointCount = svgPathPointCount(inputRow.correctedPath);
  const missingFields = approved ? requiredFieldBlockers(inputRow) : [];
  const evidenceCrop = inputRow.evidenceCrop ?? entryRow.evidenceCrop ?? tracingRow.evidenceCrop ?? '';
  const tracingSvg = tracingRow.tracingSvg ?? '';
  const evidenceCropExists = evidenceCrop
    ? await fileExists(path.resolve(frontendRoot, evidenceCrop))
    : false;
  const tracingSvgExists = tracingSvg
    ? await fileExists(path.resolve(frontendRoot, tracingSvg))
    : false;

  if (entryRow.workset && preflightRow.workset && entryRow.workset !== preflightRow.workset) {
    blockers.push(`${BLOCKERS.worksetAssignmentMismatch}:entry:${entryRow.workset}:preflight:${preflightRow.workset}`);
  }
  if (entryRow.workset && tracingRow.workset && entryRow.workset !== tracingRow.workset) {
    blockers.push(`${BLOCKERS.worksetAssignmentMismatch}:entry:${entryRow.workset}:tracing:${tracingRow.workset}`);
  }
  if (approved && missingFields.length > 0) {
    blockers.push(`${BLOCKERS.approvedRowMissingFields}:${missingFields.join('+')}`);
    addUnique(actions, ACTIONS.fillRequiredFields);
  }
  if (approved && (!isNumeric(inputRow.correctedLabelX) || !isNumeric(inputRow.correctedLabelY))) {
    blockers.push(BLOCKERS.correctedLabelXyNotNumeric);
    addUnique(actions, ACTIONS.moveLabelPoint);
  }
  if (approved && correctedPathPointCount < 6) {
    blockers.push(`${BLOCKERS.correctedPathRequiresAtLeastSixPoints}:${correctedPathPointCount}:6`);
    addUnique(actions, ACTIONS.retraceFromOfficialPng);
  }
  if (approved && !isBlank(inputRow.correctedPath) && normalizePath(inputRow.correctedPath) === normalizePath(inputRow.currentPath)) {
    blockers.push(BLOCKERS.correctedPathReusesCurrentPath);
    addUnique(actions, ACTIONS.doNotCopyReferencePath);
    addUnique(actions, ACTIONS.retraceFromOfficialPng);
  }
  if (approved && !isBlank(inputRow.correctedPath) && normalizePath(inputRow.correctedPath) === normalizePath(inputRow.candidatePath)) {
    blockers.push(BLOCKERS.correctedPathReusesCandidatePath);
    addUnique(actions, ACTIONS.doNotCopyReferencePath);
    addUnique(actions, ACTIONS.retraceFromOfficialPng);
  }
  if (approved && !evidenceCropExists) {
    blockers.push(BLOCKERS.evidenceCropMissing);
    addUnique(actions, ACTIONS.retraceFromOfficialPng);
  }
  if (approved && !tracingSvgExists) {
    blockers.push(BLOCKERS.tracingSvgMissing);
    addUnique(actions, ACTIONS.runWorksetPreflight);
  }
  if (approved && entryRow.workset === 'P2-A') {
    warnings.push('LABEL_TOP_HIT_REQUIRES_OPERATOR_QA');
    addUnique(actions, ACTIONS.reviewLabelTopHit);
  }
  if (approved && !p1PostwriteVerified) {
    addUnique(actions, ACTIONS.waitForP1Postwrite);
  }
  if (approved && (preflightRow.blockers ?? []).length > 0) {
    addUnique(actions, ACTIONS.runWorksetPreflight);
  }
  if (!approved) {
    addUnique(actions, ACTIONS.fillRequiredFields);
  }

  rows.push({
    workset: entryRow.workset ?? preflightRow.workset ?? tracingRow.workset ?? 'UNASSIGNED',
    block: inputRow.block,
    blockId: inputRow.blockId,
    name: inputRow.name,
    editableTarget: entryRow.editableTarget ?? '',
    decision,
    rowStatus: blockers.length > 0
      ? 'blocked-after-entry'
      : approved
        ? 'approved-post-entry-qa-passed'
        : 'waiting-for-operator-entry',
    approved,
    blockers,
    warnings,
    actions,
    correctedPathPointCount,
    minCorrectedPathPoints: 6,
    correctedLabelX: inputRow.correctedLabelX ?? '',
    correctedLabelY: inputRow.correctedLabelY ?? '',
    reviewer: inputRow.reviewer ?? '',
    reviewedAt: inputRow.reviewedAt ?? '',
    evidenceCrop,
    evidenceCropExists,
    tracingSvg,
    tracingSvgExists,
    entryWorkset: entryRow.workset ?? '',
    preflightWorkset: preflightRow.workset ?? '',
    tracingWorkset: tracingRow.workset ?? '',
    preflightStatus: preflightRow.rowStatus ?? '',
    p1PostwriteStatus,
  });
}

const worksetSummaries = ['P2-A', 'P2-B', 'P2-C', 'P2-D'].map((workset) => {
  const worksetRows = rows.filter((row) => row.workset === workset);
  const expectedRows = EXPECTED[`${workset.toLowerCase().replace('-', '')}Rows`];
  return {
    workset,
    expectedRows,
    rowCount: worksetRows.length,
    approvedRows: worksetRows.filter((row) => row.approved).length,
    waitingRows: worksetRows.filter((row) => !row.approved).length,
    blockedRows: worksetRows.filter((row) => row.blockers.length > 0).length,
  };
});
for (const worksetSummary of worksetSummaries) {
  if (worksetSummary.rowCount !== worksetSummary.expectedRows) {
    structuralBlockers.push(`${worksetSummary.workset}_POST_ENTRY_ROW_COUNT_MISMATCH:${worksetSummary.rowCount}:${worksetSummary.expectedRows}`);
  }
}

const approvedRows = rows.filter((row) => row.approved);
const blockedRows = rows.filter((row) => row.blockers.length > 0);
const allBlockers = [
  ...structuralBlockers,
  ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.block}:${blocker}`)),
];
const status = allBlockers.length > 0
  ? 'blocked-after-entry'
  : approvedRows.length === 0
    ? 'waiting-for-operator-entry'
    : !p1PostwriteVerified
      ? 'waiting-for-p1-postwrite'
      : 'ready-for-p2-readiness';

const summary = {
  postEntryQaVersion: POST_ENTRY_QA_VERSION,
  status,
  targetBatchId: TARGET_BATCH_ID,
  sourceInput: path.relative(frontendRoot, inputPath),
  sourceEntrySheet: path.relative(frontendRoot, entrySheetPath),
  sourcePreflight: path.relative(frontendRoot, preflightPath),
  sourceTracingPack: path.relative(frontendRoot, tracingPackPath),
  sourceHandoff: path.relative(frontendRoot, handoffPath),
  totalRows: rows.length,
  approvedRows: approvedRows.length,
  waitingForOperatorRows: rows.filter((row) => !row.approved).length,
  blockedRows: blockedRows.length,
  p1PostwriteStatus,
  p1PostwriteVerified,
  readyForP2Readiness: status === 'ready-for-p2-readiness',
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesSourceInput: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers: allBlockers,
  warnings: [...new Set(rows.flatMap((row) => row.warnings))],
  actions: [...new Set(rows.flatMap((row) => row.actions))],
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  actionCatalog: ACTIONS,
  safetyContract: [
    'This post-entry QA is read-only.',
    'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
    'It never writes source input or the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'APPROVED rows must not copy currentPath or candidatePath into correctedPath.',
    'Evidence crop and tracing SVG must exist before a row can advance.',
    'P2 production write waits for P1 boundary-first postwrite verification.',
  ],
  worksets: worksetSummaries,
  rows,
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-post-entry-qa.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-post-entry-qa.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-post-entry-qa.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'workset',
    'block',
    'blockId',
    'decision',
    'rowStatus',
    'blockers',
    'actions',
    'correctedPathPointCount',
    'evidenceCropExists',
    'tracingSvgExists',
    'p1PostwriteStatus',
    'editableTarget',
  ],
  ...rows.map((row) => [
    row.workset,
    row.block,
    row.blockId,
    row.decision,
    row.rowStatus,
    row.blockers.join(' '),
    row.actions.join(' '),
    row.correctedPathPointCount,
    row.evidenceCropExists,
    row.tracingSvgExists,
    row.p1PostwriteStatus,
    row.editableTarget,
  ]),
]);

await fs.writeFile(markdownPath, [
  '# Daegu P2 Operator Post-Entry QA',
  '',
  `- post-entry QA version: \`${POST_ENTRY_QA_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- approved rows: ${summary.approvedRows}`,
  `- waiting for operator: ${summary.waitingForOperatorRows}`,
  `- blocked rows: ${summary.blockedRows}`,
  `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
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
  '## Worksets',
  '',
  markdownTable(
    ['workset', 'rows', 'approved', 'waiting', 'blocked'],
    worksetSummaries.map((workset) => [
      `\`${workset.workset}\``,
      `${workset.rowCount}/${workset.expectedRows}`,
      workset.approvedRows,
      workset.waitingRows,
      workset.blockedRows,
    ]),
  ),
  '',
  '## Rows',
  '',
  markdownTable(
    ['workset', 'block', 'decision', 'status', 'blockers', 'actions', 'evidence', 'tracing svg'],
    rows.map((row) => [
      `\`${row.workset}\``,
      `\`${row.block}\``,
      `\`${row.decision}\``,
      `\`${row.rowStatus}\``,
      row.blockers.map((blocker) => `\`${blocker}\``).join(' ') || '-',
      row.actions.map((action) => `\`${action}\``).join(' ') || '-',
      String(row.evidenceCropExists),
      String(row.tracingSvgExists),
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

console.log(`p2_operator_post_entry_qa_json:${jsonPath}`);
console.log(`p2_operator_post_entry_qa_csv:${csvPath}`);
console.log(`p2_operator_post_entry_qa_markdown:${markdownPath}`);
console.log(`status:${summary.status} approved=${summary.approvedRows} waiting=${summary.waitingForOperatorRows}/${summary.totalRows} blocked=${summary.blockedRows} p1Postwrite=${summary.p1PostwriteStatus || 'missing'}`);

if (summary.status === 'blocked-after-entry') {
  process.exitCode = 1;
}
