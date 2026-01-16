import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as cheerApi from '../api/cheerApi';
import { PostImageDto } from '../api/cheerApi';

export const useCheerPost = (id: number) => {
    return useQuery({
        queryKey: ['cheer-post', id],
        queryFn: () => cheerApi.fetchPostDetail(id),
        enabled: !!id,
    });
};

export const useCheerMutations = () => {
    const queryClient = useQueryClient();

    const toggleLikeMutation = useMutation({
        mutationFn: cheerApi.toggleLike,
        onMutate: async (postId) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['cheer-post', postId] });
            await queryClient.cancelQueries({ queryKey: ['cheer-posts'] });

            // Snapshot the previous value
            const previousPost = queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', postId]);

            // Snapshot previous lists (we actuall store the previous state of ALL lists is expensive/hard,
            // generally react-query v5 recommends simpler rollback or just invalidation. 
            // For v4/v5, setQueriesData returns the old data.
            // However, to keep it simple and robust, we will just optimistic update and invalidate on error/success.
            // Getting exact rollback for setQueriesData is complex without verbose code.
            // Let's rely on standard pattern: Snapshot -> Update -> Error? Rollback.

            // We need to snapshot all 'cheer-posts' queries to rollback correctly? 
            // Actually, querying all active queries to snapshot is possible.
            // Simplified approach: Optimistic update, if error -> Invalidate (Refetch). 
            // Providing exact rollback for infinite lists is often overkill if failure rate is low.
            // But let's try to do it right if possible. 
            // Since we can't easily snapshot "all" queries dynamically for rollback in a variable,
            // we will stick to invalidating on error if we can't rollback perfectly. 
            // LIMITATION: Use single post snapshot for single post. For lists, we'll try to update.
            // If error, we'll just invalidate 'cheer-posts' to re-fetch true state.

            // Optimistically update single post
            if (previousPost) {
                queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], {
                    ...previousPost,
                    likes: previousPost.likedByUser ? previousPost.likes - 1 : previousPost.likes + 1,
                    likedByUser: !previousPost.likedByUser,
                });
            }

            // Optimistically update lists
            queryClient.setQueriesData({ queryKey: ['cheer-posts'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.map((post: any) => {
                            if (post.id === postId) {
                                return {
                                    ...post,
                                    likes: post.likedByUser ? post.likes - 1 : post.likes + 1,
                                    likedByUser: !post.likedByUser,
                                };
                            }
                            return post;
                        }),
                    })),
                };
            });

            return { previousPost };
        },
        onError: (_err, postId, context) => {
            if (context?.previousPost) {
                queryClient.setQueryData(['cheer-post', postId], context.previousPost);
            }
            // For lists, since we didn't snapshot them perfectly, we force a refetch
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
        },
        onSuccess: (data, postId) => {
            // Update single post with server response
            queryClient.setQueryData(['cheer-post', postId], (old: cheerApi.CheerPost | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    likes: data.likes,
                    likedByUser: data.liked,
                };
            });

            // Update lists with server response results (better than invalidating!)
            queryClient.setQueriesData({ queryKey: ['cheer-posts'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.map((post: any) => {
                            if (post.id === postId) {
                                return {
                                    ...post,
                                    likes: data.likes,
                                    likedByUser: data.liked,
                                };
                            }
                            return post;
                        }),
                    })),
                };
            });

            // Finally invalidate to ensure consistency (optional but recommended)
            // queryClient.invalidateQueries({ queryKey: ['cheer-posts'] }); 
            // We can skip invalidation if we are confident in our update, but keeping it safe:
            // Let's NOT invalidate immediately to prevent UI jumps, but maybe invalidate in background?
            // Actually, if we updated correctly, we don't need to invalidate immediately. 
            // StaleTime will handle it.
        },
    });

    const toggleBookmarkMutation = useMutation({
        mutationFn: cheerApi.toggleBookmark,
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ['cheer-post', postId] });
            const previousPost = queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', postId]);

            if (previousPost) {
                queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], {
                    ...previousPost,
                    isBookmarked: !previousPost.isBookmarked,
                });
            }
            return { previousPost };
        },
        onError: (_err, postId, context) => {
            if (context?.previousPost) {
                queryClient.setQueryData(['cheer-post', postId], context.previousPost);
            }
        },
        onSuccess: (_data, postId) => {
            queryClient.invalidateQueries({ queryKey: ['cheer-post', postId] });
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
        },
    });

    const createPostMutation = useMutation({
        mutationFn: async (data: { teamId: string; title: string; content: string; postType?: string; files?: File[] }) => {
            // 1. Create Post
            const newPost = await cheerApi.createPost({
                teamId: data.teamId,
                title: data.title,
                content: data.content,
                postType: data.postType,
            });

            // 2. Upload Images if any
            if (newPost && newPost.id && data.files && data.files.length > 0) {
                await cheerApi.uploadPostImages(newPost.id, data.files);
            }
            return newPost;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
        },
    });

    const updatePostMutation = useMutation({
        mutationFn: async ({ id, data, newFiles, deletingImageIds }: {
            id: number;
            data: { title: string; content: string };
            newFiles?: File[];
            deletingImageIds?: number[];
        }) => {
            // 1. Update text content
            await cheerApi.updatePost(id, data);

            // 2. Delete images if requested
            if (deletingImageIds && deletingImageIds.length > 0) {
                for (const imgId of deletingImageIds) {
                    await cheerApi.deleteImageById(imgId);
                }
            }

            // 3. Upload new images if any
            if (newFiles && newFiles.length > 0) {
                await cheerApi.uploadPostImages(id, newFiles);
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cheer-post', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
        },
    });

    const deletePostMutation = useMutation({
        mutationFn: cheerApi.deletePost,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: cheerApi.deleteComment,
        onMutate: async (commentId) => {
            // We can't easily find the postId from commentId alone without context,
            // so we might need to invalidate 'cheer-posts' or specific post comments.
            // Ideally we should pass postId to onMutate or rely on invalidation.
            // Optimistic update for comments usually involves filtering local state in the component,
            // or traversing the cache.

            // Strategy: Since React Query cache for comments is by ['cheer-post', postId, 'comments']?
            // Actually fetchComments uses `/cheer/posts/${postId}/comments`.
            // But we don't have postId here. 
            // Component-level optimistic update (in CheerDetail) is easier for this specific case 
            // if we don't pass postId.
            // BUT, let's try to do it right if we can.

            // If we can't implement global optimistic update easily without postId, 
            // we will just handle success/error and rely on component state or invalidation.
            // CheerDetail.tsx handles local state for comments, so we can drive the UI from there.
        },
        onSuccess: () => {
            // Invalidate all posts to update comment counts
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
            // We can't invalidate specific comment list without postId.
            // So we will rely on strict component control or general invalidation.
            // Actually, we should probably accept { commentId, postId } in mutate if we want specific invalidation.
        }
    });

    return {
        toggleLikeMutation,
        toggleBookmarkMutation,
        createPostMutation,
        updatePostMutation,
        deletePostMutation,
        deleteCommentMutation,
    };
};
