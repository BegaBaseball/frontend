import type { Application, CheckIn, ChatMessage, Party, PartyReview, PartyStatus } from '../types/mate';
import type { AxiosRequestConfig } from 'axios';
import api from './axios';
import { api as requestApi } from '../utils/api';
import { getApiErrorStatus } from '../utils/api';
import type { PaginatedResponse } from '../utils/api';
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

export type FetchPartyByIdOptions = Parameters<typeof requestApi.getPartyById>[1];

export interface FetchMatePartiesPageParams {
  teamId?: string;
  stadium?: string;
  page?: number;
  size?: number;
  status?: PartyStatus;
  searchQuery?: string;
  gameDate?: string;
  signal?: AbortSignal;
}

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

export const normalizeMateParty = (party: BackendPartyDTO | Party): Party =>
  mapBackendPartyToFrontend(party as BackendPartyDTO);

export async function fetchPartyById(
  partyId: number | string,
  options?: FetchPartyByIdOptions,
): Promise<Party> {
  const response = await requestApi.getPartyById(partyId, options);
  return normalizeMateParty(response);
}

export async function fetchPartyReviews(
  partyId: number | string,
): Promise<PartyReview[]> {
  return requestApi.getPartyReviews(Number(partyId));
}

export async function fetchPartyApplications(
  partyId: number | string,
): Promise<Application[]> {
  return requestApi.getApplicationsByParty(partyId);
}

export async function fetchPartyCheckIns(
  partyId: number | string,
): Promise<CheckIn[]> {
  return requestApi.getCheckInsByParty(partyId);
}

export async function fetchPartyMessages(
  partyId: number | string,
): Promise<ChatMessage[]> {
  return requestApi.getChatMessages(partyId);
}

export async function fetchPartyMyApplication(
  partyId: number | string,
): Promise<Application | null> {
  try {
    return await requestApi.getMyApplicationByParty(partyId);
  } catch (error) {
    if (getApiErrorStatus(error) === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchMatePartiesPage(
  params: FetchMatePartiesPageParams = {},
): Promise<PaginatedResponse<Party>> {
  const response = await requestApi.getParties(
    params.teamId,
    params.stadium,
    params.page ?? 0,
    params.size ?? 9,
    params.status,
    params.searchQuery,
    params.gameDate,
    params.signal,
  );

  return {
    ...response,
    content: response.content.map(normalizeMateParty),
  };
}

/**
 * 전체 파티 목록 조회 (페이징 - 최대 1000개)
 */
export async function fetchAllParties(requestConfig: AxiosRequestConfig = {}): Promise<Party[]> {
  const response = await api.get<ListPayload<BackendPartyDTO> | BackendPartyDTO[]>(`/parties?page=0&size=1000`, requestConfig);

  if (!response.data) {
    throw new Error('파티 목록 조회 실패');
  }

  return toList(response.data).map(normalizeMateParty);
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
    return toList(response.data).map(normalizeMateParty);
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
    await api.post(`/chat/party/${partyId}/read`, undefined, {
      skipGlobalErrorHandler: true,
      skipErrorReporting: true,
    });
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
    const response = await api.get<{ success?: boolean; data?: number }>('/chat/my/unread-counts', {
      skipGlobalErrorHandler: true,
      skipErrorReporting: true,
    });

    const payload = response.data;
    if (payload.success && typeof payload.data === 'number') {
      return payload.data;
    }
    return 0;
  } catch {
    return 0;
  }
}
