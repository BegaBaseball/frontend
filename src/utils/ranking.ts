// utils/ranking.ts (기존 파일에 추가)
import { Team } from '../types/ranking';
import { TEAM_ID_TO_CODE, TEAM_NAME_TO_ID } from '../constants/teams';

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
const KAKAO_SDK_INTEGRITY = 'sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4';

let kakaoSdkLoadPromise: Promise<void> | null = null;

const resolveCanonicalRankingTeamId = (value: Pick<Team, 'id' | 'name' | 'shortName'> | string): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    return (
      TEAM_NAME_TO_ID[normalized]
      || TEAM_ID_TO_CODE[normalized.toLowerCase()]
      || normalized.toUpperCase()
    );
  }

  return (
    TEAM_ID_TO_CODE[value.id?.toLowerCase?.() || '']
    || TEAM_NAME_TO_ID[value.shortName]
    || TEAM_NAME_TO_ID[value.name]
    || null
  );
};

/**
 * 팀 ID 배열을 Team 객체 배열로 복원
 */
export const restoreTeamsFromIds = (
  teamIdsInOrder: string[],
  allTeams: Team[]
): (Team | null)[] => {
  const restoredRankings = teamIdsInOrder.map(teamId => {
    const resolvedTeamId = resolveCanonicalRankingTeamId(teamId);
    const team = allTeams.find(t =>
      t.shortName === teamId
      || t.name === teamId
      || t.id === teamId
      || resolveCanonicalRankingTeamId(t) === resolvedTeamId
    );

    if (!team) {
      console.warn(`팀을 찾을 수 없습니다: ${teamId}`, {
        availableShortNames: allTeams.map(t => t.shortName),
        availableNames: allTeams.map(t => t.name),
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
 * Team 객체 배열을 canonical team code 배열로 변환
 */
export const extractTeamIds = (rankings: (Team | null)[]): string[] => {
  return rankings
    .filter(team => team !== null)
    .map(team => {
      const canonicalTeamId = resolveCanonicalRankingTeamId(team!);
      if (!canonicalTeamId) {
        throw new Error(`팀 코드를 찾을 수 없습니다: ${team!.id}`);
      }
      return canonicalTeamId;
    });
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
