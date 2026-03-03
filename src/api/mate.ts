import type { Application, Party } from '../types/mate';
import api from './axios';
import { compressImage } from '../utils/imageCompression';
import { mapBackendPartyToFrontend } from '../utils/mate';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

interface ListPayload<T> extends ApiEnvelope<T | T[]> {
  content?: T[];
}

type BackendPartyDTO = Parameters<typeof mapBackendPartyToFrontend>[0];

const toList = <T>(payload: ListPayload<T> | T[] | null | undefined): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload) {
    return [];
  }

  if (Array.isArray(payload.content)) {
    return payload.content;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload.data ? [payload.data] : [];
};

/**
 * 현재 사용자 정보 조회
 */
export async function fetchCurrentUser() {
  const response = await api.get<ApiEnvelope<unknown>>('/auth/mypage');

  if (!response.data?.success || response.data?.data == null) {
    throw new Error('사용자 정보 조회 실패');
  }

  return response.data;
}

/**
 * 이메일로 사용자 ID 조회
 */
export async function fetchUserIdByEmail(email: string): Promise<number> {
  const response = await api.get<ApiEnvelope<number>>(`/users/email-to-id?email=${encodeURIComponent(email)}`);

  const data = response.data;
  if (!data?.success || (data.data == null && data.data !== 0)) {
    throw new Error('사용자 ID 조회 실패');
  }

  return typeof data.data === 'number' ? data.data : Number(data.data);
}

/**
 * 전체 파티 목록 조회 (페이징 - 최대 1000개)
 */
export async function fetchAllParties(): Promise<Party[]> {
  const response = await api.get<ListPayload<BackendPartyDTO> | BackendPartyDTO[]>(`/parties?page=0&size=1000`);

  if (!response.data) {
    throw new Error('파티 목록 조회 실패');
  }

  return toList(response.data).map(mapBackendPartyToFrontend);
}

/**
 * 사용자의 신청 내역 조회
 */
export async function fetchMyApplications(): Promise<Application[]> {
  const response = await api.get<ListPayload<Application> | Application[]>(`/applications/my`);

  if (!response.data) {
    throw new Error('신청 내역 조회 실패');
  }

  return toList(response.data);
}

/**
 * 사용자가 참여한 파티 목록 조회 (호스트 + 참여자)
 */
export async function fetchMyParties(): Promise<Party[]> {
  try {
    const response = await api.get<ListPayload<BackendPartyDTO> | BackendPartyDTO[]>(`/parties/my`);
    return toList(response.data).map(mapBackendPartyToFrontend);
  } catch (error) {
    console.error('메이트 내역 조회 실패:', error);
    throw error;
  }
}

/**
 * 채팅 이미지 업로드
 */
export async function uploadChatImage(file: File): Promise<{ path: string; url?: string }> {
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
  const resolvedPath = typeof payload === 'string'
    ? payload
    : payload?.path || payload?.url || payload?.publicUrl;

  if (response.data.success && resolvedPath) {
    const resolvedUrl = typeof payload === 'string' ? undefined : payload?.url || payload?.publicUrl;
    return resolvedUrl ? { path: resolvedPath, url: resolvedUrl } : { path: resolvedPath };
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
