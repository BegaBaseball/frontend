import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  pathToPoints,
  validateSeatMapPolygonPathIssues,
} from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');

const INPUT_AID_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_AID_V1';
const REQUIRED_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
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
const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);
const REQUIRED_APPROVAL_FIELDS = [
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
];
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

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const fieldMissing = (value) => value === '' || value === null || value === undefined;

const sorted = (values) => [...values].sort();

const nextActionFor = (rowStatus) => {
  if (rowStatus === 'READY_FOR_PREWRITE') {
    return 'Run npm run stadium:sajik:stage01-prewrite; only this READY_FOR_PREWRITE row may enter patch preview.';
  }
  if (rowStatus === 'INVALID') {
    return 'Fix the listed missing fields, invalid values, or path issues before running prewrite.';
  }
  if (rowStatus === 'REJECTED') {
    return 'No patch preview; keep the rejection note and leave this section out of Stage 01 source patching.';
  }
  if (rowStatus === 'NEEDS_RETRACE') {
    return 'No patch preview; retrace the section and update the corrected fields only after operator approval.';
  }
  if (rowStatus === 'KEEP_CURRENT') {
    return 'No patch preview; keep the current production geometry for this Stage 01 pass.';
  }
  return 'Fill correctedPath, correctedLabelX/Y, reviewer, reviewedAt and APPROVED, or choose REJECTED/NEEDS_RETRACE/KEEP_CURRENT with an operator note.';
};

const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
const inputPath = path.resolve(
  frontendRoot,
  argValue('--input', path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json')),
);
const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.json');
const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.csv');
const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.md');

const input = await readJson(inputPath);
const rows = Array.isArray(input.corrections) ? input.corrections : [];
const blockers = [];
const warnings = [];

if (input.packageVersion !== REQUIRED_PACKAGE_VERSION) {
  blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
}
if (input.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`INPUT_STAGE_MISMATCH:${input.targetStage ?? ''}`);
}
if (rows.length !== EXPECTED_STAGE01_ROWS) {
  blockers.push(`STAGE01_INPUT_ROW_COUNT_MISMATCH:${rows.length}:${EXPECTED_STAGE01_ROWS}`);
}

const rowIds = sorted(rows.map((row) => String(row.sectionId ?? '').trim()));
const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
if (rowIds.join(',') !== expectedIds.join(',')) {
  blockers.push(`STAGE01_INPUT_SECTION_IDS_MISMATCH:${rowIds.join(' ')}:${expectedIds.join(' ')}`);
}

const duplicateIds = rowIds.filter((sectionId, index, sectionIds) => sectionIds.indexOf(sectionId) !== index);
if (duplicateIds.length > 0) {
  blockers.push(`DUPLICATE_STAGE01_SECTION_ID:${[...new Set(duplicateIds)].join(' ')}`);
}

const rowReports = rows.map((row) => {
  const sectionId = String(row.sectionId ?? '').trim();
  const decision = normalizeDecision(row.operatorDecision);
  const correctedLabelX = numberOrNull(row.correctedLabelX);
  const correctedLabelY = numberOrNull(row.correctedLabelY);
  const reasons = [];
  const rowWarnings = [];
  const missingFields = [];

  if (!DECISION_OPTIONS.has(decision)) {
    reasons.push(`INVALID_OPERATOR_DECISION:${decision}`);
  }
  if (row.sectionKind !== 'SEAT_SECTION') {
    reasons.push(`SECTION_KIND_NOT_WRITABLE:${row.sectionKind ?? ''}`);
  }
  if (row.mapInteractionStatus !== 'MAP_SELECTABLE') {
    reasons.push(`SECTION_NOT_MAP_SELECTABLE:${row.mapInteractionStatus ?? ''}`);
  }

  if (decision === 'APPROVED') {
    REQUIRED_APPROVAL_FIELDS.forEach((field) => {
      if (fieldMissing(row[field])) {
        missingFields.push(field);
        reasons.push(`APPROVAL_FIELD_REQUIRED:${field}`);
      }
    });
    if (!fieldMissing(row.correctedLabelX) && correctedLabelX === null) {
      reasons.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelX');
    }
    if (!fieldMissing(row.correctedLabelY) && correctedLabelY === null) {
      reasons.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelY');
    }
    if (row.reviewedAt && Number.isNaN(Date.parse(row.reviewedAt))) {
      reasons.push('REVIEWED_AT_INVALID_DATE');
    }
    if (!fieldMissing(row.correctedPath) && correctedLabelX !== null && correctedLabelY !== null) {
      const issues = validateSeatMapPolygonPathIssues({
        pathData: String(row.correctedPath ?? ''),
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        labelPoint: [correctedLabelX, correctedLabelY],
        labelTolerance: 1,
        sectionId,
        pathKind: 'correctedPath',
      });
      reasons.push(...issues.map((issue) => `CORRECTED_PATH_${issue.code}`));
    }
  }

  if ((decision === 'REJECTED' || decision === 'NEEDS_RETRACE' || decision === 'KEEP_CURRENT') && !String(row.operatorNote ?? '').trim()) {
    rowWarnings.push('DECISION_NOTE_RECOMMENDED');
  }
  if (decision === 'PENDING' && (
    String(row.correctedPath ?? '').trim()
    || !fieldMissing(row.correctedLabelX)
    || !fieldMissing(row.correctedLabelY)
    || String(row.reviewer ?? '').trim()
    || String(row.reviewedAt ?? '').trim()
  )) {
    rowWarnings.push('PENDING_ROW_HAS_EDITABLE_FIELDS');
  }

  const rowStatus = reasons.length > 0
    ? 'INVALID'
    : decision === 'APPROVED'
      ? 'READY_FOR_PREWRITE'
      : decision === 'REJECTED'
        ? 'REJECTED'
        : decision === 'NEEDS_RETRACE'
          ? 'NEEDS_RETRACE'
          : decision === 'KEEP_CURRENT'
            ? 'KEEP_CURRENT'
            : 'PENDING';

  const action = rowStatus === 'READY_FOR_PREWRITE'
    ? 'RUN_PREWRITE'
    : rowStatus === 'INVALID'
      ? 'FIX_OPERATOR_INPUT'
      : rowStatus === 'PENDING'
        ? 'FILL_OR_DECIDE'
        : 'NO_PATCH_PREVIEW';
  const nextAction = nextActionFor(rowStatus);

  return {
    sectionId,
    batchId: row.batchId ?? '',
    zoneId: row.zoneId ?? '',
    sectionName: row.sectionName ?? '',
    seatCategoryLabel: row.seatCategoryLabel ?? '',
    operatorDecision: decision,
    rowStatus,
    action,
    nextAction,
    missingFields,
    correctedPointCount: String(row.correctedPath ?? '').trim() ? pathToPoints(String(row.correctedPath)).length : 0,
    currentHitPath: row.currentHitPath ?? '',
    currentLabelPoint: row.currentLabelPoint ?? [row.currentLabelX ?? null, row.currentLabelY ?? null],
    correctedPath: row.correctedPath ?? '',
    correctedLabelX,
    correctedLabelY,
    reviewer: String(row.reviewer ?? '').trim(),
    reviewedAt: String(row.reviewedAt ?? '').trim(),
    reasons,
    warnings: rowWarnings,
  };
});

rowReports
  .filter((row) => row.rowStatus === 'INVALID')
  .forEach((row) => blockers.push(`INVALID_OPERATOR_INPUT_ROW:${row.sectionId}:${row.reasons.join('|')}`));

rowReports
  .filter((row) => row.warnings.length > 0)
  .forEach((row) => warnings.push(`ROW_WARNING:${row.sectionId}:${row.warnings.join('|')}`));

const approvedRows = rowReports.filter((row) => row.operatorDecision === 'APPROVED');
const readyForPrewriteRows = rowReports.filter((row) => row.rowStatus === 'READY_FOR_PREWRITE');
const pendingRows = rowReports.filter((row) => row.rowStatus === 'PENDING');
const rejectedRows = rowReports.filter((row) => row.rowStatus === 'REJECTED');
const needsRetraceRows = rowReports.filter((row) => row.rowStatus === 'NEEDS_RETRACE');
const keepCurrentRows = rowReports.filter((row) => row.rowStatus === 'KEEP_CURRENT');
const invalidRows = rowReports.filter((row) => row.rowStatus === 'INVALID');
const decidedRows = rowReports.filter((row) => row.operatorDecision !== 'PENDING');

if (approvedRows.length === 0) {
  warnings.push('NO_OPERATOR_APPROVED_STAGE01_ROWS');
}

const status = blockers.length > 0
  ? 'blocked'
  : readyForPrewriteRows.length > 0
    ? 'ready-for-prewrite'
    : decidedRows.length > 0
      ? 'decisions-recorded'
      : 'waiting-for-operator';

const summary = {
  inputAidVersion: INPUT_AID_VERSION,
  status,
  generatedAt: new Date().toISOString(),
  input: path.relative(frontendRoot, inputPath),
  targetStage: TARGET_STAGE_LABEL,
  totalRows: rowReports.length,
  expectedRows: EXPECTED_STAGE01_ROWS,
  approvedRows: approvedRows.length,
  readyForPrewriteRows: readyForPrewriteRows.length,
  pendingRows: pendingRows.length,
  rejectedRows: rejectedRows.length,
  needsRetraceRows: needsRetraceRows.length,
  keepCurrentRows: keepCurrentRows.length,
  invalidRows: invalidRows.length,
  decidedRows: decidedRows.length,
  decisionOptions: [...DECISION_OPTIONS],
  requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
  productionWriteAllowed: false,
  sourceDataWritePerformed: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: summary.generatedAt,
  summary,
  safetyContract: [
    'This script is a read-only Stage 01 operator input aid; it never edits src/data/sajikSeatData.ts.',
    'It validates editable operator fields before prewrite so bad APPROVED rows are visible early.',
    'READY_FOR_PREWRITE rows may proceed to the Stage 01 prewrite gate.',
    'REJECTED and NEEDS_RETRACE rows are decision rows only and do not produce patch previews.',
    'KEEP_CURRENT rows explicitly keep the current production geometry and do not produce patch previews.',
    'External baseball data, web search, crawling, or third-party coordinate sources are not used.',
  ],
  rowStatusLegend: {
    PENDING: 'No operator decision yet.',
    READY_FOR_PREWRITE: 'APPROVED row has the required editable fields and basic path/label validation passed.',
    REJECTED: 'Operator rejected the candidate; no patch preview should be generated.',
    NEEDS_RETRACE: 'Operator requested retracing; no patch preview should be generated.',
    KEEP_CURRENT: 'Operator chose to keep the current production geometry for this Stage 01 pass.',
    INVALID: 'Operator input is malformed and must be fixed before prewrite.',
  },
  nextActionContract: {
    FILL_OR_DECIDE: 'PENDING rows require operator input before prewrite.',
    RUN_PREWRITE: 'Only READY_FOR_PREWRITE rows may enter the Stage 01 prewrite patch preview.',
    FIX_OPERATOR_INPUT: 'INVALID rows must be corrected before prewrite.',
    NO_PATCH_PREVIEW: 'REJECTED, NEEDS_RETRACE, and KEEP_CURRENT rows are decision rows only.',
  },
  rows: rowReports,
};

await fs.mkdir(stageDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'sectionId',
    'batchId',
    'zoneId',
    'operatorDecision',
    'rowStatus',
    'action',
    'nextAction',
    'missingFields',
    'correctedPointCount',
    'reviewer',
    'reviewedAt',
    'reasons',
    'warnings',
  ],
  ...rowReports.map((row) => [
    row.sectionId,
    row.batchId,
    row.zoneId,
    row.operatorDecision,
    row.rowStatus,
    row.action,
    row.nextAction,
    row.missingFields.join('; '),
    row.correctedPointCount,
    row.reviewer,
    row.reviewedAt,
    row.reasons.join('; '),
    row.warnings.join('; '),
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Sajik Stage 01 Operator Input Aid',
  '',
  `- input aid version: \`${INPUT_AID_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- input: \`${summary.input}\``,
  `- rows: \`${summary.totalRows}/${summary.expectedRows}\``,
  `- approved rows: \`${summary.approvedRows}\``,
  `- ready for prewrite rows: \`${summary.readyForPrewriteRows}\``,
  `- pending rows: \`${summary.pendingRows}\``,
  `- rejected rows: \`${summary.rejectedRows}\``,
  `- needs retrace rows: \`${summary.needsRetraceRows}\``,
  `- keep current rows: \`${summary.keepCurrentRows}\``,
  `- invalid rows: \`${summary.invalidRows}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
  '',
  '## Rows',
  '',
  markdownTable(
    ['section', 'batch', 'zone', 'decision', 'row status', 'action', 'next action', 'missing fields', 'points', 'reasons', 'warnings'],
    rowReports.map((row) => [
      `\`${row.sectionId}\``,
      `\`${row.batchId}\``,
      `\`${row.zoneId}\``,
      `\`${row.operatorDecision}\``,
      `\`${row.rowStatus}\``,
      `\`${row.action}\``,
      row.nextAction,
      row.missingFields.join('; ') || '-',
      `\`${row.correctedPointCount}\``,
      row.reasons.join('; ') || '-',
      row.warnings.join('; ') || '-',
    ]),
  ),
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No operator input blockers.',
  '',
  '## Warnings',
  '',
  warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`stage01_operator_input_aid_json:${path.relative(frontendRoot, jsonPath)}`);
console.log(`stage01_operator_input_aid_csv:${path.relative(frontendRoot, csvPath)}`);
console.log(`stage01_operator_input_aid_markdown:${path.relative(frontendRoot, markdownPath)}`);
console.log(`status:${summary.status} ready=${summary.readyForPrewriteRows} approved=${summary.approvedRows} pending=${summary.pendingRows} rejected=${summary.rejectedRows} needsRetrace=${summary.needsRetraceRows} keepCurrent=${summary.keepCurrentRows} invalid=${summary.invalidRows} blockers=${summary.blockers.length}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
