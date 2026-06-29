import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  CHANGWON_BLOCKS,
  CHANGWON_CATEGORIES,
  CHANGWON_OFFICIAL_TRACE_REFERENCE,
  CHANGWON_SEATMAP_IMAGE,
  CHANGWON_SEATMAP_VIEWPORT,
  getChangwonBlockDisplayName,
  isChangwonBlockInCategoryGroup,
  type ChangwonBlock,
  type ChangwonCategoryGroup,
} from '../../data/changwonSeatData';
import officialSeatMapImage from '../../assets/stadiums/nc/changwon-nc-seatmap-official-2026.webp';
import type { SeatMapPan, SeatMapSvgBaseProps } from '../stadiumSeatMap/seatMapCommonTypes';
import {
  clampPan,
  clampZoom,
  panForZoomAtPoint,
  readViewportSize,
  useIsomorphicLayoutEffect,
  getPointerDistance,
  getPointerMidpoint,
  type ViewportSize,
  type ViewportPoint,
  type TrackedPointer,
} from '../stadiumSeatMap/seatMapInteractionUtils';

type Props = SeatMapSvgBaseProps<ChangwonBlock> & {
  filterGroup?: ChangwonCategoryGroup | null;
};

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
      <div className="mb-3 rounded-full bg-white px-3 py-1 text-11 font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        공식 좌석도 준비 중
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        창원 NC 공식 좌석도 이미지를 추가해야 합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-white">
        공식 좌석도 파일이 제공되면 이미지 위에 투명 hit-area를 얹어 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-white">
        <div>필요 파일: {CHANGWON_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {CHANGWON_SEATMAP_IMAGE.imagePath}</div>
        <div>출처: {CHANGWON_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-11 font-semibold text-slate-500 dark:text-white">
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
  filterCats,
  filterSides,
  filterLevels,
  filterGroup,
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
  const canUseSeatMapImage = CHANGWON_SEATMAP_IMAGE.assetStatus !== 'OPERATOR_REFERENCE_PENDING_ASSET'
    && CHANGWON_SEATMAP_IMAGE.assetStatus !== 'EXTERNAL_REFERENCE_PENDING_ASSET';
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
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
  const { imageWidth, imageHeight } = CHANGWON_SEATMAP_IMAGE;
  const { cropY, cropHeight } = CHANGWON_SEATMAP_VIEWPORT;
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('changwonDebug') === '1';
  const debugBlock = showDebug
    ? selected ?? (hover ? CHANGWON_BLOCKS.find((block) => block.id === hover) ?? null : null)
    : null;
  const debugBounds = debugBlock ? getGeometryBounds(debugBlock.imageGeometry.d) : null;
  const debugTextY = cropY + 36;
  const measuredViewportSize = viewportSize.width > 0 && viewportSize.height > 0
    ? viewportSize
    : readViewportSize(viewportRef.current);
  const effectivePan = clampPan(pan, zoom, measuredViewportSize);
  const canDrag = zoom > minZoom;
  const zoomBtnCls = 'pointer-events-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white dark:hover:bg-slate-800';

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
    onZoom(nextZoom);
    onPanChange(panForZoomAtPoint(startPan, zoom, nextZoom, point, nextViewport));
  }, [maxZoom, minZoom, onPanChange, onZoom, pan, zoom]);

  const updateZoomFromControls = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom, minZoom, maxZoom);
    onZoom(normalizedZoom);
    if (normalizedZoom === minZoom) {
      onPanChange({ x: 0, y: 0 });
      return;
    }
    onPanChange(clampPan(pan, normalizedZoom, measuredViewportSize));
  }, [maxZoom, measuredViewportSize, minZoom, onPanChange, onZoom, pan]);

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
    updateZoomAtClientPoint(clientX, clientY, nextZoom);
    suppressNextClick(260);
    return true;
  }, [maxZoom, minZoom, suppressNextClick, zoom, updateZoomAtClientPoint]);

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

  useEffect(() => {
    if (!enableAutoCenter || !selected || !measuredViewportSize.width || !measuredViewportSize.height) return;

    const [labelX, labelY] = [selected.imageGeometry.labelX, selected.imageGeometry.labelY];
    const targetPoint = {
      x: (labelX / imageWidth) * measuredViewportSize.width,
      y: ((labelY - cropY) / cropHeight) * measuredViewportSize.height,
    };
    const centeredPan = clampPan({
      x: (measuredViewportSize.width / 2 - targetPoint.x) * zoom,
      y: (measuredViewportSize.height / 2 - targetPoint.y) * zoom,
    }, zoom, measuredViewportSize);

    onPanChange(centeredPan);
  }, [
    selected?.id,
    enableAutoCenter,
    measuredViewportSize.width,
    measuredViewportSize.height,
    zoom,
    minZoom,
    imageWidth,
    cropY,
    cropHeight,
    onPanChange,
  ]);

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

  const zoomFromDoubleClick = useCallback((clientX: number, clientY: number) => {
    const nextZoom = zoom < Math.min(maxZoom, 1.75) ? Math.min(maxZoom, 1.75) : minZoom;
    updateZoomAtClientPoint(clientX, clientY, nextZoom);
    suppressNextClick(220);
  }, [maxZoom, minZoom, suppressNextClick, updateZoomAtClientPoint, zoom]);

  const handleSvgDoubleClick = useCallback((event: ReactMouseEvent<SVGElement | SVGPathElement>) => {
    event.preventDefault();
    event.stopPropagation();
    zoomFromDoubleClick(event.clientX, event.clientY);
  }, [zoomFromDoubleClick]);

  const handleDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    zoomFromDoubleClick(event.clientX, event.clientY);
  }, [zoomFromDoubleClick]);

  if (!canUseSeatMapImage || !officialSeatMapImage || imageFailed) {
    return (
      <div className="relative rounded-xl bg-slate-100 dark:bg-[#000000]">
        <MissingOfficialSeatMap mode={mode} />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#000000]">
    <div
      ref={viewportRef}
      data-testid="changwon-seatmap-viewport"
      data-zoom={zoom.toFixed(2)}
      data-pan-x={effectivePan.x.toFixed(1)}
      data-pan-y={effectivePan.y.toFixed(1)}
      aria-label="창원 좌석도 확대 이동 영역"
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
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onDoubleClick={handleDoubleClick}
    >
      <div
        data-testid="changwon-seatmap-transform-layer"
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
          viewBox={`0 ${cropY} ${imageWidth} ${cropHeight}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label="창원 NC파크 좌석도 구역 선택"
          onDoubleClick={handleSvgDoubleClick}
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
            href={officialSeatMapImage ?? undefined}
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
            <filter id="changwon-hit-glow">
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
          {CHANGWON_BLOCKS.map((block) => {
            const cat = CHANGWON_CATEGORIES[block.category];
            if (!cat) return null;

            const isFiltered = filterGroup
              ? !isChangwonBlockInCategoryGroup(block, filterGroup)
              : (
                (filterCats !== null && !filterCats.includes(block.category)) ||
                (filterSides != null && !filterSides.includes(block.side)) ||
                (filterLevels != null && !filterLevels.includes(block.level))
              );
            const isAnyFilterActive = filterCats !== null || filterSides != null || filterLevels != null;
            const isSelected = selected?.id === block.id;
            const isActive = hover === block.id || isSelected;
            const baseColor = mode === 'dark' ? cat.dark : cat.light;
            let fill = baseColor;
            let fillOpacity: number;
            if (isActive && !isFiltered) {
              fillOpacity = 0.34;
            } else if (isAnyFilterActive && !isFiltered) {
              fillOpacity = 0.20;
            } else if (isFiltered) {
              fill = mode === 'dark' ? '#000000' : '#1e293b';
              fillOpacity = 0.42;
            } else {
              fillOpacity = showDebug ? 0.16 : 0.001;
            }
            const stroke = mode === 'dark' ? '#F8FAFC' : '#0F172A';
            const strokeOpacity = isFiltered ? 0 : isActive ? 0.95 : showDebug ? 0.62 : 0;
            const traceReference = CHANGWON_OFFICIAL_TRACE_REFERENCE[block.block];
            const expandedHitStrokeWidth = block.imageGeometry.hitStrokeWidth ?? 0;
            const usesExpandedHitArea = expandedHitStrokeWidth > 0;
            const handleSelect = (event: ReactMouseEvent<SVGPathElement>) => {
              if (suppressClickRef.current || event.detail > 1) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              if (!isFiltered) setSelected(selected?.id === block.id ? null : block);
            };
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
                  fill={fill}
                  fillOpacity={usesExpandedHitArea ? 0.001 : fillOpacity}
                  stroke={usesExpandedHitArea ? fill : stroke}
                  strokeOpacity={usesExpandedHitArea ? (isFiltered ? 0 : 0.001) : strokeOpacity}
                  strokeWidth={usesExpandedHitArea ? expandedHitStrokeWidth : isActive ? 4 : showDebug ? 1.5 : 2}
                  filter={!usesExpandedHitArea && isActive ? 'url(#changwon-hit-glow)' : undefined}
                  vectorEffect={usesExpandedHitArea ? undefined : 'non-scaling-stroke'}
                  pointerEvents={isFiltered ? 'none' : usesExpandedHitArea ? undefined : 'fill'}
                  style={{
                    cursor: isFiltered ? 'default' : canDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                    outline: 'none',
                    transition: 'fill 0.18s, fill-opacity 0.18s, stroke-opacity 0.15s',
                  }}
                  onMouseEnter={() => !isFiltered && !isDragging && setHover(block.id)}
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
                    stroke={mode === 'dark' ? '#000000' : '#FFFFFF'}
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
      <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex items-start justify-end px-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200/60 bg-white/90 p-1 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/90">
          <button
            type="button"
            data-testid="changwon-seatmap-zoom-in"
            className={zoomBtnCls}
            onClick={() => updateZoomFromControls(zoom + zoomStep)}
            disabled={zoom >= maxZoom}
            aria-label="창원 좌석도 확대"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <span className="min-w-[3rem] text-center text-xs font-bold tabular-nums text-slate-700 dark:text-white">
            {zoom.toFixed(2)}x
          </span>
          <button
            type="button"
            data-testid="changwon-seatmap-zoom-out"
            className={zoomBtnCls}
            onClick={() => updateZoomFromControls(zoom - zoomStep)}
            disabled={zoom <= minZoom}
            aria-label="창원 좌석도 축소"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
          </button>
          {onFullscreen && (
            <button
              type="button"
              data-testid="changwon-seatmap-fullscreen-open"
              className={zoomBtnCls}
              onClick={onFullscreen}
              aria-label="창원 좌석도 전체화면"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
