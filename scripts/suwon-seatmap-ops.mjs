import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SUWON_ALIGNMENT_PROBES,
  SUWON_BLOCKS,
  SUWON_BROWSER_QA_PROBES,
  SUWON_CATEGORIES,
  SUWON_HIT_GEOMETRY_EXCEPTION_NOTES,
  SUWON_HIT_TEST_PROBES,
  SUWON_SEATMAP_IMAGE,
  SUWON_TRACE_REVIEW_SUMMARY,
} from '../src/data/suwonSeatData.ts';

const runVisualReview = async () => {
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
      reviewFocus: 'SB1-SB35 full visual hit polygon과 401-432 visual polygon이 서로를 먹지 않고 라벨 중심 probe와 일치하는지 확인',
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
        .map((block) => `    <path class="hit" d="${xmlEscape(block.hitGeometry.d)}"><title>${xmlEscape(`${block.id} separate hit-area`)}</title></path>`),
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
};

const runPrecisionWorkset = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const sourceManifestPath = path.join(reportDir, 'suwon-seatmap-visual-review.json');
  const worksetJsonPath = path.join(reportDir, 'suwon-seatmap-precision-workset.json');
  const worksetMarkdownPath = path.join(reportDir, 'suwon-seatmap-precision-workset.md');

  const EXPECTED_WORKSET_BLOCKS = 176;
  const EXPECTED_REVIEW_GROUPS = 8;

  const REQUIRED_P0_BLOCK_IDS = [
    'suwon-lf-grass',
    'suwon-rf-grass',
    'suwon-7pub',
    'suwon-k-live',
    'suwon-green',
    'suwon-501-508',
    'suwon-hite-pub',
    'suwon-kids-camp',
    'suwon-wiz-garden',
  ];

  const COMPLETED_P0_RETRACE_BLOCK_IDS = new Set(REQUIRED_P0_BLOCK_IDS);

  const REQUIRED_P1_BLOCK_IDS = [
    'suwon-3b-highfive',
    'suwon-1b-highfive',
    ...Array.from({ length: 11 }, (_, index) => `suwon-${205 + index}`),
  ];

  const COMPLETED_P1_RETRACE_BLOCK_IDS = new Set(REQUIRED_P1_BLOCK_IDS);

  const REQUIRED_P2_BLOCK_IDS = [
    'suwon-216',
    'suwon-217',
    'suwon-218',
    'suwon-313',
    'suwon-314',
    'suwon-315',
    'suwon-316',
    'suwon-genie',
    'suwon-wheel-center',
    'suwon-wheel-1b',
    'suwon-wheel-3b',
  ];

  const COMPLETED_P2_RETRACE_BLOCK_IDS = new Set(REQUIRED_P2_BLOCK_IDS);

  const REQUIRED_P3_BLOCK_IDS = [
    ...Array.from({ length: 33 }, (_, index) => `suwon-${101 + index}`),
    ...Array.from({ length: 4 }, (_, index) => `suwon-${201 + index}`),
    ...Array.from({ length: 15 }, (_, index) => `suwon-${219 + index}`),
    ...Array.from({ length: 12 }, (_, index) => `suwon-${301 + index}`),
    ...Array.from({ length: 12 }, (_, index) => `suwon-${317 + index}`),
  ];

  const COMPLETED_P3_RETRACE_BLOCK_IDS = new Set(REQUIRED_P3_BLOCK_IDS);

  const REVIEW_GROUP_LABELS = new Map([
    ['infield-1f', '1층 내야/응원/중앙'],
    ['infield-2f', '2층 내야 잔여 구역'],
    ['infield-3f', '3층 내야/중앙'],
    ['center-accessible', '지니존/휠체어석'],
    ['outfield-special', '외야 특수석/잔디석'],
    ['highfive', '하이파이브존'],
    ['section-205-215', '205-215 내야 경계'],
    ['skybox-skyzone', '스카이박스/스카이존'],
  ]);

  const WORKSET_PRIORITY_DEFINITIONS = [
    {
      id: 'P0',
      label: '외야 특수석/잔디석',
      objective: '큰 polygon과 인접 특수석 경계가 많은 상단 외야 구역을 우선 육안 재검수합니다.',
      blockIds: REQUIRED_P0_BLOCK_IDS,
      candidateStatus: 'manual-retrace-candidate',
    },
    {
      id: 'P1',
      label: '하이파이브존/205-215',
      objective: '공식 이미지 선과 조금만 밀려도 눈에 띄는 하이파이브존과 205-215 사선 구역을 우선 검수합니다.',
      blockIds: REQUIRED_P1_BLOCK_IDS,
      candidateStatus: 'manual-retrace-candidate',
    },
    {
      id: 'P2',
      label: '중앙 하단/휠체어/지니존',
      objective: '기존 클릭 충돌을 줄인 중앙 하단 구역을 visual polygon 기준으로 재확인합니다.',
      blockIds: REQUIRED_P2_BLOCK_IDS,
      candidateStatus: 'manual-retrace-candidate',
    },
    {
      id: 'P3',
      label: '1층/2층/3층 숫자 블록 sweep',
      objective: '전체 좌표 재작성 없이 overlay 기반 미세 보정 후보만 선별합니다.',
      blockIds: REQUIRED_P3_BLOCK_IDS,
      candidateStatus: 'baseline-sweep',
    },
  ];

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const blockById = new Map(SUWON_BLOCKS.map((block) => [block.id, block]));
  const browserProbeCountById = new Map();
  const alignmentProbeCountById = new Map();

  SUWON_BROWSER_QA_PROBES.forEach((probe) => {
    browserProbeCountById.set(probe.id, (browserProbeCountById.get(probe.id) ?? 0) + 1);
  });

  SUWON_ALIGNMENT_PROBES.forEach((probe) => {
    alignmentProbeCountById.set(probe.id, (alignmentProbeCountById.get(probe.id) ?? 0) + 1);
  });

  function numericBlockNumber(id) {
    const match = id.match(/^suwon-(\d+)$/);
    return match ? Number(match[1]) : null;
  }

  function isSkyboxOrSkyzone(id) {
    return /^suwon-sb\d+$/.test(id) || /^suwon-4\d\d$/.test(id);
  }

  function classifyDefaultPriority(id) {
    if (isSkyboxOrSkyzone(id)) {
      return {
        priority: 'LOCKED',
        candidateStatus: 'locked-review-reference',
        reviewFocus: 'SB visual hit-area와 401-432 스카이존은 현재 release gate 계약으로 잠겨 있어 회귀 감시 대상으로 유지합니다.',
      };
    }

    const blockNumber = numericBlockNumber(id);
    if (blockNumber && ((blockNumber >= 101 && blockNumber <= 204) || (blockNumber >= 219 && blockNumber <= 312) || (blockNumber >= 317 && blockNumber <= 328))) {
      return {
        priority: 'P3',
        candidateStatus: 'baseline-sweep',
        reviewFocus: '1층/2층/3층 숫자 블록은 overlay 기반 미세 보정 후보만 선별합니다.',
      };
    }

    return {
      priority: 'LOCKED',
      candidateStatus: 'locked-review-reference',
      reviewFocus: '현재 release gate와 probe 계약을 유지하며 사람이 발견한 mismatch가 있을 때만 targeted adjustment를 엽니다.',
    };
  }

  function hasBlockingReviewFlag(row) {
    const reviewFlags = new Set(row.reviewFlags ?? []);
    if (row.visualHitSplitApproved) {
      reviewFlags.delete('VISUAL_HIT_SPLIT');
    }
    if ((row.approvalFlags ?? []).includes('APPROVED_LARGE_VISUAL_AREA')) {
      reviewFlags.delete('LARGE_VISUAL_AREA');
    }
    return reviewFlags.size > 0;
  }

  function isVisualReviewLocked(row) {
    return !hasBlockingReviewFlag(row);
  }

  function completedPriorityOverride(row, priorityDefinition) {
    if (priorityDefinition?.id === 'P0' && COMPLETED_P0_RETRACE_BLOCK_IDS.has(row.id) && isVisualReviewLocked(row)) {
      return {
        priority: 'LOCKED',
        candidateStatus: 'locked-review-reference',
        reviewFocus: 'P0 외야 특수석/잔디석은 공식 픽셀 경계 재추적과 exclusion probe 계약을 통과했으므로 다음 후보 큐에서 제외하고 회귀 감시로 유지합니다.',
      };
    }

    if (priorityDefinition?.id === 'P1' && COMPLETED_P1_RETRACE_BLOCK_IDS.has(row.id) && isVisualReviewLocked(row)) {
      return {
        priority: 'LOCKED',
        candidateStatus: 'locked-review-reference',
        reviewFocus: 'P1 하이파이브존/205-215는 공식 사선 경계, label, edge/exclusion probe 계약을 통과했으므로 다음 후보 큐에서 제외하고 회귀 감시로 유지합니다.',
      };
    }

    if (priorityDefinition?.id === 'P2' && COMPLETED_P2_RETRACE_BLOCK_IDS.has(row.id) && isVisualReviewLocked(row)) {
      return {
        priority: 'LOCKED',
        candidateStatus: 'locked-review-reference',
        reviewFocus: 'P2 중앙 하단/휠체어/지니존은 공식 하단 경계, label, edge/exclusion probe 계약을 통과했으므로 다음 후보 큐에서 제외하고 회귀 감시로 유지합니다.',
      };
    }

    if (priorityDefinition?.id === 'P3' && COMPLETED_P3_RETRACE_BLOCK_IDS.has(row.id) && isVisualReviewLocked(row)) {
      return {
        priority: 'LOCKED',
        candidateStatus: 'locked-review-reference',
        reviewFocus: 'P3 1층/2층/3층 숫자 블록 sweep은 label, edge probe, bounds/area 계약을 통과했으므로 다음 후보 큐에서 제외하고 회귀 감시로 유지합니다.',
      };
    }

    return null;
  }

  function blockRowFromVisualRow(row, priorityDefinition) {
    const block = blockById.get(row.id);
    const fallback = classifyDefaultPriority(row.id);
    const override = completedPriorityOverride(row, priorityDefinition);
    return {
      priority: override?.priority ?? priorityDefinition?.id ?? fallback.priority,
      candidateStatus: override?.candidateStatus ?? priorityDefinition?.candidateStatus ?? fallback.candidateStatus,
      groupId: row.groupId,
      groupLabel: REVIEW_GROUP_LABELS.get(row.groupId) ?? row.groupId,
      id: row.id,
      block: row.block,
      name: row.name,
      category: row.category,
      pointCount: row.pointCount,
      area: row.area,
      bounds: row.bounds,
      browserQaProbes: row.browserQaProbes ?? browserProbeCountById.get(row.id) ?? 0,
      alignmentProbes: row.alignmentProbes ?? alignmentProbeCountById.get(row.id) ?? 0,
      reviewFlags: row.reviewFlags ?? [],
      approvalFlags: row.approvalFlags ?? [],
      visualHitSplitApproved: Boolean(row.visualHitSplitApproved),
      hitExceptionNote: SUWON_HIT_GEOMETRY_EXCEPTION_NOTES[row.id] ?? '',
      officialBlocks: block?.officialBlocks ?? [],
      reviewFocus: override?.reviewFocus ?? priorityDefinition?.objective ?? fallback.reviewFocus,
    };
  }

  function sortRows(rows) {
    return [...rows].sort((a, b) => {
      const aNumber = numericBlockNumber(a.id);
      const bNumber = numericBlockNumber(b.id);
      if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
      if (aNumber !== null && bNumber !== null) return aNumber - bNumber;
      return a.id.localeCompare(b.id);
    });
  }

  const sourceManifest = JSON.parse(await fs.readFile(sourceManifestPath, 'utf8'));
  const sourceRows = sourceManifest.rows ?? [];
  const sourceRowsById = new Map(sourceRows.map((row) => [row.id, row]));
  const assignedRowsById = new Map();
  const priorityRows = [];

  for (const priorityDefinition of WORKSET_PRIORITY_DEFINITIONS) {
    for (const id of priorityDefinition.blockIds) {
      const row = sourceRowsById.get(id);
      if (!row) continue;
      const worksetRow = blockRowFromVisualRow(row, priorityDefinition);
      assignedRowsById.set(id, worksetRow);
      priorityRows.push(worksetRow);
    }
  }

  for (const row of sourceRows) {
    if (assignedRowsById.has(row.id)) continue;
    const worksetRow = blockRowFromVisualRow(row);
    assignedRowsById.set(row.id, worksetRow);
    priorityRows.push(worksetRow);
  }

  const sortedRows = sortRows(priorityRows);
  const worksetRowCounts = new Map();
  sortedRows.forEach((row) => {
    worksetRowCounts.set(row.id, (worksetRowCounts.get(row.id) ?? 0) + 1);
  });

  const requiredP0MissingRows = REQUIRED_P0_BLOCK_IDS.filter((id) => !assignedRowsById.has(id));
  const requiredP1MissingRows = REQUIRED_P1_BLOCK_IDS.filter((id) => !assignedRowsById.has(id));
  const requiredP2MissingRows = REQUIRED_P2_BLOCK_IDS.filter((id) => !assignedRowsById.has(id));
  const requiredP3MissingRows = REQUIRED_P3_BLOCK_IDS.filter((id) => !assignedRowsById.has(id));
  const missingWorksetRows = SUWON_BLOCKS
    .filter((block) => !assignedRowsById.has(block.id))
    .map((block) => ({
      id: block.id,
      block: block.block,
      name: block.name,
      category: block.category,
    }));
  const duplicateWorksetIds = [...worksetRowCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort((a, b) => a.localeCompare(b));

  const priorityOrder = ['P0', 'P1', 'P2', 'P3', 'LOCKED'];
  const worksets = priorityOrder.map((priority) => {
    const rows = sortedRows.filter((row) => row.priority === priority);
    const configured = WORKSET_PRIORITY_DEFINITIONS.find((definition) => definition.id === priority);
    const locked = priority === 'LOCKED';
    const completedPriority = (priority === 'P0' || priority === 'P1' || priority === 'P2' || priority === 'P3') && rows.length === 0;
    return {
      priority,
      label: configured?.label ?? (locked ? '검토 완료/회귀 감시' : '1층/2층/3층 숫자 블록 sweep'),
      objective: completedPriority
        ? `${configured?.label ?? priority} 재추적은 완료되어 LOCKED 회귀 감시로 이동했습니다.`
        : configured?.objective ?? (locked
        ? '스카이박스/스카이존처럼 이미 release gate로 잠긴 구역은 수정 후보와 분리해 회귀 감시합니다.'
        : '전체 좌표 재작성 없이 overlay 기반 미세 보정 후보만 선별합니다.'),
      candidateStatus: locked ? 'locked-review-reference' : (completedPriority ? 'completed-moved-to-locked' : (configured?.candidateStatus ?? 'baseline-sweep')),
      blockIds: rows.map((row) => row.id),
      rows,
    };
  });

  const generatedAt = new Date().toISOString();
  const summary = {
    sourceManifestStatus: sourceManifest.status,
    reviewGroups: sourceManifest.summary?.reviewGroups ?? 0,
    expectedWorksetBlocks: EXPECTED_WORKSET_BLOCKS,
    worksetBlocks: assignedRowsById.size,
    candidateBlocks: sortedRows.filter((row) => row.priority !== 'LOCKED').length,
    lockedReviewBlocks: sortedRows.filter((row) => row.priority === 'LOCKED').length,
    p0Blocks: sortedRows.filter((row) => row.priority === 'P0').length,
    p1Blocks: sortedRows.filter((row) => row.priority === 'P1').length,
    p2Blocks: sortedRows.filter((row) => row.priority === 'P2').length,
    p3Blocks: sortedRows.filter((row) => row.priority === 'P3').length,
    missingWorksetBlocks: missingWorksetRows.length,
    duplicateWorksetBlocks: duplicateWorksetIds.length,
    requiredP0MissingBlocks: requiredP0MissingRows.length,
    requiredP1MissingBlocks: requiredP1MissingRows.length,
    requiredP2MissingBlocks: requiredP2MissingRows.length,
    requiredP3MissingBlocks: requiredP3MissingRows.length,
    visualReviewUnresolvedMismatchBlocks: sourceManifest.summary?.unresolvedVisualHitMismatchBlocks ?? 0,
    visualReviewApprovedSplitBlocks: sourceManifest.summary?.approvedVisualHitSplitBlocks ?? 0,
  };

  const failures = [
    sourceManifest.status === 'generated' ? '' : 'source visual review manifest is not generated',
    summary.reviewGroups === EXPECTED_REVIEW_GROUPS ? '' : 'source visual review group count mismatch',
    summary.worksetBlocks === EXPECTED_WORKSET_BLOCKS ? '' : 'workset block coverage mismatch',
    summary.missingWorksetBlocks === 0 ? '' : 'missing workset blocks',
    summary.duplicateWorksetBlocks === 0 ? '' : 'duplicate workset blocks',
    summary.requiredP0MissingBlocks === 0 ? '' : 'missing required P0 blocks',
    summary.requiredP1MissingBlocks === 0 ? '' : 'missing required P1 blocks',
    summary.requiredP2MissingBlocks === 0 ? '' : 'missing required P2 blocks',
    summary.requiredP3MissingBlocks === 0 ? '' : 'missing required P3 blocks',
    summary.visualReviewUnresolvedMismatchBlocks === 0 ? '' : 'source visual review has unresolved visual/hit mismatch blocks',
  ].filter(Boolean);

  const manifest = {
    generatedAt,
    status: failures.length === 0 ? 'generated' : 'failed',
    sourceManifest: path.relative(frontendRoot, sourceManifestPath),
    summary,
    worksets,
    rows: sortedRows,
    missingWorksetRows,
    duplicateWorksetIds,
    requiredP0MissingRows,
    requiredP1MissingRows,
    requiredP2MissingRows,
    requiredP3MissingRows,
    failures,
  };

  const markdown = [
    '# Suwon Seatmap Precision Workset',
    '',
    `- Generated at: ${manifest.generatedAt}`,
    `- Status: ${manifest.status}`,
    `- source manifest: \`${manifest.sourceManifest}\``,
    `- review groups: ${manifest.summary.reviewGroups}`,
    `- expected workset blocks: ${manifest.summary.expectedWorksetBlocks}`,
    `- workset blocks: ${manifest.summary.worksetBlocks}`,
    `- candidate blocks: ${manifest.summary.candidateBlocks}`,
    `- locked review blocks: ${manifest.summary.lockedReviewBlocks}`,
    `- P0 blocks: ${manifest.summary.p0Blocks}`,
    `- P1 blocks: ${manifest.summary.p1Blocks}`,
    `- P2 blocks: ${manifest.summary.p2Blocks}`,
    `- P3 blocks: ${manifest.summary.p3Blocks}`,
    `- missing workset blocks: ${manifest.summary.missingWorksetBlocks}`,
    `- duplicate workset blocks: ${manifest.summary.duplicateWorksetBlocks}`,
    `- required P0 missing blocks: ${manifest.summary.requiredP0MissingBlocks}`,
    `- required P1 missing blocks: ${manifest.summary.requiredP1MissingBlocks}`,
    `- required P2 missing blocks: ${manifest.summary.requiredP2MissingBlocks}`,
    `- required P3 missing blocks: ${manifest.summary.requiredP3MissingBlocks}`,
    '',
    '## Worksets',
    '',
    markdownTable(
      ['priority', 'label', 'status', 'blocks', 'objective'],
      worksets.map((workset) => [workset.priority, workset.label, workset.candidateStatus, workset.blockIds.length, workset.objective]),
    ),
    '',
    ...worksets.flatMap((workset) => [
      `## ${workset.priority} ${workset.label}`,
      '',
      markdownTable(
        ['group', 'id', 'block', 'name', 'points', 'area', 'bounds', 'browser probes', 'alignment probes', 'flags'],
        workset.rows.map((row) => [
          row.groupLabel,
          row.id,
          row.block,
          row.name,
          row.pointCount,
          row.area,
          row.bounds ? `${row.bounds.x},${row.bounds.y} ${row.bounds.width}x${row.bounds.height}` : '',
          row.browserQaProbes,
          row.alignmentProbes,
          [...row.reviewFlags, ...row.approvalFlags].join(' ') || row.candidateStatus,
        ]),
      ),
      '',
    ]),
    '## Failures',
    '',
    failures.length > 0 ? failures.map((failure) => `- ${failure}`).join('\n') : 'No failures.',
    '',
  ].join('\n');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(worksetJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(worksetMarkdownPath, markdown, 'utf8');

  console.log(`precision_workset_json:${worksetJsonPath}`);
  console.log(`precision_workset_markdown:${worksetMarkdownPath}`);
  console.log(`status:${manifest.status} worksetBlocks=${manifest.summary.worksetBlocks} candidateBlocks=${manifest.summary.candidateBlocks} lockedReviewBlocks=${manifest.summary.lockedReviewBlocks}`);

  if (manifest.status !== 'generated') {
    failures.forEach((failure) => {
      console.error(`precision workset failure: ${failure}`);
    });
    process.exit(1);
  }
};

const runReleaseGate = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const reportJsonPath = path.join(reportDir, 'suwon-seatmap-release-gate.json');
  const reportMarkdownPath = path.join(reportDir, 'suwon-seatmap-release-gate.md');

  const EXPECTED_TOTAL_BLOCKS = 176;
  const EXPECTED_NUMERIC_BLOCKS = 126;
  const EXPECTED_SKYBOX_BLOCKS = 35;
  const EXPECTED_SKYZONE_BLOCKS = 32;
  const EXPECTED_SPECIAL_BLOCKS = 15;
  const EXPECTED_ALIGNMENT_PROBES = 429;
  const EXPECTED_BROWSER_QA_PROBES = 179;
  const EXPECTED_HIT_TEST_PROBES = 608;
  // SB1-SB35는 visual polygon 전체를 hit polygon으로 사용하므로 승인된 visual/hit split이 없다.
  const EXPECTED_VISUAL_HIT_MISMATCH_BLOCKS = 0;
  const EXPECTED_HIT_GEOMETRY_EXCEPTIONS = 0;
  const EXPECTED_RELEASE_FIXTURE_FINGERPRINT = 'c69ad1aa260bf48c23634d0f07bcb9d13491c45c70acc0bd0edd7fc079485e5a';
  const EXPECTED_OFFICIAL_ASSET_SHA256 = '30ebfe637f42e674d7761af7739e61aa0751813e0f72bd9cde4f8135b91a3523';

  function probeKey(id, point) {
    return `${id}:${point[0]},${point[1]}`;
  }

  function snapshotSuwonSeatFixture() {
    const blocksSnapshot = SUWON_BLOCKS
      .map((block) => ({
        ...block,
        officialBlocks: [...block.officialBlocks],
        seatViewSections: [...block.seatViewSections],
        imageGeometry: { ...block.imageGeometry },
        hitGeometry: { ...block.hitGeometry },
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((block) => ({
        ...block,
        imageGeometry: { ...block.imageGeometry, shortLabel: block.imageGeometry.shortLabel },
        hitGeometry: { ...block.hitGeometry, shortLabel: block.hitGeometry.shortLabel },
      }));

    const alignmentProbeSnapshot = SUWON_ALIGNMENT_PROBES
      .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
      .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));

    const browserQaProbeSnapshot = SUWON_BROWSER_QA_PROBES
      .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
      .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));

    const hitTestProbeSnapshot = SUWON_HIT_TEST_PROBES
      .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
      .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));

    return JSON.stringify({
      blocks: blocksSnapshot,
      alignmentProbes: alignmentProbeSnapshot,
      browserQaProbes: browserQaProbeSnapshot,
      hitTestProbes: hitTestProbeSnapshot,
    });
  }

  function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
  }

  async function readText(filePath) {
    return fs.readFile(path.join(frontendRoot, filePath), 'utf8');
  }

  async function buildReport() {
    const source = await readText('src/data/suwonSeatData.ts');
    const releaseLockSource = await readText('docs/suwon-seatmap-release-lock.md');
    const packageSource = await readText('package.json');
    const dispatcherSource = await readText('scripts/stadium-seatmap-ops.mjs');
    const auditSource = await readText('scripts/stadium-ux-audit.mjs');
    const visualReviewSource = await readText('scripts/suwon-seatmap-ops.mjs');
    const precisionWorksetSource = await readText('scripts/suwon-seatmap-ops.mjs');
    const assetBuffer = await fs.readFile(path.join(frontendRoot, SUWON_SEATMAP_IMAGE.imagePath));
    const releaseFixtureFingerprint = sha256(snapshotSuwonSeatFixture());
    const officialAssetSha256 = sha256(assetBuffer);
    const visualHitMismatchIds = SUWON_BLOCKS
      .filter((block) => block.imageGeometry.d !== block.hitGeometry.d)
      .map((block) => block.id)
      .sort((a, b) => a.localeCompare(b));
    const hitExceptionIds = Object.keys(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES);
    const hitExceptionIdSet = new Set(hitExceptionIds);
    const approvedVisualHitSplitIds = visualHitMismatchIds
      .filter((id) => hitExceptionIdSet.has(id))
      .sort((a, b) => a.localeCompare(b));
    const unresolvedVisualHitMismatchIds = visualHitMismatchIds
      .filter((id) => !hitExceptionIdSet.has(id))
      .sort((a, b) => a.localeCompare(b));
    const unusedHitExceptionIds = hitExceptionIds
      .filter((id) => !visualHitMismatchIds.includes(id))
      .sort((a, b) => a.localeCompare(b));

    const summary = {
      totalBlocks: SUWON_BLOCKS.length,
      numericBlocks: SUWON_BLOCKS.filter((block) => /^suwon-\d+$/.test(block.id)).length,
      skyboxBlocks: SUWON_BLOCKS.filter((block) => /^suwon-sb\d+$/.test(block.id)).length,
      skyzoneBlocks: SUWON_BLOCKS.filter((block) => /^suwon-4\d\d$/.test(block.id)).length,
      specialSelectableAreas: SUWON_BLOCKS.filter((block) => !/^suwon-(\d+|sb\d+)$/.test(block.id)).length,
      officialImageTraced: SUWON_TRACE_REVIEW_SUMMARY.officialImageTraced,
      draftApproximate: SUWON_TRACE_REVIEW_SUMMARY.draftApproximate,
      pendingBlockIds: SUWON_TRACE_REVIEW_SUMMARY.pendingBlockIds,
      browserQaProbes: SUWON_BROWSER_QA_PROBES.length,
      alignmentProbes: SUWON_ALIGNMENT_PROBES.length,
      hitTestProbes: SUWON_HIT_TEST_PROBES.length,
      visualHitMismatchBlocks: visualHitMismatchIds.length,
      approvedVisualHitSplitBlocks: approvedVisualHitSplitIds.length,
      unresolvedVisualHitMismatchBlocks: unresolvedVisualHitMismatchIds.length,
      hitGeometryExceptions: hitExceptionIds.length,
      unusedHitGeometryExceptionNotes: unusedHitExceptionIds.length,
      releaseFixtureFingerprint,
      officialAssetSha256,
    };

    const checks = [
      ['total blocks', summary.totalBlocks === EXPECTED_TOTAL_BLOCKS],
      ['numeric block count', summary.numericBlocks === EXPECTED_NUMERIC_BLOCKS],
      ['skybox block count', summary.skyboxBlocks === EXPECTED_SKYBOX_BLOCKS],
      ['skyzone block count', summary.skyzoneBlocks === EXPECTED_SKYZONE_BLOCKS],
      ['special selectable area count', summary.specialSelectableAreas === EXPECTED_SPECIAL_BLOCKS],
      ['official image traced count', summary.officialImageTraced === EXPECTED_TOTAL_BLOCKS],
      ['draft approximate count', summary.draftApproximate === 0],
      ['pending block ids', summary.pendingBlockIds.length === 0],
      ['browser QA probe count', summary.browserQaProbes === EXPECTED_BROWSER_QA_PROBES],
      ['alignment probe count', summary.alignmentProbes === EXPECTED_ALIGNMENT_PROBES],
      ['hit test probe count', summary.hitTestProbes === EXPECTED_HIT_TEST_PROBES],
      ['visual/hit mismatch block count', visualHitMismatchIds.length === EXPECTED_VISUAL_HIT_MISMATCH_BLOCKS],
      ['approved visual/hit split block count', approvedVisualHitSplitIds.length === EXPECTED_VISUAL_HIT_MISMATCH_BLOCKS],
      ['unresolved visual/hit mismatch ids are empty', unresolvedVisualHitMismatchIds.length === 0],
      ['hit exception count', hitExceptionIds.length === EXPECTED_HIT_GEOMETRY_EXCEPTIONS],
      ['unused hit exception notes are empty', unusedHitExceptionIds.length === 0],
      ['release fixture fingerprint', summary.releaseFixtureFingerprint === EXPECTED_RELEASE_FIXTURE_FINGERPRINT],
      ['official asset sha256', summary.officialAssetSha256 === EXPECTED_OFFICIAL_ASSET_SHA256],
      ['package mobile script', packageSource.includes('"qa:stadium:suwon:mobile": "node scripts/qa-presets.mjs stadium suwon mobile"')],
      ['package full script', packageSource.includes('"qa:stadium:suwon:full": "node scripts/qa-presets.mjs stadium suwon full"')],
      ['package release lock script', packageSource.includes('"qa:stadium:suwon:release-lock": "node scripts/qa-presets.mjs stadium suwon release-gate"')],
      ['package status script', packageSource.includes('"stadium:suwon:status": "node scripts/qa-presets.mjs stadium suwon status"')],
      ['package responsive script removed', !packageSource.includes('"qa:stadium:suwon:responsive"')],
      ['package visual review script removed', !packageSource.includes('"stadium:suwon:visual-review"')],
      ['package precision workset script removed', !packageSource.includes('"stadium:suwon:precision-workset"')],
      ['package visual review qa script removed', !packageSource.includes('"qa:stadium:suwon:visual-review"')],
      ['dispatcher responsive task', dispatcherSource.includes('responsive: [')],
      ['dispatcher visual review task', dispatcherSource.includes("'visual-review': [")],
      ['dispatcher precision workset task', dispatcherSource.includes("'precision-workset': [")],
      ['release lock document includes release gate script', releaseLockSource.includes('npm run qa:stadium:suwon:release-lock')],
      ['release lock document includes internal visual review task', releaseLockSource.includes('node scripts/stadium-seatmap-ops.mjs suwon visual-review')],
      ['release lock document includes internal precision workset task', releaseLockSource.includes('node scripts/stadium-seatmap-ops.mjs suwon precision-workset')],
      ['visual review artifact contract', visualReviewSource.includes('suwon-seatmap-visual-review.json') && visualReviewSource.includes('suwon-infield-1f-overlay.svg') && visualReviewSource.includes('suwon-infield-2f-overlay.svg') && visualReviewSource.includes('suwon-infield-3f-overlay.svg') && visualReviewSource.includes('suwon-center-accessible-overlay.svg') && visualReviewSource.includes('suwon-outfield-special-overlay.svg') && visualReviewSource.includes('suwon-highfive-overlay.svg') && visualReviewSource.includes('suwon-205-215-overlay.svg') && visualReviewSource.includes('suwon-skybox-skyzone-overlay.svg')],
      ['visual review full coverage contract', visualReviewSource.includes('EXPECTED_REVIEWED_BLOCKS') && visualReviewSource.includes('missingReviewRows') && visualReviewSource.includes('missingReviewBlocks') && visualReviewSource.includes('duplicateReviewBlocks')],
      ['visual review split approval contract', visualReviewSource.includes('APPROVED_VISUAL_HIT_SPLIT') && visualReviewSource.includes('UNRESOLVED_VISUAL_HIT_MISMATCH') && visualReviewSource.includes('approvedVisualHitSplitBlocks') && visualReviewSource.includes('unresolvedVisualHitMismatchBlocks')],
      ['visual review large-area approval contract', visualReviewSource.includes('APPROVED_LARGE_VISUAL_AREA') && visualReviewSource.includes('APPROVED_LARGE_VISUAL_AREA_NOTES') && visualReviewSource.includes('largeVisualAreaApproved') && visualReviewSource.includes('approvedLargeVisualAreaBlocks')],
      ['precision workset artifact contract', precisionWorksetSource.includes('suwon-seatmap-precision-workset.json') && precisionWorksetSource.includes('suwon-seatmap-precision-workset.md')],
      ['precision workset full coverage contract', precisionWorksetSource.includes('EXPECTED_WORKSET_BLOCKS') && precisionWorksetSource.includes('missingWorksetRows') && precisionWorksetSource.includes('duplicateWorksetBlocks')],
      ['precision workset priority contract', precisionWorksetSource.includes('REQUIRED_P0_BLOCK_IDS') && precisionWorksetSource.includes('REQUIRED_P1_BLOCK_IDS') && precisionWorksetSource.includes('REQUIRED_P2_BLOCK_IDS') && precisionWorksetSource.includes('REQUIRED_P3_BLOCK_IDS') && precisionWorksetSource.includes('requiredP0MissingBlocks') && precisionWorksetSource.includes('requiredP1MissingBlocks') && precisionWorksetSource.includes('requiredP2MissingBlocks') && precisionWorksetSource.includes('requiredP3MissingBlocks')],
      ['precision workset P0/P1/P2/P3 completion contract', precisionWorksetSource.includes('COMPLETED_P0_RETRACE_BLOCK_IDS') && precisionWorksetSource.includes('COMPLETED_P1_RETRACE_BLOCK_IDS') && precisionWorksetSource.includes('COMPLETED_P2_RETRACE_BLOCK_IDS') && precisionWorksetSource.includes('COMPLETED_P3_RETRACE_BLOCK_IDS') && precisionWorksetSource.includes('isVisualReviewLocked') && precisionWorksetSource.includes('completed-moved-to-locked')],
      ['browser QA hover retry contract', auditSource.includes('SUWON_HOVER_HIT_RETRY_ATTEMPTS') && auditSource.includes('waitForSuwonHoverHitTarget') && auditSource.includes('after ${SUWON_HOVER_HIT_RETRY_ATTEMPTS} attempts')],
      ['no generated row/cell visual geometry', !source.includes('officialRowCellGeometries') && !source.includes('rowCellGeometry')],
      ['no generated skybox production geometry', !source.includes('skyboxGeometry(') && !source.includes('Array.from({ length: 35 }')],
    ].map(([label, passed]) => ({ label, passed }));

    const failures = checks.filter((check) => !check.passed).map((check) => check.label);
    return {
      generatedAt: new Date().toISOString(),
      status: failures.length === 0 ? 'passed' : 'failed',
      summary,
      approvedVisualHitSplitIds,
      unresolvedVisualHitMismatchIds,
      unusedHitExceptionIds,
      checks,
      failures,
    };
  }

  function markdown(report) {
    return [
      '# Suwon Seatmap Release Gate',
      '',
      `- Generated at: ${report.generatedAt}`,
      `- Status: ${report.status}`,
      `- totalBlocks: ${report.summary.totalBlocks}`,
      `- browserQaProbes: ${report.summary.browserQaProbes}`,
      `- alignmentProbes: ${report.summary.alignmentProbes}`,
      `- hitTestProbes: ${report.summary.hitTestProbes}`,
      `- visualHitMismatchBlocks: ${report.summary.visualHitMismatchBlocks}`,
      `- approvedVisualHitSplitBlocks: ${report.summary.approvedVisualHitSplitBlocks}`,
      `- unresolvedVisualHitMismatchBlocks: ${report.summary.unresolvedVisualHitMismatchBlocks}`,
      `- hitGeometryExceptions: ${report.summary.hitGeometryExceptions}`,
      `- unusedHitGeometryExceptionNotes: ${report.summary.unusedHitGeometryExceptionNotes}`,
      `- releaseFixtureFingerprint: ${report.summary.releaseFixtureFingerprint}`,
      `- officialAssetSha256: ${report.summary.officialAssetSha256}`,
      '',
      '## Checks',
      '',
      ...report.checks.map((check) => `- ${check.passed ? 'PASS' : 'FAIL'} ${check.label}`),
      '',
    ].join('\n');
  }

  const report = await buildReport();
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(reportMarkdownPath, markdown(report), 'utf8');

  console.log(`[suwon-release-gate] ${report.status}`);
  console.log(`[suwon-release-gate] report=${reportJsonPath}`);
  console.log(`[suwon-release-gate] summary=${reportMarkdownPath}`);

  if (report.status !== 'passed') {
    report.failures.forEach((failure) => {
      console.error(`[suwon-release-gate] failure: ${failure}`);
    });
    process.exit(1);
  }
};

const TASKS = {
  "visual-review": runVisualReview,
  "precision-workset": runPrecisionWorkset,
  "release-gate": runReleaseGate,
};

export const runSuwonSeatmapTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Suwon seatmap task: ${task}. Available tasks: ${available}`);
  }

  const originalArgv = process.argv;
  process.argv = [originalArgv[0], originalArgv[1], ...args];
  try {
    await runner();
  } finally {
    process.argv = originalArgv;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runSuwonSeatmapTask(task, args);
}
