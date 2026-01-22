/**
 * React Query Keys for Cheer Board
 */
export const CHEER_KEYS = {
    all: ['cheer'] as const,
    posts: (params: any) => [...CHEER_KEYS.all, 'posts', params] as const,
    post: (id: number) => [...CHEER_KEYS.all, 'post', id] as const,
    hot: () => [...CHEER_KEYS.all, 'hot'] as const,
    comments: (postId: number) => [...CHEER_KEYS.post(postId), 'comments'] as const,
};
