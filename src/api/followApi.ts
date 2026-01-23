import api from './axios';

// === 타입 정의 ===

export interface FollowToggleResponse {
    following: boolean;
    notifyNewPosts: boolean;
    followerCount: number;
    followingCount: number;
}

export interface FollowCountResponse {
    followerCount: number;
    followingCount: number;
    isFollowedByMe: boolean;
    notifyNewPosts: boolean;
}

export interface UserFollowSummary {
    id: number;
    handle: string;
    name: string;
    profileImageUrl: string | null;
    favoriteTeam: string | null;
    isFollowedByMe: boolean;
}

export interface PageResponse<T> {
    content: T[];
    last: boolean;
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

// === API 함수 ===

/**
 * 팔로우 토글 (팔로우/언팔로우)
 */
export async function toggleFollow(userId: number): Promise<FollowToggleResponse> {
    const response = await api.post(`/users/${userId}/follow`);
    return response.data;
}

/**
 * 알림 설정 변경
 */
export async function updateFollowNotify(userId: number, notify: boolean): Promise<FollowToggleResponse> {
    const response = await api.put(`/users/${userId}/follow/notify?notify=${notify}`);
    return response.data;
}

/**
 * 팔로우 카운트 및 상태 조회
 */
export async function getFollowCounts(userId: number): Promise<FollowCountResponse> {
    const response = await api.get(`/users/${userId}/follow-counts`);
    return response.data;
}

/**
 * 팔로워 목록 조회
 */
export async function getFollowers(userId: number, page = 0, size = 20): Promise<PageResponse<UserFollowSummary>> {
    const response = await api.get(`/users/${userId}/followers?page=${page}&size=${size}`);
    return response.data;
}

/**
 * 팔로잉 목록 조회
 */
export async function getFollowing(userId: number, page = 0, size = 20): Promise<PageResponse<UserFollowSummary>> {
    const response = await api.get(`/users/${userId}/following?page=${page}&size=${size}`);
    return response.data;
}

/**
 * 팔로워 삭제 (상대방이 나를 팔로우하는 관계 삭제)
 */
export async function removeFollower(followerId: number): Promise<void> {
    await api.delete(`/users/me/followers/${followerId}`);
}
