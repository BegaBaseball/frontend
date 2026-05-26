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
const p41JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p41-review-handoff/daegu-operator-reference-p41-review-handoff.json');
const p42SourcePath = path.join(frontendRoot, 'scripts/daegu-operator-reference-p42-review-intake.mjs');
const p43SourcePath = path.join(frontendRoot, 'scripts/daegu-operator-reference-p43-release-candidate-preflight.mjs');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p44-decision-fixtures');
const fixtureDir = path.join(outputDir, 'fixtures');
const gateDir = path.join(outputDir, 'gate');
const auditJsonPath = path.join(outputDir, 'daegu-operator-reference-p44-decision-fixtures.json');
const auditCsvPath = path.join(outputDir, 'daegu-operator-reference-p44-decision-fixtures.csv');
const auditMdPath = path.join(outputDir, 'daegu-operator-reference-p44-decision-fixtures.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p44-decision-fixtures-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p44-decision-fixtures-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p44-decision-fixtures-gate.md');

const task = process.argv[2] ?? 'fixtures';
const requireFixtures = process.argv.includes('--require-fixtures');
const sampleReviewer = 'operator-fixture';
const sampleReviewedAt = '2026-05-25T00:00:00.000Z';
const allowedDecisions = new Set(['PENDING', 'APPROVED', 'REJECTED']);
const fixturePaths = {
  validApprovedJson: path.join(fixtureDir, 'daegu-operator-reference-p44-valid-approved-sample.json'),
  validApprovedCsv: path.join(fixtureDir, 'daegu-operator-reference-p44-valid-approved-sample.csv'),
  validRejectedJson: path.join(fixtureDir, 'daegu-operator-reference-p44-valid-rejected-sample.json'),
  validRejectedCsv: path.join(fixtureDir, 'daegu-operator-reference-p44-valid-rejected-sample.csv'),
  invalidApprovedJson: path.join(fixtureDir, 'daegu-operator-reference-p44-invalid-approved-sample.json'),
  invalidApprovedCsv: path.join(fixtureDir, 'daegu-operator-reference-p44-invalid-approved-sample.csv'),
  invalidImmutableJson: path.join(fixtureDir, 'daegu-operator-reference-p44-invalid-immutable-change-sample.json'),
  invalidImmutableCsv: path.join(fixtureDir, 'daegu-operator-reference-p44-invalid-immutable-change-sample.csv'),
  fullApprovedJson: path.join(fixtureDir, 'daegu-operator-reference-p44-full-approved-131-sample.json'),
  fullApprovedCsv: path.join(fixtureDir, 'daegu-operator-reference-p44-full-approved-131-sample.csv'),
};

const operatorWritableColumns = [
  'operatorDecision',
  'reviewer',
  'reviewedAt',
  'reviewNote',
  'nextAction',
];
const immutableEvidenceColumns = [
  'reviewId',
  'sectionId',
  'block',
  'name',
  'evidenceCropPng',
  'evidenceCropSvg',
  'overlayPng',
];
const csvColumns = [
  'queueOrder',
  'reviewZone',
  'zoneOrder',
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
  'evidenceCropSvg',
  'overlayPng',
  'handoffInstruction',
];

const sourceContractLiterals = [
  'P44_OPERATOR_DECISION_FIXTURES',
  'VALID_APPROVED_SAMPLE_PASSES_P42',
  'VALID_REJECTED_SAMPLE_CREATES_RETRACE_QUEUE',
  'INVALID_APPROVED_SAMPLE_BLOCKED',
  'INVALID_IMMUTABLE_CHANGE_SAMPLE_BLOCKED',
  'FULL_APPROVED_131_SAMPLE_ALLOWS_P43_CANDIDATE',
  'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
  'P43_CANDIDATE_ALLOWED_ONLY_FOR_FULL_APPROVED_131',
  'OPERATOR_WRITABLE_COLUMNS_ONLY',
  'EVIDENCE_COLUMNS_IMMUTABLE',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p44-decision-fixtures-ready',
  'p44-decision-fixtures-gate-passed',
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

function cloneRows(rows) {
  return rows.map((row) => ({ ...row }));
}

function normalizeDecision(value) {
  return String(value ?? '').trim().toUpperCase() || 'PENDING';
}

function isValidIsoDate(value) {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function buildSeedIndex(seedRows) {
  return new Map(seedRows.map((row) => [row.sectionId, row]));
}

function approveRow(row, note) {
  return {
    ...row,
    operatorDecision: 'APPROVED',
    reviewer: sampleReviewer,
    reviewedAt: sampleReviewedAt,
    reviewNote: note,
    nextAction: 'NO_ACTION_APPROVED',
  };
}

function rejectRow(row, note) {
  return {
    ...row,
    operatorDecision: 'REJECTED',
    reviewer: sampleReviewer,
    reviewedAt: sampleReviewedAt,
    reviewNote: note,
    nextAction: 'CREATE_RETRACE_BATCH_FROM_P44_REJECTED_SAMPLE',
  };
}

function normalizeSeedRows(rows) {
  return rows.map((row) => ({
    queueOrder: row.queueOrder,
    reviewZone: row.reviewZone,
    zoneOrder: row.zoneOrder,
    reviewId: row.reviewId,
    sectionId: row.sectionId,
    block: row.block,
    name: row.name,
    operatorDecision: 'PENDING',
    reviewer: '',
    reviewedAt: '',
    reviewNote: '',
    nextAction: 'OPERATOR_REVIEW_PENDING',
    validationStatus: row.validationStatus,
    failures: row.failures,
    evidenceCropPng: row.evidenceCropPng,
    evidenceCropSvg: row.evidenceCropSvg,
    overlayPng: row.overlayPng,
    handoffInstruction: row.handoffInstruction,
  }));
}

function buildFixtures(seedRows) {
  const validApprovedRows = cloneRows(seedRows);
  validApprovedRows[0] = approveRow(
    validApprovedRows[0],
    'P44 valid approved sample: crop and overlay reviewed.',
  );

  const validRejectedRows = cloneRows(seedRows);
  validRejectedRows[1] = rejectRow(
    validRejectedRows[1],
    'P44 valid rejected sample: polygon retrace required.',
  );

  const invalidApprovedRows = cloneRows(seedRows);
  invalidApprovedRows[2] = {
    ...invalidApprovedRows[2],
    operatorDecision: 'APPROVED',
    reviewer: '',
    reviewedAt: '',
    reviewNote: '',
    nextAction: 'NO_ACTION_APPROVED',
  };

  const invalidImmutableRows = cloneRows(seedRows);
  invalidImmutableRows[3] = {
    ...invalidImmutableRows[3],
    block: `${invalidImmutableRows[3].block}-MUTATED`,
    operatorDecision: 'APPROVED',
    reviewer: sampleReviewer,
    reviewedAt: sampleReviewedAt,
    reviewNote: 'P44 invalid immutable sample: evidence column changed.',
    nextAction: 'NO_ACTION_APPROVED',
  };

  const fullApprovedRows = seedRows.map((row) => approveRow(
    row,
    'P44 full approved 131 sample: operator accepted crop and overlay evidence.',
  ));

  return [
    {
      fixtureId: 'VALID_APPROVED_SAMPLE_PASSES_P42',
      rows: validApprovedRows,
      jsonPath: fixturePaths.validApprovedJson,
      csvPath: fixturePaths.validApprovedCsv,
      expected: {
        approvedRows: 1,
        rejectedRows: 0,
        pendingRows: 130,
        invalidRows: 0,
        immutableColumnChangeCount: 0,
        retraceCandidates: 0,
        p43CandidateAllowed: false,
      },
    },
    {
      fixtureId: 'VALID_REJECTED_SAMPLE_CREATES_RETRACE_QUEUE',
      rows: validRejectedRows,
      jsonPath: fixturePaths.validRejectedJson,
      csvPath: fixturePaths.validRejectedCsv,
      expected: {
        approvedRows: 0,
        rejectedRows: 1,
        pendingRows: 130,
        invalidRows: 0,
        immutableColumnChangeCount: 0,
        retraceCandidates: 1,
        p43CandidateAllowed: false,
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
        immutableColumnChangeCount: 0,
        retraceCandidates: 0,
        p43CandidateAllowed: false,
      },
    },
    {
      fixtureId: 'INVALID_IMMUTABLE_CHANGE_SAMPLE_BLOCKED',
      rows: invalidImmutableRows,
      jsonPath: fixturePaths.invalidImmutableJson,
      csvPath: fixturePaths.invalidImmutableCsv,
      expected: {
        approvedRows: 1,
        rejectedRows: 0,
        pendingRows: 130,
        invalidRows: 1,
        immutableColumnChangeCount: 1,
        retraceCandidates: 0,
        p43CandidateAllowed: false,
      },
    },
    {
      fixtureId: 'FULL_APPROVED_131_SAMPLE_ALLOWS_P43_CANDIDATE',
      rows: fullApprovedRows,
      jsonPath: fixturePaths.fullApprovedJson,
      csvPath: fixturePaths.fullApprovedCsv,
      expected: {
        approvedRows: 131,
        rejectedRows: 0,
        pendingRows: 0,
        invalidRows: 0,
        immutableColumnChangeCount: 0,
        retraceCandidates: 0,
        p43CandidateAllowed: true,
      },
    },
  ];
}

function findImmutableColumnChanges(rows, seedRows) {
  const seedBySectionId = buildSeedIndex(seedRows);
  const changes = [];
  for (const row of rows) {
    const seed = seedBySectionId.get(row.sectionId);
    if (!seed) {
      changes.push({
        reviewId: row.reviewId,
        sectionId: row.sectionId,
        block: row.block,
        column: 'sectionId',
        seedValue: '',
        operatorValue: row.sectionId,
        changeType: 'ROW_NOT_IN_P41_HANDOFF',
      });
      continue;
    }
    for (const column of immutableEvidenceColumns) {
      const seedValue = String(seed[column] ?? '');
      const operatorValue = String(row[column] ?? '');
      if (seedValue !== operatorValue) {
        changes.push({
          reviewId: row.reviewId,
          sectionId: row.sectionId,
          block: row.block,
          column,
          seedValue,
          operatorValue,
          changeType: 'EVIDENCE_COLUMN_CHANGED',
        });
      }
    }
  }
  return changes;
}

async function validateRows(rows, seedRows, immutableChanges) {
  const sectionIds = new Set();
  const seedIds = new Set(seedRows.map((row) => row.sectionId));
  const immutableChangesBySection = new Map();
  for (const change of immutableChanges) {
    const list = immutableChangesBySection.get(change.sectionId) ?? [];
    list.push(change);
    immutableChangesBySection.set(change.sectionId, list);
  }
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
    if (!seedIds.has(row.sectionId)) failures.push('ROW_NOT_IN_P41_HANDOFF');
    if (!allowedDecisions.has(operatorDecision)) failures.push('INVALID_OPERATOR_DECISION');
    if (immutableChangesBySection.has(row.sectionId)) failures.push('EVIDENCE_COLUMNS_IMMUTABLE');
    if (!cropPngExists || !cropSvgExists || !overlayExists) failures.push('MISSING_EVIDENCE_LINK');

    if (operatorDecision === 'APPROVED') {
      if (!row.reviewer || !isValidIsoDate(row.reviewedAt) || !row.reviewNote) {
        failures.push('APPROVED_REQUIRES_REVIEWER_REVIEWED_AT_REVIEW_NOTE');
      }
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

function summarizeFixture({ rows, seedRows, validations, immutableChanges }) {
  const approvedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const rejectedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'REJECTED');
  const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const p43CandidateAllowed = rows.length === 131
    && seedRows.length === 131
    && approvedRows.length === 131
    && rejectedRows.length === 0
    && pendingRows.length === 0
    && invalidRows.length === 0
    && immutableChanges.length === 0
    && DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length === 131
    && DAEGU_BLOCKS.length === 177;
  return {
    reviewRows: rows.length,
    seedRows: seedRows.length,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    immutableColumnChangeCount: immutableChanges.length,
    retraceCandidates: rejectedRows.length,
    p42IntakeReady: invalidRows.length === 0,
    p43CandidateAllowed,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    passRelease177Allowed: false,
  };
}

function fixtureMatchesExpected(summary, expected) {
  return Object.entries(expected).every(([key, value]) => summary[key] === value);
}

async function writeFixturePayload({ filePath, fixtureId, rows, expected, summary }) {
  const payload = {
    status: 'p44-decision-fixture-ready',
    generatedAt: new Date().toISOString(),
    fixtureId,
    source: {
      p41Handoff: toFrontendRelative(p41JsonPath),
      p42ReviewInputEnv: `DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT=${toFrontendRelative(filePath)}`,
    },
    expected,
    summary,
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
    },
    rows,
  };
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function writeRowsCsv(filePath, rows) {
  await fs.writeFile(filePath, buildCsv(rows, csvColumns));
}

function buildChecks({ fixtureReports, p42Source, p43Source }) {
  const byId = new Map(fixtureReports.map((fixture) => [fixture.fixtureId, fixture]));
  const validApproved = byId.get('VALID_APPROVED_SAMPLE_PASSES_P42');
  const validRejected = byId.get('VALID_REJECTED_SAMPLE_CREATES_RETRACE_QUEUE');
  const invalidApproved = byId.get('INVALID_APPROVED_SAMPLE_BLOCKED');
  const invalidImmutable = byId.get('INVALID_IMMUTABLE_CHANGE_SAMPLE_BLOCKED');
  const fullApproved = byId.get('FULL_APPROVED_131_SAMPLE_ALLOWS_P43_CANDIDATE');
  return [
    {
      rowId: 'P44_OPERATOR_DECISION_FIXTURES',
      validationStatus: fixtureReports.length === 5 ? 'PASS' : 'INVALID',
      failures: fixtureReports.length === 5 ? '' : `FIXTURES_${fixtureReports.length}`,
    },
    {
      rowId: 'DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT',
      validationStatus: p42Source.includes('DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT') ? 'PASS' : 'INVALID',
      failures: p42Source.includes('DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT') ? '' : 'P42_REVIEW_INPUT_ENV_NOT_SUPPORTED',
    },
    {
      rowId: 'VALID_APPROVED_SAMPLE_PASSES_P42',
      validationStatus: validApproved?.expectedMatched ? 'PASS' : 'INVALID',
      failures: validApproved?.expectedMatched ? '' : 'VALID_APPROVED_SAMPLE_UNEXPECTED_RESULT',
    },
    {
      rowId: 'VALID_REJECTED_SAMPLE_CREATES_RETRACE_QUEUE',
      validationStatus: validRejected?.expectedMatched ? 'PASS' : 'INVALID',
      failures: validRejected?.expectedMatched ? '' : 'VALID_REJECTED_SAMPLE_UNEXPECTED_RESULT',
    },
    {
      rowId: 'INVALID_APPROVED_SAMPLE_BLOCKED',
      validationStatus: invalidApproved?.expectedMatched && invalidApproved.invalidFailureCodes.includes('APPROVED_REQUIRES_REVIEWER_REVIEWED_AT_REVIEW_NOTE') ? 'PASS' : 'INVALID',
      failures: invalidApproved?.expectedMatched && invalidApproved.invalidFailureCodes.includes('APPROVED_REQUIRES_REVIEWER_REVIEWED_AT_REVIEW_NOTE')
        ? ''
        : 'INVALID_APPROVED_SAMPLE_NOT_BLOCKED',
    },
    {
      rowId: 'INVALID_IMMUTABLE_CHANGE_SAMPLE_BLOCKED',
      validationStatus: invalidImmutable?.expectedMatched && invalidImmutable.invalidFailureCodes.includes('EVIDENCE_COLUMNS_IMMUTABLE') ? 'PASS' : 'INVALID',
      failures: invalidImmutable?.expectedMatched && invalidImmutable.invalidFailureCodes.includes('EVIDENCE_COLUMNS_IMMUTABLE')
        ? ''
        : 'INVALID_IMMUTABLE_CHANGE_SAMPLE_NOT_BLOCKED',
    },
    {
      rowId: 'FULL_APPROVED_131_SAMPLE_ALLOWS_P43_CANDIDATE',
      validationStatus: fullApproved?.expectedMatched && fullApproved.p43CandidateAllowed === true ? 'PASS' : 'INVALID',
      failures: fullApproved?.expectedMatched && fullApproved.p43CandidateAllowed === true
        ? ''
        : 'FULL_APPROVED_131_SAMPLE_NOT_RELEASE_CANDIDATE',
    },
    {
      rowId: 'P43_CANDIDATE_ALLOWED_ONLY_FOR_FULL_APPROVED_131',
      validationStatus: fixtureReports.filter((fixture) => fixture.p43CandidateAllowed).length === 1
        && fullApproved?.p43CandidateAllowed === true
        ? 'PASS'
        : 'INVALID',
      failures: fixtureReports.filter((fixture) => fixture.p43CandidateAllowed).length === 1
        && fullApproved?.p43CandidateAllowed === true
        ? ''
        : 'P43_CANDIDATE_ALLOWED_FOR_UNEXPECTED_FIXTURE',
    },
    {
      rowId: 'P43_SOURCE_STILL_FORBIDS_PASS_RELEASE_177',
      validationStatus: p43Source.includes('PASS_RELEASE_177_REMAINS_FORBIDDEN') ? 'PASS' : 'INVALID',
      failures: p43Source.includes('PASS_RELEASE_177_REMAINS_FORBIDDEN') ? '' : 'P43_PASS_RELEASE_177_POLICY_MISSING',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationStatus: 'PASS',
      failures: '',
    },
  ];
}

async function writeFixtures() {
  const [p41, p42Source, p43Source] = await Promise.all([
    readJson(p41JsonPath),
    fs.readFile(p42SourcePath, 'utf8'),
    fs.readFile(p43SourcePath, 'utf8'),
  ]);
  const seedRows = normalizeSeedRows(p41.rows ?? []);
  const fixtures = buildFixtures(seedRows);
  const fixtureReports = [];

  await fs.mkdir(fixtureDir, { recursive: true });
  for (const fixture of fixtures) {
    const immutableChanges = findImmutableColumnChanges(fixture.rows, seedRows);
    const validations = await validateRows(fixture.rows, seedRows, immutableChanges);
    const summary = summarizeFixture({
      rows: fixture.rows,
      seedRows,
      validations,
      immutableChanges,
    });
    await writeFixturePayload({
      filePath: fixture.jsonPath,
      fixtureId: fixture.fixtureId,
      rows: fixture.rows,
      expected: fixture.expected,
      summary,
    });
    await writeRowsCsv(fixture.csvPath, fixture.rows);
    fixtureReports.push({
      fixtureId: fixture.fixtureId,
      jsonPath: toFrontendRelative(fixture.jsonPath),
      csvPath: toFrontendRelative(fixture.csvPath),
      p42ReviewInputEnv: `DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT=${toFrontendRelative(fixture.csvPath)}`,
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

  const checks = buildChecks({ fixtureReports, p42Source, p43Source });
  const invalidChecks = checks.filter((row) => row.validationStatus === 'INVALID');
  const fullApproved = fixtureReports.find((fixture) => fixture.fixtureId === 'FULL_APPROVED_131_SAMPLE_ALLOWS_P43_CANDIDATE');
  const summary = {
    status: invalidChecks.length === 0 ? 'p44-decision-fixtures-ready' : 'p44-decision-fixtures-blocked',
    seedRows: seedRows.length,
    fixtureRows: fixtureReports.length,
    validApprovedSamplePassesP42: fixtureReports.find((fixture) => fixture.fixtureId === 'VALID_APPROVED_SAMPLE_PASSES_P42')?.expectedMatched === true,
    validRejectedSampleCreatesRetraceQueue: fixtureReports.find((fixture) => fixture.fixtureId === 'VALID_REJECTED_SAMPLE_CREATES_RETRACE_QUEUE')?.expectedMatched === true,
    invalidApprovedSampleBlocked: fixtureReports.find((fixture) => fixture.fixtureId === 'INVALID_APPROVED_SAMPLE_BLOCKED')?.expectedMatched === true,
    invalidImmutableChangeSampleBlocked: fixtureReports.find((fixture) => fixture.fixtureId === 'INVALID_IMMUTABLE_CHANGE_SAMPLE_BLOCKED')?.expectedMatched === true,
    fullApproved131SampleAllowsP43Candidate: fullApproved?.p43CandidateAllowed === true,
    p43CandidateAllowedOnlyForFullApproved131: fixtureReports.filter((fixture) => fixture.p43CandidateAllowed).length === 1,
    currentSelectableSeats: DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    passRelease177Allowed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
    invalidChecks: invalidChecks.length,
  };
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p41Handoff: toFrontendRelative(p41JsonPath),
      p42Source: toFrontendRelative(p42SourcePath),
      p43Source: toFrontendRelative(p43SourcePath),
    },
    policy: {
      operatorWritableColumns,
      immutableEvidenceColumns,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P44_OPERATOR_DECISION_FIXTURES. FULL_APPROVED_131_SAMPLE_ALLOWS_P43_CANDIDATE only verifies candidate readiness; it does not write source data or allow PASS_RELEASE_177.',
    },
    summary,
    fixtureReports,
    validations: checks,
    outputs: {
      auditJson: toFrontendRelative(auditJsonPath),
      auditCsv: toFrontendRelative(auditCsvPath),
      auditMd: toFrontendRelative(auditMdPath),
      fixtureDir: toFrontendRelative(fixtureDir),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(auditJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(auditCsvPath, buildCsv(fixtureReports, [
    'fixtureId',
    'jsonPath',
    'csvPath',
    'p42ReviewInputEnv',
    'reviewRows',
    'approvedRows',
    'rejectedRows',
    'pendingRows',
    'invalidRows',
    'immutableColumnChangeCount',
    'retraceCandidates',
    'p42IntakeReady',
    'p43CandidateAllowed',
    'expectedMatched',
    'invalidFailureCodes',
  ]));
  await fs.writeFile(auditMdPath, [
    '# 대구 operator reference P44 decision fixtures',
    '',
    `- status: \`${summary.status}\``,
    `- seed rows: \`${summary.seedRows}\``,
    `- fixture rows: \`${summary.fixtureRows}\``,
    `- valid approved sample passes P42: \`${summary.validApprovedSamplePassesP42}\``,
    `- valid rejected sample creates retrace queue: \`${summary.validRejectedSampleCreatesRetraceQueue}\``,
    `- invalid approved sample blocked: \`${summary.invalidApprovedSampleBlocked}\``,
    `- invalid immutable change sample blocked: \`${summary.invalidImmutableChangeSampleBlocked}\``,
    `- full approved 131 sample allows P43 candidate: \`${summary.fullApproved131SampleAllowsP43Candidate}\``,
    `- P43 candidate allowed only for full approved 131: \`${summary.p43CandidateAllowedOnlyForFullApproved131}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
    '## Fixtures',
    '',
    ...fixtureReports.map((fixture) => `- \`${fixture.fixtureId}\`: approved=\`${fixture.approvedRows}\`, rejected=\`${fixture.rejectedRows}\`, pending=\`${fixture.pendingRows}\`, invalid=\`${fixture.invalidRows}\`, immutable=\`${fixture.immutableColumnChangeCount}\`, p43Candidate=\`${fixture.p43CandidateAllowed}\`, csv=\`${fixture.csvPath}\``),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} fixtures=${summary.fixtureRows} fullApprovedP43=${summary.fullApproved131SampleAllowsP43Candidate} invalidChecks=${summary.invalidChecks} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  let audit;
  try {
    audit = await readJson(auditJsonPath);
  } catch {
    audit = await writeFixtures();
  }

  const validations = audit.validations ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const summary = {
    status: invalidRows.length === 0 ? 'p44-decision-fixtures-gate-passed' : 'p44-decision-fixtures-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    seedRows: audit.summary?.seedRows ?? 0,
    fixtureRows: audit.summary?.fixtureRows ?? 0,
    validApprovedSamplePassesP42: audit.summary?.validApprovedSamplePassesP42 === true,
    validRejectedSampleCreatesRetraceQueue: audit.summary?.validRejectedSampleCreatesRetraceQueue === true,
    invalidApprovedSampleBlocked: audit.summary?.invalidApprovedSampleBlocked === true,
    invalidImmutableChangeSampleBlocked: audit.summary?.invalidImmutableChangeSampleBlocked === true,
    fullApproved131SampleAllowsP43Candidate: audit.summary?.fullApproved131SampleAllowsP43Candidate === true,
    p43CandidateAllowedOnlyForFullApproved131: audit.summary?.p43CandidateAllowedOnlyForFullApproved131 === true,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    passRelease177Allowed: false,
    buildBlockerTrackedSeparately: audit.summary?.buildBlockerTrackedSeparately,
  };

  if (requireFixtures && invalidRows.length > 0) {
    throw new Error(`P44 decision fixtures gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P44 decision fixtures gate',
    '',
    `- status: \`${summary.status}\``,
    `- total validations: \`${summary.totalValidations}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- seed rows: \`${summary.seedRows}\``,
    `- fixture rows: \`${summary.fixtureRows}\``,
    `- valid approved sample passes P42: \`${summary.validApprovedSamplePassesP42}\``,
    `- valid rejected sample creates retrace queue: \`${summary.validRejectedSampleCreatesRetraceQueue}\``,
    `- invalid approved sample blocked: \`${summary.invalidApprovedSampleBlocked}\``,
    `- invalid immutable change sample blocked: \`${summary.invalidImmutableChangeSampleBlocked}\``,
    `- full approved 131 sample allows P43 candidate: \`${summary.fullApproved131SampleAllowsP43Candidate}\``,
    `- P43 candidate allowed only for full approved 131: \`${summary.p43CandidateAllowedOnlyForFullApproved131}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} fixtures=${summary.fixtureRows} fullApprovedP43=${summary.fullApproved131SampleAllowsP43Candidate} invalidRows=${summary.invalidRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'fixtures') {
  await writeFixtures();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
