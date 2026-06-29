import { normalizePredictionDate } from './dateKey';

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

const isPrimaryScheduledGame = <T extends GameWithStatus>(game: T, todayKey: string) => {
  const status = (game.gameStatus || '').toUpperCase();

  if (status === SCHEDULED_STATUS) {
    return true;
  }

  if (status === POSTPONED_STATUS || status === CANCELLED_STATUS) {
    return false;
  }

  const gameDateKey = toDateKey(game.sourceDate || game.gameDate);
  const isFutureGame = Boolean(gameDateKey && gameDateKey > todayKey);
  const isUnknownStatus = !status || !NON_UPCOMING_STATUSES.has(status);
  const gameHasScore = hasKnownScore(game.homeScore) && hasKnownScore(game.awayScore);

  return isFutureGame && isUnknownStatus && !gameHasScore;
};

export const hasPrimaryScheduledGame = <T extends GameWithStatus>(
  games: T[],
  options?: { todayKey?: string }
) => {
  const todayKey = options?.todayKey || getTodayKey();
  return games.some((game) => isPrimaryScheduledGame(game, todayKey));
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

    if (isPrimaryScheduledGame(game, todayKey)) {
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
