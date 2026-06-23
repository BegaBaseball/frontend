export type WinProbabilitySide = 'home' | 'away';

export interface WinProbabilityDisplay {
  homePct: number;
  awayPct: number;
  favoredPct: number;
  favoredSide: WinProbabilitySide;
  diffPct: number;
}

export const isWinProbabilityInput = (value: unknown): value is number => (
  typeof value === 'number'
  && Number.isFinite(value)
  && value >= 0
  && value <= 100
);

export const normalizeWinProbabilityPercent = (value?: number | null): number | null => {
  if (!isWinProbabilityInput(value)) {
    return null;
  }

  const pct = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(pct)));
};

export const resolveWinProbabilityDisplay = (
  homeWinProbability?: number | null,
): WinProbabilityDisplay | null => {
  const homePct = normalizeWinProbabilityPercent(homeWinProbability);
  if (homePct === null) {
    return null;
  }

  const awayPct = 100 - homePct;
  const favoredSide: WinProbabilitySide = homePct >= awayPct ? 'home' : 'away';
  const favoredPct = favoredSide === 'home' ? homePct : awayPct;

  return {
    homePct,
    awayPct,
    favoredPct,
    favoredSide,
    diffPct: Math.abs(homePct - awayPct),
  };
};
