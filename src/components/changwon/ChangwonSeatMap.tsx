import { useCallback, useEffect, useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw, Search } from 'lucide-react';
import {
  CHANGWON_BLOCKS,
  CHANGWON_CATEGORIES,
  CHANGWON_CATEGORY_GROUPS,
  CHANGWON_SEATMAP_IMAGE,
  CHANGWON_VIEW_INFO,
  getChangwonBlockDisplayName,
  getChangwonFanRoleLabel,
  getChangwonSideLabel,
  getChangwonSourceLabel,
  isChangwonBlockInCategoryGroup,
  type ChangwonBlock,
} from '../../data/changwonSeatData';
import { useTheme } from '../../hooks/useTheme';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import ChangwonBottomSheet from './ChangwonBottomSheet';
import ChangwonSeatMapSvg from './ChangwonSeatMapSvg';
import ChangwonUploadFlowModal from './ChangwonUploadFlowModal';

const MIN_ZOOM = 0.9;
const MAX_ZOOM = 1.35;
const ZOOM_STEP = 0.1;

function normalizeBlockSearchText(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function FilterBar({ selectedId, onChange, mode }: { selectedId: string; onChange: (value: string) => void; mode: 'light' | 'dark' }) {
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {CHANGWON_CATEGORY_GROUPS.map((group) => {
        const active = group.id === selectedId;
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onChange(group.id)}
            className="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: active ? '#315288' : 'transparent',
              borderColor: active ? '#315288' : (mode === 'dark' ? '#334155' : '#e2e8f0'),
              color: active ? '#fff' : (mode === 'dark' ? '#94a3b8' : '#334155'),
            }}
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  mode,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  mode: 'light' | 'dark';
}) {
  const buttonClass = 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800';
  const borderColor = mode === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="축소"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className={buttonClass}
        style={{ borderColor }}
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="초기화"
        onClick={onReset}
        disabled={zoom === 1}
        className={buttonClass}
        style={{ borderColor }}
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="확대"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM}
        className={buttonClass}
        style={{ borderColor }}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function BlockSearch({
  value,
  mode,
  onChange,
}: {
  value: string;
  mode: 'light' | 'dark';
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block min-w-[190px] sm:w-[240px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        data-testid="changwon-block-search"
        aria-label="창원 좌석 블록 검색"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="블록 검색 (예: 105)"
        className="h-10 w-full rounded-xl border bg-white pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#315288] dark:bg-slate-950 dark:text-slate-100"
        style={{ borderColor: mode === 'dark' ? '#334155' : '#e2e8f0' }}
      />
    </label>
  );
}

function DetailPanel({
  section,
  mode,
  onClose,
  onUpload,
}: {
  section: ChangwonBlock | null;
  mode: 'light' | 'dark';
  onClose: () => void;
  onUpload: () => void;
}) {
  if (!section) {
    return (
      <div className="sticky top-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">구역을 선택하세요</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            공식 좌석도에서 블록을 선택하면 실제 시야 사진을 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  const cat = CHANGWON_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const info = CHANGWON_VIEW_INFO[section.id] ?? CHANGWON_VIEW_INFO.default;

  return (
    <div className="sticky top-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="relative px-5 pb-4 pt-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-slate-100 text-slate-500 dark:bg-slate-800"
        >
          ×
        </button>
        <div className="mb-2 flex flex-wrap gap-2 pr-10">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `${accent}22`, color: accent }}>
            {cat.label} · {section.level}
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            {getChangwonSourceLabel(section.sourceConfidence)}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{getChangwonBlockDisplayName(section)}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{section.seatTypes.join(' · ')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">위치</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getChangwonSideLabel(section.side)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">팬 구분</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getChangwonFanRoleLabel(section.fanRole)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">시야 거리</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{info.distance ?? '-'}</div>
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">좌석 타입</div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {section.seatTypes.map((seatType) => (
            <span key={seatType} className="rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}>
              {seatType}
            </span>
          ))}
        </div>
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">공식 블록</div>
        <div className="flex flex-wrap gap-1.5">
          {section.officialBlocks.map((block) => (
            <span key={block} className="rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}>
              {block}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">{section.sourceNote}</p>
        {section.accessibilityNote && (
          <p className="mt-2 rounded-xl bg-cyan-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
            {section.accessibilityNote}
          </p>
        )}
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">실제 시야 사진</div>
        <SeatViewGallery stadium="CHANGWON" section={getChangwonBlockDisplayName(section)} sectionAliases={section.seatViewSections} compact />
      </div>
      <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onUpload}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: accent }}
        >
          + 이 구역 시야 사진 올리기
        </button>
      </div>
    </div>
  );
}

export default function ChangwonSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [selected, setSelected] = useState<ChangwonBlock | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filterId, setFilterId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [uploadFor, setUploadFor] = useState<ChangwonBlock | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const filterGroup = CHANGWON_CATEGORY_GROUPS.find((group) => group.id === filterId);
  const activeBlockIds = useMemo(() => {
    if (!filterGroup || filterGroup.id === 'all') {
      return null;
    }

    return new Set(
      CHANGWON_BLOCKS
        .filter((block) => isChangwonBlockInCategoryGroup(block, filterGroup))
        .map((block) => block.id),
    );
  }, [filterGroup]);
  const hasOfficialBlocks = CHANGWON_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' && CHANGWON_BLOCKS.length > 0;
  const hoveredSection = hover ? (CHANGWON_BLOCKS.find((block) => block.id === hover) ?? null) : null;
  const hoveredCategory = hoveredSection ? CHANGWON_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#315288';
  const usedCategories = useMemo(() => [...new Set(CHANGWON_BLOCKS.map((block) => block.category))], []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 960);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (selected && activeBlockIds && !activeBlockIds.has(selected.id)) {
      setSelected(null);
    }
  }, [activeBlockIds, selected]);

  useEffect(() => {
    if (hover && activeBlockIds && !activeBlockIds.has(hover)) {
      setHover(null);
    }
  }, [activeBlockIds, hover]);

  const handleZoomIn = useCallback(() => {
    setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    const normalizedBlock = normalizeBlockSearchText(value);
    const matchedBlock = CHANGWON_BLOCKS.find((block) => block.block === normalizedBlock);

    if (matchedBlock) {
      setFilterId('all');
      setHover(null);
      setSelected(matchedBlock);
    }
  }, []);

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    setToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
    setTimeout(() => setToast(null), 2800);
  }, [uploadFor]);

  const mapSvg = (
    <ChangwonSeatMapSvg
      mode={mode}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      activeBlockIds={activeBlockIds}
      zoom={zoom}
    />
  );

  const attribution = (
    <div className="mt-2 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
      좌석 배치 기준: {CHANGWON_SEATMAP_IMAGE.sourceLabel}
      {CHANGWON_SEATMAP_IMAGE.sourceUrl && (
        <a
          href={CHANGWON_SEATMAP_IMAGE.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
        >
          출처
        </a>
      )}
      {CHANGWON_SEATMAP_IMAGE.assetStatus === 'MANUAL_BASEBALL_DATA_REQUIRED' && (
        <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">
          MANUAL_BASEBALL_DATA_REQUIRED
        </span>
      )}
    </div>
  );

  const legend = (
    <div className="mt-2.5 flex flex-wrap gap-1.5 px-1">
      {usedCategories.map((category) => {
        const cat = CHANGWON_CATEGORIES[category];
        if (!cat) return null;
        const color = mode === 'dark' ? cat.dark : cat.light;
        return (
          <span key={category} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
            {cat.label}
          </span>
        );
      })}
    </div>
  );

  return (
    <>
      <div className={isMobile && hasOfficialBlocks ? 'pb-80' : undefined}>
        {hasOfficialBlocks && (
          <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 overflow-x-auto">
              <FilterBar selectedId={filterId} onChange={setFilterId} mode={mode} />
            </div>
            <BlockSearch value={searchTerm} mode={mode} onChange={handleSearchChange} />
          </div>
        )}
        <div
          data-testid="stadium-seat-map"
          className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-3.5"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="text-sm font-black text-slate-800 dark:text-white">
              창원NC파크
              <span className="ml-2 text-[11px] font-semibold" style={{ color: '#315288' }}>
                창원 NC 공식 좌석도
              </span>
            </div>
            {hasOfficialBlocks && (
              <ZoomControls
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleResetZoom}
                mode={mode}
              />
            )}
          </div>
          <div className="relative">
            {mapSvg}
            <SeatMapHoverPreview
              visible={Boolean(hoveredSection && hoveredCategory)}
              title={hoveredSection ? getChangwonBlockDisplayName(hoveredSection) : undefined}
              subtitle={hoveredSection?.seatTypes.join(' · ')}
              badgeLabel={hoveredCategory?.label}
              accentColor={hoveredAccent}
              description={hoveredSection ? `${getChangwonSideLabel(hoveredSection.side)} · ${getChangwonFanRoleLabel(hoveredSection.fanRole)}` : undefined}
            />
          </div>
          {attribution}
          {hasOfficialBlocks && legend}
        </div>
        {!isMobile && hasOfficialBlocks && (
          <div className="mt-4">
            <DetailPanel
              section={selected}
              mode={mode}
              onClose={() => setSelected(null)}
              onUpload={() => selected && setUploadFor(selected)}
            />
          </div>
        )}
        {isMobile && hasOfficialBlocks && (
          <ChangwonBottomSheet
            section={selected}
            mode={mode}
            onClose={() => setSelected(null)}
            onUpload={() => selected && setUploadFor(selected)}
          />
        )}
      </div>
      {uploadFor && (
        <ChangwonUploadFlowModal
          section={uploadFor}
          mode={mode}
          onClose={() => setUploadFor(null)}
          onSubmit={handleUploadSubmit}
        />
      )}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-bold shadow-xl"
          style={{ background: mode === 'dark' ? '#f8fafc' : '#0f172a', color: mode === 'dark' ? '#0f172a' : '#f8fafc' }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
