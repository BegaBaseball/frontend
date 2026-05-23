import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const jsonPath = path.join(reportDir, 'stadium-seatmap-standard-shell-pr-scope-guard.json');
const markdownPath = path.join(reportDir, 'stadium-seatmap-standard-shell-pr-scope-guard.md');

const SCOPE_GUARD_VERSION = 'STADIUM_STANDARD_SHELL_PR_SCOPE_GUARD_V1';

const expectedIncludedFiles = [
  'docs/stadium-seatmap-standard-shell-pr-scope.md',
  'package.json',
  'scripts/stadium-seatmap-standard-shell-pr-scope-guard.mjs',
  'src/components/StadiumGuideRuntime.tsx',
  'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
  'src/components/changwon/ChangwonBottomSheet.tsx',
  'src/components/changwon/ChangwonSeatMap.tsx',
  'src/components/daegu/DaeguBottomSheet.tsx',
  'src/components/daegu/DaeguSeatMap.tsx',
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
  'src/components/jamsil/JamsilBottomSheet.tsx',
  'src/components/jamsil/JamsilSeatMap.tsx',
  'src/components/jamsil/JamsilSidePanelV2.tsx',
  'src/components/sajik/SajikBottomSheet.tsx',
  'src/components/sajik/SajikSeatMap.tsx',
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
  'src/components/suwon/SuwonBottomSheet.tsx',
  'src/components/suwon/SuwonSeatMap.tsx',
  'src/data/incheonSeatData.test.ts',
  'src/data/incheonSeatData.ts',
  'src/data/incheonVisitGuide.test.ts',
  'src/data/incheonVisitGuide.ts',
  'src/data/jamsilSeatData.test.ts',
];

const partialStagingRequiredFiles = [
  {
    file: 'package.json',
    reason: 'Package scripts contain unrelated Gwangju, Daegu, Sajik, and Suwon release/operator script additions.',
    includeOnly: [
      'stadium:seatmap:standard-shell-pr-scope-guard',
    ],
    exclude: [
      'stadium:gwangju:*',
      'qa:stadium:gwangju:*',
      'stadium:daegu:*',
      'qa:stadium:daegu:*',
      'stadium:sajik:*',
      'qa:stadium:sajik:*',
      'stadium:suwon:*',
      'qa:stadium:suwon:*',
    ],
    hunkGuide: [
      'Stage only the added stadium:seatmap:standard-shell-pr-scope-guard script line.',
      'Skip Gwangju, Daegu, Sajik, and Suwon release/operator/QA script additions.',
    ],
  },
  {
    file: 'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    reason: 'The shared contract file contains standard shell guards plus separate release-lock/operator assertions.',
    includeOnly: [
      'standard shellTemplate assertions',
      'legacy/jamsil-template/isDoosanGuideActive absence assertions',
      'shared SeatMapBottomSheet guard assertions',
      'Incheon guide removal assertions',
      'stadium guide hero description full-width guard',
      'standard shell PR scope guard assertions when added',
    ],
    exclude: [
      'Gwangju release/operator assertions',
      'Daejeon release/anchor assertions',
      'Daegu precision/operator assertions',
      'Sajik polygon/editor/release-lock assertions',
      'Suwon release-lock assertions',
    ],
    hunkGuide: [
      'Stage standard shellTemplate, legacy naming absence, shared SeatMapBottomSheet, Incheon guide removal, secondary panel allowlist, hero full-width, and common UI contract tests.',
      'Skip hunks containing release-lock, operator, precision, polygon-v2, stage01, DaejeonStadiumUxAuditContract, or stadium-ux-audit assertions.',
    ],
  },
  {
    file: 'src/components/daegu/DaeguSeatMap.tsx',
    reason: 'Daegu shell migration is mixed with normal-selectable/review-only precision workflow changes.',
    includeOnly: [
      'shared filter/legend/attribution/detail/bottom-sheet wiring',
      'SeatMapTemplateShell secondary panel slot wiring for existing finder',
    ],
    exclude: [
      'review-only or marker-only precision behavior that depends on Daegu operator data changes',
    ],
    hunkGuide: [
      'Stage shared SeatMapAttribution, SeatMapBottomSheet, SeatMapDetailPanel, SeatMapFilterBar, SeatMapLegend, SeatMapSectionAdapter, and useSeatMapSelectionState wiring.',
      'Stage only the shell slot plumbing that keeps the existing Daegu finder in mobileSecondaryPanel and desktopSecondaryPanel.',
      'Skip isDaeguNormalSelectableSeat, selectableDaeguBlocks, selectableDaeguBlockIds, review-only/marker-only selection limits, and operator precision data dependent filter/count changes.',
    ],
  },
  {
    file: 'src/components/gwangju/GwangjuSeatMap.tsx',
    reason: 'Gwangju shell migration is mixed with release/operator derived-range metadata.',
    includeOnly: [
      'shared filter/legend/attribution/detail/bottom-sheet wiring',
      'existing Gwangju derived range panel preserved through shell slots',
    ],
    exclude: [
      'new release/operator data contract changes unrelated to shell consistency',
    ],
    hunkGuide: [
      'Stage shared filter, legend, attribution, detail panel, bottom sheet, adapter, selection state, and isAuxiliaryGuideActive shell wiring.',
      'Stage only the existing derived range summary connection when it is preserved through standard shell slots.',
      'Skip Gwangju release/operator data contract, precision workset, and low-margin candidate changes.',
    ],
  },
  {
    file: 'src/components/sajik/SajikSeatMap.tsx',
    reason: 'Sajik shell migration keeps the first-visit guide slot, while polygon/editor work is separate.',
    includeOnly: [
      'shared filter/legend/attribution/detail/bottom-sheet wiring',
      'first-visit guide preserved through secondaryPanel slots',
    ],
    exclude: [
      'Sajik polygon v2 editor, route, dataset, and marker-only transition work',
    ],
    hunkGuide: [
      'Stage shared filter, legend, attribution, detail panel, bottom sheet, adapter, selection state, and isAuxiliaryGuideActive shell wiring.',
      'Stage only the shell slot plumbing that keeps the existing first-visit guide in mobileSecondaryPanel and desktopSecondaryPanel.',
      'Skip Sajik polygon v2 editor, route, dataset, marker-only transition, and release-lock changes.',
    ],
  },
];

const generatedOrRegenerateLaterFiles = [
  'reports/bundle-guard-report.json',
  'reports/dist-assets-report.json',
];

const includedRules = [
  {
    id: 'standard-shell-pr-scope-doc',
    reason: 'Tracked PR scope checklist for the standard shell split',
    match: (file) => file === 'docs/stadium-seatmap-standard-shell-pr-scope.md',
  },
  {
    id: 'standard-shell-runtime',
    reason: 'Runtime and registry standard shell contract',
    match: (file) => [
      'src/components/StadiumGuideRuntime.tsx',
      'src/components/stadiumSeatMapRegistry.tsx',
    ].includes(file),
  },
  {
    id: 'standard-shell-common-components',
    reason: 'Shared seat map frame, filter, legend, attribution, detail panel, bottom sheet, and selection state',
    match: (file) => file.startsWith('src/components/stadiumSeatMap/'),
  },
  {
    id: 'stadium-seatmap-components',
    reason: 'Per-stadium seatmap components migrated to the standard shell',
    match: (file) => [
      'src/components/changwon/ChangwonSeatMap.tsx',
      'src/components/daegu/DaeguSeatMap.tsx',
      'src/components/daejeon/DaejeonSeatMap.tsx',
      'src/components/gocheok/GocheokSeatMap.tsx',
      'src/components/gwangju/GwangjuSeatMap.tsx',
      'src/components/incheon/IncheonSeatMap.tsx',
      'src/components/incheon/IncheonSeatMapSvg.tsx',
      'src/components/jamsil/JamsilSeatMap.tsx',
      'src/components/sajik/SajikSeatMap.tsx',
      'src/components/suwon/SuwonSeatMap.tsx',
    ].includes(file),
  },
  {
    id: 'dedicated-bottom-sheet-removal',
    reason: 'Dedicated stadium bottom sheets and Jamsil legacy side panel are replaced by shared components',
    match: (file) => /^src\/components\/(changwon|daegu|daejeon|gocheok|gwangju|incheon|jamsil|sajik|suwon)\/.+(BottomSheet|SidePanelV2)\.tsx$/.test(file),
  },
  {
    id: 'incheon-guide-removal',
    reason: 'Incheon first-visit guide and visit quick actions are removed from the standard shell PR',
    match: (file) => [
      'src/components/incheon/IncheonSeatMap.test.tsx',
      'src/data/incheonSeatData.test.ts',
      'src/data/incheonSeatData.ts',
      'src/data/incheonVisitGuide.test.ts',
      'src/data/incheonVisitGuide.ts',
    ].includes(file),
  },
  {
    id: 'shared-contract-tests',
    reason: 'Static contract tests for standard shell and Incheon guide removal',
    match: (file) => [
      'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
      'src/data/jamsilSeatData.test.ts',
    ].includes(file),
  },
  {
    id: 'scope-guard-package-contract',
    reason: 'Package script exposes the standard shell PR scope guard',
    match: (file) => [
      'package.json',
      'scripts/stadium-seatmap-standard-shell-pr-scope-guard.mjs',
    ].includes(file),
  },
];

const separateRules = [
  {
    id: 'generated-build-reports',
    reason: 'Build reports should be regenerated after isolating the target PR branch.',
    match: (file) => generatedOrRegenerateLaterFiles.includes(file),
  },
  {
    id: 'daegu-release-operator-work',
    reason: 'Daegu precision, release, and operator workflow belongs in a separate PR.',
    match: (file) => file.startsWith('docs/daegu-')
      || file.startsWith('scripts/daegu-')
      || file === 'src/components/daegu/DaeguSeatMapSvg.tsx'
      || file.startsWith('src/data/daegu'),
  },
  {
    id: 'daejeon-release-anchor-work',
    reason: 'Daejeon release lock, anchor, and geometry baseline work belongs in a separate PR.',
    match: (file) => file.startsWith('docs/daejeon-')
      || file.startsWith('scripts/daejeon-')
      || file === 'src/components/DaejeonStadiumUxAuditContract.test.ts'
      || file.startsWith('src/data/daejeon'),
  },
  {
    id: 'gwangju-release-operator-work',
    reason: 'Gwangju release, operator, and precision workflow belongs in a separate PR.',
    match: (file) => file.startsWith('docs/gwangju-')
      || file.startsWith('scripts/gwangju-')
      || file.startsWith('src/data/gwangju'),
  },
  {
    id: 'sajik-polygon-editor-work',
    reason: 'Sajik polygon v2, editor, dataset, and release-lock work belongs in a separate PR.',
    match: (file) => file.startsWith('docs/sajik-')
      || file.startsWith('scripts/sajik-')
      || file === 'src/components/AppRoutes.tsx'
      || file === 'src/components/sajik/SajikSeatMap.test.ts'
      || file === 'src/components/sajik/SajikSeatMapEditor.tsx'
      || file === 'src/components/sajik/SajikSeatMapSvg.tsx'
      || file.startsWith('src/data/sajik')
      || file === 'src/utils/seatMapPolygonValidator.ts',
  },
  {
    id: 'suwon-release-lock-work',
    reason: 'Suwon release lock, visual review, and geometry QA belongs in a separate PR.',
    match: (file) => file.startsWith('docs/suwon-')
      || file.startsWith('scripts/suwon-')
      || file.startsWith('src/data/suwon'),
  },
  {
    id: 'shared-qa-runner-diagnostics',
    reason: 'Generic isolated QA runner diagnostics can travel separately from the shell UI PR.',
    match: (file) => file === 'scripts/run-stadium-isolated-qa.mjs',
  },
  {
    id: 'shared-browser-qa-precision-work',
    reason: 'Browser QA changes here are tied to Daegu, Sajik, and Suwon precision work.',
    match: (file) => file === 'scripts/stadium-ux-audit.mjs',
  },
];

function normalizeStatusFile(rawFile) {
  const renameSeparator = ' -> ';
  return rawFile.includes(renameSeparator)
    ? rawFile.slice(rawFile.indexOf(renameSeparator) + renameSeparator.length)
    : rawFile;
}

async function getGitStatusEntries() {
  const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd: frontendRoot });
  return stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2),
      file: normalizeStatusFile(line.slice(3)),
      raw: line,
    }));
}

function firstMatch(rules, file) {
  return rules.find((rule) => rule.match(file)) ?? null;
}

function classifyEntry(entry) {
  const partial = partialStagingRequiredFiles.find((item) => item.file === entry.file) ?? null;
  const includedRule = firstMatch(includedRules, entry.file);
  const separateRule = firstMatch(separateRules, entry.file);

  if (partial && includedRule) {
    return {
      kind: 'partial-review',
      ruleId: includedRule.id,
      reason: partial.reason,
      partial,
    };
  }

  if (includedRule) {
    return {
      kind: 'included',
      ruleId: includedRule.id,
      reason: includedRule.reason,
    };
  }

  if (separateRule) {
    return {
      kind: separateRule.id === 'generated-build-reports' ? 'regenerate-later' : 'separate',
      ruleId: separateRule.id,
      reason: separateRule.reason,
    };
  }

  return {
    kind: 'unexpected',
    ruleId: 'unexpected',
    reason: 'No standard shell PR scope rule matched this dirty file.',
  };
}

function groupByKind(classifiedEntries) {
  return classifiedEntries.reduce((groups, entry) => {
    groups[entry.kind] ??= [];
    groups[entry.kind].push(entry);
    return groups;
  }, {});
}

function diffSet(expected, actual) {
  const actualSet = new Set(actual);
  return {
    missing: expected.filter((file) => !actualSet.has(file)).sort(),
    extra: actual.filter((file) => !expected.includes(file)).sort(),
  };
}

function quotePathForShell(file) {
  return JSON.stringify(file);
}

function chunkValues(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function buildGitAddCommands(files) {
  return chunkValues(files, 8)
    .map((chunk) => `git add -- ${chunk.map(quotePathForShell).join(' ')}`);
}

function buildStagingManifest({
  included,
  partialReview,
  regenerateLater,
}) {
  const wholeFileCandidateFiles = included.map((entry) => entry.file).sort();
  const partialReviewFiles = partialReview.map((entry) => entry.file).sort();
  const regenerateLaterFiles = regenerateLater.map((entry) => entry.file).sort();

  return {
    doesNotRunGitAdd: true,
    safeToRunBulkGitAdd: false,
    requiresManualHunkReview: partialReviewFiles.length > 0,
    wholeFileCandidateFiles,
    partialReviewFiles,
    regenerateLaterFiles,
    wholeFileAddCommands: buildGitAddCommands(wholeFileCandidateFiles),
    partialReviewCommands: partialReviewFiles.map((file) => `git add -p -- ${quotePathForShell(file)}`),
    postStageReviewCommands: [
      'git diff --cached --name-status',
      'git diff --cached --check',
      'npm run stadium:seatmap:standard-shell-pr-scope-guard',
      'node --import tsx --test --test-concurrency=1 --test-name-pattern "StadiumGuideRuntime|좌석도 registry|인천 전용 guide|구장별 전용 모바일|구장별 secondary|좌석도 공통 UI" src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    ],
    partialStagingRequiredFiles,
    forbiddenCommands: [
      'git add .',
      'git add -A',
    ],
  };
}

function formatEntryList(entries) {
  if (entries.length === 0) return ['- none'];
  return entries.map((entry) => `- ${entry.status} ${entry.file} (${entry.ruleId})`);
}

function formatCommandList(commands) {
  if (commands.length === 0) return ['- none'];
  return commands.map((command) => `- \`${command}\``);
}

function formatPartialReviewList(entries) {
  if (entries.length === 0) return ['- none'];
  return entries.flatMap((entry) => {
    const lines = [
    `- ${entry.status} ${entry.file}`,
    `  - reason: ${entry.reason}`,
    `  - include only: ${entry.partial.includeOnly.join('; ')}`,
    `  - exclude: ${entry.partial.exclude.join('; ')}`,
    ];
    if (entry.partial.hunkGuide?.length > 0) {
      lines.push(`  - hunk guide: ${entry.partial.hunkGuide.join(' ')}`);
    }
    return lines;
  });
}

function buildMarkdown(report) {
  return [
    '# Stadium seatmap standard shell PR scope guard',
    '',
    `- version: \`${report.version}\``,
    `- status: \`${report.status}\``,
    `- dirty files: \`${report.summary.dirtyFileCount}\``,
    `- included whole-file candidates: \`${report.summary.includedCount}\``,
    `- partial review candidates: \`${report.summary.partialReviewCount}\``,
    `- separate PR files: \`${report.summary.separateCount}\``,
    `- regenerate later files: \`${report.summary.regenerateLaterCount}\``,
    `- unexpected files: \`${report.summary.unexpectedCount}\``,
    `- expected standard shell files not currently dirty: \`${report.summary.notDirtyExpectedCount}\``,
    `- safe to bulk git add: \`${report.stagingManifest.safeToRunBulkGitAdd}\``,
    `- requires manual hunk review: \`${report.stagingManifest.requiresManualHunkReview}\``,
    '',
    '## Include In Standard Shell PR',
    '',
    ...formatEntryList(report.included),
    '',
    '## Partial Hunk Review',
    '',
    ...formatPartialReviewList(report.partialReview),
    '',
    '## Keep Out Of Standard Shell PR',
    '',
    ...formatEntryList(report.separate),
    '',
    '## Regenerate After Isolation',
    '',
    ...formatEntryList(report.regenerateLater),
    '',
    '## Staging Plan',
    '',
    `- does not run git add: \`${report.stagingManifest.doesNotRunGitAdd}\``,
    `- safe to bulk git add: \`${report.stagingManifest.safeToRunBulkGitAdd}\``,
    `- requires manual hunk review: \`${report.stagingManifest.requiresManualHunkReview}\``,
    '',
    '### Whole-File Add Commands',
    '',
    ...formatCommandList(report.stagingManifest.wholeFileAddCommands),
    '',
    '### Partial Review Commands',
    '',
    ...formatCommandList(report.stagingManifest.partialReviewCommands),
    '',
    '### Post-Stage Review Commands',
    '',
    ...formatCommandList(report.stagingManifest.postStageReviewCommands),
    '',
    '## Unexpected',
    '',
    ...formatEntryList(report.unexpected),
    '',
    '## Expected Included Inventory Check',
    '',
    `- expected included files: \`${report.expectedIncludedInventory.expectedCount}\``,
    `- actual included or partial files: \`${report.expectedIncludedInventory.actualCount}\``,
    `- expected files not currently dirty: \`${report.expectedIncludedInventory.missing.length}\``,
    `- extra included files: \`${report.expectedIncludedInventory.extra.length}\``,
    '- clean expected files are not packaging blockers; this guard classifies the current dirty inventory.',
    '',
    '## Verification Commands',
    '',
    ...report.verificationCommands.map((command) => `- \`${command}\``),
    '',
    '## Staging Notes',
    '',
    '- This guard does not run git add.',
    '- Do not bulk-stage the mixed worktree.',
    '- Clean expected standard shell files are reported for visibility, not treated as blockers.',
    '- Stage whole-file included entries only after reviewing partial-review files.',
    '- Regenerate build reports after the standard shell branch is isolated.',
    '',
  ].join('\n');
}

async function main() {
  const statusEntries = await getGitStatusEntries();
  const classifiedEntries = statusEntries
    .map((entry) => ({ ...entry, ...classifyEntry(entry) }))
    .sort((left, right) => left.file.localeCompare(right.file));
  const groups = groupByKind(classifiedEntries);
  const included = groups.included ?? [];
  const partialReview = groups['partial-review'] ?? [];
  const separate = groups.separate ?? [];
  const regenerateLater = groups['regenerate-later'] ?? [];
  const unexpected = groups.unexpected ?? [];
  const actualIncludedOrPartial = [...included, ...partialReview].map((entry) => entry.file).sort();
  const expectedIncludedInventory = {
    expectedCount: expectedIncludedFiles.length,
    actualCount: actualIncludedOrPartial.length,
    ...diffSet(expectedIncludedFiles, actualIncludedOrPartial),
  };
  const stagingManifest = buildStagingManifest({
    included,
    partialReview,
    regenerateLater,
  });
  const blockers = [
    ...unexpected.map((entry) => ({
      file: entry.file,
      reason: entry.reason,
    })),
    ...expectedIncludedInventory.extra.map((file) => ({
      file,
      reason: 'File was classified as standard shell PR work but is not in the expected included inventory.',
    })),
  ];
  const report = {
    version: SCOPE_GUARD_VERSION,
    status: blockers.length === 0 ? 'passed' : 'blocked',
    summary: {
      dirtyFileCount: statusEntries.length,
      includedCount: included.length,
      partialReviewCount: partialReview.length,
      separateCount: separate.length,
      regenerateLaterCount: regenerateLater.length,
      unexpectedCount: unexpected.length,
      notDirtyExpectedCount: expectedIncludedInventory.missing.length,
      blockerCount: blockers.length,
    },
    stagingManifest: {
      ...stagingManifest,
    },
    expectedIncludedInventory,
    included,
    partialReview,
    separate,
    regenerateLater,
    unexpected,
    blockers,
    verificationCommands: [
      'npm run stadium:seatmap:standard-shell-pr-scope-guard',
      'npm run test:stadium:seatmaps',
      'npm run qa:stadium:mobile:smoke',
      'npm run build',
    ],
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, buildMarkdown(report), 'utf8');

  console.log(`[standard-shell-pr-scope-guard] status=${report.status} dirty=${report.summary.dirtyFileCount} included=${report.summary.includedCount} partial=${report.summary.partialReviewCount} separate=${report.summary.separateCount} regenerateLater=${report.summary.regenerateLaterCount} unexpected=${report.summary.unexpectedCount}`);
  console.log(`[standard-shell-pr-scope-guard] report=${path.relative(frontendRoot, markdownPath)}`);

  if (report.status !== 'passed') {
    console.error(`[standard-shell-pr-scope-guard] blockers=${blockers.length}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
