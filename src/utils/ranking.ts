// utils/ranking.ts
import { Team } from '../types/ranking';

/**
 * 저장된 팀 ID 배열을 Team 객체 배열로 복원
 */
export const restoreTeamsFromIds = (
  teamIds: string[],
  allTeams: Team[]
): (Team | null)[] => {
  return teamIds.map((teamId) => {
    // shortName, name, id 중 하나라도 일치하면 찾기
    const team = allTeams.find(
      (t) =>
        t.shortName === teamId ||
        t.name === teamId ||
        t.id === teamId
    );

    if (!team) {
      console.warn(`팀을 찾을 수 없습니다: ${teamId}`, {
        availableShortNames: allTeams.map((t) => t.shortName),
        availableNames: allTeams.map((t) => t.name),
      });
    }

    return team || null;
  });
};

/**
 * 순위가 완성되었는지 확인
 */
export const isRankingComplete = (rankings: (Team | null)[]): boolean => {
  return rankings.every((team) => team !== null);
};

/**
 * 순위에서 팀 ID 배열 추출
 */
export const extractTeamIds = (rankings: (Team | null)[]): string[] => {
  return rankings
    .filter((team) => team !== null)
    .map((team) => team!.shortName);
};