import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  buildAnchorReviewCrops,
  cropCriteriaByGroup,
  cropGroupOrder,
  defaultPassCriteria,
  defaultRejectCriteria,
  p0ReviewCropIds,
  p1ReviewCropIds,
  p2ManualOnlyCropIds,
  regressionTestIdsByCropId,
  reviewContractVersion,
  reviewMetadataForCrop,
  riskTagsByCropId,
} from './daejeon-seatmap-anchor-contract.mjs';
import { DAEJEON_BLOCKS } from '../src/data/daejeonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const imagePath = path.join(
  frontendRoot,
  'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png',
);
const outDir = path.join(repoRoot, 'output/playwright/daejeon-anchor-review');

const blocksById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
const crops = buildAnchorReviewCrops(outDir);
const anchorCropReviewContract = 'DAEJEON_ANCHOR_CROP_REVIEW_V2';
const requiredStaticCropIds = [
  'first-101-109',
  'third-121-124',
  'third-120-122-detail',
  'third-113-117-wide',
  'home-100',
  'first-109-112-sequence',
  'cass-200-detail',
  'third-113-120-sequence',
  'first-201-212-sequence',
  'first-4f-table-301-413-sequence',
  'third-4f-table-414-330-sequence',
  'outfield-upper-500-509-sequence',
  'first-104-106-detail',
  'first-107-110-detail',
  'third-119-121-detail',
  'third-115-117-detail',
  'third-116-121-detail',
  'third-113-114-detail',
  'third-213-225-sequence',
  'third-221-225-detail',
  'third-213-219-detail',
  'special-400-accessible-first',
  'special-425-426-third-accessible',
  'special-accessible-center',
  'special-accessible-outfield-third',
  'skybox-s01-s12-sequence',
  'skybox-s13-s25-sequence',
  'skybox-s26-s37-sequence',
];
const manualCropOnlyReviewMode = 'MANUAL_CROP_ONLY';
const requiredRegressionIds = [
  'P0_FIRST_101_109_SEQUENCE_DRIFT_REGRESSION',
  'P0_THIRD_121_124_SPLIT_COLOR_REGRESSION',
  'P0_THIRD_120_122_BOUNDARY_REGRESSION',
  'P0_THIRD_113_117_DRIFT_REGRESSION',
  'P1_HOME_100_STACK_REGRESSION',
  'P1_FIRST_109_112_SEQUENCE_REGRESSION',
  'P1_CASS_200_SPECIAL_CELL_REGRESSION',
  'P1_THIRD_113_120_SEQUENCE_REGRESSION',
  'P1_FIRST_201_212_SMALL_BLOCK_REGRESSION',
  'P1_FIRST_4F_301_413_SEQUENCE_REGRESSION',
  'P1_THIRD_4F_414_330_SEQUENCE_REGRESSION',
  'P1_OUTFIELD_500_509_SEQUENCE_REGRESSION',
  'P2_FIRST_104_106_DETAIL_REGRESSION',
  'P2_FIRST_107_110_DETAIL_REGRESSION',
  'P2_THIRD_119_121_DETAIL_REGRESSION',
  'P2_THIRD_115_117_DETAIL_REGRESSION',
  'P2_THIRD_116_121_DETAIL_REGRESSION',
  'P2_THIRD_113_114_DETAIL_REGRESSION',
  'P2_THIRD_213_225_SEQUENCE_REGRESSION',
  'P2_THIRD_221_225_DETAIL_REGRESSION',
  'P2_THIRD_213_219_DETAIL_REGRESSION',
  'P2_SKYBOX_S01_S12_SEQUENCE_REGRESSION',
  'P2_SKYBOX_S13_S25_SEQUENCE_REGRESSION',
  'P2_SKYBOX_S26_S37_SEQUENCE_REGRESSION',
  'P2_SPECIAL_400_ACCESSIBLE_FIRST_REGRESSION',
  'P2_SPECIAL_425_426_THIRD_ACCESSIBLE_REGRESSION',
  'P2_SPECIAL_ACCESSIBLE_CENTER_REGRESSION',
  'P2_SPECIAL_ACCESSIBLE_OUTFIELD_THIRD_REGRESSION',
];
const requiredReviewFocusSnippets = ['104 단일 셀, 105-109', '121 split-color'];
const palette = ['#ef4444', '#2563eb', '#16a34a', '#f97316', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#0f766e'];

const sha256Buffer = (buffer) => createHash('sha256').update(buffer).digest('hex');

if (reviewContractVersion !== anchorCropReviewContract) {
  throw new Error(`Unexpected Daejeon anchor crop review contract: ${reviewContractVersion}`);
}

requiredStaticCropIds.forEach((cropId) => {
  if (!crops.some((crop) => crop.id === cropId)) {
    throw new Error(`Missing required Daejeon anchor crop: ${cropId}`);
  }
});

if (
  p0ReviewCropIds.size === 0
  || p1ReviewCropIds.size === 0
  || defaultPassCriteria.length === 0
  || defaultRejectCriteria.length === 0
  || cropCriteriaByGroup.size === 0
  || riskTagsByCropId.size === 0
  || regressionTestIdsByCropId.size === 0
) {
  throw new Error('Daejeon anchor crop review metadata contract is incomplete');
}

const knownRegressionIds = new Set([...regressionTestIdsByCropId.values()].flat());
requiredRegressionIds.forEach((regressionId) => {
  if (!knownRegressionIds.has(regressionId)) {
    throw new Error(`Missing Daejeon anchor crop regression id: ${regressionId}`);
  }
});

requiredReviewFocusSnippets.forEach((snippet) => {
  const found = [...cropCriteriaByGroup.values()].some((criteria) => (
    [...criteria.pass, ...criteria.reject].some((item) => item.includes(snippet))
  ));
  if (!found) {
    throw new Error(`Missing Daejeon anchor crop criteria snippet: ${snippet}`);
  }
});

function escapeXml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[char]);
}

function gridLines(crop) {
  const lines = [];

  for (let x = Math.ceil(crop.x / 10) * 10; x <= crop.x + crop.width; x += 10) {
    const major = x % 50 === 0;
    lines.push(`<line x1="${x}" y1="${crop.y}" x2="${x}" y2="${crop.y + crop.height}" stroke="${major ? '#0f172a' : '#94a3b8'}" stroke-width="${major ? 0.8 : 0.35}" opacity="${major ? 0.4 : 0.25}" />`);
  }

  for (let y = Math.ceil(crop.y / 10) * 10; y <= crop.y + crop.height; y += 10) {
    const major = y % 50 === 0;
    lines.push(`<line x1="${crop.x}" y1="${y}" x2="${crop.x + crop.width}" y2="${y}" stroke="${major ? '#0f172a' : '#94a3b8'}" stroke-width="${major ? 0.8 : 0.35}" opacity="${major ? 0.4 : 0.25}" />`);
  }

  return lines.join('\n');
}

function overlaySvg(crop, blocks) {
  const paths = blocks.map((block, index) => {
    const color = palette[index % palette.length];
    const geometry = block.imageGeometry;

    return [
      `<path d="${escapeXml(geometry.d)}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="2.2" vector-effect="non-scaling-stroke" />`,
      `<circle cx="${geometry.labelX}" cy="${geometry.labelY}" r="3" fill="${color}" stroke="white" stroke-width="1" />`,
      `<text x="${geometry.labelX + 4}" y="${geometry.labelY - 4}" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="${color}" stroke="white" stroke-width="2" paint-order="stroke">${escapeXml(block.blockCode)}</text>`,
    ].join('\n');
  }).join('\n');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
  ${gridLines(crop)}
  ${paths}
  <rect x="${crop.x + 0.5}" y="${crop.y + 0.5}" width="${crop.width - 1}" height="${crop.height - 1}" fill="none" stroke="#111827" stroke-width="1" />
  </svg>`;
}

await fs.mkdir(outDir, { recursive: true });

const outputs = [];

for (const crop of crops) {
  const blocks = crop.blocks.map((id) => blocksById.get(id));
  const missingIds = crop.blocks.filter((id, index) => !blocks[index]);

  if (missingIds.length > 0) {
    throw new Error(`${crop.id} crop references missing Daejeon blocks: ${missingIds.join(', ')}`);
  }

  const cropBuffer = await sharp(imagePath)
    .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
    .composite([{ input: Buffer.from(overlaySvg(crop, blocks)), left: 0, top: 0 }])
    .png()
    .toBuffer();

  const outputPath = path.join(outDir, `${crop.id}.png`);
  const outputBuffer = await sharp(cropBuffer)
    .resize({ width: crop.width * 3, height: crop.height * 3, kernel: 'nearest' })
    .png()
    .toBuffer();
  await fs.writeFile(outputPath, outputBuffer);

  outputs.push({
    outputPath,
    sha256: sha256Buffer(outputBuffer),
  });
}

const indexRows = crops.map((crop, index) => ({
  id: crop.id,
  outputPath: outputs[index].outputPath,
  sha256: outputs[index].sha256,
  reviewContractVersion,
  ...reviewMetadataForCrop(crop, blocksById),
  blockCount: crop.blocks.length,
  crop: {
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
  },
  blocks: crop.blocks,
}));
const indexJsonPath = path.join(outDir, 'daejeon-anchor-review-crops.json');
const indexMarkdownPath = path.join(outDir, 'daejeon-anchor-review-crops.md');
await fs.writeFile(indexJsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), reviewContractVersion, crops: indexRows }, null, 2)}\n`, 'utf8');
const groupedIndexRows = cropGroupOrder
  .flatMap((group) => {
    const rows = indexRows.filter((row) => row.group === group);
    if (rows.length === 0) return [];
    return [
      `## ${group}`,
      '',
      '| crop | purpose | review focus | pass criteria | reject criteria | representative blocks | bounds | output |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      ...rows.map((row) => [
        `${row.reviewPriority} ${row.id}<br>mode: \`${row.reviewMode}\`<br>${row.riskTags.map((tag) => `\`${tag}\``).join(' ')}`,
        row.purpose,
        row.reviewFocus,
        [
          ...row.passCriteria.map((item) => `- ${item}`),
          ...(row.regressionTestIds.length ? [`- 자동 회귀 테스트: ${row.regressionTestIds.map((id) => `\`${id}\``).join(', ')}`] : []),
          ...(row.manualOnlyReason ? [`- 수동 검수 유지: ${row.manualOnlyReason}`] : []),
        ].join('<br>'),
        row.rejectCriteria.map((item) => `- ${item}`).join('<br>'),
        row.representativeBlocks.map((block) => `\`${block}\``).join('<br>'),
        `x=${row.crop.x}, y=${row.crop.y}, ${row.crop.width}x${row.crop.height}`,
        `\`${row.outputPath}\``,
      ].join(' | ')).map((row) => `| ${row} |`),
      '',
    ];
  });

await fs.writeFile(indexMarkdownPath, [
  '# Daejeon Anchor Review Crops',
  '',
  'Official PNG 기준 overlay anchor crop 목록입니다. 각 path는 운영 geometry가 아니라 검수 산출물입니다.',
  `review contract: \`${reviewContractVersion}\``,
  '',
  '## Summary',
  '',
  `- total crops: ${indexRows.length}`,
  `- total covered block references: ${indexRows.reduce((sum, row) => sum + row.blockCount, 0)}`,
  '- required review order: home -> first -> third -> outfield -> skybox -> special',
  '- priority order: P0 -> P1 -> P2',
  '',
  ...groupedIndexRows,
].join('\n'), 'utf8');

console.log(`daejeon_anchor_review:${outDir}`);
console.log(`anchor_index_json:${indexJsonPath}`);
console.log(`anchor_index_markdown:${indexMarkdownPath}`);
outputs.forEach((output) => console.log(`crop:${output.outputPath}`));
