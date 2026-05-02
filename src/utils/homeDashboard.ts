import type { Ranking } from '../types/home';

export type HomeRankingDisplay = Ranking & {
  displayName: string;
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
