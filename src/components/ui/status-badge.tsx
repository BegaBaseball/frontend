import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../../lib/utils';

export type StatusBadgeTone =
  | 'brand'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'violet'
  | 'neutral';

export type StatusBadgeMarker = 'dot' | 'check' | 'x' | 'arrow' | 'diamond' | 'dash';
export type StatusBadgeSize = 'xs' | 'sm' | 'md';
export type StatusBadgeVariant = 'quiet' | 'line' | 'filled';
export type StatusBadgeLiveMode = 'always' | 'hover';

interface StatusBadgeProps {
  label?: ReactNode;
  tone?: StatusBadgeTone;
  marker?: StatusBadgeMarker;
  live?: boolean;
  liveMode?: StatusBadgeLiveMode;
  size?: StatusBadgeSize;
  variant?: StatusBadgeVariant;
  /** Raw hex for the marker dot when variant="filled" (defaults to currentColor). */
  dotColor?: string;
  /** Raw hex for the label text when variant="filled" (defaults to white). */
  filledTextColor?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  'data-testid'?: string;
}

const markerToneClass: Record<StatusBadgeTone, string> = {
  brand: 'border-emerald-200 bg-emerald-50 text-primary dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
  neutral: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white',
};

const markerToneTextClass: Record<StatusBadgeTone, string> = {
  brand: 'text-primary dark:text-emerald-300',
  success: 'text-emerald-700 dark:text-emerald-300',
  danger: 'text-rose-700 dark:text-rose-300',
  warning: 'text-amber-700 dark:text-amber-300',
  info: 'text-sky-700 dark:text-sky-300',
  violet: 'text-violet-700 dark:text-violet-300',
  neutral: 'text-slate-500 dark:text-white',
};

const sizeClass: Record<StatusBadgeSize, string> = {
  xs: 'min-h-[22px] gap-1 pl-[3px] pr-2 py-0.5 text-11',
  sm: 'min-h-[26px] gap-1.5 pl-1 pr-[11px] py-[3px] text-12',
  md: 'min-h-8 gap-2 pl-1.5 pr-3.5 py-1 text-caption',
};

const lineSizeClass: Record<StatusBadgeSize, string> = {
  xs: 'min-h-[18px] gap-1 text-11',
  sm: 'min-h-[21px] gap-1.5 text-12',
  md: 'min-h-6 gap-2 text-caption',
};

const markerSizeClass: Record<StatusBadgeSize, string> = {
  xs: 'h-[15px] w-[15px] text-9',
  sm: 'h-[18px] w-[18px] text-[10.5px]',
  md: 'h-[23px] w-[23px] text-12',
};

const dotSizeClass: Record<StatusBadgeSize, string> = {
  xs: 'h-[5px] w-[5px]',
  sm: 'h-[6px] w-[6px]',
  md: 'h-[7px] w-[7px]',
};

const markerIconSizeClass: Record<StatusBadgeSize, string> = {
  xs: 'h-[9px] w-[9px]',
  sm: 'h-[10.5px] w-[10.5px]',
  md: 'h-[13px] w-[13px]',
};

const markerGlyph: Record<Exclude<StatusBadgeMarker, 'dot'>, string> = {
  check: '✓',
  x: '×',
  arrow: '↗',
  diamond: '◆',
  dash: '-',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  marker = 'dot',
  live = false,
  liveMode = 'always',
  size = 'sm',
  variant = 'quiet',
  dotColor,
  filledTextColor,
  className,
  style,
  title,
  'data-testid': testId,
}: StatusBadgeProps) {
  const lineVariant = variant === 'line';
  const filledVariant = variant === 'filled';
  const showDot = marker === 'dot' || lineVariant || filledVariant;
  const hasLabel = label !== null && label !== undefined && label !== false && label !== '';

  return (
    <span
      title={title}
      data-testid={testId}
      data-live-mode={live ? liveMode : undefined}
      style={style}
      className={cn(
        'status-badge relative inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-bold leading-none tracking-normal',
        lineVariant
          ? cn('border border-transparent bg-transparent px-0 py-0 text-slate-600 shadow-none dark:text-white', lineSizeClass[size])
          : filledVariant
            ? cn('border border-transparent bg-[#173b34] shadow-none', sizeClass[size])
            : cn(
              'border border-slate-200 bg-slate-50 text-slate-800 shadow-none dark:border-slate-700 dark:bg-slate-900/70 dark:text-white',
              sizeClass[size],
            ),
        className,
      )}
    >
      <span
        aria-hidden="true"
        style={filledVariant ? { color: dotColor || 'currentColor' } : undefined}
        className={cn(
          'relative z-0 shrink-0 rounded-full',
          lineVariant
            ? cn('h-2 w-2 bg-current shadow-none', markerToneTextClass[tone])
            : filledVariant
              ? cn('grid place-items-center border-0 bg-transparent shadow-none', markerSizeClass[size])
              : cn(
                'grid place-items-center border shadow-none',
                markerSizeClass[size],
                markerToneClass[tone],
              ),
        )}
      >
        {live ? (
          <span
            className="status-dot-live-ring pointer-events-none absolute inset-[-4px] -z-10 rounded-full border border-current opacity-60"
          />
        ) : null}
        {showDot ? (
          <span className={cn('rounded-full bg-current shadow-none', lineVariant || filledVariant ? 'h-2 w-2' : dotSizeClass[size])} />
        ) : (
          <span className="relative z-10 grid h-full w-full place-items-center leading-none">
            <span
              aria-hidden="true"
              className={cn(
                'grid place-items-center font-black leading-none',
                markerIconSizeClass[size],
                marker === 'diamond' ? 'text-[8px]' : null,
              )}
            >
              {markerGlyph[marker]}
            </span>
          </span>
        )}
      </span>
      {hasLabel
        ? (
          <span
            className={filledVariant ? 'relative z-0' : cn('relative z-0', markerToneTextClass[tone])}
            style={filledVariant ? { color: filledTextColor || '#ffffff' } : undefined}
          >
            {label}
          </span>
        ) : null}
    </span>
  );
}
