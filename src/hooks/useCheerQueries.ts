import { useQuery, useMutation, useQueryClient, useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import * as cheerApi from '../api/cheerApi';
import { PostImageDto, FetchPostsParams, SearchPostsParams, PageResponse, CheerPost } from '../api/cheerApi';
import { CHEER_KEYS } from './cheerQueryKeys';
import { parseError } from '../utils/errorUtils';
import { toast } from 'sonner';
import { getRepostErrorMessageFromCode } from '../utils/repostPolicy';

type CheerInfiniteData = InfiniteData<PageResponse<CheerPost>>;
type QuerySnapshot<T> = Array<[readonly unknown[], T | undefined]>;

type RepostMutationContext = {
    previousPost?: CheerPost;
    previousPostLists?: Array<[readonly unknown[], CheerInfiniteData | undefined]>;
    previousPostDetails?: QuerySnapshot<CheerPost>;
};

type CancelRepostContext = {
    previousPost?: CheerPost;
    previousPostLists?: Array<[readonly unknown[], CheerInfiniteData | undefined]>;
    previousOriginalPost?: CheerPost;
    originalPostId?: number;
    previousPostDetails?: QuerySnapshot<CheerPost>;
};

type QuoteRepostContext = {
    previousPost?: CheerPost;
    previousPostLists?: Array<[readonly unknown[], CheerInfiniteData | undefined]>;
    previousPostDetails?: QuerySnapshot<CheerPost>;
};

type InfiniteQueriesSnapshot = Array<[readonly unknown[], CheerInfiniteData | undefined]>;

const REPOST_LIST_QUERY_PREFIXES = [
    ['cheer', 'posts'],
    ['cheer', 'search'],
    ['cheer-posts'],
    ['userPosts'],
] as const;

const getRepostListQueries = (
    queryClient: ReturnType<typeof useQueryClient>
): InfiniteQueriesSnapshot => {
    const snapshots = REPOST_LIST_QUERY_PREFIXES.flatMap((queryKey) =>
        queryClient.getQueriesData<CheerInfiniteData>({ queryKey })
    );
    const uniq = new Map<string, [readonly unknown[], CheerInfiniteData | undefined]>();
    snapshots.forEach(([queryKey, data]) => {
        uniq.set(JSON.stringify(queryKey), [queryKey, data]);
    });
    return Array.from(uniq.values());
};

const cancelRepostListQueries = (queryClient: ReturnType<typeof useQueryClient>): Promise<void[]> =>
    Promise.all(REPOST_LIST_QUERY_PREFIXES.map((queryKey) => queryClient.cancelQueries({ queryKey })));

const updateRepostListQueries = (
    queryClient: ReturnType<typeof useQueryClient>,
    updater: (old: CheerInfiniteData | undefined) => CheerInfiniteData | undefined
) => {
    REPOST_LIST_QUERY_PREFIXES.forEach((queryKey) => {
        queryClient.setQueriesData<CheerInfiniteData>({ queryKey }, updater);
    });
};

const invalidateRepostListQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    REPOST_LIST_QUERY_PREFIXES.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
    });
};

const restoreInfiniteQueries = (
    queryClient: ReturnType<typeof useQueryClient>,
    snapshots?: InfiniteQueriesSnapshot
) => {
    snapshots?.forEach(([queryKey, data]) => {
        queryClient.setQueryData<CheerInfiniteData>(queryKey, data);
    });
};

const restoreQuerySnapshots = <T>(
    queryClient: ReturnType<typeof useQueryClient>,
    snapshots?: QuerySnapshot<T>
) => {
    snapshots?.forEach(([queryKey, data]) => {
        queryClient.setQueryData<T>(queryKey, data);
    });
};

const isRepostTargetMatch = (post: CheerPost, targetPostId: number): boolean => {
    if (post.id === targetPostId) {
        return true;
    }
    if (post.repostOfId === targetPostId) {
        return true;
    }
    if (post.originalPost?.id === targetPostId) {
        return true;
    }
    return false;
};

const syncRepostActionState = (
    post: CheerPost,
    targetPostId: number,
    reposted: boolean,
    repostCount: number
) => {
    if (post.id === targetPostId) {
        return {
            ...post,
            repostedByMe: reposted,
            repostCount,
        };
    }

    if (post.originalPost?.id === targetPostId) {
        return {
            ...post,
            originalPost: {
                ...post.originalPost,
                repostCount,
            },
        };
    }

    return post;
};

const syncRepostActionStateInInfinitePages = (
    data: CheerInfiniteData | undefined,
    targetPostId: number,
    reposted: boolean,
    repostCount: number
) => {
    if (!data?.pages) return data;

    return {
        ...data,
        pages: data.pages.map((page) => ({
            ...page,
            content: page.content.map((post) => {
                if (!isRepostTargetMatch(post, targetPostId)) {
                    return post;
                }
                return syncRepostActionState(post, targetPostId, reposted, repostCount);
            }),
        })),
    };
};

const findOriginalPostIdFromInfiniteQueries = (
    queries: InfiniteQueriesSnapshot,
    repostId: number
): number | undefined => {
    for (const [, data] of queries) {
        if (!data?.pages) continue;
        for (const page of data.pages) {
            for (const post of page.content) {
                if (post.id === repostId && post.repostOfId) {
                    return post.repostOfId;
                }
            }
        }
    }
    return undefined;
};

const syncRepostActionStateInPostDetails = (
    queryClient: ReturnType<typeof useQueryClient>,
    targetPostId: number,
    reposted: boolean,
    repostCount: number
) => {
    const detailQueries = queryClient.getQueriesData<cheerApi.CheerPost>({ queryKey: ['cheer-post'] });
    detailQueries.forEach(([queryKey, post]) => {
        if (!post) return;
        if (!isRepostTargetMatch(post, targetPostId)) return;
        queryClient.setQueryData<cheerApi.CheerPost>(queryKey, syncRepostActionState(post, targetPostId, reposted, repostCount));
    });
};

const notifyRepostError = (error: unknown) => {
    const parsed = parseError(error);
    toast.error(getRepostErrorMessageFromCode(parsed.responseCode, parsed.message));
};

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
            await cancelRepostListQueries(queryClient);

            const previousPost = queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', postId]);
            const currentLiked = (post: CheerPost | cheerApi.CheerPost) => post.liked || post.likedByUser || false;
            const nextCount = (post: CheerPost | cheerApi.CheerPost, liked: boolean) => {
                const current = post.likeCount ?? post.likes ?? 0;
                return Math.max(0, liked ? current + 1 : current - 1);
            };

            // Optimistically update single post
            if (previousPost) {
                const optimisticLiked = !currentLiked(previousPost);
                queryClient.setQueryData<cheerApi.CheerPost>(['cheer-post', postId], {
                    ...previousPost,
                    likes: nextCount(previousPost, optimisticLiked),
                    likeCount: nextCount(previousPost, optimisticLiked),
                    liked: optimisticLiked,
                    likedByUser: optimisticLiked,
                });
            }

            // Optimistically update lists
            updateRepostListQueries(queryClient, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.map((post) => {
                            if (post.id === postId) {
                                const optimisticLiked = !currentLiked(post);
                                const optimisticLikeCount = nextCount(post, optimisticLiked);
                                return {
                                    ...post,
                                    likes: optimisticLikeCount,
                                    likeCount: optimisticLikeCount,
                                    liked: optimisticLiked,
                                    likedByUser: optimisticLiked,
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
            invalidateRepostListQueries(queryClient);
        },
        onSuccess: (data, postId) => {
            queryClient.setQueryData(['cheer-post', postId], (old: cheerApi.CheerPost | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    likes: data.likes,
                    likeCount: data.likes,
                    likedByUser: data.liked,
                    liked: data.liked,
                };
            });

            updateRepostListQueries(queryClient, (old) => {
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
                                    likeCount: data.likes,
                                    likedByUser: data.liked,
                                    liked: data.liked,
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
            await cancelRepostListQueries(queryClient);
            await queryClient.cancelQueries({ queryKey: ['cheer-bookmarks'] });
            await queryClient.cancelQueries({ queryKey: ['cheer-post', postId] });

            const previousPost = queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', postId]);
            const previousPostLists = getRepostListQueries(queryClient);
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

            updateRepostListQueries(queryClient, (old) => applyOptimisticToggleOnInfinite(old));
            queryClient.setQueryData<PageResponse<CheerPost>>(['cheer-bookmarks'], (old) =>
                applyOptimisticToggleOnPage(old)
            );

            return {
                previousPost,
                previousPostLists,
                previousBookmarks,
            };
        },
        onError: (_err, postId, context) => {
            if (context?.previousPost) {
                queryClient.setQueryData(['cheer-post', postId], context.previousPost);
            }
            restoreInfiniteQueries(queryClient, context?.previousPostLists);
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

            updateRepostListQueries(queryClient, (old) => {
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
            invalidateRepostListQueries(queryClient);
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
            invalidateRepostListQueries(queryClient);
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
            invalidateRepostListQueries(queryClient);
        },
    });

    const deletePostMutation = useMutation({
        mutationFn: cheerApi.deletePost,
        onSuccess: () => {
            invalidateRepostListQueries(queryClient);
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: cheerApi.deleteComment,
        onSuccess: () => {
            invalidateRepostListQueries(queryClient);
        }
    });

    const repostMutation = useMutation<cheerApi.RepostToggleResponse, unknown, number, RepostMutationContext>({
        mutationFn: cheerApi.toggleRepost,
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ['cheer-post', postId] });
            await cancelRepostListQueries(queryClient);

            return {
                previousPost: queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', postId]),
                previousPostLists: getRepostListQueries(queryClient),
                previousPostDetails: queryClient.getQueriesData<CheerPost>({ queryKey: ['cheer-post'] }),
            };
        },
        onError: (err, postId, context) => {
            if (context?.previousPost) {
                queryClient.setQueryData(['cheer-post', postId], context.previousPost);
            }
            restoreQuerySnapshots(queryClient, context?.previousPostDetails);
            restoreInfiniteQueries(queryClient, context?.previousPostLists);
            notifyRepostError(err);
        },
        onSuccess: (response, postId) => {
            syncRepostActionStateInPostDetails(queryClient, postId, response.reposted, response.count);
            updateRepostListQueries(queryClient, (old) =>
                syncRepostActionStateInInfinitePages(old, postId, response.reposted, response.count)
            );
        },
    });

    // 리포스트 취소 (작성한 리포스트 삭제)
    const cancelRepostMutation = useMutation<cheerApi.RepostToggleResponse, unknown, number, CancelRepostContext>({
        mutationFn: cheerApi.cancelRepost,
        onMutate: async (repostId) => {
            await cancelRepostListQueries(queryClient);
            await queryClient.cancelQueries({ queryKey: ['cheer-post', repostId] });

            const previousPost = queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', repostId]);
            const previousPostLists = getRepostListQueries(queryClient);
            const originalPostId = findOriginalPostIdFromInfiniteQueries(
                previousPostLists,
                repostId
            );
            const resolvedOriginalPostId = previousPost?.repostOfId ?? originalPostId;

            return {
                previousPost,
                previousPostLists,
                previousOriginalPost: resolvedOriginalPostId
                    ? queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', resolvedOriginalPostId])
                    : undefined,
                originalPostId: resolvedOriginalPostId,
                previousPostDetails: queryClient.getQueriesData<CheerPost>({ queryKey: ['cheer-post'] }),
            };
        },
        onError: (err, _repostId, context) => {
            if (context?.previousPost) {
                queryClient.setQueryData(['cheer-post', context.previousPost.id], context.previousPost);
            }
            if (context?.previousOriginalPost && context?.originalPostId) {
                queryClient.setQueryData(['cheer-post', context.originalPostId], context.previousOriginalPost);
            }
            restoreQuerySnapshots(queryClient, context?.previousPostDetails);
            restoreInfiniteQueries(queryClient, context?.previousPostLists);
            notifyRepostError(err);
        },
        onSuccess: (response, repostId, context) => {
            const originalPostId = context?.originalPostId
                ?? context?.previousPost?.repostOfId
                ?? findOriginalPostIdFromInfiniteQueries(
                    getRepostListQueries(queryClient),
                    repostId
                );

            const removeRepostFromPages = (old: CheerInfiniteData | undefined, repostPostId: number) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        content: page.content.filter((post) => post.id !== repostPostId),
                    })),
                };
            };

            updateRepostListQueries(queryClient, (old) => removeRepostFromPages(old, repostId));

            if (originalPostId) {
                syncRepostActionStateInPostDetails(queryClient, originalPostId, false, response.count);
                updateRepostListQueries(queryClient, (old) =>
                    syncRepostActionStateInInfinitePages(old, originalPostId, false, response.count)
                );
            }

            queryClient.removeQueries({ queryKey: ['cheer-post', repostId], exact: true });
        },
    });

    // 인용 리포스트 생성
    const quoteRepostMutation = useMutation<cheerApi.CheerPost, unknown, { postId: number; content: string }, QuoteRepostContext>({
        mutationFn: ({ postId, content }: { postId: number; content: string }) =>
            cheerApi.createQuoteRepost(postId, content),
        onMutate: async ({ postId }) => {
            await queryClient.cancelQueries({ queryKey: ['cheer-post', postId] });
            await cancelRepostListQueries(queryClient);

            return {
                previousPost: queryClient.getQueryData<cheerApi.CheerPost>(['cheer-post', postId]),
                previousPostLists: getRepostListQueries(queryClient),
                previousPostDetails: queryClient.getQueriesData<CheerPost>({ queryKey: ['cheer-post'] }),
            };
        },
        onError: (err, variables, context) => {
            if (context?.previousPost) {
                queryClient.setQueryData(['cheer-post', variables.postId], context.previousPost);
            }
            restoreQuerySnapshots(queryClient, context?.previousPostDetails);
            restoreInfiniteQueries(queryClient, context?.previousPostLists);
            notifyRepostError(err);
        },
        onSuccess: (newPost, { postId }) => {
            const updatedRepostCount = newPost.originalPost?.repostCount;
            if (typeof updatedRepostCount === 'number') {
                syncRepostActionStateInPostDetails(queryClient, postId, false, updatedRepostCount);
                updateRepostListQueries(queryClient, (old) =>
                    syncRepostActionStateInInfinitePages(old, postId, false, updatedRepostCount)
                );
                return;
            }

            queryClient.invalidateQueries({ queryKey: ['cheer-post', postId] });
            invalidateRepostListQueries(queryClient);
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
