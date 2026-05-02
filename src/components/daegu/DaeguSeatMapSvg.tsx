import { useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  DAEGU_BLOCKS,
  DAEGU_CATEGORIES,
  DAEGU_SEATMAP_IMAGE,
  DAEGU_SEATMAP_VIEWPORT,
  getDaeguTraceMethodLabel,
  getDaeguTraceStatusLabel,
  type DaeguBlock,
} from '../../data/daeguSeatData';

interface Props {
  mode: 'light' | 'dark';
  selected: DaeguBlock | null;
  setSelected: (block: DaeguBlock | null) => void;
  hover: string | null;
  setHover: (id: string | null) => void;
  filterCats: string[] | null;
  zoom: number;
}

function MissingOfficialSeatMap({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="daegu-official-seatmap-required"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-10 text-center dark:border-amber-700 dark:bg-amber-950/25"
    >
      <div className="mb-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        MANUAL_BASEBALL_DATA_REQUIRED
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        대구 삼성 공식 좌석도 이미지가 필요합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        공식 좌석도 파일이 제공되면 이미지 위에 투명 hit-area를 얹어 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
        <div>필요 파일: {DAEGU_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {DAEGU_SEATMAP_IMAGE.imagePath}</div>
        <div>출처: {DAEGU_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'dark' ? '다크 모드' : '라이트 모드'}에서도 가짜 좌석도 fallback은 표시하지 않습니다.
      </p>
    </div>
  );
}

function resolveOfficialSeatMapImageUrl() {
  if (DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    return null;
  }

  return new URL('../../assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png', import.meta.url).href;
}

function clientToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const svgPoint = point.matrixTransform(ctm.inverse());

  return {
    x: Math.round(svgPoint.x),
    y: Math.round(svgPoint.y),
  };
}

function geometryPaths(block: DaeguBlock) {
  return block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d];
}

function polygonArea(path: string) {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (numbers.length < 6) return 0;

  let area = 0;
  for (let index = 0; index < numbers.length; index += 2) {
    const nextIndex = (index + 2) % numbers.length;
    area += (numbers[index] * numbers[nextIndex + 1]) - (numbers[nextIndex] * numbers[index + 1]);
  }

  return Math.abs(area) / 2;
}

function blockArea(block: DaeguBlock) {
  return geometryPaths(block).reduce((total, path) => total + polygonArea(path), 0);
}

export default function DaeguSeatMapSvg({
  mode,
  selected,
  setSelected,
  hover,
  setHover,
  filterCats,
  zoom,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const { imageWidth, imageHeight } = DAEGU_SEATMAP_IMAGE;
  const viewport = DAEGU_SEATMAP_VIEWPORT;
  const seatMapImageUrl = resolveOfficialSeatMapImageUrl();
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('daeguDebug') === '1';
  const gridStartX = Math.ceil(viewport.x / 100) * 100;
  const gridStartY = Math.ceil(viewport.y / 100) * 100;
  const gridXs = Array.from(
    { length: Math.max(0, Math.floor((viewport.x + viewport.width - gridStartX) / 100) + 1) },
    (_, index) => gridStartX + (index * 100),
  );
  const gridYs = Array.from(
    { length: Math.max(0, Math.floor((viewport.y + viewport.height - gridStartY) / 100) + 1) },
    (_, index) => gridStartY + (index * 100),
  );
  const renderBlocks = useMemo(
    () => [...DAEGU_BLOCKS].sort((a, b) => blockArea(b) - blockArea(a)),
    [],
  );

  const handleDebugMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    if (!showDebug) return;
    const point = clientToSvgPoint(event.currentTarget, event.clientX, event.clientY);
    if (point) setDebugPoint(point);
  };

  const handleDebugClick = (event: MouseEvent<SVGSVGElement>) => {
    if (!showDebug) return;
    const point = clientToSvgPoint(svgRef.current ?? event.currentTarget, event.clientX, event.clientY);
    if (!point) return;

    const coordinateText = `${point.x}, ${point.y}`;
    console.log('[DaeguSeatMapSvg] clicked SVG coordinate', coordinateText, point);
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(coordinateText).catch(() => undefined);
    }
  };

  if (
    DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL'
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
      style={{ aspectRatio: `${viewport.width} / ${viewport.height}` }}
    >
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <svg
          ref={svgRef}
          data-testid="daegu-seatmap-svg"
          viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label="대구 삼성 라이온즈 파크 좌석도 구역 선택"
          onMouseMove={handleDebugMouseMove}
          onClick={handleDebugClick}
          onMouseLeave={() => {
            setHover(null);
            if (showDebug) setDebugPoint(null);
          }}
        >
          <defs>
            <filter id="daegu-hit-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <image
            href={seatMapImageUrl}
            x={0}
            y={0}
            width={imageWidth}
            height={imageHeight}
            preserveAspectRatio="none"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
            onError={() => setImageFailed(true)}
          />
          {showDebug && (
            <g opacity="0.55" pointerEvents="none">
              {gridXs.map((x) => (
                <line key={`x-${x}`} x1={x} y1={viewport.y} x2={x} y2={viewport.y + viewport.height} stroke="#0f172a" strokeWidth="1" />
              ))}
              {gridYs.map((y) => (
                <line key={`y-${y}`} x1={viewport.x} y1={y} x2={viewport.x + viewport.width} y2={y} stroke="#0f172a" strokeWidth="1" />
              ))}
            </g>
          )}
          {renderBlocks.map((block) => {
            const cat = DAEGU_CATEGORIES[block.category];
            if (!cat) return null;

            const isFiltered = filterCats !== null && !filterCats.includes(block.category);
            const isSelected = selected?.id === block.id;
            const isActive = hover === block.id || isSelected;
            const traceStatusLabel = getDaeguTraceStatusLabel(block.traceStatus);
            const traceMethodLabel = getDaeguTraceMethodLabel(block.traceMethod);
            const baseColor = mode === 'dark' ? cat.dark : cat.light;
            const fillOpacity = isFiltered ? 0.001 : isActive ? 0.34 : showDebug ? 0.08 : 0.001;
            const stroke = showDebug && block.traceStatus === 'NEEDS_OPERATOR_REVIEW'
              ? '#F97316'
              : mode === 'dark' ? '#F8FAFC' : '#0F172A';
            const strokeOpacity = isFiltered ? 0 : isActive ? 0.95 : showDebug ? 0.38 : 0;

            return (
              <g key={block.id}>
                {geometryPaths(block).map((pathD, pathIndex) => (
                  <path
                    key={`${block.id}-${pathIndex}`}
                    role="button"
                    data-testid={`daegu-seat-block-${block.id}`}
                    data-path-index={pathIndex}
                    data-label-x={block.imageGeometry.labelX}
                    data-label-y={block.imageGeometry.labelY}
                    data-source-confidence={block.sourceConfidence}
                    data-trace-method={block.traceMethod}
                    data-trace-status={block.traceStatus}
                    tabIndex={isFiltered || pathIndex > 0 ? -1 : 0}
                    aria-label={`${block.name} ${block.block}`}
                    aria-pressed={isSelected}
                    d={pathD}
                    fill={baseColor}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={isActive ? 4 : 2}
                    filter={isActive ? 'url(#daegu-hit-glow)' : undefined}
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
                    {showDebug && <title>{`${block.id} · ${block.block} · ${traceMethodLabel} · ${traceStatusLabel}`}</title>}
                  </path>
                ))}
                {(isActive || showDebug) && !isFiltered && (
                  <text
                    x={block.imageGeometry.labelX}
                    y={block.imageGeometry.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={block.imageGeometry.labelFontSize ?? 18}
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
            <text
              x={debugPoint.x + 12}
              y={debugPoint.y - 12}
              fontSize="26"
              fontWeight="900"
              fill="#0f172a"
              stroke="#ffffff"
              strokeWidth="4"
              paintOrder="stroke"
              pointerEvents="none"
            >
              {debugPoint.x}, {debugPoint.y}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
