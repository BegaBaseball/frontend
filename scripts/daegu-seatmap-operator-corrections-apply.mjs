import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import {
  DAEGU_BLOCKS,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const APPLY_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_APPLY_V1';
const REQUIRED_VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const hasArg = (name) => process.argv.includes(name);

const csvEscape = (value) => {
  const text = String(value ?? '');
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

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const sha256 = (content) => crypto
  .createHash('sha256')
  .update(content)
  .digest('hex');

const sha256File = async (filePath) => sha256(await fs.readFile(filePath));

const shortHash = (content) => sha256(String(content ?? '')).slice(0, 12);

const parseCsv = (content) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows.filter((item) => item.some((fieldValue) => fieldValue !== ''));
  if (!headers) return [];
  return dataRows.map((dataRow) => Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ''])));
};

const readCorrections = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  if (filePath.endsWith('.csv')) {
    return parseCsv(content);
  }

  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.corrections)) return parsed.corrections;
  throw new Error(`Unsupported Daegu operator corrections JSON shape: ${filePath}`);
};

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeBlockId = (row) => String(row.blockId ?? row.id ?? '').trim();

const normalizePathForWrite = (pathData) => String(pathData ?? '')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeRows = (rows) => rows.map((row) => ({
  ...row,
  blockId: normalizeBlockId(row),
  operatorDecision: String(row.operatorDecision ?? 'PENDING').trim() || 'PENDING',
  correctedPath: normalizePathForWrite(row.correctedPath),
  correctedLabelX: numberOrNull(row.correctedLabelX ?? row.labelX),
  correctedLabelY: numberOrNull(row.correctedLabelY ?? row.labelY),
  reviewer: String(row.reviewer ?? '').trim(),
  reviewedAt: String(row.reviewedAt ?? '').trim(),
}));

const formatNumber = (value) => String(Number(value));

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

const findDefinitionsArray = (sourceFile) => {
  let definitions = null;
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node)
      && node.name.getText(sourceFile) === 'DAEGU_BLOCK_DEFINITIONS'
      && node.initializer
      && ts.isArrayLiteralExpression(node.initializer)
    ) {
      definitions = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return definitions;
};

const blockObjectById = (definitions, blockId, sourceFile) => definitions.elements.find((element) => {
  if (!ts.isObjectLiteralExpression(element)) return false;
  const idProperty = findProperty(element, 'id');
  return stringInitializerValue(idProperty, sourceFile) === blockId;
});

const lineStartAt = (source, position) => source.lastIndexOf('\n', Math.max(position - 1, 0)) + 1;

const indentationAt = (source, position) => {
  const lineStart = lineStartAt(source, position);
  return source.slice(lineStart, position).match(/^\s*/)?.[0] ?? '';
};

const propertyIndent = (object, sourceFile, source) => {
  const firstProperty = object.properties.find((property) => ts.isPropertyAssignment(property));
  if (firstProperty) return indentationAt(source, firstProperty.getStart(sourceFile));
  return `${indentationAt(source, object.getStart(sourceFile))}  `;
};

const addOrReplaceInitializers = (object, values, edits, sourceFile, source) => {
  const missing = [];

  values.forEach(({ name, value }) => {
    const property = findProperty(object, name);
    if (property && ts.isPropertyAssignment(property)) {
      edits.push({
        start: property.initializer.getStart(sourceFile),
        end: property.initializer.getEnd(),
        text: value,
      });
    } else {
      missing.push({ name, value });
    }
  });

  if (missing.length > 0) {
    const insertAt = lineStartAt(source, object.getEnd() - 1);
    const indent = propertyIndent(object, sourceFile, source);
    edits.push({
      start: insertAt,
      end: insertAt,
      text: missing.map(({ name, value }) => `${indent}${name}: ${value},`).join('\n') + '\n',
    });
  }
};

const removePropertyLine = (property, edits, sourceFile, source) => {
  if (!property) return;
  const start = lineStartAt(source, property.getStart(sourceFile));
  let end = property.getEnd();
  while (source[end] === ' ' || source[end] === '\t' || source[end] === '\r') end += 1;
  if (source[end] === ',') end += 1;
  if (source[end] === '\n') end += 1;
  edits.push({ start, end, text: '' });
};

const applyEdits = (source, edits) => {
  const ordered = [...edits].sort((left, right) => right.start - left.start || right.end - left.end);
  return ordered.reduce((updated, edit) => (
    `${updated.slice(0, edit.start)}${edit.text}${updated.slice(edit.end)}`
  ), source);
};

const buildReviewNote = (row) => (
  `운영자 승인 corrected path를 공식 PNG 좌표계에 반영했습니다. reviewer=${row.reviewer}; reviewedAt=${row.reviewedAt}.`
);

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const inputPath = path.resolve(frontendRoot, argValue('--input', path.join('reports/stadium', 'daegu-seatmap-operator-corrections-template.json')));
const validationPath = path.resolve(frontendRoot, argValue('--validation', path.join('reports/stadium', 'daegu-seatmap-operator-corrections-validation.json')));
const dataFilePath = path.resolve(frontendRoot, argValue('--data-file', path.join('src/data', 'daeguSeatData.ts')));
const shouldWrite = hasArg('--write');
const productionDataFilePath = path.resolve(frontendRoot, path.join('src/data', 'daeguSeatData.ts'));
const standardWriteInputs = new Set([
  path.resolve(frontendRoot, path.join('reports/stadium', 'daegu-seatmap-operator-corrections-template.json')),
  path.resolve(frontendRoot, path.join('reports/stadium', 'daegu-seatmap-operator-corrections-template.csv')),
]);

const inputSha256 = await sha256File(inputPath);
const inputMetadata = inputPath.endsWith('.json') ? await readJson(inputPath) : {};
const inputIsNonProductionSynthetic = inputMetadata?.nonProductionSyntheticInput === true;
const dataFileIsProduction = dataFilePath === productionDataFilePath;
const inputIsTemporarySyntheticWrite = shouldWrite
  && inputIsNonProductionSynthetic
  && !dataFileIsProduction;
const corrections = normalizeRows(await readCorrections(inputPath));
const validation = await readJson(validationPath);
const validationRows = validation.rows ?? [];
const validRows = validationRows.filter((row) => row.validForApproval === true);
const validRowByBlockId = new Map(validRows.map((row) => [row.blockId, row]));
const correctionByBlockId = new Map(corrections.map((row) => [row.blockId, row]));
const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));

const blockers = [];
if (validation.summary?.validationVersion !== REQUIRED_VALIDATION_VERSION) {
  blockers.push('VALIDATION_VERSION_MISMATCH');
}
if (validation.summary?.status !== 'ok') {
  blockers.push('VALIDATION_STATUS_NOT_OK');
}
if (validation.summary?.inputSha256 !== inputSha256) {
  blockers.push('VALIDATION_INPUT_SHA256_MISMATCH');
}
if ((validation.summary?.invalidApprovedRows ?? 0) > 0) {
  blockers.push('VALIDATION_HAS_INVALID_APPROVED_ROWS');
}
if ((validation.summary?.invalidMetadataRows ?? 0) > 0) {
  blockers.push('VALIDATION_HAS_INVALID_METADATA_ROWS');
}
if ((validation.summary?.validApprovedRows ?? validRows.length) !== validRows.length) {
  blockers.push('VALID_APPROVED_ROW_COUNT_MISMATCH');
}
if (shouldWrite && !standardWriteInputs.has(inputPath) && !inputIsTemporarySyntheticWrite) {
  blockers.push('WRITE_INPUT_MUST_BE_STANDARD_OPERATOR_TEMPLATE');
}
if (shouldWrite && inputIsNonProductionSynthetic && dataFileIsProduction) {
  blockers.push('SYNTHETIC_INPUT_MUST_NOT_WRITE_PRODUCTION_DATA');
}
if (shouldWrite && inputMetadata?.draftOnly === true) {
  blockers.push('WRITE_INPUT_IS_DRAFT_ONLY');
}
if (shouldWrite && inputMetadata?.stagingOnly === true) {
  blockers.push('WRITE_INPUT_IS_STAGING_ONLY');
}

const rowsToApply = validRows.map((validationRow) => {
  const correction = correctionByBlockId.get(validationRow.blockId);
  const block = blockById.get(validationRow.blockId);
  const rowBlockers = [];

  if (!correction) rowBlockers.push('CORRECTION_ROW_NOT_FOUND');
  if (!block) rowBlockers.push('DAEGU_BLOCK_NOT_FOUND');
  if (correction?.operatorDecision !== 'APPROVED') rowBlockers.push('CORRECTION_ROW_NOT_APPROVED');
  if (!correction?.correctedPath) rowBlockers.push('CORRECTED_PATH_MISSING');
  if (correction?.correctedLabelX === null) rowBlockers.push('CORRECTED_LABEL_X_MISSING');
  if (correction?.correctedLabelY === null) rowBlockers.push('CORRECTED_LABEL_Y_MISSING');

  return {
    blockId: validationRow.blockId,
    block: block?.block ?? validationRow.block ?? '',
    name: block?.name ?? '',
    reviewer: correction?.reviewer ?? '',
    reviewedAt: correction?.reviewedAt ?? '',
    oldTraceStatus: block?.traceStatus ?? '',
    oldTraceMethod: block?.traceMethod ?? '',
    newTraceStatus: 'OFFICIAL_IMAGE_TRACED',
    newTraceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    oldPathHash: shortHash(block?.imageGeometry.d ?? ''),
    newPathHash: shortHash(correction?.correctedPath ?? ''),
    oldLabel: block ? `${block.imageGeometry.labelX},${block.imageGeometry.labelY}` : '',
    newLabel: correction ? `${correction.correctedLabelX},${correction.correctedLabelY}` : '',
    correction,
    rowBlockers,
  };
});

rowsToApply.forEach((row) => {
  row.rowBlockers.forEach((blocker) => blockers.push(`${blocker}:${row.blockId}`));
});

let dataFileChanged = false;
let plannedEditCount = 0;

if (blockers.length === 0 && rowsToApply.length > 0) {
  const source = await fs.readFile(dataFilePath, 'utf8');
  const sourceFile = ts.createSourceFile(dataFilePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const definitions = findDefinitionsArray(sourceFile);
  if (!definitions) {
    blockers.push('DAEGU_BLOCK_DEFINITIONS_NOT_FOUND');
  } else {
    const edits = [];

    rowsToApply.forEach((row) => {
      const blockObject = blockObjectById(definitions, row.blockId, sourceFile);
      if (!blockObject) {
        blockers.push(`BLOCK_DEFINITION_NOT_FOUND:${row.blockId}`);
        return;
      }

      const imageGeometryProperty = findProperty(blockObject, 'imageGeometry');
      if (!imageGeometryProperty || !ts.isObjectLiteralExpression(imageGeometryProperty.initializer)) {
        blockers.push(`IMAGE_GEOMETRY_NOT_FOUND:${row.blockId}`);
        return;
      }

      const imageGeometry = imageGeometryProperty.initializer;
      removePropertyLine(findProperty(imageGeometry, 'paths'), edits, sourceFile, source);
      addOrReplaceInitializers(imageGeometry, [
        { name: 'd', value: JSON.stringify(row.correction.correctedPath) },
        { name: 'labelX', value: formatNumber(row.correction.correctedLabelX) },
        { name: 'labelY', value: formatNumber(row.correction.correctedLabelY) },
      ], edits, sourceFile, source);
      addOrReplaceInitializers(blockObject, [
        { name: 'sourceConfidence', value: '"OFFICIAL"' },
        { name: 'sourceNote', value: 'COORDINATE_VERIFIED_SOURCE_NOTE' },
        { name: 'traceStatus', value: '"OFFICIAL_IMAGE_TRACED"' },
        { name: 'traceMethod', value: '"PATH_TRACED_FROM_OFFICIAL_IMAGE"' },
        { name: 'reviewNote', value: JSON.stringify(buildReviewNote(row.correction)) },
      ], edits, sourceFile, source);
    });

    plannedEditCount = edits.length;
    if (blockers.length === 0 && shouldWrite) {
      const nextSource = applyEdits(source, edits);
      dataFileChanged = nextSource !== source;
      if (dataFileChanged) {
        await fs.writeFile(dataFilePath, nextSource, 'utf8');
      }
    }
  }
}

const status = blockers.length === 0 ? 'ok' : 'blocked';
const summary = {
  applyVersion: APPLY_VERSION,
  mode: shouldWrite ? 'write' : 'dry-run',
  status,
  input: path.relative(frontendRoot, inputPath),
  inputSha256,
  inputIsStandardWriteTemplate: standardWriteInputs.has(inputPath),
  inputIsNonProductionSynthetic,
  inputIsTemporarySyntheticWrite,
  dataFileIsProduction,
  inputDraftOnly: inputMetadata?.draftOnly === true,
  inputStagingOnly: inputMetadata?.stagingOnly === true,
  validation: path.relative(frontendRoot, validationPath),
  dataFile: path.relative(frontendRoot, dataFilePath),
  validationStatus: validation.summary?.status ?? '',
  approvedRows: validation.summary?.approvedRows ?? 0,
  validApprovedRows: validRows.length,
  plannedRows: rowsToApply.length,
  plannedEditCount,
  dataFileChanged,
  blockers,
  requiredPostApplyGate: 'npm run stadium:daegu:alignment-audit',
  writeCommand: 'npm run stadium:daegu:operator-corrections-write',
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  rows: rowsToApply.map(({ correction: _correction, rowBlockers, ...row }) => ({
    ...row,
    rowBlockers,
  })),
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-apply.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-apply.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-apply.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'blockId',
    'block',
    'name',
    'reviewer',
    'reviewedAt',
    'oldTraceStatus',
    'oldTraceMethod',
    'newTraceStatus',
    'newTraceMethod',
    'oldPathHash',
    'newPathHash',
    'oldLabel',
    'newLabel',
    'rowBlockers',
  ],
  ...report.rows.map((row) => [
    row.blockId,
    row.block,
    row.name,
    row.reviewer,
    row.reviewedAt,
    row.oldTraceStatus,
    row.oldTraceMethod,
    row.newTraceStatus,
    row.newTraceMethod,
    row.oldPathHash,
    row.newPathHash,
    row.oldLabel,
    row.newLabel,
    row.rowBlockers.join(' '),
  ]),
]);
await fs.writeFile(markdownPath, [
  '# 대구 좌석도 operator corrections apply',
  '',
  `- apply version: \`${APPLY_VERSION}\``,
  `- mode: \`${summary.mode}\``,
  `- status: \`${summary.status}\``,
  `- input: \`${summary.input}\``,
  `- input sha256: \`${summary.inputSha256}\``,
  `- validation: \`${summary.validation}\``,
  `- valid approved rows: ${summary.validApprovedRows}`,
  `- planned rows: ${summary.plannedRows}`,
  `- planned edit count: ${summary.plannedEditCount}`,
  `- data file changed: ${summary.dataFileChanged}`,
  '',
  '## Gate',
  '',
  '1. 이 스크립트는 기본적으로 dry-run입니다.',
  '2. `--write`가 없으면 `daeguSeatData.ts`를 수정하지 않습니다.',
  '3. validation report의 `inputSha256`이 현재 corrections input과 다르면 차단합니다.',
  '4. `validForApproval=true`인 행만 반영 대상입니다.',
  '5. `--write`는 표준 operator corrections template JSON/CSV 입력에서만 허용합니다.',
  '6. `draftOnly` 또는 `stagingOnly` JSON은 `--write` 입력으로 사용할 수 없습니다.',
  '7. write 후에는 `npm run stadium:daegu:alignment-audit`를 다시 통과해야 합니다.',
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Planned Rows',
  '',
  report.rows.length > 0
    ? markdownTable(
      ['block', 'reviewer', 'reviewedAt', 'old trace', 'new trace', 'old label', 'new label', 'blockers'],
      report.rows.map((row) => [
        row.block ? `\`${row.block}\`` : row.blockId,
        row.reviewer,
        row.reviewedAt,
        `\`${row.oldTraceStatus}/${row.oldTraceMethod}\``,
        `\`${row.newTraceStatus}/${row.newTraceMethod}\``,
        row.oldLabel,
        row.newLabel,
        row.rowBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
      ]),
    )
    : 'No approved corrections to apply.',
  '',
].join('\n'), 'utf8');

console.log(`corrections_apply_json:${jsonPath}`);
console.log(`corrections_apply_csv:${csvPath}`);
console.log(`corrections_apply_markdown:${markdownPath}`);
console.log(`status:${summary.status} mode=${summary.mode} plannedRows=${summary.plannedRows} plannedEditCount=${summary.plannedEditCount} dataFileChanged=${summary.dataFileChanged}`);

if (status !== 'ok') {
  process.exitCode = 1;
}
