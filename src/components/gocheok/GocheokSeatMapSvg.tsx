import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  GOCHEOK_BLOCKS,
  GOCHEOK_CATEGORIES,
  GOCHEOK_SEATMAP_VIEW_BOX,
  GOCHEOK_SEATMAP_IMAGE,
  type GocheokBlock,
} from '../../data/gocheokSeatData';
import officialSeatMapImage from '../../assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.webp';
import type { SeatMapPan, SeatMapSvgBaseProps } from '../stadiumSeatMap/seatMapCommonTypes';
import {
  clampPan,
  clampZoom,
  panForZoomAtPoint,
  readViewportSize,
  getPointerDistance,
  getPointerMidpoint,
  type ViewportSize,
  type ViewportPoint,
  type TrackedPointer,
} from '../stadiumSeatMap/seatMapInteractionUtils';

type Props = SeatMapSvgBaseProps<GocheokBlock>;

function clientPointToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;

  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  return point.matrixTransform(matrix.inverse());
}

function MissingOfficialSeatMap({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="gocheok-official-seatmap-required"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-10 text-center dark:border-amber-700 dark:bg-amber-950/25"
    >
      <div className="mb-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        MANUAL_BASEBALL_DATA_REQUIRED
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        고척 스카이돔 공식 좌석도 이미지를 추가해야 합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        공식 좌석도 파일이 제공되면 이미지 위에 투명 hit-area를 얹어 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
        <div>필요 파일: {GOCHEOK_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {GOCHEOK_SEATMAP_IMAGE.imagePath}</div>
        <div>출처: {GOCHEOK_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'dark' ? '다크 모드' : '라이트 모드'}에서도 가짜 좌석도 fallback은 표시하지 않습니다.
      </p>
    </div>
  );
}

export default function GocheokSeatMapSvg({
  mode,
  selected,
  setSelected,
  hover,
  setHover,
  filterCats,
  filterSides,
  filterLevels,
  zoom,
  pan,
  onPanChange,
  onZoom,
  minZoom,
  maxZoom,
  zoomStep,
  enableAutoCenter = true,
  onFullscreen,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const activePointersRef = useRef<Map<number, TrackedPointer>>(new Map());
  const pinchStateRef = useRef<{
    startDistance: number;
    startZoom: number;
    startPan: SeatMapPan;
    viewport: ViewportSize;
    midpoint: ViewportPoint;
    moved: boolean;
  } | null>(null);
  const lastTapRef = useRef<{ time: number; clientX: number; clientY: number } | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPan: SeatMapPan;
    viewport: ViewportSize;
    moved: boolean;
    captureTarget: HTMLDivElement;
    usesPointerCapture: boolean;
  } | null>(null);
  const { imageWidth, imageHeight } = GOCHEOK_SEATMAP_IMAGE;
  const seatMapImageUrl = GOCHEOK_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' ? officialSeatMapImage : null;
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('gocheokDebug') === '1';
  const measuredViewportSize = viewportSize.width > 0 && viewportSize.height > 0
    ? viewportSize
    : readViewportSize(viewportRef.current);
  const effectivePan = clampPan(pan, zoom, measuredViewportSize);
  const canDrag = zoom > minZoom;
  const zoomBtnCls = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800';

  useLayoutEffect(() => {
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
    if (!enableAutoCenter || !selected || zoom <= minZoom || dragStateRef.current || pinchStateRef.current || measuredViewportSize.width <= 0 || measuredViewportSize.height <= 0) {
      return;
    }

    const targetPoint = {
      x: (selected.imageGeometry.labelX / imageWidth) * measuredViewportSize.width,
      y: (selected.imageGeometry.labelY / imageHeight) * measuredViewportSize.height,
    };
    const centeredPan = clampPan({
      x: (measuredViewportSize.width / 2 - targetPoint.x) * zoom,
      y: (measuredViewportSize.height / 2 - targetPoint.y) * zoom,
    }, zoom, measuredViewportSize);

    onPanChange(centeredPan);
  }, [
    enableAutoCenter,
    imageHeight,
    imageWidth,
    measuredViewportSize.height,
    measuredViewportSize.width,
    minZoom,
    onPanChange,
    selected,
    zoom,
  ]);

  const suppressNextClick = useCallback((durationMs = 180) => {
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, durationMs);
  }, []);

  const zoomAtClientPoint = useCallback((clientX: number, clientY: number, targetZoom: number) => {
    const node = viewportRef.current;
    if (!node) return;

    const viewport = readViewportSize(node);
    if (viewport.width <= 0 || viewport.height <= 0) return;

    const rect = node.getBoundingClientRect();
    const nextZoom = clampZoom(targetZoom, minZoom, maxZoom);
    const point = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    const startPan = clampPan(pan, zoom, viewport);

    setViewportSize(viewport);
    onZoom(nextZoom);
    onPanChange(panForZoomAtPoint(startPan, zoom, nextZoom, point, viewport));
  }, [maxZoom, minZoom, onPanChange, onZoom, pan, zoom]);

  const getTrackedTouchPointers = useCallback(() => (
    [...activePointersRef.current.values()].filter((pointer) => pointer.pointerType === 'touch')
  ), []);

  const beginPinchZoom = useCallback(() => {
    const node = viewportRef.current;
    if (!node) return false;

    const pointers = getTrackedTouchPointers();
    if (pointers.length < 2) return false;

    const viewport = readViewportSize(node);
    if (viewport.width <= 0 || viewport.height <= 0) return false;

    const [first, second] = pointers;
    const startDistance = getPointerDistance(first, second);
    if (startDistance <= 0) return false;

    pinchStateRef.current = {
      startDistance,
      startZoom: zoom,
      startPan: clampPan(pan, zoom, viewport),
      viewport,
      midpoint: getPointerMidpoint(first, second, node),
      moved: false,
    };
    dragStateRef.current = null;
    setViewportSize(viewport);
    setIsDragging(true);
    return true;
  }, [getTrackedTouchPointers, pan, zoom]);

  const updatePinchZoom = useCallback(() => {
    const pinchState = pinchStateRef.current;
    if (!pinchState) return false;

    const pointers = getTrackedTouchPointers();
    if (pointers.length < 2) return false;

    const [first, second] = pointers;
    const currentDistance = getPointerDistance(first, second);
    if (currentDistance <= 0) return true;

    const nextZoom = clampZoom(
      pinchState.startZoom * (currentDistance / pinchState.startDistance),
      minZoom,
      maxZoom,
    );
    pinchState.moved = true;
    onZoom(nextZoom);
    onPanChange(panForZoomAtPoint(
      pinchState.startPan,
      pinchState.startZoom,
      nextZoom,
      pinchState.midpoint,
      pinchState.viewport,
    ));
    return true;
  }, [getTrackedTouchPointers, maxZoom, minZoom, onPanChange, onZoom]);

  const finishPinchZoom = useCallback(() => {
    const pinchState = pinchStateRef.current;
    if (!pinchState) return false;

    if (pinchState.moved) {
      suppressNextClick(220);
    }
    pinchStateRef.current = null;
    setIsDragging(false);
    return true;
  }, [suppressNextClick]);

  const handleDoubleTap = useCallback((clientX: number, clientY: number) => {
    const now = window.performance.now();
    const lastTap = lastTapRef.current;
    lastTapRef.current = { time: now, clientX, clientY };

    if (!lastTap || now - lastTap.time > 300 || Math.hypot(clientX - lastTap.clientX, clientY - lastTap.clientY) > 28) {
      return false;
    }

    lastTapRef.current = null;
    const nextZoom = zoom < Math.min(maxZoom, 1.75) ? Math.min(maxZoom, 1.75) : minZoom;
    zoomAtClientPoint(clientX, clientY, nextZoom);
    suppressNextClick(260);
    return true;
  }, [maxZoom, minZoom, suppressNextClick, zoom, zoomAtClientPoint]);

  const finishDrag = useCallback((pointerId: number) => {
    const state = dragStateRef.current;
    if (!state || (pointerId !== -1 && state.pointerId !== pointerId)) return;

    if (state.moved) {
      suppressNextClick();
    }

    try {
      if (state.usesPointerCapture && state.pointerId >= 0 && state.captureTarget.hasPointerCapture(state.pointerId)) {
        state.captureTarget.releasePointerCapture(state.pointerId);
      }
    } catch {
      // Pointer capture may already be released by the browser.
    }
    dragStateRef.current = null;
    setIsDragging(false);
  }, [suppressNextClick]);

  const updateDragPan = useCallback((clientX: number, clientY: number, pointerId: number, preventDefault: () => void) => {
    const state = dragStateRef.current;
    if (!state || (pointerId !== -1 && state.pointerId !== pointerId)) return;

    const deltaX = clientX - state.startClientX;
    const deltaY = clientY - state.startClientY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      state.moved = true;
    }
    if (!state.moved) return;

    preventDefault();
    const viewport = state.viewport.width > 0 && state.viewport.height > 0
      ? state.viewport
      : readViewportSize(viewportRef.current);

    onPanChange(clampPan({
      x: state.startPan.x + deltaX,
      y: state.startPan.y + deltaY,
    }, zoom, viewport));
  }, [onPanChange, zoom]);

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      if (activePointersRef.current.has(event.pointerId)) {
        activePointersRef.current.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY,
          pointerType: event.pointerType,
        });
      }
      if (pinchStateRef.current && updatePinchZoom()) {
        event.preventDefault();
        return;
      }
      updateDragPan(event.clientX, event.clientY, event.pointerId, () => event.preventDefault());
    };
    const handleWindowPointerEnd = (event: globalThis.PointerEvent) => {
      activePointersRef.current.delete(event.pointerId);
      if (pinchStateRef.current) {
        finishPinchZoom();
        return;
      }
      finishDrag(event.pointerId);
    };
    const handleWindowMouseMove = (event: globalThis.MouseEvent) => {
      updateDragPan(event.clientX, event.clientY, -1, () => event.preventDefault());
    };
    const handleWindowMouseEnd = () => {
      finishDrag(-1);
    };
    const handleWindowBlur = () => {
      const state = dragStateRef.current;
      if (state) {
        finishDrag(state.pointerId);
      }
      activePointersRef.current.clear();
      finishPinchZoom();
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);
    window.addEventListener('mousemove', handleWindowMouseMove, { passive: false });
    window.addEventListener('mouseup', handleWindowMouseEnd);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseEnd);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [finishDrag, finishPinchZoom, isDragging, updateDragPan, updatePinchZoom]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      activePointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: event.pointerType,
      });
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Window-level listeners still keep touch gestures working.
      }
      if (activePointersRef.current.size >= 2 && beginPinchZoom()) {
        event.preventDefault();
        suppressNextClick(220);
        return;
      }
    }

    if (!canDrag || event.button !== 0) return;

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
      captureTarget: event.currentTarget,
      usesPointerCapture: event.pointerType !== 'mouse',
    };
    if (event.pointerType !== 'mouse') {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Window-level listeners still keep desktop drag working.
      }
    }
    setIsDragging(true);
  }, [beginPinchZoom, canDrag, pan, suppressNextClick, zoom]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: event.pointerType,
      });
    }
    if (pinchStateRef.current && updatePinchZoom()) {
      event.preventDefault();
      return;
    }
    updateDragPan(event.clientX, event.clientY, event.pointerId, () => event.preventDefault());
  }, [updateDragPan, updatePinchZoom]);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const dragMoved = dragStateRef.current?.moved ?? false;
    const wasPinching = Boolean(pinchStateRef.current);
    activePointersRef.current.delete(event.pointerId);

    if (wasPinching) {
      event.preventDefault();
      finishPinchZoom();
      return;
    }

    finishDrag(event.pointerId);
    if (event.pointerType === 'touch' && !dragMoved) {
      handleDoubleTap(event.clientX, event.clientY);
    }
  }, [finishDrag, finishPinchZoom, handleDoubleTap]);

  const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!canDrag || event.button !== 0 || dragStateRef.current) return;

    event.preventDefault();
    const liveViewportSize = readViewportSize(event.currentTarget);
    const startPan = clampPan(pan, zoom, liveViewportSize);
    setViewportSize(liveViewportSize);
    dragStateRef.current = {
      pointerId: -1,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPan,
      viewport: liveViewportSize,
      moved: false,
      captureTarget: event.currentTarget,
      usesPointerCapture: false,
    };
    setIsDragging(true);
  }, [canDrag, pan, zoom]);

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    updateDragPan(event.clientX, event.clientY, -1, () => event.preventDefault());
  }, [updateDragPan]);

  const handleDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nextZoom = zoom < Math.min(maxZoom, 1.75) ? Math.min(maxZoom, 1.75) : minZoom;
    zoomAtClientPoint(event.clientX, event.clientY, nextZoom);
    suppressNextClick(220);
  }, [maxZoom, minZoom, suppressNextClick, zoom, zoomAtClientPoint]);

  const updateZoomFromControls = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom, minZoom, maxZoom);
    onZoom(normalizedZoom);
    if (normalizedZoom === minZoom) {
      onPanChange({ x: 0, y: 0 });
    }
  }, [maxZoom, minZoom, onPanChange, onZoom]);

  if (GOCHEOK_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL' || !seatMapImageUrl || imageFailed) {
    return (
      <div className="relative rounded-xl bg-slate-100 dark:bg-[#050810]">
        <MissingOfficialSeatMap mode={mode} />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-[#050810]">
      <div
        ref={viewportRef}
        data-testid="gocheok-seatmap-viewport"
        data-zoom={zoom.toFixed(2)}
        data-pan-x={effectivePan.x.toFixed(1)}
        data-pan-y={effectivePan.y.toFixed(1)}
        aria-label="고척 좌석도 확대 이동 영역"
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: `${imageWidth} / ${imageHeight}`,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleClick}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          data-testid="gocheok-seatmap-transform-layer"
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
          <svg
            data-testid="gocheok-seatmap-svg"
            viewBox={GOCHEOK_SEATMAP_VIEW_BOX}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-label="고척 스카이돔 좌석도 구역 선택"
            onMouseMove={(event) => {
              if (!showDebug) return;
              const point = clientPointToSvgPoint(event.currentTarget, event.clientX, event.clientY);
              if (!point) return;
              const x = Math.round(point.x);
              const y = Math.round(point.y);
              setDebugPoint({ x, y });
            }}
            onMouseLeave={() => {
              setHover(null);
              if (showDebug) setDebugPoint(null);
            }}
          >
            <defs>
              <filter id="gocheok-hit-glow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {!imageLoaded && !imageFailed && (
              <rect x={0} y={0} width={imageWidth} height={imageHeight} fill="#e5e7eb" />
            )}
            <image
              href={seatMapImageUrl}
              x={0}
              y={0}
              width={imageWidth}
              height={imageHeight}
              preserveAspectRatio="none"
              pointerEvents="none"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              style={{ userSelect: 'none', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.25s ease-in' }}
            />
            {showDebug && (
              <g opacity="0.55" pointerEvents="none">
                {Array.from({ length: Math.floor(imageWidth / 50) + 1 }, (_, index) => index * 50).map((x) => (
                  <line key={`x-${x}`} x1={x} y1={0} x2={x} y2={imageHeight} stroke="#0f172a" strokeWidth="0.8" />
                ))}
                {Array.from({ length: Math.floor(imageHeight / 50) + 1 }, (_, index) => index * 50).map((y) => (
                  <line key={`y-${y}`} x1={0} y1={y} x2={imageWidth} y2={y} stroke="#0f172a" strokeWidth="0.8" />
                ))}
              </g>
            )}
            {GOCHEOK_BLOCKS.map((block) => {
              const cat = GOCHEOK_CATEGORIES[block.category];
              if (!cat) return null;

              const isFiltered =
                (filterCats !== null && !filterCats.includes(block.category)) ||
                (filterSides != null && !filterSides.includes(block.side)) ||
                (filterLevels != null && !filterLevels.includes(block.level));
              const isAnyFilterActive = filterCats !== null || filterSides != null || filterLevels != null;
              const isActive = hover === block.id || selected?.id === block.id;
              const baseColor = mode === 'dark' ? cat.dark : cat.light;
              let fill = baseColor;
              let fillOpacity: number;
              if (isActive && !isFiltered) {
                fillOpacity = 0.34;
              } else if (isAnyFilterActive && !isFiltered) {
                fillOpacity = 0.20;
              } else if (isFiltered) {
                fill = mode === 'dark' ? '#020617' : '#1e293b';
                fillOpacity = 0.42;
              } else {
                fillOpacity = showDebug ? 0.16 : 0.001;
              }
              const stroke = mode === 'dark' ? '#F8FAFC' : '#0F172A';
              const strokeOpacity = isFiltered ? 0 : isActive ? 0.95 : showDebug ? 0.55 : 0;

              return (
                <g key={block.id} data-testid={`gocheok-seat-block-${block.id}`}>
                  <path
                    data-testid="gocheok-seatmap-hit-area"
                    data-block-id={block.id}
                    data-category={block.category}
                    data-label-x={block.imageGeometry.labelX}
                    data-label-y={block.imageGeometry.labelY}
                    role="button"
                    tabIndex={isFiltered ? -1 : 0}
                    aria-label={`${block.name} ${block.block}`}
                    aria-pressed={selected?.id === block.id}
                    d={block.imageGeometry.d}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={isActive ? 3 : showDebug ? 1 : 1.5}
                    filter={isActive ? 'url(#gocheok-hit-glow)' : undefined}
                    vectorEffect="non-scaling-stroke"
                    style={{ cursor: isFiltered ? 'default' : canDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer', transition: 'fill 0.18s, fill-opacity 0.18s, stroke-opacity 0.15s' }}
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
                    onKeyDown={(event) => {
                      if (isFiltered) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelected(selected?.id === block.id ? null : block);
                      }
                    }}
                  />
                  {(isActive || showDebug) && !isFiltered && (
                    <text
                      x={block.imageGeometry.labelX}
                      y={block.imageGeometry.labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={block.imageGeometry.labelFontSize ?? 10}
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
              <text x={16} y={28} fontSize="16" fontWeight="800" fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke">
                {debugPoint.x}, {debugPoint.y}
              </text>
            )}
          </svg>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          data-testid="gocheok-seatmap-zoom-in"
          className={zoomBtnCls}
          onClick={() => updateZoomFromControls(zoom + zoomStep)}
          disabled={zoom >= maxZoom}
          aria-label="고척 좌석도 확대"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button
          type="button"
          data-testid="gocheok-seatmap-zoom-reset"
          className="min-h-5 rounded-md border-0 bg-transparent px-1 py-0.5 text-center text-[9px] font-black text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
          onClick={() => updateZoomFromControls(minZoom)}
          disabled={zoom <= minZoom}
          aria-label="고척 좌석도 원래 크기"
        >
          {zoom.toFixed(1)}x
        </button>
        <button
          type="button"
          data-testid="gocheok-seatmap-zoom-out"
          className={zoomBtnCls}
          onClick={() => updateZoomFromControls(zoom - zoomStep)}
          disabled={zoom <= minZoom}
          aria-label="고척 좌석도 축소"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
        </button>
        {onFullscreen && (
          <button
            type="button"
            data-testid="gocheok-seatmap-fullscreen-open"
            className={zoomBtnCls}
            onClick={onFullscreen}
            aria-label="고척 좌석도 전체화면"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
