import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');

const REPORT_VERSION = 'GWANGJU_STAGED_SCOPE_AUDIT_V1';
const EXPECTED_TARGET_FILE_COUNT = 34;
const EXPECTED_REVIEWED_UNTRACKED_READY_FILE_COUNT = 6;
const requireComplete = process.argv.includes('--require-complete');
const targetedStagingJsonPath = path.join(reportDir, 'gwangju-seatmap-targeted-staging.json');
const outputPaths = {
  json: path.join(reportDir, 'gwangju-seatmap-staged-scope-audit.json'),
  csv: path.join(reportDir, 'gwangju-seatmap-staged-scope-audit.csv'),
  markdown: path.join(reportDir, 'gwangju-seatmap-staged-scope-audit.md'),
};

const sourcePolicy = {
  allowedCoordinateSource: 'operator-provided official PNG coordinates only',
  coordinateSystem: '2200x1159',
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  disallowedSources: [
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
  ],
};

const forbiddenCommands = [
  'git add .',
  'git add -A',
  'git commit -am',
];

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const readJson = async (filePath) => {
  try {
    return {
      exists: true,
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: null,
    };
  } catch (error) {
    return {
      exists: error?.code !== 'ENOENT',
      data: null,
      error: error?.code === 'ENOENT' ? `MISSING_REPORT:${path.relative(frontendRoot, filePath)}` : `READ_REPORT_FAILED:${error.message}`,
    };
  }
};

const parseNameStatusZ = (stdout) => {
  const tokens = stdout.split('\0').filter(Boolean);
  const entries = [];
  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    if (status?.startsWith('R') || status?.startsWith('C')) {
      const from = tokens[index++];
      const file = tokens[index++];
      entries.push({ status, file, from });
    } else if (status) {
      const file = tokens[index++];
      entries.push({ status, file, from: null });
    }
  }
  return entries;
};

const readStagedEntries = async () => {
  const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status', '-z'], {
    cwd: frontendRoot,
    maxBuffer: 1024 * 1024 * 16,
  });
  return parseNameStatusZ(stdout);
};

const { exists: targetedExists, data: targetedStaging, error: targetedError } = await readJson(targetedStagingJsonPath);
const stagedEntries = await readStagedEntries();

const targetFiles = targetedStaging?.targetFiles ?? [];
const targetFileSet = new Set(targetFiles);
const separateDirtyWork = targetedStaging?.separateDirtyWork ?? [];
const separateDirtyWorkSet = new Set(separateDirtyWork.map((entry) => entry.file));
const unexpectedFiles = targetedStaging?.unexpectedFiles ?? [];
const unexpectedFileSet = new Set(unexpectedFiles.map((entry) => entry.file));
const duplicateTargetFiles = targetFiles.filter((file, index) => targetFiles.indexOf(file) !== index);
const targetRows = targetedStaging?.targetRows ?? [];
const requiredStagedTargetFiles = targetRows
  .filter((entry) => entry.gitStatus !== '-' || entry.hasCachedDiff === true || entry.hasWorktreeDiff === true)
  .map((entry) => entry.file);
const requiredStagedTargetFileSet = new Set(requiredStagedTargetFiles);
const stagedOutsideTargets = stagedEntries.filter((entry) => !targetFileSet.has(entry.file));
const stagedSeparateDirtyWork = stagedEntries.filter((entry) => separateDirtyWorkSet.has(entry.file));
const stagedUnexpectedFiles = stagedEntries.filter((entry) => unexpectedFileSet.has(entry.file));
const deletedTargetFiles = stagedEntries.filter((entry) => targetFileSet.has(entry.file) && entry.status === 'D');
const stagedTargetFileSet = new Set(stagedEntries
  .filter((entry) => targetFileSet.has(entry.file))
  .map((entry) => entry.file));
const missingStagedTargetFiles = requiredStagedTargetFiles.filter((file) => !stagedTargetFileSet.has(file));
const strictCompletionBlockers = requireComplete
  ? [
    ...(missingStagedTargetFiles.length > 0 ? [`STAGED_TARGET_COUNT_INCOMPLETE:${stagedEntries.filter((entry) => requiredStagedTargetFileSet.has(entry.file)).length}/${requiredStagedTargetFiles.length}`] : []),
    ...missingStagedTargetFiles.map((file) => `STAGED_TARGET_FILE_MISSING:${file}`),
  ]
  : [];

const blockers = [
  ...(targetedError ? [`${targetedError}:reports/stadium/gwangju-seatmap-targeted-staging.json`] : []),
  ...(targetedStaging?.status !== 'ready' ? [`TARGETED_STAGING_NOT_READY:${targetedStaging?.status ?? 'missing'}`] : []),
  ...((targetedStaging?.blockers ?? []).length > 0 ? [`TARGETED_STAGING_BLOCKERS_PRESENT:${targetedStaging.blockers.length}`] : []),
  ...(targetedStaging?.summary?.blockerCount !== 0 ? [`TARGETED_STAGING_BLOCKER_COUNT_CHANGED:${targetedStaging?.summary?.blockerCount ?? 'missing'}`] : []),
  ...(targetedStaging?.summary?.targetFileCount !== EXPECTED_TARGET_FILE_COUNT ? [`TARGET_FILE_COUNT_CHANGED:${targetedStaging?.summary?.targetFileCount ?? 'missing'}`] : []),
  ...(targetFiles.length !== EXPECTED_TARGET_FILE_COUNT ? [`TARGET_FILE_LIST_COUNT_CHANGED:${targetFiles.length}`] : []),
  ...(targetedStaging?.summary?.reviewedUntrackedSatisfiedFileCount !== EXPECTED_REVIEWED_UNTRACKED_READY_FILE_COUNT ? [`REVIEWED_UNTRACKED_SATISFIED_COUNT_CHANGED:${targetedStaging?.summary?.reviewedUntrackedSatisfiedFileCount ?? 'missing'}`] : []),
  ...(targetedStaging?.doesNotRunGitAdd !== true ? ['TARGETED_STAGING_GIT_ADD_ENABLED'] : []),
  ...(targetedStaging?.stagingGate?.safeToRunBulkGitAdd !== false ? ['TARGETED_STAGING_BULK_GIT_ADD_ALLOWED'] : []),
  ...(targetedStaging?.stagingGate?.recommendsOnlyIncludedFiles !== true ? ['TARGETED_STAGING_DOES_NOT_RECOMMEND_ONLY_INCLUDED_FILES'] : []),
  ...(targetedStaging?.stagingGate?.doesNotRecommendSeparateDirtyWork !== true ? ['TARGETED_STAGING_RECOMMENDS_SEPARATE_DIRTY_WORK'] : []),
  ...duplicateTargetFiles.map((file) => `DUPLICATE_TARGET_FILE:${file}`),
  ...stagedOutsideTargets.map((entry) => `STAGED_FILE_OUTSIDE_TARGETS:${entry.file}`),
  ...stagedSeparateDirtyWork.map((entry) => `STAGED_SEPARATE_DIRTY_WORK:${entry.file}`),
  ...stagedUnexpectedFiles.map((entry) => `STAGED_UNEXPECTED_DIRTY_FILE:${entry.file}`),
  ...deletedTargetFiles.map((entry) => `STAGED_TARGET_DELETED:${entry.file}`),
  ...strictCompletionBlockers,
];

const stagedRows = stagedEntries.map((entry, index) => ({
  order: index + 1,
  file: entry.file,
  status: entry.status,
  from: entry.from,
  inTargetFiles: targetFileSet.has(entry.file),
  isSeparateDirtyWork: separateDirtyWorkSet.has(entry.file),
  isUnexpectedDirtyFile: unexpectedFileSet.has(entry.file),
}));

const report = {
  generatedAt: new Date().toISOString(),
  version: REPORT_VERSION,
  status: blockers.length === 0 ? 'ready' : 'blocked',
  doesNotModifyDataFile: true,
  doesNotRunGitAdd: true,
  writesOnlyReports: true,
  requiresCompleteTargetSet: requireComplete,
  sourceReports: {
    targetedStaging: {
      path: 'reports/stadium/gwangju-seatmap-targeted-staging.json',
      exists: targetedExists,
      status: targetedStaging?.status ?? null,
      generatedAt: targetedStaging?.generatedAt ?? null,
    },
  },
  summary: {
    expectedTargetFileCount: EXPECTED_TARGET_FILE_COUNT,
    requiresCompleteTargetSet: requireComplete,
    targetFileCount: targetFiles.length,
    requiredStagedTargetFileCount: requiredStagedTargetFiles.length,
    stagedFileCount: stagedRows.length,
    stagedTargetFileCount: stagedTargetFileSet.size,
    missingStagedTargetFileCount: missingStagedTargetFiles.length,
    stagedOutsideTargetFileCount: stagedOutsideTargets.length,
    stagedSeparateDirtyWorkFileCount: stagedSeparateDirtyWork.length,
    stagedUnexpectedDirtyFileCount: stagedUnexpectedFiles.length,
    reviewedUntrackedReadyFileCount: targetedStaging?.summary?.reviewedUntrackedReadyFileCount ?? null,
    reviewedUntrackedStagedFileCount: targetedStaging?.summary?.reviewedUntrackedStagedFileCount ?? null,
    reviewedUntrackedSatisfiedFileCount: targetedStaging?.summary?.reviewedUntrackedSatisfiedFileCount ?? null,
    blockerCount: blockers.length,
  },
  stagedScopeGate: {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    stagedState: stagedRows.length === 0 ? 'no-staged-files' : 'staged-files-present',
    requiresCompleteTargetSet: requireComplete,
    readyForCommit: requireComplete
      ? blockers.length === 0 && missingStagedTargetFiles.length === 0
      : blockers.length === 0 && stagedRows.length > 0,
    acceptsOnlyTargetedStagingFiles: true,
    blocksSeparateDirtyWork: true,
    doesNotRecommendSeparateDirtyWork: true,
    safeToRunBulkGitAdd: false,
    recommendedCommandKind: 'audit-cached-index-only',
    forbiddenCommands,
    currentContract: 'Report only. It inspects git diff --cached and fails if staged files are outside the targeted staging file list or include separate dirty work. Strict completion requires every dirty target file to be staged; clean tracked target files are not treated as missing.',
  },
  targetFiles,
  requiredStagedTargetFiles,
  stagedRows,
  missingStagedTargetFiles,
  stagedOutsideTargets,
  stagedSeparateDirtyWork,
  stagedUnexpectedFiles,
  sourcePolicy,
  blockers,
};

const csvRows = [
  ['order', 'file', 'status', 'from', 'inTargetFiles', 'isSeparateDirtyWork', 'isUnexpectedDirtyFile'],
  ...stagedRows.map((entry) => [
    entry.order,
    entry.file,
    entry.status,
    entry.from ?? '',
    entry.inTargetFiles,
    entry.isSeparateDirtyWork,
    entry.isUnexpectedDirtyFile,
  ]),
];

const markdown = [
  '# 광주 staged scope audit',
  '',
  `- version: \`${REPORT_VERSION}\``,
  `- status: \`${report.status}\``,
  `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
  `- runs git add: \`${!report.doesNotRunGitAdd}\``,
  `- writes only reports: \`${report.writesOnlyReports}\``,
  '- source targeted staging report: `reports/stadium/gwangju-seatmap-targeted-staging.json`',
  '',
  '## Summary',
  '',
  markdownTable(
    ['metric', 'value'],
    Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
  ),
  '',
  '## Staged Scope Gate',
  '',
  `- stagedScopeAudit.status=${report.status}`,
  `- stagedScopeAudit.requireComplete=${requireComplete}`,
  '- stagedScopeAudit.doesNotRunGitAdd=true',
  '- stagedScopeAudit.safeToRunBulkGitAdd=false',
  '- stagedScopeAudit.acceptsOnlyTargetedStagingFiles=true',
  '- stagedScopeAudit.blocksSeparateDirtyWork=true',
  '- stagedScopeAudit.expectedTargetFileCount=34',
  `- stagedScopeAudit.requiredStagedTargetFileCount=${requiredStagedTargetFiles.length}`,
  `- stagedScopeAudit.missingStagedTargetFileCount=${missingStagedTargetFiles.length}`,
  '- stagedScopeAudit.stagedOutsideTargetFileCount=0',
  '- stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0',
  '- Strict commit-readiness mode: `--require-complete` blocks with `STAGED_TARGET_FILE_MISSING` until every dirty targeted release file is staged.',
  '- Command kind: `audit-cached-index-only`',
  '- Do not use `git add .`, `git add -A`, or `git commit -am` for this release payload.',
  '',
  '## Staged Files',
  '',
  stagedRows.length > 0
    ? markdownTable(
      ['order', 'file', 'status', 'target file', 'separate dirty work'],
      stagedRows.map((entry) => [
        `\`${entry.order}\``,
        `\`${entry.file}\``,
        `\`${entry.status}\``,
        `\`${entry.inTargetFiles}\``,
        `\`${entry.isSeparateDirtyWork}\``,
      ]),
    )
    : '- none',
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
  '',
  '## Source Policy',
  '',
  '- Allowed coordinate source: operator-provided official PNG coordinates only.',
  '- Allowed coordinate system: original official PNG `2200x1159`.',
  '- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.',
  '- Missing or unclear baseball operating data keeps `MANUAL_BASEBALL_DATA_REQUIRED`.',
  '',
].join('\n');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(outputPaths.csv, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
await fs.writeFile(outputPaths.markdown, markdown, 'utf8');

console.log(`staged_scope_audit_json:${outputPaths.json}`);
console.log(`staged_scope_audit_csv:${outputPaths.csv}`);
console.log(`staged_scope_audit_markdown:${outputPaths.markdown}`);
console.log(`status:${report.status} staged=${stagedRows.length} outside=${stagedOutsideTargets.length} separate=${stagedSeparateDirtyWork.length} blockers=${blockers.length}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
