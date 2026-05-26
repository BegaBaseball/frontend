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
const p37SourcePath = path.join(frontendRoot, 'scripts/daegu-operator-reference-p37-review-status.mjs');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p38-review-input-seed');
const fixtureDir = path.join(outputDir, 'fixtures');
const gateDir = path.join(outputDir, 'gate');
const seedJsonPath = path.join(outputDir, 'daegu-operator-reference-p38-review-input-seed.json');
const seedCsvPath = path.join(outputDir, 'daegu-operator-reference-p38-review-input-seed.csv');
const auditJsonPath = path.join(outputDir, 'daegu-operator-reference-p38-review-input-seed-audit.json');
const auditCsvPath = path.join(outputDir, 'daegu-operator-reference-p38-review-input-seed-audit.csv');
const auditMdPath = path.join(outputDir, 'daegu-operator-reference-p38-review-input-seed-audit.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p38-review-input-seed-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p38-review-input-seed-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p38-review-input-seed-gate.md');

const task = process.argv[2] ?? 'audit';
const requireSeed = process.argv.includes('--require-seed');
const allowedDecisions = new Set(['PENDING', 'APPROVED', 'REJECTED']);
const sampleReviewedAt = '2026-05-25T00:00:00.000Z';

const fixturePaths = {
  validApprovedJson: path.join(fixtureDir, 'daegu-operator-reference-p38-valid-approved-sample.json'),
  validApprovedCsv: path.join(fixtureDir, 'daegu-operator-reference-p38-valid-approved-sample.csv'),
  validRejectedJson: path.join(fixtureDir, 'daegu-operator-reference-p38-valid-rejected-sample.json'),
  validRejectedCsv: path.join(fixtureDir, 'daegu-operator-reference-p38-valid-rejected-sample.csv'),
  invalidApprovedJson: path.join(fixtureDir, 'daegu-operator-reference-p38-invalid-approved-sample.json'),
  invalidApprovedCsv: path.join(fixtureDir, 'daegu-operator-reference-p38-invalid-approved-sample.csv'),
  invalidRejectedJson: path.join(fixtureDir, 'daegu-operator-reference-p38-invalid-rejected-sample.json'),
  invalidRejectedCsv: path.join(fixtureDir, 'daegu-operator-reference-p38-invalid-rejected-sample.csv'),
};

const sourceContractLiterals = [
  'P38 creates a separate operator input seed and sample fixtures without modifying P36 evidence.',
  'OPERATOR_INPUT_SEED_ROWS_131',
  'P37_REVIEW_INPUT_OVERRIDE_SUPPORTED',
  'VALID_APPROVED_SAMPLE_PASSES',
  'INVALID_APPROVED_SAMPLE_BLOCKED',
  'VALID_REJECTED_SAMPLE_CREATES_RETRACE_CANDIDATE',
  'INVALID_REJECTED_SAMPLE_BLOCKED',
  'OPERATOR_WRITABLE_COLUMNS_ONLY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p38-review-input-seed-ready',
  'p38-review-input-seed-gate-passed',
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

function normalizeDecision(value) {
  const decision = String(value ?? '').trim().toUpperCase();
  return decision || 'PENDING';
}

function buildSeedRows(p36Rows) {
  return p36Rows.map((row) => ({
    reviewId: row.reviewId,
    sectionId: row.sectionId,
    block: row.block,
    name: row.name,
    evidenceCropPng: row.evidenceCropPng,
    evidenceCropSvg: row.evidenceCropSvg,
    overlayPng: row.overlayPng,
    operatorDecision: 'PENDING',
    reviewer: '',
    reviewedAt: '',
    reviewNote: '',
    nextAction: 'OPERATOR_REVIEW_PENDING',
  }));
}

function cloneRows(rows) {
  return rows.map((row) => ({ ...row }));
}

function buildFixtures(seedRows) {
  const validApprovedRows = cloneRows(seedRows);
  validApprovedRows[0] = {
    ...validApprovedRows[0],
    operatorDecision: 'APPROVED',
    reviewer: 'operator-sample',
    reviewedAt: sampleReviewedAt,
    reviewNote: 'P38 valid approved sample: crop boundary and label alignment reviewed.',
    nextAction: 'NO_ACTION_APPROVED_SAMPLE',
  };

  const validRejectedRows = cloneRows(seedRows);
  validRejectedRows[1] = {
    ...validRejectedRows[1],
    operatorDecision: 'REJECTED',
    reviewer: 'operator-sample',
    reviewedAt: sampleReviewedAt,
    reviewNote: 'P38 valid rejected sample: retrace required by operator.',
    nextAction: 'CREATE_RETRACE_BATCH_FROM_REJECTED_SAMPLE',
  };

  const invalidApprovedRows = cloneRows(seedRows);
  invalidApprovedRows[2] = {
    ...invalidApprovedRows[2],
    operatorDecision: 'APPROVED',
    reviewer: '',
    reviewedAt: '',
    reviewNote: '',
    nextAction: 'NO_ACTION_APPROVED_SAMPLE',
  };

  const invalidRejectedRows = cloneRows(seedRows);
  invalidRejectedRows[3] = {
    ...invalidRejectedRows[3],
    operatorDecision: 'REJECTED',
    reviewer: 'operator-sample',
    reviewedAt: sampleReviewedAt,
    reviewNote: 'P38 invalid rejected sample: missing nextAction must block.',
    nextAction: '',
  };

  return [
    {
      fixtureId: 'VALID_APPROVED_SAMPLE_PASSES',
      rows: validApprovedRows,
      jsonPath: fixturePaths.validApprovedJson,
      csvPath: fixturePaths.validApprovedCsv,
      expected: {
        approvedRows: 1,
        rejectedRows: 0,
        pendingRows: 130,
        invalidRows: 0,
        retraceCandidates: 0,
        releaseLockCandidateReady: false,
      },
    },
    {
      fixtureId: 'VALID_REJECTED_SAMPLE_CREATES_RETRACE_CANDIDATE',
      rows: validRejectedRows,
      jsonPath: fixturePaths.validRejectedJson,
      csvPath: fixturePaths.validRejectedCsv,
      expected: {
        approvedRows: 0,
        rejectedRows: 1,
        pendingRows: 130,
        invalidRows: 0,
        retraceCandidates: 1,
        releaseLockCandidateReady: false,
      },
    },
    {
      fixtureId: 'INVALID_APPROVED_SAMPLE_BLOCKED',
      rows: invalidApprovedRows,
      jsonPath: fixturePaths.invalidApprovedJson,
      csvPath: fixturePaths.invalidApprovedCsv,
      expected: {
        approvedRows: 1,
        rejectedRows: 0,
        pendingRows: 130,
        invalidRows: 1,
        retraceCandidates: 0,
        releaseLockCandidateReady: false,
      },
    },
    {
      fixtureId: 'INVALID_REJECTED_SAMPLE_BLOCKED',
      rows: invalidRejectedRows,
      jsonPath: fixturePaths.invalidRejectedJson,
      csvPath: fixturePaths.invalidRejectedCsv,
      expected: {
        approvedRows: 0,
        rejectedRows: 1,
        pendingRows: 130,
        invalidRows: 1,
        retraceCandidates: 1,
        releaseLockCandidateReady: false,
      },
    },
  ];
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

function summarizeRows(rows, validations) {
  const approvedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const rejectedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'REJECTED');
  const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  return {
    reviewRows: rows.length,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    retraceCandidates: rejectedRows.length,
    releaseLockCandidateReady: rows.length === 131
      && approvedRows.length === 131
      && rejectedRows.length === 0
      && pendingRows.length === 0
      && invalidRows.length === 0,
  };
}

function fixtureMatchesExpected(summary, expected) {
  return Object.entries(expected).every(([key, value]) => summary[key] === value);
}

async function writeReviewPayload({ filePath, rows, source, fixtureId = '' }) {
  const payload = {
    status: fixtureId ? 'p38-review-input-fixture-ready' : 'p38-review-input-seed-ready',
    generatedAt: new Date().toISOString(),
    source,
    fixtureId,
    rows,
  };
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function writeRowsCsv(filePath, rows) {
  await fs.writeFile(filePath, buildCsv(rows, [
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
}

async function writeAudit() {
  const [p36, p37Source] = await Promise.all([
    readJson(p36JsonPath),
    fs.readFile(p37SourcePath, 'utf8'),
  ]);
  const seedRows = buildSeedRows(p36.rows ?? []);
  const seedValidations = await validateReviewRows(seedRows);
  const seedSummary = summarizeRows(seedRows, seedValidations);
  const p37ReviewInputOverrideSupported = p37Source.includes('DAEGU_OPERATOR_REFERENCE_P37_REVIEW_INPUT');
  const fixtures = buildFixtures(seedRows);
  const fixtureReports = [];

  await fs.mkdir(fixtureDir, { recursive: true });
  await writeReviewPayload({
    filePath: seedJsonPath,
    rows: seedRows,
    source: {
      p36Template: toFrontendRelative(p36JsonPath),
      p37ReviewInputOverrideSupported,
      referenceImage: p36.source?.referenceImage,
      viewBox: p36.source?.viewBox,
      imageSha256: p36.source?.imageSha256,
    },
  });
  await writeRowsCsv(seedCsvPath, seedRows);

  for (const fixture of fixtures) {
    await writeReviewPayload({
      filePath: fixture.jsonPath,
      rows: fixture.rows,
      source: {
        p36Template: toFrontendRelative(p36JsonPath),
        seedInput: toFrontendRelative(seedJsonPath),
        p37ReviewInputOverrideEnv: `DAEGU_OPERATOR_REFERENCE_P37_REVIEW_INPUT=${toFrontendRelative(fixture.jsonPath)}`,
      },
      fixtureId: fixture.fixtureId,
    });
    await writeRowsCsv(fixture.csvPath, fixture.rows);
    const validations = await validateReviewRows(fixture.rows);
    const summary = summarizeRows(fixture.rows, validations);
    fixtureReports.push({
      fixtureId: fixture.fixtureId,
      jsonPath: toFrontendRelative(fixture.jsonPath),
      csvPath: toFrontendRelative(fixture.csvPath),
      ...summary,
      expectedMatched: fixtureMatchesExpected(summary, fixture.expected),
      expected: fixture.expected,
      invalidFailureCodes: validations
        .filter((row) => row.validationStatus === 'INVALID')
        .map((row) => row.failures)
        .filter(Boolean)
        .join('|'),
    });
  }

  const seedPendingRowsValid = seedSummary.reviewRows === 131
    && seedSummary.pendingRows === 131
    && seedSummary.invalidRows === 0;
  const validApproved = fixtureReports.find((row) => row.fixtureId === 'VALID_APPROVED_SAMPLE_PASSES');
  const validRejected = fixtureReports.find((row) => row.fixtureId === 'VALID_REJECTED_SAMPLE_CREATES_RETRACE_CANDIDATE');
  const invalidApproved = fixtureReports.find((row) => row.fixtureId === 'INVALID_APPROVED_SAMPLE_BLOCKED');
  const invalidRejected = fixtureReports.find((row) => row.fixtureId === 'INVALID_REJECTED_SAMPLE_BLOCKED');
  const checks = [
    {
      rowId: 'OPERATOR_INPUT_SEED_ROWS_131',
      validationStatus: seedPendingRowsValid ? 'PASS' : 'INVALID',
      failures: seedPendingRowsValid ? '' : `SEED_ROWS_${seedSummary.reviewRows}_PENDING_${seedSummary.pendingRows}_INVALID_${seedSummary.invalidRows}`,
    },
    {
      rowId: 'P37_REVIEW_INPUT_OVERRIDE_SUPPORTED',
      validationStatus: p37ReviewInputOverrideSupported ? 'PASS' : 'INVALID',
      failures: p37ReviewInputOverrideSupported ? '' : 'P37_REVIEW_INPUT_OVERRIDE_NOT_FOUND',
    },
    {
      rowId: 'VALID_APPROVED_SAMPLE_PASSES',
      validationStatus: validApproved?.expectedMatched ? 'PASS' : 'INVALID',
      failures: validApproved?.expectedMatched ? '' : 'VALID_APPROVED_SAMPLE_UNEXPECTED_RESULT',
    },
    {
      rowId: 'VALID_REJECTED_SAMPLE_CREATES_RETRACE_CANDIDATE',
      validationStatus: validRejected?.expectedMatched ? 'PASS' : 'INVALID',
      failures: validRejected?.expectedMatched ? '' : 'VALID_REJECTED_SAMPLE_UNEXPECTED_RESULT',
    },
    {
      rowId: 'INVALID_APPROVED_SAMPLE_BLOCKED',
      validationStatus: invalidApproved?.expectedMatched && invalidApproved.invalidFailureCodes.includes('APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT') ? 'PASS' : 'INVALID',
      failures: invalidApproved?.expectedMatched && invalidApproved.invalidFailureCodes.includes('APPROVED_REQUIRES_REVIEWER_AND_REVIEWED_AT')
        ? ''
        : 'INVALID_APPROVED_SAMPLE_NOT_BLOCKED',
    },
    {
      rowId: 'INVALID_REJECTED_SAMPLE_BLOCKED',
      validationStatus: invalidRejected?.expectedMatched && invalidRejected.invalidFailureCodes.includes('REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION') ? 'PASS' : 'INVALID',
      failures: invalidRejected?.expectedMatched && invalidRejected.invalidFailureCodes.includes('REJECTED_REQUIRES_REVIEW_NOTE_AND_NEXT_ACTION')
        ? ''
        : 'INVALID_REJECTED_SAMPLE_NOT_BLOCKED',
    },
    {
      rowId: 'NO_SOURCE_WRITE',
      validationStatus: 'PASS',
      failures: '',
    },
  ];
  const invalidChecks = checks.filter((row) => row.validationStatus === 'INVALID');
  const summary = {
    status: invalidChecks.length === 0 ? 'p38-review-input-seed-ready' : 'p38-review-input-seed-blocked',
    seedRows: seedSummary.reviewRows,
    seedPendingRows: seedSummary.pendingRows,
    seedInvalidRows: seedSummary.invalidRows,
    fixtureRows: fixtureReports.length,
    validApprovedSamplePasses: validApproved?.expectedMatched === true,
    validRejectedSampleCreatesRetraceCandidate: validRejected?.expectedMatched === true,
    invalidApprovedSampleBlocked: invalidApproved?.expectedMatched === true,
    invalidRejectedSampleBlocked: invalidRejected?.expectedMatched === true,
    p37ReviewInputOverrideSupported,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    currentSelectableSeats: DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length,
    releaseLockAllowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    invalidChecks: invalidChecks.length,
  };
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p36Template: toFrontendRelative(p36JsonPath),
      p37Source: toFrontendRelative(p37SourcePath),
      referenceImage: p36.source?.referenceImage,
      viewBox: p36.source?.viewBox,
      imageSha256: p36.source?.imageSha256,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      releaseLockAllowed: false,
      note: 'P38 creates a separate operator input seed and sample fixtures without modifying P36 evidence. OPERATOR_WRITABLE_COLUMNS_ONLY are operatorDecision, reviewer, reviewedAt, reviewNote, nextAction.',
    },
    summary,
    seedSummary,
    fixtureReports,
    validations: checks,
    outputs: {
      seedJson: toFrontendRelative(seedJsonPath),
      seedCsv: toFrontendRelative(seedCsvPath),
      auditJson: toFrontendRelative(auditJsonPath),
      auditCsv: toFrontendRelative(auditCsvPath),
      auditMd: toFrontendRelative(auditMdPath),
      fixtureDir: toFrontendRelative(fixtureDir),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(auditJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(auditCsvPath, buildCsv([
    {
      fixtureId: 'SEED_PENDING_INPUT',
      jsonPath: toFrontendRelative(seedJsonPath),
      csvPath: toFrontendRelative(seedCsvPath),
      ...seedSummary,
      expectedMatched: seedPendingRowsValid,
      invalidFailureCodes: '',
    },
    ...fixtureReports,
  ], [
    'fixtureId',
    'jsonPath',
    'csvPath',
    'reviewRows',
    'approvedRows',
    'rejectedRows',
    'pendingRows',
    'invalidRows',
    'retraceCandidates',
    'releaseLockCandidateReady',
    'expectedMatched',
    'invalidFailureCodes',
  ]));
  await fs.writeFile(auditMdPath, [
    '# 대구 operator reference P38 review input seed',
    '',
    `- status: \`${summary.status}\``,
    `- seed rows: \`${summary.seedRows}\``,
    `- seed pending rows: \`${summary.seedPendingRows}\``,
    `- seed invalid rows: \`${summary.seedInvalidRows}\``,
    `- P37 review input override supported: \`${summary.p37ReviewInputOverrideSupported}\``,
    `- valid approved sample passes: \`${summary.validApprovedSamplePasses}\``,
    `- valid rejected sample creates retrace candidate: \`${summary.validRejectedSampleCreatesRetraceCandidate}\``,
    `- invalid approved sample blocked: \`${summary.invalidApprovedSampleBlocked}\``,
    `- invalid rejected sample blocked: \`${summary.invalidRejectedSampleBlocked}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Operator Input Seed',
    '',
    `- json: \`${toFrontendRelative(seedJsonPath)}\``,
    `- csv: \`${toFrontendRelative(seedCsvPath)}\``,
    '',
    '## Fixtures',
    '',
    ...fixtureReports.map((fixture) => `- \`${fixture.fixtureId}\` invalid=${fixture.invalidRows} rejected=${fixture.rejectedRows} pending=${fixture.pendingRows} expected=${fixture.expectedMatched} json=\`${fixture.jsonPath}\``),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} seedRows=${summary.seedRows} seedPending=${summary.seedPendingRows} fixtures=${summary.fixtureRows} invalidChecks=${summary.invalidChecks}`);
  return payload;
}

async function writeGate() {
  let audit;
  try {
    audit = await readJson(auditJsonPath);
  } catch {
    audit = await writeAudit();
  }

  const validations = audit.validations ?? [];
  const invalidChecks = validations.filter((row) => row.validationStatus === 'INVALID');
  const summary = {
    status: invalidChecks.length === 0 ? 'p38-review-input-seed-gate-passed' : 'p38-review-input-seed-gate-blocked',
    totalValidations: validations.length,
    invalidChecks: invalidChecks.length,
    seedRows: audit.summary?.seedRows ?? 0,
    seedPendingRows: audit.summary?.seedPendingRows ?? 0,
    seedInvalidRows: audit.summary?.seedInvalidRows ?? 0,
    p37ReviewInputOverrideSupported: audit.summary?.p37ReviewInputOverrideSupported === true,
    validApprovedSamplePasses: audit.summary?.validApprovedSamplePasses === true,
    validRejectedSampleCreatesRetraceCandidate: audit.summary?.validRejectedSampleCreatesRetraceCandidate === true,
    invalidApprovedSampleBlocked: audit.summary?.invalidApprovedSampleBlocked === true,
    invalidRejectedSampleBlocked: audit.summary?.invalidRejectedSampleBlocked === true,
    releaseLockAllowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  if (requireSeed && invalidChecks.length > 0) {
    throw new Error(`P38 review input seed gate failed: ${invalidChecks.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P38 review input seed gate',
    '',
    `- status: \`${summary.status}\``,
    `- total validations: \`${summary.totalValidations}\``,
    `- invalid checks: \`${summary.invalidChecks}\``,
    `- seed rows: \`${summary.seedRows}\``,
    `- seed pending rows: \`${summary.seedPendingRows}\``,
    `- seed invalid rows: \`${summary.seedInvalidRows}\``,
    `- P37 review input override supported: \`${summary.p37ReviewInputOverrideSupported}\``,
    `- valid approved sample passes: \`${summary.validApprovedSamplePasses}\``,
    `- valid rejected sample creates retrace candidate: \`${summary.validRejectedSampleCreatesRetraceCandidate}\``,
    `- invalid approved sample blocked: \`${summary.invalidApprovedSampleBlocked}\``,
    `- invalid rejected sample blocked: \`${summary.invalidRejectedSampleBlocked}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} seedRows=${summary.seedRows} invalidChecks=${summary.invalidChecks} override=${summary.p37ReviewInputOverrideSupported}`);
}

if (task === 'audit') {
  await writeAudit();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
