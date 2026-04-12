import type { Game } from '../types/home';

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
