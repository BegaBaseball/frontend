import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');

const OUTPUT_FILES = {
  json: path.join(reportDir, 'daegu-seatmap-canonical-block-decision-guard.json'),
  csv: path.join(reportDir, 'daegu-seatmap-canonical-block-decision-guard.csv'),
  markdown: path.join(reportDir, 'daegu-seatmap-canonical-block-decision-guard.md'),
};

const AUDIT_VERSION = 'DAEGU_CANONICAL_BLOCK_DECISION_GUARD_V1';
const OFFICIAL_SOURCE_ID = 'SAMSUNG_OFFICIAL_2026';
const OPERATOR_SOURCE_ID = 'OPERATOR_REFERENCE_RAPAK_2025';

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
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

const uniqueSorted = (values) => [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))]
  .map(String)
  .sort((a, b) => a.localeCompare(b));

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

const normalizeBlockKey = (value) => String(value ?? '')
  .toUpperCase()
  .replaceAll(/\s+/g, '')
  .replaceAll('-', '')
  .replaceAll('휠체어', '')
  .replaceAll('장애인석', '');

const validateCanonicalRowGeometry = (row, validateSeatMapPolygonPath) => {
  if (!row) return [];

  const labelPoint = row.block.imageGeometry.labelPoint ?? [
    row.block.imageGeometry.labelX,
    row.block.imageGeometry.labelY,
  ];
  const paths = [
    ['visualPath', row.block.imageGeometry.visualPath ?? row.block.imageGeometry.d],
    ['hitPath', row.block.imageGeometry.hitPath ?? row.block.imageGeometry.d],
  ];

  return paths.flatMap(([pathKind, pathData]) => validateSeatMapPolygonPath({
    pathData,
    width: row.imageWidth,
    height: row.imageHeight,
    labelPoint,
    labelTolerance: 6,
    sectionId: row.block.id,
    pathKind,
  }).map((code) => `${pathKind}:${code}`));
};

const chooseCanonicalRow = (activeRows, blockedUnconfirmed) => {
  if (blockedUnconfirmed) return null;

  return activeRows.find((row) => row.sourceId === OPERATOR_SOURCE_ID)
    ?? activeRows.find((row) => row.sourceId === OFFICIAL_SOURCE_ID)
    ?? null;
};

const decisionForBlockKey = ({
  blockKey,
  rows,
  validateSeatMapPolygonPath,
}) => {
  const activeRows = rows.filter((row) => row.selectable);
  const activeSourceIds = uniqueSorted(activeRows.map((row) => row.sourceId));
  const markerRows = rows.filter((row) => row.markerOrAlias);
  const blockedUnconfirmedRows = rows.filter((row) => row.blockedUnconfirmed);
  const markerAliasSeparationRequired = markerRows.length > 0 && activeRows.length > 0;
  const blockedUnconfirmed = blockedUnconfirmedRows.length > 0;
  const canonicalRow = chooseCanonicalRow(activeRows, blockedUnconfirmed);
  const geometryIssues = validateCanonicalRowGeometry(canonicalRow, validateSeatMapPolygonPath);
  const flags = [];

  let decisionStatus = 'NO_SELECTABLE_CANONICAL_SOURCE';
  let nextAction = 'Keep as marker, alias, or blocked review evidence until a selectable source is approved.';

  if (blockedUnconfirmed) {
    decisionStatus = 'BLOCKED_UNCONFIRMED';
    flags.push('BLOCKED_UNCONFIRMED_NO_SELECTABLE_CANONICAL');
    nextAction = 'Keep out of selectable canonical layer until independent component evidence is operator-approved.';
  } else if (activeSourceIds.length > 1) {
    decisionStatus = 'CANONICAL_OPERATOR_FROM_OVERLAP';
    flags.push('ACTIVE_POLYGON_SOURCE_OVERLAP_RESOLVED_TO_OPERATOR');
    nextAction = 'Use operator-reference polygon as the single canonical candidate and retain official PNG coordinates as historical evidence.';
  } else if (canonicalRow?.sourceId === OPERATOR_SOURCE_ID) {
    decisionStatus = 'CANONICAL_OPERATOR_ONLY';
    nextAction = 'Keep operator-reference polygon as canonical candidate after metadata and label ownership review.';
  } else if (canonicalRow?.sourceId === OFFICIAL_SOURCE_ID) {
    decisionStatus = 'CANONICAL_OFFICIAL_ONLY';
    nextAction = 'Keep official PNG polygon as canonical candidate until operator-reference retrace evidence exists.';
  } else if (markerRows.length > 0) {
    decisionStatus = 'MARKER_OR_ALIAS_ONLY';
    nextAction = 'Keep outside selectable seat polygon layer and model as marker or alias if needed.';
  }

  if (markerAliasSeparationRequired) flags.push('MARKER_ALIAS_SEPARATION_REQUIRED');
  if (geometryIssues.length > 0) flags.push('CANONICAL_GEOMETRY_ISSUE');

  return {
    blockKey,
    blockLabels: uniqueSorted(rows.map((row) => row.block.block)),
    sectionIds: uniqueSorted(rows.map((row) => row.block.id)),
    names: uniqueSorted(rows.map((row) => row.block.name)),
    categories: uniqueSorted(rows.map((row) => row.block.category)),
    sectionKinds: uniqueSorted(rows.map((row) => row.block.sectionKind)),
    activeSourceIds,
    activeSourceCount: activeSourceIds.length,
    canonicalSourceId: canonicalRow?.sourceId ?? null,
    canonicalSectionId: canonicalRow?.block.id ?? null,
    canonicalBlockLabel: canonicalRow?.block.block ?? null,
    decisionStatus,
    markerAliasSeparationRequired,
    blockedUnconfirmed,
    geometryIssues,
    flags,
    nextAction,
  };
};

const countBy = (rows, getKey) => Object.fromEntries(
  [...groupBy(rows, getKey).entries()]
    .map(([key, groupRows]) => [key, groupRows.length])
    .sort(([a], [b]) => String(a).localeCompare(String(b))),
);

const main = async () => {
  const {
    DAEGU_BLOCKS,
    DAEGU_OPERATOR_REFERENCE_BLOCKS,
    DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT,
    DAEGU_SEATMAP_IMAGE,
    DAEGU_SEATMAP_VIEWPORT,
    isDaeguNormalSelectableSeat,
    isDaeguOfficialUnconfirmedSeat,
  } = await import('../src/data/daeguSeatData.ts');
  const {
    validateSeatMapPolygonPath,
  } = await import('../src/utils/seatMapPolygonValidator.ts');

  await fs.mkdir(reportDir, { recursive: true });

  const rows = [
    ...DAEGU_BLOCKS.map((block) => ({
      sourceId: OFFICIAL_SOURCE_ID,
      imageWidth: DAEGU_SEATMAP_VIEWPORT.width || DAEGU_SEATMAP_IMAGE.imageWidth,
      imageHeight: DAEGU_SEATMAP_VIEWPORT.height || DAEGU_SEATMAP_IMAGE.imageHeight,
      block,
    })),
    ...DAEGU_OPERATOR_REFERENCE_BLOCKS.map((block) => ({
      sourceId: OPERATOR_SOURCE_ID,
      imageWidth: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.width,
      imageHeight: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.height,
      block,
    })),
  ].map((row) => ({
    ...row,
    blockKey: normalizeBlockKey(row.block.block),
    selectable: isDaeguNormalSelectableSeat(row.block),
    markerOrAlias: row.block.sectionKind !== 'SEAT_SECTION',
    blockedUnconfirmed: isDaeguOfficialUnconfirmedSeat(row.block),
  }));

  const decisions = [...groupBy(rows, (row) => row.blockKey).entries()]
    .map(([blockKey, blockRows]) => decisionForBlockKey({
      blockKey,
      rows: blockRows,
      validateSeatMapPolygonPath,
    }))
    .sort((a, b) => a.blockKey.localeCompare(b.blockKey));

  const decisionsWithFlags = decisions.filter((row) => row.flags.length > 0);
  const geometryIssueRows = decisions.filter((row) => row.geometryIssues.length > 0);
  const markerAliasRows = decisions.filter((row) => row.markerAliasSeparationRequired);
  const blockedUnconfirmedRows = decisions.filter((row) => row.blockedUnconfirmed);
  const status = geometryIssueRows.length > 0
    ? 'failed'
    : (markerAliasRows.length > 0 || blockedUnconfirmedRows.length > 0)
      ? 'review-required'
      : 'passed';

  const summary = {
    status,
    totalBlockKeys: decisions.length,
    canonicalSelectableBlockKeys: decisions.filter((row) => row.canonicalSourceId !== null).length,
    operatorOverlapCanonicalBlockKeys: decisions.filter((row) => row.decisionStatus === 'CANONICAL_OPERATOR_FROM_OVERLAP').length,
    officialOnlyCanonicalBlockKeys: decisions.filter((row) => row.decisionStatus === 'CANONICAL_OFFICIAL_ONLY').length,
    operatorOnlyCanonicalBlockKeys: decisions.filter((row) => row.decisionStatus === 'CANONICAL_OPERATOR_ONLY').length,
    markerOrAliasOnlyBlockKeys: decisions.filter((row) => row.decisionStatus === 'MARKER_OR_ALIAS_ONLY').length,
    blockedUnconfirmedBlockKeys: blockedUnconfirmedRows.length,
    markerAliasSeparationRequiredBlockKeys: markerAliasRows.length,
    geometryIssueBlockKeys: geometryIssueRows.length,
    decisionCounts: countBy(decisions, (row) => row.decisionStatus),
    flagCounts: countBy(decisionsWithFlags.flatMap((row) => row.flags), (flag) => flag),
    canonicalSourceCounts: countBy(
      decisions.filter((row) => row.canonicalSourceId !== null),
      (row) => row.canonicalSourceId,
    ),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    status,
    policy: {
      purpose: 'Read-only Daegu block-key canonical decision guard before runtime single-source consolidation.',
      overlapDefault: OPERATOR_SOURCE_ID,
      officialOnlyDefault: OFFICIAL_SOURCE_ID,
      operatorOnlyDefault: OPERATOR_SOURCE_ID,
      markerAliasRowsStayOutOfSelectableLayer: true,
      unconfirmedRowsBlockSelectableCanonical: true,
      generatedReportsAreEvidenceOnly: true,
    },
    summary,
    decisions,
  };

  const csvHeaders = [
    'blockKey',
    'blockLabels',
    'sectionIds',
    'decisionStatus',
    'canonicalSourceId',
    'canonicalSectionId',
    'activeSourceIds',
    'markerAliasSeparationRequired',
    'blockedUnconfirmed',
    'flags',
    'nextAction',
  ];
  const csv = [
    csvHeaders.join(','),
    ...decisions.map((row) => [
      row.blockKey,
      row.blockLabels,
      row.sectionIds,
      row.decisionStatus,
      row.canonicalSourceId ?? '',
      row.canonicalSectionId ?? '',
      row.activeSourceIds,
      row.markerAliasSeparationRequired,
      row.blockedUnconfirmed,
      row.flags,
      row.nextAction,
    ].map(csvEscape).join(',')),
  ].join('\n');

  const reviewRows = decisionsWithFlags.map((row) => [
    row.blockKey,
    row.blockLabels.join(', '),
    row.decisionStatus,
    row.canonicalSourceId ?? 'none',
    row.flags.join(', '),
    row.nextAction,
  ]);

  const markdown = [
    '# Daegu Canonical Block Decision Guard',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- version: \`${AUDIT_VERSION}\``,
    `- status: \`${status}\``,
    `- total block keys: \`${summary.totalBlockKeys}\``,
    `- canonical selectable block keys: \`${summary.canonicalSelectableBlockKeys}\``,
    `- operator overlap canonical block keys: \`${summary.operatorOverlapCanonicalBlockKeys}\``,
    `- official-only canonical block keys: \`${summary.officialOnlyCanonicalBlockKeys}\``,
    `- operator-only canonical block keys: \`${summary.operatorOnlyCanonicalBlockKeys}\``,
    `- marker/alias-only block keys: \`${summary.markerOrAliasOnlyBlockKeys}\``,
    `- blocked unconfirmed block keys: \`${summary.blockedUnconfirmedBlockKeys}\``,
    `- marker alias separation required block keys: \`${summary.markerAliasSeparationRequiredBlockKeys}\``,
    `- geometry issue block keys: \`${summary.geometryIssueBlockKeys}\``,
    '',
    '## Decision Counts',
    '',
    markdownTable(
      ['decisionStatus', 'count'],
      Object.entries(summary.decisionCounts).map(([decisionStatus, count]) => [decisionStatus, count]),
    ),
    '',
    '## Canonical Source Counts',
    '',
    markdownTable(
      ['source', 'count'],
      Object.entries(summary.canonicalSourceCounts).map(([source, count]) => [source, count]),
    ),
    '',
    '## Review Rows',
    '',
    reviewRows.length > 0
      ? markdownTable(['blockKey', 'labels', 'decision', 'canonicalSource', 'flags', 'nextAction'], reviewRows)
      : 'none',
    '',
    '## Policy',
    '',
    '- This script does not edit production data.',
    '- Generated files under `reports/stadium/daegu-seatmap-canonical-block-decision-guard.*` are QA evidence only.',
    '- Every selectable canonical block key resolves to at most one source.',
    '- Official/operator overlaps resolve to the operator reference source by default.',
    '- Marker/alias and unconfirmed rows stay outside the selectable canonical layer until explicitly approved.',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_FILES.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.csv, `${csv}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.markdown, `${markdown}\n`, 'utf8');

  console.log(`status:${status} block_keys=${summary.totalBlockKeys} canonical_selectable=${summary.canonicalSelectableBlockKeys} operator_overlap=${summary.operatorOverlapCanonicalBlockKeys} official_only=${summary.officialOnlyCanonicalBlockKeys} operator_only=${summary.operatorOnlyCanonicalBlockKeys} marker_alias_separation=${summary.markerAliasSeparationRequiredBlockKeys} blocked_unconfirmed=${summary.blockedUnconfirmedBlockKeys} geometry_issues=${summary.geometryIssueBlockKeys}`);
  console.log(`report:${OUTPUT_FILES.json}`);

  if (status === 'failed') {
    process.exitCode = 1;
  }
};

await main();
