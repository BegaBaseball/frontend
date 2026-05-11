import { useState, useEffect, useCallback } from 'react';
import {
  JAMSIL_BLOCKS,
  JAMSIL_CATEGORIES,
  JAMSIL_CATEGORY_GROUPS,
  JAMSIL_OFFICIAL_REFERENCES,
  JAMSIL_SEATMAP_IMAGE,
  type JamsilBlock,
} from '../../data/jamsilSeatData';
import JamsilSeatMapSvg from './JamsilSeatMapSvg';
import JamsilSidePanelV2 from './JamsilSidePanelV2';
import JamsilBottomSheet from './JamsilBottomSheet';
import JamsilUploadFlowModal from './JamsilUploadFlowModal';
import { useTheme } from '../../hooks/useTheme';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

interface SeatMapPan {
  x: number;
  y: number;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function FilterBar({ selectedId, onChange, mode }: { selectedId: string; onChange: (v: string) => void; mode: 'light' | 'dark' }) {
  return (
    <div className="flex gap-1.5 flex-wrap py-1">
      {JAMSIL_CATEGORY_GROUPS.map(g => {
        const active = g.id === selectedId;
        return (
          <button
            key={g.id}
            type="button"
            data-testid={`jamsil-filter-${g.id}`}
            aria-pressed={active}
            onClick={() => onChange(g.id)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-all"
            style={{
              background: active ? '#1F5C4A' : 'transparent',
              borderColor: active ? '#1F5C4A' : (mode === 'dark' ? '#334155' : '#e2e8f0'),
              color: active ? '#fff' : (mode === 'dark' ? '#94a3b8' : '#334155'),
            }}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}

export default function JamsilSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';

  const [selected, setSelected] = useState<JamsilBlock | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [filterId, setFilterId] = useState('all');
  const [officialSource, setOfficialSource] = useState<'LG' | 'DOOSAN'>('LG');
  const [uploadFor, setUploadFor] = useState<JamsilBlock | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const {
    isMobile,
    isFullscreenOpen,
    openFullscreen,
    closeFullscreen,
  } = useSeatMapTemplateShellState();

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    setToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
    setTimeout(() => setToast(null), 2800);
  }, [uploadFor]);

  useEffect(() => {
    if (zoom <= MIN_ZOOM && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom);
    setZoom(normalizedZoom);
    if (normalizedZoom === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const handleOfficialSourceChange = useCallback((nextSource: 'LG' | 'DOOSAN') => {
    setOfficialSource(nextSource);
    setSelected(null);
    setHover(null);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    if (nextSource === 'DOOSAN') {
      closeFullscreen();
    }
  }, [closeFullscreen]);

  const usedCategories = [...new Set(JAMSIL_BLOCKS.map(b => b.category))];

  const isDoosanGuideActive = officialSource === 'DOOSAN';
  const displaySection: JamsilBlock | null = isDoosanGuideActive
    ? null
    : selected;
    const hoveredSection = !isDoosanGuideActive && hover ? (JAMSIL_BLOCKS.find(b => b.id === hover) ?? null) : null;
  const hoveredCategory = hoveredSection ? JAMSIL_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#1F5C4A';
  const doosanReference = JAMSIL_OFFICIAL_REFERENCES.find((reference) => reference.id === 'DOOSAN');
  const filterGroup = JAMSIL_CATEGORY_GROUPS.find((group) => group.id === filterId);
  const filterCats = filterGroup?.cats ?? null;

  useEffect(() => {
    if (!selected || filterCats === null || filterCats.includes(selected.category)) {
      return;
    }
    setSelected(null);
  }, [filterCats, selected]);

  useEffect(() => {
    if (!hover) return;
    const hoveredBlock = JAMSIL_BLOCKS.find((block) => block.id === hover);
    if (hoveredBlock && filterCats !== null && !filterCats.includes(hoveredBlock.category)) {
      setHover(null);
    }
  }, [filterCats, hover]);

  const renderMapSvg = (enableAutoCenter = true, allowFullscreen = true) => (
    <JamsilSeatMapSvg
      mode={mode}
      granularity="high"
      officialSource={officialSource}
      onOfficialSourceChange={handleOfficialSourceChange}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      filterId={filterId}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={handleZoomChange}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomStep={ZOOM_STEP}
      enableAutoCenter={enableAutoCenter}
      onFullscreen={allowFullscreen && !isDoosanGuideActive ? openFullscreen : undefined}
    />
  );

  const attribution = (
    <div className="mt-2 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
      {isDoosanGuideActive ? (
        <>
          구장 안내 기준: {doosanReference?.sourceLabel ?? '두산 베어스 공식 자료'}
          {doosanReference?.sourceUrl && (
            <a
              href={doosanReference.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
            >
              출처
            </a>
          )}
        </>
      ) : (
        <>
          좌석 배치 기준: {JAMSIL_SEATMAP_IMAGE.sourceLabel}
          <a
            href={JAMSIL_SEATMAP_IMAGE.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
          >
            출처
          </a>
          <span className="mx-1">·</span>
          보조 참고: {doosanReference?.sourceLabel}
          {doosanReference?.sourceUrl && (
            <a
              href={doosanReference.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
            >
              출처
            </a>
          )}
          {JAMSIL_SEATMAP_IMAGE.assetStatus === 'MANUAL_BASEBALL_DATA_REQUIRED' && (
            <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">
              MANUAL_BASEBALL_DATA_REQUIRED
            </span>
          )}
        </>
      )}
    </div>
  );

  const legend = (
    <div className="flex flex-wrap gap-1.5 mt-2.5 px-1">
      {usedCategories.map(c => {
        const cat = JAMSIL_CATEGORIES[c];
        if (!cat) return null;
        const color = mode === 'dark' ? cat.dark : cat.light;
        return (
          <span key={c} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-full text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
            {cat.label}
          </span>
        );
      })}
    </div>
  );

  const filterBar = (
    <FilterBar selectedId={filterId} onChange={setFilterId} mode={mode} />
  );
  const mapContent = (
    <div className="relative">
      {renderMapSvg(!isFullscreenOpen)}
      <SeatMapHoverPreview
        visible={Boolean(hoveredSection && hoveredCategory)}
        title={hoveredSection?.name}
        subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
        badgeLabel={hoveredCategory?.label}
        accentColor={hoveredAccent}
        description={hoveredSection ? `${hoveredSection.level} · ${hoveredSection.side}` : undefined}
      />
    </div>
  );
  const mobileFilterBar = (
    <div className="mb-2.5 overflow-x-auto">
      {filterBar}
    </div>
  );
  const desktopFilterBar = filterBar;
  const mobileBottomSheet = isDoosanGuideActive ? null : (
    selected && (
      <JamsilBottomSheet
        section={selected}
        mode={mode}
        onClose={() => setSelected(null)}
        onUpload={() => setUploadFor(selected)}
      />
    )
  );
  const desktopSidePanel = isDoosanGuideActive ? null : (
    <JamsilSidePanelV2
      section={displaySection}
      mode={mode}
      onClose={() => setSelected(null)}
      onUpload={() => setUploadFor(displaySection)}
    />
  );

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="서울잠실야구장"
        subtitle={isDoosanGuideActive ? '두산 공식 구장 안내' : '잠실 블록 단위 안내도'}
        titleAccentColor="#1F5C4A"
        isMobile={isMobile}
        isDoosanGuideActive={isDoosanGuideActive}
        filterBar={filterBar}
        mobileFilterBar={mobileFilterBar}
        desktopFilterBar={desktopFilterBar}
        mapContent={mapContent}
        attribution={attribution}
        legend={isDoosanGuideActive ? undefined : legend}
        mobileBottomSheet={mobileBottomSheet}
        mobileHasSidePanel={Boolean(mobileBottomSheet)}
        desktopSidePanel={desktopSidePanel}
        toast={toast}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={<div className="w-full">{renderMapSvg(true, false)}</div>}
        fullscreenTitle="서울잠실야구장"
        fullscreenSubtitle="LG 공식 좌석도 전체화면"
      />

      {uploadFor && (
        <JamsilUploadFlowModal
          section={uploadFor}
          mode={mode}
          onClose={() => setUploadFor(null)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </>
  );
}
