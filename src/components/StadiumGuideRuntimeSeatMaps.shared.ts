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

test('구장별 전용 좌석도는 공통 UX 계약을 노출한다', () => {
  const fullscreenControlPresetIds = new Set(['jamsil', 'incheon', 'daegu', 'gocheok', 'changwon', 'sajik', 'suwon']);
  const suppressClickPresetIds = new Set(['jamsil', 'incheon', 'daegu', 'daejeon', 'gocheok', 'sajik', 'suwon']);
  const panCursorSnippets: Record<string, string> = {
    jamsil: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    incheon: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    daegu: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    daejeon: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    gocheok: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    changwon: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    sajik: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    suwon: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
  };

  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const componentSource = readProjectFile(`src/components/${contract.folder}/${contract.componentName}.tsx`);
    const svgSource = readProjectFile(`src/components/${contract.folder}/${contract.componentName}Svg.tsx`);
    const sharedFilterSource = readProjectFile('src/components/stadiumSeatMap/SeatMapFilterBar.tsx');
    const sharedAttributionSource = readProjectFile('src/components/stadiumSeatMap/SeatMapAttribution.tsx');
    const combinedSource = `${componentSource}\n${svgSource}`;
    const zoomPrefix = `${contract.presetId}-seatmap`;
    const zoomInIndex = combinedSource.indexOf(`data-testid="${zoomPrefix}-zoom-in"`);
    const zoomResetIndex = combinedSource.indexOf(`data-testid="${zoomPrefix}-zoom-reset"`);
    const zoomOutIndex = combinedSource.indexOf(`data-testid="${zoomPrefix}-zoom-out"`);

    assert.ok(
      componentSource.includes('aria-pressed') || componentSource.includes('SeatMapFilterBar'),
      `${contract.componentName} filter controls should expose aria-pressed`,
    );
    assert.ok(sharedFilterSource.includes('aria-pressed'), 'shared filter controls should expose aria-pressed');
    assert.ok(
      componentSource.includes('좌석 배치 기준:') || componentSource.includes('SeatMapAttribution'),
      `${contract.componentName} should render the source caption below the map`,
    );
    assert.ok(sharedAttributionSource.includes('좌석 배치 기준:'), 'shared attribution should provide the source caption copy');
    assert.ok(zoomInIndex >= 0, `${contract.componentName} should expose zoom-in test id`);
    assert.ok(zoomResetIndex > zoomInIndex, `${contract.componentName} should order zoom reset after zoom-in`);
    assert.ok(zoomOutIndex > zoomResetIndex, `${contract.componentName} should order zoom-out after zoom reset`);

    if (suppressClickPresetIds.has(contract.presetId)) {
      assert.ok(combinedSource.includes('suppressClickRef'), `${contract.componentName} should suppress accidental clicks after zoom gestures`);
    }

    if (panCursorSnippets[contract.presetId]) {
      assert.ok(
        combinedSource.includes(panCursorSnippets[contract.presetId]),
        `${contract.componentName} should use grab/grabbing only when panning is available`,
      );
    } else {
      assert.ok(
        combinedSource.includes("cursor: isInteractive ? 'pointer' : 'default'")
          || combinedSource.includes("cursor: isFiltered ? 'default' : 'pointer'"),
        `${contract.componentName} should expose pointer/default hit target cursors`,
      );
    }

    if (fullscreenControlPresetIds.has(contract.presetId)) {
      const fullscreenIndex = combinedSource.indexOf(`data-testid="${zoomPrefix}-fullscreen-open"`);
      assert.ok(fullscreenIndex > zoomOutIndex, `${contract.componentName} should order fullscreen after zoom-out`);
    }

    const bottomSheetName = contract.componentName.replace('SeatMap', 'BottomSheet');
    assert.ok(
      new RegExp(`selected\\s*&&\\s*\\(\\s*<SeatMapBottomSheet`).test(componentSource),
      `${contract.componentName} should render the shared mobile bottom sheet only after a selected section exists`,
    );
    assert.equal(componentSource.includes(bottomSheetName), false, `${contract.componentName} should not reference ${bottomSheetName}`);
  });

  const daejeonSource = readProjectFile('src/components/daejeon/DaejeonSeatMap.tsx');
  const gwangjuSource = readProjectFile('src/components/gwangju/GwangjuSeatMap.tsx');
  const changwonSource = readProjectFile('src/components/changwon/ChangwonSeatMap.tsx');

  assert.ok(daejeonSource.includes("copy={{ blockLabel: '정확 블록' }}"), 'Daejeon should preserve exact-block detail copy through shared panels');
  assert.ok(gwangjuSource.includes('extraMeta={renderDerivedRangeMeta}'), 'Gwangju should preserve derived range badges in the shared mobile sheet');
  assert.ok(gwangjuSource.includes('extraMeta={renderDesktopDerivedRangeMeta}'), 'Gwangju should preserve derived range badges in the shared detail panel');
  assert.ok(gwangjuSource.includes('testId="gwangju-bottom-sheet"'), 'Gwangju should preserve its mobile QA bottom-sheet id');
  assert.ok(changwonSource.includes('testId="changwon-bottom-sheet"'), 'Changwon should preserve its mobile QA bottom-sheet id');
  assert.ok(changwonSource.includes('changwon-selected-status-mobile'), 'Changwon should preserve its mobile release-lock status badge');
});
