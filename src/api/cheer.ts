import { Comment, getFallbackTeamColor, getTeamNameById, Post } from '../store/cheerStore';
import { formatTimeAgo } from '../utils/time';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

export interface PostSummaryRes {
  id: number;
  teamId: string | null;
  teamName: string | null;
  teamShortName: string | null;
  teamColor: string | null;
  title: string;
  author: string;
  authorProfileImageUrl?: string | null;
  createdAt: string;
  comments: number;
  likes: number;
  views: number;
  isHot: boolean;
  postType: string;
}

export interface PostDetailRes {
  id: number;
  teamId: string | null;
  teamName: string | null;
  teamShortName: string | null;
  teamColor: string | null;
  title: string;
  content: string;
  author: string;
  authorEmail: string;
  authorProfileImageUrl?: string | null;
  createdAt: string;
  comments: number;
  likes: number;
  likedByMe: boolean;
  isOwner: boolean;
  imageUrls: string[];
  views: number;
  postType: string;
}

export interface CommentRes {
  id: number;
  author: string;
  authorEmail: string;
  authorTeamId: string | null;
  authorProfileImageUrl?: string | null;
  content: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  replies: CommentRes[];
}

export interface LikeToggleResponse {
  liked: boolean;
  likes: number;
}

async function request<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function listPosts(
  teamId?: string | null,
  page = 0,
  size = 20,
  postType?: string,
): Promise<PageResponse<Post>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (teamId && teamId.trim().length > 0 && teamId !== '없음') {
    params.set('teamId', teamId);
  }
  if (postType) {
    params.set('postType', postType);
  }

  const data = await request<PageResponse<PostSummaryRes>>(
    `${API_BASE_URL}/cheer/posts?${params.toString()}`,
  );

  return {
    ...data,
    content: data.content.map(mapSummaryToPost),
  };
}

export async function getPost(postId: number): Promise<Post> {
  const data = await request<PostDetailRes>(`${API_BASE_URL}/cheer/posts/${postId}`);
  return mapDetailToPost(data);
}

export async function createPost(payload: { teamId: string | null; title: string; content: string; postType?: string }): Promise<Post> {
  const data = await request<PostDetailRes>(`${API_BASE_URL}/cheer/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return mapDetailToPost(data);
}

export async function updatePost(postId: number, payload: { title: string; content: string; postType?: string }): Promise<Post> {
  const data = await request<PostDetailRes>(`${API_BASE_URL}/cheer/posts/${postId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return mapDetailToPost(data);
}

export async function deletePost(postId: number): Promise<void> {
  await request(`${API_BASE_URL}/cheer/posts/${postId}`, {
    method: 'DELETE',
  });
}

export async function togglePostLike(postId: number): Promise<LikeToggleResponse> {
  return request<LikeToggleResponse>(`${API_BASE_URL}/cheer/posts/${postId}/like`, {
    method: 'POST',
  });
}

export async function listComments(postId: number, page = 0, size = 20): Promise<PageResponse<Comment>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  const data = await request<PageResponse<CommentRes>>(
    `${API_BASE_URL}/cheer/posts/${postId}/comments?${params.toString()}`
  );

  return {
    ...data,
    content: data.content.map(mapCommentRes),
  };
}

export async function addComment(postId: number, content: string): Promise<Comment> {
  const data = await request<CommentRes>(`${API_BASE_URL}/cheer/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  return mapCommentRes(data);
}

export async function addReply(postId: number, parentCommentId: number, content: string): Promise<Comment> {
  const data = await request<CommentRes>(`${API_BASE_URL}/cheer/posts/${postId}/comments/${parentCommentId}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  return mapCommentRes(data);
}

export async function toggleCommentLike(commentId: number): Promise<LikeToggleResponse> {
  return request<LikeToggleResponse>(`${API_BASE_URL}/cheer/comments/${commentId}/like`, {
    method: 'POST',
  });
}

export async function deleteComment(commentId: number): Promise<void> {
  await request(`${API_BASE_URL}/cheer/comments/${commentId}`, {
    method: 'DELETE',
  });
}

const mapSummaryToPost = (summary: PostSummaryRes): Post => ({
  id: summary.id,
  teamId: summary.teamId,
  team: summary.teamShortName ?? summary.teamName ?? summary.teamId ?? '',
  teamName: summary.teamName,
  teamShortName: summary.teamShortName,
  teamColor: summary.teamColor ?? getFallbackTeamColor(summary.teamShortName ?? summary.teamId ?? summary.teamName ?? ''),
  title: summary.title,
  author: summary.author,
  authorProfileImageUrl: summary.authorProfileImageUrl,
  createdAt: summary.createdAt,
  timeAgo: formatTimeAgo(summary.createdAt),
  comments: summary.comments,
  likes: summary.likes,
  views: summary.views,
  isHot: summary.isHot,
  postType: summary.postType,
});

const mapDetailToPost = (detail: PostDetailRes): Post => ({
  id: detail.id,
  teamId: detail.teamId,
  team: detail.teamShortName ?? detail.teamName ?? detail.teamId ?? '',
  teamName: detail.teamName,
  teamShortName: detail.teamShortName,
  teamColor: detail.teamColor ?? getFallbackTeamColor(detail.teamShortName ?? detail.teamId ?? detail.teamName ?? ''),
  title: detail.title,
  content: detail.content,
  author: detail.author,
  authorEmail: detail.authorEmail,
  authorProfileImageUrl: detail.authorProfileImageUrl,
  createdAt: detail.createdAt,
  timeAgo: formatTimeAgo(detail.createdAt),
  comments: detail.comments,
  likes: detail.likes,
  likedByUser: detail.likedByMe,
  isOwner: detail.isOwner,
  isHot: detail.postType === 'NOTICE',
  images: detail.imageUrls,
  views: detail.views,
  postType: detail.postType,
});

const mapCommentRes = (comment: CommentRes): Comment => ({
  id: comment.id,
  author: comment.author,
  authorProfileImageUrl: comment.authorProfileImageUrl,
  content: comment.content,
  timeAgo: formatTimeAgo(comment.createdAt),
  authorEmail: comment.authorEmail,
  authorTeamId: comment.authorTeamId ?? undefined,
  likeCount: comment.likeCount,
  likedByMe: comment.likedByMe,
  replies: comment.replies?.map(mapCommentRes) ?? [],
});
