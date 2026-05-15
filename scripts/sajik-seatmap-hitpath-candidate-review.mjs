import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS,
} from '../src/data/sajikSeatData.ts';
import {
  SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS,
  buildSajikSeatMapDataset,
  validateSajikSeatMapDataset,
  validateSajikSeatMapSectionGeometry,
} from '../src/data/sajikSeatMapDataset.ts';
import {
  pathBounds,
  polygonArea,
} from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const jsonPath = path.join(reportDir, 'sajik-seatmap-hitpath-candidate-review.json');
const markdownPath = path.join(reportDir, 'sajik-seatmap-hitpath-candidate-review.md');

const REVIEW_VERSION = 'SAJIK_HITPATH_CANDIDATE_REVIEW_V1';

const reviewGroups = [
  {
    priority: 'P0',
    batchId: 'P0-A',
    group: 'home-plate-small-blocks',
    sectionIds: ['021', '022', '031', '032'],
    reason: 'Small lower-center blocks near home plate have the highest mobile touch error risk.',
    nextAction: 'REVIEW_FIRST_KEEP_VISUAL_EQUALS_HITPATH',
  },
  {
    priority: 'P0',
    batchId: 'P0-B',
    group: 'first-base-thin-field-121-125',
    sectionIds: ['121', '122', '123', '124', '125'],
    reason: 'Thin first-base infield blocks have dense adjacent boundaries.',
    nextAction: 'REVIEW_AFTER_P0_A_KEEP_VISUAL_EQUALS_HITPATH',
  },
  {
    priority: 'P0',
    batchId: 'P0-C',
    group: 'first-base-thin-field-131-143',
    sectionIds: ['131', '132', '133', '134', '135', '142', '143'],
    reason: 'Thin first-base seam blocks are close to strict leakage audit targets.',
    nextAction: 'REVIEW_WITH_SEAM_EVIDENCE_KEEP_VISUAL_EQUALS_HITPATH',
  },
  {
    priority: 'P1',
    batchId: 'P1-A',
    group: 'central-table-adjacent',
    sectionIds: ['012', '013', '023'],
    reason: 'Central/table adjacent blocks should be reviewed after P0 because touch errors can spill into nearby small blocks.',
    nextAction: 'REVIEW_AFTER_P0_KEEP_VISUAL_EQUALS_HITPATH',
  },
  {
    priority: 'P1',
    batchId: 'P1-B',
    group: 'central-upper-adjacent',
    sectionIds: ['041', '044'],
    reason: 'Central/upper boundaries can produce search and click ambiguity.',
    nextAction: 'REVIEW_AFTER_P0_KEEP_VISUAL_EQUALS_HITPATH',
  },
  {
    priority: 'P2',
    batchId: 'P2-A',
    group: 'central-deferred',
    sectionIds: ['033'],
    reason: 'Defer until P0/P1 touch review proves additional expansion is necessary.',
    nextAction: 'DEFER_KEEP_VISUAL_EQUALS_HITPATH',
  },
];

const expansionCriteria = [
  'Do not change visualPath in a hit-area-only PR.',
  'Change hitPath only when operator-approved coordinates exist.',
  'Keep hitPath area at least 75% of visualPath area.',
  'Keep self-intersection, out-of-bounds, and labelPoint validation at zero issues.',
  'Keep adjacent polygon overlap and top-hit priority regressions at zero.',
  'Verify mobile 390 and desktop 1440 select the same intended section.',
  'Do not use external crawling, web search, resized screenshots, or browser CSS pixels as source coordinates.',
];

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const sorted = (values) => [...values].sort();

const unique = (values) => Array.from(new Set(values));

const candidateIdsFromGroups = reviewGroups.flatMap((group) => group.sectionIds);
const expectedCandidateIds = sorted(candidateIdsFromGroups);
const datasetCandidateIds = sorted(SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS);

const dataset = buildSajikSeatMapDataset();
const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
const datasetIssues = validateSajikSeatMapDataset(dataset);

const candidateRows = reviewGroups.flatMap((group) => group.sectionIds.map((sectionId) => {
  const section = sectionsById.get(sectionId);
  const validationIssues = section
    ? validateSajikSeatMapSectionGeometry(section, dataset.image)
    : [];
  const visualArea = section ? polygonArea(section.visualPolygon) : 0;
  const hitArea = section ? polygonArea(section.hitPolygon) : 0;

  return {
    sectionId,
    priority: group.priority,
    batchId: group.batchId,
    group: group.group,
    sectionName: section?.sectionName ?? null,
    seatCategoryLabel: section?.seatCategoryLabel ?? null,
    side: section?.side ?? null,
    enabled: section?.enabled ?? false,
    sectionKind: section?.sectionKind ?? null,
    mapInteractionStatus: section?.mapInteractionStatus ?? null,
    hitPathExpansionCandidate: section?.hitPathExpansionCandidate ?? false,
    visualEqualsHit: section ? section.visualPath === section.hitPath : false,
    visualArea: Number(visualArea.toFixed(2)),
    hitArea: Number(hitArea.toFixed(2)),
    hitToVisualAreaRatio: visualArea > 0 ? Number((hitArea / visualArea).toFixed(4)) : 0,
    bounds: section ? pathBounds(section.visualPath) : null,
    labelPoint: section?.labelPoint ?? null,
    validationIssueCount: validationIssues.length,
    validationIssues: validationIssues.map((issue) => `${issue.pathKind ?? 'geometry'}:${issue.code}`),
    reason: group.reason,
    nextAction: group.nextAction,
    currentDecision: group.priority === 'P2'
      ? 'DEFER_NO_COORDINATE_CHANGE'
      : 'REVIEW_CANDIDATE_NO_COORDINATE_CHANGE',
  };
}));

const aliasOnlyRows = SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS.map((sectionId) => {
  const section = sectionsById.get(sectionId);
  return {
    sectionId,
    sectionName: section?.sectionName ?? null,
    enabled: section?.enabled ?? false,
    sectionKind: section?.sectionKind ?? null,
    mapInteractionStatus: section?.mapInteractionStatus ?? null,
    hitPathExpansionCandidate: section?.hitPathExpansionCandidate ?? false,
    currentDecision: 'ALIAS_ONLY_KEEP_NO_HITPATH',
  };
});

const candidateSet = new Set(datasetCandidateIds);
const expectedSet = new Set(expectedCandidateIds);
const groupDuplicates = candidateIdsFromGroups.filter((sectionId, index) => candidateIdsFromGroups.indexOf(sectionId) !== index);

const blockers = [
  ...datasetIssues.map((issue) => `DATASET_VALIDATION:${issue}`),
  ...sorted([...expectedSet].filter((sectionId) => !candidateSet.has(sectionId))).map((sectionId) => `MISSING_DATASET_CANDIDATE:${sectionId}`),
  ...sorted([...candidateSet].filter((sectionId) => !expectedSet.has(sectionId))).map((sectionId) => `UNEXPECTED_DATASET_CANDIDATE:${sectionId}`),
  ...unique(groupDuplicates).map((sectionId) => `DUPLICATE_REVIEW_GROUP_SECTION:${sectionId}`),
  ...candidateRows.filter((row) => !sectionsById.has(row.sectionId)).map((row) => `MISSING_SECTION:${row.sectionId}`),
  ...candidateRows.filter((row) => !row.enabled).map((row) => `CANDIDATE_NOT_SELECTABLE:${row.sectionId}`),
  ...candidateRows.filter((row) => row.sectionKind !== 'SEAT_SECTION').map((row) => `CANDIDATE_NOT_SEAT_SECTION:${row.sectionId}`),
  ...candidateRows.filter((row) => !row.hitPathExpansionCandidate).map((row) => `CANDIDATE_FLAG_MISSING:${row.sectionId}`),
  ...candidateRows.filter((row) => !row.visualEqualsHit).map((row) => `UNAPPROVED_HITPATH_EXPANSION:${row.sectionId}`),
  ...candidateRows.filter((row) => row.validationIssueCount > 0).map((row) => `CANDIDATE_VALIDATION_ISSUE:${row.sectionId}`),
  ...aliasOnlyRows.filter((row) => row.enabled).map((row) => `ALIAS_ONLY_ENABLED:${row.sectionId}`),
  ...aliasOnlyRows.filter((row) => row.sectionKind !== 'ALIAS_ONLY').map((row) => `ALIAS_ONLY_SECTION_KIND_MISMATCH:${row.sectionId}`),
  ...aliasOnlyRows.filter((row) => row.hitPathExpansionCandidate).map((row) => `ALIAS_ONLY_MARKED_HITPATH_CANDIDATE:${row.sectionId}`),
];

const priorityCounts = candidateRows.reduce((counts, row) => ({
  ...counts,
  [row.priority]: (counts[row.priority] ?? 0) + 1,
}), {});

const report = {
  generatedAt: new Date().toISOString(),
  version: REVIEW_VERSION,
  status: blockers.length === 0 ? 'passed' : 'blocked',
  stadiumId: dataset.stadiumId,
  mapVersion: dataset.mapVersion,
  coordinateSystem: dataset.image.viewBox,
  summary: {
    totalCandidates: candidateRows.length,
    p0: priorityCounts.P0 ?? 0,
    p1: priorityCounts.P1 ?? 0,
    p2: priorityCounts.P2 ?? 0,
    aliasOnlyExceptions: aliasOnlyRows.length,
    visualEqualsHitCandidates: candidateRows.filter((row) => row.visualEqualsHit).length,
    approvedExpandedHitPaths: candidateRows.filter((row) => !row.visualEqualsHit).length,
    blockers: blockers.length,
  },
  expansionCriteria,
  reviewGroups,
  candidateRows,
  aliasOnlyRows,
  blockers,
};

const candidateTableRows = candidateRows.map((row) => [
  `\`${row.priority}\``,
  `\`${row.batchId}\``,
  `\`${row.sectionId}\``,
  row.group,
  row.sectionName,
  row.seatCategoryLabel,
  `\`${row.visualEqualsHit}\``,
  `\`${row.hitToVisualAreaRatio}\``,
  row.currentDecision,
]);

const markdown = [
  '# Sajik seatmap hitPath candidate review',
  '',
  `- version: \`${REVIEW_VERSION}\``,
  `- status: \`${report.status}\``,
  `- mapVersion: \`${report.mapVersion}\``,
  `- coordinate system: \`${report.coordinateSystem}\``,
  '',
  '## Summary',
  '',
  markdownTable(
    ['metric', 'value'],
    Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
  ),
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
  '',
  '## Candidate Review Batches',
  '',
  markdownTable(
    ['priority', 'batch', 'sections', 'group', 'next action'],
    reviewGroups.map((group) => [
      `\`${group.priority}\``,
      `\`${group.batchId}\``,
      group.sectionIds.map((sectionId) => `\`${sectionId}\``).join(', '),
      group.group,
      group.nextAction,
    ]),
  ),
  '',
  '## Candidate Sections',
  '',
  markdownTable(
    ['priority', 'batch', 'sectionId', 'group', 'sectionName', 'category', 'visualEqualsHit', 'hit/visual area', 'decision'],
    candidateTableRows,
  ),
  '',
  '## Alias-Only Exceptions',
  '',
  markdownTable(
    ['sectionId', 'sectionName', 'enabled', 'sectionKind', 'mapInteractionStatus', 'decision'],
    aliasOnlyRows.map((row) => [
      `\`${row.sectionId}\``,
      row.sectionName,
      `\`${row.enabled}\``,
      `\`${row.sectionKind}\``,
      `\`${row.mapInteractionStatus}\``,
      row.currentDecision,
    ]),
  ),
  '',
  '## Expansion Criteria',
  '',
  expansionCriteria.map((criterion) => `- ${criterion}`).join('\n'),
  '',
  '## Verification Commands',
  '',
  '- `npm run stadium:sajik:hitpath-review`',
  '- `npm run stadium:sajik:zone-precision-worksets`',
  '- `npm run stadium:sajik:dataset-export -- --check`',
  '- `npm run stadium:sajik:alignment-audit`',
  '- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`',
  '- `npm run stadium:sajik:editor-regression`',
  '- `npm run stadium:sajik:pr-scope-guard`',
  '',
].join('\n');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`hitpath_review_json:${jsonPath}`);
console.log(`hitpath_review_markdown:${markdownPath}`);
console.log([
  `status:${report.status}`,
  `candidates=${report.summary.totalCandidates}`,
  `p0=${report.summary.p0}`,
  `p1=${report.summary.p1}`,
  `p2=${report.summary.p2}`,
  `aliasOnly=${report.summary.aliasOnlyExceptions}`,
  `visualEqualsHit=${report.summary.visualEqualsHitCandidates}`,
  `expanded=${report.summary.approvedExpandedHitPaths}`,
  `blockers=${report.summary.blockers}`,
].join(' '));

if (blockers.length > 0) {
  process.exitCode = 1;
}
