import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const HANDOFF_VERSION = 'DAEGU_OPERATOR_HANDOFF_V1';
const HANDOFF_TARGET_CLASSES = new Set(['RETRACE_REQUIRED', 'OPERATOR_REQUIRED']);
const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3', 'P4'];

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const traceReviewPath = path.join(outDir, 'daegu-seatmap-trace-review.json');

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

const countBy = (rows, key) => rows.reduce((counts, row) => {
  const value = typeof key === 'function' ? key(row) : row[key];
  counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}, {});

const priorityRank = (priority) => {
  const index = PRIORITY_ORDER.indexOf(priority);
  return index === -1 ? PRIORITY_ORDER.length : index;
};

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const ratioLabel = (value) => {
  const number = numberOrNull(value);
  if (number === null) return '-';
  return number.toFixed(3);
};

const riskFlagsFor = (row, thresholds) => {
  const flags = [];
  if (row.alignmentClass === 'RETRACE_REQUIRED') flags.push('RETRACE_REQUIRED');
  if (row.alignmentClass === 'OPERATOR_REQUIRED') flags.push('OPERATOR_REQUIRED');
  if (row.candidateDuplicateGroup) flags.push('DUPLICATE_PIXEL_CANDIDATE');
  if (row.semanticRisk) flags.push(row.semanticRisk);
  if (row.labelInsideCurrentPath === false) flags.push('LABEL_OUTSIDE_CURRENT_PATH');
  if (row.labelTopHitOk === false) flags.push('LABEL_TOP_HIT_MISMATCH');
  if (row.candidateStatus !== 'PIXEL_CANDIDATE_READY') flags.push(row.candidateStatus || 'PIXEL_CANDIDATE_NOT_READY');

  const componentInsidePathRatio = numberOrNull(row.componentInsidePathRatio);
  if (
    componentInsidePathRatio !== null
    && componentInsidePathRatio < thresholds.minComponentInsidePathRatio
  ) {
    flags.push('LOW_COMPONENT_INSIDE_CURRENT_PATH');
  }

  const pathColorCoverageRatio = numberOrNull(row.pathColorCoverageRatio);
  if (
    pathColorCoverageRatio !== null
    && pathColorCoverageRatio < thresholds.minPathColorCoverageRatio
  ) {
    flags.push('LOW_CURRENT_PATH_COLOR_COVERAGE');
  }

  if (row.traceMethod === 'LEGACY_SCALED_POLYGON') flags.push('LEGACY_SCALED_POLYGON');
  return [...new Set(flags)];
};

const queuePriorityFor = (row) => {
  if (row.tracePriority === 'P0') return 'P0';
  if (row.candidateDuplicateGroup || row.semanticRisk) return 'P1';
  if (row.tracePriority === 'P1') return 'P1';
  if (row.alignmentClass === 'RETRACE_REQUIRED') return 'P2';
  if (row.candidateStatus === 'PIXEL_CANDIDATE_READY') return 'P3';
  return 'P4';
};

const recommendedActionFor = (row) => {
  if (row.alignmentClass === 'LOCKED_VERIFIED') return 'NO_ACTION_LOCKED_VERIFIED';
  if (row.candidateDuplicateGroup) return 'TRACE_SHARED_CANDIDATE_BOUNDARIES';
  if (row.labelInsideCurrentPath === false || row.labelTopHitOk === false) return 'RETRACE_LABEL_AND_HIT_AREA';
  if (row.alignmentClass === 'RETRACE_REQUIRED') return 'RETRACE_FROM_OFFICIAL_PNG_CANDIDATE';
  if (row.alignmentClass === 'OPERATOR_REQUIRED') return 'REQUEST_OPERATOR_CORRECTED_PATH';
  return 'MANUAL_REVIEW_REQUIRED';
};

const sortWorkRows = (a, b) => (
  priorityRank(a.queuePriority) - priorityRank(b.queuePriority)
    || priorityRank(a.tracePriority) - priorityRank(b.tracePriority)
    || String(a.category).localeCompare(String(b.category))
    || String(a.block).localeCompare(String(b.block), 'ko')
);

const manifest = await readJson(traceReviewPath);
const thresholds = {
  minComponentInsidePathRatio: manifest.summary?.alignmentThresholds?.minComponentInsidePathRatio ?? 0.65,
  minPathColorCoverageRatio: manifest.summary?.alignmentThresholds?.minPathColorCoverageRatio ?? 0.65,
};

const allBlocks = manifest.blocks.map((row) => {
  const riskFlags = riskFlagsFor(row, thresholds);
  const queuePriority = queuePriorityFor(row);
  return {
    ...row,
    queuePriority,
    recommendedAction: recommendedActionFor(row),
    riskFlags,
    handoffReason: riskFlags.length > 0 ? riskFlags.join(' / ') : row.reviewAction,
  };
});

const workItems = allBlocks
  .filter((row) => HANDOFF_TARGET_CLASSES.has(row.alignmentClass))
  .sort(sortWorkRows);

const lockedReferenceBlocks = allBlocks
  .filter((row) => row.alignmentClass === 'LOCKED_VERIFIED')
  .sort((a, b) => String(a.block).localeCompare(String(b.block), 'ko'));

const duplicateCandidateGroups = Object.entries(
  workItems
    .filter((row) => row.candidateDuplicateGroup)
    .reduce((groups, row) => {
      const group = groups[row.candidateDuplicateGroup] ?? [];
      group.push(row);
      groups[row.candidateDuplicateGroup] = group;
      return groups;
    }, {}),
).map(([groupId, rows]) => ({
  groupId,
  queuePriority: rows.map((row) => row.queuePriority).sort((a, b) => priorityRank(a) - priorityRank(b))[0],
  blockIds: rows.map((row) => row.id),
  blocks: rows.map((row) => row.block),
  categories: [...new Set(rows.map((row) => row.category))],
  alignmentClasses: [...new Set(rows.map((row) => row.alignmentClass))],
  semanticRisk: rows.some((row) => row.semanticRisk) ? 'CANDIDATE_DUPLICATE_CROSS_CATEGORY' : '',
  recommendedAction: 'TRACE_SHARED_CANDIDATE_BOUNDARIES',
})).sort((a, b) => priorityRank(a.queuePriority) - priorityRank(b.queuePriority) || a.groupId.localeCompare(b.groupId));

const summary = {
  handoffVersion: HANDOFF_VERSION,
  sourceManifest: path.relative(frontendRoot, traceReviewPath),
  alignmentStandard: manifest.summary?.alignmentStandard ?? '',
  totalBlocks: allBlocks.length,
  targetBlocks: workItems.length,
  lockedVerified: lockedReferenceBlocks.length,
  retraceRequired: workItems.filter((row) => row.alignmentClass === 'RETRACE_REQUIRED').length,
  operatorRequired: workItems.filter((row) => row.alignmentClass === 'OPERATOR_REQUIRED').length,
  queuePriority: countBy(workItems, 'queuePriority'),
  byAlignmentClass: countBy(workItems, 'alignmentClass'),
  duplicateCandidateGroups: duplicateCandidateGroups.length,
  duplicateCandidateBlocks: workItems.filter((row) => row.candidateDuplicateGroup).length,
  semanticRiskBlocks: workItems.filter((row) => row.semanticRisk).length,
  candidateReadyTargets: workItems.filter((row) => row.candidateStatus === 'PIXEL_CANDIDATE_READY').length,
  notPromotableWithoutOperatorApproval: workItems.length,
};

const handoff = {
  generatedAt: new Date().toISOString(),
  asset: manifest.asset,
  summary,
  operatorReviewContract: {
    ...manifest.operatorReviewContract,
    handoffVersion: HANDOFF_VERSION,
    acceptanceGate: [
      'operatorDecision=APPROVED',
      'correctedPath',
      'reviewer',
      'reviewedAt',
      'alignment-audit pass after data diff',
    ],
    nonAutomaticPromotion: true,
  },
  duplicateCandidateGroups,
  workItems,
  lockedReferenceBlocks,
};

const priorityRows = PRIORITY_ORDER.map((priority) => {
  const rows = workItems.filter((row) => row.queuePriority === priority);
  return [
    `\`${priority}\``,
    String(rows.length),
    String(rows.filter((row) => row.alignmentClass === 'RETRACE_REQUIRED').length),
    String(rows.filter((row) => row.alignmentClass === 'OPERATOR_REQUIRED').length),
    String(rows.filter((row) => row.candidateDuplicateGroup).length),
  ];
});

const duplicateRows = duplicateCandidateGroups.map((group) => [
  `\`${group.groupId}\``,
  `\`${group.queuePriority}\``,
  group.blocks.map((block) => `\`${block}\``).join(' '),
  group.categories.map((category) => `\`${category}\``).join(' '),
  group.semanticRisk ? `\`${group.semanticRisk}\`` : '-',
]);

const workQueueRows = workItems.map((row) => [
  `\`${row.queuePriority}\``,
  `\`${row.block}\``,
  row.name,
  `\`${row.category}\``,
  `\`${row.alignmentClass}\``,
  `\`${row.candidateStatus}\``,
  row.candidateDuplicateGroup ? `\`${row.candidateDuplicateGroup}\`` : '-',
  row.labelTopHitBlock ? `\`${row.labelTopHitBlock}\`` : '-',
  `${ratioLabel(row.componentInsidePathRatio)} / ${ratioLabel(row.pathColorCoverageRatio)}`,
  `\`${row.recommendedAction}\``,
]);

const highPriorityRows = workItems
  .filter((row) => row.queuePriority === 'P0' || row.queuePriority === 'P1')
  .map((row) => [
    `\`${row.queuePriority}\``,
    `\`${row.block}\``,
    row.name,
    `\`${row.alignmentClass}\``,
    row.riskFlags.map((flag) => `\`${flag}\``).join('<br>') || '-',
    `\`${row.recommendedAction}\``,
  ]);

const markdown = [
  '# 대구 좌석도 운영자 handoff',
  '',
  `- handoff version: \`${summary.handoffVersion}\``,
  `- source manifest: \`${summary.sourceManifest}\``,
  `- alignment standard: \`${summary.alignmentStandard}\``,
  `- total blocks: ${summary.totalBlocks}`,
  `- handoff targets: ${summary.targetBlocks}`,
  `- locked reference blocks: ${summary.lockedVerified}`,
  `- retrace required: ${summary.retraceRequired}`,
  `- operator required: ${summary.operatorRequired}`,
  `- duplicate candidate groups: ${summary.duplicateCandidateGroups}`,
  `- duplicate candidate blocks: ${summary.duplicateCandidateBlocks}`,
  `- non-automatic promotion targets: ${summary.notPromotableWithoutOperatorApproval}`,
  '- overview overlay: `reports/stadium/daegu-seatmap-operator-handoff.svg`',
  '',
  '## Queue priority',
  '',
  markdownTable(
    ['priority', 'blocks', 'retrace', 'operator', 'duplicate'],
    priorityRows,
  ),
  '',
  '## High priority',
  '',
  highPriorityRows.length > 0
    ? markdownTable(['queue', 'block', 'name', 'alignment', 'risk flags', 'recommended action'], highPriorityRows)
    : 'No P0/P1 handoff targets.',
  '',
  '## Duplicate candidate groups',
  '',
  duplicateRows.length > 0
    ? markdownTable(['group', 'queue', 'blocks', 'categories', 'semantic risk'], duplicateRows)
    : 'No duplicate candidate groups in handoff targets.',
  '',
  '## Work queue',
  '',
  markdownTable(
    ['queue', 'block', 'name', 'category', 'alignment', 'candidate', 'duplicate', 'label top hit', 'inside / coverage', 'action'],
    workQueueRows,
  ),
  '',
  '## Operator input contract',
  '',
  '1. 자동 승격은 금지합니다. `operatorDecision=APPROVED`, `correctedPath`, `reviewer`, `reviewedAt`이 모두 있어야 데이터 반영 후보가 됩니다.',
  '2. `TRACE_SHARED_CANDIDATE_BOUNDARIES`는 같은 pixel candidate를 여러 블록이 공유하므로 각 공식 경계를 별도 corrected path로 제출해야 합니다.',
  '3. `REQUEST_OPERATOR_CORRECTED_PATH`는 공식 PNG만으로 내부 경계를 확정할 수 없는 대상입니다.',
  '4. 데이터 반영 후에는 `npm run stadium:daegu:alignment-audit`를 다시 통과해야 합니다.',
  '',
].join('\n');

const imageWidth = manifest.asset?.imageWidth ?? 1707;
const imageHeight = manifest.asset?.imageHeight ?? 2048;
const seatmapHref = '../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
const svgRows = workItems;
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">`,
  '  <style>',
  '    .grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 1; }',
  '    .path { stroke-width: 2.5; vector-effect: non-scaling-stroke; }',
  '    .candidate { fill: rgba(6, 182, 212, 0.12); stroke: #06b6d4; stroke-width: 2; stroke-dasharray: 8 5; vector-effect: non-scaling-stroke; }',
  '    .label { font: 700 14px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
  '    .q-p0 { fill: rgba(220, 38, 38, 0.20); stroke: #dc2626; }',
  '    .q-p1 { fill: rgba(234, 88, 12, 0.18); stroke: #ea580c; }',
  '    .q-p2 { fill: rgba(37, 99, 235, 0.16); stroke: #2563eb; }',
  '    .q-p3 { fill: rgba(124, 58, 237, 0.14); stroke: #7c3aed; }',
  '    .q-p4 { fill: rgba(71, 85, 105, 0.12); stroke: #475569; }',
  '  </style>',
  `  <image href="${seatmapHref}" x="0" y="0" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="none" />`,
  ...Array.from({ length: Math.floor(imageWidth / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="${imageHeight}" />`),
  ...Array.from({ length: Math.floor(imageHeight / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="${imageWidth}" y2="${index * 100}" />`),
  '  <g id="current-paths">',
  ...svgRows.map((row) => `    <path class="path q-${row.queuePriority.toLowerCase()}" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.queuePriority} ${row.block} ${row.alignmentClass} ${row.recommendedAction}`)}</title></path>`),
  '  </g>',
  '  <g id="pixel-candidates">',
  ...svgRows
    .filter((row) => row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)
    .map((row) => `    <path class="candidate" d="${xmlEscape(row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)}"><title>${xmlEscape(`${row.block} candidate ${row.candidateStatus}${row.candidateDuplicateGroup ? ` duplicate ${row.candidateDuplicateGroup}` : ''}`)}</title></path>`),
  '  </g>',
  '  <g id="labels">',
  ...svgRows.map((row) => `    <text class="label" x="${row.labelX}" y="${row.labelY}">${xmlEscape(`${row.queuePriority} ${row.block}`)}</text>`),
  '  </g>',
  '</svg>',
].join('\n');

await fs.mkdir(outDir, { recursive: true });

const jsonPath = path.join(outDir, 'daegu-seatmap-operator-handoff.json');
const csvPath = path.join(outDir, 'daegu-seatmap-operator-handoff.csv');
const markdownPath = path.join(outDir, 'daegu-seatmap-operator-handoff.md');
const svgPath = path.join(outDir, 'daegu-seatmap-operator-handoff.svg');

await fs.writeFile(jsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'queuePriority',
    'id',
    'block',
    'name',
    'category',
    'tracePriority',
    'alignmentClass',
    'traceStatus',
    'traceMethod',
    'sourceConfidence',
    'candidateStatus',
    'candidateDuplicateGroup',
    'candidateDuplicateIds',
    'candidateDuplicateCategories',
    'semanticRisk',
    'labelInsideCurrentPath',
    'labelTopHitBlockId',
    'labelTopHitBlock',
    'labelTopHitOk',
    'componentInsidePathRatio',
    'pathColorCoverageRatio',
    'recommendedAction',
    'riskFlags',
    'handoffReason',
    'reviewAction',
    'currentPath',
    'candidateOuterBoundaryPath',
    'candidateBoundaryPath',
    'candidateHullPath',
    'operatorDecision',
    'correctedPath',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ],
  ...workItems.map((row) => [
    row.queuePriority,
    row.id,
    row.block,
    row.name,
    row.category,
    row.tracePriority,
    row.alignmentClass,
    row.traceStatus,
    row.traceMethod,
    row.sourceConfidence,
    row.candidateStatus,
    row.candidateDuplicateGroup,
    row.candidateDuplicateIds,
    row.candidateDuplicateCategories,
    row.semanticRisk,
    row.labelInsideCurrentPath,
    row.labelTopHitBlockId,
    row.labelTopHitBlock,
    row.labelTopHitOk,
    row.componentInsidePathRatio,
    row.pathColorCoverageRatio,
    row.recommendedAction,
    row.riskFlags.join(' '),
    row.handoffReason,
    row.reviewAction,
    row.currentPath,
    row.candidateOuterBoundaryPath,
    row.candidateBoundaryPath,
    row.candidateHullPath,
    row.operatorDecision,
    row.correctedPath,
    row.reviewer,
    row.reviewedAt,
    row.operatorNote,
  ]),
]);
await fs.writeFile(markdownPath, markdown, 'utf8');
await fs.writeFile(svgPath, svg, 'utf8');

console.log(`operator_handoff_json:${jsonPath}`);
console.log(`operator_handoff_csv:${csvPath}`);
console.log(`operator_handoff_markdown:${markdownPath}`);
console.log(`operator_handoff_svg:${svgPath}`);
console.log(`status:ok targets=${summary.targetBlocks} retrace=${summary.retraceRequired} operator=${summary.operatorRequired} duplicateGroups=${summary.duplicateCandidateGroups}`);
