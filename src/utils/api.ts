// src/utils/api.ts
import type {
  Party, Application, CheckIn, PartyReview, ChatMessage, PartyStatus,
  CreatePartyRequest, UpdatePartyRequest, CreateApplicationRequest,
  CreateCheckInRequest, CreateReviewRequest,
} from '../types/mate';
import type { UserProfileApiResponse } from '../types/profile';
import type { NotificationData } from '../types/notification';
import type { Stadium, Place } from '../types/stadium';
import { getApiBaseUrl } from '../api/apiBase';
import { SERVER_BASE_URL } from '../constants/config';

export interface KboScheduleItem {
  gameId: string;
  time: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
}

const API_BASE_URL = getApiBaseUrl();
const FALLBACK_API_BASE_URL = `${SERVER_BASE_URL.replace(/\/$/, '')}/api`;

export class ApiError extends Error {
  status: number;
  data: { message?: string; error?: string; timestamp?: string } | null;

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

let notificationUnreadCountEndpointAvailable = true;
let notificationListEndpointAvailable = true;
let notificationAuthFailure = false;

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
  async request<T = unknown>(endpoint: string, options?: RequestInit, baseUrl = API_BASE_URL): Promise<T> {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const apiError = new ApiError(`API Error: ${response.status}`, response.status);
      try {
        apiError.data = await response.json();
      } catch {
        apiError.data = null;
      }
      throw apiError;
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return {} as T;
  },

  // Stadium
  async getStadiums(): Promise<Stadium[]> {
    return this.request<Stadium[]>('/stadiums');
  },

  async getStadiumPlaces(stadiumId: string, category: string): Promise<Place[]> {
    return this.request<Place[]>(`/stadiums/${stadiumId}/places?category=${category}`);
  },

  async getKboSchedule(date: string): Promise<KboScheduleItem[]> {
    return this.request<KboScheduleItem[]>(`/kbo/schedule?date=${date}`);
  },

  // User
  async getCurrentUser(): Promise<UserProfileApiResponse> {
    return this.request<UserProfileApiResponse>('/auth/mypage');
  },

  async getUserIdByEmail(email: string): Promise<ApiResponse<number>> {
    return this.request<ApiResponse<number>>(`/users/email-to-id?email=${encodeURIComponent(email)}`);
  },

  async checkSocialVerified(userId: number): Promise<ApiResponse<boolean>> {
    return this.request<ApiResponse<boolean>>(`/users/${userId}/social-verified`);
  },

  // Party
  async getParties(teamId?: string, stadium?: string, page = 0, size = 9, status?: PartyStatus, searchQuery?: string, gameDate?: string): Promise<PaginatedResponse<Party>> {
    const params = new URLSearchParams();
    if (teamId) params.append('teamId', teamId);
    if (stadium) params.append('stadium', stadium);
    if (status) params.append('status', status);
    if (searchQuery) params.append('searchQuery', searchQuery);
    if (gameDate) params.append('date', gameDate);
    params.append('page', page.toString());
    params.append('size', size.toString());

    return this.request<PaginatedResponse<Party>>(`/parties?${params}`);
  },

  async createParty(data: CreatePartyRequest): Promise<Party> {
    return this.request<Party>('/parties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPartyById(partyId: string | number): Promise<Party> {
    return this.request<Party>(`/parties/${partyId}`);
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
    });
  },

  async getApplicationsByParty(partyId: string | number): Promise<Application[]> {
    return this.request<Application[]>(`/applications/party/${partyId}`);
  },

  async getMyApplications(): Promise<Application[]> {
    return this.request<Application[]>('/applications/my');
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

  // Chat
  async getChatMessages(partyId: string | number): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/chat/party/${partyId}`);
  },

  // Post (cheerboard 타입은 별도 도메인 — 향후 타입 추가)
  async getPosts(teamId?: string) {
    const query = teamId ? `?teamId=${teamId}` : '';
    return this.request(`/posts${query}`);
  },

  async createPost(data: unknown) {
    return this.request('/posts', {
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

  async getUserAverageRating(userId: number): Promise<number> {
    return this.request<number>(`/reviews/user/${userId}/average`);
  },
};
