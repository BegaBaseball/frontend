import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultFixtureDir = path.join(defaultReportDir, 'daegu-p1-stage-order-regression');
const defaultSourceP1Dir = path.join(defaultReportDir, 'daegu-p1-operator');

const REGRESSION_VERSION = 'DAEGU_P1_STAGE_ORDER_REGRESSION_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const NEXT_ACTION_PACKET_VERSION = 'DAEGU_P1_NEXT_ACTION_PACKET_V1';
const APPROVED_LATER_STAGE_BLOCK_ID = 'daegu-outfield-couple-m-m-9';
const EXPECTED_FIRST_INCOMPLETE_STAGE = 'PAIR_BOUNDARY_FIRST';
const EXPECTED_LATER_STAGE = 'SINGLE_CORRECTED_PATH';
const REVIEWER = 'P1_STAGE_ORDER_REGRESSION_ONLY';
const REVIEWED_AT = '2026-05-13T00:00:00.000Z';

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const writeJson = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const runNodeScript = (scriptPath, args, { expectFailure = false } = {}) => new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', scriptPath, ...args],
    {
      cwd: frontendRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  child.on('error', reject);
  child.on('close', (code) => {
    const failedUnexpectedly = expectFailure ? code === 0 : code !== 0;
    const result = {
      script: path.relative(frontendRoot, scriptPath),
      args,
      exitCode: code,
      expectedFailure: expectFailure,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
    if (failedUnexpectedly) {
      reject(new Error(`Unexpected exit for ${result.script}: ${code}\n${stdout}\n${stderr}`));
      return;
    }
    resolve(result);
  });
});

const assertCondition = (condition, message, blockers) => {
  if (!condition) blockers.push(message);
};

const fixtureDir = path.resolve(frontendRoot, argValue('--fixture-dir', defaultFixtureDir));
const sourceP1Dir = path.resolve(frontendRoot, argValue('--source-p1-dir', defaultSourceP1Dir));
const sourceInputPath = path.join(sourceP1Dir, 'daegu-seatmap-p1-operator-input.json');
const sourcePackagePath = path.join(sourceP1Dir, 'daegu-seatmap-p1-operator-package.json');
const sourceNextActionPath = path.join(sourceP1Dir, 'daegu-seatmap-p1-next-action-packet.json');
const sourceTemplatePath = path.join(defaultReportDir, 'daegu-seatmap-operator-corrections-template.json');
const sourceHandoffPath = path.join(defaultReportDir, 'daegu-seatmap-operator-handoff.json');

const fixtureP1Dir = path.join(fixtureDir, 'daegu-p1-operator');
const fixtureInputPath = path.join(fixtureP1Dir, 'daegu-seatmap-p1-operator-input.json');
const fixturePackagePath = path.join(fixtureP1Dir, 'daegu-seatmap-p1-operator-package.json');
const fixtureNextActionPath = path.join(fixtureP1Dir, 'daegu-seatmap-p1-next-action-packet.json');
const fixtureTemplatePath = path.join(fixtureDir, 'daegu-seatmap-operator-corrections-template.json');
const fixtureHandoffPath = path.join(fixtureDir, 'daegu-seatmap-operator-handoff.json');

const sourceInput = await readJson(sourceInputPath);
const sourcePackage = await readJson(sourcePackagePath);
const sourceNextAction = await readJson(sourceNextActionPath);
const sourceTemplate = await readJson(sourceTemplatePath);
const sourceHandoff = await readJson(sourceHandoffPath);

const nextActionRows = Array.isArray(sourceNextAction.rows) ? sourceNextAction.rows : [];
const approvedStageRow = nextActionRows.find((row) => row.blockId === APPROVED_LATER_STAGE_BLOCK_ID);
const sourceApprovedRow = sourceInput.corrections.find((row) => row.blockId === APPROVED_LATER_STAGE_BLOCK_ID);
const blockers = [];

assertCondition(sourceNextAction.summary?.packetVersion === NEXT_ACTION_PACKET_VERSION, 'SOURCE_NEXT_ACTION_PACKET_VERSION_MISMATCH', blockers);
assertCondition(sourceNextAction.summary?.targetBatchId === TARGET_BATCH_ID, 'SOURCE_NEXT_ACTION_BATCH_MISMATCH', blockers);
assertCondition(approvedStageRow?.stage === EXPECTED_LATER_STAGE, `SOURCE_APPROVED_FIXTURE_STAGE_MISMATCH:${approvedStageRow?.stage ?? ''}`, blockers);
assertCondition(Boolean(sourceApprovedRow), `SOURCE_APPROVED_FIXTURE_ROW_MISSING:${APPROVED_LATER_STAGE_BLOCK_ID}`, blockers);
assertCondition(Boolean(sourceApprovedRow?.currentPath), `SOURCE_APPROVED_FIXTURE_CURRENT_PATH_MISSING:${APPROVED_LATER_STAGE_BLOCK_ID}`, blockers);
assertCondition(sourceApprovedRow?.currentLabelX !== '' && sourceApprovedRow?.currentLabelX !== undefined, `SOURCE_APPROVED_FIXTURE_LABEL_X_MISSING:${APPROVED_LATER_STAGE_BLOCK_ID}`, blockers);
assertCondition(sourceApprovedRow?.currentLabelY !== '' && sourceApprovedRow?.currentLabelY !== undefined, `SOURCE_APPROVED_FIXTURE_LABEL_Y_MISSING:${APPROVED_LATER_STAGE_BLOCK_ID}`, blockers);

if (blockers.length === 0) {
  const fixtureInput = {
    ...sourceInput,
    generatedAt: new Date().toISOString(),
    regressionFixture: REGRESSION_VERSION,
    sourceInput: path.relative(frontendRoot, sourceInputPath),
    corrections: sourceInput.corrections.map((row) => {
      if (row.blockId !== APPROVED_LATER_STAGE_BLOCK_ID) {
        return {
          ...row,
          operatorDecision: 'NEEDS_RETRACE',
          correctedPath: '',
          correctedLabelX: '',
          correctedLabelY: '',
          reviewer: '',
          reviewedAt: '',
          operatorNote: 'Regression fixture: non-approved row kept decided so only the later-stage approval can test ordering.',
        };
      }

      return {
        ...row,
        operatorDecision: 'APPROVED',
        correctedPath: row.currentPath,
        correctedLabelX: row.currentLabelX,
        correctedLabelY: row.currentLabelY,
        reviewer: REVIEWER,
        reviewedAt: REVIEWED_AT,
        operatorNote: 'Regression fixture: intentionally approves a later P1 stage before boundary-first rows are complete.',
      };
    }),
  };

  await writeJson(fixtureInputPath, fixtureInput);
  await writeJson(fixturePackagePath, {
    ...sourcePackage,
    generatedAt: new Date().toISOString(),
    regressionFixture: REGRESSION_VERSION,
    totalRows: fixtureInput.corrections.length,
  });
  await writeJson(fixtureNextActionPath, {
    ...sourceNextAction,
    generatedAt: new Date().toISOString(),
    regressionFixture: REGRESSION_VERSION,
  });
  await writeJson(fixtureTemplatePath, {
    ...sourceTemplate,
    generatedAt: new Date().toISOString(),
    regressionFixture: REGRESSION_VERSION,
  });
  await writeJson(fixtureHandoffPath, {
    ...sourceHandoff,
    generatedAt: new Date().toISOString(),
    regressionFixture: REGRESSION_VERSION,
  });
}

const commandResults = [];
if (blockers.length === 0) {
  commandResults.push(await runNodeScript(
    path.join(scriptDir, 'daegu-seatmap-operator-corrections-validate.mjs'),
    [
      '--input',
      path.relative(frontendRoot, fixtureInputPath),
      '--report-dir',
      path.relative(frontendRoot, fixtureP1Dir),
      '--handoff',
      path.relative(frontendRoot, fixtureHandoffPath),
    ],
    { expectFailure: false },
  ));

  commandResults.push(await runNodeScript(
    path.join(scriptDir, 'daegu-seatmap-p1-operator-boundary.mjs'),
    [
      'p1-operator-import',
      '--input',
      path.relative(frontendRoot, fixtureInputPath),
      '--report-dir',
      path.relative(frontendRoot, fixtureDir),
      '--next-action',
      path.relative(frontendRoot, fixtureNextActionPath),
    ],
    { expectFailure: false },
  ));

  commandResults.push(await runNodeScript(
    path.join(scriptDir, 'daegu-seatmap-p1-operator-boundary.mjs'),
    [
      'p1-operator-readiness',
      '--p1-report-dir',
      path.relative(frontendRoot, fixtureP1Dir),
      '--report-dir',
      path.relative(frontendRoot, fixtureDir),
    ],
    { expectFailure: true },
  ));

  commandResults.push(await runNodeScript(
    path.join(scriptDir, 'daegu-seatmap-p1-operator-boundary.mjs'),
    [
      'p1-operator-import',
      '--input',
      path.relative(frontendRoot, fixtureInputPath),
      '--report-dir',
      path.relative(frontendRoot, fixtureDir),
      '--next-action',
      path.relative(frontendRoot, fixtureNextActionPath),
      '--write-template',
    ],
    { expectFailure: true },
  ));
}

const importReport = blockers.length === 0
  ? await readJson(path.join(fixtureDir, 'daegu-seatmap-p1-operator-import.json'))
  : null;
const readinessReport = blockers.length === 0
  ? await readJson(path.join(fixtureP1Dir, 'daegu-seatmap-p1-operator-readiness.json'))
  : null;
const validationReport = blockers.length === 0
  ? await readJson(path.join(fixtureP1Dir, 'daegu-seatmap-operator-corrections-validation.json'))
  : null;

if (blockers.length === 0) {
  const importBlockers = importReport.summary.blockers ?? [];
  const readinessBlockers = readinessReport.summary.blockers ?? [];
  assertCondition(
    importReport.summary.status === 'blocked',
    `IMPORT_WRITE_TEMPLATE_STATUS_NOT_BLOCKED:${importReport.summary.status}`,
    blockers,
  );
  assertCondition(
    importReport.summary.mode === 'write-template',
    `IMPORT_WRITE_TEMPLATE_MODE_MISMATCH:${importReport.summary.mode}`,
    blockers,
  );
  assertCondition(
    importReport.summary.firstIncompleteStage === EXPECTED_FIRST_INCOMPLETE_STAGE,
    `IMPORT_FIRST_INCOMPLETE_STAGE_MISMATCH:${importReport.summary.firstIncompleteStage}`,
    blockers,
  );
  assertCondition(
    importReport.summary.laterApprovedRows === 1,
    `IMPORT_LATER_APPROVED_ROWS_MISMATCH:${importReport.summary.laterApprovedRows}`,
    blockers,
  );
  assertCondition(
    importBlockers.some((blocker) => blocker.includes(`WRITE_TEMPLATE_REQUIRES_P1_STAGE_ORDER:${EXPECTED_FIRST_INCOMPLETE_STAGE}`)),
    'IMPORT_STAGE_ORDER_BLOCKER_MISSING',
    blockers,
  );
  assertCondition(
    readinessReport.summary.status === 'blocked',
    `READINESS_STATUS_NOT_BLOCKED:${readinessReport.summary.status}`,
    blockers,
  );
  assertCondition(
    readinessReport.summary.readyForTemplateImport === false,
    'READINESS_READY_FOR_TEMPLATE_IMPORT_NOT_FALSE',
    blockers,
  );
  assertCondition(
    readinessReport.summary.firstIncompleteStage === EXPECTED_FIRST_INCOMPLETE_STAGE,
    `READINESS_FIRST_INCOMPLETE_STAGE_MISMATCH:${readinessReport.summary.firstIncompleteStage}`,
    blockers,
  );
  assertCondition(
    readinessReport.summary.laterApprovedRows === 1,
    `READINESS_LATER_APPROVED_ROWS_MISMATCH:${readinessReport.summary.laterApprovedRows}`,
    blockers,
  );
  assertCondition(
    readinessBlockers.some((blocker) => blocker.includes(`P1_STAGE_ORDER_APPROVAL_BLOCKED:${EXPECTED_FIRST_INCOMPLETE_STAGE}`)),
    'READINESS_STAGE_ORDER_BLOCKER_MISSING',
    blockers,
  );
  assertCondition(
    validationReport.summary.approvedRows === 1,
    `VALIDATION_APPROVED_ROWS_MISMATCH:${validationReport.summary.approvedRows}`,
    blockers,
  );
}

const summary = {
  regressionVersion: REGRESSION_VERSION,
  status: blockers.length > 0 ? 'failed' : 'ok',
  fixtureDir: path.relative(frontendRoot, fixtureDir),
  fixtureInput: path.relative(frontendRoot, fixtureInputPath),
  approvedLaterStageBlockId: APPROVED_LATER_STAGE_BLOCK_ID,
  approvedLaterStage: EXPECTED_LATER_STAGE,
  expectedFirstIncompleteStage: EXPECTED_FIRST_INCOMPLETE_STAGE,
  validationStatus: validationReport?.summary?.status ?? '',
  validationApprovedRows: validationReport?.summary?.approvedRows ?? 0,
  importStatus: importReport?.summary?.status ?? '',
  importFirstIncompleteStage: importReport?.summary?.firstIncompleteStage ?? '',
  importLaterApprovedRows: importReport?.summary?.laterApprovedRows ?? 0,
  readinessStatus: readinessReport?.summary?.status ?? '',
  readinessReadyForTemplateImport: readinessReport?.summary?.readyForTemplateImport ?? false,
  readinessFirstIncompleteStage: readinessReport?.summary?.firstIncompleteStage ?? '',
  readinessLaterApprovedRows: readinessReport?.summary?.laterApprovedRows ?? 0,
  blockers,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  commandResults,
  safetyContract: [
    'This regression script writes only fixture/report files under reports/stadium/daegu-p1-stage-order-regression.',
    'It never edits reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json.',
    'It never modifies src/data/daeguSeatData.ts or the main corrections template.',
    'The fixture intentionally approves one later-stage row to prove P1 boundary-first ordering remains blocked.',
  ],
};

const reportPath = path.join(fixtureDir, 'daegu-seatmap-p1-stage-order-regression.json');
await writeJson(reportPath, report);

console.log(`p1_stage_order_regression_json:${reportPath}`);
console.log(`status:${summary.status} import=${summary.importStatus} readiness=${summary.readinessStatus} firstIncomplete=${summary.readinessFirstIncompleteStage} laterApproved=${summary.readinessLaterApprovedRows}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
