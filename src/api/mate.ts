import { MateParty, MateApplication } from '../types/mate';

const API_BASE = '/api';

/**
 * 현재 사용자 정보 조회
 */
export async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE}/auth/mypage`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('사용자 정보 조회 실패');
  }

  return response.json();
}

/**
 * 이메일로 사용자 ID 조회
 */
export async function fetchUserIdByEmail(email: string): Promise<number> {
  const response = await fetch(
    `${API_BASE}/users/email-to-id?email=${encodeURIComponent(email)}`,
    { credentials: 'include' }
  );

  if (!response.ok) {
    throw new Error('사용자 ID 조회 실패');
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * 전체 파티 목록 조회 (페이징 - 최대 1000개)
 */
export async function fetchAllParties(): Promise<MateParty[]> {
  // 페이징 파라미터 추가
  const response = await fetch(`${API_BASE}/parties?page=0&size=1000`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('파티 목록 조회 실패');
  }

  const data = await response.json();
  return data.content || [];
}

/**
 * 사용자의 신청 내역 조회
 */
export async function fetchUserApplications(userId: number): Promise<MateApplication[]> {
  const response = await fetch(`/api/applications/applicant/${userId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('신청 내역 조회 실패');
  }

  return response.json();
}

/**
 * 사용자가 참여한 파티 목록 조회 (호스트 + 참여자)
 */
export async function fetchMyParties(): Promise<MateParty[]> {
  try {
    // 1. 사용자 정보
    const userData = await fetchCurrentUser();
    const userId = await fetchUserIdByEmail(userData.data.email);

    // 2. 백엔드에서 필터링된 내 파티 목록 가져오기
    const response = await fetch(`${API_BASE}/parties/my/${userId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('내 파티 목록 조회 실패');
    }

    return response.json();
  } catch (error) {
    console.error('메이트 내역 조회 실패:', error);
    throw error;
  }
}