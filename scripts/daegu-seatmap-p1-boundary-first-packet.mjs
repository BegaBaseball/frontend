import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');

const PACKET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_PACKET_V1';
const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
const TARGET_BATCH_ID = 'BATCH_2_P1';
const VIEWBOX = { width: 1707, height: 2048 };
const EXPECTED_BLOCKS = ['T1-1', 'T3-2', 'V1', 'V2', 'V3'];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

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

const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

const numberText = (value) => (value === '' || value === null || value === undefined ? '' : String(value));

const editableFieldsFrom = (row) => ({
  operatorDecision: normalizeDecision(row?.operatorDecision),
  correctedPath: String(row?.correctedPath ?? '').trim(),
  correctedLabelX: numberText(row?.correctedLabelX),
  correctedLabelY: numberText(row?.correctedLabelY),
  reviewer: String(row?.reviewer ?? '').trim(),
  reviewedAt: String(row?.reviewedAt ?? '').trim(),
  operatorNote: String(row?.operatorNote ?? '').trim(),
});

const isGeneratedRetraceNote = (note) => String(note ?? '').startsWith('No operator corrected path provided;');

const hasOperatorFilledEditableFields = (row, defaultEditableRow = { operatorDecision: 'PENDING' }) => {
  const editable = editableFieldsFrom(row);
  const defaults = typeof defaultEditableRow === 'string'
    ? { operatorDecision: normalizeDecision(defaultEditableRow), operatorNote: '' }
    : editableFieldsFrom(defaultEditableRow);
  const hasDecisionOverride = editable.operatorDecision !== defaults.operatorDecision
    && ['APPROVED', 'REJECTED'].includes(editable.operatorDecision);
  const hasReviewMarker = Boolean(editable.reviewer)
    || Boolean(editable.reviewedAt)
    || (Boolean(editable.operatorNote)
      && editable.operatorNote !== defaults.operatorNote
      && !isGeneratedRetraceNote(editable.operatorNote));
  const hasCorrectedGeometry = Boolean(editable.correctedPath)
    || editable.correctedLabelX !== ''
    || editable.correctedLabelY !== '';
  return hasDecisionOverride || hasReviewMarker || hasCorrectedGeometry;
};

const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
const readinessPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-readiness.json');
const inputPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');
const boundaryAidPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-input-aid.json');
const nextActionPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.json');
const templateJsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-operator-template.json');

const readiness = await readJson(readinessPath);
const input = await readJson(inputPath);
const boundaryAid = await readJson(boundaryAidPath);
const nextAction = await readJson(nextActionPath);
const existingOperatorTemplate = await readOptionalJson(templateJsonPath);

const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
const existingTemplateRows = Array.isArray(existingOperatorTemplate?.corrections)
  ? existingOperatorTemplate.corrections
  : [];
const boundaryAidRows = Array.isArray(boundaryAid.rows) ? boundaryAid.rows : [];
const nextActionRows = Array.isArray(nextAction.rows) ? nextAction.rows : [];
const readinessRows = Array.isArray(readiness.rows) ? readiness.rows : [];
const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
const existingTemplateByBlockId = new Map(existingTemplateRows.map((row) => [row.blockId, row]));
const boundaryAidByBlockId = new Map(boundaryAidRows.map((row) => [row.target?.blockId, row]).filter(([blockId]) => blockId));
const nextActionByBlockId = new Map(nextActionRows.map((row) => [row.blockId, row]));

const blockers = [];
const warnings = [];

if (readiness.summary?.readinessVersion !== 'DAEGU_P1_BOUNDARY_FIRST_READINESS_V1') {
  blockers.push(`BOUNDARY_FIRST_READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
}
if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P1_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
if (boundaryAid.summary?.inputAidVersion !== 'DAEGU_P1_BOUNDARY_INPUT_AID_V1') {
  blockers.push(`BOUNDARY_AID_VERSION_MISMATCH:${boundaryAid.summary?.inputAidVersion ?? ''}`);
}
if (nextAction.summary?.packetVersion !== 'DAEGU_P1_NEXT_ACTION_PACKET_V1') {
  blockers.push(`NEXT_ACTION_PACKET_VERSION_MISMATCH:${nextAction.summary?.packetVersion ?? ''}`);
}
if (readiness.summary?.missingEvidenceRows > 0) blockers.push(`BOUNDARY_FIRST_MISSING_EVIDENCE:${readiness.summary.missingEvidenceRows}`);
if (readiness.summary?.missingContextRows > 0) blockers.push(`BOUNDARY_FIRST_MISSING_CONTEXT:${readiness.summary.missingContextRows}`);
if (readiness.summary?.approvedInvalidRows > 0) blockers.push(`BOUNDARY_FIRST_APPROVED_INVALID:${readiness.summary.approvedInvalidRows}`);

const rows = readinessRows.map((readinessRow, index) => {
  const inputRow = inputByBlockId.get(readinessRow.blockId) ?? {};
  const aidRow = boundaryAidByBlockId.get(readinessRow.blockId) ?? {};
  const actionRow = nextActionByBlockId.get(readinessRow.blockId) ?? {};
  const target = aidRow.target ?? {};
  const targetGeometry = aidRow.targetGeometryReference ?? {};
  const pairedGeometry = Array.isArray(aidRow.pairedGeometryReference) ? aidRow.pairedGeometryReference : [];
  const decision = normalizeDecision(inputRow.operatorDecision);

  if (!EXPECTED_BLOCKS.includes(readinessRow.block)) {
    blockers.push(`UNEXPECTED_BOUNDARY_FIRST_BLOCK:${readinessRow.block}`);
  }
  if (!targetGeometry.currentPath) blockers.push(`BOUNDARY_FIRST_TARGET_PATH_MISSING:${readinessRow.block}`);
  if (pairedGeometry.length === 0) blockers.push(`BOUNDARY_FIRST_PAIRED_CONTEXT_MISSING:${readinessRow.block}`);

  return {
    packetVersion: PACKET_VERSION,
    rowNumber: index + 1,
    blockId: readinessRow.blockId,
    block: readinessRow.block,
    name: readinessRow.name,
    category: readinessRow.category,
    status: readinessRow.status,
    decision,
    stage: actionRow.stage ?? readinessRow.stage,
    reviewType: readinessRow.reviewType,
    evidenceCrop: readinessRow.evidenceCrop,
    operatorFocus: actionRow.operatorFocus ?? readinessRow.operatorFocus,
    operatorAction: actionRow.operatorAction ?? readinessRow.operatorAction,
    approvalRule: target.approvalRule ?? actionRow.acceptance ?? readinessRow.approvalRule,
    currentFailureReasons: inputRow.officialFailureReasons ?? actionRow.officialFailureReasons ?? '',
    riskFlags: inputRow.riskFlags ?? actionRow.riskFlags ?? '',
    targetReference: {
      currentPath: targetGeometry.currentPath ?? inputRow.currentPath ?? '',
      currentLabelX: targetGeometry.labelX ?? inputRow.currentLabelX ?? '',
      currentLabelY: targetGeometry.labelY ?? inputRow.currentLabelY ?? '',
      currentPathPointCount: targetGeometry.currentPathPointCount ?? 0,
      candidatePath: targetGeometry.candidatePath ?? inputRow.candidatePath ?? '',
      candidatePathPointCount: targetGeometry.candidatePathPointCount ?? 0,
      candidateReferenceOnly: true,
      candidateStatus: targetGeometry.candidateStatus ?? inputRow.candidateStatus ?? '',
    },
    pairedNeighbors: pairedGeometry.map((paired) => ({
      blockId: paired.blockId,
      block: paired.block,
      name: paired.name,
      currentPath: paired.currentPath,
      currentLabelX: paired.labelX,
      currentLabelY: paired.labelY,
      labelTopHitBlock: paired.labelTopHitBlock,
      labelTopHitOk: paired.labelTopHitOk,
    })),
    sourceInput: path.relative(frontendRoot, inputPath),
    requiredApprovalFields: [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ],
    operatorTemplateDefaults: {
      operatorDecision: decision,
      correctedPath: inputRow.correctedPath ?? '',
      correctedLabelX: numberText(inputRow.correctedLabelX),
      correctedLabelY: numberText(inputRow.correctedLabelY),
      reviewer: inputRow.reviewer ?? '',
      reviewedAt: inputRow.reviewedAt ?? '',
      operatorNote: inputRow.operatorNote ?? '',
    },
  };
});

const templateRows = rows.map((row) => ({
  ...(() => {
    const existingTemplateRow = existingTemplateByBlockId.get(row.blockId);
    const shouldPreserveExistingTemplate = hasOperatorFilledEditableFields(
      existingTemplateRow,
      row.operatorTemplateDefaults,
    );
    const editableFields = editableFieldsFrom(
      shouldPreserveExistingTemplate ? existingTemplateRow : row.operatorTemplateDefaults,
    );

    return {
      blockId: row.blockId,
      block: row.block,
      name: row.name,
      category: row.category,
      sourceInput: row.sourceInput,
      readinessStatus: row.status,
      pairedBlocks: row.pairedNeighbors.map((paired) => paired.block).join(' '),
      evidenceCrop: row.evidenceCrop,
      editableSource: shouldPreserveExistingTemplate ? 'existingOperatorTemplate' : 'sourceInput',
      operatorDecision: editableFields.operatorDecision,
      correctedPath: editableFields.correctedPath,
      correctedLabelX: editableFields.correctedLabelX,
      correctedLabelY: editableFields.correctedLabelY,
      reviewer: editableFields.reviewer,
      reviewedAt: editableFields.reviewedAt,
      operatorNote: editableFields.operatorNote,
    };
  })(),
}));

if (rows.length !== EXPECTED_BLOCKS.length) blockers.push(`BOUNDARY_FIRST_PACKET_ROW_COUNT:${rows.length}:${EXPECTED_BLOCKS.length}`);
if (templateRows.some((row) => !EXPECTED_BLOCKS.includes(row.block))) {
  blockers.push(`BOUNDARY_FIRST_TEMPLATE_HAS_UNEXPECTED_BLOCK:${templateRows.filter((row) => !EXPECTED_BLOCKS.includes(row.block)).map((row) => row.block).join(' ')}`);
}

const summary = {
  packetVersion: PACKET_VERSION,
  status: blockers.length > 0 ? 'blocked' : 'ready-for-operator',
  targetBatchId: TARGET_BATCH_ID,
  sourceReadiness: path.relative(frontendRoot, readinessPath),
  sourceInput: path.relative(frontendRoot, inputPath),
  existingOperatorTemplate: path.relative(frontendRoot, templateJsonPath),
  sourceBoundaryAid: path.relative(frontendRoot, boundaryAidPath),
  sourceNextAction: path.relative(frontendRoot, nextActionPath),
  totalRows: rows.length,
  readyForOperatorRows: rows.filter((row) => row.status === 'READY_FOR_OPERATOR').length,
  approvedValidRows: rows.filter((row) => row.status === 'APPROVED_VALID').length,
  approvedInvalidRows: rows.filter((row) => row.status === 'APPROVED_INVALID').length,
  missingEvidenceRows: rows.filter((row) => row.status === 'MISSING_EVIDENCE').length,
  missingContextRows: rows.filter((row) => row.status === 'MISSING_CONTEXT').length,
  existingTemplateRows: existingTemplateRows.length,
  preservedEditableRows: templateRows.filter((row) => row.editableSource === 'existingOperatorTemplate').length,
  sourceInputEditableRows: templateRows.filter((row) => row.editableSource === 'sourceInput').length,
  productionWriteAllowed: false,
  writesOperatorDecision: false,
  writesCorrectionsTemplate: false,
  writesProductionData: false,
  blockers,
  warnings,
};

const packet = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This boundary-first packet is read-only.',
    'It writes no operatorDecision or corrected fields into the source P1 input.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'candidatePath is reference-only and must not be copied into correctedPath.',
    'The operator template is copy/staging material only and productionWriteAllowed=false.',
    'Regenerating this packet must preserve operator-filled editable fields from the existing boundary-first operator template.',
  ],
  rows,
};

const template = {
  generatedAt: new Date().toISOString(),
  templateVersion: TEMPLATE_VERSION,
  targetBatchId: TARGET_BATCH_ID,
  sourcePacketVersion: PACKET_VERSION,
  sourcePacket: 'reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-packet.json',
  sourceInput: path.relative(frontendRoot, inputPath),
  templateOnly: true,
  productionWriteAllowed: false,
  allowedBlocks: EXPECTED_BLOCKS,
  editableFields: [
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ],
  corrections: templateRows,
};

const svgPathRows = rows.flatMap((row) => [
  ...row.pairedNeighbors.map((paired) => `<path d="${xmlEscape(paired.currentPath)}" fill="rgba(37,99,235,0.12)" stroke="#2563eb" stroke-width="3" vector-effect="non-scaling-stroke" data-kind="paired" data-block="${xmlEscape(paired.block)}" />`),
  row.targetReference.candidatePath
    ? `<path d="${xmlEscape(row.targetReference.candidatePath)}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="10 8" vector-effect="non-scaling-stroke" data-kind="candidate-reference-only" data-block="${xmlEscape(row.block)}" />`
    : '',
  `<path d="${xmlEscape(row.targetReference.currentPath)}" fill="rgba(220,38,38,0.22)" stroke="#dc2626" stroke-width="5" vector-effect="non-scaling-stroke" data-kind="target-current" data-block="${xmlEscape(row.block)}" />`,
  row.targetReference.currentLabelX && row.targetReference.currentLabelY
    ? `<circle cx="${xmlEscape(row.targetReference.currentLabelX)}" cy="${xmlEscape(row.targetReference.currentLabelY)}" r="8" fill="#dc2626" data-kind="target-label" data-block="${xmlEscape(row.block)}" />`
    : '',
  `<text x="24" y="${40 + (row.rowNumber * 34)}" font-family="Arial, sans-serif" font-size="24" fill="#111827">${xmlEscape(row.rowNumber)}. ${xmlEscape(row.block)} ${xmlEscape(row.status)}</text>`,
]);
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" width="${VIEWBOX.width}" height="${VIEWBOX.height}">`,
  '<rect width="100%" height="100%" fill="#fff" />',
  '<g id="paired-neighbor-layer">',
  ...svgPathRows.filter(Boolean),
  '</g>',
  '<text x="24" y="32" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#111827">Daegu P1 boundary-first overlay: red=target, blue=paired, orange=candidate reference only</text>',
  '</svg>',
].join('\n');

const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-packet.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-packet.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-packet.md');
const svgPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-overlay.svg');
const templateCsvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-operator-template.csv');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  ['block', 'status', 'decision', 'pairedBlocks', 'evidenceCrop', 'operatorFocus', 'approvalRule', 'riskFlags'],
  ...rows.map((row) => [
    row.block,
    row.status,
    row.decision,
    row.pairedNeighbors.map((paired) => paired.block).join(' '),
    row.evidenceCrop,
    row.operatorFocus,
    row.approvalRule,
    row.riskFlags,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# Daegu P1 Boundary-First Packet',
  '',
  `- packet version: \`${PACKET_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- rows: ${summary.totalRows}`,
  `- operator template: \`${path.relative(frontendRoot, templateJsonPath)}\``,
  `- overlay svg: \`${path.relative(frontendRoot, svgPath)}\``,
  `- production write allowed: ${summary.productionWriteAllowed}`,
  `- preserved editable rows: ${summary.preservedEditableRows}`,
  '',
  '## Rows',
  '',
  markdownTable(
    ['block', 'status', 'paired', 'evidence', 'focus'],
    rows.map((row) => [
      `\`${row.block}\``,
      `\`${row.status}\``,
      row.pairedNeighbors.map((paired) => `\`${paired.block}\``).join(' '),
      row.evidenceCrop,
      row.operatorFocus,
    ]),
  ),
  '',
  '## Operator Rules',
  '',
  '1. 이 packet과 template은 source P1 input을 수정하지 않습니다.',
  '2. candidatePath는 reference-only이며 correctedPath로 복사하지 않습니다.',
  '3. operator template을 source input에 옮기기 전에는 `npm run stadium:daegu:p1-boundary-first-template-gate`를 실행합니다.',
  '4. 5개가 모두 `APPROVED_VALID`가 되기 전에는 다음 P1 stage로 넘어가지 않습니다.',
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
await fs.writeFile(svgPath, `${svg}\n`, 'utf8');
await fs.writeFile(templateJsonPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
await writeCsv(templateCsvPath, [
  ['blockId', 'block', 'name', 'category', 'editableSource', 'operatorDecision', 'correctedPath', 'correctedLabelX', 'correctedLabelY', 'reviewer', 'reviewedAt', 'operatorNote', 'evidenceCrop', 'pairedBlocks'],
  ...templateRows.map((row) => [
    row.blockId,
    row.block,
    row.name,
    row.category,
    row.editableSource,
    row.operatorDecision,
    row.correctedPath,
    row.correctedLabelX,
    row.correctedLabelY,
    row.reviewer,
    row.reviewedAt,
    row.operatorNote,
    row.evidenceCrop,
    row.pairedBlocks,
  ]),
]);

console.log(`p1_boundary_first_packet_json:${jsonPath}`);
console.log(`p1_boundary_first_packet_csv:${csvPath}`);
console.log(`p1_boundary_first_packet_markdown:${markdownPath}`);
console.log(`p1_boundary_first_overlay_svg:${svgPath}`);
console.log(`p1_boundary_first_operator_template_json:${templateJsonPath}`);
console.log(`status:${summary.status} rows=${summary.totalRows} ready=${summary.readyForOperatorRows} approvedValid=${summary.approvedValidRows} preservedEditable=${summary.preservedEditableRows}`);

if (summary.status !== 'ready-for-operator') {
  process.exitCode = 1;
}
