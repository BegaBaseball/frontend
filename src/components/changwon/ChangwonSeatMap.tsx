import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Minus, Plus, Search } from 'lucide-react';
import {
  CHANGWON_BLOCKS,
  CHANGWON_CATEGORIES,
  CHANGWON_CATEGORY_GROUPS,
  CHANGWON_SEATMAP_IMAGE,
  CHANGWON_VIEW_INFO,
  getChangwonBlockDisplayName,
  getChangwonFanRoleLabel,
  getChangwonLevelLabel,
  getChangwonSideLabel,
  getChangwonSourceLabel,
  normalizeChangwonSeatMapSearchText,
  isChangwonBlockInCategoryGroup,
  isChangwonSpecialSelectableArea,
  searchChangwonSeatMapBlocks,
  type ChangwonBlock,
} from '../../data/changwonSeatData';
import { useTheme } from '../../hooks/useTheme';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import ChangwonBottomSheet from './ChangwonBottomSheet';
import ChangwonSeatMapSvg from './ChangwonSeatMapSvg';
import ChangwonUploadFlowModal from './ChangwonUploadFlowModal';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';

const MIN_ZOOM = 0.9;
const MAX_ZOOM = 1.35;
const ZOOM_STEP = 0.1;

function normalizeBlockSearchText(value: string): string {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? trimmed : '';
}

function getChangwonSearchMatchLabels(query: string, block: ChangwonBlock): string[] {
  const normalizedQuery = normalizeChangwonSeatMapSearchText(query);
  if (!normalizedQuery) return [];

  const labels: string[] = [];
  const category = CHANGWON_CATEGORIES[block.category];
  const officialBlockTokens = [block.block, ...block.officialBlocks].map(normalizeChangwonSeatMapSearchText);
  const nameTokens = [block.name, getChangwonBlockDisplayName(block)].map(normalizeChangwonSeatMapSearchText);
  const seatTypeTokens = [category?.label ?? '', ...block.seatTypes].map(normalizeChangwonSeatMapSearchText);
  const aliasTokens = block.seatViewSections.map(normalizeChangwonSeatMapSearchText);
  const accessibilityToken = normalizeChangwonSeatMapSearchText(block.accessibilityNote ?? '');

  if (officialBlockTokens.some((token) => token.includes(normalizedQuery))) labels.push('블록 번호');
  if (isChangwonSpecialSelectableArea(block) && nameTokens.some((token) => token.includes(normalizedQuery))) labels.push('특수 구역');
  if (seatTypeTokens.some((token) => token.includes(normalizedQuery))) labels.push('좌석 타입');
  if (aliasTokens.some((token) => token.includes(normalizedQuery))) labels.push('시야 alias');
  if (accessibilityToken.includes(normalizedQuery)) labels.push('접근성');

  return [...new Set(labels)];
}

function FilterBar({ selectedId, onChange, mode }: { selectedId: string; onChange: (value: string) => void; mode: 'light' | 'dark' }) {
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {CHANGWON_CATEGORY_GROUPS.map((group) => {
        const active = group.id === selectedId;
        return (
          <button
            key={group.id}
            type="button"
            data-testid={`changwon-filter-${group.id}`}
            aria-pressed={active}
            onClick={() => onChange(group.id)}
            className="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: active ? '#315288' : 'transparent',
              borderColor: active ? '#315288' : (mode === 'dark' ? '#334155' : '#e2e8f0'),
              color: active ? '#fff' : (mode === 'dark' ? '#94a3b8' : '#334155'),
            }}
          >
            {group.label}
          </button>
        );
      })}
    </div>
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
  onFullscreen: () => void;
  mode: 'light' | 'dark';
}) {
  const buttonClass = 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800';
  const borderColor = mode === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        data-testid="changwon-seatmap-zoom-in"
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
        data-testid="changwon-seatmap-zoom-reset"
        aria-label="초기화"
        onClick={onReset}
        disabled={zoom === 1}
        className="h-8 min-w-14 cursor-pointer rounded-lg border px-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
        style={{ borderColor }}
      >
        {zoom.toFixed(2)}x
      </button>
      <button
        type="button"
        data-testid="changwon-seatmap-zoom-out"
        aria-label="축소"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className={buttonClass}
        style={{ borderColor }}
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        data-testid="changwon-seatmap-fullscreen-open"
        aria-label="창원 좌석도 전체화면"
        onClick={onFullscreen}
        className={buttonClass}
        style={{ borderColor }}
      >
        <ExternalLink className="h-4 w-4" />
      </button>
    </div>
  );
}

function BlockSearch({
  value,
  mode,
  onChange,
  results,
  showResults,
  onSelect,
}: {
  value: string;
  mode: 'light' | 'dark';
  onChange: (value: string) => void;
  results: ChangwonBlock[];
  showResults: boolean;
  onSelect: (block: ChangwonBlock) => void;
}) {
  const borderColor = mode === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <div className="relative min-w-[220px] sm:w-[300px]">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          data-testid="changwon-block-search"
          aria-label="창원 좌석 블록 검색"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="블록/구역/좌석 타입 검색"
          className="h-10 w-full rounded-xl border bg-white pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#315288] dark:bg-slate-950 dark:text-slate-100"
          style={{ borderColor }}
        />
      </label>
      {showResults && (
        <div
          data-testid="changwon-search-results"
          className="absolute right-0 top-11 z-40 w-full overflow-hidden rounded-xl border bg-white shadow-xl dark:bg-slate-950"
          style={{ borderColor }}
        >
          <div
            data-testid="changwon-search-result-count"
            className="border-b px-3 py-2 text-[11px] font-black text-slate-500 dark:text-slate-300"
            style={{ borderColor }}
          >
            검색 결과 {results.length}개
          </div>
          {results.length > 0 ? (
            <div className="max-h-72 overflow-y-auto py-1">
              {results.map((block) => {
                const category = CHANGWON_CATEGORIES[block.category];
                const accent = mode === 'dark' ? category.dark : category.light;
                const matchLabels = getChangwonSearchMatchLabels(value, block);
                return (
                  <button
                    key={block.id}
                    type="button"
                    data-testid={`changwon-search-result-${block.id}`}
                    onClick={() => onSelect(block)}
                    className="flex w-full cursor-pointer items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <span
                      className="mt-0.5 shrink-0 rounded-md px-2 py-1 text-[11px] font-black text-white"
                      style={{ background: accent }}
                    >
                      {block.imageGeometry.shortLabel}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-800 dark:text-slate-100">
                        {getChangwonBlockDisplayName(block)}
                      </span>
                      <span className="block truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {isChangwonSpecialSelectableArea(block) ? '특수 구역 · ' : ''}
                        {category.label} · {getChangwonLevelLabel(block.level)} · {block.seatTypes.join(' · ')}
                      </span>
                      {matchLabels.length > 0 && (
                        <span className="mt-1 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          매칭: {matchLabels.join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              data-testid="changwon-search-empty"
              className="px-3 py-4 text-sm font-bold text-slate-500 dark:text-slate-300"
            >
              검색 결과 없음
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailPanel({
  section,
  mode,
  onClose,
  onUpload,
}: {
  section: ChangwonBlock | null;
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

  const cat = CHANGWON_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const info = CHANGWON_VIEW_INFO[section.id] ?? CHANGWON_VIEW_INFO.default;
  const specialSelectable = isChangwonSpecialSelectableArea(section);

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
            {cat.label} · {getChangwonLevelLabel(section.level)}
          </span>
          {specialSelectable && (
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
              특수 구역
            </span>
          )}
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            {getChangwonSourceLabel(section.sourceConfidence)}
          </span>
          <span
            data-testid="changwon-selected-status"
            className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          >
            release-lock 승인
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{getChangwonBlockDisplayName(section)}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{section.seatTypes.join(' · ')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">위치</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getChangwonSideLabel(section.side)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">팬 구분</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getChangwonFanRoleLabel(section.fanRole)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">층</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getChangwonLevelLabel(section.level)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">영역</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{specialSelectable ? '특수 구역' : '숫자 블록'}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">시야 거리</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{info.distance ?? '-'}</div>
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">좌석 타입</div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {section.seatTypes.map((seatType) => (
            <span key={seatType} className="rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}>
              {seatType}
            </span>
          ))}
        </div>
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">공식 블록</div>
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
        <SeatViewGallery stadium="CHANGWON" section={getChangwonBlockDisplayName(section)} sectionAliases={section.seatViewSections} compact />
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

export default function ChangwonSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [selected, setSelected] = useState<ChangwonBlock | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filterId, setFilterId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchResultListOpen, setIsSearchResultListOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState<ChangwonBlock | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { isMobile, isFullscreenOpen, openFullscreen, closeFullscreen } = useSeatMapTemplateShellState();
  const filterGroup = CHANGWON_CATEGORY_GROUPS.find((group) => group.id === filterId);
  const activeBlockIds = useMemo(() => {
    if (!filterGroup || filterGroup.id === 'all') {
      return null;
    }

    return new Set(
      CHANGWON_BLOCKS
        .filter((block) => isChangwonBlockInCategoryGroup(block, filterGroup))
        .map((block) => block.id),
    );
  }, [filterGroup]);
  const hasOfficialBlocks = CHANGWON_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' && CHANGWON_BLOCKS.length > 0;
  const hoveredSection = hover ? (CHANGWON_BLOCKS.find((block) => block.id === hover) ?? null) : null;
  const hoveredCategory = hoveredSection ? CHANGWON_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#315288';
  const usedCategories = useMemo(() => [...new Set(CHANGWON_BLOCKS.map((block) => block.category))], []);
  const visibleBlockCount = activeBlockIds ? activeBlockIds.size : CHANGWON_BLOCKS.length;
  const specialSelectableCount = useMemo(() => CHANGWON_BLOCKS.filter(isChangwonSpecialSelectableArea).length, []);
  const normalizedSearchTerm = normalizeChangwonSeatMapSearchText(searchTerm);
  const exactNumericSearchBlock = normalizeBlockSearchText(searchTerm);
  const hasExactNumericSearchMatch = Boolean(exactNumericSearchBlock && CHANGWON_BLOCKS.some((block) => block.block === exactNumericSearchBlock));
  const searchResults = useMemo(() => {
    if (!normalizedSearchTerm || hasExactNumericSearchMatch) return [];
    return searchChangwonSeatMapBlocks(searchTerm).slice(0, 12);
  }, [hasExactNumericSearchMatch, normalizedSearchTerm, searchTerm]);
  const showSearchResults = Boolean(normalizedSearchTerm) && !hasExactNumericSearchMatch && isSearchResultListOpen;

  useEffect(() => {
    if (selected && activeBlockIds && !activeBlockIds.has(selected.id)) {
      setSelected(null);
    }
  }, [activeBlockIds, selected]);

  useEffect(() => {
    if (hover && activeBlockIds && !activeBlockIds.has(hover)) {
      setHover(null);
    }
  }, [activeBlockIds, hover]);

  const handleZoomIn = useCallback(() => {
    setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    const normalizedBlock = normalizeBlockSearchText(value);
    const matchedBlock = CHANGWON_BLOCKS.find((block) => block.block === normalizedBlock);

    if (matchedBlock) {
      setFilterId('all');
      setHover(null);
      setSelected(matchedBlock);
      setIsSearchResultListOpen(false);
      return;
    }

    setIsSearchResultListOpen(Boolean(normalizeChangwonSeatMapSearchText(value)));
  }, []);

  const handleSearchResultSelect = useCallback((block: ChangwonBlock) => {
    setFilterId('all');
    setHover(null);
    setSelected(block);
    setSearchTerm(getChangwonBlockDisplayName(block));
    setIsSearchResultListOpen(false);
  }, []);

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    setToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
    setTimeout(() => setToast(null), 2800);
  }, [uploadFor]);

  const mapSvg = (
    <ChangwonSeatMapSvg
      mode={mode}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      activeBlockIds={activeBlockIds}
      zoom={zoom}
    />
  );

  const attribution = (
    <div className="mt-2 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
      좌석 배치 기준: {CHANGWON_SEATMAP_IMAGE.sourceLabel}
      {CHANGWON_SEATMAP_IMAGE.sourceUrl && (
        <a
          href={CHANGWON_SEATMAP_IMAGE.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
        >
          출처
        </a>
      )}
      {CHANGWON_SEATMAP_IMAGE.assetStatus === 'MANUAL_BASEBALL_DATA_REQUIRED' && (
        <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">
          MANUAL_BASEBALL_DATA_REQUIRED
        </span>
      )}
    </div>
  );

  const legend = (
    <div className="mt-2.5 flex flex-wrap gap-1.5 px-1">
      {usedCategories.map((category) => {
        const cat = CHANGWON_CATEGORIES[category];
        if (!cat) return null;
        const color = mode === 'dark' ? cat.dark : cat.light;
        return (
          <span key={category} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
            {cat.label}
          </span>
        );
      })}
    </div>
  );

  const filterBar = (
    <div className="mb-2.5 flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 overflow-x-auto">
          <FilterBar selectedId={filterId} onChange={setFilterId} mode={mode} />
        </div>
        <BlockSearch
          value={searchTerm}
          mode={mode}
          onChange={handleSearchChange}
          results={searchResults}
          showResults={showSearchResults}
          onSelect={handleSearchResultSelect}
        />
      </div>
      <div
        data-testid="changwon-filter-visible-count"
        className="px-1 text-[11px] font-bold text-slate-500 dark:text-slate-400"
      >
        현재 필터 {visibleBlockCount}개 선택 영역 · 특수 구역 {specialSelectableCount}개 포함
      </div>
    </div>
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
            onReset={handleResetZoom}
            onFullscreen={openFullscreen}
            mode={mode}
          />
        </div>
      )}
      <SeatMapHoverPreview
        visible={Boolean(hoveredSection && hoveredCategory)}
        title={hoveredSection ? getChangwonBlockDisplayName(hoveredSection) : undefined}
        subtitle={hoveredSection?.seatTypes.join(' · ')}
        badgeLabel={hoveredCategory?.label}
        accentColor={hoveredAccent}
        description={hoveredSection ? `${getChangwonSideLabel(hoveredSection.side)} · ${getChangwonFanRoleLabel(hoveredSection.fanRole)}` : undefined}
      />
    </div>
  );

  const detailPanel = hasOfficialBlocks && selected ? (
    <DetailPanel
      section={selected}
      mode={mode}
      onClose={() => setSelected(null)}
      onUpload={() => selected && setUploadFor(selected)}
    />
  ) : null;

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="창원NC파크"
        subtitle="창원 NC 공식 좌석도"
        titleAccentColor="#315288"
        isMobile={isMobile}
        isDoosanGuideActive={false}
        filterBar={hasOfficialBlocks ? filterBar : undefined}
        mobileFilterBar={hasOfficialBlocks ? filterBar : undefined}
        desktopFilterBar={hasOfficialBlocks ? filterBar : undefined}
        mapContent={mapContent}
        attribution={attribution}
        legend={hasOfficialBlocks ? legend : undefined}
        mobileBottomSheet={hasOfficialBlocks && selected && (
          <ChangwonBottomSheet
            section={selected}
            mode={mode}
            onClose={() => setSelected(null)}
            onUpload={() => selected && setUploadFor(selected)}
          />
        )}
        mobileHasSidePanel={Boolean(isMobile && hasOfficialBlocks && selected)}
        desktopSidePanel={detailPanel}
        toast={toast}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenDialogTestId="changwon-seatmap-fullscreen"
        fullscreenCloseTestId="changwon-seatmap-fullscreen-close"
        fullscreenMapContent={(
          <div className="w-full">
            <div className="relative">
              {mapSvg}
            </div>
          </div>
        )}
        fullscreenTitle="창원NC파크"
        fullscreenSubtitle="창원 NC 공식 좌석도 전체화면"
      />
      {uploadFor && (
        <ChangwonUploadFlowModal
          section={uploadFor}
          mode={mode}
          onClose={() => setUploadFor(null)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </>
  );
}
