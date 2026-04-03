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
  blockedByMe?: boolean;
  blockingMe?: boolean;
}

export interface UserFollowSummary {
  id?: number | null;
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

interface RawFollowCountResponse {
  followerCount?: number | string;
  followingCount?: number | string;
  isFollowedByMe?: boolean;
  notifyNewPosts?: boolean;
  blockedByMe?: boolean;
  blockingMe?: boolean;
}

interface RawUserFollowSummary {
  id?: number | string | null;
  handle?: string;
  name?: string;
  profileImageUrl?: string | null;
  favoriteTeam?: string | null;
  isFollowedByMe?: boolean;
}

interface RawPageMeta {
  size?: number;
  number?: number;
  totalElements?: number;
  totalPages?: number;
}

interface RawPageResponse {
  content?: RawUserFollowSummary[];
  last?: boolean;
  totalPages?: number;
  totalElements?: number;
  size?: number;
  number?: number;
  page?: RawPageMeta;
}

const normalizeNumber = (value: number | string | undefined, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const normalizeBoolean = (value: boolean | undefined, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const normalizeUserFollowSummary = (payload: RawUserFollowSummary): UserFollowSummary => ({
  id: payload.id == null ? null : normalizeNumber(payload.id, 0),
  handle: typeof payload.handle === 'string' ? payload.handle : '',
  name: typeof payload.name === 'string' ? payload.name : '',
  profileImageUrl: typeof payload.profileImageUrl === 'string' ? payload.profileImageUrl : null,
  favoriteTeam: typeof payload.favoriteTeam === 'string' ? payload.favoriteTeam : null,
  isFollowedByMe: normalizeBoolean(payload.isFollowedByMe, false),
});

export const normalizeFollowCountResponse = (payload: unknown): FollowCountResponse => {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as RawFollowCountResponse;
  return {
    followerCount: normalizeNumber(raw.followerCount, 0),
    followingCount: normalizeNumber(raw.followingCount, 0),
    isFollowedByMe: normalizeBoolean(raw.isFollowedByMe, false),
    notifyNewPosts: normalizeBoolean(raw.notifyNewPosts, false),
    blockedByMe: normalizeBoolean(raw.blockedByMe, false),
    blockingMe: normalizeBoolean(raw.blockingMe, false),
  };
};

export const buildProfileHandlePath = (handle: string, suffix: string) =>
  `/users/profile/${encodeURIComponent(handle)}/${suffix}`;

export const normalizeUserFollowPageResponse = (payload: unknown): PageResponse<UserFollowSummary> => {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as RawPageResponse;
  const content = Array.isArray(raw.content) ? raw.content.map(normalizeUserFollowSummary) : [];
  const pageMeta = raw.page ?? {};

  const size = normalizeNumber(pageMeta.size ?? raw.size, content.length);
  const number = normalizeNumber(pageMeta.number ?? raw.number, 0);
  const totalElements = normalizeNumber(pageMeta.totalElements ?? raw.totalElements, content.length);
  const totalPages = normalizeNumber(pageMeta.totalPages ?? raw.totalPages, totalElements > 0 ? 1 : 0);
  const last = typeof raw.last === 'boolean'
    ? raw.last
    : totalPages === 0
      ? true
      : number >= totalPages - 1;

  return {
    content,
    last,
    totalPages,
    totalElements,
    size,
    number,
  };
};
