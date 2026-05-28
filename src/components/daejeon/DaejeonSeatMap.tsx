import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Minus, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DAEJEON_BLOCKS,
  DAEJEON_CATEGORIES,
  DAEJEON_CATEGORY_GROUPS,
  DAEJEON_OFFICIAL_SECTION_GROUPS,
  DAEJEON_SEATMAP_IMAGE,
  findDaejeonParentBlockGroup,
  findDaejeonSectionCoverageByBlock,
  getDaejeonCoverageStatusLabel,
  getDaejeonFanRoleLabel,
  getDaejeonSideLabel,
  getDaejeonSourceLabel,
  getDaejeonTraceStatusLabel,
  getDaejeonViewInfo,
  getDaejeonZoneGroupLabel,
  isDaejeonSelectableSeatBlock,
  type DaejeonBlock,
} from '../../data/daejeonSeatData';
import { useTheme } from '../../hooks/useTheme';
import { useAuthAccessActions, useAuthSession } from '../../store/authStore';
import { useDiaryStore } from '../../store/diaryStore';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import DaejeonSeatMapSvg from './DaejeonSeatMapSvg';
import { SeatMapAttribution } from '../stadiumSeatMap/SeatMapAttribution';
import { SeatMapBottomSheet } from '../stadiumSeatMap/SeatMapBottomSheet';
import { SeatMapDetailPanel } from '../stadiumSeatMap/SeatMapDetailPanel';
import { SeatMapFilterBar } from '../stadiumSeatMap/SeatMapFilterBar';
import { SeatMapLegend } from '../stadiumSeatMap/SeatMapLegend';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapSelectionState } from '../stadiumSeatMap/useSeatMapSelectionState';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';
import type { SeatMapSectionAdapter } from '../stadiumSeatMap/seatMapCommonTypes';

const MIN_ZOOM = 0.9;
const MAX_ZOOM = 1.35;
const ZOOM_STEP = 0.1;
const OFFICIAL_BLOCK_PREVIEW_COUNT = 6;
const FINDER_FOCUS_ZOOM = 1.2;

type MapPan = { x: number; y: number };

const daejeonSectionAdapter: SeatMapSectionAdapter<DaejeonBlock> = {
  getId: (section) => section.id,
  getName: (section) => section.name,
  getBlock: (section) => section.blockCode,
  getCategoryId: (section) => section.category,
  getLevel: (section) => `${section.level} · ${getDaejeonZoneGroupLabel(section.zoneGroup)}`,
  getOfficialBlocks: (section) => section.officialBlocks,
  getSideLabel: (section) => getDaejeonSideLabel(section.side),
  getFanRoleLabel: (section) => getDaejeonFanRoleLabel(section.fanRole),
  getSourceLabel: (section) => getDaejeonSourceLabel(section.sourceConfidence),
  getSourceNote: (section) => section.sourceNote,
  getSeatViewSections: (section) => section.seatViewSections,
  getAccessibilityNote: (section) => section.accessibilityNote,
  getDistance: (section) => getDaejeonViewInfo(section).distance,
  getNotes: (section) => {
    const info = getDaejeonViewInfo(section);
    const coverage = findDaejeonSectionCoverageByBlock(section.id);
    const coverageText = coverage
      ? `${coverage.officialSectionName} · ${getDaejeonCoverageStatusLabel(coverage.status)}`
      : null;
    return [
      info.notes,
      `${section.officialSectionName} · ${getDaejeonTraceStatusLabel(section.traceStatus)}`,
      coverageText,
      section.reviewNote,
    ].filter(Boolean).join(' · ');
  },
  getTags: (section) => getDaejeonViewInfo(section).tags ?? [],
};

function formatDraftDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function isDenseTouchTarget(section: DaejeonBlock): boolean {
  return section.category === 'TABLE' && section.level === '4F';
}

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  canReset,
  mode,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canReset: boolean;
  mode: 'light' | 'dark';
}) {
  const buttonClass = 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800';
  const borderColor = mode === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        data-testid="daejeon-seatmap-zoom-in"
        aria-label="확대"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM}
        className={buttonClass}
        style={{ borderColor }}
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        data-testid="daejeon-seatmap-zoom-reset"
        aria-label="초기화"
        onClick={onReset}
        disabled={!canReset}
        className="h-8 min-w-14 cursor-pointer rounded-lg border px-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
        style={{ borderColor }}
      >
        {zoom.toFixed(2)}x
      </button>
      <button
        type="button"
        data-testid="daejeon-seatmap-zoom-out"
        aria-label="축소"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className={buttonClass}
        style={{ borderColor }}
      >
        <Minus className="h-4 w-4" />
      </button>
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

function OfficialBlockChips({
  blocks,
  accent,
}: {
  blocks: string[];
  accent: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleBlocks = showAll ? blocks : blocks.slice(0, OFFICIAL_BLOCK_PREVIEW_COUNT);
  const hiddenCount = Math.max(0, blocks.length - OFFICIAL_BLOCK_PREVIEW_COUNT);

  useEffect(() => {
    setShowAll(false);
  }, [blocks.join('|')]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleBlocks.map((block) => (
        <span key={block} className="rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}>
          {block}
        </span>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold transition-opacity hover:opacity-80"
          style={{ background: `${accent}0f`, borderColor: `${accent}55`, color: accent }}
        >
          {showAll ? '접기' : `더보기 +${hiddenCount}`}
        </button>
      )}
    </div>
  );
}

function SectionFinder({
  blocks,
  totalCount,
  selected,
  mode,
  searchTerm,
  onSearchChange,
  onSelect,
  onHover,
}: {
  blocks: DaejeonBlock[];
  totalCount: number;
  selected: DaejeonBlock | null;
  mode: 'light' | 'dark';
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelect: (section: DaejeonBlock) => void;
  onHover: (id: string | null) => void;
}) {
  const hasSearch = searchTerm.trim().length > 0;
  const sectionGroups = DAEJEON_OFFICIAL_SECTION_GROUPS.flatMap((group) => (
    group.sections.map((sectionName) => ({
      key: `${group.id}-${sectionName}`,
      label: sectionName,
      blocks: blocks.filter((block) => block.officialSectionName === sectionName),
    }))
  )).filter((group) => group.blocks.length > 0);

  return (
    <aside
      data-testid="daejeon-section-finder"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">구역 찾기</h3>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {blocks.length}/{totalCount}개 표시
          </p>
        </div>
      </div>
      <label className="relative mb-3 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          data-testid="daejeon-block-search"
          aria-label="대전 구역 검색"
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="구역명, 블록 검색"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
        {blocks.length === 0 ? (
          <div
            data-testid="daejeon-section-finder-empty"
            className="rounded-xl bg-slate-50 px-3 py-6 text-center text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
            <div>검색어와 선택한 필터에 맞는 구역이 없습니다</div>
            {hasSearch && (
              <div className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                검색어: {searchTerm.trim()}
              </div>
            )}
          </div>
        ) : (
          sectionGroups.map((sectionGroup) => (
            <div key={sectionGroup.key} className="space-y-1.5">
              <div className="sticky top-0 z-10 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {sectionGroup.label} · {sectionGroup.blocks.length}개 블록
              </div>
              {sectionGroup.blocks.map((block) => {
                const cat = DAEJEON_CATEGORIES[block.category];
                const accent = mode === 'dark' ? cat.dark : cat.light;
                const isActive = selected?.id === block.id;
                const isPendingReview = block.traceStatus === 'NEEDS_OPERATOR_REVIEW';

                return (
                  <button
                    key={block.id}
                    type="button"
                    data-testid={`daejeon-section-finder-item-${block.id}`}
                    data-block-code={block.blockCode}
                    data-official-section={block.officialSectionName}
                    onClick={() => !isPendingReview && onSelect(block)}
                    onMouseEnter={() => onHover(isPendingReview ? null : block.id)}
                    onMouseLeave={() => onHover(null)}
                    disabled={isPendingReview}
                    aria-disabled={isPendingReview}
                    aria-pressed={isActive}
                    aria-label={`구역 선택 ${block.name} ${block.blockCode}`}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                    style={{
                      background: isActive ? `${accent}18` : 'transparent',
                      borderColor: isActive ? `${accent}66` : (mode === 'dark' ? '#334155' : '#e2e8f0'),
                    }}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-800 dark:text-white">{block.name}</span>
                      <span className="block truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {block.blockCode} · {cat.label} · {getDaejeonSideLabel(block.side)}
                      </span>
                      {isPendingReview && (
                        <span className="mt-1 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/35 dark:text-orange-200">
                          좌표 검수 필요
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
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
  section: DaejeonBlock | null;
  mode: 'light' | 'dark';
  onClose: () => void;
  onUpload: () => void;
}) {
  if (!section) {
    return (
      <div className="sticky top-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" style={{ maxHeight: 'calc(100vh - 32px)' }}>
        <div className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">구역을 선택하세요</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            공식 좌석도에서 블록을 선택하면 실제 시야 사진을 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  const cat = DAEJEON_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const info = getDaejeonViewInfo(section);
  const zoneLabel = getDaejeonZoneGroupLabel(section.zoneGroup);
  const coverage = findDaejeonSectionCoverageByBlock(section.id);
  const parentGroup = findDaejeonParentBlockGroup(section.parentId);
  const isPendingReview = !isDaejeonSelectableSeatBlock(section);

  return (
    <div className="sticky top-4 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" style={{ maxHeight: 'calc(100vh - 32px)' }}>
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
            {cat.label} · {section.level} · {zoneLabel}
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            {getDaejeonSourceLabel(section.sourceConfidence)}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{section.name}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">정확 블록 {section.blockCode}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <InfoTile label="정확 블록" value={section.blockCode} />
        <InfoTile label="부모 구역" value={parentGroup?.block ?? section.parentBlock} />
        <InfoTile label="위치" value={getDaejeonSideLabel(section.side)} />
        <InfoTile label="팬 구분" value={getDaejeonFanRoleLabel(section.fanRole)} />
        <InfoTile label="구역 그룹" value={zoneLabel} />
        <InfoTile label="시야 거리" value={info.distance ?? '-'} />
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">공식 블록</div>
        <OfficialBlockChips blocks={section.officialBlocks} accent={accent} />
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
          {section.sourceNote}
        </p>
        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-400 dark:text-slate-500">
          {section.officialSectionName} · {getDaejeonTraceStatusLabel(section.traceStatus)}
        </p>
        {section.reviewNote && (
          <p className="mt-2 rounded-xl bg-orange-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-orange-800 dark:bg-orange-950/35 dark:text-orange-200">
            {section.reviewNote}
          </p>
        )}
        {coverage && (
          <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-amber-900 dark:bg-amber-950/35 dark:text-amber-100">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">검수 정보</div>
            <div className="mt-1">{coverage.officialSectionName} · {getDaejeonCoverageStatusLabel(coverage.status)}</div>
            <div className="mt-0.5 text-amber-800/80 dark:text-amber-100/80">{coverage.reviewNote}</div>
          </div>
        )}
        {section.accessibilityNote && (
          <p className="mt-2 rounded-xl bg-cyan-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
            {section.accessibilityNote}
          </p>
        )}
      </div>
      {(info.notes || (info.tags && info.tags.length > 0)) && (
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          {info.notes && (
            <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">{info.notes}</p>
          )}
          {info.tags && info.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {info.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">실제 시야 사진</div>
        <p className="mb-3 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
          다이어리에서 공유된 사진만 표시합니다.
        </p>
        <SeatViewGallery stadium="DAEJEON" section={section.name} sectionAliases={section.seatViewSections} compact />
      </div>
      <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onUpload}
          disabled={isPendingReview}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: isPendingReview ? '#94a3b8' : accent }}
        >
          <BookOpen className="h-4 w-4" />
          {isPendingReview ? '좌표 검수 후 공유 가능' : '다이어리에서 시야 사진 공유하기'}
        </button>
      </div>
    </div>
  );
}

function DaejeonExtraMeta({ section, accent }: { section: DaejeonBlock; accent: string }) {
  const coverage = findDaejeonSectionCoverageByBlock(section.id);
  const parentGroup = findDaejeonParentBlockGroup(section.parentId);

  return (
    <div data-testid="daejeon-seatmap-extra-meta" className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
      <div className="grid grid-cols-2 gap-2.5">
        <InfoTile label="공식 섹션" value={section.officialSectionName} />
        <InfoTile label="정확 블록" value={section.blockCode} />
        <InfoTile label="부모 구역" value={parentGroup?.block ?? section.parentBlock} />
        <InfoTile label="source confidence" value={getDaejeonSourceLabel(section.sourceConfidence)} />
      </div>
      <div className="mt-3 space-y-2 text-[12px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        <div
          data-testid="daejeon-seatmap-coverage-status"
          className="rounded-xl px-3 py-2"
          style={{ background: `${accent}12` }}
        >
          coverage status: {coverage ? getDaejeonCoverageStatusLabel(coverage.status) : '-'}
        </div>
        <div data-testid="daejeon-seatmap-trace-status" className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
          trace status: {getDaejeonTraceStatusLabel(section.traceStatus)}
        </div>
        <div data-testid="daejeon-seatmap-accessibility-note" className="rounded-xl bg-cyan-50 px-3 py-2 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
          접근성 메모: {section.accessibilityNote ?? '별도 접근성 메모 없음'}
        </div>
      </div>
    </div>
  );
}

export default function DaejeonSeatMap() {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();
  const { requireLogin } = useAuthAccessActions();
  const setPendingDraft = useDiaryStore((state) => state.setPendingDraft);
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [finderSelectedBlockId, setFinderSelectedBlockId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<MapPan>({ x: 0, y: 0 });
  const [mapFocusRequest, setMapFocusRequest] = useState<{ blockId: string | null; requestId: number }>({ blockId: null, requestId: 0 });
  const [searchTerm, setSearchTerm] = useState('');
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
    sections: DAEJEON_BLOCKS,
    filterGroups: DAEJEON_CATEGORY_GROUPS,
    getId: (section) => section.id,
    getCategoryId: (section) => section.category,
    isSectionVisible: (block, filterGroup, cats) => {
      if (cats !== null && !cats.includes(block.category)) return false;
      if (filterGroup?.sides != null && !filterGroup.sides.includes(block.side)) return false;
      if (filterGroup?.levels != null && !filterGroup.levels.includes(block.level)) return false;
      return true;
    },
  });
  const { isMobile, isFullscreenOpen, closeFullscreen } = useSeatMapTemplateShellState();
  const hasOfficialBlocks = DAEJEON_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' && DAEJEON_BLOCKS.length > 0;
  const hoveredCategory = hoveredSection ? DAEJEON_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#F37321';
  const usedCategories = useMemo(() => [...new Set(DAEJEON_BLOCKS.map((block) => block.category))], []);
  const orderedBlocks = useMemo(
    () => [...DAEJEON_BLOCKS].sort((a, b) => a.displayPriority - b.displayPriority),
    [],
  );
  const visibleBlocks = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    const normalizedSearchTokens = searchTerm
      .trim()
      .split(/\s+/)
      .map(normalizeSearchText)
      .filter(Boolean);

    return orderedBlocks.filter((block) => {
      if (filterCats !== null && !filterCats.includes(block.category)) return false;
      if (activeFilterGroup?.sides != null && !activeFilterGroup.sides.includes(block.side)) return false;
      if (activeFilterGroup?.levels != null && !activeFilterGroup.levels.includes(block.level)) return false;
      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        block.name,
        block.block,
        block.blockCode,
        block.officialBlockLabel,
        block.officialSectionName,
        ...block.officialBlocks,
        ...block.seatViewSections,
      ].map(normalizeSearchText).join(' ');

      return searchableText.includes(normalizedSearch)
        || normalizedSearchTokens.every((token) => searchableText.includes(token));
    });
  }, [filterCats, activeFilterGroup, orderedBlocks, searchTerm]);
  const visibleBlockIds = useMemo(() => visibleBlocks.map((block) => block.id), [visibleBlocks]);
  const canResetView = zoom !== 1 || pan.x !== 0 || pan.y !== 0;

  const handleZoomIn = useCallback(() => {
    setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((value) => {
      const nextZoom = Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2)));
      if (nextZoom <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return nextZoom;
    });
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMapFocusRequest((current) => ({ ...current, blockId: null }));
  }, []);

  const handleCloseSection = useCallback(() => {
    setSelected(null);
    setFinderSelectedBlockId(null);
  }, []);

  const handleSelectSection = useCallback((section: DaejeonBlock) => {
    if (!isDaejeonSelectableSeatBlock(section)) {
      setSelected(null);
      setFinderSelectedBlockId(null);
      setHover(null);
      return;
    }

    if (selected?.id === section.id) {
      setSelected(null);
      setFinderSelectedBlockId(null);
      return;
    }

    setSelected(section);
    setFinderSelectedBlockId(section.id);
    setHover(section.id);
    setZoom((currentZoom) => {
      const targetZoom = isDenseTouchTarget(section) ? MAX_ZOOM : Math.max(currentZoom, FINDER_FOCUS_ZOOM);
      return Number(targetZoom.toFixed(2));
    });
    setMapFocusRequest((current) => ({
      blockId: section.id,
      requestId: current.requestId + 1,
    }));
  }, [selected?.id]);

  const handleMapSelectSection = useCallback((section: DaejeonBlock | null) => {
    setFinderSelectedBlockId(null);
    setSelected(section);
  }, []);

  useEffect(() => {
    if (selected && !visibleBlockIds.includes(selected.id)) {
      setSelected(null);
    }
  }, [selected, visibleBlockIds]);

  useEffect(() => {
    if (hover && !visibleBlockIds.includes(hover)) {
      setHover(null);
    }
  }, [hover, visibleBlockIds]);

  const handleShareSeatView = useCallback((section: DaejeonBlock | null) => {
    if (!section) return;
    if (!isDaejeonSelectableSeatBlock(section)) return;

    setPendingDraft({
      date: formatDraftDate(new Date()),
      stadium: 'DAEJEON',
      team: '한화',
      section: section.name,
      block: section.blockCode,
      seatRow: '',
      seatNumber: '',
    });

    if (!isLoggedIn) {
      requireLogin('/mypage');
      return;
    }

    navigate('/mypage');
  }, [isLoggedIn, navigate, requireLogin, setPendingDraft]);

  const mapSvg = (
    <DaejeonSeatMapSvg
      mode={mode}
      selected={selected}
      setSelected={handleMapSelectSection}
      hover={hover}
      setHover={setHover}
      visibleBlockIds={visibleBlockIds}
      filterCats={filterCats}
      filterSides={filterSides}
      filterLevels={filterLevels}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={setZoom}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      focusBlockId={mapFocusRequest.blockId}
      focusRequestId={mapFocusRequest.requestId}
    />
  );

  const attribution = (
    <SeatMapAttribution
      source={{
        sourceLabel: DAEJEON_SEATMAP_IMAGE.sourceLabel,
        sourceUrl: DAEJEON_SEATMAP_IMAGE.sourceUrl,
        assetStatus: DAEJEON_SEATMAP_IMAGE.assetStatus,
      }}
    />
  );

  const legend = (
    <SeatMapLegend categoryIds={usedCategories} categories={DAEJEON_CATEGORIES} mode={mode} />
  );

  const filterBar = (
    <SeatMapFilterBar
      groups={DAEJEON_CATEGORY_GROUPS}
      selectedId={filterId}
      onChange={setFilterId}
      mode={mode}
      accentColor="#F37321"
      testIdPrefix="daejeon"
    />
  );
  const sectionFinder = (
    <SectionFinder
      blocks={visibleBlocks}
      totalCount={DAEJEON_BLOCKS.length}
      selected={selected}
      mode={mode}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onSelect={handleSelectSection}
      onHover={setHover}
    />
  );

  const mapContent = (
    <div className="relative">
      {mapSvg}
      {hasOfficialBlocks && (
        <div className="absolute right-3 top-3 z-20 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/95">
          <ZoomControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleResetView}
            canReset={canResetView}
            mode={mode}
          />
        </div>
      )}
      <SeatMapHoverPreview
        visible={Boolean(hoveredSection && hoveredCategory)}
        title={hoveredSection?.name}
        subtitle={hoveredSection ? `정확 블록 ${hoveredSection.blockCode}` : undefined}
        badgeLabel={hoveredCategory?.label}
        accentColor={hoveredAccent}
        description={hoveredSection ? `${getDaejeonSideLabel(hoveredSection.side)} · ${getDaejeonFanRoleLabel(hoveredSection.fanRole)}` : undefined}
      />
    </div>
  );
  const detailPanel = hasOfficialBlocks ? (
    <SeatMapDetailPanel
      section={selected}
      mode={mode}
      categories={DAEJEON_CATEGORIES}
      adapter={daejeonSectionAdapter}
      stadiumKey="DAEJEON"
      onClose={handleCloseSection}
      onUpload={() => handleShareSeatView(selected)}
      copy={{ blockLabel: '정확 블록' }}
      extraMeta={(section, accent) => <DaejeonExtraMeta section={section} accent={accent} />}
      isUploadDisabled={(section) => !isDaejeonSelectableSeatBlock(section)}
      getUploadLabel={(section) => (
        isDaejeonSelectableSeatBlock(section) ? '다이어리에서 시야 사진 공유하기' : '좌표 검수 후 공유 가능'
      )}
    />
  ) : null;

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="대전 한화생명볼파크"
        subtitle="대전 한화생명볼파크 공식 좌석도"
        titleAccentColor="#F37321"
        isMobile={isMobile}
        isAuxiliaryGuideActive={false}
        filterBar={hasOfficialBlocks ? filterBar : undefined}
        mobileFilterBar={hasOfficialBlocks ? (
          <div className="mb-2.5 overflow-x-auto">
            {filterBar}
          </div>
        ) : undefined}
        desktopFilterBar={hasOfficialBlocks ? filterBar : undefined}
        mapContent={mapContent}
        attribution={attribution}
        legend={hasOfficialBlocks ? legend : undefined}
        mobileSecondaryPanel={hasOfficialBlocks ? sectionFinder : undefined}
        mobileBottomSheet={hasOfficialBlocks && selected && (
          <SeatMapBottomSheet
            section={selected}
            mode={mode}
            categories={DAEJEON_CATEGORIES}
            adapter={daejeonSectionAdapter}
            stadiumKey="DAEJEON"
            preferFull={selected?.id === finderSelectedBlockId}
            onClose={handleCloseSection}
            onUpload={() => handleShareSeatView(selected)}
            copy={{ blockLabel: '정확 블록' }}
            extraMeta={(section, accent) => <DaejeonExtraMeta section={section} accent={accent} />}
            isUploadDisabled={(section) => !isDaejeonSelectableSeatBlock(section)}
            getUploadLabel={(section) => (
              isDaejeonSelectableSeatBlock(section) ? '다이어리에서 시야 사진 공유하기' : '좌표 검수 후 공유 가능'
            )}
          />
        )}
        mobileHasSidePanel={Boolean(hasOfficialBlocks && selected)}
        desktopSecondaryPanel={sectionFinder}
        desktopSidePanel={detailPanel}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={(
          <div className="w-full">
            <div className="relative">
              {mapSvg}
            </div>
          </div>
        )}
        fullscreenTitle="대전 한화생명볼파크"
        fullscreenSubtitle="대전 한화생명볼파크 공식 좌석도 전체화면"
      />
    </>
  );
}
