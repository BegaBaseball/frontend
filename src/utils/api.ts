// src/utils/api.ts
import { Party, Application, CheckIn, ChatMessage } from '../types/mate';

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

    return response.json();
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

  // Party
  async getParties() {
    return this.request('/parties');
  },

    async createParty(data: any) {
    return this.request('/parties', {
      method: 'POST',
      body: JSON.stringify(data),
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
};