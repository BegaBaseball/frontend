import { privateDelete, privateGet, privatePost, privatePut } from './privateClient';
import {
  buildProfileHandlePath,
  normalizeFollowCountResponse,
  normalizeUserFollowPageResponse,
  type FollowCountResponse,
  type PageResponse,
  type FollowToggleResponse,
  type UserFollowSummary,
} from './followShared';

export type {
    FollowCountResponse,
    FollowToggleResponse,
    PageResponse,
    UserFollowSummary,
} from './followShared';

// === API 함수 ===

export async function toggleFollowByHandle(handle: string): Promise<FollowToggleResponse> {
    return privatePost<FollowToggleResponse>(buildProfileHandlePath(handle, 'follow'));
}

export async function updateFollowNotifyByHandle(handle: string, notify: boolean): Promise<FollowToggleResponse> {
    return privatePut<FollowToggleResponse>(buildProfileHandlePath(handle, `follow/notify?notify=${notify}`));
}

export async function getMyFollowCounts(): Promise<FollowCountResponse> {
    const response = await privateGet<unknown>('/users/me/follow-counts');
    return normalizeFollowCountResponse(response);
}

export async function getMyFollowers(page = 0, size = 20): Promise<PageResponse<UserFollowSummary>> {
    const response = await privateGet<unknown>('/users/me/followers', {
        params: { page, size },
    });
    return normalizeUserFollowPageResponse(response);
}

export async function getMyFollowing(page = 0, size = 20): Promise<PageResponse<UserFollowSummary>> {
    const response = await privateGet<unknown>('/users/me/following', {
        params: { page, size },
    });
    return normalizeUserFollowPageResponse(response);
}

/**
 * 팔로워 삭제 (상대방이 나를 팔로우하는 관계 삭제)
 */
export async function removeFollower(followerId: number): Promise<void> {
    await privateDelete<void>(`/users/me/followers/${followerId}`);
}
