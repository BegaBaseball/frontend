import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import {
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultInputPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template.json');
const defaultValidationPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template-validation.json');
const defaultApplyPlanPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template-apply-plan.json');
const defaultStatusPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-status.json');
const defaultWriteGuardPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-write-guard.json');
const defaultTraceReviewPath = path.join(defaultReportDir, 'gwangju-seatmap-trace-review.json');
const productionDataFilePath = path.resolve(frontendRoot, 'src/data/gwangjuSeatData.ts');

const APPLY_VERSION = 'GWANGJU_OPERATOR_APPLY_V1';
const REQUIRED_VALIDATION_VERSION = 'GWANGJU_OPERATOR_POLYGON_TEMPLATE_VALIDATION_V1';
const REQUIRED_APPLY_PLAN_VERSION = 'GWANGJU_OPERATOR_POLYGON_APPLY_PLAN_V1';
const REQUIRED_STATUS_VERSION = 'GWANGJU_OPERATOR_STATUS_V1';
const REQUIRED_WRITE_GUARD_VERSION = 'GWANGJU_OPERATOR_WRITE_GUARD_V1';
const APPLY_SECTION_IDS = ['home-k7-seats', 'away-cheering-seats'];
const VALID_LEVELS = new Set(['1F', '2F', '3F', '4F', '5F', 'OUTFIELD']);
const VALID_SIDES = new Set(['FIRST_BASE', 'THIRD_BASE', 'CENTER', 'OUTFIELD']);
const VALID_FAN_ROLES = new Set(['HOME', 'AWAY', 'NEUTRAL']);

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const hasFlag = (name) => process.argv.includes(name);

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const writeCsv = async (filePath, rows) => {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const readJsonReport = async (filePath) => {
  try {
    return {
      exists: true,
      relativePath: path.relative(frontendRoot, filePath),
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: '',
    };
  } catch (error) {
    return {
      exists: false,
      relativePath: path.relative(frontendRoot, filePath),
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const sha256 = (content) => crypto
  .createHash('sha256')
  .update(content)
  .digest('hex');

const sha256File = async (filePath) => sha256(await fs.readFile(filePath));

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatNumber = (value) => (
  Number.isInteger(value) ? String(value) : Number(value).toFixed(1).replace(/\.0$/, '')
);

const singleQuoted = (value) => `'${String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const stringArrayLiteral = (values) => `[${values.map(singleQuoted).join(', ')}]`;

const formatPoints = (points) => `[${points
  .map((point) => `[${formatNumber(point[0])}, ${formatNumber(point[1])}]`)
  .join(', ')}]`;

const normalizeOperatorInput = (operatorInput = {}) => ({
  officialBlocks: Array.isArray(operatorInput.officialBlocks)
    ? operatorInput.officialBlocks.map((value) => String(value).trim()).filter(Boolean)
    : [],
  level: String(operatorInput.level ?? '').trim(),
  side: String(operatorInput.side ?? '').trim(),
  fanRole: String(operatorInput.fanRole ?? '').trim(),
  points: Array.isArray(operatorInput.points)
    ? operatorInput.points.map((point) => (
      Array.isArray(point) && point.length === 2
        ? [numberOrNull(point[0]), numberOrNull(point[1])]
        : [null, null]
    ))
    : [],
  labelX: numberOrNull(operatorInput.labelX),
  labelY: numberOrNull(operatorInput.labelY),
  shortLabel: String(operatorInput.shortLabel ?? '').trim(),
  reviewer: String(operatorInput.reviewer ?? '').trim(),
  reviewedAt: String(operatorInput.reviewedAt ?? '').trim(),
});

const buildSeatViewSections = (name, shortLabel, officialBlocks) => Array.from(new Set([
  name,
  shortLabel,
  ...officialBlocks,
  ...officialBlocks.map((block) => `${block}블록`),
  `광주 ${name}`,
  `KIA ${name}`,
].filter(Boolean)));

const buildGeometrySnippet = (section, input) => (
  `  '${section.id}': blockGeometry(${formatPoints(input.points)}, ${formatNumber(input.labelX)}, ${formatNumber(input.labelY)}, ${singleQuoted(input.shortLabel)}),`
);

const buildBlockDefinitionSnippet = (section, input) => (
  `  { id: ${singleQuoted(section.id)}, level: ${singleQuoted(input.level)}, category: ${singleQuoted(section.category)}, name: ${singleQuoted(section.name)}, block: ${singleQuoted(section.name)}, officialBlocks: ${stringArrayLiteral(input.officialBlocks)}, side: ${singleQuoted(input.side)}, fanRole: ${singleQuoted(input.fanRole)}, seatViewSections: ${stringArrayLiteral(buildSeatViewSections(section.name, input.shortLabel, input.officialBlocks))} },`
);

const propertyNameText = (name) => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
};

const findProperty = (object, name) => object.properties.find((property) => (
  ts.isPropertyAssignment(property)
  && propertyNameText(property.name) === name
));

const stringInitializerValue = (property, sourceFile) => {
  if (!property || !ts.isPropertyAssignment(property)) return null;
  const initializer = property.initializer;
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) return initializer.text;
  return initializer.getText(sourceFile);
};

const findVariableInitializer = (sourceFile, variableName, predicate) => {
  let initializer = null;
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node)
      && node.name.getText(sourceFile) === variableName
      && node.initializer
      && predicate(node.initializer)
    ) {
      initializer = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return initializer;
};

const objectPropertyByKey = (object, key) => object.properties.find((property) => (
  ts.isPropertyAssignment(property)
  && propertyNameText(property.name) === key
));

const arrayObjectById = (array, id, sourceFile) => array.elements.find((element) => {
  if (!ts.isObjectLiteralExpression(element)) return false;
  return stringInitializerValue(findProperty(element, 'id'), sourceFile) === id;
});

const lineStartAt = (source, position) => source.lastIndexOf('\n', Math.max(position - 1, 0)) + 1;

const lineRangeForNode = (node, sourceFile, source) => {
  const start = lineStartAt(source, node.getStart(sourceFile));
  let end = node.getEnd();
  while (source[end] === ' ' || source[end] === '\t' || source[end] === '\r') end += 1;
  if (source[end] === ',') end += 1;
  if (source[end] === '\n') end += 1;
  return { start, end };
};

const closingLineStart = (node, source) => lineStartAt(source, node.getEnd() - 1);

const applyEdits = (source, edits) => {
  const ordered = [...edits].sort((left, right) => right.start - left.start || right.end - left.end);
  return ordered.reduce((updated, edit) => (
    `${updated.slice(0, edit.start)}${edit.text}${updated.slice(edit.end)}`
  ), source);
};

const addOrReplaceStatusReady = (requirementObject, edits, sourceFile, source) => {
  const statusProperty = findProperty(requirementObject, 'status');
  if (statusProperty && ts.isPropertyAssignment(statusProperty)) {
    edits.push({
      start: statusProperty.initializer.getStart(sourceFile),
      end: statusProperty.initializer.getEnd(),
      text: "'READY'",
    });
    return 'replace';
  }

  const insertAt = closingLineStart(requirementObject, source);
  edits.push({
    start: insertAt,
    end: insertAt,
    text: "    status: 'READY',\n",
  });
  return 'add';
};

const analyzeAndBuildDataFileEdits = (source, dataFilePath, rowsToApply, blockers) => {
  const sourceFile = ts.createSourceFile(dataFilePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const geometryDrafts = findVariableInitializer(sourceFile, 'GWANGJU_IMAGE_GEOMETRY_DRAFTS', ts.isObjectLiteralExpression);
  const specialBlocks = findVariableInitializer(sourceFile, 'SPECIAL_BLOCKS', ts.isArrayLiteralExpression);
  const requirements = findVariableInitializer(sourceFile, 'GWANGJU_OPERATOR_SECTION_REQUIREMENTS', ts.isArrayLiteralExpression);
  const edits = [];
  const geometryInsertions = [];
  const blockInsertions = [];

  if (!geometryDrafts) blockers.push('GWANGJU_IMAGE_GEOMETRY_DRAFTS_NOT_FOUND');
  if (!specialBlocks) blockers.push('SPECIAL_BLOCKS_NOT_FOUND');
  if (!requirements) blockers.push('GWANGJU_OPERATOR_SECTION_REQUIREMENTS_NOT_FOUND');
  if (blockers.length > 0) return { nextSource: source, editCount: 0 };

  rowsToApply.forEach((row) => {
    const geometrySnippet = buildGeometrySnippet(row.requirement, row.operatorInput);
    const blockSnippet = buildBlockDefinitionSnippet(row.requirement, row.operatorInput);
    const existingGeometry = objectPropertyByKey(geometryDrafts, row.id);
    const existingBlock = arrayObjectById(specialBlocks, row.id, sourceFile);
    const requirementObject = arrayObjectById(requirements, row.id, sourceFile);

    row.geometryAction = existingGeometry ? 'replace' : 'add';
    row.blockAction = existingBlock ? 'replace' : 'add';
    row.requirementStatusAction = requirementObject ? 'replace' : 'missing';

    if (existingGeometry) {
      const range = lineRangeForNode(existingGeometry, sourceFile, source);
      edits.push({ ...range, text: `${geometrySnippet}\n` });
    } else {
      geometryInsertions.push(geometrySnippet);
    }

    if (existingBlock) {
      const range = lineRangeForNode(existingBlock, sourceFile, source);
      edits.push({ ...range, text: `${blockSnippet}\n` });
    } else {
      blockInsertions.push(blockSnippet);
    }

    if (!requirementObject) {
      blockers.push(`OPERATOR_REQUIREMENT_NOT_FOUND_IN_DATA_FILE:${row.id}`);
      return;
    }
    addOrReplaceStatusReady(requirementObject, edits, sourceFile, source);
  });

  if (geometryInsertions.length > 0) {
    const insertAt = closingLineStart(geometryDrafts, source);
    edits.push({
      start: insertAt,
      end: insertAt,
      text: `${geometryInsertions.join('\n')}\n`,
    });
  }

  if (blockInsertions.length > 0) {
    const insertAt = closingLineStart(specialBlocks, source);
    edits.push({
      start: insertAt,
      end: insertAt,
      text: `${blockInsertions.join('\n')}\n`,
    });
  }

  if (blockers.length > 0) return { nextSource: source, editCount: edits.length };
  return {
    nextSource: applyEdits(source, edits),
    editCount: edits.length,
  };
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
const validationPath = path.resolve(frontendRoot, argValue('--validation', defaultValidationPath));
const applyPlanPath = path.resolve(frontendRoot, argValue('--apply-plan', defaultApplyPlanPath));
const statusPath = path.resolve(frontendRoot, argValue('--status', defaultStatusPath));
const writeGuardPath = path.resolve(frontendRoot, argValue('--write-guard', defaultWriteGuardPath));
const traceReviewPath = path.resolve(frontendRoot, argValue('--trace-review', defaultTraceReviewPath));
const dataFilePath = path.resolve(frontendRoot, argValue('--data-file', productionDataFilePath));
const shouldWrite = hasFlag('--write');
const requireReady = hasFlag('--require-ready');
const allowSyntheticSmoke = hasFlag('--allow-synthetic-smoke');

const reports = {
  template: await readJsonReport(inputPath),
  validation: await readJsonReport(validationPath),
  applyPlan: await readJsonReport(applyPlanPath),
  status: await readJsonReport(statusPath),
  writeGuard: await readJsonReport(writeGuardPath),
  traceReview: await readJsonReport(traceReviewPath),
};

const inputSha256 = reports.template.exists ? await sha256File(inputPath) : '';
const dataFileShaBefore = await sha256File(dataFilePath);
const template = reports.template.data ?? {};
const validation = reports.validation.data ?? {};
const applyPlan = reports.applyPlan.data ?? {};
const statusReport = reports.status.data ?? {};
const writeGuard = reports.writeGuard.data ?? {};
const traceReview = reports.traceReview.data ?? {};
const inputIsNonProductionSynthetic = template.nonProductionSyntheticInput === true;
const dataFileIsProduction = dataFilePath === productionDataFilePath;
const inputIsStandardProduction = inputPath === defaultInputPath
  && validationPath === defaultValidationPath
  && applyPlanPath === defaultApplyPlanPath
  && statusPath === defaultStatusPath
  && writeGuardPath === defaultWriteGuardPath
  && traceReviewPath === defaultTraceReviewPath;
const inputIsTemporarySyntheticWrite = shouldWrite
  && allowSyntheticSmoke
  && inputIsNonProductionSynthetic
  && !dataFileIsProduction;

const requirementById = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS
  .filter((section) => APPLY_SECTION_IDS.includes(section.id))
  .map((section) => [section.id, section]));
const templateSectionById = new Map((template.sections ?? []).map((section) => [String(section.id ?? '').trim(), section]));
const validationRowById = new Map((validation.sections ?? []).map((row) => [row.id, row]));
const applyPlanRowById = new Map((applyPlan.rows ?? []).map((row) => [row.id, row]));

const blockers = [];
if (!reports.template.exists) blockers.push(`TEMPLATE_REPORT_UNREADABLE:${reports.template.error}`);
if (!reports.validation.exists) blockers.push(`VALIDATION_REPORT_UNREADABLE:${reports.validation.error}`);
if (!reports.applyPlan.exists) blockers.push(`APPLY_PLAN_REPORT_UNREADABLE:${reports.applyPlan.error}`);
if (!reports.status.exists && (shouldWrite || requireReady)) blockers.push(`STATUS_REPORT_UNREADABLE:${reports.status.error}`);
if (!reports.traceReview.exists && shouldWrite) blockers.push(`TRACE_REVIEW_REPORT_UNREADABLE:${reports.traceReview.error}`);
if (!reports.writeGuard.exists && shouldWrite && dataFileIsProduction) {
  blockers.push(`WRITE_GUARD_REPORT_UNREADABLE:${reports.writeGuard.error}`);
}
if (validation.summary?.validationVersion !== REQUIRED_VALIDATION_VERSION) blockers.push('VALIDATION_VERSION_MISMATCH');
if (applyPlan.summary?.applyPlanVersion !== REQUIRED_APPLY_PLAN_VERSION) blockers.push('APPLY_PLAN_VERSION_MISMATCH');
if (reports.status.exists && statusReport.summary?.statusVersion !== REQUIRED_STATUS_VERSION) blockers.push('STATUS_VERSION_MISMATCH');
if (reports.writeGuard.exists && writeGuard.summary?.guardVersion !== REQUIRED_WRITE_GUARD_VERSION) {
  blockers.push('WRITE_GUARD_VERSION_MISMATCH');
}
if (validation.summary?.inputSha256 !== inputSha256) blockers.push('VALIDATION_INPUT_SHA256_MISMATCH');
if (applyPlan.summary?.inputSha256 !== inputSha256) blockers.push('APPLY_PLAN_INPUT_SHA256_MISMATCH');
if ((shouldWrite || requireReady) && validation.summary?.strict !== true) blockers.push('STRICT_VALIDATION_NOT_CONFIRMED');
if ((shouldWrite || requireReady) && validation.summary?.status !== 'ready') {
  blockers.push(`VALIDATION_STATUS_NOT_READY:${validation.summary?.status ?? ''}`);
}
if ((shouldWrite || requireReady) && applyPlan.summary?.status !== 'ready') {
  blockers.push(`APPLY_PLAN_STATUS_NOT_READY:${applyPlan.summary?.status ?? ''}`);
}
if ((shouldWrite || requireReady) && reports.status.exists && statusReport.summary?.status !== 'ready') {
  blockers.push(`STATUS_NOT_READY:${statusReport.summary?.status ?? ''}`);
}
if (shouldWrite && dataFileIsProduction && writeGuard.summary?.passed !== true) {
  blockers.push(`WRITE_GUARD_NOT_PASSED:${writeGuard.summary?.status ?? ''}`);
}
if (shouldWrite && dataFileIsProduction && !requireReady) blockers.push('PRODUCTION_WRITE_REQUIRES_REQUIRE_READY');
if (shouldWrite && dataFileIsProduction && !inputIsStandardProduction) {
  blockers.push('PRODUCTION_WRITE_REQUIRES_STANDARD_REPORTS');
}
if (shouldWrite && dataFileIsProduction && inputIsNonProductionSynthetic) {
  blockers.push('SYNTHETIC_INPUT_MUST_NOT_WRITE_PRODUCTION_DATA');
}
if (shouldWrite && !dataFileIsProduction && !inputIsTemporarySyntheticWrite) {
  blockers.push('NON_PRODUCTION_WRITE_REQUIRES_ALLOW_SYNTHETIC_SMOKE');
}
if (allowSyntheticSmoke && dataFileIsProduction) blockers.push('ALLOW_SYNTHETIC_SMOKE_REQUIRES_NON_PRODUCTION_DATA_FILE');

const rows = APPLY_SECTION_IDS.map((id) => {
  const requirement = requirementById.get(id);
  const templateSection = templateSectionById.get(id);
  const validationRow = validationRowById.get(id);
  const applyPlanRow = applyPlanRowById.get(id);
  const operatorInput = normalizeOperatorInput(templateSection?.operatorInput);
  const rowBlockers = [];

  if (!requirement) rowBlockers.push('UNKNOWN_OPERATOR_REQUIREMENT');
  if (!templateSection) rowBlockers.push('TEMPLATE_SECTION_NOT_FOUND');
  if (!validationRow) rowBlockers.push('VALIDATION_ROW_NOT_FOUND');
  if (!applyPlanRow) rowBlockers.push('APPLY_PLAN_ROW_NOT_FOUND');
  if (validationRow?.pending === true) rowBlockers.push('OPERATOR_INPUT_PENDING');
  if (validationRow?.validForPromotion !== true) rowBlockers.push('SECTION_NOT_VALID_FOR_PROMOTION');
  if (applyPlanRow?.validForDataDiff !== true) rowBlockers.push('SECTION_NOT_VALID_FOR_DATA_DIFF');
  if (operatorInput.officialBlocks.length === 0) rowBlockers.push('OFFICIAL_BLOCKS_REQUIRED');
  if (!VALID_LEVELS.has(operatorInput.level)) rowBlockers.push('LEVEL_REQUIRED_OR_INVALID');
  if (!VALID_SIDES.has(operatorInput.side)) rowBlockers.push('SIDE_REQUIRED_OR_INVALID');
  if (!VALID_FAN_ROLES.has(operatorInput.fanRole)) rowBlockers.push('FAN_ROLE_REQUIRED_OR_INVALID');
  if (operatorInput.points.length < 3 || operatorInput.points.some(([x, y]) => x === null || y === null)) {
    rowBlockers.push('POINTS_MUST_BE_VALID_POLYGON');
  }
  if (operatorInput.labelX === null || operatorInput.labelY === null) rowBlockers.push('LABEL_COORDINATES_REQUIRED');
  if (!operatorInput.shortLabel) rowBlockers.push('SHORT_LABEL_REQUIRED');
  if (!operatorInput.reviewer) rowBlockers.push('REVIEWER_REQUIRED');
  if (!operatorInput.reviewedAt) rowBlockers.push('REVIEWED_AT_REQUIRED');

  const validForApply = rowBlockers.length === 0;
  return {
    id,
    name: requirement?.name ?? templateSection?.name ?? id,
    category: requirement?.category ?? templateSection?.category ?? '',
    validForApply,
    rowBlockers,
    reviewer: operatorInput.reviewer,
    reviewedAt: operatorInput.reviewedAt,
    officialBlocks: operatorInput.officialBlocks,
    level: operatorInput.level,
    side: operatorInput.side,
    fanRole: operatorInput.fanRole,
    shortLabel: operatorInput.shortLabel,
    pointCount: operatorInput.points.length,
    labelX: operatorInput.labelX,
    labelY: operatorInput.labelY,
    geometryAction: 'none',
    blockAction: 'none',
    requirementStatusAction: 'none',
    requirement,
    operatorInput,
  };
});

for (let firstIndex = 0; firstIndex < rows.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < rows.length; secondIndex += 1) {
    const firstRow = rows[firstIndex];
    const secondRow = rows[secondIndex];
    const sharedOfficialBlocks = firstRow.officialBlocks
      .filter((officialBlock) => secondRow.officialBlocks.includes(officialBlock));

    if (sharedOfficialBlocks.length > 0) {
      firstRow.rowBlockers.push(`OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP:${secondRow.id}:${sharedOfficialBlocks.join(' ')}`);
      secondRow.rowBlockers.push(`OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP:${firstRow.id}:${sharedOfficialBlocks.join(' ')}`);
      firstRow.validForApply = false;
      secondRow.validForApply = false;
    }
  }
}

if ((shouldWrite || requireReady) && rows.some((row) => !row.validForApply)) {
  rows
    .filter((row) => !row.validForApply)
    .forEach((row) => blockers.push(`ROW_NOT_VALID_FOR_APPLY:${row.id}:${row.rowBlockers.join(' ')}`));
}

const rowsToApply = rows.filter((row) => row.validForApply);
if ((shouldWrite || requireReady) && rowsToApply.length !== APPLY_SECTION_IDS.length) {
  blockers.push(`READY_APPLY_SECTION_COUNT_MISMATCH:${rowsToApply.length}`);
}

let plannedEditCount = 0;
let dataFileChanged = false;
let dataFileShaAfter = dataFileShaBefore;

if (blockers.length === 0 && rowsToApply.length > 0) {
  const source = await fs.readFile(dataFilePath, 'utf8');
  const { nextSource, editCount } = analyzeAndBuildDataFileEdits(source, dataFilePath, rowsToApply, blockers);
  plannedEditCount = editCount;

  if (blockers.length === 0 && shouldWrite) {
    dataFileChanged = nextSource !== source;
    if (dataFileChanged) {
      await fs.writeFile(dataFilePath, nextSource, 'utf8');
    }
  }
  dataFileShaAfter = await sha256File(dataFilePath);
}

const validApplySections = rowsToApply.length;
const status = blockers.length > 0 ? 'blocked' : validApplySections > 0 ? 'ok' : 'pending';
const summary = {
  applyVersion: APPLY_VERSION,
  mode: shouldWrite ? 'write' : 'dry-run',
  status,
  requireReady,
  allowSyntheticSmoke,
  input: path.relative(frontendRoot, inputPath),
  inputSha256,
  validation: path.relative(frontendRoot, validationPath),
  applyPlan: path.relative(frontendRoot, applyPlanPath),
  statusReport: path.relative(frontendRoot, statusPath),
  writeGuard: path.relative(frontendRoot, writeGuardPath),
  traceReview: path.relative(frontendRoot, traceReviewPath),
  dataFile: path.relative(frontendRoot, dataFilePath),
  dataFileIsProduction,
  inputIsStandardProduction,
  inputIsNonProductionSynthetic,
  inputIsTemporarySyntheticWrite,
  validationStatus: validation.summary?.status ?? '',
  validationStrict: validation.summary?.strict === true,
  applyPlanStatus: applyPlan.summary?.status ?? '',
  operatorStatus: statusReport.summary?.status ?? '',
  writeGuardPassed: writeGuard.summary?.passed === true,
  traceReviewTotalBlocks: traceReview.summary?.totalBlocks ?? null,
  validApplySections,
  plannedEditCount,
  dataFileChanged,
  dataFileShaBefore,
  dataFileShaAfter,
  blockers,
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  allowedCoordinateSource: 'operator-provided official PNG coordinates only',
  writeCommand: 'npm run stadium:gwangju:operator-apply:write',
  requiredPostApplyGate: [
    'npm run stadium:gwangju:operator-postwrite-gate',
  ],
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This script is dry-run by default and writes only when --write is provided.',
    'Production write requires --require-ready, standard production reports, and a passed write guard.',
    'Synthetic smoke input may write only to a non-production --data-file with --allow-synthetic-smoke.',
    'Missing baseball data must remain MANUAL_BASEBALL_DATA_REQUIRED instead of being inferred.',
  ],
  sourcePolicy: {
    allowedCoordinateSource: 'operator-provided official PNG coordinates only',
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
  },
  inputs: Object.fromEntries(Object.entries(reports).map(([key, report]) => [
    key,
    {
      path: report.relativePath,
      exists: report.exists,
      error: report.error,
    },
  ])),
  rows: rows.map(({ requirement: _requirement, operatorInput: _operatorInput, ...row }) => row),
};

const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-apply.json');
const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-apply.csv');
const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-apply.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'name',
    'category',
    'validForApply',
    'rowBlockers',
    'geometryAction',
    'blockAction',
    'requirementStatusAction',
    'officialBlocks',
    'level',
    'side',
    'fanRole',
    'shortLabel',
    'pointCount',
    'labelX',
    'labelY',
    'reviewer',
    'reviewedAt',
  ],
  ...report.rows.map((row) => [
    row.id,
    row.name,
    row.category,
    row.validForApply,
    row.rowBlockers,
    row.geometryAction,
    row.blockAction,
    row.requirementStatusAction,
    row.officialBlocks,
    row.level,
    row.side,
    row.fanRole,
    row.shortLabel,
    row.pointCount,
    row.labelX,
    row.labelY,
    row.reviewer,
    row.reviewedAt,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# 광주 K7/원정응원석 operator apply',
  '',
  `- apply version: \`${APPLY_VERSION}\``,
  `- mode: \`${summary.mode}\``,
  `- status: \`${summary.status}\``,
  `- require ready: \`${summary.requireReady}\``,
  `- input: \`${summary.input}\``,
  `- validation: \`${summary.validation}\``,
  `- apply plan: \`${summary.applyPlan}\``,
  `- status report: \`${summary.statusReport}\``,
  `- write guard: \`${summary.writeGuard}\``,
  `- data file: \`${summary.dataFile}\``,
  `- data file is production: ${summary.dataFileIsProduction}`,
  `- synthetic smoke write: ${summary.inputIsTemporarySyntheticWrite}`,
  `- valid apply sections: ${summary.validApplySections}`,
  `- planned edit count: ${summary.plannedEditCount}`,
  `- data file changed: ${summary.dataFileChanged}`,
  '',
  '## Gate',
  '',
  '1. 기본 실행은 dry-run이며 `gwangjuSeatData.ts`를 수정하지 않습니다.',
  '2. production write는 `--write --require-ready`와 통과된 write guard가 모두 필요합니다.',
  '3. synthetic smoke 입력은 `--allow-synthetic-smoke`와 non-production `--data-file`에서만 write할 수 있습니다.',
  '4. 반영 대상은 `home-k7-seats`, `away-cheering-seats` 두 구역으로 고정합니다.',
  '5. 누락 야구 운영 데이터는 `MANUAL_BASEBALL_DATA_REQUIRED`로 남기고 추정하지 않습니다.',
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Rows',
  '',
  markdownTable(
    ['section', 'valid', 'geometry', 'block', 'status', 'blockers'],
    report.rows.map((row) => [
      `\`${row.name}\``,
      `\`${row.validForApply}\``,
      `\`${row.geometryAction}\``,
      `\`${row.blockAction}\``,
      `\`${row.requirementStatusAction}\``,
      row.rowBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
    ]),
  ),
  '',
].join('\n'), 'utf8');

console.log(`operator_apply_json:${jsonPath}`);
console.log(`operator_apply_csv:${csvPath}`);
console.log(`operator_apply_markdown:${markdownPath}`);
console.log(`status:${summary.status} mode=${summary.mode} validApply=${summary.validApplySections} plannedEditCount=${summary.plannedEditCount} dataFileChanged=${summary.dataFileChanged}`);

if (status === 'blocked' || (requireReady && status !== 'ok')) {
  process.exitCode = 1;
}
