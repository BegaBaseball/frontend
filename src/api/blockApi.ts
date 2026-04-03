import { privateGet, privatePost } from './privateClient';
import { UserFollowSummary, PageResponse, normalizeUserFollowPageResponse } from './followShared';

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
export async function toggleBlockByHandle(handle: string): Promise<BlockToggleResponse> {
    return privatePost<BlockToggleResponse>(`/users/profile/${encodeURIComponent(handle)}/block`);
}

/**
 * 내가 차단한 유저 목록 조회
 */
export async function getBlockedUsers(page = 0, size = 20): Promise<PageResponse<UserFollowSummary>> {
    const payload = await privateGet<unknown>(`/users/me/blocked`, {
        params: { page, size },
    }) as PageResponse<UserFollowSummary> | BlockedUsersEnvelope;
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
        return normalizeUserFollowPageResponse(payload.data);
    }
    return normalizeUserFollowPageResponse(payload);
}
