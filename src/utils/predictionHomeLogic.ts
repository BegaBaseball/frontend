import type { DateGames } from '../types/prediction';

export type LeagueTab = 'regular' | 'postseason' | 'koreanseries' | 'scheduled';

interface GameWithStatus {
  gameStatus?: string | null;
  sourceDate?: string | null;
  gameDate?: string | null;
  homeScore?: number | string | null;
  awayScore?: number | string | null;
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

export interface DeepLinkSelectionOptions {
  allowDateFallback?: boolean;
}

export const normalizePredictionDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.match(/^\s*(\d{4})(?:[.\-/])(\d{1,2})(?:[.\-/])(\d{1,2})(?:[T\s].*)?\s*$/);
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

  const [year, month, day] = candidate.split('-').map(Number);
  if (
    parsedDate.getFullYear() !== year
    || parsedDate.getMonth() + 1 !== month
    || parsedDate.getDate() !== day
  ) {
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
const NON_UPCOMING_STATUSES = new Set([
  'COMPLETED',
  'FINAL',
  'DRAW',
  'LIVE',
  'PLAYING',
  'IN_PROGRESS',
  'INPROGRESS',
]);

const toDateKey = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const primary = value.trim().split('T')[0];
  return normalizePredictionDate(primary);
};

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const hasKnownScore = (value?: number | string | null) => {
  if (value === null || value === undefined) {
    return false;
  }
  const raw = `${value}`.trim();
  if (!raw) {
    return false;
  }
  return Number.isFinite(Number(raw));
};

export const partitionScheduledGames = <T extends GameWithStatus>(
  games: T[],
  options?: { todayKey?: string }
) => {
  const primary: T[] = [];
  const secondary: T[] = [];
  const excluded: T[] = [];
  const todayKey = options?.todayKey || getTodayKey();

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

    const gameDateKey = toDateKey(game.sourceDate || game.gameDate);
    const isFutureGame = Boolean(gameDateKey && gameDateKey > todayKey);
    const isUnknownStatus = !status || !NON_UPCOMING_STATUSES.has(status);
    const gameHasScore = hasKnownScore(game.homeScore) && hasKnownScore(game.awayScore);

    // Fallback classification: future + no score + unknown status should still show as upcoming.
    if (isFutureGame && isUnknownStatus && !gameHasScore) {
      primary.push(game);
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
