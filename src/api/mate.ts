import { getApiErrorStatus } from './errorStatus';
import { privateDelete, privateGet, privatePatch, privatePost } from './privateClient';
import { publicGet } from './publicClient';
import { uploadMediaFile } from './media';
import { mapBackendPartyToFrontend } from '../utils/mate';
import type {
  Application,
  CancelApplicationRequest,
  CancelApplicationResponse,
  CheckIn,
  ChatMessage,
  CreateApplicationRequest,
  CreateCheckInQrSessionRequest,
  CreateCheckInQrSessionResponse,
  CreateCheckInRequest,
  CreatePartyRequest,
  CreateReviewRequest,
  Party,
  PartyReview,
  PartyStatus,
  UpdatePartyRequest,
} from '../types/mate';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  code?: string;
}

interface ListPayload<T> extends ApiEnvelope<T | T[]> {
  content?: T[];
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface KboScheduleItem {
  gameId: string;
  time: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  gameStatus?: string | null;
  gameStatusKr?: string | null;
  homeScore?: number | string | null;
  awayScore?: number | string | null;
}

interface FetchAllPartiesOptions {
  signal?: AbortSignal;
}

export interface FetchPartyByIdOptions {
  signal?: AbortSignal;
  skipGlobalErrorHandler?: boolean;
}

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

export const normalizeMateParty = (party: BackendPartyDTO | Party): Party =>
  mapBackendPartyToFrontend(party as BackendPartyDTO);

export async function getKboSchedule(date: string): Promise<KboScheduleItem[]> {
  return publicGet<KboScheduleItem[]>('/kbo/schedule', {
    params: { date },
  });
}

export async function checkSocialVerified(userId: number): Promise<ApiEnvelope<boolean>> {
  return privateGet<ApiEnvelope<boolean>>(`/users/${userId}/social-verified`, {
    skipAuthSessionHandling: true,
  });
}

export async function fetchPartyById(
  partyId: number | string,
  options?: FetchPartyByIdOptions,
): Promise<Party> {
  const response = await privateGet<BackendPartyDTO>(`/parties/${partyId}`, {
    signal: options?.signal,
  });
  return normalizeMateParty(response);
}

export async function fetchPartyReviews(
  partyId: number | string,
): Promise<PartyReview[]> {
  return privateGet<PartyReview[]>(`/reviews/party/${Number(partyId)}`);
}

export async function fetchPartyApplications(
  partyId: number | string,
): Promise<Application[]> {
  return privateGet<Application[]>(`/applications/party/${partyId}`);
}

export async function fetchPartyCheckIns(
  partyId: number | string,
): Promise<CheckIn[]> {
  return privateGet<CheckIn[]>(`/checkin/party/${partyId}`);
}

export async function fetchPartyMessages(
  partyId: number | string,
): Promise<ChatMessage[]> {
  return privateGet<ChatMessage[]>(`/chat/party/${partyId}`);
}

export async function fetchPartyMyApplication(
  partyId: number | string,
): Promise<Application | null> {
  try {
    return await privateGet<Application | null>(`/applications/party/${partyId}/mine`);
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
  const response = await publicGet<PaginatedResponse<BackendPartyDTO>>('/parties', {
    params: {
      teamId: params.teamId,
      stadium: params.stadium,
      page: params.page ?? 0,
      size: params.size ?? 9,
      status: params.status,
      searchQuery: params.searchQuery,
      date: params.gameDate,
    },
    signal: params.signal,
  });

  return {
    ...response,
    content: response.content.map(normalizeMateParty),
  };
}

export async function fetchAllParties(
  options: FetchAllPartiesOptions = {},
): Promise<Party[]> {
  const response = await publicGet<ListPayload<BackendPartyDTO> | BackendPartyDTO[]>('/parties', {
    params: {
      page: 0,
      size: 1000,
    },
    signal: options.signal,
  });

  return toList(response).map(normalizeMateParty);
}

export async function fetchMyApplications(): Promise<Application[]> {
  const response = await privateGet<ListPayload<Application> | Application[]>('/applications/my');
  return toList(response);
}

export async function fetchMyParties(): Promise<Party[]> {
  try {
    const response = await privateGet<ListPayload<BackendPartyDTO> | BackendPartyDTO[]>('/parties/my');
    return toList(response).map(normalizeMateParty);
  } catch (error) {
    console.error('메이트 내역 조회 실패:', error);
    throw error;
  }
}

export async function createParty(data: CreatePartyRequest): Promise<Party> {
  return privatePost<Party, CreatePartyRequest>('/parties', data, {
    skipAuthSessionHandling: true,
  });
}

export async function updateParty(
  partyId: number,
  data: UpdatePartyRequest,
): Promise<Party> {
  return privatePatch<Party, UpdatePartyRequest>(`/parties/${partyId}`, data);
}

export async function deleteParty(partyId: number | string): Promise<void> {
  await privateDelete(`/parties/${partyId}`);
}

export async function createApplication(
  data: CreateApplicationRequest,
): Promise<Application> {
  return privatePost<Application, CreateApplicationRequest>('/applications', data, {
    skipAuthSessionHandling: true,
  });
}

export async function approveApplication(
  applicationId: string | number,
): Promise<Application> {
  return privatePost<Application, undefined>(`/applications/${applicationId}/approve`);
}

export async function rejectApplication(
  applicationId: string | number,
): Promise<Application> {
  return privatePost<Application, undefined>(`/applications/${applicationId}/reject`);
}

export async function cancelApplicationWithReason(
  applicationId: string | number,
  data: CancelApplicationRequest,
): Promise<CancelApplicationResponse> {
  return privatePost<CancelApplicationResponse, CancelApplicationRequest>(
    `/applications/${applicationId}/cancel`,
    data,
  );
}

export async function createCheckIn(
  data: CreateCheckInRequest,
): Promise<CheckIn> {
  return privatePost<CheckIn, CreateCheckInRequest>('/checkin', data);
}

export async function createCheckInQrSession(
  data: CreateCheckInQrSessionRequest,
): Promise<CreateCheckInQrSessionResponse> {
  return privatePost<CreateCheckInQrSessionResponse, CreateCheckInQrSessionRequest>(
    '/checkin/qr-session',
    data,
  );
}

export async function createReview(
  data: CreateReviewRequest,
): Promise<PartyReview> {
  return privatePost<PartyReview, CreateReviewRequest>('/reviews', data);
}

export async function sendChatMessage(data: {
  partyId: number | string;
  message: string;
  imageUrl?: string;
  clientMessageId: string;
}): Promise<ChatMessage> {
  return privatePost<ChatMessage, typeof data>('/chat/messages', data);
}

export async function uploadChatImage(file: File): Promise<{ path: string; url?: string }> {
  const response = await uploadMediaFile('CHAT', file);
  return {
    path: response.storagePath,
    url: response.publicUrl,
  };
}

export async function updateChatReadTimestamp(partyId: number | string): Promise<void> {
  try {
    await privatePost(`/chat/party/${partyId}/read`);
  } catch (error) {
    console.error('채팅 읽음 처리 실패:', error);
  }
}

export async function getChatUnreadCounts(): Promise<number> {
  try {
    const response = await privateGet<{ success?: boolean; data?: number }>('/chat/my/unread-counts');

    if (response.success && typeof response.data === 'number') {
      return response.data;
    }

    return 0;
  } catch {
    return 0;
  }
}
