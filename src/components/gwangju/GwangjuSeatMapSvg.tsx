import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  GWANGJU_BLOCKS,
  GWANGJU_AWAY_CHEERING_BLOCK_IDS,
  GWANGJU_CATEGORIES,
  GWANGJU_NON_SELECTABLE_MARKER_ZONES,
  GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS,
  GWANGJU_SELECTABLE_BLOCKS_READY,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_SEATMAP_VIEWPORT,
  matchesGwangjuFilter,
  type GwangjuBlock,
  type GwangjuFanRole,
} from '../../data/gwangjuSeatData';
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

interface GwangjuExtraProps {
  filterFanRoles: GwangjuFanRole[] | null;
  activeFilterId: string;
}

type Props = SeatMapSvgBaseProps<GwangjuBlock> & GwangjuExtraProps;

const SMALL_VISUAL_HIT_AREA_IDS = new Set([
  'k5-101',
  'k5-102',
  'k5-103',
  'k5-104',
  'k5-105',
  'k5-106',
  'k7-107',
  'k7-108',
  'k9-116',
  'k9-117',
  'k7-118',
  'k7-119',
  'k7-120',
  'k7-121',
  'k7-122',
  'k8-123',
  'k5-124',
  'k5-125',
  'k5-126',
  'k5-127',
  'champion-seats',
  'central-table-seats',
  'disabled-seats-center',
  'third-surprise-seats',
  'third-family-seats',
  'third-wheelchair-seats',
  'party-seats-third',
  'skybox-seats',
  'first-family-seats',
  'first-wheelchair-seats',
  'party-seats-first',
]);

const isSmallVisualHitArea = (block: GwangjuBlock) => (
  SMALL_VISUAL_HIT_AREA_IDS.has(block.id) || block.id.startsWith('sky-picnic-s-')
);

const AGGREGATE_FILTER_HIT_AREA_BY_ID = new Map([
  ['home-k7-seats', 'k7'],
  ['away-cheering-seats', 'away-cheering'],
]);

const SOURCE_BLOCK_IDS_HIDDEN_BY_AGGREGATE_FILTER = new Map([
  ['k7', new Set(GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS)],
  ['away-cheering', new Set(GWANGJU_AWAY_CHEERING_BLOCK_IDS)],
]);

function MissingOfficialSeatMap({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="gwangju-official-seatmap-required"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-10 text-center dark:border-amber-700 dark:bg-amber-950/25"
    >
      <div className="mb-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        MANUAL_BASEBALL_DATA_REQUIRED
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        광주-KIA 공식 좌석도 이미지가 필요합니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        공식 좌석도 파일과 블록 좌표가 제공되면 이미지 위에 투명 hit-area를 얹어 블록 단위 선택을 활성화합니다.
      </p>
      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
        <div>필요 파일: {GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}</div>
        <div>저장 위치: {GWANGJU_SEATMAP_IMAGE.imagePath}</div>
        <div>출처: {GWANGJU_SEATMAP_IMAGE.sourceLabel}</div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'dark' ? '다크 모드' : '라이트 모드'}에서도 가짜 좌석도 fallback은 표시하지 않습니다.
      </p>
    </div>
  );
}

function resolveOfficialSeatMapImageUrl() {
  if (GWANGJU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL') {
    return null;
  }

  return new URL('../../assets/stadiums/kia/gwangju-kia-seatmap-official-2026.webp', import.meta.url).href;
}

export default function GwangjuSeatMapSvg({
  mode,
  selected,
  setSelected,
  hover,
  setHover,
  filterCats,
  filterSides,
  filterLevels,
  filterFanRoles,
  activeFilterId,
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
  const { imageWidth, imageHeight } = GWANGJU_SEATMAP_IMAGE;
  const seatMapImageUrl = resolveOfficialSeatMapImageUrl();
  const debugMode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('gwangjuDebug')
    : null;
  const showDebug = debugMode === '1' || debugMode === 'hit';
  const showHitAreaDebug = showDebug;
  const shouldRenderHitAreas = GWANGJU_SELECTABLE_BLOCKS_READY;
  const { cropX, cropWidth } = GWANGJU_SEATMAP_VIEWPORT;
  const croppedImageWidthPercent = (imageWidth / cropWidth) * 100;
  const croppedImageLeftPercent = -(cropX / cropWidth) * 100;
  const zoomBtnCls = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800';
  const measuredViewportSize = viewportSize.width > 0 && viewportSize.height > 0
    ? viewportSize
    : readViewportSize(viewportRef.current);
  const effectivePan = clampPan(pan, zoom, measuredViewportSize);
  const canDrag = zoom > minZoom;
  const updateZoom = useCallback((nextZoom: number) => {
    const clamped = Math.min(maxZoom, Math.max(minZoom, Number(nextZoom.toFixed(2))));
    onZoom(clamped);
    if (clamped <= minZoom) {
      onPanChange({ x: 0, y: 0 });
    }
  }, [maxZoom, minZoom, onPanChange, onZoom]);

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
    if (!enableAutoCenter || !selected || zoom <= minZoom || dragStateRef.current || pinchStateRef.current || measuredViewportSize.width <= 0 || measuredViewportSize.height <= 0) {
      return;
    }

    const labelX = selected.imageGeometry.labelX;
    const labelY = selected.imageGeometry.labelY;
    const { cropX, cropWidth } = GWANGJU_SEATMAP_VIEWPORT;
    const targetPoint = {
      x: ((labelX - cropX) / cropWidth) * measuredViewportSize.width,
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
    measuredViewportSize.height,
    measuredViewportSize.width,
    minZoom,
    onPanChange,
    selected,
    zoom,
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

  const zoomFromDoubleClick = useCallback((clientX: number, clientY: number) => {
    const nextZoom = zoom < Math.min(maxZoom, 1.75) ? Math.min(maxZoom, 1.75) : minZoom;
    updateZoomAtClientPoint(clientX, clientY, nextZoom);
    suppressNextClick(220);
  }, [maxZoom, minZoom, suppressNextClick, updateZoomAtClientPoint, zoom]);

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

  if (
    GWANGJU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL'
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
      data-testid="gwangju-seatmap-viewport"
      data-zoom={zoom.toFixed(2)}
      data-pan-x={effectivePan.x.toFixed(1)}
      data-pan-y={effectivePan.y.toFixed(1)}
      aria-label="광주 좌석도 확대 이동 영역"
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: `${cropWidth} / ${imageHeight}`,
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
        data-testid="gwangju-seatmap-transform-layer"
        className={`absolute inset-0 ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{
          cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
          touchAction: 'none',
          transform: `translate3d(${effectivePan.x}px, ${effectivePan.y}px, 0) scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
      <div
        className="absolute top-0 h-full"
        style={{
          width: `${croppedImageWidthPercent}%`,
          left: `${croppedImageLeftPercent}%`,
        }}
      >
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"
          onDoubleClick={handleSvgDoubleClick}
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
            aria-label="광주-KIA 챔피언스필드 공식 좌석 배치도"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            pointerEvents="none"
            style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.25s ease-in' }}
          />
          <defs>
            <filter id="gwangju-hit-glow">
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
          {(shouldRenderHitAreas || showDebug) && GWANGJU_BLOCKS.map((block) => {
            const cat = GWANGJU_CATEGORIES[block.category];
            if (!cat) return null;

            const aggregateFilterId = AGGREGATE_FILTER_HIT_AREA_BY_ID.get(block.id);
            const isAggregateHitArea = Boolean(aggregateFilterId);
            const isAggregateFilterActive = aggregateFilterId === activeFilterId;
            const hiddenSourceBlockIds = SOURCE_BLOCK_IDS_HIDDEN_BY_AGGREGATE_FILTER.get(activeFilterId);
            const hiddenByAggregateFilter = !isAggregateHitArea && Boolean(hiddenSourceBlockIds?.has(block.id));
            const isFiltered = isAggregateHitArea
              ? !isAggregateFilterActive
              : hiddenByAggregateFilter ||
                !matchesGwangjuFilter(block, filterCats as string[] | null, filterFanRoles) ||
                (filterSides != null && !filterSides.includes(block.side)) ||
                (filterLevels != null && !filterLevels.includes(block.level));
            const isAnyFilterActive = filterCats !== null || filterSides != null || filterLevels != null || filterFanRoles !== null;
            const isInteractive = shouldRenderHitAreas && !isFiltered;
            const isActive = isInteractive && (hover === block.id || selected?.id === block.id);
            const isSmallVisual = isSmallVisualHitArea(block);
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
              fillOpacity = showHitAreaDebug ? 0.08 : 0.001;
            }
            const stroke = mode === 'dark' ? '#F8FAFC' : '#0F172A';
            const strokeOpacity = isFiltered ? 0 : isActive ? 0.82 : showHitAreaDebug ? 0.3 : 0;
            const strokeWidth = isActive ? (isSmallVisual ? 0.75 : 1.5) : 1;
            const showLabel = isActive && !isFiltered;
            const visualPathD = block.imageGeometry.visualD ?? block.imageGeometry.d;

            return (
              <g key={block.id}>
                <path
                  data-testid={`gwangju-seat-visual-${block.id}`}
                  aria-hidden="true"
                  d={visualPathD}
                  fill={fill}
                  fillOpacity={fillOpacity}
                  stroke={stroke}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={strokeWidth}
                  filter={isActive && !isSmallVisual ? 'url(#gwangju-hit-glow)' : undefined}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                  style={{ transition: 'fill-opacity 0.15s, stroke-opacity 0.15s' }}
                />
                <path
                  role={isInteractive ? 'button' : undefined}
                  data-testid={`gwangju-seat-block-${block.id}`}
                  data-label-x={block.imageGeometry.labelX}
                  data-label-y={block.imageGeometry.labelY}
                  data-visual-path={visualPathD}
                  data-trace-status={block.imageGeometry.traceStatus}
                  data-pixel-alignment-status={block.imageGeometry.pixelAlignmentStatus}
                  tabIndex={isInteractive ? 0 : -1}
                  aria-label={`${block.name} ${block.block}`}
                  aria-pressed={isInteractive ? selected?.id === block.id : undefined}
                  d={block.imageGeometry.d}
                  fill="#000000"
                  fillOpacity={0.001}
                  stroke="transparent"
                  strokeOpacity={0}
                  strokeWidth={0}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents={isInteractive ? 'all' : 'none'}
                  style={{ cursor: isInteractive ? 'pointer' : 'default' }}
                  onMouseEnter={() => isInteractive && !isDragging && setHover(block.id)}
                  onClick={(event) => {
                    if (!isInteractive) return;
                    if (suppressClickRef.current || event.detail > 1) {
                      event.preventDefault();
                      event.stopPropagation();
                      return;
                    }
                    event.preventDefault();
                    setSelected(selected?.id === block.id ? null : block);
                  }}
                  onDoubleClick={handleSvgDoubleClick}
                  onKeyDown={(event) => {
                    if (!isInteractive) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelected(block);
                    }
                  }}
                />
                {showLabel && (
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
          {(shouldRenderHitAreas || showDebug) && GWANGJU_NON_SELECTABLE_MARKER_ZONES.map((zone) => (
            <circle
              key={zone.id}
              data-testid="gwangju-non-selectable-marker-zone"
              aria-hidden="true"
              cx={zone.cx}
              cy={zone.cy}
              r={zone.r}
              fill={showDebug ? '#DC2626' : '#FFFFFF'}
              fillOpacity={showDebug ? 0.24 : 0.001}
              stroke={showDebug ? '#991B1B' : 'transparent'}
              strokeWidth={showDebug ? 2 : 0}
              pointerEvents={shouldRenderHitAreas ? 'all' : 'none'}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: shouldRenderHitAreas ? 'default' : 'inherit' }}
              onMouseEnter={() => shouldRenderHitAreas && setHover(null)}
              onPointerDown={(event) => {
                if (!shouldRenderHitAreas) return;
                event.preventDefault();
                event.stopPropagation();
                setHover(null);
                setSelected(null);
              }}
              onClick={(event) => {
                if (!shouldRenderHitAreas) return;
                event.preventDefault();
                event.stopPropagation();
                setHover(null);
                setSelected(null);
              }}
            />
          ))}
          {showDebug && debugPoint && (
            <text x={16} y={28} fontSize="18" fontWeight="800" fill="#0f172a" stroke="#fff" strokeWidth="3" paintOrder="stroke">
              {debugPoint.x}, {debugPoint.y}
            </text>
          )}
          </svg>
      </div>
      </div>
      <div
        className="absolute right-3 top-3 z-20 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/95"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          data-testid="gwangju-seatmap-zoom-in"
          className={zoomBtnCls}
          onClick={() => updateZoom(zoom + zoomStep)}
          disabled={zoom >= maxZoom}
          aria-label="확대"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button
          type="button"
          data-testid="gwangju-seatmap-zoom-reset"
          className="min-h-5 rounded-md border-0 bg-transparent px-1 py-0.5 text-center text-[9px] font-black text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
          onClick={() => updateZoom(minZoom)}
          disabled={zoom <= minZoom}
          aria-label="원래 크기"
        >
          {zoom.toFixed(1)}x
        </button>
        <button
          type="button"
          data-testid="gwangju-seatmap-zoom-out"
          className={zoomBtnCls}
          onClick={() => updateZoom(zoom - zoomStep)}
          disabled={zoom <= minZoom}
          aria-label="축소"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
        </button>
        {onFullscreen && (
          <button
            type="button"
            data-testid="gwangju-seatmap-fullscreen-open"
            className={zoomBtnCls}
            onClick={onFullscreen}
            aria-label="전체화면"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
    </div>
  );
}
