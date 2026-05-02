import { useState } from 'react';
import {
  GWANGJU_BLOCKS,
  GWANGJU_CATEGORIES,
  GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  GWANGJU_SELECTABLE_BLOCKS_READY,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_SEATMAP_VIEWPORT,
  type GwangjuBlock,
} from '../../data/gwangjuSeatData';

interface Props {
  mode: 'light' | 'dark';
  selected: GwangjuBlock | null;
  setSelected: (block: GwangjuBlock | null) => void;
  hover: string | null;
  setHover: (id: string | null) => void;
  filterCats: string[] | null;
  zoom: number;
  onZoom: (zoom: number) => void;
}

function MissingOfficialSeatMap({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="gwangju-official-seatmap-required"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-10 text-center dark:border-amber-700 dark:bg-amber-950/25"
    >
      <div className="mb-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        MANUAL_BASEBALL_DATA_REQUIRED
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        광주-KIA 공식 좌석도 이미지가 필요합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        공식 좌석도 파일과 블록 좌표가 제공되면 이미지 위에 투명 hit-area를 얹어 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
        <div>필요 파일: {GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {GWANGJU_SEATMAP_IMAGE.imagePath}</div>
        <div>출처: {GWANGJU_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'dark' ? '다크 모드' : '라이트 모드'}에서도 가짜 좌석도 fallback은 표시하지 않습니다.
      </p>
    </div>
  );
}

function resolveOfficialSeatMapImageUrl() {
  if (GWANGJU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    return null;
  }

  return new URL('../../assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png', import.meta.url).href;
}

export default function GwangjuSeatMapSvg({
  mode,
  selected,
  setSelected,
  hover,
  setHover,
  filterCats,
  zoom,
  onZoom,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const { imageWidth, imageHeight } = GWANGJU_SEATMAP_IMAGE;
  const seatMapImageUrl = resolveOfficialSeatMapImageUrl();
  const debugMode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('gwangjuDebug')
    : null;
  const showDebug = debugMode === '1' || debugMode === 'hit';
  const showHitAreaDebug = debugMode === 'hit';
  const shouldRenderHitAreas = GWANGJU_SELECTABLE_BLOCKS_READY;
  const { cropX, cropWidth } = GWANGJU_SEATMAP_VIEWPORT;
  const croppedImageWidthPercent = (imageWidth / cropWidth) * 100;
  const croppedImageLeftPercent = -(cropX / cropWidth) * 100;
  const zoomBtnCls = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';

  if (
    GWANGJU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL'
    || !seatMapImageUrl
    || imageWidth <= 0
    || imageHeight <= 0
    || imageFailed
  ) {
    return (
      <div className="relative rounded-xl bg-slate-100 dark:bg-[#050810]">
        <MissingOfficialSeatMap mode={mode} />
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#050810]"
      style={{ aspectRatio: `${cropWidth} / ${imageHeight}` }}
    >
      <div
        className="absolute top-0 h-full transition-transform duration-200 ease-out"
        style={{
          width: `${croppedImageWidthPercent}%`,
          left: `${croppedImageLeftPercent}%`,
          transform: `scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <img
          src={seatMapImageUrl}
          alt="광주-KIA 챔피언스필드 공식 좌석 배치도"
          className="absolute inset-0 h-full w-full select-none object-contain"
          draggable={false}
          loading="eager"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"
          onMouseMove={(event) => {
            if (!showDebug) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const x = Math.round(((event.clientX - rect.left) / rect.width) * imageWidth);
            const y = Math.round(((event.clientY - rect.top) / rect.height) * imageHeight);
            setDebugPoint({ x, y });
          }}
          onMouseLeave={() => {
            setHover(null);
            if (showDebug) setDebugPoint(null);
          }}
        >
          <defs>
            <filter id="gwangju-hit-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {showDebug && (
            <g opacity="0.55" pointerEvents="none">
              {Array.from({ length: Math.floor(imageWidth / 100) + 1 }, (_, index) => index * 100).map((x) => (
                <line key={`x-${x}`} x1={x} y1={0} x2={x} y2={imageHeight} stroke="#0f172a" strokeWidth="1" />
              ))}
              {Array.from({ length: Math.floor(imageHeight / 100) + 1 }, (_, index) => index * 100).map((y) => (
                <line key={`y-${y}`} x1={0} y1={y} x2={imageWidth} y2={y} stroke="#0f172a" strokeWidth="1" />
              ))}
            </g>
          )}
          {(shouldRenderHitAreas || showDebug) && GWANGJU_BLOCKS.map((block) => {
            const cat = GWANGJU_CATEGORIES[block.category];
            if (!cat) return null;

            const isFiltered = filterCats !== null && !filterCats.includes(block.category);
            const isInteractive = shouldRenderHitAreas && !isFiltered;
            const isActive = isInteractive && (hover === block.id || selected?.id === block.id);
            const baseColor = mode === 'dark' ? cat.dark : cat.light;
            const fillOpacity = isFiltered ? 0.001 : isActive ? 0.34 : showHitAreaDebug ? 0.08 : 0.001;
            const stroke = mode === 'dark' ? '#F8FAFC' : '#0F172A';
            const strokeOpacity = isFiltered ? 0 : isActive ? 0.95 : showHitAreaDebug ? 0.38 : 0;
            const showLabel = (isActive && !isFiltered) || (showDebug && showHitAreaDebug && !isFiltered);

            return (
              <g key={block.id}>
                <path
                  role={isInteractive ? 'button' : undefined}
                  tabIndex={isInteractive ? 0 : -1}
                  aria-label={`${block.name} ${block.block}`}
                  aria-pressed={isInteractive ? selected?.id === block.id : undefined}
                  d={block.imageGeometry.d}
                  fill={baseColor}
                  fillOpacity={fillOpacity}
                  stroke={stroke}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={isActive ? 4 : 2}
                  filter={isActive ? 'url(#gwangju-hit-glow)' : undefined}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents={isInteractive ? 'all' : 'none'}
                  style={{ cursor: isInteractive ? 'pointer' : 'default', transition: 'fill-opacity 0.15s, stroke-opacity 0.15s' }}
                  onMouseEnter={() => isInteractive && setHover(block.id)}
                  onPointerDown={(event) => {
                    if (!isInteractive) return;
                    event.preventDefault();
                    setSelected(block);
                  }}
                  onClick={(event) => {
                    if (!isInteractive) return;
                    event.preventDefault();
                    setSelected(block);
                  }}
                  onKeyDown={(event) => {
                    if (!isInteractive) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelected(block);
                    }
                  }}
                />
                {showLabel && (
                  <text
                    x={block.imageGeometry.labelX}
                    y={block.imageGeometry.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={block.imageGeometry.labelFontSize ?? 12}
                    fontWeight="800"
                    fill={mode === 'dark' ? '#F8FAFC' : '#0F172A'}
                    stroke={mode === 'dark' ? '#020617' : '#FFFFFF'}
                    strokeWidth="3"
                    paintOrder="stroke"
                    transform={`rotate(${block.imageGeometry.labelRotate ?? 0} ${block.imageGeometry.labelX} ${block.imageGeometry.labelY})`}
                    style={{ pointerEvents: 'none' }}
                  >
                    {block.imageGeometry.shortLabel}
                  </text>
                )}
              </g>
            );
          })}
          {(shouldRenderHitAreas || showDebug) && GWANGJU_NON_SELECTABLE_MARKER_ZONES.map((zone) => (
            <circle
              key={zone.id}
              data-testid="gwangju-non-selectable-marker-zone"
              aria-hidden="true"
              cx={zone.cx}
              cy={zone.cy}
              r={zone.r}
              fill={showDebug ? '#DC2626' : '#FFFFFF'}
              fillOpacity={showDebug ? 0.24 : 0.001}
              stroke={showDebug ? '#991B1B' : 'transparent'}
              strokeWidth={showDebug ? 2 : 0}
              pointerEvents={shouldRenderHitAreas ? 'all' : 'none'}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: shouldRenderHitAreas ? 'default' : 'inherit' }}
              onMouseEnter={() => shouldRenderHitAreas && setHover(null)}
              onPointerDown={(event) => {
                if (!shouldRenderHitAreas) return;
                event.preventDefault();
                event.stopPropagation();
                setHover(null);
                setSelected(null);
              }}
              onClick={(event) => {
                if (!shouldRenderHitAreas) return;
                event.preventDefault();
                event.stopPropagation();
                setHover(null);
                setSelected(null);
              }}
            />
          ))}
          {showDebug && debugPoint && (
            <text x={16} y={28} fontSize="18" fontWeight="800" fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke">
              {debugPoint.x}, {debugPoint.y}
            </text>
          )}
          </svg>
      </div>
      <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button className={zoomBtnCls} onClick={() => onZoom(Math.min(zoom + 0.25, 2.5))} aria-label="확대">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <div className="py-0.5 text-center text-[9px] font-black text-slate-500">{zoom.toFixed(1)}x</div>
        <button className={zoomBtnCls} onClick={() => onZoom(Math.max(zoom - 0.25, 1))} aria-label="축소">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
        </button>
        <button className={zoomBtnCls} onClick={() => onZoom(1)} aria-label="원래 크기">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4" /></svg>
        </button>
      </div>
    </div>
  );
}
