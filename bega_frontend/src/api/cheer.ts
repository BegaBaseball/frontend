import { authFetch } from '../utils/devAuth';
import { 
  PostSummary, 
  PostDetail, 
  Comment, 
  CreatePostRequest, 
  UpdatePostRequest,
  CreateCommentRequest, 
  AppUser,
  Page 
} from '../types/cheer';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// 게시글 API
export async function getPosts(teamId?: string, page = 0, size = 20): Promise<Page<PostSummary>> {
  const url = new URL(`${API_BASE}/api/cheer/posts`);
  if (teamId) url.searchParams.append('teamId', teamId);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('size', size.toString());
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch posts'}`);
  }
  return response.json();
}

export async function getPost(id: number): Promise<PostDetail> {
  const response = await authFetch(`${API_BASE}/api/cheer/posts/${id}`);
  if (!response.ok) throw new Error('Failed to fetch post');
  return response.json();
}

export async function createPost(post: CreatePostRequest): Promise<PostDetail> {
  const response = await authFetch(`${API_BASE}/api/cheer/posts`, {
    method: 'POST',
    body: JSON.stringify(post),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to create post'}`);
  }
  return response.json();
}

export async function updatePost(id: number, post: UpdatePostRequest): Promise<PostDetail> {
  const response = await authFetch(`${API_BASE}/api/cheer/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(post),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to update post'}`);
  }
  return response.json();
}

export async function deletePost(id: number): Promise<void> {
  const response = await authFetch(`${API_BASE}/api/cheer/posts/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete post');
}

export async function toggleLike(postId: number): Promise<{ liked: boolean }> {
  const response = await authFetch(`${API_BASE}/api/cheer/posts/${postId}/like`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to toggle like');
  return response.json();
}

// 댓글 API
export async function getComments(postId: number, page = 0, size = 20): Promise<Page<Comment>> {
  const url = new URL(`${API_BASE}/api/cheer/posts/${postId}/comments`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('size', size.toString());
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
}

export async function createComment(postId: number, comment: CreateCommentRequest): Promise<Comment> {
  const response = await authFetch(`${API_BASE}/api/cheer/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(comment),
  });
  if (!response.ok) throw new Error('Failed to create comment');
  return response.json();
}

export async function deleteComment(commentId: number): Promise<void> {
  const response = await authFetch(`${API_BASE}/api/cheer/comments/${commentId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete comment');
}

// 사용자 API
export async function getCurrentUser(): Promise<AppUser> {
  const response = await authFetch(`${API_BASE}/api/dev/me`);
  if (!response.ok) throw new Error('Failed to fetch current user');
  return response.json();
}

export async function updateFavoriteTeam(teamId: string): Promise<AppUser> {
  const response = await authFetch(`${API_BASE}/api/dev/me/favorite-team`, {
    method: 'PATCH',
    body: JSON.stringify({ teamId }),
  });
  if (!response.ok) throw new Error('Failed to update favorite team');
  return response.json();
}