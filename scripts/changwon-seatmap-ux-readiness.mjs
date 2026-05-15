import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHANGWON_BLOCKS,
  CHANGWON_CATEGORY_GROUPS,
  CHANGWON_EXPECTED_SELECTABLE_AREAS,
  CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS,
  CHANGWON_SEATMAP_IMAGE,
  CHANGWON_SPECIAL_SELECTABLE_AREAS,
  getChangwonBlockDisplayName,
  getChangwonSeatMapSearchTokens,
  isChangwonBlockInCategoryGroup,
  isChangwonSpecialSelectableArea,
  normalizeChangwonSeatMapSearchText,
  searchChangwonSeatMapBlocks,
} from '../src/data/changwonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports', 'stadium');
const traceReviewPath = path.join(reportDir, 'changwon-seatmap-trace-review.json');
const visualApprovalPath = path.join(reportDir, 'changwon-seatmap-visual-approval.json');
const uxReadinessJsonPath = path.join(reportDir, 'changwon-seatmap-ux-readiness.json');
const uxReadinessMdPath = path.join(reportDir, 'changwon-seatmap-ux-readiness.md');

const requiredReleaseLockZeroFields = [
  'topHitMismatches',
  'expandedHitAreaInterceptWarnings',
  'representativeProbeMismatches',
  'foreignLabelAnchors',
  'overlapWarnings',
  'needsTraceAdjustment',
];

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((value) => String(value).replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

const traceReview = await readJsonIfExists(traceReviewPath);
const visualApproval = await readJsonIfExists(visualApprovalPath);
const traceSummary = traceReview?.summary ?? {};
const visualApprovalSummary = visualApproval?.summary ?? {};
const traceRowsByBlock = new Map((traceReview?.blocks ?? []).map((row) => [row.block, row]));
const blockers = [];

if (!traceReview) {
  blockers.push('missing trace-review report; run npm run stadium:changwon:trace-manifest first');
}

if (!visualApproval) {
  blockers.push('missing visual-approval report; run npm run stadium:changwon:trace-manifest first');
}

requiredReleaseLockZeroFields.forEach((field) => {
  if (traceSummary[field] !== 0) {
    blockers.push(`release-lock ${field} expected 0 but got ${traceSummary[field] ?? 'missing'}`);
  }
});

const searchCoverage = CHANGWON_BLOCKS.map((block) => {
  const tokens = getChangwonSeatMapSearchTokens(block);
  const normalizedBlock = normalizeChangwonSeatMapSearchText(block.block);
  const normalizedSeatTypes = block.seatTypes.map(normalizeChangwonSeatMapSearchText);
  const normalizedSeatViewSections = block.seatViewSections.map(normalizeChangwonSeatMapSearchText);

  return {
    id: block.id,
    block: block.block,
    displayName: getChangwonBlockDisplayName(block),
    isSpecialSelectableArea: isChangwonSpecialSelectableArea(block),
    tokenCount: tokens.length,
    coversBlock: tokens.includes(normalizedBlock),
    coversSeatTypes: normalizedSeatTypes.every((seatType) => tokens.includes(seatType)),
    coversSeatViewSections: normalizedSeatViewSections.every((section) => tokens.includes(section)),
    tokens,
  };
});

const searchableSelectableAreas = searchCoverage.filter((row) => (
  row.tokenCount > 0
  && row.coversBlock
  && row.coversSeatTypes
  && row.coversSeatViewSections
)).length;
const searchCoverageFailures = searchCoverage.filter((row) => (
  row.tokenCount === 0
  || !row.coversBlock
  || !row.coversSeatTypes
  || !row.coversSeatViewSections
));

if (searchableSelectableAreas !== CHANGWON_EXPECTED_SELECTABLE_AREAS.length) {
  blockers.push(`searchable selectable areas expected ${CHANGWON_EXPECTED_SELECTABLE_AREAS.length} but got ${searchableSelectableAreas}`);
}

const filterCounts = CHANGWON_CATEGORY_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  count: CHANGWON_BLOCKS.filter((block) => isChangwonBlockInCategoryGroup(block, group)).length,
}));
filterCounts
  .filter((filter) => filter.count <= 0)
  .forEach((filter) => blockers.push(`filter ${filter.id} has no selectable areas`));

const specialSelectableAreaCoverage = CHANGWON_SPECIAL_SELECTABLE_AREAS.map((area) => {
  const block = CHANGWON_BLOCKS.find((candidate) => candidate.block === area);
  const searchResults = searchChangwonSeatMapBlocks(area).map((result) => result.block);
  return {
    target: area,
    exists: Boolean(block),
    id: block?.id ?? null,
    displayName: block ? getChangwonBlockDisplayName(block) : null,
    searchReturnsTarget: searchResults.includes(area),
    searchResultCount: searchResults.length,
  };
});
specialSelectableAreaCoverage
  .filter((row) => !row.exists || !row.searchReturnsTarget)
  .forEach((row) => blockers.push(`special selectable area search coverage failed for ${row.target}`));

const searchProbes = [
  {
    query: '125',
    expectedBlocks: ['125'],
    expectedFirstBlock: '125',
    note: 'exact numeric search should keep immediate block selection behavior',
  },
  {
    query: '바베큐',
    expectedBlocks: ['1루 바베큐석', '126', '127'],
    note: 'text search should expose both numbered BBQ blocks and the special BBQ area',
  },
  {
    query: '응원석',
    expectedBlocks: ['105', '121'],
    note: 'cheering category and aliases should be searchable',
  },
  {
    query: '휠체어',
    expectedBlocks: ['105', '325'],
    note: 'accessible blocks should be discoverable through accessibility notes',
  },
  {
    query: '외야 가족',
    expectedBlocks: ['외야 가족석'],
    note: 'special outfield family area should be searchable by seat type/name',
  },
].map((probe) => {
  const results = searchChangwonSeatMapBlocks(probe.query).map((block) => block.block);
  const missingExpectedBlocks = probe.expectedBlocks.filter((block) => !results.includes(block));
  const firstBlockMatches = probe.expectedFirstBlock ? results[0] === probe.expectedFirstBlock : true;
  return {
    ...probe,
    resultCount: results.length,
    results,
    missingExpectedBlocks,
    firstBlockMatches,
    status: missingExpectedBlocks.length === 0 && firstBlockMatches ? 'PASS' : 'FAIL',
  };
});
searchProbes
  .filter((probe) => probe.status !== 'PASS')
  .forEach((probe) => blockers.push(`search probe ${probe.query} failed`));

const lowCoverageApprovedExceptions = CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS.map((block) => {
  const traceRow = traceRowsByBlock.get(block);
  return {
    block,
    pixelCoverageRatio: traceRow?.pixelCoverageRatio ?? null,
    visualAlignmentStatus: traceRow?.visualAlignmentStatus ?? null,
    approvedException: traceSummary.lowCoverageApprovedExceptionBlocks?.includes(block) ?? false,
  };
});
const lowCoverageApprovedExceptionBlocks = lowCoverageApprovedExceptions
  .filter((row) => row.approvedException)
  .map((row) => row.block);

if (lowCoverageApprovedExceptionBlocks.length !== CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS.length) {
  blockers.push(`low coverage approved exceptions expected ${CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS.length} but got ${lowCoverageApprovedExceptionBlocks.length}`);
}

if (traceSummary.totalBlocks !== CHANGWON_EXPECTED_SELECTABLE_AREAS.length) {
  blockers.push(`trace summary totalBlocks expected ${CHANGWON_EXPECTED_SELECTABLE_AREAS.length} but got ${traceSummary.totalBlocks ?? 'missing'}`);
}

if (traceSummary.specialSelectableAreas !== CHANGWON_SPECIAL_SELECTABLE_AREAS.length) {
  blockers.push(`trace summary specialSelectableAreas expected ${CHANGWON_SPECIAL_SELECTABLE_AREAS.length} but got ${traceSummary.specialSelectableAreas ?? 'missing'}`);
}

if (visualApprovalSummary.confirmedHumanSignoff !== 11 || visualApprovalSummary.pendingHumanSignoff !== 0) {
  blockers.push(`visual approval signoff expected confirmed=11 pending=0 but got confirmed=${visualApprovalSummary.confirmedHumanSignoff ?? 'missing'} pending=${visualApprovalSummary.pendingHumanSignoff ?? 'missing'}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  asset: CHANGWON_SEATMAP_IMAGE,
  summary: {
    totalBlocks: CHANGWON_BLOCKS.length,
    expectedSelectableAreas: CHANGWON_EXPECTED_SELECTABLE_AREAS.length,
    searchableSelectableAreas,
    specialSelectableAreas: specialSelectableAreaCoverage.filter((row) => row.exists).length,
    filterGroups: filterCounts.length,
    missingFilterCounts: filterCounts.filter((filter) => filter.count <= 0).length,
    lowCoverageApprovedExceptions: lowCoverageApprovedExceptionBlocks.length,
    lowCoverageApprovedExceptionTargets: CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS.length,
    releaseClassification: traceSummary.releaseClassification ?? null,
    blockers,
  },
  releaseLockSummary: {
    totalBlocks: traceSummary.totalBlocks ?? null,
    topHitMismatches: traceSummary.topHitMismatches ?? null,
    expandedHitAreaInterceptWarnings: traceSummary.expandedHitAreaInterceptWarnings ?? null,
    representativeProbeMismatches: traceSummary.representativeProbeMismatches ?? null,
    foreignLabelAnchors: traceSummary.foreignLabelAnchors ?? null,
    overlapWarnings: traceSummary.overlapWarnings ?? null,
    needsTraceAdjustment: traceSummary.needsTraceAdjustment ?? null,
    confirmedHumanSignoff: visualApprovalSummary.confirmedHumanSignoff ?? null,
    pendingHumanSignoff: visualApprovalSummary.pendingHumanSignoff ?? null,
    traceAdjustmentCandidates: unique([
      ...(traceReview?.traceAdjustmentCandidates ?? []),
      ...(visualApprovalSummary.traceAdjustmentCandidates ?? []),
    ]),
  },
  filterCounts,
  searchProbes,
  searchCoverageFailures,
  specialSelectableAreaCoverage,
  lowCoverageApprovedExceptions,
};

const markdown = [
  '# Changwon Seatmap UX Readiness',
  '',
  '## Summary',
  `- total selectable areas: ${report.summary.totalBlocks}`,
  `- searchable selectable areas: ${report.summary.searchableSelectableAreas}`,
  `- special selectable areas: ${report.summary.specialSelectableAreas}`,
  `- low coverage approved exceptions: ${report.summary.lowCoverageApprovedExceptions}`,
  `- release classification: ${report.summary.releaseClassification ?? '-'}`,
  `- blockers: ${blockers.length}`,
  '',
  '## Release Lock',
  markdownTable(
    ['Metric', 'Value'],
    Object.entries(report.releaseLockSummary).map(([key, value]) => [
      key,
      Array.isArray(value) ? (value.length > 0 ? value.join(', ') : '[]') : value ?? '-',
    ]),
  ),
  '',
  '## Filter Counts',
  markdownTable(
    ['Filter', 'Label', 'Selectable Areas'],
    filterCounts.map((filter) => [filter.id, filter.label, filter.count]),
  ),
  '',
  '## Search Probes',
  markdownTable(
    ['Query', 'Status', 'Result Count', 'Expected', 'Note'],
    searchProbes.map((probe) => [
      probe.query,
      probe.status,
      probe.resultCount,
      probe.expectedBlocks.join(', '),
      probe.note,
    ]),
  ),
  '',
  '## Special Selectable Areas',
  markdownTable(
    ['Target', 'Exists', 'Search Returns Target', 'Result Count'],
    specialSelectableAreaCoverage.map((row) => [
      row.target,
      row.exists ? 'yes' : 'no',
      row.searchReturnsTarget ? 'yes' : 'no',
      row.searchResultCount,
    ]),
  ),
  '',
  '## Low Coverage Approved Exceptions',
  markdownTable(
    ['Block', 'Pixel Coverage Ratio', 'Visual Alignment', 'Approved Exception'],
    lowCoverageApprovedExceptions.map((row) => [
      row.block,
      row.pixelCoverageRatio === null ? '-' : row.pixelCoverageRatio.toFixed(3),
      row.visualAlignmentStatus ?? '-',
      row.approvedException ? 'yes' : 'no',
    ]),
  ),
  '',
  blockers.length > 0 ? `## Blockers\n${blockers.map((blocker) => `- ${blocker}`).join('\n')}` : '## Blockers\n- none',
  '',
].join('\n');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(uxReadinessJsonPath, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(uxReadinessMdPath, markdown);

if (blockers.length > 0) {
  throw new Error(`Changwon UX readiness failed: ${blockers.join('; ')}`);
}

console.log(`status:ok searchableSelectableAreas=${searchableSelectableAreas} specialSelectableAreas=${report.summary.specialSelectableAreas} filterGroups=${filterCounts.length} lowCoverageApprovedExceptions=${lowCoverageApprovedExceptionBlocks.length} blockers=0`);
