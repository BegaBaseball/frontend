import type { ReactNode } from 'react';

export const decisionBadgeClass: Record<'GO' | 'NO_GO' | 'PENDING', string> = {
  GO: 'bg-emerald-500/20 text-emerald-300 border-0',
  NO_GO: 'bg-red-500/20 text-red-300 border-0',
  PENDING: 'bg-amber-500/20 text-amber-300 border-0',
};

export const confidenceBadgeClass: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-slate-700 text-slate-300 border-0',
  medium: 'bg-sky-500/20 text-sky-300 border-0',
  high: 'bg-violet-500/20 text-violet-300 border-0',
};

export const evalStatusBadgeClass: Record<'PASS' | 'FAIL', string> = {
  PASS: 'bg-emerald-500/20 text-emerald-300 border-0',
  FAIL: 'bg-red-500/20 text-red-300 border-0',
};

export const adminNativeSelectClassName =
  'w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60';

export function AdminBadge({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${className}`}
    >
      {children}
    </span>
  );
}
