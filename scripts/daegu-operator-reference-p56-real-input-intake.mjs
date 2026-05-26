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
const p51JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input.json');
const p51InputCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input.csv');
const p51SeedCsvPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p51-real-review-input/daegu-operator-reference-p51-real-review-input-seed.csv');
const p55HandoffJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p55-operator-handoff/daegu-operator-reference-p55-operator-handoff.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p56-real-input-intake');
const gateDir = path.join(outputDir, 'gate');
const intakeJsonPath = path.join(outputDir, 'daegu-operator-reference-p56-real-input-intake.json');
const intakeMdPath = path.join(outputDir, 'daegu-operator-reference-p56-real-input-intake.md');
const rowDiffCsvPath = path.join(outputDir, 'daegu-operator-reference-p56-row-diff.csv');
const approvedRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p56-approved-preview-ready-rows.csv');
const blockedRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p56-blocked-rows.csv');
const validationCsvPath = path.join(outputDir, 'daegu-operator-reference-p56-validation.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p56-real-input-intake-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p56-real-input-intake-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p56-real-input-intake-gate.md');

const task = process.argv[2] ?? 'intake';
const requireReady = process.argv.includes('--require-ready');
const viewBoxSize = 4096;
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
const allowedDecisions = new Set(['PENDING', 'APPROVED', 'REJECTED']);

const sourceContractLiterals = [
  'P56_REAL_INPUT_INTAKE',
  'P55_HANDOFF_HASH_BASELINE',
  'NO_OPERATOR_INPUT',
  'INPUT_EDITED_PENDING_APPROVAL',
  'APPROVED_READY_FOR_PREVIEW',
  'INVALID_OPERATOR_INPUT_BLOCKED',
  'OPERATOR_WRITABLE_ONLY',
  'IMMUTABLE_COLUMNS_UNCHANGED',
  'APPROVED_GEOMETRY_WITHIN_4096_VIEWBOX',
  'APPROVED_GEOMETRY_SELF_INTERSECTION_0',
  'APPROVED_LABEL_POINT_TOP_HIT',
  'P52_PREVIEW_READY_REQUIRES_APPROVED_ROWS',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p56-no-operator-input',
  'p56-input-edited-pending-approval',
  'p56-approved-ready-for-preview',
  'p56-invalid-operator-input-blocked',
  'p56-real-input-intake-gate-passed',
  'p56-real-input-intake-gate-blocked',
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

function isValidIsoDate(value) {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function finiteNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSvgPolygonPath(pathText) {
  const tokens = String(pathText ?? '').match(/[MLHVZmlhvz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const points = [];
  let command = '';
  let index = 0;
  let current = [0, 0];

  function readNumber() {
    const token = tokens[index];
    const value = Number(token);
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

    if (/^[Zz]$/.test(command)) {
      continue;
    }
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
    if (/^[Hh]$/.test(command)) {
      const isRelative = command === 'h';
      while (index < tokens.length && !/^[MLHVZmlhvz]$/.test(tokens[index])) {
        const x = readNumber();
        current = [isRelative ? current[0] + x : x, current[1]];
        points.push(current);
      }
      continue;
    }
    if (/^[Vv]$/.test(command)) {
      const isRelative = command === 'v';
      while (index < tokens.length && !/^[MLHVZmlhvz]$/.test(tokens[index])) {
        const y = readNumber();
        current = [current[0], isRelative ? current[1] + y : y];
        points.push(current);
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

function cross(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function isPointOnSegment(point, a, b) {
  const epsilon = 1e-7;
  if (Math.abs(cross(a, b, point)) > epsilon) return false;
  return point[0] >= Math.min(a[0], b[0]) - epsilon
    && point[0] <= Math.max(a[0], b[0]) + epsilon
    && point[1] >= Math.min(a[1], b[1]) - epsilon
    && point[1] <= Math.max(a[1], b[1]) + epsilon;
}

function segmentsIntersect(a, b, c, d) {
  if (isPointOnSegment(a, c, d) || isPointOnSegment(b, c, d) || isPointOnSegment(c, a, b) || isPointOnSegment(d, a, b)) {
    return true;
  }
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
}

function hasSelfIntersection(points) {
  for (let aIndex = 0; aIndex < points.length; aIndex += 1) {
    const a1 = points[aIndex];
    const a2 = points[(aIndex + 1) % points.length];
    for (let bIndex = aIndex + 1; bIndex < points.length; bIndex += 1) {
      const isAdjacent = Math.abs(aIndex - bIndex) === 1
        || (aIndex === 0 && bIndex === points.length - 1);
      if (isAdjacent) continue;
      const b1 = points[bIndex];
      const b2 = points[(bIndex + 1) % points.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function pointInPolygon(point, points) {
  if (points.some((a, index) => isPointOnSegment(point, a, points[(index + 1) % points.length]))) {
    return true;
  }

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

function validateApprovedGeometry(row) {
  const failures = [];
  let points = [];
  try {
    points = parseSvgPolygonPath(row.correctedPath);
  } catch (error) {
    failures.push(`CORRECTED_PATH_PARSE_FAILED:${error.message}`);
  }

  if (points.length < 3) failures.push('CORRECTED_PATH_REQUIRES_3_POINTS');
  const uniquePointCount = new Set(points.map(([x, y]) => `${x},${y}`)).size;
  if (uniquePointCount < 3) failures.push('CORRECTED_PATH_REQUIRES_3_UNIQUE_POINTS');
  if (points.some(([x, y]) => x < 0 || x > viewBoxSize || y < 0 || y > viewBoxSize)) {
    failures.push('APPROVED_GEOMETRY_WITHIN_4096_VIEWBOX');
  }
  if (points.length >= 3 && polygonArea(points) <= 0.5) failures.push('CORRECTED_PATH_AREA_TOO_SMALL');
  if (points.length >= 4 && hasSelfIntersection(points)) failures.push('APPROVED_GEOMETRY_SELF_INTERSECTION_0');

  const labelX = finiteNumber(row.correctedLabelX);
  const labelY = finiteNumber(row.correctedLabelY);
  if (labelX === null || labelY === null) {
    failures.push('APPROVED_REQUIRES_CORRECTED_LABEL_XY');
  } else if (labelX < 0 || labelX > viewBoxSize || labelY < 0 || labelY > viewBoxSize) {
    failures.push('CORRECTED_LABEL_WITHIN_4096_VIEWBOX');
  } else if (points.length >= 3 && !pointInPolygon([labelX, labelY], points)) {
    failures.push('APPROVED_LABEL_POINT_TOP_HIT');
  }

  return {
    failures,
    pointCount: points.length,
    area: points.length >= 3 ? Number(polygonArea(points).toFixed(2)) : 0,
  };
}

function findImmutableChanges(rows, seedRows) {
  const seedBySectionId = new Map(seedRows.map((row) => [row.sectionId, row]));
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
        currentValue: row.sectionId,
        changeType: 'ROW_NOT_IN_P51_SEED',
      });
      continue;
    }
    for (const column of immutableColumns) {
      if (String(seed[column] ?? '') !== String(row[column] ?? '')) {
        changes.push({
          reviewId: row.reviewId,
          sectionId: row.sectionId,
          block: row.block,
          column,
          seedValue: seed[column] ?? '',
          currentValue: row[column] ?? '',
          changeType: 'IMMUTABLE_COLUMN_CHANGED',
        });
      }
    }
  }
  return changes;
}

function buildRowDiffs(rows, seedRows) {
  const seedBySectionId = new Map(seedRows.map((row) => [row.sectionId, row]));
  return rows.map((row) => {
    const seed = seedBySectionId.get(row.sectionId);
    const changedWritableColumns = writableColumns.filter((column) => String(row[column] ?? '') !== String(seed?.[column] ?? ''));
    const changedImmutableColumns = immutableColumns.filter((column) => String(row[column] ?? '') !== String(seed?.[column] ?? ''));
    return {
      reviewId: row.reviewId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      reviewZone: row.reviewZone,
      operatorDecision: normalizeDecision(row.operatorDecision),
      changedWritableColumns: changedWritableColumns.join('|'),
      changedImmutableColumns: changedImmutableColumns.join('|'),
      changedWritableCount: changedWritableColumns.length,
      changedImmutableCount: changedImmutableColumns.length,
      rowDiffStatus: changedImmutableColumns.length > 0 ? 'IMMUTABLE_CHANGED' : changedWritableColumns.length > 0 ? 'WRITABLE_CHANGED' : 'UNCHANGED',
    };
  });
}

function validateRows(rows, seedRows, immutableChanges) {
  const seedIds = new Set(seedRows.map((row) => row.sectionId));
  const sectionIds = new Set();
  const approvedSectionIds = new Set();
  const immutableChangedIds = new Set(immutableChanges.map((change) => change.sectionId));
  const validations = [];

  for (const row of rows) {
    const operatorDecision = normalizeDecision(row.operatorDecision);
    const failures = [];
    let geometry = { pointCount: 0, area: 0 };

    if (!row.sectionId) failures.push('MISSING_SECTION_ID');
    if (sectionIds.has(row.sectionId)) failures.push('DUPLICATE_SECTION_ID');
    sectionIds.add(row.sectionId);
    if (!seedIds.has(row.sectionId)) failures.push('ROW_NOT_IN_P51_SEED');
    if (!allowedDecisions.has(operatorDecision)) failures.push('INVALID_OPERATOR_DECISION');
    if (immutableChangedIds.has(row.sectionId)) failures.push('IMMUTABLE_COLUMNS_UNCHANGED');

    if (operatorDecision === 'APPROVED') {
      if (approvedSectionIds.has(row.sectionId)) failures.push('DUPLICATE_APPROVED_SECTION_ID');
      approvedSectionIds.add(row.sectionId);
      if (!row.correctedPath) failures.push('APPROVED_REQUIRES_CORRECTED_PATH');
      if (!row.reviewer || !isValidIsoDate(row.reviewedAt) || !row.reviewNote) {
        failures.push('APPROVED_REQUIRES_CORRECTED_PATH_LABEL_REVIEWER_REVIEWED_AT');
      }
      geometry = validateApprovedGeometry(row);
      failures.push(...geometry.failures);
    }

    if (operatorDecision === 'REJECTED') {
      if (!row.reviewNote || !row.nextAction || row.nextAction === 'OPERATOR_REVIEW_PENDING') {
        failures.push('REJECTED_REQUIRES_RETRACE_NEXT_ACTION');
      }
    }

    validations.push({
      rowId: row.reviewId || row.sectionId,
      sectionId: row.sectionId,
      block: row.block,
      name: row.name,
      reviewZone: row.reviewZone,
      operatorDecision,
      validationStatus: failures.length > 0 ? 'INVALID' : operatorDecision === 'PENDING' ? 'REVIEW_PENDING' : 'PASS',
      failures: failures.join('|'),
      geometryPointCount: geometry.pointCount,
      geometryArea: geometry.area,
      nextAction: failures.length > 0
        ? 'Fix this operator input row before P52 preview.'
        : operatorDecision === 'APPROVED'
          ? 'Row is ready for P52 source patch preview.'
          : operatorDecision === 'REJECTED'
            ? 'Create retrace workset for this row.'
            : 'Complete operator review before P52 preview.',
    });
  }

  for (const seedId of seedIds) {
    if (!sectionIds.has(seedId)) {
      validations.push({
        rowId: seedId,
        sectionId: seedId,
        block: '',
        name: '',
        reviewZone: '',
        operatorDecision: '',
        validationStatus: 'INVALID',
        failures: 'MISSING_P51_SEED_ROW_IN_CURRENT_INPUT',
        geometryPointCount: 0,
        geometryArea: 0,
        nextAction: 'Restore the missing operator input row.',
      });
    }
  }

  return validations;
}

function buildApprovedPreviewRows(rows, validations) {
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
        ? 'PENDING_ROWS_BLOCK_SOURCE_WRITE'
        : 'INVALID_OPERATOR_INPUT_BLOCKED',
      nextAction: row.nextAction,
    }));
}

function buildPolicyRows(summary) {
  return [
    {
      rowId: 'P56_REAL_INPUT_INTAKE',
      validationType: 'INTAKE_CONTRACT',
      validationStatus: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.reviewRows === 131 && summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `ROWS_${summary.reviewRows}_SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'Use P56 only as real operator input intake.',
    },
    {
      rowId: 'P55_HANDOFF_HASH_BASELINE',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p55BaselineSha256 ? 'PASS' : 'INVALID',
      failures: summary.p55BaselineSha256 ? '' : 'P55_HANDOFF_HASH_MISSING',
      nextAction: 'Keep the P55 handoff hash as the comparison baseline.',
    },
    {
      rowId: 'P51_INPUT_CHANGED',
      validationType: 'INPUT_DIFF',
      validationStatus: summary.operatorInputChanged ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.operatorInputChanged ? '' : 'NO_OPERATOR_INPUT',
      nextAction: summary.operatorInputChanged ? 'Continue validating edited P51 input.' : 'Wait for operator edits in the P51 CSV.',
    },
    {
      rowId: 'OPERATOR_WRITABLE_ONLY',
      validationType: 'COLUMN_POLICY',
      validationStatus: summary.immutableColumnChangeCount === 0 ? 'PASS' : 'INVALID',
      failures: summary.immutableColumnChangeCount === 0 ? '' : `IMMUTABLE_CHANGES:${summary.immutableColumnChangeCount}`,
      nextAction: 'Only operator writable columns may change.',
    },
    {
      rowId: 'IMMUTABLE_COLUMNS_UNCHANGED',
      validationType: 'IMMUTABILITY_POLICY',
      validationStatus: summary.immutableColumnChangeCount === 0 ? 'PASS' : 'INVALID',
      failures: summary.immutableColumnChangeCount === 0 ? '' : `IMMUTABLE_CHANGES:${summary.immutableColumnChangeCount}`,
      nextAction: 'Restore immutable evidence columns before P52.',
    },
    {
      rowId: 'APPROVED_REQUIRES_CORRECTED_PATH_LABEL_REVIEWER_REVIEWED_AT',
      validationType: 'APPROVAL_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Approved rows require corrected geometry and review metadata.',
    },
    {
      rowId: 'APPROVED_GEOMETRY_WITHIN_4096_VIEWBOX',
      validationType: 'GEOMETRY_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Keep approved correctedPath and labelPoint inside 4096x4096.',
    },
    {
      rowId: 'APPROVED_GEOMETRY_SELF_INTERSECTION_0',
      validationType: 'GEOMETRY_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Fix any approved self-intersecting polygon before P52.',
    },
    {
      rowId: 'APPROVED_LABEL_POINT_TOP_HIT',
      validationType: 'GEOMETRY_POLICY',
      validationStatus: summary.invalidRows === 0 ? 'PASS' : 'INVALID',
      failures: summary.invalidRows === 0 ? '' : `INVALID_ROWS:${summary.invalidRows}`,
      nextAction: 'Correct labels so each approved label hits its polygon.',
    },
    {
      rowId: 'P52_PREVIEW_READY_REQUIRES_APPROVED_ROWS',
      validationType: 'PREVIEW_POLICY',
      validationStatus: summary.p52PreviewReady ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.p52PreviewReady ? '' : `APPROVED_${summary.approvedRows}_INVALID_${summary.invalidRows}`,
      nextAction: summary.p52PreviewReady ? 'Run P52 source patch preview.' : 'P52 preview remains blocked until valid approved rows exist.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'P56 must not write src/data/daeguSeatData.ts.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P56 only intakes 4096 operator reference rows; release remains forbidden.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu intake.',
    },
  ];
}

function summarize({ p51, p55, currentHash, rows, rowDiffs, validations, immutableChanges, approvedPreviewRows }) {
  const approvedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const rejectedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'REJECTED');
  const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const p55BaselineSha256 = p55.summary?.p51InputSha256 ?? '';
  const operatorInputChanged = currentHash !== p55BaselineSha256;
  const changedRows = rowDiffs.filter((row) => row.rowDiffStatus !== 'UNCHANGED');
  const p52PreviewReady = operatorInputChanged
    && approvedRows.length > 0
    && invalidRows.length === 0
    && approvedPreviewRows.length === approvedRows.length;

  let status = 'p56-no-operator-input';
  if (invalidRows.length > 0) {
    status = 'p56-invalid-operator-input-blocked';
  } else if (p52PreviewReady) {
    status = 'p56-approved-ready-for-preview';
  } else if (operatorInputChanged) {
    status = 'p56-input-edited-pending-approval';
  }

  return {
    status,
    p51Status: p51.status ?? p51.summary?.status ?? '',
    p55Status: p55.status ?? p55.summary?.status ?? '',
    p55BaselineSha256,
    currentP51Sha256: currentHash,
    operatorInputChanged,
    changeStatus: operatorInputChanged ? 'INPUT_EDITED_PENDING_APPROVAL' : 'NO_OPERATOR_INPUT',
    reviewRows: rows.length,
    expectedReviewRows: 131,
    changedRows: changedRows.length,
    changedWritableRows: rowDiffs.filter((row) => row.changedWritableCount > 0).length,
    changedImmutableRows: rowDiffs.filter((row) => row.changedImmutableCount > 0).length,
    immutableColumnChangeCount: immutableChanges.length,
    currentSelectableSeats,
    officialDatasetBlocks,
    approvedRows: approvedRows.length,
    approvedPreviewReadyRows: approvedPreviewRows.length,
    rejectedRows: rejectedRows.length,
    pendingRows: pendingRows.length,
    invalidRows: invalidRows.length,
    p52PreviewReady,
    p52SourcePatchPreviewAllowed: p52PreviewReady,
    sourceApplyAllowed: false,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

async function buildIntakePayload() {
  const [p51, p55, rows, seedRows, currentHash] = await Promise.all([
    readJson(p51JsonPath),
    readJson(p55HandoffJsonPath),
    readCsv(p51InputCsvPath),
    readCsv(p51SeedCsvPath),
    hashFile(p51InputCsvPath),
  ]);
  const immutableChanges = findImmutableChanges(rows, seedRows);
  const rowDiffs = buildRowDiffs(rows, seedRows);
  const rowValidations = validateRows(rows, seedRows, immutableChanges);
  const approvedPreviewRows = buildApprovedPreviewRows(rows, rowValidations);
  const summary = summarize({
    p51,
    p55,
    currentHash,
    rows,
    rowDiffs,
    validations: rowValidations,
    immutableChanges,
    approvedPreviewRows,
  });
  const policyRows = buildPolicyRows(summary);
  const allValidations = [...policyRows, ...rowValidations];
  const blockedRows = buildBlockedRows(rowValidations);

  return {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p51Json: toFrontendRelative(p51JsonPath),
      p51InputCsv: toFrontendRelative(p51InputCsvPath),
      p51SeedCsv: toFrontendRelative(p51SeedCsvPath),
      p55HandoffJson: toFrontendRelative(p55HandoffJsonPath),
    },
    policy: {
      viewBox: `0 0 ${viewBoxSize} ${viewBoxSize}`,
      writableColumns,
      immutableColumns,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      passRelease177Allowed: false,
      note: 'P56_REAL_INPUT_INTAKE. P55_HANDOFF_HASH_BASELINE. OPERATOR_WRITABLE_ONLY. APPROVED_READY_FOR_PREVIEW. SOURCE_WRITE_FORBIDDEN.',
    },
    summary,
    rowDiffs,
    immutableChanges,
    approvedPreviewRows,
    blockedRows,
    validations: allValidations,
    outputs: {
      intakeJson: toFrontendRelative(intakeJsonPath),
      intakeMd: toFrontendRelative(intakeMdPath),
      rowDiffCsv: toFrontendRelative(rowDiffCsvPath),
      approvedRowsCsv: toFrontendRelative(approvedRowsCsvPath),
      blockedRowsCsv: toFrontendRelative(blockedRowsCsvPath),
      validationCsv: toFrontendRelative(validationCsvPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };
}

async function writeIntake() {
  const payload = await buildIntakePayload();
  const { summary } = payload;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(intakeJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(rowDiffCsvPath, buildCsv(payload.rowDiffs, [
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewZone',
    'operatorDecision',
    'changedWritableColumns',
    'changedImmutableColumns',
    'changedWritableCount',
    'changedImmutableCount',
    'rowDiffStatus',
  ]));
  await fs.writeFile(approvedRowsCsvPath, buildCsv(payload.approvedPreviewRows, [
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
  await fs.writeFile(intakeMdPath, [
    '# 대구 operator reference P56 real input intake',
    '',
    `- status: \`${summary.status}\``,
    `- P51 input: \`${toFrontendRelative(p51InputCsvPath)}\``,
    `- P55 baseline sha256: \`${summary.p55BaselineSha256}\``,
    `- current P51 sha256: \`${summary.currentP51Sha256}\``,
    `- operator input changed: \`${summary.operatorInputChanged}\``,
    `- changed rows: \`${summary.changedRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- approved preview-ready rows: \`${summary.approvedPreviewReadyRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- P52 preview ready: \`${summary.p52PreviewReady}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
    '## Rule',
    '',
    '- `NO_OPERATOR_INPUT`: current P51 hash matches the P55 handoff baseline.',
    '- `APPROVED_READY_FOR_PREVIEW`: at least one valid approved row exists and immutable columns are unchanged.',
    '- `INVALID_OPERATOR_INPUT_BLOCKED`: invalid geometry, immutable column edits, missing approval metadata, or row mismatches block P52.',
    '- P56 never writes `src/data/daeguSeatData.ts`.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} changed=${summary.operatorInputChanged} rows=${summary.reviewRows} approved=${summary.approvedRows} approvedPreviewReady=${summary.approvedPreviewReadyRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} p52PreviewReady=${summary.p52PreviewReady} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  const intake = await writeIntake();
  const invalidRows = (intake.validations ?? []).filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = (intake.validations ?? []).filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const readyFailures = requireReady && !intake.summary?.p52PreviewReady
    ? [{
        rowId: 'P56_REQUIRE_READY',
        validationType: 'REQUIRE_READY_POLICY',
        validationStatus: 'INVALID',
        failures: `P52_PREVIEW_READY_FALSE_STATUS_${intake.summary?.status}`,
        nextAction: 'Provide at least one valid approved operator row before require-ready.',
      }]
    : [];
  const gateValidations = [...(intake.validations ?? []), ...readyFailures];
  const gateInvalidRows = [...invalidRows, ...readyFailures];
  const summary = {
    status: gateInvalidRows.length === 0 ? 'p56-real-input-intake-gate-passed' : 'p56-real-input-intake-gate-blocked',
    intakeStatus: intake.summary?.status ?? '',
    totalValidations: gateValidations.length,
    invalidRows: gateInvalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    operatorInputChanged: intake.summary?.operatorInputChanged === true,
    p55BaselineSha256: intake.summary?.p55BaselineSha256 ?? '',
    currentP51Sha256: intake.summary?.currentP51Sha256 ?? '',
    reviewRows: intake.summary?.reviewRows ?? 0,
    changedRows: intake.summary?.changedRows ?? 0,
    approvedRows: intake.summary?.approvedRows ?? 0,
    approvedPreviewReadyRows: intake.summary?.approvedPreviewReadyRows ?? 0,
    rejectedRows: intake.summary?.rejectedRows ?? 0,
    pendingRows: intake.summary?.pendingRows ?? 0,
    p52PreviewReady: intake.summary?.p52PreviewReady === true,
    p52SourcePatchPreviewAllowed: intake.summary?.p52SourcePatchPreviewAllowed === true,
    sourceApplyAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: intake.summary?.buildBlockerTrackedSeparately,
  };

  if (requireReady && gateInvalidRows.length > 0) {
    throw new Error(`P56 real input intake gate failed: ${gateInvalidRows.map((row) => row.rowId).join(',')}`);
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
    '# 대구 operator reference P56 real input intake gate',
    '',
    `- status: \`${summary.status}\``,
    `- intake status: \`${summary.intakeStatus}\``,
    `- operator input changed: \`${summary.operatorInputChanged}\``,
    `- changed rows: \`${summary.changedRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- approved preview-ready rows: \`${summary.approvedPreviewReadyRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- P52 preview ready: \`${summary.p52PreviewReady}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} intakeStatus=${summary.intakeStatus} changed=${summary.operatorInputChanged} approved=${summary.approvedRows} approvedPreviewReady=${summary.approvedPreviewReadyRows} pending=${summary.pendingRows} invalidRows=${summary.invalidRows} p52PreviewReady=${summary.p52PreviewReady} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'intake') {
  await writeIntake();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
