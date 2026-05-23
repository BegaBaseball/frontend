import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import {
  DAEGU_BLOCKS,
  DAEGU_SEATMAP_IMAGE,
} from '../src/data/daeguSeatData.ts';

const runOperatorCorrectionsApply = async () => {
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
};

const runOperatorCorrectionsBatches = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const BATCH_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_BATCHES_V1';
  const BATCHES = [
    {
      id: 'BATCH_1_P0',
      label: '1차 P0',
      order: 1,
      queuePriorities: ['P0'],
      expectedRows: 0,
    },
    {
      id: 'BATCH_2_P1',
      label: '2차 P1',
      order: 2,
      queuePriorities: ['P1'],
      expectedRows: 17,
    },
    {
      id: 'BATCH_3_P2',
      label: '3차 P2',
      order: 3,
      queuePriorities: ['P2'],
      expectedRows: 36,
    },
    {
      id: 'BATCH_4_P3_P4',
      label: '4차 P3/P4',
      order: 4,
      queuePriorities: ['P3', 'P4'],
      expectedRows: 44,
    },
  ];
  const EXPECTED_HANDOFF_ROWS = 97;

  const TERMINAL_NON_APPROVED_DECISIONS = new Set(['REJECTED', 'NEEDS_RETRACE']);

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

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

  const readJsonReport = async (filePath) => {
    try {
      return {
        path: filePath,
        relativePath: path.relative(frontendRoot, filePath),
        exists: true,
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: '',
      };
    } catch (error) {
      return {
        path: filePath,
        relativePath: path.relative(frontendRoot, filePath),
        exists: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
  const validationPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.json');
  const handoffReport = await readJsonReport(handoffPath);
  const validationReport = await readJsonReport(validationPath);

  const blockers = [];
  const warnings = [];
  if (!handoffReport.exists) blockers.push(`MISSING_REPORT:${handoffReport.relativePath}`);
  if (!validationReport.exists) blockers.push(`MISSING_REPORT:${validationReport.relativePath}`);

  const handoffItems = Array.isArray(handoffReport.data?.workItems) ? handoffReport.data.workItems : [];
  const validationRows = Array.isArray(validationReport.data?.rows) ? validationReport.data.rows : [];
  const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));

  const batchRows = BATCHES.map((batch) => {
    const rows = handoffItems
      .filter((item) => batch.queuePriorities.includes(item.queuePriority))
      .map((item) => {
        const validationRow = validationByBlockId.get(item.id) ?? {};
        const operatorDecision = normalizeDecision(validationRow.operatorDecision ?? item.operatorDecision);
        const validForApproval = validationRow.validForApproval === true;
        const reasons = Array.isArray(validationRow.reasons) ? validationRow.reasons : [];
        const warningsForRow = Array.isArray(validationRow.warnings) ? validationRow.warnings : [];
        const isApproved = operatorDecision === 'APPROVED';
        return {
          batchId: batch.id,
          batchLabel: batch.label,
          batchOrder: batch.order,
          blockId: item.id,
          block: item.block,
          queuePriority: item.queuePriority,
          alignmentClass: item.alignmentClass,
          operatorDecision,
          validForApproval,
          invalidApproved: isApproved && !validForApproval,
          pending: operatorDecision === 'PENDING',
          terminalNonApproved: TERMINAL_NON_APPROVED_DECISIONS.has(operatorDecision),
          reasons,
          warnings: warningsForRow,
        };
      });

    const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED').length;
    const validApprovedRows = rows.filter((row) => row.validForApproval).length;
    const invalidApprovedRows = rows.filter((row) => row.invalidApproved).length;
    const pendingRows = rows.filter((row) => row.pending).length;
    const rejectedRows = rows.filter((row) => row.operatorDecision === 'REJECTED').length;
    const needsRetraceRows = rows.filter((row) => row.operatorDecision === 'NEEDS_RETRACE').length;
    const terminalNonApprovedRows = rows.filter((row) => row.terminalNonApproved).length;
    const blockersForBatch = [];
    const warningsForBatch = [];

    if (rows.length !== batch.expectedRows) {
      warningsForBatch.push(`BATCH_TARGET_COUNT_CHANGED:${rows.length}:${batch.expectedRows}`);
    }
    if (approvedRows === 0) blockersForBatch.push('NO_APPROVED_ROWS_IN_BATCH');
    if (invalidApprovedRows > 0) blockersForBatch.push(`INVALID_APPROVED_ROWS_IN_BATCH:${invalidApprovedRows}`);
    if (approvedRows > 0 && validApprovedRows !== approvedRows) {
      blockersForBatch.push(`VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows}`);
    }
    if (approvedRows > 0 && pendingRows > 0) {
      blockersForBatch.push(`BATCH_HAS_PENDING_ROWS:${pendingRows}`);
    }

    return {
      id: batch.id,
      label: batch.label,
      order: batch.order,
      queuePriorities: batch.queuePriorities,
      expectedRows: batch.expectedRows,
      totalRows: rows.length,
      approvedRows,
      validApprovedRows,
      invalidApprovedRows,
      pendingRows,
      rejectedRows,
      needsRetraceRows,
      terminalNonApprovedRows,
      readyForWrite: approvedRows > 0
        && invalidApprovedRows === 0
        && validApprovedRows === approvedRows
        && pendingRows === 0,
      blockers: blockersForBatch,
      warnings: warningsForBatch,
      rows,
    };
  });

  const firstOpenBatch = batchRows.find((batch) => (
    batch.pendingRows > 0
    || batch.approvedRows > 0
    || batch.invalidApprovedRows > 0
  )) ?? null;
  const approvedBatchRows = batchRows.filter((batch) => batch.approvedRows > 0);
  const approvedBatchIds = approvedBatchRows.map((batch) => batch.id);
  const outOfOrderBatchRows = firstOpenBatch
    ? batchRows.filter((batch) => batch.order > firstOpenBatch.order && batch.approvedRows > 0)
    : [];
  const outOfOrderApprovedRows = outOfOrderBatchRows.reduce(
    (total, batch) => total + batch.approvedRows,
    0,
  );
  const readyBatchRows = batchRows.filter((batch) => batch.readyForWrite);
  const selectedReadyBatch = readyBatchRows.find((batch) => (
    approvedBatchIds.length === 1
    && approvedBatchIds[0] === batch.id
    && outOfOrderApprovedRows === 0
  )) ?? null;

  if (handoffItems.length !== EXPECTED_HANDOFF_ROWS) {
    warnings.push(`HANDOFF_TARGET_COUNT_CHANGED:${handoffItems.length}:${EXPECTED_HANDOFF_ROWS}`);
  }
  if (approvedBatchIds.length > 1) blockers.push(`APPROVED_ROWS_MUST_BE_SINGLE_BATCH:${approvedBatchIds.join(' ')}`);
  if (outOfOrderApprovedRows > 0) blockers.push(`APPROVED_ROWS_OUT_OF_PRIORITY_ORDER:${outOfOrderApprovedRows}`);
  if (approvedBatchIds.length === 1 && !selectedReadyBatch) {
    blockers.push(`APPROVED_BATCH_NOT_READY:${approvedBatchIds[0]}`);
  }
  batchRows.forEach((batch) => {
    warnings.push(...batch.warnings.map((warning) => `${batch.id}:${warning}`));
  });

  const totalApprovedRows = batchRows.reduce((total, batch) => total + batch.approvedRows, 0);
  const totalValidApprovedRows = batchRows.reduce((total, batch) => total + batch.validApprovedRows, 0);
  const totalInvalidApprovedRows = batchRows.reduce((total, batch) => total + batch.invalidApprovedRows, 0);
  const totalPendingRows = batchRows.reduce((total, batch) => total + batch.pendingRows, 0);

  if (totalApprovedRows === 0) blockers.push('NO_APPROVED_OPERATOR_CORRECTIONS');

  const readyForWrite = blockers.length === 0 && selectedReadyBatch !== null;
  const summary = {
    batchVersion: BATCH_VERSION,
    status: readyForWrite ? 'ready' : 'blocked',
    readyForWrite,
    totalHandoffRows: handoffItems.length,
    expectedHandoffRows: EXPECTED_HANDOFF_ROWS,
    approvedRows: totalApprovedRows,
    validApprovedRows: totalValidApprovedRows,
    invalidApprovedRows: totalInvalidApprovedRows,
    pendingRows: totalPendingRows,
    batchCount: BATCHES.length,
    approvedBatchCount: approvedBatchIds.length,
    approvedBatchIds,
    firstOpenBatchId: firstOpenBatch?.id ?? '',
    nextBatchId: selectedReadyBatch?.id ?? firstOpenBatch?.id ?? '',
    readyBatchId: selectedReadyBatch?.id ?? '',
    readyBatchApprovedRows: selectedReadyBatch?.approvedRows ?? 0,
    outOfOrderApprovedRows,
    blockers,
    warnings,
    guardedWriteCommand: 'npm run stadium:daegu:operator-corrections-write',
    postWriteGateCommand: 'npm run stadium:daegu:operator-corrections-postwrite-gate',
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    batchPolicy: {
      version: BATCH_VERSION,
      officialPngCoordinateSystem: '1707x2048',
      approvedRowsOnly: true,
      singleBatchOnly: true,
      priorityOrder: BATCHES.map((batch) => batch.id),
      failedRowsStayInSourceBatch: true,
      failedRowsAreNotCarriedForward: true,
      productionWriteCommand: 'npm run stadium:daegu:operator-corrections-write',
      note: 'This report does not modify src/data/daeguSeatData.ts. It only decides whether the current approved rows match the operator batch policy.',
    },
    sourceReports: {
      handoff: {
        path: handoffReport.relativePath,
        exists: handoffReport.exists,
        error: handoffReport.error,
      },
      validation: {
        path: validationReport.relativePath,
        exists: validationReport.exists,
        error: validationReport.error,
      },
    },
    batches: batchRows,
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.md');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'batchId',
      'label',
      'queuePriorities',
      'expectedRows',
      'totalRows',
      'approvedRows',
      'validApprovedRows',
      'invalidApprovedRows',
      'pendingRows',
      'rejectedRows',
      'needsRetraceRows',
      'readyForWrite',
      'blockers',
      'warnings',
    ],
    ...batchRows.map((batch) => [
      batch.id,
      batch.label,
      batch.queuePriorities.join(' '),
      batch.expectedRows,
      batch.totalRows,
      batch.approvedRows,
      batch.validApprovedRows,
      batch.invalidApprovedRows,
      batch.pendingRows,
      batch.rejectedRows,
      batch.needsRetraceRows,
      batch.readyForWrite,
      batch.blockers.join(' '),
      batch.warnings.join(' '),
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# 대구 좌석도 operator corrections batches',
    '',
    `- batch version: \`${BATCH_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- ready for write: ${summary.readyForWrite}`,
    `- total handoff rows: ${summary.totalHandoffRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- invalid approved rows: ${summary.invalidApprovedRows}`,
    `- approved batch ids: ${summary.approvedBatchIds.length ? summary.approvedBatchIds.map((id) => `\`${id}\``).join(', ') : '-'}`,
    `- first open batch: \`${summary.firstOpenBatchId || '-'}\``,
    `- next batch: \`${summary.nextBatchId || '-'}\``,
    `- ready batch: \`${summary.readyBatchId || '-'}\``,
    `- out-of-order approved rows: ${summary.outOfOrderApprovedRows}`,
    `- guarded write command: \`${summary.guardedWriteCommand}\``,
    '',
    '## Batch Policy',
    '',
    '1. `BATCH_1_P0` -> `BATCH_2_P1` -> `BATCH_3_P2` -> `BATCH_4_P3_P4` 순서로 진행한다.',
    '2. 한 번의 production write에는 하나의 batch에 속한 승인 row만 포함한다.',
    '3. batch 안의 `PENDING` row가 남아 있으면 write 준비 상태가 아니다.',
    '4. `REJECTED` 또는 `NEEDS_RETRACE` row는 실패/보류 row로 보고 다음 batch로 넘기지 않는다.',
    '5. 이 리포트는 production 좌표를 수정하지 않는다.',
    '',
    '## Batches',
    '',
    markdownTable(
      [
        'batch',
        'priorities',
        'expected',
        'total',
        'approved',
        'valid approved',
        'invalid approved',
        'pending',
        'rejected',
        'needs retrace',
        'ready',
        'blockers',
      ],
      batchRows.map((batch) => [
        `\`${batch.id}\``,
        batch.queuePriorities.map((priority) => `\`${priority}\``).join(' '),
        batch.expectedRows,
        batch.totalRows,
        batch.approvedRows,
        batch.validApprovedRows,
        batch.invalidApprovedRows,
        batch.pendingRows,
        batch.rejectedRows,
        batch.needsRetraceRows,
        String(batch.readyForWrite),
        batch.blockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`corrections_batches_json:${jsonPath}`);
  console.log(`corrections_batches_csv:${csvPath}`);
  console.log(`corrections_batches_markdown:${markdownPath}`);
  console.log(`status:${summary.status} readyForWrite=${summary.readyForWrite} nextBatch=${summary.nextBatchId || '-'} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows}`);
};

const runOperatorCorrectionsPreview = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const PREVIEW_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_PREVIEW_V1';
  const REQUIRED_VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

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

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const sha256 = (content) => crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');

  const sha256File = async (filePath) => sha256(await fs.readFile(filePath));

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

  const normalizePath = (pathData) => String(pathData ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizeRows = (rows) => rows.map((row) => ({
    ...row,
    blockId: normalizeBlockId(row),
    operatorDecision: String(row.operatorDecision ?? 'PENDING').trim() || 'PENDING',
    correctedPath: normalizePath(row.correctedPath),
    correctedLabelX: numberOrNull(row.correctedLabelX ?? row.labelX),
    correctedLabelY: numberOrNull(row.correctedLabelY ?? row.labelY),
    reviewer: String(row.reviewer ?? '').trim(),
    reviewedAt: String(row.reviewedAt ?? '').trim(),
  }));

  const pathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const pathBounds = (paths) => {
    const points = paths.flatMap(pathPoints);
    if (points.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: DAEGU_SEATMAP_IMAGE.imageWidth,
        maxY: DAEGU_SEATMAP_IMAGE.imageHeight,
      };
    }

    return {
      minX: Math.min(...points.map((point) => point[0])),
      minY: Math.min(...points.map((point) => point[1])),
      maxX: Math.max(...points.map((point) => point[0])),
      maxY: Math.max(...points.map((point) => point[1])),
    };
  };

  const expandBounds = (bounds, padding = 80) => ({
    minX: Math.max(0, Math.floor(bounds.minX - padding)),
    minY: Math.max(0, Math.floor(bounds.minY - padding)),
    maxX: Math.min(DAEGU_SEATMAP_IMAGE.imageWidth, Math.ceil(bounds.maxX + padding)),
    maxY: Math.min(DAEGU_SEATMAP_IMAGE.imageHeight, Math.ceil(bounds.maxY + padding)),
  });

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const inputPath = path.resolve(frontendRoot, argValue('--input', path.join('reports/stadium', 'daegu-seatmap-operator-corrections-template.json')));
  const validationPath = path.resolve(frontendRoot, argValue('--validation', path.join('reports/stadium', 'daegu-seatmap-operator-corrections-validation.json')));

  const inputSha256 = await sha256File(inputPath);
  const corrections = normalizeRows(await readCorrections(inputPath));
  const validation = await readJson(validationPath);
  const validationRows = validation.rows ?? [];
  const correctionByBlockId = new Map(corrections.map((row) => [row.blockId, row]));
  const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));

  const blockers = [];
  if (validation.summary?.validationVersion !== REQUIRED_VALIDATION_VERSION) {
    blockers.push('VALIDATION_VERSION_MISMATCH');
  }
  if (validation.summary?.inputSha256 !== inputSha256) {
    blockers.push('VALIDATION_INPUT_SHA256_MISMATCH');
  }
  if (validation.summary?.status !== 'ok') {
    blockers.push('VALIDATION_STATUS_NOT_OK');
  }

  const approvedValidationRows = validationRows.filter((row) => row.operatorDecision === 'APPROVED');
  const previewRows = approvedValidationRows.map((validationRow) => {
    const correction = correctionByBlockId.get(validationRow.blockId);
    const block = blockById.get(validationRow.blockId);
    const currentPath = block?.imageGeometry.d ?? '';
    const correctedPath = correction?.correctedPath ?? '';
    const bounds = expandBounds(pathBounds([currentPath, correctedPath]));

    return {
      blockId: validationRow.blockId,
      block: block?.block ?? validationRow.block ?? '',
      name: block?.name ?? '',
      category: block?.category ?? '',
      validForApproval: validationRow.validForApproval,
      reasons: validationRow.reasons ?? [],
      warnings: validationRow.warnings ?? [],
      reviewer: correction?.reviewer ?? '',
      reviewedAt: correction?.reviewedAt ?? '',
      currentPath,
      correctedPath,
      currentLabelX: block?.imageGeometry.labelX ?? '',
      currentLabelY: block?.imageGeometry.labelY ?? '',
      correctedLabelX: correction?.correctedLabelX ?? '',
      correctedLabelY: correction?.correctedLabelY ?? '',
      bounds,
    };
  });

  const summary = {
    previewVersion: PREVIEW_VERSION,
    status: blockers.length === 0 ? 'ok' : 'blocked',
    input: path.relative(frontendRoot, inputPath),
    inputSha256,
    validation: path.relative(frontendRoot, validationPath),
    validationStatus: validation.summary?.status ?? '',
    approvedRows: approvedValidationRows.length,
    validApprovedRows: previewRows.filter((row) => row.validForApproval).length,
    invalidApprovedRows: previewRows.filter((row) => !row.validForApproval).length,
    previewRows: previewRows.length,
    blockers,
    requiredBeforeWrite: 'npm run stadium:daegu:operator-corrections-validate',
    writeCommand: 'npm run stadium:daegu:operator-corrections-write',
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-preview.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-preview.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-preview.md');
  const svgPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-preview.svg');

  const previewSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${DAEGU_SEATMAP_IMAGE.imageWidth}" height="${DAEGU_SEATMAP_IMAGE.imageHeight}" viewBox="0 0 ${DAEGU_SEATMAP_IMAGE.imageWidth} ${DAEGU_SEATMAP_IMAGE.imageHeight}">`,
    '  <style>',
    '    .grid { stroke: #0f172a; stroke-opacity: 0.14; stroke-width: 1; }',
    '    .current { fill: #ef4444; fill-opacity: 0.12; stroke: #dc2626; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '    .corrected { fill: #22c55e; fill-opacity: 0.18; stroke: #16a34a; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '    .invalid { fill: #f97316; fill-opacity: 0.18; stroke: #ea580c; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '    .focus { fill: none; stroke: #0f172a; stroke-width: 2; stroke-dasharray: 10 6; vector-effect: non-scaling-stroke; }',
    '    .label { font: 800 14px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
    '    .note { font: 700 18px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
    '  </style>',
    `  <image href="../../src/assets/stadiums/samsung/${DAEGU_SEATMAP_IMAGE.requiredAssetFileName}" x="0" y="0" width="${DAEGU_SEATMAP_IMAGE.imageWidth}" height="${DAEGU_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />`,
    ...Array.from({ length: Math.floor(DAEGU_SEATMAP_IMAGE.imageWidth / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="${DAEGU_SEATMAP_IMAGE.imageHeight}" />`),
    ...Array.from({ length: Math.floor(DAEGU_SEATMAP_IMAGE.imageHeight / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="${DAEGU_SEATMAP_IMAGE.imageWidth}" y2="${index * 100}" />`),
    previewRows.length === 0
      ? '  <text class="note" x="80" y="120">No approved operator corrections to preview.</text>'
      : '',
    '  <g id="current-paths">',
    ...previewRows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.block} current path`)}</title></path>`),
    '  </g>',
    '  <g id="corrected-paths">',
    ...previewRows.map((row) => `    <path class="${row.validForApproval ? 'corrected' : 'invalid'}" d="${xmlEscape(row.correctedPath)}"><title>${xmlEscape(`${row.block} corrected path ${row.validForApproval ? 'valid' : row.reasons.join(' ')}`)}</title></path>`),
    '  </g>',
    '  <g id="focus-bounds">',
    ...previewRows.map((row) => `    <rect class="focus" x="${row.bounds.minX}" y="${row.bounds.minY}" width="${row.bounds.maxX - row.bounds.minX}" height="${row.bounds.maxY - row.bounds.minY}"><title>${xmlEscape(`${row.block} preview bounds`)}</title></rect>`),
    '  </g>',
    '  <g id="labels">',
    ...previewRows.map((row) => [
      row.currentLabelX !== '' && row.currentLabelY !== ''
        ? `    <circle cx="${row.currentLabelX}" cy="${row.currentLabelY}" r="5" fill="#dc2626" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />`
        : '',
      row.correctedLabelX !== '' && row.correctedLabelY !== ''
        ? `    <circle cx="${row.correctedLabelX}" cy="${row.correctedLabelY}" r="5" fill="${row.validForApproval ? '#16a34a' : '#ea580c'}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />`
        : '',
      row.correctedLabelX !== '' && row.correctedLabelY !== ''
        ? `    <text class="label" x="${Number(row.correctedLabelX) + 8}" y="${Number(row.correctedLabelY) - 8}">${xmlEscape(row.block)}</text>`
        : '',
    ].filter(Boolean).join('\n')),
    '  </g>',
    '</svg>',
  ].join('\n');

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    legend: {
      currentPath: 'red',
      validCorrectedPath: 'green',
      invalidApprovedPath: 'orange',
      currentLabel: 'red dot',
      correctedLabel: 'green/orange dot',
    },
    rows: previewRows,
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'blockId',
      'block',
      'name',
      'category',
      'validForApproval',
      'reasons',
      'warnings',
      'reviewer',
      'reviewedAt',
      'currentLabelX',
      'currentLabelY',
      'correctedLabelX',
      'correctedLabelY',
    ],
    ...previewRows.map((row) => [
      row.blockId,
      row.block,
      row.name,
      row.category,
      row.validForApproval,
      row.reasons.join(' '),
      row.warnings.join(' '),
      row.reviewer,
      row.reviewedAt,
      row.currentLabelX,
      row.currentLabelY,
      row.correctedLabelX,
      row.correctedLabelY,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# 대구 좌석도 operator corrections preview',
    '',
    `- preview version: \`${PREVIEW_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- input: \`${summary.input}\``,
    `- input sha256: \`${summary.inputSha256}\``,
    `- validation: \`${summary.validation}\``,
    `- approved rows: ${summary.approvedRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- invalid approved rows: ${summary.invalidApprovedRows}`,
    `- preview rows: ${summary.previewRows}`,
    '- SVG: `reports/stadium/daegu-seatmap-operator-corrections-preview.svg`',
    '',
    '## Legend',
    '',
    '- red path: current `daeguSeatData.ts` path',
    '- green path: valid operator corrected path',
    '- orange path: approved row that did not pass validation',
    '- red dot: current label point',
    '- green/orange dot: corrected label point',
    '',
    '## Gate',
    '',
    '1. 이 preview는 데이터를 수정하지 않습니다.',
    '2. `VALIDATION_INPUT_SHA256_MISMATCH`가 있으면 현재 input과 validation 결과가 서로 다른 것입니다.',
    '3. write 전에는 이 SVG에서 current path와 corrected path를 비교합니다.',
    '4. write 후에는 `npm run stadium:daegu:alignment-audit`를 다시 통과해야 합니다.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Preview Rows',
    '',
    previewRows.length > 0
      ? markdownTable(
        ['block', 'valid', 'reviewer', 'reviewedAt', 'current label', 'corrected label', 'reasons', 'warnings'],
        previewRows.map((row) => [
          row.block ? `\`${row.block}\`` : row.blockId,
          String(row.validForApproval),
          row.reviewer,
          row.reviewedAt,
          `${row.currentLabelX},${row.currentLabelY}`,
          `${row.correctedLabelX},${row.correctedLabelY}`,
          row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
          row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
        ]),
      )
      : 'No approved corrections to preview.',
    '',
  ].join('\n'), 'utf8');
  await fs.writeFile(svgPath, previewSvg, 'utf8');

  console.log(`corrections_preview_json:${jsonPath}`);
  console.log(`corrections_preview_csv:${csvPath}`);
  console.log(`corrections_preview_markdown:${markdownPath}`);
  console.log(`corrections_preview_svg:${svgPath}`);
  console.log(`status:${summary.status} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows} previewRows=${summary.previewRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runOperatorCorrectionsStatus = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const STATUS_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_STATUS_V1';
  const RELEASE_CLASSIFICATION_BLOCKED_BY_OPERATOR_REVIEW = 'BLOCKED_BY_OPERATOR_REVIEW';
  const RELEASE_CLASSIFICATION_READY_FOR_OPERATOR_WRITE = 'READY_FOR_OPERATOR_WRITE';
  const RELEASE_CLASSIFICATION_FAIL = 'FAIL';

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

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

  const readReport = async (label, filePath) => {
    try {
      return {
        label,
        path: filePath,
        relativePath: path.relative(frontendRoot, filePath),
        exists: true,
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: '',
      };
    } catch (error) {
      return {
        label,
        path: filePath,
        relativePath: path.relative(frontendRoot, filePath),
        exists: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const summaryOf = (report) => report.data?.summary ?? report.data ?? {};

  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const boolOrFalse = (value) => value === true;

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const reports = {
    alignment: await readReport('alignment', path.join(reportDir, 'daegu-seatmap-alignment-audit.json')),
    handoff: await readReport('handoff', path.join(reportDir, 'daegu-seatmap-operator-handoff.json')),
    template: await readReport('template', path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json')),
    validation: await readReport('validation', path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.json')),
    preview: await readReport('preview', path.join(reportDir, 'daegu-seatmap-operator-corrections-preview.json')),
    apply: await readReport('apply', path.join(reportDir, 'daegu-seatmap-operator-corrections-apply.json')),
    batches: await readReport('batches', path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.json')),
    writeSmoke: await readReport(
      'writeSmoke',
      path.join(
        reportDir,
        'daegu-seatmap-operator-corrections-write-smoke',
        'daegu-seatmap-operator-corrections-write-smoke.json',
      ),
    ),
  };

  const alignmentSummary = summaryOf(reports.alignment);
  const handoffSummary = summaryOf(reports.handoff);
  const templateRows = Array.isArray(reports.template.data?.corrections)
    ? reports.template.data.corrections.length
    : 0;
  const validationSummary = summaryOf(reports.validation);
  const previewSummary = summaryOf(reports.preview);
  const applySummary = summaryOf(reports.apply);
  const batchesSummary = summaryOf(reports.batches);
  const writeSmokeSummary = summaryOf(reports.writeSmoke);

  const totalBlocks = numberOrZero(alignmentSummary.totalBlocks ?? handoffSummary.totalBlocks);
  const lockedVerified = numberOrZero(alignmentSummary.lockedVerified ?? handoffSummary.lockedVerified);
  const retraceRequired = numberOrZero(alignmentSummary.retraceRequired ?? handoffSummary.retraceRequired);
  const operatorRequired = numberOrZero(alignmentSummary.operatorRequired ?? handoffSummary.operatorRequired);
  const handoffTargets = numberOrZero(handoffSummary.targetBlocks);
  const approvedRows = numberOrZero(validationSummary.approvedRows ?? previewSummary.approvedRows ?? applySummary.approvedRows);
  const validApprovedRows = numberOrZero(
    validationSummary.validApprovedRows
      ?? previewSummary.validApprovedRows
      ?? applySummary.validApprovedRows,
  );
  const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows ?? previewSummary.invalidApprovedRows);
  const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
  const previewRows = numberOrZero(previewSummary.previewRows);
  const applyPlannedRows = numberOrZero(applySummary.plannedRows);
  const readyBatchId = String(batchesSummary.readyBatchId ?? '');
  const approvedBatchCount = numberOrZero(batchesSummary.approvedBatchCount);
  const batchReadyApprovedRows = numberOrZero(batchesSummary.readyBatchApprovedRows);
  const outOfOrderApprovedRows = numberOrZero(batchesSummary.outOfOrderApprovedRows);
  const remainingOperatorRows = Math.max(handoffTargets - approvedRows, 0);
  const remainingValidatedRows = Math.max(handoffTargets - validApprovedRows, 0);

  const blockers = [];
  Object.values(reports).forEach((report) => {
    if (!report.exists) blockers.push(`MISSING_REPORT:${report.relativePath}`);
  });

  if (reports.alignment.exists && totalBlocks !== 177) blockers.push(`DAEGU_BLOCK_CONTRACT_CHANGED:${totalBlocks}`);
  if (reports.handoff.exists && handoffTargets !== retraceRequired + operatorRequired) {
    blockers.push('HANDOFF_TARGETS_DO_NOT_MATCH_AUDIT_RETRACE_PLUS_OPERATOR');
  }
  if (reports.template.exists && reports.handoff.exists && templateRows !== handoffTargets) {
    blockers.push(`TEMPLATE_ROWS_DO_NOT_MATCH_HANDOFF_TARGETS:${templateRows}:${handoffTargets}`);
  }
  if (reports.validation.exists && validationSummary.status !== 'ok') blockers.push('VALIDATION_STATUS_NOT_OK');
  if (invalidApprovedRows > 0) blockers.push(`VALIDATION_HAS_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
  if (invalidMetadataRows > 0) blockers.push(`VALIDATION_HAS_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
  if (approvedRows > 0 && validApprovedRows !== approvedRows) {
    blockers.push(`VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows}`);
  }
  if (reports.preview.exists && previewSummary.status !== 'ok') blockers.push('PREVIEW_STATUS_NOT_OK');
  if (approvedRows > 0 && previewRows !== approvedRows) {
    blockers.push(`PREVIEW_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${previewRows}:${approvedRows}`);
  }
  if (reports.apply.exists && applySummary.status !== 'ok') blockers.push('APPLY_STATUS_NOT_OK');
  if (reports.apply.exists && applySummary.mode !== 'dry-run') blockers.push(`APPLY_REPORT_NOT_DRY_RUN:${applySummary.mode}`);
  if (reports.apply.exists && boolOrFalse(applySummary.dataFileChanged)) blockers.push('DRY_RUN_APPLY_CHANGED_DATA_FILE');
  if (approvedRows > 0 && applyPlannedRows !== validApprovedRows) {
    blockers.push(`APPLY_PLANNED_ROWS_DO_NOT_MATCH_VALID_APPROVED_ROWS:${applyPlannedRows}:${validApprovedRows}`);
  }
  if (reports.batches.exists && batchesSummary.status !== 'ready' && approvedRows > 0) {
    blockers.push(`BATCH_STATUS_NOT_READY:${batchesSummary.status ?? 'missing'}`);
  }
  if (reports.batches.exists && approvedRows > 0 && approvedBatchCount !== 1) {
    blockers.push(`APPROVED_ROWS_MUST_BE_SINGLE_BATCH:${approvedBatchCount}`);
  }
  if (reports.batches.exists && approvedRows > 0 && !readyBatchId) {
    blockers.push('NO_READY_OPERATOR_CORRECTIONS_BATCH');
  }
  if (reports.batches.exists && approvedRows > 0 && outOfOrderApprovedRows > 0) {
    blockers.push(`APPROVED_ROWS_OUT_OF_PRIORITY_ORDER:${outOfOrderApprovedRows}`);
  }
  if (reports.batches.exists && approvedRows > 0 && batchReadyApprovedRows !== approvedRows) {
    blockers.push(`READY_BATCH_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${batchReadyApprovedRows}:${approvedRows}`);
  }
  if (reports.writeSmoke.exists && writeSmokeSummary.status !== 'ok') blockers.push('WRITE_SMOKE_STATUS_NOT_OK');
  if (reports.writeSmoke.exists && !boolOrFalse(writeSmokeSummary.productionDataUnchanged)) {
    blockers.push('WRITE_SMOKE_PRODUCTION_DATA_CHANGED');
  }
  if (reports.writeSmoke.exists && !boolOrFalse(writeSmokeSummary.temporaryDataChanged)) {
    blockers.push('WRITE_SMOKE_TEMPORARY_DATA_NOT_CHANGED');
  }
  if (reports.writeSmoke.exists && !boolOrFalse(writeSmokeSummary.validationAcceptedSyntheticRow)) {
    blockers.push('WRITE_SMOKE_VALIDATION_DID_NOT_ACCEPT_SYNTHETIC_ROW');
  }
  if (reports.writeSmoke.exists && !boolOrFalse(writeSmokeSummary.applyWroteTempFile)) {
    blockers.push('WRITE_SMOKE_APPLY_DID_NOT_WRITE_TEMP_FILE');
  }
  if (approvedRows === 0) blockers.push('NO_APPROVED_OPERATOR_CORRECTIONS');

  const readyForWrite = blockers.length === 0;
  const warnings = [];
  if (remainingOperatorRows > 0) warnings.push(`OPERATOR_ROWS_REMAINING:${remainingOperatorRows}`);
  if (remainingValidatedRows > 0) warnings.push(`VALIDATED_ROWS_REMAINING:${remainingValidatedRows}`);
  if (previewRows === 0) warnings.push('NO_PREVIEW_ROWS');
  if (applyPlannedRows === 0) warnings.push('NO_APPLY_ROWS');

  const releaseClassification = remainingOperatorRows > 0
    ? RELEASE_CLASSIFICATION_BLOCKED_BY_OPERATOR_REVIEW
    : readyForWrite
      ? RELEASE_CLASSIFICATION_READY_FOR_OPERATOR_WRITE
      : RELEASE_CLASSIFICATION_FAIL;
  const releaseClassificationReason = releaseClassification === RELEASE_CLASSIFICATION_BLOCKED_BY_OPERATOR_REVIEW
    ? `operator approval required for ${remainingOperatorRows} row(s); source geometry must not be promoted automatically`
    : releaseClassification === RELEASE_CLASSIFICATION_READY_FOR_OPERATOR_WRITE
      ? 'operator corrections are validated and ready for the guarded write step'
      : `operator correction gate failed: ${blockers.join(', ') || 'unknown blocker'}`;

  const summary = {
    statusVersion: STATUS_VERSION,
    status: readyForWrite ? 'ready' : 'blocked',
    releaseClassification,
    releaseClassificationReason,
    readyForWrite,
    totalBlocks,
    lockedVerified,
    retraceRequired,
    operatorRequired,
    handoffTargets,
    templateRows,
    approvedRows,
    validApprovedRows,
    invalidApprovedRows,
    invalidMetadataRows,
    previewRows,
    applyPlannedRows,
    readyBatchId,
    approvedBatchCount,
    outOfOrderApprovedRows,
    remainingOperatorRows,
    remainingValidatedRows,
    alignmentStatus: reports.alignment.exists ? 'ok' : 'missing',
    validationStatus: validationSummary.status ?? '',
    previewStatus: previewSummary.status ?? '',
    applyStatus: applySummary.status ?? '',
    writeSmokeStatus: writeSmokeSummary.status ?? '',
    productionDataUnchanged: writeSmokeSummary.productionDataUnchanged ?? false,
    temporaryDataChanged: writeSmokeSummary.temporaryDataChanged ?? false,
    blockers,
    warnings,
    nextOperatorCommand: 'npm run stadium:daegu:operator-corrections',
    safeWriteCommand: 'npm run stadium:daegu:operator-corrections-write',
    postWriteGateCommand: 'npm run stadium:daegu:operator-corrections-postwrite-gate',
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    sourceReports: Object.fromEntries(
      Object.entries(reports).map(([key, sourceReport]) => [
        key,
        {
          path: sourceReport.relativePath,
          exists: sourceReport.exists,
          error: sourceReport.error,
        },
      ]),
    ),
    nextActions: readyForWrite
      ? [
        'Review daegu-seatmap-operator-corrections-preview.svg.',
        'Run npm run stadium:daegu:operator-corrections-write.',
        'Run npm run stadium:daegu:operator-corrections-postwrite-gate after write.',
      ]
      : [
        'Fill operatorDecision=APPROVED rows with operator-provided correctedPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt.',
        'Run npm run stadium:daegu:operator-corrections.',
        'Run npm run stadium:daegu:operator-corrections-apply and npm run stadium:daegu:operator-corrections-write-smoke.',
        'Run npm run stadium:daegu:operator-corrections-batches to confirm the current priority batch.',
        'Re-run this status command before production write.',
      ],
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-status.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-status.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-status.md');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'status',
      'readyForWrite',
      'totalBlocks',
      'lockedVerified',
      'handoffTargets',
      'templateRows',
      'approvedRows',
      'validApprovedRows',
      'invalidApprovedRows',
      'previewRows',
      'applyPlannedRows',
      'readyBatchId',
      'approvedBatchCount',
      'outOfOrderApprovedRows',
      'remainingOperatorRows',
      'writeSmokeStatus',
      'productionDataUnchanged',
      'blockers',
      'warnings',
    ],
    [
      summary.status,
      summary.readyForWrite,
      summary.totalBlocks,
      summary.lockedVerified,
      summary.handoffTargets,
      summary.templateRows,
      summary.approvedRows,
      summary.validApprovedRows,
      summary.invalidApprovedRows,
      summary.previewRows,
      summary.applyPlannedRows,
      summary.readyBatchId,
      summary.approvedBatchCount,
      summary.outOfOrderApprovedRows,
      summary.remainingOperatorRows,
      summary.writeSmokeStatus,
      summary.productionDataUnchanged,
      summary.blockers.join(' '),
      summary.warnings.join(' '),
    ],
  ]);
  await fs.writeFile(markdownPath, [
    '# 대구 좌석도 operator corrections status',
    '',
    `- status version: \`${STATUS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- release classification: \`${summary.releaseClassification}\``,
    `- release classification reason: ${summary.releaseClassificationReason}`,
    `- ready for write: ${summary.readyForWrite}`,
    `- total blocks: ${summary.totalBlocks}`,
    `- locked verified: ${summary.lockedVerified}`,
    `- handoff targets: ${summary.handoffTargets}`,
    `- template rows: ${summary.templateRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- preview rows: ${summary.previewRows}`,
    `- apply planned rows: ${summary.applyPlannedRows}`,
    `- ready batch: \`${summary.readyBatchId || '-'}\``,
    `- approved batch count: ${summary.approvedBatchCount}`,
    `- out-of-order approved rows: ${summary.outOfOrderApprovedRows}`,
    `- remaining operator rows: ${summary.remainingOperatorRows}`,
    `- write smoke status: \`${summary.writeSmokeStatus || 'missing'}\``,
    `- production data unchanged in write smoke: ${summary.productionDataUnchanged}`,
    `- safe write command: \`${summary.safeWriteCommand}\``,
    `- post-write gate command: \`${summary.postWriteGateCommand}\``,
    '',
    '## Gate',
    '',
    '1. `readyForWrite=true`일 때만 production write를 진행합니다.',
    '2. `NO_APPROVED_OPERATOR_CORRECTIONS`가 있으면 운영자 corrected path가 아직 없다는 뜻입니다.',
    '3. 승인 row는 한 번에 하나의 priority batch에만 있어야 하며, 이전 batch에 pending row가 남아 있으면 write하지 않습니다.',
    '4. write 전에는 preview SVG와 validation/apply/batches/status 리포트를 함께 검수합니다.',
    '5. write 후에는 alignment audit, seatmap tests, Daegu full QA를 다시 통과해야 합니다.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
    '## Source Reports',
    '',
    markdownTable(
      ['report', 'exists', 'path', 'error'],
      Object.entries(report.sourceReports).map(([key, sourceReport]) => [
        key,
        String(sourceReport.exists),
        `\`${sourceReport.path}\``,
        sourceReport.error || '-',
      ]),
    ),
    '',
    '## Next Actions',
    '',
    report.nextActions.map((action, index) => `${index + 1}. ${action}`).join('\n'),
    '',
  ].join('\n'), 'utf8');

  console.log(`corrections_status_json:${jsonPath}`);
  console.log(`corrections_status_csv:${csvPath}`);
  console.log(`corrections_status_markdown:${markdownPath}`);
  console.log(`status:${summary.status} releaseClassification=${summary.releaseClassification} readyForWrite=${summary.readyForWrite} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows} remainingOperatorRows=${summary.remainingOperatorRows}`);
};

const runOperatorCorrectionsTemplate = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
  const DECISION_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE'];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

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

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
  const handoff = await readJson(handoffPath);

  const corrections = handoff.workItems.map((row) => ({
    blockId: row.id,
    block: row.block,
    name: row.name,
    category: row.category,
    queuePriority: row.queuePriority,
    alignmentClass: row.alignmentClass,
    candidateStatus: row.candidateStatus,
    candidateDuplicateGroup: row.candidateDuplicateGroup,
    recommendedAction: row.recommendedAction,
    evidenceCrop: `reports/stadium/daegu-handoff-evidence-crops/${row.queuePriority.toLowerCase()}-${String(row.alignmentClass).toLowerCase().replaceAll('_', '-')}-${String(row.category).toLowerCase()}-${String(row.block).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}-${String(row.id).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}.png`,
    operatorDecision: 'PENDING',
    correctedPath: '',
    correctedLabelX: '',
    correctedLabelY: '',
    reviewer: '',
    reviewedAt: '',
    operatorNote: '',
  }));

  const template = {
    generatedAt: new Date().toISOString(),
    templateVersion: TEMPLATE_VERSION,
    sourceHandoff: path.relative(frontendRoot, handoffPath),
    sourceHandoffVersion: handoff.summary?.handoffVersion ?? '',
    correctionContract: {
      decisionOptions: DECISION_OPTIONS,
      nonAutomaticPromotion: true,
      coordinateSystem: {
        image: 'daegu-samsung-seatmap-official-2026.png',
        width: handoff.asset?.imageWidth,
        height: handoff.asset?.imageHeight,
        unit: 'official PNG pixel',
      },
      requiredForApproval: [
        'blockId',
        'operatorDecision=APPROVED',
        'correctedPath',
        'correctedLabelX',
        'correctedLabelY',
        'reviewer',
        'reviewedAt',
      ],
      pathRules: [
        'Use one closed SVG polygon path with M/L/Z commands.',
        'Coordinates must stay inside the official PNG bounds.',
        'correctedLabelX/correctedLabelY must be inside correctedPath.',
        'The corrected label point must top-hit the same block after simulated replacement.',
        'Duplicate candidate groups must submit separate official boundaries, not the same correctedPath.',
      ],
      validationScript: 'npm run stadium:daegu:operator-corrections-validate',
    },
    corrections,
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.md');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'blockId',
      'block',
      'name',
      'category',
      'queuePriority',
      'alignmentClass',
      'candidateStatus',
      'candidateDuplicateGroup',
      'recommendedAction',
      'evidenceCrop',
      'operatorDecision',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
    ],
    ...corrections.map((row) => [
      row.blockId,
      row.block,
      row.name,
      row.category,
      row.queuePriority,
      row.alignmentClass,
      row.candidateStatus,
      row.candidateDuplicateGroup,
      row.recommendedAction,
      row.evidenceCrop,
      row.operatorDecision,
      row.correctedPath,
      row.correctedLabelX,
      row.correctedLabelY,
      row.reviewer,
      row.reviewedAt,
      row.operatorNote,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# 대구 좌석도 operator corrections template',
    '',
    `- template version: \`${TEMPLATE_VERSION}\``,
    `- source handoff: \`${template.sourceHandoff}\``,
    `- correction rows: ${corrections.length}`,
    `- decision options: ${DECISION_OPTIONS.map((option) => `\`${option}\``).join(' ')}`,
    '- JSON: `reports/stadium/daegu-seatmap-operator-corrections-template.json`',
    '- CSV: `reports/stadium/daegu-seatmap-operator-corrections-template.csv`',
    '',
    '## Approval Contract',
    '',
    '1. `operatorDecision=APPROVED`인 행만 데이터 반영 후보가 됩니다.',
    '2. 승인 행은 `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`이 모두 필요합니다.',
    '3. `correctedPath`는 공식 PNG 픽셀 좌표계의 단일 폐합 polygon이어야 합니다.',
    '4. 승인 행은 `npm run stadium:daegu:operator-corrections-validate`를 통과해야 합니다.',
    '5. 이 템플릿은 데이터 자동 반영 파일이 아닙니다. 반영은 별도 reviewed data diff에서만 합니다.',
    '',
    '## Queue Summary',
    '',
    markdownTable(
      ['priority', 'rows'],
      ['P0', 'P1', 'P2', 'P3', 'P4'].map((priority) => [
        `\`${priority}\``,
        String(corrections.filter((row) => row.queuePriority === priority).length),
      ]),
    ),
    '',
  ].join('\n'), 'utf8');

  console.log(`corrections_template_json:${jsonPath}`);
  console.log(`corrections_template_csv:${csvPath}`);
  console.log(`corrections_template_markdown:${markdownPath}`);
  console.log(`status:ok rows=${corrections.length}`);
};

const runOperatorCorrectionsValidate = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
  const MIN_OFFICIAL_TRACE_POINTS = 6;
  const DRAFT_REVIEWER = 'DRAFT_VALIDATION_ONLY';
  const DRAFT_REVIEWED_AT = '2026-05-10T00:00:00.000Z';
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
  const REQUIRED_APPROVAL_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];

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

  const sha256File = async (filePath) => crypto
    .createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');

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

  const readInputMetadata = async (filePath) => {
    if (filePath.endsWith('.csv')) return {};
    const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return Array.isArray(parsed) ? {} : parsed;
  };

  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const normalizeBlockId = (row) => String(row.blockId ?? row.id ?? '').trim();

  const normalizePath = (pathData) => String(pathData ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const pathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const pathCommands = (pathData) => String(pathData ?? '').match(/[AaCcHhLlMmQqSsTtVvZz]/g) ?? [];

  const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0) / 2);

  const geometryPaths = (block) => (
    block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d]
  );

  const blockArea = (block) => geometryPaths(block)
    .map(pathPoints)
    .reduce((total, points) => total + polygonArea(points), 0);

  const distanceToSegment = (point, start, end) => {
    const segmentX = end[0] - start[0];
    const segmentY = end[1] - start[1];
    const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
    if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);

    const ratio = Math.max(0, Math.min(1, (
      ((point[0] - start[0]) * segmentX) + ((point[1] - start[1]) * segmentY)
    ) / lengthSquared));
    return Math.hypot(
      point[0] - (start[0] + (ratio * segmentX)),
      point[1] - (start[1] + (ratio * segmentY)),
    );
  };

  const pointOnPolygonBoundary = (point, polygon, tolerance = 0.75) => {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (distanceToSegment(point, start, end) <= tolerance) return true;
    }
    return false;
  };

  const pointInPolygon = (point, polygon) => {
    if (polygon.length < 3) return false;
    if (pointOnPolygonBoundary(point, polygon)) return true;

    const [x, y] = point;
    let inside = false;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      const [xi, yi] = polygon[current];
      const [xj, yj] = polygon[previous];
      const intersects = ((yi > y) !== (yj > y))
        && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const pointInAnyPath = (point, block) => geometryPaths(block)
    .map(pathPoints)
    .some((points) => pointInPolygon(point, points));

  const orientation = (a, b, c) => {
    const value = ((b[1] - a[1]) * (c[0] - b[0])) - ((b[0] - a[0]) * (c[1] - b[1]));
    if (Math.abs(value) < 1e-9) return 0;
    return value > 0 ? 1 : 2;
  };

  const onSegment = (a, b, c) => (
    b[0] <= Math.max(a[0], c[0])
    && b[0] >= Math.min(a[0], c[0])
    && b[1] <= Math.max(a[1], c[1])
    && b[1] >= Math.min(a[1], c[1])
  );

  const segmentsIntersect = (a, b, c, d) => {
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(a, c, b)) return true;
    if (o2 === 0 && onSegment(a, d, b)) return true;
    if (o3 === 0 && onSegment(c, a, d)) return true;
    if (o4 === 0 && onSegment(c, b, d)) return true;
    return false;
  };

  const hasSelfIntersection = (points) => {
    for (let first = 0; first < points.length; first += 1) {
      const firstNext = (first + 1) % points.length;
      for (let second = first + 1; second < points.length; second += 1) {
        const secondNext = (second + 1) % points.length;
        const adjacent = first === second
          || firstNext === second
          || secondNext === first;
        if (adjacent) continue;
        if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) {
          return true;
        }
      }
    }
    return false;
  };

  const validatePath = (pathData) => {
    const reasons = [];
    const commands = pathCommands(pathData);
    const unsupportedCommands = commands.filter((command) => !['M', 'm', 'L', 'l', 'Z', 'z'].includes(command));
    const points = pathPoints(pathData);

    if (!String(pathData ?? '').trim()) reasons.push('CORRECTED_PATH_REQUIRED');
    if (unsupportedCommands.length > 0) reasons.push(`UNSUPPORTED_PATH_COMMANDS:${[...new Set(unsupportedCommands)].join('')}`);
    if (commands.filter((command) => command.toUpperCase() === 'M').length !== 1) reasons.push('SINGLE_POLYGON_PATH_REQUIRED');
    if (!commands.some((command) => command.toUpperCase() === 'Z')) reasons.push('PATH_NOT_CLOSED');
    if (points.length < 3) reasons.push('PATH_REQUIRES_AT_LEAST_THREE_POINTS');
    if (points.length >= 3 && points.length < MIN_OFFICIAL_TRACE_POINTS) {
      reasons.push('PATH_REQUIRES_AT_LEAST_SIX_POINTS');
    }
    if (points.some((point) => !point.every(Number.isFinite))) reasons.push('PATH_HAS_NON_FINITE_COORDINATES');
    if (points.some(([x, y]) => x < 0 || y < 0 || x > DAEGU_SEATMAP_IMAGE.imageWidth || y > DAEGU_SEATMAP_IMAGE.imageHeight)) {
      reasons.push('PATH_OUTSIDE_DAEGU_IMAGE_BOUNDS');
    }
    if (points.length >= 3 && polygonArea(points) < 16) reasons.push('PATH_AREA_TOO_SMALL');
    if (points.length >= 4 && hasSelfIntersection(points)) reasons.push('PATH_SELF_INTERSECTION');

    return {
      valid: reasons.length === 0,
      reasons,
      points,
      area: points.length >= 3 ? polygonArea(points) : 0,
    };
  };

  const cloneBlockWithCorrection = (block, correction) => ({
    ...block,
    imageGeometry: {
      ...block.imageGeometry,
      d: correction.correctedPath,
      paths: undefined,
      labelX: correction.correctedLabelX,
      labelY: correction.correctedLabelY,
    },
  });

  const topHitBlockAt = (blocks, point) => {
    let topBlock = null;
    [...blocks].sort((a, b) => blockArea(b) - blockArea(a)).forEach((block) => {
      if (pointInAnyPath(point, block)) {
        topBlock = block;
      }
    });
    return topBlock;
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const inputPath = path.resolve(frontendRoot, argValue('--input', path.join('reports/stadium', 'daegu-seatmap-operator-corrections-template.json')));
  const inputSha256 = await sha256File(inputPath);
  const allowDraftMarkers = hasArg('--allow-draft-markers');
  const inputMetadata = await readInputMetadata(inputPath);
  const handoffPath = path.resolve(
    frontendRoot,
    argValue('--handoff', path.relative(frontendRoot, path.join(defaultReportDir, 'daegu-seatmap-operator-handoff.json'))),
  );
  const handoff = await readJson(handoffPath);
  const corrections = await readCorrections(inputPath);

  const handoffByBlockId = new Map(handoff.workItems.map((row) => [row.id, row]));
  const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));
  const duplicateInputBlockIds = corrections
    .map(normalizeBlockId)
    .filter(Boolean)
    .filter((blockId, index, blockIds) => blockIds.indexOf(blockId) !== index);
  const duplicateInputBlockIdSet = new Set(duplicateInputBlockIds);

  const normalizedRows = corrections.map((row) => ({
    ...row,
    blockId: normalizeBlockId(row),
    operatorDecision: String(row.operatorDecision ?? 'PENDING').trim() || 'PENDING',
    correctedPath: String(row.correctedPath ?? '').trim(),
    correctedLabelX: numberOrNull(row.correctedLabelX ?? row.labelX),
    correctedLabelY: numberOrNull(row.correctedLabelY ?? row.labelY),
    reviewer: String(row.reviewer ?? '').trim(),
    reviewedAt: String(row.reviewedAt ?? '').trim(),
  }));

  const approvedRows = normalizedRows.filter((row) => row.operatorDecision === 'APPROVED');
  const approvedByBlockId = new Map(approvedRows.map((row) => [row.blockId, row]));
  const simulationBlocks = DAEGU_BLOCKS.map((block) => {
    const correction = approvedByBlockId.get(block.id);
    return correction ? cloneBlockWithCorrection(block, correction) : block;
  });

  const correctedPathGroups = approvedRows.reduce((groups, row) => {
    const key = normalizePath(row.correctedPath);
    if (!key) return groups;
    const group = groups.get(key) ?? [];
    group.push(row.blockId);
    groups.set(key, group);
    return groups;
  }, new Map());

  const duplicateCorrectedPathByBlockId = new Map();
  correctedPathGroups.forEach((blockIds) => {
    if (blockIds.length < 2) return;
    blockIds.forEach((blockId) => duplicateCorrectedPathByBlockId.set(blockId, blockIds));
  });

  const validationRows = normalizedRows.map((row) => {
    const reasons = [];
    const warnings = [];
    const handoffRow = handoffByBlockId.get(row.blockId);
    const sourceBlock = blockById.get(row.blockId);
    const closedTerminalInputRow = !handoffRow
      && sourceBlock?.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && row.operatorDecision !== 'PENDING';

    if (!row.blockId) reasons.push('BLOCK_ID_REQUIRED');
    if (duplicateInputBlockIdSet.has(row.blockId)) reasons.push('DUPLICATE_INPUT_BLOCK_ID');
    if (!DECISION_OPTIONS.has(row.operatorDecision)) reasons.push('INVALID_OPERATOR_DECISION');
    if (!sourceBlock) reasons.push('UNKNOWN_DAEGU_BLOCK_ID');
    if (!handoffRow && !closedTerminalInputRow) reasons.push('BLOCK_NOT_IN_OPERATOR_HANDOFF');
    if (closedTerminalInputRow) warnings.push('CLOSED_TERMINAL_ROW_IGNORED_FOR_APPROVAL');

    let pathValidation = null;
    let labelInsideCorrectedPath = null;
    let correctedLabelTopHitBlockId = null;
    let correctedLabelTopHitOk = null;

    if (row.operatorDecision === 'APPROVED' && !closedTerminalInputRow) {
      REQUIRED_APPROVAL_FIELDS.forEach((field) => {
        if (field === 'correctedLabelX' || field === 'correctedLabelY') {
          if (row[field] === null) reasons.push(`${field.toUpperCase()}_REQUIRED`);
        } else if (!row[field]) {
          reasons.push(`${field.toUpperCase()}_REQUIRED`);
        }
      });

      if (row.reviewedAt && Number.isNaN(Date.parse(row.reviewedAt))) {
        reasons.push('REVIEWED_AT_NOT_PARSEABLE');
      }

      if (!allowDraftMarkers) {
        if (inputMetadata.draftOnly === true) reasons.push('DRAFT_ONLY_INPUT_NOT_ALLOWED_FOR_APPROVAL');
        if (inputMetadata.stagingOnly === true) reasons.push('STAGING_ONLY_INPUT_NOT_ALLOWED_FOR_APPROVAL');
        if (row.reviewer === DRAFT_REVIEWER) reasons.push('DRAFT_REVIEWER_NOT_ALLOWED_FOR_APPROVAL');
        if (row.reviewedAt === DRAFT_REVIEWED_AT) reasons.push('DRAFT_REVIEWED_AT_NOT_ALLOWED_FOR_APPROVAL');
      }

      pathValidation = validatePath(row.correctedPath);
      reasons.push(...pathValidation.reasons);

      if (
        pathValidation.points.length >= 3
        && row.correctedLabelX !== null
        && row.correctedLabelY !== null
      ) {
        const labelPoint = [row.correctedLabelX, row.correctedLabelY];
        labelInsideCorrectedPath = pointInPolygon(labelPoint, pathValidation.points);
        if (!labelInsideCorrectedPath) reasons.push('CORRECTED_LABEL_OUTSIDE_PATH');

        const topHit = topHitBlockAt(simulationBlocks, labelPoint);
        correctedLabelTopHitBlockId = topHit?.id ?? '';
        correctedLabelTopHitOk = topHit?.id === row.blockId;
        if (!correctedLabelTopHitOk) reasons.push('CORRECTED_LABEL_TOP_HIT_MISMATCH');
      }

      const duplicateCorrectedPathBlockIds = duplicateCorrectedPathByBlockId.get(row.blockId);
      if (duplicateCorrectedPathBlockIds) {
        reasons.push(`DUPLICATE_CORRECTED_PATH:${duplicateCorrectedPathBlockIds.join(' ')}`);
      }

      if (handoffRow?.candidateDuplicateGroup && !duplicateCorrectedPathBlockIds) {
        warnings.push('DUPLICATE_PIXEL_CANDIDATE_GROUP_REQUIRES_SEPARATE_BOUNDARY_REVIEW');
      }
    } else {
      if (row.correctedPath && !closedTerminalInputRow) warnings.push('CORRECTED_PATH_IGNORED_UNLESS_APPROVED');
    }

    return {
      blockId: row.blockId,
      block: handoffRow?.block ?? sourceBlock?.block ?? row.block ?? '',
      queuePriority: handoffRow?.queuePriority ?? row.queuePriority ?? '',
      alignmentClass: handoffRow?.alignmentClass ?? row.alignmentClass ?? '',
      operatorDecision: row.operatorDecision,
      reviewedAt: row.reviewedAt,
      reviewer: row.reviewer,
      closedTerminalInputRow,
      validForApproval: row.operatorDecision === 'APPROVED' && !closedTerminalInputRow && reasons.length === 0,
      reasons,
      warnings,
      correctedPathPointCount: pathValidation?.points.length ?? 0,
      correctedPathArea: pathValidation?.area ?? '',
      labelInsideCorrectedPath,
      correctedLabelTopHitBlockId,
      correctedLabelTopHitOk,
    };
  });

  const actionableApprovedRows = validationRows.filter((row) => row.operatorDecision === 'APPROVED' && !row.closedTerminalInputRow);
  const invalidApprovedRows = actionableApprovedRows.filter((row) => row.reasons.length > 0);
  const invalidMetadataRows = validationRows.filter((row) => row.operatorDecision !== 'APPROVED' && row.reasons.length > 0);
  const summary = {
    validationVersion: VALIDATION_VERSION,
    input: path.relative(frontendRoot, inputPath),
    inputSha256,
    allowDraftMarkers,
    inputDraftOnly: inputMetadata.draftOnly === true,
    inputStagingOnly: inputMetadata.stagingOnly === true,
    totalRows: validationRows.length,
    approvedRows: actionableApprovedRows.length,
    validApprovedRows: validationRows.filter((row) => row.validForApproval).length,
    invalidApprovedRows: invalidApprovedRows.length,
    invalidMetadataRows: invalidMetadataRows.length,
    closedTerminalInputRows: validationRows.filter((row) => row.closedTerminalInputRow).length,
    warningRows: validationRows.filter((row) => row.warnings.length > 0).length,
    status: invalidApprovedRows.length === 0 && invalidMetadataRows.length === 0 ? 'ok' : 'failed',
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    acceptanceGate: {
      nonAutomaticPromotion: true,
      requiredAfterDataDiff: 'npm run stadium:daegu:alignment-audit',
      note: 'This validator only accepts operator corrections for a later reviewed data diff. It does not modify daeguSeatData.ts.',
    },
    rows: validationRows,
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.md');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'blockId',
      'block',
      'queuePriority',
      'alignmentClass',
      'operatorDecision',
      'closedTerminalInputRow',
      'validForApproval',
      'reasons',
      'warnings',
      'correctedPathPointCount',
      'correctedPathArea',
      'labelInsideCorrectedPath',
      'correctedLabelTopHitBlockId',
      'correctedLabelTopHitOk',
      'reviewer',
      'reviewedAt',
    ],
    ...validationRows.map((row) => [
      row.blockId,
      row.block,
      row.queuePriority,
      row.alignmentClass,
      row.operatorDecision,
      row.closedTerminalInputRow,
      row.validForApproval,
      row.reasons.join(' '),
      row.warnings.join(' '),
      row.correctedPathPointCount,
      row.correctedPathArea,
      row.labelInsideCorrectedPath,
      row.correctedLabelTopHitBlockId,
      row.correctedLabelTopHitOk,
      row.reviewer,
      row.reviewedAt,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# 대구 좌석도 operator corrections validation',
    '',
    `- validation version: \`${VALIDATION_VERSION}\``,
    `- input: \`${summary.input}\``,
    `- input sha256: \`${summary.inputSha256}\``,
    `- allow draft markers: ${summary.allowDraftMarkers}`,
    `- input draft only: ${summary.inputDraftOnly}`,
    `- input staging only: ${summary.inputStagingOnly}`,
    `- status: \`${summary.status}\``,
    `- total rows: ${summary.totalRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- invalid approved rows: ${summary.invalidApprovedRows}`,
    `- invalid metadata rows: ${summary.invalidMetadataRows}`,
    `- closed terminal input rows: ${summary.closedTerminalInputRows}`,
    `- warning rows: ${summary.warningRows}`,
    '',
    '## Invalid Rows',
    '',
    invalidApprovedRows.length || invalidMetadataRows.length
      ? markdownTable(
        ['block', 'decision', 'reasons', 'warnings'],
        validationRows
          .filter((row) => row.reasons.length > 0)
          .map((row) => [
            row.block ? `\`${row.block}\`` : row.blockId,
            `\`${row.operatorDecision}\``,
            row.reasons.map((reason) => `\`${reason}\``).join('<br>'),
            row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
          ]),
      )
      : 'No invalid rows.',
    '',
    '## Approval Gate',
    '',
    '1. 이 검증은 `daeguSeatData.ts`를 수정하지 않습니다.',
    '2. `validForApproval=true`인 행만 별도 data diff에 반영할 수 있습니다.',
    '3. 승인 path는 official Daegu hit-area 계약과 동일하게 최소 6개 polygon point가 필요합니다.',
    '4. production validation은 draft/staging marker가 남은 `APPROVED` row를 차단합니다.',
    '5. P2 draft sanity 검수만 `--allow-draft-markers`를 사용할 수 있습니다.',
    '6. data diff 반영 후에는 `npm run stadium:daegu:alignment-audit`를 다시 통과해야 합니다.',
    '',
  ].join('\n'), 'utf8');

  console.log(`corrections_validation_json:${jsonPath}`);
  console.log(`corrections_validation_csv:${csvPath}`);
  console.log(`corrections_validation_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows} invalidApproved=${summary.invalidApprovedRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runOperatorCorrectionsWriteGuard = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const GUARD_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_WRITE_GUARD_V1';
  const REQUIRED_STATUS_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_STATUS_V1';

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const statusPath = path.resolve(
    frontendRoot,
    argValue('--status', path.join('reports/stadium', 'daegu-seatmap-operator-corrections-status.json')),
  );

  let statusReport = null;
  let statusReadError = '';
  try {
    statusReport = await readJson(statusPath);
  } catch (error) {
    statusReadError = error instanceof Error ? error.message : String(error);
  }

  const statusSummary = statusReport?.summary ?? {};
  const approvedRows = numberOrZero(statusSummary.approvedRows);
  const validApprovedRows = numberOrZero(statusSummary.validApprovedRows);
  const previewRows = numberOrZero(statusSummary.previewRows);
  const applyPlannedRows = numberOrZero(statusSummary.applyPlannedRows);
  const readyBatchId = String(statusSummary.readyBatchId ?? '');
  const approvedBatchCount = numberOrZero(statusSummary.approvedBatchCount);
  const outOfOrderApprovedRows = numberOrZero(statusSummary.outOfOrderApprovedRows);
  const statusBlockers = Array.isArray(statusSummary.blockers) ? statusSummary.blockers : [];
  const blockers = [];

  if (!statusReport) blockers.push(`STATUS_REPORT_UNREADABLE:${statusReadError}`);
  if (statusSummary.statusVersion !== REQUIRED_STATUS_VERSION) blockers.push('STATUS_VERSION_MISMATCH');
  if (statusSummary.status !== 'ready') blockers.push(`STATUS_NOT_READY:${statusSummary.status ?? ''}`);
  if (statusSummary.readyForWrite !== true) blockers.push('READY_FOR_WRITE_NOT_TRUE');
  if (statusBlockers.length > 0) blockers.push(`STATUS_HAS_BLOCKERS:${statusBlockers.join(' ')}`);
  if (approvedRows <= 0) blockers.push('NO_APPROVED_OPERATOR_CORRECTIONS');
  if (validApprovedRows <= 0) blockers.push('NO_VALID_APPROVED_OPERATOR_CORRECTIONS');
  if (approvedRows !== validApprovedRows) blockers.push(`APPROVED_ROWS_NOT_ALL_VALID:${approvedRows}:${validApprovedRows}`);
  if (previewRows !== approvedRows) blockers.push(`PREVIEW_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${previewRows}:${approvedRows}`);
  if (applyPlannedRows !== validApprovedRows) {
    blockers.push(`APPLY_PLANNED_ROWS_DO_NOT_MATCH_VALID_APPROVED_ROWS:${applyPlannedRows}:${validApprovedRows}`);
  }
  if (approvedRows > 0 && !readyBatchId) blockers.push('NO_READY_OPERATOR_CORRECTIONS_BATCH');
  if (approvedRows > 0 && approvedBatchCount !== 1) blockers.push(`APPROVED_ROWS_MUST_BE_SINGLE_BATCH:${approvedBatchCount}`);
  if (outOfOrderApprovedRows > 0) blockers.push(`APPROVED_ROWS_OUT_OF_PRIORITY_ORDER:${outOfOrderApprovedRows}`);
  if (statusSummary.validationStatus !== 'ok') blockers.push(`VALIDATION_STATUS_NOT_OK:${statusSummary.validationStatus ?? ''}`);
  if (statusSummary.previewStatus !== 'ok') blockers.push(`PREVIEW_STATUS_NOT_OK:${statusSummary.previewStatus ?? ''}`);
  if (statusSummary.applyStatus !== 'ok') blockers.push(`APPLY_STATUS_NOT_OK:${statusSummary.applyStatus ?? ''}`);
  if (statusSummary.writeSmokeStatus !== 'ok') blockers.push(`WRITE_SMOKE_STATUS_NOT_OK:${statusSummary.writeSmokeStatus ?? ''}`);
  if (statusSummary.productionDataUnchanged !== true) blockers.push('WRITE_SMOKE_PRODUCTION_DATA_NOT_UNCHANGED');
  if (statusSummary.temporaryDataChanged !== true) blockers.push('WRITE_SMOKE_TEMPORARY_DATA_NOT_CHANGED');

  const passed = blockers.length === 0;
  const summary = {
    guardVersion: GUARD_VERSION,
    status: passed ? 'ok' : 'blocked',
    passed,
    statusReport: path.relative(frontendRoot, statusPath),
    statusVersion: statusSummary.statusVersion ?? '',
    readyForWrite: statusSummary.readyForWrite === true,
    approvedRows,
    validApprovedRows,
    previewRows,
    applyPlannedRows,
    readyBatchId,
    approvedBatchCount,
    outOfOrderApprovedRows,
    validationStatus: statusSummary.validationStatus ?? '',
    previewStatus: statusSummary.previewStatus ?? '',
    applyStatus: statusSummary.applyStatus ?? '',
    writeSmokeStatus: statusSummary.writeSmokeStatus ?? '',
    productionDataUnchanged: statusSummary.productionDataUnchanged === true,
    temporaryDataChanged: statusSummary.temporaryDataChanged === true,
    blockers,
    statusBlockers,
    guardedWriteCommand: 'npm run stadium:daegu:operator-corrections-write',
    postWriteGateCommand: 'npm run stadium:daegu:operator-corrections-postwrite-gate',
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This guard must pass before daeguSeatData.ts can be modified by operator corrections write.',
      'The guard requires a fresh ready status report, valid approved rows, successful write-smoke, and no status blockers.',
      'If this guard is blocked, operator-corrections-write must stop before invoking apply --write.',
    ],
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-write-guard.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-write-guard.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-write-guard.md');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'status',
      'passed',
      'readyForWrite',
      'approvedRows',
      'validApprovedRows',
      'previewRows',
      'applyPlannedRows',
      'readyBatchId',
      'approvedBatchCount',
      'outOfOrderApprovedRows',
      'writeSmokeStatus',
      'productionDataUnchanged',
      'blockers',
    ],
    [
      summary.status,
      summary.passed,
      summary.readyForWrite,
      summary.approvedRows,
      summary.validApprovedRows,
      summary.previewRows,
      summary.applyPlannedRows,
      summary.readyBatchId,
      summary.approvedBatchCount,
      summary.outOfOrderApprovedRows,
      summary.writeSmokeStatus,
      summary.productionDataUnchanged,
      summary.blockers.join(' '),
    ],
  ]);
  await fs.writeFile(markdownPath, [
    '# 대구 좌석도 operator corrections write guard',
    '',
    `- guard version: \`${GUARD_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- passed: ${summary.passed}`,
    `- status report: \`${summary.statusReport}\``,
    `- ready for write: ${summary.readyForWrite}`,
    `- approved rows: ${summary.approvedRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- preview rows: ${summary.previewRows}`,
    `- apply planned rows: ${summary.applyPlannedRows}`,
    `- ready batch: \`${summary.readyBatchId || '-'}\``,
    `- approved batch count: ${summary.approvedBatchCount}`,
    `- out-of-order approved rows: ${summary.outOfOrderApprovedRows}`,
    `- write smoke status: \`${summary.writeSmokeStatus || 'missing'}\``,
    `- production data unchanged: ${summary.productionDataUnchanged}`,
    '',
    '## Gate',
    '',
    '1. 이 guard가 통과해야만 `operator-corrections-write`가 `apply --write`를 호출합니다.',
    '2. `NO_APPROVED_OPERATOR_CORRECTIONS`가 있으면 production data를 수정하지 않습니다.',
    '3. status report가 `readyForWrite=true`가 아니면 production data를 수정하지 않습니다.',
    '4. 승인 row가 단일 priority batch로 묶이지 않으면 production data를 수정하지 않습니다.',
    '5. write-smoke가 production data unchanged를 증명하지 못하면 production data를 수정하지 않습니다.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Status Blockers',
    '',
    summary.statusBlockers.length > 0
      ? summary.statusBlockers.map((blocker) => `- \`${blocker}\``).join('\n')
      : 'No status blockers.',
    '',
  ].join('\n'), 'utf8');

  console.log(`write_guard_json:${jsonPath}`);
  console.log(`write_guard_csv:${csvPath}`);
  console.log(`write_guard_markdown:${markdownPath}`);
  console.log(`status:${summary.status} passed=${summary.passed} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows}`);

  if (!passed) {
    process.exitCode = 1;
  }
};

const runOperatorCorrectionsWriteSmoke = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const WRITE_SMOKE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_WRITE_SMOKE_V1';
  const SMOKE_REVIEWER = 'DAEGU_OPERATOR_WRITE_SMOKE';
  const SMOKE_REVIEWED_AT = '2026-05-05T00:00:00.000Z';

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

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

  const pathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const geometryPaths = (block) => (
    block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d]
  );

  const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0) / 2);

  const blockArea = (block) => geometryPaths(block)
    .map(pathPoints)
    .reduce((total, points) => total + polygonArea(points), 0);

  const distanceToSegment = (point, start, end) => {
    const segmentX = end[0] - start[0];
    const segmentY = end[1] - start[1];
    const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
    if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);

    const ratio = Math.max(0, Math.min(1, (
      ((point[0] - start[0]) * segmentX) + ((point[1] - start[1]) * segmentY)
    ) / lengthSquared));
    return Math.hypot(
      point[0] - (start[0] + (ratio * segmentX)),
      point[1] - (start[1] + (ratio * segmentY)),
    );
  };

  const pointOnPolygonBoundary = (point, polygon, tolerance = 0.75) => {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (distanceToSegment(point, start, end) <= tolerance) return true;
    }
    return false;
  };

  const pointInPolygon = (point, polygon) => {
    if (polygon.length < 3) return false;
    if (pointOnPolygonBoundary(point, polygon)) return true;

    const [x, y] = point;
    let inside = false;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      const [xi, yi] = polygon[current];
      const [xj, yj] = polygon[previous];
      const intersects = ((yi > y) !== (yj > y))
        && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const pointInAnyPath = (point, block) => geometryPaths(block)
    .map(pathPoints)
    .some((points) => pointInPolygon(point, points));

  const renderBlocks = [...DAEGU_BLOCKS].sort((a, b) => blockArea(b) - blockArea(a));

  const topHitBlockAt = (point) => {
    let topBlock = null;
    renderBlocks.forEach((block) => {
      if (pointInAnyPath(point, block)) {
        topBlock = block;
      }
    });
    return topBlock;
  };

  const runNodeScript = (scriptPath, args) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', scriptPath, ...args],
      {
        cwd: frontendRoot,
        encoding: 'utf8',
      },
    );

    return {
      command: ['node', '--import', 'tsx', scriptPath, ...args].join(' '),
      status: result.status ?? 1,
      signal: result.signal ?? '',
      stdoutTail: String(result.stdout ?? '').split('\n').slice(-12).join('\n').trim(),
      stderrTail: String(result.stderr ?? '').split('\n').slice(-12).join('\n').trim(),
    };
  };

  const assertCommandOk = (commandResult) => {
    if (commandResult.status !== 0) {
      const detail = [commandResult.stdoutTail, commandResult.stderrTail].filter(Boolean).join('\n');
      throw new Error(`Smoke command failed: ${commandResult.command}\n${detail}`);
    }
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const smokeDir = path.join(reportDir, 'daegu-seatmap-operator-corrections-write-smoke');
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
  const sourceDataFile = path.join(frontendRoot, 'src/data/daeguSeatData.ts');
  const temporaryDataFile = path.join(smokeDir, 'daeguSeatData.write-smoke.ts');
  const smokeInputPath = path.join(smokeDir, 'daegu-seatmap-operator-corrections-write-smoke-input.json');
  const smokeValidationPath = path.join(smokeDir, 'daegu-seatmap-operator-corrections-validation.json');

  const handoff = await readJson(handoffPath);
  const handoffByBlockId = new Map(handoff.workItems.map((row) => [row.id, row]));
  const eligibleBlocks = DAEGU_BLOCKS.filter((block) => {
    if (!handoffByBlockId.has(block.id)) return false;
    if (block.traceStatus === 'OFFICIAL_IMAGE_TRACED') return false;
    if (block.imageGeometry.paths?.length) return false;

    const labelPoint = [block.imageGeometry.labelX, block.imageGeometry.labelY];
    return pointInAnyPath(labelPoint, block) && topHitBlockAt(labelPoint)?.id === block.id;
  });

  const smokeBlock = eligibleBlocks[0];
  if (!smokeBlock) {
    throw new Error('NO_SYNTHETIC_WRITE_SMOKE_BLOCK: no handoff block has a self-hit current label suitable for temporary write smoke');
  }

  const handoffRow = handoffByBlockId.get(smokeBlock.id);
  const syntheticSmokeCorrection = {
    blockId: smokeBlock.id,
    block: smokeBlock.block,
    name: smokeBlock.name,
    category: smokeBlock.category,
    queuePriority: handoffRow.queuePriority,
    alignmentClass: handoffRow.alignmentClass,
    candidateStatus: handoffRow.candidateStatus,
    candidateDuplicateGroup: handoffRow.candidateDuplicateGroup,
    recommendedAction: handoffRow.recommendedAction,
    evidenceCrop: '',
    operatorDecision: 'APPROVED',
    correctedPath: smokeBlock.imageGeometry.d,
    correctedLabelX: smokeBlock.imageGeometry.labelX,
    correctedLabelY: smokeBlock.imageGeometry.labelY,
    reviewer: SMOKE_REVIEWER,
    reviewedAt: SMOKE_REVIEWED_AT,
    operatorNote: 'Synthetic smoke input uses current repo geometry only to exercise the temp-file write path. Do not copy this to production corrections.',
  };

  await fs.mkdir(smokeDir, { recursive: true });
  await fs.writeFile(
    path.join(smokeDir, 'daegu-seatmap-operator-handoff.json'),
    `${JSON.stringify(handoff, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(
    smokeInputPath,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      smokeVersion: WRITE_SMOKE_VERSION,
      nonProductionSyntheticInput: true,
      corrections: [syntheticSmokeCorrection],
    }, null, 2)}\n`,
    'utf8',
  );

  const sourceDataShaBefore = await sha256File(sourceDataFile);
  await fs.copyFile(sourceDataFile, temporaryDataFile);
  const temporaryDataShaBefore = await sha256File(temporaryDataFile);

  const commandResults = [];
  commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections.mjs', [
    'operator-corrections-validate',
    '--report-dir',
    smokeDir,
    '--input',
    smokeInputPath,
  ]));
  assertCommandOk(commandResults.at(-1));
  commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections.mjs', [
    'operator-corrections-preview',
    '--report-dir',
    smokeDir,
    '--input',
    smokeInputPath,
    '--validation',
    smokeValidationPath,
  ]));
  assertCommandOk(commandResults.at(-1));
  commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections.mjs', [
    'operator-corrections-apply',
    '--report-dir',
    smokeDir,
    '--input',
    smokeInputPath,
    '--validation',
    smokeValidationPath,
    '--data-file',
    temporaryDataFile,
    '--write',
  ]));
  assertCommandOk(commandResults.at(-1));

  const sourceDataShaAfter = await sha256File(sourceDataFile);
  const temporaryDataShaAfter = await sha256File(temporaryDataFile);
  const smokeValidation = await readJson(smokeValidationPath);
  const smokeApply = await readJson(path.join(smokeDir, 'daegu-seatmap-operator-corrections-apply.json'));

  const productionDataUnchanged = sourceDataShaBefore === sourceDataShaAfter;
  const temporaryDataChanged = temporaryDataShaBefore !== temporaryDataShaAfter;
  const validationAcceptedSyntheticRow = smokeValidation.summary?.validApprovedRows === 1
    && smokeValidation.summary?.invalidApprovedRows === 0;
  const applyWroteTempFile = smokeApply.summary?.mode === 'write'
    && smokeApply.summary?.plannedRows === 1
    && smokeApply.summary?.dataFileChanged === true;

  const blockers = [];
  if (!productionDataUnchanged) blockers.push('PRODUCTION_DAEGU_DATA_CHANGED');
  if (!temporaryDataChanged) blockers.push('TEMPORARY_DATA_FILE_NOT_CHANGED');
  if (!validationAcceptedSyntheticRow) blockers.push('SYNTHETIC_ROW_NOT_VALIDATED');
  if (!applyWroteTempFile) blockers.push('APPLY_DID_NOT_WRITE_TEMP_FILE');

  const status = blockers.length === 0 ? 'ok' : 'failed';
  const summary = {
    writeSmokeVersion: WRITE_SMOKE_VERSION,
    status,
    selectedBlockId: smokeBlock.id,
    selectedBlock: smokeBlock.block,
    smokeDir: path.relative(frontendRoot, smokeDir),
    syntheticInput: path.relative(frontendRoot, smokeInputPath),
    temporaryDataFile: path.relative(frontendRoot, temporaryDataFile),
    validationReport: path.relative(frontendRoot, smokeValidationPath),
    previewReport: path.relative(frontendRoot, path.join(smokeDir, 'daegu-seatmap-operator-corrections-preview.md')),
    applyReport: path.relative(frontendRoot, path.join(smokeDir, 'daegu-seatmap-operator-corrections-apply.md')),
    productionDataUnchanged,
    temporaryDataChanged,
    validationAcceptedSyntheticRow,
    applyWroteTempFile,
    sourceDataShaBefore,
    sourceDataShaAfter,
    temporaryDataShaBefore,
    temporaryDataShaAfter,
    blockers,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    nonProductionWarning: 'This smoke test creates a synthetic approved correction from existing repo geometry and writes only a temporary copy of daeguSeatData.ts.',
    syntheticSmokeCorrection: {
      blockId: syntheticSmokeCorrection.blockId,
      block: syntheticSmokeCorrection.block,
      name: syntheticSmokeCorrection.name,
      reviewer: syntheticSmokeCorrection.reviewer,
      reviewedAt: syntheticSmokeCorrection.reviewedAt,
    },
    commandResults,
  };

  const jsonPath = path.join(smokeDir, 'daegu-seatmap-operator-corrections-write-smoke.json');
  const csvPath = path.join(smokeDir, 'daegu-seatmap-operator-corrections-write-smoke.csv');
  const markdownPath = path.join(smokeDir, 'daegu-seatmap-operator-corrections-write-smoke.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'status',
      'selectedBlockId',
      'selectedBlock',
      'productionDataUnchanged',
      'temporaryDataChanged',
      'validationAcceptedSyntheticRow',
      'applyWroteTempFile',
      'blockers',
    ],
    [
      summary.status,
      summary.selectedBlockId,
      summary.selectedBlock,
      summary.productionDataUnchanged,
      summary.temporaryDataChanged,
      summary.validationAcceptedSyntheticRow,
      summary.applyWroteTempFile,
      summary.blockers.join(' '),
    ],
  ]);
  await fs.writeFile(markdownPath, [
    '# 대구 좌석도 operator corrections write smoke',
    '',
    `- write smoke version: \`${WRITE_SMOKE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- selected block: \`${summary.selectedBlock}\``,
    `- synthetic input: \`${summary.syntheticInput}\``,
    `- temporary data file: \`${summary.temporaryDataFile}\``,
    `- validation report: \`${summary.validationReport}\``,
    `- preview report: \`${summary.previewReport}\``,
    `- apply report: \`${summary.applyReport}\``,
    `- production data unchanged: ${summary.productionDataUnchanged}`,
    `- temporary data changed: ${summary.temporaryDataChanged}`,
    `- validation accepted synthetic row: ${summary.validationAcceptedSyntheticRow}`,
    `- apply wrote temp file: ${summary.applyWroteTempFile}`,
    '',
    '## Safety Contract',
    '',
    '1. 이 smoke는 synthetic approved correction을 생성하지만 production operator correction으로 사용하지 않습니다.',
    '2. `--data-file`은 임시 복사본을 가리키며 원본 `src/data/daeguSeatData.ts`를 수정하지 않습니다.',
    '3. 원본 데이터 파일 해시가 바뀌면 `PRODUCTION_DAEGU_DATA_CHANGED`로 실패합니다.',
    '4. 실제 운영 반영은 운영자 제공 corrected path와 `npm run stadium:daegu:operator-corrections-write`만 사용합니다.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Command Results',
    '',
    markdownTable(
      ['command', 'status', 'stdout tail', 'stderr tail'],
      commandResults.map((row) => [
        `\`${row.command}\``,
        String(row.status),
        row.stdoutTail || '-',
        row.stderrTail || '-',
      ]),
    ),
    '',
  ].join('\n'), 'utf8');

  console.log(`write_smoke_json:${jsonPath}`);
  console.log(`write_smoke_csv:${csvPath}`);
  console.log(`write_smoke_markdown:${markdownPath}`);
  console.log(`status:${summary.status} selected=${summary.selectedBlock} productionDataUnchanged=${summary.productionDataUnchanged} temporaryDataChanged=${summary.temporaryDataChanged}`);

  if (status !== 'ok') {
    process.exitCode = 1;
  }
};

const runOperatorStateAudit = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const STATE_AUDIT_VERSION = 'DAEGU_OPERATOR_STATE_AUDIT_V1';
  const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
  const EXPECTED_TEMPLATE_ROWS = 97;
  const INPUT_BATCHES = [
    {
      id: 'BATCH_1_P0',
      label: 'P0',
      priorities: ['P0'],
      expectedRows: 1,
      terminalRowsMayBeClosedInTemplate: true,
      inputPath: 'reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json',
      inputPackageVersion: 'DAEGU_P0_OPERATOR_PACKAGE_V1',
      importPath: 'reports/stadium/daegu-seatmap-p0-operator-import.json',
      importVersion: 'DAEGU_P0_OPERATOR_IMPORT_V1',
    },
    {
      id: 'BATCH_2_P1',
      label: 'P1',
      priorities: ['P1'],
      expectedRows: 17,
      inputPath: 'reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json',
      inputPackageVersion: 'DAEGU_P1_OPERATOR_PACKAGE_V1',
      importPath: 'reports/stadium/daegu-seatmap-p1-operator-import.json',
      importVersion: 'DAEGU_P1_OPERATOR_IMPORT_V1',
    },
    {
      id: 'BATCH_3_P2',
      label: 'P2',
      priorities: ['P2'],
      expectedRows: 36,
      inputPath: 'reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json',
      inputPackageVersion: 'DAEGU_P2_OPERATOR_PACKAGE_V1',
      importPath: 'reports/stadium/daegu-seatmap-p2-operator-import.json',
      importVersion: 'DAEGU_P2_OPERATOR_IMPORT_V1',
    },
    {
      id: 'BATCH_4_P3_P4',
      label: 'P3/P4',
      priorities: ['P3', 'P4'],
      expectedRows: 44,
      inputPath: 'reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.json',
      inputPackageVersion: 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1',
      importPath: 'reports/stadium/daegu-seatmap-p3-p4-operator-import.json',
      importVersion: 'DAEGU_P3_P4_OPERATOR_IMPORT_V1',
    },
  ];
  const TEMPLATE_BATCHES = [
    { id: 'BATCH_1_P0', priorities: ['P0'], expectedRows: 0 },
    { id: 'BATCH_2_P1', priorities: ['P1'], expectedRows: 17 },
    { id: 'BATCH_3_P2', priorities: ['P2'], expectedRows: 36 },
    { id: 'BATCH_4_P3_P4', priorities: ['P3', 'P4'], expectedRows: 44 },
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

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

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const readJsonReport = async (filePath) => {
    try {
      return {
        path: filePath,
        relativePath: path.relative(frontendRoot, filePath),
        exists: true,
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: '',
      };
    } catch (error) {
      return {
        path: filePath,
        relativePath: path.relative(frontendRoot, filePath),
        exists: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const countDecisions = (rows) => rows.reduce((counts, row) => {
    const decision = normalizeDecision(row.operatorDecision);
    return {
      ...counts,
      [decision]: (counts[decision] ?? 0) + 1,
    };
  }, {});

  const findDuplicateIds = (rows) => rows
    .map((row) => row.blockId)
    .filter((blockId, index, blockIds) => blockIds.indexOf(blockId) !== index);

  const summarizeRows = (rows) => {
    const decisions = countDecisions(rows);
    return {
      rows: rows.length,
      pendingRows: decisions.PENDING ?? 0,
      approvedRows: decisions.APPROVED ?? 0,
      rejectedRows: decisions.REJECTED ?? 0,
      needsRetraceRows: decisions.NEEDS_RETRACE ?? 0,
      invalidRows: rows.filter((row) => !DECISION_OPTIONS.has(normalizeDecision(row.operatorDecision))).length,
    };
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const templateReport = await readJsonReport(templatePath);
  const templateRows = Array.isArray(templateReport.data?.corrections) ? templateReport.data.corrections : [];
  const templateByBlockId = new Map(templateRows.map((row) => [row.blockId, row]));
  const blockers = [];
  const warnings = [];

  if (!templateReport.exists) blockers.push(`MISSING_REPORT:${templateReport.relativePath}`);
  if (templateReport.exists && templateReport.data?.templateVersion !== TEMPLATE_VERSION) {
    blockers.push(`TEMPLATE_VERSION_MISMATCH:${templateReport.data?.templateVersion ?? ''}`);
  }
  if (templateRows.length !== EXPECTED_TEMPLATE_ROWS) {
    warnings.push(`TEMPLATE_ROW_COUNT_CHANGED_AFTER_WRITES:${templateRows.length}:${EXPECTED_TEMPLATE_ROWS}`);
  }

  const templateBatchRows = TEMPLATE_BATCHES.map((batch) => {
    const rows = templateRows.filter((row) => batch.priorities.includes(row.queuePriority));
    const summary = summarizeRows(rows);
    if (rows.length !== batch.expectedRows) {
      warnings.push(`TEMPLATE_BATCH_ROW_COUNT_CHANGED_AFTER_WRITES:${batch.id}:${rows.length}:${batch.expectedRows}`);
    }
    return {
      ...batch,
      ...summary,
    };
  });

  const firstOpenBatch = templateBatchRows.find((batch) => batch.pendingRows > 0 || batch.approvedRows > 0) ?? null;
  const inputBatchRows = [];

  for (const batch of INPUT_BATCHES) {
    const inputReport = await readJsonReport(path.join(frontendRoot, batch.inputPath));
    const importReport = await readJsonReport(path.join(frontendRoot, batch.importPath));
    const inputRows = Array.isArray(inputReport.data?.corrections) ? inputReport.data.corrections : [];
    const templateRowsForBatch = inputRows.map((row) => templateByBlockId.get(row.blockId)).filter(Boolean);
    const inputSummary = summarizeRows(inputRows);
    const templateSummary = summarizeRows(templateRowsForBatch);
    const importSummary = importReport.data?.summary ?? {};
    const rowMismatches = [];
    const pendingTemplateMismatches = [];
    const staleWriteTemplateRows = [];

    if (!inputReport.exists) blockers.push(`MISSING_REPORT:${inputReport.relativePath}`);
    if (!importReport.exists) blockers.push(`MISSING_REPORT:${importReport.relativePath}`);
    if (inputReport.exists && inputReport.data?.packageVersion !== batch.inputPackageVersion) {
      blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${batch.id}:${inputReport.data?.packageVersion ?? ''}`);
    }
    if (inputReport.exists && inputReport.data?.targetBatchId !== batch.id) {
      blockers.push(`INPUT_BATCH_MISMATCH:${batch.id}:${inputReport.data?.targetBatchId ?? ''}`);
    }
    if (inputReport.exists && inputReport.data?.draftOnly !== false) blockers.push(`INPUT_DRAFT_ONLY_NOT_FALSE:${batch.id}`);
    if (inputReport.exists && inputReport.data?.productionWriteAllowed !== false) {
      blockers.push(`INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE:${batch.id}`);
    }
    if (inputRows.length !== batch.expectedRows) {
      warnings.push(`INPUT_ROW_COUNT_CHANGED_AFTER_WRITES:${batch.id}:${inputRows.length}:${batch.expectedRows}`);
    }

    const duplicateInputIds = [...new Set(findDuplicateIds(inputRows))];
    if (duplicateInputIds.length > 0) blockers.push(`DUPLICATE_INPUT_BLOCK_ID:${batch.id}:${duplicateInputIds.join(' ')}`);
    const missingTemplateRows = inputRows.filter((row) => !templateByBlockId.has(row.blockId));
    const missingPendingTemplateRows = missingTemplateRows
      .filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
    const missingTerminalTemplateRows = missingTemplateRows
      .filter((row) => normalizeDecision(row.operatorDecision) !== 'PENDING');
    if (missingPendingTemplateRows.length > 0) {
      blockers.push(`INPUT_PENDING_ROWS_MISSING_FROM_TEMPLATE:${batch.id}:${missingPendingTemplateRows.map((row) => row.blockId).join(' ')}`);
    }
    if (missingTerminalTemplateRows.length > 0 && !batch.terminalRowsMayBeClosedInTemplate) {
      warnings.push(`INPUT_TERMINAL_ROWS_CLOSED_IN_TEMPLATE:${batch.id}:${missingTerminalTemplateRows.map((row) => row.blockId).join(' ')}`);
    }
    if (inputSummary.invalidRows > 0) blockers.push(`INVALID_OPERATOR_DECISION:${batch.id}`);

    const closedTerminalImportIds = new Set(
      Number(importSummary.closedTerminalInputRows ?? 0) > 0
        ? missingTerminalTemplateRows.map((row) => row.blockId)
        : [],
    );
    const importComparableRows = inputRows.filter((row) => !closedTerminalImportIds.has(row.blockId));
    const importComparableSummary = summarizeRows(importComparableRows);

    inputRows.forEach((inputRow) => {
      const templateRow = templateByBlockId.get(inputRow.blockId);
      if (!templateRow) return;
      const inputDecision = normalizeDecision(inputRow.operatorDecision);
      const templateDecision = normalizeDecision(templateRow.operatorDecision);
      if (inputDecision === 'PENDING' && templateDecision !== 'PENDING') {
        pendingTemplateMismatches.push(inputRow.block);
      }
      if (inputDecision !== 'PENDING' && templateDecision !== 'PENDING' && inputDecision !== templateDecision) {
        rowMismatches.push(inputRow.block);
      }
    });

    if (pendingTemplateMismatches.length > 0) {
      blockers.push(`INPUT_PENDING_TEMPLATE_NOT_PENDING:${batch.id}:${pendingTemplateMismatches.join(' ')}`);
    }
    if (rowMismatches.length > 0) {
      blockers.push(`INPUT_TEMPLATE_DECISION_MISMATCH:${batch.id}:${rowMismatches.join(' ')}`);
    }

    if (importReport.exists && importSummary.importVersion !== batch.importVersion) {
      blockers.push(`IMPORT_VERSION_MISMATCH:${batch.id}:${importSummary.importVersion ?? ''}`);
    }
    if (importReport.exists && importSummary.status !== 'ok') {
      blockers.push(`IMPORT_REPORT_STATUS_NOT_OK:${batch.id}:${importSummary.status ?? ''}`);
    }
    if (importReport.exists && !['dry-run', 'write-template'].includes(importSummary.mode)) {
      blockers.push(`IMPORT_REPORT_NOT_DRY_RUN:${batch.id}:${importSummary.mode ?? ''}`);
    }
    if (importReport.exists && Number(importSummary.importedRows ?? -1) !== importComparableRows.length) {
      blockers.push(`IMPORT_ROWS_MISMATCH:${batch.id}:${importSummary.importedRows ?? ''}:${importComparableRows.length}`);
    }
    if (importReport.exists && Number(importSummary.pendingRows ?? -1) !== importComparableSummary.pendingRows) {
      blockers.push(`IMPORT_PENDING_ROWS_MISMATCH:${batch.id}:${importSummary.pendingRows ?? ''}:${importComparableSummary.pendingRows}`);
    }
    if (importReport.exists && Number(importSummary.decidedRows ?? -1) !== importComparableRows.length - importComparableSummary.pendingRows) {
      blockers.push(`IMPORT_DECIDED_ROWS_MISMATCH:${batch.id}:${importSummary.decidedRows ?? ''}:${importComparableRows.length - importComparableSummary.pendingRows}`);
    }
    if (importReport.exists && Number(importSummary.approvedRows ?? -1) !== importComparableSummary.approvedRows) {
      blockers.push(`IMPORT_APPROVED_ROWS_MISMATCH:${batch.id}:${importSummary.approvedRows ?? ''}:${importComparableSummary.approvedRows}`);
    }
    if (importReport.exists && importSummary.productionDataChanged === true) {
      blockers.push(`IMPORT_CHANGED_PRODUCTION_DATA:${batch.id}`);
    }

    if (importReport.exists && importSummary.mode === 'write-template' && inputSummary.pendingRows > 0) {
      blockers.push(`WRITE_TEMPLATE_IMPORT_HAS_PENDING_INPUT:${batch.id}:${inputSummary.pendingRows}`);
    }
    if (importReport.exists && importSummary.mode === 'write-template' && importSummary.status === 'ok') {
      inputRows.forEach((inputRow) => {
        const templateRow = templateByBlockId.get(inputRow.blockId);
        if (!templateRow) return;
        if (normalizeDecision(inputRow.operatorDecision) !== normalizeDecision(templateRow.operatorDecision)) {
          staleWriteTemplateRows.push(inputRow.block);
        }
      });
      if (staleWriteTemplateRows.length > 0) {
        blockers.push(`STALE_WRITE_TEMPLATE_IMPORT_REPORT:${batch.id}:${staleWriteTemplateRows.join(' ')}`);
      }
    }

    inputBatchRows.push({
      batchId: batch.id,
      label: batch.label,
      priorities: batch.priorities,
      expectedRows: batch.expectedRows,
      inputRows: inputRows.length,
      inputPendingRows: inputSummary.pendingRows,
      inputApprovedRows: inputSummary.approvedRows,
      inputRejectedRows: inputSummary.rejectedRows,
      inputNeedsRetraceRows: inputSummary.needsRetraceRows,
      templateRows: templateRowsForBatch.length,
      templatePendingRows: templateSummary.pendingRows,
      templateApprovedRows: templateSummary.approvedRows,
      templateRejectedRows: templateSummary.rejectedRows,
      templateNeedsRetraceRows: templateSummary.needsRetraceRows,
      importStatus: importSummary.status ?? '',
      importMode: importSummary.mode ?? '',
      importPendingRows: Number(importSummary.pendingRows ?? 0),
      importApprovedRows: Number(importSummary.approvedRows ?? 0),
      pendingTemplateMismatches: pendingTemplateMismatches.length,
      decisionMismatches: rowMismatches.length,
      staleWriteTemplateRows: staleWriteTemplateRows.length,
    });
  }

  const firstPendingInputBatch = inputBatchRows.find((batch) => batch.inputPendingRows > 0) ?? null;
  if (firstPendingInputBatch && firstOpenBatch?.id !== firstPendingInputBatch.batchId) {
    blockers.push(`FIRST_OPEN_BATCH_DOES_NOT_MATCH_INPUT_PENDING:${firstPendingInputBatch.batchId}:${firstOpenBatch?.id ?? ''}`);
  }
  if (inputBatchRows.some((batch) => batch.inputPendingRows > 0 && batch.templatePendingRows === 0)) {
    warnings.push('INPUT_PENDING_BATCH_HAS_NO_TEMPLATE_PENDING_ROWS');
  }

  const ready = blockers.length === 0;
  const summary = {
    stateAuditVersion: STATE_AUDIT_VERSION,
    status: ready ? 'ok' : 'failed',
    ready,
    templateRows: templateRows.length,
    firstOpenBatchId: firstOpenBatch?.id ?? '',
    totalInputRows: inputBatchRows.reduce((total, batch) => total + batch.inputRows, 0),
    totalInputPendingRows: inputBatchRows.reduce((total, batch) => total + batch.inputPendingRows, 0),
    totalTemplatePendingRowsForInputs: inputBatchRows.reduce((total, batch) => total + batch.templatePendingRows, 0),
    totalPendingTemplateMismatches: inputBatchRows.reduce((total, batch) => total + batch.pendingTemplateMismatches, 0),
    totalDecisionMismatches: inputBatchRows.reduce((total, batch) => total + batch.decisionMismatches, 0),
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    sourceReports: {
      template: {
        path: templateReport.relativePath,
        exists: templateReport.exists,
        error: templateReport.error,
      },
    },
    safetyContract: [
      'P0/P1/P2/P3/P4 operator input files are the source of truth before template import.',
      'If an operator input row is PENDING, the matching main template row must also remain PENDING.',
      'Import reports must be current dry-run reports unless a guarded write-template flow has just been performed and the template decisions match the input decisions.',
      'This audit never modifies src/data/daeguSeatData.ts or promotes blocks to OFFICIAL_IMAGE_TRACED.',
    ],
    templateBatches: templateBatchRows,
    inputBatches: inputBatchRows,
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-state-audit.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-operator-state-audit.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-state-audit.md');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'batchId',
      'inputRows',
      'inputPendingRows',
      'inputApprovedRows',
      'templateRows',
      'templatePendingRows',
      'templateApprovedRows',
      'importStatus',
      'importMode',
      'pendingTemplateMismatches',
      'decisionMismatches',
      'staleWriteTemplateRows',
    ],
    ...inputBatchRows.map((row) => [
      row.batchId,
      row.inputRows,
      row.inputPendingRows,
      row.inputApprovedRows,
      row.templateRows,
      row.templatePendingRows,
      row.templateApprovedRows,
      row.importStatus,
      row.importMode,
      row.pendingTemplateMismatches,
      row.decisionMismatches,
      row.staleWriteTemplateRows,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu Operator State Audit',
    '',
    `- audit version: \`${STATE_AUDIT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- first open batch: \`${summary.firstOpenBatchId || 'none'}\``,
    `- template rows: ${summary.templateRows}`,
    `- input rows: ${summary.totalInputRows}`,
    `- input pending rows: ${summary.totalInputPendingRows}`,
    `- template pending rows for inputs: ${summary.totalTemplatePendingRowsForInputs}`,
    '',
    '## Input Batches',
    '',
    markdownTable(
      [
        'batch',
        'input',
        'input pending',
        'template pending',
        'import',
        'mode',
        'pending mismatch',
        'decision mismatch',
      ],
      inputBatchRows.map((row) => [
        `\`${row.batchId}\``,
        row.inputRows,
        row.inputPendingRows,
        row.templatePendingRows,
        `\`${row.importStatus || 'missing'}\``,
        `\`${row.importMode || 'missing'}\``,
        row.pendingTemplateMismatches,
        row.decisionMismatches,
      ]),
    ),
    '',
    '## Template Batches',
    '',
    markdownTable(
      ['batch', 'rows', 'pending', 'approved', 'rejected', 'needs retrace'],
      templateBatchRows.map((row) => [
        `\`${row.id}\``,
        row.rows,
        row.pendingRows,
        row.approvedRows,
        row.rejectedRows,
        row.needsRetraceRows,
      ]),
    ),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`operator_state_audit_json:${jsonPath}`);
  console.log(`operator_state_audit_csv:${csvPath}`);
  console.log(`operator_state_audit_markdown:${markdownPath}`);
  console.log(`status:${summary.status} firstOpenBatch=${summary.firstOpenBatchId || 'none'} inputPending=${summary.totalInputPendingRows} blockers=${summary.blockers.length}`);

  if (!ready) {
    process.exitCode = 1;
  }
};

const TASKS = {
  "operator-corrections-apply": runOperatorCorrectionsApply,
  "operator-corrections-batches": runOperatorCorrectionsBatches,
  "operator-corrections-preview": runOperatorCorrectionsPreview,
  "operator-corrections-status": runOperatorCorrectionsStatus,
  "operator-corrections-template": runOperatorCorrectionsTemplate,
  "operator-corrections-validate": runOperatorCorrectionsValidate,
  "operator-corrections-write-guard": runOperatorCorrectionsWriteGuard,
  "operator-corrections-write-smoke": runOperatorCorrectionsWriteSmoke,
  "operator-state-audit": runOperatorStateAudit,
};

export const runDaeguOperatorCorrectionsTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Daegu operator corrections task: ${task}. Available tasks: ${available}`);
  }

  const originalArgv = process.argv;
  process.argv = [originalArgv[0], originalArgv[1], ...args];
  try {
    await runner();
  } finally {
    process.argv = originalArgv;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runDaeguOperatorCorrectionsTask(task, args);
}
