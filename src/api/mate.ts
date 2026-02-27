import { MateParty, MateApplication } from '../types/mate';
import api from './axios';
import { compressImage } from '../utils/imageCompression';

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

/**
 * 채팅 이미지 업로드
 */
export async function uploadChatImage(file: File): Promise<{ url: string }> {
  let fileToUpload = file;
  try {
    fileToUpload = await compressImage(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      initialQuality: 0.82,
      useWebWorker: true,
    });
  } catch (compressionError) {
    console.warn('채팅 이미지 선압축에 실패하여 원본 업로드를 진행합니다.', compressionError);
    fileToUpload = file;
  }

  const formData = new FormData();
  formData.append('file', fileToUpload);

  const response = await api.postForm('/storage/image', formData);

  type UploadData = { path?: string; url?: string; publicUrl?: string };
  const payload = response.data?.data as UploadData | string | undefined;
  const resolvedValue = typeof payload === 'string'
    ? payload
    : payload?.path || payload?.url || payload?.publicUrl;

  if (response.data.success && resolvedValue) {
    return { url: resolvedValue };
  }

  throw new Error(response.data.message || '사진 업로드에 실패했습니다.');
}

/**
 * 특정 파티 채팅방 읽음 처리
 */
export async function updateChatReadTimestamp(partyId: number | string): Promise<void> {
  try {
    await api.post(`/chat/party/${partyId}/read`);
  } catch (error) {
    console.error('채팅 읽음 처리 실패:', error);
    // 읽음 처리는 백그라운드로 조용히 실패해도 무방함
  }
}

/**
 * 전체 안 읽은 메시지 수 조회
 */
export async function getChatUnreadCounts(): Promise<number> {
  try {
    const response = await api.get<{ success: boolean; data: number }>('/chat/my/unread-counts');
    if (response.data.success && typeof response.data.data === 'number') {
      return response.data.data;
    }
    return 0;
  } catch (error) {
    console.error('안 읽은 메시지 수 조회 실패:', error);
    return 0;
  }
}
