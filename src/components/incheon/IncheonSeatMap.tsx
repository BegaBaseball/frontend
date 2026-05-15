import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Minus, Plus } from 'lucide-react';
import {
  INCHEON_BLOCKS,
  INCHEON_CATEGORIES,
  INCHEON_CATEGORY_GROUPS,
  INCHEON_SEATMAP_IMAGE,
  INCHEON_SEATMAP_VIEWPORT,
  INCHEON_VIEW_INFO,
  getIncheonFanRoleLabel,
  getIncheonSeatViewAliases,
  getIncheonSideLabel,
  getIncheonSourceLabel,
  type IncheonBlock,
} from '../../data/incheonSeatData';
import { useTheme } from '../../hooks/useTheme';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import IncheonSeatMapSvg from './IncheonSeatMapSvg';
import IncheonUploadFlowModal from './IncheonUploadFlowModal';
import { SeatMapAttribution } from '../stadiumSeatMap/SeatMapAttribution';
import { SeatMapBottomSheet } from '../stadiumSeatMap/SeatMapBottomSheet';
import { SeatMapDetailPanel } from '../stadiumSeatMap/SeatMapDetailPanel';
import { SeatMapFilterBar } from '../stadiumSeatMap/SeatMapFilterBar';
import { SeatMapLegend } from '../stadiumSeatMap/SeatMapLegend';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapSelectionState } from '../stadiumSeatMap/useSeatMapSelectionState';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';
import type { SeatMapSectionAdapter } from '../stadiumSeatMap/seatMapCommonTypes';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

const incheonSectionAdapter: SeatMapSectionAdapter<IncheonBlock> = {
  getId: (section) => section.id,
  getName: (section) => section.name,
  getBlock: (section) => section.block,
  getCategoryId: (section) => section.category,
  getLevel: (section) => section.level,
  getOfficialBlocks: (section) => section.officialBlocks,
  getSideLabel: (section) => getIncheonSideLabel(section.side),
  getFanRoleLabel: (section) => getIncheonFanRoleLabel(section.fanRole),
  getSourceLabel: (section) => getIncheonSourceLabel(section.sourceConfidence),
  getSourceNote: (section) => section.sourceNote,
  getSeatViewSections: (section) => getIncheonSeatViewAliases(section),
  getAccessibilityNote: (section) => section.accessibilityNote,
  getDistance: (section) => (INCHEON_VIEW_INFO[section.id] ?? INCHEON_VIEW_INFO.default).distance,
  getNotes: (section) => (INCHEON_VIEW_INFO[section.id] ?? INCHEON_VIEW_INFO.default).notes,
  getTags: (section) => (INCHEON_VIEW_INFO[section.id] ?? INCHEON_VIEW_INFO.default).tags ?? [],
};

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

interface SeatMapPan {
  x: number;
  y: number;
}

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFullscreen,
  mode,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFullscreen?: () => void;
  mode: 'light' | 'dark';
}) {
  const buttonClass = 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800';
  const borderColor = mode === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        data-testid="incheon-seatmap-zoom-in"
        aria-label="인천 좌석도 확대"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM}
        className={buttonClass}
        style={{ borderColor }}
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        data-testid="incheon-seatmap-zoom-reset"
        aria-label="인천 좌석도 초기화"
        onClick={onReset}
        disabled={zoom === MIN_ZOOM}
        className="h-8 min-w-14 cursor-pointer rounded-lg border px-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
        style={{ borderColor }}
      >
        {zoom.toFixed(2)}x
      </button>
      <button
        type="button"
        data-testid="incheon-seatmap-zoom-out"
        aria-label="인천 좌석도 축소"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className={buttonClass}
        style={{ borderColor }}
      >
        <Minus className="h-4 w-4" />
      </button>
      {onFullscreen && (
        <button
          type="button"
          data-testid="incheon-seatmap-fullscreen-open"
          aria-label="인천 좌석도 전체화면"
          onClick={onFullscreen}
          className={buttonClass}
          style={{ borderColor }}
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function IncheonSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [uploadFor, setUploadFor] = useState<IncheonBlock | null>(null);
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
    sections: INCHEON_BLOCKS,
    filterGroups: INCHEON_CATEGORY_GROUPS,
    getId: (section) => section.id,
    getCategoryId: (section) => section.category,
  });
  const {
    isMobile,
    isFullscreenOpen,
    openFullscreen,
    closeFullscreen,
  } = useSeatMapTemplateShellState();
  const hasOfficialBlocks = INCHEON_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' && INCHEON_BLOCKS.length > 0;
  const hoveredCategory = hoveredSection ? INCHEON_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#C8102E';
  const usedCategories = useMemo(() => [...new Set(INCHEON_BLOCKS.map((block) => block.category))], []);

  useEffect(() => {
    if (zoom <= MIN_ZOOM && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  const handleZoomIn = useCallback(() => {
    setZoom((value) => clampZoom(value + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((value) => {
      const nextZoom = clampZoom(value - ZOOM_STEP);
      if (nextZoom === MIN_ZOOM) {
        setPan({ x: 0, y: 0 });
      }
      return nextZoom;
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomChange = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom);
    setZoom(normalizedZoom);
    if (normalizedZoom === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    showToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
  }, [showToast, uploadFor]);

  const renderMapSvg = (enableAutoCenter = true) => (
    <IncheonSeatMapSvg
      mode={mode}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      filterCats={filterCats}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoomChange={handleZoomChange}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      enableAutoCenter={enableAutoCenter}
    />
  );
  const fullscreenMapMaxWidth = `calc((100vh - 144px) * ${INCHEON_SEATMAP_IMAGE.imageWidth / INCHEON_SEATMAP_VIEWPORT.cropHeight})`;

  const detailPanel = hasOfficialBlocks ? (
    <SeatMapDetailPanel
      section={selected}
      mode={mode}
      categories={INCHEON_CATEGORIES}
      adapter={incheonSectionAdapter}
      stadiumKey="INCHEON"
      onClose={() => setSelected(null)}
      onUpload={() => selected && setUploadFor(selected)}
    />
  ) : null;

  const attribution = (
    <SeatMapAttribution
      source={{
        sourceLabel: INCHEON_SEATMAP_IMAGE.sourceLabel,
        sourceUrl: INCHEON_SEATMAP_IMAGE.sourceUrl,
        assetStatus: INCHEON_SEATMAP_IMAGE.assetStatus,
      }}
    />
  );

  const legend = (
    <SeatMapLegend categoryIds={usedCategories} categories={INCHEON_CATEGORIES} mode={mode} />
  );
  const filterBar = hasOfficialBlocks ? (
    <SeatMapFilterBar
      groups={INCHEON_CATEGORY_GROUPS}
      selectedId={filterId}
      onChange={setFilterId}
      mode={mode}
      accentColor="#C8102E"
      testIdPrefix="incheon"
    />
  ) : undefined;

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="인천SSG랜더스필드"
        subtitle="인천 SSG 공식 좌석도"
        titleAccentColor="#C8102E"
        isMobile={isMobile}
        isAuxiliaryGuideActive={false}
        filterBar={filterBar}
        mobileFilterBar={hasOfficialBlocks ? (
          <div className="overflow-x-auto">
            {filterBar}
          </div>
        ) : undefined}
        desktopFilterBar={filterBar}
        mapContent={(
          <div className="relative">
            {renderMapSvg(!isFullscreenOpen)}
            {hasOfficialBlocks && (
              <div className="absolute right-3 top-3 z-20 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/95">
                <ZoomControls
                  zoom={zoom}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onReset={handleZoomReset}
                  onFullscreen={hasOfficialBlocks ? openFullscreen : undefined}
                  mode={mode}
                />
              </div>
            )}
            <SeatMapHoverPreview
              visible={Boolean(hoveredSection && hoveredCategory)}
              title={hoveredSection?.name}
              subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
              badgeLabel={hoveredCategory?.label}
              accentColor={hoveredAccent}
              description={hoveredSection ? `${getIncheonSideLabel(hoveredSection.side)} · ${getIncheonFanRoleLabel(hoveredSection.fanRole)}` : undefined}
            />
          </div>
        )}
        attribution={attribution}
        legend={hasOfficialBlocks ? legend : undefined}
        mobileBottomSheet={hasOfficialBlocks && selected && (
          <SeatMapBottomSheet
            section={selected}
            mode={mode}
            categories={INCHEON_CATEGORIES}
            adapter={incheonSectionAdapter}
            stadiumKey="INCHEON"
            onClose={() => setSelected(null)}
            onUpload={() => selected && setUploadFor(selected)}
          />
        )}
        mobileHasSidePanel={Boolean(hasOfficialBlocks && selected)}
        desktopSidePanel={detailPanel}
        toast={toast}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={(
          <div className="w-full">
            <div className="mx-auto h-full w-full" style={{ maxWidth: fullscreenMapMaxWidth }}>
              <div className="relative">
                <div className="absolute right-3 top-3 z-20 rounded-xl border border-slate-700 bg-slate-950/80 p-1 shadow-sm">
                  <ZoomControls
                    zoom={zoom}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onReset={handleZoomReset}
                    mode="dark"
                  />
                </div>
                {renderMapSvg(true)}
                <SeatMapHoverPreview
                  visible={Boolean(hoveredSection && hoveredCategory)}
                  title={hoveredSection?.name}
                  subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
                  badgeLabel={hoveredCategory?.label}
                  accentColor={hoveredAccent}
                  description={hoveredSection ? `${getIncheonSideLabel(hoveredSection.side)} · ${getIncheonFanRoleLabel(hoveredSection.fanRole)}` : undefined}
                />
              </div>
            </div>
          </div>
        )}
        fullscreenDialogTestId="incheon-seatmap-fullscreen"
        fullscreenCloseTestId="incheon-seatmap-fullscreen-close"
        fullscreenTitle="인천SSG랜더스필드"
        fullscreenSubtitle="인천 SSG 공식 좌석도 전체화면"
      />
      {uploadFor && (
        <IncheonUploadFlowModal
          section={uploadFor}
          mode={mode}
          onClose={() => setUploadFor(null)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </>
  );
}
