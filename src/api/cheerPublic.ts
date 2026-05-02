import type {
  CheerPost,
  EmbeddedPost,
  PageResponse,
  RepostType,
  ShareMode,
  SourceInfo,
} from './cheerApi';
import { formatTimeAgo } from '../utils/time';
import { getTeamColorByAnyKey } from '../constants/teams';
import { publicGet } from './publicClient';

interface PostDTO {
  id: number;
  teamId: string;
  teamColor?: string;
  content: string;
  author: string;
  authorId?: number;
  authorHandle: string;
  authorProfileImageUrl?: string;
  authorTeamId?: string;
  createdAt: string;
  updatedAt: string;
  comments: number;
  likes: number;
  likeCount: number;
  commentCount: number;
  bookmarkCount?: number;
  repostCount: number;
  views: number;
  liked: boolean;
  likedByMe?: boolean;
  bookmarkedByMe?: boolean;
  isBookmarked?: boolean;
  isOwner?: boolean;
  repostedByMe?: boolean;
  isHot?: boolean;
  postType?: string;
  imageUrls?: string[];
  imageUploadFailed?: boolean;
  repostOfId?: number;
  repostType?: RepostType;
  originalPost?: PostDTO;
  originalDeleted?: boolean;
  deleted?: boolean;
  shareMode?: ShareMode;
  sourceInfo?: SourceInfo;
}

interface PostPageResponse {
  content: PostDTO[];
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

const normalizePostType = (postType?: string): CheerPost['postType'] =>
  postType === 'NOTICE' ? 'NOTICE' : 'NORMAL';

const transformEmbeddedPost = (post: PostDTO): EmbeddedPost => ({
  id: post.id,
  teamId: post.teamId,
  teamColor: post.teamColor || getTeamColorByAnyKey(post.teamId),
  content: post.content || '',
  author: post.author,
  authorHandle: post.authorHandle,
  authorProfileImageUrl: post.authorProfileImageUrl,
  createdAt: post.createdAt,
  imageUrls: post.imageUrls || [],
  deleted: post.deleted ?? false,
  likeCount: post.likeCount ?? 0,
  commentCount: post.commentCount ?? 0,
  repostCount: post.repostCount ?? 0,
});

const transformPost = (post: PostDTO): CheerPost => ({
  id: post.id,
  teamId: post.teamId,
  team: post.teamId,
  teamColor: getTeamColorByAnyKey(post.teamId),
  content: post.content || '',
  author: post.author,
  authorHandle: post.authorHandle || '',
  authorProfileImageUrl: post.authorProfileImageUrl,
  authorTeamId: post.authorTeamId,
  timeAgo: formatTimeAgo(post.createdAt),
  likeCount: post.likeCount ?? post.likes ?? 0,
  commentCount: post.commentCount ?? post.comments ?? 0,
  bookmarkCount: post.bookmarkCount ?? 0,
  repostCount: post.repostCount ?? 0,
  views: post.views,
  liked: post.liked ?? post.likedByMe ?? false,
  bookmarked: post.bookmarkedByMe ?? post.isBookmarked ?? false,
  imageUrls: post.imageUrls || [],
  isOwner: post.isOwner ?? false,
  repostedByMe: post.repostedByMe ?? false,
  isHot: post.isHot ?? false,
  postType: normalizePostType(post.postType),
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  imageUploadFailed: post.imageUploadFailed,
  repostOfId: post.repostOfId,
  repostType: post.repostType,
  originalPost: post.originalPost ? transformEmbeddedPost(post.originalPost) : undefined,
  originalDeleted: post.originalDeleted ?? false,
  shareMode: post.shareMode,
  sourceInfo: post.sourceInfo,
});

const transformPostPage = (data: PostPageResponse): PageResponse<CheerPost> => ({
  content: data.content.map(transformPost),
  last: data.last,
  totalPages: data.totalPages,
  totalElements: data.totalElements,
  size: data.size,
  number: data.number,
});

export async function fetchUserPostsByHandle(handle: string, page = 0, size = 20): Promise<PageResponse<CheerPost>> {
  const routeHandle = handle.startsWith('@') ? handle.slice(1) : handle;
  const response = await publicGet<PostPageResponse>(`/cheer/user/${encodeURIComponent(routeHandle)}/posts`, {
    params: { page, size },
  });
  return transformPostPage(response);
}
