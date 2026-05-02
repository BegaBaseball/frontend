import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEJEON_BLOCKS,
  DAEJEON_BLOCK_GROUPS,
  DAEJEON_SECTION_COVERAGE,
  DAEJEON_SEATMAP_IMAGE,
  DAEJEON_TRACE_REVIEW_SUMMARY,
  getDaejeonTraceMethodLabel,
  getDaejeonTraceStatusLabel,
  getDaejeonViewInfo,
} from '../src/data/daejeonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));

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

const markdownBlockIdSummary = (blockIds) => {
  if (blockIds.length === 0) return '-';
  if (blockIds.length <= 12) return blockIds.map((id) => `\`${id}\``).join('<br>');

  return [
    `count ${blockIds.length}`,
    ...blockIds.slice(0, 5).map((id) => `\`${id}\``),
    '...',
    ...blockIds.slice(-3).map((id) => `\`${id}\``),
  ].join('<br>');
};

const pathToPoints = (d) => {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
};

const polygonArea = (points) => {
  const signedArea = points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0);

  return Math.abs(signedArea) / 2;
};

const isPointInsidePolygon = (points, point) => {
  const [x, y] = point;
  let inside = false;

  for (let index = 0, previousIndex = points.length - 1; index < points.length; previousIndex = index++) {
    const [xi, yi] = points[index];
    const [xj, yj] = points[previousIndex];
    const intersects = (yi > y) !== (yj > y)
      && x < (((xj - xi) * (y - yi)) / (yj - yi)) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
};

const getSeatMapLayer = (block) => {
  if (block.category === 'ACCESSIBLE') return 40;
  if (block.category === 'SPECIAL' || block.category === 'EXCITING') return 30;
  if (block.category === 'SKY') return 20;
  return 10;
};

const getTraceLayer = (block) => (block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 1 : 0);

const formatArea = (value) => Number(value.toFixed(2));

const renderOrderedBlocks = [...DAEJEON_BLOCKS].sort((a, b) => (
  getSeatMapLayer(a) - getSeatMapLayer(b)
  || getTraceLayer(a) - getTraceLayer(b)
  || a.displayPriority - b.displayPriority
));

const blockRows = DAEJEON_BLOCKS.map((block) => {
  const viewInfo = getDaejeonViewInfo(block);
  const hitAreaD = block.hitAreaD ?? block.imageGeometry.d;
  const hitAreaPoints = pathToPoints(hitAreaD);
  const labelPoint = [block.imageGeometry.labelX, block.imageGeometry.labelY];
  const hitStack = renderOrderedBlocks.filter((candidate) => (
    isPointInsidePolygon(pathToPoints(candidate.hitAreaD ?? candidate.imageGeometry.d), labelPoint)
  ));
  const labelTopHitBlockId = hitStack[hitStack.length - 1]?.id ?? null;
  const hitAreaArea = formatArea(polygonArea(hitAreaPoints));

  return {
    id: block.id,
    parentId: block.parentId,
    officialSectionName: block.officialSectionName,
    name: block.name,
    parentBlock: block.parentBlock,
    blockCode: block.blockCode,
    officialBlockLabel: block.officialBlockLabel,
    traceStatus: block.traceStatus,
    traceStatusLabel: getDaejeonTraceStatusLabel(block.traceStatus),
    traceMethod: block.traceMethod,
    traceMethodLabel: getDaejeonTraceMethodLabel(block.traceMethod),
    reviewNote: block.reviewNote ?? '',
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    hitAreaD,
    hitAreaArea,
    labelTopHitBlockId,
    labelTopHitOk: labelTopHitBlockId === block.id,
    labelHitStack: hitStack.map((candidate) => candidate.id),
    viewDistance: viewInfo.distance ?? '',
    viewNotes: viewInfo.notes ?? '',
    viewTags: viewInfo.tags ?? [],
  };
});

const hitAreaAreas = blockRows.map((block) => block.hitAreaArea).sort((a, b) => a - b);
const pickPercentile = (values, percentile) => {
  if (values.length === 0) return 0;
  const index = Math.min(values.length - 1, Math.floor(values.length * percentile));
  return values[index];
};

const labelTopHitFailures = blockRows
  .filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED' && !block.labelTopHitOk)
  .map((block) => ({
    id: block.id,
    officialBlockLabel: block.officialBlockLabel,
    labelTopHitBlockId: block.labelTopHitBlockId,
    labelHitStack: block.labelHitStack,
  }));

const precisionAudit = {
  standard: 'JAMSIL_CLICK_ACCURACY_BASELINE',
  totalBlocks: DAEJEON_BLOCKS.length,
  manualGeometryBlocks: DAEJEON_BLOCKS.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
  labelTopHitFailures,
  labelTopHitFailureCount: labelTopHitFailures.length,
  hitAreaArea: {
    min: formatArea(hitAreaAreas[0] ?? 0),
    p10: formatArea(pickPercentile(hitAreaAreas, 0.1)),
    median: formatArea(pickPercentile(hitAreaAreas, 0.5)),
    p90: formatArea(pickPercentile(hitAreaAreas, 0.9)),
    max: formatArea(hitAreaAreas[hitAreaAreas.length - 1] ?? 0),
    tinyHitAreas: blockRows
      .filter((block) => block.hitAreaArea < 10)
      .map((block) => block.id),
    largeHitAreas: blockRows
      .filter((block) => block.hitAreaArea > 5000)
      .map((block) => block.id),
  },
  regressionBlocks: [
    'innings-vip-400__400',
    'splash-jacuzzi-425__425',
    'splash-caravan-426__426',
  ],
  desktopFullLabelClickViewport: '>=1000px',
  note: 'Label top-hit은 실제 SVG 렌더 순서와 같은 layer/traceStatus/displayPriority 기준으로 산출합니다.',
};

const manifest = {
  generatedAt: new Date().toISOString(),
  asset: DAEJEON_SEATMAP_IMAGE,
  summary: DAEJEON_TRACE_REVIEW_SUMMARY,
  precisionAudit,
  groups: DAEJEON_BLOCK_GROUPS.map((group) => ({
    id: group.id,
    officialSectionName: group.officialSectionName,
    name: group.name,
    block: group.block,
    level: group.level,
    side: group.side,
    fanRole: group.fanRole,
    traceStatus: group.traceStatus,
    traceMethod: group.traceMethod,
    officialBlocks: group.officialBlocks,
    imageGeometry: group.imageGeometry,
  })),
  sectionCoverage: DAEJEON_SECTION_COVERAGE,
  blocks: blockRows,
};

const markdown = [
  '# 대전 한화생명볼파크 좌석도 좌표 검수 manifest',
  '',
  `- 공식 이미지: \`${DAEJEON_SEATMAP_IMAGE.requiredAssetFileName}\` (${DAEJEON_SEATMAP_IMAGE.imageWidth}x${DAEJEON_SEATMAP_IMAGE.imageHeight})`,
  `- source: ${DAEJEON_SEATMAP_IMAGE.sourceLabel}`,
  `- assetSha256: \`${DAEJEON_SEATMAP_IMAGE.assetSha256}\``,
  `- total blocks: ${DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks}`,
  `- official image traced: ${DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced}`,
  `- needs operator review: ${DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview}`,
  `- label top-hit failures: ${precisionAudit.labelTopHitFailureCount}`,
  `- hit-area area: min ${precisionAudit.hitAreaArea.min}, median ${precisionAudit.hitAreaArea.median}, p90 ${precisionAudit.hitAreaArea.p90}, max ${precisionAudit.hitAreaArea.max}`,
  '',
  '## 부모 구역별 pending 요약',
  '',
  markdownTable(
    ['parentId', 'officialSectionName', 'name', 'block', 'pending', 'total'],
    DAEJEON_TRACE_REVIEW_SUMMARY.pendingByParent.map((summary) => [
      `\`${summary.parentId}\``,
      summary.officialSectionName,
      summary.name,
      summary.block,
      String(summary.needsOperatorReview),
      String(summary.totalBlocks),
    ]),
  ),
  '',
  '## 공식 섹션별 pending 요약',
  '',
  markdownTable(
    ['officialSectionName', 'coverageStatus', 'pending', 'traced', 'total'],
    DAEJEON_TRACE_REVIEW_SUMMARY.pendingByOfficialSection.map((summary) => [
      summary.officialSectionName,
      summary.coverageStatus,
      String(summary.needsOperatorReview),
      String(summary.officialImageTraced),
      String(summary.totalBlocks),
    ]),
  ),
  '',
  '## 잠실 기준 정밀도 검수',
  '',
  markdownTable(
    ['metric', 'value'],
    [
      ['기준', precisionAudit.standard],
      ['수동 geometry 블록', `${precisionAudit.manualGeometryBlocks}/${precisionAudit.totalBlocks}`],
      ['label top-hit 실패', String(precisionAudit.labelTopHitFailureCount)],
      ['작은 hit-area(<10)', String(precisionAudit.hitAreaArea.tinyHitAreas.length)],
      ['큰 hit-area(>5000)', String(precisionAudit.hitAreaArea.largeHitAreas.length)],
      ['전수 label click QA viewport', precisionAudit.desktopFullLabelClickViewport],
    ],
  ),
  '',
  '## 면적 outlier 참고',
  '',
  markdownTable(
    ['type', 'blockIds'],
    [
      ['tiny', markdownBlockIdSummary(precisionAudit.hitAreaArea.tinyHitAreas)],
      ['large', markdownBlockIdSummary(precisionAudit.hitAreaArea.largeHitAreas)],
    ],
  ),
  '',
  '## 검수 방법',
  '',
  '1. `/stadium?daejeonDebug=1`에서 dashed parent boundary와 orange child boundary를 비교합니다.',
  '2. CSV의 `hitAreaD`, `labelX`, `labelY`를 기준으로 블록별 좌표를 보정합니다.',
  '3. 보정 완료된 child만 `traceStatus`를 `OFFICIAL_IMAGE_TRACED`로 올리고 `reviewNote`를 갱신합니다.',
  '4. 공식 이미지에서 판단할 수 없는 블록은 임의 좌표를 만들지 않고 `MANUAL_BASEBALL_DATA_REQUIRED` 검수 메모를 남깁니다.',
  '',
].join('\n');

await fs.mkdir(outDir, { recursive: true });

const jsonPath = path.join(outDir, 'daejeon-seatmap-trace-review.json');
const csvPath = path.join(outDir, 'daejeon-seatmap-trace-review.csv');
const markdownPath = path.join(outDir, 'daejeon-seatmap-trace-review.md');

await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'parentId',
    'officialSectionName',
    'name',
    'parentBlock',
    'blockCode',
    'officialBlockLabel',
    'traceStatus',
    'traceStatusLabel',
    'traceMethod',
    'traceMethodLabel',
    'reviewNote',
    'labelX',
    'labelY',
    'hitAreaArea',
    'labelTopHitBlockId',
    'labelTopHitOk',
    'hitAreaD',
    'viewDistance',
    'viewNotes',
    'viewTags',
  ],
  ...blockRows.map((block) => [
    block.id,
    block.parentId,
    block.officialSectionName,
    block.name,
    block.parentBlock,
    block.blockCode,
    block.officialBlockLabel,
    block.traceStatus,
    block.traceStatusLabel,
    block.traceMethod,
    block.traceMethodLabel,
    block.reviewNote,
    block.labelX,
    block.labelY,
    block.hitAreaArea,
    block.labelTopHitBlockId ?? '',
    block.labelTopHitOk,
    block.hitAreaD,
    block.viewDistance,
    block.viewNotes,
    block.viewTags.join('|'),
  ]),
]);
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`manifest_json:${jsonPath}`);
console.log(`manifest_csv:${csvPath}`);
console.log(`manifest_markdown:${markdownPath}`);
console.log(`status:ok total=${DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks} review=${DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview} traced=${DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced} labelTopHitFailures=${precisionAudit.labelTopHitFailureCount}`);
