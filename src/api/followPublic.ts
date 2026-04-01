import { publicGet } from './publicClient';
import {
  buildProfileHandlePath,
  normalizeFollowCountResponse,
  normalizeUserFollowPageResponse,
  type FollowCountResponse,
  type PageResponse,
  type UserFollowSummary,
} from './followShared';

export type {
  FollowCountResponse,
  FollowToggleResponse,
  PageResponse,
  UserFollowSummary,
} from './followShared';

export async function getPublicFollowCounts(handle: string): Promise<FollowCountResponse> {
  const response = await publicGet<unknown>(buildProfileHandlePath(handle, 'follow-counts'));
  return normalizeFollowCountResponse(response);
}

export async function getPublicFollowers(handle: string, page = 0, size = 20): Promise<PageResponse<UserFollowSummary>> {
  const response = await publicGet<unknown>(buildProfileHandlePath(handle, `followers?page=${page}&size=${size}`));
  return normalizeUserFollowPageResponse(response);
}

export async function getPublicFollowing(handle: string, page = 0, size = 20): Promise<PageResponse<UserFollowSummary>> {
  const response = await publicGet<unknown>(buildProfileHandlePath(handle, `following?page=${page}&size=${size}`));
  return normalizeUserFollowPageResponse(response);
}
