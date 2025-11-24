// api/admin.ts
import { AdminUser, AdminStats, AdminPost, AdminMate, AdminApiResponse } from '../types/admin';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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