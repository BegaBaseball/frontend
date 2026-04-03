import { getTeamColorByAnyKey } from '../constants/teams';
import { formatTimeAgo } from '../utils/time';
import { publicGet } from './publicClient';
import type { CheerPost, PageResponse } from './cheerApi';

interface NoticePostResponse {
  id: number;
  teamId: string;
  content: string;
  author: string;
  authorHandle?: string;
  authorProfileImageUrl?: string;
  authorTeamId?: string;
  createdAt: string;
  updatedAt?: string;
  comments?: number;
  likes?: number;
  likeCount?: number;
  commentCount?: number;
  bookmarkCount?: number;
  repostCount?: number;
  views?: number;
  liked?: boolean;
  likedByMe?: boolean;
  bookmarkedByMe?: boolean;
  isBookmarked?: boolean;
  isOwner?: boolean;
  repostedByMe?: boolean;
  isHot?: boolean;
  postType?: string;
  imageUrls?: string[];
}

interface NoticePostPageResponse {
  content?: NoticePostResponse[];
  last?: boolean;
  totalPages?: number;
  totalElements?: number;
  size?: number;
  number?: number;
}

const normalizeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;

const normalizePostType = (postType?: string): CheerPost['postType'] =>
  postType === 'NOTICE' ? 'NOTICE' : 'NORMAL';

const toCheerPost = (post: NoticePostResponse): CheerPost => ({
  id: post.id,
  teamId: post.teamId,
  team: post.teamId,
  postType: normalizePostType(post.postType),
  author: post.author,
  authorId: undefined,
  authorHandle: post.authorHandle || '',
  authorProfileImageUrl: post.authorProfileImageUrl,
  authorTeamId: post.authorTeamId,
  content: post.content || '',
  timeAgo: formatTimeAgo(post.createdAt),
  teamColor: getTeamColorByAnyKey(post.teamId),
  likeCount: post.likeCount ?? post.likes ?? 0,
  commentCount: post.commentCount ?? post.comments ?? 0,
  bookmarkCount: post.bookmarkCount ?? 0,
  repostCount: post.repostCount ?? 0,
  views: post.views ?? 0,
  isHot: post.isHot ?? false,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt ?? post.createdAt,
  liked: post.liked ?? post.likedByMe ?? false,
  bookmarked: post.bookmarkedByMe ?? post.isBookmarked ?? false,
  isOwner: post.isOwner ?? false,
  repostedByMe: post.repostedByMe ?? false,
  imageUrls: post.imageUrls || [],
});

export async function fetchNoticePosts(
  page: number = 0,
  size: number = 100,
): Promise<PageResponse<CheerPost>> {
  const data = await publicGet<NoticePostPageResponse>('/cheer/posts', {
    params: {
      postType: 'NOTICE',
      page,
      size,
    },
  });

  const content = Array.isArray(data?.content) ? data.content.map(toCheerPost) : [];

  return {
    content,
    last: Boolean(data?.last),
    totalPages: normalizeNumber(data?.totalPages, content.length > 0 ? 1 : 0),
    totalElements: normalizeNumber(data?.totalElements, content.length),
    size: normalizeNumber(data?.size, size),
    number: normalizeNumber(data?.number, page),
  };
}
