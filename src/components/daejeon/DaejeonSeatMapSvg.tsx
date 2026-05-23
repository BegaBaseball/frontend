import { useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent, type PointerEvent, type SetStateAction } from 'react';
import { clampPan, clampZoom, getPointerDistance, getPointerMidpoint, panForZoomAtPoint, readViewportSize, type TrackedPointer, type ViewportPoint, type ViewportSize } from '../stadiumSeatMap/seatMapInteractionUtils';
import {
  DAEJEON_BLOCKS,
  DAEJEON_BLOCK_GROUPS,
  DAEJEON_CATEGORIES,
  DAEJEON_SEATMAP_IMAGE,
  DAEJEON_TRACE_REVIEW_SUMMARY,
  getDaejeonTraceMethodLabel,
  getDaejeonTraceStatusLabel,
  isDaejeonSelectableSeatBlock,
  isDaejeonSplitColorBlockId,
  type DaejeonBlock,
} from '../../data/daejeonSeatData';

interface Props {
  mode: 'light' | 'dark';
  selected: DaejeonBlock | null;
  setSelected: (block: DaejeonBlock | null) => void;
  hover: string | null;
  setHover: (id: string | null) => void;
  visibleBlockIds: string[];
  filterCats?: readonly string[] | null;
  filterSides?: readonly string[] | null;
  filterLevels?: readonly string[] | null;
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: Dispatch<SetStateAction<{ x: number; y: number }>>;
  onZoom: (zoom: number) => void;
  minZoom: number;
  maxZoom: number;
  focusBlockId: string | null;
  focusRequestId: number;
}

function MissingOfficialSeatMap({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="daejeon-official-seatmap-required"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-10 text-center dark:border-amber-700 dark:bg-amber-950/25"
    >
      <div className="mb-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        MANUAL_BASEBALL_DATA_REQUIRED
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        대전 한화 공식 좌석도 이미지를 추가해야 합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        공식 좌석도 파일과 블록 좌표가 제공되면 이미지 위에 투명 hit-area를 얹어 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
        <div>필요 파일: {DAEJEON_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {DAEJEON_SEATMAP_IMAGE.imagePath}</div>
        <div>출처: {DAEJEON_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'dark' ? '다크 모드' : '라이트 모드'}에서도 가짜 좌석도 fallback은 표시하지 않습니다.
      </p>
    </div>
  );
}

function resolveOfficialSeatMapImageUrl() {
  if (DAEJEON_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    return null;
  }

  return new URL('../../assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png', import.meta.url).href;
}

function getSeatMapLayer(block: DaejeonBlock): number {
  if (block.category === 'ACCESSIBLE') return 40;
  if (block.category === 'SPECIAL' || block.category === 'EXCITING') return 30;
  if (block.category === 'SKY') return 20;
  return 10;
}

function getTraceLayer(block: DaejeonBlock): number {
  return block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 1 : 0;
}

function getSplitColorRenderLayer(block: DaejeonBlock): number {
  return isDaejeonSplitColorBlockId(block.id) ? 1 : 0;
}

function getPathBounds(d: string) {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    xs.push(numbers[index]);
    ys.push(numbers[index + 1]);
  }

  if (xs.length === 0 || ys.length === 0) return null;

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

export default function DaejeonSeatMapSvg({
  mode,
  selected,
  setSelected,
  hover,
  setHover,
  visibleBlockIds,
  filterCats,
  filterSides,
  filterLevels,
  zoom,
  pan,
  onPanChange,
  onZoom,
  minZoom,
  maxZoom,
  focusBlockId,
  focusRequestId,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const [debugSvgRect, setDebugSvgRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    totalMove: number;
    captureTarget: HTMLDivElement;
    usesPointerCapture: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const activePointersRef = useRef<Map<number, TrackedPointer>>(new Map());
  const pinchStateRef = useRef<{
    startDistance: number;
    startZoom: number;
    startPan: { x: number; y: number };
    viewport: ViewportSize;
    midpoint: ViewportPoint;
    moved: boolean;
  } | null>(null);
  const lastTapRef = useRef<{ time: number; clientX: number; clientY: number } | null>(null);
  const { imageWidth, imageHeight } = DAEJEON_SEATMAP_IMAGE;
  const seatMapImageUrl = resolveOfficialSeatMapImageUrl();
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('daejeonDebug') === '1';
  const visibleBlockIdSet = useMemo(() => new Set(visibleBlockIds), [visibleBlockIds]);
  const debugBlock = useMemo(() => (
    (hover ? DAEJEON_BLOCKS.find((block) => block.id === hover) : null)
    ?? selected
    ?? null
  ), [hover, selected]);
  const debugBlockBounds = debugBlock ? getPathBounds(debugBlock.imageGeometry.d) : null;
  const layeredBlocks = useMemo(() => (
    [...DAEJEON_BLOCKS].sort((a, b) => (
      getSeatMapLayer(a) - getSeatMapLayer(b)
      || getTraceLayer(a) - getTraceLayer(b)
      || getSplitColorRenderLayer(a) - getSplitColorRenderLayer(b)
      || a.displayPriority - b.displayPriority
    ))
  ), []);

  useEffect(() => {
    if (!seatMapImageUrl) return;

    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth !== imageWidth || image.naturalHeight !== imageHeight) {
        console.warn('[daejeon-seatmap] official image size mismatch', {
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          dataWidth: imageWidth,
          dataHeight: imageHeight,
        });
      }
    };
    image.onerror = () => setImageFailed(true);
    image.src = seatMapImageUrl;
  }, [imageHeight, imageWidth, seatMapImageUrl]);

  useEffect(() => {
    if (!focusBlockId || focusRequestId <= 0 || zoom <= 1) return;

    const focusBlock = DAEJEON_BLOCKS.find((block) => block.id === focusBlockId);
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!focusBlock || !rect || rect.width <= 0 || rect.height <= 0) return;

    const labelX = (focusBlock.imageGeometry.labelX / imageWidth) * rect.width;
    const labelY = (focusBlock.imageGeometry.labelY / imageHeight) * rect.height;
    const nextPan = clampPan({
      x: -(labelX - (rect.width / 2)) * zoom,
      y: -(labelY - (rect.height / 2)) * zoom,
    }, zoom, { width: rect.width, height: rect.height });

    onPanChange(nextPan);
  }, [focusBlockId, focusRequestId, imageHeight, imageWidth, onPanChange, zoom]);

  const beginPinchZoom = () => {
    const pointers = [...activePointersRef.current.values()];
    if (pointers.length !== 2) return;
    const [first, second] = pointers as [TrackedPointer, TrackedPointer];
    const node = viewportRef.current;
    if (!node) return;
    if (dragStateRef.current?.usesPointerCapture) {
      dragStateRef.current.captureTarget.releasePointerCapture(dragStateRef.current.pointerId);
    }
    dragStateRef.current = null;
    pinchStateRef.current = {
      startDistance: getPointerDistance(first, second),
      startZoom: zoom,
      startPan: pan,
      viewport: readViewportSize(node),
      midpoint: getPointerMidpoint(first, second, node),
      moved: false,
    };
    setIsDragging(true);
  };

  const updatePinchZoom = () => {
    const pinchState = pinchStateRef.current;
    if (!pinchState || pinchState.startDistance <= 0) return;
    const pointers = [...activePointersRef.current.values()];
    if (pointers.length < 2) return;
    const [first, second] = pointers as [TrackedPointer, TrackedPointer];
    const dist = getPointerDistance(first, second);
    const rawZoom = pinchState.startZoom * (dist / pinchState.startDistance);
    const nextZoom = clampZoom(rawZoom, minZoom, maxZoom);
    const nextPan = panForZoomAtPoint(pinchState.startPan, pinchState.startZoom, nextZoom, pinchState.midpoint, pinchState.viewport);
    pinchState.moved = true;
    onZoom(nextZoom);
    onPanChange(nextPan);
  };

  const updateZoomAtPoint = (nextZoom: number, clientX: number, clientY: number) => {
    const node = viewportRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const viewport = { width: rect.width, height: rect.height };
    const point = { x: clientX - rect.left, y: clientY - rect.top };
    onZoom(nextZoom);
    onPanChange(panForZoomAtPoint(pan, zoom, nextZoom, point, viewport));
  };

  const handleDoubleTap = (event: PointerEvent<HTMLDivElement>): boolean => {
    const last = lastTapRef.current;
    const now = Date.now();
    if (last && now - last.time <= 300 && Math.abs(event.clientX - last.clientX) <= 20 && Math.abs(event.clientY - last.clientY) <= 20) {
      lastTapRef.current = null;
      const nextZoom = zoom <= minZoom + 0.05 ? clampZoom(zoom * 1.5, minZoom, maxZoom) : minZoom;
      updateZoomAtPoint(nextZoom, event.clientX, event.clientY);
      return true;
    }
    lastTapRef.current = { time: now, clientX: event.clientX, clientY: event.clientY };
    return false;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerType: event.pointerType,
    });

    if (activePointersRef.current.size === 2) {
      beginPinchZoom();
      return;
    }

    if (pinchStateRef.current) return;
    if (!canDrag) return;

    const target = event.currentTarget;
    dragStateRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      totalMove: 0,
      captureTarget: target,
      usesPointerCapture: true,
    };
    setIsDragging(true);
    target.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerType: event.pointerType,
    });

    if (pinchStateRef.current) {
      updatePinchZoom();
      return;
    }

    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || !canDrag) return;

    const dx = event.clientX - dragState.lastX;
    const dy = event.clientY - dragState.lastY;
    dragState.lastX = event.clientX;
    dragState.lastY = event.clientY;
    dragState.totalMove += Math.abs(dx) + Math.abs(dy);
    onPanChange((current) => clampPan({ x: current.x + dx, y: current.y + dy }, zoom, readViewportSize(viewportRef.current)));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);

    if (pinchStateRef.current) {
      if (activePointersRef.current.size < 2) {
        pinchStateRef.current = null;
        setIsDragging(false);
      }
      return;
    }

    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (dragState.totalMove > 6) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    } else if (event.type === 'pointerup') {
      const wasDoubleTap = handleDoubleTap(event);
      if (wasDoubleTap) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
    }

    if (dragState.usesPointerCapture) {
      dragState.captureTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const handleDebugMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    if (!showDebug) return;

    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    setDebugSvgRect({
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });

    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) return;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const svgPoint = point.matrixTransform(matrix);
    setDebugPoint({
      x: Math.round(svgPoint.x),
      y: Math.round(svgPoint.y),
    });
  };

  if (
    DAEJEON_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL'
    || !seatMapImageUrl
    || imageWidth <= 0
    || imageHeight <= 0
    || imageFailed
    || DAEJEON_BLOCKS.length === 0
  ) {
    return (
      <div className="relative rounded-xl bg-slate-100 dark:bg-[#050810]">
        <MissingOfficialSeatMap mode={mode} />
      </div>
    );
  }

  const canDrag = zoom > 1;

  return (
    <div
      ref={viewportRef}
      className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#050810]"
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
    >
      <div
        data-testid="daejeon-seatmap-transform-layer"
        data-zoom={zoom.toFixed(2)}
        data-pan-x={pan.x.toFixed(1)}
        data-pan-y={pan.y.toFixed(1)}
        className={`absolute inset-0 ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
          cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label="대전 한화생명볼파크 좌석도 구역 선택"
          onMouseMove={handleDebugMouseMove}
          onMouseLeave={() => {
            setHover(null);
            if (showDebug) {
              setDebugPoint(null);
              setDebugSvgRect(null);
            }
          }}
        >
          {!imageLoaded && !imageFailed && (
            <rect x={0} y={0} width={imageWidth} height={imageHeight} fill="#e5e7eb" />
          )}
          <image
            href={seatMapImageUrl}
            x="0"
            y="0"
            width={imageWidth}
            height={imageHeight}
            preserveAspectRatio="none"
            aria-hidden="true"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.25s ease-in' }}
          />
          <defs>
            <filter id="daejeon-hit-glow">
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
                <line key={`y-${y}`} x1={0} y1={y} x2={imageWidth} stroke="#0f172a" strokeWidth="1" />
              ))}
            </g>
          )}
          {showDebug && (
            <g pointerEvents="none">
              {DAEJEON_BLOCK_GROUPS.map((group) => (
                <path
                  key={`debug-parent-${group.id}`}
                  d={group.imageGeometry.d}
                  fill="none"
                  stroke={mode === 'dark' ? '#FDE68A' : '#92400E'}
                  strokeDasharray="10 6"
                  strokeOpacity="0.82"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          )}
          {layeredBlocks.map((block) => {
            const cat = DAEJEON_CATEGORIES[block.category];
            if (!cat) return null;

            const isFiltered = !visibleBlockIdSet.has(block.id);
            const isActive = hover === block.id || selected?.id === block.id;
            const isPendingReview = block.traceStatus === 'NEEDS_OPERATOR_REVIEW';
            const isSelectable = isDaejeonSelectableSeatBlock(block);
            const canInteract = showDebug || (!isFiltered && isSelectable);
            const isAnyFilterActive = filterCats != null || filterSides != null || filterLevels != null;
            let fill = mode === 'dark' ? cat.dark : cat.light;
            const baseColor = fill;
            const debugStroke = isPendingReview ? '#F97316' : '#22C55E';
            const stroke = showDebug ? debugStroke : mode === 'dark' ? '#F8FAFC' : '#0F172A';
            let displayFillOpacity: number;
            if (showDebug) {
              displayFillOpacity = isPendingReview ? 0.18 : 0.12;
            } else if (isActive && !isFiltered && isSelectable) {
              displayFillOpacity = 0.34;
            } else if (isAnyFilterActive && !isFiltered && isSelectable) {
              displayFillOpacity = 0.20;
            } else if (isFiltered && !showDebug) {
              fill = mode === 'dark' ? '#020617' : '#1e293b';
              displayFillOpacity = 0.42;
            } else {
              displayFillOpacity = 0;
            }
            const displayStrokeOpacity = showDebug ? 0.72 : isActive && !isFiltered && isSelectable ? 0.95 : 0;
            const traceStatusLabel = getDaejeonTraceStatusLabel(block.traceStatus);
            const traceMethodLabel = getDaejeonTraceMethodLabel(block.traceMethod);
            const hitAreaD = block.hitAreaD ?? block.imageGeometry.d;

            return (
              <g key={block.id}>
                <path
                  data-testid={`daejeon-seat-display-${block.id}`}
                  d={block.imageGeometry.d}
                  fill={fill}
                  fillOpacity={displayFillOpacity}
                  stroke={stroke}
                  strokeOpacity={displayStrokeOpacity}
                  strokeWidth={isActive ? 4 : 2}
                  filter={isActive ? 'url(#daejeon-hit-glow)' : undefined}
                  pointerEvents="none"
                  vectorEffect="non-scaling-stroke"
                  style={{ transition: 'fill 0.18s, fill-opacity 0.18s, stroke-opacity 0.15s' }}
                />
                <path
                  role="button"
                  data-testid={`daejeon-seat-block-${block.id}`}
                  data-display-d={block.imageGeometry.d}
                  data-hit-area-d={hitAreaD}
                  data-label-x={block.imageGeometry.labelX}
                  data-label-y={block.imageGeometry.labelY}
                  data-trace-method={block.traceMethod}
                  data-trace-status={block.traceStatus}
                  tabIndex={canInteract ? 0 : -1}
                  aria-label={`${block.name} ${block.blockCode} ${block.officialBlockLabel}`}
                  aria-pressed={isActive}
                  d={hitAreaD}
                  fill={baseColor}
                  fillOpacity="0.001"
                  stroke="transparent"
                  strokeOpacity="0"
                  strokeWidth="0"
                  pointerEvents={canInteract ? 'fill' : 'none'}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: canInteract ? zoom > 1 ? 'grab' : 'pointer' : 'default' }}
                  onMouseEnter={() => canInteract && setHover(block.id)}
                  onClick={() => {
                    if (!canInteract || suppressClickRef.current) return;
                    setSelected(selected?.id === block.id ? null : block);
                  }}
                  onKeyDown={(event) => {
                    if (!canInteract) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelected(selected?.id === block.id ? null : block);
                    }
                  }}
                >
                  {showDebug && <title>{`${block.id} · ${block.officialBlockLabel} · ${traceMethodLabel} · ${traceStatusLabel}`}</title>}
                </path>
                {((isActive && !isFiltered) || showDebug) && (
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
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Daejeon trace debug</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>blocks {DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks}</span>
            <span className="text-emerald-600 dark:text-emerald-300">traced {DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced}</span>
            <span className="text-orange-600 dark:text-orange-300">review {DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-600 dark:text-slate-300">
            <span>viewBox 0 0 {imageWidth} {imageHeight}</span>
            <span>image {imageWidth}x{imageHeight}</span>
            <span>zoom {zoom.toFixed(2)}</span>
            <span>pan {Math.round(pan.x)},{Math.round(pan.y)}</span>
            <span>
              cursor {debugPoint ? `${debugPoint.x},${debugPoint.y}` : '-'}
            </span>
            <span>
              rect {debugSvgRect ? `${debugSvgRect.left},${debugSvgRect.top},${debugSvgRect.width}x${debugSvgRect.height}` : '-'}
            </span>
          </div>
          <div className="mt-1 grid gap-0.5 text-slate-600 dark:text-slate-300">
            <span>hovered {debugBlock ? `${debugBlock.id} / ${debugBlock.blockCode}` : '-'}</span>
            <span>
              bbox {debugBlockBounds ? `${Math.round(debugBlockBounds.minX)},${Math.round(debugBlockBounds.minY)}-${Math.round(debugBlockBounds.maxX)},${Math.round(debugBlockBounds.maxY)}` : '-'}
            </span>
            <span>method {debugBlock ? debugBlock.traceMethod : '-'}</span>
            <span>status {debugBlock ? debugBlock.traceStatus : '-'}</span>
          </div>
          <div className="mt-1 text-slate-500 dark:text-slate-400">orange child = needs review, dashed line = parent area</div>
        </div>
      )}
    </div>
  );
}
