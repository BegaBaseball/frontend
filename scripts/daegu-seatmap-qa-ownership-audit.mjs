import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');

const OUTPUT_FILES = {
  json: path.join(reportDir, 'daegu-seatmap-qa-ownership-audit.json'),
  csv: path.join(reportDir, 'daegu-seatmap-qa-ownership-audit.csv'),
  markdown: path.join(reportDir, 'daegu-seatmap-qa-ownership-audit.md'),
};

const AUDIT_VERSION = 'DAEGU_QA_OWNERSHIP_AUDIT_V2_CANONICAL';
const CANONICAL_SOURCE_ID = 'DAEGU_CANONICAL_2026';

const CANONICAL_VALIDATION_OWNER = {
  ownerId: 'DAEGU_CANONICAL_RELEASE_VALIDATION',
  commands: [
    'stadium:daegu:source-baseline-audit',
    'stadium:daegu:canonical-block-decision-guard',
    'stadium:daegu:qa-ownership-audit',
    'qa:stadium:daegu:mobile',
    'qa:stadium:daegu:full',
  ],
};

const CANONICAL_TRACING_OWNER = {
  ownerId: 'DAEGU_CANONICAL_OPERATOR_REFERENCE_TRACE',
  commands: [
    'stadium:daegu:canonical-official-only-retrace-workset',
  ],
};

const LEGACY_EVIDENCE_OWNER_COMMANDS = [
  'qa:stadium:daegu:release-lock',
  'stadium:daegu:precision-audit',
  'stadium:daegu:render-safety-audit',
  'stadium:daegu:source-baseline-audit',
  'stadium:daegu:canonical-decision-table',
  'stadium:daegu:canonical-block-decision-guard',
  'stadium:daegu:canonical-official-only-retrace-workset',
  'stadium:daegu:canonical-retrace-batch',
  'stadium:daegu:canonical-retrace-gate',
];

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

const classifyPackageScript = (scriptName, command) => {
  if (!scriptName.startsWith('stadium:daegu:') && !scriptName.startsWith('qa:stadium:daegu:')) {
    return 'outside-daegu';
  }
  if (CANONICAL_VALIDATION_OWNER.commands.includes(scriptName)) return 'canonical-validation';
  if (CANONICAL_TRACING_OWNER.commands.includes(scriptName)) return 'canonical-tracing';
  if (/packet|handoff|template|workset|candidate|guide|board|fixture|preview|dry-run|input|seed/i.test(scriptName)) {
    return 'historical-evidence';
  }
  if (/source-apply|source-copy|postwrite|write|approved-apply|prewrite|apply-plan/i.test(scriptName)) {
    return 'historical-evidence';
  }
  if (/audit|gate|release-lock|preflight|validate|readiness|smoke|status/i.test(scriptName) || /--require/i.test(command)) {
    return 'historical-evidence';
  }
  return 'historical-evidence';
};

const listGeneratedDaeguReports = async () => {
  const ownReportFiles = new Set(Object.values(OUTPUT_FILES).map((filePath) => path.basename(filePath)));
  try {
    const entries = await fs.readdir(reportDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.name.startsWith('daegu-'))
      .filter((entry) => !ownReportFiles.has(entry.name))
      .map((entry) => entry.isDirectory() ? `${entry.name}/` : entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

const summarizeScriptInventory = async () => {
  const packageSource = await fs.readFile(path.join(frontendRoot, 'package.json'), 'utf8');
  const packageJson = JSON.parse(packageSource);
  const daeguScripts = Object.entries(packageJson.scripts ?? {})
    .filter(([scriptName]) => scriptName.startsWith('stadium:daegu:') || scriptName.startsWith('qa:stadium:daegu:'))
    .map(([scriptName, command]) => ({
      scriptName,
      command,
      ownershipTier: classifyPackageScript(scriptName, command),
    }))
    .sort((a, b) => a.scriptName.localeCompare(b.scriptName));

  const tierCounts = Object.fromEntries(
    [...groupBy(daeguScripts, (script) => script.ownershipTier).entries()]
      .map(([tier, rows]) => [tier, rows.length])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  );

  const scriptFiles = (await fs.readdir(path.join(frontendRoot, 'scripts')))
    .filter((fileName) => fileName.startsWith('daegu-') && fileName.endsWith('.mjs'))
    .sort((a, b) => a.localeCompare(b));

  return {
    daeguPackageScriptCount: daeguScripts.length,
    daeguScriptFileCount: scriptFiles.length,
    packageScriptTierCounts: tierCounts,
    daeguScripts,
    scriptFiles,
  };
};

const main = async () => {
  const {
    DAEGU_CANONICAL_BLOCK_DECISIONS,
  } = await import('../src/data/daeguCanonicalBlockDecision.ts');
  const {
    DAEGU_CANONICAL_BLOCKS,
    DAEGU_CANONICAL_BLOCKED_UNCONFIRMED_BLOCKS,
    DAEGU_CANONICAL_MARKER_ALIASES,
    DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS,
    DAEGU_CANONICAL_SEATMAP_SUMMARY,
  } = await import('../src/data/daeguCanonicalSeatMap.ts');

  await fs.mkdir(reportDir, { recursive: true });

  const scriptInventory = await summarizeScriptInventory();
  const generatedDaeguReports = await listGeneratedDaeguReports();
  const canonicalBlockByKey = new Map(DAEGU_CANONICAL_BLOCKS.map((block) => [block.canonicalBlockKey, block]));
  const pendingByKey = new Map(DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.map((row) => [row.blockKey, row]));
  const markerAliasByKey = new Map(DAEGU_CANONICAL_MARKER_ALIASES.map((row) => [row.blockKey, row]));
  const blockedByKey = new Map(DAEGU_CANONICAL_BLOCKED_UNCONFIRMED_BLOCKS.map((row) => [row.blockKey, row]));

  const rows = DAEGU_CANONICAL_BLOCK_DECISIONS.map((decision) => {
    const canonicalBlock = canonicalBlockByKey.get(decision.blockKey);
    const pendingRow = pendingByKey.get(decision.blockKey);
    const markerAlias = markerAliasByKey.get(decision.blockKey);
    const blockedRow = blockedByKey.get(decision.blockKey);
    const activeRuntimeSources = canonicalBlock ? [CANONICAL_SOURCE_ID] : [];
    const activeValidationOwners = canonicalBlock ? [CANONICAL_VALIDATION_OWNER.ownerId] : [];
    const activeTracingOwners = canonicalBlock ? [CANONICAL_TRACING_OWNER.ownerId] : [];
    const flags = [];

    if (activeRuntimeSources.length > 1) flags.push('ACTIVE_POLYGON_SOURCE_OVERLAP');
    if (activeValidationOwners.length > 1) flags.push('MULTIPLE_ACTIVE_QA_OWNERS_FOR_BLOCK');
    if (activeTracingOwners.length > 1) flags.push('MULTIPLE_ACTIVE_TRACING_WORKFLOWS_FOR_BLOCK');
    if (markerAlias && canonicalBlock && canonicalBlock.sectionKind !== 'SEAT_SECTION') flags.push('MARKER_IN_SEAT_QA');
    if (blockedRow && canonicalBlock) flags.push('UNCONFIRMED_BLOCK_HAS_SELECTABLE_TRACE');

    return {
      blockKey: decision.blockKey,
      blockLabels: decision.blockLabels,
      sectionIds: decision.sectionIds,
      names: decision.names,
      categories: decision.categories,
      sectionKinds: decision.sectionKinds,
      canonicalDecisionStatus: decision.decisionStatus,
      activeRuntimeSources,
      activeValidationOwners,
      activeValidationCommands: canonicalBlock ? CANONICAL_VALIDATION_OWNER.commands : [],
      activeTracingOwners,
      activeTracingCommands: canonicalBlock ? CANONICAL_TRACING_OWNER.commands : [],
      historicalEvidenceOwners: uniqueSorted([
        ...LEGACY_EVIDENCE_OWNER_COMMANDS,
        `reports/stadium/daegu-* evidence-only files (${generatedDaeguReports.length})`,
      ]),
      selectableRowCount: canonicalBlock ? 1 : 0,
      pendingOperatorTrace: Boolean(pendingRow),
      markerOrAlias: Boolean(markerAlias),
      blockedUnconfirmed: Boolean(blockedRow),
      flags,
    };
  }).sort((a, b) => a.blockKey.localeCompare(b.blockKey));

  const rowsWithFlags = rows.filter((row) => row.flags.length > 0);
  const flagCounts = Object.fromEntries(
    [...groupBy(rowsWithFlags.flatMap((row) => row.flags), (flag) => flag).entries()]
      .map(([flag, flagRows]) => [flag, flagRows.length])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  );
  const status = rowsWithFlags.length > 0 ? 'failed' : 'passed';

  const summary = {
    status,
    totalBlockKeys: rows.length,
    selectableBlockKeys: rows.filter((row) => row.selectableRowCount > 0).length,
    activeRuntimeSourceOverlapBlockKeys: flagCounts.ACTIVE_POLYGON_SOURCE_OVERLAP ?? 0,
    activeValidationOwnerConflictBlockKeys: flagCounts.MULTIPLE_ACTIVE_QA_OWNERS_FOR_BLOCK ?? 0,
    activeTracingOwnerConflictBlockKeys: flagCounts.MULTIPLE_ACTIVE_TRACING_WORKFLOWS_FOR_BLOCK ?? 0,
    markerInSeatQaBlockKeys: flagCounts.MARKER_IN_SEAT_QA ?? 0,
    unconfirmedSelectableTraceBlockKeys: flagCounts.UNCONFIRMED_BLOCK_HAS_SELECTABLE_TRACE ?? 0,
    pendingOperatorTraceBlockKeys: rows.filter((row) => row.pendingOperatorTrace).length,
    markerAliasBlockKeys: rows.filter((row) => row.markerOrAlias).length,
    blockedUnconfirmedBlockKeys: rows.filter((row) => row.blockedUnconfirmed).length,
    activeCanonicalSelectableBlocks: DAEGU_CANONICAL_SEATMAP_SUMMARY.activeSelectableBlocks,
    targetCanonicalSelectableBlocks: DAEGU_CANONICAL_SEATMAP_SUMMARY.targetSelectableBlocks,
    rowsWithFlags: rowsWithFlags.length,
    canonicalValidationOwnerCommands: CANONICAL_VALIDATION_OWNER.commands,
    packageScriptTierCounts: scriptInventory.packageScriptTierCounts,
    generatedDaeguReportEvidenceCount: generatedDaeguReports.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    status,
    policy: {
      purpose: 'Read-only Daegu canonical block-level QA and polygon tracing ownership audit.',
      activeRuntimeSource: CANONICAL_SOURCE_ID,
      activeRuntimeSourceMeansSelectableCanonicalRow: true,
      activeValidationOwner: CANONICAL_VALIDATION_OWNER.ownerId,
      activeTracingOwner: CANONICAL_TRACING_OWNER.ownerId,
      historicalEvidenceOwner: LEGACY_EVIDENCE_OWNER_COMMANDS,
      globalValidationOwnersAreNotBlockOwners: true,
      generatedReportsAreEvidenceOnly: true,
      reportFilesMustNotBeStaged: true,
      blockedAndMarkerRowsAreClassifiedEvidence: true,
      forbiddenFlags: [
        'MULTIPLE_ACTIVE_QA_OWNERS_FOR_BLOCK',
        'MULTIPLE_ACTIVE_TRACING_WORKFLOWS_FOR_BLOCK',
        'ACTIVE_POLYGON_SOURCE_OVERLAP',
        'MARKER_IN_SEAT_QA',
        'UNCONFIRMED_BLOCK_HAS_SELECTABLE_TRACE',
      ],
    },
    summary,
    scriptInventory: {
      daeguPackageScriptCount: scriptInventory.daeguPackageScriptCount,
      daeguScriptFileCount: scriptInventory.daeguScriptFileCount,
      packageScriptTierCounts: scriptInventory.packageScriptTierCounts,
      generatedDaeguReports,
    },
    rows,
  };

  const csvHeaders = [
    'blockKey',
    'blockLabels',
    'sectionIds',
    'canonicalDecisionStatus',
    'activeRuntimeSources',
    'activeValidationOwners',
    'activeTracingOwners',
    'selectableRowCount',
    'pendingOperatorTrace',
    'markerOrAlias',
    'blockedUnconfirmed',
    'flags',
  ];
  const csv = [
    csvHeaders.join(','),
    ...rows.map((row) => [
      row.blockKey,
      row.blockLabels,
      row.sectionIds,
      row.canonicalDecisionStatus,
      row.activeRuntimeSources,
      row.activeValidationOwners,
      row.activeTracingOwners,
      row.selectableRowCount,
      row.pendingOperatorTrace,
      row.markerOrAlias,
      row.blockedUnconfirmed,
      row.flags,
    ].map(csvEscape).join(',')),
  ].join('\n');

  const classifiedRows = rows
    .filter((row) => row.pendingOperatorTrace || row.markerOrAlias || row.blockedUnconfirmed)
    .map((row) => [
      row.blockKey,
      row.blockLabels.join(', '),
      row.canonicalDecisionStatus,
      row.pendingOperatorTrace,
      row.markerOrAlias,
      row.blockedUnconfirmed,
    ]);

  const markdown = [
    '# Daegu QA Ownership Audit',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- version: \`${AUDIT_VERSION}\``,
    `- status: \`${status}\``,
    `- total block keys: \`${summary.totalBlockKeys}\``,
    `- selectable block keys: \`${summary.selectableBlockKeys}\``,
    `- active runtime source overlaps: \`${summary.activeRuntimeSourceOverlapBlockKeys}\``,
    `- active QA owner conflicts: \`${summary.activeValidationOwnerConflictBlockKeys}\``,
    `- active tracing owner conflicts: \`${summary.activeTracingOwnerConflictBlockKeys}\``,
    `- marker in seat QA rows: \`${summary.markerInSeatQaBlockKeys}\``,
    `- unconfirmed selectable trace rows: \`${summary.unconfirmedSelectableTraceBlockKeys}\``,
    `- pending operator trace block keys: \`${summary.pendingOperatorTraceBlockKeys}\``,
    `- generated Daegu report evidence files: \`${summary.generatedDaeguReportEvidenceCount}\``,
    '',
    '## Flag Counts',
    '',
    Object.entries(flagCounts).length > 0
      ? markdownTable(['flag', 'count'], Object.entries(flagCounts).map(([flag, count]) => [flag, count]))
      : 'none',
    '',
    '## Package Script Ownership Tiers',
    '',
    markdownTable(
      ['tier', 'count'],
      Object.entries(scriptInventory.packageScriptTierCounts).map(([tier, count]) => [tier, count]),
    ),
    '',
    '## Classified Evidence Rows',
    '',
    classifiedRows.length > 0
      ? markdownTable(
        ['blockKey', 'labels', 'decision', 'pendingTrace', 'markerAlias', 'blockedUnconfirmed'],
        classifiedRows,
      )
      : 'none',
    '',
    '## Policy',
    '',
    '- `DAEGU_CANONICAL_2026` is the only active runtime polygon source.',
    '- Deleted stage-specific operator-reference scripts are historical evidence after canonical consolidation and recoverable from Git history only.',
    '- Generated files under `reports/stadium/daegu-seatmap-qa-ownership-audit.*` are QA evidence only.',
    '- `reports/stadium/daegu-*` files must not be staged as PR payload.',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_FILES.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.csv, `${csv}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.markdown, `${markdown}\n`, 'utf8');

  console.log(`status:${status} block_keys=${summary.totalBlockKeys} active_source_overlaps=${summary.activeRuntimeSourceOverlapBlockKeys} active_qa_owner_conflicts=${summary.activeValidationOwnerConflictBlockKeys} active_tracing_conflicts=${summary.activeTracingOwnerConflictBlockKeys} marker_in_seat_qa=${summary.markerInSeatQaBlockKeys} unconfirmed_selectable_trace=${summary.unconfirmedSelectableTraceBlockKeys} pending_operator_trace=${summary.pendingOperatorTraceBlockKeys}`);
  console.log(`report:${OUTPUT_FILES.json}`);

  if (status === 'failed') {
    process.exitCode = 1;
  }
};

await main();
