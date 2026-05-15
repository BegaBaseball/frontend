import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSajikSeatMapDataset,
  validateSajikSeatMapDataset,
} from '../src/data/sajikSeatMapDataset.ts';
import {
  SAJIK_BLOCKS,
} from '../src/data/sajikSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const jsonPath = path.join(reportDir, 'sajik-seatmap-marker-transition-review.json');
const markdownPath = path.join(reportDir, 'sajik-seatmap-marker-transition-review.md');

const REVIEW_VERSION = 'SAJIK_MARKER_TRANSITION_REVIEW_V1';
const expectedWheelchairSectionIds = [
  '휠체어석-3루',
  '휠체어석-중앙',
  '휠체어석-1루',
];

const transitionPolicy = {
  currentRenderPolicy: 'SPLIT_SEAT_PATH_AND_ACCESSIBILITY_MARKER_LAYERS',
  nextRenderPolicy: 'MARKER_ONLY_DATA_MODEL_AFTER_FOLLOWUP_PR',
  productionLayerSplitApplied: true,
  productionSelectionContractChanged: false,
  selectablePolygonRemovalAllowed: false,
  markerLayerPointerEventsEnabledNow: true,
  markerOnlyConversionStatus: 'LAYER_SPLIT_APPLIED_MARKER_ONLY_DATA_MODEL_PENDING',
};

const transitionCriteria = [
  'Render SEAT_SECTION blocks in the normal seat path layer only.',
  'Render ACCESSIBILITY_MARKER blocks in the accessibility marker layer only.',
  'Keep the current selectable block/detail behavior until a dedicated marker-only data-model PR.',
  'Keep markerType=WHEELCHAIR for exactly three exported markers.',
  'Keep relatedSectionId connected to an exported ACCESSIBILITY_MARKER section.',
  'Keep marker.position equal to the related section labelPoint in the 960x640 viewBox.',
  'Keep each wheelchair section enabled and MAP_SELECTABLE in the compatibility phase.',
  'Do not mix wheelchair markers with ALIAS_ONLY sections.',
  'Do not remove selectable compatibility, expose new routes, or change backend API contracts in this review step.',
];

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const samePoint = (left, right) => (
  Array.isArray(left)
  && Array.isArray(right)
  && left.length === 2
  && right.length === 2
  && left[0] === right[0]
  && left[1] === right[1]
);

const sorted = (values) => [...values].sort();

const dataset = buildSajikSeatMapDataset();
const datasetIssues = validateSajikSeatMapDataset(dataset);
const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
const mapSelectableBlocks = SAJIK_BLOCKS.filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE');
const runtimeSeatPathSections = mapSelectableBlocks.filter((block) => block.sectionKind === 'SEAT_SECTION');
const runtimeAccessibilityMarkers = mapSelectableBlocks.filter((block) => block.sectionKind === 'ACCESSIBILITY_MARKER');
const runtimeAliasOnlyTargets = mapSelectableBlocks.filter((block) => block.sectionKind === 'ALIAS_ONLY');

const wheelchairMarkers = dataset.markers
  .filter((marker) => marker.type === 'WHEELCHAIR')
  .sort((left, right) => expectedWheelchairSectionIds.indexOf(left.relatedSectionId) - expectedWheelchairSectionIds.indexOf(right.relatedSectionId));
const wheelchairSections = dataset.sections
  .filter((section) => section.markerType === 'WHEELCHAIR' || section.sectionKind === 'ACCESSIBILITY_MARKER')
  .sort((left, right) => expectedWheelchairSectionIds.indexOf(left.sectionId) - expectedWheelchairSectionIds.indexOf(right.sectionId));

const markerRows = wheelchairMarkers.map((marker) => {
  const section = sectionsById.get(marker.relatedSectionId);
  return {
    markerId: marker.markerId,
    markerType: marker.type,
    relatedSectionId: marker.relatedSectionId,
    relatedBlockId: marker.relatedBlockId,
    markerEnabled: marker.enabled,
    markerPosition: marker.position,
    sectionFound: Boolean(section),
    sectionName: section?.sectionName ?? null,
    sectionKind: section?.sectionKind ?? null,
    sectionMarkerType: section?.markerType ?? null,
    sectionEnabled: section?.enabled ?? false,
    mapInteractionStatus: section?.mapInteractionStatus ?? null,
    seatCategory: section?.seatCategory ?? null,
    labelPoint: section?.labelPoint ?? null,
    positionMatchesLabelPoint: section ? samePoint(marker.position, section.labelPoint) : false,
    currentDecision: 'KEEP_SELECTABLE_BLOCK_AND_EXPORT_MARKER',
    nextDecision: 'MIGRATE_TO_MARKER_ONLY_IN_FOLLOWUP_PR',
  };
});

const expectedSet = new Set(expectedWheelchairSectionIds);
const actualMarkerSet = new Set(wheelchairMarkers.map((marker) => marker.relatedSectionId));
const actualSectionSet = new Set(wheelchairSections.map((section) => section.sectionId));

const blockers = [
  ...datasetIssues.map((issue) => `DATASET_VALIDATION:${issue}`),
  ...(runtimeSeatPathSections.length === 84 ? [] : [`RUNTIME_SEAT_PATH_COUNT:${runtimeSeatPathSections.length}`]),
  ...(runtimeAccessibilityMarkers.length === 3 ? [] : [`RUNTIME_ACCESSIBILITY_MARKER_COUNT:${runtimeAccessibilityMarkers.length}`]),
  ...(runtimeAliasOnlyTargets.length === 0 ? [] : [`RUNTIME_ALIAS_ONLY_RENDERED:${runtimeAliasOnlyTargets.length}`]),
  ...sorted([...expectedSet].filter((sectionId) => !actualMarkerSet.has(sectionId))).map((sectionId) => `MISSING_WHEELCHAIR_MARKER:${sectionId}`),
  ...sorted([...actualMarkerSet].filter((sectionId) => !expectedSet.has(sectionId))).map((sectionId) => `UNEXPECTED_WHEELCHAIR_MARKER:${sectionId}`),
  ...sorted([...expectedSet].filter((sectionId) => !actualSectionSet.has(sectionId))).map((sectionId) => `MISSING_WHEELCHAIR_SECTION:${sectionId}`),
  ...sorted([...actualSectionSet].filter((sectionId) => !expectedSet.has(sectionId))).map((sectionId) => `UNEXPECTED_ACCESSIBILITY_MARKER_SECTION:${sectionId}`),
  ...markerRows.filter((row) => row.markerType !== 'WHEELCHAIR').map((row) => `MARKER_TYPE_MISMATCH:${row.markerId}`),
  ...markerRows.filter((row) => !row.sectionFound).map((row) => `MARKER_RELATED_SECTION_MISSING:${row.markerId}`),
  ...markerRows.filter((row) => row.sectionKind !== 'ACCESSIBILITY_MARKER').map((row) => `SECTION_KIND_MISMATCH:${row.relatedSectionId}`),
  ...markerRows.filter((row) => row.sectionMarkerType !== 'WHEELCHAIR').map((row) => `SECTION_MARKER_TYPE_MISMATCH:${row.relatedSectionId}`),
  ...markerRows.filter((row) => row.seatCategory !== 'ACCESSIBLE').map((row) => `SECTION_CATEGORY_MISMATCH:${row.relatedSectionId}`),
  ...markerRows.filter((row) => !row.markerEnabled || !row.sectionEnabled).map((row) => `WHEELCHAIR_COMPAT_SELECTION_DISABLED:${row.relatedSectionId}`),
  ...markerRows.filter((row) => row.mapInteractionStatus !== 'MAP_SELECTABLE').map((row) => `WHEELCHAIR_NOT_MAP_SELECTABLE:${row.relatedSectionId}`),
  ...markerRows.filter((row) => !row.positionMatchesLabelPoint).map((row) => `MARKER_POSITION_LABEL_MISMATCH:${row.relatedSectionId}`),
];

const report = {
  generatedAt: new Date().toISOString(),
  version: REVIEW_VERSION,
  status: blockers.length === 0 ? 'passed' : 'blocked',
  stadiumId: dataset.stadiumId,
  mapVersion: dataset.mapVersion,
  coordinateSystem: dataset.image.viewBox,
  summary: {
    wheelchairMarkers: wheelchairMarkers.length,
    wheelchairSections: wheelchairSections.length,
    expectedWheelchairMarkers: expectedWheelchairSectionIds.length,
    runtimeSeatPathSections: runtimeSeatPathSections.length,
    runtimeAccessibilityMarkers: runtimeAccessibilityMarkers.length,
    runtimeAliasOnlyTargets: runtimeAliasOnlyTargets.length,
    markerRowsPassingPositionLock: markerRows.filter((row) => row.positionMatchesLabelPoint).length,
    selectableCompatibilitySections: markerRows.filter((row) => row.markerEnabled && row.sectionEnabled && row.mapInteractionStatus === 'MAP_SELECTABLE').length,
    productionLayerSplitApplied: transitionPolicy.productionLayerSplitApplied,
    productionSelectionContractChanged: transitionPolicy.productionSelectionContractChanged,
    markerOnlyApplied: false,
    blockers: blockers.length,
  },
  transitionPolicy,
  transitionCriteria,
  expectedWheelchairSectionIds,
  markerRows,
  blockers,
};

const markdown = [
  '# Sajik seatmap marker transition review',
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
  '## Transition Policy',
  '',
  markdownTable(
    ['key', 'value'],
    Object.entries(transitionPolicy).map(([key, value]) => [key, `\`${value}\``]),
  ),
  '',
  '## Wheelchair Marker Rows',
  '',
  markdownTable(
    ['markerId', 'relatedSectionId', 'sectionName', 'sectionKind', 'enabled', 'position', 'labelPoint', 'decision'],
    markerRows.map((row) => [
      `\`${row.markerId}\``,
      `\`${row.relatedSectionId}\``,
      row.sectionName,
      `\`${row.sectionKind}\``,
      `\`${row.markerEnabled && row.sectionEnabled}\``,
      `\`${row.markerPosition.join(',')}\``,
      `\`${row.labelPoint?.join(',') ?? '-'}\``,
      row.currentDecision,
    ]),
  ),
  '',
  '## Transition Criteria',
  '',
  transitionCriteria.map((criterion) => `- ${criterion}`).join('\n'),
  '',
  '## Verification Commands',
  '',
  '- `npm run stadium:sajik:marker-transition-review`',
  '- `npm run stadium:sajik:dataset-export -- --check`',
  '- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`',
  '- `npm run stadium:sajik:editor-regression`',
  '- `npm run stadium:sajik:pr-scope-guard`',
  '',
].join('\n');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`marker_transition_review_json:${jsonPath}`);
console.log(`marker_transition_review_markdown:${markdownPath}`);
console.log([
  `status:${report.status}`,
  `markers=${report.summary.wheelchairMarkers}`,
  `sections=${report.summary.wheelchairSections}`,
  `seatPaths=${report.summary.runtimeSeatPathSections}`,
  `markerLayer=${report.summary.runtimeAccessibilityMarkers}`,
  `aliasRendered=${report.summary.runtimeAliasOnlyTargets}`,
  `positionLocks=${report.summary.markerRowsPassingPositionLock}`,
  `selectableCompat=${report.summary.selectableCompatibilitySections}`,
  `markerOnlyApplied=${report.summary.markerOnlyApplied}`,
  `blockers=${report.summary.blockers}`,
].join(' '));

if (blockers.length > 0) {
  process.exitCode = 1;
}
