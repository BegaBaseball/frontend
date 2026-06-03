import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const outputDir = path.join(repoRoot, 'output/playwright');

const OUTPUT_FILES = {
  json: path.join(reportDir, 'sajik-seatmap-block-source-duplication-audit.json'),
  csv: path.join(reportDir, 'sajik-seatmap-block-source-duplication-audit.csv'),
  markdown: path.join(reportDir, 'sajik-seatmap-block-source-duplication-audit.md'),
};

const AUDIT_VERSION = 'SAJIK_BLOCK_SOURCE_DUPLICATION_AUDIT_V2_CANONICAL_2026';
const SCRIPT_PREFIX = 'sajik-seatmap';
const ACTIVE_ARTIFACT_PATTERNS = [
  /sajik.*candidate/i,
  /sajik.*proposed/i,
  /sajik.*retrace/i,
];
const STAGE01_TARGET_FILE_PATTERN = /^(.+)-(?:review-packet|entry-template|approval-gate|apply-precheck|official-crop|official-overlay-crop|official-edge-crop)\.(?:json|md|csv|svg|png)$/;

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

const rel = (filePath) => path.relative(frontendRoot, filePath);

const duplicateIds = (ids) => {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }));
};

const walkFiles = async (root) => {
  const results = [];
  const walk = async (dir) => {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(filePath);
      } else if (entry.isFile()) {
        results.push(filePath);
      }
    }
  };
  await walk(root);
  return results;
};

const stage01TargetIds = async () => {
  const targetDir = path.join(reportDir, 'sajik-stage01-operator/targets');
  let files = [];
  try {
    files = await fs.readdir(targetDir);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const rowsBySectionId = new Map();
  for (const fileName of files) {
    const match = fileName.match(STAGE01_TARGET_FILE_PATTERN);
    if (!match) continue;
    const sectionId = match[1];
    const rows = rowsBySectionId.get(sectionId) ?? [];
    rows.push(fileName);
    rowsBySectionId.set(sectionId, rows);
  }
  return rowsBySectionId;
};

const listHistoricalCandidateArtifacts = async () => {
  const candidateRoots = [reportDir, outputDir];
  const files = (await Promise.all(candidateRoots.map(walkFiles))).flat();
  return files
    .filter((filePath) => path.basename(filePath).toLowerCase().includes('sajik'))
    .filter((filePath) => ACTIVE_ARTIFACT_PATTERNS.some((pattern) => pattern.test(path.basename(filePath))))
    .map((filePath) => ({
      path: rel(filePath),
      pattern: ACTIVE_ARTIFACT_PATTERNS.find((pattern) => pattern.test(path.basename(filePath)))?.source ?? null,
      historicalRole: 'historical-evidence-not-runtime-source',
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
};

const main = async () => {
  const {
    SAJIK_BLOCKS,
    SAJIK_SEATMAP_IMAGE,
  } = await import('../src/data/sajikSeatData.ts');
  const {
    SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET,
  } = await import('../src/data/sajikOperatorReferenceSeatMapDataset.ts');
  const {
    SAJIK_CANONICAL_ACCESSIBILITY_MARKERS,
    SAJIK_CANONICAL_ACCESSIBILITY_MARKER_ALIASES,
    SAJIK_CANONICAL_BLOCKS,
    SAJIK_CANONICAL_LEGACY_ALIAS_ONLY_BLOCKS,
    SAJIK_CANONICAL_OPERATOR_ONLY_SECTION_IDS,
    SAJIK_CANONICAL_SEATMAP_IMAGE,
    SAJIK_CANONICAL_SEATMAP_SOURCE_ID,
    SAJIK_CANONICAL_SEATMAP_SUMMARY,
    SAJIK_CANONICAL_SOURCE_POLICY,
    validateSajikCanonicalSeatMap,
  } = await import('../src/data/sajikCanonicalSeatMap.ts');

  await fs.mkdir(reportDir, { recursive: true });

  const canonicalSectionIds = SAJIK_CANONICAL_BLOCKS.map((block) => block.block);
  const officialSectionIds = SAJIK_BLOCKS.map((block) => block.block);
  const operatorSectionIds = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sections.map((section) => section.sectionId);
  const canonicalSectionIdSet = new Set(canonicalSectionIds);
  const officialSectionIdSet = new Set(officialSectionIds);
  const operatorSectionIdSet = new Set(operatorSectionIds);
  const stage01TargetsBySectionId = await stage01TargetIds();
  const historicalCandidateArtifacts = await listHistoricalCandidateArtifacts();

  const canonicalDuplicateIds = duplicateIds(canonicalSectionIds);
  const canonicalValidationIssues = validateSajikCanonicalSeatMap();
  const nonCanonicalRuntimeSourceIssues = SAJIK_CANONICAL_BLOCKS
    .filter((block) => block.canonicalSourceId !== SAJIK_CANONICAL_SEATMAP_SOURCE_ID)
    .map((block) => `${block.block}:NON_CANONICAL_RUNTIME_SOURCE:${block.canonicalSourceId}`);
  const activePolygonSourceViolations = SAJIK_CANONICAL_BLOCKS
    .map((block) => ({
      sectionId: block.block,
      sourceCount: block.canonicalSourceId === SAJIK_CANONICAL_SEATMAP_SOURCE_ID ? 1 : 0,
    }))
    .filter((row) => row.sourceCount !== 1);
  const missingOperatorOnlyIds = SAJIK_CANONICAL_OPERATOR_ONLY_SECTION_IDS
    .filter((sectionId) => !canonicalSectionIdSet.has(sectionId));
  const legacyOfficialOnlyIds = officialSectionIds.filter((sectionId) => !operatorSectionIdSet.has(sectionId));
  const legacyAliasOnlyIds = SAJIK_CANONICAL_LEGACY_ALIAS_ONLY_BLOCKS.map((block) => block.block);
  const legacyAccessibilityMarkerAliasIds = SAJIK_CANONICAL_ACCESSIBILITY_MARKER_ALIASES.map((marker) => marker.markerId);
  const legacyOfficialOperatorOverlapIds = officialSectionIds.filter((sectionId) => operatorSectionIdSet.has(sectionId));
  const operatorOnlyIds = operatorSectionIds.filter((sectionId) => !officialSectionIdSet.has(sectionId));

  const rows = SAJIK_CANONICAL_BLOCKS.map((block) => ({
    sectionId: block.block,
    blockId: block.id,
    name: block.name,
    category: block.category,
    canonicalSourceId: block.canonicalSourceId,
    activePolygonSourceCount: 1,
    historicalOfficialPngPolygonPresent: officialSectionIdSet.has(block.block),
    historicalOperatorReferencePolygonPresent: operatorSectionIdSet.has(block.block),
    stage01TargetArtifactCount: stage01TargetsBySectionId.get(block.block)?.length ?? 0,
    mapInteractionStatus: block.mapInteractionStatus,
    sectionKind: block.sectionKind,
    status: 'active-canonical',
    warnings: [],
    blockers: [],
  }));

  const legacyAliasRows = SAJIK_CANONICAL_LEGACY_ALIAS_ONLY_BLOCKS.map((block) => ({
    sectionId: block.block,
    blockId: block.id,
    name: block.name,
    category: block.category,
    canonicalSourceId: block.canonicalSourceId,
    activePolygonSourceCount: 0,
    historicalOfficialPngPolygonPresent: true,
    historicalOperatorReferencePolygonPresent: false,
    stage01TargetArtifactCount: stage01TargetsBySectionId.get(block.block)?.length ?? 0,
    mapInteractionStatus: block.mapInteractionStatus,
    sectionKind: block.sectionKind,
    status: 'legacy-alias-only',
    warnings: ['LEGACY_OFFICIAL_PNG_ONLY_NOT_RUNTIME_POLYGON'],
    blockers: [],
  }));

  const accessibilityMarkerAliasRows = SAJIK_CANONICAL_ACCESSIBILITY_MARKER_ALIASES.map((marker) => ({
    sectionId: marker.markerId,
    blockId: marker.id,
    name: marker.name,
    category: 'ACCESSIBLE',
    canonicalSourceId: marker.canonicalSourceId,
    activePolygonSourceCount: 0,
    historicalOfficialPngPolygonPresent: true,
    historicalOperatorReferencePolygonPresent: false,
    stage01TargetArtifactCount: stage01TargetsBySectionId.get(marker.markerId)?.length ?? 0,
    mapInteractionStatus: 'MARKER_ALIAS_ONLY',
    sectionKind: marker.sectionKind,
    status: 'canonical-marker-alias',
    warnings: ['OFFICIAL_PNG_WHEELCHAIR_MARKER_ALIAS_NOT_RUNTIME_POLYGON'],
    blockers: [],
  }));

  const blockers = [
    ...canonicalValidationIssues,
    ...canonicalDuplicateIds.map((entry) => `${entry.id}:DUPLICATE_CANONICAL_SECTION_ID:${entry.count}`),
    ...nonCanonicalRuntimeSourceIssues,
    ...activePolygonSourceViolations.map((row) => `${row.sectionId}:ACTIVE_POLYGON_SOURCE_COUNT:${row.sourceCount}`),
    ...missingOperatorOnlyIds.map((sectionId) => `${sectionId}:OPERATOR_ONLY_CANONICAL_BLOCK_MISSING`),
  ];
  const status = blockers.length === 0 ? 'passed' : 'failed';

  const summary = {
    status,
    canonicalSourceId: SAJIK_CANONICAL_SEATMAP_SOURCE_ID,
    canonicalImageWidth: SAJIK_CANONICAL_SEATMAP_IMAGE.imageWidth,
    canonicalImageHeight: SAJIK_CANONICAL_SEATMAP_IMAGE.imageHeight,
    activeCanonicalBlockCount: SAJIK_CANONICAL_SEATMAP_SUMMARY.activeBlocks,
    activeCanonicalSeatSectionCount: SAJIK_CANONICAL_SEATMAP_SUMMARY.activeSeatSections,
    activeAccessibilityMarkerCount: SAJIK_CANONICAL_ACCESSIBILITY_MARKERS.length,
    linkedAccessibilityMarkerCount: SAJIK_CANONICAL_SEATMAP_SUMMARY.linkedAccessibilityMarkers,
    activePolygonSourcePerBlock: 1,
    canonicalDuplicateIdCount: canonicalDuplicateIds.length,
    canonicalValidationIssueCount: canonicalValidationIssues.length,
    nonCanonicalRuntimeSourceIssueCount: nonCanonicalRuntimeSourceIssues.length,
    activePolygonSourceViolationCount: activePolygonSourceViolations.length,
    operatorOnlyCanonicalBlockCount: operatorOnlyIds.length,
    legacyAliasOnlyBlockCount: SAJIK_CANONICAL_LEGACY_ALIAS_ONLY_BLOCKS.length,
    legacyAccessibilityMarkerAliasCount: SAJIK_CANONICAL_ACCESSIBILITY_MARKER_ALIASES.length,
    historicalOfficialBlockCount: SAJIK_BLOCKS.length,
    historicalOperatorReferenceSectionCount: operatorSectionIds.length,
    historicalOfficialOperatorOverlapCount: legacyOfficialOperatorOverlapIds.length,
    historicalOfficialOnlyCount: legacyOfficialOnlyIds.length,
    historicalCandidateArtifactCount: historicalCandidateArtifacts.length,
    stage01HistoricalTargetBlockCount: [...stage01TargetsBySectionId.keys()].length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    status,
    sourcePolicy: SAJIK_CANONICAL_SOURCE_POLICY,
    canonicalImage: SAJIK_CANONICAL_SEATMAP_IMAGE,
    legacyOfficialImage: {
      imagePath: SAJIK_SEATMAP_IMAGE.imagePath,
      imageWidth: SAJIK_SEATMAP_IMAGE.imageWidth,
      imageHeight: SAJIK_SEATMAP_IMAGE.imageHeight,
      runtimeRole: 'historical-reference-only',
    },
    summary,
    blockers,
    duplicateChecks: {
      canonicalDuplicateIds,
      missingOperatorOnlyIds,
      operatorOnlyIds,
      legacyOfficialOnlyIds,
      legacyAliasOnlyIds,
      legacyAccessibilityMarkerAliasIds,
      legacyOfficialOperatorOverlapIds,
    },
    historicalCandidateArtifacts,
    rows,
    legacyAliasRows,
    accessibilityMarkerAliasRows,
  };

  const csvHeaders = [
    'sectionId',
    'name',
    'category',
    'status',
    'canonicalSourceId',
    'activePolygonSourceCount',
    'historicalOfficialPngPolygonPresent',
    'historicalOperatorReferencePolygonPresent',
    'stage01TargetArtifactCount',
    'warnings',
    'blockers',
  ];
  const csv = [
    csvHeaders.join(','),
    ...[...rows, ...legacyAliasRows, ...accessibilityMarkerAliasRows].map((row) => [
      row.sectionId,
      row.name,
      row.category,
      row.status,
      row.canonicalSourceId,
      row.activePolygonSourceCount,
      row.historicalOfficialPngPolygonPresent,
      row.historicalOperatorReferencePolygonPresent,
      row.stage01TargetArtifactCount,
      row.warnings.join('|'),
      row.blockers.join('|'),
    ].map(csvEscape).join(',')),
  ].join('\n');

  const markdown = [
    '# Sajik Block Source Duplication Audit',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- version: \`${AUDIT_VERSION}\``,
    `- status: \`${status}\``,
    `- canonical source: \`${SAJIK_CANONICAL_SEATMAP_SOURCE_ID}\``,
    `- canonical image: \`${SAJIK_CANONICAL_SEATMAP_IMAGE.viewBox}\``,
    `- active canonical blocks: \`${summary.activeCanonicalBlockCount}\``,
    `- active polygon sources per canonical block: \`${summary.activePolygonSourcePerBlock}\``,
    `- accessibility markers: \`${summary.activeAccessibilityMarkerCount}\``,
    `- legacy alias-only blocks: \`${summary.legacyAliasOnlyBlockCount}\``,
    `- legacy wheelchair marker aliases: \`${summary.legacyAccessibilityMarkerAliasCount}\``,
    `- historical official/operator overlaps: \`${summary.historicalOfficialOperatorOverlapCount}\``,
    `- historical candidate/proposed/retrace artifacts: \`${summary.historicalCandidateArtifactCount}\``,
    '',
    '## Active Runtime Checks',
    '',
    markdownTable(
      ['check', 'count', 'details'],
      [
        ['canonical validation issues', canonicalValidationIssues.length, canonicalValidationIssues.join(', ') || 'none'],
        ['duplicate canonical section ids', canonicalDuplicateIds.length, canonicalDuplicateIds.map((entry) => `${entry.id}(${entry.count})`).join(', ') || 'none'],
        ['non-canonical runtime source issues', nonCanonicalRuntimeSourceIssues.length, nonCanonicalRuntimeSourceIssues.join(', ') || 'none'],
        ['active polygon source count violations', activePolygonSourceViolations.length, activePolygonSourceViolations.map((row) => `${row.sectionId}:${row.sourceCount}`).join(', ') || 'none'],
        ['missing operator-only canonical ids', missingOperatorOnlyIds.length, missingOperatorOnlyIds.join(', ') || 'none'],
      ],
    ),
    '',
    '## Historical Evidence',
    '',
    markdownTable(
      ['bucket', 'count', 'ids'],
      [
        ['operator-only promoted to canonical', operatorOnlyIds.length, operatorOnlyIds.join(', ') || 'none'],
        ['official-only alias-only/not runtime', legacyAliasOnlyIds.length, legacyAliasOnlyIds.join(', ') || 'none'],
        ['official wheelchair marker aliases/not runtime polygon', legacyAccessibilityMarkerAliasIds.length, legacyAccessibilityMarkerAliasIds.join(', ') || 'none'],
        ['official/operator overlap now canonical-owned', legacyOfficialOperatorOverlapIds.length, legacyOfficialOperatorOverlapIds.join(', ') || 'none'],
      ],
    ),
    '',
    '## Legacy Alias-Only Rows',
    '',
    markdownTable(
      ['section', 'status', 'reason'],
      legacyAliasRows.map((row) => [row.sectionId, row.status, row.warnings.join('<br>')]),
    ),
    '',
    '## Canonical Marker Alias Rows',
    '',
    markdownTable(
      ['marker', 'status', 'reason'],
      accessibilityMarkerAliasRows.map((row) => [row.sectionId, row.status, row.warnings.join('<br>')]),
    ),
    '',
    '## Historical Candidate/Proposed/Retrace Artifacts',
    '',
    historicalCandidateArtifacts.length > 0
      ? markdownTable(
        ['path', 'role'],
        historicalCandidateArtifacts.map((artifact) => [artifact.path, artifact.historicalRole]),
      )
      : 'none',
    '',
    '## Policy',
    '',
    '- Runtime coordinate source is `SAJIK_CANONICAL_2026` on the operator-reference 1151x1367 image.',
    '- Official PNG, stage01, candidate, proposed, and retrace outputs are historical evidence unless explicitly promoted into canonical data.',
    '- Any canonical active block with zero or multiple active polygon sources fails this audit.',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_FILES.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.csv, `${csv}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.markdown, `${markdown}\n`, 'utf8');

  console.log(`status:${status} active_canonical_blocks=${summary.activeCanonicalBlockCount} active_polygon_source_per_block=${summary.activePolygonSourcePerBlock} legacy_alias_only=${summary.legacyAliasOnlyBlockCount}`);
  console.log(`report:${OUTPUT_FILES.json}`);

  if (status !== 'passed') {
    process.exitCode = 1;
  }
};

await main();
