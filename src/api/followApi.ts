import { privateDelete, privatePost, privatePut } from './privateClient';
import { buildProfileHandlePath, type FollowToggleResponse } from './followShared';

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

/**
 * 팔로워 삭제 (상대방이 나를 팔로우하는 관계 삭제)
 */
export async function removeFollower(followerId: number): Promise<void> {
    await privateDelete<void>(`/users/me/followers/${followerId}`);
}
