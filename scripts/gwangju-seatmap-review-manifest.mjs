import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_BLOCKS,
  GWANGJU_COORDINATE_TRACE_STATUS,
  GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_SELECTABLE_BLOCKS_READY,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_TRACE_REVIEW_REGIONS,
} from '../src/data/gwangjuSeatData.ts';

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

const reviewRegionByBlockId = new Map();
GWANGJU_TRACE_REVIEW_REGIONS.forEach((region) => {
  region.blockIds.forEach((blockId) => {
    reviewRegionByBlockId.set(blockId, region);
  });
});

const blockRows = GWANGJU_BLOCKS.map((block) => {
  const region = reviewRegionByBlockId.get(block.id);

  return {
    id: block.id,
    name: block.name,
    block: block.block,
    category: block.category,
    level: block.level,
    side: block.side,
    fanRole: block.fanRole,
    reviewRegionId: region?.id ?? 'UNASSIGNED',
    tracePriority: region?.priority ?? 'P0',
    traceMethod: region?.method ?? 'APPROXIMATE_MANUAL_POLYGON',
    traceNote: region?.note ?? '',
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    label: block.imageGeometry.shortLabel,
    path: block.imageGeometry.d,
  };
});

const regionRows = GWANGJU_TRACE_REVIEW_REGIONS.map((region) => {
  const activeBlockCount = region.blockIds.filter((id) => GWANGJU_BLOCKS.some((block) => block.id === id)).length;
  return {
    id: region.id,
    label: region.label,
    priority: region.priority,
    method: region.method,
    activeBlockCount,
    totalReferences: region.blockIds.length,
    note: region.note,
  };
});

const summary = {
  traceStatus: GWANGJU_COORDINATE_TRACE_STATUS,
  selectableBlocksReady: GWANGJU_SELECTABLE_BLOCKS_READY,
  totalBlocks: GWANGJU_BLOCKS.length,
  generatedRotatedBoxBlocks: blockRows.filter((row) => row.traceMethod === 'GENERATED_ROTATED_BOX').length,
  officialImagePixelTraceBlocks: blockRows.filter((row) => row.traceMethod === 'OFFICIAL_IMAGE_PIXEL_TRACE').length,
  approximateManualBlocks: blockRows.filter((row) => row.traceMethod === 'APPROXIMATE_MANUAL_POLYGON').length,
  operatorRequiredSections: GWANGJU_OPERATOR_SECTION_REQUIREMENTS.filter((section) => section.status !== 'READY').map((section) => section.name),
};

const manifest = {
  generatedAt: new Date().toISOString(),
  asset: GWANGJU_SEATMAP_IMAGE,
  summary,
  reviewRegions: regionRows,
  markerOnlyZones: GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  blocks: blockRows,
};

const markdown = [
  '# 광주-KIA 챔피언스필드 좌석도 좌표 재트레이싱 manifest',
  '',
  `- 공식 이미지: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
  `- 좌표 상태: \`${GWANGJU_COORDINATE_TRACE_STATUS}\``,
  `- 선택 활성화: \`${GWANGJU_SELECTABLE_BLOCKS_READY}\``,
  `- active blocks: ${summary.totalBlocks}`,
  `- generated rotated box blocks: ${summary.generatedRotatedBoxBlocks}`,
  `- official image pixel trace blocks: ${summary.officialImagePixelTraceBlocks}`,
  `- approximate manual blocks: ${summary.approximateManualBlocks}`,
  `- operator required: ${summary.operatorRequiredSections.join(', ') || '-'}`,
  '',
  '## 재트레이싱 구역',
  '',
  markdownTable(
    ['id', 'label', 'priority', 'method', 'active', 'total', 'note'],
    regionRows.map((region) => [
      `\`${region.id}\``,
      region.label,
      region.priority,
      region.method,
      String(region.activeBlockCount),
      String(region.totalReferences),
      region.note,
    ]),
  ),
  '',
  '## 검수 방법',
  '',
  '1. `npm run qa:stadium:gwangju:trace-review`를 실행해 debug overlay screenshot과 CSV를 생성합니다.',
  '2. `/stadium?gwangjuDebug=hit`에서 공식 PNG와 polygon을 같은 2200x1159 좌표계로 비교합니다.',
  '3. `GENERATED_ROTATED_BOX` 대상은 center/angle 박스를 제거하고 실제 블록 경계의 per-block polygon으로 교체합니다.',
  '4. `APPROXIMATE_MANUAL_POLYGON` 대상은 번호/알파벳 영역 중앙이 아니라 실제 색상 경계를 따라 꼭짓점을 재배치합니다.',
  '5. K7석/원정응원석은 운영자 제공 polygon이 들어오기 전까지 hit-area를 만들지 않습니다.',
  '',
].join('\n');

await fs.mkdir(outDir, { recursive: true });

const jsonPath = path.join(outDir, 'gwangju-seatmap-trace-review.json');
const csvPath = path.join(outDir, 'gwangju-seatmap-trace-review.csv');
const markdownPath = path.join(outDir, 'gwangju-seatmap-trace-review.md');

await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'name',
    'block',
    'category',
    'level',
    'side',
    'fanRole',
    'reviewRegionId',
    'tracePriority',
    'traceMethod',
    'traceNote',
    'labelX',
    'labelY',
    'label',
    'path',
  ],
  ...blockRows.map((block) => [
    block.id,
    block.name,
    block.block,
    block.category,
    block.level,
    block.side,
    block.fanRole,
    block.reviewRegionId,
    block.tracePriority,
    block.traceMethod,
    block.traceNote,
    block.labelX,
    block.labelY,
    block.label,
    block.path,
  ]),
]);
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`manifest_json:${jsonPath}`);
console.log(`manifest_csv:${csvPath}`);
console.log(`manifest_markdown:${markdownPath}`);
console.log(`status:ok total=${summary.totalBlocks} generated=${summary.generatedRotatedBoxBlocks} pixel_trace=${summary.officialImagePixelTraceBlocks} selectable=${summary.selectableBlocksReady}`);
