// utils/ranking.ts (기존 파일에 추가)
import { Team } from '../types/ranking';

/**
 * 팀 ID 배열을 Team 객체 배열로 복원
 */
export const restoreTeamsFromIds = (
  teamIdsInOrder: string[], 
  allTeams: Team[]
): (Team | null)[] => {
  
  
  
  const restoredRankings = teamIdsInOrder.map(teamId => {
    const team = allTeams.find(t => 
      t.shortName === teamId || 
      t.name === teamId || 
      t.id === teamId
    );
    
    if (!team) {
      console.warn(`팀을 찾을 수 없습니다: ${teamId}`, {
        availableShortNames: allTeams.map(t => t.shortName),
        availableNames: allTeams.map(t => t.name)
      });
    }
    
    return team || null;
  });

  
  return restoredRankings;
};

/**
 * 순위 예측이 완료되었는지 확인 (10개 팀 모두 배치)
 */
export const isRankingComplete = (rankings: (Team | null)[]): boolean => {
  return rankings.every(team => team !== null);
};

/**
 * Team 객체 배열을 팀 ID(shortName) 배열로 변환
 */
export const extractTeamIds = (rankings: (Team | null)[]): string[] => {
  return rankings
    .filter(team => team !== null)
    .map(team => team!.shortName);
};

/**
 * 순위 텍스트 생성 (카카오 공유용)
 */
export const generateRankingText = (rankings: (Team | null)[]): string => {
  return rankings
    .filter(team => team !== null)
    .map((team, index) => `${index + 1}위: ${team!.name}`)
    .join('\n');
};

/**
 * Kakao SDK 초기화 확인
 */
export const isKakaoSDKReady = (): boolean => {
  return typeof window !== 'undefined' && !!window.Kakao && window.Kakao.isInitialized();
};

/**
 * Kakao SDK 초기화
 */
export const initializeKakaoSDK = (appKey: string | undefined): void => {
  if (!appKey) {
    console.warn("Kakao App Key is missing. Kakao SDK initialization skipped.");
    return;
  }

  if (window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(appKey);
  }
};