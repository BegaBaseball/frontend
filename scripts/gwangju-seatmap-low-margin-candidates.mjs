import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
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
const outputBase = path.join(reportDir, 'gwangju-seatmap-low-margin-candidates');
const outputFileNames = {
  json: 'gwangju-seatmap-low-margin-candidates.json',
  csv: 'gwangju-seatmap-low-margin-candidates.csv',
  markdown: 'gwangju-seatmap-low-margin-candidates.md',
};

const REPORT_VERSION = 'GWANGJU_LOW_MARGIN_CANDIDATES_V1';
const NUMBERED_PIXEL_ACCEPTANCE_MIN = 0.82;
const SPECIAL_PIXEL_ACCEPTANCE_MIN = 0.70;
const NUMBERED_PIXEL_REVIEW_TARGET = 0.92;
const SPECIAL_PIXEL_REVIEW_TARGET = 0.95;
const COMPONENT_RECALL_REVIEW_TARGET = 0.88;
const COMPONENT_IOU_REVIEW_TARGET = 0.70;
const WATCH_WORKSET_IDS = new Set([
  'p1-op-outfield-component',
  'p2-lower-infield-low-margin',
]);
const NUMBERED_CATEGORIES = new Set([
  'K5',
  'K7',
  'K8',
  'K9',
  'SKY_PICNIC',
  'FIVE_TABLE',
]);

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const markdownCell = (value) => String(Array.isArray(value) ? value.join(', ') : value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const rounded = (value) => (typeof value === 'number' ? Number(value.toFixed(4)) : null);
const priorityRank = (priority) => Number(priority?.replace('P', '') ?? 99);

const readTraceReview = async () => {
  try {
    return JSON.parse(await fs.readFile(traceReviewPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const cleanCropPathsByBlockId = (traceReview) => new Map(
  (traceReview?.artifacts?.cleanOverlayArtifacts ?? [])
    .map((artifact) => [artifact.id, path.relative(frontendRoot, artifact.path)]),
);

const pixelThresholdsFor = (block) => {
  const numbered = NUMBERED_CATEGORIES.has(block.category);
  return {
    acceptanceMinimum: numbered ? NUMBERED_PIXEL_ACCEPTANCE_MIN : SPECIAL_PIXEL_ACCEPTANCE_MIN,
    reviewTarget: numbered ? NUMBERED_PIXEL_REVIEW_TARGET : SPECIAL_PIXEL_REVIEW_TARGET,
    group: numbered ? 'numbered' : 'special-or-outfield',
  };
};

const createCandidateRow = (block, cleanCropPath) => {
  const pixelThresholds = pixelThresholdsFor(block);
  const componentMinimumRecall = block.officialComponentMinimumRecall;
  const componentMinimumIoU = block.officialComponentMinimumIoU;
  const pixelCoverageRatio = block.pixelCoverageRatio;
  const officialComponentRecall = block.officialComponentRecall;
  const componentIoU = block.componentIoU;
  const reasons = [];
  const blockers = [];

  if (typeof pixelCoverageRatio !== 'number') {
    blockers.push('PIXEL_COVERAGE_MISSING');
  } else {
    if (pixelCoverageRatio < pixelThresholds.acceptanceMinimum) {
      blockers.push(`PIXEL_COVERAGE_BELOW_ACCEPTANCE:${pixelCoverageRatio}`);
    }
    if (pixelCoverageRatio <= pixelThresholds.reviewTarget) {
      reasons.push('PIXEL_COVERAGE_REVIEW_TARGET');
    }
  }

  if (typeof officialComponentRecall === 'number') {
    if (typeof componentMinimumRecall === 'number' && officialComponentRecall < componentMinimumRecall) {
      blockers.push(`COMPONENT_RECALL_BELOW_ACCEPTANCE:${officialComponentRecall}`);
    }
    if (officialComponentRecall <= COMPONENT_RECALL_REVIEW_TARGET) {
      reasons.push('COMPONENT_RECALL_REVIEW_TARGET');
    }
  }

  if (typeof componentIoU === 'number') {
    if (typeof componentMinimumIoU === 'number' && componentIoU < componentMinimumIoU) {
      blockers.push(`COMPONENT_IOU_BELOW_ACCEPTANCE:${componentIoU}`);
    }
    if (componentIoU <= COMPONENT_IOU_REVIEW_TARGET) {
      reasons.push('COMPONENT_IOU_REVIEW_TARGET');
    }
  }

  if ((block.zonePrecisionWorksetIds ?? []).some((worksetId) => WATCH_WORKSET_IDS.has(worksetId))) {
    reasons.push('P1_P2_BOUNDARY_WATCH');
  }

  const uniqueReasons = [...new Set(reasons)];
  const rowStatus = blockers.length > 0
    ? 'blocking'
    : uniqueReasons.some((reason) => reason.endsWith('_REVIEW_TARGET'))
      ? 'review'
      : uniqueReasons.length > 0
        ? 'watch'
        : 'not-candidate';
  const minimumPriority = (block.zonePrecisionPriorities ?? ['P5'])
    .slice()
    .sort((left, right) => priorityRank(left) - priorityRank(right))[0];

  return {
    id: block.id,
    block: block.block,
    category: block.category,
    level: block.level,
    side: block.side,
    fanRole: block.fanRole,
    priority: minimumPriority,
    status: rowStatus,
    reasons: uniqueReasons,
    blockers,
    zonePrecisionWorksetIds: block.zonePrecisionWorksetIds ?? [],
    pixelCoverageGroup: pixelThresholds.group,
    pixelCoverageRatio: rounded(pixelCoverageRatio),
    pixelCoverageAcceptanceMinimum: pixelThresholds.acceptanceMinimum,
    pixelCoverageReviewTarget: pixelThresholds.reviewTarget,
    pixelCoverageAcceptanceMargin: rounded(
      typeof pixelCoverageRatio === 'number'
        ? pixelCoverageRatio - pixelThresholds.acceptanceMinimum
        : null,
    ),
    pixelCoverageReviewTargetMargin: rounded(
      typeof pixelCoverageRatio === 'number'
        ? pixelCoverageRatio - pixelThresholds.reviewTarget
        : null,
    ),
    officialComponentRecall: rounded(officialComponentRecall),
    officialComponentMinimumRecall: rounded(componentMinimumRecall),
    officialComponentRecallReviewTarget: typeof officialComponentRecall === 'number'
      ? COMPONENT_RECALL_REVIEW_TARGET
      : null,
    officialComponentRecallAcceptanceMargin: rounded(
      typeof officialComponentRecall === 'number' && typeof componentMinimumRecall === 'number'
        ? officialComponentRecall - componentMinimumRecall
        : null,
    ),
    officialComponentRecallReviewTargetMargin: rounded(
      typeof officialComponentRecall === 'number'
        ? officialComponentRecall - COMPONENT_RECALL_REVIEW_TARGET
        : null,
    ),
    componentIoU: rounded(componentIoU),
    officialComponentMinimumIoU: rounded(componentMinimumIoU),
    componentIoUReviewTarget: typeof componentIoU === 'number'
      ? COMPONENT_IOU_REVIEW_TARGET
      : null,
    componentIoUAcceptanceMargin: rounded(
      typeof componentIoU === 'number' && typeof componentMinimumIoU === 'number'
        ? componentIoU - componentMinimumIoU
        : null,
    ),
    componentIoUReviewTargetMargin: rounded(
      typeof componentIoU === 'number'
        ? componentIoU - COMPONENT_IOU_REVIEW_TARGET
        : null,
    ),
    previousAnchorDeltaPx: rounded(block.previousAnchorDeltaPx),
    previousBoundsDeltaPx: rounded(block.previousBoundsDeltaPx),
    previousPixelCoverageDelta: rounded(block.previousPixelCoverageDelta),
    expectedBounds: block.expectedBounds,
    cleanOverlayPath: cleanCropPath ?? null,
  };
};

const traceReview = await readTraceReview();
const cleanCropByBlockId = cleanCropPathsByBlockId(traceReview);
const blockRows = traceReview?.blocks ?? [];
const candidateRows = blockRows
  .map((block) => createCandidateRow(block, cleanCropByBlockId.get(block.id)))
  .filter((row) => row.status !== 'not-candidate')
  .sort((left, right) => (
    priorityRank(left.priority) - priorityRank(right.priority)
    || ['blocking', 'review', 'watch'].indexOf(left.status) - ['blocking', 'review', 'watch'].indexOf(right.status)
    || (left.pixelCoverageRatio ?? 9) - (right.pixelCoverageRatio ?? 9)
    || left.id.localeCompare(right.id)
  ));

const blockers = [
  ...(traceReview ? [] : [`TRACE_REVIEW_MISSING:${path.relative(frontendRoot, traceReviewPath)}`]),
];

if (traceReview) {
  if (traceReview.summary?.traceVersion !== GWANGJU_FULL_RETRACE_VERSION) {
    blockers.push(`TRACE_VERSION_NOT_V5:${traceReview.summary?.traceVersion ?? 'missing'}`);
  }
  if (traceReview.summary?.previousTraceVersion !== GWANGJU_PREVIOUS_TRACE_VERSION) {
    blockers.push(`PREVIOUS_TRACE_VERSION_NOT_V4:${traceReview.summary?.previousTraceVersion ?? 'missing'}`);
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

candidateRows
  .filter((row) => row.status === 'blocking')
  .forEach((row) => row.blockers.forEach((blocker) => blockers.push(`${row.id}:${blocker}`)));

if (!GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE) {
  blockers.push('K7_AWAY_DERIVED_RANGE_NOT_REUSING_EXISTING_TRACE');
}
if (GWANGJU_PENDING_OPERATOR_SECTIONS.join('|') !== 'K7석|원정응원석') {
  blockers.push(`PENDING_OPERATOR_SECTIONS_CHANGED:${GWANGJU_PENDING_OPERATOR_SECTIONS.join(',')}`);
}

const status = blockers.length === 0 ? 'passed' : 'failed';
const candidateRowsByWorkset = GWANGJU_ZONE_PRECISION_WORKSETS.map((workset) => ({
  id: workset.id,
  label: workset.label,
  priority: workset.priority,
  candidateCount: candidateRows.filter((row) => row.zonePrecisionWorksetIds.includes(workset.id)).length,
  reviewCount: candidateRows.filter((row) => row.zonePrecisionWorksetIds.includes(workset.id) && row.status === 'review').length,
  watchCount: candidateRows.filter((row) => row.zonePrecisionWorksetIds.includes(workset.id) && row.status === 'watch').length,
  blockingCount: candidateRows.filter((row) => row.zonePrecisionWorksetIds.includes(workset.id) && row.status === 'blocking').length,
  blockIds: candidateRows
    .filter((row) => row.zonePrecisionWorksetIds.includes(workset.id))
    .map((row) => row.id),
}));

const report = {
  generatedAt: new Date().toISOString(),
  version: REPORT_VERSION,
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
  thresholds: {
    numberedPixelAcceptanceMinimum: NUMBERED_PIXEL_ACCEPTANCE_MIN,
    specialPixelAcceptanceMinimum: SPECIAL_PIXEL_ACCEPTANCE_MIN,
    numberedPixelReviewTarget: NUMBERED_PIXEL_REVIEW_TARGET,
    specialPixelReviewTarget: SPECIAL_PIXEL_REVIEW_TARGET,
    componentRecallAcceptanceMinimum: 0.78,
    componentIoUAcceptanceMinimum: 0.62,
    componentRecallReviewTarget: COMPONENT_RECALL_REVIEW_TARGET,
    componentIoUReviewTarget: COMPONENT_IOU_REVIEW_TARGET,
    watchWorksetIds: [...WATCH_WORKSET_IDS],
  },
  summary: {
    activeBlockCount: blockRows.length,
    traceVersion: traceReview?.summary?.traceVersion ?? null,
    previousTraceVersion: traceReview?.summary?.previousTraceVersion ?? null,
    candidateCount: candidateRows.length,
    reviewCandidateCount: candidateRows.filter((row) => row.status === 'review').length,
    watchCandidateCount: candidateRows.filter((row) => row.status === 'watch').length,
    blockingCandidateCount: candidateRows.filter((row) => row.status === 'blocking').length,
    minimumPixelCoverageRatio: traceReview?.summary?.minimumPixelCoverageRatio ?? null,
    minimumOfficialComponentRecall: traceReview?.summary?.minimumOfficialComponentRecall ?? null,
    minimumComponentIoU: traceReview?.summary?.minimumComponentIoU ?? null,
    overlapWarningCount: traceReview?.summary?.overlapWarningCount ?? null,
    componentCoverageWarningCount: traceReview?.summary?.componentCoverageWarningCount ?? null,
    zonePrecisionWarningCount: traceReview?.summary?.zonePrecisionWarningCount ?? null,
    blockers: blockers.length,
  },
  candidatesByWorkset: candidateRowsByWorkset,
  candidates: candidateRows,
  blockers,
};

const jsonPath = `${outputBase}.json`;
const csvPath = `${outputBase}.csv`;
const markdownPath = `${outputBase}.md`;

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const csvRows = [
  [
    'priority',
    'status',
    'id',
    'block',
    'category',
    'reasons',
    'zonePrecisionWorksetIds',
    'pixelCoverageRatio',
    'pixelCoverageAcceptanceMargin',
    'pixelCoverageReviewTargetMargin',
    'officialComponentRecall',
    'officialComponentRecallAcceptanceMargin',
    'officialComponentRecallReviewTargetMargin',
    'componentIoU',
    'componentIoUAcceptanceMargin',
    'componentIoUReviewTargetMargin',
    'previousBoundsDeltaPx',
    'previousAnchorDeltaPx',
    'cleanOverlayPath',
  ],
  ...candidateRows.map((row) => [
    row.priority,
    row.status,
    row.id,
    row.block,
    row.category,
    row.reasons,
    row.zonePrecisionWorksetIds,
    row.pixelCoverageRatio,
    row.pixelCoverageAcceptanceMargin,
    row.pixelCoverageReviewTargetMargin,
    row.officialComponentRecall,
    row.officialComponentRecallAcceptanceMargin,
    row.officialComponentRecallReviewTargetMargin,
    row.componentIoU,
    row.componentIoUAcceptanceMargin,
    row.componentIoUReviewTargetMargin,
    row.previousBoundsDeltaPx,
    row.previousAnchorDeltaPx,
    row.cleanOverlayPath,
  ]),
];
await fs.writeFile(csvPath, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');

const markdown = [
  '# 광주 low-margin polygon candidates',
  '',
  `- version: \`${REPORT_VERSION}\``,
  `- status: \`${status}\``,
  `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
  '- coordinate source: official PNG `2200x1159` only',
  '- disallowed sources: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images',
  '- missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`',
  '',
  '## Summary',
  '',
  markdownTable(
    ['metric', 'value'],
    Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
  ),
  '',
  '## Thresholds',
  '',
  markdownTable(
    ['threshold', 'value'],
    Object.entries(report.thresholds).map(([key, value]) => [key, `\`${Array.isArray(value) ? value.join(',') : value}\``]),
  ),
  '',
  '## Candidates By Workset',
  '',
  markdownTable(
    ['priority', 'workset', 'candidates', 'review', 'watch', 'blocking', 'block ids'],
    candidateRowsByWorkset.map((workset) => [
      `\`${workset.priority}\``,
      `\`${workset.id}\``,
      `\`${workset.candidateCount}\``,
      `\`${workset.reviewCount}\``,
      `\`${workset.watchCount}\``,
      `\`${workset.blockingCount}\``,
      workset.blockIds.join(', '),
    ]),
  ),
  '',
  '## Candidate Rows',
  '',
  candidateRows.length > 0
    ? markdownTable(
      ['priority', 'status', 'id', 'block', 'reasons', 'pixel', 'pixel margin', 'recall', 'recall margin', 'IoU', 'IoU margin', 'evidence'],
      candidateRows.map((row) => [
        `\`${row.priority}\``,
        `\`${row.status}\``,
        `\`${row.id}\``,
        row.block,
        row.reasons.join(', '),
        row.pixelCoverageRatio,
        row.pixelCoverageAcceptanceMargin,
        row.officialComponentRecall,
        row.officialComponentRecallAcceptanceMargin,
        row.componentIoU,
        row.componentIoUAcceptanceMargin,
        row.cleanOverlayPath,
      ]),
    )
    : 'No low-margin candidates.',
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
  '',
].join('\n');

await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`low_margin_candidates_json:${jsonPath}`);
console.log(`low_margin_candidates_csv:${csvPath}`);
console.log(`low_margin_candidates_markdown:${markdownPath}`);
console.log(`status:${status} candidates=${candidateRows.length} review=${report.summary.reviewCandidateCount} watch=${report.summary.watchCandidateCount} blockers=${blockers.length}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
