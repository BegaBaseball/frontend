// src/utils/api.ts
import type {
  Party, Application, CheckIn, PartyReview, ChatMessage,
  CreatePartyRequest, UpdatePartyRequest, CreateApplicationRequest,
  CreateCheckInRequest, CreateReviewRequest,
} from '../types/mate';
import type { UserProfileApiResponse } from '../types/profile';
import type { NotificationData } from '../types/notification';
import type { Stadium, Place } from '../types/stadium';

export interface KboScheduleItem {
  gameId: string;
  time: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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

export const api = {
  async request<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
  async getParties(teamId?: string, stadium?: string, page = 0, size = 9, searchQuery?: string, gameDate?: string): Promise<PaginatedResponse<Party>> {
    const params = new URLSearchParams();
    if (teamId) params.append('teamId', teamId);
    if (stadium) params.append('stadium', stadium);
    if (searchQuery) params.append('searchQuery', searchQuery);
    if (gameDate) params.append('gameDate', gameDate);
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

  async deleteParty(partyId: string | number, hostId: number): Promise<void> {
    await this.request(`/parties/${partyId}?hostId=${hostId}`, {
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

  async getApplicationsByApplicant(applicantId: number | string | null): Promise<Application[]> {
    if (applicantId === null) return [];
    return this.request<Application[]>(`/applications/applicant/${applicantId}`);
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

  async cancelApplication(applicationId: string | number, applicantId: number): Promise<void> {
    await this.request(`/applications/${applicationId}?applicantId=${applicantId}`, {
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
  async getNotifications(userId: number): Promise<NotificationData[]> {
    return this.request<NotificationData[]>(`/notifications/user/${userId}`);
  },

  async getUnreadCount(userId: number): Promise<number> {
    return this.request<number>(`/notifications/user/${userId}/unread-count`);
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
