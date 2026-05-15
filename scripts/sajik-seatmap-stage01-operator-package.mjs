import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultStageDir = path.join(defaultReportDir, 'sajik-stage01-operator');

const PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
const REQUIRED_WORKSET_VERSION = 'SAJIK_ZONE_PRECISION_WORKSETS_V1';
const TARGET_STAGE_IDS = ['P0-A', 'P0-B', 'P0-C'];
const TARGET_STAGE_LABEL = 'Stage 01 P0';
const EXPECTED_STAGE01_ROWS = 16;
const EXPECTED_STAGE01_SECTION_IDS = [
  '021',
  '022',
  '031',
  '032',
  '121',
  '122',
  '123',
  '124',
  '125',
  '131',
  '132',
  '133',
  '134',
  '135',
  '142',
  '143',
];
const REQUIRED_APPROVAL_FIELDS = [
  'operatorDecision=APPROVED',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
];
const DECISION_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'];

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

const readOptionalJson = async (filePath) => {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

const editableFieldsFrom = (row) => ({
  operatorDecision: normalizeDecision(row?.operatorDecision),
  correctedPath: String(row?.correctedPath ?? '').trim(),
  correctedLabelX: row?.correctedLabelX ?? '',
  correctedLabelY: row?.correctedLabelY ?? '',
  reviewer: String(row?.reviewer ?? '').trim(),
  reviewedAt: String(row?.reviewedAt ?? '').trim(),
  operatorNote: String(row?.operatorNote ?? '').trim(),
});

const hasOperatorFilledEditableFields = (row) => {
  const editable = editableFieldsFrom(row);
  return editable.operatorDecision !== 'PENDING'
    || Boolean(editable.correctedPath)
    || editable.correctedLabelX !== ''
    || editable.correctedLabelY !== ''
    || Boolean(editable.reviewer)
    || Boolean(editable.reviewedAt)
    || Boolean(editable.operatorNote);
};

const sorted = (values) => [...values].sort();

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
const worksetPath = path.resolve(
  frontendRoot,
  argValue('--worksets', path.join('reports/stadium', 'sajik-seatmap-zone-precision-worksets.json')),
);
const operatorInputJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json');
const operatorInputCsvPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.csv');
const checklistMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-checklist.md');
const checklistCsvPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-checklist.csv');
const packageJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-package.json');
const packageMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-package.md');
const packageSvgPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-package.svg');

const worksets = await readJson(worksetPath);
const existingOperatorInput = await readOptionalJson(operatorInputJsonPath);
const existingRows = Array.isArray(existingOperatorInput?.corrections) ? existingOperatorInput.corrections : [];
const existingBySectionId = new Map(existingRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
const expectedSectionIdSet = new Set(EXPECTED_STAGE01_SECTION_IDS);
const existingEditableRows = existingRows
  .map((row) => ({
    sectionId: String(row.sectionId ?? '').trim(),
    row,
  }))
  .filter(({ row }) => hasOperatorFilledEditableFields(row));
const existingEditableStageRows = existingEditableRows
  .filter(({ sectionId }) => expectedSectionIdSet.has(sectionId));
const ignoredExistingEditableRows = existingEditableRows
  .filter(({ sectionId }) => !expectedSectionIdSet.has(sectionId));
const duplicateExistingEditableSectionIds = sorted(
  existingEditableRows
    .map(({ sectionId }) => sectionId)
    .filter((sectionId, index, sectionIds) => sectionIds.indexOf(sectionId) !== index),
);

const stageRows = (worksets.candidateRows ?? [])
  .filter((row) => TARGET_STAGE_IDS.includes(row.batchId))
  .sort((left, right) => {
    const leftStage = TARGET_STAGE_IDS.indexOf(left.batchId);
    const rightStage = TARGET_STAGE_IDS.indexOf(right.batchId);
    if (leftStage !== rightStage) return leftStage - rightStage;
    return String(left.sectionId).localeCompare(String(right.sectionId), 'ko');
  });

const corrections = stageRows.map((row) => {
  const existingRow = existingBySectionId.get(row.sectionId);
  const shouldPreserveExistingInput = hasOperatorFilledEditableFields(existingRow);
  const editable = editableFieldsFrom(shouldPreserveExistingInput ? existingRow : null);
  const [currentLabelX = '', currentLabelY = ''] = row.labelPoint ?? [];

  return {
    worksetVersion: row.worksetVersion,
    packageVersion: PACKAGE_VERSION,
    targetStage: TARGET_STAGE_LABEL,
    priority: row.priority,
    batchId: row.batchId,
    stageOrder: row.stageOrder,
    zoneId: row.zoneId,
    zoneLabel: row.zoneLabel,
    sectionId: row.sectionId,
    sectionName: row.sectionName,
    blockId: row.blockId,
    seatCategoryLabel: row.seatCategoryLabel,
    level: row.level,
    floor: row.floor,
    side: row.side,
    sectionKind: row.sectionKind,
    mapInteractionStatus: row.mapInteractionStatus,
    allowedChange: row.allowedChange,
    currentVisualPath: row.visualPath,
    currentHitPath: row.hitPath,
    currentLabelX,
    currentLabelY,
    currentLabelPoint: row.labelPoint,
    currentVisualEqualsHit: row.visualEqualsHit,
    visualArea: row.visualArea,
    hitArea: row.hitArea,
    hitToVisualAreaRatio: row.hitToVisualAreaRatio,
    bounds: row.bounds,
    validationIssueCount: row.validationIssueCount,
    validationIssues: row.validationIssues,
    objective: row.objective,
    editableSource: shouldPreserveExistingInput ? 'existingOperatorInput' : 'emptyTemplate',
    operatorDecision: editable.operatorDecision,
    correctedPath: editable.correctedPath,
    correctedLabelX: editable.correctedLabelX,
    correctedLabelY: editable.correctedLabelY,
    reviewer: editable.reviewer,
    reviewedAt: editable.reviewedAt,
    operatorNote: editable.operatorNote,
  };
});

const blockers = [];
const warnings = [];
const stageIds = sorted(stageRows.map((row) => row.sectionId));
const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);

if (worksets.summary?.worksetVersion !== REQUIRED_WORKSET_VERSION) {
  blockers.push(`WORKSET_VERSION_MISMATCH:${worksets.summary?.worksetVersion ?? ''}`);
}
if (worksets.summary?.blockers?.length > 0) {
  blockers.push(`WORKSET_HAS_BLOCKERS:${worksets.summary.blockers.length}`);
}
if (stageRows.length !== EXPECTED_STAGE01_ROWS) {
  blockers.push(`STAGE01_ROW_COUNT_MISMATCH:${stageRows.length}:${EXPECTED_STAGE01_ROWS}`);
}
if (stageIds.join(',') !== expectedIds.join(',')) {
  blockers.push(`STAGE01_SECTION_IDS_MISMATCH:${stageIds.join(' ')}:${expectedIds.join(' ')}`);
}
corrections
  .filter((row) => row.sectionKind !== 'SEAT_SECTION')
  .forEach((row) => blockers.push(`STAGE01_NON_SEAT_SECTION:${row.sectionId}:${row.sectionKind}`));
corrections
  .filter((row) => row.mapInteractionStatus !== 'MAP_SELECTABLE')
  .forEach((row) => blockers.push(`STAGE01_NOT_MAP_SELECTABLE:${row.sectionId}:${row.mapInteractionStatus}`));
corrections
  .filter((row) => row.validationIssueCount > 0)
  .forEach((row) => blockers.push(`STAGE01_CURRENT_GEOMETRY_INVALID:${row.sectionId}`));

if (existingRows.length > 0 && existingRows.length !== EXPECTED_STAGE01_ROWS) {
  warnings.push(`EXISTING_OPERATOR_INPUT_ROW_COUNT:${existingRows.length}:${EXPECTED_STAGE01_ROWS}`);
}
const preservedEditableSectionIds = new Set(
  corrections
    .filter((row) => row.editableSource === 'existingOperatorInput')
    .map((row) => row.sectionId),
);
const missingPreservedEditableRows = existingEditableStageRows
  .filter(({ sectionId }) => !preservedEditableSectionIds.has(sectionId));

if (missingPreservedEditableRows.length > 0) {
  blockers.push(`OPERATOR_INPUT_PRESERVATION_FAILED:${missingPreservedEditableRows.map(({ sectionId }) => sectionId).join(' ')}`);
}
if (ignoredExistingEditableRows.length > 0) {
  blockers.push(`OPERATOR_INPUT_OUTSIDE_STAGE01:${ignoredExistingEditableRows.map(({ sectionId }) => sectionId || 'UNKNOWN').join(' ')}`);
}
if (duplicateExistingEditableSectionIds.length > 0) {
  blockers.push(`DUPLICATE_EXISTING_OPERATOR_INPUT:${duplicateExistingEditableSectionIds.join(' ')}`);
}

const preservationStatus = blockers.some((blocker) => blocker.startsWith('OPERATOR_INPUT_') || blocker.startsWith('DUPLICATE_EXISTING_OPERATOR_INPUT'))
  ? 'blocked'
  : existingEditableRows.length === 0
    ? 'no-existing-input'
    : 'preserved';

const summary = {
  packageVersion: PACKAGE_VERSION,
  status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
  generatedAt: new Date().toISOString(),
  stadiumId: worksets.summary?.stadiumId ?? '',
  mapVersion: worksets.summary?.mapVersion ?? '',
  viewBox: worksets.summary?.viewBox ?? '',
  coordinateSystem: worksets.summary?.coordinateSystem ?? '',
  sourceWorksets: path.relative(frontendRoot, worksetPath),
  outputDirectory: path.relative(frontendRoot, stageDir),
  targetStage: TARGET_STAGE_LABEL,
  targetBatchIds: TARGET_STAGE_IDS,
  targetSectionIds: EXPECTED_STAGE01_SECTION_IDS,
  totalRows: corrections.length,
  expectedRows: EXPECTED_STAGE01_ROWS,
  approvedRows: corrections.filter((row) => row.operatorDecision === 'APPROVED').length,
  pendingRows: corrections.filter((row) => row.operatorDecision === 'PENDING').length,
  decidedRows: corrections.filter((row) => row.operatorDecision !== 'PENDING').length,
  keepCurrentRows: corrections.filter((row) => row.operatorDecision === 'KEEP_CURRENT').length,
  existingEditableRows: existingEditableRows.length,
  existingEditableStageRows: existingEditableStageRows.length,
  preservedEditableRows: corrections.filter((row) => row.editableSource === 'existingOperatorInput').length,
  ignoredExistingEditableRows: ignoredExistingEditableRows.length,
  duplicateExistingEditableSectionIds,
  preservationStatus,
  requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
  decisionOptions: DECISION_OPTIONS,
  productionWriteAllowed: false,
  sourceOfTruth: false,
  blockers,
  warnings,
};

const packageJson = {
  generatedAt: summary.generatedAt,
  packageVersion: PACKAGE_VERSION,
  status: summary.status,
  stadiumId: summary.stadiumId,
  mapVersion: summary.mapVersion,
  viewBox: summary.viewBox,
  targetStage: summary.targetStage,
  targetBatchIds: summary.targetBatchIds,
  targetSectionIds: summary.targetSectionIds,
  productionWriteAllowed: false,
  sourceOfTruth: false,
  safetyContract: [
    'Stage 01 operator package is an input aid only; it never changes production seatmap data.',
    'correctedPath is the operator-approved hitPath for the section in the official 960x640 SVG viewBox coordinate system.',
    'visualPath remains the current official traced path in Stage 01 unless a later plan explicitly allows visualPath writes.',
    'Regenerating this package preserves operator-filled editable fields from the existing operator input file.',
    'If a filled editable row would be dropped or duplicated during regeneration, the package is blocked.',
    'Alias-only sections and accessibility markers are excluded from this package.',
  ],
  correctionContract: {
    coordinateSystem: 'official PNG 960x640, SVG viewBox 0 0 960 640',
    allowedChange: 'HITPATH_ONLY_WITH_OPERATOR_APPROVAL',
    pathRules: ['single closed polygon', 'M/L/Z only', 'minimum 3 polygon points'],
    decisionOptions: DECISION_OPTIONS,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    noCoordinateInference: true,
    noExternalCrawlingOrWebSearch: true,
  },
  corrections,
};

await fs.mkdir(stageDir, { recursive: true });
await fs.writeFile(operatorInputJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

const editableHeaders = [
  'sectionId',
  'sectionName',
  'batchId',
  'zoneId',
  'seatCategoryLabel',
  'currentVisualPath',
  'currentHitPath',
  'currentLabelX',
  'currentLabelY',
  'editableSource',
  'operatorDecision',
  'correctedPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'operatorNote',
];
await writeCsv(operatorInputCsvPath, [
  editableHeaders,
  ...corrections.map((row) => editableHeaders.map((key) => row[key])),
]);

const checklistHeaders = [
  'sectionId',
  'batchId',
  'zoneId',
  'sectionName',
  'seatCategoryLabel',
  'currentVisualEqualsHit',
  'hitToVisualAreaRatio',
  'validationIssueCount',
  'objective',
  'editableSource',
];
await writeCsv(checklistCsvPath, [
  checklistHeaders,
  ...corrections.map((row) => checklistHeaders.map((key) => row[key])),
]);

const rowsTable = markdownTable(
  ['batch', 'zone', 'section', 'category', 'visual=hit', 'hit/visual', 'decision', 'editable source'],
  corrections.map((row) => [
    `\`${row.batchId}\``,
    `\`${row.zoneId}\``,
    `\`${row.sectionId}\``,
    row.seatCategoryLabel,
    `\`${row.currentVisualEqualsHit}\``,
    `\`${row.hitToVisualAreaRatio}\``,
    `\`${row.operatorDecision}\``,
    `\`${row.editableSource}\``,
  ]),
);

await fs.writeFile(checklistMarkdownPath, [
  '# Sajik Stage 01 Operator Checklist',
  '',
  `- package version: \`${PACKAGE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- target stage: \`${TARGET_STAGE_LABEL}\``,
  `- rows: \`${summary.totalRows}/${EXPECTED_STAGE01_ROWS}\``,
  `- approved rows: \`${summary.approvedRows}\``,
  `- keep current rows: \`${summary.keepCurrentRows}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Operator Rules',
  '',
  '1. `correctedPath`는 공식 PNG `960x640` 좌표계 기준의 operator-approved `hitPath`입니다.',
  '2. Stage 01에서는 `visualPath`를 production source로 수정하지 않습니다.',
  '3. 승인하려면 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채웁니다.',
  '4. 승인할 수 없으면 `REJECTED`, `NEEDS_RETRACE`, 또는 `KEEP_CURRENT`로 남기고 prewrite에서 production patch preview를 만들지 않습니다.',
  '5. package를 다시 생성해도 기존 operator input의 editable field는 보존됩니다.',
  '',
  '## Rows',
  '',
  rowsTable,
  '',
  '## Editable Inputs',
  '',
  `- \`${path.relative(frontendRoot, operatorInputJsonPath)}\``,
  `- \`${path.relative(frontendRoot, operatorInputCsvPath)}\``,
  '',
].join('\n'), 'utf8');

await fs.writeFile(packageJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
await fs.writeFile(packageMarkdownPath, [
  '# Sajik Stage 01 Operator Package',
  '',
  `- package version: \`${PACKAGE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- target stage: \`${summary.targetStage}\``,
  `- rows: \`${summary.totalRows}/${summary.expectedRows}\``,
  `- approved rows in package: \`${summary.approvedRows}\``,
  `- keep current rows in package: \`${summary.keepCurrentRows}\``,
  `- existing editable rows: \`${summary.existingEditableRows}\``,
  `- preserved editable rows: \`${summary.preservedEditableRows}\``,
  `- ignored existing editable rows: \`${summary.ignoredExistingEditableRows}\``,
  `- preservation status: \`${summary.preservationStatus}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  '',
  '## Outputs',
  '',
  `- \`${path.relative(frontendRoot, operatorInputJsonPath)}\``,
  `- \`${path.relative(frontendRoot, operatorInputCsvPath)}\``,
  `- \`${path.relative(frontendRoot, checklistMarkdownPath)}\``,
  `- \`${path.relative(frontendRoot, checklistCsvPath)}\``,
  `- \`${path.relative(frontendRoot, packageSvgPath)}\``,
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0
    ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n')
    : 'No package blockers.',
  '',
].join('\n'), 'utf8');

const stageColors = {
  'P0-A': '#DC2626',
  'P0-B': '#EA580C',
  'P0-C': '#CA8A04',
};
const svgPaths = corrections.map((row) => `
  <path d="${xmlEscape(row.currentVisualPath)}" fill="${stageColors[row.batchId] ?? '#64748B'}" fill-opacity="0.2" stroke="${stageColors[row.batchId] ?? '#64748B'}" stroke-width="2" vector-effect="non-scaling-stroke">
    <title>${xmlEscape(`${row.batchId} · ${row.zoneId} · ${row.sectionId} · ${row.sectionName}`)}</title>
  </path>
  <text x="${row.currentLabelX}" y="${row.currentLabelY}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(row.sectionId)}</text>
`).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640">
  <rect width="960" height="640" fill="#f8fafc"/>
  <text x="20" y="32" font-size="18" font-weight="900" fill="#0f172a">Sajik Stage 01 operator package (${summary.status})</text>
  ${svgPaths}
</svg>
`;
await fs.writeFile(packageSvgPath, svg, 'utf8');

console.log(`stage01_operator_package_json:${path.relative(frontendRoot, packageJsonPath)}`);
console.log(`stage01_operator_package_markdown:${path.relative(frontendRoot, packageMarkdownPath)}`);
console.log(`stage01_operator_input_json:${path.relative(frontendRoot, operatorInputJsonPath)}`);
console.log(`stage01_operator_checklist_markdown:${path.relative(frontendRoot, checklistMarkdownPath)}`);
console.log(`stage01_operator_package_svg:${path.relative(frontendRoot, packageSvgPath)}`);
console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows} preserved=${summary.preservedEditableRows} preservation=${summary.preservationStatus} blockers=${summary.blockers.length}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
