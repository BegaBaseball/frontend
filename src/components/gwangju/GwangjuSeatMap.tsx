import { useCallback, useMemo, useState } from 'react';
import {
  GWANGJU_BLOCKS,
  GWANGJU_AWAY_CHEERING_BLOCK_IDS,
  GWANGJU_CATEGORIES,
  GWANGJU_CATEGORY_GROUPS,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
  GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS,
  GWANGJU_SELECTABLE_BLOCKS_READY,
  GWANGJU_SEATMAP_IMAGE,
  GWANGJU_VIEW_INFO,
  getGwangjuDerivedOperatorRangesForBlock,
  getGwangjuFanRoleLabel,
  getGwangjuSideLabel,
  getGwangjuSourceLabel,
  matchesGwangjuCategoryGroup,
  type GwangjuBlock,
  type GwangjuDerivedOperatorBlockRange,
} from '../../data/gwangjuSeatData';
import { useTheme } from '../../hooks/useTheme';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import GwangjuSeatMapSvg from './GwangjuSeatMapSvg';
import GwangjuUploadFlowModal from './GwangjuUploadFlowModal';
import { SeatMapAttribution } from '../stadiumSeatMap/SeatMapAttribution';
import { SeatMapBottomSheet } from '../stadiumSeatMap/SeatMapBottomSheet';
import { SeatMapDetailPanel } from '../stadiumSeatMap/SeatMapDetailPanel';
import { SeatMapFilterBar } from '../stadiumSeatMap/SeatMapFilterBar';
import { SeatMapLegend } from '../stadiumSeatMap/SeatMapLegend';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapSelectionState } from '../stadiumSeatMap/useSeatMapSelectionState';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';
import type { SeatMapPan, SeatMapSectionAdapter } from '../stadiumSeatMap/seatMapCommonTypes';

const DERIVED_RANGE_BY_FILTER_GROUP_ID = new Map(
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.map((range) => [range.filterGroupId, range]),
);

const AGGREGATE_SECTION_FILTER_ID = new Map([
  ['home-k7-seats', 'k7'],
  ['away-cheering-seats', 'away-cheering'],
]);

const SOURCE_SECTION_IDS_HIDDEN_BY_AGGREGATE_FILTER = new Map([
  ['k7', new Set(GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS)],
  ['away-cheering', new Set(GWANGJU_AWAY_CHEERING_BLOCK_IDS)],
]);

function isGwangjuSectionVisibleInFilter(section: GwangjuBlock, group: typeof GWANGJU_CATEGORY_GROUPS[number] | null): boolean {
  const aggregateFilterId = AGGREGATE_SECTION_FILTER_ID.get(section.id);
  if (aggregateFilterId) {
    return group?.id === aggregateFilterId;
  }

  const hiddenSourceIds = group ? SOURCE_SECTION_IDS_HIDDEN_BY_AGGREGATE_FILTER.get(group.id) : null;
  if (hiddenSourceIds?.has(section.id)) {
    return false;
  }

  if (!group) return true;
  if (!matchesGwangjuCategoryGroup(section, group)) return false;
  if (group.sides != null && !group.sides.includes(section.side)) return false;
  if (group.levels != null && !group.levels.includes(section.level)) return false;
  return true;
}

const gwangjuSectionAdapter: SeatMapSectionAdapter<GwangjuBlock> = {
  getId: (section) => section.id,
  getName: (section) => section.name,
  getBlock: (section) => section.block,
  getCategoryId: (section) => section.category,
  getLevel: (section) => section.level,
  getOfficialBlocks: (section) => section.officialBlocks,
  getSideLabel: (section) => getGwangjuSideLabel(section.side),
  getFanRoleLabel: (section) => getGwangjuFanRoleLabel(section.fanRole),
  getSourceLabel: (section) => getGwangjuSourceLabel(section.sourceConfidence),
  getSourceNote: (section) => section.sourceNote,
  getSeatViewSections: (section) => section.seatViewSections,
  getAccessibilityNote: (section) => section.accessibilityNote,
  getDistance: (section) => (GWANGJU_VIEW_INFO[section.id] ?? GWANGJU_VIEW_INFO.default).distance,
  getNotes: (section) => {
    const info = GWANGJU_VIEW_INFO[section.id] ?? GWANGJU_VIEW_INFO.default;
    const derivedRanges = getGwangjuDerivedOperatorRangesForBlock(section.id);
    const derivedRangeText = derivedRanges.length > 0
      ? `운영자 파생 구역: ${derivedRanges.map((range) => range.label).join(', ')}`
      : null;
    return [info.notes, derivedRangeText].filter(Boolean).join(' · ');
  },
  getTags: (section) => (GWANGJU_VIEW_INFO[section.id] ?? GWANGJU_VIEW_INFO.default).tags ?? [],
};

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

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function GwangjuSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [uploadFor, setUploadFor] = useState<GwangjuBlock | null>(null);
  const {
    selected,
    setSelected,
    hover,
    setHover,
    hoveredSection,
    filterId,
    setFilterId,
    activeFilterGroup,
    filterCats,
    filterSides,
    filterLevels,
    toast,
    showToast,
  } = useSeatMapSelectionState({
    sections: GWANGJU_BLOCKS,
    filterGroups: GWANGJU_CATEGORY_GROUPS,
    getId: (section) => section.id,
    getCategoryId: (section) => section.category,
    isSectionVisible: isGwangjuSectionVisibleInFilter,
  });
  const { isMobile, isFullscreenOpen, closeFullscreen } = useSeatMapTemplateShellState();
  const filterFanRoles = activeFilterGroup?.fanRoles ?? null;
  const hasSelectableBlocks = GWANGJU_SELECTABLE_BLOCKS_READY;
  const hoveredCategory = hoveredSection ? GWANGJU_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#EA0029';
  const usedCategories = useMemo(() => [...new Set(GWANGJU_BLOCKS.map((block) => block.category))], []);
  const availableGroupIds = useMemo(() => new Set(
    GWANGJU_CATEGORY_GROUPS
      .filter((group) => GWANGJU_BLOCKS.some((block) => matchesGwangjuCategoryGroup(block, group)))
      .map((group) => group.id),
  ), []);

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    showToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
  }, [showToast, uploadFor]);

  const mapSvg = (
    <GwangjuSeatMapSvg
      mode={mode}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      filterCats={filterCats}
      filterSides={filterSides}
      filterLevels={filterLevels}
      filterFanRoles={filterFanRoles}
      activeFilterId={filterId}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={setZoom}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomStep={ZOOM_STEP}
    />
  );

  const attribution = (
    <SeatMapAttribution
      source={{
        sourceLabel: GWANGJU_SEATMAP_IMAGE.sourceLabel,
        sourceUrl: GWANGJU_SEATMAP_IMAGE.sourceUrl,
        assetStatus: GWANGJU_SEATMAP_IMAGE.assetStatus,
      }}
    />
  );

  const legend = (
    <SeatMapLegend categoryIds={usedCategories} categories={GWANGJU_CATEGORIES} mode={mode} />
  );

  const filterBar = hasSelectableBlocks ? (
    <SeatMapFilterBar
      groups={GWANGJU_CATEGORY_GROUPS}
      selectedId={filterId}
      onChange={setFilterId}
      mode={mode}
      accentColor="#EA0029"
      testIdPrefix="gwangju"
      getGroupState={(group) => {
        const available = availableGroupIds.has(group.id);
        const derivedRange = DERIVED_RANGE_BY_FILTER_GROUP_ID.get(group.id);
        return {
          disabled: !available,
          extraButtonProps: {
            'data-derived-range-id': derivedRange?.id,
            'data-derived-block-ids': derivedRange?.blockIds.join(','),
            'data-aggregate-hit-area': derivedRange?.aggregateHitArea,
          },
        };
      }}
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
  const renderDerivedRangeMeta = (section: GwangjuBlock) => {
    const derivedRanges = getGwangjuDerivedOperatorRangesForBlock(section.id);
    if (derivedRanges.length === 0) return null;

    return (
      <div className="mb-4 flex flex-wrap gap-1.5">
        <DerivedRangeBadges ranges={derivedRanges} mode={mode} />
      </div>
    );
  };
  const renderDesktopDerivedRangeMeta = (section: GwangjuBlock) => {
    const derivedRanges = getGwangjuDerivedOperatorRangesForBlock(section.id);
    if (derivedRanges.length === 0) return null;

    return (
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">운영자 파생 구역</div>
        <div className="flex flex-wrap gap-1.5">
          <DerivedRangeBadges ranges={derivedRanges} mode={mode} />
        </div>
      </div>
    );
  };

  const detailPanel = hasSelectableBlocks ? (
    <SeatMapDetailPanel
      section={selected}
      mode={mode}
      categories={GWANGJU_CATEGORIES}
      adapter={gwangjuSectionAdapter}
      stadiumKey="GWANGJU"
      onClose={() => setSelected(null)}
      onUpload={() => selected && setUploadFor(selected)}
      extraMeta={renderDesktopDerivedRangeMeta}
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
        isAuxiliaryGuideActive={false}
        filterBar={desktopFilterBar}
        mobileFilterBar={mobileFilterBar}
        desktopFilterBar={desktopFilterBar}
        mapContent={mapContent}
        attribution={attribution}
        legend={hasSelectableBlocks ? legend : undefined}
        mobileBottomSheet={hasSelectableBlocks && selected && (
          <SeatMapBottomSheet
            section={selected}
            mode={mode}
            categories={GWANGJU_CATEGORIES}
            adapter={gwangjuSectionAdapter}
            stadiumKey="GWANGJU"
            onClose={() => setSelected(null)}
            onUpload={() => selected && setUploadFor(selected)}
            testId="gwangju-bottom-sheet"
            extraMeta={renderDerivedRangeMeta}
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
