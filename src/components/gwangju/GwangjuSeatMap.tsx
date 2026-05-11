import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GWANGJU_BLOCKS,
  GWANGJU_CATEGORIES,
  GWANGJU_CATEGORY_GROUPS,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
  GWANGJU_SELECTABLE_BLOCKS_READY,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_VIEW_INFO,
  getGwangjuDerivedOperatorRangesForBlock,
  getGwangjuFanRoleLabel,
  getGwangjuSideLabel,
  getGwangjuSourceLabel,
  matchesGwangjuCategoryGroup,
  matchesGwangjuFilter,
  type GwangjuBlock,
  type GwangjuDerivedOperatorBlockRange,
} from '../../data/gwangjuSeatData';
import { useTheme } from '../../hooks/useTheme';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import GwangjuBottomSheet from './GwangjuBottomSheet';
import GwangjuSeatMapSvg from './GwangjuSeatMapSvg';
import GwangjuUploadFlowModal from './GwangjuUploadFlowModal';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';

const DERIVED_RANGE_BY_FILTER_GROUP_ID = new Map(
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.map((range) => [range.filterGroupId, range]),
);

function FilterBar({
  selectedId,
  onChange,
  mode,
  availableGroupIds,
}: {
  selectedId: string;
  onChange: (value: string) => void;
  mode: 'light' | 'dark';
  availableGroupIds: Set<string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {GWANGJU_CATEGORY_GROUPS.map((group) => {
        const active = group.id === selectedId;
        const available = availableGroupIds.has(group.id);
        const derivedRange = DERIVED_RANGE_BY_FILTER_GROUP_ID.get(group.id);
        return (
          <button
            key={group.id}
            type="button"
            data-testid={`gwangju-filter-${group.id}`}
            data-derived-range-id={derivedRange?.id}
            data-derived-block-ids={derivedRange?.blockIds.join(',')}
            data-aggregate-hit-area={derivedRange?.aggregateHitArea}
            aria-pressed={active}
            onClick={() => available && onChange(group.id)}
            disabled={!available}
            aria-disabled={!available}
            className="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: active ? '#EA0029' : 'transparent',
              borderColor: active ? '#EA0029' : (mode === 'dark' ? '#334155' : '#e2e8f0'),
              color: active ? '#fff' : available ? (mode === 'dark' ? '#94a3b8' : '#334155') : (mode === 'dark' ? '#475569' : '#cbd5e1'),
              cursor: available ? 'pointer' : 'not-allowed',
              opacity: available ? 1 : 0.62,
            }}
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}

function DerivedRangeSummary({
  range,
  mode,
}: {
  range: GwangjuDerivedOperatorBlockRange;
  mode: 'light' | 'dark';
}) {
  const borderColor = mode === 'dark' ? '#334155' : '#e2e8f0';
  const textColor = mode === 'dark' ? '#cbd5e1' : '#334155';
  const mutedColor = mode === 'dark' ? '#94a3b8' : '#64748b';

  return (
    <div
      data-testid="gwangju-derived-range-summary"
      data-derived-range-id={range.id}
      data-derived-block-ids={range.blockIds.join(',')}
      data-aggregate-hit-area={range.aggregateHitArea}
      className="flex flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold"
      style={{ borderColor, color: textColor }}
    >
      <span className="text-[#EA0029] dark:text-rose-300">{range.label}</span>
      <span data-testid="gwangju-derived-range-blocks">{range.displayBlocks}</span>
      {range.id === 'derived-k7-seats' && (
        <span
          data-testid="gwangju-derived-range-neutral-note"
          className="rounded-full px-2 py-0.5"
          style={{ background: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mutedColor }}
        >
          111 중립
        </span>
      )}
      <span className="rounded-full px-2 py-0.5" style={{ background: mode === 'dark' ? '#1e293b' : '#f8fafc', color: mutedColor }}>
        기존 번호 블럭
      </span>
    </div>
  );
}

function DerivedRangeBadges({
  ranges,
  mode,
}: {
  ranges: GwangjuDerivedOperatorBlockRange[];
  mode: 'light' | 'dark';
}) {
  if (ranges.length === 0) return null;

  return (
    <>
      {ranges.map((range) => (
        <span
          key={range.id}
          data-testid={`gwangju-section-derived-range-${range.id}`}
          data-derived-range-id={range.id}
          data-derived-blocks={range.displayBlocks}
          className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
          style={{
            background: mode === 'dark' ? '#1e293b' : '#f8fafc',
            borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
            color: mode === 'dark' ? '#cbd5e1' : '#334155',
          }}
        >
          {range.label} {range.displayBlocks}
        </span>
      ))}
    </>
  );
}

function DetailPanel({
  section,
  mode,
  onClose,
  onUpload,
}: {
  section: GwangjuBlock | null;
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

  const cat = GWANGJU_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const info = GWANGJU_VIEW_INFO[section.id] ?? GWANGJU_VIEW_INFO.default;
  const derivedRanges = getGwangjuDerivedOperatorRangesForBlock(section.id);

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
            {getGwangjuSourceLabel(section.sourceConfidence)}
          </span>
          <DerivedRangeBadges ranges={derivedRanges} mode={mode} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{section.name}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">블록 {section.block}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">위치</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getGwangjuSideLabel(section.side)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">팬 구분</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getGwangjuFanRoleLabel(section.fanRole)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">시야 거리</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{info.distance ?? '-'}</div>
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">공식 블록 묶음</div>
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
        <SeatViewGallery stadium="GWANGJU" section={section.name} sectionAliases={section.seatViewSections} compact />
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

export default function GwangjuSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [selected, setSelected] = useState<GwangjuBlock | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filterId, setFilterId] = useState('all');
  const [uploadFor, setUploadFor] = useState<GwangjuBlock | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { isMobile, isFullscreenOpen, closeFullscreen } = useSeatMapTemplateShellState();
  const filterGroup = GWANGJU_CATEGORY_GROUPS.find((group) => group.id === filterId);
  const filterCats = filterGroup?.cats ?? null;
  const filterFanRoles = filterGroup?.fanRoles ?? null;
  const hasSelectableBlocks = GWANGJU_SELECTABLE_BLOCKS_READY;
  const hoveredSection = hover ? (GWANGJU_BLOCKS.find((block) => block.id === hover) ?? null) : null;
  const hoveredCategory = hoveredSection ? GWANGJU_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#EA0029';
  const usedCategories = useMemo(() => [...new Set(GWANGJU_BLOCKS.map((block) => block.category))], []);
  const availableGroupIds = useMemo(() => new Set(
    GWANGJU_CATEGORY_GROUPS
      .filter((group) => GWANGJU_BLOCKS.some((block) => matchesGwangjuCategoryGroup(block, group)))
      .map((group) => group.id),
  ), []);

  useEffect(() => {
    if (!selected || matchesGwangjuFilter(selected, filterCats, filterFanRoles)) {
      return;
    }
    setSelected(null);
  }, [filterCats, filterFanRoles, selected]);

  useEffect(() => {
    if (!hover) return;
    const hoveredBlock = GWANGJU_BLOCKS.find((block) => block.id === hover);
    if (hoveredBlock && !matchesGwangjuFilter(hoveredBlock, filterCats, filterFanRoles)) {
      setHover(null);
    }
  }, [filterCats, filterFanRoles, hover]);

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    setToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
    setTimeout(() => setToast(null), 2800);
  }, [uploadFor]);

  const mapSvg = (
    <GwangjuSeatMapSvg
      mode={mode}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      filterCats={filterCats}
      filterFanRoles={filterFanRoles}
      zoom={zoom}
      onZoom={setZoom}
    />
  );

  const attribution = (
    <div className="mt-2 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
      좌석 배치 기준: {GWANGJU_SEATMAP_IMAGE.sourceLabel}
      {GWANGJU_SEATMAP_IMAGE.sourceUrl && (
        <a
          href={GWANGJU_SEATMAP_IMAGE.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
        >
          출처
        </a>
      )}
      {GWANGJU_SEATMAP_IMAGE.assetStatus === 'MANUAL_BASEBALL_DATA_REQUIRED' && (
        <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">
          MANUAL_BASEBALL_DATA_REQUIRED
        </span>
      )}
    </div>
  );

  const legend = (
    <div className="mt-2.5 flex flex-wrap gap-1.5 px-1">
      {usedCategories.map((category) => {
        const cat = GWANGJU_CATEGORIES[category];
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

  const filterBar = hasSelectableBlocks ? (
    <FilterBar
      selectedId={filterId}
      onChange={setFilterId}
      mode={mode}
      availableGroupIds={availableGroupIds}
    />
  ) : undefined;
  const selectedDerivedRange = DERIVED_RANGE_BY_FILTER_GROUP_ID.get(filterId);
  const derivedRangeSummary = selectedDerivedRange ? (
    <DerivedRangeSummary range={selectedDerivedRange} mode={mode} />
  ) : undefined;
  const desktopFilterBar = filterBar ? (
    <div className="space-y-1.5">
      {filterBar}
      {derivedRangeSummary}
    </div>
  ) : undefined;
  const mobileFilterBar = filterBar ? (
    <div className="mb-2.5 space-y-1.5">
      <div className="overflow-x-auto">{filterBar}</div>
      {derivedRangeSummary}
    </div>
  ) : undefined;

  const detailPanel = hasSelectableBlocks ? (
    <DetailPanel
      section={selected}
      mode={mode}
      onClose={() => setSelected(null)}
      onUpload={() => selected && setUploadFor(selected)}
    />
  ) : null;

  const mapContent = (
    <div className="relative">
      {mapSvg}
      <SeatMapHoverPreview
        visible={Boolean(hoveredSection && hoveredCategory)}
        title={hoveredSection?.name}
        subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
        badgeLabel={hoveredCategory?.label}
        accentColor={hoveredAccent}
        description={hoveredSection ? `${getGwangjuSideLabel(hoveredSection.side)} · ${getGwangjuFanRoleLabel(hoveredSection.fanRole)}` : undefined}
      />
    </div>
  );

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="광주-KIA 챔피언스필드"
        subtitle="광주 KIA 공식 좌석도"
        titleAccentColor="#EA0029"
        isMobile={isMobile}
        isDoosanGuideActive={false}
        filterBar={desktopFilterBar}
        mobileFilterBar={mobileFilterBar}
        desktopFilterBar={desktopFilterBar}
        mapContent={mapContent}
        attribution={attribution}
        legend={hasSelectableBlocks ? legend : undefined}
        mobileBottomSheet={hasSelectableBlocks && selected && (
          <GwangjuBottomSheet
            section={selected}
            mode={mode}
            onClose={() => setSelected(null)}
            onUpload={() => selected && setUploadFor(selected)}
          />
        )}
        mobileHasSidePanel={Boolean(hasSelectableBlocks && selected)}
        desktopSidePanel={detailPanel}
        toast={toast}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={mapContent}
        fullscreenTitle="광주-KIA 챔피언스필드"
        fullscreenSubtitle="광주 KIA 공식 좌석도 전체화면"
      />
      {uploadFor && (
        <GwangjuUploadFlowModal
          section={uploadFor}
          mode={mode}
          onClose={() => setUploadFor(null)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </>
  );
}
