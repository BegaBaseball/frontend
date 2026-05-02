import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  INCHEON_BLOCKS,
  INCHEON_CATEGORIES,
  INCHEON_SEATMAP_IMAGE,
  INCHEON_SEATMAP_VIEWPORT,
  type IncheonBlock,
} from '../../data/incheonSeatData';
import officialSeatMapImage from '../../assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp';

interface Props {
  mode: 'light' | 'dark';
  selected: IncheonBlock | null;
  setSelected: (block: IncheonBlock | null) => void;
  hover: string | null;
  setHover: (id: string | null) => void;
  filterCats: string[] | null;
  zoom: number;
  pan: SeatMapPan;
  onPanChange: (pan: SeatMapPan) => void;
  onZoomChange: (zoom: number) => void;
  minZoom: number;
  maxZoom: number;
  enableAutoCenter?: boolean;
}

interface SeatMapPan {
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

function MissingOfficialSeatMap({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="incheon-official-seatmap-required"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-10 text-center dark:border-amber-700 dark:bg-amber-950/25"
    >
      <div className="mb-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        MANUAL_BASEBALL_DATA_REQUIRED
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        인천 SSG 공식 좌석도 이미지를 추가해야 합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        공식 좌석도 파일이 제공되면 이미지 위에 투명 hit-area를 얹어 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
        <div>필요 파일: {INCHEON_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {INCHEON_SEATMAP_IMAGE.imagePath}</div>
        <div>출처: {INCHEON_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'dark' ? '다크 모드' : '라이트 모드'}에서도 가짜 좌석도 fallback은 표시하지 않습니다.
      </p>
    </div>
  );
}

export default function IncheonSeatMapSvg({
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
  enableAutoCenter = true,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
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
  const { imageWidth, imageHeight } = INCHEON_SEATMAP_IMAGE;
  const seatMapImageUrl = INCHEON_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' ? officialSeatMapImage : null;
  const { cropY, cropHeight } = INCHEON_SEATMAP_VIEWPORT;
  const croppedImageHeightPercent = (imageHeight / cropHeight) * 100;
  const croppedImageTopPercent = -(cropY / cropHeight) * 100;
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('incheonDebug') === '1';
  const measuredViewportSize = viewportSize.width > 0 && viewportSize.height > 0
    ? viewportSize
    : readViewportSize(viewportRef.current);
  const effectivePan = clampPan(pan, zoom, measuredViewportSize);
  const canDrag = zoom > minZoom;

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
      y: ((selected.imageGeometry.labelY - cropY) / cropHeight) * measuredViewportSize.height,
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
    onZoomChange(nextZoom);
    onPanChange(panForZoomAtPoint(startPan, zoom, nextZoom, point, viewport));
  }, [maxZoom, minZoom, onPanChange, onZoomChange, pan, zoom]);

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
    onZoomChange(nextZoom);
    onPanChange(panForZoomAtPoint(
      pinchState.startPan,
      pinchState.startZoom,
      nextZoom,
      pinchState.midpoint,
      pinchState.viewport,
    ));
    return true;
  }, [getTrackedTouchPointers, maxZoom, minZoom, onPanChange, onZoomChange]);

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
      usesPointerCapture: true,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Window-level listeners still keep desktop drag working when pointer capture is unavailable.
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

  if (INCHEON_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL' || !seatMapImageUrl || imageFailed) {
    return (
      <div className="relative rounded-xl bg-slate-100 dark:bg-[#050810]">
        <MissingOfficialSeatMap mode={mode} />
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      data-testid="incheon-seatmap-viewport"
      data-zoom={zoom.toFixed(2)}
      data-pan-x={effectivePan.x.toFixed(1)}
      data-pan-y={effectivePan.y.toFixed(1)}
      aria-label="인천 SSG 좌석도 확대 이동 영역"
      className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#050810]"
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
        data-testid="incheon-seatmap-transform-layer"
        data-zoom={zoom.toFixed(2)}
        data-pan-x={effectivePan.x.toFixed(1)}
        data-pan-y={effectivePan.y.toFixed(1)}
        className={`absolute left-0 w-full ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{
          height: `${croppedImageHeightPercent}%`,
          top: `${croppedImageTopPercent}%`,
          cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
          touchAction: 'none',
          transform: `translate3d(${effectivePan.x}px, ${effectivePan.y}px, 0) scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <img
          src={seatMapImageUrl}
          alt="인천 SSG 랜더스필드 공식 좌석 배치도"
          className="absolute inset-0 h-full w-full select-none object-contain"
          draggable={false}
          loading="eager"
          decoding="async"
          onError={() => setImageFailed(true)}
          onDragStart={(event) => event.preventDefault()}
        />
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label="인천 SSG 랜더스필드 좌석도 구역 선택"
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
            <filter id="incheon-hit-glow">
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
          {INCHEON_BLOCKS.map((block) => {
            const cat = INCHEON_CATEGORIES[block.category];
            if (!cat) return null;

            const isFiltered = filterCats !== null && !filterCats.includes(block.category);
            const isActive = hover === block.id || selected?.id === block.id;
            const baseColor = mode === 'dark' ? cat.dark : cat.light;
            const fillOpacity = isFiltered ? 0.001 : isActive ? 0.34 : showDebug ? 0.08 : 0.001;
            const stroke = mode === 'dark' ? '#F8FAFC' : '#0F172A';
            const strokeOpacity = isFiltered ? 0 : isActive ? 0.95 : showDebug ? 0.38 : 0;

            return (
              <g key={block.id}>
                <path
                  role="button"
                  tabIndex={isFiltered ? -1 : 0}
                  aria-label={`${block.name} ${block.block}`}
                  d={block.imageGeometry.d}
                  fill={baseColor}
                  fillOpacity={fillOpacity}
                  stroke={stroke}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={isActive ? 4 : 2}
                  filter={isActive ? 'url(#incheon-hit-glow)' : undefined}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: isFiltered ? 'default' : canDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer', transition: 'fill-opacity 0.15s, stroke-opacity 0.15s' }}
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
            <>
              <text x={16} y={28} fontSize="18" fontWeight="800" fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke">
                {debugPoint.x}, {debugPoint.y}
              </text>
              <text x={16} y={54} fontSize="18" fontWeight="800" fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke">
                zoom {zoom.toFixed(2)} · pan {Math.round(effectivePan.x)}, {Math.round(effectivePan.y)}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
