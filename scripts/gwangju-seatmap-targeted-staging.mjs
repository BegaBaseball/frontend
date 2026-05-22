import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');

const REPORT_VERSION = 'GWANGJU_TARGETED_STAGING_V1';
const EXPECTED_RELEASE_PAYLOAD_FILE_COUNT = 34;
const EXPECTED_REVIEWED_UNTRACKED_FILES = [
  'scripts/gwangju-seatmap-image-alignment-audit.mjs',
  'scripts/gwangju-seatmap-browser-evidence.mjs',
  'scripts/gwangju-seatmap-evidence-inventory.mjs',
  'scripts/gwangju-seatmap-runtime-layer-audit.mjs',
  'scripts/gwangju-seatmap-targeted-staging.mjs',
  'scripts/gwangju-seatmap-staged-scope-audit.mjs',
];
const allowedReviewStatuses = new Set(['ready', 'review-required']);
const blockingReviewClasses = new Set(['untracked-review-required']);
const legacyReadyToStageDiagnosticNames = [
  'READY_TO_STAGE_COUNT_CHANGED',
  'READY_TO_STAGE_CLASS_COUNT_CHANGED',
];
const reviewJsonPath = path.join(reportDir, 'gwangju-seatmap-pr-staging-review.json');
const outputPaths = {
  json: path.join(reportDir, 'gwangju-seatmap-targeted-staging.json'),
  csv: path.join(reportDir, 'gwangju-seatmap-targeted-staging.csv'),
  markdown: path.join(reportDir, 'gwangju-seatmap-targeted-staging.md'),
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

const { exists: reviewExists, data: review, error: reviewError } = await readJson(reviewJsonPath);
const reviewFiles = review?.reviewFiles ?? [];
const separateDirtyWork = review?.separateDirtyWork ?? [];
const unexpectedFiles = review?.unexpectedFiles ?? [];
const readyFiles = reviewFiles.filter((entry) => entry.reviewClass === 'ready-to-stage');
const separateFileSet = new Set(separateDirtyWork.map((entry) => entry.file));
const targetFiles = reviewFiles.map((entry) => entry.file);
const targetFileSet = new Set(targetFiles);
const separateTargets = targetFiles.filter((file) => separateFileSet.has(file));
const duplicateTargets = targetFiles.filter((file, index) => targetFiles.indexOf(file) !== index);
const reviewedUntrackedReadyFiles = review?.reviewedUntrackedReadyFiles ?? [];
const reviewedUntrackedStagedFiles = EXPECTED_REVIEWED_UNTRACKED_FILES.filter((file) => {
  const entry = reviewFiles.find((row) => row.file === file);
  return entry?.hasCachedDiff === true;
});
const reviewedUntrackedSatisfiedFiles = [...new Set([
  ...reviewedUntrackedReadyFiles,
  ...reviewedUntrackedStagedFiles,
])].sort((left, right) => left.localeCompare(right));
const reviewClassCounts = review?.summary?.reviewClassCounts ?? {};
const blockingReviewRows = reviewFiles.filter((entry) => blockingReviewClasses.has(entry.reviewClass));
const manualReviewRows = reviewFiles.filter((entry) => entry.reviewClass === 'manual-hunk-review-required');
const generatedReportReviewRows = reviewFiles.filter((entry) => entry.reviewClass === 'generated-report-review-required');

const blockers = [
  ...(reviewError ? [`${reviewError}:reports/stadium/gwangju-seatmap-pr-staging-review.json`] : []),
  ...(!allowedReviewStatuses.has(review?.status) ? [`PR_STAGING_REVIEW_NOT_READY:${review?.status ?? 'missing'}`] : []),
  ...((review?.blockers ?? []).length > 0 ? [`PR_STAGING_REVIEW_BLOCKERS_PRESENT:${review.blockers.length}`] : []),
  ...(review?.summary?.blockerCount !== 0 ? [`PR_STAGING_REVIEW_BLOCKER_COUNT_CHANGED:${review?.summary?.blockerCount ?? 'missing'}`] : []),
  ...(review?.summary?.releasePayloadFileCount !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT ? [`RELEASE_PAYLOAD_COUNT_CHANGED:${review?.summary?.releasePayloadFileCount ?? 'missing'}`] : []),
  ...(reviewFiles.length !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT ? [`REVIEW_FILE_COUNT_CHANGED:${reviewFiles.length}`] : []),
  ...(targetFiles.length !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT ? [`TARGET_FILE_COUNT_CHANGED:${targetFiles.length}`] : []),
  ...blockingReviewRows.map((entry) => `BLOCKING_REVIEW_CLASS_PRESENT:${entry.file}:${entry.reviewClass}`),
  ...((review?.summary?.unexpectedDirtyFileCount ?? unexpectedFiles.length) !== 0 ? [`UNEXPECTED_DIRTY_FILES_PRESENT:${review?.summary?.unexpectedDirtyFileCount ?? unexpectedFiles.length}`] : []),
  ...(review?.doesNotRunGitAdd !== true ? ['STAGING_REVIEW_GIT_ADD_ENABLED'] : []),
  ...(review?.stagingGate?.safeToRunBulkGitAdd !== false ? ['STAGING_REVIEW_BULK_GIT_ADD_ALLOWED'] : []),
  ...(review?.stagingGate?.recommendsOnlyIncludedFiles !== true ? ['STAGING_REVIEW_DOES_NOT_RECOMMEND_ONLY_INCLUDED_FILES'] : []),
  ...(review?.stagingGate?.doesNotRecommendSeparateDirtyWork !== true ? ['STAGING_REVIEW_RECOMMENDS_SEPARATE_DIRTY_WORK'] : []),
  ...(reviewedUntrackedSatisfiedFiles.length !== EXPECTED_REVIEWED_UNTRACKED_FILES.length ? [`REVIEWED_UNTRACKED_SATISFIED_COUNT_CHANGED:${reviewedUntrackedSatisfiedFiles.length}`] : []),
  ...EXPECTED_REVIEWED_UNTRACKED_FILES
    .filter((file) => !reviewedUntrackedSatisfiedFiles.includes(file))
    .map((file) => `REVIEWED_UNTRACKED_SATISFIED_FILE_MISSING:${file}`),
  ...EXPECTED_REVIEWED_UNTRACKED_FILES
    .filter((file) => !targetFileSet.has(file))
    .map((file) => `TARGETED_STAGING_MISSING_REVIEWED_UNTRACKED_FILE:${file}`),
  ...separateTargets.map((file) => `SEPARATE_DIRTY_WORK_IN_TARGETS:${file}`),
  ...duplicateTargets.map((file) => `DUPLICATE_TARGET_FILE:${file}`),
];

const targetRows = reviewFiles.map((entry, index) => ({
  order: index + 1,
  file: entry.file,
  gitStatus: entry.gitStatus,
  reviewClass: entry.reviewClass,
  stagingAction: entry.stagingAction,
  hasCachedDiff: entry.hasCachedDiff,
  hasWorktreeDiff: entry.hasWorktreeDiff,
}));

const suggestedCommand = [
  'git',
  'add',
  '--',
  ...targetFiles,
];

const report = {
  generatedAt: new Date().toISOString(),
  version: REPORT_VERSION,
  status: blockers.length === 0 ? 'ready' : 'blocked',
  doesNotModifyDataFile: true,
  doesNotRunGitAdd: true,
  writesOnlyReports: true,
  sourceReports: {
    prStagingReview: {
      path: 'reports/stadium/gwangju-seatmap-pr-staging-review.json',
      exists: reviewExists,
      status: review?.status ?? null,
      generatedAt: review?.generatedAt ?? null,
    },
  },
  summary: {
    releasePayloadFileCount: review?.summary?.releasePayloadFileCount ?? null,
    targetFileCount: targetRows.length,
    separateDirtyWorkFileCount: separateDirtyWork.length,
    unexpectedDirtyFileCount: review?.summary?.unexpectedDirtyFileCount ?? unexpectedFiles.length,
    readyToStageCount: reviewClassCounts['ready-to-stage'] ?? 0,
    manualReviewRequiredTargetFileCount: manualReviewRows.length,
    generatedReportReviewTargetFileCount: generatedReportReviewRows.length,
    untrackedReviewRequiredCount: reviewClassCounts['untracked-review-required'] ?? 0,
    reviewedUntrackedReadyFileCount: reviewedUntrackedReadyFiles.length,
    reviewedUntrackedStagedFileCount: reviewedUntrackedStagedFiles.length,
    reviewedUntrackedSatisfiedFileCount: reviewedUntrackedSatisfiedFiles.length,
    blockerCount: blockers.length,
  },
  stagingGate: {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    safeToRunBulkGitAdd: false,
    recommendsOnlyIncludedFiles: true,
    doesNotRecommendSeparateDirtyWork: true,
    recommendedCommandKind: 'explicit-file-list-only',
    suggestedCommand,
    forbiddenCommands,
    currentContract: 'Report only. It never runs git add; when staging manually, use only the explicit targetFiles list and do not stage separate dirty work.',
  },
  targetFiles,
  targetRows,
  reviewedUntrackedReadyFiles,
  reviewedUntrackedStagedFiles,
  reviewedUntrackedSatisfiedFiles,
  manualReviewRows,
  generatedReportReviewRows,
  legacyReadyToStageDiagnosticNames,
  separateDirtyWork,
  unexpectedFiles,
  sourcePolicy,
  blockers,
};

const csvRows = [
  ['order', 'file', 'gitStatus', 'reviewClass', 'stagingAction', 'hasCachedDiff', 'hasWorktreeDiff'],
  ...targetRows.map((entry) => [
    entry.order,
    entry.file,
    entry.gitStatus,
    entry.reviewClass,
    entry.stagingAction,
    entry.hasCachedDiff,
    entry.hasWorktreeDiff,
  ]),
];

const markdown = [
  '# 광주 targeted staging report',
  '',
  `- version: \`${REPORT_VERSION}\``,
  `- status: \`${report.status}\``,
  `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
  `- runs git add: \`${!report.doesNotRunGitAdd}\``,
  `- writes only reports: \`${report.writesOnlyReports}\``,
  '- source review: `reports/stadium/gwangju-seatmap-pr-staging-review.json`',
  '',
  '## Summary',
  '',
  markdownTable(
    ['metric', 'value'],
    Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
  ),
  '',
  '## Staging Gate',
  '',
  '- targetedStaging.status=ready',
  '- targetedStaging.acceptsReviewRequiredPayload=true',
  '- targetedStaging.doesNotRunGitAdd=true',
  '- targetedStaging.safeToRunBulkGitAdd=false',
  '- targetedStaging.recommendsOnlyIncludedFiles=true',
  '- targetedStaging.doesNotRecommendSeparateDirtyWork=true',
  '- targetedStaging.releasePayloadFileCount=34',
  '- targetedStaging.targetFileCount=34',
  '- targetedStaging.reviewedUntrackedSatisfiedFileCount=6',
  '- New release scripts may be either reviewed untracked files before staging or staged added files after explicit staging.',
  '- Recommended command kind: `explicit-file-list-only`',
  '- Do not use `git add .`, `git add -A`, or `git commit -am` for this release payload.',
  '',
  '## Suggested Explicit Command',
  '',
  '```bash',
  suggestedCommand.join(' \\\n  '),
  '```',
  '',
  '## Target Files',
  '',
  markdownTable(
    ['order', 'file', 'git status', 'review class', 'staging action'],
    targetRows.map((entry) => [
      `\`${entry.order}\``,
      `\`${entry.file}\``,
      `\`${entry.gitStatus}\``,
      `\`${entry.reviewClass}\``,
      `\`${entry.stagingAction}\``,
    ]),
  ),
  '',
  '## Reviewed Untracked Ready Files',
  '',
  reviewedUntrackedReadyFiles.length > 0
    ? reviewedUntrackedReadyFiles.map((file) => `- \`${file}\``).join('\n')
    : '- none',
  '',
  '## Reviewed Untracked Satisfied Files',
  '',
  reviewedUntrackedSatisfiedFiles.length > 0
    ? reviewedUntrackedSatisfiedFiles.map((file) => `- \`${file}\``).join('\n')
    : '- none',
  '',
  '## Manual Review Target Files',
  '',
  manualReviewRows.length > 0
    ? markdownTable(
      ['file', 'git status', 'review class', 'staging action'],
      manualReviewRows.map((entry) => [
        `\`${entry.file}\``,
        `\`${entry.gitStatus}\``,
        `\`${entry.reviewClass}\``,
        `\`${entry.stagingAction}\``,
      ]),
    )
    : '- none',
  '',
  '## Separate Dirty Work Excluded',
  '',
  `- separate dirty work files: \`${separateDirtyWork.length}\``,
  '- separate dirty work is excluded from the suggested command.',
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

console.log(`targeted_staging_json:${outputPaths.json}`);
console.log(`targeted_staging_csv:${outputPaths.csv}`);
console.log(`targeted_staging_markdown:${outputPaths.markdown}`);
console.log(`status:${report.status} targets=${targetRows.length} separate=${separateDirtyWork.length} unexpected=${report.summary.unexpectedDirtyFileCount} blockers=${blockers.length}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
