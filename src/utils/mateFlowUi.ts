import type { BadgeType, PartyStatus } from '../types/mate';
import { getMateStatusBadgeMeta } from './statusBadgeMeta';

export const matePageShellClass =
  'relative min-h-screen overflow-hidden bg-gray-50 dark:bg-background transition-colors duration-200';

export const mateHeroCardClass =
  'overflow-hidden rounded-20 border border-gray-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-white/15 dark:bg-[#000000] dark:shadow-[0_10px_28px_rgba(0,0,0,0.35)]';

export const mateSectionCardClass =
  'border border-gray-200/90 bg-white dark:border-white/15 dark:bg-[#000000]';

export const mateInsetPanelClass =
  'rounded-14 border border-gray-200/80 bg-gray-50/90 dark:border-white/10 dark:bg-secondary/70';

export const mateSubtlePanelClass =
  'rounded-xl border border-dashed border-gray-200 bg-white/80 dark:border-border/70 dark:bg-card/70';

export const mateMobileBarClass =
  'fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] border-t border-gray-200/90 bg-white/95 px-4 pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-border dark:bg-card/95 min-h-[74px] pb-3 md:bottom-0 md:pb-[calc(env(safe-area-inset-bottom)+0.75rem)]';

export const getPartyStatusMeta = (status: PartyStatus): { label: string; className: string } => {
  const meta = getMateStatusBadgeMeta(status);

  return {
    label: meta.label,
    className:
      'border-[rgba(31,49,43,.105)] bg-white/90 text-slate-800 dark:border-white/10 dark:bg-slate-900/70 dark:text-white',
  };
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
          'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-white',
      };
  }
};

export const getPartyFlowLabel = (status: PartyStatus): string => {
  if (status === 'SELLING') {
    return '판매 티켓 직거래';
  }

  return '직거래 베타';
};
