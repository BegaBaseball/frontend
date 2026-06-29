import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  INCHEON_BLOCKS,
  INCHEON_CATEGORIES,
  INCHEON_SEATMAP_IMAGE,
  INCHEON_SEATMAP_VIEWPORT,
  type IncheonBlock,
} from '../../data/incheonSeatData';
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

const officialSeatMapImage = new URL('../../assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp', import.meta.url).href;
type GestureMode = 'idle' | 'drag' | 'pinch';
const EMPTY_COMPARISON_IDS: readonly string[] = [];

interface IncheonSeatMapSvgProps extends SeatMapSvgBaseProps<IncheonBlock> {
  comparisonIds?: readonly string[];
}

function MissingOfficialSeatMap({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="incheon-official-seatmap-required"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-10 text-center dark:border-amber-700 dark:bg-amber-950/25"
    >
      <div className="mb-3 rounded-full bg-white px-3 py-1 text-11 font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        공식 좌석도 준비 중
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        인천 SSG 공식 좌석도 이미지를 추가해야 합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-white">
        공식 좌석도 파일이 제공되면 이미지 위에 투명 hit-area를 얹어 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-white">
        <div>필요 파일: {INCHEON_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {INCHEON_SEATMAP_IMAGE.imagePath}</div>
        <div>출처: {INCHEON_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-11 font-semibold text-slate-500 dark:text-white">
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
  filterSides,
  filterLevels,
  zoom,
  pan,
  onPanChange,
  onZoom,
  minZoom,
  maxZoom,
  zoomStep: _zoomStep,
  enableAutoCenter = true,
  comparisonIds = EMPTY_COMPARISON_IDS,
}: IncheonSeatMapSvgProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gestureMode, setGestureMode] = useState<GestureMode>('idle');
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const suppressClickRef = useRef(false);
  const activePointersRef = useRef<Map<number, TrackedPointer>>(new Map());
  const touchTapStateRef = useRef<Map<number, {
    startClientX: number;
    startClientY: number;
    moved: boolean;
  }>>(new Map());
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
  const canUseSeatMapImage = INCHEON_SEATMAP_IMAGE.assetStatus !== 'OPERATOR_REFERENCE_PENDING_ASSET'
    && INCHEON_SEATMAP_IMAGE.assetStatus !== 'EXTERNAL_REFERENCE_PENDING_ASSET';
  const seatMapImageUrl = canUseSeatMapImage ? officialSeatMapImage : null;
  const { cropY, cropHeight } = INCHEON_SEATMAP_VIEWPORT;
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('incheonDebug') === '1';
  const measuredViewportSize = viewportSize.width > 0 && viewportSize.height > 0
    ? viewportSize
    : readViewportSize(viewportRef.current);
  const effectivePan = clampPan(pan, zoom, measuredViewportSize);
  const canDrag = zoom > minZoom;
  const comparisonIdSet = useMemo(() => new Set(comparisonIds), [comparisonIds]);

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
    onZoom(nextZoom);
    onPanChange(panForZoomAtPoint(startPan, zoom, nextZoom, point, viewport));
  }, [maxZoom, minZoom, onPanChange, onZoom, pan, zoom]);

  const getTrackedTouchPointers = useCallback(() => (
    [...activePointersRef.current.values()].filter((pointer) => pointer.pointerType === 'touch')
  ), []);

  const updateTouchTapMove = useCallback((pointerId: number, clientX: number, clientY: number) => {
    const state = touchTapStateRef.current.get(pointerId);
    if (!state) return;

    if (Math.hypot(clientX - state.startClientX, clientY - state.startClientY) > 6) {
      state.moved = true;
    }
  }, []);

  const finishTouchTap = useCallback((pointerId: number) => {
    const state = touchTapStateRef.current.get(pointerId);
    touchTapStateRef.current.delete(pointerId);
    return state?.moved ?? false;
  }, []);

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
    setGestureMode('pinch');
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
    setGestureMode('idle');
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
    setGestureMode('idle');
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
        if (event.pointerType === 'touch') {
          updateTouchTapMove(event.pointerId, event.clientX, event.clientY);
        }
      }
      if (pinchStateRef.current && updatePinchZoom()) {
        event.preventDefault();
        return;
      }
      updateDragPan(event.clientX, event.clientY, event.pointerId, () => event.preventDefault());
    };
    const handleWindowPointerEnd = (event: globalThis.PointerEvent) => {
      const touchMoved = event.pointerType === 'touch' ? finishTouchTap(event.pointerId) : false;
      activePointersRef.current.delete(event.pointerId);
      if (pinchStateRef.current) {
        finishPinchZoom();
        return;
      }
      if (touchMoved) {
        suppressNextClick(220);
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
      touchTapStateRef.current.clear();
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
  }, [finishDrag, finishPinchZoom, finishTouchTap, isDragging, suppressNextClick, updateDragPan, updatePinchZoom, updateTouchTapMove]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      activePointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: event.pointerType,
      });
      touchTapStateRef.current.set(event.pointerId, {
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
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
    setGestureMode('drag');
  }, [beginPinchZoom, canDrag, pan, suppressNextClick, zoom]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: event.pointerType,
      });
      if (event.pointerType === 'touch') {
        updateTouchTapMove(event.pointerId, event.clientX, event.clientY);
      }
    }
    if (pinchStateRef.current && updatePinchZoom()) {
      event.preventDefault();
      return;
    }
    updateDragPan(event.clientX, event.clientY, event.pointerId, () => event.preventDefault());
  }, [updateDragPan, updatePinchZoom, updateTouchTapMove]);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const dragMoved = dragStateRef.current?.moved ?? false;
    const wasPinching = Boolean(pinchStateRef.current);
    const touchMoved = event.pointerType === 'touch' ? finishTouchTap(event.pointerId) : false;
    activePointersRef.current.delete(event.pointerId);

    if (wasPinching) {
      event.preventDefault();
      finishPinchZoom();
      return;
    }

    finishDrag(event.pointerId);
    if (touchMoved) {
      suppressNextClick(220);
      return;
    }
    if (event.pointerType === 'touch' && !dragMoved) {
      handleDoubleTap(event.clientX, event.clientY);
    }
  }, [finishDrag, finishPinchZoom, finishTouchTap, handleDoubleTap, suppressNextClick]);

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
    setGestureMode('drag');
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

  if (!seatMapImageUrl || imageFailed) {
    return (
      <div className="relative rounded-xl bg-slate-100 dark:bg-[#000000]">
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
      data-gesture-mode={gestureMode}
      aria-label="인천 SSG 좌석도 확대 이동 영역"
      className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#000000]"
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
        data-gesture-mode={gestureMode}
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
          viewBox={`0 ${cropY} ${imageWidth} ${cropHeight}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label="인천 SSG 랜더스필드 좌석도 구역 선택"
          onMouseMove={(event) => {
            if (!showDebug || !svgRef.current) return;
            const ctm = svgRef.current.getScreenCTM();
            if (!ctm) return;
            const pt = svgRef.current.createSVGPoint();
            pt.x = event.clientX;
            pt.y = event.clientY;
            const mapped = pt.matrixTransform(ctm.inverse());
            setDebugPoint({ x: Math.round(mapped.x), y: Math.round(mapped.y) });
          }}
          onMouseLeave={() => {
            setHover(null);
            if (showDebug) setDebugPoint(null);
          }}
        >
          {!imageLoaded && !imageFailed && (
            <rect x={0} y={0} width={imageWidth} height={imageHeight} fill="#e5e7eb" />
          )}
          <image
            href={seatMapImageUrl ?? undefined}
            x={0}
            y={0}
            width={imageWidth}
            height={imageHeight}
            preserveAspectRatio="none"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            pointerEvents="none"
            style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.25s ease-in' }}
          />
          <defs>
            <filter id="incheon-hit-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {showDebug && (
            <g opacity="0.55" pointerEvents="none">
              {Array.from({ length: Math.floor(imageWidth / 100) + 1 }, (_, index) => index * 100).map((x) => (
                <line key={`x-${x}`} x1={x} y1={cropY} x2={x} y2={cropY + cropHeight} stroke="#0f172a" strokeWidth="1" />
              ))}
              {Array.from({ length: Math.floor(cropHeight / 100) + 1 }, (_, index) => cropY + index * 100).map((y) => (
                <line key={`y-${y}`} x1={0} y1={y} x2={imageWidth} y2={y} stroke="#0f172a" strokeWidth="1" />
              ))}
            </g>
          )}
          {INCHEON_BLOCKS.map((block) => {
            const cat = INCHEON_CATEGORIES[block.category];
            if (!cat) return null;

            const isFiltered =
              (filterCats !== null && !filterCats.includes(block.category)) ||
              (filterSides != null && !filterSides.includes(block.side)) ||
              (filterLevels != null && !filterLevels.includes(block.level));
            const isAnyFilterActive = filterCats !== null || filterSides != null || filterLevels != null;
            const isActive = hover === block.id || selected?.id === block.id;
            const isCompared = comparisonIdSet.has(block.id);
            const baseColor = mode === 'dark' ? cat.dark : cat.light;
            let fill = baseColor;
            let fillOpacity: number;
            if (isActive && !isFiltered) {
              fillOpacity = 0.34;
            } else if (isCompared && !isFiltered) {
              fillOpacity = 0.22;
            } else if (isAnyFilterActive && !isFiltered) {
              fillOpacity = 0.20;
            } else if (isFiltered) {
              fill = mode === 'dark' ? '#000000' : '#1e293b';
              fillOpacity = 0.42;
            } else {
              fillOpacity = showDebug ? 0.08 : 0.001;
            }
            const stroke = isCompared && !isActive ? baseColor : mode === 'dark' ? '#F8FAFC' : '#0F172A';
            const strokeOpacity = isFiltered ? 0 : isActive ? 0.95 : isCompared ? 0.72 : showDebug ? 0.38 : 0;

            return (
              <g key={block.id}>
                <path
                  role="button"
                  data-testid={`incheon-seat-block-${block.id}`}
                  data-label-x={block.imageGeometry.labelX}
                  data-label-y={block.imageGeometry.labelY}
                  data-compared={isCompared ? 'true' : undefined}
                  tabIndex={isFiltered ? -1 : 0}
                  aria-label={`${block.name} ${block.block}`}
                  aria-pressed={isActive}
                  d={block.imageGeometry.d}
                  fill={fill}
                  fillOpacity={fillOpacity}
                  stroke={stroke}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={isActive ? 4 : isCompared ? 3 : 2}
                  filter={isActive ? 'url(#incheon-hit-glow)' : undefined}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    cursor: isFiltered ? 'default' : canDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                    outline: 'none',
                    transition: 'fill 0.18s, fill-opacity 0.18s, stroke-opacity 0.15s',
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
                    stroke={mode === 'dark' ? '#000000' : '#FFFFFF'}
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
              <text x={16} y={cropY + 28} fontSize="18" fontWeight="800" fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke">
                {debugPoint.x}, {debugPoint.y}
              </text>
              <text x={16} y={cropY + 54} fontSize="18" fontWeight="800" fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke">
                zoom {zoom.toFixed(2)} · pan {Math.round(effectivePan.x)}, {Math.round(effectivePan.y)}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
