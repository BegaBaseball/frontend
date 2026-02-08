import api from './axios';
import { UserFollowSummary, PageResponse } from './followApi';

// === 타입 정의 ===

export interface BlockToggleResponse {
    blocked: boolean;
    blockedCount: number;
}

// === API 함수 ===

/**
 * 차단 토글 (차단/차단해제)
 */
export async function toggleBlock(userId: number): Promise<BlockToggleResponse> {
    const response = await api.post(`/users/${userId}/block`);
    return response.data;
}

/**
 * 내가 차단한 유저 목록 조회
 */
export async function getBlockedUsers(page = 0, size = 20): Promise<PageResponse<UserFollowSummary>> {
    const response = await api.get(`/users/me/blocked?page=${page}&size=${size}`);
    return response.data;
}
