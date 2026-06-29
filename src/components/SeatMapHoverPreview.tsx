interface SeatMapHoverPreviewProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
  accentColor?: string;
  description?: string;
  className?: string;
}

export default function SeatMapHoverPreview({
  visible,
  title,
  subtitle,
  badgeLabel,
  accentColor = '#2563eb',
  description,
  className = '',
}: SeatMapHoverPreviewProps) {
  const hasContent = visible && (title || subtitle || badgeLabel || description);

  return (
    <div
      data-testid="seat-map-hover-preview"
      aria-live="polite"
      className={[
        'mt-2 flex min-h-[76px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 shadow-sm transition-colors duration-150 ease-out dark:border-slate-700 dark:bg-slate-950/60 dark:text-white',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        borderColor: hasContent ? accentColor : undefined,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-150"
          style={{ backgroundColor: hasContent ? accentColor : '#94a3b8' }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <strong className="block truncate text-sm font-black">
            {hasContent ? title || '구역 정보' : '구역 정보'}
          </strong>
          <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-white">
            {hasContent ? subtitle || description || '좌석 구역' : '좌석도 정보'}
          </p>
          {hasContent && subtitle && description && (
            <p className="mt-0.5 line-clamp-1 text-11 font-semibold text-slate-400 dark:text-white">
              {description}
            </p>
          )}
        </div>
      </div>
      {hasContent && badgeLabel && (
        <span
          className="inline-flex max-w-[42%] rounded-md px-2 py-1 text-11 font-bold text-white"
          style={{ backgroundColor: accentColor }}
        >
          <span className="truncate">{badgeLabel}</span>
        </span>
      )}
    </div>
  );
}
