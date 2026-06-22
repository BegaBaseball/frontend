import type { FetchPostsParams } from '../api/cheerApi';

export type CheerFeedTabKey = 'all' | 'popular' | 'following';

export const getCheerPostsFeedQueryKey = (
    activeFeedTab: CheerFeedTabKey,
    activePostType?: string | null,
    activeSort?: string | null
) => [
    'cheer-posts',
    activeFeedTab,
    activePostType ?? 'all',
    activeSort ?? 'default',
] as const;

/**
 * React Query Keys for Cheer Board
 */
export const CHEER_KEYS = {
    all: ['cheer'] as const,
    posts: (params: FetchPostsParams) => [...CHEER_KEYS.all, 'posts', params] as const,
    myPosts: (params: Pick<FetchPostsParams, 'page' | 'size' | 'sort'> = {}) => [...CHEER_KEYS.all, 'my-posts', params] as const,
    post: (id: number) => [...CHEER_KEYS.all, 'post', id] as const,
    hot: () => [...CHEER_KEYS.all, 'hot'] as const,
    comments: (postId: number) => [...CHEER_KEYS.post(postId), 'comments'] as const,
};
