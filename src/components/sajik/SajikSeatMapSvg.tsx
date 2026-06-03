import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import {
  SAJIK_CATEGORIES,
  getSajikTraceStatusLabel,
  type SajikBlock,
} from '../../data/sajikSeatData';
import {
  SAJIK_CANONICAL_ACCESSIBILITY_MARKERS,
  SAJIK_CANONICAL_BLOCKS,
  SAJIK_CANONICAL_BLOCK_BY_SECTION_ID,
  SAJIK_CANONICAL_SEATMAP_IMAGE,
  SAJIK_CANONICAL_SEATMAP_SOURCE_ID,
  SAJIK_CANONICAL_SEATMAP_SUMMARY,
  type SajikCanonicalBlock,
} from '../../data/sajikCanonicalSeatMap';
import type { SeatMapPan, SeatMapSvgBaseProps } from '../stadiumSeatMap/seatMapCommonTypes';
import {
  clampPan,
  clampZoom,
  panForZoomAtPoint,
  readViewportSize,
  getPointerDistance,
  getPointerMidpoint,
  useIsomorphicLayoutEffect,
  type ViewportSize,
  type ViewportPoint,
  type TrackedPointer,
} from '../stadiumSeatMap/seatMapInteractionUtils';

interface SajikExtraProps {
  guideMatchedBlockIds?: readonly string[];
  guideActive?: boolean;
}

type Props = SeatMapSvgBaseProps<SajikCanonicalBlock> & SajikExtraProps;

function getGeometryLabelPoint(geometry: SajikBlock['imageGeometry']): [number, number] {
  return geometry.labelPoint ?? [geometry.labelX, geometry.labelY];
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
        사직 canonical 좌석도 이미지가 필요합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        operator-reference 기준 이미지 파일이 제공되면 canonical polygon 위에서 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
        <div>필요 파일: {SAJIK_CANONICAL_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {SAJIK_CANONICAL_SEATMAP_IMAGE.imagePath}</div>
        <div>참고: {SAJIK_CANONICAL_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'dark' ? '다크 모드' : '라이트 모드'}에서도 가짜 좌석도 fallback은 표시하지 않습니다.
      </p>
    </div>
  );
}

function resolveCanonicalSeatMapImageUrl() {
  const seatMapImageUrls: Record<string, string> = {
    [SAJIK_CANONICAL_SEATMAP_IMAGE.imagePath]: new URL('../../assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp', import.meta.url).href,
  };

  return seatMapImageUrls[SAJIK_CANONICAL_SEATMAP_IMAGE.imagePath] ?? null;
}

export default function SajikSeatMapSvg({
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
  guideMatchedBlockIds = [],
  guideActive = false,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
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
  const { imageWidth, imageHeight } = SAJIK_CANONICAL_SEATMAP_IMAGE;
  const seatMapImageUrl = resolveCanonicalSeatMapImageUrl();
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('sajikDebug') === '1';
  const measuredViewportSize = viewportSize.width > 0 && viewportSize.height > 0
    ? viewportSize
    : readViewportSize(viewportRef.current);
  const effectivePan = clampPan(pan, zoom, measuredViewportSize);
  const canDrag = zoom > minZoom;

  const zoomBtnCls = 'pointer-events-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800';
  const mapSelectableBlocks = [...SAJIK_CANONICAL_BLOCKS]
    .filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE')
    .sort((a, b) => a.displayPriority - b.displayPriority);
  const seatSectionBlocks = mapSelectableBlocks.filter((block) => block.sectionKind === 'SEAT_SECTION');
  const accessibilityMarkerAliasBlocks = mapSelectableBlocks.filter((block) => block.sectionKind === 'ACCESSIBILITY_MARKER');
  const accessibilityMarkerBlocks = SAJIK_CANONICAL_ACCESSIBILITY_MARKERS;
  const guideMatchedBlockIdSet = useMemo(() => new Set(guideMatchedBlockIds), [guideMatchedBlockIds]);

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [SAJIK_CANONICAL_SEATMAP_IMAGE.imagePath]);

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
    if (!enableAutoCenter || !selected || zoom <= minZoom || dragStateRef.current || pinchStateRef.current || measuredViewportSize.width <= 0 || measuredViewportSize.height <= 0) {
      return;
    }

    const [labelX, labelY] = getGeometryLabelPoint(selected.imageGeometry);
    const targetPoint = {
      x: (labelX / imageWidth) * measuredViewportSize.width,
      y: (labelY / imageHeight) * measuredViewportSize.height,
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
    onZoom(normalizedZoom);
    if (normalizedZoom === minZoom) {
      onPanChange({ x: 0, y: 0 });
    }
  }, [maxZoom, minZoom, onPanChange, onZoom]);

  const zoomControls = (
    <div className="pointer-events-none absolute right-3 top-3 z-10 flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/95">
      <button
        type="button"
        data-testid="sajik-seatmap-zoom-in"
        className={zoomBtnCls}
        onClick={() => updateZoomFromControls(zoom + zoomStep)}
        disabled={zoom >= maxZoom}
        aria-label="사직 좌석도 확대"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <button
        type="button"
        data-testid="sajik-seatmap-zoom-reset"
        className="pointer-events-auto min-h-7 min-w-10 rounded-md border-0 bg-transparent px-1.5 py-0.5 text-center text-[10px] font-black text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
        onClick={() => updateZoomFromControls(minZoom)}
        disabled={zoom <= minZoom}
        aria-label="사직 좌석도 원래 크기"
      >
        {zoom.toFixed(1)}x
      </button>
      <button
        type="button"
        data-testid="sajik-seatmap-zoom-out"
        className={zoomBtnCls}
        onClick={() => updateZoomFromControls(zoom - zoomStep)}
        disabled={zoom <= minZoom}
        aria-label="사직 좌석도 축소"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
      </button>
      {onFullscreen && (
        <button
          type="button"
          data-testid="sajik-seatmap-fullscreen-open"
          className={zoomBtnCls}
          onClick={onFullscreen}
          aria-label="사직 좌석도 전체화면"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      )}
    </div>
  );

  if (
    SAJIK_CANONICAL_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL'
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
      data-testid="sajik-seatmap-panel"
      data-source-id={SAJIK_CANONICAL_SEATMAP_SOURCE_ID}
      data-map-version={SAJIK_CANONICAL_SEATMAP_IMAGE.mapVersion}
      data-coordinate-source="operator-reference-1151x1367"
      className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#050810]"
    >
      <div
        ref={viewportRef}
        data-testid="sajik-seatmap-viewport"
        data-zoom={zoom.toFixed(2)}
        data-pan-x={effectivePan.x.toFixed(1)}
        data-pan-y={effectivePan.y.toFixed(1)}
        aria-label="사직 좌석도 확대 이동 영역"
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
          data-testid="sajik-seatmap-transform-layer"
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
            viewBox={SAJIK_CANONICAL_SEATMAP_IMAGE.viewBox}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-label="부산 사직야구장 좌석도 구역 선택"
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
              data-testid="sajik-canonical-seatmap-image"
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
            <g
              data-testid="sajik-seat-section-layer"
              data-layer="seat-sections"
              data-seat-path-count={seatSectionBlocks.length}
            >
              {seatSectionBlocks.map((block) => {
                const cat = SAJIK_CATEGORIES[block.category];
                const visualPath = block.imageGeometry.visualPath;
                const hitPath = block.imageGeometry.hitPath;
                const labelPoint = block.imageGeometry.labelPoint;
                if (!cat || !visualPath || !hitPath || !labelPoint) return null;

                const isFiltered =
                  (filterCats !== null && !filterCats.includes(block.category)) ||
                  (filterSides != null && !filterSides.includes(block.side)) ||
                  (filterLevels != null && !filterLevels.includes(block.level));
                const isAnyFilterActive = filterCats !== null || filterSides != null || filterLevels != null;
                const isActive = hover === block.id || selected?.id === block.id;
                const isGuideMatched = guideActive && guideMatchedBlockIdSet.has(block.id);
                const needsPrecisionReview = block.traceStatus === 'NEEDS_OPERATOR_REVIEW' || block.imageGeometry.pixelAlignmentStatus !== 'PIXEL_ALIGNED';
                let fill = mode === 'dark' ? cat.dark : cat.light;
                const debugStroke = needsPrecisionReview ? '#F97316' : '#22C55E';
                let fillOpacity: number;
                if (isActive && !isFiltered) {
                  fillOpacity = 0.34;
                } else if (isAnyFilterActive && !isFiltered) {
                  fillOpacity = 0.20;
                } else if (isFiltered) {
                  fill = mode === 'dark' ? '#020617' : '#1e293b';
                  fillOpacity = 0.42;
                } else if (isGuideMatched) {
                  fillOpacity = 0.24;
                } else if (showDebug) {
                  fillOpacity = 0.06;
                } else {
                  fillOpacity = 0.001;
                }
                const stroke = showDebug ? debugStroke : mode === 'dark' ? '#F8FAFC' : '#0F172A';
                const strokeOpacity = isFiltered ? 0 : isActive ? 0.95 : isGuideMatched ? 0.72 : showDebug ? 0.58 : 0;
                const traceStatusLabel = getSajikTraceStatusLabel(block.traceStatus);
                const [labelX, labelY] = labelPoint;

                return (
                  <g key={block.id}>
                    <path
                      role="button"
                      data-testid={`sajik-seat-block-${block.id}`}
                      data-label-x={labelX}
                      data-label-y={labelY}
                      data-guide-match={isGuideMatched ? 'true' : undefined}
                      data-trace-method={block.imageGeometry.traceMethod}
                      data-pixel-alignment-status={block.imageGeometry.pixelAlignmentStatus}
                      data-map-interaction-status={block.mapInteractionStatus}
                      data-manual-reviewed={block.imageGeometry.manualReviewed ? 'true' : 'false'}
                      data-geometry-version={block.imageGeometry.geometryVersion}
                      data-section-kind={block.sectionKind}
                      data-marker-type={block.markerType}
                      data-visual-path={visualPath}
                      data-hit-path={hitPath}
                      tabIndex={isFiltered ? -1 : 0}
                      aria-label={`${block.name} ${block.block}`}
                      aria-pressed={isActive}
                      d={hitPath}
                      fill={fill}
                      fillOpacity={fillOpacity}
                      stroke={stroke}
                      strokeOpacity={strokeOpacity}
                      strokeWidth={isActive ? 4 : isGuideMatched ? 3 : 2}
                      filter={isActive ? 'url(#sajik-hit-glow)' : undefined}
                      pointerEvents={isFiltered ? 'none' : 'fill'}
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
                      onDoubleClick={handleSvgDoubleClick}
                      onKeyDown={(event) => {
                        if (isFiltered) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelected(selected?.id === block.id ? null : block);
                        }
                      }}
                    >
                      {showDebug && (
                        <title>
                          {`${block.id} · ${block.name} · ${traceStatusLabel} · ${block.imageGeometry.traceMethod} · ${block.imageGeometry.pixelAlignmentStatus}`}
                        </title>
                      )}
                    </path>
                    {(isActive || isGuideMatched || showDebug) && !isFiltered && (
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={block.imageGeometry.labelFontSize ?? 12}
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
              })}
            </g>
            <g
              data-testid="sajik-accessibility-markers-layer"
              data-layer="accessibility-markers"
              data-marker-count={accessibilityMarkerBlocks.length}
              data-marker-alias-block-count={accessibilityMarkerAliasBlocks.length}
              data-linked-marker-count={accessibilityMarkerBlocks.filter((marker) => marker.enabled).length}
            >
              {accessibilityMarkerBlocks.map((marker) => {
                const block = SAJIK_CANONICAL_BLOCK_BY_SECTION_ID.get(marker.relatedSectionId);
                const isSelectableMarker = Boolean(marker.enabled && block);
                const isActive = Boolean(block && (hover === block.id || selected?.id === block.id));
                const visualRadius = isActive ? 17 : 14;
                const hitRadius = isSelectableMarker ? 26 : visualRadius;
                const markerFillOpacity = isSelectableMarker ? (isActive ? 0.72 : 0.44) : 0.28;
                const markerStrokeOpacity = isSelectableMarker ? 0.96 : 0.88;
                const [markerX, markerY] = marker.position;

                return (
                  <g key={marker.markerId}>
                    <circle
                      role={isSelectableMarker ? 'button' : undefined}
                      tabIndex={isSelectableMarker ? 0 : -1}
                      aria-label={block ? `${block.name} ${block.block} 접근성 marker` : undefined}
                      aria-pressed={isSelectableMarker ? isActive : undefined}
                      data-testid={`sajik-accessibility-marker-${marker.markerId}`}
                      data-marker-id={marker.markerId}
                      data-marker-type={marker.markerType}
                      data-marker-interaction-status={marker.markerInteractionStatus}
                      data-related-section-id={marker.relatedSectionId}
                      data-mapped-block-id={block?.id}
                      data-stage-id={marker.stageId}
                      data-enabled={String(marker.enabled)}
                      data-hit-target-radius={hitRadius}
                      data-visual-radius={visualRadius}
                      cx={markerX}
                      cy={markerY}
                      r={hitRadius}
                      fill={isSelectableMarker ? '#FFFFFF' : '#A3E635'}
                      fillOpacity={isSelectableMarker ? 0.001 : markerFillOpacity}
                      stroke={isSelectableMarker ? 'transparent' : '#111827'}
                      strokeOpacity={isSelectableMarker ? 0 : markerStrokeOpacity}
                      strokeWidth={isSelectableMarker ? 0 : 3}
                      pointerEvents={isSelectableMarker ? 'all' : 'none'}
                      vectorEffect="non-scaling-stroke"
                      style={{
                        cursor: isSelectableMarker ? 'pointer' : 'default',
                        outline: 'none',
                        transition: 'fill-opacity 0.15s, stroke-opacity 0.15s, r 0.15s',
                      }}
                      onMouseEnter={() => {
                        if (block && !isDragging) setHover(block.id);
                      }}
                      onMouseLeave={() => {
                        if (block) setHover(null);
                      }}
                      onClick={(event) => {
                        if (!block || !isSelectableMarker || suppressClickRef.current || event.detail > 1) {
                          event.preventDefault();
                          event.stopPropagation();
                          return;
                        }
                        setSelected(selected?.id === block.id ? null : block);
                      }}
                      onDoubleClick={handleSvgDoubleClick}
                      onKeyDown={(event) => {
                        if (!block || !isSelectableMarker) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelected(selected?.id === block.id ? null : block);
                        }
                      }}
                    />
                    <circle
                      data-testid={`sajik-accessibility-marker-visual-${marker.markerId}`}
                      data-marker-id={marker.markerId}
                      data-related-section-id={marker.relatedSectionId}
                      aria-hidden="true"
                      cx={markerX}
                      cy={markerY}
                      r={visualRadius}
                      fill="#A3E635"
                      fillOpacity={markerFillOpacity}
                      stroke="#041E42"
                      strokeOpacity={markerStrokeOpacity}
                      strokeWidth={isActive ? 4 : 3}
                      pointerEvents="none"
                      vectorEffect="non-scaling-stroke"
                      style={{ transition: 'fill-opacity 0.15s, stroke-opacity 0.15s, r 0.15s' }}
                    />
                  </g>
                );
              })}
            </g>
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
        {zoomControls}
      </div>
      {showDebug && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-slate-900/10 bg-white/90 px-3 py-2 text-[11px] font-bold text-slate-800 shadow-lg dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-100">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Sajik canonical debug</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>blocks {SAJIK_CANONICAL_SEATMAP_SUMMARY.activeBlocks}</span>
            <span className="text-emerald-600 dark:text-emerald-300">sections {SAJIK_CANONICAL_SEATMAP_SUMMARY.activeSeatSections}</span>
            <span className="text-sky-600 dark:text-sky-300">markers {SAJIK_CANONICAL_SEATMAP_SUMMARY.accessibilityMarkers}</span>
            <span className="text-sky-600 dark:text-sky-300">linked {SAJIK_CANONICAL_SEATMAP_SUMMARY.linkedAccessibilityMarkers}</span>
            <span className="text-orange-600 dark:text-orange-300">legacy {SAJIK_CANONICAL_SEATMAP_SUMMARY.legacyAliasOnlyBlocks}</span>
          </div>
          <div className="mt-1 text-slate-500 dark:text-slate-400">single runtime source: operator-reference 1151x1367</div>
        </div>
      )}
    </div>
  );
}
