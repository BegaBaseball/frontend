import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultSourceP1Dir = path.join(defaultReportDir, 'daegu-p1-operator');
const defaultFixtureDir = path.join(defaultReportDir, 'daegu-p1-boundary-first-regression');

const REGRESSION_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_REGRESSION_V1';
const PACKET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_PACKET_V1';
const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const REVIEWER = 'P1_BOUNDARY_FIRST_REGRESSION_ONLY';
const PRESERVATION_REVIEWER = 'P1_BOUNDARY_FIRST_TEMPLATE_PRESERVATION_REGRESSION';
const REVIEWED_AT = '2026-05-13T00:00:00.000Z';
const BOUNDARY_FIRST_BLOCK_IDS = [
  'daegu-first-table-t1-1',
  'daegu-third-table-t3-2',
  'daegu-central-table-v-v1',
  'daegu-central-table-v-v2',
  'daegu-central-table-v-v3',
];

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

const makeApproval = (row, overrides) => ({
  ...row,
  operatorDecision: 'APPROVED',
  correctedPath: row.currentPath,
  correctedLabelX: row.currentLabelX,
  correctedLabelY: row.currentLabelY,
  reviewer: REVIEWER,
  reviewedAt: REVIEWED_AT,
  operatorNote: 'Regression fixture: intentionally invalid boundary-first approval.',
  ...overrides,
});

const fixtureDir = path.resolve(frontendRoot, argValue('--fixture-dir', defaultFixtureDir));
const sourceP1Dir = path.resolve(frontendRoot, argValue('--source-p1-dir', defaultSourceP1Dir));
const sourceInputPath = path.join(sourceP1Dir, 'daegu-seatmap-p1-operator-input.json');
const sourceBoundaryAidPath = path.join(sourceP1Dir, 'daegu-seatmap-p1-boundary-input-aid.json');
const sourceNextActionPath = path.join(sourceP1Dir, 'daegu-seatmap-p1-next-action-packet.json');
const sourceHandoffPath = path.join(defaultReportDir, 'daegu-seatmap-operator-handoff.json');

const fixtureP1Dir = path.join(fixtureDir, 'daegu-p1-operator');
const fixtureInputPath = path.join(fixtureP1Dir, 'daegu-seatmap-p1-operator-input.json');
const fixtureBoundaryAidPath = path.join(fixtureP1Dir, 'daegu-seatmap-p1-boundary-input-aid.json');
const fixtureNextActionPath = path.join(fixtureP1Dir, 'daegu-seatmap-p1-next-action-packet.json');
const fixtureHandoffPath = path.join(fixtureDir, 'daegu-seatmap-operator-handoff.json');
const preservationFixtureDir = path.join(fixtureDir, 'template-preservation');
const preservationP1Dir = path.join(preservationFixtureDir, 'daegu-p1-operator');
const preservationInputPath = path.join(preservationP1Dir, 'daegu-seatmap-p1-operator-input.json');
const preservationBoundaryAidPath = path.join(preservationP1Dir, 'daegu-seatmap-p1-boundary-input-aid.json');
const preservationNextActionPath = path.join(preservationP1Dir, 'daegu-seatmap-p1-next-action-packet.json');
const preservationHandoffPath = path.join(preservationFixtureDir, 'daegu-seatmap-operator-handoff.json');
const preservationTemplatePath = path.join(preservationP1Dir, 'daegu-seatmap-p1-boundary-first-operator-template.json');

const sourceInput = await readJson(sourceInputPath);
const sourceBoundaryAid = await readJson(sourceBoundaryAidPath);
const sourceNextAction = await readJson(sourceNextActionPath);
const sourceHandoff = await readJson(sourceHandoffPath);
const sourceRowsById = new Map((sourceInput.corrections ?? []).map((row) => [row.blockId, row]));
const blockers = [];

assertCondition(sourceInput.targetBatchId === TARGET_BATCH_ID, `SOURCE_INPUT_BATCH_MISMATCH:${sourceInput.targetBatchId ?? ''}`, blockers);
assertCondition(sourceInput.productionWriteAllowed === false, 'SOURCE_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE', blockers);
assertCondition(sourceBoundaryAid.summary?.inputAidVersion === 'DAEGU_P1_BOUNDARY_INPUT_AID_V1', `SOURCE_BOUNDARY_AID_VERSION_MISMATCH:${sourceBoundaryAid.summary?.inputAidVersion ?? ''}`, blockers);
assertCondition(sourceNextAction.summary?.packetVersion === 'DAEGU_P1_NEXT_ACTION_PACKET_V1', `SOURCE_NEXT_ACTION_PACKET_VERSION_MISMATCH:${sourceNextAction.summary?.packetVersion ?? ''}`, blockers);

BOUNDARY_FIRST_BLOCK_IDS.forEach((blockId) => {
  const sourceRow = sourceRowsById.get(blockId);
  assertCondition(Boolean(sourceRow), `SOURCE_BOUNDARY_ROW_MISSING:${blockId}`, blockers);
  assertCondition(Boolean(sourceRow?.currentPath), `SOURCE_BOUNDARY_CURRENT_PATH_MISSING:${blockId}`, blockers);
});

if (blockers.length === 0) {
  const v1Source = sourceRowsById.get('daegu-central-table-v-v1');
  const fixtureInput = {
    ...sourceInput,
    generatedAt: new Date().toISOString(),
    regressionFixture: REGRESSION_VERSION,
    sourceInput: path.relative(frontendRoot, sourceInputPath),
    corrections: sourceInput.corrections.map((row) => {
      if (!BOUNDARY_FIRST_BLOCK_IDS.includes(row.blockId)) {
        return {
          ...row,
          operatorDecision: 'NEEDS_RETRACE',
          correctedPath: '',
          correctedLabelX: '',
          correctedLabelY: '',
          reviewer: '',
          reviewedAt: '',
          operatorNote: 'Regression fixture: non-boundary row kept non-approved.',
        };
      }

      if (row.blockId === 'daegu-first-table-t1-1') {
        return makeApproval(row, {
          correctedPath: '',
          operatorNote: 'Regression fixture: approved row missing correctedPath.',
        });
      }
      if (row.blockId === 'daegu-third-table-t3-2') {
        return makeApproval(row, {
          correctedLabelX: '',
          correctedLabelY: '',
          operatorNote: 'Regression fixture: approved row missing corrected label coordinates.',
        });
      }
      if (row.blockId === 'daegu-central-table-v-v1') {
        return makeApproval(row, {
          correctedPath: v1Source.currentPath,
          correctedLabelX: v1Source.currentLabelX,
          correctedLabelY: v1Source.currentLabelY,
          operatorNote: 'Regression fixture: approved row shares correctedPath with V2.',
        });
      }
      if (row.blockId === 'daegu-central-table-v-v2') {
        return makeApproval(row, {
          correctedPath: v1Source.currentPath,
          correctedLabelX: row.currentLabelX,
          correctedLabelY: row.currentLabelY,
          operatorNote: 'Regression fixture: approved row shares correctedPath with V1.',
        });
      }
      return makeApproval(row, {
        correctedLabelX: 0,
        correctedLabelY: 0,
        operatorNote: 'Regression fixture: approved row has label outside correctedPath.',
      });
    }),
  };

  await writeJson(fixtureInputPath, fixtureInput);
  await writeJson(fixtureBoundaryAidPath, {
    ...sourceBoundaryAid,
    generatedAt: new Date().toISOString(),
    regressionFixture: REGRESSION_VERSION,
  });
  await writeJson(fixtureNextActionPath, {
    ...sourceNextAction,
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
let preservationReport = null;
let preservationTemplate = null;
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
    { expectFailure: true },
  ));

  commandResults.push(await runNodeScript(
    path.join(scriptDir, 'daegu-seatmap-p1-boundary-first-readiness.mjs'),
    [
      '--p1-report-dir',
      path.relative(frontendRoot, fixtureP1Dir),
      '--report-dir',
      path.relative(frontendRoot, fixtureDir),
    ],
    { expectFailure: true },
  ));

  await writeJson(preservationInputPath, {
    ...sourceInput,
    generatedAt: new Date().toISOString(),
    regressionFixture: `${REGRESSION_VERSION}:template-preservation`,
    sourceInput: path.relative(frontendRoot, sourceInputPath),
    corrections: sourceInput.corrections.map((row) => ({
      ...row,
      operatorDecision: 'NEEDS_RETRACE',
      correctedPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
    })),
  });
  await writeJson(preservationBoundaryAidPath, {
    ...sourceBoundaryAid,
    generatedAt: new Date().toISOString(),
    regressionFixture: `${REGRESSION_VERSION}:template-preservation`,
  });
  await writeJson(preservationNextActionPath, {
    ...sourceNextAction,
    generatedAt: new Date().toISOString(),
    regressionFixture: `${REGRESSION_VERSION}:template-preservation`,
  });
  await writeJson(preservationHandoffPath, {
    ...sourceHandoff,
    generatedAt: new Date().toISOString(),
    regressionFixture: `${REGRESSION_VERSION}:template-preservation`,
  });

  commandResults.push(await runNodeScript(
    path.join(scriptDir, 'daegu-seatmap-operator-corrections-validate.mjs'),
    [
      '--input',
      path.relative(frontendRoot, preservationInputPath),
      '--report-dir',
      path.relative(frontendRoot, preservationP1Dir),
      '--handoff',
      path.relative(frontendRoot, preservationHandoffPath),
    ],
  ));

  commandResults.push(await runNodeScript(
    path.join(scriptDir, 'daegu-seatmap-p1-boundary-first-readiness.mjs'),
    [
      '--p1-report-dir',
      path.relative(frontendRoot, preservationP1Dir),
      '--report-dir',
      path.relative(frontendRoot, preservationFixtureDir),
    ],
  ));

  const preservationRows = BOUNDARY_FIRST_BLOCK_IDS.map((blockId) => {
    const sourceRow = sourceRowsById.get(blockId);
    const approvedPreservationRow = blockId === 'daegu-first-table-t1-1' || blockId === 'daegu-central-table-v-v1';
    return {
      blockId,
      block: sourceRow.block,
      name: sourceRow.name,
      category: sourceRow.category,
      sourceInput: path.relative(frontendRoot, preservationInputPath),
      readinessStatus: 'READY_FOR_OPERATOR',
      pairedBlocks: '',
      evidenceCrop: sourceRow.evidenceCrop ?? '',
      editableSource: approvedPreservationRow ? 'existingOperatorTemplate' : 'sourceInput',
      operatorDecision: approvedPreservationRow ? 'APPROVED' : 'NEEDS_RETRACE',
      correctedPath: approvedPreservationRow ? sourceRow.currentPath : '',
      correctedLabelX: approvedPreservationRow ? sourceRow.currentLabelX : '',
      correctedLabelY: approvedPreservationRow ? sourceRow.currentLabelY : '',
      reviewer: approvedPreservationRow ? PRESERVATION_REVIEWER : '',
      reviewedAt: approvedPreservationRow ? REVIEWED_AT : '',
      operatorNote: approvedPreservationRow
        ? `Regression fixture: preserve editable fields for ${sourceRow.block}.`
        : '',
    };
  });

  await writeJson(preservationTemplatePath, {
    generatedAt: new Date().toISOString(),
    templateVersion: TEMPLATE_VERSION,
    targetBatchId: TARGET_BATCH_ID,
    sourcePacketVersion: PACKET_VERSION,
    sourcePacket: path.relative(frontendRoot, path.join(preservationP1Dir, 'daegu-seatmap-p1-boundary-first-packet.json')),
    sourceInput: path.relative(frontendRoot, preservationInputPath),
    templateOnly: true,
    productionWriteAllowed: false,
    allowedBlocks: ['T1-1', 'T3-2', 'V1', 'V2', 'V3'],
    editableFields: [
      'operatorDecision',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
    ],
    corrections: preservationRows,
  });

  commandResults.push(await runNodeScript(
    path.join(scriptDir, 'daegu-seatmap-p1-boundary-first-packet.mjs'),
    [
      '--p1-report-dir',
      path.relative(frontendRoot, preservationP1Dir),
      '--output-dir',
      path.relative(frontendRoot, preservationP1Dir),
    ],
  ));
}

const validationReport = blockers.length === 0
  ? await readJson(path.join(fixtureP1Dir, 'daegu-seatmap-operator-corrections-validation.json'))
  : null;
const readinessReport = blockers.length === 0
  ? await readJson(path.join(fixtureP1Dir, 'daegu-seatmap-p1-boundary-first-readiness.json'))
  : null;
if (blockers.length === 0) {
  preservationReport = await readJson(path.join(preservationP1Dir, 'daegu-seatmap-p1-boundary-first-packet.json'));
  preservationTemplate = await readJson(preservationTemplatePath);
}

if (blockers.length === 0) {
  const readinessRows = readinessReport.rows ?? [];
  const approvedInvalidRows = readinessRows.filter((row) => row.status === 'APPROVED_INVALID');
  const allRowBlockers = readinessRows.flatMap((row) => row.rowBlockers ?? []);

  assertCondition(validationReport.summary.status === 'failed', `VALIDATION_STATUS_NOT_FAILED:${validationReport.summary.status}`, blockers);
  assertCondition(validationReport.summary.approvedRows === 5, `VALIDATION_APPROVED_ROWS_MISMATCH:${validationReport.summary.approvedRows}`, blockers);
  assertCondition(validationReport.summary.invalidApprovedRows === 5, `VALIDATION_INVALID_APPROVED_ROWS_MISMATCH:${validationReport.summary.invalidApprovedRows}`, blockers);
  assertCondition(readinessReport.summary.status === 'blocked', `READINESS_STATUS_NOT_BLOCKED:${readinessReport.summary.status}`, blockers);
  assertCondition(readinessReport.summary.approvedInvalidRows === 5, `READINESS_APPROVED_INVALID_ROWS_MISMATCH:${readinessReport.summary.approvedInvalidRows}`, blockers);
  assertCondition(readinessReport.summary.canAdvanceToSingleCorrectedPath === false, 'READINESS_CAN_ADVANCE_NOT_FALSE', blockers);
  assertCondition(
    readinessReport.summary.blockers.some((blocker) => blocker.includes('BOUNDARY_FIRST_APPROVED_INVALID_ROWS')),
    'READINESS_APPROVED_INVALID_BLOCKER_MISSING',
    blockers,
  );
  assertCondition(approvedInvalidRows.length === 5, `READINESS_APPROVED_INVALID_ROW_COUNT_MISMATCH:${approvedInvalidRows.length}`, blockers);
  assertCondition(
    allRowBlockers.some((blocker) => blocker.includes('APPROVED_ROW_MISSING_FIELDS:correctedPath')),
    'MISSING_CORRECTED_PATH_BLOCKER_NOT_OBSERVED',
    blockers,
  );
  assertCondition(
    allRowBlockers.some((blocker) => blocker.includes('APPROVED_ROW_MISSING_FIELDS:correctedLabelX correctedLabelY')),
    'MISSING_CORRECTED_LABEL_BLOCKER_NOT_OBSERVED',
    blockers,
  );
  assertCondition(
    allRowBlockers.includes('BOUNDARY_FIRST_DUPLICATE_CORRECTED_PATH'),
    'DUPLICATE_CORRECTED_PATH_BLOCKER_NOT_OBSERVED',
    blockers,
  );
  assertCondition(
    readinessRows.some((row) => row.validationReasons.includes('CORRECTED_LABEL_OUTSIDE_PATH')),
    'LABEL_OUTSIDE_PATH_REASON_NOT_OBSERVED',
    blockers,
  );

  const preservedRows = preservationTemplate.corrections.filter((row) => row.editableSource === 'existingOperatorTemplate');
  const preservedBlocks = preservedRows.map((row) => row.block).sort();
  const t11Preserved = preservationTemplate.corrections.find((row) => row.blockId === 'daegu-first-table-t1-1');
  const v1Preserved = preservationTemplate.corrections.find((row) => row.blockId === 'daegu-central-table-v-v1');
  const t32NotPreserved = preservationTemplate.corrections.find((row) => row.blockId === 'daegu-third-table-t3-2');

  assertCondition(
    preservationReport.summary.packetVersion === PACKET_VERSION,
    `PRESERVATION_PACKET_VERSION_MISMATCH:${preservationReport.summary.packetVersion ?? ''}`,
    blockers,
  );
  assertCondition(
    preservationReport.summary.preservedEditableRows === 2,
    `PRESERVATION_EDITABLE_ROWS_MISMATCH:${preservationReport.summary.preservedEditableRows}`,
    blockers,
  );
  assertCondition(
    preservedBlocks.join(' ') === 'T1-1 V1',
    `PRESERVATION_BLOCKS_MISMATCH:${preservedBlocks.join(' ')}`,
    blockers,
  );
  assertCondition(t11Preserved?.operatorDecision === 'APPROVED', 'PRESERVATION_T11_DECISION_LOST', blockers);
  assertCondition(Boolean(t11Preserved?.correctedPath), 'PRESERVATION_T11_PATH_LOST', blockers);
  assertCondition(t11Preserved?.reviewer === PRESERVATION_REVIEWER, 'PRESERVATION_T11_REVIEWER_LOST', blockers);
  assertCondition(t11Preserved?.reviewedAt === REVIEWED_AT, 'PRESERVATION_T11_REVIEWED_AT_LOST', blockers);
  assertCondition(v1Preserved?.operatorDecision === 'APPROVED', 'PRESERVATION_V1_DECISION_LOST', blockers);
  assertCondition(Boolean(v1Preserved?.correctedPath), 'PRESERVATION_V1_PATH_LOST', blockers);
  assertCondition(t32NotPreserved?.editableSource === 'sourceInput', 'PRESERVATION_NON_EDITED_ROW_NOT_REGENERATED_FROM_SOURCE', blockers);
}

const summary = {
  regressionVersion: REGRESSION_VERSION,
  status: blockers.length > 0 ? 'failed' : 'ok',
  fixtureDir: path.relative(frontendRoot, fixtureDir),
  fixtureInput: path.relative(frontendRoot, fixtureInputPath),
  boundaryFirstRows: BOUNDARY_FIRST_BLOCK_IDS.length,
  validationStatus: validationReport?.summary?.status ?? '',
  validationApprovedRows: validationReport?.summary?.approvedRows ?? 0,
  validationInvalidApprovedRows: validationReport?.summary?.invalidApprovedRows ?? 0,
  readinessStatus: readinessReport?.summary?.status ?? '',
  readinessApprovedInvalidRows: readinessReport?.summary?.approvedInvalidRows ?? 0,
  readinessCanAdvanceToSingleCorrectedPath: readinessReport?.summary?.canAdvanceToSingleCorrectedPath ?? false,
  preservationFixtureDir: path.relative(frontendRoot, preservationFixtureDir),
  preservationStatus: preservationReport?.summary?.status ?? '',
  preservationRows: preservationTemplate?.corrections?.length ?? 0,
  preservationPreservedEditableRows: preservationReport?.summary?.preservedEditableRows ?? 0,
  blockers,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  commandResults,
  safetyContract: [
    'This regression script writes only fixture/report files under reports/stadium/daegu-p1-boundary-first-regression.',
    'It never edits reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json.',
    'It never modifies src/data/daeguSeatData.ts or the main corrections template.',
    'The fixture intentionally creates invalid boundary-first approvals to prove they cannot advance.',
    'The template-preservation fixture proves packet regeneration keeps operator-filled boundary-first template rows.',
  ],
};

const reportPath = path.join(fixtureDir, 'daegu-seatmap-p1-boundary-first-regression.json');
await writeJson(reportPath, report);

console.log(`p1_boundary_first_regression_json:${reportPath}`);
console.log(`status:${summary.status} validation=${summary.validationStatus} invalidApproved=${summary.validationInvalidApprovedRows} readiness=${summary.readinessStatus} approvedInvalid=${summary.readinessApprovedInvalidRows} canAdvance=${summary.readinessCanAdvanceToSingleCorrectedPath} preservedEditable=${summary.preservationPreservedEditableRows}`);

if (summary.status !== 'ok') {
  process.exitCode = 1;
}
