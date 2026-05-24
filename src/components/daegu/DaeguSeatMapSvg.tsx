import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ExternalLink, Minus, Plus } from 'lucide-react';
import {
  DAEGU_CATEGORIES,
  DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT,
  DAEGU_SEATMAP_IMAGE,
  DAEGU_SEATMAP_SOURCE_REFERENCES,
  DAEGU_SEATMAP_VIEWPORT,
  getDaeguTraceMethodLabel,
  getDaeguTraceStatusLabel,
  isDaeguNormalSelectableSeat,
  isDaeguReviewOnlySeat,
  type DaeguBlock,
} from '../../data/daeguSeatData';
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

interface DaeguExtraProps {
  blocks: DaeguBlock[];
  focusBlockId: string | null;
  focusRequestId: number;
  imageViewMode?: DaeguSeatMapImageViewMode;
}

export type DaeguSeatMapImageViewMode = 'operatorReference' | 'officialPng';

type Props = SeatMapSvgBaseProps<DaeguBlock> & DaeguExtraProps;

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

  return new URL('../../assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.webp', import.meta.url).href;
}

function resolveOperatorReferenceSeatMapImageUrl() {
  return new URL('../../assets/stadiums/samsung/daegu-operator-reference-rapak-2025-enhanced-transparent.webp', import.meta.url).href;
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
  blocks,
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
  focusBlockId,
  focusRequestId,
  imageViewMode = 'operatorReference',
  enableAutoCenter = true,
  onFullscreen,
}: Props) {
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
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [debugPoint, setDebugPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const operatorReferenceSource = DAEGU_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === 'OPERATOR_REFERENCE_RAPAK_2025');
  const isOperatorReferenceMode = imageViewMode === 'operatorReference';
  const imageWidth = isOperatorReferenceMode ? operatorReferenceSource?.imageWidth ?? 0 : DAEGU_SEATMAP_IMAGE.imageWidth;
  const imageHeight = isOperatorReferenceMode ? operatorReferenceSource?.imageHeight ?? 0 : DAEGU_SEATMAP_IMAGE.imageHeight;
  const viewport = isOperatorReferenceMode ? DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT : DAEGU_SEATMAP_VIEWPORT;
  const seatMapImageUrl = isOperatorReferenceMode ? resolveOperatorReferenceSeatMapImageUrl() : resolveOfficialSeatMapImageUrl();
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
    () => [...blocks].sort((a, b) => blockArea(b) - blockArea(a)),
    [blocks],
  );
  const shouldRenderInteractiveLayers = renderBlocks.length > 0;
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

  useEffect(() => {
    setImageFailed(false);
    setDebugPoint(null);
  }, [imageViewMode]);

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

    const block = renderBlocks.find((candidate) => candidate.id === focusBlockId);
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
    renderBlocks,
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

  const handleDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement | SVGElement | SVGPathElement>) => {
    event.preventDefault();
    event.stopPropagation();
    zoomFromDoubleClick(event.clientX, event.clientY);
  }, [zoomFromDoubleClick]);

  const handleSvgDoubleClick = useCallback((event: ReactMouseEvent<SVGElement | SVGPathElement>) => {
    event.preventDefault();
    event.stopPropagation();
    zoomFromDoubleClick(event.clientX, event.clientY);
  }, [zoomFromDoubleClick]);

  const handleDebugMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!showDebug || !svgRef.current) return;

    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const mapped = pt.matrixTransform(ctm.inverse());
    setDebugPoint({ x: Math.round(mapped.x), y: Math.round(mapped.y) });
  };

  const renderInteractiveBlocks = (blocks: DaeguBlock[], layerKind: 'seat' | 'marker') => blocks.map((block) => {
    const cat = DAEGU_CATEGORIES[block.category];
    if (!cat) return null;

    const isFiltered =
      (filterCats !== null && !filterCats.includes(block.category)) ||
      (filterSides != null && !filterSides.includes(block.side)) ||
      (filterLevels != null && !filterLevels.includes(block.level));
    const isAnyFilterActive = filterCats !== null || filterSides != null || filterLevels != null;
    const isSelected = selected?.id === block.id;
    const isActive = hover === block.id || isSelected;
    const traceStatusLabel = getDaeguTraceStatusLabel(block.traceStatus);
    const traceMethodLabel = getDaeguTraceMethodLabel(block.traceMethod);
    const baseColor = mode === 'dark' ? cat.dark : cat.light;
    const isMarker = layerKind === 'marker';
    let fill = baseColor;
    let fillOpacity: number;
    if (showDebug) {
      fillOpacity = isMarker ? 0.12 : 0.08;
    } else if (isActive && !isFiltered) {
      fillOpacity = 0.34;
    } else if (isAnyFilterActive && !isFiltered) {
      fillOpacity = 0.20;
    } else if (isFiltered) {
      fill = mode === 'dark' ? '#020617' : '#1e293b';
      fillOpacity = 0.42;
    } else {
      fillOpacity = 0.001;
    }
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
            fill={fill}
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
      {onFullscreen && (
        <button
          type="button"
          data-testid="daegu-seatmap-fullscreen-open"
          className={zoomButtonClass}
          onClick={onFullscreen}
          aria-label="대구 좌석도 전체화면"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  if (
    (!isOperatorReferenceMode && DAEGU_SEATMAP_IMAGE.assetStatus !== 'OFFICIAL')
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
          <svg
            ref={svgRef}
            data-testid="daegu-seatmap-svg"
            viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
            data-image-view-mode={imageViewMode}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-label={isOperatorReferenceMode ? '대구 삼성 라이온즈 파크 기존 좌석배치도 구역 선택' : '대구 삼성 라이온즈 파크 공식 이미지 보기'}
            onDoubleClick={handleSvgDoubleClick}
            onMouseMove={handleDebugMouseMove}
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
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              pointerEvents="none"
              style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.25s ease-in' }}
            />
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
              {shouldRenderInteractiveLayers && renderInteractiveBlocks(renderSeatBlocks, 'seat')}
            </g>
            {showDebug && shouldRenderInteractiveLayers && (
              <g data-layer="daegu-review-polygon-layer" pointerEvents="none">
                {renderReviewOnlyBlocks(renderReviewBlocks)}
              </g>
            )}
            <g data-layer="daegu-marker-layer">
              {shouldRenderInteractiveLayers && renderMarkerOnlyBlocks(renderMarkerBlocks)}
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
