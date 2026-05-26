import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium/daegu-seatmap-canonical-official-only-retrace-workset');

const OUTPUT_FILES = {
  json: path.join(reportDir, 'daegu-seatmap-canonical-official-only-retrace-workset.json'),
  csv: path.join(reportDir, 'daegu-seatmap-canonical-official-only-retrace-workset.csv'),
  markdown: path.join(reportDir, 'daegu-seatmap-canonical-official-only-retrace-workset.md'),
};

const WORKSET_VERSION = 'DAEGU_CANONICAL_OFFICIAL_ONLY_RETRACE_WORKSET_V1';

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

const countBy = (rows, getKey) => {
  const counts = new Map();
  rows.forEach((row) => {
    const key = getKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
};

const main = async () => {
  const {
    DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS,
    DAEGU_CANONICAL_SEATMAP_SUMMARY,
  } = await import('../src/data/daeguCanonicalSeatMap.ts');

  await fs.mkdir(reportDir, { recursive: true });

  const rows = DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.map((row, index) => ({
    queueOrder: index + 1,
    blockKey: row.blockKey,
    sourceBlockLabels: row.sourceBlockLabels,
    sourceSectionIds: row.sourceSectionIds,
    names: row.names,
    categories: row.categories,
    sourceCoordinateSystem: row.sourceCoordinateSystem,
    targetCoordinateSystem: row.targetCoordinateSystem,
    operatorDecision: 'PENDING',
    correctedPath: '',
    correctedHitPath: '',
    correctedLabelX: '',
    correctedLabelY: '',
    reviewer: '',
    reviewedAt: '',
    nextAction: row.nextAction,
  }));

  const summary = {
    status: rows.length === 58 && DAEGU_CANONICAL_SEATMAP_SUMMARY.activeSelectableBlocks === 130
      ? 'review-required'
      : 'failed',
    version: WORKSET_VERSION,
    activeCanonicalSelectableBlocks: DAEGU_CANONICAL_SEATMAP_SUMMARY.activeSelectableBlocks,
    pendingOperatorTraceBlocks: rows.length,
    targetCanonicalSelectableBlocks: DAEGU_CANONICAL_SEATMAP_SUMMARY.targetSelectableBlocks,
    sourceCoordinateSystem: 'SAMSUNG_OFFICIAL_2026_1707x2048',
    targetCoordinateSystem: 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096',
    simpleScaleOrCopyAllowed: false,
    sourceDataWritePerformed: false,
    generatedReportsAreEvidenceOnly: true,
    categoryCounts: countBy(rows, (row) => row.categories.join('|') || 'UNKNOWN'),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    version: WORKSET_VERSION,
    status: summary.status,
    policy: {
      purpose: 'Queue official-only Daegu blocks for direct retrace on the 4096 operator-reference canonical image.',
      officialPngCoordinatesAreHistoricalEvidenceOnly: true,
      simpleScaleOrCopyFromOfficialPngForbidden: true,
      approvalRequiredFields: ['operatorDecision=APPROVED', 'correctedPath', 'correctedHitPath', 'correctedLabelX', 'correctedLabelY', 'reviewer', 'reviewedAt'],
      sourceDataWritePerformed: false,
      generatedReportsAreEvidenceOnly: true,
    },
    summary,
    rows,
  };

  const csvHeaders = [
    'queueOrder',
    'blockKey',
    'sourceBlockLabels',
    'sourceSectionIds',
    'names',
    'categories',
    'sourceCoordinateSystem',
    'targetCoordinateSystem',
    'operatorDecision',
    'correctedPath',
    'correctedHitPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'nextAction',
  ];
  const csv = [
    csvHeaders.join(','),
    ...rows.map((row) => csvHeaders.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');

  const markdown = [
    '# Daegu Canonical Official-only Retrace Workset',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- version: \`${WORKSET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- active canonical selectable blocks: \`${summary.activeCanonicalSelectableBlocks}\``,
    `- pending operator trace blocks: \`${summary.pendingOperatorTraceBlocks}\``,
    `- target canonical selectable blocks: \`${summary.targetCanonicalSelectableBlocks}\``,
    `- source coordinate system: \`${summary.sourceCoordinateSystem}\``,
    `- target coordinate system: \`${summary.targetCoordinateSystem}\``,
    `- simple scale/copy allowed: \`${summary.simpleScaleOrCopyAllowed}\``,
    '',
    '## Category Counts',
    '',
    markdownTable(['category', 'count'], Object.entries(summary.categoryCounts).map(([category, count]) => [category, count])),
    '',
    '## Pending Rows',
    '',
    markdownTable(
      ['order', 'blockKey', 'labels', 'sectionIds', 'categories', 'nextAction'],
      rows.map((row) => [row.queueOrder, row.blockKey, row.sourceBlockLabels.join(', '), row.sourceSectionIds.join(', '), row.categories.join(', '), row.nextAction]),
    ),
    '',
    '## Policy',
    '',
    '- This workset does not edit production data.',
    '- Official PNG 1707x2048 coordinates are historical evidence only.',
    '- Every pending row must be directly traced and approved on the 4096 operator-reference image before canonical selectable promotion.',
    '- Generated files under `reports/stadium/daegu-seatmap-canonical-official-only-retrace-workset/` are QA evidence only.',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_FILES.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.csv, `${csv}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.markdown, `${markdown}\n`, 'utf8');

  console.log(`status:${summary.status} active_canonical_selectable=${summary.activeCanonicalSelectableBlocks} pending_operator_trace=${summary.pendingOperatorTraceBlocks} target_canonical_selectable=${summary.targetCanonicalSelectableBlocks} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  console.log(`report:${OUTPUT_FILES.json}`);

  if (summary.status === 'failed') {
    process.exitCode = 1;
  }
};

await main();
