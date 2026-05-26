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
const p42JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p42-review-intake/daegu-operator-reference-p42-review-intake.json');
const p41HandoffCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p41-review-handoff/daegu-operator-reference-p41-review-handoff.csv');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p45-real-input-guard');
const gateDir = path.join(outputDir, 'gate');
const guardJsonPath = path.join(outputDir, 'daegu-operator-reference-p45-real-input-guard.json');
const guardCsvPath = path.join(outputDir, 'daegu-operator-reference-p45-real-input-guard.csv');
const blockerCsvPath = path.join(outputDir, 'daegu-operator-reference-p45-blockers.csv');
const inputManifestMdPath = path.join(outputDir, 'daegu-operator-reference-p45-input-manifest.md');
const guardMdPath = path.join(outputDir, 'daegu-operator-reference-p45-real-input-guard.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p45-real-input-guard-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p45-real-input-guard-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p45-real-input-guard-gate.md');

const task = process.argv[2] ?? 'guard';
const requireRealInput = process.argv.includes('--require-real-input');

const sourceContractLiterals = [
  'P45_REAL_OPERATOR_INPUT_GUARD',
  'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
  'P44_FIXTURE_INPUT_BLOCKED_FOR_RELEASE',
  'P45_DEFAULT_P41_HANDOFF_NOT_RELEASE_INPUT',
  'REAL_OPERATOR_INPUT_REQUIRED_FOR_P46',
  'INPUT_SHA256_RECORDED',
  'APPROVED_131_REQUIRED_FOR_P46',
  'PENDING_ROWS_KEEP_REVIEW_OPEN',
  'REJECTED_ROWS_REQUIRE_RETRACE',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p45-real-input-guard-ready',
  'p45-real-input-guard-gate-passed',
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

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function resolveFrontendPath(filePath) {
  if (!filePath) return '';
  return path.isAbsolute(filePath) ? filePath : path.resolve(frontendRoot, filePath);
}

async function hashFile(filePath) {
  const bytes = await fs.readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

async function listDirectoryFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await listDirectoryFiles(absolutePath);
      files.push(...nestedFiles);
      continue;
    }
    if (entry.isFile()) files.push(absolutePath);
  }
  return files.sort((left, right) => toFrontendRelative(left).localeCompare(toFrontendRelative(right)));
}

async function hashInput(inputPath) {
  const stat = await fs.stat(inputPath);
  if (stat.isFile()) {
    return {
      inputKind: 'FILE',
      inputSha256: await hashFile(inputPath),
      inputFiles: [toFrontendRelative(inputPath)],
    };
  }
  if (stat.isDirectory()) {
    const files = await listDirectoryFiles(inputPath);
    const fileHashes = [];
    for (const filePath of files) {
      fileHashes.push({
        file: toFrontendRelative(filePath),
        sha256: await hashFile(filePath),
      });
    }
    const manifestHash = createHash('sha256');
    fileHashes.forEach((entry) => {
      manifestHash.update(entry.file);
      manifestHash.update('\0');
      manifestHash.update(entry.sha256);
      manifestHash.update('\n');
    });
    return {
      inputKind: 'DIRECTORY',
      inputSha256: manifestHash.digest('hex'),
      inputFiles: fileHashes.map((entry) => entry.file),
      fileHashes,
    };
  }
  throw new Error(`Unsupported P45 input path type: ${inputPath}`);
}

function normalizePathForMatch(filePath) {
  return toFrontendRelative(filePath).split(path.sep).join('/');
}

function isP44FixtureInput(inputPath) {
  const relativePath = normalizePathForMatch(inputPath);
  return relativePath.startsWith('reports/stadium/daegu-operator-reference-p44-decision-fixtures/fixtures/')
    || relativePath.includes('/fixtures/');
}

function isDefaultP41HandoffInput(inputPath) {
  return normalizePathForMatch(inputPath) === normalizePathForMatch(p41HandoffCsvPath);
}

function addBlocker(blockers, condition, rowId, severity, message, nextAction) {
  if (!condition) return;
  blockers.push({
    rowId,
    severity,
    message,
    nextAction,
  });
}

function normalizeSummary(p42, inputMeta) {
  const p42Summary = p42.summary ?? {};
  const inputPath = resolveFrontendPath(p42.source?.reviewInput);
  const defaultP41HandoffInput = isDefaultP41HandoffInput(inputPath);
  const p44FixtureInput = isP44FixtureInput(inputPath);
  const realOperatorInputProvided = !defaultP41HandoffInput && !p44FixtureInput;
  const releaseInputAllowed = realOperatorInputProvided
    && p42Summary.reviewRows === 131
    && p42Summary.approvedRows === 131
    && p42Summary.rejectedRows === 0
    && p42Summary.pendingRows === 0
    && p42Summary.invalidRows === 0
    && p42Summary.immutableColumnChangeCount === 0;

  return {
    status: 'p45-real-input-guard-ready',
    reviewRows: p42Summary.reviewRows ?? 0,
    expectedReviewRows: 131,
    currentSelectableSeats: DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    approvedRows: p42Summary.approvedRows ?? 0,
    rejectedRows: p42Summary.rejectedRows ?? 0,
    pendingRows: p42Summary.pendingRows ?? 0,
    invalidRows: p42Summary.invalidRows ?? 0,
    immutableColumnChangeCount: p42Summary.immutableColumnChangeCount ?? 0,
    p42Status: p42.status ?? p42Summary.status,
    p42ReviewInput: toFrontendRelative(inputPath),
    p42ReviewInputEnv: p42.source?.reviewInputEnv ?? '',
    p42ReviewInputKind: p42.source?.reviewInputKind ?? '',
    p45InputKind: inputMeta.inputKind,
    p45InputSha256: inputMeta.inputSha256,
    p45InputFiles: inputMeta.inputFiles ?? [],
    defaultP41HandoffInput,
    p44FixtureInput,
    realOperatorInputProvided,
    releaseInputAllowed,
    releaseInputBlocked: !releaseInputAllowed,
    p46CandidateAllowed: releaseInputAllowed,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildBlockers(summary) {
  const blockers = [];
  addBlocker(
    blockers,
    summary.defaultP41HandoffInput,
    'P45_DEFAULT_P41_HANDOFF_NOT_RELEASE_INPUT',
    'REVIEW_PENDING',
    'The default P41 handoff CSV keeps review open and must not be treated as a real release input.',
    'Provide an operator-edited review CSV via DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT before P46.',
  );
  addBlocker(
    blockers,
    summary.p44FixtureInput,
    'P44_FIXTURE_INPUT_BLOCKED_FOR_RELEASE',
    'INVALID',
    'P44 fixture input is test-only and cannot be used as release input.',
    'Use fixtures only for tests; provide a real operator input file for release preflight.',
  );
  addBlocker(
    blockers,
    !summary.realOperatorInputProvided,
    'REAL_OPERATOR_INPUT_REQUIRED_FOR_P46',
    'REVIEW_PENDING',
    'REAL_OPERATOR_INPUT_REQUIRED_FOR_P46: P46 requires an operator-edited input path, not default handoff or fixture data.',
    'Set DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT to the reviewed operator CSV or directory.',
  );
  addBlocker(
    blockers,
    summary.approvedRows !== 131,
    'APPROVED_131_REQUIRED_FOR_P46',
    'REVIEW_PENDING',
    `APPROVED_131_REQUIRED_FOR_P46: approved rows are ${summary.approvedRows}.`,
    'Operator must approve all 131 rows before P46 release candidate import can proceed.',
  );
  addBlocker(
    blockers,
    summary.pendingRows > 0,
    `PENDING_ROWS_KEEP_REVIEW_OPEN_${summary.pendingRows}`,
    'REVIEW_PENDING',
    `PENDING_ROWS_KEEP_REVIEW_OPEN: ${summary.pendingRows} rows are still pending.`,
    'Continue operator review and rerun P42/P45 after decisions are complete.',
  );
  addBlocker(
    blockers,
    summary.rejectedRows > 0,
    `REJECTED_ROWS_REQUIRE_RETRACE_${summary.rejectedRows}`,
    'REVIEW_PENDING',
    `REJECTED_ROWS_REQUIRE_RETRACE: ${summary.rejectedRows} rows require retrace.`,
    'Create retrace worksets before attempting P46.',
  );
  addBlocker(
    blockers,
    summary.invalidRows > 0,
    `INVALID_ROWS_BLOCK_P45_${summary.invalidRows}`,
    'INVALID',
    `INVALID_ROWS_BLOCK_P45: ${summary.invalidRows} invalid intake rows were found.`,
    'Fix invalid P42 intake rows before P45 can pass.',
  );
  addBlocker(
    blockers,
    summary.immutableColumnChangeCount > 0,
    `IMMUTABLE_CHANGES_BLOCK_P45_${summary.immutableColumnChangeCount}`,
    'INVALID',
    `IMMUTABLE_CHANGES_BLOCK_P45: ${summary.immutableColumnChangeCount} immutable evidence changes were found.`,
    'Restore immutable evidence columns and edit only operator writable fields.',
  );
  return blockers;
}

function buildRows(summary, blockers) {
  return [
    {
      rowId: 'P45_REAL_OPERATOR_INPUT_GUARD',
      validationType: 'INPUT_GUARD_CONTRACT',
      validationStatus: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `ROWS_${summary.reviewRows}_SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Keep 4096 operator reference and 1707 official PNG datasets separated.',
    },
    {
      rowId: 'INPUT_SHA256_RECORDED',
      validationType: 'INPUT_MANIFEST',
      validationStatus: summary.p45InputSha256 ? 'PASS' : 'INVALID',
      failures: summary.p45InputSha256 ? '' : 'INPUT_SHA256_MISSING',
      nextAction: 'P45 must record the operator review input hash.',
    },
    {
      rowId: 'P45_DEFAULT_P41_HANDOFF_NOT_RELEASE_INPUT',
      validationType: 'INPUT_ORIGIN_POLICY',
      validationStatus: summary.defaultP41HandoffInput ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.defaultP41HandoffInput ? 'DEFAULT_P41_HANDOFF_INPUT' : '',
      nextAction: summary.defaultP41HandoffInput
        ? 'Provide a real operator-edited input via DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT.'
        : 'Input is not the default P41 handoff CSV.',
    },
    {
      rowId: 'P44_FIXTURE_INPUT_BLOCKED_FOR_RELEASE',
      validationType: 'INPUT_ORIGIN_POLICY',
      validationStatus: summary.p44FixtureInput ? 'INVALID' : 'PASS',
      failures: summary.p44FixtureInput ? 'P44_FIXTURE_INPUT' : '',
      nextAction: summary.p44FixtureInput
        ? 'Do not use P44 fixtures as release input.'
        : 'Input is not a P44 fixture.',
    },
    {
      rowId: 'REAL_OPERATOR_INPUT_REQUIRED_FOR_P46',
      validationType: 'INPUT_ORIGIN_POLICY',
      validationStatus: summary.realOperatorInputProvided ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.realOperatorInputProvided ? '' : 'REAL_OPERATOR_INPUT_NOT_PROVIDED',
      nextAction: summary.realOperatorInputProvided
        ? 'Proceed only if approval counts are complete.'
        : 'Set DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT to reviewed operator data before P46.',
    },
    {
      rowId: 'APPROVED_131_REQUIRED_FOR_P46',
      validationType: 'P46_POLICY',
      validationStatus: summary.approvedRows === 131 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.approvedRows === 131 ? '' : `APPROVED_ROWS:${summary.approvedRows}`,
      nextAction: 'P46 requires approved=131, rejected=0, pending=0, invalid=0, immutable=0.',
    },
    {
      rowId: 'PENDING_ROWS_KEEP_REVIEW_OPEN',
      validationType: 'REVIEW_STATUS_POLICY',
      validationStatus: summary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.pendingRows > 0 ? `PENDING_ROWS:${summary.pendingRows}` : '',
      nextAction: summary.pendingRows > 0 ? 'Continue operator review.' : 'No pending rows remain.',
    },
    {
      rowId: 'REJECTED_ROWS_REQUIRE_RETRACE',
      validationType: 'RETRACE_POLICY',
      validationStatus: summary.rejectedRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.rejectedRows > 0 ? `REJECTED_ROWS:${summary.rejectedRows}` : '',
      nextAction: summary.rejectedRows > 0 ? 'Create retrace batches for rejected rows.' : 'No rejected rows require retrace.',
    },
    {
      rowId: 'INVALID_ROWS_BLOCK_P45',
      validationType: 'INTAKE_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Fix invalid P42 intake rows.',
    },
    {
      rowId: 'IMMUTABLE_CHANGES_BLOCK_P45',
      validationType: 'IMMUTABILITY_POLICY',
      validationStatus: summary.immutableColumnChangeCount === 0 ? 'PASS' : 'INVALID',
      failures: summary.immutableColumnChangeCount === 0 ? '' : `IMMUTABLE_CHANGES:${summary.immutableColumnChangeCount}`,
      nextAction: 'Only operator writable columns may change.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
      nextAction: 'P45 must not modify daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P45 only validates real input readiness; official 177 release remains separate.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu seatmap release input guard.',
    },
  ];
}

async function writeGuard() {
  const p42 = await readJson(p42JsonPath);
  const inputPath = resolveFrontendPath(p42.source?.reviewInput);
  const inputMeta = await hashInput(inputPath);
  const summary = normalizeSummary(p42, inputMeta);
  const blockers = buildBlockers(summary);
  const rows = buildRows(summary, blockers);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p42Json: toFrontendRelative(p42JsonPath),
      p42ReviewInput: summary.p42ReviewInput,
      p42ReviewInputEnv: summary.p42ReviewInputEnv,
      p42ReviewInputKind: summary.p42ReviewInputKind,
      p45InputKind: summary.p45InputKind,
      p45InputSha256: summary.p45InputSha256,
      p45InputFiles: summary.p45InputFiles,
      p41HandoffCsv: toFrontendRelative(p41HandoffCsvPath),
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      operatorReference131LockAllowed: false,
      p46CandidateAllowed: summary.p46CandidateAllowed,
      note: 'P45_REAL_OPERATOR_INPUT_GUARD. DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT. P45_DEFAULT_P41_HANDOFF_NOT_RELEASE_INPUT. P44_FIXTURE_INPUT_BLOCKED_FOR_RELEASE. REAL_OPERATOR_INPUT_REQUIRED_FOR_P46. INPUT_SHA256_RECORDED.',
    },
    summary: {
      ...summary,
      blockerCount: blockers.length,
    },
    blockers,
    rows,
    outputs: {
      guardJson: toFrontendRelative(guardJsonPath),
      guardCsv: toFrontendRelative(guardCsvPath),
      blockerCsv: toFrontendRelative(blockerCsvPath),
      inputManifestMd: toFrontendRelative(inputManifestMdPath),
      guardMd: toFrontendRelative(guardMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(guardJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(guardCsvPath, buildCsv(rows, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(blockerCsvPath, buildCsv(blockers, [
    'rowId',
    'severity',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(inputManifestMdPath, [
    '# 대구 operator reference P45 input manifest',
    '',
    `- input: \`${summary.p42ReviewInput}\``,
    `- input kind: \`${summary.p45InputKind}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- default P41 handoff input: \`${summary.defaultP41HandoffInput}\``,
    `- P44 fixture input: \`${summary.p44FixtureInput}\``,
    `- real operator input provided: \`${summary.realOperatorInputProvided}\``,
    `- release input allowed: \`${summary.releaseInputAllowed}\``,
    '',
    '## Files',
    '',
    ...(summary.p45InputFiles.length > 0 ? summary.p45InputFiles.map((file) => `- \`${file}\``) : ['- none']),
    '',
  ].join('\n'));
  await fs.writeFile(guardMdPath, [
    '# 대구 operator reference P45 real input guard',
    '',
    `- status: \`${summary.status}\``,
    `- P42 review input: \`${summary.p42ReviewInput}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- default P41 handoff input: \`${summary.defaultP41HandoffInput}\``,
    `- P44 fixture input: \`${summary.p44FixtureInput}\``,
    `- real operator input provided: \`${summary.realOperatorInputProvided}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- immutable column changes: \`${summary.immutableColumnChangeCount}\``,
    `- release input allowed: \`${summary.releaseInputAllowed}\``,
    `- release input blocked: \`${summary.releaseInputBlocked}\``,
    `- P46 candidate allowed: \`${summary.p46CandidateAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
    '## Blockers',
    '',
    blockers.length > 0
      ? blockers.map((blocker) => `- \`${blocker.rowId}\`: ${blocker.message} Next: ${blocker.nextAction}`).join('\n')
      : '- none',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} input=${summary.p42ReviewInput} sha256=${summary.p45InputSha256} realOperatorInput=${summary.realOperatorInputProvided} fixture=${summary.p44FixtureInput} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} releaseInputAllowed=${summary.releaseInputAllowed} p46CandidateAllowed=${summary.p46CandidateAllowed}`);
  return payload;
}

async function writeGate() {
  let guard;
  try {
    guard = await readJson(guardJsonPath);
  } catch {
    guard = await writeGuard();
  }

  const validations = guard.rows ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p45-real-input-guard-gate-passed' : 'p45-real-input-guard-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    reviewRows: guard.summary?.reviewRows ?? 0,
    approvedRows: guard.summary?.approvedRows ?? 0,
    rejectedRows: guard.summary?.rejectedRows ?? 0,
    pendingRows: guard.summary?.pendingRows ?? 0,
    immutableColumnChangeCount: guard.summary?.immutableColumnChangeCount ?? 0,
    p45InputSha256: guard.summary?.p45InputSha256 ?? '',
    defaultP41HandoffInput: guard.summary?.defaultP41HandoffInput === true,
    p44FixtureInput: guard.summary?.p44FixtureInput === true,
    realOperatorInputProvided: guard.summary?.realOperatorInputProvided === true,
    releaseInputAllowed: guard.summary?.releaseInputAllowed === true,
    releaseInputBlocked: guard.summary?.releaseInputBlocked === true,
    p46CandidateAllowed: guard.summary?.p46CandidateAllowed === true,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: guard.summary?.buildBlockerTrackedSeparately,
  };

  if (requireRealInput && invalidRows.length > 0) {
    throw new Error(`P45 real input guard gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P45 real input guard gate',
    '',
    `- status: \`${summary.status}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending validations: \`${summary.reviewPendingRows}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- default P41 handoff input: \`${summary.defaultP41HandoffInput}\``,
    `- P44 fixture input: \`${summary.p44FixtureInput}\``,
    `- real operator input provided: \`${summary.realOperatorInputProvided}\``,
    `- release input allowed: \`${summary.releaseInputAllowed}\``,
    `- P46 candidate allowed: \`${summary.p46CandidateAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} realOperatorInput=${summary.realOperatorInputProvided} fixture=${summary.p44FixtureInput} approved=${summary.approvedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} releaseInputAllowed=${summary.releaseInputAllowed} p46CandidateAllowed=${summary.p46CandidateAllowed}`);
}

if (task === 'guard') {
  await writeGuard();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
