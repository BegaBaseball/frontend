import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DAEGU_CATEGORIES,
  DAEGU_CATEGORY_GROUPS,
  DAEGU_VIEW_INFO,
  getDaeguFanRoleLabel,
  getDaeguSideLabel,
  getDaeguSourceLabel,
  getDaeguTraceMethodLabel,
  getDaeguTraceStatusLabel,
  isDaeguNormalSelectableSeat,
  type DaeguBlock,
} from '../../data/daeguSeatData';
import {
  DAEGU_CANONICAL_BLOCKS,
  DAEGU_CANONICAL_SEATMAP_IMAGE,
  type DaeguCanonicalBlock,
} from '../../data/daeguCanonicalSeatMap';
import { useTheme } from '../../hooks/useTheme';
import { useAuthAccessActions, useAuthSession } from '../../store/authStore';
import { useDiaryStore } from '../../store/diaryStore';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import DaeguSeatMapSvg from './DaeguSeatMapSvg';
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
import { filterAndRankDaeguSeatMapBlocks } from './daeguSeatMapSearch';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const FINDER_FOCUS_ZOOM = 1.6;

const daeguSectionAdapter: SeatMapSectionAdapter<DaeguCanonicalBlock> = {
  getId: (section) => section.id,
  getName: (section) => section.name,
  getBlock: (section) => section.block,
  getCategoryId: (section) => section.category,
  getLevel: (section) => section.level,
  getOfficialBlocks: (section) => section.officialBlocks,
  getSideLabel: (section) => getDaeguSideLabel(section.side),
  getFanRoleLabel: (section) => getDaeguFanRoleLabel(section.fanRole),
  getSourceLabel: (section) => getDaeguSourceLabel(section.sourceConfidence),
  getSourceNote: (section) => section.sourceNote,
  getSeatViewSections: (section) => section.seatViewSections,
  getAccessibilityNote: (section) => section.accessibilityNote,
  getDistance: (section) => (DAEGU_VIEW_INFO[section.id] ?? DAEGU_VIEW_INFO.default).distance,
  getNotes: (section) => {
    const info = DAEGU_VIEW_INFO[section.id] ?? DAEGU_VIEW_INFO.default;
    const traceText = `${getDaeguTraceMethodLabel(section.traceMethod)} · ${getDaeguTraceStatusLabel(section.traceStatus)}`;
    return [info.notes, traceText, section.reviewNote].filter(Boolean).join(' · ');
  },
  getTags: (section) => (DAEGU_VIEW_INFO[section.id] ?? DAEGU_VIEW_INFO.default).tags ?? [],
};

function formatDraftDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaeguCanonicalDecisionStatusLabel(status: DaeguCanonicalBlock['canonicalDecisionStatus']): string {
  if (status === 'CANONICAL_OPERATOR_FROM_OVERLAP') return 'operator overlap canonical';
  return 'operator-only canonical';
}

function getDaeguCanonicalDecisionStatusLabel(status: DaeguCanonicalBlock['canonicalDecisionStatus']): string {
  if (status === 'CANONICAL_OPERATOR_FROM_OVERLAP') return 'operator overlap canonical';
  return 'operator-only canonical';
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function SectionFinder({
  blocks,
  totalCount,
  selected,
  mode,
  searchTerm,
  activeFilterLabel,
  onSearchChange,
  onSelect,
  onHover,
  autoFocusInput = false,
}: {
  blocks: DaeguCanonicalBlock[];
  totalCount: number;
  selected: DaeguCanonicalBlock | null;
  mode: 'light' | 'dark';
  searchTerm: string;
  activeFilterLabel: string;
  onSearchChange: (value: string) => void;
  onSelect: (block: DaeguCanonicalBlock) => void;
  onHover: (id: string | null) => void;
  autoFocusInput?: boolean;
}) {
  const borderColor = mode === 'dark' ? '#334155' : '#e2e8f0';
  const hasSearch = searchTerm.trim().length > 0;

  return (
    <aside
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="daegu-section-finder"
    >
      <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white">블록 검색</h3>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
              {blocks.length}/{totalCount}개 표시
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-[#074CA1] dark:bg-blue-950/45 dark:text-blue-200">
            DAEGU
          </span>
        </div>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            data-testid="daegu-block-search"
            aria-label="대구 좌석 블록 검색"
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            autoFocus={autoFocusInput}
            placeholder="블록, 구역명 검색 (예: 1-1, 블루존)"
            className="h-10 w-full rounded-xl border bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#074CA1] focus:bg-white dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
            style={{ borderColor }}
          />
        </label>
      </div>
      <div className="max-h-[520px] overflow-y-auto p-2">
        {blocks.length > 0 ? (
          <div className="space-y-1.5">
            {blocks.map((block) => {
              const cat = DAEGU_CATEGORIES[block.category];
              const accent = mode === 'dark' ? cat.dark : cat.light;
              const active = selected?.id === block.id;
              const needsReview = block.traceStatus === 'NEEDS_OPERATOR_REVIEW';

              return (
                <button
                  key={block.id}
                  type="button"
                  data-testid={`daegu-section-finder-item-${block.id}`}
                  onClick={() => onSelect(block)}
                  onMouseEnter={() => onHover(block.id)}
                  onMouseLeave={() => onHover(null)}
                  className="w-full cursor-pointer rounded-xl border px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  style={{
                    borderColor: active ? accent : 'transparent',
                    background: active ? `${accent}14` : 'transparent',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ background: accent }}>
                          {block.block}
                        </span>
                        <span className="text-xs font-black text-slate-800 dark:text-white">{block.name}</span>
                      </div>
                      <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {cat.label} · {getDaeguSideLabel(block.side)} · {getDaeguFanRoleLabel(block.fanRole)}
                      </p>
                    </div>
                    {needsReview && (
                      <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-700 dark:bg-orange-950/40 dark:text-orange-200">
                        검수 필요
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div
            data-testid="daegu-section-finder-empty"
            className="flex min-h-[180px] flex-col items-center justify-center rounded-xl bg-slate-50 px-4 text-center dark:bg-slate-800"
          >
            <p className="text-sm font-black text-slate-700 dark:text-slate-100">검색어와 선택한 필터에 맞는 구역이 없습니다</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
              블록 번호, 좌석명, 공식 블록 묶음 이름으로 다시 검색하세요.
            </p>
            {hasSearch && (
              <p className="mt-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">검색어: {searchTerm.trim()}</p>
            )}
            <p className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">필터: {activeFilterLabel}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function DetailPanel({
  section,
  mode,
  onClose,
  onUpload,
}: {
  section: DaeguBlock | null;
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

  const cat = DAEGU_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const info = DAEGU_VIEW_INFO[section.id] ?? DAEGU_VIEW_INFO.default;

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
            {getDaeguSourceLabel(section.sourceConfidence)}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{section.name}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">블록 {section.block}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">위치</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getDaeguSideLabel(section.side)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">팬 구분</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getDaeguFanRoleLabel(section.fanRole)}</div>
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
        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-400 dark:text-slate-500">
          {getDaeguTraceMethodLabel(section.traceMethod)} · {getDaeguTraceStatusLabel(section.traceStatus)}
        </p>
        {section.traceStatus === 'NEEDS_OPERATOR_REVIEW' && section.reviewNote && (
          <p className="mt-2 rounded-xl bg-orange-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-orange-800 dark:bg-orange-950/35 dark:text-orange-200">
            {section.reviewNote}
          </p>
        )}
        {section.accessibilityNote && (
          <p className="mt-2 rounded-xl bg-cyan-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
            {section.accessibilityNote}
          </p>
        )}
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">실제 시야 사진</div>
        <SeatViewGallery stadium="DAEGU" section={section.name} sectionAliases={section.seatViewSections} compact />
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">{label}</div>
      <div className="text-base font-black text-slate-800 dark:text-white">{value}</div>
    </div>
  );
}

function DaeguExtraMeta({ section, accent }: { section: DaeguCanonicalBlock; accent: string }) {
  const traceSource = section.imageGeometry.traceSource ?? '-';
  const officialBlocks = section.officialBlocks.length > 0 ? section.officialBlocks.join(', ') : '-';

  return (
    <div data-testid="daegu-seatmap-extra-meta" className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
      <div className="grid grid-cols-2 gap-2.5">
        <InfoTile label="canonical block key" value={section.canonicalBlockKey} />
        <InfoTile label="정확 블록" value={section.block} />
        <InfoTile label="공식 블록" value={officialBlocks} />
        <InfoTile label="source confidence" value={getDaeguSourceLabel(section.sourceConfidence)} />
      </div>
      <div className="mt-3 space-y-2 text-[12px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        <div
          data-testid="daegu-seatmap-canonical-decision-status"
          className="rounded-xl px-3 py-2"
          style={{ background: `${accent}12` }}
        >
          canonical decision status: {getDaeguCanonicalDecisionStatusLabel(section.canonicalDecisionStatus)}
        </div>
        <div data-testid="daegu-seatmap-trace-status" className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
          trace status: {getDaeguTraceStatusLabel(section.traceStatus)}
        </div>
        <div data-testid="daegu-seatmap-trace-method" className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
          trace method: {getDaeguTraceMethodLabel(section.traceMethod)}
        </div>
        <div data-testid="daegu-seatmap-coordinate-source" className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
          coordinate source: {traceSource}
        </div>
        <div data-testid="daegu-seatmap-source-confidence" className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
          source confidence: {getDaeguSourceLabel(section.sourceConfidence)}
        </div>
        <div data-testid="daegu-seatmap-accessibility-note" className="rounded-xl bg-cyan-50 px-3 py-2 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
          접근성 메모: {section.accessibilityNote ?? '별도 접근성 메모 없음'}
        </div>
      </div>
    </div>
  );
}

export default function DaeguSeatMap() {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();
  const { requireLogin } = useAuthAccessActions();
  const setPendingDraft = useDiaryStore((state) => state.setPendingDraft);
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSectionFinderOpen, setIsSectionFinderOpen] = useState(true);
  const [sectionFinderAutoFocus, setSectionFinderAutoFocus] = useState(false);
  const [mapFocusRequest, setMapFocusRequest] = useState<{ blockId: string | null; requestId: number }>({
    blockId: null,
    requestId: 0,
  });
  const activeRenderBlocks = useMemo(
    () => DAEGU_CANONICAL_BLOCKS,
    [],
  );
  const selectableDaeguBlocks = useMemo(
    () => activeRenderBlocks.filter(isDaeguNormalSelectableSeat),
    [activeRenderBlocks],
  );
  const selectableDaeguBlockIds = useMemo(
    () => new Set(selectableDaeguBlocks.map((block) => block.id)),
    [selectableDaeguBlocks],
  );
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
    activeFilterGroup,
  } = useSeatMapSelectionState({
    sections: selectableDaeguBlocks,
    filterGroups: DAEGU_CATEGORY_GROUPS,
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

  useEffect(() => {
    if (!selected) {
      setIsSectionFinderOpen(true);
    }
  }, [selected]);
  const hasSelectableBlocks = selectableDaeguBlocks.length > 0;
  const mapToolsEnabled = hasSelectableBlocks;
  const hoveredCategory = hoveredSection ? DAEGU_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#074CA1';
  const usedCategories = useMemo(() => [...new Set(selectableDaeguBlocks.map((block) => block.category))], [selectableDaeguBlocks]);
  const visibleBlocks = useMemo(() => {
    const filteredBlocks = selectableDaeguBlocks.filter((block) => {
      if (filterCats !== null && !filterCats.includes(block.category)) return false;
      if (activeFilterGroup?.sides != null && !activeFilterGroup.sides.includes(block.side)) return false;
      if (activeFilterGroup?.levels != null && !activeFilterGroup.levels.includes(block.level)) return false;
      return true;
    });
    return filterAndRankDaeguSeatMapBlocks(filteredBlocks, searchTerm);
  }, [filterCats, activeFilterGroup, searchTerm, selectableDaeguBlocks]);
  const activeFilterLabel = activeFilterGroup?.label ?? '전체';

  useEffect(() => {
    if (zoom <= MIN_ZOOM && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  useEffect(() => {
    if (selected && !selectableDaeguBlockIds.has(selected.id)) {
      setSelected(null);
    }
    if (hover && !selectableDaeguBlockIds.has(hover)) {
      setHover(null);
    }
    if (mapFocusRequest.blockId && !selectableDaeguBlockIds.has(mapFocusRequest.blockId)) {
      setMapFocusRequest((current) => (
        current.blockId && !selectableDaeguBlockIds.has(current.blockId)
          ? { blockId: null, requestId: current.requestId }
          : current
      ));
    }
  }, [hover, mapFocusRequest.blockId, selectableDaeguBlockIds, selected, setHover, setSelected]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom);
    setZoom(normalizedZoom);
    if (normalizedZoom === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const handleCloseSection = useCallback(() => {
    setSelected(null);
    setHover(null);
    setIsSectionFinderOpen(true);
    setSectionFinderAutoFocus(false);
  }, [setHover, setSelected]);

  const handleOpenSectionFinderSearch = useCallback(() => {
    setIsSectionFinderOpen(true);
    setSectionFinderAutoFocus(true);
    if (isMobile) {
      setSelected(null);
      setHover(null);
    }
  }, [isMobile, setHover, setSelected]);

  const handleMapSelectSection = useCallback((section: DaeguCanonicalBlock | null) => {
    setSelected(section);
    setIsSectionFinderOpen(!section);
    setSectionFinderAutoFocus(false);
  }, [setSelected]);

  const handleSelectSection = useCallback((section: DaeguCanonicalBlock) => {
    if (!selectableDaeguBlockIds.has(section.id)) {
      return;
    }
    setSelected(section);
    setIsSectionFinderOpen(false);
    setSectionFinderAutoFocus(false);
    setHover(section.id);
    setZoom((currentZoom) => Math.max(currentZoom, FINDER_FOCUS_ZOOM));
    setMapFocusRequest((current) => ({
      blockId: section.id,
      requestId: current.requestId + 1,
    }));
  }, [selectableDaeguBlockIds, setHover, setSelected]);

  const handleShareSeatView = useCallback((section: DaeguCanonicalBlock | null) => {
    if (!section) return;

    setPendingDraft({
      date: formatDraftDate(new Date()),
      stadium: 'DAEGU',
      team: '삼성',
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
    <DaeguSeatMapSvg
      mode={mode}
      selected={selected}
      setSelected={handleMapSelectSection}
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
      focusBlockId={mapFocusRequest.blockId}
      focusRequestId={mapFocusRequest.requestId}
      blocks={activeRenderBlocks}
      enableAutoCenter={enableAutoCenter}
      onFullscreen={allowFullscreen && hasSelectableBlocks ? openFullscreen : undefined}
    />
  );

  const attribution = (
    <SeatMapAttribution
      source={{
        prefixLabel: 'Canonical 좌석도:',
        sourceLabel: DAEGU_CANONICAL_SEATMAP_IMAGE.sourceLabel,
        sourceUrl: DAEGU_CANONICAL_SEATMAP_IMAGE.sourceUrl,
        assetStatus: DAEGU_CANONICAL_SEATMAP_IMAGE.assetStatus,
      }}
    />
  );

  const legend = (
    <SeatMapLegend categoryIds={usedCategories} categories={DAEGU_CATEGORIES} mode={mode} />
  );

  const mapContent = (
    <div className="relative">
      {renderMapSvg(!isFullscreenOpen)}
      {mapToolsEnabled && (
        <SeatMapHoverPreview
          visible={Boolean(hoveredSection && hoveredCategory)}
          title={hoveredSection?.name}
          subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
          badgeLabel={hoveredCategory?.label}
          accentColor={hoveredAccent}
          description={hoveredSection ? `${getDaeguSideLabel(hoveredSection.side)} · ${getDaeguFanRoleLabel(hoveredSection.fanRole)}` : undefined}
        />
      )}
    </div>
  );

  const filterBar = mapToolsEnabled ? (
    <SeatMapFilterBar
      groups={DAEGU_CATEGORY_GROUPS}
      selectedId={filterId}
      onChange={setFilterId}
      mode={mode}
      accentColor="#074CA1"
      testIdPrefix="daegu"
    />
  ) : undefined;
  const sectionFinder = mapToolsEnabled && isSectionFinderOpen ? (
    <SectionFinder
      blocks={visibleBlocks}
      totalCount={selectableDaeguBlocks.length}
      selected={selected}
      mode={mode}
      searchTerm={searchTerm}
      activeFilterLabel={activeFilterLabel}
      onSearchChange={setSearchTerm}
      onSelect={handleSelectSection}
      onHover={setHover}
      autoFocusInput={sectionFinderAutoFocus}
    />
  ) : null;
  const detailPanel = mapToolsEnabled ? (
    <SeatMapDetailPanel
      section={selected}
      mode={mode}
      categories={DAEGU_CATEGORIES}
      adapter={daeguSectionAdapter}
      stadiumKey="DAEGU"
      onClose={handleCloseSection}
      onUpload={() => handleShareSeatView(selected)}
      copy={{ blockLabel: '정확 블록', uploadLabel: '다이어리에서 시야 사진 공유하기' }}
      extraMeta={(section, accent) => <DaeguExtraMeta section={section} accent={accent} />}
      searchAction={{
        label: '구역 검색',
        ariaLabel: '대구 구역 검색 열기',
        onClick: handleOpenSectionFinderSearch,
        testId: 'daegu-seatmap-search-open',
      }}
    />
  ) : null;

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="대구 삼성 라이온즈파크"
        subtitle="대구 삼성 라이온즈파크 공식 좌석도 · canonical 좌석도"
        titleAccentColor="#074CA1"
        isMobile={isMobile}
        isAuxiliaryGuideActive={false}
        filterBar={filterBar}
        mobileFilterBar={mapToolsEnabled ? <div className="mb-2.5 overflow-x-auto">{filterBar}</div> : undefined}
        desktopFilterBar={filterBar}
        mapContent={mapContent}
        attribution={attribution}
        legend={mapToolsEnabled ? legend : undefined}
        mobileSecondaryPanel={mapToolsEnabled ? sectionFinder : null}
        mobileBottomSheet={mapToolsEnabled && selected && (
          <SeatMapBottomSheet
            section={selected}
            mode={mode}
            categories={DAEGU_CATEGORIES}
            adapter={daeguSectionAdapter}
            stadiumKey="DAEGU"
            onClose={handleCloseSection}
            onUpload={() => handleShareSeatView(selected)}
            copy={{ blockLabel: '정확 블록', uploadLabel: '다이어리에서 시야 사진 공유하기' }}
            extraMeta={(section, accent) => <DaeguExtraMeta section={section} accent={accent} />}
            searchAction={{
              label: '구역 검색',
              ariaLabel: '대구 구역 검색 열기',
              onClick: handleOpenSectionFinderSearch,
              testId: 'daegu-seatmap-mobile-search-open',
            }}
          />
        )}
        mobileHasSidePanel={Boolean(mapToolsEnabled && selected)}
        desktopSecondaryPanel={sectionFinder}
        desktopSidePanel={detailPanel}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={(
          <div className="w-full">
            <div className="relative">
              {renderMapSvg(true, false)}
              {mapToolsEnabled && (
                <SeatMapHoverPreview
                  visible={Boolean(hoveredSection && hoveredCategory)}
                  title={hoveredSection?.name}
                  subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
                  badgeLabel={hoveredCategory?.label}
                  accentColor={hoveredAccent}
                  description={hoveredSection ? `${getDaeguSideLabel(hoveredSection.side)} · ${getDaeguFanRoleLabel(hoveredSection.fanRole)}` : undefined}
                />
              )}
            </div>
          </div>
        )}
        fullscreenDialogTestId="daegu-seatmap-fullscreen"
        fullscreenCloseTestId="daegu-seatmap-fullscreen-close"
        fullscreenTitle="대구 삼성 라이온즈파크"
        fullscreenSubtitle="대구 삼성 라이온즈파크 공식 좌석도 · canonical 좌석도 전체화면"
      />
    </>
  );
}
