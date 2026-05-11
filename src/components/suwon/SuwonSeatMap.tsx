import { useCallback, useEffect, useMemo, useState } from 'react';
import SeatViewGallery from '../SeatViewGallery';
import { useTheme } from '../../hooks/useTheme';
import {
  SUWON_BLOCKS,
  SUWON_CATEGORIES,
  SUWON_CATEGORY_GROUPS,
  SUWON_SEATMAP_IMAGE,
  SUWON_TRACE_REVIEW_SUMMARY,
  SuwonBlock,
} from '../../data/suwonSeatData';
import SuwonSeatMapSvg, { type SeatMapPan } from './SuwonSeatMapSvg';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

export default function SuwonSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [selected, setSelected] = useState<SuwonBlock | null>(null);
  const [hovered, setHovered] = useState<SuwonBlock | null>(null);
  const [filterId, setFilterId] = useState('all');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const {
    isMobile,
    isFullscreenOpen,
    openFullscreen,
    closeFullscreen,
  } = useSeatMapTemplateShellState();

  const activeGroup = SUWON_CATEGORY_GROUPS.find((group) => group.id === filterId) ?? SUWON_CATEGORY_GROUPS[0];
  const visibleCats = useMemo(() => (activeGroup.cats ? [...activeGroup.cats] : null), [activeGroup]);
  const detail = selected ?? hovered;

  const traceSummaryText = useMemo(() => {
    if (SUWON_TRACE_REVIEW_SUMMARY.draftApproximate === 0) return '전체 공식 이미지 트레이싱 완료';
    return `재추적 진행 중: ${SUWON_TRACE_REVIEW_SUMMARY.officialImageTraced}/${SUWON_TRACE_REVIEW_SUMMARY.totalBlocks}`;
  }, []);

  useEffect(() => {
    if (zoom <= MIN_ZOOM && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  useEffect(() => {
    if (!visibleCats) return;
    setSelected((current) => (current && !visibleCats.includes(current.category) ? null : current));
    setHovered((current) => (current && !visibleCats.includes(current.category) ? null : current));
  }, [visibleCats]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom);
    setZoom(normalizedZoom);
    if (normalizedZoom === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const renderMapSvg = (enableAutoCenter = true, allowFullscreen = true) => (
    <SuwonSeatMapSvg
      selectedId={selected?.id ?? null}
      hoveredId={hovered?.id ?? null}
      filterCats={visibleCats}
      onSelect={(block) => setSelected((current) => (current?.id === block.id ? null : block))}
      onHover={setHovered}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={handleZoomChange}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomStep={ZOOM_STEP}
      enableAutoCenter={enableAutoCenter}
      onFullscreen={openFullscreen}
    />
  );

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      {SUWON_CATEGORY_GROUPS.map((group) => (
        <button
          key={group.id}
          type="button"
          data-testid={`suwon-filter-${group.id}`}
          aria-pressed={filterId === group.id}
          onClick={() => setFilterId(group.id)}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
            filterId === group.id
              ? 'border-primary bg-primary text-white'
              : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary/50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'
          }`}
        >
          {group.label}
        </button>
      ))}
    </div>
  );

  const mapContent = (
    <div>
      {renderMapSvg(!isFullscreenOpen)}
      <div className="mt-2 px-1 text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
        좌석 배치 기준: {SUWON_SEATMAP_IMAGE.sourceLabel}
        {SUWON_SEATMAP_IMAGE.sourceUrl && (
          <a
            href={SUWON_SEATMAP_IMAGE.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-1 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-600 dark:decoration-neutral-600 dark:hover:text-neutral-300"
          >
            출처
          </a>
        )}
      </div>
    </div>
  );

  const detailPanel = (
    <aside className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {detail ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {SUWON_CATEGORIES[detail.category]?.label ?? detail.category}
            </p>
            <h4 className="mt-1 text-xl font-black text-neutral-900 dark:text-white">
              {detail.name}
            </h4>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {detail.officialBlocks.join(', ')}
            </p>
          </div>

          <div className="rounded-xl bg-neutral-50 p-3 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {detail.traceStatus === 'OFFICIAL_IMAGE_TRACED'
              ? '공식 이미지 기준 polygon 재추적 완료'
              : '공식 이미지 기준 정밀 재추적 대기'}
          </div>

          <SeatViewGallery stadium="SUWON" section={detail.seatViewSections[0] ?? detail.block} compact />
        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          좌석도에서 구역을 선택하면 상세 정보와 시야 사진을 확인할 수 있습니다.
        </div>
      )}
    </aside>
  );

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="수원KT위즈파크"
        subtitle="수원 kt 위즈 파크 공식 좌석도"
        titleAccentColor="#0B57A7"
        isMobile={isMobile}
        isDoosanGuideActive={false}
        filterBar={filterBar}
        mobileFilterBar={<div className="mb-2.5 overflow-x-auto">{filterBar}</div>}
        desktopFilterBar={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {filterBar}
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {traceSummaryText}
            </span>
          </div>
        }
        mapContent={mapContent}
        attribution={null}
        desktopSidePanel={detailPanel}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={(
          <div className="w-full">
            <div className="mx-auto flex h-full w-full max-w-[calc((100vh-120px)*0.943)] items-center justify-center">
              <div className="w-full">
                {renderMapSvg(true, false)}
              </div>
            </div>
          </div>
        )}
        fullscreenDialogTestId="suwon-seatmap-fullscreen"
        fullscreenCloseTestId="suwon-seatmap-fullscreen-close"
        fullscreenTitle="수원KT위즈파크"
        fullscreenSubtitle="kt 공식 좌석도 전체화면"
      />
    </>
  );
}
