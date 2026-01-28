import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import * as cheerApi from '../api/cheerApi';
import { PostImageDto, FetchPostsParams, SearchPostsParams } from '../api/cheerApi';
import { CHEER_KEYS } from './cheerQueryKeys';

export const useCheerPost = (id: number) => {
    return useQuery({
        queryKey: ['cheer-post', id],
        queryFn: () => cheerApi.fetchPostDetail(id),
        enabled: !!id,
    });
};

// 게시글 목록 조회
export const useCheerPosts = (params: FetchPostsParams = {}) => {
    return useInfiniteQuery({
        queryKey: CHEER_KEYS.posts(params),
        queryFn: ({ pageParam = 0 }) => cheerApi.fetchPosts({ ...params, page: pageParam }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            if (lastPage.last) return undefined;
            return lastPage.number + 1;
        },
    });
};

// 게시글 검색
export const useCheerSearch = (params: SearchPostsParams) => {
    const { q } = params;
    return useInfiniteQuery({
        queryKey: ['cheer', 'search', params],
        queryFn: ({ pageParam = 0 }) => cheerApi.searchPosts({ ...params, page: pageParam }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            if (lastPage.last) return undefined;
            return lastPage.number + 1;
        },
        enabled: !!q && q.length >= 2, // 2글자 이상일 때만 검색
    });
};

export const useCheerHotPosts = () => {
    return useQuery({
        queryKey: CHEER_KEYS.hot(),
        queryFn: () => cheerApi.fetchHotPosts(),
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
            await queryClient.cancelQueries({ queryKey: ['userPosts'] });

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
                    likeCount: previousPost.liked ? previousPost.likeCount - 1 : previousPost.likeCount + 1,
                    liked: !previousPost.liked,
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
                                    likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1,
                                    liked: !post.liked,
                                };
                            }
                            return post;
                        }),
                    })),
                };
            });

            queryClient.setQueriesData({ queryKey: ['userPosts'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.map((p: any) => {
                            if (p.id === postId) {
                                const isCurrentlyReposted = p.repostedByMe;
                                return {
                                    ...p,
                                    repostedByMe: !isCurrentlyReposted,
                                    repostCount: isCurrentlyReposted
                                        ? Math.max(0, (p.repostCount || 0) - 1)
                                        : (p.repostCount || 0) + 1,
                                };
                            }
                            return p;
                        }),
                    })),
                };
            });

            queryClient.setQueriesData({ queryKey: ['userPosts'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.map((p: any) => {
                            if (p.id === postId) {
                                const isCurrentlyReposted = p.repostedByMe;
                                return {
                                    ...p,
                                    repostedByMe: !isCurrentlyReposted,
                                    repostCount: isCurrentlyReposted
                                        ? Math.max(0, (p.repostCount || 0) - 1)
                                        : (p.repostCount || 0) + 1,
                                };
                            }
                            return p;
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
        mutationFn: async (data: { teamId: string; content: string; postType?: string; files?: File[] }) => {
            // 1. Create Post
            const newPost = await cheerApi.createPost({
                teamId: data.teamId,
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
            data: { content: string };
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

    const repostMutation = useMutation({
        mutationFn: cheerApi.toggleRepost,
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ['cheer-post', postId] });
            await queryClient.cancelQueries({ queryKey: ['cheer-posts'] });

            const previousPost = queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', postId]);

            // Optimistic update: toggle repostedByMe and update count
            if (previousPost) {
                const isCurrentlyReposted = previousPost.repostedByMe;
                queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], {
                    ...previousPost,
                    repostedByMe: !isCurrentlyReposted,
                    repostCount: isCurrentlyReposted
                        ? Math.max(0, previousPost.repostCount - 1)
                        : previousPost.repostCount + 1,
                });
            }

            queryClient.setQueriesData({ queryKey: ['cheer-posts'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.map((p: any) => {
                            if (p.id === postId) {
                                const isCurrentlyReposted = p.repostedByMe;
                                return {
                                    ...p,
                                    repostedByMe: !isCurrentlyReposted,
                                    repostCount: isCurrentlyReposted
                                        ? Math.max(0, (p.repostCount || 0) - 1)
                                        : (p.repostCount || 0) + 1,
                                };
                            }
                            return p;
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
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
            queryClient.invalidateQueries({ queryKey: ['userPosts'] });
        },
        onSuccess: (response, postId) => {
            // Update with actual server response
            queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    repostedByMe: response.reposted,
                    repostCount: response.count,
                };
            });

            queryClient.setQueriesData({ queryKey: ['cheer-posts'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.map((p: any) => {
                            if (p.id === postId) {
                                return {
                                    ...p,
                                    repostedByMe: response.reposted,
                                    repostCount: response.count,
                                };
                            }
                            return p;
                        }),
                    })),
                };
            });

            queryClient.setQueriesData({ queryKey: ['userPosts'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.map((p: any) => {
                            if (p.id === postId) {
                                return {
                                    ...p,
                                    repostedByMe: response.reposted,
                                    repostCount: response.count,
                                };
                            }
                            return p;
                        }),
                    })),
                };
            });

            queryClient.invalidateQueries({ queryKey: ['userPosts'] });
        },
    });

    // 리포스트 취소 (작성한 리포스트 삭제)
    const cancelRepostMutation = useMutation({
        mutationFn: cheerApi.cancelRepost,
        onMutate: async (repostId) => {
            await queryClient.cancelQueries({ queryKey: ['cheer-posts'] });
            await queryClient.cancelQueries({ queryKey: ['userPosts'] });

            // Find the repost and its original post in cache
            let originalPostId: number | null = null;
            let repostCountBefore = 0;

            queryClient.setQueriesData({ queryKey: ['cheer-posts'] }, (old: any) => {
                if (!old?.pages) return old;

                // Find original post ID
                old.pages.forEach((page: any) => {
                    page.content.forEach((p: any) => {
                        if (p.id === repostId && p.repostOfId) {
                            originalPostId = p.repostOfId;
                        }
                    });
                });

                // Find original post to get its repost count
                if (originalPostId) {
                    old.pages.forEach((page: any) => {
                        const originalPost = page.content.find((op: any) => op.id === originalPostId);
                        if (originalPost && repostCountBefore === 0) {
                            repostCountBefore = originalPost.repostCount || 0;
                        }
                    });
                }

                // Remove repost from feed
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.filter((p: any) => p.id !== repostId),
                    })),
                };
            });

            queryClient.setQueriesData({ queryKey: ['userPosts'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content
                            .filter((p: any) => p.id !== repostId)
                            .map((p: any) => {
                                if (originalPostId && p.id === originalPostId) {
                                    return {
                                        ...p,
                                        repostedByMe: false,
                                        repostCount: Math.max(0, (p.repostCount || 0) - 1),
                                    };
                                }
                                return p;
                            }),
                    })),
                };
            });

            // Optimistically update original post's repostCount
            if (originalPostId) {
                queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', originalPostId], (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        repostedByMe: false,
                        repostCount: Math.max(0, repostCountBefore - 1),
                    };
                });

                queryClient.setQueriesData({ queryKey: ['cheer-posts'] }, (old: any) => {
                    if (!old?.pages) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page: any) => ({
                            ...page,
                            content: page.content.map((p: any) => {
                                if (p.id === originalPostId) {
                                    return {
                                        ...p,
                                        repostedByMe: false,
                                        repostCount: Math.max(0, (p.repostCount || 0) - 1),
                                    };
                                }
                                return p;
                            }),
                        })),
                    };
                });
            }

            return { originalPostId, repostCountBefore };
        },
        onError: (_err, _repostId, context) => {
            // On error, invalidate all queries to refetch
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
            if (context?.originalPostId) {
                queryClient.invalidateQueries({ queryKey: ['cheer-post', context.originalPostId] });
            }
            queryClient.invalidateQueries({ queryKey: ['userPosts'] });
        },
        onSuccess: (response, repostId) => {
            // Find original post ID from cache to update
            let originalPostId: number | null = null;

            queryClient.setQueriesData({ queryKey: ['cheer-posts'] }, (old: any) => {
                if (!old?.pages) return old;

                // Find original post ID
                old.pages.forEach((page: any) => {
                    page.content.forEach((p: any) => {
                        if (p.id === repostId && p.repostOfId) {
                            originalPostId = p.repostOfId;
                        }
                    });
                });

                // Remove repost from feed
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.filter((p: any) => p.id !== repostId),
                    })),
                };
            });

            queryClient.setQueriesData({ queryKey: ['userPosts'] }, (old: any) => {
                if (!old?.pages) return old;

                old.pages.forEach((page: any) => {
                    page.content.forEach((p: any) => {
                        if (p.id === repostId && p.repostOfId) {
                            originalPostId = p.repostOfId;
                        }
                    });
                });

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.filter((p: any) => p.id !== repostId),
                    })),
                };
            });

            // Update original post with server response
            if (originalPostId) {
                queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', originalPostId], (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        repostedByMe: false,
                        repostCount: response.count,
                    };
                });

                queryClient.setQueriesData({ queryKey: ['cheer-posts'] }, (old: any) => {
                    if (!old?.pages) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page: any) => ({
                            ...page,
                            content: page.content.map((p: any) => {
                                if (p.id === originalPostId) {
                                    return {
                                        ...p,
                                        repostedByMe: false,
                                        repostCount: response.count,
                                    };
                                }
                                return p;
                            }),
                        })),
                    };
                });
            }

            queryClient.invalidateQueries({ queryKey: ['userPosts'] });
        },
    });

    // 인용 리포스트 생성
    const quoteRepostMutation = useMutation({
        mutationFn: ({ postId, content }: { postId: number; content: string }) =>
            cheerApi.createQuoteRepost(postId, content),
        onSuccess: (newPost, { postId }) => {
            // 원본 게시글의 리포스트 카운트 업데이트
            queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    repostCount: old.repostCount + 1,
                };
            });

            queryClient.setQueriesData({ queryKey: ['cheer-posts'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        content: page.content.map((p: any) => {
                            if (p.id === postId) {
                                return {
                                    ...p,
                                    repostCount: (p.repostCount || 0) + 1,
                                };
                            }
                            return p;
                        }),
                    })),
                };
            });

            // 게시글 목록 새로고침 (새 인용 리포스트가 피드에 표시되도록)
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
            queryClient.invalidateQueries({ queryKey: ['userPosts'] });
        },
    });

    return {
        toggleLikeMutation,
        toggleBookmarkMutation,
        createPostMutation,
        updatePostMutation,
        deletePostMutation,
        deleteCommentMutation,
        repostMutation,
        cancelRepostMutation,
        quoteRepostMutation,
    };
};
