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

test('검수 중인 전용 좌석도는 block label 좌표 QA 식별자를 제공한다', () => {
  const incheonSvgSource = readProjectFile('src/components/incheon/IncheonSeatMapSvg.tsx');
  const gocheokSvgSource = readProjectFile('src/components/gocheok/GocheokSeatMapSvg.tsx');
  const changwonSvgSource = readProjectFile('src/components/changwon/ChangwonSeatMapSvg.tsx');
  const gwangjuSvgSource = readProjectFile('src/components/gwangju/GwangjuSeatMapSvg.tsx');

  assert.ok(incheonSvgSource.includes('data-testid={`incheon-seat-block-${block.id}`}'));
  assert.ok(incheonSvgSource.includes('data-label-x={block.imageGeometry.labelX}'));
  assert.ok(incheonSvgSource.includes('data-label-y={block.imageGeometry.labelY}'));
  assert.equal(incheonSvgSource.includes('data-guide-match'), false);
  assert.equal(incheonSvgSource.includes('guideMatchedBlockIds'), false);
  assert.ok(incheonSvgSource.includes('aria-pressed={isActive}'));
  assert.ok(incheonSvgSource.includes('tabIndex={isFiltered ? -1 : 0}'));
  assert.ok(incheonSvgSource.includes("event.key === 'Enter' || event.key === ' '"));
  assert.ok(incheonSvgSource.includes('comparisonIds'));
  assert.ok(incheonSvgSource.includes("data-compared={isCompared ? 'true' : undefined}"));

  assert.ok(gocheokSvgSource.includes('data-testid={`gocheok-seat-block-${block.id}`}'));
  assert.ok(gocheokSvgSource.includes('data-testid="gocheok-seatmap-hit-area"'));
  assert.ok(gocheokSvgSource.includes('data-label-x={block.imageGeometry.labelX}'));
  assert.ok(gocheokSvgSource.includes('data-label-y={block.imageGeometry.labelY}'));

  assert.ok(changwonSvgSource.includes('data-testid={`changwon-seat-block-${block.id}`}'));
  assert.ok(changwonSvgSource.includes('data-label-x={block.imageGeometry.labelX}'));
  assert.ok(changwonSvgSource.includes('data-label-y={block.imageGeometry.labelY}'));
  assert.ok(changwonSvgSource.includes("vectorEffect={usesExpandedHitArea ? undefined : 'non-scaling-stroke'}"));

  assert.ok(gwangjuSvgSource.includes('data-testid={`gwangju-seat-block-${block.id}`}'));
  assert.ok(gwangjuSvgSource.includes('data-label-x={block.imageGeometry.labelX}'));
  assert.ok(gwangjuSvgSource.includes('data-label-y={block.imageGeometry.labelY}'));
  assert.ok(gwangjuSvgSource.includes('data-trace-status={block.imageGeometry.traceStatus}'));
  assert.ok(gwangjuSvgSource.includes('data-pixel-alignment-status={block.imageGeometry.pixelAlignmentStatus}'));
  assert.ok(gwangjuSvgSource.includes('visualPathD = block.imageGeometry.visualD ?? block.imageGeometry.d'), 'Gwangju should render official-image visual overlay separately from clipped hit paths');
  assert.ok(gwangjuSvgSource.includes('data-testid={`gwangju-seat-visual-${block.id}`}'), 'Gwangju visual overlay paths should not be counted as seat hit paths');
  assert.ok(gwangjuSvgSource.includes('data-visual-path={visualPathD}'), 'Gwangju hit paths should retain visual path evidence for selected sweep QA');
  assert.ok(gwangjuSvgSource.includes('<image'), 'Gwangju should render the official WebP inside the same SVG coordinate plane as hit areas');
  assert.ok(gwangjuSvgSource.includes('preserveAspectRatio="none"'), 'Gwangju official WebP should map directly to the 2200x1159 SVG coordinates');
  assert.ok(gwangjuSvgSource.includes('const strokeWidth = isActive ? (isSmallVisual ? 0.75 : 1.5) : 1'), 'Gwangju visual overlay stroke should not inflate small H/I/J/S blocks');
  assert.ok(gwangjuSvgSource.includes('fillOpacity = showHitAreaDebug ? 0.08 : 0;'), 'Gwangju filtered source blocks should not render black dim overlays in normal seatmap mode');
  assert.ok(gwangjuSvgSource.includes('fillOpacity={0}'), 'Gwangju invisible hit paths should not paint black rectangles in normal seatmap mode');
  assert.equal(gwangjuSvgSource.includes("fill = mode === 'dark' ? '#000000' : '#1e293b'"), false, 'Gwangju filtered source blocks should stay invisible instead of painting dark rectangles');
  assert.ok(gwangjuSvgSource.includes("'k5-101'"), 'Gwangju lower infield 101~108 blocks should use the same small visual overlay cap as H/I/J');
  assert.ok(gwangjuSvgSource.includes("'k7-108'"), 'Gwangju lower infield 101~108 blocks should use the same small visual overlay cap as H/I/J');
  assert.ok(gwangjuSvgSource.includes("'k9-116'"), 'Gwangju third-base lower infield 116~125 blocks should use the same small visual overlay cap');
  assert.ok(gwangjuSvgSource.includes("'k5-126'"), 'Gwangju restored 126 K5 should use the small visual overlay cap');
  assert.ok(gwangjuSvgSource.includes("'k5-127'"), 'Gwangju restored 127 K5 should use the small visual overlay cap');
  assert.ok(gwangjuSvgSource.includes('POLYGON_STROKE_HIDDEN_IDS'), 'Gwangju 121~127 polygon hit areas should hide always-on blue outlines');
  assert.ok(gwangjuSvgSource.includes('const shouldHidePolygonStroke = POLYGON_STROKE_HIDDEN_IDS.has(block.id)'), 'Gwangju polygon stroke hiding should be block-scoped');
  assert.ok(gwangjuSvgSource.includes('shouldHidePolygonStroke\n              ? 0'), 'Gwangju 121~127 blue outlines should stay hidden even while hover/click hit areas remain active');
  assert.ok(gwangjuSvgSource.includes("'third-wheelchair-seats'"), 'Gwangju restored third-base I should use the small visual overlay cap');
  assert.ok(gwangjuSvgSource.includes("'party-seats-third'"), 'Gwangju restored third-base J should use the small visual overlay cap');
  assert.ok(gwangjuSvgSource.includes("filter={isActive && !isSmallVisual ? 'url(#gwangju-hit-glow)' : undefined}"), 'Gwangju small H/I/J/S blocks should not render glow filters that inflate selected polygons');
  assert.ok(gwangjuSvgSource.includes('const showLabel = isActive && !isFiltered'), 'Gwangju debug overlay should not duplicate official image labels over every block');
  assert.equal(gwangjuSvgSource.includes('strokeWidth={isActive ? 4 : 2}'), false, 'Gwangju should not use thick active strokes that make small polygons look oversized');
  assert.equal(gwangjuSvgSource.includes('object-contain'), false, 'Gwangju should not split the official image into a separate object-fit layer');

  const stadiumUxAuditSource = readProjectFile('scripts/stadium-ux-audit.mjs');
  assert.ok(stadiumUxAuditSource.includes("filePrefix: 'gwangju-lower-infield-selected-sweep'"), 'Gwangju browser QA should define lower infield selected sweep evidence');
  assert.ok(stadiumUxAuditSource.includes("filePrefix: 'gwangju-thirdbase-selected-sweep'"), 'Gwangju browser QA should define third-base selected sweep evidence');
  assert.ok(stadiumUxAuditSource.includes('`${sweepGroup.filePrefix}-${suffix}.json`'), 'Gwangju browser QA should persist selected sweep JSON evidence for every sweep group');
  assert.ok(stadiumUxAuditSource.includes('`${sweepGroup.filePrefix}-${suffix}.md`'), 'Gwangju browser QA should persist selected sweep Markdown evidence for every sweep group');
  assert.ok(stadiumUxAuditSource.includes('`${sweepGroup.filePrefix}-${target.id}-${suffix}.png`'), 'Gwangju browser QA should persist per-target selected sweep crops for every sweep group');
  assert.equal(stadiumUxAuditSource.includes('gwangju-seatmap-third-base-independent-audit-overlay.png'), false, 'Gwangju browser QA should not link deleted third-base legacy reference overlays');
  assert.ok(stadiumUxAuditSource.includes('STADIUM_UX_GWANGJU_EXPANDED_EVIDENCE'), 'Gwangju expanded selected sweep evidence should be gated separately from default trace-review');
  assert.ok(stadiumUxAuditSource.includes('STADIUM_UX_GWANGJU_SELECTED_SWEEP_ONLY'), 'Gwangju selected sweep evidence should support a browser evidence-only mode');
  assert.ok(stadiumUxAuditSource.includes('gwangjuThirdBaseSelectedSweepTargets'), 'Gwangju selected sweep should keep default and expanded third-base target sets separate');
  assert.ok(stadiumUxAuditSource.includes('captureGwangjuSelectedSeatmapEvidence'), 'Gwangju selected evidence crops should hide mobile bottom sheets without clearing selection');
  assert.ok(stadiumUxAuditSource.includes('[data-testid="gwangju-bottom-sheet"]'), 'Gwangju selected evidence crops should target the mobile bottom sheet by test id');
  assert.ok(stadiumUxAuditSource.includes("'k5-104'"), 'Gwangju lower infield selected sweep should include 104 near H/I/J');
  assert.ok(stadiumUxAuditSource.includes("'k7-108'"), 'Gwangju lower infield selected sweep should include 108 near J/I/H');
  assert.ok(stadiumUxAuditSource.includes("'k9-116'"), 'Gwangju third-base selected sweep should include 116 near A/B/C/G/H/I/J/L');
  assert.ok(stadiumUxAuditSource.includes("'k7-121'"), 'Gwangju third-base selected sweep should include restored 121');
  assert.ok(stadiumUxAuditSource.includes("'k7-122'"), 'Gwangju third-base selected sweep should include restored 122');
  assert.ok(stadiumUxAuditSource.includes("'k8-123'"), 'Gwangju third-base selected sweep should include restored 123');
  assert.ok(stadiumUxAuditSource.includes("'k5-124'"), 'Gwangju third-base selected sweep should include restored 124');
  assert.ok(stadiumUxAuditSource.includes("'k5-125'"), 'Gwangju third-base selected sweep should include restored 125');
  assert.ok(stadiumUxAuditSource.includes("'k5-126'"), 'Gwangju third-base selected sweep should include restored 126');
  assert.ok(stadiumUxAuditSource.includes("'k5-127'"), 'Gwangju third-base selected sweep should include restored 127');
  assert.ok(stadiumUxAuditSource.includes("'third-surprise-seats'"), 'Gwangju third-base selected sweep should include G');
  assert.ok(stadiumUxAuditSource.includes("'third-family-seats'"), 'Gwangju third-base selected sweep should include H');
  assert.ok(stadiumUxAuditSource.includes("'third-wheelchair-seats'"), 'Gwangju third-base selected sweep should include restored I');
  assert.ok(stadiumUxAuditSource.includes("'party-seats-third'"), 'Gwangju third-base selected sweep should include restored J');
  assert.ok(stadiumUxAuditSource.includes("'sky-picnic-L'"), 'Gwangju third-base selected sweep should include restored L');
  assert.ok(stadiumUxAuditSource.includes("'sky-picnic-s-335'"), 'Gwangju third-base selected sweep should include S-335');
  assert.ok(stadiumUxAuditSource.includes("'five-table-533'"), 'Gwangju third-base selected sweep should include 533');
  assert.ok(stadiumUxAuditSource.includes("'five-table-534'"), 'Gwangju third-base selected sweep should include 534');
  assert.ok(stadiumUxAuditSource.includes("'five-table-535'"), 'Gwangju third-base selected sweep should include 535');
  assert.equal(stadiumUxAuditSource.includes("'skybox-seats'"), false, 'Gwangju third-base selected sweep should not include removed K/skybox');
});

test('창원 trace review 스크립트는 117개 숫자 블록과 특수 선택 구역 검수 산출물을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const dispatcherSource = readProjectFile('scripts/stadium-seatmap-ops.mjs');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');
  const changwonSeatmapOpsSource = readProjectFile('scripts/changwon-seatmap-ops.mjs');
  const manifestSource = changwonSeatmapOpsSource;
  const uxReadinessSource = changwonSeatmapOpsSource;
  const changwonComponentSource = readProjectFile('src/components/changwon/ChangwonSeatMap.tsx');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );

  assert.ok(packageSource.includes('"stadium:changwon:trace-manifest"'));
  assert.ok(packageSource.includes('node scripts/qa-presets.mjs stadium changwon trace-manifest'));
  assert.ok(packageSource.includes('"qa:stadium:changwon:mobile"'));
  assert.ok(packageSource.includes('node scripts/qa-presets.mjs stadium changwon mobile'));
  assert.ok(packageSource.includes('"qa:stadium:changwon:release-lock"'));
  assert.ok(packageSource.includes('node scripts/qa-presets.mjs stadium changwon release-gate'));
  assert.ok(packageSource.includes('"stadium:changwon:status"'));
  assert.ok(packageSource.includes('node scripts/qa-presets.mjs stadium changwon status'));
  assert.ok(packageSource.includes('"qa:stadium:changwon:diary-draft"'));
  assert.equal(packageSource.includes('"stadium:changwon:ux-readiness"'), false);
  assert.equal(packageSource.includes('"qa:stadium:changwon:trace-review"'), false);
  assert.ok(dispatcherSource.includes('publicTasks: ['));
  assert.ok(dispatcherSource.includes("'ux-readiness': ["));
  assert.ok(dispatcherSource.includes("'trace-review': ["));
  assert.ok(dispatcherSource.includes('UX readiness and trace-review bundles remain dispatcher-internal'));
  assert.ok(dispatcherSource.includes('ux-readiness and trace-review tasks stay available through the integrated dispatcher'));
  assert.ok(runnerSource.includes("'CHANGWON'"));
  assert.ok(runnerSource.includes("STADIUM_UX_CHANGWON_DEEP_CHECK: '1'"));

  assert.ok(manifestSource.includes('CHANGWON_EXPECTED_VISIBLE_BLOCKS'));
  assert.ok(manifestSource.includes('CHANGWON_EXPECTED_SELECTABLE_AREAS'));
  assert.ok(manifestSource.includes('CHANGWON_SPECIAL_SELECTABLE_AREAS'));
  assert.ok(manifestSource.includes('CHANGWON_OFFICIAL_TRACE_REFERENCE'));
  assert.ok(manifestSource.includes('CHANGWON_IMAGE_GEOMETRY'));
  assert.ok(manifestSource.includes('changwon-seatmap-trace-review.json'));
  assert.ok(manifestSource.includes('changwon-seatmap-trace-review.csv'));
  assert.ok(manifestSource.includes('changwon-seatmap-trace-review.md'));
  assert.ok(manifestSource.includes('changwon-seatmap-visual-approval.json'));
  assert.ok(manifestSource.includes('changwon-seatmap-visual-approval.md'));
  assert.ok(manifestSource.includes('STACK_OVERLAY_APPROVAL_NOTES'));
  assert.ok(manifestSource.includes('PENDING_HUMAN_SIGNOFF'));
  assert.ok(manifestSource.includes('VISUAL_APPROVAL_DECISION_OPTIONS'));
  assert.ok(manifestSource.includes('VISUAL_SIGNOFF_DECISIONS'));
  assert.ok(manifestSource.includes('VISUAL_SIGNOFF_REVIEW_BATCH'));
  assert.ok(manifestSource.includes('VISUAL_SIGNOFF_REVIEWER'));
  assert.ok(manifestSource.includes('STACK_OVERLAY'));
  assert.ok(manifestSource.includes('LOW_COVERAGE_BLOCK'));
  assert.ok(manifestSource.includes('reviewItemType'));
  assert.ok(manifestSource.includes('humanSignoffStatus'));
  assert.ok(manifestSource.includes('humanSignoffNote'));
  assert.ok(manifestSource.includes('confirmedHumanSignoff'));
  assert.ok(manifestSource.includes('needsTraceAdjustmentHumanSignoff'));
  assert.ok(manifestSource.includes('decisionOptions'));
  assert.ok(manifestSource.includes('stackOverlayReviewItems'));
  assert.ok(manifestSource.includes('lowCoverageReviewItems'));
  assert.ok(manifestSource.includes('pendingHumanSignoff'));
  assert.ok(manifestSource.includes('automatedNeedsTraceAdjustment'));
  assert.ok(manifestSource.includes('SPECIAL_CLEAN_OVERLAY_TARGETS'));
  assert.ok(manifestSource.includes('P0_CLEAN_OVERLAY_TARGETS'));
  assert.ok(manifestSource.includes('P1_CLEAN_OVERLAY_TARGETS'));
  assert.ok(manifestSource.includes('P2_CLEAN_OVERLAY_TARGETS'));
  assert.ok(manifestSource.includes('SPECIAL_STACK_CLEAN_OVERLAY_TARGETS'));
  assert.ok(manifestSource.includes('CLEAN_OVERLAY_REVIEW_NOTES'));
  assert.ok(manifestSource.includes('CLEAN_OVERLAY_VISUAL_REVIEW_STATUS'));
  assert.ok(manifestSource.includes('specialCleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('p0CleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('p1CleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('p2CleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('specialStackCleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('cleanOverlayReviewed'));
  assert.ok(manifestSource.includes('cleanOverlayPendingReview'));
  assert.ok(manifestSource.includes('visualReviewStatus'));
  assert.ok(manifestSource.includes('manualReviewNote'));
  assert.ok(manifestSource.includes('changwon-seatmap-trace-review-${slug}-clean-overlay.png'));
  assert.ok(manifestSource.includes('special-first-base-stack'));
  assert.ok(manifestSource.includes('special-third-base-stack'));
  assert.ok(manifestSource.includes('special-outfield-stack'));
  assert.ok(manifestSource.includes('traceMethod'));
  assert.ok(manifestSource.includes('traceSource'));
  assert.ok(manifestSource.includes('traceVersion'));
  assert.ok(manifestSource.includes('manualReviewed'));
  assert.ok(manifestSource.includes('pixelAlignmentStatus'));
  assert.ok(manifestSource.includes('foreignLabelAnchors'));
  assert.ok(manifestSource.includes('overlapWarnings'));
  assert.ok(manifestSource.includes('hitStrokeWidth'));
  assert.ok(manifestSource.includes('topHitOwner'));
  assert.ok(manifestSource.includes('expandedHitAreaIntercepts'));
  assert.ok(manifestSource.includes('renderedHitStatus'));
  assert.ok(manifestSource.includes('visualAlignmentStatus'));
  assert.ok(manifestSource.includes('visualReviewNote'));
  assert.ok(manifestSource.includes('lowCoverageReviewTarget'));
  assert.ok(manifestSource.includes('LOW_COVERAGE_REVIEW_THRESHOLD'));
  assert.ok(manifestSource.includes('LOW_COVERAGE_VISUAL_REVIEW_NOTES'));
  assert.ok(manifestSource.includes('hitProbes'));
  assert.ok(manifestSource.includes('representativeProbeMismatches'));
  assert.ok(manifestSource.includes('lowCoverageReviewTargets'));
  assert.ok(manifestSource.includes('lowCoverageApprovedExceptionTargets'));
  assert.ok(manifestSource.includes('PASS_WITH_APPROVED_EXCEPTION'));
  assert.ok(manifestSource.includes('releaseClassification'));
  assert.ok(manifestSource.includes('releaseClassificationReason'));
  assert.ok(manifestSource.includes('needsTraceAdjustment'));
  assert.ok(manifestSource.includes('topHitMismatches'));
  assert.ok(manifestSource.includes('expandedHitAreaInterceptWarnings'));
  assert.ok(manifestSource.includes('topRenderedHitBlockAt'));
  assert.ok(manifestSource.includes('representativePointForPolygon'));
  assert.ok(manifestSource.includes('pixelCoverageRatio'));
  assert.ok(manifestSource.includes('generatedScaledTrace'));
  assert.ok(uxReadinessSource.includes('changwon-seatmap-ux-readiness.json'));
  assert.ok(uxReadinessSource.includes('changwon-seatmap-ux-readiness.md'));
  assert.ok(uxReadinessSource.includes('searchableSelectableAreas'));
  assert.ok(uxReadinessSource.includes('specialSelectableAreas'));
  assert.ok(uxReadinessSource.includes('filterCounts'));
  assert.ok(uxReadinessSource.includes('lowCoverageApprovedExceptions'));
  assert.ok(uxReadinessSource.includes('CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS'));
  assert.ok(uxReadinessSource.includes('searchChangwonSeatMapBlocks'));
  assert.ok(uxReadinessSource.includes('requiredReleaseLockZeroFields'));
  assert.ok(changwonComponentSource.includes('searchChangwonSeatMapBlocks'));
  assert.ok(changwonComponentSource.includes('changwon-search-results'));
  assert.ok(changwonComponentSource.includes('changwon-search-result-count'));
  assert.ok(changwonComponentSource.includes('changwon-search-empty'));
  assert.ok(changwonComponentSource.includes('getChangwonSearchMatchLabels'));
  assert.ok(changwonComponentSource.includes('매칭:'));
  assert.ok(changwonComponentSource.includes('changwon-filter-visible-count'));
  assert.ok(changwonComponentSource.includes('changwon-selected-status'));
  assert.ok(changwonComponentSource.includes('changwon-seatmap-fullscreen-open'));
  assert.ok(changwonComponentSource.includes('testId="changwon-bottom-sheet"'));
  assert.ok(changwonComponentSource.includes('changwon-selected-status-mobile'));
  assert.ok(auditSource.includes('Changwon debug anchor count should be 123'));
  assert.ok(auditSource.includes('p0-121-128'));
  assert.ok(auditSource.includes('special-first-base'));
  assert.ok(auditSource.includes('special-third-base'));
  assert.ok(auditSource.includes('special-outfield'));
  assert.ok(auditSource.includes('assertChangwonTopHitTargets'));
  assert.ok(auditSource.includes('assertChangwonRepresentativeHitTargets'));
  assert.ok(auditSource.includes('assertChangwonTextSearchResultSelects'));
  assert.ok(auditSource.includes('assertChangwonEmptySearchKeepsSelection'));
  assert.ok(auditSource.includes('visibleChangwonTestId'));
  assert.ok(auditSource.includes('clickChangwonZoomControl'));
  assert.ok(auditSource.includes('[data-testid="${testId}"]:visible'));
  assert.ok(auditSource.includes('Changwon representative hit mismatch'));
  assert.ok(auditSource.includes('Changwon top-hit mismatch'));
  assert.ok(auditSource.includes('changwon-seatmap-fullscreen-open'));
  assert.ok(auditSource.includes('changwon-seatmap-fullscreen-close'));
  assert.ok(auditSource.includes('changwon-search-empty'));
  assert.ok(auditSource.includes('changwon-bottom-sheet'));
  ['1루 바베큐석', '3루 라운드 테이블석', '1루 라운드 테이블석', '1루 테이블석', '외야 카운터석', '외야 가족석'].forEach((block) => {
    assert.ok(auditSource.includes(block), `${block} should be part of Changwon special QA`);
  });
  ['101', '108', '112', '114', '121', '122', '125', '128', '138', '301', '309'].forEach((block) => {
    assert.ok(manifestSource.includes(`'${block}'`), `${block} should be part of Changwon P0 review tier`);
  });
  ['101', '108', '121', '138', '201', '210', '301', '315', '401', '408', '420', '429', '431', '433'].forEach((block) => {
    assert.ok(auditSource.includes(`'${block}'`), `${block} should be part of Changwon adjacent top-hit QA`);
  });
  ['121 원정 응원석', '122 원정 응원석', '123 원정 응원석', '124 원정 응원석', '125 3루 내야석', '126 바베큐석', '127 바베큐석', '128 불펜 가족석'].forEach((detail) => {
    assert.ok(auditSource.includes(detail), `${detail} should be part of Changwon P0 click QA`);
  });
});

test('창원 좌석도 release lock 문서는 최종 검수 계약을 고정한다', () => {
  const releaseLockSource = readProjectFile('docs/changwon-seatmap-release-lock.md');

  [
    'changwon-nc-seatmap-official-2026.webp',
    'CHANGWON_IMAGE_GEOMETRY',
    'CHANGWON_OFFICIAL_TRACE_REFERENCE',
    'CHANGWON_BLOCKS',
    'OFFICIAL_PNG_MANUAL_POLYGON',
    'manual-polygon-v2',
    'scripts/stadium-ux-audit.mjs',
    'totalBlocks=123',
    'searchableSelectableAreas=123',
    'confirmedHumanSignoff=11',
    'pendingHumanSignoff=0',
    'traceAdjustmentCandidates=[]',
    'generatedScaledTrace=0',
    'topHitMismatches=0',
    'expandedHitAreaInterceptWarnings=0',
    'representativeProbeMismatches=0',
    'foreignLabelAnchors=0',
    'overlapWarnings=0',
    'docs/changwon-seatmap-release-candidate.md',
    'npm run stadium:changwon:trace-manifest',
    'node scripts/stadium-seatmap-ops.mjs changwon ux-readiness',
    'node --import tsx --test src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'node scripts/stadium-seatmap-ops.mjs changwon trace-review',
    'npm run test:stadium:seatmaps',
    '`npm run test:stadium:seatmaps`: PASS, 219 tests',
    'env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build',
    'targeted polygon adjustment',
    'NEEDS_TRACE_ADJUSTMENT',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });
});

test('창원 좌석도 release candidate 문서는 UX+QA 고정 상태와 targeted adjustment 절차를 설명한다', () => {
  const releaseCandidateSource = readProjectFile('docs/changwon-seatmap-release-candidate.md');

  [
    '창원 NC파크 좌석도 release candidate',
    '2026-05-11 KST',
    'changwon-nc-seatmap-official-2026.webp',
    'CHANGWON_IMAGE_GEOMETRY',
    'CHANGWON_OFFICIAL_TRACE_REFERENCE',
    'CHANGWON_BLOCKS',
    '1b3e4d22d446ba5eede5102aa746f992851d2a5083671db3c541b06c0e96ee3b',
    'totalBlocks',
    '123',
    'searchableSelectableAreas',
    'specialSelectableAreas',
    'lowCoverageApprovedExceptions',
    'PASS_WITH_APPROVED_EXCEPTION',
    '125',
    '바베큐',
    '응원석',
    '휠체어',
    '검색 결과 없음',
    'reports/stadium/changwon-seatmap-ux-readiness.json',
    'npm run stadium:changwon:trace-manifest',
    'node scripts/stadium-seatmap-ops.mjs changwon ux-readiness',
    'node scripts/stadium-seatmap-ops.mjs changwon trace-review',
    'npm run test:stadium:seatmaps',
    'env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build',
    'targeted polygon adjustment',
    'NEEDS_TRACE_ADJUSTMENT',
    '외부 야구 데이터 수집',
  ].forEach((requiredText) => {
    assert.ok(releaseCandidateSource.includes(requiredText), `release candidate should include ${requiredText}`);
  });
});

test('사직 좌석도 release lock 문서는 canonical/runtime 검수 계약만 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const releaseLockSource = readProjectFile('docs/sajik-seatmap-release-lock.md');
  const stage01HandoffSource = readProjectFile('docs/sajik-seatmap-stage01-handoff.md');
  const dispatcherSource = readProjectFile('scripts/stadium-seatmap-ops.mjs');
  const manifestSource = readProjectFile('scripts/sajik-seatmap-core-qa.mjs');
  const dataTestSource = readProjectFile('src/data/sajikSeatData.test.ts');
  const svgSource = readProjectFile('src/components/sajik/SajikSeatMapSvg.tsx');

  [
    '`SAJIK_CANONICAL_2026`',
    '`BUSAN_SAJIK_2026_CANONICAL_OPERATOR_REFERENCE_V1`',
    '`src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp`',
    '`src/data/sajikCanonicalSeatMap.ts`',
    'source tab 없이 `SAJIK_CANONICAL_2026` 한 벌만 렌더링한다',
    'active selectable blocks: `78`',
    'legacy official-only alias blocks: `935`, `013`, `012`, `011`, `914`, `913`, `912`, `911`, `903`, `902`, `901`',
    '`npm run qa:stadium:sajik:release-lock`',
    '`npm run qa:stadium:sajik:full`',
    'stage01-*',
    'operator-reference-*',
    'Git history',
    '외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.',
    '`MANUAL_BASEBALL_DATA_REQUIRED`',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  [
    '상태: historical operator workflow',
    'Stage 01 npm aliases와 관련 스크립트는 canonical/runtime release 표면에서 제거되었다.',
    'Git history',
  ].forEach((requiredText) => {
    assert.ok(stage01HandoffSource.includes(requiredText), `Stage 01 handoff should include ${requiredText}`);
  });

  [
    '"stadium:sajik:pixel-components": "node scripts/qa-presets.mjs stadium sajik pixel-components"',
    '"stadium:sajik:alignment-audit": "node scripts/qa-presets.mjs stadium sajik alignment-audit"',
    '"stadium:sajik:trace-manifest": "node scripts/qa-presets.mjs stadium sajik trace-manifest"',
    '"stadium:sajik:block-source-duplication-audit": "node scripts/qa-presets.mjs stadium sajik block-source-duplication-audit"',
    '"qa:stadium:sajik:full": "node scripts/qa-presets.mjs stadium sajik full"',
    '"qa:stadium:sajik:release-lock": "node scripts/qa-presets.mjs stadium sajik release-lock"',
    '"qa:stadium:sajik:mobile": "node scripts/qa-presets.mjs stadium sajik mobile"',
    '"stadium:sajik:status": "node scripts/qa-presets.mjs stadium sajik status"',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  [
    '"stadium:sajik:stage01-',
    '"qa:stadium:sajik:stage01-',
    '"stadium:sajik:operator-reference-',
    '"qa:stadium:sajik:operator-reference-',
    '"qa:stadium:sajik:polygon-v2"',
    '"qa:stadium:sajik:trace-review"',
    '"stadium:sajik:dataset-export"',
    '"stadium:sajik:source-audit"',
    '"stadium:sajik:editor-regression"',
    '"stadium:sajik:marker-transition-review"',
    '"stadium:sajik:pr-scope-guard"',
    '"stadium:sajik:pr-scope-guard-smoke"',
  ].forEach((removedText) => {
    assert.ok(!packageSource.includes(removedText), `package script should not expose historical Sajik command ${removedText}`);
  });

  [
    "'dataset-export': [",
    "'source-audit': [",
    "'editor-regression': [",
    "'marker-transition-review': [",
    "'pr-scope-guard': [",
    "'pr-scope-guard-smoke': [",
    "'release-lock': [",
    "args: ['--import', 'tsx', 'scripts/sajik-seatmap-export-dataset.mjs', '--check']",
    "args: ['--import', 'tsx', '--test', 'src/data/sajikSeatData.test.ts', 'src/components/sajik/SajikSeatMap.test.ts']",
    "args: ['--import', 'tsx', '--test', '--test-name-pattern', '사직|Sajik', 'src/components/StadiumGuideRuntimeSeatMaps.test.ts']",
    'historicalTaskPolicy',
    'Git history',
  ].forEach((requiredText) => {
    assert.ok(dispatcherSource.includes(requiredText), `dispatcher should include ${requiredText}`);
  });

  [
    'sajik-seatmap-pixel-components.json',
    'sajik-seatmap-trace-review.json',
    'sajik-seatmap-alignment-audit.json',
    'sajik-seatmap-evidence-contact-sheet.png',
    'OFFICIAL_PNG_MANUAL_POLYGON',
    'manual-polygon-v2',
    'aliasOnlyOfficialPngBlockNotVisible',
  ].forEach((requiredText) => {
    assert.ok(manifestSource.includes(requiredText), `Sajik core QA should include ${requiredText}`);
  });

  [
    '사직 polygon은 단일 폐합 path이고 자기 교차가 없다',
    '사직 label 좌표 클릭은 최상위 polygon hit target과 일치한다',
    '사직 P0 143 주변 경계는 인접 블럭 polygon을 침범하지 않는다',
    '사직 polygon 정밀화는 단순 사각형 전체 fallback으로 회귀하지 않는다',
    'SAJIK_THIN_ALIGNMENT_STRICT_BLOCKS',
    'expectedArea',
    'SAJIK_TRACE_AREA_TOLERANCE_PX2',
  ].forEach((requiredText) => {
    assert.ok(dataTestSource.includes(requiredText), `Sajik data test should include ${requiredText}`);
  });

  [
    'pointer-events-none absolute right-3 top-3',
    'pointer-events-auto flex h-7 w-7',
    'pointer-events-auto min-h-7 min-w-10',
    'data-map-interaction-status',
    "block.sectionKind === 'SEAT_SECTION'",
    'SAJIK_CANONICAL_ACCESSIBILITY_MARKERS',
    'marker.markerInteractionStatus',
    'data-testid="sajik-seat-section-layer"',
    'data-testid="sajik-accessibility-markers-layer"',
    'sajik-accessibility-marker-',
  ].forEach((requiredText) => {
    assert.ok(svgSource.includes(requiredText), `Sajik SVG should keep zoom control hit-through contract ${requiredText}`);
  });
  assert.doesNotMatch(svgSource, /\?\? block\.imageGeometry\.d/);
});
