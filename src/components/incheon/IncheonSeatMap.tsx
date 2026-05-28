import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Minus, Plus } from 'lucide-react';
import {
  INCHEON_BLOCKS,
  INCHEON_CATEGORIES,
  INCHEON_CATEGORY_GROUPS,
  INCHEON_SEATMAP_IMAGE,
  INCHEON_SEATMAP_VIEWPORT,
  INCHEON_VIEW_INFO,
  getIncheonDecisionTags,
  getIncheonFanRoleLabel,
  getIncheonGuideMatches,
  getIncheonSeatViewAliases,
  getIncheonSideLabel,
  getIncheonSourceLabel,
  type IncheonBlock,
  type IncheonGuideIntent,
  type IncheonGuideMatch,
} from '../../data/incheonSeatData';
import { useTheme } from '../../hooks/useTheme';
import { useAuthAccessActions, useAuthSession } from '../../store/authStore';
import { useDiaryStore } from '../../store/diaryStore';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import IncheonSeatMapSvg from './IncheonSeatMapSvg';
import { SeatMapAttribution } from '../stadiumSeatMap/SeatMapAttribution';
import { SeatMapBottomSheet } from '../stadiumSeatMap/SeatMapBottomSheet';
import { SeatMapDetailPanel } from '../stadiumSeatMap/SeatMapDetailPanel';
import { SeatMapFilterBar } from '../stadiumSeatMap/SeatMapFilterBar';
import { SeatMapLegend } from '../stadiumSeatMap/SeatMapLegend';
import { SeatMapSectionFinder } from '../stadiumSeatMap/SeatMapSectionFinder';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapSelectionState } from '../stadiumSeatMap/useSeatMapSelectionState';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';
import type { SeatMapPan, SeatMapSectionAdapter } from '../stadiumSeatMap/seatMapCommonTypes';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;
const GUIDE_FOCUS_ZOOM = 1.45;
const FINDER_FOCUS_ZOOM = 1.5;
const GUIDE_RESULT_LIMIT = 10;

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
  getTags: (section) => Array.from(new Set([
    ...((INCHEON_VIEW_INFO[section.id] ?? INCHEON_VIEW_INFO.default).tags ?? []),
    ...getIncheonDecisionTags(section),
  ])),
};

const INCHEON_GUIDE_INTENTS: Array<{ id: IncheonGuideIntent; label: string; testId: string }> = [
  { id: '전체', label: '전체', testId: 'all' },
  { id: '홈 응원', label: '홈 응원', testId: 'home' },
  { id: '원정/3루', label: '원정/3루', testId: 'away-third' },
  { id: '중앙/테이블', label: '중앙/테이블', testId: 'center-table' },
  { id: '외야/가족', label: '외야/가족', testId: 'outfield-family' },
  { id: '접근성', label: '접근성', testId: 'accessible' },
];

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function formatDraftDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function IncheonFirstVisitGuide({
  intent,
  query,
  matches,
  mode,
  onIntentChange,
  onQueryChange,
  onSelectBlock,
}: {
  intent: IncheonGuideIntent;
  query: string;
  matches: IncheonGuideMatch[];
  mode: 'light' | 'dark';
  onIntentChange: (value: IncheonGuideIntent) => void;
  onQueryChange: (value: string) => void;
  onSelectBlock: (block: IncheonBlock) => void;
}) {
  const visibleMatches = matches.slice(0, GUIDE_RESULT_LIMIT);
  const isDark = mode === 'dark';

  return (
    <section
      data-testid="incheon-first-visit-guide"
      className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4"
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">처음 인천 가이드</h3>
          <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {matches.length}개 블록
          </div>
        </div>
        <div className="flex w-full">
          <input
            data-testid="incheon-guide-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="블록/좌석 검색"
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 sm:w-56"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {INCHEON_GUIDE_INTENTS.map((option) => {
          const active = intent === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-testid={`incheon-guide-intent-${option.testId}`}
              onClick={() => onIntentChange(option.id)}
              aria-pressed={active}
              className="shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: active ? '#C8102E' : 'transparent',
                borderColor: active ? '#C8102E' : (isDark ? '#334155' : '#e2e8f0'),
                color: active ? '#fff' : (isDark ? '#cbd5e1' : '#334155'),
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {visibleMatches.length > 0 ? (
          visibleMatches.map(({ block, reasons, tags }) => {
            const cat = INCHEON_CATEGORIES[block.category];
            const accent = mode === 'dark' ? cat?.dark : cat?.light;

            return (
              <button
                key={block.id}
                type="button"
                data-testid={`incheon-guide-result-${block.id}`}
                onClick={() => onSelectBlock(block)}
                className="shrink-0 cursor-pointer rounded-xl border px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700"
                style={{
                  borderColor: accent ? `${accent}66` : undefined,
                  background: isDark ? '#020617' : '#f8fafc',
                }}
              >
                <div className="text-xs font-black text-slate-900 dark:text-white">
                  {block.block}
                  <span className="ml-1 font-semibold text-slate-500 dark:text-slate-400">
                    {cat?.label ?? block.name}
                  </span>
                </div>
                <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {[...reasons.slice(0, 2), ...tags.slice(0, 1)].join(' · ')}
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            검색 결과가 없습니다
          </div>
        )}
      </div>
    </section>
  );
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
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();
  const { requireLogin } = useAuthAccessActions();
  const setPendingDraft = useDiaryStore((state) => state.setPendingDraft);
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [guideIntent, setGuideIntent] = useState<IncheonGuideIntent>('전체');
  const [guideQuery, setGuideQuery] = useState('');
  const {
    selected,
    setSelected,
    hover,
    setHover,
    hoveredSection,
    filterId,
    setFilterId,
    filterCats,
    filterSides,
    filterLevels,
  } = useSeatMapSelectionState({
    sections: INCHEON_BLOCKS,
    filterGroups: INCHEON_CATEGORY_GROUPS,
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
  const hasOfficialBlocks = INCHEON_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' && INCHEON_BLOCKS.length > 0;
  const hoveredCategory = hoveredSection ? INCHEON_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#C8102E';
  const usedCategories = useMemo(() => [...new Set(INCHEON_BLOCKS.map((block) => block.category))], []);
  const visibleIncheonBlocks = useMemo(() => INCHEON_BLOCKS.filter((block) => {
    if (filterCats !== null && !filterCats.includes(block.category)) return false;
    if (filterSides != null && !filterSides.includes(block.side)) return false;
    if (filterLevels != null && !filterLevels.includes(block.level)) return false;
    return true;
  }), [filterCats, filterLevels, filterSides]);
  const guideMatches = useMemo(() => (
    getIncheonGuideMatches(guideIntent, guideQuery)
  ), [guideIntent, guideQuery]);

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

  const handleGuideIntentChange = useCallback((nextIntent: IncheonGuideIntent) => {
    setGuideIntent(nextIntent);
    setFilterId('all');
  }, [setFilterId]);

  const handleGuideQueryChange = useCallback((nextQuery: string) => {
    setGuideQuery(nextQuery);
    setFilterId('all');
  }, [setFilterId]);

  const handleGuideBlockSelect = useCallback((block: IncheonBlock) => {
    setFilterId('all');
    setSelected(block);
    setHover(null);
    setZoom((currentZoom) => Math.max(currentZoom, GUIDE_FOCUS_ZOOM));
  }, [setFilterId, setHover, setSelected]);

  const handleSelectFromFinder = useCallback((block: IncheonBlock) => {
    setSelected(block);
    setHover(null);
    setZoom((currentZoom) => Math.max(currentZoom, FINDER_FOCUS_ZOOM));
  }, [setHover, setSelected]);

  const handleShareSeatView = useCallback((section: IncheonBlock | null) => {
    if (!section) return;

    setPendingDraft({
      date: formatDraftDate(new Date()),
      stadium: 'INCHEON',
      team: 'SSG',
      section: section.name,
      block: section.block,
      seatRow: '',
      seatNumber: '',
    });

    if (!isLoggedIn) {
      requireLogin('/mypage');
      return;
    }

    navigate('/mypage');
  }, [isLoggedIn, navigate, requireLogin, setPendingDraft]);

  const renderMapSvg = (enableAutoCenter = true) => (
    <IncheonSeatMapSvg
      mode={mode}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      filterCats={filterCats}
      filterSides={filterSides}
      filterLevels={filterLevels}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={handleZoomChange}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomStep={ZOOM_STEP}
      enableAutoCenter={enableAutoCenter}
    />
  );
  const fullscreenMapMaxWidth = `calc((100vh - 144px) * ${INCHEON_SEATMAP_IMAGE.imageWidth / INCHEON_SEATMAP_VIEWPORT.cropHeight})`;

  const detailPanel = hasOfficialBlocks ? (
    <div data-testid="incheon-seatmap-detail-panel">
      <SeatMapDetailPanel
        section={selected}
        mode={mode}
        categories={INCHEON_CATEGORIES}
        adapter={incheonSectionAdapter}
        stadiumKey="INCHEON"
        onClose={() => setSelected(null)}
        onUpload={() => handleShareSeatView(selected)}
        copy={{ uploadLabel: '다이어리에서 시야 사진 공유하기' }}
      />
    </div>
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

  const guidePanel = hasOfficialBlocks ? (
    <IncheonFirstVisitGuide
      intent={guideIntent}
      query={guideQuery}
      matches={guideMatches}
      mode={mode}
      onIntentChange={handleGuideIntentChange}
      onQueryChange={handleGuideQueryChange}
      onSelectBlock={handleGuideBlockSelect}
    />
  ) : null;

  const sectionFinder = hasOfficialBlocks ? (
    <SeatMapSectionFinder
      blocks={visibleIncheonBlocks}
      adapter={incheonSectionAdapter}
      categories={INCHEON_CATEGORIES}
      filterCats={filterCats}
      selected={selected}
      onSelect={handleSelectFromFinder}
      onHoverChange={setHover}
      mode={mode}
      testIdPrefix="incheon"
      accentColor="#C8102E"
      stadiumShortLabel="인천"
    />
  ) : null;

  const secondaryPanel = hasOfficialBlocks ? (
    <>
      {guidePanel}
      {sectionFinder}
    </>
  ) : null;

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
        mobileSecondaryPanel={secondaryPanel}
        mobileBottomSheet={hasOfficialBlocks && selected && (
          <SeatMapBottomSheet
            section={selected}
            mode={mode}
            categories={INCHEON_CATEGORIES}
            adapter={incheonSectionAdapter}
            stadiumKey="INCHEON"
            onClose={() => setSelected(null)}
            onUpload={() => handleShareSeatView(selected)}
            copy={{ uploadLabel: '다이어리에서 시야 사진 공유하기' }}
          />
        )}
        mobileHasSidePanel={Boolean(hasOfficialBlocks && selected)}
        desktopSecondaryPanel={secondaryPanel}
        desktopSidePanel={detailPanel}
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
    </>
  );
}
