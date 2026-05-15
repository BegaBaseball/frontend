import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_BLOCKS,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
  GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
  GWANGJU_FULL_RETRACE_VERSION,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
  GWANGJU_PREVIOUS_TRACE_VERSION,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_ZONE_PRECISION_WORKSETS,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const traceReviewPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
const outputBase = path.join(reportDir, 'gwangju-seatmap-zone-precision-worksets');
const outputFileNames = {
  json: 'gwangju-seatmap-zone-precision-worksets.json',
  csv: 'gwangju-seatmap-zone-precision-worksets.csv',
  markdown: 'gwangju-seatmap-zone-precision-worksets.md',
  svg: 'gwangju-seatmap-zone-precision-worksets.svg',
};
const WORKSET_VERSION = 'GWANGJU_ZONE_PRECISION_WORKSETS_V1';
const REPEATED_NUMBERED_BLOCK_WORKSET_ID = 'p4-repeated-numbered-blocks';
const REPEATED_NUMBERED_BLOCK_EXPECTED_COUNT = 70;
const REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE = 0.98;
const REPEATED_NUMBERED_BLOCK_CATEGORIES = new Set(['SKY_PICNIC', 'FIVE_TABLE']);

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

const svgEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const readTraceReview = async () => {
  try {
    return JSON.parse(await fs.readFile(traceReviewPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const traceReview = await readTraceReview();
const manifestWorksets = new Map((traceReview?.zonePrecisionWorksets ?? []).map((workset) => [workset.id, workset]));
const manifestBlocks = new Map((traceReview?.blocks ?? []).map((block) => [block.id, block]));

const worksetRows = GWANGJU_ZONE_PRECISION_WORKSETS.map((workset, index) => {
  const manifestWorkset = manifestWorksets.get(workset.id);
  const blocks = workset.blockIds.map((blockId) => manifestBlocks.get(blockId)).filter(Boolean);
  const missingBlockIds = workset.blockIds.filter((blockId) => !manifestBlocks.has(blockId));
  const traceVersionFailures = blocks
    .filter((block) => block.traceVersion !== GWANGJU_FULL_RETRACE_VERSION)
    .map((block) => `${block.id}:${block.traceVersion}`);
  const previousVersionFailures = blocks
    .filter((block) => block.previousTraceVersion !== GWANGJU_PREVIOUS_TRACE_VERSION)
    .map((block) => `${block.id}:${block.previousTraceVersion}`);
  const readinessFailures = blocks
    .filter((block) => (
      block.traceStatus !== 'OFFICIAL_IMAGE_TRACED'
      || block.manualReviewed !== true
      || block.pixelAlignmentStatus !== 'PIXEL_ALIGNED'
    ))
    .map((block) => block.id);
  const componentFailures = blocks
    .filter((block) => block.componentCoverageStatus === 'failed')
    .map((block) => block.id);
  const blockers = [
    ...(manifestWorkset ? [] : [`WORKSET_MISSING_FROM_TRACE_MANIFEST:${workset.id}`]),
    ...(manifestWorkset && manifestWorkset.status !== 'passed'
      ? [`TRACE_MANIFEST_WORKSET_NOT_PASSED:${workset.id}:${manifestWorkset.status}`]
      : []),
    ...missingBlockIds.map((blockId) => `MISSING_BLOCK:${blockId}`),
    ...traceVersionFailures.map((failure) => `TRACE_VERSION_NOT_V5:${failure}`),
    ...previousVersionFailures.map((failure) => `PREVIOUS_TRACE_VERSION_NOT_V4:${failure}`),
    ...readinessFailures.map((blockId) => `BLOCK_NOT_RELEASE_READY:${blockId}`),
    ...componentFailures.map((blockId) => `COMPONENT_COVERAGE_FAILED:${blockId}`),
  ];
  if (workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID) {
    if (blocks.length !== REPEATED_NUMBERED_BLOCK_EXPECTED_COUNT) {
      blockers.push(`REPEATED_BLOCK_COUNT_CHANGED:${blocks.length}`);
    }
    blocks
      .filter((block) => !REPEATED_NUMBERED_BLOCK_CATEGORIES.has(block.category))
      .forEach((block) => blockers.push(`REPEATED_BLOCK_CATEGORY_UNEXPECTED:${block.id}:${block.category}`));
    blocks
      .filter((block) => block.pixelCoverageRatio < REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE)
      .forEach((block) => blockers.push(`REPEATED_BLOCK_PIXEL_COVERAGE_BELOW_LOCK:${block.id}:${block.pixelCoverageRatio}`));
    (manifestWorkset?.lowMarginRows ?? [])
      .forEach((row) => blockers.push(`REPEATED_BLOCK_LOW_MARGIN_ROW:${row.id}`));
  }

  return {
    order: index + 1,
    id: workset.id,
    label: workset.label,
    priority: workset.priority,
    expectedBlockCount: workset.blockIds.length,
    activeBlockCount: blocks.length,
    blockIds: workset.blockIds,
    acceptanceFocus: workset.acceptanceFocus,
    note: workset.note,
    minimumPixelCoverageRatio: manifestWorkset?.minimumPixelCoverageRatio ?? null,
    minimumOfficialComponentRecall: manifestWorkset?.minimumOfficialComponentRecall ?? null,
    minimumComponentIoU: manifestWorkset?.minimumComponentIoU ?? null,
    lowMarginRows: manifestWorkset?.lowMarginRows ?? [],
    repeatedBlockPixelCoverageMinimum: workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID
      ? REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE
      : null,
    status: blockers.length === 0 ? 'passed' : 'failed',
    blockers,
  };
});

const blockers = [
  ...(traceReview ? [] : [`TRACE_REVIEW_MISSING:${path.relative(frontendRoot, traceReviewPath)}`]),
];

if (traceReview) {
  if (traceReview.summary?.traceVersion !== GWANGJU_FULL_RETRACE_VERSION) {
    blockers.push(`TRACE_REVIEW_VERSION_NOT_V5:${traceReview.summary?.traceVersion ?? 'missing'}`);
  }
  if (traceReview.summary?.previousTraceVersion !== GWANGJU_PREVIOUS_TRACE_VERSION) {
    blockers.push(`TRACE_REVIEW_PREVIOUS_VERSION_NOT_V4:${traceReview.summary?.previousTraceVersion ?? 'missing'}`);
  }
  if (traceReview.summary?.totalBlocks !== GWANGJU_EXPECTED_TRACE_BLOCK_COUNT) {
    blockers.push(`ACTIVE_BLOCK_COUNT_CHANGED:${traceReview.summary?.totalBlocks ?? 'missing'}`);
  }
  if (traceReview.summary?.overlapWarningCount !== 0) {
    blockers.push(`OVERLAP_WARNINGS_PRESENT:${traceReview.summary?.overlapWarningCount ?? 'missing'}`);
  }
  if (traceReview.summary?.componentCoverageWarningCount !== 0) {
    blockers.push(`COMPONENT_COVERAGE_WARNINGS_PRESENT:${traceReview.summary?.componentCoverageWarningCount ?? 'missing'}`);
  }
  if (traceReview.summary?.zonePrecisionWarningCount !== 0) {
    blockers.push(`ZONE_PRECISION_WARNINGS_PRESENT:${traceReview.summary?.zonePrecisionWarningCount ?? 'missing'}`);
  }
}

worksetRows.forEach((workset) => {
  workset.blockers.forEach((blocker) => blockers.push(`${workset.id}:${blocker}`));
});

if (!GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE) {
  blockers.push('K7_AWAY_DERIVED_RANGE_NOT_REUSING_EXISTING_TRACE');
}
if (GWANGJU_PENDING_OPERATOR_SECTIONS.join('|') !== 'K7석|원정응원석') {
  blockers.push(`PENDING_OPERATOR_SECTIONS_CHANGED:${GWANGJU_PENDING_OPERATOR_SECTIONS.join(',')}`);
}
if (GWANGJU_BLOCKS.length !== 111) {
  blockers.push(`ACTIVE_DATA_BLOCK_COUNT_CHANGED:${GWANGJU_BLOCKS.length}`);
}

const status = blockers.length === 0 ? 'passed' : 'failed';
const report = {
  generatedAt: new Date().toISOString(),
  version: WORKSET_VERSION,
  status,
  doesNotModifyDataFile: true,
  asset: {
    imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
    imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
    imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
  },
  sourcePolicy: {
    allowedCoordinateSource: 'official PNG 2200x1159 only',
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  },
  releaseContract: {
    traceVersion: GWANGJU_FULL_RETRACE_VERSION,
    previousTraceVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
    activeBlockCount: GWANGJU_BLOCKS.length,
    expectedTraceBlockCount: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    aggregateHitAreaMode: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE
      ? 'REUSES_EXISTING_TRACE_ONLY'
      : 'INDEPENDENT_POLYGON',
    pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
    derivedOperatorRanges: GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.map((range) => ({
      id: range.id,
      displayBlocks: range.displayBlocks,
      aggregateHitArea: range.aggregateHitArea,
      operatorPolygonStatus: range.operatorPolygonStatus,
    })),
  },
  legacyLayerContract: {
    runtimeSeatLayerSource: 'GWANGJU_BLOCKS[].imageGeometry.d',
    forbiddenRuntimeHitAreaSources: [
      'GWANGJU_IMAGE_GEOMETRY_DRAFTS',
      'GWANGJU_OFFICIAL_TRACE_REFERENCE',
      'gwangju-seatmap-operator-template.json',
      'derived K7/AWAY aggregate polygons',
      'marker-only zones',
    ],
    markerOnlyZonesRemainSeparate: true,
    k7AwayAggregatePolygonStatus: 'PENDING_OPERATOR_INPUT',
  },
  summary: {
    worksetCount: worksetRows.length,
    passedWorksets: worksetRows.filter((workset) => workset.status === 'passed').length,
    failedWorksets: worksetRows.filter((workset) => workset.status !== 'passed').length,
    totalLowMarginRows: worksetRows.reduce((total, workset) => total + workset.lowMarginRows.length, 0),
    traceReviewVersion: traceReview?.summary?.traceVersion ?? null,
    traceReviewZonePrecisionStatus: traceReview?.summary?.zonePrecisionStatus ?? null,
    traceReviewZonePrecisionWarnings: traceReview?.summary?.zonePrecisionWarningCount ?? null,
    minimumPixelCoverageRatio: traceReview?.summary?.minimumPixelCoverageRatio ?? null,
    minimumOfficialComponentRecall: traceReview?.summary?.minimumOfficialComponentRecall ?? null,
    minimumComponentIoU: traceReview?.summary?.minimumComponentIoU ?? null,
    repeatedNumberedBlockPixelCoverageMinimum: REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE,
    repeatedNumberedBlockMinimumPixelCoverageRatio: worksetRows
      .find((workset) => workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID)?.minimumPixelCoverageRatio ?? null,
  },
  worksets: worksetRows,
  blockers,
};

const jsonPath = `${outputBase}.json`;
const csvPath = `${outputBase}.csv`;
const markdownPath = `${outputBase}.md`;
const svgPath = `${outputBase}.svg`;

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'order',
    'id',
    'label',
    'priority',
    'status',
    'activeBlockCount',
    'expectedBlockCount',
    'minimumPixelCoverageRatio',
    'minimumOfficialComponentRecall',
    'minimumComponentIoU',
    'lowMarginRows',
    'acceptanceFocus',
    'blockers',
    'blockIds',
  ],
  ...worksetRows.map((workset) => [
    workset.order,
    workset.id,
    workset.label,
    workset.priority,
    workset.status,
    workset.activeBlockCount,
    workset.expectedBlockCount,
    workset.minimumPixelCoverageRatio ?? '',
    workset.minimumOfficialComponentRecall ?? '',
    workset.minimumComponentIoU ?? '',
    workset.lowMarginRows.map((row) => row.id).join('|'),
    workset.acceptanceFocus.join('|'),
    workset.blockers.join('|'),
    workset.blockIds.join('|'),
  ]),
]);

const markdown = [
  '# 광주 구역별 polygon precision worksets',
  '',
  `- version: \`${WORKSET_VERSION}\``,
  `- status: \`${status}\``,
  `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
  `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
  `- trace version: \`${GWANGJU_FULL_RETRACE_VERSION}\``,
  `- previous trace version: \`${GWANGJU_PREVIOUS_TRACE_VERSION}\``,
  `- active blocks: \`${GWANGJU_BLOCKS.length}\``,
  `- aggregate hit-area: \`${report.releaseContract.aggregateHitAreaMode}\``,
  `- pending operator sections: \`${GWANGJU_PENDING_OPERATOR_SECTIONS.join(', ')}\``,
  `- P4 repeated block pixel coverage lock: \`${report.summary.repeatedNumberedBlockMinimumPixelCoverageRatio?.toFixed(4) ?? '-'} / ${REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE.toFixed(2)}\``,
  `- blockers: \`${blockers.length}\``,
  '',
  '## Worksets',
  '',
  markdownTable(
    ['order', 'id', 'priority', 'active', 'min coverage', 'min recall', 'min IoU', 'low margin', 'status', 'focus'],
    worksetRows.map((workset) => [
      String(workset.order),
      `\`${workset.id}\``,
      workset.priority,
      `${workset.activeBlockCount}/${workset.expectedBlockCount}`,
      workset.minimumPixelCoverageRatio === null ? '-' : workset.minimumPixelCoverageRatio.toFixed(4),
      workset.minimumOfficialComponentRecall === null ? '-' : workset.minimumOfficialComponentRecall.toFixed(4),
      workset.minimumComponentIoU === null ? '-' : workset.minimumComponentIoU.toFixed(4),
      workset.lowMarginRows.map((row) => `\`${row.id}\``).join('<br>') || '-',
      `\`${workset.status}\``,
      workset.acceptanceFocus.map((focus) => `\`${focus}\``).join('<br>'),
    ]),
  ),
  '',
  '## Legacy Layer Contract',
  '',
  '- 일반 좌석 layer는 `GWANGJU_BLOCKS[].imageGeometry.d`만 hit-area로 렌더링한다.',
  '- `GWANGJU_IMAGE_GEOMETRY_DRAFTS`, `GWANGJU_OFFICIAL_TRACE_REFERENCE`, operator template, marker-only zone은 런타임 hit-area source가 아니다.',
  '- `K7석`, `원정응원석`은 독립 aggregate polygon 없이 derived range로만 유지한다.',
  '',
  '## Source Policy',
  '',
  '- 공식 PNG `2200x1159` 좌표만 허용한다.',
  '- CSS pixel, resized screenshot, external crawling, web-search-based baseball data, third-party copied seatmap image 좌표는 금지한다.',
  '- 야구 운영 데이터가 비어 있거나 불명확하면 `MANUAL_BASEBALL_DATA_REQUIRED` 계약을 유지한다.',
  '',
].join('\n');

await fs.writeFile(markdownPath, markdown, 'utf8');

const barHeight = 58;
const width = 980;
const height = 110 + (worksetRows.length * barHeight);
const svgRows = worksetRows.map((workset, index) => {
  const y = 72 + (index * barHeight);
  const ratio = workset.expectedBlockCount === 0 ? 0 : workset.activeBlockCount / workset.expectedBlockCount;
  const fill = workset.status === 'passed' ? '#16a34a' : '#dc2626';
  return [
    `<text x="24" y="${y}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#111827">${svgEscape(`${workset.order}. ${workset.label}`)}</text>`,
    `<rect x="24" y="${y + 12}" width="420" height="14" rx="3" fill="#e5e7eb" />`,
    `<rect x="24" y="${y + 12}" width="${Math.round(420 * ratio)}" height="14" rx="3" fill="${fill}" />`,
    `<text x="462" y="${y + 24}" font-family="Arial, sans-serif" font-size="12" fill="#334155">${svgEscape(`${workset.activeBlockCount}/${workset.expectedBlockCount} · ${workset.status}`)}</text>`,
    `<text x="650" y="${y + 24}" font-family="Arial, sans-serif" font-size="12" fill="#334155">${svgEscape(workset.acceptanceFocus.join(', '))}</text>`,
  ].join('\n');
}).join('\n');
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gwangju zone precision worksets">`,
  '<rect width="100%" height="100%" fill="#f8fafc" />',
  `<text x="24" y="36" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#0f172a">${svgEscape('광주 구역별 polygon precision worksets')}</text>`,
  `<text x="24" y="58" font-family="Arial, sans-serif" font-size="12" fill="#475569">${svgEscape(`${GWANGJU_FULL_RETRACE_VERSION} · official PNG ${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight} · status=${status}`)}</text>`,
  svgRows,
  '</svg>',
].join('\n');
await fs.writeFile(svgPath, svg, 'utf8');

console.log(`zone_precision_worksets_json:${jsonPath}`);
console.log(`zone_precision_worksets_csv:${csvPath}`);
console.log(`zone_precision_worksets_markdown:${markdownPath}`);
console.log(`zone_precision_worksets_svg:${svgPath}`);
console.log(`status:${status} worksets=${worksetRows.length} blockers=${blockers.length} active=${GWANGJU_BLOCKS.length}`);
if (status !== 'passed') {
  process.exitCode = 1;
}
