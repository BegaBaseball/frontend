import type { Game, Ranking } from '../types/home';

export type HomeRankingDisplay = Ranking & {
  displayName: string;
};

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

export const buildDisplayableRankings = (
  rankings: Ranking[],
  getDisplayName: (teamId: string, teamName: string) => string,
): HomeRankingDisplay[] => {
  const displayable: HomeRankingDisplay[] = [];
  const seenTeamIds = new Set<string>();

  for (const team of rankings) {
    const teamId = (team.teamId || '').trim().toUpperCase();
    if (!teamId || seenTeamIds.has(teamId)) {
      continue;
    }

    seenTeamIds.add(teamId);
    displayable.push({
      ...team,
      teamId,
      displayName: getDisplayName(teamId, team.teamName),
    });
  }

  return displayable;
};
