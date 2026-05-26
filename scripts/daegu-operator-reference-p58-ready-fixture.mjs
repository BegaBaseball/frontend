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
const p51InputCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input.csv');
const p51SeedCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input-seed.csv');
const p55HandoffJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p55-operator-handoff/daegu-operator-reference-p55-operator-handoff.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p58-ready-fixture');
const fixtureDir = path.join(outputDir, 'fixtures');
const gateDir = path.join(outputDir, 'gate');
const fixtureCsvPath = path.join(fixtureDir, 'daegu-operator-reference-p58-approved-1.csv');
const fixtureJsonPath = path.join(outputDir, 'daegu-operator-reference-p58-ready-fixture.json');
const fixtureMdPath = path.join(outputDir, 'daegu-operator-reference-p58-ready-fixture.md');
const approvedRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p58-approved-rows.csv');
const blockedRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p58-blocked-rows.csv');
const validationCsvPath = path.join(outputDir, 'daegu-operator-reference-p58-validation.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p58-ready-fixture-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p58-ready-fixture-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p58-ready-fixture-gate.md');

const task = process.argv[2] ?? 'fixture';
const requireReady = process.argv.includes('--require-ready');
const viewBoxSize = 4096;
const approvedFixtureSectionId = 'daegu-outfield-table-tr-tr-9';
const fixtureReviewer = 'P58_READY_FIXTURE';
const fixtureReviewedAt = '2026-05-26T00:00:00.000+09:00';
const writableColumns = [
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'reviewNote',
  'nextAction',
];
const immutableColumns = [
  'queueOrder',
  'reviewZone',
  'zoneOrder',
  'reviewId',
  'sectionId',
  'block',
  'name',
  'evidenceCropPng',
  'evidenceCropSvg',
  'overlayPng',
  'editableColumns',
  'immutableColumns',
];
const csvColumns = [
  ...immutableColumns.slice(0, 10),
  ...writableColumns,
  'editableColumns',
  'immutableColumns',
];

const sourceContractLiterals = [
  'P58_READY_FIXTURE',
  'P51_REAL_INPUT_UNCHANGED',
  'P56_FIXTURE_INTAKE_SIMULATION',
  'P57_FIXTURE_HANDOFF_SIMULATION',
  'APPROVED_1_READY_FOR_P52',
  'P58_FIXTURE_APPROVED_ROWS_ONLY',
  'P58_FIXTURE_DOES_NOT_WRITE_REAL_P51',
  'P52_PREVIEW_READY_TRUE_WITH_APPROVED_1',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'readyForP52=true',
  'p58-ready-fixture-ready',
  'p58-ready-fixture-gate-passed',
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

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readCsv(filePath) {
  return parseCsv(await fs.readFile(filePath, 'utf8'));
}

async function hashFile(filePath) {
  const bytes = await fs.readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

function normalizeDecision(value) {
  return String(value ?? '').trim().toUpperCase() || 'PENDING';
}

function parseSvgPolygonPath(pathText) {
  const tokens = String(pathText ?? '').match(/[MLHVZmlhvz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const points = [];
  let command = '';
  let index = 0;
  let current = [0, 0];

  function readNumber() {
    const value = Number(tokens[index]);
    if (!Number.isFinite(value)) throw new Error(`EXPECTED_NUMBER_AT_${index}`);
    index += 1;
    return value;
  }

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[MLHVZmlhvz]$/.test(token)) {
      command = token;
      index += 1;
    } else if (!command) {
      throw new Error(`EXPECTED_COMMAND_AT_${index}`);
    }

    if (/^[Zz]$/.test(command)) continue;
    if (/^[MmLl]$/.test(command)) {
      const isRelative = command === 'm' || command === 'l';
      while (index < tokens.length && !/^[MLHVZmlhvz]$/.test(tokens[index])) {
        const x = readNumber();
        const y = readNumber();
        current = isRelative ? [current[0] + x, current[1] + y] : [x, y];
        points.push(current);
        if (command === 'M') command = 'L';
        if (command === 'm') command = 'l';
      }
      continue;
    }
    throw new Error(`UNSUPPORTED_PATH_COMMAND_${command}`);
  }

  return points;
}

function polygonArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function pointInPolygon(point, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [xi, yi] = points[index];
    const [xj, yj] = points[previous];
    const intersects = ((yi > point[1]) !== (yj > point[1]))
      && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function buildFixtureRows(seedRows) {
  const blockById = new Map(DAEGU_OPERATOR_REFERENCE_BLOCKS.map((block) => [block.id, block]));
  const fixtureBlock = blockById.get(approvedFixtureSectionId);
  if (!fixtureBlock) throw new Error(`Missing fixture block: ${approvedFixtureSectionId}`);
  const visualPath = fixtureBlock.imageGeometry.visualPath ?? fixtureBlock.imageGeometry.d;
  const labelPoint = fixtureBlock.imageGeometry.labelPoint ?? [fixtureBlock.imageGeometry.labelX, fixtureBlock.imageGeometry.labelY];
  if (!visualPath || !labelPoint?.every((value) => Number.isFinite(Number(value)))) {
    throw new Error(`Fixture block geometry is incomplete: ${approvedFixtureSectionId}`);
  }

  return seedRows.map((row) => {
    if (row.sectionId !== approvedFixtureSectionId) return { ...row };
    return {
      ...row,
      operatorDecision: 'APPROVED',
      correctedPath: visualPath,
      correctedLabelX: labelPoint[0],
      correctedLabelY: labelPoint[1],
      reviewer: fixtureReviewer,
      reviewedAt: fixtureReviewedAt,
      reviewNote: 'P58 ready fixture: existing operator reference polygon is used only to validate P56/P57/P52 gate flow.',
      nextAction: 'P58_READY_FIXTURE_APPROVED_1',
    };
  });
}

function validateApprovedRow(row) {
  const failures = [];
  const points = parseSvgPolygonPath(row.correctedPath);
  const labelX = Number(row.correctedLabelX);
  const labelY = Number(row.correctedLabelY);
  if (points.length < 3) failures.push('CORRECTED_PATH_REQUIRES_3_POINTS');
  if (points.some(([x, y]) => x < 0 || x > viewBoxSize || y < 0 || y > viewBoxSize)) {
    failures.push('APPROVED_GEOMETRY_WITHIN_4096_VIEWBOX');
  }
  if (polygonArea(points) <= 0.5) failures.push('CORRECTED_PATH_AREA_TOO_SMALL');
  if (!Number.isFinite(labelX) || !Number.isFinite(labelY)) failures.push('APPROVED_REQUIRES_CORRECTED_LABEL_XY');
  if (Number.isFinite(labelX) && Number.isFinite(labelY) && !pointInPolygon([labelX, labelY], points)) {
    failures.push('APPROVED_LABEL_POINT_TOP_HIT');
  }
  if (!row.reviewer || !row.reviewedAt || !row.reviewNote) {
    failures.push('APPROVED_REQUIRES_CORRECTED_PATH_LABEL_REVIEWER_REVIEWED_AT');
  }
  return {
    failures,
    pointCount: points.length,
    area: Number(polygonArea(points).toFixed(2)),
  };
}

function validateFixtureRows(rows) {
  return rows.map((row) => {
    const operatorDecision = normalizeDecision(row.operatorDecision);
    if (operatorDecision !== 'APPROVED') {
      return {
        rowId: row.reviewId,
        sectionId: row.sectionId,
        block: row.block,
        name: row.name,
        reviewZone: row.reviewZone,
        operatorDecision,
        validationStatus: 'REVIEW_PENDING',
        failures: 'PENDING_FIXTURE_ROW',
        geometryPointCount: 0,
        geometryArea: 0,
        nextAction: 'This row remains pending in the P58 one-row fixture.',
      };
    }
    const geometry = validateApprovedRow(row);
    return {
      rowId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      reviewZone: row.reviewZone,
      operatorDecision,
      validationStatus: geometry.failures.length > 0 ? 'INVALID' : 'PASS',
      failures: geometry.failures.join('|'),
      geometryPointCount: geometry.pointCount,
      geometryArea: geometry.area,
      nextAction: geometry.failures.length > 0 ? 'Fix the P58 fixture row.' : 'Fixture row is ready for simulated P52 preview.',
    };
  });
}

function buildApprovedRows(rows, validations) {
  const validationBySectionId = new Map(validations.map((row) => [row.sectionId, row]));
  return rows
    .filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED')
    .filter((row) => validationBySectionId.get(row.sectionId)?.validationStatus === 'PASS')
    .map((row, index) => ({
      previewOrder: index + 1,
      reviewId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      reviewZone: row.reviewZone,
      correctedPath: row.correctedPath,
      correctedLabelPoint: `${row.correctedLabelX}|${row.correctedLabelY}`,
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      readyForP52Preview: true,
      productionWriteAllowed: false,
    }));
}

function buildBlockedRows(validations) {
  return validations
    .filter((row) => row.validationStatus !== 'PASS')
    .map((row) => ({
      reviewId: row.rowId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      reviewZone: row.reviewZone,
      operatorDecision: row.operatorDecision,
      validationStatus: row.validationStatus,
      failures: row.failures,
      blockerType: row.validationStatus === 'REVIEW_PENDING'
        ? 'PENDING_FIXTURE_ROWS_NOT_EXPORTED_TO_P52'
        : 'INVALID_FIXTURE_ROW_BLOCKED',
      nextAction: row.nextAction,
    }));
}

function summarize({ p55, realInputShaBefore, realInputShaAfter, fixtureSha, fixtureRows, validations, approvedRows, blockedRows }) {
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const approvedCount = fixtureRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED').length;
  const pendingCount = fixtureRows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING').length;
  const p56FixturePreviewReady = fixtureSha !== p55.summary?.p51InputSha256
    && approvedCount === 1
    && approvedRows.length === 1
    && invalidRows.length === 0;
  const p57FixtureReadyForP52 = p56FixturePreviewReady
    && approvedRows.length === 1
    && blockedRows.length === 130;
  const realInputUnchanged = realInputShaBefore === realInputShaAfter;
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;

  return {
    status: p57FixtureReadyForP52 && realInputUnchanged ? 'p58-ready-fixture-ready' : 'p58-ready-fixture-blocked',
    p55Status: p55.status ?? p55.summary?.status ?? '',
    p55BaselineSha256: p55.summary?.p51InputSha256 ?? '',
    p51RealInputShaBefore: realInputShaBefore,
    p51RealInputShaAfter: realInputShaAfter,
    p51RealInputUnchanged: realInputUnchanged,
    fixtureCsv: toFrontendRelative(fixtureCsvPath),
    fixtureSha256: fixtureSha,
    fixtureRows: fixtureRows.length,
    currentSelectableSeats,
    officialDatasetBlocks,
    approvedRows: approvedCount,
    approvedPreviewReadyRows: approvedRows.length,
    blockedRows: blockedRows.length,
    pendingRows: pendingCount,
    invalidRows: invalidRows.length,
    p56FixtureIntakeStatus: p56FixturePreviewReady ? 'p58-fixture-p56-approved-ready-for-preview' : 'p58-fixture-p56-blocked',
    p57FixtureHandoffStatus: p57FixtureReadyForP52 ? 'p58-fixture-p57-p52-handoff-ready' : 'p58-fixture-p57-p52-handoff-blocked',
    p56FixturePreviewReady,
    p57FixtureReadyForP52,
    readyForP52: p57FixtureReadyForP52,
    p52SourcePatchPreviewAllowed: p57FixtureReadyForP52,
    sourceApplyAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildValidationRows(summary) {
  return [
    {
      rowId: 'P58_READY_FIXTURE',
      validationType: 'FIXTURE_CONTRACT',
      validationStatus: summary.fixtureRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.fixtureRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `ROWS_${summary.fixtureRows}_SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Use this fixture only to validate the P56/P57/P52 ready path.',
    },
    {
      rowId: 'P51_REAL_INPUT_UNCHANGED',
      validationType: 'INPUT_SAFETY',
      validationStatus: summary.p51RealInputUnchanged ? 'PASS' : 'INVALID',
      failures: summary.p51RealInputUnchanged ? '' : 'REAL_P51_INPUT_CHANGED',
      nextAction: 'P58 must never write the production P51 CSV.',
    },
    {
      rowId: 'P56_FIXTURE_INTAKE_SIMULATION',
      validationType: 'P56_SIMULATION',
      validationStatus: summary.p56FixturePreviewReady ? 'PASS' : 'INVALID',
      failures: summary.p56FixturePreviewReady ? '' : 'P56_FIXTURE_PREVIEW_NOT_READY',
      nextAction: 'Fixture must make P56 preview-ready with one approved row.',
    },
    {
      rowId: 'P57_FIXTURE_HANDOFF_SIMULATION',
      validationType: 'P57_SIMULATION',
      validationStatus: summary.p57FixtureReadyForP52 ? 'PASS' : 'INVALID',
      failures: summary.p57FixtureReadyForP52 ? '' : 'P57_FIXTURE_HANDOFF_NOT_READY',
      nextAction: 'Fixture must make P57 readyForP52=true.',
    },
    {
      rowId: 'APPROVED_1_READY_FOR_P52',
      validationType: 'APPROVAL_POLICY',
      validationStatus: summary.approvedRows === 1 && summary.approvedPreviewReadyRows === 1 ? 'PASS' : 'INVALID',
      failures: summary.approvedRows === 1 && summary.approvedPreviewReadyRows === 1
        ? ''
        : `APPROVED_${summary.approvedRows}_READY_${summary.approvedPreviewReadyRows}`,
      nextAction: 'Exactly one approved fixture row should become P52-ready.',
    },
    {
      rowId: 'P58_FIXTURE_APPROVED_ROWS_ONLY',
      validationType: 'ROW_POLICY',
      validationStatus: summary.approvedPreviewReadyRows === 1 && summary.blockedRows === 130 ? 'PASS' : 'INVALID',
      failures: summary.approvedPreviewReadyRows === 1 && summary.blockedRows === 130
        ? ''
        : `READY_${summary.approvedPreviewReadyRows}_BLOCKED_${summary.blockedRows}`,
      nextAction: 'Only the one approved fixture row may enter the simulated P52 handoff.',
    },
    {
      rowId: 'P52_PREVIEW_READY_TRUE_WITH_APPROVED_1',
      validationType: 'PREVIEW_POLICY',
      validationStatus: summary.readyForP52 ? 'PASS' : 'INVALID',
      failures: summary.readyForP52 ? '' : 'READY_FOR_P52_FALSE',
      nextAction: 'The fixture should prove P52 can open after one valid approved row.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'P58 must not write src/data/daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P58 is a fixture simulation only; release remains forbidden.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu fixture simulation.',
    },
  ];
}

async function buildFixturePayload() {
  const realInputShaBefore = await hashFile(p51InputCsvPath);
  const [p55, seedRows] = await Promise.all([
    readJson(p55HandoffJsonPath),
    readCsv(p51SeedCsvPath),
  ]);
  const fixtureRows = buildFixtureRows(seedRows);

  await fs.mkdir(fixtureDir, { recursive: true });
  await fs.writeFile(fixtureCsvPath, buildCsv(fixtureRows, csvColumns));

  const fixtureSha = await hashFile(fixtureCsvPath);
  const validations = validateFixtureRows(fixtureRows);
  const approvedRows = buildApprovedRows(fixtureRows, validations);
  const blockedRows = buildBlockedRows(validations);
  const realInputShaAfter = await hashFile(p51InputCsvPath);
  const summary = summarize({
    p55,
    realInputShaBefore,
    realInputShaAfter,
    fixtureSha,
    fixtureRows,
    validations,
    approvedRows,
    blockedRows,
  });
  const policyValidations = buildValidationRows(summary);

  return {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p51RealInputCsv: toFrontendRelative(p51InputCsvPath),
      p51SeedCsv: toFrontendRelative(p51SeedCsvPath),
      p55HandoffJson: toFrontendRelative(p55HandoffJsonPath),
    },
    policy: {
      fixtureOnly: true,
      p58FixtureDoesNotWriteRealP51: true,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P58_READY_FIXTURE. P51_REAL_INPUT_UNCHANGED. P56_FIXTURE_INTAKE_SIMULATION. P57_FIXTURE_HANDOFF_SIMULATION. APPROVED_1_READY_FOR_P52. SOURCE_WRITE_FORBIDDEN.',
    },
    summary,
    approvedRows,
    blockedRows,
    validations: [...policyValidations, ...validations],
    outputs: {
      fixtureCsv: toFrontendRelative(fixtureCsvPath),
      fixtureJson: toFrontendRelative(fixtureJsonPath),
      fixtureMd: toFrontendRelative(fixtureMdPath),
      approvedRowsCsv: toFrontendRelative(approvedRowsCsvPath),
      blockedRowsCsv: toFrontendRelative(blockedRowsCsvPath),
      validationCsv: toFrontendRelative(validationCsvPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };
}

async function writeFixture() {
  const payload = await buildFixturePayload();
  const { summary } = payload;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(fixtureJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(approvedRowsCsvPath, buildCsv(payload.approvedRows, [
    'previewOrder',
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'correctedPath',
    'correctedLabelPoint',
    'reviewer',
    'reviewedAt',
    'readyForP52Preview',
    'productionWriteAllowed',
  ]));
  await fs.writeFile(blockedRowsCsvPath, buildCsv(payload.blockedRows, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'operatorDecision',
    'validationStatus',
    'failures',
    'blockerType',
    'nextAction',
  ]));
  await fs.writeFile(validationCsvPath, buildCsv(payload.validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'operatorDecision',
    'failures',
    'geometryPointCount',
    'geometryArea',
    'nextAction',
  ]));
  await fs.writeFile(fixtureMdPath, [
    '# 대구 operator reference P58 ready fixture',
    '',
    `- status: \`${summary.status}\``,
    `- fixture CSV: \`${summary.fixtureCsv}\``,
    `- real P51 input unchanged: \`${summary.p51RealInputUnchanged}\``,
    `- fixture rows: \`${summary.fixtureRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- approved preview-ready rows: \`${summary.approvedPreviewReadyRows}\``,
    `- blocked rows: \`${summary.blockedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- P56 fixture preview ready: \`${summary.p56FixturePreviewReady}\``,
    `- P57 fixture ready for P52: \`${summary.p57FixtureReadyForP52}\``,
    `- ready for P52: \`${summary.readyForP52}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
    '## Rule',
    '',
    '- This fixture validates the P56 -> P57 -> P52 ready path with one approved row.',
    '- It writes only files under the P58 report directory.',
    '- It never writes the real P51 input CSV or `src/data/daeguSeatData.ts`.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} approved=${summary.approvedRows} approvedReady=${summary.approvedPreviewReadyRows} blocked=${summary.blockedRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} readyForP52=${summary.readyForP52} realP51Unchanged=${summary.p51RealInputUnchanged} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const fixture = await writeFixture();
  const invalidRows = (fixture.validations ?? []).filter((row) => row.validationStatus === 'INVALID');
  const readyFailures = requireReady && !fixture.summary?.readyForP52
    ? [{
        rowId: 'P58_REQUIRE_READY',
        validationType: 'REQUIRE_READY_POLICY',
        validationStatus: 'INVALID',
        failures: 'READY_FOR_P52_FALSE',
        nextAction: 'Fix P58 fixture readiness before requiring ready.',
      }]
    : [];
  const gateValidations = [...(fixture.validations ?? []), ...readyFailures];
  const gateInvalidRows = [...invalidRows, ...readyFailures];
  const summary = {
    status: gateInvalidRows.length === 0 ? 'p58-ready-fixture-gate-passed' : 'p58-ready-fixture-gate-blocked',
    fixtureStatus: fixture.summary?.status ?? '',
    totalValidations: gateValidations.length,
    invalidRows: gateInvalidRows.length,
    realP51InputUnchanged: fixture.summary?.p51RealInputUnchanged === true,
    fixtureRows: fixture.summary?.fixtureRows ?? 0,
    approvedRows: fixture.summary?.approvedRows ?? 0,
    approvedPreviewReadyRows: fixture.summary?.approvedPreviewReadyRows ?? 0,
    blockedRows: fixture.summary?.blockedRows ?? 0,
    pendingRows: fixture.summary?.pendingRows ?? 0,
    p56FixturePreviewReady: fixture.summary?.p56FixturePreviewReady === true,
    p57FixtureReadyForP52: fixture.summary?.p57FixtureReadyForP52 === true,
    readyForP52: fixture.summary?.readyForP52 === true,
    p52SourcePatchPreviewAllowed: fixture.summary?.p52SourcePatchPreviewAllowed === true,
    sourceApplyAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: fixture.summary?.buildBlockerTrackedSeparately,
  };

  if (requireReady && gateInvalidRows.length > 0) {
    throw new Error(`P58 ready fixture gate failed: ${gateInvalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations: gateValidations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(gateValidations, [
    'rowId',
    'validationType',
    'validationStatus',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'operatorDecision',
    'failures',
    'geometryPointCount',
    'geometryArea',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P58 ready fixture gate',
    '',
    `- status: \`${summary.status}\``,
    `- fixture status: \`${summary.fixtureStatus}\``,
    `- real P51 input unchanged: \`${summary.realP51InputUnchanged}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- approved preview-ready rows: \`${summary.approvedPreviewReadyRows}\``,
    `- blocked rows: \`${summary.blockedRows}\``,
    `- ready for P52: \`${summary.readyForP52}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} fixtureStatus=${summary.fixtureStatus} approved=${summary.approvedRows} approvedReady=${summary.approvedPreviewReadyRows} blocked=${summary.blockedRows} readyForP52=${summary.readyForP52} realP51Unchanged=${summary.realP51InputUnchanged} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'fixture') {
  await writeFixture();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
