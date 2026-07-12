import { getApiErrorStatus } from './errorStatus';
import { privateDelete, privateGet, privatePatch, privatePost } from './privateClient';
import { publicGet } from './publicClient';
import { uploadMediaFile } from './media';
import { mapBackendPartyToFrontend } from '../utils/mate';
import type { components, paths } from './generated/openapi';
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
  MateHistoryTab,
  MateParty,
  MatePopularSearchTerm,
  Party,
  MatePartySortBy,
  MatePartySortDir,
  PartyReview,
  MatePaymentCapability,
  PartyStatus,
  UpdatePartyRequest,
} from '../types/mate';

type JsonMediaType<Content> = Content extends { 'application/json': infer Response }
  ? Response
  : Content extends { 'application/json;charset=UTF-8': infer Response }
    ? Response
    : Content extends { 'application/json; charset=UTF-8': infer Response }
      ? Response
      : Content extends { '*/*': infer Response }
        ? Response
        : never;

type JsonResponse<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  Status extends number = 200,
> = paths[Path][Method] extends { responses: infer Responses }
  ? Status extends keyof Responses
    ? Responses[Status] extends { content: infer Content }
      ? JsonMediaType<Content>
      : never
    : never
  : never;

type JsonRequestBody<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = paths[Path][Method] extends { requestBody?: infer RequestBody }
  ? NonNullable<RequestBody> extends { content: { 'application/json': infer Body } }
    ? Body
    : never
  : never;

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
  last?: boolean;
}

interface FetchAllPartiesOptions {
  signal?: AbortSignal;
}

export interface FetchPartyByIdOptions {
  signal?: AbortSignal;
}

export interface FetchMatePartiesPageParams {
  teamId?: string;
  stadium?: string;
  page?: number;
  size?: number;
  status?: PartyStatus;
  searchQuery?: string;
  gameDate?: string;
  sortBy?: MatePartySortBy;
  sortDir?: MatePartySortDir;
  signal?: AbortSignal;
}

export interface FetchMyPartyHistoryPageParams {
  group?: MateHistoryTab;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

type PartyPublicWireResponse = JsonResponse<'/api/parties/{id}', 'get'>;
type PartyPrivateWireResponse = JsonResponse<'/api/parties', 'post'>;
type PartyListWireResponse = JsonResponse<'/api/parties', 'get'>;
type MyPartiesWireResponse = JsonResponse<'/api/parties/my', 'get'>;
type MateMapperPartyDTO = Parameters<typeof mapBackendPartyToFrontend>[0];
type BackendPartyDTO = Omit<MateMapperPartyDTO, 'gameTime'> & Partial<PartyPublicWireResponse & PartyPrivateWireResponse> & {
  gameTime: string | components['schemas']['LocalTime'];
  hostId?: number | null;
  hostHandle?: string | null;
  hostProfileImageUrl?: string | null;
  hostFavoriteTeam?: string | null;
  ticketImageUrl?: string | null;
  price?: number | null;
  ticketPrice?: number | null;
  reservationDepositAmount?: number | null;
  hostTrustMetrics?: Party['hostTrustMetrics'];
  favorited?: boolean | null;
  seatDetail?: string | null;
  members?: Party['members'];
};
type BackendMateHistoryDTO = {
  id: number;
  hostId?: number | null;
  hostHandle?: string | null;
  teamId: string;
  cheeringSide?: Party['cheeringSide'];
  gameDate: string;
  gameTime: string | components['schemas']['LocalTime'];
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  section: string;
  maxParticipants: number;
  currentParticipants: number;
  description?: string | null;
  status: PartyStatus;
};
type CreatePartyRequestWire = Omit<CreatePartyRequest, 'gameTime'> & {
  gameTime: components['schemas']['LocalTime'];
};
type UpdatePartyRequestWire = JsonRequestBody<'/api/parties/{id}', 'patch'> & Pick<UpdatePartyRequest, 'reservationDepositAmount' | 'seatDetail'>;
type ApplicationWireResponse = JsonResponse<'/api/applications', 'post'> & Application;
type CreateApplicationRequestWire = JsonRequestBody<'/api/applications', 'post'>;
type CreateApplicationRequestWireCompat = Omit<CreateApplicationRequestWire, 'ticketImageUrl' | 'verificationToken'>
  & Pick<CreateApplicationRequest, 'ticketImageUrl' | 'verificationToken'>;
type CancelApplicationRequestWire = JsonRequestBody<'/api/applications/{applicationId}/cancel', 'post'>;
type CancelApplicationWireResponse = JsonResponse<'/api/applications/{applicationId}/cancel', 'post'> & CancelApplicationResponse;
type CheckInWireResponse = JsonResponse<'/api/checkin', 'post'> & CheckIn;
type CreateCheckInRequestWire = JsonRequestBody<'/api/checkin', 'post'>;
type CreateCheckInQrSessionRequestWire = JsonRequestBody<'/api/checkin/qr-session', 'post'>;
type CreateCheckInQrSessionWireResponse = JsonResponse<'/api/checkin/qr-session', 'post'> & CreateCheckInQrSessionResponse;
type ChatMessageWireResponse = JsonResponse<'/api/chat/messages', 'post', 201> & ChatMessage;
type ChatMessageRequestWire = JsonRequestBody<'/api/chat/messages', 'post'>;
type ReviewWireResponse = JsonResponse<'/api/reviews', 'post', 201> & PartyReview;
type CreateReviewRequestWire = JsonRequestBody<'/api/reviews', 'post'>;
type ChatUnreadCountWireResponse = JsonResponse<'/api/chat/my/unread-counts', 'get'>;
type SocialVerifiedWireResponse = JsonResponse<'/api/users/{userId}/social-verified', 'get'> & { data?: boolean };

export type KboScheduleItem = JsonResponse<'/api/kbo/schedule', 'get'>[number] & {
  gameId: string;
  time: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
};

const toLocalTimeWire = (value: string): components['schemas']['LocalTime'] => {
  const [hour = '0', minute = '0', second = '0'] = value.split(':');
  return {
    hour: Number(hour) || 0,
    minute: Number(minute) || 0,
    second: Number(second) || 0,
    nano: 0,
  };
};

const fromLocalTimeWire = (value: BackendPartyDTO['gameTime']): string => {
  if (typeof value === 'string') {
    return value;
  }

  const hour = `${value.hour ?? 0}`.padStart(2, '0');
  const minute = `${value.minute ?? 0}`.padStart(2, '0');
  const second = `${value.second ?? 0}`.padStart(2, '0');
  return `${hour}:${minute}:${second}`;
};

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

export const normalizeMateParty = (party: BackendPartyDTO | Party): Party => {
  const wireParty = party as BackendPartyDTO;
  const mapperParty: MateMapperPartyDTO = {
    ...wireParty,
    gameTime: fromLocalTimeWire(wireParty.gameTime),
    hostId: wireParty.hostId ?? undefined,
    hostHandle: wireParty.hostHandle ?? undefined,
    hostProfileImageUrl: wireParty.hostProfileImageUrl ?? undefined,
    hostFavoriteTeam: wireParty.hostFavoriteTeam ?? undefined,
    ticketImageUrl: wireParty.ticketImageUrl ?? undefined,
    price: wireParty.price ?? undefined,
    ticketPrice: wireParty.ticketPrice ?? undefined,
    reservationDepositAmount: wireParty.reservationDepositAmount ?? null,
    hostTrustMetrics: wireParty.hostTrustMetrics ?? null,
  };
  const normalized = mapBackendPartyToFrontend(mapperParty);
  const extras = wireParty as {
    favorited?: boolean | null;
    seatDetail?: string | null;
    members?: Party['members'];
  };
  return {
    ...normalized,
    ...(extras.favorited == null ? {} : { favorited: extras.favorited }),
    ...(extras.seatDetail == null ? {} : { seatDetail: extras.seatDetail }),
    ...(extras.members == null ? {} : { members: extras.members }),
  };
};

const normalizeMateHistoryParty = (party: BackendMateHistoryDTO): MateParty => ({
  id: party.id,
  hostId: party.hostId ?? undefined,
  hostHandle: party.hostHandle ?? undefined,
  teamId: party.teamId,
  cheeringSide: party.cheeringSide ?? null,
  gameDate: party.gameDate,
  gameTime: fromLocalTimeWire(party.gameTime),
  stadium: party.stadium,
  homeTeam: party.homeTeam,
  awayTeam: party.awayTeam,
  section: party.section,
  maxParticipants: party.maxParticipants,
  currentParticipants: party.currentParticipants,
  description: party.description ?? undefined,
  status: party.status,
});

export async function getKboSchedule(date: string): Promise<KboScheduleItem[]> {
  return publicGet<KboScheduleItem[]>('/kbo/schedule', {
    params: { date },
  });
}

export async function checkSocialVerified(userId: number): Promise<SocialVerifiedWireResponse> {
  return privateGet<SocialVerifiedWireResponse>(`/users/${userId}/social-verified`, {
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
  return privateGet<Array<JsonResponse<'/api/reviews/party/{partyId}', 'get'>[number] & PartyReview>>(
    `/reviews/party/${Number(partyId)}`,
  );
}

export async function fetchMatePaymentCapability(): Promise<MatePaymentCapability> {
  return privateGet<MatePaymentCapability>('/payments/capability');
}

export async function fetchHostReviews(handle: string): Promise<PartyReview[]> {
  return publicGet<PartyReview[]>(`/reviews/host/${encodeURIComponent(handle)}`);
}

export async function fetchPartyApplications(
  partyId: number | string,
): Promise<Application[]> {
  return privateGet<ApplicationWireResponse[]>(`/applications/party/${partyId}`);
}

export async function fetchPartyCheckIns(
  partyId: number | string,
): Promise<CheckIn[]> {
  return privateGet<Array<JsonResponse<'/api/checkin/party/{partyId}', 'get'>[number] & CheckIn>>(
    `/checkin/party/${partyId}`,
  );
}

export interface FetchPartyMessagesOptions {
  limit?: number;
  beforeId?: number;
}

export async function fetchPartyMessages(
  partyId: number | string,
  options: FetchPartyMessagesOptions = {},
): Promise<ChatMessage[]> {
  return privateGet<Array<JsonResponse<'/api/chat/party/{partyId}', 'get'>[number] & ChatMessage>>(
    `/chat/party/${partyId}`,
    {
      params: {
        limit: options.limit ?? 50,
        beforeId: options.beforeId,
      },
    },
  );
}

export async function fetchPartyMyApplication(
  partyId: number | string,
): Promise<Application | null> {
  try {
    return await privateGet<(JsonResponse<'/api/applications/party/{partyId}/mine', 'get'> & Application) | null>(
      `/applications/party/${partyId}/mine`,
    );
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
  const response = await publicGet<PartyListWireResponse & PaginatedResponse<BackendPartyDTO>>('/parties', {
    params: {
      teamId: params.teamId,
      stadium: params.stadium,
      page: params.page ?? 0,
      size: params.size ?? 9,
      status: params.status,
      searchQuery: params.searchQuery,
      date: params.gameDate,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
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
  const response = await publicGet<PartyListWireResponse | ListPayload<BackendPartyDTO> | BackendPartyDTO[]>('/parties', {
    params: {
      page: 0,
      size: 1000,
    },
    signal: options.signal,
  });

  return toList(response as ListPayload<BackendPartyDTO> | BackendPartyDTO[]).map(normalizeMateParty);
}

export async function fetchPopularMateSearchTerms(limit = 5): Promise<MatePopularSearchTerm[]> {
  return publicGet<MatePopularSearchTerm[]>('/parties/search-terms/popular', {
    params: { limit },
  });
}

export async function recordMateSearchTerm(term: string): Promise<void> {
  await privatePost<null, { term: string }>('/parties/search-terms', { term }, {
    skipAuthSessionHandling: true,
  });
}

export async function fetchMyApplications(): Promise<Application[]> {
  const response = await privateGet<ListPayload<ApplicationWireResponse> | ApplicationWireResponse[]>('/applications/my');
  return toList(response);
}

export async function fetchMyParties(): Promise<Party[]> {
  try {
    const response = await privateGet<MyPartiesWireResponse | ListPayload<BackendPartyDTO> | BackendPartyDTO[]>('/parties/my');
    return toList(response as ListPayload<BackendPartyDTO> | BackendPartyDTO[]).map(normalizeMateParty);
  } catch (error) {
    console.error('메이트 내역 조회 실패:', error);
    throw error;
  }
}

export async function fetchMyPartyHistoryPage(
  params: FetchMyPartyHistoryPageParams = {},
): Promise<PaginatedResponse<MateParty>> {
  const response = await privateGet<PaginatedResponse<BackendMateHistoryDTO>>('/parties/my/history', {
    params: {
      group: params.group ?? 'all',
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
    signal: params.signal,
  });

  return {
    ...response,
    content: response.content.map(normalizeMateHistoryParty),
  };
}

export async function createParty(data: CreatePartyRequest): Promise<Party> {
  const request: CreatePartyRequestWire = {
    ...data,
    gameTime: toLocalTimeWire(data.gameTime),
  };
  const response = await privatePost<BackendPartyDTO, CreatePartyRequestWire>('/parties', request, {
    skipAuthSessionHandling: true,
  });
  return normalizeMateParty(response);
}

export async function updateParty(
  partyId: number,
  data: UpdatePartyRequest,
): Promise<Party> {
  const request: UpdatePartyRequestWire = {
    ...data,
    reservationDepositAmount: data.reservationDepositAmount ?? undefined,
  };
  const response = await privatePatch<BackendPartyDTO, UpdatePartyRequestWire>(
    `/parties/${partyId}`,
    request,
  );
  return normalizeMateParty(response);
}

export async function deleteParty(partyId: number | string): Promise<void> {
  await privateDelete(`/parties/${partyId}`);
}

export async function setPartyFavorite(partyId: number, favorited: boolean): Promise<boolean> {
  const endpoint = `/parties/${partyId}/favorite`;
  const response = favorited
    ? await privatePost<{ favorited?: boolean }>(endpoint)
    : await privateDelete<{ favorited?: boolean }>(endpoint);
  return response?.favorited ?? favorited;
}

export async function createApplication(
  data: CreateApplicationRequest,
): Promise<Application> {
  const request: CreateApplicationRequestWireCompat = { ...data };
  return privatePost<ApplicationWireResponse, CreateApplicationRequestWireCompat>('/applications', request, {
    skipAuthSessionHandling: true,
  });
}

export async function approveApplication(
  applicationId: string | number,
): Promise<Application> {
  return privatePost<ApplicationWireResponse, undefined>(`/applications/${applicationId}/approve`);
}

export async function rejectApplication(
  applicationId: string | number,
): Promise<Application> {
  return privatePost<ApplicationWireResponse, undefined>(`/applications/${applicationId}/reject`);
}

export async function cancelApplicationWithReason(
  applicationId: string | number,
  data: CancelApplicationRequest,
): Promise<CancelApplicationResponse> {
  return privatePost<CancelApplicationWireResponse, CancelApplicationRequestWire>(
    `/applications/${applicationId}/cancel`,
    data,
  );
}

export async function createCheckIn(
  data: CreateCheckInRequest,
): Promise<CheckIn> {
  return privatePost<CheckInWireResponse, CreateCheckInRequestWire>('/checkin', data);
}

export async function createCheckInQrSession(
  data: CreateCheckInQrSessionRequest,
): Promise<CreateCheckInQrSessionResponse> {
  return privatePost<CreateCheckInQrSessionWireResponse, CreateCheckInQrSessionRequestWire>(
    '/checkin/qr-session',
    data,
  );
}

export async function createReview(
  data: CreateReviewRequest,
): Promise<PartyReview> {
  return privatePost<ReviewWireResponse, CreateReviewRequestWire>('/reviews', data);
}

export async function sendChatMessage(data: {
  partyId: number | string;
  message: string;
  imageUrl?: string;
  clientMessageId: string;
}): Promise<ChatMessage> {
  const request: ChatMessageRequestWire = {
    ...data,
    partyId: Number(data.partyId),
  };
  return privatePost<ChatMessageWireResponse, ChatMessageRequestWire>('/chat/messages', request);
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

export async function getChatUnreadCounts(
  requestOptions: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<number> {
  try {
    const response = await privateGet<ChatUnreadCountWireResponse>('/chat/my/unread-counts', requestOptions);

    if (response.success && typeof response.data === 'number') {
      return response.data;
    }

    return 0;
  } catch {
    return 0;
  }
}
