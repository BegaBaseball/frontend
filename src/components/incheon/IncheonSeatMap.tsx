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
  getIncheonGuideMatches,
  getIncheonSeatViewAliases,
  getIncheonSideLabel,
  getIncheonSourceLabel,
  type IncheonBlock,
  type IncheonBlockMatch,
  type IncheonGuideIntent,
} from '../../data/incheonSeatData';
import { useTheme } from '../../hooks/useTheme';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import IncheonBottomSheet from './IncheonBottomSheet';
import IncheonSeatMapSvg from './IncheonSeatMapSvg';
import IncheonUploadFlowModal from './IncheonUploadFlowModal';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;
const GUIDE_FOCUS_ZOOM = 1.45;
const GUIDE_RESULT_LIMIT = 10;

const INCHEON_GUIDE_INTENTS: Array<{ id: IncheonGuideIntent; label: string }> = [
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

interface SeatMapPan {
  x: number;
  y: number;
}

function FilterBar({ selectedId, onChange, mode }: { selectedId: string; onChange: (value: string) => void; mode: 'light' | 'dark' }) {
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {INCHEON_CATEGORY_GROUPS.map((group) => {
        const active = group.id === selectedId;
        return (
          <button
            key={group.id}
            type="button"
            data-testid={`incheon-filter-${group.id}`}
            aria-pressed={active}
            onClick={() => onChange(group.id)}
            className="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: active ? '#C8102E' : 'transparent',
              borderColor: active ? '#C8102E' : (mode === 'dark' ? '#334155' : '#e2e8f0'),
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

function IncheonFirstVisitGuide({
  intent,
  query,
  matches,
  active,
  mode,
  onIntentChange,
  onQueryChange,
  onSelectBlock,
}: {
  intent: IncheonGuideIntent;
  query: string;
  matches: IncheonBlockMatch[];
  active: boolean;
  mode: 'light' | 'dark';
  onIntentChange: (value: IncheonGuideIntent) => void;
  onQueryChange: (value: string) => void;
  onSelectBlock: (block: IncheonBlock) => void;
}) {
  const visibleMatches = active ? matches.slice(0, GUIDE_RESULT_LIMIT) : [];
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
            {active ? `${matches.length}개 블록` : '탐색 대기'}
          </div>
        </div>
        <input
          data-testid="incheon-guide-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="블록/좌석 검색"
          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 sm:w-56"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {INCHEON_GUIDE_INTENTS.map((option) => {
          const selectedIntent = intent === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-testid={`incheon-guide-intent-${option.id}`}
              onClick={() => onIntentChange(option.id)}
              aria-pressed={selectedIntent}
              className="shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: selectedIntent ? '#C8102E' : 'transparent',
                borderColor: selectedIntent ? '#C8102E' : (isDark ? '#334155' : '#e2e8f0'),
                color: selectedIntent ? '#fff' : (isDark ? '#cbd5e1' : '#334155'),
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {!active ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            목적을 선택하거나 블록을 검색하세요
          </div>
        ) : visibleMatches.length > 0 ? (
          visibleMatches.map(({ block, reasons }) => {
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

function DetailPanel({
  section,
  mode,
  onClose,
  onUpload,
}: {
  section: IncheonBlock | null;
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

  const cat = INCHEON_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const info = INCHEON_VIEW_INFO[section.id] ?? INCHEON_VIEW_INFO.default;

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
            {getIncheonSourceLabel(section.sourceConfidence)}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{section.name}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">블록 {section.block}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">위치</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getIncheonSideLabel(section.side)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">팬 구분</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getIncheonFanRoleLabel(section.fanRole)}</div>
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
        <SeatViewGallery stadium="INCHEON" section={section.name} sectionAliases={getIncheonSeatViewAliases(section)} compact />
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

export default function IncheonSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [selected, setSelected] = useState<IncheonBlock | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [filterId, setFilterId] = useState('all');
  const [guideIntent, setGuideIntent] = useState<IncheonGuideIntent>('all');
  const [guideQuery, setGuideQuery] = useState('');
  const [uploadFor, setUploadFor] = useState<IncheonBlock | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const {
    isMobile,
    isFullscreenOpen,
    openFullscreen,
    closeFullscreen,
  } = useSeatMapTemplateShellState();
  const filterGroup = INCHEON_CATEGORY_GROUPS.find((group) => group.id === filterId);
  const filterCats = filterGroup?.cats ?? null;
  const hasOfficialBlocks = INCHEON_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' && INCHEON_BLOCKS.length > 0;
  const guideMatches = useMemo(
    () => (hasOfficialBlocks ? getIncheonGuideMatches(guideIntent, guideQuery, INCHEON_BLOCKS) : []),
    [guideIntent, guideQuery, hasOfficialBlocks],
  );
  const guideActive = hasOfficialBlocks && (guideIntent !== 'all' || guideQuery.trim().length > 0);
  const guideMatchedBlockIds = useMemo(
    () => (guideActive ? guideMatches.map((match) => match.block.id) : []),
    [guideActive, guideMatches],
  );
  const hoveredSection = hover ? (INCHEON_BLOCKS.find((block) => block.id === hover) ?? null) : null;
  const hoveredCategory = hoveredSection ? INCHEON_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#C8102E';
  const usedCategories = useMemo(() => [...new Set(INCHEON_BLOCKS.map((block) => block.category))], []);

  useEffect(() => {
    if (zoom <= MIN_ZOOM && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  useEffect(() => {
    if (!selected || filterCats === null || filterCats.includes(selected.category)) {
      return;
    }
    setSelected(null);
  }, [filterCats, selected]);

  useEffect(() => {
    if (!hover) return;
    const hoveredBlock = INCHEON_BLOCKS.find((block) => block.id === hover);
    if (hoveredBlock && filterCats !== null && !filterCats.includes(hoveredBlock.category)) {
      setHover(null);
    }
  }, [filterCats, hover]);

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
  }, []);

  const handleGuideQueryChange = useCallback((nextQuery: string) => {
    setGuideQuery(nextQuery);
    setFilterId('all');
  }, []);

  const handleGuideBlockSelect = useCallback((block: IncheonBlock) => {
    setFilterId('all');
    setSelected(block);
    setHover(block.id);
    setZoom((currentZoom) => (currentZoom < GUIDE_FOCUS_ZOOM ? GUIDE_FOCUS_ZOOM : currentZoom));
  }, []);

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    setToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
    setTimeout(() => setToast(null), 2800);
  }, [uploadFor]);

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
      guideMatchedBlockIds={guideMatchedBlockIds}
      guideActive={guideActive}
    />
  );
  const fullscreenMapMaxWidth = `calc((100vh - 144px) * ${INCHEON_SEATMAP_IMAGE.imageWidth / INCHEON_SEATMAP_VIEWPORT.cropHeight})`;

  const guidePanel = hasOfficialBlocks ? (
    <IncheonFirstVisitGuide
      intent={guideIntent}
      query={guideQuery}
      matches={guideMatches}
      active={guideActive}
      mode={mode}
      onIntentChange={handleGuideIntentChange}
      onQueryChange={handleGuideQueryChange}
      onSelectBlock={handleGuideBlockSelect}
    />
  ) : null;

  const detailPanel = hasOfficialBlocks ? (
    <DetailPanel
      section={selected}
      mode={mode}
      onClose={() => setSelected(null)}
      onUpload={() => selected && setUploadFor(selected)}
    />
  ) : null;

  const attribution = (
    <div className="mt-2 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
      좌석 배치 기준: {INCHEON_SEATMAP_IMAGE.sourceLabel}
      {INCHEON_SEATMAP_IMAGE.sourceUrl && (
        <a
          href={INCHEON_SEATMAP_IMAGE.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
        >
          출처
        </a>
      )}
      {INCHEON_SEATMAP_IMAGE.assetStatus === 'MANUAL_BASEBALL_DATA_REQUIRED' && (
        <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">
          MANUAL_BASEBALL_DATA_REQUIRED
        </span>
      )}
    </div>
  );

  const legend = (
    <div className="mt-2.5 flex flex-wrap gap-1.5 px-1">
      {usedCategories.map((category) => {
        const cat = INCHEON_CATEGORIES[category];
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

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="인천SSG랜더스필드"
        subtitle="인천 SSG 공식 좌석도"
        titleAccentColor="#C8102E"
        isMobile={isMobile}
        isDoosanGuideActive={false}
        filterBar={hasOfficialBlocks ? <FilterBar selectedId={filterId} onChange={setFilterId} mode={mode} /> : undefined}
        mobileFilterBar={hasOfficialBlocks ? (
          <div className="space-y-2.5">
            {guidePanel}
            <div className="overflow-x-auto">
              <FilterBar selectedId={filterId} onChange={setFilterId} mode={mode} />
            </div>
          </div>
        ) : undefined}
        desktopFilterBar={hasOfficialBlocks ? <FilterBar selectedId={filterId} onChange={setFilterId} mode={mode} /> : undefined}
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
          <IncheonBottomSheet
            section={selected}
            mode={mode}
            onClose={() => setSelected(null)}
            onUpload={() => selected && setUploadFor(selected)}
          />
        )}
        mobileHasSidePanel={Boolean(hasOfficialBlocks && selected)}
        desktopSidePanel={hasOfficialBlocks ? (
          <div className="space-y-3">
            {guidePanel}
            {detailPanel}
          </div>
        ) : null}
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
