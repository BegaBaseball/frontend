import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const imageAuditPath = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit.json');
const traceReviewPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
const outputBase = path.join(reportDir, 'gwangju-seatmap-evidence-inventory');

const INVENTORY_VERSION = 'GWANGJU_EVIDENCE_INVENTORY_V1';

const ZONES = [
  {
    id: 'lower-infield-101-108-hij',
    label: 'Lower infield 101-108 and first-base H/I/J',
    statusNote: 'P0 screenshot regression area; official PNG mask and H/I/J split evidence are required.',
    blockIds: [
      'k5-101',
      'k5-102',
      'k5-103',
      'k5-104',
      'k5-105',
      'k5-106',
      'k7-107',
      'k7-108',
      'first-family-seats',
      'first-wheelchair-seats',
      'party-seats-first',
    ],
    artifacts: [
      'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/gwangju-seatmap-image-alignment-audit-101-108-h-i-j-e-f-visual-review.png',
      'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/gwangju-seatmap-image-alignment-audit-104-105-i-j-boundary.png',
      'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/lower-infield-special-split/gwangju-seatmap-lower-infield-special-split-all-overlay.png',
      'reports/stadium/gwangju-101-108-trace/current-h-i-j-overlay-v44-x880-y780-4x.png',
    ],
  },
  {
    id: 'middle-lower-infield-109-120',
    label: 'Middle lower infield 109-120',
    statusNote: 'Official PNG image check for 109-113 and 116-120 boundaries.',
    blockIds: [
      'k7-109',
      'k7-110',
      'k7-111',
      'k9-112',
      'k9-113',
      'k9-116',
      'k9-117',
      'k7-118',
      'k7-119',
      'k7-120',
    ],
    artifacts: [
      'reports/stadium/gwangju-109-120-trace/current-109-113-overlay-v50-x475-y770-10x.png',
      'reports/stadium/gwangju-109-120-trace/current-116-120-overlay-v50-x350-y500-10x.png',
      'reports/stadium/gwangju-109-120-trace/current-109-120-overlay-v50-x350-y500-6x.png',
    ],
  },
  {
    id: 'third-base-121-127-hij',
    label: 'Third-base 121-127 and upper H/I/J adjacency',
    statusNote: 'Priority recheck area; 121-127 must not be swallowed by H/I/J polygons.',
    blockIds: [
      'k7-121',
      'k7-122',
      'k8-123',
      'k5-124',
      'k5-125',
      'k5-126',
      'k5-127',
      'third-family-seats',
      'third-wheelchair-seats',
      'party-seats-third',
    ],
    artifacts: [
      'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/gwangju-seatmap-image-alignment-audit-121-127.png',
      'reports/stadium/gwangju-seatmap-trace-review-clean-crops/gwangju-seatmap-trace-review-k5-126-clean-overlay.png',
      'reports/stadium/gwangju-seatmap-trace-review-clean-crops/gwangju-seatmap-trace-review-k5-127-clean-overlay.png',
      'reports/stadium/gwangju-seatmap-trace-review-clean-crops/gwangju-seatmap-trace-review-third-family-seats-clean-overlay.png',
      'reports/stadium/gwangju-seatmap-trace-review-clean-crops/gwangju-seatmap-trace-review-third-wheelchair-seats-clean-overlay.png',
      'reports/stadium/gwangju-seatmap-trace-review-clean-crops/gwangju-seatmap-trace-review-party-seats-third-clean-overlay.png',
    ],
  },
  {
    id: 'official-special-sections',
    label: 'Official special sections A/B/C/G/H/I/J/K',
    statusNote: 'Alphabet sections must match the official image, not only pass label top-hit checks.',
    blockIds: [
      'champion-seats',
      'central-table-seats',
      'disabled-seats-center',
      'first-surprise-seats',
      'third-surprise-seats',
      'first-family-seats',
      'third-family-seats',
      'first-wheelchair-seats',
      'third-wheelchair-seats',
      'party-seats-first',
      'party-seats-third',
      'skybox-seats',
    ],
    artifacts: [
      'reports/stadium/gwangju-special-sections-trace/current-center-special-overlay-v50-x360-y710-8x.png',
      'reports/stadium/gwangju-special-sections-trace/current-firstbase-special-overlay-v50-x680-y750-6x.png',
      'reports/stadium/gwangju-special-sections-trace/current-thirdbase-special-overlay-v50-x420-y130-6x.png',
      'reports/stadium/gwangju-special-sections-trace/current-skybox-special-overlay-v50-x300-y780-10x.png',
      'reports/stadium/gwangju-special-sections-trace/current-special-full-overlay-v50-x300-y120-3x.png',
    ],
  },
  {
    id: 'op-outfield-and-bleachers-table',
    label: 'O/P outfield and bleachers table',
    statusNote: 'Large O/P sections use component recall and IoU to prevent legacy short polygons.',
    blockIds: [
      'outfield-left-seats',
      'outfield-right-seats',
      'bleachers-table-left',
      'bleachers-table-right',
    ],
    artifacts: [
      'reports/stadium/gwangju-op-outfield-trace/current-left-op-overlay-v50-x650-y70-6x.png',
      'reports/stadium/gwangju-op-outfield-trace/current-right-op-overlay-v50-x1120-y300-5x.png',
      'reports/stadium/gwangju-op-outfield-trace/current-op-full-overlay-v50-x650-y70-3x.png',
    ],
  },
  {
    id: 'five-table-501-535',
    label: 'Five-table 501-535',
    statusNote: 'Full repeated 5F table sequence evidence by official PNG crop.',
    blockIds: Array.from({ length: 35 }, (_, index) => `five-table-${501 + index}`),
    artifacts: [
      'reports/stadium/gwangju-five-table-trace/current-five-table-501-509-overlay-v50-x690-y920-8x.png',
      'reports/stadium/gwangju-five-table-trace/current-five-table-510-518-overlay-v50-x300-y820-8x.png',
      'reports/stadium/gwangju-five-table-trace/current-five-table-519-527-overlay-v50-x230-y520-8x.png',
      'reports/stadium/gwangju-five-table-trace/current-five-table-528-535-overlay-v50-x290-y160-8x.png',
    ],
  },
  {
    id: 'sky-picnic-s301-s335',
    label: 'Sky picnic S-301-S-335',
    statusNote: 'S-series seats use official image color scan and staged overlay evidence.',
    blockIds: Array.from({ length: 35 }, (_, index) => `sky-picnic-s-${301 + index}`),
    artifacts: [
      'reports/stadium/gwangju-105-108-s301-trace/current-s301-s304-overlay-v45-x760-y930-10x.png',
      'reports/stadium/gwangju-s305-s317-trace/current-s305-s317-overlay-v50-x430-y860-12x.png',
      'reports/stadium/gwangju-s318-s335-trace/current-s318-s335-overlay-v46-x320-y390-4x.png',
      'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/gwangju-seatmap-image-alignment-audit-sky-picnic-s-301-315.png',
      'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/gwangju-seatmap-image-alignment-audit-sky-picnic-s-316-335.png',
    ],
  },
];

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const round = (value, digits = 4) => (
  value === null || value === undefined || Number.isNaN(value)
    ? null
    : Number(value.toFixed(digits))
);

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const exists = async (relativePath) => {
  try {
    await fs.access(path.join(frontendRoot, relativePath));
    return true;
  } catch {
    return false;
  }
};

const metricMin = (rows, key) => {
  const values = rows
    .map((row) => row[key])
    .filter((value) => typeof value === 'number');
  return values.length ? round(Math.min(...values)) : null;
};

const metricMax = (rows, key) => {
  const values = rows
    .map((row) => row[key])
    .filter((value) => typeof value === 'number');
  return values.length ? round(Math.max(...values)) : null;
};

const metricMinAny = (rows, keys) => {
  const values = rows
    .flatMap((row) => keys.map((key) => row[key]))
    .filter((value) => typeof value === 'number');
  return values.length ? round(Math.min(...values)) : null;
};

const metricMaxAny = (rows, keys) => {
  const values = rows
    .flatMap((row) => keys.map((key) => row[key]))
    .filter((value) => typeof value === 'number');
  return values.length ? round(Math.max(...values)) : null;
};

const imageAudit = await readJson(imageAuditPath);
const traceReview = await readJson(traceReviewPath);
const imageRows = new Map((imageAudit.rows ?? []).map((row) => [row.id, row]));
const traceRows = new Map((traceReview.blocks ?? []).map((row) => [row.id, row]));

const zoneRows = [];
for (const zone of ZONES) {
  const rows = zone.blockIds
    .map((blockId) => imageRows.get(blockId))
    .filter(Boolean);
  const traceBlocks = zone.blockIds
    .map((blockId) => traceRows.get(blockId))
    .filter(Boolean);
  const missingAuditRows = zone.blockIds.filter((blockId) => !imageRows.has(blockId));
  const missingTraceRows = zone.blockIds.filter((blockId) => !traceRows.has(blockId));
  const missingArtifacts = [];
  for (const artifact of zone.artifacts) {
    if (!(await exists(artifact))) missingArtifacts.push(artifact);
  }

  const failedRows = rows.filter((row) => row.status !== 'passed');
  const topHitFailures = rows.filter((row) => row.topHitAtLabel === false);
  const traceFailures = traceBlocks.filter((block) => (
    block.traceStatus !== 'OFFICIAL_IMAGE_TRACED'
    || block.pixelAlignmentStatus !== 'PIXEL_ALIGNED'
    || block.manualReviewed !== true
  ));
  const blockers = [
    ...missingAuditRows.map((blockId) => `MISSING_IMAGE_AUDIT_ROW:${blockId}`),
    ...missingTraceRows.map((blockId) => `MISSING_TRACE_REVIEW_ROW:${blockId}`),
    ...missingArtifacts.map((artifact) => `MISSING_ARTIFACT:${artifact}`),
    ...failedRows.map((row) => `IMAGE_AUDIT_NOT_PASSED:${row.id}:${row.status}`),
    ...topHitFailures.map((row) => `TOP_HIT_FAILED:${row.id}`),
    ...traceFailures.map((row) => `TRACE_REVIEW_NOT_RELEASE_READY:${row.id}`),
  ];

  zoneRows.push({
    id: zone.id,
    label: zone.label,
    status: blockers.length === 0 ? 'passed' : 'failed',
    statusNote: zone.statusNote,
    blockCount: zone.blockIds.length,
    auditedBlockCount: rows.length,
    traceReviewBlockCount: traceBlocks.length,
    minimumOfficialBlockMaskRecall: metricMin(rows, 'officialBlockMaskRecall'),
    minimumComponentIoU: metricMin(rows, 'componentIoU'),
    maximumOutsideBleedRatio: metricMax(rows, 'outsideBleedRatio'),
    minimumScanCoverageRatio: metricMinAny(rows, [
      'skyPicnicColorCoverageRatio',
      'fiveTableColorCoverageRatio',
      'alphabetSectionColorCoverageRatio',
    ]),
    maximumLocalFillBoundsMaxAbsDelta: metricMaxAny(rows, [
      'skyPicnicLocalFillBoundsMaxAbsDelta',
      'fiveTableLocalFillBoundsMaxAbsDelta',
    ]),
    labelTopHitFailures: topHitFailures.length,
    blockers,
    blockIds: zone.blockIds,
    artifacts: zone.artifacts,
  });
}

const blockers = [
  ...(imageAudit.summary?.status === 'passed' ? [] : [`IMAGE_ALIGNMENT_AUDIT_NOT_PASSED:${imageAudit.summary?.status ?? 'missing'}`]),
  ...(traceReview.summary?.traceStatus === 'READY' && traceReview.summary?.selectableBlocksReady === true
    ? []
    : [`TRACE_REVIEW_NOT_READY:${traceReview.summary?.traceStatus ?? 'missing'}`]),
  ...zoneRows.flatMap((zone) => zone.blockers.map((blocker) => `${zone.id}:${blocker}`)),
];

const report = {
  generatedAt: new Date().toISOString(),
  version: INVENTORY_VERSION,
  status: blockers.length === 0 ? 'passed' : 'failed',
  sourcePolicy: imageAudit.summary?.officialMaskSourcePolicy ?? imageAudit.sourcePolicy ?? {
    coordinateSource: 'official PNG 2200x1159 only',
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  },
  upstream: {
    imageAlignmentAudit: path.relative(frontendRoot, imageAuditPath),
    imageAlignmentStatus: imageAudit.summary?.status ?? null,
    traceReview: path.relative(frontendRoot, traceReviewPath),
    traceReviewStatus: traceReview.summary?.traceStatus ?? null,
    traceVersion: traceReview.summary?.traceVersion ?? imageAudit.summary?.traceVersion ?? null,
    totalBlocks: traceReview.summary?.totalBlocks ?? null,
    imageCoordinateSystem: imageAudit.summary?.coordinateSystem ?? null,
  },
  summary: {
    zoneCount: zoneRows.length,
    passedZones: zoneRows.filter((zone) => zone.status === 'passed').length,
    failedZones: zoneRows.filter((zone) => zone.status !== 'passed').length,
    totalInventoryArtifacts: zoneRows.reduce((total, zone) => total + zone.artifacts.length, 0),
    blockers,
  },
  zones: zoneRows,
};

await fs.writeFile(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const csvRows = [
  [
    'zoneId',
    'label',
    'status',
    'blockCount',
    'auditedBlockCount',
    'traceReviewBlockCount',
    'minimumOfficialBlockMaskRecall',
    'minimumComponentIoU',
    'maximumOutsideBleedRatio',
    'minimumScanCoverageRatio',
    'maximumLocalFillBoundsMaxAbsDelta',
    'labelTopHitFailures',
    'artifactCount',
    'blockers',
  ],
  ...zoneRows.map((zone) => [
    zone.id,
    zone.label,
    zone.status,
    zone.blockCount,
    zone.auditedBlockCount,
    zone.traceReviewBlockCount,
    zone.minimumOfficialBlockMaskRecall,
    zone.minimumComponentIoU,
    zone.maximumOutsideBleedRatio,
    zone.minimumScanCoverageRatio,
    zone.maximumLocalFillBoundsMaxAbsDelta,
    zone.labelTopHitFailures,
    zone.artifacts.length,
    zone.blockers.join(';'),
  ]),
];
await fs.writeFile(`${outputBase}.csv`, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');

const markdown = [
  '# Gwangju Seatmap Evidence Inventory',
  '',
  `- generatedAt: \`${report.generatedAt}\``,
  `- status: \`${report.status}\``,
  `- traceVersion: \`${report.upstream.traceVersion}\``,
  `- coordinate source: \`${report.sourcePolicy.coordinateSource}\``,
  `- upstream image alignment audit: \`${report.upstream.imageAlignmentStatus}\``,
  `- upstream trace review: \`${report.upstream.traceReviewStatus}\``,
  `- total blocks: \`${report.upstream.totalBlocks}\``,
  '',
  '## Zone Summary',
  '',
  markdownTable(
    [
      'Zone',
      'Status',
      'Blocks',
      'Audit Rows',
      'Trace Rows',
      'Min Recall',
      'Min IoU',
      'Max Bleed',
      'Min Scan Coverage',
      'Max Fill Delta',
      'Top Hit Failures',
      'Blockers',
    ],
    zoneRows.map((zone) => [
      zone.label,
      zone.status,
      zone.blockCount,
      zone.auditedBlockCount,
      zone.traceReviewBlockCount,
      zone.minimumOfficialBlockMaskRecall,
      zone.minimumComponentIoU,
      zone.maximumOutsideBleedRatio,
      zone.minimumScanCoverageRatio,
      zone.maximumLocalFillBoundsMaxAbsDelta,
      zone.labelTopHitFailures,
      zone.blockers.length ? zone.blockers.join('<br>') : '-',
    ]),
  ),
  '',
  '## Evidence Artifacts',
  '',
  ...zoneRows.flatMap((zone) => [
    `### ${zone.label}`,
    '',
    `- status: \`${zone.status}\``,
    `- note: ${zone.statusNote}`,
    `- blockIds: \`${zone.blockIds.join(', ')}\``,
    ...zone.artifacts.map((artifact) => `- artifact: \`${artifact}\``),
    '',
  ]),
  '## Source Policy',
  '',
  `- allowed coordinate source: \`${report.sourcePolicy.coordinateSource}\``,
  `- disallowed sources: \`${(report.sourcePolicy.disallowedSources ?? []).join(', ')}\``,
  `- missing baseball data contract: \`${report.sourcePolicy.missingBaseballDataContract}\``,
  '',
].join('\n');

await fs.writeFile(`${outputBase}.md`, markdown, 'utf8');

console.log(`evidence_inventory_json:${outputBase}.json`);
console.log(`evidence_inventory_csv:${outputBase}.csv`);
console.log(`evidence_inventory_markdown:${outputBase}.md`);
console.log(`status:${report.status}`);
