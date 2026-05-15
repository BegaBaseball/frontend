import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

const REVIEW_BOARD_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_REVIEW_BOARD_V1';
const PACKET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_PACKET_V1';
const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
const GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_TEMPLATE_GATE_V1';
const SOURCE_COPY_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_SOURCE_COPY_V1';
const READINESS_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_READINESS_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const VIEWBOX = { width: 1707, height: 2048 };
const EXPECTED_BLOCKS = ['T1-1', 'T3-2', 'V1', 'V2', 'V3'];
const EXPECTED_BLOCK_IDS = [
  'daegu-first-table-t1-1',
  'daegu-third-table-t3-2',
  'daegu-central-table-v-v1',
  'daegu-central-table-v-v2',
  'daegu-central-table-v-v3',
];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

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

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

const asTextList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  const text = String(value ?? '').trim();
  return text ? text.split(/\s+/) : [];
};

const arraysEqual = (left, right) => left.length === right.length
  && left.every((item, index) => item === right[index]);

const pointText = (x, y) => {
  if (x === '' || x === null || x === undefined || y === '' || y === null || y === undefined) return '';
  return `${x},${y}`;
};

const isBlank = (value) => String(value ?? '').trim() === '';

const approvalMissingFieldsFor = (row, decision) => {
  const missing = [];
  if (decision !== 'APPROVED') missing.push('operatorDecision=APPROVED');
  if (isBlank(row.correctedPath)) missing.push('correctedPath');
  if (isBlank(row.correctedLabelX) || isBlank(row.correctedLabelY)) missing.push('correctedLabelX/Y');
  if (isBlank(row.reviewer)) missing.push('reviewer');
  if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
  return missing;
};

const nextOperatorActionFor = (missingFields) => {
  if (missingFields.length === 0) return 'Run npm run stadium:daegu:p1-boundary-first-template-gate.';
  return `Fill ${missingFields.join(', ')} in daegu-seatmap-p1-boundary-first-operator-template.json.`;
};

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
const packetPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-packet.json');
const templatePath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-operator-template.json');
const gatePath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-template-gate.json');
const sourceCopyPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-source-copy.json');
const readinessPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-readiness.json');

const packet = await readJson(packetPath);
const template = await readJson(templatePath);
const gate = await readJson(gatePath);
const sourceCopy = await readJson(sourceCopyPath);
const readiness = await readJson(readinessPath);

const packetRows = Array.isArray(packet.rows) ? packet.rows : [];
const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
const gateRows = Array.isArray(gate.rows) ? gate.rows : [];
const sourceCopyRows = Array.isArray(sourceCopy.rows) ? sourceCopy.rows : [];
const readinessRows = Array.isArray(readiness.rows) ? readiness.rows : [];

const packetByBlock = new Map(packetRows.map((row) => [row.block, row]));
const templateByBlockId = new Map(templateRows.map((row) => [row.blockId, row]));
const gateByBlock = new Map(gateRows.map((row) => [row.block, row]));
const sourceCopyByBlockId = new Map(sourceCopyRows.map((row) => [row.blockId, row]));
const readinessByBlockId = new Map(readinessRows.map((row) => [row.blockId, row]));
const blockers = [];
const warnings = [];

if (packet.summary?.packetVersion !== PACKET_VERSION) blockers.push(`PACKET_VERSION_MISMATCH:${packet.summary?.packetVersion ?? ''}`);
if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
if (gate.summary?.gateVersion !== GATE_VERSION) blockers.push(`GATE_VERSION_MISMATCH:${gate.summary?.gateVersion ?? ''}`);
if (sourceCopy.summary?.copyVersion !== SOURCE_COPY_VERSION) blockers.push(`SOURCE_COPY_VERSION_MISMATCH:${sourceCopy.summary?.copyVersion ?? ''}`);
if (readiness.summary?.readinessVersion !== READINESS_VERSION) blockers.push(`READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
if (template.templateOnly !== true) blockers.push('TEMPLATE_ONLY_NOT_TRUE');
if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (packet.summary?.productionWriteAllowed !== false) blockers.push('PACKET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (packet.summary?.writesOperatorDecision !== false) blockers.push('PACKET_WRITES_OPERATOR_DECISION_NOT_FALSE');
if (packet.summary?.writesCorrectionsTemplate !== false) blockers.push('PACKET_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
if (packet.summary?.writesProductionData !== false) blockers.push('PACKET_WRITES_PRODUCTION_DATA_NOT_FALSE');
if (gate.summary?.productionWriteAllowed !== false) blockers.push('GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (gate.summary?.writesProductionData !== false) blockers.push('GATE_WRITES_PRODUCTION_DATA_NOT_FALSE');
if (sourceCopy.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_COPY_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
if (sourceCopy.summary?.writesProductionData !== false) blockers.push('SOURCE_COPY_WRITES_PRODUCTION_DATA_NOT_FALSE');
if (sourceCopy.summary?.mode !== 'dry-run') warnings.push(`SOURCE_COPY_NOT_DRY_RUN:${sourceCopy.summary?.mode ?? ''}`);

const packetBlocks = packetRows.map((row) => row.block);
const templateBlocks = templateRows.map((row) => row.block);
const templateBlockIds = templateRows.map((row) => row.blockId);
if (!arraysEqual(packetBlocks, EXPECTED_BLOCKS)) blockers.push(`PACKET_BLOCK_ORDER_MISMATCH:${packetBlocks.join(' ')}`);
if (!arraysEqual(templateBlocks, EXPECTED_BLOCKS)) blockers.push(`TEMPLATE_BLOCK_ORDER_MISMATCH:${templateBlocks.join(' ')}`);
if (!arraysEqual(templateBlockIds, EXPECTED_BLOCK_IDS)) blockers.push(`TEMPLATE_BLOCK_ID_ORDER_MISMATCH:${templateBlockIds.join(' ')}`);
if (!arraysEqual(template.allowedBlocks ?? [], EXPECTED_BLOCKS)) blockers.push(`TEMPLATE_ALLOWED_BLOCKS_MISMATCH:${(template.allowedBlocks ?? []).join(' ')}`);
if (packet.summary?.totalRows !== EXPECTED_BLOCKS.length) blockers.push(`PACKET_ROW_COUNT_MISMATCH:${packet.summary?.totalRows ?? ''}`);
if (templateRows.length !== EXPECTED_BLOCKS.length) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}`);
if (gate.summary?.totalRows !== EXPECTED_BLOCKS.length) blockers.push(`GATE_ROW_COUNT_MISMATCH:${gate.summary?.totalRows ?? ''}`);
if (sourceCopy.summary?.totalBoundaryRows !== EXPECTED_BLOCKS.length) blockers.push(`SOURCE_COPY_ROW_COUNT_MISMATCH:${sourceCopy.summary?.totalBoundaryRows ?? ''}`);

const rows = await Promise.all(EXPECTED_BLOCKS.map(async (block, index) => {
  const packetRow = packetByBlock.get(block) ?? {};
  const templateRow = templateByBlockId.get(EXPECTED_BLOCK_IDS[index]) ?? {};
  const gateRow = gateByBlock.get(block) ?? {};
  const sourceCopyRow = sourceCopyByBlockId.get(EXPECTED_BLOCK_IDS[index]) ?? {};
  const readinessRow = readinessByBlockId.get(EXPECTED_BLOCK_IDS[index]) ?? {};
  const pairedNeighbors = Array.isArray(packetRow.pairedNeighbors) ? packetRow.pairedNeighbors : [];
  const targetReference = packetRow.targetReference ?? {};
  const evidenceCrop = packetRow.evidenceCrop ?? templateRow.evidenceCrop ?? '';
  const evidenceCropExists = evidenceCrop
    ? await fileExists(path.resolve(frontendRoot, evidenceCrop))
    : false;
  const decision = normalizeDecision(templateRow.operatorDecision ?? packetRow.decision);
  const gateReasons = Array.isArray(gateRow.reasons) ? gateRow.reasons : [];
  const gateWarnings = Array.isArray(gateRow.warnings) ? gateRow.warnings : [];
  const riskFlags = asTextList(packetRow.riskFlags);
  const currentFailureReasons = asTextList(packetRow.currentFailureReasons);
  const approvalMissingFields = approvalMissingFieldsFor(templateRow, decision);

  if (!packetRow.blockId) blockers.push(`PACKET_ROW_MISSING:${block}`);
  if (!templateRow.blockId) blockers.push(`TEMPLATE_ROW_MISSING:${block}`);
  if (!gateRow.block) blockers.push(`GATE_ROW_MISSING:${block}`);
  if (!sourceCopyRow.blockId) blockers.push(`SOURCE_COPY_ROW_MISSING:${block}`);
  if (!readinessRow.blockId) blockers.push(`READINESS_ROW_MISSING:${block}`);
  if (!evidenceCropExists) blockers.push(`BOUNDARY_FIRST_EVIDENCE_MISSING:${block}`);
  if (!targetReference.currentPath) blockers.push(`BOUNDARY_FIRST_CURRENT_PATH_MISSING:${block}`);
  if (targetReference.candidateReferenceOnly !== true) blockers.push(`BOUNDARY_FIRST_CANDIDATE_NOT_REFERENCE_ONLY:${block}`);
  if (pairedNeighbors.length === 0) blockers.push(`BOUNDARY_FIRST_PAIRED_NEIGHBOR_MISSING:${block}`);

  return {
    reviewBoardVersion: REVIEW_BOARD_VERSION,
    rowNumber: index + 1,
    blockId: packetRow.blockId ?? templateRow.blockId ?? EXPECTED_BLOCK_IDS[index],
    block,
    name: packetRow.name ?? templateRow.name ?? '',
    category: packetRow.category ?? templateRow.category ?? '',
    reviewType: packetRow.reviewType ?? '',
    packetStatus: packetRow.status ?? '',
    readinessStatus: readinessRow.status ?? '',
    templateEditableSource: templateRow.editableSource ?? '',
    templateDecision: decision,
    approvalMissingFields,
    nextOperatorAction: nextOperatorActionFor(approvalMissingFields),
    gateReadyForSourceCopy: gateRow.readyForSourceCopy ?? false,
    gateReasons,
    gateWarnings,
    sourceCopyApproved: sourceCopyRow.approvedInTemplate ?? false,
    sourceCopyChanged: sourceCopyRow.changed ?? false,
    evidenceCrop,
    evidenceCropExists,
    pairedBlocks: pairedNeighbors.map((paired) => paired.block),
    operatorFocus: packetRow.operatorFocus ?? '',
    operatorAction: packetRow.operatorAction ?? '',
    approvalRule: packetRow.approvalRule ?? '',
    currentFailureReasons,
    riskFlags,
    targetReference: {
      currentPath: targetReference.currentPath ?? '',
      currentLabelPoint: pointText(targetReference.currentLabelX, targetReference.currentLabelY),
      currentPathPointCount: targetReference.currentPathPointCount ?? 0,
      candidatePath: targetReference.candidatePath ?? '',
      candidatePathPointCount: targetReference.candidatePathPointCount ?? 0,
      candidateReferenceOnly: targetReference.candidateReferenceOnly === true,
      candidateStatus: targetReference.candidateStatus ?? '',
    },
    pairedNeighbors,
    approvalChecklist: [
      'operatorDecision=APPROVED',
      'correctedPath manually traced from the official PNG',
      'correctedLabelX/Y inside correctedPath',
      'reviewer filled',
      'reviewedAt filled with parseable timestamp',
      'no duplicate correctedPath across boundary-first rows',
      'paired neighbor ownership remains non-overlapping',
      'candidatePath is reference-only and is not copied',
    ],
    nextGateCommand: 'npm run stadium:daegu:p1-boundary-first-template-gate',
  };
}));

const approvedRows = rows.filter((row) => row.templateDecision === 'APPROVED');
const approvedInvalidRows = rows.filter((row) => row.templateDecision === 'APPROVED' && row.gateReasons.length > 0);
const boardStatus = blockers.length > 0
  ? 'blocked'
  : gate.summary?.status === 'ready-for-source-copy' && sourceCopy.summary?.status === 'ready-for-write-source-input'
    ? 'ready-for-source-input-copy'
    : approvedRows.length > 0
      ? 'partial-boundary-approval'
      : 'waiting-for-operator';

const summary = {
  reviewBoardVersion: REVIEW_BOARD_VERSION,
  status: boardStatus,
  targetBatchId: TARGET_BATCH_ID,
  packet: path.relative(frontendRoot, packetPath),
  operatorTemplate: path.relative(frontendRoot, templatePath),
  templateGate: path.relative(frontendRoot, gatePath),
  sourceCopyDryRun: path.relative(frontendRoot, sourceCopyPath),
  readiness: path.relative(frontendRoot, readinessPath),
  totalRows: rows.length,
  readyForOperatorRows: rows.filter((row) => row.packetStatus === 'READY_FOR_OPERATOR').length,
  approvedRows: approvedRows.length,
  approvedInvalidRows: approvedInvalidRows.length,
  rowsMissingApprovalFields: rows.filter((row) => row.approvalMissingFields.length > 0).length,
  gateStatus: gate.summary?.status ?? '',
  sourceCopyStatus: sourceCopy.summary?.status ?? '',
  canAdvanceToSingleCorrectedPath: readiness.summary?.canAdvanceToSingleCorrectedPath === true,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This review board is read-only.',
    'It combines packet, operator template, template gate, source-copy dry-run, and readiness reports.',
    'It never writes operatorDecision or corrected fields into source input.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'candidatePath is reference-only and must not be copied into correctedPath.',
    'Production write remains forbidden until the normal P1 and postwrite gates pass.',
  ],
  rows,
};

const svgRows = rows.flatMap((row) => [
  ...row.pairedNeighbors.map((paired) => `<path d="${xmlEscape(paired.currentPath)}" fill="rgba(37,99,235,0.10)" stroke="#2563eb" stroke-width="3" vector-effect="non-scaling-stroke" data-kind="paired-neighbor" data-block="${xmlEscape(paired.block)}" />`),
  row.targetReference.candidatePath
    ? `<path d="${xmlEscape(row.targetReference.candidatePath)}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="10 8" vector-effect="non-scaling-stroke" data-kind="candidate-reference-only" data-block="${xmlEscape(row.block)}" />`
    : '',
  `<path d="${xmlEscape(row.targetReference.currentPath)}" fill="rgba(220,38,38,0.20)" stroke="#dc2626" stroke-width="5" vector-effect="non-scaling-stroke" data-kind="target-current" data-block="${xmlEscape(row.block)}" />`,
  row.targetReference.currentLabelPoint
    ? `<circle cx="${xmlEscape(row.targetReference.currentLabelPoint.split(',')[0])}" cy="${xmlEscape(row.targetReference.currentLabelPoint.split(',')[1])}" r="8" fill="#dc2626" data-kind="target-label" data-block="${xmlEscape(row.block)}" />`
    : '',
  `<text x="24" y="${70 + (row.rowNumber * 34)}" font-family="Arial, sans-serif" font-size="24" fill="#111827">${xmlEscape(row.rowNumber)}. ${xmlEscape(row.block)} ${xmlEscape(row.templateDecision)}</text>`,
]);
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" width="${VIEWBOX.width}" height="${VIEWBOX.height}">`,
  '<rect width="100%" height="100%" fill="#fff" />',
  `<text x="24" y="34" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#111827">Daegu P1 boundary-first review board: red=current target, blue=paired, orange=candidate reference-only</text>`,
  `<text x="24" y="62" font-family="Arial, sans-serif" font-size="18" fill="#374151">status=${xmlEscape(summary.status)} approved=${summary.approvedRows}/${summary.totalRows} productionWriteAllowed=false</text>`,
  '<g id="daegu-p1-boundary-first-review-board">',
  ...svgRows.filter(Boolean),
  '</g>',
  '</svg>',
].join('\n');

const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-review-board.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-review-board.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-review-board.md');
const svgPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-review-board.svg');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'block',
    'packetStatus',
    'readinessStatus',
    'templateDecision',
    'templateEditableSource',
    'approvalMissingFields',
    'gateReadyForSourceCopy',
    'sourceCopyApproved',
    'pairedBlocks',
    'evidenceCrop',
    'currentFailureReasons',
    'riskFlags',
    'nextGateCommand',
  ],
  ...rows.map((row) => [
    row.block,
    row.packetStatus,
    row.readinessStatus,
    row.templateDecision,
    row.templateEditableSource,
    row.approvalMissingFields.join(' '),
    row.gateReadyForSourceCopy,
    row.sourceCopyApproved,
    row.pairedBlocks.join(' '),
    row.evidenceCrop,
    row.currentFailureReasons.join(' '),
    row.riskFlags.join(' '),
    row.nextGateCommand,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary-First Review Board',
  '',
  `- review board version: \`${REVIEW_BOARD_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- approved rows: ${summary.approvedRows}/${summary.totalRows}`,
  `- gate status: \`${summary.gateStatus || 'none'}\``,
  `- source-copy status: \`${summary.sourceCopyStatus || 'none'}\``,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  `- operator template: \`${summary.operatorTemplate}\``,
  `- next gate command: \`npm run stadium:daegu:p1-boundary-first-template-gate\``,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Gate Snapshot',
  '',
  markdownTable(
    ['source', 'status', 'write flags'],
    [
      ['packet', packet.summary?.status ?? '', `operator=${packet.summary?.writesOperatorDecision} template=${packet.summary?.writesCorrectionsTemplate} production=${packet.summary?.writesProductionData}`],
      ['template gate', gate.summary?.status ?? '', `sourceInput=${gate.summary?.writesSourceInput} production=${gate.summary?.writesProductionData}`],
      ['source-copy dry-run', sourceCopy.summary?.status ?? '', `sourceInput=${sourceCopy.summary?.writesSourceInput} production=${sourceCopy.summary?.writesProductionData}`],
      ['readiness', readiness.summary?.status ?? '', `advance=${summary.canAdvanceToSingleCorrectedPath}`],
    ],
  ),
  '',
  '## Rows',
  '',
  markdownTable(
    ['block', 'decision', 'missing approval fields', 'gate ready', 'paired', 'evidence', 'review action'],
    rows.map((row) => [
      `\`${row.block}\``,
      `\`${row.templateDecision}\``,
      row.approvalMissingFields.map((field) => `\`${field}\``).join(' ') || '-',
      String(row.gateReadyForSourceCopy),
      row.pairedBlocks.map((paired) => `\`${paired}\``).join(' '),
      row.evidenceCrop,
      row.operatorAction,
    ]),
  ),
  '',
  '## Block Details',
  '',
  ...rows.flatMap((row) => [
    `### ${row.block}`,
    '',
    `- evidence crop: \`${row.evidenceCrop}\``,
    `- paired blocks: ${row.pairedBlocks.map((paired) => `\`${paired}\``).join(' ') || '-'}`,
    `- review type: \`${row.reviewType || 'none'}\``,
    `- current label: \`${row.targetReference.currentLabelPoint || 'none'}\`, current path points: ${row.targetReference.currentPathPointCount}`,
    `- candidate status: \`${row.targetReference.candidateStatus || 'none'}\`, candidate reference only: ${row.targetReference.candidateReferenceOnly}, candidate points: ${row.targetReference.candidatePathPointCount}`,
    `- current failures: ${row.currentFailureReasons.map((reason) => `\`${reason}\``).join(' ') || '-'}`,
    `- risk flags: ${row.riskFlags.map((flag) => `\`${flag}\``).join(' ') || '-'}`,
    `- missing approval fields: ${row.approvalMissingFields.map((field) => `\`${field}\``).join(' ') || '-'}`,
    `- next operator action: ${row.nextOperatorAction}`,
    `- approval rule: ${row.approvalRule || '-'}`,
    `- checklist: ${row.approvalChecklist.map((item) => `\`${item}\``).join(' ')}`,
    '',
  ]),
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Warnings',
  '',
  summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');
await fs.writeFile(svgPath, `${svg}\n`, 'utf8');

console.log(`p1_boundary_first_review_board_json:${jsonPath}`);
console.log(`p1_boundary_first_review_board_csv:${csvPath}`);
console.log(`p1_boundary_first_review_board_markdown:${markdownPath}`);
console.log(`p1_boundary_first_review_board_svg:${svgPath}`);
console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows}/${summary.totalRows} gate=${summary.gateStatus} sourceCopy=${summary.sourceCopyStatus}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
