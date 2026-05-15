import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP2ReportDir = path.join(defaultReportDir, 'daegu-p2-draft');
const defaultCropDir = path.join(defaultReportDir, 'daegu-handoff-evidence-crops');

const PACKAGE_VERSION = 'DAEGU_P2_REVIEW_PACKAGE_V1';
const P2_PRIORITY = 'P2';
const DRAFT_REVIEWER = 'DRAFT_VALIDATION_ONLY';
const DRAFT_REVIEWED_AT = '2026-05-10T00:00:00.000Z';
const EXPECTED_P2_COUNTS = {
  total: 50,
  manualRetrace: 34,
  labelAndHit: 2,
  visualApprovalCandidates: 14,
  validApproved: 16,
  invalidApproved: 34,
};

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

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const pointCount = (pathData) => (
  String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.length ?? 0
) / 2;

const runNodeScript = (script, args, expectedExitCodes = [0]) => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
    cwd: frontendRoot,
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const exitCode = result.status ?? 1;
  if (!expectedExitCodes.includes(exitCode)) {
    throw new Error(`${script} exited with ${exitCode}`);
  }

  return {
    script,
    args,
    exitCode,
  };
};

const evidenceCropFor = (row, cropFiles) => {
  const match = cropFiles.find((fileName) => fileName.includes(row.id));
  if (match) return `reports/stadium/daegu-handoff-evidence-crops/${match}`;
  return '';
};

const draftCorrectionFor = (row, cropFiles) => {
  const correctedPath = row.candidateOuterBoundaryPath || row.candidateHullPath || '';
  const correctedLabelX = numberOrNull(row.candidateCenter?.x) ?? numberOrNull(row.labelX) ?? '';
  const correctedLabelY = numberOrNull(row.candidateCenter?.y) ?? numberOrNull(row.labelY) ?? '';

  return {
    blockId: row.id,
    block: row.block,
    name: row.name,
    category: row.category,
    queuePriority: row.queuePriority,
    alignmentClass: row.alignmentClass,
    candidateStatus: row.candidateStatus,
    candidateDuplicateGroup: row.candidateDuplicateGroup || '',
    recommendedAction: row.recommendedAction,
    evidenceCrop: evidenceCropFor(row, cropFiles),
    operatorDecision: 'APPROVED',
    correctedPath,
    correctedLabelX,
    correctedLabelY,
    reviewer: DRAFT_REVIEWER,
    reviewedAt: DRAFT_REVIEWED_AT,
    operatorNote: 'DRAFT ONLY: pixel candidate path validates technically; requires operator visual approval before copying into production template.',
  };
};

const classifyRow = (row, validationRow) => {
  const points = pointCount(row.correctedPath);
  const validationReasons = validationRow?.reasons ?? [];

  if (points < 6 || validationReasons.includes('PATH_REQUIRES_AT_LEAST_SIX_POINTS')) {
    return {
      points,
      action: 'MANUAL_RETRACE_REQUIRED',
      gate: 'BLOCKED_BY_POLYGON_DETAIL_TEST',
    };
  }

  if (row.recommendedAction === 'RETRACE_LABEL_AND_HIT_AREA') {
    return {
      points,
      action: 'LABEL_AND_HIT_AREA_REVIEW',
      gate: 'NEEDS_LABEL_AND_HIT_CONFIRMATION',
    };
  }

  return {
    points,
    action: 'VISUAL_APPROVAL_CANDIDATE',
    gate: 'CAN_MOVE_TO_OPERATOR_TEMPLATE_AFTER_VISUAL_APPROVAL',
  };
};

const toOperatorStagingRow = (row, overrides = {}) => ({
  blockId: row.blockId,
  block: row.block,
  name: row.name,
  category: row.category,
  queuePriority: row.queuePriority,
  alignmentClass: row.alignmentClass,
  candidateStatus: row.candidateStatus,
  candidateDuplicateGroup: row.candidateDuplicateGroup || '',
  recommendedAction: row.recommendedAction,
  requiredOperatorReview: row.action,
  evidenceCrop: row.evidenceCrop,
  operatorDecision: 'PENDING',
  correctedPath: row.correctedPath,
  correctedLabelX: row.correctedLabelX,
  correctedLabelY: row.correctedLabelY,
  reviewer: '',
  reviewedAt: '',
  operatorNote: row.action === 'LABEL_AND_HIT_AREA_REVIEW'
    ? 'Operator must confirm correctedPath, correctedLabelX/Y, and top-hit area before setting APPROVED.'
    : 'Operator must visually approve this candidate before setting APPROVED.',
  ...overrides,
});

const writeCorrectionBundle = async (jsonPath, csvPath, bundle, rows) => {
  await fs.writeFile(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  const header = [
    'blockId',
    'block',
    'name',
    'category',
    'queuePriority',
    'alignmentClass',
    'candidateStatus',
    'candidateDuplicateGroup',
    'recommendedAction',
    'requiredOperatorReview',
    'evidenceCrop',
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  await writeCsv(csvPath, [
    header,
    ...rows.map((row) => header.map((key) => row[key])),
  ]);
};

const assertCount = (label, actual, expected, blockers) => {
  if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const p2ReportDir = path.resolve(frontendRoot, argValue('--p2-report-dir', defaultP2ReportDir));
const cropDir = path.resolve(frontendRoot, argValue('--crop-dir', defaultCropDir));
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');

const handoff = await readJson(handoffPath);
const cropFiles = fsSync.existsSync(cropDir) ? await fs.readdir(cropDir) : [];
const p2Rows = handoff.workItems
  .filter((row) => row.queuePriority === P2_PRIORITY)
  .sort((a, b) => String(a.block).localeCompare(String(b.block), 'ko'));

const corrections = p2Rows.map((row) => draftCorrectionFor(row, cropFiles));
const draft = {
  generatedAt: new Date().toISOString(),
  packageVersion: PACKAGE_VERSION,
  draftOnly: true,
  source: path.relative(frontendRoot, handoffPath),
  warning: 'Do not use for production write until an operator visually approves every row and replaces reviewer/reviewedAt.',
  expectedCurrentPlan: EXPECTED_P2_COUNTS,
  remainingPlan: {
    p2Rows: p2Rows.length,
    closedRowsSinceBaseline: EXPECTED_P2_COUNTS.total - p2Rows.length,
  },
  corrections,
};

await fs.mkdir(p2ReportDir, { recursive: true });
const draftInputPath = path.join(p2ReportDir, 'daegu-seatmap-p2-draft-corrections.json');
await fs.writeFile(draftInputPath, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');

const commandResults = [];
commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections-validate.mjs', [
  '--input',
  path.relative(frontendRoot, draftInputPath),
  '--report-dir',
  path.relative(frontendRoot, p2ReportDir),
  '--handoff',
  path.relative(frontendRoot, handoffPath),
  '--allow-draft-markers',
], [0, 1]));
commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections-preview.mjs', [
  '--input',
  path.relative(frontendRoot, draftInputPath),
  '--validation',
  path.relative(frontendRoot, path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-validation.json')),
  '--report-dir',
  path.relative(frontendRoot, p2ReportDir),
], [0, 1]));
commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections-apply.mjs', [
  '--input',
  path.relative(frontendRoot, draftInputPath),
  '--validation',
  path.relative(frontendRoot, path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-validation.json')),
  '--report-dir',
  path.relative(frontendRoot, p2ReportDir),
], [0, 1]));

const validation = await readJson(path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-validation.json'));
const preview = await readJson(path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-preview.json'));
const apply = await readJson(path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-apply.json'));
const validationByBlockId = new Map((validation.rows ?? []).map((row) => [row.blockId, row]));
const handoffByBlockId = new Map(p2Rows.map((row) => [row.id, row]));

const checklistRows = corrections.map((row) => {
  const handoffRow = handoffByBlockId.get(row.blockId) ?? {};
  const validationRow = validationByBlockId.get(row.blockId);
  const classification = classifyRow(row, validationRow);

  return {
    ...row,
    ...classification,
    validationValid: validationRow?.validForApproval === true,
    validationReasons: (validationRow?.reasons ?? []).join('; '),
    currentLabel: `${handoffRow.labelX},${handoffRow.labelY}`,
    correctedLabel: `${row.correctedLabelX},${row.correctedLabelY}`,
    officialFailureReasons: (handoffRow.officialFailureReasons ?? []).join('; '),
    riskFlags: (handoffRow.riskFlags ?? []).join('; '),
  };
});

const groups = {
  manualRetrace: checklistRows.filter((row) => row.action === 'MANUAL_RETRACE_REQUIRED'),
  labelAndHit: checklistRows.filter((row) => row.action === 'LABEL_AND_HIT_AREA_REVIEW'),
  visualApprovalCandidates: checklistRows.filter((row) => row.action === 'VISUAL_APPROVAL_CANDIDATE'),
};
const approvalCandidateRows = [
  ...groups.labelAndHit,
  ...groups.visualApprovalCandidates,
].map((row) => toOperatorStagingRow(row));
const manualRetraceRows = groups.manualRetrace.map((row) => toOperatorStagingRow(row, {
  correctedPath: '',
  correctedLabelX: '',
  correctedLabelY: '',
  operatorNote: 'Manual retrace required: replace with a new operator-traced official PNG path of at least 6 polygon points before setting APPROVED.',
}));

const blockers = [];
const remainingPlan = {
  baselineP2Rows: EXPECTED_P2_COUNTS.total,
  closedRowsSinceBaseline: EXPECTED_P2_COUNTS.total - checklistRows.length,
  remainingP2Rows: checklistRows.length,
  manualRetraceRequired: groups.manualRetrace.length,
  labelAndHitAreaReview: groups.labelAndHit.length,
  visualApprovalCandidates: groups.visualApprovalCandidates.length,
  validApprovedRows: validation.summary?.validApprovedRows ?? 0,
  invalidApprovedRows: validation.summary?.invalidApprovedRows ?? 0,
};
assertCount(
  'DRAFT_BUCKET_TOTAL',
  groups.manualRetrace.length + groups.labelAndHit.length + groups.visualApprovalCandidates.length,
  checklistRows.length,
  blockers,
);
assertCount(
  'VALIDATION_APPROVED_TOTAL',
  remainingPlan.validApprovedRows + remainingPlan.invalidApprovedRows,
  validation.summary?.approvedRows ?? 0,
  blockers,
);

if (groups.manualRetrace.length > 0) {
  if (validation.summary?.status !== 'failed') blockers.push(`VALIDATION_STATUS:${validation.summary?.status}`);
  if (preview.summary?.status !== 'blocked') blockers.push(`PREVIEW_STATUS:${preview.summary?.status}`);
  if (apply.summary?.status !== 'blocked') blockers.push(`APPLY_STATUS:${apply.summary?.status}`);
} else {
  if (!['ok', 'failed'].includes(validation.summary?.status)) blockers.push(`VALIDATION_STATUS:${validation.summary?.status}`);
}

const summary = {
  packageVersion: PACKAGE_VERSION,
  status: blockers.length > 0 ? 'failed' : 'ok',
  generatedAt: new Date().toISOString(),
  draftInput: path.relative(frontendRoot, draftInputPath),
  expectedP2Counts: EXPECTED_P2_COUNTS,
  remainingPlan,
  p2Rows: checklistRows.length,
  manualRetraceRequired: groups.manualRetrace.length,
  labelAndHitAreaReview: groups.labelAndHit.length,
  visualApprovalCandidates: groups.visualApprovalCandidates.length,
  validationStatus: validation.summary?.status ?? '',
  validApprovedRows: validation.summary?.validApprovedRows ?? 0,
  invalidApprovedRows: validation.summary?.invalidApprovedRows ?? 0,
  previewStatus: preview.summary?.status ?? '',
  previewBlockers: preview.summary?.blockers ?? [],
  applyStatus: apply.summary?.status ?? '',
  applyPlannedRows: apply.summary?.plannedRows ?? 0,
  applyDataFileChanged: apply.summary?.dataFileChanged ?? false,
  blockers,
  commandResults,
};

const checklistCsvHeader = [
  'priority',
  'block',
  'blockId',
  'name',
  'points',
  'action',
  'gate',
  'validationValid',
  'validationReasons',
  'recommendedAction',
  'candidateStatus',
  'candidateDuplicateGroup',
  'currentLabel',
  'correctedLabel',
  'evidenceCrop',
  'officialFailureReasons',
  'riskFlags',
];
const checklistCsvPath = path.join(p2ReportDir, 'daegu-seatmap-p2-review-checklist.csv');
await writeCsv(checklistCsvPath, [
  checklistCsvHeader,
  ...checklistRows.map((row) => checklistCsvHeader.map((key) => row[key])),
]);

const approvalCandidatesJsonPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-approval-candidates.json');
const approvalCandidatesCsvPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-approval-candidates.csv');
await writeCorrectionBundle(
  approvalCandidatesJsonPath,
  approvalCandidatesCsvPath,
  {
    generatedAt: summary.generatedAt,
    packageVersion: PACKAGE_VERSION,
    stagingOnly: true,
    warning: 'These rows are PENDING staging rows, not operator approvals. Copy to the production template only after replacing operatorDecision, reviewer, and reviewedAt with real operator approval values.',
    sourceChecklist: 'reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-checklist.md',
    targetTemplate: 'reports/stadium/daegu-seatmap-operator-corrections-template.json',
    corrections: approvalCandidateRows,
  },
  approvalCandidateRows,
);

const manualRetraceJsonPath = path.join(p2ReportDir, 'daegu-seatmap-p2-manual-retrace-template.json');
const manualRetraceCsvPath = path.join(p2ReportDir, 'daegu-seatmap-p2-manual-retrace-template.csv');
await writeCorrectionBundle(
  manualRetraceJsonPath,
  manualRetraceCsvPath,
  {
    generatedAt: summary.generatedAt,
    packageVersion: PACKAGE_VERSION,
    stagingOnly: true,
    warning: 'These rows intentionally leave correctedPath/correctedLabelX/correctedLabelY blank. Operators must manually retrace before any APPROVED production template row is valid.',
    sourceChecklist: 'reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-checklist.md',
    targetTemplate: 'reports/stadium/daegu-seatmap-operator-corrections-template.json',
    corrections: manualRetraceRows,
  },
  manualRetraceRows,
);

const rowTable = (rows) => markdownTable(
  ['block', 'points', 'validation', 'action', 'gate', 'evidence crop'],
  rows.map((row) => [
    row.block,
    String(row.points),
    row.validationValid ? 'valid' : row.validationReasons || 'invalid',
    row.action,
    row.gate,
    row.evidenceCrop,
  ]),
);

const checklistMarkdownPath = path.join(p2ReportDir, 'daegu-seatmap-p2-review-checklist.md');
await fs.writeFile(checklistMarkdownPath, [
  '# Daegu P2 Operator Review Checklist',
  '',
  `- package version: \`${PACKAGE_VERSION}\``,
  `- generatedAt: \`${summary.generatedAt}\``,
  `- source: \`${summary.draftInput}\``,
  `- validation status: \`${summary.validationStatus}\``,
  `- validation rows: approved=\`${validation.summary?.approvedRows ?? 0}\`, validApproved=\`${summary.validApprovedRows}\`, invalidApproved=\`${summary.invalidApprovedRows}\``,
  `- preview status: \`${summary.previewStatus}\`, blockers=\`${summary.previewBlockers.join(' ') || '-'}\``,
  `- dry-run apply: status=\`${summary.applyStatus}\`, plannedRows=\`${summary.applyPlannedRows}\`, dataFileChanged=\`${summary.applyDataFileChanged}\``,
  '',
  '## Gate Decision',
  '',
  '이 파일은 P2 드래프트 검수용 산출물이며, 운영자 승인을 의미하지 않습니다. 현재 드래프트는 4점 polygon 34건 때문에 validation이 실패해야 정상입니다.',
  '',
  'Promotion rules for this batch:',
  '',
  '1. `MANUAL_RETRACE_REQUIRED` 행은 operator가 새 `correctedPath`를 직접 작성해야 승인할 수 있습니다.',
  '2. `LABEL_AND_HIT_AREA_REVIEW` 행은 path와 label 위치를 둘 다 시각 검수해야 합니다.',
  '3. `VISUAL_APPROVAL_CANDIDATE` 행도 시각 승인 후에만 `reports/stadium/daegu-seatmap-operator-corrections-template.json`으로 옮기며, `DRAFT_VALIDATION_ONLY` 대신 실제 `reviewer` / `reviewedAt`이 필요합니다.',
  '4. write 전에는 `validate -> preview -> dry-run apply -> status` 순서로 다시 통과시키고, `readyForWrite=true`일 때만 write합니다.',
  '',
  '## Summary',
  '',
  markdownTable(
    ['bucket', 'count'],
    [
      ['total P2 rows', String(summary.p2Rows)],
      ['manual retrace required', String(summary.manualRetraceRequired)],
      ['label and hit area review', String(summary.labelAndHitAreaReview)],
      ['visual approval candidates', String(summary.visualApprovalCandidates)],
    ],
  ),
  '',
  '## Manual Retrace Required',
  '',
  rowTable(groups.manualRetrace),
  '',
  '## Label And Hit Area Review',
  '',
  rowTable(groups.labelAndHit),
  '',
  '## Visual Approval Candidates',
  '',
  rowTable(groups.visualApprovalCandidates),
  '',
  '## CSV',
  '',
  'Detailed row data is also available at `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-checklist.csv`.',
  '',
  '## Operator Input Staging Files',
  '',
  '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-operator-approval-candidates.json` contains the 16 technically valid P2 rows as `PENDING`; operators must set real approval fields before production use.',
  '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-manual-retrace-template.json` contains the 34 blocked P2 rows with blank corrected fields for manual retracing.',
  '',
].join('\n'), 'utf8');

const summaryJsonPath = path.join(p2ReportDir, 'daegu-seatmap-p2-review-package.json');
const summaryMarkdownPath = path.join(p2ReportDir, 'daegu-seatmap-p2-review-package.md');
await fs.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
await fs.writeFile(summaryMarkdownPath, [
  '# Daegu P2 Review Package',
  '',
  `- package version: \`${PACKAGE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- p2 rows: ${summary.p2Rows}`,
  `- manual retrace required: ${summary.manualRetraceRequired}`,
  `- label and hit area review: ${summary.labelAndHitAreaReview}`,
  `- visual approval candidates: ${summary.visualApprovalCandidates}`,
  `- validation: \`${summary.validationStatus}\` (${summary.validApprovedRows} valid / ${summary.invalidApprovedRows} invalid)`,
  `- preview: \`${summary.previewStatus}\``,
  `- apply: \`${summary.applyStatus}\``,
  '',
  '## Outputs',
  '',
  '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-draft-corrections.json`',
  '- `reports/stadium/daegu-p2-draft/daegu-seatmap-operator-corrections-validation.md`',
  '- `reports/stadium/daegu-p2-draft/daegu-seatmap-operator-corrections-preview.svg`',
  '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-checklist.md`',
  '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-operator-approval-candidates.json`',
  '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-manual-retrace-template.json`',
  '',
  '## Blockers',
  '',
  blockers.length > 0
    ? markdownTable(['blocker'], blockers.map((blocker) => [blocker]))
    : 'No package blockers. The validation/preview/apply blocked state is expected for the draft package.',
  '',
].join('\n'), 'utf8');

console.log(`p2_review_package_json:${summaryJsonPath}`);
console.log(`p2_review_package_markdown:${summaryMarkdownPath}`);
console.log(`p2_review_checklist_markdown:${checklistMarkdownPath}`);
console.log(`p2_operator_approval_candidates_json:${approvalCandidatesJsonPath}`);
console.log(`p2_manual_retrace_template_json:${manualRetraceJsonPath}`);
console.log(`status:${summary.status} p2=${summary.p2Rows} validApproved=${summary.validApprovedRows} invalidApproved=${summary.invalidApprovedRows}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
