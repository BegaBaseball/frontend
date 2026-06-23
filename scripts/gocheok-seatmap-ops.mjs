import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOCHEOK_OPERATOR_GATE_VERSION = 'GOCHEOK_OPERATOR_VISIT_GUIDE_GATE_V1';
const GOCHEOK_SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GOCHEOK_FRONTEND_ROOT = path.resolve(GOCHEOK_SCRIPT_DIR, '..');
const GOCHEOK_OPERATOR_REPORT_DIR = path.join(GOCHEOK_FRONTEND_ROOT, 'reports/stadium');
const GOCHEOK_OPERATOR_INPUT_FILE = 'gocheok-operator-visit-guide-input.csv';
const GOCHEOK_OPERATOR_VALIDATION_BASENAME = 'gocheok-operator-visit-guide-validation';
const GOCHEOK_OPERATOR_APPLY_PLAN_BASENAME = 'gocheok-operator-visit-guide-apply-plan';
const GOCHEOK_OPERATOR_HANDOFF_BASENAME = 'gocheok-operator-visit-guide-handoff';
const GOCHEOK_OPERATOR_TEMPLATE_BASENAME = 'gocheok-operator-visit-guide-template';
const GOCHEOK_OPERATOR_VALIDATION_JSON = 'gocheok-operator-visit-guide-validation.json';
const GOCHEOK_OPERATOR_VALIDATION_CSV = 'gocheok-operator-visit-guide-validation.csv';
const GOCHEOK_OPERATOR_VALIDATION_MARKDOWN = 'gocheok-operator-visit-guide-validation.md';
const GOCHEOK_OPERATOR_APPLY_PLAN_JSON = 'gocheok-operator-visit-guide-apply-plan.json';
const GOCHEOK_OPERATOR_APPLY_PLAN_MARKDOWN = 'gocheok-operator-visit-guide-apply-plan.md';
const GOCHEOK_OPERATOR_APPLY_PLAN_TS_FRAGMENT = 'gocheok-operator-visit-guide-apply-plan.ts-fragment';
const GOCHEOK_OPERATOR_HANDOFF_JSON = 'gocheok-operator-visit-guide-handoff.json';
const GOCHEOK_OPERATOR_HANDOFF_MARKDOWN = 'gocheok-operator-visit-guide-handoff.md';
const GOCHEOK_OPERATOR_SOURCE_FILE = path.join(GOCHEOK_FRONTEND_ROOT, 'src/data/gocheokOperatorVisitGuide.ts');

const GOCHEOK_OPERATOR_REQUIRED_COLUMNS = [
  'recordType',
  'stadium',
  'sourceDocumentId',
  'lastUpdatedAt',
  'pointId',
  'kind',
  'label',
  'blockId',
  'recommendedEntrancePointIds',
  'nearbyFacilityPointIds',
  'cautionNotes',
  'noticeId',
  'validFrom',
  'validTo',
  'priority',
  'affectedBlockIds',
  'message',
];

const GOCHEOK_OPERATOR_FACILITY_KINDS = new Set(['ENTRANCE', 'CONCESSION', 'RESTROOM', 'ELEVATOR', 'PARKING', 'TRANSIT', 'SHOP']);
const GOCHEOK_OPERATOR_SOURCE_ID_PATTERN = /^gocheok-operator-\d{8}-[a-z0-9-]+$/;
const GOCHEOK_OPERATOR_FACILITY_ID_PATTERN = /^gocheok-facility-(entrance|concession|restroom|elevator|parking|transit|shop)-[a-z0-9-]+$/;
const GOCHEOK_OPERATOR_NOTICE_ID_PATTERN = /^gocheok-operation-notice-\d{8}-[a-z0-9-]+$/;
const GOCHEOK_OPERATOR_ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GOCHEOK_OPERATOR_FORBIDDEN_PATTERN = /https?:\/\/|www\.|크롤|스크래핑|scrap|crawl|web\s*search|웹\s*검색/i;
const GOCHEOK_OPERATOR_PLACEHOLDER_PATTERN = /YYYY|YYYY-MM-DD|operator-provided|operator-block-id|operator-id|source-id|<[^>]+>/i;

const operatorArgValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const operatorHasFlag = (name) => process.argv.includes(name);

const resolveOperatorPath = (value) => path.resolve(GOCHEOK_FRONTEND_ROOT, value);

const operatorGatePaths = () => {
  const outDir = resolveOperatorPath(operatorArgValue('--out-dir', GOCHEOK_OPERATOR_REPORT_DIR));
  const inputPath = resolveOperatorPath(operatorArgValue('--input', path.join(outDir, GOCHEOK_OPERATOR_INPUT_FILE)));
  return {
    outDir,
    inputPath,
    templateJsonPath: path.join(outDir, `${GOCHEOK_OPERATOR_TEMPLATE_BASENAME}.json`),
    templateMarkdownPath: path.join(outDir, `${GOCHEOK_OPERATOR_TEMPLATE_BASENAME}.md`),
    validationJsonPath: path.join(outDir, GOCHEOK_OPERATOR_VALIDATION_JSON),
    validationCsvPath: path.join(outDir, GOCHEOK_OPERATOR_VALIDATION_CSV),
    validationMarkdownPath: path.join(outDir, GOCHEOK_OPERATOR_VALIDATION_MARKDOWN),
    applyPlanJsonPath: path.join(outDir, GOCHEOK_OPERATOR_APPLY_PLAN_JSON),
    applyPlanMarkdownPath: path.join(outDir, GOCHEOK_OPERATOR_APPLY_PLAN_MARKDOWN),
    applyPlanTsFragmentPath: path.join(outDir, GOCHEOK_OPERATOR_APPLY_PLAN_TS_FRAGMENT),
    handoffJsonPath: path.join(outDir, GOCHEOK_OPERATOR_HANDOFF_JSON),
    handoffMarkdownPath: path.join(outDir, GOCHEOK_OPERATOR_HANDOFF_MARKDOWN),
  };
};

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { header: [], rows: [] };

  const header = parseCsvLine(lines[0]).map((column) => column.trim());
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    return {
      rowNumber: index + 2,
      raw: line,
      values: Object.fromEntries(header.map((column, columnIndex) => [
        column,
        (values[columnIndex] ?? '').trim(),
      ])),
    };
  });

  return { header, rows };
}

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join(';') : String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const csvLine = (values) => values.map(csvEscape).join(',');

const splitOperatorList = (value) => String(value ?? '')
  .split(';')
  .map((item) => item.trim())
  .filter(Boolean);

const rowHasOperatorPlaceholder = (row) => Object.values(row.values)
  .filter(Boolean)
  .some((value) => GOCHEOK_OPERATOR_PLACEHOLDER_PATTERN.test(value));

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const sha256Text = async (filePath) => {
  const { createHash } = await import('node:crypto');
  const { default: fs } = await import('node:fs/promises');
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
};

function validateOperatorSourceFields(record, rowNumber, addBlocker) {
  if (!GOCHEOK_OPERATOR_SOURCE_ID_PATTERN.test(record.sourceDocumentId ?? '')) {
    addBlocker('INVALID_SOURCE_DOCUMENT_ID', `row ${rowNumber} sourceDocumentId must match gocheok-operator-YYYYMMDD-*`);
  }
  if (!GOCHEOK_OPERATOR_ISO_DATE_PATTERN.test(record.lastUpdatedAt ?? '')) {
    addBlocker('INVALID_LAST_UPDATED_AT', `row ${rowNumber} lastUpdatedAt must be YYYY-MM-DD`);
  }
  if (GOCHEOK_OPERATOR_FORBIDDEN_PATTERN.test(JSON.stringify(record))) {
    addBlocker('FORBIDDEN_OPERATOR_DATA', `row ${rowNumber} contains URL/crawling/scraping/web-search text`);
  }
}

async function validateGocheokOperatorInput({ writeReports = true } = {}) {
  const { default: fs } = await import('node:fs/promises');
  const { GOCHEOK_BLOCKS } = await import('../src/data/gocheokSeatData.ts');
  const paths = operatorGatePaths();
  const blockIds = new Set(GOCHEOK_BLOCKS.map((block) => block.id));
  const sourceSha256Before = await sha256Text(GOCHEOK_OPERATOR_SOURCE_FILE);
  let header = [];
  let rows = [];
  const blockers = [];
  const rowReports = [];
  const normalized = {
    facilityPoints: [],
    blockGuidance: [],
    operationNotices: [],
  };

  try {
    ({ header, rows } = parseCsv(await fs.readFile(paths.inputPath, 'utf8')));
  } catch (error) {
    blockers.push(`INPUT_CSV_MISSING:${path.relative(GOCHEOK_FRONTEND_ROOT, paths.inputPath)}`);
  }

  const missingColumns = GOCHEOK_OPERATOR_REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  missingColumns.forEach((column) => blockers.push(`MISSING_COLUMN:${column}`));

  const gocheokRows = rows.filter((row) => row.values.stadium === 'GOCHEOK');
  const nonGocheokRows = rows.filter((row) => row.values.stadium && row.values.stadium !== 'GOCHEOK');
  nonGocheokRows.forEach((row) => blockers.push(`NON_GOCHEOK_ROW:row ${row.rowNumber}`));

  const placeholderRows = gocheokRows.filter(rowHasOperatorPlaceholder);
  const realRows = gocheokRows.filter((row) => !rowHasOperatorPlaceholder(row));

  placeholderRows.forEach((row) => {
    rowReports.push({
      rowNumber: row.rowNumber,
      recordType: row.values.recordType || '-',
      status: 'waiting_for_operator',
      blockers: ['PLACEHOLDER_ROW'],
    });
  });

  if (placeholderRows.length > 0 && realRows.length > 0) {
    placeholderRows.forEach((row) => blockers.push(`PLACEHOLDER_ROW_PRESENT:row ${row.rowNumber}`));
  }

  const pointRowsById = new Map();
  const noticeIds = new Set();
  const guidanceBlockIds = new Set();
  const pendingBlockReferenceChecks = [];

  realRows.forEach((row) => {
    const record = row.values;
    const rowBlockers = [];
    const addBlocker = (code, detail) => {
      rowBlockers.push(code);
      blockers.push(`${code}:${detail}`);
    };

    validateOperatorSourceFields(record, row.rowNumber, addBlocker);

    if (!['facility', 'block', 'notice'].includes(record.recordType)) {
      addBlocker('INVALID_RECORD_TYPE', `row ${row.rowNumber} recordType must be facility/block/notice`);
    }

    if (record.recordType === 'facility') {
      if (!GOCHEOK_OPERATOR_FACILITY_ID_PATTERN.test(record.pointId ?? '')) {
        addBlocker('INVALID_FACILITY_POINT_ID', `row ${row.rowNumber} pointId must match gocheok-facility-*`);
      }
      if (!GOCHEOK_OPERATOR_FACILITY_KINDS.has(record.kind)) {
        addBlocker('INVALID_FACILITY_KIND', `row ${row.rowNumber} kind must be a known facility kind`);
      }
      if (record.kind && record.pointId && !record.pointId.startsWith(`gocheok-facility-${record.kind.toLowerCase()}-`)) {
        addBlocker('FACILITY_ID_KIND_MISMATCH', `row ${row.rowNumber} pointId prefix must match kind`);
      }
      if (!record.label) {
        addBlocker('MISSING_FACILITY_LABEL', `row ${row.rowNumber} facility label is required`);
      }
      if (pointRowsById.has(record.pointId)) {
        addBlocker('DUPLICATE_FACILITY_POINT_ID', `row ${row.rowNumber} duplicate pointId ${record.pointId}`);
      }

      if (rowBlockers.length === 0) {
        const point = {
          id: record.pointId,
          kind: record.kind,
          label: record.label,
          dataStatus: 'OPERATOR_PROVIDED',
          sourceDocumentId: record.sourceDocumentId,
          lastUpdatedAt: record.lastUpdatedAt,
        };
        pointRowsById.set(point.id, point);
        normalized.facilityPoints.push(point);
      }
    }

    if (record.recordType === 'block') {
      if (!blockIds.has(record.blockId)) {
        addBlocker('UNKNOWN_BLOCK_ID', `row ${row.rowNumber} blockId ${record.blockId || '-'} is not in GOCHEOK_BLOCKS`);
      }
      if (guidanceBlockIds.has(record.blockId)) {
        addBlocker('DUPLICATE_BLOCK_GUIDANCE', `row ${row.rowNumber} duplicate blockId ${record.blockId}`);
      }

      const recommendedEntrancePointIds = splitOperatorList(record.recommendedEntrancePointIds);
      const nearbyFacilityPointIds = splitOperatorList(record.nearbyFacilityPointIds);
      const cautionNotes = splitOperatorList(record.cautionNotes);
      if (rowBlockers.length === 0) {
        guidanceBlockIds.add(record.blockId);
        const guidance = {
          blockId: record.blockId,
          recommendedEntrancePointIds,
          nearbyFacilityPointIds,
          cautionNotes,
          sourceDocumentId: record.sourceDocumentId,
          lastUpdatedAt: record.lastUpdatedAt,
        };
        normalized.blockGuidance.push(guidance);
        pendingBlockReferenceChecks.push({ rowNumber: row.rowNumber, guidance });
      }
    }

    if (record.recordType === 'notice') {
      if (!GOCHEOK_OPERATOR_NOTICE_ID_PATTERN.test(record.noticeId ?? '')) {
        addBlocker('INVALID_OPERATION_NOTICE_ID', `row ${row.rowNumber} noticeId must match gocheok-operation-notice-YYYYMMDD-*`);
      }
      if (noticeIds.has(record.noticeId)) {
        addBlocker('DUPLICATE_OPERATION_NOTICE_ID', `row ${row.rowNumber} duplicate noticeId ${record.noticeId}`);
      }
      if (!GOCHEOK_OPERATOR_ISO_DATE_PATTERN.test(record.validFrom ?? '')) {
        addBlocker('INVALID_NOTICE_VALID_FROM', `row ${row.rowNumber} validFrom must be YYYY-MM-DD`);
      }
      if (!GOCHEOK_OPERATOR_ISO_DATE_PATTERN.test(record.validTo ?? '')) {
        addBlocker('INVALID_NOTICE_VALID_TO', `row ${row.rowNumber} validTo must be YYYY-MM-DD`);
      }
      if (record.validFrom && record.validTo && record.validFrom > record.validTo) {
        addBlocker('INVALID_NOTICE_DATE_RANGE', `row ${row.rowNumber} validFrom must be <= validTo`);
      }
      if (!/^-?\d+$/.test(record.priority ?? '')) {
        addBlocker('INVALID_NOTICE_PRIORITY', `row ${row.rowNumber} priority must be an integer`);
      }
      if (!record.message) {
        addBlocker('MISSING_NOTICE_MESSAGE', `row ${row.rowNumber} message is required`);
      }
      splitOperatorList(record.affectedBlockIds).forEach((blockId) => {
        if (!blockIds.has(blockId)) {
          addBlocker('UNKNOWN_NOTICE_BLOCK_ID', `row ${row.rowNumber} affectedBlockId ${blockId} is not in GOCHEOK_BLOCKS`);
        }
      });

      if (rowBlockers.length === 0) {
        noticeIds.add(record.noticeId);
        normalized.operationNotices.push({
          id: record.noticeId,
          validFrom: record.validFrom,
          validTo: record.validTo,
          priority: Number(record.priority),
          affectedBlockIds: splitOperatorList(record.affectedBlockIds),
          message: record.message,
          lastUpdatedAt: record.lastUpdatedAt,
          sourceDocumentId: record.sourceDocumentId,
        });
      }
    }

    rowReports.push({
      rowNumber: row.rowNumber,
      recordType: record.recordType || '-',
      status: rowBlockers.length === 0 ? 'valid' : 'blocked',
      blockers: rowBlockers,
    });
  });

  pendingBlockReferenceChecks.forEach(({ rowNumber, guidance }) => {
    guidance.recommendedEntrancePointIds.forEach((pointId) => {
      const point = pointRowsById.get(pointId);
      if (!point) {
        blockers.push(`MISSING_FACILITY_REFERENCE:row ${rowNumber} ${pointId}`);
      } else if (point.kind !== 'ENTRANCE') {
        blockers.push(`NON_ENTRANCE_RECOMMENDED_REFERENCE:row ${rowNumber} ${pointId}`);
      }
    });
    guidance.nearbyFacilityPointIds.forEach((pointId) => {
      const point = pointRowsById.get(pointId);
      if (!point) {
        blockers.push(`MISSING_FACILITY_REFERENCE:row ${rowNumber} ${pointId}`);
      } else if (point.kind === 'ENTRANCE') {
        blockers.push(`ENTRANCE_USED_AS_NEARBY_FACILITY:row ${rowNumber} ${pointId}`);
      }
    });
  });

  const status = blockers.length > 0
    ? 'blocked'
    : realRows.length === 0
      ? 'waiting_for_operator'
      : 'ready_for_manual_apply';
  const sourceSha256After = await sha256Text(GOCHEOK_OPERATOR_SOURCE_FILE);
  const report = {
    version: GOCHEOK_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    sourceFile: {
      path: 'src/data/gocheokOperatorVisitGuide.ts',
      sha256Before: sourceSha256Before,
      sha256After: sourceSha256After,
      unchanged: sourceSha256Before === sourceSha256After,
    },
    input: {
      path: path.relative(GOCHEOK_FRONTEND_ROOT, paths.inputPath),
      totalRows: rows.length,
      gocheokRows: gocheokRows.length,
      realRows: realRows.length,
      placeholderRows: placeholderRows.length,
      missingColumns,
    },
    sourcePolicy: {
      runtimeReadsStaticTsOnly: true,
      manualMissingContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: ['external URL', 'crawling', 'scraping', 'web-search-based baseball data'],
    },
    summary: {
      facilityPoints: normalized.facilityPoints.length,
      blockGuidance: normalized.blockGuidance.length,
      operationNotices: normalized.operationNotices.length,
      blockerCount: blockers.length,
    },
    blockers,
    rows: rowReports,
    normalizedData: status === 'ready_for_manual_apply' ? normalized : {
      facilityPoints: [],
      blockGuidance: [],
      operationNotices: [],
    },
  };

  if (writeReports) {
    await fs.mkdir(paths.outDir, { recursive: true });
    await fs.writeFile(paths.validationJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(paths.validationCsvPath, `${[
      csvLine(['rowNumber', 'recordType', 'status', 'blockers']),
      ...rowReports.map((row) => csvLine([row.rowNumber, row.recordType, row.status, row.blockers.join(';')])),
    ].join('\n')}\n`, 'utf8');
    await fs.writeFile(paths.validationMarkdownPath, [
      '# Gocheok Operator Visit Guide Validation',
      '',
      `- status: \`${status}\``,
      `- input: \`${path.relative(GOCHEOK_FRONTEND_ROOT, paths.inputPath)}\``,
      `- sourceDataWritePerformed: \`${report.sourceDataWritePerformed}\``,
      `- blockerCount: \`${blockers.length}\``,
      '',
      '## Rows',
      '',
      markdownTable(
        ['row', 'type', 'status', 'blockers'],
        rowReports.map((row) => [row.rowNumber, row.recordType, row.status, row.blockers.join(';') || '-']),
      ),
      '',
      ...(blockers.length > 0 ? ['## Blockers', '', ...blockers.map((blocker) => `- ${blocker}`), ''] : []),
    ].join('\n'), 'utf8');
  }

  return { report, paths };
}

function formatOperatorTsFragment(normalizedData, status) {
  if (status !== 'ready_for_manual_apply') {
    return [
      '// Manual apply fragment for src/data/gocheokOperatorVisitGuide.ts',
      `// status: ${status}`,
      '// No operator-provided data is ready for manual application.',
      '',
    ].join('\n');
  }

  return [
    '// Manual apply fragment for src/data/gocheokOperatorVisitGuide.ts',
    '// Review this fragment, then replace only the matching arrays in the source file.',
    '// Do not add external URLs, crawling, scraping, or web-search-derived baseball data.',
    '',
    `export const GOCHEOK_OPERATOR_FACILITY_POINTS: readonly GocheokFacilityPoint[] = ${JSON.stringify(normalizedData.facilityPoints, null, 2)};`,
    '',
    `export const GOCHEOK_BLOCK_VISIT_GUIDANCE: readonly GocheokBlockVisitGuidance[] = ${JSON.stringify(normalizedData.blockGuidance, null, 2)};`,
    '',
    `export const GOCHEOK_OPERATION_NOTICES: readonly GocheokOperationNotice[] = ${JSON.stringify(normalizedData.operationNotices, null, 2)};`,
    '',
  ].join('\n');
}

const runOperatorTemplate = async () => {
  const { default: fs } = await import('node:fs/promises');
  const paths = operatorGatePaths();
  const templatePath = path.join(GOCHEOK_FRONTEND_ROOT, 'docs/stadium/operator-visit-guide-intake-template.csv');
  const force = operatorHasFlag('--force');
  const { header, rows } = parseCsv(await fs.readFile(templatePath, 'utf8'));
  const gocheokRows = rows.filter((row) => row.values.stadium === 'GOCHEOK');
  let action = 'created';

  await fs.mkdir(paths.outDir, { recursive: true });
  try {
    await fs.access(paths.inputPath);
    if (!force) {
      action = 'preserved_existing';
    }
  } catch {
    action = 'created';
  }

  if (action === 'created' || force) {
    await fs.writeFile(paths.inputPath, `${[
      csvLine(header),
      ...gocheokRows.map((row) => csvLine(header.map((column) => row.values[column] ?? ''))),
    ].join('\n')}\n`, 'utf8');
    action = force ? 'overwritten_by_force' : action;
  }

  const report = {
    version: GOCHEOK_OPERATOR_GATE_VERSION,
    status: 'ok',
    action,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    inputPath: path.relative(GOCHEOK_FRONTEND_ROOT, paths.inputPath),
    rows: gocheokRows.length,
  };

  await fs.writeFile(paths.templateJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.templateMarkdownPath, [
    '# Gocheok Operator Visit Guide Input Template',
    '',
    `- status: \`${report.status}\``,
    `- action: \`${action}\``,
    `- input: \`${report.inputPath}\``,
    '- sourceDataWritePerformed: `false`',
    '',
    '운영자 자료가 들어오기 전 placeholder 값은 검증 단계에서 `waiting_for_operator`로 유지합니다.',
    '',
  ].join('\n'), 'utf8');

  console.log(`[gocheok-operator-template] ${action}`);
  console.log(`[gocheok-operator-template] input=${paths.inputPath}`);
  return { report, paths };
};

const runOperatorValidate = async ({ exitOnBlocked = true } = {}) => {
  const { report, paths } = await validateGocheokOperatorInput({ writeReports: true });
  console.log(`[gocheok-operator-validate] status=${report.status}`);
  console.log(`[gocheok-operator-validate] report=${paths.validationJsonPath}`);
  if (exitOnBlocked && report.status === 'blocked') {
    process.exit(1);
  }
  return { report, paths };
};

const runOperatorApplyPlan = async ({ exitOnBlocked = true } = {}) => {
  const { default: fs } = await import('node:fs/promises');
  const { report: validation, paths } = await validateGocheokOperatorInput({ writeReports: true });
  const plan = {
    version: GOCHEOK_OPERATOR_GATE_VERSION,
    status: validation.status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    sourceFile: validation.sourceFile,
    targetSourceFile: 'src/data/gocheokOperatorVisitGuide.ts',
    tsFragmentPath: path.relative(GOCHEOK_FRONTEND_ROOT, paths.applyPlanTsFragmentPath),
    validationReportPath: path.relative(GOCHEOK_FRONTEND_ROOT, paths.validationJsonPath),
    normalizedData: validation.status === 'ready_for_manual_apply' ? validation.normalizedData : {
      facilityPoints: [],
      blockGuidance: [],
      operationNotices: [],
    },
    blockers: validation.blockers,
    nextAction: validation.status === 'ready_for_manual_apply'
      ? 'Review the TS fragment and manually apply only the three operator data arrays.'
      : 'Keep MANUAL_BASEBALL_DATA_REQUIRED until operator-provided data validates.',
  };
  const fragment = formatOperatorTsFragment(plan.normalizedData, plan.status);

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.applyPlanJsonPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.applyPlanTsFragmentPath, fragment, 'utf8');
  await fs.writeFile(paths.applyPlanMarkdownPath, [
    '# Gocheok Operator Visit Guide Apply Plan',
    '',
    `- status: \`${plan.status}\``,
    `- sourceDataWritePerformed: \`${plan.sourceDataWritePerformed}\``,
    `- target source file: \`${plan.targetSourceFile}\``,
    `- TS fragment: \`${plan.tsFragmentPath}\``,
    `- next action: ${plan.nextAction}`,
    '',
    '## Summary',
    '',
    `- facility points: ${plan.normalizedData.facilityPoints.length}`,
    `- block guidance rows: ${plan.normalizedData.blockGuidance.length}`,
    `- operation notices: ${plan.normalizedData.operationNotices.length}`,
    '',
    ...(plan.blockers.length > 0 ? ['## Blockers', '', ...plan.blockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[gocheok-operator-apply-plan] status=${plan.status}`);
  console.log(`[gocheok-operator-apply-plan] report=${paths.applyPlanJsonPath}`);
  if (exitOnBlocked && plan.status === 'blocked') {
    process.exit(1);
  }
  return { report: plan, paths };
};

const runOperatorHandoff = async ({ exitOnBlocked = true } = {}) => {
  const { default: fs } = await import('node:fs/promises');
  const paths = operatorGatePaths();
  const readJson = async (filePath) => {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch {
      return null;
    }
  };
  const template = await readJson(paths.templateJsonPath);
  const validation = await readJson(paths.validationJsonPath);
  const applyPlan = await readJson(paths.applyPlanJsonPath);
  const missingInputs = [
    ['template', template, paths.templateJsonPath],
    ['validation', validation, paths.validationJsonPath],
    ['applyPlan', applyPlan, paths.applyPlanJsonPath],
  ].filter(([, value]) => !value);
  const status = missingInputs.length > 0
    ? 'blocked'
    : validation.status === 'blocked' || applyPlan.status === 'blocked'
      ? 'blocked'
      : validation.status === 'ready_for_manual_apply' && applyPlan.status === 'ready_for_manual_apply'
        ? 'ready_for_manual_apply'
        : 'waiting_for_operator';
  const blockers = [
    ...missingInputs.map(([label, , filePath]) => `MISSING_${label.toUpperCase()}_REPORT:${path.relative(GOCHEOK_FRONTEND_ROOT, filePath)}`),
    ...(validation?.blockers ?? []),
    ...(applyPlan?.blockers ?? []),
  ];
  const handoff = {
    version: GOCHEOK_OPERATOR_GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    sourceDataWritePerformed: false,
    reports: {
      template: path.relative(GOCHEOK_FRONTEND_ROOT, paths.templateJsonPath),
      validation: path.relative(GOCHEOK_FRONTEND_ROOT, paths.validationJsonPath),
      applyPlan: path.relative(GOCHEOK_FRONTEND_ROOT, paths.applyPlanJsonPath),
      tsFragment: path.relative(GOCHEOK_FRONTEND_ROOT, paths.applyPlanTsFragmentPath),
    },
    summary: {
      validationStatus: validation?.status ?? null,
      applyPlanStatus: applyPlan?.status ?? null,
      facilityPoints: applyPlan?.normalizedData?.facilityPoints?.length ?? 0,
      blockGuidance: applyPlan?.normalizedData?.blockGuidance?.length ?? 0,
      operationNotices: applyPlan?.normalizedData?.operationNotices?.length ?? 0,
      blockerCount: blockers.length,
    },
    blockers,
    nextAction: status === 'ready_for_manual_apply'
      ? 'Review and manually apply the generated TS fragment.'
      : 'Collect operator-provided Gocheok entrance/facility/operation data and rerun operator-intake.',
  };

  await fs.mkdir(paths.outDir, { recursive: true });
  await fs.writeFile(paths.handoffJsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  await fs.writeFile(paths.handoffMarkdownPath, [
    '# Gocheok Operator Visit Guide Handoff',
    '',
    `- status: \`${handoff.status}\``,
    `- sourceDataWritePerformed: \`${handoff.sourceDataWritePerformed}\``,
    `- validation: \`${handoff.summary.validationStatus ?? 'missing'}\``,
    `- apply plan: \`${handoff.summary.applyPlanStatus ?? 'missing'}\``,
    `- TS fragment: \`${handoff.reports.tsFragment}\``,
    `- next action: ${handoff.nextAction}`,
    '',
    ...(blockers.length > 0 ? ['## Blockers', '', ...blockers.map((blocker) => `- ${blocker}`), ''] : []),
  ].join('\n'), 'utf8');

  console.log(`[gocheok-operator-handoff] status=${handoff.status}`);
  console.log(`[gocheok-operator-handoff] report=${paths.handoffJsonPath}`);
  if (exitOnBlocked && handoff.status === 'blocked') {
    process.exit(1);
  }
  return { report: handoff, paths };
};

const runOperatorIntake = async () => {
  await runOperatorTemplate();
  const validation = await runOperatorValidate({ exitOnBlocked: false });
  await runOperatorApplyPlan({ exitOnBlocked: false });
  const handoff = await runOperatorHandoff({ exitOnBlocked: false });
  if (validation.report.status === 'blocked' || handoff.report.status === 'blocked') {
    process.exit(1);
  }
};

const runPixelComponents = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { default: zlib } = await import("node:zlib");
  const { fileURLToPath } = await import("node:url");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');
  const imagePath = path.join(
    frontendRoot,
    'src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.webp',
  );

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const reportPath = path.join(outDir, 'gocheok-seatmap-pixel-components.json');

  const colorRanges = [
    {
      name: 'TABLE',
      label: '테이블석',
      minArea: 300,
      test: (r, g, b) => r < 105 && g < 125 && b > 30 && b > r + 10 && b > g - 25,
    },
    {
      name: 'DIAMOND',
      label: '다이아몬드석',
      minArea: 80,
      test: (r, g, b) => r >= 150 && r <= 255 && g >= 35 && g <= 155 && b >= 80 && b <= 215,
    },
    {
      name: 'SKY_BLUE',
      label: '스카이블루석',
      minArea: 80,
      test: (r, g, b) => r >= 0 && r <= 125 && g >= 105 && g <= 230 && b >= 115 && b <= 255 && b > r + 35 && g > r + 35,
    },
    {
      name: 'BURGUNDY',
      label: '버건디석',
      minArea: 50,
      test: (r, g, b) => r >= 65 && r <= 225 && g <= 125 && b <= 160 && r > g + 15 && r > b + 10,
    },
    {
      name: 'GOLD',
      label: '골드 내야석',
      minArea: 140,
      test: (r, g, b) => r >= 185 && g >= 105 && g <= 210 && b <= 105,
    },
    {
      name: 'OUTFIELD',
      label: '외야 지정석',
      minArea: 50,
      test: (r, g, b) => r >= 55 && r <= 235 && g >= 85 && g <= 245 && b <= 185 && g > b + 5 && r + b < 385,
    },
  ];

  function paethPredictor(left, up, upLeft) {
    const p = left + up - upLeft;
    const pa = Math.abs(p - left);
    const pb = Math.abs(p - up);
    const pc = Math.abs(p - upLeft);
    if (pa <= pb && pa <= pc) return left;
    if (pb <= pc) return up;
    return upLeft;
  }

  async function decodePng(filePath) {
    const buffer = await fs.readFile(filePath);
    const signature = buffer.subarray(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a') {
      throw new Error(`Not a PNG file: ${filePath}`);
    }

    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    let interlace = 0;
    const idatChunks = [];

    while (offset < buffer.length) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
      const data = buffer.subarray(offset + 8, offset + 8 + length);
      offset += length + 12;

      if (type === 'IHDR') {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
        interlace = data[12];
      } else if (type === 'IDAT') {
        idatChunks.push(data);
      } else if (type === 'IEND') {
        break;
      }
    }

    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
    if (bitDepth !== 8 || channels === 0 || interlace !== 0) {
      throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}`);
    }

    const stride = width * channels;
    const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
    const decoded = Buffer.alloc(width * height * channels);
    let sourceOffset = 0;
    let previous = Buffer.alloc(stride);

    for (let y = 0; y < height; y += 1) {
      const filter = inflated[sourceOffset];
      sourceOffset += 1;
      const row = Buffer.from(inflated.subarray(sourceOffset, sourceOffset + stride));
      sourceOffset += stride;

      for (let index = 0; index < stride; index += 1) {
        const left = index >= channels ? row[index - channels] : 0;
        const up = previous[index];
        const upLeft = index >= channels ? previous[index - channels] : 0;
        if (filter === 1) row[index] = (row[index] + left) & 0xff;
        else if (filter === 2) row[index] = (row[index] + up) & 0xff;
        else if (filter === 3) row[index] = (row[index] + Math.floor((left + up) / 2)) & 0xff;
        else if (filter === 4) row[index] = (row[index] + paethPredictor(left, up, upLeft)) & 0xff;
        else if (filter !== 0) throw new Error(`Unsupported PNG row filter: ${filter}`);
      }

      row.copy(decoded, y * stride);
      previous = row;
    }

    return { width, height, channels, data: decoded };
  }

  function convexHull(points) {
    const sorted = [...new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values()]
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length <= 1) return sorted;

    const cross = (origin, a, b) => (
      (a[0] - origin[0]) * (b[1] - origin[1])
      - (a[1] - origin[1]) * (b[0] - origin[0])
    );
    const lower = [];
    for (const point of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop();
      }
      lower.push(point);
    }

    const upper = [];
    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      const point = sorted[index];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
        upper.pop();
      }
      upper.push(point);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  function connectedComponents(mask, width, height, minArea) {
    const seen = new Uint8Array(width * height);
    const components = [];
    const queue = [];

    for (let start = 0; start < mask.length; start += 1) {
      if (!mask[start] || seen[start]) continue;

      let area = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      const boundaryPoints = [];
      queue.length = 0;
      queue.push(start);
      seen[start] = 1;

      while (queue.length > 0) {
        const current = queue.pop();
        const x = current % width;
        const y = Math.floor(current / width);
        area += 1;
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        const neighbors = [
          x > 0 ? current - 1 : -1,
          x < width - 1 ? current + 1 : -1,
          y > 0 ? current - width : -1,
          y < height - 1 ? current + width : -1,
        ];
        if (neighbors.some((next) => next < 0 || !mask[next])) {
          boundaryPoints.push([x, y]);
        }
        for (const next of neighbors) {
          if (next < 0 || seen[next] || !mask[next]) continue;
          seen[next] = 1;
          queue.push(next);
        }
      }

      if (area >= minArea) {
        components.push({
          area,
          bbox: { minX, minY, maxX, maxY },
          center: {
            x: Number((sumX / area).toFixed(1)),
            y: Number((sumY / area).toFixed(1)),
          },
          hull: convexHull(boundaryPoints),
        });
      }
    }

    components.sort((a, b) => b.area - a.area);
    return components;
  }

  const image = await decodePng(imagePath);
  const report = {
    generatedAt: new Date().toISOString(),
    image: {
      source: path.relative(frontendRoot, imagePath),
      width: image.width,
      height: image.height,
    },
    ranges: {},
  };

  for (const range of colorRanges) {
    const mask = new Uint8Array(image.width * image.height);
    for (let index = 0; index < image.width * image.height; index += 1) {
      const offset = index * image.channels;
      const r = image.data[offset];
      const g = image.data[offset + 1];
      const b = image.data[offset + 2];
      const a = image.channels === 4 ? image.data[offset + 3] : 255;
      if (a > 200 && range.test(r, g, b)) {
        mask[index] = 1;
      }
    }

    report.ranges[range.name] = {
      label: range.label,
      minArea: range.minArea,
      components: connectedComponents(mask, image.width, image.height, range.minArea).slice(0, 120),
    };
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`pixel_components:${reportPath}`);
};

const runTraceManifest = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { GOCHEOK_BLOCKS, GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS, GOCHEOK_OMITTED_OFFICIAL_BLOCKS, GOCHEOK_SEATMAP_IMAGE, GOCHEOK_TRACE_REVIEW_REGIONS, GOCHEOK_TRACE_REVIEWED_BLOCK_IDS } = await import("../src/data/gocheokSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const pixelComponentsPath = path.join(outDir, 'gocheok-seatmap-pixel-components.json');

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

  const readJsonIfExists = async (filePath) => {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  };

  const pathBounds = (pathData) => {
    const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const xs = [];
    const ys = [];
    for (let index = 0; index < numbers.length; index += 2) {
      xs.push(numbers[index]);
      ys.push(numbers[index + 1]);
    }
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  };

  const hullPath = (hull) => {
    if (!Array.isArray(hull) || hull.length === 0) return '';
    return `M ${hull.map((point) => point.join(' ')).join(' L ')} Z`;
  };

  const reviewRegionByBlockId = new Map();
  GOCHEOK_TRACE_REVIEW_REGIONS.forEach((region) => {
    region.blockIds.forEach((blockId) => {
      reviewRegionByBlockId.set(blockId, region);
    });
  });

  const reviewedIds = new Set(GOCHEOK_TRACE_REVIEWED_BLOCK_IDS);
  const todoIds = new Set(GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS);
  const pixelComponents = await readJsonIfExists(pixelComponentsPath);

  const nearestCandidateForBlock = (block) => {
    const components = pixelComponents?.ranges?.[block.category]?.components ?? [];
    if (components.length === 0) return null;

    return components
      .map((component) => ({
        component,
        distance: Math.hypot(
          component.center.x - block.imageGeometry.labelX,
          component.center.y - block.imageGeometry.labelY,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)[0] ?? null;
  };

  const blockRows = GOCHEOK_BLOCKS.map((block) => {
    const region = reviewRegionByBlockId.get(block.id);
    const candidate = nearestCandidateForBlock(block);
    const bounds = pathBounds(block.imageGeometry.d);

    return {
      id: block.id,
      block: block.block,
      name: block.name,
      category: block.category,
      level: block.level,
      side: block.side,
      fanRole: block.fanRole,
      reviewRegionId: region?.id ?? 'UNASSIGNED',
      tracePriority: region?.priority ?? 'P5',
      traceMethod: region?.method ?? 'MANUAL_REVIEW_REQUIRED',
      traceStatus: todoIds.has(block.id) ? 'TODO' : reviewedIds.has(block.id) ? 'REVIEWED' : 'PENDING',
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      label: block.imageGeometry.shortLabel,
      pathBounds: bounds,
      path: block.imageGeometry.d,
      candidateDistance: candidate ? Number(candidate.distance.toFixed(1)) : null,
      candidateArea: candidate?.component.area ?? null,
      candidateCenter: candidate?.component.center ?? null,
      candidateBbox: candidate?.component.bbox ?? null,
      candidateHullPath: hullPath(candidate?.component.hull),
    };
  });

  const regionRows = GOCHEOK_TRACE_REVIEW_REGIONS.map((region) => {
    const activeBlockCount = region.blockIds.filter((id) => GOCHEOK_BLOCKS.some((block) => block.id === id)).length;
    const reviewedBlockCount = region.blockIds.filter((id) => reviewedIds.has(id)).length;
    const todoBlockCount = region.blockIds.filter((id) => todoIds.has(id)).length;
    return {
      id: region.id,
      label: region.label,
      priority: region.priority,
      method: region.method,
      activeBlockCount,
      reviewedBlockCount,
      todoBlockCount,
      note: region.note,
    };
  });

  const summary = {
    totalBlocks: GOCHEOK_BLOCKS.length,
    reviewedBlocks: GOCHEOK_TRACE_REVIEWED_BLOCK_IDS.length,
    todoBlocks: GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS.length,
    omittedOfficialBlocks: GOCHEOK_OMITTED_OFFICIAL_BLOCKS.length,
    pendingBlocks: blockRows.filter((row) => row.traceStatus === 'PENDING').length,
    regions: regionRows.length,
    pixelComponentsAvailable: Boolean(pixelComponents),
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    asset: GOCHEOK_SEATMAP_IMAGE,
    summary,
    reviewRegions: regionRows,
    manualTodoBlockIds: GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS,
    omittedOfficialBlocks: GOCHEOK_OMITTED_OFFICIAL_BLOCKS,
    reviewedBlockIds: GOCHEOK_TRACE_REVIEWED_BLOCK_IDS,
    blocks: blockRows,
  };

  const omittedOfficialBlocksTable = GOCHEOK_OMITTED_OFFICIAL_BLOCKS.length > 0
    ? [
        '## 제외된 공식/합성 블록',
        '',
        markdownTable(
          ['block', 'reason', 'review note'],
          GOCHEOK_OMITTED_OFFICIAL_BLOCKS.map((entry) => [
            `\`${entry.block}\``,
            entry.reason,
            entry.reviewNote,
          ]),
        ),
        '',
      ]
    : [];

  const markdown = [
    '# 고척 스카이돔 좌석도 hit-area trace review manifest',
    '',
    `- 공식 이미지: \`${GOCHEOK_SEATMAP_IMAGE.requiredAssetFileName}\` (${GOCHEOK_SEATMAP_IMAGE.imageWidth}x${GOCHEOK_SEATMAP_IMAGE.imageHeight})`,
    `- image sha256: \`${GOCHEOK_SEATMAP_IMAGE.imageSha256}\``,
    `- total blocks: ${summary.totalBlocks}`,
    `- reviewed blocks: ${summary.reviewedBlocks}`,
    `- pending blocks: ${summary.pendingBlocks}`,
    `- manual TODO blocks: ${summary.todoBlocks || '-'}`,
    `- omitted official/synthetic blocks: ${GOCHEOK_OMITTED_OFFICIAL_BLOCKS.map((entry) => entry.block).join(', ') || '-'}`,
    `- pixel candidates: ${summary.pixelComponentsAvailable ? '`READY`' : '`MISSING`'}`,
    '',
    '## 검수 구역',
    '',
    markdownTable(
      ['id', 'label', 'priority', 'method', 'active', 'reviewed', 'todo', 'note'],
      regionRows.map((region) => [
        `\`${region.id}\``,
        region.label,
        region.priority,
        region.method,
        String(region.activeBlockCount),
        String(region.reviewedBlockCount),
        String(region.todoBlockCount),
        region.note,
      ]),
    ),
    '',
    ...omittedOfficialBlocksTable,
    '## 사용 방법',
    '',
    '1. `node scripts/stadium-seatmap-ops.mjs gocheok trace-review`를 실행해 manifest, evidence crop, debug overlay screenshot을 생성합니다.',
    '2. CSV의 `candidateHullPath`와 현재 `path`를 비교하고, 공식 이미지 경계가 불명확하면 TODO에 남깁니다.',
    '3. 승인된 블록만 `GOCHEOK_TRACE_REVIEWED_BLOCK_IDS`에 추가합니다.',
    '4. `node scripts/stadium-seatmap-ops.mjs gocheok evidence`로 주요 crop overlay 증빙을 갱신합니다.',
    '5. 좌표 변경 후 `node --import tsx --test src/data/gocheokSeatData.test.ts`로 overlap/bounds/self-intersection을 확인합니다.',
    '',
  ].join('\n');

  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'gocheok-seatmap-trace-review.json');
  const csvPath = path.join(outDir, 'gocheok-seatmap-trace-review.csv');
  const markdownPath = path.join(outDir, 'gocheok-seatmap-trace-review.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'block',
      'name',
      'category',
      'level',
      'side',
      'fanRole',
      'reviewRegionId',
      'tracePriority',
      'traceMethod',
      'traceStatus',
      'labelX',
      'labelY',
      'label',
      'pathBounds',
      'path',
      'candidateDistance',
      'candidateArea',
      'candidateCenter',
      'candidateBbox',
      'candidateHullPath',
    ],
    ...blockRows.map((block) => [
      block.id,
      block.block,
      block.name,
      block.category,
      block.level,
      block.side,
      block.fanRole,
      block.reviewRegionId,
      block.tracePriority,
      block.traceMethod,
      block.traceStatus,
      block.labelX,
      block.labelY,
      block.label,
      JSON.stringify(block.pathBounds),
      block.path,
      block.candidateDistance ?? '',
      block.candidateArea ?? '',
      block.candidateCenter ? JSON.stringify(block.candidateCenter) : '',
      block.candidateBbox ? JSON.stringify(block.candidateBbox) : '',
      block.candidateHullPath,
    ]),
  ]);
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`manifest_json:${jsonPath}`);
  console.log(`manifest_csv:${csvPath}`);
  console.log(`manifest_markdown:${markdownPath}`);
  console.log(`status:ok total=${summary.totalBlocks} reviewed=${summary.reviewedBlocks} pending=${summary.pendingBlocks} todo=${summary.todoBlocks}`);
};

const runEvidence = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { GOCHEOK_BLOCKS, GOCHEOK_CATEGORIES, GOCHEOK_OMITTED_OFFICIAL_BLOCKS, GOCHEOK_SEATMAP_IMAGE } = await import("../src/data/gocheokSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const imagePath = path.join(frontendRoot, GOCHEOK_SEATMAP_IMAGE.imagePath);
  const blocksById = new Map(GOCHEOK_BLOCKS.map((block) => [block.id, block]));

  const rangeBlockIds = (start, end) => (
    Array.from({ length: end - start + 1 }, (_, index) => `gocheok-${start + index}`)
  );

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const pathBounds = (pathData) => {
    const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const xs = [];
    const ys = [];
    for (let index = 0; index < numbers.length; index += 2) {
      xs.push(numbers[index]);
      ys.push(numbers[index + 1]);
    }
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  };

  const intersectsCrop = (bounds, crop) => (
    bounds.maxX >= crop.x
    && bounds.minX <= crop.x + crop.width
    && bounds.maxY >= crop.y
    && bounds.minY <= crop.y + crop.height
  );

  const containsBounds = (bounds, crop) => (
    bounds.minX >= crop.x
    && bounds.maxX <= crop.x + crop.width
    && bounds.minY >= crop.y
    && bounds.maxY <= crop.y + crop.height
  );

  const crops = [
    {
      id: 'top-outfield',
      title: '323-334 and 425-435 top outfield',
      x: 130,
      y: 65,
      width: 420,
      height: 155,
      blockIds: [
        ...rangeBlockIds(323, 334),
        ...rangeBlockIds(425, 435),
      ],
    },
    {
      id: 'right-outfield-335-review',
      title: 'Right outfield 335 omission review',
      x: 420,
      y: 95,
      width: 160,
      height: 150,
      blockIds: [
        'gocheok-334',
        'gocheok-435',
        'gocheok-220',
        'gocheok-221',
        'gocheok-222',
      ],
      note: `Omitted: ${GOCHEOK_OMITTED_OFFICIAL_BLOCKS.map((entry) => entry.block).join(', ') || '-'}`,
    },
    {
      id: 'anchor-overview',
      title: 'Anchor blocks 101/114/401/424/430/412',
      x: 20,
      y: 95,
      width: 610,
      height: 780,
      blockIds: [
        'gocheok-101',
        'gocheok-114',
        'gocheok-401',
        'gocheok-424',
        'gocheok-430',
        'gocheok-412',
      ],
    },
  ];

  const expectedCropIds = new Set(['top-outfield', 'right-outfield-335-review', 'anchor-overview']);
  if (crops.length !== expectedCropIds.size || crops.some((crop) => !expectedCropIds.has(crop.id))) {
    throw new Error(`Unexpected Gocheok evidence crop set: ${crops.map((crop) => crop.id).join(', ')}`);
  }

  const buildOverlaySvg = (crop, blocks) => {
    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
    <style>
      .label { font: 700 9px Arial, sans-serif; text-anchor: middle; dominant-baseline: central; fill: #020617; stroke: #ffffff; stroke-width: 2px; paint-order: stroke; }
    </style>
    <rect x="${crop.x + 1}" y="${crop.y + 1}" width="${crop.width - 2}" height="${crop.height - 2}" fill="none" stroke="#0f172a" stroke-width="2" />
    ${blocks.map((block) => {
      const category = GOCHEOK_CATEGORIES[block.category];
      const color = category?.light ?? '#38bdf8';
      return `
    <path d="${xmlEscape(block.imageGeometry.d)}" fill="${color}" fill-opacity="0.38" stroke="#0f172a" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    <text class="label" x="${block.imageGeometry.labelX}" y="${block.imageGeometry.labelY}">${xmlEscape(block.imageGeometry.shortLabel)}</text>`;
    }).join('')}
  </svg>`;
  };

  const buildHeaderSvg = (crop, headerHeight) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${headerHeight}" viewBox="0 0 ${crop.width} ${headerHeight}">
    <rect x="0" y="0" width="${crop.width}" height="${headerHeight}" fill="#f8fafc" />
    <text x="8" y="17" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${xmlEscape(crop.title)}</text>
    ${crop.note ? `<text x="8" y="33" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#be123c">${xmlEscape(crop.note)}</text>` : ''}
  </svg>`;

  await fs.mkdir(outDir, { recursive: true });

  const metadata = await sharp(imagePath).metadata();
  if (metadata.width !== GOCHEOK_SEATMAP_IMAGE.imageWidth || metadata.height !== GOCHEOK_SEATMAP_IMAGE.imageHeight) {
    throw new Error(`Unexpected Gocheok image size: ${metadata.width}x${metadata.height}`);
  }

  const outputs = [];

  for (const crop of crops) {
    const blocks = crop.blockIds
      .map((id) => blocksById.get(id))
      .filter(Boolean)
      .filter((block) => intersectsCrop(pathBounds(block.imageGeometry.d), crop));
    const missingBlockIds = crop.blockIds.filter((id) => !blocksById.has(id));
    if (missingBlockIds.length > 0) {
      throw new Error(`${crop.id} evidence crop references missing blocks: ${missingBlockIds.join(', ')}`);
    }
    if (blocks.length === 0) {
      throw new Error(`${crop.id} evidence crop did not include any visible hit-area paths`);
    }
    const clippedBlockIds = blocks
      .filter((block) => !containsBounds(pathBounds(block.imageGeometry.d), crop))
      .map((block) => block.id);
    if (clippedBlockIds.length > 0) {
      throw new Error(`${crop.id} evidence crop clips hit-area paths: ${clippedBlockIds.join(', ')}`);
    }

    const overlay = Buffer.from(buildOverlaySvg(crop, blocks));
    const headerHeight = crop.note ? 42 : 26;
    const header = Buffer.from(buildHeaderSvg(crop, headerHeight));
    const outputPath = path.join(outDir, `gocheok-evidence-${crop.id}.png`);

    const cropBuffer = await sharp(imagePath)
      .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
      .composite([{ input: overlay, left: 0, top: 0 }])
      .png()
      .toBuffer();

    await sharp(cropBuffer)
      .extend({ top: headerHeight, background: '#f8fafc' })
      .composite([{ input: header, left: 0, top: 0 }])
      .png()
      .toFile(outputPath);

    outputs.push({
      id: crop.id,
      title: crop.title,
      path: outputPath,
      crop: {
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
      },
      headerHeight,
      blockIds: blocks.map((block) => block.id),
      missingBlockIds,
      omittedOfficialBlocks: GOCHEOK_OMITTED_OFFICIAL_BLOCKS,
    });
  }

  const reportPath = path.join(outDir, 'gocheok-seatmap-evidence-crops.json');
  await fs.writeFile(reportPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    asset: GOCHEOK_SEATMAP_IMAGE,
    outputs,
  }, null, 2)}\n`, 'utf8');

  outputs.forEach((output) => {
    console.log(`evidence_${output.id}:${output.path}`);
  });
  console.log(`evidence_report:${reportPath}`);
};

const runReleaseGate = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const {
    GOCHEOK_BLOCKS,
    GOCHEOK_SEATMAP_IMAGE,
    GOCHEOK_TRACE_REVIEWED_BLOCK_IDS,
    GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS,
    GOCHEOK_OMITTED_OFFICIAL_BLOCKS,
  } = await import('../src/data/gocheokSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const reportJsonPath = path.join(reportDir, 'gocheok-seatmap-release-gate.json');
  const reportMarkdownPath = path.join(reportDir, 'gocheok-seatmap-release-gate.md');

  const EXPECTED_TOTAL_BLOCKS = 159;
  const EXPECTED_TRACE_REVIEWED = 159;
  const EXPECTED_MANUAL_TODO = 0;
  const EXPECTED_OMITTED_OFFICIAL = 1;
  const EXPECTED_OFFICIAL_ASSET_SHA256 = 'ea95249b6f121e65b13435616768e2de433090be734de5d86c1effa40cfd64bd';
  const EXPECTED_RELEASE_FIXTURE_FINGERPRINT = 'c548e884fc548220b42df2a94753e14cee3636a2cdb04abd51702665b2a29670';

  function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
  }

  function snapshotFixture() {
    const blocks = GOCHEOK_BLOCKS
      .map((b) => ({
        id: b.id,
        block: b.block,
        level: b.level,
        side: b.side,
        category: b.category,
        d: b.imageGeometry.d,
        labelX: b.imageGeometry.labelX,
        labelY: b.imageGeometry.labelY,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const tracedIds = [...GOCHEOK_TRACE_REVIEWED_BLOCK_IDS].sort();
    return JSON.stringify({ blocks, tracedIds });
  }

  async function readText(relPath) {
    return fs.readFile(path.join(frontendRoot, relPath), 'utf8');
  }

  const packageSource = await readText('package.json');
  const assetBuffer = await fs.readFile(path.join(frontendRoot, GOCHEOK_SEATMAP_IMAGE.imagePath));

  const releaseFixtureFingerprint = sha256(snapshotFixture());
  const officialAssetSha256 = sha256(assetBuffer);

  const summary = {
    totalBlocks: GOCHEOK_BLOCKS.length,
    traceReviewedBlockIds: GOCHEOK_TRACE_REVIEWED_BLOCK_IDS.length,
    manualTodoBlocks: GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS.length,
    omittedOfficialBlocks: GOCHEOK_OMITTED_OFFICIAL_BLOCKS.length,
    releaseFixtureFingerprint,
    officialAssetSha256,
  };

  const checks = [
    ['total blocks', summary.totalBlocks === EXPECTED_TOTAL_BLOCKS],
    ['trace reviewed block count', summary.traceReviewedBlockIds === EXPECTED_TRACE_REVIEWED],
    ['manual todo blocks are empty', summary.manualTodoBlocks === EXPECTED_MANUAL_TODO],
    ['omitted official block count', summary.omittedOfficialBlocks === EXPECTED_OMITTED_OFFICIAL],
    ['official asset sha256', summary.officialAssetSha256 === EXPECTED_OFFICIAL_ASSET_SHA256],
    ['release fixture fingerprint', summary.releaseFixtureFingerprint === EXPECTED_RELEASE_FIXTURE_FINGERPRINT],
    ['package release lock script', packageSource.includes('"qa:stadium:gocheok:release-lock"')],
    ['package trace manifest script', packageSource.includes('"stadium:gocheok:trace-manifest"')],
  ].map(([label, passed]) => ({ label, passed }));

  const failures = checks.filter((c) => !c.passed).map((c) => c.label);
  const report = {
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    summary,
    checks,
    failures,
  };

  const markdown = [
    '# Gocheok Seatmap Release Gate',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- totalBlocks: ${summary.totalBlocks}`,
    `- traceReviewedBlockIds: ${summary.traceReviewedBlockIds}`,
    `- manualTodoBlocks: ${summary.manualTodoBlocks}`,
    '',
    '## Checks',
    '',
    ...checks.map((c) => `- ${c.passed ? 'PASS' : 'FAIL'} ${c.label}`),
    '',
    ...(failures.length > 0 ? ['## Failures', '', ...failures.map((f) => `- ${f}`), ''] : []),
  ].join('\n');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(reportMarkdownPath, markdown);

  if (failures.length > 0) {
    failures.forEach((f) => console.error(`[gocheok-release-gate] failure: ${f}`));
    console.error('[gocheok-release-gate] failed');
    console.error(`[gocheok-release-gate] report=${reportJsonPath}`);
    process.exit(1);
  }

  console.log('[gocheok-release-gate] passed');
  console.log(`[gocheok-release-gate] report=${reportJsonPath}`);
};

const TASKS = {
  "operator-template": runOperatorTemplate,
  "operator-validate": runOperatorValidate,
  "operator-apply-plan": runOperatorApplyPlan,
  "operator-handoff": runOperatorHandoff,
  "operator-intake": runOperatorIntake,
  "pixel-components": runPixelComponents,
  "trace-manifest": runTraceManifest,
  "evidence": runEvidence,
  "release-gate": runReleaseGate,
};

export const runGocheokSeatmapTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Gocheok seatmap task: ${task}. Available tasks: ${available}`);
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
  await runGocheokSeatmapTask(task, args);
}
