import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const jsonPath = path.join(reportDir, 'sajik-seatmap-pr-scope-guard.json');
const markdownPath = path.join(reportDir, 'sajik-seatmap-pr-scope-guard.md');

const SCOPE_GUARD_VERSION = 'SAJIK_PR_SCOPE_GUARD_V1';

const expectedIncludedFiles = [
  'docs/sajik-seatmap-editor-v17-operator-guide.md',
  'docs/sajik-seatmap-editor-v18-roadmap.md',
  'docs/sajik-seatmap-hitpath-candidate-review.md',
  'docs/sajik-seatmap-marker-only-transition.md',
  'docs/sajik-seatmap-pr-packaging-inventory.md',
  'docs/sajik-seatmap-release-lock.md',
  'docs/sajik-seatmap-stage01-handoff.md',
  'package.json',
  'scripts/sajik-seatmap-alignment-audit.mjs',
  'scripts/sajik-seatmap-editor-regression.mjs',
  'scripts/sajik-seatmap-export-dataset.mjs',
  'scripts/sajik-seatmap-hitpath-candidate-review.mjs',
  'scripts/sajik-seatmap-zone-precision-worksets.mjs',
  'scripts/sajik-seatmap-stage01-operator-package.mjs',
  'scripts/sajik-seatmap-stage01-operator-input-aid.mjs',
  'scripts/sajik-seatmap-stage01-review-board.mjs',
  'scripts/sajik-seatmap-stage01-prewrite.mjs',
  'scripts/sajik-seatmap-stage01-apply-ready.mjs',
  'scripts/sajik-seatmap-stage01-post-apply-audit.mjs',
  'scripts/sajik-seatmap-stage01-operator-status.mjs',
  'scripts/sajik-seatmap-stage01-manual-patch-plan.mjs',
  'scripts/sajik-seatmap-stage01-real-approval-readiness.mjs',
  'scripts/sajik-seatmap-stage01-prewrite-smoke.mjs',
  'scripts/sajik-seatmap-stage01-approved-dry-run.mjs',
  'scripts/sajik-seatmap-marker-transition-review.mjs',
  'scripts/sajik-seatmap-pr-scope-guard.mjs',
  'scripts/sajik-seatmap-review-manifest.mjs',
  'scripts/stadium-ux-audit.mjs',
  'src/components/AppRoutes.tsx',
  'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
  'src/components/sajik/SajikSeatMap.test.ts',
  'src/components/sajik/SajikSeatMapEditor.tsx',
  'src/components/sajik/SajikSeatMapSvg.tsx',
  'src/data/sajikSeatData.test.ts',
  'src/data/sajikSeatData.ts',
  'src/data/sajikSeatMapDataset.ts',
  'src/utils/seatMapPolygonValidator.ts',
];

const partialStagingRequiredFiles = [
  {
    file: 'package.json',
    reason: 'Package scripts are shared and currently contain unrelated stadium script changes.',
    includeOnly: [
      'stadium:sajik:dataset-export',
      'stadium:sajik:editor-regression',
      'stadium:sajik:hitpath-review',
      'stadium:sajik:zone-precision-worksets',
      'stadium:sajik:stage01-operator-package',
      'stadium:sajik:stage01-operator-input-aid',
      'stadium:sajik:stage01-review-board',
      'stadium:sajik:stage01-prewrite',
      'stadium:sajik:stage01-apply-ready',
      'stadium:sajik:stage01-post-apply-audit',
      'stadium:sajik:stage01-operator-status',
      'stadium:sajik:stage01-manual-patch-plan',
      'stadium:sajik:stage01-real-approval-readiness',
      'stadium:sajik:stage01-prewrite-smoke',
      'stadium:sajik:stage01-approved-dry-run',
      'stadium:sajik:marker-transition-review',
      'stadium:sajik:pr-scope-guard',
      'qa:stadium:sajik:polygon-v2',
    ],
    exclude: [
      'stadium:gwangju:*',
      'qa:stadium:gwangju:*',
      'stadium:daegu:*',
      'qa:stadium:daegu:*',
    ],
  },
  {
    file: 'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    reason: 'Static contract tests are shared across stadiums; stage only Sajik-focused hunks.',
    includeOnly: [
      'test("사직 좌석도 release lock 문서는 v2 polygon 검수 계약을 고정한다") additions',
      'Sajik package script assertions',
      'Sajik release lock document assertions',
      'Sajik editor v1.8 roadmap exclusion assertion',
    ],
    exclude: [
      'common seatmap shell assertions',
      'Daejeon anchor crop assertions',
      'Gwangju release/operator assertions',
      'Daegu operator/precision assertions',
    ],
  },
  {
    file: 'scripts/stadium-ux-audit.mjs',
    reason: 'Shared browser QA script may contain non-Sajik stadium changes; stage only Sajik label-coordinate hunks.',
    includeOnly: [
      'Sajik label-coordinate QA mapInteractionStatus read/return',
      'Sajik alias-only hit-area exclusion checks',
    ],
    exclude: [
      'non-Sajik viewport, click, or QA flow changes',
      'Suwon-specific QA extensions',
    ],
  },
  {
    file: 'src/components/AppRoutes.tsx',
    reason: 'Application route file is shared; stage only the dev-only Sajik editor route hunk.',
    includeOnly: [
      'import SajikSeatMapEditor',
      '/internal/sajik-seatmap-editor route guarded by import.meta.env.DEV',
    ],
    exclude: [
      'production navigation exposure',
      'non-Sajik route changes',
    ],
  },
];

const sourcePolicy = {
  allowedCoordinateSource: 'official 2026 Sajik PNG plus manual polygon-v2 trace only',
  coordinateSystem: '960x640 SVG viewBox 0 0 960 640',
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  disallowedSources: [
    'external crawling',
    'web-search-based baseball data',
    'resized screenshots',
    'browser CSS pixels as source coordinates',
    'third-party copied seatmap images',
  ],
};

const includedSajikComponentFiles = new Set([
  'src/components/sajik/SajikSeatMap.test.ts',
  'src/components/sajik/SajikSeatMapEditor.tsx',
  'src/components/sajik/SajikSeatMapSvg.tsx',
]);

const includedRules = [
  {
    id: 'sajik-docs',
    reason: 'Sajik release lock, PR packaging, and operator guidance docs',
    match: (file) => file.startsWith('docs/sajik-seatmap-'),
  },
  {
    id: 'sajik-scripts',
    reason: 'Sajik export, audit, manifest, editor regression, and PR scope scripts',
    match: (file) => file.startsWith('scripts/sajik-seatmap-'),
  },
  {
    id: 'sajik-components',
    reason: 'Sajik SVG renderer, internal editor, and component tests',
    match: (file) => includedSajikComponentFiles.has(file),
  },
  {
    id: 'sajik-data',
    reason: 'Sajik data, normalized dataset, and data tests',
    match: (file) => file.startsWith('src/data/sajik'),
  },
  {
    id: 'shared-validator',
    reason: 'Common polygon validator used by Sajik data and scripts',
    match: (file) => file === 'src/utils/seatMapPolygonValidator.ts',
  },
  {
    id: 'shared-route-contract',
    reason: 'Dev-only Sajik editor route hunk',
    match: (file) => file === 'src/components/AppRoutes.tsx',
  },
  {
    id: 'shared-static-test-contract',
    reason: 'Sajik release lock and package-script static test hunks',
    match: (file) => file === 'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
  },
  {
    id: 'shared-browser-qa-contract',
    reason: 'Sajik label-coordinate QA reads mapInteractionStatus',
    match: (file) => file === 'scripts/stadium-ux-audit.mjs',
  },
  {
    id: 'package-script-contract',
    reason: 'Package scripts expose Sajik dataset export, hitPath review, zone precision worksets, Stage 01 operator gates, marker transition review, editor regression, PR scope guard, and polygon-v2 gate',
    match: (file) => file === 'package.json',
  },
];

const separateRules = [
  {
    id: 'sajik-ux-files',
    reason: 'Sajik first-visit/runtime UX work is outside the polygon v2 release-lock PR',
    match: (file) => file === 'src/components/sajik/SajikSeatMap.tsx'
      || file === 'src/components/sajik/SajikBottomSheet.tsx',
  },
  {
    id: 'shared-seatmap-shell',
    reason: 'Common seatmap shell and home runtime work is outside the Sajik polygon v2 release-lock PR',
    match: (file) => file === 'src/components/StadiumGuideRuntime.tsx'
      || file === 'src/components/HomeRuntime.tsx'
      || file === 'src/components/home/HomeSecondaryPanels.tsx'
      || file === 'src/hooks/useScrollStage.ts'
      || file === 'src/components/stadiumSeatMapRegistry.tsx'
      || file.startsWith('src/components/stadiumSeatMap/'),
  },
  {
    id: 'shared-navigation-ui',
    reason: 'Shared navigation UI work is outside the Sajik polygon v2 release-lock PR',
    match: (file) => file === 'src/components/CheerMobileBottomNav.tsx'
      || file === 'src/components/Navbar.tsx'
      || file === 'src/components/PublicNavbar.tsx',
  },
  {
    id: 'mate-files',
    reason: 'Mate feature work is outside the Sajik PR scope',
    match: (file) => file === 'src/components/MatePartyCard.tsx',
  },
  {
    id: 'shared-logging-files',
    reason: 'Shared logging utility work is outside the Sajik polygon v2 release-lock PR',
    match: (file) => file === 'src/utils/safeLogger.ts'
      || file === 'src/utils/safeLogger.test.ts',
  },
  {
    id: 'shared-repo-config',
    reason: 'Shared repository config changes are outside the Sajik polygon v2 release-lock PR',
    match: (file) => file === '.gitignore',
  },
  {
    id: 'shared-html-shell',
    reason: 'Shared HTML shell theme bootstrap work is outside the Sajik polygon v2 release-lock PR',
    match: (file) => file === 'index.html',
  },
  {
    id: 'environment-files',
    reason: 'Environment file changes are outside the Sajik polygon v2 release-lock PR',
    match: (file) => file === '.env.production',
  },
  {
    id: 'non-sajik-stadium-ui',
    reason: 'Non-Sajik stadium UI work is outside the Sajik polygon v2 release-lock PR',
    match: (file) => file.startsWith('src/components/changwon/')
      || file.startsWith('src/components/daejeon/')
      || file.startsWith('src/components/gocheok/')
      || file.startsWith('src/components/incheon/')
      || file.startsWith('src/components/jamsil/')
      || file.startsWith('src/components/suwon/'),
  },
  {
    id: 'daegu-files',
    reason: 'Daegu seatmap/operator work is outside the Sajik PR scope',
    match: (file) => file.startsWith('docs/daegu-')
      || file.startsWith('scripts/daegu-')
      || file.startsWith('src/components/daegu/')
      || file.startsWith('src/data/daegu'),
  },
  {
    id: 'daejeon-files',
    reason: 'Daejeon anchor/operator work is outside the Sajik PR scope',
    match: (file) => file.startsWith('docs/daejeon-')
      || file.startsWith('scripts/daejeon-')
      || file.startsWith('src/data/daejeon')
      || file === 'src/components/DaejeonStadiumUxAuditContract.test.ts',
  },
  {
    id: 'gwangju-files',
    reason: 'Gwangju release/operator work is outside the Sajik PR scope',
    match: (file) => file.startsWith('docs/gwangju-')
      || file.startsWith('scripts/gwangju-')
      || file.startsWith('src/data/gwangju')
      || file.startsWith('src/components/gwangju/'),
  },
  {
    id: 'suwon-files',
    reason: 'Suwon baseline and hit geometry work is outside the Sajik PR scope',
    match: (file) => file.startsWith('docs/suwon-')
      || file.startsWith('scripts/suwon-')
      || file.startsWith('src/data/suwon'),
  },
  {
    id: 'jamsil-files',
    reason: 'Jamsil seatmap work is outside the Sajik PR scope',
    match: (file) => file.startsWith('src/data/jamsil'),
  },
  {
    id: 'shared-isolated-qa-runner',
    reason: 'Shared isolated stadium QA runner changes are outside the Sajik polygon v2 release-lock PR',
    match: (file) => file === 'scripts/run-stadium-isolated-qa.mjs'
      || file === 'scripts/stadium-seatmap-standard-shell-pr-scope-guard.mjs'
      || file === 'docs/stadium-seatmap-standard-shell-pr-scope.md',
  },
  {
    id: 'incheon-files',
    reason: 'Incheon seatmap/visit-guide work is outside the Sajik PR scope',
    match: (file) => file.startsWith('src/data/incheon'),
  },
  {
    id: 'generated-build-reports',
    reason: 'Build reports are regenerated artifacts and should not be staged with the Sajik polygon PR by default',
    match: (file) => [
      'reports/bundle-guard-report.json',
      'reports/dist-assets-report.json',
    ].includes(file),
  },
  {
    id: 'non-sajik-generated-reports',
    reason: 'Non-Sajik report artifacts are regenerated outputs outside the Sajik polygon v2 release-lock PR',
    match: (file) => file.startsWith('reports/'),
  },
];

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const sorted = (values) => [...values].sort();

const parseStatusLine = (line) => {
  const status = line.slice(0, 2);
  const rawPath = line.slice(3);
  const file = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;
  return { status, file };
};

const classifyFile = (entry) => {
  const includedRule = includedRules.find((rule) => rule.match(entry.file));
  if (includedRule) {
    return { ...entry, scope: 'included', rule: includedRule.id, reason: includedRule.reason };
  }

  const separateRule = separateRules.find((rule) => rule.match(entry.file));
  if (separateRule) {
    return { ...entry, scope: 'separate', rule: separateRule.id, reason: separateRule.reason };
  }

  return {
    ...entry,
    scope: 'unexpected',
    rule: 'unclassified',
    reason: 'Dirty file is neither documented as Sajik PR payload nor a separated workstream.',
  };
};

const diffFileList = (expected, actual) => {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return {
    missing: sorted(expected.filter((file) => !actualSet.has(file))),
    extra: sorted(actual.filter((file) => !expectedSet.has(file))),
  };
};

const isMixedGitStatus = (status) => status !== '??' && status[0] !== ' ' && status[1] !== ' ';

const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd: frontendRoot });
const dirtyEntries = stdout
  .split('\n')
  .map((line) => line.trimEnd())
  .filter(Boolean)
  .map(parseStatusLine)
  .map(classifyFile);

const includedFiles = dirtyEntries.filter((entry) => entry.scope === 'included');
const separateDirtyWork = dirtyEntries.filter((entry) => entry.scope === 'separate');
const unexpectedFiles = dirtyEntries.filter((entry) => entry.scope === 'unexpected');
const includedDiff = diffFileList(expectedIncludedFiles, includedFiles.map((entry) => entry.file));

const entriesByFile = new Map(dirtyEntries.map((entry) => [entry.file, entry]));
const mixedStatusFiles = includedFiles
  .filter((entry) => isMixedGitStatus(entry.status))
  .map((entry) => ({
    file: entry.file,
    status: entry.status,
    reason: 'Included file has both index and worktree changes; review with git add -p before staging.',
  }));
const untrackedIncludedFiles = includedFiles
  .filter((entry) => entry.status === '??')
  .map((entry) => ({
    file: entry.file,
    status: entry.status,
    reason: 'Included file is untracked and must be reviewed before staging.',
  }));

const partialStagingReviewFiles = partialStagingRequiredFiles.map((focus) => {
  const entry = entriesByFile.get(focus.file);
  return {
    file: focus.file,
    status: entry?.status ?? '-',
    scope: entry?.scope ?? 'clean-or-missing',
    rule: entry?.rule ?? '-',
    reason: focus.reason,
    includeOnly: focus.includeOnly,
    exclude: focus.exclude,
  };
});
const partialStagingFileSet = new Set(partialStagingRequiredFiles.map((focus) => focus.file));
const wholeFileReviewBeforeStaging = expectedIncludedFiles
  .filter((file) => !partialStagingFileSet.has(file))
  .map((file) => {
    const entry = entriesByFile.get(file);
    return {
      file,
      status: entry?.status ?? '-',
      scope: entry?.scope ?? 'missing',
      rule: entry?.rule ?? '-',
      action: entry?.status === '??'
        ? 'manual whole-file review, then explicit git add <file>'
        : entry
          ? 'review full file diff, then explicit git add <file>'
          : 'missing from dirty worktree; apply Sajik patch before staging',
    };
  });
const partialHunkReviewBeforeStaging = partialStagingReviewFiles.map((entry) => ({
  file: entry.file,
  status: entry.status,
  scope: entry.scope,
  rule: entry.rule,
  includeOnly: entry.includeOnly,
  exclude: entry.exclude,
  action: entry.status === '-'
    ? 'no dirty hunk currently detected; re-check before staging'
    : 'manual hunk review with git add -p or clean-worktree patch split',
}));
const excludedArtifacts = [
  'reports/stadium/sajik-seatmap-*.json',
  'reports/stadium/sajik-seatmap-*.md',
  'reports/stadium/sajik-seatmap-*.png',
  'reports/stadium/sajik-stage01-operator/*',
  'reports/bundle-guard-report.json',
  'reports/dist-assets-report.json',
  'dist/*',
  'output/playwright/*',
  '../output/playwright/*',
];
const forbiddenStagingCommands = [
  'git add .',
  'git add package.json src/components/StadiumGuideRuntimeSeatMaps.test.ts',
  'git add reports dist output',
  'git add reports/bundle-guard-report.json reports/dist-assets-report.json',
];

const blockers = [
  ...unexpectedFiles.map((entry) => `UNCLASSIFIED_DIRTY_FILE:${entry.file}`),
  ...includedDiff.missing.map((file) => `SAJIK_PR_FILE_MISSING:${file}`),
  ...includedDiff.extra.map((file) => `SAJIK_PR_FILE_UNEXPECTED:${file}`),
];

const reviewRequiredReasons = [
  ...mixedStatusFiles.map((entry) => `MIXED_GIT_STATUS:${entry.file}:${entry.status}`),
  ...untrackedIncludedFiles.map((entry) => `UNTRACKED_INCLUDED_FILE:${entry.file}`),
  ...partialStagingReviewFiles
    .filter((entry) => entry.status !== '-')
    .map((entry) => `PARTIAL_STAGING_REVIEW:${entry.file}:${entry.status}`),
];

const patchSeparationStatus = blockers.length > 0
  ? 'blocked'
  : reviewRequiredReasons.length > 0
    ? 'review-required'
    : 'ready';

const report = {
  generatedAt: new Date().toISOString(),
  version: SCOPE_GUARD_VERSION,
  status: blockers.length === 0 ? 'passed' : 'blocked',
  doesNotRunGitAdd: true,
  sourcePolicy,
  summary: {
    dirtyFileCount: dirtyEntries.length,
    includedFileCount: includedFiles.length,
    separateDirtyWorkCount: separateDirtyWork.length,
    unexpectedFileCount: unexpectedFiles.length,
    blockerCount: blockers.length,
    reviewRequiredReasonCount: reviewRequiredReasons.length,
  },
  prScope: {
    releasePrScope: [
      'Sajik official 2026 PNG manual-polygon-v2 release lock',
      'Sajik normalized dataset/export/editor foundation',
      'Sajik dev-only editor v1.7 and browser regression',
      'Sajik hitPath candidate review report',
      'Sajik Stage 01 prewrite/apply-ready operator gates',
      'Sajik Stage 01 handoff and Stage 02 entry contract',
      'Sajik wheelchair marker layer split and transition readiness report',
      'Sajik editor v1.8 follow-up roadmap documentation',
      'Sajik focused QA gate and release documentation',
    ],
    excludedPrScope: [
      'Daegu work',
      'Daejeon work',
      'Gwangju work',
      'Suwon work',
      'non-Sajik stadium UI work',
      'common seatmap shell migration',
      'Sajik first-visit/runtime UX work',
      'generated build reports by default',
      'complete marker-only data model conversion',
      'actual expanded hitPath coordinates',
      'editor v1.8 implementation',
    ],
  },
  stagingManifest: {
    status: patchSeparationStatus,
    releasePayloadFileCount: expectedIncludedFiles.length,
    doesNotRunGitAdd: true,
    safeToRunBulkGitAdd: false,
    requiresManualHunkReview: partialHunkReviewBeforeStaging.some((entry) => entry.status !== '-'),
    wholeFileReviewBeforeStaging,
    partialHunkReviewBeforeStaging,
    excludedArtifacts,
    forbiddenStagingCommands,
    verificationAfterStaging: [
      'npm run stadium:sajik:pr-scope-guard',
      'node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts',
      'node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts',
      'git diff --check',
      'npm run qa:stadium:sajik:polygon-v2',
    ],
  },
  patchSeparationReadiness: {
    status: patchSeparationStatus,
    manualReviewRequired: patchSeparationStatus === 'review-required',
    safeToRunBulkGitAdd: false,
    mixedStatusFiles,
    untrackedIncludedFiles,
    partialStagingReviewFiles,
    reviewRequiredReasons,
    recommendedStagingFlow: [
      'Run npm run stadium:sajik:pr-scope-guard.',
      'Use git add -p for package.json, src/components/StadiumGuideRuntimeSeatMaps.test.ts, scripts/stadium-ux-audit.mjs, and src/components/AppRoutes.tsx.',
      'Stage untracked Sajik files explicitly after reviewing them.',
      'Do not stage reports/*, dist/*, or non-Sajik stadium files in the Sajik PR.',
      'Run npm run qa:stadium:sajik:polygon-v2 after applying the selected patch in a clean worktree.',
    ],
  },
  expectedIncludedFiles,
  includedInventory: {
    expectedIncludedFileCount: expectedIncludedFiles.length,
    actualIncludedFileCount: includedFiles.length,
    missingExpectedIncludedFiles: includedDiff.missing,
    extraIncludedFiles: includedDiff.extra,
  },
  includedFiles,
  separateDirtyWork,
  unexpectedFiles,
  blockers,
};

const inventoryRows = expectedIncludedFiles.map((file) => {
  const entry = entriesByFile.get(file);
  return [
    `\`${file}\``,
    `\`${entry?.status ?? '-'}\``,
    `\`${entry?.scope ?? 'missing'}\``,
    `\`${entry?.rule ?? '-'}\``,
    includedDiff.missing.includes(file) ? '`missing`' : '`present`',
  ];
});

const markdown = [
  '# Sajik seatmap PR scope guard',
  '',
  `- version: \`${SCOPE_GUARD_VERSION}\``,
  `- status: \`${report.status}\``,
  `- does not run git add: \`${report.doesNotRunGitAdd}\``,
  `- patch separation readiness: \`${patchSeparationStatus}\``,
  `- coordinate system: \`${sourcePolicy.coordinateSystem}\``,
  `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
  '',
  '## Summary',
  '',
  markdownTable(
    ['metric', 'value'],
    Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
  ),
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
  '',
  '## Patch Separation Readiness',
  '',
  `- status: \`${patchSeparationStatus}\``,
  `- manual review required: \`${report.patchSeparationReadiness.manualReviewRequired}\``,
  `- safe to run bulk git add: \`${report.patchSeparationReadiness.safeToRunBulkGitAdd}\``,
  `- mixed status files: \`${mixedStatusFiles.length}\``,
  `- untracked included files: \`${untrackedIncludedFiles.length}\``,
  `- partial staging review files: \`${partialStagingReviewFiles.filter((entry) => entry.status !== '-').length}\``,
  '',
  reviewRequiredReasons.length > 0
    ? reviewRequiredReasons.map((reason) => `- \`${reason}\``).join('\n')
    : 'No patch separation review reasons.',
  '',
  '## PR Staging Manifest',
  '',
  `- status: \`${report.stagingManifest.status}\``,
  `- release payload files: \`${report.stagingManifest.releasePayloadFileCount}\``,
  `- does not run git add: \`${report.stagingManifest.doesNotRunGitAdd}\``,
  `- safe to run bulk git add: \`${report.stagingManifest.safeToRunBulkGitAdd}\``,
  `- requires manual hunk review: \`${report.stagingManifest.requiresManualHunkReview}\``,
  '',
  '### Whole-File Review Before Staging',
  '',
  markdownTable(
    ['file', 'git status', 'scope', 'rule', 'action'],
    wholeFileReviewBeforeStaging.map((entry) => [
      `\`${entry.file}\``,
      `\`${entry.status}\``,
      `\`${entry.scope}\``,
      `\`${entry.rule}\``,
      entry.action,
    ]),
  ),
  '',
  '### Partial Hunk Review Before Staging',
  '',
  markdownTable(
    ['file', 'git status', 'scope', 'rule', 'include only', 'exclude', 'action'],
    partialHunkReviewBeforeStaging.map((entry) => [
      `\`${entry.file}\``,
      `\`${entry.status}\``,
      `\`${entry.scope}\``,
      `\`${entry.rule}\``,
      entry.includeOnly.map((item) => `\`${item}\``).join('<br>'),
      entry.exclude.map((item) => `\`${item}\``).join('<br>'),
      entry.action,
    ]),
  ),
  '',
  '### Excluded Artifacts',
  '',
  excludedArtifacts.map((artifact) => `- \`${artifact}\``).join('\n'),
  '',
  '### Forbidden Staging Commands',
  '',
  forbiddenStagingCommands.map((command) => `- \`${command}\``).join('\n'),
  '',
  '### Verification After Staging',
  '',
  report.stagingManifest.verificationAfterStaging.map((command) => `- \`${command}\``).join('\n'),
  '',
  '### Partial Staging Review Files',
  '',
  markdownTable(
    ['file', 'git status', 'scope', 'rule', 'include only', 'exclude', 'reason'],
    partialStagingReviewFiles.map((entry) => [
      `\`${entry.file}\``,
      `\`${entry.status}\``,
      `\`${entry.scope}\``,
      `\`${entry.rule}\``,
      entry.includeOnly.map((item) => `\`${item}\``).join('<br>'),
      entry.exclude.map((item) => `\`${item}\``).join('<br>'),
      entry.reason,
    ]),
  ),
  '',
  '## Expected Sajik PR Files',
  '',
  markdownTable(
    ['file', 'git status', 'scope', 'rule', 'state'],
    inventoryRows,
  ),
  '',
  '## Included Dirty Files',
  '',
  includedFiles.length > 0
    ? markdownTable(
      ['status', 'file', 'rule', 'reason'],
      includedFiles.map((entry) => [
        `\`${entry.status}\``,
        `\`${entry.file}\``,
        `\`${entry.rule}\``,
        entry.reason,
      ]),
    )
    : 'No included dirty files.',
  '',
  '## Separate Dirty Work',
  '',
  separateDirtyWork.length > 0
    ? markdownTable(
      ['status', 'file', 'rule', 'reason'],
      separateDirtyWork.map((entry) => [
        `\`${entry.status}\``,
        `\`${entry.file}\``,
        `\`${entry.rule}\``,
        entry.reason,
      ]),
    )
    : 'No separate dirty work detected.',
  '',
  '## Unexpected Dirty Files',
  '',
  unexpectedFiles.length > 0
    ? markdownTable(
      ['status', 'file', 'reason'],
      unexpectedFiles.map((entry) => [
        `\`${entry.status}\``,
        `\`${entry.file}\``,
        entry.reason,
      ]),
    )
    : 'No unexpected dirty files.',
  '',
  '## Clean Worktree Patch Flow',
  '',
  '1. Run `npm run stadium:sajik:pr-scope-guard` in the mixed worktree.',
  '2. Review `reports/stadium/sajik-seatmap-pr-scope-guard.md`.',
  '3. In the Sajik clean worktree, apply only the included Sajik files and selected hunks.',
  '4. Use `git add -p` for `package.json`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `scripts/stadium-ux-audit.mjs`, and `src/components/AppRoutes.tsx`.',
  '5. Run `npm run qa:stadium:sajik:polygon-v2` before opening the PR.',
  '',
  '## Source Policy',
  '',
  `- Allowed coordinate source: ${sourcePolicy.allowedCoordinateSource}.`,
  `- Allowed coordinate system: ${sourcePolicy.coordinateSystem}.`,
  `- Missing or unclear baseball data uses \`${sourcePolicy.missingBaseballDataContract}\`.`,
  `- Disallowed sources: ${sourcePolicy.disallowedSources.join(', ')}.`,
  '',
].join('\n');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`scope_guard_json:${jsonPath}`);
console.log(`scope_guard_markdown:${markdownPath}`);
console.log(`status:${report.status} included=${includedFiles.length} separate=${separateDirtyWork.length} unexpected=${unexpectedFiles.length} blockers=${blockers.length} patchSeparation=${patchSeparationStatus}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
