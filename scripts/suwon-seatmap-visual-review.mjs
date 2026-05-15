import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SUWON_ALIGNMENT_PROBES,
  SUWON_BLOCKS,
  SUWON_BROWSER_QA_PROBES,
  SUWON_CATEGORIES,
  SUWON_HIT_GEOMETRY_EXCEPTION_NOTES,
  SUWON_SEATMAP_IMAGE,
} from '../src/data/suwonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const manifestPath = path.join(reportDir, 'suwon-seatmap-visual-review.json');
const markdownPath = path.join(reportDir, 'suwon-seatmap-visual-review.md');
const officialImageHref = `../../${SUWON_SEATMAP_IMAGE.imagePath}`;
const EXPECTED_REVIEWED_BLOCKS = SUWON_BLOCKS.length;

const REVIEW_GROUPS = [
  {
    id: 'infield-1f',
    label: '1층 내야/응원/중앙',
    overlayFileName: 'suwon-infield-1f-overlay.svg',
    reviewFocus: '101-133 전체가 공식 이미지의 1층 색상 블록과 일치하고 하이파이브존/중앙 띠와 시각적으로 분리되는지 확인',
    blockIds: Array.from({ length: 33 }, (_, index) => `suwon-${101 + index}`),
  },
  {
    id: 'infield-2f',
    label: '2층 내야 잔여 구역',
    overlayFileName: 'suwon-infield-2f-overlay.svg',
    reviewFocus: '201-204와 216-233 잔여 2층 구역이 205-215 별도 검수 구간 및 중앙 하단 구역과 밀리지 않는지 확인',
    blockIds: [
      ...Array.from({ length: 4 }, (_, index) => `suwon-${201 + index}`),
      ...Array.from({ length: 18 }, (_, index) => `suwon-${216 + index}`),
    ],
  },
  {
    id: 'infield-3f',
    label: '3층 내야/중앙',
    overlayFileName: 'suwon-infield-3f-overlay.svg',
    reviewFocus: '301-328 전체가 3층 공식 색상 블록과 일치하고 313-316 중앙/휠체어석 하단 경계를 침범하지 않는지 확인',
    blockIds: Array.from({ length: 28 }, (_, index) => `suwon-${301 + index}`),
  },
  {
    id: 'center-accessible',
    label: '지니존/휠체어석',
    overlayFileName: 'suwon-center-accessible-overlay.svg',
    reviewFocus: '지니존과 중앙/1루/3루 휠체어석이 하단 중앙 띠 안에 머물고 314-316 및 스카이박스 하단 구역을 먹지 않는지 확인',
    blockIds: ['suwon-genie', 'suwon-wheel-center', 'suwon-wheel-1b', 'suwon-wheel-3b'],
  },
  {
    id: 'outfield-special',
    label: '외야 특수석/잔디석',
    overlayFileName: 'suwon-outfield-special-overlay.svg',
    reviewFocus: '외야 잔디 자유석이 좌/우 1개씩만 보이고, 7 PUB/K-LIVE/외야테이블/그린존/우측 특수석을 먹지 않는지 확인',
    blockIds: [
      'suwon-lf-grass',
      'suwon-rf-grass',
      'suwon-7pub',
      'suwon-k-live',
      'suwon-green',
      'suwon-501-508',
      'suwon-hite-pub',
      'suwon-kids-camp',
      'suwon-wiz-garden',
    ],
  },
  {
    id: 'highfive',
    label: '하이파이브존',
    overlayFileName: 'suwon-highfive-overlay.svg',
    reviewFocus: '1루/3루 하이파이브존이 공식 이미지의 짧은 색상 띠에 머무르고 숫자 블록/통로로 과대 확장되지 않는지 확인',
    blockIds: ['suwon-3b-highfive', 'suwon-1b-highfive'],
  },
  {
    id: 'section-205-215',
    label: '205-215 내야 경계',
    overlayFileName: 'suwon-205-215-overlay.svg',
    reviewFocus: '205-215 구역선이 공식 이미지의 사선 흐름과 맞고 인접 204/216 및 하단 중앙 구역으로 밀리지 않는지 확인',
    blockIds: Array.from({ length: 11 }, (_, index) => `suwon-${205 + index}`),
  },
  {
    id: 'skybox-skyzone',
    label: '스카이박스/스카이존',
    overlayFileName: 'suwon-skybox-skyzone-overlay.svg',
    reviewFocus: 'SB1-SB35 compact hit-area와 401-432 visual polygon이 서로를 먹지 않고 라벨 중심 probe와 일치하는지 확인',
    blockIds: [
      ...Array.from({ length: 35 }, (_, index) => `suwon-sb${index + 1}`),
      ...Array.from({ length: 32 }, (_, index) => `suwon-${401 + index}`),
    ],
  },
];

const APPROVED_LARGE_VISUAL_AREA_NOTES = new Map([
  [
    'suwon-lf-grass',
    '공식 이미지의 3루 외야 잔디 자유석 connected green component 전체를 단일 선택 구역으로 유지합니다. 픽셀 검수 bounds 1032,1825-1850,2379와 좌/우 잔디석 1개씩 노출 계약에 의해 large area를 승인합니다.',
  ],
]);

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const pathPoints = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const polygonArea = (points) => {
  if (points.length < 3) return 0;
  const area = points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length];
    return total + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0);
  return Math.abs(area / 2);
};

const pathBounds = (pathData) => {
  const points = pathPoints(pathData);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

const mergeBounds = (boundsRows, padding) => {
  const x = Math.max(0, Math.min(...boundsRows.map((bounds) => bounds.x)) - padding);
  const y = Math.max(0, Math.min(...boundsRows.map((bounds) => bounds.y)) - padding);
  const right = Math.min(SUWON_SEATMAP_IMAGE.imageWidth, Math.max(...boundsRows.map((bounds) => bounds.right)) + padding);
  const bottom = Math.min(SUWON_SEATMAP_IMAGE.imageHeight, Math.max(...boundsRows.map((bounds) => bounds.bottom)) + padding);
  return {
    x,
    y,
    right,
    bottom,
    width: right - x,
    height: bottom - y,
  };
};

const blockById = new Map(SUWON_BLOCKS.map((block) => [block.id, block]));
const browserProbeCountById = new Map();
const alignmentProbeCountById = new Map();
const blockRowCounts = new Map();

SUWON_BROWSER_QA_PROBES.forEach((probe) => {
  browserProbeCountById.set(probe.id, (browserProbeCountById.get(probe.id) ?? 0) + 1);
});

SUWON_ALIGNMENT_PROBES.forEach((probe) => {
  alignmentProbeCountById.set(probe.id, (alignmentProbeCountById.get(probe.id) ?? 0) + 1);
});

const blockRows = REVIEW_GROUPS.flatMap((group) => group.blockIds.map((id) => {
  blockRowCounts.set(id, (blockRowCounts.get(id) ?? 0) + 1);
  const block = blockById.get(id);
  if (!block) {
    return {
      groupId: group.id,
      id,
      missing: true,
    };
  }

  const points = pathPoints(block.imageGeometry.d);
  const area = polygonArea(points);
  const bounds = pathBounds(block.imageGeometry.d);
  const categoryColor = SUWON_CATEGORIES[block.category]?.light ?? '#64748b';
  const visualHitMismatch = block.imageGeometry.d !== block.hitGeometry.d;
  const visualHitSplitApprovalNote = visualHitMismatch ? SUWON_HIT_GEOMETRY_EXCEPTION_NOTES[id] : '';
  const visualHitSplitApproved = visualHitMismatch && Boolean(visualHitSplitApprovalNote);
  const unresolvedVisualHitMismatch = visualHitMismatch && !visualHitSplitApproved;
  const largeVisualAreaApproved = area > 180000 && APPROVED_LARGE_VISUAL_AREA_NOTES.has(id);
  const reviewFlags = [
    visualHitMismatch ? 'VISUAL_HIT_SPLIT' : '',
    unresolvedVisualHitMismatch ? 'UNRESOLVED_VISUAL_HIT_MISMATCH' : '',
    points.length <= 5 ? 'LOW_POINT_COUNT' : '',
    area > 180000 && !largeVisualAreaApproved ? 'LARGE_VISUAL_AREA' : '',
    (browserProbeCountById.get(id) ?? 0) === 0 ? 'MISSING_BROWSER_PROBE' : '',
  ].filter(Boolean);
  const approvalFlags = [
    visualHitSplitApproved ? 'APPROVED_VISUAL_HIT_SPLIT' : '',
    largeVisualAreaApproved ? 'APPROVED_LARGE_VISUAL_AREA' : '',
  ].filter(Boolean);

  return {
    groupId: group.id,
    id,
    block: block.block,
    name: block.name,
    category: block.category,
    color: categoryColor,
    shortLabel: block.imageGeometry.shortLabel,
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    pointCount: points.length,
    area: Math.round(area),
    bounds: {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    },
    browserQaProbes: browserProbeCountById.get(id) ?? 0,
    alignmentProbes: alignmentProbeCountById.get(id) ?? 0,
    visualHitMismatch,
    visualHitSplitApproved,
    unresolvedVisualHitMismatch,
    reviewFlags,
    approvalFlags,
    visualHitSplitApprovalNote: visualHitSplitApprovalNote ?? '',
    largeVisualAreaApprovalNote: APPROVED_LARGE_VISUAL_AREA_NOTES.get(id) ?? '',
    approvalNote: [
      visualHitSplitApprovalNote,
      APPROVED_LARGE_VISUAL_AREA_NOTES.get(id),
    ].filter(Boolean).join(' / '),
  };
}));

const missingRows = blockRows.filter((row) => row.missing);
const reviewedIds = new Set(blockRows.filter((row) => !row.missing).map((row) => row.id));
const missingReviewRows = SUWON_BLOCKS
  .filter((block) => !reviewedIds.has(block.id))
  .map((block) => ({
    id: block.id,
    block: block.block,
    name: block.name,
    category: block.category,
  }));
const duplicateReviewIds = [...blockRowCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([id]) => id)
  .sort((a, b) => a.localeCompare(b));
const approvedVisualHitSplitRows = blockRows
  .filter((row) => row.approvalFlags?.includes('APPROVED_VISUAL_HIT_SPLIT'))
  .sort((a, b) => a.id.localeCompare(b.id));
const unresolvedVisualHitMismatchRows = blockRows
  .filter((row) => row.reviewFlags?.includes('UNRESOLVED_VISUAL_HIT_MISMATCH'))
  .sort((a, b) => a.id.localeCompare(b.id));
const generatedAt = new Date().toISOString();

function gridLines(bounds, step) {
  const verticalStart = Math.ceil(bounds.x / step) * step;
  const horizontalStart = Math.ceil(bounds.y / step) * step;
  const vertical = [];
  for (let x = verticalStart; x <= bounds.right; x += step) {
    vertical.push(`  <line class="grid" x1="${x}" y1="${bounds.y}" x2="${x}" y2="${bounds.bottom}" />`);
  }
  const horizontal = [];
  for (let y = horizontalStart; y <= bounds.bottom; y += step) {
    horizontal.push(`  <line class="grid" x1="${bounds.x}" y1="${y}" x2="${bounds.right}" y2="${y}" />`);
  }
  return [...vertical, ...horizontal];
}

function probeMarkers(group) {
  const ids = new Set(group.blockIds);
  const browserMarkers = SUWON_BROWSER_QA_PROBES
    .filter((probe) => ids.has(probe.id))
    .map((probe) => `    <circle class="browser-probe" cx="${probe.point[0]}" cy="${probe.point[1]}" r="9"><title>${xmlEscape(`${probe.id} browser QA: ${probe.note}`)}</title></circle>`);
  const alignmentMarkers = SUWON_ALIGNMENT_PROBES
    .filter((probe) => ids.has(probe.id))
    .map((probe) => `    <circle class="alignment-probe" cx="${probe.point[0]}" cy="${probe.point[1]}" r="5"><title>${xmlEscape(`${probe.id} alignment: ${probe.note}`)}</title></circle>`);
  return { browserMarkers, alignmentMarkers };
}

function buildOverlaySvg(group) {
  const blocks = group.blockIds.map((id) => blockById.get(id)).filter(Boolean);
  const bounds = mergeBounds(blocks.map((block) => pathBounds(block.imageGeometry.d)), group.id === 'skybox-skyzone' ? 140 : 120);
  const outputWidth = 1600;
  const outputHeight = Math.max(640, Math.round(outputWidth * (bounds.height / bounds.width)));
  const { browserMarkers, alignmentMarkers } = probeMarkers(group);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">`,
    '  <style>',
    '    .grid { stroke: #0f172a; stroke-opacity: 0.14; stroke-width: 1; vector-effect: non-scaling-stroke; }',
    '    .visual { fill-opacity: 0.13; stroke-width: 5; vector-effect: non-scaling-stroke; }',
    '    .hit { fill: none; stroke: #22d3ee; stroke-width: 4; stroke-dasharray: 12 8; vector-effect: non-scaling-stroke; }',
    '    .label { font: 800 42px Arial, sans-serif; fill: #0f172a; stroke: #ffffff; stroke-width: 9; paint-order: stroke; }',
    '    .small-label { font: 800 30px Arial, sans-serif; fill: #0f172a; stroke: #ffffff; stroke-width: 7; paint-order: stroke; }',
    '    .browser-probe { fill: #facc15; fill-opacity: 0.82; stroke: #0f172a; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '    .alignment-probe { fill: #38bdf8; fill-opacity: 0.76; stroke: #0f172a; stroke-width: 2; vector-effect: non-scaling-stroke; }',
    '  </style>',
    `  <title>${xmlEscape(`Suwon visual review: ${group.label}`)}</title>`,
    `  <desc>${xmlEscape(group.reviewFocus)}</desc>`,
    `  <image href="${xmlEscape(officialImageHref)}" x="0" y="0" width="${SUWON_SEATMAP_IMAGE.imageWidth}" height="${SUWON_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />`,
    ...gridLines(bounds, 100),
    '  <g id="visual-polygons">',
    ...blocks.map((block) => {
      const fill = SUWON_CATEGORIES[block.category]?.light ?? '#64748b';
      return `    <path class="visual" d="${xmlEscape(block.imageGeometry.d)}" fill="${fill}" stroke="${fill}"><title>${xmlEscape(`${block.id} ${block.name}`)}</title></path>`;
    }),
    '  </g>',
    '  <g id="hit-polygons">',
    ...blocks
      .filter((block) => block.imageGeometry.d !== block.hitGeometry.d)
      .map((block) => `    <path class="hit" d="${xmlEscape(block.hitGeometry.d)}"><title>${xmlEscape(`${block.id} compact hit-area`)}</title></path>`),
    '  </g>',
    '  <g id="probes">',
    ...alignmentMarkers,
    ...browserMarkers,
    '  </g>',
    '  <g id="labels">',
    ...blocks.map((block) => {
      const labelClass = block.imageGeometry.shortLabel.length > 4 ? 'small-label' : 'label';
      return `    <text class="${labelClass}" x="${block.imageGeometry.labelX + 14}" y="${block.imageGeometry.labelY - 14}">${xmlEscape(block.imageGeometry.shortLabel)}</text>`;
    }),
    '  </g>',
    '</svg>',
  ].join('\n');
}

const artifacts = [];

await fs.mkdir(reportDir, { recursive: true });

for (const group of REVIEW_GROUPS) {
  const overlayPath = path.join(reportDir, group.overlayFileName);
  await fs.writeFile(overlayPath, buildOverlaySvg(group), 'utf8');
  artifacts.push({
    id: group.id,
    label: group.label,
    reviewFocus: group.reviewFocus,
    overlayPath: path.relative(frontendRoot, overlayPath),
    blockIds: group.blockIds,
  });
}

const manifest = {
  generatedAt,
  status: missingRows.length === 0 && missingReviewRows.length === 0 && duplicateReviewIds.length === 0 && unresolvedVisualHitMismatchRows.length === 0 ? 'generated' : 'failed',
  officialImage: {
    path: SUWON_SEATMAP_IMAGE.imagePath,
    width: SUWON_SEATMAP_IMAGE.imageWidth,
    height: SUWON_SEATMAP_IMAGE.imageHeight,
  },
  summary: {
    reviewGroups: REVIEW_GROUPS.length,
    expectedReviewedBlocks: EXPECTED_REVIEWED_BLOCKS,
    reviewedBlocks: reviewedIds.size,
    missingBlocks: missingRows.length,
    missingReviewBlocks: missingReviewRows.length,
    duplicateReviewBlocks: duplicateReviewIds.length,
    visualHitMismatchBlocks: blockRows.filter((row) => row.visualHitMismatch).length,
    approvedVisualHitSplitBlocks: approvedVisualHitSplitRows.length,
    unresolvedVisualHitMismatchBlocks: unresolvedVisualHitMismatchRows.length,
    lowPointCountBlocks: blockRows.filter((row) => row.reviewFlags?.includes('LOW_POINT_COUNT')).length,
    largeVisualAreaBlocks: blockRows.filter((row) => row.reviewFlags?.includes('LARGE_VISUAL_AREA')).length,
    approvedLargeVisualAreaBlocks: blockRows.filter((row) => row.approvalFlags?.includes('APPROVED_LARGE_VISUAL_AREA')).length,
  },
  artifacts,
  rows: blockRows,
  approvedVisualHitSplitRows,
  unresolvedVisualHitMismatchRows,
  missingReviewRows,
  duplicateReviewIds,
};

const markdown = [
  '# Suwon Seatmap Visual Review',
  '',
  `- Generated at: ${manifest.generatedAt}`,
  `- Status: ${manifest.status}`,
  `- official image: \`${manifest.officialImage.path}\` (${manifest.officialImage.width}x${manifest.officialImage.height})`,
  `- review groups: ${manifest.summary.reviewGroups}`,
  `- expected reviewed blocks: ${manifest.summary.expectedReviewedBlocks}`,
  `- reviewed blocks: ${manifest.summary.reviewedBlocks}`,
  `- missing review blocks: ${manifest.summary.missingReviewBlocks}`,
  `- duplicate review blocks: ${manifest.summary.duplicateReviewBlocks}`,
  `- visual/hit mismatch blocks: ${manifest.summary.visualHitMismatchBlocks}`,
  `- approved visual/hit split blocks: ${manifest.summary.approvedVisualHitSplitBlocks}`,
  `- unresolved visual/hit mismatch blocks: ${manifest.summary.unresolvedVisualHitMismatchBlocks}`,
  `- low point count blocks: ${manifest.summary.lowPointCountBlocks}`,
  `- large visual area blocks: ${manifest.summary.largeVisualAreaBlocks}`,
  `- approved large visual area blocks: ${manifest.summary.approvedLargeVisualAreaBlocks}`,
  '',
  '## Artifacts',
  '',
  markdownTable(
    ['group', 'overlay', 'review focus'],
    artifacts.map((artifact) => [artifact.label, `\`${artifact.overlayPath}\``, artifact.reviewFocus]),
  ),
  '',
  '## Review Rows',
  '',
  markdownTable(
    ['group', 'id', 'block', 'name', 'points', 'area', 'browser probes', 'alignment probes', 'flags', 'approval note'],
    blockRows.map((row) => [
      row.groupId,
      row.id,
      row.block,
      row.name,
      row.pointCount,
      row.area,
      row.browserQaProbes,
      row.alignmentProbes,
      [...(row.reviewFlags ?? []), ...(row.approvalFlags ?? [])].join(' ') || 'LOCKED_VISUAL',
      row.approvalNote,
    ]),
  ),
  '',
  '## Approved Visual/Hit Split Blocks',
  '',
  approvedVisualHitSplitRows.length > 0
    ? markdownTable(
      ['id', 'block', 'name', 'approval note'],
      approvedVisualHitSplitRows.map((row) => [row.id, row.block, row.name, row.visualHitSplitApprovalNote]),
    )
    : 'No approved visual/hit split blocks.',
  '',
  '## Unresolved Visual/Hit Mismatch Blocks',
  '',
  unresolvedVisualHitMismatchRows.length > 0
    ? markdownTable(
      ['id', 'block', 'name', 'flags'],
      unresolvedVisualHitMismatchRows.map((row) => [row.id, row.block, row.name, row.reviewFlags.join(' ')]),
    )
    : 'No unresolved visual/hit mismatch blocks.',
  '',
  '## Missing Review Blocks',
  '',
  missingReviewRows.length > 0
    ? markdownTable(
      ['id', 'block', 'name', 'category'],
      missingReviewRows.map((row) => [row.id, row.block, row.name, row.category]),
    )
    : 'No missing review blocks.',
  '',
  '## Duplicate Review Blocks',
  '',
  duplicateReviewIds.length > 0 ? duplicateReviewIds.map((id) => `- ${id}`).join('\n') : 'No duplicate review blocks.',
  '',
].join('\n');

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`visual_review_json:${manifestPath}`);
console.log(`visual_review_markdown:${markdownPath}`);
artifacts.forEach((artifact) => console.log(`visual_review_overlay:${path.join(frontendRoot, artifact.overlayPath)}`));
console.log(`status:${manifest.status} groups=${manifest.summary.reviewGroups} reviewedBlocks=${manifest.summary.reviewedBlocks} missingReviewBlocks=${manifest.summary.missingReviewBlocks} unresolvedVisualHitMismatchBlocks=${manifest.summary.unresolvedVisualHitMismatchBlocks}`);

if (manifest.status !== 'generated') {
  missingRows.forEach((row) => {
    console.error(`missing visual review block: ${row.id}`);
  });
  missingReviewRows.forEach((row) => {
    console.error(`missing visual review coverage: ${row.id}`);
  });
  duplicateReviewIds.forEach((id) => {
    console.error(`duplicate visual review coverage: ${id}`);
  });
  unresolvedVisualHitMismatchRows.forEach((row) => {
    console.error(`unresolved visual/hit mismatch: ${row.id}`);
  });
  process.exit(1);
}
