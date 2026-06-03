import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');

const OUTPUT_FILES = {
  json: path.join(reportDir, 'daegu-seatmap-canonical-decision-table.json'),
  csv: path.join(reportDir, 'daegu-seatmap-canonical-decision-table.csv'),
  markdown: path.join(reportDir, 'daegu-seatmap-canonical-decision-table.md'),
};

const AUDIT_VERSION = 'DAEGU_CANONICAL_DECISION_TABLE_V1';
const OFFICIAL_SOURCE_ID = 'SAMSUNG_OFFICIAL_2026';
const OPERATOR_SOURCE_ID = 'OPERATOR_REFERENCE_RAPAK_2025';

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

const uniqueSorted = (values) => [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))]
  .map(String)
  .sort((a, b) => a.localeCompare(b));

const validateActiveGeometry = (row, validateSeatMapPolygonPath) => {
  const labelPoint = row.block.imageGeometry.labelPoint ?? [
    row.block.imageGeometry.labelX,
    row.block.imageGeometry.labelY,
  ];
  const pathRows = [
    ['visualPath', row.block.imageGeometry.visualPath ?? row.block.imageGeometry.d],
    ['hitPath', row.block.imageGeometry.hitPath ?? row.block.imageGeometry.d],
  ];
  return pathRows.flatMap(([pathKind, pathData]) => validateSeatMapPolygonPath({
    pathData,
    width: row.imageWidth,
    height: row.imageHeight,
    labelPoint,
    labelTolerance: 6,
    sectionId: row.sectionId,
    pathKind,
  }).map((code) => `${pathKind}:${code}`));
};

const decisionForGroup = ({
  sectionId,
  rows,
  isDaeguNormalSelectableSeat,
  isDaeguOfficialUnconfirmedSeat,
  validateSeatMapPolygonPath,
}) => {
  const officialRows = rows.filter((row) => row.sourceId === OFFICIAL_SOURCE_ID);
  const operatorRows = rows.filter((row) => row.sourceId === OPERATOR_SOURCE_ID);
  const officialActiveRows = officialRows.filter((row) => isDaeguNormalSelectableSeat(row.block));
  const operatorActiveRows = operatorRows.filter((row) => isDaeguNormalSelectableSeat(row.block));
  const activeRows = [...officialActiveRows, ...operatorActiveRows];
  const markerRows = rows.filter((row) => row.block.sectionKind !== 'SEAT_SECTION');
  const unconfirmedRows = rows.filter((row) => isDaeguOfficialUnconfirmedSeat(row.block));
  const geometryIssues = activeRows.flatMap((row) => validateActiveGeometry(row, validateSeatMapPolygonPath));
  const sourceIds = uniqueSorted(rows.map((row) => row.sourceId));
  const activeSourceIds = uniqueSorted(activeRows.map((row) => row.sourceId));
  const names = uniqueSorted(rows.map((row) => row.block.name));
  const blockLabels = uniqueSorted(rows.map((row) => row.block.block));
  const categories = uniqueSorted(rows.map((row) => row.block.category));
  const sectionKinds = uniqueSorted(rows.map((row) => row.block.sectionKind));
  const traceStatuses = uniqueSorted(rows.map((row) => row.block.traceStatus));
  const traceVersions = uniqueSorted(rows.map((row) => (
    row.block.imageGeometry.traceVersion
    ?? row.block.imageGeometry.geometryVersion
    ?? 'UNKNOWN'
  )));

  let decisionStatus = 'REVIEW_ONLY';
  let recommendedCanonicalSourceId = null;
  let reason = 'No active selectable polygon is currently eligible for canonical promotion.';
  let requiredNextAction = 'Keep as review evidence until an approved selectable polygon exists.';

  if (unconfirmedRows.length > 0) {
    decisionStatus = 'BLOCKED_UNCONFIRMED';
    reason = 'Official independent seat component is unconfirmed; do not promote to selectable canonical polygon.';
    requiredNextAction = 'Require operator-approved independent component evidence before any selectable promotion.';
  } else if (markerRows.length > 0 && activeRows.length === 0) {
    decisionStatus = 'ALIAS_OR_MARKER_REVIEW';
    reason = 'Row is marker/facility/wayfinding inventory, not a normal selectable seat polygon.';
    requiredNextAction = 'Keep outside seat polygon layer; convert to canonical marker or alias if needed.';
  } else if (officialActiveRows.length > 0 && operatorActiveRows.length > 0) {
    decisionStatus = geometryIssues.length > 0 ? 'GEOMETRY_BLOCKED' : 'CANONICAL_READY';
    recommendedCanonicalSourceId = geometryIssues.length > 0 ? null : OPERATOR_SOURCE_ID;
    reason = geometryIssues.length > 0
      ? 'Active overlap has geometry issues and cannot be promoted yet.'
      : 'Official/operator overlap exists; operator-reference is the recommended canonical source for this overlap row.';
    requiredNextAction = geometryIssues.length > 0
      ? 'Fix geometry before choosing a canonical source.'
      : 'Promote operator-reference polygon to canonical and mark official PNG coordinates as historical evidence.';
  } else if (operatorActiveRows.length > 0) {
    decisionStatus = geometryIssues.length > 0 ? 'GEOMETRY_BLOCKED' : 'OPERATOR_ONLY_REVIEW';
    recommendedCanonicalSourceId = geometryIssues.length > 0 ? null : OPERATOR_SOURCE_ID;
    reason = geometryIssues.length > 0
      ? 'Operator-only active polygon has geometry issues.'
      : 'Only operator-reference has an active selectable polygon for this section.';
    requiredNextAction = geometryIssues.length > 0
      ? 'Fix geometry before canonical promotion.'
      : 'Review metadata/label ownership, then promote operator-reference polygon or classify as alias/marker.';
  } else if (officialActiveRows.length > 0) {
    decisionStatus = geometryIssues.length > 0 ? 'GEOMETRY_BLOCKED' : 'OFFICIAL_ONLY_REVIEW';
    recommendedCanonicalSourceId = geometryIssues.length > 0 ? null : OFFICIAL_SOURCE_ID;
    reason = geometryIssues.length > 0
      ? 'Official-only active polygon has geometry issues.'
      : 'Only official PNG has an active selectable polygon for this section.';
    requiredNextAction = geometryIssues.length > 0
      ? 'Fix geometry before canonical promotion.'
      : 'Keep official PNG polygon as canonical candidate or retrace/approve an operator-reference polygon before promotion.';
  } else if (markerRows.length > 0) {
    decisionStatus = 'ALIAS_OR_MARKER_REVIEW';
    reason = 'Marker/facility/wayfinding row has no normal selectable polygon.';
    requiredNextAction = 'Keep outside seat polygon layer; convert to canonical marker or alias if needed.';
  }

  return {
    sectionId,
    blockLabels,
    names,
    categories,
    sectionKinds,
    sourceIds,
    activeSourceIds,
    officialPolygonPresent: officialRows.length > 0,
    operatorPolygonPresent: operatorRows.length > 0,
    officialActivePolygonPresent: officialActiveRows.length > 0,
    operatorActivePolygonPresent: operatorActiveRows.length > 0,
    markerOrFacilityPresent: markerRows.length > 0,
    officialUnconfirmedPresent: unconfirmedRows.length > 0,
    traceStatuses,
    traceVersions,
    recommendedCanonicalSourceId,
    decisionStatus,
    reason,
    requiredNextAction,
    geometryIssues,
  };
};

const main = async () => {
  const {
    DAEGU_BLOCKS,
    DAEGU_OPERATOR_REFERENCE_BLOCKS,
    DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT,
    DAEGU_SEATMAP_IMAGE,
    DAEGU_SEATMAP_SOURCE_REFERENCES,
    DAEGU_SEATMAP_VIEWPORT,
    isDaeguNormalSelectableSeat,
    isDaeguOfficialUnconfirmedSeat,
  } = await import('../src/data/daeguSeatData.ts');
  const {
    validateSeatMapPolygonPath,
  } = await import('../src/utils/seatMapPolygonValidator.ts');

  await fs.mkdir(reportDir, { recursive: true });

  const allRows = [
    ...DAEGU_BLOCKS.map((block) => ({
      sourceId: OFFICIAL_SOURCE_ID,
      imageWidth: DAEGU_SEATMAP_VIEWPORT.width || DAEGU_SEATMAP_IMAGE.imageWidth,
      imageHeight: DAEGU_SEATMAP_VIEWPORT.height || DAEGU_SEATMAP_IMAGE.imageHeight,
      sectionId: block.id,
      block,
    })),
    ...DAEGU_OPERATOR_REFERENCE_BLOCKS.map((block) => ({
      sourceId: OPERATOR_SOURCE_ID,
      imageWidth: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.width,
      imageHeight: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.height,
      sectionId: block.id,
      block,
    })),
  ];
  const groups = groupBy(allRows, (row) => row.sectionId);
  const rows = [...groups.entries()]
    .map(([sectionId, groupRows]) => decisionForGroup({
      sectionId,
      rows: groupRows,
      isDaeguNormalSelectableSeat,
      isDaeguOfficialUnconfirmedSeat,
      validateSeatMapPolygonPath,
    }))
    .sort((a, b) => a.sectionId.localeCompare(b.sectionId));

  const decisionCounts = Object.fromEntries(
    [...groupBy(rows, (row) => row.decisionStatus).entries()]
      .map(([decisionStatus, decisionRows]) => [decisionStatus, decisionRows.length])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  );
  const recommendedSourceCounts = Object.fromEntries(
    [...groupBy(rows, (row) => row.recommendedCanonicalSourceId ?? 'NO_CANONICAL_SOURCE').entries()]
      .map(([sourceId, sourceRows]) => [sourceId, sourceRows.length])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  );
  const geometryIssueRows = rows.filter((row) => row.geometryIssues.length > 0);
  const status = geometryIssueRows.length > 0
    ? 'failed'
    : rows.some((row) => row.decisionStatus !== 'CANONICAL_READY')
      ? 'review-required'
      : 'passed';

  const summary = {
    status,
    totalDecisionRows: rows.length,
    decisionCounts,
    recommendedSourceCounts,
    canonicalReadyRows: decisionCounts.CANONICAL_READY ?? 0,
    officialOnlyReviewRows: decisionCounts.OFFICIAL_ONLY_REVIEW ?? 0,
    operatorOnlyReviewRows: decisionCounts.OPERATOR_ONLY_REVIEW ?? 0,
    markerOrAliasReviewRows: decisionCounts.ALIAS_OR_MARKER_REVIEW ?? 0,
    blockedUnconfirmedRows: decisionCounts.BLOCKED_UNCONFIRMED ?? 0,
    geometryBlockedRows: decisionCounts.GEOMETRY_BLOCKED ?? 0,
    geometryIssueRows: geometryIssueRows.length,
    sourceReferencePolicy: DAEGU_SEATMAP_SOURCE_REFERENCES.map((source) => ({
      id: source.id,
      kind: source.kind,
      polygonStatus: source.polygonStatus,
      productionCanonical: source.productionCanonical,
    })),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    status,
    policy: {
      purpose: 'Read-only Daegu canonical source decision table before single-source consolidation.',
      overlapDefault: OPERATOR_SOURCE_ID,
      officialOnlyDefault: OFFICIAL_SOURCE_ID,
      operatorOnlyDefault: OPERATOR_SOURCE_ID,
      markerRowsAreNotSeatPolygons: true,
      unconfirmedRowsAreBlocked: true,
      myseatcheckReferenceOnly: true,
      generatedReportsAreEvidenceOnly: true,
    },
    summary,
    rows,
  };

  const csvHeaders = [
    'sectionId',
    'blockLabels',
    'names',
    'categories',
    'decisionStatus',
    'recommendedCanonicalSourceId',
    'officialActivePolygonPresent',
    'operatorActivePolygonPresent',
    'markerOrFacilityPresent',
    'officialUnconfirmedPresent',
    'reason',
    'requiredNextAction',
    'geometryIssues',
  ];
  const csv = [
    csvHeaders.join(','),
    ...rows.map((row) => [
      row.sectionId,
      row.blockLabels.join('|'),
      row.names.join('|'),
      row.categories.join('|'),
      row.decisionStatus,
      row.recommendedCanonicalSourceId ?? '',
      row.officialActivePolygonPresent,
      row.operatorActivePolygonPresent,
      row.markerOrFacilityPresent,
      row.officialUnconfirmedPresent,
      row.reason,
      row.requiredNextAction,
      row.geometryIssues.join('|'),
    ].map(csvEscape).join(',')),
  ].join('\n');

  const markdown = [
    '# Daegu Canonical Decision Table',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- version: \`${AUDIT_VERSION}\``,
    `- status: \`${status}\``,
    `- total decision rows: \`${summary.totalDecisionRows}\``,
    `- canonical ready rows: \`${summary.canonicalReadyRows}\``,
    `- official-only review rows: \`${summary.officialOnlyReviewRows}\``,
    `- operator-only review rows: \`${summary.operatorOnlyReviewRows}\``,
    `- marker/alias review rows: \`${summary.markerOrAliasReviewRows}\``,
    `- blocked unconfirmed rows: \`${summary.blockedUnconfirmedRows}\``,
    `- geometry issue rows: \`${summary.geometryIssueRows}\``,
    '',
    '## Decision Counts',
    '',
    markdownTable(
      ['decisionStatus', 'count'],
      Object.entries(decisionCounts).map(([decisionStatus, count]) => [decisionStatus, count]),
    ),
    '',
    '## Recommended Canonical Sources',
    '',
    markdownTable(
      ['source', 'count'],
      Object.entries(recommendedSourceCounts).map(([source, count]) => [source, count]),
    ),
    '',
    '## Decision Rows',
    '',
    markdownTable(
      ['sectionId', 'block', 'decision', 'recommendedSource', 'officialActive', 'operatorActive', 'reason', 'nextAction'],
      rows.map((row) => [
        row.sectionId,
        row.blockLabels.join(', '),
        row.decisionStatus,
        row.recommendedCanonicalSourceId ?? 'none',
        row.officialActivePolygonPresent,
        row.operatorActivePolygonPresent,
        row.reason,
        row.requiredNextAction,
      ]),
    ),
    '',
    '## Policy',
    '',
    '- This script does not edit production data.',
    '- Generated files under `reports/stadium/daegu-seatmap-canonical-decision-table.*` are QA evidence only.',
    '- `CANONICAL_READY` overlap rows recommend operator-reference polygons and mark official PNG coordinates as historical evidence.',
    '- `OFFICIAL_ONLY_REVIEW` rows require an explicit decision to keep official PNG polygons or retrace/approve operator-reference polygons.',
    '- `OPERATOR_ONLY_REVIEW` rows require metadata/label ownership review before canonical promotion.',
    '- `BLOCKED_UNCONFIRMED` rows stay out of selectable canonical data until independent seat component evidence is approved.',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_FILES.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.csv, `${csv}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.markdown, `${markdown}\n`, 'utf8');

  console.log(`status:${status} total=${summary.totalDecisionRows} canonical_ready=${summary.canonicalReadyRows} official_only_review=${summary.officialOnlyReviewRows} operator_only_review=${summary.operatorOnlyReviewRows} marker_review=${summary.markerOrAliasReviewRows} blocked_unconfirmed=${summary.blockedUnconfirmedRows} geometry_issues=${summary.geometryIssueRows}`);
  console.log(`report:${OUTPUT_FILES.json}`);

  if (status === 'failed') {
    process.exitCode = 1;
  }
};

await main();
