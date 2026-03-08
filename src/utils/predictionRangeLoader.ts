import type { DateGames, Game } from '../types/prediction';

export type PredictionRangeDirection = 'current' | 'past' | 'future';

export interface PredictionRangeWindowInput {
  anchorDate: string;
  direction: PredictionRangeDirection;
  windowDays: number;
}

export interface PredictionRangeWindow extends PredictionRangeWindowInput {
  startDate: string;
  endDate: string;
}

interface BoundaryFetchInput {
  currentIndex: number;
  totalDates: number;
  direction: 'past' | 'future';
}

const shiftDate = (dateString: string, offsetDays: number): string => {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildPredictionRangeWindow = ({
  anchorDate,
  direction,
  windowDays,
}: PredictionRangeWindowInput): PredictionRangeWindow => {
  const normalizedWindowDays = Math.max(1, windowDays);

  if (direction === 'current') {
    return {
      anchorDate,
      direction,
      windowDays: normalizedWindowDays,
      startDate: anchorDate,
      endDate: anchorDate,
    };
  }

  if (direction === 'future') {
    const startDate = shiftDate(anchorDate, 1);
    return {
      anchorDate,
      direction,
      windowDays: normalizedWindowDays,
      startDate,
      endDate: shiftDate(startDate, normalizedWindowDays - 1),
    };
  }

  const endDate = shiftDate(anchorDate, -1);
  return {
    anchorDate,
    direction,
    windowDays: normalizedWindowDays,
    startDate: shiftDate(endDate, -(normalizedWindowDays - 1)),
    endDate,
  };
};

export const getNextPredictionRangeAnchor = (
  window: Pick<PredictionRangeWindow, 'startDate' | 'endDate'>,
  direction: 'past' | 'future'
) => (direction === 'future' ? window.endDate : window.startDate);

export const shouldFetchPredictionBoundaryRange = ({
  currentIndex,
  totalDates,
  direction,
}: BoundaryFetchInput): boolean => {
  if (totalDates <= 0) {
    return true;
  }

  if (direction === 'past') {
    return currentIndex <= 0;
  }

  return currentIndex >= totalDates - 1;
};

export const findAdjacentLoadedDateIndex = (
  allDatesData: DateGames[],
  anchorDate: string,
  direction: 'past' | 'future'
): number => {
  if (direction === 'future') {
    return allDatesData.findIndex((entry) => entry.date > anchorDate);
  }

  for (let index = allDatesData.length - 1; index >= 0; index -= 1) {
    if (allDatesData[index].date < anchorDate) {
      return index;
    }
  }

  return -1;
};

export const buildPredictionDateBuckets = (
  games: Game[],
  ensuredDate?: string
): DateGames[] => {
  const grouped: Record<string, Game[]> = {};

  games.forEach((game) => {
    const gameDate = game.gameDate || 'unknown';
    if (!grouped[gameDate]) {
      grouped[gameDate] = [];
    }
    grouped[gameDate].push(game);
  });

  const normalized = Object.keys(grouped)
    .sort((left, right) => left.localeCompare(right))
    .map((date) => ({ date, games: grouped[date] }));

  if (ensuredDate && !normalized.some((entry) => entry.date === ensuredDate)) {
    normalized.push({ date: ensuredDate, games: [] });
    normalized.sort((left, right) => left.date.localeCompare(right.date));
  }

  return normalized;
};

export const mergePredictionDateBuckets = (
  existingDates: DateGames[],
  incomingGames: Game[],
  mergeGames: (base: Game[], incoming: Game[]) => Game[],
  ensuredDate?: string
): DateGames[] => {
  const mergedGames = mergeGames(
    existingDates.flatMap((entry) => entry.games),
    incomingGames
  );
  const normalized = buildPredictionDateBuckets(mergedGames, ensuredDate);
  existingDates.forEach((entry) => {
    if (!normalized.some((candidate) => candidate.date === entry.date)) {
      normalized.push({ date: entry.date, games: [] });
    }
  });
  normalized.sort((left, right) => left.date.localeCompare(right.date));
  return normalized;
};
