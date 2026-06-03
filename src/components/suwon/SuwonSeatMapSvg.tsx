import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import seatMapImageUrl from '../../assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.webp';
import {
  SUWON_BLOCKS,
  SUWON_CATEGORIES,
  SUWON_SEATMAP_IMAGE,
  SUWON_SEATMAP_VIEWPORT,
  type SuwonBlock,
} from '../../data/suwonSeatData';

interface SuwonSeatMapSvgProps {
  selectedId: string | null;
  hoveredId: string | null;
  comparisonIds?: readonly string[];
  filterCats: string[] | null;
  onSelect: (block: SuwonBlock) => void;
  onHover: (block: SuwonBlock | null) => void;
  zoom: number;
  pan: SeatMapPan;
  onPanChange: (pan: SeatMapPan) => void;
  onZoom: (zoom: number) => void;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  enableAutoCenter?: boolean;
  onFullscreen?: () => void;
}

export interface SeatMapPan {
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

interface TrackedPointer {
  clientX: number;
  clientY: number;
  pointerType: string;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const EMPTY_COMPARISON_IDS: readonly string[] = [];

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('suwonDebug') === '1';
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

function clampPan(pan: SeatMapPan, zoom: number, viewport: ViewportSize): SeatMapPan {
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

function clampZoom(value: number, minZoom: number, maxZoom: number) {
  return Math.min(maxZoom, Math.max(minZoom, Number(value.toFixed(2))));
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

function getPointerDistance(first: TrackedPointer, second: TrackedPointer) {
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function getPointerMidpoint(first: TrackedPointer, second: TrackedPointer, node: HTMLDivElement): ViewportPoint {
  const rect = node.getBoundingClientRect();
  return {
    x: ((first.clientX + second.clientX) / 2) - rect.left,
    y: ((first.clientY + second.clientY) / 2) - rect.top,
  };
}

function panForZoomAtPoint(
  currentPan: SeatMapPan,
  currentZoom: number,
  nextZoom: number,
  point: ViewportPoint,
  viewport: ViewportSize,
): SeatMapPan {
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

export default function SuwonSeatMapSvg({
  selectedId,
  hoveredId,
  comparisonIds = EMPTY_COMPARISON_IDS,
  filterCats,
  onSelect,
  onHover,
  zoom,
  pan,
  onPanChange,
  onZoom,
  minZoom,
  maxZoom,
  zoomStep,
  enableAutoCenter = true,
  onFullscreen,
}: SuwonSeatMapSvgProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; blockId: string | null } | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const zoomRef = useRef(zoom);
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

  const showDebug = isDebugEnabled();
  const { imageWidth, imageHeight } = SUWON_SEATMAP_IMAGE;
  const { cropY, cropHeight } = SUWON_SEATMAP_VIEWPORT;
  const measuredViewportSize = viewportSize.width > 0 && viewportSize.height > 0
    ? viewportSize
    : readViewportSize(viewportRef.current);
  const effectivePan = clampPan(pan, zoom, measuredViewportSize);
  const canDrag = zoom > minZoom;
  const selectedBlock = selectedId ? (SUWON_BLOCKS.find((block) => block.id === selectedId) ?? null) : null;
  const zoomBtnCls = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-300 dark:hover:bg-neutral-800';
  const comparisonIdSet = useMemo(() => new Set(comparisonIds), [comparisonIds]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const hitBlocks = useMemo(
    () => [...SUWON_BLOCKS].sort((a, b) => (
      (a.hitPriority - b.hitPriority)
      || (polygonArea(b.hitGeometry.d) - polygonArea(a.hitGeometry.d))
    )),
    [],
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
    if (!enableAutoCenter || !selectedBlock || zoom <= minZoom || dragStateRef.current || pinchStateRef.current || measuredViewportSize.width <= 0 || measuredViewportSize.height <= 0) {
      return;
    }

    const targetPoint = {
      x: (selectedBlock.hitGeometry.labelX / imageWidth) * measuredViewportSize.width,
      y: ((selectedBlock.hitGeometry.labelY - cropY) / cropHeight) * measuredViewportSize.height,
    };
    const centeredPan = clampPan({
      x: (measuredViewportSize.width / 2 - targetPoint.x) * zoom,
      y: (measuredViewportSize.height / 2 - targetPoint.y) * zoom,
    }, zoom, measuredViewportSize);

    onPanChange(centeredPan);
  }, [
    cropHeight,
    cropY,
    enableAutoCenter,
    imageWidth,
    measuredViewportSize.height,
    measuredViewportSize.width,
    minZoom,
    onPanChange,
    selectedBlock,
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
      // Pointer capture can be released by the browser before our window-level listener runs.
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
        // Window-level listeners still keep touch gestures working when pointer capture is unavailable.
      }
      if (activePointersRef.current.size >= 2 && beginPinchZoom()) {
        event.preventDefault();
        suppressNextClick(220);
        return;
      }
    }

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
      captureTarget: event.currentTarget,
      usesPointerCapture: event.pointerType !== 'mouse',
    };
    if (event.pointerType !== 'mouse') {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Window-level listeners still keep desktop drag working when pointer capture is unavailable.
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

  const zoomFromDoubleClick = useCallback((clientX: number, clientY: number) => {
    const nextZoom = zoom < Math.min(maxZoom, 1.75) ? Math.min(maxZoom, 1.75) : minZoom;
    zoomAtClientPoint(clientX, clientY, nextZoom);
    suppressNextClick(220);
  }, [maxZoom, minZoom, suppressNextClick, zoom, zoomAtClientPoint]);

  const handleDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    zoomFromDoubleClick(event.clientX, event.clientY);
  }, [zoomFromDoubleClick]);

  const handleSvgDoubleClick = useCallback((event: ReactMouseEvent<SVGElement | SVGPathElement>) => {
    event.preventDefault();
    event.stopPropagation();
    zoomFromDoubleClick(event.clientX, event.clientY);
  }, [zoomFromDoubleClick]);

  const updateZoomFromControls = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom, minZoom, maxZoom);
    zoomRef.current = normalizedZoom;
    onZoom(normalizedZoom);
    if (normalizedZoom === minZoom) {
      onPanChange({ x: 0, y: 0 });
    }
  }, [maxZoom, minZoom, onPanChange, onZoom]);

  const updateZoomByStep = useCallback((delta: number) => {
    updateZoomFromControls(zoomRef.current + delta);
  }, [updateZoomFromControls]);

  const zoomControls = (
    <div className="absolute right-3 top-3 z-10 flex shrink-0 items-center gap-1 rounded-xl border border-neutral-200 bg-white/95 p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/95">
      <button
        type="button"
        data-testid="suwon-seatmap-zoom-in"
        className={zoomBtnCls}
        onClick={() => updateZoomByStep(zoomStep)}
        disabled={zoom >= maxZoom}
        aria-label="수원 좌석도 확대"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <button
        type="button"
        data-testid="suwon-seatmap-zoom-reset"
        className="min-h-7 min-w-10 rounded-md border-0 bg-transparent px-1.5 py-0.5 text-center text-[10px] font-black text-neutral-500 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-neutral-800"
        onClick={() => updateZoomFromControls(minZoom)}
        disabled={zoom <= minZoom}
        aria-label="수원 좌석도 원래 크기"
      >
        {zoom.toFixed(1)}x
      </button>
      <button
        type="button"
        data-testid="suwon-seatmap-zoom-out"
        className={zoomBtnCls}
        onClick={() => updateZoomByStep(-zoomStep)}
        disabled={zoom <= minZoom}
        aria-label="수원 좌석도 축소"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
      </button>
      {onFullscreen && (
        <button
          type="button"
          data-testid="suwon-seatmap-fullscreen-open"
          className={zoomBtnCls}
          onClick={onFullscreen}
          aria-label="수원 좌석도 전체화면"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      )}
    </div>
  );

  if (imageFailed) {
    return (
      <div
        data-testid="suwon-official-seatmap-required"
        className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
      >
        MANUAL_BASEBALL_DATA_REQUIRED: 수원 kt 위즈 파크 공식 좌석도 asset을 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-black shadow-inner dark:border-neutral-800">
      <div
        ref={viewportRef}
        data-testid="suwon-seatmap-viewport"
        data-zoom={zoom.toFixed(2)}
        data-pan-x={effectivePan.x.toFixed(1)}
        data-pan-y={effectivePan.y.toFixed(1)}
        aria-label="수원 좌석도 확대 이동 영역"
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: `${imageWidth} / ${cropHeight}`,
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
          data-testid="suwon-seatmap-transform-layer"
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
            ref={svgRef}
            data-testid="suwon-seatmap-svg"
            viewBox={`0 ${cropY} ${imageWidth} ${cropHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full"
            aria-label="수원 kt 위즈 파크 좌석도 구역 선택"
            onDoubleClick={handleSvgDoubleClick}
            onMouseMove={(event) => {
              if (!showDebug || !svgRef.current) return;
              const ctm = svgRef.current.getScreenCTM();
              if (!ctm) return;
              const point = svgRef.current.createSVGPoint();
              point.x = event.clientX;
              point.y = event.clientY;
              const mapped = point.matrixTransform(ctm.inverse());
              const element = document.elementFromPoint(event.clientX, event.clientY);
              setCursor({
                x: Math.round(mapped.x),
                y: Math.round(mapped.y),
                blockId: element?.closest('[data-block-id]')?.getAttribute('data-block-id') ?? null,
              });
            }}
            onMouseLeave={() => {
              onHover(null);
              setCursor(null);
            }}
          >
            <g data-layer="seatmap-content">
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
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageFailed(true)}
                style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.25s ease-in' }}
              />

              <g data-layer="image-geometry-overlays" pointerEvents="none">
                {SUWON_BLOCKS.map((block) => {
                  const category = SUWON_CATEGORIES[block.category];
                  const active = block.id === selectedId || block.id === hoveredId;
                  const isCompared = comparisonIdSet.has(block.id);
                  const isFiltered = Boolean(filterCats && !filterCats.includes(block.category));
                  const fillOpacity = isFiltered ? 0 : active ? 0.12 : isCompared ? 0.08 : showDebug ? 0.18 : 0;
                  const stroke = active ? '#facc15' : isCompared ? (category?.dark ?? '#0284c7') : showDebug ? (category?.dark ?? '#0284c7') : 'transparent';
                  const strokeWidth = active ? 4 : isCompared ? 3 : showDebug ? 4 : 0;
                  return (
                    <path
                      key={block.id}
                      data-testid={`suwon-seat-visual-${block.id}`}
                      data-block-id={block.id}
                      data-layer="image-geometry-overlays"
                      d={block.imageGeometry.d}
                      fill={category?.light ?? '#38bdf8'}
                      fillOpacity={fillOpacity}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </g>

              <g data-layer="hit-targets">
                {hitBlocks.map((block) => {
                  const isFiltered = Boolean(filterCats && !filterCats.includes(block.category));
                  const category = SUWON_CATEGORIES[block.category];
                  const isCompared = comparisonIdSet.has(block.id);
                  return (
                    <path
                      key={block.id}
                      data-testid={`suwon-seat-hit-${block.id}`}
                      data-block-id={block.id}
                      data-compared={isCompared ? 'true' : undefined}
                      data-layer="hit-targets"
                      d={block.hitGeometry.d}
                      fill={category?.light ?? '#38bdf8'}
                      fillOpacity={isFiltered ? 0 : showDebug ? 0.08 : isCompared ? 0.006 : 0.001}
                      stroke={showDebug ? '#22d3ee' : isCompared ? (category?.dark ?? '#0B57A7') : 'transparent'}
                      strokeDasharray={showDebug ? '5 4' : isCompared ? '8 6' : undefined}
                      strokeOpacity={showDebug ? 1 : isCompared ? 0.65 : 0}
                      strokeWidth={showDebug ? 5 : isCompared ? 3 : 0}
                      vectorEffect="non-scaling-stroke"
                      pointerEvents={isFiltered ? 'none' : 'fill'}
                      style={{ cursor: isFiltered ? 'default' : 'pointer' }}
                      aria-label={block.name}
                      aria-pressed={selectedId === block.id}
                      role="button"
                      tabIndex={isFiltered ? -1 : 0}
                      onMouseEnter={() => !isDragging && onHover(block)}
                      onFocus={() => onHover(block)}
                      onBlur={() => onHover(null)}
                      onClick={(event) => {
                        if (suppressClickRef.current || event.detail > 1) {
                          event.preventDefault();
                          event.stopPropagation();
                          return;
                        }
                        onSelect(block);
                      }}
                      onDoubleClick={handleSvgDoubleClick}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelect(block);
                        }
                      }}
                    />
                  );
                })}
              </g>
            </g>

            {showDebug && (
              <g data-layer="debug" pointerEvents="none">
                {SUWON_BLOCKS.map((block) => (
                  <text
                    key={block.id}
                    x={block.imageGeometry.labelX}
                    y={block.imageGeometry.labelY}
                    transform={`rotate(${block.imageGeometry.labelRotate ?? 0} ${block.imageGeometry.labelX} ${block.imageGeometry.labelY})`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? '#facc15' : '#fb923c'}
                    fontSize={block.imageGeometry.labelFontSize ?? 54}
                    fontWeight={800}
                    paintOrder="stroke"
                    stroke="#111827"
                    strokeWidth={5}
                  >
                    {block.imageGeometry.shortLabel}
                  </text>
                ))}
                {cursor && (
                  <text
                    x={cursor.x + 18}
                    y={cursor.y - 18}
                    fill="#22d3ee"
                    fontSize={64}
                    fontWeight={800}
                    paintOrder="stroke"
                    stroke="#020617"
                    strokeWidth={8}
                  >
                    {cursor.x},{cursor.y} {cursor.blockId ?? 'none'}
                  </text>
                )}
              </g>
            )}
          </svg>
        </div>
        {zoomControls}
      </div>
    </div>
  );
}
