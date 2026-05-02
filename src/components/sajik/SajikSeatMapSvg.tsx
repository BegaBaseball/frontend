import { useState } from 'react';
import {
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_SEATMAP_IMAGE,
  SAJIK_TRACE_REVIEW_SUMMARY,
  getSajikTraceStatusLabel,
  type SajikBlock,
} from '../../data/sajikSeatData';

interface Props {
  mode: 'light' | 'dark';
  selected: SajikBlock | null;
  setSelected: (block: SajikBlock | null) => void;
  hover: string | null;
  setHover: (id: string | null) => void;
  filterCats: string[] | null;
  zoom: number;
}

function MissingOfficialSeatMap({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="sajik-official-seatmap-required"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-10 text-center dark:border-amber-700 dark:bg-amber-950/25"
    >
      <div className="mb-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        MANUAL_BASEBALL_DATA_REQUIRED
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        사직 롯데 공식 좌석도 이미지가 필요합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        공식 또는 사용 허가된 좌석도 파일이 제공되면 이미지 위에 투명 hit-area를 얹어 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
        <div>필요 파일: {SAJIK_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {SAJIK_SEATMAP_IMAGE.imagePath}</div>
        <div>참고: {SAJIK_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'dark' ? '다크 모드' : '라이트 모드'}에서도 가짜 좌석도 fallback은 표시하지 않습니다.
      </p>
    </div>
  );
}

function resolveOfficialSeatMapImageUrl() {
  if (SAJIK_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    return null;
  }

  return new URL('../../assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png', import.meta.url).href;
}

export default function SajikSeatMapSvg({
  mode,
  selected,
  setSelected,
  hover,
  setHover,
  filterCats,
  zoom,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const { imageWidth, imageHeight } = SAJIK_SEATMAP_IMAGE;
  const seatMapImageUrl = resolveOfficialSeatMapImageUrl();
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('sajikDebug') === '1';

  if (
    SAJIK_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL'
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
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
    >
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <img
          src={seatMapImageUrl}
          alt="부산 사직야구장 공식 좌석 배치도"
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
          aria-label="부산 사직야구장 좌석도 구역 선택"
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
            <filter id="sajik-hit-glow">
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
          {SAJIK_BLOCKS.map((block) => {
            const cat = SAJIK_CATEGORIES[block.category];
            if (!cat) return null;

            const isFiltered = filterCats !== null && !filterCats.includes(block.category);
            const isActive = hover === block.id || selected?.id === block.id;
            const isPendingReview = block.traceStatus === 'NEEDS_OPERATOR_REVIEW';
            const baseColor = mode === 'dark' ? cat.dark : cat.light;
            const debugStroke = isPendingReview ? '#F97316' : '#22C55E';
            const fillOpacity = isFiltered ? 0.001 : isActive ? 0.34 : showDebug ? 0.06 : 0.001;
            const stroke = showDebug ? debugStroke : mode === 'dark' ? '#F8FAFC' : '#0F172A';
            const strokeOpacity = isFiltered ? 0 : isActive ? 0.95 : showDebug ? 0.58 : 0;
            const traceStatusLabel = getSajikTraceStatusLabel(block.traceStatus);

            return (
              <g key={block.id}>
                <path
                  role="button"
                  data-testid={`sajik-seat-block-${block.id}`}
                  data-label-x={block.imageGeometry.labelX}
                  data-label-y={block.imageGeometry.labelY}
                  tabIndex={isFiltered ? -1 : 0}
                  aria-label={`${block.name} ${block.block}`}
                  aria-pressed={isActive}
                  d={block.imageGeometry.d}
                  fill={baseColor}
                  fillOpacity={fillOpacity}
                  stroke={stroke}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={isActive ? 4 : 2}
                  filter={isActive ? 'url(#sajik-hit-glow)' : undefined}
                  pointerEvents={isFiltered ? 'none' : 'fill'}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: isFiltered ? 'default' : 'pointer', transition: 'fill-opacity 0.15s, stroke-opacity 0.15s' }}
                  onMouseEnter={() => !isFiltered && setHover(block.id)}
                  onClick={() => !isFiltered && setSelected(selected?.id === block.id ? null : block)}
                  onKeyDown={(event) => {
                    if (isFiltered) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelected(selected?.id === block.id ? null : block);
                    }
                  }}
                >
                  {showDebug && <title>{`${block.id} · ${block.name} · ${traceStatusLabel}`}</title>}
                </path>
                {(isActive || showDebug) && !isFiltered && (
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
          {showDebug && debugPoint && (
            <g pointerEvents="none">
              <rect x={debugPoint.x + 8} y={debugPoint.y - 24} width="96" height="22" rx="5" fill="#0f172a" opacity="0.9" />
              <text x={debugPoint.x + 16} y={debugPoint.y - 9} fill="#ffffff" fontSize="12" fontWeight="800">
                {debugPoint.x}, {debugPoint.y}
              </text>
            </g>
          )}
        </svg>
      </div>
      {showDebug && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-slate-900/10 bg-white/90 px-3 py-2 text-[11px] font-bold text-slate-800 shadow-lg dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-100">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Sajik trace debug</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>blocks {SAJIK_TRACE_REVIEW_SUMMARY.totalBlocks}</span>
            <span className="text-emerald-600 dark:text-emerald-300">traced {SAJIK_TRACE_REVIEW_SUMMARY.officialImageTraced}</span>
            <span className="text-orange-600 dark:text-orange-300">review {SAJIK_TRACE_REVIEW_SUMMARY.needsOperatorReview}</span>
          </div>
          <div className="mt-1 text-slate-500 dark:text-slate-400">orange = needs review, green = traced</div>
        </div>
      )}
    </div>
  );
}
