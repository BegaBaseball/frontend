import { useState, type KeyboardEvent } from 'react';
import {
  CHANGWON_BLOCKS,
  CHANGWON_CATEGORIES,
  CHANGWON_OFFICIAL_TRACE_REFERENCE,
  CHANGWON_SEATMAP_IMAGE,
  CHANGWON_SEATMAP_VIEWPORT,
  getChangwonBlockDisplayName,
  type ChangwonBlock,
} from '../../data/changwonSeatData';
import officialSeatMapImage from '../../assets/stadiums/nc/changwon-nc-seatmap-official-2026.png';

interface Props {
  mode: 'light' | 'dark';
  selected: ChangwonBlock | null;
  setSelected: (block: ChangwonBlock | null) => void;
  hover: string | null;
  setHover: (id: string | null) => void;
  activeBlockIds: Set<string> | null;
  zoom: number;
}

interface GeometryBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function getGeometryBounds(d: string): GeometryBounds | null {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (numbers.length < 4) return null;

  const xs: number[] = [];
  const ys: number[] = [];

  numbers.forEach((coordinate, index) => {
    if (index % 2 === 0) {
      xs.push(coordinate);
    } else {
      ys.push(coordinate);
    }
  });

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function MissingOfficialSeatMap({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="changwon-official-seatmap-required"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-10 text-center dark:border-amber-700 dark:bg-amber-950/25"
    >
      <div className="mb-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        MANUAL_BASEBALL_DATA_REQUIRED
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        창원 NC 공식 좌석도 이미지를 추가해야 합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        공식 좌석도 파일이 제공되면 이미지 위에 투명 hit-area를 얹어 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
        <div>필요 파일: {CHANGWON_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {CHANGWON_SEATMAP_IMAGE.imagePath}</div>
        <div>출처: {CHANGWON_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'dark' ? '다크 모드' : '라이트 모드'}에서도 가짜 좌석도 fallback은 표시하지 않습니다.
      </p>
    </div>
  );
}

export default function ChangwonSeatMapSvg({
  mode,
  selected,
  setSelected,
  hover,
  setHover,
  activeBlockIds,
  zoom,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const { imageWidth, imageHeight } = CHANGWON_SEATMAP_IMAGE;
  const { cropY, cropHeight } = CHANGWON_SEATMAP_VIEWPORT;
  const croppedImageHeightPercent = (imageHeight / cropHeight) * 100;
  const croppedImageTopPercent = -(cropY / cropHeight) * 100;
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('changwonDebug') === '1';
  const debugBlock = showDebug
    ? selected ?? (hover ? CHANGWON_BLOCKS.find((block) => block.id === hover) ?? null : null)
    : null;
  const debugBounds = debugBlock ? getGeometryBounds(debugBlock.imageGeometry.d) : null;
  const debugTextY = cropY + 36;

  if (CHANGWON_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL' || !officialSeatMapImage || imageFailed) {
    return (
      <div className="relative rounded-xl bg-slate-100 dark:bg-[#050810]">
        <MissingOfficialSeatMap mode={mode} />
      </div>
    );
  }

  return (
    <div
      data-testid="changwon-seatmap-viewport"
      className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#050810]"
      style={{ aspectRatio: `${imageWidth} / ${cropHeight}` }}
    >
      <div
        data-testid="changwon-seatmap-transform-layer"
        data-zoom={zoom.toFixed(2)}
        className="absolute left-0 w-full transition-transform duration-200 ease-out"
        style={{
          height: `${croppedImageHeightPercent}%`,
          top: `${croppedImageTopPercent}%`,
          transform: `scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <img
          src={officialSeatMapImage}
          alt="창원 NC파크 공식 좌석 배치도"
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
          aria-label="창원 NC파크 좌석도 구역 선택"
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
            <filter id="changwon-hit-glow">
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
          {CHANGWON_BLOCKS.map((block) => {
            const cat = CHANGWON_CATEGORIES[block.category];
            if (!cat) return null;

            const isFiltered = activeBlockIds !== null && !activeBlockIds.has(block.id);
            const isSelected = selected?.id === block.id;
            const isActive = hover === block.id || isSelected;
            const baseColor = mode === 'dark' ? cat.dark : cat.light;
            const fillOpacity = isFiltered ? 0.001 : isActive ? 0.34 : showDebug ? 0.16 : 0.001;
            const stroke = mode === 'dark' ? '#F8FAFC' : '#0F172A';
            const strokeOpacity = isFiltered ? 0 : isActive ? 0.95 : showDebug ? 0.62 : 0;
            const traceReference = CHANGWON_OFFICIAL_TRACE_REFERENCE[block.block];
            const expandedHitStrokeWidth = block.imageGeometry.hitStrokeWidth ?? 0;
            const usesExpandedHitArea = expandedHitStrokeWidth > 0;
            const handleSelect = () => !isFiltered && setSelected(selected?.id === block.id ? null : block);
            const handleKeyDown = (event: KeyboardEvent<SVGPathElement>) => {
              if (isFiltered) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelected(selected?.id === block.id ? null : block);
              }
            };

            return (
              <g key={block.id}>
                <path
                  role="button"
                  data-testid={`changwon-seat-block-${block.id}`}
                  data-label-x={block.imageGeometry.labelX}
                  data-label-y={block.imageGeometry.labelY}
                  tabIndex={isFiltered ? -1 : 0}
                  aria-label={getChangwonBlockDisplayName(block)}
                  aria-pressed={isSelected}
                  d={block.imageGeometry.d}
                  fill={baseColor}
                  fillOpacity={usesExpandedHitArea ? 0.001 : fillOpacity}
                  stroke={usesExpandedHitArea ? baseColor : stroke}
                  strokeOpacity={usesExpandedHitArea ? (isFiltered ? 0 : 0.001) : strokeOpacity}
                  strokeWidth={usesExpandedHitArea ? expandedHitStrokeWidth : isActive ? 4 : showDebug ? 1.5 : 2}
                  filter={!usesExpandedHitArea && isActive ? 'url(#changwon-hit-glow)' : undefined}
                  vectorEffect={usesExpandedHitArea ? undefined : 'non-scaling-stroke'}
                  pointerEvents={isFiltered ? 'none' : usesExpandedHitArea ? undefined : 'fill'}
                  style={{ cursor: isFiltered ? 'default' : 'pointer', transition: 'fill-opacity 0.15s, stroke-opacity 0.15s' }}
                  onMouseEnter={() => !isFiltered && setHover(block.id)}
                  onClick={handleSelect}
                  onKeyDown={handleKeyDown}
                />
                {usesExpandedHitArea && (
                  <path
                    aria-hidden="true"
                    d={block.imageGeometry.d}
                    fill={baseColor}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={isActive ? 4 : showDebug ? 1.5 : 2}
                    filter={isActive ? 'url(#changwon-hit-glow)' : undefined}
                    pointerEvents="none"
                    vectorEffect="non-scaling-stroke"
                    style={{ transition: 'fill-opacity 0.15s, stroke-opacity 0.15s' }}
                  />
                )}
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
                {showDebug && traceReference && (
                  <g pointerEvents="none">
                    <rect
                      data-changwon-reference-bbox={block.block}
                      x={traceReference.expectedBounds.minX}
                      y={traceReference.expectedBounds.minY}
                      width={traceReference.expectedBounds.maxX - traceReference.expectedBounds.minX}
                      height={traceReference.expectedBounds.maxY - traceReference.expectedBounds.minY}
                      fill="none"
                      stroke="#06B6D4"
                      strokeDasharray="8 6"
                      strokeOpacity="0.85"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={traceReference.numberAnchor.x - 10}
                      y1={traceReference.numberAnchor.y}
                      x2={traceReference.numberAnchor.x + 10}
                      y2={traceReference.numberAnchor.y}
                      stroke="#DC2626"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={traceReference.numberAnchor.x}
                      y1={traceReference.numberAnchor.y - 10}
                      x2={traceReference.numberAnchor.x}
                      y2={traceReference.numberAnchor.y + 10}
                      stroke="#DC2626"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      data-changwon-anchor={block.block}
                      cx={traceReference.numberAnchor.x}
                      cy={traceReference.numberAnchor.y}
                      r="5"
                      fill="#FDE047"
                      stroke="#7F1D1D"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                )}
              </g>
            );
          })}
          {showDebug && debugBounds && debugBlock && (
            <g pointerEvents="none">
              <rect
                x={debugBounds.minX}
                y={debugBounds.minY}
                width={debugBounds.maxX - debugBounds.minX}
                height={debugBounds.maxY - debugBounds.minY}
                fill="none"
                stroke="#F97316"
                strokeDasharray="14 10"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={debugBounds.minX}
                y={Math.max(24, debugBounds.minY - 10)}
                fontSize="18"
                fontWeight="800"
                fill="#C2410C"
                stroke="#fff"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {debugBlock.block} bbox {Math.round(debugBounds.minX)},{Math.round(debugBounds.minY)}-{Math.round(debugBounds.maxX)},{Math.round(debugBounds.maxY)}
              </text>
            </g>
          )}
          {showDebug && (
            <text x={16} y={debugTextY} fontSize="18" fontWeight="800" fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke">
              전체 path · 공식 숫자 anchor · geometry bbox · reference bbox · 현재 좌표 {debugPoint ? `${debugPoint.x}, ${debugPoint.y}` : '-'} · 선택 bbox {debugBlock?.block ?? '-'}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
