import { getTeamColorByAnyKey, TEAM_DATA } from '../constants/teams';
import { buildPostChangesQuery } from '../utils/cheerPolling';
import { getApiErrorMessage } from '../utils/errorUtils';
import { normalizePageResponseMeta, type PageResponseLike } from '../utils/pageResponsePagination';
import { formatTimeAgo } from '../utils/time';
import type { components } from './generated/openapi';
import { privateDelete, privateGet, privatePost, privatePut } from './privateClient';
import { publicGet } from './publicClient';

export type CheerPostType = 'NORMAL' | 'NOTICE' | 'CHECKIN' | 'RECRUITMENT';
type CreatePostWireRequest = components['schemas']['CreatePostReq'];
type UpdatePostWireRequest = components['schemas']['UpdatePostReq'];
type PostSummaryWire = components['schemas']['PostSummaryRes'];
type PostDetailWire = components['schemas']['PostDetailRes'];
type EmbeddedPostWire = components['schemas']['EmbeddedPostDto'];
type LinkedContentWire = components['schemas']['LinkedContentRes'];
type CheckinLinkedContentWire = components['schemas']['CheckinLinkedContentRes'];
type RecruitmentLinkedContentWire = components['schemas']['RecruitmentLinkedContentRes'];
type LinkedLookupWire = components['schemas']['LinkedPostLookupRes'];

export type ShareMode = NonNullable<CreatePostWireRequest['shareMode']>;
export type SourceInfo = components['schemas']['SourceInfoRes'];

type LinkedContentUnavailableReason = NonNullable<LinkedContentWire['unavailableReason']>;

export type LinkedContent =
  | {
    kind: 'CHECKIN';
    available: true;
    checkin: CheckinLinkedContentWire;
    recruitment?: never;
    unavailableReason?: never;
  }
  | {
    kind: 'RECRUITMENT';
    available: true;
    recruitment: RecruitmentLinkedContentWire;
    checkin?: never;
    unavailableReason?: never;
  }
  | {
    kind: 'CHECKIN' | 'RECRUITMENT';
    available: false;
    unavailableReason: LinkedContentUnavailableReason;
    checkin?: never;
    recruitment?: never;
  };

export type CreatePostPayload = Omit<CreatePostWireRequest, 'postType' | 'teamId'> & {
  teamId: string;
  postType?: CheerPostType;
};

export type LinkedPostLookup = Omit<LinkedLookupWire, 'preview'> & {
  preview?: LinkedContent;
};

export function getTeamNameById(teamId: string | null): string {
  if (!teamId) return '전체';
  if (teamId === 'all') return '전체';
  return TEAM_DATA[teamId]?.fullName || teamId;
}

export interface CheerAuthor {
  id?: number;
  handle: string;
  profileImageUrl?: string;
  teamId?: string;
}

export interface CheerPost {
  id: number;
  teamId: string;
  team: string;
  postType: CheerPostType;
  author: string;
  authorId?: number;
  authorHandle: string;
  authorProfileImageUrl?: string;
  authorTeamId?: string;
  content: string;
  timeAgo: string;
  teamColor: string;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  repostCount: number;
  views: number;
  isHot: boolean;
  createdAt: string;
  updatedAt: string;
  liked: boolean;
  bookmarked: boolean;
  isOwner: boolean;
  repostedByMe: boolean;
  imageUrls?: string[];
  imageUploadFailed?: boolean;
  repostOfId?: number;
  repostType?: RepostType;
  originalPost?: EmbeddedPost;
  originalDeleted?: boolean;
  shareMode?: ShareMode;
  sourceInfo?: SourceInfo;
  linkedContent?: LinkedContent;
}

export interface PageResponse<T> {
  content: T[];
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export type PostSummaryRes = CheerPost;

export interface FetchPostsParams {
  teamId?: string | null;
  postType?: CheerPostType | null;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PostChangesResponse {
  newCount: number;
  latestId: number | null;
}

export type PopularFeedAlgorithm = 'TIME_DECAY' | 'ENGAGEMENT_RATE' | 'HYBRID';

export interface FetchHotPostsParams {
  page?: number;
  size?: number;
  algorithm?: PopularFeedAlgorithm;
}

export interface SearchPostsParams {
  q: string;
  teamId?: string | null;
  page?: number;
  size?: number;
  sort?: string;
}

export interface LikeToggleResponse {
  liked: boolean;
  likes: number;
}

export interface BookmarkToggleResponse {
  bookmarked: boolean;
  count: number;
}

export interface RepostToggleResponse {
  reposted: boolean;
  count: number;
}

export interface EmbeddedPost {
  id: number;
  teamId: string;
  teamColor: string;
  postType: CheerPostType;
  content: string;
  author: string;
  authorHandle: string;
  authorProfileImageUrl?: string;
  createdAt: string;
  imageUrls: string[];
  deleted: boolean;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  linkedContent?: LinkedContent;
}

export type RepostType = 'SIMPLE' | 'QUOTE';

export interface Comment {
  id: number;
  author: string;
  content: string;
  timeAgo: string;
  likes?: number;
  likeCount?: number;
  likedByMe?: boolean;
  authorProfileImageUrl?: string;
  authorHandle?: string;
  authorTeamId?: string;
  replies?: Comment[];
}

interface CommentDTO {
  id: number;
  author: string;
  authorTeamId?: string;
  authorProfileImageUrl?: string;
  authorHandle?: string;
  content: string;
  createdAt: string;
  likeCount: number;
  likedByMe?: boolean;
  replies?: CommentDTO[];
}

export interface ReportPostPayload {
  reason: ReportReason;
  description?: string;
  sourceUrl?: string;
  hasRightEvidence?: boolean;
  license?: string;
  ownerContact?: string;
  requestedReason?: string;
  requestedAction?: string;
  evidenceUrl?: string;
}

export interface ReportCaseResponse {
  caseId: number;
  reportStatus: string;
  handledAt?: string | null;
  nextAction?: string | null;
  adminMessage?: string | null;
}

export interface PostImageDto {
  id: number;
  storagePath: string;
  mimeType: string;
  bytes: number;
  isThumbnail: boolean;
  url: string;
}

interface CheerPublicRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface CheerPrivateRequestOptions extends CheerPublicRequestOptions {
  skipAuthSessionHandling?: boolean;
}

const isCheerPostType = (value: string): value is CheerPostType =>
  value === 'NORMAL' ||
  value === 'NOTICE' ||
  value === 'CHECKIN' ||
  value === 'RECRUITMENT';

export const normalizeCheerPostType = (value?: string | null): CheerPostType => {
  if (value == null) return 'NORMAL';
  if (isCheerPostType(value)) return value;
  throw new Error(`UNKNOWN_CHEER_POST_TYPE:${value}`);
};

const normalizeShareMode = (value?: string | null): ShareMode | undefined => {
  switch (value) {
    case 'INTERNAL_REPOST':
    case 'INTERNAL_QUOTE':
    case 'EXTERNAL_LINK':
    case 'EXTERNAL_COPY':
    case 'EXTERNAL_EMBED':
    case 'EXTERNAL_SUMMARY':
      return value;
    default:
      return undefined;
  }
};

const normalizeRepostType = (value?: string | null): RepostType | undefined => {
  if (value === 'SIMPLE' || value === 'QUOTE') return value;
  return undefined;
};

const normalizeLinkedContent = (value?: LinkedContentWire | null): LinkedContent | undefined => {
  if (value == null) return undefined;

  if (value.available === true && value.kind === 'CHECKIN' && value.checkin && !value.recruitment) {
    return { kind: 'CHECKIN', available: true, checkin: value.checkin };
  }
  if (value.available === true && value.kind === 'RECRUITMENT' && value.recruitment && !value.checkin) {
    return { kind: 'RECRUITMENT', available: true, recruitment: value.recruitment };
  }
  if (
    value.available === false &&
    (value.kind === 'CHECKIN' || value.kind === 'RECRUITMENT') &&
    value.unavailableReason &&
    !value.checkin &&
    !value.recruitment
  ) {
    return {
      kind: value.kind,
      available: false,
      unavailableReason: value.unavailableReason,
    };
  }

  throw new Error('INVALID_LINKED_CONTENT');
};

function transformEmbeddedPost(post: EmbeddedPostWire): EmbeddedPost {
  const teamId = post.teamId ?? '';
  return {
    id: post.id ?? 0,
    teamId,
    teamColor: post.teamColor || getTeamColorByAnyKey(teamId),
    postType: normalizeCheerPostType(post.postType),
    content: post.content || '',
    author: post.author ?? '',
    authorHandle: post.authorHandle ?? '',
    authorProfileImageUrl: post.authorProfileImageUrl,
    createdAt: post.createdAt ?? '',
    imageUrls: post.imageUrls || [],
    deleted: post.deleted ?? false,
    likeCount: post.likeCount ?? 0,
    commentCount: post.commentCount ?? 0,
    repostCount: post.repostCount ?? 0,
    linkedContent: normalizeLinkedContent(post.linkedContent),
  };
}

function transformPost(post: PostSummaryWire | PostDetailWire): CheerPost {
  const teamId = post.teamId ?? '';
  const createdAt = post.createdAt ?? '';
  return {
    id: post.id ?? 0,
    teamId,
    team: teamId,
    teamColor: getTeamColorByAnyKey(teamId),
    content: post.content || '',
    author: post.author ?? '',
    authorHandle: post.authorHandle || '',
    authorProfileImageUrl: post.authorProfileImageUrl,
    authorTeamId: 'authorTeamId' in post ? post.authorTeamId : undefined,
    timeAgo: formatTimeAgo(createdAt),
    likeCount: post.likes ?? 0,
    commentCount: post.comments ?? 0,
    bookmarkCount: post.bookmarkCount ?? 0,
    repostCount: post.repostCount ?? 0,
    views: post.views ?? 0,
    liked: 'liked' in post ? post.liked ?? false : post.likedByMe ?? false,
    bookmarked: post.isBookmarked ?? false,
    imageUrls: post.imageUrls || [],
    isOwner: post.isOwner ?? false,
    repostedByMe: post.repostedByMe ?? false,
    isHot: 'isHot' in post ? post.isHot ?? false : false,
    postType: normalizeCheerPostType(post.postType),
    createdAt,
    updatedAt: createdAt,
    repostOfId: post.repostOfId,
    repostType: normalizeRepostType(post.repostType),
    originalPost: post.originalPost ? transformEmbeddedPost(post.originalPost) : undefined,
    originalDeleted: post.originalDeleted ?? false,
    shareMode: normalizeShareMode(post.shareMode),
    sourceInfo: post.sourceInfo,
    linkedContent: normalizeLinkedContent(post.linkedContent),
  };
}

function transformPostPage(data: PageResponseLike & { content?: PostSummaryWire[] }): PageResponse<CheerPost> {
  const content = Array.isArray(data.content) ? data.content : [];
  const pageMeta = normalizePageResponseMeta(data, content.length);

  return {
    content: content.map(transformPost),
    last: pageMeta.last,
    totalPages: pageMeta.totalPages,
    totalElements: pageMeta.totalElements,
    size: pageMeta.size,
    number: pageMeta.number,
  };
}

const transformComment = (comment: CommentDTO): Comment => ({
  id: comment.id,
  author: comment.author,
  content: comment.content,
  timeAgo: formatTimeAgo(comment.createdAt),
  likeCount: comment.likeCount,
  likedByMe: comment.likedByMe,
  authorProfileImageUrl: comment.authorProfileImageUrl,
  authorHandle: comment.authorHandle,
  authorTeamId: comment.authorTeamId,
  replies: comment.replies ? comment.replies.map(transformComment) : [],
});

const normalizeUploadedImageUrls = (data: unknown): string[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item): string | null => {
      if (typeof item === 'string') {
        return item.trim() || null;
      }

      if (item && typeof item === 'object') {
        const candidate = item as Partial<PostImageDto> & { url?: unknown };
        if (typeof candidate.url === 'string' && candidate.url.trim()) {
          return candidate.url.trim();
        }
        if (typeof candidate.storagePath === 'string' && candidate.storagePath.trim()) {
          return candidate.storagePath.trim();
        }
      }

      return null;
    })
    .filter((url): url is string => Boolean(url));
};

export const fetchPosts = async (params: FetchPostsParams = {}): Promise<PageResponse<CheerPost>> => {
  const { teamId, postType, page = 0, size = 20, sort } = params;
  const response = await publicGet<PageResponse<PostSummaryWire>>('/cheer/posts', {
    params: {
      page,
      size,
      teamId: teamId && teamId !== 'all' ? teamId : undefined,
      postType: postType ?? undefined,
      sort,
    },
  });
  return transformPostPage(response);
};

export const fetchHotPosts = async (
  params: FetchHotPostsParams = {},
  requestOptions: CheerPublicRequestOptions = {},
): Promise<PageResponse<CheerPost>> => {
  const { page = 0, size = 20, algorithm } = params;
  const response = await publicGet<PageResponse<PostSummaryWire>>('/cheer/posts/hot', {
    ...requestOptions,
    params: {
      page,
      size,
      algorithm,
    },
  });
  return transformPostPage(response);
};

export const fetchFollowingPosts = async (
  params: FetchPostsParams = {},
): Promise<PageResponse<CheerPost>> => {
  const { page = 0, size = 20 } = params;
  const response = await privateGet<PageResponse<PostSummaryWire>>('/cheer/posts/following', {
    params: { page, size },
  });
  return transformPostPage(response);
};

export const fetchMyCheerPosts = async (
  params: FetchPostsParams = {},
): Promise<PageResponse<CheerPost>> => {
  const { page = 0, size = 20, sort } = params;
  const response = await privateGet<PageResponse<PostSummaryWire>>('/cheer/me/posts', {
    params: { page, size, sort },
  });
  return transformPostPage(response);
};

export const fetchPostChanges = async (params: {
  sinceId?: number | null;
  teamId?: string | null;
} = {}): Promise<PostChangesResponse> => {
  const query = buildPostChangesQuery(params);
  return publicGet<PostChangesResponse>(`/cheer/posts/changes${query}`);
};

export const searchPosts = async (params: SearchPostsParams): Promise<PageResponse<CheerPost>> => {
  const { q, teamId, page = 0, size = 20, sort } = params;
  const response = await publicGet<PageResponse<PostSummaryWire>>('/cheer/posts/search', {
    params: {
      q,
      page,
      size,
      teamId: teamId && teamId !== 'all' ? teamId : undefined,
      sort,
    },
  });
  return transformPostPage(response);
};

export async function fetchPostDetail(id: number): Promise<CheerPost> {
  try {
    const response = await publicGet<PostDetailWire>(`/cheer/posts/${id}`);
    return transformPost(response);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '게시글을 불러오지 못했습니다.'));
  }
}

export async function createPost(
  data: CreatePostPayload,
  requestOptions: CheerPrivateRequestOptions = {},
) {
  const payload: CreatePostWireRequest = {
    ...data,
    postType: normalizeCheerPostType(data.postType),
  };
  const response = await privatePost<PostDetailWire, CreatePostWireRequest>(
    '/cheer/posts',
    payload,
    requestOptions,
  );
  return transformPost(response);
}

export async function updatePost(
  id: number,
  data: UpdatePostWireRequest,
) {
  const response = await privatePut<PostDetailWire, UpdatePostWireRequest>(`/cheer/posts/${id}`, data);
  return transformPost(response);
}

export async function deletePost(id: number) {
  await privateDelete(`/cheer/posts/${id}`);
}

export async function toggleLike(postId: number): Promise<LikeToggleResponse> {
  return privatePost<LikeToggleResponse, undefined>(`/cheer/posts/${postId}/like`);
}

export async function fetchComments(
  postId: number,
  page = 0,
  size = 20,
  requestOptions: CheerPublicRequestOptions = {},
): Promise<PageResponse<Comment>> {
  const data = await publicGet<PageResponseLike & { content?: CommentDTO[] }>(`/cheer/posts/${postId}/comments`, {
    ...requestOptions,
    params: { page, size },
  });
  const content = Array.isArray(data.content) ? data.content : [];
  const pageMeta = normalizePageResponseMeta(data, content.length);

  return {
    content: content.map(transformComment),
    last: pageMeta.last,
    totalPages: pageMeta.totalPages,
    totalElements: pageMeta.totalElements,
    size: pageMeta.size,
    number: pageMeta.number,
  };
}

export async function createComment(postId: number, content: string): Promise<Comment> {
  const response = await privatePost<CommentDTO, { content: string }>(`/cheer/posts/${postId}/comments`, { content });
  return transformComment(response);
}

export async function deleteComment(commentId: number) {
  await privateDelete(`/cheer/comments/${commentId}`);
}

export async function toggleCommentLike(commentId: number): Promise<LikeToggleResponse> {
  return privatePost<LikeToggleResponse, undefined>(`/cheer/comments/${commentId}/like`);
}

export async function fetchBookmarks(page = 0, size = 20): Promise<{ content: CheerPost[]; hasNext: boolean }> {
  const data = await privateGet<PageResponse<PostSummaryWire>>('/cheer/bookmarks', {
    params: { page, size },
  });
  return {
    content: (data.content ?? []).map(transformPost),
    hasNext: !data.last,
  };
}

export async function toggleBookmark(postId: number): Promise<BookmarkToggleResponse> {
  return privatePost<BookmarkToggleResponse, undefined>(`/cheer/posts/${postId}/bookmark`);
}

export async function toggleRepost(postId: number): Promise<RepostToggleResponse> {
  return privatePost<RepostToggleResponse, undefined>(`/cheer/posts/${postId}/repost`);
}

export async function cancelRepost(repostId: number): Promise<RepostToggleResponse> {
  return privateDelete<RepostToggleResponse>(`/cheer/posts/${repostId}/repost`);
}

export async function createQuoteRepost(postId: number, content: string) {
  const response = await privatePost<PostDetailWire, { content: string }>(`/cheer/posts/${postId}/quote`, { content });
  return transformPost(response);
}

export async function fetchLinkedPostTarget(
  params: { diaryId?: number; partyId?: number },
): Promise<LinkedPostLookup> {
  const response = await privateGet<LinkedLookupWire>('/cheer/posts/linked', { params });
  return {
    ...response,
    preview: normalizeLinkedContent(response.preview),
  };
}

export enum ReportReason {
  SPAM = 'SPAM',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  ABUSIVE_LANGUAGE = 'ABUSIVE_LANGUAGE',
  ADVERTISEMENT = 'ADVERTISEMENT',
  COPYRIGHT_INFRINGEMENT = 'COPYRIGHT_INFRINGEMENT',
  FAKE_INFORMATION = 'FAKE_INFORMATION',
  OTHER = 'OTHER',
}

export const ReportReasonLabels: Record<ReportReason, string> = {
  [ReportReason.SPAM]: '스팸/홍보',
  [ReportReason.INAPPROPRIATE_CONTENT]: '부적절한 콘텐츠',
  [ReportReason.ABUSIVE_LANGUAGE]: '욕설/비하 발언',
  [ReportReason.ADVERTISEMENT]: '상업적 광고',
  [ReportReason.COPYRIGHT_INFRINGEMENT]: '저작권/권리 침해',
  [ReportReason.FAKE_INFORMATION]: '허위 정보/사기성 게시',
  [ReportReason.OTHER]: '기타',
};

export async function reportPost(postId: number, payload: ReportPostPayload): Promise<ReportCaseResponse> {
  return privatePost<ReportCaseResponse, ReportPostPayload>(`/cheer/posts/${postId}/report`, payload);
}

export async function uploadPostImages(
  postId: number,
  files: File[],
  requestOptions: CheerPrivateRequestOptions = {},
): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await privatePost<unknown, FormData>(
    `/cheer/posts/${postId}/images`,
    formData,
    requestOptions,
  );

  return normalizeUploadedImageUrls(response);
}

export async function deleteImage(postId: number, imageUrl: string): Promise<void> {
  void postId;
  void imageUrl;
}

export async function deleteImageById(imageId: number): Promise<void> {
  await privateDelete(`/images/${imageId}`);
}

export async function fetchPostImages(postId: number): Promise<PostImageDto[]> {
  return privateGet<PostImageDto[]>(`/cheer/posts/${postId}/images`);
}
