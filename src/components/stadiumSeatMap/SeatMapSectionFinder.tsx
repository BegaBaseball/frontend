import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { SeatMapSectionAdapter, SeatMapCategoryMeta } from './seatMapCommonTypes';
import { STADIUM_SEATMAP_DARK_COLORS } from './seatMapTheme';

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function buildSearchText<T>(block: T, a: SeatMapSectionAdapter<T>): string {
  const blockCode = a.getBlock(block);
  return [
    a.getId(block),
    a.getName(block),
    blockCode,
    `${blockCode}블록`,
    ...a.getOfficialBlocks(block),
    ...a.getSeatViewSections(block),
    a.getSideLabel(block),
    a.getFanRoleLabel(block),
  ]
    .filter(Boolean)
    .join(' ');
}

interface SeatMapSectionFinderProps<TSection> {
  blocks: TSection[];
  adapter: SeatMapSectionAdapter<TSection>;
  categories: Record<string, SeatMapCategoryMeta>;
  filterCats: readonly string[] | null;
  selected: TSection | null;
  onSelect: (block: TSection) => void;
  onHoverChange: (id: string | null) => void;
  mode: 'light' | 'dark';
  testIdPrefix: string;
  accentColor: string;
  stadiumShortLabel: string;
  autoFocusInput?: boolean;
}

export function SeatMapSectionFinder<TSection>({
  blocks,
  adapter,
  categories,
  filterCats,
  selected,
  onSelect,
  onHoverChange,
  mode,
  testIdPrefix,
  accentColor,
  stadiumShortLabel,
  autoFocusInput = false,
}: SeatMapSectionFinderProps<TSection>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const isDark = mode === 'dark';
  const borderColor = isDark ? STADIUM_SEATMAP_DARK_COLORS.border : '#e2e8f0';

  const visibleBlocks = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchTerm);
    return blocks.filter((block) => {
      if (filterCats !== null && !filterCats.includes(adapter.getCategoryId(block))) {
        return false;
      }
      if (!normalizedQuery) return true;
      return normalizeSearchText(buildSearchText(block, adapter)).includes(normalizedQuery);
    });
  }, [blocks, adapter, filterCats, searchTerm]);

  const selectedId = selected ? adapter.getId(selected) : null;

  return (
    <aside
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      data-testid={`${testIdPrefix}-section-finder`}
      style={{
        backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.raised : undefined,
        borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.border : undefined,
      }}
    >
      <div
        className="border-b border-slate-100 px-4 py-4 dark:border-slate-800"
        style={{ borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.border : undefined }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>블록 검색</h3>
            <p className="mt-0.5 text-11 font-semibold text-slate-400" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>
              {visibleBlocks.length}/{blocks.length}개 표시
            </p>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-11 font-black"
            style={{ background: `${accentColor}1a`, color: accentColor }}
          >
            {stadiumShortLabel}
          </span>
        </div>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            data-testid={`${testIdPrefix}-block-search`}
            aria-label={`${stadiumShortLabel} 좌석 블록 검색`}
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            autoFocus={autoFocusInput}
            placeholder="블록, 구역명 검색"
            className="h-11 w-full rounded-xl border bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white dark:text-white"
            style={{
              backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.surface : undefined,
              borderColor: inputFocused ? accentColor : borderColor,
              color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined,
            }}
          />
        </label>
      </div>
      <div className="max-h-[520px] overflow-y-auto p-2">
        {visibleBlocks.length > 0 ? (
          <div className="space-y-1.5">
            {visibleBlocks.map((block) => {
              const catId = adapter.getCategoryId(block);
              const cat = categories[catId];
              const accent = cat ? (mode === 'dark' ? cat.dark : cat.light) : accentColor;
              const isActive = adapter.getId(block) === selectedId;

              return (
                <button
                  key={adapter.getId(block)}
                  type="button"
                  data-testid={`${testIdPrefix}-section-finder-item-${adapter.getId(block)}`}
                  onClick={() => onSelect(block)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(block);
                    }
                  }}
                  onMouseEnter={() => onHoverChange(adapter.getId(block))}
                  onMouseLeave={() => onHoverChange(null)}
                  className="min-h-11 w-full cursor-pointer rounded-xl border px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  style={{
                    borderColor: isActive ? accent : 'transparent',
                    background: isActive ? `${accent}14` : 'transparent',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="rounded-full px-2 py-0.5 text-10 font-black text-white"
                          style={{ background: accent }}
                        >
                          {adapter.getBlock(block)}
                        </span>
                        <span className="text-xs font-black text-slate-800 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>
                          {adapter.getName(block)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-11 font-semibold text-slate-500 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>
                        {cat?.label} · {adapter.getSideLabel(block)} · {adapter.getFanRoleLabel(block)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[180px] flex-col items-center justify-center px-4 text-center">
            <p className="text-sm font-black text-slate-700 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>검색 결과가 없습니다</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>
              블록 번호, 좌석명, 공식 블록 묶음 이름으로 다시 검색하세요.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
