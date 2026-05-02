import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_SEATMAP_IMAGE,
  DAEGU_SEATMAP_VIEWPORT,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const pixelComponentsPath = path.join(outDir, 'daegu-seatmap-pixel-components.json');

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

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const pixelComponents = await readJson(pixelComponentsPath);
const candidateByBlockId = new Map(pixelComponents.blocks.map((block) => [block.id, block.candidate]));

const tracePriority = (block, candidate) => {
  if (block.category === 'ACCESSIBLE') return 'P0';
  if (['VIP', 'TABLE', 'BLUE', 'AWAY'].includes(block.category)) return 'P1';
  if (candidate?.status === 'PIXEL_CANDIDATE_READY' && candidate.componentInsidePathRatio >= 0.85) return 'P2';
  if (candidate?.status === 'PIXEL_CANDIDATE_READY') return 'P3';
  return 'P4';
};

const blockRows = DAEGU_BLOCKS.map((block) => {
  const candidate = candidateByBlockId.get(block.id) ?? null;
  return {
    id: block.id,
    block: block.block,
    name: block.name,
    category: block.category,
    level: block.level,
    side: block.side,
    fanRole: block.fanRole,
    sourceConfidence: block.sourceConfidence,
    traceStatus: block.traceStatus,
    traceMethod: block.traceMethod,
    reviewNote: block.reviewNote,
    tracePriority: tracePriority(block, candidate),
    currentPathBounds: pathBounds(block.imageGeometry.d),
    currentPath: block.imageGeometry.d,
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    label: block.imageGeometry.shortLabel,
    candidateStatus: candidate?.status ?? 'MISSING_PIXEL_REPORT',
    candidateArea: candidate?.area ?? '',
    candidateCenter: candidate?.center ?? '',
    candidateBbox: candidate?.bbox ?? '',
    candidateHullPath: candidate?.hullPath ?? '',
    candidateOuterBoundaryPath: candidate?.outerBoundaryPath ?? '',
    candidateOuterBoundaryPointCount: candidate?.outerBoundaryPointCount ?? '',
    candidateBoundaryPath: candidate?.boundaryPath ?? '',
    candidateBoundaryPointCount: candidate?.boundaryPointCount ?? '',
    componentInsidePathRatio: candidate?.componentInsidePathRatio ?? '',
    pathColorCoverageRatio: candidate?.pathColorCoverageRatio ?? '',
    candidateDuplicateGroup: '',
    candidateDuplicateIds: '',
    reviewAction: block.sourceConfidence === 'OFFICIAL'
      ? 'Already marked as official traced.'
      : 'Do not promote automatically. Compare candidateOuterBoundaryPath, candidateBoundaryPath, and candidateHullPath with official PNG/debug overlay, then manually trace and review.',
  };
});

const candidateDuplicateGroups = blockRows.reduce((groups, row) => {
  if (row.candidateStatus !== 'PIXEL_CANDIDATE_READY' || !row.candidateBbox || !row.candidateArea) {
    return groups;
  }
  const bbox = row.candidateBbox;
  const key = [
    bbox.minX,
    bbox.minY,
    bbox.maxX,
    bbox.maxY,
    row.candidateArea,
  ].join(':');
  const group = groups.get(key) ?? [];
  group.push(row);
  groups.set(key, group);
  return groups;
}, new Map());

let duplicateGroupIndex = 0;
candidateDuplicateGroups.forEach((rows) => {
  if (rows.length < 2) return;
  duplicateGroupIndex += 1;
  const groupId = `D${String(duplicateGroupIndex).padStart(2, '0')}`;
  const ids = rows.map((row) => row.id).join(' ');
  rows.forEach((row) => {
    row.candidateDuplicateGroup = groupId;
    row.candidateDuplicateIds = ids;
    row.reviewAction = 'Do not promote automatically. Pixel candidate is shared by multiple blocks; manually trace each official boundary.';
  });
});

const summary = {
  totalBlocks: blockRows.length,
  officialImageTraced: blockRows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
  needsOperatorReview: blockRows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW').length,
  legacyScaledPolygon: blockRows.filter((row) => row.traceMethod === 'LEGACY_SCALED_POLYGON').length,
  directOfficialTrace: blockRows.filter((row) => row.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length,
  pixelCandidateReady: blockRows.filter((row) => row.candidateStatus === 'PIXEL_CANDIDATE_READY').length,
  candidateNeedsManualTrace: blockRows.filter((row) => row.candidateStatus === 'NEEDS_MANUAL_TRACE').length,
  missingPixelCandidate: blockRows.filter((row) => row.candidateStatus === 'NO_SEED_COLOR' || row.candidateStatus === 'NO_COMPONENT').length,
  duplicatePixelCandidateGroups: duplicateGroupIndex,
  duplicatePixelCandidateBlocks: blockRows.filter((row) => row.candidateDuplicateGroup).length,
  sourceConfidence: blockRows.reduce((counts, block) => {
    counts[block.sourceConfidence] = (counts[block.sourceConfidence] ?? 0) + 1;
    return counts;
  }, {}),
  viewport: DAEGU_SEATMAP_VIEWPORT,
};

const manifest = {
  generatedAt: new Date().toISOString(),
  asset: DAEGU_SEATMAP_IMAGE,
  summary,
  blocks: blockRows,
};

const priorityReviewRows = blockRows.filter((row) => row.tracePriority === 'P0' || row.tracePriority === 'P1');
const priorityReviewSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1707" height="2048" viewBox="0 0 1707 2048">',
  '  <style>',
  '    .grid { stroke: #0f172a; stroke-opacity: 0.22; stroke-width: 1; }',
  '    .current { fill: rgba(239, 68, 68, 0.12); stroke: #ef4444; stroke-width: 2; vector-effect: non-scaling-stroke; }',
  '    .candidate { fill: rgba(6, 182, 212, 0.14); stroke: #06b6d4; stroke-width: 2; stroke-dasharray: 8 5; vector-effect: non-scaling-stroke; }',
  '    .label { font: 700 14px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
  '  </style>',
  '  <image href="../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png" x="0" y="0" width="1707" height="2048" preserveAspectRatio="none" />',
  ...Array.from({ length: Math.floor(1707 / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="2048" />`),
  ...Array.from({ length: Math.floor(2048 / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="1707" y2="${index * 100}" />`),
  '  <g id="current-paths">',
  ...priorityReviewRows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.tracePriority} ${row.block} current`)}</title></path>`),
  '  </g>',
  '  <g id="pixel-candidates">',
  ...priorityReviewRows
    .filter((row) => row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)
    .map((row) => `    <path class="candidate" d="${xmlEscape(row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath)}"><title>${xmlEscape(`${row.tracePriority} ${row.block} candidate ${row.candidateStatus}${row.candidateDuplicateGroup ? ` duplicate ${row.candidateDuplicateGroup}` : ''}`)}</title></path>`),
  '  </g>',
  '  <g id="labels">',
  ...priorityReviewRows.map((row) => `    <text class="label" x="${row.labelX}" y="${row.labelY}">${xmlEscape(row.block)}</text>`),
  '  </g>',
  '</svg>',
].join('\n');

const priorityRows = ['P0', 'P1', 'P2', 'P3', 'P4'].map((priority) => {
  const rows = blockRows.filter((row) => row.tracePriority === priority);
  return [
    `\`${priority}\``,
    String(rows.length),
    String(rows.filter((row) => row.candidateStatus === 'PIXEL_CANDIDATE_READY').length),
    String(rows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW').length),
  ];
});

const markdown = [
  '# 대구 삼성라이온즈파크 좌석도 trace review manifest',
  '',
  `- 공식 이미지: \`${DAEGU_SEATMAP_IMAGE.requiredAssetFileName}\` (${DAEGU_SEATMAP_IMAGE.imageWidth}x${DAEGU_SEATMAP_IMAGE.imageHeight})`,
  `- viewport: \`${JSON.stringify(DAEGU_SEATMAP_VIEWPORT)}\``,
  `- total blocks: ${summary.totalBlocks}`,
  `- official image traced: ${summary.officialImageTraced}`,
  `- needs operator review: ${summary.needsOperatorReview}`,
  `- legacy scaled polygon: ${summary.legacyScaledPolygon}`,
  `- direct official trace: ${summary.directOfficialTrace}`,
  `- pixel candidates ready: ${summary.pixelCandidateReady}`,
  `- candidate needs manual trace: ${summary.candidateNeedsManualTrace}`,
  `- missing pixel candidate: ${summary.missingPixelCandidate || '-'}`,
  `- duplicate pixel candidate groups: ${summary.duplicatePixelCandidateGroups}`,
  `- duplicate pixel candidate blocks: ${summary.duplicatePixelCandidateBlocks}`,
  '- priority overlay: `reports/stadium/daegu-seatmap-trace-review-priority.svg`',
  '',
  '## 우선순위',
  '',
  markdownTable(
    ['priority', 'blocks', 'pixel candidates', 'operator review'],
    priorityRows,
  ),
  '',
  '## 사용 방법',
  '',
  '1. `npm run stadium:daegu:evidence`를 실행해 pixel candidate, CSV, priority overlay, evidence crop을 같이 생성합니다.',
  '2. CSV의 `candidateOuterBoundaryPath`, `candidateBoundaryPath`, `candidateHullPath`는 공식 PNG 픽셀에서 뽑은 검수 후보일 뿐입니다. 그대로 자동 반영하지 않습니다.',
  '3. `?daeguDebug=1` overlay에서 공식 색상 블럭 외곽과 직접 비교한 블럭만 `imageGeometry.d`를 수동 갱신합니다.',
  '4. 직접 측정되지 않은 블럭은 `sourceConfidence=UNVERIFIED`와 `NEEDS_OPERATOR_REVIEW` 상태로 남깁니다.',
  '',
].join('\n');

await fs.mkdir(outDir, { recursive: true });

const jsonPath = path.join(outDir, 'daegu-seatmap-trace-review.json');
const csvPath = path.join(outDir, 'daegu-seatmap-trace-review.csv');
const markdownPath = path.join(outDir, 'daegu-seatmap-trace-review.md');
const prioritySvgPath = path.join(outDir, 'daegu-seatmap-trace-review-priority.svg');

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
    'sourceConfidence',
    'traceStatus',
    'traceMethod',
    'tracePriority',
    'reviewNote',
    'labelX',
    'labelY',
    'label',
    'currentPathBounds',
    'currentPath',
    'candidateStatus',
    'candidateArea',
    'candidateCenter',
    'candidateBbox',
    'candidateDuplicateGroup',
    'candidateDuplicateIds',
    'componentInsidePathRatio',
    'pathColorCoverageRatio',
    'candidateOuterBoundaryPointCount',
    'candidateOuterBoundaryPath',
    'candidateBoundaryPointCount',
    'candidateBoundaryPath',
    'candidateHullPath',
    'reviewAction',
  ],
  ...blockRows.map((block) => [
    block.id,
    block.block,
    block.name,
    block.category,
    block.level,
    block.side,
    block.fanRole,
    block.sourceConfidence,
    block.traceStatus,
    block.traceMethod,
    block.tracePriority,
    block.reviewNote,
    block.labelX,
    block.labelY,
    block.label,
    JSON.stringify(block.currentPathBounds),
    block.currentPath,
    block.candidateStatus,
    block.candidateArea,
    block.candidateCenter ? JSON.stringify(block.candidateCenter) : '',
    block.candidateBbox ? JSON.stringify(block.candidateBbox) : '',
    block.candidateDuplicateGroup,
    block.candidateDuplicateIds,
    block.componentInsidePathRatio,
    block.pathColorCoverageRatio,
    block.candidateOuterBoundaryPointCount,
    block.candidateOuterBoundaryPath,
    block.candidateBoundaryPointCount,
    block.candidateBoundaryPath,
    block.candidateHullPath,
    block.reviewAction,
  ]),
]);
await fs.writeFile(markdownPath, markdown, 'utf8');
await fs.writeFile(prioritySvgPath, priorityReviewSvg, 'utf8');

console.log(`manifest_json:${jsonPath}`);
console.log(`manifest_csv:${csvPath}`);
console.log(`manifest_markdown:${markdownPath}`);
console.log(`priority_svg:${prioritySvgPath}`);
console.log(`status:ok total=${summary.totalBlocks} review=${summary.needsOperatorReview} pixelCandidates=${summary.pixelCandidateReady}`);
