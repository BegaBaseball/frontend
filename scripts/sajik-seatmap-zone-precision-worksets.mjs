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
const outputBase = path.join(reportDir, 'sajik-seatmap-zone-precision-worksets');

const WORKSET_VERSION = 'SAJIK_ZONE_PRECISION_WORKSETS_V1';
const EXPECTED_TOTAL_SECTIONS = 89;
const EXPECTED_ENABLED_SECTIONS = 87;
const EXPECTED_ALIAS_ONLY_SECTIONS = 2;
const EXPECTED_MARKERS = 3;
const EXPECTED_CANDIDATE_ROWS = 22;
const EXPECTED_GUARD_ROWS = 3;

const workStages = [
  {
    id: 'P0-A',
    order: 1,
    priority: 'P0',
    zoneId: 'ZONE_HOME_PLATE_SMALL',
    zoneLabel: 'Home plate small blocks',
    sectionIds: ['021', '022', '031', '032'],
    objective: 'Review the smallest home-plate-adjacent blocks first for mobile touch misses.',
    allowedChange: 'HITPATH_ONLY_WITH_OPERATOR_APPROVAL',
  },
  {
    id: 'P0-B',
    order: 2,
    priority: 'P0',
    zoneId: 'ZONE_FIRST_BASE_THIN_121_125',
    zoneLabel: 'First-base thin blocks 121-125',
    sectionIds: ['121', '122', '123', '124', '125'],
    objective: 'Check thin first-base boundaries around 112/121 and adjacent blocks.',
    allowedChange: 'HITPATH_ONLY_WITH_OPERATOR_APPROVAL',
  },
  {
    id: 'P0-C',
    order: 3,
    priority: 'P0',
    zoneId: 'ZONE_FIRST_BASE_THIN_131_143',
    zoneLabel: 'First-base thin blocks 131-143',
    sectionIds: ['131', '132', '133', '134', '135', '142', '143'],
    objective: 'Review strict thin alignment and seam evidence around 132/142/143 and 123/133/143.',
    allowedChange: 'HITPATH_ONLY_WITH_OPERATOR_APPROVAL',
  },
  {
    id: 'P1-A',
    order: 4,
    priority: 'P1',
    zoneId: 'ZONE_CENTRAL_TABLE_ADJACENT',
    zoneLabel: 'Central table adjacent blocks',
    sectionIds: ['012', '013', '023'],
    objective: 'Review central/table-adjacent touch ambiguity after P0 batches are stable.',
    allowedChange: 'HITPATH_ONLY_WITH_OPERATOR_APPROVAL',
  },
  {
    id: 'P1-B',
    order: 5,
    priority: 'P1',
    zoneId: 'ZONE_CENTRAL_UPPER_ADJACENT',
    zoneLabel: 'Central upper adjacent blocks',
    sectionIds: ['041', '044'],
    objective: 'Review central/upper boundaries for search and click ambiguity.',
    allowedChange: 'HITPATH_ONLY_WITH_OPERATOR_APPROVAL',
  },
  {
    id: 'P2-A',
    order: 6,
    priority: 'P2',
    zoneId: 'ZONE_CENTRAL_DEFERRED',
    zoneLabel: 'Central deferred block',
    sectionIds: ['033'],
    objective: 'Keep deferred until P0/P1 reviews prove a hitPath expansion is still necessary.',
    allowedChange: 'HITPATH_ONLY_WITH_OPERATOR_APPROVAL',
  },
];

const guardAnchors = [
  {
    id: 'P2-B',
    order: 7,
    priority: 'P2',
    zoneId: 'ZONE_OUTFIELD_GUARD',
    zoneLabel: 'Outfield and obstruction guard anchors',
    sectionId: '723',
    objective: 'Mobile 390 zoom-control obstruction guard; center click must still select 723.',
    requiredCheck: 'MOBILE_CENTER_CLICK_NOT_INTERCEPTED',
  },
  {
    id: 'P2-B',
    order: 7,
    priority: 'P2',
    zoneId: 'ZONE_OUTFIELD_GUARD',
    zoneLabel: 'Outfield and obstruction guard anchors',
    sectionId: '914',
    objective: 'Outfield adjacent priority guard for 914/922.',
    requiredCheck: 'ADJACENT_TOP_HIT_PRIORITY_STABLE',
  },
  {
    id: 'P2-B',
    order: 7,
    priority: 'P2',
    zoneId: 'ZONE_OUTFIELD_GUARD',
    zoneLabel: 'Outfield and obstruction guard anchors',
    sectionId: '922',
    objective: 'Outfield adjacent priority guard for 914/922.',
    requiredCheck: 'ADJACENT_TOP_HIT_PRIORITY_STABLE',
  },
];

const requiredApprovalFields = [
  'operatorDecision=APPROVED',
  'visualPath',
  'hitPath',
  'labelPoint',
  'reviewer',
  'reviewedAt',
  'operatorNote',
];

const expansionCriteria = [
  'visualPath may change only when official PNG boundary mismatch evidence exists.',
  'hitPath may differ from visualPath only with operator-approved coordinates.',
  'hitPath must remain at least 75% of the same section visualPath area.',
  'self-intersection, out-of-bounds, and labelPoint validation issues must stay at zero.',
  'alias-only sections 011/903 must stay out of runtime hit layers.',
  'wheelchair rows must stay in the accessibility marker layer.',
  'mobile 390 and desktop 1440 must select the same intended section.',
];

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const writeCsv = async (filePath, rows) => {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
};

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const sorted = (values) => [...values].sort();

const countBy = (items, key) => items.reduce((counts, row) => ({
  ...counts,
  [row[key]]: (counts[row[key]] ?? 0) + 1,
}), {});

const dataset = buildSajikSeatMapDataset();
const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
const datasetIssues = validateSajikSeatMapDataset(dataset);
const expectedCandidateIds = sorted(workStages.flatMap((stage) => stage.sectionIds));
const datasetCandidateIds = sorted(SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS);

const candidateRows = workStages.flatMap((stage) => stage.sectionIds.map((sectionId) => {
  const section = sectionsById.get(sectionId);
  const validationIssues = section
    ? validateSajikSeatMapSectionGeometry(section, dataset.image)
    : [];
  const visualArea = section ? polygonArea(section.visualPolygon) : 0;
  const hitArea = section ? polygonArea(section.hitPolygon) : 0;
  const visualEqualsHit = section ? section.visualPath === section.hitPath : false;

  return {
    rowType: 'HITPATH_CANDIDATE',
    worksetVersion: WORKSET_VERSION,
    priority: stage.priority,
    batchId: stage.id,
    stageOrder: stage.order,
    zoneId: stage.zoneId,
    zoneLabel: stage.zoneLabel,
    sectionId,
    sectionName: section?.sectionName ?? '',
    blockId: section?.blockId ?? '',
    seatCategoryLabel: section?.seatCategoryLabel ?? '',
    level: section?.level ?? '',
    floor: section?.floor ?? null,
    side: section?.side ?? '',
    sectionKind: section?.sectionKind ?? '',
    enabled: section?.enabled === true,
    mapInteractionStatus: section?.mapInteractionStatus ?? '',
    hitPathExpansionCandidate: section?.hitPathExpansionCandidate === true,
    visualPath: section?.visualPath ?? '',
    hitPath: section?.hitPath ?? '',
    visualEqualsHit,
    visualArea: Number(visualArea.toFixed(2)),
    hitArea: Number(hitArea.toFixed(2)),
    hitToVisualAreaRatio: visualArea > 0 ? Number((hitArea / visualArea).toFixed(4)) : 0,
    bounds: section ? pathBounds(section.visualPath) : null,
    labelPoint: section?.labelPoint ?? null,
    validationIssueCount: validationIssues.length,
    validationIssues: validationIssues.map((issue) => `${issue.pathKind ?? 'geometry'}:${issue.code}`),
    objective: stage.objective,
    allowedChange: stage.allowedChange,
    requiredApprovalFields,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    currentDecision: visualEqualsHit ? 'WAITING_FOR_OPERATOR_APPROVAL_NO_COORDINATE_CHANGE' : 'APPROVED_HITPATH_EXPANSION_PRESENT',
  };
}));

const guardRows = guardAnchors.map((anchor) => {
  const section = sectionsById.get(anchor.sectionId);
  return {
    rowType: 'REGRESSION_GUARD',
    worksetVersion: WORKSET_VERSION,
    priority: anchor.priority,
    batchId: anchor.id,
    stageOrder: anchor.order,
    zoneId: anchor.zoneId,
    zoneLabel: anchor.zoneLabel,
    sectionId: anchor.sectionId,
    sectionName: section?.sectionName ?? '',
    blockId: section?.blockId ?? '',
    seatCategoryLabel: section?.seatCategoryLabel ?? '',
    level: section?.level ?? '',
    floor: section?.floor ?? null,
    side: section?.side ?? '',
    sectionKind: section?.sectionKind ?? '',
    enabled: section?.enabled === true,
    visualPath: section?.visualPath ?? '',
    labelPoint: section?.labelPoint ?? null,
    objective: anchor.objective,
    requiredCheck: anchor.requiredCheck,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    currentDecision: 'REGRESSION_GUARD_ONLY_NO_COORDINATE_CHANGE',
  };
});

const aliasOnlyRows = SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS.map((sectionId) => {
  const section = sectionsById.get(sectionId);
  return {
    sectionId,
    sectionName: section?.sectionName ?? '',
    enabled: section?.enabled === true,
    sectionKind: section?.sectionKind ?? '',
    mapInteractionStatus: section?.mapInteractionStatus ?? '',
    currentDecision: 'ALIAS_ONLY_KEEP_NO_HITPATH',
  };
});

const markerRows = dataset.markers.map((marker) => {
  const section = sectionsById.get(marker.relatedSectionId);
  return {
    markerId: marker.markerId,
    type: marker.type,
    relatedSectionId: marker.relatedSectionId,
    relatedBlockId: marker.relatedBlockId,
    enabled: marker.enabled,
    position: marker.position,
    relatedSectionKind: section?.sectionKind ?? '',
    currentDecision: 'MARKER_LAYER_KEEP_SELECTABLE_COMPAT',
  };
});

const candidateIdSet = new Set(datasetCandidateIds);
const expectedCandidateIdSet = new Set(expectedCandidateIds);
const duplicateCandidates = expectedCandidateIds.filter((sectionId, index) => expectedCandidateIds.indexOf(sectionId) !== index);
const stageCounts = countBy(candidateRows, 'batchId');
const zoneCounts = countBy(candidateRows, 'zoneId');
const guardZoneCounts = countBy(guardRows, 'zoneId');

const blockers = [
  ...datasetIssues.map((issue) => `DATASET_VALIDATION:${String(issue)}`),
  ...(dataset.summary.totalSections !== EXPECTED_TOTAL_SECTIONS ? [`TOTAL_SECTIONS:${dataset.summary.totalSections}!=${EXPECTED_TOTAL_SECTIONS}`] : []),
  ...(dataset.summary.enabledSections !== EXPECTED_ENABLED_SECTIONS ? [`ENABLED_SECTIONS:${dataset.summary.enabledSections}!=${EXPECTED_ENABLED_SECTIONS}`] : []),
  ...(dataset.summary.aliasOnlySections !== EXPECTED_ALIAS_ONLY_SECTIONS ? [`ALIAS_ONLY_SECTIONS:${dataset.summary.aliasOnlySections}!=${EXPECTED_ALIAS_ONLY_SECTIONS}`] : []),
  ...(dataset.summary.markers !== EXPECTED_MARKERS ? [`MARKERS:${dataset.summary.markers}!=${EXPECTED_MARKERS}`] : []),
  ...(candidateRows.length !== EXPECTED_CANDIDATE_ROWS ? [`CANDIDATE_ROWS:${candidateRows.length}!=${EXPECTED_CANDIDATE_ROWS}`] : []),
  ...(guardRows.length !== EXPECTED_GUARD_ROWS ? [`GUARD_ROWS:${guardRows.length}!=${EXPECTED_GUARD_ROWS}`] : []),
  ...sorted([...expectedCandidateIdSet].filter((sectionId) => !candidateIdSet.has(sectionId))).map((sectionId) => `MISSING_DATASET_CANDIDATE:${sectionId}`),
  ...sorted([...candidateIdSet].filter((sectionId) => !expectedCandidateIdSet.has(sectionId))).map((sectionId) => `UNEXPECTED_DATASET_CANDIDATE:${sectionId}`),
  ...duplicateCandidates.map((sectionId) => `DUPLICATE_WORKSET_CANDIDATE:${sectionId}`),
  ...candidateRows.filter((row) => !sectionsById.has(row.sectionId)).map((row) => `MISSING_SECTION:${row.sectionId}`),
  ...candidateRows.filter((row) => !row.enabled).map((row) => `CANDIDATE_NOT_ENABLED:${row.sectionId}`),
  ...candidateRows.filter((row) => row.sectionKind !== 'SEAT_SECTION').map((row) => `CANDIDATE_NOT_SEAT_SECTION:${row.sectionId}`),
  ...candidateRows.filter((row) => !row.hitPathExpansionCandidate).map((row) => `CANDIDATE_FLAG_MISSING:${row.sectionId}`),
  ...candidateRows.filter((row) => !row.visualEqualsHit).map((row) => `UNAPPROVED_HITPATH_EXPANSION_PRESENT:${row.sectionId}`),
  ...candidateRows.filter((row) => row.validationIssueCount > 0).map((row) => `CANDIDATE_VALIDATION_ISSUE:${row.sectionId}`),
  ...guardRows.filter((row) => !sectionsById.has(row.sectionId)).map((row) => `MISSING_GUARD_SECTION:${row.sectionId}`),
  ...guardRows.filter((row) => !row.enabled).map((row) => `GUARD_SECTION_NOT_ENABLED:${row.sectionId}`),
  ...guardRows.filter((row) => row.sectionKind !== 'SEAT_SECTION').map((row) => `GUARD_SECTION_NOT_SEAT_SECTION:${row.sectionId}`),
  ...aliasOnlyRows.filter((row) => row.enabled).map((row) => `ALIAS_ONLY_ENABLED:${row.sectionId}`),
  ...aliasOnlyRows.filter((row) => row.sectionKind !== 'ALIAS_ONLY').map((row) => `ALIAS_ONLY_SECTION_KIND_MISMATCH:${row.sectionId}`),
  ...markerRows.filter((row) => !row.enabled).map((row) => `MARKER_DISABLED:${row.markerId}`),
  ...markerRows.filter((row) => row.type !== 'WHEELCHAIR').map((row) => `MARKER_TYPE_MISMATCH:${row.markerId}`),
  ...markerRows.filter((row) => row.relatedSectionKind !== 'ACCESSIBILITY_MARKER').map((row) => `MARKER_RELATED_SECTION_KIND_MISMATCH:${row.markerId}`),
];

const summary = {
  worksetVersion: WORKSET_VERSION,
  status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
  stadiumId: dataset.stadiumId,
  mapVersion: dataset.mapVersion,
  coordinateSystem: dataset.coordinateSystem,
  viewBox: dataset.image.viewBox,
  totalSections: dataset.summary.totalSections,
  enabledSections: dataset.summary.enabledSections,
  aliasOnlySections: dataset.summary.aliasOnlySections,
  markers: dataset.summary.markers,
  candidateRows: candidateRows.length,
  guardRows: guardRows.length,
  p0Rows: candidateRows.filter((row) => row.priority === 'P0').length,
  p1Rows: candidateRows.filter((row) => row.priority === 'P1').length,
  p2Rows: candidateRows.filter((row) => row.priority === 'P2').length,
  stageCounts,
  zoneCounts,
  guardZoneCounts,
  visualEqualsHitCandidates: candidateRows.filter((row) => row.visualEqualsHit).length,
  approvedExpandedHitPaths: candidateRows.filter((row) => !row.visualEqualsHit).length,
  productionWriteAllowed: false,
  sourceOfTruth: false,
  operatorApprovalRequiredRows: candidateRows.length,
  blockers,
  expansionCriteria,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  workStages,
  guardAnchors,
  candidateRows,
  guardRows,
  aliasOnlyRows,
  markerRows,
};

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

await writeCsv(`${outputBase}.csv`, [
  [
    'rowType',
    'priority',
    'batchId',
    'stageOrder',
    'zoneId',
    'sectionId',
    'sectionName',
    'category',
    'level',
    'side',
    'visualEqualsHit',
    'hitToVisualAreaRatio',
    'productionWriteAllowed',
    'currentDecision',
    'objective',
  ],
  ...candidateRows.map((row) => [
    row.rowType,
    row.priority,
    row.batchId,
    row.stageOrder,
    row.zoneId,
    row.sectionId,
    row.sectionName,
    row.seatCategoryLabel,
    row.level,
    row.side,
    row.visualEqualsHit,
    row.hitToVisualAreaRatio,
    row.productionWriteAllowed,
    row.currentDecision,
    row.objective,
  ]),
  ...guardRows.map((row) => [
    row.rowType,
    row.priority,
    row.batchId,
    row.stageOrder,
    row.zoneId,
    row.sectionId,
    row.sectionName,
    row.seatCategoryLabel,
    row.level,
    row.side,
    '',
    '',
    row.productionWriteAllowed,
    row.currentDecision,
    row.objective,
  ]),
]);

const stageTable = markdownTable(
  ['order', 'batch', 'priority', 'zone', 'sections', 'objective'],
  workStages.map((stage) => [
    stage.order,
    `\`${stage.id}\``,
    `\`${stage.priority}\``,
    `\`${stage.zoneId}\``,
    stage.sectionIds.map((sectionId) => `\`${sectionId}\``).join(', '),
    stage.objective,
  ]),
);

const candidateTable = markdownTable(
  ['batch', 'zone', 'section', 'category', 'visual=hit', 'hit/visual', 'decision'],
  candidateRows.map((row) => [
    `\`${row.batchId}\``,
    `\`${row.zoneId}\``,
    `\`${row.sectionId}\``,
    row.seatCategoryLabel,
    `\`${row.visualEqualsHit}\``,
    `\`${row.hitToVisualAreaRatio}\``,
    row.currentDecision,
  ]),
);

const guardTable = markdownTable(
  ['batch', 'zone', 'section', 'required check', 'decision'],
  guardRows.map((row) => [
    `\`${row.batchId}\``,
    `\`${row.zoneId}\``,
    `\`${row.sectionId}\``,
    row.requiredCheck,
    row.currentDecision,
  ]),
);

const markdown = `# Sajik Seatmap Zone Precision Worksets

- version: \`${WORKSET_VERSION}\`
- status: \`${summary.status}\`
- mapVersion: \`${summary.mapVersion}\`
- viewBox: \`${summary.viewBox}\`
- candidate rows: \`${summary.candidateRows}/${EXPECTED_CANDIDATE_ROWS}\`
- guard rows: \`${summary.guardRows}/${EXPECTED_GUARD_ROWS}\`
- production write allowed: \`${summary.productionWriteAllowed}\`
- approved expanded hitPaths: \`${summary.approvedExpandedHitPaths}\`

This report locks the zone-by-zone precision order for Sajik polygon refinement.
It is not production source of truth. Only operator-approved patch payloads may change \`visualPath\`, \`hitPath\`, or \`labelPoint\`.

## Work Stages

${stageTable}

## Candidate Rows

${candidateTable}

## Regression Guard Rows

${guardTable}

## Alias-Only Exceptions

${markdownTable(
  ['sectionId', 'enabled', 'sectionKind', 'mapInteractionStatus', 'decision'],
  aliasOnlyRows.map((row) => [
    `\`${row.sectionId}\``,
    `\`${row.enabled}\``,
    `\`${row.sectionKind}\``,
    `\`${row.mapInteractionStatus}\``,
    row.currentDecision,
  ]),
)}

## Marker Rows

${markdownTable(
  ['markerId', 'type', 'relatedSectionId', 'enabled', 'decision'],
  markerRows.map((row) => [
    `\`${row.markerId}\``,
    `\`${row.type}\``,
    `\`${row.relatedSectionId}\``,
    `\`${row.enabled}\``,
    row.currentDecision,
  ]),
)}

## Expansion Criteria

${expansionCriteria.map((criterion) => `- ${criterion}`).join('\n')}

## Blockers

${blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none'}
`;

await fs.writeFile(`${outputBase}.md`, markdown, 'utf8');

const stageColors = {
  'P0-A': '#DC2626',
  'P0-B': '#EA580C',
  'P0-C': '#CA8A04',
  'P1-A': '#2563EB',
  'P1-B': '#7C3AED',
  'P2-A': '#16A34A',
};
const candidatePaths = candidateRows.map((row) => `
  <path d="${xmlEscape(row.visualPath)}" fill="${stageColors[row.batchId] ?? '#64748B'}" fill-opacity="0.22" stroke="${stageColors[row.batchId] ?? '#64748B'}" stroke-width="2" vector-effect="non-scaling-stroke">
    <title>${xmlEscape(`${row.batchId} · ${row.zoneId} · ${row.sectionId} · ${row.sectionName}`)}</title>
  </path>
  <text x="${row.labelPoint?.[0] ?? 0}" y="${row.labelPoint?.[1] ?? 0}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(row.sectionId)}</text>
`).join('\n');
const guardPaths = guardRows.map((row) => `
  <path d="${xmlEscape(row.visualPath)}" fill="none" stroke="#0f172a" stroke-width="3" stroke-dasharray="6 4" vector-effect="non-scaling-stroke">
    <title>${xmlEscape(`${row.batchId} · ${row.requiredCheck} · ${row.sectionId} · ${row.sectionName}`)}</title>
  </path>
`).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640">
  <rect width="960" height="640" fill="#f8fafc"/>
  <text x="20" y="32" font-size="18" font-weight="900" fill="#0f172a">Sajik zone precision worksets (${summary.status})</text>
  ${candidatePaths}
  ${guardPaths}
</svg>
`;
await fs.writeFile(`${outputBase}.svg`, svg, 'utf8');

console.log(`zone_precision_worksets_json:${path.relative(frontendRoot, `${outputBase}.json`)}`);
console.log(`zone_precision_worksets_csv:${path.relative(frontendRoot, `${outputBase}.csv`)}`);
console.log(`zone_precision_worksets_markdown:${path.relative(frontendRoot, `${outputBase}.md`)}`);
console.log(`zone_precision_worksets_svg:${path.relative(frontendRoot, `${outputBase}.svg`)}`);
console.log(`status:${summary.status} candidates=${summary.candidateRows} p0=${summary.p0Rows} p1=${summary.p1Rows} p2=${summary.p2Rows} guards=${summary.guardRows} expanded=${summary.approvedExpandedHitPaths} blockers=${summary.blockers.length}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
