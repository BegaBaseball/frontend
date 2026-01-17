// src/utils/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const api = {
  async request(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    if (response.status === 204) {
      return {};
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return {};
  },

  // Stadium
  async getStadiums() {
    return this.request('/stadiums');
  },

  async getStadiumPlaces(stadiumId: string, category: string) {
    return this.request(`/stadiums/${stadiumId}/places?category=${category}`);
  },

  // User
  async getCurrentUser() {
    return this.request('/auth/mypage');
  },

  async getUserIdByEmail(email: string) {
    return this.request(`/users/email-to-id?email=${encodeURIComponent(email)}`);
  },

  async checkSocialVerified(userId: number) {
    return this.request(`/users/${userId}/social-verified`);
  },

  // Party
  async getParties(teamId?: string, stadium?: string, page = 0, size = 9): Promise<{
    content: any[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  }> {
    const params = new URLSearchParams();
    if (teamId) params.append('teamId', teamId);
    if (stadium) params.append('stadium', stadium);
    params.append('page', page.toString());
    params.append('size', size.toString());

    return this.request(`/parties?${params}`);
  },

  async createParty(data: any) {
    return this.request('/parties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPartyById(partyId: string) {
    return this.request(`/parties/${partyId}`);
  },

  // 파티 삭제 추가
  async deleteParty(partyId: string, hostId: number) {
    return this.request(`/parties/${partyId}?hostId=${hostId}`, {
      method: 'DELETE',
    });
  },

  // Application
  async createApplication(data: any) {
    return this.request('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async getApplicationsByParty(partyId: string) {
    return this.request(`/applications/party/${partyId}`);
  },

  async getApplicationsByApplicant(applicantId: number) {
    return this.request(`/applications/applicant/${applicantId}`);
  },

  async approveApplication(applicationId: string) {
    return this.request(`/applications/${applicationId}/approve`, {
      method: 'POST',
    });
  },

  async rejectApplication(applicationId: string) {
    return this.request(`/applications/${applicationId}/reject`, {
      method: 'POST',
    });
  },

  // 신청 취소 추가
  async cancelApplication(applicationId: string, applicantId: number) {
    return this.request(`/applications/${applicationId}?applicantId=${applicantId}`, {
      method: 'DELETE',
    });
  },

  // CheckIn
  async getCheckInsByParty(partyId: string) {
    return this.request(`/checkin/party/${partyId}`);
  },

  async createCheckIn(data: any) {
    return this.request('/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Chat
  async getChatMessages(partyId: string) {
    return this.request(`/chat/party/${partyId}`);
  },

  // Post
  async getPosts(teamId?: string) {
    const query = teamId ? `?teamId=${teamId}` : '';
    return this.request(`/posts${query}`);
  },

  async createPost(data: any) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Notification
  async getNotifications(userId: number) {
    return this.request(`/notifications/user/${userId}`);
  },

  async getUnreadCount(userId: number) {
    return this.request(`/notifications/user/${userId}/unread-count`);
  },

  async markAsRead(notificationId: number) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  async deleteNotification(notificationId: number) {
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },
};