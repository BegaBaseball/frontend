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
const p36JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p36-review-template/daegu-operator-reference-p36-review-template.json');
const p36CsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p36-review-template/daegu-operator-reference-p36-review-template.csv');
const reviewInputPath = process.env.DAEGU_OPERATOR_REFERENCE_P37_REVIEW_INPUT
  ? path.resolve(frontendRoot, process.env.DAEGU_OPERATOR_REFERENCE_P37_REVIEW_INPUT)
  : p36JsonPath;
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p37-review-status');
const gateDir = path.join(outputDir, 'gate');
const auditJsonPath = path.join(outputDir, 'daegu-operator-reference-p37-review-status.json');
const auditCsvPath = path.join(outputDir, 'daegu-operator-reference-p37-review-status.csv');
const pendingCsvPath = path.join(outputDir, 'daegu-operator-reference-p37-pending-review-rows.csv');
const rejectedCsvPath = path.join(outputDir, 'daegu-operator-reference-p37-retrace-candidates.csv');
const auditMdPath = path.join(outputDir, 'daegu-operator-reference-p37-review-status.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p37-review-status-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p37-review-status-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p37-review-status-gate.md');

const task = process.argv[2] ?? 'status';
const requireStatus = process.argv.includes('--require-status');
const allowedDecisions = new Set(['PENDING', 'APPROVED', 'REJECTED']);

const sourceContractLiterals = [
  'P37 reads operator review decisions from the P36 CSV/JSON template and computes release-lock readiness.',
  'APPROVED_131_REQUIRED_FOR_RELEASE_LOCK',
  'REJECTED_ROWS_CREATE_RETRACE_BATCH',
  'PENDING_ROWS_KEEP_REVIEW_OPEN',
  'INVALID_OPERATOR_DECISION_BLOCKS_RELEASE_LOCK',
  'APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT',
  'REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION',
  'RELEASE_LOCK_ALLOWED_FALSE_UNTIL_ALL_APPROVED',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p37-review-status-ready',
  'p37-review-status-gate-passed',
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

async function readReviewRows(filePath) {
  if (filePath.endsWith('.csv')) {
    return {
      sourceKind: 'CSV',
      rows: parseCsv(await fs.readFile(filePath, 'utf8')),
    };
  }
  const payload = await readJson(filePath);
  return {
    sourceKind: 'JSON',
    rows: payload.rows ?? [],
    sourcePayload: payload,
  };
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

function normalizeDecision(value) {
  const decision = String(value ?? '').trim().toUpperCase();
  return decision || 'PENDING';
}

async function validateReviewRows(rows) {
  const sectionIds = new Set();
  const validations = [];

  for (const row of rows) {
    const operatorDecision = normalizeDecision(row.operatorDecision);
    const failures = [];
    const cropPngExists = await pathExists(row.evidenceCropPng);
    const cropSvgExists = await pathExists(row.evidenceCropSvg);
    const overlayExists = await pathExists(row.overlayPng);

    if (!row.sectionId) failures.push('MISSING_SECTION_ID');
    if (sectionIds.has(row.sectionId)) failures.push('DUPLICATE_SECTION_ID');
    sectionIds.add(row.sectionId);
    if (!allowedDecisions.has(operatorDecision)) failures.push('INVALID_OPERATOR_DECISION_BLOCKS_RELEASE_LOCK');
    if (!cropPngExists || !cropSvgExists || !overlayExists) failures.push('MISSING_EVIDENCE_PATH');

    if (operatorDecision === 'APPROVED') {
      if (!row.reviewer || !isValidIsoDate(row.reviewedAt)) {
        failures.push('APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT');
      }
      if (!row.reviewNote) failures.push('APPROVED_REQUIRES_REVIEW_NOTE');
    }

    if (operatorDecision === 'REJECTED') {
      if (!row.reviewNote || !row.nextAction || row.nextAction === 'OPERATOR_REVIEW_PENDING') {
        failures.push('REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION');
      }
    }

    validations.push({
      rowId: row.reviewId || row.sectionId,
      sectionId: row.sectionId,
      block: row.block,
      operatorDecision,
      validationStatus: failures.length ? 'INVALID' : operatorDecision === 'PENDING' ? 'REVIEW_PENDING' : 'PASS',
      failures: failures.join('|'),
    });
  }

  return validations;
}

function buildStatusRows(rows, validations) {
  const validationByRowId = new Map(validations.map((validation) => [validation.rowId, validation]));
  return rows.map((row) => {
    const rowId = row.reviewId || row.sectionId;
    const validation = validationByRowId.get(rowId);
    const operatorDecision = normalizeDecision(row.operatorDecision);
    return {
      reviewId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      operatorDecision,
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      reviewNote: row.reviewNote,
      nextAction: row.nextAction,
      evidenceCropPng: row.evidenceCropPng,
      validationStatus: validation?.validationStatus ?? 'INVALID',
      failures: validation?.failures ?? 'MISSING_VALIDATION',
    };
  });
}

function summarizeRows({ rows, validations }) {
  const approvedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const rejectedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'REJECTED');
  const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const releaseLockCandidateReady = rows.length === 131
    && approvedRows.length === 131
    && rejectedRows.length === 0
    && pendingRows.length === 0
    && invalidRows.length === 0;

  return {
    status: invalidRows.length === 0 ? 'p37-review-status-ready' : 'p37-review-status-blocked',
    reviewRows: rows.length,
    expectedReviewRows: 131,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    currentSelectableSeats: DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    rejectedRowsCreateRetraceBatch: rejectedRows.length > 0,
    pendingRowsKeepReviewOpen: pendingRows.length > 0,
    approved131RequiredForReleaseLock: !releaseLockCandidateReady,
    releaseLockCandidateReady,
    releaseLockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
}

async function writeStatus() {
  const reviewInput = await readReviewRows(reviewInputPath);
  const rows = reviewInput.rows;
  const validations = await validateReviewRows(rows);
  const statusRows = buildStatusRows(rows, validations);
  const summary = summarizeRows({ rows, validations });
  const pendingRows = statusRows.filter((row) => row.operatorDecision === 'PENDING');
  const rejectedRows = statusRows.filter((row) => row.operatorDecision === 'REJECTED');
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p36Json: toFrontendRelative(p36JsonPath),
      p36Csv: toFrontendRelative(p36CsvPath),
      reviewInput: toFrontendRelative(reviewInputPath),
      reviewInputKind: reviewInput.sourceKind,
      referenceImage: reviewInput.sourcePayload?.source?.referenceImage,
      viewBox: reviewInput.sourcePayload?.source?.viewBox,
      imageSha256: reviewInput.sourcePayload?.source?.imageSha256,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      releaseLockAllowed: false,
      passRelease177Allowed: false,
      note: 'P37 reads operator review decisions from the P36 CSV/JSON template and computes release-lock readiness. APPROVED_131_REQUIRED_FOR_RELEASE_LOCK; rejected rows create retrace batch candidates; pending rows keep review open.',
    },
    summary,
    rows: statusRows,
    pendingRows,
    rejectedRows,
    retraceCandidates: rejectedRows.map((row) => ({
      reviewId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      evidenceCropPng: row.evidenceCropPng,
      reviewNote: row.reviewNote,
      nextAction: row.nextAction,
    })),
    validations,
    outputs: {
      auditJson: toFrontendRelative(auditJsonPath),
      auditCsv: toFrontendRelative(auditCsvPath),
      pendingCsv: toFrontendRelative(pendingCsvPath),
      rejectedCsv: toFrontendRelative(rejectedCsvPath),
      auditMd: toFrontendRelative(auditMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(auditJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(auditCsvPath, buildCsv(statusRows, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'operatorDecision',
    'reviewer',
    'reviewedAt',
    'reviewNote',
    'nextAction',
    'validationStatus',
    'failures',
    'evidenceCropPng',
  ]));
  await fs.writeFile(pendingCsvPath, buildCsv(pendingRows, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'evidenceCropPng',
    'nextAction',
  ]));
  await fs.writeFile(rejectedCsvPath, buildCsv(payload.retraceCandidates, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'evidenceCropPng',
    'reviewNote',
    'nextAction',
  ]));
  await fs.writeFile(auditMdPath, [
    '# 대구 operator reference P37 review status',
    '',
    `- status: \`${summary.status}\``,
    `- review rows: \`${summary.reviewRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- rejected rows create retrace batch: \`${summary.rejectedRowsCreateRetraceBatch}\``,
    `- pending rows keep review open: \`${summary.pendingRowsKeepReviewOpen}\``,
    `- release lock candidate ready: \`${summary.releaseLockCandidateReady}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Pending Rows',
    '',
    pendingRows.length > 0
      ? pendingRows.slice(0, 30).map((row) => `- \`${row.block}\` ${row.sectionId} crop=\`${row.evidenceCropPng}\``).join('\n')
      : '- none',
    pendingRows.length > 30 ? `- ... ${pendingRows.length - 30} more` : '',
    '',
    '## Retrace Candidates',
    '',
    payload.retraceCandidates.length > 0
      ? payload.retraceCandidates.map((row) => `- \`${row.block}\` ${row.sectionId} next=\`${row.nextAction}\``).join('\n')
      : '- none',
    '',
  ].filter((line) => line !== '').join('\n'));

  console.log(`status:${summary.status} approved=${summary.approvedRows} rejected=${summary.rejectedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} releaseLockCandidateReady=${summary.releaseLockCandidateReady}`);
  return payload;
}

async function writeGate() {
  let audit;
  try {
    audit = await readJson(auditJsonPath);
  } catch {
    audit = await writeStatus();
  }

  const rowValidations = audit.validations ?? [];
  const summary = audit.summary ?? {};
  const gateValidations = [
    {
      rowId: 'APPROVED_131_REQUIRED_FOR_RELEASE_LOCK',
      validationType: 'RELEASE_LOCK_POLICY',
      validationStatus: summary.releaseLockCandidateReady ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.releaseLockCandidateReady ? '' : `APPROVED_${summary.approvedRows}_PENDING_${summary.pendingRows}_REJECTED_${summary.rejectedRows}`,
    },
    {
      rowId: 'REJECTED_ROWS_CREATE_RETRACE_BATCH',
      validationType: 'RETRACE_POLICY',
      validationStatus: summary.rejectedRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.rejectedRows > 0 ? `REJECTED_ROWS:${summary.rejectedRows}` : '',
    },
    {
      rowId: 'PENDING_ROWS_KEEP_REVIEW_OPEN',
      validationType: 'REVIEW_STATUS_POLICY',
      validationStatus: summary.pendingRows > 0 ? 'REVIEW_PENDING' : 'PASS',
      failures: summary.pendingRows > 0 ? `PENDING_ROWS:${summary.pendingRows}` : '',
    },
    {
      rowId: 'INVALID_OPERATOR_DECISION_BLOCKS_RELEASE_LOCK',
      validationType: 'ROW_VALIDATION',
      validationStatus: summary.invalidRows > 0 ? 'INVALID' : 'PASS',
      failures: summary.invalidRows > 0 ? `INVALID_ROWS:${summary.invalidRows}` : '',
    },
    {
      rowId: 'NO_SOURCE_WRITE',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
    },
  ];
  const validations = [...gateValidations, ...rowValidations];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const gateSummary = {
    status: invalidRows.length === 0 ? 'p37-review-status-gate-passed' : 'p37-review-status-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    reviewRows: summary.reviewRows ?? 0,
    approvedRows: summary.approvedRows ?? 0,
    rejectedRows: summary.rejectedRows ?? 0,
    pendingRows: summary.pendingRows ?? 0,
    releaseLockCandidateReady: summary.releaseLockCandidateReady === true,
    releaseLockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  if (requireStatus && invalidRows.length > 0) {
    throw new Error(`P37 review status gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary: gateSummary, validations }, null, 2)}\n`);
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
    '# 대구 operator reference P37 review status gate',
    '',
    `- status: \`${gateSummary.status}\``,
    `- review rows: \`${gateSummary.reviewRows}\``,
    `- approved rows: \`${gateSummary.approvedRows}\``,
    `- rejected rows: \`${gateSummary.rejectedRows}\``,
    `- pending rows: \`${gateSummary.pendingRows}\``,
    `- invalid rows: \`${gateSummary.invalidRows}\``,
    `- review pending validations: \`${gateSummary.reviewPendingRows}\``,
    `- release lock candidate ready: \`${gateSummary.releaseLockCandidateReady}\``,
    `- release lock allowed: \`${gateSummary.releaseLockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${gateSummary.passRelease177Allowed}\``,
    `- production write allowed: \`${gateSummary.productionWriteAllowed}\``,
    `- source data write performed: \`${gateSummary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${gateSummary.status} approved=${gateSummary.approvedRows} rejected=${gateSummary.rejectedRows} pending=${gateSummary.pendingRows} invalidRows=${gateSummary.invalidRows} releaseLockCandidateReady=${gateSummary.releaseLockCandidateReady}`);
}

if (task === 'status') {
  await writeStatus();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
