// utils/ranking.ts (기존 파일에 추가)
import { Team } from '../types/ranking';

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
const KAKAO_SDK_INTEGRITY = 'sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4';

let kakaoSdkLoadPromise: Promise<void> | null = null;

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
 * Kakao SDK 스크립트 로드
 */
const loadKakaoSDK = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.Kakao) {
    return;
  }

  if (kakaoSdkLoadPromise) {
    return kakaoSdkLoadPromise;
  }

  kakaoSdkLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-kakao-sdk="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Kakao SDK')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.integrity = KAKAO_SDK_INTEGRITY;
    script.dataset.kakaoSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Kakao SDK'));
    document.head.appendChild(script);
  });

  try {
    await kakaoSdkLoadPromise;
  } catch (error) {
    kakaoSdkLoadPromise = null;
    throw error;
  }
};

/**
 * Kakao SDK 초기화
 */
export const initializeKakaoSDK = async (appKey: string | undefined): Promise<boolean> => {
  if (!appKey) {
    console.warn("Kakao App Key is missing. Kakao SDK initialization skipped.");
    return false;
  }

  await loadKakaoSDK();

  if (window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(appKey);
  }

  return isKakaoSDKReady();
};
