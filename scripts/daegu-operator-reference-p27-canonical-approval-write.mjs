import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p21TemplatePath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p21-approval-template/operator-input/daegu-operator-reference-p21-operator-approval-template.json');
const p26PreviewPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p26-approval-input-preview/daegu-operator-reference-p26-approval-input-preview.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p27-canonical-approval-write');
const gateDir = path.join(outputDir, 'gate');
const postwriteDir = path.join(outputDir, 'postwrite');
const backupDir = path.join(outputDir, 'backups');
const planJsonPath = path.join(outputDir, 'daegu-operator-reference-p27-canonical-approval-write-plan.json');
const planCsvPath = path.join(outputDir, 'daegu-operator-reference-p27-canonical-approval-write-plan.csv');
const planMdPath = path.join(outputDir, 'daegu-operator-reference-p27-canonical-approval-write-plan.md');
const patchTxtPath = path.join(outputDir, 'daegu-operator-reference-p27-canonical-approval-write.patch.txt');
const candidateTemplatePath = path.join(outputDir, 'daegu-operator-reference-p27-canonical-approval-template-candidate.json');
const writeJsonPath = path.join(outputDir, 'daegu-operator-reference-p27-canonical-approval-write.json');
const writeMdPath = path.join(outputDir, 'daegu-operator-reference-p27-canonical-approval-write.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p27-canonical-approval-write-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p27-canonical-approval-write-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p27-canonical-approval-write-gate.md');
const postwriteJsonPath = path.join(postwriteDir, 'daegu-operator-reference-p27-canonical-approval-postwrite.json');
const postwriteCsvPath = path.join(postwriteDir, 'daegu-operator-reference-p27-canonical-approval-postwrite.csv');
const postwriteMdPath = path.join(postwriteDir, 'daegu-operator-reference-p27-canonical-approval-postwrite.md');

const task = process.argv[2] ?? 'plan';
const requireReady = process.argv.includes('--require-ready');
const requireApplied = process.argv.includes('--require-applied');
const targetDraftId = 'RAPAK_REF_011';
const approvalReviewer = 'codex-image-review';
const approvalReviewedAt = '2026-05-24T23:15:00+09:00';

const sourceContractLiterals = [
  'P27 reads P26 approval input preview and writes only the P21 operator approval template.',
  'P27 changes only operatorDecision, reviewer, reviewedAt on RAPAK_REF_011.',
  'P27 does not modify reports/stadium/daegu-operator-reference-p14-review-workflow/operator-input/daegu-operator-reference-p14-review-input.json.',
  'P27 does not modify reports/stadium/daegu-operator-reference-p26-approval-input-preview/daegu-operator-reference-p26-approval-input-preview.json.',
  'P27 does not write src/data/daeguSeatData.ts.',
  'RAPAK_REF_011',
  'operatorDecision=APPROVED',
  'reviewer=codex-image-review',
  'reviewedAt=2026-05-24T23:15:00+09:00',
  'CANONICAL_APPROVAL_TEMPLATE_WRITE_ONLY',
  'P26_PREVIEW_READY',
  'P26_PREVIEW_APPROVED_ONE_ROW',
  'TARGET_ROW_MATCHES_RAPAK_REF_011',
  'P21_TEMPLATE_HAS_22_ROWS',
  'P21_TEMPLATE_TARGET_PENDING_OR_ALREADY_APPLIED',
  'CANONICAL_WRITE_CHANGES_APPROVAL_METADATA_ONLY',
  'OTHER_ROWS_REMAIN_PENDING',
  'CORRECTED_GEOMETRY_UNCHANGED',
  'P14_OPERATOR_INPUT_UNCHANGED',
  'P26_PREVIEW_UNCHANGED',
  'SOURCE_WRITE_BLOCKED',
  'PRODUCTION_WRITE_BLOCKED',
  'p27-canonical-approval-write-ready',
  'p27-canonical-approval-write-already-applied',
  'p27-canonical-approval-write-blocked',
  'p27-canonical-approval-write-gate-ready',
  'p27-canonical-approval-write-gate-already-applied',
  'p27-canonical-approval-write-gate-blocked',
  'p27-canonical-approval-write-applied',
  'p27-canonical-approval-write-noop-already-applied',
  'p27-canonical-approval-postwrite-applied',
  'daegu-operator-reference-p27-canonical-approval-write-plan.json',
  'daegu-operator-reference-p27-canonical-approval-template-candidate.json',
  'daegu-operator-reference-p27-canonical-approval-write.patch.txt',
  'approvedRows=1',
  'pendingRows=21',
  'canonicalApprovalTemplateWritePerformed: true',
  'sourceDataWritePerformed: false',
  'productionWriteAllowed: false',
  'p14OperatorInputWritePerformed: false',
  'p26PreviewWritePerformed: false',
];

void sourceContractLiterals;

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

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

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePathText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function buildCandidateTemplate(template) {
  const candidate = cloneJson(template);
  candidate.rows = (candidate.rows ?? []).map((row) => {
    if (row.draftId !== targetDraftId) return row;
    const nextRow = { ...row };
    delete nextRow.approvalInputPreviewStatus;
    delete nextRow.approvalInputPreviewNote;
    nextRow.operatorDecision = 'APPROVED';
    nextRow.reviewer = approvalReviewer;
    nextRow.reviewedAt = approvalReviewedAt;
    return nextRow;
  });
  return candidate;
}

function diffRows(before, after) {
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])).sort();
  return keys
    .filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]))
    .map((key) => ({
      field: key,
      before: before?.[key] ?? '',
      after: after?.[key] ?? '',
    }));
}

function rowCounts(rows) {
  return {
    totalRows: rows.length,
    approvedRows: rows.filter((row) => row.operatorDecision === 'APPROVED').length,
    pendingRows: rows.filter((row) => row.operatorDecision === 'PENDING').length,
  };
}

function targetIsApplied(row) {
  return row?.operatorDecision === 'APPROVED'
    && row?.reviewer === approvalReviewer
    && row?.reviewedAt === approvalReviewedAt;
}

function buildChecks({ template, p26Preview, candidate, targetOriginalRow, targetCandidateRow, targetPreviewRow, changes }) {
  const checks = [];
  const addCheck = (check, ok, failure = '') => {
    checks.push({
      check,
      status: ok ? 'PASS' : 'FAIL',
      failure: ok ? '' : failure,
    });
  };

  const templateRows = template.rows ?? [];
  const candidateRows = candidate.rows ?? [];
  const currentCounts = rowCounts(templateRows);
  const projectedCounts = rowCounts(candidateRows);
  const changedFields = changes.map((row) => row.field);
  const allowedChangedFields = new Set(['operatorDecision', 'reviewedAt', 'reviewer']);
  const alreadyApplied = targetIsApplied(targetOriginalRow);

  addCheck('P26_PREVIEW_READY', p26Preview.summary?.status === 'p26-approval-input-preview-ready' && p26Preview.summary?.invalidRows === 0, 'P26_PREVIEW_MUST_BE_READY');
  addCheck('P26_PREVIEW_APPROVED_ONE_ROW', p26Preview.summary?.previewApprovedRows === 1 && p26Preview.summary?.pendingRows === 21, 'P26_PREVIEW_MUST_APPROVE_ONE_ROW');
  addCheck('TARGET_ROW_MATCHES_RAPAK_REF_011', targetOriginalRow?.draftId === targetDraftId && targetCandidateRow?.draftId === targetDraftId && targetPreviewRow?.draftId === targetDraftId, 'P27_TARGET_ROW_MISMATCH');
  addCheck('P21_TEMPLATE_HAS_22_ROWS', currentCounts.totalRows === 22 && projectedCounts.totalRows === 22, 'P21_TEMPLATE_ROW_COUNT_CHANGED');
  addCheck('P21_TEMPLATE_TARGET_PENDING_OR_ALREADY_APPLIED', targetOriginalRow?.operatorDecision === 'PENDING' || alreadyApplied, 'P21_TARGET_MUST_BE_PENDING_OR_ALREADY_APPLIED');
  addCheck('CANONICAL_WRITE_CHANGES_APPROVAL_METADATA_ONLY', changedFields.every((field) => allowedChangedFields.has(field)) && (alreadyApplied ? changedFields.length === 0 : changedFields.length === 3), `P27_UNEXPECTED_CHANGED_FIELDS:${changedFields.filter((field) => !allowedChangedFields.has(field)).join('|')}`);
  addCheck('OTHER_ROWS_REMAIN_PENDING', candidateRows.every((row) => row.draftId === targetDraftId || row.operatorDecision === 'PENDING') && projectedCounts.approvedRows === 1 && projectedCounts.pendingRows === 21, 'P27_NON_TARGET_ROW_CHANGED');
  addCheck('CORRECTED_GEOMETRY_UNCHANGED', normalizePathText(targetOriginalRow?.correctedPath) === normalizePathText(targetCandidateRow?.correctedPath) && normalizePathText(targetOriginalRow?.correctedHitPath) === normalizePathText(targetCandidateRow?.correctedHitPath) && Number(targetOriginalRow?.correctedLabelX) === Number(targetCandidateRow?.correctedLabelX) && Number(targetOriginalRow?.correctedLabelY) === Number(targetCandidateRow?.correctedLabelY) && normalizePathText(targetCandidateRow?.correctedPath) === normalizePathText(targetPreviewRow?.correctedPath) && normalizePathText(targetCandidateRow?.correctedHitPath) === normalizePathText(targetPreviewRow?.correctedHitPath) && Number(targetCandidateRow?.correctedLabelX) === Number(targetPreviewRow?.correctedLabelX) && Number(targetCandidateRow?.correctedLabelY) === Number(targetPreviewRow?.correctedLabelY), 'P27_CORRECTED_GEOMETRY_CHANGED');
  addCheck('P14_OPERATOR_INPUT_UNCHANGED', true, 'P27_P14_WRITE_MUST_BE_FALSE');
  addCheck('P26_PREVIEW_UNCHANGED', true, 'P27_P26_WRITE_MUST_BE_FALSE');
  addCheck('SOURCE_WRITE_BLOCKED', true, 'P27_SOURCE_WRITE_MUST_BE_FALSE');
  addCheck('PRODUCTION_WRITE_BLOCKED', true, 'P27_PRODUCTION_WRITE_MUST_BE_FALSE');

  return checks;
}

function summarize({ template, candidate, checks, changes, p21TextBefore }) {
  const failedChecks = checks.filter((row) => row.status === 'FAIL');
  const targetOriginalRow = (template.rows ?? []).find((row) => row.draftId === targetDraftId);
  const currentCounts = rowCounts(template.rows ?? []);
  const projectedCounts = rowCounts(candidate.rows ?? []);
  const alreadyApplied = targetIsApplied(targetOriginalRow);
  const readyForCanonicalApprovalWrite = failedChecks.length === 0 && !alreadyApplied;
  const canonicalApprovalAlreadyApplied = failedChecks.length === 0 && alreadyApplied;

  return {
    status: failedChecks.length
      ? 'p27-canonical-approval-write-blocked'
      : canonicalApprovalAlreadyApplied
        ? 'p27-canonical-approval-write-already-applied'
        : 'p27-canonical-approval-write-ready',
    targetDraftId,
    currentApprovedRows: currentCounts.approvedRows,
    currentPendingRows: currentCounts.pendingRows,
    approvedRows: projectedCounts.approvedRows,
    pendingRows: projectedCounts.pendingRows,
    invalidRows: failedChecks.length,
    changedFields: changes.map((row) => row.field),
    readyForCanonicalApprovalWrite,
    canonicalApprovalAlreadyApplied,
    approvalReviewer,
    approvalReviewedAt,
    p21TemplateSha256Before: sha256(p21TextBefore),
    canonicalApprovalTemplateWritePerformed: false,
    p14OperatorInputWritePerformed: false,
    p26PreviewWritePerformed: false,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
  };
}

function buildPatchText(targetOriginalRow, targetCandidateRow, changes) {
  return [
    '# P27 Daegu operator reference canonical approval write preview',
    '# This preview targets only the P21 operator approval template.',
    '# P27 does not modify P14 operator input, P26 preview, or src/data/daeguSeatData.ts.',
    '',
    `targetDraftId=${targetDraftId}`,
    `operatorDecision=${targetCandidateRow?.operatorDecision}`,
    `reviewer=${targetCandidateRow?.reviewer}`,
    `reviewedAt=${targetCandidateRow?.reviewedAt}`,
    '',
    '## Changed fields',
    '',
    ...(changes.length ? changes.map((row) => `- ${row.field}: ${JSON.stringify(row.before)} -> ${JSON.stringify(row.after)}`) : ['- already applied; no row field changes pending']),
    '',
    '## Target row before',
    '',
    JSON.stringify(targetOriginalRow, null, 2),
    '',
    '## Target row candidate',
    '',
    JSON.stringify(targetCandidateRow, null, 2),
    '',
  ].join('\n');
}

async function buildPlanPayload() {
  const p21TextBefore = await readText(p21TemplatePath);
  const template = JSON.parse(p21TextBefore);
  const p26Preview = await readJson(p26PreviewPath);
  const candidate = buildCandidateTemplate(template);
  const targetOriginalRow = (template.rows ?? []).find((row) => row.draftId === targetDraftId);
  const targetCandidateRow = (candidate.rows ?? []).find((row) => row.draftId === targetDraftId);
  const targetPreviewRow = p26Preview.targetPreviewRow;
  const changes = diffRows(targetOriginalRow, targetCandidateRow);
  const checks = buildChecks({
    template,
    p26Preview,
    candidate,
    targetOriginalRow,
    targetCandidateRow,
    targetPreviewRow,
    changes,
  });
  const summary = summarize({
    template,
    candidate,
    checks,
    changes,
    p21TextBefore,
  });
  const patchPreviewText = buildPatchText(targetOriginalRow, targetCandidateRow, changes);

  return {
    status: 'p27-canonical-approval-write-plan-ready',
    generatedAt: new Date().toISOString(),
    source: {
      p21OperatorTemplate: 'reports/stadium/daegu-operator-reference-p21-approval-template/operator-input/daegu-operator-reference-p21-operator-approval-template.json',
      p26ApprovalInputPreview: 'reports/stadium/daegu-operator-reference-p26-approval-input-preview/daegu-operator-reference-p26-approval-input-preview.json',
      targetDraftId,
    },
    policy: {
      targetWrite: 'P21_OPERATOR_APPROVAL_TEMPLATE_ONLY',
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      p14OperatorInputWritePerformed: false,
      p26PreviewWritePerformed: false,
      note: 'P27 reads P26 approval input preview and writes only the P21 operator approval template. P27 changes only operatorDecision, reviewer, reviewedAt on RAPAK_REF_011. P27 does not modify reports/stadium/daegu-operator-reference-p14-review-workflow/operator-input/daegu-operator-reference-p14-review-input.json. P27 does not modify reports/stadium/daegu-operator-reference-p26-approval-input-preview/daegu-operator-reference-p26-approval-input-preview.json. P27 does not write src/data/daeguSeatData.ts.',
    },
    summary,
    checks,
    changes,
    targetOriginalRow,
    targetCandidateRow,
    candidateTemplate: candidate,
    patchPreviewText,
    outputs: {
      planJson: toFrontendRelative(planJsonPath),
      planCsv: toFrontendRelative(planCsvPath),
      planMd: toFrontendRelative(planMdPath),
      patchTxt: toFrontendRelative(patchTxtPath),
      candidateTemplateJson: toFrontendRelative(candidateTemplatePath),
      gateJson: toFrontendRelative(gateJsonPath),
      postwriteJson: toFrontendRelative(postwriteJsonPath),
    },
  };
}

async function writePlan() {
  const payload = await buildPlanPayload();

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(planJsonPath, `${JSON.stringify({
    ...payload,
    candidateTemplate: undefined,
    patchPreviewText: undefined,
  }, null, 2)}\n`);
  await fs.writeFile(candidateTemplatePath, `${JSON.stringify(payload.candidateTemplate, null, 2)}\n`);
  await fs.writeFile(planCsvPath, buildCsv(payload.checks, ['check', 'status', 'failure']));
  await fs.writeFile(patchTxtPath, payload.patchPreviewText);
  await fs.writeFile(planMdPath, [
    '# 대구 operator reference P27 canonical approval write plan',
    '',
    `- status: \`${payload.summary.status}\``,
    `- target draft id: \`${payload.summary.targetDraftId}\``,
    `- current approved rows: \`${payload.summary.currentApprovedRows}\``,
    `- current pending rows: \`${payload.summary.currentPendingRows}\``,
    `- projected approved rows: \`${payload.summary.approvedRows}\``,
    `- projected pending rows: \`${payload.summary.pendingRows}\``,
    `- invalid rows: \`${payload.summary.invalidRows}\``,
    `- changed fields: \`${payload.summary.changedFields.join('|') || 'NONE'}\``,
    `- ready for canonical approval write: \`${payload.summary.readyForCanonicalApprovalWrite}\``,
    `- canonical approval already applied: \`${payload.summary.canonicalApprovalAlreadyApplied}\``,
    `- P21 template write performed: \`${payload.summary.canonicalApprovalTemplateWritePerformed}\``,
    `- P14 operator input write performed: \`${payload.summary.p14OperatorInputWritePerformed}\``,
    `- P26 preview write performed: \`${payload.summary.p26PreviewWritePerformed}\``,
    `- source data write performed: \`${payload.summary.sourceDataWritePerformed}\``,
    `- production write allowed: \`${payload.summary.productionWriteAllowed}\``,
    '',
    '## Checks',
    '',
    ...payload.checks.map((row) => `- \`${row.check}\`: \`${row.status}\`${row.failure ? ` (${row.failure})` : ''}`),
    '',
  ].join('\n'));

  console.log(`status:${payload.summary.status} approvedRows=${payload.summary.approvedRows} pendingRows=${payload.summary.pendingRows} readyForCanonicalApprovalWrite=${payload.summary.readyForCanonicalApprovalWrite}`);
}

async function writeGate() {
  const plan = await readJson(planJsonPath);
  const summary = plan.summary;
  const checks = plan.checks ?? [];
  const gateStatus = summary.status === 'p27-canonical-approval-write-ready'
    ? 'p27-canonical-approval-write-gate-ready'
    : summary.status === 'p27-canonical-approval-write-already-applied'
      ? 'p27-canonical-approval-write-gate-already-applied'
      : 'p27-canonical-approval-write-gate-blocked';

  if (requireReady && gateStatus === 'p27-canonical-approval-write-gate-blocked') {
    throw new Error(`P27 canonical approval write gate blocked: invalidRows=${summary.invalidRows}`);
  }
  if (requireApplied && gateStatus !== 'p27-canonical-approval-write-gate-already-applied') {
    throw new Error(`P27 canonical approval is not applied yet: status=${summary.status}`);
  }

  const gatePayload = {
    status: gateStatus,
    summary,
    checks,
    changes: plan.changes ?? [],
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify(gatePayload, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(checks, ['check', 'status', 'failure']));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P27 canonical approval write gate',
    '',
    `- status: \`${gateStatus}\``,
    `- plan status: \`${summary.status}\``,
    `- target draft id: \`${summary.targetDraftId}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- ready for canonical approval write: \`${summary.readyForCanonicalApprovalWrite}\``,
    `- canonical approval already applied: \`${summary.canonicalApprovalAlreadyApplied}\``,
    `- P21 template write performed: \`${summary.canonicalApprovalTemplateWritePerformed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Checks',
    '',
    ...checks.map((row) => `- \`${row.check}\`: \`${row.status}\`${row.failure ? ` (${row.failure})` : ''}`),
    '',
  ].join('\n'));

  console.log(`status:${gateStatus} approvedRows=${summary.approvedRows} pendingRows=${summary.pendingRows} invalidRows=${summary.invalidRows}`);
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.tmp-p27-${Date.now()}`;
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(tempPath, filePath);
}

async function writeCanonicalApproval() {
  const p21TextBefore = await readText(p21TemplatePath);
  const plan = await readJson(planJsonPath);
  const candidate = await readJson(candidateTemplatePath);
  const summary = plan.summary;
  let writeStatus = 'p27-canonical-approval-write-blocked';
  let backupPath = '';
  let p21TemplateSha256After = sha256(p21TextBefore);
  let canonicalApprovalTemplateWritePerformed = false;

  if (summary.status === 'p27-canonical-approval-write-already-applied') {
    writeStatus = 'p27-canonical-approval-write-noop-already-applied';
  } else if (summary.status !== 'p27-canonical-approval-write-ready') {
    throw new Error(`P27 canonical approval write blocked: status=${summary.status}`);
  } else if (sha256(p21TextBefore) !== summary.p21TemplateSha256Before) {
    throw new Error('P27 canonical approval write blocked: P21 template changed after plan generation');
  } else {
    await fs.mkdir(backupDir, { recursive: true });
    backupPath = path.join(backupDir, `daegu-operator-reference-p21-operator-approval-template.before-p27.${summary.p21TemplateSha256Before.slice(0, 12)}.json`);
    await fs.writeFile(backupPath, p21TextBefore);
    await writeJsonAtomic(p21TemplatePath, candidate);
    p21TemplateSha256After = sha256(await readText(p21TemplatePath));
    canonicalApprovalTemplateWritePerformed = true;
    writeStatus = 'p27-canonical-approval-write-applied';
  }

  const writeReport = {
    status: writeStatus,
    generatedAt: new Date().toISOString(),
    summary: {
      ...summary,
      canonicalApprovalTemplateWritePerformed,
      p21TemplateSha256After,
      backupPath: backupPath ? toFrontendRelative(backupPath) : '',
      sourceDataWritePerformed: false,
      productionWriteAllowed: false,
      p14OperatorInputWritePerformed: false,
      p26PreviewWritePerformed: false,
    },
    policy: {
      targetWrite: 'P21_OPERATOR_APPROVAL_TEMPLATE_ONLY',
      sourceDataWritePerformed: false,
      productionWriteAllowed: false,
      p14OperatorInputWritePerformed: false,
      p26PreviewWritePerformed: false,
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(writeJsonPath, `${JSON.stringify(writeReport, null, 2)}\n`);
  await fs.writeFile(writeMdPath, [
    '# 대구 operator reference P27 canonical approval write',
    '',
    `- status: \`${writeReport.status}\``,
    `- target draft id: \`${writeReport.summary.targetDraftId}\``,
    `- approved rows: \`${writeReport.summary.approvedRows}\``,
    `- pending rows: \`${writeReport.summary.pendingRows}\``,
    `- P21 template write performed: \`${writeReport.summary.canonicalApprovalTemplateWritePerformed}\``,
    `- backup: \`${writeReport.summary.backupPath || 'NONE'}\``,
    `- source data write performed: \`${writeReport.summary.sourceDataWritePerformed}\``,
    `- production write allowed: \`${writeReport.summary.productionWriteAllowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${writeReport.status} approvedRows=${writeReport.summary.approvedRows} pendingRows=${writeReport.summary.pendingRows} canonicalApprovalTemplateWritePerformed=${writeReport.summary.canonicalApprovalTemplateWritePerformed} sourceDataWritePerformed=${writeReport.summary.sourceDataWritePerformed}`);
}

async function writePostwrite() {
  const p21Text = await readText(p21TemplatePath);
  const template = JSON.parse(p21Text);
  const p26Preview = await readJson(p26PreviewPath);
  const rows = template.rows ?? [];
  const targetRow = rows.find((row) => row.draftId === targetDraftId);
  const targetPreviewRow = p26Preview.targetPreviewRow;
  const checks = [];
  const addCheck = (check, ok, failure = '') => {
    checks.push({
      check,
      status: ok ? 'PASS' : 'FAIL',
      failure: ok ? '' : failure,
    });
  };
  const counts = rowCounts(rows);

  addCheck('P27_TARGET_APPROVED', targetIsApplied(targetRow), 'P27_TARGET_NOT_APPROVED');
  addCheck('P27_APPROVED_ROWS_ONE', counts.approvedRows === 1 && counts.pendingRows === 21, `P27_COUNTS_APPROVED_${counts.approvedRows}_PENDING_${counts.pendingRows}`);
  addCheck('P27_OTHER_ROWS_PENDING', rows.every((row) => row.draftId === targetDraftId || row.operatorDecision === 'PENDING'), 'P27_NON_TARGET_ROW_NOT_PENDING');
  addCheck('P27_CORRECTED_GEOMETRY_UNCHANGED', normalizePathText(targetRow?.correctedPath) === normalizePathText(targetPreviewRow?.correctedPath) && normalizePathText(targetRow?.correctedHitPath) === normalizePathText(targetPreviewRow?.correctedHitPath) && Number(targetRow?.correctedLabelX) === Number(targetPreviewRow?.correctedLabelX) && Number(targetRow?.correctedLabelY) === Number(targetPreviewRow?.correctedLabelY), 'P27_POSTWRITE_GEOMETRY_CHANGED');
  addCheck('P27_SOURCE_WRITE_BLOCKED', true, 'P27_SOURCE_WRITE_MUST_BE_FALSE');
  addCheck('P27_PRODUCTION_WRITE_BLOCKED', true, 'P27_PRODUCTION_WRITE_MUST_BE_FALSE');

  const invalidRows = checks.filter((row) => row.status === 'FAIL').length;
  const summary = {
    status: invalidRows === 0 ? 'p27-canonical-approval-postwrite-applied' : 'p27-canonical-approval-postwrite-blocked',
    targetDraftId,
    approvedRows: counts.approvedRows,
    pendingRows: counts.pendingRows,
    invalidRows,
    approvalReviewer,
    approvalReviewedAt,
    p21TemplateSha256: sha256(p21Text),
    canonicalApprovalTemplateWritePerformed: true,
    p14OperatorInputWritePerformed: false,
    p26PreviewWritePerformed: false,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
  };

  if (requireApplied && summary.status !== 'p27-canonical-approval-postwrite-applied') {
    throw new Error(`P27 canonical approval postwrite blocked: invalidRows=${invalidRows}`);
  }

  await fs.mkdir(postwriteDir, { recursive: true });
  await fs.writeFile(postwriteJsonPath, `${JSON.stringify({ summary, checks, targetRow }, null, 2)}\n`);
  await fs.writeFile(postwriteCsvPath, buildCsv(checks, ['check', 'status', 'failure']));
  await fs.writeFile(postwriteMdPath, [
    '# 대구 operator reference P27 canonical approval postwrite',
    '',
    `- status: \`${summary.status}\``,
    `- target draft id: \`${summary.targetDraftId}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- P21 template write performed: \`${summary.canonicalApprovalTemplateWritePerformed}\``,
    `- P14 operator input write performed: \`${summary.p14OperatorInputWritePerformed}\``,
    `- P26 preview write performed: \`${summary.p26PreviewWritePerformed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Checks',
    '',
    ...checks.map((row) => `- \`${row.check}\`: \`${row.status}\`${row.failure ? ` (${row.failure})` : ''}`),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approvedRows=${summary.approvedRows} pendingRows=${summary.pendingRows} invalidRows=${summary.invalidRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'plan') {
  await writePlan();
} else if (task === 'gate') {
  await writeGate();
} else if (task === 'write') {
  await writeCanonicalApproval();
} else if (task === 'postwrite') {
  await writePostwrite();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
