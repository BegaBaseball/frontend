import { useQuery, useMutation, useQueryClient, useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import * as cheerApi from '../api/cheerApi';
import { PostImageDto, FetchPostsParams, SearchPostsParams, PageResponse, CheerPost } from '../api/cheerApi';
import { CHEER_KEYS } from './cheerQueryKeys';

type CheerInfiniteData = InfiniteData<PageResponse<CheerPost>>;

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
            await queryClient.cancelQueries({ queryKey: ['cheer-post', postId] });
            await queryClient.cancelQueries({ queryKey: ['cheer-posts'] });
            await queryClient.cancelQueries({ queryKey: ['userPosts'] });

            const previousPost = queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', postId]);

            // Optimistically update single post
            if (previousPost) {
                queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], {
                    ...previousPost,
                    likeCount: previousPost.liked ? previousPost.likeCount - 1 : previousPost.likeCount + 1,
                    liked: !previousPost.liked,
                });
            }

            // Optimistically update lists
            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((post) => {
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

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['userPosts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((p) => {
                            if (p.id === postId) {
                                return {
                                    ...p,
                                    likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1,
                                    liked: !p.liked,
                                    likedByUser: !p.likedByUser,
                                };
                            }
                            return p;
                        }),
                    })),
                };
            });

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['userPosts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((p) => {
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
        },
        onSuccess: (data, postId) => {
            queryClient.setQueryData(['cheer-post', postId], (old: cheerApi.CheerPost | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    likes: data.likes,
                    likedByUser: data.liked,
                };
            });

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((post) => {
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
        },
    });

    const toggleBookmarkMutation = useMutation({
        mutationFn: cheerApi.toggleBookmark,
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ['cheer-posts'] });
            await queryClient.cancelQueries({ queryKey: ['userPosts'] });
            await queryClient.cancelQueries({ queryKey: ['cheer-bookmarks'] });
            await queryClient.cancelQueries({ queryKey: ['cheer-post', postId] });

            const previousPost = queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', postId]);
            const previousCheerPosts = queryClient.getQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] });
            const previousUserPosts = queryClient.getQueriesData<CheerInfiniteData>({ queryKey: ['userPosts'] });
            const previousBookmarks = queryClient.getQueryData<PageResponse<CheerPost>>(['cheer-bookmarks']);

            const applyOptimisticToggleOnInfinite = (old: CheerInfiniteData | undefined) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((post) => {
                            if (post.id !== postId) return post;
                            const currentBookmarked = post.isBookmarked ?? post.bookmarked ?? false;
                            const nextBookmarked = !currentBookmarked;
                            const nextBookmarkCount = Math.max(
                                0,
                                (post.bookmarkCount ?? 0) + (nextBookmarked ? 1 : -1)
                            );
                            return {
                                ...post,
                                isBookmarked: nextBookmarked,
                                bookmarked: nextBookmarked,
                                bookmarkCount: nextBookmarkCount,
                            };
                        }),
                    })),
                };
            };

            const applyOptimisticToggleOnPage = (old: PageResponse<CheerPost> | undefined) => {
                if (!old?.content) return old;
                return {
                    ...old,
                    content: old.content.map((post) => {
                        if (post.id !== postId) return post;
                        const currentBookmarked = post.isBookmarked ?? post.bookmarked ?? false;
                        const nextBookmarked = !currentBookmarked;
                        const nextBookmarkCount = Math.max(
                            0,
                            (post.bookmarkCount ?? 0) + (nextBookmarked ? 1 : -1)
                        );
                        return {
                            ...post,
                            isBookmarked: nextBookmarked,
                            bookmarked: nextBookmarked,
                            bookmarkCount: nextBookmarkCount,
                        };
                    }),
                };
            };

            if (previousPost) {
                const currentBookmarked = previousPost.isBookmarked ?? previousPost.bookmarked ?? false;
                const nextBookmarked = !currentBookmarked;
                const nextBookmarkCount = Math.max(
                    0,
                    (previousPost.bookmarkCount ?? 0) + (nextBookmarked ? 1 : -1)
                );
                queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], {
                    ...previousPost,
                    isBookmarked: nextBookmarked,
                    bookmarked: nextBookmarked,
                    bookmarkCount: nextBookmarkCount,
                });
            }

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) =>
                applyOptimisticToggleOnInfinite(old)
            );
            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['userPosts'] }, (old) =>
                applyOptimisticToggleOnInfinite(old)
            );
            queryClient.setQueryData<PageResponse<CheerPost>>(['cheer-bookmarks'], (old) =>
                applyOptimisticToggleOnPage(old)
            );

            return {
                previousPost,
                previousCheerPosts,
                previousUserPosts,
                previousBookmarks,
            };
        },
        onError: (_err, postId, context) => {
            if (context?.previousPost) {
                queryClient.setQueryData(['cheer-post', postId], context.previousPost);
            }
            context?.previousCheerPosts?.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
            context?.previousUserPosts?.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
            if (context?.previousBookmarks) {
                queryClient.setQueryData(['cheer-bookmarks'], context.previousBookmarks);
            }
        },
        onSuccess: (data, postId) => {
            const bookmarked = Boolean(data.bookmarked);
            const bookmarkCount = typeof data.count === 'number' ? data.count : undefined;

            queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    isBookmarked: bookmarked,
                    bookmarked,
                    bookmarkCount: bookmarkCount ?? old.bookmarkCount,
                };
            });

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((post) => {
                            if (post.id !== postId) return post;
                            return {
                                ...post,
                                isBookmarked: bookmarked,
                                bookmarked,
                                bookmarkCount: bookmarkCount ?? post.bookmarkCount,
                            };
                        }),
                    })),
                };
            });

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['userPosts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((post) => {
                            if (post.id !== postId) return post;
                            return {
                                ...post,
                                isBookmarked: bookmarked,
                                bookmarked,
                                bookmarkCount: bookmarkCount ?? post.bookmarkCount,
                            };
                        }),
                    })),
                };
            });

            queryClient.setQueryData<PageResponse<CheerPost>>(['cheer-bookmarks'], (old) => {
                if (!old?.content) return old;
                return {
                    ...old,
                    content: old.content.map((post) => {
                        if (post.id !== postId) return post;
                        return {
                            ...post,
                            isBookmarked: bookmarked,
                            bookmarked,
                            bookmarkCount: bookmarkCount ?? post.bookmarkCount,
                        };
                    }),
                };
            });
        },
        onSettled: (_data, _error, postId) => {
            queryClient.invalidateQueries({ queryKey: ['cheer-post', postId] });
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
            queryClient.invalidateQueries({ queryKey: ['userPosts'] });
            queryClient.invalidateQueries({ queryKey: ['cheer-bookmarks'] });
        },
    });

    const createPostMutation = useMutation({
        mutationFn: async (data: { teamId: string; content: string; postType?: string; files?: File[] }) => {
            const newPost = await cheerApi.createPost({
                teamId: data.teamId,
                content: data.content,
                postType: data.postType,
            });

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
            await cheerApi.updatePost(id, data);

            if (deletingImageIds && deletingImageIds.length > 0) {
                for (const imgId of deletingImageIds) {
                    await cheerApi.deleteImageById(imgId);
                }
            }

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
        }
    });

    const repostMutation = useMutation({
        mutationFn: cheerApi.toggleRepost,
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ['cheer-post', postId] });
            await queryClient.cancelQueries({ queryKey: ['cheer-posts'] });

            const previousPost = queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', postId]);

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

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((p) => {
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
            queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    repostedByMe: response.reposted,
                    repostCount: response.count,
                };
            });

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((p) => {
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

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['userPosts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((p) => {
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

            let originalPostId: number | null = null;
            let repostCountBefore = 0;

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) => {
                if (!old?.pages) return old;

                old.pages.forEach((page) => {
                    page.content.forEach((p) => {
                        if (p.id === repostId && p.repostOfId) {
                            originalPostId = p.repostOfId;
                        }
                    });
                });

                if (originalPostId) {
                    old.pages.forEach((page) => {
                        const originalPost = page.content.find((op) => op.id === originalPostId);
                        if (originalPost && repostCountBefore === 0) {
                            repostCountBefore = originalPost.repostCount || 0;
                        }
                    });
                }

                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.filter((p) => p.id !== repostId),
                    })),
                };
            });

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['userPosts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content
                            .filter((p) => p.id !== repostId)
                            .map((p) => {
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

            if (originalPostId) {
                queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', originalPostId], (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        repostedByMe: false,
                        repostCount: Math.max(0, repostCountBefore - 1),
                    };
                });

                queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) => {
                    if (!old?.pages) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page) => ({
                            ...page,
                            content: page.content.map((p) => {
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
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
            if (context?.originalPostId) {
                queryClient.invalidateQueries({ queryKey: ['cheer-post', context.originalPostId] });
            }
            queryClient.invalidateQueries({ queryKey: ['userPosts'] });
        },
        onSuccess: (response, repostId) => {
            let originalPostId: number | null = null;

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) => {
                if (!old?.pages) return old;

                old.pages.forEach((page) => {
                    page.content.forEach((p) => {
                        if (p.id === repostId && p.repostOfId) {
                            originalPostId = p.repostOfId;
                        }
                    });
                });

                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.filter((p) => p.id !== repostId),
                    })),
                };
            });

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['userPosts'] }, (old) => {
                if (!old?.pages) return old;

                old.pages.forEach((page) => {
                    page.content.forEach((p) => {
                        if (p.id === repostId && p.repostOfId) {
                            originalPostId = p.repostOfId;
                        }
                    });
                });

                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.filter((p) => p.id !== repostId),
                    })),
                };
            });

            if (originalPostId) {
                queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', originalPostId], (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        repostedByMe: false,
                        repostCount: response.count,
                    };
                });

                queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) => {
                    if (!old?.pages) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page) => ({
                            ...page,
                            content: page.content.map((p) => {
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
            queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    repostCount: old.repostCount + 1,
                };
            });

            queryClient.setQueriesData<CheerInfiniteData>({ queryKey: ['cheer-posts'] }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((p) => {
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
