import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
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
import lgSeatMapImage from '../../assets/stadiums/lg/jamsil-lg-seatmap-default-2026.webp';
import doosanOverviewImage from '../../assets/stadiums/doosan/jamsil-doosan-stadium-overview.webp';
import doosanFloor1Image from '../../assets/stadiums/doosan/jamsil-doosan-floor-1f.webp';
import doosanFloor2Image from '../../assets/stadiums/doosan/jamsil-doosan-floor-2f.webp';
import doosanFloor25Image from '../../assets/stadiums/doosan/jamsil-doosan-floor-2-5f.webp';
import doosanFloor34Image from '../../assets/stadiums/doosan/jamsil-doosan-floor-3-4f.webp';
import {
  JAMSIL_BLOCKS,
  JAMSIL_CATEGORIES,
  JAMSIL_CATEGORY_GROUPS,
  JAMSIL_DOOSAN_STADIUM_GUIDE,
  JAMSIL_SEATMAP_IMAGE,
  type JamsilBlock,
} from '../../data/jamsilSeatData';

const OFFICIAL_SOURCE_OPTIONS = [
  { id: 'LG', label: 'LG 공식 좌석도' },
  { id: 'DOOSAN', label: '두산 공식 구장 안내' },
] as const;

const DOOSAN_GUIDE_IMAGES = [
  { ...JAMSIL_DOOSAN_STADIUM_GUIDE.overviewImage, src: doosanOverviewImage },
  { ...JAMSIL_DOOSAN_STADIUM_GUIDE.floorImages[0], src: doosanFloor1Image },
  { ...JAMSIL_DOOSAN_STADIUM_GUIDE.floorImages[1], src: doosanFloor2Image },
  { ...JAMSIL_DOOSAN_STADIUM_GUIDE.floorImages[2], src: doosanFloor25Image },
  { ...JAMSIL_DOOSAN_STADIUM_GUIDE.floorImages[3], src: doosanFloor34Image },
];

type OfficialSourceId = typeof OFFICIAL_SOURCE_OPTIONS[number]['id'];
type DoosanGuideTab = 'overview' | 'floors' | 'entrances' | 'transport';
type DoosanGuideImageWithSrc = typeof DOOSAN_GUIDE_IMAGES[number];

interface Props {
  mode: 'light' | 'dark';
  granularity: 'low' | 'medium' | 'high';
  officialSource: OfficialSourceId;
  onOfficialSourceChange: (value: OfficialSourceId) => void;
  selected: JamsilBlock | null;
  setSelected: (b: JamsilBlock | null) => void;
  hover: string | null;
  setHover: (id: string | null) => void;
  filterId: string;
  zoom: number;
  pan: SeatMapPan;
  onPanChange: (pan: SeatMapPan) => void;
  onZoom: (z: number) => void;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  enableAutoCenter?: boolean;
  onFullscreen?: () => void;
}

interface SeatMapPan {
  x: number;
  y: number;
}

function MissingOfficialSeatMap({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="jamsil-official-seatmap-required"
      className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-950"
    >
      <div
        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{
          background: mode === 'dark' ? '#1e293b' : '#e2e8f0',
          color: mode === 'dark' ? '#cbd5e1' : '#475569',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 6h18M3 18h18M5 6v12M19 6v12" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      </div>
      <p className="text-sm font-black text-slate-800 dark:text-white">
        공식 좌석도 이미지가 필요합니다
      </p>
      <p className="mt-2 max-w-md text-xs font-semibold leading-relaxed text-slate-500 dark:text-white">
        구단/예매처 공식 좌석도 파일을 추가한 뒤 블록 좌표를 찍어야 합니다.
      </p>
      <p className="mt-2 text-[11px] font-bold text-slate-400 dark:text-white">
        필요 파일: {JAMSIL_SEATMAP_IMAGE.requiredAssetFileName}
      </p>
    </div>
  );
}

function SourceTabs({
  value,
  onChange,
  mode,
}: {
  value: OfficialSourceId;
  onChange: (value: OfficialSourceId) => void;
  mode: 'light' | 'dark';
}) {
  return (
    <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-white/92 p-1 shadow-sm ring-1 ring-slate-200 backdrop-blur dark:bg-slate-950/88 dark:ring-slate-700">
      {OFFICIAL_SOURCE_OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className="min-h-11 rounded-lg border-0 px-2.5 py-2 text-[11px] font-black transition-colors whitespace-nowrap text-center shrink-0"
            style={{
              background: active ? '#1F5C4A' : 'transparent',
              color: active ? '#ffffff' : (mode === 'dark' ? '#cbd5e1' : '#475569'),
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function OfficialSourceToolbar({
  value,
  onChange,
  mode,
  controls,
}: {
  value: OfficialSourceId;
  onChange: (value: OfficialSourceId) => void;
  mode: 'light' | 'dark';
  controls?: ReactNode;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
      <SourceTabs value={value} onChange={onChange} mode={mode} />
      {controls && <div className="shrink-0">{controls}</div>}
    </div>
  );
}

function DoosanInfoList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[12px] font-semibold leading-relaxed text-slate-600 dark:text-white">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1F5C4A]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DoosanFloorImageDialog({
  image,
  zoom,
  onZoomChange,
  onClose,
}: {
  image: DoosanGuideImageWithSrc;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const updateZoom = (nextZoom: number) => {
    onZoomChange(Math.min(3, Math.max(1, nextZoom)));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${image.label} 확대 보기`}
      data-testid="doosan-floor-image-dialog"
      className="fixed inset-0 z-[120] bg-black/90 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="absolute left-3 right-3 top-3 z-10 flex flex-col gap-2 rounded-xl bg-slate-950/90 p-2 text-white shadow-xl ring-1 ring-white/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0 px-1">
          <div className="truncate text-sm font-black">{image.label}</div>
          <div className="text-[11px] font-semibold text-white/55">두산 베어스 공식 층별 안내</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="층별 안내 이미지 축소"
            onClick={() => updateZoom(zoom - 0.25)}
            disabled={zoom <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-lg font-black text-white transition disabled:cursor-not-allowed disabled:opacity-35 hover:bg-white/15"
          >
            -
          </button>
          <button
            type="button"
            aria-label="층별 안내 이미지 원래 크기"
            onClick={() => updateZoom(1)}
            className="h-9 min-w-14 rounded-lg border border-white/10 bg-white/10 px-2 text-[12px] font-black text-white transition hover:bg-white/15"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="층별 안내 이미지 확대"
            onClick={() => updateZoom(zoom + 0.25)}
            disabled={zoom >= 3}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-lg font-black text-white transition disabled:cursor-not-allowed disabled:opacity-35 hover:bg-white/15"
          >
            +
          </button>
          <button
            type="button"
            aria-label="확대 보기 닫기"
            onClick={onClose}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="h-full overflow-auto rounded-xl px-1 pb-4 pt-24 sm:pt-20"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-full items-start justify-center">
          <img
            src={image.src}
            alt={`두산 베어스 공식 ${image.label}`}
            className="h-auto max-w-none select-none rounded-lg bg-white shadow-2xl"
            style={{ width: `${Math.round(100 * zoom)}%` }}
            width={image.width}
            height={image.height}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}

function DoosanOfficialGuide({ mode }: { mode: 'light' | 'dark' }) {
  const [activeTab, setActiveTab] = useState<DoosanGuideTab>('overview');
  const [expandedFloorImage, setExpandedFloorImage] = useState<DoosanGuideImageWithSrc | null>(null);
  const [expandedFloorImageZoom, setExpandedFloorImageZoom] = useState(1);
  const guide = JAMSIL_DOOSAN_STADIUM_GUIDE;
  const overviewImage = DOOSAN_GUIDE_IMAGES[0];
  const floorImages = DOOSAN_GUIDE_IMAGES.slice(1);
  const guideTabs: { id: DoosanGuideTab; label: string }[] = [
    { id: 'overview', label: '구장 개요' },
    { id: 'floors', label: '층별 안내' },
    { id: 'entrances', label: '출입구' },
    { id: 'transport', label: '교통/주차' },
  ];

  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {guide.sourceLabel}
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              {guide.title}
            </h3>
            <p className="mt-1 max-w-2xl text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-white">
              {guide.summary}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-left dark:bg-emerald-950/30 sm:text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-200">
              총 좌석수
            </div>
            <div className="mt-0.5 text-2xl font-black text-emerald-900 dark:text-emerald-100">
              {guide.totalSeats.toLocaleString()}석
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {guideTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="min-h-11 shrink-0 rounded-lg border-0 px-3 py-2 text-[11px] font-black transition-colors"
                style={{
                  background: active ? '#1F5C4A' : 'transparent',
                  color: active ? '#ffffff' : (mode === 'dark' ? '#cbd5e1' : '#475569'),
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)]">
          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <img
              src={overviewImage.src}
              alt={`두산 베어스 공식 ${overviewImage.label}`}
              className="h-auto w-full select-none object-contain"
              width={overviewImage.width}
              height={overviewImage.height}
              draggable={false}
              loading="lazy"
              decoding="async"
            />
            <figcaption className="border-t border-slate-100 px-3 py-2 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-white">
              {overviewImage.label}
            </figcaption>
          </figure>

          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">좌석수 안내</div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {guide.seatCounts.map((seat) => (
                <div key={seat.label} className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-white">{seat.label}</div>
                  <div className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">{seat.count.toLocaleString()}석</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'floors' && (
        <div className="mt-2 overflow-x-auto pb-1">
          <div className="grid min-w-[560px] gap-2 sm:min-w-0 sm:grid-cols-2">
            {floorImages.map((image) => (
              <figure
                key={image.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              >
                <button
                  type="button"
                  aria-label={`${image.label} 확대 보기`}
                  onClick={() => {
                    setExpandedFloorImage(image);
                    setExpandedFloorImageZoom(1);
                  }}
                  className="group relative block w-full cursor-zoom-in border-0 bg-transparent p-0"
                >
                  <img
                    src={image.src}
                    alt={`두산 베어스 공식 ${image.label}`}
                    className="h-auto w-full select-none object-contain"
                    width={image.width}
                    height={image.height}
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute right-2 top-2 rounded-lg bg-slate-950/78 px-2.5 py-1.5 text-[11px] font-black text-white opacity-95 shadow-sm transition group-hover:bg-[#1F5C4A]">
                    확대 보기
                  </span>
                </button>
                <figcaption className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-white">
                  <span>{image.label}</span>
                  <span className="font-black text-[#1F5C4A]">클릭해서 확대</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'entrances' && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">출입문</div>
            <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{guide.entrances.summary}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {guide.entrances.floors.map((floor) => (
                <span key={floor} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {floor}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">관람객 출입구</div>
            <div className="mt-2">
              <DoosanInfoList items={guide.entrances.publicEntrances} />
            </div>
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {guide.entrances.restrictedEntranceNote}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'transport' && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">교통안내</div>
            <div className="mt-2">
              <DoosanInfoList items={[...guide.transport.subway, ...guide.transport.buses]} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">주차안내</div>
            <div className="mt-2">
              <DoosanInfoList items={[...guide.parking.stadium, ...guide.parking.nearby]} />
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        {guide.implementationNote} 블록 선택은 LG 공식 좌석도 기준으로 제공합니다.
        <a
          href={guide.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-1 underline decoration-amber-300 underline-offset-2"
        >
          공식 출처
        </a>
      </div>

      {expandedFloorImage && (
        <DoosanFloorImageDialog
          image={expandedFloorImage}
          zoom={expandedFloorImageZoom}
          onZoomChange={setExpandedFloorImageZoom}
          onClose={() => setExpandedFloorImage(null)}
        />
      )}
    </div>
  );
}

export default function JamsilSeatMapSvg({
  mode, granularity,
  officialSource, onOfficialSourceChange,
  selected, setSelected, hover, setHover,
  filterId, zoom, pan, onPanChange, onZoom,
  minZoom, maxZoom, zoomStep,
  enableAutoCenter = true, onFullscreen,
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
  const filterGroup = JAMSIL_CATEGORY_GROUPS.find(g => g.id === filterId);
  const filterCats = filterGroup?.cats ?? null;
  const filterSides = filterGroup?.sides ?? null;
  const filterLevels = filterGroup?.levels ?? null;
  const { imageWidth, imageHeight } = JAMSIL_SEATMAP_IMAGE;
  const seatMapImageUrl = JAMSIL_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' ? lgSeatMapImage : null;
  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('jamsilDebug') === '1';
  const measuredViewportSize = viewportSize.width > 0 && viewportSize.height > 0
    ? viewportSize
    : readViewportSize(viewportRef.current);
  const effectivePan = clampPan(pan, zoom, measuredViewportSize);
  const canDrag = zoom > minZoom;

  const zoomBtnCls = 'pointer-events-auto h-11 w-11 rounded-md bg-transparent border-0 flex items-center justify-center cursor-pointer text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors';
  const sortedBlocks = [...JAMSIL_BLOCKS].sort((a, b) => {
    if (a.category === 'ACCESSIBLE' && b.category !== 'ACCESSIBLE') return -1;
    if (a.category !== 'ACCESSIBLE' && b.category === 'ACCESSIBLE') return 1;
    return 0;
  });

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

  const handleSvgDoubleClick = useCallback((event: ReactMouseEvent<SVGElement>) => {
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
    <div className="absolute right-3 top-3 z-20 flex shrink-0 flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <button
        data-testid="jamsil-seatmap-zoom-in"
        className={zoomBtnCls}
        onClick={() => updateZoomFromControls(zoom + zoomStep)}
        disabled={zoom >= maxZoom}
        aria-label="잠실 좌석도 확대"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <button
        data-testid="jamsil-seatmap-zoom-reset"
        className="pointer-events-auto min-h-11 min-w-11 rounded-md border-0 bg-transparent px-1.5 py-1 text-[10px] font-black text-center text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
        onClick={() => updateZoomFromControls(minZoom)}
        disabled={zoom <= minZoom}
        aria-label="잠실 좌석도 원래 크기"
      >
        {zoom.toFixed(1)}x
      </button>
      <button
        data-testid="jamsil-seatmap-zoom-out"
        className={zoomBtnCls}
        onClick={() => updateZoomFromControls(zoom - zoomStep)}
        disabled={zoom <= minZoom}
        aria-label="잠실 좌석도 축소"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
      </button>
      {onFullscreen && (
        <button
          data-testid="jamsil-seatmap-fullscreen-open"
          className={zoomBtnCls}
          onClick={onFullscreen}
          aria-label="잠실 좌석도 전체화면"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      )}
    </div>
  );

  if (!seatMapImageUrl || imageFailed) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-[#000000]">
        <MissingOfficialSeatMap mode={mode} />
      </div>
    );
  }

  if (officialSource === 'DOOSAN') {
    return (
      <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-[#000000]">
        <OfficialSourceToolbar
          value={officialSource}
          onChange={(value) => {
            setSelected(null);
            setHover(null);
            onOfficialSourceChange(value);
          }}
          mode={mode}
        />
        <DoosanOfficialGuide mode={mode} />
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-[#000000]">
      <OfficialSourceToolbar
        value={officialSource}
        onChange={(value) => {
          if (value === 'DOOSAN') {
            setSelected(null);
            setHover(null);
          }
          onOfficialSourceChange(value);
        }}
        mode={mode}
      />
      <div
        ref={viewportRef}
        data-testid="jamsil-seatmap-viewport"
        data-zoom={zoom.toFixed(2)}
        data-pan-x={effectivePan.x.toFixed(1)}
        data-pan-y={effectivePan.y.toFixed(1)}
        aria-label="잠실 좌석도 확대 이동 영역"
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
            data-testid="jamsil-seatmap-transform-layer"
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
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-label="잠실 좌석도 구역 선택"
            onDoubleClick={handleSvgDoubleClick}
            onMouseMove={(event) => {
              if (!showDebug) return;
              const matrix = event.currentTarget.getScreenCTM()?.inverse();
              if (!matrix) return;
              const pt = event.currentTarget.createSVGPoint();
              pt.x = event.clientX;
              pt.y = event.clientY;
              const mapped = pt.matrixTransform(matrix);
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
              aria-hidden="true"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              pointerEvents="none"
              style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.25s ease-in' }}
            />
            <defs>
              <filter id="jamsil-hit-glow">
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

            {sortedBlocks.map(b => {
              const cat = JAMSIL_CATEGORIES[b.category];
              if (!cat) return null;

              const isFiltered =
                (filterCats !== null && !filterCats.includes(b.category)) ||
                (filterSides != null && !filterSides.includes(b.side)) ||
                (filterLevels != null && !filterLevels.includes(b.level));
              const isActive = hover === b.id || selected?.id === b.id;
              const baseColor = mode === 'dark' ? cat.dark : cat.light;
              const { imageGeometry } = b;
              const isAnyFilterActive = filterCats !== null || filterSides != null || filterLevels != null;
              const showLabel = (isActive && !isFiltered) || (showDebug && granularity === 'high' && zoom >= 1.5 && !isFiltered);

              let fill = baseColor;
              let fillOpacity = 0.001;
              let stroke = mode === 'dark' ? '#F8FAFC' : '#0F172A';
              let strokeOpacity = isActive ? 0.95 : 0;
              let strokeWidth = isActive ? 4 : 2;

              if (isActive) {
                fillOpacity = 0.34;
              } else if (isAnyFilterActive && !isFiltered) {
                // 필터 활성 시: 매칭 블록에 카테고리 색 하이라이트
                fillOpacity = 0.20;
              }

              if (isFiltered) {
                // 비매칭 블록: 어두운 오버레이로 dimming
                fill = mode === 'dark' ? '#000000' : '#1e293b';
                fillOpacity = 0.42;
                strokeOpacity = 0;
              }

              return (
                <g key={b.id}>
                  <path
                    role="button"
                    data-touch-target-audit="shape-hit-area"
                    tabIndex={isFiltered ? -1 : 0}
                    aria-label={`${b.name} ${b.block}`}
                    d={imageGeometry.d}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={strokeWidth}
                    filter={isActive ? 'url(#jamsil-hit-glow)' : undefined}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents={isFiltered ? 'none' : undefined}
                    style={{ cursor: isFiltered ? 'default' : canDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer', transition: 'fill 0.18s, fill-opacity 0.18s, stroke-opacity 0.15s' }}
                    onMouseEnter={() => !isFiltered && !isDragging && setHover(b.id)}
                    onClick={(event) => {
                      if (suppressClickRef.current || event.detail > 1) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }
                      if (!isFiltered) {
                        setSelected(selected?.id === b.id ? null : b);
                      }
                    }}
                    onDoubleClick={handleSvgDoubleClick}
                    onKeyDown={(event) => {
                      if (isFiltered) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelected(selected?.id === b.id ? null : b);
                      }
                    }}
                  />
                  {showLabel && (
                    <text
                      x={imageGeometry.labelX}
                      y={imageGeometry.labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={imageGeometry.labelFontSize ?? 12}
                      fontWeight="800"
                      fill={mode === 'dark' ? '#F8FAFC' : '#0F172A'}
                      stroke={mode === 'dark' ? '#000000' : '#FFFFFF'}
                      strokeWidth="3"
                      paintOrder="stroke"
                      transform={`rotate(${imageGeometry.labelRotate ?? 0} ${imageGeometry.labelX} ${imageGeometry.labelY})`}
                      style={{ pointerEvents: 'none' }}
                    >
                      {imageGeometry.shortLabel}
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
          {zoomControls}
        </div>
      </div>
  );
}
