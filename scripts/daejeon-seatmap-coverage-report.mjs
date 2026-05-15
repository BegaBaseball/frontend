import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCoordinateChangeImpact,
  coordinateChangeImpactContract,
} from './daejeon-seatmap-anchor-contract.mjs';

import {
  DAEJEON_BLOCKS,
  DAEJEON_P2_DEDUPLICATED_ALIASES,
  DAEJEON_TRACE_REVIEW_SUMMARY,
  isDaejeonSelectableSeatBlock,
} from '../src/data/daejeonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const outputRoot = path.join(repoRoot, 'output/playwright');
const manifestPath = path.join(reportDir, 'daejeon-seatmap-trace-review.json');
const anchorCropsPath = path.join(outputRoot, 'daejeon-anchor-review/daejeon-anchor-review-crops.json');
const testSourcePath = path.join(frontendRoot, 'src/data/daejeonSeatData.test.ts');
const jsonPath = path.join(reportDir, 'daejeon-seatmap-coverage-report.json');
const markdownPath = path.join(reportDir, 'daejeon-seatmap-coverage-report.md');

const ownerPointRequiredParentIds = new Set([
  'first-infield-b-101-108',
  'first-infield-a-109-112-201-212',
  'third-infield-a-113-120-213-225',
  'third-infield-b-121-124',
  'first-table-4f-301-413',
  'third-table-4f-414-330',
  'innings-vip-400',
  'splash-jacuzzi-425',
  'splash-caravan-426',
  'central-accessible',
  'first-infield-accessible',
  'third-infield-accessible',
  'outfield-lawn-500',
  'outfield-table-third-501-503',
  'outfield-table-first-504-508',
  'outfield-reserved-509',
  'outfield-reserved-third-423-330',
  'outfield-accessible-third',
  'outfield-accessible-first',
]);

const ownerPointLockedParentIds = new Set(ownerPointRequiredParentIds);

const anchorExceptionByParentId = new Map();

const finderSearchTerms = [
  { term: '100B', expectedBlockIds: ['central-reserved-100__100b', 'catcher-back-100__100b', 'central-table-100__100b'] },
  { term: '104', expectedBlockIds: ['first-infield-b-101-108__104'] },
  { term: '109', expectedBlockIds: ['first-infield-a-109-112-201-212__109'] },
  { term: '120', expectedBlockIds: ['third-infield-a-113-120-213-225__120'] },
  { term: '124', expectedBlockIds: ['third-infield-b-121-124__124'] },
  { term: '200', expectedBlockIds: ['cass-cheering-200__200'] },
  { term: '225', expectedBlockIds: ['third-infield-a-113-120-213-225__225'] },
  { term: '301', expectedBlockIds: ['first-table-4f-301-413__301'] },
  { term: '413', expectedBlockIds: ['first-table-4f-301-413__413'] },
  { term: '424', expectedBlockIds: ['outfield-reserved-third-423-330__424'] },
  { term: '425', expectedBlockIds: ['splash-jacuzzi-425__425'] },
  { term: '426', expectedBlockIds: ['splash-caravan-426__426'] },
  { term: '500', expectedBlockIds: ['outfield-lawn-500__500'] },
  { term: '501', expectedBlockIds: ['outfield-table-third-501-503__501'] },
  { term: '508', expectedBlockIds: ['outfield-table-first-504-508__508'] },
  { term: '509', expectedBlockIds: ['outfield-reserved-509__509'] },
  { term: 'S01', expectedBlockIds: ['skybox-s01-s37__s01'] },
  { term: 'S37', expectedBlockIds: ['skybox-s01-s37__s37'] },
];

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const markdownBlockIdSummary = (blockIds) => {
  if (blockIds.length === 0) return '-';
  if (blockIds.length <= 12) return blockIds.map((id) => `\`${id}\``).join('<br>');

  return [
    `count ${blockIds.length}`,
    ...blockIds.slice(0, 5).map((id) => `\`${id}\``),
    '...',
    ...blockIds.slice(-3).map((id) => `\`${id}\``),
  ].join('<br>');
};

const manifest = await readJson(manifestPath);
const anchorCrops = await readJson(anchorCropsPath);
const testSource = await fs.readFile(testSourcePath, 'utf8');

const manifestRowsById = new Map((manifest.blocks ?? []).map((block) => [block.id, block]));
const anchorCropIdsByBlockId = new Map();
const anchorImpactByBlockId = new Map();

for (const crop of anchorCrops.crops ?? []) {
  for (const blockId of crop.blocks ?? []) {
    const ids = anchorCropIdsByBlockId.get(blockId) ?? [];
    ids.push(crop.id);
    anchorCropIdsByBlockId.set(blockId, ids);

    const entries = anchorImpactByBlockId.get(blockId) ?? [];
    entries.push({
      cropId: crop.id,
      reviewPriority: crop.reviewPriority ?? 'P2',
      reviewMode: crop.reviewMode ?? 'VISUAL_CROP_REVIEW',
      regressionTestIds: crop.regressionTestIds ?? [],
      riskTags: crop.riskTags ?? [],
      manualOnlyReason: crop.manualOnlyReason ?? null,
    });
    anchorImpactByBlockId.set(blockId, entries);
  }
}

const reviewPriorityRank = { P0: 0, P1: 1, P2: 2 };
const reviewModeRank = {
  AUTO_OWNER_POINT_REGRESSION: 0,
  VISUAL_CROP_REVIEW: 1,
  MANUAL_CROP_ONLY: 2,
};
const uniqueSorted = (values) => [...new Set(values)].sort();

const impactForBlock = (blockId) => {
  const entries = anchorImpactByBlockId.get(blockId) ?? [];
  const reviewPriorities = uniqueSorted(entries.map((entry) => entry.reviewPriority))
    .sort((a, b) => reviewPriorityRank[a] - reviewPriorityRank[b]);
  const reviewModes = uniqueSorted(entries.map((entry) => entry.reviewMode))
    .sort((a, b) => reviewModeRank[a] - reviewModeRank[b]);

  return {
    regressionTestIds: uniqueSorted(entries.flatMap((entry) => entry.regressionTestIds)),
    reviewPriority: reviewPriorities[0] ?? 'NONE',
    reviewPriorities,
    reviewMode: reviewModes[0] ?? 'NONE',
    reviewModes,
    riskTags: uniqueSorted(entries.flatMap((entry) => entry.riskTags)),
    manualOnlyReasons: uniqueSorted(entries.map((entry) => entry.manualOnlyReason).filter(Boolean)),
  };
};

const retiredIds = new Set(DAEJEON_P2_DEDUPLICATED_ALIASES.map((alias) => alias.retiredBlockId));

const blocks = DAEJEON_BLOCKS.map((block) => {
  const manifestRow = manifestRowsById.get(block.id);
  const anchorCropIds = anchorCropIdsByBlockId.get(block.id) ?? [];
  const impact = impactForBlock(block.id);
  const anchorExceptionReason = anchorExceptionByParentId.get(block.parentId) ?? '';
  const ownerPointRequired = ownerPointRequiredParentIds.has(block.parentId);
  const ownerPointLocked = ownerPointLockedParentIds.has(block.parentId);
  const labelTopHitOk = manifestRow?.labelTopHitOk === true;
  const hasAnchorCrop = anchorCropIds.length > 0;
  const hasAnchorCoverage = hasAnchorCrop || Boolean(anchorExceptionReason);
  const dataTestCovered = testSource.includes(block.id);
  const sourceLocked = block.traceStatus === 'OFFICIAL_IMAGE_TRACED'
    && block.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
    && block.sourceConfidence === 'OFFICIAL'
    && isDaejeonSelectableSeatBlock(block);

  const coverageStatus = labelTopHitOk
    && sourceLocked
    && hasAnchorCoverage
    && (!ownerPointRequired || ownerPointLocked)
    ? anchorExceptionReason
      ? 'LABEL_ONLY'
      : 'LOCKED'
    : 'PARTIAL';

  return {
    id: block.id,
    parentId: block.parentId,
    blockCode: block.blockCode,
    officialSectionName: block.officialSectionName,
    category: block.category,
    traceStatus: block.traceStatus,
    traceMethod: block.traceMethod,
    sourceConfidence: block.sourceConfidence,
    selectable: isDaejeonSelectableSeatBlock(block),
    labelTopHitOk,
    labelTopHitBlockId: manifestRow?.labelTopHitBlockId ?? null,
    dataTestCovered,
    anchorCropIds,
    regressionTestIds: impact.regressionTestIds,
    reviewPriority: impact.reviewPriority,
    reviewPriorities: impact.reviewPriorities,
    reviewMode: impact.reviewMode,
    reviewModes: impact.reviewModes,
    riskTags: impact.riskTags,
    manualOnlyReasons: impact.manualOnlyReasons,
    hasAnchorCrop,
    anchorExceptionReason,
    ownerPointRequired,
    ownerPointLocked,
    coverageStatus,
  };
});

const missingLabelTopHit = blocks.filter((block) => !block.labelTopHitOk);
const missingAnchorWithoutException = blocks.filter((block) => !block.hasAnchorCrop && !block.anchorExceptionReason);
const missingOwnerPointRequired = blocks.filter((block) => block.ownerPointRequired && !block.ownerPointLocked);
const partialBlocks = blocks.filter((block) => block.coverageStatus === 'PARTIAL');
const labelOnlyBlocks = blocks.filter((block) => block.coverageStatus === 'LABEL_ONLY');
const lockedBlocks = blocks.filter((block) => block.coverageStatus === 'LOCKED');
const retiredBlocksInOperationalData = blocks.filter((block) => retiredIds.has(block.id));
const coordinateChangeImpact = buildCoordinateChangeImpact(blocks);

if (coordinateChangeImpact.contract !== coordinateChangeImpactContract) {
  throw new Error(`Unexpected Daejeon coordinate impact contract: ${coordinateChangeImpact.contract}`);
}

const summary = {
  generatedAt: new Date().toISOString(),
  totalBlocks: DAEJEON_BLOCKS.length,
  officialImageTraced: DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced,
  needsOperatorReview: DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview,
  lockedCount: lockedBlocks.length,
  labelOnlyCount: labelOnlyBlocks.length,
  partialCount: partialBlocks.length,
  anchorExceptionCount: labelOnlyBlocks.length,
  missingLabelTopHitCount: missingLabelTopHit.length,
  missingAnchorWithoutExceptionCount: missingAnchorWithoutException.length,
  missingOwnerPointRequiredCount: missingOwnerPointRequired.length,
  retiredBlocksInOperationalDataCount: retiredBlocksInOperationalData.length,
  coordinateImpactContract: coordinateChangeImpact.contract,
  coordinateImpactCounts: coordinateChangeImpact.counts,
};

const report = {
  generatedAt: summary.generatedAt,
  policy: {
    coordinateSystem: 'official PNG 920x1060',
    statuses: ['LOCKED', 'PARTIAL', 'LABEL_ONLY'],
    ownerPointRequiredParentIds: [...ownerPointRequiredParentIds],
    anchorExceptionByParentId: Object.fromEntries(anchorExceptionByParentId),
    note: 'LABEL_ONLY 예외는 허용하지 않는다. 모든 운영 선택 블록은 anchor crop 또는 owner-point 검수 coverage를 가져야 한다.',
  },
  summary,
  finderSearchTerms,
  missingLabelTopHit: missingLabelTopHit.map((block) => block.id),
  missingAnchorWithoutException: missingAnchorWithoutException.map((block) => block.id),
  missingOwnerPointRequired: missingOwnerPointRequired.map((block) => block.id),
  partialBlocks: partialBlocks.map((block) => block.id),
  labelOnlyBlocks: labelOnlyBlocks.map((block) => block.id),
  retiredBlocksInOperationalData: retiredBlocksInOperationalData.map((block) => block.id),
  coordinateChangeImpact,
  blocks,
};

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const statusRows = [
  ['total blocks', String(summary.totalBlocks)],
  ['official image traced', String(summary.officialImageTraced)],
  ['needs operator review', String(summary.needsOperatorReview)],
  ['LOCKED', String(summary.lockedCount)],
  ['LABEL_ONLY', String(summary.labelOnlyCount)],
  ['PARTIAL', String(summary.partialCount)],
  ['missing label top-hit', String(summary.missingLabelTopHitCount)],
  ['missing anchor without exception', String(summary.missingAnchorWithoutExceptionCount)],
  ['missing owner-point required', String(summary.missingOwnerPointRequiredCount)],
  ['retired operational blocks', String(summary.retiredBlocksInOperationalDataCount)],
];
const operatorReviewRows = [
  ['operational blocks', summary.totalBlocks === 145 ? 'PASS' : 'BLOCK', `${summary.totalBlocks}/145`],
  ['coverage locked', summary.lockedCount === summary.totalBlocks ? 'PASS' : 'BLOCK', `${summary.lockedCount}/${summary.totalBlocks}`],
  ['label-only exceptions', summary.labelOnlyCount === 0 ? 'PASS' : 'BLOCK', String(summary.labelOnlyCount)],
  ['partial blocks', summary.partialCount === 0 ? 'PASS' : 'BLOCK', String(summary.partialCount)],
  ['label top-hit failures', summary.missingLabelTopHitCount === 0 ? 'PASS' : 'BLOCK', String(summary.missingLabelTopHitCount)],
  ['missing anchor coverage', summary.missingAnchorWithoutExceptionCount === 0 ? 'PASS' : 'BLOCK', String(summary.missingAnchorWithoutExceptionCount)],
  ['missing owner-point lock', summary.missingOwnerPointRequiredCount === 0 ? 'PASS' : 'BLOCK', String(summary.missingOwnerPointRequiredCount)],
  ['retired P2 in operational data', summary.retiredBlocksInOperationalDataCount === 0 ? 'PASS' : 'BLOCK', String(summary.retiredBlocksInOperationalDataCount)],
];
const releaseBlockers = [
  ['partial blocks > 0', summary.partialCount],
  ['LABEL_ONLY exceptions > 0', summary.labelOnlyCount],
  ['missing label top-hit > 0', summary.missingLabelTopHitCount],
  ['missing anchor without exception > 0', summary.missingAnchorWithoutExceptionCount],
  ['missing owner-point required > 0', summary.missingOwnerPointRequiredCount],
  ['retired operational blocks > 0', summary.retiredBlocksInOperationalDataCount],
];

await fs.writeFile(markdownPath, [
  '# 대전 좌석도 coverage report',
  '',
  `- generated: ${summary.generatedAt}`,
  '- coordinate system: official PNG 920x1060',
  '- LABEL_ONLY exception: none',
  '',
  '## Operator Review',
  '',
  markdownTable(['check', 'status', 'value'], operatorReviewRows),
  '',
  '## Release Blockers',
  '',
  markdownTable(
    ['condition', 'current count'],
    releaseBlockers.map(([label, count]) => [label, String(count)]),
  ),
  '',
  '배포 승인 전 위 count가 모두 0이어야 한다. `coverage locked`는 145/145여야 한다.',
  '',
  '## Summary',
  '',
  markdownTable(['metric', 'value'], statusRows),
  '',
  '## Coordinate Change Impact',
  '',
  `- contract: \`${coordinateChangeImpact.contract}\``,
  '- 좌표 변경 시 아래 crop/test 역매핑 기준으로 재검수 범위를 결정한다.',
  '',
  markdownTable(
    ['impact group', 'count', 'block ids'],
    [
      ['P0 crop coverage', String(coordinateChangeImpact.counts.p0), markdownBlockIdSummary(coordinateChangeImpact.p0BlockIds)],
      ['P1 crop coverage', String(coordinateChangeImpact.counts.p1), markdownBlockIdSummary(coordinateChangeImpact.p1BlockIds)],
      ['P2 auto regression coverage', String(coordinateChangeImpact.counts.p2Auto), markdownBlockIdSummary(coordinateChangeImpact.p2AutoBlockIds)],
      ['P2 manual crop-only coverage', String(coordinateChangeImpact.counts.p2ManualOnly), markdownBlockIdSummary(coordinateChangeImpact.p2ManualOnlyBlockIds)],
      ['auto regression blocks', String(coordinateChangeImpact.counts.autoRegression), markdownBlockIdSummary(coordinateChangeImpact.autoRegressionBlockIds)],
      ['manual crop-only blocks', String(coordinateChangeImpact.counts.manualCropOnly), markdownBlockIdSummary(coordinateChangeImpact.manualCropOnlyBlockIds)],
      ['traced without regression', String(coordinateChangeImpact.counts.tracedWithoutRegression), markdownBlockIdSummary(coordinateChangeImpact.tracedWithoutRegressionBlockIds)],
      ['missing impact mapping', String(coordinateChangeImpact.counts.missingImpact), markdownBlockIdSummary(coordinateChangeImpact.missingImpactBlockIds)],
    ],
  ),
  '',
  '## Finder Search Terms',
  '',
  markdownTable(
    ['term', 'expected block ids'],
    finderSearchTerms.map((item) => [item.term, item.expectedBlockIds.map((id) => `\`${id}\``).join('<br>')]),
  ),
  '',
  '## Label-Only Exceptions',
  '',
  labelOnlyBlocks.length
    ? markdownTable(
      ['block', 'reason'],
      labelOnlyBlocks.map((block) => [`\`${block.id}\``, block.anchorExceptionReason]),
    )
    : '- none',
  '',
  '## Block Matrix',
  '',
  markdownTable(
    ['block', 'code', 'status', 'priority', 'review mode', 'regression tests', 'risk tags', 'label top-hit', 'anchor crop', 'owner point', 'data test'],
    blocks.map((block) => [
      `\`${block.id}\``,
      block.blockCode,
      block.coverageStatus,
      block.reviewPriority,
      block.reviewMode,
      block.regressionTestIds.map((id) => `\`${id}\``).join('<br>') || '-',
      block.riskTags.map((tag) => `\`${tag}\``).join(' ') || '-',
      String(block.labelTopHitOk),
      block.anchorCropIds.length ? block.anchorCropIds.map((id) => `\`${id}\``).join('<br>') : block.anchorExceptionReason || '-',
      block.ownerPointRequired ? String(block.ownerPointLocked) : 'not required',
      String(block.dataTestCovered),
    ]),
  ),
  '',
].join('\n'), 'utf8');

console.log(`coverage_json:${jsonPath}`);
console.log(`coverage_markdown:${markdownPath}`);
console.log(`status:ok total=${summary.totalBlocks} locked=${summary.lockedCount} labelOnly=${summary.labelOnlyCount} partial=${summary.partialCount} missingLabelTopHit=${summary.missingLabelTopHitCount} missingAnchorWithoutException=${summary.missingAnchorWithoutExceptionCount} missingOwnerPointRequired=${summary.missingOwnerPointRequiredCount}`);
