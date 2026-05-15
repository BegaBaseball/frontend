import { useCallback, useMemo, useState } from 'react';
import {
  GOCHEOK_BLOCKS,
  GOCHEOK_CATEGORIES,
  GOCHEOK_CATEGORY_GROUPS,
  GOCHEOK_SEATMAP_IMAGE,
  GOCHEOK_VIEW_INFO,
  getGocheokFanRoleLabel,
  getGocheokSideLabel,
  getGocheokSourceLabel,
  type GocheokBlock,
} from '../../data/gocheokSeatData';
import { useTheme } from '../../hooks/useTheme';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import GocheokFacilityGuide from './GocheokFacilityGuide';
import GocheokSeatMapSvg from './GocheokSeatMapSvg';
import GocheokUploadFlowModal from './GocheokUploadFlowModal';
import { SeatMapAttribution } from '../stadiumSeatMap/SeatMapAttribution';
import { SeatMapBottomSheet } from '../stadiumSeatMap/SeatMapBottomSheet';
import { SeatMapDetailPanel } from '../stadiumSeatMap/SeatMapDetailPanel';
import { SeatMapFilterBar } from '../stadiumSeatMap/SeatMapFilterBar';
import { SeatMapLegend } from '../stadiumSeatMap/SeatMapLegend';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapSelectionState } from '../stadiumSeatMap/useSeatMapSelectionState';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';
import type { SeatMapSectionAdapter } from '../stadiumSeatMap/seatMapCommonTypes';

type GocheokGuideMode = 'seatmap' | 'facility';

const GOCHEOK_GUIDE_MODES: { id: GocheokGuideMode; label: string }[] = [
  { id: 'seatmap', label: '공식 좌석도' },
  { id: 'facility', label: '시설현황' },
];

const gocheokSectionAdapter: SeatMapSectionAdapter<GocheokBlock> = {
  getId: (section) => section.id,
  getName: (section) => section.name,
  getBlock: (section) => section.block,
  getCategoryId: (section) => section.category,
  getLevel: (section) => section.level,
  getOfficialBlocks: (section) => section.officialBlocks,
  getSideLabel: (section) => getGocheokSideLabel(section.side),
  getFanRoleLabel: (section) => getGocheokFanRoleLabel(section.fanRole),
  getSourceLabel: (section) => getGocheokSourceLabel(section.sourceConfidence),
  getSourceNote: (section) => section.sourceNote,
  getSeatViewSections: (section) => section.seatViewSections,
  getAccessibilityNote: (section) => section.accessibilityNote,
  getDistance: (section) => (GOCHEOK_VIEW_INFO[section.id] ?? GOCHEOK_VIEW_INFO.default).distance,
  getNotes: (section) => (GOCHEOK_VIEW_INFO[section.id] ?? GOCHEOK_VIEW_INFO.default).notes,
  getTags: (section) => (GOCHEOK_VIEW_INFO[section.id] ?? GOCHEOK_VIEW_INFO.default).tags ?? [],
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

interface SeatMapPan {
  x: number;
  y: number;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function GuideModeTabs({
  value,
  onChange,
  mode,
}: {
  value: GocheokGuideMode;
  onChange: (value: GocheokGuideMode) => void;
  mode: 'light' | 'dark';
}) {
  return (
    <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {GOCHEOK_GUIDE_MODES.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className="rounded-lg border-0 px-3 py-1.5 text-[11px] font-black transition-colors"
            style={{
              background: active ? '#820024' : 'transparent',
              color: active ? '#ffffff' : (mode === 'dark' ? '#cbd5e1' : '#475569'),
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DetailPanel({
  section,
  mode,
  onClose,
  onUpload,
}: {
  section: GocheokBlock | null;
  mode: 'light' | 'dark';
  onClose: () => void;
  onUpload: () => void;
}) {
  if (!section) {
    return (
      <div className="sticky top-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">구역을 선택하세요</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            공식 좌석도에서 블록을 선택하면 실제 시야 사진을 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  const cat = GOCHEOK_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const info = GOCHEOK_VIEW_INFO[section.id] ?? GOCHEOK_VIEW_INFO.default;

  return (
    <div className="sticky top-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="relative px-5 pb-4 pt-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-slate-100 text-slate-500 dark:bg-slate-800"
        >
          ×
        </button>
        <div className="mb-2 flex flex-wrap gap-2 pr-10">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `${accent}22`, color: accent }}>
            {cat.label} · {section.level}
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            {getGocheokSourceLabel(section.sourceConfidence)}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{section.name}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">블록 {section.block}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">위치</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getGocheokSideLabel(section.side)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">팬 구분</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getGocheokFanRoleLabel(section.fanRole)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">시야 거리</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{info.distance ?? '-'}</div>
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">공식 블록 묶음</div>
        <div className="flex flex-wrap gap-1.5">
          {section.officialBlocks.map((block) => (
            <span key={block} className="rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}>
              {block}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">{section.sourceNote}</p>
        {section.accessibilityNote && (
          <p className="mt-2 rounded-xl bg-cyan-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
            {section.accessibilityNote}
          </p>
        )}
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">실제 시야 사진</div>
        <SeatViewGallery stadium="GOCHEOK" section={section.name} sectionAliases={section.seatViewSections} compact />
      </div>
      <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onUpload}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: accent }}
        >
          + 이 구역 시야 사진 올리기
        </button>
      </div>
    </div>
  );
}

export default function GocheokSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [activeGuideMode, setActiveGuideMode] = useState<GocheokGuideMode>('seatmap');
  const [uploadFor, setUploadFor] = useState<GocheokBlock | null>(null);
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
  } = useSeatMapSelectionState({
    sections: GOCHEOK_BLOCKS,
    filterGroups: GOCHEOK_CATEGORY_GROUPS,
    getId: (section) => section.id,
    getCategoryId: (section) => section.category,
  });
  const {
    isMobile,
    isFullscreenOpen,
    openFullscreen,
    closeFullscreen,
  } = useSeatMapTemplateShellState();
  const hasOfficialBlocks = GOCHEOK_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' && GOCHEOK_BLOCKS.length > 0;
  const isSeatMapMode = activeGuideMode === 'seatmap';
  const hoveredSection = isSeatMapMode ? activeHoveredSection : null;
  const hoveredCategory = hoveredSection ? GOCHEOK_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#820024';
  const usedCategories = useMemo(() => [...new Set(GOCHEOK_BLOCKS.map((block) => block.category))], []);

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    showToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
  }, [showToast, uploadFor]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom);
    setZoom(normalizedZoom);
    if (normalizedZoom === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const handleGuideModeChange = useCallback((nextMode: GocheokGuideMode) => {
    setActiveGuideMode(nextMode);
    setSelected(null);
    setHover(null);
    setUploadFor(null);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    closeFullscreen();
  }, []);

  const renderMapSvg = (enableAutoCenter = true, allowFullscreen = true) => (
    <GocheokSeatMapSvg
      mode={mode}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      filterCats={filterCats}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={handleZoomChange}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomStep={ZOOM_STEP}
      enableAutoCenter={enableAutoCenter}
      onFullscreen={allowFullscreen && hasOfficialBlocks ? openFullscreen : undefined}
    />
  );

  const attribution = (
    <SeatMapAttribution
      source={{
        sourceLabel: GOCHEOK_SEATMAP_IMAGE.sourceLabel,
        sourceUrl: GOCHEOK_SEATMAP_IMAGE.sourceUrl,
        assetStatus: GOCHEOK_SEATMAP_IMAGE.assetStatus,
      }}
    />
  );

  const legend = (
    <SeatMapLegend categoryIds={usedCategories} categories={GOCHEOK_CATEGORIES} mode={mode} />
  );

  const guideModeBar = (
    <div className="mb-2 px-1">
      <GuideModeTabs value={activeGuideMode} onChange={handleGuideModeChange} mode={mode} />
    </div>
  );

  const filterBar = hasOfficialBlocks && isSeatMapMode ? (
    <SeatMapFilterBar
      groups={GOCHEOK_CATEGORY_GROUPS}
      selectedId={filterId}
      onChange={setFilterId}
      mode={mode}
      accentColor="#820024"
      testIdPrefix="gocheok"
    />
  ) : undefined;

  const mapContent = (
    <div>
      {guideModeBar}
      {isSeatMapMode ? (
        <div className="relative">
          {renderMapSvg(!isFullscreenOpen)}
          <SeatMapHoverPreview
            visible={Boolean(hoveredSection && hoveredCategory)}
            title={hoveredSection?.name}
            subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
            badgeLabel={hoveredCategory?.label}
            accentColor={hoveredAccent}
            description={hoveredSection ? `${getGocheokSideLabel(hoveredSection.side)} · ${getGocheokFanRoleLabel(hoveredSection.fanRole)}` : undefined}
          />
        </div>
      ) : (
        <GocheokFacilityGuide mode={mode} />
      )}
      </div>
  );

  const detailPanel = hasOfficialBlocks && isSeatMapMode ? (
    <SeatMapDetailPanel
      section={selected}
      mode={mode}
      categories={GOCHEOK_CATEGORIES}
      adapter={gocheokSectionAdapter}
      stadiumKey="GOCHEOK"
      onClose={() => setSelected(null)}
      onUpload={() => selected && setUploadFor(selected)}
    />
  ) : null;

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="고척스카이돔"
        subtitle={isSeatMapMode ? '고척 키움 공식 좌석도' : '서울시설공단 공식 시설현황'}
        titleAccentColor="#820024"
        isMobile={isMobile}
        isAuxiliaryGuideActive={!isSeatMapMode}
        filterBar={filterBar}
        mobileFilterBar={filterBar && <div className="mb-2.5 overflow-x-auto">{filterBar}</div>}
        desktopFilterBar={filterBar}
        mapContent={mapContent}
        attribution={isSeatMapMode ? attribution : null}
        legend={hasOfficialBlocks && isSeatMapMode ? legend : undefined}
        mobileBottomSheet={hasOfficialBlocks && isSeatMapMode && selected && (
          <SeatMapBottomSheet
            section={selected}
            mode={mode}
            categories={GOCHEOK_CATEGORIES}
            adapter={gocheokSectionAdapter}
            stadiumKey="GOCHEOK"
            onClose={() => setSelected(null)}
            onUpload={() => selected && setUploadFor(selected)}
          />
        )}
        mobileHasSidePanel={Boolean(hasOfficialBlocks && isSeatMapMode && selected)}
        desktopSidePanel={detailPanel}
        toast={toast}
        isFullscreenOpen={isSeatMapMode && isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={(
          <div className="w-full">
            <div className="mx-auto flex h-full w-full items-center justify-center">
              <div className="w-full">
                {renderMapSvg(true, false)}
              </div>
            </div>
          </div>
        )}
        fullscreenDialogTestId="gocheok-seatmap-fullscreen"
        fullscreenCloseTestId="gocheok-seatmap-fullscreen-close"
        fullscreenTitle="고척스카이돔"
        fullscreenSubtitle="키움 공식 좌석도 전체화면"
      />
      {uploadFor && (
        <GocheokUploadFlowModal
          section={uploadFor}
          mode={mode}
          onClose={() => setUploadFor(null)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </>
  );
}
