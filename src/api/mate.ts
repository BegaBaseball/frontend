import { MateParty, MateApplication } from '../types/mate';
import api from './axios';

interface ListPayload<T> {
  data?: T | T[];
  content?: T[];
}

/**
 * 현재 사용자 정보 조회
 */
export async function fetchCurrentUser() {
  const response = await api.get('/auth/mypage');

  if (!response.data?.success || !response.data?.data) {
    throw new Error('사용자 정보 조회 실패');
  }

  return response.data;
}

/**
 * 이메일로 사용자 ID 조회
 */
export async function fetchUserIdByEmail(email: string): Promise<number> {
  const response = await api.get<{ data: number }>(`/users/email-to-id?email=${encodeURIComponent(email)}`);

  const data = response.data;
  if (!data || (!data.data && data.data !== 0)) {
    throw new Error('사용자 ID 조회 실패');
  }

  return typeof data.data === 'number' ? data.data : Number(data.data);
}

/**
 * 전체 파티 목록 조회 (페이징 - 최대 1000개)
 */
export async function fetchAllParties(): Promise<MateParty[]> {
  const response = await api.get<ListPayload<MateParty> | MateParty[]>(`/parties?page=0&size=1000`);

  if (!response.data) {
    throw new Error('파티 목록 조회 실패');
  }

  const payload = response.data;
  return Array.isArray(payload) ? payload : payload?.data && Array.isArray(payload.data) ? payload.data : payload?.content || [];
}

/**
 * 사용자의 신청 내역 조회
 */
export async function fetchMyApplications(): Promise<MateApplication[]> {
  const response = await api.get<ListPayload<MateApplication> | MateApplication[]>(`/applications/my`);

  if (!response.data) {
    throw new Error('신청 내역 조회 실패');
  }

  const payload = response.data;
  return Array.isArray(payload) ? payload : payload?.data && Array.isArray(payload.data) ? payload.data : [];
}

/**
 * 사용자가 참여한 파티 목록 조회 (호스트 + 참여자)
 */
export async function fetchMyParties(): Promise<MateParty[]> {
  try {
    const response = await api.get<ListPayload<MateParty> | MateParty[]>(`/parties/my`);

    const payload = response.data;
    return Array.isArray(payload) ? payload : payload?.data && Array.isArray(payload.data) ? payload.data : [];
  } catch (error) {
    console.error('메이트 내역 조회 실패:', error);
    throw error;
  }
}
