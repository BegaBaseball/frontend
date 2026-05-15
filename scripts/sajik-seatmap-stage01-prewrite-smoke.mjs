import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  buildSajikSeatMapDataset,
} from '../src/data/sajikSeatMapDataset.ts';
import {
  pathToPoints,
  pointsToPath,
} from '../src/utils/seatMapPolygonValidator.ts';

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const stageDir = path.join(reportDir, 'sajik-stage01-operator');
const smokeRootDir = path.join(stageDir, 'smoke');
const baseInputPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json');
const summaryJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite-smoke.json');
const summaryMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite-smoke.md');

const SMOKE_VERSION = 'SAJIK_STAGE01_PREWRITE_SMOKE_V1';
const SMOKE_REVIEWER = 'STAGE01_SMOKE_OPERATOR';
const SMOKE_REVIEWED_AT = '2026-05-14T00:00:00.000Z';

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const writeJson = async (filePath, value) => {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const sectionRowFromDataset = (templateRow, section) => ({
  ...templateRow,
  sectionId: section.sectionId,
  sectionName: section.sectionName,
  blockId: section.blockId,
  seatCategoryLabel: section.seatCategoryLabel,
  level: section.level,
  floor: section.floor,
  side: section.side,
  sectionKind: section.sectionKind,
  mapInteractionStatus: section.mapInteractionStatus,
  currentVisualPath: section.visualPath,
  currentHitPath: section.hitPath,
  currentLabelX: section.labelPoint[0],
  currentLabelY: section.labelPoint[1],
  currentLabelPoint: section.labelPoint,
  correctedPath: section.hitPath,
  correctedLabelX: section.labelPoint[0],
  correctedLabelY: section.labelPoint[1],
  operatorDecision: 'APPROVED',
  reviewer: SMOKE_REVIEWER,
  reviewedAt: SMOKE_REVIEWED_AT,
  operatorNote: 'Smoke fixture row; must never be copied to production data.',
});

const setApprovedNoDelta = (input, sectionId) => {
  const row = input.corrections.find((candidate) => candidate.sectionId === sectionId);
  if (!row) {
    throw new Error(`Missing Stage 01 smoke target row: ${sectionId}`);
  }
  row.operatorDecision = 'APPROVED';
  row.correctedPath = row.currentHitPath;
  row.correctedLabelX = row.currentLabelX;
  row.correctedLabelY = row.currentLabelY;
  row.reviewer = SMOKE_REVIEWER;
  row.reviewedAt = SMOKE_REVIEWED_AT;
  row.operatorNote = 'Smoke fixture approval using the current hitPath; expects no production geometry delta.';
};

const setApprovedWithDelta = (input, sectionId) => {
  const row = input.corrections.find((candidate) => candidate.sectionId === sectionId);
  if (!row) {
    throw new Error(`Missing Stage 01 smoke target row: ${sectionId}`);
  }
  const points = pathToPoints(row.currentHitPath);
  if (points.length < 3) {
    throw new Error(`Cannot create Stage 01 delta fixture for ${sectionId}; currentHitPath has too few points.`);
  }

  const adjustedPoints = points.map(([x, y], index) => (
    index === 0 ? [Number((x + 0.5).toFixed(2)), Number((y + 0.5).toFixed(2))] : [x, y]
  ));
  row.operatorDecision = 'APPROVED';
  row.correctedPath = pointsToPath(adjustedPoints);
  row.correctedLabelX = row.currentLabelX;
  row.correctedLabelY = row.currentLabelY;
  row.reviewer = SMOKE_REVIEWER;
  row.reviewedAt = SMOKE_REVIEWED_AT;
  row.operatorNote = 'Smoke fixture approval with a tiny valid hitPath delta; must produce a manual apply candidate.';
};

const setInvalidApproved = (input, sectionId) => {
  const row = input.corrections.find((candidate) => candidate.sectionId === sectionId);
  if (!row) {
    throw new Error(`Missing Stage 01 smoke target row: ${sectionId}`);
  }
  row.operatorDecision = 'APPROVED';
  row.correctedPath = 'M 0 0 L 10 0 Z';
  row.correctedLabelX = '';
  row.correctedLabelY = '';
  row.reviewer = '';
  row.reviewedAt = 'not-a-date';
  row.operatorNote = 'Smoke fixture invalid approval; must be blocked by prewrite.';
};

const setInvalidPathApproved = (input, sectionId) => {
  const row = input.corrections.find((candidate) => candidate.sectionId === sectionId);
  if (!row) {
    throw new Error(`Missing Stage 01 smoke target row: ${sectionId}`);
  }
  row.operatorDecision = 'APPROVED';
  row.correctedPath = 'M 0 0 L 10 0 Z';
  row.correctedLabelX = 5;
  row.correctedLabelY = 0;
  row.reviewer = SMOKE_REVIEWER;
  row.reviewedAt = SMOKE_REVIEWED_AT;
  row.operatorNote = 'Smoke fixture invalid path; must be blocked before patch preview.';
};

const setInvalidLabelApproved = (input, sectionId) => {
  const row = input.corrections.find((candidate) => candidate.sectionId === sectionId);
  if (!row) {
    throw new Error(`Missing Stage 01 smoke target row: ${sectionId}`);
  }
  row.operatorDecision = 'APPROVED';
  row.correctedPath = row.currentHitPath;
  row.correctedLabelX = 0;
  row.correctedLabelY = 0;
  row.reviewer = SMOKE_REVIEWER;
  row.reviewedAt = SMOKE_REVIEWED_AT;
  row.operatorNote = 'Smoke fixture invalid labelPoint; must be blocked before patch preview.';
};

const setUnknownSectionApproved = (input, sectionId) => {
  const row = input.corrections.find((candidate) => candidate.sectionId === sectionId);
  if (!row) {
    throw new Error(`Missing Stage 01 smoke target row: ${sectionId}`);
  }
  row.sectionId = '999-UNKNOWN';
  row.blockId = '999-UNKNOWN';
  row.sectionName = 'Unknown smoke section';
  row.operatorDecision = 'APPROVED';
  row.correctedPath = row.currentHitPath;
  row.correctedLabelX = row.currentLabelX;
  row.correctedLabelY = row.currentLabelY;
  row.reviewer = SMOKE_REVIEWER;
  row.reviewedAt = SMOKE_REVIEWED_AT;
  row.operatorNote = 'Smoke fixture unknown section; must be blocked before patch preview.';
};

const setForbiddenRows = (input, dataset) => {
  const aliasOnlySection = dataset.sections.find((section) => section.sectionKind === 'ALIAS_ONLY');
  const markerSection = dataset.sections.find((section) => section.sectionKind === 'ACCESSIBILITY_MARKER');
  if (!aliasOnlySection || !markerSection) {
    throw new Error('Missing alias-only or accessibility marker section for Sajik Stage 01 smoke.');
  }

  input.corrections[0] = sectionRowFromDataset(input.corrections[0], aliasOnlySection);
  input.corrections[1] = sectionRowFromDataset(input.corrections[1], markerSection);
};

const setDecisionRows = (input) => {
  const rejectedRow = input.corrections.find((candidate) => candidate.sectionId === '021');
  const needsRetraceRow = input.corrections.find((candidate) => candidate.sectionId === '022');
  const keepCurrentRow = input.corrections.find((candidate) => candidate.sectionId === '031');
  if (!rejectedRow || !needsRetraceRow || !keepCurrentRow) {
    throw new Error('Missing Stage 01 smoke decision rows: 021/022/031');
  }

  rejectedRow.operatorDecision = 'REJECTED';
  rejectedRow.operatorNote = 'Smoke fixture rejection; must stay out of patch preview.';
  needsRetraceRow.operatorDecision = 'NEEDS_RETRACE';
  needsRetraceRow.operatorNote = 'Smoke fixture retrace request; must stay out of patch preview.';
  keepCurrentRow.operatorDecision = 'KEEP_CURRENT';
  keepCurrentRow.operatorNote = 'Smoke fixture keep-current decision; must stay out of patch preview.';
};

const setMixedRows = (input) => {
  setApprovedWithDelta(input, '021');
  const rejectedRow = input.corrections.find((candidate) => candidate.sectionId === '022');
  const keepCurrentRow = input.corrections.find((candidate) => candidate.sectionId === '031');
  if (!rejectedRow || !keepCurrentRow) {
    throw new Error('Missing Stage 01 smoke mixed rows: 022/031');
  }
  rejectedRow.operatorDecision = 'REJECTED';
  rejectedRow.operatorNote = 'Smoke fixture mixed rejection; must stay out of patch preview.';
  keepCurrentRow.operatorDecision = 'KEEP_CURRENT';
  keepCurrentRow.operatorNote = 'Smoke fixture mixed keep-current; must stay out of patch preview.';
};

const tamperVisualPathForReadiness = ({ prewriteReport }) => {
  const payload = prewriteReport.patchPayloads?.[0];
  if (!payload) {
    throw new Error('tampered-visual-path-readiness requires a patch payload.');
  }
  payload.after.visualPath = payload.after.visualPath.replace(/Z\s*$/u, ' L 0 0 Z');
  const reviewRow = prewriteReport.patchReviewRows?.[0];
  if (reviewRow) {
    reviewRow.visualPathLocked = false;
  }
};

const tamperTargetSourceForReadiness = ({ manualPatchPlanReport }) => {
  manualPatchPlanReport.summary.targetSourceFile = 'src/data/notSajikSeatData.ts';
  for (const row of manualPatchPlanReport.rows ?? []) {
    row.targetSourceFile = 'src/data/notSajikSeatData.ts';
  }
};

const simulateAppliedForReadiness = ({ postApplyReport, operatorStatusReport, manualPatchPlanReport }) => {
  const appliedSectionIds = new Set((postApplyReport.rows ?? []).map((row) => row.sectionId));
  const approvedRows = operatorStatusReport.summary?.approvedRows ?? appliedSectionIds.size;

  postApplyReport.summary.status = 'applied';
  postApplyReport.summary.appliedRows = appliedSectionIds.size;
  postApplyReport.summary.unappliedRows = 0;
  postApplyReport.summary.blockers = [];
  postApplyReport.summary.warnings = [];
  for (const row of postApplyReport.rows ?? []) {
    row.applied = true;
    row.hitPathMatches = true;
    row.labelPointMatches = true;
    row.legacyLabelMatches = true;
    row.visualPathLocked = true;
    row.reasons = [];
  }

  operatorStatusReport.summary.status = 'applied';
  operatorStatusReport.summary.appliedRows = approvedRows;
  operatorStatusReport.summary.notAppliedRows = 0;
  operatorStatusReport.summary.manualPatchChecklistRows = 0;
  operatorStatusReport.summary.statusCounts = {
    APPLIED: approvedRows,
    PENDING: Math.max(0, (operatorStatusReport.summary.totalRows ?? 0) - approvedRows),
  };
  operatorStatusReport.summary.warnings = [];
  for (const row of operatorStatusReport.rows ?? []) {
    if (appliedSectionIds.has(row.sectionId)) {
      row.rowStatus = 'APPLIED';
      row.action = 'NO_ACTION';
      row.postApplyStatus = 'applied';
      row.postApplyReasons = [];
    }
  }
  operatorStatusReport.manualPatchChecklist = [];

  manualPatchPlanReport.summary.status = 'applied';
  manualPatchPlanReport.summary.appliedRows = approvedRows;
  manualPatchPlanReport.summary.notAppliedRows = 0;
  manualPatchPlanReport.summary.manualPatchRows = 0;
  manualPatchPlanReport.summary.warnings = [];
  manualPatchPlanReport.rows = [];
};

const runPrewrite = async ({ caseId, input, tamperReadinessReports = null }) => {
  const caseDir = path.join(smokeRootDir, caseId);
  const caseInputPath = path.join(caseDir, 'sajik-seatmap-stage01-operator-input.json');
  const outputDir = path.join(caseDir, 'output');
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(caseInputPath, `${JSON.stringify(input, null, 2)}\n`, 'utf8');

  let inputAidExitCode = 0;
  let inputAidStdout = '';
  let inputAidStderr = '';
  try {
    const result = await execFileAsync(process.execPath, [
      '--import',
      'tsx',
      'scripts/sajik-seatmap-stage01-operator-input-aid.mjs',
      '--input',
      caseInputPath,
      '--stage-dir',
      outputDir,
    ], { cwd: frontendRoot });
    inputAidStdout = result.stdout;
    inputAidStderr = result.stderr;
  } catch (error) {
    inputAidExitCode = error?.code ?? 1;
    inputAidStdout = error?.stdout ?? '';
    inputAidStderr = error?.stderr ?? '';
  }
  const inputAidReportPath = path.join(outputDir, 'sajik-seatmap-stage01-operator-input-aid.json');
  const inputAidReport = await readJson(inputAidReportPath);

  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  try {
    const result = await execFileAsync(process.execPath, [
      '--import',
      'tsx',
      'scripts/sajik-seatmap-stage01-prewrite.mjs',
      '--input',
      caseInputPath,
      '--stage-dir',
      outputDir,
    ], { cwd: frontendRoot });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    exitCode = error?.code ?? 1;
    stdout = error?.stdout ?? '';
    stderr = error?.stderr ?? '';
  }

  const reportPath = path.join(outputDir, 'sajik-seatmap-stage01-prewrite.json');
  const patchPreviewPath = path.join(outputDir, 'sajik-seatmap-stage01-prewrite.patch-preview.ts');
  const report = await readJson(reportPath);
  const patchPreview = await fs.readFile(patchPreviewPath, 'utf8');

  let applyReadyExitCode = 0;
  let applyReadyStdout = '';
  let applyReadyStderr = '';
  try {
    const result = await execFileAsync(process.execPath, [
      '--import',
      'tsx',
      'scripts/sajik-seatmap-stage01-apply-ready.mjs',
      '--prewrite',
      reportPath,
      '--patch-preview',
      patchPreviewPath,
      '--stage-dir',
      outputDir,
    ], { cwd: frontendRoot });
    applyReadyStdout = result.stdout;
    applyReadyStderr = result.stderr;
  } catch (error) {
    applyReadyExitCode = error?.code ?? 1;
    applyReadyStdout = error?.stdout ?? '';
    applyReadyStderr = error?.stderr ?? '';
  }
  const applyReadyReportPath = path.join(outputDir, 'sajik-seatmap-stage01-apply-ready.json');
  const applyReadyReport = await readJson(applyReadyReportPath);

  let postApplyExitCode = 0;
  let postApplyStdout = '';
  let postApplyStderr = '';
  try {
    const result = await execFileAsync(process.execPath, [
      '--import',
      'tsx',
      'scripts/sajik-seatmap-stage01-post-apply-audit.mjs',
      '--prewrite',
      reportPath,
      '--stage-dir',
      outputDir,
    ], { cwd: frontendRoot });
    postApplyStdout = result.stdout;
    postApplyStderr = result.stderr;
  } catch (error) {
    postApplyExitCode = error?.code ?? 1;
    postApplyStdout = error?.stdout ?? '';
    postApplyStderr = error?.stderr ?? '';
  }
  const postApplyReportPath = path.join(outputDir, 'sajik-seatmap-stage01-post-apply-audit.json');
  const postApplyReport = await readJson(postApplyReportPath);

  let operatorStatusExitCode = 0;
  let operatorStatusStdout = '';
  let operatorStatusStderr = '';
  try {
    const result = await execFileAsync(process.execPath, [
      '--import',
      'tsx',
      'scripts/sajik-seatmap-stage01-operator-status.mjs',
      '--operator-input',
      caseInputPath,
      '--prewrite',
      reportPath,
      '--apply-ready',
      applyReadyReportPath,
      '--post-apply',
      postApplyReportPath,
      '--stage-dir',
      outputDir,
    ], { cwd: frontendRoot });
    operatorStatusStdout = result.stdout;
    operatorStatusStderr = result.stderr;
  } catch (error) {
    operatorStatusExitCode = error?.code ?? 1;
    operatorStatusStdout = error?.stdout ?? '';
    operatorStatusStderr = error?.stderr ?? '';
  }
  const operatorStatusReportPath = path.join(outputDir, 'sajik-seatmap-stage01-operator-status.json');
  const operatorStatusReport = await readJson(operatorStatusReportPath);

  let manualPatchPlanExitCode = 0;
  let manualPatchPlanStdout = '';
  let manualPatchPlanStderr = '';
  try {
    const result = await execFileAsync(process.execPath, [
      '--import',
      'tsx',
      'scripts/sajik-seatmap-stage01-manual-patch-plan.mjs',
      '--operator-status',
      operatorStatusReportPath,
      '--prewrite',
      reportPath,
      '--stage-dir',
      outputDir,
    ], { cwd: frontendRoot });
    manualPatchPlanStdout = result.stdout;
    manualPatchPlanStderr = result.stderr;
  } catch (error) {
    manualPatchPlanExitCode = error?.code ?? 1;
    manualPatchPlanStdout = error?.stdout ?? '';
    manualPatchPlanStderr = error?.stderr ?? '';
  }
  const manualPatchPlanReportPath = path.join(outputDir, 'sajik-seatmap-stage01-manual-patch-plan.json');
  const manualPatchPlanReport = await readJson(manualPatchPlanReportPath);

  if (tamperReadinessReports) {
    tamperReadinessReports({
      prewriteReport: report,
      applyReadyReport,
      postApplyReport,
      operatorStatusReport,
      manualPatchPlanReport,
    });
    await writeJson(reportPath, report);
    await writeJson(applyReadyReportPath, applyReadyReport);
    await writeJson(postApplyReportPath, postApplyReport);
    await writeJson(operatorStatusReportPath, operatorStatusReport);
    await writeJson(manualPatchPlanReportPath, manualPatchPlanReport);
  }

  let realApprovalReadinessExitCode = 0;
  let realApprovalReadinessStdout = '';
  let realApprovalReadinessStderr = '';
  try {
    const result = await execFileAsync(process.execPath, [
      '--import',
      'tsx',
      'scripts/sajik-seatmap-stage01-real-approval-readiness.mjs',
      '--operator-input',
      caseInputPath,
      '--input-aid',
      inputAidReportPath,
      '--prewrite',
      reportPath,
      '--apply-ready',
      applyReadyReportPath,
      '--post-apply',
      postApplyReportPath,
      '--operator-status',
      operatorStatusReportPath,
      '--manual-patch-plan',
      manualPatchPlanReportPath,
      '--stage-dir',
      outputDir,
    ], { cwd: frontendRoot });
    realApprovalReadinessStdout = result.stdout;
    realApprovalReadinessStderr = result.stderr;
  } catch (error) {
    realApprovalReadinessExitCode = error?.code ?? 1;
    realApprovalReadinessStdout = error?.stdout ?? '';
    realApprovalReadinessStderr = error?.stderr ?? '';
  }
  const realApprovalReadinessReportPath = path.join(outputDir, 'sajik-seatmap-stage01-real-approval-readiness.json');
  const realApprovalReadinessReport = await readJson(realApprovalReadinessReportPath);

  return {
    caseId,
    input: path.relative(frontendRoot, caseInputPath),
    inputAidReport: path.relative(frontendRoot, inputAidReportPath),
    report: path.relative(frontendRoot, reportPath),
    patchPreview: path.relative(frontendRoot, patchPreviewPath),
    applyReadyReport: path.relative(frontendRoot, applyReadyReportPath),
    postApplyReport: path.relative(frontendRoot, postApplyReportPath),
    operatorStatusReport: path.relative(frontendRoot, operatorStatusReportPath),
    manualPatchPlanReport: path.relative(frontendRoot, manualPatchPlanReportPath),
    realApprovalReadinessReport: path.relative(frontendRoot, realApprovalReadinessReportPath),
    inputAidExitCode,
    exitCode,
    applyReadyExitCode,
    postApplyExitCode,
    operatorStatusExitCode,
    manualPatchPlanExitCode,
    realApprovalReadinessExitCode,
    inputAidStdout: inputAidStdout.trim(),
    inputAidStderr: inputAidStderr.trim(),
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    applyReadyStdout: applyReadyStdout.trim(),
    applyReadyStderr: applyReadyStderr.trim(),
    postApplyStdout: postApplyStdout.trim(),
    postApplyStderr: postApplyStderr.trim(),
    operatorStatusStdout: operatorStatusStdout.trim(),
    operatorStatusStderr: operatorStatusStderr.trim(),
    manualPatchPlanStdout: manualPatchPlanStdout.trim(),
    manualPatchPlanStderr: manualPatchPlanStderr.trim(),
    realApprovalReadinessStdout: realApprovalReadinessStdout.trim(),
    realApprovalReadinessStderr: realApprovalReadinessStderr.trim(),
    inputAidSummary: inputAidReport.summary,
    inputAidRows: inputAidReport.rows ?? [],
    summary: report.summary,
    applyReadySummary: applyReadyReport.summary,
    postApplySummary: postApplyReport.summary,
    operatorStatusSummary: operatorStatusReport.summary,
    operatorStatusRows: operatorStatusReport.rows ?? [],
    manualPatchPlanSummary: manualPatchPlanReport.summary,
    manualPatchPlanRows: manualPatchPlanReport.rows ?? [],
    realApprovalReadinessSummary: realApprovalReadinessReport.summary,
    realApprovalReadinessRows: realApprovalReadinessReport.rows ?? [],
    rows: report.rows,
    patchPayloadCount: report.patchPayloads?.length ?? 0,
    patchPreviewText: patchPreview,
  };
};

const includesText = (values, pattern) => values.some((value) => String(value).includes(pattern));

const validateCase = (result, expectations) => {
  const assertions = [];
  const addAssertion = (name, passed, detail = '') => {
    assertions.push({ name, passed, detail });
  };

  addAssertion('exitCode', result.exitCode === expectations.exitCode, `${result.exitCode} !== ${expectations.exitCode}`);
  addAssertion('status', result.summary.status === expectations.status, `${result.summary.status} !== ${expectations.status}`);
  addAssertion('approvedRows', result.summary.approvedRows === expectations.approvedRows, `${result.summary.approvedRows} !== ${expectations.approvedRows}`);
  addAssertion('patchPreviewRows', result.summary.patchPreviewRows === expectations.patchPreviewRows, `${result.summary.patchPreviewRows} !== ${expectations.patchPreviewRows}`);
  addAssertion('productionDataChanged', result.summary.productionDataChanged === false, String(result.summary.productionDataChanged));
  addAssertion('productionWriteAllowed', result.summary.productionWriteAllowed === false, String(result.summary.productionWriteAllowed));

  if (expectations.inputAidStatus) {
    addAssertion('inputAidExitCode', result.inputAidExitCode === expectations.inputAidExitCode, `${result.inputAidExitCode} !== ${expectations.inputAidExitCode}`);
    addAssertion('inputAidStatus', result.inputAidSummary.status === expectations.inputAidStatus, `${result.inputAidSummary.status} !== ${expectations.inputAidStatus}`);
    addAssertion('inputAidReadyRows', result.inputAidSummary.readyForPrewriteRows === expectations.inputAidReadyRows, `${result.inputAidSummary.readyForPrewriteRows} !== ${expectations.inputAidReadyRows}`);
    addAssertion('inputAidRejectedRows', result.inputAidSummary.rejectedRows === expectations.inputAidRejectedRows, `${result.inputAidSummary.rejectedRows} !== ${expectations.inputAidRejectedRows}`);
    addAssertion('inputAidNeedsRetraceRows', result.inputAidSummary.needsRetraceRows === expectations.inputAidNeedsRetraceRows, `${result.inputAidSummary.needsRetraceRows} !== ${expectations.inputAidNeedsRetraceRows}`);
    if (expectations.inputAidKeepCurrentRows !== undefined) {
      addAssertion('inputAidKeepCurrentRows', result.inputAidSummary.keepCurrentRows === expectations.inputAidKeepCurrentRows, `${result.inputAidSummary.keepCurrentRows} !== ${expectations.inputAidKeepCurrentRows}`);
    }
    addAssertion('inputAidInvalidRows', result.inputAidSummary.invalidRows === expectations.inputAidInvalidRows, `${result.inputAidSummary.invalidRows} !== ${expectations.inputAidInvalidRows}`);
    addAssertion('inputAidProductionWriteAllowed', result.inputAidSummary.productionWriteAllowed === false, String(result.inputAidSummary.productionWriteAllowed));
    addAssertion('inputAidSourceDataWritePerformed', result.inputAidSummary.sourceDataWritePerformed === false, String(result.inputAidSummary.sourceDataWritePerformed));
  }
  if (expectations.inputAidRowStatus) {
    addAssertion(
      `inputAidRowStatus:${expectations.inputAidRowStatus}`,
      result.inputAidRows.some((row) => row.rowStatus === expectations.inputAidRowStatus),
    );
  }
  if (expectations.inputAidRowStatuses) {
    expectations.inputAidRowStatuses.forEach((rowStatus) => {
      addAssertion(
        `inputAidRowStatus:${rowStatus}`,
        result.inputAidRows.some((row) => row.rowStatus === rowStatus),
      );
    });
  }
  if (expectations.inputAidAction) {
    addAssertion(
      `inputAidAction:${expectations.inputAidAction}`,
      result.inputAidRows.some((row) => row.action === expectations.inputAidAction),
    );
  }
  if (expectations.inputAidNextActionIncludes) {
    addAssertion(
      `inputAidNextActionIncludes:${expectations.inputAidNextActionIncludes}`,
      result.inputAidRows.some((row) => String(row.nextAction ?? '').includes(expectations.inputAidNextActionIncludes)),
    );
  }

  if (expectations.applyReadyStatus) {
    addAssertion('applyReadyExitCode', result.applyReadyExitCode === expectations.applyReadyExitCode, `${result.applyReadyExitCode} !== ${expectations.applyReadyExitCode}`);
    addAssertion('applyReadyStatus', result.applyReadySummary.status === expectations.applyReadyStatus, `${result.applyReadySummary.status} !== ${expectations.applyReadyStatus}`);
    addAssertion('applyReadyProductionDataChanged', result.applyReadySummary.productionDataChanged === false, String(result.applyReadySummary.productionDataChanged));
    addAssertion('applyReadyProductionWriteAllowed', result.applyReadySummary.productionWriteAllowed === false, String(result.applyReadySummary.productionWriteAllowed));
    addAssertion('applyReadySourceDataWritePerformed', result.applyReadySummary.sourceDataWritePerformed === false, String(result.applyReadySummary.sourceDataWritePerformed));
  }
  if (expectations.postApplyStatus) {
    addAssertion('postApplyExitCode', result.postApplyExitCode === expectations.postApplyExitCode, `${result.postApplyExitCode} !== ${expectations.postApplyExitCode}`);
    addAssertion('postApplyStatus', result.postApplySummary.status === expectations.postApplyStatus, `${result.postApplySummary.status} !== ${expectations.postApplyStatus}`);
    addAssertion('postApplyReadOnly', result.postApplySummary.readOnly === true, String(result.postApplySummary.readOnly));
    addAssertion('postApplyProductionWriteAllowed', result.postApplySummary.productionWriteAllowed === false, String(result.postApplySummary.productionWriteAllowed));
    addAssertion('postApplySourceDataWritePerformed', result.postApplySummary.sourceDataWritePerformed === false, String(result.postApplySummary.sourceDataWritePerformed));
  }
  if (expectations.operatorStatus) {
    addAssertion('operatorStatusExitCode', result.operatorStatusExitCode === expectations.operatorStatusExitCode, `${result.operatorStatusExitCode} !== ${expectations.operatorStatusExitCode}`);
    addAssertion('operatorStatus', result.operatorStatusSummary.status === expectations.operatorStatus, `${result.operatorStatusSummary.status} !== ${expectations.operatorStatus}`);
    addAssertion('operatorStatusProductionWriteAllowed', result.operatorStatusSummary.productionWriteAllowed === false, String(result.operatorStatusSummary.productionWriteAllowed));
    addAssertion('operatorStatusSourceDataWritePerformed', result.operatorStatusSummary.sourceDataWritePerformed === false, String(result.operatorStatusSummary.sourceDataWritePerformed));
  }
  if (expectations.manualPatchPlanStatus) {
    addAssertion('manualPatchPlanExitCode', result.manualPatchPlanExitCode === expectations.manualPatchPlanExitCode, `${result.manualPatchPlanExitCode} !== ${expectations.manualPatchPlanExitCode}`);
    addAssertion('manualPatchPlanStatus', result.manualPatchPlanSummary.status === expectations.manualPatchPlanStatus, `${result.manualPatchPlanSummary.status} !== ${expectations.manualPatchPlanStatus}`);
    addAssertion('manualPatchPlanRows', result.manualPatchPlanSummary.manualPatchRows === expectations.manualPatchPlanRows, `${result.manualPatchPlanSummary.manualPatchRows} !== ${expectations.manualPatchPlanRows}`);
    addAssertion('manualPatchPlanProductionWriteAllowed', result.manualPatchPlanSummary.productionWriteAllowed === false, String(result.manualPatchPlanSummary.productionWriteAllowed));
    addAssertion('manualPatchPlanSourceDataWritePerformed', result.manualPatchPlanSummary.sourceDataWritePerformed === false, String(result.manualPatchPlanSummary.sourceDataWritePerformed));
  }
  if (expectations.operatorRowStatus) {
    addAssertion(
      `operatorRowStatus:${expectations.operatorRowStatus}`,
      result.operatorStatusRows.some((row) => row.rowStatus === expectations.operatorRowStatus),
    );
  }
  if (expectations.operatorRowStatuses) {
    expectations.operatorRowStatuses.forEach((rowStatus) => {
      addAssertion(
        `operatorRowStatus:${rowStatus}`,
        result.operatorStatusRows.some((row) => row.rowStatus === rowStatus),
      );
    });
  }
  if (expectations.manualPatchPlanAction) {
    addAssertion(
      `manualPatchPlanAction:${expectations.manualPatchPlanAction}`,
      result.manualPatchPlanRows.some((row) => row.action === expectations.manualPatchPlanAction),
    );
  }
  if (expectations.realApprovalReadinessStatus) {
    addAssertion('realApprovalReadinessExitCode', result.realApprovalReadinessExitCode === expectations.realApprovalReadinessExitCode, `${result.realApprovalReadinessExitCode} !== ${expectations.realApprovalReadinessExitCode}`);
    addAssertion('realApprovalReadinessStatus', result.realApprovalReadinessSummary.status === expectations.realApprovalReadinessStatus, `${result.realApprovalReadinessSummary.status} !== ${expectations.realApprovalReadinessStatus}`);
    addAssertion('realApprovalReadinessApprovedRows', result.realApprovalReadinessSummary.approvedRows === expectations.realApprovalReadinessApprovedRows, `${result.realApprovalReadinessSummary.approvedRows} !== ${expectations.realApprovalReadinessApprovedRows}`);
    addAssertion('realApprovalReadinessReadyRows', result.realApprovalReadinessSummary.approvedReadyRows === expectations.realApprovalReadinessReadyRows, `${result.realApprovalReadinessSummary.approvedReadyRows} !== ${expectations.realApprovalReadinessReadyRows}`);
    addAssertion('realApprovalReadinessNotAppliedRows', result.realApprovalReadinessSummary.approvedNotAppliedRows === expectations.realApprovalReadinessNotAppliedRows, `${result.realApprovalReadinessSummary.approvedNotAppliedRows} !== ${expectations.realApprovalReadinessNotAppliedRows}`);
    addAssertion('realApprovalReadinessAppliedRows', result.realApprovalReadinessSummary.approvedAppliedRows === expectations.realApprovalReadinessAppliedRows, `${result.realApprovalReadinessSummary.approvedAppliedRows} !== ${expectations.realApprovalReadinessAppliedRows}`);
    addAssertion('realApprovalReadinessBlockedRows', result.realApprovalReadinessSummary.approvedBlockedRows === expectations.realApprovalReadinessBlockedRows, `${result.realApprovalReadinessSummary.approvedBlockedRows} !== ${expectations.realApprovalReadinessBlockedRows}`);
    addAssertion('realApprovalReadinessManualPatchRows', result.realApprovalReadinessSummary.manualPatchRows === expectations.realApprovalReadinessManualPatchRows, `${result.realApprovalReadinessSummary.manualPatchRows} !== ${expectations.realApprovalReadinessManualPatchRows}`);
    addAssertion('realApprovalReadinessSourceDataWritePerformed', result.realApprovalReadinessSummary.safetyContract?.sourceDataWritePerformed === false, String(result.realApprovalReadinessSummary.safetyContract?.sourceDataWritePerformed));
    addAssertion('realApprovalReadinessProductionWriteAllowed', result.realApprovalReadinessSummary.safetyContract?.productionWriteAllowed === false, String(result.realApprovalReadinessSummary.safetyContract?.productionWriteAllowed));
    addAssertion('realApprovalReadinessProductionDataChanged', result.realApprovalReadinessSummary.safetyContract?.productionDataChanged === false, String(result.realApprovalReadinessSummary.safetyContract?.productionDataChanged));
  }
  if (expectations.realApprovalReadinessRowStatus) {
    addAssertion(
      `realApprovalReadinessRowStatus:${expectations.realApprovalReadinessRowStatus}`,
      result.realApprovalReadinessRows.some((row) => row.readinessStatus === expectations.realApprovalReadinessRowStatus),
    );
  }
  if (expectations.realApprovalReadinessAction) {
    addAssertion(
      `realApprovalReadinessAction:${expectations.realApprovalReadinessAction}`,
      result.realApprovalReadinessRows.some((row) => row.readinessAction === expectations.realApprovalReadinessAction),
    );
  }
  if (expectations.realApprovalReadinessBlocker) {
    addAssertion(
      `realApprovalReadinessBlocker:${expectations.realApprovalReadinessBlocker}`,
      includesText(result.realApprovalReadinessSummary.blockers ?? [], expectations.realApprovalReadinessBlocker),
    );
  }
  if (expectations.realApprovalReadinessWarning) {
    addAssertion(
      `realApprovalReadinessWarning:${expectations.realApprovalReadinessWarning}`,
      includesText(result.realApprovalReadinessSummary.warnings ?? [], expectations.realApprovalReadinessWarning),
    );
  }

  if (expectations.rowWarning) {
    addAssertion(
      `rowWarning:${expectations.rowWarning}`,
      result.rows.some((row) => includesText(row.warnings ?? [], expectations.rowWarning)),
    );
  }
  if (expectations.rowWarningAbsent) {
    addAssertion(
      `rowWarningAbsent:${expectations.rowWarningAbsent}`,
      result.rows.every((row) => !includesText(row.warnings ?? [], expectations.rowWarningAbsent)),
    );
  }
  if (expectations.geometryDelta !== undefined) {
    addAssertion(
      `geometryDelta:${expectations.geometryDelta}`,
      result.rows.some((row) => row.validForPatchPreview && row.geometryDelta === expectations.geometryDelta),
    );
  }
  if (expectations.rowReason) {
    addAssertion(
      `rowReason:${expectations.rowReason}`,
      result.rows.some((row) => includesText(row.reasons ?? [], expectations.rowReason)),
    );
  }
  if (expectations.blocker) {
    addAssertion(
      `blocker:${expectations.blocker}`,
      includesText(result.summary.blockers ?? [], expectations.blocker),
    );
  }
  if (expectations.patchPreviewIncludes) {
    addAssertion(
      `patchPreviewIncludes:${expectations.patchPreviewIncludes}`,
      result.patchPreviewText.includes(expectations.patchPreviewIncludes),
    );
  }

  return {
    ...result,
    expectations,
    assertions,
    passed: assertions.every((assertion) => assertion.passed),
  };
};

const runOperatorPackagePreservation = async (input) => {
  const caseId = 'operator-input-preservation';
  const caseDir = path.join(smokeRootDir, caseId);
  const caseInputPath = path.join(caseDir, 'sajik-seatmap-stage01-operator-input.json');
  const caseWorksetsPath = path.join(reportDir, 'sajik-seatmap-zone-precision-worksets.json');
  await fs.mkdir(caseDir, { recursive: true });
  await fs.writeFile(caseInputPath, `${JSON.stringify(input, null, 2)}\n`, 'utf8');

  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  try {
    const result = await execFileAsync(process.execPath, [
      '--import',
      'tsx',
      'scripts/sajik-seatmap-stage01-operator-package.mjs',
      '--stage-dir',
      caseDir,
      '--worksets',
      caseWorksetsPath,
    ], { cwd: frontendRoot });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    exitCode = error?.code ?? 1;
    stdout = error?.stdout ?? '';
    stderr = error?.stderr ?? '';
  }

  const regeneratedInput = await readJson(caseInputPath);
  const packageSummaryPath = path.join(caseDir, 'sajik-seatmap-stage01-operator-package.json');
  const packageSummary = await readJson(packageSummaryPath);
  const row = regeneratedInput.corrections.find((candidate) => candidate.sectionId === '021');
  const originalRow = input.corrections.find((candidate) => candidate.sectionId === '021');
  const assertions = [];
  const addAssertion = (name, passed, detail = '') => {
    assertions.push({ name, passed, detail });
  };

  addAssertion('exitCode', exitCode === 0, `${exitCode} !== 0`);
  addAssertion('preservationStatus', packageSummary.preservationStatus === 'preserved', `${packageSummary.preservationStatus ?? ''} !== preserved`);
  addAssertion('existingEditableRows', packageSummary.existingEditableRows === 1, `${packageSummary.existingEditableRows} !== 1`);
  addAssertion('existingEditableStageRows', packageSummary.existingEditableStageRows === 1, `${packageSummary.existingEditableStageRows} !== 1`);
  addAssertion('preservedEditableRows', packageSummary.preservedEditableRows === 1, `${packageSummary.preservedEditableRows} !== 1`);
  addAssertion('ignoredExistingEditableRows', packageSummary.ignoredExistingEditableRows === 0, `${packageSummary.ignoredExistingEditableRows} !== 0`);
  addAssertion('approvedRows', packageSummary.approvedRows === 1, `${packageSummary.approvedRows} !== 1`);
  addAssertion('editableSource', row?.editableSource === 'existingOperatorInput', `${row?.editableSource ?? ''} !== existingOperatorInput`);
  addAssertion('operatorDecision', row?.operatorDecision === 'APPROVED', `${row?.operatorDecision ?? ''} !== APPROVED`);
  addAssertion('correctedPath', row?.correctedPath === originalRow?.correctedPath, 'correctedPath was not preserved');
  addAssertion('correctedLabelX', row?.correctedLabelX === originalRow?.correctedLabelX, 'correctedLabelX was not preserved');
  addAssertion('correctedLabelY', row?.correctedLabelY === originalRow?.correctedLabelY, 'correctedLabelY was not preserved');
  addAssertion('reviewer', row?.reviewer === SMOKE_REVIEWER, `${row?.reviewer ?? ''} !== ${SMOKE_REVIEWER}`);
  addAssertion('reviewedAt', row?.reviewedAt === SMOKE_REVIEWED_AT, `${row?.reviewedAt ?? ''} !== ${SMOKE_REVIEWED_AT}`);

  return {
    caseId,
    passed: assertions.every((assertion) => assertion.passed),
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    packageSummary: path.relative(frontendRoot, packageSummaryPath),
    regeneratedInput: path.relative(frontendRoot, caseInputPath),
    assertions,
  };
};

const baseInput = await readJson(baseInputPath);
const dataset = buildSajikSeatMapDataset();

const pendingOnlyInput = cloneJson(baseInput);

const approvedNoDeltaInput = cloneJson(baseInput);
setApprovedNoDelta(approvedNoDeltaInput, '021');

const approvedWithDeltaInput = cloneJson(baseInput);
setApprovedWithDelta(approvedWithDeltaInput, '021');

const approvedAppliedInput = cloneJson(baseInput);
setApprovedWithDelta(approvedAppliedInput, '021');

const invalidApprovedInput = cloneJson(baseInput);
setInvalidApproved(invalidApprovedInput, '021');

const invalidPathInput = cloneJson(baseInput);
setInvalidPathApproved(invalidPathInput, '021');

const invalidLabelInput = cloneJson(baseInput);
setInvalidLabelApproved(invalidLabelInput, '021');

const unknownSectionInput = cloneJson(baseInput);
setUnknownSectionApproved(unknownSectionInput, '021');

const forbiddenRowsInput = cloneJson(baseInput);
setForbiddenRows(forbiddenRowsInput, dataset);

const decisionRowsInput = cloneJson(baseInput);
setDecisionRows(decisionRowsInput);

const mixedRowsInput = cloneJson(baseInput);
setMixedRows(mixedRowsInput);

const rawCaseResults = [
  await runPrewrite({
    caseId: 'pending-only',
    input: pendingOnlyInput,
  }),
  await runPrewrite({
    caseId: 'approved-no-delta',
    input: approvedNoDeltaInput,
  }),
  await runPrewrite({
    caseId: 'approved-with-delta',
    input: approvedWithDeltaInput,
  }),
  await runPrewrite({
    caseId: 'invalid-approved-row',
    input: invalidApprovedInput,
  }),
  await runPrewrite({
    caseId: 'invalid-path-row',
    input: invalidPathInput,
  }),
  await runPrewrite({
    caseId: 'invalid-label-row',
    input: invalidLabelInput,
  }),
  await runPrewrite({
    caseId: 'unknown-section-row',
    input: unknownSectionInput,
  }),
  await runPrewrite({
    caseId: 'forbidden-alias-marker-row',
    input: forbiddenRowsInput,
  }),
  await runPrewrite({
    caseId: 'decision-rows',
    input: decisionRowsInput,
  }),
  await runPrewrite({
    caseId: 'mixed-approved-decision-pending',
    input: mixedRowsInput,
  }),
  await runPrewrite({
    caseId: 'tampered-visual-path-readiness',
    input: approvedWithDeltaInput,
    tamperReadinessReports: tamperVisualPathForReadiness,
  }),
  await runPrewrite({
    caseId: 'tampered-target-source-readiness',
    input: approvedWithDeltaInput,
    tamperReadinessReports: tamperTargetSourceForReadiness,
  }),
  await runPrewrite({
    caseId: 'approved-applied-after-manual-patch',
    input: approvedAppliedInput,
    tamperReadinessReports: simulateAppliedForReadiness,
  }),
];
const operatorPackagePreservation = await runOperatorPackagePreservation(approvedWithDeltaInput);

const caseResults = [
  validateCase(rawCaseResults[0], {
    exitCode: 0,
    status: 'waiting-for-operator',
    approvedRows: 0,
    patchPreviewRows: 0,
    inputAidExitCode: 0,
    inputAidStatus: 'waiting-for-operator',
    inputAidReadyRows: 0,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 0,
    inputAidRowStatus: 'PENDING',
    inputAidAction: 'FILL_OR_DECIDE',
    applyReadyExitCode: 0,
    applyReadyStatus: 'waiting-for-operator',
    postApplyExitCode: 0,
    postApplyStatus: 'waiting-for-operator',
    operatorStatusExitCode: 0,
    operatorStatus: 'waiting-for-operator',
    operatorRowStatus: 'PENDING',
    manualPatchPlanExitCode: 0,
    manualPatchPlanStatus: 'waiting-for-operator',
    manualPatchPlanRows: 0,
    realApprovalReadinessExitCode: 0,
    realApprovalReadinessStatus: 'waiting-for-operator',
    realApprovalReadinessApprovedRows: 0,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 0,
    realApprovalReadinessManualPatchRows: 0,
  }),
  validateCase(rawCaseResults[1], {
    exitCode: 0,
    status: 'ready-for-data-patch',
    approvedRows: 1,
    patchPreviewRows: 1,
    inputAidExitCode: 0,
    inputAidStatus: 'ready-for-prewrite',
    inputAidReadyRows: 1,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 0,
    inputAidRowStatus: 'READY_FOR_PREWRITE',
    inputAidAction: 'RUN_PREWRITE',
    inputAidNextActionIncludes: 'stage01-prewrite',
    rowWarning: 'APPROVED_NO_GEOMETRY_DELTA',
    patchPreviewIncludes: "sectionId: '021'",
    applyReadyExitCode: 0,
    applyReadyStatus: 'ready-for-manual-apply',
    postApplyExitCode: 0,
    postApplyStatus: 'applied',
    operatorStatusExitCode: 0,
    operatorStatus: 'applied',
    operatorRowStatus: 'APPLIED',
    manualPatchPlanExitCode: 0,
    manualPatchPlanStatus: 'applied',
    manualPatchPlanRows: 0,
    realApprovalReadinessExitCode: 0,
    realApprovalReadinessStatus: 'applied',
    realApprovalReadinessApprovedRows: 1,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 1,
    realApprovalReadinessBlockedRows: 0,
    realApprovalReadinessManualPatchRows: 0,
    realApprovalReadinessRowStatus: 'APPROVED_APPLIED',
    realApprovalReadinessAction: 'VERIFY_APPLIED',
    realApprovalReadinessWarning: 'APPROVED_NO_GEOMETRY_DELTA',
  }),
  validateCase(rawCaseResults[2], {
    exitCode: 0,
    status: 'ready-for-data-patch',
    approvedRows: 1,
    patchPreviewRows: 1,
    inputAidExitCode: 0,
    inputAidStatus: 'ready-for-prewrite',
    inputAidReadyRows: 1,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 0,
    inputAidRowStatus: 'READY_FOR_PREWRITE',
    inputAidAction: 'RUN_PREWRITE',
    inputAidNextActionIncludes: 'stage01-prewrite',
    rowWarningAbsent: 'APPROVED_NO_GEOMETRY_DELTA',
    geometryDelta: true,
    patchPreviewIncludes: "sectionId: '021'",
    applyReadyExitCode: 0,
    applyReadyStatus: 'ready-for-manual-apply',
    postApplyExitCode: 0,
    postApplyStatus: 'not-applied',
    operatorStatusExitCode: 0,
    operatorStatus: 'ready-for-manual-apply',
    operatorRowStatus: 'NOT_APPLIED',
    manualPatchPlanExitCode: 0,
    manualPatchPlanStatus: 'ready-for-manual-apply',
    manualPatchPlanRows: 1,
    manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
    realApprovalReadinessExitCode: 0,
    realApprovalReadinessStatus: 'ready-for-manual-apply',
    realApprovalReadinessApprovedRows: 1,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 1,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 0,
    realApprovalReadinessManualPatchRows: 1,
    realApprovalReadinessRowStatus: 'APPROVED_NOT_APPLIED',
    realApprovalReadinessAction: 'APPLY_MANUAL_PATCH',
  }),
  validateCase(rawCaseResults[3], {
    exitCode: 1,
    status: 'blocked',
    approvedRows: 1,
    patchPreviewRows: 0,
    inputAidExitCode: 1,
    inputAidStatus: 'blocked',
    inputAidReadyRows: 0,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 1,
    inputAidRowStatus: 'INVALID',
    inputAidAction: 'FIX_OPERATOR_INPUT',
    inputAidNextActionIncludes: 'Fix the listed missing fields',
    blocker: 'APPROVED_ROW_INVALID:021',
    rowReason: 'APPROVAL_FIELD_REQUIRED:reviewer',
    applyReadyExitCode: 1,
    applyReadyStatus: 'blocked',
    postApplyExitCode: 1,
    postApplyStatus: 'blocked',
    operatorStatusExitCode: 1,
    operatorStatus: 'blocked',
    operatorRowStatus: 'INVALID',
    manualPatchPlanExitCode: 1,
    manualPatchPlanStatus: 'blocked',
    manualPatchPlanRows: 0,
    realApprovalReadinessExitCode: 1,
    realApprovalReadinessStatus: 'blocked',
    realApprovalReadinessApprovedRows: 1,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 1,
    realApprovalReadinessManualPatchRows: 0,
    realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
    realApprovalReadinessAction: 'FIX_APPROVAL',
  }),
  validateCase(rawCaseResults[4], {
    exitCode: 1,
    status: 'blocked',
    approvedRows: 1,
    patchPreviewRows: 0,
    inputAidExitCode: 1,
    inputAidStatus: 'blocked',
    inputAidReadyRows: 0,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 1,
    inputAidRowStatus: 'INVALID',
    inputAidAction: 'FIX_OPERATOR_INPUT',
    inputAidNextActionIncludes: 'Fix the listed missing fields',
    blocker: 'APPROVED_ROW_INVALID:021',
    rowReason: 'MIN_POINT_COUNT_REQUIRED',
    applyReadyExitCode: 1,
    applyReadyStatus: 'blocked',
    postApplyExitCode: 1,
    postApplyStatus: 'blocked',
    operatorStatusExitCode: 1,
    operatorStatus: 'blocked',
    operatorRowStatus: 'INVALID',
    manualPatchPlanExitCode: 1,
    manualPatchPlanStatus: 'blocked',
    manualPatchPlanRows: 0,
    realApprovalReadinessExitCode: 1,
    realApprovalReadinessStatus: 'blocked',
    realApprovalReadinessApprovedRows: 1,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 1,
    realApprovalReadinessManualPatchRows: 0,
    realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
    realApprovalReadinessAction: 'FIX_APPROVAL',
  }),
  validateCase(rawCaseResults[5], {
    exitCode: 1,
    status: 'blocked',
    approvedRows: 1,
    patchPreviewRows: 0,
    inputAidExitCode: 1,
    inputAidStatus: 'blocked',
    inputAidReadyRows: 0,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 1,
    inputAidRowStatus: 'INVALID',
    inputAidAction: 'FIX_OPERATOR_INPUT',
    inputAidNextActionIncludes: 'Fix the listed missing fields',
    blocker: 'APPROVED_ROW_INVALID:021',
    rowReason: 'LABEL_OUTSIDE_POLYGON',
    applyReadyExitCode: 1,
    applyReadyStatus: 'blocked',
    postApplyExitCode: 1,
    postApplyStatus: 'blocked',
    operatorStatusExitCode: 1,
    operatorStatus: 'blocked',
    operatorRowStatus: 'INVALID',
    manualPatchPlanExitCode: 1,
    manualPatchPlanStatus: 'blocked',
    manualPatchPlanRows: 0,
    realApprovalReadinessExitCode: 1,
    realApprovalReadinessStatus: 'blocked',
    realApprovalReadinessApprovedRows: 1,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 1,
    realApprovalReadinessManualPatchRows: 0,
    realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
    realApprovalReadinessAction: 'FIX_APPROVAL',
  }),
  validateCase(rawCaseResults[6], {
    exitCode: 1,
    status: 'blocked',
    approvedRows: 1,
    patchPreviewRows: 0,
    inputAidExitCode: 1,
    inputAidStatus: 'blocked',
    inputAidReadyRows: 1,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 0,
    inputAidRowStatus: 'READY_FOR_PREWRITE',
    inputAidAction: 'RUN_PREWRITE',
    blocker: 'STAGE01_INPUT_SECTION_IDS_MISMATCH',
    rowReason: 'SECTION_NOT_FOUND',
    applyReadyExitCode: 1,
    applyReadyStatus: 'blocked',
    postApplyExitCode: 1,
    postApplyStatus: 'blocked',
    operatorStatusExitCode: 1,
    operatorStatus: 'blocked',
    operatorRowStatus: 'INVALID',
    manualPatchPlanExitCode: 1,
    manualPatchPlanStatus: 'blocked',
    manualPatchPlanRows: 0,
    realApprovalReadinessExitCode: 1,
    realApprovalReadinessStatus: 'blocked',
    realApprovalReadinessApprovedRows: 1,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 1,
    realApprovalReadinessManualPatchRows: 0,
    realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
    realApprovalReadinessAction: 'FIX_APPROVAL',
  }),
  validateCase(rawCaseResults[7], {
    exitCode: 1,
    status: 'blocked',
    approvedRows: 2,
    patchPreviewRows: 0,
    inputAidExitCode: 1,
    inputAidStatus: 'blocked',
    inputAidReadyRows: 0,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 2,
    inputAidRowStatus: 'INVALID',
    inputAidAction: 'FIX_OPERATOR_INPUT',
    inputAidNextActionIncludes: 'Fix the listed missing fields',
    blocker: 'STAGE01_INPUT_SECTION_IDS_MISMATCH',
    rowReason: 'SECTION_KIND_NOT_WRITABLE',
    applyReadyExitCode: 1,
    applyReadyStatus: 'blocked',
    postApplyExitCode: 1,
    postApplyStatus: 'blocked',
    operatorStatusExitCode: 1,
    operatorStatus: 'blocked',
    operatorRowStatus: 'INVALID',
    manualPatchPlanExitCode: 1,
    manualPatchPlanStatus: 'blocked',
    manualPatchPlanRows: 0,
    realApprovalReadinessExitCode: 1,
    realApprovalReadinessStatus: 'blocked',
    realApprovalReadinessApprovedRows: 2,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 2,
    realApprovalReadinessManualPatchRows: 0,
    realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
    realApprovalReadinessAction: 'FIX_APPROVAL',
    realApprovalReadinessBlocker: 'SECTION_KIND_NOT_WRITABLE',
  }),
  validateCase(rawCaseResults[8], {
    exitCode: 0,
    status: 'waiting-for-operator',
    approvedRows: 0,
    patchPreviewRows: 0,
    inputAidExitCode: 0,
    inputAidStatus: 'decisions-recorded',
    inputAidReadyRows: 0,
    inputAidRejectedRows: 1,
    inputAidNeedsRetraceRows: 1,
    inputAidKeepCurrentRows: 1,
    inputAidInvalidRows: 0,
    inputAidRowStatuses: ['REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'],
    inputAidAction: 'NO_PATCH_PREVIEW',
    inputAidNextActionIncludes: 'No patch preview',
    applyReadyExitCode: 0,
    applyReadyStatus: 'waiting-for-operator',
    postApplyExitCode: 0,
    postApplyStatus: 'waiting-for-operator',
    operatorStatusExitCode: 0,
    operatorStatus: 'waiting-for-operator',
    operatorRowStatuses: ['REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'],
    manualPatchPlanExitCode: 0,
    manualPatchPlanStatus: 'waiting-for-operator',
    manualPatchPlanRows: 0,
    realApprovalReadinessExitCode: 0,
    realApprovalReadinessStatus: 'waiting-for-operator',
    realApprovalReadinessApprovedRows: 0,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 0,
    realApprovalReadinessManualPatchRows: 0,
  }),
  validateCase(rawCaseResults[9], {
    exitCode: 0,
    status: 'ready-for-data-patch',
    approvedRows: 1,
    patchPreviewRows: 1,
    inputAidExitCode: 0,
    inputAidStatus: 'ready-for-prewrite',
    inputAidReadyRows: 1,
    inputAidRejectedRows: 1,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 1,
    inputAidInvalidRows: 0,
    inputAidRowStatuses: ['READY_FOR_PREWRITE', 'REJECTED', 'KEEP_CURRENT', 'PENDING'],
    inputAidAction: 'RUN_PREWRITE',
    geometryDelta: true,
    patchPreviewIncludes: "sectionId: '021'",
    applyReadyExitCode: 0,
    applyReadyStatus: 'ready-for-manual-apply',
    postApplyExitCode: 0,
    postApplyStatus: 'not-applied',
    operatorStatusExitCode: 0,
    operatorStatus: 'ready-for-manual-apply',
    operatorRowStatuses: ['NOT_APPLIED', 'REJECTED', 'KEEP_CURRENT', 'PENDING'],
    manualPatchPlanExitCode: 0,
    manualPatchPlanStatus: 'ready-for-manual-apply',
    manualPatchPlanRows: 1,
    manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
    realApprovalReadinessExitCode: 0,
    realApprovalReadinessStatus: 'ready-for-manual-apply',
    realApprovalReadinessApprovedRows: 1,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 1,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 0,
    realApprovalReadinessManualPatchRows: 1,
    realApprovalReadinessRowStatus: 'APPROVED_NOT_APPLIED',
    realApprovalReadinessAction: 'APPLY_MANUAL_PATCH',
  }),
  validateCase(rawCaseResults[10], {
    exitCode: 0,
    status: 'ready-for-data-patch',
    approvedRows: 1,
    patchPreviewRows: 1,
    inputAidExitCode: 0,
    inputAidStatus: 'ready-for-prewrite',
    inputAidReadyRows: 1,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 0,
    inputAidRowStatus: 'READY_FOR_PREWRITE',
    inputAidAction: 'RUN_PREWRITE',
    geometryDelta: true,
    applyReadyExitCode: 0,
    applyReadyStatus: 'ready-for-manual-apply',
    postApplyExitCode: 0,
    postApplyStatus: 'not-applied',
    operatorStatusExitCode: 0,
    operatorStatus: 'ready-for-manual-apply',
    operatorRowStatus: 'NOT_APPLIED',
    manualPatchPlanExitCode: 0,
    manualPatchPlanStatus: 'ready-for-manual-apply',
    manualPatchPlanRows: 1,
    manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
    realApprovalReadinessExitCode: 1,
    realApprovalReadinessStatus: 'blocked',
    realApprovalReadinessApprovedRows: 1,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 1,
    realApprovalReadinessManualPatchRows: 1,
    realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
    realApprovalReadinessAction: 'FIX_APPROVAL',
    realApprovalReadinessBlocker: 'VISUAL_PATH_CHANGED_WITHOUT_APPROVAL',
  }),
  validateCase(rawCaseResults[11], {
    exitCode: 0,
    status: 'ready-for-data-patch',
    approvedRows: 1,
    patchPreviewRows: 1,
    inputAidExitCode: 0,
    inputAidStatus: 'ready-for-prewrite',
    inputAidReadyRows: 1,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 0,
    inputAidRowStatus: 'READY_FOR_PREWRITE',
    inputAidAction: 'RUN_PREWRITE',
    geometryDelta: true,
    applyReadyExitCode: 0,
    applyReadyStatus: 'ready-for-manual-apply',
    postApplyExitCode: 0,
    postApplyStatus: 'not-applied',
    operatorStatusExitCode: 0,
    operatorStatus: 'ready-for-manual-apply',
    operatorRowStatus: 'NOT_APPLIED',
    manualPatchPlanExitCode: 0,
    manualPatchPlanStatus: 'ready-for-manual-apply',
    manualPatchPlanRows: 1,
    manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
    realApprovalReadinessExitCode: 1,
    realApprovalReadinessStatus: 'blocked',
    realApprovalReadinessApprovedRows: 1,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 0,
    realApprovalReadinessBlockedRows: 1,
    realApprovalReadinessManualPatchRows: 1,
    realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
    realApprovalReadinessAction: 'FIX_APPROVAL',
    realApprovalReadinessBlocker: 'TARGET_SOURCE_FILE_MISMATCH',
  }),
  validateCase(rawCaseResults[12], {
    exitCode: 0,
    status: 'ready-for-data-patch',
    approvedRows: 1,
    patchPreviewRows: 1,
    inputAidExitCode: 0,
    inputAidStatus: 'ready-for-prewrite',
    inputAidReadyRows: 1,
    inputAidRejectedRows: 0,
    inputAidNeedsRetraceRows: 0,
    inputAidKeepCurrentRows: 0,
    inputAidInvalidRows: 0,
    inputAidRowStatus: 'READY_FOR_PREWRITE',
    inputAidAction: 'RUN_PREWRITE',
    geometryDelta: true,
    applyReadyExitCode: 0,
    applyReadyStatus: 'ready-for-manual-apply',
    postApplyExitCode: 0,
    postApplyStatus: 'applied',
    operatorStatusExitCode: 0,
    operatorStatus: 'applied',
    operatorRowStatus: 'APPLIED',
    manualPatchPlanExitCode: 0,
    manualPatchPlanStatus: 'applied',
    manualPatchPlanRows: 0,
    realApprovalReadinessExitCode: 0,
    realApprovalReadinessStatus: 'applied',
    realApprovalReadinessApprovedRows: 1,
    realApprovalReadinessReadyRows: 0,
    realApprovalReadinessNotAppliedRows: 0,
    realApprovalReadinessAppliedRows: 1,
    realApprovalReadinessBlockedRows: 0,
    realApprovalReadinessManualPatchRows: 0,
    realApprovalReadinessRowStatus: 'APPROVED_APPLIED',
    realApprovalReadinessAction: 'VERIFY_APPLIED',
  }),
];

const failedCases = caseResults.filter((result) => !result.passed);
const failedPreservation = operatorPackagePreservation.passed ? [] : [operatorPackagePreservation];
const summary = {
  smokeVersion: SMOKE_VERSION,
  status: failedCases.length === 0 && failedPreservation.length === 0 ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  baseInput: path.relative(frontendRoot, baseInputPath),
  outputDirectory: path.relative(frontendRoot, smokeRootDir),
  cases: caseResults.length,
  passedCases: caseResults.filter((result) => result.passed).length,
  failedCases: failedCases.length,
  operatorPackagePreservationPassed: operatorPackagePreservation.passed,
  productionDataChanged: false,
  productionWriteAllowed: false,
  caseSummaries: caseResults.map((result) => ({
    caseId: result.caseId,
    passed: result.passed,
    inputAidStatus: result.inputAidSummary.status,
    inputAidReadyRows: result.inputAidSummary.readyForPrewriteRows,
    inputAidReport: result.inputAidReport,
    exitCode: result.exitCode,
    status: result.summary.status,
    approvedRows: result.summary.approvedRows,
    patchPreviewRows: result.summary.patchPreviewRows,
    applyReadyStatus: result.applyReadySummary.status,
    applyReadyReport: result.applyReadyReport,
    postApplyStatus: result.postApplySummary.status,
    postApplyReport: result.postApplyReport,
    operatorStatus: result.operatorStatusSummary.status,
    operatorStatusReport: result.operatorStatusReport,
    manualPatchPlanStatus: result.manualPatchPlanSummary.status,
    manualPatchPlanRows: result.manualPatchPlanSummary.manualPatchRows,
    manualPatchPlanReport: result.manualPatchPlanReport,
    realApprovalReadinessStatus: result.realApprovalReadinessSummary.status,
    realApprovalReadinessApprovedNotAppliedRows: result.realApprovalReadinessSummary.approvedNotAppliedRows,
    realApprovalReadinessApprovedAppliedRows: result.realApprovalReadinessSummary.approvedAppliedRows,
    realApprovalReadinessApprovedBlockedRows: result.realApprovalReadinessSummary.approvedBlockedRows,
    realApprovalReadinessReport: result.realApprovalReadinessReport,
    blockers: result.summary.blockers,
    warnings: result.summary.warnings,
    report: result.report,
  })),
  operatorPackagePreservation: {
    caseId: operatorPackagePreservation.caseId,
    passed: operatorPackagePreservation.passed,
    exitCode: operatorPackagePreservation.exitCode,
    packageSummary: operatorPackagePreservation.packageSummary,
    regeneratedInput: operatorPackagePreservation.regeneratedInput,
  },
};

const report = {
  generatedAt: summary.generatedAt,
  summary,
  safetyContract: [
    'This smoke test creates temporary Stage 01 operator inputs only under reports/stadium/sajik-stage01-operator/smoke.',
    'It never edits src/data/sajikSeatData.ts.',
    'The pending-only fixture confirms empty operator input remains waiting-for-operator with no patch preview.',
    'The approved fixtures confirm operator input aid reports READY_FOR_PREWRITE rows before prewrite.',
    'The approved-no-delta fixture confirms the ready-for-data-patch branch without changing geometry.',
    'The approved-no-delta fixture also confirms the ready-for-manual-apply apply-ready branch without writing production data.',
    'The approved-with-delta fixture confirms a changed hitPath can become a manual data patch candidate without writing production data.',
    'The approved-with-delta fixture also confirms post-apply audit reports not-applied before a manual data patch is present.',
    'The approved-with-delta fixture also confirms operator status reports rowStatus=NOT_APPLIED before a manual data patch is present.',
    'The approved-with-delta fixture also confirms manual patch plan reports MANUAL_PATCH_REQUIRED before a manual data patch is present.',
    'The approved-with-delta fixture also confirms real approval readiness reports APPROVED_NOT_APPLIED before a manual data patch is present.',
    'The approved-no-delta fixture confirms real approval readiness reports APPROVED_APPLIED with APPROVED_NO_GEOMETRY_DELTA.',
    'The approved-applied-after-manual-patch fixture simulates post-apply APPLIED reports and confirms real approval readiness reports APPROVED_APPLIED with VERIFY_APPLIED.',
    'The invalid-approved-row fixture confirms approved rows with missing fields are blocked.',
    'The invalid-path-row fixture confirms malformed correctedPath values are blocked.',
    'The invalid-label-row fixture confirms labelPoint outside the correctedPath is blocked.',
    'The unknown-section-row fixture confirms non-Stage 01 or unknown section ids are blocked.',
    'The forbidden-alias-marker-row fixture confirms alias-only and accessibility marker rows cannot enter Stage 01 seat-section patch previews.',
    'The tampered-visual-path-readiness fixture confirms real approval readiness blocks VISUAL_PATH_CHANGED_WITHOUT_APPROVAL.',
    'The tampered-target-source-readiness fixture confirms real approval readiness blocks TARGET_SOURCE_FILE_MISMATCH.',
    'The decision-rows fixture confirms REJECTED, NEEDS_RETRACE, and KEEP_CURRENT rows are decision rows only.',
    'The mixed-approved-decision-pending fixture confirms only APPROVED rows enter patch preview when decision and pending rows are present.',
    'The operator-input-preservation fixture confirms regenerated packages preserve filled editable fields.',
  ],
  cases: caseResults.map(({
    patchPreviewText: _patchPreviewText,
    inputAidStdout: _inputAidStdout,
    inputAidStderr: _inputAidStderr,
    stdout: _stdout,
    stderr: _stderr,
    applyReadyStdout: _applyReadyStdout,
    applyReadyStderr: _applyReadyStderr,
    postApplyStdout: _postApplyStdout,
    postApplyStderr: _postApplyStderr,
    operatorStatusStdout: _operatorStatusStdout,
    operatorStatusStderr: _operatorStatusStderr,
    manualPatchPlanStdout: _manualPatchPlanStdout,
    manualPatchPlanStderr: _manualPatchPlanStderr,
    realApprovalReadinessStdout: _realApprovalReadinessStdout,
    realApprovalReadinessStderr: _realApprovalReadinessStderr,
    ...result
  }) => result),
};

await fs.writeFile(summaryJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(summaryMarkdownPath, [
  '# Sajik Stage 01 Prewrite Smoke',
  '',
  `- smoke version: \`${SMOKE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- cases: \`${summary.passedCases}/${summary.cases}\``,
  `- production data changed: \`${summary.productionDataChanged}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Cases',
  '',
  markdownTable(
    ['case', 'passed', 'input-aid', 'input ready', 'exit', 'status', 'approved', 'patch previews', 'apply-ready', 'post-apply', 'operator-status', 'manual-plan', 'manual rows', 'readiness', 'not-applied', 'applied', 'blocked', 'report'],
    summary.caseSummaries.map((row) => [
      `\`${row.caseId}\``,
      `\`${row.passed}\``,
      `\`${row.inputAidStatus}\``,
      `\`${row.inputAidReadyRows}\``,
      `\`${row.exitCode}\``,
      `\`${row.status}\``,
      `\`${row.approvedRows}\``,
      `\`${row.patchPreviewRows}\``,
      `\`${row.applyReadyStatus}\``,
      `\`${row.postApplyStatus}\``,
      `\`${row.operatorStatus}\``,
      `\`${row.manualPatchPlanStatus}\``,
      `\`${row.manualPatchPlanRows}\``,
      `\`${row.realApprovalReadinessStatus}\``,
      `\`${row.realApprovalReadinessApprovedNotAppliedRows}\``,
      `\`${row.realApprovalReadinessApprovedAppliedRows}\``,
      `\`${row.realApprovalReadinessApprovedBlockedRows}\``,
      `\`${row.report}\``,
    ]),
  ),
  '',
  '## Failed Assertions',
  '',
  failedCases.length > 0 || failedPreservation.length > 0
    ? [
      ...failedCases.flatMap((result) => result.assertions
      .filter((assertion) => !assertion.passed)
        .map((assertion) => `- \`${result.caseId}:${assertion.name}\` ${assertion.detail}`)),
      ...failedPreservation.flatMap((result) => result.assertions
        .filter((assertion) => !assertion.passed)
        .map((assertion) => `- \`${result.caseId}:${assertion.name}\` ${assertion.detail}`)),
    ].join('\n')
    : 'No failed assertions.',
  '',
  '## Operator Package Preservation',
  '',
  `- passed: \`${operatorPackagePreservation.passed}\``,
  `- package summary: \`${operatorPackagePreservation.packageSummary}\``,
  `- regenerated input: \`${operatorPackagePreservation.regeneratedInput}\``,
  '',
].join('\n'), 'utf8');

console.log(`stage01_prewrite_smoke_json:${path.relative(frontendRoot, summaryJsonPath)}`);
console.log(`stage01_prewrite_smoke_markdown:${path.relative(frontendRoot, summaryMarkdownPath)}`);
console.log(`status:${summary.status} cases=${summary.passedCases}/${summary.cases} productionDataChanged=${summary.productionDataChanged}`);

if (summary.status !== 'passed') {
  process.exitCode = 1;
}
