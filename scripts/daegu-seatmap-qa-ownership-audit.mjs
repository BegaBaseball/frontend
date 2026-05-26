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

const AUDIT_VERSION = 'DAEGU_QA_OWNERSHIP_AUDIT_V1';
const OFFICIAL_SOURCE_ID = 'SAMSUNG_OFFICIAL_2026';
const OPERATOR_SOURCE_ID = 'OPERATOR_REFERENCE_RAPAK_2025';

const SOURCE_VALIDATION_OWNERS = {
  [OFFICIAL_SOURCE_ID]: {
    ownerId: 'OFFICIAL_PNG_RELEASE_VALIDATION',
    commands: [
      'stadium:daegu:precision-audit',
      'stadium:daegu:render-safety-audit',
      'qa:stadium:daegu:release-lock',
    ],
  },
  [OPERATOR_SOURCE_ID]: {
    ownerId: 'OPERATOR_REFERENCE_RELEASE_VALIDATION',
    commands: [
      'stadium:daegu:operator-reference-p34-visual-match-audit',
      'stadium:daegu:operator-reference-p35-review-lock-audit',
      'stadium:daegu:operator-reference-p40-release-lock-preflight',
    ],
  },
};

const GLOBAL_VALIDATION_OWNER_COMMANDS = [
  'stadium:daegu:source-baseline-audit',
  'stadium:daegu:canonical-decision-table',
  'stadium:daegu:qa-ownership-audit',
  'qa:stadium:daegu:mobile',
  'qa:stadium:daegu:full',
];

const OPERATOR_PHASE_COMMANDS = {
  P0: ['stadium:daegu:operator-reference-p0-approval-gate'],
  P1: ['stadium:daegu:operator-reference-p1-approval-gate'],
  P2A: ['stadium:daegu:operator-reference-p2a-approval-gate'],
  P2B: ['stadium:daegu:operator-reference-p2b-approval-gate'],
  P2C: ['stadium:daegu:operator-reference-p2c-approval-gate'],
  P3: ['stadium:daegu:operator-reference-p3-approval-gate'],
  P4: ['stadium:daegu:operator-reference-p4-approval-gate'],
  P5: ['stadium:daegu:operator-reference-p5-approval-gate'],
  P6: ['stadium:daegu:operator-reference-p6-approval-gate'],
  P7: ['stadium:daegu:operator-reference-p7-approval-gate'],
  P28: [
    'stadium:daegu:operator-reference-p28-source-patch-preview',
    'stadium:daegu:operator-reference-p29-source-postwrite',
  ],
  P30: ['stadium:daegu:operator-reference-p30-special-zone-postwrite'],
  P31_FIRST_BASE: ['stadium:daegu:operator-reference-p31-sky-first-base-postwrite'],
  P31_CENTER: ['stadium:daegu:operator-reference-p31-sky-center-postwrite'],
  P31_THIRD_BASE: ['stadium:daegu:operator-reference-p31-sky-third-base-postwrite'],
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

const classifyPackageScript = (scriptName, command) => {
  if (!scriptName.startsWith('stadium:daegu:') && !scriptName.startsWith('qa:stadium:daegu:')) {
    return 'outside-daegu';
  }
  if (GLOBAL_VALIDATION_OWNER_COMMANDS.includes(scriptName)) return 'global-validation';
  if (/packet|handoff|template|workset|candidate|guide|board|fixture|preview|dry-run|input|seed/i.test(scriptName)) {
    return 'historical-evidence';
  }
  if (/source-apply|source-copy|postwrite|write|approved-apply|prewrite|apply-plan/i.test(scriptName)) {
    return 'active-tracing';
  }
  if (/audit|gate|release-lock|preflight|validate|readiness|smoke|status/i.test(scriptName) || /--require/i.test(command)) {
    return 'active-validation';
  }
  return 'historical-evidence';
};

const traceOwnerForRow = (row) => {
  const traceVersion = row.block.imageGeometry.traceVersion
    ?? row.block.imageGeometry.geometryVersion
    ?? 'UNKNOWN_TRACE_VERSION';

  if (row.sourceId === OPERATOR_SOURCE_ID) {
    if (traceVersion.includes('P31_SKY_FIRST_BASE')) {
      return {
        ownerId: 'OPERATOR_REFERENCE_P31_FIRST_BASE_TRACE',
        traceVersion,
        commands: OPERATOR_PHASE_COMMANDS.P31_FIRST_BASE,
      };
    }
    if (traceVersion.includes('P31_SKY_CENTER')) {
      return {
        ownerId: 'OPERATOR_REFERENCE_P31_CENTER_TRACE',
        traceVersion,
        commands: OPERATOR_PHASE_COMMANDS.P31_CENTER,
      };
    }
    if (traceVersion.includes('P31_SKY_THIRD_BASE')) {
      return {
        ownerId: 'OPERATOR_REFERENCE_P31_THIRD_BASE_TRACE',
        traceVersion,
        commands: OPERATOR_PHASE_COMMANDS.P31_THIRD_BASE,
      };
    }

    const phase = traceVersion.match(/DAEGU_OPERATOR_REFERENCE_(P\d+[A-Z]?)/)?.[1] ?? 'UNKNOWN';
    return {
      ownerId: `OPERATOR_REFERENCE_${phase}_TRACE`,
      traceVersion,
      commands: OPERATOR_PHASE_COMMANDS[phase] ?? ['stadium:daegu:operator-reference-trace'],
    };
  }

  if (traceVersion.startsWith('daegu-visual-match')) {
    return {
      ownerId: 'OFFICIAL_VISUAL_MATCH_TRACE',
      traceVersion,
      commands: ['stadium:daegu:visual-match-audit', 'stadium:daegu:visual-match-workset'],
    };
  }
  if (traceVersion.startsWith('daegu-missing-block')) {
    return {
      ownerId: 'OFFICIAL_MISSING_BLOCK_TRACE',
      traceVersion,
      commands: ['stadium:daegu:missing-block-discovery', 'stadium:daegu:missing-block-p0-readiness-gate'],
    };
  }
  if (traceVersion.startsWith('daegu-p1')) {
    return {
      ownerId: 'OFFICIAL_P1_OPERATOR_TRACE',
      traceVersion,
      commands: ['stadium:daegu:p1-operator-prewrite-gate', 'stadium:daegu:p1-boundary-first-postwrite-gate'],
    };
  }

  return {
    ownerId: 'OFFICIAL_MANUAL_POLYGON_TRACE',
    traceVersion,
    commands: ['stadium:daegu:precision-audit'],
  };
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
    DAEGU_BLOCKS,
    DAEGU_OPERATOR_REFERENCE_BLOCKS,
    isDaeguNormalSelectableSeat,
    isDaeguOfficialUnconfirmedSeat,
  } = await import('../src/data/daeguSeatData.ts');

  await fs.mkdir(reportDir, { recursive: true });

  const scriptInventory = await summarizeScriptInventory();
  const generatedDaeguReports = await listGeneratedDaeguReports();
  const dataRows = [
    ...DAEGU_BLOCKS.map((block) => ({
      sourceId: OFFICIAL_SOURCE_ID,
      sourceRole: 'official-png-production-candidate',
      block,
    })),
    ...DAEGU_OPERATOR_REFERENCE_BLOCKS.map((block) => ({
      sourceId: OPERATOR_SOURCE_ID,
      sourceRole: 'operator-reference-approved-candidate',
      block,
    })),
  ].map((row) => ({
    ...row,
    sectionId: row.block.id,
    blockLabel: row.block.block,
    blockKey: normalizeBlockKey(row.block.block),
    selectable: isDaeguNormalSelectableSeat(row.block),
    markerOrAlias: row.block.sectionKind !== 'SEAT_SECTION',
    blockedUnconfirmed: isDaeguOfficialUnconfirmedSeat(row.block),
  }));

  const rows = [...groupBy(dataRows, (row) => row.blockKey).entries()]
    .map(([blockKey, groupRows]) => {
      const activeRows = groupRows.filter((row) => row.selectable);
      const markerRows = groupRows.filter((row) => row.markerOrAlias);
      const unconfirmedRows = groupRows.filter((row) => row.blockedUnconfirmed);
      const activeRuntimeSources = uniqueSorted(activeRows.map((row) => row.sourceId));
      const activeValidationOwners = activeRows.map((row) => SOURCE_VALIDATION_OWNERS[row.sourceId])
        .filter(Boolean);
      const activeTracingOwners = activeRows.map(traceOwnerForRow);
      const validationOwnerIds = uniqueSorted(activeValidationOwners.map((owner) => owner.ownerId));
      const tracingOwnerIds = uniqueSorted(activeTracingOwners.map((owner) => owner.ownerId));
      const flags = [];

      if (validationOwnerIds.length > 1) flags.push('MULTIPLE_ACTIVE_QA_OWNERS_FOR_BLOCK');
      if (tracingOwnerIds.length > 1) flags.push('MULTIPLE_ACTIVE_TRACING_WORKFLOWS_FOR_BLOCK');
      if (activeRuntimeSources.length > 1) flags.push('ACTIVE_POLYGON_SOURCE_OVERLAP');
      if (markerRows.length > 0 && activeRows.length > 0) flags.push('MARKER_IN_SEAT_QA');
      if (unconfirmedRows.length > 0 && activeRows.length > 0) flags.push('UNCONFIRMED_BLOCK_HAS_SELECTABLE_TRACE');

      return {
        blockKey,
        blockLabels: uniqueSorted(groupRows.map((row) => row.blockLabel)),
        sectionIds: uniqueSorted(groupRows.map((row) => row.sectionId)),
        names: uniqueSorted(groupRows.map((row) => row.block.name)),
        categories: uniqueSorted(groupRows.map((row) => row.block.category)),
        sectionKinds: uniqueSorted(groupRows.map((row) => row.block.sectionKind)),
        activeRuntimeSources,
        activeValidationOwners: validationOwnerIds,
        activeValidationCommands: uniqueSorted(activeValidationOwners.flatMap((owner) => owner.commands)),
        activeTracingOwners: tracingOwnerIds,
        activeTracingCommands: uniqueSorted(activeTracingOwners.flatMap((owner) => owner.commands)),
        traceVersions: uniqueSorted(activeTracingOwners.map((owner) => owner.traceVersion)),
        historicalEvidenceOwners: uniqueSorted([
          ...GLOBAL_VALIDATION_OWNER_COMMANDS,
          `reports/stadium/daegu-* evidence-only files (${generatedDaeguReports.length})`,
        ]),
        selectableRowCount: activeRows.length,
        markerOrAlias: markerRows.length > 0,
        blockedUnconfirmed: unconfirmedRows.length > 0,
        flags,
      };
    })
    .sort((a, b) => a.blockKey.localeCompare(b.blockKey));

  const rowsWithFlags = rows.filter((row) => row.flags.length > 0);
  const flagCounts = Object.fromEntries(
    [...groupBy(rowsWithFlags.flatMap((row) => row.flags), (flag) => flag).entries()]
      .map(([flag, flagRows]) => [flag, flagRows.length])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  );
  const status = rowsWithFlags.length > 0 ? 'review-required' : 'passed';

  const summary = {
    status,
    totalBlockKeys: rows.length,
    selectableBlockKeys: rows.filter((row) => row.selectableRowCount > 0).length,
    activeRuntimeSourceOverlapBlockKeys: flagCounts.ACTIVE_POLYGON_SOURCE_OVERLAP ?? 0,
    activeValidationOwnerConflictBlockKeys: flagCounts.MULTIPLE_ACTIVE_QA_OWNERS_FOR_BLOCK ?? 0,
    activeTracingOwnerConflictBlockKeys: flagCounts.MULTIPLE_ACTIVE_TRACING_WORKFLOWS_FOR_BLOCK ?? 0,
    markerInSeatQaBlockKeys: flagCounts.MARKER_IN_SEAT_QA ?? 0,
    unconfirmedSelectableTraceBlockKeys: flagCounts.UNCONFIRMED_BLOCK_HAS_SELECTABLE_TRACE ?? 0,
    rowsWithFlags: rowsWithFlags.length,
    globalValidationOwnerCommands: GLOBAL_VALIDATION_OWNER_COMMANDS,
    packageScriptTierCounts: scriptInventory.packageScriptTierCounts,
    generatedDaeguReportEvidenceCount: generatedDaeguReports.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    status,
    policy: {
      purpose: 'Read-only Daegu block-level QA and polygon tracing ownership audit.',
      blockKeyNormalization: 'Uppercase block label with whitespace, hyphen, and accessibility marker suffixes removed.',
      activeRuntimeSourceMeansSelectableDataRow: true,
      globalValidationOwnersAreNotBlockOwners: true,
      generatedReportsAreEvidenceOnly: true,
      reportFilesMustNotBeStaged: true,
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
    'activeRuntimeSources',
    'activeValidationOwners',
    'activeTracingOwners',
    'selectableRowCount',
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
      row.activeRuntimeSources,
      row.activeValidationOwners,
      row.activeTracingOwners,
      row.selectableRowCount,
      row.markerOrAlias,
      row.blockedUnconfirmed,
      row.flags,
    ].map(csvEscape).join(',')),
  ].join('\n');

  const conflictRows = rowsWithFlags.map((row) => [
    row.blockKey,
    row.blockLabels.join(', '),
    row.activeRuntimeSources.join(', ') || 'none',
    row.activeValidationOwners.join(', ') || 'none',
    row.activeTracingOwners.join(', ') || 'none',
    row.flags.join(', '),
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
    `- generated Daegu report evidence files: \`${summary.generatedDaeguReportEvidenceCount}\``,
    '',
    '## Flag Counts',
    '',
    markdownTable(
      ['flag', 'count'],
      Object.entries(flagCounts).map(([flag, count]) => [flag, count]),
    ),
    '',
    '## Package Script Ownership Tiers',
    '',
    markdownTable(
      ['tier', 'count'],
      Object.entries(scriptInventory.packageScriptTierCounts).map(([tier, count]) => [tier, count]),
    ),
    '',
    '## Rows Requiring Review',
    '',
    conflictRows.length > 0
      ? markdownTable(
        ['blockKey', 'labels', 'activeSources', 'validationOwners', 'tracingOwners', 'flags'],
        conflictRows,
      )
      : 'No block-level ownership conflicts were found.',
    '',
    '## Policy',
    '',
    '- Global smoke/audit commands are historical evidence for this ownership audit and are not counted as block owners.',
    '- Generated files under `reports/stadium/daegu-seatmap-qa-ownership-audit.*` are QA evidence only.',
    '- `reports/stadium/daegu-*` files must not be staged as PR payload.',
    '- A block with official and operator selectable polygons is review-required until a single canonical polygon owner is chosen.',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_FILES.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.csv, `${csv}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.markdown, `${markdown}\n`, 'utf8');

  console.log(`status:${status} block_keys=${summary.totalBlockKeys} active_source_overlaps=${summary.activeRuntimeSourceOverlapBlockKeys} active_qa_owner_conflicts=${summary.activeValidationOwnerConflictBlockKeys} active_tracing_conflicts=${summary.activeTracingOwnerConflictBlockKeys} marker_in_seat_qa=${summary.markerInSeatQaBlockKeys} unconfirmed_selectable_trace=${summary.unconfirmedSelectableTraceBlockKeys}`);
  console.log(`report:${OUTPUT_FILES.json}`);
};

await main();
