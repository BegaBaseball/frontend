import api from './axios';
import { UserFollowSummary, PageResponse, normalizeUserFollowPageResponse } from './followApi';

// === 타입 정의 ===

export interface BlockToggleResponse {
    blocked: boolean;
    blockedCount: number;
}

interface BlockedUsersEnvelope {
    success?: boolean;
    data?: unknown;
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
    const response = await api.get<unknown>(`/users/me/blocked?page=${page}&size=${size}`);
    const payload = response.data as PageResponse<UserFollowSummary> | BlockedUsersEnvelope;
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
        return normalizeUserFollowPageResponse(payload.data);
    }
    return normalizeUserFollowPageResponse(payload);
}
