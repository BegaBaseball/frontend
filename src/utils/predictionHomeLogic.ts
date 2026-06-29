import type { DateGames } from '../types/prediction';
import { normalizePredictionDate } from './dateKey';

export { normalizePredictionDate } from './dateKey';
export {
  hasPrimaryScheduledGame,
  partitionScheduledGames,
  shouldAutoSwitchToScheduled,
} from './homeScheduleClassification';
export type { LeagueTab } from './homeScheduleClassification';

export interface DeepLinkSelection {
  dateIndex: number;
  gameIndex: number;
  reason: 'gameId' | 'date';
}

export interface DeepLinkSelectionOptions {
  allowDateFallback?: boolean;
}

export const isPredictionDateParamValid = (value: string | null): value is string => {
  if (!value) {
    return false;
  }

  return normalizePredictionDate(value) !== null;
};

export const resolveInitialPredictionDateIndex = (allDatesData: DateGames[], today: string) => {
  if (allDatesData.length === 0) return 0;

  const nearestUpcomingWithGames = allDatesData.findIndex(
    (entry) => entry.date >= today && entry.games.length > 0
  );
  if (nearestUpcomingWithGames !== -1) return nearestUpcomingWithGames;

  const todayIndex = allDatesData.findIndex((entry) => entry.date === today);
  if (todayIndex !== -1) return todayIndex;

  return allDatesData.length - 1;
};

export const resolveDeepLinkSelection = (
  allDatesData: DateGames[],
  gameId: string,
  date: string,
  options: DeepLinkSelectionOptions = {}
): DeepLinkSelection | null => {
  const targetGameId = gameId.trim();
  const normalizedDate = normalizePredictionDate(date) || date.trim();
  const allowDateFallback = options.allowDateFallback ?? true;

  if (targetGameId) {
    for (let dateIndex = 0; dateIndex < allDatesData.length; dateIndex += 1) {
      const gameIndex = allDatesData[dateIndex].games.findIndex((game) => game.gameId === targetGameId);
      if (gameIndex !== -1) {
        return { dateIndex, gameIndex, reason: 'gameId' };
      }
    }
  }

  if (normalizedDate && (!targetGameId || allowDateFallback)) {
    const dateIndex = allDatesData.findIndex((entry) => entry.date === normalizedDate);
    if (dateIndex !== -1) {
      return { dateIndex, gameIndex: 0, reason: 'date' };
    }
  }

  return null;
};
