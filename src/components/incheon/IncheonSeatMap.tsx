import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Minus, Plus, X } from 'lucide-react';
import {
  INCHEON_BLOCKS,
  INCHEON_CATEGORIES,
  INCHEON_CATEGORY_GROUPS,
  INCHEON_SEATMAP_IMAGE,
  INCHEON_SEATMAP_VIEWPORT,
  INCHEON_VIEW_INFO,
  getIncheonFanRoleLabel,
  getIncheonSideLabel,
  getIncheonSourceLabel,
  type IncheonBlock,
} from '../../data/incheonSeatData';
import { useTheme } from '../../hooks/useTheme';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import IncheonBottomSheet from './IncheonBottomSheet';
import IncheonSeatMapSvg from './IncheonSeatMapSvg';
import IncheonUploadFlowModal from './IncheonUploadFlowModal';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

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
        data-testid="incheon-seatmap-zoom-out"
        aria-label="인천 좌석도 축소"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className={buttonClass}
        style={{ borderColor }}
      >
        <Minus className="h-4 w-4" />
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
        data-testid="incheon-seatmap-zoom-in"
        aria-label="인천 좌석도 확대"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM}
        className={buttonClass}
        style={{ borderColor }}
      >
        <Plus className="h-4 w-4" />
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
        <SeatViewGallery stadium="INCHEON" section={section.name} sectionAliases={section.seatViewSections} compact />
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
  const [isMobile, setIsMobile] = useState(false);
  const [uploadFor, setUploadFor] = useState<IncheonBlock | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const filterGroup = INCHEON_CATEGORY_GROUPS.find((group) => group.id === filterId);
  const filterCats = filterGroup?.cats ?? null;
  const hasOfficialBlocks = INCHEON_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' && INCHEON_BLOCKS.length > 0;
  const hoveredSection = hover ? (INCHEON_BLOCKS.find((block) => block.id === hover) ?? null) : null;
  const hoveredCategory = hoveredSection ? INCHEON_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#C8102E';
  const usedCategories = useMemo(() => [...new Set(INCHEON_BLOCKS.map((block) => block.category))], []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 960);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (zoom <= MIN_ZOOM && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  useEffect(() => {
    if (!isFullscreenOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreenOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreenOpen]);

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
    />
  );
  const fullscreenMapMaxWidth = `calc((100vh - 144px) * ${INCHEON_SEATMAP_IMAGE.imageWidth / INCHEON_SEATMAP_VIEWPORT.cropHeight})`;

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
    <div className={isMobile && hasOfficialBlocks ? 'pb-80' : undefined}>
      {hasOfficialBlocks && (
        <div className="mb-2.5 overflow-x-auto">
          <FilterBar selectedId={filterId} onChange={setFilterId} mode={mode} />
        </div>
      )}
      <div
        data-testid="stadium-seat-map"
        className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-3.5"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="text-sm font-black text-slate-800 dark:text-white">
            인천SSG랜더스필드
            <span className="ml-2 text-[11px] font-semibold" style={{ color: '#C8102E' }}>
              인천 SSG 공식 좌석도
            </span>
          </div>
          {hasOfficialBlocks && (
            <ZoomControls
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleZoomReset}
              onFullscreen={() => setIsFullscreenOpen(true)}
              mode={mode}
            />
          )}
        </div>
        <div className="relative">
          {renderMapSvg(!isFullscreenOpen)}
          <SeatMapHoverPreview
            visible={Boolean(hoveredSection && hoveredCategory)}
            title={hoveredSection?.name}
            subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
            badgeLabel={hoveredCategory?.label}
            accentColor={hoveredAccent}
            description={hoveredSection ? `${getIncheonSideLabel(hoveredSection.side)} · ${getIncheonFanRoleLabel(hoveredSection.fanRole)}` : undefined}
          />
        </div>
        {attribution}
        {hasOfficialBlocks && legend}
      </div>
      {!isMobile && hasOfficialBlocks && (
        <div className="mt-4">
          <DetailPanel
            section={selected}
            mode={mode}
            onClose={() => setSelected(null)}
            onUpload={() => selected && setUploadFor(selected)}
          />
        </div>
      )}
      {isMobile && hasOfficialBlocks && (
        <IncheonBottomSheet
          section={selected}
          mode={mode}
          onClose={() => setSelected(null)}
          onUpload={() => selected && setUploadFor(selected)}
        />
      )}
    </div>
    {uploadFor && (
      <IncheonUploadFlowModal
        section={uploadFor}
        mode={mode}
        onClose={() => setUploadFor(null)}
        onSubmit={handleUploadSubmit}
      />
    )}
    {toast && (
      <div
        className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-bold shadow-xl"
        style={{ background: mode === 'dark' ? '#f8fafc' : '#0f172a', color: mode === 'dark' ? '#0f172a' : '#f8fafc' }}
      >
        {toast}
      </div>
    )}
    {isFullscreenOpen && hasOfficialBlocks && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="인천 SSG 좌석도 전체화면"
        data-testid="incheon-seatmap-fullscreen"
        className="fixed inset-0 z-[220] bg-slate-950/95 p-3 text-white sm:p-5"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-5">
            <div>
              <div className="text-sm font-black text-white">인천SSG랜더스필드</div>
              <div className="text-[11px] font-semibold text-slate-400">공식 좌석도 전체화면</div>
            </div>
            <div className="flex items-center gap-2">
              <ZoomControls
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleZoomReset}
                mode="dark"
              />
              <button
                type="button"
                data-testid="incheon-seatmap-fullscreen-close"
                aria-label="인천 좌석도 전체화면 닫기"
                onClick={() => setIsFullscreenOpen(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-200 transition-colors hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-2 py-3 sm:px-4 sm:py-4">
            <div className="mx-auto flex h-full w-full items-center justify-center" style={{ maxWidth: fullscreenMapMaxWidth }}>
              <div className="w-full">
                <div className="relative">
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
          </div>
        </div>
      </div>
    )}
    </>
  );
}
