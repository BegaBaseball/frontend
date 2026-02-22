import type { DateGames } from '../types/prediction';

export type LeagueTab = 'regular' | 'postseason' | 'koreanseries' | 'scheduled';

interface GameWithStatus {
  gameStatus?: string | null;
}

interface AutoSwitchInput {
  activeLeagueTab: LeagueTab;
  hasUserChangedTab: boolean;
  isLoading: boolean;
  isScheduledLoading: boolean;
  regularCount: number;
  postseasonCount: number;
  koreanSeriesCount: number;
  scheduledPrimaryCount: number;
}

export interface DeepLinkSelection {
  dateIndex: number;
  gameIndex: number;
  reason: 'gameId' | 'date';
}

export const normalizePredictionDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.match(/^\s*(\d{4})(?:[.\-/])(\d{1,2})(?:[.\-/])(\d{1,2})\s*$/);
  const candidate = normalized
    ? `${normalized[1]}-${normalized[2].padStart(2, '0')}-${normalized[3].padStart(2, '0')}`
    : trimmed;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return null;
  }

  const parsedDate = new Date(`${candidate}T00:00:00.000`);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return candidate;
};

export const isPredictionDateParamValid = (value: string | null): value is string => {
  if (!value) {
    return false;
  }

  return normalizePredictionDate(value) !== null;
};

const SCHEDULED_STATUS = 'SCHEDULED';
const POSTPONED_STATUS = 'POSTPONED';
const CANCELLED_STATUS = 'CANCELLED';

export const partitionScheduledGames = <T extends GameWithStatus>(games: T[]) => {
  const primary: T[] = [];
  const secondary: T[] = [];
  const excluded: T[] = [];

  games.forEach((game) => {
    const status = (game.gameStatus || '').toUpperCase();

    if (status === SCHEDULED_STATUS) {
      primary.push(game);
      return;
    }

    if (status === POSTPONED_STATUS || status === CANCELLED_STATUS) {
      secondary.push(game);
      return;
    }

    excluded.push(game);
  });

  return { primary, secondary, excluded };
};

const getCurrentTabCount = (
  activeLeagueTab: LeagueTab,
  regularCount: number,
  postseasonCount: number,
  koreanSeriesCount: number
) => {
  if (activeLeagueTab === 'regular') return regularCount;
  if (activeLeagueTab === 'postseason') return postseasonCount;
  return koreanSeriesCount;
};

export const shouldAutoSwitchToScheduled = ({
  activeLeagueTab,
  hasUserChangedTab,
  isLoading,
  isScheduledLoading,
  regularCount,
  postseasonCount,
  koreanSeriesCount,
  scheduledPrimaryCount,
}: AutoSwitchInput) => {
  if (hasUserChangedTab) return false;
  if (isLoading || isScheduledLoading) return false;
  if (activeLeagueTab === 'scheduled') return false;

  const currentTabCount = getCurrentTabCount(
    activeLeagueTab,
    regularCount,
    postseasonCount,
    koreanSeriesCount
  );

  return currentTabCount === 0 && scheduledPrimaryCount > 0;
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
  date: string
): DeepLinkSelection | null => {
  const targetGameId = gameId.trim();
  const normalizedDate = normalizePredictionDate(date) || date.trim();

  if (targetGameId) {
    for (let dateIndex = 0; dateIndex < allDatesData.length; dateIndex += 1) {
      const gameIndex = allDatesData[dateIndex].games.findIndex((game) => game.gameId === targetGameId);
      if (gameIndex !== -1) {
        return { dateIndex, gameIndex, reason: 'gameId' };
      }
    }
  }

  if (normalizedDate) {
    const dateIndex = allDatesData.findIndex((entry) => entry.date === normalizedDate);
    if (dateIndex !== -1) {
      return { dateIndex, gameIndex: 0, reason: 'date' };
    }
  }

  return null;
};
