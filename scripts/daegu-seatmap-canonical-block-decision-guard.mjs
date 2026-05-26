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

const main = async () => {
  const {
    buildDaeguCanonicalBlockDecisionReport,
    DAEGU_CANONICAL_BLOCK_DECISION_GUARD_VERSION,
  } = await import('../src/data/daeguCanonicalBlockDecision.ts');

  await fs.mkdir(reportDir, { recursive: true });

  const report = buildDaeguCanonicalBlockDecisionReport();
  const { status, summary, decisions } = report;

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

  const reviewRows = decisions
    .filter((row) => row.flags.length > 0)
    .map((row) => [
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
    `- version: \`${DAEGU_CANONICAL_BLOCK_DECISION_GUARD_VERSION}\``,
    `- status: \`${status}\``,
    `- total block keys: \`${summary.totalBlockKeys}\``,
    `- active canonical selectable block keys: \`${summary.activeCanonicalSelectableBlockKeys}\``,
    `- pending operator trace block keys: \`${summary.pendingOperatorTraceBlockKeys}\``,
    `- target canonical selectable block keys: \`${summary.targetCanonicalSelectableBlockKeys}\``,
    `- operator overlap canonical block keys: \`${summary.operatorOverlapCanonicalBlockKeys}\``,
    `- official-only historical block keys pending operator trace: \`${summary.pendingOperatorTraceBlockKeys}\``,
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

  console.log(`status:${status} block_keys=${summary.totalBlockKeys} active_canonical_selectable=${summary.activeCanonicalSelectableBlockKeys} pending_operator_trace=${summary.pendingOperatorTraceBlockKeys} target_canonical_selectable=${summary.targetCanonicalSelectableBlockKeys} operator_overlap=${summary.operatorOverlapCanonicalBlockKeys} operator_only=${summary.operatorOnlyCanonicalBlockKeys} marker_alias_separation=${summary.markerAliasSeparationRequiredBlockKeys} blocked_unconfirmed=${summary.blockedUnconfirmedBlockKeys} geometry_issues=${summary.geometryIssueBlockKeys}`);
  console.log(`report:${OUTPUT_FILES.json}`);

  if (status === 'failed') {
    process.exitCode = 1;
  }
};

await main();
