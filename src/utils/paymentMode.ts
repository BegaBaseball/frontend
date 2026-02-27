export type MatePaymentMode = 'DIRECT_TRADE' | 'TOSS_TEST';

type WindowWithPaymentMode = Window & {
  __MATE_PAYMENT_MODE__?: string;
};

let hasWarnedUnknownMode = false;

const warnUnknownMode = (rawMode: string, source: string): void => {
  if (hasWarnedUnknownMode) {
    return;
  }
  hasWarnedUnknownMode = true;
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[MatePaymentMode] Unknown mode "${rawMode}" from ${source}. Fallback to DIRECT_TRADE.`);
  }
};

const normalizeMode = (rawMode: string | undefined, source: string): MatePaymentMode => {
  if (!rawMode) {
    return 'DIRECT_TRADE';
  }
  const normalized = rawMode.trim().toUpperCase();
  if (normalized === 'TOSS_TEST') {
    return 'TOSS_TEST';
  }
  if (normalized !== 'DIRECT_TRADE') {
    warnUnknownMode(rawMode, source);
  }
  return 'DIRECT_TRADE';
};

export const getMatePaymentMode = (): MatePaymentMode => {
  if (typeof window !== 'undefined') {
    const overrideMode = (window as WindowWithPaymentMode).__MATE_PAYMENT_MODE__;
    if (overrideMode) {
      return normalizeMode(overrideMode, 'window.__MATE_PAYMENT_MODE__');
    }
  }
  return normalizeMode(import.meta.env.VITE_MATE_PAYMENT_MODE, 'import.meta.env.VITE_MATE_PAYMENT_MODE');
};

export const isDirectTradeMode = (): boolean => getMatePaymentMode() === 'DIRECT_TRADE';
export const isTossTestMode = (): boolean => getMatePaymentMode() === 'TOSS_TEST';
