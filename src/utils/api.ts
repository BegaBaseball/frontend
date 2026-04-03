// src/utils/api.ts
import type {
  Party, Application, CheckIn, PartyReview, ChatMessage, PartyStatus,
  CreatePartyRequest, UpdatePartyRequest, CreateApplicationRequest,
  CreateCheckInRequest, CreateCheckInQrSessionRequest, CreateCheckInQrSessionResponse, CreateReviewRequest,
  CancelApplicationRequest, CancelApplicationResponse,
} from '../types/mate';
import type { UserProfileApiResponse } from '../types/profile';
import type { NotificationData } from '../types/notification';
import type { Stadium, Place } from '../types/stadium';
import apiClient from '../api/axios';
import { SERVER_BASE_URL } from '../constants/config';
import { isAxiosError } from 'axios';

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

const API_BASE_URL = apiClient.defaults.baseURL || '/api';
const FALLBACK_API_BASE_URL = `${SERVER_BASE_URL.replace(/\/$/, '')}/api`;

export class ApiError extends Error {
  status: number;
  data: { message?: string; error?: string; timestamp?: string; code?: string } | null;

  constructor(message: string, status: number, data: ApiError['data'] = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface ApiRequestOptions extends RequestInit {
  skipGlobalErrorHandler?: boolean;
  skipErrorReporting?: boolean;
  allowManualRetry?: boolean;
  skipAuthSessionHandling?: boolean;
}

let notificationUnreadCountEndpointAvailable = true;
let notificationListEndpointAvailable = true;
let notificationAuthFailure = false;

const toRequestHeaders = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return headers.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }

  return headers as Record<string, string>;
};

const isHttpErrorStatus = (error: unknown, statusCode: number): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  Number((error as { status: number | string }).status) === statusCode;

export const getApiErrorStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return null;
  }

  const status = Number((error as { status: number | string }).status);
  return Number.isNaN(status) ? null : status;
};

export const isIgnorableNotificationError = (error: unknown): boolean => {
  const status = getApiErrorStatus(error);
  return status === null || status === 401 || status === 404;
};

export const api = {
  async request<T = unknown>(endpoint: string, options?: ApiRequestOptions, baseUrl = API_BASE_URL): Promise<T> {
    const method = (options?.method || 'GET').toLowerCase() || 'get';
    const headers = toRequestHeaders(options?.headers);
    const url = baseUrl === API_BASE_URL ? endpoint : `${baseUrl}${endpoint}`;

    try {
      const response = await apiClient.request<T>({
        url,
        method,
        data: options?.body,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: options?.signal ?? undefined,
        skipGlobalErrorHandler: options?.skipGlobalErrorHandler,
        skipErrorReporting: options?.skipErrorReporting,
        allowManualRetry: options?.allowManualRetry,
        skipAuthSessionHandling: options?.skipAuthSessionHandling,
      });

      return response.status === 204 ? ({} as T) : (response.data as unknown as T);
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        const apiError = new ApiError(`API Error: ${error.response.status}`, error.response.status, error.response.data ?? null);
        throw apiError;
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('API request failed');
    }
  },

  // Stadium
  async getStadiums(options?: ApiRequestOptions): Promise<Stadium[]> {
    return this.request<Stadium[]>('/stadiums', options);
  },

  async getStadiumPlaces(stadiumId: string, category: string, options?: ApiRequestOptions): Promise<Place[]> {
    return this.request<Place[]>(`/stadiums/${stadiumId}/places?category=${category}`, options);
  },

  async getKboSchedule(date: string): Promise<KboScheduleItem[]> {
    return this.request<KboScheduleItem[]>(`/kbo/schedule?date=${date}`);
  },

  // User
  async getCurrentUser(): Promise<UserProfileApiResponse> {
    return this.request<UserProfileApiResponse>('/auth/mypage');
  },

  async checkSocialVerified(userId: number): Promise<ApiResponse<boolean>> {
    return this.request<ApiResponse<boolean>>(`/users/${userId}/social-verified`);
  },

  // Party
  async getParties(
    teamId?: string,
    stadium?: string,
    page = 0,
    size = 9,
    status?: PartyStatus,
    searchQuery?: string,
    gameDate?: string,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Party>> {
    const params = new URLSearchParams();
    if (teamId) params.append('teamId', teamId);
    if (stadium) params.append('stadium', stadium);
    if (status) params.append('status', status);
    if (searchQuery) params.append('searchQuery', searchQuery);
    if (gameDate) params.append('date', gameDate);
    params.append('page', page.toString());
    params.append('size', size.toString());

    return this.request<PaginatedResponse<Party>>(`/parties?${params}`, { signal });
  },

  async createParty(data: CreatePartyRequest): Promise<Party> {
    return this.request<Party>('/parties', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuthSessionHandling: true,
    });
  },

  async getPartyById(partyId: string | number, options?: ApiRequestOptions): Promise<Party> {
    return this.request<Party>(`/parties/${partyId}`, options);
  },

  async updateParty(partyId: number, data: UpdatePartyRequest): Promise<Party> {
    return this.request<Party>(`/parties/${partyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteParty(partyId: string | number): Promise<void> {
    await this.request(`/parties/${partyId}`, {
      method: 'DELETE',
    });
  },

  // Application
  async createApplication(data: CreateApplicationRequest): Promise<Application> {
    return this.request<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuthSessionHandling: true,
    });
  },

  async getApplicationsByParty(partyId: string | number): Promise<Application[]> {
    return this.request<Application[]>(`/applications/party/${partyId}`);
  },

  async getMyApplications(): Promise<Application[]> {
    return this.request<Application[]>('/applications/my');
  },

  async getMyApplicationByParty(partyId: string | number): Promise<Application | null> {
    return this.request<Application | null>(`/applications/party/${partyId}/mine`);
  },

  async approveApplication(applicationId: string | number): Promise<Application> {
    return this.request<Application>(`/applications/${applicationId}/approve`, {
      method: 'POST',
    });
  },

  async rejectApplication(applicationId: string | number): Promise<Application> {
    return this.request<Application>(`/applications/${applicationId}/reject`, {
      method: 'POST',
    });
  },

  async cancelApplication(applicationId: string | number): Promise<void> {
    await this.request(`/applications/${applicationId}`, {
      method: 'DELETE',
    });
  },

  async cancelApplicationWithReason(
    applicationId: string | number,
    data: CancelApplicationRequest,
  ): Promise<CancelApplicationResponse> {
    return this.request<CancelApplicationResponse>(`/applications/${applicationId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // CheckIn
  async getCheckInsByParty(partyId: string | number): Promise<CheckIn[]> {
    return this.request<CheckIn[]>(`/checkin/party/${partyId}`);
  },

  async createCheckIn(data: CreateCheckInRequest): Promise<CheckIn> {
    return this.request<CheckIn>('/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createCheckInQrSession(data: CreateCheckInQrSessionRequest): Promise<CreateCheckInQrSessionResponse> {
    return this.request<CreateCheckInQrSessionResponse>('/checkin/qr-session', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Chat
  async getChatMessages(partyId: string | number): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/chat/party/${partyId}`);
  },

  async sendChatMessage(data: {
    partyId: number | string;
    message: string;
    imageUrl?: string;
  }): Promise<ChatMessage> {
    return this.request<ChatMessage>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Post (cheerboard - cheerApi.ts 사용 권장)
  async getPosts(teamId?: string) {
    const query = teamId ? `?teamId=${teamId}` : '';
    return this.request(`/cheer/posts${query}`);
  },

  async createPost(data: unknown) {
    return this.request('/cheer/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Notification
  async getNotifications(): Promise<NotificationData[]> {
    if (notificationAuthFailure) {
      return [];
    }

    if (!notificationListEndpointAvailable) {
      return [];
    }

    const requestNotifications = (useFallback: boolean): Promise<NotificationData[]> =>
      this.request<NotificationData[]>('/notifications/my', undefined, useFallback ? FALLBACK_API_BASE_URL : API_BASE_URL);

    try {
      return await requestNotifications(false);
    } catch (error) {
      if (isHttpErrorStatus(error, 401)) {
        notificationAuthFailure = true;
        return [];
      }

      if (isHttpErrorStatus(error, 404) && API_BASE_URL === '/api') {
        try {
          return await requestNotifications(true);
        } catch (fallbackError) {
          if (isHttpErrorStatus(fallbackError, 401)) {
            notificationAuthFailure = true;
            return [];
          }
          if (isHttpErrorStatus(fallbackError, 404) || getApiErrorStatus(fallbackError) === null) {
            notificationListEndpointAvailable = false;
            return [];
          }
          throw fallbackError;
        }
      }

      if (isHttpErrorStatus(error, 404) || getApiErrorStatus(error) === null) {
        notificationListEndpointAvailable = false;
        return [];
      }

      throw error;
    }
  },

  async getUnreadCount(): Promise<number> {
    if (notificationAuthFailure) {
      return 0;
    }

    if (!notificationUnreadCountEndpointAvailable && !notificationListEndpointAvailable) {
      return 0;
    }

    const getUnreadCountFromPath = (path: string, useFallback = false): Promise<number> =>
      this.request<number>(path, undefined, useFallback ? FALLBACK_API_BASE_URL : API_BASE_URL);

    const getNotificationsFromPath = (path: string, useFallback = false): Promise<NotificationData[]> =>
      this.request<NotificationData[]>(path, undefined, useFallback ? FALLBACK_API_BASE_URL : API_BASE_URL);

    const reduceUnreadCount = (notifications: NotificationData[]) =>
      notifications.reduce((count, notification) => (notification.isRead ? count : count + 1), 0);

    if (notificationUnreadCountEndpointAvailable) {
      try {
        return await getUnreadCountFromPath('/notifications/my/unread-count');
      } catch (error) {
        if (isHttpErrorStatus(error, 401)) {
          notificationAuthFailure = true;
          notificationUnreadCountEndpointAvailable = false;
          return 0;
        }
        if (getApiErrorStatus(error) === null) {
          notificationUnreadCountEndpointAvailable = false;
          return 0;
        }

        if (!isHttpErrorStatus(error, 404)) {
          throw error;
        }

        notificationUnreadCountEndpointAvailable = false;
        if (API_BASE_URL === '/api') {
          try {
            return await getUnreadCountFromPath('/notifications/my/unread-count', true);
          } catch (fallbackError) {
            if (isHttpErrorStatus(fallbackError, 401)) {
              notificationAuthFailure = true;
              return 0;
            }
            if (isHttpErrorStatus(fallbackError, 404) || getApiErrorStatus(fallbackError) === null) {
              notificationUnreadCountEndpointAvailable = false;
              return 0;
            }
            throw fallbackError;
          }
        }
      }
    }

    if (!notificationListEndpointAvailable) {
      return 0;
    }

    try {
      const notifications = await this.request<NotificationData[]>('/notifications/my');

      if (!Array.isArray(notifications)) {
        return 0;
      }

      return reduceUnreadCount(notifications);
    } catch (error) {
      if (isHttpErrorStatus(error, 401)) {
        notificationAuthFailure = true;
        return 0;
      }
      if (isHttpErrorStatus(error, 404) && API_BASE_URL === '/api' && FALLBACK_API_BASE_URL !== '/api') {
        try {
          const fallbackNotifications = await getNotificationsFromPath('/notifications/my', true);
          if (!Array.isArray(fallbackNotifications)) {
            return 0;
          }
          return reduceUnreadCount(fallbackNotifications);
        } catch (fallbackError) {
          if (isHttpErrorStatus(fallbackError, 401)) {
            notificationAuthFailure = true;
            return 0;
          }

          if (isHttpErrorStatus(fallbackError, 404) || getApiErrorStatus(fallbackError) === null) {
            notificationListEndpointAvailable = false;
            return 0;
          }
          throw fallbackError;
        }
      }
      if (isHttpErrorStatus(error, 404) || getApiErrorStatus(error) === null) {
        if (!notificationAuthFailure) {
          notificationListEndpointAvailable = false;
        }
        return 0;
      }
      throw error;
    }
  },

  async markAsRead(notificationId: number): Promise<void> {
    await this.request(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  async deleteNotification(notificationId: number): Promise<void> {
    await this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  // Reviews
  async createReview(data: CreateReviewRequest): Promise<PartyReview> {
    return this.request<PartyReview>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPartyReviews(partyId: number): Promise<PartyReview[]> {
    return this.request<PartyReview[]>(`/reviews/party/${partyId}`);
  },

};
