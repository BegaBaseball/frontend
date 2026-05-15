import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ExternalLink, Minus, Plus } from 'lucide-react';
import {
  DAEGU_BLOCKS,
  DAEGU_CATEGORIES,
  DAEGU_SEATMAP_IMAGE,
  DAEGU_SEATMAP_VIEWPORT,
  getDaeguTraceMethodLabel,
  getDaeguTraceStatusLabel,
  isDaeguNormalSelectableSeat,
  isDaeguReviewOnlySeat,
  type DaeguBlock,
} from '../../data/daeguSeatData';

export interface DaeguSeatMapPan {
  x: number;
  y: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface ViewportPoint {
  x: number;
  y: number;
}

interface Props {
  mode: 'light' | 'dark';
  selected: DaeguBlock | null;
  setSelected: (block: DaeguBlock | null) => void;
  hover: string | null;
  setHover: (id: string | null) => void;
  filterCats: string[] | null;
  zoom: number;
  pan: DaeguSeatMapPan;
  onPanChange: (pan: DaeguSeatMapPan) => void;
  onZoomChange: (zoom: number) => void;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  focusBlockId: string | null;
  focusRequestId: number;
  enableAutoCenter?: boolean;
  onFullscreenOpen?: () => void;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function clampZoom(value: number, minZoom: number, maxZoom: number) {
  return Math.min(maxZoom, Math.max(minZoom, Number(value.toFixed(2))));
}

function clampPan(pan: DaeguSeatMapPan, zoom: number, viewport: ViewportSize): DaeguSeatMapPan {
  if (zoom <= 1 || viewport.width <= 0 || viewport.height <= 0) {
    return { x: 0, y: 0 };
  }

  const maxX = (viewport.width * (zoom - 1)) / 2;
  const maxY = (viewport.height * (zoom - 1)) / 2;

  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

function readViewportSize(node: HTMLDivElement | null): ViewportSize {
  if (!node) {
    return { width: 0, height: 0 };
  }

  const rect = node.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
  };
}

function panForZoomAtPoint(
  currentPan: DaeguSeatMapPan,
  currentZoom: number,
  nextZoom: number,
  point: ViewportPoint,
  viewport: ViewportSize,
): DaeguSeatMapPan {
  if (nextZoom <= 1 || viewport.width <= 0 || viewport.height <= 0) {
    return { x: 0, y: 0 };
  }

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const pointDeltaX = point.x - centerX;
  const pointDeltaY = point.y - centerY;
  const safeCurrentZoom = Math.max(currentZoom, 0.01);
  const contentDeltaX = (pointDeltaX - currentPan.x) / safeCurrentZoom;
  const contentDeltaY = (pointDeltaY - currentPan.y) / safeCurrentZoom;

  return clampPan({
    x: pointDeltaX - (contentDeltaX * nextZoom),
    y: pointDeltaY - (contentDeltaY * nextZoom),
  }, nextZoom, viewport);
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

function getGeometryLabelPoint(geometry: DaeguBlock['imageGeometry']): [number, number] {
  return geometry.labelPoint ?? [geometry.labelX, geometry.labelY];
}

function getVisualPath(block: DaeguBlock) {
  return block.imageGeometry.visualPath ?? block.imageGeometry.d;
}

function getHitPath(block: DaeguBlock) {
  return block.imageGeometry.hitPath ?? getVisualPath(block);
}

function geometryPaths(block: DaeguBlock) {
  const hitPath = getHitPath(block);
  if (hitPath === block.imageGeometry.d && block.imageGeometry.paths?.length) {
    return block.imageGeometry.paths;
  }
  return [hitPath];
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
  pan,
  onPanChange,
  onZoomChange,
  minZoom,
  maxZoom,
  zoomStep,
  focusBlockId,
  focusRequestId,
  enableAutoCenter = true,
  onFullscreenOpen,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPan: DaeguSeatMapPan;
    viewport: ViewportSize;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const { imageWidth, imageHeight } = DAEGU_SEATMAP_IMAGE;
  const viewport = DAEGU_SEATMAP_VIEWPORT;
  const seatMapImageUrl = resolveOfficialSeatMapImageUrl();
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('daeguDebug') === '1';
  const measuredViewportSize = viewportSize.width > 0 && viewportSize.height > 0
    ? viewportSize
    : readViewportSize(viewportRef.current);
  const effectivePan = clampPan(pan, zoom, measuredViewportSize);
  const canDrag = zoom > minZoom;
  const zoomButtonClass = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800';
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
  const renderSeatBlocks = useMemo(
    () => renderBlocks.filter(isDaeguNormalSelectableSeat),
    [renderBlocks],
  );
  const renderReviewBlocks = useMemo(
    () => renderBlocks.filter(isDaeguReviewOnlySeat),
    [renderBlocks],
  );
  const renderMarkerBlocks = useMemo(
    () => renderBlocks.filter((block) => block.sectionKind !== 'SEAT_SECTION'),
    [renderBlocks],
  );

  useIsomorphicLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nextPan = clampPan(pan, zoom, measuredViewportSize);
    if (nextPan.x !== pan.x || nextPan.y !== pan.y) {
      onPanChange(nextPan);
    }
  }, [measuredViewportSize.height, measuredViewportSize.width, onPanChange, pan, zoom]);

  useEffect(() => {
    if (
      !enableAutoCenter
      || !focusBlockId
      || focusRequestId <= 0
      || zoom <= minZoom
      || dragStateRef.current
      || measuredViewportSize.width <= 0
      || measuredViewportSize.height <= 0
    ) {
      return;
    }

    const block = DAEGU_BLOCKS.find((candidate) => candidate.id === focusBlockId);
    if (!block) return;
    const [labelX, labelY] = getGeometryLabelPoint(block.imageGeometry);

    const targetPoint = {
      x: ((labelX - viewport.x) / viewport.width) * measuredViewportSize.width,
      y: ((labelY - viewport.y) / viewport.height) * measuredViewportSize.height,
    };
    const centeredPan = clampPan({
      x: (measuredViewportSize.width / 2 - targetPoint.x) * zoom,
      y: (measuredViewportSize.height / 2 - targetPoint.y) * zoom,
    }, zoom, measuredViewportSize);

    onPanChange(centeredPan);
  }, [
    enableAutoCenter,
    focusBlockId,
    focusRequestId,
    measuredViewportSize.height,
    measuredViewportSize.width,
    minZoom,
    onPanChange,
    viewport.height,
    viewport.width,
    viewport.x,
    viewport.y,
    zoom,
  ]);

  const suppressNextClick = useCallback((durationMs = 180) => {
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, durationMs);
  }, []);

  const updateZoomAtClientPoint = useCallback((clientX: number, clientY: number, targetZoom: number) => {
    const node = viewportRef.current;
    if (!node) return;

    const nextViewport = readViewportSize(node);
    if (nextViewport.width <= 0 || nextViewport.height <= 0) return;

    const rect = node.getBoundingClientRect();
    const nextZoom = clampZoom(targetZoom, minZoom, maxZoom);
    const point = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    const startPan = clampPan(pan, zoom, nextViewport);

    setViewportSize(nextViewport);
    onZoomChange(nextZoom);
    onPanChange(panForZoomAtPoint(startPan, zoom, nextZoom, point, nextViewport));
  }, [maxZoom, minZoom, onPanChange, onZoomChange, pan, zoom]);

  const updateZoomFromControls = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom, minZoom, maxZoom);
    onZoomChange(normalizedZoom);
    if (normalizedZoom === minZoom) {
      onPanChange({ x: 0, y: 0 });
      return;
    }

    onPanChange(clampPan(pan, normalizedZoom, measuredViewportSize));
  }, [maxZoom, measuredViewportSize, minZoom, onPanChange, onZoomChange, pan]);

  const finishDrag = useCallback((pointerId: number) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== pointerId) return;

    if (state.moved) {
      suppressNextClick();
    }
    dragStateRef.current = null;
    setIsDragging(false);
  }, [suppressNextClick]);

  const updateDragPan = useCallback((clientX: number, clientY: number, pointerId: number, preventDefault: () => void) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== pointerId) return;

    const deltaX = clientX - state.startClientX;
    const deltaY = clientY - state.startClientY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      state.moved = true;
    }
    if (!state.moved) return;

    preventDefault();
    onPanChange(clampPan({
      x: state.startPan.x + deltaX,
      y: state.startPan.y + deltaY,
    }, zoom, state.viewport));
  }, [onPanChange, zoom]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canDrag || event.button !== 0) return;

    event.preventDefault();
    const liveViewportSize = readViewportSize(event.currentTarget);
    const startPan = clampPan(pan, zoom, liveViewportSize);
    setViewportSize(liveViewportSize);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPan,
      viewport: liveViewportSize,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may be unavailable in some test environments.
    }
    setIsDragging(true);
  }, [canDrag, pan, zoom]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    updateDragPan(event.clientX, event.clientY, event.pointerId, () => event.preventDefault());
  }, [updateDragPan]);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    finishDrag(event.pointerId);
  }, [finishDrag]);

  const handleDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement | SVGElement | SVGPathElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nextZoom = zoom < Math.min(maxZoom, 1.75) ? Math.min(maxZoom, 1.75) : minZoom;
    updateZoomAtClientPoint(event.clientX, event.clientY, nextZoom);
    suppressNextClick(220);
  }, [maxZoom, minZoom, suppressNextClick, updateZoomAtClientPoint, zoom]);

  const handleDebugMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!showDebug) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(viewport.x + (((event.clientX - rect.left) / rect.width) * viewport.width));
    const y = Math.round(viewport.y + (((event.clientY - rect.top) / rect.height) * viewport.height));
    setDebugPoint({ x, y });
  };

  const renderInteractiveBlocks = (blocks: DaeguBlock[], layerKind: 'seat' | 'marker') => blocks.map((block) => {
    const cat = DAEGU_CATEGORIES[block.category];
    if (!cat) return null;

    const isFiltered = filterCats !== null && !filterCats.includes(block.category);
    const isSelected = selected?.id === block.id;
    const isActive = hover === block.id || isSelected;
    const traceStatusLabel = getDaeguTraceStatusLabel(block.traceStatus);
    const traceMethodLabel = getDaeguTraceMethodLabel(block.traceMethod);
    const baseColor = mode === 'dark' ? cat.dark : cat.light;
    const isMarker = layerKind === 'marker';
    const fillOpacity = isFiltered ? 0.001 : isActive ? 0.34 : showDebug ? (isMarker ? 0.12 : 0.08) : 0.001;
    const stroke = showDebug && block.traceStatus === 'NEEDS_OPERATOR_REVIEW'
      ? '#F97316'
      : mode === 'dark' ? '#F8FAFC' : '#0F172A';
    const strokeOpacity = isFiltered ? 0 : isActive ? 0.95 : showDebug ? (isMarker ? 0.56 : 0.38) : 0;
    const [labelX, labelY] = getGeometryLabelPoint(block.imageGeometry);
    const visualPath = getVisualPath(block);
    const hitPath = getHitPath(block);
    const testIdPrefix = isMarker ? 'daegu-seatmap-marker' : 'daegu-seat-block';

    return (
      <g key={`${layerKind}-${block.id}`} data-layer={isMarker ? 'marker' : 'seat-section'}>
        {geometryPaths(block).map((pathD, pathIndex) => (
          <path
            key={`${block.id}-${pathIndex}`}
            role="button"
            data-testid={`${testIdPrefix}-${block.id}`}
            data-path-index={pathIndex}
            data-label-x={labelX}
            data-label-y={labelY}
            data-source-confidence={block.sourceConfidence}
            data-trace-method={block.traceMethod}
            data-trace-status={block.traceStatus}
            data-pixel-alignment-status={block.imageGeometry.pixelAlignmentStatus}
            data-manual-reviewed={block.imageGeometry.manualReviewed ? 'true' : 'false'}
            data-geometry-version={block.imageGeometry.geometryVersion}
            data-section-kind={block.sectionKind}
            data-marker-type={block.markerType}
            data-visual-path={visualPath}
            data-hit-path={hitPath}
            tabIndex={isFiltered || pathIndex > 0 ? -1 : 0}
            aria-label={`${block.name} ${block.block}`}
            aria-pressed={isSelected}
            d={pathD}
            fill={baseColor}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeOpacity={strokeOpacity}
            strokeDasharray={isMarker && showDebug ? '5 4' : undefined}
            strokeWidth={isActive ? 4 : 2}
            filter={isActive ? 'url(#daegu-hit-glow)' : undefined}
            pointerEvents={isFiltered ? 'none' : 'fill'}
            vectorEffect="non-scaling-stroke"
            style={{
              cursor: isFiltered ? 'default' : canDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
              transition: 'fill-opacity 0.15s, stroke-opacity 0.15s',
            }}
            onMouseEnter={() => !isFiltered && !isDragging && setHover(block.id)}
            onClick={(event) => {
              if (suppressClickRef.current || event.detail > 1) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              if (!isFiltered) {
                setSelected(selected?.id === block.id ? null : block);
              }
            }}
            onDoubleClick={handleDoubleClick}
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
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={block.imageGeometry.labelFontSize ?? 18}
            fontWeight="800"
            fill={mode === 'dark' ? '#F8FAFC' : '#0F172A'}
            stroke={mode === 'dark' ? '#020617' : '#FFFFFF'}
            strokeWidth="3"
            paintOrder="stroke"
            transform={`rotate(${block.imageGeometry.labelRotate ?? 0} ${labelX} ${labelY})`}
            style={{ pointerEvents: 'none' }}
          >
            {block.imageGeometry.shortLabel}
          </text>
        )}
      </g>
    );
  });

  const renderReviewOnlyBlocks = (blocks: DaeguBlock[]) => blocks.map((block) => {
    const [labelX, labelY] = getGeometryLabelPoint(block.imageGeometry);
    const traceStatusLabel = getDaeguTraceStatusLabel(block.traceStatus);
    const traceMethodLabel = getDaeguTraceMethodLabel(block.traceMethod);
    const visualPath = getVisualPath(block);

    return (
      <g key={`review-${block.id}`} data-layer="review-only-seat-section">
        <path
          data-testid={`daegu-review-block-${block.id}`}
          data-label-x={labelX}
          data-label-y={labelY}
          data-trace-method={block.traceMethod}
          data-trace-status={block.traceStatus}
          data-pixel-alignment-status={block.imageGeometry.pixelAlignmentStatus}
          data-manual-reviewed={block.imageGeometry.manualReviewed ? 'true' : 'false'}
          data-section-kind={block.sectionKind}
          d={visualPath}
          fill="#F97316"
          fillOpacity="0.12"
          stroke="#F97316"
          strokeOpacity="0.72"
          strokeDasharray="7 5"
          strokeWidth="3"
          pointerEvents="none"
          vectorEffect="non-scaling-stroke"
        >
          <title>{`${block.id} · ${block.block} · ${traceMethodLabel} · ${traceStatusLabel}`}</title>
        </path>
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={block.imageGeometry.labelFontSize ?? 18}
          fontWeight="900"
          fill="#F97316"
          stroke="#FFFFFF"
          strokeWidth="3"
          paintOrder="stroke"
          transform={`rotate(${block.imageGeometry.labelRotate ?? 0} ${labelX} ${labelY})`}
          pointerEvents="none"
        >
          {block.imageGeometry.shortLabel}
        </text>
      </g>
    );
  });

  const renderMarkerOnlyBlocks = (blocks: DaeguBlock[]) => blocks.map((block) => {
    const cat = DAEGU_CATEGORIES[block.category];
    if (!cat) return null;

    const [labelX, labelY] = getGeometryLabelPoint(block.imageGeometry);
    const traceStatusLabel = getDaeguTraceStatusLabel(block.traceStatus);
    const traceMethodLabel = getDaeguTraceMethodLabel(block.traceMethod);
    const markerColor = mode === 'dark' ? cat.dark : cat.light;

    return (
      <g key={`marker-${block.id}`} data-layer="marker-only">
        {geometryPaths(block).map((pathD, pathIndex) => (
          <path
            key={`${block.id}-${pathIndex}`}
            data-testid={`daegu-seatmap-marker-${block.id}`}
            data-path-index={pathIndex}
            data-label-x={labelX}
            data-label-y={labelY}
            data-trace-method={block.traceMethod}
            data-trace-status={block.traceStatus}
            data-section-kind={block.sectionKind}
            data-marker-type={block.markerType}
            d={pathD}
            fill={markerColor}
            fillOpacity={showDebug ? 0.16 : 0.001}
            stroke={markerColor}
            strokeOpacity={showDebug ? 0.72 : 0}
            strokeDasharray={showDebug ? '5 4' : undefined}
            strokeWidth="3"
            pointerEvents="none"
            vectorEffect="non-scaling-stroke"
          >
            {showDebug && <title>{`${block.id} · ${block.block} · ${traceMethodLabel} · ${traceStatusLabel}`}</title>}
          </path>
        ))}
        {showDebug && (
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={block.imageGeometry.labelFontSize ?? 18}
            fontWeight="900"
            fill={markerColor}
            stroke={mode === 'dark' ? '#020617' : '#FFFFFF'}
            strokeWidth="3"
            paintOrder="stroke"
            pointerEvents="none"
          >
            {block.imageGeometry.shortLabel}
          </text>
        )}
      </g>
    );
  });

  const zoomControls = (
    <div className="absolute right-3 top-3 z-10 flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/95">
      <button
        type="button"
        data-testid="daegu-seatmap-zoom-in"
        className={zoomButtonClass}
        onClick={() => updateZoomFromControls(zoom + zoomStep)}
        disabled={zoom >= maxZoom}
        aria-label="대구 좌석도 확대"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        data-testid="daegu-seatmap-zoom-reset"
        className="flex min-h-7 min-w-10 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent px-1.5 py-0.5 text-[10px] font-black text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
        onClick={() => updateZoomFromControls(minZoom)}
        disabled={zoom <= minZoom}
        aria-label="대구 좌석도 원래 크기"
      >
        {zoom.toFixed(1)}x
      </button>
      <button
        type="button"
        data-testid="daegu-seatmap-zoom-out"
        className={zoomButtonClass}
        onClick={() => updateZoomFromControls(zoom - zoomStep)}
        disabled={zoom <= minZoom}
        aria-label="대구 좌석도 축소"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      {onFullscreenOpen && (
        <button
          type="button"
          data-testid="daegu-seatmap-fullscreen-open"
          className={zoomButtonClass}
          onClick={onFullscreenOpen}
          aria-label="대구 좌석도 전체화면"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

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
    <div className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#050810]">
      <div
        ref={viewportRef}
        data-testid="daegu-seatmap-viewport"
        data-zoom={zoom.toFixed(2)}
        data-pan-x={effectivePan.x.toFixed(1)}
        data-pan-y={effectivePan.y.toFixed(1)}
        aria-label="대구 좌석도 확대 이동 영역"
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: `${viewport.width} / ${viewport.height}`,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={handleDoubleClick}
      >
        <div
          data-testid="daegu-seatmap-transform-layer"
          data-zoom={zoom.toFixed(2)}
          data-pan-x={effectivePan.x.toFixed(1)}
          data-pan-y={effectivePan.y.toFixed(1)}
          className={`absolute inset-0 ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
          style={{
            cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
            touchAction: 'none',
            transform: `translate3d(${effectivePan.x}px, ${effectivePan.y}px, 0) scale(${zoom})`,
            transformOrigin: '50% 50%',
          }}
        >
          <img
            src={seatMapImageUrl}
            alt="대구 삼성 라이온즈 파크 공식 좌석 배치도"
            className="absolute inset-0 h-full w-full select-none object-contain"
            draggable={false}
            loading="eager"
            decoding="async"
            onError={() => setImageFailed(true)}
            onDragStart={(event) => event.preventDefault()}
          />
          <svg
            data-testid="daegu-seatmap-svg"
            viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-label="대구 삼성 라이온즈 파크 좌석도 구역 선택"
            onDoubleClick={handleDoubleClick}
            onMouseMove={handleDebugMouseMove}
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
            <g data-layer="daegu-seat-polygon-layer">
              {renderInteractiveBlocks(renderSeatBlocks, 'seat')}
            </g>
            {showDebug && (
              <g data-layer="daegu-review-polygon-layer" pointerEvents="none">
                {renderReviewOnlyBlocks(renderReviewBlocks)}
              </g>
            )}
            <g data-layer="daegu-marker-layer">
              {renderMarkerOnlyBlocks(renderMarkerBlocks)}
            </g>
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
        {zoomControls}
      </div>
    </div>
  );
}
