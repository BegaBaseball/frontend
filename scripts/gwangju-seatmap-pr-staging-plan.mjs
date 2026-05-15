import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');

const PLAN_VERSION = 'GWANGJU_PR_STAGING_PLAN_V1';
const REVIEW_VERSION = 'GWANGJU_PR_STAGING_REVIEW_V1';
const jsonPath = path.join(reportDir, 'gwangju-seatmap-pr-staging-plan.json');
const markdownPath = path.join(reportDir, 'gwangju-seatmap-pr-staging-plan.md');
const reviewJsonPath = path.join(reportDir, 'gwangju-seatmap-pr-staging-review.json');
const reviewMarkdownPath = path.join(reportDir, 'gwangju-seatmap-pr-staging-review.md');
const scopeGuardPath = path.join(reportDir, 'gwangju-seatmap-release-scope-guard.json');
const prStagingPlanPath = jsonPath;
const EXPECTED_RELEASE_PAYLOAD_FILE_COUNT = 23;
const isReviewMode = process.argv.includes('--review');
const allowedPatchSeparationStatuses = new Set(['ready', 'review-required']);

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

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

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
      error: error?.code === 'ENOENT' ? 'MISSING_SCOPE_GUARD_REPORT' : `READ_SCOPE_GUARD_FAILED:${error.message}`,
    };
  }
};

const gitStatusRank = (status) => {
  if (!status || status === '-') return 0;
  if (status === '??') return 3;
  if (status && status[0] !== ' ' && status[1] !== ' ') return 2;
  if (status?.[1] !== ' ') return 1;
  return 0;
};

const uniqueByFile = (entries) => {
  const byFile = new Map();
  for (const entry of entries) {
    const current = byFile.get(entry.file);
    if (!current || gitStatusRank(entry.status) > gitStatusRank(current.status)) {
      byFile.set(entry.file, entry);
    }
  }
  return [...byFile.values()].sort((left, right) => left.file.localeCompare(right.file));
};

const runGit = async (args) => {
  const { stdout } = await execFileAsync('git', args, { cwd: frontendRoot, maxBuffer: 1024 * 1024 * 10 });
  return stdout.trim();
};

const splitLines = (value) => value
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const parseNumstat = (value) => splitLines(value).map((line) => {
  const [added, deleted, file] = line.split('\t');
  return {
    file,
    added: Number.isFinite(Number(added)) ? Number(added) : added,
    deleted: Number.isFinite(Number(deleted)) ? Number(deleted) : deleted,
  };
});

const readIncludedDiff = async (entry) => {
  const [cachedName, worktreeName, cachedNumstat, worktreeNumstat, cachedShortstat, worktreeShortstat] = await Promise.all([
    runGit(['diff', '--cached', '--name-only', '--', entry.file]),
    runGit(['diff', '--name-only', '--', entry.file]),
    runGit(['diff', '--cached', '--numstat', '--', entry.file]),
    runGit(['diff', '--numstat', '--', entry.file]),
    runGit(['diff', '--cached', '--shortstat', '--', entry.file]),
    runGit(['diff', '--shortstat', '--', entry.file]),
  ]);
  const hasCachedDiff = cachedName.length > 0 || cachedNumstat.length > 0;
  const hasWorktreeDiff = worktreeName.length > 0 || worktreeNumstat.length > 0;
  return {
    file: entry.file,
    status: entry.status,
    dirty: Boolean(entry.dirty),
    rule: entry.rule,
    hasCachedDiff,
    hasWorktreeDiff,
    cachedNumstat: parseNumstat(cachedNumstat),
    worktreeNumstat: parseNumstat(worktreeNumstat),
    cachedShortstat: cachedShortstat || null,
    worktreeShortstat: worktreeShortstat || null,
  };
};

const reviewClassFor = (entry, diff) => {
  if (!entry.dirty && !diff.hasCachedDiff && !diff.hasWorktreeDiff) return 'ready-to-stage';
  if (entry.file === 'reports/bundle-guard-report.json' || entry.file === 'reports/dist-assets-report.json') {
    return 'generated-report-review-required';
  }
  if (entry.status === '??') return 'untracked-review-required';
  if (entry.status && entry.status !== '-' && entry.status[0] !== ' ' && entry.status[1] !== ' ') return 'manual-hunk-review-required';
  if (diff.hasCachedDiff && diff.hasWorktreeDiff) return 'manual-hunk-review-required';
  return 'ready-to-stage';
};

const stagingActionFor = (entry, focusFiles) => {
  if (entry.status === '??') return 'manual-whole-file-review-before-git-add';
  if (entry.status && entry.status !== '-' && entry.status[0] !== ' ' && entry.status[1] !== ' ') return 'manual-hunk-review-before-staging';
  if (entry.status !== '-' && focusFiles.has(entry.file)) return 'manual-confirm-scope-before-staging';
  return 'stage-after-scope-confirmation';
};

const { exists, data: scopeGuard, error } = await readJson(scopeGuardPath);
const blockers = [];

if (error) blockers.push(`${error}:reports/stadium/gwangju-seatmap-release-scope-guard.json`);

const includedFiles = scopeGuard?.includedFiles ?? [];
const separateDirtyWork = scopeGuard?.separateDirtyWork ?? [];
const unexpectedFiles = scopeGuard?.unexpectedFiles ?? [];
const patchSeparationReadiness = scopeGuard?.patchSeparationReadiness ?? {};
const focusFileSet = new Set((patchSeparationReadiness.reviewFocusFiles ?? []).map((entry) => entry.file));

const releasePayloadFileCount = scopeGuard?.releaseCandidateInventory?.expectedIncludedFileCount ?? includedFiles.length;
const separateDirtyWorkFileCount = scopeGuard?.summary?.separateDirtyWorkCount ?? separateDirtyWork.length;
const separateDirtyWorkBaselineFileCount = scopeGuard?.separateWorkInventory?.expectedSeparateDirtyWorkCount ?? null;
const classifiedSeparateDirtyWorkExpansionAllowed = scopeGuard?.separateWorkInventory?.classifiedSeparateDirtyWorkExpansionAllowed === true;
const unexpectedDirtyFileCount = scopeGuard?.summary?.unexpectedFileCount ?? unexpectedFiles.length;
const scopeGuardBlockerCount = scopeGuard?.summary?.blockerCount ?? null;
const patchStatus = patchSeparationReadiness.status ?? null;
const packageMixedStatus = (patchSeparationReadiness.mixedStatusFiles ?? [])
  .find((entry) => entry.file === 'package.json')?.status ?? null;

if (scopeGuard?.status !== 'passed') blockers.push(`SCOPE_GUARD_NOT_PASSED:${scopeGuard?.status ?? 'missing'}`);
if (scopeGuardBlockerCount !== 0) blockers.push(`SCOPE_GUARD_BLOCKERS_PRESENT:${scopeGuardBlockerCount ?? 'missing'}`);
if (releasePayloadFileCount !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT) blockers.push(`RELEASE_PAYLOAD_COUNT_CHANGED:${releasePayloadFileCount}`);
if (includedFiles.length !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT) blockers.push(`ACTUAL_INCLUDED_FILE_COUNT_CHANGED:${includedFiles.length}`);
if (!classifiedSeparateDirtyWorkExpansionAllowed) blockers.push('CLASSIFIED_SEPARATE_DIRTY_WORK_EXPANSION_NOT_ALLOWED');
if (unexpectedDirtyFileCount !== 0) blockers.push(`UNEXPECTED_DIRTY_FILES_PRESENT:${unexpectedDirtyFileCount}`);
if (!allowedPatchSeparationStatuses.has(patchStatus)) blockers.push(`PATCH_SEPARATION_READINESS_CHANGED:${patchStatus ?? 'missing'}`);

const releasePayload = includedFiles.map((entry) => ({
  ...entry,
  stagingAction: stagingActionFor(entry, focusFileSet),
}));

const manualReviewFiles = patchStatus === 'review-required' ? uniqueByFile([
  ...(patchSeparationReadiness.mixedStatusFiles ?? []),
  ...(patchSeparationReadiness.untrackedIncludedFiles ?? []),
  ...(patchSeparationReadiness.reviewFocusFiles ?? []),
]).map((entry) => ({
  file: entry.file,
  status: entry.status ?? includedFiles.find((fileEntry) => fileEntry.file === entry.file)?.status ?? '-',
  stagingAction: stagingActionFor(
    {
      file: entry.file,
      status: entry.status ?? includedFiles.find((fileEntry) => fileEntry.file === entry.file)?.status ?? ' M',
    },
    focusFileSet,
  ),
  reason: entry.reason ?? 'Review before staging the release PR.',
})) : [];

const status = blockers.length > 0 ? 'blocked' : patchStatus;
const manualReviewRequired = status === 'review-required';

const report = {
  generatedAt: new Date().toISOString(),
  version: PLAN_VERSION,
  status,
  doesNotModifyDataFile: true,
  doesNotRunGitAdd: true,
  writesOnlyReports: true,
  sourceScopeGuard: {
    path: 'reports/stadium/gwangju-seatmap-release-scope-guard.json',
    exists,
    status: scopeGuard?.status ?? null,
    generatedAt: scopeGuard?.generatedAt ?? null,
  },
  summary: {
    releasePayloadFileCount,
    actualIncludedFileCount: includedFiles.length,
    separateDirtyWorkFileCount,
    separateDirtyWorkBaselineFileCount,
    classifiedSeparateDirtyWorkExpansionAllowed,
    actualSeparateDirtyWorkFileCount: separateDirtyWork.length,
    unexpectedDirtyFileCount,
    scopeGuardBlockerCount,
    blockerCount: blockers.length,
    patchSeparationReadiness: patchStatus,
    packageJsonStatus: packageMixedStatus,
    manualReviewRequired,
  },
  stagingGate: {
    status,
    safeToRunBulkGitAdd: false,
    requiresManualReviewBeforeStaging: manualReviewRequired,
    requiresManualHunkReview: manualReviewRequired,
    currentContract: 'Report only. Do not run git add from this script; review mixed/untracked included files before staging when present.',
    forbiddenCommands: [
      'git add .',
      'git add -A',
      'git commit -am',
    ],
  },
  releasePayload,
  separateDirtyWork,
  unexpectedFiles,
  manualReviewFiles,
  manualReviewReasons: patchSeparationReadiness.reviewRequiredReasons ?? [],
  sourcePolicy,
  blockers,
};

const markdown = [
  '# 광주 PR staging plan',
  '',
  `- version: \`${PLAN_VERSION}\``,
  `- status: \`${status}\``,
  `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
  `- runs git add: \`${!report.doesNotRunGitAdd}\``,
  `- writes only reports: \`${report.writesOnlyReports}\``,
  '- source: `reports/stadium/gwangju-seatmap-release-scope-guard.json`',
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
  '- stagingPlan.status=ready-or-review-required',
  '- stagingPlan.doesNotRunGitAdd=true',
  '- stagingPlan.safeToRunBulkGitAdd=false',
  `- stagingPlan.packageJsonStatus=${packageMixedStatus ?? 'none'}`,
  '- stagingPlan.releasePayloadFileCount=23',
  `- stagingPlan.separateDirtyWorkFileCount=${separateDirtyWorkFileCount}`,
  `- stagingPlan.separateDirtyWorkBaselineFileCount=${separateDirtyWorkBaselineFileCount ?? '-'}`,
  `- stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=${classifiedSeparateDirtyWorkExpansionAllowed}`,
  '- Clean release payload files are not packaging blockers; review mixed/untracked included files before staging when present.',
  '- Do not use `git add .`, `git add -A`, or `git commit -am` for this release payload.',
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
  '',
  '## Manual Review Files',
  '',
  manualReviewFiles.length > 0
    ? markdownTable(
      ['file', 'git status', 'staging action', 'reason'],
      manualReviewFiles.map((entry) => [
        `\`${entry.file}\``,
        `\`${entry.status}\``,
        `\`${entry.stagingAction}\``,
        entry.reason,
      ]),
    )
    : 'No manual review files.',
  '',
  '## Release Payload',
  '',
  markdownTable(
    ['file', 'git status', 'rule', 'staging action'],
    releasePayload.map((entry) => [
      `\`${entry.file}\``,
      `\`${entry.status}\``,
      `\`${entry.rule}\``,
      `\`${entry.stagingAction}\``,
    ]),
  ),
  '',
  '## Separate Dirty Work',
  '',
  markdownTable(
    ['file', 'git status', 'rule'],
    separateDirtyWork.map((entry) => [
      `\`${entry.file}\``,
      `\`${entry.status}\``,
      `\`${entry.rule}\``,
    ]),
  ),
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

if (isReviewMode) {
  const { exists: planExists, data: sourcePlan, error: planError } = await readJson(prStagingPlanPath);
  const diffInputs = {
    cachedNameOnly: splitLines(await runGit(['diff', '--cached', '--name-only'])),
    worktreeNameOnly: splitLines(await runGit(['diff', '--name-only'])),
    cachedShortstat: await runGit(['diff', '--cached', '--shortstat']),
    worktreeShortstat: await runGit(['diff', '--shortstat']),
  };
  const includedDiffs = await Promise.all(releasePayload.map(readIncludedDiff));
  const includedDiffByFile = new Map(includedDiffs.map((entry) => [entry.file, entry]));
  const reviewFiles = releasePayload.map((entry) => {
    const diff = includedDiffByFile.get(entry.file);
    return {
      file: entry.file,
      gitStatus: entry.status,
      rule: entry.rule,
      stagingAction: entry.stagingAction,
      reviewClass: reviewClassFor(entry, diff),
      hasCachedDiff: diff.hasCachedDiff,
      hasWorktreeDiff: diff.hasWorktreeDiff,
      cachedShortstat: diff.cachedShortstat,
      worktreeShortstat: diff.worktreeShortstat,
      cachedNumstat: diff.cachedNumstat,
      worktreeNumstat: diff.worktreeNumstat,
    };
  });
  const reviewClassCounts = reviewFiles.reduce((counts, entry) => ({
    ...counts,
    [entry.reviewClass]: (counts[entry.reviewClass] ?? 0) + 1,
  }), {});
  const cachedOutsideRelease = separateDirtyWork.filter((entry) => (
    entry.status !== '??' && entry.status[0] !== ' '
  ));
  const reviewBlockers = [
    ...blockers,
    ...(planError ? [`${planError}:reports/stadium/gwangju-seatmap-pr-staging-plan.json`] : []),
    ...(sourcePlan?.status && !allowedPatchSeparationStatuses.has(sourcePlan.status)
      ? [`PR_STAGING_PLAN_STATUS_CHANGED:${sourcePlan.status}`]
      : []),
    ...(sourcePlan?.summary?.releasePayloadFileCount !== EXPECTED_RELEASE_PAYLOAD_FILE_COUNT
      ? [`PR_STAGING_PLAN_RELEASE_PAYLOAD_COUNT_CHANGED:${sourcePlan?.summary?.releasePayloadFileCount ?? 'missing'}`]
      : []),
  ];
  const reviewWarnings = [
    ...cachedOutsideRelease.map((entry) => `SEPARATE_FILE_HAS_INDEX_DIFF:${entry.file}:${entry.status}`),
  ];
  const reviewStatus = reviewBlockers.length > 0 ? 'blocked' : sourcePlan?.status;
  const reviewManualRequired = reviewStatus === 'review-required';
  const reviewReport = {
    generatedAt: new Date().toISOString(),
    version: REVIEW_VERSION,
    status: reviewStatus,
    doesNotModifyDataFile: true,
    doesNotRunGitAdd: true,
    writesOnlyReports: true,
    sourceReports: {
      releaseScopeGuard: {
        path: 'reports/stadium/gwangju-seatmap-release-scope-guard.json',
        exists,
        status: scopeGuard?.status ?? null,
        generatedAt: scopeGuard?.generatedAt ?? null,
      },
      prStagingPlan: {
        path: 'reports/stadium/gwangju-seatmap-pr-staging-plan.json',
        exists: planExists,
        status: sourcePlan?.status ?? null,
        generatedAt: sourcePlan?.generatedAt ?? null,
      },
    },
    summary: {
      releasePayloadFileCount,
      actualIncludedFileCount: includedFiles.length,
      separateDirtyWorkFileCount,
      separateDirtyWorkBaselineFileCount,
      unexpectedDirtyFileCount,
      blockerCount: reviewBlockers.length,
      warningCount: reviewWarnings.length,
      reviewClassCounts,
      cachedOutsideReleaseCount: cachedOutsideRelease.length,
      cachedIncludedFileCount: reviewFiles.filter((entry) => entry.hasCachedDiff).length,
      worktreeIncludedFileCount: reviewFiles.filter((entry) => entry.hasWorktreeDiff).length,
      manualReviewRequired: reviewManualRequired,
    },
    stagingGate: {
      status: reviewStatus,
      safeToRunBulkGitAdd: false,
      recommendsOnlyIncludedFiles: true,
      doesNotRecommendSeparateDirtyWork: true,
      currentContract: 'Report only. Review included release payload diffs manually; do not stage separate workstream files from this report.',
      forbiddenCommands: [
        'git add .',
        'git add -A',
        'git commit -am',
      ],
    },
    diffInputs,
    reviewFiles,
    cachedOutsideRelease,
    separateDirtyWork,
    unexpectedFiles,
    sourcePolicy,
    blockers: reviewBlockers,
    warnings: reviewWarnings,
  };
  const reviewMarkdown = [
    '# 광주 PR staging review',
    '',
    `- version: \`${REVIEW_VERSION}\``,
    `- status: \`${reviewStatus}\``,
    `- modifies data file: \`${!reviewReport.doesNotModifyDataFile}\``,
    `- runs git add: \`${!reviewReport.doesNotRunGitAdd}\``,
    `- writes only reports: \`${reviewReport.writesOnlyReports}\``,
    '- source scope guard: `reports/stadium/gwangju-seatmap-release-scope-guard.json`',
    '- source staging plan: `reports/stadium/gwangju-seatmap-pr-staging-plan.json`',
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(reviewReport.summary).map(([key, value]) => [
        key,
        typeof value === 'object' ? `\`${JSON.stringify(value)}\`` : `\`${value}\``,
      ]),
    ),
    '',
    '## Staging Gate',
    '',
    '- stagingReview.status=ready-or-review-required',
    '- stagingReview.doesNotRunGitAdd=true',
    '- stagingReview.safeToRunBulkGitAdd=false',
    '- stagingReview.releasePayloadFileCount=23',
    '- stagingReview.recommendsOnlyIncludedFiles=true',
    '- stagingReview.doesNotRecommendSeparateDirtyWork=true',
    '- Clean release payload files are not packaging blockers; review included files with `manual-hunk-review-required`, `untracked-review-required`, or `generated-report-review-required` before staging when present.',
    '- Do not use `git add .`, `git add -A`, or `git commit -am` for this release payload.',
    '',
    '## Blockers',
    '',
    reviewBlockers.length > 0 ? reviewBlockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
    '',
    '## Warnings',
    '',
    reviewWarnings.length > 0 ? reviewWarnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
    '## Included Diff Review',
    '',
    markdownTable(
      ['file', 'git status', 'review class', 'cached diff', 'worktree diff', 'cached shortstat', 'worktree shortstat'],
      reviewFiles.map((entry) => [
        `\`${entry.file}\``,
        `\`${entry.gitStatus}\``,
        `\`${entry.reviewClass}\``,
        `\`${entry.hasCachedDiff}\``,
        `\`${entry.hasWorktreeDiff}\``,
        entry.cachedShortstat ? `\`${entry.cachedShortstat}\`` : '-',
        entry.worktreeShortstat ? `\`${entry.worktreeShortstat}\`` : '-',
      ]),
    ),
    '',
    '## Separate Files With Index Diff',
    '',
    cachedOutsideRelease.length > 0
      ? markdownTable(
        ['file', 'git status', 'rule'],
        cachedOutsideRelease.map((entry) => [
          `\`${entry.file}\``,
          `\`${entry.status}\``,
          `\`${entry.rule}\``,
        ]),
      )
      : 'No separate workstream files have index diffs.',
    '',
    '## Diff Inputs',
    '',
    `- git diff --cached --name-only count: \`${diffInputs.cachedNameOnly.length}\``,
    `- git diff --name-only count: \`${diffInputs.worktreeNameOnly.length}\``,
    `- git diff --cached --shortstat: \`${diffInputs.cachedShortstat || '-'}\``,
    `- git diff --shortstat: \`${diffInputs.worktreeShortstat || '-'}\``,
    '',
    '## Source Policy',
    '',
    '- Allowed coordinate source: operator-provided official PNG coordinates only.',
    '- Allowed coordinate system: original official PNG `2200x1159`.',
    '- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.',
    '- Missing or unclear baseball operating data keeps `MANUAL_BASEBALL_DATA_REQUIRED`.',
    '',
  ].join('\n');

  await fs.writeFile(reviewJsonPath, `${JSON.stringify(reviewReport, null, 2)}\n`, 'utf8');
  await fs.writeFile(reviewMarkdownPath, reviewMarkdown, 'utf8');

  console.log(`pr_staging_review_json:${reviewJsonPath}`);
  console.log(`pr_staging_review_markdown:${reviewMarkdownPath}`);
  console.log(`status:${reviewStatus} included=${includedFiles.length} separate=${separateDirtyWork.length} unexpected=${unexpectedDirtyFileCount} blockers=${reviewBlockers.length}`);

  if (reviewStatus === 'blocked') {
    process.exitCode = 1;
  }
} else {
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`pr_staging_plan_json:${jsonPath}`);
  console.log(`pr_staging_plan_markdown:${markdownPath}`);
  console.log(`status:${status} included=${includedFiles.length} separate=${separateDirtyWork.length} unexpected=${unexpectedDirtyFileCount} blockers=${blockers.length}`);

  if (status === 'blocked') {
    process.exitCode = 1;
  }
}
