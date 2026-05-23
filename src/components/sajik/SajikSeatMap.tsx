import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_CATEGORY_GROUPS,
  SAJIK_DEFAULT_SEATMAP_SOURCE_ID,
  SAJIK_SEATMAP_IMAGE,
  SAJIK_SEATMAP_SOURCE_REFERENCES,
  SAJIK_VIEW_INFO,
  getSajikFanRoleLabel,
  getSajikGuideMatches,
  getSajikSeatViewAliases,
  getSajikSideLabel,
  getSajikSourceLabel,
  type SajikBlock,
  type SajikGuideIntent,
  type SajikSeatMapSourceId,
} from '../../data/sajikSeatData';
import { SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET } from '../../data/sajikOperatorReferenceSeatMapDataset';
import { useTheme } from '../../hooks/useTheme';
import { useAuthAccessActions, useAuthSession } from '../../store/authStore';
import { useDiaryStore } from '../../store/diaryStore';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import SajikSeatMapSvg from './SajikSeatMapSvg';
import type { SeatMapPan } from '../stadiumSeatMap/seatMapCommonTypes';
import { SeatMapAttribution } from '../stadiumSeatMap/SeatMapAttribution';
import { SeatMapBottomSheet } from '../stadiumSeatMap/SeatMapBottomSheet';
import { SeatMapDetailPanel } from '../stadiumSeatMap/SeatMapDetailPanel';
import { SeatMapFilterBar } from '../stadiumSeatMap/SeatMapFilterBar';
import { SeatMapLegend } from '../stadiumSeatMap/SeatMapLegend';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapSelectionState } from '../stadiumSeatMap/useSeatMapSelectionState';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';
import type { SeatMapSectionAdapter } from '../stadiumSeatMap/seatMapCommonTypes';
import { SeatMapSectionFinder } from '../stadiumSeatMap/SeatMapSectionFinder';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;
const GUIDE_FOCUS_ZOOM = 1.45;
const FINDER_FOCUS_ZOOM = 1.5;
const GUIDE_RESULT_LIMIT = 10;

const sajikSectionAdapter: SeatMapSectionAdapter<SajikBlock> = {
  getId: (section) => section.id,
  getName: (section) => section.name,
  getBlock: (section) => section.block,
  getCategoryId: (section) => section.category,
  getLevel: (section) => section.level,
  getOfficialBlocks: (section) => section.officialBlocks,
  getSideLabel: (section) => getSajikSideLabel(section.side),
  getFanRoleLabel: (section) => getSajikFanRoleLabel(section.fanRole),
  getSourceLabel: (section) => getSajikSourceLabel(section.sourceConfidence),
  getSourceNote: (section) => section.sourceNote,
  getSeatViewSections: (section) => getSajikSeatViewAliases(section),
  getAccessibilityNote: (section) => section.accessibilityNote,
  getDistance: (section) => (SAJIK_VIEW_INFO[section.id] ?? SAJIK_VIEW_INFO.default).distance,
  getNotes: (section) => (SAJIK_VIEW_INFO[section.id] ?? SAJIK_VIEW_INFO.default).notes,
  getTags: (section) => (SAJIK_VIEW_INFO[section.id] ?? SAJIK_VIEW_INFO.default).tags ?? [],
};

const SAJIK_GUIDE_INTENTS: Array<{ id: SajikGuideIntent; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'home_cheer', label: '홈 응원' },
  { id: 'away_third', label: '원정/3루' },
  { id: 'center_table', label: '중앙/테이블' },
  { id: 'outfield', label: '외야' },
  { id: 'accessible', label: '휠체어석' },
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

function SajikFirstVisitGuide({
  intent,
  query,
  matches,
  mode,
  onIntentChange,
  onQueryChange,
  onSelectBlock,
}: {
  intent: SajikGuideIntent;
  query: string;
  matches: ReturnType<typeof getSajikGuideMatches>;
  mode: 'light' | 'dark';
  onIntentChange: (value: SajikGuideIntent) => void;
  onQueryChange: (value: string) => void;
  onSelectBlock: (block: SajikBlock) => void;
}) {
  const visibleMatches = matches.slice(0, GUIDE_RESULT_LIMIT);
  const isDark = mode === 'dark';

  return (
    <section
      data-testid="sajik-first-visit-guide"
      className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4"
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">처음 사직 가이드</h3>
          <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {matches.length}개 블록
          </div>
        </div>
        <div className="flex w-full">
          <input
            data-testid="sajik-guide-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="블록/좌석 검색"
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 sm:w-56"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SAJIK_GUIDE_INTENTS.map((option) => {
          const active = intent === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-testid={`sajik-guide-intent-${option.id}`}
              onClick={() => onIntentChange(option.id)}
              aria-pressed={active}
              className="shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: active ? '#041E42' : 'transparent',
                borderColor: active ? '#041E42' : (isDark ? '#334155' : '#e2e8f0'),
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
          visibleMatches.map(({ block, reasons }) => {
            const cat = SAJIK_CATEGORIES[block.category];
            const accent = mode === 'dark' ? cat?.dark : cat?.light;

            return (
              <button
                key={block.id}
                type="button"
                data-testid={`sajik-guide-result-${block.id}`}
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
                  {reasons.slice(0, 2).join(' · ')}
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            검색 결과 없음
          </div>
        )}
      </div>
    </section>
  );
}

function DetailPanel({
  section,
  mode,
  onClose,
  onUpload,
}: {
  section: SajikBlock | null;
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
            공식 좌석도에서 블록을 선택하면 실제 시야 사진을 확인하고 다이어리에서 시야 사진을 공유할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  const cat = SAJIK_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const info = SAJIK_VIEW_INFO[section.id] ?? SAJIK_VIEW_INFO.default;

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
            {getSajikSourceLabel(section.sourceConfidence)}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{section.name}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">블록 {section.block}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">위치</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getSajikSideLabel(section.side)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">팬 구분</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getSajikFanRoleLabel(section.fanRole)}</div>
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
        <SeatViewGallery stadium="SAJIK" section={section.name} sectionAliases={getSajikSeatViewAliases(section)} compact />
      </div>
      <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onUpload}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: accent }}
        >
          다이어리에서 시야 사진 공유하기
        </button>
      </div>
    </div>
  );
}

export default function SajikSeatMap() {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();
  const { requireLogin } = useAuthAccessActions();
  const setPendingDraft = useDiaryStore((state) => state.setPendingDraft);
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [seatMapSourceId, setSeatMapSourceId] = useState<SajikSeatMapSourceId>(SAJIK_DEFAULT_SEATMAP_SOURCE_ID);
  const [guideIntent, setGuideIntent] = useState<SajikGuideIntent>('all');
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
    activeFilterGroup,
  } = useSeatMapSelectionState({
    sections: SAJIK_BLOCKS,
    filterGroups: SAJIK_CATEGORY_GROUPS,
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
  const hasOfficialBlocks = SAJIK_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' && SAJIK_BLOCKS.length > 0;
  const activeSeatMapSource = SAJIK_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === seatMapSourceId)
    ?? SAJIK_SEATMAP_SOURCE_REFERENCES[0]!;
  const isReferenceSourceActive = activeSeatMapSource.kind === 'REFERENCE_IMAGE';
  const isOperatorReferenceInteractivePreviewEnabled = isReferenceSourceActive
    && (
      activeSeatMapSource.polygonStatus === 'PRODUCTION_INTERACTIVE'
      || activeSeatMapSource.polygonStatus === 'REFERENCE_INTERACTIVE_PREVIEW_READY'
    )
    && SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.runtimeSelectionEnabled;
  const hasOfficialInteractiveSeatMap = hasOfficialBlocks && !isReferenceSourceActive;
  const hasReferenceInteractivePreview = isReferenceSourceActive && isOperatorReferenceInteractivePreviewEnabled;
  const hasInteractiveSeatMap = hasOfficialInteractiveSeatMap || hasReferenceInteractivePreview;
  const visibleSajikBlocks = useMemo(() => SAJIK_BLOCKS.filter((block) => {
    if (filterCats !== null && !filterCats.includes(block.category)) return false;
    if (activeFilterGroup?.sides != null && !activeFilterGroup.sides.includes(block.side)) return false;
    if (activeFilterGroup?.levels != null && !activeFilterGroup.levels.includes(block.level)) return false;
    return true;
  }), [filterCats, activeFilterGroup]);
  const guideMatches = useMemo(
    () => (hasOfficialInteractiveSeatMap ? getSajikGuideMatches(guideIntent, guideQuery, SAJIK_BLOCKS) : []),
    [guideIntent, guideQuery, hasOfficialInteractiveSeatMap],
  );
  const guideActive = hasOfficialInteractiveSeatMap && (guideIntent !== 'all' || guideQuery.trim().length > 0);
  const guideMatchedBlockIds = useMemo(
    () => (guideActive ? guideMatches.map((match) => match.block.id) : []),
    [guideActive, guideMatches],
  );
  const hoveredCategory = hoveredSection ? SAJIK_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#041E42';
  const usedCategories = useMemo(() => [...new Set(SAJIK_BLOCKS.map((block) => block.category))], []);

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

  const handleSeatMapSourceChange = useCallback((nextSourceId: SajikSeatMapSourceId) => {
    setSeatMapSourceId(nextSourceId);
    setSelected(null);
    setHover(null);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setFilterId('all');
  }, [setFilterId, setHover, setSelected]);

  const handleGuideIntentChange = useCallback((nextIntent: SajikGuideIntent) => {
    setGuideIntent(nextIntent);
    setFilterId('all');
  }, []);

  const handleGuideQueryChange = useCallback((nextQuery: string) => {
    setGuideQuery(nextQuery);
    setFilterId('all');
  }, []);

  const handleGuideBlockSelect = useCallback((block: SajikBlock) => {
    setSelected(block);
    setHover(null);
    setFilterId('all');
    setZoom((currentZoom) => (currentZoom < GUIDE_FOCUS_ZOOM ? GUIDE_FOCUS_ZOOM : currentZoom));
  }, []);

  const handleSelectFromFinder = useCallback((block: SajikBlock) => {
    setSelected(block);
    setZoom((currentZoom) => Math.max(currentZoom, FINDER_FOCUS_ZOOM));
  }, []);

  const handleShareSeatView = useCallback((section: SajikBlock | null) => {
    if (!section) return;

    setPendingDraft({
      date: formatDraftDate(new Date()),
      stadium: 'SAJIK',
      team: '롯데',
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

  const renderMapSvg = (enableAutoCenter = true, allowFullscreen = true) => (
    <SajikSeatMapSvg
      mode={mode}
      seatMapSourceId={seatMapSourceId}
      onSeatMapSourceChange={handleSeatMapSourceChange}
      selected={hasInteractiveSeatMap ? selected : null}
      setSelected={setSelected}
      hover={hasInteractiveSeatMap ? hover : null}
      setHover={setHover}
      filterCats={hasInteractiveSeatMap ? filterCats : null}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={handleZoomChange}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomStep={ZOOM_STEP}
      enableAutoCenter={enableAutoCenter}
      onFullscreen={allowFullscreen && hasInteractiveSeatMap ? openFullscreen : undefined}
      guideMatchedBlockIds={guideMatchedBlockIds}
      guideActive={guideActive}
      enableOperatorReferenceInteractivePreview={hasReferenceInteractivePreview}
    />
  );

  const guidePanel = hasOfficialInteractiveSeatMap ? (
    <SajikFirstVisitGuide
      intent={guideIntent}
      query={guideQuery}
      matches={guideMatches}
      mode={mode}
      onIntentChange={handleGuideIntentChange}
      onQueryChange={handleGuideQueryChange}
      onSelectBlock={handleGuideBlockSelect}
    />
  ) : null;

  const sectionFinder = hasOfficialInteractiveSeatMap ? (
    <SeatMapSectionFinder
      blocks={visibleSajikBlocks}
      adapter={sajikSectionAdapter}
      categories={SAJIK_CATEGORIES}
      filterCats={filterCats}
      selected={selected}
      onSelect={handleSelectFromFinder}
      onHoverChange={setHover}
      mode={mode}
      testIdPrefix="sajik"
      accentColor="#041E42"
      stadiumShortLabel="사직"
    />
  ) : null;

  const secondaryPanel = hasOfficialInteractiveSeatMap ? (
    <>
      {guidePanel}
      {sectionFinder}
    </>
  ) : null;

  const attribution = (
    <SeatMapAttribution
      source={isReferenceSourceActive ? {
        prefixLabel: '기준 이미지:',
        sourceLabel: activeSeatMapSource.sourceLabel,
        sourceUrl: activeSeatMapSource.sourceUrl,
        assetStatus: activeSeatMapSource.assetStatus,
      } : {
        sourceLabel: SAJIK_SEATMAP_IMAGE.sourceLabel,
        sourceUrl: SAJIK_SEATMAP_IMAGE.sourceUrl,
        assetStatus: SAJIK_SEATMAP_IMAGE.assetStatus,
      }}
      secondarySources={isReferenceSourceActive ? [{
        prefixLabel: '공식 이미지:',
        sourceLabel: SAJIK_SEATMAP_IMAGE.sourceLabel,
        sourceUrl: SAJIK_SEATMAP_IMAGE.sourceUrl,
        assetStatus: SAJIK_SEATMAP_IMAGE.assetStatus,
      }] : undefined}
    />
  );

  const legend = (
    <SeatMapLegend categoryIds={usedCategories} categories={SAJIK_CATEGORIES} mode={mode} />
  );

  const filterBar = hasOfficialInteractiveSeatMap ? (
    <SeatMapFilterBar
      groups={SAJIK_CATEGORY_GROUPS}
      selectedId={filterId}
      onChange={setFilterId}
      mode={mode}
      accentColor="#041E42"
      testIdPrefix="sajik"
    />
  ) : undefined;

  const detailPanel = hasInteractiveSeatMap ? (
    <SeatMapDetailPanel
      section={selected}
      mode={mode}
      categories={SAJIK_CATEGORIES}
      adapter={sajikSectionAdapter}
      stadiumKey="SAJIK"
      onClose={() => setSelected(null)}
      onUpload={() => handleShareSeatView(selected)}
      copy={{ uploadLabel: '다이어리에서 시야 사진 공유하기' }}
    />
  ) : null;

  const mapContent = (
    <div className="relative">
      {renderMapSvg(!isFullscreenOpen)}
      <SeatMapHoverPreview
        visible={Boolean(hoveredSection && hoveredCategory)}
        title={hoveredSection?.name}
        subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
        badgeLabel={hoveredCategory?.label}
        accentColor={hoveredAccent}
        description={hoveredSection ? `${getSajikSideLabel(hoveredSection.side)} · ${getSajikFanRoleLabel(hoveredSection.fanRole)}` : undefined}
      />
    </div>
  );

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="부산 사직야구장"
        subtitle={isReferenceSourceActive ? '사직 기준 좌석도' : '롯데 공식 좌석도'}
        titleAccentColor="#041E42"
        isMobile={isMobile}
        isAuxiliaryGuideActive={isReferenceSourceActive && !hasReferenceInteractivePreview}
        filterBar={filterBar}
        mobileFilterBar={filterBar ? <div className="overflow-x-auto">{filterBar}</div> : undefined}
        desktopFilterBar={filterBar && <div className="overflow-x-auto">{filterBar}</div>}
        mapContent={mapContent}
        attribution={attribution}
        legend={hasInteractiveSeatMap ? legend : undefined}
        mobileSecondaryPanel={secondaryPanel}
        mobileBottomSheet={hasInteractiveSeatMap && selected && (
          <SeatMapBottomSheet
            section={selected}
            mode={mode}
            categories={SAJIK_CATEGORIES}
            adapter={sajikSectionAdapter}
            stadiumKey="SAJIK"
            onClose={() => setSelected(null)}
            onUpload={() => handleShareSeatView(selected)}
            copy={{ uploadLabel: '다이어리에서 시야 사진 공유하기' }}
          />
        )}
        mobileHasSidePanel={Boolean(hasInteractiveSeatMap && selected)}
        desktopSecondaryPanel={secondaryPanel}
        desktopSidePanel={detailPanel}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={(
          <div className="w-full">
            <div className="mx-auto flex h-full w-full max-w-[calc((100vh-120px)*1.5)] items-center justify-center">
              <div className="w-full">
                {renderMapSvg(true, false)}
              </div>
            </div>
          </div>
        )}
        fullscreenDialogTestId="sajik-seatmap-fullscreen"
        fullscreenCloseTestId="sajik-seatmap-fullscreen-close"
        fullscreenTitle="부산 사직야구장"
        fullscreenSubtitle={isReferenceSourceActive ? '사직 기준 좌석도 전체화면' : '롯데 공식 좌석도 전체화면'}
      />
    </>
  );
}
