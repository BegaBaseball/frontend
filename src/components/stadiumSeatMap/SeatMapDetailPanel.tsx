import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

import SeatViewGallery from '../SeatViewGallery';
import type {
  SeatMapCategoryMeta,
  SeatMapCommonCopy,
  SeatMapSectionAdapter,
  SeatMapSearchAction,
  SeatMapThemeMode,
} from './seatMapCommonTypes';
import { STADIUM_SEATMAP_DARK_COLORS } from './seatMapTheme';

interface SeatMapDetailPanelProps<TSection> {
  section: TSection | null;
  mode: SeatMapThemeMode;
  categories: Record<string, SeatMapCategoryMeta>;
  adapter: SeatMapSectionAdapter<TSection>;
  stadiumKey: string;
  onClose: () => void;
  onUpload: () => void;
  copy?: SeatMapCommonCopy;
  extraMeta?: (section: TSection, accent: string) => ReactNode;
  footerExtra?: (section: TSection, accent: string) => ReactNode;
  isUploadDisabled?: (section: TSection) => boolean;
  getUploadLabel?: (section: TSection) => ReactNode;
  searchAction?: SeatMapSearchAction;
}

function EmptyState({ copy, mode }: { copy?: SeatMapCommonCopy; mode: SeatMapThemeMode }) {
  const isDark = mode === 'dark';

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div
        className="mb-3 inline-flex rounded-full bg-slate-100 p-3.5 text-slate-400"
        style={{
          backgroundColor: isDark ? 'rgba(126, 211, 179, 0.08)' : undefined,
          color: isDark ? STADIUM_SEATMAP_DARK_COLORS.accent : undefined,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <p className="mb-1.5 text-sm font-bold text-slate-700 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>
        {copy?.emptyTitle ?? '구역을 선택하세요'}
      </p>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>
        {copy?.emptyDescription ?? '좌석 배치도에서 원하는 구역을 클릭하면 블록 정보와 실제 시야 사진이 표시됩니다.'}
      </p>
    </div>
  );
}

function InfoTile({ label, value, mode }: { label: string; value: string; mode: SeatMapThemeMode }) {
  const isDark = mode === 'dark';

  return (
    <div
      className="rounded-xl bg-slate-50 p-3"
      style={{ backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.surface : undefined }}
    >
      <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>{label}</div>
      <div className="text-base font-black text-slate-800 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>{value}</div>
    </div>
  );
}

export function SeatMapDetailPanel<TSection>({
  section,
  mode,
  categories,
  adapter,
  stadiumKey,
  onClose,
  onUpload,
  copy,
  extraMeta,
  footerExtra,
  isUploadDisabled,
  getUploadLabel,
  searchAction,
}: SeatMapDetailPanelProps<TSection>) {
  const isDark = mode === 'dark';
  const panelStyle = {
    backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.raised : undefined,
    borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.border : undefined,
    color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined,
  };

  if (!section) {
    return (
      <div
        className="sticky top-4 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        style={{ ...panelStyle, maxHeight: 'calc(100vh - 32px)', minHeight: 220 }}
      >
        <EmptyState copy={copy} mode={mode} />
      </div>
    );
  }

  const category = categories[adapter.getCategoryId(section)] ?? {
    label: adapter.getCategoryId(section),
    light: '#64748b',
    dark: '#94a3b8',
  };
  const accent = mode === 'dark' ? category.dark : category.light;
  const tags = adapter.getTags?.(section) ?? [];
  const notes = adapter.getNotes?.(section);
  const accessibilityNote = adapter.getAccessibilityNote?.(section);
  const uploadDisabled = Boolean(isUploadDisabled?.(section));
  const blockLabel = copy?.blockLabel ?? '블록';

  return (
    <div
      className="sticky top-4 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      style={{ ...panelStyle, maxHeight: 'calc(100vh - 32px)' }}
    >
      <div className="relative px-5 pb-4 pt-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
          style={{
            backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.surface : undefined,
            color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-2 flex flex-wrap items-center gap-2 pr-10">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: `${accent}22`, color: accent }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            {category.label} · {adapter.getLevel(section)}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: `${accent}22`, color: accent }}
          >
            {adapter.getSourceLabel(section)}
          </span>
        </div>

        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>
          {adapter.getName(section)}
        </h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>
          {blockLabel} {adapter.getBlock(section)}
        </p>
        {searchAction && (
          <button
            type="button"
            data-testid={searchAction.testId}
            aria-label={searchAction.ariaLabel ?? '구역 검색'}
            onClick={searchAction.onClick}
            className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-opacity hover:opacity-85"
            style={{ background: `${accent}12`, borderColor: `${accent}44`, color: accent }}
          >
            <Search aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
            {searchAction.label ?? '구역 검색'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <InfoTile label={blockLabel} value={adapter.getBlock(section)} mode={mode} />
        <InfoTile label="위치" value={adapter.getSideLabel(section)} mode={mode} />
        <InfoTile label="팬 구분" value={adapter.getFanRoleLabel(section)} mode={mode} />
        <InfoTile label="시야 거리" value={adapter.getDistance?.(section) ?? '-'} mode={mode} />
      </div>

      {extraMeta?.(section, accent)}

      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800" style={{ borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.border : undefined }}>
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          {copy?.officialBlocksTitle ?? '공식 블록 묶음'}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {adapter.getOfficialBlocks(section).map((block) => (
            <span
              key={block}
              className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
              style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}
            >
              {block}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>
          {adapter.getSourceNote(section)}
        </p>
        {accessibilityNote && (
          <p className="mt-2 rounded-xl bg-cyan-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
            {accessibilityNote}
          </p>
        )}
      </div>

      {(notes || tags.length > 0) && (
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800" style={{ borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.border : undefined }}>
          {notes && <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>{notes}</p>}
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: `${accent}1a`, borderColor: `${accent}44`, color: accent }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800" style={{ borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.border : undefined }}>
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {copy?.galleryTitle ?? '실제 시야 사진'}
          </div>
          <p className="mt-1 text-[12px] font-semibold text-slate-500 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>
            다이어리에 공유된 사진만 표시합니다.
          </p>
        </div>
        <SeatViewGallery
          stadium={stadiumKey}
          section={adapter.getName(section)}
          sectionAliases={[...adapter.getSeatViewSections(section)]}
          compact
        />
      </div>

      {footerExtra?.(section, accent)}

      <div
        className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900"
        style={{
          backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.raised : undefined,
          borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.border : undefined,
        }}
      >
        <button
          type="button"
          onClick={onUpload}
          disabled={uploadDisabled}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: uploadDisabled ? '#94a3b8' : accent }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          {getUploadLabel?.(section) ?? copy?.uploadLabel ?? '이 구역 시야 사진 올리기'}
        </button>
      </div>
    </div>
  );
}
