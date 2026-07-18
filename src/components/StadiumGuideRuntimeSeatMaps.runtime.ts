import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { KBO_STADIUMS } from '../utils/stadiumData';
import {
  resolveStadiumSeatMapEntry,
  STADIUM_SEAT_MAP_ENTRIES,
} from './stadiumSeatMapRegistry';
import { DAEGU_CANONICAL_BLOCKS } from '../data/daeguCanonicalSeatMap';
import {
  SUWON_ALIGNMENT_PROBES,
  SUWON_BROWSER_QA_PROBES,
  SUWON_BLOCKS,
  SUWON_HIT_TEST_PROBES,
} from '../data/suwonSeatData';
import {
  filterAndRankDaeguSeatMapBlocks,
  rankDaeguSeatMapSearchResult,
} from './daegu/daeguSeatMapSearch';
import {
  OPERATIONAL_STADIUM_SEAT_MAP_ENTRIES,
  STADIUM_SEATMAP_CONTRACTS,
  STADIUM_TEAM_FALLBACK_CASES,
  diffSet,
  formatProbeDiffByBlock,
  projectRoot,
  probeKey,
  readImageDimensions,
  readProjectFile,
  snapshotSuwonProbeKeySets,
  snapshotSuwonSeatFixture,
  splitProbeKeysByBlock,
  suwonFixtureSignature,
  uniqueSorted,
} from './StadiumGuideRuntimeSeatMaps.support';

test('Stadium QA runner는 stale summary를 정리하고 실패한 target을 다음 포트에서 재시도한다', () => {
  const packageSource = readProjectFile('package.json');
  const qaPresetsSource = readProjectFile('scripts/qa-presets.mjs');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');

  assert.ok(fs.existsSync(path.join(projectRoot, 'scripts/stadium-ux-audit.mjs')), 'tracked stadium UX audit script should exist inside the frontend repo');
  assert.ok(runnerSource.includes("path.join(frontendRoot, 'scripts/stadium-ux-audit.mjs')"), 'runner should execute the tracked audit script');
  assert.ok(packageSource.includes('"qa:stadium:mobile:attached": "node scripts/qa-presets.mjs stadium-mobile attached"'), 'attached QA scripts should use the public qa-presets dispatcher');
  assert.ok(qaPresetsSource.includes("nodeStep(['scripts/stadium-ux-audit.mjs']"), 'attached QA presets should execute the tracked audit script');
  assert.ok(runnerSource.includes('clearSummaryFiles(outputDir)'), 'runner should clear stale summary files before a target starts');
  assert.ok(runnerSource.includes('stadium-mobile-smoke-summary.json'), 'runner should clear stale JSON summaries');
  assert.ok(runnerSource.includes('failed on port=${port}; retrying once on next available port'), 'runner should retry failed targets');
  assert.ok(runnerSource.includes('port = await resolveTargetPort(port + 1)'), 'runner retry should move to the next available port');
});

test('StadiumGuideRuntime은 registry, 중립 스켈레톤, 수동 데이터 상태로 좌석도 패널을 렌더링한다', () => {
  const runtimeSource = readProjectFile('src/components/StadiumGuideRuntime.tsx');
  const runtimeShellSource = readProjectFile('src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx');

  assert.ok(runtimeSource.includes('resolveStadiumSeatMapEntry'), 'runtime should resolve seat maps through registry');
  assert.ok(runtimeSource.includes('SeatMapRuntimeShell'), 'runtime should delegate to shared runtime shell');
  assert.ok(runtimeSource.includes('usesCoordinateGeometry'), 'runtime should branch on coordinate geometry exclusion metadata');
  assert.ok(runtimeSource.includes('shellResetKey'), 'runtime should preserve shell-aware reset key contract for runtime shell errors');
  assert.ok(runtimeSource.includes('seatMapEntry.shellTemplate'), 'runtime should pass shell template metadata to runtime shell');
  assert.ok(runtimeSource.includes('StadiumSeatMapManualRequired'), 'runtime should show manual-data-required state when no entry resolves');
  assert.ok(runtimeSource.includes('<SeatMapComponent />'), 'runtime should render the resolved registry component');
  assert.ok(runtimeSource.includes('w-full max-w-none text-sm leading-relaxed'), 'runtime hero description should use the full hero card width');
  assert.ok(!runtimeSource.includes('max-w-xl text-sm leading-relaxed'), 'runtime hero description should not be constrained to half-width on desktop');
  assert.ok(runtimeShellSource.includes('StadiumSeatMapLoadingSkeleton'), 'shared runtime shell should provide neutral loading skeleton');
  assert.ok(runtimeShellSource.includes('StadiumSeatMapErrorBoundary'), 'shared runtime shell should isolate seat map render/import errors');
  assert.ok(runtimeShellSource.includes('StadiumSeatMapErrorFallback'), 'shared runtime shell should provide retry fallback');
  assert.ok(!runtimeShellSource.includes('window.location.reload'), 'shared runtime shell should not force reload on unknown template');
  assert.ok(!runtimeSource.includes("from './ui/StadiumSeatMap'"), 'runtime should not import the removed common SVG seat map');
  assert.ok(!runtimeSource.includes('resolveStadiumSeatMapPresetMeta'), 'runtime should not use removed preset meta resolver');
});

test('좌석도 registry는 좌표 기반 QA 메타데이터와 표준 shell 계약을 유지한다', () => {
  const registrySource = readProjectFile('src/components/stadiumSeatMapRegistry.tsx');
  const runtimeSource = readProjectFile('src/components/StadiumGuideRuntime.tsx');
  const runtimeShellSource = readProjectFile('src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx');
  const templateSource = readProjectFile('src/components/stadiumSeatMap/SeatMapTemplateShell.tsx');
  const coordinateTemplates = STADIUM_SEAT_MAP_ENTRIES.filter((entry) => entry.usesCoordinateGeometry);
  const nonCoordinateTemplateEntries = STADIUM_SEAT_MAP_ENTRIES.filter((entry) => entry.isNonCoordinateMap);
  const nonCoordinateGeometryEntries = STADIUM_SEAT_MAP_ENTRIES.filter((entry) => !entry.usesCoordinateGeometry);

  assert.ok(coordinateTemplates.length > 0, 'there should be at least one coordinate geometry based seat map');
  assert.ok(registrySource.includes("export type StadiumSeatMapShellTemplate = 'standard'"), 'registry should keep the single standard shell type');
  assert.ok(runtimeSource.includes('seatMapEntry.usesCoordinateGeometry'), 'runtime should keep QA/audit coordinate metadata wired');
  assert.ok(runtimeSource.includes('seatMapEntry.shellTemplate'), 'runtime should keep shell template metadata wired');

  STADIUM_SEAT_MAP_ENTRIES.forEach((entry) => {
    assert.equal(entry.shellTemplate, 'standard', `${entry.id} should use the standard seat map shell`);
  });

  coordinateTemplates.forEach((entry) => {
    assert.equal(entry.isNonCoordinateMap, false, `${entry.id} coordinate map should not be flagged as non-coordinate`);
  });

  nonCoordinateGeometryEntries.forEach((entry) => {
    assert.equal(entry.isNonCoordinateMap, true, `${entry.id} should keep non-coordinate QA metadata`);
  });

  nonCoordinateTemplateEntries.forEach((entry) => {
    assert.equal(entry.usesCoordinateGeometry, false, `${entry.id} should keep coordinate QA exclusion metadata`);
  });

  [registrySource, runtimeSource, runtimeShellSource, templateSource].forEach((source) => {
    assert.equal(source.includes('jamsil-template'), false, 'standard shell production code should not reintroduce jamsil-template naming');
    assert.equal(source.includes('legacy'), false, 'standard shell production code should not reintroduce legacy shell naming');
    assert.equal(source.includes('isDoosanGuideActive'), false, 'shared shell production code should not use Doosan-specific naming');
  });
});

test('Suwon runtime contract 임포트는 좌표 fixture를 변경하지 않는다', async () => {
  const baseline = suwonFixtureSignature();
  const baselineProbeKeys = snapshotSuwonProbeKeySets();
  const runtimeSource = readProjectFile('src/components/StadiumGuideRuntime.tsx');

  await Promise.all([
    import('./stadiumSeatMapRegistry'),
    import('./stadiumSeatMap/SeatMapRuntimeShell'),
  ]);

  const afterProbeKeys = snapshotSuwonProbeKeySets();

  assert.ok(runtimeSource.includes('SeatMapRuntimeShell'), 'runtime source should keep the seat map shell contract');
  assert.ok(runtimeSource.includes('resolveStadiumSeatMapEntry'), 'runtime source should keep registry resolution');

  assert.equal(suwonFixtureSignature(), baseline, 'runtime contract imports should not mutate Suwon fixture data');

  const blockIdDiff = diffSet(baselineProbeKeys.blockIds, afterProbeKeys.blockIds);
  assert.equal(blockIdDiff.missing.length, 0, `Suwon block ids should not be missing after runtime imports: ${blockIdDiff.missing.join(', ')}`);
  assert.equal(blockIdDiff.extra.length, 0, `Unexpected Suwon block ids introduced after runtime imports: ${blockIdDiff.extra.join(', ')}`);

  const alignmentDiff = diffSet(baselineProbeKeys.alignmentProbeKeys, afterProbeKeys.alignmentProbeKeys);
  const browserQaDiff = diffSet(baselineProbeKeys.browserQaProbeKeys, afterProbeKeys.browserQaProbeKeys);
  const hitTestDiff = diffSet(baselineProbeKeys.hitTestProbeKeys, afterProbeKeys.hitTestProbeKeys);

  assert.equal(
    alignmentDiff.missing.length,
    0,
    `Suwon alignment probe key missing after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(alignmentDiff.missing)))}`,
  );
  assert.equal(
    alignmentDiff.extra.length,
    0,
    `Unexpected Suwon alignment probe keys after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(alignmentDiff.extra)))}`,
  );

  assert.equal(
    browserQaDiff.missing.length,
    0,
    `Suwon browser QA probe key missing after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(browserQaDiff.missing)))}`,
  );
  assert.equal(
    browserQaDiff.extra.length,
    0,
    `Unexpected Suwon browser QA probe keys after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(browserQaDiff.extra)))}`,
  );

  assert.equal(
    hitTestDiff.missing.length,
    0,
    `Suwon hit test probe key missing after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(hitTestDiff.missing)))}`,
  );
  assert.equal(
    hitTestDiff.extra.length,
    0,
    `Unexpected Suwon hit test probe keys after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(hitTestDiff.extra)))}`,
  );
});

test('인천 전용 guide/quick-action 계약은 표준 좌석도 슬롯에서 유지한다', () => {
  const runtimeSource = readProjectFile('src/components/StadiumGuideRuntime.tsx');
  const incheonSource = readProjectFile('src/components/incheon/IncheonSeatMap.tsx');
  const incheonSvgSource = readProjectFile('src/components/incheon/IncheonSeatMapSvg.tsx');
  const incheonDataSource = readProjectFile('src/data/incheonSeatData.ts');
  const incheonOperatorSource = readProjectFile('src/data/incheonOperatorVisitGuide.ts');
  const stadiumUxAuditSource = readProjectFile('scripts/stadium-ux-audit.mjs');

  assert.equal(fs.existsSync(path.join(projectRoot, 'src/data/incheonVisitGuide.ts')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, 'src/data/incheonVisitGuide.test.ts')), false);

  [
    'IncheonVisitQuickActions',
    'isIncheonStadium',
    'INCHEON_VISIT_QUICK_ACTIONS',
    'incheon-visit-quick-actions',
  ].forEach((removedToken) => {
    assert.equal(runtimeSource.includes(removedToken), false, `runtime should not include ${removedToken}`);
  });

  [
    'IncheonFirstVisitGuide',
    'incheon-first-visit-guide',
    'incheon-guide-',
    'getIncheonGuideMatches',
    'SeatMapSectionFinder',
    'mobileSecondaryPanel',
    'desktopSecondaryPanel',
    'IncheonOperatorVisitGuidePanel',
    'getIncheonOperatorVisitGuidance',
    'renderIncheonExtraMeta',
    'extraMeta={renderIncheonExtraMeta}',
    'IncheonCompareTray',
    'comparisonIds',
    'recentSelectionIds',
    'incheon-compare-tray',
    'incheon-compare-add',
    'incheon-compare-remove',
    'incheon-compare-clear',
    'incheon-recent-card-',
    'incheon-operator-visit-guide',
    'incheon-operator-data-status',
    'incheon-operator-row-entrance',
    'incheon-operator-row-facilities',
    'incheon-operator-row-notice',
    'incheon-operator-row-updated',
    'SeatViewDirectUploadModal',
    'requireLogin',
    'getCurrentRelativeUrl',
    'stadium="INCHEON"',
  ].forEach((requiredToken) => {
    assert.ok(incheonSource.includes(requiredToken), `IncheonSeatMap should include ${requiredToken}`);
  });

  [
    'guideMatchedBlockIds',
    'guideActive',
    'data-guide-match',
  ].forEach((removedToken) => {
    assert.equal(incheonSvgSource.includes(removedToken), false, `IncheonSeatMapSvg should not include ${removedToken}`);
  });

  [
    'IncheonGuideIntent',
    'IncheonGuideMatch',
    'getIncheonGuideMatches',
    'getIncheonDecisionTags',
  ].forEach((requiredToken) => {
    assert.ok(incheonDataSource.includes(requiredToken), `incheonSeatData should include ${requiredToken}`);
  });

  [
    'IncheonOperatorVisitGuidanceResult',
    'getIncheonOperatorVisitGuidance',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredToken) => {
    assert.ok(incheonOperatorSource.includes(requiredToken), `incheonOperatorVisitGuide should include ${requiredToken}`);
  });

  [
    'incheon-operator-visit-check',
  ].forEach((excludedToken) => {
    assert.equal(incheonSource.includes(excludedToken), false, `IncheonSeatMap should exclude operator guide token ${excludedToken}`);
  });

  [
    'SeatMapFilterBar',
    'SeatMapLegend',
    'SeatMapAttribution',
    'SeatMapDetailPanel',
    'SeatMapBottomSheet',
    'fullscreenDialogTestId="incheon-seatmap-fullscreen"',
  ].forEach((requiredToken) => {
    assert.ok(incheonSource.includes(requiredToken), `IncheonSeatMap should keep standard UX token ${requiredToken}`);
  });

  assert.equal(incheonSource.includes('IncheonUploadFlowModal'), false, 'IncheonSeatMap should remove the demo upload modal');

  [
    'verifyIncheonComparisonFlow',
    'visibleIncheonPanelTestId',
    'visibleIncheonCompareTestId',
    'incheon-compare-card-incheon-101b',
    'incheon-compare-card-incheon-102b',
    'waitForIncheonComparedSection',
    'clickVisibleIncheonCompareClear',
    'data-compared',
    'incheon-compare-clear',
  ].forEach((requiredToken) => {
    assert.ok(stadiumUxAuditSource.includes(requiredToken), `stadium-ux-audit should verify Incheon comparison token ${requiredToken}`);
  });
  assert.equal(
    stadiumUxAuditSource.includes("visibleIncheonCompareTestId(page, 'incheon-compare-clear').click"),
    false,
    'stadium-ux-audit should not direct-click Incheon compare clear on mobile',
  );
});

test('구장별 전용 좌석도는 시야/preview 연결 계약을 유지한다', () => {
  const expectedStadiumKeys: Record<string, string> = {
    incheon: 'INCHEON',
    daegu: 'DAEGU',
    daejeon: 'DAEJEON',
    gocheok: 'GOCHEOK',
    gwangju: 'GWANGJU',
    changwon: 'CHANGWON',
    sajik: 'SAJIK',
    suwon: 'SUWON',
  };

  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const source = readProjectFile(`src/components/${contract.folder}/${contract.componentName}.tsx`);
    const detailPanelSource = readProjectFile('src/components/stadiumSeatMap/SeatMapDetailPanel.tsx');
    if (contract.presetId === 'jamsil') {
      assert.ok(source.includes('SeatMapHoverPreview'), `${contract.componentName} should render SeatMapHoverPreview`);
      return;
    }

    assert.ok(
      source.includes('SeatViewGallery') || source.includes('SeatMapDetailPanel'),
      `${contract.componentName} should render SeatViewGallery directly or through the shared detail panel`,
    );
    assert.ok(
      source.includes(`stadium="${expectedStadiumKeys[contract.presetId]}"`)
        || source.includes(`stadiumKey="${expectedStadiumKeys[contract.presetId]}"`)
        || detailPanelSource.includes('stadium={stadiumKey}'),
      `${contract.componentName} should use ${expectedStadiumKeys[contract.presetId]} SeatViewGallery key`,
    );
  });
});

test('좌석도 공통 UI 컴포넌트는 잠실 기준 UX 계약을 제공한다', () => {
  const filterSource = readProjectFile('src/components/stadiumSeatMap/SeatMapFilterBar.tsx');
  const legendSource = readProjectFile('src/components/stadiumSeatMap/SeatMapLegend.tsx');
  const attributionSource = readProjectFile('src/components/stadiumSeatMap/SeatMapAttribution.tsx');
  const detailSource = readProjectFile('src/components/stadiumSeatMap/SeatMapDetailPanel.tsx');
  const bottomSheetSource = readProjectFile('src/components/stadiumSeatMap/SeatMapBottomSheet.tsx');
  const hookSource = readProjectFile('src/components/stadiumSeatMap/useSeatMapSelectionState.ts');
  const typeSource = readProjectFile('src/components/stadiumSeatMap/seatMapCommonTypes.ts');
  const templateSource = readProjectFile('src/components/stadiumSeatMap/SeatMapTemplateShell.tsx');
  const jamsilSource = readProjectFile('src/components/jamsil/JamsilSeatMap.tsx');
  const suwonSource = readProjectFile('src/components/suwon/SuwonSeatMap.tsx');

  assert.ok(typeSource.includes('SeatMapCategoryMeta'));
  assert.ok(typeSource.includes('SeatMapFilterGroup'));
  assert.ok(typeSource.includes('SeatMapSectionAdapter'));
  assert.ok(typeSource.includes('SeatMapCommonCopy'));
  assert.ok(typeSource.includes('SeatMapSourceInfo'));
  assert.ok(typeSource.includes('blockLabel?: string'), 'shared copy should allow stadium-specific block label copy');
  assert.ok(filterSource.includes('aria-pressed'), 'shared filter should expose pressed state');
  assert.ok(filterSource.includes('getGroupState'), 'shared filter should support stadium-specific disabled/data attributes');
  assert.ok(legendSource.includes('categoryIds'), 'shared legend should render category ids from stadium data');
  assert.ok(attributionSource.includes('좌석 배치 기준:'), 'shared attribution should render source caption copy');
  assert.equal(attributionSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'), false, 'shared attribution should not render internal manual data contract text');
  assert.ok(detailSource.includes('SeatViewGallery'), 'shared detail panel should own the common gallery block');
  assert.ok(detailSource.includes('copy?.blockLabel'), 'shared detail panel should honor custom block label copy');
  assert.ok(detailSource.includes('extraMeta'), 'shared detail panel should expose stadium-specific metadata slot');
  assert.ok(bottomSheetSource.includes("type Snap = 'peek' | 'half' | 'full'"), 'shared bottom sheet should preserve mobile snap behavior');
  assert.ok(bottomSheetSource.includes('testId?: string'), 'shared bottom sheet should preserve stadium QA ids when needed');
  assert.ok(bottomSheetSource.includes('data-testid={testId}'), 'shared bottom sheet should render the provided QA id');
  assert.ok(bottomSheetSource.includes('extraMeta'), 'shared bottom sheet should expose stadium-specific metadata slot');
  assert.ok(hookSource.includes('filterCats'), 'shared selection hook should derive filter categories');
  assert.ok(hookSource.includes('setSelected(null)'), 'shared selection hook should clear invalid selected sections');
  assert.ok(templateSource.includes('isAuxiliaryGuideActive'), 'template shell should use a generic auxiliary guide flag');
  assert.ok(templateSource.includes('mobileSecondaryPanel'), 'template shell should expose a mobile secondary panel slot');
  assert.ok(templateSource.includes('desktopSecondaryPanel'), 'template shell should expose a desktop secondary panel slot');
  assert.ok(!templateSource.includes('isDoosanGuideActive'), 'template shell should not expose Doosan-specific naming');
  const jamsilDedicatedBottomSheetName = 'Jamsil' + 'BottomSheet';
  const jamsilDedicatedSidePanelName = 'Jamsil' + 'SidePanelV2';
  assert.ok(jamsilSource.includes('SeatMapBottomSheet'), 'Jamsil should wire the shared mobile bottom sheet');
  assert.ok(jamsilSource.includes('SeatMapDetailPanel'), 'Jamsil should wire the shared desktop detail panel');
  assert.ok(!jamsilSource.includes(jamsilDedicatedBottomSheetName), 'Jamsil should not keep a dedicated mobile bottom sheet');
  assert.ok(!jamsilSource.includes(jamsilDedicatedSidePanelName), 'Jamsil should not keep a dedicated desktop detail panel');
  assert.ok(jamsilSource.includes('SeatViewDirectUploadModal'), 'Jamsil should wire the shared direct upload modal');
  assert.ok(jamsilSource.includes('isAuxiliaryGuideActive={isDoosanGuideActive}'), 'Jamsil should keep Doosan guide as an auxiliary guide extension');
  const suwonDedicatedBottomSheetName = 'Suwon' + 'BottomSheet';
  assert.ok(suwonSource.includes('SeatMapBottomSheet'), 'Suwon should wire the shared mobile bottom sheet');
  assert.ok(!suwonSource.includes(suwonDedicatedBottomSheetName), 'Suwon should not keep a dedicated mobile bottom sheet');
  assert.ok(suwonSource.includes('SeatViewDirectUploadModal'), 'Suwon should wire the shared direct upload modal');
});

test('구장별 전용 모바일 바텀시트 파일은 재도입하지 않는다', () => {
  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const componentSource = readProjectFile(`src/components/${contract.folder}/${contract.componentName}.tsx`);
    const bottomSheetName = contract.componentName.replace('SeatMap', 'BottomSheet');
    const bottomSheetPath = `src/components/${contract.folder}/${bottomSheetName}.tsx`;

    assert.equal(
      fs.existsSync(path.join(projectRoot, bottomSheetPath)),
      false,
      `${bottomSheetPath} should stay removed`,
    );

    assert.ok(componentSource.includes('SeatMapBottomSheet'), `${contract.componentName} should use the shared bottom sheet`);
    assert.equal(componentSource.includes(bottomSheetName), false, `${contract.componentName} should not reference ${bottomSheetName}`);
  });
});

test('구장별 secondary panel 예외는 allowlist로만 유지한다', () => {
  const secondaryPanelPresetIds = new Set(['jamsil', 'incheon', 'daegu', 'daejeon', 'gocheok', 'sajik', 'suwon']);

  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const componentSource = readProjectFile(`src/components/${contract.folder}/${contract.componentName}.tsx`);
    const usesSecondaryPanel = componentSource.includes('mobileSecondaryPanel=')
      || componentSource.includes('desktopSecondaryPanel=');

    assert.equal(
      usesSecondaryPanel,
      secondaryPanelPresetIds.has(contract.presetId),
      `${contract.componentName} secondary panel usage should match the allowlist`,
    );
  });

  const daeguSource = readProjectFile('src/components/daegu/DaeguSeatMap.tsx');
  const daejeonSource = readProjectFile('src/components/daejeon/DaejeonSeatMap.tsx');
  const sajikSource = readProjectFile('src/components/sajik/SajikSeatMap.tsx');
  const gocheokSource = readProjectFile('src/components/gocheok/GocheokSeatMap.tsx');
  const gocheokFacilityGuideSource = readProjectFile('src/components/gocheok/GocheokFacilityGuide.tsx');
  const incheonSource = readProjectFile('src/components/incheon/IncheonSeatMap.tsx');
  const jamsilSource = readProjectFile('src/components/jamsil/JamsilSeatMap.tsx');
  const suwonSource = readProjectFile('src/components/suwon/SuwonSeatMap.tsx');
  const sharedDetailSource = readProjectFile('src/components/stadiumSeatMap/SeatMapDetailPanel.tsx');
  const sharedBottomSheetSource = readProjectFile('src/components/stadiumSeatMap/SeatMapBottomSheet.tsx');
  const sharedFinderSource = readProjectFile('src/components/stadiumSeatMap/SeatMapSectionFinder.tsx');

  assert.ok(sharedDetailSource.includes('searchAction?: SeatMapSearchAction'), 'shared detail panel should expose an optional search action');
  assert.ok(sharedBottomSheetSource.includes('searchAction?: SeatMapSearchAction'), 'shared bottom sheet should expose an optional search action');
  assert.ok(sharedFinderSource.includes('autoFocusInput?: boolean'), 'shared finder should support focusing search when reopened');
  [
    ['Jamsil', jamsilSource],
    ['Daegu', daeguSource],
    ['Daejeon', daejeonSource],
    ['Gocheok', gocheokSource],
    ['Sajik', sajikSource],
    ['Suwon', suwonSource],
    ['Incheon', incheonSource],
  ].forEach(([label, source]) => {
    assert.ok(source.includes('isSectionFinderOpen'), `${label} should control finder visibility`);
    assert.ok(
      source.includes('setIsSectionFinderOpen(false)') || source.includes('setIsSectionFinderOpen(!block)'),
      `${label} should hide finder after section selection`,
    );
    assert.ok(source.includes('searchAction={{'), `${label} should wire detail search action`);
  });

  assert.ok(jamsilSource.includes('SeatMapSectionFinder'), 'Jamsil should use the shared section finder');
  assert.ok(jamsilSource.includes('testIdPrefix="jamsil"'), 'Jamsil section finder should keep its test id prefix');
  assert.ok(jamsilSource.includes('mobileSecondaryPanel={sectionFinder}'), 'Jamsil should expose finder below the map on mobile');
  assert.ok(jamsilSource.includes('desktopSecondaryPanel={sectionFinder}'), 'Jamsil should expose finder above the side panel on desktop');
  assert.ok(suwonSource.includes('SeatMapSectionFinder'), 'Suwon should use the shared section finder');
  assert.ok(suwonSource.includes('SuwonFirstVisitGuide'), 'Suwon should expose the first-visit quick guide');
  assert.ok(suwonSource.includes('suwon-first-visit-guide'), 'Suwon first-visit guide test id should stay stable');
  assert.ok(suwonSource.includes('getSuwonGuideMatches'), 'Suwon first-visit guide should derive matches from static seat data');
  assert.ok(suwonSource.includes('handleGuideBlockSelect'), 'Suwon first-visit guide should reuse the map selection flow');
  assert.ok(suwonSource.includes('SuwonMobileSecondaryPanel'), 'Suwon should use mobile tabs for guide and finder');
  assert.ok(suwonSource.includes('suwon-mobile-secondary-panel'), 'Suwon mobile secondary panel test id should stay stable');
  assert.ok(suwonSource.includes('suwon-mobile-tool-tab-guide'), 'Suwon mobile guide tab test id should stay stable');
  assert.ok(suwonSource.includes('suwon-mobile-tool-tab-finder'), 'Suwon mobile finder tab test id should stay stable');
  assert.ok(suwonSource.includes('testIdPrefix="suwon"'), 'Suwon section finder should keep its test id prefix');
  assert.ok(suwonSource.includes('mobileSecondaryPanel={mobileSecondaryPanel}'), 'Suwon should expose tabbed guide and finder below the map on mobile');
  assert.ok(suwonSource.includes('desktopSecondaryPanel={secondaryPanel}'), 'Suwon should expose guide and finder above the side panel on desktop');
  assert.ok(daeguSource.includes('data-testid="daegu-section-finder"'), 'Daegu finder should remain the documented secondary panel exception');
  assert.ok(daejeonSource.includes('data-testid="daejeon-section-finder"'), 'Daejeon finder should remain the documented secondary panel exception');
  assert.ok(sajikSource.includes('data-testid="sajik-first-visit-guide"'), 'Sajik first-visit guide should remain the documented secondary panel exception');
  assert.ok(gocheokSource.includes('SeatMapSectionFinder'), 'Gocheok should use the shared section finder');
  assert.ok(gocheokSource.includes('testIdPrefix="gocheok"'), 'Gocheok section finder should keep its test id prefix');
  assert.ok(gocheokSource.includes('mobileSecondaryPanel='), 'Gocheok should expose finder below the map on mobile');
  assert.ok(gocheokSource.includes('desktopSecondaryPanel='), 'Gocheok should expose finder above the side panel on desktop');
  assert.ok(gocheokSource.includes('getGocheokVisitHint'), 'Gocheok details should derive visit checks from static data');
  assert.ok(gocheokSource.includes('getGocheokOperatorVisitGuidance'), 'Gocheok details should derive operator visit checks from the static operator guide');
  assert.ok(gocheokSource.includes('renderVisitCheckMeta'), 'Gocheok details should render the visit check meta area');
  assert.ok(gocheokSource.includes('data-testid="gocheok-visit-check"'), 'Gocheok visit check test id should stay stable');
  assert.ok(gocheokSource.includes('data-testid="gocheok-operation-guide-open"'), 'Gocheok should expose the operation guide CTA from the detail panel');
  assert.ok(gocheokSource.includes('activeFacilityTab'), 'Gocheok should hold the controlled facility tab state');
  assert.ok(gocheokSource.includes('activeTab={activeFacilityTab}'), 'Gocheok should pass the selected facility tab to the guide');
  assert.ok(gocheokSource.includes('onTabChange={setActiveFacilityTab}'), 'Gocheok should let the guide update the selected facility tab');
  assert.ok(gocheokSource.includes('GocheokFacilityGuide'), 'Gocheok facility mode should remain the documented auxiliary guide exception');
  assert.ok(gocheokSource.includes('isAuxiliaryGuideActive={!isSeatMapMode}'), 'Gocheok facility mode should use the shared auxiliary guide flag');
  assert.ok(gocheokFacilityGuideSource.includes('activeTab: controlledActiveTab'), 'Gocheok facility guide should support a controlled tab prop');
  assert.ok(gocheokFacilityGuideSource.includes('onTabChange'), 'Gocheok facility guide should notify parent tab changes');
  assert.ok(gocheokFacilityGuideSource.includes('getGocheokActiveOperationNotices'), 'Gocheok facility guide should derive active operation notices from the static operator guide');
  assert.ok(gocheokFacilityGuideSource.includes("{ id: 'operations'"), 'Gocheok facility guide should expose the operation tab');
  assert.ok(gocheokFacilityGuideSource.includes('data-testid="gocheok-operation-notice-panel"'), 'Gocheok facility guide should render the operation notice panel');
  assert.ok(gocheokFacilityGuideSource.includes('data-testid="gocheok-operator-data-required"'), 'Gocheok facility guide should surface operator data pending status');
  assert.ok(incheonSource.includes('data-testid="incheon-first-visit-guide"'), 'Incheon first-visit guide should remain the documented secondary panel exception');
  assert.ok(incheonSource.includes('testIdPrefix="incheon"'), 'Incheon section finder should keep its test id prefix');
  assert.ok(incheonSource.includes('data-testid="incheon-mobile-secondary-panel"'), 'Incheon should expose mobile guide/finder tabs below the map');
  assert.ok(incheonSource.includes('mobileSecondaryPanel={mobileSecondaryPanel}'), 'Incheon should use the mobile tabbed secondary panel below the map');
  assert.ok(incheonSource.includes('desktopSecondaryPanel={desktopSecondaryPanel}'), 'Incheon should expose guide and finder above the side panel on desktop');
});
