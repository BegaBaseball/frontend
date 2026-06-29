import { useEffect, useRef, useState, type ReactNode } from 'react';

import SeatViewGallery from '../SeatViewGallery';
import type {
  SeatMapCategoryMeta,
  SeatMapCommonCopy,
  SeatMapSectionAdapter,
  SeatMapSearchAction,
  SeatMapThemeMode,
} from './seatMapCommonTypes';
import { STADIUM_SEATMAP_DARK_COLORS } from './seatMapTheme';

type Snap = 'peek' | 'half' | 'full';

interface SeatMapBottomSheetProps<TSection> {
  section: TSection | null;
  mode: SeatMapThemeMode;
  categories: Record<string, SeatMapCategoryMeta>;
  adapter: SeatMapSectionAdapter<TSection>;
  stadiumKey: string;
  onClose: () => void;
  onUpload: () => void;
  testId?: string;
  copy?: SeatMapCommonCopy;
  extraMeta?: (section: TSection, accent: string) => ReactNode;
  preferFull?: boolean;
  isUploadDisabled?: (section: TSection) => boolean;
  getUploadLabel?: (section: TSection) => ReactNode;
  searchAction?: SeatMapSearchAction;
}

export function SeatMapBottomSheet<TSection>({
  section,
  mode,
  categories,
  adapter,
  stadiumKey,
  onClose,
  onUpload,
  testId,
  copy,
  extraMeta,
  preferFull = false,
  isUploadDisabled,
  getUploadLabel,
  searchAction,
}: SeatMapBottomSheetProps<TSection>) {
  const [snap, setSnap] = useState<Snap>('peek');
  const startY = useRef(0);
  const isDark = mode === 'dark';

  useEffect(() => {
    setSnap(section ? (preferFull ? 'full' : 'half') : 'peek');
  }, [adapter, preferFull, section]);

  const mobileSheetBottomOffset = 'calc(var(--mobile-chrome-height) + var(--mobile-chrome-bottom-offset) + env(safe-area-inset-bottom) + 0.75rem)';
  const heights: Record<Snap, string> = {
    peek: '80px',
    half: 'min(58vh, calc(100vh - var(--mobile-content-safe-bottom) - 1rem))',
    full: 'calc(100vh - var(--mobile-content-safe-bottom) - 1rem)',
  };

  const onTouchStart = (event: React.TouchEvent) => { startY.current = event.touches[0].clientY; };
  const onTouchMove = (event: React.TouchEvent) => {
    const dy = event.touches[0].clientY - startY.current;
    if (Math.abs(dy) < 50) return;
    if (dy > 0) setSnap((value) => value === 'full' ? 'half' : 'peek');
    else setSnap((value) => value === 'peek' ? 'half' : 'full');
    startY.current = event.touches[0].clientY;
  };

  if (!section) {
    return (
      <div
        data-testid={testId}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2.5 border-t border-slate-200 bg-white px-5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{
          bottom: mobileSheetBottomOffset,
          height: 80,
          backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.raised : undefined,
          borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.borderStrong : undefined,
        }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400"
          style={{
            backgroundColor: isDark ? 'rgba(126, 211, 179, 0.08)' : undefined,
            color: isDark ? STADIUM_SEATMAP_DARK_COLORS.accent : undefined,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-bold text-slate-800 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>
            {copy?.emptyTitle ?? '구역을 탭하세요'}
          </div>
          <div className="text-11 text-slate-500" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>블록 정보와 실제 시야 사진을 확인하세요</div>
        </div>
      </div>
    );
  }

  const category = categories[adapter.getCategoryId(section)] ?? {
    label: adapter.getCategoryId(section),
    light: '#64748b',
    dark: '#94a3b8',
  };
  const accent = mode === 'dark' ? category.dark : category.light;
  const accessibilityNote = adapter.getAccessibilityNote?.(section);
  const uploadDisabled = Boolean(isUploadDisabled?.(section));
  const blockLabel = copy?.blockLabel ?? '블록';

  return (
    <div
      data-testid={testId}
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden bg-white"
      style={{
        bottom: mobileSheetBottomOffset,
        height: heights[snap],
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.raised : undefined,
        border: isDark ? `1px solid ${STADIUM_SEATMAP_DARK_COLORS.borderStrong}` : undefined,
        borderBottom: isDark ? '0' : undefined,
        boxShadow: isDark ? '0 -18px 42px rgba(0,0,0,0.46)' : '0 -8px 30px rgba(0,0,0,0.18)',
        transition: 'height 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onClick={() => setSnap((value) => value === 'half' ? 'full' : value === 'full' ? 'peek' : 'half')}
        className="flex shrink-0 cursor-pointer flex-col items-center pb-1.5 pt-2.5"
      >
        <div
          className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600"
          style={{ backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.borderStrong : undefined }}
        />
      </div>

      <div className="flex shrink-0 items-center gap-3 px-4 pb-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
          style={{ backgroundColor: accent }}
        >
          {adapter.getOfficialBlocks(section)[0] ?? adapter.getBlock(section)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-slate-800 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>{adapter.getName(section)}</div>
          <div className="flex items-center gap-1.5 text-11 text-slate-500" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>
            {category.label} · {adapter.getSideLabel(section)} · {adapter.getFanRoleLabel(section)}
          </div>
        </div>
        {searchAction && (
          <button
            type="button"
            data-testid={searchAction.testId}
            aria-label={searchAction.ariaLabel ?? '구역 검색'}
            onClick={searchAction.onClick}
            className="min-h-11 shrink-0 cursor-pointer rounded-lg border px-2.5 py-2 text-11 font-black transition-opacity hover:opacity-85"
            style={{ background: `${accent}12`, borderColor: `${accent}44`, color: accent }}
          >
            {searchAction.label ?? '구역 검색'}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-slate-100 text-slate-400"
          style={{
            backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.surface : undefined,
            color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pb-24"
        style={{ opacity: snap === 'peek' ? 0 : 1, transition: 'opacity 0.2s' }}
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span className="rounded-full px-2.5 py-1 text-11 font-bold" style={{ background: `${accent}22`, color: accent }}>
            {category.label} · {adapter.getLevel(section)}
          </span>
          <span
            className="rounded-full bg-amber-100 px-2.5 py-1 text-11 font-bold text-amber-800"
            style={{
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : undefined,
              color: isDark ? '#fcd34d' : undefined,
            }}
          >
            {adapter.getSourceLabel(section)}
          </span>
        </div>

        {extraMeta?.(section, accent)}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800" style={{ backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.surface : undefined }}>
            <div className="text-9 font-bold tracking-widest text-slate-400" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>{blockLabel}</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>{adapter.getBlock(section)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800" style={{ backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.surface : undefined }}>
            <div className="text-9 font-bold tracking-widest text-slate-400" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>위치</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>{adapter.getSideLabel(section)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800" style={{ backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.surface : undefined }}>
            <div className="text-9 font-bold tracking-widest text-slate-400" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>팬 구분</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>{adapter.getFanRoleLabel(section)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800" style={{ backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.surface : undefined }}>
            <div className="text-9 font-bold tracking-widest text-slate-400" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>시야 거리</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}>{adapter.getDistance?.(section) ?? '-'}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-10 font-black uppercase tracking-widest text-slate-400">
            {copy?.officialBlocksTitle ?? '공식 블록 묶음'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {adapter.getOfficialBlocks(section).map((block) => (
              <span
                key={block}
                className="rounded-full border px-2.5 py-1 text-11 font-bold"
                style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}
              >
                {block}
              </span>
            ))}
          </div>
          <p className="mt-2 text-12 font-semibold leading-relaxed text-slate-500 dark:text-white" style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}>
            {adapter.getSourceNote(section)}
          </p>
          {accessibilityNote && (
            <p className="mt-2 rounded-xl bg-cyan-50 px-3 py-2 text-12 font-semibold leading-relaxed text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
              {accessibilityNote}
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 text-10 font-black uppercase tracking-widest text-slate-400">
            {copy?.galleryTitle ?? '실제 시야 사진'}
          </div>
          <SeatViewGallery
            stadium={stadiumKey}
            section={adapter.getName(section)}
            sectionAliases={[...adapter.getSeatViewSections(section)]}
            compact
          />
        </div>
      </div>

      <div
        className="shrink-0 border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        style={{
          opacity: snap === 'peek' ? 0 : 1,
          transition: 'opacity 0.2s',
          pointerEvents: snap === 'peek' ? 'none' : 'auto',
          backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.raised : undefined,
          borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.border : undefined,
        }}
      >
        <button
          type="button"
          onClick={onUpload}
          disabled={uploadDisabled}
          className="w-full cursor-pointer rounded-xl border-0 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: uploadDisabled ? '#94a3b8' : accent }}
        >
          {getUploadLabel?.(section) ?? copy?.uploadLabel ?? '+ 시야 사진 올리기'}
        </button>
      </div>
    </div>
  );
}
