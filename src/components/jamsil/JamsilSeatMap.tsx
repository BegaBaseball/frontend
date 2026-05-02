import { useState, useEffect, useCallback } from 'react';
import {
  JAMSIL_BLOCKS,
  JAMSIL_CATEGORIES,
  JAMSIL_CATEGORY_GROUPS,
  JAMSIL_OFFICIAL_REFERENCES,
  JAMSIL_SEATMAP_IMAGE,
  type JamsilBlock,
} from '../../data/jamsilSeatData';
import JamsilSeatMapSvg from './JamsilSeatMapSvg';
import JamsilSidePanelV2 from './JamsilSidePanelV2';
import JamsilBottomSheet from './JamsilBottomSheet';
import JamsilUploadFlowModal from './JamsilUploadFlowModal';
import { useTheme } from '../../hooks/useTheme';
import SeatMapHoverPreview from '../SeatMapHoverPreview';

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

function FilterBar({ selectedId, onChange, mode }: { selectedId: string; onChange: (v: string) => void; mode: 'light' | 'dark' }) {
  return (
    <div className="flex gap-1.5 flex-wrap py-1">
      {JAMSIL_CATEGORY_GROUPS.map(g => {
        const active = g.id === selectedId;
        return (
          <button
            key={g.id}
            onClick={() => onChange(g.id)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-all"
            style={{
              background: active ? '#1F5C4A' : 'transparent',
              borderColor: active ? '#1F5C4A' : (mode === 'dark' ? '#334155' : '#e2e8f0'),
              color: active ? '#fff' : (mode === 'dark' ? '#94a3b8' : '#334155'),
            }}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}

export default function JamsilSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';

  const [selected, setSelected] = useState<JamsilBlock | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [filterId, setFilterId] = useState('all');
  const [officialSource, setOfficialSource] = useState<'LG' | 'DOOSAN'>('LG');
  const [uploadFor, setUploadFor] = useState<JamsilBlock | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 960);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    setToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
    setTimeout(() => setToast(null), 2800);
  }, [uploadFor]);

  useEffect(() => {
    if (zoom <= MIN_ZOOM && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  useEffect(() => {
    if (!isFullscreenOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreenOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreenOpen]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom);
    setZoom(normalizedZoom);
    if (normalizedZoom === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const handleOfficialSourceChange = useCallback((nextSource: 'LG' | 'DOOSAN') => {
    setOfficialSource(nextSource);
    setSelected(null);
    setHover(null);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    if (nextSource === 'DOOSAN') {
      setIsFullscreenOpen(false);
    }
  }, []);

  const usedCategories = [...new Set(JAMSIL_BLOCKS.map(b => b.category))];

  const isDoosanGuideActive = officialSource === 'DOOSAN';
  const displaySection: JamsilBlock | null = isDoosanGuideActive
    ? null
    : selected;
  const hoveredSection = !isDoosanGuideActive && hover ? (JAMSIL_BLOCKS.find(b => b.id === hover) ?? null) : null;
  const hoveredCategory = hoveredSection ? JAMSIL_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#1F5C4A';
  const doosanReference = JAMSIL_OFFICIAL_REFERENCES.find((reference) => reference.id === 'DOOSAN');

  const renderMapSvg = (enableAutoCenter = true, allowFullscreen = true) => (
    <JamsilSeatMapSvg
      mode={mode}
      granularity="high"
      officialSource={officialSource}
      onOfficialSourceChange={handleOfficialSourceChange}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      filterId={filterId}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={handleZoomChange}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomStep={ZOOM_STEP}
      enableAutoCenter={enableAutoCenter}
      onFullscreen={allowFullscreen && !isDoosanGuideActive ? () => setIsFullscreenOpen(true) : undefined}
    />
  );

  const attribution = (
    <div className="mt-2 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
      {isDoosanGuideActive ? (
        <>
          구장 안내 기준: {doosanReference?.sourceLabel ?? '두산 베어스 공식 자료'}
          {doosanReference?.sourceUrl && (
            <a
              href={doosanReference.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
            >
              출처
            </a>
          )}
        </>
      ) : (
        <>
          좌석 배치 기준: {JAMSIL_SEATMAP_IMAGE.sourceLabel}
          <a
            href={JAMSIL_SEATMAP_IMAGE.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
          >
            출처
          </a>
          <span className="mx-1">·</span>
          보조 참고: {doosanReference?.sourceLabel}
          {doosanReference?.sourceUrl && (
            <a
              href={doosanReference.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
            >
              출처
            </a>
          )}
          {JAMSIL_SEATMAP_IMAGE.assetStatus === 'MANUAL_BASEBALL_DATA_REQUIRED' && (
            <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">
              MANUAL_BASEBALL_DATA_REQUIRED
            </span>
          )}
        </>
      )}
    </div>
  );

  const legend = (
    <div className="flex flex-wrap gap-1.5 mt-2.5 px-1">
      {usedCategories.map(c => {
        const cat = JAMSIL_CATEGORIES[c];
        if (!cat) return null;
        const color = mode === 'dark' ? cat.dark : cat.light;
        return (
          <span key={c} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-full text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
            {cat.label}
          </span>
        );
      })}
    </div>
  );

  return (
    <>
      {isMobile ? (
        <div className={isDoosanGuideActive ? 'pb-4' : 'pb-80'}>
          {!isDoosanGuideActive && (
            <>
              <div className="mb-2.5 overflow-x-auto">
                <FilterBar selectedId={filterId} onChange={setFilterId} mode={mode} />
              </div>
            </>
          )}
          <div data-testid="stadium-seat-map" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-sm overflow-hidden">
            <div className="mb-2 px-1 text-sm font-black text-slate-800 dark:text-white">
              서울잠실야구장
              <span className="ml-2 text-[11px] font-semibold" style={{ color: '#1F5C4A' }}>
                {isDoosanGuideActive ? '두산 공식 구장 안내' : '잠실 블록 단위 안내도'}
              </span>
            </div>
            <div className="relative">
              {renderMapSvg(!isFullscreenOpen)}
              <SeatMapHoverPreview
                visible={Boolean(hoveredSection && hoveredCategory)}
                title={hoveredSection?.name}
                subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
                badgeLabel={hoveredCategory?.label}
                accentColor={hoveredAccent}
                description={hoveredSection ? `${hoveredSection.level} · ${hoveredSection.side}` : undefined}
              />
            </div>
            {attribution}
          </div>
          {!isDoosanGuideActive && (
            <JamsilBottomSheet
              section={selected}
              mode={mode}
              onClose={() => setSelected(null)}
              onUpload={() => setUploadFor(selected)}
            />
          )}
        </div>
      ) : (
        <>
          {!isDoosanGuideActive && (
            <div className="flex items-center gap-2.5 flex-wrap mb-3">
              <div className="flex-1 min-w-0">
                <FilterBar selectedId={filterId} onChange={setFilterId} mode={mode} />
              </div>
            </div>
          )}

          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: isDoosanGuideActive ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 380px',
              alignItems: 'start',
            }}
          >
            <div data-testid="stadium-seat-map" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-sm overflow-hidden">
              <div className="flex justify-between items-center mb-2.5 px-1">
                <div className="text-sm font-black text-slate-800 dark:text-white">
                  서울잠실야구장
                  <span className="text-[11px] font-semibold ml-2" style={{ color: '#1F5C4A' }}>
                    {isDoosanGuideActive ? '두산 공식 구장 안내' : '잠실 블록 단위 안내도'}
                  </span>
                </div>
              </div>
              <div className="relative">
                {renderMapSvg(!isFullscreenOpen)}
                <SeatMapHoverPreview
                  visible={Boolean(hoveredSection && hoveredCategory)}
                  title={hoveredSection?.name}
                  subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
                  badgeLabel={hoveredCategory?.label}
                  accentColor={hoveredAccent}
                  description={hoveredSection ? `${hoveredSection.level} · ${hoveredSection.side}` : undefined}
                />
              </div>
              {attribution}
              {!isDoosanGuideActive && legend}
            </div>

            {!isDoosanGuideActive && (
              <JamsilSidePanelV2
                section={displaySection}
                mode={mode}
                onClose={() => setSelected(null)}
                onUpload={() => setUploadFor(displaySection)}
              />
            )}
          </div>
        </>
      )}

      {uploadFor && (
        <JamsilUploadFlowModal
          section={uploadFor}
          mode={mode}
          onClose={() => setUploadFor(null)}
          onSubmit={handleUploadSubmit}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-full text-sm font-bold shadow-xl"
          style={{ background: mode === 'dark' ? '#f8fafc' : '#0f172a', color: mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
          {toast}
        </div>
      )}

      {isFullscreenOpen && !isDoosanGuideActive && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="잠실 좌석도 전체화면"
          data-testid="jamsil-seatmap-fullscreen"
          className="fixed inset-0 z-[220] bg-slate-950/95 p-3 text-white sm:p-5"
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-5">
              <div>
                <div className="text-sm font-black text-white">서울잠실야구장</div>
                <div className="text-[11px] font-semibold text-slate-400">LG 공식 좌석도 전체화면</div>
              </div>
              <button
                type="button"
                data-testid="jamsil-seatmap-fullscreen-close"
                aria-label="잠실 좌석도 전체화면 닫기"
                onClick={() => setIsFullscreenOpen(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-200 transition-colors hover:bg-slate-800"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-2 py-3 sm:px-4 sm:py-4">
              <div className="mx-auto flex h-full w-full max-w-[calc(100vh-120px)] items-center justify-center">
                <div className="w-full">
                  {renderMapSvg(true, false)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
