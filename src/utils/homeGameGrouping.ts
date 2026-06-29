import type { Game } from '../types/home';
import type { LeagueTab } from './homeScheduleClassification';

interface HomeLeagueGamesSummary {
  regularSeasonCount: number;
  postSeasonCount: number;
  koreanSeriesCount: number;
  activeStandardGames: Game[];
}

export const partitionGamesByLeague = (games: Game[]) => {
  const regularSeasonGames: Game[] = [];
  const postSeasonGames: Game[] = [];
  const koreanSeriesGames: Game[] = [];

  for (const game of games) {
    if (game.leagueType === 'REGULAR') {
      regularSeasonGames.push(game);
    } else if (game.leagueType === 'POSTSEASON') {
      postSeasonGames.push(game);
    } else if (game.leagueType === 'KOREAN_SERIES') {
      koreanSeriesGames.push(game);
    }
  }

  return {
    regularSeasonGames,
    postSeasonGames,
    koreanSeriesGames,
  };
};

export const summarizeHomeLeagueGames = (
  games: Game[],
  activeLeagueTab: LeagueTab
): HomeLeagueGamesSummary => {
  let regularSeasonCount = 0;
  let postSeasonCount = 0;
  let koreanSeriesCount = 0;
  const activeStandardGames: Game[] = [];

  for (const game of games) {
    if (game.leagueType === 'REGULAR') {
      regularSeasonCount += 1;
      if (activeLeagueTab === 'regular') {
        activeStandardGames.push(game);
      }
    } else if (game.leagueType === 'POSTSEASON') {
      postSeasonCount += 1;
      if (activeLeagueTab === 'postseason') {
        activeStandardGames.push(game);
      }
    } else if (game.leagueType === 'KOREAN_SERIES') {
      koreanSeriesCount += 1;
      if (activeLeagueTab === 'koreanseries') {
        activeStandardGames.push(game);
      }
    }
  }

  return {
    regularSeasonCount,
    postSeasonCount,
    koreanSeriesCount,
    activeStandardGames,
  };
};

export const groupGamesBySourceDate = (games: Game[], fallbackDate: string): Array<[string, Game[]]> => {
  const groupedGames = new Map<string, Game[]>();

  for (const game of games) {
    const key = game.sourceDate || fallbackDate;
    const existing = groupedGames.get(key);
    if (existing) {
      existing.push(game);
      continue;
    }
    groupedGames.set(key, [game]);
  }

  return [...groupedGames.entries()].sort(([left], [right]) => left.localeCompare(right));
};
