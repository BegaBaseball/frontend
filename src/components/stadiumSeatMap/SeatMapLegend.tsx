import type { SeatMapCategoryMeta, SeatMapThemeMode } from './seatMapCommonTypes';
import { STADIUM_SEATMAP_DARK_COLORS } from './seatMapTheme';

interface SeatMapLegendProps {
  categoryIds: readonly string[];
  categories: Record<string, SeatMapCategoryMeta>;
  mode: SeatMapThemeMode;
}

export function SeatMapLegend({ categoryIds, categories, mode }: SeatMapLegendProps) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5 px-1">
      {categoryIds.map((categoryId) => {
        const category = categories[categoryId];
        if (!category) return null;
        const color = mode === 'dark' ? category.dark : category.light;
        return (
          <span
            key={categoryId}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500"
            style={{
              backgroundColor: mode === 'dark' ? STADIUM_SEATMAP_DARK_COLORS.surface : undefined,
              color: mode === 'dark' ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined,
            }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
            {category.label}
          </span>
        );
      })}
    </div>
  );
}
