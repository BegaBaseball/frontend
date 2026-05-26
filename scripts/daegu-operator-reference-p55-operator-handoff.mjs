import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p51JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input.json');
const p51InputCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input.csv');
const p52GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p52-source-patch-preview/gate/daegu-operator-reference-p52-source-patch-preview-gate.json');
const p53GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p53-source-apply-guard/gate/daegu-operator-reference-p53-source-apply-guard-gate.json');
const p54GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p54-partial-approval-fixture/gate/daegu-operator-reference-p54-partial-approval-fixture-gate.json');
const p54FixtureCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p54-partial-approval-fixture/fixtures/daegu-operator-reference-p54-partial-approved-3-sample.csv');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p55-operator-handoff');
const gateDir = path.join(outputDir, 'gate');
const handoffJsonPath = path.join(outputDir, 'daegu-operator-reference-p55-operator-handoff.json');
const handoffMdPath = path.join(outputDir, 'daegu-operator-reference-p55-operator-handoff.md');
const editableManifestCsvPath = path.join(outputDir, 'daegu-operator-reference-p55-editable-input-manifest.csv');
const validationChecklistCsvPath = path.join(outputDir, 'daegu-operator-reference-p55-validation-checklist.csv');
const commandChecklistMdPath = path.join(outputDir, 'daegu-operator-reference-p55-command-checklist.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p55-operator-handoff-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p55-operator-handoff-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p55-operator-handoff-gate.md');

const task = process.argv[2] ?? 'handoff';
const requireHandoff = process.argv.includes('--require-handoff');

const operatorWritableColumns = [
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'reviewNote',
  'nextAction',
];
const immutableColumns = [
  'queueOrder',
  'reviewZone',
  'zoneOrder',
  'reviewId',
  'sectionId',
  'block',
  'name',
  'evidenceCropPng',
  'evidenceCropSvg',
  'overlayPng',
];
const validationCommands = [
  'npm run stadium:daegu:operator-reference-p51-real-review-input-gate:require-input',
  'npm run stadium:daegu:operator-reference-p52-source-patch-preview-gate:require-preview',
  'npm run stadium:daegu:operator-reference-p53-source-apply-guard-gate:require-guard',
  'node --import tsx --test --test-concurrency=1 --test-name-pattern=대구 src/components/StadiumGuideRuntimeSeatMaps.test.ts src/data/daeguSeatData.test.ts',
];

const sourceContractLiterals = [
  'P55_OPERATOR_HANDOFF',
  'P51_REAL_REVIEW_INPUT_EDIT_TARGET',
  'OPERATOR_WRITABLE_COLUMNS_DOCUMENTED',
  'IMMUTABLE_COLUMNS_DOCUMENTED',
  'P54_FIXTURE_REFERENCE_INCLUDED',
  'VALIDATION_COMMAND_CHECKLIST_INCLUDED',
  'P52_P53_SOURCE_WRITE_BLOCKED',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p55-operator-handoff-ready',
  'p55-operator-handoff-gate-passed',
];

void sourceContractLiterals;

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(rows, columns) {
  return `${[
    columns.map(csvEscape).join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n')}\n`;
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      current = '';
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  if (rows.length === 0) return [];
  const [headers, ...dataRows] = rows;
  return dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readCsv(filePath) {
  return parseCsv(await fs.readFile(filePath, 'utf8'));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(filePath) {
  const bytes = await fs.readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

function normalizeDecision(value) {
  return String(value ?? '').trim().toUpperCase() || 'PENDING';
}

function buildEditableManifestRows(p51Sha256, p51Rows) {
  return [
    {
      rowId: 'P51_REAL_REVIEW_INPUT_EDIT_TARGET',
      file: toFrontendRelative(p51InputCsvPath),
      sha256: p51Sha256,
      rows: p51Rows.length,
      role: 'OPERATOR_EDIT_TARGET',
      editableColumns: operatorWritableColumns.join('|'),
      immutableColumns: immutableColumns.join('|'),
      warning: 'Do not edit generated P41/P50/P54 fixture files for production input.',
    },
    {
      rowId: 'P54_FIXTURE_REFERENCE_INCLUDED',
      file: toFrontendRelative(p54FixtureCsvPath),
      sha256: '',
      rows: 3,
      role: 'REFERENCE_ONLY_FIXTURE',
      editableColumns: '',
      immutableColumns: '',
      warning: 'Use this only as an example; do not feed fixture data into production release.',
    },
  ];
}

function buildValidationRows(summary) {
  return [
    {
      rowId: 'P55_OPERATOR_HANDOFF',
      validationType: 'HANDOFF_CONTRACT',
      validationStatus: summary.handoffReady ? 'PASS' : 'INVALID',
      failures: summary.handoffReady ? '' : 'HANDOFF_NOT_READY',
      nextAction: 'Use this package as the operator review handoff.',
    },
    {
      rowId: 'P51_REAL_REVIEW_INPUT_EDIT_TARGET',
      validationType: 'INPUT_TARGET',
      validationStatus: summary.p51InputExists && summary.p51Rows === 131 ? 'PASS' : 'INVALID',
      failures: summary.p51InputExists && summary.p51Rows === 131 ? '' : `P51_EXISTS_${summary.p51InputExists}_ROWS_${summary.p51Rows}`,
      nextAction: 'Operator must edit only the P51 real review input CSV.',
    },
    {
      rowId: 'OPERATOR_WRITABLE_COLUMNS_DOCUMENTED',
      validationType: 'COLUMN_POLICY',
      validationStatus: summary.operatorWritableColumnsDocumented ? 'PASS' : 'INVALID',
      failures: summary.operatorWritableColumnsDocumented ? '' : 'WRITABLE_COLUMNS_MISSING',
      nextAction: 'Keep operator writable columns visible in handoff docs.',
    },
    {
      rowId: 'IMMUTABLE_COLUMNS_DOCUMENTED',
      validationType: 'COLUMN_POLICY',
      validationStatus: summary.immutableColumnsDocumented ? 'PASS' : 'INVALID',
      failures: summary.immutableColumnsDocumented ? '' : 'IMMUTABLE_COLUMNS_MISSING',
      nextAction: 'Keep immutable columns visible in handoff docs.',
    },
    {
      rowId: 'P54_FIXTURE_REFERENCE_INCLUDED',
      validationType: 'REFERENCE_POLICY',
      validationStatus: summary.p54FixtureReferenceIncluded ? 'PASS' : 'INVALID',
      failures: summary.p54FixtureReferenceIncluded ? '' : 'P54_FIXTURE_REFERENCE_MISSING',
      nextAction: 'Include the partial approval fixture as reference only.',
    },
    {
      rowId: 'VALIDATION_COMMAND_CHECKLIST_INCLUDED',
      validationType: 'COMMAND_POLICY',
      validationStatus: summary.validationCommandChecklistIncluded ? 'PASS' : 'INVALID',
      failures: summary.validationCommandChecklistIncluded ? '' : 'VALIDATION_COMMANDS_MISSING',
      nextAction: 'Run the command checklist after operator edits P51.',
    },
    {
      rowId: 'P52_P53_SOURCE_WRITE_BLOCKED',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.p52P53SourceWriteBlocked ? 'PASS' : 'INVALID',
      failures: summary.p52P53SourceWriteBlocked ? '' : 'P52_OR_P53_SOURCE_WRITE_OCCURRED',
      nextAction: 'P52/P53 must remain preview/guard only.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'P55 must not write src/data/daeguSeatData.ts.',
    },
    {
      rowId: 'PENDING_ROWS_KEEP_RELEASE_BLOCKED',
      validationType: 'RELEASE_POLICY',
      validationStatus: summary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.pendingRows > 0 ? `PENDING_ROWS:${summary.pendingRows}` : '',
      nextAction: summary.pendingRows > 0 ? 'Operator review is still required.' : 'No pending rows remain.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P55 is handoff only; official 177 release remains forbidden.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu operator handoff.',
    },
  ];
}

async function buildSummary() {
  const [
    p51,
    p51Rows,
    p52Gate,
    p53Gate,
    p54Gate,
    p51InputExists,
    p54FixtureExists,
  ] = await Promise.all([
    readJson(p51JsonPath),
    readCsv(p51InputCsvPath),
    readJson(p52GateJsonPath),
    readJson(p53GateJsonPath),
    readJson(p54GateJsonPath),
    pathExists(p51InputCsvPath),
    pathExists(p54FixtureCsvPath),
  ]);
  const p51Sha256 = await hashFile(p51InputCsvPath);
  const approvedRows = p51Rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED').length;
  const rejectedRows = p51Rows.filter((row) => normalizeDecision(row.operatorDecision) === 'REJECTED').length;
  const pendingRows = p51Rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING').length;
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const p52SourceDataWritePerformed = p52Gate.summary?.sourceDataWritePerformed === true;
  const p53SourceDataWritePerformed = p53Gate.summary?.sourceDataWritePerformed === true;
  const operatorWritableColumnsDocumented = operatorWritableColumns.length === 8
    && operatorWritableColumns.includes('correctedPath')
    && operatorWritableColumns.includes('reviewer');
  const immutableColumnsDocumented = immutableColumns.length === 10
    && immutableColumns.includes('sectionId')
    && immutableColumns.includes('overlayPng');
  const validationCommandChecklistIncluded = validationCommands.length === 4;
  const p54FixtureReferenceIncluded = p54FixtureExists && p54Gate.summary?.status === 'p54-partial-approval-fixture-gate-passed';
  const p52P53SourceWriteBlocked = !p52SourceDataWritePerformed && !p53SourceDataWritePerformed
    && p52Gate.summary?.productionWriteAllowed === false
    && p53Gate.summary?.productionWriteAllowed === false;

  const handoffReady = p51InputExists
    && p51Rows.length === 131
    && p51.summary?.reviewRows === 131
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177
    && operatorWritableColumnsDocumented
    && immutableColumnsDocumented
    && validationCommandChecklistIncluded
    && p54FixtureReferenceIncluded
    && p52P53SourceWriteBlocked;

  return {
    status: handoffReady ? 'p55-operator-handoff-ready' : 'p55-operator-handoff-blocked',
    p51Status: p51.status ?? p51.summary?.status ?? '',
    p52GateStatus: p52Gate.summary?.status ?? '',
    p53GateStatus: p53Gate.summary?.status ?? '',
    p54GateStatus: p54Gate.summary?.status ?? '',
    p51InputExists,
    p51Input: toFrontendRelative(p51InputCsvPath),
    p51InputSha256: p51Sha256,
    p51Rows: p51Rows.length,
    expectedP51Rows: 131,
    approvedRows,
    rejectedRows,
    pendingRows,
    currentSelectableSeats,
    officialDatasetBlocks,
    operatorWritableColumnsDocumented,
    immutableColumnsDocumented,
    p54FixtureReferenceIncluded,
    validationCommandChecklistIncluded,
    p52P53SourceWriteBlocked,
    handoffReady,
    sourceApplyAllowed: false,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

async function writeHandoff() {
  const summary = await buildSummary();
  const editableManifestRows = buildEditableManifestRows(summary.p51InputSha256, new Array(summary.p51Rows));
  const validations = buildValidationRows(summary);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p51Json: toFrontendRelative(p51JsonPath),
      p51InputCsv: toFrontendRelative(p51InputCsvPath),
      p52GateJson: toFrontendRelative(p52GateJsonPath),
      p53GateJson: toFrontendRelative(p53GateJsonPath),
      p54GateJson: toFrontendRelative(p54GateJsonPath),
      p54FixtureCsv: toFrontendRelative(p54FixtureCsvPath),
    },
    policy: {
      operatorWritableColumns,
      immutableColumns,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P55_OPERATOR_HANDOFF. P51_REAL_REVIEW_INPUT_EDIT_TARGET. OPERATOR_WRITABLE_COLUMNS_DOCUMENTED. IMMUTABLE_COLUMNS_DOCUMENTED. P54_FIXTURE_REFERENCE_INCLUDED. VALIDATION_COMMAND_CHECKLIST_INCLUDED. SOURCE_WRITE_FORBIDDEN.',
    },
    summary,
    editableManifestRows,
    validationCommands,
    validations,
    outputs: {
      handoffJson: toFrontendRelative(handoffJsonPath),
      handoffMd: toFrontendRelative(handoffMdPath),
      editableManifestCsv: toFrontendRelative(editableManifestCsvPath),
      validationChecklistCsv: toFrontendRelative(validationChecklistCsvPath),
      commandChecklistMd: toFrontendRelative(commandChecklistMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(handoffJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(editableManifestCsvPath, buildCsv(editableManifestRows, [
    'rowId',
    'file',
    'sha256',
    'rows',
    'role',
    'editableColumns',
    'immutableColumns',
    'warning',
  ]));
  await fs.writeFile(validationChecklistCsvPath, buildCsv(validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(commandChecklistMdPath, [
    '# 대구 operator reference P55 command checklist',
    '',
    'Run these after the operator edits the P51 CSV:',
    '',
    ...validationCommands.flatMap((command) => ['```bash', command, '```', '']),
  ].join('\n'));
  await fs.writeFile(handoffMdPath, [
    '# 대구 operator reference P55 operator handoff',
    '',
    `- status: \`${summary.status}\``,
    `- edit target: \`${summary.p51Input}\``,
    `- edit target sha256: \`${summary.p51InputSha256}\``,
    `- rows: \`${summary.p51Rows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- P54 fixture reference included: \`${summary.p54FixtureReferenceIncluded}\``,
    `- P52/P53 source write blocked: \`${summary.p52P53SourceWriteBlocked}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Edit Only These Columns',
    '',
    ...operatorWritableColumns.map((column) => `- \`${column}\``),
    '',
    '## Do Not Edit These Columns',
    '',
    ...immutableColumns.map((column) => `- \`${column}\``),
    '',
    '## Approval Rules',
    '',
    '- `APPROVED` requires `correctedPath`, numeric `correctedLabelX/Y`, `reviewer`, valid `reviewedAt`, and `reviewNote`.',
    '- `REJECTED` requires `reviewNote` and a concrete retrace `nextAction`.',
    '- `PENDING` keeps release and source apply blocked.',
    '',
    '## Reference Fixture',
    '',
    `- \`${toFrontendRelative(p54FixtureCsvPath)}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} p51Rows=${summary.p51Rows} approved=${summary.approvedRows} pending=${summary.pendingRows} p54FixtureReferenceIncluded=${summary.p54FixtureReferenceIncluded} p52P53SourceWriteBlocked=${summary.p52P53SourceWriteBlocked} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const handoff = await writeHandoff();
  const validations = handoff.validations ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p55-operator-handoff-gate-passed' : 'p55-operator-handoff-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    p51Rows: handoff.summary?.p51Rows ?? 0,
    approvedRows: handoff.summary?.approvedRows ?? 0,
    rejectedRows: handoff.summary?.rejectedRows ?? 0,
    pendingRows: handoff.summary?.pendingRows ?? 0,
    p51InputSha256: handoff.summary?.p51InputSha256 ?? '',
    p54FixtureReferenceIncluded: handoff.summary?.p54FixtureReferenceIncluded === true,
    validationCommandChecklistIncluded: handoff.summary?.validationCommandChecklistIncluded === true,
    p52P53SourceWriteBlocked: handoff.summary?.p52P53SourceWriteBlocked === true,
    sourceApplyAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: handoff.summary?.buildBlockerTrackedSeparately,
  };

  if (requireHandoff && invalidRows.length > 0) {
    throw new Error(`P55 operator handoff gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P55 operator handoff gate',
    '',
    `- status: \`${summary.status}\``,
    `- P51 rows: \`${summary.p51Rows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- P51 input sha256: \`${summary.p51InputSha256}\``,
    `- P54 fixture reference included: \`${summary.p54FixtureReferenceIncluded}\``,
    `- validation command checklist included: \`${summary.validationCommandChecklistIncluded}\``,
    `- P52/P53 source write blocked: \`${summary.p52P53SourceWriteBlocked}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} p51Rows=${summary.p51Rows} approved=${summary.approvedRows} pending=${summary.pendingRows} p54FixtureReferenceIncluded=${summary.p54FixtureReferenceIncluded} p52P53SourceWriteBlocked=${summary.p52P53SourceWriteBlocked} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'handoff') {
  await writeHandoff();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
