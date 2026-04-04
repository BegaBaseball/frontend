import type { DateGames, Game } from '../types/prediction';

interface BoundaryFetchInput {
  currentIndex: number;
  totalDates: number;
  direction: 'past' | 'future';
}

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

export const buildPredictionDateBuckets = (
  games: Game[] = [],
  ensuredDate?: string
): DateGames[] => {
  const safeGames = Array.isArray(games) ? games : [];
  const grouped: Record<string, Game[]> = {};

  safeGames.forEach((game) => {
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
  incomingGames: Game[] = [],
  mergeGames: (base: Game[], incoming: Game[]) => Game[],
  ensuredDate?: string
): DateGames[] => {
  const safeIncomingGames = Array.isArray(incomingGames) ? incomingGames : [];
  const mergedGames = mergeGames(
    existingDates.flatMap((entry) => entry.games),
    safeIncomingGames
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
