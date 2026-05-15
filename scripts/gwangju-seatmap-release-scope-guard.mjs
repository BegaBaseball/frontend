import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');

const SCOPE_GUARD_VERSION = 'GWANGJU_RELEASE_SCOPE_GUARD_V1';
const jsonPath = path.join(reportDir, 'gwangju-seatmap-release-scope-guard.json');
const markdownPath = path.join(reportDir, 'gwangju-seatmap-release-scope-guard.md');

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

const expectedIncludedReleaseFiles = [
  'docs/gwangju-seatmap-operator-runbook.md',
  'docs/gwangju-seatmap-release-handoff.md',
  'docs/gwangju-seatmap-release-lock.md',
  'package.json',
  'reports/bundle-guard-report.json',
  'reports/dist-assets-report.json',
  'scripts/gwangju-seatmap-operator-input-aid.mjs',
  'scripts/gwangju-seatmap-operator-input-packet.mjs',
  'scripts/gwangju-seatmap-low-margin-candidates.mjs',
  'scripts/gwangju-seatmap-postoperator-audit.mjs',
  'scripts/gwangju-seatmap-pr-staging-plan.mjs',
  'scripts/gwangju-seatmap-release-audit.mjs',
  'scripts/gwangju-seatmap-release-gate.mjs',
  'scripts/gwangju-seatmap-review-manifest.mjs',
  'scripts/gwangju-seatmap-zone-precision-worksets.mjs',
  'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
  'src/data/gwangjuSeatData.test.ts',
  'src/data/gwangjuSeatData.ts',
  'scripts/gwangju-seatmap-release-scope-guard.mjs',
];

const expectedSeparateDirtyWorkFiles = [
  'docs/daegu-seatmap-operator-corrections-runbook.md',
  'docs/daejeon-seatmap-release-lock.md',
  'docs/sajik-seatmap-pr-packaging-inventory.md',
  'docs/sajik-seatmap-editor-v17-operator-guide.md',
  'docs/sajik-seatmap-editor-v18-roadmap.md',
  'docs/sajik-seatmap-hitpath-candidate-review.md',
  'docs/sajik-seatmap-marker-only-transition.md',
  'docs/sajik-seatmap-release-lock.md',
  'scripts/daegu-seatmap-non-overlap-priority-queue.mjs',
  'scripts/daegu-seatmap-off-seat-retrace-intake.mjs',
  'scripts/daegu-seatmap-operator-corrections-batches.mjs',
  'scripts/daegu-seatmap-operator-state-audit.mjs',
  'scripts/daegu-seatmap-p0-off-seat-operator-import.mjs',
  'scripts/daegu-seatmap-p0-off-seat-operator-input.mjs',
  'scripts/daegu-seatmap-p0-operator-import.mjs',
  'scripts/daegu-seatmap-p0-operator-readiness.mjs',
  'scripts/daegu-seatmap-p0-p1-off-seat-workset.mjs',
  'scripts/daegu-seatmap-p0-retrace-intake.mjs',
  'scripts/daegu-seatmap-p1-boundary-input-aid.mjs',
  'scripts/daegu-seatmap-p1-decision-packet.mjs',
  'scripts/daegu-seatmap-p1-next-action-packet.mjs',
  'scripts/daegu-seatmap-p1-operator-audit.mjs',
  'scripts/daegu-seatmap-p1-operator-import.mjs',
  'scripts/daegu-seatmap-p1-operator-package.mjs',
  'scripts/daegu-seatmap-p1-operator-readiness.mjs',
  'scripts/daegu-seatmap-p1-paired-boundary-review.mjs',
  'scripts/daegu-seatmap-p1-precision-workset.mjs',
  'scripts/daegu-seatmap-p1-stage-order-regression.mjs',
  'scripts/daegu-seatmap-p2-decision-packet.mjs',
  'scripts/daegu-seatmap-p2-next-action-packet.mjs',
  'scripts/daegu-seatmap-p2-operator-import.mjs',
  'scripts/daegu-seatmap-p2-operator-package.mjs',
  'scripts/daegu-seatmap-p2-operator-readiness.mjs',
  'scripts/daegu-seatmap-p2-staging-audit.mjs',
  'scripts/daegu-seatmap-p3-p4-decision-packet.mjs',
  'scripts/daegu-seatmap-p3-p4-operator-audit.mjs',
  'scripts/daegu-seatmap-p3-p4-operator-import.mjs',
  'scripts/daegu-seatmap-p3-p4-operator-package.mjs',
  'scripts/daegu-seatmap-p3-p4-operator-readiness.mjs',
  'scripts/daegu-seatmap-precision-audit.mjs',
  'scripts/daegu-seatmap-retrace-work-queue.mjs',
  'scripts/daegu-seatmap-visual-issue-queue.mjs',
  'scripts/daegu-seatmap-visual-off-seat-workset.mjs',
  'scripts/daejeon-anchor-review-crops.mjs',
  'scripts/daejeon-seatmap-anchor-contract.mjs',
  'scripts/daejeon-seatmap-change-guard.mjs',
  'scripts/daejeon-seatmap-operator-handoff.mjs',
  'scripts/daejeon-seatmap-release-gate.mjs',
  'scripts/sajik-seatmap-alignment-audit.mjs',
  'scripts/sajik-seatmap-editor-regression.mjs',
  'scripts/sajik-seatmap-export-dataset.mjs',
  'scripts/sajik-seatmap-hitpath-candidate-review.mjs',
  'scripts/sajik-seatmap-marker-transition-review.mjs',
  'scripts/sajik-seatmap-pr-scope-guard.mjs',
  'scripts/sajik-seatmap-review-manifest.mjs',
  'scripts/stadium-ux-audit.mjs',
  'src/components/AppRoutes.tsx',
  'src/components/DaejeonStadiumUxAuditContract.test.ts',
  'src/components/HomeRuntime.tsx',
  'src/components/StadiumGuideRuntime.tsx',
  'src/components/changwon/ChangwonSeatMap.tsx',
  'src/components/daegu/DaeguSeatMap.tsx',
  'src/components/daegu/DaeguSeatMapSvg.tsx',
  'src/components/daejeon/DaejeonSeatMap.tsx',
  'src/components/gocheok/GocheokSeatMap.tsx',
  'src/components/gwangju/GwangjuSeatMap.tsx',
  'src/components/incheon/IncheonSeatMap.tsx',
  'src/components/jamsil/JamsilSeatMap.tsx',
  'src/components/sajik/SajikSeatMap.test.ts',
  'src/components/sajik/SajikSeatMap.tsx',
  'src/components/sajik/SajikSeatMapEditor.tsx',
  'src/components/sajik/SajikSeatMapSvg.tsx',
  'src/components/stadiumSeatMap/SeatMapAttribution.tsx',
  'src/components/stadiumSeatMap/SeatMapBottomSheet.tsx',
  'src/components/stadiumSeatMap/SeatMapDetailPanel.tsx',
  'src/components/stadiumSeatMap/SeatMapFilterBar.tsx',
  'src/components/stadiumSeatMap/SeatMapLegend.tsx',
  'src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx',
  'src/components/stadiumSeatMap/SeatMapTemplateShell.tsx',
  'src/components/stadiumSeatMap/seatMapCommonTypes.ts',
  'src/components/stadiumSeatMap/useSeatMapSelectionState.ts',
  'src/components/stadiumSeatMapRegistry.tsx',
  'src/components/suwon/SuwonSeatMap.tsx',
  'src/data/daeguSeatData.test.ts',
  'src/data/daeguSeatData.ts',
  'src/data/daejeonAnchorVisualBaseline.json',
  'src/data/daejeonGeometryBaseline.json',
  'src/data/daejeonSeatData.test.ts',
  'src/data/daejeonSeatData.ts',
  'src/data/sajikSeatData.test.ts',
  'src/data/sajikSeatData.ts',
  'src/data/sajikSeatMapDataset.ts',
  'src/data/suwonSeatData.test.ts',
  'src/data/suwonSeatData.ts',
  'src/utils/seatMapPolygonValidator.ts',
];

const includedRules = [
  {
    id: 'gwangju-release-docs',
    reason: 'Gwangju pre-operator release docs and runbook',
    match: (file) => file.startsWith('docs/gwangju-seatmap-'),
  },
  {
    id: 'gwangju-release-scripts',
    reason: 'Gwangju release, operator, manifest, and scope guard scripts',
    match: (file) => file.startsWith('scripts/gwangju-seatmap-'),
  },
  {
    id: 'gwangju-data-contract',
    reason: 'Gwangju seatmap data and tests contract',
    match: (file) => [
      'src/data/gwangjuSeatData.ts',
      'src/data/gwangjuSeatData.test.ts',
    ].includes(file),
  },
  {
    id: 'shared-static-seatmap-contract',
    reason: 'Static tests lock the Gwangju handoff contract',
    match: (file) => file === 'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
  },
  {
    id: 'package-script-contract',
    reason: 'Package scripts expose the Gwangju scope guard',
    match: (file) => file === 'package.json',
  },
  {
    id: 'gwangju-release-reports',
    reason: 'Generated Gwangju release, audit, and scope reports',
    match: (file) => file.startsWith('reports/stadium/gwangju-seatmap-'),
  },
  {
    id: 'build-verification-reports',
    reason: 'Build verification reports regenerated by npm run build',
    match: (file) => [
      'reports/bundle-guard-report.json',
      'reports/dist-assets-report.json',
    ].includes(file),
  },
];

const separateRules = [
  {
    id: 'daegu-files',
    reason: 'Daegu work is explicitly outside the Gwangju release handoff scope',
    match: (file) => (
      file.startsWith('docs/daegu-')
      || file.startsWith('scripts/daegu-')
      || file.startsWith('src/components/daegu/')
      || file.startsWith('src/data/daegu')
    ),
  },
  {
    id: 'daejeon-files',
    reason: 'Daejeon work is explicitly outside the Gwangju release handoff scope',
    match: (file) => (
      file.startsWith('docs/daejeon-')
      || file.startsWith('scripts/daejeon-')
      || file.startsWith('src/components/daejeon/')
      || file.startsWith('src/data/daejeon')
      || file.startsWith('reports/stadium/daejeon-')
    ),
  },
  {
    id: 'sajik-files',
    reason: 'Sajik work is explicitly outside the Gwangju release handoff scope',
    match: (file) => (
      file.startsWith('docs/sajik-')
      || file.startsWith('scripts/sajik-')
      || file.startsWith('src/components/sajik/')
      || file.startsWith('src/data/sajik')
    ),
  },
  {
    id: 'suwon-files',
    reason: 'Suwon work is explicitly outside the Gwangju release handoff scope',
    match: (file) => (
      file.startsWith('docs/suwon-')
      || file.startsWith('scripts/suwon-')
      || file.startsWith('src/components/suwon/')
      || file.startsWith('src/data/suwon')
    ),
  },
  {
    id: 'jamsil-files',
    reason: 'Jamsil work is explicitly outside the Gwangju release handoff scope',
    match: (file) => (
      file.startsWith('docs/jamsil-')
      || file.startsWith('scripts/jamsil-')
      || file.startsWith('src/components/jamsil/')
      || file.startsWith('src/data/jamsil')
    ),
  },
  {
    id: 'cross-stadium-utilities',
    reason: 'Shared or cross-stadium work is tracked separately from the Gwangju release handoff',
    match: (file) => [
      'docs/stadium-seatmap-standard-shell-pr-scope.md',
      'scripts/run-stadium-isolated-qa.mjs',
      'src/components/AppRoutes.tsx',
      'scripts/stadium-ux-audit.mjs',
      'src/components/DaejeonStadiumUxAuditContract.test.ts',
      'src/components/HomeRuntime.tsx',
      'src/components/StadiumGuideRuntime.tsx',
      'src/components/changwon/ChangwonBottomSheet.tsx',
      'src/components/changwon/ChangwonSeatMap.tsx',
      'src/components/daejeon/DaejeonBottomSheet.tsx',
      'src/components/daejeon/DaejeonSeatMap.tsx',
      'src/components/gocheok/GocheokBottomSheet.tsx',
      'src/components/gocheok/GocheokSeatMap.tsx',
      'src/components/gwangju/GwangjuBottomSheet.tsx',
      'src/components/gwangju/GwangjuSeatMap.tsx',
      'src/components/incheon/IncheonBottomSheet.tsx',
      'src/components/incheon/IncheonSeatMap.test.tsx',
      'src/components/incheon/IncheonSeatMap.tsx',
      'src/components/incheon/IncheonSeatMapSvg.tsx',
      'src/components/jamsil/JamsilSeatMap.tsx',
      'scripts/stadium-seatmap-standard-shell-pr-scope-guard.mjs',
      'src/components/stadiumSeatMap/SeatMapAttribution.tsx',
      'src/components/stadiumSeatMap/SeatMapBottomSheet.tsx',
      'src/components/stadiumSeatMap/SeatMapDetailPanel.tsx',
      'src/components/stadiumSeatMap/SeatMapFilterBar.tsx',
      'src/components/stadiumSeatMap/SeatMapLegend.tsx',
      'src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx',
      'src/components/stadiumSeatMap/SeatMapTemplateShell.tsx',
      'src/components/stadiumSeatMap/seatMapCommonTypes.ts',
      'src/components/stadiumSeatMap/useSeatMapSelectionState.ts',
      'src/components/stadiumSeatMapRegistry.tsx',
      'src/components/suwon/SuwonSeatMap.tsx',
      'src/data/incheonSeatData.test.ts',
      'src/data/incheonSeatData.ts',
      'src/data/incheonVisitGuide.test.ts',
      'src/data/incheonVisitGuide.ts',
      'src/utils/seatMapPolygonValidator.ts',
    ].includes(file),
  },
];

const requiredHandoffSnippets = [
  'Change Scope',
  'Gwangju pre-operator release package',
  'Separate dirty work that must not be judged by this handoff',
  'Daejeon files',
  'Sajik files',
  'Suwon files',
  'Daegu files',
  'Cross-stadium',
  'src/utils/seatMapPolygonValidator.ts',
  'release scope guard',
  'gwangju-seatmap-release-scope-guard.json',
  'gwangju-seatmap-release-scope-guard.md',
  'PR Packaging Manifest',
  'Release Candidate Inventory',
  'Included release candidate files: `19`',
  'Separate dirty work files:',
  'Separate dirty work baseline files: `95`',
  'Classified separate dirty work expansion allowed: `true`',
  'Inventory drift: `0`',
  'releaseCandidateInventory.expectedIncludedFileCount=19',
  'separateWorkInventory.expectedSeparateDirtyWorkCount baseline=95',
  'separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true',
  'prPackagingManifest.releasePayloadFileCount=19',
  'prPackagingManifest.separateDirtyWorkFileCount=',
  'prPackagingManifest.unexpectedDirtyFileCount=0',
  'prPackagingManifest.inventoryDriftCount=0',
  'Patch Separation Readiness',
  'patch separation readiness: `review-required`',
  'patchSeparationReadiness.status=review-required',
  'patchSeparationReadiness.mixedStatusFiles includes `package.json` with status `MM`',
  'patchSeparationReadiness must be reviewed before staging the release PR.',
  'PR staging plan',
  'gwangju-seatmap-pr-staging-plan.json',
  'gwangju-seatmap-pr-staging-plan.md',
  'gwangju-seatmap-pr-staging-review.json',
  'gwangju-seatmap-pr-staging-review.md',
  'stagingPlan.status=review-required',
  'stagingPlan.doesNotRunGitAdd=true',
  'stagingPlan.releasePayloadFileCount=19',
  'stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true',
  'stagingReview.status=review-required',
  'stagingReview.doesNotRunGitAdd=true',
  'stagingReview.safeToRunBulkGitAdd=false',
  'stagingReview.releasePayloadFileCount=19',
  'stagingReview.recommendsOnlyIncludedFiles=true',
  'stagingReview.doesNotRecommendSeparateDirtyWork=true',
  'RELEASE_CANDIDATE_FILE_MISSING',
  'CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED',
  'scripts/daegu-seatmap-p1-operator-readiness.mjs',
  'operator-provided official PNG coordinates only',
  'browser CSS pixels',
  'resized screenshots',
  'external crawling',
  'web-search-based baseball data',
  'third-party copied seatmap images',
  'MANUAL_BASEBALL_DATA_REQUIRED',
];

const requiredPackageSnippets = [
  '"stadium:gwangju:release-scope-guard"',
  'node --import tsx scripts/gwangju-seatmap-release-scope-guard.mjs',
  '"stadium:gwangju:pr-staging-plan"',
  'node --import tsx scripts/gwangju-seatmap-pr-staging-plan.mjs',
  '"stadium:gwangju:pr-staging-review"',
  'node --import tsx scripts/gwangju-seatmap-pr-staging-plan.mjs --review',
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

const diffFileList = (expected, actual) => {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return {
    missing: sorted(expected.filter((file) => !actualSet.has(file))),
    extra: sorted(actual.filter((file) => !expectedSet.has(file))),
  };
};

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
    reason: 'This dirty file is not documented as part of the Gwangju handoff scope or a separated workstream.',
  };
};

const readText = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
};

const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd: frontendRoot });
const dirtyEntries = stdout
  .split('\n')
  .map((line) => line.trimEnd())
  .filter(Boolean)
  .map(parseStatusLine)
  .map(classifyFile);

const releaseHandoffSource = await readText(path.join(frontendRoot, 'docs/gwangju-seatmap-release-handoff.md'));
const releaseLockSource = await readText(path.join(frontendRoot, 'docs/gwangju-seatmap-release-lock.md'));
const packageSource = await readText(path.join(frontendRoot, 'package.json'));

const missingHandoffSnippets = requiredHandoffSnippets.filter((snippet) => !releaseHandoffSource.includes(snippet));
const missingPackageSnippets = requiredPackageSnippets.filter((snippet) => !packageSource.includes(snippet));
const releaseLockMissingSnippets = [
  'scope guard',
  'npm run stadium:gwangju:release-scope-guard',
  'preoperator 통과 + postoperator blocked + scope guard 통과',
  'scopeGuardIncludedFiles=19',
  'scopeGuardSeparateDirtyWorkFiles=',
  'scopeGuardSeparateDirtyWorkBaselineFiles=95',
  'classifiedSeparateDirtyWorkExpansionAllowed=true',
  'expectedIncludedFileCount=19',
  'expectedSeparateDirtyWorkCount baseline=95',
  'prPackagingManifest.releasePayloadFileCount=19',
  'prPackagingManifest.separateDirtyWorkFileCount=',
  'patchSeparationReadiness.status=review-required',
  'package.json` with status `MM',
  'stagingPlan.status=review-required',
  'stagingPlan.doesNotRunGitAdd=true',
  'stagingReview.status=review-required',
  'stagingReview.doesNotRunGitAdd=true',
  'stagingReview.releasePayloadFileCount=19',
].filter((snippet) => !releaseLockSource.includes(snippet));

const unexpectedFiles = dirtyEntries.filter((entry) => entry.scope === 'unexpected');
const includedFiles = dirtyEntries.filter((entry) => entry.scope === 'included');
const separateDirtyWork = dirtyEntries.filter((entry) => entry.scope === 'separate');
const entriesByFile = new Map(dirtyEntries.map((entry) => [entry.file, entry]));
const includedInventoryDiff = diffFileList(
  expectedIncludedReleaseFiles,
  includedFiles.map((entry) => entry.file),
);
const separateInventoryDiff = diffFileList(
  expectedSeparateDirtyWorkFiles,
  separateDirtyWork.map((entry) => entry.file),
);
const classifiedAdditionalSeparateDirtyWorkFiles = separateInventoryDiff.extra;

const blockers = [
  ...unexpectedFiles.map((entry) => `UNCLASSIFIED_DIRTY_FILE:${entry.file}`),
  ...includedInventoryDiff.missing.map((file) => `RELEASE_CANDIDATE_FILE_MISSING:${file}`),
  ...includedInventoryDiff.extra.map((file) => `RELEASE_CANDIDATE_FILE_UNEXPECTED:${file}`),
  ...missingHandoffSnippets.map((snippet) => `HANDOFF_SCOPE_SNIPPET_MISSING:${snippet}`),
  ...missingPackageSnippets.map((snippet) => `PACKAGE_SCOPE_GUARD_SCRIPT_MISSING:${snippet}`),
  ...releaseLockMissingSnippets.map((snippet) => `RELEASE_LOCK_SCOPE_GUARD_SNIPPET_MISSING:${snippet}`),
];

const warnings = [
  ...separateDirtyWork.map((entry) => `SEPARATE_DIRTY_WORK:${entry.file}`),
  ...separateInventoryDiff.missing.map((file) => `SEPARATE_DIRTY_WORK_BASELINE_NOT_DIRTY:${file}`),
  ...classifiedAdditionalSeparateDirtyWorkFiles.map((file) => `CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED:${file}`),
];

const groupedSeparateCounts = separateDirtyWork.reduce((counts, entry) => ({
  ...counts,
  [entry.rule]: (counts[entry.rule] ?? 0) + 1,
}), {});

const groupedIncludedCounts = includedFiles.reduce((counts, entry) => ({
  ...counts,
  [entry.rule]: (counts[entry.rule] ?? 0) + 1,
}), {});

const isMixedGitStatus = (status) => status !== '??' && status[0] !== ' ' && status[1] !== ' ';
const mixedStatusFiles = includedFiles
  .filter((entry) => isMixedGitStatus(entry.status))
  .map((entry) => ({
    file: entry.file,
    status: entry.status,
    reason: 'Included release file has both index and worktree changes; review before staging.',
  }));
const untrackedIncludedFiles = includedFiles
  .filter((entry) => entry.status === '??')
  .map((entry) => ({
    file: entry.file,
    status: entry.status,
    reason: 'Included release file is untracked; review before staging.',
  }));
const patchSeparationFocusFiles = [
  {
    file: 'package.json',
    reason: 'Package script changes can be mixed with unrelated script work; current MM status requires manual review.',
  },
  {
    file: 'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    reason: 'Shared static test file contains multiple stadium contracts and should be reviewed before staging.',
  },
  {
    file: 'reports/bundle-guard-report.json',
    reason: 'Generated build report should be regenerated with the final release gate.',
  },
  {
    file: 'reports/dist-assets-report.json',
    reason: 'Generated build report should be regenerated with the final release gate.',
  },
];
const patchSeparationFocusRows = patchSeparationFocusFiles.map((focus) => {
  const entry = entriesByFile.get(focus.file);
  return {
    file: focus.file,
    status: entry?.status ?? '-',
    scope: entry?.scope ?? 'clean-or-missing',
    rule: entry?.rule ?? '-',
    reason: focus.reason,
  };
});
const patchSeparationReviewReasons = [
  ...mixedStatusFiles.map((entry) => `MIXED_GIT_STATUS:${entry.file}:${entry.status}`),
  ...untrackedIncludedFiles.map((entry) => `UNTRACKED_INCLUDED_FILE:${entry.file}`),
];
const patchSeparationStatus = blockers.length > 0
  ? 'blocked'
  : patchSeparationReviewReasons.length > 0
    ? 'review-required'
    : 'ready';

const inventoryRows = (expectedFiles, diff) => expectedFiles.map((file) => {
  const entry = entriesByFile.get(file);
  return [
    `\`${file}\``,
    `\`${entry?.status ?? '-'}\``,
    `\`${entry?.scope ?? 'missing'}\``,
    `\`${entry?.rule ?? '-'}\``,
    diff.missing.includes(file) ? '`missing`' : '`present`',
  ];
});

const report = {
  generatedAt: new Date().toISOString(),
  version: SCOPE_GUARD_VERSION,
  status: blockers.length === 0 ? 'passed' : 'blocked',
  doesNotModifyDataFile: true,
  prPackagingManifest: {
    status: blockers.length === 0 ? 'ready' : 'blocked',
    releasePayloadFileCount: expectedIncludedReleaseFiles.length,
    separateDirtyWorkFileCount: separateDirtyWork.length,
    separateDirtyWorkBaselineFileCount: expectedSeparateDirtyWorkFiles.length,
    classifiedSeparateDirtyWorkExpansionAllowed: true,
    unexpectedDirtyFileCount: unexpectedFiles.length,
    inventoryDriftCount: [
      ...includedInventoryDiff.missing,
      ...includedInventoryDiff.extra,
    ].length,
    sourceOfTruth: [
      'reports/stadium/gwangju-seatmap-release-scope-guard.json',
      'reports/stadium/gwangju-seatmap-release-scope-guard.md',
      'docs/gwangju-seatmap-release-handoff.md',
    ],
    releasePrScope: [
      'Gwangju pre-operator release package',
      'build verification reports',
    ],
    excludedPrScope: [
      'Daegu work',
      'Daejeon work',
      'Sajik work',
      'Suwon work',
      'cross-stadium utilities',
    ],
  },
  patchSeparationReadiness: {
    status: patchSeparationStatus,
    expectedReleasePayloadFileCount: expectedIncludedReleaseFiles.length,
    includedFileCount: includedFiles.length,
    mixedStatusFiles,
    untrackedIncludedFiles,
    reviewFocusFiles: patchSeparationFocusRows,
    reviewRequiredReasons: patchSeparationReviewReasons,
    manualReviewRequired: patchSeparationStatus === 'review-required',
    currentContract: 'MM package.json and other mixed/untracked included release files require manual review before staging.',
  },
  scopeContract: {
    releaseMode: 'PRE_OPERATOR_DERIVED_RANGE_RELEASE',
    activeBlockCount: 111,
    postOperatorBeforeWrite: 'blocked',
    k7AwayAggregateHitArea: 'OPERATOR_REQUIRED',
  },
  sourcePolicy,
  summary: {
    dirtyFileCount: dirtyEntries.length,
    includedFileCount: includedFiles.length,
    separateDirtyWorkCount: separateDirtyWork.length,
    unexpectedFileCount: unexpectedFiles.length,
    blockerCount: blockers.length,
    warningCount: warnings.length,
  },
  releaseCandidateInventory: {
    expectedIncludedFileCount: expectedIncludedReleaseFiles.length,
    actualIncludedFileCount: includedFiles.length,
    missingExpectedIncludedFiles: includedInventoryDiff.missing,
    extraIncludedFiles: includedInventoryDiff.extra,
    expectedIncludedReleaseFiles,
    groupedIncludedCounts,
  },
  separateWorkInventory: {
    expectedSeparateDirtyWorkCount: expectedSeparateDirtyWorkFiles.length,
    actualSeparateDirtyWorkCount: separateDirtyWork.length,
    missingExpectedSeparateDirtyWorkFiles: separateInventoryDiff.missing,
    extraSeparateDirtyWorkFiles: separateInventoryDiff.extra,
    classifiedSeparateDirtyWorkExpansionAllowed: true,
    classifiedAdditionalSeparateDirtyWorkFiles,
    classifiedAdditionalSeparateDirtyWorkCount: classifiedAdditionalSeparateDirtyWorkFiles.length,
    expectedSeparateDirtyWorkFiles,
    groupedSeparateCounts,
  },
  groupedIncludedCounts,
  groupedSeparateCounts,
  includedFiles,
  separateDirtyWork,
  unexpectedFiles,
  requiredChecks: {
    missingHandoffSnippets,
    missingPackageSnippets,
    releaseLockMissingSnippets,
  },
  blockers,
  warnings,
};

const markdown = [
  '# 광주 release scope guard',
  '',
  `- version: \`${SCOPE_GUARD_VERSION}\``,
  `- status: \`${report.status}\``,
  `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
  '- release mode: `PRE_OPERATOR_DERIVED_RANGE_RELEASE`',
  '- active block count: `111`',
  '- post-operator before write: `blocked`',
  '- K7/AWAY aggregate hit-area: `OPERATOR_REQUIRED`',
  '- source coordinate system: `2200x1159`',
  '- missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`',
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
  `- status: \`${report.patchSeparationReadiness.status}\``,
  `- manual review required: \`${report.patchSeparationReadiness.manualReviewRequired}\``,
  `- mixed status files: \`${mixedStatusFiles.length}\``,
  `- untracked included files: \`${untrackedIncludedFiles.length}\``,
  '- `MM package.json` and other mixed/untracked included release files must be reviewed before staging the release PR.',
  '',
  patchSeparationReviewReasons.length > 0
    ? patchSeparationReviewReasons.map((reason) => `- \`${reason}\``).join('\n')
    : 'No patch separation review reasons.',
  '',
  '### Patch Review Focus Files',
  '',
  markdownTable(
    ['file', 'git status', 'scope', 'rule', 'reason'],
    patchSeparationFocusRows.map((entry) => [
      `\`${entry.file}\``,
      `\`${entry.status}\``,
      `\`${entry.scope}\``,
      `\`${entry.rule}\``,
      entry.reason,
    ]),
  ),
  '',
  '## PR Packaging Manifest',
  '',
  '- Source of truth: `gwangju-seatmap-release-scope-guard.json`, `gwangju-seatmap-release-scope-guard.md`, and `docs/gwangju-seatmap-release-handoff.md`.',
  '- Release PR scope: Gwangju pre-operator release package and build verification reports.',
  '- Excluded PR scope: Daegu work, Daejeon work, Sajik work, Suwon work, and cross-stadium utilities.',
  `- Release payload files: \`${expectedIncludedReleaseFiles.length}\``,
  `- Separate dirty work files: \`${separateDirtyWork.length}\``,
  `- Separate dirty work baseline files: \`${expectedSeparateDirtyWorkFiles.length}\``,
  '- Classified separate dirty work expansion allowed: `true`',
  `- Unexpected dirty files: \`${unexpectedFiles.length}\``,
  `- Inventory drift: \`${report.prPackagingManifest.inventoryDriftCount}\``,
  '',
  '## Release Candidate Inventory',
  '',
  markdownTable(
    ['metric', 'value'],
    [
      ['expected included release files', `\`${expectedIncludedReleaseFiles.length}\``],
      ['actual included release files', `\`${includedFiles.length}\``],
      ['missing expected included files', `\`${includedInventoryDiff.missing.length}\``],
      ['extra included files', `\`${includedInventoryDiff.extra.length}\``],
      ['expected separate dirty work files', `\`${expectedSeparateDirtyWorkFiles.length}\``],
      ['actual separate dirty work files', `\`${separateDirtyWork.length}\``],
      ['missing expected separate dirty work files', `\`${separateInventoryDiff.missing.length}\``],
      ['classified additional separate dirty work files', `\`${classifiedAdditionalSeparateDirtyWorkFiles.length}\``],
      ['classified separate dirty work expansion allowed', '`true`'],
      ['unexpected dirty files', `\`${unexpectedFiles.length}\``],
    ],
  ),
  '',
  '### Expected Included Release Files',
  '',
  markdownTable(
    ['file', 'git status', 'scope', 'rule', 'state'],
    inventoryRows(expectedIncludedReleaseFiles, includedInventoryDiff),
  ),
  '',
  '### Separate Workstream Baseline',
  '',
  markdownTable(
    ['file', 'git status', 'scope', 'rule', 'state'],
    inventoryRows(expectedSeparateDirtyWorkFiles, separateInventoryDiff),
  ),
  '',
  '## Included Gwangju Release Scope',
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
  '## Source Policy',
  '',
  '- Allowed coordinate source: operator-provided official PNG coordinates only.',
  '- Allowed coordinate system: original official PNG `2200x1159`.',
  '- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.',
  '- Missing or unclear baseball operating data keeps `MANUAL_BASEBALL_DATA_REQUIRED`.',
  '',
].join('\n');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`scope_guard_json:${jsonPath}`);
console.log(`scope_guard_markdown:${markdownPath}`);
console.log(`status:${report.status} included=${includedFiles.length} separate=${separateDirtyWork.length} unexpected=${unexpectedFiles.length} blockers=${blockers.length}`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
