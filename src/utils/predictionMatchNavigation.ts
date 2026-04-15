import type { DateGames, MatchBounds } from '../types/prediction';

export type PredictionNearestNavigationDate = { date: string; isPast: boolean };

type PredictionDayNavigationMeta = { prevDate: string | null; nextDate: string | null } | null;

export const normalizePredictionBoundaryDate = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 10) : null;
};

export const resolvePredictionNearestNavigationDate = (
  allDatesData: DateGames[],
  currentDayNavigationMeta: PredictionDayNavigationMeta,
): PredictionNearestNavigationDate | null => {
  if (!currentDayNavigationMeta) {
    return null;
  }

  const previousCandidate = currentDayNavigationMeta.prevDate
    ? allDatesData.find((entry) => entry.date === currentDayNavigationMeta.prevDate) || null
    : null;
  const nextCandidate = currentDayNavigationMeta.nextDate
    ? allDatesData.find((entry) => entry.date === currentDayNavigationMeta.nextDate) || null
    : null;

  if (previousCandidate && previousCandidate.games.length > 0) {
    return { date: previousCandidate.date, isPast: true };
  }

  if (nextCandidate && nextCandidate.games.length > 0) {
    return { date: nextCandidate.date, isPast: false };
  }

  const previousKnownEmpty = previousCandidate !== null && previousCandidate.games.length === 0;
  const nextKnownEmpty = nextCandidate !== null && nextCandidate.games.length === 0;

  if (previousKnownEmpty && currentDayNavigationMeta.nextDate) {
    return { date: currentDayNavigationMeta.nextDate, isPast: false };
  }

  if (nextKnownEmpty && currentDayNavigationMeta.prevDate) {
    return { date: currentDayNavigationMeta.prevDate, isPast: true };
  }

  if (currentDayNavigationMeta.prevDate) {
    return { date: currentDayNavigationMeta.prevDate, isPast: true };
  }

  if (currentDayNavigationMeta.nextDate) {
    return { date: currentDayNavigationMeta.nextDate, isPast: false };
  }

  return null;
};

export const hasPredictionAdditionalPastMatches = (
  matchBounds: MatchBounds | null,
  allDatesData: DateGames[],
): boolean => {
  const earliestBoundaryDate = normalizePredictionBoundaryDate(matchBounds?.earliestGameDate);
  const earliestLoadedDate = normalizePredictionBoundaryDate(allDatesData[0]?.date);

  return Boolean(
    matchBounds?.hasData
      && earliestBoundaryDate
      && earliestLoadedDate
      && earliestLoadedDate > earliestBoundaryDate,
  );
};
