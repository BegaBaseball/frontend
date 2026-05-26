import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p35JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p35-review-lock-audit/daegu-operator-reference-p35-review-lock-audit.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p36-review-template');
const gateDir = path.join(outputDir, 'gate');
const templateJsonPath = path.join(outputDir, 'daegu-operator-reference-p36-review-template.json');
const templateCsvPath = path.join(outputDir, 'daegu-operator-reference-p36-review-template.csv');
const templateMdPath = path.join(outputDir, 'daegu-operator-reference-p36-review-template.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p36-review-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p36-review-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p36-review-gate.md');

const task = process.argv[2] ?? 'template';
const requireTemplate = process.argv.includes('--require-template');

const allowedDecisions = new Set(['PENDING', 'APPROVED', 'REJECTED']);

const sourceContractLiterals = [
  'P36 creates an operator visual review template from 131 P35 evidence rows.',
  'OPERATOR_DECISION_PENDING',
  'APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT',
  'APPROVED_REQUIRES_REVIEW_NOTE',
  'REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION',
  'PENDING_ROWS_BLOCK_RELEASE_LOCK',
  'OPERATOR_REVIEW_TEMPLATE_ROWS_131',
  'RELEASE_LOCK_CANDIDATE_REQUIRES_131_APPROVED_ROWS',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p36-review-template-ready',
  'p36-review-gate-passed',
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

async function pathExists(frontendRelativePath) {
  if (!frontendRelativePath) return false;
  try {
    await fs.access(path.join(frontendRoot, frontendRelativePath));
    return true;
  } catch {
    return false;
  }
}

function isValidIsoDate(value) {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function buildTemplateRows(p35Rows) {
  return p35Rows.map((row, index) => ({
    reviewId: `P36-${String(index + 1).padStart(3, '0')}`,
    sectionId: row.sectionId,
    block: row.block,
    name: row.name,
    category: row.category,
    level: row.level,
    side: row.side,
    evidenceCropPng: row.evidenceCropPng,
    evidenceCropSvg: row.evidenceCropSvg,
    overlayPng: row.overlayPng,
    contactSheet: row.contactSheet,
    topComponentDraftId: row.topComponentDraftId,
    colorCoverageRatio: row.colorCoverageRatio,
    overlapRatio: row.overlapRatio,
    hitAreaRatio: row.hitAreaRatio,
    reviewChecklist: row.reviewChecklist,
    operatorDecision: 'PENDING',
    reviewer: '',
    reviewedAt: '',
    reviewNote: '',
    nextAction: 'OPERATOR_REVIEW_PENDING',
  }));
}

async function validateRows(rows) {
  const sectionIds = new Set();
  const validations = [];

  for (const row of rows) {
    const failures = [];
    const cropPngExists = await pathExists(row.evidenceCropPng);
    const cropSvgExists = await pathExists(row.evidenceCropSvg);
    const overlayExists = await pathExists(row.overlayPng);

    if (!row.sectionId) failures.push('MISSING_SECTION_ID');
    if (sectionIds.has(row.sectionId)) failures.push('DUPLICATE_SECTION_ID');
    sectionIds.add(row.sectionId);
    if (!allowedDecisions.has(row.operatorDecision)) failures.push('INVALID_OPERATOR_DECISION');
    if (!cropPngExists || !cropSvgExists || !overlayExists) failures.push('MISSING_EVIDENCE_PATH');

    if (row.operatorDecision === 'APPROVED') {
      if (!row.reviewer) failures.push('APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT');
      if (!isValidIsoDate(row.reviewedAt)) failures.push('APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT');
      if (!row.reviewNote) failures.push('APPROVED_REQUIRES_REVIEW_NOTE');
    }

    if (row.operatorDecision === 'REJECTED') {
      if (!row.reviewNote || !row.nextAction || row.nextAction === 'OPERATOR_REVIEW_PENDING') {
        failures.push('REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION');
      }
    }

    validations.push({
      rowId: row.reviewId || row.sectionId,
      sectionId: row.sectionId,
      block: row.block,
      operatorDecision: row.operatorDecision,
      validationStatus: failures.length ? 'INVALID' : row.operatorDecision === 'PENDING' ? 'REVIEW_PENDING' : 'PASS',
      failures: failures.join('|'),
    });
  }

  return validations;
}

function summarizeRows({ rows, validations }) {
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const pendingRows = rows.filter((row) => row.operatorDecision === 'PENDING');
  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
  const rejectedRows = rows.filter((row) => row.operatorDecision === 'REJECTED');
  const releaseLockCandidateReady = rows.length === 131
    && approvedRows.length === 131
    && pendingRows.length === 0
    && rejectedRows.length === 0
    && invalidRows.length === 0;

  return {
    templateRows: rows.length,
    expectedTemplateRows: 131,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    currentSelectableSeats: DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    pendingRowsBlockReleaseLock: pendingRows.length > 0,
    releaseLockCandidateReady,
    releaseLockAllowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
}

async function writeTemplate() {
  const p35 = await readJson(p35JsonPath);
  const rows = buildTemplateRows(p35.selectableReviewRows ?? []);
  const validations = await validateRows(rows);
  const baseSummary = summarizeRows({ rows, validations });
  const summary = {
    status: baseSummary.invalidRows === 0 && rows.length === 131 ? 'p36-review-template-ready' : 'p36-review-template-blocked',
    p35Status: p35.status,
    ...baseSummary,
  };
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p35Audit: toFrontendRelative(p35JsonPath),
      referenceImage: p35.source?.referenceImage,
      viewBox: p35.source?.viewBox,
      imageSha256: p35.source?.imageSha256,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      releaseLockAllowed: false,
      note: 'P36 creates an operator visual review template from 131 P35 evidence rows. OPERATOR_DECISION_PENDING rows block release lock; source data is not modified.',
    },
    summary,
    rows,
    validations,
    outputs: {
      templateJson: toFrontendRelative(templateJsonPath),
      templateCsv: toFrontendRelative(templateCsvPath),
      templateMd: toFrontendRelative(templateMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(templateJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(templateCsvPath, buildCsv(rows, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'evidenceCropPng',
    'evidenceCropSvg',
    'overlayPng',
    'operatorDecision',
    'reviewer',
    'reviewedAt',
    'reviewNote',
    'nextAction',
  ]));
  await fs.writeFile(templateMdPath, [
    '# 대구 operator reference P36 review template',
    '',
    `- status: \`${summary.status}\``,
    `- template rows: \`${summary.templateRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- pending rows block release lock: \`${summary.pendingRowsBlockReleaseLock}\``,
    `- release lock candidate ready: \`${summary.releaseLockCandidateReady}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Operator Decision Rules',
    '',
    '- `PENDING`: default state; keeps release lock blocked.',
    '- `APPROVED`: requires `reviewer`, ISO `reviewedAt`, and `reviewNote`.',
    '- `REJECTED`: requires `reviewNote` and concrete `nextAction`.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} templateRows=${summary.templateRows} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} releaseLockCandidateReady=${summary.releaseLockCandidateReady}`);
  return payload;
}

async function writeGate() {
  let template;
  try {
    template = await readJson(templateJsonPath);
  } catch {
    template = await writeTemplate();
  }

  const rows = template.rows ?? [];
  const rowValidations = await validateRows(rows);
  const rowSummary = summarizeRows({ rows, validations: rowValidations });
  const gateValidations = [
    {
      rowId: 'OPERATOR_REVIEW_TEMPLATE_ROWS_131',
      validationType: 'TEMPLATE_ROW_COUNT',
      validationStatus: rowSummary.templateRows === 131 ? 'PASS' : 'INVALID',
      failures: rowSummary.templateRows === 131 ? '' : `TEMPLATE_ROWS_NOT_131:${rowSummary.templateRows}`,
    },
    {
      rowId: 'APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT',
      validationType: 'APPROVED_ROW_CONTRACT',
      validationStatus: rowValidations.some((row) => row.failures.includes('APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT')) ? 'INVALID' : 'PASS',
      failures: rowValidations.filter((row) => row.failures.includes('APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT')).map((row) => row.rowId).join('|'),
    },
    {
      rowId: 'REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION',
      validationType: 'REJECTED_ROW_CONTRACT',
      validationStatus: rowValidations.some((row) => row.failures.includes('REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION')) ? 'INVALID' : 'PASS',
      failures: rowValidations.filter((row) => row.failures.includes('REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION')).map((row) => row.rowId).join('|'),
    },
    {
      rowId: 'PENDING_ROWS_BLOCK_RELEASE_LOCK',
      validationType: 'RELEASE_LOCK_POLICY',
      validationStatus: rowSummary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: rowSummary.pendingRows > 0 ? `PENDING_ROWS:${rowSummary.pendingRows}` : '',
    },
    {
      rowId: 'RELEASE_LOCK_CANDIDATE_REQUIRES_131_APPROVED_ROWS',
      validationType: 'RELEASE_LOCK_POLICY',
      validationStatus: rowSummary.releaseLockCandidateReady ? 'PASS' : 'REVIEW_PENDING',
      failures: rowSummary.releaseLockCandidateReady ? '' : `APPROVED_${rowSummary.approvedRows}_PENDING_${rowSummary.pendingRows}_REJECTED_${rowSummary.rejectedRows}`,
    },
    {
      rowId: 'NO_SOURCE_WRITE',
      validationType: 'WRITE_POLICY',
      validationStatus: rowSummary.productionWriteAllowed === false && rowSummary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: rowSummary.productionWriteAllowed === false && rowSummary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
    },
  ];
  const validations = [...gateValidations, ...rowValidations];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p36-review-gate-passed' : 'p36-review-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    ...rowSummary,
  };

  if (requireTemplate && invalidRows.length > 0) {
    throw new Error(`P36 review gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'sectionId',
    'block',
    'operatorDecision',
    'validationType',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P36 review gate',
    '',
    `- status: \`${summary.status}\``,
    `- template rows: \`${summary.templateRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending validations: \`${summary.reviewPendingRows}\``,
    `- pending rows block release lock: \`${summary.pendingRowsBlockReleaseLock}\``,
    `- release lock candidate ready: \`${summary.releaseLockCandidateReady}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} releaseLockCandidateReady=${summary.releaseLockCandidateReady}`);
}

if (task === 'template') {
  await writeTemplate();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
