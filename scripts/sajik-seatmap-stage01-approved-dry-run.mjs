#!/usr/bin/env node
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { pathToPoints, pointsToPath } from '../src/utils/seatMapPolygonValidator.ts';

const execFileAsync = promisify(execFile);

const DRY_RUN_VERSION = 'SAJIK_STAGE01_APPROVED_DRY_RUN_V1';
const DRY_RUN_TARGET_SECTION_ID = '021';
const DRY_RUN_REVIEWER = 'STAGE01_DRY_RUN_OPERATOR';
const DRY_RUN_REVIEWED_AT = '2026-05-15T00:00:00.000Z';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
const dryRunDir = path.join(stageDir, 'dry-run');

const baseInputPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json');
const dryRunInputPath = path.join(dryRunDir, 'sajik-seatmap-stage01-operator-input.json');
const inputAidPath = path.join(dryRunDir, 'sajik-seatmap-stage01-operator-input-aid.json');
const prewritePath = path.join(dryRunDir, 'sajik-seatmap-stage01-prewrite.json');
const applyReadyPath = path.join(dryRunDir, 'sajik-seatmap-stage01-apply-ready.json');
const patchPreviewPath = path.join(dryRunDir, 'sajik-seatmap-stage01-prewrite.patch-preview.ts');
const postApplyPath = path.join(dryRunDir, 'sajik-seatmap-stage01-post-apply-audit.json');
const operatorStatusPath = path.join(dryRunDir, 'sajik-seatmap-stage01-operator-status.json');
const manualPatchPlanPath = path.join(dryRunDir, 'sajik-seatmap-stage01-manual-patch-plan.json');
const realApprovalReadinessPath = path.join(dryRunDir, 'sajik-seatmap-stage01-real-approval-readiness.json');
const dryRunJsonPath = path.join(dryRunDir, 'sajik-seatmap-stage01-approved-dry-run.json');
const dryRunMarkdownPath = path.join(dryRunDir, 'sajik-seatmap-stage01-approved-dry-run.md');

const SOURCE_DATA_FILE = 'src/data/sajikSeatData.ts';

function normalizeForDryRun(row) {
  return {
    ...row,
    operatorDecision: 'PENDING',
    correctedPath: '',
    correctedLabelX: '',
    correctedLabelY: '',
    reviewer: '',
    reviewedAt: '',
    operatorNote: '',
  };
}

function makeApprovedDryRunRow(row) {
  const points = pathToPoints(row.currentHitPath ?? row.currentPath);
  if (points.length < 3) {
    throw new Error(`Cannot create approved dry-run row for ${row.sectionId}: currentPath has fewer than 3 points.`);
  }

  const adjustedPoints = points.map((point, index) => {
    if (index !== 0) {
      return point;
    }
    return [point[0] + 0.5, point[1] + 0.5];
  });

  return {
    ...row,
    operatorDecision: 'APPROVED',
    correctedPath: pointsToPath(adjustedPoints),
    correctedLabelX: row.currentLabelX,
    correctedLabelY: row.currentLabelY,
    reviewer: DRY_RUN_REVIEWER,
    reviewedAt: DRY_RUN_REVIEWED_AT,
    operatorNote: 'Approved dry-run only. This fixture must not edit src/data/sajikSeatData.ts.',
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonOrNull(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(`${filePath}.tmp`, filePath);
}

function formatRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

async function runNodeScript(scriptName, args) {
  const result = {
    script: scriptName,
    args,
    exitCode: 0,
    stdout: '',
    stderr: '',
  };

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', path.join('scripts', scriptName), ...args],
      {
        cwd: frontendRoot,
        maxBuffer: 1024 * 1024 * 16,
      },
    );
    result.stdout = stdout.trim();
    result.stderr = stderr.trim();
  } catch (error) {
    result.exitCode = Number.isInteger(error.code) ? error.code : 1;
    result.stdout = String(error.stdout ?? '').trim();
    result.stderr = String(error.stderr ?? error.message ?? '').trim();
  }

  return result;
}

async function runRequired(commandResults, blockers, scriptName, args) {
  const result = await runNodeScript(scriptName, args);
  commandResults.push(result);
  if (result.exitCode !== 0) {
    blockers.push({
      type: 'command-failed',
      script: scriptName,
      exitCode: result.exitCode,
      stderr: result.stderr,
    });
  }
  return result;
}

function assertCondition(issues, condition, message, details = undefined) {
  if (!condition) {
    issues.push(details === undefined ? { message } : { message, details });
  }
}

function isSameStringArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && expected.every((value, index) => actual[index] === value);
}

function reportStatus(report) {
  return report?.status ?? report?.summary?.status ?? 'missing';
}

function buildMarkdown(report) {
  const statusRows = [
    ['targetSectionId', report.targetSectionId],
    ['status', report.status],
    ['inputAidStatus', report.flow.inputAidStatus],
    ['prewriteStatus', report.flow.prewriteStatus],
    ['applyReadyStatus', report.flow.applyReadyStatus],
    ['postApplyStatus', report.flow.postApplyStatus],
    ['operatorStatus', report.flow.operatorStatus],
    ['manualPatchPlanStatus', report.flow.manualPatchPlanStatus],
    ['realApprovalReadinessStatus', report.flow.realApprovalReadinessStatus],
    ['manualPatchRows', String(report.flow.manualPatchRows)],
    ['approvedNotAppliedRows', String(report.flow.approvedNotAppliedRows)],
    ['approvedBlockedRows', String(report.flow.approvedBlockedRows)],
    ['sourceDataWritePerformed', String(report.safetyContract.sourceDataWritePerformed)],
    ['productionWriteAllowed', String(report.safetyContract.productionWriteAllowed)],
    ['productionDataChanged', String(report.safetyContract.productionDataChanged)],
  ];

  const lines = [
    '# Sajik Stage 01 Approved Dry-Run',
    '',
    '| Field | Value |',
    '| --- | --- |',
    ...statusRows.map(([field, value]) => `| ${field} | ${value} |`),
    '',
    '## Outputs',
    '',
    `- Dry-run input: \`${formatRelative(dryRunInputPath)}\``,
    `- Input aid: \`${formatRelative(inputAidPath)}\``,
    `- Prewrite: \`${formatRelative(prewritePath)}\``,
    `- Apply-ready: \`${formatRelative(applyReadyPath)}\``,
    `- Post-apply audit: \`${formatRelative(postApplyPath)}\``,
    `- Operator status: \`${formatRelative(operatorStatusPath)}\``,
    `- Manual patch plan: \`${formatRelative(manualPatchPlanPath)}\``,
    `- Real approval readiness: \`${formatRelative(realApprovalReadinessPath)}\``,
    '',
    '## Safety Contract',
    '',
    `- The dry-run does not edit \`${SOURCE_DATA_FILE}\`.`,
    '- `productionWriteAllowed` must remain `false`.',
    '- `sourceDataWritePerformed` must remain `false`.',
    '- `productionDataChanged` must remain `false`.',
  ];

  if (report.issues.length > 0) {
    lines.push('', '## Issues', '');
    for (const issue of report.issues) {
      lines.push(`- ${issue.message}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const commandResults = [];
  const blockers = [];
  const issues = [];

  await fs.mkdir(dryRunDir, { recursive: true });

  const baseInput = await readJson(baseInputPath);
  const baseRows = Array.isArray(baseInput.corrections)
    ? baseInput.corrections
    : Array.isArray(baseInput.rows)
      ? baseInput.rows
      : [];
  const normalizedRows = baseRows.map(normalizeForDryRun);
  const targetIndex = normalizedRows.findIndex((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID);
  if (targetIndex < 0) {
    throw new Error(`Stage 01 operator input does not contain ${DRY_RUN_TARGET_SECTION_ID}. Run npm run stadium:sajik:stage01-operator-package first.`);
  }

  normalizedRows[targetIndex] = makeApprovedDryRunRow(normalizedRows[targetIndex]);

  const dryRunInput = {
    ...baseInput,
    dryRunVersion: DRY_RUN_VERSION,
    dryRunTargetSectionId: DRY_RUN_TARGET_SECTION_ID,
    corrections: normalizedRows,
  };

  await writeJson(dryRunInputPath, dryRunInput);

  await runRequired(commandResults, blockers, 'sajik-seatmap-stage01-operator-input-aid.mjs', [
    '--input',
    dryRunInputPath,
    '--stage-dir',
    dryRunDir,
  ]);
  await runRequired(commandResults, blockers, 'sajik-seatmap-stage01-prewrite.mjs', [
    '--input',
    dryRunInputPath,
    '--stage-dir',
    dryRunDir,
  ]);
  await runRequired(commandResults, blockers, 'sajik-seatmap-stage01-apply-ready.mjs', [
    '--prewrite',
    prewritePath,
    '--patch-preview',
    patchPreviewPath,
    '--stage-dir',
    dryRunDir,
  ]);
  await runRequired(commandResults, blockers, 'sajik-seatmap-stage01-post-apply-audit.mjs', [
    '--prewrite',
    prewritePath,
    '--stage-dir',
    dryRunDir,
  ]);
  await runRequired(commandResults, blockers, 'sajik-seatmap-stage01-operator-status.mjs', [
    '--operator-input',
    dryRunInputPath,
    '--prewrite',
    prewritePath,
    '--apply-ready',
    applyReadyPath,
    '--post-apply',
    postApplyPath,
    '--stage-dir',
    dryRunDir,
  ]);
  await runRequired(commandResults, blockers, 'sajik-seatmap-stage01-manual-patch-plan.mjs', [
    '--operator-status',
    operatorStatusPath,
    '--prewrite',
    prewritePath,
    '--stage-dir',
    dryRunDir,
    '--require-ready',
  ]);
  await runRequired(commandResults, blockers, 'sajik-seatmap-stage01-real-approval-readiness.mjs', [
    '--operator-input',
    dryRunInputPath,
    '--input-aid',
    inputAidPath,
    '--prewrite',
    prewritePath,
    '--apply-ready',
    applyReadyPath,
    '--post-apply',
    postApplyPath,
    '--operator-status',
    operatorStatusPath,
    '--manual-patch-plan',
    manualPatchPlanPath,
    '--stage-dir',
    dryRunDir,
  ]);

  const inputAid = await readJsonOrNull(inputAidPath);
  const prewrite = await readJsonOrNull(prewritePath);
  const applyReady = await readJsonOrNull(applyReadyPath);
  const postApply = await readJsonOrNull(postApplyPath);
  const operatorStatus = await readJsonOrNull(operatorStatusPath);
  const manualPatchPlan = await readJsonOrNull(manualPatchPlanPath);
  const realApprovalReadiness = await readJsonOrNull(realApprovalReadinessPath);

  const patchPayload = prewrite?.patchPayloads?.[0] ?? null;
  const patchReviewRow = prewrite?.patchReviewRows?.[0] ?? null;
  const statusRow = (operatorStatus?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;
  const manualPatchRow = (manualPatchPlan?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;
  const readinessRow = (realApprovalReadiness?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;

  assertCondition(issues, blockers.length === 0, 'All child scripts must exit successfully.', blockers);
  assertCondition(issues, reportStatus(inputAid) === 'ready-for-prewrite', 'Input aid must be ready-for-prewrite.', reportStatus(inputAid));
  assertCondition(issues, inputAid?.summary?.readyForPrewriteRows === 1, 'Input aid must expose exactly one ready row.', inputAid?.summary);
  assertCondition(issues, inputAid?.summary?.invalidRows === 0, 'Input aid must expose zero invalid rows.', inputAid?.summary);
  assertCondition(issues, reportStatus(prewrite) === 'ready-for-data-patch', 'Prewrite must be ready-for-data-patch.', reportStatus(prewrite));
  assertCondition(issues, prewrite?.summary?.approvedRows === 1, 'Prewrite must contain one approved row.', prewrite?.summary);
  assertCondition(issues, prewrite?.summary?.patchPreviewRows === 1, 'Prewrite must contain one patch preview row.', prewrite?.summary);
  assertCondition(issues, prewrite?.summary?.productionWriteAllowed === false, 'Prewrite productionWriteAllowed must be false.', prewrite?.summary);
  assertCondition(issues, prewrite?.summary?.productionDataChanged === false, 'Prewrite productionDataChanged must be false.', prewrite?.summary);
  assertCondition(issues, patchPayload?.sectionId === DRY_RUN_TARGET_SECTION_ID, 'Patch payload must target the dry-run section.', patchPayload);
  assertCondition(issues, patchPayload?.sectionKind === 'SEAT_SECTION', 'Patch payload must remain a seat section.', patchPayload);
  assertCondition(issues, patchPayload?.validation?.status === 'PASS', 'Patch payload validationStatus must be PASS.', patchPayload);
  assertCondition(issues, patchReviewRow?.visualPathLocked === true, 'Patch review row must lock visualPath.', patchReviewRow);
  assertCondition(issues, patchReviewRow?.hitPathChanged === true, 'Patch review row must prove hitPath changed.', patchReviewRow);
  assertCondition(issues, patchReviewRow?.validationIssueCount === 0, 'Patch review row must have zero validation issues.', patchReviewRow);
  assertCondition(issues, reportStatus(applyReady) === 'ready-for-manual-apply', 'Apply-ready status must be ready-for-manual-apply.', reportStatus(applyReady));
  assertCondition(issues, applyReady?.summary?.manualPatchReviewReady === true, 'Apply-ready must mark manual patch review ready.', applyReady?.summary);
  assertCondition(issues, applyReady?.summary?.sourceDataWritePerformed === false, 'Apply-ready sourceDataWritePerformed must be false.', applyReady?.summary);
  assertCondition(issues, reportStatus(postApply) === 'not-applied', 'Post-apply audit must remain not-applied.', reportStatus(postApply));
  assertCondition(issues, postApply?.summary?.unappliedRows === 1, 'Post-apply audit must expose one unapplied row.', postApply?.summary);
  assertCondition(issues, reportStatus(operatorStatus) === 'ready-for-manual-apply', 'Operator status must be ready-for-manual-apply.', reportStatus(operatorStatus));
  assertCondition(issues, operatorStatus?.summary?.notAppliedRows === 1, 'Operator status must expose one not-applied row.', operatorStatus?.summary);
  assertCondition(issues, statusRow?.rowStatus === 'NOT_APPLIED', 'Operator status row must be NOT_APPLIED.', statusRow);
  assertCondition(issues, reportStatus(manualPatchPlan) === 'ready-for-manual-apply', 'Manual patch plan must be ready-for-manual-apply.', reportStatus(manualPatchPlan));
  assertCondition(issues, manualPatchPlan?.summary?.manualPatchRows === 1, 'Manual patch plan must expose one row.', manualPatchPlan?.summary);
  assertCondition(issues, manualPatchRow?.action === 'MANUAL_PATCH_REQUIRED', 'Manual patch row action must be MANUAL_PATCH_REQUIRED.', manualPatchRow);
  assertCondition(issues, manualPatchRow?.targetSourceFile === SOURCE_DATA_FILE, 'Manual patch row target source file must be src/data/sajikSeatData.ts.', manualPatchRow);
  assertCondition(issues, manualPatchRow?.visualPathLocked === true, 'Manual patch row visualPathLocked must be true.', manualPatchRow);
  assertCondition(
    issues,
    isSameStringArray(manualPatchRow?.writableSourceFields, [
      'imageGeometry.hitPath',
      'imageGeometry.labelPoint',
      'imageGeometry.labelX',
      'imageGeometry.labelY',
    ]),
    'Manual patch writableSourceFields must be limited to hitPath and label fields.',
    manualPatchRow?.writableSourceFields,
  );
  assertCondition(
    issues,
    isSameStringArray(manualPatchRow?.lockedSourceFields, [
      'imageGeometry.visualPath',
      'imageGeometry.geometryVersion',
      'sectionKind',
      'markerType',
      'mapInteractionStatus',
      'traceSource',
      'traceMethod',
      'traceVersion',
    ]),
    'Manual patch lockedSourceFields must protect render identity and trace metadata.',
    manualPatchRow?.lockedSourceFields,
  );
  assertCondition(issues, String(manualPatchRow?.tsFragment ?? '').includes("sectionId: '021'"), 'Manual patch TypeScript fragment must include sectionId 021.', manualPatchRow?.tsFragment);
  assertCondition(issues, reportStatus(realApprovalReadiness) === 'ready-for-manual-apply', 'Real approval readiness must be ready-for-manual-apply.', reportStatus(realApprovalReadiness));
  assertCondition(issues, realApprovalReadiness?.summary?.approvedRows === 1, 'Real approval readiness must see one approved row.', realApprovalReadiness?.summary);
  assertCondition(issues, realApprovalReadiness?.summary?.approvedNotAppliedRows === 1, 'Real approval readiness must report one APPROVED_NOT_APPLIED row.', realApprovalReadiness?.summary);
  assertCondition(issues, realApprovalReadiness?.summary?.approvedBlockedRows === 0, 'Real approval readiness must report zero APPROVED_BLOCKED rows.', realApprovalReadiness?.summary);
  assertCondition(issues, realApprovalReadiness?.summary?.manualPatchRows === 1, 'Real approval readiness must mirror one manual patch row.', realApprovalReadiness?.summary);
  assertCondition(issues, realApprovalReadiness?.summary?.safetyContract?.sourceDataWritePerformed === false, 'Real approval readiness sourceDataWritePerformed must be false.', realApprovalReadiness?.summary);
  assertCondition(issues, realApprovalReadiness?.summary?.safetyContract?.productionWriteAllowed === false, 'Real approval readiness productionWriteAllowed must be false.', realApprovalReadiness?.summary);
  assertCondition(issues, realApprovalReadiness?.summary?.safetyContract?.productionDataChanged === false, 'Real approval readiness productionDataChanged must be false.', realApprovalReadiness?.summary);
  assertCondition(issues, readinessRow?.readinessStatus === 'APPROVED_NOT_APPLIED', 'Dry-run approved row must be APPROVED_NOT_APPLIED.', readinessRow);
  assertCondition(issues, readinessRow?.readinessAction === 'APPLY_MANUAL_PATCH', 'Dry-run readiness action must be APPLY_MANUAL_PATCH.', readinessRow);

  const report = {
    version: DRY_RUN_VERSION,
    targetSectionId: DRY_RUN_TARGET_SECTION_ID,
    status: issues.length === 0 ? 'passed' : 'failed',
    generatedAt: new Date().toISOString(),
    inputs: {
      baseInput: formatRelative(baseInputPath),
      dryRunInput: formatRelative(dryRunInputPath),
    },
    outputs: {
      inputAid: formatRelative(inputAidPath),
      prewrite: formatRelative(prewritePath),
      applyReady: formatRelative(applyReadyPath),
      patchPreview: formatRelative(patchPreviewPath),
      postApply: formatRelative(postApplyPath),
      operatorStatus: formatRelative(operatorStatusPath),
      manualPatchPlan: formatRelative(manualPatchPlanPath),
      realApprovalReadiness: formatRelative(realApprovalReadinessPath),
      dryRunJson: formatRelative(dryRunJsonPath),
      dryRunMarkdown: formatRelative(dryRunMarkdownPath),
    },
    flow: {
      inputAidStatus: reportStatus(inputAid),
      prewriteStatus: reportStatus(prewrite),
      applyReadyStatus: reportStatus(applyReady),
      postApplyStatus: reportStatus(postApply),
      operatorStatus: reportStatus(operatorStatus),
      manualPatchPlanStatus: reportStatus(manualPatchPlan),
      realApprovalReadinessStatus: reportStatus(realApprovalReadiness),
      manualPatchRows: manualPatchPlan?.summary?.manualPatchRows ?? 0,
      approvedNotAppliedRows: realApprovalReadiness?.summary?.approvedNotAppliedRows ?? 0,
      approvedBlockedRows: realApprovalReadiness?.summary?.approvedBlockedRows ?? 0,
    },
    safetyContract: {
      sourceDataFile: SOURCE_DATA_FILE,
      sourceDataWritePerformed: applyReady?.summary?.sourceDataWritePerformed ?? false,
      productionWriteAllowed: prewrite?.summary?.productionWriteAllowed ?? false,
      productionDataChanged: prewrite?.summary?.productionDataChanged ?? false,
      statement: `Approved dry-run does not edit ${SOURCE_DATA_FILE}.`,
    },
    manualPatchContract: {
      action: manualPatchRow?.action ?? null,
      writableSourceFields: manualPatchRow?.writableSourceFields ?? [],
      lockedSourceFields: manualPatchRow?.lockedSourceFields ?? [],
      visualPathLocked: manualPatchRow?.visualPathLocked ?? null,
      targetSourceFile: manualPatchRow?.targetSourceFile ?? null,
    },
    realApprovalReadinessContract: {
      readinessStatus: readinessRow?.readinessStatus ?? null,
      readinessAction: readinessRow?.readinessAction ?? null,
      approvedReadinessStatuses: realApprovalReadiness?.summary?.approvedReadinessStatuses ?? [],
      status: realApprovalReadiness?.summary?.status ?? null,
      approvedNotAppliedRows: realApprovalReadiness?.summary?.approvedNotAppliedRows ?? null,
      approvedBlockedRows: realApprovalReadiness?.summary?.approvedBlockedRows ?? null,
      safetyContract: realApprovalReadiness?.summary?.safetyContract ?? null,
    },
    commandResults,
    blockers,
    issues,
  };

  await writeJson(dryRunJsonPath, report);
  await fs.writeFile(dryRunMarkdownPath, buildMarkdown(report), 'utf8');

  console.log(`stage01_approved_dry_run_json:${formatRelative(dryRunJsonPath)}`);
  console.log(`stage01_approved_dry_run_markdown:${formatRelative(dryRunMarkdownPath)}`);
  console.log(
    `status:${report.status} target=${DRY_RUN_TARGET_SECTION_ID} prewrite=${report.flow.prewriteStatus} applyReady=${report.flow.applyReadyStatus} postApply=${report.flow.postApplyStatus} readiness=${report.flow.realApprovalReadinessStatus} readinessRow=${report.realApprovalReadinessContract.readinessStatus} manualPatchRows=${report.flow.manualPatchRows} sourceDataWritePerformed=${report.safetyContract.sourceDataWritePerformed}`,
  );

  if (report.status !== 'passed') {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  const failureReport = {
    version: DRY_RUN_VERSION,
    targetSectionId: DRY_RUN_TARGET_SECTION_ID,
    status: 'failed',
    generatedAt: new Date().toISOString(),
    issues: [
      {
        message: error instanceof Error ? error.message : String(error),
      },
    ],
  };
  await writeJson(dryRunJsonPath, failureReport).catch(() => {});
  await fs.writeFile(dryRunMarkdownPath, buildMarkdown({
    ...failureReport,
    flow: {
      inputAidStatus: 'missing',
      prewriteStatus: 'missing',
      applyReadyStatus: 'missing',
      postApplyStatus: 'missing',
      operatorStatus: 'missing',
      manualPatchPlanStatus: 'missing',
      realApprovalReadinessStatus: 'missing',
      manualPatchRows: 0,
      approvedNotAppliedRows: 0,
      approvedBlockedRows: 0,
    },
    safetyContract: {
      sourceDataWritePerformed: false,
      productionWriteAllowed: false,
      productionDataChanged: false,
    },
  }), 'utf8').catch(() => {});
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
