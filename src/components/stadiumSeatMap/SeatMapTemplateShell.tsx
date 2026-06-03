import { type ReactNode } from 'react';

import { STADIUM_SEATMAP_DARK_COLORS } from './seatMapTheme';

interface SeatMapTemplateShellProps {
  mode: 'light' | 'dark';
  title: string;
  subtitle: string;
  titleAccentColor: string;
  seatMapTestId?: string;
  isMobile: boolean;
  isAuxiliaryGuideActive: boolean;
  filterBar?: ReactNode;
  mobileFilterBar?: ReactNode;
  desktopFilterBar?: ReactNode;
  mapContent: ReactNode;
  attribution: ReactNode;
  legend?: ReactNode;
  mobileSidePanel?: ReactNode;
  mobileSecondaryPanel?: ReactNode;
  mobileBottomSheet?: ReactNode;
  mobileHasSidePanel?: boolean;
  desktopSidePanel?: ReactNode;
  desktopSecondaryPanel?: ReactNode;
  toast?: string | null;
  isFullscreenOpen: boolean;
  fullscreenMapContent: ReactNode;
  onFullscreenClose: () => void;
  fullscreenDialogTestId?: string;
  fullscreenCloseTestId?: string;
  fullscreenTitle: string;
  fullscreenSubtitle: string;
}

export function SeatMapTemplateShell({
  mode,
  title,
  subtitle,
  titleAccentColor,
  seatMapTestId = 'stadium-seat-map',
  isMobile,
  isAuxiliaryGuideActive,
  filterBar,
  mobileFilterBar,
  desktopFilterBar,
  mapContent,
  attribution,
  legend,
  mobileSidePanel,
  mobileSecondaryPanel,
  mobileBottomSheet,
  mobileHasSidePanel = false,
  desktopSidePanel,
  desktopSecondaryPanel,
  toast,
  isFullscreenOpen,
  fullscreenMapContent,
  onFullscreenClose,
  fullscreenDialogTestId = 'jamsil-seatmap-fullscreen',
  fullscreenCloseTestId = 'jamsil-seatmap-fullscreen-close',
  fullscreenTitle,
  fullscreenSubtitle,
}: SeatMapTemplateShellProps) {
  const isDark = mode === 'dark';
  const resolvedMobileSecondaryPanel = mobileSecondaryPanel ?? mobileSidePanel;
  const resolvedDesktopPanel = (desktopSecondaryPanel || desktopSidePanel) ? (
    <div className="space-y-3">
      {desktopSecondaryPanel}
      {desktopSidePanel}
    </div>
  ) : null;
  const hasDesktopPanel = !isAuxiliaryGuideActive && Boolean(resolvedDesktopPanel);
  const mapSection = (
    <div
      className="relative"
    >
      {mapContent}
    </div>
  );

  const mapFrame = (
    <div
      data-testid={seatMapTestId}
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${isMobile ? 'p-2' : 'p-3.5'}`}
      style={{
        backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.raised : undefined,
        borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.borderStrong : undefined,
        color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined,
        boxShadow: isDark ? '0 20px 56px -42px rgba(0, 0, 0, 0.95)' : undefined,
      }}
    >
      <div
        className="flex justify-between items-center mb-2.5 px-1 text-sm font-black text-slate-800 dark:text-white"
        style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined }}
      >
        {title}
        <span className="ml-2 text-[11px] font-semibold" style={{ color: titleAccentColor }}>
          {subtitle}
        </span>
      </div>
      {mapSection}
      {attribution}
      {legend}
    </div>
  );

  return (
    <>
      {isMobile ? (
        <div className={isAuxiliaryGuideActive || !mobileHasSidePanel ? 'pb-4' : 'pb-80'}>
          {!isAuxiliaryGuideActive && (mobileFilterBar ?? filterBar)}

          {mapFrame}
          {!isAuxiliaryGuideActive && resolvedMobileSecondaryPanel && (
            <div className="mt-3">
              {resolvedMobileSecondaryPanel}
            </div>
          )}
          {!isAuxiliaryGuideActive && mobileBottomSheet}
        </div>
      ) : (
        <>
          {!isAuxiliaryGuideActive && (
            <div className="flex items-center gap-2.5 flex-wrap mb-3">
              <div className="flex-1 min-w-0">
                {desktopFilterBar ?? filterBar}
              </div>
            </div>
          )}

          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: hasDesktopPanel ? 'minmax(0, 1fr) 380px' : 'minmax(0, 1fr)',
              alignItems: 'start',
            }}
          >
            {mapFrame}
            {resolvedDesktopPanel}
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-full text-sm font-bold shadow-xl"
          style={{
            background: isDark ? STADIUM_SEATMAP_DARK_COLORS.accent : '#0f172a',
            color: isDark ? '#03100b' : '#f8fafc',
          }}
        >
          {toast}
        </div>
      )}

      {isFullscreenOpen && !isAuxiliaryGuideActive && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${fullscreenTitle} 전체화면`}
          data-testid={fullscreenDialogTestId}
          className="fixed inset-0 z-[220] bg-slate-950/95 p-3 text-white sm:p-5"
          style={{ backgroundColor: isDark ? 'rgba(2, 4, 3, 0.97)' : undefined }}
        >
          <div
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
            style={{
              backgroundColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.raised : undefined,
              borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.borderStrong : undefined,
            }}
          >
            <div
              className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-5"
              style={{ borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.border : undefined }}
            >
              <div>
                <div className="text-sm font-black text-white">{fullscreenTitle}</div>
                <div
                  className="text-[11px] font-semibold text-slate-400"
                  style={{ color: isDark ? STADIUM_SEATMAP_DARK_COLORS.muted : undefined }}
                >
                  {fullscreenSubtitle}
                </div>
              </div>
              <button
                type="button"
                data-testid={fullscreenCloseTestId}
                aria-label={`${fullscreenTitle} 전체화면 닫기`}
                onClick={onFullscreenClose}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-200 transition-colors hover:bg-slate-800"
                style={{
                  borderColor: isDark ? STADIUM_SEATMAP_DARK_COLORS.borderStrong : undefined,
                  color: isDark ? STADIUM_SEATMAP_DARK_COLORS.text : undefined,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-2 py-3 sm:px-4 sm:py-4">
              <div className="mx-auto flex h-full w-full max-w-[calc(100vh-120px)] items-center justify-center">
                <div className="w-full">
                  {fullscreenMapContent}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
