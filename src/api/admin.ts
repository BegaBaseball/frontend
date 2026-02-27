// api/admin.ts
import { AdminUser, AdminStats, AdminPost, AdminMate, AdminApiResponse, AdminReport, AdminReportPage } from '../types/admin';
import { getApiBaseUrl } from './apiBase';

// ─── Stadium / Place Types ───────────────────────────────────────────────────

export interface Place {
  id: number;
  stadiumName: string;
  category: string;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  rating?: number;
  openTime?: string;
  closeTime?: string;
}

export interface PlaceFormData {
  name: string;
  category: string;
  description?: string;
  address?: string;
  phone?: string;
  lat: number;
  lng: number;
  rating?: number;
  openTime?: string;
  closeTime?: string;
}

const API_BASE_URL = getApiBaseUrl();

/**
 * 관리자 통계 조회
 */
export const fetchAdminStats = async (): Promise<AdminStats> => {
  const response = await fetch(`${API_BASE_URL}/admin/stats`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('통계 조회 실패');
  }

  const apiResponse: AdminApiResponse<AdminStats> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '통계 조회 실패');
  }

  return apiResponse.data;
};

/**
 * 유저 목록 조회
 */
export const fetchAdminUsers = async (search?: string): Promise<AdminUser[]> => {
  const url = search 
    ? `${API_BASE_URL}/admin/users?search=${encodeURIComponent(search)}`
    : `${API_BASE_URL}/admin/users`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    throw new Error('유저 목록 조회 실패');
  }

  const apiResponse: AdminApiResponse<AdminUser[]> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '유저 목록 조회 실패');
  }

  return apiResponse.data;
};

/**
 * 유저 삭제
 */
export const deleteAdminUser = async (userId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('유저 삭제 실패');
  }

  const apiResponse = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '유저 삭제 실패');
  }
};

/**
 * 게시글 목록 조회
 */
export const fetchAdminPosts = async (): Promise<AdminPost[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/posts`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('게시글 조회 실패');
  }

  const apiResponse: AdminApiResponse<AdminPost[]> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '게시글 조회 실패');
  }

  return apiResponse.data;
};

/**
 * 게시글 삭제
 */
export const deleteAdminPost = async (postId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/posts/${postId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('게시글 삭제 실패');
  }

  const apiResponse = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '게시글 삭제 실패');
  }
};

/**
 * 메이트 목록 조회
 */
export const fetchAdminMates = async (): Promise<AdminMate[]> => {
  const response = await fetch(`${API_BASE_URL}/admin/mates`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('메이트 조회 실패');
  }

  const apiResponse: AdminApiResponse<AdminMate[]> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '메이트 조회 실패');
  }

  return apiResponse.data;
};

/**
 * 메이트 삭제
 */
export const deleteAdminMate = async (mateId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/mates/${mateId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('메이트 삭제 실패');
  }

  const apiResponse = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '메이트 삭제 실패');
  }
};

export const fetchAdminReports = async (params?: {
  status?: string;
  reason?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}): Promise<AdminReportPage> => {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.reason) search.set('reason', params.reason);
  if (params?.fromDate) search.set('fromDate', params.fromDate);
  if (params?.toDate) search.set('toDate', params.toDate);
  search.set('page', String(params?.page ?? 0));
  search.set('size', String(params?.size ?? 20));

  const response = await fetch(`${API_BASE_URL}/admin/reports?${search.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('신고 목록 조회 실패');
  }

  const apiResponse: AdminApiResponse<AdminReportPage> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '신고 목록 조회 실패');
  }
  return apiResponse.data;
};

export const fetchAdminReportDetail = async (reportId: number): Promise<AdminReport> => {
  const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('신고 상세 조회 실패');
  }

  const apiResponse: AdminApiResponse<AdminReport> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '신고 상세 조회 실패');
  }

  return apiResponse.data;
};

export const handleAdminReport = async (
  reportId: number,
  payload: { action: 'TAKE_DOWN' | 'REQUIRE_MODIFICATION' | 'WARNING' | 'DISMISS' | 'RESTORE'; adminMemo?: string }
): Promise<AdminReport> => {
  const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('신고 처리 실패');
  }

  const apiResponse: AdminApiResponse<AdminReport> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '신고 처리 실패');
  }

  return apiResponse.data;
};

export const appealAdminReport = async (reportId: number, appealReason: string): Promise<AdminReport> => {
  const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}/appeal`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appealReason }),
  });

  if (!response.ok) {
    throw new Error('이의제기 등록 실패');
  }

  const apiResponse: AdminApiResponse<AdminReport> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '이의제기 등록 실패');
  }

  return apiResponse.data;
};

// ─── Role Management (SUPER_ADMIN only) ──────────────────────────────────────

export interface RoleChangeResponse {
  userId: number;
  email: string;
  name: string;
  previousRole: string;
  newRole: string;
  changedAt: string;
}

/**
 * 사용자를 ADMIN으로 승격 (SUPER_ADMIN 전용)
 * POST /api/admin/roles/users/{userId}/promote
 */
export const promoteToAdmin = async (userId: number, reason?: string): Promise<RoleChangeResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/roles/users/${userId}/promote`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: reason ?? null }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('SUPER_ADMIN 권한이 필요합니다.');
    }
    throw new Error('역할 승격 실패');
  }

  const apiResponse: AdminApiResponse<RoleChangeResponse> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '역할 승격 실패');
  }

  return apiResponse.data;
};

/**
 * ADMIN을 USER로 강등 (SUPER_ADMIN 전용)
 * POST /api/admin/roles/users/{userId}/demote
 */
export const demoteToUser = async (userId: number, reason?: string): Promise<RoleChangeResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/roles/users/${userId}/demote`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: reason ?? null }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('SUPER_ADMIN 권한이 필요합니다.');
    }
    throw new Error('역할 강등 실패');
  }

  const apiResponse: AdminApiResponse<RoleChangeResponse> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '역할 강등 실패');
  }

  return apiResponse.data;
};

// ─── Stadium Place Management (ADMIN+) ───────────────────────────────────────

/**
 * 구장에 새 장소 추가
 * POST /api/admin/stadiums/{stadiumId}/places
 */
export const createPlace = async (stadiumId: string, data: PlaceFormData): Promise<Place> => {
  const response = await fetch(`${API_BASE_URL}/admin/stadiums/${stadiumId}/places`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 403) throw new Error('관리자 권한이 필요합니다.');
    if (response.status === 404) throw new Error('구장을 찾을 수 없습니다.');
    throw new Error('장소 추가 실패');
  }

  const apiResponse: AdminApiResponse<Place> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '장소 추가 실패');
  }

  return apiResponse.data;
};

/**
 * 장소 정보 수정
 * PUT /api/admin/stadiums/places/{placeId}
 */
export const updatePlace = async (placeId: number, data: PlaceFormData): Promise<Place> => {
  const response = await fetch(`${API_BASE_URL}/admin/stadiums/places/${placeId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 403) throw new Error('관리자 권한이 필요합니다.');
    if (response.status === 404) throw new Error('장소를 찾을 수 없습니다.');
    throw new Error('장소 수정 실패');
  }

  const apiResponse: AdminApiResponse<Place> = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '장소 수정 실패');
  }

  return apiResponse.data;
};

/**
 * 장소 삭제
 * DELETE /api/admin/stadiums/places/{placeId}
 */
export const deletePlace = async (placeId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/admin/stadiums/places/${placeId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 403) throw new Error('관리자 권한이 필요합니다.');
    if (response.status === 404) throw new Error('장소를 찾을 수 없습니다.');
    throw new Error('장소 삭제 실패');
  }

  const apiResponse = await response.json();
  if (!apiResponse.success) {
    throw new Error(apiResponse.message || '장소 삭제 실패');
  }
};
