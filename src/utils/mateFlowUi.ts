import type { BadgeType, PartyStatus } from '../types/mate';

export const matePageShellClass =
  'relative min-h-screen overflow-hidden bg-gray-50 dark:bg-background transition-colors duration-200';

export const mateHeroCardClass =
  'overflow-hidden rounded-[28px] border border-gray-200/80 bg-white shadow-[0_28px_60px_rgba(15,23,42,0.12)] ring-1 ring-black/5 backdrop-blur-sm dark:border-border/80 dark:bg-card/95 dark:shadow-[0_26px_72px_rgba(0,0,0,0.55)] dark:ring-white/10';

export const mateSectionCardClass =
  'border border-gray-200/80 bg-white shadow-md ring-1 ring-black/5 backdrop-blur-sm dark:border-border/80 dark:bg-card/90 dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] dark:ring-white/10';

export const mateInsetPanelClass =
  'rounded-2xl border border-gray-200/80 bg-gray-50/90 dark:border-border/70 dark:bg-secondary/70';

export const mateSubtlePanelClass =
  'rounded-xl border border-dashed border-gray-200 bg-white/80 dark:border-border/70 dark:bg-card/70';

export const mateMobileBarClass =
  'fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/90 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-border dark:bg-card/95';

export const getPartyStatusMeta = (status: PartyStatus): { label: string; className: string } => {
  switch (status) {
    case 'MATCHED':
      return {
        label: '매칭 성공',
        className:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300',
      };
    case 'SELLING':
      return {
        label: '판매 중',
        className:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
      };
    case 'SOLD':
      return {
        label: '판매 완료',
        className:
          'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
      };
    case 'CHECKED_IN':
      return {
        label: '체크인 완료',
        className:
          'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-300',
      };
    case 'COMPLETED':
      return {
        label: '관람 완료',
        className:
          'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
      };
    case 'FAILED':
      return {
        label: '매칭 실패',
        className:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300',
      };
    case 'PENDING':
    default:
      return {
        label: '모집 중',
        className:
          'border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-300',
      };
  }
};

export const getBadgeMeta = (badge?: BadgeType): { label: string; className: string } | null => {
  if (!badge) {
    return null;
  }

  switch (badge) {
    case 'VERIFIED':
      return {
        label: '인증 호스트',
        className:
          'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300',
      };
    case 'TRUSTED':
      return {
        label: '신뢰 배지',
        className:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
      };
    case 'NEW':
    default:
      return {
        label: '신규 호스트',
        className:
          'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
      };
  }
};

export const getPartyFlowLabel = (status: PartyStatus): string => {
  if (status === 'SELLING') {
    return '판매 티켓 직거래';
  }

  return '직거래 베타';
};
