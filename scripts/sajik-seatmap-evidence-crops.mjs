import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_SEATMAP_IMAGE,
} from '../src/data/sajikSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const imagePath = path.resolve(frontendRoot, SAJIK_SEATMAP_IMAGE.imagePath);
const alignmentAuditPath = path.join(outDir, 'sajik-seatmap-alignment-audit.json');

const P0_BLOCKS = new Set([
  '111',
  '112',
  '113',
  '114',
  '115',
  '116',
  '121',
  '122',
  '123',
  '124',
  '125',
  '126',
  '127',
  '131',
  '132',
  '133',
  '134',
  '135',
  '136',
  '137',
  '142',
  '143',
  '021',
  '031',
  '041',
]);
const P0_CATEGORIES = new Set(['ACCESSIBLE', 'CENTRAL_TABLE', 'CENTRAL_UPPER_TABLE', 'AVENUEL', 'CAMPING', 'CHEER_TABLE']);
const P1_CATEGORIES = new Set([
  'CHEER_TABLE',
  'WIDE_TABLE',
  'INFIELD_TABLE',
  'EVERYTIME',
  'INFIELD_FIELD_1B',
  'INFIELD_FIELD_3A',
  'INFIELD_FIELD_3B',
]);

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const pathPoints = (pathData) => {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
};

const pathBounds = (pathData) => {
  const points = pathPoints(pathData);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

const polygonArea = (points) => {
  const signedArea = points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + ((point[0] * next[1]) - (next[0] * point[1]));
  }, 0);

  return Math.abs(signedArea / 2);
};

const reviewTierForBlock = (block) => {
  if (P0_BLOCKS.has(block.block) || P0_CATEGORIES.has(block.category)) return 'P0';
  if (block.level === '1F' || P1_CATEGORIES.has(block.category)) return 'P1';
  return 'P2';
};

const tierOrder = ['P0', 'P1', 'P2'];
const tierLabels = {
  P0: 'P0 thin first-base, central/table, special, accessible',
  P1: 'P1 1F infield, cheer, table, Everytime',
  P2: 'P2 remaining upper and outfield',
};

let alignmentSummary = null;
let alignmentByBlock = new Map();
try {
  const alignmentAudit = JSON.parse(await fs.readFile(alignmentAuditPath, 'utf8'));
  alignmentSummary = alignmentAudit.summary ?? null;
  alignmentByBlock = new Map((alignmentAudit.blocks ?? []).map((row) => [row.block, row]));
} catch {
  alignmentSummary = null;
  alignmentByBlock = new Map();
}

const blocksWithMetrics = SAJIK_BLOCKS.map((block) => {
  const points = pathPoints(block.imageGeometry.d);
  const alignment = alignmentByBlock.get(block.block);
  return {
    ...block,
    reviewTier: reviewTierForBlock(block),
    pointCount: points.length,
    area: Number(polygonArea(points).toFixed(2)),
    bounds: pathBounds(block.imageGeometry.d),
    alignment,
  };
});

const buildOverlaySvg = (tier, tierBlocks, viewport = {
  width: SAJIK_SEATMAP_IMAGE.imageWidth,
  height: SAJIK_SEATMAP_IMAGE.imageHeight,
  minX: 0,
  minY: 0,
  viewWidth: SAJIK_SEATMAP_IMAGE.imageWidth,
  viewHeight: SAJIK_SEATMAP_IMAGE.imageHeight,
}) => {
  const tierBlockKeys = new Set(tierBlocks.map((block) => block.block));

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="${viewport.minX} ${viewport.minY} ${viewport.viewWidth} ${viewport.viewHeight}">
  <style>
    .label { font: 900 9px Arial, sans-serif; text-anchor: middle; dominant-baseline: central; fill: #020617; stroke: #ffffff; stroke-width: 2.6px; paint-order: stroke; }
    .tier-label { font: 900 10px Arial, sans-serif; text-anchor: middle; dominant-baseline: central; fill: #7c2d12; stroke: #ffffff; stroke-width: 2.8px; paint-order: stroke; }
    .candidate { fill: none; stroke: #06b6d4; stroke-width: 1.6px; stroke-dasharray: 5 4; vector-effect: non-scaling-stroke; }
    .alias-only { fill: #f59e0b; fill-opacity: 0.16; stroke: #f59e0b; stroke-width: 2.6px; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
  </style>
  <rect x="${viewport.minX + 1}" y="${viewport.minY + 1}" width="${viewport.viewWidth - 2}" height="${viewport.viewHeight - 2}" fill="none" stroke="#0f172a" stroke-opacity="0.5" stroke-width="2" />
  ${blocksWithMetrics.map((block) => {
    const isTierBlock = tierBlockKeys.has(block.block) && (tier === 'FOCUS' || block.reviewTier === tier);
    const isAlignmentFailure = isTierBlock && block.alignment?.alignmentClass === 'RETRACE_REQUIRED';
    const isNotVisibleException = isTierBlock && block.alignment?.alignmentClass === 'OFFICIAL_PNG_BLOCK_NOT_VISIBLE';
    const isAliasOnly = block.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE';
    const category = SAJIK_CATEGORIES[block.category];
    const fill = category?.light ?? '#38bdf8';
    const stroke = isAlignmentFailure ? '#dc2626' : isNotVisibleException ? '#f59e0b' : isTierBlock ? '#ea580c' : '#64748b';
    const strokeWidth = isAlignmentFailure ? '3.2' : isTierBlock ? '2.2' : '1';

    return `
  <path class="${isAliasOnly && isTierBlock ? 'alias-only' : ''}" d="${xmlEscape(block.imageGeometry.d)}" fill="${fill}" fill-opacity="${isTierBlock ? '0.45' : '0.03'}" stroke="${stroke}" stroke-opacity="${isTierBlock ? '0.92' : '0.18'}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke">
    <title>${xmlEscape(`${block.block} ${block.name} ${block.pointCount}pt ${block.imageGeometry.traceVersion} ${block.alignment?.alignmentClass ?? 'alignment-not-run'}`)}</title>
  </path>
  ${isTierBlock && block.alignment?.candidateOuterBoundaryPath ? `<path class="candidate" d="${xmlEscape(block.alignment.candidateOuterBoundaryPath)}" />` : ''}
  ${isTierBlock ? `<circle cx="${block.imageGeometry.labelX}" cy="${block.imageGeometry.labelY}" r="3" fill="#ef4444" stroke="#ffffff" stroke-width="1.4" vector-effect="non-scaling-stroke" />` : ''}
  ${isTierBlock ? `<text class="${block.pointCount > 4 ? 'tier-label' : 'label'}" x="${block.imageGeometry.labelX}" y="${block.imageGeometry.labelY}" transform="rotate(${block.imageGeometry.labelRotate ?? 0} ${block.imageGeometry.labelX} ${block.imageGeometry.labelY})">${xmlEscape(block.imageGeometry.shortLabel)}</text>` : ''}`;
  }).join('')}
  <text x="${viewport.minX + 16}" y="${viewport.minY + viewport.viewHeight - 18}" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#f8fafc" stroke="#0f172a" stroke-width="3" paint-order="stroke">${xmlEscape(`${tier} ${tierBlocks.length} blocks · cyan=official PNG pixel candidate · amber=official PNG block not visible · red=retrace required`)}</text>
</svg>`;
};

const buildHeaderSvg = (tier, tierBlocks, width, height) => {
  const refined = tierBlocks.filter((block) => block.pointCount > 4).length;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" />
  <text x="14" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#0f172a">${xmlEscape(`Sajik ${tier} polygon evidence`)}</text>
  <text x="14" y="40" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#475569">${xmlEscape(`${tierLabels[tier]} · blocks=${tierBlocks.length} · refined=${refined} · source=OFFICIAL_PNG_MANUAL_POLYGON · version=manual-polygon-v2`)}</text>
</svg>`;
};

const renderTierPanel = async (tier, tierBlocks) => {
  const overlay = Buffer.from(buildOverlaySvg(tier, tierBlocks));
  const headerHeight = 54;
  const header = Buffer.from(buildHeaderSvg(tier, tierBlocks, SAJIK_SEATMAP_IMAGE.imageWidth, headerHeight));
  const panelBuffer = await sharp(imagePath)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .extend({ top: headerHeight, background: '#f8fafc' })
    .composite([{ input: header, left: 0, top: 0 }])
    .png()
    .toBuffer();

  const outputPath = path.join(outDir, `sajik-seatmap-evidence-${tier.toLowerCase()}.png`);
  await sharp(panelBuffer).toFile(outputPath);

  return {
    tier,
    outputPath,
    width: SAJIK_SEATMAP_IMAGE.imageWidth,
    height: SAJIK_SEATMAP_IMAGE.imageHeight + headerHeight,
    blockCount: tierBlocks.length,
    refinedCount: tierBlocks.filter((block) => block.pointCount > 4).length,
    blocks: tierBlocks.map((block) => ({
      id: block.id,
      block: block.block,
      name: block.name,
      mapInteractionStatus: block.mapInteractionStatus,
      alignmentClass: block.alignment?.alignmentClass ?? 'NOT_RUN',
      componentInsidePathRatio: block.alignment?.componentInsidePathRatio ?? null,
      pathColorCoverageRatio: block.alignment?.pathColorCoverageRatio ?? null,
      officialFailureReasons: block.alignment?.officialFailureReasons ?? [],
      pointCount: block.pointCount,
      area: block.area,
      bounds: block.bounds,
      path: block.imageGeometry.d,
    })),
  };
};

const focusCrops = [
  {
    id: 'p0-thin-first-base',
    title: 'P0 thin first-base, 143 strict lock, and 041 correction',
    left: 600,
    top: 320,
    width: 340,
    height: 235,
    blocks: ['111', '112', '113', '114', '115', '116', '121', '122', '123', '124', '125', '126', '127', '131', '132', '133', '134', '135', '136', '137', '142', '143', '021', '031', '041'],
  },
  {
    id: 'p0-retraced-3b-upper',
    title: 'P0 retraced - 3B upper thin blocks',
    left: 220,
    top: 75,
    width: 175,
    height: 170,
    blocks: ['332', '322', '331', '321', '312', '311'],
  },
  {
    id: 'p0-central-lower-011-review',
    title: 'P0 central lower - 011 alias-only review',
    left: 470,
    top: 390,
    width: 230,
    height: 95,
    blocks: ['024', '013', '023', '033', '022', '012', '021', '031', '011'],
  },
  {
    id: 'p1-retraced-everytime',
    title: 'P1 retraced - Everytime blocks',
    left: 790,
    top: 235,
    width: 135,
    height: 80,
    blocks: ['922', '903', '913', '914', '904', '923'],
  },
];

const renderFocusPanel = async (focus) => {
  const focusBlocks = blocksWithMetrics.filter((block) => focus.blocks.includes(block.block));
  const headerHeight = 54;
  const outputWidth = SAJIK_SEATMAP_IMAGE.imageWidth;
  const outputHeight = Math.round((focus.height / focus.width) * outputWidth);
  const overlay = Buffer.from(buildOverlaySvg('FOCUS', focusBlocks, {
    width: outputWidth,
    height: outputHeight,
    minX: focus.left,
    minY: focus.top,
    viewWidth: focus.width,
    viewHeight: focus.height,
  }));
  const header = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${headerHeight}" viewBox="0 0 ${outputWidth} ${headerHeight}">
  <rect x="0" y="0" width="${outputWidth}" height="${headerHeight}" fill="#f8fafc" />
  <text x="14" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#0f172a">${xmlEscape(`Sajik ${focus.title}`)}</text>
  <text x="14" y="40" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#475569">${xmlEscape(`blocks=${focusBlocks.length} · official PNG crop=${focus.left},${focus.top},${focus.width},${focus.height} · cyan=official pixel candidate`)}</text>
</svg>`);
  const cropBuffer = await sharp(imagePath)
    .extract({ left: focus.left, top: focus.top, width: focus.width, height: focus.height })
    .resize({ width: outputWidth, height: outputHeight, kernel: 'nearest' })
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();
  const panelBuffer = await sharp(cropBuffer)
    .extend({ top: headerHeight, background: '#f8fafc' })
    .composite([{ input: header, left: 0, top: 0 }])
    .png()
    .toBuffer();

  const outputPath = path.join(outDir, `sajik-seatmap-evidence-${focus.id}.png`);
  await sharp(panelBuffer).toFile(outputPath);

  return {
    tier: 'FOCUS',
    id: focus.id,
    outputPath,
    width: outputWidth,
    height: outputHeight + headerHeight,
    blockCount: focusBlocks.length,
    refinedCount: focusBlocks.filter((block) => block.pointCount > 4).length,
    blocks: focusBlocks.map((block) => ({
      block: block.block,
      mapInteractionStatus: block.mapInteractionStatus,
      alignmentClass: block.alignment?.alignmentClass ?? 'NOT_RUN',
      componentInsidePathRatio: block.alignment?.componentInsidePathRatio ?? null,
      pathColorCoverageRatio: block.alignment?.pathColorCoverageRatio ?? null,
      officialFailureReasons: block.alignment?.officialFailureReasons ?? [],
    })),
  };
};

await fs.mkdir(outDir, { recursive: true });

const metadata = await sharp(imagePath).metadata();
if (metadata.width !== SAJIK_SEATMAP_IMAGE.imageWidth || metadata.height !== SAJIK_SEATMAP_IMAGE.imageHeight) {
  throw new Error(`Unexpected Sajik image size: ${metadata.width}x${metadata.height}`);
}
if (SAJIK_BLOCKS.length !== 89) {
  throw new Error(`Sajik evidence requires 89 blocks. Actual: ${SAJIK_BLOCKS.length}`);
}

const invalidTraceBlocks = blocksWithMetrics.filter((block) => (
  block.imageGeometry.traceSource !== 'OFFICIAL_PNG_MANUAL_POLYGON'
  || block.imageGeometry.traceVersion !== 'manual-polygon-v2'
  || block.imageGeometry.manualReviewed !== true
));
if (invalidTraceBlocks.length > 0) {
  throw new Error(`Sajik evidence requires finalized v2 trace metadata: ${invalidTraceBlocks.map((block) => block.block).join(', ')}`);
}

const tierOutputs = [];
for (const tier of tierOrder) {
  tierOutputs.push(await renderTierPanel(tier, blocksWithMetrics.filter((block) => block.reviewTier === tier)));
}
const focusOutputs = [];
for (const focus of focusCrops) {
  focusOutputs.push(await renderFocusPanel(focus));
}

const contactSheetPath = path.join(outDir, 'sajik-seatmap-evidence-contact-sheet.png');
const sheetOutputs = [...focusOutputs, ...tierOutputs];
const contactSheetHeight = sheetOutputs.reduce((total, output) => total + output.height, 0);
await sharp({
  create: {
    width: SAJIK_SEATMAP_IMAGE.imageWidth,
    height: contactSheetHeight,
    channels: 3,
    background: '#f8fafc',
  },
})
  .composite(await Promise.all(sheetOutputs.map(async (output, index) => ({
    input: await fs.readFile(output.outputPath),
    left: 0,
    top: sheetOutputs.slice(0, index).reduce((total, item) => total + item.height, 0),
  }))))
  .png()
  .toFile(contactSheetPath);

const report = {
  generatedAt: new Date().toISOString(),
  asset: SAJIK_SEATMAP_IMAGE,
  contactSheetPath,
  summary: {
    totalBlocks: blocksWithMetrics.length,
    refinedPolygons: blocksWithMetrics.filter((block) => block.pointCount > 4).length,
    manualReviewRequired: blocksWithMetrics.filter((block) => block.imageGeometry.pixelAlignmentStatus === 'MANUAL_REVIEW_REQUIRED').length,
    mapSelectable: blocksWithMetrics.filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE').length,
    aliasOnlyOfficialPngBlockNotVisible: blocksWithMetrics.filter((block) => block.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE').length,
    manualReviewBlocks: blocksWithMetrics
      .filter((block) => block.imageGeometry.pixelAlignmentStatus === 'MANUAL_REVIEW_REQUIRED')
      .map((block) => block.block),
    p0Blocks: tierOutputs.find((output) => output.tier === 'P0')?.blockCount ?? 0,
    p1Blocks: tierOutputs.find((output) => output.tier === 'P1')?.blockCount ?? 0,
    p2Blocks: tierOutputs.find((output) => output.tier === 'P2')?.blockCount ?? 0,
    alignmentLockedVerified: alignmentSummary?.lockedVerified ?? null,
    officialPngBlockNotVisible: alignmentSummary?.officialPngBlockNotVisible ?? null,
    alignmentFailures: alignmentSummary?.officialAlignmentFailures ?? null,
  },
  tiers: tierOutputs,
  focus: focusOutputs,
};

const jsonPath = path.join(outDir, 'sajik-seatmap-evidence-crops.json');
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const markdownPath = path.join(outDir, 'sajik-seatmap-evidence-crops.md');
const markdown = [
  '# Sajik seatmap polygon evidence',
  '',
  `- Official asset: \`${SAJIK_SEATMAP_IMAGE.requiredAssetFileName}\` (${SAJIK_SEATMAP_IMAGE.imageWidth}x${SAJIK_SEATMAP_IMAGE.imageHeight})`,
  `- Trace source: \`OFFICIAL_PNG_MANUAL_POLYGON\``,
  `- Trace version: \`manual-polygon-v2\``,
  `- Total blocks: ${report.summary.totalBlocks}`,
  `- Refined polygons (>4 points): ${report.summary.refinedPolygons}`,
  `- Manual review required: ${report.summary.manualReviewRequired} (${report.summary.manualReviewBlocks.join(', ') || 'none'})`,
  `- Map selectable: ${report.summary.mapSelectable}`,
  `- Alias-only official PNG block not visible: ${report.summary.aliasOnlyOfficialPngBlockNotVisible}`,
  `- Alignment locked verified: ${report.summary.alignmentLockedVerified ?? 'not-run'}`,
  `- Official PNG block not visible: ${report.summary.officialPngBlockNotVisible ?? 'not-run'}`,
  `- Alignment failures: ${report.summary.alignmentFailures ?? 'not-run'}`,
  `- Contact sheet: ${contactSheetPath}`,
  '',
  markdownTable(
    ['tier', 'blocks', 'refined', 'evidence PNG'],
    [...focusOutputs, ...tierOutputs].map((output) => [
      `\`${output.id ?? output.tier}\``,
      String(output.blockCount),
      String(output.refinedCount),
      output.outputPath,
    ]),
  ),
  '',
].join('\n');
await fs.writeFile(markdownPath, markdown, 'utf8');

tierOutputs.forEach((output) => {
  console.log(`evidence_${output.tier.toLowerCase()}:${output.outputPath}`);
});
focusOutputs.forEach((output) => {
  console.log(`evidence_${output.id}:${output.outputPath}`);
});
console.log(`evidence_contact_sheet:${contactSheetPath}`);
console.log(`evidence_report:${jsonPath}`);
console.log(`evidence_markdown:${markdownPath}`);
