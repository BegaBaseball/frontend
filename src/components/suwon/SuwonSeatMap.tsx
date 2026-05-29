import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import {
  SUWON_BLOCKS,
  SUWON_CATEGORIES,
  SUWON_CATEGORY_GROUPS,
  SUWON_SEATMAP_IMAGE,
  SUWON_TRACE_REVIEW_SUMMARY,
  SUWON_VIEW_INFO,
  getSuwonFanRoleLabel,
  getSuwonSideLabel,
  getSuwonSourceLabel,
  type SuwonBlock,
} from '../../data/suwonSeatData';
import SuwonSeatMapSvg, { type SeatMapPan } from './SuwonSeatMapSvg';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import SuwonUploadFlowModal from './SuwonUploadFlowModal';
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

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

const suwonSectionAdapter: SeatMapSectionAdapter<SuwonBlock> = {
  getId: (section) => section.id,
  getName: (section) => section.name,
  getBlock: (section) => section.block,
  getCategoryId: (section) => section.category,
  getLevel: (section) => section.level,
  getOfficialBlocks: (section) => section.officialBlocks,
  getSideLabel: (section) => getSuwonSideLabel(section.side),
  getFanRoleLabel: (section) => getSuwonFanRoleLabel(section.fanRole),
  getSourceLabel: (section) => getSuwonSourceLabel(section.sourceConfidence),
  getSourceNote: (section) => section.sourceNote,
  getSeatViewSections: (section) => section.seatViewSections,
  getAccessibilityNote: (section) => section.accessibilityNote,
  getDistance: (section) => {
    const info = SUWON_VIEW_INFO[section.id as keyof typeof SUWON_VIEW_INFO] as { distance?: string } | undefined;
    return info?.distance;
  },
  getNotes: (section) => (
    section.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      ? '공식 이미지 기준 polygon 재추적 완료'
      : '공식 이미지 기준 정밀 재추적 대기'
  ),
};

export default function SuwonSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [uploadFor, setUploadFor] = useState<SuwonBlock | null>(null);
  const {
    selected,
    setSelected,
    hover,
    setHover,
    hoveredSection,
    filterId,
    setFilterId,
    filterCats,
    toast,
    showToast,
  } = useSeatMapSelectionState({
    sections: SUWON_BLOCKS,
    filterGroups: SUWON_CATEGORY_GROUPS,
    getId: (section) => section.id,
    getCategoryId: (section) => section.category,
  });
  const {
    isMobile,
    isFullscreenOpen,
    openFullscreen,
    closeFullscreen,
  } = useSeatMapTemplateShellState();

  const visibleCats = filterCats ? [...filterCats] : null;
  const hoveredCategory = hoveredSection ? SUWON_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#0B57A7';
  const usedCategories = useMemo(() => [...new Set(SUWON_BLOCKS.map((block) => block.category))], []);
  const visibleSuwonBlocks = useMemo(() => SUWON_BLOCKS.filter((block) => (
    filterCats === null || filterCats.includes(block.category)
  )), [filterCats]);

  const traceSummaryText = useMemo(() => {
    if (SUWON_TRACE_REVIEW_SUMMARY.draftApproximate === 0) return '전체 공식 이미지 트레이싱 완료';
    return `재추적 진행 중: ${SUWON_TRACE_REVIEW_SUMMARY.officialImageTraced}/${SUWON_TRACE_REVIEW_SUMMARY.totalBlocks}`;
  }, []);

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

  const handleSelectFromFinder = useCallback((block: SuwonBlock) => {
    setSelected(block);
    setHover(null);
    setZoom((currentZoom) => Math.max(currentZoom, FINDER_FOCUS_ZOOM));
  }, [setHover, setSelected]);

  const renderMapSvg = (enableAutoCenter = true, allowFullscreen = true) => (
    <SuwonSeatMapSvg
      selectedId={selected?.id ?? null}
      hoveredId={hover}
      filterCats={visibleCats}
      onSelect={(block) => setSelected((current) => (current?.id === block.id ? null : block))}
      onHover={(block) => setHover(block?.id ?? null)}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={handleZoomChange}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomStep={ZOOM_STEP}
      enableAutoCenter={enableAutoCenter}
      onFullscreen={allowFullscreen ? openFullscreen : undefined}
    />
  );

  const filterBar = (
    <SeatMapFilterBar
      groups={SUWON_CATEGORY_GROUPS}
      selectedId={filterId}
      onChange={setFilterId}
      mode={mode}
      accentColor="#0B57A7"
      testIdPrefix="suwon"
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
        description={hoveredSection ? `${getSuwonSideLabel(hoveredSection.side)} · ${getSuwonFanRoleLabel(hoveredSection.fanRole)}` : undefined}
      />
    </div>
  );

  const detailPanel = (
    <SeatMapDetailPanel
      section={selected}
      mode={mode}
      categories={SUWON_CATEGORIES}
      adapter={suwonSectionAdapter}
      stadiumKey="SUWON"
      onClose={() => setSelected(null)}
      onUpload={() => selected && setUploadFor(selected)}
    />
  );

  const attribution = (
    <SeatMapAttribution
      source={{
        sourceLabel: SUWON_SEATMAP_IMAGE.sourceLabel,
        sourceUrl: SUWON_SEATMAP_IMAGE.sourceUrl,
        assetStatus: SUWON_SEATMAP_IMAGE.assetStatus,
      }}
    />
  );
  const legend = <SeatMapLegend categoryIds={usedCategories} categories={SUWON_CATEGORIES} mode={mode} />;
  const sectionFinder = (
    <SeatMapSectionFinder
      blocks={visibleSuwonBlocks}
      adapter={suwonSectionAdapter}
      categories={SUWON_CATEGORIES}
      filterCats={filterCats}
      selected={selected}
      onSelect={handleSelectFromFinder}
      onHoverChange={setHover}
      mode={mode}
      testIdPrefix="suwon"
      accentColor="#0B57A7"
      stadiumShortLabel="수원"
    />
  );

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    showToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
  }, [showToast, uploadFor]);

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="수원KT위즈파크"
        subtitle="수원 kt 위즈 파크 공식 좌석도"
        titleAccentColor="#0B57A7"
        isMobile={isMobile}
        isAuxiliaryGuideActive={false}
        filterBar={filterBar}
        mobileFilterBar={<div className="mb-2.5 overflow-x-auto">{filterBar}</div>}
        desktopFilterBar={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {filterBar}
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {traceSummaryText}
            </span>
          </div>
        }
        mapContent={mapContent}
        attribution={attribution}
        legend={legend}
        mobileSecondaryPanel={sectionFinder}
        mobileBottomSheet={selected && (
          <SeatMapBottomSheet
            section={selected}
            mode={mode}
            categories={SUWON_CATEGORIES}
            adapter={suwonSectionAdapter}
            stadiumKey="SUWON"
            onClose={() => setSelected(null)}
            onUpload={() => selected && setUploadFor(selected)}
          />
        )}
        mobileHasSidePanel={Boolean(selected)}
        desktopSecondaryPanel={sectionFinder}
        desktopSidePanel={detailPanel}
        toast={toast}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={(
          <div className="w-full">
            <div className="mx-auto flex h-full w-full max-w-[calc((100vh-120px)*0.943)] items-center justify-center">
              <div className="w-full">
                {renderMapSvg(true, false)}
              </div>
            </div>
          </div>
        )}
        fullscreenDialogTestId="suwon-seatmap-fullscreen"
        fullscreenCloseTestId="suwon-seatmap-fullscreen-close"
        fullscreenTitle="수원KT위즈파크"
        fullscreenSubtitle="kt 공식 좌석도 전체화면"
      />
      {uploadFor && (
        <SuwonUploadFlowModal
          section={uploadFor}
          mode={mode}
          onClose={() => setUploadFor(null)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </>
  );
}
