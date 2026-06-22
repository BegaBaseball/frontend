import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const outputDir = path.join(repoRoot, 'output/playwright');
const archiveRoot = path.join(reportDir, '_archive/gwangju-legacy-candidates');

const AUDIT_VERSION = 'GWANGJU_ARTIFACT_SCOPE_AUDIT_V1';
const SHOULD_ARCHIVE = process.argv.includes('--archive');

const OUTPUT_FILES = {
  json: path.join(reportDir, 'gwangju-seatmap-artifact-scope-audit.json'),
  csv: path.join(reportDir, 'gwangju-seatmap-artifact-scope-audit.csv'),
  markdown: path.join(reportDir, 'gwangju-seatmap-artifact-scope-audit.md'),
};

const ARCHIVE_MANIFEST_FILES = {
  json: path.join(archiveRoot, 'archive-manifest.json'),
  csv: path.join(archiveRoot, 'archive-manifest.csv'),
  markdown: path.join(archiveRoot, 'archive-manifest.md'),
};

const SOURCE_POLICY = {
  coordinateSource: 'official image 2200x1159 only',
  runtimeSeatLayerSource: 'GWANGJU_BLOCKS[].imageGeometry.d/visualD',
  productionDataFile: 'src/data/gwangjuSeatData.ts',
  disallowedSources: [
    'browser CSS pixels as coordinate source',
    'resized screenshots as coordinate source',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
  ],
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
};

const FORBIDDEN_ACTIVE_ARTIFACT_PATTERNS = [
  { id: 'legacy-third-base-retrace', pattern: /gwangju-seatmap-third-base-retrace/i },
  { id: 'legacy-third-base-independent-audit', pattern: /gwangju-seatmap-third-base-independent-audit/i },
  { id: 'legacy-third-base-boundary-overlay', pattern: /gwangju-seatmap-third-base-boundary-overlay/i },
  { id: 'legacy-third-base-mask-probe', pattern: /gwangju-seatmap-third-base-mask-probe/i },
  { id: 'legacy-third-base-clean-grid', pattern: /gwangju-seatmap-third-base-clean-grid/i },
  { id: 'manual-official-retrace', pattern: /manual-official-retrace/i },
  { id: 'gwangju-proposed-overlay', pattern: /gwangju.*proposed/i },
];

const LEGACY_DELETED_BLOCK_IDS = [
  'k7-121',
  'k7-122',
  'k8-123',
  'k5-124',
  'k5-125',
  'k5-126',
  'k5-127',
  'third-wheelchair-seats',
  'party-seats-third',
];

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

const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const rel = (filePath) => {
  if (filePath.startsWith(frontendRoot)) return path.relative(frontendRoot, filePath);
  if (filePath.startsWith(repoRoot)) return path.relative(frontendRoot, filePath);
  return filePath;
};

const archiveRelativePath = (filePath) => {
  if (filePath.startsWith(frontendRoot)) return path.relative(frontendRoot, filePath);
  if (filePath.startsWith(outputDir)) return path.join('output/playwright', path.relative(outputDir, filePath));
  return path.basename(filePath);
};

const walkEntries = async (root, { skipArchive = true } = {}) => {
  const entries = [];
  const walk = async (dir) => {
    let dirEntries = [];
    try {
      dirEntries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }

    for (const entry of dirEntries) {
      const filePath = path.join(dir, entry.name);
      if (skipArchive && filePath.startsWith(archiveRoot)) continue;
      if (entry.isDirectory()) {
        entries.push({ path: filePath, type: 'directory' });
        await walk(filePath);
      } else if (entry.isFile()) {
        entries.push({ path: filePath, type: 'file' });
      }
    }
  };

  await walk(root);
  return entries;
};

const classifyArtifact = (filePath) => {
  const relativePath = rel(filePath);
  if (!relativePath.toLowerCase().includes('gwangju')) return [];
  return FORBIDDEN_ACTIVE_ARTIFACT_PATTERNS
    .filter(({ pattern }) => pattern.test(relativePath))
    .map(({ id }) => id);
};

const containsLegacyDeletedBlockId = async (entry) => {
  if (entry.type !== 'file') return [];
  if (!/\.(?:json|csv|md|txt|svg)$/i.test(entry.path)) return [];
  const relativePath = rel(entry.path);
  if (!relativePath.startsWith('reports/stadium/gwangju-seatmap-third-base')) return [];

  const text = await fs.readFile(entry.path, 'utf8');
  return LEGACY_DELETED_BLOCK_IDS.filter((blockId) => text.includes(blockId));
};

const collectForbiddenArtifacts = async () => {
  const entries = [
    ...(await walkEntries(reportDir)),
    ...(await walkEntries(outputDir)),
  ].sort((a, b) => a.path.localeCompare(b.path));

  const matches = [];
  for (const entry of entries) {
    const patternIds = classifyArtifact(entry.path);
    const legacyDeletedBlockIds = await containsLegacyDeletedBlockId(entry);
    if (patternIds.length === 0 && legacyDeletedBlockIds.length === 0) continue;

    matches.push({
      sourcePath: entry.path,
      relativePath: rel(entry.path),
      archiveRelativePath: archiveRelativePath(entry.path),
      type: entry.type,
      patternIds,
      legacyDeletedBlockIds,
      reasons: [
        ...patternIds.map((id) => `FORBIDDEN_ACTIVE_ARTIFACT_PATTERN:${id}`),
        ...legacyDeletedBlockIds.map((id) => `LEGACY_DELETED_BLOCK_ID_IN_ACTIVE_THIRD_BASE_ARTIFACT:${id}`),
      ],
    });
  }

  const sorted = matches.sort((a, b) => a.sourcePath.length - b.sourcePath.length || a.sourcePath.localeCompare(b.sourcePath));
  const selected = [];
  for (const match of sorted) {
    const coveredByDirectory = selected.some((selectedMatch) => (
      selectedMatch.type === 'directory' && match.sourcePath.startsWith(`${selectedMatch.sourcePath}${path.sep}`)
    ));
    if (!coveredByDirectory) selected.push(match);
  }

  return selected.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
};

const uniqueDestination = async (destinationPath) => {
  if (!(await exists(destinationPath))) return destinationPath;
  const parsed = path.parse(destinationPath);
  let suffix = 1;
  while (true) {
    const candidatePath = path.join(parsed.dir, `${parsed.name}-archived-${suffix}${parsed.ext}`);
    if (!(await exists(candidatePath))) return candidatePath;
    suffix += 1;
  }
};

const moveToArchive = async (artifact) => {
  const destinationPath = await uniqueDestination(path.join(archiveRoot, artifact.archiveRelativePath));
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.rename(artifact.sourcePath, destinationPath);
  return {
    ...artifact,
    archivedPath: rel(destinationPath),
    archivedAt: new Date().toISOString(),
  };
};

const listArchivedArtifacts = async () => {
  const entries = await walkEntries(archiveRoot, { skipArchive: false });
  return entries
    .filter((entry) => entry.type === 'file')
    .filter((entry) => rel(entry.path).startsWith('reports/stadium/_archive/gwangju-legacy-candidates/'))
    .map((entry) => ({
      path: rel(entry.path),
      patternIds: classifyArtifact(entry.path),
    }))
    .filter((entry) => entry.patternIds.length > 0 || LEGACY_DELETED_BLOCK_IDS.some((blockId) => entry.path.includes(blockId)))
    .sort((a, b) => a.path.localeCompare(b.path));
};

const writeArchiveManifest = async (movedArtifacts) => {
  await fs.mkdir(archiveRoot, { recursive: true });
  const archivedArtifacts = await listArchivedArtifacts();
  const manifest = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    archiveRoot: rel(archiveRoot),
    movedThisRunCount: movedArtifacts.length,
    archivedArtifactCount: archivedArtifacts.length,
    movedThisRun: movedArtifacts.map((artifact) => ({
      sourcePath: artifact.relativePath,
      archivedPath: artifact.archivedPath,
      type: artifact.type,
      reasons: artifact.reasons,
      archivedAt: artifact.archivedAt,
    })),
    archivedArtifacts,
  };

  await fs.writeFile(ARCHIVE_MANIFEST_FILES.json, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const csvRows = [
    ['sourcePath', 'archivedPath', 'type', 'reasons', 'archivedAt'],
    ...manifest.movedThisRun.map((artifact) => [
      artifact.sourcePath,
      artifact.archivedPath,
      artifact.type,
      artifact.reasons.join(';'),
      artifact.archivedAt,
    ]),
  ];
  await fs.writeFile(ARCHIVE_MANIFEST_FILES.csv, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');

  const markdown = [
    '# Gwangju Legacy Candidate Archive Manifest',
    '',
    `- generatedAt: \`${manifest.generatedAt}\``,
    `- version: \`${AUDIT_VERSION}\``,
    `- archive root: \`${manifest.archiveRoot}\``,
    `- moved this run: \`${manifest.movedThisRunCount}\``,
    `- archived artifact files: \`${manifest.archivedArtifactCount}\``,
    '',
    '## Moved This Run',
    '',
    manifest.movedThisRun.length > 0
      ? markdownTable(
        ['source', 'archive', 'type', 'reasons'],
        manifest.movedThisRun.map((artifact) => [
          artifact.sourcePath,
          artifact.archivedPath,
          artifact.type,
          artifact.reasons.join('<br>'),
        ]),
      )
      : 'none',
    '',
  ].join('\n');
  await fs.writeFile(ARCHIVE_MANIFEST_FILES.markdown, markdown, 'utf8');
};

const writeAuditReport = async ({ activeArtifacts, movedArtifacts }) => {
  await fs.mkdir(reportDir, { recursive: true });

  const blockers = activeArtifacts.map((artifact) => `ACTIVE_FORBIDDEN_GWANGJU_ARTIFACT:${artifact.relativePath}`);
  const report = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    status: blockers.length === 0 ? 'passed' : 'failed',
    archiveMode: SHOULD_ARCHIVE,
    sourcePolicy: SOURCE_POLICY,
    forbiddenActiveArtifactPatterns: FORBIDDEN_ACTIVE_ARTIFACT_PATTERNS.map(({ id, pattern }) => ({
      id,
      pattern: pattern.source,
    })),
    legacyDeletedBlockIds: LEGACY_DELETED_BLOCK_IDS,
    summary: {
      activeForbiddenArtifactCount: activeArtifacts.length,
      movedThisRunCount: movedArtifacts.length,
      blockers,
    },
    activeForbiddenArtifacts: activeArtifacts,
    movedThisRun: movedArtifacts,
    archiveManifest: rel(ARCHIVE_MANIFEST_FILES.json),
  };

  await fs.writeFile(OUTPUT_FILES.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const csvRows = [
    ['path', 'type', 'patternIds', 'legacyDeletedBlockIds', 'reasons'],
    ...activeArtifacts.map((artifact) => [
      artifact.relativePath,
      artifact.type,
      artifact.patternIds.join(';'),
      artifact.legacyDeletedBlockIds.join(';'),
      artifact.reasons.join(';'),
    ]),
  ];
  await fs.writeFile(OUTPUT_FILES.csv, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');

  const markdown = [
    '# Gwangju Artifact Scope Audit',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- version: \`${AUDIT_VERSION}\``,
    `- status: \`${report.status}\``,
    `- archive mode: \`${SHOULD_ARCHIVE}\``,
    `- active forbidden artifacts: \`${report.summary.activeForbiddenArtifactCount}\``,
    `- moved this run: \`${report.summary.movedThisRunCount}\``,
    `- coordinate source: \`${SOURCE_POLICY.coordinateSource}\``,
    `- runtime seat layer source: \`${SOURCE_POLICY.runtimeSeatLayerSource}\``,
    '',
    '## Active Forbidden Artifacts',
    '',
    activeArtifacts.length > 0
      ? markdownTable(
        ['path', 'type', 'patterns', 'legacy ids', 'reasons'],
        activeArtifacts.map((artifact) => [
          artifact.relativePath,
          artifact.type,
          artifact.patternIds.join('<br>') || '-',
          artifact.legacyDeletedBlockIds.join('<br>') || '-',
          artifact.reasons.join('<br>'),
        ]),
      )
      : 'none',
    '',
    '## Moved This Run',
    '',
    movedArtifacts.length > 0
      ? markdownTable(
        ['source', 'archive', 'type', 'reasons'],
        movedArtifacts.map((artifact) => [
          artifact.relativePath,
          artifact.archivedPath,
          artifact.type,
          artifact.reasons.join('<br>'),
        ]),
      )
      : 'none',
    '',
    '## Policy',
    '',
    '- Candidate/proposed/manual retrace overlays are not production release evidence.',
    '- Removed third-base legacy block ids must not remain in active third-base evidence.',
    '- Active runtime hit areas come only from `GWANGJU_BLOCKS[].imageGeometry.d/visualD`.',
    '',
  ].join('\n');
  await fs.writeFile(OUTPUT_FILES.markdown, markdown, 'utf8');

  console.log(`artifact_scope_audit_json:${OUTPUT_FILES.json}`);
  console.log(`artifact_scope_audit_csv:${OUTPUT_FILES.csv}`);
  console.log(`artifact_scope_audit_markdown:${OUTPUT_FILES.markdown}`);
  console.log(`status:${report.status} active_forbidden=${report.summary.activeForbiddenArtifactCount} moved=${report.summary.movedThisRunCount}`);

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const main = async () => {
  await fs.mkdir(reportDir, { recursive: true });

  const initialActiveArtifacts = await collectForbiddenArtifacts();
  const movedArtifacts = SHOULD_ARCHIVE
    ? await Promise.all(initialActiveArtifacts.map(moveToArchive))
    : [];

  if (movedArtifacts.length > 0 || SHOULD_ARCHIVE) {
    await writeArchiveManifest(movedArtifacts);
  } else if (!(await exists(ARCHIVE_MANIFEST_FILES.json))) {
    await writeArchiveManifest([]);
  }

  const activeArtifacts = await collectForbiddenArtifacts();
  await writeAuditReport({ activeArtifacts, movedArtifacts });
};

await main();
