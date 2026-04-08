export const bucketBadgeClass: Record<'api' | 'runtime' | 'feedback', string> = {
  api: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  runtime: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  feedback: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export const sourceBadgeClass: Record<'api' | 'runtime' | 'unhandled_rejection' | 'unknown', string> = {
  api: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  runtime: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  unhandled_rejection: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  unknown: 'bg-slate-700 text-slate-300 border-slate-600',
};

export const channelBadgeClass: Record<'telegram' | 'slack', string> = {
  telegram: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  slack: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export const adminNativeSelectClassName = 'rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60';

export const formatDetailedDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  const dateLabel = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(date);

  return `${dateLabel} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
