import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  JAMSIL_BLOCKS,
  JAMSIL_CATEGORIES,
  JAMSIL_CATEGORY_GROUPS,
  JAMSIL_OFFICIAL_REFERENCES,
  JAMSIL_SEATMAP_IMAGE,
  JAMSIL_VIEW_INFO,
  getJamsilSideLabel,
  getJamsilSourceLabel,
  type JamsilBlock,
} from '../../data/jamsilSeatData';
import { getJamsilOperatorVisitGuidance } from '../../data/jamsilOperatorVisitGuide';
import JamsilSeatMapSvg from './JamsilSeatMapSvg';
import JamsilUploadFlowModal from './JamsilUploadFlowModal';
import { useTheme } from '../../hooks/useTheme';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import { SeatMapAttribution } from '../stadiumSeatMap/SeatMapAttribution';
import { SeatMapBottomSheet } from '../stadiumSeatMap/SeatMapBottomSheet';
import { SeatMapDetailPanel } from '../stadiumSeatMap/SeatMapDetailPanel';
import { SeatMapFilterBar } from '../stadiumSeatMap/SeatMapFilterBar';
import { SeatMapLegend } from '../stadiumSeatMap/SeatMapLegend';
import { SeatMapSectionFinder } from '../stadiumSeatMap/SeatMapSectionFinder';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapSelectionState } from '../stadiumSeatMap/useSeatMapSelectionState';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';
import type { SeatMapSectionAdapter } from '../stadiumSeatMap/seatMapCommonTypes';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;
const FINDER_FOCUS_ZOOM = 1.35;
const MANUAL_OPERATOR_GUIDANCE_STATUS = 'MANUAL_BASEBALL_DATA_REQUIRED';

interface SeatMapPan {
  x: number;
  y: number;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function getJamsilFanRoleLabel(section: JamsilBlock) {
  if (section.fanRole === 'HOME') return '홈 응원';
  if (section.fanRole === 'AWAY') return '원정 응원';
  return '중립 표기';
}

const jamsilSectionAdapter: SeatMapSectionAdapter<JamsilBlock> = {
  getId: (section) => section.id,
  getName: (section) => section.name,
  getBlock: (section) => section.block,
  getCategoryId: (section) => section.category,
  getLevel: (section) => section.level,
  getOfficialBlocks: (section) => section.officialBlocks,
  getSideLabel: (section) => getJamsilSideLabel(section.side),
  getFanRoleLabel: getJamsilFanRoleLabel,
  getSourceLabel: (section) => getJamsilSourceLabel(section.sourceConfidence),
  getSourceNote: (section) => section.sourceNote,
  getSeatViewSections: (section) => section.seatViewSections,
  getAccessibilityNote: (section) => section.accessibilityNote,
  getDistance: (section) => (JAMSIL_VIEW_INFO[section.id] ?? JAMSIL_VIEW_INFO.default).distance,
  getNotes: (section) => (JAMSIL_VIEW_INFO[section.id] ?? JAMSIL_VIEW_INFO.default).notes,
  getTags: (section) => (JAMSIL_VIEW_INFO[section.id] ?? JAMSIL_VIEW_INFO.default).tags ?? [],
};

function JamsilOperatorVisitMeta({
  section,
  accent,
  teamContext,
}: {
  section: JamsilBlock;
  accent: string;
  teamContext: 'LG' | 'DOOSAN';
}) {
  const operatorGuidance = getJamsilOperatorVisitGuidance(section, new Date(), teamContext);
  const operatorTiles = [
    { label: '권장 출입구', value: operatorGuidance.recommendedEntranceLabel, testId: 'jamsil-operator-entrance' },
    { label: '가까운 매점/편의시설', value: operatorGuidance.nearbyFacilitiesLabel, testId: 'jamsil-operator-facilities' },
    { label: '오늘의 운영 동선 공지', value: operatorGuidance.operationNoticeLabel, testId: 'jamsil-operator-notice' },
    { label: '자료 갱신일', value: operatorGuidance.lastUpdatedAtLabel, testId: 'jamsil-operator-updated-at' },
  ];
  const hasManualFallback = operatorTiles.some((tile) => tile.value.includes(MANUAL_OPERATOR_GUIDANCE_STATUS))
    || operatorGuidance.operatorDataStatus === MANUAL_OPERATOR_GUIDANCE_STATUS;

  return (
    <div
      data-testid="jamsil-operator-visit-check"
      data-operator-data-status={operatorGuidance.operatorDataStatus}
      className="border-t border-slate-100 px-5 py-4 dark:border-slate-800"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">직관 체크</div>
          <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
            운영자 제공 자료 기준으로만 출입구, 편의시설, 운영 동선을 표시합니다.
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black"
          style={{ background: `${accent}18`, color: accent }}
        >
          현장 최종 안내 확인
        </span>
      </div>
      <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
        <div className="text-[9px] font-bold tracking-widest text-slate-400">자료상태</div>
        <div className="mt-0.5 break-words text-[12px] font-black text-slate-800 dark:text-white">
          {operatorGuidance.operatorDataStatus}
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {operatorTiles.map((tile) => (
          <div
            key={tile.label}
            data-testid={tile.testId}
            data-operator-field-source={tile.value.includes(MANUAL_OPERATOR_GUIDANCE_STATUS) ? 'manual-required' : 'operator-provided'}
            className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="text-[10px] font-black tracking-widest text-slate-400">{tile.label}</div>
            <div className="mt-1 break-words text-[12px] font-bold leading-relaxed text-slate-700 dark:text-slate-200">
              {tile.value}
            </div>
          </div>
        ))}
      </div>
      {operatorGuidance.cautionNotes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {operatorGuidance.cautionNotes.map((item) => (
            <li key={item} className="flex gap-2 text-[12px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {hasManualFallback && (
        <p
          data-testid="jamsil-operator-data-status"
          className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {operatorGuidance.operatorDataPendingLabel}
        </p>
      )}
    </div>
  );
}

export default function JamsilSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [officialSource, setOfficialSource] = useState<'LG' | 'DOOSAN'>('LG');
  const [uploadFor, setUploadFor] = useState<JamsilBlock | null>(null);
  const {
    selected,
    setSelected,
    hover,
    setHover,
    hoveredSection: activeHoveredSection,
    filterId,
    setFilterId,
    filterCats,
    toast,
    showToast,
    filterSides,
    filterLevels,
  } = useSeatMapSelectionState({
    sections: JAMSIL_BLOCKS,
    filterGroups: JAMSIL_CATEGORY_GROUPS,
    getId: (section) => section.id,
    getCategoryId: (section) => section.category,
    isSectionVisible: (block, filterGroup, cats) => {
      if (cats !== null && !cats.includes(block.category)) return false;
      if (filterGroup?.sides != null && !filterGroup.sides.includes(block.side)) return false;
      if (filterGroup?.levels != null && !filterGroup.levels.includes(block.level)) return false;
      return true;
    },
  });

  const {
    isMobile,
    isFullscreenOpen,
    openFullscreen,
    closeFullscreen,
  } = useSeatMapTemplateShellState();

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    showToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
  }, [showToast, uploadFor]);

  useEffect(() => {
    if (zoom <= MIN_ZOOM && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom);
    setZoom(normalizedZoom);
    if (normalizedZoom === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const handleOfficialSourceChange = useCallback((nextSource: 'LG' | 'DOOSAN') => {
    setOfficialSource(nextSource);
    setSelected(null);
    setHover(null);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    if (nextSource === 'DOOSAN') {
      closeFullscreen();
    }
  }, [closeFullscreen]);

  const handleSelectFromFinder = useCallback((block: JamsilBlock) => {
    setSelected(block);
    setHover(null);
    setZoom((currentZoom) => Math.max(currentZoom, FINDER_FOCUS_ZOOM));
  }, [setHover, setSelected]);

  const renderOperatorVisitMeta = useCallback((section: JamsilBlock, accent: string) => (
    <JamsilOperatorVisitMeta section={section} accent={accent} teamContext={officialSource} />
  ), [officialSource]);

  const usedCategories = [...new Set(JAMSIL_BLOCKS.map(b => b.category))];
  const visibleJamsilBlocks = useMemo(() => JAMSIL_BLOCKS.filter((block) => {
    if (filterCats !== null && !filterCats.includes(block.category)) return false;
    if (filterSides != null && !filterSides.includes(block.side)) return false;
    if (filterLevels != null && !filterLevels.includes(block.level)) return false;
    return true;
  }), [filterCats, filterLevels, filterSides]);

  const isDoosanGuideActive = officialSource === 'DOOSAN';
  const displaySection: JamsilBlock | null = isDoosanGuideActive
    ? null
    : selected;
  const hoveredSection = isDoosanGuideActive ? null : activeHoveredSection;
  const hoveredCategory = hoveredSection ? JAMSIL_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#1F5C4A';
  const doosanReference = JAMSIL_OFFICIAL_REFERENCES.find((reference) => reference.id === 'DOOSAN');

  const renderMapSvg = (enableAutoCenter = true, allowFullscreen = true) => (
    <JamsilSeatMapSvg
      mode={mode}
      granularity="high"
      officialSource={officialSource}
      onOfficialSourceChange={handleOfficialSourceChange}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      filterId={filterId}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={handleZoomChange}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomStep={ZOOM_STEP}
      enableAutoCenter={enableAutoCenter}
      onFullscreen={allowFullscreen && !isDoosanGuideActive ? openFullscreen : undefined}
    />
  );

  const attribution = (
    <SeatMapAttribution
      source={isDoosanGuideActive ? {
        prefixLabel: '구장 안내 기준:',
        sourceLabel: doosanReference?.sourceLabel ?? '두산 베어스 공식 자료',
        sourceUrl: doosanReference?.sourceUrl,
      } : {
        sourceLabel: JAMSIL_SEATMAP_IMAGE.sourceLabel,
        sourceUrl: JAMSIL_SEATMAP_IMAGE.sourceUrl,
        assetStatus: JAMSIL_SEATMAP_IMAGE.assetStatus,
      }}
      secondarySources={!isDoosanGuideActive && doosanReference ? [{
        prefixLabel: '보조 참고:',
        sourceLabel: doosanReference.sourceLabel,
        sourceUrl: doosanReference.sourceUrl,
      }] : undefined}
    />
  );

  const legend = (
    <SeatMapLegend categoryIds={usedCategories} categories={JAMSIL_CATEGORIES} mode={mode} />
  );

  const filterBar = (
    <SeatMapFilterBar
      groups={JAMSIL_CATEGORY_GROUPS}
      selectedId={filterId}
      onChange={setFilterId}
      mode={mode}
      accentColor="#1F5C4A"
      testIdPrefix="jamsil"
    />
  );
  const mapContent = (
    <div className="relative">
      {renderMapSvg(!isFullscreenOpen)}
      <SeatMapHoverPreview
        visible={Boolean(hoveredSection && hoveredCategory)}
        title={hoveredSection?.name}
        subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
        badgeLabel={hoveredCategory?.label}
        accentColor={hoveredAccent}
        description={hoveredSection ? `${hoveredSection.level} · ${hoveredSection.side}` : undefined}
      />
    </div>
  );
  const mobileFilterBar = (
    <div className="mb-2.5 overflow-x-auto">
      {filterBar}
    </div>
  );
  const desktopFilterBar = filterBar;
  const mobileBottomSheet = isDoosanGuideActive ? null : (
    selected && (
      <SeatMapBottomSheet
        section={selected}
        mode={mode}
        categories={JAMSIL_CATEGORIES}
        adapter={jamsilSectionAdapter}
        stadiumKey="JAMSIL"
        onClose={() => setSelected(null)}
        onUpload={() => setUploadFor(selected)}
        testId="jamsil-seatmap-bottom-sheet"
        extraMeta={renderOperatorVisitMeta}
      />
    )
  );
  const desktopSidePanel = isDoosanGuideActive ? null : (
    <SeatMapDetailPanel
      section={displaySection}
      mode={mode}
      categories={JAMSIL_CATEGORIES}
      adapter={jamsilSectionAdapter}
      stadiumKey="JAMSIL"
      onClose={() => setSelected(null)}
      onUpload={() => displaySection && setUploadFor(displaySection)}
      extraMeta={renderOperatorVisitMeta}
    />
  );
  const sectionFinder = isDoosanGuideActive ? null : (
    <SeatMapSectionFinder
      blocks={visibleJamsilBlocks}
      adapter={jamsilSectionAdapter}
      categories={JAMSIL_CATEGORIES}
      filterCats={filterCats}
      selected={selected}
      onSelect={handleSelectFromFinder}
      onHoverChange={setHover}
      mode={mode}
      testIdPrefix="jamsil"
      accentColor="#1F5C4A"
      stadiumShortLabel="잠실"
    />
  );

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="서울잠실야구장"
        subtitle={isDoosanGuideActive ? '두산 공식 구장 안내' : '잠실 블록 단위 안내도'}
        titleAccentColor="#1F5C4A"
        isMobile={isMobile}
        isAuxiliaryGuideActive={isDoosanGuideActive}
        filterBar={filterBar}
        mobileFilterBar={mobileFilterBar}
        desktopFilterBar={desktopFilterBar}
        mapContent={mapContent}
        attribution={attribution}
        legend={isDoosanGuideActive ? undefined : legend}
        mobileSecondaryPanel={sectionFinder}
        mobileBottomSheet={mobileBottomSheet}
        mobileHasSidePanel={Boolean(mobileBottomSheet)}
        desktopSecondaryPanel={sectionFinder}
        desktopSidePanel={desktopSidePanel}
        toast={toast}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={<div className="w-full">{renderMapSvg(true, false)}</div>}
        fullscreenTitle="서울잠실야구장"
        fullscreenSubtitle="LG 공식 좌석도 전체화면"
      />

      {uploadFor && (
        <JamsilUploadFlowModal
          section={uploadFor}
          mode={mode}
          onClose={() => setUploadFor(null)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </>
  );
}
