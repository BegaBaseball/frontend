import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');

const OUTPUT_FILES = {
  json: path.join(reportDir, 'daegu-seatmap-source-baseline-audit.json'),
  csv: path.join(reportDir, 'daegu-seatmap-source-baseline-audit.csv'),
  markdown: path.join(reportDir, 'daegu-seatmap-source-baseline-audit.md'),
};

const AUDIT_VERSION = 'DAEGU_SOURCE_BASELINE_AUDIT_V1';
const ACTIVE_INTERACTIVE_POLYGON_STATUSES = new Set([
  'CANONICAL_INTERACTIVE',
]);

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

const countBy = (items, getKey) => {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))));
};

const groupBy = (items, getKey) => {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    const rows = groups.get(key) ?? [];
    rows.push(item);
    groups.set(key, rows);
  }
  return groups;
};

const duplicateRows = (groups, getSourceId) => [...groups.entries()]
  .map(([key, rows]) => ({
    key,
    rows,
    count: rows.length,
    sourceIds: [...new Set(rows.map(getSourceId))].sort(),
  }))
  .filter((entry) => entry.sourceIds.length > 1)
  .sort((a, b) => String(a.key).localeCompare(String(b.key)));

const validateRows = (rows, validateSeatMapPolygonPath) => {
  const issues = [];

  for (const row of rows) {
    const labelPoint = row.block.imageGeometry.labelPoint ?? [
      row.block.imageGeometry.labelX,
      row.block.imageGeometry.labelY,
    ];
    const paths = [
      ['visualPath', row.block.imageGeometry.visualPath ?? row.block.imageGeometry.d],
      ['hitPath', row.block.imageGeometry.hitPath ?? row.block.imageGeometry.d],
    ];

    for (const [pathKind, pathData] of paths) {
      const issueCodes = validateSeatMapPolygonPath({
        pathData,
        width: row.imageWidth,
        height: row.imageHeight,
        labelPoint,
        labelTolerance: 6,
        sectionId: row.block.id,
        pathKind,
      });
      if (issueCodes.length > 0) {
        issues.push({
          sourceId: row.sourceId,
          sectionId: row.block.id,
          block: row.block.block,
          pathKind,
          issueCodes,
        });
      }
    }
  }

  return issues;
};

const main = async () => {
  const {
    DAEGU_BLOCKS,
    DAEGU_DEFAULT_SEATMAP_SOURCE_ID,
    DAEGU_OPERATOR_REFERENCE_BLOCKS,
    DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT,
    DAEGU_SEATMAP_IMAGE,
    DAEGU_SEATMAP_SOURCE_REFERENCES,
    DAEGU_SEATMAP_VIEWPORT,
    isDaeguNormalSelectableSeat,
    isDaeguOfficialUnconfirmedSeat,
    isDaeguReviewOnlySeat,
  } = await import('../src/data/daeguSeatData.ts');
  const {
    DAEGU_CANONICAL_BLOCKS,
    DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS,
    DAEGU_CANONICAL_SEATMAP_IMAGE,
    DAEGU_CANONICAL_SEATMAP_SUMMARY,
    DAEGU_CANONICAL_SEATMAP_VIEWPORT,
  } = await import('../src/data/daeguCanonicalSeatMap.ts');
  const {
    validateSeatMapPolygonPath,
  } = await import('../src/utils/seatMapPolygonValidator.ts');

  await fs.mkdir(reportDir, { recursive: true });

  const sourceReferencesById = new Map(DAEGU_SEATMAP_SOURCE_REFERENCES.map((source) => [source.id, source]));
  const datasets = [
    {
      sourceId: 'DAEGU_CANONICAL_2026',
      sourceRole: 'canonical-runtime-source',
      blocks: DAEGU_CANONICAL_BLOCKS,
      imageWidth: DAEGU_CANONICAL_SEATMAP_VIEWPORT.width || DAEGU_CANONICAL_SEATMAP_IMAGE.imageWidth,
      imageHeight: DAEGU_CANONICAL_SEATMAP_VIEWPORT.height || DAEGU_CANONICAL_SEATMAP_IMAGE.imageHeight,
    },
    {
      sourceId: 'SAMSUNG_OFFICIAL_2026',
      sourceRole: 'official-png-historical-evidence',
      blocks: DAEGU_BLOCKS,
      imageWidth: DAEGU_SEATMAP_VIEWPORT.width || DAEGU_SEATMAP_IMAGE.imageWidth,
      imageHeight: DAEGU_SEATMAP_VIEWPORT.height || DAEGU_SEATMAP_IMAGE.imageHeight,
    },
    {
      sourceId: 'OPERATOR_REFERENCE_RAPAK_2025',
      sourceRole: 'operator-reference-historical-evidence',
      blocks: DAEGU_OPERATOR_REFERENCE_BLOCKS,
      imageWidth: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.width,
      imageHeight: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.height,
    },
  ];

  const sourceRows = datasets.map((dataset) => {
    const sourceReference = sourceReferencesById.get(dataset.sourceId);
    const selectableBlocks = dataset.blocks.filter(isDaeguNormalSelectableSeat);
    const reviewOnlyBlocks = dataset.blocks.filter(isDaeguReviewOnlySeat);
    const officialUnconfirmedBlocks = dataset.blocks.filter(isDaeguOfficialUnconfirmedSeat);
    return {
      sourceId: dataset.sourceId,
      sourceRole: dataset.sourceRole,
      sourceLabel: sourceReference?.label ?? dataset.sourceId,
      kind: sourceReference?.kind ?? 'UNKNOWN',
      polygonStatus: sourceReference?.polygonStatus ?? 'UNKNOWN',
      productionCanonical: sourceReference?.productionCanonical ?? false,
      defaultSource: dataset.sourceId === DAEGU_DEFAULT_SEATMAP_SOURCE_ID,
      interactiveRuntimeSource: sourceReference?.kind === 'INTERACTIVE_SEATMAP'
        && ACTIVE_INTERACTIVE_POLYGON_STATUSES.has(sourceReference?.polygonStatus),
      imageWidth: dataset.imageWidth,
      imageHeight: dataset.imageHeight,
      totalBlocks: dataset.blocks.length,
      selectableBlocks: selectableBlocks.length,
      reviewOnlyBlocks: reviewOnlyBlocks.length,
      officialUnconfirmedBlocks: officialUnconfirmedBlocks.length,
      sectionKindCounts: countBy(dataset.blocks, (block) => block.sectionKind),
      traceSourceCounts: countBy(dataset.blocks, (block) => block.imageGeometry.traceSource ?? 'UNKNOWN'),
      categoryCounts: countBy(selectableBlocks, (block) => block.category),
    };
  });

  const activeDatasetIds = new Set(sourceRows
    .filter((row) => row.interactiveRuntimeSource)
    .map((row) => row.sourceId));

  const activeRows = datasets.filter((dataset) => activeDatasetIds.has(dataset.sourceId)).flatMap((dataset) => dataset.blocks
    .filter(isDaeguNormalSelectableSeat)
    .map((block) => ({
      sourceId: dataset.sourceId,
      sourceRole: dataset.sourceRole,
      imageWidth: dataset.imageWidth,
      imageHeight: dataset.imageHeight,
      sectionId: block.id,
      blockLabel: block.block,
      name: block.name,
      category: block.category,
      level: block.level,
      side: block.side,
      traceSource: block.imageGeometry.traceSource ?? null,
      traceVersion: block.imageGeometry.traceVersion ?? block.imageGeometry.geometryVersion ?? null,
      block,
    })));

  const allRows = datasets.flatMap((dataset) => dataset.blocks.map((block) => ({
    sourceId: dataset.sourceId,
    sectionId: block.id,
    blockLabel: block.block,
    selectable: isDaeguNormalSelectableSeat(block),
    sectionKind: block.sectionKind,
    traceStatus: block.traceStatus,
    block,
  })));

  const activeBySectionId = groupBy(activeRows, (row) => row.sectionId);
  const activeByBlockLabel = groupBy(activeRows, (row) => row.blockLabel);
  const allBySectionId = groupBy(allRows, (row) => row.sectionId);
  const activeSectionIdSourceOverlaps = duplicateRows(activeBySectionId, (row) => row.sourceId);
  const activeBlockLabelSourceOverlaps = duplicateRows(activeByBlockLabel, (row) => row.sourceId);
  const allSectionIdSourceOverlaps = duplicateRows(allBySectionId, (row) => row.sourceId);

  const officialActiveIds = new Set(activeRows
    .filter((row) => row.sourceId === 'SAMSUNG_OFFICIAL_2026')
    .map((row) => row.sectionId));
  const operatorActiveIds = new Set(activeRows
    .filter((row) => row.sourceId === 'OPERATOR_REFERENCE_RAPAK_2025')
    .map((row) => row.sectionId));
  const officialOnlyActiveIds = [...officialActiveIds]
    .filter((sectionId) => !operatorActiveIds.has(sectionId))
    .sort();
  const operatorOnlyActiveIds = [...operatorActiveIds]
    .filter((sectionId) => !officialActiveIds.has(sectionId))
    .sort();
  const overlappingActiveIds = [...officialActiveIds]
    .filter((sectionId) => operatorActiveIds.has(sectionId))
    .sort();

  const referenceOnlySources = DAEGU_SEATMAP_SOURCE_REFERENCES
    .filter((source) => source.kind !== 'INTERACTIVE_SEATMAP' || !ACTIVE_INTERACTIVE_POLYGON_STATUSES.has(source.polygonStatus))
    .map((source) => source.id);
  const activeRuntimeSourceReferences = DAEGU_SEATMAP_SOURCE_REFERENCES
    .filter((source) => source.kind === 'INTERACTIVE_SEATMAP' && ACTIVE_INTERACTIVE_POLYGON_STATUSES.has(source.polygonStatus))
    .map((source) => source.id);

  const geometryIssues = validateRows(activeRows, validateSeatMapPolygonPath);
  const blockerReasons = [];
  if (geometryIssues.length > 0) {
    blockerReasons.push('ACTIVE_POLYGON_GEOMETRY_ISSUES');
  }
  const reviewReasons = [];
  if (activeRuntimeSourceReferences.length !== 1) {
    reviewReasons.push('ACTIVE_INTERACTIVE_SOURCE_REFERENCE_COUNT_NOT_ONE');
  }
  if (activeSectionIdSourceOverlaps.length > 0) {
    reviewReasons.push('ACTIVE_SECTION_ID_SOURCE_OVERLAPS');
  }

  const status = blockerReasons.length > 0
    ? 'failed'
    : reviewReasons.length > 0
      ? 'review-required'
      : 'passed';

  const summary = {
    status,
    defaultSeatmapSourceId: DAEGU_DEFAULT_SEATMAP_SOURCE_ID,
    activeRuntimeSourceReferenceCount: activeRuntimeSourceReferences.length,
    activeRuntimeSourceReferences,
    referenceOnlySources,
    officialTotalBlocks: DAEGU_BLOCKS.length,
    operatorReferenceTotalBlocks: DAEGU_OPERATOR_REFERENCE_BLOCKS.length,
    canonicalRuntimeBlocks: DAEGU_CANONICAL_BLOCKS.length,
    pendingOperatorTraceBlocks: DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.length,
    targetCanonicalSelectableBlocks: DAEGU_CANONICAL_SEATMAP_SUMMARY.targetSelectableBlocks,
    officialSelectableBlocks: sourceRows.find((row) => row.sourceId === 'SAMSUNG_OFFICIAL_2026')?.selectableBlocks ?? 0,
    operatorReferenceSelectableBlocks: sourceRows.find((row) => row.sourceId === 'OPERATOR_REFERENCE_RAPAK_2025')?.selectableBlocks ?? 0,
    canonicalSelectableBlocks: sourceRows.find((row) => row.sourceId === 'DAEGU_CANONICAL_2026')?.selectableBlocks ?? 0,
    activeSelectableRows: activeRows.length,
    activeSectionIdSourceOverlapCount: activeSectionIdSourceOverlaps.length,
    activeBlockLabelSourceOverlapCount: activeBlockLabelSourceOverlaps.length,
    allSectionIdSourceOverlapCount: allSectionIdSourceOverlaps.length,
    officialOnlyActiveSectionCount: officialOnlyActiveIds.length,
    operatorOnlyActiveSectionCount: operatorOnlyActiveIds.length,
    overlappingActiveSectionCount: overlappingActiveIds.length,
    geometryIssueCount: geometryIssues.length,
    blockerReasons,
    reviewReasons,
  };

  const overlapRows = activeSectionIdSourceOverlaps.map((entry) => ({
    sectionId: entry.key,
    blockLabel: [...new Set(entry.rows.map((row) => row.blockLabel))].join('|'),
    name: [...new Set(entry.rows.map((row) => row.name))].join('|'),
    sourceIds: entry.sourceIds.join('|'),
    categories: [...new Set(entry.rows.map((row) => row.category))].join('|'),
    traceVersions: [...new Set(entry.rows.map((row) => row.traceVersion ?? 'UNKNOWN'))].join('|'),
    status: 'active-source-overlap',
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    status,
    policy: {
      purpose: 'Baseline only. This report measures current Daegu source ownership after canonical consolidation.',
      doesNotWriteProductionData: true,
      generatedReportsAreEvidenceOnly: true,
      canonicalTarget: 'One active DAEGU_CANONICAL_2026 polygon source per selectable Daegu block; official-only rows remain pending operator-reference retrace.',
    },
    summary,
    sourceRows,
    overlapRows,
    sourceSplit: {
      officialOnlyActiveIds,
      operatorOnlyActiveIds,
      overlappingActiveIds,
    },
    geometryIssues,
  };

  const csvHeaders = [
    'sectionId',
    'blockLabel',
    'name',
    'sourceIds',
    'categories',
    'traceVersions',
    'status',
  ];
  const csvRows = overlapRows.map((row) => [
    row.sectionId,
    row.blockLabel,
    row.name,
    row.sourceIds,
    row.categories,
    row.traceVersions,
    row.status,
  ]);
  const csv = [
    csvHeaders.join(','),
    ...csvRows.map((row) => row.map(csvEscape).join(',')),
  ].join('\n');

  const sourceReferenceRows = DAEGU_SEATMAP_SOURCE_REFERENCES.map((source) => [
    source.id,
    source.kind,
    source.polygonStatus,
    source.productionCanonical,
    source.id === DAEGU_DEFAULT_SEATMAP_SOURCE_ID,
  ]);
  const sourceSummaryRows = sourceRows.map((row) => [
    row.sourceId,
    row.interactiveRuntimeSource,
    row.productionCanonical,
    row.defaultSource,
    row.totalBlocks,
    row.selectableBlocks,
    row.officialUnconfirmedBlocks,
    Object.entries(row.sectionKindCounts).map(([key, value]) => `${key}:${value}`).join(', '),
  ]);
  const splitRows = [
    ['official-only active sections', officialOnlyActiveIds.length, officialOnlyActiveIds.join(', ')],
    ['operator-only active sections', operatorOnlyActiveIds.length, operatorOnlyActiveIds.join(', ')],
    ['overlapping active section ids', overlappingActiveIds.length, overlappingActiveIds.join(', ')],
  ];

  const markdown = [
    '# Daegu Seatmap Source Baseline Audit',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- version: \`${AUDIT_VERSION}\``,
    `- status: \`${status}\``,
    `- default source: \`${summary.defaultSeatmapSourceId}\``,
    `- active interactive source references: \`${summary.activeRuntimeSourceReferenceCount}\` (${summary.activeRuntimeSourceReferences.join(', ') || 'none'})`,
    `- canonical selectable blocks: \`${summary.canonicalSelectableBlocks}\``,
    `- pending operator trace blocks: \`${summary.pendingOperatorTraceBlocks}\``,
    `- target canonical selectable blocks: \`${summary.targetCanonicalSelectableBlocks}\``,
    `- official selectable blocks: \`${summary.officialSelectableBlocks}\``,
    `- operator-reference selectable blocks: \`${summary.operatorReferenceSelectableBlocks}\``,
    `- active section-id source overlaps: \`${summary.activeSectionIdSourceOverlapCount}\``,
    `- active block-label source overlaps: \`${summary.activeBlockLabelSourceOverlapCount}\``,
    `- geometry issues: \`${summary.geometryIssueCount}\``,
    '',
    '## Source References',
    '',
    markdownTable(
      ['source', 'kind', 'polygonStatus', 'productionCanonical', 'default'],
      sourceReferenceRows,
    ),
    '',
    '## Source Summary',
    '',
    markdownTable(
      ['source', 'interactiveRuntime', 'productionCanonical', 'default', 'totalBlocks', 'selectableBlocks', 'unconfirmed', 'sectionKinds'],
      sourceSummaryRows,
    ),
    '',
    '## Active Source Split',
    '',
    markdownTable(['bucket', 'count', 'sectionIds'], splitRows),
    '',
    '## Active Section-ID Source Overlaps',
    '',
    overlapRows.length > 0
      ? markdownTable(
        ['sectionId', 'block', 'sources', 'category', 'traceVersions'],
        overlapRows.map((row) => [row.sectionId, row.blockLabel, row.sourceIds, row.categories, row.traceVersions]),
      )
      : 'none',
    '',
    '## Geometry Issues',
    '',
    geometryIssues.length > 0
      ? markdownTable(
        ['sectionId', 'source', 'block', 'pathKind', 'issues'],
        geometryIssues.map((issue) => [issue.sectionId, issue.sourceId, issue.block, issue.pathKind, issue.issueCodes.join(', ')]),
      )
      : 'none',
    '',
    '## Policy',
    '',
    '- This is a baseline report, not a staging command.',
    '- Generated files under `reports/stadium/daegu-seatmap-source-baseline-audit.*` are QA evidence only.',
    '- Active runtime ownership must remain `DAEGU_CANONICAL_2026` only.',
    '- Official image and raw operator-reference datasets are historical evidence, not active runtime polygon sources.',
    '- `MYSEATCHECK_REFERENCE_2026` remains reference-only and must not become an active runtime polygon source without operator-provided approval.',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_FILES.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.csv, `${csv}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.markdown, `${markdown}\n`, 'utf8');

  console.log(`status:${status} active_runtime_sources=${summary.activeRuntimeSourceReferenceCount} official_selectable=${summary.officialSelectableBlocks} operator_selectable=${summary.operatorReferenceSelectableBlocks} active_section_id_overlaps=${summary.activeSectionIdSourceOverlapCount} geometry_issues=${summary.geometryIssueCount}`);
  console.log(`report:${OUTPUT_FILES.json}`);

  if (status === 'failed') {
    process.exitCode = 1;
  }
};

await main();
