import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GOCHEOK_BLOCKS,
  GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS,
  GOCHEOK_OMITTED_OFFICIAL_BLOCKS,
  GOCHEOK_SEATMAP_IMAGE,
  GOCHEOK_TRACE_REVIEW_REGIONS,
  GOCHEOK_TRACE_REVIEWED_BLOCK_IDS,
} from '../src/data/gocheokSeatData.ts';

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
  '1. `npm run qa:stadium:gocheok:trace-review`를 실행해 manifest, evidence crop, debug overlay screenshot을 생성합니다.',
  '2. CSV의 `candidateHullPath`와 현재 `path`를 비교하고, 공식 PNG 경계가 불명확하면 TODO에 남깁니다.',
  '3. 승인된 블록만 `GOCHEOK_TRACE_REVIEWED_BLOCK_IDS`에 추가합니다.',
  '4. `npm run stadium:gocheok:evidence`로 주요 crop overlay 증빙을 갱신합니다.',
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
